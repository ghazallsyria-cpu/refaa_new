'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Users, Calculator, Download, Loader2, Trophy, Medal } from 'lucide-react';
import { useSchoolFormData } from '@/hooks/useSchoolFormData';
import { useGradebook } from '@/hooks/useGradebook';
import { motion } from 'framer-motion';

export default function GradebookPage() {
  const { data: formData, isLoading: formLoading } = useSchoolFormData();
  const { fetchGradebook, loading: gradesLoading, gradeData } = useGradebook();

  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  const sections = formData?.sections?.map((s: any) => ({
    id: s.id, name: s.classes?.name ? `${s.classes.name} - ${s.name}` : s.name
  })) || [];
  
  const subjects = formData?.subjects || [];

  // جلب البيانات تلقائياً عند تحديد الفصل والمادة
  useEffect(() => {
    if (selectedSection && selectedSubject) {
      fetchGradebook(selectedSection, selectedSubject);
    }
  }, [selectedSection, selectedSubject, fetchGradebook]);

  const { students, assessments, scores } = gradeData;

  const getScore = (studentId: string, examId: string) => {
    const record = scores.find(s => String(s.student_id) === String(studentId) && String(s.exam_id) === String(examId));
    return record ? Number(record.score) : '-';
  };

  const getTotalScore = (studentId: string) => {
    let total = 0;
    assessments.forEach(a => {
      const score = getScore(studentId, a.id);
      if (score !== '-') total += score;
    });
    return total;
  };

  const maxTotalScore = assessments.reduce((sum, a) => sum + (Number(a.max_score) || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24" dir="rtl">
      
      {/* الترويسة العلوية */}
      <header className="bg-white border-b border-slate-200 px-8 py-8 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold mb-3">
              <Calculator className="w-4 h-4" /> دفتر أعمال المعلم
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">سجل الدرجات الشامل</h1>
            <p className="text-slate-500 font-bold mt-1">تابع تقييمات طلابك، اختباراتهم، واستخرج النتائج بسهولة.</p>
          </div>

          <div className="flex w-full md:w-auto items-center gap-3">
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl flex items-center px-2">
              <Users className="w-5 h-5 text-slate-400 mx-3 shrink-0" />
              <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} className="w-full bg-transparent border-none py-4 font-bold text-slate-700 outline-none cursor-pointer">
                <option value="">-- اختر الفصل --</option>
                {sections.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl flex items-center px-2">
              <BookOpen className="w-5 h-5 text-slate-400 mx-3 shrink-0" />
              <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full bg-transparent border-none py-4 font-bold text-slate-700 outline-none cursor-pointer">
                <option value="">-- اختر المادة --</option>
                {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* منطقة الجدول */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {!selectedSection || !selectedSubject ? (
          <div className="bg-white rounded-[32px] border border-slate-200 border-dashed p-20 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="h-20 w-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
              <Calculator className="h-10 w-10 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-black text-slate-700 mb-2">الدفتر بانتظارك</h2>
            <p className="text-slate-500 font-bold">يرجى تحديد الفصل والمادة من الأعلى لعرض سجل الدرجات.</p>
          </div>
        ) : formLoading || gradesLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            <p className="font-bold text-slate-500 animate-pulse">جاري تجميع الدرجات...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-[32px] border border-slate-200 p-20 flex flex-col items-center justify-center text-center shadow-sm">
            <Users className="h-16 w-16 text-slate-300 mb-4" />
            <h2 className="text-xl font-black text-slate-700">لا يوجد طلاب</h2>
            <p className="text-slate-500 font-bold">هذا الفصل لا يحتوي على طلاب مسجلين حتى الآن.</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
            
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span className="font-black text-slate-700">كشف الدرجات التفصيلي</span>
              </div>
              <button onClick={() => window.print()} className="flex items-center gap-2 text-sm font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors">
                <Download className="w-4 h-4" /> طباعة / PDF
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr>
                    <th className="sticky right-0 z-20 bg-slate-900 text-white font-black py-5 px-6 border-b border-l border-slate-800 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.1)] w-64">اسم الطالب</th>
                    
                    {assessments.map(a => (
                      <th key={a.id} className="bg-slate-50 text-slate-700 font-black py-4 px-4 border-b border-slate-200 text-center min-w-[140px]">
                        <div className="text-sm truncate max-w-[120px] mx-auto" title={a.title}>{a.title}</div>
                        <div className="text-[10px] text-slate-400 mt-1">من {a.max_score}</div>
                      </th>
                    ))}
                    
                    <th className="bg-indigo-50 text-indigo-900 font-black py-4 px-6 border-b border-l border-indigo-100 text-center min-w-[120px]">
                      <div className="flex items-center justify-center gap-1.5"><Medal className="w-4 h-4 text-indigo-600" /> المجموع</div>
                      <div className="text-[10px] text-indigo-500 mt-1">من {maxTotalScore}</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => {
                    const studentTotal = getTotalScore(student.id);
                    const percentage = maxTotalScore > 0 ? Math.round((studentTotal / maxTotalScore) * 100) : 0;
                    
                    return (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                        <td className={`sticky right-0 z-10 font-black text-sm py-4 px-6 border-b border-l shadow-[4px_0_15px_-3px_rgba(0,0,0,0.05)] transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} group-hover:bg-indigo-50`}>
                          {student.name}
                        </td>
                        
                        {assessments.map(a => {
                          const score = getScore(student.id, a.id);
                          return (
                            <td key={a.id} className="border-b border-slate-100 py-4 px-4 text-center font-bold text-slate-600">
                              {score === '-' ? <span className="text-slate-300">-</span> : score}
                            </td>
                          );
                        })}
                        
                        <td className="border-b border-l border-indigo-100 py-4 px-6 text-center font-black bg-indigo-50/30">
                          <span className={percentage >= 90 ? 'text-emerald-600' : percentage >= 50 ? 'text-indigo-600' : 'text-rose-500'}>
                            {studentTotal}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {assessments.length === 0 && (
               <div className="p-8 text-center text-slate-500 font-bold border-t border-slate-100 bg-slate-50/50">
                 لم يتم العثور على أي اختبارات أو واجبات مسجلة لهذه المادة.
               </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
