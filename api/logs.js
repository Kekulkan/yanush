/**
 * API для глобального сбора логов сессий
 * 
 * GET  /api/logs - получить все логи (только для админа, нужен ?adminKey=...)
 * POST /api/logs - добавить новый лог
 * DELETE /api/logs?id=... - удалить лог (только для админа)
 * 
 * Для хранения используется Upstash Redis (бесплатный тир)
 * Нужно добавить в Vercel Environment Variables:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 * - ADMIN_LOGS_KEY (секретный ключ для доступа к логам)
 */

// Простая in-memory заглушка если Redis не настроен
let memoryLogs = [];

// Проверка наличия Upstash credentials
const hasRedis = () => {
  return process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
};

// Упрощенный Redis клиент через REST API (Upstash формат)
const redis = {
  async get(key) {
    if (!hasRedis()) return null;
    try {
      const url = `${process.env.UPSTASH_REDIS_REST_URL}/get/${key}`;
      console.log('[Redis GET]', url.substring(0, 50) + '...');
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }
      });
      
      if (!res.ok) {
        console.error('[Redis GET] HTTP error:', res.status, res.statusText);
        return null;
      }
      
      const data = await res.json();
      console.log('[Redis GET] Result exists:', !!data.result);
      return data.result ? JSON.parse(data.result) : null;
    } catch (e) {
      console.error('[Redis GET] Error:', e.message);
      return null;
    }
  },
  async set(key, value) {
    if (!hasRedis()) return false;
    try {
      const url = `${process.env.UPSTASH_REDIS_REST_URL}`;
      const stringValue = JSON.stringify(value);
      console.log('[Redis SET] Key:', key, 'Value length:', stringValue.length);
      
      // Upstash REST API формат: POST с командой в body
      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(['SET', key, stringValue])
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Redis SET] HTTP error:', res.status, errorText);
        return false;
      }
      
      const result = await res.json();
      console.log('[Redis SET] Success:', result);
      return true;
    } catch (e) {
      console.error('[Redis SET] Error:', e.message);
      return false;
    }
  }
};

const LOGS_KEY = 'yanush_global_logs';
const MAX_LOGS = 500; // Максимум логов для хранения

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const adminKey = process.env.ADMIN_LOGS_KEY || '4308';
  const requestAdminKey = req.headers['x-admin-key'] || req.query.adminKey;
  
  // ============ ДИАГНОСТИКА: /api/logs?status=1 ============
  if (req.query.status === '1') {
    return res.status(200).json({
      redis_configured: hasRedis(),
      redis_url_set: !!process.env.UPSTASH_REDIS_REST_URL,
      redis_token_set: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      admin_key_set: !!process.env.ADMIN_LOGS_KEY,
      memory_logs_count: memoryLogs.length,
      timestamp: new Date().toISOString()
    });
  }

  // ============ GET: Получить логи (только админ) ============
  if (req.method === 'GET') {
    if (requestAdminKey !== adminKey) {
      return res.status(403).json({ error: 'Forbidden: Invalid admin key' });
    }

    try {
      let logs;
      if (hasRedis()) {
        logs = await redis.get(LOGS_KEY) || [];
      } else {
        logs = memoryLogs;
      }
      
      return res.status(200).json({ 
        success: true, 
        logs,
        count: logs.length,
        storage: hasRedis() ? 'redis' : 'memory'
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ============ POST: Добавить лог ============
  if (req.method === 'POST') {
    try {
      const sessionLog = req.body;
      
      if (!sessionLog || !sessionLog.id) {
        return res.status(400).json({ error: 'Invalid session log' });
      }

      // Анонимизация: убираем потенциально чувствительные данные
      const anonymizedLog = {
        id: sessionLog.id,
        timestamp: sessionLog.timestamp || Date.now(),
        student_name: sessionLog.student_name || 'Аноним',
        student_age: sessionLog.sessionSnapshot?.student?.age,
        student_gender: sessionLog.sessionSnapshot?.student?.gender,
        accentuation: sessionLog.sessionSnapshot?.chaosDetails?.accentuation,
        intensity: sessionLog.sessionSnapshot?.chaosDetails?.intensity,
        contexts: sessionLog.sessionSnapshot?.chaosDetails?.contexts?.map(c => c.name) || [],
        messages_count: sessionLog.messages?.length || 0,
        duration_seconds: sessionLog.duration_seconds,
        status: sessionLog.status,
        result: sessionLog.result ? {
          overall_score: sessionLog.result.overall_score,
          summary: sessionLog.result.summary,
          commission: sessionLog.result.commission?.map(m => ({
            name: m.name,
            role: m.role,
            score: m.score,
            verdict: m.verdict
          }))
        } : null,
        // Сохраняем полный диалог для анализа
        dialogue: sessionLog.messages?.map(m => ({
          role: m.role,
          content: m.content,
          state: m.state
        })) || []
      };

      let logs;
      if (hasRedis()) {
        logs = await redis.get(LOGS_KEY) || [];
      } else {
        logs = memoryLogs;
      }

      // Проверяем дубликаты
      if (!logs.find(l => l.id === anonymizedLog.id)) {
        logs.unshift(anonymizedLog);
        
        // Ограничиваем количество
        if (logs.length > MAX_LOGS) {
          logs = logs.slice(0, MAX_LOGS);
        }

        if (hasRedis()) {
          await redis.set(LOGS_KEY, logs);
        } else {
          memoryLogs = logs;
        }
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Log saved',
        storage: hasRedis() ? 'redis' : 'memory'
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ============ DELETE: Удалить лог (только админ) ============
  if (req.method === 'DELETE') {
    if (requestAdminKey !== adminKey) {
      return res.status(403).json({ error: 'Forbidden: Invalid admin key' });
    }

    const logId = req.query.id;
    
    if (logId === 'all') {
      // Очистить все логи
      if (hasRedis()) {
        await redis.set(LOGS_KEY, []);
      } else {
        memoryLogs = [];
      }
      return res.status(200).json({ success: true, message: 'All logs deleted' });
    }

    if (!logId) {
      return res.status(400).json({ error: 'Log ID required' });
    }

    try {
      let logs;
      if (hasRedis()) {
        logs = await redis.get(LOGS_KEY) || [];
      } else {
        logs = memoryLogs;
      }

      const filtered = logs.filter(l => l.id !== logId);
      
      if (hasRedis()) {
        await redis.set(LOGS_KEY, filtered);
      } else {
        memoryLogs = filtered;
      }

      return res.status(200).json({ success: true, message: 'Log deleted' });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
