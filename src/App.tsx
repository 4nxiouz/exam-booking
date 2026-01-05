import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Navbar from './components/Navbar';
import BookingPage from './pages/BookingPage'; // เปลี่ยนเป็นชื่อไฟล์ที่มึงใช้อยู่ (กูเห็นมึงส่งโค้ด BookingPage มา)
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';

// รายชื่อ Email ที่ให้เป็น Admin (เปลี่ยนเป็นเมลมึงเลย)
const ADMIN_EMAILS = ['bass.chinz@gmail.com', 'admin@example.com']; 

function App() {
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. เช็ค Session ปัจจุบัน
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session?.user?.email) {
        setIsAdmin(ADMIN_EMAILS.includes(session.user.email.toLowerCase()));
      }
      setLoading(false);
    };

    initializeAuth();

    // 2. ฟังการเปลี่ยนแปลงการ Login/Logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.email) {
        setIsAdmin(ADMIN_EMAILS.includes(session.user.email.toLowerCase()));
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div className="flex h-screen items-center justify-center font-sans">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 font-sans">
        <Navbar session={session} isAdmin={isAdmin} />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            {/* ส่ง session ไปที่หน้าจอง เพื่อใช้ auto-fill email */}
            <Route path="/" element={<BookingPage session={session} />} />
            
            {/* ถ้า Login แล้ว จะเข้าหน้า Login ไม่ได้ (Redirect ไปหน้าแรก) */}
            <Route path="/login" element={session ? <Navigate to="/" /> : <Login />} />
            
            {/* ถ้าไม่ใช่ Admin จะเข้าหน้า Admin ไม่ได้ (Redirect ไปหน้าแรก) */}
            <Route 
              path="/admin" 
              element={isAdmin ? <AdminDashboard /> : <Navigate to="/" />} 
            />

            {/* ดัก Route ที่ไม่มีอยู่จริง */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
