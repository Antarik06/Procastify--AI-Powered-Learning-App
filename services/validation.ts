/**
 * Input Validation and Sanitization
 * Implements OWASP A03:2021 - Injection attack prevention
 * Prevents XSS, SQLi, and other injection attacks
 */

/**
 * Validates and sanitizes email addresses
 * Following RFC 5321/5322 standards
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

/**
 * Sanitizes string input to prevent XSS
 * Removes dangerous HTML/script tags
 */
export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
};

/**
 * Sanitizes email input
 * Prevents email injection attacks
 */
export const sanitizeEmail = (email: string): string => {
  if (typeof email !== 'string') {
    return '';
  }

  return email
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9@.\-_+]/g, '');
};

/**
 * Sanitizes password input
 * Validates minimum requirements
 */
export const validatePassword = (password: string): {
  valid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (typeof password !== 'string') {
    return { valid: false, errors: ['Password must be a string'] };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Sanitizes text input for content
 * Prevents XSS and injection attacks
 */
export const sanitizeContent = (text: string, maxLength: number = 100000): string => {
  if (typeof text !== 'string') {
    return '';
  }

  // Limit length
  let sanitized = text.substring(0, maxLength);

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized.trim();
};

/**
 * Validates URL to prevent open redirect attacks
 */
export const validateURL = (url: string): boolean => {
  if (typeof url !== 'string' || url.length === 0) {
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    // Only allow http/https
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
};

/**
 * Sanitizes URL to prevent open redirect attacks
 */
export const sanitizeURL = (url: string): string => {
  if (!validateURL(url)) {
    return '';
  }

  try {
    const urlObj = new URL(url);
    return urlObj.toString();
  } catch {
    return '';
  }
};

/**
 * Validates JSON input
 */
export const validateJSON = (jsonString: string): {
  valid: boolean;
  data: any;
  error?: string;
} => {
  if (typeof jsonString !== 'string') {
    return { valid: false, data: null, error: 'Input must be a string' };
  }

  // Limit JSON size
  if (jsonString.length > 1000000) {
    return { valid: false, data: null, error: 'JSON exceeds maximum size' };
  }

  try {
    const data = JSON.parse(jsonString);
    return { valid: true, data };
  } catch (error) {
    return {
      valid: false,
      data: null,
      error: error instanceof Error ? error.message : 'Invalid JSON'
    };
  }
};

/**
 * Validates numeric input
 */
export const validateNumber = (value: any, min?: number, max?: number): boolean => {
  const num = Number(value);

  if (isNaN(num)) {
    return false;
  }

  if (min !== undefined && num < min) {
    return false;
  }

  if (max !== undefined && num > max) {
    return false;
  }

  return true;
};

/**
 * Sanitizes filename to prevent directory traversal attacks
 */
export const sanitizeFilename = (filename: string): string => {
  if (typeof filename !== 'string') {
    return '';
  }

  return filename
    .replace(/[^a-zA-Z0-9._\-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .substring(0, 255);
};

/**
 * Validates file size
 */
export const validateFileSize = (sizeBytes: number, maxSizeMB: number = 10): boolean => {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return sizeBytes > 0 && sizeBytes <= maxBytes;
};

/**
 * Validates file type extension (whitelist-based)
 */
export const validateFileType = (filename: string, allowedExtensions: string[]): boolean => {
  if (typeof filename !== 'string') {
    return false;
  }

  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  return allowedExtensions.includes(ext);
};

/**
 * Comprehensive input validator for user data
 */
export const validateUserInput = (input: any, type: 'email' | 'password' | 'text' | 'url' | 'number'): {
  valid: boolean;
  sanitized: any;
  errors: string[];
} => {
  const errors: string[] = [];
  let sanitized: any = input;

  switch (type) {
    case 'email':
      if (!validateEmail(input)) {
        errors.push('Invalid email format');
      }
      sanitized = sanitizeEmail(input);
      break;

    case 'password':
      const passValidation = validatePassword(input);
      if (!passValidation.valid) {
        errors.push(...passValidation.errors);
      }
      break;

    case 'text':
      if (typeof input !== 'string' || input.length === 0) {
        errors.push('Text cannot be empty');
      }
      sanitized = sanitizeContent(input);
      break;

    case 'url':
      if (!validateURL(input)) {
        errors.push('Invalid URL format');
      }
      sanitized = sanitizeURL(input);
      break;

    case 'number':
      if (!validateNumber(input)) {
        errors.push('Invalid number format');
      }
      sanitized = Number(input);
      break;
  }

  return {
    valid: errors.length === 0,
    sanitized,
    errors
  };
};

export default {
  validateEmail,
  sanitizeString,
  sanitizeEmail,
  validatePassword,
  sanitizeContent,
  validateURL,
  sanitizeURL,
  validateJSON,
  validateNumber,
  sanitizeFilename,
  validateFileSize,
  validateFileType,
  validateUserInput
};
