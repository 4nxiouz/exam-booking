import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Clock, ExternalLink, Calendar, Users, Plus, Trash2, LogOut, CreditCard } from 'lucide-react';

export default function AdminDashboard({ session }: { session: any }) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [newRound, setNewRound] = useState({ exam_date: '', exam_time: 'Morning', max_seats: 30 });

  // 1. ฟังก์ชันอัปเดตสถานะ
  const updatePaymentStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ payment_status: status })
        .eq('id', id);
      if (error) throw error;
      await fetchData(); 
      alert('อัปเดตสถานะสำเร็จแล้ว!');
    } catch (error) {
      console.error("Error:", error);
      alert('อัปเดตไม่ได้ว่ะมึง!');
    }
  };

  // 2. ฟังก์ชันดึงข้อมูล
  const fetchData = async () => {
    setLoading(true);
    try {
      const [bookingsResult, roundsResult] = await Promise.all([
        supabase.from('bookings').select(`*, exam_round:exam_rounds(exam_date, exam_time)`).order('created_at', { ascending: false }),
        supabase.from('exam_rounds').select('*').order('exam_date', { ascending: true })
      ]);
      setBookings(bookingsResult.data || []);
      setRounds(roundsResult.data || []);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchData();
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
           <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
           <p className="text-sm text-gray-500">{session?.user?.email}</p>
        </div>

        {/* Statistics Section */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-blue-50 p-4 rounded-xl">
            <p className="text-xs text-blue-600 font-bold uppercase mb-1">ทั้งหมด</p>
            <p className="text-2xl font-black text-blue-700">{bookings?.length || 0}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-xl">
            <p className="text-xs text-yellow-600 font-bold uppercase mb-1">รอตรวจ</p>
            <p className="text-2xl font-black text-yellow-700">
              {bookings?.filter(b => b.payment_status === 'pending').length || 0}
            </p>
          </div>
        </div>

        {/* Booking Cards Section */}
        <div className="space-y-4">
          {bookings?.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
              <p className="text-gray-400 font-bold">ยังไม่มีข้อมูลการจองในระบบ</p>
            </div>
          ) : (
            bookings
              ?.filter(b => filterStatus === 'all' || b.payment_status === filterStatus)
              .map(booking => (
                <div key={booking.id} className="bg-white rounded-2xl shadow-sm p-5 border-l-8 border-blue-500 flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl font-black text-gray-800">{booking?.booking_code || 'N/A'}</span>
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        booking?.payment_status === 'verified' ? 'bg-green-100 text-green-700' : 
                        booking?.payment_status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {booking?.payment_status === 'verified' ? 'ยืนยันแล้ว' : booking?.payment_status === 'rejected' ? 'ปฏิเสธ' : 'รอตรวจสอบ'}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      <div>
                        <p className="text-gray-400 uppercase text-[10px] font-bold">ผู้สมัคร</p>
                        <p className="font-bold text-gray-800">{booking?.full_name || 'ไม่ระบุชื่อ'}</p>
                        <p className="text-gray-500">{booking?.email}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 uppercase text-[10px] font-bold">รอบสอบ</p>
                        <p className="font-bold text-gray-800">
                          {booking?.exam_round?.exam_date ? new Date(booking.exam_round.exam_date).toLocaleDateString('th-TH') : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* ปุ่ม Action สำหรับ Admin */}
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => updatePaymentStatus(booking.id, 'verified')}
                      className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                    >
                      <CheckCircle size={20} />
                    </button>
                    <button 
                      onClick={() => updatePaymentStatus(booking.id, 'rejected')}
                      className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                    >
                      <XCircle size={20} />
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
