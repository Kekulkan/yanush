import React, { useState, useEffect, useRef } from 'react';
import { Message, MessageRole, ActiveSession, AnalysisResult, SessionContext, ContextVisibility, UserAccount, SessionLog, CompletedGlobalEventSnapshot } from '../types';
import { sendMessageToGemini, analyzeChatSession, generateGhostResponse, sendGlobalEventTurn, queryGM, GMEventContext } from '../services/geminiService';
import { saveSessionBackup, clearSessionBackup } from '../services/storageService';
import { saveToUserArchive, saveToGlobalArchive, sendLogToServer } from '../services/archiveService';
import { resolveGenderTokens } from '../services/chaosEngine';
import { getSubscriptionInfo } from '../services/billingService';
import { authService } from '../services/authService';
import { MAIN_COMMISSION } from '../services/commissionService';
import { updateSession, finishSession, abortSession } from '../lib/api';
import { Send, Activity as ScannerIcon, Zap, ShieldAlert, Cpu, Info, X, Target, Award, Mic, MicOff, Download, Printer, Loader2, Gavel, Eye, EyeOff, HelpCircle, Radio, Phone, Bell, Users, User, Megaphone, AlertOctagon, Skull, ChevronDown, ChevronUp, Play, Pause, Crown, Lock, Check, AlertTriangle } from 'lucide-react';
import SubscriptionModal from './SubscriptionModal';
import SecurityShield from './SecurityShield';
import HelpOverlay, { CHAT_HELP_ITEMS } from './HelpOverlay';
import { GlobalEventModal } from './GlobalEventModal'; // Импорт нового компонента

