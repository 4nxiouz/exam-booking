import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Clock, ExternalLink, Calendar, Users } from 'lucide-react';

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [bookingsResult, roundsResult] = await Promise.all([
      supabase
        .from('bookings')
        .select(`
          *,
          exam_round:exam_rounds(exam_date, exam_time)
        `)
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

  const updatePaymentStatus = async (bookingId: string, status: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({
        payment_status: status,
        confirmed_at: status === 'verified' ? new Date().toISOString() : null
      })
      .eq('id', bookingId);

    if (!error) {
      fetchData();
    }
  };

  const getUserTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      tg: 'พนักงาน TG',
      wingspan: 'Wingspan',
      intern: 'นักศึกษา',
      general: 'บุคคลทั่วไป'
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
    rejected: bookings.filter(b => b.payment_status === 'rejected').length,
    revenue: bookings
      .filter(b => b.payment_status === 'verified')
      .reduce((sum, b) => sum + b.price, 0)
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">ระบบจัดการการจอง</h1>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-gray-600">ทั้งหมด</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
            </div>

            <div className="bg-yellow-50 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <p className="text-sm text-gray-600">รอตรวจสอบ</p>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>

            <div className="bg-green-50 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-sm text-gray-600">ยืนยันแล้ว</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
            </div>

            <div className="bg-red-50 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <p className="text-sm text-gray-600">ปฏิเสธ</p>
              </div>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>

            <div className="bg-purple-50 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                <p className="text-sm text-gray-600">รายได้</p>
              </div>
              <p className="text-xl font-bold text-purple-600">{stats.revenue.toLocaleString()}฿</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">สถานะรอบสอบ</h2>
            <div className="grid md:grid-cols-3 gap-3">
              {rounds.map(round => (
                <div key={round.id} className="bg-gray-50 p-4 rounded-lg border">
                  <p className="font-semibold text-gray-800">
                    {new Date(round.exam_date).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    {round.exam_time === 'Morning' ? 'เช้า 09:00-12:00' : 'บ่าย 13:00-16:00'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {round.current_seats}/{round.max_seats} ที่
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      round.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {round.is_active ? 'เปิดรับ' : 'ปิด'}
                    </span>
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${(round.current_seats / round.max_seats) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ทั้งหมด ({stats.total})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              รอตรวจสอบ ({stats.pending})
            </button>
            <button
              onClick={() => setFilterStatus('verified')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'verified'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ยืนยันแล้ว ({stats.verified})
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredBookings.map(booking => (
            <div key={booking.id} className="bg-white rounded-xl shadow p-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl font-bold text-blue-600">{booking.booking_code}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      booking.payment_status === 'verified'
                        ? 'bg-green-100 text-green-700'
                        : booking.payment_status === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {booking.payment_status === 'verified'
                        ? 'ยืนยันแล้ว'
                        : booking.payment_status === 'rejected'
                        ? 'ปฏิเสธ'
                        : 'รอตรวจสอบ'}
                    </span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">ข้อมูลผู้จอง</p>
                      <p className="font-semibold">{booking.full_name}</p>
                      <p className="text-gray-600">{booking.email}</p>
                      <p className="text-gray-600">{booking.phone}</p>
                    </div>

                    <div>
                      <p className="text-gray-600 mb-1">รายละเอียดการสอบ</p>
                      <p className="font-semibold">
                        {new Date(booking.exam_round.exam_date).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-gray-600">
                        {booking.exam_round.exam_time === 'Morning' ? 'เช้า 09:00-12:00' : 'บ่าย 13:00-16:00'}
                      </p>
                      <p className="text-gray-600">
                        {getUserTypeLabel(booking.user_type)} - {booking.price} บาท
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-4">
                    {booking.id_card_url && (
                      <a
                        href={booking.id_card_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink className="w-4 h-4" />
                        บัตรพนักงาน
                      </a>
                    )}
                    {booking.payment_slip_url && (
                      <a
                        href={booking.payment_slip_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink className="w-4 h-4" />
                        สลิปโอนเงิน
                      </a>
                    )}
                  </div>
                </div>

                {booking.payment_status === 'pending' && (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => updatePaymentStatus(booking.id, 'verified')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      อนุมัติ
                    </button>
                    <button
                      onClick={() => updatePaymentStatus(booking.id, 'rejected')}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      ปฏิเสธ
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredBookings.length === 0 && (
            <div className="bg-white rounded-xl shadow p-12 text-center">
              <p className="text-gray-500">ไม่มีข้อมูลการจอง</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
