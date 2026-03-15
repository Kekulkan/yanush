const fs = require('fs');

const UPSTASH_URL = 'https://modest-kingfish-37804.upstash.io';
const UPSTASH_TOKEN = 'AZOsAAIncDI2MWE3Yzk2ZDRlYzE0YjczYWE3NjM3YzQ2ZjJlODNjNHAyMzc4MDQ';

async function fetchFromUpstash(path) {
    try {
        const response = await fetch(`${UPSTASH_URL}/${path}`, {
            headers: {
                Authorization: `Bearer ${UPSTASH_TOKEN}`
            }
        });
        return await response.json();
    } catch (e) {
        console.error(`Error fetching path ${path}:`, e);
        return null;
    }
}

async function run() {
    console.log('Сканируем базу Upstash Redis...');
    
    // 1. Получим все ключи через команду SCAN 0 MATCH * COUNT 1000
    const scanResponse = await fetchFromUpstash('scan/0/MATCH/*/COUNT/10000');
    if (!scanResponse || !scanResponse.result) {
        console.log('Не удалось просканировать ключи.');
        return;
    }

    const nextCursor = scanResponse.result[0];
    const keys = scanResponse.result[1];
    
    console.log(`Найдено ${keys.length} ключей в базе.`);
    if (keys.length === 0) {
        console.log('База полностью пуста!');
        return;
    }

    // 2. Скачиваем значения всех ключей
    let allLogs = [];
    
    for (const key of keys) {
        const valueResponse = await fetchFromUpstash(`get/${key}`);
        if (valueResponse && valueResponse.result) {
            try {
                const parsedValue = JSON.parse(valueResponse.result);
                
                // Если значение это массив, добавляем все его элементы
                if (Array.isArray(parsedValue)) {
                    allLogs = allLogs.concat(parsedValue);
                } else {
                    // Иначе просто добавляем сам объект
                    allLogs.push(parsedValue);
                }
            } catch (e) {
                console.log(`Ключ ${key} не является JSON. Игнорируем.`);
            }
        }
    }

    console.log(`\nВсего извлечено ${allLogs.length} JSON-объектов.`);

    if (allLogs.length === 0) {
        console.log('В базе нет сессий.');
        return;
    }

    // Сохраняем все в файл
    const filename = 'all_redis_sessions.json';
    fs.writeFileSync(filename, JSON.stringify(allLogs, null, 2));
    console.log(`Все данные сохранены в файл: ${filename}`);

    // Ищем самую длинную сессию
    let longestSession = null;
    let maxLength = 0;

    allLogs.forEach((session) => {
        if (!session || typeof session !== 'object') return;
        
        let length = 0;
        if (session.chat_history && Array.isArray(session.chat_history)) {
            length = session.chat_history.length;
        } else if (session.messages && Array.isArray(session.messages)) {
            length = session.messages.length;
        } else if (session.dialogue && Array.isArray(session.dialogue)) {
            length = session.dialogue.length;
        }
        
        if (length > maxLength) {
            maxLength = length;
            longestSession = session;
        }
    });

    if (longestSession) {
        console.log('\n=======================================');
        console.log('🏆 САМАЯ ДЛИННАЯ СЕССИЯ НАЙДЕНА 🏆');
        console.log('=======================================');
        console.log('ID ключа / сессии:', longestSession.id || 'Неизвестно');
        const studentName = longestSession.student_name || (longestSession.scenario_config && longestSession.scenario_config.student && longestSession.scenario_config.student.name) || 'Неизвестно';
        console.log('Имя ученика:', studentName);
        console.log('Дата:', new Date(longestSession.timestamp || longestSession.created_at).toLocaleString('ru-RU'));
        console.log('Количество сообщений:', maxLength);
        console.log('=======================================');
    }
}

run();
