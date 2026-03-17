import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response("Method not allowed", { status: 405 })
  }

  try {
    const payload = await req.json()
    const event = payload.event
    
    if (event !== "payment.succeeded" && event !== "payment.canceled") {
      return new Response("OK", { status: 200 })
    }

    const paymentObj = payload.object
    if (!paymentObj || !paymentObj.id) {
      return new Response("Bad Request", { status: 400 })
    }

    const paymentId = paymentObj.id
    const newStatus = event === "payment.succeeded" ? "succeeded" : "canceled"

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (newStatus === "succeeded") {
      const { error: rpcError } = await supabase.rpc('process_successful_payment', {
        p_payment_id: paymentId
      })

      if (rpcError) {
        console.error("RPC Error:", rpcError)
        return new Response("Database error", { status: 500 })
      }
    } else if (newStatus === "canceled") {
      const { error: updateError } = await supabase
        .from('yookassa_payments')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('payment_id', paymentId)

      if (updateError) {
        console.error("Update Error:", updateError)
        return new Response("Database error", { status: 500 })
      }
    }

    return new Response("OK", { status: 200 })
  } catch (err) {
    console.error("Webhook Error:", err)
    return new Response("Internal Server Error", { status: 500 })
  }
})
