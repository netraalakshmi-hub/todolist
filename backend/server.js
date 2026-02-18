const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const frontendBuildPath = path.join(__dirname, '..', 'react-app', 'build');
const dataDirPath = path.join(__dirname, 'data');
const legacyJsonPath = path.join(dataDirPath, 'db.json');
const sqlitePath = path.join(dataDirPath, 'app.sqlite');
const configuredCorsOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

let db;
let reminderTimer;

const createToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: user.created_at || user.createdAt,
});

const sanitizeTask = (task) => ({
  id: task.id,
  userId: task.user_id,
  title: task.title,
  completed: !!task.completed,
  category: task.category,
  dueAt: task.due_at,
  reminderSent: !!task.reminder_sent,
  createdAt: task.created_at,
});

const ensureDataDir = () => {
  if (!fs.existsSync(dataDirPath)) {
    fs.mkdirSync(dataDirPath, { recursive: true });
  }
};

const migrateLegacyJsonIfNeeded = async () => {
  const userCountRow = await db.get('SELECT COUNT(*) AS count FROM users');
  const taskCountRow = await db.get('SELECT COUNT(*) AS count FROM tasks');
  const hasData = (userCountRow?.count || 0) > 0 || (taskCountRow?.count || 0) > 0;

  if (hasData || !fs.existsSync(legacyJsonPath)) {
    return;
  }

  try {
    const raw = fs.readFileSync(legacyJsonPath, 'utf-8');
    const parsed = JSON.parse(raw);
    const users = Array.isArray(parsed.users) ? parsed.users : [];
    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];

    for (const user of users) {
      if (!user?.id || !user?.email || !user?.passwordHash) {
        continue;
      }

      await db.run(
        `
          INSERT OR IGNORE INTO users (id, name, email, password_hash, created_at)
          VALUES (?, ?, ?, ?, ?)
        `,
        [
          user.id,
          user.name || 'User',
          String(user.email).toLowerCase(),
          user.passwordHash,
          user.createdAt || new Date().toISOString(),
        ]
      );
    }

    for (const task of tasks) {
      if (!task?.id || !task?.userId || !task?.title) {
        continue;
      }

      await db.run(
        `
          INSERT OR IGNORE INTO tasks (id, user_id, title, category, completed, due_at, reminder_sent, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          task.id,
          task.userId,
          task.title,
          task.category || 'none',
          task.completed ? 1 : 0,
          task.dueAt || null,
          task.reminderSent ? 1 : 0,
          task.createdAt || new Date().toISOString(),
        ]
      );
    }
  } catch {
    // ignore migration errors and continue with empty DB
  }
};

const initDatabase = async () => {
  ensureDataDir();

  db = await open({
    filename: sqlitePath,
    driver: sqlite3.Database,
  });

  await db.exec('PRAGMA foreign_keys = ON');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'none',
      completed INTEGER NOT NULL DEFAULT 0,
      due_at TEXT,
      reminder_sent INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_id TEXT,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_user_due ON tasks(user_id, due_at, reminder_sent);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
  `);

  await migrateLegacyJsonIfNeeded();
};

const processDueReminders = async () => {
  if (!db) return;

  const dueTasks = await db.all(
    `
      SELECT id, user_id, title, due_at
      FROM tasks
      WHERE due_at IS NOT NULL
        AND completed = 0
        AND reminder_sent = 0
        AND datetime(due_at) <= datetime('now')
    `
  );

  for (const task of dueTasks) {
    await db.run(
      `
        INSERT INTO notifications (id, user_id, task_id, message, is_read, created_at)
        VALUES (?, ?, ?, ?, 0, ?)
      `,
      [
        randomUUID(),
        task.user_id,
        task.id,
        `Reminder: ${task.title}`,
        new Date().toISOString(),
      ]
    );

    await db.run('UPDATE tasks SET reminder_sent = 1 WHERE id = ?', [task.id]);
  }
};

const startReminderWorker = () => {
  processDueReminders().catch(() => {});
  reminderTimer = setInterval(() => {
    processDueReminders().catch(() => {});
  }, 30000);
};

const authRequired = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = payload;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  const defaultOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
  if (defaultOrigins.includes(origin)) return true;

  if (configuredCorsOrigins.includes(origin)) return true;

  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.onrender\.com$/i.test(origin)) return true;

  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json());

const api = express.Router();

api.get('/health', (req, res) => {
  res.json({ ok: true, message: 'Backend is running', database: 'sqlite' });
});

