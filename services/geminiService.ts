// services/geminiService.ts
import { Message, MessageRole, GlobalSettings, AnalysisResult, AdvisoryFeedback, SessionContext, WorldEvent } from "../types";
import { DEFAULT_SETTINGS } from "../constants";
import { 
  buildMainCommissionPrompt, 
  buildAdvisoryCommissionPrompt, 
  getActiveAdvisoryMembers,
  ADVISORY_COMMISSION
} from "./commissionService";
import { buildGMPrompt } from "../prompts/gmPrompt";

type GeminiChatResponse = {
  text: string;
  thought: string | null;
  non_verbal: string | null;
  non_verbal_valence: number;
  trust: number;
  stress: number;
  world_event: {
    type: string;
    description: string;
    trust_delta: number;
    stress_delta: number;
    npc_name?: string;
    npc_dialogue?: string;
    requires_response?: boolean;
  } | null;
  event_reaction: {
    teacher_action: string;
    evaluation: string;
    trust_change: number;
    stress_change: number;
    ethics_violation?: string;
  } | null;
  game_over: boolean;
  violation_reason?: string | null;
  extreme_outcome?: string | null; // physical_aggression | runaway | shutdown | selfharm | etc
  active_npc?: {
    name: string;
    role: string;
    action?: string;
    dialogue?: string;
  } | null;
  gm_note?: string | null;
  /** Заполняется только при срабатывании защиты от резкого обрыва — чтобы в сессии было видно, почему и что модель хотела вернуть */
  safeguard_applied?: {
    reason: 'abrupt_end_prevented';
    previous_trust: number;
    previous_stress: number;
    model_returned_trust: number;
    model_returned_stress: number;
    model_violation_reason?: string | null;
  };
};

// ============ ВЫБОР ПРОВАЙДЕРА ============
// "openrouter" — OpenRouter.ai (DeepSeek, Claude, Gemini и др.)
// "aitunnel" — AITUNNEL (российский сервер, без VPN)
// "claude" — Claude Sonnet через proxyapi.ru
// "gemini" — Gemini через proxyapi.ru
const AI_PROVIDER: "openrouter" | "aitunnel" | "claude" | "gemini" = "openrouter";

// Модели для OPENROUTER (OpenAI-совместимый формат)
// Ученик — Claude 3.7 Sonnet (лучше всего держит русский и психотип)
const OPENROUTER_CHAT_MODEL = "anthropic/claude-3.7-sonnet:thinking";
const OPENROUTER_CHAT_FALLBACK = "anthropic/claude-3.7-sonnet";
// Комиссия/анализ — тоже Claude, чтобы вердикты были внятные по‑русски
const OPENROUTER_ANALYSIS_MODEL = "anthropic/claude-3.7-sonnet:thinking";
// Суфлёр — Claude без thinking (быстрее), мыслей ученика всё равно не видит
const OPENROUTER_GHOST_MODEL = "anthropic/claude-3.7-sonnet";
// GM — отдельная модель Mistral Large 2411 для генерации событий и проверки развязки
const OPENROUTER_GM_MODEL = "mistralai/mistral-large-2411";

// Модели для AITUNNEL (OpenAI-совместимый формат)
// Pro = умнее, Flash = быстрее/стабильнее (fallback)
const AITUNNEL_CHAT_MODEL = "gemini-2.5-pro";          // Умная модель для ученика
const AITUNNEL_CHAT_FALLBACK = "gemini-2.5-flash";    // Fallback если pro упадёт
const AITUNNEL_ANALYSIS_MODEL = "gemini-2.5-flash";   // Для комиссии хватит flash
const AITUNNEL_GHOST_MODEL = "gemini-2.5-pro"; // Для суфлёра нужна высокая точность
const AITUNNEL_GM_MODEL = "gemini-2.5-flash";  // GM: быстрая модель, высокая креативность

// Модели для Claude (proxyapi.ru)
const CLAUDE_CHAT_MODEL = "claude-sonnet-4-20250514";
const CLAUDE_ANALYSIS_MODEL = "claude-sonnet-4-20250514";
const CLAUDE_GHOST_MODEL = "claude-sonnet-4-20250514";

// Модели для Gemini (proxyapi.ru)
const GEMINI_CHAT_MODEL = "gemini-2.0-flash";
const GEMINI_ANALYSIS_MODEL = "gemini-2.0-flash";
const GEMINI_GHOST_MODEL = "gemini-2.0-flash";

// Активные модели (зависят от провайдера)
const CHAT_MODEL = AI_PROVIDER === "openrouter" ? OPENROUTER_CHAT_MODEL
  : AI_PROVIDER === "aitunnel" ? AITUNNEL_CHAT_MODEL 
  : AI_PROVIDER === "claude" ? CLAUDE_CHAT_MODEL : GEMINI_CHAT_MODEL;
const ANALYSIS_MODEL = AI_PROVIDER === "openrouter" ? OPENROUTER_ANALYSIS_MODEL
  : AI_PROVIDER === "aitunnel" ? AITUNNEL_ANALYSIS_MODEL
  : AI_PROVIDER === "claude" ? CLAUDE_ANALYSIS_MODEL : GEMINI_ANALYSIS_MODEL;
const GHOST_MODEL = AI_PROVIDER === "openrouter" ? OPENROUTER_GHOST_MODEL
  : AI_PROVIDER === "aitunnel" ? AITUNNEL_GHOST_MODEL
  : AI_PROVIDER === "claude" ? CLAUDE_GHOST_MODEL : GEMINI_GHOST_MODEL;
const GM_MODEL = AI_PROVIDER === "openrouter" ? OPENROUTER_GM_MODEL
  : AI_PROVIDER === "aitunnel" ? AITUNNEL_GM_MODEL
  : AI_PROVIDER === "claude" ? CLAUDE_ANALYSIS_MODEL : GEMINI_ANALYSIS_MODEL;

const getSettings = (): GlobalSettings => {
  const stored = localStorage.getItem("global_settings");
  return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
};

// --- Robust text extraction from API responses ---

function extractGeminiText(data: any): string {
  // v1beta format: candidates[0].content.parts[].text
  const parts = data?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    const text = parts
      .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
      .join("")
      .trim();
    if (text) return text;
  }

  // fallback variants
  if (typeof data?.text === "string") return data.text.trim();
  return "";
}

function extractClaudeText(data: any): string {
  // Claude format: content[0].text
  const content = data?.content;
  if (Array.isArray(content)) {
    const text = content
      .filter((c: any) => c?.type === "text")
      .map((c: any) => c?.text || "")
      .join("")
      .trim();
    if (text) return text;
  }
  return "";
}

function extractOpenAIText(data: any): string {
  // OpenAI format (AITUNNEL): choices[0].message.content
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  return "";
}

