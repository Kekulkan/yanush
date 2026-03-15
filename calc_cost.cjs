const fs = require('fs');

const CLAUDE_IN_PRICE_PER_M = 3.00;
const CLAUDE_OUT_PRICE_PER_M = 15.00;
const MISTRAL_IN_PRICE_PER_M = 2.00;
const MISTRAL_OUT_PRICE_PER_M = 6.00;

function estimateTokens(text) {
    if (!text) return 0;
    // Грубая оценка: 1 русский токен ~ 3-4 символа кириллицы
    return Math.ceil(text.length / 3.5); 
}

try {
    const data = fs.readFileSync('clean_redis_sessions.json', 'utf8');
    const sessions = JSON.parse(data);
    
    // Берем ту самую рекордную сессию с Еленой
    const targetId = 'e5a03db6-3c34-4f3d-a19c-cca4ed8f11e6';
    const s = sessions.find(s => s.id === targetId);
    
    if (!s) {
        console.error('Сессия не найдена');
        process.exit(1);
    }
    
    console.log(`Оценка стоимости сессии: ${s.student_name} (${s.id})`);
    
    const msgs = s.chat_history || s.messages || s.dialogue || [];
    
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let systemPromptTokens = estimateTokens(s.constructedPrompt || s.scenario_description || '');

    // Каждое сообщение тянет за собой всю историю ДО него.
    // Считаем пошагово:
    let historyText = '';
    
    for (let i = 0; i < msgs.length; i++) {
        const msg = msgs[i];
        
        if (msg.role === 'user') {
            // Пользователь пишет
            historyText += `\n[USER]: ${msg.content}`;
        } else if (msg.role === 'model' || msg.role === 'assistant') {
            // Модель генерирует ответ
            const inputTokensForThisTurn = systemPromptTokens + estimateTokens(historyText);
            totalPromptTokens += inputTokensForThisTurn;
            
            // В ответе модели у нас есть текст и JSON с состоянием (thought, trust, stress)
            // Плюс скрытые токены на :thinking, которые мы не видим, но они тарифицируются.
            // Допустим, мыслей было символов 300 (около 85 токенов).
            const contentTokens = estimateTokens(typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content));
            const thinkingTokens = 85; 
            const outputTokensForThisTurn = contentTokens + thinkingTokens;
            
            totalCompletionTokens += outputTokensForThisTurn;
            
            // Записываем ответ модели в историю
            historyText += `\n[MODEL]: ${typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}`;
        }
    }
    
    console.log('---------------------------------');
    console.log('Сообщений:', msgs.length);
    console.log('Суммарно отправлено токенов (INPUT): ~', totalPromptTokens);
    console.log('Суммарно сгенерировано токенов (OUTPUT): ~', totalCompletionTokens);
    
    // Подсчет цены:
    const costIn = (totalPromptTokens / 1_000_000) * CLAUDE_IN_PRICE_PER_M;
    const costOut = (totalCompletionTokens / 1_000_000) * CLAUDE_OUT_PRICE_PER_M;
    const totalCost = costIn + costOut;
    
    console.log('---------------------------------');
    console.log(`Стоимость INPUT: $${costIn.toFixed(4)}`);
    console.log(`Стоимость OUTPUT: $${costOut.toFixed(4)}`);
    console.log(`Итоговая стоимость (Claude 3.7 Sonnet): $${totalCost.toFixed(4)} (примерно ${(totalCost * 100).toFixed(2)} ₽)`);

} catch(e) {
    console.error(e);
}
