import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 1. ถ้าค่าไม่มี ห้ามรัน createClient แบบดุ่ยๆ
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ SUPABASE_URL หรือ ANON_KEY หายไป! ไปเช็ค .env หรือ Vercel Settings ด่วน!");
}

// 2. ป้องกันหน้าขาวด้วยการเช็คค่าก่อนสร้าง Client
// ถ้าไม่มีค่า ให้ส่งเป็น dummy client หรือจัดการ error ให้ดี
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as any);
