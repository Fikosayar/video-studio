
import { CreationHistoryItem, Asset, Album } from '../types';

const DB_NAME = 'GeminiStudioDB';
const DB_VERSION = 3; // Incremented for Albums store
const STORE_HISTORY = 'creations';
const STORE_ASSETS = 'assets';
const STORE_ALBUMS = 'albums';

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
      
      // History Store
      if (!db.objectStoreNames.contains(STORE_HISTORY)) {
        const store = db.createObjectStore(STORE_HISTORY, { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('albumId', 'albumId', { unique: false });
      } else {
        // Upgrade existing store if needed
        const store = (event.target as IDBOpenDBRequest).transaction?.objectStore(STORE_HISTORY);
        if (store && !store.indexNames.contains('albumId')) {
             store.createIndex('albumId', 'albumId', { unique: false });
        }
      }

      // Assets Store (For saved characters/reference images)
      if (!db.objectStoreNames.contains(STORE_ASSETS)) {
        const assetStore = db.createObjectStore(STORE_ASSETS, { keyPath: 'id' });
        assetStore.createIndex('userId', 'userId', { unique: false });
      }

      // Albums Store
      if (!db.objectStoreNames.contains(STORE_ALBUMS)) {
        const albumStore = db.createObjectStore(STORE_ALBUMS, { keyPath: 'id' });
        albumStore.createIndex('userId', 'userId', { unique: false });
      }
    };
  });
};

// --- History Methods ---

export const getHistory = async (userId: string): Promise<CreationHistoryItem[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_HISTORY, 'readonly');
      const store = transaction.objectStore(STORE_HISTORY);
      const index = store.index('userId');
      const request = index.getAll(userId);

      request.onsuccess = () => {
        const results = (request.result as (CreationHistoryItem & { userId: string })[]) || [];
        results.sort((a, b) => b.createdAt - a.createdAt);
        resolve(results);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Failed to load history", e);
    return [];
  }
};

export const saveToHistory = async (userId: string, item: CreationHistoryItem): Promise<CreationHistoryItem[]> => {
  try {
    const db = await openDB();
    const itemWithUser = { ...item, userId };

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_HISTORY, 'readwrite');
      const store = transaction.objectStore(STORE_HISTORY);
      const request = store.put(itemWithUser);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    return getHistory(userId);
  } catch (e) {
    console.error("Failed to save to history", e);
    throw e;
  }
};

export const updateHistoryItem = async (userId: string, itemId: string, updates: Partial<CreationHistoryItem>): Promise<CreationHistoryItem[]> => {
  try {
    const db = await openDB();
    
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_HISTORY, 'readwrite');
      const store = transaction.objectStore(STORE_HISTORY);
      
      const getRequest = store.get(itemId);
      
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (!item) {
          reject(new Error("Item not found"));
          return;
        }
        
        const updatedItem = { ...item, ...updates };
        const putRequest = store.put(updatedItem);
        
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });

    return getHistory(userId);
  } catch (e) {
    console.error("Failed to update item", e);
    throw e;
  }
};

export const deleteFromHistory = async (userId: string, itemId: string): Promise<CreationHistoryItem[]> => {
    try {
        const db = await openDB();
        await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(STORE_HISTORY, 'readwrite');
            const store = transaction.objectStore(STORE_HISTORY);
            const request = store.delete(itemId);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
        return getHistory(userId);
    } catch (e) {
        console.error("Failed to delete item", e);
        throw e;
    }
}

// --- Asset Methods (Saved Characters) ---

export const getAssets = async (userId: string): Promise<Asset[]> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_ASSETS, 'readonly');
            const store = transaction.objectStore(STORE_ASSETS);
            const index = store.index('userId');
            const request = index.getAll(userId);
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        return [];
    }
};

export const saveAsset = async (userId: string, asset: Asset): Promise<Asset[]> => {
    try {
        const db = await openDB();
        const assetWithUser = { ...asset, userId };
        await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(STORE_ASSETS, 'readwrite');
            const store = transaction.objectStore(STORE_ASSETS);
            const request = store.put(assetWithUser);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
        return getAssets(userId);
    } catch (e) {
        throw e;
    }
};

export const deleteAsset = async (userId: string, assetId: string): Promise<Asset[]> => {
    try {
        const db = await openDB();
        await new Promise<void>((resolve, reject) => {
             const transaction = db.transaction(STORE_ASSETS, 'readwrite');
             const store = transaction.objectStore(STORE_ASSETS);
             store.delete(assetId);
             transaction.oncomplete = () => resolve();
        });
        return getAssets(userId);
    } catch (e) {
        throw e;
    }
}

// --- Album Methods ---

export const getAlbums = async (userId: string): Promise<Album[]> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_ALBUMS, 'readonly');
            const store = transaction.objectStore(STORE_ALBUMS);
            const index = store.index('userId');
            const request = index.getAll(userId);
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        return [];
    }
};

export const createAlbum = async (userId: string, name: string): Promise<Album[]> => {
    const album: Album = {
        id: crypto.randomUUID(),
        userId,
        name,
        createdAt: Date.now()
    };
    
    try {
        const db = await openDB();
        await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(STORE_ALBUMS, 'readwrite');
            const store = transaction.objectStore(STORE_ALBUMS);
            store.put(album);
            transaction.oncomplete = () => resolve();
        });
        return getAlbums(userId);
    } catch (e) {
        throw e;
    }
};

export const deleteAlbum = async (userId: string, albumId: string): Promise<Album[]> => {
    try {
        const db = await openDB();
        await new Promise<void>((resolve, reject) => {
             const transaction = db.transaction(STORE_ALBUMS, 'readwrite');
             const store = transaction.objectStore(STORE_ALBUMS);
             store.delete(albumId);
             transaction.oncomplete = () => resolve();
        });
        // Also decouple items from this album (optional, but cleaner)
        // For simplicity we leave items with a stale albumId or could handle it here
        return getAlbums(userId);
    } catch (e) {
        throw e;
    }
};
