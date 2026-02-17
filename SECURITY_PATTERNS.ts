/**
 * Security Module Examples and Patterns
 * 
 * This file shows best practices for using the security modules:
 * - rateLimiter.ts
 * - validation.ts
 * - secureKeyManager.ts
 * - securityLogger.ts
 * - securityInterceptor.ts
 */

// ============================================================================
// 1. RATE LIMITING EXAMPLES
// ============================================================================

import { apiRateLimiter, authRateLimiter, searchRateLimiter, uploadRateLimiter } from './services/rateLimiter';
import logger, { ErrorSeverity } from './services/securityLogger';

/**
 * Example 1: API Endpoint with Rate Limiting
 */
export async function fetchUserNotes(userId: string) {
  // Check rate limit before processing
  if (apiRateLimiter.isLimited(userId)) {
    logger.logRateLimitViolation(userId, '/notes');
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  // Your API call here
  const notes = await fetch('/api/notes');
  return notes;
}

/**
 * Example 2: Authentication with Rate Limiting  
 */
export async function authenticateUser(email: string, password: string) {
  if (authRateLimiter.isLimited(email)) {
    logger.logRateLimitViolation(email, '/auth');
    throw new Error('Too many login attempts. Please try again later.');
  }

  try {
    // Authenticate - would call Firebase or your auth service
    logger.logAuthEvent('Login successful', email, true);
    return { id: 'user-123' };
  } catch (error) {
    logger.logAuthEvent('Login failed', email, false, { error: String(error) });
    throw error;
  }
}

/**
 * Example 3: Search with Rate Limiting
 */
export async function searchNotes(userId: string, query: string) {
  if (searchRateLimiter.isLimited(userId)) {
    logger.logRateLimitViolation(userId, '/search');
    return [];
  }

  // Perform search
  logger.log(`Search for: ${query}`, 'SEARCH', 'INFO' as any);
  return [];
}

/**
 * Example 4: File Upload with Rate Limiting
 */
export async function uploadUserFile(userId: string, file: File) {
  if (uploadRateLimiter.isLimited(userId)) {
    logger.logRateLimitViolation(userId, '/upload');
    throw new Error('Upload limit exceeded');
  }

  // Upload file
  logger.log(`File uploaded: ${file.name}`, 'FILE', 'INFO' as any, { userId });
  return { success: true };
}

// ============================================================================
// 2. INPUT VALIDATION EXAMPLES
// ============================================================================

import {
  validateEmail,
  validatePassword,
  sanitizeContent,
  validateURL,
  sanitizeString,
  validateFileSize,
  validateFileType,
  validateUserInput
} from './services/validation';

/**
 * Example 1: Email Validation
 */
export function handleEmailInput(email: string) {
  if (!validateEmail(email)) {
    logger.logValidationError('email', 'Invalid email format', { email });
    throw new Error('Please enter a valid email address');
  }
  return email;
}

/**
 * Example 2: Password Validation
 */
export function validateNewPassword(password: string) {
  const validation = validatePassword(password);
  
  if (!validation.valid) {
    logger.logValidationError('password', validation.errors.join(', '));
    throw new Error(validation.errors[0]);
  }
  
  return password;
}

/**
 * Example 3: Content Sanitization
 */
export function processUserContent(content: string) {
  // Sanitize to prevent XSS and injection attacks
  const sanitized = sanitizeContent(content, 100000);
  
  if (!sanitized) {
    logger.logValidationError('content', 'Content is empty or invalid');
    throw new Error('Content cannot be empty');
  }
  
  return sanitized;
}

/**
 * Example 4: URL Validation
 */
export function handleURLInput(url: string) {
  if (!validateURL(url)) {
    logger.logValidationError('url', 'Invalid URL format', { url });
    throw new Error('Please enter a valid URL');
  }
  
  return url;
}

/**
 * Example 5: File Upload Validation
 */
export async function handleFileUpload(file: File) {
  // Validate file size (10MB default)
  if (!validateFileSize(file.size, 10)) {
    logger.logValidationError('fileSize', 'File exceeds 10MB limit');
    throw new Error('File is too large. Maximum size is 10MB');
  }
  
  // Validate file type
  const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
  if (!validateFileType(file.name, allowedTypes)) {
    logger.logValidationError('fileType', `Invalid file type: ${file.name}`);
    throw new Error(`File type not allowed. Allowed: ${allowedTypes.join(', ')}`);
  }
  
  return file;
}

/**
 * Example 6: Comprehensive Input Validation
 */
export function validateFormData(data: any) {
  const errors: Record<string, string> = {};

  // Validate email
  if (data.email) {
    const emailValidation = validateUserInput(data.email, 'email');
    if (!emailValidation.valid) {
      errors.email = emailValidation.errors[0] || 'Invalid email';
    }
  }

  // Validate password (only on signup)
  if (data.password && !data.isLogin) {
    const passValidation = validatePassword(data.password);
    if (!passValidation.valid) {
      errors.password = passValidation.errors[0] || 'Weak password';
    }
  }

  // Validate bio or description
  if (data.bio) {
    const bioValidation = validateUserInput(data.bio, 'text');
    if (!bioValidation.valid) {
      errors.bio = bioValidation.errors[0] || 'Invalid bio';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw { validationErrors: errors };
  }

  return data;
}

// ============================================================================
// 3. SECURE KEY MANAGEMENT EXAMPLES
// ============================================================================

import {
  getSecureKey,
  hasSecureKey,
  initializeSecureKeys,
  checkKeyAnomalies
} from './services/secureKeyManager';

/**
 * Example 1: Initialize Keys on App Start
 */
export function initializeApp() {
  // Call this once when app loads
  initializeSecureKeys();
  
  // Check if required keys are available
  if (!hasSecureKey('GEMINI_API_KEY')) {
    logger.logSecurityIncident(
      'Gemini API key not configured',
      ErrorSeverity.WARNING
    );
    // Disable AI features or show warning
  }

  if (!hasSecureKey('FIREBASE_API_KEY')) {
    logger.logSecurityIncident(
      'Firebase API key not configured',
      ErrorSeverity.WARNING
    );
  }
}

/**
 * Example 2: Use Secure Keys in API Calls
 */
export async function callGeminiAPI(prompt: string) {
  const apiKey = getSecureKey('GEMINI_API_KEY');
  
  if (!apiKey) {
    logger.logSecurityIncident(
      'Attempted to use Gemini API without valid key',
      ErrorSeverity.ERROR
    );
    throw new Error('AI service not configured');
  }
  
  // Use the key safely - never log it
  logger.log('Calling Gemini API', 'API', 'INFO' as any);
  // const response = await gemini.generateText(prompt, { apiKey });
  return null;
}

/**
 * Example 3: Monitor Key Usage
 */
export function monitorKeyUsage() {
  setInterval(() => {
    const anomalies = checkKeyAnomalies('GEMINI_API_KEY');
    
    if (anomalies.suspicious) {
      logger.logSecurityIncident(
        `Anomaly detected: ${anomalies.reason}`,
        ErrorSeverity.WARNING
      );
      // Take action: alert admin, throttle features, etc.
    }
  }, 60000); // Check every minute
}

// ============================================================================
// 4. SECURITY LOGGING EXAMPLES
// ============================================================================

/**
 * Example 1: Log Authentication Events
 */
export function trackLogin(userId: string, success: boolean) {
  logger.logAuthEvent(
    success ? 'User logged in' : 'Login attempt failed',
    userId,
    success,
    { timestamp: new Date().toISOString() }
  );
}

/**
 * Example 2: Log Validation Errors
 */
export function logValidationFailure(field: string, reason: string) {
  logger.logValidationError(field, reason, {
    timestamp: new Date().toISOString()
  });
}

/**
 * Example 3: Log Rate Limit Violations
 */
export function logRateLimitExceeded(userId: string, endpoint: string) {
  logger.logRateLimitViolation(userId, endpoint, {
    timestamp: new Date().toISOString()
  });
}

/**
 * Example 4: Log Security Incidents
 */
export function logSecurityEvent(incident: string, severity: ErrorSeverity) {
  logger.logSecurityIncident(incident, severity, {
    timestamp: new Date().toISOString()
  });
}

/**
 * Example 5: Get Security Audit Trail
 */
export function getSecurityAuditLog() {
  const logs = logger.getLogs();
  console.log('Security audit logs:', logs);
  
  // Export logs for analysis
  const json = logger.exportLogs();
  return json;
}

// ============================================================================
// 5. COMPREHENSIVE EXAMPLE: Complete Feature with Security
// ============================================================================

import { APIError, getClientErrorMessage } from './services/securityLogger';
import { sanitizeEmail } from './services/validation';

/**
 * Secure User Profile Update
 */
export async function updateUserProfile(userId: string, updates: any) {
  try {
    // 1. Validate user ID
    if (!userId || typeof userId !== 'string') {
      throw new APIError('Invalid user ID', 400);
    }

    // 2. Check rate limiting
    if (apiRateLimiter.isLimited(userId)) {
      logger.logRateLimitViolation(userId, '/profile/update');
      throw new APIError('Rate limit exceeded', 429);
    }

    // 3. Validate and sanitize inputs
    const validated: Record<string, any> = {};
    
    if (updates.email) {
      const emailValidation = validateUserInput(updates.email, 'email');
      if (!emailValidation.valid) {
        logger.logValidationError('email', emailValidation.errors.join(', '));
        throw new APIError('Invalid email format', 400);
      }
      validated.email = emailValidation.sanitized;
    }

    if (updates.bio) {
      const bioValidation = validateUserInput(updates.bio, 'text');
      if (!bioValidation.valid) {
        logger.logValidationError('bio', bioValidation.errors.join(', '));
        throw new APIError('Invalid bio', 400);
      }
      validated.bio = bioValidation.sanitized;
    }

    // 4. Perform the update
    // Would call: await firebaseService.updateProfile(userId, validated);
    logger.log('Profile would be updated here', 'API', 'INFO' as any);

    // 5. Log the event
    logger.logAuthEvent(
      'Profile updated',
      userId,
      true,
      { fields: Object.keys(validated) }
    );

    return { success: true, updated: validated };

  } catch (error: any) {
    // 6. Handle errors securely
    const clientMessage = error instanceof APIError 
      ? error.message 
      : getClientErrorMessage(error);

    logger.logAPIError('/profile/update', error, userId);
    
    throw {
      message: clientMessage,
      statusCode: error.statusCode || 500
    };
  }
}

// ============================================================================
// 6. TYPESCRIPT-ONLY SECURE IMPLEMENTATIONS
// ============================================================================

/**
 * Secure form validation helper
 */
export function validateSecureFormInput(
  field: string,
  value: any,
  type: 'email' | 'password' | 'text' | 'url' | 'number'
): { valid: boolean; error?: string; sanitized?: any } {
  const validation = validateUserInput(value, type);
  
  if (!validation.valid) {
    logger.logValidationError(field, validation.errors.join(', '));
    return {
      valid: false,
      error: validation.errors[0]
    };
  }

  return {
    valid: true,
    sanitized: validation.sanitized
  };
}

/**
 * Secure API Request Handler
 */
export async function makeSecureRequest(
  userId: string,
  endpoint: string,
  data: any,
  options: { rateLimit?: boolean; validateInput?: boolean } = {}
) {
  try {
    // Check rate limiting if enabled
    if (options.rateLimit !== false) {
      if (apiRateLimiter.isLimited(userId)) {
        logger.logRateLimitViolation(userId, endpoint);
        throw new APIError('Rate limit exceeded', 429);
      }
    }

    // Validate input if enabled
    if (options.validateInput !== false && data && typeof data === 'object') {
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'string') {
          const validation = validateUserInput(value, 'text');
          if (!validation.valid) {
            logger.logValidationError(key, validation.errors.join(', '));
            throw new APIError(`Invalid ${key}`, 400);
          }
        }
      });
    }

    // Log the request
    logger.log(`API Request: ${endpoint}`, 'API', 'INFO' as any, { userId });

    return { success: true, data };
  } catch (error: any) {
    logger.logAPIError(endpoint, error, userId);
    throw error;
  }
}

