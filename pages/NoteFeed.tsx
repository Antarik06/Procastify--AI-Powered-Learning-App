import React, { useState, useEffect, useRef } from 'react';
import { Note, UserPreferences } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Share2,
  MessageCircle,
  MoreHorizontal,
  ArrowLeft,
  BookOpen,
  Clock,
  CheckCircle,
  Play,
  RefreshCw,
  Zap,
  Image as ImageIcon,
  Video,
  FileText,
  Headphones,
  Mic,
  Volume2
} from "lucide-react";
import { generateReels } from "../services/geminiService";

interface NoteFeedProps {
  notes: Note[];
  user: UserPreferences;
  onClose: () => void;
}

type ReelType = "text" | "image" | "video" | "audio";

interface ReelItem {
  id: string;
  noteId: string;
  noteTitle: string;
  content: string;
  type: ReelType;
  index: number; // 1-5
}

// --- REEL COMPONENTS ---

const TextReel = ({ reel }: { reel: ReelItem }) => (
  <div className="px-2 pt-6 pb-16">
    <p className="text-3xl md:text-4xl font-bold text-white leading-tight text-center drop-shadow-2xl font-serif">
      {reel.content}
    </p>
  </div>
);

const ImageReel = ({ reel }: { reel: ReelItem }) => (
  <div className="relative w-full h-full flex flex-col">
    {/* Mock Image Placeholder */}
    <div className="flex-1 bg-gradient-to-tr from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 opacity-30 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
      <ImageIcon size={64} className="text-white/20 mb-4" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-8 pt-24">
        <p className="text-xl md:text-2xl font-bold text-white leading-snug font-sans">
          {reel.content}
        </p>
      </div>
    </div>
  </div>
);


const VIDEO_BACKGROUNDS = [
  "https://cdn.pixabay.com/video/2019/04/20/22908-331661159_large.mp4", // Abstract geometric
  "https://cdn.pixabay.com/video/2020/04/18/36466-409949826_large.mp4", // Ink floating
  "https://cdn.pixabay.com/video/2020/11/01/54756-476685532_large.mp4", // Tech particles
  "https://cdn.pixabay.com/video/2023/10/19/185764-876113941_large.mp4", // Digital waves
];

const VideoReel = ({ reel, isActive }: { reel: ReelItem; isActive: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bgUrl, setBgUrl] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const words = reel.content.split(" ");

  // Select a random video based on reel content hash/index to keep it consistent
  useEffect(() => {
    const index = reel.content.length % VIDEO_BACKGROUNDS.length;
    setBgUrl(VIDEO_BACKGROUNDS[index]);
  }, [reel.id]);

  useEffect(() => {
    if (isActive) {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {
           // Autoplay policy might block, but we try
           setIsPlaying(true);
        });
        setIsPlaying(true);
      }
      setWordIndex(0);
    } else {
      if (videoRef.current) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isActive]);

  // Sync words with "video" time simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && wordIndex < words.length) {
      // Reveal words over 5 seconds roughly
      const speed = 4000 / words.length; 
      interval = setInterval(() => {
        setWordIndex(prev => prev + 1);
      }, speed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, wordIndex, words.length]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="relative w-full h-full bg-black flex flex-col justify-center items-center overflow-hidden">
      {/* Real Video Background */}
      <video
        ref={videoRef}
        src={bgUrl}
        className="absolute inset-0 w-full h-full object-cover opacity-60"
        loop
        playsInline
        muted // Muted for autoplay
      />
      
      {/* Dark Overlay for Readability */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
      
      <div className="z-10 relative px-8 w-full max-w-lg">
         {/* Kinetic Typography Container */}
         <div className="min-h-[200px] flex flex-wrap content-center justify-center gap-x-3 gap-y-2">
            {words.map((word, i) => (
                <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                    animate={{ 
                        opacity: i <= wordIndex ? 1 : 0.1, 
                        y: i <= wordIndex ? 0 : 10,
                        scale: i === wordIndex ? 1.1 : 1,
                        color: i === wordIndex ? "#fbbf24" : "#ffffff", // Highlight current word
                        filter: i > wordIndex ? "blur(4px)" : "blur(0px)" 
                    }}
                    transition={{ duration: 0.3 }}
                    className="text-3xl md:text-4xl font-black font-sans tracking-tight drop-shadow-lg"
                >
                    {word}
                </motion.span>
            ))}
         </div>
      </div>

      {/* Controls */}
      <div className="absolute inset-0 z-20 flex items-center justify-center" onClick={togglePlay}>
         {/* Invisible click layer, but show play button if paused */}
         {!isPlaying && (
            <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20">
                <Play size={40} className="text-white fill-white ml-2" />
            </div>
         )}
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-6 left-6 right-6 h-1.5 bg-white/20 rounded-full overflow-hidden z-30">
         <motion.div
           className="h-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]"
           initial={{ width: "0%" }}
           animate={{ width: isPlaying ? "100%" : `${(wordIndex / words.length) * 100}%` }}
           transition={{ duration: isPlaying ? 5 : 0, ease: "linear" }}
         />
      </div>
      
      <div className="absolute bottom-10 right-6 z-30 text-white/80 text-xs font-bold bg-black/50 px-2 py-1 rounded border border-white/10 uppercase">
        AI Generated Video
      </div>
  </div>
  );
}; // End VideoReel

