-- Create promo_codes table
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    sessions_amount INTEGER NOT NULL CHECK (sessions_amount > 0),
    is_used BOOLEAN DEFAULT false NOT NULL,
    used_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Allow users to read promo_codes
CREATE POLICY "Users can view promo codes"
    ON public.promo_codes
    FOR SELECT
    USING (true);

-- Drop existing function if exists
DROP FUNCTION IF EXISTS public.apply_promo_code(text);

-- Create RPC function to apply promo code
CREATE OR REPLACE FUNCTION public.apply_promo_code(input_code TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER -- Execute as the owner of the function
AS $$
DECLARE
    v_promo_id UUID;
    v_sessions INTEGER;
    v_user_id UUID;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Find and lock the promo code to prevent race conditions
    SELECT id, sessions_amount INTO v_promo_id, v_sessions
    FROM public.promo_codes
    WHERE code = input_code AND is_used = false
    FOR UPDATE;

    IF v_promo_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or already used promo code';
    END IF;

    -- Update the promo code as used
    UPDATE public.promo_codes
    SET 
        is_used = true,
        used_by = v_user_id
    WHERE id = v_promo_id;

    -- Update the user's sessions count in profiles
    UPDATE public.profiles
    SET sessions_count = COALESCE(sessions_count, 0) + v_sessions
    WHERE id = v_user_id;

    -- Return the amount of sessions to be added
    RETURN v_sessions;
END;
$$;

-- Drop existing function if exists
DROP FUNCTION IF EXISTS public.generate_promo_codes(integer, integer, text);

-- Create RPC function to generate promo codes
CREATE OR REPLACE FUNCTION public.generate_promo_codes(
    amount_of_codes INTEGER,
    sessions_per_code INTEGER,
    prefix TEXT DEFAULT ''
)
RETURNS TABLE (generated_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_code TEXT;
    v_chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    i INTEGER;
    j INTEGER;
BEGIN
    FOR i IN 1..amount_of_codes LOOP
        v_code := prefix;
        -- Generate random 8 character string
        FOR j IN 1..8 LOOP
            v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::integer, 1);
        END LOOP;
        
        -- Insert into table
        INSERT INTO public.promo_codes (code, sessions_amount)
        VALUES (v_code, sessions_per_code);
        
        -- Return the generated code
        generated_code := v_code;
        RETURN NEXT;
    END LOOP;
END;
$$;