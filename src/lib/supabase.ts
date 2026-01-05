import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

// ถ้าเป็นค่าปลอม ให้ด่าใน Console ไว้ก่อน
if (supabaseUrl.includes('placeholder')) {
  console.warn("⚠️ SUPABASE_URL is missing! Check your environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
