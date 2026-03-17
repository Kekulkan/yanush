import React, { useState } from 'react';
import { X, Check, Crown, Zap, Gift, CreditCard, Sparkles, HelpCircle, ArrowRight, Activity, Lock, AlertCircle, ShieldCheck } from 'lucide-react';
import { applyPromoCode, purchaseSubscription } from '../services/billingService';
import DocumentsModal from './DocumentsModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SubscriptionModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docModalTab, setDocModalTab] = useState('terms');
  const [promoCode, setPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState({ text: '', isError: false });

  if (!isOpen) return null;

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setIsProcessing(true);
    const result = await applyPromoCode(promoCode);
    setIsProcessing(false);
    setPromoMessage({ text: result.message, isError: !result.success });
    if (result.success) {
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    }
  };

  const handlePurchase = async (sessions: number, amount: number) => {
    setIsProcessing(true);
    try {
      const { createYookassaPayment } = await import('../services/billingService');
      const confirmationUrl = await createYookassaPayment(sessions, amount);
      if (confirmationUrl) {
        window.location.href = confirmationUrl;
      } else {
        alert('Ошибка при создании платежа. Пожалуйста, попробуйте позже.');
        setIsProcessing(false);
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка при создании платежа. Пожалуйста, попробуйте позже.');
      setIsProcessing(false);
    }
  };

  const openDoc = (e: React.MouseEvent, tab: string) => {
    e.preventDefault();
    setDocModalTab(tab);
    setIsDocModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-5xl h-[90dvh] bg-[#0A0B1A] border border-white/10 rounded-[40px] overflow-hidden shadow-[0_0_50px_rgba(139,92,246,0.2)] flex flex-col relative">
        
        {/* Header (Sticky) */}
        <div className="shrink-0 p-6 flex justify-between items-center border-b border-white/10 bg-[#0A0B1A]/90 backdrop-blur-sm z-10">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">ТАРИФЫ</h2>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">
              Настоящая страница является неотъемлемой частью <a href="#" onClick={(e) => openDoc(e, 'terms')} className="text-blue-400 hover:underline cursor-pointer">Лицензионного договора-оферты</a>.
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-xl">
            <X size={24} />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scroll relative">
          <p className="text-slate-300 text-sm max-w-3xl leading-relaxed mb-10">
            Все цены указаны в рублях Российской Федерации. НДС не облагается (Оператор применяет специальный налоговый режим «Налог на профессиональный доход»).<br/><br/>
            Выберите пакет сессий и получите полный доступ к сложным сценариям, скрытым контекстам и глубокой аналитике тренажера ЯНУШ.
          </p>

          <div className="space-y-12">
            
            {/* БЛОК 1. Базовый доступ */}
            <section>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-6 flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-xl"><Activity size={20} className="text-blue-400" /></div>
                БЛОК 1. Базовый доступ (Первое знакомство)
              </h3>
              <div className="bg-slate-900/50 border border-white/5 rounded-[32px] p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1 space-y-4">
                  <div className="text-3xl font-black text-white italic">Бесплатно (0 ₽)</div>
                  <p className="text-slate-400 text-sm">Отличный старт, чтобы понять механику работы симулятора и оценить свои силы.</p>
                  <ul className="space-y-2 mt-4">
                    <li className="flex items-start gap-3 text-sm text-slate-300"><Check size={16} className="text-emerald-500 shrink-0 mt-0.5" /> <span>Включено при регистрации: 3 приветственные сессии.</span></li>
                    <li className="flex items-start gap-3 text-sm text-slate-300"><Check size={16} className="text-emerald-500 shrink-0 mt-0.5" /> <span>Сценарии: Базовые инциденты (отказ отвечать, опоздание, легкая грубость).</span></li>
                    <li className="flex items-start gap-3 text-sm text-slate-300"><Check size={16} className="text-emerald-500 shrink-0 mt-0.5" /> <span>Психотипы: Слабо выраженные акцентуации.</span></li>
                    <li className="flex items-start gap-3 text-sm text-slate-300"><Check size={16} className="text-emerald-500 shrink-0 mt-0.5" /> <span>Итог сессии: Стандартный подсчет уровня Доверия и Стресса + краткий статус.</span></li>
                  </ul>
                </div>
                <div className="w-full md:w-64">
                  <button onClick={onClose} className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all">
                    Попробовать бесплатно
                  </button>
                </div>
              </div>
            </section>

            {/* БЛОК 2. Premium-пакеты */}
            <section>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-3">
                <div className="p-2 bg-violet-500/20 rounded-xl"><Crown size={20} className="text-violet-400" /></div>
                БЛОК 2. Премиум-пакеты (Профессиональная отработка)
              </h3>
              <p className="text-slate-400 text-sm mb-6 max-w-3xl leading-relaxed">
                У каждого ученика появляются контекстные обстоятельства, о которых может быть или не быть известно заранее. Выраженность акцентуации может оказаться на грани патологии. Результат сессии оценивает комиссия из 4-х экспертов, кроме того, подаёт голос <a href="#" onClick={(e) => openDoc(e, 'methodology')} className="text-blue-400 hover:underline cursor-pointer">совещательная комиссия</a>.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Пакет Старт */}
                <div className="bg-slate-900/50 border border-white/5 rounded-[32px] p-6 flex flex-col hover:border-violet-500/30 transition-colors">
                  <h4 className="text-lg font-black text-white uppercase">Пакет «Старт»</h4>
                  <p className="text-xs text-slate-500 mt-2 mb-6 min-h-[40px] leading-relaxed">Для тех, кто хочет протестировать сложные кризисы один на один.</p>
                  <div className="text-4xl font-black text-violet-400 italic mb-2">5 сессий</div>
                  <div className="text-xl font-bold text-white mb-2">1 000 ₽</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-6">200 ₽ за сессию</div>
                  <button onClick={() => handlePurchase(5, 1000)} className="mt-auto w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all">
                    Купить за 1 000 ₽
                  </button>
                </div>

                {/* Пакет Профи */}
                <div className="bg-violet-900/40 border border-violet-500/50 rounded-[32px] p-6 flex flex-col relative transform md:scale-105 shadow-[0_0_30px_rgba(139,92,246,0.15)] z-10">
                  <div className="absolute -top-3 -right-2 bg-amber-400 text-amber-950 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg flex items-center gap-1">
                    <Sparkles size={12} /> Хит
                  </div>
                  <h4 className="text-lg font-black text-white uppercase">Пакет «Профи»</h4>
                  <p className="text-xs text-violet-200/60 mt-2 mb-6 min-h-[40px] leading-relaxed">Идеально для регулярных тренировок и глубокого анализа своих ошибок.</p>
                  <div className="text-4xl font-black text-white italic mb-2">10 сессий</div>
                  <div className="text-xl font-bold text-white mb-2">1 600 ₽</div>
                  <div className="text-[10px] text-emerald-400 uppercase tracking-widest mb-6 font-bold">160 ₽ за сессию — Выгода 20%</div>
                  <button onClick={() => handlePurchase(10, 1600)} className="mt-auto w-full py-4 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-violet-600/20">
                    Купить за 1 600 ₽
                  </button>
                </div>

                {/* Пакет Мастер */}
                <div className="bg-slate-900/50 border border-white/5 rounded-[32px] p-6 flex flex-col hover:border-violet-500/30 transition-colors">
                  <h4 className="text-lg font-black text-white uppercase">Пакет «Мастер»</h4>
                  <p className="text-xs text-slate-500 mt-2 mb-6 min-h-[40px] leading-relaxed">Запас сессий для уверенной работы.</p>
                  <div className="text-4xl font-black text-violet-400 italic mb-2">20 сессий</div>
                  <div className="text-xl font-bold text-white mb-2">2 800 ₽</div>
                  <div className="text-[10px] text-emerald-400 uppercase tracking-widest mb-6 font-bold">140 ₽ за сессию — Выгода 30%</div>
                  <button onClick={() => handlePurchase(20, 2800)} className="mt-auto w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all">
                    Купить за 2 800 ₽
                  </button>
                </div>
              </div>
              <div className="flex items-start md:items-center gap-3 p-4 bg-slate-800/30 rounded-2xl border border-white/5 mt-6">
                <CreditCard size={20} className="text-slate-400 shrink-0" />
                <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-widest">
                  Безопасная оплата картой любого банка РФ. НДС не облагается (НПД). После оплаты на ваш email придёт электронный кассовый чек. Нажимая кнопку покупки, вы подтверждаете согласие с условиями <a href="#" onClick={(e) => openDoc(e, 'terms')} className="text-blue-400 hover:underline cursor-pointer">Оферты</a>.
                </p>
              </div>

              {/* Promo Code */}
              <div className="pt-8 mt-8 border-t border-white/5">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">У МЕНЯ ЕСТЬ ПРОМОКОД</h3>
                <div className="flex flex-col md:flex-row gap-2 max-w-xl">
                  <div className="relative flex-1">
                    <Gift size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="ВВЕДИТЕ ПРОМОКОД"
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
            </section>

            {/* БЛОК 3. Что открывается в Premium-доступе */}
            <section>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-6 flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-xl"><Sparkles size={20} className="text-emerald-400" /></div>
                БЛОК 3. Что открывается в Премиум-доступе?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/50 p-6 rounded-[24px] border border-white/5">
                  <div className="flex items-center gap-2 mb-3 text-rose-400">
                    <AlertCircle size={18} />
                    <h4 className="font-bold uppercase text-sm">«Темные» психотипы</h4>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Вам станут попадаться ученики с шизоидной, эпилептоидной и истероидной акцентуациями на максимальной (5-й) стадии интенсивности. Один неверный шаг — и ученик замкнется, сбежит с урока или проявит открытую агрессию.
                  </p>
                </div>
                <div className="bg-slate-900/50 p-6 rounded-[24px] border border-white/5">
                  <div className="flex items-center gap-2 mb-3 text-amber-400">
                    <ShieldCheck size={18} />
                    <h4 className="font-bold uppercase text-sm">Скрытые контексты</h4>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    У каждого кризиса появится «второе дно». Драка на уроке может оказаться следствием долгого кибербуллинга, а грубость — защитной реакцией от проблем дома. Ваша задача — докопаться до истины, не разрушив доверие.
                  </p>
                </div>
                <div className="bg-slate-900/50 p-6 rounded-[24px] border border-white/5">
                  <div className="flex items-center gap-2 mb-3 text-blue-400">
                    <Check size={18} />
                    <h4 className="font-bold uppercase text-sm">Развернутый вердикт</h4>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Сразу после завершения Премиум-сессии весь ваш лог отправится на анализ. Вы получите детальный разбор ваших реплик от лица четырёх экспертов: Психолога, Опытного педагога, Завуча и Юриста.
                  </p>
                </div>
              </div>
            </section>

            {/* БЛОК 4. FAQ */}
            <section>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-6 flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded-xl"><HelpCircle size={20} className="text-slate-300" /></div>
                БЛОК 4. Частые ответы
              </h3>
              <div className="space-y-4">
                <div className="bg-slate-900/30 p-6 rounded-2xl border border-white/5">
                  <h4 className="text-white font-bold mb-2">Что такое «одна сессия»?</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">Сессия — это одна полноценная симуляция диалога с виртуальным учеником. Она начинается в момент генерации уникального сценария и заканчивается логическим финалом (успешным разрешением кризиса, экстремальным исходом или вашим добровольным выходом из диалога).</p>
                </div>
                <div className="bg-slate-900/30 p-6 rounded-2xl border border-white/5">
                  <h4 className="text-white font-bold mb-2">У сессий есть срок годности? Они сгорят в конце месяца?</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">Никаких подписок и абонентских плат. Купленные сессии действительны 12 месяцев с момента зачисления на баланс. За 14 дней до истечения срока мы пришлём напоминание на ваш email. Тренируйтесь в своём темпе.</p>
                </div>
                <div className="bg-slate-900/30 p-6 rounded-2xl border border-white/5">
                  <h4 className="text-white font-bold mb-2">А если система зависнет или отключится интернет? Я потеряю сессию?</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">Мы понимаем, что техника иногда подводит. Если сессия прервалась из-за фатальной системной ошибки (сбоя на сервере), просто напишите нам в поддержку — мы проверим логи и бесплатно вернем сгоревшую сессию на ваш баланс.</p>
                </div>
                <div className="bg-slate-900/30 p-6 rounded-2xl border border-white/5">
                  <h4 className="text-white font-bold mb-2">Может ли мою тренировку оплатить школа (юрлицо)?</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">Да, мы работаем с образовательными организациями. Напишите на support@yanush-sim.ru — мы выставим счёт на оплату и по факту поступления средств предоставим электронный чек (закрывающий документ плательщика НПД).</p>
                </div>
                <div className="bg-slate-900/30 p-6 rounded-2xl border border-white/5">
                  <h4 className="text-white font-bold mb-2">Могу ли я вернуть деньги?</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">Тренажёр является цифровым продуктом (программой для ЭВМ). Возврат средств за использованные сессии не производится. Если вы решили прекратить использование, мы вернём стоимость неиспользованных сессий за вычетом комиссий платёжных систем. Подробности — в <a href="#" onClick={(e) => openDoc(e, 'terms')} className="text-blue-400 hover:underline cursor-pointer">разделе 7.5 Оферты</a>.</p>
                </div>
              </div>
            </section>

            {/* БЛОК 5. Подвал (Футер) */}
            <section className="pt-8 border-t border-white/5 pb-4">
              <p className="text-[10px] text-slate-600 leading-relaxed uppercase tracking-widest text-center max-w-4xl mx-auto font-medium">
                Нажимая кнопку покупки, вы подтверждаете свое согласие с условиями <a href="#" onClick={(e) => openDoc(e, 'terms')} className="text-blue-400 hover:underline cursor-pointer">Лицензионного договора-оферты</a> и <a href="#" onClick={(e) => openDoc(e, 'privacy')} className="text-blue-400 hover:underline cursor-pointer">Политикой конфиденциальности</a>. Тренажер предназначен исключительно для пользователей старше 18 лет. Симуляции носят экспериментально-учебный характер. Все совпадения с реальными людьми случайны. При возникновении тяжелых эмоциональных переживаний рекомендуем обратиться на бесплатную линию Телефона доверия: 8-800-2000-122.
              </p>
            </section>
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

      {/* Документы */}
      <DocumentsModal 
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        initialDocId={docModalTab}
      />
    </div>
  );
};

export default SubscriptionModal;