interface Props {
  session: ActiveSession;
  isAdmin: boolean;
  user?: UserAccount | null;
  onExit: () => void;
  initialMessages?: Message[];
  /** ID сессии в Supabase (null — гость или сессия не создана) */
  sessionId?: string | null;
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
const INACTIVITY_THRESHOLD_MS = 120000; // 120 секунд (2 минуты) до троллинга
const INACTIVITY_TRUST_PENALTY = 5;     // -5 доверия за каждый тик бездействия
const INACTIVITY_STRESS_BONUS = 3;      // +3 стресса за каждый тик

const ChatInterface: React.FC<Props> = ({ session, isAdmin, user, onExit, initialMessages = [], sessionId = null }) => {
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
  const [showHelp, setShowHelp] = useState(false);
  const ASTERISK_HINT_KEY = 'yanush_asterisk_hint_seen';
  const [showAsteriskHint, setShowAsteriskHint] = useState(false);
  const isPremium = authService.isPremium();
  
  // Пауза перед комиссией при автоматическом завершении
  const [awaitingContinue, setAwaitingContinue] = useState(false);
  const [pendingTermination, setPendingTermination] = useState<{
    messages: Message[];
    reason: string;
    source: 'game_over' | 'inactivity';
    isTriumph?: boolean; // true = триумфальное завершение, false/undefined = провал
    sessionLogId: string; // ID для обновления записи после анализа
  } | null>(null);
  
  // Защита от хитреца: таймер бездействия
  const [isInactive, setIsInactive] = useState(false);
  const [inactivityCount, setInactivityCount] = useState(0);
  const lastActivityRef = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // История советов суфлёра (для избежания повторов)
  const [previousAdvice, setPreviousAdvice] = useState<string[]>([]);
  
  // Контроль частоты GM-событий
  const lastEventIndexRef = useRef<number>(0);
  // Увеличиваем кулдаун между событиями до 20 реплик (было 3)
  const MIN_MESSAGES_BETWEEN_EVENTS = 20;
  
  // БЭКДОР: Автоматический диалог для отладки комиссии (только админ)
  const [autoPlayActive, setAutoPlayActive] = useState(false);
  const [autoPlayStep, setAutoPlayStep] = useState(0);
  const autoPlayStopRef = useRef(false);
  // Админский флаг: отключить комиссию/совещательную (супервизоры)
  const [supervisorsEnabled, setSupervisorsEnabled] = useState(true);
  // Сжатое резюме диалога для сокращения контекста LLM
  const [expandedProfessional, setExpandedProfessional] = useState<number | null>(null);
  const [expandedAdvisory, setExpandedAdvisory] = useState<number | null>(null);
  // Состояния для глобального события
  const [activeGlobalEvent, setActiveGlobalEvent] = useState<any | null>(null);
  const [isGlobalEventLoading, setIsGlobalEventLoading] = useState(false);
  const [accumulatedEventResults, setAccumulatedEventResults] = useState<{bonuses: number, penalties: number}>({ bonuses: 0, penalties: 0 });
  // Пауза «прочитайте реплики» перед показом события и отложенные данные события
  const [awaitingEventOpen, setAwaitingEventOpen] = useState<boolean>(false);
  const pendingEventDataRef = useRef<{ event: any } | null>(null);
  /** Накапливаем завершённые глобальные события для записи в лог (диалог внутри модалки) */
  const completedGlobalEventsRef = useRef<CompletedGlobalEventSnapshot[]>([]);

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
    
    // ВАЖНО: НЕ запускаем таймер если:
    // 1. Последнее сообщение — ошибка API или критическая развязка
    // 2. Сессия уже завершена (awaitingContinue)
    // 3. Последнее сообщение сгенерировано таймером бездействия (содержит типичные фразы)
    const isErrorMessage = lastMsg?.content?.includes('Связь прервана') ||
                           lastMsg?.state?.thought?.includes('Ошибка API') ||
                           lastMsg?.state?.violation_reason?.includes('CATASTROPHE') ||
                           lastMsg?.state?.violation_reason?.includes('aborted');
    const isInactivityMessage = lastMsg?.content === 'Эээ... алло? Вы там?' ||
                                lastMsg?.content === '*смотрит на учителя с недоумением*' ||
                                lastMsg?.content === 'Вы меня вообще слышите?';
    
    const shouldTrackInactivity = lastMsg?.role === MessageRole.MODEL && 
                                   !isLoading && 
                                   !isAnalyzing && 
                                   !analysis && 
                                   !awaitingContinue &&
                                   !isErrorMessage &&
                                   !isInactivityMessage;
    
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
  }, [messages, isLoading, isAnalyzing, analysis, awaitingContinue]);

  // Сброс таймера при любой активности (ввод текста, голос)
  useEffect(() => {
    if (input.length > 0 || isListening) {
      lastActivityRef.current = Date.now();
      setIsInactive(false);
      setInactivityCount(0);
    }
  }, [input, isListening]);

  // Обработка бездействия — подросток не будет долго ждать
  // 1-й тик: удивление/вопрос
  // 2-й тик: испугался и ушёл
  useEffect(() => {
    // Защита от бесконечного цикла: не более 2 тиков
    if (!isInactive || inactivityCount === 0 || isLoading || awaitingContinue) return;
    
    // Защита: если уже больше 2 тиков — что-то пошло не так, просто игнорируем
    if (inactivityCount > 2) {
      console.warn('[Inactivity] Count exceeded 2, stopping timer');
      setIsInactive(false);
      setInactivityCount(0);
      return;
    }
    
    // Первый тик — удивление
    if (inactivityCount === 1) {
      const firstReactions = [
        "Эээ... алло? Вы там?",
        "*смотрит на учителя с недоумением*",
        "Вы меня вообще слышите?",
      ];
      
      const trollMsg = firstReactions[Math.floor(Math.random() * firstReactions.length)];
      const newTrust = Math.max(0, currentTrust - 10);
      const newStress = Math.min(100, currentStress + 15);
      
      const trollMessage: Message = {
        id: `troll-${Date.now()}`,
        role: MessageRole.MODEL,
        content: trollMsg,
        state: {
          thought: 'Что с ним? Он завис? Это странно... Мне как-то не по себе.',
          trust: newTrust,
          stress: newStress
        },
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, trollMessage]);
      saveSessionBackup(session, [...messages, trollMessage]);
    }
    
    // Второй тик — испугался и убежал
    if (inactivityCount === 2) {
      const exitReasons = [
        "*резко встаёт* Мне страшно. Я ухожу.",
        "*пятится к двери* Что-то не так... Я лучше пойду.",
        "*испуганно* Вам плохо? Я... я позову кого-нибудь... *убегает*",
      ];
      
      const exitThoughts = [
        'Что с ним происходит?! Он как будто отключился. Мне страшно. Надо уходить.',
        'Это ненормально. Взрослые так себя не ведут. Что-то случилось? Надо бежать.',
        'Он завис как компьютер. Может, ему плохо? Мне надо выйти. Сейчас.',
      ];
      
      const idx = Math.floor(Math.random() * exitReasons.length);
      
      const exitMessage: Message = {
        id: `exit-${Date.now()}`,
        role: MessageRole.MODEL,
        content: exitReasons[idx],
        state: {
          thought: exitThoughts[idx],
          trust: Math.max(0, currentTrust - 20),
          stress: 90,
          extreme_outcome: 'runaway'
        },
        timestamp: Date.now()
      };
      
      const finalMessages = [...messages, exitMessage];
      setMessages(finalMessages);
      saveSessionBackup(session, finalMessages);
      
      // Сохраняем сессию СРАЗУ (без анализа) — чтобы не потерять при выходе
      const sessionLogId = crypto.randomUUID();
      const currentUser = user || authService.getCurrentUser();
      const preliminaryLog: SessionLog = {
        id: sessionLogId,
        timestamp: Date.now(),
        duration_seconds: Math.floor((Date.now() - (messages[0]?.timestamp || Date.now())) / 1000),
        teacher: session.teacher,
        student_name: session.student.name,
        scenario_description: session.chaosDetails.contextSummary,
        status: 'pending_analysis',
        messages: finalMessages,
        result: { overall_score: 0, summary: 'Ожидает анализа (бездействие)', commission: [], timestamp: Date.now() },
        sessionSnapshot: session,
        completedGlobalEvents: completedGlobalEventsRef.current.length > 0 ? [...completedGlobalEventsRef.current] : undefined,
        userId: currentUser?.id,
        userEmail: currentUser?.email
      };
      if (currentUser?.id) saveToUserArchive(currentUser.id, preliminaryLog);
      saveToGlobalArchive(preliminaryLog);
      
      // ВАЖНО: Сразу сбрасываем таймер, чтобы предотвратить дальнейшие тики
      setIsInactive(false);
      setInactivityCount(0);
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      
      // Устанавливаем паузу перед анализом, сохраняем ID для обновления
      setTimeout(() => {
        setPendingTermination({
          messages: finalMessages,
          reason: 'Бездействие учителя — ученик испугался и ушёл',
          source: 'inactivity',
          sessionLogId
        });
        setAwaitingContinue(true);
      }, 500);
    }
  }, [isInactive, inactivityCount, messages, session, user, awaitingContinue]);

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
          const worldEvent = lastModelMsg?.state?.world_event;
          const activeNpc = lastModelMsg?.state?.active_npc;
          const advice = await generateGhostResponse(
            messages, 
            session.chaosDetails.contextSummary,
            {
              accentuation: session.chaosDetails.accentuation,
              intensity: session.chaosDetails.intensity,
              currentTrust,
              currentStress,
              studentThought: undefined, // Суфлёр не видит мысли ученика — только реплики и метрики
              previousAdvice,
              teacherName: session.teacher.name,
              teacherGender: session.teacher.gender,
              worldEvent,
              activeNpc
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
        const worldEvent = lastModel?.state?.world_event;
        const activeNpc = lastModel?.state?.active_npc;
        
        const advice = await generateGhostResponse(
          currentMessages,
          session.chaosDetails.contextSummary,
          {
            accentuation: session.chaosDetails.accentuation,
            intensity: session.chaosDetails.intensity,
            currentTrust: trust,
            currentStress: stress,
            studentThought: undefined, // Суфлёр не видит мысли ученика
            previousAdvice,
            teacherName: session.teacher.name,
            teacherGender: session.teacher.gender,
            worldEvent,
            activeNpc
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
        
        // 3. Получаем ответ ученика (передаём весь диалог — иначе модель противоречит себе)
        const response = await sendMessageToGemini(currentMessages, session.constructedPrompt, advice);
        
        const modelMsg: Message = {
          id: `auto-model-${Date.now()}`,
          role: MessageRole.MODEL,
          content: response.text,
          state: {
            thought: response.thought ?? '',
            trust: response.trust,
            stress: response.stress,
            world_event: response.world_event ?? undefined,
            safeguard_applied: response.safeguard_applied ?? undefined
          },
          timestamp: Date.now()
        };
        modelMsg.non_verbal = response.non_verbal ?? undefined;
        modelMsg.non_verbal_valence = response.non_verbal_valence;
        
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
    
    console.log('[AutoPlay] Loop ended. step:', step, 'stopRef:', autoPlayStopRef.current, 'messages:', currentMessages.length);
    
    // Даём пользователю прочитать последнюю реплику перед комиссией
    if (!autoPlayStopRef.current && currentMessages.length > 3) {
      console.log('[AutoPlay] Setting awaitingContinue = true');
      const lastModel = [...currentMessages].reverse().find(m => m.role === MessageRole.MODEL);
      const finalTrust = lastModel?.state?.trust ?? 50;
      const finalStress = lastModel?.state?.stress ?? 50;
      const isTriumph = finalTrust >= 95 && finalStress <= 10;
      
      const sessionLogId = crypto.randomUUID();
      const currentUser = user || authService.getCurrentUser();
      const preliminaryLog: SessionLog = {
        id: sessionLogId,
        timestamp: Date.now(),
        duration_seconds: Math.floor((Date.now() - (messages[0]?.timestamp || Date.now())) / 1000),
        teacher: session.teacher,
        student_name: session.student.name,
        scenario_description: session.chaosDetails.contextSummary,
        status: 'autoplay',
        messages: currentMessages,
        result: { overall_score: 0, summary: 'Ожидает анализа', commission: [], timestamp: Date.now() },
        sessionSnapshot: session,
        completedGlobalEvents: completedGlobalEventsRef.current.length > 0 ? [...completedGlobalEventsRef.current] : undefined,
        userId: currentUser?.id,
        userEmail: currentUser?.email
      };
      if (currentUser?.id) saveToUserArchive(currentUser.id, preliminaryLog);
      saveToGlobalArchive(preliminaryLog);
      
      setPendingTermination({
        messages: currentMessages,
        reason: 'Автоматический диалог (отладка)',
        source: 'game_over',
        isTriumph,
        sessionLogId
      });
      console.log('[AutoPlay] Awaiting user continue...');
      setAwaitingContinue(true);
      return; // Ждём нажатия кнопки
    }
    
    // Если пользователь остановил autoplay — просто останавливаем, НЕ запускаем анализ
    // Пользователь может продолжить вручную или снова запустить autoplay
    if (autoPlayStopRef.current) {
      console.log('[AutoPlay] User stopped - pausing for manual input. Messages:', currentMessages.length);
      // НЕ запускаем анализ — просто возвращаем управление пользователю
      return;
    }
    
    console.log('[AutoPlay] No pause needed - messages:', currentMessages.length);
  };
  
  const stopAutoPlay = () => {
    autoPlayStopRef.current = true;
    setAutoPlayActive(false);
  };

  // Функция сохранения сессии в архив (existingId для обновления предварительной записи)
  const archiveSession = (finalMessages: Message[], analysisResult: AnalysisResult, status: string, existingId?: string) => {
    // Получаем актуального юзера напрямую из сервиса, чтобы избежать проблем с props
    const currentUser = user || authService.getCurrentUser();
    
    const sessionLog: SessionLog = {
      id: existingId || crypto.randomUUID(),
      timestamp: Date.now(),
      duration_seconds: Math.floor((Date.now() - (messages[0]?.timestamp || Date.now())) / 1000),
      teacher: session.teacher,
      student_name: session.student.name,
      scenario_description: session.chaosDetails.contextSummary,
      status,
      messages: finalMessages,
      result: analysisResult,
      sessionSnapshot: session,
      completedGlobalEvents: completedGlobalEventsRef.current.length > 0 ? [...completedGlobalEventsRef.current] : undefined,
      userId: currentUser?.id,
      userEmail: currentUser?.email
    };
    completedGlobalEventsRef.current = [];

    if (currentUser?.id) {
      console.log('[archiveSession] Saving to user archive for ID:', currentUser.id);
      saveToUserArchive(currentUser.id, sessionLog);
    } else {
      console.warn('[archiveSession] No user ID found, skipping user archive');
    }
    
    saveToGlobalArchive(sessionLog);
    
    // Отправляем на сервер для глобального архива админа
    sendLogToServer(sessionLog).catch(e => console.warn('Failed to send log to server:', e));
    
    clearSessionBackup();
  };

  const handleStop = async () => {
      // Если супервизоры отключены (режим отладки) — выходим без вызова комиссии
      if (!supervisorsEnabled) {
        if (!window.confirm('Завершить сеанс БЕЗ вердикта комиссии (режим отладки супервизоров)?')) {
          return;
        }
        const stubResult: AnalysisResult = {
          overall_score: 0,
          summary: 'Сессия завершена в режиме отладки: анализ комиссии был отключён.',
          commission: [],
          timestamp: Date.now()
        };
        setAnalysis(stubResult);
        archiveSession(messages, stubResult, 'manual');
        // Сохраняем в Supabase как aborted (без вердикта)
        abortSession(sessionId, messages).catch(console.warn);
        return;
      }

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
          const incompleteResult: AnalysisResult = {
            overall_score: 0,
            summary: `Сессия завершена досрочно. Недостаточно данных для анализа (${userMessages.length}/${MIN_MESSAGES} реплик).`,
            commission: [],
            timestamp: Date.now()
          };
          setAnalysis(incompleteResult);
          archiveSession(messages, incompleteResult, 'incomplete');
          // Сохраняем в Supabase как aborted
          abortSession(sessionId, messages).catch(console.warn);
        }
        return;
      }
      
      if (!window.confirm('ЗАВЕРШИТЬ СЕАНС И ПОЛУЧИТЬ ВЕРДИКТ?')) return;
      setIsAnalyzing(true);
      try {
          const result = await analyzeChatSession(
            messages,
            session.chaosDetails.accentuation,
            'Принудительное завершение',
            { includeAdvisory: true }
          );
          setAnalysis(result);
          archiveSession(messages, result, 'manual');
          // Финализируем сессию в Supabase с вердиктом комиссии
          finishSession(sessionId, { feedback: result }, messages).catch(console.warn);
          setIsAnalyzing(false);
      } catch (err) {
          console.error(err);
          setIsAnalyzing(false);
          window.alert('Сбой генерации анализа. Попробуйте еще раз.');
      }
  };

  // Обработка хода в глобальном событии
  const handleGlobalEventTurn = async (targetId: string, message: string) => {
    if (!activeGlobalEvent) return;
    
    setIsGlobalEventLoading(true);
    try {
      // Добавляем сообщение игрока в историю события
      const targetName = activeGlobalEvent.availableTargets.find((t: any) => t.id === targetId)?.name || targetId;
      const userMsg = {
        id: Date.now().toString(),
        role: MessageRole.USER,
        content: `[Обращаясь к: ${targetName}] ${message}`,
        timestamp: Date.now()
      };
      
      const newHistory = [...activeGlobalEvent.history, userMsg];
      
      // Считаем количество ходов (пар сообщений)
      const turns = Math.floor(newHistory.length / 2);

      // Отправляем ход ГМ-у
      const response = await sendGlobalEventTurn(
        newHistory,
        activeGlobalEvent.description, // Контекст
        message,
        targetName,
        activeGlobalEvent.bonuses,
        activeGlobalEvent.penalties,
        currentTrust, // Текущее доверие
        currentStress, // Текущий стресс
        turns // Передаем номер хода для контроля длительности
      );
      
      // Добавляем ответ ГМ-а
      const gmMsg = {
        id: (Date.now() + 1).toString(),
        role: MessageRole.MODEL,
        content: response.description,
        timestamp: Date.now()
      };
      
      // FALLBACK: Если событие длится больше 10 ходов — принудительно завершаем
      const forceComplete = turns >= 10;
      if (forceComplete && !response.is_completed) {
          console.warn('[Global Event] Force completing event due to turn limit');
          gmMsg.content += "\n\n(Ситуация исчерпана, событие завершается)";
      }

      // Обновляем состояние события
      setActiveGlobalEvent((prev: any) => ({
        ...prev,
        history: [...newHistory, gmMsg],
        bonuses: prev.bonuses + response.bonuses_delta,
        penalties: prev.penalties + response.penalties_delta,
        trustDelta: (prev.trustDelta || 0) + response.trust_delta,
        stressDelta: (prev.stressDelta || 0) + response.stress_delta,
        availableTargets: response.available_targets.length > 0 ? response.available_targets : prev.availableTargets,
        isCompleted: response.is_completed || forceComplete,
        description: response.description, // Обновляем текущее описание ситуации
        extreme_outcome: response.extreme_outcome // Запоминаем исход (если есть)
      }));
      
    } catch (e) {
      console.error("Global Event Turn Error:", e);
    } finally {
      setIsGlobalEventLoading(false);
    }
  };

  // Завершение глобального события (возврат в диалог — по любой клавише/клику)
  const completeGlobalEvent = () => {
    if (!activeGlobalEvent) return;
    // Сохраняем снимок события в лог (диалог внутри модалки)
    completedGlobalEventsRef.current.push({
      title: activeGlobalEvent.title,
      description: activeGlobalEvent.description,
      bonuses: activeGlobalEvent.bonuses,
      penalties: activeGlobalEvent.penalties,
      history: [...(activeGlobalEvent.history || [])],
      extreme_outcome: activeGlobalEvent.extreme_outcome // Сохраняем исход
    });
    setAccumulatedEventResults(prev => ({
      bonuses: prev.bonuses + activeGlobalEvent.bonuses,
      penalties: prev.penalties + activeGlobalEvent.penalties
    }));

    // Применяем изменения доверия и стресса к основной сессии
    if (activeGlobalEvent.trustDelta || activeGlobalEvent.stressDelta) {
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg.role === MessageRole.MODEL) {
          const newTrust = Math.max(0, Math.min(100, (lastMsg.state?.trust ?? 50) + (activeGlobalEvent.trustDelta || 0)));
          const newStress = Math.max(0, Math.min(100, (lastMsg.state?.stress ?? 50) + (activeGlobalEvent.stressDelta || 0)));
          
          // Создаем системное сообщение об изменении состояния
          const updateMsg: Message = {
            id: `event-update-${Date.now()}`,
            role: MessageRole.SYSTEM,
            content: `Влияние события на ученика:\nДоверие: ${activeGlobalEvent.trustDelta > 0 ? '+' : ''}${activeGlobalEvent.trustDelta} → ${newTrust}%\nСтресс: ${activeGlobalEvent.stressDelta > 0 ? '+' : ''}${activeGlobalEvent.stressDelta} → ${newStress}%`,
            timestamp: Date.now()
          };
          
          // Обновляем последнее сообщение модели (невидимо, для состояния) или просто добавляем системное?
          // Лучше добавим системное, а следующее сообщение модели подхватит новое состояние из промпта/контекста.
          // НО! Нам нужно чтобы generateGhostResponse и прочие видели актуальное состояние.
          // Поэтому мы должны "пропатчить" последнее сообщение модели или добавить скрытое состояние.
          // Проще всего: следующее сообщение модели будет сгенерировано с учетом новых метрик,
          // так как мы передаем историю. Но история берет state из сообщений.
          // Так что надо обновить стейт последнего сообщения.
          
          const updatedLastMsg = {
            ...lastMsg,
            state: {
              ...lastMsg.state!,
              trust: newTrust,
              stress: newStress
            }
          };
          
          return [...prev.slice(0, -1), updatedLastMsg, updateMsg];
        }
        return prev;
      });
    }

    const summaryMsg: Message = {
      id: `event-end-${Date.now()}`,
      role: MessageRole.SYSTEM,
      content: `ГЛОБАЛЬНОЕ СОБЫТИЕ ЗАВЕРШЕНО.\nИтог: Бонусы +${activeGlobalEvent.bonuses}, Штрафы -${activeGlobalEvent.penalties}.\nВозвращаемся к уроку.`,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, summaryMsg]);
    setActiveGlobalEvent(null);
  };

  // Открыть отложенное глобальное событие (после паузы «прочитайте реплики»)
  const openPendingGlobalEvent = async () => {
    const pending = pendingEventDataRef.current?.event;
    if (!pending) {
      setAwaitingEventOpen(false);
      return;
    }
    setAwaitingEventOpen(false);
    pendingEventDataRef.current = null;
    setIsGlobalEventLoading(true);
    try {
      const initResponse = await sendGlobalEventTurn(
        [{ role: MessageRole.SYSTEM, content: pending.description, id: 'init', timestamp: Date.now() }],
        pending.description,
        "Начало события",
        "GM",
        0, 0,
        currentTrust,
        currentStress,
        0 // Начальный ход
      );
      setActiveGlobalEvent({
        isActive: true,
        title: pending.type?.toUpperCase().replace(/_/g, ' ') || 'КРИЗИСНАЯ СИТУАЦИЯ',
        description: pending.description,
        bonuses: 0,
        penalties: 0,
        trustDelta: 0,
        stressDelta: 0,
        availableTargets: initResponse.available_targets?.length > 0
          ? initResponse.available_targets
          : [{ id: 'head_teacher', name: 'Завуч' }, { id: 'class', name: 'Класс' }, { id: 'student', name: 'Ученик' }],
        history: [{ id: 'ev-init', role: MessageRole.MODEL, content: initResponse.description || pending.description, timestamp: Date.now() }],
        isCompleted: false
      });
    } catch (e) {
      console.error("Failed to init global event:", e);
    } finally {
      setIsGlobalEventLoading(false);
    }
  };

  const handleSend = async (textOverride?: string) => {
    const text = textOverride || input;
    if (!text.trim() || isLoading || isAnalyzing) return;

    // Сбрасываем таймер бездействия при отправке сообщения
    lastActivityRef.current = Date.now();
    setIsInactive(false);
    setInactivityCount(0);

    const userMsg: Message = { id: Date.now().toString(), role: MessageRole.USER, content: text, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    saveSessionBackup(session, newMessages);
    setInput('');
    setIsLoading(true);
    setGhostAdvice(null);

    try {
      // === НОВАЯ АРХИТЕКТУРА: GM вызывается ОТДЕЛЬНО от ученика ===
      const currentMsgIndex = newMessages.length;
      const messagesSinceLastEvent = currentMsgIndex - lastEventIndexRef.current;
      const turnCount = Math.floor(currentMsgIndex / 2) + 1; // Примерный номер хода
      
      let gmEvent: GMEventContext | null = null;

      // Проверяем лимиты событий
      const completedEventsCount = completedGlobalEventsRef.current.length;
      const hasTerminalEvent = completedGlobalEventsRef.current.some(e => e.extreme_outcome || e.title.includes('TERMINAL') || e.title.includes('GAME OVER')); // Простейшая проверка на терминальность

      // Проверяем, нужно ли спросить GM о событии
      // 1. Кулдаун 20 реплик (MIN_MESSAGES_BETWEEN_EVENTS) - считаем только base frame (без системных)
      // 2. Минимум 5-й ход диалога
      // 3. Не больше 2 событий за сессию
      // 4. Не было терминальных событий
      
      // Считаем реальные реплики (User/Model) с момента последнего события
      // Ищем индекс последнего завершенного события в массиве сообщений
      let lastEventEndIndex = 0;
      if (completedGlobalEventsRef.current.length > 0) {
          // Находим последнее системное сообщение о завершении события
          for (let i = newMessages.length - 1; i >= 0; i--) {
              if (newMessages[i].role === MessageRole.SYSTEM &&
                  newMessages[i].content.includes('ГЛОБАЛЬНОЕ СОБЫТИЕ ЗАВЕРШЕНО')) {
                  lastEventEndIndex = i;
                  break;
              }
          }
      }

      // Считаем только реплики User и Model после последнего события
      const baseFrameMessagesSinceLastEvent = newMessages
          .slice(lastEventEndIndex)
          .filter(m => m.role === MessageRole.USER || m.role === MessageRole.MODEL)
          .length;

      if (baseFrameMessagesSinceLastEvent >= MIN_MESSAGES_BETWEEN_EVENTS &&
          turnCount >= 5 &&
          completedEventsCount < 2 &&
          !hasTerminalEvent) {
        console.log(`[GM] Checking for event (turn ${turnCount}, ${baseFrameMessagesSinceLastEvent} msgs since last event, events: ${completedEventsCount})...`);
        
        // Собираем последние 6 сообщений для GM
        const recentMsgs = newMessages.slice(-6).map(m => ({
          role: m.role === MessageRole.USER ? 'teacher' as const : 'student' as const,
          content: m.content
        }));
        
        // Получаем последний активный NPC (если есть)
        const lastModelMsg = [...newMessages].reverse().find(m => m.role === MessageRole.MODEL);
        const activeNpc = lastModelMsg?.state?.active_npc;
        
        try {
          const gmDecision = await queryGM({
            scenarioDescription: session.chaosDetails?.contextSummary || 'Разговор учителя с учеником',
            studentName: session.student?.name || 'Ученик',
            studentAge: session.student?.age || 14,
            teacherName: session.teacher?.name || 'Учитель',
            contexts: session.chaosDetails?.contexts || [],
            turnCount,
            currentTrust: lastModelMsg?.state?.trust ?? session.chaosDetails?.starting_trust ?? 50,
            currentStress: lastModelMsg?.state?.stress ?? session.chaosDetails?.starting_stress ?? 50,
            recentMessages: recentMsgs,
            activeNpc: activeNpc ? { name: activeNpc.name, role: activeNpc.role } : undefined,
            lastEventType: lastModelMsg?.state?.world_event?.type
          });
          
          if (gmDecision.should_generate && gmDecision.event) {
            console.log(`[GM] Generated event: ${gmDecision.event.type} - ${gmDecision.reasoning}`);
            gmEvent = gmDecision.event as GMEventContext;
            lastEventIndexRef.current = currentMsgIndex; // Обновляем счётчик
          }
        } catch (gmError) {
          console.error('[GM] Error:', gmError);
          // GM упал — не критично, продолжаем без события
        }
      }
      
      // Вызываем ученика, передавая событие от GM (если есть). Весь диалог — иначе модель противоречит себе (забывает факты, путает детали).
      const response = await sendMessageToGemini(newMessages, session.constructedPrompt, text, gmEvent);

      // Если GM сгенерировал событие — добавляем его в ответ ученика
      let filteredWorldEvent = gmEvent ? {
        type: gmEvent.type || 'dilemma',
        description: gmEvent.description,
        dilemma: gmEvent.dilemma,
        npc_name: gmEvent.npc_name,
        npc_role: gmEvent.npc_role,
        npc_dialogue: gmEvent.npc_dialogue,
        npc_stays: gmEvent.npc_stays,
        requires_response: true,
        trust_delta: 0,
        stress_delta: 0
      } : response.world_event; // Fallback на старую логику если GM не вызывался

      if (filteredWorldEvent) {
        // Событие требует реакции — сначала пауза «прочитайте реплики», потом переход к событию
        if (filteredWorldEvent.requires_response) {
          console.log('[GM Event] Pausing for user to read, then opening:', filteredWorldEvent.type);
          pendingEventDataRef.current = { event: filteredWorldEvent };
          setAwaitingEventOpen(true);
        }
      }

      // Получаем предыдущие значения trust/stress
      const lastModelMsg = [...newMessages].reverse().find(m => m.role === MessageRole.MODEL);
      const prevTrust = lastModelMsg?.state?.trust ?? 50;
      const prevStress = lastModelMsg?.state?.stress ?? 50;
      
      // Считаем номер реплики (для правила "разогрева")
      const replyNumber = newMessages.filter(m => m.role === MessageRole.MODEL).length + 1;
      
      // ЖЁСТКАЯ ВАЛИДАЦИЯ: ограничиваем изменение метрик
      // В первые 5 реплик — max ±15, потом — max ±40
      const MAX_DELTA = replyNumber <= 5 ? 15 : 40;
      
      let finalTrust = response.trust;
      let finalStress = response.stress;
      
      // Вычисляем дельты которые хочет GM
      const trustDelta = finalTrust - prevTrust;
      const stressDelta = finalStress - prevStress;
      
      // Если дельты превышают максимум — ограничиваем и логируем
      if (Math.abs(trustDelta) > MAX_DELTA || Math.abs(stressDelta) > MAX_DELTA) {
        console.error(`[Trust/Stress] GM АБСУРД! Реплика #${replyNumber}, prev: ${prevTrust}/${prevStress}, GM wants: ${finalTrust}/${finalStress} (delta: ${trustDelta}/${stressDelta}). ОГРАНИЧИВАЕМ до ±${MAX_DELTA}!`);
        
        // Ограничиваем дельты
        const clampedTrustDelta = Math.max(-MAX_DELTA, Math.min(MAX_DELTA, trustDelta));
        const clampedStressDelta = Math.max(-MAX_DELTA, Math.min(MAX_DELTA, stressDelta));
        
        finalTrust = Math.max(0, Math.min(100, prevTrust + clampedTrustDelta));
        finalStress = Math.max(0, Math.min(100, prevStress + clampedStressDelta));
        
        console.log(`[Trust/Stress] Исправлено на: ${finalTrust}/${finalStress}`);
      }
      
      // Дополнительно корректируем если есть event_reaction с дельтами
      // НО ТОЛЬКО если в предыдущей реплике модели было world_event!
      if (response.event_reaction) {
        // Проверяем, было ли world_event в предыдущем сообщении модели
        const prevModelMsg = [...newMessages].reverse().find(m => m.role === MessageRole.MODEL);
        const hadWorldEvent = prevModelMsg?.state?.world_event != null;
        
        if (hadWorldEvent) {
          const eventTrustDelta = response.event_reaction.trust_change || 0;
          const eventStressDelta = response.event_reaction.stress_change || 0;
          
          // Применяем дельты события к текущим значениям
          finalTrust = Math.max(0, Math.min(100, finalTrust + eventTrustDelta));
          finalStress = Math.max(0, Math.min(100, finalStress + eventStressDelta));
        } else {
          // Галлюцинация! event_reaction без world_event
          console.error(`[Event Reaction] ГАЛЛЮЦИНАЦИЯ: event_reaction без world_event. Игнорируем.`);
          response.event_reaction = null;
        }
      }

      // Определяем extreme_outcome: берём из ответа модели или выводим из violation_reason
      const extremeOutcome = response.extreme_outcome 
        ?? (response.violation_reason?.includes('агресс') ? 'physical_aggression' 
          : response.violation_reason?.includes('побег') ? 'runaway'
          : response.violation_reason?.includes('замк') ? 'shutdown'
          : undefined);
      
      const modelMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: MessageRole.MODEL,
        content: response.text,
        state: {
          thought: response.thought ?? '',
          trust: finalTrust,
          stress: finalStress,
          world_event: filteredWorldEvent ?? undefined,
          event_reaction: response.event_reaction ?? undefined,
          active_npc: response.active_npc ?? undefined, // NPC в сцене
          gm_note: response.gm_note ?? undefined, // GM подсказка для админа
          extreme_outcome: extremeOutcome as any,
          violation_reason: response.violation_reason ?? undefined, // Описание исхода
          safeguard_applied: response.safeguard_applied ?? undefined // Диагностика: почему сработала защита от обрыва
        },
        timestamp: Date.now()
      };

      modelMsg.non_verbal = response.non_verbal ?? undefined;
      modelMsg.non_verbal_valence = response.non_verbal_valence;

      const finalMessages = [...newMessages, modelMsg];
      setMessages(finalMessages);
      saveSessionBackup(session, finalMessages);
      
      // ВАЛИДАЦИЯ game_over: проверяем на критические метрики (провал ИЛИ триумф)
      const isFailure = finalTrust <= 5 || finalStress >= 95;
      const isTriumph = finalTrust >= 95 && finalStress <= 10;
      const isReallyGameOver = response.game_over && (isFailure || isTriumph);
      
      if (response.game_over && !isReallyGameOver) {
        console.error(`[Game Over] GM выдал game_over БЕЗ причины! trust=${finalTrust}, stress=${finalStress}. ИГНОРИРУЕМ game_over!`);
      }
      
      if (isReallyGameOver) {
          // Сохраняем сессию СРАЗУ (без анализа) — чтобы не потерять при выходе
          const sessionLogId = crypto.randomUUID();
          const currentUser = user || authService.getCurrentUser();
          const preliminaryLog: SessionLog = {
            id: sessionLogId,
            timestamp: Date.now(),
            duration_seconds: Math.floor((Date.now() - (messages[0]?.timestamp || Date.now())) / 1000),
            teacher: session.teacher,
            student_name: session.student.name,
            scenario_description: session.chaosDetails.contextSummary,
            status: 'pending_analysis',
            messages: finalMessages,
            result: { overall_score: 0, summary: 'Ожидает анализа', commission: [], timestamp: Date.now() },
            sessionSnapshot: session,
            completedGlobalEvents: completedGlobalEventsRef.current.length > 0 ? [...completedGlobalEventsRef.current] : undefined,
            userId: currentUser?.id,
            userEmail: currentUser?.email
          };
          if (currentUser?.id) saveToUserArchive(currentUser.id, preliminaryLog);
          saveToGlobalArchive(preliminaryLog);
          
          // Даём пользователю прочитать последнюю реплику, сохраняем ID для обновления
          setPendingTermination({
            messages: finalMessages,
            reason: response.violation_reason || (isTriumph ? 'УСПЕХ: полное разрешение ситуации' : 'Психологический срыв'),
            source: 'game_over',
            isTriumph: isTriumph,
            sessionLogId
          });
          setAwaitingContinue(true);
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

  // Функция продолжения анализа после паузы
  const handleContinueAfterTermination = async () => {
    if (!pendingTermination) return;

    setAwaitingContinue(false);

    // Если супервизоры отключены — завершаем без вызова комиссии
    if (!supervisorsEnabled) {
      const stubResult: AnalysisResult = {
        overall_score: 0,
        summary: 'Сессия завершена в режиме отладки: анализ комиссии был отключён.',
        commission: [],
        timestamp: Date.now()
      };
      setAnalysis(stubResult);
      setPendingTermination(null);
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const result = await analyzeChatSession(
        pendingTermination.messages,
        session.chaosDetails.accentuation,
        pendingTermination.reason,
        { includeAdvisory: true }
      );
      setAnalysis(result);
      // Используем существующий ID чтобы обновить предварительную запись
      archiveSession(
        pendingTermination.messages,
        result,
        pendingTermination.source === 'inactivity' ? 'inactivity' : 'completed',
        pendingTermination.sessionLogId
      );
      // Финализируем сессию в Supabase с вердиктом и полной историей
      finishSession(sessionId, { feedback: result }, pendingTermination.messages).catch(console.warn);
    } catch (err) {
      console.error('Analysis error:', err);
      window.alert('Сбой генерации анализа.');
    } finally {
      setIsAnalyzing(false);
      setPendingTermination(null);
    }
  };

  // Состояния для отображения секций анализа
  const [showAdvisory, setShowAdvisory] = useState(false);

  // Цвет оценки
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-blue-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-rose-400';
  };

  // Любая клавиша — возврат из завершённого события в диалог
  useEffect(() => {
    if (!activeGlobalEvent?.isCompleted) return;
    const onKey = () => completeGlobalEvent();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeGlobalEvent?.isCompleted]);

  // Любая клавиша — переход к событию после паузы «прочитайте реплики»
  useEffect(() => {
    if (!awaitingEventOpen) return;
    const onKey = () => openPendingGlobalEvent();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [awaitingEventOpen]);
  
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
                                        className={`glass rounded-[28px] border-white/5 hover:border-blue-500/20 transition-all cursor-pointer relative overflow-hidden flex flex-col sm:flex-row ${
                                            isExpanded ? 'ring-2 ring-blue-500/30 bg-blue-500/5' : ''
                                        }`}
                                    >
                                        {MAIN_COMMISSION.find(mc => mc.name === member.name)?.avatar && (
                                            <div className="w-full sm:w-2/5 h-48 sm:h-auto shrink-0 relative">
                                                <img 
                                                    src={`${MAIN_COMMISSION.find(mc => mc.name === member.name)?.avatar}.jpg`}
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        if (target.src.endsWith('.jpg')) {
                                                            target.src = `${MAIN_COMMISSION.find(mc => mc.name === member.name)?.avatar}.png`;
                                                        } else if (target.src.endsWith('.png')) {
                                                            target.src = `${MAIN_COMMISSION.find(mc => mc.name === member.name)?.avatar}.jpeg`;
                                                        }
                                                    }}
                                                    alt={member.name}
                                                    className="absolute inset-0 w-full h-full object-cover object-top"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B1A] via-transparent to-transparent sm:hidden"></div>
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0A0B1A] hidden sm:block"></div>
                                            </div>
                                        )}
                                        <div className="p-5 flex-1 flex flex-col space-y-3 relative z-10 bg-[#0A0B1A]/60 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none">
                                            <div className="flex justify-between items-start gap-3">
                                                <div>
                                                    <span className="text-blue-400 font-bold text-sm block leading-tight">{member.name}</span>
                                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mt-1">{member.role}</span>
                                                </div>
                                                <div className={`text-2xl font-black italic shrink-0 ${getScoreColor(member.score)}`}>
                                                  {member.score}
                                                </div>
                                            </div>
                                            <p className={`text-[11px] text-slate-300 italic leading-relaxed transition-all flex-1 ${
                                                isExpanded ? '' : 'line-clamp-4'
                                            }`}>
                                                "{member.verdict}"
                                            </p>
                                            {!isExpanded && member.verdict.length > 150 && (
                                                <div className="text-right text-[8px] font-black text-blue-500/60 uppercase tracking-widest mt-2">
                                                    Развернуть →
                                                </div>
                                            )}
                                        </div>
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
      
      {/* Пауза «прочитайте последние реплики» перед переходом к событию */}
      {awaitingEventOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm cursor-pointer"
          onClick={openPendingGlobalEvent}
          role="button"
          tabIndex={0}
          aria-label="Перейти к событию"
        >
          <div className="text-center p-8 rounded-2xl border border-amber-500/40 bg-slate-900/95 max-w-md">
            <p className="text-amber-200 font-bold mb-2">Прочитайте последние реплики выше.</p>
            <p className="text-slate-400 text-sm">Нажмите любую клавишу или клик — переход к событию</p>
          </div>
        </div>
      )}

      {/* ГЛОБАЛЬНОЕ СОБЫТИЕ (МОДАЛКА) */}
      {activeGlobalEvent && (
        <GlobalEventModal
          eventState={activeGlobalEvent}
          onTurn={handleGlobalEventTurn}
          onComplete={completeGlobalEvent}
          isLoading={isGlobalEventLoading}
        />
      )}

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
              <div className="flex flex-col items-center gap-2">
                <img 
                  src={session.student.avatarUrl} 
                  className="w-20 h-20 rounded-2xl border-2 border-blue-500/30 shadow-xl" 
                />
                {/* Выраженность: 1–2 зелёные, 3–4 жёлтые, 5 красная */}
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((lv) => {
                    const lit = lv <= (session.chaosDetails?.intensity ?? 1);
                    const intensity = session.chaosDetails?.intensity ?? 1;
                    const color = !lit ? 'bg-slate-600/50' : intensity <= 2 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]' : intensity <= 4 ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]' : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.9)]';
                    return <div key={lv} className={`w-2 h-2 rounded-full transition-all ${color}`} />;
                  })}
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">{session.student.name}</h2>
                <p className="text-blue-500 text-xs font-black uppercase tracking-widest mt-1">{session.student.age} лет</p>
              </div>
            </div>

            {/* Psychotype */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
              <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">ПСИХОТИП</div>
              <div className="text-white font-bold">{session.chaosDetails.accentuation} (выраженность {session.chaosDetails?.intensity ?? 1}/5)</div>
            </div>

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

            {/* Metrics (Admin only). Иконки ✓/! для доступности (дальтонизм). */}
            {isAdmin && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
                  <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                    <Check size={12} className="shrink-0" aria-hidden /> ДОВЕРИЕ
                  </div>
                  <div className="text-2xl font-black text-white">{Math.round(currentTrust)}%</div>
                </div>
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center">
                  <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                    <AlertTriangle size={12} className="shrink-0" aria-hidden /> СТРЕСС
                  </div>
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
              <div className="relative cursor-pointer flex flex-col items-center gap-1" onClick={() => setShowDossier(true)}>
                  <img src={session.student.avatarUrl} className="w-10 h-10 md:w-12 md:h-12 rounded-xl border border-white/10 grayscale hover:grayscale-0 transition-all shadow-lg" />
                  {isAdmin && <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-slate-950"></div>}
                  {/* Выраженность акцентуации: 1–2 зелёные, 3–4 жёлтые, 5 красная */}
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((lv) => {
                      const lit = lv <= (session.chaosDetails?.intensity ?? 1);
                      const intensity = session.chaosDetails?.intensity ?? 1;
                      const color = !lit ? 'bg-slate-600/50' : intensity <= 2 ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : intensity <= 4 ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]' : 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.8)]';
                      return <div key={lv} className={`w-1.5 h-1.5 rounded-full transition-all ${color}`} />;
                    })}
                  </div>
              </div>
              <div className="hidden sm:block">
                  <h2 className="text-sm md:text-md font-black text-white uppercase tracking-tighter italic leading-none">{session.student.name}</h2>
                  <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1 mt-1">
                      {session.chaosDetails.accentuation} <Info size={10} className="opacity-50" />
                  </div>
              </div>
          </div>
          <div className="flex gap-2">
              {/* Кнопка помощи */}
              <button 
                onClick={() => setShowHelp(true)} 
                className="p-2.5 rounded-xl transition-all bg-white/5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10"
                title="Справка по интерфейсу"
              >
                <HelpCircle size={18} />
              </button>
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
              {/* Админский тумблер: включить/выключить супервизоров (комиссию) */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setSupervisorsEnabled(prev => !prev)}
                  className={`p-2.5 rounded-xl transition-all flex items-center gap-1 ${
                    supervisorsEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                  title={supervisorsEnabled ? 'Супервизоры ВКЛ: комиссия и анализ работают' : 'Супервизоры ВЫКЛ: комиссия и анализ отключены (режим отладки)'}
                >
                  <ShieldAlert size={16} />
                  <span className="text-[9px] font-black uppercase tracking-widest">
                    {supervisorsEnabled ? 'SUP' : 'NO SUP'}
                  </span>
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
                            {msg.role === MessageRole.MODEL && msg.non_verbal && (
                                <div className={`px-4 py-3 rounded-2xl border-l-4 italic text-[10px] md:text-xs shadow-md ${getNVStyle(msg.non_verbal_valence || 0)}`}>
                                   {msg.non_verbal}
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
                              const eventReaction = msg.state?.event_reaction;
                              const extremeOutcome = msg.state?.extreme_outcome;
                              
                              return (
                                <>
                                  {/* Event Reaction — оценка реакции учителя на предыдущее событие */}
                                  {eventReaction && (
                                    <div className="w-full mb-4 p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30">
                                      <div className="flex items-center gap-3 mb-2">
                                        <Target size={16} className="text-cyan-400" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                                          РЕАКЦИЯ ОЦЕНЕНА
                                        </span>
                                      </div>
                                      <p className="text-cyan-200 text-sm">{eventReaction.evaluation}</p>
                                      <div className="flex gap-4 mt-3 text-[9px] font-black uppercase tracking-wider">
                                        <span className={eventReaction.trust_change >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                          Δ Доверие: {eventReaction.trust_change > 0 ? '+' : ''}{eventReaction.trust_change}
                                        </span>
                                        <span className={eventReaction.stress_change <= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                          Δ Стресс: {eventReaction.stress_change > 0 ? '+' : ''}{eventReaction.stress_change}
                                        </span>
                                      </div>
                                      {eventReaction.ethics_violation && (
                                        <div className="mt-2 p-2 bg-amber-500/20 rounded-lg border border-amber-500/30">
                                          <span className="text-[9px] font-black text-amber-400 uppercase">⚠️ Комиссия учтёт: </span>
                                          <span className="text-amber-300 text-xs">{eventReaction.ethics_violation}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* World Event - если есть */}
                                  {worldEvent && (
                                    <div className={`w-full mb-4 p-4 rounded-2xl border shadow-[0_0_30px_rgba(139,92,246,0.3)] ${
                                      worldEvent.requires_response 
                                        ? 'bg-amber-500/10 border-amber-500/50 animate-pulse' 
                                        : 'bg-violet-500/10 border-violet-500/30'
                                    }`}>
                                      <div className="flex items-center gap-3 mb-2">
                                        <Radio size={16} className={worldEvent.requires_response ? 'text-amber-400' : 'text-violet-400'} />
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${worldEvent.requires_response ? 'text-amber-400' : 'text-violet-400'}`}>
                                          {worldEvent.type?.toUpperCase().replace(/_/g, ' ') || 'СОБЫТИЕ'}
                                          {worldEvent.requires_response && ' — ОЖИДАЕТ РЕАКЦИИ'}
                                        </span>
                                      </div>
                                      <p className={`text-sm italic ${worldEvent.requires_response ? 'text-amber-200' : 'text-violet-200'}`}>{worldEvent.description}</p>
                                      
                                      {/* NPC диалог если есть */}
                                      {worldEvent.npc_name && worldEvent.npc_dialogue && (
                                        <div className={`mt-3 p-3 rounded-xl border ${
                                          worldEvent.requires_response 
                                            ? 'bg-amber-900/30 border-amber-500/20' 
                                            : 'bg-violet-900/30 border-violet-500/20'
                                        }`}>
                                          <div className={`text-[9px] font-black uppercase mb-1 ${worldEvent.requires_response ? 'text-amber-400' : 'text-violet-400'}`}>
                                            {worldEvent.npc_name}:
                                          </div>
                                          <p className={`text-sm ${worldEvent.requires_response ? 'text-amber-100' : 'text-violet-100'}`}>"{worldEvent.npc_dialogue}"</p>
                                        </div>
                                      )}
                                      
                                      {/* Показываем дельты только если они не нулевые */}
                                      {(worldEvent.trust_delta !== 0 || worldEvent.stress_delta !== 0) && (
                                        <div className="flex gap-4 mt-3 text-[9px] font-black uppercase tracking-wider text-violet-400/60">
                                          <span>Δ Доверие: {worldEvent.trust_delta > 0 ? '+' : ''}{worldEvent.trust_delta}</span>
                                          <span>Δ Стресс: {worldEvent.stress_delta > 0 ? '+' : ''}{worldEvent.stress_delta}</span>
                                        </div>
                                      )}
                                      
                                      {worldEvent.requires_response && (
                                        <div className="mt-3 pt-3 border-t border-amber-500/20 text-[10px] text-amber-300 font-bold">
                                          💡 Отреагируйте на это событие в своей следующей реплике
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Active NPC - присутствует в сцене */}
                                  {msg.state?.active_npc && (
                                    <div className="w-full mb-4 p-4 rounded-2xl border bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                                      <div className="flex items-center gap-3 mb-2">
                                        <User size={16} className="text-indigo-400" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                                          {msg.state.active_npc.role?.toUpperCase() || 'NPC'} — ПРИСУТСТВУЕТ
                                        </span>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <div className="text-[11px] font-bold text-indigo-300">
                                          {msg.state.active_npc.name}
                                        </div>
                                        
                                        {msg.state.active_npc.action && (
                                          <div className="text-sm italic text-indigo-200/70">
                                            {msg.state.active_npc.action}
                                          </div>
                                        )}
                                        
                                        {msg.state.active_npc.dialogue && (
                                          <div className="mt-2 p-3 rounded-xl bg-indigo-900/30 border border-indigo-500/20">
                                            <p className="text-sm text-indigo-100">"{msg.state.active_npc.dialogue}"</p>
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="mt-3 pt-3 border-t border-indigo-500/20 text-[10px] text-indigo-300 font-bold">
                                        💡 Можете обращаться к {msg.state.active_npc.name} по имени в своей реплике
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* GM Note - подсказка для админа */}
                                  {isAdmin && msg.state?.gm_note && (
                                    <div className="w-full mb-4 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30">
                                      <div className="flex items-center gap-3 mb-2">
                                        <Radio size={16} className="text-purple-400" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">
                                          GM ПОДСКАЗКА (только для админа)
                                        </span>
                                      </div>
                                      <p className="text-sm text-purple-200 italic">{msg.state.gm_note}</p>
                                    </div>
                                  )}
                                  
                                  {/* Диагностика: сработала защита от резкого обрыва */}
                                  {isAdmin && msg.state?.safeguard_applied && (
                                    <div className="w-full mb-4 p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40">
                                      <div className="flex items-center gap-3 mb-2">
                                        <AlertOctagon size={16} className="text-amber-400" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                                          ЗАЩИТА ОТ РЕЗКОГО ОБРЫВА (диагностика)
                                        </span>
                                      </div>
                                      <p className="text-xs text-amber-200/90">
                                        Предыдущее состояние: trust {msg.state.safeguard_applied.previous_trust}%, stress {msg.state.safeguard_applied.previous_stress}%. 
                                        Модель запросила trust=0, stress=100 и завершение сессии. Причина от модели: «{msg.state.safeguard_applied.model_violation_reason ?? 'не указана'}». 
                                        Сессия продолжена (trust 25%, stress 90%), чтобы дать учителю ещё один ход.
                                      </p>
                                    </div>
                                  )}
                                  
                                  {/* Extreme Outcome Warning */}
                                  {extremeOutcome && (
                                    <div className="w-full mb-4 p-4 rounded-2xl bg-red-900/50 border-2 border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.5)] animate-pulse">
                                      <div className="flex items-center gap-3 mb-2">
                                        <AlertOctagon size={20} className="text-red-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-red-400">
                                          КРИТИЧЕСКИЙ ИСХОД: {extremeOutcome.toUpperCase().replace(/_/g, ' ')}
                                        </span>
                                      </div>
                                      {/* Показываем описание исхода если есть */}
                                      {msg.state?.violation_reason && (
                                        <p className="text-red-200 text-sm mt-2 border-t border-red-500/30 pt-2">
                                          {msg.state.violation_reason}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  
                                  <div className={`p-4 md:p-6 rounded-[24px] md:rounded-[32px] rounded-tl-none text-sm font-medium border ${gradient.bg} ${gradient.border} ${gradient.text} ${gradient.glow} transition-all duration-500`}>
                                    {msg.content}
                                    {/* Индикатор состояния — виден всем; иконки для доступности (дальтонизм) */}
                                    <div className="flex gap-4 mt-3 pt-3 border-t border-white/10 text-[9px] font-black uppercase tracking-wider opacity-60">
                                      <span className="text-emerald-400 flex items-center gap-1"><Check size={10} aria-hidden /> Доверие: {Math.round(trust)}%</span>
                                      <span className="text-red-400 flex items-center gap-1"><AlertTriangle size={10} aria-hidden /> Стресс: {Math.round(stress)}%</span>
                                    </div>
                                  </div>
                                </>
                              );
                            })()}
                        </div>
                    )}
                </div>
            ))}
            {isLoading && <div className="text-blue-500 text-[9px] font-black animate-pulse flex items-center gap-2 uppercase tracking-widest"><Loader2 size={12} className="animate-spin" /> Обработка...</div>}
            
            {/* Пауза перед комиссией */}
            {awaitingContinue && (() => {
              const isTriumph = pendingTermination?.isTriumph;
              
              return (
                <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
                  <button
                    onClick={handleContinueAfterTermination}
                    className={`w-full p-6 rounded-3xl border-2 border-dashed transition-all group ${
                      isTriumph 
                        ? 'border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20' 
                        : 'border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className={`text-4xl animate-bounce ${isTriumph ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {isTriumph ? '🏆' : '⚖️'}
                      </div>
                      <p className={`text-sm font-bold uppercase tracking-wider ${isTriumph ? 'text-emerald-300' : 'text-amber-300'}`}>
                        {isTriumph ? 'Триумфальное завершение!' : 'Сессия завершена'}
                      </p>
                      <p className="text-slate-400 text-xs">
                        Нажмите, чтобы перейти к оценке комиссии
                      </p>
                      <div className={`mt-2 px-6 py-2 text-slate-900 rounded-full text-xs font-black uppercase tracking-wider group-hover:scale-105 transition-transform ${
                        isTriumph ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}>
                        Продолжить →
                      </div>
                    </div>
                  </button>
                </div>
              );
            })()}
            
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
          <div className="max-w-3xl mx-auto space-y-3">
              {/* Быстрые кнопки действий от первого лица */}
              <div className="flex flex-wrap gap-2">
                {['улыбаюсь', 'киваю', 'внимательно слушаю', 'сажусь рядом', 'делаю паузу'].map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => setInput(prev => (prev ? prev + ' ' : '') + `*${action}*`)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-medium hover:bg-white/10 hover:border-white/20 transition-all"
                  >
                    {action}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 items-center relative">
              <div className="relative w-full">
                  {showAsteriskHint && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 p-3 bg-slate-800 border border-blue-500/40 rounded-xl text-xs text-slate-200 shadow-xl z-10 animate-in fade-in slide-in-from-bottom-2">
                      Используйте <strong>*звёздочки*</strong> для действий, например: <em>*улыбаюсь*</em>
                      <button type="button" onClick={() => { setShowAsteriskHint(false); try { localStorage.setItem(ASTERISK_HINT_KEY, '1'); } catch (_) {} }} className="ml-2 text-blue-400 hover:text-blue-300 font-bold">Понятно</button>
                    </div>
                  )}
                  <textarea 
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                    onFocus={() => { if (typeof window !== 'undefined' && !localStorage.getItem(ASTERISK_HINT_KEY)) setShowAsteriskHint(true); }}
                    onBlur={() => { if (showAsteriskHint) { setShowAsteriskHint(false); try { localStorage.setItem(ASTERISK_HINT_KEY, '1'); } catch (_) {} } }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} 
                    placeholder={isListening ? 'Слушаю вас...' : "Напишите ответ или *действие*…"} 
                    className="w-full bg-slate-900 border border-white/10 rounded-[28px] p-4 pr-16 text-sm text-white outline-none resize-none h-14 md:h-16 focus:border-blue-500/40 transition-all placeholder:text-slate-600" 
                  />
                </div>
              <button 
                type="button"
                onClick={() => handleSend()} 
                disabled={!input.trim() || isLoading} 
                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-white text-black rounded-2xl disabled:opacity-20 transition-all active:scale-95 shadow-lg hover:bg-blue-500 hover:text-white"
              >
                <Send size={20} />
              </button>
              </div>
          </div>
      </footer>
      <SubscriptionModal 
        isOpen={isSubModalOpen} 
        onClose={() => setIsSubModalOpen(false)}
        onSuccess={() => window.location.reload()}
      />
      
      <HelpOverlay 
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        items={CHAT_HELP_ITEMS}
        screenName="Экран сессии"
      />
    </div>
  );
};

export default ChatInterface;

