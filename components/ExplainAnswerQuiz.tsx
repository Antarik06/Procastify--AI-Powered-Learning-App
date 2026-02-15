import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, XCircle, ArrowRight, Trophy, Star, Loader2, MessageSquare } from 'lucide-react';
import { ExplainQuestion, AttemptedExplainQuestion } from '../types';
import { calculateExplainScore } from '../utils/quizUtils';
import { evaluateReasoning } from '../services/geminiService';

interface ExplainAnswerQuizProps {
  questions: ExplainQuestion[];
  onComplete: (score: number, attempted: AttemptedExplainQuestion[]) => void;
  onExit: () => void;
  timerEnabled: boolean;
  timerDuration?: number;
}

const ExplainAnswerQuiz: React.FC<ExplainAnswerQuizProps> = ({
  questions,
  onComplete,
  onExit,
  timerEnabled,
  timerDuration = 90,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [step, setStep] = useState<'select' | 'explain' | 'feedback'>('select');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [explanation, setExplanation] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [timer, setTimer] = useState(timerDuration);
  const [attemptedQuestions, setAttemptedQuestions] = useState<AttemptedExplainQuestion[]>([]);

  const currentQuestion = questions[currentIndex];

  // Timer logic
  useEffect(() => {
    if (timerEnabled && step !== 'feedback' && timer > 0) {
      const interval = setInterval(() => {
        setTimer((t) => t - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (timer === 0 && step !== 'feedback' && timerEnabled) {
      // Auto-submit with current state
      if (step === 'select' && selectedOption === null) {
        setSelectedOption(0); // Default to first option
        setStep('explain');
      } else if (step === 'explain') {
        handleSubmitExplanation();
      }
    }
  }, [timer, step, timerEnabled]);

  const handleSelectOption = (index: number) => {
    setSelectedOption(index);
  };

  const handleContinueToExplain = () => {
    if (selectedOption !== null) {
      setStep('explain');
    }
  };

  const handleSubmitExplanation = async () => {
    if (!explanation.trim() || selectedOption === null) return;

    setEvaluating(true);
    setStep('feedback');

    try {
      const result = await evaluateReasoning(
        currentQuestion.text,
        currentQuestion.options[currentQuestion.correctIndex],
        currentQuestion.options[selectedOption],
        explanation
      );

      setEvaluation(result);

      const answerCorrect = selectedOption === currentQuestion.correctIndex;
      const questionScore = calculateExplainScore(
        answerCorrect,
        result.score,
        timer,
        streak,
        timerEnabled
      );

      setScore((s) => s + questionScore);

      if (answerCorrect) {
        setStreak((s) => s + 1);
      } else {
        setStreak(0);
      }

      // Track attempted question
      setAttemptedQuestions((prev) => [
        ...prev,
        {
          question: currentQuestion.text,
          options: currentQuestion.options,
          userAnswer: selectedOption,
          correctAnswer: currentQuestion.correctIndex,
          answerCorrect,
          userExplanation: explanation,
          reasoningScore: result.score,
          reasoningFeedback: result.feedback,
          explanation: currentQuestion.explanation,
          totalScore: questionScore,
        },
      ]);
    } catch (error) {
      console.error('Evaluation error:', error);
      // Fallback evaluation
      const answerCorrect = selectedOption === currentQuestion.correctIndex;
      setEvaluation({
        score: answerCorrect ? 3 : 2,
        feedback: 'Automatic evaluation unavailable. Your answer has been recorded.',
        strengths: [],
        improvements: [],
      });
    } finally {
      setEvaluating(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setStep('select');
      setSelectedOption(null);
      setExplanation('');
      setEvaluation(null);
      setTimer(timerDuration);
    } else {
      onComplete(score, attemptedQuestions);
    }
  };

  const answerCorrect = selectedOption === currentQuestion.correctIndex;

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
              backgroundColor: timer < 15 ? '#ef4444' : '#5865F2',
            }}
            transition={{ duration: 0.5, ease: 'linear' }}
          />
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentIndex}-${step}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col justify-center"
        >
          {/* Step 1: Select Answer */}
          {step === 'select' && (
            <>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-10 leading-snug">
                {currentQuestion.text}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {currentQuestion.options.map((option, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => handleSelectOption(idx)}
                    className={`
                      p-6 rounded-2xl text-left font-medium text-lg border-2 transition-all relative min-h-[100px] flex items-center
                      ${
                        selectedOption === idx
                          ? 'bg-discord-accent/20 border-discord-accent text-white shadow-lg'
                          : 'bg-discord-panel border-white/10 text-discord-text hover:bg-discord-hover hover:border-white/20'
                      }
                    `}
                  >
                    <span className="mr-4 w-8 h-8 rounded-full border border-current flex items-center justify-center text-sm font-bold opacity-50 shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {option}
                    {selectedOption === idx && (
                      <CheckCircle className="absolute right-4 top-4 text-discord-accent" size={20} />
                    )}
                  </motion.button>
                ))}
              </div>

              <button
                onClick={handleContinueToExplain}
                disabled={selectedOption === null}
                className="w-full bg-discord-accent hover:bg-discord-accentHover text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Continue to Explain <ArrowRight size={20} />
              </button>
            </>
          )}

          {/* Step 2: Explain */}
          {step === 'explain' && (
            <>
              <div className="mb-6 p-4 bg-discord-panel rounded-xl border border-white/10">
                <p className="text-sm text-discord-textMuted mb-2">You selected:</p>
                <p className="text-lg font-bold text-white">
                  {String.fromCharCode(65 + selectedOption!)} - {currentQuestion.options[selectedOption!]}
                </p>
              </div>

              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <MessageSquare size={24} className="text-discord-accent" />
                Why did you choose this answer?
              </h3>

              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Explain your reasoning here... (minimum 20 characters)"
                className="w-full h-48 p-4 bg-discord-panel border-2 border-white/10 rounded-xl text-white placeholder-discord-textMuted focus:outline-none focus:border-discord-accent resize-none mb-4"
                maxLength={500}
              />

              <div className="flex items-center justify-between mb-6">
                <span
                  className={`text-sm ${
                    explanation.length < 20 ? 'text-red-400' : 'text-discord-textMuted'
                  }`}
                >
                  {explanation.length}/500 characters {explanation.length < 20 && '(minimum 20)'}
                </span>
              </div>

              <button
                onClick={handleSubmitExplanation}
                disabled={explanation.length < 20}
                className="w-full bg-discord-green hover:bg-green-600 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Submit Answer
              </button>
            </>
          )}

          {/* Step 3: Feedback */}
          {step === 'feedback' && (
            <>
              {evaluating ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="animate-spin text-discord-accent mb-4" size={48} />
                  <p className="text-white font-bold text-lg">Evaluating your reasoning...</p>
                  <p className="text-discord-textMuted text-sm mt-2">This may take a few seconds</p>
                </div>
              ) : (
                <>
                  {/* Answer Correctness */}
                  <div
                    className={`p-6 rounded-xl border mb-6 flex items-start gap-4 ${
                      answerCorrect
                        ? 'bg-green-500/10 border-green-500/20'
                        : 'bg-red-500/10 border-red-500/20'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-full shrink-0 ${
                        answerCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      }`}
                    >
                      {answerCorrect ? <CheckCircle size={20} /> : <XCircle size={20} />}
                    </div>
                    <div>
                      <h4 className={`font-bold mb-1 ${answerCorrect ? 'text-green-400' : 'text-red-400'}`}>
                        Answer: {answerCorrect ? 'Correct!' : 'Incorrect'}
                      </h4>
                      <p className="text-discord-textMuted text-sm leading-relaxed">
                        {currentQuestion.explanation}
                      </p>
                    </div>
                  </div>

                  {/* Reasoning Evaluation */}
                  {evaluation && (
                    <div className="p-6 rounded-xl border border-blue-500/20 bg-blue-500/10 mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-blue-400 flex items-center gap-2">
                          <Star className="fill-current" size={20} />
                          Reasoning Quality
                        </h4>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={20}
                              className={
                                star <= evaluation.score
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-600'
                              }
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-discord-textMuted text-sm leading-relaxed mb-4">
                        {evaluation.feedback}
                      </p>

                      {evaluation.strengths.length > 0 && (
                        <div className="mb-3">
                          <p className="text-green-400 font-bold text-sm mb-2">✓ Strengths:</p>
                          <ul className="space-y-1">
                            {evaluation.strengths.map((strength: string, i: number) => (
                              <li key={i} className="text-sm text-discord-textMuted pl-4">
                                • {strength}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {evaluation.improvements.length > 0 && (
                        <div>
                          <p className="text-yellow-400 font-bold text-sm mb-2">→ Could improve:</p>
                          <ul className="space-y-1">
                            {evaluation.improvements.map((improvement: string, i: number) => (
                              <li key={i} className="text-sm text-discord-textMuted pl-4">
                                • {improvement}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

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
                </>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ExplainAnswerQuiz;
