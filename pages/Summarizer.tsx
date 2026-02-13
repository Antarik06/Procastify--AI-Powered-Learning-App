import React, { useState, useRef, useEffect } from 'react';
import { summarizeContent, generateFlashcards, generateSpeech, playAudioBlob } from '../services/geminiService';
import { Summary, Flashcard, Note, Attachment, CustomMode } from '../types';
import { Sparkles, Link as LinkIcon, Mic, FileUp, Volume2, Plus, X, Paperclip, CheckCircle, FilePlus, BookOpen, Edit3, Trash2, Save } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { StorageService } from '../services/storageService';

interface SummarizerProps {
    onSave: (summary: Summary) => void;
    notes: Note[];
    onAddToNote: (noteId: string | null, summary: Summary, flashcards: Flashcard[]) => void;
}

const Summarizer: React.FC<SummarizerProps> = ({ onSave, notes, onAddToNote }) => {

    const [textContext, setTextContext] = useState('');
    const [attachments, setAttachments] = useState<Attachment[]>([]);


    const [mode, setMode] = useState<string>('short');
    const [showCustomModeInput, setShowCustomModeInput] = useState(false);
    const [customModeText, setCustomModeText] = useState('');
    const [customModePrompt, setCustomModePrompt] = useState('');
    const [customModes, setCustomModes] = useState<CustomMode[]>([]);
    const [showCustomModeModal, setShowCustomModeModal] = useState(false);
    const [editingCustomMode, setEditingCustomMode] = useState<CustomMode | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState('');
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [extractionWarnings, setExtractionWarnings] = useState<string[]>([]);


    const [showSaveModal, setShowSaveModal] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);


    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkError, setLinkError] = useState('');
    const [showAudioRecorder, setShowAudioRecorder] = useState(false);


    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<any>(null);

    // Load custom modes on mount
    useEffect(() => {
        loadCustomModes();
    }, []);

    const loadCustomModes = async () => {
        try {
            const modes = await StorageService.getCustomModes();
            setCustomModes(modes);
        } catch (error) {
            console.error('Error loading custom modes:', error);
        }
    };

    const saveCustomMode = async () => {
        if (!customModeText.trim() || !customModePrompt.trim()) return;
        
        try {
            const newMode: CustomMode = {
                id: editingCustomMode?.id || Date.now().toString(),
                userId: StorageService.currentUserId || '',
                name: customModeText.trim(),
                systemPrompt: customModePrompt.trim(),
                createdAt: editingCustomMode?.createdAt || Date.now()
            };

            await StorageService.saveCustomMode(newMode);
            await loadCustomModes();
            
            // Set the new mode as active
            setMode(newMode.name);
            
            // Reset form
            setCustomModeText('');
            setCustomModePrompt('');
            setShowCustomModeModal(false);
            setEditingCustomMode(null);
        } catch (error) {
            console.error('Error saving custom mode:', error);
            // Show user-friendly error message
            alert('Failed to save custom mode. Please try again.');
        }
    };

    const editCustomMode = (customMode: CustomMode) => {
        setEditingCustomMode(customMode);
        setCustomModeText(customMode.name);
        setCustomModePrompt(customMode.systemPrompt);
        setShowCustomModeModal(true);
    };

    const deleteCustomMode = async (modeId: string) => {
        try {
            await StorageService.deleteCustomMode(modeId);
            await loadCustomModes();
            
            // If the deleted mode was active, switch to short mode
            const deletedMode = customModes.find(m => m.id === modeId);
            if (deletedMode && mode === deletedMode.name) {
                setMode('short');
            }
        } catch (error) {
            console.error('Error deleting custom mode:', error);
            alert('Failed to delete custom mode. Please try again.');
        }
    };

    const getCustomPromptForMode = (modeName: string): string | undefined => {
        const customMode = customModes.find(m => m.name === modeName);
        return customMode?.systemPrompt;
    };


    const addAttachment = (att: Attachment) => {
        setAttachments(prev => {
            const updated = [...prev, att];
            return updated;
        });
    };


    const removeAttachment = (id: string) => {
        setAttachments(prev => prev.filter(a => a.id !== id));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'pdf') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    const base64 = ev.target.result as string;
                    addAttachment({
                        id: Date.now().toString(),
                        type,
                        content: base64.split(',')[1], // Strip prefix for API (ensure service handles it)
                        mimeType: file.type,
                        name: file.name
                    });
                }
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    // Validate URL format
    const validateUrl = (url: string): { isValid: boolean; error: string } => {
        if (!url || !url.trim()) {
            return { isValid: false, error: 'Please enter a URL' };
        }

        try {
            const urlObj = new URL(url.trim());
            if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
                return { isValid: false, error: 'URL must start with http:// or https://' };
            }
            return { isValid: true, error: '' };
        } catch (e) {
            return { isValid: false, error: 'Please enter a valid URL (e.g., https://example.com)' };
        }
    };

    const isYouTubeUrl = (url: string): boolean => {
        return url.includes('youtube.com') || url.includes('youtu.be');
    };

    const handleLinkUrlChange = (url: string) => {
        setLinkUrl(url);
        if (linkError) setLinkError('');
    };

    const addLink = () => {
        const validation = validateUrl(linkUrl);
        if (!validation.isValid) {
            setLinkError(validation.error);
            return;
        }
        addAttachment({
            id: Date.now().toString(),
            type: 'url',
            content: linkUrl.trim(),
            name: linkUrl.trim()
        });
        setLinkUrl('');
        setLinkError('');
        setShowLinkInput(false);
    };



    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    const base64 = reader.result as string;
                    addAttachment({
                        id: Date.now().toString(),
                        type: 'audio',
                        content: base64.split(',')[1],
                        mimeType: 'audio/webm',
                        name: `Voice Note ${new Date().toLocaleTimeString()}`
                    });
                };
                setShowAudioRecorder(false);
                setRecordingDuration(0);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingDuration(0);
            timerRef.current = setInterval(() => setRecordingDuration(s => s + 1), 1000);

        } catch (err) {
            console.error("Error accessing microphone", err);
            alert("Could not access microphone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            clearInterval(timerRef.current);
        }
    };



    const handleSummarize = async () => {
        if (!textContext && attachments.length === 0) return;
        setLoading(true);
        setResult('');
        setFlashcards([]);
        setExtractionWarnings([]);

        try {
            // Get custom prompt if using a custom mode
            const customPrompt = getCustomPromptForMode(mode);
            
            // summarizeContent in geminiService handles the normalization via extractionService
            const summaryText = await summarizeContent(textContext, attachments, mode, customPrompt);
            setResult(summaryText);

            const newSummary: Summary = {
                id: Date.now().toString(),
                userId: '',
                originalSource: attachments.length > 0 ? `Multiple sources` : 'Text input',
                summaryText,
                type: 'mixed',
                mode,
                createdAt: Date.now()
            };
            onSave(newSummary);
        } catch (error) {
            console.error('Summarization failed:', error);
            setResult('Error generating summary. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateFlashcards = async () => {
        if (!result) return;
        setLoading(true);
        const cards = await generateFlashcards(result);
        setFlashcards(cards);
        setLoading(false);
    };

    const handleTTS = async () => {
        if (!result) return;
        const audioData = await generateSpeech(result);
        if (audioData) playAudioBlob(audioData);
    };

    const handleSaveToNote = (noteId: string | null) => {
        const currentSummary: Summary = {
            id: Date.now().toString(),
            userId: '',
            originalSource: 'Summarizer Export',
            summaryText: result,
            type: 'mixed',
            mode,
            createdAt: Date.now()
        };

        onAddToNote(noteId, currentSummary, flashcards);

        setSaveSuccess(true);
        setTimeout(() => {
            setSaveSuccess(false);
            setShowSaveModal(false);
        }, 2000);
    };

    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };



    const renderAttachments = () => (
        <div className="flex flex-wrap gap-2 mb-4">
            {attachments.map(att => (
                <div key={att.id} className="flex items-center gap-2 bg-app-bg border border-app-border rounded-lg pl-3 pr-2 py-2 animate-in fade-in zoom-in-95">
                    <span className="text-app-accent">
                        {att.type === 'pdf' && <FileUp size={16} />}
                        {/* {att.type === 'image' && <ImageIcon size={16} /> } */}
                        {att.type === 'audio' && <Mic size={16} />}
                        {att.type === 'url' && <LinkIcon size={16} />}
                    </span>
                    <div className="flex flex-col max-w-[150px]">
                        <span className="text-xs font-bold uppercase text-app-textMuted leading-none mb-0.5">{att.type} added</span>
                        <span className="text-sm text-app-text truncate font-medium">{att.name || 'Untitled'}</span>
                    </div>
                    <button onClick={() => removeAttachment(att.id)} className="p-1 hover:bg-white/10 rounded-full text-app-textMuted hover:text-app-text transition-colors">
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );

    return (
        <div className="p-8 h-full flex flex-col relative">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-app-text flex items-center gap-3">
                        <Sparkles className="text-app-accent" /> Summarizer
                    </h1>
                    <p className="text-app-textMuted mt-1">
                        Enter text to summarize. Choose your summary style below.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0 flex-1">

                <div className="flex flex-col gap-2 overflow-y-auto">


                    <div>
                        <div className="bg-app-panel p-1 rounded-xl border border-app-border flex gap-1 mb-2 flex-wrap">
                            {(['short', 'detailed', 'eli5', 'exam'] as const).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center justify-center min-w-16
                                ${mode === m
                                            ? 'bg-app-accent text-app-text shadow-md'
                                            : 'text-app-textMuted hover:bg-app-hover'}`}
                                >
                                    {m === 'eli5' ? 'ELI5' : m}
                                </button>
                            ))}

                            {/* Custom modes */}
                            {customModes.map((customMode) => (
                                <div key={customMode.id} className="relative flex group">
                                    <button
                                        onClick={() => setMode(customMode.name)}
                                        className={`px-3 py-2 rounded-lg text-xs font-bold tracking-wide transition-all flex items-center justify-center
                                    ${mode === customMode.name
                                                ? 'bg-purple-600 text-app-text shadow-md'
                                                : 'text-app-textMuted hover:bg-app-hover'}`}
                                        title={customMode.systemPrompt}
                                    >
                                        {customMode.name}
                                    </button>
                                    <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <button
                                            onClick={() => editCustomMode(customMode)}
                                            className="w-4 h-4 bg-blue-500 hover:bg-blue-600 text-app-text rounded-full flex items-center justify-center text-xs"
                                            title="Edit"
                                        >
                                            <Edit3 size={10} />
                                        </button>
                                        <button
                                            onClick={() => deleteCustomMode(customMode.id)}
                                            className="w-4 h-4 bg-red-500 hover:bg-red-600 text-app-text rounded-full flex items-center justify-center text-xs"
                                            title="Delete"
                                        >
                                            <Trash2 size={10} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <div className="relative flex">
                                <button
                                    onClick={() => {
                                        setShowCustomModeModal(true);
                                        setCustomModeText('');
                                        setCustomModePrompt('');
                                        setEditingCustomMode(null);
                                    }}
                                    className="w-10 rounded-lg text-xs font-bold transition-all flex items-center justify-center flex-none text-app-textMuted hover:bg-app-hover"
                                    title="Create new custom mode"
                                >
                                    +
                                </button>

                                {showCustomModeInput && (
                                    <div className="absolute right-0 top-full mt-2 bg-app-panel border border-app-border rounded-lg shadow-2xl p-3 w-80 z-50 origin-top-right animate-in fade-in zoom-in-95">
                                        <div className="mb-3">
                                            <label className="text-xs font-bold text-app-textMuted uppercase mb-1 block">Quick Create Mode</label>
                                            <input
                                                type="text"
                                                value={customModeText}
                                                onChange={(e) => setCustomModeText(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && customModeText.trim()) {
                                                        setShowCustomModeModal(true);
                                                        setShowCustomModeInput(false);
                                                    } else if (e.key === 'Escape') {
                                                        setShowCustomModeInput(false);
                                                        setCustomModeText('');
                                                    }
                                                }}
                                                placeholder="e.g., creative, technical, casual..."
                                                className="w-full bg-app-bg border border-app-border rounded px-3 py-2 text-sm text-app-text placeholder-discord-textMuted/50 focus:outline-none focus:border-app-accent transition-colors"
                                                autoFocus
                                            />
                                        </div>
                                        <button
                                            onClick={() => {
                                                setShowCustomModeModal(true);
                                                setShowCustomModeInput(false);
                                            }}
                                            className="w-full px-3 py-2 bg-app-accent hover:bg-app-accentHover text-app-text text-xs font-medium rounded transition-colors"
                                        >
                                            Define Prompt
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-2 py-1">
                            <span className="text-xs font-bold text-app-textMuted uppercase">Current Mode:</span>
                            <span className={`px-2 py-1 border rounded text-xs font-bold capitalize ${customModes.find(m => m.name === mode) 
                                    ? 'bg-purple-600/20 border-purple-600/50 text-purple-400'
                                    : 'bg-app-accent/20 border-app-accent/50 text-app-accent'
                                }`}>
                                {mode === 'eli5' ? 'ELI5' : mode}
                            </span>
                        </div>
                    </div>


                    <div className="bg-app-panel p-6 rounded-xl border border-app-border flex-1 flex flex-col min-h-[400px]">



                        {renderAttachments()}

                        <textarea
                            className="flex-1 bg-transparent resize-none focus:outline-none text-discord-text placeholder-discord-textMuted/40 font-mono text-sm leading-relaxed min-h-[200px]"
                            placeholder="Paste your content or type your notes here to summarize..."
                            value={textContext}
                            onChange={(e) => setTextContext(e.target.value)}
                        />


                        <div className="mt-4 pt-4 border-t border-app-border flex items-center justify-between gap-4">
                            {/* Multimodal Inputs - Bottom Left */}
                            <div className="flex items-center gap-2">
                                <button onClick={() => document.getElementById('pdf-upload')?.click()} className="p-2 bg-app-bg hover:bg-app-hover border border-app-border rounded-lg text-app-textMuted hover:text-app-text transition-colors" title="Upload PDF">
                                    <FileUp size={20} />
                                </button>
                                <input type="file" id="pdf-upload" className="hidden" accept=".pdf" onChange={(e) => handleFileUpload(e, 'pdf')} />

                                {/* <button onClick={() => document.getElementById('img-upload')?.click()} className="p-2 bg-app-bg hover:bg-app-hover border border-app-border rounded-lg text-app-textMuted hover:text-app-text transition-colors" title="Upload Image">
                                    <ImageIcon size={20} />
                                </button>
                                <input type="file" id="img-upload" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} /> */}

                                <div className="relative">
                                    <button onClick={() => setShowLinkInput(!showLinkInput)} className={`p-2 border border-app-border rounded-lg text-app-textMuted hover:text-app-text transition-colors ${showLinkInput ? 'bg-app-accent text-app-text' : 'bg-app-bg hover:bg-app-hover'}`} title="Add Link">
                                        <LinkIcon size={20} />
                                    </button>

                                    {/* Link Input Popover */}
                                    {showLinkInput && (
                                        <div className="absolute bottom-full left-0 mb-2 bg-app-panel border border-app-border rounded-lg shadow-2xl p-3 w-80 animate-in fade-in zoom-in-95 z-10">
                                            <div className="flex items-center gap-2 mb-2">
                                                <LinkIcon size={16} className="text-app-accent" />
                                                <span className="text-xs font-bold uppercase text-app-textMuted">Add Link</span>
                                            </div>
                                            <input
                                                type="text"
                                                value={linkUrl}
                                                onChange={(e) => handleLinkUrlChange(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        addLink();
                                                    } else if (e.key === 'Escape') {
                                                        setShowLinkInput(false);
                                                        setLinkUrl('');
                                                        setLinkError('');
                                                    }
                                                }}
                                                placeholder="Paste website URL (https://...)..."
                                                className={`w-full bg-app-bg border rounded px-3 py-2 text-sm text-app-text placeholder-discord-textMuted/50 focus:outline-none transition-colors ${linkError ? 'border-red-500 focus:border-red-500' : 'border-app-border focus:border-app-accent'}`}
                                                autoFocus
                                            />
                                            {linkError && (
                                                <div className="mt-2 text-xs text-red-400 flex items-start gap-1">
                                                    <span className="mt-0.5">⚠️</span>
                                                    <span>{linkError}</span>
                                                </div>
                                            )}
                                            {!linkError && linkUrl && isYouTubeUrl(linkUrl) && (
                                                <div className="mt-2 text-xs text-yellow-400/80 flex items-start gap-1">
                                                    <span className="mt-0.5">ℹ️</span>
                                                    <span>Note: YouTube URLs have limited support due to browser restrictions</span>
                                                </div>
                                            )}
                                            <div className="flex justify-end gap-2 mt-3">
                                                <button
                                                    onClick={() => {
                                                        setShowLinkInput(false);
                                                        setLinkUrl('');
                                                        setLinkError('');
                                                    }}
                                                    className="px-3 py-1.5 text-xs font-medium text-app-textMuted hover:text-app-text transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={addLink}
                                                    disabled={!linkUrl.trim() || !!linkError}
                                                    className="px-3 py-1.5 bg-app-accent hover:bg-app-accentHover text-app-text text-xs font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/*<button onClick={isRecording ? stopRecording : startRecording} className={`p-2 border border-app-border rounded-lg transition-colors ${isRecording ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse' : 'bg-app-bg hover:bg-app-hover text-app-textMuted hover:text-app-text'}`} title="Record Audio">
                                    {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
                                </button>
                                {isRecording && <span className="text-xs font-mono text-red-400 min-w-[30px]">{formatTime(recordingDuration)}</span>}*/}
                            </div>

                            <button
                                onClick={handleSummarize}
                                disabled={loading || (!textContext.trim() && attachments.length === 0)}
                                className="bg-app-accent hover:bg-app-accentHover text-app-text px-6 py-2 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                            >
                                {loading ? <Sparkles size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                Summarize
                            </button>
                        </div>
                    </div>
                </div>



                <div className="flex flex-col gap-4 overflow-hidden h-full">
                    <div className="bg-app-panel p-6 rounded-xl border border-app-border flex-1 flex flex-col overflow-hidden relative">
                        {result ? (
                            <>
                                <div className="flex justify-between items-center mb-4 pb-4 border-b border-app-border">
                                    <h3 className="font-bold text-app-text">Summary Result</h3>
                                    <div className="flex gap-2">
                                        <button onClick={handleTTS} className="p-2 hover:bg-white/10 rounded-full text-app-textMuted hover:text-app-text" title="Read Aloud">
                                            <Volume2 size={18} />
                                        </button>
                                        <button onClick={handleGenerateFlashcards} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-xs font-medium text-app-text transition-colors">
                                            + Flashcards
                                        </button>
                                        <button
                                            onClick={() => setShowSaveModal(true)}
                                            className="p-2 bg-discord-green hover:bg-green-600 text-app-text rounded-full shadow-lg transition-colors"
                                            title="Add to Notes"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto pr-2 prose prose-invert prose-sm max-w-none">
                                    <ReactMarkdown>{result}</ReactMarkdown>

                                    {flashcards.length > 0 && (
                                        <div className="mt-8 pt-8 border-t border-app-border">
                                            <h4 className="text-app-text font-bold mb-4">Learning Chunks (Key Concepts)</h4>
                                            <div className="grid grid-cols-1 gap-3">
                                                {flashcards.map((card, i) => (
                                                    <div key={i} className="bg-app-bg p-4 rounded-lg border border-app-border hover:border-app-accent/50 transition-colors">
                                                        <div className="flex items-start gap-3">
                                                            <div className="mt-1">
                                                                <div className="w-6 h-6 rounded-full bg-app-accent/20 flex items-center justify-center text-app-accent text-xs font-bold">
                                                                    {i + 1}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <h5 className="text-app-text font-bold text-sm mb-1">{card.front}</h5>
                                                                <p className="text-app-textMuted text-sm">{card.back}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-app-textMuted/40">
                                <Paperclip size={48} className="mb-4 opacity-50" />
                                <p className="text-lg font-medium">Ready to Summarize</p>
                                <p className="text-sm max-w-xs text-center">Paste or type your content on the left, then click Summarize.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div >


            {showSaveModal && (
                <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-app-panel p-6 rounded-2xl w-full max-w-md border border-app-border shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-app-text">Add to Notes</h3>
                            <button onClick={() => setShowSaveModal(false)} className="text-app-textMuted hover:text-app-text"><X size={24} /></button>
                        </div>

                        {saveSuccess ? (
                            <div className="flex flex-col items-center py-10">
                                <CheckCircle size={48} className="text-green-500 mb-4 animate-bounce" />
                                <p className="text-app-text font-medium">Added to notes successfully!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <button
                                    onClick={() => handleSaveToNote(null)}
                                    className="w-full bg-app-accent hover:bg-app-accentHover p-4 rounded-xl flex items-center gap-4 transition-all group text-left"
                                >
                                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-app-text">
                                        <FilePlus size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-app-text">Create New Note</h4>
                                        <p className="text-xs text-app-text/70">Start a fresh canvas with this summary.</p>
                                    </div>
                                </button>

                                <div className="text-xs font-bold text-app-textMuted uppercase mt-4 mb-2">Or add to existing</div>

                                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                                    {notes.map(note => (
                                        <button
                                            key={note.id}
                                            onClick={() => handleSaveToNote(note.id)}
                                            className="w-full bg-app-bg hover:bg-app-hover p-3 rounded-xl border border-app-border flex items-center gap-3 transition-colors text-left group"
                                        >
                                            <BookOpen size={16} className="text-app-textMuted group-hover:text-app-accent" />
                                            <span className="text-discord-text group-hover:text-app-text truncate">{note.title}</span>
                                        </button>
                                    ))}
                                    {notes.length === 0 && <p className="text-app-textMuted text-sm text-center py-4">No existing notes found.</p>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Custom Mode Modal */}
            {showCustomModeModal && (
                <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-app-panel p-6 rounded-2xl w-full max-w-lg border border-app-border shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-app-text">
                                {editingCustomMode ? 'Edit Custom Mode' : 'Create Custom Mode'}
                            </h3>
                            <button 
                                onClick={() => {
                                    setShowCustomModeModal(false);
                                    setCustomModeText('');
                                    setCustomModePrompt('');
                                    setEditingCustomMode(null);
                                }} 
                                className="text-app-textMuted hover:text-app-text"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-app-text mb-2">Mode Name</label>
                                <input
                                    type="text"
                                    value={customModeText}
                                    onChange={(e) => setCustomModeText(e.target.value)}
                                    placeholder="e.g., Technical, Creative, Research Notes"
                                    className="w-full bg-app-bg border border-app-border rounded-lg px-4 py-3 text-app-text placeholder-discord-textMuted/50 focus:outline-none focus:border-app-accent transition-colors"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-app-text mb-2">System Prompt</label>
                                <textarea
                                    value={customModePrompt}
                                    onChange={(e) => setCustomModePrompt(e.target.value)}
                                    placeholder="Define how the AI should summarize content in this mode. For example: 'Summarize with a focus on technical concepts and include code examples when relevant.'"
                                    className="w-full h-32 bg-app-bg border border-app-border rounded-lg px-4 py-3 text-app-text placeholder-discord-textMuted/50 focus:outline-none focus:border-app-accent transition-colors resize-none"
                                />
                            </div>

                            <div className="bg-app-bg/50 rounded-lg p-4 border border-app-border">
                                <h4 className="text-sm font-medium text-app-text mb-2">Examples:</h4>
                                <div className="space-y-2 text-xs text-app-textMuted">
                                    <div><strong>Technical:</strong> "Focus on technical concepts, include definitions, and use bullet points for clarity."</div>
                                    <div><strong>Creative:</strong> "Write in an engaging, narrative style with creative analogies and examples."</div>
                                    <div><strong>Research:</strong> "Organize information hierarchically with key findings, methodologies, and conclusions."</div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowCustomModeModal(false);
                                        setCustomModeText('');
                                        setCustomModePrompt('');
                                        setEditingCustomMode(null);
                                    }}
                                    className="px-4 py-2 text-app-textMuted hover:text-app-text transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveCustomMode}
                                    disabled={!customModeText.trim() || !customModePrompt.trim()}
                                    className="px-6 py-2 bg-app-accent hover:bg-app-accentHover text-app-text rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <Save size={16} />
                                    {editingCustomMode ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default Summarizer;