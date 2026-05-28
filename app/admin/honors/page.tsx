/* eslint-disable @next/next/no-img-element */
'use client';
import { useState, useEffect, useRef } from 'react';
import ImageUpload from '@/components/ImageUpload'; 
import { Search, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase'; // 🚀 استدعاء العميل الرسمي بصلاحياتك الإدارية

export default function AdminHonorsDashboard() {
  const [activeTab, setActiveTab] = useState('العاشر');
  const [percentage, setPercentage] = useState('');
  const [imageUrl, setImageUrl] = useState<string>(''); 
  const [resetKey, setResetKey] = useState(0); 
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // حالات زر الإعلان
  const [isPublished, setIsPublished] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [settingsId, setSettingsId] = useState<any>(null);

  // حالات النظام الذكي
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentName, setStudentName] = useState('');

  const grades = ['العاشر', 'الحادي عشر علمي', 'الحادي عشر أدبي', 'الثاني عشر علمي', 'الثاني عشر أدبي'];
  const toArabicDigits = (num: any) => String(num).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. جلب الإعدادات والطلاب المتفوقين
  useEffect(() => { 
    const loadSettings = async () => {
      const { data } = await supabase.from('platform_settings').select('id, show_honors_board').limit(1).maybeSingle();
      if (data) {
        setIsPublished(data.show_honors_board);
        setSettingsId(data.id);
      }
    };

    const loadTopStudents = async () => {
      const { data } = await supabase
        .from('top_students')
        .select('*')
        .eq('grade_level', activeTab)
        .order('percentage', { ascending: false });
      setStudents(data || []);
    };
    
    loadSettings();
    loadTopStudents();
  }, [activeTab, refreshTrigger]);

  // 2. جلب الفصول بذكاء بناءً على المرحلة
  useEffect(() => {
    const loadSections = async () => {
      const searchKeyword = activeTab.replace('الصف ', '').replace('ال', '').trim();

      const { data: sectionsData, error } = await supabase
        .from('sections')
        .select('id, name, classes!inner(name)')
        .ilike('classes.name', `%${searchKeyword}%`)
        .order('name');

      if (!error && sectionsData && sectionsData.length > 0) {
        setSections(sectionsData);
        setSelectedSectionId(sectionsData[0].id);
      } else {
        setSections([]);
        setSelectedSectionId('');
        setAvailableStudents([]);
      }
    };

    loadSections();
  }, [activeTab]);

  // 3. جلب طلاب الفصل المختار
  useEffect(() => {
    const loadStudentsOfSection = async () => {
      if (!selectedSectionId) return;

      const { data: studentsData, error } = await supabase
        .from('students')
        .select(`
          id,
          users!inner (
            full_name,
            avatar_url
          )
        `)
        .eq('section_id', selectedSectionId);

      if (!error && studentsData) {
        const formattedStudents = studentsData.map((s: any) => {
          const userObj = Array.isArray(s.users) ? s.users[0] : s.users;
          return {
            id: s.id,
            full_name: userObj?.full_name || 'بدون اسم',
            avatar_url: userObj?.avatar_url || null
          };
        }).sort((a, b) => a.full_name.localeCompare(b.full_name));

        setAvailableStudents(formattedStudents);

        // 🚀 التعديل الجذري: إفراغ الخانات لكي تظهر القائمة كاملة عند النقر
        setSelectedStudentId('');
        setStudentName('');
        setImageUrl('');
      }
    };

    loadStudentsOfSection();
  }, [selectedSectionId]);

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTogglePublish = async () => {
    if (!settingsId) {
      setMessage({ text: 'خطأ: لم يتم التعرف على إعدادات المنصة.', type: 'error' });
      return;
    }
    
    setIsPublishing(true);
    const newValue = !isPublished;
    
    // 🚀 تحديث الإعدادات باستخدام صلاحياتك الرسمية
    const { data, error } = await supabase
      .from('platform_settings')
      .update({ show_honors_board: newValue })
      .eq('id', settingsId)
      .select(); 

    if (!error && data && data.length > 0) {
      setIsPublished(newValue);
      setMessage({ text: newValue ? 'تم إعلان النتائج ونشر اللوحة في الصفحة الرئيسية بنجاح! 🎉' : 'تم إخفاء اللوحة عن الطلاب، يمكنك الرصد بهدوء. 🔒', type: 'success' });
    } else {
      setMessage({ text: 'فشل التحديث! يرجى مراجعة الصلاحيات أو اتصال الإنترنت.', type: 'error' });
    }
    
    setIsPublishing(false);
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !percentage) {
      setMessage({ text: 'الرجاء اختيار الطالب وتحديد النسبة', type: 'error' });
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
      setMessage({ text: 'تمت إضافة الطالب إلى اللوحة بنجاح!', type: 'success' });
      setPercentage('');
      // إفراغ حقل الطالب بعد الرصد الناجح
      setStudentName('');
      setSelectedStudentId('');
      setResetKey(prev => prev + 1); 
      setRefreshTrigger(prev => prev + 1); 
    } else {
      setMessage({ text: 'حدث خطأ أثناء حفظ البيانات.', type: 'error' });
    }
    setLoading(false);
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من استبعاد الطالب من لوحة الشرف؟')) {
      await supabase.from('top_students').delete().eq('id', id);
      setRefreshTrigger(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans" dir="rtl">
      <div className="max-w-5xl mx-auto">
        
        {/* الترويسة وزر النشر */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">إدارة لوحة الشرف 🏆</h1>
            <p className="text-gray-500 mt-1">نظام رصد درجات متفوقي مدرسة الرفعة النموذجية</p>
          </div>

          <div className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex flex-col">
               <span className="text-[10px] font-bold text-gray-400">حالة اللوحة الآن</span>
               <span className={`text-sm font-black ${isPublished ? 'text-green-600' : 'text-gray-500'}`}>
                 {isPublished ? '🌐 معلنة للجميع' : '🔒 مخفية (قيد الرصد)'}
               </span>
            </div>
            <button onClick={handleTogglePublish} disabled={isPublishing} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${isPublished ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200' : 'bg-green-500 text-white hover:bg-green-600 shadow-green-500/30 border border-green-600'}`}>
              {isPublishing ? 'جاري...' : isPublished ? 'إخفاء اللوحة' : 'إعلان النتائج رسمياً 📢'}
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`mb-6 p-4 rounded-xl font-bold text-center border shadow-sm ${message.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-2 mb-8 justify-center">
          {grades.map((grade) => (
            <button key={grade} onClick={() => setActiveTab(grade)} className={`px-5 py-2 rounded-lg font-semibold transition ${activeTab === grade ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
              {grade}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* وحدة الإدخال الذكية */}
          <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-8">
              <h2 className="text-xl font-bold text-gray-800 mb-6">رصد متفوق لصف {activeTab}</h2>
              
              <form onSubmit={handleAddStudent} className="space-y-4">
                
                {/* 1. اختيار الفصل */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الفصل الدراسي</label>
                  <select
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-gray-800 cursor-pointer bg-white"
                  >
                    {sections.length === 0 && <option value="">لا يوجد فصول</option>}
                    {sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))}
                  </select>
                </div>

                {/* 2. القائمة المنسدلة للطلاب (بدون فلترة تلقائية) */}
                <div className="relative" ref={dropdownRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم الطالب من السجلات</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={studentName} 
                      onChange={(e) => {
                        setStudentName(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      onClick={() => setIsDropdownOpen(true)}
                      className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition font-semibold text-gray-800" 
                      placeholder="انقر هنا لعرض القائمة..." 
                      required 
                      autoComplete="off"
                      disabled={availableStudents.length === 0}
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>

                  {isDropdownOpen && availableStudents.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                      {availableStudents
                        .filter(s => (s.full_name || '').toLowerCase().includes(studentName.toLowerCase()))
                        .map((student) => (
                          <div 
                            key={student.id}
                            onClick={() => {
                              setSelectedStudentId(student.id);
                              setStudentName(student.full_name);
                              if (student.avatar_url) setImageUrl(student.avatar_url);
                              setIsDropdownOpen(false);
                            }}
                            className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-gray-700 text-sm font-bold border-b border-gray-50 last:border-0 flex items-center gap-3 transition-colors"
                          >
                            {student.avatar_url ? (
                              <img src={student.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs">🎓</div>
                            )}
                            <span className="flex-1 truncate">{student.full_name}</span>
                            {studentName === student.full_name && <Check className="w-4 h-4 text-blue-600" />}
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* 3. إدخال النسبة المئوية */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">النسبة (%)</label>
                  <input type="number" step="0.01" value={percentage} onChange={(e) => setPercentage(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800 text-left" dir="ltr" placeholder="مثال: 99.5" required />
                </div>
                
                {/* 4. صورة الطالب */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">صورة التكريم (اختياري)</label>
                  <ImageUpload 
                    key={`${resetKey}-${selectedStudentId}`} 
                    initialImageUrl={imageUrl} 
                    onUploadSuccess={(url) => setImageUrl(url)} 
                    label="اسحب وأفلت الصورة هنا"
                  />
                </div>

                <button type="submit" disabled={loading || !studentName} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black mt-4 hover:bg-blue-700 transition active:scale-95 shadow-md disabled:opacity-50">
                  {loading ? 'جاري الاعتماد...' : 'حفظ باللوحة الماسية 💎'}
                </button>
              </form>
            </div>
          </div>

          {/* قائمة المتفوقين المعتمدين */}
          <div className="md:col-span-2">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">سجل المتفوقين - {activeTab}</h2>
                <span className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-full">{toArabicDigits(students.length)} متفوقين</span>
              </div>

              {students.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-sm font-bold">لم يتم رصد أي طالب في هذه المرحلة.</div>
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
                        <button onClick={() => handleDelete(student.id)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors" title="حذف الطالب">🗑️</button>
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
