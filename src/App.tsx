import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Navbar from './components/Navbar';
import BookingPage from './pages/BookingPage';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';

const ADMIN_EMAILS = ['4nxiouz@gmail.com', 'admin@example.com']; 

function App() {
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session?.user?.email) {
          setIsAdmin(ADMIN_EMAILS.includes(session.user.email.toLowerCase()));
        }
      } catch (err) {
        console.error("Auth error:", err);
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsAdmin(session?.user?.email ? ADMIN_EMAILS.includes(session.user.email.toLowerCase()) : false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="flex h-screen items-center justify-center font-sans text-gray-500">Loading...</div>;

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 font-sans">
        <Navbar session={session} isAdmin={isAdmin} />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<BookingPage session={session} />} />
            <Route path="/login" element={session ? <Navigate to="/" /> : <Login />} />
            <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
