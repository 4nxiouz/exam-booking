import { supabase } from '../lib/supabase';
import { LogIn } from 'lucide-react';

export default function Login() {
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-xl shadow-md border border-gray-100">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">เข้าสู่ระบบจองสอบ</h1>
        <p className="text-gray-500">กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ</p>
      </div>
      
      <button
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 py-3 rounded-lg hover:bg-gray-50 transition-all font-medium"
      >
        <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="google" />
        เข้าสู่ระบบด้วย Google
      </button>
    </div>
  );
}
