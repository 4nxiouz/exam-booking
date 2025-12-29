import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';

interface ExamRound {
  id: string;
  exam_date: string;
  exam_time: string;
  current_seats: number;
  max_seats: number;
}

export default function BookingPage() {
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
  }, []);

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

  const uploadFile = async (file: File, path: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${path}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error } = await supabase.storage
      .from('booking-files')
      .upload(filePath, file);

    if (error) throw error;

    const { data } = supabase.storage
      .from('booking-files')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
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
        idCardUrl = await uploadFile(idCardFile, `id-card/${formData.email}`);
      }

      if (payMethod === 'transfer' && paymentSlipFile) {
        paymentSlipUrl = await uploadFile(paymentSlipFile, `payment-slip/${formData.email}`);
      }

      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          exam_round_id: selectedRound,
          user_type: userType,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          price,
          payment_method: payMethod,
          id_card_url: idCardUrl,
          payment_slip_url: paymentSlipUrl,
          payment_status: payMethod === 'transfer' ? 'pending' : 'verified'
        })
        .select()
        .single();

      if (error) throw error;

      setBookingCode(booking.booking_code);
      setSuccess(true);

    } catch (error) {
      console.error('Error:', error);
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

          <div className="text-left bg-gray-50 p-4 rounded-xl mb-6 space-y-2 text-sm">
            <p className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <span>ตรวจสอบอีเมล {formData.email} เพื่อรับใบยืนยันการจอง</span>
            </p>
            <p className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <span>กรุณานำรหัสการจองมาในวันสอบ</span>
            </p>
          </div>

          <button
            onClick={() => {
              setSuccess(false);
              setFormData({ fullName: '', email: '', phone: '' });
              setIdCardFile(null);
              setPaymentSlipFile(null);
              setSelectedRound('');
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
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
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
                  อีเมล <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="example@email.com"
                />
              </div>
            </div>

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
                <p className="text-xs text-gray-600 mt-2">กรุณาแนบภาพถ่ายบัตรที่ชัดเจน</p>
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
                {rounds.map(r => {
                  const availableSeats = r.max_seats - r.current_seats;
                  const isFull = availableSeats <= 0;
                  return (
                    <option key={r.id} value={r.id} disabled={isFull}>
                      {new Date(r.exam_date).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })} ({r.exam_time === 'Morning' ? 'เช้า 09:00-12:00' : 'บ่าย 13:00-16:00'})
                      {isFull ? ' - เต็มแล้ว' : ` - ว่าง ${availableSeats} ที่`}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl text-center border-2 border-blue-200">
              <span className="text-gray-700 font-medium">ค่าธรรมเนียมการสอบ</span>
              <div className="text-4xl font-bold text-blue-600 mt-2">{price} บาท</div>
              {isInternal && (
                <p className="text-sm text-green-600 mt-2 font-medium">ราคาพิเศษสำหรับบุคลากรภายใน</p>
              )}
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                ช่องทางการชำระเงิน <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className={`flex items-center justify-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition ${
                  payMethod === 'transfer'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <input
                    type="radio"
                    name="pay"
                    value="transfer"
                    checked={payMethod === 'transfer'}
                    onChange={() => setPayMethod('transfer')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="font-medium">โอนเงิน</span>
                </label>
                <label className={`flex items-center justify-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition ${
                  payMethod === 'walkin'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <input
                    type="radio"
                    name="pay"
                    value="walkin"
                    onChange={() => setPayMethod('walkin')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="font-medium">จ่ายหน้างาน</span>
                </label>
              </div>
            </div>

            {payMethod === 'transfer' && (
              <div className="p-6 border-2 border-blue-200 rounded-xl bg-gradient-to-br from-white to-blue-50">
                <h3 className="font-bold text-center text-gray-800 mb-4">ชำระเงินผ่าน PromptPay</h3>

                <div className="bg-white p-4 inline-block rounded-xl shadow-md mx-auto block w-fit mb-4">
                  <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">QR Code PromptPay</p>
                      <p className="text-xs text-gray-500">สแกนเพื่อชำระ {price} บาท</p>
                    </div>
                  </div>
                </div>

                <div className="text-center mb-4">
                  <p className="text-sm text-gray-600">หรือโอนไปที่</p>
                  <p className="font-mono font-bold text-lg text-gray-800">0XX-XXX-XXXX</p>
                  <p className="text-sm text-gray-600">ธนาคาร XXX</p>
                </div>

                <label className="block">
                  <span className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    แนบหลักฐานการโอนเงิน <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="file"
                    required
                    accept="image/*"
                    onChange={(e) => setPaymentSlipFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                  />
                  <p className="text-xs text-blue-600 mt-2">ระบบจะตรวจสอบสลิปและส่งอีเมลยืนยันภายใน 24 ชั่วโมง</p>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-blue-800 transition disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? 'กำลังประมวลผล...' : 'ยืนยันการจองที่นั่ง'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
