import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Terminal, Archive, Trash2, Download, Upload, Eye, X, ChevronDown, ChevronUp } from 'lucide-react';
import { UserAccount, SessionLog, Message, MessageRole } from '../types';
import { 
  getUserArchive, 
  deleteFromUserArchive, 
  exportSessionToJSON, 
  exportToJSON,
  formatSessionDate,
  formatDuration,
  getScoreColor,
  importFromJSON
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Archive state
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [wipeConfirmPending, setWipeConfirmPending] = useState(false);

  // Initialize
  useEffect(() => {
    setTerminalHistory(getWelcomeMessage());
    loadSessions();
  }, [user.id]);

  // Auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalHistory]);

  const loadSessions = useCallback(async () => {
    console.log('[CommandCenter] Loading sessions for user:', user.id);
    const userArchive = await getUserArchive(user.id);
    setSessions(userArchive);
  }, [user.id]);

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

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const result = await importFromJSON(content, user.id);
      if (result.success) {
        setTerminalHistory(prev => [...prev, {
          type: 'success' as const,
          text: `Successfully imported ${result.count} session(s).`,
          timestamp: Date.now()
        }]);
        loadSessions();
      } else {
        setTerminalHistory(prev => [...prev, {
          type: 'error' as const,
          text: `Import failed: ${result.error || 'Unknown error'}`,
          timestamp: Date.now()
        }]);
      }
      
      // Clear input so same file can be imported again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.onerror = () => {
      setTerminalHistory(prev => [...prev, {
        type: 'error' as const,
        text: 'Failed to read file.',
        timestamp: Date.now()
      }]);
    };
    reader.readAsText(file);
  }, [user.id, loadSessions]);

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
    <div className="h-[100dvh] bg-[#0A0B1A] flex flex-col">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImport}
        accept=".json"
        className="hidden"
      />
      {/* Header */}
      <header className="shrink-0 h-16 md:h-20 flex items-center justify-between px-6 border-b border-slate-800/50 bg-slate-900/30">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Назад</span>
        </button>
        
        <h1 className="text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400 uppercase italic">
          Учительская
        </h1>
        
        <div className="w-20" /> {/* Spacer */}
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col md:flex-row gap-4 p-4 min-h-0 overflow-hidden">
        {/* Left panel - Terminal */}
        <div className="flex-1 md:w-1/2 flex flex-col bg-black rounded-3xl border border-green-500/30 overflow-hidden shadow-[0_0_30px_rgba(34,197,94,0.1)]">
          {/* Terminal header */}
          <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-green-500/10 border-b border-green-500/30">
            <Terminal size={14} className="text-green-400" />
            <span className="text-[10px] font-black text-green-400 tracking-widest uppercase">Kernel Terminal</span>
          </div>

          {/* Terminal output */}
          <div 
            className="flex-1 overflow-y-auto p-4 font-mono text-sm custom-scroll"
            onClick={() => inputRef.current?.focus()}
          >
            {terminalHistory.map((line, i) => (
              <div key={i} className={`${getLineColor(line.type)} whitespace-pre-wrap leading-relaxed mb-1`}>
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
              className="flex-1 bg-transparent text-green-400 font-mono text-sm outline-none placeholder-green-900"
              placeholder="Введите команду..."
              autoFocus
            />
          </div>
        </div>

        {/* Right panel - Archive */}
        <div className="flex-1 md:w-1/2 flex flex-col bg-slate-900/50 rounded-3xl border border-slate-700/50 overflow-hidden">
          <div className="shrink-0 flex flex-col bg-slate-800/50 border-b border-slate-700/50">
            {/* Header row */}
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-2">
                <Archive size={16} className="text-violet-400" />
                <span className="text-[11px] font-black tracking-widest text-violet-400 uppercase">
                  Личный архив сессий
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-emerald-400 transition-colors uppercase font-bold"
                >
                  <Upload size={12} />
                  Импорт
                </button>
                
                {sessions.length > 0 && (
                  <button
                    onClick={handleExportAll}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-cyan-400 transition-colors uppercase font-bold"
                  >
                    <Download size={12} />
                    Экспорт всех
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sessions list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scroll">
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-600">
                <Archive size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-bold uppercase tracking-wider">Архив пуст</p>
                <p className="text-[10px] mt-1 opacity-50 uppercase">Завершённые сессии появятся здесь</p>
              </div>
            ) : (
              sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isExpanded={expandedSession === session.id}
                  onToggle={() => setExpandedSession(
                    expandedSession === session.id ? null : session.id
                  )}
                  onDelete={() => handleDeleteSession(session.id)}
                  onExport={() => handleExportSession(session)}
                />
              ))
            )}
          </div>
        </div>
      </main>

      {/* Wipe confirmation modal */}
      {wipeConfirmPending && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm">
          <div className="bg-slate-900 border border-red-500/50 rounded-3xl p-8 max-w-md mx-4 shadow-[0_0_100px_rgba(239,68,68,0.2)]">
            <h3 className="text-xl font-black text-red-400 mb-2 uppercase italic tracking-tighter">Подтверждение удаления</h3>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Вы уверены, что хотите полностью очистить личный архив? 
              Это действие необратимо и приведет к удалению всех ваших сессий.
            </p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={handleWipeCancel}
                className="px-6 py-3 text-xs font-black uppercase text-slate-500 hover:text-white transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleWipeConfirm}
                className="px-8 py-3 text-xs font-black uppercase bg-red-600 text-white rounded-xl hover:bg-red-500 transition-all shadow-lg shadow-red-900/20"
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
  onDelete: () => void;
  onExport: () => void;
}

const SessionCard: React.FC<SessionCardProps> = ({
  session,
  isExpanded,
  onToggle,
  onDelete,
  onExport
}) => {
  const score = session.result?.overall_score ?? 0;
  const accentuation = session.sessionSnapshot?.chaosDetails?.accentuation || 'N/A';
  
  return (
    <div className={`rounded-2xl border transition-all duration-300 ${
      isExpanded 
        ? 'border-violet-500/50 bg-gradient-to-br from-violet-500/10 to-slate-900/80 shadow-xl' 
        : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-800/60'
    }`}>
      {/* Card header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {formatSessionDate(session.timestamp)}
            </span>
            <span className="text-slate-700">•</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {formatDuration(session.duration_seconds)}
            </span>
            {session.importedFrom && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-black uppercase tracking-tighter ml-1 border border-blue-500/20">
                ИМПОРТ
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-black text-white uppercase italic tracking-tight truncate">
              {session.student_name}
            </span>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-bold uppercase tracking-widest border border-white/5">
              {accentuation}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className={`text-xl font-black italic leading-none ${getScoreColor(score)}`}>
              {score}
            </div>
            <div className="text-[8px] font-black text-slate-600 uppercase mt-1">Рейтинг</div>
          </div>
          <div className={`p-2 rounded-xl transition-colors ${isExpanded ? 'bg-violet-500/20 text-violet-400' : 'text-slate-600'}`}>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-slate-800/50 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Summary */}
          {session.result?.summary && (
            <div className="px-4 py-3 bg-black/20">
              <p className="text-[11px] text-slate-400 italic leading-relaxed border-l-2 border-violet-500/30 pl-3">
                {session.result.summary}
              </p>
            </div>
          )}

          {/* Transcript */}
          <div className="max-h-64 overflow-y-auto custom-scroll p-1">
            {session.messages
              .filter(m => m.role === MessageRole.USER || m.role === MessageRole.MODEL)
              .map((msg, i) => (
                <div 
                  key={i}
                  className={`px-4 py-2.5 text-[11px] mb-1 rounded-xl ${
                    msg.role === MessageRole.USER 
                      ? 'bg-cyan-500/5 text-cyan-200/90' 
                      : 'bg-slate-800/30 text-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-[8px] font-black uppercase tracking-widest ${msg.role === MessageRole.USER ? 'text-cyan-500' : 'text-slate-500'}`}>
                      {msg.role === MessageRole.USER ? 'Педагог' : 'Ученик'}
                    </span>
                  </div>
                  <div className="leading-relaxed">{msg.content}</div>
                </div>
              ))
            }
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 p-3 border-t border-slate-800/50 bg-black/20">
            <button
              onClick={(e) => { e.stopPropagation(); onExport(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase text-slate-500 hover:text-cyan-400 transition-colors"
            >
              <Download size={12} />
              Экспорт JSON
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase text-slate-500 hover:text-red-400 transition-colors"
            >
              <Trash2 size={12} />
              Удалить
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommandCenter;

