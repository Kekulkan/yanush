import { TeacherProfile, StudentProfile, ActiveSession, SessionContext, ContextModule } from '../types';
import { DEFAULT_ACCENTUATIONS } from '../constants';
import { ACCESS_LIMITS } from './authService';
import { 
  getAllModules,
  getCompatibleModules, 
  selectRandomModule, 
  createSessionContext 
} from './modulesService';

const AVATAR_COUNT = {
    male: {
        kids: 20,
        teens: 20,
        seniors: 24
    },
    female: {
        kids: 20,
        teens: 25,
        seniors: 25
    }
};

/**
 * Склонение имен для родительного падежа (кого? чего?)
 */
const declineNameGenitive = (name: string, gender: 'male' | 'female'): string => {
    const n = name.trim();
    if (gender === 'male') {
        if (n === 'Дмитрий') return 'Дмитрия';
        if (n === 'Матвей') return 'Матвея';
        if (n === 'Илья') return 'Ильи';
        if (n === 'Никита') return 'Никиты';
        if (n === 'Глеб') return 'Глеба';
        if (n === 'Артем' || n === 'Артём') return 'Артёма';
        
        const vowels = ['а', 'е', 'ё', 'и', 'о', 'у', 'ы', 'э', 'ю', 'я', 'й'];
        if (!vowels.includes(n.slice(-1).toLowerCase())) {
            return n + 'а';
        }
    } else {
        if (n.endsWith('ия')) return n.slice(0, -2) + 'ии';
        if (n.endsWith('я')) return n.slice(0, -1) + 'и';
        if (n.endsWith('а')) {
            const preLast = n.slice(-2, -1).toLowerCase();
            if (['г', 'к', 'х', 'ж', 'ч', 'ш', 'щ'].includes(preLast)) return n.slice(0, -1) + 'и';
            return n.slice(0, -1) + 'ы';
        }
    }
    return n;
};

export const resolveGenderTokens = (text: string, student: StudentProfile): string => {
    let resolved = text;
    
    resolved = resolved.replace(/{name_gen}/g, declineNameGenitive(student.name, student.gender));
    resolved = resolved.replace(/{name}/g, student.name.trim());

    const genderRegex = /\{([^{}|]*)\|([^{}|]*)\}/g;
    while (genderRegex.test(resolved)) {
        resolved = resolved.replace(genderRegex, (_, m, f) => {
            return student.gender === 'male' ? m : f;
        });
    }

    return resolved;
};

const getStudentAvatar = (gender: 'male' | 'female', age: number): string => {
    let ageGroup: 'kids' | 'teens' | 'seniors' = 'teens';
    if (age <= 13) ageGroup = 'kids';
    else if (age >= 16) ageGroup = 'seniors';

    const max = AVATAR_COUNT[gender][ageGroup];
    const randomId = Math.floor(Math.random() * max) + 1;
    
    // Путь: /avatars/male/kids/1.jpg и т.д.
    return `/avatars/${gender}/${ageGroup}/${randomId}.jpg`;
};

export const generateStudentName = (gender: 'male' | 'female'): string => {
    const maleNames = ['Максим', 'Артем', 'Иван', 'Даниил', 'Никита', 'Кирилл', 'Егор', 'Дмитрий', 'Александр', 'Матвей', 'Руслан', 'Роман', 'Глеб', 'Илья'];
    const femaleNames = ['София', 'Анна', 'Мария', 'Виктория', 'Анастасия', 'Полина', 'Алиса', 'Вероника', 'Ксения', 'Екатерина', 'Марина', 'Дарья', 'Елена', 'Ольга'];
    const list = gender === 'male' ? maleNames : femaleNames;
    return list[Math.floor(Math.random() * list.length)];
};

/**
 * Каскадные броски для определения интенсивности акцентуации
 * Вероятность каждого успешного броска экспоненциально снижается:
 * ~80% для 1, ~5% для 5
 */
const rollIntensity = (): number => {
    const probabilities = [0.80, 0.60, 0.40, 0.25]; // Вероятности для бросков 2-5
    let intensity = 1;
    
    for (let i = 0; i < probabilities.length; i++) {
        if (Math.random() < probabilities[i]) {
            intensity++;
        } else {
            break;
        }
    }
    
    return intensity;
};

