-- Миграция для интеграции с ЮKassa (выполнить в SQL Editor Supabase)

-- 1. Таблица для хранения платежей ЮKassa
CREATE TABLE IF NOT EXISTS public.yookassa_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    payment_id TEXT UNIQUE, -- ID платежа в ЮKassa
    amount NUMERIC NOT NULL, -- Сумма в рублях
    sessions_count INTEGER NOT NULL, -- Количество покупаемых сессий
    status TEXT NOT NULL DEFAULT 'pending', -- pending, succeeded, canceled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Включаем RLS
ALTER TABLE public.yookassa_payments ENABLE ROW LEVEL SECURITY;

-- Политики: пользователь может видеть только свои платежи
CREATE POLICY "Users can view own payments" ON public.yookassa_payments
    FOR SELECT USING (auth.uid() = user_id);

-- Политики: вставлять и обновлять может только Service Role (наш webhook/API)
-- (Напрямую с клиента вставлять нельзя, только через Cloudflare Functions)

-- 2. Если в таблице public.profiles еще нет поля sessions_count, добавляем его
-- (Предполагается, что таблица profiles уже существует)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='profiles' AND column_name='sessions_count') THEN
        ALTER TABLE public.profiles ADD COLUMN sessions_count INTEGER DEFAULT 0;
    END IF;
END
$$;

-- 3. Функция для начисления сессий (вызывается из вебхука)
CREATE OR REPLACE FUNCTION process_successful_payment(p_payment_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_sessions INTEGER;
    v_status TEXT;
BEGIN
    -- Находим платеж
    SELECT user_id, sessions_count, status INTO v_user_id, v_sessions, v_status
    FROM public.yookassa_payments
    WHERE payment_id = p_payment_id;

    -- Если платеж не найден или уже не pending, выходим
    IF NOT FOUND OR v_status != 'pending' THEN
        RETURN;
    END IF;

    -- Обновляем статус платежа
    UPDATE public.yookassa_payments
    SET status = 'succeeded', updated_at = NOW()
    WHERE payment_id = p_payment_id;

    -- Начисляем сессии пользователю
    UPDATE public.profiles
    SET sessions_count = COALESCE(sessions_count, 0) + v_sessions
    WHERE id = v_user_id;
    
END;
$$;
