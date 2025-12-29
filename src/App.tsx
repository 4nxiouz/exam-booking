import { useState, useEffect } from 'react';
import BookingPage from './pages/BookingPage';
import AdminDashboard from './pages/AdminDashboard';
import { Settings, LogOut, Mail } from 'lucide-react';
import { supabase } from './lib/supabase';

function App() {
  const [showAdmin, setShowAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 1. เพิ่มรายชื่อ Admin ตรงนี้ (กี่เมลก็ได้)
  const allowedEmails = [
    'admin1@gmail.com', 
    'admin2@hotmail.com',
    'yourname@gmail.com'
  ];

  useEffect(() => {
    // ตรวจสอบ Session เมื่อเปิดแอป
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // ติดตามสถานะ Login/Logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. ฟังก์ชัน Login แบบ Magic Link (ไม่ต้องใช้ Client ID)
  const handleLogin = async () => {
    const email = window.prompt("กรุณากรอก Email แอดมินเพื่อรับลิงก์เข้าสู่ระบบ:");
    if (!email) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);

    if (error) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    } else {
      alert("ระบบส่งลิงก์เข้าสู่ระบบไปที่ " + email + " แล้ว! (กรุณาเช็คใน Inbox หรือ Junk Mail)");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowAdmin(false);
  };

  // 3. ตรวจสอบสิทธิ์ว่าเป็น Admin ในลิสต์หรือไม่
  const isAdmin = user && allowedEmails.includes(user.email);

  return (
    <div className="relative min-h-screen bg-slate-50">
      {/* ปุ่มสลับหน้า (Settings) */}
      <button
        onClick={() => setShowAdmin(!showAdmin)}
        className="fixed top-4 right-4 z-50 bg-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95"
        title={showAdmin ? 'กลับหน้าจอง' : 'เข้าสู่หน้าแอดมิน'}
      >
        <Settings className={`w-6 h-6 text-slate-600 ${showAdmin ? 'rotate-90' : ''} transition-transform`} />
      </button>

      {showAdmin ? (
        isAdmin ? (
          // --- กรณีเป็น Admin และล็อกอินแล้ว ---
          <div className="animate-in fade-in duration-500">
            <div className="fixed top-4 right-20 z-50 flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md">
              <span className="text-xs font-medium text-slate-500">{user.email}</span>
              <button onClick={handleLogout} className="text-red-500 hover:text-red-700 transition" title="Logout">
                <LogOut size={18} />
              </button>
            </div>
            <AdminDashboard />
          </div>
        ) : (
          // --- กรณีไม่ใช่ Admin หรือยังไม่ได้ล็อกอิน ---
          <div className="flex flex-col items-center justify-center min-h-screen p-6">
            <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl text-center border border-slate-100">
              <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Mail className="text-indigo-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Admin Authentication</h2>
              <p className="text-slate-500 mb-8">เฉพาะอีเมลที่ได้รับอนุญาตเท่านั้นที่สามารถเข้าถึงระบบจัดการข้อมูลได้</p>
              
              {!user ? (
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'กำลังส่งลิงก์...' : 'รับลิงก์เข้าสู่ระบบผ่าน Email'}
                </button>
              ) : (
                <div className="space-y-4">
                  <p className="text-red-500 text-sm font-medium bg-red-50 py-2 rounded-lg">
                    บัญชี {user.email} ไม่มีสิทธิ์ใช้งาน
                  </p>
                  <button onClick={handleLogout} className="text-indigo-600 text-sm font-bold underline">
                    ลองใช้บัญชีอื่น
                  </button>
                </div>
              )}
              
              <button onClick={() => setShowAdmin(false)} className="mt-8 text-slate-400 text-sm hover:text-slate-600 transition">
                ← กลับไปหน้าจองสอบ
              </button>
            </div>
          </div>
        )
      ) : (
        // --- หน้าจองสอบปกติ ---
        <BookingPage />
      )}
    </div>
  );
}

export default App;
