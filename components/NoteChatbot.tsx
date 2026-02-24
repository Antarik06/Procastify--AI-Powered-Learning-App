import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  BookOpen,
  ChevronDown,
  Sparkles,
  FileText,
  ExternalLink
} from 'lucide-react';
import { Note, ChatMessage, UserPreferences } from '../types';
import { 
  findRelevantNotes, 
  prepareNoteContext,
  extractNoteText 
} from '../services/noteChatbotService';
import { chatWithNoteContext } from '../services/geminiService';

interface NoteChatbotProps {
  notes: Note[];
  user: UserPreferences;
  onNavigateToNote?: (noteId: string) => void;
}

const NoteChatbot: React.FC<NoteChatbotProps> = ({ notes, user, onNavigateToNote }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [showNoteSelector, setShowNoteSelector] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Determine which notes to use as context
      let contextNotes: Note[];
      
      if (selectedNoteId) {
        // User selected a specific note - use only that
        const selectedNote = notes.find(n => n.id === selectedNoteId);
        contextNotes = selectedNote ? [selectedNote] : [];
      } else {
        // Find relevant notes based on the query
        contextNotes = findRelevantNotes(userMessage.content, notes, 5);
        
        // If no relevant notes found, use all notes (limited)
        if (contextNotes.length === 0 && notes.length > 0) {
          contextNotes = notes.slice(0, 5);
        }
      }

      // Prepare context
      const noteContexts = contextNotes.map(prepareNoteContext);

      // Call AI
      const response = await chatWithNoteContext(
        userMessage.content,
        noteContexts,
        selectedNoteId || undefined,
        user.id
      );

      // Map source note IDs to titles
      const sourceNotes = response.sourceNoteIds
        .map(id => {
          const note = notes.find(n => n.id === id);
          return note ? { id: note.id, title: note.title } : null;
        })
        .filter((n): n is { id: string; title: string } => n !== null);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.answer,
        sourceNotes,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectedNote = selectedNoteId ? notes.find(n => n.id === selectedNoteId) : null;

  // Get notes that have actual content
  const notesWithContent = notes.filter(n => extractNoteText(n).length > 0);

  return (
    <>
      {/* Chat Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-discord-accent to-purple-600 text-white shadow-lg shadow-discord-accent/30 flex items-center justify-center hover:scale-110 transition-transform ${isOpen ? 'hidden' : ''}`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        title="Chat with your notes"
      >
        <MessageCircle size={24} />
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full sm:w-96 bg-gradient-to-b from-[#1a1b1e] to-[#141517] border-l border-white/10 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 bg-[#111214]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-discord-accent to-purple-600 flex items-center justify-center">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Notes Assistant</h3>
                  <p className="text-xs text-discord-textMuted">Ask about your notes</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-discord-textMuted hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Note Selector */}
            <div className="px-4 py-3 border-b border-white/5">
              <div className="relative">
                <button
                  onClick={() => setShowNoteSelector(!showNoteSelector)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-discord-input border border-white/10 text-sm hover:border-discord-accent/50 transition-colors"
                >
                  <span className="flex items-center gap-2 text-discord-text truncate">
                    <BookOpen size={16} className="text-discord-accent flex-shrink-0" />
                    {selectedNote ? selectedNote.title : 'All Notes (Auto-detect)'}
                  </span>
                  <ChevronDown size={16} className={`text-discord-textMuted transition-transform ${showNoteSelector ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showNoteSelector && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-discord-panel border border-white/10 rounded-lg shadow-xl max-h-60 overflow-y-auto z-10"
                    >
                      <button
                        onClick={() => {
                          setSelectedNoteId(null);
                          setShowNoteSelector(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition-colors flex items-center gap-2 ${!selectedNoteId ? 'text-discord-accent bg-white/5' : 'text-discord-text'}`}
                      >
                        <Sparkles size={14} />
                        All Notes (Auto-detect relevant)
                      </button>
                      <div className="border-t border-white/5" />
                      {notesWithContent.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-discord-textMuted text-center">
                          No notes with content found
                        </div>
                      ) : (
                        notesWithContent.map(note => (
                          <button
                            key={note.id}
                            onClick={() => {
                              setSelectedNoteId(note.id);
                              setShowNoteSelector(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition-colors flex items-center gap-2 truncate ${selectedNoteId === note.id ? 'text-discord-accent bg-white/5' : 'text-discord-text'}`}
                          >
                            <FileText size={14} className="flex-shrink-0" />
                            <span className="truncate">{note.title}</span>
                          </button>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="w-16 h-16 rounded-full bg-discord-accent/20 flex items-center justify-center mb-4">
                    <MessageCircle size={32} className="text-discord-accent" />
                  </div>
                  <h4 className="text-white font-medium mb-2">Chat with Your Notes</h4>
                  <p className="text-discord-textMuted text-sm mb-4">
                    Ask questions about your notes. I'll find relevant information and cite my sources.
                  </p>
                  <div className="space-y-2 text-xs text-discord-textMuted">
                    <p>"Where did I learn about binary search?"</p>
                    <p>"Explain quicksort based on my notes"</p>
                    <p>"What did I write about React hooks?"</p>
                  </div>
                </div>
              )}

              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-discord-accent text-white rounded-br-sm'
                        : 'bg-discord-panel text-discord-text rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Source Notes */}
                    {message.sourceNotes && message.sourceNotes.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-white/10">
                        <p className="text-xs text-discord-textMuted mb-2">Sources:</p>
                        <div className="flex flex-wrap gap-1">
                          {message.sourceNotes.map(source => (
                            <button
                              key={source.id}
                              onClick={() => onNavigateToNote?.(source.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-xs text-discord-text transition-colors"
                            >
                              <FileText size={12} />
                              <span className="truncate max-w-[120px]">{source.title}</span>
                              <ExternalLink size={10} className="opacity-50" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-discord-panel rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex items-center gap-2 text-discord-textMuted">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-sm">Searching your notes...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-4 border-t border-white/10 bg-[#111214]/50">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your notes..."
                  className="flex-1 bg-discord-input border border-white/10 rounded-xl px-4 py-3 text-sm text-black placeholder-discord-textMuted focus:outline-none focus:border-discord-accent/50 transition-colors"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="p-3 rounded-xl bg-discord-accent text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-discord-accent/80 transition-colors"
                >
                  {isLoading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop for mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default NoteChatbot;
