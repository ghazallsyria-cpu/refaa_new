'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Trash2, Save, XCircle, Sparkles, Trophy, Quote, 
  Image as ImageIcon, Loader2, Eye, EyeOff, LayoutTemplate,
  UserPlus, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ImageUpload from '@/components/ImageUpload';

// الأنواع المتاحة للشاشات
const SLIDE_TYPES = [
  { id: 'welcome', label: 'ترحيب وإعلان عام', icon: Sparkles, color: 'from-indigo-400 to-blue-500' },
  { id: 'honor_roll', label: 'لوحة شرف (طلاب متميزون)', icon: Trophy, color: 'from-amber-400 to-orange-500' },
  { id: 'quote', label: 'إضاءة وحكمة اليوم', icon: Quote, color: 'from-emerald-400 to-teal-500' },
  { id: 'media', label: 'صورة أو فيديو ترويجي', icon: ImageIcon, color: 'from-purple-400 to-pink-500' },
];

export default function ForumHeroAdminPage() {
  const [slides, setSlides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🚀 حالات النموذج (Form)
  const [type, setType] = useState('welcome');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [badge, setBadge] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [students, setStudents] = useState<{name: string, grade: string, img: string}[]>([]);

  // جلب الشرائح من قاعدة البيانات
  const fetchSlides = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('forum_hero_slides')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setSlides(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSlides();
  }, []);

  // إضافة طالب للوحة الشرف
  const addStudent = () => {
    setStudents([...students, { name: '', grade: '', img: '' }]);
  };

  const updateStudent = (index: number, field: string, value: string) => {
    const updated = [...students];
    (updated[index] as any)[field] = value;
    // توليد صورة افتراضية ذكية بناءً على الاسم إذا تم إدخاله
    if (field === 'name' && value.trim() !== '') {
      updated[index].img = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(value)}&backgroundColor=b6e3f4`;
    }
    setStudents(updated);
  };

  const removeStudent = (index: number) => {
    setStudents(students.filter((_, i) => i !== index));
  };

  // حفظ الشريحة الجديدة
  const handleSaveSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert('الرجاء إدخال عنوان الشريحة');
    setIsSubmitting(true);

    const selectedType = SLIDE_TYPES.find(t => t.id === type);
    
    const payload = {
      type,
      title,
      description: desc,
      badge_text: badge,
      icon_name: selectedType?.icon.render.name || 'Sparkles', // حفظ اسم الأيقونة
      color_gradient: selectedType?.color,
      media_url: mediaUrl || null,
      metadata: type === 'honor_roll' ? { students } : null,
      is_active: true
    };

    const { error } = await supabase.from('forum_hero_slides').insert([payload]);
    
    setIsSubmitting(false);
    if (error) {
      alert('حدث خطأ أثناء الحفظ: ' + error.message);
    } else {
      setIsModalOpen(false);
      resetForm();
      fetchSlides();
    }
  };

  // تفعيل/إيقاف الشريحة
  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('forum_hero_slides')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    if (!error) fetchSlides();
  };

  // حذف الشريحة
  const deleteSlide = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الإعلان نهائياً؟')) return;
    const { error } = await supabase.from('forum_hero_slides').delete().eq('id', id);
    if (!error) fetchSlides();
  };

  const resetForm = () => {
    setType('welcome');
    setTitle('');
    setDesc('');
    setBadge('');
    setMediaUrl('');
    setStudents([]);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24 p-4 sm:p-6 lg:p-8" dir="rtl">
      
      {/* 🌟 الهيدر الخاص بصفحة الإدارة */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-3xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
            <LayoutTemplate className="h-8 w-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">إدارة شاشات المنتدى</h1>
            <p className="text-slate-500 mt-2 font-medium text-lg">تحكم باللوحات الإعلانية، التفوق، والرسائل الترحيبية المعروضة للطلاب.</p>
          </div>
        </div>
        
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="inline-flex items-center justify-center gap-3 rounded-[2rem] bg-indigo-600 px-8 py-4 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 shrink-0"
        >
          <Plus className="h-5 w-5" /> إضافة شاشة جديدة
        </button>
      </div>

      {/* 🌟 عرض الشاشات الحالية */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-12 h-12 text-indigo-500 animate-spin" /></div>
      ) : slides.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-300">
          <LayoutTemplate className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-black text-slate-800">لا توجد شاشات حالياً</h3>
          <p className="text-slate-500 mt-2 font-bold">اضغط على زر الإضافة للبدء في تزيين منتدى منصتك.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {slides.map((slide) => {
            const SlideIcon = SLIDE_TYPES.find(t => t.id === slide.type)?.icon || Sparkles;
            return (
              <div key={slide.id} className={`bg-white rounded-[2rem] p-6 border shadow-sm transition-all flex flex-col ${slide.is_active ? 'border-slate-200 hover:shadow-lg hover:border-indigo-200' : 'border-slate-200 opacity-60 bg-slate-50'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br ${slide.color_gradient} text-white shadow-md`}>
                    <SlideIcon className="w-6 h-6" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleActive(slide.id, slide.is_active)} className={`p-2 rounded-xl transition-colors ${slide.is_active ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`} title={slide.is_active ? 'إخفاء' : 'إظهار'}>
                      {slide.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button onClick={() => deleteSlide(slide.id)} className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors" title="حذف">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="flex-1">
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg mb-2 inline-block">{slide.badge_text || 'بدون شارة'}</span>
                  <h3 className="text-lg font-black text-slate-900 mb-1 line-clamp-1">{slide.title}</h3>
                  <p className="text-xs font-bold text-slate-500 line-clamp-2">{slide.description}</p>
                  
                  {slide.type === 'honor_roll' && slide.metadata?.students && (
                    <div className="mt-4 flex -space-x-2 rtl:space-x-reverse">
                      {slide.metadata.students.slice(0, 4).map((s: any, i: number) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={s.img} alt={s.name} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100" title={s.name} />
                      ))}
                      {slide.metadata.students.length > 4 && (
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-600">
                          +{slide.metadata.students.length - 4}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🌟 نافذة إضافة شاشة جديدة */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl border border-white/20 my-auto overflow-hidden">
              
              <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black text-slate-900 mb-1">تصميم شاشة جديدة</h2>
                  <p className="text-xs font-bold text-slate-500">اختر النوع، املأ البيانات، وسنقوم بعرضها بجمالية للطلاب.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 shadow-sm border border-slate-100 transition-all"><XCircle className="w-6 h-6" /></button>
              </div>
              
              <form onSubmit={handleSaveSlide} className="p-6 sm:p-8 space-y-6">
                
                {/* نوع الشاشة */}
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">اختر القالب (النوع)</label>
                  <div className="grid grid-cols-2 gap-3">
                    {SLIDE_TYPES.map(t => (
                      <button 
                        key={t.id} type="button" onClick={() => setType(t.id)}
                        className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-right ${type === t.id ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-indigo-200'}`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${type === t.id ? `bg-gradient-to-br ${t.color} text-white` : 'bg-slate-100 text-slate-500'}`}>
                          <t.icon className="w-5 h-5" />
                        </div>
                        <span className={`text-sm font-black ${type === t.id ? 'text-indigo-900' : 'text-slate-600'}`}>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 bg-slate-50/50 p-5 rounded-[2rem] border border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-500 mb-2">الشارة (النص الصغير العلوي)</label>
                      <input type="text" placeholder="مثال: نجم الأسبوع" value={badge} onChange={e => setBadge(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-500 mb-2">العنوان العريض (الرئيسي)</label>
                      <input type="text" required placeholder="مثال: أبطال الرياضيات" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 mb-2">النص الوصفي أو الحكمة</label>
                    <textarea rows={3} placeholder="اكتب رسالتك التحفيزية هنا..." value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none" />
                  </div>
                </div>

                {/* 🚀 إعدادات خاصة حسب النوع المختار */}
                <AnimatePresence mode="wait">
                  {type === 'honor_roll' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-amber-50/50 p-5 rounded-[2rem] border border-amber-100 overflow-hidden">
                      <div className="flex justify-between items-center mb-4">
                        <label className="text-sm font-black text-amber-900 flex items-center gap-2"><Trophy className="w-4 h-4"/> إضافة المتفوقين</label>
                        <button type="button" onClick={addStudent} className="bg-amber-400 hover:bg-amber-500 text-amber-950 text-xs font-black px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"><UserPlus className="w-3 h-3"/> طالب جديد</button>
                      </div>
                      
                      <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {students.length === 0 && <p className="text-xs font-bold text-amber-700/60 text-center py-4">لم تقم بإضافة أي طالب بعد.</p>}
                        {students.map((student, index) => (
                          <div key={index} className="flex gap-2 items-center bg-white p-2 rounded-xl border border-amber-200/50">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={student.img || 'https://api.dicebear.com/7.x/avataaars/svg?seed=new'} alt="avatar" className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
                            <input type="text" placeholder="اسم الطالب" value={student.name} onChange={e => updateStudent(index, 'name', e.target.value)} className="w-full bg-transparent text-sm font-bold outline-none placeholder-slate-400" />
                            <input type="text" placeholder="الصف" value={student.grade} onChange={e => updateStudent(index, 'grade', e.target.value)} className="w-24 bg-slate-50 rounded-lg px-2 py-2 text-xs font-bold outline-none text-center border border-slate-100" />
                            <button type="button" onClick={() => removeStudent(index)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><X className="w-4 h-4"/></button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {type === 'media' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-purple-50/50 p-5 rounded-[2rem] border border-purple-100 overflow-hidden">
                      <label className="block text-sm font-black text-purple-900 mb-3 flex items-center gap-2"><ImageIcon className="w-4 h-4"/> إرفاق صورة ترويجية</label>
                      <ImageUpload 
                        initialImageUrl={mediaUrl} 
                        onUploadSuccess={(url) => setMediaUrl(url)} 
                        label="ارفع بانر أو صورة للإعلان" 
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button type="submit" disabled={isSubmitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-sm flex justify-center items-center gap-2 shadow-xl shadow-indigo-600/20 transition-all active:scale-95">
                      {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />} حفظ ونشر الإعلان
                  </button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 rounded-2xl font-black text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all active:scale-95">إلغاء</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
