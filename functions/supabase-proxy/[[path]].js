/**
 * Cloudflare Pages Function: Supabase Proxy
 * Проксирует все запросы к Supabase, чтобы фронтенд на российском сервере
 * мог обращаться к Supabase через Cloudflare (без блокировок ТСПУ).
 * 
 * Маршрут: /supabase-proxy/* → https://ayrdlilidfgmuvceygbq.supabase.co/*
 */

const SUPABASE_URL = "https://ayrdlilidfgmuvceygbq.supabase.co";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info, Prefer, Range, Accept, x-supabase-api-version, supa-client-uid",
  "Access-Control-Expose-Headers": "Content-Range, X-Total-Count, Content-Length",
};

export async function onRequest(context) {
  const { request } = context;

  // Обработка CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    
    // Вырезаем /supabase-proxy из пути и строим целевой URL
    const targetPath = url.pathname.replace(/^\/supabase-proxy/, "");
    const targetUrl = `${SUPABASE_URL}${targetPath}${url.search}`;

    // Копируем заголовки из оригинального запроса
    const headers = new Headers(request.headers);
    // Убираем заголовки, которые могут мешать
    headers.delete("host");
    headers.delete("cf-connecting-ip");
    headers.delete("cf-ipcountry");
    headers.delete("cf-ray");
    headers.delete("cf-visitor");

    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "follow",
    });

    // Копируем заголовки ответа и добавляем CORS
    const responseHeaders = new Headers(upstream.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      responseHeaders.set(key, value);
    });

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });

  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Supabase proxy error", message: e?.message || String(e) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
}
