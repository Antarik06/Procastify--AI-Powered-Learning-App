import React, { useState } from 'react';
import { X } from 'lucide-react';
import { ResourceMetadata } from '../../types';
import UploadForm from './UploadForm';
import FileUploader from './FileUploader';
import ProgressIndicator from './ProgressIndicator';
import { StudyResourceUploadService } from '../../services/studyResourceUploadService';
import { StudyResourceService } from '../../services/studyResourceService';
import { sanitizeTextInput } from '../../utils/studyResourceValidation';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
  userId: string;
  editResource?: {
    id: string;
    metadata: ResourceMetadata;
  };
}

type UploadStep = 'metadata' | 'file' | 'uploading' | 'complete';

const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete,
  userId,
  editResource,
}) => {
  const [step, setStep] = useState<UploadStep>(editResource ? 'metadata' : 'metadata');
  const [metadata, setMetadata] = useState<ResourceMetadata | null>(
    editResource?.metadata || null
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'uploading' | 'success' | 'error'>('uploading');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleMetadataSubmit = (submittedMetadata: ResourceMetadata) => {
    // Sanitize text inputs
    const sanitized: ResourceMetadata = {
      ...submittedMetadata,
      title: sanitizeTextInput(submittedMetadata.title),
      subject: sanitizeTextInput(submittedMetadata.subject),
      board: sanitizeTextInput(submittedMetadata.board),
      description: submittedMetadata.description
        ? sanitizeTextInput(submittedMetadata.description)
        : undefined,
    };

    setMetadata(sanitized);

    if (editResource) {
      // Edit mode: Update metadata only
      handleUpdateMetadata(sanitized);
    } else {
      // Upload mode: Move to file selection
      setStep('file');
    }
  };

  const handleUpdateMetadata = async (updatedMetadata: ResourceMetadata) => {
    try {
      setStep('uploading');
      setUploadStatus('uploading');

      await StudyResourceService.updateResourceMetadata(
        editResource!.id,
        userId,
        updatedMetadata
      );

      setUploadStatus('success');
      setStep('complete');

      setTimeout(() => {
        onUploadComplete();
        handleClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error updating metadata:', err);
      setError(err.message || 'Failed to update metadata');
      setUploadStatus('error');
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleFileClear = () => {
    setSelectedFile(null);
  };

  const handleUpload = async () => {
    if (!metadata || !selectedFile) return;

    try {
      setStep('uploading');
      setUploadStatus('uploading');
      setUploadProgress(0);
      setError(null);

      console.log('[UPLOAD] Starting upload process...');
      console.log('[UPLOAD] Metadata:', metadata);
      console.log('[UPLOAD] File:', selectedFile.name, selectedFile.size, selectedFile.type);

      // Generate resource ID
      const resourceId = `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('[UPLOAD] Generated resource ID:', resourceId);

      // Upload file to Firebase Storage
      console.log('[UPLOAD] Uploading file to Firebase Storage...');
      const uploadResult = await StudyResourceUploadService.uploadFile(
        selectedFile,
        userId,
        resourceId,
        (progress) => {
          console.log('[UPLOAD] Progress:', progress + '%');
          setUploadProgress(progress);
        }
      );
      console.log('[UPLOAD] File uploaded successfully:', uploadResult);

      // Create resource in Firestore
      console.log('[UPLOAD] Creating resource in Firestore...');
      const fileType = StudyResourceUploadService.getFileType(selectedFile);
      await StudyResourceService.createResource(
        userId,
        metadata,
        uploadResult.fileUrl,
        uploadResult.fileName,
        uploadResult.fileSize,
        fileType,
        resourceId
      );
      console.log('[UPLOAD] Resource created successfully in Firestore');

      setUploadStatus('success');
      setStep('complete');

      setTimeout(() => {
        onUploadComplete();
        handleClose();
      }, 1500);
    } catch (err: any) {
      console.error('[UPLOAD] Error uploading resource:', err);
      console.error('[UPLOAD] Error details:', err.message, err.code, err.stack);
      setError(err.message || 'Upload failed');
      setUploadStatus('error');
    }
  };

  const handleClose = () => {
    setStep('metadata');
    setMetadata(null);
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadStatus('uploading');
    setError(null);
    onClose();
  };

  const getModalTitle = () => {
    if (editResource) return 'Edit Resource Metadata';
    if (step === 'metadata') return 'Upload Study Resource - Step 1';
    if (step === 'file') return 'Upload Study Resource - Step 2';
    if (step === 'uploading') return 'Uploading...';
    return 'Upload Complete';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#1e1f22] w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">{getModalTitle()}</h2>
          {step !== 'uploading' && (
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'metadata' && (
            <UploadForm
              initialMetadata={metadata || undefined}
              onSubmit={handleMetadataSubmit}
              onCancel={handleClose}
              isEditMode={!!editResource}
            />
          )}

          {step === 'file' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Select File</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Upload a PDF or image file containing the study material.
                </p>
              </div>

              <FileUploader
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
                onClear={handleFileClear}
              />

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile}
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                    selectedFile
                      ? 'bg-[#5865F2] hover:bg-[#4752c4] text-white'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Upload Resource
                </button>
                <button
                  onClick={() => setStep('metadata')}
                  className="px-6 py-3 bg-[#2b2d31] hover:bg-[#3f4147] text-white rounded-lg font-medium transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {(step === 'uploading' || step === 'complete') && (
            <ProgressIndicator
              progress={uploadProgress}
              status={uploadStatus}
              fileName={selectedFile?.name}
              fileSize={selectedFile?.size}
              error={error || undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
