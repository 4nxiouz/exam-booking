import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Navbar from './components/Navbar';
import BookingPage from './pages/BookingPage';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';

const ADMIN_EMAILS = ['bass.chinz@gmail.com', 'admin2@gmail.com', 'friend@gmail.com'];

function App() {
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 1. ดึง Initial Session แบบรอบคอบ
    const initializeAuth = async () => {
      try {
        if (!supabase) return;
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (mounted) {
          setSession(initialSession);
          if (initialSession?.user?.email) {
            setIsAdmin(ADMIN_EMAILS.includes(initialSession.user.email.toLowerCase()));
          }
        }
      } catch (err) {
        console.error("Auth initialization failed:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // 2. จัดการ Auth State Change (Login/Logout)
    const { data: authListener } = supabase?.auth.onAuthStateChange((_event, currentSession) => {
      if (mounted) {
        setSession(currentSession);
        setIsAdmin(currentSession?.user?.email ? ADMIN_EMAILS.includes(currentSession.user.email.toLowerCase()) : false);
        setLoading(false); // กันเหนียวเผื่อ getSession ช้า
      }
    }) || { data: { subscription: null } };

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // --- โซนป้องกันหน้าขาว ---

  // จังหวะโหลดให้โชว์ UI ง่ายๆ ไม่ต้องเรียก Component เยอะ
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white font-sans text-gray-500">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p>กำลังเข้าสู่ระบบ...</p>
        </div>
      </div>
    );
  }

  // 🚨 หัวใจสำคัญ: ถ้าไม่มี session ให้โชว์หน้า Login ทันที (ไม่ต้องผ่าน Router)
  // วิธีนี้แก้ปัญหา Redirect Loop ใน Incognito ได้ชัวร์ที่สุด
  if (!session) {
    return <Login />;
  }

  // ถ้ามี Session แล้วค่อยอนุญาตให้เข้าถึงระบบ Routing หลัก
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 font-sans">
        {/* ส่ง props ให้ Navbar ตรงๆ */}
        <Navbar session={session} isAdmin={isAdmin} />
        
        <main className="container mx-auto px-4 py-8">
          <Routes>
            {/* หน้าหลักสำหรับคนมี Session */}
            <Route path="/" element={<BookingPage session={session} />} />
            
            {/* หน้า Admin: เช็ค isAdmin อีกชั้น */}
            <Route 
              path="/admin" 
              element={isAdmin ? <AdminDashboard /> : <Navigate to="/" replace />} 
            />

            {/* หน้า Login: ถ้าหลุดมานี่ทั้งที่มี Session ให้ดีดไปหน้าแรก */}
            <Route path="/login" element={<Navigate to="/" replace />} />
            
            {/* เส้นทางอื่นๆ ให้ดีดกลับหน้าแรกหมด */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
