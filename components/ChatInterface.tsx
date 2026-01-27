import React, { useState, useEffect, useRef } from 'react';
import { Message, MessageRole, ActiveSession, AnalysisResult, SessionContext, ContextVisibility, UserAccount, SessionLog } from '../types';
import { sendMessageToGemini, analyzeChatSession, generateGhostResponse } from '../services/geminiService';
import { saveSessionBackup, clearSessionBackup } from '../services/storageService';
import { saveToUserArchive, saveToGlobalArchive } from '../services/archiveService';
import { resolveGenderTokens } from '../services/chaosEngine';
import { Send, Activity as ScannerIcon, Zap, ShieldAlert, Cpu, Info, X, Target, Award, Mic, MicOff, Download, Printer, Loader2, Gavel, Eye, EyeOff, HelpCircle, Radio, Phone, Bell, Users, Megaphone, AlertOctagon, Skull } from 'lucide-react';

interface Props {
  session: ActiveSession;
  isAdmin: boolean;
  user?: UserAccount | null;
  onExit: () => void;
  initialMessages?: Message[];
}

// Функция определения цвета реплики на основе trust/stress
const getEmotionalGradient = (trust: number, stress: number): { bg: string; border: string; text: string; glow: string } => {
  // Критический стресс (>70) + низкое доверие = кроваво-красный (агрессия)
  if (stress > 70 && trust < 40) {
    return {
      bg: 'bg-gradient-to-br from-red-900/90 to-red-950/90',
      border: 'border-red-500/50',
      text: 'text-red-100',
      glow: 'shadow-[0_0_30px_rgba(239,68,68,0.3)]'
    };
  }
  // Высокий стресс (>50) = оранжевый/красноватый (напряжение)
  if (stress > 50) {
    return {
      bg: 'bg-gradient-to-br from-orange-900/80 to-red-900/60',
      border: 'border-orange-500/40',
      text: 'text-orange-100',
      glow: 'shadow-[0_0_20px_rgba(249,115,22,0.2)]'
    };
  }
  // Высокое доверие (>70) + низкий стресс = изумрудно-зелёный (контакт)
  if (trust > 70 && stress < 40) {
    return {
      bg: 'bg-gradient-to-br from-emerald-900/90 to-teal-900/80',
      border: 'border-emerald-500/50',
      text: 'text-emerald-100',
      glow: 'shadow-[0_0_25px_rgba(16,185,129,0.3)]'
    };
  }
  // Хорошее доверие (>50) = зеленоватый
  if (trust > 50) {
    return {
      bg: 'bg-gradient-to-br from-teal-900/70 to-slate-800/80',
      border: 'border-teal-500/30',
      text: 'text-teal-100',
      glow: 'shadow-lg'
    };
  }
  // Нейтральное/серое состояние
  return {
    bg: 'bg-gradient-to-br from-slate-800/90 to-slate-900/90',
    border: 'border-slate-600/30',
    text: 'text-slate-200',
    glow: 'shadow-lg'
  };
};

