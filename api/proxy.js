// api/proxy.js
export default async function handler(req, res) {
  // Ключ ProxyAPI должен лежать в переменной окружения API_KEY на Vercel
  const API_KEY = process.env.API_KEY;
  if (req.query.ping === "1") {
    return res.status(200).json({ hasKey: Boolean(API_KEY), keyLen: API_KEY ? API_KEY.length : 0 });
  }
  
  if (!API_KEY) {
    return res.status(500).json({ error: "Missing API_KEY env var (ProxyAPI key)" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Ожидаем действие вида: gemini-2.0-flash-lite:generateContent
    const action = String(req.query.url || "").trim();

    // Мини-валидация, чтобы не проксировать произвольные пути
    if (!action || !/^gemini[-\w.]*:(generateContent|streamGenerateContent)$/.test(action)) {
      return res.status(400).json({
        error:
          "Bad url parameter. Expected like 'gemini-2.0-flash-lite:generateContent' " +
          "or 'gemini-2.0-flash-lite:streamGenerateContent'.",
      });
    }

    const targetUrl = `https://api.proxyapi.ru/google/v1beta/models/${encodeURIComponent(action)}`;

    const upstream = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(req.body ?? {}),
    });

    // Пробуем вернуть JSON, но если вдруг вернётся не-JSON — вернём как текст
    const text = await upstream.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return res.status(upstream.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
