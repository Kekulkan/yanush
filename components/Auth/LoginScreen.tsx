
import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, ShieldAlert, Fingerprint, Activity, BookOpen, UserPlus, LogIn, ChevronLeft, Loader2 } from 'lucide-react';
import { authService } from '../../services/authService';

interface Props {
  onLogin: (email: string, role: any) => void;
  onEnterMuseum: () => void;
}

const LoginScreen: React.FC<Props> = ({ onLogin, onEnterMuseum }) => {
  const [mode, setMode] = useState<'welcome' | 'login' | 'register' | 'admin'>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);

    try {
        if (mode === 'admin') {
            if (password === '4308') {
                const admin = authService.admin_login('admin@kernel.root');
                onLogin(admin.email, admin.role);
            } else {
                setError('КЛЮЧ ОТКЛОНЕН');
            }
        } else if (mode === 'register') {
            if (!email.includes('@')) throw new Error('НЕВЕРНЫЙ EMAIL');
            if (password.length < 6) throw new Error('ПАРОЛЬ ДОЛЖЕН БЫТЬ ОТ 6 СИМВОЛОВ');
            
            const res = await authService.register(email, password);
            if (res.success) {
                setMode('login');
                setError('АККАУНТ СОЗДАН. ТЕПЕРЬ ВОЙДИТЕ.');
            } else {
                setError(res.error || 'ОШИБКА РЕГИСТРАЦИИ');
            }
        } else if (mode === 'login') {
            const user = await authService.login(email, password);
            if (user) {
                onLogin(user.email, user.role);
            } else {
                setError('НЕВЕРНЫЙ ЛОГИН ИЛИ ПАРОЛЬ');
            }
        }
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="h-[100dvh] bg-[#0A0B1A] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
        
        <div className="w-full max-w-lg relative z-10 flex flex-col items-center space-y-12">
            <div className="text-center space-y-4">
                <div className="inline-flex p-4 bg-blue-600/10 rounded-[32px] border border-blue-500/20 text-blue-400 mb-2">
                    <Activity size={48} className="animate-pulse" />
                </div>
                <h1 className="text-7xl font-black text-white tracking-tighter uppercase italic leading-none">ЯНУШ</h1>
            </div>

            {mode === 'welcome' ? (
                <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-500">
                    <button 
                        onClick={onEnterMuseum}
                        className="group w-full glass p-8 rounded-[45px] border-blue-500/20 hover:border-blue-500/50 transition-all hover:scale-[1.02] text-center"
                    >
                        <div className="text-blue-400 font-black text-[10px] uppercase tracking-[0.5em] mb-4">Свободный Доступ</div>
                        <h2 className="text-2xl font-black text-white uppercase italic">Выставка акцентуаций</h2>
                        <div className="pt-6 flex justify-center">
                            <span className="px-8 py-4 bg-white text-slate-950 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2">
                                Открыть Экспозицию <ArrowRight size={14} />
                            </span>
                        </div>
                    </button>

                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setMode('login')} className="p-6 glass rounded-[35px] border-white/5 hover:border-white/20 flex flex-col items-center gap-3 transition-all">
                            <LogIn className="text-slate-500" size={24} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Вход</span>
                        </button>
                        <button onClick={() => setMode('register')} className="p-6 glass rounded-[35px] border-white/5 hover:border-white/20 flex flex-col items-center gap-3 transition-all">
                            <UserPlus className="text-slate-500" size={24} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Регистрация</span>
                        </button>
                    </div>

                    <div className="flex justify-center">
                        <button onClick={() => setMode('admin')} className="p-4 bg-white/5 rounded-full text-slate-700 hover:text-red-500 transition-all">
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
                            {mode === 'admin' ? 'Ядро Системы' : (mode === 'login' ? 'Авторизация' : 'Регистрация')}
                        </h3>
                        {error && <p className="text-[9px] text-rose-500 font-black uppercase tracking-widest">{error}</p>}
                    </div>

                    <div className="space-y-4">
                        {mode !== 'admin' && (
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
                        <div className="relative group">
                            <Lock className="absolute left-6 top-5 text-slate-600" size={18} />
                            <input 
                                required
                                type="password"
                                placeholder="ПАРОЛЬ"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-slate-900/80 border border-white/5 rounded-2xl p-5 pl-16 text-white outline-none focus:border-blue-500/50"
                            />
                        </div>
                    </div>

                    <button 
                        disabled={isProcessing}
                        type="submit"
                        className={`w-full py-6 rounded-3xl font-black text-xs uppercase tracking-[0.4em] shadow-xl flex items-center justify-center gap-3 transition-all ${mode === 'admin' ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'} text-white`}
                    >
                        {isProcessing ? <Loader2 className="animate-spin" size={18} /> : (mode === 'admin' ? 'Войти' : (mode === 'login' ? 'Войти' : 'Создать'))}
                    </button>

                    <button 
                        type="button"
                        onClick={() => setMode('welcome')}
                        className="w-full text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                        <ChevronLeft size={14} /> Назад
                    </button>
                </form>
            )}
        </div>
    </div>
  );
};

export default LoginScreen;

