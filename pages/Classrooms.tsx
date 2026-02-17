import React, { useState, useEffect } from 'react';
import { UserPreferences } from '../types';
import { ClassroomService } from '../services/classroomService';
import { Classroom, VirtualClassLink } from '../types';
import { GraduationCap, Plus, Users, Copy, Check, X, ExternalLink, Calendar, Edit2, Trash2, Video } from 'lucide-react';
import VirtualClassLinks from '../components/VirtualClassLinks';

interface ClassroomsProps {
  user: UserPreferences;
  onNavigate: (view: any) => void;
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
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'links' | 'announcements' | 'resources'>('overview');
  
  // Create classroom form
  const [className, setClassName] = useState('');
  const [classDescription, setClassDescription] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Join classroom form
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [creatingTest, setCreatingTest] = useState(false);

  useEffect(() => {
    loadClassrooms();
  }, [user]);

  const loadClassrooms = async () => {
    setLoading(true);
    try {
      // Check if user has a role
      if (!user.role) {
        console.warn('User does not have a role set');
        setClassrooms([]);
        setLoading(false);
        return;
      }

      // Guest users can't use Firestore features - show message
      if (user.isGuest) {
        console.warn('Guest users cannot access classrooms. Please sign up to use this feature.');
        setClassrooms([]);
        setLoading(false);
        return;
      }

      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      let classroomsResult: Classroom[] = [];
      
      if (user.role === 'teacher') {
        classroomsResult = await Promise.race([
          ClassroomService.getTeacherClassrooms(user.id),
          timeoutPromise
        ]) as Classroom[];
      } else if (user.role === 'student') {
        classroomsResult = await Promise.race([
          ClassroomService.getStudentClassrooms(user.id),
          timeoutPromise
        ]) as Classroom[];
      }
      
      setClassrooms(classroomsResult);
    } catch (error: any) {
      console.error('Error loading classrooms:', error);
      setClassrooms([]);
      // Show error message if it's not just an empty result
      if (error.message && error.message !== 'Request timeout') {
        console.error('Detailed error:', error);
      }
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

  const handleCreateClassroom = async () => {
    if (!className.trim()) return;
    if (user.isGuest) {
      alert('Guest users cannot create classrooms. Please sign up first.');
      return;
    }
    
    setCreating(true);
    try {
      const newClassroom = await ClassroomService.createClassroom(
        user.id,
        user.name,
        className.trim(),
        classDescription.trim() || undefined
      );
      setClassrooms([...classrooms, newClassroom]);
      setShowCreateModal(false);
      setClassName('');
      setClassDescription('');
    } catch (error: any) {
      console.error('Error creating classroom:', error);
      alert(`Failed to create classroom: ${error.message || 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinClassroom = async () => {
    if (!inviteCode.trim()) return;
    
    setJoining(true);
    setJoinError('');
    try {
      const classroom = await ClassroomService.joinClassroomByCode(inviteCode.trim().toUpperCase(), user.id);
      if (classroom) {
        await loadClassrooms();
        setShowJoinModal(false);
        setInviteCode('');
      } else {
        setJoinError('Invalid invite code. Please check and try again.');
      }
    } catch (error) {
      console.error('Error joining classroom:', error);
      setJoinError('Failed to join classroom. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleDeleteClassroom = async (classroomId: string) => {
    if (!confirm('Are you sure you want to delete this classroom? This action cannot be undone.')) return;
    
    try {
      await ClassroomService.deleteClassroom(classroomId);
      setClassrooms(classrooms.filter(c => c.id !== classroomId));
      if (selectedClassroom?.id === classroomId) {
        setSelectedClassroom(null);
      }
    } catch (error) {
      console.error('Error deleting classroom:', error);
    }
  };

  const createTestClassroom = async () => {
    if (user.role !== 'teacher') return;
    if (user.isGuest) {
      alert('Guest users cannot create classrooms. Please sign up first.');
      return;
    }
    
    setCreatingTest(true);
    try {
      // Create test classroom
      const testClassroom = await ClassroomService.createClassroom(
        user.id,
        user.name,
        'Test Mathematics 101',
        'This is a test classroom for Mathematics 101. Join to test the classroom features including virtual class links, announcements, and resources.'
      );

      // Add sample virtual links
      const sampleLinks = [
        {
          title: 'Weekly Math Review Session',
          url: 'https://zoom.us/j/1234567890',
          description: 'Join us every Monday at 3 PM for a comprehensive review of the week\'s topics',
          scheduledDate: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days from now
          createdBy: user.id
        },
        {
          title: 'Office Hours - Google Meet',
          url: 'https://meet.google.com/abc-defg-hij',
          description: 'Drop-in office hours for questions and help',
          scheduledDate: Date.now() + (2 * 24 * 60 * 60 * 1000), // 2 days from now
          createdBy: user.id
        },
        {
          title: 'Final Exam Review',
          url: 'https://zoom.us/j/9876543210',
          description: 'Comprehensive review session before the final exam',
          scheduledDate: Date.now() + (14 * 24 * 60 * 60 * 1000), // 14 days from now
          createdBy: user.id
        }
      ];

      for (const linkData of sampleLinks) {
        await ClassroomService.addVirtualLink(testClassroom.id, linkData);
      }

      // Reload classrooms
      await loadClassrooms();
      
      // Select the new classroom
      const updated = await ClassroomService.getClassroom(testClassroom.id);
      if (updated) {
        setSelectedClassroom(updated);
      }
      
      alert(`✅ Test classroom created!\n\nName: ${testClassroom.name}\nInvite Code: ${testClassroom.inviteCode}\n\n3 sample virtual links have been added.`);
    } catch (error) {
      console.error('Error creating test classroom:', error);
      alert('Failed to create test classroom. Check console for details.');
    } finally {
      setCreatingTest(false);
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  // Show message if user doesn't have a role
  if (!user.role) {
    return (
      <div className="min-h-screen bg-[#1e1f22] text-white p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <GraduationCap className="mx-auto text-gray-600 mb-4" size={64} />
          <h2 className="text-2xl font-bold mb-2">Role Not Set</h2>
          <p className="text-gray-400 mb-4">
            Please select your role (Teacher or Student) to access classrooms.
          </p>
          <p className="text-sm text-gray-500">
            If you just signed up, please refresh the page or log out and log back in.
          </p>
        </div>
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

  // Show message for guest users
  if (user.isGuest) {
    return (
      <div className="min-h-screen bg-[#1e1f22] text-white p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <GraduationCap className="mx-auto text-gray-600 mb-4" size={64} />
          <h2 className="text-2xl font-bold mb-2">Sign Up Required</h2>
          <p className="text-gray-400 mb-4">
            Classrooms feature requires an account. Guest mode data is stored locally only and cannot access cloud features like classrooms.
          </p>
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-6 py-3 bg-[#5865F2] hover:bg-[#4752c4] rounded-xl font-medium"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1e1f22] flex items-center justify-center">
        <div className="text-center">
          <div className="text-white mb-2">Loading classrooms...</div>
          <div className="text-gray-400 text-sm">This may take a few seconds</div>
        </div>
      </div>
    );
  }

  if (selectedClassroom) {
    return (
      <div className="min-h-screen bg-[#1e1f22] text-white p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedClassroom(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
              <h1 className="text-3xl font-bold">{selectedClassroom.name}</h1>
            </div>
            {user.role === 'teacher' && selectedClassroom.teacherId === user.id && (
              <button
                onClick={() => handleDeleteClassroom(selectedClassroom.id)}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
              >
                <Trash2 size={18} className="inline mr-2" />
                Delete Classroom
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-white/10">
            {(['overview', 'links', 'announcements', 'resources'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-[#5865F2] border-b-2 border-[#5865F2]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {selectedClassroom.description && (
                <div className="bg-[#2b2d31] p-6 rounded-xl">
                  <h2 className="text-xl font-bold mb-2">Description</h2>
                  <p className="text-gray-300">{selectedClassroom.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#2b2d31] p-6 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="text-[#5865F2]" size={24} />
                    <h3 className="font-bold">Students</h3>
                  </div>
                  <p className="text-3xl font-bold">{selectedClassroom.studentIds.length}</p>
                </div>
                
                <div className="bg-[#2b2d31] p-6 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Video className="text-[#5865F2]" size={24} />
                    <h3 className="font-bold">Class Links</h3>
                  </div>
                  <p className="text-3xl font-bold">{selectedClassroom.virtualLinks.length}</p>
                </div>
                
                <div className="bg-[#2b2d31] p-6 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <GraduationCap className="text-[#5865F2]" size={24} />
                    <h3 className="font-bold">Teacher</h3>
                  </div>
                  <p className="text-lg">{selectedClassroom.teacherName}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'links' && (
            <VirtualClassLinks
              classroom={selectedClassroom}
              user={user}
              onUpdate={async () => {
                const updated = await ClassroomService.getClassroom(selectedClassroom.id);
                if (updated) setSelectedClassroom(updated);
              }}
            />
          )}

          {activeTab === 'announcements' && (
            <div className="bg-[#2b2d31] p-6 rounded-xl">
              <p className="text-gray-400">Announcements feature coming soon...</p>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="bg-[#2b2d31] p-6 rounded-xl">
              <p className="text-gray-400">Resources feature coming soon...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1e1f22] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Classrooms</h1>
            <p className="text-gray-400">
              {user.role === 'teacher' 
                ? 'Create and manage your classrooms' 
                : 'Join classrooms and access learning materials'}
            </p>
          </div>
          <div className="flex gap-3">
            {user.role === 'student' && (
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-6 py-3 bg-[#5865F2] hover:bg-[#4752c4] rounded-xl font-medium transition-colors"
              >
                Join Classroom
              </button>
            )}
            {user.role === 'teacher' && !user.isGuest && (
              <>
                <button
                  onClick={createTestClassroom}
                  disabled={creatingTest}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                  title="Create a test classroom with sample data"
                >
                  {creatingTest ? 'Creating...' : '🧪 Create Test Classroom'}
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-[#5865F2] hover:bg-[#4752c4] rounded-xl font-medium transition-colors flex items-center gap-2"
                >
                  <Plus size={20} />
                  Create Classroom
                </button>
              </>
            )}
          </div>
        </div>

        {/* Classrooms Grid */}
        {classrooms.length === 0 ? (
          <div className="text-center py-20">
            <GraduationCap className="mx-auto text-gray-600 mb-4" size={64} />
            <h2 className="text-2xl font-bold mb-2">No Classrooms Yet</h2>
            <p className="text-gray-400 mb-6">
              {user.role === 'teacher'
                ? 'Create your first classroom to get started'
                : 'Join a classroom using an invite code'}
            </p>
            {user.role === 'teacher' && !user.isGuest ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-[#5865F2] hover:bg-[#4752c4] rounded-xl font-medium"
              >
                Create Classroom
              </button>
            ) : user.role === 'student' && !user.isGuest ? (
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-6 py-3 bg-[#5865F2] hover:bg-[#4752c4] rounded-xl font-medium"
              >
                Join Classroom
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classrooms.map(classroom => (
              <div
                key={classroom.id}
                onClick={() => setSelectedClassroom(classroom)}
                className="bg-[#2b2d31] p-6 rounded-xl cursor-pointer hover:bg-[#36393f] transition-colors border border-white/5"
              >
                <h3 className="text-xl font-bold mb-2">{classroom.name}</h3>
                {classroom.description && (
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{classroom.description}</p>
                )}
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Users size={16} />
                      {classroom.studentIds.length} students
                    </span>
                    <span className="flex items-center gap-1">
                      <Video size={16} />
                      {classroom.virtualLinks.length} links
                    </span>
                  </div>
                </div>
                {user.role === 'teacher' && classroom.teacherId === user.id && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Invite Code:</span>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono bg-black/30 px-2 py-1 rounded">
                          {classroom.inviteCode}
                        </code>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyInviteCode(classroom.inviteCode);
                          }}
                          className="text-gray-400 hover:text-white"
                          title="Copy invite code"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create Classroom Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#2b2d31] p-8 rounded-2xl w-full max-w-md border border-white/10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Create Classroom</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Classroom Name *</label>
                  <input
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#5865F2]"
                    placeholder="e.g., Math 101"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description (Optional)</label>
                  <textarea
                    value={classDescription}
                    onChange={(e) => setClassDescription(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#5865F2] resize-none"
                    placeholder="Brief description of the classroom"
                    rows={3}
                  />
                </div>
                
                <button
                  onClick={handleCreateClassroom}
                  disabled={!className.trim() || creating}
                  className="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Classroom'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Join Classroom Modal */}
        {showJoinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#2b2d31] p-8 rounded-2xl w-full max-w-md border border-white/10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Join Classroom</h2>
                <button onClick={() => setShowJoinModal(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Invite Code</label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#5865F2] font-mono text-center text-lg tracking-wider"
                    placeholder="ABC123"
                    maxLength={6}
                  />
                </div>
                
                {joinError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
                    {joinError}
                  </div>
                )}
                
                <button
                  onClick={handleJoinClassroom}
                  disabled={!inviteCode.trim() || joining}
                  className="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                >
                  {joining ? 'Joining...' : 'Join Classroom'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <GraduationCap size={32} />
            My Classrooms
          </h1>
          <p className="text-gray-400 mt-1">
            Manage your classrooms and invite students
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#5865F2] hover:bg-[#4752c4] text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-[#5865F2]/20"
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
            onClick={() => setShowCreateModal(true)}
            className="bg-[#5865F2] hover:bg-[#4752c4] text-white px-6 py-3 rounded-xl font-medium transition-all inline-flex items-center gap-2"
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
              className="bg-[#2b2d31] rounded-xl p-8 max-w-md w-full border border-white/10"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Create Classroom</h2>
                <button
                  onClick={() => !saving && setShowCreateModal(false)}
                  disabled={saving}
                  className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
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
                    className="w-full bg-[#1e1f22] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#5865F2] transition-colors placeholder:text-gray-600"
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
                    className="w-full bg-[#1e1f22] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#5865F2] transition-colors placeholder:text-gray-600 resize-none"
                    disabled={saving}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    disabled={saving}
                    className="flex-1 bg-[#1e1f22] hover:bg-[#1e1f22]/80 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !formData.name.trim()}
                    className="flex-1 bg-[#5865F2] hover:bg-[#4752c4] text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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

