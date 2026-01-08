export enum Subject {
  MATH = 'Mathematics',
  SCIENCE = 'Science',
  ENGLISH = 'English',
  HISTORY = 'History',
  CS = 'Computer Science',
  ART = 'Art',
  GENERAL = 'General'
}

export interface User {
  id: string;
  name: string;
  email: string;
  gradeLevel: string;
  subjects: Subject[];
  biometricsEnabled?: boolean;
}

export interface Task {
  id: string;
  title: string;
  subject: Subject;
  dueDate: string;
  completed: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  subject: Subject;
  updatedAt: string;
  image?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  image?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface QuizResult {
  id: string;
  subject: Subject;
  topic: string;
  score: number;
  total: number;
  date: string;
}