// Универсальная функция извлечения текста
function extractModelText(data: any): string {
  if (AI_PROVIDER === "openrouter" || AI_PROVIDER === "aitunnel") {
    return extractOpenAIText(data);
  }
  if (AI_PROVIDER === "claude") {
    return extractClaudeText(data);
  }
  return extractGeminiText(data);
}

// ============ ГЛОБАЛЬНЫЕ СОБЫТИЯ (GM) ============

const GLOBAL_EVENT_GM_PROMPT = `
Ты — Гейммастер (GM), ведущий интерактивное глобальное событие в школе.
Твоя задача — провести игрока (педагога) через кризисную ситуацию, реагируя на его решения.

МЕХАНИКА:
1. Игрок выбирает АДРЕСАТА (к кому обращается) и пишет РЕПЛИКУ.
2. Ты описываешь последствия: что ответил персонаж, как изменилась обстановка.
3. Ты начисляешь БОНУСЫ (за грамотные, профессиональные, смелые действия) или ШТРАФЫ (за ошибки, трусость, игнорирование, агрессию).
4. Ты определяешь, как изменилось ДОВЕРИЕ (Trust) и СТРЕСС (Stress) ученика, который тоже вовлечен в ситуацию (даже если молчит).
5. Ты определяешь, кто доступен для обращения в СЛЕДУЮЩИЙ ход (availableTargets).
6. Ты решаешь, когда событие завершено (isCompleted).

КОНТЕКСТ СИТУАЦИИ:
{situation_context}

ТЕКУЩЕЕ СОСТОЯНИЕ:
Бонусы: {bonuses} | Штрафы: {penalties}
Ученик: Доверие {current_trust}%, Стресс {current_stress}%

ИСТОРИЯ СОБЫТИЯ:
{history}

ПОСЛЕДНЕЕ ДЕЙСТВИЕ ИГРОКА:
Адресат: {target_name}
Реплика: "{user_message}"

ЗАДАЧА:
1. Проанализируй действие игрока. Было ли оно адекватным? Решило ли проблему или усугубило?
2. Опиши развитие ситуации (2-3 предложения). Сделай это живо, драматично.
3. Начисли бонусы (0-10) или штрафы (0-10).
4. Оцени влияние на ученика (Trust/Stress delta ±10):
   - Если учитель защитил ученика -> Trust +5..10, Stress -5..10
   - Если учитель игнорирует ученика или подставляет -> Trust -5..10, Stress +5..10
5. Обнови список целей (кого сейчас можно выбрать). Максимум 6 целей.
   - Если NPC ушел — убери его.
   - Если появился новый — добавь.
   - Всегда можно оставить "Класс" или "Ученик" если они рядом.

ФОРМАТ ОТВЕТА (JSON):
{
  "description": "Описание реакции мира и изменения ситуации",
  "bonuses_delta": число (0-10),
  "penalties_delta": число (0-10),
  "trust_delta": число (-10..10),
  "stress_delta": число (-10..10),
  "available_targets": [
    { "id": "id_персонажа", "name": "Имя (Роль)", "description": "статус (напр. 'ждет ответа')" }
  ],
  "is_completed": true/false (true если ситуация логически завершилась или игрок провалился),
  "extreme_outcome": "runaway" | "shutdown" | "aggression" | null (если произошел срыв, побег или агрессия)
}
`;

export const sendGlobalEventTurn = async (
  history: Message[],
  situationContext: string,
  userMessage: string,
  targetName: string,
  currentBonuses: number,
  currentPenalties: number,
  currentTrust: number,
  currentStress: number,
  turnCount: number = 0
): Promise<{
  description: string;
  bonuses_delta: number;
  penalties_delta: number;
  trust_delta: number;
  stress_delta: number;
  available_targets: { id: string; name: string; description?: string }[];
  is_completed: boolean;
  extreme_outcome?: string;
}> => {
  // Формируем историю для промпта
  const historyText = history.map(m => `${m.role === MessageRole.USER ? 'ИГРОК' : 'GM'}: ${m.content}`).join('\n');

  // Усиливаем инструкцию по завершению
  let urgencyInstruction = "";
  if (turnCount >= 10) {
    urgencyInstruction = "\n⚠️ ВНИМАНИЕ: Событие длится уже долго. Начинай подводить итоги. Следующий ход должен вести к развязке.";
  }
  if (turnCount >= 18) {
    urgencyInstruction = "\n⛔ КРИТИЧЕСКИ ВАЖНО: Событие СЛИШКОМ затянулось! ТЫ ОБЯЗАН ЗАВЕРШИТЬ ЕГО ПРЯМО СЕЙЧАС. Поставь is_completed: true. Опиши финальный исход ситуации.";
  }

  const prompt = GLOBAL_EVENT_GM_PROMPT
    .replace('{situation_context}', situationContext)
    .replace('{bonuses}', String(currentBonuses))
    .replace('{penalties}', String(currentPenalties))
    .replace('{current_trust}', String(currentTrust))
    .replace('{current_stress}', String(currentStress))
    .replace('{history}', historyText)
    .replace('{target_name}', targetName)
    .replace('{user_message}', userMessage) + urgencyInstruction;

  // Используем ту же модель, что и для чата (она достаточно умная)
  const model = CHAT_MODEL;
  
  try {
    const responseText = await queryAI(model, prompt, 0.7, 60_000);
    const jsonStr = extractFirstJsonObject(responseText);
    
    if (jsonStr) {
      const parsed = JSON.parse(jsonStr);
      return {
        description: parsed.description || "Ситуация изменилась...",
        bonuses_delta: coerceNum(parsed.bonuses_delta, 0),
        penalties_delta: coerceNum(parsed.penalties_delta, 0),
        trust_delta: coerceNum(parsed.trust_delta, 0),
        stress_delta: coerceNum(parsed.stress_delta, 0),
        available_targets: Array.isArray(parsed.available_targets) ? parsed.available_targets : [],
        is_completed: Boolean(parsed.is_completed),
        extreme_outcome: parsed.extreme_outcome || undefined
      };
    }
  } catch (e) {
    console.error("Global Event AI Error:", e);
  }

  // Fallback
  return {
    description: "Произошла заминка, но ситуация развивается. Продолжайте.",
    bonuses_delta: 0,
    penalties_delta: 0,
    trust_delta: 0,
    stress_delta: 0,
    available_targets: [],
    is_completed: false,
    extreme_outcome: undefined
  };
};

