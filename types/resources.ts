export type ExamType = 'JEE' | 'NEET' | 'GATE' | 'ICSE' | 'CBSE' | 'University' | 'Other';

export type Level = '10' | '12' | 'UG' | 'PG' | 'Other';

export type PaperType = 'PYQ' | 'Mock' | 'Sample' | 'Practice';

export type FileType = 'pdf' | 'image';

export interface StudyResource {
  id: string;
  userId: string;
  /** Firebase user id. */
  ownerId: string;

  title: string;
  examType: ExamType;
  level: Level;
  subject: string;
  year: number;
  /** Board or university name. */
  board: string;
  paperType: PaperType;
  description?: string;

  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: FileType;

  createdAt: number | any;
  updatedAt: number | any;

  viewCount?: number;
  downloadCount?: number;
}

export interface ResourceMetadata {
  title: string;
  examType: ExamType;
  level: Level;
  subject: string;
  year: number;
  board: string;
  paperType: PaperType;
  description?: string;
}

export interface ResourceFilters {
  examType?: ExamType[];
  level?: Level[];
  subject?: string[];
  year?: number[];
  board?: string[];
  paperType?: PaperType[];
}

export interface PaginatedResources {
  resources: StudyResource[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface UploadResult {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface SearchResult {
  resources: StudyResource[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
