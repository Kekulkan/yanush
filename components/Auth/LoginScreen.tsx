
import React, { useState } from 'react';
import {
  Mail, Lock, ArrowRight, Fingerprint, Activity,
  UserPlus, LogIn, ChevronLeft, Loader2, BookOpen
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import { saveSubscriptionInfo } from '../../services/billingService';
import DocumentsModal from '../DocumentsModal';
import { FooterLinks } from '../FooterLinks';

interface Props {
  onLogin: (email: string, role?: string) => void;
  onEnterMuseum: () => void;
  onOpenTariffs?: () => void;
}

type Mode = 'welcome' | 'login' | 'register' | 'admin' | 'forgot-password' | 'reset-password';

const LoginScreen: React.FC<Props> = ({ onLogin, onEnterMuseum, onOpenTariffs }) => {
  const { signIn, signUp, resetPassword, updatePassword } = useAuth();

  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      // Если пришли по ссылке сброса пароля (используем хеш, так как supabase передает токены в хеше)
      if (params.get('reset') === 'true' || window.location.hash.includes('type=recovery')) {
        return 'reset-password';
      }
    }
    return 'welcome';
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docModalTab, setDocModalTab] = useState('guide');

  // Checkboxes state
  const [agreed18, setAgreed18] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedMarketing, setAgreedMarketing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);

    try {
      if (mode === 'admin') {
        // Локальный admin-bypass
        if (password === '4308') {
          // Авторизуемся в Supabase под системным аккаунтом админа, чтобы иметь доступ к БД (для логов и промокодов)
          const { error: signInError } = await signIn('yanush@director.local', 'Yan*memento#2010');
          if (signInError) {
            setError('ОШИБКА СВЯЗИ С ЯДРОМ');
            setIsProcessing(false);
            return;
          }

          // ВАЖНО: Сохраняем админа в localStorage, чтобы authService.isAdmin() возвращал true
          authService.admin_login('admin@kernel.root');
          onLogin('admin@kernel.root', 'ADMIN');
        } else {
          setError('КЛЮЧ ОТКЛОНЕН');
        }
      } else if (mode === 'register') {
        if (!email.includes('@')) throw new Error('НЕВЕРНЫЙ EMAIL');
        if (password.length < 6) throw new Error('ПАРОЛЬ ДОЛЖЕН БЫТЬ ОТ 6 СИМВОЛОВ');
        if (!agreed18 || !agreedTerms) throw new Error('НЕОБХОДИМО ПРИНЯТЬ УСЛОВИЯ И ПОДТВЕРДИТЬ ВОЗРАСТ');

        let clientIp = 'unknown';
        try {
          const ipRes = await fetch('https://api.ipify.org?format=json');
          if (ipRes.ok) {
            const ipData = await ipRes.json();
            clientIp = ipData.ip;
          }
        } catch(e) { console.error('Failed to get IP', e); }

        const metadata = {
           accepted_terms_version: '1.0',
           accepted_privacy_version: '1.0',
           marketing_consent: agreedMarketing,
           registration_ip: clientIp,
           registration_timestamp: new Date().toISOString()
        };

        const { error: signUpError } = await signUp(email, password, metadata);
        if (signUpError) {
          if (signUpError.toLowerCase().includes('sending confirmation email')) {
            setError('ОШИБКА: ЛИМИТ ОТПРАВКИ ПИСЕМ ПРЕВЫШЕН. ПОПРОБУЙТЕ ПОЗЖЕ ИЛИ ОБРАТИТЕСЬ В ПОДДЕРЖКУ.');
          } else if (signUpError.toLowerCase().includes('already registered')) {
            setError('EMAIL УЖЕ ЗАРЕГИСТРИРОВАН');
          } else {
            setError(signUpError.toUpperCase());
          }
        } else {
          // Supabase может потребовать подтверждения email —
          // сообщаем пользователю и переключаем на вход
          setMode('login');
          setError('АККАУНТ СОЗДАН. ПРОВЕРЬТЕ ПОЧТУ И ВОЙДИТЕ.');
        }
      } else if (mode === 'login') {
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          setError('НЕВЕРНЫЙ ЛОГИН ИЛИ ПАРОЛЬ');
        } else {
          // onAuthStateChange в AuthProvider обновит user автоматически;
          // сообщаем App.tsx, что вход выполнен
          onLogin(email, 'USER');
        }
      } else if (mode === 'forgot-password') {
        if (!email.includes('@')) throw new Error('НЕВЕРНЫЙ EMAIL');
        const { error: resetErr } = await resetPassword(email);
        if (resetErr) {
          setError('ОШИБКА ОТПРАВКИ ПИСЬМА СБРОСА ПАРОЛЯ');
        } else {
          setMode('login');
          setError('ИНСТРУКЦИИ ДЛЯ СБРОСА ПАРОЛЯ ОТПРАВЛЕНЫ НА ПОЧТУ');
        }
      } else if (mode === 'reset-password') {
        if (password.length < 6) throw new Error('ПАРОЛЬ ДОЛЖЕН БЫТЬ ОТ 6 СИМВОЛОВ');
        const { error: updateErr } = await updatePassword(password);
        if (updateErr) {
          setError(`ОШИБКА: ${updateErr}`);
        } else {
          // убираем хеш или параметры
          window.history.replaceState({}, document.title, window.location.pathname);
          setMode('login');
          setError('ПАРОЛЬ УСПЕШНО ИЗМЕНЕН. ТЕПЕРЬ ВЫ МОЖЕТЕ ВОЙТИ.');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-[100dvh] bg-[#0A0B1A] flex flex-col items-center justify-center p-6 pb-24 relative overflow-y-auto overflow-x-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>

      <div className="w-full max-w-lg relative z-30 flex flex-col items-center space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 bg-blue-600/10 rounded-[32px] border border-blue-500/20 text-blue-400 mb-2">
            <Activity size={48} className="animate-pulse" />
          </div>
          <h1 className="text-7xl font-black text-white tracking-tighter uppercase italic leading-none">ЯНУШ</h1>
          <p className="text-white opacity-60 text-sm mt-2 font-medium tracking-wide">Тренажёр сложных разговоров с подростками</p>
        </div>

        {mode === 'welcome' ? (
          <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <button
              onClick={() => { setDocModalTab('guide'); setIsDocModalOpen(true); }}
              className="group w-full glass p-6 rounded-[35px] border-white/5 hover:border-white/20 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                  <BookOpen size={20} />
                </div>
                <div className="text-left">
                  <h3 className="text-white font-black uppercase tracking-widest text-sm">О тренажере</h3>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider">Инструкция и концепция</p>
                </div>
              </div>
              <ArrowRight className="text-slate-600 group-hover:text-blue-400 transition-colors" size={16} />
            </button>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => { setError(null); setMode('login'); }}
                className="p-6 glass rounded-[35px] border-white/5 hover:border-white/20 flex flex-col items-center gap-3 transition-all"
              >
                <LogIn className="text-slate-500" size={24} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Вход</span>
              </button>
              <button
                onClick={() => { setError(null); setMode('register'); }}
                className="p-6 glass rounded-[35px] border-white/5 hover:border-white/20 flex flex-col items-center gap-3 transition-all"
              >
                <UserPlus className="text-slate-500" size={24} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Регистрация</span>
              </button>
            </div>



            <div className="flex justify-center">
              <button
                onClick={() => { setError(null); setMode('admin'); }}
                className="p-4 bg-white/5 rounded-full text-slate-700 hover:text-red-500 transition-all"
              >
                <Fingerprint size={28} />
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className={`w-full glass p-10 rounded-[50px] space-y-6 animate-in slide-in-from-bottom-8 duration-500 border-white/10 ${error ? 'animate-shake' : ''}`}
          >
            <div className="text-center space-y-2 mb-4">
              <h3 className="text-white font-black uppercase tracking-widest text-sm italic">
                {mode === 'admin' ? 'Ядро Системы' 
                 : mode === 'login' ? 'Авторизация' 
                 : mode === 'forgot-password' ? 'Восстановление пароля'
                 : mode === 'reset-password' ? 'Новый пароль'
                 : 'Регистрация'}
              </h3>
              {error && (
                <p className="text-[9px] text-rose-500 font-black uppercase tracking-widest">{error}</p>
              )}
            </div>

            <div className="space-y-4">
              {mode !== 'admin' && mode !== 'reset-password' && (
                <div className="relative group">
                  <Mail className="absolute left-6 top-5 text-slate-600" size={18} />
                  <input
                    required
                    type="email"
                    placeholder="EMAIL"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-slate-900/80 border border-white/5 rounded-2xl p-5 pl-16 text-white outline-none focus:border-blue-500/50"
                  />
                </div>
              )}
              {mode !== 'forgot-password' && (
                <div className="relative group">
                  <Lock className="absolute left-6 top-5 text-slate-600" size={18} />
                  <input
                    required
                    type="password"
                    placeholder={mode === 'reset-password' ? 'НОВЫЙ ПАРОЛЬ' : 'ПАРОЛЬ'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-slate-900/80 border border-white/5 rounded-2xl p-5 pl-16 text-white outline-none focus:border-blue-500/50"
                  />
                </div>
              )}
            </div>

            {mode === 'register' && (
              <div className="w-full space-y-3 mb-4 bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input 
                      type="checkbox" 
                      className="peer appearance-none w-5 h-5 border-2 border-slate-600 rounded-md checked:bg-blue-600 checked:border-blue-600 transition-colors"
                      checked={agreed18}
                      onChange={(e) => setAgreed18(e.target.checked)}
                    />
                    <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-[11px] text-slate-300 leading-tight group-hover:text-white transition-colors">
                    Мне исполнилось 18 лет <span className="text-rose-500">*</span>
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input 
                      type="checkbox" 
                      className="peer appearance-none w-5 h-5 border-2 border-slate-600 rounded-md checked:bg-blue-600 checked:border-blue-600 transition-colors"
                      checked={agreedTerms}
                      onChange={(e) => setAgreedTerms(e.target.checked)}
                    />
                    <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-[11px] text-slate-300 leading-tight group-hover:text-white transition-colors">
                    Я принимаю условия{' '}
                    <button type="button" onClick={(e) => { e.preventDefault(); setDocModalTab('terms'); setIsDocModalOpen(true); }} className="text-blue-400 hover:underline">Оферты</button>
                    {' '}и даю согласие на обработку персональных данных в соответствии с{' '}
                    <button type="button" onClick={(e) => { e.preventDefault(); setDocModalTab('privacy'); setIsDocModalOpen(true); }} className="text-blue-400 hover:underline">Политикой конфиденциальности</button>
                    {' '}<span className="text-rose-500">*</span>
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input 
                      type="checkbox" 
                      className="peer appearance-none w-5 h-5 border-2 border-slate-600 rounded-md checked:bg-blue-600 checked:border-blue-600 transition-colors"
                      checked={agreedMarketing}
                      onChange={(e) => setAgreedMarketing(e.target.checked)}
                    />
                    <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-[11px] text-slate-300 leading-tight group-hover:text-white transition-colors">
                    Я хочу получать письма об обновлениях Платформы
                  </span>
                </label>
              </div>
            )}

            <button
              disabled={isProcessing || (mode === 'register' && (!agreed18 || !agreedTerms))}
              type="submit"
              className={`w-full py-6 rounded-3xl font-black text-xs uppercase tracking-[0.4em] shadow-xl flex items-center justify-center gap-3 transition-all ${
                mode === 'admin' ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'
              } text-white disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {isProcessing
                ? <Loader2 className="animate-spin" size={18} />
                : mode === 'admin' ? 'Войти' 
                : mode === 'login' ? 'Войти' 
                : mode === 'forgot-password' ? 'Сбросить пароль'
                : mode === 'reset-password' ? 'Сохранить пароль'
                : 'Создать аккаунт'}
            </button>

            {/* Переключатель между входом и регистрацией */}
            {(mode === 'login' || mode === 'register' || mode === 'forgot-password') && (
              <div className="space-y-3">
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMode('forgot-password');
                    }}
                    className="w-full text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors"
                  >
                    Забыли пароль?
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode(mode === 'login' ? 'register' : 'login');
                  }}
                  className="w-full text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors"
                >
                  {mode === 'login'
                    ? 'Нет аккаунта? Зарегистрироваться'
                    : 'Уже есть аккаунт? Войти'}
                </button>
                
              </div>
            )}

            <button
              type="button"
              onClick={() => { setError(null); setMode('welcome'); }}
              className="w-full text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center justify-center gap-2 hover:text-slate-400 transition-colors"
            >
              <ChevronLeft size={14} /> Назад
            </button>
          </form>
        )}
      </div>

      <div className="absolute bottom-4 left-0 right-0 z-50 pointer-events-none">
        <div className="pointer-events-auto">
          <FooterLinks 
            onOpenDocs={(tab) => {
              setDocModalTab(tab);
              setIsDocModalOpen(true);
            }} 
            onOpenTariffs={onOpenTariffs}
          />
        </div>
      </div>

      <DocumentsModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        initialDocId={docModalTab}
      />
    </div>
  );
};

export default LoginScreen;
