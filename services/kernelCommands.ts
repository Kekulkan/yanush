/**
 * Обработчики команд терминала Kernel
 * Интерактивная консоль командного центра
 */

import { UserAccount } from '../types';
import { getUserArchiveStats, wipeUserArchive, getGlobalArchiveStats, getGlobalArchive, saveToUserArchive, getUserArchive } from './archiveService';
import { authService } from './authService';

// Версия ядра
const KERNEL_VERSION = '1.0.0';
const KERNEL_NAME = 'JANUS KERNEL';

// Время старта для расчёта uptime
let startTime = Date.now();

export interface TerminalOutput {
  type: 'system' | 'error' | 'success' | 'info' | 'command';
  text: string;
  timestamp: number;
}

export interface CommandResult {
  output: TerminalOutput[];
  clearScreen?: boolean;
}

/**
 * Парсинг и выполнение команды
 */
export function executeCommand(
  input: string,
  user: UserAccount | null,
  onWipeConfirm?: () => void
): CommandResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { output: [] };
  }

  // Разбиваем на команду и аргументы
  const parts = trimmed.split(/\s+/);
  const command = parts[0].toUpperCase();
  const args = parts.slice(1);

  // Логируем введённую команду
  const commandLog: TerminalOutput = {
    type: 'command',
    text: `# ${trimmed}`,
    timestamp: Date.now()
  };

  switch (command) {
    case 'HELP':
      return { output: [commandLog, ...cmdHelp()] };
    
    case 'STATUS':
      return { output: [commandLog, ...cmdStatus()] };
    
    case 'LOGS':
      return { output: [commandLog, ...cmdLogs(user)] };
    
    case 'WIPE':
      return { output: [commandLog, ...cmdWipe(user, onWipeConfirm)] };
    
    case 'WHOAMI':
      return { output: [commandLog, ...cmdWhoami(user)] };
    
    case 'CLEAR':
      return { output: [commandLog], clearScreen: true };
    
    case 'SAY':
      return { output: [commandLog, ...cmdSay(args.join(' '))] };
    
    case 'UPTIME':
      return { output: [commandLog, ...cmdUptime()] };
    
    case 'VERSION':
      return { output: [commandLog, ...cmdVersion()] };
    
    case 'IMPORT':
      return { output: [commandLog, ...cmdImport(user, args)] };
    
    default:
      return {
        output: [
          commandLog,
          {
            type: 'error',
            text: `Unknown command: ${command}. Type HELP for available commands.`,
            timestamp: Date.now()
          }
        ]
      };
  }
}

// ============ КОМАНДЫ ============

function cmdHelp(): TerminalOutput[] {
  return [
    { type: 'system', text: '═══════════════════════════════════════', timestamp: Date.now() },
    { type: 'system', text: `${KERNEL_NAME} v${KERNEL_VERSION} — COMMAND LIST`, timestamp: Date.now() },
    { type: 'system', text: '═══════════════════════════════════════', timestamp: Date.now() },
    { type: 'info', text: 'HELP        — Display this help message', timestamp: Date.now() },
    { type: 'info', text: 'STATUS      — Show kernel status and CPU load', timestamp: Date.now() },
    { type: 'info', text: 'LOGS        — Session archive statistics', timestamp: Date.now() },
    { type: 'info', text: 'IMPORT [id] — Import session from global archive', timestamp: Date.now() },
    { type: 'info', text: 'WIPE        — Clear local session archive', timestamp: Date.now() },
    { type: 'info', text: 'WHOAMI      — Current operator profile', timestamp: Date.now() },
    { type: 'info', text: 'CLEAR       — Clear terminal screen', timestamp: Date.now() },
    { type: 'info', text: 'SAY [msg]   — Echo message from system', timestamp: Date.now() },
    { type: 'info', text: 'UPTIME      — Show system uptime', timestamp: Date.now() },
    { type: 'info', text: 'VERSION     — Show kernel version', timestamp: Date.now() },
    { type: 'system', text: '═══════════════════════════════════════', timestamp: Date.now() }
  ];
}

function cmdStatus(): TerminalOutput[] {
  const uptime = formatUptime(Date.now() - startTime);
  const cpuLoad = Math.floor(Math.random() * 40) + 30; // 30-70% fake load
  const cpuBar = generateProgressBar(cpuLoad);
  const memUsed = Math.floor(Math.random() * 30) + 40; // 40-70%
  const memBar = generateProgressBar(memUsed);

  return [
    { type: 'system', text: '┌─────────────────────────────────────┐', timestamp: Date.now() },
    { type: 'system', text: `│  ${KERNEL_NAME} v${KERNEL_VERSION}`, timestamp: Date.now() },
    { type: 'system', text: '├─────────────────────────────────────┤', timestamp: Date.now() },
    { type: 'info', text: `│  Uptime:  ${uptime}`, timestamp: Date.now() },
    { type: 'info', text: `│  CPU:     ${cpuBar} ${cpuLoad}%`, timestamp: Date.now() },
    { type: 'info', text: `│  Memory:  ${memBar} ${memUsed}%`, timestamp: Date.now() },
    { type: 'info', text: `│  Status:  OPERATIONAL`, timestamp: Date.now() },
    { type: 'system', text: '└─────────────────────────────────────┘', timestamp: Date.now() }
  ];
}

