import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal } from 'lucide-react';
import { UserAccount } from '../types';
import {
  executeCommand,
  getWelcomeMessage,
  confirmWipe,
  TerminalOutput
} from '../services/kernelCommands';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';

interface KernelTerminalProps {
  user: UserAccount;
  onWipeConfirm?: () => void;
}

const KernelTerminal: React.FC<KernelTerminalProps> = ({ user, onWipeConfirm }) => {
  const { signOut } = useAuth();
  
  // Terminal state
  const [terminalHistory, setTerminalHistory] = useState<TerminalOutput[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [wipeConfirmPending, setWipeConfirmPending] = useState(false);

  // Initialize
  useEffect(() => {
    setTerminalHistory(getWelcomeMessage());
  }, [user.id]);

  // Auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalHistory]);

  // Handle command input
  const handleCommand = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      const cmd = inputValue.trim();
      
      // Add to command history
      setCommandHistory(prev => [cmd, ...prev.slice(0, 49)]);
      setHistoryIndex(-1);
      
      // Execute command (async!)
      const result = await executeCommand(cmd, user, () => setWipeConfirmPending(true));
      
      if (result.clearScreen) {
        setTerminalHistory(result.output);
      } else {
        setTerminalHistory(prev => [...prev, ...result.output]);
      }

      if (result.action === 'logout') {
        setTimeout(async () => {
          try {
            await signOut();
          } catch (e) {
            console.error('Logout error:', e);
          }
          // Очищаем локальную авторизацию
          authService.logout();
        }, 1000);
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
  }, [inputValue, commandHistory, historyIndex, user, signOut]);

  // Wipe confirmation
  const handleWipeConfirm = useCallback(() => {
    const output = confirmWipe(user.id);
    setTerminalHistory(prev => [...prev, ...output]);
    setWipeConfirmPending(false);
    if (onWipeConfirm) {
      onWipeConfirm();
    }
  }, [user.id, onWipeConfirm]);

  const handleWipeCancel = useCallback(() => {
    setTerminalHistory(prev => [...prev, {
      type: 'info' as const,
      text: 'Wipe cancelled.',
      timestamp: Date.now()
    }]);
    setWipeConfirmPending(false);
  }, []);

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
    <div className="flex-1 flex flex-col bg-black rounded-3xl border border-green-500/30 overflow-hidden shadow-[0_0_30px_rgba(34,197,94,0.1)] h-full">
      {/* Terminal header */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-green-500/10 border-b border-green-500/30">
        <Terminal size={14} className="text-green-400" />
        <span className="text-[10px] font-black text-green-400 tracking-widest uppercase">Kernel Terminal</span>
      </div>

      {/* Terminal output */}
      <div 
        className="flex-1 overflow-y-auto p-4 font-mono text-sm custom-scroll min-h-0"
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

export default KernelTerminal;
