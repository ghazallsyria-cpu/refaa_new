// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { Search, CheckCircle2, Shield, Loader2, UserCircle, GraduationCap, Crown, Sparkles, Send, Award, Medal, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function MemorialShieldsMaker() {
  const { authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'students' | 'teachers'>('students');
  
  // البيانات الأساسية
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // بيانات النموذج الحالي
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [shieldType, setShieldType] = useState('gold');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (['admin', 'management'].includes(currentRole)) fetchData();
  }, [currentRole]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: stdData } = await supabase.from('students').select('id, users(full_name, avatar_url), sections(name, classes(name))');
      const { data: tchData } = await supabase.from('teachers').select('id, users(full_name, avatar_url), teacher_subjects(subjects(name))');
      
      const formattedStudents = (stdData || []).map(s => {
         const u = Array.isArray(s.users) ? s.users[0] : s.users;
         const cName = Array.isArray(s.sections?.classes) ? s.sections.classes[0]?.name : s.sections?.classes?.name;
         return { id: s.id, name: u?.full_name || 'بدون اسم', avatar: u?.avatar_url, info: `${cName || ''} - ${s.sections?.name || ''}` };
      });

      const formattedTeachers = (tchData || []).map(t => {
         const u = Array.isArray(t.users) ? t.users[0] : t.users;
         const subj = Array.isArray(t.teacher_subjects) ? t.teacher_subjects.map(ts=>ts.subjects?.name).join('، ') : '';
         return { id: t.id, name: u?.full_name || 'بدون اسم', avatar: u?.avatar_url, info: subj || 'الهيئة التعليمية' };
      });

      setStudents(formattedStudents);
      setTeachers(formattedTeachers);
    } catch(e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const handleSaveShield = async () => {
    if (!selectedUser || !title.trim() || !message.trim()) {
       alert('يرجى اختيار المُكرَّم وكتابة العنوان والرسالة!'); return;
    }
    setIsSubmitting(true);
    try {
       if (activeTab === 'students') {
          await supabase.from('student_memorials').insert({
             student_id: selectedUser.id, shield_type: shieldType, title: title.trim(), message: message.trim()
          });
       } else {
          await supabase.from('teacher_memorials').insert({
             teacher_id: selectedUser.id, shield_type: shieldType, title: title.trim(), message: message.trim()
          });
       }
       alert('تم صياغة الدرع وإرساله بنجاح! سيظهر للشخص كاحتفال مفاجئ فور دخوله لحسابه. 🎇');
       setSelectedUser(null); setTitle(''); setMessage(''); setSearchTerm('');
    } catch(e) { alert('حدث خطأ أثناء حفظ الدرع'); }
    finally { setIsSubmitting(false); }
  };

  const currentList = activeTab === 'students' ? students : teachers;
  const filteredList = currentList.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 12);

  // 🎨 القاموس البصري الاحترافي لكل نوع من أنواع الدروع
  const shieldThemes = {
     gold: {
         id: 'gold', name: 'التفوق (ذهبي)',
         border: 'from-amber-300 via-yellow-500 to-amber-700',
         glow: 'bg-amber-500/20',
         bgInner: 'bg-gradient-to-b from-[#1a150e] to-[#0a0805]',
         textPrimary: 'text-amber-400',
         textSecondary: 'text-amber-200/70',
         icon: <Award className="w-12 h-12 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
     },
     silver: {
         id: 'silver', name: 'القيادة (فضي)',
         border: 'from-slate-300 via-slate-100 to-slate-400',
         glow: 'bg-slate-400/20',
         bgInner: 'bg-gradient-to-b from-[#1e222a] to-[#0f1115]',
         textPrimary: 'text-slate-200',
         textSecondary: 'text-slate-400',
         icon: <Shield className="w-12 h-12 text-slate-300 drop-shadow-[0_0_15px_rgba(203,213,225,0.5)]" />
     },
     diamond: {
         id: 'diamond', name: 'الخريجين (ماسي)',
         border: 'from-cyan-300 via-blue-500 to-indigo-600',
         glow: 'bg-cyan-500/20',
         bgInner: 'bg-gradient-to-b from-[#0e1726] to-[#020617]',
         textPrimary: 'text-cyan-400',
         textSecondary: 'text-cyan-200/70',
         icon: <Sparkles className="w-12 h-12 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
     },
     royal: {
         id: 'royal', name: 'ملكي (للمعلمين)',
         border: 'from-amber-600 via-yellow-500 to-yellow-700',
         glow: 'bg-amber-900/30',
         bgInner: 'bg-[#050505]',
         textPrimary: 'text-amber-500',
         textSecondary: 'text-amber-500/60',
         icon: <Crown className="w-12 h-12 text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
     },
  };
  
  const activeTheme = shieldThemes[shieldType as keyof typeof shieldThemes];

  if (!['admin', 'management'].includes(currentRole)) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-cairo text-slate-800 pb-32" dir="rtl">
      
      {/* 🚀 ستايل تأثير اللمعة المتحركة */}
      <style dangerouslySetContent={{__html: `
        @keyframes shine {
          0% { transform: translateX(-200%) skewX(-30deg); }
          100% { transform: translateX(200%) skewX(-30deg); }
        }
        .animate-shine { animation: shine 4s infinite cubic-bezier(0.4, 0, 0.2, 1); }
      `}} />

      {isLoading && (
        <div className="fixed inset-0 bg-white/80 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4"><Loader2 className="w-12 h-12 animate-spin text-indigo-600" /><p className="font-black text-indigo-900">تجهيز الاستوديو...</p></div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* 🚀 الهيدر الجديد */}
        <div className="bg-white rounded-[2rem] p-6 sm:p-10 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
           <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-amber-500/5 to-fuchsia-500/5 blur-3xl pointer-events-none rounded-full"></div>
           <div className="relative z-10">
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 flex items-center gap-4 mb-2 tracking-tight">
                 <div className="p-3 bg-slate-900 text-amber-400 rounded-2xl shadow-inner border border-slate-800"><Medal className="w-8 h-8" /></div> 
                 الاستوديو الملكي للدروع
              </h1>
              <p className="text-slate-500 font-bold text-sm max-w-xl leading-relaxed">صمم دروعاً رقمية فخمة ثلاثية الأبعاد، وأرسلها لحسابات الخريجين والمتميزين لتخليد إنجازاتهم في منصة مدرسة الرفعة.</p>
           </div>
           <div className="flex bg-slate-100/80 p-1.5 rounded-2xl relative z-10 shrink-0 border border-slate-200 shadow-inner">
              <button onClick={() => {setActiveTab('students'); setSelectedUser(null); setShieldType('gold');}} className={`px-6 py-3.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'students' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}><GraduationCap className="w-5 h-5"/> قطاع الطلاب</button>
              <button onClick={() => {setActiveTab('teachers'); setSelectedUser(null); setShieldType('royal');}} className={`px-6 py-3.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'teachers' ? 'bg-slate-900 text-amber-400 shadow-sm border border-slate-800' : 'text-slate-500 hover:text-slate-700'}`}><UserCircle className="w-5 h-5"/> قطاع المعلمين</button>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
           
           {/* 🎛️ قسم الإعدادات (Control Panel) */}
           <div className="lg:col-span-6 xl:col-span-7 space-y-6 flex flex-col">
              
              {/* الخطوة 1: البحث */}
              <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200">
                 <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                       <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm border border-indigo-200">1</span>
                       حدد المُكرَّم ({activeTab === 'students' ? 'طالب' : 'معلم'})
                    </h2>
                 </div>
                 
                 <div className="relative mb-4">
                    <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="text" placeholder={`ابحث عن ${activeTab === 'students' ? 'طالب' : 'معلم'} بالاسم...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-4 pr-14 pl-4 font-black text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-colors shadow-inner" />
                 </div>
                 
                 <div className="max-h-[220px] overflow-y-auto custom-scrollbar space-y-2 pr-2">
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
                    {filteredList.length === 0 && <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200"><p className="text-sm font-bold text-slate-400">لا توجد نتائج مطابقة للبحث.</p></div>}
                 </div>
              </div>

              {/* الخطوة 2: التصميم */}
              <div className={`bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200 flex-1 flex flex-col transition-opacity duration-300 ${selectedUser ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                 <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm border border-indigo-200">2</span>
                    تخصيص الدرع والرسالة
                 </h2>
                 
                 <div className="mb-8">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 block">اختر الفئة المعدنية:</label>
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
                 </div>

                 <div className="space-y-5 flex-1">
                    <div>
                       <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">العنوان المنقوش على الدرع:</label>
                       <input type="text" placeholder={activeTab === 'students' ? "مثال: درع التفوق العلمي / درع القيادة" : "مثال: درع المعلم المتميز / وسام الإبداع"} value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3.5 font-black text-sm outline-none focus:border-indigo-500 focus:bg-white transition-colors shadow-inner" />
                    </div>
                    <div>
                       <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">رسالة الشكر أو التهنئة:</label>
                       <textarea placeholder="اكتب هنا كلماتك الموجهة له والتي ستظهر أسفل الدرع..." value={message} onChange={e=>setMessage(e.target.value)} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-4 font-bold text-sm outline-none focus:border-indigo-500 focus:bg-white transition-colors h-32 resize-none custom-scrollbar shadow-inner" />
                    </div>
                 </div>

                 <button onClick={handleSaveShield} disabled={isSubmitting || !selectedUser || !title || !message} className="w-full mt-8 py-5 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white font-black text-lg rounded-2xl hover:from-indigo-700 hover:to-indigo-900 disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/30 active:scale-95">
                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Send className="w-6 h-6"/> اعتماد وصناعة الدرع الرقمي</>}
                 </button>
              </div>
           </div>

           {/* 🖼️ غرفة العرض السينمائية (The Cinematic Studio) */}
           <div className="lg:col-span-6 xl:col-span-5 bg-[#0a0a0c] rounded-[2.5rem] p-6 sm:p-10 relative overflow-hidden shadow-2xl min-h-[600px] flex items-center justify-center border border-slate-800">
              
              {/* إضاءة الاستوديو الخلفية تتغير حسب لون الدرع */}
              <div className={cn("absolute inset-0 transition-colors duration-1000", activeTheme.glow)}></div>
              
              {/* زخارف الشبك الخلفي */}
              <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\'%3E%3Cg fill=\\'%23ffffff\\' fill-opacity=\\'0.02\\'%3E%3Cpath d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
              
              <AnimatePresence mode="wait">
                 <motion.div 
                   key={shieldType}
                   initial={{ opacity: 0, scale: 0.8, rotateY: -15 }}
                   animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                   exit={{ opacity: 0, scale: 0.8, rotateY: 15 }}
                   transition={{ type: "spring", stiffness: 100, damping: 15 }}
                   style={{ perspective: 1000 }}
                   className="w-full max-w-[340px] relative z-10"
                 >
                    {/* 🚀 الحواف المعدنية للدرع */}
                    <div className={cn("relative p-1 rounded-t-[3rem] rounded-b-[5rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden bg-gradient-to-br", activeTheme.border)}>
                       
                       {/* تأثير اللمعة المتحركة (Shine Effect) */}
                       <div className="absolute top-0 bottom-0 left-[-100%] w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent transform -skew-x-12 animate-shine z-20 pointer-events-none"></div>

                       {/* 🚀 الزجاج الداخلي (Inner Glassmorphism) */}
                       <div className={cn("relative rounded-t-[2.8rem] rounded-b-[4.8rem] h-full w-full p-8 flex flex-col items-center text-center overflow-hidden border-2 border-white/5", activeTheme.bgInner)}>
                          
                          {/* تأثير انعكاس الضوء العلوي */}
                          <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-t-[2.8rem]"></div>

                          {/* الأيقونة العلوية */}
                          <div className="mt-4 mb-6 relative">
                             <div className={cn("absolute inset-0 blur-2xl rounded-full", activeTheme.glow)}></div>
                             <div className="relative z-10 p-4 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-inner">
                                {activeTheme.icon}
                             </div>
                          </div>
                          
                          {/* اسم المدرسة */}
                          <h3 className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-3 border-b border-white/10 pb-2 px-6">مدرسة الرفعة النموذجية</h3>
                          
                          {/* العنوان (Title) */}
                          <h2 className={cn("text-2xl font-black leading-tight mb-6 drop-shadow-lg", activeTheme.textPrimary)}>
                             {title || 'اكتب عنوان الدرع'}
                          </h2>

                          {/* صورة واسم المُكرَّم */}
                          <div className={cn("w-20 h-20 rounded-full overflow-hidden border-2 p-0.5 shadow-[0_0_20px_rgba(0,0,0,0.5)] mx-auto mb-4 bg-gradient-to-br", activeTheme.border)}>
                             <div className="w-full h-full rounded-full overflow-hidden bg-[#111]">
                                {selectedUser?.avatar ? <img src={selectedUser.avatar} crossOrigin="anonymous" className="w-full h-full object-cover"/> : <UserCircle className="w-full h-full text-white/20 p-2"/>}
                             </div>
                          </div>
                          <p className={cn("text-xl font-black truncate w-full drop-shadow-md", activeTheme.textPrimary)}>
                             {selectedUser?.name || 'اسم المُكرَّم هنا'}
                          </p>
                          <p className={cn("text-[11px] font-bold mt-1.5 px-3 py-1 rounded-md border border-white/10 bg-white/5 inline-block", activeTheme.textSecondary)}>
                             {selectedUser?.info || 'وصف الفئة / المادة'}
                          </p>

                          {/* مساحة الرسالة السفلية */}
                          <div className="mt-8 pt-5 w-full border-t border-white/10 relative z-10">
                             <p className={cn("text-xs font-bold leading-relaxed line-clamp-4", activeTheme.textSecondary)}>
                                {message || 'تكتب هنا كلماتك الصادقة ورسالة التهنئة التي ستظهر أسفل هذا الدرع الفاخر.'}
                             </p>
                          </div>
                          
                          {/* توقيع الإدارة */}
                          <div className="mt-6 w-full flex justify-end">
                             <div className="text-left">
                                <p className="text-[8px] text-white/30 font-bold mb-1">مدير المدرسة</p>
                                <p className={cn("text-[10px] font-black signature-font opacity-80", activeTheme.textPrimary)}>أ. صالح مخلف المطيري</p>
                             </div>
                          </div>

                       </div>
                    </div>
                 </motion.div>
              </AnimatePresence>

              {/* تأثير الدخان السطحي أسفل الدرع */}
              <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
           </div>
        </div>
      </div>
    </div>
  );
}
