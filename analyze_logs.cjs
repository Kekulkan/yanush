const fs = require('fs');

const filename = 'all_redis_sessions.json';
const cleanedFilename = 'clean_redis_sessions.json';

try {
    const data = fs.readFileSync(filename, 'utf8');
    let sessions = JSON.parse(data);
    
    console.log(`Изначально сессий: ${sessions.length}`);
    
    const validSessions = [];
    const removedSessions = [];

    sessions.forEach(session => {
        const msgs = session.chat_history || session.messages || session.dialogue || [];
        
        if (msgs.length === 0) {
            validSessions.push(session);
            return;
        }

        let isSpamLoop = false;
        const phraseCounts = {};

        // Считаем фразы модели
        for (const msg of msgs) {
            if (msg.role === 'model' || msg.role === 'assistant') {
                const text = typeof msg.content === 'string' ? msg.content.trim() : '';
                // Игнорируем совсем короткие фразы (если вдруг) или пустые
                if (text.length > 5) {
                    phraseCounts[text] = (phraseCounts[text] || 0) + 1;
                    if (phraseCounts[text] > 4) {
                        isSpamLoop = true;
                        break;
                    }
                }
            }
        }

        if (isSpamLoop) {
            removedSessions.push({
                id: session.id,
                name: session.student_name,
                msgCount: msgs.length
            });
        } else {
            validSessions.push(session);
        }
    });

    console.log(`Удалено зацикленных (спам) сессий: ${removedSessions.length}`);
    removedSessions.forEach(rs => console.log(` - Ученик: ${rs.name}, Сообщений: ${rs.msgCount}, ID: ${rs.id}`));

    console.log(`Осталось валидных сессий: ${validSessions.length}`);
    
    fs.writeFileSync(cleanedFilename, JSON.stringify(validSessions, null, 2));
    
    // Ищем самую длинную среди валидных
    let longestSession = null;
    let maxLength = 0;

    validSessions.forEach(session => {
        const msgs = session.chat_history || session.messages || session.dialogue || [];
        if (msgs.length > maxLength) {
            maxLength = msgs.length;
            longestSession = session;
        }
    });

    if (longestSession) {
        console.log('\n=======================================');
        console.log('🏆 НАСТОЯЩАЯ САМАЯ ДЛИННАЯ СЕССИЯ 🏆');
        console.log('=======================================');
        console.log('ID:', longestSession.id || 'N/A');
        const studentName = longestSession.student_name || (longestSession.scenario_config?.student?.name) || 'Неизвестно';
        console.log('Имя ученика:', studentName);
        console.log('Дата:', new Date(longestSession.timestamp || longestSession.created_at).toLocaleString('ru-RU'));
        console.log('Количество сообщений:', maxLength);
        console.log('=======================================');
    }

} catch (e) {
    console.error('Ошибка:', e);
}
