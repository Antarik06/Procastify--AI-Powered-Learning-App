/**
 * Error Handling Utilities for Procastify
 * Provides comprehensive error handling, validation, and recovery mechanisms
 * for API services and async operations.
 */

// Custom Error Types
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public originalError: unknown,
    message: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

// Type Guard for API Responses
export function isValidResponse<T>(data: unknown): data is T {
  return data !== null && data !== undefined && typeof data === 'object';
}

// Async Operation with Timeout
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
}

// Retry Logic with Exponential Backoff
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}

// Safe API Call Wrapper
export async function safeAPICall<T>(
  apiFunction: () => Promise<T>,
  operationName: string,
  timeoutMs?: number
): Promise<{ success: boolean; data?: T; error?: Error }> {
  try {
    const operation = timeoutMs 
      ? withTimeout(apiFunction(), timeoutMs)
      : apiFunction();
    
    const data = await operation;
    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred';
    
    console.error(`[${operationName}] Error:`, errorMessage);
    return { 
      success: false, 
      error: new Error(`${operationName}: ${errorMessage}`) 
    };
  }
}

export default {
  APIError,
  ValidationError,
  TimeoutError,
  isValidResponse,
  withTimeout,
  withRetry,
  safeAPICall,
};
