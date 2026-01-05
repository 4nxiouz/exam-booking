import { createClient } from '@supabase/supabase-js';

// ดึงค่ามาพักไว้ก่อน
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// เช็คผ่าน Console ว่าบน Vercel มันเห็นค่าไหม
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ [Supabase] Missing Environment Variables!");
}

// ป้องกันการ Throw Error ที่ทำให้หน้าขาวโดยการส่ง String เปล่าไปก่อน (แม้จะต่อไม่ได้แต่หน้าจะไม่ขาว)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