const AudioReel = ({ reel, isActive }: { reel: ReelItem; isActive: boolean }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  
  useEffect(() => {
    // Clean up any existing speech when switching reels
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    
    // Auto-play when active
    if (isActive) {
      const timer = setTimeout(() => handlePlay(), 500);
      return () => clearTimeout(timer);
    }
  }, [isActive, reel.id]);

  const handlePlay = () => {
    window.speechSynthesis.cancel(); // Stop any previous
    
    const utterance = new SpeechSynthesisUtterance(reel.content);
    utterance.rate = 1.0;
    utterance.volume = 1;
    
    // Attempt to pick a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes("Google") || v.name.includes("English United States")) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onend = () => setIsPlaying(false);
    utterance.onstart = () => setIsPlaying(true);
    
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  const handleToggle = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      handlePlay();
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-center items-center bg-gray-900 overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/40 to-black z-0"></div>
      
      {/* Audio Visualizer Waves (CSS Animation) */}
      <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-30 z-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="w-2 bg-purple-500/50 rounded-full"
            animate={isPlaying ? { 
              height: [20, Math.random() * 120 + 20, 20] 
            } : { height: 20 }}
            transition={{ 
              duration: 0.4 + Math.random() * 0.3, 
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.05
            }}
          />
        ))}
      </div>

      <div className="z-10 bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl w-full max-w-sm flex flex-col items-center gap-6 shadow-2xl">
        <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30 relative">
          <Headphones size={48} className="text-white relative z-10" />
          {isPlaying && (
            <div className="absolute inset-0 rounded-full border border-white/30 animate-ping opacity-50"></div>
          )}
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-white">Audio Insight</h3>
          <p className="text-gray-400 text-sm">Listen to key takeaways</p>
        </div>

        <div className="w-full bg-white/10 h-16 rounded-xl flex items-center justify-center p-4 overflow-hidden relative">
             <div className="flex items-center gap-1 w-full h-8 justify-center">
                 {[...Array(24)].map((_, i) => (
                    <motion.div 
                        key={i}
                        className="w-1.5 bg-gradient-to-t from-purple-500 to-blue-400 rounded-full"
                        animate={isPlaying ? { height: [4, Math.random() * 24 + 4, 4] } : { height: 4 }}
                        transition={{ duration: 0.2, repeat: Infinity, delay: i * 0.03 }}
                    />
                 ))}
             </div>
        </div>
        
        <div className="flex items-center gap-6 w-full justify-center">
             <button className="text-gray-400 hover:text-white transition-colors" title="Volume"><Volume2 size={20} /></button>
             
             <button 
                onClick={handleToggle}
                className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-black shadow-xl shadow-purple-500/20"
             >
                {isPlaying ? (
                    <div className="flex gap-1.5 h-6 items-center justify-center">
                        <div className="w-1.5 h-full bg-black rounded-full animate-pulse"></div>
                        <div className="w-1.5 h-full bg-black rounded-full animate-pulse delay-75"></div>
                    </div>
                ) : (
                    <Play size={28} fill="currentColor" className="ml-1" />
                )}
             </button>
             
             <span className="text-xs text-gray-400 font-mono w-10 text-right">{isPlaying ? "Active" : "Paused"}</span>
        </div>

        <div className="bg-black/40 p-4 rounded-xl w-full border border-white/5 max-h-32 overflow-y-auto custom-scrollbar">
            <p className="text-sm text-gray-300 italic text-center leading-relaxed">"{reel.content}"</p>
        </div>
      </div>
    </div>
  );
};
  
