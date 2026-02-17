/**
 * Security Middleware for API Requests
 * Implements OWASP recommendations for secure API communication
 */

import { apiRateLimiter, authRateLimiter } from './rateLimiter';
import { validateUserInput, sanitizeString } from './validation';
import logger, { APIError } from './securityLogger';

interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  data?: any;
  headers?: Record<string, string>;
  userId?: string;
}

interface ResponseConfig {
  status: number;
  data: any;
  timestamp?: number;
}

class SecurityInterceptor {
  private requestInterceptors: ((config: RequestConfig) => RequestConfig | Promise<RequestConfig>)[] = [];
  private responseInterceptors: ((config: ResponseConfig) => ResponseConfig | Promise<ResponseConfig>)[] = [];
  private errorInterceptors: ((error: any) => any)[] = [];

  /**
   * Register a request interceptor
   */
  registerRequestInterceptor(
    interceptor: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>
  ): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      this.requestInterceptors = this.requestInterceptors.filter(i => i !== interceptor);
    };
  }

  /**
   * Register a response interceptor
   */
  registerResponseInterceptor(
    interceptor: (config: ResponseConfig) => ResponseConfig | Promise<ResponseConfig>
  ): () => void {
    this.responseInterceptors.push(interceptor);
    return () => {
      this.responseInterceptors = this.responseInterceptors.filter(i => i !== interceptor);
    };
  }

  /**
   * Register an error interceptor
   */
  registerErrorInterceptor(interceptor: (error: any) => any): () => void {
    this.errorInterceptors.push(interceptor);
    return () => {
      this.errorInterceptors = this.errorInterceptors.filter(i => i !== interceptor);
    };
  }

  /**
   * Process request through all interceptors
   */
  async processRequest(config: RequestConfig): Promise<RequestConfig> {
    let processedConfig = config;

    for (const interceptor of this.requestInterceptors) {
      processedConfig = await interceptor(processedConfig);
    }

    return processedConfig;
  }

  /**
   * Process response through all interceptors
   */
  async processResponse(response: ResponseConfig): Promise<ResponseConfig> {
    let processedResponse = response;

    for (const interceptor of this.responseInterceptors) {
      processedResponse = await interceptor(processedResponse);
    }

    return processedResponse;
  }

  /**
   * Process error through all interceptors
   */
  async processError(error: any): Promise<any> {
    let processedError = error;

    for (const interceptor of this.errorInterceptors) {
      processedError = await interceptor(processedError);
    }

    return processedError;
  }
}

const interceptor = new SecurityInterceptor();

/**
 * Default security interceptors
 */

// Rate limiting interceptor
interceptor.registerRequestInterceptor(async (config: RequestConfig) => {
  const identifier = config.userId || 'anonymous';
  const limiter = config.endpoint.includes('/auth') ? authRateLimiter : apiRateLimiter;

  if (limiter.isLimited(identifier)) {
    logger.logRateLimitViolation(identifier, config.endpoint);
    throw new APIError('Rate limit exceeded', 429);
  }

  return config;
});

// Input sanitization interceptor
interceptor.registerRequestInterceptor(async (config: RequestConfig) => {
  if (config.data && typeof config.data === 'object') {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(config.data)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else {
        sanitized[key] = value;
      }
    }

    config.data = sanitized;
  }

  return config;
});

// Security headers interceptor
interceptor.registerRequestInterceptor(async (config: RequestConfig) => {
  return {
    ...config,
    headers: {
      ...config.headers,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'",
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    }
  };
});

// Response validation interceptor
interceptor.registerResponseInterceptor(async (response: ResponseConfig) => {
  // Log all API responses for security audit
  logger.log(
    `API Response`,
    'API',
    'INFO' as any,
    { endpoint: response, status: response.status, timestamp: response.timestamp }
  );

  // Check for error responses
  if (response.status >= 400) {
    logger.logSecurityIncident(
      `API Error: ${response.status}`,
      'WARNING' as any,
      { response }
    );
  }

  return response;
});

// Error handler interceptor
interceptor.registerErrorInterceptor(async (error: any) => {
  logger.logSecurityIncident(
    `Request Error: ${error?.message || 'Unknown error'}`,
    error?.statusCode === 429 ? 'WARNING' as any : 'ERROR' as any,
    { error: error?.message }
  );

  if (error.statusCode === 429) {
    throw new APIError('Too many requests. Please try again later.', 429);
  }

  if (error.statusCode === 401) {
    throw new APIError('Authentication required', 401);
  }

  if (error.statusCode === 403) {
    throw new APIError('Access denied', 403);
  }

  throw error;
});

export default interceptor;
