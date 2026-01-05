import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: window.location.origin 
      }
    });
    
    if (error) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับ Google');
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-3xl shadow-2xl border border-gray-50 text-center">
      <div className="mb-8">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            className="w-10 h-10" 
            alt="google" 
          />
        </div>
        <h1 className="text-3xl font-black text-gray-800">Welcome</h1>
        <p className="text-gray-500 mt-2">กรุณาเข้าสู่ระบบด้วย Google Account <br/>เพื่อทำการจองที่นั่งสอบ</p>
      </div>
      
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-100 py-4 rounded-2xl hover:bg-gray-50 hover:border-blue-200 transition-all duration-300 font-bold text-gray-700 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="google icon" />
        )}
        {loading ? 'กำลังเชื่อมต่อ...' : 'Continue with Google'}
      </button>

      <p className="mt-8 text-xs text-gray-400 font-light">
        การเข้าสู่ระบบแสดงว่าคุณยอมรับเงื่อนไขการใช้งานของระบบจองสอบ
      </p>
    </div>
  );
}
