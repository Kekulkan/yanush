export default async function handler(req, res) {
  const API_KEY = process.env.API_KEY;
  const ELLYAI_KEY = process.env.ELLYAI_KEY; // Отдельный ключ для EllyAI

  if (req.method === "GET") {
    return res.status(200).json({ ok: true, route: "/api/proxy", ts: Date.now() });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const action = String(req.query.url || "").trim();
    let targetUrl;
    
    // ============ ELLYAI (OpenAI-совместимый) ============
    if (action.startsWith("ellyai:")) {
      const model = action.replace("ellyai:", "");
      targetUrl = "https://ellyai.pro/v1/chat/completions";
      
      const body = {
        model: model,
        messages: req.body?.messages || [],
        max_tokens: req.body?.max_tokens || 4096,
        temperature: req.body?.temperature || 0.7,
      };
      
      const upstream = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ELLYAI_KEY}`,
        },
        body: JSON.stringify(body),
      });

      const text = await upstream.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
      return res.status(upstream.status).json(data);
    }
    
    // ============ CLAUDE (Anthropic) ============
    if (action.startsWith("claude-")) {
      // Claude (Anthropic) API
      // Формат: claude-sonnet-4-20250514
      if (!/^claude[-\w.]+$/.test(action)) {
        return res.status(400).json({
          error: "Bad Claude model name. Expected like 'claude-sonnet-4-20250514'.",
        });
      }
      targetUrl = `https://api.proxyapi.ru/anthropic/v1/messages`;
      
      // Claude требует model в теле запроса
      const body = {
        model: action,
        max_tokens: req.body?.max_tokens || 4096,
        messages: req.body?.messages || [],
        system: req.body?.system || undefined,
      };
      
      const upstream = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(body),
      });

      const text = await upstream.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
      return res.status(upstream.status).json(data);
      
    } else if (action.includes(":")) {
      // Gemini API (формат: gemini-2.0-flash:generateContent)
      if (!/^gemini[-\w.]*:(generateContent|streamGenerateContent)$/.test(action)) {
        return res.status(400).json({
          error:
            "Bad url parameter. Expected like 'gemini-2.0-flash:generateContent' " +
            "or 'claude-sonnet-4-20250514'.",
        });
      }
      targetUrl = `https://api.proxyapi.ru/google/v1beta/models/${encodeURIComponent(action)}`;
      
      const upstream = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(req.body ?? {}),
      });

      const text = await upstream.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
      return res.status(upstream.status).json(data);
      
    } else {
      return res.status(400).json({
        error: "Unknown model format. Use 'gemini-...:generateContent' or 'claude-...'",
      });
    }
  } catch (e) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
