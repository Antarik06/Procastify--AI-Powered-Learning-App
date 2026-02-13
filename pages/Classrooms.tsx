import React, { useState, useEffect } from 'react';
import { UserPreferences, Classroom, ViewState } from '../types';
import { StorageService } from '../services/storageService';
import { GraduationCap, Plus, Users, X, Loader2, ArrowRight, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ClassroomsProps {
  user: UserPreferences;
  onNavigate: (view: ViewState | "folders", classroomId?: string) => void;
}

const Classrooms: React.FC<ClassroomsProps> = ({ user, onNavigate }) => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadClassrooms();
  }, [user.id]);

  const loadClassrooms = async () => {
    try {
      setLoading(true);
      const data = await StorageService.getClassrooms(user.id);
      setClassrooms(data);
    } catch (error) {
      console.error('Error loading classrooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Classroom name is required');
      return;
    }

    if (formData.name.length > 100) {
      setError('Classroom name must be less than 100 characters');
      return;
    }

    try {
      setSaving(true);
      setError('');
      
      const newClassroom: Classroom = {
        id: Date.now().toString(),
        teacherId: user.id,
        teacherName: user.name,
        name: formData.name.trim(),
        description: formData.description.trim(),
        studentIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      console.log('Creating classroom:', newClassroom);
      await StorageService.saveClassroom(newClassroom);
      console.log('Classroom saved, reloading list...');
      await loadClassrooms();
      console.log('Classrooms reloaded');
      
      setShowCreateModal(false);
      setFormData({ name: '', description: '' });
    } catch (error: any) {
      console.error('Error creating classroom:', error);
      setError(error.message || 'Failed to create classroom');
      alert('Error: ' + (error.message || 'Failed to create classroom'));
    } finally {
      setSaving(false);
    }
  };

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-app-text flex items-center gap-2">
            <GraduationCap size={32} />
            My Classrooms
          </h1>
          <p className="text-gray-400 mt-1">
            Manage your classrooms and invite students
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#5865F2] hover:bg-[#4752c4] text-app-text px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-[#5865F2]/20"
        >
          <Plus size={20} />
          Create Classroom
        </button>
      </div>

      {/* Classrooms Grid */}
      {classrooms.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-app-panel border border-app-border rounded-xl p-12 text-center"
        >
          <div className="w-20 h-20 bg-[#5865F2]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap size={40} className="text-[#5865F2]" />
          </div>
          <h3 className="text-xl font-bold text-app-text mb-2">No Classrooms Yet</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Create your first classroom to start inviting students and sharing resources
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#5865F2] hover:bg-[#4752c4] text-app-text px-6 py-3 rounded-xl font-medium transition-all inline-flex items-center gap-2"
          >
            <Plus size={20} />
            Create Your First Classroom
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classrooms.map((classroom, index) => (
            <motion.button
              key={classroom.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onNavigate('classroomDetail', classroom.id)}
              className="bg-app-panel border border-app-border rounded-xl p-6 hover:border-[#5865F2]/50 hover:bg-app-panel/80 transition-all text-left group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-[#5865F2]/10 rounded-lg flex items-center justify-center">
                  <GraduationCap size={24} className="text-[#5865F2]" />
                </div>
                <ArrowRight size={20} className="text-gray-500 group-hover:text-[#5865F2] transition-colors" />
              </div>
              <h3 className="text-lg font-bold text-app-text mb-2 line-clamp-1">
                {classroom.name}
              </h3>
              <p className="text-gray-400 text-sm mb-4 line-clamp-2 min-h-[40px]">
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

      {/* Create Classroom Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !saving && setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-app-panel rounded-xl p-8 max-w-md w-full border border-app-border"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-app-text">Create Classroom</h2>
                <button
                  onClick={() => !saving && setShowCreateModal(false)}
                  disabled={saving}
                  className="text-gray-400 hover:text-app-text transition-colors disabled:opacity-50"
                >
                  <X size={24} />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateClassroom} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Classroom Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Introduction to React"
                    maxLength={100}
                    className="w-full bg-[#1e1f22] border border-app-border rounded-lg px-4 py-3 text-app-text focus:outline-none focus:border-[#5865F2] transition-colors placeholder:text-gray-600"
                    disabled={saving}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.name.length}/100 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the classroom..."
                    rows={4}
                    className="w-full bg-[#1e1f22] border border-app-border rounded-lg px-4 py-3 text-app-text focus:outline-none focus:border-[#5865F2] transition-colors placeholder:text-gray-600 resize-none"
                    disabled={saving}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    disabled={saving}
                    className="flex-1 bg-[#1e1f22] hover:bg-[#1e1f22]/80 text-app-text py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !formData.name.trim()}
                    className="flex-1 bg-[#5865F2] hover:bg-[#4752c4] text-app-text py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus size={20} />
                        Create
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Classrooms;
