import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Terminal, Archive, Trash2, Download, Eye, X, ChevronDown, ChevronUp, Globe, User } from 'lucide-react';
import { UserAccount, SessionLog, Message, MessageRole } from '../types';
import { 
  getUserArchive, 
  deleteFromUserArchive, 
  exportSessionToJSON, 
  exportToJSON,
  formatSessionDate,
  formatDuration,
  getScoreColor,
  getScoreGradient,
  getGlobalArchive,
  getGlobalArchiveStats
} from '../services/archiveService';
import { 
  executeCommand, 
  getWelcomeMessage, 
  confirmWipe, 
  TerminalOutput 
} from '../services/kernelCommands';

interface CommandCenterProps {
  user: UserAccount;
  onBack: () => void;
}

const CommandCenter: React.FC<CommandCenterProps> = ({ user, onBack }) => {
  // Terminal state
  const [terminalHistory, setTerminalHistory] = useState<TerminalOutput[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Archive state
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [globalSessions, setGlobalSessions] = useState<SessionLog[]>([]);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [wipeConfirmPending, setWipeConfirmPending] = useState(false);
  const [archiveTab, setArchiveTab] = useState<'personal' | 'global'>('personal');
  
  const isAdmin = user.role === 'admin';

  // Initialize
  useEffect(() => {
    setTerminalHistory(getWelcomeMessage());
    loadSessions();
  }, [user.id]);

  // Auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalHistory]);

  const loadSessions = useCallback(() => {
    setSessions(getUserArchive(user.id));
    if (isAdmin) {
      setGlobalSessions(getGlobalArchive());
    }
  }, [user.id, isAdmin]);

  // Handle command input
  const handleCommand = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      const cmd = inputValue.trim();
      
      // Add to command history
      setCommandHistory(prev => [cmd, ...prev.slice(0, 49)]);
      setHistoryIndex(-1);
      
      // Execute command
      const result = executeCommand(cmd, user, () => setWipeConfirmPending(true));
      
      if (result.clearScreen) {
        setTerminalHistory(result.output);
      } else {
        setTerminalHistory(prev => [...prev, ...result.output]);
      }
      
      setInputValue('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInputValue(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInputValue(commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputValue('');
      }
    }
  }, [inputValue, commandHistory, historyIndex, user]);

  // Wipe confirmation
  const handleWipeConfirm = useCallback(() => {
    const output = confirmWipe(user.id);
    setTerminalHistory(prev => [...prev, ...output]);
    setWipeConfirmPending(false);
    loadSessions();
  }, [user.id, loadSessions]);

  const handleWipeCancel = useCallback(() => {
    setTerminalHistory(prev => [...prev, {
      type: 'info' as const,
      text: 'Wipe cancelled.',
      timestamp: Date.now()
    }]);
    setWipeConfirmPending(false);
  }, []);

  // Session actions
  const handleDeleteSession = useCallback((sessionId: string) => {
    if (window.confirm('Удалить эту сессию из архива?')) {
      deleteFromUserArchive(user.id, sessionId);
      loadSessions();
      setTerminalHistory(prev => [...prev, {
        type: 'success' as const,
        text: `Session ${sessionId.slice(0, 8)}... deleted.`,
        timestamp: Date.now()
      }]);
    }
  }, [user.id, loadSessions]);

  const handleExportSession = useCallback((session: SessionLog) => {
    exportSessionToJSON(session);
    setTerminalHistory(prev => [...prev, {
      type: 'success' as const,
      text: `Exported session to JSON file.`,
      timestamp: Date.now()
    }]);
  }, []);

  const handleExportAll = useCallback(() => {
    if (sessions.length === 0) return;
    exportToJSON(sessions, `archive_${user.email}_${new Date().toISOString().split('T')[0]}.json`);
    setTerminalHistory(prev => [...prev, {
      type: 'success' as const,
      text: `Exported ${sessions.length} session(s) to JSON file.`,
      timestamp: Date.now()
    }]);
  }, [sessions, user.email]);

  // Get terminal line color
  const getLineColor = (type: TerminalOutput['type']): string => {
    switch (type) {
      case 'error': return 'text-red-400';
      case 'success': return 'text-emerald-400';
      case 'info': return 'text-cyan-400';
      case 'command': return 'text-yellow-400';
      default: return 'text-green-400';
    }
  };

  return (
    <div className="h-[100dvh] bg-[#0A0B1A] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-800/50 bg-slate-900/30">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Назад</span>
        </button>
        
        <h1 className="text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">
          УЧИТЕЛЬСКАЯ
        </h1>
        
        <div className="w-20" /> {/* Spacer */}
      </header>

      {/* Main content */}
      <main className="flex-1 flex gap-4 p-4 min-h-0 overflow-hidden">
        {/* Left panel - Terminal */}
        <div className="w-1/2 flex flex-col bg-black rounded-xl border border-green-500/30 overflow-hidden shadow-[0_0_30px_rgba(34,197,94,0.1)]">
          {/* Terminal header */}
          <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-green-500/10 border-b border-green-500/30">
            <Terminal size={14} className="text-green-400" />
            <span className="text-[10px] font-black text-green-400 tracking-widest">KERNEL TERMINAL</span>
          </div>

          {/* Terminal output */}
          <div 
            className="flex-1 overflow-y-auto p-4 font-mono text-sm custom-scroll"
            onClick={() => inputRef.current?.focus()}
          >
            {terminalHistory.map((line, i) => (
              <div key={i} className={`${getLineColor(line.type)} whitespace-pre-wrap leading-relaxed`}>
                {line.text}
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>

          {/* Terminal input */}
          <div className="shrink-0 flex items-center gap-2 px-4 py-3 bg-green-500/5 border-t border-green-500/30">
            <span className="text-green-400 font-mono font-bold">#</span>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleCommand}
              className="flex-1 bg-transparent text-green-400 font-mono text-sm outline-none placeholder-green-700"
              placeholder="Enter command..."
              autoFocus
            />
          </div>
        </div>

        {/* Right panel - Archive */}
        <div className="w-1/2 flex flex-col bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden">
          {/* Archive header with tabs for admin */}
          <div className="shrink-0 flex flex-col bg-slate-800/50 border-b border-slate-700/50">
            {/* Tabs for admin */}
            {isAdmin && (
              <div className="flex border-b border-slate-700/30">
                <button
                  onClick={() => setArchiveTab('personal')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-[10px] font-bold tracking-wider transition-colors ${
                    archiveTab === 'personal'
                      ? 'text-violet-400 bg-violet-500/10 border-b-2 border-violet-400'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <User size={12} />
                  МОИ СЕССИИ
                  <span className="text-slate-600">({sessions.length})</span>
                </button>
                <button
                  onClick={() => setArchiveTab('global')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-[10px] font-bold tracking-wider transition-colors ${
                    archiveTab === 'global'
                      ? 'text-amber-400 bg-amber-500/10 border-b-2 border-amber-400'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Globe size={12} />
                  ВСЕ ЮЗЕРЫ
                  <span className="text-slate-600">({globalSessions.length})</span>
                </button>
              </div>
            )}
            
            {/* Header row */}
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-2">
                <Archive size={14} className={archiveTab === 'global' ? 'text-amber-400' : 'text-violet-400'} />
                <span className={`text-[10px] font-black tracking-widest ${archiveTab === 'global' ? 'text-amber-400' : 'text-violet-400'}`}>
                  {archiveTab === 'global' ? 'ГЛОБАЛЬНЫЙ АРХИВ' : 'АРХИВ СЕССИЙ'}
                </span>
              </div>
              {(archiveTab === 'personal' ? sessions : globalSessions).length > 0 && (
                <button
                  onClick={() => {
                    const data = archiveTab === 'personal' ? sessions : globalSessions;
                    const filename = archiveTab === 'personal' 
                      ? `archive_${user.email}_${new Date().toISOString().split('T')[0]}.json`
                      : `global_archive_${new Date().toISOString().split('T')[0]}.json`;
                    exportToJSON(data, filename);
                  }}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-cyan-400 transition-colors"
                >
                  <Download size={12} />
                  Экспорт всех
                </button>
              )}
            </div>
          </div>

          {/* Sessions list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scroll">
            {(() => {
              const displaySessions = archiveTab === 'global' ? globalSessions : sessions;
              
              if (displaySessions.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <Archive size={48} className="mb-4 opacity-30" />
                    <p className="text-sm">Архив пуст</p>
                    <p className="text-xs mt-1">
                      {archiveTab === 'global' 
                        ? 'Сессии всех пользователей появятся здесь' 
                        : 'Завершённые сессии появятся здесь'}
                    </p>
                  </div>
                );
              }
              
              return displaySessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isExpanded={expandedSession === session.id}
                  onToggle={() => setExpandedSession(
                    expandedSession === session.id ? null : session.id
                  )}
                  onDelete={archiveTab === 'personal' ? () => handleDeleteSession(session.id) : undefined}
                  onExport={() => handleExportSession(session)}
                  showUserInfo={archiveTab === 'global'}
                />
              ));
            })()}
          </div>
        </div>
      </main>

      {/* Wipe confirmation modal */}
      {wipeConfirmPending && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-red-500/50 rounded-xl p-6 max-w-md mx-4 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
            <h3 className="text-lg font-bold text-red-400 mb-2">Подтверждение удаления</h3>
            <p className="text-slate-300 text-sm mb-4">
              Вы уверены, что хотите удалить все сессии из архива? 
              Это действие необратимо.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleWipeCancel}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleWipeConfirm}
                className="px-4 py-2 text-sm bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                Удалить всё
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Session card component
interface SessionCardProps {
  session: SessionLog;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  onExport: () => void;
  showUserInfo?: boolean;
}

const SessionCard: React.FC<SessionCardProps> = ({
  session,
  isExpanded,
  onToggle,
  onDelete,
  onExport,
  showUserInfo = false
}) => {
  const score = session.result?.overall_score ?? 0;
  const accentuation = session.sessionSnapshot?.chaosDetails?.accentuation || 'N/A';
  const userId = (session as any).userId || 'unknown';
  
  return (
    <div className={`rounded-xl border transition-all ${
      isExpanded 
        ? 'border-violet-500/50 bg-gradient-to-br from-violet-500/10 to-slate-900/50' 
        : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600/50'
    }`}>
      {/* Card header */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          {/* User info for global view */}
          {showUserInfo && (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono">
                {userId.slice(0, 8)}...
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-500">
              {formatSessionDate(session.timestamp)}
            </span>
            <span className="text-xs text-slate-600">•</span>
            <span className="text-xs text-slate-400">
              {formatDuration(session.duration_seconds)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate">
              {session.student_name}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400">
              {accentuation}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-lg font-bold ${getScoreColor(score)}`}>
            {score}
          </span>
          {isExpanded ? (
            <ChevronUp size={16} className="text-slate-400" />
          ) : (
            <ChevronDown size={16} className="text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-slate-700/50">
          {/* Summary */}
          {session.result?.summary && (
            <div className="px-3 py-2 bg-slate-800/30">
              <p className="text-xs text-slate-400 italic">
                {session.result.summary}
              </p>
            </div>
          )}

          {/* Transcript */}
          <div className="max-h-60 overflow-y-auto custom-scroll">
            {session.messages
              .filter(m => m.role === MessageRole.USER || m.role === MessageRole.MODEL)
              .map((msg, i) => (
                <div 
                  key={i}
                  className={`px-3 py-2 text-xs ${
                    msg.role === MessageRole.USER 
                      ? 'bg-cyan-500/5 text-cyan-300' 
                      : 'bg-slate-800/20 text-slate-300'
                  }`}
                >
                  <span className="font-bold text-[10px] uppercase tracking-wider opacity-50 mr-2">
                    {msg.role === MessageRole.USER ? 'Учитель' : 'Ученик'}:
                  </span>
                  {msg.content}
                </div>
              ))
            }
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 p-2 border-t border-slate-700/50 bg-slate-800/20">
            <button
              onClick={(e) => { e.stopPropagation(); onExport(); }}
              className="flex items-center gap-1 px-2 py-1 text-[10px] text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <Download size={12} />
              Экспорт
            </button>
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="flex items-center gap-1 px-2 py-1 text-[10px] text-slate-400 hover:text-red-400 transition-colors"
              >
                <Trash2 size={12} />
                Удалить
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommandCenter;
