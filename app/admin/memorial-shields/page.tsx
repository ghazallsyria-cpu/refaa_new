// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { Award, Search, CheckCircle2, Shield, Loader2, UserCircle, GraduationCap, Crown, Sparkles, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { motion, AnimatePresence } from 'framer-motion';

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
         const subj = Array.isArray(t.teacher_subjects) ? t.teacher_subjects.map(ts=>ts.subjects?.name).join(', ') : '';
         return { id: t.id, name: u?.full_name || 'بدون اسم', avatar: u?.avatar_url, info: subj || 'معلم' };
      });

      setStudents(formattedStudents);
      setTeachers(formattedTeachers);
    } catch(e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const handleSaveShield = async () => {
    if (!selectedUser || !title.trim() || !message.trim()) {
       alert('يرجى اختيار الشخص وكتابة العنوان والرسالة!'); return;
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
       alert('تم إرسال الدرع التذكاري بنجاح! سيظهر للشخص فور دخوله لحسابه. 🎇');
       setSelectedUser(null); setTitle(''); setMessage('');
    } catch(e) { alert('حدث خطأ أثناء حفظ الدرع'); }
    finally { setIsSubmitting(false); }
  };

  const currentList = activeTab === 'students' ? students : teachers;
  const filteredList = currentList.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 15);

  // 🎨 إعدادات ألوان وأنماط الدروع
  const shieldStyles = {
     gold: { bg: 'bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600', text: 'text-amber-900', border: 'border-amber-200', icon: <Award className="w-12 h-12 text-amber-800"/> },
     silver: { bg: 'bg-gradient-to-br from-slate-200 via-slate-300 to-slate-500', text: 'text-slate-800', border: 'border-slate-300', icon: <Shield className="w-12 h-12 text-slate-700"/> },
     diamond: { bg: 'bg-gradient-to-br from-cyan-100 via-blue-300 to-indigo-500', text: 'text-slate-900', border: 'border-cyan-200', icon: <Sparkles className="w-12 h-12 text-white"/> },
     royal: { bg: 'bg-gradient-to-br from-slate-900 via-slate-800 to-black', text: 'text-amber-400', border: 'border-amber-500/50', icon: <Crown className="w-12 h-12 text-amber-400"/> },
  };
  const activeStyle = shieldStyles[shieldType as keyof typeof shieldStyles] || shieldStyles.gold;

  if (!['admin', 'management'].includes(currentRole)) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-cairo text-slate-800 pb-32" dir="rtl">
      {isLoading && (
        <div className="fixed inset-0 bg-white/80 z-[100] flex items-center justify-center backdrop-blur-sm">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="bg-white rounded-[2rem] p-6 sm:p-10 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col sm:flex-row justify-between items-center gap-6">
           <div className="absolute -left-10 -top-10 text-amber-500/10 pointer-events-none"><Award className="w-64 h-64" /></div>
           <div className="relative z-10">
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                 <Award className="w-8 h-8 text-amber-500" /> مصنع دروع الرفعة التذكارية
              </h1>
              <p className="text-slate-500 font-bold text-sm mt-2">اصنع دروعاً رقمية وابعثها لحسابات الخريجين والمتميزين لتتويج جهودهم.</p>
           </div>
           <div className="flex bg-slate-100 p-1.5 rounded-2xl relative z-10 shrink-0">
              <button onClick={() => {setActiveTab('students'); setSelectedUser(null); setShieldType('gold');}} className={`px-6 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'students' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><GraduationCap className="w-4 h-4"/> للطلاب</button>
              <button onClick={() => {setActiveTab('teachers'); setSelectedUser(null); setShieldType('royal');}} className={`px-6 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'teachers' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><UserCircle className="w-4 h-4"/> للمعلمين</button>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           
           {/* 🎛️ قسم الإعدادات والاختيار */}
           <div className="lg:col-span-7 space-y-6">
              <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200">
                 <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">1. حدد المُكرَّم ({activeTab === 'students' ? 'طالب' : 'معلم'})</h2>
                 <div className="relative mb-4">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="text" placeholder="ابحث بالاسم..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pr-12 pl-4 font-bold outline-none focus:border-indigo-500" />
                 </div>
                 
                 <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
                    {filteredList.map(u => (
                       <div key={u.id} onClick={() => setSelectedUser(u)} className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all border ${selectedUser?.id === u.id ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-transparent hover:border-slate-300 shadow-sm'}`}>
                          <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                             {u.avatar ? <img src={u.avatar} crossOrigin="anonymous" className="w-full h-full object-cover"/> : <UserCircle className="w-full h-full text-slate-400 p-1"/>}
                          </div>
                          <div>
                             <p className="text-sm font-black text-slate-800">{u.name}</p>
                             <p className="text-[10px] font-bold text-slate-500 mt-0.5">{u.info}</p>
                          </div>
                          {selectedUser?.id === u.id && <CheckCircle2 className="w-5 h-5 text-indigo-600 mr-auto"/>}
                       </div>
                    ))}
                    {filteredList.length === 0 && <p className="text-center text-xs font-bold text-slate-400 py-6">لا توجد نتائج</p>}
                 </div>
              </div>

              <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200 opacity-100 transition-opacity">
                 <h2 className="text-lg font-black text-slate-800 mb-6">2. تصميم الدرع والرسالة</h2>
                 
                 <div className="mb-6">
                    <label className="text-xs font-bold text-slate-500 mb-2 block">نوع ولون الدرع:</label>
                    <div className="flex gap-3">
                       <button onClick={() => setShieldType('gold')} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all border-2 ${shieldType === 'gold' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>التفوق (ذهبي)</button>
                       <button onClick={() => setShieldType('silver')} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all border-2 ${shieldType === 'silver' ? 'border-slate-400 bg-slate-100 text-slate-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>القيادة (فضي)</button>
                       <button onClick={() => setShieldType('diamond')} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all border-2 ${shieldType === 'diamond' ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>الخريجين (ماسي)</button>
                       <button onClick={() => setShieldType('royal')} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all border-2 ${shieldType === 'royal' ? 'border-slate-800 bg-slate-900 text-amber-400' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>ملكي (للمعلمين)</button>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div>
                       <label className="text-xs font-bold text-slate-500 mb-2 block">العنوان العريض على الدرع:</label>
                       <input type="text" placeholder="مثال: درع التفوق العلمي / درع المعلم المتميز" value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-black text-sm outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                       <label className="text-xs font-bold text-slate-500 mb-2 block">رسالة التهنئة / الشكر:</label>
                       <textarea placeholder="اكتب مشاعرك وكلماتك الموجهة له هنا..." value={message} onChange={e=>setMessage(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-indigo-500 h-28 resize-none custom-scrollbar" />
                    </div>
                 </div>

                 <button onClick={handleSaveShield} disabled={isSubmitting || !selectedUser || !title || !message} className="w-full mt-6 py-4 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5"/> اعتماد وإرسال الدرع للمُكرَّم</>}
                 </button>
              </div>
           </div>

           {/* 🖼️ قسم المعاينة الحية (الدرع) */}
           <div className="lg:col-span-5 flex items-center justify-center bg-slate-900 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl min-h-[500px]">
              {/* زخارف الخلفية */}
              <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\\'40\\' height=\\'40\\' viewBox=\\'0 0 40 40\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'%23ffffff\\' fill-opacity=\\'0.03\\' fill-rule=\\'evenodd\\'%3E%3Cpath d=\\'M0 40L40 0H20L0 20M40 40V20L20 40\\'/%3E%3C/g%3E%3C/svg%3E')]"></div>
              
              <AnimatePresence mode="wait">
                 <motion.div 
                   key={shieldType}
                   initial={{ opacity: 0, scale: 0.8, y: 20 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.8, y: -20 }}
                   transition={{ type: "spring", bounce: 0.4 }}
                   className={cn("relative w-full max-w-[320px] aspect-[3/4] p-1 rounded-t-full rounded-b-[4rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/20 flex flex-col", activeStyle.bg)}
                 >
                    {/* لمعة زجاجية للدرع */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 rounded-t-full rounded-b-[4rem] pointer-events-none"></div>
                    
                    <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-t-full rounded-b-[3.8rem] m-2 p-6 flex flex-col items-center text-center border border-white/20 relative z-10">
                       <div className="mt-8 mb-4 p-4 rounded-full bg-white/20 shadow-inner backdrop-blur-md">
                          {activeStyle.icon}
                       </div>
                       
                       <h3 className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2 border-b border-current pb-2 px-4 inline-block">مدرسة الرفعة النموذجية</h3>
                       
                       <h2 className={cn("text-2xl font-black leading-tight mb-4 drop-shadow-md", activeStyle.text)}>
                          {title || 'اكتب عنوان الدرع هنا'}
                       </h2>

                       <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-current shadow-lg mx-auto mb-3">
                          {selectedUser?.avatar ? <img src={selectedUser.avatar} crossOrigin="anonymous" className="w-full h-full object-cover"/> : <UserCircle className="w-full h-full opacity-50 p-2"/>}
                       </div>
                       <p className={cn("text-lg font-black truncate w-full", activeStyle.text)}>{selectedUser?.name || 'اسم المُكرَّم'}</p>
                       <p className="text-[10px] font-bold opacity-80 mt-1">{selectedUser?.info || '---'}</p>

                       <div className="mt-auto pt-4 relative w-full">
                          <p className="text-xs font-bold leading-relaxed opacity-90 line-clamp-3">
                             {message || 'تكتب هنا رسالة التهنئة أو الشكر التي ستظهر للمُكرَّم أسفل الدرع.'}
                          </p>
                       </div>
                    </div>
                 </motion.div>
              </AnimatePresence>
           </div>
        </div>
      </div>
    </div>
  );
}
