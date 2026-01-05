import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

interface ExamRound {
  id: string;
  exam_date: string;
  exam_time: string;
  current_seats: number;
  max_seats: number;
}

// เพิ่ม { session } เข้ามาใน Props
export default function BookingPage({ session }: { session: any }) {
  const navigate = useNavigate();
  const [rounds, setRounds] = useState<ExamRound[]>([]);
  const [selectedRound, setSelectedRound] = useState('');
  const [userType, setUserType] = useState('general');
  const [payMethod, setPayMethod] = useState('transfer');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookingCode, setBookingCode] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '', // จะถูกเติมอัตโนมัติจาก useEffect
    phone: ''
  });

  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [paymentSlipFile, setPaymentSlipFile] = useState<File | null>(null);

  // --- จุดที่แก้ไข: ดึง Email จาก Session มาใส่ Form อัตโนมัติ ---
  useEffect(() => {
    fetchRounds();
    if (session?.user?.email) {
      setFormData(prev => ({ ...prev, email: session.user.email }));
    }
  }, [session]);

  const fetchRounds = async () => {
    const { data } = await supabase
      .from('exam_rounds')
      .select('*')
      .eq('is_active', true)
      .order('exam_date', { ascending: true });
    setRounds(data || []);
  };

  const isInternal = ['tg', 'wingspan', 'intern'].includes(userType);
  const price = isInternal ? 375 : 750;

  const uploadFile = async (file: File, bucketName: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage.from(bucketName).upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    // เช็คอีกรอบเพื่อความชัวร์
    if (!session) {
      alert('กรุณาเข้าสู่ระบบก่อนทำการจองครับ');
      navigate('/login');
      return;
    }
    setLoading(true);

    try {
      const { data: round } = await supabase
        .from('exam_rounds')
        .select('current_seats, max_seats')
        .eq('id', selectedRound)
        .single();

      if (!round || round.current_seats >= round.max_seats) {
        alert('ขออภัย รอบนี้เต็มแล้วครับ');
        setLoading(false);
        return;
      }

      let idCardUrl = null;
      let paymentSlipUrl = null;

      if (isInternal && idCardFile) {
        idCardUrl = await uploadFile(idCardFile, 'id-cards');
      }

      if (payMethod === 'transfer' && paymentSlipFile) {
        paymentSlipUrl = await uploadFile(paymentSlipFile, 'payment-slips');
      }

      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          exam_round_id: selectedRound,
          user_type: userType,
          full_name: formData.fullName,
          email: formData.email, // ใช้อีเมลจากที่ดึงมาจาก Session
          phone: formData.phone,
          price,
          payment_method: payMethod,
          id_card_url: idCardUrl,
          payment_slip_url: paymentSlipUrl,
          payment_status: payMethod === 'transfer' ? 'pending' : 'verified',
          user_id: session.user.id // เพิ่มเพื่อเก็บว่าใครเป็นคนจอง
        })
        .select()
        .single();

      if (error) throw error;

      const { error: updateError } = await supabase
        .from('exam_rounds')
        .update({ current_seats: round.current_seats + 1 })
        .eq('id', selectedRound);

      if (updateError) throw updateError;

      setBookingCode(booking.booking_code);
      setSuccess(true);

    } catch (error) {
      console.error('Error detail:', error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">จองสำเร็จ!</h2>
          <p className="text-gray-600 mb-4">ระบบได้รับข้อมูลการจองของคุณเรียบร้อยแล้ว</p>
          <div className="bg-blue-50 p-4 rounded-xl mb-6">
            <p className="text-sm text-gray-600 mb-1">รหัสการจองของคุณ</p>
            <p className="text-2xl font-bold text-blue-600">{bookingCode}</p>
          </div>
          <button
            onClick={() => {
              setSuccess(false);
              setSelectedRound('');
              // ไม่รีเซ็ต email เพราะดึงจาก session อยู่แล้ว
              setFormData({ ...formData, fullName: '', phone: '' });
              setIdCardFile(null);
              setPaymentSlipFile(null);
            }}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
          >
            จองเพิ่มเติม
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* แสดงคำเตือนถ้าไม่ได้ Login */}
        {!session && (
          <div className="mb-6 bg-orange-100 border-l-4 border-orange-500 p-4 rounded-r-xl flex justify-between items-center">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-orange-600" />
              <p className="text-orange-700 font-medium">กรุณาเข้าสู่ระบบเพื่อดำเนินการจอง</p>
            </div>
            <Link to="/login" className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md">Login</Link>
          </div>
        )}

        <div className={`bg-white rounded-2xl shadow-xl overflow-hidden ${!session ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white">
            <h1 className="text-3xl font-bold text-center">จองที่นั่งสอบ</h1>
            <p className="text-center text-blue-100 mt-2">ระบบจองที่นั่งสอบออนไลน์</p>
          </div>

          <form onSubmit={handleBooking} className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ชื่อ-นามสกุล <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="กรอกชื่อ-นามสกุล"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  อีเมล (ระบบเติมให้) <Lock className="inline w-3 h-3 ml-1 text-gray-400" />
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  readOnly // ล็อคไม่ให้แก้ไข
                  className="w-full px-4 py-2 border border-gray-200 bg-gray-50 text-gray-500 rounded-lg cursor-not-allowed shadow-inner"
                  placeholder="กรุณา Login"
                />
              </div>
            </div>

            {/* --- ส่วนที่เหลือของ Form คุณใช้โค้ดเดิมได้เลยครับ --- */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                เบอร์โทรศัพท์ <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="08X-XXX-XXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ประเภทผู้สมัคร <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
              >
                <option value="tg">พนักงานการบินไทย (TG Staff)</option>
                <option value="wingspan">พนักงาน Outsource (Wingspan)</option>
                <option value="intern">นักศึกษาฝึกงาน (Internship)</option>
                <option value="general">บุคคลภายนอก (General Public)</option>
              </select>
            </div>

            {isInternal && (
              <div className="border-2 border-orange-200 bg-orange-50 p-4 rounded-xl">
                <label className="block text-sm font-bold text-orange-700 mb-2 flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  แนบรูปบัตรพนักงาน / นักศึกษา <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  required
                  accept="image/*"
                  onChange={(e) => setIdCardFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                เลือกรอบสอบ <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={selectedRound}
                onChange={(e) => setSelectedRound(e.target.value)}
                required
              >
                <option value="">-- กรุณาเลือกรอบ --</option>
                {rounds.map(r => (
                  <option key={r.id} value={r.id} disabled={r.max_seats - r.current_seats <= 0}>
                    {new Date(r.exam_date).toLocaleDateString('th-TH')} ({r.exam_time}) - ว่าง {r.max_seats - r.current_seats} ที่
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl text-center border-2 border-blue-200">
              <span className="text-gray-700 font-medium">ค่าธรรมเนียมการสอบ</span>
              <div className="text-4xl font-bold text-blue-600 mt-2">{price} บาท</div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">ช่องทางการชำระเงิน *</label>
              <div className="grid grid-cols-2 gap-4">
                <label className={`flex items-center justify-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition ${payMethod === 'transfer' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}>
                  <input type="radio" checked={payMethod === 'transfer'} onChange={() => setPayMethod('transfer')} className="hidden" />
                  <span className="font-medium">โอนเงิน</span>
                </label>
                <label className={`flex items-center justify-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition ${payMethod === 'walkin' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}>
                  <input type="radio" checked={payMethod === 'walkin'} onChange={() => setPayMethod('walkin')} className="hidden" />
                  <span className="font-medium">จ่ายหน้างาน</span>
                </label>
              </div>
            </div>

            {payMethod === 'transfer' && (
              <div className="p-4 border-2 border-blue-100 rounded-xl space-y-4">
                <div className="flex justify-center">
                   <img src={`https://promptpay.io/0972396095/${price}.png`} alt="QR" className="w-48 h-48" />
                </div>
                <label className="block">
                  <span className="block text-sm font-bold text-gray-700 mb-2">แนบสลิปโอนเงิน *</span>
                  <input
                    type="file"
                    required
                    accept="image/*"
                    onChange={(e) => setPaymentSlipFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-gray-600"
                  />
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !session}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 shadow-lg disabled:from-gray-400"
            >
              {loading ? 'กำลังประมวลผล...' : 'ยืนยันการจองที่นั่ง'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
