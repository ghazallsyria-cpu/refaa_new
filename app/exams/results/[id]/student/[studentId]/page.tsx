'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle, Clock, BookOpen, User, Layout, AlertCircle } from 'lucide-react';
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
  const [attempt, setAttempt] = useState<any>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!examId || !studentId) return;
    try {
      setLoading(true);
      setError(null);
      const result = await fetchStudentExamResult(examId as string, studentId as string);
      
      if (!result || !result.exam) {
        setError("تعذر العثور على بيانات هذا الاختبار أو الطالب.");
        return;
      }

      setExam(result.exam);
      setStudent(result.student);
      setAttempt(result.attempt);
      setAnswers(result.answers || []);
    } catch (err: any) {
      console.error("Error in page:", err);
      setError("حدث خطأ أثناء محاولة جلب النتيجة.");
    } finally {
      setLoading(false);
    }
  }, [examId, studentId, fetchStudentExamResult]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin h-12 w-12 border-t-4 border-indigo-600 rounded-full"></div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <AlertCircle className="h-16 w-16 text-red-500" />
      <h2 className="text-2xl font-black text-slate-800">{error}</h2>
      <button onClick={() => router.back()} className="px-8 py-3 mt-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all">العودة للنتائج</button>
    </div>
  );

  // حساب حالة النجاح والرسوب بصرياً
  const maxScore = exam?.max_score || 100;
  const passingScore = exam?.passing_score || 50;
  const studentPercentage = attempt?.score !== undefined ? (attempt.score / maxScore) * 100 : 0;
  const isPassed = studentPercentage >= passingScore;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-10 pb-24" dir="rtl">
      <button onClick={() => router.back()} className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white border border-slate-100 text-slate-500 font-black hover:text-indigo-600 transition-all shadow-sm active:scale-95">
        <ArrowRight className="h-5 w-5" /> العودة للنتائج
      </button>

      <div className="glass-card p-10 rounded-[40px] border-t-[16px] border-t-indigo-600 shadow-2xl relative overflow-hidden bg-white">
        <div className="absolute top-0 left-0 p-8 opacity-5 text-indigo-900 pointer-events-none"><Layout size={120} /></div>
        <h1 className="text-4xl font-black text-slate-900 mb-8 relative z-10">{exam?.title || 'اختبار بدون عنوان'}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10">
          <div className="bg-indigo-50/50 p-6 rounded-[28px] border border-indigo-100">
            <span className="text-[10px] text-indigo-400 block font-black uppercase mb-1 flex items-center gap-2"><User size={12} /> اسم الطالب</span>
            <span className="text-xl font-black text-slate-800">{student?.full_name || 'طالب غير معروف'}</span>
          </div>
          <div className="bg-slate-50 p-6 rounded-[28px] border border-slate-100">
            <span className="text-[10px] text-slate-400 block font-black uppercase mb-1 flex items-center gap-2"><BookOpen size={12} /> المادة الدراسية</span>
            <span className="text-xl font-black text-slate-800">{exam?.subject_name || 'مادة عامة'}</span>
          </div>
          <div className={`p-6 rounded-[28px] border ${attempt ? (isPassed ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100') : 'bg-slate-50 border-slate-100'}`}>
            <span className={`text-[10px] block font-black uppercase mb-1 flex items-center gap-2 ${attempt ? (isPassed ? 'text-emerald-500' : 'text-red-500') : 'text-slate-400'}`}>
              <Clock size={12} /> الدرجة المكتسبة
            </span>
            <span className={`text-xl font-black ${attempt ? (isPassed ? 'text-emerald-600' : 'text-red-600') : 'text-slate-600'}`} dir="ltr">
              {attempt?.score !== undefined ? `${attempt.score} / ${maxScore}` : 'لم يتقدم'}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3"><CheckCircle className="text-indigo-500" /> إجابات الطالب بالتفصيل</h2>
        
        {(!answers || answers.length === 0) ? (
          <div className="text-center py-20 bg-white rounded-[40px] border border-dashed border-slate-200 text-slate-400 font-bold">
            لا توجد إجابات مسجلة لهذه المحاولة. (قد يكون الطالب لم يُجب على أي سؤال)
          </div>
        ) : (
          answers.map((ans, idx) => (
            <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} key={ans.id || idx} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl relative overflow-hidden transition-all hover:shadow-indigo-50">
              <div className={`absolute top-0 right-0 w-3 h-full ${ans.is_correct ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <div className="flex justify-between items-start mb-6">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-full">سؤال {idx + 1}</span>
                <div className={`px-4 py-2 rounded-xl text-sm font-black ${ans.is_correct ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  الدرجة: {ans.points_earned || 0} / {ans.question?.points || 0}
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-10">
                <div className="flex-1 space-y-6">
                  <h3 className="text-2xl font-black text-slate-800 leading-relaxed">{ans.question?.content || 'نص السؤال غير متوفر'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`p-6 rounded-[28px] border ${ans.is_correct ? 'bg-emerald-50/30 border-emerald-100' : 'bg-red-50/30 border-red-100'}`}>
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-2">إجابة الطالب</p>
                      <p className="text-lg font-black">
                        {ans.selected_option_id 
                          ? ans.question?.options?.find((o: any) => o.id === ans.selected_option_id)?.content 
                          : ans.text_answer || 'لم يتم الإجابة'}
                      </p>
                    </div>
                    {!ans.is_correct && (
                      <div className="p-6 rounded-[28px] bg-slate-50 border border-slate-100 shadow-inner">
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-2">الإجابة الصحيحة</p>
                        <p className="text-lg font-black text-indigo-600">
                          {ans.question?.options?.find((o: any) => o.is_correct)?.content || 'تتطلب تصحيحاً يدوياً'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                {ans.question?.media_url && typeof ans.question.media_url === 'string' && ans.question.media_url.trim() !== '' && (
                  <div className="relative w-full md:w-64 aspect-square rounded-3xl overflow-hidden border-2 border-slate-50 bg-slate-50">
                    <Image src={ans.question.media_url} alt="Question Image" fill className="object-contain" unoptimized />
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


