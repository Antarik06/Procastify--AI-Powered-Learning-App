/**
 * Model responses are JSON-ish: they arrive fenced, truncated, or with trailing
 * commentary. These helpers make parsing them non-fatal.
 */

/** Strips markdown fences the model wraps JSON in. */
export const cleanJSON = (text: string | undefined): string => {
  if (!text) return '';
  return text
    .replace(/^```json\s*/, '')
    .replace(/^```\s*/, '')
    .replace(/```$/, '')
    .trim();
};

/**
 * Parses model JSON, returning `fallback` instead of throwing.
 * A truncated array/object response is retried by cutting back to the last
 * complete element, which recovers most length-capped generations.
 */
export const safeJSONParse = <T>(text: string, fallback: T): T => {
  try {
    const cleaned = cleanJSON(text);
    if (!cleaned) return fallback;
    return JSON.parse(cleaned) as T;
  } catch (error) {
    console.warn('JSON Parse failed', error);

    if (error instanceof SyntaxError && text.includes('[{')) {
      try {
        const cutOff = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'));
        if (cutOff > 0) {
          return JSON.parse(cleanJSON(text.substring(0, cutOff + 1))) as T;
        }
      } catch (recoveryError) {
        console.warn('Recovery failed', recoveryError);
      }
    }

    return fallback;
  }
};
