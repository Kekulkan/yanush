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
};

const CHAT_MODEL = "gemini-2.0-flash-lite";
const ANALYSIS_MODEL = "gemini-2.0-flash-lite";
const GHOST_MODEL = "gemini-2.0-flash-lite";

const getSettings = (): GlobalSettings => {
  const stored = localStorage.getItem("global_settings");
  return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
};

// --- Robust text extraction from Gemini REST response ---

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
  // поддерживаем оба нейминга: text / verbal_response
  const text = String(raw?.text ?? raw?.verbal_response ?? "");
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

  return {
    text: text || "...",
    thought,
    non_verbal: raw?.non_verbal != null ? String(raw.non_verbal) : null,
    non_verbal_valence: coerceNum(raw?.non_verbal_valence, 0),
    trust: coerceNum(raw?.trust, 50),
    stress: coerceNum(raw?.stress, 50),
    world_event: worldEvent,
    event_reaction: eventReaction,
    game_over: Boolean(raw?.game_over ?? false),
    violation_reason: raw?.violation_reason != null ? String(raw.violation_reason) : null,
  };
}

// --- Proxy call (Vercel function) ---

async function postViaProxy(
  action: string, // e.g. "gemini-2.0-flash-lite:generateContent"
  body: any,
  timeoutMs = 60_000
): Promise<any> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`/api/proxy?url=${encodeURIComponent(action)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await res.text();
    let payload: any;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }

    if (!res.ok) {
      // максимально информативно для отладки
      const msg =
        payload?.upstream?.error?.message ||
        payload?.error ||
        `Proxy request failed (${res.status})`;
      throw new Error(msg);
    }

    return payload;
  } finally {
    window.clearTimeout(timer);
  }
}

// --- Public API ---

export const sendMessageToGemini = async (
  history: Message[],
  systemPrompt: string,
  lastUserMessage: string
): Promise<GeminiChatResponse> => {
  const settings = getSettings();

  // Gemini roles: user | model. SYSTEM в contents не отправляем; кладём systemInstruction отдельно.
  const contents = history
    .filter((m) => m.role !== MessageRole.SYSTEM)
    .map((msg) => ({
      role: msg.role === MessageRole.USER ? "user" : "model",
      parts: [
        {
          text:
            msg.role === MessageRole.USER
              ? msg.content
              : // ответы модели в истории часто хранят state-структуру; сохраняем как JSON
                JSON.stringify(msg.state ?? { text: msg.content }),
        },
      ],
    }));

  contents.push({
    role: "user",
    parts: [{ text: lastUserMessage }],
  });

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

  try {
    const data = await postViaProxy(`${CHAT_MODEL}:generateContent`, body, 60_000);
    const modelText = extractGeminiText(data);

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
    };
  } catch (error: any) {
    console.error("Gemini(proxy) Error:", error);
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
  
  const mainBody = {
    contents: [{ role: "user", parts: [{ text: mainPrompt }] }],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json",
    },
  };

  const mainData = await postViaProxy(`${ANALYSIS_MODEL}:generateContent`, mainBody, 120_000);
  const mainText = extractGeminiText(mainData);
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
        
        const advisoryBody = {
          contents: [{ role: "user", parts: [{ text: advisoryPrompt }] }],
          generationConfig: {
            temperature: 0.7,  // Выше для более характерных реплик
            responseMimeType: "application/json",
          },
        };

        const advisoryData = await postViaProxy(`${ANALYSIS_MODEL}:generateContent`, advisoryBody, 90_000);
        const advisoryText = extractGeminiText(advisoryData);
        const advisoryJsonStr = extractFirstJsonObject(advisoryText);
        
        if (advisoryJsonStr) {
          const advisoryParsed = JSON.parse(advisoryJsonStr);
          if (Array.isArray(advisoryParsed.advisory)) {
            result.advisory = advisoryParsed.advisory.map((a: any) => {
              const member = ADVISORY_COMMISSION.find(m => m.id === a.id);
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
      
      const aquariumBody = {
        contents: [{ role: "user", parts: [{ text: aquariumPrompt }] }],
        generationConfig: {
          temperature: 0.85,  // Ещё выше для живых диалогов
          responseMimeType: "application/json",
        },
      };

      const aquariumData = await postViaProxy(`${ANALYSIS_MODEL}:generateContent`, aquariumBody, 90_000);
      const aquariumText = extractGeminiText(aquariumData);
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

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json",
    },
  };

  const data = await postViaProxy(`${GHOST_MODEL}:generateContent`, body, 45_000);
  const modelText = extractGeminiText(data);
  const jsonStr = extractFirstJsonObject(modelText);

  if (!jsonStr) return stripCodeFences(modelText) || "Продолжайте диалог.";

  const parsed = JSON.parse(jsonStr);
  return String(parsed?.advice ?? "Продолжайте диалог.");
};
