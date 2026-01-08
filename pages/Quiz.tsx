import React, { useState } from 'react';
import { Subject, QuizQuestion } from '../types';
import { generateQuizQuestions } from '../services/gemini';
import { useData } from '../context/DataContext';
import { BrainCircuit, CheckCircle, XCircle, ArrowRight, Loader2, RefreshCw } from 'lucide-react';

const Quiz: React.FC = () => {
  const { saveQuizResult } = useData();
  const [config, setConfig] = useState({ subject: Subject.MATH, topic: '', difficulty: 'High School' });
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'active' | 'finished'>('idle');
  const [score, setScore] = useState(0);

  const startQuiz = async () => {
    if (!config.topic) return;
    setStatus('loading');
    try {
      const qs = await generateQuizQuestions(config.subject, config.topic, config.difficulty);
      if (qs.length > 0) {
        setQuestions(qs);
        setStatus('active');
        setCurrentQIndex(0);
        setUserAnswers([]);
        setScore(0);
      } else {
        alert("Failed to generate quiz. Please try a different topic.");
        setStatus('idle');
      }
    } catch (e) {
      console.error(e);
      setStatus('idle');
    }
  };

  const handleAnswer = (optionIndex: number) => {
    const currentQ = questions[currentQIndex];
    const isCorrect = optionIndex === currentQ.correctAnswerIndex;
    if (isCorrect) setScore(s => s + 1);
    
    const newAnswers = [...userAnswers, optionIndex];
    setUserAnswers(newAnswers);

    if (currentQIndex < questions.length - 1) {
      setTimeout(() => setCurrentQIndex(i => i + 1), 1000); // Small delay to show feedback if wanted later
    } else {
      setTimeout(() => finishQuiz(isCorrect ? score + 1 : score), 500);
    }
  };

  const finishQuiz = (finalScore: number) => {
    setStatus('finished');
    saveQuizResult({
      id: Date.now().toString(),
      subject: config.subject,
      topic: config.topic,
      score: finalScore,
      total: questions.length,
      date: new Date().toISOString()
    });
  };

  const reset = () => {
    setStatus('idle');
    setConfig({ ...config, topic: '' });
  };

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Loader2 size={48} className="animate-spin text-indigo-600" />
        <p className="text-slate-500 font-medium">Generating a unique quiz for you...</p>
      </div>
    );
  }

  if (status === 'finished') {
    return (
      <div className="max-w-xl mx-auto text-center space-y-6 pt-12">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl font-bold">{Math.round((score / questions.length) * 100)}%</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Quiz Completed!</h2>
          <p className="text-slate-500 mb-6">You scored {score} out of {questions.length} on {config.topic}.</p>
          
          <div className="space-y-3">
             <button onClick={reset} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
               <RefreshCw size={18} /> Take Another Quiz
             </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'active') {
    const question = questions[currentQIndex];
    const progress = ((currentQIndex) / questions.length) * 100;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>
        
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Question {currentQIndex + 1} of {questions.length}</span>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold">{config.subject}</span>
          </div>
          
          <h3 className="text-xl font-bold text-slate-900 mb-8 leading-relaxed">{question.question}</h3>
          
          <div className="space-y-3">
            {question.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                className="w-full p-4 text-left border-2 border-slate-100 rounded-xl hover:border-indigo-600 hover:bg-indigo-50 transition-all font-medium text-slate-700"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white border border-slate-300 flex items-center justify-center text-sm font-bold text-slate-500">
                    {String.fromCharCode(65 + idx)}
                  </div>
                  {option}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
          <BrainCircuit size={32} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Practice Mode</h1>
        <p className="text-slate-500">Generate unlimited practice questions powered by AI.</p>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Subject</label>
          <select 
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={config.subject}
            onChange={(e) => setConfig({ ...config, subject: e.target.value as Subject })}
          >
            {Object.values(Subject).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Specific Topic</label>
          <input 
            type="text" 
            placeholder="e.g., Photosynthesis, Calculus Derivatives, WW2" 
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={config.topic}
            onChange={(e) => setConfig({ ...config, topic: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Difficulty Level</label>
          <select 
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={config.difficulty}
            onChange={(e) => setConfig({ ...config, difficulty: e.target.value })}
          >
            <option value="Middle School">Middle School</option>
            <option value="High School">High School</option>
            <option value="University">University</option>
          </select>
        </div>

        <button 
          onClick={startQuiz}
          disabled={!config.topic}
          className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Start Quiz</span>
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default Quiz;