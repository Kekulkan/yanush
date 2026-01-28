import React, { useState } from 'react';
import { X, Check, Crown, Zap, Gift, CreditCard, Sparkles } from 'lucide-react';
import { applyPromoCode, purchaseSubscription, SubscriptionTier } from '../services/billingService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SubscriptionModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [promoCode, setPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState({ text: '', isError: false });
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleApplyPromo = () => {
    if (!promoCode.trim()) return;
    const result = applyPromoCode(promoCode);
    setPromoMessage({ text: result.message, isError: !result.success });
    if (result.success) {
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    }
  };

  const handlePurchase = (months: number) => {
    setIsProcessing(true);
    // Имитация оплаты
    setTimeout(() => {
      purchaseSubscription(months);
      setIsProcessing(false);
      onSuccess();
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-4xl bg-[#0A0B1A] border border-white/10 rounded-[40px] overflow-hidden shadow-[0_0_50px_rgba(139,92,246,0.2)] flex flex-col md:flex-row">
        
        {/* Left Side: Info */}
        <div className="md:w-1/3 bg-gradient-to-b from-violet-600/20 to-indigo-900/40 p-8 border-r border-white/5 flex flex-col justify-between">
          <div>
            <div className="p-3 bg-violet-500/20 rounded-2xl w-fit mb-6">
              <Crown size={32} className="text-violet-400" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-4">ПРЕМИУМ ДОСТУП</h2>
            <ul className="space-y-4">
              {[
                'Все 11 акцентуаций',
                'Совещательная комиссия',
                'Архив всех сессий',
                'Aquarium Mode',
                'Безлимитные подсказки'
              ].map((text, i) => (
                <li key={i} className="flex items-center gap-3 text-xs text-slate-300 font-medium">
                  <div className="p-1 bg-emerald-500/20 rounded-full">
                    <Check size={10} className="text-emerald-400" />
                  </div>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="mt-8 pt-8 border-t border-white/10">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-relaxed">
              ОФОРМЛЯЯ ПОДПИСКУ, ВЫ ПОДДЕРЖИВАЕТЕ РАЗРАБОТКУ КЕРНЕЛ-БЛОКА ЯНУШ.
            </p>
          </div>
        </div>

        {/* Right Side: Options */}
        <div className="flex-1 p-8 relative">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>

          <div className="space-y-8">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">ВЫБЕРИТЕ ТАРИФ</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Monthly */}
              <button 
                onClick={() => handlePurchase(1)}
                disabled={isProcessing}
                className="group relative p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all text-left overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Zap size={64} />
                </div>
                <div className="text-xs font-black text-violet-400 uppercase mb-1">МЕСЯЦ</div>
                <div className="text-3xl font-black text-white italic">1 000 ₽</div>
                <div className="mt-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Единоразовый платёж</div>
              </button>

              {/* Yearly */}
              <button 
                onClick={() => handlePurchase(12)}
                disabled={isProcessing}
                className="group relative p-6 rounded-3xl bg-violet-600 hover:bg-violet-500 transition-all text-left overflow-hidden shadow-lg shadow-violet-600/20"
              >
                <div className="absolute -top-2 -right-2 bg-amber-400 text-black text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-tighter">
                  ВЫГОДА 25%
                </div>
                <div className="absolute top-0 right-0 p-4 opacity-20">
                  <Sparkles size={64} className="text-white" />
                </div>
                <div className="text-xs font-black text-white/60 uppercase mb-1">ГОД</div>
                <div className="text-3xl font-black text-white italic">9 000 ₽</div>
                <div className="mt-4 text-[10px] text-white/60 font-bold uppercase tracking-widest">750 ₽ в месяц</div>
              </button>
            </div>

            {/* Promo Code */}
            <div className="pt-8 border-t border-white/5">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">У МЕНЯ ЕСТЬ ПРОМОКОД</h3>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Gift size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="ENTER_PROMO_CODE"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-mono text-sm outline-none focus:border-violet-500/50 transition-colors uppercase"
                  />
                </div>
                <button 
                  onClick={handleApplyPromo}
                  className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
                >
                  АКТИВИРОВАТЬ
                </button>
              </div>
              {promoMessage.text && (
                <p className={`mt-3 text-[10px] font-bold uppercase ${promoMessage.isError ? 'text-red-400' : 'text-emerald-400'}`}>
                  {promoMessage.text}
                </p>
              )}
            </div>

            {/* Security Note */}
            <div className="flex items-center gap-3 p-4 bg-slate-900/50 rounded-2xl border border-white/5">
              <CreditCard size={20} className="text-slate-500" />
              <p className="text-[9px] text-slate-500 leading-relaxed font-medium">
                БЕЗОПАСНАЯ ОПЛАТА ЧЕРЕЗ КРИПТОГРАФИЧЕСКИЙ ШЛЮЗ. ВАШИ ДАННЫЕ ЗАЩИЩЕНЫ ПРОТОКОЛОМ KERNERL_SECURE_v4.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[2100]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-violet-400 font-black uppercase tracking-[0.4em] text-[10px]">ОБРАБОТКА ТРАНЗАКЦИИ...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionModal;
