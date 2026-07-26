/**
 * Tiny localStorage "database" used for guest mode and offline fallbacks.
 * Every collection is stored as a flat array and filtered by userId on read.
 */

export const getLocalDB = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch (error) {
    console.error(`[storage] Failed to read ${key}:`, error);
    return [];
  }
};

export const saveLocalDB = <T>(key: string, data: T[]): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`[storage] Failed to write ${key}:`, error);
  }
};

export const getLocalUserItems = <T extends { userId: string }>(
  key: string,
  userId: string,
): T[] => getLocalDB<T>(key).filter((item) => item.userId === userId);

export const saveLocalUserItems = <T extends { userId: string }>(
  key: string,
  userId: string,
  items: T[],
): void => {
  const others = getLocalDB<T>(key).filter((item) => item.userId !== userId);
  saveLocalDB(key, [...others, ...items]);
};