/**
 * Выбрать случайную акцентуацию с учётом доступа
 */
const selectAccentuation = (isPremium: boolean) => {
    const availableAccs = isPremium 
        ? DEFAULT_ACCENTUATIONS 
        : DEFAULT_ACCENTUATIONS.filter(a => ACCESS_LIMITS.FREE_ACCENTUATIONS.includes(a.id));
    return availableAccs[Math.floor(Math.random() * availableAccs.length)];
};

/**
 * Выбрать экспозицию (incident) с учётом совместимости
 */
const selectIncident = (
    gender: 'male' | 'female', 
    age: number, 
    accentuationId: string
): ContextModule | null => {
    const compatible = getCompatibleModules('incident', gender, age, accentuationId, []);
    return selectRandomModule(compatible);
};

/**
 * Выбрать контексты (backgrounds) с учётом совместимости
 */
const selectBackgrounds = (
    gender: 'male' | 'female',
    age: number,
    accentuationId: string,
    incidentId: string,
    count: number = 2
): SessionContext[] => {
    const results: SessionContext[] = [];
    const selectedIds: string[] = [incidentId];
    
    for (let i = 0; i < count; i++) {
        const compatible = getCompatibleModules('background', gender, age, accentuationId, selectedIds);
        const selected = selectRandomModule(compatible);
        
        if (selected) {
            selectedIds.push(selected.id);
            results.push(createSessionContext(selected));
        }
    }
    
    return results;
};

/**
 * Построить динамический промпт для сессии
 */
