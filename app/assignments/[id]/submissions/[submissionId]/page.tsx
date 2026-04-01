'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { ArrowRight, User, Calendar, Clock, CheckCircle, AlertCircle, Save, MessageSquare, Star, FileText, Link as LinkIcon, Eye, Edit, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Question } from '@/types/question';
import { useAssignmentsSystem } from '@/hooks/useAssignmentsSystem';
import { useAuth } from '@/context/auth-context';
import { SubmissionWithStudent, Assignment } from '@/types';

export default function GradingPage({ params }: { params: Promise<{ id: string, submissionId: string }> }) {
  const { id: assignmentId, submissionId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { fetchSubmissionDetails, updateSubmissionGrade } = useAssignmentsSystem();
  
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  
  // 🚀 حالة جديدة لحفظ تقييم كل سؤال على حدة
  const [questionGrades, setQuestionGrades] = useState<Record<string, { isCorrect: boolean, pointsEarned: number, feedback: string }>>({});
  
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [grade, setGrade] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const details = await fetchSubmissionDetails(submissionId);
      
      if (details.assignment) setAssignment(details.assignment as any);
      if (details.questions) setQuestions(details.questions);

      if (details.submission) {
        setSubmission(details.submission);
        setGrade(details.submission.grade?.toString() || '');
        setFeedback(details.submission.feedback || '');

        if (details.answers) {
          const answersMap: Record<string, any> = {};
          const gradesMap: Record<string, any> = {};
          
          details.answers.forEach((a: any) => {
            answersMap[a.question_id] = a.selected_options || a.answer_text;
            gradesMap[a.question_id] = {
               isCorrect: a.is_correct || false,
               pointsEarned: a.points_earned || 0,
               feedback: a.feedback || ''
            };
          });
          
          setAnswers(answersMap);
          setQuestionGrades(gradesMap);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [submissionId, fetchSubmissionDetails]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 🚀 الجمع التلقائي المبهر: عندما يعدل المعلم درجة سؤال، يتحدث المجموع فوراً!
  useEffect(() => {
    if (questions.length > 0 && Object.keys(questionGrades).length > 0) {
      let total = 0;
      Object.values(questionGrades).forEach(g => {
         total += (Number(g.pointsEarned) || 0);
      });
      setGrade(total.toString());
    }
  }, [questionGrades, questions.length]);

  const handleSaveGrade = async () => {
    if (grade === '') {
      setNotification({ type: 'error', message: 'يرجى إدخال الدرجة النهائية' });
      return;
    }

    setIsSaving(true);
    try {
      if (!user) throw new Error('Not authenticated');
      
      const numericGrade = parseFloat(grade);
      if (isNaN(numericGrade)) {
        setNotification({ type: 'error', message: 'يرجى إدخال درجة صحيحة' });
        return;
      }

      // تجهيز مصفوفة التقييمات الفردية
      const answersGrading = Object.entries(questionGrades).map(([qId, data]) => ({
         questionId: qId,
         isCorrect: data.isCorrect,
         pointsEarned: data.pointsEarned,
         feedback: data.feedback
      }));

      await updateSubmissionGrade(
        submissionId, 
        numericGrade, 
        feedback, 
        submission?.student_id || '', 
        assignment?.title || '',
        answersGrading
      );

      setNotification({ type: 'success', message: 'تم حفظ التقييم بنجاح وإشعار الطالب' });
      setTimeout(() => setNotification(null), 3000);
      
    } catch (error: any) {
      setNotification({ type: 'error', message: 'خطأ في الحفظ: ' + error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const studentName = submission?.student?.users?.full_name || submission?.student?.user?.full_name || 'طالب غير معروف';

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans" dir="rtl">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href={`/assignments/${assignmentId}`}
              className="p-2.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all text-slate-500 border border-slate-200 hover:border-indigo-200"
            >
              <ArrowRight className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">تقييم إجابة الطالب</h1>
              <p className="text-xs font-bold text-slate-500 mt-0.5">{assignment?.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveGrade}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-black text-white hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-70 shadow-md shadow-indigo-200"
            >
              {isSaving ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Save className="h-4 w-4" />
              )}
              حفظ التقييم
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Answers & Uploads */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* بيانات التسليم */}
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm bg-white">
            <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
              <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm">
                <User className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">{studentName}</h2>
                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    {new Date(submission?.submitted_at || '').toLocaleDateString('ar-EG')}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    {new Date(submission?.submitted_at || '').toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>

            {(submission?.content || submission?.file_url) && (
              <div className="bg-slate-50/80 border border-slate-200 rounded-3xl p-6 mt-8 shadow-sm">
                <h3 className="text-lg font-black text-slate-900 mb-5 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  مرفقات الطالب الإضافية
                </h3>
                
                {submission?.content && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 mb-4 shadow-sm">
                    <p className="text-slate-700 whitespace-pre-wrap font-bold leading-relaxed">{submission.content}</p>
                  </div>
                )}

                {submission?.file_url && (
                  <a 
                    href={submission.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-2xl hover:bg-indigo-100 hover:border-indigo-200 transition-colors group shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                        <LinkIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-black text-indigo-900">صورة/ملف إجابة الطالب</p>
                        <p className="text-xs text-indigo-600 font-bold mt-1">انقر لفتح الملف ومراجعة الإجابة</p>
                      </div>
                    </div>
                    <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
                      <Eye className="h-5 w-5" />
                    </div>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* 🚀 أدوات تصحيح الأسئلة الفردية (التحفة الفنية) */}
          {questions.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-4 px-2">
                <Star className="h-6 w-6 text-amber-500" /> مراجعة وتقييم الأسئلة التفصيلي
              </h3>
              
              {questions.map((q, idx) => {
                const studentAns = answers[q.id];
                const qGrade = questionGrades[q.id] || { isCorrect: false, pointsEarned: 0, feedback: '' };
                
                let studentAnswerText = studentAns;
                if ((q.type === 'multiple_choice' || q.type === 'true_false' || q.type === 'checkbox') && q.options) {
                   const selectedOpt = (q.options as any[]).find(o => o.id === studentAns || o.content === studentAns);
                   if (selectedOpt) studentAnswerText = selectedOpt.content;
                   else if (Array.isArray(studentAns)) studentAnswerText = studentAns.join('، ');
                }

                return (
                  <div key={q.id} className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-200 group transition-all hover:shadow-md">
                     {/* Question Header */}
                     <div className="p-5 sm:p-8 bg-slate-50/80 border-b border-slate-100 flex items-start gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xl shrink-0 shadow-sm">
                         {idx + 1}
                       </div>
                       <div className="flex-1 pt-1">
                          <h4 className="text-lg font-bold text-slate-800 leading-relaxed">{(q as any).text || q.content}</h4>
                          <span className="inline-block px-3 py-1 bg-white border border-slate-200 text-slate-500 rounded-lg text-xs font-black mt-3 shadow-sm">
                            الدرجة المخصصة: {q.points} نقاط
                          </span>
                       </div>
                     </div>

                     {/* Student Answer */}
                     <div className="p-5 sm:p-8 border-b border-slate-100 bg-white">
                       <div className="text-sm font-black text-slate-400 mb-3 flex items-center gap-2">
                          <User className="w-4 h-4" /> إجابة الطالب:
                       </div>
                       <div className={`p-5 rounded-2xl border font-bold text-lg leading-relaxed ${studentAnswerText ? 'bg-indigo-50/50 border-indigo-100 text-indigo-900' : 'bg-slate-50 border-dashed border-slate-300 text-slate-400 italic'}`}>
                         {studentAnswerText || 'لم يقم الطالب بتقديم إجابة لهذا السؤال.'}
                       </div>
                     </div>

                     {/* Teacher Grading Tools */}
                     <div className="p-5 sm:p-8 bg-slate-50 border-t-4 border-indigo-100">
                        <div className="text-sm font-black text-slate-600 mb-4 flex items-center gap-2">
                          <Edit className="w-4 h-4" /> لوحة التحكم بالدرجة والملاحظات:
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mb-4">
                           {/* Correct/Incorrect Toggle */}
                           <div className="sm:col-span-7 flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                              <button 
                                onClick={() => setQuestionGrades(p => ({...p, [q.id]: {...p[q.id], isCorrect: true, pointsEarned: q.points}}))}
                                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${qGrade.isCorrect ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'bg-slate-50 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'}`}
                              >
                                <CheckCircle2 className="w-4 h-4" /> صحيح
                              </button>
                              <button 
                                onClick={() => setQuestionGrades(p => ({...p, [q.id]: {...p[q.id], isCorrect: false, pointsEarned: 0}}))}
                                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${!qGrade.isCorrect ? 'bg-red-500 text-white shadow-md shadow-red-200' : 'bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-600'}`}
                              >
                                <XCircle className="w-4 h-4" /> خاطئ
                              </button>
                           </div>
                           
                           {/* Points Earned */}
                           <div className="sm:col-span-5 flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                              <span className="text-xs font-black text-slate-500 px-3">النقاط الممنوحة:</span>
                              <div className="flex items-center gap-2">
                                <input 
                                  type="number" 
                                  min="0" max={q.points}
                                  value={qGrade.pointsEarned === 0 ? '' : qGrade.pointsEarned}
                                  onChange={e => setQuestionGrades(p => ({...p, [q.id]: {...p[q.id], pointsEarned: Number(e.target.value)}}))}
                                  placeholder="0"
                                  className="w-16 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center font-black text-indigo-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                                />
                                <span className="text-xs font-black text-slate-400 pl-3">/ {q.points}</span>
                              </div>
                           </div>
                        </div>

                        {/* Teacher Feedback Note */}
                        <div className="bg-white rounded-2xl border border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all shadow-sm overflow-hidden">
                           <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                             <MessageSquare className="w-4 h-4 text-slate-400" />
                             <span className="text-xs font-bold text-slate-500">رسالة للطالب حول هذه الإجابة تحديداً (اختياري)</span>
                           </div>
                           <textarea 
                             rows={3}
                             placeholder="اشرح للطالب سبب الخطأ، أو قدم له تعزيزاً إيجابياً إذا كانت إجابته مميزة..."
                             value={qGrade.feedback}
                             onChange={e => setQuestionGrades(p => ({...p, [q.id]: {...p[q.id], feedback: e.target.value}}))}
                             className="w-full bg-transparent border-none focus:ring-0 p-4 text-sm font-bold text-slate-700 resize-none outline-none leading-relaxed"
                           />
                        </div>
                     </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column: Final Grading Panel */}
        <div className="space-y-6">
          <div className="glass-card p-6 sm:p-8 rounded-4xl border border-slate-200 shadow-xl shadow-slate-200/50 sticky top-28 bg-white">
            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
              <Star className="h-6 w-6 text-amber-500" />
              النتيجة النهائية
            </h3>

            <div className="space-y-8">
              <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/50 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <label className="block text-sm font-black text-indigo-800 mb-3 relative z-10">مجموع الدرجات المحتسبة (تلقائي)</label>
                <div className="relative z-10 flex items-center gap-4">
                  <input
                    type="number"
                    className="block w-full rounded-2xl border-2 border-indigo-200 py-4 px-4 text-indigo-700 bg-white focus:ring-4 focus:ring-indigo-100 text-4xl font-black text-center shadow-inner transition-all outline-none"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="0"
                  />
                  <div className="shrink-0 bg-indigo-600 px-4 py-4 rounded-2xl shadow-md text-center">
                    <span className="block text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">من أصل</span>
                    <span className="block font-black text-2xl text-white">{questions.reduce((acc, q) => acc + (Number(q.points)||0), 0) || 100}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-slate-400" />
                  التقييم العام للواجب (يظهر في تقرير الطالب)
                </label>
                <textarea
                  rows={5}
                  className="block w-full rounded-2xl border border-slate-200 py-4 px-5 text-slate-900 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 sm:text-sm transition-all resize-none font-bold outline-none leading-relaxed"
                  placeholder="اكتب خلاصة وتقييماً عاماً لأداء الطالب في هذا الواجب..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveGrade}
                  disabled={isSaving}
                  className="w-full flex justify-center items-center gap-3 rounded-2xl bg-slate-900 px-8 py-5 text-lg font-black text-white shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-70 group"
                >
                  {isSaving ? (
                    <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <CheckCircle2 className="h-6 w-6 group-hover:scale-110 transition-transform" />
                  )}
                  اعتماد النتيجة وإشعار الطالب
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {notification && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className={`p-5 rounded-2xl flex items-center gap-4 border shadow-lg ${
                  notification.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-200' : 'bg-red-500 text-white border-red-400 shadow-red-200'
                }`}
              >
                <div className="bg-white/20 p-2 rounded-xl shrink-0">
                  {notification.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                </div>
                <span className="font-black text-sm">{notification.message}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
