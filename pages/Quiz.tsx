import { ActionFunction, LoaderFunction, redirect } from "react-router-dom"; // Just minimal dummy if needed, but keeping original imports
import React, { useState, useEffect } from 'react';
import { Note, Quiz, UserPreferences, UserStats, QuizReport, QuizModeType, AttemptedFillQuestion, AttemptedExplainQuestion } from '../types';
import { generateQuizFromNotes, generateTrueFalseQuiz, generateQuizReport, generateFillInTheBlanksQuiz, generateExplainQuiz } from '../services/geminiService';
import { StorageService } from '../services/storageService';
import { Play, Trophy, CheckCircle, XCircle, Zap, Target, BookOpen, AlertCircle, RefreshCw, Layers, Clock, ArrowRight, BrainCircuit, TrendingUp, Users, Loader2, MoreHorizontal } from 'lucide-react';
import SwipeQuiz from '../components/SwipeQuiz';
import FillInTheBlanksQuiz from '../components/FillInTheBlanksQuiz';
import ExplainAnswerQuiz from '../components/ExplainAnswerQuiz';
import ModeSelectionModal from '../components/ModeSelectionModal';
import MultiplayerWaitingRoom from '../components/MultiplayerWaitingRoom';
import MultiplayerLeaderboard from '../components/MultiplayerLeaderboard';
import { motion, AnimatePresence } from 'framer-motion';
import { DEFAULT_TIMER_CONFIG } from '../utils/quizUtils';

const QUESTION_TIMER = 30;

interface QuizProps {
    notes: Note[];
    user: UserPreferences;
    stats: UserStats;
    setStats: (stats: UserStats) => void;
}

