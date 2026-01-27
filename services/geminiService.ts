// services/geminiService.ts
import { Message, MessageRole, GlobalSettings, AnalysisResult } from "../types";
import { DEFAULT_SETTINGS } from "../constants";

type GeminiChatResponse = {
  text: string;
  thought: string | null;
  non_verbal: string | null;
  non_verbal_valence: number;
  trust: number;
  stress: number;
  world_event: string | null;
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

  return {
    text: text || "...",
    thought,
    non_verbal: raw?.non_verbal != null ? String(raw.non_verbal) : null,
    non_verbal_valence: coerceNum(raw?.non_verbal_valence, 0),
    trust: coerceNum(raw?.trust, 50),
    stress: coerceNum(raw?.stress, 50),
    world_event: raw?.world_event != null ? String(raw.world_event) : null,
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
      game_over: false,
      violation_reason: error?.message ? String(error.message) : null,
    };
  }
};

export const analyzeChatSession = async (
  history: Message[],
  scenarioName: string,
  endReason: string
): Promise<AnalysisResult> => {
  const transcript = history.map((m) => `${m.role}: ${m.content}`).join("\n");

  const prompt = `Проведи педагогический анализ. Сценарий: ${scenarioName}. Причина завершения: ${endReason}.
Транскрипт:
${transcript}

Верни строго JSON со структурой:
{
  "overall_score": number,
  "summary": string,
  "commission": [
    { "title": string, "severity": "low"|"medium"|"high", "description": string }
  ]
}`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  };

  const data = await postViaProxy(`${ANALYSIS_MODEL}:generateContent`, body, 90_000);
  const modelText = extractGeminiText(data);

  const jsonStr = extractFirstJsonObject(modelText) ?? stripCodeFences(modelText);
  return JSON.parse(jsonStr);
};

export const generateGhostResponse = async (
  history: Message[],
  context: string
): Promise<string> => {
  const transcript = history.map((m) => `${m.role}: ${m.content}`).join("\n");

  const prompt = `Напиши идеальную реплику педагога (коротко, естественно, по-русски).
Контекст: ${context}

История:
${transcript}

Верни строго JSON:
{ "advice": string }`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.6,
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
