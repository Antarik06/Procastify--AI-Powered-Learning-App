import React, { useState, useEffect } from 'react';
import { UserPreferences, Classroom, Invitation, ViewState } from '../types';
import { StorageService } from '../services/storageService';
import { GraduationCap, Loader2, Mail, Users, Check, X, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { auth } from '../firebaseConfig';

interface StudentClassroomsProps {
  user: UserPreferences;
  onNavigate: (view: ViewState | "folders", classroomId?: string) => void;
}

const StudentClassrooms: React.FC<StudentClassroomsProps> = ({ user, onNavigate }) => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get user's email from Firebase Auth
      const currentUser = auth.currentUser;
      if (!currentUser?.email) {
        console.warn('No email found for current user');
        setLoading(false);
        return;
      }

      // Get invitations for this student's email
      const allInvitations = await StorageService.getInvitations(user.id, 'student');
      const pendingInvitations = allInvitations.filter(inv => inv.status === 'pending');
      setInvitations(pendingInvitations);

      // Get classrooms where student is enrolled
      const allClassrooms: Classroom[] = [];
      
      // For each accepted invitation, get the classroom
      const acceptedInvitations = allInvitations.filter(inv => inv.status === 'accepted');
      for (const invitation of acceptedInvitations) {
        try {
          // Get the teacher's classrooms and find this one
          const teacherClassrooms = await StorageService.getClassrooms(invitation.teacherId);
          const classroom = teacherClassrooms.find(c => c.id === invitation.classroomId);
          if (classroom && classroom.studentIds.includes(user.id)) {
            allClassrooms.push(classroom);
          }
        } catch (error) {
          console.error('Error loading classroom:', error);
        }
      }
      
      setClassrooms(allClassrooms);
    } catch (error) {
      console.error('Error loading student classrooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvitationResponse = async (invitationId: string, accept: boolean) => {
    try {
      setProcessingInvite(invitationId);
      console.log('Accepting invitation:', { invitationId, userId: user.id, accept });
      
      const status = accept ? 'accepted' : 'declined';
      await StorageService.updateInvitationStatus(invitationId, status, accept ? user.id : undefined);
      
      console.log('Invitation status updated successfully');
      await loadData();
    } catch (error: any) {
      console.error('Error responding to invitation:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack
      });
      alert(`Failed to respond to invitation: ${error?.message || 'Unknown error'}`);
    } finally {
      setProcessingInvite(null);
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
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <GraduationCap size={32} />
          My Classrooms
        </h1>
        <p className="text-gray-400 mt-1">
          View your enrolled classrooms and pending invitations
        </p>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Mail size={24} />
            Pending Invitations ({invitations.length})
          </h2>
          <div className="space-y-3">
            {invitations.map(invitation => (
              <motion.div
                key={invitation.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-[#2b2d31] border border-white/5 rounded-xl p-4 flex items-center justify-between hover:border-[#5865F2]/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#5865F2]/10 rounded-lg flex items-center justify-center">
                    <Mail size={24} className="text-[#5865F2]" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{invitation.classroomName}</p>
                    <p className="text-gray-400 text-sm">From: {invitation.teacherName}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleInvitationResponse(invitation.id, true)}
                    disabled={processingInvite === invitation.id}
                    className="bg-[#5865F2] hover:bg-[#4752c4] text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {processingInvite === invitation.id ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <Check size={16} />
                    )}
                    Accept
                  </button>
                  <button
                    onClick={() => handleInvitationResponse(invitation.id, false)}
                    disabled={processingInvite === invitation.id}
                    className="bg-[#1e1f22] hover:bg-[#1e1f22]/80 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <X size={16} />
                    Decline
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Enrolled Classrooms */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Users size={24} />
          Enrolled Classrooms
        </h2>
        {classrooms.length === 0 ? (
          <div className="bg-[#2b2d31] border border-white/5 rounded-xl p-12 text-center">
            <GraduationCap size={48} className="mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400 mb-2">No classrooms yet</p>
            <p className="text-gray-500 text-sm">Accept an invitation to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classrooms.map((classroom, index) => (
              <motion.button
                key={classroom.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onNavigate('studentClassroomView', classroom.id)}
                className="bg-[#2b2d31] border border-white/5 rounded-xl p-6 hover:border-[#5865F2]/50 hover:bg-[#2b2d31]/80 transition-all text-left group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-[#5865F2]/10 rounded-lg flex items-center justify-center">
                    <GraduationCap size={24} className="text-[#5865F2]" />
                  </div>
                  <ArrowRight size={20} className="text-gray-500 group-hover:text-[#5865F2] transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">{classroom.name}</h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2 min-h-[40px]">
                  {classroom.description || 'No description'}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Teacher: {classroom.teacherName}</span>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentClassrooms;
