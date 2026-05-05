// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, Clock, BookOpen, Plus, Edit3, Trash2, 
  ShieldCheck, Loader2, LayoutGrid, X
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
  
  const [subjects, setSubjects] = useState<any[]>([]);
  const [timetables, setTimetables] = useState<any[]>([]);
  
  const [activeLevel, setActiveLevel] = useState<number>(10); // 10 للعاشر، 11 للحادي عشر
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
      // 1. جلب قائمة المواد
      const { data: subs } = await supabase.from('subjects').select('id, name').order('name');
      setSubjects(subs || []);

      // 2. جلب جدول الاختبارات الحالي
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
    if (!confirm('هل أنت متأكد من حذف هذا الاختبار من الجدول؟')) return;
    try {
      await supabase.from('exam_timetables').delete().eq('id', id);
      fetchData();
    } catch (error) {
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const openModal = (exam: any = null) => {
    if (exam) {
      setFormData({
        id: exam.id,
        subject_id: exam.subject_id,
        class_level: exam.class_level,
        exam_date: exam.exam_date,
        start_time: exam.start_time.substring(0, 5), // قص الثواني إن وجدت
        end_time: exam.end_time.substring(0, 5)
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

  // 🛡️ حماية الغرفة
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

  // فلترة الاختبارات حسب الصف المحدد
  const filteredExams = timetables.filter(exam => exam.class_level === activeLevel);

  // دالة تنسيق التاريخ العربي
  const formatArabicDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ar-KW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-cairo" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8 relative">
        
        {/* 🚀 الهيدر */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
          <div className="absolute -left-10 -top-10 text-indigo-50/50 pointer-events-none"><CalendarDays className="w-64 h-64" /></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-black text-slate-900 mb-2 flex items-center gap-3">
              <CalendarDays className="w-8 h-8 text-indigo-600" /> جدول الاختبارات النهائية
            </h1>
            <p className="text-slate-500 font-bold text-sm">إدارة مواعيد اختبارات الصفين العاشر والحادي عشر لعام {currentYear}</p>
          </div>
          <div className="relative z-10">
            <button onClick={() => openModal()} className="px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" /> إضافة اختبار جديد
            </button>
          </div>
        </div>

        {/* 🚀 تبويبات الصفوف */}
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm max-w-md mx-auto">
          <button onClick={() => setActiveLevel(10)} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${activeLevel === 10 ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
            الصف العاشر
          </button>
          <button onClick={() => setActiveLevel(11)} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${activeLevel === 11 ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
            الصف الحادي عشر
          </button>
        </div>

        {/* 🚀 المحتوى */}
        {isLoading ? (
          <div className="flex justify-center p-20"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /></div>
        ) : filteredExams.length === 0 ? (
          <div className="text-center p-20 bg-white rounded-3xl border border-slate-200 border-dashed">
            <CalendarDays className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-400 mb-2">الجدول فارغ</h3>
            <p className="text-sm font-bold text-slate-500">لم يتم إضافة أي اختبارات لهذا الصف بعد.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExams.map((exam, idx) => (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} key={exam.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-indigo-500"></div>
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg mb-2 inline-block">
                      {activeLevel === 10 ? 'العاشر' : 'الحادي عشر'}
                    </span>
                    <h3 className="text-2xl font-black text-slate-800">{exam.subjects?.name}</h3>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => openModal(exam)} className="p-2 bg-slate-50 text-slate-500 hover:text-indigo-600 rounded-lg"><Edit3 className="w-4 h-4"/></button>
                     <button onClick={() => handleDelete(exam.id)} className="p-2 bg-slate-50 text-slate-500 hover:text-rose-600 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>

                <div className="space-y-3 mt-auto">
                  <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <CalendarDays className="w-5 h-5 text-indigo-400" />
                    <span className="font-bold text-sm">{formatArabicDate(exam.exam_date)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <Clock className="w-5 h-5 text-amber-500" />
                    <span className="font-bold text-sm" dir="ltr">{exam.start_time.substring(0,5)} - {exam.end_time.substring(0,5)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* 🚀 نافذة الإضافة/التعديل */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" onClick={() => !isSaving && setIsModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-50 p-6">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-indigo-600"/> {formData.id ? 'تعديل الاختبار' : 'إضافة اختبار جديد'}
                </h3>
                <button onClick={() => !isSaving && setIsModalOpen(false)} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-full"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">المادة الدراسية</label>
                  <select value={formData.subject_id} onChange={(e) => setFormData({...formData, subject_id: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-indigo-500">
                    <option value="">-- اختر المادة --</option>
                    {subjects.map(s => ( <option key={s.id} value={s.id}>{s.name}</option> ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">الصف الدراسي</label>
                  <select value={formData.class_level} onChange={(e) => setFormData({...formData, class_level: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-indigo-500">
                    <option value={10}>الصف العاشر</option>
                    <option value={11}>الصف الحادي عشر</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">تاريخ الاختبار</label>
                  <input type="date" value={formData.exam_date} onChange={(e) => setFormData({...formData, exam_date: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-700 outline-none focus:border-indigo-500" dir="ltr" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-bold text-slate-600 mb-2">وقت البداية</label>
                     <input type="time" value={formData.start_time} onChange={(e) => setFormData({...formData, start_time: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-center text-slate-700 outline-none focus:border-indigo-500" />
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-slate-600 mb-2">وقت النهاية</label>
                     <input type="time" value={formData.end_time} onChange={(e) => setFormData({...formData, end_time: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-center text-slate-700 outline-none focus:border-indigo-500" />
                   </div>
                </div>

                <button onClick={handleSave} disabled={isSaving} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-colors shadow-md mt-2 flex items-center justify-center gap-2">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : <CheckCircle2 className="w-5 h-5"/>}
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
