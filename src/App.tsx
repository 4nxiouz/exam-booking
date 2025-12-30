import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import BookingPage from './pages/BookingPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import { Settings, Home } from 'lucide-react'; // เพิ่มไอคอน Home

function App() {
  const [showAdmin, setShowAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // รายชื่ออีเมลที่มีสิทธิ์เข้าหลังบ้าน
const allowedEmails = [
  'bass.chinz@gmail.com', 
  'admin2@gmail.com', 
  'friend@gmail.com'
];

  useEffect(() => {
    // เช็ค Session ครั้งแรก
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = user && user.email && allowedEmails.includes(user.email.toLowerCase());

  if (loading) return null; // หรือใส่ Spinner เล็กๆ

  return (
    <div className="relative">
      {/* ปุ่มสลับหน้า: 
        1. ถ้ายังไม่ Login มึงอาจจะอยากซ่อนไว้ (แต่ถ้าจะเอาไว้กดไปหน้า Login แอดมินก็ตามโค้ดเดิม) 
        2. กูเปลี่ยนไอคอนให้สลับกันตามสถานะเพื่อความไม่งง
      */}
      <button
        onClick={() => setShowAdmin(!showAdmin)}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 p-4 rounded-full shadow-2xl hover:bg-blue-700 transition-all text-white group"
        title={showAdmin ? 'กลับหน้าจอง' : 'เข้าสู่ระบบแอดมิน'}
      >
        {showAdmin ? (
          <Home className="w-6 h-6" />
        ) : (
          <Settings className="w-6 h-6 group-hover:rotate-90 transition-transform" />
        )}
      </button>

      {showAdmin ? (
        // --- ส่วนของ ADMIN ---
        !user ? (
          <AdminLogin /> 
        ) : isAdmin ? (
          <AdminDashboard /> 
        ) : (
          <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="text-red-600 w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
              <p className="text-gray-600 mb-6">
                อีเมล <span className="font-semibold text-gray-900">{user.email}</span> <br/>
                ไม่มีสิทธิ์ในฐานะผู้ดูแลระบบ
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => supabase.auth.signOut()} 
                  className="bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition"
                >
                  ออกจากระบบ
                </button>
                <button 
                  onClick={() => setShowAdmin(false)} 
                  className="text-gray-500 font-medium hover:underline"
                >
                  กลับไปหน้าจองสอบ
                </button>
              </div>
            </div>
          </div>
        )
      ) : (
        // --- ส่วนของ USER ---
        <BookingPage />
      )}
    </div>
  );
}

export default App;
