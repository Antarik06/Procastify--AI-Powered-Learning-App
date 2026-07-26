import React, { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Question } from '../../../types';
import { Check, X, RotateCcw } from 'lucide-react';

interface AttemptedSwipeQuestion {
    question: string;
    userAnsweredTrue: boolean;
    correctAnswerIsTrue: boolean;
    isCorrect: boolean;
    explanation: string;
}

interface SwipeQuizProps {
    questions: Question[];
    onComplete: (score: number, attemptedQuestions: AttemptedSwipeQuestion[]) => void;
    onExit: () => void;
}

const SwipeCard = ({ question, onSwipe }: { question: Question; onSwipe: (direction: 'left' | 'right') => void }) => {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-30, 30]);
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
    const background = useTransform(x, [-200, 0, 200], ["rgba(239, 68, 68, 0.2)", "rgba(30, 31, 34, 1)", "rgba(34, 197, 94, 0.2)"]);

    const handleDragEnd = (event: any, info: any) => {
        if (info.offset.x > 100) {
            onSwipe('right');
        } else if (info.offset.x < -100) {
            onSwipe('left');
        }
    };

    return (
        <motion.div
            style={{ x, rotate, opacity, background }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 bg-[#2b2d31] rounded-2xl shadow-xl border border-white/10 p-8 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing text-center"
        >
            <h3 className="text-2xl font-bold text-white mb-8">{question.text}</h3>
            <div className="flex justify-between w-full px-12 text-sm font-bold opacity-50">
                <span className="text-red-400">FALSE</span>
                <span className="text-green-400">TRUE</span>
            </div>
        </motion.div>
    );
};

const SwipeQuiz: React.FC<SwipeQuizProps> = ({ questions, onComplete, onExit }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState<'correct' | 'incorrect' | null>(null);
    const [attemptedQuestions, setAttemptedQuestions] = useState<AttemptedSwipeQuestion[]>([]);

    const handleSwipe = (direction: 'left' | 'right') => {
        const currentQ = questions[currentIndex];
        // 0 = True, 1 = False
        const isTrue = currentQ.correctIndex === 0;
        const userChoseTrue = direction === 'right';

        const isCorrect = (isTrue && userChoseTrue) || (!isTrue && !userChoseTrue);

        if (isCorrect) setScore(s => s + 1);

        // Track attempted question
        const attemptedQ: AttemptedSwipeQuestion = {
            question: currentQ.text,
            userAnsweredTrue: userChoseTrue,
            correctAnswerIsTrue: isTrue,
            isCorrect,
            explanation: currentQ.explanation
        };
        setAttemptedQuestions(prev => [...prev, attemptedQ]);

        setShowResult(isCorrect ? 'correct' : 'incorrect');

        setTimeout(() => {
            setShowResult(null);
            if (currentIndex < questions.length - 1) {
                setCurrentIndex(i => i + 1);
            } else {
                onComplete(score + (isCorrect ? 1 : 0), [...attemptedQuestions, attemptedQ]);
            }
        }, 500);
    };

    return (
        <div className="flex flex-col items-center justify-center h-full w-full relative overflow-hidden">
            <div className="absolute top-4 right-4 z-50">
                <button onClick={onExit} className="text-gray-400 hover:text-white"><X /></button>
            </div>

            <div className="mb-8 text-center">
                <h2 className="text-xl font-bold text-white">Swipe Quiz</h2>
                <p className="text-gray-400 text-sm">Right for TRUE, Left for FALSE</p>
                <div className="mt-2 text-discord-accent font-mono">{currentIndex + 1} / {questions.length}</div>
            </div>

            <div className="relative w-full max-w-md aspect-[3/4] h-[500px]">
                <AnimatePresence>
                    {currentIndex < questions.length && (
                        <SwipeCard
                            key={questions[currentIndex].id}
                            question={questions[currentIndex]}
                            onSwipe={handleSwipe}
                        />
                    )}
                </AnimatePresence>

                {/* Feedback Overlay */}
                <AnimatePresence>
                    {showResult && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className={`absolute inset-0 flex items-center justify-center pointer-events-none z-50 ${showResult === 'correct' ? 'text-green-500' : 'text-red-500'}`}
                        >
                            {showResult === 'correct' ? <Check size={100} /> : <X size={100} />}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex gap-8 mt-8">
                <button onClick={() => handleSwipe('left')} className="p-4 bg-[#2b2d31] rounded-full text-red-400 hover:bg-red-500/10 border border-white/5 shadow-lg transition-all">
                    <X size={32} />
                </button>
                <button onClick={() => handleSwipe('right')} className="p-4 bg-[#2b2d31] rounded-full text-green-400 hover:bg-green-500/10 border border-white/5 shadow-lg transition-all">
                    <Check size={32} />
                </button>
            </div>
        </div>
    );
};

export default SwipeQuiz;
