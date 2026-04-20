'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { 
  Search, FileText, Printer, Plus, Calendar, 
  BookOpen, Users, Loader2, Activity 
} from 'lucide-react';
import Link from 'next/link';

export default function EvaluationsArchivePage() {
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchEvaluations = async () => {
      try {
        const { data, error } = await supabase
          .from('teacher_evaluations')
          .select(`
            id,
            evaluation_date,
            subject,
            class_name,
            has_clear_lesson, has_delay_record, parents_contacted, student_followup, periodic_exams,
            teachers ( users (full_name) ),
            evaluator:users!evaluator_id (full_name)
          `)
          .order('evaluation_date', { ascending: false });

        if (error) throw error;
        setEvaluations(data || []);
      } catch (err) {
        console.error("Error fetching evaluations:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluations();
  }, []);

  // حساب النتيجة من 5
  const calculateScore = (evalObj: any) => {
    let score = 0;
    if (evalObj.has_clear_lesson) score++;
    if (evalObj.has_delay_record) score++;
    if (evalObj.parents_contacted) score++;
    if (evalObj.student_followup) score++;
    if (evalObj.periodic_exams) score++;
    return score;
  };

  // فلترة البحث
  const filteredEvaluations = evaluations.filter(ev => {
    const teacherName = ev.teachers?.users?.full_name || '';
    return teacherName.includes(searchTerm) || ev.subject.includes(searchTerm);
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-32 font-cairo pt-8" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 🚀 الهيدر */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-200 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black uppercase mb-3">
              <Activity className="w-4 h-4" /> الأرشيف الإداري
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">سجل تقييمات المعلمين</h1>
            <p className="text-slate-500 font-bold mt-1 text-sm sm:text-base">جميع الزيارات الميدانية وتقييمات الأداء مؤرشفة هنا.</p>
          </div>
          
          <Link href="/admin/evaluations/new" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-2xl font-black transition-all active:scale-95 shadow-lg shadow-indigo-200 w-full md:w-auto justify-center">
            <Plus className="w-5 h-5" /> إضافة تقييم جديد
          </Link>
        </div>

        {/* 🚀 شريط البحث */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input 
            type="text" 
            placeholder="ابحث باسم المعلم أو المادة..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-none outline-none font-bold text-slate-700 placeholder:text-slate-400"
          />
        </div>

        {/* 🚀 جدول الأرشيف */}
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-12 h-12 text-indigo-500 animate-spin" /></div>
        ) : filteredEvaluations.length === 0 ? (
          <div className="bg-white py-20 text-center rounded-[2rem] border border-dashed border-slate-300">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-bold text-lg">لا توجد تقييمات مؤرشفة حتى الآن.</p>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-right whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="py-4 px-6 text-xs font-black uppercase text-slate-500">المعلم / المادة</th>
                    <th className="py-4 px-6 text-xs font-black uppercase text-slate-500">التاريخ</th>
                    <th className="py-4 px-6 text-xs font-black uppercase text-slate-500">الصف</th>
                    <th className="py-4 px-6 text-xs font-black uppercase text-slate-500 text-center">المؤشر (من 5)</th>
                    <th className="py-4 px-6 text-xs font-black uppercase text-slate-500 text-center">بواسطة</th>
                    <th className="py-4 px-6 text-xs font-black uppercase text-slate-500 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEvaluations.map((ev) => {
                    const score = calculateScore(ev);
                    return (
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={ev.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                              {(ev.teachers?.users?.full_name || '؟').charAt(0)}
                            </div>
                            <div>
                              <p className="font-black text-slate-800 text-sm">{ev.teachers?.users?.full_name || 'معلم محذوف'}</p>
                              <p className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-0.5"><BookOpen className="w-3 h-3" /> {ev.subject}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                            <Calendar className="w-4 h-4 text-slate-400" /> {new Date(ev.evaluation_date).toLocaleDateString('ar-EG')}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-sm font-bold text-slate-600">
                          {ev.class_name}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="inline-flex items-center justify-center w-12 h-8 rounded-lg font-black text-sm border bg-slate-50">
                            <span className={score >= 4 ? 'text-emerald-600' : score >= 3 ? 'text-amber-600' : 'text-rose-600'}>{score}</span>
                            <span className="text-slate-400 mx-0.5">/</span>5
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center text-xs font-bold text-slate-500">
                          {ev.evaluator?.full_name || 'الإدارة'}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <Link href={`/admin/evaluations/${ev.id}/print`} className="inline-flex items-center justify-center p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm active:scale-95">
                            <Printer className="w-4 h-4" />
                          </Link>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
