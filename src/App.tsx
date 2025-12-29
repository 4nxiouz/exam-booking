import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import BookingPage from './pages/BookingPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import { Settings } from 'lucide-react';

function App() {
  const [showAdmin, setShowAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);

  // รายชื่ออีเมลที่มีสิทธิ์เข้าหลังบ้าน
  const allowedEmails = ['bass.chinz@gmail.com']; 

  useEffect(() => {
    // เช็คว่าล็อกอินค้างไว้ไหม
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // ติดตามการเปลี่ยนแปลงสถานะ (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = user && allowedEmails.includes(user.email);

  return (
    <div className="relative">
      <button
        onClick={() => setShowAdmin(!showAdmin)}
        className="fixed top-4 right-4 z-50 bg-white p-3 rounded-full shadow-lg hover:shadow-xl transition"
        title={showAdmin ? 'กลับหน้าจอง' : 'หน้าแอดมิน'}
      >
        <Settings className={`w-6 h-6 text-gray-700 transition-transform ${showAdmin ? 'rotate-180' : ''}`} />
      </button>

      {showAdmin ? (
        // ถ้ากดเข้าหน้า Admin
        !user ? (
          <AdminLogin /> // ถ้ายังไม่ Login ให้ไปหน้า Login ก่อน
        ) : isAdmin ? (
          <AdminDashboard /> // ถ้า Login แล้วและเมลถูกต้อง ให้เข้า Dashboard
        ) : (
          <div className="min-h-screen flex items-center justify-center bg-gray-100 flex-col gap-4">
            <p className="text-red-500 font-bold bg-white p-6 rounded-2xl shadow">
              อีเมล {user.email} ไม่มีสิทธิ์เข้าถึงระบบนี้
            </p>
            <button 
              onClick={() => supabase.auth.signOut()} 
              className="text-blue-600 underline font-medium"
            >
              ออกจากระบบเพื่อใช้บัญชีอื่น
            </button>
          </div>
        )
      ) : (
        // หน้าจองสอบปกติ
        <BookingPage />
      )}
    </div>
  );
}

export default App;
