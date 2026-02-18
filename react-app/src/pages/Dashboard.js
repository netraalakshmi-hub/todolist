import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaList, FaBriefcase, FaUser, FaHeart, FaCalendar, FaBars, FaStar, FaHome, FaShareAlt, FaClipboardCheck, FaChevronDown, FaRegBookmark, FaBookmark, FaBell, FaRedoAlt, FaArrowLeft, FaEllipsisV } from 'react-icons/fa';
import api from '../api/client';
import '../styles/Dashboard.css';
import Calendar from './Calendar';

function Dashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [newTaskCategory, setNewTaskCategory] = useState('none');
  const [newTaskStarred, setNewTaskStarred] = useState(false);
  const [customCategories, setCustomCategories] = useState([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [newTaskDueDate, setNewTaskDueDate] = useState(null);
  const [newTaskDueTime, setNewTaskDueTime] = useState('09:00');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTaskTemplate, setShowTaskTemplate] = useState(false);
  const [templateView, setTemplateView] = useState('list'); // 'list' | 'detail'
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [templateCategory, setTemplateCategory] = useState('none');
  const [templatePhrase, setTemplatePhrase] = useState('');
  const [templateRepeatDays, setTemplateRepeatDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [templateSelectedTimes, setTemplateSelectedTimes] = useState(['08:00 am']);
  const today = useMemo(() => new Date(), []);
  const [pickerMonth, setPickerMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [pickerTempDate, setPickerTempDate] = useState(() => today);
  const [showMenu, setShowMenu] = useState(false);
  const [activeNav, setActiveNav] = useState('tasks');
  const [currentView, setCurrentView] = useState('tasks');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });
  const seenReminderIdsRef = useRef(new Set());
  const [detailMonth, setDetailMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [mineRange, setMineRange] = useState('30'); // '7' | '30' | 'all'
  const [showLoginChoice, setShowLoginChoice] = useState(false);
  const [authUser, setAuthUser] = useState(() => {
    try {
      const raw = localStorage.getItem('tf_auth');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    // keep auth state in sync if another tab/page updates it
    const onStorage = (e) => {
      if (e.key !== 'tf_auth') return;
      try {
        setAuthUser(e.newValue ? JSON.parse(e.newValue) : null);
      } catch {
        setAuthUser(null);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const continueWithGoogle = () => {
    const next = { provider: 'google', name: 'Google User', ts: Date.now() };
    try { localStorage.setItem('tf_auth', JSON.stringify(next)); } catch { /* ignore */ }
    setAuthUser(next);
    setShowLoginChoice(false);
  };

  const goToSignIn = () => {
    setShowLoginChoice(false);
    navigate('/signin');
  };

  const logout = () => {
    try {
      localStorage.removeItem('tf_auth');
      localStorage.removeItem('tf_token');
    } catch {
      /* ignore */
    }
    setAuthUser(null);
    setShowLoginChoice(false);
  };

  const logoutFromDots = () => {
    logout();
    navigate('/signin');
  };

  const categories = [
    { id: 'all', label: 'All', icon: FaList },
    { id: 'work', label: 'Work', icon: FaBriefcase },
    { id: 'personal', label: 'Personal', icon: FaUser },
    { id: 'wishlist', label: 'Wishlist', icon: FaHeart },
  ];

  // Menu options for left sidebar
  const sidebarMenuItems = [
    { id: 'starred', label: 'Starred Tasks', icon: FaStar },
    { id: 'category', label: 'Category', icon: FaList },
    { id: 'all', label: 'All', icon: FaList },
    { id: 'work', label: 'Work', icon: FaBriefcase },
    { id: 'personal', label: 'Personal', icon: FaUser },
    { id: 'wishlist', label: 'Wishlist', icon: FaHeart },
    { id: 'birthday', label: 'Birthday', icon: FaCalendar },
    { id: 'create', label: 'Create New', icon: FaPlus },
    { id: 'home', label: 'Home', icon: FaHome },
  ];

  // Bottom navigation items
  const bottomNavItems = [
    { id: 'tasks', label: 'Tasks', icon: FaList },
    { id: 'calendar', label: 'Calendar', icon: FaCalendar },
    { id: 'mine', label: 'Mine', icon: FaUser },
  ];

  const addTaskCategoryOptions = useMemo(() => {
    const base = [
      { id: 'none', label: 'No Category' },
      { id: 'work', label: 'Work' },
      { id: 'personal', label: 'Personal' },
      { id: 'wishlist', label: 'Wishlist' },
      { id: 'birthday', label: 'Birthday' },
    ];
    return [...base, ...customCategories, { id: 'create', label: '+ Create New', isCreate: true }];
  }, [customCategories]);

  const selectedAddCategoryLabel = useMemo(() => {
    const found = addTaskCategoryOptions.find(o => o.id === newTaskCategory);
    return found?.label || 'No Category';
  }, [addTaskCategoryOptions, newTaskCategory]);

  const monthLabel = useMemo(() => {
    return pickerMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' }).toUpperCase();
  }, [pickerMonth]);

  const mapApiTaskToLocal = useCallback((task) => {
    const createdAtTs = task?.createdAt ? Date.parse(task.createdAt) : Date.now();
    return {
      id: task.id,
      createdAt: Number.isNaN(createdAtTs) ? Date.now() : createdAtTs,
      text: task.title,
      completed: !!task.completed,
      completedAt: null,
      completedAtTs: null,
      completionDates: [],
      category: task.category || 'none',
      starred: false,
      icon: null,
      dueDate: task?.dueAt ? String(task.dueAt).slice(0, 10) : null,
      dueAt: task?.dueAt || null,
      dueTime: task?.dueAt ? String(task.dueAt).slice(11, 16) : null,
      reminderSent: !!task?.reminderSent,
    };
  }, []);

  const syncNotifications = useCallback((incomingNotifications, { primeSeen = false } = {}) => {
    const list = Array.isArray(incomingNotifications) ? incomingNotifications : [];
    setNotifications(list);

    const unread = list.filter(item => !item.isRead);
    if (primeSeen) {
      unread.forEach(item => seenReminderIdsRef.current.add(item.id));
      return;
    }

    if (browserNotificationPermission !== 'granted' || !('Notification' in window)) return;

    unread.forEach((item) => {
      if (seenReminderIdsRef.current.has(item.id)) return;

      seenReminderIdsRef.current.add(item.id);
      new Notification('Task Reminder', {
        body: item.message || 'You have a task reminder.',
        tag: `reminder-${item.id}`,
      });
    });
  }, [browserNotificationPermission]);

  const enableBrowserNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const permission = await Notification.requestPermission();
      setBrowserNotificationPermission(permission);
    } catch {
      setBrowserNotificationPermission(Notification.permission);
    }
  };

  const refreshNotifications = useCallback(async () => {
    try {
      const notificationsResponse = await api.get('/notifications');
      syncNotifications(notificationsResponse.data?.data || []);
    } catch {
      // ignore background fetch failures
    }
  }, [syncNotifications]);

  const markNotificationRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(prev => prev.map(item => (
        item.id === notificationId ? { ...item, isRead: true } : item
      )));
    } catch {
      // ignore
    }
  };

  const unreadNotifications = useMemo(
    () => notifications.filter(item => !item.isRead),
    [notifications]
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return undefined;
    const syncPermission = () => setBrowserNotificationPermission(Notification.permission);
    const onVisibility = () => {
      if (!document.hidden) syncPermission();
    };

    window.addEventListener('focus', syncPermission);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('focus', syncPermission);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const bootstrapFromApi = async () => {
      try {
        const [tasksResponse, notificationsResponse] = await Promise.all([
          api.get('/tasks'),
          api.get('/notifications'),
        ]);

        if (!isMounted) return;

        const apiTasks = (tasksResponse.data?.data || []).map(mapApiTaskToLocal);
        setTasks(apiTasks);
        syncNotifications(notificationsResponse.data?.data || [], { primeSeen: true });
      } catch {
        // keep existing local state if API call fails
      }
    };

    bootstrapFromApi();

    const intervalId = setInterval(() => {
      refreshNotifications();
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [mapApiTaskToLocal, refreshNotifications, syncNotifications]);

  const buildIsoDate = (dateObj) => {
    if (!dateObj) return null;
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseIsoDate = (iso) => {
    if (!iso) return null;
    const [y, m, d] = String(iso).split('-').map(n => Number(n));
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };

  const addDays = (dateObj, days) => {
    const d = new Date(dateObj);
    d.setDate(d.getDate() + days);
    return d;
  };

  const diffDays = (a, b) => {
    // difference in days between date-only values
    const start = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
    const end = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
    return Math.round((end - start) / 86400000);
  };

  const uniqueSorted = (arr) => {
    const list = Array.isArray(arr) ? arr.filter(Boolean) : [];
    return Array.from(new Set(list)).sort();
  };

  const getCompletionDates = (task) => {
    const legacy = task?.completedAt ? [task.completedAt] : [];
    return uniqueSorted([...(task?.completionDates || []), ...legacy]);
  };

  const isCompletedOn = (task, iso) => {
    if (!iso) return false;
    const dates = getCompletionDates(task);
    return dates.includes(iso);
  };

  const getCurrentStreak = (datesIso) => {
    const sorted = uniqueSorted(datesIso);
    if (sorted.length === 0) return 0;
    const toDayIndex = (iso) => {
      const dt = parseIsoDate(iso);
      if (!dt) return null;
      return Math.floor(dt.getTime() / 86400000);
    };
    const indices = sorted.map(toDayIndex).filter(v => typeof v === 'number').sort((a, b) => a - b);
    if (indices.length === 0) return 0;
    let streak = 1;
    for (let i = indices.length - 1; i > 0; i--) {
      if (indices[i] - indices[i - 1] === 1) {
        streak += 1;
      } else {
        break;
      }
    }
    return streak;
  };

  const monthYearLabel = (dateObj) => {
    if (!dateObj) return '';
    return dateObj.toLocaleString(undefined, { month: 'long', year: 'numeric' }).toUpperCase();
  };

  const openTaskDetail = (taskId) => {
    setSelectedTaskId(taskId);
    setDetailMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setCurrentView('taskDetail');
    setShowMenu(false);
    setShowAddTaskForm(false);
    setShowCategoryDropdown(false);
    setShowDatePicker(false);
    setShowTaskTemplate(false);
  };

  const openDatePicker = () => {
    const seed = newTaskDueDate ?? today;
    setPickerMonth(new Date(seed.getFullYear(), seed.getMonth(), 1));
    setPickerTempDate(seed);
    setShowDatePicker(true);
    setShowCategoryDropdown(false);
    setShowTaskTemplate(false);
  };

  const openTaskTemplate = () => {
    setShowTaskTemplate(true);
    setShowDatePicker(false);
    setShowCategoryDropdown(false);
    setTemplateView('list');
    setActiveTemplate(null);
  };

  const openTemplateDetail = (templateItem) => {
    setActiveTemplate(templateItem);
    setTemplateView('detail');
    setTemplateCategory('none');
    setTemplatePhrase(templateItem.title);
    setTemplateRepeatDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    setTemplateSelectedTimes(['08:00 am']);
  };

  const openTemplateDetailWithCategory = (templateItem, categoryId) => {
    setShowTaskTemplate(true);
    setShowDatePicker(false);
    setShowCategoryDropdown(false);
    setShowAddTaskForm(false);
    setActiveTemplate(templateItem);
    setTemplateView('detail');
    setTemplateCategory(categoryId || 'none');
    setTemplatePhrase(templateItem.title);
    setTemplateRepeatDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    setTemplateSelectedTimes(['08:00 am']);
  };

  const workTaskTemplates = useMemo(() => ([
    { title: 'Planning', icon: '💼' },
    { title: 'Meetings', icon: '💼' },
    { title: 'Emails & Communication', icon: '💼' },
    { title: 'Development / Work Tasks', icon: '💼' },
    { title: 'Design', icon: '💼' },
    { title: 'Testing & Review', icon: '💼' },
    { title: 'Documentation', icon: '💼' },
    { title: 'Client / Manager Tasks', icon: '💼' },
    { title: 'Deadlines', icon: '💼' },
    { title: 'Follow-ups', icon: '💼' },
    { title: 'Learning / Skill Upgrade', icon: '💼' },
    { title: 'Admin Work', icon: '💼' },
  ]), []);

  const toggleRepeatDay = (day) => {
    setTemplateRepeatDays(prev => (prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]));
  };

  const toggleReminderTime = (time) => {
    setTemplateSelectedTimes(prev => (prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]));
  };

  const addCustomReminderTime = () => {
    const raw = window.prompt('Enter time (e.g., 09:30 am)');
    const cleaned = (raw || '').trim();
    if (!cleaned) return;
    setTemplateSelectedTimes(prev => (prev.includes(cleaned) ? prev : [...prev, cleaned]));
  };

  const createLocalTask = useCallback(({
    title,
    category = 'none',
    dueAt = null,
    starred = false,
    icon = null,
    templateMeta = null,
  }) => {
    const isoNow = new Date().toISOString();
    const localTask = mapApiTaskToLocal({
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      category,
      completed: false,
      dueAt,
      reminderSent: false,
      createdAt: isoNow,
    });

    return {
      ...localTask,
      starred: !!starred,
      icon,
      templateMeta,
    };
  }, [mapApiTaskToLocal]);

  const addTemplateToList = async () => {
    const phrase = templatePhrase.trim();
    if (!phrase) return;

    const meta = {
      templateId: activeTemplate?.title || null,
      repeatDays: templateRepeatDays,
      reminderTimes: templateSelectedTimes,
    };

    try {
      const response = await api.post('/tasks', {
        title: phrase,
        category: templateCategory,
      });

      const createdTask = mapApiTaskToLocal(response.data?.data || {});
      createdTask.icon = activeTemplate?.icon || null;
      createdTask.templateMeta = meta;
      setTasks(prev => ([...prev, createdTask]));
    } catch {
      const fallbackTask = createLocalTask({
        title: phrase,
        category: templateCategory,
        icon: activeTemplate?.icon || null,
        templateMeta: meta,
      });
      setTasks(prev => ([...prev, fallbackTask]));
    }

    setShowTaskTemplate(false);
    setTemplateView('list');
    setActiveTemplate(null);
    setShowAddTaskForm(false);
  };

  const taskTemplateGroups = useMemo(() => ([
    {
      title: 'Health',
      items: [
        { title: 'Drink water, keep healthy', icon: '🥤', badge: '🔥' },
        { title: 'Brush teeth', icon: '🪥' },
        { title: 'Take a shower', icon: '🚿', badge: 'NEW' },
        { title: 'Go to bed early', icon: '🌙', badge: '🔥' },
        { title: 'Get up early', icon: '🌅', badge: '🔥' },
        { title: 'Medication reminder', icon: '💊' },
        { title: 'Take a break', icon: '☕' },
        { title: 'Eat fruits', icon: '🍐' },
      ]
    },
    {
      title: 'Life',
      items: [
        { title: 'Study', icon: '🎓', badge: '🔥' },
        { title: 'Track expenses', icon: '🧾', badge: 'NEW' },
        { title: 'Make the bed', icon: '🛏️', badge: 'NEW' },
        { title: 'Clean house', icon: '🧹', badge: '🔥' },
        { title: 'Skin care', icon: '🧴' },
        { title: 'Go shopping', icon: '🛒' },
        { title: 'Feed pets', icon: '🐾' },
        { title: 'Keep reading', icon: '📗' },
        { title: 'Learn a foreign language', icon: '🅰️' },
        { title: 'Learn instruments', icon: '🎸' },
        { title: 'Keep in touch with family', icon: '👨‍👩‍👧‍👦' },
      ]
    },
    {
      title: 'Sports',
      items: [
        { title: 'Go exercising', icon: '🏃', badge: '🔥' },
        { title: 'Stretch', icon: '🤸' },
        { title: 'Swimming', icon: '🏊' },
        { title: 'Practice Yoga', icon: '🧘' },
        { title: 'Cycling', icon: '🚴' },
      ]
    },
    {
      title: 'Mind',
      items: [
        { title: 'Pray', icon: '🙏', badge: '🔥' },
        { title: 'Meditation', icon: '🧘‍♂️' },
        { title: 'Journal', icon: '📝', badge: 'NEW' },
        { title: 'Review Today', icon: '🗂️', badge: 'NEW' },
      ]
    },
    {
      title: 'Quit',
      items: [
        { title: 'Be grateful for what you have', icon: '❤️', badge: '🔥' },
        { title: 'Practice smiling and be happy', icon: '🙂' },
        { title: 'Eat less sugar', icon: '🍭' },
        { title: 'Less time on your phone', icon: '📵', badge: '🔥' },
        { title: 'Play less game', icon: '🎮' },
      ]
    },
  ]), []);

  const shiftPickerMonth = (offset) => {
    setPickerMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const applyQuickDate = (kind) => {
    if (kind === 'none') {
      setPickerTempDate(null);
      return;
    }
    const base = new Date(today);
    if (kind === 'today') setPickerTempDate(base);
    if (kind === 'tomorrow') setPickerTempDate(new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1));
    if (kind === '3days') setPickerTempDate(new Date(base.getFullYear(), base.getMonth(), base.getDate() + 3));
    if (kind === 'sunday') {
      const day = base.getDay();
      const add = (7 - day) % 7;
      setPickerTempDate(new Date(base.getFullYear(), base.getMonth(), base.getDate() + add));
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (newTask.trim()) {
      let dueAtValue = null;
      try {
        if (newTaskDueDate) {
          const due = new Date(newTaskDueDate);
          const [hours, minutes] = String(newTaskDueTime || '09:00').split(':').map(Number);
          due.setHours(Number.isFinite(hours) ? hours : 9, Number.isFinite(minutes) ? minutes : 0, 0, 0);
          dueAtValue = due.toISOString();
        }

        const response = await api.post('/tasks', {
          title: newTask,
          category: newTaskCategory,
          dueAt: dueAtValue,
        });

        const createdTask = mapApiTaskToLocal(response.data?.data || {});
        createdTask.starred = !!newTaskStarred;
        setTasks(prev => ([...prev, createdTask]));
      } catch {
        const fallbackTask = createLocalTask({
          title: newTask.trim(),
          category: newTaskCategory,
          dueAt: dueAtValue,
          starred: newTaskStarred,
        });
        setTasks(prev => ([...prev, fallbackTask]));
      }

      setNewTask('');
      setNewTaskCategory('none');
      setNewTaskStarred(false);
      setNewTaskDueDate(null);
      setNewTaskDueTime('09:00');
      setShowCategoryDropdown(false);
      setShowDatePicker(false);
      setShowAddTaskForm(false);
    }
  };

  const toggleTask = (id) => {
    const todayDoneIso = buildIsoDate(new Date());
    setTasks(prev => prev.map(task => {
      if (task.id !== id) return task;
      const createdAt = task.createdAt ?? task.id;
      const currentDates = getCompletionDates(task);
      const isDoneToday = currentDates.includes(todayDoneIso);

      if (isDoneToday) {
        const nextDates = currentDates.filter(d => d !== todayDoneIso);
        return {
          ...task,
          createdAt,
          completed: false,
          completedAt: null,
          completedAtTs: null,
          completionDates: nextDates,
        };
      }

      return {
        ...task,
        createdAt,
        completed: true,
        completedAt: todayDoneIso,
        completedAtTs: Date.now(),
        completionDates: uniqueSorted([...currentDates, todayDoneIso]),
      };
    }));
  };

  const toggleBookmark = (id) => {
    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, starred: !task.starred } : task
    ));
  };

  const filteredTasks = selectedCategory === 'all'
    ? tasks
    : selectedCategory === 'starred'
      ? tasks.filter(task => task.starred)
      : selectedCategory === 'wishlist'
        ? tasks.filter(task => task.starred || task.category === 'wishlist')
        : selectedCategory === 'birthday'
          ? tasks.filter(task => task.category === 'birthday')
          : tasks.filter(task => task.category === selectedCategory);

  const formatShortDate = (iso) => {
    if (!iso) return '';
    const parts = String(iso).split('-');
    if (parts.length !== 3) return '';
    const dd = parts[2];
    const mm = parts[1];
    return `${dd}-${mm}`;
  };

  const todayIso = buildIsoDate(new Date());
  const toCreatedComparable = (task) => {
    const v = task?.createdAt ?? task?.id;
    return typeof v === 'number' ? v : 0;
  };

  const isDoneToday = (task) => isCompletedOn(task, todayIso);

  // Keep Future list stable (no re-sorting that makes items jump)
  const futureTasks = filteredTasks
    .filter(t => !isDoneToday(t))
    .slice()
    .sort((a, b) => toCreatedComparable(a) - toCreatedComparable(b));

  // Keep Completed Today stable: append new completions at the bottom.
  const completedTodayTasks = filteredTasks
    .filter(t => isDoneToday(t))
    .slice()
    .sort((a, b) => {
      const aTs = typeof a.completedAtTs === 'number' ? a.completedAtTs : 0;
      const bTs = typeof b.completedAtTs === 'number' ? b.completedAtTs : 0;
      if (aTs !== bTs) return aTs - bTs;
      return toCreatedComparable(a) - toCreatedComparable(b);
    });

  if (currentView === 'taskDetail') {
    const activeTask = tasks.find(t => t.id === selectedTaskId);
    if (!activeTask) {
      return (
        <div className="task-detail-screen">
          <div className="task-detail-topbar">
            <button
              type="button"
              className="task-detail-back"
              onClick={() => {
                setCurrentView('tasks');
                setSelectedTaskId(null);
              }}
              aria-label="Back"
            >
              <FaArrowLeft />
            </button>
            <div className="task-detail-topbar-spacer" />
            <button
              type="button"
              className="task-detail-more"
              aria-label="Logout"
              title="Logout"
              onClick={logoutFromDots}
            >
              <FaEllipsisV />
            </button>
          </div>

          <div className="task-detail-missing">Task not found.</div>
        </div>
      );
    }

    const completionDates = getCompletionDates(activeTask);
    const totalDays = completionDates.length;
    const streakDays = getCurrentStreak(completionDates);
    const reminderTimes = activeTask?.templateMeta?.reminderTimes || [];

    const monthLabelUpper = monthYearLabel(detailMonth);
    const monthYear = detailMonth.getFullYear();
    const monthIndex = detailMonth.getMonth();
    const firstDow = new Date(monthYear, monthIndex, 1).getDay();
    const daysInMonth = new Date(monthYear, monthIndex + 1, 0).getDate();
    const cellCount = Math.ceil((firstDow + daysInMonth) / 7) * 7;
    const completionSet = new Set(completionDates);

    const renderPerfCells = () => {
      const cells = [];
      for (let i = 0; i < cellCount; i++) {
        const dayNum = i - firstDow + 1;
        if (dayNum < 1 || dayNum > daysInMonth) {
          cells.push(<div key={`blank-${i}`} className="perf-cell blank" />);
          continue;
        }
        const iso = buildIsoDate(new Date(monthYear, monthIndex, dayNum));
        const done = completionSet.has(iso);
        cells.push(
          <div key={iso} className={`perf-cell ${done ? 'done' : ''}`}>
            <div className="perf-day">{dayNum}</div>
          </div>
        );
      }
      return cells;
    };

    return (
      <div className="task-detail-screen">
        <div className="task-detail-topbar">
          <button
            type="button"
            className="task-detail-back"
            onClick={() => {
              setCurrentView('tasks');
              setSelectedTaskId(null);
            }}
            aria-label="Back"
          >
            <FaArrowLeft />
          </button>
          <div className="task-detail-topbar-spacer" />
          <button
            type="button"
            className="task-detail-more"
            aria-label="Logout"
            title="Logout"
            onClick={logoutFromDots}
          >
            <FaEllipsisV />
          </button>
        </div>

        <div className="task-detail-hero">
          <div className="task-detail-icon">{activeTask.icon || '✅'}</div>
        </div>

        <div className="task-detail-title">{activeTask.text}</div>
        <div className="task-detail-subtitle">
          {reminderTimes.length
            ? `Reminder at ${reminderTimes.join(', ')}`
            : 'Reminder: No'}
        </div>

        <div className="task-detail-section-title">Total Completion Status</div>
        <div className="task-detail-stats">
          <div className="task-stat-card">
            <div className="task-stat-number">{totalDays}</div>
            <div className="task-stat-label">Total Day</div>
          </div>
          <div className="task-stat-card">
            <div className="task-stat-number">{streakDays}</div>
            <div className="task-stat-label">Streak Days</div>
          </div>
        </div>

        <div className="task-detail-section-title">Performance Calendar</div>
        <div className="perf-calendar">
          <div className="perf-month-header">
            <button
              type="button"
              className="perf-month-nav"
              onClick={() => setDetailMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              aria-label="Previous month"
            >
              ‹
            </button>
            <div className="perf-month-title">{monthLabelUpper}</div>
            <button
              type="button"
              className="perf-month-nav"
              onClick={() => setDetailMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className="perf-weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="perf-weekday">{d}</div>
            ))}
          </div>

          <div className="perf-grid">
            {renderPerfCells()}
          </div>
        </div>
      </div>
    );
  }

  // Show Calendar view when calendar is selected
  if (currentView === 'calendar') {
    return (
      <div className="dashboard-mobile">
        <div className="calendar-view-wrapper">
          <Calendar />
        </div>
        {/* Bottom Navigation Bar - Menu Button + Navigation Items */}
        <nav className="bottom-nav">
          <button
            className={`bottom-nav-item menu-toggle ${showMenu ? 'active' : ''}`}
            onClick={() => setShowMenu(!showMenu)}
            title="Open Menu"
          >
            <FaBars className="nav-item-icon" />
            <span className="nav-item-label">Menu</span>
          </button>
          
          {bottomNavItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`bottom-nav-item ${activeNav === item.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveNav(item.id);
                  setCurrentView(item.id);
                }}
                title={item.label}
              >
                <Icon className="nav-item-icon" />
                <span className="nav-item-label">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  // Mine / Analytics view
  if (currentView === 'mine') {
    const mineToday = new Date();
    const mineTodayIso = buildIsoDate(mineToday);

    const completedTodayCount = tasks.filter(t => isCompletedOn(t, mineTodayIso)).length;
    const pendingTodayCount = Math.max(0, tasks.length - completedTodayCount);

    // Overall streak (any task completed on that day)
    const allCompletionDates = uniqueSorted(tasks.flatMap(t => getCompletionDates(t)));
    const overallStreak = getCurrentStreak(allCompletionDates);

    // Last 7 days completion counts
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(mineToday, -6 + i);
      const iso = buildIsoDate(d);
      const count = tasks.reduce((acc, t) => acc + (isCompletedOn(t, iso) ? 1 : 0), 0);
      return { date: d, iso, count };
    });
    const maxDaily = Math.max(1, ...last7.map(x => x.count));

    const next7 = tasks
      .filter(t => !!t.dueDate)
      .map(t => ({
        task: t,
        due: parseIsoDate(t.dueDate),
      }))
      .filter(x => x.due && diffDays(mineToday, x.due) >= 0 && diffDays(mineToday, x.due) <= 7)
      .sort((a, b) => a.due.getTime() - b.due.getTime());

    const pendingTasks = tasks.filter(t => !isCompletedOn(t, mineTodayIso));
    const pendingInRange = pendingTasks.filter(t => {
      if (mineRange === 'all') return true;
      const n = mineRange === '7' ? 7 : 30;
      if (!t.dueDate) return false;
      const due = parseIsoDate(t.dueDate);
      if (!due) return false;
      const d = diffDays(mineToday, due);
      return d >= 0 && d <= n;
    });

    const categoryLabel = (catId) => {
      if (!catId || catId === 'none') return 'No Category';
      if (catId === 'work') return 'Work';
      if (catId === 'personal') return 'Personal';
      if (catId === 'wishlist') return 'Wishlist';
      if (catId === 'birthday') return 'Birthday';
      const custom = customCategories.find(c => c.id === catId);
      return custom?.label || 'No Category';
    };

    const grouped = pendingInRange.reduce((acc, t) => {
      const key = t.category || 'none';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const groupedList = Object.entries(grouped)
      .map(([key, value]) => ({ key, label: categoryLabel(key), value }))
      .sort((a, b) => b.value - a.value);

    const totalGrouped = groupedList.reduce((sum, x) => sum + x.value, 0);
    const palette = ['#2563eb', '#60a5fa', '#22c55e', '#f59e0b', '#ef4444', '#a78bfa', '#14b8a6'];
    let cum = 0;
    const donutStops = totalGrouped
      ? groupedList.slice(0, 7).map((g, idx) => {
          const pct = (g.value / totalGrouped) * 100;
          const start = cum;
          cum += pct;
          return `${palette[idx % palette.length]} ${start}% ${cum}%`;
        }).join(', ')
      : '#e5e7eb 0% 100%';
    const donutStyle = {
      background: `conic-gradient(${donutStops})`
    };

    return (
      <div className="dashboard-mobile mine-view">
        <div className="mine-container">
          <div className="mine-hero">
            <div className="mine-avatar" />
            <div className="mine-hero-text">
              <div className="mine-hero-title">Kept to your plan for {overallStreak || 1} day!</div>
              {!authUser ? (
                <button
                  type="button"
                  className="mine-login-link"
                  onClick={() => setShowLoginChoice(true)}
                >
                  Click to login
                </button>
              ) : (
                <div className="mine-hero-sub">Signed in ({authUser.provider})</div>
              )}
            </div>
            {authUser ? (
              <button type="button" className="mine-logout-btn" onClick={logout}>Logout</button>
            ) : null}
          </div>

          <div className="mine-section-title">Tasks Overview</div>
          <div className="mine-overview">
            <div className="mine-metric">
              <div className="mine-metric-number">{completedTodayCount}</div>
              <div className="mine-metric-label">Completed Tasks</div>
            </div>
            <div className="mine-metric">
              <div className="mine-metric-number">{pendingTodayCount}</div>
              <div className="mine-metric-label">Pending Tasks</div>
            </div>
          </div>

          <div className="mine-card">
            <div className="mine-card-header">
              <div className="mine-card-title">Completion of Daily Tasks</div>
              <div className="mine-card-sub">{mineTodayIso?.slice(5).replace('-', '/')}</div>
            </div>
            <div className="mine-bar-area">
              <div className="mine-bars">
                {last7.map((d) => {
                  const h = Math.round((d.count / maxDaily) * 100);
                  return (
                    <div key={d.iso} className="mine-bar-col">
                      <div className="mine-bar" style={{ height: `${h}%` }} />
                      <div className="mine-bar-label">{d.date.toLocaleString(undefined, { weekday: 'short' })}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mine-card">
            <div className="mine-card-title">Tasks in Next 7 Days</div>
            <div className="mine-next7">
              {next7.length === 0 ? (
                <div className="mine-empty">No tasks in next 7 days.</div>
              ) : (
                next7.slice(0, 4).map(({ task }) => (
                  <div key={task.id} className="mine-next-item">
                    <div className="mine-next-left">
                      <span className="mine-next-emoji">{task.icon || '📌'}</span>
                      <span className="mine-next-text">{task.text}</span>
                    </div>
                    <div className="mine-next-date">{formatShortDate(task.dueDate)}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mine-card">
            <div className="mine-card-header">
              <div className="mine-card-title">Pending Tasks in Categories</div>
              <div className="mine-range">
                <button type="button" className={`mine-range-btn ${mineRange === '7' ? 'active' : ''}`} onClick={() => setMineRange('7')}>In 7 days</button>
                <button type="button" className={`mine-range-btn ${mineRange === '30' ? 'active' : ''}`} onClick={() => setMineRange('30')}>In 30 days</button>
                <button type="button" className={`mine-range-btn ${mineRange === 'all' ? 'active' : ''}`} onClick={() => setMineRange('all')}>All</button>
              </div>
            </div>
            <div className="mine-donut-row">
              <div className="mine-donut" style={donutStyle}>
                <div className="mine-donut-hole" />
              </div>
              <div className="mine-legend">
                {groupedList.length === 0 ? (
                  <div className="mine-empty">No pending tasks.</div>
                ) : (
                  groupedList.slice(0, 5).map((g, idx) => (
                    <div key={g.key} className="mine-legend-item">
                      <span className="mine-legend-dot" style={{ background: palette[idx % palette.length] }} />
                      <span className="mine-legend-label">{g.label}</span>
                      <span className="mine-legend-value">{g.value}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {showLoginChoice && !authUser && (
          <div
            className="login-choice-overlay"
            onClick={(e) => {
              if (e.target.classList.contains('login-choice-overlay')) setShowLoginChoice(false);
            }}
          >
            <div className="login-choice-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="login-choice-title">Login</div>
              <div className="login-choice-sub">Choose how you want to continue</div>
              <button type="button" className="login-choice-btn google" onClick={continueWithGoogle}>
                Continue with Google
              </button>
              <button type="button" className="login-choice-btn" onClick={goToSignIn}>
                Sign in
              </button>
              <button type="button" className="login-choice-cancel" onClick={() => setShowLoginChoice(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <nav className="bottom-nav">
          <button
            className={`bottom-nav-item menu-toggle ${showMenu ? 'active' : ''}`}
            onClick={() => setShowMenu(!showMenu)}
            title="Open Menu"
          >
            <FaBars className="nav-item-icon" />
            <span className="nav-item-label">Menu</span>
          </button>
          {bottomNavItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`bottom-nav-item ${activeNav === item.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveNav(item.id);
                  setCurrentView(item.id);
                }}
                title={item.label}
              >
                <Icon className="nav-item-icon" />
                <span className="nav-item-label">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  return (
    <div className="dashboard-mobile">
      {/* Left Sidebar Menu */}
      {showMenu && (
        <div className="left-sidebar">
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <FaList className="logo-icon" />
              <span className="logo-text">To-Do List</span>
            </div>
            <button 
              className="close-sidebar-btn"
              onClick={() => setShowMenu(false)}
            >
              ✕
            </button>
          </div>
          <div className="sidebar-menu">
            {sidebarMenuItems.map(option => {
              const OptionIcon = option.icon;
              return (
                <button
                  key={option.id}
                  className="sidebar-menu-item"
                  onClick={() => {
                    console.log(`${option.label} clicked`);
                    setShowMenu(false); // Close sidebar
                    
                    // Handle navigation based on option
                    if (option.id === 'all' || option.id === 'work' || option.id === 'personal') {
                      // Show tasks view with selected category
                      setCurrentView('tasks');
                      setActiveNav('tasks');
                      setSelectedCategory(option.id);
                    } else if (option.id === 'wishlist') {
                      // Navigate to wishlist (as a separate view/page)
                      setCurrentView('tasks');
                      setActiveNav('tasks');
                      setSelectedCategory('wishlist');
                    } else if (option.id === 'starred') {
                      // Show starred tasks
                      setCurrentView('tasks');
                      setActiveNav('tasks');
                      setSelectedCategory('starred');
                    } else if (option.id === 'birthday') {
                      // Show birthday category
                      setCurrentView('tasks');
                      setActiveNav('tasks');
                      setSelectedCategory('birthday');
                    } else if (option.id === 'category') {
                      // Show all categories
                      setCurrentView('tasks');
                      setActiveNav('tasks');
                      setSelectedCategory('all');
                    } else if (option.id === 'create') {
                      // Open add task form
                      setShowAddTaskForm(true);
                    } else if (option.id === 'home') {
                      // Go to home/tasks view
                      setCurrentView('tasks');
                      setActiveNav('tasks');
                      setSelectedCategory('all');
                    } else if (option.id === 'faq' || option.id === 'feedback' || option.id === 'follow' || option.id === 'donate') {
                      // Handle other menu items if needed
                      alert(`${option.label} feature coming soon!`);
                    }
                  }}
                >
                  <OptionIcon className="sidebar-icon" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Overlay when menu is open */}
      {showMenu && (
        <div className="menu-overlay" onClick={() => setShowMenu(false)} />
      )}

      {/* Top Navigation Bar */}
      <div className="top-header">
        <div className="header-content">
          <div className="header-left">
            <FaList className="header-icon" />
          </div>
          <div className="header-tabs">
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`tab ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="header-right">
            <button
              type="button"
              className="menu-btn"
              onClick={() => {
                logoutFromDots();
              }}
              title="Logout"
              aria-label="Logout"
            >
              ⋮
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="mobile-content">
        <div className="dashboard-greeting">
          <div className="dashboard-greeting-title">Welcome buddy</div>
          <div className="dashboard-greeting-subtitle">
            Complete todays task • Reminders: {unreadNotifications.length}
          </div>
        </div>

        {unreadNotifications.length > 0 && (
          <div className="task-section">
            <div className="task-section-header">
              <span className="task-section-title">Reminders</span>
              {browserNotificationPermission !== 'unsupported' && (
                <div className="reminder-header-actions">
                  {browserNotificationPermission === 'granted' ? (
                    <span className="notify-enabled-badge">Alerts On</span>
                  ) : (
                    <button
                      type="button"
                      className="notify-enable-btn"
                      onClick={enableBrowserNotifications}
                    >
                      Enable Alerts
                    </button>
                  )}
                </div>
              )}
              <FaChevronDown className="task-section-caret" />
            </div>
            <div className="task-cards">
              {unreadNotifications.slice(0, 3).map((item) => (
                <div key={item.id} className="task-card">
                  <div className="task-main">
                    <div className="task-title-row">
                      <FaBell className="task-meta-icon" />
                      <span className="task-title">{item.message}</span>
                    </div>
                    <div className="task-meta-row">
                      <span className="task-date">{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="task-bookmark active"
                    onClick={() => markNotificationRead(item.id)}
                    title="Mark as read"
                  >
                    <FaBookmark />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedCategory === 'work' && (
          <section className="work-templates">
            <div className="work-templates-header">
              <div className="work-templates-title">Work Categories</div>
              <div className="work-templates-subtitle">Tap one to create a Work task with reminder + repeat.</div>
            </div>
            <div className="work-templates-grid">
              {workTaskTemplates.map(tpl => (
                <button
                  key={tpl.title}
                  type="button"
                  className="work-template-item"
                  onClick={() => openTemplateDetailWithCategory(tpl, 'work')}
                  title={tpl.title}
                >
                  <span className="work-template-icon">{tpl.icon}</span>
                  <span className="work-template-text">{tpl.title}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {filteredTasks.length === 0 ? (
          <div className="empty-state-mobile">
            <div className="empty-avatar">
              <div className="avatar-circle">
                <FaUser className="avatar-icon" />
              </div>
            </div>
            <p className="empty-text">No tasks in this category.</p>
            <p className="empty-subtext">Click + to create your task</p>
          </div>
        ) : (
          <div className="tasks-sections">
            <div className="task-section">
              <div className="task-section-header">
                <span className="task-section-title">Future task</span>
                <FaChevronDown className="task-section-caret" />
              </div>
              <div className="task-cards">
                {futureTasks.map(task => (
                  <div
                    key={task.id}
                    className={`task-card ${isDoneToday(task) ? 'completed' : ''}`}
                    onClick={() => openTaskDetail(task.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') openTaskDetail(task.id);
                    }}
                  >
                    <label className="task-check" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isDoneToday(task)}
                        onChange={() => toggleTask(task.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="task-checkmark" />
                    </label>

                    <div className="task-main">
                      <div className="task-title-row">
                        {task.icon ? <span className="task-emoji">{task.icon}</span> : null}
                        <span className="task-title">{task.text}</span>
                      </div>
                      <div className="task-meta-row">
                        {task.dueDate ? <span className="task-date">{formatShortDate(task.dueDate)}</span> : <span className="task-date" />}
                        {task.templateMeta?.reminderTimes?.length ? <FaBell className="task-meta-icon" /> : null}
                        {task.templateMeta?.repeatDays?.length ? <FaRedoAlt className="task-meta-icon" /> : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`task-bookmark ${task.starred ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(task.id);
                      }}
                      title="Bookmark"
                    >
                      {task.starred ? <FaBookmark /> : <FaRegBookmark />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="task-section">
              <div className="task-section-header">
                <span className="task-section-title">Completed task</span>
                <FaChevronDown className="task-section-caret" />
              </div>
              <div className="task-cards completed">
                {completedTodayTasks.map(task => (
                  <div
                    key={task.id}
                    className="task-card completed"
                    onClick={() => openTaskDetail(task.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') openTaskDetail(task.id);
                    }}
                  >
                    <label className="task-check" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isDoneToday(task)}
                        onChange={() => toggleTask(task.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="task-checkmark" />
                    </label>

                    <div className="task-main">
                      <div className="task-title-row">
                        {task.icon ? <span className="task-emoji">{task.icon}</span> : null}
                        <span className="task-title">{task.text}</span>
                      </div>
                      <div className="task-meta-row">
                        {task.dueDate ? <span className="task-date">{formatShortDate(task.dueDate)}</span> : <span className="task-date" />}
                        {task.templateMeta?.reminderTimes?.length ? <FaBell className="task-meta-icon" /> : null}
                        {task.templateMeta?.repeatDays?.length ? <FaRedoAlt className="task-meta-icon" /> : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`task-bookmark ${task.starred ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(task.id);
                      }}
                      title="Bookmark"
                    >
                      {task.starred ? <FaBookmark /> : <FaRegBookmark />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <button 
        className="fab"
        onClick={() => {
          setShowAddTaskForm(true);
          setShowCategoryDropdown(false);
          setShowDatePicker(false);
          setShowTaskTemplate(false);
          // Default the new task's category to the currently selected tab
          // so tasks added in Personal/Work appear there and also under All.
          if (selectedCategory === 'personal' || selectedCategory === 'work') {
            setNewTaskCategory(selectedCategory);
            setNewTaskStarred(false);
          } else if (selectedCategory === 'wishlist') {
            // Wishlist is treated as a "starred" view so tasks can still belong to a real category.
            setNewTaskCategory('wishlist');
            setNewTaskStarred(true);
          } else {
            setNewTaskCategory('none');
            setNewTaskStarred(false);
          }
        }}
      >
        <FaPlus />
      </button>

      {/* Add Task Form Modal */}
      {showAddTaskForm && (
        <div className="add-task-modal">
          <form onSubmit={handleAddTask}>
            <input
              type="text"
              placeholder="Input new task here"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              autoFocus
            />

            <div className="add-task-footer">
              <div className="add-task-category">
                <button
                  type="button"
                  className="category-trigger"
                  onClick={() => {
                    setShowCategoryDropdown(v => !v);
                    setShowDatePicker(false);
                  }}
                >
                  {selectedAddCategoryLabel}
                </button>

                {showCategoryDropdown && (
                  <div className="category-dropdown">
                    {addTaskCategoryOptions.map(option => (
                      <button
                        key={option.id}
                        type="button"
                        className="category-dropdown-item"
                        onClick={() => {
                          if (option.isCreate) {
                            const name = window.prompt('Category name');
                            const cleaned = (name || '').trim();
                            if (!cleaned) return;
                            const id = `${cleaned.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
                            setCustomCategories(prev => [...prev, { id, label: cleaned }]);
                            setNewTaskCategory(id);
                            setShowCategoryDropdown(false);
                            return;
                          }
                          setNewTaskCategory(option.id);
                          setShowCategoryDropdown(false);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="add-task-icons">
                <button
                  type="button"
                  className={`footer-icon-btn ${showDatePicker ? 'active' : ''}`}
                  onClick={() => {
                    if (showDatePicker) {
                      setShowDatePicker(false);
                    } else {
                      openDatePicker();
                    }
                  }}
                  title="Pick date"
                >
                  <FaCalendar />
                </button>
                <button type="button" className="footer-icon-btn" title="Share">
                  <FaShareAlt />
                </button>
                <button
                  type="button"
                  className={`footer-icon-btn ${newTaskStarred ? 'active' : ''}`}
                  title="Wishlist"
                  onClick={() => setNewTaskStarred(v => !v)}
                >
                  {newTaskStarred ? <FaBookmark /> : <FaRegBookmark />}
                </button>
                <button
                  type="button"
                  className={`footer-icon-btn ${showTaskTemplate ? 'active' : ''}`}
                  title="Task Template"
                  onClick={() => {
                    if (showTaskTemplate) {
                      setShowTaskTemplate(false);
                    } else {
                      openTaskTemplate();
                    }
                  }}
                >
                  <FaClipboardCheck />
                </button>
              </div>
            </div>
            <div className="modal-buttons">
              <button type="submit" className="btn-submit">Add</button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setShowAddTaskForm(false);
                  setShowCategoryDropdown(false);
                  setShowDatePicker(false);
                  setShowTaskTemplate(false);
                  setNewTaskDueDate(null);
                  setNewTaskDueTime('09:00');
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showTaskTemplate && (
        <div
          className="template-overlay"
          onClick={(e) => {
            if (e.target.classList.contains('template-overlay')) {
              setShowTaskTemplate(false);
              setTemplateView('list');
              setActiveTemplate(null);
            }
          }}
        >
          <div className="template-sheet" onClick={(e) => e.stopPropagation()}>
            {templateView === 'list' ? (
              <>
                <div className="template-header">
                  <button
                    type="button"
                    className="template-back"
                    onClick={() => {
                      setShowTaskTemplate(false);
                      setTemplateView('list');
                      setActiveTemplate(null);
                    }}
                    aria-label="Back"
                  >
                    ‹
                  </button>
                  <div className="template-title">Task Template</div>
                  <div className="template-spacer" />
                </div>

                <div className="template-list">
                  {taskTemplateGroups.map(group => (
                    <div key={group.title} className="template-group">
                      <div className="template-group-title">{group.title}</div>
                      {group.items.map(item => (
                        <button
                          key={item.title}
                          type="button"
                          className="template-item"
                          onClick={() => openTemplateDetail(item)}
                        >
                          <div className="template-item-left">
                            <div className="template-item-icon">{item.icon}</div>
                            <div className="template-item-text">{item.title}</div>
                          </div>
                          <div className="template-item-right">
                            {item.badge === '🔥' ? (
                              <span className="template-badge flame">🔥</span>
                            ) : item.badge ? (
                              <span className="template-badge new">{item.badge}</span>
                            ) : null}
                            <span className="template-chevron">›</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                  <div className="template-footer-hint">Tap here to tell us what other template you want.</div>
                </div>
              </>
            ) : (
              <>
                <div className="template-detail-header">
                  <button
                    type="button"
                    className="template-back"
                    onClick={() => setTemplateView('list')}
                    aria-label="Back"
                  >
                    ‹
                  </button>
                  <div className="template-detail-title">{activeTemplate?.title || 'Template'}</div>
                  <div className="template-spacer" />
                </div>

                <div className="template-detail-body">
                  <button
                    type="button"
                    className="template-category-trigger"
                    onClick={() => {
                      const options = ['none', 'work', 'personal', 'wishlist', 'birthday'];
                      const labels = {
                        none: 'No Category',
                        work: 'Work',
                        personal: 'Personal',
                        wishlist: 'Wishlist',
                        birthday: 'Birthday',
                      };
                      const next = window.prompt(
                        `Category: ${labels[templateCategory] || 'No Category'}\nChoose: none/work/personal/wishlist/birthday`,
                        templateCategory
                      );
                      const cleaned = (next || '').trim();
                      if (!cleaned) return;
                      if (options.includes(cleaned)) setTemplateCategory(cleaned);
                    }}
                  >
                    {templateCategory === 'none' ? 'No Category' : templateCategory.charAt(0).toUpperCase() + templateCategory.slice(1)}
                    <FaChevronDown className="template-category-caret" />
                  </button>

                  <div className="template-illustration">
                    <div className="template-illustration-icon">{activeTemplate?.icon || '✅'}</div>
                  </div>

                  <div className="template-desc">
                    Setting reminders can help you stay on track, especially if you forget or are too busy.
                  </div>

                  <div className="template-section">
                    <div className="template-section-title">Reminder Phrase</div>
                    <input
                      className="template-input"
                      value={templatePhrase}
                      onChange={(e) => setTemplatePhrase(e.target.value)}
                    />
                  </div>

                  <div className="template-section">
                    <div className="template-section-title">Repeat on</div>
                    <div className="repeat-days">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <button
                          key={d}
                          type="button"
                          className={`day-chip ${templateRepeatDays.includes(d) ? 'active' : ''}`}
                          onClick={() => toggleRepeatDay(d)}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="template-section">
                    <div className="template-section-title">Reminder at</div>
                    <div className="reminder-times">
                      {['08:00 am', '12:00 pm', '04:00 pm', '06:00 pm'].map(t => (
                        <button
                          key={t}
                          type="button"
                          className={`time-chip ${templateSelectedTimes.includes(t) ? 'active' : ''}`}
                          onClick={() => toggleReminderTime(t)}
                        >
                          {t}
                        </button>
                      ))}
                      <button type="button" className="time-chip add" onClick={addCustomReminderTime}>+</button>
                    </div>
                  </div>
                </div>

                <div className="template-detail-footer">
                  <button type="button" className="template-add-btn" onClick={addTemplateToList}>
                    Add to my list
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showDatePicker && (
        <div
          className="date-picker-overlay"
          onClick={(e) => {
            if (e.target.classList.contains('date-picker-overlay')) {
              setShowDatePicker(false);
            }
          }}
        >
          <div className="date-picker-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="date-picker-header">
              <button type="button" className="month-nav" onClick={() => shiftPickerMonth(-1)} aria-label="Previous month">‹</button>
              <div className="month-title">{monthLabel}</div>
              <button type="button" className="month-nav" onClick={() => shiftPickerMonth(1)} aria-label="Next month">›</button>
            </div>

            <div className="date-picker-weekdays">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="weekday">{d}</div>
              ))}
            </div>

            <div className="date-picker-grid">
              {(() => {
                const year = pickerMonth.getFullYear();
                const month = pickerMonth.getMonth();
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const cells = [];
                for (let i = 0; i < firstDay; i++) cells.push(null);
                for (let d = 1; d <= daysInMonth; d++) cells.push(d);
                const selectedIso = buildIsoDate(pickerTempDate);
                return cells.map((day, idx) => {
                  if (!day) return <div key={`blank-${idx}`} className="date-cell blank" />;
                  const cellDate = new Date(year, month, day);
                  const iso = buildIsoDate(cellDate);
                  const isSelected = selectedIso && iso === selectedIso;
                  return (
                    <button
                      key={iso}
                      type="button"
                      className={`date-cell ${isSelected ? 'selected' : ''}`}
                      onClick={() => setPickerTempDate(cellDate)}
                    >
                      {day}
                    </button>
                  );
                });
              })()}
            </div>

            <div className="date-quick-actions">
              <button type="button" className="quick-btn" onClick={() => applyQuickDate('none')}>No Date</button>
              <button type="button" className="quick-btn" onClick={() => applyQuickDate('today')}>Today</button>
              <button type="button" className="quick-btn" onClick={() => applyQuickDate('tomorrow')}>Tomorrow</button>
              <button type="button" className="quick-btn" onClick={() => applyQuickDate('3days')}>3 Days Later</button>
              <button type="button" className="quick-btn" onClick={() => applyQuickDate('sunday')}>This Sunday</button>
            </div>

            <div className="date-picker-options">
              <div className="picker-row">
                <span className="picker-label">Time</span>
                <input
                  type="time"
                  className="picker-value"
                  value={newTaskDueTime}
                  onChange={(e) => setNewTaskDueTime(e.target.value || '09:00')}
                />
              </div>
              <div className="picker-row"><span className="picker-label">Reminder</span><span className="picker-value">No</span></div>
              <div className="picker-row"><span className="picker-label">Repeat</span><span className="picker-value">No</span></div>
            </div>

            <div className="date-picker-actions">
              <button
                type="button"
                className="picker-action cancel"
                onClick={() => setShowDatePicker(false)}
              >
                CANCEL
              </button>
              <button
                type="button"
                className="picker-action done"
                onClick={() => {
                  setNewTaskDueDate(pickerTempDate ? new Date(pickerTempDate) : null);
                  setShowDatePicker(false);
                }}
              >
                DONE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar - Menu Button + Navigation Items */}
      <nav className="bottom-nav">
        <button
          className={`bottom-nav-item menu-toggle ${showMenu ? 'active' : ''}`}
          onClick={() => setShowMenu(!showMenu)}
          title="Open Menu"
        >
          <FaBars className="nav-item-icon" />
          <span className="nav-item-label">Menu</span>
        </button>
        
        {bottomNavItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`bottom-nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveNav(item.id);
                setCurrentView(item.id);
              }}
              title={item.label}
            >
              <Icon className="nav-item-icon" />
              <span className="nav-item-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default Dashboard;
