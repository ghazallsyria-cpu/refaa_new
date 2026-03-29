'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowRight, BookOpen, Clock, CheckCircle, 
  XCircle, User, FileText, Award, HelpCircle, AlertCircle 
} from 'lucide-react';
import { motion } from 'motion/react';
import { useExamsSystem } from '@/hooks/useExamsSystem';

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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { exam: examData, student: studentData, attempt: attemptData, answers: answersData } = await fetchStudentExamResult(examId as string, studentId as string);
      
      setExam(examData);
      setStudent(studentData);
      setAttempt(attemptData);
      setAnswers(answersData);

    } catch (err) {
      console.error('Error fetching student exam result:', err);
    } finally {
      setLoading(false);
    }
  }, [examId, studentId, fetchStudentExamResult]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          <p className="text-slate-500 font-bold animate-pulse">جاري تحميل التقرير التفصيلي...</p>
        </div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="glass-card p-10 rounded-[3rem] text-center max-w-lg border border-slate-200 shadow-xl">
          <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-slate-400" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">الطالب لم يتقدم للاختبار</h2>
          <p className="text-slate-500 mb-8 font-medium">لا توجد محاولة مسجلة لهذا الطالب في هذا الاختبار حتى الآن.</p>
          <button 
            onClick={() => router.back()}
            className="flex items-center justify-center gap-2 w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-colors active:scale-95"
          >
            <ArrowRight className="h-5 w-5" />
            <span>العودة للنتائج</span>
          </button>
        </div>
      </div>
    );
  }

  const isPassed = attempt.score >= ((exam?.max_score || 100) / 2);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 pt-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Navigation */}
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-3 text-slate-500 hover:text-indigo-600 font-black transition-colors group bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100 w-fit"
        >
          <ArrowRight className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          <span>العودة لنتائج الطلاب</span>
        </button>

        {/* Student & Exam Header Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-[3rem] border border-white/60 shadow-2xl shadow-slate-200/50 overflow-hidden relative"
        >
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-indigo-500 to-violet-600 opacity-10" />
          
          <div className="p-8 sm:p-10 relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              
              <div className="flex items-center gap-6">
                <div className="h-20 w-20 rounded-3xl bg-indigo-100 flex items-center justify-center text-indigo-600 text-3xl font-black shadow-inner shrink-0 border-4 border-white">
                  {(student?.users as any)?.full_name?.charAt(0) || <User />}
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
                    {(student?.users as any)?.full_name || 'طالب غير معروف'}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-slate-500">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg">
                      <BookOpen className="h-4 w-4" />
                      {exam?.title}
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg">
                      <Clock className="h-4 w-4" />
                      {new Date(attempt.completed_at).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                </div>
              </div>

              <div className={`flex flex-col items-center justify-center p-6 rounded-3xl border-2 min-w-[160px] ${
                isPassed ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
              }`}>
                <p className={`text-xs font-black uppercase tracking-widest mb-1 ${isPassed ? 'text-emerald-600' : 'text-red-600'}`}>
                  {isPassed ? 'ناجح' : 'راسب'}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-black tracking-tighter ${isPassed ? 'text-emerald-700' : 'text-red-700'}`}>
                    {attempt.score}
                  </span>
                  <span className={`text-lg font-bold ${isPassed ? 'text-emerald-500' : 'text-red-500'}`}>
                    / {exam?.max_score || 100}
                  </span>
                </div>
              </div>

            </div>
          </div>
        </motion.div>

        {/* Answers List */}
        <div className="space-y-6">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 px-2">
            <FileText className="h-5 w-5 text-indigo-500" />
            التفاصيل والإجابات
          </h2>
          
          {answers.length === 0 ? (
            <div className="glass-card p-10 rounded-[2rem] text-center border border-white/60">
              <HelpCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-bold">لا توجد إجابات مسجلة لهذا الطالب في هذه المحاولة.</p>
            </div>
          ) : (
            answers.map((answer, index) => {
              const q = answer.question;
              if (!q) return null; // حماية ضد الأسئلة المحذوفة
              
              const isCorrect = answer.is_correct;
              
              // تحديد إجابة الطالب كنص مفهوم
              let studentAnswerText = 'لم يتم الإجابة';
              if (q.type === 'multi_select') {
                try {
                  const selectedIds = JSON.parse(answer.text_answer || '[]');
                  const selectedOptions = q.options
                    .filter((o: any) => selectedIds.includes(o.id))
                    .map((o: any) => o.content);
                  studentAnswerText = selectedOptions.length > 0 ? selectedOptions.join('، ') : 'لم يتم الإجابة';
                } catch (e) {
                  studentAnswerText = 'خطأ في قراءة الإجابة';
                }
              } else if (q.type === 'multiple_choice' || q.type === 'true_false') {
                studentAnswerText = q.options?.find((o: any) => o.id === answer.selected_option_id)?.content || 'لم يتم الإجابة';
              } else {
                studentAnswerText = answer.text_answer || 'لم يتم الإجابة';
              }

              // تحديد الإجابة الصحيحة النموذجية
              let correctAnswerText = '';
              if (q.type === 'multiple_choice' || q.type === 'true_false') {
                correctAnswerText = q.options?.find((o: any) => o.is_correct)?.content || 'غير محدد';
              } else if (q.type === 'multi_select') {
                correctAnswerText = q.options?.filter((o: any) => o.is_correct).map((o: any) => o.content).join('، ') || 'غير محدد';
              }

              return (
                <motion.div 
                  key={answer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`glass-card p-6 sm:p-8 rounded-[2rem] border-2 transition-all ${
                    isCorrect ? 'border-emerald-100 bg-emerald-50/20' : 'border-red-100 bg-red-50/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="px-3 py-1 rounded-lg bg-slate-800 text-white text-xs font-black tracking-widest">
                          سؤال {index + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded-md shadow-sm border border-slate-100">
                          {q.points || 1} درجات
                        </span>
                      </div>
                      <h3 className="font-black text-slate-800 text-lg leading-relaxed">
                        {q.content}
                      </h3>
                    </div>
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                      isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {isCorrect ? <CheckCircle className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                    </div>
                  </div>

                  <div className="space-y-3 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest sm:w-32 shrink-0 pt-1">
                        إجابة الطالب:
                      </span>
                      <p className={`font-bold text-base ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                        {studentAnswerText}
                      </p>
                    </div>

                    {!isCorrect && (q.type === 'multiple_choice' || q.type === 'true_false' || q.type === 'multi_select') && (
                      <div className="flex flex-col sm:flex-row sm:items-start gap-2 pt-3 border-t border-slate-50 mt-2">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest sm:w-32 shrink-0 pt-1">
                          الإجابة الصحيحة:
                        </span>
                        <p className="font-bold text-base text-slate-700">
                          {correctAnswerText}
                        </p>
                      </div>
                    )}
                    
                    {q.explanation && (
                      <div className="flex flex-col sm:flex-row sm:items-start gap-2 pt-3 border-t border-slate-50 mt-2">
                        <span className="text-xs font-black text-amber-400 uppercase tracking-widest sm:w-32 shrink-0 pt-1">
                          توضيح المعلم:
                        </span>
                        <p className="font-bold text-sm text-slate-500 italic bg-amber-50 px-3 py-2 rounded-xl">
                          {q.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}

