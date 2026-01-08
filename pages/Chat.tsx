import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon, Save, Mic, MicOff, Trash2, Paperclip, X, Check, Sparkles, AlertCircle } from 'lucide-react';
import { createChatSession } from '../services/gemini';
import { ChatMessage, Subject, Note } from '../types';
import { useData } from '../context/DataContext';

const Chat: React.FC = () => {
  const { chatHistory, updateChatHistory, clearChatHistory, addNote } = useData();
  
  // Initialize from context if available, otherwise default
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (chatHistory && chatHistory.length > 0) {
      return chatHistory;
    }
    return [{ id: '1', role: 'model', text: 'Hi! I\'m EduFly, your AI study buddy. Which subject do you need help with today?', timestamp: Date.now() }];
  });

  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [chatSession, setChatSession] = useState<any>(null);
  const [savedMsgIds, setSavedMsgIds] = useState<Set<string>>(new Set());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Chat Session with history
    if (!chatSession) {
      try {
        // Pass existing messages to restore context for the AI
        setChatSession(createChatSession(messages));
      } catch (e) {
        console.error("Failed to initialize chat session", e);
      }
    }
  }, [chatSession]); // messages dependency intentionally omitted to avoid recreation loop

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    updateChatHistory(messages);
  }, [messages, isLoading, updateChatHistory]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;

    // Ensure session exists
    let currentSession = chatSession;
    if (!currentSession) {
      try {
        currentSession = createChatSession(messages);
        setChatSession(currentSession);
      } catch (error) {
         console.error("Failed to recover session:", error);
         setMessages(prev => [...prev, { 
             id: Date.now().toString(), 
             role: 'model', 
             text: "I couldn't initialize the connection. Please check your network or API Key configuration.", 
             timestamp: Date.now() 
         }]);
         return;
      }
    }

    // Default text for image-only messages to ensure context
    const displayText = input.trim() || (selectedImage ? 'Image uploaded for analysis' : '');

    const userMsg: ChatMessage = { 
      id: Date.now().toString(), 
      role: 'user', 
      text: displayText, 
      image: selectedImage || undefined,
      timestamp: Date.now() 
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    const tempImage = selectedImage; // Store temp to send to API
    handleRemoveImage(); // Clear UI preview and file input
    setIsLoading(true);

    try {
      // Prepare content for API
      // If image exists, format it for the SDK
      let messageContent: any = input;
      
      if (tempImage) {
        const matches = tempImage.match(/^data:(.+);base64,(.+)$/);
        if (matches && matches.length === 3) {
            // If user didn't type anything, guide the AI to analyze the image
            const promptText = input.trim() === '' ? 'Please analyze this image. If it contains a problem, solve it step-by-step.' : input;

            messageContent = [
                { text: promptText },
                { inlineData: { mimeType: matches[1], data: matches[2] } }
            ];
        }
      }

      // Send message to Gemini
      const result = await currentSession.sendMessageStream({ message: messageContent });
      
      let fullText = '';
      const modelMsgId = (Date.now() + 1).toString();
      let isFirstChunk = true;

      for await (const chunk of result) {
        const chunkText = chunk.text || '';
        fullText += chunkText;

        if (isFirstChunk) {
            setIsLoading(false); 
            setMessages(prev => [...prev, { id: modelMsgId, role: 'model', text: fullText, timestamp: Date.now() }]);
            isFirstChunk = false;
        } else {
            setMessages(prev => 
                prev.map(msg => msg.id === modelMsgId ? { ...msg, text: fullText } : msg)
            );
        }
      }
      
      if (isFirstChunk) {
         // Fallback if no chunks received - treat as error
         throw new Error("No response generated");
      }

    } catch (error: any) {
      console.error("Chat Error", error);
      setIsLoading(false);
      // Reset chat session to ensure clean state for next attempt
      setChatSession(null);
      
      let errorMsg = "Sorry, I'm having trouble connecting right now. Please try again.";
      if (error.message && error.message.includes('API_KEY')) {
          errorMsg = "Configuration Error: API Key is missing or invalid.";
      }
      
      setMessages(prev => [...prev, { 
          id: Date.now().toString(), 
          role: 'model', 
          text: errorMsg, 
          timestamp: Date.now() 
      }]);
    }
  };

  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear your chat history?")) {
      clearChatHistory();
      const defaultMsg: ChatMessage = { id: Date.now().toString(), role: 'model', text: 'Hi! I\'m EduFly, your AI study buddy. Which subject do you need help with today?', timestamp: Date.now() };
      setMessages([defaultMsg]);
      setChatSession(null); // Force recreation
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice input.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev.trim() ? `${prev.trim()} ${transcript}` : transcript);
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleSaveToNotes = (msgId: string) => {
    const msgIndex = messages.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;
    
    const targetMsg = messages[msgIndex];
    let content = targetMsg.text;
    let title = `Study Chat - ${new Date().toLocaleDateString()}`;

    // Improve context: Try to get the user prompt that triggered this response
    if (msgIndex > 0) {
        const prevMsg = messages[msgIndex - 1];
        if (prevMsg.role === 'user') {
            // Create a title from the user's question (truncated)
            title = `Q: ${prevMsg.text.substring(0, 40)}${prevMsg.text.length > 40 ? '...' : ''}`;
            // Format content to include Question and Answer
            content = `**Question:**\n${prevMsg.text}\n\n**Answer:**\n${targetMsg.text}`;
        }
    }

    const note: Note = {
      id: Date.now().toString(),
      title: title,
      content: content,
      subject: Subject.GENERAL, 
      updatedAt: new Date().toISOString(),
    };
    addNote(note);
    
    // Show visual feedback
    setSavedMsgIds(prev => {
        const newSet = new Set(prev);
        newSet.add(msgId);
        return newSet;
    });

    // Reset feedback after 2 seconds
    setTimeout(() => {
        setSavedMsgIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(msgId);
            return newSet;
        });
    }, 2000);
  };

  return (
    <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
        <div className="flex items-center space-x-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">AI Study Tutor</h2>
            <p className="text-xs text-slate-500">Always here to help</p>
          </div>
        </div>
        <button 
          onClick={handleClearChat}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Clear Conversation"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
            <div className={`flex max-w-[85%] md:max-w-[70%] ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'} space-x-3`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-slate-200' : 'bg-indigo-100'}`}>
                {msg.role === 'user' ? <UserIcon size={16} className="text-slate-600" /> : <Bot size={16} className="text-indigo-600" />}
              </div>
              <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-slate-900 text-white rounded-tr-none' 
                    : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none'
                } ${msg.role === 'model' && (msg.text.startsWith('Sorry,') || msg.text.includes('Error')) ? 'bg-red-50 border-red-100 text-red-600' : ''}`}>
                  {msg.image && (
                    <img src={msg.image} alt="User upload" className="max-w-full h-auto rounded-lg mb-2 border border-white/20" />
                  )}
                  {msg.text}
                  {msg.role === 'model' && msg.text && !(msg.text.startsWith('Sorry,') || msg.text.includes('Error')) && (
                    <button 
                      onClick={() => handleSaveToNotes(msg.id)}
                      disabled={savedMsgIds.has(msg.id)}
                      className={`flex items-center space-x-1.5 mt-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        savedMsgIds.has(msg.id)
                            ? 'bg-green-100 text-green-700 cursor-default'
                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                      }`}
                    >
                      {savedMsgIds.has(msg.id) ? <Check size={14} /> : <Save size={14} />}
                      <span>{savedMsgIds.has(msg.id) ? 'Saved' : 'Save to Notes'}</span>
                    </button>
                  )}
                  {msg.role === 'model' && (msg.text.startsWith('Sorry,') || msg.text.includes('Error')) && (
                     <div className="flex items-center space-x-1 mt-2 text-xs font-semibold">
                        <AlertCircle size={14} />
                        <span>Connection Issue</span>
                     </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1.5 px-1 font-medium select-none">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-fade-in-up">
            <div className="flex items-end space-x-3">
               <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Bot size={16} className="text-indigo-600" />
               </div>
               <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl rounded-tl-none">
                  <div className="flex space-x-1.5 h-3 items-center">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                  </div>
               </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-100">
        {selectedImage && (
          <div className="mb-3 relative inline-block">
             <img src={selectedImage} alt="Preview" className="h-20 w-auto rounded-lg border border-slate-200 shadow-sm" />
             <button 
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                title="Remove image"
             >
               <X size={12} />
             </button>
          </div>
        )}
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isListening ? "Listening..." : "Type a question..."}
              className={`w-full pl-10 pr-12 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
                isListening ? 'border-red-400 bg-red-50 placeholder-red-400' : 'border-slate-200'
              }`}
              disabled={isLoading}
            />
            {/* Image Upload Button */}
             <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleImageSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
              title="Attach Image"
            >
              <Paperclip size={18} />
            </button>

            <button
              onClick={toggleListening}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
                isListening ? 'text-red-500 hover:bg-red-100 animate-pulse' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
              }`}
              title="Voice Input"
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          </div>
          
          <button
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && !selectedImage)}
            className={`p-3 rounded-xl text-white transition-all flex items-center gap-2 ${
                selectedImage ? 'bg-indigo-600 hover:bg-indigo-700 w-auto px-4' : 'bg-indigo-600 hover:bg-indigo-700 aspect-square'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={selectedImage ? "Analyze Image" : "Send Message"}
          >
             {selectedImage ? (
                <>
                    <Sparkles size={20} />
                    <span className="font-medium whitespace-nowrap">Analyze</span>
                </>
             ) : (
                <Send size={20} />
             )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;