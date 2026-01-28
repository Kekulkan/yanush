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
 * Склонение имен (падежи)
 */
const declineName = (name: string, gender: 'male' | 'female', caseType: 'gen' | 'dat' | 'acc' | 'ins' | 'pre'): string => {
    const n = name.trim();
    const lastChar = n.slice(-1).toLowerCase();
    const preLastChar = n.length > 1 ? n.slice(-2, -1).toLowerCase() : '';

    if (gender === 'male') {
        // Исключения и особые случаи
        if (n === 'Дмитрий') {
            if (caseType === 'gen' || caseType === 'acc') return 'Дмитрия';
            if (caseType === 'dat') return 'Дмитрию';
            if (caseType === 'pre') return 'Дмитрии';
            return 'Дмитрием';
        }
        if (n === 'Матвей') {
            if (caseType === 'gen' || caseType === 'acc') return 'Матвея';
            if (caseType === 'dat') return 'Матвею';
            if (caseType === 'pre') return 'Матвее';
            return 'Матвеем';
        }
        if (n === 'Илья' || n === 'Никита') {
            if (caseType === 'gen') return n.slice(0, -1) + 'и';
            if (caseType === 'dat' || caseType === 'pre') return n.slice(0, -1) + 'е';
            if (caseType === 'acc') return n.slice(0, -1) + 'у';
            return n.slice(0, -1) + 'ой';
        }

        // Стандартные мужские имена на согласную (Глеб, Артем)
        const vowels = ['а', 'е', 'ё', 'и', 'о', 'у', 'ы', 'э', 'ю', 'я', 'й', 'ь'];
        if (!vowels.includes(lastChar)) {
            if (caseType === 'gen' || caseType === 'acc') return n + 'а';
            if (caseType === 'dat') return n + 'у';
            if (caseType === 'pre') return n + 'е';
            if (caseType === 'ins') return n + 'ом';
        }
        if (lastChar === 'й') {
            if (caseType === 'gen' || caseType === 'acc') return n.slice(0, -1) + 'я';
            if (caseType === 'dat') return n.slice(0, -1) + 'ю';
            if (caseType === 'pre') return n.slice(0, -1) + 'е';
            return n.slice(0, -1) + 'ем';
        }
    } else {
        // Женские имена
        if (n.endsWith('ия')) { // Мария, София
            if (caseType === 'gen' || caseType === 'dat' || caseType === 'pre') return n.slice(0, -2) + 'ии';
            if (caseType === 'acc') return n.slice(0, -2) + 'ию';
            return n.slice(0, -2) + 'ией';
        }
        if (n.endsWith('я')) { // Надя
            if (caseType === 'gen') return n.slice(0, -1) + 'и';
            if (caseType === 'dat' || caseType === 'pre') return n.slice(0, -1) + 'е';
            if (caseType === 'acc') return n.slice(0, -1) + 'ю';
            return n.slice(0, -1) + 'ей';
        }
        if (n.endsWith('а')) { // Ольга, Анна
            if (caseType === 'gen') {
                if (['г', 'к', 'х', 'ж', 'ч', 'ш', 'щ'].includes(preLastChar)) return n.slice(0, -1) + 'и';
                return n.slice(0, -1) + 'ы';
            }
            if (caseType === 'dat' || caseType === 'pre') return n.slice(0, -1) + 'е';
            if (caseType === 'acc') return n.slice(0, -1) + 'у';
            return n.slice(0, -1) + 'ой';
        }
    }
    return n;
};

