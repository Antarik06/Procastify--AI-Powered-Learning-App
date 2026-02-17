/**
 * Error Handling and Security Logging
 * Implements OWASP A09:2021 - Logging and Monitoring Failures
 */

export enum ErrorSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export interface SecurityLog {
  timestamp: string;
  severity: ErrorSeverity;
  category: string;
  message: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

class SecurityLogger {
  private logs: SecurityLog[] = [];
  private maxLogs = 1000;
  private listeners: ((log: SecurityLog) => void)[] = [];

  /**
   * Logs a security event
   */
  log(
    message: string,
    category: string,
    severity: ErrorSeverity = ErrorSeverity.INFO,
    details?: Record<string, any>
  ): void {
    const log: SecurityLog = {
      timestamp: new Date().toISOString(),
      severity,
      category,
      message,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      details
    };

    this.logs.push(log);

    // Keep logs at manageable size
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(log));

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod =
        severity === ErrorSeverity.INFO ? 'info' :
        severity === ErrorSeverity.WARNING ? 'warn' :
        severity === ErrorSeverity.CRITICAL ? 'error' : 'log';

      console[consoleMethod as any](`[${category}] ${message}`, details);
    }
  }

  /**
   * Logs authentication events
   */
  logAuthEvent(message: string, userId: string, success: boolean, details?: Record<string, any>): void {
    this.log(
      message,
      'AUTH',
      success ? ErrorSeverity.INFO : ErrorSeverity.WARNING,
      { userId, success, ...details }
    );
  }

  /**
   * Logs rate limit violations
   */
  logRateLimitViolation(identifier: string, endpoint: string, details?: Record<string, any>): void {
    this.log(
      `Rate limit exceeded for ${identifier} on ${endpoint}`,
      'RATE_LIMIT',
      ErrorSeverity.WARNING,
      { identifier, endpoint, ...details }
    );
  }

  /**
   * Logs validation errors
   */
  logValidationError(field: string, reason: string, details?: Record<string, any>): void {
    this.log(
      `Validation error on field ${field}: ${reason}`,
      'VALIDATION',
      ErrorSeverity.WARNING,
      { field, reason, ...details }
    );
  }

  /**
   * Logs security incidents
   */
  logSecurityIncident(incident: string, severity: ErrorSeverity = ErrorSeverity.ERROR, details?: Record<string, any>): void {
    this.log(incident, 'SECURITY', severity, details);
  }

  /**
   * Logs API errors
   */
  logAPIError(endpoint: string, error: any, userId?: string): void {
    const errorMessage = error instanceof Error ? error.message : String(error);

    this.log(
      `API error on ${endpoint}: ${errorMessage}`,
      'API',
      ErrorSeverity.ERROR,
      { endpoint, userId, errorType: error?.name }
    );
  }

  /**
   * Subscribe to log events
   */
  subscribe(listener: (log: SecurityLog) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Gets logs with optional filtering
   */
  getLogs(category?: string, severity?: ErrorSeverity): SecurityLog[] {
    return this.logs.filter(log =>
      (!category || log.category === category) &&
      (!severity || log.severity === severity)
    );
  }

  /**
   * Exports logs in JSON format
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Clears sensitive data from logs
   */
  clearLogs(): void {
    this.logs = [];
  }
}

const logger = new SecurityLogger();

/**
 * Custom error class for API errors
 */
export class APIError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

/**
 * Error handler for async functions
 */
export const asyncErrorHandler = (fn: Function) => {
  return (...args: any[]) => {
    Promise.resolve(fn(...args)).catch((error) => {
      logger.logSecurityIncident(
        `Unhandled async error: ${error?.message}`,
        ErrorSeverity.ERROR,
        { stack: error?.stack }
      );
    });
  };
};

/**
 * Validates and sanitizes error message for client display
 */
export const getClientErrorMessage = (error: any, isDevelopment: boolean = false): string => {
  if (isDevelopment && error instanceof Error) {
    return error.message;
  }

  // Generic error message for production
  if (error?.statusCode === 401) {
    return 'Authentication failed. Please log in again.';
  }

  if (error?.statusCode === 403) {
    return 'You do not have permission to perform this action.';
  }

  if (error?.statusCode === 404) {
    return 'The requested resource was not found.';
  }

  if (error?.statusCode === 429) {
    return 'Too many requests. Please try again later.';
  }

  if (error?.statusCode === 500) {
    return 'An unexpected error occurred. Please try again later.';
  }

  return 'An error occurred. Please try again.';
};

export default logger;
