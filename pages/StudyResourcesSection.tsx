import React, { useState, useEffect, useCallback } from 'react';
import { UserPreferences, StudyResource, ResourceFilters } from '../types';
import { Upload, Loader2 } from 'lucide-react';
import { StudyResourceService } from '../services/studyResourceService';
import { StudyResourceUploadService } from '../services/studyResourceUploadService';
import SearchBar from '../components/StudyResources/SearchBar';
import FilterPanel from '../components/StudyResources/FilterPanel';
import ResourceList from '../components/StudyResources/ResourceList';
import Pagination from '../components/StudyResources/Pagination';
import UploadModal from '../components/StudyResources/UploadModal';

interface StudyResourcesSectionProps {
  user: UserPreferences | null;
}

const StudyResourcesSection: React.FC<StudyResourcesSectionProps> = ({ user }) => {
  const [resources, setResources] = useState<StudyResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ResourceFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState<StudyResource | null>(null);
  const [editingResource, setEditingResource] = useState<{ id: string; metadata: any } | undefined>();

  const pageSize = 50;

  // Load resources
  const loadResources = useCallback(async () => {
    try {
      setLoading(true);
      const result = await StudyResourceService.searchResources(
        searchQuery,
        filters,
        currentPage,
        pageSize
      );

      setResources(result.resources);
      setTotalPages(result.totalPages);
      setHasNextPage(result.hasNextPage);
      setHasPreviousPage(result.hasPreviousPage);
    } catch (error) {
      console.error('Error loading resources:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters, currentPage]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleFiltersChange = (newFilters: ResourceFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewResource = (resource: StudyResource) => {
    setSelectedResource(resource);
    // Open resource in new tab for viewing/downloading
    window.open(resource.fileUrl, '_blank');
  };

  const handleEditResource = (resource: StudyResource) => {
    setEditingResource({
      id: resource.id,
      metadata: {
        title: resource.title,
        examType: resource.examType,
        level: resource.level,
        subject: resource.subject,
        year: resource.year,
        board: resource.board,
        paperType: resource.paperType,
        description: resource.description,
      },
    });
    setShowUploadModal(true);
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!user) return;

    try {
      const resource = resources.find((r) => r.id === resourceId);
      if (!resource) return;

      // Delete file from storage
      await StudyResourceUploadService.deleteFile(resource.fileUrl);

      // Delete resource from Firestore
      await StudyResourceService.deleteResource(resourceId, user.id);

      // Refresh list
      loadResources();
    } catch (error: any) {
      console.error('Error deleting resource:', error);
      alert(`Failed to delete resource: ${error.message}`);
    }
  };

  const handleUploadComplete = () => {
    setShowUploadModal(false);
    setEditingResource(undefined);
    setCurrentPage(1); // Reset to first page
    // Small delay to ensure Firestore has processed the write
    setTimeout(() => {
      loadResources();
    }, 500);
  };

  const handleUploadModalClose = () => {
    setShowUploadModal(false);
    setEditingResource(undefined);
  };

  const isAuthenticated = user && !user.isGuest;

  return (
    <div className="h-full bg-[#1e1f22] text-white overflow-y-auto">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Study Resources</h1>
            <p className="text-gray-400">
              Browse and share academic materials - PYQs, exam papers, and study guides
            </p>
          </div>
          {isAuthenticated && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-[#5865F2] hover:bg-[#4752c4] text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Upload size={20} />
              Upload Resource
            </button>
          )}
        </div>

        {/* Search and Filters - Stacked Layout */}
        <div className="space-y-4 mb-8">
          <SearchBar onSearchChange={handleSearchChange} />
          <FilterPanel filters={filters} onFiltersChange={handleFiltersChange} />
        </div>

        {/* Resource List - Full Width */}
        <div className="w-full">
          <ResourceList
            resources={resources}
            currentUserId={user?.id || ''}
            loading={loading}
            onView={handleViewResource}
            onEdit={isAuthenticated ? handleEditResource : undefined}
            onDelete={isAuthenticated ? handleDeleteResource : undefined}
          />
        </div>

        {/* Pagination */}
        {!loading && resources.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            hasNextPage={hasNextPage}
            hasPreviousPage={hasPreviousPage}
          />
        )}

        {/* Guest User Message */}
        {!isAuthenticated && resources.length > 0 && (
          <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
            <p className="text-blue-400">
              Sign in to upload your own study resources and help the community!
            </p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {isAuthenticated && (
        <UploadModal
          isOpen={showUploadModal}
          onClose={handleUploadModalClose}
          onUploadComplete={handleUploadComplete}
          userId={user.id}
          editResource={editingResource}
        />
      )}
    </div>
  );
};

export default StudyResourcesSection;
