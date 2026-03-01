export async function onRequest(context) {
  const { request, env } = context;

  // Обработка CORS preflight запросов
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // Проверка маршрута
  if (request.method === "GET") {
    return new Response(JSON.stringify({ ok: true, route: "/api/proxy", ts: Date.now() }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const urlParams = new URL(request.url).searchParams;
    const action = String(urlParams.get("url") || "").trim();

    // ВАЖНО: Защита от SSRF
    const isAllowedAction = 
      action.startsWith("openrouter:") || 
      action.startsWith("aitunnel:") || 
      action.startsWith("claude-") || 
      action.includes(":"); 

    if (!isAllowedAction) {
      return new Response(JSON.stringify({ error: "SSRF Protection: Action not allowed." }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    let requestBody = {};
    try {
      requestBody = await request.clone().json();
    } catch (e) {
      // Body empty or invalid JSON
    }

    // =========================================================================
    // Настройки Cloudflare AI Gateway
    // =========================================================================
    const cfAccountId = env.CF_ACCOUNT_ID;
    const cfGatewayName = env.CF_GATEWAY_NAME;
    const useDirectApi = env.USE_DIRECT_API === "true"; // Если true, идем в обход proxyapi.ru напрямую к Anthropic/Google

    // Вспомогательная функция для генерации URL через AI Gateway (если настроен)
    const getGatewayUrl = (provider, originalUrl) => {
      if (cfAccountId && cfGatewayName) {
        // Формат Gateway: https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/{provider}
        // Оригинальный: https://api.anthropic.com/v1/messages
        // В случае с Anthropic путь /v1/messages добавляется к Gateway.
        // Поэтому для CF мы берем базовый Gateway URL и добавляем нужный путь.
        if (provider === "anthropic") {
          return `https://gateway.ai.cloudflare.com/v1/${cfAccountId}/${cfGatewayName}/anthropic/v1/messages`;
        }
        if (provider === "google-ai-studio") {
          // Исходный action содержит v1beta/models/...
          // Возвращаем базовый url для google-ai-studio (далее приклеим путь)
          return `https://gateway.ai.cloudflare.com/v1/${cfAccountId}/${cfGatewayName}/google-ai-studio/v1beta/models/${encodeURIComponent(action)}`;
        }
      }
      return originalUrl;
    };

    let targetUrl;
    let fetchHeaders = {
      "Content-Type": "application/json",
    };
    let fetchBody = {};

    // ============ OPENROUTER ============
    if (action.startsWith("openrouter:")) {
      const OPENROUTER_KEY = env.OPENROUTER_KEY;
      if (!OPENROUTER_KEY) {
        return new Response(JSON.stringify({ error: "OPENROUTER_KEY not configured" }), { status: 500 });
      }
      const model = action.replace("openrouter:", "");
      targetUrl = "https://openrouter.ai/api/v1/chat/completions";
      
      fetchBody = {
        model: model,
        messages: requestBody?.messages || [],
        max_tokens: requestBody?.max_tokens || 4096,
        temperature: requestBody?.temperature || 0.7,
      };

      fetchHeaders["Authorization"] = `Bearer ${OPENROUTER_KEY}`;
      fetchHeaders["HTTP-Referer"] = env.APP_URL || "https://yanush.pages.dev"; 
      fetchHeaders["X-Title"] = "Yanush AI Teacher Trainer";
    }
    
    // ============ AITUNNEL ============
    else if (action.startsWith("aitunnel:")) {
      const AITUNNEL_KEY = env.AITUNNEL_KEY;
      const model = action.replace("aitunnel:", "");
      targetUrl = "https://api.aitunnel.ru/v1/chat/completions";
      
      fetchBody = {
        model: model,
        messages: requestBody?.messages || [],
        max_tokens: requestBody?.max_tokens || 4096,
        temperature: requestBody?.temperature || 0.7,
      };

      fetchHeaders["Authorization"] = `Bearer ${AITUNNEL_KEY}`;
    }
    
    // ============ CLAUDE (Anthropic) ============
    else if (action.startsWith("claude-")) {
      if (!/^claude[-\w.]+$/.test(action)) {
        return new Response(JSON.stringify({ error: "Bad Claude model name." }), { status: 400 });
      }
      
      const API_KEY = env.API_KEY || env.CLAUDE_API_KEY;
      
      if (useDirectApi) {
        // Прямой доступ через Anthropic API (или через CF AI Gateway)
        targetUrl = getGatewayUrl("anthropic", "https://api.anthropic.com/v1/messages");
        fetchHeaders["x-api-key"] = API_KEY;
        fetchHeaders["anthropic-version"] = "2023-06-01";
      } else {
        // Старый вариант (через proxyapi.ru)
        targetUrl = `https://api.proxyapi.ru/anthropic/v1/messages`;
        fetchHeaders["Authorization"] = `Bearer ${API_KEY}`;
      }
      
      fetchBody = {
        model: action,
        max_tokens: requestBody?.max_tokens || 4096,
        messages: requestBody?.messages || [],
        system: requestBody?.system || undefined,
      };
    } 
    
    // ============ GEMINI ============
    else if (action.includes(":")) {
      if (!/^gemini[-\w.]*:(generateContent|streamGenerateContent)$/.test(action)) {
        return new Response(JSON.stringify({ error: "Bad url parameter." }), { status: 400 });
      }
      
      const API_KEY = env.API_KEY || env.GEMINI_API_KEY;
      
      if (useDirectApi) {
        // Прямой доступ через Google AI Studio (или через CF AI Gateway)
        targetUrl = getGatewayUrl("google-ai-studio", `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(action)}`);
        targetUrl += `?key=${API_KEY}`;
      } else {
        // Старый вариант (через proxyapi.ru)
        targetUrl = `https://api.proxyapi.ru/google/v1beta/models/${encodeURIComponent(action)}`;
        fetchHeaders["Authorization"] = `Bearer ${API_KEY}`;
      }
      
      fetchBody = requestBody ?? {};
    }

    // =========================================================================
    // Выполнение проксированного запроса
    // =========================================================================
    
    const upstream = await fetch(targetUrl, {
      method: "POST",
      headers: fetchHeaders,
      body: JSON.stringify(fetchBody),
    });

    const text = await upstream.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!upstream.ok) {
      console.error(`[Proxy] Error from ${targetUrl}:`, JSON.stringify(data));
    }

    return new Response(JSON.stringify(data), {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
