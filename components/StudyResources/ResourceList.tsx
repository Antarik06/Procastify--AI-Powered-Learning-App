import React from 'react';
import { StudyResource } from '../../types';
import ResourceCard from './ResourceCard';
import { FileText, Loader2 } from 'lucide-react';

interface ResourceListProps {
  resources: StudyResource[];
  currentUserId: string;
  loading?: boolean;
  onView: (resource: StudyResource) => void;
  onEdit?: (resource: StudyResource) => void;
  onDelete?: (resourceId: string) => void;
}

const ResourceList: React.FC<ResourceListProps> = ({
  resources,
  currentUserId,
  loading = false,
  onView,
  onEdit,
  onDelete,
}) => {
  if (loading) {
    return (
      <div className="w-full flex justify-center items-center py-20">
        <Loader2 className="animate-spin text-[#5865F2]" size={48} />
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
          <FileText size={40} className="text-gray-500" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">No resources found</h3>
        <p className="text-gray-400 max-w-md">
          Try adjusting your search or filters, or be the first to upload a study resource!
        </p>
      </div>
    );
  }

  return (
    <div className="w-full pb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.map((resource) => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            currentUserId={currentUserId}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
};

export default ResourceList;
