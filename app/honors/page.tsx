'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// تهيئة الاتصال بـ Supabase (استبدل هذا السطر إذا كان لديك ملف مخصص للاتصال)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function HonorsPage() {
  const [activeTab, setActiveTab] = useState('العاشر');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const grades = ['العاشر', 'الحادي عشر علمي', 'الحادي عشر أدبي', 'الثاني عشر علمي', 'الثاني عشر أدبي'];

  // دالة تحويل الأرقام إلى العربية
  const toArabicDigits = (num: any) => {
    return String(num).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
  };

  // جلب البيانات الحقيقية من قاعدة البيانات عند تغيير الصف
  useEffect(() => {
    const fetchTopStudents = async () => {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('top_students')
        .select('*')
        .eq('grade_level', activeTab)
        .order('percentage', { ascending: false }); // الترتيب التلقائي حسب النسبة

      if (error) {
        console.error('خطأ في جلب البيانات:', error);
      } else {
        setStudents(data || []);
      }
      
      setLoading(false);
    };

    fetchTopStudents();
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-indigo-50 p-4 md:p-8 font-sans" dir="rtl">
      
      {/* الترويسة الزجاجية */}
      <div className="max-w-6xl mx-auto mb-12 text-center bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] rounded-3xl p-8">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4 tracking-wide">
          لوحة الشرف الماسية 💎
        </h1>
        <p className="text-lg text-gray-600">كوكبة المتفوقين في مدرسة الرفعة النموذجية</p>
      </div>

      {/* أزرار التنقل */}
      <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-3 mb-16">
        {grades.map((grade) => (
          <button
            key={grade}
            onClick={() => setActiveTab(grade)}
            className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
              activeTab === grade
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                : 'bg-white/50 backdrop-blur-md text-gray-700 hover:bg-white/80 border border-white/50 shadow-sm'
            }`}
          >
            {grade}
          </button>
        ))}
      </div>

      {/* حالة التحميل */}
      {loading ? (
        <div className="text-center text-blue-600 text-xl font-bold animate-pulse mt-20">
          جاري جلب لوحة الشرف...
        </div>
      ) : students.length === 0 ? (
        /* حالة عدم وجود بيانات */
        <div className="text-center mt-20">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-2xl text-gray-600 font-bold">لم يتم رصد درجات متفوقي {activeTab} بعد</h2>
          <p className="text-gray-500 mt-2">بانتظار اعتماد النتائج من إدارة المدرسة.</p>
        </div>
      ) : (
        /* عرض المتفوقين الحقيقيين */
        <>
          {/* منصة التتويج (للمراكز الثلاثة الأولى) */}
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-center items-end gap-6 mb-20">
            
            {/* المركز الثاني */}
            {students[1] && (
              <div className="order-2 md:order-1 w-full md:w-1/3 flex flex-col items-center transform transition hover:-translate-y-2">
                <div className="bg-white/50 backdrop-blur-lg border-[2px] border-gray-300 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-t-3xl rounded-b-xl p-6 w-full text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-gray-300 to-gray-400"></div>
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-gray-200 to-gray-400 rounded-full flex items-center justify-center text-2xl shadow-inner mb-4">🥈</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{students[1].student_name}</h3>
                  <p className="text-gray-500 mb-4">المركز الثاني</p>
                  <div className="inline-block bg-gray-100 text-gray-800 px-4 py-2 rounded-full font-bold">
                    {toArabicDigits(students[1].percentage)}%
                  </div>
                </div>
                <div className="h-16 w-full bg-gradient-to-b from-gray-200 to-gray-300 rounded-b-2xl shadow-lg border-x border-b border-gray-400/30 text-center text-gray-500 font-bold text-2xl pt-2">٢</div>
              </div>
            )}

            {/* المركز الأول */}
            {students[0] && (
              <div className="order-1 md:order-2 w-full md:w-1/3 flex flex-col items-center transform transition hover:-translate-y-3 z-10">
                <div className="bg-white/60 backdrop-blur-xl border-[2px] border-yellow-400 shadow-[0_10px_40px_rgba(250,204,21,0.2)] rounded-t-3xl rounded-b-xl p-8 w-full text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-600"></div>
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center text-3xl shadow-inner mb-4 ring-4 ring-yellow-100">👑</div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">{students[0].student_name}</h3>
                  <p className="text-yellow-600 font-bold mb-4">المركز الأول</p>
                  <div className="inline-block bg-yellow-100 text-yellow-800 px-5 py-2 rounded-full text-lg font-bold shadow-sm">
                    {toArabicDigits(students[0].percentage)}%
                  </div>
                </div>
                <div className="h-24 w-full bg-gradient-to-b from-yellow-200 to-yellow-400 rounded-b-2xl shadow-lg border-x border-b border-yellow-500/30 text-center text-yellow-700 font-bold text-4xl pt-4">١</div>
              </div>
            )}

            {/* المركز الثالث */}
            {students[2] && (
              <div className="order-3 md:order-3 w-full md:w-1/3 flex flex-col items-center transform transition hover:-translate-y-2">
                <div className="bg-white/50 backdrop-blur-lg border-[2px] border-amber-600/40 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-t-3xl rounded-b-xl p-6 w-full text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-600/60 to-amber-700/60"></div>
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-amber-200 to-amber-600 rounded-full flex items-center justify-center text-2xl shadow-inner mb-4">🥉</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{students[2].student_name}</h3>
                  <p className="text-gray-500 mb-4">المركز الثالث</p>
                  <div className="inline-block bg-amber-50 text-amber-800 px-4 py-2 rounded-full font-bold">
                    {toArabicDigits(students[2].percentage)}%
                  </div>
                </div>
                <div className="h-12 w-full bg-gradient-to-b from-amber-200/50 to-amber-400/50 rounded-b-2xl shadow-lg border-x border-b border-amber-500/20 text-center text-amber-700/70 font-bold text-xl pt-1">٣</div>
              </div>
            )}
          </div>

          {/* بقية المتفوقين (المراكز ٤ فما فوق) */}
          <div className="max-w-4xl mx-auto space-y-4">
            {students.slice(3).map((student, index) => (
              <div key={student.id} className="flex items-center justify-between bg-white/40 backdrop-blur-md border border-white/60 p-4 rounded-2xl shadow-[0_4px_16px_0_rgba(31,38,135,0.03)] hover:bg-white/60 transition duration-300">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 flex items-center justify-center bg-blue-100 text-blue-700 font-bold rounded-full">
                    {toArabicDigits(index + 4)}
                  </div>
                  <h4 className="text-lg font-semibold text-gray-800">{student.student_name}</h4>
                </div>
                <div className="text-blue-600 font-bold text-lg">
                  {toArabicDigits(student.percentage)}%
                </div>
              </div>
            ))}
          </div>
        </>
      )}

    </div>
  );
}
