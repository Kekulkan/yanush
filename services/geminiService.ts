// services/geminiService.ts
import { Message, MessageRole, GlobalSettings, AnalysisResult, AdvisoryFeedback, AquariumDialogue } from "../types";
import { DEFAULT_SETTINGS } from "../constants";
import { 
  buildMainCommissionPrompt, 
  buildAdvisoryCommissionPrompt, 
  buildAquariumPrompt,
  getActiveAdvisoryMembers,
  ADVISORY_COMMISSION
} from "./commissionService";

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
};

// ============ ВЫБОР ПРОВАЙДЕРА ============
// "aitunnel" — AITUNNEL (российский сервер, без VPN, дёшево)
// "claude" — Claude Sonnet через proxyapi.ru
// "gemini" — Gemini через proxyapi.ru
const AI_PROVIDER: "aitunnel" | "claude" | "gemini" = "aitunnel";

// Модели для AITUNNEL (OpenAI-совместимый формат)
// Pro = умнее, Flash = быстрее/стабильнее (fallback)
const AITUNNEL_CHAT_MODEL = "gemini-2.5-pro";          // Умная модель для ученика
const AITUNNEL_CHAT_FALLBACK = "gemini-2.5-flash";    // Fallback если pro упадёт
const AITUNNEL_ANALYSIS_MODEL = "gemini-2.5-flash";   // Для комиссии хватит flash
const AITUNNEL_GHOST_MODEL = "gemini-2.5-flash-lite"; // Для суфлёра достаточно

// Модели для Claude (proxyapi.ru)
const CLAUDE_CHAT_MODEL = "claude-sonnet-4-20250514";
const CLAUDE_ANALYSIS_MODEL = "claude-sonnet-4-20250514";
const CLAUDE_GHOST_MODEL = "claude-haiku-4-5-20251001";

// Модели для Gemini (proxyapi.ru)
const GEMINI_CHAT_MODEL = "gemini-2.0-flash";
const GEMINI_ANALYSIS_MODEL = "gemini-2.0-flash";
const GEMINI_GHOST_MODEL = "gemini-2.0-flash-lite";

// Активные модели (зависят от провайдера)
const CHAT_MODEL = AI_PROVIDER === "aitunnel" ? AITUNNEL_CHAT_MODEL 
  : AI_PROVIDER === "claude" ? CLAUDE_CHAT_MODEL : GEMINI_CHAT_MODEL;
const ANALYSIS_MODEL = AI_PROVIDER === "aitunnel" ? AITUNNEL_ANALYSIS_MODEL
  : AI_PROVIDER === "claude" ? CLAUDE_ANALYSIS_MODEL : GEMINI_ANALYSIS_MODEL;
const GHOST_MODEL = AI_PROVIDER === "aitunnel" ? AITUNNEL_GHOST_MODEL
  : AI_PROVIDER === "claude" ? CLAUDE_GHOST_MODEL : GEMINI_GHOST_MODEL;

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
  if (AI_PROVIDER === "aitunnel") {
    return extractOpenAIText(data);
  }
  if (AI_PROVIDER === "claude") {
    return extractClaudeText(data);
  }
  return extractGeminiText(data);
}

