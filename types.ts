
export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export type UserRole = 'GUEST' | 'USER' | 'PREMIUM' | 'ADMIN';

export interface UserAccount {
  id: string;
  email: string;
  role: UserRole;
  password?: string; // Только для локальной БД
  subscriptionActiveUntil?: number;
}

// Типы экстремальных исходов
export type ExtremeOutcome = 
  | 'shutdown'           // Замыкание в себе
  | 'runaway'            // Побег
  | 'verbal_aggression'  // Вербальная агрессия
  | 'physical_aggression'// Физическая агрессия (удар)
  | 'weapon_attack'      // Атака с предметом/оружием
  | 'self_harm'          // Селфхарм
  | 'parasuicide'        // Парасуицидальное поведение
  | 'attack_npc';        // Атака на NPC

// Событие мира (GM) — тип открытый, LLM может генерировать любые события
export interface WorldEvent {
  type: string;           // Тип события: phone_call, npc_enters, emergency, dilemma, other
  description: string;    // Описание для учителя
  dilemma?: string;       // В чём выбор? Какие варианты?
  trust_delta: number;    // Влияние на доверие (выставляется ПОСЛЕ реакции учителя)
  stress_delta: number;   // Влияние на стресс
  npc_name?: string;      // Имя NPC, если появился
  npc_role?: string;      // Роль NPC: завуч, психолог, родитель, одноклассник...
  npc_dialogue?: string;  // Реплика/действие NPC
  npc_stays?: boolean;    // NPC остаётся в сцене (true) или уходит (false)
  requires_response?: boolean; // Событие ждёт реакции учителя
}

// Оценка реакции учителя на событие
export interface EventReaction {
  teacher_action: string;   // Что сделал учитель
  evaluation: string;       // Как ученик это воспринял
  trust_change: number;     // Изменение доверия
  stress_change: number;    // Изменение стресса
  ethics_violation?: string; // Если было нарушение этики — комиссия учтёт
}

// Активный NPC, присутствующий в сцене
export interface ActiveNPC {
  name: string;       // Имя NPC
  role: string;       // Роль: завуч, психолог, родитель...
  action?: string;    // Что делает NPC прямо сейчас
  dialogue?: string;  // Что говорит NPC
}

export interface SimulationState {
  trust: number;
  stress: number;
  thought: string;
  // GM события
  world_event?: WorldEvent;
  // Оценка реакции на предыдущее событие
  event_reaction?: EventReaction;
  // Активный NPC в сцене (если есть)
  active_npc?: ActiveNPC;
  // GM подсказка для админа (не видит учитель!)
  gm_note?: string;
  // Флаг экстремального исхода
  extreme_outcome?: ExtremeOutcome;
  game_over?: boolean;
  violation_reason?: string;
}

// === ГЛОБАЛЬНЫЕ СОБЫТИЯ (НОВАЯ МЕХАНИКА) ===

export interface EventTarget {
  id: string;
  name: string;
  description?: string; // Например "Завуч (ждет ответа)"
}

export interface GlobalEventState {
  isActive: boolean;
  title: string;          // Название события (например "Кража")
  description: string;    // Текущее описание ситуации от ГМ
  bonuses: number;        // Накопленные бонусы
  penalties: number;      // Накопленные штрафы
  availableTargets: EventTarget[]; // Кому можно ответить (макс 6)
  history: Message[];     // История переписки внутри события (изолирована от ученика)
  isCompleted: boolean;   // Событие завершено?
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  non_verbal?: string; // Невербальные действия
  non_verbal_valence?: number; // Окраска невербалики (-1..1)
  state?: SimulationState;
  timestamp: number;
}

export interface TeacherProfile {
  name: string;
  gender: 'male' | 'female';
  settings?: {
    mainCommission: boolean;
    advisoryCommission: boolean;
  };
}

export interface StudentProfile {
  name: string;
  age: number;
  gender: 'male' | 'female';
  avatarUrl?: string;
}

export interface Accentuation {
  id: string;
  name: string;
  description_template: string; 
  intensity_levels: number;
  isPremium?: boolean;
}

// Статус видимости контекста для учителя
export type ContextVisibility = 'known' | 'rumor' | 'secret';

export interface VisibilityWeights {
  known: number;
  rumor: number;
  secret: number;
}

export interface ContextModule {
  id: string;
  category: 'incident' | 'background';
  name: string;
  prompt_text: string;
  teacher_briefing: string;
  hidden_agenda: string; 
  initial_trust: number; 
  initial_stress: number; 
  weight: number; 
  isPremium?: boolean;
  isCustom?: boolean; // Флаг для пользовательских контейнеров
  
  // Несовместимости
  conflicts: string[];                      // ID несовместимых контейнеров
  incompatible_accentuations?: string[];    // ID несовместимых акцентуаций
  incompatible_genders?: ('male' | 'female')[]; // Несовместимые полы
  min_age?: number;                         // Минимальный возраст
  max_age?: number;                         // Максимальный возраст
  
  // Только для background - веса вероятности статуса видимости
  visibility_weights?: VisibilityWeights;
}

// Контекст с определённым статусом видимости (для сессии)
export interface SessionContext {
  module: ContextModule;
  visibility: ContextVisibility;
}

export interface GlobalSettings {
  chat_temperature: number;
  analysis_temperature: number;
}

export interface CommissionFeedback {
  role: string;
  name: string;
  verdict: string;
  score: number;
}

