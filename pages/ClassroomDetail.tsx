import React, { useState, useEffect } from 'react';
import { UserPreferences, Classroom, Announcement, ClassroomResource, Invitation, Note, ViewState } from '../types';
import { StorageService } from '../services/storageService';
import { ArrowLeft, Loader2, MessageSquare, Share2, Users, Mail, Plus, X, Send, Trash2, Calendar, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ClassroomDetailProps {
  user: UserPreferences;
  classroomId: string;
  onNavigate: (view: ViewState | "folders") => void;
}

const ClassroomDetail: React.FC<ClassroomDetailProps> = ({ user, classroomId, onNavigate }) => {
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'announcements' | 'resources' | 'students' | 'invitations'>('announcements');
  
  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  
  // Invitations
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  
  // Resources
  const [resources, setResources] = useState<ClassroomResource[]>([]);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [userNotes, setUserNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string>('');
  const [sharingResource, setSharingResource] = useState(false);

  // Students
  const [enrolledStudents, setEnrolledStudents] = useState<Array<{id: string, name: string, email: string}>>([]);

  useEffect(() => {
    loadClassroom();
    loadUserNotes();
  }, [classroomId]);

  useEffect(() => {
    if (classroom) {
      loadTabData();
    }
  }, [activeTab, classroom]);

  const loadClassroom = async () => {
    try {
      setLoading(true);
      const classrooms = await StorageService.getClassrooms(user.id);
      const found = classrooms.find(c => c.id === classroomId);
      setClassroom(found || null);
    } catch (error) {
      console.error('Error loading classroom:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserNotes = async () => {
    try {
      const notes = await StorageService.getNotes();
      console.log('Loaded notes for sharing:', notes.length);
      setUserNotes(notes);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const loadTabData = async () => {
    if (!classroom) return;

    try {
      switch (activeTab) {
        case 'announcements':
          const announcementsData = await StorageService.getAnnouncements(classroomId);
          setAnnouncements(announcementsData);
          break;
        case 'invitations':
          const invitationsData = await StorageService.getInvitations(user.id, 'teacher');
          setInvitations(invitationsData.filter(inv => inv.classroomId === classroomId));
          break;
        case 'resources':
          const resourcesData = await StorageService.getClassroomResources(classroomId);
          setResources(resourcesData);
          break;
        case 'students':
          await loadEnrolledStudents();
          break;
      }
    } catch (error) {
      console.error('Error loading tab data:', error);
    }
  };

  const loadEnrolledStudents = async () => {
    if (!classroom) return;
    
    try {
      const students: Array<{id: string, name: string, email: string}> = [];
      
      for (const studentId of classroom.studentIds) {
        try {
          const studentProfile = await StorageService.getUserProfile(studentId);
          if (studentProfile) {
            students.push({
              id: studentId,
              name: studentProfile.name,
              email: studentProfile.email || 'No email available'
            });
          }
        } catch (error) {
          console.error('Error loading student:', studentId, error);
        }
      }
      
      setEnrolledStudents(students);
    } catch (error) {
      console.error('Error loading enrolled students:', error);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!classroom || !announcementText.trim()) return;

    try {
      setSavingAnnouncement(true);
      const newAnnouncement: Announcement = {
        id: Date.now().toString(),
        classroomId: classroom.id,
        teacherId: user.id,
        teacherName: user.name,
        content: announcementText.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await StorageService.saveAnnouncement(newAnnouncement);
      
      // Log activity
      const { FirebaseService } = await import('../services/firebaseService');
      await FirebaseService.logActivity({
        classroomId: classroom.id,
        classroomName: classroom.name,
        type: 'announcement_posted',
        actorId: user.id,
        actorName: user.name,
        timestamp: Date.now(),
      });
      
      await loadTabData();
      setShowAnnouncementModal(false);
      setAnnouncementText('');
    } catch (error) {
      console.error('Error creating announcement:', error);
      alert('Failed to create announcement');
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!classroom || !confirm('Delete this announcement?')) return;

    try {
      await StorageService.deleteAnnouncement(classroom.id, announcementId);
      await loadTabData();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      alert('Failed to delete announcement');
    }
  };

  const handleSendInvitation = async () => {
    if (!classroom || !inviteEmail.trim()) return;

    try {
      setSendingInvite(true);
      const newInvitation: Invitation = {
        id: Date.now().toString(),
        classroomId: classroom.id,
        classroomName: classroom.name,
        teacherId: user.id,
        teacherName: user.name,
        studentEmail: inviteEmail.trim().toLowerCase(),
        status: 'pending',
        createdAt: Date.now()
      };

      await StorageService.sendInvitation(newInvitation);
      await loadTabData();
      setShowInviteModal(false);
      setInviteEmail('');
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('Failed to send invitation');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleShareResource = async () => {
    if (!classroom || !selectedNoteId) return;

    try {
      setSharingResource(true);
      const note = userNotes.find(n => n.id === selectedNoteId);
      if (!note) return;

      const newResource: ClassroomResource = {
        id: Date.now().toString(),
        classroomId: classroom.id,
        resourceType: 'note',
        resourceId: note.id,
        resourceTitle: note.title,
        sharedBy: user.id,
        sharedByName: user.name,
        sharedAt: Date.now()
      };

      await StorageService.shareResource(newResource);
      
      // Log activity
      const { FirebaseService } = await import('../services/firebaseService');
      await FirebaseService.logActivity({
        classroomId: classroom.id,
        classroomName: classroom.name,
        type: 'resource_shared',
        actorId: user.id,
        actorName: user.name,
        targetId: note.id,
        targetName: note.title,
        timestamp: Date.now(),
      });
      
      await loadTabData();
      setShowResourceModal(false);
      setSelectedNoteId('');
    } catch (error) {
      console.error('Error sharing resource:', error);
      alert('Failed to share resource');
    } finally {
      setSharingResource(false);
    }
  };

  const handleUnshareResource = async (resourceId: string) => {
    if (!classroom || !confirm('Unshare this resource?')) return;

    try {
      await StorageService.unshareResource(classroom.id, resourceId);
      await loadTabData();
    } catch (error) {
      console.error('Error unsharing resource:', error);
      alert('Failed to unshare resource');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-[#5865F2]" size={32} />
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-400">
          <p>Classroom not found</p>
          <button
            onClick={() => onNavigate('classrooms')}
            className="mt-4 text-[#5865F2] hover:text-app-text"
          >
            Back to Classrooms
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'announcements' as const, label: 'Announcements', icon: MessageSquare },
    { id: 'resources' as const, label: 'Resources', icon: Share2 },
    { id: 'students' as const, label: 'Students', icon: Users },
    { id: 'invitations' as const, label: 'Invitations', icon: Mail }
  ];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <button
          onClick={() => onNavigate('classrooms')}
          className="text-gray-400 hover:text-app-text flex items-center gap-2 mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Classrooms
        </button>
        <h1 className="text-3xl font-bold text-app-text">{classroom.name}</h1>
        <p className="text-gray-400 mt-2">{classroom.description || 'No description'}</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-app-border">
        <div className="flex gap-6">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 px-2 flex items-center gap-2 transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-[#5865F2] text-app-text'
                    : 'border-transparent text-gray-400 hover:text-app-text'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {/* Announcements Tab */}
        {activeTab === 'announcements' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-app-text">Announcements</h2>
              <button
                onClick={() => setShowAnnouncementModal(true)}
                className="bg-[#5865F2] hover:bg-[#4752c4] text-app-text px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus size={18} />
                New Announcement
              </button>
            </div>

            {announcements.length === 0 ? (
              <div className="bg-app-panel border border-app-border rounded-xl p-12 text-center">
                <MessageSquare size={48} className="mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400">No announcements yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map(announcement => (
                  <motion.div
                    key={announcement.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-app-panel border border-app-border rounded-xl p-6"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#5865F2]/10 rounded-full flex items-center justify-center">
                          <MessageSquare size={20} className="text-[#5865F2]" />
                        </div>
                        <div>
                          <p className="text-app-text font-medium">{announcement.teacherName}</p>
                          <p className="text-gray-500 text-xs flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(announcement.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <p className="text-gray-300 whitespace-pre-wrap">{announcement.content}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-app-text">Shared Resources</h2>
              <button
                onClick={() => setShowResourceModal(true)}
                className="bg-[#5865F2] hover:bg-[#4752c4] text-app-text px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus size={18} />
                Share Resource
              </button>
            </div>

            {resources.length === 0 ? (
              <div className="bg-app-panel border border-app-border rounded-xl p-12 text-center">
                <Share2 size={48} className="mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 mb-2">No resources shared yet</p>
                <p className="text-gray-500 text-sm">Share notes with your students to help them learn!</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {resources.map(resource => (
                  <motion.div
                    key={resource.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-app-panel border border-app-border rounded-xl p-5 hover:border-[#5865F2]/50 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-[#5865F2]/10 rounded-lg flex items-center justify-center">
                        <Share2 size={22} className="text-[#5865F2]" />
                      </div>
                      <button
                        onClick={() => handleUnshareResource(resource.id)}
                        className="text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <h3 className="text-app-text font-medium mb-2 line-clamp-2 min-h-[48px]">{resource.resourceTitle}</h3>
                    <div className="space-y-1">
                      <p className="text-gray-500 text-xs flex items-center gap-1">
                        <Calendar size={12} />
                        Shared {new Date(resource.sharedAt).toLocaleDateString()}
                      </p>
                      <p className="text-gray-500 text-xs">
                        By {resource.sharedByName}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-app-text">Enrolled Students</h2>
              <div className="bg-[#5865F2]/10 px-4 py-2 rounded-lg">
                <span className="text-[#5865F2] font-medium">
                  {enrolledStudents.length} Student{enrolledStudents.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {enrolledStudents.length === 0 ? (
              <div className="bg-app-panel border border-app-border rounded-xl p-12 text-center">
                <Users size={48} className="mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 mb-2">No students enrolled yet</p>
                <p className="text-gray-500 text-sm">Send invitations to get started!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {enrolledStudents.map((student, index) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-app-panel border border-app-border rounded-xl p-4 hover:border-[#5865F2]/30 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#5865F2]/10 rounded-full flex items-center justify-center">
                        <span className="text-[#5865F2] font-bold text-lg">
                          {student.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-app-text font-medium">{student.name}</p>
                        <p className="text-gray-400 text-sm">{student.email}</p>
                      </div>
                      <div className="text-gray-500 text-xs">
                        Student #{index + 1}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Invitations Tab */}
        {activeTab === 'invitations' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-app-text">Invitations</h2>
              <button
                onClick={() => setShowInviteModal(true)}
                className="bg-[#5865F2] hover:bg-[#4752c4] text-app-text px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus size={18} />
                Invite Student
              </button>
            </div>

            {/* Classroom Code Section */}
            {classroom?.code && (
              <div className="bg-app-panel border border-app-border rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-app-text mb-1">Classroom Code</h3>
                    <p className="text-gray-400 text-sm">Share this code with students for instant joining</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-[#1e1f22] border border-app-border rounded-lg p-4">
                    <p className="text-2xl font-mono font-bold text-[#5865F2] tracking-wider text-center">
                      {classroom.code}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(classroom.code || '');
                      // You could add a toast notification here
                      alert('Classroom code copied to clipboard!');
                    }}
                    className="bg-[#5865F2] hover:bg-[#4752c4] text-app-text px-6 py-4 rounded-lg transition-colors flex items-center gap-2 font-medium"
                  >
                    <Share2 size={18} />
                    Copy Code
                  </button>
                </div>
                <p className="text-gray-500 text-xs mt-3">
                  Students can enter this code on their dashboard to join your classroom without an email invitation
                </p>
              </div>
            )}

            <div className="border-t border-app-border pt-6">
              <h3 className="text-lg font-bold text-app-text mb-4">Email Invitations</h3>
              {invitations.length === 0 ? (
                <div className="bg-app-panel border border-app-border rounded-xl p-12 text-center">
                  <Mail size={48} className="mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">No email invitations sent yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invitations.map(invitation => (
                    <div
                      key={invitation.id}
                      className="bg-app-panel border border-app-border rounded-xl p-4 flex justify-between items-center"
                    >
                      <div>
                        <p className="text-app-text font-medium">{invitation.studentEmail}</p>
                        <p className="text-gray-500 text-sm">
                          Sent {new Date(invitation.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        invitation.status === 'accepted' ? 'bg-green-500/10 text-green-400' :
                        invitation.status === 'declined' ? 'bg-red-500/10 text-red-400' :
                        'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {invitation.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Announcement Modal */}
      <AnimatePresence>
        {showAnnouncementModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !savingAnnouncement && setShowAnnouncementModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-app-panel rounded-xl p-6 max-w-lg w-full border border-app-border"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-app-text">New Announcement</h3>
                <button
                  onClick={() => setShowAnnouncementModal(false)}
                  disabled={savingAnnouncement}
                  className="text-gray-400 hover:text-app-text"
                >
                  <X size={24} />
                </button>
              </div>
              <textarea
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="Write your announcement..."
                rows={6}
                maxLength={5000}
                className="w-full bg-[#1e1f22] border border-app-border rounded-lg px-4 py-3 text-app-text focus:outline-none focus:border-[#5865F2] resize-none"
                disabled={savingAnnouncement}
              />
              <p className="text-xs text-gray-500 mt-2">{announcementText.length}/5000</p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowAnnouncementModal(false)}
                  disabled={savingAnnouncement}
                  className="flex-1 bg-[#1e1f22] hover:bg-[#1e1f22]/80 text-app-text py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAnnouncement}
                  disabled={savingAnnouncement || !announcementText.trim()}
                  className="flex-1 bg-[#5865F2] hover:bg-[#4752c4] text-app-text py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingAnnouncement ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  Post
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !sendingInvite && setShowInviteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-app-panel rounded-xl p-6 max-w-md w-full border border-app-border"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-app-text">Invite Student</h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  disabled={sendingInvite}
                  className="text-gray-400 hover:text-app-text"
                >
                  <X size={24} />
                </button>
              </div>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full bg-[#1e1f22] border border-app-border rounded-lg px-4 py-3 text-app-text focus:outline-none focus:border-[#5865F2]"
                disabled={sendingInvite}
              />
              <p className="text-xs text-gray-500 mt-2">Student must already have an account</p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowInviteModal(false)}
                  disabled={sendingInvite}
                  className="flex-1 bg-[#1e1f22] hover:bg-[#1e1f22]/80 text-app-text py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendInvitation}
                  disabled={sendingInvite || !inviteEmail.trim()}
                  className="flex-1 bg-[#5865F2] hover:bg-[#4752c4] text-app-text py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sendingInvite ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  Send Invite
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Resource Modal */}
      <AnimatePresence>
        {showResourceModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-app-panel rounded-xl p-6 max-w-2xl w-full border border-app-border max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xl font-bold text-app-text">Share Resource</h3>
                <button
                  onClick={() => {
                    setShowResourceModal(false);
                    setSelectedNoteId('');
                  }}
                  disabled={sharingResource}
                  className="text-gray-400 hover:text-app-text transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <p className="text-gray-400 text-sm mb-4">
                Select a note to share with all students in this classroom
              </p>

              {/* Content */}
              <div className="flex-1 overflow-y-auto mb-4 pr-2">
                {userNotes.length === 0 ? (
                  <div className="bg-[#1e1f22] border border-app-border rounded-lg p-8 text-center">
                    <Share2 size={32} className="mx-auto mb-3 text-gray-600" />
                    <p className="text-gray-400 mb-2">No notes available to share</p>
                    <p className="text-gray-500 text-sm mb-4">Create some notes first!</p>
                    <button
                      onClick={() => {
                        setShowResourceModal(false);
                        setSelectedNoteId('');
                        onNavigate('notes');
                      }}
                      className="bg-[#5865F2] hover:bg-[#4752c4] text-app-text px-4 py-2 rounded-lg text-sm transition-colors inline-flex items-center gap-2"
                    >
                      <Plus size={16} />
                      Create a Note
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userNotes.map(note => {
                      const isSelected = selectedNoteId === note.id;
                      return (
                        <div
                          key={note.id}
                          onClick={() => {
                            if (!sharingResource) {
                              console.log('Selecting note:', note.id);
                              setSelectedNoteId(note.id);
                            }
                          }}
                          className={`w-full text-left bg-[#1e1f22] border rounded-lg p-3 transition-all cursor-pointer ${
                            sharingResource ? 'opacity-50 cursor-not-allowed' : ''
                          } ${
                            isSelected
                              ? 'border-[#5865F2] bg-[#5865F2]/10'
                              : 'border-app-border hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center gap-3 pointer-events-none">
                            {/* Icon */}
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'bg-[#5865F2]' : 'bg-[#5865F2]/10'
                            }`}>
                              <Share2 size={18} className={isSelected ? 'text-app-text' : 'text-[#5865F2]'} />
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-app-text font-medium mb-1 line-clamp-1">{note.title}</h4>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="truncate">{note.folder || 'No folder'}</span>
                                <span>•</span>
                                <span>{note.tags.length} tags</span>
                                <span>•</span>
                                <span>{new Date(note.lastModified).toLocaleDateString()}</span>
                              </div>
                            </div>
                            
                            {/* Checkmark */}
                            {isSelected && (
                              <div className="flex-shrink-0">
                                <div className="w-6 h-6 bg-[#5865F2] rounded-full flex items-center justify-center">
                                  <Check size={14} className="text-app-text" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer Buttons */}
              <div className="flex gap-3 pt-2 border-t border-app-border">
                <button
                  onClick={() => {
                    setShowResourceModal(false);
                    setSelectedNoteId('');
                  }}
                  disabled={sharingResource}
                  className="flex-1 bg-[#1e1f22] hover:bg-[#1e1f22]/80 text-app-text py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    console.log('Share clicked, selectedNoteId:', selectedNoteId);
                    if (selectedNoteId && !sharingResource) {
                      handleShareResource();
                    }
                  }}
                  disabled={sharingResource || !selectedNoteId}
                  className="flex-1 bg-[#5865F2] hover:bg-[#4752c4] text-app-text py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sharingResource ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Sharing...
                    </>
                  ) : (
                    <>
                      <Share2 size={18} />
                      Share with Students
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClassroomDetail;
