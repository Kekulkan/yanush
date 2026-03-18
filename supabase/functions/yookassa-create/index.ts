import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    
    // Создаем клиента с сервисным ключом для записи в БД в обход RLS
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Verify token using Anon Key and user's token
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser()
    
    if (userError || !user) {
      console.error('Auth Error:', userError)
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userError }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { amount, sessions, returnUrl } = await req.json()

    if (!amount || !sessions) {
      return new Response(JSON.stringify({ error: 'Amount and sessions are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const shopId = Deno.env.get('YOOKASSA_SHOP_ID')
    const secretKey = Deno.env.get('YOOKASSA_SECRET_KEY')
    const idempotenceKey = crypto.randomUUID()
    const authString = btoa(`${shopId}:${secretKey}`)

    const yookassaPayload = {
      amount: {
        value: amount.toFixed(2),
        currency: "RUB"
      },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: returnUrl || "https://yanush-sim.ru/cabinet"
      },
      description: `Оплата пакета из ${sessions} сессий для пользователя ${user.id}`,
      metadata: {
        user_id: user.id,
        sessions_count: sessions
      }
    }

    const yookassaResp = await fetch("https://api.yookassa.ru/v3/payments", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authString}`,
        "Idempotence-Key": idempotenceKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(yookassaPayload)
    })

    if (!yookassaResp.ok) {
      console.error("YooKassa Error:", await yookassaResp.text())
      return new Response(JSON.stringify({ error: 'YooKassa payment creation failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const paymentData = await yookassaResp.json()

    // Save pending payment
    const { error: dbError } = await supabaseAdmin.from('yookassa_payments').insert({
      user_id: user.id,
      payment_id: paymentData.id,
      amount: amount,
      sessions_count: sessions,
      status: "pending"
    })

    if (dbError) {
      console.error("DB Error:", dbError)
      return new Response(JSON.stringify({ error: 'Failed to save payment record' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const jsonString = JSON.stringify({ 
      confirmationUrl: paymentData.confirmation.confirmation_url,
      paymentId: paymentData.id
    })
    
    // Возвращаем поток (stream), чтобы избежать генерации заголовка Content-Length,
    // который ломается при прохождении через Cloudflare Proxy (баг с декомпрессией).
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(jsonString))
        controller.close()
      }
    })

    return new Response(stream, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
