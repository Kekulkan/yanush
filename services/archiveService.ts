/**
 * Сервис архивирования сессий
 * Двойное сохранение: личный архив юзера + глобальный архив (серверный)
 */

import { SessionLog, Message } from '../types';
import { supabase } from '../lib/supabase';
import { dbService } from './dbService';

const USER_ARCHIVE_PREFIX = 'user_archive_';
const GLOBAL_ARCHIVE_KEY = 'global_sessions_archive';

// ============ ОТПРАВКА НА СЕРВЕР ============

/**
 * Отправить лог на сервер (в Supabase sessions)
 */
export async function sendLogToServer(sessionLog: SessionLog): Promise<boolean> {
  try {
    console.log('[sendLogToServer] Sending log to Supabase with ID:', sessionLog.id);
    
    // Получаем текущего пользователя для привязки лога (если RLS требует)
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || (sessionLog as any).userId || 'cb8b65b1-bb52-42db-8bdc-3ad1af08ff06'; // fallback

    let status = sessionLog.status || 'completed';
    if (status === 'incomplete' || status === 'autoplay' || status === 'manual' || status === 'interrupted') {
        status = 'aborted';
    } else if (status === 'completed') {
        status = 'finished';
    }

    const row = {
        id: sessionLog.id,
        user_id: userId,
        created_at: new Date(sessionLog.timestamp).toISOString(),
        status: status,
        scenario_config: sessionLog.sessionSnapshot || {},
        chat_history: sessionLog.messages || [],
        metrics_log: sessionLog.result || null,
        feedback: (sessionLog as any).feedback || null
    };

    const { error } = await supabase
      .from('sessions')
      .upsert(row);

    if (error) {
      console.warn('Failed to send log to Supabase:', error.message);
      return false;
    }
    
    console.log('Log sent to Supabase successfully.');
    return true;
  } catch (e) {
    console.error('Error sending log to Supabase:', e);
    return false;
  }
}

/**
 * Получить глобальные логи с сервера (только для админа)
 */
export async function fetchServerLogs(adminKey?: string): Promise<SessionLog[]> {
  try {
    // Используем защищенную RPC функцию в Supabase, передаем пароль из админки
    const { data, error } = await supabase
      .rpc('get_all_sessions', { admin_password: adminKey || '4308' });
      
    if (error) {
      console.warn('Failed to fetch server logs via RPC:', error.message);
      return [];
    }
    
    // Возвращаем данные как SessionLog[]
    if (data && Array.isArray(data)) {
      // Маппинг формата БД обратно в SessionLog для UI
      return data.map(row => ({
        id: row.id,
        timestamp: new Date(row.created_at).getTime(),
        duration_seconds: row.scenario_config?.duration_seconds || 0,
        teacher: row.scenario_config?.legacy_teacher || row.scenario_config?.teacher || { name: 'Unknown', gender: 'male' },
        student_name: row.scenario_config?.student_name || row.scenario_config?.student?.name || 'Unknown',
        scenario_description: row.scenario_config?.legacy_scenario_description || row.scenario_config?.scenario_description || '',
        status: row.status,
        messages: row.chat_history || [],
        result: row.metrics_log || undefined,
        sessionSnapshot: row.scenario_config || undefined,
        userId: row.user_id
      } as SessionLog));
    }
    
    return [];
  } catch (e) {
    console.error('Error fetching server logs:', e);
    return [];
  }
}

/**
 * Удалить лог с сервера (только для админа)
 */
export async function deleteServerLog(adminKey: string, logId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', logId);
      
    if (error) {
      console.error('Error deleting server log:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error deleting server log:', e);
    return false;
  }
}

/**
 * Очистить все логи на сервере (только для админа)
 */
export async function wipeServerLogs(adminKey: string): Promise<boolean> {
  // Реализация полного удаления через Supabase может быть опасной без RPC,
  // так как RLS обычно запрещает delete без условий.
  // Оставим пока так.
  return false;
}

