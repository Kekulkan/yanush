
import React, { useEffect, useState } from 'react';
import { Play, RotateCcw, Network, Activity, Terminal, Crown, Star, Info, HelpCircle } from 'lucide-react';
import { getSessionBackup } from '../services/storageService';
import { SubscriptionInfo } from '../services/billingService';
import DocumentsModal from './DocumentsModal';

interface Props {
  onStart: () => void;
  onResume?: () => void;
  onOpenCommandCenter?: () => void;
  onOpenSubscription?: () => void;
  subscription?: SubscriptionInfo;
}

const ScenarioSelector: React.FC<Props> = ({ 
  onStart, 
  onResume, 
  onOpenCommandCenter, 
  onOpenSubscription,
  subscription 
}) => {
  const [hasBackup, setHasBackup] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [initialDocId, setInitialDocId] = useState('methodology');
  
  const env: any = (import.meta as any).env || {};
  const proxyUrl = env.VITE_REMOTE_PROXY_URL;
  const networkMode = proxyUrl ? 'Защищенный узел' : 'Прямое подключение';

  const isPremium = subscription?.tier === 'premium';

  const openDoc = (id: string) => {
    setInitialDocId(id);
    setIsDocModalOpen(true);
  };

  useEffect(() => {
    const backup = getSessionBackup();
    if (backup && backup.messages.length > 0) {
      setHasBackup(true);
    }
  }, []);

  return (
    <div className="h-[100dvh] bg-[#0A0B1A] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Динамический фон */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-800 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 text-center max-w-2xl flex flex-col items-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[9px] uppercase tracking-[0.3em] text-blue-400 font-black mb-2 animate-float">
          <Activity size={12} className="text-blue-500" /> ЯНУШ // ШКОЛЬНЫЙ ПСИХОСИМУЛЯТОР
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl sm:text-7xl md:text-9xl font-black tracking-tighter leading-none italic">
            ЯНУШ
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-black uppercase tracking-[0.6em] opacity-80">
            версия 2.5.0-stable
          </p>
        </div>
        
        <div className="space-y-4 max-w-md">
          <p className="text-lg text-slate-300 font-light leading-relaxed italic">
            «Ещё не патология, но уже не норма»
          </p>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
            Выставка акцентуаций им. А. Личко
          </p>
        </div>

        <div className="flex flex-col w-full sm:w-auto gap-4 pt-8">
          {hasBackup && onResume && (
             <button 
               onClick={onResume}
               className="w-full sm:w-72 px-8 py-5 glass hover:bg-white/10 text-emerald-400 rounded-[32px] font-black text-sm uppercase tracking-widest transition-all transform active:scale-95 flex items-center justify-center gap-3"
             >
               <RotateCcw size={18} /> ПРОДОЛЖИТЬ СЕАНС
             </button>
          )}

          <button 
            onClick={onStart}
            className="group relative w-full sm:w-72 px-8 py-6 bg-white text-slate-950 rounded-[32px] font-black text-lg uppercase tracking-widest transition-all transform active:scale-95 shadow-[0_20px_60px_rgba(255,255,255,0.1)] hover:bg-blue-500 hover:text-white"
          >
            <span className="flex items-center justify-center gap-3">
               {hasBackup ? 'НОВЫЙ СЕАНС' : 'НАЧАТЬ ТРЕНИНГ'} <Play fill="currentColor" size={18} />
            </span>
          </button>

      {onOpenCommandCenter && (
        <button 
          onClick={onOpenCommandCenter}
          className="w-full sm:w-72 px-6 py-4 glass hover:bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-[32px] font-black text-xs uppercase tracking-widest transition-all transform active:scale-95 flex items-center justify-center gap-3"
        >
          <Terminal size={16} /> УЧИТЕЛЬСКАЯ
        </button>
      )}

          {onOpenSubscription && (
            <button 
              onClick={onOpenSubscription}
              className={`w-full sm:w-72 px-6 py-4 rounded-[32px] font-black text-xs uppercase tracking-widest transition-all transform active:scale-95 flex items-center justify-center gap-3 ${
                isPremium 
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_20px_rgba(251,191,36,0.1)]' 
                  : 'bg-violet-600/20 text-violet-400 border border-violet-500/30 hover:bg-violet-600/30'
              }`}
            >
              {isPremium ? (
                <>
                  <Star size={16} fill="currentColor" /> PREMIUM АКТИВЕН
                </>
              ) : (
                <>
                  <Crown size={16} /> КУПИТЬ PREMIUM
                </>
              )}
            </button>
          )}
          
          {/* Кнопка помощи — заметная */}
          <button 
            onClick={() => openDoc('guide')}
            className="w-full sm:w-72 px-6 py-3 glass hover:bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-[32px] font-black text-xs uppercase tracking-widest transition-all transform active:scale-95 flex items-center justify-center gap-3"
          >
            <HelpCircle size={16} /> КАК ПОЛЬЗОВАТЬСЯ?
          </button>
        </div>
      </div>

      {/* Цитата Г.К. */}
      <div className="absolute top-12 right-12 text-right opacity-20 pointer-events-none hidden md:block">
        <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed text-slate-400">
          «Раньше было сложно,<br/>дальше будет трудно»<br/>
          <span className="text-blue-500">— Г.К.</span>
        </p>
      </div>

      <div className="absolute bottom-6 w-full px-12 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0">
         <div className="flex flex-wrap justify-center gap-6">
            <button 
              onClick={() => openDoc('methodology')}
              className="text-[9px] text-slate-500 hover:text-blue-400 font-black uppercase tracking-[0.2em] transition-colors flex items-center gap-2"
            >
              <Info size={12} /> Методология
            </button>
            <button 
              onClick={() => openDoc('terms')}
              className="text-[9px] text-slate-500 hover:text-slate-300 font-black uppercase tracking-[0.2em] transition-colors"
            >
              Оферта
            </button>
            <button 
              onClick={() => openDoc('contacts')}
              className="text-[9px] text-slate-500 hover:text-slate-300 font-black uppercase tracking-[0.2em] transition-colors"
            >
              Контакты
            </button>
         </div>

         <div className="flex flex-col items-center md:items-end gap-3">
            <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-900/50 rounded-full border border-slate-800">
               <Network size={10} className={proxyUrl ? 'text-emerald-500' : 'text-amber-500'} /> 
               <span className="text-slate-600 text-[8px] font-black uppercase tracking-[0.2em]">{networkMode}</span>
            </div>
            <span className="text-slate-600 text-[8px] font-black uppercase tracking-[0.4em] opacity-40 italic">
              Только для авторизованного персонала
            </span>
         </div>
      </div>

      <DocumentsModal 
        isOpen={isDocModalOpen} 
        onClose={() => setIsDocModalOpen(false)} 
        initialDocId={initialDocId}
      />
    </div>
  );
};

export default ScenarioSelector;
