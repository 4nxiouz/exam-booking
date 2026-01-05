import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

// สร้าง client ออกไปเสมอ ห้ามเป็น null
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