function cmdLogs(user: UserAccount | null): TerminalOutput[] {
  if (!user) {
    return [{ type: 'error', text: 'ERROR: Not authenticated', timestamp: Date.now() }];
  }

  const stats = getUserArchiveStats(user.id);
  const isAdmin = user.role === 'ADMIN';
  
  const output: TerminalOutput[] = [
    { type: 'system', text: '┌─ SESSION ARCHIVE ───────────────────┐', timestamp: Date.now() },
    { type: 'info', text: `│  Total sessions:    ${stats.totalSessions}`, timestamp: Date.now() },
    { type: 'info', text: `│  Completed:         ${stats.completedSessions}`, timestamp: Date.now() },
    { type: 'info', text: `│  Interrupted:       ${stats.interruptedSessions}`, timestamp: Date.now() },
    { type: 'info', text: `│  Average score:     ${stats.averageScore}%`, timestamp: Date.now() }
  ];

  if (stats.lastSessionDate) {
    const lastDate = new Date(stats.lastSessionDate);
    const ago = formatTimeAgo(stats.lastSessionDate);
    output.push({ type: 'info', text: `│  Last session:      ${ago}`, timestamp: Date.now() });
  }

  output.push({ type: 'system', text: '└─────────────────────────────────────┘', timestamp: Date.now() });

  // Для админа показываем глобальную статистику
  if (isAdmin) {
    const globalStats = getGlobalArchiveStats();
    output.push(
      { type: 'system', text: '', timestamp: Date.now() },
      { type: 'system', text: '┌─ GLOBAL ARCHIVE (ADMIN) ────────────┐', timestamp: Date.now() },
      { type: 'success', text: `│  Total sessions:    ${globalStats.totalSessions}`, timestamp: Date.now() },
      { type: 'success', text: `│  Average score:     ${globalStats.averageScore}%`, timestamp: Date.now() },
      { type: 'system', text: '└─────────────────────────────────────┘', timestamp: Date.now() }
    );
  }

  return output;
}

function cmdWipe(user: UserAccount | null, onConfirm?: () => void): TerminalOutput[] {
  if (!user) {
    return [{ type: 'error', text: 'ERROR: Not authenticated', timestamp: Date.now() }];
  }

  const stats = getUserArchiveStats(user.id);
  
  if (stats.totalSessions === 0) {
    return [{ type: 'info', text: 'Archive is already empty.', timestamp: Date.now() }];
  }

  // Вызываем callback для подтверждения
  if (onConfirm) {
    onConfirm();
  }

  return [
    { type: 'system', text: `Found ${stats.totalSessions} session(s) in archive.`, timestamp: Date.now() },
    { type: 'error', text: 'WARNING: This action cannot be undone!', timestamp: Date.now() },
    { type: 'info', text: 'Confirm deletion in the popup dialog.', timestamp: Date.now() }
  ];
}

function cmdWhoami(user: UserAccount | null): TerminalOutput[] {
  if (!user) {
    return [
      { type: 'error', text: 'ERROR: Not authenticated', timestamp: Date.now() },
      { type: 'info', text: 'Please log in to access the system.', timestamp: Date.now() }
    ];
  }

  const roleLabel = {
    'GUEST': 'Guest',
    'USER': 'Operator',
    'PREMIUM': 'Premium Operator',
    'ADMIN': 'Administrator'
  }[user.role] || user.role;

  const roleColor = user.role === 'ADMIN' ? 'success' : user.role === 'PREMIUM' ? 'info' : 'system';

  return [
    { type: 'system', text: '┌─ OPERATOR PROFILE ──────────────────┐', timestamp: Date.now() },
    { type: 'info', text: `│  ID:        ${user.id.slice(0, 8)}...`, timestamp: Date.now() },
    { type: 'info', text: `│  Email:     ${user.email}`, timestamp: Date.now() },
    { type: roleColor as TerminalOutput['type'], text: `│  Role:      ${roleLabel}`, timestamp: Date.now() },
    { type: 'info', text: `│  Access:    GRANTED`, timestamp: Date.now() },
    { type: 'system', text: '└─────────────────────────────────────┘', timestamp: Date.now() }
  ];
}

