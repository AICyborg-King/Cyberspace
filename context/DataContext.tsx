import React, { createContext, useContext, useState, useEffect } from 'react';
import { Task, Note, QuizResult, ChatMessage } from '../types';

interface DataContextType {
  tasks: Task[];
  notes: Note[];
  quizHistory: QuizResult[];
  chatHistory: ChatMessage[];
  addTask: (task: Task) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  addNote: (note: Note) => void;
  updateNote: (note: Note) => void;
  deleteNote: (id: string) => void;
  saveQuizResult: (result: QuizResult) => void;
  updateChatHistory: (messages: ChatMessage[]) => void;
  clearChatHistory: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [quizHistory, setQuizHistory] = useState<QuizResult[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // Load data on mount
  useEffect(() => {
    const loadedTasks = localStorage.getItem('edufly_tasks');
    const loadedNotes = localStorage.getItem('edufly_notes');
    const loadedQuizzes = localStorage.getItem('edufly_quizzes');
    const loadedChat = localStorage.getItem('edufly_chat_history');

    if (loadedTasks) setTasks(JSON.parse(loadedTasks));
    if (loadedNotes) setNotes(JSON.parse(loadedNotes));
    if (loadedQuizzes) setQuizHistory(JSON.parse(loadedQuizzes));
    if (loadedChat) setChatHistory(JSON.parse(loadedChat));
  }, []);

  // Save data on change
  useEffect(() => { localStorage.setItem('edufly_tasks', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem('edufly_notes', JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem('edufly_quizzes', JSON.stringify(quizHistory)); }, [quizHistory]);
  useEffect(() => { localStorage.setItem('edufly_chat_history', JSON.stringify(chatHistory)); }, [chatHistory]);

  const addTask = (task: Task) => setTasks(prev => [...prev, task]);
  
  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => setTasks(prev => prev.filter(t => t.id !== id));

  const addNote = (note: Note) => setNotes(prev => [note, ...prev]);
  
  const updateNote = (note: Note) => {
    setNotes(prev => prev.map(n => n.id === note.id ? note : n));
  };

  const deleteNote = (id: string) => setNotes(prev => prev.filter(n => n.id !== id));

  const saveQuizResult = (result: QuizResult) => setQuizHistory(prev => [result, ...prev]);

  const updateChatHistory = (messages: ChatMessage[]) => setChatHistory(messages);
  const clearChatHistory = () => setChatHistory([]);

  return (
    <DataContext.Provider value={{ 
      tasks, notes, quizHistory, chatHistory,
      addTask, toggleTask, deleteTask, 
      addNote, updateNote, deleteNote,
      saveQuizResult, updateChatHistory, clearChatHistory
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};