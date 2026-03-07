/**
 * Промпт для GM (Гейммастера)
 * Генерирует внешние события, NPC, дилеммы
 * Вызывается ОТДЕЛЬНО от ученика
 */

import { SessionContext } from '../types';
import { NORMATIVE_CONSTRAINTS } from '../data/normativeConstraints';
import { KNOWLEDGE_BASE } from '../data/knowledgeBase';

interface GMPromptParams {
  // Контекст сцены
  scenarioDescription: string;
  studentName: string;
  studentAge: number;
  teacherName: string;
  contexts: SessionContext[];
  
  // Состояние диалога
  turnCount: number;
  currentTrust: number;
  currentStress: number;
  
  // История (последние N реплик)
  recentMessages: Array<{
    role: 'teacher' | 'student';
    content: string;
  }>;
  
  // Активный NPC (если есть)
  activeNpc?: {
    name: string;
    role: string;
  };
  
  // Последнее событие (чтобы не повторяться)
  lastEventType?: string;
}

export function buildGMPrompt(params: GMPromptParams): string {
  const {
    scenarioDescription, studentName, studentAge, teacherName,
    contexts, turnCount, currentTrust, currentStress,
    recentMessages, activeNpc, lastEventType
  } = params;

  const recentTranscript = recentMessages
    .map(m => `${m.role === 'teacher' ? 'УЧИТЕЛЬ' : 'УЧЕНИК'}: ${m.content}`)
    .join('\n');

  const contextList = contexts
    .map(c => `- ${c.module.name}: ${c.module.prompt_text}`)
    .join('\n');

  // Сбор тегов знаний из всех активных модулей
  const knowledgeTags = new Set<string>();
  contexts.forEach(c => {
    if (c.module.knowledge_tags) {
      c.module.knowledge_tags.forEach(tag => knowledgeTags.add(tag));
    }
  });

  const knowledgeBaseText = Array.from(knowledgeTags)
    .map(tag => KNOWLEDGE_BASE[tag])
    .filter(Boolean)
    .join('\n\n');

  const knowledgeBaseSection = knowledgeBaseText 
    ? `\n═══════════════════════════════════════════════════════════\nБАЗА ЗНАНИЙ (СИТУАТИВНЫЙ КОНТЕКСТ):\n═══════════════════════════════════════════════════════════\n${knowledgeBaseText}\n` 
    : '';

  return `[РОЛЬ: GM — ГЕЙММАСТЕР]
[ЗАДАЧА: Решить, нужно ли сгенерировать внешнее событие]
${NORMATIVE_CONSTRAINTS}
${knowledgeBaseSection}
═══════════════════════════════════════════════════════════
КОНТЕКСТ СЦЕНЫ:
═══════════════════════════════════════════════════════════
СИТУАЦИЯ: ${scenarioDescription}
УЧЕНИК: ${studentName}, ${studentAge} лет
УЧИТЕЛЬ: ${teacherName}
ХОД: ${turnCount}
ДОВЕРИЕ: ${currentTrust}%
СТРЕСС: ${currentStress}%

КОНТЕКСТЫ УЧЕНИКА:
${contextList}

${activeNpc ? `⚡ В СЦЕНЕ УЖЕ ЕСТЬ NPC: ${activeNpc.name} (${activeNpc.role})` : ''}
${lastEventType ? `❌ Последнее событие было: ${lastEventType} — НЕ ПОВТОРЯЙ этот тип!` : ''}

═══════════════════════════════════════════════════════════
ПОСЛЕДНИЕ РЕПЛИКИ:
═══════════════════════════════════════════════════════════
${recentTranscript}

═══════════════════════════════════════════════════════════
ТВОЯ ЗАДАЧА:
═══════════════════════════════════════════════════════════

1. ОЦЕНИ: Нужно ли событие СЕЙЧАС?
   - В среднем события должны появляться раз в 4-7 ходов
   - Если ещё НЕ БЫЛО ни одного события и ход >= 5 — СКЛОНЯЙСЯ к should_generate: true, даже если всё вроде спокойно
   - Если ${turnCount < 4 ? 'слишком рано (ход ' + turnCount + ')' : turnCount > 9 ? 'почти обязательно пора вмешаться!' : 'можно, если уместно'}
   - Если уже есть активный NPC — можешь НЕ добавлять новое событие, но хотя бы подумай, не превратить ли его действия в событие-дилемму

2. ЕСЛИ ДА — создай ДИЛЕММУ:
   - Событие ТРЕБУЕТ от учителя ВЫБОРА
   - Нет "правильного" ответа — только последствия
   - Событие должно быть ОРГАНИЧНЫМ для ситуации

3. УЧИТЫВАЙ КОНТЕКСТ И ОБСТАНОВКУ (экстраполируй на всю сессию):
   - "После урока" / "вдвоём" → класс ПУСТОЙ, других учеников НЕТ; событие не может быть "во время урока" или с появлением всего класса
   - "Во время урока" → есть 20-25 учеников; можно class_reaction
   - Если учитель и ученик в кабинете вдвоём — в событии не может "взяться весь класс из ниоткуда"
   - NPC — взрослые профессионалы: завуч не отстраняет за вежливую просьбу, охранник не бросается в драку без угрозы

═══════════════════════════════════════════════════════════
ТИПЫ СОБЫТИЙ (примеры, не ограничения!):
═══════════════════════════════════════════════════════════
• npc_enters — заходит NPC (завуч, коллега, родитель...)
• phone_call — звонок (учителю или ученику)
• emergency — срочная ситуация (кража, драка, тревога)
• class_reaction — реакция класса (ТОЛЬКО если урок идёт!)
• technical — технический сбой (свет, сигнализация)
• dilemma — любое другое событие с выбором

═══════════════════════════════════════════════════════════
ФОРМАТ ОТВЕТА (JSON):
═══════════════════════════════════════════════════════════
{
  "should_generate": true/false,
  "reasoning": "Почему да/нет (1 предложение)",
  
  // Если should_generate: true
  "event": {
    "type": "npc_enters|phone_call|emergency|class_reaction|technical|dilemma",
    "description": "Что происходит (видит учитель)",
    "dilemma": "В чём выбор? Какие варианты?",
    "npc_name": "Имя NPC (если есть)",
    "npc_role": "завуч|психолог|родитель|одноклассник|охранник|коллега",
    "npc_dialogue": "Что говорит NPC",
    "npc_stays": true/false, // NPC остаётся в сцене?
    "requires_response": true
  }
}

⚠️ Если should_generate: false — поле event не нужно.
⚠️ Будь КРЕАТИВЕН, но ОРГАНИЧЕН. Событие должно вписываться в контекст.`;
}

export function buildGMSystemMessage(params: GMPromptParams): string {
  return buildGMPrompt(params);
}
