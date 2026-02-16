import React, { useState } from 'react';
import { ResourceMetadata, ExamType, Level, PaperType } from '../../types';
import { validateResourceMetadata } from '../../utils/studyResourceValidation';

interface UploadFormProps {
  initialMetadata?: Partial<ResourceMetadata>;
  onSubmit: (metadata: ResourceMetadata) => void;
  onCancel: () => void;
  isEditMode?: boolean;
}

const UploadForm: React.FC<UploadFormProps> = ({
  initialMetadata = {},
  onSubmit,
  onCancel,
  isEditMode = false,
}) => {
  const [metadata, setMetadata] = useState<Partial<ResourceMetadata>>({
    title: initialMetadata.title || '',
    examType: initialMetadata.examType,
    level: initialMetadata.level,
    subject: initialMetadata.subject || '',
    year: initialMetadata.year || new Date().getFullYear(),
    board: initialMetadata.board || '',
    paperType: initialMetadata.paperType,
    description: initialMetadata.description || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const examTypes: ExamType[] = ['JEE', 'NEET', 'GATE', 'ICSE', 'CBSE', 'University', 'Other'];
  const levels: Level[] = ['10', '12', 'UG', 'PG', 'Other'];
  const paperTypes: PaperType[] = ['PYQ', 'Mock', 'Sample', 'Practice'];

  const handleChange = (field: keyof ResourceMetadata, value: any) => {
    setMetadata((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate metadata
    const validationErrors = validateResourceMetadata(metadata);
    if (validationErrors.length > 0) {
      const errorMap: Record<string, string> = {};
      validationErrors.forEach((err) => {
        errorMap[err.field] = err.message;
      });
      setErrors(errorMap);
      return;
    }

    onSubmit(metadata as ResourceMetadata);
  };

  const isFormValid = () => {
    return (
      metadata.title &&
      metadata.examType &&
      metadata.level &&
      metadata.subject &&
      metadata.year &&
      metadata.board &&
      metadata.paperType
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={metadata.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="e.g., JEE Main 2023 Physics Paper"
          className={`w-full bg-[#1e1f22] border ${
            errors.title ? 'border-red-500' : 'border-white/10'
          } rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#5865F2] transition-all`}
        />
        {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
      </div>

      {/* Exam Type */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Exam Type <span className="text-red-400">*</span>
        </label>
        <select
          value={metadata.examType || ''}
          onChange={(e) => handleChange('examType', e.target.value as ExamType)}
          className={`w-full bg-[#1e1f22] border ${
            errors.examType ? 'border-red-500' : 'border-white/10'
          } rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#5865F2] transition-all`}
        >
          <option value="">Select exam type</option>
          {examTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        {errors.examType && <p className="text-red-400 text-xs mt-1">{errors.examType}</p>}
      </div>

      {/* Level and Year (Row) */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Level/Class <span className="text-red-400">*</span>
          </label>
          <select
            value={metadata.level || ''}
            onChange={(e) => handleChange('level', e.target.value as Level)}
            className={`w-full bg-[#1e1f22] border ${
              errors.level ? 'border-red-500' : 'border-white/10'
            } rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#5865F2] transition-all`}
          >
            <option value="">Select level</option>
            {levels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          {errors.level && <p className="text-red-400 text-xs mt-1">{errors.level}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Year <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            value={metadata.year || ''}
            onChange={(e) => handleChange('year', parseInt(e.target.value))}
            min={1990}
            max={new Date().getFullYear() + 1}
            placeholder="2023"
            className={`w-full bg-[#1e1f22] border ${
              errors.year ? 'border-red-500' : 'border-white/10'
            } rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#5865F2] transition-all`}
          />
          {errors.year && <p className="text-red-400 text-xs mt-1">{errors.year}</p>}
        </div>
      </div>

      {/* Subject */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Subject <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={metadata.subject}
          onChange={(e) => handleChange('subject', e.target.value)}
          placeholder="e.g., Physics, Mathematics, Chemistry"
          maxLength={100}
          className={`w-full bg-[#1e1f22] border ${
            errors.subject ? 'border-red-500' : 'border-white/10'
          } rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#5865F2] transition-all`}
        />
        {errors.subject && <p className="text-red-400 text-xs mt-1">{errors.subject}</p>}
      </div>

      {/* Board/University */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Board/University <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={metadata.board}
          onChange={(e) => handleChange('board', e.target.value)}
          placeholder="e.g., CBSE, ICSE, NTA, Mumbai University"
          maxLength={200}
          className={`w-full bg-[#1e1f22] border ${
            errors.board ? 'border-red-500' : 'border-white/10'
          } rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#5865F2] transition-all`}
        />
        {errors.board && <p className="text-red-400 text-xs mt-1">{errors.board}</p>}
      </div>

      {/* Paper Type */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Paper Type <span className="text-red-400">*</span>
        </label>
        <select
          value={metadata.paperType || ''}
          onChange={(e) => handleChange('paperType', e.target.value as PaperType)}
          className={`w-full bg-[#1e1f22] border ${
            errors.paperType ? 'border-red-500' : 'border-white/10'
          } rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#5865F2] transition-all`}
        >
          <option value="">Select paper type</option>
          {paperTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        {errors.paperType && <p className="text-red-400 text-xs mt-1">{errors.paperType}</p>}
      </div>

      {/* Description (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Description (Optional)
        </label>
        <textarea
          value={metadata.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Add any additional details about this resource..."
          maxLength={500}
          rows={3}
          className="w-full bg-[#1e1f22] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#5865F2] transition-all resize-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          {metadata.description?.length || 0}/500 characters
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={!isFormValid()}
          className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
            isFormValid()
              ? 'bg-[#5865F2] hover:bg-[#4752c4] text-white'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isEditMode ? 'Update Metadata' : 'Continue'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 bg-[#2b2d31] hover:bg-[#3f4147] text-white rounded-lg font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default UploadForm;
