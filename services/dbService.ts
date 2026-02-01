import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { SessionLog } from '../types';

interface YanushDB extends DBSchema {
  logs: {
    key: string;
    value: SessionLog;
    indexes: { 'by-user': string; 'by-timestamp': number };
  };
  keyvalue: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'yanush-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<YanushDB>>;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<YanushDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Store for session logs
        if (!db.objectStoreNames.contains('logs')) {
          const logStore = db.createObjectStore('logs', { keyPath: 'id' });
          logStore.createIndex('by-user', 'userId');
          logStore.createIndex('by-timestamp', 'timestamp');
        }
        
        // Store for general key-value data (replacement for localStorage for large items)
        if (!db.objectStoreNames.contains('keyvalue')) {
          db.createObjectStore('keyvalue');
        }
      },
    });
  }
  return dbPromise;
};

export const dbService = {
  // === LOGS ===
  
  async saveLog(log: SessionLog): Promise<void> {
    const db = await initDB();
    await db.put('logs', log);
  },

  async getLog(id: string): Promise<SessionLog | undefined> {
    const db = await initDB();
    return await db.get('logs', id);
  },

  async getUserLogs(userId: string): Promise<SessionLog[]> {
    const db = await initDB();
    const index = db.transaction('logs').store.index('by-user');
    let logs = await index.getAll(userId);
    // Sort by timestamp desc
    return logs.sort((a, b) => b.timestamp - a.timestamp);
  },

  async getAllLogs(): Promise<SessionLog[]> {
    const db = await initDB();
    let logs = await db.getAll('logs');
    return logs.sort((a, b) => b.timestamp - a.timestamp);
  },

  async deleteLog(id: string): Promise<void> {
    const db = await initDB();
    await db.delete('logs', id);
  },

  async clearUserLogs(userId: string): Promise<void> {
    const db = await initDB();
    const tx = db.transaction('logs', 'readwrite');
    const index = tx.store.index('by-user');
    let cursor = await index.openCursor(userId);

    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  },
  
  async clearAllLogs(): Promise<void> {
    const db = await initDB();
    await db.clear('logs');
  },

  // === KEY-VALUE ===

  async set(key: string, value: any): Promise<void> {
    const db = await initDB();
    await db.put('keyvalue', value, key);
  },

  async get<T>(key: string): Promise<T | undefined> {
    const db = await initDB();
    return await db.get('keyvalue', key);
  },

  async remove(key: string): Promise<void> {
    const db = await initDB();
    await db.delete('keyvalue', key);
  }
};