api.post('/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await db.get('SELECT id FROM users WHERE email = ?', [normalizedEmail]);

  if (existing) {
    return res.status(409).json({ error: 'User already exists' });
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = {
    id: randomUUID(),
    name: String(name).trim(),
    email: normalizedEmail,
    password_hash: passwordHash,
    created_at: new Date().toISOString(),
  };

  await db.run(
    `
      INSERT INTO users (id, name, email, password_hash, created_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    [user.id, user.name, user.email, user.password_hash, user.created_at]
  );

  const token = createToken(user);
  return res.status(201).json({ token, user: sanitizeUser(user) });
});

api.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await db.get('SELECT * FROM users WHERE email = ?', [normalizedEmail]);

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isValid = await bcrypt.compare(String(password), user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = createToken(user);
  return res.json({ token, user: sanitizeUser(user) });
});

api.post('/auth/google', async (req, res) => {
  const { accessToken } = req.body || {};

  if (!accessToken || typeof accessToken !== 'string') {
    return res.status(400).json({ error: 'Google access token is required' });
  }

  if (typeof fetch !== 'function') {
    return res.status(500).json({ error: 'Server runtime does not support fetch' });
  }

  let profileResponse;
  try {
    profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    return res.status(502).json({ error: 'Failed to reach Google userinfo service' });
  }

  if (!profileResponse.ok) {
    return res.status(401).json({ error: 'Invalid Google access token' });
  }

  let profile;
  try {
    profile = await profileResponse.json();
  } catch {
    return res.status(502).json({ error: 'Failed to parse Google profile response' });
  }

  const email = String(profile?.email || '').trim().toLowerCase();
  const name = String(profile?.name || 'Google User').trim() || 'Google User';

  if (!email) {
    return res.status(400).json({ error: 'Google account email is required' });
  }

  let user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

  if (!user) {
    user = {
      id: randomUUID(),
      name,
      email,
      password_hash: await bcrypt.hash(randomUUID(), 10),
      created_at: new Date().toISOString(),
    };

    await db.run(
      `
        INSERT INTO users (id, name, email, password_hash, created_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      [user.id, user.name, user.email, user.password_hash, user.created_at]
    );
  }

  const token = createToken(user);
  return res.json({ token, user: sanitizeUser(user) });
});

api.get('/auth/me', authRequired, async (req, res) => {
  const user = await db.get('SELECT * FROM users WHERE id = ?', [req.auth.sub]);

  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  return res.json({ user: sanitizeUser(user) });
});

api.get('/tasks', authRequired, async (req, res) => {
  const rows = await db.all('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC', [req.auth.sub]);
  res.json({ data: rows.map(sanitizeTask) });
});

api.post('/tasks', authRequired, async (req, res) => {
  const { title, category = 'none', dueAt = null } = req.body || {};

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Task title is required' });
  }

  let normalizedDueAt = null;
  if (dueAt) {
    const parsed = new Date(dueAt);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ error: 'Invalid dueAt datetime' });
    }
    normalizedDueAt = parsed.toISOString();
  }

  const newTask = {
    id: randomUUID(),
    user_id: req.auth.sub,
    title: title.trim(),
    completed: 0,
    category,
    due_at: normalizedDueAt,
    reminder_sent: 0,
    created_at: new Date().toISOString(),
  };

  await db.run(
    `
      INSERT INTO tasks (id, user_id, title, category, completed, due_at, reminder_sent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      newTask.id,
      newTask.user_id,
      newTask.title,
      newTask.category,
      newTask.completed,
      newTask.due_at,
      newTask.reminder_sent,
      newTask.created_at,
    ]
  );

  return res.status(201).json({ data: sanitizeTask(newTask) });
});

api.get('/notifications', authRequired, async (req, res) => {
  const rows = await db.all(
    `
      SELECT id, task_id, message, is_read, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY is_read ASC, created_at DESC
      LIMIT 100
    `,
    [req.auth.sub]
  );

  res.json({
    data: rows.map((item) => ({
      id: item.id,
      taskId: item.task_id,
      message: item.message,
      isRead: !!item.is_read,
      createdAt: item.created_at,
    })),
  });
});

api.put('/notifications/:id/read', authRequired, async (req, res) => {
  const { id } = req.params;
  const existing = await db.get('SELECT id FROM notifications WHERE id = ? AND user_id = ?', [id, req.auth.sub]);

  if (!existing) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  await db.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
  return res.json({ ok: true });
});

app.use('/api', api);

if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));

  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      ok: true,
      message: 'Backend is running',
      website: 'Build React app to serve website from this backend',
      apiBase: '/api',
      endpoints: [
        '/api/health',
        '/api/auth/register',
        '/api/auth/login',
        '/api/auth/google',
        '/api/auth/me',
        '/api/tasks',
        '/api/notifications',
      ],
    });
  });
}

const start = async () => {
  await initDatabase();
  startReminderWorker();

  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
};

start().catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  if (reminderTimer) {
    clearInterval(reminderTimer);
  }
  if (db) {
    await db.close();
  }
  process.exit(0);
});