function stripCodeFences(s: string): string {
  return s
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
    if (depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

function coerceNum(v: any, def: number): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
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
  const res = await fetch(`/api/proxy?url=${encodeURIComponent(action)}`, {
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
  
  if (AI_PROVIDER === "aitunnel") {
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

// --- Public API ---

export const sendMessageToGemini = async (
  history: Message[],
  systemPrompt: string,
  lastUserMessage: string
): Promise<GeminiChatResponse> => {
  const settings = getSettings();

  try {
    let data: any;
    
    if (AI_PROVIDER === "aitunnel") {
      // AITUNNEL (OpenAI-совместимый формат, российский сервер)
      const messages: {role: string; content: string}[] = [
        { role: "system", content: systemPrompt + "\n\nОТВЕЧАЙ СТРОГО В ФОРМАТЕ JSON. Никакого текста вне JSON." }
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
              : JSON.stringify(msg.state ?? { text: msg.content }),
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
      const messages = history
        .filter((m) => m.role !== MessageRole.SYSTEM)
        .map((msg) => ({
          role: msg.role === MessageRole.USER ? "user" : "assistant",
          content: msg.role === MessageRole.USER
            ? msg.content
            : JSON.stringify(msg.state ?? { text: msg.content }),
        }));

      // lastUserMessage НЕ добавляем — он уже в history!

      const body = {
        system: systemPrompt + "\n\nОТВЕЧАЙ СТРОГО В ФОРМАТЕ JSON. Никакого текста вне JSON.",
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
                : JSON.stringify(msg.state ?? { text: msg.content }),
          },
        ],
      }));

    // lastUserMessage НЕ добавляем — он уже в history!

    const body = {
      systemInstruction: {
        role: "system",
        parts: [{ text: systemPrompt }],
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

    const jsonStr = extractFirstJsonObject(modelText);
    if (jsonStr) {
      const parsed = JSON.parse(jsonStr);
      return normalizeChatJson(parsed);
    }

    // fallback: если внезапно пришёл не-JSON
    return {
      text: stripCodeFences(modelText) || "Связь прервана.",
      thought: null,
      non_verbal: null,
      non_verbal_valence: 0,
      trust: 0,
      stress: 100,
      world_event: null,
      event_reaction: null,
      game_over: false,
      violation_reason: null,
      extreme_outcome: null,
      active_npc: null,
      gm_note: null,
    };
  } catch (error: any) {
    console.error("AI(proxy) Error:", error);
    return {
      text: "Связь прервана.",
      thought: "Ошибка API",
      non_verbal: "*Искажение сигнала.*",
      non_verbal_valence: 0,
      trust: 0,
      stress: 100,
      world_event: null,
      event_reaction: null,
      game_over: false,
      violation_reason: error?.message ? String(error.message) : null,
      extreme_outcome: null,
      active_npc: null,
      gm_note: null,
    };
  }
};

export const analyzeChatSession = async (
  history: Message[],
  scenarioName: string,
  endReason: string,
  options?: { includeAdvisory?: boolean; includeAquarium?: boolean }
): Promise<AnalysisResult> => {
  const transcript = history.map((m) => {
    let line = `${m.role}: ${m.content}`;
    if (m.state?.thought) line += `\n[МЫСЛЬ: ${m.state.thought}]`;
    return line;
  }).join("\n\n");

  // ═══════════════════════════════════════════════════════════════════════════
  // ОСНОВНАЯ КОМИССИЯ (влияет на итоговый балл)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const mainPrompt = buildMainCommissionPrompt(transcript, scenarioName, endReason);
  
  const mainText = await queryAI(ANALYSIS_MODEL, mainPrompt, 0.4, 120_000);
  const mainJsonStr = extractFirstJsonObject(mainText) ?? stripCodeFences(mainText);
  
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
        const advisoryPrompt = buildAdvisoryCommissionPrompt(transcript, activeAdvisory, scenarioName);
        
        const advisoryText = await queryAI(ANALYSIS_MODEL, advisoryPrompt, 0.7, 90_000);
        const advisoryJsonStr = extractFirstJsonObject(advisoryText);
        
        if (advisoryJsonStr) {
          const advisoryParsed = JSON.parse(advisoryJsonStr);
          if (Array.isArray(advisoryParsed.advisory)) {
            result.advisory = advisoryParsed.advisory.map((a: any) => {
              // Ищем по ID, имени или части имени (LLM может вернуть разные форматы)
              const member = ADVISORY_COMMISSION.find(m => 
                m.id === a.id || 
                m.name === a.name ||
                m.name.toLowerCase().includes((a.name || '').toLowerCase().split(' ')[0]) ||
                (a.name || '').toLowerCase().includes(m.name.toLowerCase().split(' ')[0])
              );
              
              if (!member) {
                console.warn(`[Advisory] Member not found: id=${a.id}, name=${a.name}`);
              }
              
              return {
                member: member || {
                  id: a.id,
                  name: a.name || "???",
                  title: a.title || "???",
                  age: 0,
                  triggers: [],
                  prompt: ""
                },
                verdict: a.verdict || "Без комментариев.",
                score: a.score,
                triggered_by: a.triggered_by || []
              } as AdvisoryFeedback;
            });
          }
        }
      }
    } catch (e) {
      console.error("Ошибка совещательной комиссии:", e);
      // Не фатально — продолжаем без совещательной
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // АКВАРИУМ (премиум — обсуждение между членами совещательной комиссии)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (options?.includeAquarium && result.advisory && result.advisory.length >= 2) {
    try {
      const activeForAquarium = result.advisory.map(a => ({
        member: a.member,
        triggeredBy: a.triggered_by || []
      }));
      
      const aquariumPrompt = buildAquariumPrompt(transcript, activeForAquarium, scenarioName);
      
      const aquariumText = await queryAI(ANALYSIS_MODEL, aquariumPrompt, 0.85, 90_000);
      const aquariumJsonStr = extractFirstJsonObject(aquariumText);
      
      if (aquariumJsonStr) {
        const aquariumParsed = JSON.parse(aquariumJsonStr);
        if (Array.isArray(aquariumParsed.aquarium)) {
          result.aquarium = aquariumParsed.aquarium.map((d: any) => ({
            speaker: d.speaker,
            speakerName: d.speaker_name || d.speakerName || "???",
            text: d.text || "...",
            replyTo: d.reply_to || d.replyTo || undefined
          } as AquariumDialogue));
        }
      }
    } catch (e) {
      console.error("Ошибка аквариума:", e);
      // Не фатально
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

  const prompt = `[СИСТЕМА: СУФЛЁР-ПСИХОЛОГ ДЛЯ ПЕДАГОГА]

Ты — опытный психолог-консультант, помогающий учителю в кризисной ситуации с подростком.
Твоя задача: предложить ОДНУ конкретную реплику, которая поможет наладить контакт.

═══════════════════════════════════════════════════════════════════════════════
КОНТЕКСТ СИТУАЦИИ:
═══════════════════════════════════════════════════════════════════════════════
${context}

${additionalContext?.accentuation ? `ПСИХОТИП УЧЕНИКА: ${additionalContext.accentuation}` : ''}
${additionalContext?.intensity ? `ВЫРАЖЕННОСТЬ АКЦЕНТУАЦИИ: ${additionalContext.intensity}/5` : ''}
${additionalContext?.currentTrust !== undefined ? `ТЕКУЩЕЕ ДОВЕРИЕ: ${additionalContext.currentTrust}%` : ''}
${additionalContext?.currentStress !== undefined ? `ТЕКУЩИЙ СТРЕСС: ${additionalContext.currentStress}%` : ''}

${additionalContext?.studentThought ? `
═══════════════════════════════════════════════════════════════════════════════
ЧТО ДУМАЕТ УЧЕНИК (скрыто от учителя):
${additionalContext.studentThought}
═══════════════════════════════════════════════════════════════════════════════
` : ''}

═══════════════════════════════════════════════════════════════════════════════
ИСТОРИЯ ДИАЛОГА:
═══════════════════════════════════════════════════════════════════════════════
${transcript}

${hasRepetition ? `
⚠️ ВНИМАНИЕ: Учитель начал ПОВТОРЯТЬСЯ! Это критическая ошибка.
Предложи СОВЕРШЕННО ДРУГОЙ подход, новую тактику.
` : ''}

${additionalContext?.previousAdvice?.length ? `
❌ УЖЕ ПРЕДЛАГАЛОСЬ (НЕ ПОВТОРЯТЬ):
${additionalContext.previousAdvice.slice(-3).map(a => `- "${a}"`).join('\n')}
` : ''}

═══════════════════════════════════════════════════════════════════════════════
ТВОЯ ЗАДАЧА:
═══════════════════════════════════════════════════════════════════════════════
1. Проанализируй текущее состояние ученика (доверие/стресс)
2. Учти его психотип и что он РЕАЛЬНО думает
3. Предложи реплику, которая:
   - Соответствует моменту (не общие фразы!)
   - Учитывает КОНКРЕТНУЮ последнюю реплику ученика
   - Использует технику, подходящую для этого психотипа
   - НЕ повторяет предыдущие советы
   - Звучит естественно для учителя

ФОРМАТ ОТВЕТА (JSON):
{
  "analysis": "Краткий анализ ситуации (1 предложение)",
  "technique": "Название техники (напр. 'Отражение чувств', 'Я-сообщение', 'Нормализация')",
  "advice": "Конкретная реплика для учителя"
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
