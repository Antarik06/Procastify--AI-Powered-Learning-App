import React, { useState, useEffect } from 'react';
import { UserPreferences, Classroom, Announcement, ClassroomResource, ViewState, Note } from '../types';
import { StorageService } from '../services/storageService';
import { ArrowLeft, Loader2, MessageSquare, Share2, Calendar, User, Download, Eye, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StudentClassroomViewProps {
  user: UserPreferences;
  classroomId: string;
  onNavigate: (view: ViewState | "folders") => void;
}

const StudentClassroomView: React.FC<StudentClassroomViewProps> = ({ user, classroomId, onNavigate }) => {
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [resources, setResources] = useState<ClassroomResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResource, setSelectedResource] = useState<ClassroomResource | null>(null);
  const [resourceNote, setResourceNote] = useState<Note | null>(null);
  const [loadingNote, setLoadingNote] = useState(false);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    loadClassroomData();
  }, [classroomId]);

  const loadClassroomData = async () => {
    try {
      setLoading(true);
      
      // Method 1: Try to find classroom from accepted invitations
      const allInvitations = await StorageService.getInvitations(user.id, 'student');
      const acceptedInvitations = allInvitations.filter(inv => inv.status === 'accepted');
      
      let foundClassroom: Classroom | null = null;
      for (const invitation of acceptedInvitations) {
        if (invitation.classroomId === classroomId) {
          const teacherClassrooms = await StorageService.getClassrooms(invitation.teacherId);
          foundClassroom = teacherClassrooms.find(c => c.id === classroomId) || null;
          break;
        }
      }
      
      // Method 2: If not found via invitation, try direct Firestore query (for code joins)
      if (!foundClassroom) {
        const { FirebaseService } = await import('../services/firebaseService');
        const allStudentClassrooms = await FirebaseService.getClassroomsByStudent(user.id);
        foundClassroom = allStudentClassrooms.find(c => c.id === classroomId) || null;
      }
      
      setClassroom(foundClassroom);

      if (foundClassroom) {
        // Load announcements and resources
        const [announcementsData, resourcesData] = await Promise.all([
          StorageService.getAnnouncements(classroomId),
          StorageService.getClassroomResources(classroomId)
        ]);
        
        setAnnouncements(announcementsData);
        setResources(resourcesData);
      }
    } catch (error) {
      console.error('Error loading classroom:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewResource = async (resource: ClassroomResource) => {
    try {
      setLoadingNote(true);
      setSelectedResource(resource);
      
      console.log('Loading resource:', resource);
      console.log('Note ID:', resource.resourceId);
      
      // Fetch the note directly from Firestore using the note ID
      const { db } = await import('../firebaseConfig');
      const { doc, getDoc } = await import('firebase/firestore');
      
      const noteRef = doc(db, 'notes', resource.resourceId);
      console.log('Fetching note from Firestore...');
      
      const noteSnap = await getDoc(noteRef);
      console.log('Note exists:', noteSnap.exists());
      
      if (noteSnap.exists()) {
        const noteData = noteSnap.data();
        console.log('Note data:', noteData);
        
        // Convert Firestore timestamps to numbers
        const note: Note = {
          ...noteData,
          id: noteSnap.id,
          createdAt: noteData.createdAt?.toMillis ? noteData.createdAt.toMillis() : noteData.createdAt,
          updatedAt: noteData.updatedAt?.toMillis ? noteData.updatedAt.toMillis() : noteData.updatedAt,
          lastModified: noteData.lastModified || noteData.updatedAt?.toMillis?.() || Date.now(),
        } as Note;
        
        console.log('Processed note:', note);
        setResourceNote(note);
      } else {
        console.error('Note document does not exist');
        alert('Note not found. It may have been deleted by the teacher.');
        setSelectedResource(null);
      }
    } catch (error: any) {
      console.error('Error loading note:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      alert(`Failed to load note: ${error.message || 'Unknown error'}`);
      setSelectedResource(null);
    } finally {
      setLoadingNote(false);
    }
  };

  const handleCopyToMyNotes = async () => {
    if (!resourceNote || !classroom) return;
    
    try {
      setCopying(true);
      
      // Create a copy of the note for the student
      const copiedNote: Note = {
        ...resourceNote,
        id: Date.now().toString(),
        userId: user.id,
        ownerId: user.id,
        title: `${resourceNote.title} (Copy)`,
        folder: 'General',
        folderId: null,
        lastModified: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isPublic: false,
      };
      
      await StorageService.saveNote(copiedNote);
      
      // Log activity
      const { FirebaseService } = await import('../services/firebaseService');
      await FirebaseService.logActivity({
        classroomId: classroom.id,
        classroomName: classroom.name,
        type: 'resource_copied',
        actorId: user.id,
        actorName: user.name,
        targetId: resourceNote.id,
        targetName: resourceNote.title,
        timestamp: Date.now(),
      });
      
      alert('Note copied to your notes!');
      setSelectedResource(null);
      setResourceNote(null);
    } catch (error) {
      console.error('Error copying note:', error);
      alert('Failed to copy note');
    } finally {
      setCopying(false);
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
            onClick={() => onNavigate('studentClassrooms')}
            className="mt-4 text-[#5865F2] hover:text-white"
          >
            Back to My Classrooms
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <button
          onClick={() => onNavigate('studentClassrooms')}
          className="text-gray-400 hover:text-white flex items-center gap-2 mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to My Classrooms
        </button>
        <h1 className="text-3xl font-bold text-white">{classroom.name}</h1>
        <div className="flex items-center gap-2 mt-2">
          <User size={16} className="text-gray-500" />
          <p className="text-gray-400">Teacher: {classroom.teacherName}</p>
        </div>
        {classroom.description && (
          <p className="text-gray-400 mt-2">{classroom.description}</p>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Announcements Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare size={24} className="text-[#5865F2]" />
            <h2 className="text-xl font-bold text-white">Announcements</h2>
          </div>

          {announcements.length === 0 ? (
            <div className="bg-[#2b2d31] border border-white/5 rounded-xl p-8 text-center">
              <MessageSquare size={40} className="mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400">No announcements yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((announcement, index) => (
                <motion.div
                  key={announcement.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-[#2b2d31] border border-white/5 rounded-xl p-5"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-[#5865F2]/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <MessageSquare size={18} className="text-[#5865F2]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{announcement.teacherName}</p>
                      <p className="text-gray-500 text-xs flex items-center gap-1 mt-1">
                        <Calendar size={12} />
                        {new Date(announcement.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-300 whitespace-pre-wrap pl-13">{announcement.content}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Resources Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <Share2 size={24} className="text-[#5865F2]" />
            <h2 className="text-xl font-bold text-white">Shared Resources</h2>
          </div>

          {resources.length === 0 ? (
            <div className="bg-[#2b2d31] border border-white/5 rounded-xl p-8 text-center">
              <Share2 size={40} className="mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400">No resources shared yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {resources.map((resource, index) => (
                <motion.button
                  key={resource.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleViewResource(resource)}
                  className="w-full bg-[#2b2d31] border border-white/5 rounded-xl p-5 hover:border-[#5865F2]/50 transition-all text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[#5865F2]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Share2 size={18} className="text-[#5865F2]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-medium mb-1">{resource.resourceTitle}</h3>
                      <p className="text-gray-500 text-xs">
                        Shared by {resource.sharedByName} • {new Date(resource.sharedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Eye size={18} className="text-gray-500 group-hover:text-[#5865F2] transition-colors" />
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* View Resource Modal */}
      <AnimatePresence>
        {selectedResource && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#2b2d31] rounded-xl p-6 max-w-4xl w-full border border-white/10 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">{selectedResource.resourceTitle}</h3>
                  <p className="text-gray-400 text-sm">
                    Shared by {selectedResource.sharedByName} • {new Date(selectedResource.sharedAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedResource(null);
                    setResourceNote(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeft size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto mb-4 bg-[#1e1f22] rounded-lg p-6">
                {loadingNote ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-[#5865F2]" size={32} />
                  </div>
                ) : resourceNote ? (
                  <div className="prose prose-invert max-w-none">
                    {/* Display note content */}
                    {resourceNote.document?.blocks && resourceNote.document.blocks.length > 0 ? (
                      <div className="space-y-3">
                        {resourceNote.document.blocks.map((block, idx) => (
                          <div key={idx} className="text-gray-300">
                            {block.type === 'h1' && <h1 className="text-3xl font-bold text-white mb-2">{block.content}</h1>}
                            {block.type === 'h2' && <h2 className="text-2xl font-bold text-white mb-2">{block.content}</h2>}
                            {block.type === 'h3' && <h3 className="text-xl font-bold text-white mb-2">{block.content}</h3>}
                            {block.type === 'text' && <p className="text-gray-300">{block.content}</p>}
                            {block.type === 'bullet' && <li className="text-gray-300 ml-4">{block.content}</li>}
                            {block.type === 'quote' && <blockquote className="border-l-4 border-[#5865F2] pl-4 italic text-gray-400">{block.content}</blockquote>}
                            {block.type === 'code' && <pre className="bg-[#0d0e10] p-3 rounded text-sm text-gray-300 overflow-x-auto"><code>{block.content}</code></pre>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400">No content available</p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-12">Failed to load note</p>
                )}
              </div>

              {/* Footer Buttons */}
              <div className="flex gap-3 pt-2 border-t border-white/10">
                <button
                  onClick={() => {
                    setSelectedResource(null);
                    setResourceNote(null);
                  }}
                  className="flex-1 bg-[#1e1f22] hover:bg-[#1e1f22]/80 text-white py-2.5 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleCopyToMyNotes}
                  disabled={copying || !resourceNote}
                  className="flex-1 bg-[#5865F2] hover:bg-[#4752c4] text-white py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {copying ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Copying...
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      Copy to My Notes
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

export default StudentClassroomView;
