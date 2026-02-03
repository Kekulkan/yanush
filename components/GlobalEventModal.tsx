import React, { useState, useEffect, useRef } from 'react';
import { Message, MessageRole, GlobalEventState, EventTarget } from '../types';
import { Send, User, Shield, AlertTriangle, Trophy, ThumbsDown } from 'lucide-react';

interface GlobalEventModalProps {
  eventState: GlobalEventState;
  onTurn: (targetId: string, message: string) => void;
  onComplete: () => void;
  isLoading: boolean;
}

export const GlobalEventModal: React.FC<GlobalEventModalProps> = ({
  eventState,
  onTurn,
  onComplete,
  isLoading
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [eventState.history]);

  const handleSend = () => {
    if (!inputText.trim() || !selectedTarget || isLoading) return;
    onTurn(selectedTarget, inputText);
    setInputText('');
    // Сбрасываем цель после хода, чтобы заставить юзера выбрать снова (ситуация могла измениться)
    setSelectedTarget(null);
  };

  const currentTarget = eventState.availableTargets.find(t => t.id === selectedTarget);

  if (eventState.isCompleted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-slate-900 border-2 border-amber-500/50 rounded-xl max-w-2xl w-full p-8 shadow-2xl shadow-amber-900/20 animate-in fade-in zoom-in duration-300">
          <div className="text-center space-y-6">
            <div className="inline-flex p-4 rounded-full bg-amber-500/20 mb-4">
              <Trophy className="w-16 h-16 text-amber-400" />
            </div>
            
            <h2 className="text-3xl font-bold text-amber-100">Событие завершено</h2>
            
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto py-6">
              <div className="bg-emerald-900/30 p-4 rounded-lg border border-emerald-500/30">
                <div className="text-emerald-400 text-sm uppercase tracking-wider mb-1">Бонусы</div>
                <div className="text-4xl font-mono font-bold text-emerald-300">+{eventState.bonuses}</div>
              </div>
              <div className="bg-rose-900/30 p-4 rounded-lg border border-rose-500/30">
                <div className="text-rose-400 text-sm uppercase tracking-wider mb-1">Штрафы</div>
                <div className="text-4xl font-mono font-bold text-rose-300">-{eventState.penalties}</div>
              </div>
            </div>

            <p className="text-slate-400">
              Результаты учтены. Нажмите любую клавишу или кнопку — возврат к диалогу с учеником.
            </p>

            <button
              onClick={onComplete}
              className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-all transform hover:scale-105"
            >
              Продолжить
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md">
      {/* Header */}
      <div className="bg-amber-950/30 border-b border-amber-500/30 p-4 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg animate-pulse">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-100 flex items-center gap-2">
                ГЛОБАЛЬНОЕ СОБЫТИЕ
                <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                  РЕЖИМ GM
                </span>
              </h2>
              <p className="text-amber-400/60 text-sm">{eventState.title}</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-300 font-mono font-bold">{eventState.bonuses}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-900/20 border border-rose-500/30 rounded-lg">
              <ThumbsDown className="w-4 h-4 text-rose-400" />
              <span className="text-rose-300 font-mono font-bold">{eventState.penalties}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex max-w-5xl mx-auto w-full">
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-amber-800/30 scrollbar-track-transparent">
          {eventState.history.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl p-4 shadow-lg ${
                  msg.role === MessageRole.USER
                    ? 'bg-slate-700 text-slate-100 rounded-br-none'
                    : 'bg-amber-900/20 border border-amber-500/20 text-amber-100 rounded-bl-none'
                }`}
              >
                {msg.role === MessageRole.MODEL && (
                  <div className="flex items-center gap-2 mb-2 text-amber-400/50 text-xs font-bold uppercase tracking-wider">
                    <Shield className="w-3 h-3" />
                    Гейммастер
                  </div>
                )}
                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-amber-900/10 border border-amber-500/10 rounded-2xl p-4 rounded-bl-none flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500/50 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-amber-500/50 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-amber-500/50 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-slate-900 border-t border-amber-500/20 p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          
          {/* Target Selection */}
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              К кому обратиться:
            </div>
            <div className="flex flex-wrap gap-2">
              {eventState.availableTargets.map((target) => (
                <button
                  key={target.id}
                  onClick={() => setSelectedTarget(target.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                    selectedTarget === target.id
                      ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-900/50 scale-105'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-amber-500/50 hover:bg-slate-700'
                  }`}
                >
                  <User className="w-4 h-4 opacity-70" />
                  <span className="font-medium">{target.name}</span>
                  {target.description && (
                    <span className="text-xs opacity-50 ml-1">({target.description})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Text Input */}
          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                selectedTarget 
                  ? `Что вы скажете персонажу "${eventState.availableTargets.find(t => t.id === selectedTarget)?.name}"?` 
                  : "Сначала выберите, к кому обратиться..."
              }
              disabled={!selectedTarget || isLoading}
              className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl p-4 pr-12 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all resize-none h-24 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || !selectedTarget || isLoading}
              className="absolute right-3 bottom-3 p-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 disabled:opacity-0 disabled:transform disabled:translate-y-2 transition-all shadow-lg"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
