import React from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface ProgressIndicatorProps {
  progress: number;
  status: 'uploading' | 'success' | 'error';
  fileName?: string;
  fileSize?: number;
  error?: string;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  status,
  fileName,
  fileSize,
  error,
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-[#1e1f22] border border-white/10 rounded-lg p-6">
      {/* Status Icon */}
      <div className="flex items-center gap-4 mb-4">
        {status === 'uploading' && (
          <Loader2 size={32} className="text-[#5865F2] animate-spin flex-shrink-0" />
        )}
        {status === 'success' && (
          <CheckCircle size={32} className="text-green-500 flex-shrink-0" />
        )}
        {status === 'error' && (
          <XCircle size={32} className="text-red-500 flex-shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          {fileName && (
            <p className="text-white font-medium truncate">{fileName}</p>
          )}
          {fileSize && (
            <p className="text-gray-400 text-sm">{formatFileSize(fileSize)}</p>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {status === 'uploading' && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">Uploading...</span>
            <span className="text-sm font-medium text-white">{progress}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#5865F2] h-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success Message */}
      {status === 'success' && (
        <div className="text-center">
          <p className="text-green-500 font-medium">Upload successful!</p>
          <p className="text-gray-400 text-sm mt-1">
            Your resource has been uploaded and is now available.
          </p>
        </div>
      )}

      {/* Error Message */}
      {status === 'error' && (
        <div className="text-center">
          <p className="text-red-500 font-medium">Upload failed</p>
          {error && (
            <p className="text-gray-400 text-sm mt-1">{error}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ProgressIndicator;
