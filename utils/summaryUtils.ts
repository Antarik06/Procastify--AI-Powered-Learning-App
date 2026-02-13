import { Summary, SummarySession, Attachment } from '../types';

/**
 * Generates a user-friendly title for a summary based on its content
 * Priority: original text > attachment names > generic label
 */
export const generateSummaryTitle = (summary: Summary): string => {
  // Priority 1: Use original text (first 50 chars)
  if (summary.originalText && summary.originalText.trim()) {
    const text = summary.originalText.trim();
    return text.length > 50 ? text.substring(0, 50) + '...' : text;
  }
  
  // Priority 2: Use attachment names
  if (summary.attachments && summary.attachments.length > 0) {
    const firstAttachment = summary.attachments[0];
    return firstAttachment.name || `${firstAttachment.type} attachment`;
  }
  
  // Priority 3: Generic label
  return 'Untitled Summary';
};

/**
 * Formats a timestamp into a human-readable relative time string
 * Examples: "Just now", "5m ago", "2h ago", "3d ago", "Jan 15"
 */
export const formatSummaryDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

/**
 * Determines the summary type based on attachments
 */
export const determineType = (attachments: Attachment[]): Summary['type'] => {
  if (attachments.length === 0) return 'text';
  if (attachments.length > 1) return 'mixed';
  
  const type = attachments[0].type;
  if (type === 'url') {
    // Could check if YouTube URL for 'video'
    return 'article';
  }
  return type as Summary['type'];
};
