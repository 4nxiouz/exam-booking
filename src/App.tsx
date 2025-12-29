import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import BookingPage from './pages/BookingPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin'; 
import { Settings, LogOut } from 'lucide-react';

function App() {
  const [showAdmin, setShowAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);

  const allowedEmails = ['bass.chinz@gmail.com']; 

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = user && allowedEmails.includes(user.email);

  return (
    <div className="relative">
      {/* ปุ่มตั้งค่า - อาจจะทำสีให้จางลงหน่อยจะได้ไม่ดึงดูดสายตาคนทั่วไป */}
      <button
        onClick={() => setShowAdmin(!showAdmin)}
        className="fixed top-4 right-4 z-50 bg-white/80 p-2 rounded-full shadow-md hover:bg-white transition-all opacity-20 hover:opacity-100"
        title="Admin Section"
      >
        <Settings className={`w-5 h-5 text-gray-500 ${showAdmin ? 'rotate-90' : ''}`} />
      </button>

      {/* ถ้าเป็น Admin และล็อกอินอยู่ ให้มีปุ่ม Logout ลอยขึ้นมาด้วย */}
      {showAdmin && user && (
        <button
          onClick={() => supabase.auth.signOut()}
          className="fixed top-16 right-4 z-50 bg-red-50 text-red-600 p-2 rounded-full shadow-md hover:bg-red-100 transition-all"
          title="ออกจากระบบ"
        >
          <LogOut className="w-5 h-5" />
        </button>
      )}

      {showAdmin ? (
        !user ? (
          <AdminLogin /> 
        ) : isAdmin ? (
          <AdminDashboard /> 
        ) : (
          <div className="min-h-screen flex items-center justify-center bg-gray-100 flex-col gap-4 p-4 text-center">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full">
              <p className="text-red-500 font-bold text-lg mb-2">Access Denied</p>
              <p className="text-gray-600 mb-6">อีเมล {user.email} <br/>ไม่มีสิทธิ์เข้าถึงระบบหลังบ้าน</p>
              <button 
                onClick={() => supabase.auth.signOut()} 
                className="w-full bg-gray-800 text-white py-2 rounded-xl font-medium hover:bg-black transition"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        )
      ) : (
        <BookingPage />
      )}
    </div>
  );
}

export default App;
