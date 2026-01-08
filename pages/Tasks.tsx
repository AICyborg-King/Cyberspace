import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Task, Subject } from '../types';
import { Plus, Trash2, Calendar, CheckCircle, Circle } from 'lucide-react';

const Tasks: React.FC = () => {
  const { tasks, addTask, toggleTask, deleteTask } = useData();
  const [newTask, setNewTask] = useState<Partial<Task>>({ subject: Subject.MATH });

  const handleAdd = () => {
    if (!newTask.title || !newTask.dueDate) return;
    
    addTask({
      id: Date.now().toString(),
      title: newTask.title,
      subject: newTask.subject || Subject.GENERAL,
      dueDate: newTask.dueDate,
      completed: false,
    });
    setNewTask({ title: '', dueDate: '', subject: Subject.MATH });
  };

  const sortedTasks = [...tasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">Study Planner</h1>
        <p className="text-slate-500">Keep track of your homework and assignments.</p>
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
                    <span className="flex items-center space-x-1">
                      <Calendar size={12} />
                      <span>{new Date(task.dueDate).toLocaleDateString()}</span>
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