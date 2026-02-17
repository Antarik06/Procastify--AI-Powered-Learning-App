/**
 * Example: How to use Security Modules in Procastify
 * 
 * This file provides practical examples of how to use the security
 * modules throughout the application.
 */

// ============================================================================
// 1. RATE LIMITING EXAMPLES
// ============================================================================

import { apiRateLimiter, authRateLimiter, searchRateLimiter } from './services/rateLimiter';
import logger, { ErrorSeverity } from './services/securityLogger';

/**
 * Example 1: API Endpoint with Rate Limiting
 */
export async function fetchUserNotes(userId: string) {
  // Check rate limit
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

  // Authenticate
  try {
    const user = await signInWithEmail(email, password);
    logger.logAuthEvent('Login successful', user.id, true);
    return user;
  } catch (error) {
    logger.logAuthEvent('Login failed', email, false, { error: error.message });
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
  return performSearch(query);
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
  validateFileType
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
export function procesUserContent(content: string) {
  // Sanitize to prevent XSS
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
    throw new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }
  
  return file;
}

// ============================================================================
// 3. SECURE KEY MANAGEMENT EXAMPLES
// ============================================================================

import {
  getSecureKey,
  hasSecureKey,
  initializeSecureKeys,
  checkKeyAnomalies,
  revokeSecureKey
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
  
  // Use the key safely
  const response = await gemini.generateText(prompt, { apiKey });
  return response;
}

/**
 * Example 3: Monitor Key Usage
 */
export function monitorKeyUsage() {
  setInterval(() => {
    const anomalies = checkKeyAnomalies('GEMINI_API_KEY', 100);
    
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
export async function trackLogin(userId: string, success: boolean) {
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
    timestamp: new Date().toISOString(),
    userId: getCurrentUserId()
  });
}

/**
 * Example 5: Get Security Audit Trail
 */
export function getAuditLog(category?: string) {
  const logs = logger.getLogs(category);
  console.table(logs);
  
  // Or export for analysis
  const json = logger.exportLogs();
  downloadFile(json, 'audit-log.json');
}

// ============================================================================
// 5. SECURITY INTERCEPTOR EXAMPLES
// ============================================================================

import securityInterceptor from './services/securityInterceptor';

/**
 * Example 1: Register Custom Interceptor
 */
export function setupSecurityInterceptors() {
  // Add custom request interceptor
  securityInterceptor.registerRequestInterceptor(async (config) => {
    // Add authentication token
    const token = getAuthToken();
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`
    };
    
    return config;
  });
  
  // Add custom response interceptor
  securityInterceptor.registerResponseInterceptor(async (response) => {
    // Handle 401 Unauthorized
    if (response.status === 401) {
      redirect('/login');
    }
    
    return response;
  });
  
  // Add custom error interceptor
  securityInterceptor.registerErrorInterceptor(async (error) => {
    logger.logAPIError(`Request failed: ${error.message}`, error);
    throw error;
  });
}

// ============================================================================
// 6. COMPREHENSIVE EXAMPLE: Complete Feature with Security
// ============================================================================

import { validateUserInput, sanitizeEmail } from './services/validation';
import { APIError, getClientErrorMessage } from './services/securityLogger';

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
    const validated = {};
    
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
    const updatedProfile = await firebaseService.updateProfile(userId, validated);

    // 5. Log the event
    logger.logAuthEvent(
      'Profile updated',
      userId,
      true,
      { fields: Object.keys(validated) }
    );

    return updatedProfile;

  } catch (error) {
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
// 7. REACT COMPONENT EXAMPLES
// ============================================================================

import React, { useState } from 'react';

/**
 * Secure Login Component
 */
export function SecureLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // 1. Validate inputs
      if (!validateEmail(email)) {
        setError('Please enter a valid email');
        return;
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        setError(passwordValidation.errors[0]);
        return;
      }

      // 2. Authenticate with rate limiting
      if (authRateLimiter.isLimited(email)) {
        setError('Too many login attempts. Please try again later.');
        return;
      }

      // 3. Log authentication attempt
      logger.logAuthEvent('Login attempt', sanitizeEmail(email), true);

      // 4. Call authentication API
      const user = await authenticateUser(email, password);
      
      // Success - redirect to dashboard
      window.location.href = '/dashboard';

    } catch (error) {
      // 5. Handle error safely
      const message = getClientErrorMessage(error);
      setError(message);
      
      logger.logAuthEvent(
        'Login failed',
        sanitizeEmail(email),
        false,
        { error: error.message }
      );
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      
      <button type="submit">Login</button>
    </form>
  );
}

/**
 * Secure File Upload Component
 */
export function SecureFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const userId = getCurrentUserId();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setUploading(true);

    try {
      // 1. Check rate limiting
      if (uploadRateLimiter.isLimited(userId)) {
        throw new APIError('Upload limit exceeded', 429);
      }

      // 2. Validate file
      await handleFileUpload(file);

      // 3. Upload with security checks
      const result = await uploadFile(userId, file);
      
      logger.log(`File uploaded: ${file.name}`, 'FILE_UPLOAD', 'INFO' as any);
      setError('File uploaded successfully');

    } catch (error) {
      const message = getClientErrorMessage(error);
      setError(message);
      logger.logAPIError('/upload', error, userId);
      
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {error && <div className="message">{error}</div>}
      <input
        type="file"
        onChange={handleFileChange}
        disabled={uploading}
      />
    </div>
  );
}

// ============================================================================
// 8. TESTING EXAMPLES
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

export default {
  fetchUserNotes,
  authenticateUser,
  searchNotes,
  initializeApp,
  updateUserProfile,
  SecureLoginForm,
  SecureFileUpload,
  testRateLimiting,
  testInputValidation
};
