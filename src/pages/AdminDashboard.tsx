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

  // ⚠️ รายชื่อแอดมิน (เพิ่มตรงนี้ได้เลยมึง)
  const allowedEmails = ['bass.chinz@gmail.com', 'your-admin@email.com'];

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

  // --- ฟังก์ชันลบรายการจอง (Delete & Refund Seat) ---
  const deleteBooking = async (booking: Booking) => {
    if (!confirm(`ยืนยันการลบรายการของ ${booking.full_name}?`)) return;
    setLoading(true);
    try {
      // 1. ถ้าคนที่จะลบมีสถานะ verified ต้องไปลบเลขที่นั่งในรอบนั้นออก 1 ที่ก่อน
      if (booking.payment_status === 'verified') {
        const round = rounds.find(r => r.id === booking.exam_round_id);
        if (round) {
          const newCount = Math.max(0, (round.current_seats || 0) - 1);
          await supabase.from('exam_rounds').update({ current_seats: newCount }).eq('id', booking.exam_round_id);
        }
      }

      // 2. ลบข้อมูลจากตาราง bookings
      const { error } = await supabase.from('bookings').delete().eq('id', booking.id);
      if (error) throw error;

      alert('ลบรายการสำเร็จ (คืนที่นั่งให้รอบสอบแล้วถ้าเคยอนุมัติไว้)');
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

  if (loading && bookings.length === 0) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">ระบบจัดการการจอง</h1>
            <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 font-bold hover:bg-red-50 px-4 py-2 rounded-xl transition"><LogOut size={18}/> ออกจากระบบ</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-xl text-center md:text-left">
              <div className="flex items-center gap-2 mb-2"><Users className="w-5 h-5 text-blue-600" /><p className="text-sm text-gray-600">ทั้งหมด</p></div>
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-xl text-center md:text-left">
              <div className="flex items-center gap-2 mb-2"><Clock className="w-5 h-5 text-yellow-600" /><p className="text-sm text-gray-600">รอตรวจสอบ</p></div>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-xl text-center md:text-left">
              <div className="flex items-center gap-2 mb-2"><CheckCircle className="w-5 h-5 text-green-600" /><p className="text-sm text-gray-600">ยืนยันแล้ว</p></div>
              <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-xl text-center md:text-left">
              <div className="flex items-center gap-2 mb-2"><XCircle className="w-5 h-5 text-red-600" /><p className="text-sm text-gray-600">ปฏิเสธ</p></div>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl text-center md:text-left">
              <div className="flex items-center gap-2 mb-2"><Calendar className="w-5 h-5 text-purple-600" /><p className="text-sm text-gray-600">รายได้</p></div>
              <p className="text-xl font-bold text-purple-600">{stats.revenue.toLocaleString()}฿</p>
            </div>
          </div>

          {/* ฟอร์มเพิ่มรอบสอบ */}
          <div className="border-t pt-6 mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus className="text-blue-600"/> เพิ่มรอบสอบใหม่</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input type="date" className="border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" onChange={e => setNewRound({...newRound, exam_date: e.target.value})} />
              <select className="border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" onChange={e => setNewRound({...newRound, exam_time: e.target.value})}>
                <option value="Morning">เช้า (09:00-12:00)</option>
                <option value="Afternoon">บ่าย (13:00-16:00)</option>
              </select>
              <input type="number" placeholder="ที่นั่ง" className="border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" onChange={e => setNewRound({...newRound, max_seats: parseInt(e.target.value)})} />
              <button onClick={addRound} className="bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-md">เพิ่มรอบสอบ</button>
            </div>
          </div>

          {/* สถานะรอบสอบ */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">สถานะรอบสอบ</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {rounds.map(round => (
                <div key={round.id} className="bg-gray-50 p-4 rounded-lg border relative group">
                  <button onClick={() => deleteRound(round.id)} className="absolute top-2 right-2 text-red-400 opacity-0 group-hover:opacity-100 transition hover:text-red-600"><Trash2 size={16}/></button>
                  <p className="font-semibold text-gray-800">{new Date(round.exam_date).toLocaleDateString('th-TH')}</p>
                  <p className="text-sm text-gray-600 mb-2">{round.exam_time === 'Morning' ? 'เช้า (09:00-12:00)' : 'บ่าย (13:00-16:00)'}</p>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>{round.current_seats}/{round.max_seats} ที่นั่ง</span>
                    <span className={round.is_active ? 'text-green-600' : 'text-gray-400'}>{round.is_active ? 'เปิดอยู่' : 'ปิด'}</span>
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-1.5"><div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${(round.current_seats / round.max_seats) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
          {['all', 'pending', 'verified', 'rejected'].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`whitespace-nowrap px-4 py-2 rounded-lg font-medium transition ${filterStatus === s ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-200 shadow-sm border'}`}>
              {s === 'all' ? 'ทั้งหมด' : s === 'pending' ? 'รอตรวจสอบ' : s === 'verified' ? 'ยืนยันแล้ว' : 'ปฏิเสธ'}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {bookings.filter(b => filterStatus === 'all' || b.payment_status === filterStatus).map(booking => (
            <div key={booking.id} className="bg-white rounded-xl shadow p-5 md:p-6 border-l-4 border-blue-500">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl font-bold text-blue-600">{booking.booking_code}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      booking.payment_status === 'verified' ? 'bg-green-100 text-green-700' : 
                      booking.payment_status === 'rejected' ? 'bg-red-100 text-red-700' : 
                      'bg-yellow-100 text-yellow-700'}`}>
                      {booking.payment_status === 'verified' ? 'ยืนยันแล้ว' : booking.payment_status === 'rejected' ? 'ปฏิเสธแล้ว' : 'รอตรวจสอบ'}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-bold text-gray-800">{booking.full_name}</p>
                      <p className="text-gray-600">{booking.email} | {booking.phone}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">รอบ: {new Date(booking.exam_round.exam_date).toLocaleDateString('th-TH')}</p>
                      <p className="text-gray-600">{getUserTypeLabel(booking.user_type)} - {booking.price}฿ ({booking.payment_method === 'walkin' ? 'จ่ายหน้างาน' : 'โอนเงิน'})</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 mt-4">
                    {booking.payment_slip_url && (
                      <a href={booking.payment_slip_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-blue-600 font-medium hover:underline"><ExternalLink size={14}/> ดูสลิป</a>
                    )}
                    {booking.id_card_url && (
                      <a href={booking.id_card_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-orange-600 font-medium hover:underline"><CreditCard size={14}/> ดูบัตรพนักงาน/นักศึกษา</a>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 items-center shrink-0 self-end md:self-start">
                  {booking.payment_status === 'pending' && (
                    <>
                      <button onClick={() => updatePaymentStatus(booking.id, 'verified', booking.exam_round_id)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-1 font-bold shadow-sm text-sm"><CheckCircle size={16}/> อนุมัติ</button>
                      <button onClick={() => updatePaymentStatus(booking.id, 'rejected', booking.exam_round_id)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-1 font-bold shadow-sm text-sm"><XCircle size={16}/> ปฏิเสธ</button>
                    </>
                  )}
                  {/* ปุ่มลบรายการจอง (มีตลอด) */}
                  <button onClick={() => deleteBooking(booking)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="ลบข้อมูลการจอง">
                    <Trash2 size={20}/>
                  </button>
                </div>
              </div>
            </div>
          ))}
          {bookings.length === 0 && !loading && <p className="text-center text-gray-500 py-10">ยังไม่มีข้อมูลการจอง</p>}
        </div>
      </div>
    </div>
  );
}