// ============================================================================
// 7. TESTING EXAMPLES
// ============================================================================

/**
 * Test Rate Limiting
 */
export function testRateLimiting() {
  const userId = 'test-user';
  
  for (let i = 0; i < 70; i++) {
    const limited = apiRateLimiter.isLimited(userId);
    
    if (i < 60) {
      console.assert(!limited, `Request ${i} should not be limited`);
    } else {
      console.assert(limited, `Request ${i} should be limited`);
    }
  }
  
  console.log('✓ Rate limiting test passed');
}

/**
 * Test Input Validation
 */
export function testInputValidation() {
  // Valid email
  console.assert(validateEmail('user@example.com'), 'Valid email should pass');
  
  // Invalid email
  console.assert(!validateEmail('invalid-email'), 'Invalid email should fail');
  
  // Strong password
  const strong = validatePassword('SecurePass123!');
  console.assert(strong.valid, 'Strong password should pass');
  
  // Weak password
  const weak = validatePassword('weak');
  console.assert(!weak.valid, 'Weak password should fail');
  
  console.log('✓ Input validation tests passed');
}

/**
 * Test Key Management
 */
export function testKeyManagement() {
  initializeSecureKeys();
  
  // Check if keys were loaded
  const hasGemini = hasSecureKey('GEMINI_API_KEY');
  const hasFirebase = hasSecureKey('FIREBASE_API_KEY');
  
  console.log(`✓ Gemini Key Available: ${hasGemini}`);
  console.log(`✓ Firebase Key Available: ${hasFirebase}`);
}

/**
 * Test Security Logging
 */
export function testSecurityLogging() {
  // Log various events
  logger.logAuthEvent('Test login', 'test-user', true);
  logger.logRateLimitViolation('test-user', '/api/test');
  logger.logValidationError('test-field', 'Test error');
  
  // Get logs
  const logs = logger.getLogs();
  console.log(`✓ Logged ${logs.length} security events`);
}

export default {
  // Rate limiting
  fetchUserNotes,
  authenticateUser,
  searchNotes,
  uploadUserFile,
  
  // Validation
  handleEmailInput,
  validateNewPassword,
  processUserContent,
  handleURLInput,
  handleFileUpload,
  validateFormData,
  
  // Key management
  initializeApp,
  callGeminiAPI,
  monitorKeyUsage,
  
  // Logging
  trackLogin,
  logValidationFailure,
  logRateLimitExceeded,
  logSecurityEvent,
  getSecurityAuditLog,
  
  // Comprehensive examples
  updateUserProfile,
  validateSecureFormInput,
  makeSecureRequest,
  
  // Testing
  testRateLimiting,
  testInputValidation,
  testKeyManagement,
  testSecurityLogging
};
