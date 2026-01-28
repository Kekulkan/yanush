import React, { useState, useEffect, useRef } from 'react';
import { Message, MessageRole, ActiveSession, AnalysisResult, SessionContext, ContextVisibility, UserAccount, SessionLog } from '../types';
import { sendMessageToGemini, analyzeChatSession, generateGhostResponse } from '../services/geminiService';
import { saveSessionBackup, clearSessionBackup } from '../services/storageService';
import { saveToUserArchive, saveToGlobalArchive, sendLogToServer } from '../services/archiveService';
import { resolveGenderTokens } from '../services/chaosEngine';
import { getSubscriptionInfo } from '../services/billingService';
import { authService } from '../services/authService';
import { Send, Activity as ScannerIcon, Zap, ShieldAlert, Cpu, Info, X, Target, Award, Mic, MicOff, Download, Printer, Loader2, Gavel, Eye, EyeOff, HelpCircle, Radio, Phone, Bell, Users, Megaphone, AlertOctagon, Skull, MessageSquare, ChevronDown, ChevronUp, Play, Pause, Theater, Crown, Lock } from 'lucide-react';
import SubscriptionModal from './SubscriptionModal';
import SecurityShield from './SecurityShield';

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

// Константы защиты от хитреца
const INACTIVITY_THRESHOLD_MS = 60000; // 60 секунд (1 минута) до троллинга
const INACTIVITY_TRUST_PENALTY = 5;    // -5 доверия за каждый тик бездействия
const INACTIVITY_STRESS_BONUS = 3;     // +3 стресса за каждый тик

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
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const isPremium = authService.isPremium();
  
  // Защита от хитреца: таймер бездействия
  const [isInactive, setIsInactive] = useState(false);
  const [inactivityCount, setInactivityCount] = useState(0);
  const lastActivityRef = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // История советов суфлёра (для избежания повторов)
  const [previousAdvice, setPreviousAdvice] = useState<string[]>([]);
  
  // БЭКДОР: Автоматический диалог для отладки комиссии (только админ)
  const [autoPlayActive, setAutoPlayActive] = useState(false);
  const [autoPlayStep, setAutoPlayStep] = useState(0);
  const autoPlayStopRef = useRef(false);
  
  const [expandedProfessional, setExpandedProfessional] = useState<number | null>(null);
  const [expandedAdvisory, setExpandedAdvisory] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const lastModelMsg = [...messages].reverse().find(m => m.role === MessageRole.MODEL);
  const currentTrust = lastModelMsg?.state?.trust ?? session.chaosDetails.starting_trust;
  const currentStress = lastModelMsg?.state?.stress ?? session.chaosDetails.starting_stress;

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

  // ═══════════════════════════════════════════════════════════════════════════
  // ЗАЩИТА ОТ ХИТРЕЦА: Таймер бездействия учителя
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    // Запускаем только если последнее сообщение от ученика и не идёт загрузка
    const lastMsg = messages[messages.length - 1];
    const shouldTrackInactivity = lastMsg?.role === MessageRole.MODEL && !isLoading && !isAnalyzing && !analysis;
    
    if (!shouldTrackInactivity) {
      // Сбрасываем таймер если учитель ответил или идёт загрузка
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      setIsInactive(false);
      setInactivityCount(0);
      return;
    }

    lastActivityRef.current = Date.now();
    
    // Проверяем бездействие каждые 2 секунды
    inactivityTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      
      if (elapsed >= INACTIVITY_THRESHOLD_MS) {
        setIsInactive(true);
        setInactivityCount(prev => prev + 1);
      }
    }, 2000);

    return () => {
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current);
      }
    };
  }, [messages, isLoading, isAnalyzing, analysis]);

  // Сброс таймера при любой активности (ввод текста, голос)
  useEffect(() => {
    if (input.length > 0 || isListening) {
      lastActivityRef.current = Date.now();
      setIsInactive(false);
      setInactivityCount(0);
    }
  }, [input, isListening]);

  // Обработка бездействия — добавляем троллинг от ученика
  useEffect(() => {
    if (!isInactive || inactivityCount === 0 || isLoading) return;
    
    // Генерируем троллинг только на первый, третий и пятый тик
    if (inactivityCount === 1 || inactivityCount === 3 || inactivityCount === 5) {
      const trollingMessages = [
        "Эээ... алло? Вы там уснули?",
        "*демонстративно смотрит на телефон*",
        "Может, мне самому уйти, раз вы заняты?",
        "*начинает барабанить пальцами по столу*",
        "Я так и знал, что вам плевать...",
        "*громко вздыхает*",
        "Ладно, я понял, разговор окончен...",
      ];
      
      const worldEvents = [
        { type: 'звук', description: 'Из коридора доносится смех — кто-то явно заметил затянувшуюся паузу.' },
        { type: 'npc', description: 'В дверь заглядывает другой ученик, хихикает и убегает.', npc_name: 'Одноклассник', npc_dialogue: 'Опа, а чё это вы тут застыли?' },
        { type: 'звук', description: 'Слышен шёпот за дверью: "Смотри, он завис..."' },
      ];

      const trollMsg = trollingMessages[Math.floor(Math.random() * trollingMessages.length)];
      const worldEvent = inactivityCount >= 3 ? worldEvents[Math.floor(Math.random() * worldEvents.length)] : undefined;
      
      // Рассчитываем штрафы
      const newTrust = Math.max(0, currentTrust - INACTIVITY_TRUST_PENALTY * inactivityCount);
      const newStress = Math.min(100, currentStress + INACTIVITY_STRESS_BONUS * inactivityCount);
      
      const trollMessage: Message = {
        id: `troll-${Date.now()}`,
        role: MessageRole.MODEL,
        content: trollMsg,
        state: {
          thought: 'Учитель завис. Типичный взрослый — делает вид, что ему не плевать, а сам даже ответить не может.',
          trust: newTrust,
          stress: newStress,
          world_event: worldEvent
        },
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, trollMessage]);
      saveSessionBackup(session, [...messages, trollMessage]);
      
      // После 5 тиков — критическое состояние
      if (inactivityCount >= 5 && newTrust < 20) {
        // Ученик уходит
        const exitMessage: Message = {
          id: `exit-${Date.now()}`,
          role: MessageRole.MODEL,
          content: "Всё, хватит. Я ухожу. Нечего тут время терять.",
          state: {
            thought: 'Он даже не может нормально поговорить. Зачем я вообще пришёл?',
            trust: 0,
            stress: 100,
            extreme_outcome: 'runaway'
          },
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, exitMessage]);
        
        // Запускаем анализ с негативным исходом
        setTimeout(async () => {
          setIsAnalyzing(true);
          const isPremium = user?.role === 'PREMIUM' || user?.role === 'ADMIN';
          const result = await analyzeChatSession(
            [...messages, trollMessage, exitMessage],
            session.chaosDetails.accentuation,
            'Бездействие учителя — ученик ушёл',
            { includeAdvisory: true, includeAquarium: isPremium }
          );
          setAnalysis(result);
          archiveSession([...messages, trollMessage, exitMessage], result, 'inactivity');
          setIsAnalyzing(false);
        }, 1000);
      }
    }
  }, [isInactive, inactivityCount]);

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
          const lastThought = lastModelMsg?.state?.thought;
          const advice = await generateGhostResponse(
            messages, 
            session.chaosDetails.contextSummary,
            {
              accentuation: session.chaosDetails.accentuation,
              intensity: session.chaosDetails.intensity,
              currentTrust,
              currentStress,
              studentThought: lastThought,
              previousAdvice
            }
          );
          setGhostAdvice(advice);
          setPreviousAdvice(prev => [...prev.slice(-5), advice]); // Храним последние 5 советов
      } finally { setIsPrompterLoading(false); }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // БЭКДОР АДМИНА: Автоматический диалог суфлёр↔ученик для отладки комиссии
  // ═══════════════════════════════════════════════════════════════════════════
  const startAutoPlay = async () => {
    if (!isAdmin) return;
    
    setAutoPlayActive(true);
    autoPlayStopRef.current = false;
    setAutoPlayStep(0);
    
    const MAX_STEPS = 12; // Максимум 12 обменов репликами
    let currentMessages = [...messages];
    let step = 0;
    
    while (step < MAX_STEPS && !autoPlayStopRef.current) {
      setAutoPlayStep(step + 1);
      
      try {
        // 1. Получаем совет от суфлёра
        const lastModel = [...currentMessages].reverse().find(m => m.role === MessageRole.MODEL);
        const trust = lastModel?.state?.trust ?? session.chaosDetails.starting_trust;
        const stress = lastModel?.state?.stress ?? session.chaosDetails.starting_stress;
        const thought = lastModel?.state?.thought;
        
        const advice = await generateGhostResponse(
          currentMessages,
          session.chaosDetails.contextSummary,
          {
            accentuation: session.chaosDetails.accentuation,
            intensity: session.chaosDetails.intensity,
            currentTrust: trust,
            currentStress: stress,
            studentThought: thought,
            previousAdvice
          }
        );
        
        if (autoPlayStopRef.current) break;
        
        // 2. Отправляем совет как реплику учителя
        const userMsg: Message = {
          id: `auto-user-${Date.now()}`,
          role: MessageRole.USER,
          content: advice,
          timestamp: Date.now()
        };
        currentMessages = [...currentMessages, userMsg];
        setMessages(currentMessages);
        setPreviousAdvice(prev => [...prev.slice(-5), advice]);
        
        // Небольшая пауза для UI
        await new Promise(r => setTimeout(r, 300));
        
        if (autoPlayStopRef.current) break;
        
        // 3. Получаем ответ ученика
        const response = await sendMessageToGemini(currentMessages, session.constructedPrompt, advice);
        
        const modelMsg: Message = {
          id: `auto-model-${Date.now()}`,
          role: MessageRole.MODEL,
          content: response.text,
          state: {
            thought: response.thought ?? undefined,
            trust: response.trust,
            stress: response.stress,
            world_event: response.world_event ?? undefined
          },
          timestamp: Date.now()
        };
        (modelMsg as any).non_verbal = response.non_verbal;
        (modelMsg as any).non_verbal_valence = response.non_verbal_valence;
        
        currentMessages = [...currentMessages, modelMsg];
        setMessages(currentMessages);
        saveSessionBackup(session, currentMessages);
        
        // 4. Проверяем game_over
        if (response.game_over) {
          console.log('[AutoPlay] Game Over:', response.violation_reason);
          break;
        }
        
        // Небольшая пауза между шагами
        await new Promise(r => setTimeout(r, 200));
        
        step++;
        
      } catch (error) {
        console.error('[AutoPlay] Error:', error);
        break;
      }
    }
    
    setAutoPlayActive(false);
    setAutoPlayStep(0);
    
    // Автоматически запускаем анализ по окончании
    if (!autoPlayStopRef.current && currentMessages.length > 3) {
      setIsAnalyzing(true);
      try {
        const result = await analyzeChatSession(
          currentMessages,
          session.chaosDetails.accentuation,
          'Автоматический диалог (отладка)',
          { includeAdvisory: true, includeAquarium: true }
        );
        setAnalysis(result);
        archiveSession(currentMessages, result, 'autoplay');
      } catch (e) {
        console.error('[AutoPlay] Analysis error:', e);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };
  
  const stopAutoPlay = () => {
    autoPlayStopRef.current = true;
    setAutoPlayActive(false);
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
    
    // Отправляем на сервер для глобального архива админа
    sendLogToServer(sessionLog).catch(e => console.warn('Failed to send log to server:', e));
    
    clearSessionBackup();
  };

  const handleStop = async () => {
      // Проверка минимума реплик для анализа
      const userMessages = messages.filter(m => m.role === MessageRole.USER);
      const MIN_MESSAGES = 10;
      
      if (userMessages.length < MIN_MESSAGES) {
        const confirmed = window.confirm(
          `Вы написали только ${userMessages.length} реплик из ${MIN_MESSAGES} минимальных.\n\n` +
          `Недостаточно данных для полноценного анализа комиссии.\n\n` +
          `Завершить без вердикта?`
        );
        if (confirmed) {
          // Просто выходим без анализа
          setAnalysis({
            overall_score: 0,
            summary: `Сессия завершена досрочно. Недостаточно данных для анализа (${userMessages.length}/${MIN_MESSAGES} реплик).`,
            commission: [],
            timestamp: Date.now()
          });
          archiveSession(messages, { 
            overall_score: 0, 
            summary: 'Досрочное завершение без анализа', 
            commission: [], 
            timestamp: Date.now() 
          }, 'incomplete');
        }
        return;
      }
      
      if (!window.confirm('ЗАВЕРШИТЬ СЕАНС И ПОЛУЧИТЬ ВЕРДИКТ?')) return;
      setIsAnalyzing(true);
      try {
          const isPremium = user?.role === 'PREMIUM' || user?.role === 'ADMIN';
          const result = await analyzeChatSession(
            messages, 
            session.chaosDetails.accentuation, 
            'Принудительное завершение',
            { 
              includeAdvisory: true,
              includeAquarium: isPremium  // Аквариум только для премиум
            }
          );
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

      const modelMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: MessageRole.MODEL,
        content: response.text,
        state: { 
          thought: response.thought ?? undefined, 
          trust: response.trust, 
          stress: response.stress,
          world_event: response.world_event ?? undefined,
          extreme_outcome: response.violation_reason?.includes('агресс') ? 'physical_aggression' 
            : response.violation_reason?.includes('побег') ? 'runaway'
            : response.violation_reason?.includes('замк') ? 'shutdown'
            : undefined
        },
        timestamp: Date.now()
      };

      (modelMsg as any).non_verbal = response.non_verbal;
      (modelMsg as any).non_verbal_valence = response.non_verbal_valence;

      const finalMessages = [...newMessages, modelMsg];
      setMessages(finalMessages);
      saveSessionBackup(session, finalMessages);
      
      if (response.game_over) {
          setIsAnalyzing(true);
          const isPremium = user?.role === 'PREMIUM' || user?.role === 'ADMIN';
          const result = await analyzeChatSession(
            finalMessages, 
            session.chaosDetails.accentuation, 
            response.violation_reason || 'Психологический срыв',
            { 
              includeAdvisory: true,
              includeAquarium: isPremium
            }
          );
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

  // Состояния для отображения секций анализа
  const [showAdvisory, setShowAdvisory] = useState(false);
  const [showAquarium, setShowAquarium] = useState(false);
  const [aquariumIndex, setAquariumIndex] = useState(0);
  const [aquariumPlaying, setAquariumPlaying] = useState(false);

  // Автопроигрывание аквариума
  useEffect(() => {
    if (!aquariumPlaying || !analysis?.aquarium) return;
    if (aquariumIndex >= analysis.aquarium.length) {
      setAquariumPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      setAquariumIndex(prev => prev + 1);
    }, 2500);
    return () => clearTimeout(timer);
  }, [aquariumPlaying, aquariumIndex, analysis?.aquarium]);

  // Цвет оценки
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-blue-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-rose-400';
  };

  if (analysis) {
      return (
          <div className="flex flex-col h-[100dvh] bg-[#0A0B1A]">
              <div className="flex-1 overflow-y-auto custom-scroll p-4 md:p-8">
                  <div className="max-w-5xl mx-auto space-y-8 pb-32 relative">
                      
                      {/* === ГЛАВНЫЙ ВЕРДИКТ === */}
                      <div className="glass p-6 md:p-10 rounded-[40px] border-blue-500/20 flex flex-col md:flex-row items-center gap-8 animate-in zoom-in-95 duration-700">
                          <div className="shrink-0 text-center">
                            <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">РЕЙТИНГ</div>
                            <div className={`text-6xl md:text-8xl font-black italic leading-none ${getScoreColor(analysis.overall_score)}`}>
                              {Math.round(analysis.overall_score)}
                            </div>
                          </div>
                          <div className="text-left space-y-3 flex-1">
                            <h2 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter">ВЕРДИКТ КОМИССИИ</h2>
                            <p className="text-slate-400 text-sm md:text-base leading-relaxed italic border-l-4 border-blue-500 pl-4">
                              "{analysis.summary}"
                            </p>
                          </div>
                      </div>

                      {/* === ОСНОВНАЯ КОМИССИЯ (профессионалы) === */}
                      <div className="space-y-4">
                        <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                          <Gavel size={14} className="text-blue-500" />
                          ОСНОВНАЯ СУПЕРВИЗОРСКАЯ КОМИССИЯ
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {analysis.commission.map((member, i) => {
                                const isExpanded = expandedProfessional === i;
                                return (
                                    <div 
                                        key={i} 
                                        onClick={() => setExpandedProfessional(isExpanded ? null : i)}
                                        className={`glass p-5 rounded-[28px] border-white/5 space-y-3 hover:border-blue-500/20 transition-all cursor-pointer relative overflow-hidden ${
                                            isExpanded ? 'ring-2 ring-blue-500/30 bg-blue-500/5' : ''
                                        }`}
                                    >
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="flex-1 min-w-0">
                                                <span className="text-blue-400 font-bold text-sm block truncate">{member.name}</span>
                                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mt-0.5">{member.role}</span>
                                            </div>
                                            <div className={`text-2xl font-black italic shrink-0 ${getScoreColor(member.score)}`}>
                                              {member.score}
                                            </div>
                                        </div>
                                        <p className={`text-[11px] text-slate-300 italic leading-relaxed transition-all ${
                                            isExpanded ? '' : 'line-clamp-4'
                                        }`}>
                                            "{member.verdict}"
                                        </p>
                                        {!isExpanded && member.verdict.length > 150 && (
                                            <div className="absolute bottom-2 right-5 text-[8px] font-black text-blue-500/60 uppercase tracking-widest">
                                                Развернуть →
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                      </div>

                      {/* === СОВЕЩАТЕЛЬНАЯ КОМИССИЯ (сатира) === */}
                      {session.teacher.settings?.advisoryCommission !== false && analysis.advisory && analysis.advisory.length > 0 && (
                        <div className="space-y-4">
                          <button 
                            onClick={() => setShowAdvisory(!showAdvisory)}
                            className="w-full flex items-center justify-between text-[11px] font-black text-amber-500/70 uppercase tracking-widest hover:text-amber-500 transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <Users size={14} />
                              СОВЕЩАТЕЛЬНАЯ КОМИССИЯ ({analysis.advisory.length} голосов)
                            </span>
                            {showAdvisory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                          
                          {showAdvisory && (
                            <div className="space-y-3 animate-in slide-in-from-top-2">
                              <p className="text-[10px] text-slate-500 italic">
                                Мнения представителей общества. Не влияют на итоговый балл, но показывают, 
                                с какими реакциями учителю предстоит столкнуться в реальности.
                              </p>
                              <div className="grid grid-cols-1 gap-3">
                                {analysis.advisory.map((adv, i) => {
                                  const isExp = expandedAdvisory === i;
                                  return (
                                    <div 
                                      key={i} 
                                      onClick={() => setExpandedAdvisory(isExp ? null : i)}
                                      className={`glass p-4 rounded-[20px] border-l-4 border-amber-500/30 bg-amber-500/5 space-y-2 cursor-pointer transition-all relative overflow-hidden ${
                                        isExp ? 'ring-2 ring-amber-500/20' : ''
                                      }`}
                                    >
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <span className="text-amber-400 font-bold text-sm">{adv.member.name}</span>
                                          <span className="text-[9px] text-slate-500 block">{adv.member.title}</span>
                                        </div>
                                        {adv.score !== undefined && (
                                          <div className="text-lg font-black text-amber-400/60 italic">{adv.score}/10</div>
                                        )}
                                      </div>
                                      <p className={`text-[11px] text-amber-200/80 italic leading-relaxed ${
                                        isExp ? '' : 'line-clamp-3'
                                      }`}>
                                        "{adv.verdict}"
                                      </p>
                                      {adv.triggered_by && adv.triggered_by.length > 0 && (
                                        <div className="flex flex-wrap gap-1 pt-1">
                                          {adv.triggered_by.slice(0, isExp ? 10 : 3).map((trigger, ti) => (
                                            <span key={ti} className="text-[8px] bg-amber-500/20 text-amber-400/60 px-2 py-0.5 rounded-full">
                                              {trigger}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      {!isExp && adv.verdict.length > 100 && (
                                        <div className="absolute bottom-1 right-3 text-[7px] font-black text-amber-500/40 uppercase tracking-widest">
                                            Развернуть →
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* === АКВАРИУМ (премиум) === */}
                      {session.teacher.settings?.advisoryCommission !== false && analysis.aquarium && analysis.aquarium.length > 0 && (
                        <div className="space-y-4">
                          <button 
                            onClick={() => {
                              setShowAquarium(!showAquarium);
                              if (!showAquarium) {
                                setAquariumIndex(0);
                                setAquariumPlaying(false);
                              }
                            }}
                            className="w-full flex items-center justify-between text-[11px] font-black text-violet-500/70 uppercase tracking-widest hover:text-violet-500 transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <Theater size={14} />
                              АКВАРИУМ — ОБСУЖДЕНИЕ КОМИССИИ
                            </span>
                            {showAquarium ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                          
                          {showAquarium && (
                            <div className="space-y-3 animate-in slide-in-from-top-2">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] text-slate-500 italic">
                                  Подслушайте, как члены совещательной комиссии обсуждают вашу работу между собой.
                                </p>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => {
                                      setAquariumPlaying(!aquariumPlaying);
                                      if (!aquariumPlaying && aquariumIndex >= analysis.aquarium!.length) {
                                        setAquariumIndex(0);
                                      }
                                    }}
                                    className="p-2 rounded-full bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-colors"
                                  >
                                    {aquariumPlaying ? <Pause size={14} /> : <Play size={14} />}
                                  </button>
                                </div>
                              </div>
                              
                              <div className="glass p-4 rounded-[20px] border-violet-500/20 bg-violet-500/5 space-y-3 max-h-[400px] overflow-y-auto custom-scroll">
                                {analysis.aquarium.slice(0, aquariumIndex + 1).map((dialogue, i) => (
                                  <div 
                                    key={i} 
                                    className={`p-3 rounded-xl transition-all ${
                                      i === aquariumIndex ? 'bg-violet-500/10 animate-in fade-in slide-in-from-bottom-2' : 'bg-white/5'
                                    }`}
                                  >
                                    <div className="flex items-start gap-2">
                                      <MessageSquare size={12} className="text-violet-400 mt-1 shrink-0" />
                                      <div>
                                        <span className="text-violet-400 font-bold text-xs">{dialogue.speakerName}:</span>
                                        <p className="text-[11px] text-violet-200/80 mt-1">{dialogue.text}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {aquariumIndex < analysis.aquarium.length - 1 && !aquariumPlaying && (
                                  <button 
                                    onClick={() => setAquariumIndex(analysis.aquarium!.length)}
                                    className="text-[10px] text-violet-400/50 hover:text-violet-400 transition-colors"
                                  >
                                    Показать всё ({analysis.aquarium!.length - aquariumIndex - 1} реплик)
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* === КНОПКА ВЫХОДА === */}
                      <button 
                        onClick={onExit} 
                        className="w-full py-5 bg-white text-black rounded-[24px] font-black uppercase tracking-widest text-[10px] hover:bg-blue-500 hover:text-white transition-all shadow-xl"
                      >
                        В меню
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0A0B1A] font-sans relative text-slate-200">
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
            {isPremium && session.chaosDetails.contexts && session.chaosDetails.contexts.length > 0 && (
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
              {/* БЭКДОР АДМИНА: Автодиалог */}
              {isAdmin && (
                <button 
                  onClick={autoPlayActive ? stopAutoPlay : startAutoPlay} 
                  disabled={isLoading || isAnalyzing}
                  className={`p-2.5 rounded-xl transition-all flex items-center gap-1 ${
                    autoPlayActive 
                      ? 'bg-violet-500 text-white animate-pulse shadow-[0_0_15px_rgba(139,92,246,0.5)]' 
                      : 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30'
                  }`}
                  title={autoPlayActive ? `Стоп (шаг ${autoPlayStep})` : 'Автодиалог (отладка комиссии)'}
                >
                  {autoPlayActive ? <Pause size={16} /> : <Play size={16} />}
                  {autoPlayActive && <span className="text-[9px] font-black">{autoPlayStep}</span>}
                </button>
              )}
              {isAdmin && (
                <button onClick={getAdvice} disabled={isPrompterLoading || autoPlayActive} className={`p-2.5 rounded-xl transition-all ${ghostAdvice ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'bg-white/5 text-slate-500 hover:text-white'}`}>
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
            
            {/* Индикатор бездействия */}
            {isInactive && !isLoading && !autoPlayActive && (
              <div className="flex items-center gap-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl animate-pulse">
                <AlertOctagon size={16} className="text-rose-500" />
                <div>
                  <div className="text-rose-500 text-[9px] font-black uppercase tracking-widest">
                    БЕЗДЕЙСТВИЕ УЧИТЕЛЯ
                  </div>
                  <div className="text-rose-300 text-[10px] mt-0.5">
                    Ученик ждёт ответа... Доверие падает. Напишите что-нибудь!
                  </div>
                </div>
              </div>
            )}
            
            {/* Индикатор автодиалога (бэкдор админа) */}
            {autoPlayActive && (
              <div className="flex items-center gap-3 p-3 bg-violet-500/10 border border-violet-500/30 rounded-2xl">
                <Loader2 size={16} className="text-violet-400 animate-spin" />
                <div>
                  <div className="text-violet-400 text-[9px] font-black uppercase tracking-widest">
                    АВТОДИАЛОГ — ШАГ {autoPlayStep}/12
                  </div>
                  <div className="text-violet-300 text-[10px] mt-0.5">
                    Суфлёр и ученик обмениваются репликами... Нажмите ⏸ чтобы остановить.
                  </div>
                </div>
              </div>
            )}
            
            {isAdmin && ghostAdvice && (
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
                type="button"
                onClick={() => handleSend()} 
                disabled={!input.trim() || isLoading} 
                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-white text-black rounded-2xl disabled:opacity-20 transition-all active:scale-95 shadow-lg hover:bg-blue-500 hover:text-white"
              >
                <Send size={20} />
              </button>
          </div>
      </footer>
      <SubscriptionModal 
        isOpen={isSubModalOpen} 
        onClose={() => setIsSubModalOpen(false)}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
};

export default ChatInterface;