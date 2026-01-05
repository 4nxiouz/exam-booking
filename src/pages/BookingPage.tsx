import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, CheckCircle, AlertCircle, Lock, CreditCard, Calendar } from 'lucide-react';
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

  useEffect(() => {
    fetchRounds();
    const userEmail = session?.user?.email;
    if (userEmail) {
      setFormData(prev => ({ ...prev, email: userEmail }));
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
    if (!session?.user) {
      alert('กรุณาเข้าสู่ระบบก่อนครับ');
      return;
    }
    if (!selectedRound) {
      alert('กรุณาเลือกรอบสอบก่อนครับ');
      return;
    }

    setLoading(true);
    try {
      const userEmail = session.user.email;
      const userId = session.user.id;

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

      await supabase
        .from('exam_rounds')
        .update({ current_seats: round.current_seats + 1 })
        .eq('id', selectedRound);

      setBookingCode(booking.booking_code);
      setSuccess(true);
    } catch (error: any) {
      console.error(error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">จองสำเร็จ!</h2>
          <div className="bg-blue-50 p-4 rounded-xl mb-6">
            <p className="text-sm text-gray-600 mb-1">รหัสการจองของคุณ</p>
            <p className="text-2xl font-bold text-blue-600">{bookingCode}</p>
          </div>
          <button onClick={() => window.location.reload()} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">กลับหน้าหลัก</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-600 p-6 text-white text-center">
          <h1 className="text-2xl font-bold">แบบฟอร์มจองที่นั่งสอบ</h1>
        </div>

        <form onSubmit={handleBooking} className="p-6 space-y-6">
          {/* ข้อมูลทั่วไป */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">ชื่อ-นามสกุล *</label>
              <input type="text" required value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">อีเมล (Auto)</label>
              <input type="email" readOnly value={formData.email} className="w-full px-4 py-2 border bg-gray-50 rounded-lg" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">เบอร์โทรศัพท์ *</label>
            <input type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">ประเภทผู้สมัคร</label>
            <select value={userType} onChange={(e) => setUserType(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
              <option value="tg">พนักงานการบินไทย</option>
              <option value="wingspan">Wingspan</option>
              <option value="intern">นักศึกษาฝึกงาน</option>
              <option value="general">บุคคลภายนอก</option>
            </select>
          </div>

          {isInternal && (
            <div className="p-4 border-2 border-dashed border-orange-200 rounded-xl bg-orange-50">
              <label className="block text-sm font-bold text-orange-700 mb-2">แนบรูปบัตรพนักงาน/นักศึกษา *</label>
              <input type="file" required accept="image/*" onChange={(e) => setIdCardFile(e.target.files?.[0] || null)} />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold mb-2">เลือกรอบสอบ *</label>
            <select required value={selectedRound} onChange={(e) => setSelectedRound(e.target.value)} className="w-full px-4 py-2 border rounded-lg">
              <option value="">-- เลือกรอบสอบ --</option>
              {rounds.map(r => (
                <option key={r.id} value={r.id} disabled={r.max_seats - r.current_seats <= 0}>
                  {new Date(r.exam_date).toLocaleDateString('th-TH')} ({r.exam_time}) - ว่าง {r.max_seats - r.current_seats} ที่
                </option>
              ))}
            </select>
          </div>

          <div className="bg-blue-600 p-4 rounded-xl text-center text-white font-black text-2xl">
            ยอดชำระ: {price}.-
          </div>

          {/* การชำระเงิน */}
          <div className="grid grid-cols-2 gap-4">
            <button type="button" onClick={() => setPayMethod('transfer')} className={`p-4 border-2 rounded-xl font-bold ${payMethod === 'transfer' ? 'border-blue-600 bg-blue-50' : ''}`}>โอนเงิน</button>
            <button type="button" onClick={() => setPayMethod('walkin')} className={`p-4 border-2 rounded-xl font-bold ${payMethod === 'walkin' ? 'border-blue-600 bg-blue-50' : ''}`}>จ่ายหน้างาน</button>
          </div>

          {payMethod === 'transfer' && (
            <div className="text-center p-4 border rounded-xl">
              <img src={`https://promptpay.io/0972396095/${price}.png`} className="mx-auto w-48 mb-4" alt="QR" />
              <input type="file" required accept="image/*" onChange={(e) => setPaymentSlipFile(e.target.files?.[0] || null)} />
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !selectedRound || (payMethod === 'transfer' && !paymentSlipFile) || (isInternal && !idCardFile)}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-xl disabled:bg-gray-300 transition-all active:scale-95 shadow-lg"
          >
            {loading ? 'กำลังบันทึก...' : 'ยืนยันการจองที่นั่ง'}
          </button>
        </form>
      </div>
    </div>
  );
}
