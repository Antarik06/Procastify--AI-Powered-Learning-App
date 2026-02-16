import React from 'react';
import { StudyResource } from '../../types';
import { FileText, Image as ImageIcon, Edit, Trash2, Calendar, BookOpen, GraduationCap } from 'lucide-react';

interface ResourceCardProps {
  resource: StudyResource;
  currentUserId: string;
  onView: (resource: StudyResource) => void;
  onEdit?: (resource: StudyResource) => void;
  onDelete?: (resourceId: string) => void;
}

const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  currentUserId,
  onView,
  onEdit,
  onDelete,
}) => {
  const isOwner = resource.ownerId === currentUserId;

  const getExamTypeColor = (examType: string): string => {
    const colors: Record<string, string> = {
      JEE: '#FF6B6B',
      NEET: '#4ECDC4',
      GATE: '#95E1D3',
      ICSE: '#F38181',
      CBSE: '#AA96DA',
      University: '#FCBAD3',
      Other: '#A8DADC',
    };
    return colors[examType] || '#A8DADC';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number | any): string => {
    if (!timestamp) return 'Unknown';
    const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp.toDate();
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div
      onClick={() => onView(resource)}
      className="bg-[#2b2d31] rounded-xl border border-white/5 hover:border-[#5865F2] cursor-pointer transition-all hover:transform hover:-translate-y-1 hover:shadow-xl group relative overflow-hidden"
    >
      {/* Exam Type Badge */}
      <div
        className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold text-white z-10"
        style={{ backgroundColor: getExamTypeColor(resource.examType) }}
      >
        {resource.examType}
      </div>

      {/* File Type Icon */}
      <div className="aspect-video bg-[#232428] relative overflow-hidden flex items-center justify-center">
        {resource.fileType === 'pdf' ? (
          <FileText size={64} className="text-[#5865F2] opacity-40" />
        ) : (
          <ImageIcon size={64} className="text-[#5865F2] opacity-40" />
        )}
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white backdrop-blur-sm">
          {resource.fileType.toUpperCase()}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-lg text-white truncate mb-2">{resource.title}</h3>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
          <div className="flex items-center gap-1 text-gray-400">
            <BookOpen size={14} />
            <span className="truncate">{resource.subject}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-400">
            <GraduationCap size={14} />
            <span>{resource.level}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-400">
            <Calendar size={14} />
            <span>{resource.year}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-400">
            <span className="px-2 py-0.5 bg-white/5 rounded text-xs">{resource.paperType}</span>
          </div>
        </div>

        {/* Board/University */}
        <div className="text-xs text-gray-500 truncate mb-2">
          {resource.board}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center text-xs text-gray-400 pt-2 border-t border-white/5">
          <span>{formatDate(resource.createdAt)}</span>
          <span>{formatFileSize(resource.fileSize)}</span>
        </div>
      </div>

      {/* Owner Actions */}
      {isOwner && (onEdit || onDelete) && (
        <div className="absolute top-3 left-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(resource);
              }}
              className="p-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white transition-colors"
              title="Edit metadata"
            >
              <Edit size={16} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Are you sure you want to delete this resource?')) {
                  onDelete(resource.id);
                }
              }}
              className="p-2 bg-red-500 hover:bg-red-600 rounded-lg text-white transition-colors"
              title="Delete resource"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ResourceCard;