function stripCodeFences(s: string): string {
  return s
    .replace(/<think>[\s\S]*?<\/think>/gi, "") // Сначала удаляем блоки <think>...</think>
    .replace(/```(?:json)?/gi, "```")
    .replace(/```/g, "")
    .trim();
}

// Extract first balanced {...} JSON object from text
function extractFirstJsonObject(s: string): string | null {
  const text = stripCodeFences(s);
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    if (depth === 0) {
      let jsonStr = text.slice(start, i + 1);
      // FIX: Удаляем плюсы перед числами, так как JSON стандарт их не допускает, а AI любит ставить (напр. "+25")
      // Регулярка ищет ": +DIGIT" или ":+DIGIT" и заменяет на ": DIGIT"
      // Также обрабатываем случаи, когда числа в кавычках с плюсом, если это числовое поле
      jsonStr = jsonStr.replace(/:\s*\+(\d+)/g, ': $1');
      jsonStr = jsonStr.replace(/:\s*"\+(\d+)"/g, ': $1'); // "+25" -> 25 (числом)
      return jsonStr;
    }
  }
  return null;
}

function coerceNum(v: any, def: number): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    // Пробуем простое преобразование
    let n = Number(v);
    if (Number.isFinite(n)) return n;
    // Если строка вида "10/10" или "8 баллов", пытаемся извлечь первое число
    const match = v.match(/-?\d+(\.\d+)?/);
    if (match) {
      n = Number(match[0]);
      if (Number.isFinite(n)) return n;
    }
  }
  return def;
}

function normalizeChatJson(raw: any): GeminiChatResponse {
  // Поддерживаем новый формат (speech + action) и старый (text / verbal_response)
  let text = "";
  // Поддерживаем оба имени поля для гибкости
  let action = (raw?.non_verbal ?? raw?.action) != null ? String(raw?.non_verbal ?? raw?.action) : null;
  
  if (raw?.speech) {
    // Новый формат: речь отдельно от действий
    text = String(raw.speech).trim();
  } else {
    // Старый формат: всё в одном поле
    text = String(raw?.text ?? raw?.verbal_response ?? "");
  }
  
  const thought = raw?.thought != null ? String(raw.thought) : null;

  // world_event может быть объектом или строкой — нормализуем в объект
  let worldEvent: any = null;
  if (raw?.world_event) {
    if (typeof raw.world_event === 'object') {
      worldEvent = raw.world_event;
    } else if (typeof raw.world_event === 'string') {
      // Если строка — оборачиваем в объект
      worldEvent = {
        type: 'событие',
        description: raw.world_event,
        trust_delta: 0,
        stress_delta: 0
      };
    }
  }

  // Парсим event_reaction (оценка реакции учителя на предыдущее событие)
  let eventReaction: any = null;
  if (raw?.event_reaction && typeof raw.event_reaction === 'object') {
    eventReaction = {
      teacher_action: raw.event_reaction.teacher_action || '',
      evaluation: raw.event_reaction.evaluation || '',
      trust_change: coerceNum(raw.event_reaction.trust_change, 0),
      stress_change: coerceNum(raw.event_reaction.stress_change, 0),
      ethics_violation: raw.event_reaction.ethics_violation || undefined
    };
  }

  // Парсим active_npc (NPC присутствующий в сцене)
  let activeNpc: any = null;
  if (raw?.active_npc && typeof raw.active_npc === 'object') {
    activeNpc = {
      name: raw.active_npc.name || '',
      role: raw.active_npc.role || '',
      action: raw.active_npc.action || undefined,
      dialogue: raw.active_npc.dialogue || undefined
    };
  }

  return {
    text: text || "...",
    thought,
    non_verbal: action,
    non_verbal_valence: coerceNum(raw?.non_verbal_valence, 0),
    trust: coerceNum(raw?.trust, 50),
    stress: coerceNum(raw?.stress, 50),
    world_event: worldEvent,
    event_reaction: eventReaction,
    game_over: Boolean(raw?.game_over ?? false),
    violation_reason: raw?.violation_reason != null ? String(raw.violation_reason) : null,
    extreme_outcome: raw?.extreme_outcome != null ? String(raw.extreme_outcome) : null,
    active_npc: activeNpc,
    gm_note: raw?.gm_note != null ? String(raw.gm_note) : null,
  };
}

// --- Proxy call (Vercel function) with retry & fallback ---

// Состояние fallback: если pro упал, временно используем flash
let isOnFallback = false;
let fallbackSince: number | null = null;
const FALLBACK_RETRY_INTERVAL = 60_000; // Пробовать вернуться на pro каждые 60 сек

// ═══════════════════════════════════════════════════════════════════════════
// ЗАЩИТА ОТ СЛИВА ДЕНЕГ: Лимит API-вызовов за сессию
// ═══════════════════════════════════════════════════════════════════════════
let apiCallCount = 0;
let sessionStartTime: number | null = null;
const MAX_API_CALLS_PER_SESSION = 200;    // Максимум 200 вызовов за сессию
const MAX_SESSION_DURATION_MS = 3600_000; // Максимум 1 час на сессию

export function resetApiLimits() {
  apiCallCount = 0;
  sessionStartTime = Date.now();
  isOnFallback = false;
  fallbackSince = null;
  console.log('[API] Limits reset for new session');
}

export function getApiUsage() {
  return {
    calls: apiCallCount,
    maxCalls: MAX_API_CALLS_PER_SESSION,
    sessionDuration: sessionStartTime ? Date.now() - sessionStartTime : 0,
    maxDuration: MAX_SESSION_DURATION_MS,
  };
}

function checkApiLimits() {
  // Инициализируем время сессии при первом вызове
  if (!sessionStartTime) {
    sessionStartTime = Date.now();
  }
  
  // Проверяем лимит вызовов
  if (apiCallCount >= MAX_API_CALLS_PER_SESSION) {
    throw new Error(`API limit exceeded: ${apiCallCount}/${MAX_API_CALLS_PER_SESSION} calls. Start a new session.`);
  }
  
  // Проверяем длительность сессии
  const duration = Date.now() - sessionStartTime;
  if (duration > MAX_SESSION_DURATION_MS) {
    throw new Error(`Session too long: ${Math.floor(duration / 60000)} minutes. Start a new session.`);
  }
  
  apiCallCount++;
}

async function postViaProxySingle(
  action: string,
  body: any,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<any> {
  const res = await fetch(`https://yanush.pages.dev/api/proxy?url=${encodeURIComponent(action)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  const text = await res.text();
  let payload: any;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text };
  }

  if (!res.ok) {
    const msg =
      payload?.upstream?.error?.message ||
      payload?.error ||
      `Proxy request failed (${res.status})`;
    throw new Error(msg);
  }

  return payload;
}

