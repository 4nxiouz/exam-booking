import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Navbar({ session, isAdmin }: { session: any, isAdmin: boolean }) {
  return (
    <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <Link to="/" className="text-xl font-extrabold text-blue-600 uppercase tracking-tighter">
        Exam Booking
      </Link>
      
      <div className="flex items-center gap-4">
        {isAdmin && (
          <Link to="/admin" className="text-sm bg-red-50 text-red-600 font-bold px-3 py-1.5 rounded-full border border-red-100 hover:bg-red-100 transition">
            Admin Dashboard
          </Link>
        )}
        
        {session?.user ? (
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs text-gray-400 leading-none">Logged in as</p>
              <p className="text-sm text-gray-700 font-bold">{session.user.email}</p>
            </div>
            <button 
              onClick={() => supabase.auth.signOut()}
              className="text-sm font-bold text-gray-600 bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <Link to="/login" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition shadow-md">
            เข้าสู่ระบบ
          </Link>
        )}
      </div>
    </nav>
  );
}
