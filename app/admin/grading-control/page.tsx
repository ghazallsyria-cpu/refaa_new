// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, Activity, CheckCircle2, Clock, Loader2, Power, AlertCircle, RefreshCw, UserCheck, Filter, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GradingControlPage() {
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  // 🚀 إعدادات قواطع الفترات (عامة للمدرسة)
  const [settings, setSettings] = useState({
    id: 1, p1_cw_active: false, p1_ex_active: false, p2_cw_active: true, p2_ex_active: false
  });

  // 🚀 البيانات والفلاتر
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [filterLevel, setFilterLevel] = useState<string>('all');

  const fetchRadarData = async () => {
    setLoading(true);
    try {
      // 1. جلب القواطع
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

      // 2. جلب التشكيلات
      const { data: teacherSections } = await supabase.from('teacher_sections').select('*');
      const { data: users } = await supabase.from('users').select('id, full_name').eq('role', 'teacher');
      const { data: sections } = await supabase.from('sections').select('id, name, classes(name, level)');
      const { data: subjects } = await supabase.from('subjects').select('id, name');
      const { data: lockedGrades } = await supabase.from('manual_grades').select('grade_level, section, subject_name').eq('is_locked', true);

      if (teacherSections && users && sections && subjects) {
        const rawTasks: any[] = [];

        teacherSections.forEach(ts => {
          const teacher = users.find(u => u.id === ts.teacher_id);
          const sectionObj = sections.find(s => s.id === ts.section_id);
          const subjectObj = subjects.find(su => su.id === ts.subject_id);

          if (teacher && sectionObj && subjectObj && sectionObj.classes.level >= 10) { 
            const className = sectionObj.classes.name;
            const sectionName = sectionObj.name;
            const subjectName = subjectObj.name;
            const level = sectionObj.classes.level; // نحتاج المستوى للفلترة

            const isSubmitted = lockedGrades?.some(lg => lg.grade_level === className && lg.section === sectionName && lg.subject_name === subjectName);

            rawTasks.push({
              id: `${ts.teacher_id}-${ts.section_id}-${ts.subject_id}`,
              teacherName: teacher.full_name, 
              className, 
              sectionName, 
              subjectName, 
              level,
              isSubmitted
            });
          }
        });

        setAllTasks(rawTasks);
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

  // ==========================================
  // 🚀 معالجة البيانات: الفلترة والتجميع الذكي (Smart Grouping)
  // ==========================================
  const filteredTasks = filterLevel === 'all' 
    ? allTasks 
    : allTasks.filter(t => t.level.toString() === filterLevel);

  // تجميع المهام حسب المعلم
  const groupedTeachers = Object.values(
    filteredTasks.reduce((acc, task) => {
      if (!acc[task.teacherName]) {
        acc[task.teacherName] = { name: task.teacherName, tasks: [], total: 0, submitted: 0 };
      }
      acc[task.teacherName].tasks.push(task);
      acc[task.teacherName].total++;
      if (task.isSubmitted) acc[task.teacherName].submitted++;
      return acc;
    }, {} as Record<string, any>)
  ).sort((a, b) => a.name.localeCompare(b.name));

  // إحصائيات سريعة للبطاقات
  const stats = {
    total: filteredTasks.length,
    submitted: filteredTasks.filter(t => t.isSubmitted).length,
    pending: filteredTasks.filter(t => !t.isSubmitted).length
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
        
        {/* الترويسة الفخمة */}
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

            {/* الإحصائيات (تتحدث مع الفلتر تلقائياً) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-center">
                <p className="text-3xl font-black text-emerald-400 mb-1">{stats.submitted}</p>
                <p className="text-xs font-bold text-slate-300">كشوفات مكتملة</p>
              </div>
              <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-center">
                <p className="text-3xl font-black text-amber-400 mb-1">{stats.pending}</p>
                <p className="text-xs font-bold text-slate-300">كشوفات متأخرة</p>
              </div>
            </div>
          </div>

          {/* 📡 الرادار الاستخباراتي الذكي (مجمع حسب المعلم) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* شريط الفلاتر للمستويات */}
            <div className="flex flex-wrap items-center gap-3 p-2 glass-panel rounded-2xl border border-white/10 bg-[#0f1423]/80 w-fit">
              <Filter className="w-4 h-4 text-slate-400 ml-2" />
              {[
                { id: 'all', label: 'جميع الصفوف' },
                { id: '10', label: 'العاشر' },
                { id: '11', label: 'الحادي عشر' },
                { id: '12', label: 'الثاني عشر' }
              ].map(level => (
                <button 
                  key={level.id}
                  onClick={() => setFilterLevel(level.id)}
                  className={`px-5 py-2 rounded-xl text-sm font-black transition-all ${filterLevel === level.id ? 'bg-amber-500 text-black shadow-lg' : 'bg-transparent text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  {level.label}
                </button>
              ))}
            </div>

            {/* بطاقات المعلمين */}
            <div className="space-y-4">
              {groupedTeachers.length > 0 ? (
                groupedTeachers.map((teacher: any, idx: number) => {
                  const isFullyCompleted = teacher.submitted === teacher.total;
                  const isPartiallyCompleted = teacher.submitted > 0 && !isFullyCompleted;

                  return (
                    <div key={idx} className="glass-panel p-6 rounded-[2rem] border border-white/10 bg-[#0f1423]/60 hover:border-white/20 transition-colors">
                      {/* هيدر البطاقة (اسم المعلم والنسبة) */}
                      <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                            <UserCheck className="w-6 h-6 text-indigo-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-white">أ. {teacher.name}</h3>
                            <p className="text-xs font-bold text-slate-400 mt-1">
                              إنجاز: {teacher.submitted} من {teacher.total} كشوفات
                            </p>
                          </div>
                        </div>
                        
                        {/* حالة الاعتماد العامة للمعلم */}
                        <div>
                          {isFullyCompleted ? (
                            <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-black flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" /> مكتمل
                            </span>
                          ) : isPartiallyCompleted ? (
                            <span className="px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-black flex items-center gap-1.5">
                              <Activity className="w-4 h-4" /> قيد الإنجاز
                            </span>
                          ) : (
                            <span className="px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-black flex items-center gap-1.5">
                              <Clock className="w-4 h-4" /> لم يبدأ
                            </span>
                          )}
                        </div>
                      </div>

                      {/* تفاصيل فصول ومواد المعلم */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {teacher.tasks.map((task: any, tIdx: number) => (
                          <div key={tIdx} className={`p-3 rounded-xl border flex justify-between items-center ${task.isSubmitted ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-black/30 border-white/5'}`}>
                            <div className="flex items-center gap-2 overflow-hidden">
                              <BookOpen className={`w-4 h-4 shrink-0 ${task.isSubmitted ? 'text-emerald-500' : 'text-slate-500'}`} />
                              <div className="truncate text-right">
                                <p className="text-xs font-black text-white truncate">{task.subjectName}</p>
                                <p className="text-[10px] font-bold text-slate-400 truncate">{task.className} - شعـبة {task.sectionName}</p>
                              </div>
                            </div>
                            <div className="shrink-0 pl-1">
                              {task.isSubmitted ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Clock className="w-4 h-4 text-slate-600" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="glass-panel p-16 rounded-[2rem] border border-white/10 text-center">
                  <UserCheck className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-50" />
                  <p className="text-slate-400 font-bold">لا توجد تكليفات رصد ضمن هذا الفلتر.</p>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
