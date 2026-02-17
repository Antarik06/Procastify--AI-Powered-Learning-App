import React, { useRef, useState } from 'react';
import { Upload, FileText, Image as ImageIcon, X } from 'lucide-react';
import { validateFileType, validateFileSize } from '../../utils/studyResourceValidation';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, selectedFile, onClear }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileValidation = (file: File): boolean => {
    setError(null);

    // Validate file type
    const typeError = validateFileType(file);
    if (typeError) {
      setError(typeError.message);
      return false;
    }

    // Validate file size
    const sizeError = validateFileSize(file);
    if (sizeError) {
      setError(sizeError.message);
      return false;
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && handleFileValidation(file)) {
      onFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && handleFileValidation(file)) {
      onFileSelect(file);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') {
      return <FileText size={48} className="text-[#5865F2]" />;
    }
    if (file.type.startsWith('image/')) {
      return <ImageIcon size={48} className="text-[#5865F2]" />;
    }
    return <FileText size={48} className="text-[#5865F2]" />;
  };

  if (selectedFile) {
    return (
      <div className="bg-[#1e1f22] border border-white/10 rounded-lg p-6">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">{getFileIcon(selectedFile)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate">{selectedFile.name}</p>
            <p className="text-gray-400 text-sm">{formatFileSize(selectedFile.size)}</p>
            <p className="text-gray-500 text-xs mt-1">{selectedFile.type}</p>
          </div>
          <button
            onClick={onClear}
            className="flex-shrink-0 p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
            title="Remove file"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-[#5865F2] bg-[#5865F2]/10'
            : 'border-white/20 hover:border-[#5865F2] hover:bg-white/5'
        }`}
      >
        <Upload size={48} className="mx-auto mb-4 text-gray-400" />
        <p className="text-white font-medium mb-2">
          Drop your file here or click to browse
        </p>
        <p className="text-gray-400 text-sm mb-4">
          Supported formats: PDF, JPEG, PNG (Max 50MB)
        </p>
        <button
          type="button"
          className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752c4] text-white rounded-lg font-medium transition-colors"
        >
          Select File
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/jpeg,image/jpg,image/png"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
