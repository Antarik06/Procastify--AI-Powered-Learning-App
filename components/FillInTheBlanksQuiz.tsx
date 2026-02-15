import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, XCircle, ArrowRight, Trophy } from 'lucide-react';
import { FillInTheBlanksQuestion, AttemptedFillQuestion } from '../types';
import { fuzzyMatch, parseTextWithBlanks, calculateFillBlanksScore } from '../utils/quizUtils';

interface FillInTheBlanksQuizProps {
  questions: FillInTheBlanksQuestion[];
  onComplete: (score: number, attempted: AttemptedFillQuestion[]) => void;
  onExit: () => void;
  timerEnabled: boolean;
  timerDuration?: number;
}

const FillInTheBlanksQuiz: React.FC<FillInTheBlanksQuizProps> = ({
  questions,
  onComplete,
  onExit,
  timerEnabled,
  timerDuration = 45,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [validationResults, setValidationResults] = useState<Record<string, boolean>>({});
  const [timer, setTimer] = useState(timerDuration);
  const [attemptedQuestions, setAttemptedQuestions] = useState<AttemptedFillQuestion[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = questions[currentIndex];
  
  // Safety check to prevent blank screen
  if (!currentQuestion) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-white">Loading question...</p>
      </div>
    );
  }
  
  const { parts } = parseTextWithBlanks(currentQuestion.textWithBlanks);

  // Timer logic
  useEffect(() => {
    if (timerEnabled && !showFeedback && timer > 0) {
      const interval = setInterval(() => {
        setTimer((t) => t - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (timer === 0 && !showFeedback && timerEnabled && !isSubmitting) {
      handleSubmit(); // Auto-submit on timeout
    }
  }, [timer, showFeedback, timerEnabled, isSubmitting]);

  const handleInputChange = (blankId: string, value: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [blankId]: value,
    }));
  };

  const handleSubmit = () => {
    if (isSubmitting) return; // Prevent double submission
    setIsSubmitting(true);
    
    const results: Record<string, boolean> = {};
    const blanksData: AttemptedFillQuestion['blanks'] = [];
    let correctCount = 0;

    currentQuestion.blanks.forEach((blank, index) => {
      const userAnswer = userAnswers[blank.id] || '';
      const isCorrect = fuzzyMatch(userAnswer, blank.correctAnswers);
      results[blank.id] = isCorrect;
      
      blanksData.push({
        correctAnswer: blank.correctAnswers[0],
        userAnswer,
        isCorrect,
      });

      if (isCorrect) correctCount++;
    });

    setValidationResults(results);
    setShowFeedback(true);

    const allCorrect = correctCount === currentQuestion.blanks.length;
    const questionScore = calculateFillBlanksScore(
      correctCount,
      currentQuestion.blanks.length,
      allCorrect,
      timer,
      streak,
      timerEnabled
    );

    setScore((s) => s + questionScore);

    if (allCorrect) {
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }

    // Track attempted question
    setAttemptedQuestions((prev) => [
      ...prev,
      {
        question: currentQuestion.text,
        blanks: blanksData,
        overallCorrect: allCorrect,
        explanation: currentQuestion.explanation,
      },
    ]);
    
    setIsSubmitting(false);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setUserAnswers({});
      setShowFeedback(false);
      setValidationResults({});
      setTimer(timerDuration);
    } else {
      // Complete quiz - make sure we have all attempted questions
      onComplete(score, attemptedQuestions);
    }
  };

  const allBlanksFilled = currentQuestion?.blanks?.every(
    (blank) => {
      const answer = userAnswers[blank.id];
      return answer !== undefined && answer !== null && answer.trim().length > 0;
    }
  ) ?? false;

  const overallCorrect = Object.values(validationResults).every((v) => v);

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-discord-textMuted uppercase tracking-wider">
              Question
            </span>
            <span className="text-2xl font-bold text-white font-mono">
              {currentIndex + 1}
              <span className="text-discord-textMuted text-lg">/{questions.length}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {streak > 1 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border bg-orange-500/10 border-orange-500 text-orange-400">
              <Trophy size={18} className="fill-current" />
              <span className="font-bold">{streak} Streak</span>
            </div>
          )}
          <div className="px-5 py-2 bg-discord-panel rounded-xl border border-white/10 text-white font-mono font-bold text-xl min-w-[100px] text-center">
            {score}
          </div>
          <button
            onClick={onExit}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-discord-textMuted hover:text-white"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Timer Bar */}
      {timerEnabled && (
        <div className="h-2 bg-white/10 rounded-full mb-8 overflow-hidden relative">
          <motion.div
            className="h-full absolute left-0 top-0 bottom-0"
            initial={{ width: '100%', backgroundColor: '#5865F2' }}
            animate={{
              width: `${(timer / timerDuration) * 100}%`,
              backgroundColor: timer < 10 ? '#ef4444' : '#5865F2',
            }}
            transition={{ duration: 0.5, ease: 'linear' }}
          />
        </div>
      )}

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`question-${currentIndex}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col justify-center"
        >
          <h2 className="text-xl font-bold text-discord-textMuted uppercase mb-4 tracking-wide">
            Fill in the Blanks
          </h2>

          {/* Question with Blanks */}
          <div className="text-2xl md:text-3xl font-bold text-white mb-10 leading-relaxed">
            {parts.map((part, index) => {
              if (part.isBlank && part.blankId) {
                const blankIndex = currentQuestion.blanks.findIndex(
                  (b) => b.id === part.blankId
                );
                const blank = currentQuestion.blanks[blankIndex];
                const isValidated = showFeedback;
                const isCorrect = validationResults[part.blankId];

                return (
                  <span key={index} className="inline-block mx-1">
                    <input
                      type="text"
                      value={userAnswers[part.blankId] || ''}
                      onChange={(e) => handleInputChange(part.blankId!, e.target.value)}
                      disabled={showFeedback}
                      className={`
                        px-4 py-2 rounded-lg border-2 font-mono text-xl
                        focus:outline-none focus:ring-2 focus:ring-discord-accent
                        transition-all min-w-[150px] text-center
                        ${
                          isValidated
                            ? isCorrect
                              ? 'bg-green-500/20 border-green-500 text-green-400'
                              : 'bg-red-500/20 border-red-500 text-red-400'
                            : 'bg-discord-panel border-white/20 text-white hover:border-white/40'
                        }
                      `}
                      placeholder="___"
                    />
                    {isValidated && !isCorrect && (
                      <div className="text-sm text-green-400 mt-1 font-normal">
                        ✓ {blank.correctAnswers[0]}
                      </div>
                    )}
                  </span>
                );
              }
              return <span key={index}>{part.text}</span>;
            })}
          </div>

          {/* Feedback */}
          {showFeedback && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="overflow-hidden"
            >
              <div
                className={`p-6 rounded-xl border mb-6 flex items-start gap-4 ${
                  overallCorrect
                    ? 'bg-green-500/10 border-green-500/20'
                    : 'bg-yellow-500/10 border-yellow-500/20'
                }`}
              >
                <div
                  className={`p-2 rounded-full shrink-0 ${
                    overallCorrect ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black'
                  }`}
                >
                  {overallCorrect ? <CheckCircle size={20} /> : <XCircle size={20} />}
                </div>
                <div>
                  <h4
                    className={`font-bold mb-1 ${
                      overallCorrect ? 'text-green-400' : 'text-yellow-400'
                    }`}
                  >
                    {overallCorrect ? 'Perfect!' : 'Partially Correct'}
                  </h4>
                  <p className="text-discord-textMuted text-sm leading-relaxed">
                    {currentQuestion.explanation}
                  </p>
                </div>
              </div>

              <button
                onClick={handleNext}
                className="w-full bg-discord-accent hover:bg-discord-accentHover text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {currentIndex < questions.length - 1 ? (
                  <>
                    Next Question <ArrowRight size={20} />
                  </>
                ) : (
                  <>
                    View Results <Trophy size={20} />
                  </>
                )}
              </button>
            </motion.div>
          )}

          {/* Submit Button */}
          {!showFeedback && (
            <button
              onClick={handleSubmit}
              disabled={!allBlanksFilled}
              className="w-full bg-discord-green hover:bg-green-600 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Submit Answer
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default FillInTheBlanksQuiz;
