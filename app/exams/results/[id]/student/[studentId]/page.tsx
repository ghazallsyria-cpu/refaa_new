'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import Image from 'next/image';

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
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [examId, studentId, fetchStudentExamResult]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-12 w-12 border-t-4 border-indigo-600 rounded-full"></div></div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-10 pb-24" dir="rtl">
      <button onClick={() => router.back()} className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white border border-slate-100 text-slate-500 font-black shadow-sm"><ArrowRight className="h-5 w-5" /> العودة للنتائج</button>
      <div className="glass-card p-10 rounded-[40px] border-t-[16px] border-t-indigo-600 shadow-2xl">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">{exam?.title}</h1>
        <div className="mt-8 flex flex-wrap gap-6">
          <div className="bg-slate-50 px-6 py-4 rounded-[24px] border border-slate-100 min-w-[200px]"><span className="text-[10px] text-slate-400 block font-black mb-1">الطالب</span><span className="text-xl font-black text-slate-700">{student?.full_name || 'غير معروف'}</span></div>
          <div className="bg-slate-50 px-6 py-4 rounded-[24px] border border-slate-100 min-w-[150px]"><span className="text-[10px] text-slate-400 block font-black mb-1">المادة</span><span className="text-xl font-black text-slate-700">{exam?.subject_name}</span></div>
        </div>
      </div>
      <div className="space-y-8">
        {answers.map((ans, idx) => (
          <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} key={ans.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-3 h-full ${ans.is_correct ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <div className="flex justify-between items-start mb-6"><span className="text-xs font-black text-slate-400 uppercase">سؤال {idx + 1}</span><span className={`px-4 py-2 rounded-xl text-sm font-black ${ans.is_correct ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>الدرجة: {ans.points_earned || 0} / {ans.question?.points || 0}</span></div>
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-1 space-y-6">
                <h3 className="text-2xl font-black text-slate-800">{ans.question?.content}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={`p-6 rounded-[28px] ${ans.is_correct ? 'bg-emerald-50/50' : 'bg-red-50/50'}`}><p className="text-[10px] font-black uppercase text-slate-400 mb-2">إجابة الطالب</p><p className="text-lg font-black">{ans.selected_option_id ? ans.question?.options?.find((o: any) => o.id === ans.selected_option_id)?.content : ans.text_answer || 'لم يتم الإجابة'}</p></div>
                  {!ans.is_correct && <div className="p-6 rounded-[28px] bg-slate-50"><p className="text-[10px] font-black uppercase text-slate-400 mb-2">الإجابة الصحيحة</p><p className="text-lg font-black text-indigo-600">{ans.question?.options?.find((o: any) => o.is_correct)?.content || 'تتطلب تقييماً يدوياً'}</p></div>}
                </div>
              </div>
              {ans.question?.media_url && (
                <div className="relative w-full md:w-64 aspect-square rounded-3xl overflow-hidden border-2 border-slate-50 shadow-lg bg-white">
                  <Image src={ans.question.media_url} alt="Question" fill className="object-contain" unoptimized />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

