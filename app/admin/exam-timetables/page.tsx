// @ts-nocheck
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  CalendarDays, Clock, BookOpen, Plus, Edit3, Trash2, 
  ShieldCheck, Loader2, X, CheckCircle2, Zap
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export default function ExamTimetablesAdmin() {
  const router = useRouter();
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [subjects, setSubjects] = useState<any[]>([]);
  const [timetables, setTimetables] = useState<any[]>([]);
  
  const [activeLevel, setActiveLevel] = useState<number>(10); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '',
    subject_id: '',
    class_level: 10,
    exam_date: '',
    start_time: '08:00',
    end_time: '10:00'
  });

  const currentYear = '2025-2026';
  const currentSemester = 'الفصل الدراسي الثاني';

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: subs } = await supabase.from('subjects').select('id, name').order('name');
      setSubjects(subs || []);

      const { data: exams } = await supabase.from('exam_timetables')
        .select(`*, subjects(name)`)
        .eq('academic_year', currentYear)
        .eq('semester', currentSemester)
        .order('exam_date', { ascending: true })
        .order('start_time', { ascending: true });
        
      setTimetables(exams || []);
    } catch (error) {
      console.error('Error fetching timetables:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    if (currentRole === 'admin' || currentRole === 'management') {
      fetchData(); 
    }
  }, [currentRole]);

  const handleSave = async () => {
    if (!formData.subject_id || !formData.exam_date || !formData.start_time || !formData.end_time) {
      alert('يرجى تعبئة جميع الحقول!');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        subject_id: formData.subject_id,
        class_level: formData.class_level,
        exam_date: formData.exam_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        academic_year: currentYear,
        semester: currentSemester
      };

      if (formData.id) {
        await supabase.from('exam_timetables').update(payload).eq('id', formData.id);
      } else {
        await supabase.from('exam_timetables').insert([payload]);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('تحذير خطير: هل أنت متأكد من حذف هذا الاختبار؟ (سيتم حذف أي تكليفات لرؤساء اللجان وسجلات الحضور المرتبطة به تلقائياً)')) return;
    
    try {
      setIsLoading(true);
      
      await supabase.from('exam_committee_heads').delete().eq('timetable_id', id);
      await supabase.from('exam_attendance').delete().eq('timetable_id', id);
      await supabase.from('invigilator_attendance').delete().eq('timetable_id', id);
      await supabase.from('exam_grading_roles').delete().eq('timetable_id', id);
      await supabase.from('exam_pipeline').delete().eq('timetable_id', id);

      const { error } = await supabase.from('exam_timetables').delete().eq('id', id);
      if (error) throw error;
      
      alert('تم حذف الاختبار وتنظيف سجلاته بنجاح!');
      fetchData();
    } catch (error: any) {
      console.error(error);
      alert('حدث خطأ أثناء الحذف: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoGenerate = async () => {
    if (!confirm('هل أنت متأكد من رغبتك في توليد كافة جداول الفترة الدراسية الثانية تلقائياً؟')) return;
    setIsGenerating(true);
    
    try {
      const schedule = [
        // --- العاشر ---
        { date: '2026-06-03', start: '08:00', end: '10:15', level: 10, sub: 'فيزياء' },
        { date: '2026-06-04', start: '08:00', end: '11:15', level: 10, sub: 'عربي' },
        { date: '2026-06-07', start: '08:00', end: '10:15', level: 10, sub: 'رياضيات' },
        { date: '2026-06-08', start: '08:00', end: '10:15', level: 10, sub: 'تاريخ' },
        { date: '2026-06-10', start: '08:00', end: '10:15', level: 10, sub: 'احياء' },
        { date: '2026-06-11', start: '08:00', end: '11:15', level: 10, sub: 'انجليزي' },
        { date: '2026-06-14', start: '08:00', end: '10:15', level: 10, sub: 'كيمياء' },
        { date: '2026-06-15', start: '08:00', end: '10:15', level: 10, sub: 'اسلامية' },

        // --- الحادي عشر (علمي وأدبي) ---
        { date: '2026-06-03', start: '08:00', end: '10:45', level: 11, sub: 'رياضيات' },
        { date: '2026-06-03', start: '08:00', end: '10:15', level: 11, sub: 'جغرافيا' },
        { date: '2026-06-04', start: '08:00', end: '10:15', level: 11, sub: 'كيمياء' },
        { date: '2026-06-04', start: '08:00', end: '10:15', level: 11, sub: 'احصاء' },
        { date: '2026-06-07', start: '08:00', end: '10:15', level: 11, sub: 'فيزياء' },
        { date: '2026-06-07', start: '08:00', end: '10:15', level: 11, sub: 'فرنسي' },
        { date: '2026-06-08', start: '08:00', end: '10:15', level: 11, sub: 'اسلامية' },
        { date: '2026-06-10', start: '08:00', end: '10:15', level: 11, sub: 'جيولوجيا' },
        { date: '2026-06-10', start: '08:00', end: '10:15', level: 11, sub: 'علم نفس' },
        { date: '2026-06-11', start: '08:00', end: '11:15', level: 11, sub: 'عربي' },
        { date: '2026-06-14', start: '08:00', end: '10:15', level: 11, sub: 'احياء' },
        { date: '2026-06-14', start: '08:00', end: '10:15', level: 11, sub: 'تاريخ' },
        { date: '2026-06-15', start: '08:00', end: '11:15', level: 11, sub: 'انجليزي' },
      ];

      const { data: existSubs } = await supabase.from('subjects').select('id, name');
      let currentSubs = existSubs || [];
      const requiredSubNames = [...new Set(schedule.map(s => s.sub))];
      const missingNames = requiredSubNames.filter(name => !currentSubs.find(s => s.name === name));

      if (missingNames.length > 0) {
        const newSubjectsToInsert = missingNames.map(n => ({ name: n, code: `SUB_${Math.floor(Math.random() * 10000)}` }));
        const { data: newSubs, error: subErr } = await supabase.from('subjects').insert(newSubjectsToInsert).select('id, name');
        if (subErr) throw subErr;
        currentSubs = [...currentSubs, ...(newSubs || [])];
      }

      const { data: existingTT } = await supabase.from('exam_timetables')
        .select('id, exam_date, subject_id, class_level')
        .eq('academic_year', currentYear)
        .eq('semester', currentSemester);

      const inserts = [];
      for (const s of schedule) {
        const subjectRecord = currentSubs.find(cs => cs.name === s.sub);
        if (subjectRecord) {
          const isExist = existingTT?.find(et => et.exam_date === s.date && et.class_level === s.level && et.subject_id === subjectRecord.id);
          if (!isExist) {
            inserts.push({
               academic_year: currentYear,
               semester: currentSemester,
               class_level: s.level,
               exam_date: s.date,
               start_time: s.start,
               end_time: s.end,
               subject_id: subjectRecord.id
            });
          }
        }
      }

      if (inserts.length > 0) {
        const { error: insErr } = await supabase.from('exam_timetables').insert(inserts);
        if (insErr) throw insErr;
        alert(`تم زرع ${inserts.length} اختبار بنجاح في قاعدة البيانات متطابقة تماماً مع أسماء المواد!`);
      } else {
        alert('الجدول مُولد بالفعل ولا توجد اختبارات ناقصة.');
      }
      
      fetchData();
    } catch (err: any) {
      alert('خطأ أثناء التوليد: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const openModal = (exam: any = null) => {
    if (exam) {
      setFormData({
        id: exam.id,
        subject_id: exam.subject_id,
        class_level: exam.class_level,
        exam_date: exam.exam_date,
        start_time: exam.start_time ? exam.start_time.substring(0, 5) : '08:00', 
        end_time: exam.end_time ? exam.end_time.substring(0, 5) : '10:00'
      });
    } else {
      setFormData({
        id: '',
        subject_id: '',
        class_level: activeLevel,
        exam_date: '',
        start_time: '08:00',
        end_time: '10:00'
      });
    }
    setIsModalOpen(true);
  };

  if (currentRole !== 'admin' && currentRole !== 'management') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-cairo" dir="rtl">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-rose-100 text-center max-w-md w-full">
          <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6"><ShieldCheck className="w-12 h-12 text-rose-500" /></div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">منطقة محظورة! 🛑</h1>
          <p className="text-sm font-bold text-slate-500 mb-8 leading-relaxed">عذراً، هذه الغرفة مخصصة لمدير النظام والإدارة العليا فقط.</p>
          <button onClick={() => router.back()} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-md active:scale-95">العودة للخلف</button>
        </div>
      </div>
    );
  }

  const filteredExams = timetables.filter(exam => exam.class_level === activeLevel);

  const formatArabicDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ar-KW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  // 🚀 خوارزمية التمييز البصري (العلمي والأدبي والمشترك)
  const getExamBadgeDetails = (level: number, subjectName: string = '') => {
    const name = subjectName || '';
    if (level === 10) {
      return { text: 'الصف العاشر', bg: 'bg-emerald-50', textCol: 'text-emerald-700', border: 'border-emerald-200' };
    }
    
    const sciList = ['فيزياء', 'كيمياء', 'احياء', 'أحياء', 'جيولوجيا', 'رياضيات', 'علوم'];
    const litList = ['جغرافيا', 'تاريخ', 'علم نفس', 'فرنسي', 'احصاء', 'إحصاء', 'فلسفة', 'اجتماعيات'];
    
    const isSci = sciList.some(s => name.includes(s));
    const isLit = litList.some(s => name.includes(s));

    if (level === 11) {
      if (isSci) return { text: 'الحادي عشر (علمي)', bg: 'bg-blue-50', textCol: 'text-blue-700', border: 'border-blue-200' };
      if (isLit) return { text: 'الحادي عشر (أدبي)', bg: 'bg-fuchsia-50', textCol: 'text-fuchsia-700', border: 'border-fuchsia-200' };
      return { text: 'الحادي عشر (مشترك)', bg: 'bg-indigo-50', textCol: 'text-indigo-700', border: 'border-indigo-200' };
    }
    
    return { text: 'غير محدد', bg: 'bg-slate-50', textCol: 'text-slate-600', border: 'border-slate-200' };
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-cairo pb-24" dir="rtl">
      
      {isGenerating && (
        <div className="fixed inset-0 bg-slate-900/90 z-[100] flex flex-col items-center justify-center text-white backdrop-blur-sm">
          <Loader2 className="w-16 h-16 animate-spin text-amber-400 mb-6" />
          <h2 className="text-xl font-black animate-pulse text-center px-4">جاري زرع الجداول والمواد تلقائياً...</h2>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 relative">
        
        <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
          <div className="absolute -left-10 -top-10 text-indigo-50/50 pointer-events-none"><CalendarDays className="w-64 h-64" /></div>
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-2 flex items-center gap-3">
              <CalendarDays className="w-8 h-8 text-indigo-600" /> جدول الاختبارات النهائية
            </h1>
            <p className="text-slate-500 font-bold text-sm">إدارة مواعيد اختبارات الصفين العاشر والحادي عشر لعام {currentYear}</p>
          </div>
          <div className="relative z-10 w-full md:w-auto flex flex-col sm:flex-row gap-3">
            <button onClick={handleAutoGenerate} disabled={isGenerating} className="w-full md:w-auto px-6 py-4 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-95">
              <Zap className="w-5 h-5" /> توليد الجداول تلقائياً
            </button>
            <button onClick={() => openModal()} className="w-full md:w-auto px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-95">
              <Plus className="w-5 h-5" /> إضافة يدوية
            </button>
          </div>
        </div>

        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm max-w-md mx-auto">
          <button onClick={() => setActiveLevel(10)} className={`flex-1 py-3.5 rounded-xl font-black text-base transition-all ${activeLevel === 10 ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
            الصف العاشر
          </button>
          <button onClick={() => setActiveLevel(11)} className={`flex-1 py-3.5 rounded-xl font-black text-base transition-all ${activeLevel === 11 ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
            الصف الحادي عشر
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-20"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /></div>
        ) : filteredExams.length === 0 ? (
          <div className="text-center p-16 md:p-20 bg-white rounded-3xl border border-slate-200 border-dashed mx-auto max-w-2xl">
            <CalendarDays className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-400 mb-2">الجدول فارغ</h3>
            <p className="text-sm font-bold text-slate-500 mb-6">لم يتم إضافة أي اختبارات لهذا الصف بعد.</p>
            <button onClick={handleAutoGenerate} className="px-6 py-3 bg-amber-100 text-amber-700 font-black rounded-xl hover:bg-amber-200 transition-colors inline-flex items-center gap-2">
              <Zap className="w-4 h-4"/> سحب الجدول تلقائياً
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredExams.map((exam, idx) => {
              const badge = getExamBadgeDetails(exam.class_level, exam.subjects?.name);

              return (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} key={exam.id} className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-2 h-full ${badge.bg.replace('50', '500')}`}></div>
                  
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 gap-4">
                    <div>
                      {/* 🚀 هنا سيظهر الوسام الملون المخصص لكل مسار */}
                      <span className={`text-[12px] font-black px-3 py-1.5 rounded-lg mb-3 inline-block border ${badge.bg} ${badge.textCol} ${badge.border}`}>
                        {badge.text}
                      </span>
                      <h3 className="text-3xl font-black text-slate-800 leading-tight">{exam.subjects?.name}</h3>
                    </div>
                    
                    <div className="flex gap-2 shrink-0">
                       <button onClick={() => openModal(exam)} className="p-3 bg-slate-50 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors shadow-sm"><Edit3 className="w-5 h-5"/></button>
                       <button onClick={() => handleDelete(exam.id)} className="p-3 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-xl transition-colors shadow-sm"><Trash2 className="w-5 h-5"/></button>
                    </div>
                  </div>

                  <div className="space-y-3 mt-auto">
                    <div className="flex items-center gap-3 text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <CalendarDays className="w-6 h-6 text-indigo-500 shrink-0" />
                      <span className="font-black text-base leading-none">{formatArabicDate(exam.exam_date)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <Clock className="w-6 h-6 text-amber-500 shrink-0" />
                      <span className="font-black text-base leading-none" dir="ltr">{exam.start_time?.substring(0,5)} - {exam.end_time?.substring(0,5)}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40" onClick={() => !isSaving && setIsModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-md bg-white rounded-3xl shadow-2xl z-50 p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <BookOpen className="w-7 h-7 text-indigo-600"/> {formData.id ? 'تعديل الاختبار' : 'إضافة اختبار جديد'}
                </h3>
                <button onClick={() => !isSaving && setIsModalOpen(false)} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-full"><X className="w-6 h-6"/></button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-base font-black text-slate-700 mb-2">المادة الدراسية</label>
                  <select value={formData.subject_id} onChange={(e) => setFormData({...formData, subject_id: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black text-slate-800 outline-none focus:border-indigo-500">
                    <option value="">-- اختر المادة --</option>
                    {subjects.map(s => ( <option key={s.id} value={s.id}>{s.name}</option> ))}
                  </select>
                </div>

                <div>
                  <label className="block text-base font-black text-slate-700 mb-2">الصف الدراسي</label>
                  <select value={formData.class_level} onChange={(e) => setFormData({...formData, class_level: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black text-slate-800 outline-none focus:border-indigo-500">
                    <option value={10}>الصف العاشر</option>
                    <option value={11}>الصف الحادي عشر</option>
                  </select>
                </div>

                <div>
                  <label className="block text-base font-black text-slate-700 mb-2">تاريخ الاختبار</label>
                  <input type="date" value={formData.exam_date} onChange={(e) => setFormData({...formData, exam_date: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xl font-black text-slate-800 outline-none focus:border-indigo-500" dir="ltr" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-base font-black text-slate-700 mb-2">وقت البداية</label>
                     <input type="time" value={formData.start_time} onChange={(e) => setFormData({...formData, start_time: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xl font-black text-center text-slate-800 outline-none focus:border-indigo-500" />
                   </div>
                   <div>
                     <label className="block text-base font-black text-slate-700 mb-2">وقت النهاية</label>
                     <input type="time" value={formData.end_time} onChange={(e) => setFormData({...formData, end_time: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xl font-black text-center text-slate-800 outline-none focus:border-indigo-500" />
                   </div>
                </div>

                <button onClick={handleSave} disabled={isSaving} className="w-full py-5 bg-indigo-600 text-white text-lg font-black rounded-2xl hover:bg-indigo-700 transition-colors shadow-md mt-4 flex items-center justify-center gap-2">
                  {isSaving ? <Loader2 className="w-6 h-6 animate-spin"/> : <CheckCircle2 className="w-6 h-6"/>}
                  {isSaving ? 'جاري الحفظ...' : 'اعتماد الاختبار'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
