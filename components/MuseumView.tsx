
import React, { useState } from 'react';
import { ArrowLeft, Target, Zap, ShieldAlert, User, Info, Sparkles, Activity, Play, Eye, Lock } from 'lucide-react';
import DemoSession from './DemoSession';
import { getDemoScenario } from '../data/demoScenarios';
import { DemoScenario } from '../types';
import { getSubscriptionInfo } from '../services/billingService';
import { authService } from '../services/authService';

const FREE_ACCENTUATIONS = ['hyperthymic', 'sensitive'];

interface Exhibit {
    id: string;
    title: string;
    description: string;
    sceneImage: string;      // Сцена — для сетки
    portraitImage: string;   // Портрет — для досье
    accentuationId: string;  // ID для демо-сценария
    profile: {
        psychotype: string;
        context: string;
        intensity: number;
        status: 'Архив' | 'Разбор' | 'Активен';
        traits: string[];    // Характерные черты
    };
    quote: string;
}

const EXHIBITS: Exhibit[] = [
    {
        id: '1',
        title: 'Вечный Двигатель',
        description: 'Урок математики сорван. Подросток залез на парту и имитирует дирижера, пока класс задыхается от смеха. Он не злой, ему просто слишком весело жить.',
        sceneImage: '/exhibits/hyperthymic.png',
        portraitImage: '/exhibits/hyperthymic_portrait.png',
        accentuationId: 'hyperthymic',
        quote: '«А почему мы все такие кислые? Давайте я вам анекдот расскажу, он короче физики!»',
        profile: {
            psychotype: 'Гипертимный',
            context: 'Срыв урока',
            intensity: 4,
            status: 'Активен',
            traits: ['Повышенный фон настроения', 'Жажда деятельности', 'Неусидчивость', 'Болтливость', 'Склонность к риску']
        }
    },
    {
        id: '2',
        title: 'Застывший Пульс',
        description: 'Подросток стоит у парты — его вызвали отвечать. Голова втянута в плечи, подбородок прижат к груди. Лицо и уши багровые. Затылки одноклассников повёрнуты к нему — как осуждающая стена. Он хочет провалиться сквозь пол.',
        sceneImage: '/exhibits/sensitive_scene.png',
        portraitImage: '/exhibits/sensitive_portrait.png',
        accentuationId: 'sensitive',
        quote: '«Они все смотрят... они все видят мои ошибки ещё до того, как я их совершу».',
        profile: {
            psychotype: 'Сенситивный',
            context: 'Публичный ответ',
            intensity: 4,
            status: 'Активен',
            traits: ['Застенчивость', 'Чувство неполноценности', 'Страх осуждения', 'Ранимость', 'Самокритичность']
        }
    },
    {
        id: '3',
        title: 'Свинцовая Ярость',
        description: 'Сосед случайно задел его локтем. Подросток медленно поворачивается. В глазах не обида — тяжёлая, свинцовая ярость. Он готов ударить не в порыве страсти, а «за дело». Это не ссора — это взрыв.',
        sceneImage: '/exhibits/epileptoid_scene.png',
        portraitImage: '/exhibits/epileptoid_portrait.png',
        accentuationId: 'epileptoid',
        quote: '«Я предупреждал. Вы нарушили порядок трижды. Теперь я установлю свои правила».',
        profile: {
            psychotype: 'Эпилептоидный',
            context: 'Нарушение границ',
            intensity: 5,
            status: 'Активен',
            traits: ['Вязкость аффекта', 'Злопамятность', 'Педантизм', 'Склонность к дисфориям', 'Властность']
        }
    },
    {
        id: '4',
        title: 'Инопланетный Гость',
        description: 'Групповая работа, все шумят и спорят. В дальнем углу сидит подросток. Он не просто молчит — он кажется инопланетянином, случайно попавшим в класс. На его столе сложная геометрическая фигура из скрепок. Взгляд направлен сквозь стены.',
        sceneImage: '/exhibits/schizoid_scene.png',
        portraitImage: '/exhibits/schizoid_portrait.png',
        accentuationId: 'schizoid',
        quote: '«Мне не одиноко. Мне хорошо. Просто оставьте меня в покое».',
        profile: {
            psychotype: 'Шизоидный',
            context: 'Отчуждение',
            intensity: 4,
            status: 'Активен',
            traits: ['Замкнутость', 'Эмоциональная холодность', 'Богатый внутренний мир', 'Оригинальность мышления', 'Интроверсия']
        }
    },
    {
        id: '5',
        title: 'Качели Печали',
        description: 'Вчера он был душой компании, сегодня — комок нервов в углу. Любая просьба учителя вызывает либо вспышку раздражения, либо безмолвную апатию.',
        sceneImage: '/exhibits/cycloid_scene.png',
        portraitImage: '/exhibits/cycloid_portrait.png',
        accentuationId: 'cycloid',
        quote: '«Оставьте меня в покое. Мне всё равно, что вы там поставите в журнале».',
        profile: {
            psychotype: 'Циклоидный',
            context: 'Депрессивная фаза',
            intensity: 4,
            status: 'Активен',
            traits: ['Смена фаз настроения', 'Периоды подъёма и спада', 'Раздражительность в минусе', 'Уязвимость к критике', 'Цикличность']
        }
    },
    {
        id: '6',
        title: 'Стеклянное Сердце',
        description: 'Учитель просто нахмурился, а ученица уже в слезах. Её настроение меняется от мимолетного взгляда, как поверхность озера в грозу.',
        sceneImage: '/exhibits/labile_scene.png',
        portraitImage: '/exhibits/labile_portrait.png',
        accentuationId: 'labile',
        quote: '«Вы так на меня посмотрели... как будто я самое худшее, что было в вашей жизни».',
        profile: {
            psychotype: 'Лабильный',
            context: 'Эмоциональный срыв',
            intensity: 4,
            status: 'Активен',
            traits: ['Крайняя изменчивость настроения', 'Глубина переживаний', 'Чувствительность к отношению', 'Потребность в эмпатии', 'Искренность эмоций']
        }
    },
    {
        id: '7',
        title: 'Театр Одного Актёра',
        description: 'Середина урока литературы. Девочка разразилась театральными рыданиями из-за того, что учитель не выбрал её читать стихи первой. Она делает это красиво, посматривая, все ли смотрят.',
        sceneImage: '/exhibits/hysteroid_scene.png',
        portraitImage: '/exhibits/hysteroid_portrait.png',
        accentuationId: 'hysteroid',
        quote: '«Смотрите на меня! Если вы не смотрите, значит, меня не существует!»',
        profile: {
            psychotype: 'Истероидный',
            context: 'Борьба за внимание',
            intensity: 5,
            status: 'Активен',
            traits: ['Жажда внимания', 'Театральность', 'Эгоцентризм', 'Демонстративность', 'Артистизм']
        }
    },
    {
        id: '8',
        title: 'Увядающий Росток',
        description: 'Подросток буквально «стекает» со стула. Лицо бледное, глаза покраснели. Любой резкий звук заставляет его вздрогнуть. Он огрызается на тихий шёпот, потому что они «шумят слишком громко». Он не ленив — он истощён.',
        sceneImage: '/exhibits/asteno_scene.png',
        portraitImage: '/exhibits/asteno_portrait.png',
        accentuationId: 'asthenoneurotic',
        quote: '«Мел скрипит мне прямо в мозг, больно... Я больше не могу это слушать».',
        profile: {
            psychotype: 'Астено-невротический',
            context: 'Истощение',
            intensity: 4,
            status: 'Активен',
            traits: ['Повышенная утомляемость', 'Раздражительность', 'Ипохондрия', 'Сенсорная чувствительность', 'Аффективные вспышки']
        }
    },
    {
        id: '9',
        title: 'Маленький Старик',
        description: 'Конец контрольной. Все сдали, кроме него. Лист в исправлениях, стёрто до дыр. Он знает ответ, но боится — «вдруг не так». Рука дрожит. Учитель подходит забрать работу, а ребёнок вцепляется в неё: «Дайте ещё минуту».',
        sceneImage: '/exhibits/psychastenic_scene.png',
        portraitImage: '/exhibits/psychastenic_portrait.png',
        accentuationId: 'psychastenic',
        quote: '«Если мы не проверим это ещё раз, риск совершить логическую ошибку возрастёт на 14%».',
        profile: {
            psychotype: 'Психастенический',
            context: 'Контрольная работа',
            intensity: 4,
            status: 'Активен',
            traits: ['Болезненная мнительность', 'Страх ответственности', 'Нерешительность', 'Умственная жвачка', 'Перфекционизм']
        }
    },
    {
        id: '10',
        title: 'Случайный Пассажир',
        description: 'Учитель замолкает на полуслове. Класс понял — сейчас будет взрыв. Кроме одного. Он медленно отводит взгляд от телефона. В позе — ноль раскаяния. Кладёт гаджет экраном вниз, качаясь на стуле. Ему просто лень спорить.',
        sceneImage: '/exhibits/unstable_scene.png',
        portraitImage: '/exhibits/unstable_portrait.png',
        accentuationId: 'unstable',
        quote: '«Ну а чё сразу я?.. Скучно же было. Сами попробуйте сорок минут этот мел слушать».',
        profile: {
            psychotype: 'Неустойчивый',
            context: 'Игнорирование урока',
            intensity: 3,
            status: 'Активен',
            traits: ['Безволие', 'Гедонизм', 'Непереносимость скуки', 'Отсутствие целей', 'Внушаемость']
        }
    },
    {
        id: '11',
        title: 'Эхо',
        description: 'Класс голосует. Его глаза лихорадочно бегают по сторонам — он ждёт. Как только большинство подняло руки, он вскидывает свою — выше всех, с бесконечным облегчением на лице. Вчера у него было другое мнение. Сегодня — мнение большинства.',
        sceneImage: '/exhibits/conformist_scene.png',
        portraitImage: '/exhibits/conformist_portrait.png',
        accentuationId: 'conformist',
        quote: '«Я согласен со всеми. Если все так решили, значит, это правильно. Почему я должен быть против?»',
        profile: {
            psychotype: 'Конформный',
            context: 'Голосование в классе',
            intensity: 4,
            status: 'Активен',
            traits: ['Страх одиночества', 'Отсутствие своего мнения', 'Зависимость от группы', 'Предательство интересов', 'Мимикрия']
        }
    }
];