// --- SIMPLIFIED CARD FOR REELS ---
const ReelCard = ({
  reel,
  isActive,
}: {
  reel: ReelItem;
  isActive: boolean;
}) => {
  return (
    <div className="h-full w-full flex items-center justify-center snap-start relative bg-black overflow-hidden">
      {/* Background Gradient Mesh - distinct for learning mode (Generic base) */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1e1e24] to-[#0f0f12] z-0"></div>

      {reel.type === "text" && (
        <div className="absolute inset-0 opacity-20 z-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
      )}

      <div
        className={`w-full h-full max-w-md relative flex flex-col z-10 transition-all duration-700 ${isActive ? "opacity-100 scale-100" : "opacity-40 scale-95 blur-sm"}`}
      >
        {/* Minimal Header */}
        <div className="pt-6 text-center px-6 z-20">
          <span className="inline-block py-1 px-3 rounded-full bg-black/40 border border-white/10 text-xs font-bold text-gray-300 uppercase tracking-widest backdrop-blur-md">
            {reel.noteTitle} • {reel.index}/5
          </span>
        </div>

        {/* Content Body based on Type */}
        <div className="flex-1 w-full flex flex-col justify-center relative">
            {reel.type === 'text' && <TextReel reel={reel} />}
            {reel.type === 'image' && <ImageReel reel={reel} />}
            {reel.type === 'video' && <VideoReel reel={reel} isActive={isActive} />}
            {reel.type === 'audio' && <AudioReel reel={reel} isActive={isActive} />}
        </div>

        {/* Footer hint */}
        <div className="absolute bottom-12 left-0 right-0 text-center animate-bounce z-20 pointer-events-none">
          <p className="text-xs text-white/50 font-medium">
            Swipe for next insight
          </p>
        </div>
      </div>
    </div>
  );
};

const NoteFeed: React.FC<NoteFeedProps> = ({ notes, user, onClose }) => {
  const [view, setView] = useState<"selection" | "loading" | "feed">(
    "selection",
  );
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<ReelType>("text");
  const [reels, setReels] = useState<ReelItem[]>([]);

    // For Feed Scrolling
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const handleScroll = () => {
        if (containerRef.current) {
            const index = Math.round(containerRef.current.scrollTop / containerRef.current.clientHeight);
            setActiveIndex(index);
        }
    };

    const handleGenerate = async () => {
        if (selectedNoteIds.length === 0) return;
        setView('loading');

        const generatedReels: ReelItem[] = [];

        // Process in parallel
        await Promise.all(selectedNoteIds.map(async (id) => {
            const note = notes.find(n => n.id === id);
            if (!note) return;

            // Extract text from note
            let textContext = note.elements
                .filter(e => e.type === 'text')
                .map(e => e.content)
                .join('\n');

            // If empty text, try blocks
            if (!textContext && note.document?.blocks) {
                textContext = note.document.blocks.map(b => b.content).join('\n');
            }

            if (!textContext || textContext.length < 50) return; // Skip empty notes

            // Call Service
            const points = await generateReels(textContext);

            // Map to Reel Items
            points.forEach((point, idx) => {
                generatedReels.push({
                    id: `${note.id}-reel-${idx}`,
                    noteId: note.id,
                    noteTitle: note.title,
                    content: point,
                    type: selectedFormat, // Use selected format
                    index: idx + 1
                });
            });
        }));

        // Shuffle safely (keeping chunks of same note might be better or global shuffle? 
        // User said "1 note -> 5 reels". Usually sequential per note to tell a story is better, 
        // OR interleave them. Let's interleave for a "Feed" feel if multiple notes selected.)
        // Fisher-Yates shuffle
        for (let i = generatedReels.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [generatedReels[i], generatedReels[j]] = [generatedReels[j], generatedReels[i]];
        }

        setReels(generatedReels);
        setView('feed');
    };


    // --- VIEW: SELECTION ---
    if (view === 'selection') {
        return (
            <div className="p-8 max-w-7xl mx-auto h-full flex flex-col animate-in fade-in">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-discord-accent rounded-xl flex items-center justify-center shadow-lg shadow-discord-accent/20">
                            <Play className="text-white" size={24} fill="currentColor" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-white">Learning Feed</h2>
                            <p className="text-discord-textMuted text-sm">Select notes to generate your study reels.</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT COLUMN: Note Selection (Vertical) */}
                    <div className="lg:col-span-2 flex flex-col min-h-0 bg-discord-panel/50 rounded-2xl border border-white/5 p-6">
                        
                        {/* Format Selection Helper */}
                        <div className="mb-6 flex items-center gap-4 bg-black/20 p-2 rounded-xl">
                            <span className="text-xs font-bold text-discord-textMuted uppercase ml-2">Format:</span>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setSelectedFormat('text')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${selectedFormat === 'text' ? 'bg-discord-accent text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                >
                                    <FileText size={16} /> Text
                                </button>
                                <button 
                                    onClick={() => setSelectedFormat('image')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${selectedFormat === 'image' ? 'bg-pink-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                >
                                    <ImageIcon size={16} /> Image
                                </button>
                                <button 
                                    onClick={() => setSelectedFormat('video')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${selectedFormat === 'video' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                >
                                    <Video size={16} /> Video
                                </button>
                                <button 
                                    onClick={() => setSelectedFormat('audio')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${selectedFormat === 'audio' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                >
                                    <Mic size={16} /> Audio
                                </button>
                            </div>
                        </div>

                        <h3 className="text-sm font-bold text-discord-textMuted uppercase mb-4 flex items-center gap-2">
                            <BookOpen size={16} /> Available Notes
                        </h3>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar mb-6">
                            {notes.map(note => (
                                <div
                                    key={note.id}
                                    onClick={() => setSelectedNoteIds(prev => prev.includes(note.id) ? prev.filter(id => id !== note.id) : [...prev, note.id])}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between group
                                    ${selectedNoteIds.includes(note.id)
                                            ? 'bg-discord-accent/10 border-discord-accent text-white shadow-md'
                                            : 'bg-discord-bg border-white/5 text-discord-textMuted hover:bg-[#2b2d31] hover:text-white'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors shrink-0
                                            ${selectedNoteIds.includes(note.id) ? 'bg-discord-accent border-discord-accent' : 'border-white/20 group-hover:border-white/40'}`}>
                                            {selectedNoteIds.includes(note.id) && <CheckCircle size={14} className="text-white" />}
                                        </div>
                                        <div className="min-w-0">
                                            <span className="font-bold text-sm block mb-1 truncate">{note.title}</span>
                                            <span className="text-xs text-discord-textMuted/70 flex items-center gap-1.5">
                                                <span className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] truncate max-w-[80px]">{note.folder}</span>
                                                <span className="shrink-0">•</span>
                                                <span className="shrink-0">{new Date(note.lastModified).toLocaleDateString()}</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {notes.length === 0 && (
                                <div className="text-center py-10 border-2 border-dashed border-white/5 rounded-xl">
                                    <p className="text-discord-textMuted">No notes found. Create some notes first!</p>
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <button
                                onClick={handleGenerate}
                                disabled={selectedNoteIds.length === 0}
                                className="w-full sm:w-auto px-8 bg-discord-green hover:bg-green-600 text-white py-3 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 shadow-lg hover:shadow-green-500/20"
                            >
                                Generate Feed <Play size={20} fill="currentColor" />
                            </button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Info Panel */}
                    <div className="flex flex-col gap-6">
                        <div className="bg-gradient-to-br from-[#2b2d31] to-[#1e1f22] p-8 rounded-2xl border border-white/10 relative overflow-hidden group">
                            {/* Decorative Background Elements */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-discord-accent/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -ml-5 -mb-5"></div>

                            <div className="relative z-10">
                                <span className="inline-block py-1 px-3 rounded-full bg-discord-accent/20 border border-discord-accent/30 text-discord-accent text-xs font-bold uppercase tracking-wider mb-4">
                                    Format: {selectedFormat.toUpperCase()}
                                </span>

                                <h3 className="text-2xl font-bold text-white mb-3">
                                    {selectedFormat === 'text' && "Card-based Learning"}
                                    {selectedFormat === 'image' && "Visual Flashcards"}
                                    {selectedFormat === 'video' && "Video Summaries"}
                                    {selectedFormat === 'audio' && "Audio Insights"}
                                </h3>
                                <p className="text-discord-textMuted text-sm leading-relaxed mb-6">
                                    {selectedFormat === 'text' && "Classic text-based cards for focused reading and quick absorbtion of facts."}
                                    {selectedFormat === 'image' && "Visual representations of concepts to help visual learners retain information better."}
                                    {selectedFormat === 'video' && "Dynamic video-style playback with scripted narration for an immersive experience."}
                                    {selectedFormat === 'audio' && "Listen to key summaries while you commute or relax. Hands-free learning."}
                                </p>

                                <div className="space-y-3">
                                    <div className={`flex items-center gap-3 text-sm transition-colors ${selectedFormat === 'audio' ? 'text-white' : 'text-gray-400'}`}>
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                            <Mic size={14} className="text-green-400" fill="currentColor" />
                                        </div>
                                        <span>Audio Reels</span>
                                    </div>
                                    <div className={`flex items-center gap-3 text-sm transition-colors ${selectedFormat === 'video' ? 'text-white' : 'text-gray-400'}`}>
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                            <Play size={14} className="text-purple-400" fill="currentColor" />
                                        </div>
                                        <span>AI Video Summaries</span>
                                    </div>
                                    <div className={`flex items-center gap-3 text-sm transition-colors ${selectedFormat === 'image' ? 'text-white' : 'text-gray-400'}`}>
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                            <ImageIcon size={14} className="text-yellow-400" />
                                        </div>
                                        <span>Visual Learning</span>
                                    </div>
                                    <div className={`flex items-center gap-3 text-sm transition-colors ${selectedFormat === 'text' ? 'text-white' : 'text-gray-400'}`}>
                                       <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                            <FileText size={14} className="text-blue-400" />
                                        </div>
                                        <span>Text Cards</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-discord-panel p-6 rounded-2xl border border-white/5 flex items-center gap-4 opacity-70">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                <Clock size={20} className="text-discord-textMuted" />
                            </div>
                            <div>
                                <p className="text-white font-bold text-sm">Study Streak</p>
                                <p className="text-xs text-discord-textMuted">Keep generating reels to maintain momentum!</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        )
    }

    // --- VIEW: LOADING ---
    if (view === 'loading') {
        return (
            <div className="fixed inset-0 z-[100] bg-[#111214] flex flex-col items-center justify-center text-white space-y-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-discord-accent blur-xl opacity-20 animate-pulse"></div>
                    <RefreshCw size={64} className="text-discord-accent animate-spin relative z-10" />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Curating your Feed...</h2>
                    <p className="text-discord-textMuted">AI is slicing your notes into bite-sized reels.</p>
                </div>
            </div>
        );
    }

    // --- VIEW: FEED ---
    return (
        <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col">
            <div className="absolute top-4 left-4 z-50 mix-blend-difference">
                <button onClick={() => setView('selection')} className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all backdrop-blur-md border border-white/10">
                    <ArrowLeft size={24} />
                </button>
            </div>

            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar"
                style={{ height: '100vh' }}
            >
                {reels.length > 0 ? (
                    reels.map((reel, index) => (
                        <div key={reel.id} className="h-full w-full snap-start">
                            <ReelCard reel={reel} isActive={index === activeIndex} />
                        </div>
                    ))
                ) : (
                    <div className="h-full w-full flex items-center justify-center">
                        <p className="text-gray-500">No content could be generated from these notes.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NoteFeed;
