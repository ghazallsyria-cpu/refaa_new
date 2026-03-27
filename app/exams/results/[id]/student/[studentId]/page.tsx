'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, CheckCircle, XCircle, AlertCircle, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useExamsSystem } from '@/hooks/useExamsSystem';

export default function StudentExamResult() {
  const params = useParams();
  const router = useRouter();
  const { id: examId, studentId } = params;
  const { fetchStudentExamResult } = useExamsSystem();
  
  const [exam, setExam] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!examId || !studentId) return;
    try {
      setLoading(true);
      const result = await fetchStudentExamResult(examId as string, studentId as string);

      setExam(result.exam);
      setStudent(result.student);
      setAnswers(result.answers);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [examId, studentId, fetchStudentExamResult]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStudentAnswerDisplay = (answer: any) => {
    if (!answer) return 'لم يتم الإجابة';
    const qType = answer.question?.type;

    if (qType === 'multi_select' || qType === 'checkbox') {
      try {
        const parsed = JSON.parse(answer.text_answer || '[]');
        return Array.isArray(parsed) ? parsed.join('، ') : answer.text_answer;
      } catch { return answer.text_answer; }
    }

    // إذا كانت الإجابة مرتبطة بخيار محدد
    if (answer.selected_option_id) {
      const opt = answer.question?.options?.find((o: any) => o.id === answer.selected_option_id);
      return opt?.content || 'خيار غير موجود';
    }

    return answer.text_answer || 'لم يتم الإجابة';
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">جاري تحميل النتائج...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors">
        <ArrowRight className="h-5 w-5" /> العودة للنتائج
      </button>

      <div className="glass-card p-8 rounded-[32px] border-t-8 border-indigo-600 shadow-xl">
        <h1 className="text-3xl font-black text-slate-900">{exam?.title || 'عنوان الاختبار'}</h1>
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-400 block font-bold">الطالب</span>
            <span className="font-black text-slate-700">{student?.full_name || 'اسم غير متوفر'}</span>
          </div>
          <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-400 block font-bold">المادة</span>
            <span className="font-black text-slate-700">{exam?.subject_name || '---'}</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {answers.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-3xl border border-dashed border-slate-200">
            <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-bold">لا توجد إجابات مسجلة لهذا الطالب</p>
          </div>
        ) : (
          answers.map((ans, idx) => (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={ans.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-2 h-full ${ans.is_correct ? 'bg-emerald-500' : 'bg-red-500'}`} />
              
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">سؤال {idx + 1}</span>
                <span className={`px-3 py-1 rounded-lg text-xs font-bold ${ans.is_correct ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {ans.points_earned || 0} / {ans.question?.points || 0} نقطة
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-800 mb-6">{ans.question?.content}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-2xl ${ans.is_correct ? 'bg-emerald-50/50 border border-emerald-100' : 'bg-red-50/50 border border-red-100'}`}>
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">إجابة الطالب</p>
                  <p className="font-bold text-slate-700">{getStudentAnswerDisplay(ans)}</p>
                </div>
                
                {!ans.is_correct && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">الإجابة الصحيحة</p>
                    <p className="font-bold text-indigo-600">
                      {ans.question?.options?.find((o: any) => o.is_correct)?.content || 'تتطلب مراجعة معلم'}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

