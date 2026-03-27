'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
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
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [examId, studentId, fetchStudentExamResult]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="flex items-center justify-center min-h-screen">جاري التحميل...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold">
        <ArrowRight className="h-5 w-5" /> العودة للنتائج
      </button>

      <div className="glass-card p-8 rounded-[32px] border-t-8 border-indigo-600 shadow-xl">
        <h1 className="text-3xl font-black text-slate-900">{exam?.title}</h1>
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-400 block font-bold">الطالب</span>
            <span className="font-black text-slate-700">{student?.full_name || 'اسم غير متوفر'}</span>
          </div>
          <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-400 block font-bold">المادة</span>
            {/* هنا سيظهر اسم المادة الآن بشكل صحيح */}
            <span className="font-black text-slate-700">{exam?.subject_name}</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {answers.map((ans, idx) => (
          <div key={ans.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4">{ans.question?.content}</h3>
            <div className={`p-4 rounded-2xl ${ans.is_correct ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              <p className="text-xs font-bold uppercase mb-1">إجابة الطالب:</p>
              <p className="font-black">
                {ans.selected_option_id 
                  ? ans.question?.options?.find((o: any) => o.id === ans.selected_option_id)?.content 
                  : ans.text_answer || 'لم يتم الإجابة'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

