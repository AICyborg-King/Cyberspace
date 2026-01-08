import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Task, Subject } from '../types';
import { Plus, Trash2, Calendar, CheckCircle, Circle, Bell, BellRing } from 'lucide-react';

const Tasks: React.FC = () => {
  const { tasks, addTask, toggleTask, deleteTask } = useData();
  const [newTask, setNewTask] = useState<Partial<Task>>({ subject: Subject.MATH });
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    'Notification' in window && Notification.permission === 'granted'
  );

  // Helper: Get YYYY-MM-DD for tomorrow
  const getTomorrowString = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const checkUpcomingDeadlines = (currentTasks: Task[]) => {
    if (Notification.permission !== 'granted') return;

    const tomorrowStr = getTomorrowString();
    
    // Find tasks due tomorrow that are not completed
    const dueTomorrow = currentTasks.filter(t => !t.completed && t.dueDate === tomorrowStr);
    
    if (dueTomorrow.length > 0) {
        // We use a flag in sessionStorage to prevent spamming the user on every page reload
        const hasNotified = sessionStorage.getItem(`notified_${tomorrowStr}`);
        if (!hasNotified) {
            const body = dueTomorrow.length === 1 
                ? `Don't forget: "${dueTomorrow[0].title}" is due tomorrow!`
                : `You have ${dueTomorrow.length} tasks due tomorrow. Check your planner.`;
            
            new Notification('Study Reminder', { body });
            sessionStorage.setItem(`notified_${tomorrowStr}`, 'true');
        }
    }
  };

  // Check for reminders on mount
  useEffect(() => {
    if (notificationsEnabled) {
        checkUpcomingDeadlines(tasks);
    }
  }, [notificationsEnabled]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Notifications are not supported by your browser.');
      return;
    }
    
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === 'granted');
    
    if (permission === 'granted') {
      new Notification('Notifications Enabled', { 
        body: 'We will verify your tasks and remind you 1 day before they are due!' 
      });
      checkUpcomingDeadlines(tasks);
    }
  };

  const handleAdd = () => {
    if (!newTask.title || !newTask.dueDate) return;
    
    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      subject: newTask.subject || Subject.GENERAL,
      dueDate: newTask.dueDate,
      completed: false,
    };
    
    addTask(task);

    // Immediate check if the new task is due tomorrow
    if (notificationsEnabled && task.dueDate === getTomorrowString()) {
         new Notification('Reminder Scheduled', { 
            body: `We'll make sure you remember ${task.title} is due tomorrow!` 
         });
    }

    setNewTask({ title: '', dueDate: '', subject: Subject.MATH });
  };

  const sortedTasks = [...tasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">Study Planner</h1>
            <p className="text-slate-500">Keep track of your homework and assignments.</p>
        </div>
        <button
            onClick={requestNotificationPermission}
            className={`p-3 rounded-xl transition-colors flex items-center gap-2 font-medium text-sm ${
                notificationsEnabled 
                ? 'bg-green-50 text-green-700 hover:bg-green-100' 
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
            title={notificationsEnabled ? "Notifications Active" : "Enable Reminders"}
        >
            {notificationsEnabled ? <BellRing size={20} /> : <Bell size={20} />}
            <span className="hidden md:inline">{notificationsEnabled ? 'Reminders On' : 'Enable Reminders'}</span>
        </button>
      </div>

      {/* Add Task Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Task Name</label>
            <input
              type="text"
              placeholder="e.g., Math Chapter 5 Exercises"
              value={newTask.title || ''}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="w-full md:w-48 space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Subject</label>
             <select
              value={newTask.subject}
              onChange={(e) => setNewTask({ ...newTask, subject: e.target.value as Subject })}
              className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white"
            >
              {Object.values(Subject).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="w-full md:w-48 space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Due Date</label>
            <input
              type="date"
              value={newTask.dueDate || ''}
              onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
              className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-600"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!newTask.title || !newTask.dueDate}
            className="w-full md:w-auto bg-indigo-600 text-white p-3.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {sortedTasks.length > 0 ? (
          sortedTasks.map((task) => (
            <div 
              key={task.id} 
              className={`flex items-center justify-between p-4 bg-white rounded-xl border ${task.completed ? 'border-slate-100 opacity-60' : 'border-slate-200'} transition-all`}
            >
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => toggleTask(task.id)}
                  className={`text-slate-400 hover:text-indigo-600 transition-colors ${task.completed ? 'text-indigo-500' : ''}`}
                >
                  {task.completed ? <CheckCircle size={24} /> : <Circle size={24} />}
                </button>
                <div>
                  <h3 className={`font-medium ${task.completed ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                    {task.title}
                  </h3>
                  <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">{task.subject}</span>
                    <span className={`flex items-center space-x-1 ${task.dueDate === getTomorrowString() && !task.completed ? 'text-orange-500 font-bold' : ''}`}>
                      <Calendar size={12} />
                      <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                      {task.dueDate === getTomorrowString() && !task.completed && (
                          <span className="ml-1 text-orange-600 text-[10px] uppercase border border-orange-200 bg-orange-50 px-1 rounded">Due Tomorrow</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => deleteTask(task.id)}
                className="text-slate-300 hover:text-red-500 p-2"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-400">No tasks planned. Enjoy your free time!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;