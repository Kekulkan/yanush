-- ============================================================
-- JANUШ (JANUS) — Supabase Schema
-- Архитектура: "One-shot session" (сессии не возобновляются)
-- ============================================================


-- ============================================================
-- 1. ТАБЛИЦА: profiles
-- Синхронизируется с auth.users через триггер
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id                    UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 TEXT,
  role                  TEXT        NOT NULL DEFAULT 'user',
  subscription_status   TEXT        NOT NULL DEFAULT 'free',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Функция: автоматически создаёт запись в profiles при регистрации пользователя
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, subscription_status, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    'user',
    'free',
    now()
  );
  RETURN NEW;
END;
$$;

-- Триггер: срабатывает после INSERT в auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 2. ТАБЛИЦА: sessions
-- Игровые сессии. Не возобновляются — если статус не 'active',
-- запись доступна только для чтения.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  status          TEXT        NOT NULL CHECK (status IN ('active', 'finished', 'aborted')),
  scenario_config JSONB,      -- Паспорт сценария: психотип, инцидент, фоновый конфликт
  chat_history    JSONB,      -- Массив сообщений диалога
  metrics_log     JSONB,      -- График эмоций: доверие/стресс по ходам
  feedback        JSONB       -- Оценка экспертной комиссии
);


-- ============================================================
-- 3. ТАБЛИЦА: promocodes
-- Промокоды для активации Premium-подписки
-- ============================================================

CREATE TABLE IF NOT EXISTS public.promocodes (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT    NOT NULL UNIQUE,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  usage_limit  INT,            -- NULL = безлимитный
  used_count   INT     NOT NULL DEFAULT 0
);


-- ============================================================
-- 4. ТАБЛИЦА: context_modules
-- Модули контекста (инциденты и фоны).
-- Позволяет динамически обновлять контент без деплоя.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.context_modules (
  id          TEXT        PRIMARY KEY, -- inc_vape, bg_poor (строковые ID для читаемости)
  category    TEXT        NOT NULL CHECK (category IN ('incident', 'background')),
  name        TEXT        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  config      JSONB       NOT NULL, -- Полный конфиг модуля (prompt_text, teacher_briefing, weights etc.)
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID        REFERENCES public.profiles(id) -- Кто последний редактировал (опционально)
);

-- Индекс для быстрого поиска по категории
CREATE INDEX IF NOT EXISTS idx_context_modules_category ON public.context_modules(category);


-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- --- profiles ---

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Пользователь видит только свой профиль
CREATE POLICY "profiles: select own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Пользователь обновляет только свой профиль
CREATE POLICY "profiles: update own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- --- sessions ---

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Пользователь видит только свои сессии
CREATE POLICY "sessions: select own"
  ON public.sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Пользователь может создавать сессии (только для себя)
CREATE POLICY "sessions: insert own"
  ON public.sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Пользователь может обновлять сессию ТОЛЬКО если она активна
-- Если статус не 'active' — запись становится read-only
CREATE POLICY "sessions: update own active only"
  ON public.sessions
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND status = 'active'
  )
  WITH CHECK (
    auth.uid() = user_id
  );


-- --- promocodes ---

ALTER TABLE public.promocodes ENABLE ROW LEVEL SECURITY;

-- Любой авторизованный пользователь может читать промокоды (для проверки кода)
CREATE POLICY "promocodes: select authenticated"
  ON public.promocodes
  FOR SELECT
  TO authenticated
  USING (true);

-- Запись (INSERT, UPDATE, DELETE) — только через service_role (сервер/админ)
-- Политики для записи не создаются — по умолчанию запрещено всем, кроме service_role


-- --- context_modules ---

ALTER TABLE public.context_modules ENABLE ROW LEVEL SECURITY;

-- Читать могут ВСЕ (даже анонимы, если нужно для демо, или только auth)
-- Для простоты разрешим всем authenticated (или даже anon, если приложение публичное)
CREATE POLICY "modules: select all"
  ON public.context_modules
  FOR SELECT
  USING (true);

-- Писать могут только authenticated (в идеале - role='admin', но пока упростим)
-- В реальном продакшене здесь должна быть проверка роли!
CREATE POLICY "modules: insert authenticated"
  ON public.context_modules
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "modules: update authenticated"
  ON public.context_modules
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "modules: delete authenticated"
  ON public.context_modules
  FOR DELETE
  TO authenticated
  USING (true);
