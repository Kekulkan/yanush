import React, { useState, useEffect } from 'react';
import { TeacherProfile, StudentProfile } from '../types';
import {
  ChevronRight,
  User,
  Settings,
  LogOut,
  ArrowLeft,
  CheckCircle2,
  Activity,
  Target,
  CreditCard,
  Sparkles,
  X,
  Loader2,
  ShieldCheck,
  MessageSquare
} from 'lucide-react';
import { generateStudentName } from '../services/chaosEngine';
import { authService } from '../services/authService';
import { COMMERCIAL_CONFIG } from '../constants';
import { SubscriptionInfo } from '../services/billingService';
import DocumentsModal from './DocumentsModal';
import { FooterLinks } from './FooterLinks';

interface Props {
  onStart: (teacher: TeacherProfile, student: StudentProfile) => void;
  onOpenAdmin: () => void;
  onBack: () => void;
  subscription?: SubscriptionInfo;
  onOpenSubscription?: () => void;
}

const SetupScreen: React.FC<Props> = ({ onStart, onOpenAdmin, onBack, subscription, onOpenSubscription }) => {
  // Загружаем сохранённые настройки учителя из localStorage
  const getSavedTeacherSettings = () => {
    try {
      const saved = localStorage.getItem('teacher_defaults');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          name: parsed.name || 'Алексей Петрович',
          gender: parsed.gender || 'male'
        };
      }
    } catch (e) {}
    return { name: 'Алексей Петрович', gender: 'male' as const };
  };

  const savedDefaults = getSavedTeacherSettings();
  const [teacherName, setTeacherName] = useState(savedDefaults.name);
  const [teacherGender, setTeacherGender] = useState<'male' | 'female'>(savedDefaults.gender as 'male' | 'female');
  const [studentAge, setStudentAge] = useState(14);
  const [studentGender, setStudentGender] = useState<'male' | 'female'>('male');
  const [advisoryCommission, setAdvisoryCommission] = useState(true);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docModalTab, setDocModalTab] = useState('terms');

  const isPremium = subscription?.tier === 'premium' || authService.isPremium();
  const isAdmin = authService.isAdmin();

  // Сохраняем настройки учителя при изменении
  useEffect(() => {
    try {
      localStorage.setItem('teacher_defaults', JSON.stringify({
        name: teacherName,
        gender: teacherGender
      }));
    } catch (e) {}
  }, [teacherName, teacherGender]);

  const handleStart = () => {
    const randomName = generateStudentName(studentGender);
    onStart(
      { 
        name: teacherName, 
        gender: teacherGender,
        settings: { mainCommission: true, advisoryCommission }
      },
      { name: randomName, age: studentAge, gender: studentGender }
    );
  };

  return (
    <div className="h-[100dvh] bg-[#0A0B1A] flex flex-col items-center p-6 overflow-y-auto custom-scroll relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(37,99,235,0.1),transparent)] pointer-events-none"></div>
      
      <div className="w-full max-w-lg mt-4 mb-12 flex flex-col space-y-10 relative z-10">
        
        <div className="flex justify-between items-center">
            <button onClick={onBack} className="p-3 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-2xl border border-white/5">
                <ArrowLeft size={20} />
            </button>
            <div className="text-center">
                <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">ПОДГОТОВКА</h1>
                <p className="text-blue-500 text-[9px] font-black uppercase tracking-[0.4em]">Параметры Сеанса</p>
            </div>
            <div className="flex gap-2">
                {isAdmin && (
                    <button onClick={onOpenAdmin} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-blue-500 transition-all">
                        <Settings size={20} />
                    </button>
                )}
                <button onClick={() => authService.logout()} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-all">
                    <LogOut size={20} />
                </button>
            </div>
        </div>

        {isPremium ? (
             <div className="bg-emerald-600/10 border border-emerald-500/20 p-6 rounded-[40px] relative overflow-hidden">
                <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3 bg-emerald-500/20 rounded-2xl">
                        <CheckCircle2 size={24} className="text-emerald-500" />
                    </div>
                    <div>
                        <h4 className="text-white font-black text-[10px] uppercase tracking-[0.2em]">Полный Допуск Активен</h4>
                        <p className="text-emerald-500/80 text-[9px] font-bold mt-1 tracking-widest uppercase">Все 11 психотипов разблокированы</p>
                    </div>
                </div>
            </div>
        ) : (
            <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-8 rounded-[40px] shadow-2xl space-y-5 relative overflow-hidden">
                <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                        <Activity size={24} className="text-white" />
                    </div>
                    <div>
                        <h4 className="text-white font-black text-xs uppercase italic tracking-widest">Пробная версия</h4>
                        <p className="text-blue-100 text-[9px] font-bold opacity-80 mt-1 uppercase">Заблокировано: 9 акцентуаций</p>
                    </div>
                </div>
                <button 
                    onClick={() => onOpenSubscription?.()}
                    className="w-full py-4 bg-white text-blue-600 rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                >
                    <Sparkles size={14} /> КУПИТЬ ПОЛНЫЙ ДОСТУП
                </button>
            </div>
        )}

        <div className="space-y-4">
            <div className="flex items-center gap-3 text-blue-500 text-[10px] font-black uppercase tracking-[0.3em] ml-2">
                <User size={14} /> Профиль Педагога
            </div>
            <div className="glass p-8 rounded-[40px] space-y-8 border-white/5">
                <div className="space-y-6">
                    <div>
                       <label className="block text-[10px] text-slate-500 font-black uppercase mb-3 tracking-widest">Фамилия Имя Отчество</label>
                       <input 
                         type="text" 
                         value={teacherName}
                         onChange={e => setTeacherName(e.target.value)}
                         className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-blue-500/50 font-bold italic"
                       />
                    </div>
                    <div className="flex gap-3">
                        {['male', 'female'].map((g) => (
                            <button
                                key={g}
                                onClick={() => setTeacherGender(g as any)}
                                className={`flex-1 py-5 rounded-[22px] text-[10px] font-black uppercase transition-all border ${teacherGender === g ? 'bg-blue-600 border-blue-400 text-white shadow-xl' : 'bg-white/5 text-slate-500 border-white/5'}`}
                            >
                                {g === 'male' ? 'МУЖЧИНА' : 'ЖЕНЩИНА'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        <div className="space-y-4">
            <div className="flex items-center gap-3 text-purple-500 text-[10px] font-black uppercase tracking-[0.3em] ml-2">
                <Target size={14} /> Параметры Ученика
            </div>
            <div className="glass p-8 rounded-[40px] space-y-10 border-white/5">
                <div className="space-y-8">
                    <div className="flex gap-3">
                        {['male', 'female'].map((g) => (
                            <button
                                key={g}
                                onClick={() => setStudentGender(g as any)}
                                className={`flex-1 py-5 rounded-[22px] text-[10px] font-black uppercase transition-all border ${studentGender === g ? 'bg-purple-600 border-purple-400 text-white shadow-xl' : 'bg-white/5 text-slate-500 border-white/5'}`}
                            >
                                {g === 'male' ? 'ЮНОША' : 'ДЕВУШКА'}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-6">
                        <div className="flex justify-between items-end mb-2">
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Возраст</label>
                            <span className="text-3xl font-black text-white italic">{studentAge}</span>
                        </div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-2">Двигайте ползунок влево/вправо — от 12 до 17 лет</p>
                        <div className="relative w-full px-1">
                            <div className="absolute inset-x-1 top-1/2 -translate-y-1/2 h-2 bg-slate-700 rounded-full" aria-hidden />
                            <div className="absolute left-1 right-1 top-1/2 -translate-y-1/2 flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest pointer-events-none">
                                <span>12</span>
                                <span>17</span>
                            </div>
                            <input 
                                type="range" min="12" max="17" step="1"
                                value={studentAge}
                                onChange={e => setStudentAge(parseInt(e.target.value))}
                                className="relative w-full h-6 appearance-none bg-transparent cursor-grab active:cursor-grabbing [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(139,92,246,0.6)] [&::-webkit-slider-thumb]:cursor-grab [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-violet-500 [&::-moz-range-thumb]:border-0"
                                title="Выберите возраст от 12 до 17"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="space-y-4">
            <div className="flex items-center gap-3 text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em] ml-2">
                <ShieldCheck size={14} /> Режим Супервизии
            </div>
            <div className="glass p-8 rounded-[40px] space-y-6 border-white/5">
                {/* Главная комиссия всегда активна */}
                <div className="w-full flex items-center justify-between p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500 text-white">
                            <ShieldCheck size={16} />
                        </div>
                        <div className="text-left">
                            <div className="text-[10px] font-black uppercase tracking-widest text-white">Главная Комиссия</div>
                            <div className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">Обязательный педагогический вердикт</div>
                        </div>
                    </div>
                    <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">ВСЕГДА ВКЛ</div>
                </div>

                <button 
                    onClick={() => setAdvisoryCommission(!advisoryCommission)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${advisoryCommission ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-white/10 opacity-60'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${advisoryCommission ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                            <MessageSquare size={16} />
                        </div>
                        <div className="text-left">
                            <div className={`text-[10px] font-black uppercase tracking-widest ${advisoryCommission ? 'text-white' : 'text-slate-500'}`}>Совещательная Комиссия</div>
                            <div className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">Мнения специалистов</div>
                        </div>
                    </div>
                    <div className={`w-10 h-6 rounded-full relative transition-all ${advisoryCommission ? 'bg-purple-500' : 'bg-slate-700'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${advisoryCommission ? 'left-5' : 'left-1'}`}></div>
                    </div>
                </button>
            </div>
        </div>

        <button 
            onClick={handleStart}
            className="w-full py-7 bg-white text-slate-950 rounded-[40px] font-black text-xl hover:bg-blue-400 transition-all active:scale-95 shadow-xl flex items-center justify-center gap-4 italic uppercase tracking-widest"
        >
            НАЧАТЬ СЕАНС <ChevronRight size={28} />
        </button>

        <FooterLinks 
          onOpenDocs={(tab) => {
            setDocModalTab(tab);
            setIsDocModalOpen(true);
          }} 
        />

      </div>

      <DocumentsModal 
        isOpen={isDocModalOpen} 
        onClose={() => setIsDocModalOpen(false)} 
        initialDocId={docModalTab}
      />

    </div>
  );
};

export default SetupScreen;

