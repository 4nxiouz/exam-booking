import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Clock, ExternalLink, Calendar, Users, Plus, Trash2, LogOut, CreditCard } from 'lucide-react';

interface Booking {
  id: string;
  booking_code: string;
  full_name: string;
  email: string;
  phone: string;
  user_type: string;
  price: number;
  payment_method: string;
  payment_status: string;
  id_card_url: string | null;
  payment_slip_url: string | null;
  created_at: string;
  exam_round_id: string;
  exam_round: { exam_date: string; exam_time: string; };
}

interface ExamRound {
  id: string;
  exam_date: string;
  exam_time: string;
  current_seats: number;
  max_seats: number;
  is_active: boolean;
}

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rounds, setRounds] = useState<ExamRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [newRound, setNewRound] = useState({ exam_date: '', exam_time: 'Morning', max_seats: 30 });

  // ⚠️ รายชื่ออีเมลแอดมิน
  const allowedEmails = ['bass.chinz@gmail.com', 'admin2@gmail.com', 'friend@gmail.com'];

  useEffect(() => {
    const initDashboard = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !allowedEmails.includes(session.user.email?.toLowerCase() || '')) {
        alert("มึงไม่ใช่แอดมิน! ออกไป๊!");
        window.location.href = '/'; 
        return;
      }
      await fetchData(); 
    };
    initDashboard();
  }, []);

  const fetchData = async () => {
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

  const addRound = async () => {
    if (!newRound.exam_date) return alert('กรุณาเลือกวันที่');
    const { error } = await supabase.from('exam_rounds').insert([{ ...newRound, current_seats: 0, is_active: true }]);
    if (error) alert(error.message);
    else { alert('เพิ่มรอบสอบสำเร็จ!'); fetchData(); }
  };

  const deleteRound = async (id: string) => {
    if (!confirm('ยืนยันการลบรอบสอบ? (ต้องไม่มีคนจองในรอบนี้)')) return;
    const { error } = await supabase.from('exam_rounds').delete().eq('id', id);
    if (error) alert('ไม่สามารถลบได้: อาจมีข้อมูลการจองค้างอยู่ในรอบนี้');
    else fetchData();
  };

  const updatePaymentStatus = async (bookingId: string, status: string, roundId: string) => {
    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ payment_status: status, confirmed_at: status === 'verified' ? new Date().toISOString() : null })
        .eq('id', bookingId);

      if (updateError) throw updateError;

      if (status === 'verified') {
        const round = rounds.find(r => r.id === roundId);
        await supabase.from('exam_rounds').update({ current_seats: (round?.current_seats || 0) + 1 }).eq('id', roundId);
      }

      alert('ดำเนินการสำเร็จ');
      await fetchData();
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteBooking = async (booking: Booking) => {
    if (!confirm(`ยืนยันการลบรายการของ ${booking.full_name}? ข้อมูลจะหายถาวร!`)) return;
    setLoading(true);
    try {
      if (booking.payment_status === 'verified') {
        const round = rounds.find(r => r.id === booking.exam_round_id);
        if (round) {
          const newCount = Math.max(0, (round.current_seats || 0) - 1);
          await supabase.from('exam_rounds').update({ current_seats: newCount }).eq('id', booking.exam_round_id);
        }
      }
      const { error } = await supabase.from('bookings').delete().eq('id', booking.id);
      if (error) throw error;
      alert('ลบรายการสำเร็จและคืนที่นั่งแล้ว');
      await fetchData();
    } catch (error: any) {
      alert('ลบไม่สำเร็จ: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const getUserTypeLabel = (type: string) => {
    const labels: Record<string, string> = { tg: 'พนักงาน TG', wingspan: 'Wingspan', intern: 'นักศึกษา', general: 'บุคคลทั่วไป' };
    return labels[type] || type;
  };

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.payment_status === 'pending').length,
    verified: bookings.filter(b => b.payment_status === 'verified').length,
    rejected: bookings.filter(b => b.payment_status === 'rejected').length,
    revenue: bookings.filter(b => b.payment_status === 'verified').reduce((sum, b) => sum + b.price, 0)
  };

  if (loading && bookings.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header & Stats */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Admin Dashboard</h1>
            <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 font-bold hover:bg-red-50 px-4 py-2 rounded-xl transition">
              <LogOut size={18}/> ออกจากระบบ
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-xl">
              <p className="text-xs text-blue-600 font-bold uppercase mb-1">ทั้งหมด</p>
              <p className="text-2xl font-black text-blue-700">{stats.total}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-xl">
              <p className="text-xs text-yellow-600 font-bold uppercase mb-1">รอตรวจ</p>
              <p className="text-2xl font-black text-yellow-700">{stats.pending}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-xl">
              <p className="text-xs text-green-600 font-bold uppercase mb-1">ยืนยันแล้ว</p>
              <p className="text-2xl font-black text-green-700">{stats.verified}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-xl">
              <p className="text-xs text-red-600 font-bold uppercase mb-1">ปฏิเสธ</p>
              <p className="text-2xl font-black text-red-700">{stats.rejected}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl">
              <p className="text-xs text-purple-600 font-bold uppercase mb-1">รายได้</p>
              <p className="text-xl font-black text-purple-700">{stats.revenue.toLocaleString()}฿</p>
            </div>
          </div>

          {/* Manage Exam Rounds */}
          <div className="border-t pt-6 mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus className="text-blue-600"/> จัดการรอบสอบ</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <input type="date" className="border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" onChange={e => setNewRound({...newRound, exam_date: e.target.value})} />
              <select className="border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" onChange={e => setNewRound({...newRound, exam_time: e.target.value})}>
                <option value="Morning">เช้า (09:00-12:00)</option>
                <option value="Afternoon">บ่าย (13:00-16:00)</option>
              </select>
              <input type="number" placeholder="ที่นั่ง" className="border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" onChange={e => setNewRound({...newRound, max_seats: parseInt(e.target.value)})} />
              <button onClick={addRound} className="bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-md">เพิ่มรอบ</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {rounds.map(round => (
                <div key={round.id} className="bg-white p-4 rounded-xl border relative group shadow-sm">
                  <button onClick={() => deleteRound(round.id)} className="absolute top-2 right-2 text-gray-300 opacity-0 group-hover:opacity-100 transition hover:text-red-500">
                    <Trash2 size={16}/>
                  </button>
                  <p className="font-bold text-gray-800">{new Date(round.exam_date).toLocaleDateString('th-TH')}</p>
                  <p className="text-sm text-gray-500 mb-2">{round.exam_time === 'Morning' ? 'เช้า 09:00' : 'บ่าย 13:00'}</p>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>{round.current_seats}/{round.max_seats} ที่นั่ง</span>
                    <span className={round.is_active ? 'text-green-500' : 'text-gray-400'}>{round.is_active ? 'Active' : 'Closed'}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (round.current_seats / round.max_seats) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bookings List Filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
          {['all', 'pending', 'verified', 'rejected'].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`whitespace-nowrap px-6 py-2 rounded-full font-bold transition shadow-sm border ${filterStatus === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              {s === 'all' ? 'ทั้งหมด' : s === 'pending' ? 'รอตรวจ' : s === 'verified' ? 'ยืนยันแล้ว' : 'ปฏิเสธ'}
            </button>
          ))}
        </div>

        {/* Booking Cards */}
        <div className="space-y-4">
          {bookings.filter(b => filterStatus === 'all' || b.payment_status === filterStatus).map(booking => (
            <div key={booking.id} className="bg-white rounded-2xl shadow-sm p-5 border-l-8 border-blue-500 flex flex-col md:flex-row justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl font-black text-gray-800">{booking.booking_code}</span>
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    booking.payment_status === 'verified' ? 'bg-green-100 text-green-700' : 
                    booking.payment_status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {booking.payment_status === 'verified' ? 'ยืนยันแล้ว' : booking.payment_status === 'rejected' ? 'ปฏิเสธ' : 'รอตรวจสอบ'}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div>
                    <p className="text-gray-400 uppercase text-[10px] font-bold">ผู้สมัคร</p>
                    <p className="font-bold text-gray-800">{booking.full_name}</p>
                    <p className="text-gray-500">{booking.email} | {booking.phone}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 uppercase text-[10px] font-bold">รอบสอบ</p>
                    <p className="font-bold text-gray-800">{new Date(booking.exam_round.exam_date).toLocaleDateString('th-TH')}</p>
                    <p className="text-gray-500">{getUserTypeLabel(booking.user_type)} - {booking.price}฿</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-4">
                  {booking.payment_slip_url && (
                    <a href={booking.payment_slip_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition"><ExternalLink size={14}/> สลิปโอนเงิน</a>
                  )}
                  {booking.id_card_url && (
                    <a href={booking.id_card_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition"><CreditCard size={14}/> บัตรประจำตัว</a>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex md:flex-col justify-end gap-2 border-t md:border-t-0 pt-4 md:pt-0">
                {booking.payment_status === 'pending' && (
                  <>
                    <button onClick={() => updatePaymentStatus(booking.id, 'verified', booking.exam_round_id)} className="flex-1 md:flex-none px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold text-sm transition">อนุมัติ</button>
                    <button onClick={() => updatePaymentStatus(booking.id, 'rejected', booking.exam_round_id)} className="flex-1 md:flex-none px-4 py-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 font-bold text-sm transition">ปฏิเสธ</button>
                  </>
                )}
                {/* 🗑️ ปุ่มลบรายการ (เน้นสีแดงชัดๆ) */}
                <button 
                  onClick={() => deleteBooking(booking)} 
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition flex items-center justify-center gap-1"
                  title="ลบข้อมูล"
                >
                  <Trash2 size={20}/>
                  <span className="text-xs font-bold md:hidden">ลบรายการ</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
