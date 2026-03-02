import { createClient } from '@supabase/supabase-js';

// Supabase прокси всегда идёт через Cloudflare Pages (yanush.pages.dev),
// чтобы фронтенд на российском сервере мог обращаться к Supabase без блокировок ТСПУ.
const supabaseUrl = 'https://yanush.pages.dev/supabase-proxy';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_ANON_KEY env var');
  throw new Error(
    'Отсутствует переменная среды VITE_SUPABASE_ANON_KEY. ' +
    'Создайте файл .env и добавьте эту переменную.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