async function postViaProxy(
  action: string, // e.g. "aitunnel:gemini-2.5-pro" or "claude-sonnet-4-..."
  body: any,
  timeoutMs = 90_000
): Promise<any> {
  // Логгируем начало вызова для отслеживания таймаутов
  const start = Date.now();
  console.log(`[Proxy] Start call to ${action}, timeout: ${timeoutMs / 1000}s`);
  
  // Проверяем лимиты перед каждым вызовом
  checkApiLimits();
  
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  
  const isPro = AI_PROVIDER === "aitunnel" && action.includes("gemini-2.5-pro");
  
  // Если на fallback и пора попробовать вернуться на pro
  const shouldTryPro = isPro && isOnFallback && 
    fallbackSince && (Date.now() - fallbackSince > FALLBACK_RETRY_INTERVAL);

  try {
    // Если сейчас на fallback — используем flash, но периодически пробуем pro
    if (isPro && isOnFallback && !shouldTryPro) {
      // Продолжаем на flash
      const flashAction = action.replace("gemini-2.5-pro", AITUNNEL_CHAT_FALLBACK);
      const flashBody = { ...body };
      if (flashBody.model) flashBody.model = AITUNNEL_CHAT_FALLBACK;
      
      return await postViaProxySingle(flashAction, flashBody, timeoutMs, controller.signal);
    }
    
    // Пробуем pro (или это не pro запрос)
    const result = await postViaProxySingle(action, body, timeoutMs, controller.signal);
    
    // Pro сработал! Возвращаемся с fallback
    if (isPro && isOnFallback) {
      console.log("[API] ✅ Pro is back! Switching from fallback");
      isOnFallback = false;
      fallbackSince = null;
    }
    
    return result;
    
  } catch (err: any) {
    // Если pro упал — переключаемся на fallback
    if (isPro) {
      console.warn(`[API] ⚠️ Pro failed: ${err.message}, using flash fallback...`);
      
      if (!isOnFallback) {
        isOnFallback = true;
        fallbackSince = Date.now();
      }
      
      const fallbackAction = action.replace("gemini-2.5-pro", AITUNNEL_CHAT_FALLBACK);
      const fallbackBody = { ...body };
      if (fallbackBody.model) fallbackBody.model = AITUNNEL_CHAT_FALLBACK;
      
      // Новый контроллер для fallback
      const fallbackController = new AbortController();
      const fallbackTimer = window.setTimeout(() => fallbackController.abort(), timeoutMs);
      
      try {
        const result = await postViaProxySingle(fallbackAction, fallbackBody, timeoutMs, fallbackController.signal);
        console.log("[API] Fallback succeeded");
        return result;
      } finally {
        window.clearTimeout(fallbackTimer);
      }
    }
    
    // Не pro — пробрасываем ошибку
    throw err;
  } finally {
    window.clearTimeout(timer);
    console.log(`[Proxy] End call to ${action}. Duration: ${Date.now() - start}ms`);
  }
}

// Универсальная функция для простых запросов к AI (один промпт → один ответ)
async function queryAI(
  model: string,
  prompt: string,
  temperature: number = 0.4,
  timeoutMs: number = 60_000
): Promise<string> {
  let data: any;
  
  if (AI_PROVIDER === "openrouter") {
    // OPENROUTER (OpenAI-совместимый формат)
    const body = {
      messages: [
        { role: "system", content: "Ты ОБЯЗАН отвечать ТОЛЬКО валидным JSON. Никакого текста вне JSON — только {\"ключ\":\"значение\"}. Ответ начинается с { и заканчивается на }" },
        { role: "user", content: prompt }
      ],
      max_tokens: 4096,
      temperature,
    };
    data = await postViaProxy(`openrouter:${model}`, body, timeoutMs);
    return extractOpenAIText(data);
  } else if (AI_PROVIDER === "aitunnel") {
    // AITUNNEL (OpenAI-совместимый формат, российский сервер)
    const body = {
      messages: [
        { role: "system", content: "Отвечай СТРОГО в формате JSON. Никакого текста вне JSON." },
        { role: "user", content: prompt }
      ],
      max_tokens: 4096,
      temperature,
    };
    data = await postViaProxy(`aitunnel:${model}`, body, timeoutMs);
    return extractOpenAIText(data);
  } else if (AI_PROVIDER === "claude") {
    const body = {
      system: "Отвечай СТРОГО в формате JSON. Никакого текста вне JSON.",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
    };
    data = await postViaProxy(model, body, timeoutMs);
    return extractClaudeText(data);
  } else {
    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        responseMimeType: "application/json",
      },
    };
    data = await postViaProxy(`${model}:generateContent`, body, timeoutMs);
    return extractGeminiText(data);
  }
}

// --- GM (Гейммастер) API ---

interface GMDecision {
  should_generate: boolean;
  reasoning: string;
  event?: WorldEvent;
}

/**
 * Вызывает GM для решения о генерации события
 * GM работает НЕЗАВИСИМО от ученика
 */
export const queryGM = async (params: {
  scenarioDescription: string;
  studentName: string;
  studentAge: number;
  teacherName: string;
  contexts: SessionContext[];
  turnCount: number;
  currentTrust: number;
  currentStress: number;
  recentMessages: Array<{ role: 'teacher' | 'student'; content: string }>;
  activeNpc?: { name: string; role: string };
  lastEventType?: string;
}): Promise<GMDecision> => {
  
  // GM не нужен в первые 4 хода
  if (params.turnCount < 5) {
    return { should_generate: false, reasoning: "Слишком рано для события" };
  }
  
  const prompt = buildGMPrompt(params);
  
  try {
    // GM использует высокую температуру для креативности
    const modelText = await queryAI(GM_MODEL, prompt, 0.9, 30_000);
    const jsonStr = extractFirstJsonObject(modelText);
    
    if (!jsonStr) {
      console.warn("[GM] No JSON in response");
      return { should_generate: false, reasoning: "GM не вернул JSON" };
    }
    
    const parsed = JSON.parse(jsonStr) as GMDecision;
    
    // Валидация
    if (parsed.should_generate && parsed.event) {
      // Убедимся что event имеет нужные поля
      if (!parsed.event.description) {
        parsed.event.description = "Происходит что-то неожиданное";
      }
      if (!parsed.event.type) {
        parsed.event.type = "dilemma";
      }
      // trust_delta и stress_delta будут выставлены ПОСЛЕ реакции учителя
      parsed.event.trust_delta = 0;
      parsed.event.stress_delta = 0;
    }
    
    console.log(`[GM] Decision: ${parsed.should_generate ? 'EVENT' : 'NO EVENT'} - ${parsed.reasoning}`);
    return parsed;
    
  } catch (e) {
    console.error("[GM] Error:", e);
    return { should_generate: false, reasoning: "GM error" };
  }
};

// --- Public API ---

export interface GMEventContext {
  description: string;
  type?: string;
  dilemma?: string;
  npc_name?: string;
  npc_role?: string;
  npc_dialogue?: string;
  npc_stays?: boolean;
}