// ============ MIGRATION ============
export async function migrateToIDB(): Promise<void> {
  const hasMigrated = await dbService.get<boolean>('migrated_to_idb_v2');
  if (hasMigrated) return;

  console.log('Starting migration to IndexedDB (v2 - cleanup)...');

  // 1. User Archives
  // We need to find all keys starting with USER_ARCHIVE_PREFIX
  // Note: looping forwards while removing items can be tricky if using index, so we collect keys first
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(USER_ARCHIVE_PREFIX)) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const logs: SessionLog[] = JSON.parse(data);
          const userId = key.replace(USER_ARCHIVE_PREFIX, '');
          for (const log of logs) {
             await dbService.saveLog({ ...log, userId });
          }
          keysToRemove.push(key);
        }
      } catch (e) {
        console.error('Migration error for key', key, e);
      }
    }
  }

  // Remove migrated user archives
  keysToRemove.forEach(key => localStorage.removeItem(key));
  if (keysToRemove.length > 0) {
      console.log(`Cleaned up ${keysToRemove.length} user archive keys from localStorage.`);
  }

  // 2. Global Archive
  try {
    const globalData = localStorage.getItem(GLOBAL_ARCHIVE_KEY);
    if (globalData) {
      const logs: SessionLog[] = JSON.parse(globalData);
      for (const log of logs) {
         await dbService.saveLog(log);
      }
      localStorage.removeItem(GLOBAL_ARCHIVE_KEY);
      console.log('Cleaned up global archive from localStorage.');
    }
  } catch (e) {
    console.error('Migration error for global archive', e);
  }

  // 3. Legacy History (logService)
  try {
      const historyKey = 'pedagogical_trainer_history';
      const historyData = localStorage.getItem(historyKey);
      if (historyData) {
          const logs: SessionLog[] = JSON.parse(historyData);
          for (const log of logs) {
              await dbService.saveLog(log);
          }
          localStorage.removeItem(historyKey);
          console.log('Cleaned up legacy history from localStorage.');
      }
  } catch (e) {
      console.error('Migration error for legacy history', e);
  }

  await dbService.set('migrated_to_idb_v2', true);
  console.log('Migration to IndexedDB completed.');
}

// ... (existing code)

// ============ ЛИЧНЫЙ АРХИВ ЮЗЕРА ============

/**
 * Сохранить сессию в личный архив пользователя
 */
export async function saveToUserArchive(userId: string, sessionLog: SessionLog): Promise<void> {
  try {
    // Добавляем userId если его нет
    const logWithUser = { ...sessionLog, userId };
    await dbService.saveLog(logWithUser);
  } catch (e) {
    console.error('Failed to save to user archive:', e);
  }
}

/**
 * Получить личный архив пользователя
 */
export async function getUserArchive(userId: string): Promise<SessionLog[]> {
  try {
    // Пытаемся получить из Supabase (если есть интернет и мы залогинены)
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data && Array.isArray(data)) {
      const logs = data.map(row => ({
        id: row.id,
        timestamp: new Date(row.created_at).getTime(),
        duration_seconds: row.scenario_config?.duration_seconds || 0,
        teacher: row.scenario_config?.legacy_teacher || row.scenario_config?.teacher || { name: 'Unknown', gender: 'male' },
        student_name: row.scenario_config?.student_name || row.scenario_config?.student?.name || 'Unknown',
        scenario_description: row.scenario_config?.legacy_scenario_description || row.scenario_config?.scenario_description || '',
        status: row.status,
        messages: row.chat_history || [],
        result: row.metrics_log || undefined,
        sessionSnapshot: row.scenario_config || undefined,
        userId: row.user_id
      } as SessionLog));
      
      // Параллельно обновляем локальную базу
      for (const log of logs) {
        await dbService.saveLog(log);
      }
      return logs;
    }
  } catch (e) {
    console.warn('Supabase fetch failed for user archive, falling back to local DB', e);
  }

  // Fallback на локальную базу (IndexedDB)
  try {
    return await dbService.getUserLogs(userId);
  } catch (e) {
    console.error('Failed to get user archive from local DB:', e);
    return [];
  }
}

/**
 * Удалить сессию из личного архива
 */
export async function deleteFromUserArchive(userId: string, sessionId: string): Promise<boolean> {
  try {
    await dbService.deleteLog(sessionId);
    return true;
  } catch (e) {
    console.error('Failed to delete from user archive:', e);
    return false;
  }
}

/**
 * Полная очистка личного архива пользователя
 */
export async function wipeUserArchive(userId: string): Promise<void> {
  try {
    await dbService.clearUserLogs(userId);
  } catch (e) {
    console.error('Failed to wipe user archive:', e);
  }
}

// ============ ГЛОБАЛЬНЫЙ АРХИВ ============

/**
 * Сохранить сессию в глобальный архив
 */
export async function saveToGlobalArchive(sessionLog: SessionLog): Promise<void> {
  try {
    await dbService.saveLog(sessionLog);
  } catch (e) {
    console.error('Failed to save to global archive:', e);
  }
}

/**
 * Получить весь глобальный архив локально 
 * (для админа, теперь лучше использовать fetchServerLogs напрямую,
 * но оставим для совместимости)
 */
export async function getGlobalArchive(): Promise<SessionLog[]> {
  try {
    return await fetchServerLogs(); // Вызов Supabase напрямую
  } catch (e) {
    console.error('Failed to get global archive:', e);
    return [];
  }
}

/**
 * Очистить глобальный архив (только для админа)
 */
export async function wipeGlobalArchive(): Promise<void> {
  try {
    await dbService.clearAllLogs();
  } catch (e) {
    console.error('Failed to wipe global archive:', e);
  }
}

// ... (stats functions need to accept Promise or be awaited)

