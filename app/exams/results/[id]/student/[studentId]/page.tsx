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
      
      setExam(result.exam);
      setStudent(result.student);
      setAttempt(result.attempt);
      setAnswers(result.answers);
    } catch (err: any) {
      console.error("Error loading result data:", err);
      setError("حدث خطأ أثناء تحميل بيانات النتيجة.");
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
      <button onClick={() => router.back()} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold">العودة</button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-10 pb-24" dir="rtl">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white border border-slate-100 text-slate-500 font-black hover:text-indigo-600 transition-all shadow-sm active:scale-95">
          <ArrowRight className="h-5 w-5" /> العودة للنتائج
        </button>
      </div>

      {/* بطاقة الرأس المحدثة */}
      <div className="glass-card p-10 rounded-[40px] border-t-[16px] border-t-indigo-600 shadow-2xl relative overflow-hidden bg-white transition-all hover:shadow-indigo-100">
        <div className="absolute top-0 left-0 p-8 opacity-5 text-indigo-900 pointer-events-none">
          <Layout size={120} />
        </div>
        
        <div className="relative z-10">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight mb-8">
            {exam?.title}
          </h1>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* اسم الطالب - الآن مضمون الظهور */}
            <div className="bg-indigo-50/50 px-6 py-5 rounded-[28px] border border-indigo-100 shadow-sm">
              <span className="text-[10px] text-indigo-400 block font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                <User size={12} className="text-indigo-500" /> اسم الطالب
              </span>
              <span className="text-xl font-black text-slate-800">
                {student?.full_name}
              </span>
            </div>

            {/* المادة الدراسية */}
            <div className="bg-slate-50 px-6 py-5 rounded-[28px] border border-slate-100 shadow-sm">
              <span className="text-[10px] text-slate-400 block font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                <BookOpen size={12} className="text-slate-500" /> المادة الدراسية
              </span>
              <span className="text-xl font-black text-slate-800">
                {exam?.subject_name}
              </span>
            </div>

            {/* نتيجة المحاولة */}
            <div className="bg-slate-50 px-6 py-5 rounded-[28px] border border-slate-100 shadow-sm">
              <span className="text-[10px] text-slate-400 block font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                <Clock size={12} className="text-slate-500" /> الدرجة النهائية
              </span>
              <span className="text-xl font-black text-emerald-600">
                {attempt?.score}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* قسم الإجابات */}
      <div className="space-y-8">
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
          <CheckCircle className="text-emerald-500" /> تفاصيل إجابات الطالب
        </h2>
        
        {!answers || answers.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[40px] border border-dashed border-slate-200 text-slate-400">
             <AlertCircle className="mx-auto h-12 w-12 mb-4 opacity-20" />
             <p className="text-xl font-bold">لا توجد إجابات مسجلة لهذه المحاولة.</p>
          </div>
        ) : (
          answers.map((ans, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }}
              key={ans.id} 
              className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl relative overflow-hidden transition-all hover:-translate-y-1"
            >
              <div className={`absolute top-0 right-0 w-3 h-full ${ans.is_correct ? 'bg-emerald-500' : 'bg-red-500'}`} />
              
              <div className="flex justify-between items-start mb-6">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-full">سؤال {idx + 1}</span>
                <div className={`px-4 py-2 rounded-2xl text-sm font-black flex items-center gap-2 ${ans.is_correct ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                   {ans.is_correct ? 'إجابة صحيحة' : 'إجابة خاطئة'}
                   <span className="w-1 h-1 rounded-full bg-current opacity-30" />
                   الدرجة: {ans.points_earned || 0} / {ans.question?.points || 0}
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-10 items-start">
                <div className="flex-1 space-y-6">
                  <h3 className="text-2xl font-black text-slate-800 leading-relaxed">
                    {ans.question?.content}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* إجابة الطالب */}
                    <div className={`p-6 rounded-[28px] border ${ans.is_correct ? 'bg-emerald-50/30 border-emerald-100' : 'bg-red-50/30 border-red-100'}`}>
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-2">إجابة الطالب</p>
                      <p className="text-lg font-black text-slate-800">
                        {ans.selected_option_id 
                          ? (ans.question?.options?.find((o: any) => o.id === ans.selected_option_id)?.content || 'لم يتم العثور على الخيار')
                          : (ans.text_answer || 'لم يتم تقديم إجابة')}
                      </p>
                    </div>
                    
                    {/* الإجابة الصحيحة (تظهر في حال الخطأ) */}
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

                {/* صورة السؤال (إن وجدت) */}
                {ans.question?.media_url && (
                  <div className="relative w-full md:w-64 aspect-square rounded-3xl overflow-hidden border-4 border-slate-50 shadow-lg bg-slate-50 group">
                    <Image 
                      src={ans.question.media_url} 
                      alt="سؤال مصور" 
                      fill 
                      className="object-contain cursor-zoom-in transition-transform duration-300 group-hover:scale-105" 
                      unoptimized 
                      onClick={() => window.open(ans.question.media_url, '_blank')} 
                    />
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

