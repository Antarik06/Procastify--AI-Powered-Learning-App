/**
 * Rate Limiter Utility
 * Implements OWASP rate limiting recommendations
 * Prevents abuse and DoS attacks
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // in milliseconds
  key?: string; // identifier for the limiter instance
}

interface RateLimitStore {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store: Map<string, RateLimitStore> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    // Cleanup old entries every 5 minutes
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
  }

  private getKey(identifier: string): string {
    return `${this.config.key || 'default'}_${identifier}`;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (value.resetTime < now) {
        this.store.delete(key);
      }
    }
  }

  isLimited(identifier: string): boolean {
    const key = this.getKey(identifier);
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.resetTime < now) {
      // Create new entry
      this.store.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs
      });
      return false;
    }

    // Check if limit exceeded
    if (entry.count >= this.config.maxRequests) {
      return true;
    }

    // Increment count
    entry.count++;
    return false;
  }

  getRemainingRequests(identifier: string): number {
    const key = this.getKey(identifier);
    const entry = this.store.get(key);

    if (!entry || entry.resetTime < Date.now()) {
      return this.config.maxRequests;
    }

    return Math.max(0, this.config.maxRequests - entry.count);
  }

  getResetTime(identifier: string): number {
    const key = this.getKey(identifier);
    const entry = this.store.get(key);

    if (!entry) {
      return Date.now();
    }

    return entry.resetTime;
  }

  reset(identifier?: string): void {
    if (identifier) {
      this.store.delete(this.getKey(identifier));
    } else {
      this.store.clear();
    }
  }
}

// Default rate limiters for common scenarios
export const apiRateLimiter = new RateLimiter({
  maxRequests: 60,
  windowMs: 60 * 1000, // 1 minute
  key: 'api'
});

export const authRateLimiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  key: 'auth'
});

export const searchRateLimiter = new RateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000, // 1 minute
  key: 'search'
});

export const uploadRateLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
  key: 'upload'
});

export default RateLimiter;
