import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { CheckCircle2, Clock, BookOpen, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { tasks, quizHistory, notes } = useData();

  const completedTasks = tasks.filter(t => t.completed).length;
  const pendingTasks = tasks.length - completedTasks;
  
  const chartData = [
    { name: 'Completed', value: completedTasks },
    { name: 'Pending', value: pendingTasks },
  ];
  const COLORS = ['#4f46e5', '#e2e8f0'];

  const recentQuizzes = quizHistory.slice(0, 3);
  const averageScore = quizHistory.length > 0 
    ? Math.round(quizHistory.reduce((acc, curr) => acc + (curr.score / curr.total) * 100, 0) / quizHistory.length)
    : 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Welcome back, {user?.name.split(' ')[0]}!</h1>
        <p className="text-slate-500 mt-1">Here's your study overview for today.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Tasks Pending</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">{pendingTasks}</h3>
            </div>
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-500">
            {completedTasks} tasks completed
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Avg. Quiz Score</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">{averageScore}%</h3>
            </div>
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-500">
            Based on {quizHistory.length} quizzes
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Notes</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">{notes.length}</h3>
            </div>
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <BookOpen size={20} />
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-500">
            Across {user?.subjects.length} subjects
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Overview Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Task Progress</h2>
          <div className="h-64 w-full">
            {tasks.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                No tasks yet
              </div>
            )}
          </div>
          <Link to="/tasks" className="mt-4 text-center text-sm font-medium text-indigo-600 hover:text-indigo-700">
            Manage Tasks &rarr;
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Recent Quiz Results</h2>
          <div className="space-y-4">
            {recentQuizzes.length > 0 ? (
              recentQuizzes.map((quiz) => (
                <div key={quiz.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div>
                    <h4 className="font-medium text-slate-900">{quiz.topic}</h4>
                    <p className="text-xs text-slate-500">{quiz.subject} • {new Date(quiz.date).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    (quiz.score / quiz.total) >= 0.7 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {quiz.score}/{quiz.total}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">
                <AlertCircle className="mx-auto mb-2 opacity-50" />
                <p>No quizzes taken yet.</p>
                <Link to="/quiz" className="text-indigo-600 text-sm mt-2 block">Take a quiz</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;