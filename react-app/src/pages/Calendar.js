import React, { useState } from 'react';
import { FaChevronLeft, FaChevronRight, FaPlus } from 'react-icons/fa';
import '../styles/Calendar.css';

function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 21)); // January 21, 2026
  const [selectedDay, setSelectedDay] = useState(21); // Track selected date
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [tasks, setTasks] = useState([
    { id: 1, date: '2026-01-21', title: 'Fresh breath starts with a brush.' },
    { id: 2, date: '2026-01-22', title: 'Drink water, keep healthy' },
  ]);
  const [newTask, setNewTask] = useState('');
  const [showTemplates, setShowTemplates] = useState(false); // Show template modal

  const healthTemplates = [
    { title: 'Drink water, keep healthy', icon: '🚰', popular: true, category: 'Health' },
    { title: 'Brush teeth', icon: '🪥', isNew: true, category: 'Health' },
    { title: 'Take a shower', icon: '🚿', isNew: true, category: 'Health' },
    { title: 'Go to bed early', icon: '🌙', popular: true, category: 'Health' },
    { title: 'Get up early', icon: '🌅', category: 'Health' },
    { title: 'Medication reminder', icon: '💊', category: 'Health' },
    { title: 'Take a break', icon: '☕', category: 'Health' },
    { title: 'Eat fruits', icon: '🍌', category: 'Health' },
  ];

  const lifeTemplates = [
    { title: 'Study', icon: '📖', popular: true, category: 'Life' },
    { title: 'Track expenses', icon: '📋', isNew: true, category: 'Life' },
  ];

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const changeMonth = (monthOffset) => {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + monthOffset, 1);
    setCurrentDate(next);
    setSelectedDay(1);
    setShowAddTaskForm(false);
    setNewTask('');
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = [];

  // Add empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Add days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const toDateString = (day) => {
    return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (newTask.trim()) {
      const dateStr = toDateString(selectedDay);
      setTasks([...tasks, {
        id: Date.now(),
        date: dateStr,
        title: newTask
      }]);
      setNewTask('');
      setShowAddTaskForm(false);
    }
  };

  const selectedDateStr = toDateString(selectedDay);
  const selectedTasks = tasks.filter(task => task.date === selectedDateStr);

  const handleTemplateClick = (template) => {
    const dateStr = toDateString(selectedDay);
    setTasks([...tasks, {
      id: Date.now(),
      date: dateStr,
      title: template.title,
      icon: template.icon
    }]);
  };

  return (
    <div className="calendar-container">
      {/* Calendar Header */}
      <div className="calendar-header">
        <button className="nav-btn" onClick={() => changeMonth(-1)}>
          <FaChevronLeft />
        </button>
        <div className="month-year">
          <h2>{monthNames[currentDate.getMonth()].toUpperCase()} {currentDate.getFullYear()}</h2>
          <button className="dropdown-btn">▼</button>
        </div>
        <button className="nav-btn" onClick={() => changeMonth(1)}>
          <FaChevronRight />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-wrapper">
        <div className="calendar-grid">
          {/* Day names header */}
          <div className="calendar-header-row">
            {dayNames.map(day => (
              <div key={day} className="calendar-day-name">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          {days.map((day, index) => (
            <div
              key={index}
              className={`calendar-day ${day === null ? 'empty' : ''} ${selectedDay === day ? 'selected' : ''}`}
              onClick={() => day !== null && setSelectedDay(day)}
            >
              {day && (
                <>
                  <div className="day-number">{day}</div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Task List Below Calendar */}
        <div className="calendar-tasks-section">
          <div className="selected-date-title">
            {monthNames[currentDate.getMonth()]} {selectedDay}, {currentDate.getFullYear()}
          </div>
          {selectedTasks.length === 0 ? (
            <div className="selected-date-empty">No tasks for this date.</div>
          ) : (
            selectedTasks.map(task => (
              <div key={task.id} className="calendar-task-item">
                <div className="task-checkbox">
                  <input type="checkbox" />
                </div>
                <div className="task-content">
                  <span className="task-bullet">◼</span>
                  <span className="task-title">{task.title}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Task Templates Section */}
        <div className="calendar-templates-section">
          <div className="templates-header">
            <button className="template-header-btn" onClick={() => setShowTemplates(true)}>
              <span>📋 Task Templates</span>
              <span className="arrow-right">›</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button 
        className="fab"
        onClick={() => setShowAddTaskForm(!showAddTaskForm)}
      >
        <FaPlus />
      </button>

      {showAddTaskForm && (
        <div className="add-task-modal">
          <form onSubmit={handleAddTask}>
            <input
              type="text"
              placeholder={`Add a task for ${monthNames[currentDate.getMonth()]} ${selectedDay}`}
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              autoFocus
            />
            <div className="modal-buttons">
              <button type="submit" className="btn-submit">Add</button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowAddTaskForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Task Template Modal */}
      {showTemplates && (
        <div className="template-modal-overlay" onClick={() => setShowTemplates(false)}>
          <div className="template-modal" onClick={(e) => e.stopPropagation()}>
            <div className="template-modal-header">
              <button className="back-btn" onClick={() => setShowTemplates(false)}>‹</button>
              <h2>Task Template</h2>
              <div></div>
            </div>
            
            <div className="template-modal-content">
              <div className="template-category-section">
                <div className="template-category-title">Health</div>
                {healthTemplates.map((template, index) => (
                  <div 
                    key={index} 
                    className="template-list-item"
                    onClick={() => {
                      handleTemplateClick(template);
                      setShowTemplates(false);
                    }}
                  >
                    <span className="template-list-icon">{template.icon}</span>
                    <span className="template-list-text">{template.title}</span>
                    {template.popular && <span className="popular-badge">🔥</span>}
                    {template.isNew && <span className="new-badge">NEW</span>}
                    <span className="arrow-right">›</span>
                  </div>
                ))}
              </div>

              <div className="template-category-section">
                <div className="template-category-title">Life</div>
                {lifeTemplates.map((template, index) => (
                  <div 
                    key={index} 
                    className="template-list-item"
                    onClick={() => {
                      handleTemplateClick(template);
                      setShowTemplates(false);
                    }}
                  >
                    <span className="template-list-icon">{template.icon}</span>
                    <span className="template-list-text">{template.title}</span>
                    {template.popular && <span className="popular-badge">🔥</span>}
                    {template.isNew && <span className="new-badge">NEW</span>}
                    <span className="arrow-right">›</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Calendar;
