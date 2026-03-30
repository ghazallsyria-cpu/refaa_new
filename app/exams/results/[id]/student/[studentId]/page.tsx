'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, Clock, CheckCircle2, XCircle, Trophy, User, Check, AlertCircle } from 'lucide-react';
import { useExamsSystem } from '@/hooks/useExamsSystem';

export default function StudentExamResult() {
  const params = useParams();
  const router = useRouter();
  
  const examId = params.id as string;
  const studentId = params.studentId as string; 
  
  const { fetchStudentExamResult } = useExamsSystem();
  const [exam, setExam] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { exam: examData, student: studentData, attempt: attemptData, answers: answersData } = await fetchStudentExamResult(examId, studentId);
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
      <div className="flex items-center justify-center min-h-screen">
         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const totalEarned = answers.reduce((sum, ans) => sum + (ans.points_earned || 0), 0);
  const maxScore = exam?.total_marks || exam?.max_score || answers.reduce((sum, ans) => sum + (ans.question?.points || 0), 0);

  const renderStudentAnswer = (answer: any) => {
    const question = answer.question;
    if (!question) return 'السؤال محذوف';

    if (question.type === 'multiple_choice' || question.type === 'true_false') {
      const selected = question.options?.find((o: any) => o.id === answer.selected_option_id);
      return selected?.content || answer.text_answer || 'لم يتم الإجابة';
    }
    
    if (question.type === 'multi_select') {
      try {
        const selectedIds = JSON.parse(answer.text_answer || '[]');
        const selectedText = question.options?.filter((o: any) => selectedIds.includes(o.id)).map((o: any) => o.content).join('، ');
        return selectedText || 'لم يتم الإجابة';
      } catch {
        return 'لم يتم الإجابة';
      }
    }
    
    return answer.text_answer || 'لم يتم الإجابة';
  };

  const renderCorrectAnswer = (question: any) => {
    if (!question) return '';
    if (question.type === 'multiple_choice' || question.type === 'true_false') {
      return question.options?.find((o: any) => o.is_correct)?.content || 'غير محدد';
    }
    if (question.type === 'multi_select') {
      return question.options?.filter((o: any) => o.is_correct).map((o: any) => o.content).join('، ') || 'غير محدد';
    }
    return 'تُقيّم يدوياً من قبل المعلم';
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8 pb-24" dir="rtl">
      {/* Header & Back Button */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100"
        >
          <ArrowRight className="h-5 w-5" />
          العودة
        </button>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">{exam?.title || 'نتائج الاختبار'}</h1>
            <div className="flex items-center gap-4 mt-6 text-slate-600 font-bold">
              <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl">
                <User className="h-5 w-5 text-indigo-500" />
                <span>{(student?.users as any)?.full_name || 'طالب'}</span>
              </div>
              {attempt?.status && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${attempt.status === 'graded' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  <CheckCircle2 className="h-5 w-5" />
                  <span>{attempt.status === 'graded' ? 'تم التقييم' : 'قيد التقييم'}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-3xl shadow-xl shadow-indigo-200 flex flex-col items-center justify-center text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <Trophy className="h-10 w-10 text-yellow-300 mb-3 relative z-10" />
          <div className="text-sm font-bold text-indigo-100 mb-1 relative z-10">النتيجة النهائية</div>
          <div className="text-5xl font-black tracking-tighter relative z-10">
            {attempt?.score !== undefined ? attempt.score : totalEarned} <span className="text-2xl text-indigo-200 font-bold">/ {maxScore || 0}</span>
          </div>
        </div>
      </div>

      {/* Answers List */}
      <div className="space-y-6 mt-8">
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 mb-6">
          <BookOpen className="h-6 w-6 text-indigo-600" />
          تفاصيل الإجابات
        </h2>

        {answers.map((answer, index) => {
          const question = answer.question;
          const isCorrect = answer.is_correct;
          const isManual = question?.type === 'open' || question?.type === 'paragraph';

          return (
            <div 
              key={answer.id} 
              className={`bg-white rounded-3xl overflow-hidden shadow-lg shadow-slate-100 border transition-all ${
                isManual ? 'border-slate-200 border-r-4 border-r-slate-400' : 
                isCorrect ? 'border-emerald-100 border-r-4 border-r-emerald-500' : 
                'border-red-100 border-r-4 border-r-red-500'
              }`}
            >
              <div className="p-6 sm:p-8">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                  <h3 className="font-black text-xl text-slate-800 flex items-center gap-3">
                    <span className="flex items-center justify-center bg-slate-100 w-10 h-10 rounded-xl text-indigo-600 text-sm">
                      {index + 1}
                    </span>
                    {question?.content || 'نص السؤال غير متوفر'}
                  </h3>
                  <div className="flex items-center gap-1.5 bg-slate-50 px-4 py-1.5 rounded-xl font-black text-sm text-slate-600">
                    <span>{answer.points_earned || 0}</span>
                    <span className="text-slate-400">/</span>
                    <span>{question?.points || 0} نقطة</span>
                  </div>
                </div>

                {/* ✅ عرض الصورة إذا كانت موجودة */}
                {question?.mediaUrl || question?.media_url ? (
                  <div className="mb-8 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center max-w-2xl mx-auto p-2">
                    <img 
                      src={question.mediaUrl || question.media_url} 
                      alt="صورة مرفقة بالسؤال" 
                      className="max-h-80 w-auto object-contain rounded-xl shadow-sm"
                    />
                  </div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* إجابة الطالب */}
                  <div className={`p-5 rounded-2xl border ${
                    isManual ? 'bg-slate-50 border-slate-200' :
                    isCorrect ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      {isManual ? <User className="h-5 w-5 text-slate-500" /> :
                       isCorrect ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : 
                       <XCircle className="h-5 w-5 text-red-600" />}
                      <span className={`text-sm font-black ${
                        isManual ? 'text-slate-700' :
                        isCorrect ? 'text-emerald-700' : 'text-red-700'
                      }`}>إجابة الطالب</span>
                    </div>
                    <p className="text-lg font-bold text-slate-800 leading-relaxed">
                      {renderStudentAnswer(answer)}
                    </p>
                  </div>

                  {/* الإجابة الصحيحة */}
                  {(!isCorrect || isManual) && question?.type !== 'open' && question?.type !== 'paragraph' && (
                    <div className="p-5 rounded-2xl border bg-slate-50 border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Check className="h-5 w-5 text-slate-500" />
                        <span className="text-sm font-black text-slate-700">الإجابة النموذجية</span>
                      </div>
                      <p className="text-lg font-bold text-slate-800 leading-relaxed">
                        {renderCorrectAnswer(question)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* ✅ رسالة توضيحية ذكية في حال عدم وجود إجابات */}
        {answers.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <AlertCircle className="h-16 w-16 text-amber-400 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-slate-800 mb-2">لا توجد إجابات مسجلة لهذا الاختبار</h3>
            <p className="text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
              إذا كنت قد قدمت هذا الاختبار وحصلت على النتيجة 0، فهذا يعني أنك قدمته أثناء وجود تحديثات في النظام ولم تحفظ إجاباتك. 
              <br/> <strong className="text-indigo-600 mt-2 block">يرجى من المعلم حذف هذه المحاولة لكي تعيد الاختبار!</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


