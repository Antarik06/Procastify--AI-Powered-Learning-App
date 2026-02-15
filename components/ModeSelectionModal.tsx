import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Edit3, MessageSquare, ArrowLeftRight } from 'lucide-react';
import { QuizModeType } from '../types';

interface ModeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: QuizModeType) => void;
  currentMode: QuizModeType;
}

interface ModeOption {
  id: QuizModeType;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const ModeSelectionModal: React.FC<ModeSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectMode,
  currentMode,
}) => {
  const modes: ModeOption[] = [
    {
      id: 'swipe',
      name: 'Swipe',
      description: 'Quick True/False questions with swipe gestures',
      icon: <ArrowLeftRight size={24} />,
      color: 'from-purple-500 to-pink-500',
    },
    {
      id: 'fillBlanks',
      name: 'Fill in the Blanks',
      description: 'Type missing words to test your recall',
      icon: <Edit3 size={24} />,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'explain',
      name: 'Explain Your Answer',
      description: 'Select an answer and explain your reasoning',
      icon: <MessageSquare size={24} />,
      color: 'from-green-500 to-emerald-500',
    },
  ];

  const handleSelectMode = (mode: QuizModeType) => {
    onSelectMode(mode);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-[#2b2d31] rounded-2xl border border-white/10 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-[#2b2d31] border-b border-white/10 p-6 flex items-center justify-between z-10">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Zap className="text-yellow-400" size={24} />
                Choose Your Quiz Mode
              </h2>
              <p className="text-discord-textMuted text-sm mt-1">
                Select a quiz style that matches your learning goals
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors text-discord-textMuted hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          {/* Mode Cards */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {modes.map((mode) => {
              const isSelected = currentMode === mode.id;
              
              return (
                <motion.button
                  key={mode.id}
                  onClick={() => handleSelectMode(mode.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    relative p-6 rounded-xl border-2 transition-all text-left
                    ${
                      isSelected
                        ? 'border-discord-accent bg-discord-accent/10 shadow-lg shadow-discord-accent/20'
                        : 'border-white/10 bg-discord-panel hover:bg-discord-hover hover:border-white/20'
                    }
                  `}
                >
                  {/* Icon with gradient background */}
                  <div
                    className={`
                      w-12 h-12 rounded-xl flex items-center justify-center mb-4
                      bg-gradient-to-br ${mode.color} shadow-lg
                    `}
                  >
                    <div className="text-white">{mode.icon}</div>
                  </div>

                  {/* Mode Name */}
                  <h3 className="text-lg font-bold text-white mb-2">
                    {mode.name}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-discord-textMuted leading-relaxed">
                    {mode.description}
                  </p>

                  {/* Selected Indicator */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-4 right-4 w-6 h-6 bg-discord-accent rounded-full flex items-center justify-center"
                    >
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M5 13l4 4L19 7"></path>
                      </svg>
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-[#2b2d31] border-t border-white/10 p-6">
            <p className="text-xs text-discord-textMuted text-center">
              You can change the mode anytime from the quiz setup screen
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ModeSelectionModal;