const QuizPage: React.FC<QuizProps> = ({ notes, user, stats, setStats }) => {
    const [view, setView] = useState<'setup' | 'playing' | 'results' | 'waiting' | 'leaderboard'>('setup');
    const [mode, setMode] = useState<QuizModeType>('standard');
    const [showModeModal, setShowModeModal] = useState(false);
    const [quizMode, setQuizMode] = useState<'singleplayer' | 'multiplayer'>('singleplayer');
    const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [timerEnabled, setTimerEnabled] = useState(true);
    const [timerDuration, setTimerDuration] = useState(30);
    const [loading, setLoading] = useState(false);
    const [continuing, setContinuing] = useState(false);
    const [quizReport, setQuizReport] = useState<QuizReport | null>(null);
    const [generatingReport, setGeneratingReport] = useState(false);

    // Multiplayer state
    const [multiplayerSession, setMultiplayerSession] = useState<import('../types').MultiplayerQuizSession | null>(null);
    const [joinCode, setJoinCode] = useState('');
    const [joiningSession, setJoiningSession] = useState(false);
    const [leaderboard, setLeaderboard] = useState<import('../types').QuizLeaderboard | null>(null);


    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [timer, setTimer] = useState(QUESTION_TIMER);
    const [attemptedQuestions, setAttemptedQuestions] = useState<Array<{
        question: string;
        options: string[];
        userAnswer: number;
        correctAnswer: number;
        explanation: string;
        isCorrect: boolean;
        difficulty?: 'easy' | 'medium' | 'hard';
    }>>([]);

    // Swipe mode attempted questions
    interface AttemptedSwipeQuestion {
        question: string;
        userAnsweredTrue: boolean;
        correctAnswerIsTrue: boolean;
        isCorrect: boolean;
        explanation: string;
    }
    const [attemptedSwipeQuestions, setAttemptedSwipeQuestions] = useState<AttemptedSwipeQuestion[]>([]);
    
    // New modes attempted questions
    const [attemptedFillQuestions, setAttemptedFillQuestions] = useState<AttemptedFillQuestion[]>([]);
    const [attemptedExplainQuestions, setAttemptedExplainQuestions] = useState<AttemptedExplainQuestion[]>([]);

    // Update timer config when mode changes
    useEffect(() => {
        const config = DEFAULT_TIMER_CONFIG[mode];
        setTimerEnabled(config.enabled);
        setTimerDuration(config.duration);
    }, [mode]);

    // Timer Logic
    useEffect(() => {
        if (view === 'playing' && mode === 'standard' && !showAnalysis && timer > 0) {
            const interval = setInterval(() => {
                setTimer(t => t - 1);
            }, 1000);
            return () => clearInterval(interval);
        } else if (timer === 0 && !showAnalysis && view === 'playing' && mode === 'standard') {
            handleOptionSelect(-1); // Time's up
        }
    }, [timer, view, mode, showAnalysis]);

    const handleGenerate = async () => {
        if (selectedNoteIds.length === 0) return;
        setLoading(true);

        let aggregatedText = "";
        selectedNoteIds.forEach(id => {
            const note = notes.find(n => n.id === id);
            if (note) {
                const elements = note.canvas?.elements || note.elements || [];
                const blocks = note.document?.blocks || [];

                aggregatedText += `Source: ${note.title}\n`;

                // Extract text from canvas elements
                elements.forEach(el => {
                    if (el.content) aggregatedText += el.content + "\n";
                });

                // Extract text from document blocks
                blocks.forEach(block => {
                    if (block.content) {
                        aggregatedText += block.content + "\n";
                    }
                });
            }
        });

        if (aggregatedText.length < 50) {
            alert("The selected notes don't contain enough text content to generate a quiz.");
            setLoading(false);
            return;
        }

        let questions;
        if (mode === 'swipe') {
            questions = await generateTrueFalseQuiz(aggregatedText);
        } else if (mode === 'fillBlanks') {
            questions = await generateFillInTheBlanksQuiz(aggregatedText, difficulty);
        } else if (mode === 'explain') {
            questions = await generateExplainQuiz(aggregatedText, difficulty);
        } else {
            questions = await generateQuizFromNotes(aggregatedText, difficulty);
        }

        if (questions.length === 0) {
            alert("Failed to generate questions. Please try a different note or try again.");
            setLoading(false);
            return;
        }

        // Multiplayer mode
        if (quizMode === 'multiplayer') {
            const { FirebaseService } = await import('../services/firebaseService');
            const sessionId = `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const inviteCode = FirebaseService.generateQuizCode();

            const session: import('../types').MultiplayerQuizSession = {
                id: sessionId,
                hostId: user.id,
                hostName: user.name,
                inviteCode,
                title: 'Multiplayer Quiz',
                difficulty,
                mode,
                questions,
                participants: [{
                    id: user.id,
                    userId: user.id,
                    userName: user.name,
                    score: 0,
                    answers: [],
                    joinedAt: Date.now(),
                    isReady: true,
                }],
                status: 'waiting',
                createdAt: Date.now(),
            };

            await FirebaseService.createQuizSession(session);
            setMultiplayerSession(session);
            setLoading(false);
            setView('waiting');
            return;
        }

        // Singleplayer mode (existing logic)
        setQuiz({
            id: Date.now().toString(),
            userId: user.id,
            title: 'Generated Quiz',
            questions,
            highScore: 0
        });


        setCurrentQIndex(0);
        setScore(0);
        setStreak(0);
        setAttemptedQuestions([]);
        setAttemptedSwipeQuestions([]);
        setSelectedOption(null);
        setShowAnalysis(false);
        setTimer(QUESTION_TIMER);

        setLoading(false);
        setView('playing');
    };

    const handleJoinQuiz = async () => {
        if (!joinCode.trim()) {
            alert('Please enter a quiz code');
            return;
        }

        try {
            setJoiningSession(true);
            const { FirebaseService } = await import('../services/firebaseService');
            
            const session = await FirebaseService.getQuizSessionByCode(joinCode.trim().toUpperCase());
            if (!session) {
                alert('Invalid quiz code or quiz already started');
                setJoiningSession(false);
                return;
            }

            // Check if already joined
            if (session.participants.some(p => p.userId === user.id)) {
                alert('You have already joined this quiz');
                setMultiplayerSession(session);
                setView('waiting');
                setJoiningSession(false);
                return;
            }

            const participant: import('../types').QuizParticipant = {
                id: user.id,
                userId: user.id,
                userName: user.name,
                score: 0,
                answers: [],
                joinedAt: Date.now(),
                isReady: true,
            };

            await FirebaseService.joinQuizSession(session.id, participant);
            
            const updatedSession = await FirebaseService.getQuizSession(session.id);
            setMultiplayerSession(updatedSession);
            setView('waiting');
            setJoiningSession(false);
        } catch (error: any) {
            console.error('Error joining quiz:', error);
            alert(error.message || 'Failed to join quiz');
            setJoiningSession(false);
        }
    };

    const handleOptionSelect = async (idx: number) => {
        // Allow -1 for timeout
        if (selectedOption !== null || !quiz) return;

        setSelectedOption(idx);
        setShowAnalysis(true);

        const currentQuestion = quiz.questions[currentQIndex];
        const isCorrect = idx === currentQuestion.correctIndex;

        // Multiplayer mode - submit answer to Firebase
        if (multiplayerSession) {
            const { FirebaseService } = await import('../services/firebaseService');
            const answer: import('../types').QuizAnswer = {
                questionIndex: currentQIndex,
                selectedOption: idx,
                isCorrect,
                timeSpent: QUESTION_TIMER - timer,
                timestamp: Date.now(),
            };

            await FirebaseService.submitQuizAnswer(multiplayerSession.id, user.id, answer);
        }

        const attemptedQuestion = {
            question: currentQuestion.text,
            options: currentQuestion.options,
            userAnswer: idx,
            correctAnswer: currentQuestion.correctIndex,
            explanation: idx === -1 ? "Time run out! " + currentQuestion.explanation : currentQuestion.explanation,
            isCorrect,
            difficulty: currentQuestion.difficulty || difficulty // Fallback to current level
        };

        setAttemptedQuestions(prev => [...prev, attemptedQuestion]);

        if (isCorrect) {
            // Include time bonus
            const timeBonus = Math.floor(timer * 2); // 2 points per remaining second
            const streakBonus = Math.min(streak * 10, 50);
            setScore(s => s + 100 + streakBonus + timeBonus);
            setStreak(s => s + 1);
        } else {
            setStreak(0);
        }
    };

    const handleContinueQuiz = async () => {
        setContinuing(true);
        
        // 1. Analyze Performance of last round (last 5 questions)
        const lastRoundQuestions = attemptedQuestions.slice(-5);
        const correctCount = lastRoundQuestions.filter(q => q.isCorrect).length;
        
        let newDifficulty = difficulty;
        if (correctCount >= 4) {
            if (difficulty === 'easy') newDifficulty = 'medium';
            else if (difficulty === 'medium') newDifficulty = 'hard';
        } else if (correctCount <= 2) {
            if (difficulty === 'hard') newDifficulty = 'medium';
            else if (difficulty === 'medium') newDifficulty = 'easy';
        }
        
        setDifficulty(newDifficulty); // Update state for UI

        // 2. Re-aggregate text (simplified for now)
        let aggregatedText = "";
        selectedNoteIds.forEach(id => {
            const note = notes.find(n => n.id === id);
            if (note) {
                const elements = note.canvas?.elements || note.elements || [];
                const blocks = note.document?.blocks || [];
                note.elements?.forEach(el => { if (el.content) aggregatedText += el.content + "\n"; });
                note.canvas?.elements?.forEach(el => { if (el.content) aggregatedText += el.content + "\n"; });
                note.document?.blocks?.forEach(block => { if (block.content) aggregatedText += block.content + "\n"; });
            }
        });

        // 3. Generate New Questions
        const newQuestions = await generateQuizFromNotes(aggregatedText, newDifficulty);
        
        if (newQuestions.length > 0 && quiz) {
            setQuiz(prev => prev ? ({
                ...prev,
                questions: [...prev.questions, ...newQuestions]
            }) : null);
            nextQuestion(); // Move to next index (which is now start of new set)
        } else {
            alert("Could not generate more questions for this content.");
        }
        
        setContinuing(false);
    };

    const nextQuestion = () => {
        if (!quiz) return;
        setCurrentQIndex(c => c + 1);
        setSelectedOption(null);
        setShowAnalysis(false);
        setTimer(QUESTION_TIMER);
    };

    const finishQuiz = async (finalScore?: number) => {
        setGeneratingReport(true);
        const resultScore = finalScore !== undefined ? finalScore : score;

        // Multiplayer mode - generate leaderboard
        if (multiplayerSession) {
            const { FirebaseService } = await import('../services/firebaseService');
            
            // Update session status to completed
            await FirebaseService.updateQuizSession(multiplayerSession.id, {
                status: 'completed',
                completedAt: Date.now(),
            });

            // Generate leaderboard
            const generatedLeaderboard = await FirebaseService.generateLeaderboard(multiplayerSession.id);
            setLeaderboard(generatedLeaderboard);
            
            setGeneratingReport(false);
            setView('leaderboard');
            return;
        }

        // Singleplayer mode (existing logic)
        const currentHighScore = stats?.highScore || 0;
        const newHighScore = resultScore > currentHighScore ? resultScore : currentHighScore;

        // Generate AI Report
        if (attemptedQuestions.length > 0) {
            const report = await generateQuizReport(attemptedQuestions);
            setQuizReport(report);
        }

        const updatedStats = await StorageService.updateStats(prev => ({
            ...prev,
            quizzesTaken: prev.quizzesTaken + 1,
            highScore: newHighScore
        }));
        setStats(updatedStats);
        if (finalScore !== undefined) setScore(finalScore); // Update local score for display
        
        setGeneratingReport(false);
        setView('results');
    };

    const resetToSetup = () => {
        setView('setup');
        setSelectedNoteIds([]);
        setDifficulty('medium');
        setMode('standard');
    };


    if (view === 'setup') {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col overflow-y-auto"
            >
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-discord-accent rounded-xl flex items-center justify-center shadow-lg shadow-discord-accent/20">
                            <Target className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-white">Quiz Arena</h2>
                            <p className="text-discord-textMuted text-sm">Challenge yourself and beat your high score.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-discord-panel px-4 py-2 rounded-xl border border-white/5">
                        <Trophy className="text-yellow-400" size={20} />
                        <div>
                            <p className="text-xs text-discord-textMuted font-bold uppercase">High Score</p>
                            <p className="text-xl font-bold text-white leading-none">{stats?.highScore || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-6 flex-1">

                    <div className="flex flex-col min-h-0">
                        <h3 className="text-sm font-bold text-discord-textMuted uppercase mb-4 flex items-center gap-2">
                            <BookOpen size={16} /> Select Sources ({selectedNoteIds.length})
                        </h3>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-3 pb-4 max-h-[500px]">
                            {notes.map(note => (
                                <div
                                    key={note.id}
                                    onClick={() => setSelectedNoteIds(prev => prev.includes(note.id) ? prev.filter(id => id !== note.id) : [...prev, note.id])}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between group
                                    ${selectedNoteIds.includes(note.id)
                                            ? 'bg-discord-accent/10 border-discord-accent text-white shadow-md'
                                            : 'bg-discord-panel border-white/5 text-discord-textMuted hover:bg-discord-hover hover:text-white'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors
                                          ${selectedNoteIds.includes(note.id) ? 'bg-discord-accent border-discord-accent' : 'border-white/20 group-hover:border-white/40'}`}>
                                            {selectedNoteIds.includes(note.id) && <CheckCircle size={14} className="text-white" />}
                                        </div>
                                        <div>
                                            <span className="font-bold block">{note.title}</span>
                                            <span className="text-xs text-discord-textMuted opacity-70">{new Date(note.lastModified).toLocaleDateString()} • {note.folder}</span>
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
                    </div>


                    <div className="flex flex-col gap-4">
                        {/* Quiz Mode Selection */}
                        <div>
                            <h3 className="text-sm font-bold text-discord-textMuted uppercase mb-3 flex items-center gap-2">
                                <Users size={16} /> Quiz Mode
                            </h3>
                            <div className="grid grid-cols-2 gap-2 bg-discord-panel p-1 rounded-xl border border-white/5">
                                <button
                                    onClick={() => setQuizMode('singleplayer')}
                                    className={`py-2 rounded-lg text-sm font-bold transition-all ${quizMode === 'singleplayer' ? 'bg-[#5865F2] text-white shadow-sm' : 'text-discord-textMuted hover:text-white'}`}
                                >
                                    Solo
                                </button>
                                <button
                                    onClick={() => setQuizMode('multiplayer')}
                                    className={`py-2 rounded-lg text-sm font-bold transition-all ${quizMode === 'multiplayer' ? 'bg-[#5865F2] text-white shadow-sm' : 'text-discord-textMuted hover:text-white'}`}
                                >
                                    Multiplayer
                                </button>
                            </div>
                        </div>

                        {/* Join Quiz Section (Multiplayer Only) */}
                        {quizMode === 'multiplayer' && (
                            <div className="bg-[#2b2d31] border border-white/5 rounded-xl p-4">
                                <h4 className="text-sm font-bold text-white mb-3">Join Existing Quiz</h4>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={joinCode}
                                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                        placeholder="Enter code"
                                        maxLength={6}
                                        className="flex-1 bg-[#1e1f22] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#5865F2] font-mono text-center text-sm"
                                    />
                                    <button
                                        onClick={handleJoinQuiz}
                                        disabled={joiningSession || !joinCode.trim()}
                                        className="bg-[#5865F2] hover:bg-[#4752c4] text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {joiningSession ? <Loader2 className="animate-spin" size={16} /> : 'Join'}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Or create a new quiz below</p>
                            </div>
                        )}

                        {/* Mode Selection */}
                        <div>
                            <h3 className="text-sm font-bold text-discord-textMuted uppercase mb-3 flex items-center gap-2">
                                <Layers size={16} /> Mode
                            </h3>
                            <div className="grid grid-cols-2 gap-2 bg-discord-panel p-1 rounded-xl border border-white/5">
                                <button
                                    onClick={() => setMode('standard')}
                                    className={`py-2 rounded-lg text-sm font-bold transition-all ${mode === 'standard' ? 'bg-[#5865F2] text-white shadow-sm' : 'text-discord-textMuted hover:text-white'}`}
                                >
                                    Standard
                                </button>
                                <button
                                    onClick={() => setShowModeModal(true)}
                                    className={`py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1 ${mode !== 'standard' ? 'bg-[#5865F2] text-white shadow-sm' : 'text-discord-textMuted hover:text-white'}`}
                                >
                                    <MoreHorizontal size={16} />
                                    More Modes
                                </button>
                            </div>
                            {mode !== 'standard' && (
                                <div className="mt-2 text-xs text-discord-textMuted text-center">
                                    Selected: <span className="text-white font-bold">
                                        {mode === 'swipe' && 'Swipe (T/F)'}
                                        {mode === 'fillBlanks' && 'Fill in the Blanks'}
                                        {mode === 'explain' && 'Explain Your Answer'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Timer Configuration */}
                        <div>
                            <h3 className="text-sm font-bold text-discord-textMuted uppercase mb-3 flex items-center gap-2">
                                <Clock size={16} /> Timer Settings
                            </h3>
                            <div className="bg-discord-panel p-4 rounded-xl border border-white/5 space-y-3">
                                <label className="flex items-center justify-between cursor-pointer">
                                    <span className="text-white font-medium">Enable Timer</span>
                                    <div
                                        onClick={() => setTimerEnabled(!timerEnabled)}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${
                                            timerEnabled ? 'bg-discord-accent' : 'bg-gray-600'
                                        }`}
                                    >
                                        <div
                                            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                                timerEnabled ? 'transform translate-x-6' : ''
                                            }`}
                                        />
                                    </div>
                                </label>
                                {timerEnabled && (
                                    <div>
                                        <label className="text-sm text-discord-textMuted mb-2 block">
                                            Duration (seconds)
                                        </label>
                                        <select
                                            value={timerDuration}
                                            onChange={(e) => setTimerDuration(Number(e.target.value))}
                                            className="w-full bg-[#1e1f22] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-discord-accent"
                                        >
                                            <option value={15}>15 seconds</option>
                                            <option value={30}>30 seconds</option>
                                            <option value={45}>45 seconds</option>
                                            <option value={60}>60 seconds</option>
                                            <option value={90}>90 seconds</option>
                                            <option value={120}>120 seconds</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {(mode === 'standard' || mode === 'fillBlanks' || mode === 'explain') && (
                            <div>
                                <h3 className="text-sm font-bold text-discord-textMuted uppercase mb-3 flex items-center gap-2">
                                    <Target size={16} /> Difficulty
                                </h3>
                                <div className="flex flex-col gap-2">
                                    {(['easy', 'medium', 'hard'] as const).map(d => (
                                        <button
                                            key={d}
                                            onClick={() => setDifficulty(d)}
                                            className={`p-3 rounded-xl border text-left capitalize transition-all font-medium
                                            ${difficulty === d
                                                    ? 'bg-discord-accent text-white border-discord-accent shadow-md'
                                                    : 'bg-discord-panel border-white/5 text-discord-textMuted hover:bg-discord-hover'}`}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-4">
                            <button
                                onClick={handleGenerate}
                                disabled={loading || selectedNoteIds.length === 0}
                                className="w-full bg-discord-green hover:bg-green-600 text-white py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-green-500/20"
                            >
                                {loading ? (
                                    <><RefreshCw className="animate-spin" /> Generating...</>
                                ) : (
                                    <>{quizMode === 'multiplayer' ? 'Create Quiz Room' : 'Start Quiz'} <Play size={20} fill="currentColor" /></>
                                )}
                            </button>
                            {selectedNoteIds.length === 0 && (
                                <p className="text-center text-red-400 text-sm mt-3 flex items-center justify-center gap-2">
                                    <AlertCircle size={16} />
                                    Select at least one note to create a quiz
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Mode Selection Modal */}
                <ModeSelectionModal
                    isOpen={showModeModal}
                    onClose={() => setShowModeModal(false)}
                    onSelectMode={(newMode) => setMode(newMode)}
                    currentMode={mode}
                />
            </motion.div>
        );
    }

    // WAITING ROOM VIEW (Multiplayer)
    if (view === 'waiting' && multiplayerSession) {
        return (
            <MultiplayerWaitingRoom
                session={multiplayerSession}
                user={user}
                isHost={multiplayerSession.hostId === user.id}
                onStart={() => {
                    // Load quiz from session
                    setQuiz({
                        id: multiplayerSession.id,
                        userId: user.id,
                        title: multiplayerSession.title,
                        questions: multiplayerSession.questions,
                        highScore: 0
                    });
                    setCurrentQIndex(0);
                    setScore(0);
                    setStreak(0);
                    setAttemptedQuestions([]);
                    setAttemptedSwipeQuestions([]);
                    setSelectedOption(null);
                    setShowAnalysis(false);
                    setTimer(QUESTION_TIMER);
                    setView('playing');
                }}
                onExit={() => {
                    setMultiplayerSession(null);
                    setView('setup');
                }}
            />
        );
    }

    // LEADERBOARD VIEW (Multiplayer)
    if (view === 'leaderboard' && leaderboard) {
        return (
            <MultiplayerLeaderboard
                leaderboard={leaderboard}
                user={user}
                onPlayAgain={() => {
                    setMultiplayerSession(null);
                    setLeaderboard(null);
                    setView('setup');
                }}
                onExit={() => {
                    setMultiplayerSession(null);
                    setLeaderboard(null);
                    setView('setup');
                }}
            />
        );
    }

    // SWIPE MODE
    if (view === 'playing' && quiz && mode === 'swipe') {
        return (
            <SwipeQuiz
                questions={quiz.questions}
                onComplete={(finalScore, swipeAttempted) => {
                    setAttemptedSwipeQuestions(swipeAttempted);
                    finishQuiz(finalScore * 100);
                }}
                onExit={() => setView('setup')}
            />
        );
    }

    // FILL IN THE BLANKS MODE
    if (view === 'playing' && quiz && mode === 'fillBlanks') {
        return (
            <FillInTheBlanksQuiz
                questions={quiz.questions as any}
                onComplete={(finalScore, fillAttempted) => {
                    setAttemptedFillQuestions(fillAttempted);
                    finishQuiz(finalScore);
                }}
                onExit={() => setView('setup')}
                timerEnabled={timerEnabled}
                timerDuration={timerDuration}
            />
        );
    }

    // EXPLAIN YOUR ANSWER MODE
    if (view === 'playing' && quiz && mode === 'explain') {
        return (
            <ExplainAnswerQuiz
                questions={quiz.questions as any}
                onComplete={(finalScore, explainAttempted) => {
                    setAttemptedExplainQuestions(explainAttempted);
                    finishQuiz(finalScore);
                }}
                onExit={() => setView('setup')}
                timerEnabled={timerEnabled}
                timerDuration={timerDuration}
            />
        );
    }

    // STANDARD MODE
    if (view === 'playing' && quiz && mode === 'standard') {
        const question = quiz.questions[currentQIndex];
        const isCorrect = selectedOption === question.correctIndex;
        const isAnswered = selectedOption !== null;

        return (
            <div className="h-full flex flex-col max-w-4xl mx-auto p-8">

                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-discord-textMuted uppercase tracking-wider">Question</span>
                            <span className="text-2xl font-bold text-white font-mono">{currentQIndex + 1}<span className="text-discord-textMuted text-lg">/{quiz.questions.length}</span></span>
                        </div>
                    </div>


                    <div className="flex items-center gap-6">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 ${streak > 1 ? 'bg-orange-500/10 border-orange-500 text-orange-400' : 'bg-transparent border-transparent text-discord-textMuted'}`}>
                            <Zap size={18} className={streak > 1 ? 'fill-current' : ''} />
                            <span className="font-bold">{streak} Streak</span>
                        </div>
                        <div className="px-5 py-2 bg-discord-panel rounded-xl border border-white/10 text-white font-mono font-bold text-xl min-w-[100px] text-center">
                            {score}
                        </div>
                    </div>
                </div>

                {/* Timer Bar */}
                <div className="h-2 bg-white/10 rounded-full mb-8 overflow-hidden relative">
                    <motion.div
                        className="h-full absolute left-0 top-0 bottom-0"
                        initial={{ width: "100%", backgroundColor: "#5865F2" }}
                        animate={{
                            width: `${(timer / QUESTION_TIMER) * 100}%`,
                            backgroundColor: timer < 10 ? '#ef4444' : '#5865F2'
                        }}
                        transition={{ duration: 0.5, ease: "linear" }}
                    />
                </div>


                <AnimatePresence mode='wait'>
                    <motion.div
                        key={currentQIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="flex-1 flex flex-col justify-center"
                    >
                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-10 leading-snug">{question.text}</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            {question.options.map((opt, idx) => {

                                let styleClass = "bg-discord-panel border-white/10 text-discord-text hover:bg-discord-hover hover:border-white/20";
                                if (isAnswered) {
                                    if (idx === question.correctIndex) styleClass = "bg-green-500/20 border-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]";
                                    else if (selectedOption === idx) styleClass = "bg-red-500/20 border-red-500 text-white opacity-80";
                                    else styleClass = "bg-discord-panel border-white/5 text-discord-textMuted opacity-50";
                                }

                                return (
                                    <motion.button
                                        key={idx}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        onClick={() => handleOptionSelect(idx)}
                                        disabled={isAnswered}
                                        className={`p-6 rounded-2xl text-left font-medium text-lg border-2 transition-all relative ${styleClass} min-h-[100px] flex items-center`}
                                    >
                                        <span className="mr-4 w-8 h-8 rounded-full border border-current flex items-center justify-center text-sm font-bold opacity-50 shrink-0">
                                            {String.fromCharCode(65 + idx)}
                                        </span>
                                        {opt}
                                        {isAnswered && idx === question.correctIndex && <CheckCircle className="absolute right-4 top-4 text-green-500" />}
                                        {isAnswered && selectedOption === idx && idx !== question.correctIndex && <XCircle className="absolute right-4 top-4 text-red-500" />}
                                    </motion.button>
                                )
                            })}
                        </div>


                        {showAnalysis && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="overflow-hidden"
                            >
                                <div className={`p-6 rounded-xl border mb-6 flex items-start gap-4 ${isCorrect ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                    <div className={`p-2 rounded-full shrink-0 ${isCorrect ? 'bg-green-500 text-black' : 'bg-red-500 text-white'}`}>
                                        {isCorrect ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                    </div>
                                    <div>
                                        <h4 className={`font-bold mb-1 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                            {isCorrect ? 'Correct!' : selectedOption === -1 ? "Time's Up!" : 'Incorrect'}
                                        </h4>
                                        <p className="text-discord-textMuted text-sm leading-relaxed">{question.explanation}</p>
                                    </div>
                                </div>


                                <div className="flex gap-4">
                                    {currentQIndex < quiz.questions.length - 1 ? (
                                        <button
                                            onClick={nextQuestion}
                                            className="flex-1 bg-discord-accent hover:bg-discord-accentHover text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2"
                                        >
                                            Next Question <Play size={20} fill="currentColor" />
                                        </button>
                                    ) : (
                                        // End of current set
                                        <button
                                            onClick={handleContinueQuiz}
                                            disabled={continuing}
                                            className="flex-1 bg-discord-green hover:bg-green-600 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2"
                                        >
                                            {continuing ? <RefreshCw className="animate-spin" /> : <BrainCircuit size={20} />}
                                            Continue Learning
                                        </button>
                                    )}
                                    <button
                                        onClick={() => finishQuiz()}
                                        disabled={continuing || generatingReport}
                                        className="flex-1 bg-discord-panel hover:bg-discord-hover text-white py-4 rounded-xl font-bold text-lg transition-all border border-white/10 flex items-center justify-center gap-2"
                                    >
                                        {generatingReport ? <RefreshCw className="animate-spin" /> : <Trophy size={20} />}
                                        Finish & View Report
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        );
    }

    // RESULTS VIEW
    if (view === 'results' && quiz) {
        const isSwipeMode = mode === 'swipe';
        const isFillMode = mode === 'fillBlanks';
        const isExplainMode = mode === 'explain';
        
        let totalQuestions = 0;
        let correctCount = 0;
        
        if (isSwipeMode) {
            totalQuestions = attemptedSwipeQuestions.length;
            correctCount = attemptedSwipeQuestions.filter(q => q.isCorrect).length;
        } else if (isFillMode) {
            totalQuestions = attemptedFillQuestions.length;
            correctCount = attemptedFillQuestions.filter(q => q.overallCorrect).length;
        } else if (isExplainMode) {
            totalQuestions = attemptedExplainQuestions.length;
            correctCount = attemptedExplainQuestions.filter(q => q.answerCorrect).length;
        } else {
            totalQuestions = attemptedQuestions.length;
            correctCount = attemptedQuestions.filter(q => q.isCorrect).length;
        }
        
        const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col p-8 max-w-5xl mx-auto overflow-y-auto"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <Trophy size={80} className="text-yellow-400 mb-4 mx-auto drop-shadow-[0_0_30px_rgba(250,204,21,0.4)]" />
                    <h1 className="text-4xl font-bold text-white mb-2">Quiz Completed!</h1>
                    <p className="text-xl text-discord-textMuted">You scored <span className="text-discord-accent font-bold">{isSwipeMode ? correctCount : score}</span> {isSwipeMode ? `out of ${totalQuestions}` : 'points'}</p>
                    {score > (stats?.highScore || 0) && score > 0 && (
                        <p className="text-green-400 font-bold mt-2 animate-bounce">🎉 New High Score!</p>
                    )}
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-discord-panel p-4 rounded-xl border border-white/5 text-center">
                        <p className="text-discord-textMuted text-xs font-bold uppercase mb-1">Questions</p>
                        <p className="text-2xl font-bold text-white">{totalQuestions}</p>
                    </div>
                    <div className="bg-discord-panel p-4 rounded-xl border border-white/5 text-center">
                        <p className="text-discord-textMuted text-xs font-bold uppercase mb-1">Correct</p>
                        <p className="text-2xl font-bold text-green-400">{correctCount}</p>
                    </div>
                    <div className="bg-discord-panel p-4 rounded-xl border border-white/5 text-center">
                        <p className="text-discord-textMuted text-xs font-bold uppercase mb-1">Accuracy</p>
                        <p className="text-2xl font-bold text-discord-accent">{accuracy}%</p>
                    </div>
                </div>

                {/* AI Performance Report & Adaptive Insights */}
                {quizReport && !isSwipeMode && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 space-y-6"
                    >
                        <div className="bg-[#1e1f22] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <BrainCircuit size={100} className="text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 relative z-10">
                                <Zap className="text-yellow-400" /> AI Performance Insights
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                                {/* Strengths */}
                                {quizReport.strengths.length > 0 && (
                                    <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-4">
                                        <h4 className="font-bold text-green-400 mb-3 flex items-center gap-2">
                                            <CheckCircle size={16} /> Strong Concepts
                                        </h4>
                                        <ul className="space-y-2">
                                            {quizReport.strengths.map((s, i) => (
                                                <li key={i} className="text-sm text-discord-textMuted flex items-start gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                                                    {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Weaknesses */}
                                {quizReport.weaknesses.length > 0 && (
                                    <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                                        <h4 className="font-bold text-red-400 mb-3 flex items-center gap-2">
                                            <AlertCircle size={16} /> Needs Review
                                        </h4>
                                        <ul className="space-y-2">
                                            {quizReport.weaknesses.map((w, i) => (
                                                <li key={i} className="text-sm text-discord-textMuted flex items-start gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                                                    {w}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Suggestions */}
                                <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                                    <h4 className="font-bold text-blue-400 mb-3 flex items-center gap-2">
                                        <Target size={16} /> Recommended Actions
                                    </h4>
                                    <ul className="space-y-2">
                                        {quizReport.suggestions.map((s, i) => (
                                            <li key={i} className="text-sm text-discord-textMuted flex items-start gap-2">
                                                <ArrowRight size={14} className="text-blue-500 mt-0.5 shrink-0" />
                                                {s}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Difficulty Flow */}
                        <div className="bg-discord-panel p-6 rounded-2xl border border-white/5">
                            <h4 className="text-sm font-bold text-discord-textMuted uppercase mb-4 flex items-center gap-2">
                                <TrendingUp size={16} /> Difficulty Progression
                            </h4>
                            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                                {quizReport.difficultyProgression?.map((diff, i) => (
                                    <React.Fragment key={i}>
                                        <div className={`
                                            px-3 py-1 rounded-lg text-xs font-bold uppercase shrink-0 border
                                            ${diff === 'easy' ? 'bg-green-500/10 text-green-400 border-green-500/20' : ''}
                                            ${diff === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : ''}
                                            ${diff === 'hard' ? 'bg-red-500/10 text-red-400 border-red-500/20' : ''}
                                        `}>
                                            Q{i + 1}: {diff}
                                        </div>
                                        {i < quizReport.difficultyProgression.length - 1 && (
                                            <div className="w-4 h-0.5 bg-white/10 shrink-0" />
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Detailed Analysis */}
                <div className="mb-8 flex-1">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <BookOpen size={20} /> Detailed Analysis
                    </h3>
                    <div className="space-y-4">
                        {isSwipeMode ? (
                            // SWIPE MODE RESULTS
                            attemptedSwipeQuestions.map((q, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`p-5 rounded-xl border ${q.isCorrect ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}
                                >
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className={`p-2 rounded-full shrink-0 ${q.isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                                            {q.isCorrect ? <CheckCircle size={18} className="text-white" /> : <XCircle size={18} className="text-white" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-white font-bold text-lg mb-2">Q{idx + 1}. {q.question}</p>
                                            <div className="flex gap-4 text-sm mb-2">
                                                <div>
                                                    <span className="text-discord-textMuted">Correct Answer: </span>
                                                    <span className="font-bold text-green-400">{q.correctAnswerIsTrue ? 'TRUE' : 'FALSE'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-discord-textMuted">You answered: </span>
                                                    <span className={`font-bold ${q.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                                        {q.userAnsweredTrue ? 'TRUE' : 'FALSE'}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-discord-textMuted text-sm leading-relaxed bg-discord-bg/50 p-3 rounded-lg">
                                                {q.explanation}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : isFillMode ? (
                            // FILL IN THE BLANKS RESULTS
                            attemptedFillQuestions.map((q, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`p-5 rounded-xl border ${q.overallCorrect ? 'bg-green-500/5 border-green-500/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}
                                >
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className={`p-2 rounded-full shrink-0 ${q.overallCorrect ? 'bg-green-500' : 'bg-yellow-500'}`}>
                                            {q.overallCorrect ? <CheckCircle size={18} className="text-white" /> : <XCircle size={18} className="text-black" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-white font-bold text-lg mb-3">Q{idx + 1}. {q.question}</p>
                                            <div className="space-y-2 mb-3">
                                                {q.blanks.map((blank, bIdx) => (
                                                    <div key={bIdx} className="flex items-center gap-2">
                                                        <span className="text-discord-textMuted text-sm">Blank {bIdx + 1}:</span>
                                                        <span className={`font-bold ${blank.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                                            {blank.userAnswer || '(empty)'}
                                                        </span>
                                                        {!blank.isCorrect && (
                                                            <>
                                                                <span className="text-discord-textMuted text-sm">→</span>
                                                                <span className="font-bold text-green-400">{blank.correctAnswer}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-discord-textMuted text-sm leading-relaxed bg-discord-bg/50 p-3 rounded-lg">
                                                {q.explanation}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : isExplainMode ? (
                            // EXPLAIN YOUR ANSWER RESULTS
                            attemptedExplainQuestions.map((q, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`p-5 rounded-xl border ${q.answerCorrect ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}
                                >
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className={`p-2 rounded-full shrink-0 ${q.answerCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                                            {q.answerCorrect ? <CheckCircle size={18} className="text-white" /> : <XCircle size={18} className="text-white" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-white font-bold text-lg mb-3">Q{idx + 1}. {q.question}</p>
                                            <div className="mb-2">
                                                <span className="text-discord-textMuted text-sm">Correct Answer: </span>
                                                <span className="font-bold text-green-400">{q.options[q.correctAnswer]}</span>
                                            </div>
                                            {!q.answerCorrect && (
                                                <div className="mb-2">
                                                    <span className="text-discord-textMuted text-sm">Your Answer: </span>
                                                    <span className="font-bold text-red-400">{q.options[q.userAnswer]}</span>
                                                </div>
                                            )}
                                            <div className="mb-3 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                                                <p className="text-blue-400 font-bold text-sm mb-2">Your Explanation:</p>
                                                <p className="text-white text-sm italic mb-2">"{q.userExplanation}"</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-discord-textMuted text-sm">Reasoning Quality:</span>
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <span key={star} className={star <= q.reasoningScore ? 'text-yellow-400' : 'text-gray-600'}>★</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <p className="text-discord-textMuted text-xs mt-2">{q.reasoningFeedback}</p>
                                            </div>
                                            <p className="text-discord-textMuted text-sm leading-relaxed bg-discord-bg/50 p-3 rounded-lg">
                                                {q.explanation}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            // STANDARD MODE RESULTS
                            attemptedQuestions.map((q, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`p-5 rounded-xl border ${q.isCorrect ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}
                                >
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className={`p-2 rounded-full shrink-0 ${q.isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                                            {q.isCorrect ? <CheckCircle size={18} className="text-white" /> : <XCircle size={18} className="text-white" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-white font-bold text-lg mb-3">Q{idx + 1}. {q.question}</p>
                                            <div className="mb-2">
                                                <span className="text-discord-textMuted text-sm">Correct Answer: </span>
                                                <span className="font-bold text-green-400">{q.options[q.correctAnswer]}</span>
                                            </div>
                                            {!q.isCorrect && q.userAnswer !== -1 && (
                                                <div className="mb-2">
                                                    <span className="text-discord-textMuted text-sm">Your Answer: </span>
                                                    <span className="font-bold text-red-400">{q.options[q.userAnswer]}</span>
                                                </div>
                                            )}
                                            {q.userAnswer === -1 && (
                                                <div className="mb-2">
                                                    <span className="font-bold text-red-400">⏱️ Time's Up!</span>
                                                </div>
                                            )}
                                            <p className="text-discord-textMuted text-sm leading-relaxed bg-discord-bg/50 p-3 rounded-lg mt-2">
                                                {q.explanation}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 justify-center pt-4 border-t border-white/5">
                    <button onClick={resetToSetup} className="px-8 py-3 bg-discord-panel hover:bg-discord-hover text-white rounded-xl font-bold transition-colors border border-white/10">
                        Back to Setup
                    </button>
                    <button onClick={() => setView('setup')} className="px-8 py-3 bg-discord-accent hover:bg-discord-accentHover text-white rounded-xl font-bold transition-colors shadow-lg">
                        Play Again
                    </button>
                </div>
            </motion.div>
        );
    }

    return null;
};

export default QuizPage;