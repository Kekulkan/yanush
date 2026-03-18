
import React, { useState } from 'react';
import { Play, Network, Activity, Terminal, Crown, Star, Info, HelpCircle, ArrowRight } from 'lucide-react';
import { SubscriptionInfo } from '../services/billingService';
import DocumentsModal from './DocumentsModal';
import { FooterLinks } from './FooterLinks';

interface Props {
  onStart: () => void;
  onOpenMuseum?: () => void;
  onOpenCommandCenter?: () => void;
  onOpenSubscription?: () => void;
  subscription?: SubscriptionInfo;
  isAdmin?: boolean;
}

const ScenarioSelector: React.FC<Props> = ({
  onStart,
  onOpenMuseum,
  onOpenCommandCenter,
  onOpenSubscription,
  subscription,
  isAdmin
}) => {
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

  return (
    <div className="min-h-[100dvh] bg-[#0A0B1A] text-white flex flex-col items-center justify-between p-6 relative overflow-y-auto custom-scroll">
      
      {/* Динамический фон */}
      <div className="absolute inset-0 opacity-20 pointer-events-none fixed">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-800 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 text-center max-w-2xl flex flex-col items-center space-y-8 mt-12 mb-20">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[9px] uppercase tracking-[0.3em] text-blue-400 font-black mb-2 animate-float">
          <Activity size={12} className="text-blue-500" /> ЯНУШ // ШКОЛЬНЫЙ ПСИХОСИМУЛЯТОР
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl sm:text-7xl md:text-9xl font-black tracking-tighter leading-none italic">
            ЯНУШ
          </h1>
        </div>
        
        <div className="space-y-4 max-w-md">
          <p className="text-lg text-slate-300 font-light leading-relaxed italic">
            Ещё не патология, но уже не норма
          </p>
        </div>

        <div className="flex flex-col w-full sm:w-auto gap-4 pt-8">
          <button
            onClick={onStart}
            className="group relative w-full sm:w-72 px-8 py-6 bg-white text-slate-950 rounded-[32px] font-black text-lg uppercase tracking-widest transition-all transform active:scale-95 shadow-[0_20px_60px_rgba(255,255,255,0.1)] hover:bg-blue-500 hover:text-white"
          >
            <span className="flex items-center justify-center gap-3">
               НАЧАТЬ ТРЕНИНГ <Play fill="currentColor" size={18} />
            </span>
          </button>

          <button
            onClick={onOpenMuseum}
            className="w-full sm:w-72 px-6 py-4 glass hover:bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-[32px] font-black text-xs uppercase tracking-widest transition-all transform active:scale-95 flex items-center justify-center gap-3"
          >
            ВЫСТАВКА АКЦЕНТУАЦИЙ <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>

      {onOpenCommandCenter && (
        <button 
          onClick={onOpenCommandCenter}
          className="w-full sm:w-72 px-6 py-4 glass hover:bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-[32px] font-black text-xs uppercase tracking-widest transition-all transform active:scale-95 flex items-center justify-center gap-3"
        >
          <Terminal size={16} /> {isAdmin ? 'КОМАНДНЫЙ ЦЕНТР' : 'УЧИТЕЛЬСКАЯ'}
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
                  <Star size={16} fill="currentColor" /> ПРЕМИУМ АКТИВЕН
                </>
              ) : (
                <>
                  <Crown size={16} /> ПОЛНЫЙ ФУНКЦИОНАЛ
                </>
              )}
            </button>
          )}
          
          {/* Кнопка помощи — заметная */}
          <button 
            onClick={() => openDoc('guide')}
            className="w-full sm:w-72 px-6 py-3 glass hover:bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-[32px] font-black text-xs uppercase tracking-widest transition-all transform active:scale-95 flex items-center justify-center gap-3"
          >
            <HelpCircle size={16} /> ИНСТРУКЦИЯ
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

      <div className="w-full mt-auto relative z-10 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0 pb-6 md:pb-0">
         <div className="flex flex-col items-center md:items-start gap-0">
           <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-6 mb-[-16px]">
              <button 
                onClick={() => openDoc('methodology')}
                className="text-[9px] text-slate-500 hover:text-blue-400 font-black uppercase tracking-[0.2em] transition-colors flex items-center gap-2"
              >
                <Info size={12} /> Методология
              </button>
              <button 
                onClick={() => openDoc('contacts')}
                className="text-[9px] text-slate-500 hover:text-slate-300 font-black uppercase tracking-[0.2em] transition-colors"
              >
                Контакты
              </button>
           </div>
           <div>
             <FooterLinks onOpenDocs={openDoc} onOpenTariffs={onOpenSubscription} />
           </div>
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

