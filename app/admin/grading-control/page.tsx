// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, Activity, CheckCircle2, Clock, Loader2, Power, AlertCircle, RefreshCw, X, Filter, Unlock, Star, Plus, ListChecks, Printer, ArrowRightLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function GradingControlPage() {
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'warning', msg: string } | null>(null);

  const [settings, setSettings] = useState({
    id: 1, 
    p1_cw_active: false, p1_ex_active: false, p2_cw_active: true, p2_ex_active: false,
    g10_active: true, g11_active: true, g12_active: true 
  });

  const [vipSubjects, setVipSubjects] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [newVipSubject, setNewVipSubject] = useState('');
  const [vipLoading, setVipLoading] = useState(false);

  const [allTeacherProgress, setAllTeacherProgress] = useState<any[]>([]);
  const [filteredProgress, setFilteredProgress] = useState<any[]>([]);
  const [radarLevelFilter, setRadarLevelFilter] = useState('all'); 
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
          g10_active: schoolSettings.grading_g10_active ?? true, g11_active: schoolSettings.grading_g11_active ?? true, g12_active: schoolSettings.grading_g12_active ?? true,
        });
        setVipSubjects(schoolSettings.early_grading_subjects || []);
      }

      const { data: rulesData } = await supabase.from('kuwait_grading_rules').select('subject_name');
      if (rulesData) {
        const uniqueSubjects = Array.from(new Set(rulesData.map(r => r.subject_name?.trim()))).filter(Boolean).sort();
        setAvailableSubjects(uniqueSubjects);
      }

      const { data: teacherSections } = await supabase.from('teacher_sections').select('*');
      const { data: users } = await supabase.from('users').select('id, full_name').eq('role', 'teacher');
      const { data: sections } = await supabase.from('sections').select('id, name, classes(name, level)');
      
      // 🚀 جلب حالة القفل وحالة النقل للوزارة
      const { data: lockedGrades, error: gradesError } = await supabase.from('manual_grades').select('grade_level, section, subject_name, is_locked, is_transferred_to_ministry');
      
      if (gradesError) {
        console.warn("Please run the SQL ALTER TABLE to add is_transferred_to_ministry column.");
      }

      if (teacherSections && users && sections) {
        const progressArray: any[] = [];

        teacherSections.forEach(ts => {
          const teacher = users.find(u => u.id === ts.teacher_id);
          const sectionObj = sections.find(s => s.id === ts.section_id);

          if (teacher && sectionObj && sectionObj.classes.level >= 10) { 
            const subjectRec = lockedGrades?.find(lg => lg.grade_level === sectionObj.classes.name && lg.section === sectionObj.name);
            const isSubmitted = subjectRec?.is_locked || false;
            const isTransferred = subjectRec?.is_transferred_to_ministry || false;
            
            progressArray.push({
              id: `${ts.teacher_id}-${ts.section_id}`,
              teacherName: teacher.full_name, 
              className: sectionObj.classes.name, 
              sectionName: sectionObj.name, 
              isSubmitted,
              isTransferred,
              subjectName: subjectRec?.subject_name || 'غير محدد'
            });
          }
        });

        const uniqueProgress = progressArray.filter((value, index, self) => index === self.findIndex((t) => (t.teacherName === value.teacherName && t.className === value.className && t.sectionName === value.sectionName)));
        uniqueProgress.sort((a, b) => a.teacherName.localeCompare(b.teacherName));
        
        setAllTeacherProgress(uniqueProgress);
      }
    } catch (error) { setStatus({ type: 'error', msg: 'فشل تشغيل الرادار.' }); } finally { setLoading(false); }
  };

  useEffect(() => { fetchRadarData(); }, []);

  useEffect(() => {
    let filtered = allTeacherProgress;
    if (radarLevelFilter === '10') filtered = filtered.filter(item => item.className.includes('العاشر') || item.className.includes('10'));
    else if (radarLevelFilter === '11') filtered = filtered.filter(item => item.className.includes('الحادي عشر') || item.className.includes('11'));
    else if (radarLevelFilter === '12') filtered = filtered.filter(item => item.className.includes('الثاني عشر') || item.className.includes('12'));

    const submittedCount = filtered.filter(item => item.isSubmitted).length;
    setFilteredProgress(filtered);
    setStats({ total: filtered.length, submitted: submittedCount, pending: filtered.length - submittedCount });
  }, [allTeacherProgress, radarLevelFilter]);

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

  const addVipSubject = async () => {
    if (!newVipSubject.trim()) return;
    if (vipSubjects.includes(newVipSubject.trim())) {
      setStatus({ type: 'warning', msg: 'المادة موجودة بالفعل في القائمة البيضاء!' }); setTimeout(() => setStatus(null), 3000); return;
    }
    setVipLoading(true);
    try {
      const updatedList = [...vipSubjects, newVipSubject.trim()];
      const { error } = await supabase.from('school_settings').update({ early_grading_subjects: updatedList }).eq('id', settings.id);
      if (error) throw error;
      setVipSubjects(updatedList); setNewVipSubject('');
      setStatus({ type: 'success', msg: `تمت الإضافة بنجاح!` });
    } catch (err) { setStatus({ type: 'error', msg: 'فشل إضافة المادة.' }); } finally { setVipLoading(false); setTimeout(() => setStatus(null), 3000); }
  };

  const removeVipSubject = async (subjectToRemove: string) => {
    setVipLoading(true);
    try {
      const updatedList = vipSubjects.filter(sub => sub !== subjectToRemove);
      const { error } = await supabase.from('school_settings').update({ early_grading_subjects: updatedList }).eq('id', settings.id);
      if (error) throw error;
      setVipSubjects(updatedList);
      setStatus({ type: 'success', msg: `تمت الإزالة بنجاح.` });
    } catch (err) { setStatus({ type: 'error', msg: 'فشل إزالة المادة.' }); } finally { setVipLoading(false); setTimeout(() => setStatus(null), 3000); }
  };

  const handleUnlockSheet = async (className: string, sectionName: string, id: string) => {
    if (!window.confirm(`⚠️ تأكيد أمني: هل تريد فك الاعتماد لكشف (الصف ${className} - شعبة ${sectionName})؟`)) return;
    setActionLoadingId(`unlock-${id}`); setStatus(null);
    try {
      const { error } = await supabase.from('manual_grades').update({ is_locked: false, is_transferred_to_ministry: false }).eq('grade_level', className).eq('section', sectionName);
      if (error) throw error;
      setStatus({ type: 'success', msg: 'تم فك الاعتماد بنجاح!' });
      fetchRadarData(); 
    } catch (err: any) { setStatus({ type: 'error', msg: 'حدث خطأ.' }); } finally { setActionLoadingId(null); setTimeout(() => setStatus(null), 4000); }
  };

  // 🚀 دالة جديدة للتحكم في النقل لسجل الوزارة
  const handleTransferToMinistry = async (className: string, sectionName: string, currentStatus: boolean, id: string) => {
    setActionLoadingId(`transfer-${id}`); setStatus(null);
    try {
      const { error } = await supabase.from('manual_grades').update({ is_transferred_to_ministry: !currentStatus }).eq('grade_level', className).eq('section', sectionName);
      if (error) throw error;
      
      setAllTeacherProgress(prev => prev.map(p => p.id === id ? { ...p, isTransferred: !currentStatus } : p));
      setStatus({ type: 'success', msg: !currentStatus ? 'تم تأكيد النقل للوزارة بنجاح!' : 'تم التراجع عن النقل.' });
    } catch (err: any) { 
      setStatus({ type: 'error', msg: 'حدث خطأ. تأكد من تشغيل كود SQL أولاً.' }); 
    } finally { 
      setActionLoadingId(null); setTimeout(() => setStatus(null), 3000); 
    }
  };

  if (loading) return (<div className="min-h-screen flex flex-col items-center justify-center bg-[#02040a]"><Activity className="w-16 h-16 text-amber-500 animate-pulse mb-4" /></div>);

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6 lg:p-8 font-sans" dir="rtl">
      
      {/* 🚀 إعدادات الطباعة (تخفي كل شيء ما عدا الرادار وتلغي الأشرطة العائمة) */}
      <style dangerouslySetInnerHTML={{__html: ` 
        @media print { 
          @page { size: A4 portrait; margin: 15mm; } 
          body { background: white !important; color: black !important; } 
          .no-print, nav, footer, header:not(.print-header), .fixed, .sticky, [class*="fixed bottom"] { display: none !important; }
          .print-radar { display: block !important; width: 100% !important; max-height: none !important; overflow: visible !important; border: none !important; box-shadow: none !important; background: transparent !important;}
          .print-radar table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
          .print-radar th, .print-radar td { border: 1px solid black !important; padding: 8px; text-align: center; color: black !important; }
          .print-radar th { background-color: #f3f4f6 !important; font-weight: bold; -webkit-print-color-adjust: exact; }
          .print-radar .badge { border: none !important; background: transparent !important; color: black !important; padding: 0 !important; }
          .print-radar .action-col { display: none !important; } /* نخفي أزرار التحكم في الطباعة */
        } 
      `}} />

      <div className="max-w-7xl mx-auto space-y-8 pb-32">
        
        <div className="no-print glass-panel p-8 rounded-[2.5rem] border border-amber-500/20 shadow-[0_0_40px_rgba(245,158,11,0.05)] bg-[#0f1423]/80 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-40 h-40 bg-amber-500/10 blur-[60px] rounded-full pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20"><ShieldAlert className="w-8 h-8 text-amber-500" /></div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white">غرفة عمليات الرصد المركزية</h1>
                <p className="text-sm font-bold text-slate-400 mt-1">إدارة الاعتمادات ونقل البيانات لسجل الوزارة.</p>
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
            {status && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-6 overflow-hidden"><div className={`p-4 rounded-xl font-bold text-sm flex items-center gap-2 ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : status.type === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>{status.msg}</div></motion.div>)}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* الألواح الجانبية المخفية أثناء الطباعة */}
          <div className="no-print lg:col-span-1 space-y-6">
            <div className="glass-panel p-6 rounded-[2rem] border border-purple-500/30 bg-[#0f1423]/80">
              <h2 className="text-xl font-black text-purple-400 mb-2 flex items-center gap-2"><Star className="w-5 h-5" /> القائمة البيضاء (VIP)</h2>
              <div className="space-y-4">
                <div className="flex gap-2 relative">
                  <div className="relative flex-1">
                    <ListChecks className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400 opacity-60 pointer-events-none" />
                    <select value={newVipSubject} onChange={(e) => setNewVipSubject(e.target.value)} className="w-full bg-black/50 border border-purple-500/20 rounded-xl py-3 pl-3 pr-10 text-white text-sm outline-none focus:border-purple-500 font-bold appearance-none">
                      <option value="" disabled>اختر المادة من اللائحة...</option>
                      {availableSubjects.map((sub, idx) => (<option key={idx} value={sub}>{sub}</option>))}
                    </select>
                  </div>
                  <button onClick={addVipSubject} disabled={vipLoading || !newVipSubject} className="p-3 bg-purple-500 hover:bg-purple-400 text-white rounded-xl transition-colors disabled:opacity-50">
                    {vipLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {vipSubjects.length > 0 ? vipSubjects.map((sub, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 text-purple-300 px-3 py-1.5 rounded-lg text-xs font-black">
                      {sub} <button onClick={() => removeVipSubject(sub)} className="text-purple-400 hover:text-rose-400 transition-colors"><X className="w-3 h-3" /></button>
                    </div>
                  )) : (<p className="text-xs text-slate-500 font-bold w-full text-center py-2">لا توجد مواد مستثناة.</p>)}
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-[2rem] border border-white/10 bg-[#0f1423]/80">
              <h2 className="text-xl font-black text-amber-400 mb-6 flex items-center gap-2"><Power className="w-5 h-5" /> قواطع الفترات للمواد الأساسية</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5"><div><p className="font-bold text-slate-200">أعمال الفترة 1</p></div><button onClick={() => handleToggle('p1_cw_active', settings.p1_cw_active)} className={`relative w-12 h-6 rounded-full transition-colors ${settings.p1_cw_active ? 'bg-emerald-500' : 'bg-slate-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.p1_cw_active ? 'left-1' : 'left-7'}`}></div></button></div>
                <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5"><div><p className="font-bold text-slate-200">اختبار الفترة 1</p></div><button onClick={() => handleToggle('p1_ex_active', settings.p1_ex_active)} className={`relative w-12 h-6 rounded-full transition-colors ${settings.p1_ex_active ? 'bg-emerald-500' : 'bg-slate-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.p1_ex_active ? 'left-1' : 'left-7'}`}></div></button></div>
                <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5"><div><p className="font-bold text-slate-200">أعمال الفترة 2</p></div><button onClick={() => handleToggle('p2_cw_active', settings.p2_cw_active)} className={`relative w-12 h-6 rounded-full transition-colors ${settings.p2_cw_active ? 'bg-emerald-500' : 'bg-slate-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.p2_cw_active ? 'left-1' : 'left-7'}`}></div></button></div>
                <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5"><div><p className="font-bold text-slate-200">اختبار الفترة 2</p></div><button onClick={() => handleToggle('p2_ex_active', settings.p2_ex_active)} className={`relative w-12 h-6 rounded-full transition-colors ${settings.p2_ex_active ? 'bg-emerald-500' : 'bg-slate-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.p2_ex_active ? 'left-1' : 'left-7'}`}></div></button></div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-[2rem] border border-blue-500/30 bg-[#0f1423]/80">
              <h2 className="text-xl font-black text-blue-400 mb-6 flex items-center gap-2"><Filter className="w-5 h-5" /> بوابات الصفوف (الرصد)</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-blue-500/20"><div><p className="font-bold text-white">الصف العاشر</p></div><button disabled={toggleLoading} onClick={() => handleToggle('g10_active', settings.g10_active)} className={`relative w-12 h-6 rounded-full transition-colors ${settings.g10_active ? 'bg-blue-500' : 'bg-slate-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.g10_active ? 'left-1' : 'left-7'}`}></div></button></div>
                <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-blue-500/20"><div><p className="font-bold text-white">الصف الحادي عشر</p></div><button disabled={toggleLoading} onClick={() => handleToggle('g11_active', settings.g11_active)} className={`relative w-12 h-6 rounded-full transition-colors ${settings.g11_active ? 'bg-blue-500' : 'bg-slate-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.g11_active ? 'left-1' : 'left-7'}`}></div></button></div>
                <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-blue-500/20"><div><p className="font-bold text-white">الصف الثاني عشر</p></div><button disabled={toggleLoading} onClick={() => handleToggle('g12_active', settings.g12_active)} className={`relative w-12 h-6 rounded-full transition-colors ${settings.g12_active ? 'bg-blue-500' : 'bg-slate-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.g12_active ? 'left-1' : 'left-7'}`}></div></button></div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 print-radar">
            
            <div className="hidden print:block print-header text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">مدرسة الرفعة النموذجية (م - ث) للبنين</h1>
              <h2 className="text-xl">تقرير إنجاز المعلمين ونقل الدرجات لسجل الوزارة</h2>
              <p className="mt-2 text-gray-600">الصف المختار: {radarLevelFilter === 'all' ? 'جميع المراحل' : radarLevelFilter === '10' ? 'العاشر' : radarLevelFilter === '11' ? 'الحادي عشر' : 'الثاني عشر'}</p>
            </div>

            <div className="glass-panel p-6 sm:p-8 rounded-[2rem] border border-white/10 bg-[#0f1423]/80 h-full flex flex-col print:border-none print:bg-transparent print:p-0">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-white/5 pb-6 no-print">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20"><Activity className="w-5 h-5 text-amber-400" /></div>
                  <div>
                    <h2 className="text-xl font-black text-white">رادار الإنجاز ونقل الوزارة</h2>
                    <p className="text-xs text-slate-400 font-bold mt-1">تتبع الاعتمادات وعمليات النقل للسجل</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  {/* زر الطباعة المخصص للرادار */}
                  <button onClick={() => window.print()} className="p-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/20 transition-colors" title="تصدير PDF للرادار">
                    <Printer className="w-5 h-5" />
                  </button>

                  <div className="relative flex-1 sm:flex-none">
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <select value={radarLevelFilter} onChange={(e) => setRadarLevelFilter(e.target.value)} className="w-full sm:w-auto bg-black/60 border border-white/10 rounded-xl py-2.5 pl-4 pr-9 text-sm font-bold text-white outline-none focus:border-amber-500 transition-colors appearance-none">
                      <option value="all">جميع المراحل</option>
                      <option value="10">الصف العاشر فقط</option>
                      <option value="11">الحادي عشر فقط</option>
                      <option value="12">الثاني عشر فقط</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-4 py-2 shrink-0">
                    <div className="text-center"><p className="text-lg font-black text-emerald-400 leading-none">{stats.submitted}</p><p className="text-[10px] text-slate-400 font-bold">مكتمل</p></div>
                    <div className="w-px h-6 bg-white/10"></div>
                    <div className="text-center"><p className="text-lg font-black text-rose-400 leading-none">{stats.pending}</p><p className="text-[10px] text-slate-400 font-bold">متأخر</p></div>
                  </div>
                </div>
              </div>

              {/* الجدول */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[600px] print:max-h-none print:overflow-visible">
                <table className="w-full text-right">
                  <thead className="sticky top-0 bg-[#0f1423] z-10 shadow-md print:static print:bg-gray-100">
                    <tr className="border-b border-white/10 print:border-black">
                      <th className="p-3 text-slate-400 font-bold text-sm print:text-black">المعلم</th>
                      <th className="p-3 text-slate-400 font-bold text-sm print:text-black">الصف والشعبة</th>
                      <th className="p-3 text-slate-400 font-bold text-sm print:text-black">المادة</th>
                      <th className="p-3 text-slate-400 font-bold text-sm text-center print:text-black">حالة الكشف</th>
                      <th className="p-3 text-slate-400 font-bold text-sm text-center print:text-black action-col">النقل لسجل الوزارة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProgress.length > 0 ? (
                      filteredProgress.map((item) => (
                        <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors print:border-black">
                          <td className="p-4 font-bold text-slate-200 print:text-black">أ. {item.teacherName}</td>
                          <td className="p-4">
                            <span className="badge inline-block px-3 py-1.5 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-lg text-xs font-black print:text-black">
                              {item.className} - {item.sectionName}
                            </span>
                          </td>
                          <td className="p-4 text-xs font-bold text-slate-300 print:text-black">{item.subjectName}</td>
                          <td className="p-4 text-center">
                            {item.isSubmitted ? (
                              <span className="badge inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-black rounded-lg border border-emerald-500/20 print:text-black"><CheckCircle2 className="w-4 h-4 no-print" /> معتمد</span>
                            ) : (
                              <span className="badge inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-400 text-xs font-black rounded-lg border border-rose-500/20 print:text-black"><Clock className="w-4 h-4 no-print" /> قيد الإدخال</span>
                            )}
                          </td>
                          
                          {/* 🚀 عمود النقل للوزارة (أزرار في الشاشة، نص في الطباعة) */}
                          <td className="p-4 text-center action-col">
                            {item.isSubmitted ? (
                              <button 
                                onClick={() => handleTransferToMinistry(item.className, item.sectionName, item.isTransferred, item.id)}
                                disabled={actionLoadingId === `transfer-${item.id}`}
                                className={`inline-flex items-center justify-center w-full gap-2 px-3 py-2 text-xs font-black rounded-xl border transition-all ${item.isTransferred ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'bg-transparent text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10'}`}
                              >
                                {actionLoadingId === `transfer-${item.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : item.isTransferred ? <CheckCircle2 className="w-4 h-4" /> : <ArrowRightLeft className="w-4 h-4" />}
                                {item.isTransferred ? 'تم النقل' : 'نقل للوزارة'}
                              </button>
                            ) : (
                              <span className="text-slate-600 text-xs font-bold">- بانتظار الاعتماد -</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (<tr><td colSpan={5} className="p-10 text-center text-slate-500 font-bold">لا يوجد بيانات لهذه المرحلة.</td></tr>)}
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
