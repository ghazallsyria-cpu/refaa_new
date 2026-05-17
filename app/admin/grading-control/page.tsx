// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, Activity, CheckCircle2, Clock, Loader2, Power, AlertCircle, RefreshCw, Megaphone, Eye, EyeOff, Image as ImageIcon, X, Filter, Unlock, Star, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function GradingControlPage() {
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const [settings, setSettings] = useState({
    id: 1, 
    p1_cw_active: false, p1_ex_active: false, p2_cw_active: true, p2_ex_active: false,
    cta_visible: true, cta_message: '', cta_image_url: '',
    g10_active: true, g11_active: true, g12_active: true 
  });

  // 🚀 ميزة القائمة البيضاء للرصد المبكر
  const [vipSubjects, setVipSubjects] = useState<string[]>([]);
  const [newVipSubject, setNewVipSubject] = useState('');
  const [vipLoading, setVipLoading] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [ctaLoading, setCtaLoading] = useState(false);
  const [teacherProgress, setTeacherProgress] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, submitted: 0, pending: 0 });

  const fetchRadarData = async () => {
    setLoading(true);
    try {
      const { data: schoolSettings } = await supabase.from('school_settings').select('*').single();
      if (schoolSettings) {
        setSettings({
          id: schoolSettings.id,
          p1_cw_active: schoolSettings.grading_p1_cw_active || false, p1_ex_active: schoolSettings.grading_p1_ex_active || false,
          p2_cw_active: schoolSettings.grading_p2_cw_active || false, p2_ex_active: schoolSettings.grading_p2_ex_active || false,
          cta_visible: schoolSettings.grading_cta_visible ?? true, cta_message: schoolSettings.grading_cta_message || '', cta_image_url: schoolSettings.grading_cta_image_url || '',
          g10_active: schoolSettings.grading_g10_active ?? true, g11_active: schoolSettings.grading_g11_active ?? true, g12_active: schoolSettings.grading_g12_active ?? true,
        });
        setVipSubjects(schoolSettings.early_grading_subjects || []);
      }

      const { data: teacherSections } = await supabase.from('teacher_sections').select('*');
      const { data: users } = await supabase.from('users').select('id, full_name').eq('role', 'teacher');
      const { data: sections } = await supabase.from('sections').select('id, name, classes(name, level)');
      const { data: lockedGrades } = await supabase.from('manual_grades').select('grade_level, section, subject_name').eq('is_locked', true);

      if (teacherSections && users && sections) {
        const progressArray: any[] = [];
        let submittedCount = 0;

        teacherSections.forEach(ts => {
          const teacher = users.find(u => u.id === ts.teacher_id);
          const sectionObj = sections.find(s => s.id === ts.section_id);

          if (teacher && sectionObj && sectionObj.classes.level >= 10) { 
            const isSubmitted = lockedGrades?.some(lg => lg.grade_level === sectionObj.classes.name && lg.section === sectionObj.name);
            if (isSubmitted) submittedCount++;
            progressArray.push({
              id: `${ts.teacher_id}-${ts.section_id}`,
              teacherName: teacher.full_name, className: sectionObj.classes.name, sectionName: sectionObj.name, isSubmitted,
              subjectName: lockedGrades?.find(lg => lg.grade_level === sectionObj.classes.name && lg.section === sectionObj.name)?.subject_name || ''
            });
          }
        });

        const uniqueProgress = progressArray.filter((value, index, self) => index === self.findIndex((t) => (t.teacherName === value.teacherName && t.className === value.className && t.sectionName === value.sectionName)));
        uniqueProgress.sort((a, b) => a.teacherName.localeCompare(b.teacherName));
        
        setTeacherProgress(uniqueProgress);
        setStats({ total: uniqueProgress.length, submitted: submittedCount, pending: uniqueProgress.length - submittedCount });
      }
    } catch (error) { setStatus({ type: 'error', msg: 'فشل تشغيل الرادار.' }); } finally { setLoading(false); }
  };

  useEffect(() => { fetchRadarData(); }, []);

  const handleToggle = async (field: string, currentValue: boolean) => {
    setToggleLoading(true); setStatus(null);
    try {
      const newValue = !currentValue;
      const dbFieldMap: Record<string, string> = { 
        'p1_cw_active': 'grading_p1_cw_active', 'p1_ex_active': 'grading_p1_ex_active', 'p2_cw_active': 'grading_p2_cw_active', 'p2_ex_active': 'grading_p2_ex_active',
        'g10_active': 'grading_g10_active', 'g11_active': 'grading_g11_active', 'g12_active': 'grading_g12_active' 
      };
      const { error } = await supabase.from('school_settings').update({ [dbFieldMap[field]]: newValue }).eq('id', settings.id);
      if (error) throw error;
      setSettings(prev => ({ ...prev, [field]: newValue }));
      setStatus({ type: 'success', msg: 'تم تحديث صلاحيات الرصد بنجاح!' });
    } catch (error) { setStatus({ type: 'error', msg: 'فشل تغيير الإعدادات.' }); } finally { setToggleLoading(false); setTimeout(() => setStatus(null), 3000); }
  };

  // 🚀 دوال إضافة وحذف مواد الرصد المبكر
  const addVipSubject = async () => {
    if (!newVipSubject.trim()) return;
    setVipLoading(true);
    try {
      const updatedList = [...vipSubjects, newVipSubject.trim()];
      const { error } = await supabase.from('school_settings').update({ early_grading_subjects: updatedList }).eq('id', settings.id);
      if (error) throw error;
      setVipSubjects(updatedList);
      setNewVipSubject('');
      setStatus({ type: 'success', msg: `تمت إضافة (${newVipSubject}) للقائمة البيضاء بنجاح!` });
    } catch (err) { setStatus({ type: 'error', msg: 'فشل إضافة المادة.' }); } finally { setVipLoading(false); setTimeout(() => setStatus(null), 3000); }
  };

  const removeVipSubject = async (subjectToRemove: string) => {
    setVipLoading(true);
    try {
      const updatedList = vipSubjects.filter(sub => sub !== subjectToRemove);
      const { error } = await supabase.from('school_settings').update({ early_grading_subjects: updatedList }).eq('id', settings.id);
      if (error) throw error;
      setVipSubjects(updatedList);
      setStatus({ type: 'success', msg: `تمت إزالة (${subjectToRemove}) من القائمة البيضاء.` });
    } catch (err) { setStatus({ type: 'error', msg: 'فشل إزالة المادة.' }); } finally { setVipLoading(false); setTimeout(() => setStatus(null), 3000); }
  };

  const handleCloudinaryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true); setStatus(null);
    try {
      const formData = new FormData(); formData.append('file', file); formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET as string);
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'خطأ في الرفع');
      setSettings(prev => ({ ...prev, cta_image_url: data.secure_url }));
      setStatus({ type: 'success', msg: 'تم إرفاق الصورة بنجاح! اضغط تفعيل للحفظ.' });
    } catch (err: any) { setStatus({ type: 'error', msg: err.message }); } finally { setUploadingImage(false); setTimeout(() => setStatus(null), 3000); }
  };

  const saveCTASettings = async (isVisible: boolean) => {
    setCtaLoading(true); setStatus(null);
    try {
      const { error } = await supabase.from('school_settings').update({ grading_cta_visible: isVisible, grading_cta_message: settings.cta_message, grading_cta_image_url: settings.cta_image_url }).eq('id', settings.id);
      if (error) throw error;
      setSettings(prev => ({ ...prev, cta_visible: isVisible }));
      setStatus({ type: 'success', msg: isVisible ? 'تم النشر بنجاح!' : 'تم الإخفاء بنجاح.' });
    } catch (error) { setStatus({ type: 'error', msg: 'فشل التحديث.' }); } finally { setCtaLoading(false); setTimeout(() => setStatus(null), 4000); }
  };

  const handleUnlockSheet = async (className: string, sectionName: string, subjectName: string, id: string) => {
    if (!window.confirm(`⚠️ تأكيد أمني: هل تريد فك الاعتماد لكشف (الصف ${className} - شعبة ${sectionName})؟ سيتمكن المعلم من التعديل مجدداً.`)) return;
    setActionLoadingId(id); setStatus(null);
    try {
      const { error } = await supabase.from('manual_grades').update({ is_locked: false }).eq('grade_level', className).eq('section', sectionName);
      if (error) throw error;
      setStatus({ type: 'success', msg: 'تم فك الاعتماد بنجاح! يمكن للمعلم تعديل الدرجات الآن.' });
      fetchRadarData(); 
    } catch (err: any) { setStatus({ type: 'error', msg: 'حدث خطأ أثناء فك الاعتماد.' }); } finally { setActionLoadingId(null); setTimeout(() => setStatus(null), 4000); }
  };

  if (loading) return (<div className="min-h-screen flex flex-col items-center justify-center bg-[#02040a]"><Activity className="w-16 h-16 text-amber-500 animate-pulse mb-4" /></div>);

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6 lg:p-8 font-sans" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-8 pb-32">
        
        <div className="glass-panel p-8 rounded-[2.5rem] border border-amber-500/20 shadow-[0_0_40px_rgba(245,158,11,0.05)] bg-[#0f1423]/80 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-40 h-40 bg-amber-500/10 blur-[60px] rounded-full pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20"><ShieldAlert className="w-8 h-8 text-amber-500" /></div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white">غرفة عمليات الرصد المركزية</h1>
                <p className="text-sm font-bold text-slate-400 mt-1">تحكم بالصفوف، الفترات، ومواد الرصد المبكر.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Link href="/admin/grading-unlock" className="flex-1 md:flex-none px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold rounded-xl border border-rose-500/30 flex items-center justify-center gap-2 transition-colors">
                <Unlock className="w-4 h-4" /> الخزنة المركزية
              </Link>
              <button onClick={fetchRadarData} className="flex-1 md:flex-none px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 flex items-center justify-center gap-2 transition-colors">
                <RefreshCw className="w-4 h-4" /> تحديث
              </button>
            </div>
          </div>

          <AnimatePresence>
            {status && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-6 overflow-hidden"><div className={`p-4 rounded-xl font-bold text-sm flex items-center gap-2 ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>{status.msg}</div></motion.div>)}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            
            {/* 🚀 القائمة البيضاء (مواد الرصد المبكر VIP) */}
            <div className="glass-panel p-6 rounded-[2rem] border border-purple-500/30 bg-[#0f1423]/80">
              <h2 className="text-xl font-black text-purple-400 mb-2 flex items-center gap-2"><Star className="w-5 h-5" /> القائمة البيضاء (VIP)</h2>
              <p className="text-xs text-slate-400 mb-6 font-bold">المواد المضافة هنا (مثل الدستور، القرآن) مسموح رصدها <span className="text-purple-300">طوال الوقت</span> بغض النظر عن قواطع الفترات.</p>
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="اسم المادة (مثال: القرآن الكريم)" 
                    value={newVipSubject} 
                    onChange={(e) => setNewVipSubject(e.target.value)} 
                    className="flex-1 bg-black/50 border border-purple-500/20 rounded-xl p-3 text-white text-sm outline-none focus:border-purple-500 font-bold"
                  />
                  <button onClick={addVipSubject} disabled={vipLoading || !newVipSubject.trim()} className="p-3 bg-purple-500 hover:bg-purple-400 text-white rounded-xl transition-colors disabled:opacity-50">
                    {vipLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2 pt-2">
                  {vipSubjects.length > 0 ? vipSubjects.map((sub, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 text-purple-300 px-3 py-1.5 rounded-lg text-xs font-black">
                      {sub}
                      <button onClick={() => removeVipSubject(sub)} className="text-purple-400 hover:text-rose-400 transition-colors"><X className="w-3 h-3" /></button>
                    </div>
                  )) : (
                    <p className="text-xs text-slate-500 font-bold w-full text-center py-2">لا توجد مواد مستثناة حالياً.</p>
                  )}
                </div>
              </div>
            </div>

            {/* قواطع الفترات */}
            <div className="glass-panel p-6 rounded-[2rem] border border-white/10 bg-[#0f1423]/80">
              <h2 className="text-xl font-black text-amber-400 mb-6 flex items-center gap-2"><Power className="w-5 h-5" /> قواطع الفترات للمواد الأساسية</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5"><div><p className="font-bold text-slate-200">أعمال الفترة 1</p></div><button onClick={() => handleToggle('p1_cw_active', settings.p1_cw_active)} className={`relative w-12 h-6 rounded-full transition-colors ${settings.p1_cw_active ? 'bg-emerald-500' : 'bg-slate-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.p1_cw_active ? 'left-1' : 'left-7'}`}></div></button></div>
                <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5"><div><p className="font-bold text-slate-200">اختبار الفترة 1</p></div><button onClick={() => handleToggle('p1_ex_active', settings.p1_ex_active)} className={`relative w-12 h-6 rounded-full transition-colors ${settings.p1_ex_active ? 'bg-emerald-500' : 'bg-slate-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.p1_ex_active ? 'left-1' : 'left-7'}`}></div></button></div>
                <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5"><div><p className="font-bold text-slate-200">أعمال الفترة 2</p></div><button onClick={() => handleToggle('p2_cw_active', settings.p2_cw_active)} className={`relative w-12 h-6 rounded-full transition-colors ${settings.p2_cw_active ? 'bg-emerald-500' : 'bg-slate-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.p2_cw_active ? 'left-1' : 'left-7'}`}></div></button></div>
                <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5"><div><p className="font-bold text-slate-200">اختبار الفترة 2</p></div><button onClick={() => handleToggle('p2_ex_active', settings.p2_ex_active)} className={`relative w-12 h-6 rounded-full transition-colors ${settings.p2_ex_active ? 'bg-emerald-500' : 'bg-slate-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.p2_ex_active ? 'left-1' : 'left-7'}`}></div></button></div>
              </div>
            </div>

            {/* بوابات الصفوف المسموحة */}
            <div className="glass-panel p-6 rounded-[2rem] border border-blue-500/30 bg-[#0f1423]/80">
              <h2 className="text-xl font-black text-blue-400 mb-6 flex items-center gap-2"><Filter className="w-5 h-5" /> بوابات الصفوف (الرصد)</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-blue-500/20"><div><p className="font-bold text-white">الصف العاشر</p></div><button disabled={toggleLoading} onClick={() => handleToggle('g10_active', settings.g10_active)} className={`relative w-12 h-6 rounded-full transition-colors ${settings.g10_active ? 'bg-blue-500' : 'bg-slate-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.g10_active ? 'left-1' : 'left-7'}`}></div></button></div>
                <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-blue-500/20"><div><p className="font-bold text-white">الصف الحادي عشر</p></div><button disabled={toggleLoading} onClick={() => handleToggle('g11_active', settings.g11_active)} className={`relative w-12 h-6 rounded-full transition-colors ${settings.g11_active ? 'bg-blue-500' : 'bg-slate-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.g11_active ? 'left-1' : 'left-7'}`}></div></button></div>
                <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-blue-500/20"><div><p className="font-bold text-white">الصف الثاني عشر</p></div><button disabled={toggleLoading} onClick={() => handleToggle('g12_active', settings.g12_active)} className={`relative w-12 h-6 rounded-full transition-colors ${settings.g12_active ? 'bg-blue-500' : 'bg-slate-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.g12_active ? 'left-1' : 'left-7'}`}></div></button></div>
              </div>
            </div>

          </div>

          <div className="lg:col-span-2">
            <div className="glass-panel p-6 sm:p-8 rounded-[2rem] border border-white/10 bg-[#0f1423]/80 h-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-white flex items-center gap-2"><Activity className="w-5 h-5 text-amber-400" /> رادار إنجاز المعلمين</h2>
                <div className="flex gap-4">
                  <div className="text-center"><p className="text-xl font-black text-emerald-400">{stats.submitted}</p><p className="text-[10px] text-slate-400">مكتمل</p></div>
                  <div className="text-center"><p className="text-xl font-black text-rose-400">{stats.pending}</p><p className="text-[10px] text-slate-400">متأخر</p></div>
                </div>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-right">
                  <thead><tr className="border-b border-white/10"><th className="p-3 text-slate-400 font-bold text-sm">المعلم</th><th className="p-3 text-slate-400 font-bold text-sm">الصف والشعبة</th><th className="p-3 text-slate-400 font-bold text-sm text-center">الاعتماد</th></tr></thead>
                  <tbody>
                    {teacherProgress.length > 0 ? (
                      teacherProgress.map((item) => (
                        <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-4 font-bold text-slate-200">أ. {item.teacherName}</td>
                          <td className="p-4 text-sm font-bold text-slate-300">{item.className} - شعـبة {item.sectionName}</td>
                          <td className="p-4 flex items-center justify-center gap-2">
                            {item.isSubmitted ? (
                              <>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-black rounded-lg border border-emerald-500/20"><CheckCircle2 className="w-4 h-4" /> معتمد</span>
                                <button 
                                  onClick={() => handleUnlockSheet(item.className, item.sectionName, item.subjectName, item.id)}
                                  disabled={actionLoadingId === item.id}
                                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg transition-colors border border-rose-500/20"
                                  title="فك الاعتماد وإعادة الكشف للمعلم"
                                >
                                  {actionLoadingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                                </button>
                              </>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 text-xs font-black rounded-lg border border-amber-500/20"><Clock className="w-4 h-4" /> قيد الإدخال</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (<tr><td colSpan={3} className="p-10 text-center text-slate-500 font-bold">لا يوجد تكليفات مسجلة.</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
