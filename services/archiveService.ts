/**
 * Сервис архивирования сессий
 * Двойное сохранение: личный архив юзера + глобальный архив (серверный)
 */

import { SessionLog } from '../types';

const USER_ARCHIVE_PREFIX = 'user_archive_';
const GLOBAL_ARCHIVE_KEY = 'global_sessions_archive';

// URL для серверного API логов
const getLogsApiUrl = () => {
  const env: any = (import.meta as any).env || {};
  const proxyUrl = env.VITE_REMOTE_PROXY_URL;
  if (proxyUrl) {
    // Извлекаем базовый URL из proxy URL
    const base = proxyUrl.replace('/api/proxy', '');
    return `${base}/api/logs`;
  }
  return '/api/logs';
};

// ============ ОТПРАВКА НА СЕРВЕР ============

/**
 * Отправить лог на сервер для глобального архива
 */
export async function sendLogToServer(sessionLog: SessionLog): Promise<boolean> {
  try {
    console.log('[sendLogToServer] Sending log with ID:', sessionLog.id);
    console.log('[sendLogToServer] URL:', getLogsApiUrl());
    
    const bodyStr = JSON.stringify(sessionLog);
    console.log('[sendLogToServer] Body size:', bodyStr.length, 'chars');
    
    const response = await fetch(getLogsApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr
    });
    
    const responseText = await response.text();
    console.log('[sendLogToServer] Response status:', response.status);
    console.log('[sendLogToServer] Response body:', responseText);
    
    if (!response.ok) {
      console.warn('Failed to send log to server:', response.status, responseText);
      return false;
    }
    
    try {
      const data = JSON.parse(responseText);
      console.log('Log sent to server:', data);
    } catch {
      console.log('Log sent (non-JSON response)');
    }
    return true;
  } catch (e) {
    console.error('Error sending log to server:', e);
    return false;
  }
}

/**
 * Получить глобальные логи с сервера (только для админа)
 */
export async function fetchServerLogs(adminKey: string): Promise<SessionLog[]> {
  try {
    const response = await fetch(`${getLogsApiUrl()}?adminKey=${encodeURIComponent(adminKey)}`, {
      method: 'GET',
      headers: { 'X-Admin-Key': adminKey }
    });
    
    if (!response.ok) {
      console.warn('Failed to fetch server logs:', response.status);
      return [];
    }
    
    const data = await response.json();
    
    // Защитная проверка — убеждаемся что logs это массив
    if (data && Array.isArray(data.logs)) {
      return data.logs;
    }
    
    console.warn('Server returned invalid logs format:', data);
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
    const response = await fetch(`${getLogsApiUrl()}?id=${encodeURIComponent(logId)}&adminKey=${encodeURIComponent(adminKey)}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Key': adminKey }
    });
    
    return response.ok;
  } catch (e) {
    console.error('Error deleting server log:', e);
    return false;
  }
}

/**
 * Очистить все логи на сервере (только для админа)
 */
export async function wipeServerLogs(adminKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${getLogsApiUrl()}?id=all&adminKey=${encodeURIComponent(adminKey)}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Key': adminKey }
    });
    
    return response.ok;
  } catch (e) {
    console.error('Error wiping server logs:', e);
    return false;
  }
}

// ============ ЛИЧНЫЙ АРХИВ ЮЗЕРА ============

/**
 * Сохранить сессию в личный архив пользователя
 */
export function saveToUserArchive(userId: string, sessionLog: SessionLog): void {
  try {
    const key = `${USER_ARCHIVE_PREFIX}${userId}`;
    const archive = getUserArchive(userId);
    
    // Добавляем userId если его нет
    const logWithUser = { ...sessionLog, userId };
    
    // Проверяем, есть ли уже запись с таким ID (обновление)
    const existingIndex = archive.findIndex(log => log.id === sessionLog.id);
    if (existingIndex !== -1) {
      // Обновляем существующую запись
      archive[existingIndex] = logWithUser;
    } else {
      // Добавляем в начало (новые сверху)
      archive.unshift(logWithUser);
    }
    
    localStorage.setItem(key, JSON.stringify(archive));
  } catch (e) {
    console.error('Failed to save to user archive:', e);
  }
}

/**
 * Получить личный архив пользователя
 */
export function getUserArchive(userId: string): SessionLog[] {
  try {
    const key = `${USER_ARCHIVE_PREFIX}${userId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to get user archive:', e);
    return [];
  }
}

/**
 * Удалить сессию из личного архива
 */
export function deleteFromUserArchive(userId: string, sessionId: string): boolean {
  try {
    const key = `${USER_ARCHIVE_PREFIX}${userId}`;
    const archive = getUserArchive(userId);
    const filtered = archive.filter(s => s.id !== sessionId);
    
    if (filtered.length === archive.length) return false;
    
    localStorage.setItem(key, JSON.stringify(filtered));
    return true;
  } catch (e) {
    console.error('Failed to delete from user archive:', e);
    return false;
  }
}

/**
 * Полная очистка личного архива пользователя
 */
export function wipeUserArchive(userId: string): void {
  try {
    const key = `${USER_ARCHIVE_PREFIX}${userId}`;
    localStorage.removeItem(key);
  } catch (e) {
    console.error('Failed to wipe user archive:', e);
  }
}

// ============ ГЛОБАЛЬНЫЙ АРХИВ ============

/**
 * Сохранить сессию в глобальный архив
 */
export function saveToGlobalArchive(sessionLog: SessionLog): void {
  try {
    const archive = getGlobalArchive();
    
    // Проверяем, есть ли уже запись с таким ID (обновление)
    const existingIndex = archive.findIndex(log => log.id === sessionLog.id);
    if (existingIndex !== -1) {
      // Обновляем существующую запись
      archive[existingIndex] = sessionLog;
    } else {
      // Добавляем в начало
      archive.unshift(sessionLog);
    }
    
    localStorage.setItem(GLOBAL_ARCHIVE_KEY, JSON.stringify(archive));
  } catch (e) {
    console.error('Failed to save to global archive:', e);
  }
}

/**
 * Получить глобальный архив (все сессии всех юзеров)
 */
export function getGlobalArchive(): SessionLog[] {
  try {
    const data = localStorage.getItem(GLOBAL_ARCHIVE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to get global archive:', e);
    return [];
  }
}

/**
 * Очистить глобальный архив (только для админа)
 */
export function wipeGlobalArchive(): void {
  try {
    localStorage.removeItem(GLOBAL_ARCHIVE_KEY);
  } catch (e) {
    console.error('Failed to wipe global archive:', e);
  }
}

// ============ ЭКСПОРТ ============

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

/**
 * Получить статистику личного архива
 */
export function getUserArchiveStats(userId: string): ArchiveStats {
  return getArchiveStats(getUserArchive(userId));
}

/**
 * Получить статистику глобального архива
 */
export function getGlobalArchiveStats(): ArchiveStats {
  return getArchiveStats(getGlobalArchive());
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
