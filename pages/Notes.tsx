import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Note, Subject } from '../types';
import { Plus, Search, Trash2, Edit3, X, Sparkles, Image as ImageIcon, Check } from 'lucide-react';
import { summarizeNotes } from '../services/gemini';

const Notes: React.FC = () => {
  const { notes, addNote, updateNote, deleteNote } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentNote, setCurrentNote] = useState<Partial<Note>>({});
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [lastAutoSaved, setLastAutoSaved] = useState<Date | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refs to access latest state inside interval without resetting it
  const stateRef = useRef({ currentNote, notes, addNote, updateNote });

  useEffect(() => {
    stateRef.current = { currentNote, notes, addNote, updateNote };
  }, [currentNote, notes, addNote, updateNote]);

  // Auto-save Interval
  useEffect(() => {
    if (!isEditing) return;

    const interval = setInterval(() => {
      const { currentNote, notes, addNote, updateNote } = stateRef.current;

      if (!currentNote.title || !currentNote.content) return;

      let shouldSave = false;

      // Check if new note (no ID yet)
      if (!currentNote.id) {
        shouldSave = true;
      } else {
        // Check if modified compared to stored note
        const original = notes.find(n => n.id === currentNote.id);
        if (original) {
           if (original.title !== currentNote.title || 
               original.content !== currentNote.content ||
               original.subject !== currentNote.subject ||
               original.image !== currentNote.image) {
              shouldSave = true;
           }
        } else {
            // Edge case: Note has ID but not found (deleted externally?), save to restore/create
            shouldSave = true;
        }
      }

      if (shouldSave) {
        const now = new Date().toISOString();
        if (currentNote.id) {
           const updated = { ...currentNote, updatedAt: now } as Note;
           updateNote(updated);
           setLastAutoSaved(new Date());
        } else {
           const newId = Date.now().toString();
           const newNote = {
              ...currentNote,
              id: newId,
              subject: currentNote.subject || Subject.GENERAL,
              updatedAt: now,
           } as Note;
           addNote(newNote);
           setCurrentNote(newNote); // Update local state so next save is an 'update'
           setLastAutoSaved(new Date());
        }
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isEditing]);

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = () => {
    if (!currentNote.title || !currentNote.content) return;

    if (currentNote.id) {
      updateNote({ ...currentNote, updatedAt: new Date().toISOString() } as Note);
    } else {
      addNote({
        id: Date.now().toString(),
        title: currentNote.title,
        content: currentNote.content,
        subject: currentNote.subject || Subject.GENERAL,
        updatedAt: new Date().toISOString(),
        image: currentNote.image
      } as Note);
    }
    setIsEditing(false);
    setCurrentNote({});
    setLastAutoSaved(null);
  };

  const handleSummarize = async () => {
    if (!currentNote.content) return;
    setIsSummarizing(true);
    try {
      const summary = await summarizeNotes(currentNote.content);
      setCurrentNote(prev => ({ ...prev, content: prev.content + '\n\n**AI Summary:**\n' + summary }));
    } catch (e) {
      alert("Failed to summarize");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
      }

      // Validate file size (1MB limit for localStorage performance)
      if (file.size > 1024 * 1024) { 
        alert('Image is too large. Please select an image under 1MB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentNote(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setCurrentNote(prev => ({ ...prev, image: undefined }));
    // Reset file input so checking the same file again works
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">My Notes</h1>
        <div className="flex gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search notes..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <button 
            onClick={() => { setCurrentNote({ subject: Subject.GENERAL }); setIsEditing(true); setLastAutoSaved(null); }}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={18} />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-800">{currentNote.id ? 'Edit Note' : 'Create Note'}</h2>
            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
              <X size={24} />
            </button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                type="text" 
                placeholder="Note Title"
                value={currentNote.title || ''}
                onChange={e => setCurrentNote({ ...currentNote, title: e.target.value })}
                className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
              />
              <select 
                value={currentNote.subject}
                onChange={e => setCurrentNote({ ...currentNote, subject: e.target.value as Subject })}
                className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white"
              >
                {Object.values(Subject).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Image Preview Area */}
            {currentNote.image && (
                <div className="relative w-full max-w-md h-48 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden group">
                    <img src={currentNote.image} alt="Note Attachment" className="w-full h-full object-contain bg-slate-100" />
                    <button 
                        onClick={removeImage}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Remove image"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className="relative">
                <textarea 
                  placeholder="Start typing your notes here..."
                  value={currentNote.content || ''}
                  onChange={e => setCurrentNote({ ...currentNote, content: e.target.value })}
                  className="w-full h-96 p-4 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                />
                <div className="absolute bottom-4 right-4 flex gap-2">
                     <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageSelect}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-100 transition-colors"
                    >
                        <ImageIcon size={14} />
                        {currentNote.image ? 'Change Image' : 'Add Image'}
                    </button>
                    <button
                        onClick={handleSummarize}
                        disabled={isSummarizing || !currentNote.content}
                        className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                    >
                        <Sparkles size={14} />
                        {isSummarizing ? 'Summarizing...' : 'AI Summarize'}
                    </button>
                </div>
            </div>
            <div className="flex justify-end pt-2 items-center">
              {lastAutoSaved && (
                <span className="text-xs text-slate-400 mr-4 flex items-center gap-1 animate-fade-in">
                    <Check size={12} />
                    Auto-saved {lastAutoSaved.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              )}
              <button 
                onClick={handleSave}
                disabled={!currentNote.title || !currentNote.content}
                className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.length > 0 ? (
            filteredNotes.map(note => (
              <div key={note.id} className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative flex flex-col h-full">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-md uppercase tracking-wide">
                    {note.subject}
                  </span>
                  <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setCurrentNote(note); setIsEditing(true); setLastAutoSaved(null); }} className="text-slate-400 hover:text-indigo-600">
                      <Edit3 size={18} />
                    </button>
                    <button onClick={() => deleteNote(note.id)} className="text-slate-400 hover:text-red-600">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                {note.image && (
                   <div className="mb-3 h-40 w-full bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
                       <img src={note.image} alt="Note attachment" className="w-full h-full object-cover" />
                   </div>
                )}
                <h3 className="text-lg font-bold text-slate-900 mb-2 truncate">{note.title}</h3>
                <p className="text-slate-500 text-sm line-clamp-4 leading-relaxed mb-auto">
                  {note.content}
                </p>
                <p className="text-xs text-slate-400 mt-4">
                  {new Date(note.updatedAt).toLocaleDateString()}
                </p>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
              <p className="text-slate-500">No notes found. Create one to get started!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Notes;