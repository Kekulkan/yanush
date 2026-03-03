import { createClient } from '@supabase/supabase-js';

// Используем локальный прокси для обхода блокировок
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
