// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, Activity, CheckCircle2, Clock, Loader2, Power, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GradingControlPage() {
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  // 🚀 إعدادات قواطع الفترات (عامة للمدرسة)
  const [settings, setSettings] = useState({
    id: 1, p1_cw_active: false, p1_ex_active: false, p2_cw_active: true, p2_ex_active: false
  });

  const [teacherProgress, setTeacherProgress] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, submitted: 0, pending: 0 });

  const fetchRadarData = async () => {
    setLoading(true);
    try {
      const { data: schoolSettings } = await supabase.from('school_settings').select('*').single();
      if (schoolSettings) {
        setSettings({
          id: schoolSettings.id,
          p1_cw_active: schoolSettings.grading_p1_cw_active || false,
          p1_ex_active: schoolSettings.grading_p1_ex_active || false,
          p2_cw_active: schoolSettings.grading_p2_cw_active || false,
          p2_ex_active: schoolSettings.grading_p2_ex_active || false,
        });
      }

      const { data: teacherSections } = await supabase.from('teacher_sections').select('*');
      const { data: users } = await supabase.from('users').select('id, full_name').eq('role', 'teacher');
      const { data: sections } = await supabase.from('sections').select('id, name, classes(name, level)');
      const { data: subjects } = await supabase.from('subjects').select('id, name');
      const { data: lockedGrades } = await supabase.from('manual_grades').select('grade_level, section, subject_name').eq('is_locked', true);

      if (teacherSections && users && sections && subjects) {
        const progressArray: any[] = [];
        let submittedCount = 0;

        teacherSections.forEach(ts => {
          const teacher = users.find(u => u.id === ts.teacher_id);
          const sectionObj = sections.find(s => s.id === ts.section_id);
          const subjectObj = subjects.find(su => su.id === ts.subject_id);

          if (teacher && sectionObj && subjectObj && sectionObj.classes.level >= 10) { 
            const className = sectionObj.classes.name;
            const sectionName = sectionObj.name;
            const subjectName = subjectObj.name;

            const isSubmitted = lockedGrades?.some(lg => lg.grade_level === className && lg.section === sectionName && lg.subject_name === subjectName);
            if (isSubmitted) submittedCount++;

            progressArray.push({
              id: `${ts.teacher_id}-${ts.section_id}-${ts.subject_id}`,
              teacherName: teacher.full_name, className, sectionName, subjectName, isSubmitted
            });
          }
        });

        progressArray.sort((a, b) => a.teacherName.localeCompare(b.teacherName));
        setTeacherProgress(progressArray);
        setStats({ total: progressArray.length, submitted: submittedCount, pending: progressArray.length - submittedCount });
      }
    } catch (error) {
      setStatus({ type: 'error', msg: 'فشل تشغيل الرادار أو قراءة البيانات.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRadarData(); }, []);

  const handleToggle = async (field: string, currentValue: boolean) => {
    setToggleLoading(true); setStatus(null);
    try {
      const newValue = !currentValue;
      const dbFieldMap: Record<string, string> = { 'p1_cw_active': 'grading_p1_cw_active', 'p1_ex_active': 'grading_p1_ex_active', 'p2_cw_active': 'grading_p2_cw_active', 'p2_ex_active': 'grading_p2_ex_active' };
      const { error } = await supabase.from('school_settings').update({ [dbFieldMap[field]]: newValue }).eq('id', settings.id);
      if (error) throw error;
      setSettings(prev => ({ ...prev, [field]: newValue }));
      setStatus({ type: 'success', msg: 'تم تحديث صلاحيات الإدخال بنجاح!' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'فشل تغيير الإعدادات.' });
    } finally {
      setToggleLoading(false); setTimeout(() => setStatus(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#02040a]">
        <Activity className="w-16 h-16 text-amber-500 animate-pulse mb-4" />
        <p className="text-amber-400 font-black tracking-widest animate-pulse">جاري تشغيل الرادار المركزي...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6 lg:p-8 font-sans" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="glass-panel p-8 rounded-[2.5rem] border border-amber-500/20 shadow-[0_0_40px_rgba(245,158,11,0.05)] bg-[#0f1423]/80 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-40 h-40 bg-amber-500/10 blur-[60px] rounded-full pointer-events-none"></div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20"><ShieldAlert className="w-8 h-8 text-amber-500" /></div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white">غرفة عمليات الرصد المركزية</h1>
                <p className="text-sm font-bold text-slate-400 mt-1">تحكم بصلاحيات الإدخال للمعلمين، وراقب إنجازهم لحظة بلحظة.</p>
              </div>
            </div>
            <button onClick={fetchRadarData} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 flex items-center gap-2 transition-colors">
              <RefreshCw className="w-4 h-4" /> تحديث الرادار
            </button>
          </div>

          <AnimatePresence>
            {status && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-6 overflow-hidden">
                <div className={`p-4 rounded-xl font-bold text-sm flex items-center gap-2 ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                  {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />} {status.msg}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-1 space-y-6">
            {/* 🎛️ قواطع الإدخال العامة */}
            <div className="glass-panel p-6 rounded-[2rem] border border-white/10 bg-[#0f1423]/80">
              <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2"><Power className="w-5 h-5 text-indigo-400" /> قواطع إدخال الدرجات</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5">
                  <div><p className="font-bold text-slate-200">أعمال الفترة 1</p><p className="text-[10px] text-slate-500 mt-1">{settings.p1_cw_active ? 'مفتوح للرصد' : 'مغلق (للقراءة)'}</p></div>
                  <button disabled={toggleLoading} onClick={() => handleToggle('p1_cw_active', settings.p1_cw_active)} className={`relative w-12 h-6 rounded-full transition-colors ${settings.p1_cw_active ? 'bg-emerald-500' : 'bg-slate-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.p1_cw_active ? 'left-1' : 'left-7'}`}></div></button>
                </div>
                <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5">
                  <div><p className="font-bold text-slate-200">اختبار الفترة 1</p><p className="text-[10px] text-slate-500 mt-1">{settings.p1_ex_active ? 'مفتوح للرصد' : 'مغلق (للقراءة)'}</p></div>
                  <button disabled={toggleLoading} onClick={() => handleToggle('p1_ex_active', settings.p1_ex_active)} className={`relative w-12 h-6 rounded-full transition-colors ${settings.p1_ex_active ? 'bg-emerald-500' : 'bg-slate-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.p1_ex_active ? 'left-1' : 'left-7'}`}></div></button>
                </div>
                <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5">
                  <div><p className="font-bold text-slate-200">أعمال الفترة 2</p><p className="text-[10px] text-slate-500 mt-1">{settings.p2_cw_active ? 'مفتوح للرصد' : 'مغلق (للقراءة)'}</p></div>
                  <button disabled={toggleLoading} onClick={() => handleToggle('p2_cw_active', settings.p2_cw_active)} className={`relative w-12 h-6 rounded-full transition-colors ${settings.p2_cw_active ? 'bg-emerald-500' : 'bg-slate-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.p2_cw_active ? 'left-1' : 'left-7'}`}></div></button>
                </div>
                <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5">
                  <div><p className="font-bold text-slate-200">اختبار الفترة 2</p><p className="text-[10px] text-slate-500 mt-1">{settings.p2_ex_active ? 'مفتوح للرصد' : 'مغلق (للقراءة)'}</p></div>
                  <button disabled={toggleLoading} onClick={() => handleToggle('p2_ex_active', settings.p2_ex_active)} className={`relative w-12 h-6 rounded-full transition-colors ${settings.p2_ex_active ? 'bg-emerald-500' : 'bg-slate-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.p2_ex_active ? 'left-1' : 'left-7'}`}></div></button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-center"><p className="text-3xl font-black text-emerald-400 mb-1">{stats.submitted}</p><p className="text-xs font-bold text-slate-300">اعتُمدت</p></div>
              <div className="glass-panel p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-center"><p className="text-3xl font-black text-rose-400 mb-1">{stats.pending}</p><p className="text-xs font-bold text-slate-300">متأخرة</p></div>
            </div>
          </div>

          {/* 📡 الرادار الاستخباراتي */}
          <div className="lg:col-span-2">
            <div className="glass-panel p-6 sm:p-8 rounded-[2rem] border border-white/10 bg-[#0f1423]/80 h-full">
              <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2"><Activity className="w-5 h-5 text-amber-400" /> رادار إنجاز المعلمين</h2>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-right">
                  <thead><tr className="border-b border-white/10"><th className="p-3 text-slate-400 font-bold text-sm">المعلم</th><th className="p-3 text-slate-400 font-bold text-sm">المادة</th><th className="p-3 text-slate-400 font-bold text-sm">الصف والشعبة</th><th className="p-3 text-slate-400 font-bold text-sm text-center">الحالة</th></tr></thead>
                  <tbody>
                    {teacherProgress.length > 0 ? (
                      teacherProgress.map((item) => (
                        <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-4 font-bold text-slate-200">أ. {item.teacherName}</td>
                          <td className="p-4 text-sm font-bold text-indigo-300">{item.subjectName}</td>
                          <td className="p-4 text-sm font-bold text-slate-300">{item.className} - شعـبة {item.sectionName}</td>
                          <td className="p-4 text-center">
                            {item.isSubmitted ? (<span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-black rounded-lg border border-emerald-500/20"><CheckCircle2 className="w-4 h-4" /> تم الاعتماد</span>) : (<span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-400 text-xs font-black rounded-lg border border-rose-500/20"><Clock className="w-4 h-4" /> متأخر</span>)}
                          </td>
                        </tr>
                      ))
                    ) : (<tr><td colSpan={4} className="p-10 text-center text-slate-500 font-bold">لا يوجد تكليفات مسجلة.</td></tr>)}
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
