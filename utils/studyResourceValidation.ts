import { ResourceMetadata, ExamType, Level, PaperType } from '../types';

interface ValidationError {
  field: string;
  message: string;
  code: "REQUIRED" | "INVALID_FORMAT" | "OUT_OF_RANGE" | "TOO_LONG";
}

const VALID_EXAM_TYPES: ExamType[] = ["JEE", "NEET", "GATE", "ICSE", "CBSE", "University", "Other"];
const VALID_LEVELS: Level[] = ["10", "12", "UG", "PG", "Other"];
const VALID_PAPER_TYPES: PaperType[] = ["PYQ", "Mock", "Sample", "Practice"];

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1990;
const MAX_YEAR = CURRENT_YEAR + 1;

const MAX_SUBJECT_LENGTH = 100;
const MAX_BOARD_LENGTH = 200;
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 500;

/**
 * Validates year is within acceptable range (1990 to current year + 1)
 */
export function validateYear(year: number): ValidationError | null {
  if (!year || typeof year !== 'number') {
    return {
      field: 'year',
      message: 'Year is required',
      code: 'REQUIRED'
    };
  }

  if (year < MIN_YEAR || year > MAX_YEAR) {
    return {
      field: 'year',
      message: `Year must be between ${MIN_YEAR} and ${MAX_YEAR}`,
      code: 'OUT_OF_RANGE'
    };
  }

  return null;
}

/**
 * Validates subject field (1-100 characters)
 */
export function validateSubject(subject: string): ValidationError | null {
  if (!subject || typeof subject !== 'string') {
    return {
      field: 'subject',
      message: 'Subject is required',
      code: 'REQUIRED'
    };
  }

  const trimmed = subject.trim();
  if (trimmed.length === 0) {
    return {
      field: 'subject',
      message: 'Subject cannot be empty',
      code: 'REQUIRED'
    };
  }

  if (trimmed.length > MAX_SUBJECT_LENGTH) {
    return {
      field: 'subject',
      message: `Subject must not exceed ${MAX_SUBJECT_LENGTH} characters`,
      code: 'TOO_LONG'
    };
  }

  return null;
}

/**
 * Validates board/university name (1-200 characters)
 */
export function validateBoard(board: string): ValidationError | null {
  if (!board || typeof board !== 'string') {
    return {
      field: 'board',
      message: 'Board/University name is required',
      code: 'REQUIRED'
    };
  }

  const trimmed = board.trim();
  if (trimmed.length === 0) {
    return {
      field: 'board',
      message: 'Board/University name cannot be empty',
      code: 'REQUIRED'
    };
  }

  if (trimmed.length > MAX_BOARD_LENGTH) {
    return {
      field: 'board',
      message: `Board/University name must not exceed ${MAX_BOARD_LENGTH} characters`,
      code: 'TOO_LONG'
    };
  }

  return null;
}

/**
 * Validates file type (PDF or image formats)
 */
export function validateFileType(file: File): ValidationError | null {
  if (!file) {
    return {
      field: 'file',
      message: 'File is required',
      code: 'REQUIRED'
    };
  }

  const validTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ];

  if (!validTypes.includes(file.type)) {
    return {
      field: 'file',
      message: 'File must be a PDF or image (JPEG, PNG)',
      code: 'INVALID_FORMAT'
    };
  }

  return null;
}

/**
 * Sanitizes text input to prevent injection attacks
 */
export function sanitizeTextInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Escape special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return sanitized.trim();
}

/**
 * Validates complete resource metadata
 */
export function validateResourceMetadata(metadata: Partial<ResourceMetadata>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate title
  if (!metadata.title || typeof metadata.title !== 'string' || metadata.title.trim().length === 0) {
    errors.push({
      field: 'title',
      message: 'Title is required',
      code: 'REQUIRED'
    });
  } else if (metadata.title.trim().length > MAX_TITLE_LENGTH) {
    errors.push({
      field: 'title',
      message: `Title must not exceed ${MAX_TITLE_LENGTH} characters`,
      code: 'TOO_LONG'
    });
  }

  // Validate examType
  if (!metadata.examType) {
    errors.push({
      field: 'examType',
      message: 'Exam type is required',
      code: 'REQUIRED'
    });
  } else if (!VALID_EXAM_TYPES.includes(metadata.examType)) {
    errors.push({
      field: 'examType',
      message: 'Invalid exam type',
      code: 'INVALID_FORMAT'
    });
  }

  // Validate level
  if (!metadata.level) {
    errors.push({
      field: 'level',
      message: 'Level/Class is required',
      code: 'REQUIRED'
    });
  } else if (!VALID_LEVELS.includes(metadata.level)) {
    errors.push({
      field: 'level',
      message: 'Invalid level/class',
      code: 'INVALID_FORMAT'
    });
  }

  // Validate subject
  const subjectError = validateSubject(metadata.subject || '');
  if (subjectError) {
    errors.push(subjectError);
  }

  // Validate year
  const yearError = validateYear(metadata.year || 0);
  if (yearError) {
    errors.push(yearError);
  }

  // Validate board
  const boardError = validateBoard(metadata.board || '');
  if (boardError) {
    errors.push(boardError);
  }

  // Validate paperType
  if (!metadata.paperType) {
    errors.push({
      field: 'paperType',
      message: 'Paper type is required',
      code: 'REQUIRED'
    });
  } else if (!VALID_PAPER_TYPES.includes(metadata.paperType)) {
    errors.push({
      field: 'paperType',
      message: 'Invalid paper type',
      code: 'INVALID_FORMAT'
    });
  }

  // Validate optional description
  if (metadata.description && metadata.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push({
      field: 'description',
      message: `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`,
      code: 'TOO_LONG'
    });
  }

  return errors;
}

/**
 * Validates file size (max 50MB)
 */
export function validateFileSize(file: File, maxSizeMB: number = 50): ValidationError | null {
  if (!file) {
    return {
      field: 'file',
      message: 'File is required',
      code: 'REQUIRED'
    };
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      field: 'file',
      message: `File size must not exceed ${maxSizeMB}MB`,
      code: 'OUT_OF_RANGE'
    };
  }

  return null;
}
