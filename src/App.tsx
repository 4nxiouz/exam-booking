import { useState, useEffect } from 'react';
import BookingPage from './pages/BookingPage';
import AdminDashboard from './pages/AdminDashboard';
import { Settings, LogOut } from 'lucide-react';
import { supabase } from './lib/supabase'; // ตรวจสอบว่า path ตรงกับในโปรเจกต์ (lib หรือ lip)

function App() {
  const [showAdmin, setShowAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);

  // รายชื่อ Email ที่มีสิทธิ์เข้าหน้าแอดมิน (ใส่เมล์มึงที่นี่)
  const allowedEmails = ['bass.chinz@gmail.com', 'admin-thai-tep@gmail.com'];

  useEffect(() => {
    // ตรวจสอบเซสชันการล็อกอินปัจจุบัน
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // ติดตามสถานะการล็อกอิน (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowAdmin(false);
  };

  // เช็คว่าเป็นแอดมินตัวจริงไหม
  const isAdmin = user && allowedEmails.includes(user.email);

  return (
    <div className="relative">
      {/* ปุ่มสลับหน้า (โชว์เฉพาะถ้าไม่ได้อยู่หน้าแอดมิน หรือล็อกอินเป็นแอดมินแล้ว) */}
      <button
        onClick={() => setShowAdmin(!showAdmin)}
        className="fixed top-4 right-4 z-50 bg-white p-3 rounded-full shadow-lg hover:shadow-xl transition"
        title={showAdmin ? 'กลับหน้าจอง' : 'หน้าแอดมิน'}
      >
        <Settings className={`w-6 h-6 text-gray-700 transition-transform ${showAdmin ? 'rotate-180' : ''}`} />
      </button>

      {/* เงื่อนไขการแสดงผลหน้า Admin */}
      {showAdmin ? (
        isAdmin ? (
          <>
            {/* ปุ่ม Logout สำหรับแอดมิน */}
            <button 
              onClick={handleLogout}
              className="fixed top-4 right-20 z-50 bg-red-50 p-3 rounded-full shadow-md text-red-600 hover:bg-red-100 transition flex items-center gap-2"
            >
              <LogOut size={18} /> <span className="text-sm font-bold">Logout</span>
            </button>
            <AdminDashboard />
          </>
        ) : (
          /* ถ้ากดเข้าหน้าแอดมิน แต่ยังไม่ได้ล็อกอิน หรือไม่มีสิทธิ์ */
          <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">พื้นที่สำหรับแอดมินเท่านั้น</h2>
            <p className="text-gray-600 mb-6">
              {user ? `บัญชี ${user.email} ไม่มีสิทธิ์เข้าถึง` : 'กรุณาล็อกอินเพื่อตรวจสอบสิทธิ์'}
            </p>
            {!user ? (
              <button
                onClick={handleLogin}
                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition"
              >
                เข้าสู่ระบบด้วย Google
              </button>
            ) : (
              <button onClick={handleLogout} className="text-indigo-600 font-semibold underline">
                เปลี่ยนบัญชีล็อกอิน
              </button>
            )}
            <button onClick={() => setShowAdmin(false)} className="mt-8 text-gray-400 hover:text-gray-600">
              ← กลับไปหน้าจองสอบ
            </button>
          </div>
        )
      ) : (
        <BookingPage />
      )}
    </div>
  );
}

export default App;