/**
 * Получить статистику личного архива
 */
export async function getUserArchiveStats(userId: string): Promise<ArchiveStats> {
  const logs = await getUserArchive(userId);
  return getArchiveStats(logs);
}

/**
 * Получить статистику глобального архива
 */
export async function getGlobalArchiveStats(): Promise<ArchiveStats> {
  const logs = await getGlobalArchive();
  return getArchiveStats(logs);
}


/**
 * Экспортировать архив в JSON файл
 */
export function exportToJSON(archive: SessionLog[], filename: string = 'sessions_archive.json'): void {
  try {
    const dataStr = JSON.stringify(archive, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Failed to export archive:', e);
  }
}

/**
 * Экспортировать одну сессию
 */
export function exportSessionToJSON(session: SessionLog): void {
  const filename = `session_${session.student_name}_${new Date(session.timestamp).toISOString().split('T')[0]}.json`;
  exportToJSON([session], filename);
}

/**
 * Импортировать логи из JSON строки в архив пользователя
 */
export async function importFromJSON(jsonStr: string, userId: string): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const data = JSON.parse(jsonStr);
    const logsToImport: SessionLog[] = Array.isArray(data) ? data : [data];
    
    // Минимальная валидация: id + диалог в messages или dialogue
    const validLogs = logsToImport.filter(log => {
      if (!log || typeof log !== 'object' || !log.id) return false;
      const anyLog = log as any;
      const hasMessages = anyLog.messages && Array.isArray(anyLog.messages);
      const hasDialogue = anyLog.dialogue && Array.isArray(anyLog.dialogue);
      return hasMessages || hasDialogue;
    });

    if (validLogs.length === 0 && logsToImport.length > 0) {
      // Попробуем еще раз, вдруг там вложенный объект logs (как от сервера)
      const dataAsAny = data as any;
      if (dataAsAny.logs && Array.isArray(dataAsAny.logs)) {
        return importFromJSON(JSON.stringify(dataAsAny.logs), userId);
      }
    }

    let importedCount = 0;
    for (const log of validLogs) {
      // Нормализация: если в файле dialogue вместо messages — подставляем messages
      const raw = log as any;
      const messages = Array.isArray(raw.messages) ? raw.messages : (Array.isArray(raw.dialogue) ? raw.dialogue : []);
      const importedLog: SessionLog = {
        ...log,
        messages,
        importedFrom: log.importedFrom || 'file',
        importedAt: Date.now(),
        userId // Привязываем к текущему юзеру
      };
      await saveToUserArchive(userId, importedLog);
      importedCount++;
    }

    return { success: true, count: importedCount };
  } catch (e) {
    console.error('Failed to import JSON:', e);
    return { success: false, count: 0, error: String(e) };
  }
}

// ============ СТАТИСТИКА ============

export interface ArchiveStats {
  totalSessions: number;
  averageScore: number;
  completedSessions: number;
  interruptedSessions: number;
  accentuationStats: Record<string, number>;
  lastSessionDate: number | null;
}

/**
 * Получить статистику по архиву
 */
export function getArchiveStats(archive: SessionLog[]): ArchiveStats {
  if (archive.length === 0) {
    return {
      totalSessions: 0,
      averageScore: 0,
      completedSessions: 0,
      interruptedSessions: 0,
      accentuationStats: {},
      lastSessionDate: null
    };
  }
  
  const scores = archive
    .filter(s => s.result?.overall_score !== undefined)
    .map(s => s.result!.overall_score);
  
  const averageScore = scores.length > 0 
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;
  
  const accentuationStats: Record<string, number> = {};
  archive.forEach(s => {
    const acc = s.sessionSnapshot?.chaosDetails?.accentuation || 'unknown';
    accentuationStats[acc] = (accentuationStats[acc] || 0) + 1;
  });
  
  return {
    totalSessions: archive.length,
    averageScore,
    completedSessions: archive.filter(s => s.status === 'completed').length,
    interruptedSessions: archive.filter(s => s.status === 'interrupted' || s.status === 'manual').length,
    accentuationStats,
    lastSessionDate: archive.length > 0 ? archive[0].timestamp : null
  };
}

// ============ УТИЛИТЫ ============

/**
 * Форматирование даты для отображения
 */
export function formatSessionDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Форматирование длительности
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Получить цвет по баллу
 */
export function getScoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-400';
  if (score >= 50) return 'text-yellow-400';
  if (score >= 30) return 'text-orange-400';
  return 'text-red-400';
}

/**
 * Получить градиент по баллу
 */
export function getScoreGradient(score: number): string {
  if (score >= 70) return 'from-emerald-500/20 to-emerald-900/20';
  if (score >= 50) return 'from-yellow-500/20 to-yellow-900/20';
  if (score >= 30) return 'from-orange-500/20 to-orange-900/20';
  return 'from-red-500/20 to-red-900/20';
}

