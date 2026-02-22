import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

console.log('Supabase Config Check:', {
  url: supabaseUrl ? 'Found' : 'Missing',
  key: supabaseAnonKey ? 'Found' : 'Missing',
  env: import.meta.env
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env vars details:', { supabaseUrl, supabaseAnonKey });
  throw new Error(
    'Отсутствуют переменные среды VITE_SUPABASE_URL или VITE_SUPABASE_ANON_KEY. ' +
    'Создайте файл .env и добавьте эти переменные.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
