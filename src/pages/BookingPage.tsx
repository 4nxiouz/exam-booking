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
    email: '', 
    phone: ''
  });

  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [paymentSlipFile, setPaymentSlipFile] = useState<File | null>(null);

  // --- จุดที่ทำให้มัน Auto-fill เมลทันทีที่เปิดหน้า หรือ session เปลี่ยน ---
  useEffect(() => {
    fetchRounds();
    
    // ดึงเมลจาก session มาใส่ใน State ทันที
    const userEmail = session?.user?.email;
    if (userEmail) {
      setFormData(prev => ({ 
        ...prev, 
        email: userEmail 
      }));
    }
  }, [session]); // เฝ้าดู session ไว้ ถ้า login ปุ๊บ เมลต้องมาปั๊บ

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
  
  // 1. เช็คความปลอดภัยขั้นสูงสุด
  if (!session?.user) {
    alert('กรุณาเข้าสู่ระบบก่อนทำการจองครับ');
    navigate('/login');
    return;
  }

  setLoading(true);

  try {
    // 2. ดึงข้อมูลจาก Session แบบใช้ Optional Chaining เสมอ
    const userEmail = session.user.email;
    const userId = session.user.id;

    if (!userEmail || !userId) throw new Error("User information missing");

    // 3. (โค้ดดึงข้อมูลรอบสอบเดิมของมึง...)
    const { data: round } = await supabase
      .from('exam_rounds')
      .select('current_seats, max_seats')
      .eq('id', selectedRound)
      .single();

    if (!round || (round.current_seats >= round.max_seats)) {
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
        email: userEmail, // ใช้ตัวแปรที่เช็คแล้ว
        phone: formData.phone,
        price,
        payment_method: payMethod,
        id_card_url: idCardUrl,
        payment_slip_url: paymentSlipUrl,
        payment_status: payMethod === 'transfer' ? 'pending' : 'verified',
        user_id: userId // ใช้ตัวแปรที่เช็คแล้ว
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
        {!session && (
          <div className="mb-6 bg-orange-100 border-l-4 border-orange-500 p-4 rounded-r-xl flex justify-between items-center animate-pulse">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-orange-600" />
              <p className="text-orange-700 font-bold">กรุณาเข้าสู่ระบบด้วย Google ก่อนจอง</p>
            </div>
            <Link to="/login" className="bg-orange-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-orange-700 transition">Login</Link>
          </div>
        )}

        <div className={`bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-500 ${!session ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white">
            <h1 className="text-3xl font-bold text-center">จองที่นั่งสอบ</h1>
            <p className="text-center text-blue-100 mt-2 font-light">กรุณากรอกข้อมูลให้ครบถ้วน</p>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="ภาษาไทย หรือ ภาษาอังกฤษ"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  อีเมล (Auto-fill) <Lock className="inline w-3 h-3 ml-1 text-blue-500" />
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  readOnly
                  className="w-full px-4 py-2 border border-blue-100 bg-blue-50 text-blue-700 rounded-lg cursor-not-allowed font-medium"
                  placeholder="กรุณา Login ก่อน"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">เบอร์โทรศัพท์ <span className="text-red-500">*</span></label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0XXXXXXXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ประเภทผู้สมัคร <span className="text-red-500">*</span></label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
              <div className="border-2 border-dashed border-orange-300 bg-orange-50 p-4 rounded-xl">
                <label className="block text-sm font-bold text-orange-700 mb-2 flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  แนบรูปบัตรพนักงาน / นักศึกษา <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  required
                  accept="image/*"
                  onChange={(e) => setIdCardFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-600 file:text-white hover:file:bg-orange-700"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">เลือกรอบสอบ <span className="text-red-500">*</span></label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={selectedRound}
                onChange={(e) => setSelectedRound(e.target.value)}
                required
              >
                <option value="">-- กรุณาเลือกรอบ --</option>
                {rounds.map(r => (
                  <option key={r.id} value={r.id} disabled={r.max_seats - r.current_seats <= 0}>
                    {new Date(r.exam_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })} ({r.exam_time}) - ว่าง {r.max_seats - r.current_seats} ที่
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-blue-600 p-6 rounded-2xl text-center text-white shadow-lg">
              <span className="text-blue-100 text-sm uppercase tracking-wider font-bold">ยอดเงินที่ต้องชำระ</span>
              <div className="text-5xl font-black mt-1">{price}.-</div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">ช่องทางการชำระเงิน <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-4">
                <label className={`flex items-center justify-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${payMethod === 'transfer' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}>
                  <input type="radio" checked={payMethod === 'transfer'} onChange={() => setPayMethod('transfer')} className="hidden" />
                  <span className="font-bold">โอนเงิน (PromptPay)</span>
                </label>
                <label className={`flex items-center justify-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${payMethod === 'walkin' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}>
                  <input type="radio" checked={payMethod === 'walkin'} onChange={() => setPayMethod('walkin')} className="hidden" />
                  <span className="font-bold">จ่ายหน้างาน</span>
                </label>
              </div>
            </div>

            {payMethod === 'transfer' && (
              <div className="p-4 border-2 border-blue-200 rounded-2xl bg-white space-y-4 shadow-inner">
                <div className="flex flex-col items-center">
                   <img src={`https://promptpay.io/0972396095/${price}.png`} alt="QR" className="w-56 h-56 rounded-lg shadow-md mb-2" />
                   <p className="text-xs text-gray-400">สแกนเพื่อจ่าย {price} บาท</p>
                </div>
                <div className="space-y-2">
                  <span className="block text-sm font-bold text-gray-700">แนบสลิปโอนเงิน <span className="text-red-500">*</span></span>
                  <input
                    type="file"
                    required
                    accept="image/*"
                    onChange={(e) => setPaymentSlipFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !session}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-xl hover:bg-blue-700 shadow-xl disabled:bg-gray-300 disabled:cursor-not-allowed transform transition active:scale-95"
            >
              {loading ? 'กำลังบันทึกข้อมูล...' : 'ยืนยันการจอง'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
const handleBooking = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!session?.user) {
    alert('กรุณาเข้าสู่ระบบก่อนทำการจองครับ');
    navigate('/login');
    return;
  }

  // เช็คก่อนว่าเลือกหรือยัง
  if (!selectedRound) {
    alert('กรุณาเลือกรอบสอบก่อนมึง!');
    return;
  }

  setLoading(true);

  try {
    const userEmail = session.user.email;
    const userId = session.user.id;

    if (!userEmail || !userId) throw new Error("User information missing");

    // 1. เช็ครอบสอบล่าสุดจาก DB อีกทีกันเหนียว
    const { data: round, error: roundError } = await supabase
      .from('exam_rounds')
      .select('current_seats, max_seats')
      .eq('id', selectedRound)
      .single();

    if (roundError || !round || (round.current_seats >= round.max_seats)) {
      alert('ขออภัย รอบนี้เพิ่งเต็มเมื่อกี้เลย หรือหาข้อมูลไม่เจอครับ');
      setLoading(false);
      return;
    }
    
    let idCardUrl = null;
    let paymentSlipUrl = null;

    // 2. จัดการเรื่องไฟล์ (ใส่ Alert แยกจุด)
    try {
      if (isInternal && idCardFile) {
        idCardUrl = await uploadFile(idCardFile, 'id-cards');
      }
      if (payMethod === 'transfer' && paymentSlipFile) {
        paymentSlipUrl = await uploadFile(paymentSlipFile, 'payment-slips');
      }
    } catch (uploadErr) {
      console.error('Upload Error:', uploadErr);
      alert('อัปโหลดไฟล์ไม่สำเร็จ! เช็คขนาดไฟล์หรือสิทธิ์การเข้าถึง Storage นะมึง');
      setLoading(false);
      return;
    }

    // 3. บันทึกการจอง
    const { data: booking, error: insertError } = await supabase
      .from('bookings')
      .insert({
        exam_round_id: selectedRound,
        user_type: userType,
        full_name: formData.fullName,
        email: userEmail,
        phone: formData.phone,
        price,
        payment_method: payMethod,
        id_card_url: idCardUrl,
        payment_slip_url: paymentSlipUrl,
        payment_status: payMethod === 'transfer' ? 'pending' : 'verified',
        user_id: userId
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 4. อัปเดตจำนวนที่นั่ง (ใช้ RPC หรือ Update ตรงๆ แบบมึงก็ได้)
    const { error: updateError } = await supabase
      .from('exam_rounds')
      .update({ current_seats: round.current_seats + 1 })
      .eq('id', selectedRound);

    if (updateError) console.warn("Seat counter update failed, but booking saved.");

    setBookingCode(booking.booking_code);
    setSuccess(true);

  } catch (error: any) {
    console.error('Error detail:', error);
    alert(`เกิดข้อผิดพลาด: ${error.message || 'ลองใหม่อีกครั้ง'}`);
  } finally {
    setLoading(false);
  }
};
