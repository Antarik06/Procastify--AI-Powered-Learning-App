import React, { useState } from 'react';
import { Classroom, VirtualClassLink, UserPreferences } from '../types';
import { ClassroomService } from '../services/classroomService';
import { Plus, Edit2, Trash2, ExternalLink, Calendar, Video, X, Clock } from 'lucide-react';

interface VirtualClassLinksProps {
  classroom: Classroom;
  user: UserPreferences;
  onUpdate: () => void;
}

const VirtualClassLinks: React.FC<VirtualClassLinksProps> = ({ classroom, user, onUpdate }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLink, setEditingLink] = useState<VirtualClassLink | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    description: '',
    scheduledDate: ''
  });
  const [saving, setSaving] = useState(false);

  const isTeacher = user.role === 'teacher' && classroom.teacherId === user.id;

  const resetForm = () => {
    setFormData({
      title: '',
      url: '',
      description: '',
      scheduledDate: ''
    });
    setEditingLink(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (link: VirtualClassLink) => {
    setFormData({
      title: link.title,
      url: link.url,
      description: link.description || '',
      scheduledDate: link.scheduledDate 
        ? new Date(link.scheduledDate).toISOString().slice(0, 16)
        : ''
    });
    setEditingLink(link);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.url.trim()) return;

    setSaving(true);
    try {
      const linkData = {
        title: formData.title.trim(),
        url: formData.url.trim(),
        description: formData.description.trim() || undefined,
        scheduledDate: formData.scheduledDate 
          ? new Date(formData.scheduledDate).getTime()
          : undefined,
        createdBy: user.id
      };

      if (editingLink) {
        await ClassroomService.updateVirtualLink(classroom.id, editingLink.id, linkData);
      } else {
        await ClassroomService.addVirtualLink(classroom.id, linkData);
      }

      setShowAddModal(false);
      resetForm();
      onUpdate();
    } catch (error) {
      console.error('Error saving link:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return;

    try {
      await ClassroomService.deleteVirtualLink(classroom.id, linkId);
      onUpdate();
    } catch (error) {
      console.error('Error deleting link:', error);
    }
  };

  const isUpcoming = (link: VirtualClassLink) => {
    if (!link.scheduledDate) return false;
    return link.scheduledDate > Date.now();
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return null;
    return new Date(timestamp).toLocaleString();
  };

  const sortedLinks = [...classroom.virtualLinks].sort((a, b) => {
    // Upcoming links first, then by date
    const aUpcoming = isUpcoming(a);
    const bUpcoming = isUpcoming(b);
    if (aUpcoming && !bUpcoming) return -1;
    if (!aUpcoming && bUpcoming) return 1;
    if (a.scheduledDate && b.scheduledDate) {
      return a.scheduledDate - b.scheduledDate;
    }
    return b.createdAt - a.createdAt;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">Virtual Class Links</h2>
          <p className="text-gray-400">
            {isTeacher 
              ? 'Manage meeting links for your students'
              : 'Access your class meeting links'}
          </p>
        </div>
        {isTeacher && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Add Link
          </button>
        )}
      </div>

      {/* Links List */}
      {sortedLinks.length === 0 ? (
        <div className="bg-[#2b2d31] p-12 rounded-xl text-center">
          <Video className="mx-auto text-gray-600 mb-4" size={48} />
          <h3 className="text-xl font-bold mb-2">No Links Yet</h3>
          <p className="text-gray-400 mb-4">
            {isTeacher 
              ? 'Add your first meeting link to get started'
              : 'No meeting links have been shared yet'}
          </p>
          {isTeacher && (
            <button
              onClick={handleOpenAdd}
              className="px-6 py-3 bg-[#5865F2] hover:bg-[#4752c4] rounded-xl font-medium"
            >
              Add Link
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedLinks.map(link => {
            const upcoming = isUpcoming(link);
            return (
              <div
                key={link.id}
                className={`bg-[#2b2d31] p-6 rounded-xl border ${
                  upcoming ? 'border-[#5865F2]/50' : 'border-white/5'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{link.title}</h3>
                      {upcoming && (
                        <span className="px-2 py-1 bg-[#5865F2]/20 text-[#5865F2] text-xs font-medium rounded">
                          Upcoming
                        </span>
                      )}
                    </div>
                    
                    {link.description && (
                      <p className="text-gray-300 mb-3">{link.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                      {link.scheduledDate && (
                        <div className="flex items-center gap-2">
                          <Calendar size={16} />
                          <span>{formatDate(link.scheduledDate)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock size={16} />
                        <span>Added {formatDate(link.createdAt)}</span>
                      </div>
                    </div>
                    
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] rounded-lg font-medium transition-colors"
                    >
                      <ExternalLink size={16} />
                      Open Link
                    </a>
                  </div>
                  
                  {isTeacher && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleOpenEdit(link)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        title="Edit link"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(link.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete link"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#2b2d31] p-8 rounded-2xl w-full max-w-md border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {editingLink ? 'Edit Link' : 'Add Meeting Link'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#5865F2]"
                  placeholder="e.g., Math Revision Session"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Meeting URL *
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#5865F2]"
                  placeholder="https://zoom.us/j/..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#5865F2] resize-none"
                  placeholder="Additional details about this session"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Scheduled Date & Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#5865F2]"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formData.title.trim() || !formData.url.trim() || saving}
                  className="flex-1 px-4 py-3 bg-[#5865F2] hover:bg-[#4752c4] text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingLink ? 'Update' : 'Add Link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VirtualClassLinks;

