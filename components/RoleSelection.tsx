import React, { useState } from 'react';
import { GraduationCap, User, X } from 'lucide-react';
import { UserRole } from '../types';

interface RoleSelectionProps {
  onSelect: (role: UserRole) => void;
  onClose?: () => void;
  userName?: string;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ onSelect, onClose, userName }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const handleConfirm = () => {
    if (selectedRole) {
      onSelect(selectedRole);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#1e1f22] p-8 rounded-2xl w-full max-w-md border border-white/10 shadow-2xl">
        {onClose && (
          <div className="flex justify-end mb-4">
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
        )}
        
        <h2 className="text-2xl font-bold text-white mb-2">
          Choose Your Role
        </h2>
        <p className="text-gray-400 mb-6">
          {userName ? `Welcome, ${userName}!` : 'Welcome!'} Select your role to get started.
        </p>

        <div className="space-y-4 mb-6">
          <button
            onClick={() => setSelectedRole('teacher')}
            className={`w-full p-6 rounded-xl border-2 transition-all ${
              selectedRole === 'teacher'
                ? 'border-[#5865F2] bg-[#5865F2]/10'
                : 'border-white/10 bg-black/20 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${
                selectedRole === 'teacher' ? 'bg-[#5865F2]' : 'bg-gray-700'
              }`}>
                <GraduationCap className="text-white" size={24} />
              </div>
              <div className="text-left flex-1">
                <h3 className="text-lg font-bold text-white mb-1">Teacher</h3>
                <p className="text-sm text-gray-400">
                  Create classrooms, share resources, and manage students
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedRole('student')}
            className={`w-full p-6 rounded-xl border-2 transition-all ${
              selectedRole === 'student'
                ? 'border-[#5865F2] bg-[#5865F2]/10'
                : 'border-white/10 bg-black/20 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${
                selectedRole === 'student' ? 'bg-[#5865F2]' : 'bg-gray-700'
              }`}>
                <User className="text-white" size={24} />
              </div>
              <div className="text-left flex-1">
                <h3 className="text-lg font-bold text-white mb-1">Student</h3>
                <p className="text-sm text-gray-400">
                  Join classrooms, access resources, and participate in learning
                </p>
              </div>
            </div>
          </button>
        </div>

        <button
          onClick={handleConfirm}
          disabled={!selectedRole}
          className="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default RoleSelection;