interface Props {
    onBack: () => void;
    onOpenSubscription?: () => void;
}

const MuseumView: React.FC<Props> = ({ onBack, onOpenSubscription }) => {
    const [selected, setSelected] = useState<Exhibit | null>(null);
    const [activeDemo, setActiveDemo] = useState<DemoScenario | null>(null);
    const isPremium = authService.isPremium();

    // Запуск демо-режима
    const startDemo = (exhibit: Exhibit) => {
        const isLocked = !FREE_ACCENTUATIONS.includes(exhibit.accentuationId) && !isPremium;
        
        if (isLocked) {
            onOpenSubscription?.();
            return;
        }

        const scenario = getDemoScenario(exhibit.accentuationId);
        if (scenario) {
            setActiveDemo(scenario);
            setSelected(null);
        }
    };

    // Если демо активно — показываем его
    if (activeDemo) {
        return (
            <DemoSession 
                scenario={activeDemo}
                onBack={() => setActiveDemo(null)}
                onStartFullSession={() => {
                    // TODO: Переход к полноценному сеансу с этой акцентуацией
                    setActiveDemo(null);
                    onBack();
                }}
            />
        );
    }

    return (
        <div className="h-[100dvh] bg-[#0A0B1A] flex flex-col font-sans text-slate-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.05),transparent)] pointer-events-none"></div>
            
            {/* Цитата Г.К. */}
            <div className="absolute top-24 right-12 z-0 opacity-10 pointer-events-none text-right hidden lg:block">
                <p className="text-[12px] font-black uppercase tracking-[0.3em] leading-relaxed text-slate-400">
                    «Раньше было сложно,<br/>дальше будет трудно»<br/>
                    <span className="text-blue-500">— Г.К.</span>
                </p>
            </div>

            <header className="p-8 border-b border-white/5 flex items-center justify-between relative z-10 bg-slate-950/50 backdrop-blur-xl">
                <div className="flex items-center gap-6">
                    <button onClick={onBack} className="p-3 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-2xl border border-white/5">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tighter italic">ЯНУШ // <span className="text-blue-500">ЭКСПОЗИЦИЯ</span></h1>
                        <div className="flex items-center gap-2 text-[8px] text-blue-500/70 font-black tracking-[0.4em] uppercase">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></div>
                            ЕЩЁ НЕ ПАТОЛОГИЯ, НО УЖЕ НЕ НОРМА
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-8 relative z-10 no-scrollbar">
                <div className="mb-12">
                    <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.5em] mb-4">Выставка акцентуаций им. А. Личко</h2>
                    <div className="h-px w-full bg-gradient-to-r from-blue-500/50 to-transparent"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-12">
                    {EXHIBITS.map((ex) => {
                        const isLocked = !FREE_ACCENTUATIONS.includes(ex.accentuationId) && !isPremium;
                        
                        return (
                            <div 
                                key={ex.id} 
                                onClick={() => setSelected(ex)}
                                className={`group glass rounded-[32px] overflow-hidden border transition-all cursor-pointer bg-slate-900/40 ${
                                    isLocked ? 'border-amber-500/20 grayscale' : 'border-white/5 hover:border-blue-500/30'
                                }`}
                            >
                                {/* Полная картинка сцены */}
                                <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-900">
                                    <img 
                                        src={ex.sceneImage} 
                                        alt={ex.title} 
                                        className={`w-full h-full object-contain bg-slate-950 transition-all duration-500 ${
                                            isLocked ? 'grayscale opacity-30' : 'grayscale opacity-60 group-hover:opacity-100 group-hover:grayscale-0'
                                        }`} 
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none"></div>
                                    
                                    {/* Бейдж статуса или замок */}
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        {isLocked && (
                                            <div className="bg-amber-500 text-black p-2 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.3)] animate-pulse">
                                                <Lock size={12} fill="currentColor" />
                                            </div>
                                        )}
                                        <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                            ex.profile.status === 'Активен' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                            ex.profile.status === 'Разбор' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                            'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                                        }`}>
                                            {ex.profile.status}
                                        </span>
                                    </div>
                                
                                {/* Заголовок поверх изображения */}
                                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-950 to-transparent">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Activity size={12} className="text-blue-500" />
                                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.3em]">
                                            {ex.profile.psychotype}
                                        </span>
                                    </div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tight italic">
                                        {ex.title}
                                    </h3>
                                </div>
                            </div>
                            
                            {/* Краткое описание */}
                            <div className="p-6 space-y-4">
                                <p className="text-slate-400 text-sm leading-relaxed line-clamp-2 italic">
                                    {ex.description}
                                </p>
                                <div className="flex items-center justify-between">
                                    <div className="flex gap-1">
                                        {[1,2,3,4,5].map(lv => (
                                            <div key={lv} className={`w-2 h-2 rounded-full ${lv <= ex.profile.intensity ? 'bg-blue-500' : 'bg-slate-700'}`} />
                                        ))}
                                    </div>
                                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-wider group-hover:text-white transition-colors">
                                        Открыть досье →
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {selected && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300"
                    onClick={() => setSelected(null)}
                >
                    <div 
                        className="w-full max-w-2xl bg-[#0d1117] rounded-3xl border border-slate-700/50 overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Шапка досье */}
                        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                                    ДОСЬЕ // АРХИВ №{selected.id}
                                </span>
                            </div>
                            <button 
                                onClick={() => setSelected(null)}
                                className="p-2 text-slate-500 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Контент досье */}
                        <div className="flex flex-col md:flex-row">
                            {/* Портрет */}
                            <div className="w-full md:w-2/5 bg-slate-900 relative">
                                <div className="aspect-[3/4] relative overflow-hidden">
                                    <img 
                                        src={selected.portraitImage} 
                                        alt={selected.title}
                                        className="w-full h-full object-cover grayscale contrast-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                                </div>
                                {/* Метка классификации */}
                                <div className="absolute bottom-4 left-4 right-4">
                                    <div className="bg-black/80 backdrop-blur-sm border border-slate-600/50 rounded-xl p-3">
                                        <div className="text-[8px] font-mono text-slate-500 uppercase tracking-wider mb-1">
                                            Классификация
                                        </div>
                                        <div className="text-lg font-black text-white uppercase tracking-tight">
                                            {selected.profile.psychotype}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Информация */}
                            <div className="w-full md:w-3/5 p-6 space-y-5">
                                {/* Заголовок */}
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Target size={14} className="text-blue-500" />
                                        <span className="text-[9px] font-mono text-blue-500 uppercase tracking-widest">
                                            Кодовое имя
                                        </span>
                                    </div>
                                    <h2 className="text-2xl font-black text-white uppercase tracking-tight italic">
                                        {selected.title}
                                    </h2>
                                </div>

                                {/* Описание */}
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    {selected.description}
                                </p>

                                {/* Цитата */}
                                <div className="bg-slate-800/50 border-l-2 border-blue-500 pl-4 py-3 italic text-blue-300 text-sm">
                                    {selected.quote}
                                </div>

                                {/* Характеристики */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-[8px] font-mono text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                            <Info size={10} /> Контекст
                                        </div>
                                        <div className="text-xs font-bold text-white">{selected.profile.context}</div>
                                    </div>
                                    <div>
                                        <div className="text-[8px] font-mono text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                            <Zap size={10} /> Интенсивность
                                        </div>
                                        <div className="flex gap-1">
                                            {[1,2,3,4,5].map(lv => (
                                                <div key={lv} className={`w-4 h-1.5 rounded-full ${lv <= selected.profile.intensity ? 'bg-blue-500' : 'bg-slate-700'}`} />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Черты */}
                                <div>
                                    <div className="text-[8px] font-mono text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <User size={10} /> Характерные черты
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {selected.profile.traits.map((trait, i) => (
                                            <span key={i} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300">
                                                {trait}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Кнопки */}
                                <div className="space-y-3">
                                    {(() => {
                                        const isLocked = !FREE_ACCENTUATIONS.includes(selected.accentuationId) && !isPremium;
                                        
                                        return (
                                            <>
                                                {getDemoScenario(selected.accentuationId) ? (
                                                    <button 
                                                        onClick={() => startDemo(selected)}
                                                        className={`w-full py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2 ${
                                                            isLocked 
                                                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30' 
                                                                : 'bg-blue-600 hover:bg-blue-500 text-white'
                                                        }`}
                                                    >
                                                        {isLocked ? <Lock size={14} /> : <Eye size={14} />}
                                                        {isLocked ? 'Разблокировать Demo (Premium)' : 'Демо-режим'}
                                                    </button>
                                                ) : (
                                                    <button 
                                                        disabled
                                                        className="w-full py-4 bg-slate-700 text-slate-500 rounded-xl font-black uppercase text-xs tracking-widest cursor-not-allowed flex items-center justify-center gap-2"
                                                    >
                                                        <Play size={14} /> Демо в разработке
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => isLocked ? onOpenSubscription?.() : null}
                                                    className={`w-full py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 ${
                                                        isLocked 
                                                            ? 'bg-slate-800 text-slate-500 cursor-pointer hover:bg-slate-700' 
                                                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                                    }`}
                                                >
                                                    <Sparkles size={12} /> Полноценный сеанс {isLocked && '(Premium)'}
                                                </button>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const X: React.FC<{ size?: number, className?: string }> = ({ size = 20, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

export default MuseumView;