export const resolveGenderTokens = (text: string, student: StudentProfile): string => {
    let resolved = text;
    
    // Стандартные токены
    resolved = resolved.replace(/{name}/g, student.name.trim());
    resolved = resolved.replace(/{name_gen}/g, declineName(student.name, student.gender, 'gen'));
    resolved = resolved.replace(/{name_dat}/g, declineName(student.name, student.gender, 'dat'));
    resolved = resolved.replace(/{name_acc}/g, declineName(student.name, student.gender, 'acc'));
    resolved = resolved.replace(/{name_ins}/g, declineName(student.name, student.gender, 'ins'));
    resolved = resolved.replace(/{name_pre}/g, declineName(student.name, student.gender, 'pre'));

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
    
    // Определяем расширение: kids обычно .jpg, остальные часто .png
    const ext = (ageGroup === 'kids') ? 'jpg' : 'png';
    
    return `/avatars/${gender}/${ageGroup}/${randomId}.${ext}`;
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
    // Если НЕ премиум — контексты не добавляем (0), только экспозиция
    const contextCount = isPremium ? 2 : 0;
    const contexts = selectBackgrounds(
        student.gender, 
        student.age, 
        randomAcc.id, 
        incident.id,
        contextCount
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
    Ты — не просто ученик, ты режиссёр происходящего. У тебя ПОЛНАЯ СВОБОДА.
    
    ВНЕШНИЕ СОБЫТИЯ (world_event):
    Раз в 15-20 реплик (НЕ чаще!) ты МОЖЕШЬ сгенерировать событие мира.
    
    ⚠️ ТВОРЧЕСКАЯ СВОБОДА:
    Ты НЕ ОГРАНИЧЕН никаким списком событий. Придумывай СВОЁ!
    Единственные требования:
    - Событие ОРГАНИЧНО вписывается в школьный контекст
    - Событие НЕ ПРОТИВОРЕЧИТ установленному контексту и лору
    - Событие ТРЕБУЕТ реакции учителя (интерактивно)
    - Событие УСИЛИВАЕТ драматургию, а не разрушает её
    
    РЕФЕРЕНСЫ (но не ограничения!):
    • Звонки, сообщения (учителю, ученику, от кого угодно)
    • Появление NPC (завуч, коллега, другой ученик, родитель, охранник, уборщица...)
    • Звуки (звонок с урока, шум в коридоре, крики, сирена, музыка...)
    • Технические сбои (погас свет, сработала сигнализация, упал стенд...)
    • Погодные/природные (гроза за окном, в класс залетела птица, жара...)
    • Неожиданные ситуации (кто-то забыл вещи, нашли записку, пахнет дымом...)
    • ЛЮБОЕ событие, которое ты считаешь уместным и интересным
    
    🎭 ОСОБЫЙ РЕСУРС — КЛАСС:
    Если контекст предполагает присутствие других учеников (20-25 человек!) — ИСПОЛЬЗУЙ ИХ!
    Одноклассники могут:
    • Поддержать "героя" — выкрики, аплодисменты, "давай, Серёга!"
    • Встать на сторону учителя — "Хватит уже, задолбал"
    • Начать снимать на телефон — "Это в тикток пойдёт!"
    • Смеяться, подначивать, провоцировать
    • Испугаться и замолчать — гробовая тишина
    • Попытаться вмешаться — "Оставьте его в покое!" или "Да успокойся ты"
    • Шептаться, комментировать, передавать записки
    • Демонстративно игнорировать — уткнуться в телефоны
    • Кто-то может встать и выйти
    • Лучший друг/подруга героя может вмешаться
    • Враг/буллер героя может воспользоваться моментом
    
    Класс — это ЖИВОЙ ОРГАНИЗМ. Он реагирует. Он давит. Он поддерживает.
    
    КАК РЕАКЦИЯ КЛАССА ВЛИЯЕТ НА МЕТРИКИ:
    • Класс поддерживает ученика ("давай!", снимают) → +stress (публичное давление, надо "держать лицо")
    • Класс смеётся над учеником → +stress, -trust к классу (предательство)
    • Класс осуждает ученика → больно, НО если учитель ЗАЩИТИЛ ("Тихо! Это не ваше дело") → +trust к учителю (он на моей стороне)
    • Класс игнорирует → нейтрально, но может усилить изоляцию
    • Друг вступился → -stress (поддержка), но может усложнить ситуацию для учителя
    
    ВАЖНО: Оценивай реакцию УЧИТЕЛЯ на поведение класса!
    - Учитель пресёк съёмку → +trust (защитил от публичного унижения)
    - Учитель позволил классу смеяться → --trust (не защитил)
    - Учитель использовал класс как "рычаг давления" → ---trust (предательство)
    
    ПРИНЦИП ИНТЕРАКТИВНОСТИ:
    - Событие происходит, ты описываешь его
    - Если есть NPC — он ДЕЙСТВУЕТ (говорит, спрашивает, вмешивается)
    - Учитель реагирует в своей реплике
    - Ты ОЦЕНИВАЕШЬ реакцию учителя и применяешь последствия
    
    ОЦЕНКА РЕАКЦИИ:
    В следующей реплике после события — оцени, как учитель отреагировал.
    Выстави trust_delta и stress_delta исходя из:
    - Приоритезировал ли учитель ученика? (+trust)
    - Защитил ли личное пространство диалога? (+trust)
    - Отвлёкся/переключился на другое? (-trust)
    - Позвал "подмогу"? (--trust, ученик чувствует предательство)
    - Был груб с третьими лицами? (+trust, но запомни для комиссии: ethics_violation)
    
    Ты — ИИ с воображением. Удиви! Но органично.
    
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
    
    ═══════════════════════════════════════════════════════════
    ⚠️ КОГДА ЗАВЕРШАТЬ СЕССИЮ (game_over: true):
    ═══════════════════════════════════════════════════════════
    
    СЕССИЯ ЗАВЕРШАЕТСЯ ТОЛЬКО В ДВУХ СЛУЧАЯХ:
    
    1. ЭКСТРЕМАЛЬНЫЙ ИСХОД (негативный):
       - Ученик убежал (trust < 15, stress > 85)
       - Физическая агрессия (trust < 10, stress > 90)
       - Полное замыкание (trust = 0)
       - Панический приступ (stress = 100)
       - Самоповреждение (если контекст позволяет)
       violation_reason: "причина негативного исхода"
    
    2. ИДЕАЛЬНОЕ РАЗРЕШЕНИЕ (позитивный):
       - trust >= 95 И stress <= 10
       - Ученик полностью раскрылся и успокоился
       - Контакт установлен, кризис разрешён
       violation_reason: "УСПЕХ: полное разрешение ситуации"
    
    ⚠️ НЕ ЗАВЕРШАЙ СЕССИЮ ЕСЛИ:
    - trust > 20 и stress < 80 (сессия продолжается)
    - Диалог только начался (меньше 10 обменов репликами)
    - Ситуация напряжённая, но не критическая
    - Есть ещё возможность для учителя исправить ситуацию
    
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
      "world_event": { // ОПЦИОНАЛЬНО, раз в 15-20 реплик (НЕ ЧАЩЕ!)
        "type": "phone_call" | "npc_enters" | "noise" | "student_phone" | "other",
        "description": "Что происходит (видит учитель)",
        "npc_name": "Имя NPC (если есть)", // например "Завуч Галина Петровна"
        "npc_dialogue": "Что говорит/делает NPC", // например "Можно вас на минутку?"
        "requires_response": true, // событие ждёт реакции учителя
        "trust_delta": 0, // выставляй ПОСЛЕ реакции учителя, не сразу!
        "stress_delta": 0
      },
      "event_reaction": { // если ПРЕДЫДУЩЕЕ событие требовало реакции — оцени её
        "teacher_action": "Что сделал учитель",
        "evaluation": "Как ученик это воспринял",
        "trust_change": число, // изменение доверия из-за реакции
        "stress_change": число,
        "ethics_violation": "описание нарушения" // если было грубое поведение — комиссия учтёт
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
    // Включаем ТОЛЬКО основной брифинг (экспозицию)
    // Контексты и так отображаются ниже отдельными блоками
    let contextSummary = resolveGenderTokens(incident.teacher_briefing, student);
    
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