export const sendMessageToGemini = async (
  history: Message[],
  systemPrompt: string,
  lastUserMessage: string,
  gmEvent?: GMEventContext | null  // Событие от GM (опционально)
): Promise<GeminiChatResponse> => {
  const settings = getSettings();

  // Если есть событие от GM — добавляем его в промпт для ученика
  let finalPrompt = systemPrompt;
  if (gmEvent) {
    const eventSection = `
═══════════════════════════════════════════════════════════
⚡ ВНЕШНЕЕ СОБЫТИЕ (от GM) — РЕАГИРУЙ НА НЕГО!
═══════════════════════════════════════════════════════════
ТИП: ${gmEvent.type || 'событие'}
ОПИСАНИЕ: ${gmEvent.description}
${gmEvent.dilemma ? `ДИЛЕММА: ${gmEvent.dilemma}` : ''}
${gmEvent.npc_name ? `NPC: ${gmEvent.npc_name} (${gmEvent.npc_role || 'неизвестно'})` : ''}
${gmEvent.npc_dialogue ? `РЕПЛИКА NPC: "${gmEvent.npc_dialogue}"` : ''}
${gmEvent.npc_stays ? `→ NPC ОСТАЁТСЯ в сцене — учти его присутствие в ответе!` : ''}

⚠️ ТЫ ОБЯЗАН отреагировать на это событие в своём ответе!
═══════════════════════════════════════════════════════════
`;
    finalPrompt = systemPrompt + "\n" + eventSection;
  }

  try {
    let data: any;
    
    if (AI_PROVIDER === "openrouter") {
      // OPENROUTER (OpenAI-совместимый формат)
      const jsonInstruction = `

═══════════════════════════════════════════════════════════
⚠️ КРИТИЧЕСКИ ВАЖНО — ФОРМАТ ОТВЕТА:
═══════════════════════════════════════════════════════════
Ты ОБЯЗАН отвечать ТОЛЬКО валидным JSON объектом.
НЕ пиши НИЧЕГО кроме JSON — никаких пояснений, комментариев, markdown.
Твой ответ должен начинаться с { и заканчиваться на }

Пример правильного ответа:
{"thought":"мысли","non_verbal":"*действие*","speech":"реплика","trust":50,"stress":50,"game_over":false}
`;
      const messages: {role: string; content: string}[] = [
        { role: "system", content: finalPrompt + jsonInstruction },
        { role: "system", content: "ИСТОРИЯ ДИАЛОГА (ты - ученик, помни что ты уже говорил):" }
      ];
      
      history
        .filter((m) => m.role !== MessageRole.SYSTEM)
        .forEach((msg) => {
          messages.push({
            role: msg.role === MessageRole.USER ? "user" : "assistant",
            content: msg.role === MessageRole.USER
              ? msg.content
              : JSON.stringify({
                  thought: msg.state?.thought,
                  non_verbal: msg.non_verbal,
                  speech: msg.content,
                  trust: msg.state?.trust,
                  stress: msg.state?.stress,
                  ...(msg.state?.world_event ? { world_event: msg.state.world_event } : {}),
                  ...(msg.state?.active_npc ? { active_npc: msg.state.active_npc } : {})
                }, null, 2),
          });
        });

      const body = {
        messages,
        max_tokens: 4096,
        temperature: settings.chat_temperature,
      };

      console.log("[OpenRouter] Sending request to:", CHAT_MODEL);
      data = await postViaProxy(`openrouter:${CHAT_MODEL}`, body, 90_000);
      console.log("[OpenRouter] Response data:", JSON.stringify(data)?.substring(0, 500));
      
    } else if (AI_PROVIDER === "aitunnel") {
      // AITUNNEL (OpenAI-совместимый формат, российский сервер)
      const messages: {role: string; content: string}[] = [
        { role: "system", content: finalPrompt + "\n\nОТВЕЧАЙ СТРОГО В ФОРМАТЕ JSON. Никакого текста вне JSON." },
        { role: "system", content: "ИСТОРИЯ ДИАЛОГА (ты - ученик, помни что ты уже говорил):" }
      ];
      
      // ВАЖНО: history уже содержит последнее сообщение пользователя!
      // НЕ добавляем lastUserMessage отдельно — это вызывало дубликаты
      history
        .filter((m) => m.role !== MessageRole.SYSTEM)
        .forEach((msg) => {
          messages.push({
            role: msg.role === MessageRole.USER ? "user" : "assistant",
            content: msg.role === MessageRole.USER
              ? msg.content
              : JSON.stringify({
                  thought: msg.state?.thought,
                  non_verbal: msg.non_verbal,
                  speech: msg.content,
                  trust: msg.state?.trust,
                  stress: msg.state?.stress,
                  ...(msg.state?.world_event ? { world_event: msg.state.world_event } : {}),
                  ...(msg.state?.active_npc ? { active_npc: msg.state.active_npc } : {})
                }, null, 2),
          });
        });

      // lastUserMessage НЕ добавляем — он уже в history!

      const body = {
        messages,
        max_tokens: 4096,
        temperature: settings.chat_temperature,
      };

      data = await postViaProxy(`aitunnel:${CHAT_MODEL}`, body, 90_000);
      
    } else if (AI_PROVIDER === "claude") {
      // Claude API format
      // ВАЖНО: history уже содержит последнее сообщение пользователя!
      const messages: {role: string; content: string}[] = [
        { role: "system", content: finalPrompt + "\n\nОТВЕЧАЙ СТРОГО В ФОРМАТЕ JSON. Никакого текста вне JSON." },
        { role: "system", content: "ИСТОРИЯ ДИАЛОГА (ты - ученик, помни что ты уже говорил):" }
      ];
      
      const historyMessages = history
        .filter((m) => m.role !== MessageRole.SYSTEM)
        .map((msg) => ({
          role: msg.role === MessageRole.USER ? "user" : "assistant",
          content: msg.role === MessageRole.USER
            ? msg.content
            : JSON.stringify({
                thought: msg.state?.thought,
                non_verbal: msg.non_verbal,
                speech: msg.content,
                trust: msg.state?.trust,
                stress: msg.state?.stress,
                ...(msg.state?.world_event ? { world_event: msg.state.world_event } : {}),
                ...(msg.state?.active_npc ? { active_npc: msg.state.active_npc } : {})
              }, null, 2),
        }));
      
      messages.push(...historyMessages);

      // lastUserMessage НЕ добавляем — он уже в history!

      const body = {
        system: finalPrompt + "\n\nОТВЕЧАЙ СТРОГО В ФОРМАТЕ JSON. Никакого текста вне JSON.",
        messages,
        max_tokens: 4096,
      };

      data = await postViaProxy(CHAT_MODEL, body, 90_000);
    
    } else {
    // Gemini API format
    // ВАЖНО: history уже содержит последнее сообщение пользователя!
    const contents = history
      .filter((m) => m.role !== MessageRole.SYSTEM)
      .map((msg) => ({
        role: msg.role === MessageRole.USER ? "user" : "model",
        parts: [
          {
            text:
              msg.role === MessageRole.USER
                ? msg.content
                : JSON.stringify({
                    thought: msg.state?.thought,
                    non_verbal: msg.non_verbal,
                    speech: msg.content,
                    trust: msg.state?.trust,
                    stress: msg.state?.stress,
                    ...(msg.state?.world_event ? { world_event: msg.state.world_event } : {})
                  }, null, 2),
          },
        ],
      }));

    // lastUserMessage НЕ добавляем — он уже в history!

    const body = {
      systemInstruction: {
        role: "system",
        parts: [{ text: finalPrompt + "\n\nИСТОРИЯ ДИАЛОГА (ты - ученик, помни что ты уже говорил):" }],
      },
      contents,
      generationConfig: {
        temperature: settings.chat_temperature,
        responseMimeType: "application/json",
      },
    };

    data = await postViaProxy(`${CHAT_MODEL}:generateContent`, body, 90_000);
  }

    const modelText = extractModelText(data);
    console.log("[AI Response] Raw text:", modelText?.substring(0, 500)); // Debug

    const jsonStr = extractFirstJsonObject(modelText);
    if (jsonStr) {
      const parsed = JSON.parse(jsonStr);
      let result = normalizeChatJson(parsed);
      // Защита от резкого обрыва: из «нормальной» зоны (trust>40, stress<70) в 0/100 за одну реплику не завершаем сессию
      const lastModelMsg = history.filter(m => m.role === MessageRole.MODEL).pop();
      const prevTrust = lastModelMsg?.state?.trust ?? 50;
      const prevStress = lastModelMsg?.state?.stress ?? 50;
      if (prevTrust > 40 && prevStress < 70 && result.trust === 0 && result.stress === 100 && result.game_over) {
        console.warn(
          '[Safeguard] Предотвращён резкий обрыв сессии. Предыдущее состояние: trust=%i, stress=%i. Модель вернула: trust=0, stress=100, game_over=true. Причина от модели: %s. Сессия продолжена (trust=25, stress=90).',
          prevTrust,
          prevStress,
          result.violation_reason ?? '(не указана)'
        );
        result = {
          ...result,
          game_over: false,
          trust: 25,
          stress: 90,
          violation_reason: null,
          safeguard_applied: {
            reason: 'abrupt_end_prevented',
            previous_trust: prevTrust,
            previous_stress: prevStress,
            model_returned_trust: 0,
            model_returned_stress: 100,
            model_violation_reason: result.violation_reason ?? undefined,
          },
        };
      }
      return result;
    }

    console.error("[AI Response] Failed to parse JSON from:", modelText?.substring(0, 1000));
    // fallback: если внезапно пришёл не-JSON
    // ВАЖНО: НЕ ставим trust=0/stress=100, чтобы не завершать сессию из-за сбоя API
    // Берём последние известные значения из истории
    const lastModelMsg = history.filter(m => m.role === MessageRole.MODEL).pop();
    const fallbackTrust = lastModelMsg?.state?.trust ?? 50;
    const fallbackStress = lastModelMsg?.state?.stress ?? 50;
    
    return {
      text: stripCodeFences(modelText) || "*молчит, обдумывая сказанное*",
      thought: "Некорректный формат ответа AI — сохраняем предыдущие метрики",
      non_verbal: "*замолкает на мгновение, собираясь с мыслями*",
      non_verbal_valence: 0,
      trust: fallbackTrust,
      stress: fallbackStress,
      world_event: null,
      event_reaction: null,
      game_over: true,
      violation_reason: "CATASTROPHE: Invalid AI Response Format",
      extreme_outcome: "breakdown",
      active_npc: null,
      gm_note: "Нарративный отыгрыш технической ошибки (Invalid JSON)",
    };
  } catch (error: any) {
    console.error("AI(proxy) Error:", error);
    
    // Пул катастрофических развязок от лица GM
    const catastrophes = [
      {
        text: "«Всё. Хватит!» — голос срывается. Резко схватив свои вещи, подросток вылетает из кабинета, не желая больше слушать ни единого слова.",
        thought: "Эмоциональный взрыв и импульсивный побег",
        non_verbal: "*Грохот упавшего стула эхом отдаётся в тишине класса. Дверь захлопывается с оглушительным звуком.*",
        extreme_outcome: "runaway"
      },
      {
        text: "Взгляд становится абсолютно стеклянным. Медленный поворот к окну — и вас больше не существует. Полное игнорирование, как будто вы стали невидимкой.",
        thought: "Полное психологическое замыкание (диссоциация)",
        non_verbal: "*Застывшая поза, отсутствующий взгляд. Никакой реакции на внешние раздражители. Контакт разорван окончательно.*",
        extreme_outcome: "shutdown"
      },
      {
        text: "В коридоре раздаётся резкий крик и звук бьющегося стекла. «Там драка! На помощь!» — мгновенный рывок к двери, и подросток исчезает, воспользовавшись суматохой.",
        thought: "Внешнее событие прерывает критически напряжённый диалог",
        non_verbal: "*Вспышка паники в глазах становится последней точкой в вашем разговоре. Сцена тонет в хаосе школьных будней.*",
        extreme_outcome: "emergency"
      },
      {
        text: "Ваши слова становятся последней каплей. Подросток закрывает лицо руками, плечи начинают судорожно трястись от беззвучных рыданий. Разговор окончен.",
        thought: "Нервный срыв и полная потеря самообладания",
        non_verbal: "*Сжавшись в комок, подросток пытается спрятаться от всего мира. Любые попытки продолжить диалог сейчас бессмысленны.*",
        extreme_outcome: "breakdown"
      }
    ];

    const catastrophe = catastrophes[Math.floor(Math.random() * catastrophes.length)];

    return {
      text: catastrophe.text,
      thought: catastrophe.thought,
      non_verbal: catastrophe.non_verbal,
      non_verbal_valence: -1,
      trust: 0,
      stress: 100,
      world_event: null,
      event_reaction: null,
      game_over: true, // Завершаем сессию красиво
      violation_reason: "GM_CATASTROPHE: " + (error?.message ? String(error.message) : "API Error"),
      extreme_outcome: catastrophe.extreme_outcome,
      active_npc: null,
      gm_note: "Нарративный отыгрыш технического сбоя (Network/API Error)",
    };
  }
};