function cmdSay(message: string): TerminalOutput[] {
  if (!message.trim()) {
    return [{ type: 'error', text: 'Usage: SAY [message]', timestamp: Date.now() }];
  }

  return [
    { type: 'system', text: `[SYSTEM] ${message}`, timestamp: Date.now() }
  ];
}

function cmdUptime(): TerminalOutput[] {
  const uptime = formatUptime(Date.now() - startTime);
  return [
    { type: 'info', text: `System uptime: ${uptime}`, timestamp: Date.now() }
  ];
}

function cmdVersion(): TerminalOutput[] {
  return [
    { type: 'system', text: `${KERNEL_NAME} v${KERNEL_VERSION}`, timestamp: Date.now() },
    { type: 'info', text: 'Build: 2026.01.27-stable', timestamp: Date.now() },
    { type: 'info', text: 'Platform: Web/TypeScript', timestamp: Date.now() }
  ];
}

function cmdImport(user: UserAccount | null, args: string[]): TerminalOutput[] {
  if (!user) {
    return [{ type: 'error', text: 'ERROR: Not authenticated', timestamp: Date.now() }];
  }

  if (args.length === 0) {
    return [
      { type: 'error', text: 'Usage: IMPORT [session_id]', timestamp: Date.now() },
      { type: 'info', text: 'Example: IMPORT abc123...', timestamp: Date.now() },
      { type: 'info', text: 'Use global archive in GUI to find session IDs.', timestamp: Date.now() }
    ];
  }

  const sessionId = args[0];
  const globalArchive = getGlobalArchive();
  const targetSession = globalArchive.find(s => s.id === sessionId || s.id.startsWith(sessionId));

  if (!targetSession) {
    return [
      { type: 'error', text: `Session not found: ${sessionId}`, timestamp: Date.now() },
      { type: 'info', text: 'Check the global archive for available sessions.', timestamp: Date.now() }
    ];
  }

  // Проверяем, не импортирована ли уже эта сессия
  const userArchive = getUserArchive(user.id);
  const alreadyImported = userArchive.some(s => 
    s.id === targetSession.id || 
    (s.timestamp === targetSession.timestamp && s.student_name === targetSession.student_name)
  );

  if (alreadyImported) {
    return [
      { type: 'error', text: 'Session already in your archive.', timestamp: Date.now() },
      { type: 'info', text: `Student: ${targetSession.student_name}`, timestamp: Date.now() }
    ];
  }

  // Создаём копию сессии с новым ID для личного архива
  const importedSession = {
    ...targetSession,
    id: crypto.randomUUID(), // Новый ID, чтобы не было конфликтов
    userId: user.id,
    userEmail: user.email,
    importedFrom: targetSession.id, // Сохраняем ссылку на оригинал
    importedAt: Date.now()
  };

  saveToUserArchive(user.id, importedSession);

  return [
    { type: 'success', text: '✓ Session imported successfully!', timestamp: Date.now() },
    { type: 'info', text: `Student:  ${targetSession.student_name}`, timestamp: Date.now() },
    { type: 'info', text: `Score:    ${targetSession.result.overall_score || 0}%`, timestamp: Date.now() },
    { type: 'info', text: `Duration: ${formatDuration(targetSession.duration_seconds || 0)}`, timestamp: Date.now() },
    { type: 'system', text: 'Check your personal archive to review.', timestamp: Date.now() }
  ];
}

// ============ УТИЛИТЫ ============

function generateProgressBar(percent: number): string {
  const filled = Math.floor(percent / 10);
  const empty = 10 - filled;
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  const h = hours.toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  
  return `${h}:${m}:${s}`;
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day(s) ago`;
  if (hours > 0) return `${hours} hour(s) ago`;
  if (minutes > 0) return `${minutes} min ago`;
  return 'just now';
}

/**
 * Получить приветственное сообщение при запуске терминала
 */
export function getWelcomeMessage(): TerminalOutput[] {
  startTime = Date.now(); // Reset uptime on new session
  
  return [
    { type: 'system', text: '═══════════════════════════════════════', timestamp: Date.now() },
    { type: 'system', text: `  ${KERNEL_NAME} v${KERNEL_VERSION}`, timestamp: Date.now() },
    { type: 'system', text: '  Pedagogical Simulation Core', timestamp: Date.now() },
    { type: 'system', text: '═══════════════════════════════════════', timestamp: Date.now() },
    { type: 'info', text: '', timestamp: Date.now() },
    { type: 'info', text: '  Type HELP for available commands.', timestamp: Date.now() },
    { type: 'info', text: '', timestamp: Date.now() }
  ];
}

/**
 * Выполнить wipe после подтверждения
 */
export function confirmWipe(userId: string): TerminalOutput[] {
  wipeUserArchive(userId);
  return [
    { type: 'success', text: '✓ Archive wiped successfully.', timestamp: Date.now() },
    { type: 'info', text: 'All session records have been deleted.', timestamp: Date.now() }
  ];
}

