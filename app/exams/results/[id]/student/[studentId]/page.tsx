'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, Clock, CheckCircle2, XCircle, Trophy, User, Check, AlertCircle, Edit3, Save } from 'lucide-react';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import { useAuth } from '@/context/auth-context';

export default function StudentExamResult() {
  const params = useParams();
  const router = useRouter();
  const { authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  
  const examId = params.id as string;
  const studentId = params.studentId as string; 
  
  const { fetchStudentExamResult, gradeAnswer } = useExamsSystem();
  
  const [exam, setExam] = useState<any>({});
  const [student, setStudent] = useState<any>({});
  const [attempt, setAttempt] = useState<any>({});
  const [answers, setAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // حالة (State) لتتبع إدخال الدرجات اليدوية
  const [gradingState, setGradingState] = useState<Record<string, { points: number, isSubmitting: boolean }>>({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchStudentExamResult(examId, studentId);
      if (data) {
        setExam(data.exam || {});
        setStudent(data.student || {});
        setAttempt(data.attempt || {});
        setAnswers(data.answers || []);
        
        // تجهيز القيم المبدئية للدرجات
        const initialGrading: any = {};
        (data.answers || []).forEach(ans => {
           initialGrading[ans.question_id] = { points: ans.points_earned || 0, isSubmitting: false };
        });
        setGradingState(initialGrading);
      }
    } catch (err) {
      console.error('Error fetching student exam result:', err);
    } finally {
      setLoading(false);
    }
  }, [examId, studentId, fetchStudentExamResult]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveGrade = async (questionId: string) => {
    if (!attempt?.id) return;
    
    const newPoints = gradingState[questionId].points;
    setGradingState(prev => ({ ...prev, [questionId]: { ...prev[questionId], isSubmitting: true } }));
    
    try {
      await gradeAnswer(attempt.id, questionId, newPoints);
      // إعادة تحميل البيانات بعد التصحيح لتحديث النتيجة النهائية
      await fetchData(); 
      alert('تم حفظ الدرجة بنجاح وتحديث النتيجة النهائية!');
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء حفظ الدرجة');
    } finally {
      setGradingState(prev => ({ ...prev, [questionId]: { ...prev[questionId], isSubmitting: false } }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const totalEarned = answers.reduce((sum, ans) => sum + (ans?.points_earned || 0), 0);
  const maxScore = exam?.total_marks || exam?.max_score || answers.reduce((sum, ans) => sum + (ans?.question?.points || 0), 0) || 0;

  const renderStudentAnswer = (answer: any) => {
    if (!answer) return 'بدون إجابة';
    const question = answer.question;
    if (!question) return answer.text_answer || 'بدون إجابة';

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
    return 'هذا السؤال مقالي ويُقيّم يدوياً من قبل المعلم';
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8 pb-24" dir="rtl">
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
                <span>{student?.users?.full_name || student?.full_name || 'طالب'}</span>
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
            {attempt?.score !== undefined ? attempt.score : totalEarned} <span className="text-2xl text-indigo-200 font-bold">/ {maxScore}</span>
          </div>
        </div>
      </div>

      {/* Answers List */}
      <div className="space-y-6 mt-8">
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 mb-6">
          <BookOpen className="h-6 w-6 text-indigo-600" />
          تفاصيل الإجابات {currentRole === 'teacher' && '(وضع التصحيح)'}
        </h2>

        {answers && answers.length > 0 ? answers.map((answer, index) => {
          const question = answer?.question;
          const isCorrect = answer?.is_correct;
          const isManual = question?.type === 'open' || question?.type === 'essay' || question?.type === 'paragraph' || question?.type === 'fill_in_blank';

          return (
            <div 
              key={answer?.id || index} 
              className={`bg-white rounded-3xl overflow-hidden shadow-lg shadow-slate-100 border transition-all ${
                isManual && attempt?.status !== 'graded' ? 'border-amber-200 border-r-4 border-r-amber-400' :
                isManual ? 'border-indigo-100 border-r-4 border-r-indigo-400' : 
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
                  <div className="flex items-center gap-1.5 bg-slate-50 px-4 py-1.5 rounded-xl font-black text-sm text-slate-600 border border-slate-100">
                    <span>{answer?.points_earned || 0}</span>
                    <span className="text-slate-400">/</span>
                    <span>{question?.points || 0} نقطة</span>
                  </div>
                </div>

                {(question?.mediaUrl || question?.media_url) && (
                  <div className="mb-8 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center max-w-2xl mx-auto p-2">
                    <img 
                      src={question.mediaUrl || question.media_url} 
                      alt="صورة السؤال" 
                      className="max-h-80 w-auto object-contain rounded-xl shadow-sm"
                    />
                  </div>
                )}

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
                    <p className="text-lg font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {renderStudentAnswer(answer)}
                    </p>
                  </div>

                  {/* الإجابة النموذجية أو واجهة التصحيح للمعلم */}
                  {(!isCorrect || isManual) && (
                    <div className="p-5 rounded-2xl border bg-slate-50 border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Check className="h-5 w-5 text-slate-500" />
                        <span className="text-sm font-black text-slate-700">
                           {isManual ? 'التصحيح اليدوي (للمعلم)' : 'الإجابة النموذجية'}
                        </span>
                      </div>
                      
                      {/* عرض الإجابة النموذجية إذا كان السؤال اختياراً */}
                      {!isManual && (
                        <p className="text-lg font-bold text-slate-800 leading-relaxed">
                          {renderCorrectAnswer(question)}
                        </p>
                      )}

                      {/* ✅ واجهة التصحيح اليدوي للمعلم (تظهر للمعلم فقط وفي الأسئلة المقالية) */}
                      {isManual && currentRole === 'teacher' && question && gradingState[question.id] && (
                        <div className="mt-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-4">
                          <div className="flex-1 flex items-center gap-3 w-full">
                            <label className="text-sm font-bold text-slate-600 whitespace-nowrap">قيّم الإجابة:</label>
                            <input 
                              type="number" 
                              min="0" 
                              max={question.points}
                              value={gradingState[question.id].points}
                              onChange={(e) => setGradingState(prev => ({ ...prev, [question.id]: { ...prev[question.id], points: Number(e.target.value) } }))}
                              className="w-20 p-2 text-center rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 font-bold"
                            />
                            <span className="text-sm text-slate-500 font-medium">من {question.points}</span>
                          </div>
                          
                          <button 
                            onClick={() => handleSaveGrade(question.id)}
                            disabled={gradingState[question.id].isSubmitting}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
                          >
                            {gradingState[question.id].isSubmitting ? 'جاري الحفظ...' : 'حفظ الدرجة'}
                            {!gradingState[question.id].isSubmitting && <Save className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                      
                      {isManual && currentRole === 'student' && (
                        <p className="text-sm font-bold text-slate-500 mt-2">
                           يتم تقييم هذا السؤال من قبل المعلم.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <AlertCircle className="h-16 w-16 text-amber-400 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-slate-800 mb-2">لا توجد إجابات مسجلة لهذا الاختبار</h3>
            <p className="text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
              يبدو أن الطالب فتح الاختبار ولم يقم بحفظ إجاباته بشكل صحيح.<br/>
              <strong className="text-indigo-600 mt-2 block">يرجى حذف هذه النتيجة (المحاولة) من لوحة تحكم المعلم ليتمكن الطالب من الإعادة.</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


