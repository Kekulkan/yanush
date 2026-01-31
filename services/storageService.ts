
import { ActiveSession, Message } from '../types';

const BACKUP_KEY = 'pedagogical_trainer_backup';

interface SessionBackup {
  session: ActiveSession;
  messages: Message[];
  timestamp: number;
}

// --- AUTOSAVE / BACKUP FUNCTIONS ---

export const saveSessionBackup = (session: ActiveSession, messages: Message[]): void => {
  try {
    const backup: SessionBackup = {
      session,
      messages,
      timestamp: Date.now()
    };
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
  } catch (e) {
    console.error("Autosave failed", e);
  }
};

export const getSessionBackup = (): SessionBackup | null => {
  try {
    const data = localStorage.getItem(BACKUP_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

export const clearSessionBackup = (): void => {
  localStorage.removeItem(BACKUP_KEY);
};

