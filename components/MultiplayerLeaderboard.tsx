import React from 'react';
import { motion } from 'framer-motion';
import { QuizLeaderboard, UserPreferences } from '../types';
import { Trophy, Medal, Award, Clock, Target, TrendingUp } from 'lucide-react';

interface MultiplayerLeaderboardProps {
  leaderboard: QuizLeaderboard;
  user: UserPreferences;
  onPlayAgain: () => void;
  onExit: () => void;
}

const MultiplayerLeaderboard: React.FC<MultiplayerLeaderboardProps> = ({
  leaderboard,
  user,
  onPlayAgain,
  onExit,
}) => {
  const userRanking = leaderboard.rankings.find(r => r.userId === user.id);
  const topThree = leaderboard.rankings.slice(0, 3);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy size={24} className="text-yellow-400" />;
      case 2:
        return <Medal size={24} className="text-gray-400" />;
      case 3:
        return <Award size={24} className="text-orange-400" />;
      default:
        return null;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
      case 2:
        return 'bg-gray-500/10 border-gray-500/20 text-gray-400';
      case 3:
        return 'bg-orange-500/10 border-orange-500/20 text-orange-400';
      default:
        return 'bg-[#2b2d31] border-white/5 text-white';
    }
  };

  return (
    <div className="h-full flex flex-col p-8 max-w-5xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <Trophy size={80} className="text-yellow-400 mb-4 mx-auto drop-shadow-[0_0_30px_rgba(250,204,21,0.4)]" />
        <h1 className="text-4xl font-bold text-white mb-2">Quiz Complete!</h1>
        <p className="text-xl text-gray-400">Final Leaderboard</p>
      </div>

      {/* Top 3 Podium */}
      {topThree.length >= 3 && (
        <div className="flex items-end justify-center gap-4 mb-8">
          {/* 2nd Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <div className="w-20 h-20 bg-gray-500/10 rounded-full flex items-center justify-center mb-2 border-2 border-gray-500/20">
              <span className="text-2xl font-bold text-gray-400">
                {topThree[1].userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <Medal size={32} className="text-gray-400 mb-2" />
            <p className="text-white font-bold">{topThree[1].userName}</p>
            <p className="text-gray-400 text-sm">{topThree[1].score} pts</p>
            <div className="w-24 h-20 bg-gray-500/10 border-2 border-gray-500/20 rounded-t-xl mt-2 flex items-center justify-center">
              <span className="text-3xl font-bold text-gray-400">2</span>
            </div>
          </motion.div>

          {/* 1st Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center"
          >
            <div className="w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center mb-2 border-2 border-yellow-500/20">
              <span className="text-3xl font-bold text-yellow-400">
                {topThree[0].userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <Trophy size={40} className="text-yellow-400 mb-2" />
            <p className="text-white font-bold text-lg">{topThree[0].userName}</p>
            <p className="text-yellow-400 text-sm font-bold">{topThree[0].score} pts</p>
            <div className="w-28 h-28 bg-yellow-500/10 border-2 border-yellow-500/20 rounded-t-xl mt-2 flex items-center justify-center">
              <span className="text-4xl font-bold text-yellow-400">1</span>
            </div>
          </motion.div>

          {/* 3rd Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center"
          >
            <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mb-2 border-2 border-orange-500/20">
              <span className="text-2xl font-bold text-orange-400">
                {topThree[2].userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <Award size={32} className="text-orange-400 mb-2" />
            <p className="text-white font-bold">{topThree[2].userName}</p>
            <p className="text-gray-400 text-sm">{topThree[2].score} pts</p>
            <div className="w-24 h-16 bg-orange-500/10 border-2 border-orange-500/20 rounded-t-xl mt-2 flex items-center justify-center">
              <span className="text-3xl font-bold text-orange-400">3</span>
            </div>
          </motion.div>
        </div>
      )}

      {/* Your Performance */}
      {userRanking && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#5865F2]/10 border border-[#5865F2]/20 rounded-xl p-6 mb-8"
        >
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            Your Performance
          </h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-gray-400 text-xs font-bold uppercase mb-1">Rank</p>
              <p className="text-2xl font-bold text-[#5865F2]">#{userRanking.rank}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-xs font-bold uppercase mb-1">Score</p>
              <p className="text-2xl font-bold text-white">{userRanking.score}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-xs font-bold uppercase mb-1">Correct</p>
              <p className="text-2xl font-bold text-green-400">
                {userRanking.correctAnswers}/{userRanking.totalQuestions}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-xs font-bold uppercase mb-1">Avg Time</p>
              <p className="text-2xl font-bold text-white">{userRanking.averageTime.toFixed(1)}s</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Full Leaderboard */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Trophy size={24} />
          Full Rankings
        </h3>
        <div className="space-y-3">
          {leaderboard.rankings.map((ranking, index) => (
            <motion.div
              key={ranking.userId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-xl border flex items-center justify-between ${
                ranking.userId === user.id
                  ? 'bg-[#5865F2]/10 border-[#5865F2]/20'
                  : getRankColor(ranking.rank)
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 flex items-center justify-center">
                  {getRankIcon(ranking.rank) || (
                    <span className="text-2xl font-bold text-gray-500">#{ranking.rank}</span>
                  )}
                </div>
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
                  <span className="text-lg font-bold">
                    {ranking.userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-white font-bold">{ranking.userName}</p>
                  <p className="text-gray-400 text-sm">
                    {ranking.correctAnswers}/{ranking.totalQuestions} correct
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{ranking.score}</p>
                <p className="text-gray-400 text-xs flex items-center gap-1 justify-end">
                  <Clock size={12} />
                  {ranking.averageTime.toFixed(1)}s avg
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center pt-4 border-t border-white/5">
        <button
          onClick={onExit}
          className="px-8 py-3 bg-[#2b2d31] hover:bg-[#1e1f22] text-white rounded-xl font-bold transition-colors border border-white/10"
        >
          Exit
        </button>
        <button
          onClick={onPlayAgain}
          className="px-8 py-3 bg-[#5865F2] hover:bg-[#4752c4] text-white rounded-xl font-bold transition-colors shadow-lg"
        >
          Play Again
        </button>
      </div>
    </div>
  );
};

export default MultiplayerLeaderboard;
