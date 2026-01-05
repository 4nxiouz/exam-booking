import { createClient } from '@supabase/supabase-js';

// ถ้าไม่มีค่า ให้ใช้ค่าหลอก (Placeholder) ไปก่อนเพื่อไม่ให้ระบบ Crash
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// เช็คใน Console แทน
if (!import.meta.env.VITE_SUPABASE_URL) {
  console.error("❌ มึงลืมใส่ Environment Variables ใน Vercel!");
}
