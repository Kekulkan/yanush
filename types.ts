
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
  type: string;           // Любой тип события (LLM свободна в выборе)
  description: string;    // Описание для учителя
  trust_delta: number;    // Влияние на доверие
  stress_delta: number;   // Влияние на стресс
  npc_name?: string;      // Имя NPC, если появился
  npc_dialogue?: string;  // Реплика NPC, если есть
}

export interface SimulationState {
  trust: number;
  stress: number;
  thought: string;
  // GM события
  world_event?: WorldEvent;
  // Флаг экстремального исхода
  extreme_outcome?: ExtremeOutcome;
  game_over?: boolean;
  violation_reason?: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string; 
  state?: SimulationState; 
  timestamp: number;
}

export interface TeacherProfile {
  name: string;
  gender: 'male' | 'female';
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
}

export interface Scenario {
  id: string;
  base_system_prompt: string;
}

export type SessionStatus = 'active' | 'completed' | 'manual' | 'interrupted';
