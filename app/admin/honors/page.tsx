/* eslint-disable @next/next/no-img-element */
'use client';
import { useState, useEffect, useRef } from 'react';
import ImageUpload from '@/components/ImageUpload'; 
import { Search, Check, Image as ImageIcon, LayoutTemplate, Trash2, Sparkles, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminHonorsDashboard() {
  const [activeTab, setActiveTab] = useState('العاشر');
  const [percentage, setPercentage] = useState('');
  const [imageUrl, setImageUrl] = useState<string>(''); 
  const [resetKey, setResetKey] = useState(0); 
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [isPublished, setIsPublished] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [settingsId, setSettingsId] = useState<any>(null);
  
  const [customDesigns, setCustomDesigns] = useState<Record<string, string>>({});
  const [isCustomMode, setIsCustomMode] = useState(false);

  const [sections, setSections] = useState<any[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentName, setStudentName] = useState('');

  const grades = ['العاشر', 'الحادي عشر علمي', 'الحادي عشر أدبي', 'الثاني عشر علمي', 'الثاني عشر أدبي'];
  const toArabicDigits = (num: any) => String(num).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. جلب الإعدادات والطلاب
  useEffect(() => { 
    const loadSettings = async () => {
      const { data } = await supabase.from('platform_settings').select('id, show_honors_board, honors_custom_designs').limit(1).maybeSingle();
      if (data) {
        setIsPublished(data.show_honors_board);
        setSettingsId(data.id);
        const fetchedDesigns = data.honors_custom_designs || {};
        setCustomDesigns(fetchedDesigns);
        
        // 🚀 الإصلاح الجذري 1: تعيين الحالة هنا مباشرة بدلاً من useEffect منفصل
        setIsCustomMode(!!fetchedDesigns[activeTab]);
      }
    };

    const loadTopStudents = async () => {
      const { data } = await supabase.from('top_students').select('*').eq('grade_level', activeTab).order('percentage', { ascending: false });
      setStudents(data || []);
    };
    
    loadSettings();
    loadTopStudents();
  }, [activeTab, refreshTrigger]);

  // 2. جلب الفصول والطلاب
  useEffect(() => {
    const loadSections = async () => {
      const searchKeyword = activeTab.replace('الصف ', '').replace('ال', '').trim();
      const { data: sectionsData, error } = await supabase.from('sections').select('id, name, classes!inner(name)').ilike('classes.name', `%${searchKeyword}%`).order('name');
      if (!error && sectionsData && sectionsData.length > 0) {
        setSections(sectionsData);
        setSelectedSectionId(sectionsData[0].id);
      } else {
        setSections([]); setSelectedSectionId(''); setAvailableStudents([]);
      }
    };
    loadSections();
  }, [activeTab]);

  useEffect(() => {
    const loadStudentsOfSection = async () => {
      if (!selectedSectionId) return;
      const { data: studentsData, error } = await supabase.from('students').select(`id, users!inner (full_name, avatar_url)`).eq('section_id', selectedSectionId);
      if (!error && studentsData) {
        const formattedStudents = studentsData.map((s: any) => ({
          id: s.id, full_name: (Array.isArray(s.users) ? s.users[0] : s.users)?.full_name || 'بدون اسم', avatar_url: (Array.isArray(s.users) ? s.users[0] : s.users)?.avatar_url || null
        })).sort((a, b) => a.full_name.localeCompare(b.full_name));
        setAvailableStudents(formattedStudents);
        setSelectedStudentId(''); setStudentName(''); setImageUrl('');
      }
    };
    loadStudentsOfSection();
  }, [selectedSectionId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTogglePublish = async () => {
    if (!settingsId) return;
    setIsPublishing(true);
    const newValue = !isPublished;
    const { data, error } = await supabase.from('platform_settings').update({ show_honors_board: newValue }).eq('id', settingsId).select(); 
    if (!error && data && data.length > 0) {
      setIsPublished(newValue);
      setMessage({ text: newValue ? 'تم إعلان النتائج ونشر اللوحة في الصفحة الرئيسية بنجاح! 🎉' : 'تم إخفاء اللوحة بنجاح. 🔒', type: 'success' });
    } else {
      setMessage({ text: 'فشل تغيير حالة النشر. تأكد من إعدادات قاعدة البيانات (RLS).', type: 'error' });
    }
    setIsPublishing(false);
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !percentage) return;
    setLoading(true);
    const { error } = await supabase.from('top_students').insert([{ student_name: studentName, grade_level: activeTab, percentage: parseFloat(percentage), image_url: imageUrl || null }]);
    if (!error) {
      setMessage({ text: 'تمت إضافة الطالب إلى اللوحة بنجاح!', type: 'success' });
      setPercentage(''); setStudentName(''); setSelectedStudentId(''); setResetKey(prev => prev + 1); setRefreshTrigger(prev => prev + 1); 
    } else {
      setMessage({ text: `فشل الحفظ: ${error.message}`, type: 'error' });
    }
    setLoading(false);
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من استبعاد الطالب؟')) {
      await supabase.from('top_students').delete().eq('id', id);
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const handleSaveCustomDesign = async (url: string) => {
    if (!settingsId) return;
    setLoading(true);
    const updatedDesigns = { ...customDesigns };
    if (url) updatedDesigns[activeTab] = url;
    else delete updatedDesigns[activeTab];

    const { error } = await supabase.from('platform_settings').update({ honors_custom_designs: updatedDesigns }).eq('id', settingsId);
    
    if (!error) {
      setCustomDesigns(updatedDesigns);
      // 🚀 تحديث حالة الواجهة محلياً بشكل آمن
      setIsCustomMode(!!url);
      setMessage({ text: url ? 'تم حفظ البوستر المخصص بنجاح!' : 'تم إزالة البوستر والعودة للنظام الذكي.', type: 'success' });
      setRefreshTrigger(prev => prev + 1);
    } else {
      setMessage({ text: 'حدث خطأ أثناء حفظ البوستر.', type: 'error' });
    }
    setLoading(false);
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const handleCopyAIPrompt = () => {
    if (students.length === 0) {
      setMessage({ text: 'الرجاء رصد المتفوقين في النظام الذكي أولاً لتوليد البرومبت!', type: 'error' });
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
      return;
    }

    const top3Students = students.slice(0, 3).map((s, index) => `${index + 1}. ${s.student_name} - ${s.percentage}%`).join('\n');
    const remainingStudents = students.slice(3).map(s => `- ${s.student_name} (${s.percentage}%)`).join('  |  ');

    const remainingInstruction = remainingStudents.length > 0 ? `\n2. OTHER HONORED STUDENTS: \nBelow the top 3, create an elegant, frosted glass board or a glowing golden list containing all the following remaining honored students in clear, slightly smaller Arabic text:\n${remainingStudents}\n` : '';

    const promptText = `Create a hyper-realistic, ultra-luxurious 4K academic honors board poster for a boys' high school. 
Theme: Futuristic elegance combining deep navy blue, metallic gold, and frosted glassmorphism effects. Cinematic volumetric lighting with glowing golden particles.

At the very top, write clearly in elegant, majestic 3D Arabic calligraphy:
"مدرسة الرفعة النموذجية (م-ث) بنين"
Directly below it, write:
"لوحة الشرف - صف ${activeTab}"

DESIGN INSTRUCTIONS:
1. TOP 3 WINNERS: 
Create three distinct, prominent, and highly decorated glowing glass pedestals or royal golden shields in the center for the top 3 students. Make them look elite and victorious. Here are their names and scores in Arabic:
${top3Students}
${remainingInstruction}
At the bottom center, in a formal and prestigious Arabic font, write:
"مدير المدرسة: صالح مخلد المطيري"

The overall vibe should be prestigious, victorious, and academically elite, resembling a royal cinematic award ceremony.`.trim();

    navigator.clipboard.writeText(promptText);
    setMessage({ text: '✨ تم نسخ البرومبت السحري! الصقه الآن في (ChatGPT / DALL-E) لإنتاج البوستر.', type: 'success' });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans" dir="rtl">
      <div className="max-w-5xl mx-auto">
        
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">إدارة لوحة الشرف 🏆</h1>
            <p className="text-gray-500 mt-1">النظام الذكي + البوسترات المخصصة</p>
          </div>
          <div className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex flex-col">
               <span className="text-[10px] font-bold text-gray-400">حالة اللوحة الآن</span>
               <span className={`text-sm font-black ${isPublished ? 'text-green-600' : 'text-gray-500'}`}>
                 {isPublished ? '🌐 معلنة للجميع' : '🔒 مخفية (قيد الرصد)'}
               </span>
            </div>
            <button onClick={handleTogglePublish} disabled={isPublishing} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${isPublished ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-green-500 text-white shadow-green-500/30 border border-green-600'}`}>
              {isPublishing ? 'جاري...' : isPublished ? 'إخفاء اللوحة' : 'إعلان النتائج رسمياً 📢'}
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`mb-6 p-4 rounded-xl font-bold text-center flex items-center justify-center gap-2 border shadow-sm ${message.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
            {message.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-2 mb-8 justify-center">
          {grades.map((grade) => (
            <button 
              key={grade} 
              // 🚀 الإصلاح الجذري 2: تحديث حالة الـ Custom Mode يدوياً عند اختيار الصف
              onClick={() => {
                setActiveTab(grade);
                setIsCustomMode(!!customDesigns[grade]);
              }} 
              className={`px-5 py-2 rounded-lg font-semibold transition ${activeTab === grade ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
            >
              {grade}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          <div className="md:col-span-5">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-8">
              
              <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                <button onClick={() => setIsCustomMode(false)} className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${!isCustomMode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  <LayoutTemplate className="w-4 h-4" /> الرصد الذكي
                </button>
                <button onClick={() => setIsCustomMode(true)} className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${isCustomMode ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  <ImageIcon className="w-4 h-4" /> رفع بوستر جاهز
                </button>
              </div>

              {isCustomMode ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-black text-gray-800 text-center">تصميم مخصص لـ {activeTab}</h2>
                    <button onClick={handleCopyAIPrompt} className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-indigo-200 shadow-sm active:scale-95" type="button">
                      <Sparkles className="w-3.5 h-3.5" /> هندسة البوستر (AI)
                    </button>
                  </div>
                  
                  {/* 🚀 الإصلاح الجذري 3: إزالة علامات التنصيص المسببة لمشكلة Netlify */}
                  <p className="text-[11px] text-gray-500 font-bold mb-4 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                    💡 <span className="text-indigo-600">نصيحة للإدارة:</span> قم برصد الطلاب في (النظام الذكي) أولاً، ثم اضغط على زر <strong className="text-indigo-600">(هندسة البوستر)</strong> أعلاه لنسخ وصف احترافي. الذكاء الاصطناعي سيقوم بتصميم منصات تتويج لأول 3 مراكز وسرد الباقين أسفلها بشكل فخم!
                  </p>
                  
                  <ImageUpload key={`custom-${activeTab}`} initialImageUrl={customDesigns[activeTab] || ''} onUploadSuccess={handleSaveCustomDesign} label="اسحب وأفلت البوستر المجمع لطلاب الصف هنا" />
                  
                  {customDesigns[activeTab] && (
                    <button onClick={() => handleSaveCustomDesign('')} className="w-full flex items-center justify-center gap-2 mt-4 text-red-500 hover:text-red-600 bg-red-50 py-2.5 rounded-xl font-bold text-sm transition active:scale-95 border border-red-100">
                      <Trash2 className="w-4 h-4" /> إزالة البوستر والعودة للنظام الذكي
                    </button>
                  )}
                </div>
              ) : (
                <form onSubmit={handleAddStudent} className="space-y-4">
                  <h2 className="text-lg font-bold text-gray-800 mb-4">رصد متفوق فردي لصف {activeTab}</h2>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الفصل الدراسي</label>
                    <select value={selectedSectionId} onChange={(e) => setSelectedSectionId(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none font-semibold bg-white">
                      {sections.length === 0 && <option value="">لا يوجد فصول</option>}
                      {sections.map((sec) => <option key={sec.id} value={sec.id}>{sec.name}</option>)}
                    </select>
                  </div>

                  <div className="relative" ref={dropdownRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">اسم الطالب من السجلات</label>
                    <div className="relative">
                      <input type="text" value={studentName} onChange={(e) => { setStudentName(e.target.value); setIsDropdownOpen(true); }} onFocus={() => setIsDropdownOpen(true)} className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg outline-none font-semibold text-gray-800" placeholder="ابحث للرصد..." required autoComplete="off" disabled={availableStudents.length === 0} />
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                    {isDropdownOpen && availableStudents.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                        {availableStudents.filter(s => (s.full_name || '').toLowerCase().includes(studentName.toLowerCase())).map((student) => (
                          <div key={student.id} onClick={() => { setSelectedStudentId(student.id); setStudentName(student.full_name); if (student.avatar_url) setImageUrl(student.avatar_url); setIsDropdownOpen(false); }} className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-gray-700 text-sm font-bold border-b border-gray-50 flex items-center gap-3 transition-colors">
                            {student.avatar_url ? <img src={student.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" /> : <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs">🎓</div>}
                            <span className="flex-1 truncate">{student.full_name}</span>
                            {studentName === student.full_name && <Check className="w-4 h-4 text-blue-600" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">النسبة (%)</label>
                    <input type="number" step="0.01" value={percentage} onChange={(e) => setPercentage(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none font-bold text-gray-800 text-left" dir="ltr" placeholder="99.5" required />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">صورة التكريم (اختياري)</label>
                    <ImageUpload key={`${resetKey}-${selectedStudentId}`} initialImageUrl={imageUrl} onUploadSuccess={(url) => setImageUrl(url)} label="اسحب وأفلت الصورة هنا" />
                  </div>

                  <button type="submit" disabled={loading || !studentName} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black mt-4 hover:bg-blue-700 transition active:scale-95 shadow-md disabled:opacity-50">
                    {loading ? 'جاري الاعتماد...' : 'إضافة للقائمة 💾'}
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="md:col-span-7">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
              <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  {isCustomMode ? `معاينة بوستر ${activeTab}` : `سجل الرصد الذكي - ${activeTab}`}
                </h2>
                {!isCustomMode && <span className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-full">{toArabicDigits(students.length)} متفوقين</span>}
              </div>

              {isCustomMode ? (
                <div className="flex items-center justify-center h-[calc(100%-80px)]">
                  {customDesigns[activeTab] ? (
                    <img src={customDesigns[activeTab]} alt="Custom Poster" className="w-full max-h-[600px] object-contain rounded-2xl border border-gray-200 shadow-md" />
                  ) : (
                    <div className="text-center py-20 text-gray-400 font-bold border-2 border-dashed border-gray-200 rounded-2xl w-full">لم يتم رفع بوستر مخصص لهذا الصف بعد.</div>
                  )}
                </div>
              ) : (
                students.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-sm font-bold">لم يتم رصد أي طالب في هذه المرحلة عبر النظام الذكي.</div>
                ) : (
                  <div className="space-y-3">
                    {students.map((student, index) => (
                      <div key={student.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 transition">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 flex items-center justify-center bg-gray-200 text-gray-700 font-bold rounded-full text-sm">{toArabicDigits(index + 1)}</div>
                          {student.image_url ? <img src={student.image_url} alt="" className="w-10 h-10 rounded-full object-cover border border-gray-300 shadow-sm" /> : <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xl">🎓</div>}
                          <p className="font-semibold text-gray-800 text-lg">{student.student_name}</p>
                        </div>
                        <div className="flex items-center gap-6">
                          <span className="text-blue-600 font-bold text-lg">{toArabicDigits(student.percentage)}%</span>
                          <button onClick={() => handleDelete(student.id)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors" title="حذف">🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