// === ОСНОВНАЯ КОМИССИЯ (влияет на итоговый балл) ===
export interface MainCommissionMember {
  id: string;
  name: string;
  role: string;
  specialty: string;
  evaluationFocus: string;  // На что обращает внимание
  prompt: string;           // Системный промпт для генерации вердикта
}

// === СОВЕЩАТЕЛЬНАЯ КОМИССИЯ (не влияет на балл, триггерная) ===
export type AdvisoryMemberType = 
  | 'zlatogorsky'      // Олигарх-попечитель
  | 'nasonov'          // Партийный функционер
  | 'upalnamochenov'   // Участковый ПДН
  | 'onufry'           // Боевой священник
  | 'timokha'          // Зумер-блогер (всегда активен)
  | 'zashchitnikova'   // Гиперопекающая мать
  | 'oboronosposobnov' // Военрук
  | 'svetovzor'        // Инста-психолог
  | 'pravdorub';       // Анонимный хейтер (20% шанс)

export interface AdvisoryCommissionMember {
  id: AdvisoryMemberType;
  name: string;
  title: string;
  age: number;
  triggers: string[];         // Ключевые слова/темы для пробуждения
  alwaysActive?: boolean;     // Для Тимохи
  randomChance?: number;      // Для Правдоруба (0.2 = 20%)
  prompt: string;             // Полный промпт персонажа
  conflictsWith?: AdvisoryMemberType[]; // С кем конфликтует в "Аквариуме"
}

export interface AdvisoryFeedback {
  member: AdvisoryCommissionMember;
  verdict: string;
  score?: number;             // Опциональная оценка (не влияет на итог)
  triggered_by?: string[];    // Какие триггеры сработали
}

// Обсуждение в "Аквариуме" (премиум)
export interface AquariumDialogue {
  speaker: AdvisoryMemberType;
  speakerName: string;
  text: string;
  replyTo?: AdvisoryMemberType;
}

export interface AnalysisResult {
  overall_score: number;
  summary: string;
  // Основная комиссия (влияет на балл)
  commission: CommissionFeedback[];
  // Совещательная комиссия (не влияет на балл)
  advisory?: AdvisoryFeedback[];
  // Обсуждение "Аквариум" (премиум)
  aquarium?: AquariumDialogue[];
  timestamp: number;
}

export interface TerminationThresholds {
  runaway_stress: number;
  runaway_trust: number;
  shutdown_stress: number;
  shutdown_trust: number;
}

export interface ActiveSession {
  teacher: TeacherProfile;
  student: StudentProfile;
  constructedPrompt: string;
  chaosDetails: {
    accentuation: string;
    intensity: number;
    modules: string[];
    starting_trust: number;
    starting_stress: number;
    thresholds: TerminationThresholds;
    contextSummary: string;
    // Новые поля для контекстов с visibility
    contexts?: SessionContext[];
    incident?: ContextModule;
  };
  // Активное глобальное событие (если есть)
  activeGlobalEvent?: GlobalEventState;
}

export interface SessionLog {
  id: string;
  timestamp: number;
  duration_seconds: number;
  teacher: TeacherProfile;
  student_name: string;
  scenario_description: string; 
  status: string;
  messages: Message[];
  result?: AnalysisResult; 
  sessionSnapshot?: ActiveSession;
  // Для архивирования
  userId?: string;
  userEmail?: string;
  // Для импортированных сессий
  importedFrom?: string; // ID оригинальной сессии
  importedAt?: number;   // Timestamp импорта
}

export interface Scenario {
  id: string;
  base_system_prompt: string;
}

export type SessionStatus = 'active' | 'completed' | 'manual' | 'interrupted';

// ============================================
// ДЕМО-РЕЖИМ (Музейная экспозиция)
// ============================================

export type DemoPhase = 'intro' | 'observation' | 'choice' | 'result' | 'summary';

// Реплика в демо-диалоге
export interface DemoDialogueLine {
  speaker: 'teacher' | 'student' | 'curator' | 'system';
  text: string;
  emotion?: string;           // Эмоциональное состояние (для студента)
  commentary?: string;        // Комментарий куратора (всплывает после реплики)
  isError?: boolean;          // Ошибка учителя (подсветить)
  trustDelta?: number;        // Изменение доверия
  stressDelta?: number;       // Изменение стресса
  delay?: number;             // Задержка перед показом (мс)
}

// Вариант выбора в интерактивной точке
export interface DemoChoice {
  id: string;
  text: string;               // Текст реплики учителя
  quality: 'good' | 'neutral' | 'bad';
  studentReaction: string;    // Реакция подростка
  explanation: string;        // Объяснение куратора, почему так
  trustDelta: number;
  stressDelta: number;
}

// Интерактивная развилка
export interface DemoChoicePoint {
  situation: string;          // Описание момента
  curatorHint?: string;       // Подсказка куратора перед выбором
  choices: DemoChoice[];
}

// Полный демо-сценарий для акцентуации
export interface DemoScenario {
  accentuationId: string;
  accentuationName: string;
  
  // Вступление
  intro: {
    curatorText: string;      // Вступительное слово куратора
    keyMarkers: string[];     // Ключевые маркеры акцентуации
    triggers: string[];       // Типичные триггеры
    avoid: string[];          // Чего избегать
  };
  
  // Автоматический диалог для наблюдения
  observationDialogue: DemoDialogueLine[];
  
  // Интерактивная точка "А как бы вы?"
  choicePoint: DemoChoicePoint;
  
  // Итоговые рекомендации
  summary: {
    whatWorks: string[];      // Что работает с этим типом
    whatToAvoid: string[];    // Чего избегать
    keyInsight: string;       // Главный инсайт
  };
}

