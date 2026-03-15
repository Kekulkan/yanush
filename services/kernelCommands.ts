/**
 * Обработчики команд терминала Kernel
 * Интерактивная консоль командного центра
 */

import { UserAccount } from '../types';
import { getUserArchiveStats, wipeUserArchive, getGlobalArchiveStats, getGlobalArchive, saveToUserArchive, getUserArchive, formatDuration } from './archiveService';
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
  action?: 'logout';
}

/**
 * Парсинг и выполнение команды
 */
export async function executeCommand(
  input: string,
  user: UserAccount | null,
  onWipeConfirm?: () => void
): Promise<CommandResult> {
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
      return { output: [commandLog, ...await cmdLogs(user)] };
    
    case 'WIPE':
      return { output: [commandLog, ...await cmdWipe(user, onWipeConfirm)] };
    
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
      return { output: [commandLog, ...await cmdImport(user, args)] };

    case 'QUIT':
    case 'EXIT':
    case 'LOGOUT':
      return {
        output: [commandLog, { type: 'success', text: 'Выход из системы...', timestamp: Date.now() }],
        action: 'logout'
      };
    
    default:
      return {
        output: [
          commandLog,
          {
            type: 'error',
            text: `Неизвестная команда: ${command}. Введите HELP для списка команд.`,
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
    { type: 'system', text: `${KERNEL_NAME} v${KERNEL_VERSION} — СПИСОК КОМАНД`, timestamp: Date.now() },
    { type: 'system', text: '═══════════════════════════════════════', timestamp: Date.now() },
    { type: 'info', text: 'HELP        — Показать это сообщение', timestamp: Date.now() },
    { type: 'info', text: 'STATUS      — Статус ядра и нагрузка ЦП', timestamp: Date.now() },
    { type: 'info', text: 'LOGS        — Статистика архива сессий', timestamp: Date.now() },
    { type: 'info', text: 'IMPORT [id] — Импорт сессии из глобального архива', timestamp: Date.now() },
    { type: 'info', text: 'WIPE        — Очистить локальный архив сессий', timestamp: Date.now() },
    { type: 'info', text: 'WHOAMI      — Профиль текущего оператора', timestamp: Date.now() },
    { type: 'info', text: 'CLEAR       — Очистить экран терминала', timestamp: Date.now() },
    { type: 'info', text: 'SAY [msg]   — Системное сообщение (эхо)', timestamp: Date.now() },
    { type: 'info', text: 'UPTIME      — Время работы системы', timestamp: Date.now() },
    { type: 'info', text: 'VERSION     — Версия ядра', timestamp: Date.now() },
    { type: 'info', text: 'QUIT/EXIT   — Выход из системы', timestamp: Date.now() },
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
    { type: 'info', text: `│  Время:   ${uptime}`, timestamp: Date.now() },
    { type: 'info', text: `│  ЦП:      ${cpuBar} ${cpuLoad}%`, timestamp: Date.now() },
    { type: 'info', text: `│  Память:  ${memBar} ${memUsed}%`, timestamp: Date.now() },
    { type: 'info', text: `│  Статус:  РАБОТАЕТ ШТАТНО`, timestamp: Date.now() },
    { type: 'system', text: '└─────────────────────────────────────┘', timestamp: Date.now() }
  ];
}

async function cmdLogs(user: UserAccount | null): Promise<TerminalOutput[]> {
  if (!user) {
    return [{ type: 'error', text: 'ОШИБКА: Нет авторизации', timestamp: Date.now() }];
  }

  const stats = await getUserArchiveStats(user.id);
  const isAdmin = user.role === 'ADMIN';
  
  const output: TerminalOutput[] = [
    { type: 'system', text: '┌─ ЛИЧНЫЙ АРХИВ СЕССИЙ ───────────────┐', timestamp: Date.now() },
    { type: 'info', text: `│  Всего сессий:      ${stats.totalSessions}`, timestamp: Date.now() },
    { type: 'info', text: `│  Завершено:         ${stats.completedSessions}`, timestamp: Date.now() },
    { type: 'info', text: `│  Прервано:          ${stats.interruptedSessions}`, timestamp: Date.now() },
    { type: 'info', text: `│  Средний балл:      ${stats.averageScore}%`, timestamp: Date.now() }
  ];

  if (stats.lastSessionDate) {
    const lastDate = new Date(stats.lastSessionDate);
    const ago = formatTimeAgo(stats.lastSessionDate);
    output.push({ type: 'info', text: `│  Посл. сессия:      ${ago}`, timestamp: Date.now() });
  }

  output.push({ type: 'system', text: '└─────────────────────────────────────┘', timestamp: Date.now() });

  // Для админа показываем глобальную статистику
  if (isAdmin) {
    const globalStats = await getGlobalArchiveStats();
    output.push(
      { type: 'system', text: '', timestamp: Date.now() },
      { type: 'system', text: '┌─ ГЛОБАЛЬНЫЙ АРХИВ (ADMIN) ──────────┐', timestamp: Date.now() },
      { type: 'success', text: `│  Всего сессий:      ${globalStats.totalSessions}`, timestamp: Date.now() },
      { type: 'success', text: `│  Средний балл:      ${globalStats.averageScore}%`, timestamp: Date.now() },
      { type: 'system', text: '└─────────────────────────────────────┘', timestamp: Date.now() }
    );
  }

  return output;
}

async function cmdWipe(user: UserAccount | null, onConfirm?: () => void): Promise<TerminalOutput[]> {
  if (!user) {
    return [{ type: 'error', text: 'ОШИБКА: Нет авторизации', timestamp: Date.now() }];
  }

  const stats = await getUserArchiveStats(user.id);
  
  if (stats.totalSessions === 0) {
    return [{ type: 'info', text: 'Архив уже пуст.', timestamp: Date.now() }];
  }

  // Вызываем callback для подтверждения
  if (onConfirm) {
    onConfirm();
  }

  return [
    { type: 'system', text: `Найдено ${stats.totalSessions} сессий в архиве.`, timestamp: Date.now() },
    { type: 'error', text: 'ВНИМАНИЕ: Это действие необратимо!', timestamp: Date.now() },
    { type: 'info', text: 'Подтвердите удаление во всплывающем окне.', timestamp: Date.now() }
  ];
}

function cmdWhoami(user: UserAccount | null): TerminalOutput[] {
  if (!user) {
    return [
      { type: 'error', text: 'ОШИБКА: Нет авторизации', timestamp: Date.now() },
      { type: 'info', text: 'Пожалуйста, войдите в систему.', timestamp: Date.now() }
    ];
  }

  const roleLabel = {
    'GUEST': 'Гость',
    'USER': 'Оператор',
    'PREMIUM': 'Премиум Оператор',
    'ADMIN': 'Администратор'
  }[user.role] || user.role;

  const roleColor = user.role === 'ADMIN' ? 'success' : user.role === 'PREMIUM' ? 'info' : 'system';

  return [
    { type: 'system', text: '┌─ ПРОФИЛЬ ОПЕРАТОРА ─────────────────┐', timestamp: Date.now() },
    { type: 'info', text: `│  ID:        ${user.id.slice(0, 8)}...`, timestamp: Date.now() },
    { type: 'info', text: `│  Почта:     ${user.email}`, timestamp: Date.now() },
    { type: roleColor as TerminalOutput['type'], text: `│  Роль:      ${roleLabel}`, timestamp: Date.now() },
    { type: 'info', text: `│  Доступ:    РАЗРЕШЕН`, timestamp: Date.now() },
    { type: 'system', text: '└─────────────────────────────────────┘', timestamp: Date.now() }
  ];
}

function cmdSay(message: string): TerminalOutput[] {
  if (!message.trim()) {
    return [{ type: 'error', text: 'Использование: SAY [сообщение]', timestamp: Date.now() }];
  }

  return [
    { type: 'system', text: `[СИСТЕМА] ${message}`, timestamp: Date.now() }
  ];
}

function cmdUptime(): TerminalOutput[] {
  const uptime = formatUptime(Date.now() - startTime);
  return [
    { type: 'info', text: `Время работы системы: ${uptime}`, timestamp: Date.now() }
  ];
}

function cmdVersion(): TerminalOutput[] {
  return [
    { type: 'system', text: `${KERNEL_NAME} v${KERNEL_VERSION}`, timestamp: Date.now() },
    { type: 'info', text: 'Сборка: 2026.01.27-stable', timestamp: Date.now() },
    { type: 'info', text: 'Платформа: Web/TypeScript', timestamp: Date.now() }
  ];
}

async function cmdImport(user: UserAccount | null, args: string[]): Promise<TerminalOutput[]> {
  if (!user) {
    return [{ type: 'error', text: 'ОШИБКА: Нет авторизации', timestamp: Date.now() }];
  }

  if (args.length === 0) {
    return [
      { type: 'error', text: 'Использование: IMPORT [ID_сессии]', timestamp: Date.now() },
      { type: 'info', text: 'Пример: IMPORT abc123...', timestamp: Date.now() },
      { type: 'info', text: 'Используйте глобальный архив в интерфейсе для поиска ID.', timestamp: Date.now() }
    ];
  }

  const sessionId = args[0];
  const globalArchive = await getGlobalArchive();
  const targetSession = globalArchive.find(s => s.id === sessionId || s.id.startsWith(sessionId));

  if (!targetSession) {
    return [
      { type: 'error', text: `Сессия не найдена: ${sessionId}`, timestamp: Date.now() },
      { type: 'info', text: 'Проверьте глобальный архив на наличие доступных сессий.', timestamp: Date.now() }
    ];
  }

  // Проверяем, не импортирована ли уже эта сессия
  const userArchive = await getUserArchive(user.id);
  const alreadyImported = userArchive.some(s => 
    s.id === targetSession.id || 
    (s.timestamp === targetSession.timestamp && s.student_name === targetSession.student_name)
  );

  if (alreadyImported) {
    return [
      { type: 'error', text: 'Сессия уже есть в вашем архиве.', timestamp: Date.now() },
      { type: 'info', text: `Ученик: ${targetSession.student_name}`, timestamp: Date.now() }
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

  await saveToUserArchive(user.id, importedSession);

  return [
    { type: 'success', text: '✓ Сессия успешно импортирована!', timestamp: Date.now() },
    { type: 'info', text: `Ученик:        ${targetSession.student_name}`, timestamp: Date.now() },
    { type: 'info', text: `Оценка:        ${targetSession.result?.overall_score || 0}%`, timestamp: Date.now() },
    { type: 'info', text: `Длительность:  ${formatDuration(targetSession.duration_seconds || 0)}`, timestamp: Date.now() },
    { type: 'system', text: 'Проверьте свой личный архив для просмотра.', timestamp: Date.now() }
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

  if (days > 0) return `${days} дн. назад`;
  if (hours > 0) return `${hours} ч. назад`;
  if (minutes > 0) return `${minutes} мин. назад`;
  return 'только что';
}

/**
 * Получить приветственное сообщение при запуске терминала
 */
export function getWelcomeMessage(): TerminalOutput[] {
  startTime = Date.now(); // Reset uptime on new session
  
  return [
    { type: 'system', text: '═══════════════════════════════════════', timestamp: Date.now() },
    { type: 'system', text: `  ${KERNEL_NAME} v${KERNEL_VERSION}`, timestamp: Date.now() },
    { type: 'system', text: '  Ядро педагогической симуляции', timestamp: Date.now() },
    { type: 'system', text: '═══════════════════════════════════════', timestamp: Date.now() },
    { type: 'info', text: '', timestamp: Date.now() },
    { type: 'info', text: '  Введите HELP для списка доступных команд.', timestamp: Date.now() },
    { type: 'info', text: '', timestamp: Date.now() }
  ];
}

/**
 * Выполнить wipe после подтверждения
 */
export function confirmWipe(userId: string): TerminalOutput[] {
  wipeUserArchive(userId);
  return [
    { type: 'success', text: '✓ Архив успешно очищен.', timestamp: Date.now() },
    { type: 'info', text: 'Все записи сессий были удалены.', timestamp: Date.now() }
  ];
}

