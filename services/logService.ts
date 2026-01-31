
import { SessionLog } from '../types';

const HISTORY_KEY = 'pedagogical_trainer_history';
const MAX_LOGS = 50; 

export const saveSessionLog = (log: SessionLog): void => {
  let history: SessionLog[] = [];

  // 1. Load existing history safely
  try {
    const existingData = localStorage.getItem(HISTORY_KEY);
    if (existingData) {
      history = JSON.parse(existingData);
      if (!Array.isArray(history)) {
          console.warn("Log history corrupted, resetting array.");
          history = [];
      }
    }
  } catch (error) {
    console.error("History read error", error);
    history = [];
  }

  // 2. Add new log to the beginning
  history.unshift(log);

  // 3. Initial Count Trim (Soft limit)
  if (history.length > MAX_LOGS) {
      history = history.slice(0, MAX_LOGS);
  }

  // Helper to save data
  const trySave = (data: SessionLog[]) => {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(data));
  };

  // 4. Save with Progressive Optimization (Quota Protection)
  try {
    trySave(history);
  } catch (error) {
    console.warn("Storage Quota Exceeded. Starting Smart Optimization...");

    // Strategy 1: Strip 'sessionSnapshot' (Heavy data) from logs older than top 10.
    // User keeps full resume capability for last 10 sessions, others become read-only records.
    let optimizedHistory = history.map((item, index) => {
        if (index < 10) return item; 
        const { sessionSnapshot, ...rest } = item; // Destructure to remove snapshot
        return rest as SessionLog;
    });

    try {
        trySave(optimizedHistory);
        console.log("Optimized storage: Stripped old snapshots.");
    } catch (e2) {
        // Strategy 2: Strip 'sessionSnapshot' from ALL logs except the very latest one.
        optimizedHistory = history.map((item, index) => {
            if (index === 0) return item;
            const { sessionSnapshot, ...rest } = item;
            return rest as SessionLog;
        });

        try {
             trySave(optimizedHistory);
             console.log("Optimized storage: Kept only latest snapshot.");
        } catch (e3) {
            // Strategy 3: Hard Trim of count.
            // If we still can't save, we must reduce the number of items.
            // We strip snapshots AND reduce count to 20.
            const hardTrimmed = optimizedHistory.slice(0, 20);
             try {
                 trySave(hardTrimmed);
                 console.log("Optimized storage: Hard trim to 20 items.");
             } catch (e4) {
                 // Strategy 4: Nuclear option - Keep only last 5 items (lightweight).
                 trySave(hardTrimmed.slice(0, 5));
                 console.warn("Critical Storage Full. History reduced to 5 items.");
             }
        }
    }
  }
};

export const getSessionHistory = (): SessionLog[] => {
  try {
    const existingData = localStorage.getItem(HISTORY_KEY);
    if (!existingData) return [];
    
    const parsed = JSON.parse(existingData);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load session history", error);
    return [];
  }
};

export const deleteLog = (id: string): void => {
    try {
        const history = getSessionHistory();
        const newHistory = history.filter(log => log.id !== id);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch (e) {
        console.error("Failed to delete log", e);
    }
};

export const clearAllHistory = (): void => {
  localStorage.removeItem(HISTORY_KEY);
};

