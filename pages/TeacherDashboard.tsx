import React, { useState, useEffect } from 'react';
import { UserPreferences, Classroom, TeacherStats, ViewState } from '../types';
import { StorageService } from '../services/storageService';
import { Users, BookOpen, Mail, Share2, Plus, ArrowRight, Loader2, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';

interface TeacherDashboardProps {
  user: UserPreferences;
  onNavigate: (view: ViewState | "folders", classroomId?: string) => void;
}

interface StatCard {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ComponentType<{ size: number }>;
  color: string;
  bg: string;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, onNavigate }) => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [classroomsData, statsData] = await Promise.all([
        StorageService.getClassrooms(user.id),
        StorageService.getTeacherStats(user.id)
      ]);
      setClassrooms(classroomsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading teacher data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards: StatCard[] = [
    {
      label: 'Total Classrooms',
      value: String(stats?.totalClassrooms ?? 0),
      icon: GraduationCap,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10'
    },
    {
      label: 'Total Students',
      value: String(stats?.totalStudents ?? 0),
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10'
    },
    {
      label: 'Pending Invitations',
      value: String(stats?.pendingInvitations ?? 0),
      icon: Mail,
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/10'
    },
    {
      label: 'Resources Shared',
      value: String(stats?.totalResourcesShared ?? 0),
      icon: Share2,
      color: 'text-green-400',
      bg: 'bg-green-400/10'
    }
  ];

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-[#5865F2]" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            Welcome back, {user?.name || 'Teacher'} <span className="animate-wave origin-bottom-right inline-block">👋</span>
          </h1>
          <p className="text-gray-400 mt-1">
            Manage your classrooms and track student progress
          </p>
        </div>
        <button
          onClick={() => onNavigate('classrooms')}
          className="bg-[#5865F2] hover:bg-[#4752c4] text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-[#5865F2]/20"
        >
          <Plus size={20} />
          Create Classroom
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-[#2b2d31] border border-white/5 rounded-xl p-6 hover:border-white/10 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-2">{card.label}</p>
                  <p className="text-3xl font-bold text-white">{card.value}</p>
                  {card.subtext && (
                    <p className="text-xs text-gray-500 mt-1">{card.subtext}</p>
                  )}
                </div>
                <div className={`${card.bg} ${card.color} p-3 rounded-lg`}>
                  <Icon size={24} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Classrooms Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <GraduationCap size={28} />
            Your Classrooms
          </h2>
          {classrooms.length > 0 && (
            <button
              onClick={() => onNavigate('classrooms')}
              className="text-[#5865F2] hover:text-white transition-colors flex items-center gap-1 text-sm font-medium"
            >
              View All <ArrowRight size={16} />
            </button>
          )}
        </div>

        {classrooms.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#2b2d31] border border-white/5 rounded-xl p-12 text-center"
          >
            <div className="w-20 h-20 bg-[#5865F2]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap size={40} className="text-[#5865F2]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Classrooms Yet</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Create your first classroom to start inviting students and sharing resources
            </p>
            <button
              onClick={() => onNavigate('classrooms')}
              className="bg-[#5865F2] hover:bg-[#4752c4] text-white px-6 py-3 rounded-xl font-medium transition-all inline-flex items-center gap-2"
            >
              <Plus size={20} />
              Create Your First Classroom
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classrooms.slice(0, 6).map((classroom, index) => (
              <motion.button
                key={classroom.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onNavigate('classroomDetail', classroom.id)}
                className="bg-[#2b2d31] border border-white/5 rounded-xl p-6 hover:border-[#5865F2]/50 hover:bg-[#2b2d31]/80 transition-all text-left group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-[#5865F2]/10 rounded-lg flex items-center justify-center">
                    <GraduationCap size={24} className="text-[#5865F2]" />
                  </div>
                  <ArrowRight size={20} className="text-gray-500 group-hover:text-[#5865F2] transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">
                  {classroom.name}
                </h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {classroom.description || 'No description'}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users size={14} />
                    {classroom.studentIds.length} students
                  </span>
                  <span>
                    Updated {new Date(classroom.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
