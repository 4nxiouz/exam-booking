import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Navbar from './components/Navbar';
import BookingPage from './pages/BookingPage';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';

// รายชื่อ Admin
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
        // ถ้าไม่มี token ใน URL (hash) ให้ปิด loading ได้เลย
        if (mounted && !window.location.hash.includes('access_token')) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // ดักฟังการเปลี่ยนแปลงสถานะ Login (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (mounted) {
        setSession(currentSession);
        const email = currentSession?.user?.email;
        setIsAdmin(email ? ADMIN_EMAILS.includes(email.toLowerCase()) : false);
        setLoading(false); 
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 1. หน้า Loading ระหว่างเช็คสิทธิ์ หรือรอ Google Redirect
  if (loading || window.location.hash.includes('access_token')) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        <p className="mt-4 font-bold text-gray-600 animate-pulse">กำลังยืนยันตัวตนกับ Google...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
        {/* โชว์ Navbar เฉพาะตอนที่ Login แล้วเท่านั้น */}
        {session && <Navbar session={session} isAdmin={isAdmin} />}
        
        <main className={session ? "container mx-auto px-4 py-8" : ""}>
          <Routes>
            {/* 🛡️ กรณีที่ยังไม่ได้ Login */}
            {!session ? (
              <>
                <Route path="/login" element={<Login />} />
                {/* ถ้าพยายามไปหน้าอื่น ให้เด้งกลับไป Login */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </>
            ) : (
              /* ✅ กรณีที่ Login แล้ว */
              <>
                <Route path="/" element={<BookingPage session={session} />} />
                
                <Route 
                  path="/admin" 
                  element={
                    isAdmin ? (
                      <AdminDashboard session={session} />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  } 
                />

                {/* ถ้า Login แล้ว จะเข้าหน้า Login ซ้ำไม่ได้ ให้เด้งไปหน้าแรก */}
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            )}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
