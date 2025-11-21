import { CreationHistoryItem } from '../types';

const DB_NAME = 'GeminiStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'creations';

// Helper to open the database
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("IndexedDB error:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        // Index by userId to allow multi-user support on same device
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
};

export const getHistory = async (userId: string): Promise<CreationHistoryItem[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('userId');
      const request = index.getAll(userId);

      request.onsuccess = () => {
        const results = (request.result as (CreationHistoryItem & { userId: string })[]) || [];
        // Sort by createdAt descending (newest first)
        results.sort((a, b) => b.createdAt - a.createdAt);
        resolve(results);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Failed to load history from IndexedDB", e);
    return [];
  }
};

export const saveToHistory = async (userId: string, item: CreationHistoryItem): Promise<CreationHistoryItem[]> => {
  try {
    const db = await openDB();
    
    // Augment item with userId for indexing
    const itemWithUser = { ...item, userId };

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(itemWithUser);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Return updated history list
    return getHistory(userId);
  } catch (e) {
    console.error("Failed to save to IndexedDB", e);
    throw e;
  }
};

export const clearHistory = async (userId: string) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('userId');
    const request = index.openCursor(IDBKeyRange.only(userId));

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  } catch (e) {
    console.error("Failed to clear history", e);
  }
};