import { createClient } from '@supabase/supabase-js';

const supabaseUrl = '/supabase-proxy';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

console.log('Supabase Config Check:', {
  url: supabaseUrl ? 'Found' : 'Missing',
  key: supabaseAnonKey ? 'Found' : 'Missing',
  env: import.meta.env
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env vars details:', { supabaseUrl, supabaseAnonKey });
  throw new Error(
    'Отсутствует переменная среды VITE_SUPABASE_ANON_KEY. ' +
    'Создайте файл .env и добавьте эту переменную.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
