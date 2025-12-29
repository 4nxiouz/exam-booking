import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    else navigate('/admin'); // ถ้าผ่านให้ไปหน้าจัดการ
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Admin Login</h1>
        <input 
          type="email" placeholder="Email" className="w-full border p-3 rounded-xl mb-4"
          onChange={(e) => setEmail(e.target.value)} required 
        />
        <input 
          type="password" placeholder="Password" className="w-full border p-3 rounded-xl mb-6"
          onChange={(e) => setPassword(e.target.value)} required 
        />
        <button className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 transition">
          เข้าสู่ระบบ
        </button>
      </form>
    </div>
  );
}
