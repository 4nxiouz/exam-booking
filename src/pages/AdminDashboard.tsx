import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Clock, ExternalLink, Calendar, Users, Plus } from 'lucide-react';

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
  exam_round: {
    exam_date: string;
    exam_time: string;
  };
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
  
  // สถานะสำหรับเพิ่มรอบสอบใหม่
  const [newRound, setNewRound] = useState({ exam_date: '', exam_time: 'Morning', max_seats: 30 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [bookingsResult, roundsResult] = await Promise.all([
      supabase
        .from('bookings')
        .select(`*, exam_round:exam_rounds(exam_date, exam_time)`)
        .order('created_at', { ascending: false }),
      supabase
        .from('exam_rounds')
        .select('*')
        .order('exam_date', { ascending: true })
    ]);

    setBookings(bookingsResult.data || []);
    setRounds(roundsResult.data || []);
    setLoading(false);
  };

  // ฟังก์ชันเพิ่มรอบสอบ
  const addRound = async () => {
    if (!newRound.exam_date) return alert('กรุณาเลือกวันที่');
    
    const { error } = await supabase
      .from('exam_rounds')
      .insert([{ ...newRound, current_seats: 0, is_active: true }]);

    if (error) {
      alert('เพิ่มรอบสอบไม่สำเร็จ: ' + error.message);
    } else {
      alert('เพิ่มรอบสอบสำเร็จ!');
      fetchData();
    }
  };

  const updatePaymentStatus = async (bookingId: string, status: string, roundId: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({
        payment_status: status,
        confirmed_at: status === 'verified' ? new Date().toISOString() : null
      })
      .eq('id', bookingId);

    if (!error && status === 'verified') {
      // ตัดที่นั่งเมื่ออนุมัติ
      const round = rounds.find(r => r.id === roundId);
      await supabase
        .from('exam_rounds')
        .update({ current_seats: (round?.current_seats || 0) + 1 })
        .eq('id', roundId);
    }
    
    fetchData();
  };

  const getUserTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      tg: 'พนักงาน TG', wingspan: 'Wingspan', intern: 'นักศึกษา', general: 'บุคคลทั่วไป'
    };
    return labels[type] || type;
  };

  const filteredBookings = filterStatus === 'all' 
    ? bookings 
    : bookings.filter(b => b.payment_status === filterStatus);

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.payment_status === 'pending').length,
    verified: bookings.filter(b => b.payment_status === 'verified').length,
    revenue: bookings.filter(b => b.payment_status === 'verified').reduce((sum, b) => sum + b.price, 0)
  };

  if (loading) return <div className="p-20 text-center">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-black mb-8 text-slate-800 tracking-tight">Admin Dashboard</h1>

        {/* ส่วนเพิ่มรอบสอบใหม่ */}
        <div className="bg-white p-6 rounded-2xl shadow-sm mb-8 border border-blue-100">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-700">
            <Plus className="w-5 h-5" /> เพิ่มรอบสอบใหม่
          </h2>
          <div className="grid md:grid-cols-4 gap-4">
            <input type="date" className="border p-2 rounded-xl text-sm" onChange={(e) => setNewRound({...newRound, exam_date: e.target.value})} />
            <select className="border p-2 rounded-xl text-sm" onChange={(e) => setNewRound({...newRound, exam_time: e.target.value})}>
              <option value="Morning">รอบเช้า (09:00-12:00)</option>
              <option value="Afternoon">รอบบ่าย (13:00-16:00)</option>
            </select>
            <input type="number" placeholder="ที่นั่ง" className="border p-2 rounded-xl text-sm" onChange={(e) => setNewRound({...newRound, max_seats: parseInt(e.target.value)})} />
            <button onClick={addRound} className="bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition">เพิ่มรอบสอบ</button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-sm text-slate-500">จองทั้งหมด</p>
            <p className="text-2xl font-black">{stats.total}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-200">
            <p className="text-sm text-yellow-700">รอตรวจสอบ</p>
            <p className="text-2xl font-black text-yellow-700">{stats.pending}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-2xl border border-green-200">
            <p className="text-sm text-green-700">ยืนยันแล้ว</p>
            <p className="text-2xl font-black text-green-700">{stats.verified}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200">
            <p className="text-sm text-blue-700">รายได้สะสม</p>
            <p className="text-2xl font-black text-blue-700">{stats.revenue.toLocaleString()}฿</p>
          </div>
        </div>

        {/* Booking List */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {['all', 'pending', 'verified', 'rejected'].map((s) => (
                <button key={s} onClick={() => setFilterStatus(s)} className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${filterStatus === s ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border'}`}>
                    {s === 'all' ? 'ทั้งหมด' : s === 'pending' ? 'รอตรวจ' : s === 'verified' ? 'จ่ายแล้ว' : 'ยกเลิก'}
                </button>
            ))}
        </div>

        <div className="space-y-4">
          {filteredBookings.map(booking => (
            <div key={booking.id} className="bg-white rounded-2xl shadow-sm border p-5 flex flex-col md:flex-row justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono font-bold text-lg text-blue-600">{booking.booking_code}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${booking.payment_status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {booking.payment_status.toUpperCase()}
                  </span>
                </div>
                <h3 className="font-bold text-slate-800">{booking.full_name} <span className="text-slate-400 font-normal text-sm">({getUserTypeLabel(booking.user_type)})</span></h3>
                <p className="text-sm text-slate-500">{booking.phone} | {booking.email}</p>
                <div className="mt-3 flex gap-4 text-xs font-medium text-slate-600">
                  <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(booking.exam_round.exam_date).toLocaleDateString('th-TH')}</span>
                  <span className="flex items-center gap-1"><Clock size={14}/> {booking.exam_round.exam_time === 'Morning' ? '09:00-12:00' : '13:00-16:00'}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-2">
                    {booking.payment_slip_url && <a href={booking.payment_slip_url} target="_blank" className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline"><ExternalLink size={12}/> สลิปโอนเงิน</a>}
                    {booking.id_card_url && <a href={booking.id_card_url} target="_blank" className="text-xs font-bold text-slate-600 flex items-center gap-1 hover:underline"><ExternalLink size={12}/> บัตร ปชช/พนักงาน</a>}
                </div>
                {booking.payment_status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => updatePaymentStatus(booking.id, 'verified', booking.exam_round_id)} className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"><CheckCircle size={20}/></button>
                    <button onClick={() => updatePaymentStatus(booking.id, 'rejected', booking.exam_round_id)} className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"><XCircle size={20}/></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
