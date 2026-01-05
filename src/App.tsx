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

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(initialSession);
          if (initialSession?.user?.email) {
            setIsAdmin(ADMIN_EMAILS.includes(initialSession.user.email.toLowerCase()));
          }
        }
      } catch (err) {
        console.error("Auth error:", err);
      } finally {
        // 🚨 ถ้ามี hash access_token บน URL อย่าเพิ่งปิด loading 
        // ให้รอ onAuthStateChange ทำงานให้เสร็จก่อน
        if (mounted && !window.location.hash.includes('access_token')) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (mounted) {
        setSession(currentSession);
        setIsAdmin(currentSession?.user?.email ? ADMIN_EMAILS.includes(currentSession.user.email.toLowerCase()) : false);
        setLoading(false); // ปิด loading ได้เมื่อ session นิ่งแล้ว
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 1. ดักหน้าขาวตอนกำลังแลก Token จาก Google
  if (loading || window.location.hash.includes('access_token')) {
    return (
      <div className="flex h-screen items-center justify-center bg-white font-sans text-gray-500">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="font-bold">กำลังยืนยันตัวตนกับ Google...</p>
        </div>
      </div>
    );
  }

  // 2. ถ้าไม่มี Session ให้โชว์หน้า Login
  if (!session) {
    return <Login />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 font-sans">
        <Navbar session={session} isAdmin={isAdmin} />
        
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<BookingPage session={session} />} />
            
            {/* 🚨 ต้องส่ง session เข้าไปใน AdminDashboard ด้วย! */}
            <Route 
              path="/admin" 
              element={isAdmin ? <AdminDashboard session={session} /> : <Navigate to="/" replace />} 
            />

            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
