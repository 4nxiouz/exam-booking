import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Check, X, Search, Calendar, Users, 
  CreditCard, CheckCircle, XCircle, Loader2 
} from 'lucide-react';

interface Booking {
  id: string;
  booking_code: string;
  full_name: string;
  email: string;
  phone: string;
  user_type: string;
  payment_status: string;
  payment_slip_url: string;
  id_card_url: string;
  price: number;
  created_at: string;
  exam_rounds: {
    exam_date: string;
    exam_time: string;
  };
}

export default function AdminDashboard({ session }: { session: any }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          exam_rounds (
            exam_date,
            exam_time
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ payment_status: status })
        .eq('id', id);

      if (error) throw error;
      
      // Update local state ทันทีไม่ต้องรอ fetch ใหม่ (เพื่อความลื่นไหล)
      setBookings(prev => prev.map(b => b.id === id ? { ...b, payment_status: status } : b));
    } catch (error) {
      alert('อัปเดตสถานะไม่สำเร็จ!');
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         b.booking_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || b.payment_status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading && bookings.length === 0) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin mb-2 text-blue-600" />
        <p>กำลังโหลดข้อมูลการจอง...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Admin Management</h1>
          <p className="text-gray-500 text-sm">จัดการผู้สมัครและตรวจสอบยอดชำระเงิน</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="ค้นชื่อ/รหัสจอง..." 
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">ทั้งหมด</option>
            <option value="pending">รอตรวจสอบ</option>
            <option value="verified">ยืนยันแล้ว</option>
            <option value="rejected">ปฏิเสธ</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase">ทั้งหมด</p>
          <p className="text-2xl font-black text-gray-800">{bookings.length}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100 shadow-sm">
          <p className="text-xs font-bold text-yellow-600 uppercase">รอตรวจสอบ</p>
          <p className="text-2xl font-black text-yellow-700">{bookings.filter(b => b.payment_status === 'pending').length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-2xl border border-green-100 shadow-sm">
          <p className="text-xs font-bold text-green-600 uppercase">ยืนยันแล้ว</p>
          <p className="text-2xl font-black text-green-700">{bookings.filter(b => b.payment_status === 'verified').length}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 shadow-sm">
          <p className="text-xs font-bold text-blue-600 uppercase">รายได้รวม</p>
          <p className="text-2xl font-black text-blue-700">
            {bookings.filter(b => b.payment_status === 'verified').reduce((sum, b) => sum + b.price, 0).toLocaleString()}.-
          </p>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Booking Info</th>
                <th className="px-6 py-4">Applicant</th>
                <th className="px-6 py-4">Round</th>
                <th className="px-6 py-4">Proof</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400">ไม่พบข้อมูลการจอง</td>
                </tr>
              ) : filteredBookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="block font-black text-blue-600 leading-tight">{b.booking_code}</span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {new Date(b.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <p className="font-bold text-gray-800">{b.full_name}</p>
                    <p className="text-gray-500 text-xs">{b.phone}</p>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-1.5 font-medium text-gray-700">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {new Date(b.exam_rounds?.exam_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
                    </div>
                    <p className="text-[11px] text-gray-400 ml-5">{b.exam_rounds?.exam_time}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {b.payment_slip_url && (
                        <a href={b.payment_slip_url} target="_blank" rel="noreferrer" className="p-1.5 bg-green-50 text-green-600 rounded-md hover:bg-green-100 transition-colors" title="ดูสลิป">
                          <CreditCard className="w-4 h-4" />
                        </a>
                      )}
                      {b.id_card_url && (
                        <a href={b.id_card_url} target="_blank" rel="noreferrer" className="p-1.5 bg-orange-50 text-orange-600 rounded-md hover:bg-orange-100 transition-colors" title="ดูบัตร">
                          <Users className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      b.payment_status === 'verified' ? 'bg-green-100 text-green-700' : 
                      b.payment_status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {b.payment_status === 'verified' ? 'Verified' : b.payment_status === 'rejected' ? 'Rejected' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-1.5">
                      <button 
                        onClick={() => updateStatus(b.id, 'verified')}
                        className={`p-1.5 rounded-md transition-all ${b.payment_status === 'verified' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-600'}`}
                        title="Confirm Payment"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => updateStatus(b.id, 'rejected')}
                        className={`p-1.5 rounded-md transition-all ${b.payment_status === 'rejected' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-600'}`}
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
