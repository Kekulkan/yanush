/**
 * Сервис для загрузки системных промптов из prompts.txt
 * Промпты можно редактировать без изменения кода
 */

// Кэш загруженных промптов
let promptsCache: Record<string, string> | null = null;

/**
 * Загрузить и распарсить prompts.txt
 */
async function loadPromptsFile(): Promise<Record<string, string>> {
  if (promptsCache) return promptsCache;

  try {
    const response = await fetch('/prompts.txt');
    if (!response.ok) {
      console.warn('prompts.txt not found, using defaults');
      return {};
    }
    
    const text = await response.text();
    promptsCache = parsePrompts(text);
    return promptsCache;
  } catch (error) {
    console.warn('Failed to load prompts.txt:', error);
    return {};
  }
}

/**
 * Парсинг файла промптов
 * Формат: [PROMPT_ID] ... текст промпта ... ===
 */
function parsePrompts(text: string): Record<string, string> {
  const prompts: Record<string, string> = {};
  
  // Разбиваем по разделителю ===
  const sections = text.split(/\n===\n/);
  
  for (const section of sections) {
    // Ищем ID промпта в формате [PROMPT_ID]
    const idMatch = section.match(/\[([A-Z_]+)\]/);
    if (!idMatch) continue;
    
    const id = idMatch[1];
    
    // Находим начало контента (после строки с ===== или после описания)
    const lines = section.split('\n');
    let contentStart = 0;
    let foundHeader = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Пропускаем заголовки и описания (строки с === или начинающиеся с "Используется:", "Назначение:" и т.д.)
      if (line.includes('===') || 
          line.startsWith('Используется:') || 
          line.startsWith('Назначение:') ||
          line.startsWith('Переменные:')) {
        foundHeader = true;
        continue;
      }
      // Если уже прошли заголовок и строка не пустая — это начало контента
      if (foundHeader && line.trim()) {
        contentStart = i;
        break;
      }
    }
    
    // Извлекаем контент
    const content = lines.slice(contentStart).join('\n').trim();
    if (content) {
      prompts[id] = content;
    }
  }
  
  return prompts;
}

/**
 * Получить промпт по ID
 */
export async function getPrompt(id: string): Promise<string | null> {
  const prompts = await loadPromptsFile();
  return prompts[id] || null;
}

/**
 * Получить промпт синхронно (использует кэш)
 * Вызывать только после инициализации через preloadPrompts()
 */
export function getPromptSync(id: string): string | null {
  if (!promptsCache) {
    console.warn('Prompts not preloaded, call preloadPrompts() first');
    return null;
  }
  return promptsCache[id] || null;
}

/**
 * Предзагрузка промптов (вызвать при старте приложения)
 */
export async function preloadPrompts(): Promise<void> {
  await loadPromptsFile();
}

/**
 * Сбросить кэш (для перезагрузки промптов)
 */
export function clearPromptsCache(): void {
  promptsCache = null;
}

/**
 * Получить все ID загруженных промптов
 */
export async function getPromptIds(): Promise<string[]> {
  const prompts = await loadPromptsFile();
  return Object.keys(prompts);
}

/**
 * Заменить переменные в промпте
 */
export function substituteVariables(template: string, variables: Record<string, string | number>): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, String(value));
  }
  
  return result;
}

// ============ ДЕФОЛТНЫЕ ПРОМПТЫ (на случай если файл не загрузился) ============

export const DEFAULT_PROMPTS = {
  CHAT_JSON_INSTRUCTION: `
Отвечай ТОЛЬКО СТРОГИМ JSON (без \`\`\`).
Схема:
{
  "text": "реплика студента",
  "thought": "внутренний ход мысли (для админа)",
  "trust": число 0..100,
  "stress": число 0..100,
  "game_over": true/false,
  "violation_reason": "если game_over=true — кратко почему",
  "world_event": {
    "type": "тип события",
    "description": "описание",
    "trust_delta": число,
    "stress_delta": число
  },
  "extreme_outcome": "тип исхода если критический"
}
Никакого текста вне JSON.
`,

  ANALYSIS_COMMISSION: `
Ты — комиссия по оценке педагогического диалога.

Ответь ТОЛЬКО СТРОГИМ JSON (без \`\`\`):
{
  "overall_score": число 0..100,
  "summary": "1-2 предложения итог",
  "commission": [
    { "name": "…", "role": "…", "score": число 0..100, "verdict": "кратко" }
  ]
}
Никакого текста вне JSON.
`,

  GHOST_PROMPTER: `
Ты — суфлёр педагога. Дай ОДНУ короткую реплику/подсказку (1–2 предложения),
которая улучшит контакт, снизит стресс студента и повысит доверие.
Не упоминай, что ты ИИ. Без JSON. Только текст.
`
};
