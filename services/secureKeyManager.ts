/**
 * Secure API Key Management
 * Implements OWASP A02:2021 - Cryptographic Failures
 * Prevents API key exposure and misuse
 */

interface KeyConfig {
  name: string;
  pattern?: RegExp;
  maxAge?: number; // in milliseconds
}

interface ManagedKey {
  key: string;
  createdAt: number;
  lastUsed: number;
  usageCount: number;
}

class SecureKeyManager {
  private keys: Map<string, ManagedKey> = new Map();
  private configs: Map<string, KeyConfig> = new Map();
  private rotationInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Auto-rotate keys periodically if window is available
    if (typeof window !== 'undefined') {
      this.startRotationCheck();
    }
  }

  /**
   * Registers a key configuration
   */
  registerKey(name: string, config: Partial<KeyConfig> = {}): void {
    this.configs.set(name, {
      name,
      ...config
    });
  }

  /**
   * Securely stores an API key
   */
  setKey(name: string, key: string): {
    success: boolean;
    error?: string;
  } {
    if (!key || typeof key !== 'string') {
      return { success: false, error: 'Invalid key format' };
    }

    const config = this.configs.get(name);

    // Validate against pattern if configured
    if (config?.pattern && !config.pattern.test(key)) {
      return { success: false, error: `Invalid format for key: ${name}` };
    }

    const now = Date.now();
    this.keys.set(name, {
      key,
      createdAt: now,
      lastUsed: now,
      usageCount: 0
    });

    return { success: true };
  }

  /**
   * Safely retrieves an API key
   */
  getKey(name: string): { key: string | null; valid: boolean; warning?: string } {
    const managed = this.keys.get(name);

    if (!managed) {
      return { key: null, valid: false, warning: `Key not found: ${name}` };
    }

    // Check if key has expired
    const config = this.configs.get(name);
    if (config?.maxAge) {
      const age = Date.now() - managed.createdAt;
      if (age > config.maxAge) {
        this.keys.delete(name);
        return { key: null, valid: false, warning: `Key expired: ${name}` };
      }
    }

    // Update usage stats
    managed.lastUsed = Date.now();
    managed.usageCount++;

    return { key: managed.key, valid: true };
  }

  /**
   * Gets key usage statistics
   */
  getKeyStats(name: string): { usageCount: number; lastUsed: number; age: number } | null {
    const managed = this.keys.get(name);

    if (!managed) {
      return null;
    }

    return {
      usageCount: managed.usageCount,
      lastUsed: managed.lastUsed,
      age: Date.now() - managed.createdAt
    };
  }

  /**
   * Revokes a key
   */
  revokeKey(name: string): boolean {
    if (this.keys.has(name)) {
      this.keys.delete(name);
      return true;
    }
    return false;
  }

  /**
   * Revokes all keys
   */
  revokeAllKeys(): number {
    const count = this.keys.size;
    this.keys.clear();
    return count;
  }

  /**
   * Checks if key is valid and available
   */
  hasValidKey(name: string): boolean {
    const result = this.getKey(name);
    return result.valid && result.key !== null;
  }

  /**
   * Masks sensitive key for logging
   */
  maskKey(key: string, visibleChars: number = 4): string {
    if (key.length <= visibleChars) {
      return '*'.repeat(key.length);
    }
    return key.substring(0, visibleChars) + '*'.repeat(key.length - visibleChars);
  }

  /**
   * Detects suspicious key usage patterns
   */
  detectAnomalies(name: string, threshold: number = 100): {
    suspicious: boolean;
    reason?: string;
  } {
    const stats = this.getKeyStats(name);

    if (!stats) {
      return { suspicious: false };
    }

    // Alert if usage exceeds threshold
    if (stats.usageCount > threshold) {
      return {
        suspicious: true,
        reason: `Key usage exceeds threshold: ${stats.usageCount}/${threshold}`
      };
    }

    // Alert if key very old
    const maxAge = this.configs.get(name)?.maxAge || 90 * 24 * 60 * 60 * 1000; // 90 days
    if (stats.age > maxAge * 2) {
      return {
        suspicious: true,
        reason: 'Key is very old - consider rotation'
      };
    }

    return { suspicious: false };
  }

  /**
   * Starts periodic rotation check
   */
  private startRotationCheck(): void {
    // Check for key rotation every hour
    this.rotationInterval = setInterval(() => {
      this.keys.forEach((managed, name) => {
        const config = this.configs.get(name);
        if (config?.maxAge) {
          const age = Date.now() - managed.createdAt;
          if (age > config.maxAge * 0.8) {
            console.warn(`Key ${name} is approaching expiration`);
          }
        }
      });
    }, 60 * 60 * 1000);
  }

  /**
   * Stops rotation check
   */
  stopRotationCheck(): void {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
      this.rotationInterval = null;
    }
  }

  /**
   * Clears all stored keys
   */
  destroy(): void {
    this.stopRotationCheck();
    this.revokeAllKeys();
    this.configs.clear();
  }
}

// Singleton instance
const keyManager = new SecureKeyManager();

/**
 * Initialize and load API keys from environment
 */
export const initializeSecureKeys = (): void => {
  // Register key configurations
  keyManager.registerKey('GEMINI_API_KEY', {
    pattern: /^[A-Za-z0-9_-]{32,}$/,
    maxAge: 90 * 24 * 60 * 60 * 1000 // 90 days
  });

  keyManager.registerKey('FIREBASE_API_KEY', {
    pattern: /^[A-Za-z0-9_-]{30,}$/,
    maxAge: 180 * 24 * 60 * 60 * 1000 // 180 days
  });

  // Load keys from environment
  typeof window !== 'undefined' ? (() => {
    try {
      // Browser environment - use window.process or bundler-provided env
      const env = (window as any).__ENV__ || {};
      const geminiKey = env.VITE_GEMINI_API_KEY;
      if (geminiKey) keyManager.setKey('GEMINI_API_KEY', geminiKey);

      const firebaseKey = env.VITE_FIREBASE_API_KEY;
      if (firebaseKey) keyManager.setKey('FIREBASE_API_KEY', firebaseKey);
    } catch (error) {
      console.warn('Could not load keys from environment');
    }
  })() : null;
};

/**
 * Safely retrieves a managed API key
 */
export const getSecureKey = (name: string): string | null => {
  const result = keyManager.getKey(name);

  if (!result.valid) {
    console.error(result.warning);
    return null;
  }

  return result.key;
};

/**
 * Checks if API key is available
 */
export const hasSecureKey = (name: string): boolean => {
  return keyManager.hasValidKey(name);
};

/**
 * Gets key usage information (for logging, not for display)
 */
export const getKeyUsageInfo = (name: string): string => {
  const stats = keyManager.getKeyStats(name);

  if (!stats) {
    return 'Key not found';
  }

  return `Used ${stats.usageCount} times, last used ${new Date(stats.lastUsed).toISOString()}`;
};

/**
 * Detects suspicious key usage
 */
export const checkKeyAnomalies = (name: string): { suspicious: boolean; reason?: string } => {
  return keyManager.detectAnomalies(name);
};

/**
 * Revokes a specific key
 */
export const revokeSecureKey = (name: string): boolean => {
  return keyManager.revokeKey(name);
};

/**
 * Revokes all keys (use with caution)
 */
export const revokeAllSecureKeys = (): number => {
  return keyManager.revokeAllKeys();
};

/**
 * Cleanup on app unload
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    keyManager.destroy();
  });
}

export default keyManager;