const ChatInterface: React.FC<Props> = ({ session, isAdmin, user, onExit, initialMessages = [] }) => {
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
        const cleanSummary = resolveGenderTokens(session.chaosDetails.contextSummary, session.student);
        setMessages([{ id: 'setup', role: MessageRole.SYSTEM, content: cleanSummary, timestamp: Date.now() }]);
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

  // Функция сохранения сессии в архив
  const archiveSession = (finalMessages: Message[], analysisResult: AnalysisResult, status: string) => {
    const sessionLog: SessionLog = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      duration_seconds: Math.floor((Date.now() - (messages[0]?.timestamp || Date.now())) / 1000),
      teacher: session.teacher,
      student_name: session.student.name,
      scenario_description: session.chaosDetails.contextSummary,
      status,
      messages: finalMessages,
      result: analysisResult,
      sessionSnapshot: session,
      userId: user?.id,
      userEmail: user?.email
    };

    if (user?.id) {
      saveToUserArchive(user.id, sessionLog);
    }
    saveToGlobalArchive(sessionLog);
    clearSessionBackup();
  };

  const handleStop = async () => {
      if (!window.confirm('ЗАВЕРШИТЬ СЕАНС И ПОЛУЧИТЬ ВЕРДИКТ?')) return;
      setIsAnalyzing(true);
      try {
          const result = await analyzeChatSession(messages, session.chaosDetails.accentuation, 'Принудительное завершение');
          setAnalysis(result);
          archiveSession(messages, result, 'manual');
          setIsAnalyzing(false);
      } catch (err) {
          console.error(err);
          setIsAnalyzing(false);
          window.alert('Сбой генерации анализа. Попробуйте еще раз.');
      }
  };

  const handleSend = async (textOverride?: string) => {
    const text = textOverride || input;
    if (!text.trim() || isLoading || isAnalyzing) return;

    const userMsg: Message = { id: Date.now().toString(), role: MessageRole.USER, content: text, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    saveSessionBackup(session, newMessages);
    setInput('');
    setIsLoading(true);
    setGhostAdvice(null);

    try {
      const response = await sendMessageToGemini(newMessages, session.constructedPrompt, text);
      const updatedMessages = [...newMessages];

      if (response.world_event) {
        if (typeof response.world_event === 'string') {
          updatedMessages.push({
            id: `ev-${Date.now()}`,
            role: MessageRole.SYSTEM,
            content: response.world_event,
            timestamp: Date.now()
          });
        }
      }

      const modelMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: MessageRole.MODEL,
        content: response.text,
        state: { thought: response.thought ?? undefined, trust: response.trust, stress: response.stress },
        timestamp: Date.now()
      };

      (modelMsg as any).non_verbal = response.non_verbal;
      (modelMsg as any).non_verbal_valence = response.non_verbal_valence;

      const finalMessages = [...updatedMessages, modelMsg];
      setMessages(finalMessages);
      saveSessionBackup(session, finalMessages);
      
      if (response.game_over) {
          setIsAnalyzing(true);
          const result = await analyzeChatSession(finalMessages, session.chaosDetails.accentuation, response.violation_reason || 'Психологический срыв');
          setAnalysis(result);
          archiveSession(finalMessages, result, 'completed');
          setIsAnalyzing(false);
      }
    } catch (e) { 
        console.error(e); 
    } finally { 
        setIsLoading(false); 
    }
  };

  const getNVStyle = (v: number) => {
      if (v <= -0.3) return "bg-rose-500/10 border-l-rose-500 text-rose-300";
      if (v >= 0.3) return "bg-emerald-500/10 border-l-emerald-500 text-emerald-300";
      return "bg-white/5 border-l-slate-500 text-slate-400";
  };

  if (analysis) {
      return (
          <div className="flex flex-col h-[100dvh] bg-[#0A0B1A] overflow-hidden">
              <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-12">
                  <div className="max-w-4xl mx-auto space-y-12 pb-32">
                      <div className="glass p-8 md:p-12 rounded-[60px] text-center border-blue-500/20 flex flex-col md:flex-row items-center gap-10 animate-in zoom-in-95 duration-700">
                          <div className="shrink-0">
                            <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">РЕЙТИНГ</div>
                            <div className="text-7xl md:text-9xl font-black text-white italic leading-none">{Math.round(analysis.overall_score)}</div>
                          </div>
                          <div className="text-left space-y-4">
                            <h2 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-tighter">ВЕРДИКТ</h2>
                            <p className="text-slate-400 text-lg leading-relaxed italic border-l-4 border-blue-500 pl-6">"{analysis.summary}"</p>
                          </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {analysis.commission.map((member, i) => (
                              <div key={i} className="glass p-8 rounded-[40px] border-white/5 space-y-4">
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <span className="text-blue-400 font-black text-sm uppercase italic">{member.name}</span>
                                          <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block">{member.role}</span>
                                      </div>
                                      <div className="text-3xl font-black text-white italic">{member.score}</div>
                                  </div>
                                  <p className="text-xs text-slate-300 italic">"{member.verdict}"</p>
                              </div>
                          ))}
                      </div>
                      <button onClick={onExit} className="w-full py-6 bg-white text-black rounded-[28px] font-black uppercase tracking-widest text-[10px] hover:bg-blue-500 hover:text-white transition-all shadow-xl">В меню</button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0A0B1A] font-sans relative text-slate-200 overflow-hidden">
      {isAnalyzing && (
          <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-3xl px-8 text-center animate-in fade-in duration-500">
              <div className="relative mb-12">
                  <div className="absolute inset-0 bg-blue-500/20 blur-[120px] rounded-full animate-pulse"></div>
                  <Gavel size={80} className="text-blue-500 animate-bounce relative z-10" />
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-tighter mb-4">КОМИССИЯ СОЗВАНА</h2>
              <p className="text-blue-500 font-black text-[10px] uppercase tracking-[0.4em] mb-12">ФОРМИРОВАНИЕ ПЕДАГОГИЧЕСКОГО ВЕРДИКТА...</p>
              <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 animate-[loading_3s_infinite_ease-in-out]"></div>
              </div>
          </div>
      )}

      {/* DOSSIER MODAL */}
      {showDossier && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
          onClick={() => setShowDossier(false)}
        >
          <div 
            className="w-full max-w-md glass p-8 rounded-[40px] space-y-6 shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Header with avatar */}
            <div className="flex items-center gap-6">
              <img 
                src={session.student.avatarUrl} 
                className="w-20 h-20 rounded-2xl border-2 border-blue-500/30 shadow-xl" 
              />
              <div>
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">{session.student.name}</h2>
                <p className="text-blue-500 text-xs font-black uppercase tracking-widest mt-1">{session.student.age} лет</p>
              </div>
            </div>

            {/* Psychotype (Admin only) */}
            {isAdmin && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">ПСИХОТИП</div>
                <div className="text-white font-bold">{session.chaosDetails.accentuation}</div>
              </div>
            )}

            {/* Context Summary (Incident) */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Eye size={12} className="text-blue-500" />
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">СИТУАЦИЯ</span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed italic">
                {resolveGenderTokens(session.chaosDetails.contextSummary, session.student)}
              </p>
            </div>

            {/* Context Modules with Visibility */}
            {session.chaosDetails.contexts && session.chaosDetails.contexts.length > 0 && (
              <div className="space-y-3">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">КОНТЕКСТНЫЕ ОБСТОЯТЕЛЬСТВА</div>
                {session.chaosDetails.contexts.map((ctx, idx) => {
                  // Определяем стили в зависимости от visibility
                  const visibilityStyles: Record<ContextVisibility, { 
                    bg: string; 
                    border: string; 
                    text: string; 
                    icon: React.ReactNode;
                    label: string;
                    opacity: string;
                  }> = {
                    known: {
                      bg: 'bg-emerald-500/10',
                      border: 'border-emerald-500/20',
                      text: 'text-emerald-500',
                      icon: <Eye size={12} />,
                      label: 'ИЗВЕСТНО',
                      opacity: 'opacity-100'
                    },
                    rumor: {
                      bg: 'bg-amber-500/5',
                      border: 'border-amber-500/20',
                      text: 'text-amber-500',
                      icon: <HelpCircle size={12} />,
                      label: 'СЛУХИ',
                      opacity: 'opacity-70'
                    },
                    secret: {
                      bg: 'bg-slate-500/5',
                      border: 'border-slate-500/10',
                      text: 'text-slate-600',
                      icon: <EyeOff size={12} />,
                      label: 'ТАЙНА',
                      opacity: 'opacity-40'
                    }
                  };
                  
                  const style = visibilityStyles[ctx.visibility];
                  
                  // Для тайн показываем только админу
                  if (ctx.visibility === 'secret' && !isAdmin) {
                    return null;
                  }
                  
                  return (
                    <div 
                      key={idx} 
                      className={`p-4 ${style.bg} border ${style.border} rounded-2xl ${style.opacity} transition-all`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={style.text}>{style.icon}</span>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${style.text}`}>
                          {ctx.module.name} • {style.label}
                        </span>
                      </div>
                      <p className={`text-sm leading-relaxed italic ${ctx.visibility === 'secret' ? 'text-slate-500' : 'text-slate-300'}`}>
                        {ctx.visibility === 'secret' && !isAdmin 
                          ? '???' 
                          : resolveGenderTokens(ctx.module.teacher_briefing, session.student)
                        }
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Metrics (Admin only) */}
            {isAdmin && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
                  <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">ДОВЕРИЕ</div>
                  <div className="text-2xl font-black text-white">{Math.round(currentTrust)}%</div>
                </div>
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center">
                  <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">СТРЕСС</div>
                  <div className="text-2xl font-black text-white">{Math.round(currentStress)}%</div>
                </div>
              </div>
            )}

            {/* Close button */}
            <button 
              onClick={() => setShowDossier(false)}
              className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
            >
              ЗАКРЫТЬ
            </button>
          </div>
        </div>
      )}

      <header className="shrink-0 h-24 glass border-b border-white/5 flex items-center justify-between px-6 md:px-8 z-[500] bg-slate-950/80 backdrop-blur-xl">
          <div className="flex items-center gap-4">
              <div className="relative cursor-pointer" onClick={() => setShowDossier(true)}>
                  <img src={session.student.avatarUrl} className="w-10 h-10 md:w-12 md:h-12 rounded-xl border border-white/10 grayscale hover:grayscale-0 transition-all shadow-lg" />
                  {isAdmin && <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-slate-950"></div>}
              </div>
              <div className="hidden sm:block">
                  <h2 className="text-sm md:text-md font-black text-white uppercase tracking-tighter italic leading-none">{session.student.name}</h2>
                  <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1 mt-1">
                      {isAdmin ? session.chaosDetails.accentuation : 'ОБЪЕКТ СИМУЛЯЦИИ'} <Info size={10} className="opacity-50" />
                  </div>
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
              <button 
                type="button"
                onClick={handleStop}
                className="px-4 md:px-6 py-2.5 md:py-3 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white text-[9px] md:text-[10px] font-black uppercase rounded-2xl border border-rose-500/20 transition-all z-[600]"
              >СТОП</button>
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
                        <div className="flex flex-col space-y-2 max-w-[90%] md:max-w-[85%]">
                            {msg.role === MessageRole.MODEL && (msg as any).non_verbal && (
                                <div className={`px-4 py-3 rounded-2xl border-l-4 italic text-[10px] md:text-xs shadow-md ${getNVStyle((msg as any).non_verbal_valence || 0)}`}>
                                   {(msg as any).non_verbal}
                                </div>
                            )}
                            {/* Мысли ребёнка (только для админа) */}
                            {isAdmin && msg.role === MessageRole.MODEL && msg.state?.thought && (
                                <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-[24px] text-[10px] text-amber-500 italic mb-2 font-mono">
                                    <span className="font-black uppercase text-[8px] block mb-1 opacity-60">Ментальный процесс:</span>
                                    {msg.state.thought}
                                </div>
                            )}
                            
                            {/* Реплика учителя */}
                            {msg.role === MessageRole.USER && (
                              <div className="p-4 md:p-6 rounded-[24px] md:rounded-[32px] rounded-tr-none text-sm shadow-2xl bg-blue-600 text-white">
                                {msg.content}
                              </div>
                            )}
                            
                            {/* Реплика ребёнка с эмоциональным градиентом */}
                            {msg.role === MessageRole.MODEL && (() => {
                              const trust = msg.state?.trust ?? 50;
                              const stress = msg.state?.stress ?? 50;
                              const gradient = getEmotionalGradient(trust, stress);
                              const worldEvent = msg.state?.world_event;
                              const extremeOutcome = msg.state?.extreme_outcome;
                              
                              return (
                                <>
                                  {/* World Event - если есть */}
                                  {worldEvent && (
                                    <div className="w-full mb-4 p-4 rounded-2xl bg-violet-500/10 border border-violet-500/30 shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                                      <div className="flex items-center gap-3 mb-2">
                                        <Radio size={16} className="text-violet-400" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">
                                          {worldEvent.type?.toUpperCase().replace(/_/g, ' ') || 'СОБЫТИЕ'}
                                        </span>
                                      </div>
                                      <p className="text-violet-200 text-sm italic">{worldEvent.description}</p>
                                      
                                      {/* NPC диалог если есть */}
                                      {worldEvent.npc_name && worldEvent.npc_dialogue && (
                                        <div className="mt-3 p-3 bg-violet-900/30 rounded-xl border border-violet-500/20">
                                          <div className="text-[9px] font-black text-violet-400 uppercase mb-1">{worldEvent.npc_name}:</div>
                                          <p className="text-violet-100 text-sm">"{worldEvent.npc_dialogue}"</p>
                                        </div>
                                      )}
                                      
                                      {isAdmin && (
                                        <div className="flex gap-4 mt-3 text-[9px] font-black uppercase tracking-wider text-violet-400/60">
                                          <span>Δ Доверие: {worldEvent.trust_delta > 0 ? '+' : ''}{worldEvent.trust_delta}</span>
                                          <span>Δ Стресс: {worldEvent.stress_delta > 0 ? '+' : ''}{worldEvent.stress_delta}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Extreme Outcome Warning */}
                                  {extremeOutcome && (
                                    <div className="w-full mb-4 p-4 rounded-2xl bg-red-900/50 border-2 border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.5)] animate-pulse">
                                      <div className="flex items-center gap-3">
                                        <AlertOctagon size={20} className="text-red-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-red-400">
                                          КРИТИЧЕСКИЙ ИСХОД: {extremeOutcome.toUpperCase().replace('_', ' ')}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className={`p-4 md:p-6 rounded-[24px] md:rounded-[32px] rounded-tl-none text-sm font-medium border ${gradient.bg} ${gradient.border} ${gradient.text} ${gradient.glow} transition-all duration-500`}>
                                    {msg.content}
                                    {/* Индикатор состояния */}
                                    {isAdmin && (
                                      <div className="flex gap-4 mt-3 pt-3 border-t border-white/10 text-[9px] font-black uppercase tracking-wider opacity-60">
                                        <span>Доверие: {Math.round(trust)}%</span>
                                        <span>Стресс: {Math.round(stress)}%</span>
                                      </div>
                                    )}
                                  </div>
                                </>
                              );
                            })()}
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