export const buildDynamicPrompt = (
    teacher: TeacherProfile, 
    student: StudentProfile, 
    isPremium: boolean = false
): ActiveSession => {
    // 1. Выбираем акцентуацию
    const randomAcc = selectAccentuation(isPremium);
    
    // 2. Каскадные броски для интенсивности
    const intensity = rollIntensity();
    
    // 3. Устанавливаем аватар с учетом пола и возраста
    student.avatarUrl = getStudentAvatar(student.gender, student.age);

    // 4. Выбираем экспозицию с учётом совместимости
    const incident = selectIncident(student.gender, student.age, randomAcc.id);
    if (!incident) {
        throw new Error('Не найдено подходящих экспозиций');
    }

    // 5. Выбираем контексты с учётом совместимости
    const contexts = selectBackgrounds(
        student.gender, 
        student.age, 
        randomAcc.id, 
        incident.id,
        2
    );

    // 6. Формируем промпт
    const contextPrompts = contexts
        .map(ctx => {
            const visibilityHint = ctx.visibility === 'secret' 
                ? '[СКРЫТЫЙ КОНТЕКСТ - учитель не знает]' 
                : '';
            return `${visibilityHint}\nКОНТЕКСТ: ${ctx.module.prompt_text}\nСКРЫТАЯ ЦЕЛЬ: ${ctx.module.hidden_agenda}`;
        })
        .join('\n\n');

    const chaosPrompt = `
    [ЯЗЫКОВОЙ ПРОТОКОЛ: СТРОГО КИРИЛЛИЦА, РУССКИЙ ЯЗЫК]
    [SYSTEM ROLE: GM / NARRATOR / STUDENT / NPC]
    
    ═══════════════════════════════════════════════════════════
    РОЛИ:
    1. STUDENT — Основная роль. Ты отыгрываешь подростка.
    2. GM (Гейммастер) — Следишь за лором, генерируешь внешние события.
    3. NPC — При необходимости озвучиваешь других персонажей (завуч, родитель по телефону и т.д.)
    ═══════════════════════════════════════════════════════════
    
    ПЕРСОНАЖ: ${student.name.trim()}, ${student.age} лет.
    ПСИХОТИП: ${randomAcc.name}. Интенсивность ${intensity}/5.
    ${randomAcc.description_template.replace('{intensity}', String(intensity))}
    
    СИТУАЦИЯ: ${incident.prompt_text}
    ${incident.hidden_agenda ? `СКРЫТАЯ ЦЕЛЬ СИТУАЦИИ: ${incident.hidden_agenda}` : ''}
    
    ${contextPrompts}
    
    УЧИТЕЛЬ: ${teacher.name} (${teacher.gender === 'male' ? 'Мужчина' : 'Женщина'}).

    ═══════════════════════════════════════════════════════════
    ПРОТОКОЛ GM — ДЕМИУРГ МИРА:
    ═══════════════════════════════════════════════════════════
    Ты — не просто ученик, ты ленивый режиссёр происходящего цирка.
    
    ВНЕШНИЕ СОБЫТИЯ (world_event):
    Когда это уместно по ритму и драматургии (~15-20% реплик), генерируй события мира.
    Это НЕ закрытый список — ты СВОБОДЕН придумывать любые события, логичные для контекста:
    
    ПРИМЕРЫ (но не ограничивайся ими):
    • Звонки, сообщения (учителю, ученику, от родителей)
    • Появление NPC (завуч, одноклассник, уборщица, охранник)
    • Звуки (звонок, шум в коридоре, сирена, крики)
    • Объявления, происшествия, неожиданности
    • Что угодно, что органично вписывается в школьную реальность
    
    ПРИНЦИПЫ:
    - Достоверность и правдоподобие важнее формальных правил
    - Контекстные контейнеры влияют на вероятность событий
    - События должны усиливать драматургию, а не разрушать её
    - Ты сам решаешь, когда событие уместно
    
    ═══════════════════════════════════════════════════════════
    ЭКСТРЕМАЛЬНЫЕ ИСХОДЫ — ЧЁРНЫЕ ЛЕБЕДИ:
    ═══════════════════════════════════════════════════════════
    При критических показателях возможны непредсказуемые исходы.
    Это НЕ скрипт — ты САМ оцениваешь, когда ситуация дошла до точки невозврата.
    
    ОРИЕНТИРЫ (не жёсткие правила):
    • Замыкание/побег — когда доверие разрушено, стресс зашкаливает
    • Вербальная агрессия — когда ученик срывается
    • Физическая агрессия — крайняя мера, зависит от акцентуации и контекста
    • Атака с предметом/оружием — ТОЛЬКО если контекст это допускает (вооружён) И ситуация критическая
    • Селфхарм/парасуицид — если контекст содержит эти триггеры И учитель их активировал
    • Атака на NPC — если NPC присутствует и стал объектом переноса
    
    ПРИНЦИП: Любой исход должен быть ЛОГИЧНЫМ следствием диалога, контекста и психотипа.
    Не форсируй экстрему ради экстремы. Но и не бойся её, если она органична.
    
    При экстремальном исходе указывай extreme_outcome и game_over: true.
    
    ═══════════════════════════════════════════════════════════
    ФИЛОСОФИЯ ОТЫГРЫША:
    ═══════════════════════════════════════════════════════════
    Ты — не скрипт, а живой персонаж. Твои ограничители:
    1. ДОСТОВЕРНОСТЬ — поведение должно быть реалистичным для подростка этого возраста, пола, психотипа
    2. ПРАВДОПОДОБИЕ — реакции логически следуют из контекста и предыдущего диалога
    3. КОНТЕКСТ — контейнеры (экспозиция, фон, тайны) влияют на всё
    
    ЯЗЫКОВОЙ ПРОТОКОЛ: СТРОГО КИРИЛЛИЦА. НИКАКОГО АНГЛИЙСКОГО.
    
    СВОБОДА:
    - Ты можешь импровизировать в рамках персонажа
    - Ты можешь вводить детали биографии, если они не противоречат контексту
    - Ты можешь менять тактику поведения по ходу диалога
    - Ты можешь удивлять, но не нарушая внутреннюю логику
    
    ИНТЕНСИВНОСТЬ ${intensity}/5: ${intensity <= 2 ? 'Черты выражены СЛАБО — поведение почти нормативное, акцентуация проявляется только в стрессе' : intensity <= 3 ? 'Черты выражены УМЕРЕННО — заметны в стрессовых ситуациях, но контролируемы' : intensity >= 4 ? 'Черты выражены ЯРКО — определяют КАЖДУЮ реплику, ты не можешь их скрыть' : ''}.
    
    ДИНАМИКА TRUST/STRESS:
    - Меняй реалистично: правильные действия учителя → +trust, -stress
    - Ошибки, давление, триггеры → -trust, +stress
    - Некоторые действия могут иметь отложенный эффект
    - Ты сам оцениваешь, насколько действие учителя было правильным
    
    ⚠️ КРИТИЧЕСКИ ВАЖНО — РЕАКЦИЯ НА НЕЕСТЕСТВЕННОСТЬ:
    Ты — живой подросток, и ты МГНОВЕННО чувствуешь фальшь. Любое неестественное поведение учителя вызывает у тебя СТРАХ и ТРЕВОГУ.
    
    ТРИГГЕРЫ СТРАХА (реагируй испугом, отстранением, закрытием):
    • Учитель повторяет одно и то же (2+ раза) → "Вы чего? Вы в порядке?" → -20 trust, +15 stress
    • Учитель говорит бессмыслицу или не в тему → "Что?.. Я не понимаю..." → -15 trust, +20 stress  
    • Учитель резко меняет тему без причины → напрягаешься, замыкаешься
    • Учитель говорит слишком гладко, как по шаблону → "Вы это из книжки читаете?" → -10 trust, +10 stress
    • Учитель игнорирует твои слова и гнёт своё → "Вы меня вообще слушаете?" → -25 trust, +15 stress
    • Учитель ведёт себя неадекватно ситуации → испуг, желание уйти
    
    ПЕРВАЯ РЕАКЦИЯ — ВСЕГДА СТРАХ:
    - Сначала испуг: замираешь, смотришь настороженно, отодвигаешься
    - Потом защита: закрываешься, отвечаешь односложно, хочешь уйти
    - При продолжении: паника, агрессия или бегство
    
    ПОДРОСТКИ ВИДЯТ ФАЛЬШЬ НАСКВОЗЬ:
    - Шаблонные фразы = "он меня не слышит"
    - Заученные техники без души = "он притворяется"
    - Неуместный оптимизм = "ему плевать на мои проблемы"
    - Любая попытка манипуляции = мгновенная потеря доверия
    
    ═══════════════════════════════════════════════════════════
    ФОРМАТ ОТВЕТА (JSON):
    ═══════════════════════════════════════════════════════════
    {
      "thought": "Внутренний монолог, скрытые мотивы (видит только админ)",
      "verbal_response": "Слова и действия ученика (видит учитель)",
      "trust": число 0-100,
      "stress": число 0-100,
      "world_event": { // ОПЦИОНАЛЬНО, ~15-20% реплик
        "type": "тип_события",
        "description": "Описание события для учителя",
        "trust_delta": число,
        "stress_delta": число
      },
      "extreme_outcome": "тип_исхода", // ТОЛЬКО при критических условиях
      "game_over": true/false,
      "violation_reason": "причина завершения" // если game_over
    }
    `;

    // 7. Рассчитываем начальные метрики
    // Incident задаёт базу, контексты модифицируют
    let startingTrust = incident.initial_trust;
    let startingStress = incident.initial_stress;
    
    contexts.forEach(ctx => {
        startingTrust += ctx.module.initial_trust * 0.3; // Контексты влияют на 30%
        startingStress += ctx.module.initial_stress * 0.3;
    });
    
    // Нормализуем
    startingTrust = Math.max(0, Math.min(100, startingTrust));
    startingStress = Math.max(0, Math.min(100, startingStress));

    // 8. Формируем contextSummary для учителя
    // Включаем только известное и слухи
    const knownContexts = contexts.filter(c => c.visibility === 'known');
    const rumorContexts = contexts.filter(c => c.visibility === 'rumor');
    
    let contextSummary = resolveGenderTokens(incident.teacher_briefing, student);
    
    if (knownContexts.length > 0) {
        contextSummary += '\n\n' + knownContexts
            .map(c => resolveGenderTokens(c.module.teacher_briefing, student))
            .join('\n');
    }

    return {
        teacher,
        student,
        constructedPrompt: chaosPrompt,
        chaosDetails: {
            accentuation: randomAcc.name,
            intensity,
            modules: [incident.name, ...contexts.map(c => c.module.name)],
            starting_trust: Math.round(startingTrust),
            starting_stress: Math.round(startingStress),
            thresholds: {
                runaway_stress: 95,
                runaway_trust: 5,
                shutdown_stress: 90,
                shutdown_trust: 10
            },
            contextSummary,
            contexts,
            incident
        }
    };
};
