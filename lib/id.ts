/** Short, collision-resistant-enough id for client-side entities. */
export function createId(prefix?: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  const stamp = Date.now().toString(36);
  return prefix ? `${prefix}_${stamp}${random}` : `${stamp}${random}`;
}

/** Numeric timestamp id, kept for entities whose ids are stringified epochs. */
export function createTimestampId(): string {
  return Date.now().toString();
}
