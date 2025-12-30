import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import BookingPage from './pages/BookingPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import { Settings, Home } from 'lucide-react';

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

    // ติดตามการเปลี่ยนแปลงสถานะ
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = user && user.email && allowedEmails.map(e => e.toLowerCase()).includes(user.email.toLowerCase());

  // Logic พิเศษ: ถ้าเปิดหน้าแอดมินค้างไว้ แต่ User ที่ Login เข้ามาไม่ใช่แอดมิน ให้ดีดกลับหน้าจองทันที
  useEffect(() => {
    if (showAdmin && user && !isAdmin) {
      setShowAdmin(false);
    }
  }, [user, isAdmin, showAdmin]);

  if (loading) return null;

  return (
    <div className="relative">
      {/* --- 🛠 ส่วนของปุ่มลับ ---
        จะแสดงผลเฉพาะตอนที่:
        1. ยังไม่ได้ Login (เพื่อให้แอดมินกดเข้าไป Login)
        2. Login แล้ว และต้องเป็นอีเมลแอดมินเท่านั้น
      */}
      {(!user || isAdmin) && (
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
      )}

      {showAdmin ? (
        // --- ส่วนของ ADMIN ---
        !user ? (
          <AdminLogin /> 
        ) : isAdmin ? (
          <AdminDashboard /> 
        ) : (
          /* ส่วนนี้จะแทบไม่เห็นแล้วเพราะโดน Redirect ดีดออกไปก่อน แต่กันเหนียวไว้ */
          <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center">
              <h2 className="text-xl font-bold text-gray-800 mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
              <button onClick={() => supabase.auth.signOut()} className="mt-4 text-blue-600">ออกจากระบบ</button>
            </div>
          </div>
        )
      ) : (
        // --- ส่วนของ USER (หน้าจองสอบ) ---
        <BookingPage />
      )}
    </div>
  );
}

export default App;
