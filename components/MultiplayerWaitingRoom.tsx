import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MultiplayerQuizSession, UserPreferences } from '../types';
import { FirebaseService } from '../services/firebaseService';
import { Users, Copy, Play, Loader2, Crown, CheckCircle, Clock } from 'lucide-react';

interface MultiplayerWaitingRoomProps {
  session: MultiplayerQuizSession;
  user: UserPreferences;
  isHost: boolean;
  onStart: () => void;
  onExit: () => void;
}

const MultiplayerWaitingRoom: React.FC<MultiplayerWaitingRoomProps> = ({
  session,
  user,
  isHost,
  onStart,
  onExit,
}) => {
  const [currentSession, setCurrentSession] = useState(session);
  const [copying, setCopying] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Poll for session updates every 2 seconds
    const interval = setInterval(async () => {
      const updated = await FirebaseService.getQuizSession(session.id);
      if (updated) {
        setCurrentSession(updated);
        
        // Check if current user is still in the session
        const userStillInSession = updated.participants.some(p => p.userId === user.id);
        if (!userStillInSession) {
          // User was removed or left, exit waiting room
          onExit();
          return;
        }
        
        // If quiz started, trigger onStart
        if (updated.status === 'in_progress' && currentSession.status === 'waiting') {
          onStart();
        }
      } else {
        // Session was deleted (no participants left)
        onExit();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [session.id, user.id, currentSession.status]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentSession.inviteCode);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const handleLeaveRoom = async () => {
    setLeaving(true);
    try {
      await FirebaseService.leaveQuizSession(session.id, user.id);
      onExit();
    } catch (error) {
      console.error('Error leaving room:', error);
      setLeaving(false);
      // Still exit even if there's an error
      onExit();
    }
  };

  const handleStartQuiz = async () => {
    if (!isHost) return;
    
    // Double-check participant count
    if (currentSession.participants.length < 2) {
      alert('Need at least 2 participants to start the quiz');
      return;
    }
    
    try {
      await FirebaseService.updateQuizSession(session.id, {
        status: 'in_progress',
        startedAt: Date.now(),
        currentQuestionIndex: 0,
      });
      onStart();
    } catch (error) {
      console.error('Error starting quiz:', error);
      alert('Failed to start quiz');
    }
  };

  return (
    <div className="h-full flex flex-col p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-[#5865F2]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users size={40} className="text-[#5865F2]" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Waiting Room</h1>
        <p className="text-gray-400">{currentSession.title}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="px-3 py-1 bg-[#5865F2]/10 text-[#5865F2] rounded-full text-sm font-medium capitalize">
            {currentSession.mode}
          </span>
          <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 rounded-full text-sm font-medium capitalize">
            {currentSession.difficulty}
          </span>
        </div>
      </div>

      {/* Invite Code */}
      <div className="bg-[#2b2d31] border border-white/5 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Invite Code</h3>
            <p className="text-gray-400 text-sm">Share this code with others to join</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-[#1e1f22] border border-white/10 rounded-lg p-4">
            <p className="text-3xl font-mono font-bold text-[#5865F2] tracking-wider text-center">
              {currentSession.inviteCode}
            </p>
          </div>
          <button
            onClick={handleCopyCode}
            className="bg-[#5865F2] hover:bg-[#4752c4] text-white px-6 py-4 rounded-lg transition-colors flex items-center gap-2 font-medium"
          >
            {copying ? <CheckCircle size={18} /> : <Copy size={18} />}
            {copying ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Participants List */}
      <div className="flex-1 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Users size={24} />
            Participants ({currentSession.participants.length})
          </h3>
        </div>

        <div className="space-y-3">
          {currentSession.participants.map((participant, index) => (
            <motion.div
              key={participant.userId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-[#2b2d31] border border-white/5 rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#5865F2]/10 rounded-full flex items-center justify-center">
                  <span className="text-[#5865F2] font-bold text-lg">
                    {participant.userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium">{participant.userName}</p>
                    {participant.userId === currentSession.hostId && (
                      <Crown size={16} className="text-yellow-400" />
                    )}
                  </div>
                  <p className="text-gray-500 text-xs">
                    Joined {new Date(participant.joinedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-gray-500" />
                <span className="text-gray-400 text-sm">Ready</span>
              </div>
            </motion.div>
          ))}

          {currentSession.participants.length === 1 && (
            <div className="bg-[#2b2d31]/50 border border-white/5 border-dashed rounded-xl p-8 text-center">
              <Users size={40} className="mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400">Waiting for others to join...</p>
              <p className="text-gray-500 text-sm mt-1">Share the invite code above</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleLeaveRoom}
          disabled={leaving}
          className="flex-1 bg-[#2b2d31] hover:bg-[#1e1f22] text-white py-4 rounded-xl font-bold transition-colors border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {leaving ? <Loader2 className="animate-spin" size={18} /> : null}
          {leaving ? 'Leaving...' : 'Leave Room'}
        </button>
        {isHost && (
          <button
            onClick={handleStartQuiz}
            disabled={currentSession.participants.length < 2}
            className="flex-1 bg-[#5865F2] hover:bg-[#4752c4] text-white py-4 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Play size={20} fill="currentColor" />
            Start Quiz
          </button>
        )}
        {!isHost && (
          <div className="flex-1 bg-[#2b2d31] border border-white/10 rounded-xl py-4 px-6 flex items-center justify-center gap-2">
            <Loader2 className="animate-spin text-[#5865F2]" size={20} />
            <span className="text-gray-400 font-medium">Waiting for host to start...</span>
          </div>
        )}
      </div>

      {isHost && currentSession.participants.length < 2 && (
        <p className="text-center text-gray-500 text-sm mt-4">
          Need at least 2 participants to start the quiz
        </p>
      )}
    </div>
  );
};

export default MultiplayerWaitingRoom;
