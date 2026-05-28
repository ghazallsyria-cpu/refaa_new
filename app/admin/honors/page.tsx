/* eslint-disable @next/next/no-img-element */
'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import ImageUpload from '@/components/ImageUpload'; 

// تهيئة الاتصال بـ Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminHonorsDashboard() {
  const [activeTab, setActiveTab] = useState('العاشر');
  const [studentName, setStudentName] = useState('');
  const [percentage, setPercentage] = useState('');
  const [imageUrl, setImageUrl] = useState<string>(''); 
  const [resetKey, setResetKey] = useState(0); 
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 🚀 حالات زر إعلان النتائج
  const [isPublished, setIsPublished] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [settingsId, setSettingsId] = useState<any>(null); // لحفظ ID جدول الإعدادات

  const grades = ['العاشر', 'الحادي عشر علمي', 'الحادي عشر أدبي', 'الثاني عشر علمي', 'الثاني عشر أدبي'];
  const toArabicDigits = (num: any) => String(num).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);

  // 🛠️ جلب حالة زر الإعلان وجلب الطلاب
  useEffect(() => { 
    // جلب حالة نشر اللوحة من الإعدادات
    const loadSettings = async () => {
      const { data } = await supabase.from('platform_settings').select('id, show_honors_board').limit(1).single();
      if (data) {
        setIsPublished(data.show_honors_board);
        setSettingsId(data.id);
      }
    };

    // جلب قائمة الطلاب
    const loadStudents = async () => {
      const { data } = await supabase
        .from('top_students')
        .select('*')
        .eq('grade_level', activeTab)
        .order('percentage', { ascending: false });
      setStudents(data || []);
    };
    
    loadSettings();
    loadStudents();
  }, [activeTab, refreshTrigger]);

  // 🚀 دالة تبديل حالة الإعلان (إظهار/إخفاء)
  const handleTogglePublish = async () => {
    if (!settingsId) return;
    setIsPublishing(true);
    const newValue = !isPublished;
    
    const { error } = await supabase
      .from('platform_settings')
      .update({ show_honors_board: newValue })
      .eq('id', settingsId);

    if (!error) {
      setIsPublished(newValue);
      setMessage({ 
        text: newValue ? 'تم إعلان النتائج ونشر اللوحة في الصفحة الرئيسية بنجاح! 🎉' : 'تم إخفاء اللوحة عن الطلاب، يمكنك الرصد بهدوء. 🔒', 
        type: 'success' 
      });
    } else {
      setMessage({ text: 'حدث خطأ أثناء تعديل حالة النشر.', type: 'error' });
    }
    
    setIsPublishing(false);
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  // دالة الإضافة
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !percentage) {
      setMessage({ text: 'الرجاء تعبئة الاسم والنسبة', type: 'error' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('top_students').insert([{ 
      student_name: studentName, 
      grade_level: activeTab, 
      percentage: parseFloat(percentage),
      image_url: imageUrl || null 
    }]);

    if (!error) {
      setMessage({ text: 'تمت إضافة الطالب بنجاح!', type: 'success' });
      setStudentName('');
      setPercentage('');
      setImageUrl(''); 
      setResetKey(prev => prev + 1); 
      setRefreshTrigger(prev => prev + 1); 
    } else {
      setMessage({ text: 'حدث خطأ أثناء حفظ البيانات.', type: 'error' });
    }
    setLoading(false);
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  // دالة الحذف
  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الطالب؟')) {
      await supabase.from('top_students').delete().eq('id', id);
      setRefreshTrigger(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans" dir="rtl">
      <div className="max-w-5xl mx-auto">
        
        {/* الترويسة + زر النشر الذكي */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">إدارة لوحة الشرف 🏆</h1>
            <p className="text-gray-500 mt-1">نظام رصد درجات متفوقي مدرسة الرفعة النموذجية</p>
          </div>

          {/* 🚀 وحدة التحكم في الإعلان */}
          <div className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex flex-col">
               <span className="text-[10px] font-bold text-gray-400">حالة اللوحة الآن</span>
               <span className={`text-sm font-black ${isPublished ? 'text-green-600' : 'text-gray-500'}`}>
                 {isPublished ? '🌐 معلنة للجميع' : '🔒 مخفية (قيد الرصد)'}
               </span>
            </div>
            <button
              onClick={handleTogglePublish}
              disabled={isPublishing}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
                isPublished 
                  ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200' 
                  : 'bg-green-500 text-white hover:bg-green-600 shadow-green-500/30 border border-green-600'
              }`}
            >
              {isPublishing ? 'جاري...' : isPublished ? 'إخفاء اللوحة' : 'إعلان النتائج رسمياً 📢'}
            </button>
          </div>
        </div>

        {/* عرض رسائل النشر */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl font-bold text-center border shadow-sm ${message.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-2 mb-8 justify-center">
          {grades.map((grade) => (
            <button key={grade} onClick={() => setActiveTab(grade)} className={`px-5 py-2 rounded-lg font-semibold transition ${activeTab === grade ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
              {grade}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* نموذج الإدخال */}
          <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-8">
              <h2 className="text-xl font-bold text-gray-800 mb-6">إضافة متفوق</h2>
              
              <form onSubmit={handleAddStudent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
                  <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} className="w-full px-4 py-2 border rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">النسبة (%)</label>
                  <input type="number" step="0.01" value={percentage} onChange={(e) => setPercentage(e.target.value)} className="w-full px-4 py-2 border rounded-lg" dir="ltr" required />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">صورة الطالب (اختياري)</label>
                  <ImageUpload 
                    key={resetKey} 
                    onUploadSuccess={(url) => setImageUrl(url)} 
                    label="اسحب وأفلت الصورة هنا"
                  />
                </div>

                <button type="submit" disabled={loading || (imageUrl === '' && loading)} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold mt-4 hover:bg-blue-700 transition">
                  {loading ? 'جاري الحفظ...' : 'حفظ باللوحة 💾'}
                </button>
              </form>
            </div>
          </div>

          {/* قائمة المتفوقين */}
          <div className="md:col-span-2">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">سجل المتفوقين - {activeTab}</h2>
                <span className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-full">{toArabicDigits(students.length)} طلاب</span>
              </div>

              {students.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">لم يتم إدراج أي طالب بعد.</div>
              ) : (
                <div className="space-y-3">
                  {students.map((student, index) => (
                    <div key={student.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 transition">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 flex items-center justify-center bg-gray-200 text-gray-700 font-bold rounded-full text-sm">{toArabicDigits(index + 1)}</div>
                        
                        {student.image_url ? (
                          <img src={student.image_url} alt="" className="w-10 h-10 rounded-full object-cover border border-gray-300 shadow-sm" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xl">🎓</div>
                        )}
                        <p className="font-semibold text-gray-800 text-lg">{student.student_name}</p>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <span className="text-blue-600 font-bold text-lg">{toArabicDigits(student.percentage)}%</span>
                        <button onClick={() => handleDelete(student.id)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition" title="حذف الطالب">🗑️</button>
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
