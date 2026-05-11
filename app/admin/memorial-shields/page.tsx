// @ts-nocheck
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, CheckCircle2, Shield, Loader2, UserCircle, GraduationCap, Crown, Sparkles, Send, Award, Medal, UploadCloud, ImagePlus, X, Trash2, Clock, History } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

export default function MemorialShieldsMaker() {
  const { authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'students' | 'teachers'>('students');
  const [creationMode, setCreationMode] = useState<'build' | 'upload'>('build');
  
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [shieldType, setShieldType] = useState('gold');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);
  const [externalShieldUrl, setExternalShieldUrl] = useState<string | null>(null);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🚀 سجل الدروع المُصدرة للحذف والإدارة
  const [recentShields, setRecentShields] = useState<any[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const externalInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (['admin', 'management'].includes(currentRole)) fetchData();
  }, [currentRole]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [stdRes, tchRes, stdShieldsRes, tchShieldsRes] = await Promise.all([
         supabase.from('students').select('id, users(full_name, avatar_url), sections(name, classes(name))'),
         supabase.from('teachers').select('id, users(full_name, avatar_url), teacher_subjects(subjects(name))'),
         // 🚀 جلب الدروع للطلاب
         supabase.from('student_memorials').select('id, title, shield_type, created_at, students(users(full_name))').order('created_at', { ascending: false }).limit(10),
         // 🚀 جلب الدروع للمعلمين
         supabase.from('teacher_memorials').select('id, title, shield_type, created_at, teachers(users(full_name))').order('created_at', { ascending: false }).limit(10)
      ]);
      
      const formattedStudents = (stdRes.data || []).map(s => {
         const u = Array.isArray(s.users) ? s.users[0] : s.users;
         const cName = Array.isArray(s.sections?.classes) ? s.sections.classes[0]?.name : s.sections?.classes?.name;
         return { id: s.id, name: u?.full_name || 'بدون اسم', avatar: u?.avatar_url, info: `${cName || ''} - ${s.sections?.name || ''}` };
      });

      const formattedTeachers = (tchRes.data || []).map(t => {
         const u = Array.isArray(t.users) ? t.users[0] : t.users;
         const subj = Array.isArray(t.teacher_subjects) ? t.teacher_subjects.map(ts=>ts.subjects?.name).join('، ') : '';
         return { id: t.id, name: u?.full_name || 'بدون اسم', avatar: u?.avatar_url, info: subj || 'الهيئة التعليمية' };
      });

      setStudents(formattedStudents);
      setTeachers(formattedTeachers);

      // 🚀 دمج وترتيب سجل الدروع
      const combinedShields = [
         ...(stdShieldsRes.data?.map(s => {
            const u = Array.isArray(s.students?.users) ? s.students.users[0] : s.students?.users;
            return { ...s, role: 'student', personName: u?.full_name || 'طالب' };
         }) || []),
         ...(tchShieldsRes.data?.map(t => {
            const u = Array.isArray(t.teachers?.users) ? t.teachers.users[0] : t.teachers?.users;
            return { ...t, role: 'teacher', personName: u?.full_name || 'معلم' };
         }) || [])
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setRecentShields(combinedShields);

    } catch(e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'logo' | 'external') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingFiles(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'rafaa_preset');
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dzmyqnj01';
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      
      if (data.secure_url) {
        if (target === 'logo') setCustomLogoUrl(data.secure_url);
        else setExternalShieldUrl(data.secure_url);
      } else throw new Error('فشل الرفع');
    } catch (error) { alert('حدث خطأ أثناء رفع الصورة.'); } 
    finally { setIsUploadingFiles(false); e.target.value = ''; }
  };

  const handleSaveShield = async () => {
    if (!selectedUser) { alert('يرجى اختيار المُكرَّم!'); return; }
    if (creationMode === 'build' && (!title.trim() || !message.trim())) { alert('يرجى كتابة العنوان والرسالة!'); return; }
    if (creationMode === 'upload' && !externalShieldUrl) { alert('يرجى رفع تصميم الدرع الخارجي!'); return; }

    setIsSubmitting(true);
    try {
       const payload = {
          shield_type: shieldType, title: title.trim() || 'درع خارجي', message: message.trim() || 'تهانينا',
          custom_logo_url: creationMode === 'build' ? customLogoUrl : null,
          external_shield_url: creationMode === 'upload' ? externalShieldUrl : null
       };

       if (activeTab === 'students') await supabase.from('student_memorials').insert({ student_id: selectedUser.id, ...payload });
       else await supabase.from('teacher_memorials').insert({ teacher_id: selectedUser.id, ...payload });
       
       alert('تم إرسال الدرع التذكاري بنجاح! 🎇');
       setSelectedUser(null); setTitle(''); setMessage(''); setSearchTerm(''); setCustomLogoUrl(null); setExternalShieldUrl(null);
       fetchData(); // 🚀 تحديث القائمة لإظهار الدرع الجديد في سجل الحذف
    } catch(e) { alert('حدث خطأ أثناء حفظ الدرع'); }
    finally { setIsSubmitting(false); }
  };

  // 🚀 دالة الحذف القاضية
  const handleDeleteShield = async (id: string, role: string, name: string) => {
     if(!confirm(`هل أنت متأكد من حذف الدرع الخاص بـ (${name})؟\nبمجرد الحذف سيختفي الدرع من حسابه ومن الصفحة الرئيسية للمدرسة فوراً.`)) return;
     setIsDeleting(true);
     try {
        const tableName = role === 'student' ? 'student_memorials' : 'teacher_memorials';
        const { error } = await supabase.from(tableName).delete().eq('id', id);
        if (error) throw error;
        
        // تحديث الواجهة فوراً
        setRecentShields(prev => prev.filter(s => s.id !== id));
     } catch (e) {
        alert('حدث خطأ أثناء الحذف.');
     } finally {
        setIsDeleting(false);
     }
  };

  const currentList = activeTab === 'students' ? students : teachers;
  const filteredList = currentList.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 12);

  const shieldThemes = {
     gold: { id: 'gold', name: 'التفوق (ذهبي)', border: 'from-amber-300 via-yellow-500 to-amber-700', glow: 'bg-amber-500/20', bgInner: 'bg-gradient-to-b from-[#1a150e] to-[#0a0805]', textPrimary: 'text-amber-400', textSecondary: 'text-amber-200/70', icon: <Award className="w-12 h-12 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" /> },
     silver: { id: 'silver', name: 'القيادة (فضي)', border: 'from-slate-300 via-slate-100 to-slate-400', glow: 'bg-slate-400/20', bgInner: 'bg-gradient-to-b from-[#1e222a] to-[#0f1115]', textPrimary: 'text-slate-200', textSecondary: 'text-slate-400', icon: <Shield className="w-12 h-12 text-slate-300 drop-shadow-[0_0_15px_rgba(203,213,225,0.5)]" /> },
     diamond: { id: 'diamond', name: 'الخريجين (ماسي)', border: 'from-cyan-300 via-blue-500 to-indigo-600', glow: 'bg-cyan-500/20', bgInner: 'bg-gradient-to-b from-[#0e1726] to-[#020617]', textPrimary: 'text-cyan-400', textSecondary: 'text-cyan-200/70', icon: <Sparkles className="w-12 h-12 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" /> },
     royal: { id: 'royal', name: 'ملكي (للمعلمين)', border: 'from-amber-600 via-yellow-500 to-yellow-700', glow: 'bg-amber-900/30', bgInner: 'bg-[#050505]', textPrimary: 'text-amber-500', textSecondary: 'text-amber-500/60', icon: <Crown className="w-12 h-12 text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" /> },
  };
  const activeTheme = shieldThemes[shieldType as keyof typeof shieldThemes] || shieldThemes.gold;

  if (!['admin', 'management'].includes(currentRole)) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-cairo text-slate-800 pb-32" dir="rtl">
      
      <input type="file" accept="image/*" className="hidden" ref={logoInputRef} onChange={(e) => handleImageUpload(e, 'logo')} />
      <input type="file" accept="image/*" className="hidden" ref={externalInputRef} onChange={(e) => handleImageUpload(e, 'external')} />

      <style dangerouslySetContent={{__html: `
        @keyframes shine { 0% { transform: translateX(-200%) skewX(-30deg); } 100% { transform: translateX(200%) skewX(-30deg); } }
        .animate-shine { animation: shine 4s infinite cubic-bezier(0.4, 0, 0.2, 1); }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}} />

      {isLoading && (
        <div className="fixed inset-0 bg-white/80 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4"><Loader2 className="w-12 h-12 animate-spin text-indigo-600" /><p className="font-black text-indigo-900">تجهيز الاستوديو...</p></div>
        </div>
      )}

      {isUploadingFiles && (
         <div className="fixed inset-0 bg-slate-900/70 z-[200] flex items-center justify-center backdrop-blur-md">
            <div className="bg-white p-6 rounded-3xl flex flex-col items-center gap-4 shadow-2xl">
               <UploadCloud className="w-12 h-12 text-indigo-600 animate-bounce" />
               <p className="font-black text-slate-800">جاري معالجة ورفع الصورة...</p>
            </div>
         </div>
      )}

      {isDeleting && (
         <div className="fixed inset-0 bg-rose-900/70 z-[200] flex items-center justify-center backdrop-blur-md">
            <div className="bg-white p-6 rounded-3xl flex flex-col items-center gap-4 shadow-2xl">
               <Loader2 className="w-12 h-12 text-rose-600 animate-spin" />
               <p className="font-black text-rose-800">جاري مسح الدرع من السجلات...</p>
            </div>
         </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* 🚀 الهيدر والتبويبات */}
        <div className="bg-white rounded-[2rem] p-6 sm:p-10 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
           <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-amber-500/5 to-fuchsia-500/5 blur-3xl pointer-events-none rounded-full"></div>
           <div className="relative z-10">
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 flex items-center gap-4 mb-2 tracking-tight">
                 <div className="p-3 bg-slate-900 text-amber-400 rounded-2xl shadow-inner border border-slate-800"><Medal className="w-8 h-8" /></div> 
                 الاستوديو الملكي للدروع
              </h1>
              <p className="text-slate-500 font-bold text-sm max-w-xl leading-relaxed">صمم دروعاً رقمية أو ارفع تصميماً احترافياً من خارج المنصة، وأرسلها للمتميزين لتتويج جهودهم.</p>
           </div>
           <div className="flex bg-slate-100/80 p-1.5 rounded-2xl relative z-10 shrink-0 border border-slate-200 shadow-inner">
              <button onClick={() => {setActiveTab('students'); setSelectedUser(null); setShieldType('gold');}} className={`px-6 py-3.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'students' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}><GraduationCap className="w-5 h-5"/> قطاع الطلاب</button>
              <button onClick={() => {setActiveTab('teachers'); setSelectedUser(null); setShieldType('royal');}} className={`px-6 py-3.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'teachers' ? 'bg-slate-900 text-amber-400 shadow-sm border border-slate-800' : 'text-slate-500 hover:text-slate-700'}`}><UserCircle className="w-5 h-5"/> قطاع المعلمين</button>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
           
           {/* 🎛️ قسم الإعدادات والاختيار */}
           <div className="lg:col-span-6 xl:col-span-7 space-y-6 flex flex-col">
              
              <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200">
                 <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm border border-indigo-200">1</span>
                    حدد المُكرَّم ({activeTab === 'students' ? 'طالب' : 'معلم'})
                 </h2>
                 <div className="relative mb-4">
                    <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="text" placeholder={`ابحث بالاسم...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-4 pr-14 pl-4 font-black text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-colors shadow-inner" />
                 </div>
                 <div className="max-h-[180px] overflow-y-auto custom-scrollbar space-y-2 pr-2">
                    {filteredList.map(u => (
                       <div key={u.id} onClick={() => setSelectedUser(u)} className={`p-4 rounded-2xl flex items-center gap-4 cursor-pointer transition-all border-2 ${selectedUser?.id === u.id ? 'bg-indigo-50 border-indigo-500 shadow-md' : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50'}`}>
                          <div className={`w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 ${selectedUser?.id === u.id ? 'border-indigo-500' : 'border-slate-200'}`}>
                             {u.avatar ? <img src={u.avatar} crossOrigin="anonymous" className="w-full h-full object-cover"/> : <UserCircle className="w-full h-full text-slate-400 bg-slate-100 p-1"/>}
                          </div>
                          <div>
                             <p className="text-base font-black text-slate-800 leading-tight">{u.name}</p>
                             <p className="text-[11px] font-bold text-slate-500 mt-1 bg-slate-100 px-2 py-0.5 rounded w-fit border border-slate-200">{u.info}</p>
                          </div>
                          {selectedUser?.id === u.id && <CheckCircle2 className="w-6 h-6 text-indigo-600 mr-auto"/>}
                       </div>
                    ))}
                    {filteredList.length === 0 && <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200"><p className="text-sm font-bold text-slate-400">لا توجد نتائج.</p></div>}
                 </div>
              </div>

              {/* 🚀 خيارات الصناعة */}
              <div className={`bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200 flex-1 flex flex-col transition-opacity duration-300 ${selectedUser ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-slate-100 pb-4">
                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                       <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm border border-indigo-200">2</span>
                       طريقة التصميم
                    </h2>
                    <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                       <button onClick={() => setCreationMode('build')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-black text-xs transition-all ${creationMode === 'build' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>بناء 3D ذكي</button>
                       <button onClick={() => setCreationMode('upload')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-black text-xs transition-all ${creationMode === 'upload' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>رفع صورة درع جاهز</button>
                    </div>
                 </div>
                 
                 {creationMode === 'build' ? (
                    <div className="space-y-6 flex-1 flex flex-col">
                       <div>
                          <div className="flex justify-between items-center mb-2">
                             <label className="text-xs font-black text-slate-500 uppercase tracking-widest">نوع ولون الدرع (3D):</label>
                             <button onClick={() => logoInputRef.current?.click()} className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-indigo-100 border border-indigo-100 transition-colors">
                                <ImagePlus className="w-3 h-3" /> {customLogoUrl ? 'تغيير الشعار المخصص' : 'رفع شعار مخصص للدرع'}
                             </button>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                             {Object.values(shieldThemes).map(theme => (
                                <button 
                                   key={theme.id} 
                                   onClick={() => setShieldType(theme.id)} 
                                   className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all active:scale-95 ${shieldType === theme.id ? `border-indigo-500 bg-indigo-50 shadow-md` : `border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-300`}`}
                                >
                                   <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${theme.border} shadow-inner`}></div>
                                   <span className={`text-[10px] font-black ${shieldType === theme.id ? 'text-indigo-700' : 'text-slate-600'}`}>{theme.name}</span>
                                </button>
                             ))}
                          </div>
                          {customLogoUrl && (
                             <div className="mt-3 flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <p className="text-[10px] font-bold text-slate-500">تم تركيب شعار مخصص بنجاح.</p>
                                <button onClick={() => setCustomLogoUrl(null)} className="text-rose-500 hover:bg-rose-100 p-1.5 rounded-lg"><X className="w-4 h-4"/></button>
                             </div>
                          )}
                       </div>

                       <div className="space-y-4 flex-1">
                          <div>
                             <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">العنوان المنقوش على الدرع:</label>
                             <input type="text" placeholder="مثال: درع التفوق العلمي / درع المعلم المتميز" value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3.5 font-black text-sm outline-none focus:border-indigo-500 focus:bg-white transition-colors shadow-inner" />
                          </div>
                          <div>
                             <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">رسالة الشكر أو التهنئة:</label>
                             <textarea placeholder="اكتب هنا كلماتك الموجهة له والتي ستظهر أسفل الدرع..." value={message} onChange={e=>setMessage(e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-4 font-bold text-sm outline-none focus:border-indigo-500 focus:bg-white transition-colors h-28 resize-none custom-scrollbar shadow-inner" />
                          </div>
                       </div>
                    </div>
                 ) : (
                    <div className="flex-1 flex flex-col justify-center">
                       {externalShieldUrl ? (
                          <div className="relative rounded-2xl overflow-hidden border-2 border-indigo-200 shadow-inner bg-slate-100 flex items-center justify-center p-2 group">
                             <img src={externalShieldUrl} alt="External Shield" className="max-h-60 object-contain rounded-xl" />
                             <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                <button onClick={() => externalInputRef.current?.click()} className="bg-white text-slate-900 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 hover:bg-slate-200"><UploadCloud className="w-4 h-4"/> تغيير التصميم</button>
                             </div>
                          </div>
                       ) : (
                          <div onClick={() => externalInputRef.current?.click()} className="w-full h-48 border-2 border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors group">
                             <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm text-indigo-500 group-hover:scale-110 transition-transform"><ImagePlus className="w-8 h-8"/></div>
                             <p className="font-black text-indigo-900 text-sm">اضغط هنا لرفع تصميم درع جاهز</p>
                             <p className="text-[10px] font-bold text-indigo-500/70 mt-1">يدعم JPG و PNG بدقة عالية</p>
                          </div>
                       )}
                    </div>
                 )}

                 <button onClick={handleSaveShield} disabled={isSubmitting || !selectedUser || (creationMode === 'build' ? (!title || !message) : !externalShieldUrl)} className="w-full mt-6 py-5 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white font-black text-lg rounded-2xl hover:from-indigo-700 hover:to-indigo-900 disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/30 active:scale-95">
                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Send className="w-6 h-6"/> إرسال واعتماد التتويج الرقمي</>}
                 </button>
              </div>
           </div>

           {/* 🖼️ غرفة العرض السينمائية */}
           <div className="lg:col-span-6 xl:col-span-5 bg-[#0a0a0c] rounded-[2.5rem] p-6 sm:p-10 relative overflow-hidden shadow-2xl min-h-[600px] flex items-center justify-center border border-slate-800">
              <div className={cn("absolute inset-0 transition-colors duration-1000", creationMode === 'build' ? activeTheme.glow : 'bg-indigo-500/10')}></div>
              <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\'%3E%3Cg fill=\\'%23ffffff\\' fill-opacity=\\'0.02\\'%3E%3Cpath d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
              
              <AnimatePresence mode="wait">
                 {creationMode === 'build' ? (
                   <motion.div 
                     key="build-mode"
                     initial={{ opacity: 0, scale: 0.8, rotateY: -15 }}
                     animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                     exit={{ opacity: 0, scale: 0.8, rotateY: 15 }}
                     transition={{ type: "spring", stiffness: 100, damping: 15 }}
                     style={{ perspective: 1000 }}
                     className="w-full max-w-[340px] relative z-10"
                   >
                      <div className={cn("relative p-1 rounded-t-[3rem] rounded-b-[5rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden bg-gradient-to-br", activeTheme.border)}>
                         <div className="absolute top-0 bottom-0 left-[-100%] w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent transform -skew-x-12 animate-shine z-20 pointer-events-none"></div>

                         <div className={cn("relative rounded-t-[2.8rem] rounded-b-[4.8rem] h-full w-full p-8 flex flex-col items-center text-center overflow-hidden border-2 border-white/5", activeTheme.bgInner)}>
                            <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-t-[2.8rem]"></div>

                            <div className="mt-4 mb-6 relative w-20 h-20 flex items-center justify-center">
                               <div className={cn("absolute inset-0 blur-2xl rounded-full", activeTheme.glow)}></div>
                               <div className="relative z-10 w-full h-full rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-inner flex items-center justify-center p-2 overflow-hidden">
                                  {customLogoUrl ? <img src={customLogoUrl} className="w-full h-full object-contain drop-shadow-md" alt="Custom Logo" /> : activeTheme.icon}
                               </div>
                            </div>
                            
                            <h3 className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-3 border-b border-white/10 pb-2 px-6">مدرسة الرفعة النموذجية</h3>
                            <h2 className={cn("text-2xl font-black leading-tight mb-6 drop-shadow-lg", activeTheme.textPrimary)}>{title || 'اكتب عنوان الدرع'}</h2>

                            <div className={cn("w-20 h-20 rounded-full overflow-hidden border-2 p-0.5 shadow-[0_0_20px_rgba(0,0,0,0.5)] mx-auto mb-4 bg-gradient-to-br", activeTheme.border)}>
                               <div className="w-full h-full rounded-full overflow-hidden bg-[#111]">
                                  {selectedUser?.avatar ? <img src={selectedUser.avatar} crossOrigin="anonymous" className="w-full h-full object-cover"/> : <UserCircle className="w-full h-full text-white/20 p-2"/>}
                               </div>
                            </div>
                            <p className={cn("text-xl font-black truncate w-full drop-shadow-md", activeTheme.textPrimary)}>{selectedUser?.name || 'اسم المُكرَّم هنا'}</p>
                            <p className={cn("text-[11px] font-bold mt-1.5 px-3 py-1 rounded-md border border-white/10 bg-white/5 inline-block", activeTheme.textSecondary)}>{selectedUser?.info || 'وصف الفئة / المادة'}</p>

                            <div className="mt-8 pt-5 w-full border-t border-white/10 relative z-10">
                               <p className={cn("text-xs font-bold leading-relaxed line-clamp-4", activeTheme.textSecondary)}>{message || 'تكتب هنا كلماتك الصادقة ورسالة التهنئة التي ستظهر أسفل هذا الدرع الفاخر.'}</p>
                            </div>
                            
                            <div className="mt-6 w-full flex justify-end">
                               <div className="text-left">
                                  <p className="text-[8px] text-white/30 font-bold mb-1">مدير المدرسة</p>
                                  <p className={cn("text-[10px] font-black signature-font opacity-80", activeTheme.textPrimary)}>أ. صالح مخلد المطيري</p>
                               </div>
                            </div>
                         </div>
                      </div>
                   </motion.div>
                 ) : (
                   <motion.div 
                     key="upload-mode"
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -20 }}
                     className="w-full relative z-10 flex flex-col items-center"
                   >
                      {externalShieldUrl ? (
                         <div className="relative group">
                            <div className="absolute -inset-4 bg-indigo-500/20 blur-2xl rounded-full pointer-events-none"></div>
                            <img src={externalShieldUrl} alt="Preview" className="relative z-10 w-full max-w-[350px] max-h-[500px] object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]" />
                         </div>
                      ) : (
                         <div className="text-center text-white/30">
                            <Shield className="w-24 h-24 mx-auto mb-4 opacity-50" />
                            <p className="font-black text-xl mb-2">استوديو العرض</p>
                            <p className="text-xs font-bold">ارفع التصميم الخارجي لتراه هنا قبل إرساله.</p>
                         </div>
                      )}
                   </motion.div>
                 )}
              </AnimatePresence>
              <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
           </div>
        </div>

        {/* 🚀 قسم إدارة وحذف الدروع المُصدرة */}
        <div className="bg-white rounded-[2rem] p-6 sm:p-10 border border-slate-200 shadow-sm mt-8">
           <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                 <History className="w-6 h-6 text-indigo-500" /> سجل الدروع المُصدرة (إدارة وحذف)
              </h2>
           </div>
           
           <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-right border-collapse min-w-[700px]">
                 <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                    <tr>
                       <th className="p-4 rounded-r-xl border-b border-slate-100">اسم المُكرَّم</th>
                       <th className="p-4 border-b border-slate-100">الفئة</th>
                       <th className="p-4 border-b border-slate-100">عنوان الدرع</th>
                       <th className="p-4 border-b border-slate-100">التاريخ</th>
                       <th className="p-4 rounded-l-xl border-b border-slate-100 text-center w-24">إجراء</th>
                    </tr>
                 </thead>
                 <tbody>
                    {recentShields.map((shield) => {
                       const isStudent = shield.role === 'student';
                       return (
                          <tr key={shield.id} className="hover:bg-slate-50/80 transition-colors group border-b last:border-0 border-slate-50">
                             <td className="p-4">
                                <p className="font-black text-slate-800 text-sm leading-tight">{shield.personName}</p>
                             </td>
                             <td className="p-4">
                                <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1", isStudent ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-amber-50 text-amber-600 border-amber-100')}>
                                   {isStudent ? <GraduationCap className="w-3 h-3"/> : <UserCircle className="w-3 h-3"/>}
                                   {isStudent ? 'طالب' : 'معلم'}
                                </span>
                             </td>
                             <td className="p-4">
                                <p className="font-bold text-slate-600 text-xs truncate max-w-[200px]">{shield.title}</p>
                             </td>
                             <td className="p-4">
                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                   <Clock className="w-3 h-3"/> {format(new Date(shield.created_at), 'd MMM yyyy')}
                                </span>
                             </td>
                             <td className="p-4 text-center">
                                <button onClick={() => handleDeleteShield(shield.id, shield.role, shield.personName)} disabled={isDeleting} className="p-2.5 text-rose-400 bg-white hover:bg-rose-500 hover:text-white rounded-xl transition-all border border-rose-100 shadow-sm active:scale-90 disabled:opacity-50" title="حذف الدرع نهائياً">
                                   <Trash2 className="w-4 h-4"/>
                                </button>
                             </td>
                          </tr>
                       );
                    })}
                    {recentShields.length === 0 && (
                       <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400 font-bold bg-slate-50/50 rounded-xl border border-dashed border-slate-200 mt-2">لا توجد دروع مُصدرة بعد.</td>
                       </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>

      </div>
    </div>
  );
}
