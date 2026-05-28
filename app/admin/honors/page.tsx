'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// تهيئة الاتصال بـ Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminHonorsDashboard() {
  const [activeTab, setActiveTab] = useState('العاشر');
  const [studentName, setStudentName] = useState('');
  const [percentage, setPercentage] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const grades = ['العاشر', 'الحادي عشر علمي', 'الحادي عشر أدبي', 'الثاني عشر علمي', 'الثاني عشر أدبي'];

  // دالة تحويل الأرقام إلى العربية (للعرض في الجدول)
  const toArabicDigits = (num: any) => {
    return String(num).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
  };

  // جلب الطلاب المرصدين حالياً
  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('top_students')
      .select('*')
      .eq('grade_level', activeTab)
      .order('percentage', { ascending: false });

    if (!error) {
      setStudents(data || []);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [activeTab]);

  // إضافة طالب جديد
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !percentage) {
      setMessage({ text: 'الرجاء تعبئة جميع الحقول', type: 'error' });
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('top_students')
      .insert([
        { 
          student_name: studentName, 
          grade_level: activeTab, 
          percentage: parseFloat(percentage) 
        }
      ]);

    if (error) {
      setMessage({ text: 'حدث خطأ أثناء الإضافة', type: 'error' });
    } else {
      setMessage({ text: 'تمت إضافة الطالب بنجاح!', type: 'success' });
      setStudentName('');
      setPercentage('');
      fetchStudents(); // تحديث الجدول فوراً
    }
    setLoading(false);
    
    // إخفاء رسالة النجاح بعد ٣ ثوانٍ
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  // حذف طالب
  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الطالب؟')) {
      await supabase.from('top_students').delete().eq('id', id);
      fetchStudents();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans" dir="rtl">
      
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">إدارة لوحة الشرف 🏆</h1>
            <p className="text-gray-500 mt-1">نظام رصد درجات متفوقي مدرسة الرفعة النموذجية</p>
          </div>
        </div>

        {/* أزرار اختيار المرحلة الدراسية */}
        <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-2 mb-8 justify-center">
          {grades.map((grade) => (
            <button
              key={grade}
              onClick={() => setActiveTab(grade)}
              className={`px-5 py-2 rounded-lg font-semibold transition ${
                activeTab === grade
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {grade}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* نموذج إدخال طالب جديد */}
          <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-8">
              <h2 className="text-xl font-bold text-gray-800 mb-6">إضافة متفوق جديد</h2>
              
              <form onSubmit={handleAddStudent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم الطالب الرباعي</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="مثال: محمد أحمد عبدالله"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">النسبة المئوية (%)</label>
                  <input
                    type="number"
                    step="0.01" // للسماح بالفواصل العشرية
                    value={percentage}
                    onChange={(e) => setPercentage(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="مثال: 99.8"
                    dir="ltr" // الأرقام تكتب من اليسار لليمين أثناء الإدخال
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-70"
                >
                  {loading ? 'جاري الحفظ...' : 'حفظ واعتماد 💾'}
                </button>

                {/* عرض رسائل النجاح أو الخطأ */}
                {message.text && (
                  <div className={`p-3 rounded-lg text-sm font-bold text-center ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {message.text}
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* قائمة الطلاب الذين تمت إضافتهم */}
          <div className="md:col-span-2">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">
                  سجل المتفوقين - {activeTab}
                </h2>
                <span className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-full">
                  {toArabicDigits(students.length)} طلاب
                </span>
              </div>

              {students.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  لم يتم إضافة أي طالب في هذا الصف حتى الآن.
                </div>
              ) : (
                <div className="space-y-3">
                  {students.map((student, index) => (
                    <div key={student.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 transition">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 flex items-center justify-center bg-gray-200 text-gray-700 font-bold rounded-full text-sm">
                          {toArabicDigits(index + 1)}
                        </div>
                        <p className="font-semibold text-gray-800 text-lg">{student.student_name}</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="text-blue-600 font-bold text-lg">
                          {toArabicDigits(student.percentage)}%
                        </span>
                        <button
                          onClick={() => handleDelete(student.id)}
                          className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition"
                          title="حذف الطالب"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
