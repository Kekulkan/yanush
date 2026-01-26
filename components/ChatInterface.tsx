import React, { useState, useEffect, useRef } from 'react';
import { Message, MessageRole, ActiveSession, AnalysisResult } from '../types';
import { sendMessageToGemini, analyzeChatSession, generateGhostResponse } from '../services/geminiService';
import { saveSessionBackup } from '../services/storageService';
import { Send, Zap, ShieldAlert, Info, X, Award, Mic, MicOff, Printer, Loader2, Gavel, Bell, UserCircle2 } from 'lucide-react';

interface Props {
  session: ActiveSession;
  isAdmin: boolean;
  onExit: () => void;
  initialMessages?: Message[];
}

const ChatInterface: React.FC<Props> = ({ session, isAdmin, onExit, initialMessages = [] }) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [showDossier, setShowDossier] = useState(false);
  const [ghostAdvice, setGhostAdvice] = useState<string | null>(null);
  const [isPrompterLoading, setIsPrompterLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (messages.length === 0) {
        setMessages([{ id: 'setup', role: MessageRole.SYSTEM, content: session.chaosDetails.contextSummary, timestamp: Date.now() }]);
    }
    
    // Фикс микрофона для Mobile и Web
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'ru-RU';
        recognitionRef.current.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
            }
            if (finalTranscript) setInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
        };
        recognitionRef.current.onerror = (e: any) => {
            console.error('Speech Error:', e);
            setIsListening(false);
        };
    }
  }, []);

  useEffect(() => { 
    // Принудительный скролл вниз с небольшой задержкой для отрисовки
    const timeoutId = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
    return () => clearTimeout(timeoutId);
  }, [messages, isLoading, ghostAdvice]);

  const toggleListening = () => {
      if (!recognitionRef.current) return alert('Голосовой ввод не поддерживается вашим браузером.');
      if (isListening) {
          recognitionRef.current.stop();
          setIsListening(false);
      } else {
          try {
              recognitionRef.current.start();
              setIsListening(true);
          } catch (e) {
              console.error(e);
          }
      }
  };

  const getAdvice = async () => {
      setIsPrompterLoading(true);
      try {
          const advice = await generateGhostResponse(messages, session.chaosDetails.contextSummary);
          setGhostAdvice(advice);
      } finally { setIsPrompterLoading(false); }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { id: Date.now().toString(), role: MessageRole.USER, content: input, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setGhostAdvice(null);

    try {
      const response = await sendMessageToGemini(newMessages, session.constructedPrompt, userMsg.content);
      const updatedMessages = [...newMessages];
      if (response.world_event) {
          updatedMessages.push({ id: `ev-${Date.now()}`, role: MessageRole.SYSTEM, content: response.world_event, timestamp: Date.now() });
      }
      const modelMsg: Message = {
        id: `ai-${Date.now()}`,
        role: MessageRole.MODEL,
        content: response.text,
        state: { thought: response.thought, trust: response.trust, stress: response.stress },
        timestamp: Date.now()
      };
      (modelMsg as any).non_verbal = response.non_verbal;
      (modelMsg as any).non_verbal_valence = response.non_verbal_valence;
      
      const finalMessages = [...updatedMessages, modelMsg];
      setMessages(finalMessages);
      saveSessionBackup(session, finalMessages);
      
      if (response.game_over) {
          setIsAnalyzing(true);
          const result = await analyzeChatSession(finalMessages, session.chaosDetails.accentuation, 'Критический порог');
          setAnalysis(result);
          setIsAnalyzing(false);
      }
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const getNVStyle = (v: number) => {
      if (v <= -0.3) return "bg-rose-500/10 border-l-rose-500 text-rose-300";
      if (v >= 0.3) return "bg-emerald-500/10 border-l-emerald-500 text-emerald-300";
      return "bg-white/5 border-l-slate-500 text-slate-400";
  };

  if (analysis) {
      return (
          <div className="h-[100dvh] bg-slate-950 flex flex-col items-center custom-scroll p-6 overflow-y-auto overflow-x-hidden">
              <div className="w-full max-w-2xl space-y-8 py-10">
                  <div className="glass p-10 rounded-[40px] text-center border-blue-500/20 shadow-2xl">
                      <div className="text-7xl font-black text-white italic mb-4">{Math.round(analysis.overall_score)}</div>
                      <h2 className="text-xl font-black text-white uppercase italic tracking-widest mb-4">Педагогический анализ</h2>
                      <p className="text-slate-400 text-sm italic leading-relaxed">"{analysis.summary}"</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                      {analysis.commission.map((m, i) => (
                          <div key={i} className="glass p-6 rounded-3xl border-white/5 space-y-2">
                              <div className="flex justify-between items-center">
                                  <span className="text-blue-400 font-black text-[9px] uppercase tracking-widest">{m.name} // {m.role}</span>
                                  <span className="text-lg font-black text-white italic">{m.score}</span>
                              </div>
                              <p className="text-[11px] text-slate-300 italic opacity-80 leading-relaxed">"{m.verdict}"</p>
                          </div>
                      ))}
                  </div>
                  <button onClick={onExit} className="w-full py-6 bg-white text-black rounded-[28px] font-black uppercase tracking-widest text-[10px] hover:bg-blue-500 hover:text-white transition-all shadow-xl">В меню</button>
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-slate-200 overflow-hidden relative">
      
      {/* DOSSIER MODAL PORTAL */}
      {showDossier && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in" onClick={() => setShowDossier(false)}>
          <div className="w-full max-w-sm glass p-8 rounded-[40px] space-y-6 animate-in zoom-in-95 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <div className="flex gap-4 items-center">
                <img src={session.student.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.student.name}`} className="w-16 h-16 rounded-2xl border border-white/10" />
                <div>
                  <h3 className="text-xl font-black italic uppercase tracking-tighter leading-none">{session.student.name}</h3>
                  <p className="text-blue-500 text-[8px] font-black uppercase tracking-[0.2em] mt-1">{session.student.age} лет // {session.chaosDetails.accentuation}</p>
                </div>
              </div>
              <button onClick={() => setShowDossier(false)} className="p-2 hover:bg-white/5 rounded-full"><X size={20} /></button>
            </div>
            <div className="p-5 bg-white/5 rounded-2xl text-[10px] italic text-slate-400 leading-relaxed border border-white/5">
              {session.chaosDetails.contextSummary}
            </div>
            <button onClick={() => setShowDossier(false)} className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase text-[9px] tracking-widest">Вернуться к диалогу</button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="shrink-0 glass border-b border-white/5 flex items-center justify-between px-6 h-20 bg-slate-950/80 backdrop-blur-xl z-50">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowDossier(true)}>
              <img src={session.student.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.student.name}`} className="w-10 h-10 rounded-lg border border-white/10" />
              <div>
                  <h2 className="text-[10px] font-black uppercase italic tracking-tighter leading-none">{session.student.name}</h2>
                  <p className="text-[7px] text-blue-500 font-black uppercase tracking-widest mt-1">Досье <Info size={8} className="inline"/></p>
              </div>
          </div>
          <div className="flex gap-2">
              {isAdmin && (
                <button onClick={getAdvice} disabled={isPrompterLoading} className={`p-2.5 rounded-xl transition-all ${ghostAdvice ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'bg-white/5 text-slate-500 hover:text-white'}`}>
                  <Zap size={18} className={isPrompterLoading ? 'animate-spin' : ''} />
                </button>
              )}
              <button onClick={toggleListening} className={`p-2.5 rounded-xl transition-all ${isListening ? 'bg-red-500 animate-pulse text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-white/5 text-slate-500 hover:text-white'}`}>
                  {isListening ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
              <button onClick={onExit} className="px-3 py-2 bg-white/5 text-[8px] font-black uppercase rounded-xl border border-white/10 text-slate-500 hover:text-white hover:bg-red-500/10">Выход</button>
          </div>
      </header>

      {/* CHAT AREA */}
      <main className="flex-grow overflow-y-auto custom-scroll p-4 md:p-8 space-y-6 flex flex-col">
          <div className="max-w-3xl w-full mx-auto flex-grow space-y-8 pb-10">
            {messages.map((msg, idx) => (
                <div key={msg.id} className={`flex flex-col ${msg.role === MessageRole.USER ? 'items-end' : (msg.role === MessageRole.SYSTEM ? 'items-center' : 'items-start')} animate-in fade-in slide-in-from-bottom-2`}>
                    {msg.role === MessageRole.SYSTEM ? (
                        <div className={`w-full glass p-6 rounded-[32px] border-l-4 ${idx === 0 ? 'border-blue-500' : 'border-amber-500 bg-amber-500/5'} text-[11px] italic text-slate-400 leading-relaxed shadow-lg`}>
                            {msg.content}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 max-w-[85%]">
                            {msg.role === MessageRole.MODEL && (msg as any).non_verbal && (
                                <div className={`px-4 py-3 rounded-2xl border-l-4 italic text-[10px] md:text-xs shadow-md ${getNVStyle((msg as any).non_verbal_valence || 0)}`}>
                                   {(msg as any).non_verbal}
                                </div>
                            )}
                            <div className={`p-4 md:p-5 rounded-[28px] text-[13px] md:text-sm leading-relaxed shadow-xl ${msg.role === MessageRole.USER ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-900 rounded-tl-none font-medium'}`}>
                                {msg.content}
                            </div>
                        </div>
                    )}
                </div>
            ))}
            {isLoading && <div className="text-blue-500 text-[9px] font-black animate-pulse flex items-center gap-2 uppercase tracking-widest"><Loader2 size={12} className="animate-spin" /> Нейросвязь...</div>}
            {ghostAdvice && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-3xl animate-in slide-in-from-left-4 max-w-[80%] shadow-2xl">
                    <div className="flex items-center gap-2 mb-2 text-amber-500 text-[8px] font-black uppercase tracking-widest"><Zap size={12}/> Суфлер</div>
                    <p className="text-xs text-amber-200 italic leading-relaxed">"{ghostAdvice}"</p>
                    <button onClick={() => setInput(ghostAdvice)} className="mt-2 text-[7px] font-black uppercase text-amber-500/50 hover:text-amber-500">Использовать</button>
                </div>
            )}
            <div ref={messagesEndRef} className="h-10 shrink-0" />
          </div>
      </main>

      {/* INPUT AREA */}
      <footer className="shrink-0 p-4 md:p-6 glass border-t border-white/5 bg-slate-950/90 backdrop-blur-xl safe-bottom">
          <div className="max-w-3xl mx-auto flex gap-3 items-center relative">
              <textarea 
                  value={input} 
                  onChange={e => setInput(e.target.value)} 
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} 
                  placeholder={isListening ? 'Слушаю вас...' : "Реплика педагога..."} 
                  className="w-full bg-slate-900 border border-white/10 rounded-[28px] p-4 pr-16 text-sm text-white outline-none resize-none h-14 md:h-16 focus:border-blue-500/40 transition-all placeholder:text-slate-600" 
              />
              <button 
                onClick={handleSend} 
                disabled={!input.trim() || isLoading} 
                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-white text-black rounded-2xl disabled:opacity-20 transition-all active:scale-95 shadow-lg hover:bg-blue-500 hover:text-white"
              >
                <Send size={20} />
              </button>
          </div>
      </footer>
    </div>
  );
};

export default ChatInterface;