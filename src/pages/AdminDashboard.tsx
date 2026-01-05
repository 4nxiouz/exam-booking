import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Check, X, ExternalLink, Users, Calendar, CreditCard, Search } from 'lucide-react';

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

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
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

    if (error) console.error(error);
    else setBookings(data || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: 'verified' | 'pending') => {
    const { error } = await supabase
      .from('bookings')
      .update({ payment_status: status })
      .eq('id', id);

    if (error) alert('Error updating status');
    else fetchBookings(); // Refresh ข้อมูล
  };

  const filteredBookings = bookings.filter(b => 
    b.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.booking_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Admin Management</h1>
          <p className="text-gray-500">จัดการรายชื่อผู้สมัครและตรวจสอบยอดชำระเงิน</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="ค้นหาชื่อ หรือ รหัสการจอง..." 
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-600 text-sm font-bold">
              <tr>
                <th className="px-6 py-4">รหัส / วันที่จอง</th>
                <th className="px-6 py-4">ผู้สมัคร</th>
                <th className="px-6 py-4">รอบสอบ</th>
                <th className="px-6 py-4">หลักฐาน</th>
                <th className="px-6 py-4 text-center">สถานะ</th>
                <th className="px-6 py-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400">กำลังโหลดข้อมูล...</td>
                </tr>
              ) : filteredBookings.map((b) => (
                <tr key={b.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className="block font-bold text-blue-600">{b.booking_code}</span>
                    <span className="text-xs text-gray-400">{new Date(b.created_at).toLocaleDateString('th-TH')}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="block font-semibold text-gray-800">{b.full_name}</span>
                    <span className="text-xs text-gray-500">{b.phone}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-3 h-3" />
                      {new Date(b.exam_rounds.exam_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                    </div>
                    <div className="text-xs text-gray-400 ml-5">{b.exam_rounds.exam_time}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {b.payment_slip_url && (
                        <a href={b.payment_slip_url} target="_blank" rel="noreferrer" className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200" title="ดูสลิปโอนเงิน">
                          <CreditCard className="w-4 h-4" />
                        </a>
                      )}
                      {b.id_card_url && (
                        <a href={b.id_card_url} target="_blank" rel="noreferrer" className="p-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200" title="ดูบัตรพนักงาน">
                          <Users className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      b.payment_status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {b.payment_status === 'verified' ? 'ยืนยันแล้ว' : 'รอตรวจสอบ'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      {b.payment_status === 'pending' ? (
                        <button 
                          onClick={() => updateStatus(b.id, 'verified')}
                          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      ) : (
                        <button 
                          onClick={() => updateStatus(b.id, 'pending')}
                          className="p-2 bg-gray-100 text-gray-400 rounded-lg hover:bg-gray-200"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
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