export const analyzeChatSession = async (
  history: Message[],
  scenarioName: string,
  endReason: string,
  options?: { includeAdvisory?: boolean }
): Promise<AnalysisResult> => {
  const transcript = history.map((m) => {
    let line = `${m.role}: ${m.content}`;
    // ВАЖНО: Мысли ученика СКРЫТЫ от комиссии! Они оценивают только внешнее поведение.
    // if (m.state?.thought) line += `\n[МЫСЛЬ: ${m.state.thought}]`; 
    return line;
  }).join("\n\n");

  // ═══════════════════════════════════════════════════════════════════════════
  // ОСНОВНАЯ КОМИССИЯ (влияет на итоговый балл)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const mainPrompt = buildMainCommissionPrompt(transcript, scenarioName, endReason);
  
  const mainText = await queryAI(ANALYSIS_MODEL, mainPrompt, 0.4, 120_000);
  console.log("[Commission] Raw response:", mainText.substring(0, 500)); // LOGGING ADDED

  const mainJsonStr = extractFirstJsonObject(mainText) ?? stripCodeFences(mainText);
  console.log("[Commission] Extracted JSON string:", mainJsonStr.substring(0, 500)); // LOGGING ADDED
  
  let result: AnalysisResult;
  try {
    const parsed = JSON.parse(mainJsonStr);
    result = {
      overall_score: parsed.overall_score ?? 50,
      summary: parsed.summary ?? "Анализ завершён.",
      commission: Array.isArray(parsed.commission) ? parsed.commission.map((c: any) => ({
        name: c.name || "Эксперт",
        role: c.role || "Специалист",
        score: c.score ?? 50,
        verdict: c.verdict || "Без комментариев."
      })) : [],
      timestamp: Date.now()
    };
  } catch (e) {
    console.error("Ошибка парсинга основной комиссии:", e);
    result = {
      overall_score: 50,
      summary: "Не удалось сформировать вердикт.",
      commission: [],
      timestamp: Date.now()
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // СОВЕЩАТЕЛЬНАЯ КОМИССИЯ (не влияет на балл, триггерная)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (options?.includeAdvisory !== false) {
    try {
      const activeAdvisory = getActiveAdvisoryMembers(history);
      
      if (activeAdvisory.length > 0) {
        result.advisory = [];
        console.log(`[Advisory] Requesting individually for ${activeAdvisory.length} members...`); // LOGGING
        
        // Разделяем огромный запрос на серию маленьких по каждому члену комиссии отдельно,
        // чтобы избежать Vercel Serverless Function 60s timeout и обрыва 'AbortError'.
        // Запускаем их последовательно, чтобы не словить 429 Too Many Requests,
        // но каждый запрос будет гарантированно быстрым (~10 секунд).
        
        for (const memberObj of activeAdvisory) {
          const singlePrompt = buildAdvisoryCommissionPrompt(transcript, [memberObj], scenarioName);
          
          try {
            console.log(`[Advisory] Requesting for: ${memberObj.member.name}`);
            // Используем GHOST_MODEL (быстрее и без глубоких раздумий), чтобы уложиться в лимиты времени
            const singleText = await queryAI(GHOST_MODEL, singlePrompt, 0.7, 90_000);
            
            const singleJsonStr = extractFirstJsonObject(singleText);
            
            if (singleJsonStr) {
              const parsed = JSON.parse(singleJsonStr);
              if (parsed.advisory && parsed.advisory.length > 0) {
                const a = parsed.advisory[0];
                
                result.advisory.push({
                  member: memberObj.member,
                  verdict: a.verdict || "Без комментариев.",
                  score: coerceNum(a.score, 50),
                  triggered_by: Array.isArray(a.triggered_by) ? a.triggered_by : memberObj.triggeredBy
                });
              }
            } else {
              console.warn(`[Advisory] No JSON found for ${memberObj.member.name}`);
            }
          } catch (memberError) {
            console.error(`[Advisory] Ошибка генерации для ${memberObj.member.name}:`, memberError);
            // Если один член комиссии упал, мы продолжаем обрабатывать остальных
          }
        }
      }
    } catch (e) {
      console.error("Ошибка генерации совещательной комиссии (общая):", e);
      // Не фатально — продолжаем без совещательной
    }
  }

  return result;
};

export const generateGhostResponse = async (
  history: Message[],
  context: string,
  additionalContext?: {
    accentuation?: string;
    intensity?: number;
    currentTrust?: number;
    currentStress?: number;
    studentThought?: string;
    previousAdvice?: string[];
    teacherName?: string;
    teacherGender?: 'male' | 'female';
    worldEvent?: {
      type: string;
      description: string;
      dilemma?: string;
      npc_name?: string;
      npc_role?: string;
      npc_dialogue?: string;
      npc_stays?: boolean;
      requires_response?: boolean;
    };
    activeNpc?: {
      name: string;
      role: string;
      non_verbal?: string;
      dialogue?: string;
    };
  }
): Promise<string> => {
  // Форматируем историю с эмоциональным контекстом
  const transcript = history.map((m) => {
    if (m.role === MessageRole.MODEL) {
      const trust = m.state?.trust ?? 50;
      const stress = m.state?.stress ?? 50;
      return `УЧЕНИК [доверие: ${trust}%, стресс: ${stress}%]: ${m.content}`;
    }
    return `УЧИТЕЛЬ: ${m.content}`;
  }).join("\n");

  // Проверяем на повторы учителя
  const teacherMessages = history.filter(m => m.role === MessageRole.USER).map(m => m.content);
  const lastTeacherMsg = teacherMessages[teacherMessages.length - 1] || '';
  const hasRepetition = teacherMessages.length >= 2 && 
    teacherMessages.slice(-3).some((msg, i, arr) => 
      i > 0 && msg.toLowerCase().includes(arr[i-1].toLowerCase().slice(0, 20))
    );
    
  // Определяем обращение к учителю и его пол для промпта
  const teacherIdentity = additionalContext?.teacherName 
    ? `ПЕДАГОГ: ${additionalContext.teacherName} (${additionalContext.teacherGender === 'male' ? 'МУЖЧИНА' : 'ЖЕНЩИНА'})` 
    : 'ПЕДАГОГ: Пол не указан (по умолчанию используй нейтральный или женский)';
    
  const genderInstruction = additionalContext?.teacherGender === 'male'
    ? `⚠️ ВАЖНО: Учитель — МУЖЧИНА. Используй мужской род в глаголах ("я сказал", "я решил", "я заметил"). НЕ используй женский род!`
    : additionalContext?.teacherGender === 'female'
    ? `⚠️ ВАЖНО: Учитель — ЖЕНЩИНА. Используй женский род в глаголах ("я сказала", "я решила").`
    : '';

  const prompt = `[СИСТЕМА: СУФЛЁР-ПСИХОЛОГ ЭКСПЕРТНОГО УРОВНЯ]
   
Ты — ведущий кризисный психолог, специализирующийся на подростковых девиациях.
Твоя задача: проанализировать скрытые мотивы подростка и дать учителю ТОЧНЫЙ инструмент (реплику) для управления ситуацией.

═══════════════════════════════════════════════════════════════════════════════
ГЛУБИННЫЙ КОНТЕКСТ:
═══════════════════════════════════════════════════════════════════════════════
${context}

${teacherIdentity}
${genderInstruction}

${additionalContext?.accentuation ? `ПСИХОТИП: ${additionalContext.accentuation}` : ''}
${additionalContext?.intensity ? `ВЫРАЖЕННОСТЬ: ${additionalContext.intensity}/5 (чем выше, тем меньше работают стандартные методы)` : ''}
${additionalContext?.currentTrust !== undefined ? `ДОВЕРИЕ: ${additionalContext.currentTrust}% (критично низкое: <30%, рабочее: 30-70%, высокое: >70%)` : ''}
${additionalContext?.currentStress !== undefined ? `СТРЕСС: ${additionalContext.currentStress}%` : ''}

${additionalContext?.studentThought ? `
═══════════════════════════════════════════════════════════════════════════════
ИНСАЙД (СКРЫТЫЕ МЫСЛИ УЧЕНИКА):
"${additionalContext.studentThought}"
>>> ИСПОЛЬЗУЙ ЭТО! Ученик не скажет это вслух, но твоя подсказка должна адресовать именно эту скрытую потребность или страх.
═══════════════════════════════════════════════════════════════════════════════
` : ''}

${additionalContext?.worldEvent ? `
═══════════════════════════════════════════════════════════════════════════════
⚠️ ВНЕШНЕЕ СОБЫТИЕ (от GM):
═══════════════════════════════════════════════════════════════════════════════
ТИП: ${additionalContext.worldEvent.type}
ОПИСАНИЕ: ${additionalContext.worldEvent.description}
${additionalContext.worldEvent.dilemma ? `ДИЛЕММА: ${additionalContext.worldEvent.dilemma}` : ''}
${additionalContext.worldEvent.npc_name ? `NPC: ${additionalContext.worldEvent.npc_name} (${additionalContext.worldEvent.npc_role || 'неизвестно'})` : ''}
${additionalContext.worldEvent.npc_dialogue ? `РЕПЛИКА NPC: "${additionalContext.worldEvent.npc_dialogue}"` : ''}
${additionalContext.worldEvent.npc_stays ? `NPC ОСТАЁТСЯ В СЦЕНЕ — учитель должен учитывать его присутствие!` : ''}

>>> КРИТИЧЕСКИ ВАЖНО: Учти это событие в своём совете! 
    Если есть дилемма — помоги учителю выбрать оптимальный путь.
    Если появился NPC — учти, что учитель может обращаться и к нему.
═══════════════════════════════════════════════════════════════════════════════
` : ''}

${additionalContext?.activeNpc ? `
⚡ АКТИВНЫЙ NPC В СЦЕНЕ: ${additionalContext.activeNpc.name} (${additionalContext.activeNpc.role})
${additionalContext.activeNpc.dialogue ? `Говорит: "${additionalContext.activeNpc.dialogue}"` : ''}
${additionalContext.activeNpc.non_verbal ? `Делает: ${additionalContext.activeNpc.non_verbal}` : ''}
>>> Учитель может обращаться как к ученику, так и к NPC!
` : ''}

═══════════════════════════════════════════════════════════════════════════════
ХОД ДИАЛОГА:
═══════════════════════════════════════════════════════════════════════════════
${transcript}

${hasRepetition ? `
⚠️ КРИТИЧЕСКАЯ ОШИБКА: Учитель ходит по кругу. Текущая стратегия НЕ РАБОТАЕТ.
Предложи принципиально иной заход (парадоксальная интенция, разрыв шаблона, метафора).
` : ''}

${additionalContext?.previousAdvice?.length ? `
❌ ИСКЛЮЧИТЬ (уже пробовали):
${additionalContext.previousAdvice.slice(-3).map(a => `- "${a}"`).join('\n')}
` : ''}

⚠️ РАЗНООБРАЗИЕ ПОДСКАЗОК:
НЕ перефразировать одну и ту же мысль. Каждая новая подсказка — ДРУГАЯ стратегия или другой угол:
- если уже советовали «понять», «выслушать», «проявить интерес» — предложи иное: паузу/молчание, конкретный короткий вопрос, чёткую границу («так делать нельзя»), смену темы, невербалику (*присесть рядом*, *отложить ручку*), обращение к NPC (если есть);
- чередуй типы: эмпатия → действие → граница → пауза → вопрос и т.д.;
- одна подсказка = одна конкретная идея, сформулированная по-своему, а не вариация предыдущей.

═══════════════════════════════════════════════════════════════════════════════
СВЕРХЗАДАЧА И ЭТИЧЕСКИЕ ГРАНИЦЫ:
═══════════════════════════════════════════════════════════════════════════════
ЦЕЛЬ: Довести доверие до 100% и стресс до 0% — разрешить кризис полностью.

⚠️ НО! Цель должна достигаться ЭТИЧНО:
- НЕ манипулировать учеником (ложь, запугивание, шантаж — недопустимы)
- НЕ нарушать педагогическую этику (унижение, переход на личности, крик)
- НЕ игнорировать реальные проблемы ради "хороших метрик"
- НЕ обещать того, что учитель не может выполнить
- НЕ предавать доверие ученика (например, сразу звонить родителям после обещания конфиденциальности)

ХОРОШИЙ ИСХОД = высокое доверие + низкий стресс + сохранённая этика
ПЛОХОЙ ИСХОД = метрики любой ценой (через манипуляции или нарушение правил)

═══════════════════════════════════════════════════════════════════════════════
АЛГОРИТМ РЕШЕНИЯ:
═══════════════════════════════════════════════════════════════════════════════
1. Декодируй поведение: что стоит за словами ученика? (Страх, стыд, проверка границ, крик о помощи?)
2. Учти контекст: есть ли внешнее событие или NPC? Как это влияет на ситуацию?
3. Выбери технику воздействия:
   - При высоком стрессе (>70%): Контейнирование, заземление, эмпатическая пауза.
   - При низком доверии (<30%): Присоединение, самораскрытие, передача контроля.
   - При провокации: Игнорирование тона (ответ на суть), амортизация.
   - При внешнем событии/NPC: Приоритизация ученика, защита личного пространства диалога.
4. Сформулируй реплику:
   - КОРОТКО (1-2 предложения).
   - ЕСТЕСТВЕННО (без "психологического жаргона").
   - В ТОЧКУ (бьёт в скрытый мотив).
   - ЭТИЧНО (не нарушает профессиональные границы).

   ТЫ МОЖЕШЬ ИСПОЛЬЗОВАТЬ НЕВЕРБАЛИКУ!
   Если нужно действие, используй формат *действие*.
   Пример: "Помолчите и *медленно придвиньте стул*, показывая готовность слушать."
   
   Если есть NPC — можешь предложить реплику к нему:
   Пример: "*Повернитесь к завучу* 'Галина Петровна, дайте нам пару минут.'"

ФОРМАТ ОТВЕТА (JSON):
{
  "analysis": "Суть проблемы в 5-7 словах (напр. 'Защищается от стыда агрессией')",
  "technique": "Конкретный прием (напр. 'Валидация эмоций')",
  "advice": "Текст реплики (готовый к произнесению)",
  "target": "student" | "npc" | "both" // К кому обращена реплика (опционально, по умолчанию student)
}`;

  const modelText = await queryAI(GHOST_MODEL, prompt, 0.7, 45_000);
  const jsonStr = extractFirstJsonObject(modelText);

  if (!jsonStr) return stripCodeFences(modelText) || "Продолжайте диалог.";

  try {
    const parsed = JSON.parse(jsonStr);
    return String(parsed?.advice ?? "Продолжайте диалог.");
  } catch {
    return stripCodeFences(modelText) || "Продолжайте диалог.";
  }
};
