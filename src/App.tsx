import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Navbar from './components/Navbar';
import BookingForm from './pages/BookingForm';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';

// รายชื่อ Email ที่ให้เป็น Admin (แก้ตรงนี้)
const ADMIN_EMAILS = ['admin@example.com', 'your-email@gmail.com'];

function App() {
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. เช็ค Session ปัจจุบัน
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAdmin(session?.user?.email ? ADMIN_EMAILS.includes(session.user.email) : false);
      setLoading(false);
    });

    // 2. ฟังการเปลี่ยนแปลงการ Login/Logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsAdmin(session?.user?.email ? ADMIN_EMAILS.includes(session.user.email) : false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar session={session} isAdmin={isAdmin} />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<BookingForm session={session} />} />
            <Route path="/login" element={session ? <Navigate to="/" /> : <Login />} />
            <Route 
              path="/admin" 
              element={isAdmin ? <AdminDashboard /> : <Navigate to="/" />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
