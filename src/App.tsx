import { useState } from 'react';
import BookingPage from './pages/BookingPage';
import AdminDashboard from './pages/AdminDashboard';
import { Settings } from 'lucide-react';

function App() {
  const [showAdmin, setShowAdmin] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowAdmin(!showAdmin)}
        className="fixed top-4 right-4 z-50 bg-white p-3 rounded-full shadow-lg hover:shadow-xl transition"
        title={showAdmin ? 'กลับหน้าจอง' : 'หน้าแอดมิน'}
      >
        <Settings className={`w-6 h-6 text-gray-700 transition-transform ${showAdmin ? 'rotate-180' : ''}`} />
      </button>

      {showAdmin ? <AdminDashboard /> : <BookingPage />}
    </div>
  );
}

export default App;
