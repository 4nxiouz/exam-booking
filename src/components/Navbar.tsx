import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Navbar({ session, isAdmin }: { session: any, isAdmin: boolean }) {
  return (
    <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
      <Link to="/" className="text-xl font-bold text-blue-600">Exam Booking</Link>
      
      <div className="flex items-center gap-4">
        {isAdmin && (
          <Link to="/admin" className="text-red-600 font-medium hover:underline">หลังบ้าน Admin</Link>
        )}
        
        {session ? (
          <button 
            onClick={() => supabase.auth.signOut()}
            className="text-gray-600 border border-gray-300 px-4 py-1 rounded-md"
          >
            ออกจากระบบ
          </button>
        ) : (
          <Link to="/login" className="bg-blue-600 text-white px-4 py-1 rounded-md">เข้าสู่ระบบ</Link>
        )}
      </div>
    </nav>
  );
}
