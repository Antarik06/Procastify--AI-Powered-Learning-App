/**
 * Single source of truth for build-time environment variables.
 *
 * Vite only inlines `import.meta.env.VITE_*` into the browser bundle. `process`
 * does not exist in the browser, so reading `process.env.X` directly throws a
 * ReferenceError instead of returning undefined. Every consumer must go through
 * this module.
 */

const viteEnv = (import.meta.env ?? {}) as Record<string, string | undefined>;

/**
 * Reads a variable by its unprefixed name, e.g. `getEnvVar('GEMINI_API_KEY')`
 * resolves `VITE_GEMINI_API_KEY` (falling back to the legacy `REACT_APP_` prefix).
 */
export const getEnvVar = (name: string): string | undefined => {
  const value = viteEnv[`VITE_${name}`] ?? viteEnv[`REACT_APP_${name}`];
  return value && value.trim() ? value : undefined;
};

export const getGeminiApiKey = (): string | undefined => getEnvVar('GEMINI_API_KEY');
