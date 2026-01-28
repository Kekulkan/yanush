import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, Play, Pause, SkipForward, 
  AlertTriangle, CheckCircle, XCircle,
  ChevronRight, Lightbulb, Target, Sparkles,
  Eye, MessageCircle, HelpCircle, Award
} from 'lucide-react';
import { DemoScenario, DemoPhase, DemoDialogueLine, DemoChoice } from '../types';

interface Props {
  scenario: DemoScenario;
  onBack: () => void;
  onStartFullSession?: () => void;
}

const DemoSession: React.FC<Props> = ({ scenario, onBack, onStartFullSession }) => {
  const [phase, setPhase] = useState<DemoPhase>('intro');
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCommentary, setShowCommentary] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<DemoChoice | null>(null);
  const [trust, setTrust] = useState(50);
  const [stress, setStress] = useState(30);
  const [isDialogueFinished, setIsDialogueFinished] = useState(false);
  
  const dialogueRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Автопроигрывание диалога
  useEffect(() => {
    if (phase === 'observation' && isPlaying && dialogueIndex < scenario.observationDialogue.length) {
      const currentLine = scenario.observationDialogue[dialogueIndex];
      const delay = currentLine.delay || 2000;
      
      timerRef.current = setTimeout(() => {
        // Применяем изменения trust/stress
        if (currentLine.trustDelta) setTrust(t => Math.max(0, Math.min(100, t + currentLine.trustDelta!)));
        if (currentLine.stressDelta) setStress(s => Math.max(0, Math.min(100, s + currentLine.stressDelta!)));
        
        // Показываем комментарий если есть
        if (currentLine.commentary) {
          setShowCommentary(true);
          setIsPlaying(false);
        } else {
          setDialogueIndex(i => i + 1);
        }
      }, delay);
    }
    
    // Конец диалога — ждем нажатия кнопки
    if (phase === 'observation' && dialogueIndex >= scenario.observationDialogue.length) {
      setIsPlaying(false);
      setIsDialogueFinished(true);
    }
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, isPlaying, dialogueIndex, scenario]);

  // Автоскролл
  useEffect(() => {
    if (dialogueRef.current) {
      dialogueRef.current.scrollTop = dialogueRef.current.scrollHeight;
    }
  }, [dialogueIndex]);

  const handleContinueAfterCommentary = useCallback(() => {
    setShowCommentary(false);
    setDialogueIndex(i => i + 1);
    setIsPlaying(true);
  }, []);

  const handleChoiceSelect = (choice: DemoChoice) => {
    setSelectedChoice(choice);
    setTrust(t => Math.max(0, Math.min(100, t + choice.trustDelta)));
    setStress(s => Math.max(0, Math.min(100, s + choice.stressDelta)));
    setPhase('result');
  };

  const renderIntro = () => (
    <div className="flex-1 overflow-y-auto p-8 space-y-8">
      {/* Заголовок */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full">
          <Eye size={16} className="text-blue-400" />
          <span className="text-xs font-mono text-blue-400 uppercase tracking-wider">Демо-режим</span>
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tight">
          {scenario.accentuationName}
        </h1>
      </div>

      {/* Слово куратора */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
            <MessageCircle size={20} className="text-amber-400" />
          </div>
          <div>
            <div className="text-xs font-mono text-amber-400 uppercase tracking-wider">Куратор экспозиции</div>
            <div className="text-sm text-slate-400">Вступительное слово</div>
          </div>
        </div>
        <p className="text-slate-300 leading-relaxed whitespace-pre-line">
          {scenario.intro.curatorText}
        </p>
      </div>

      {/* Ключевые маркеры */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-green-400">
            <Target size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Ключевые маркеры</span>
          </div>
          <ul className="space-y-2">
            {scenario.intro.keyMarkers.map((marker, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                <ChevronRight size={14} className="text-green-500 mt-0.5 shrink-0" />
                {marker}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Триггеры</span>
          </div>
          <ul className="space-y-2">
            {scenario.intro.triggers.map((trigger, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                <ChevronRight size={14} className="text-amber-500 mt-0.5 shrink-0" />
                {trigger}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Чего избегать */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-red-400">
          <XCircle size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">Чего избегать</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {scenario.intro.avoid.map((item, i) => (
            <span key={i} className="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-full text-xs text-red-300">
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Кнопка начала */}
      <button
        onClick={() => { setPhase('observation'); setIsPlaying(true); }}
        className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-wider flex items-center justify-center gap-3 transition-all"
      >
        <Play size={20} />
        Начать наблюдение
      </button>
    </div>
  );

  const renderObservation = () => {
    const visibleDialogue = scenario.observationDialogue.slice(0, dialogueIndex + 1);
    
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Индикаторы */}
        <div className="p-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Доверие</span>
              <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${trust}%` }}
                />
              </div>
              <span className="text-xs font-mono text-green-400">{trust}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Стресс</span>
              <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all duration-500"
                  style={{ width: `${stress}%` }}
                />
              </div>
              <span className="text-xs font-mono text-red-400">{stress}%</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
              disabled={showCommentary}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button
              onClick={() => setDialogueIndex(scenario.observationDialogue.length)}
              className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors text-slate-400"
            >
              <SkipForward size={18} />
            </button>
          </div>
        </div>

        {/* Диалог */}
        <div ref={dialogueRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {visibleDialogue.map((line, i) => (
            <div key={i} className={`animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              {line.speaker === 'system' ? (
                <div className="text-center py-3">
                  <span className="px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-full text-xs text-slate-400 italic">
                    {line.text}
                  </span>
                </div>
              ) : line.speaker === 'curator' ? (
                <div className="mx-auto max-w-xl bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Lightbulb size={18} className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-200">{line.text}</p>
                  </div>
                </div>
              ) : (
                <div className={`flex ${line.speaker === 'teacher' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] ${line.speaker === 'teacher' ? 'order-2' : ''}`}>
                    <div className={`px-5 py-3 rounded-2xl ${
                      line.speaker === 'teacher' 
                        ? line.isError 
                          ? 'bg-red-500/20 border border-red-500/40 text-red-100'
                          : 'bg-blue-600 text-white'
                        : 'bg-slate-800 border border-slate-700 text-slate-200'
                    }`}>
                      <p className="text-sm">{line.text}</p>
                      {line.emotion && (
                        <p className="text-[10px] mt-2 opacity-60 italic">[ {line.emotion} ]</p>
                      )}
                    </div>
                    <div className={`text-[10px] mt-1 text-slate-600 ${line.speaker === 'teacher' ? 'text-right' : ''}`}>
                      {line.speaker === 'teacher' ? 'Учитель' : 'Подросток'}
                      {line.trustDelta && (
                        <span className={line.trustDelta > 0 ? 'text-green-500 ml-2' : 'text-red-500 ml-2'}>
                          {line.trustDelta > 0 ? '+' : ''}{line.trustDelta} доверие
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Кнопка продолжения после диалога */}
        {isDialogueFinished && (
          <div className="p-6 bg-slate-900 border-t border-slate-700/50 animate-in slide-in-from-bottom-4 duration-500">
            <button
              onClick={() => setPhase('choice')}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase tracking-wider flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-500/20"
            >
              Перейти к выбору
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Комментарий куратора (оверлей) */}
        {showCommentary && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 z-20">
            <div className="max-w-lg bg-slate-900 border border-amber-500/30 rounded-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <Lightbulb size={20} className="text-amber-400" />
                </div>
                <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">Комментарий куратора</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                {scenario.observationDialogue[dialogueIndex]?.commentary}
              </p>
              <button
                onClick={handleContinueAfterCommentary}
                className="w-full py-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl font-bold uppercase text-xs tracking-wider transition-all"
              >
                Продолжить наблюдение
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderChoice = () => (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Ситуация */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-blue-400">
          <HelpCircle size={18} />
          <span className="text-xs font-bold uppercase tracking-wider">А как бы вы поступили?</span>
        </div>
        <p className="text-slate-300">{scenario.choicePoint.situation}</p>
        {scenario.choicePoint.curatorHint && (
          <div className="bg-amber-500/10 border-l-2 border-amber-500 pl-4 py-2">
            <p className="text-sm text-amber-200 italic">{scenario.choicePoint.curatorHint}</p>
          </div>
        )}
      </div>

      {/* Индикаторы */}
      <div className="flex items-center justify-center gap-8">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-500">Доверие:</span>
          <span className="text-lg font-bold text-green-400">{trust}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-500">Стресс:</span>
          <span className="text-lg font-bold text-red-400">{stress}%</span>
        </div>
      </div>

      {/* Варианты */}
      <div className="space-y-4">
        {scenario.choicePoint.choices.map((choice) => (
          <button
            key={choice.id}
            onClick={() => handleChoiceSelect(choice)}
            className="w-full text-left p-5 bg-slate-900/50 border border-slate-700/50 rounded-xl hover:border-blue-500/50 hover:bg-slate-800/50 transition-all group"
          >
            <p className="text-slate-200 group-hover:text-white transition-colors">
              {choice.text}
            </p>
          </button>
        ))}
      </div>
    </div>
  );

  const renderResult = () => {
    if (!selectedChoice) return null;
    
    const qualityConfig = {
      good: { color: 'green', icon: CheckCircle, label: 'Эффективный подход' },
      neutral: { color: 'amber', icon: AlertTriangle, label: 'Нейтральный подход' },
      bad: { color: 'red', icon: XCircle, label: 'Неэффективный подход' }
    };
    
    const config = qualityConfig[selectedChoice.quality];
    
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Ваш выбор */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5">
          <div className="text-[10px] font-mono text-blue-400 uppercase tracking-wider mb-2">Ваш выбор</div>
          <p className="text-slate-200">{selectedChoice.text}</p>
        </div>

        {/* Реакция подростка */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-3">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Реакция подростка</div>
          <p className="text-slate-300 italic">{selectedChoice.studentReaction}</p>
        </div>

        {/* Оценка */}
        <div className={`bg-${config.color}-500/10 border border-${config.color}-500/30 rounded-2xl p-6 space-y-4`}
             style={{ 
               backgroundColor: `rgba(${config.color === 'green' ? '34, 197, 94' : config.color === 'amber' ? '245, 158, 11' : '239, 68, 68'}, 0.1)`,
               borderColor: `rgba(${config.color === 'green' ? '34, 197, 94' : config.color === 'amber' ? '245, 158, 11' : '239, 68, 68'}, 0.3)`
             }}>
          <div className="flex items-center gap-3">
            <config.icon size={24} className={`text-${config.color}-400`}
                         style={{ color: config.color === 'green' ? '#4ade80' : config.color === 'amber' ? '#fbbf24' : '#f87171' }} />
            <span className="text-lg font-bold"
                  style={{ color: config.color === 'green' ? '#4ade80' : config.color === 'amber' ? '#fbbf24' : '#f87171' }}>
              {config.label}
            </span>
          </div>
          <p className="text-slate-300 leading-relaxed">{selectedChoice.explanation}</p>
          
          {/* Изменения */}
          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Доверие:</span>
              <span className={selectedChoice.trustDelta >= 0 ? 'text-green-400' : 'text-red-400'}>
                {selectedChoice.trustDelta >= 0 ? '+' : ''}{selectedChoice.trustDelta}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Стресс:</span>
              <span className={selectedChoice.stressDelta <= 0 ? 'text-green-400' : 'text-red-400'}>
                {selectedChoice.stressDelta >= 0 ? '+' : ''}{selectedChoice.stressDelta}
              </span>
            </div>
          </div>
        </div>

        {/* Переход к итогам */}
        <button
          onClick={() => setPhase('summary')}
          className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2"
        >
          Перейти к итогам
          <ChevronRight size={18} />
        </button>
      </div>
    );
  };

  const renderSummary = () => (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Заголовок */}
      <div className="text-center space-y-2">
        <Award size={40} className="mx-auto text-amber-400" />
        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Итоги наблюдения</h2>
        <p className="text-slate-500 text-sm">{scenario.accentuationName}</p>
      </div>

      {/* Главный инсайт */}
      <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-2xl p-6 text-center">
        <Sparkles size={24} className="mx-auto text-blue-400 mb-3" />
        <p className="text-lg text-slate-200 italic leading-relaxed">
          «{scenario.summary.keyInsight}»
        </p>
      </div>

      {/* Что работает / Чего избегать */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Что работает</span>
          </div>
          <ul className="space-y-2">
            {scenario.summary.whatWorks.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                <ChevronRight size={14} className="text-green-500 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-red-400">
            <XCircle size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Чего избегать</span>
          </div>
          <ul className="space-y-2">
            {scenario.summary.whatToAvoid.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                <ChevronRight size={14} className="text-red-500 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Кнопки */}
      <div className="space-y-3 pt-4">
        {onStartFullSession && (
          <button
            onClick={onStartFullSession}
            className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-wider flex items-center justify-center gap-3 transition-all"
          >
            <Sparkles size={20} />
            Попробовать полноценный сеанс
          </button>
        )}
        <button
          onClick={onBack}
          className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold uppercase text-xs tracking-wider transition-all"
        >
          Вернуться к экспозиции
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] bg-[#0A0B1A] flex flex-col font-sans text-slate-300 relative">
      {/* Фон */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.08),transparent)] pointer-events-none" />

      {/* Шапка */}
      <header className="p-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-950/80 backdrop-blur-xl relative z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 text-slate-500 hover:text-white transition-colors bg-slate-800/50 rounded-xl border border-slate-700/50"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-black text-white uppercase tracking-tight">
              ДЕМО // <span className="text-blue-400">{scenario.accentuationName}</span>
            </h1>
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              {phase === 'intro' && 'Введение'}
              {phase === 'observation' && 'Наблюдение'}
              {phase === 'choice' && 'Интерактивная точка'}
              {phase === 'result' && 'Результат выбора'}
              {phase === 'summary' && 'Итоги'}
            </div>
          </div>
        </div>

        {/* Прогресс */}
        <div className="flex items-center gap-1">
          {(['intro', 'observation', 'choice', 'result', 'summary'] as DemoPhase[]).map((p, i) => (
            <div 
              key={p}
              className={`w-8 h-1 rounded-full transition-colors ${
                i <= ['intro', 'observation', 'choice', 'result', 'summary'].indexOf(phase)
                  ? 'bg-blue-500'
                  : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
      </header>

      {/* Контент */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {phase === 'intro' && renderIntro()}
        {phase === 'observation' && renderObservation()}
        {phase === 'choice' && renderChoice()}
        {phase === 'result' && renderResult()}
        {phase === 'summary' && renderSummary()}
      </div>
    </div>
  );
};

export default DemoSession;
