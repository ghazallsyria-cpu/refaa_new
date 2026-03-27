'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, Clock, CheckCircle, XCircle, AlertCircle, HelpCircle } from 'lucide-react';
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
    try {
      setLoading(true);
      const { exam: examData, student: studentData, attempt: attemptData, answers: answersData } = await fetchStudentExamResult(examId as string, studentId as string);

      setExam(examData);
      setStudent(studentData);
      setAnswers(answersData || []);

    } catch (err) {
      console.error('Error fetching student exam result:', err);
    } finally {
      setLoading(false);
    }
  }, [examId, studentId, fetchStudentExamResult]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // دالة مساعدة لاستخراج إجابة الطالب بشكل آمن
  const getStudentAnswer = (answer: any) => {
    if (!answer) return 'لم يتم الإجابة';
    
    if (answer.question?.type === 'multi_select' || answer.question?.type === 'checkbox') {
      try {
        const parsed = JSON.parse(answer.text_answer || '[]');
        if (Array.isArray(parsed)) {
          // قد تكون الإجابات نصوص مباشرة أو معرفات (IDs)
          return parsed.join('، ') || 'لم يتم الإجابة';
        }
      } catch (e) {
        return answer.text_answer || 'لم يتم الإجابة';
      }
    }
    
    return answer.text_answer || 
      answer.question?.options?.find((o: any) => o.id === answer.selected_option_id)?.content || 
      'لم يتم الإجابة';
  };

  // دالة مساعدة لاستخراج الإجابة النموذجية بشكل آمن
  const getCorrectAnswer = (question: any) => {
    if (!question?.options || question.options.length === 0) return 'تقييم يدوي / نص مفتوح';
    
    if (question.type === 'multi_select' || question.type === 'checkbox') {
      const correctOpts = question.options.filter((o: any) => o.is_correct).map((o: any) => o.content);
      return correctOpts.length > 0 ? correctOpts.join('، ') : 'غير محدد';
    }
    
    return question.options.find((o: any) => o.is_correct)?.content || 'غير محدد';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-10 pb-24">
      {/* Header and Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white border border-slate-100 text-slate-500 hover:text-indigo-600 hover:shadow-lg transition-all active:scale-95 font-bold w-fit"
        >
          <ArrowRight className="h-5 w-5" />
          <span>العودة للنتائج</span>
        </button>
      </div>

      {/* Student & Exam Info Card */}
      <div className="glass-card rounded-[40px] border-t-[16px] border-t-indigo-600 border border-white/60 shadow-2xl shadow-slate-200/50 p-10 space-y-6 relative overflow-hidden">
        <div className="absolute -left-20 -bottom-20 h-64 w-64 bg-indigo-50/50 rounded-full blur-3xl -z-10" />
        
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{exam?.title}</h1>
            <div className="flex items-center gap-3 text-slate-500 font-bold">
              <BookOpen className="h-5 w-5 text-indigo-400" />
              <span>{exam?.subject?.name || 'مادة غير محددة'}</span>
            </div>
          </div>
          <div className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-center min-w-[150px]">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">الطالب</p>
            <p className="text-lg font-black text-slate-800 tracking-tight">
              {(student?.users as any)?.full_name || student?.full_name || 'طالب غير معروف'}
            </p>
          </div>
        </div>
      </div>

      {/* Answers List */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <HelpCircle className="h-6 w-6 text-slate-400" />
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">مراجعة الإجابات</h2>
        </div>

        {answers.length === 0 ? (
          <div className="glass-card p-12 text-center rounded-4xl border border-white/60">
            <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-lg font-bold text-slate-500">لا توجد إجابات مسجلة لهذا الطالب في هذا الاختبار.</p>
          </div>
        ) : (
          answers.map((answer, index) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              key={answer.id} 
              className={`glass-card p-8 rounded-4xl border ${
                answer.is_correct ? 'border-emerald-200 ring-1 ring-emerald-50' : 'border-red-200 ring-1 ring-red-50'
              } shadow-xl shadow-slate-200/40 relative overflow-hidden`}
            >
              <div className="flex gap-6 items-start">
                {/* Status Icon */}
                <div className={`mt-1 shrink-0 h-10 w-10 flex items-center justify-center rounded-2xl ${
                  answer.is_correct ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                }`}>
                  {answer.is_correct ? <CheckCircle className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                </div>

                <div className="flex-1 space-y-6">
                  {/* Question Content */}
                  <div>
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">
                      سؤال {index + 1}
                    </span>
                    <h3 className="font-black text-xl text-slate-900 leading-relaxed">
                      {answer.question?.content || 'نص السؤال غير متوفر'}
                    </h3>
                  </div>

                  {/* Answer Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-5 rounded-2xl border ${
                      answer.is_correct ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'
                    }`}>
                      <p className={`text-xs font-black uppercase tracking-widest mb-2 ${
                        answer.is_correct ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        إجابة الطالب
                      </p>
                      <p className="text-lg font-bold text-slate-800">
                        {getStudentAnswer(answer)}
                      </p>
                    </div>

                    {!answer.is_correct && (
                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                          الإجابة الصحيحة
                        </p>
                        <p className="text-lg font-bold text-slate-800">
                          {getCorrectAnswer(answer.question)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

