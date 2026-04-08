'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { ArrowRight, User, Calendar, Clock, CheckCircle, AlertCircle, Save, MessageSquare, Star, FileText, Link as LinkIcon, Eye, Edit, CheckCircle2, XCircle, Columns, MinusCircle, Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAssignmentsSystem } from '@/hooks/useAssignmentsSystem';
import { useAuth } from '@/context/auth-context';

// 🚀 إضافة دالة معالجة المعادلات الكيميائية والرياضية للواجبات
const renderContentWithMath = (content: string) => {
   if (!content) return { __html: '' };
   let html = content.replace(
     /\$\$([\s\S]*?)\$\$/g, 
     '<span class="math-tex text-indigo-700 bg-indigo-50 px-2 py-1 rounded font-mono font-bold mx-1 shadow-sm inline-block max-w-full break-words whitespace-pre-wrap" dir="ltr" style="word-break: break-word; overflow-wrap: anywhere;">$1</span>'
   );
   return { __html: html };
};

export default function GradingPage({ params }: { params: Promise<{ id: string, submissionId: string }> }) {
  const { id: assignmentId, submissionId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { fetchSubmissionDetails, updateSubmissionGrade } = useAssignmentsSystem();
  
  const [assignment, setAssignment] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [questionGrades, setQuestionGrades] = useState<Record<string, { isCorrect: boolean | null, pointsEarned: number, feedback: string }>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [grade, setGrade] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const details = await fetchSubmissionDetails(submissionId);
      if (details.assignment) setAssignment(details.assignment);
      if (details.questions) setQuestions(details.questions);

      if (details.submission) {
        setSubmission(details.submission);
        setGrade(details.submission.grade?.toString() || '');
        setFeedback(details.submission.feedback || '');

        if (details.answers) {
          const answersMap: Record<string, any> = {};
          const gradesMap: Record<string, any> = {};
          
          details.answers.forEach((a: any) => {
            let finalAns = a.answer_text;
            if (a.selected_options !== null && a.selected_options !== undefined) {
               finalAns = a.selected_options;
            }
            
            answersMap[a.question_id] = finalAns;
            
            let isCorrectVal = null;
            if (a.is_correct === true || a.is_correct === false) {
                isCorrectVal = a.is_correct;
            } else if (Number(a.points_earned) > 0) {
                isCorrectVal = true;
            }

            gradesMap[a.question_id] = { 
               isCorrect: isCorrectVal, 
               pointsEarned: Number(a.points_earned) || 0, 
               feedback: a.feedback || '' 
            };
          });
          setAnswers(answersMap);
          setQuestionGrades(gradesMap);
        }
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, [submissionId, fetchSubmissionDetails]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (questions.length > 0 && Object.keys(questionGrades).length > 0) {
      let total = 0;
      Object.values(questionGrades).forEach(g => { total += (Number(g.pointsEarned) || 0); });
      setGrade(total.toString());
    }
  }, [questionGrades, questions.length]);

  const handleSaveGrade = async () => {
    if (grade === '') { setNotification({ type: 'error', message: 'يرجى إدخال الدرجة' }); return; }
    setIsSaving(true);
    try {
      if (!user) throw new Error('Not authenticated');
      const numericGrade = parseFloat(grade);
      
      const answersGrading = Object.entries(questionGrades).map(([qId, data]) => ({
         questionId: qId, 
         isCorrect: data.isCorrect !== null ? data.isCorrect : false,
         pointsEarned: data.pointsEarned, 
         feedback: data.feedback
      }));

      await updateSubmissionGrade(submissionId, numericGrade, feedback, submission?.student_id || '', assignment?.title || '', answersGrading);
      setNotification({ type: 'success', message: 'تم حفظ التقييم بنجاح' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setNotification({ type: 'error', message: 'خطأ في الحفظ: ' + error.message });
    } finally { setIsSaving(false); }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;

  const studentName = submission?.student?.users?.full_name || submission?.student?.user?.full_name || 'طالب غير معروف';

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans" dir="rtl">
      {notification && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-lg font-bold text-white flex items-center gap-2 ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {notification.message}
        </div>
      )}

      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/assignments/${assignmentId}`} className="p-2.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all text-slate-500 border border-slate-200"><ArrowRight className="h-5 w-5" /></Link>
            <div>
              <h1 className="text-xl font-black text-slate-900">تقييم إجابة الطالب</h1>
              <p className="text-xs font-bold text-slate-500">{assignment?.title}</p>
            </div>
          </div>
          <button onClick={handleSaveGrade} disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-black text-white hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-70 shadow-md">
            {isSaving ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="h-4 w-4" />} حفظ التقييم
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm bg-white">
             <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
               <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100"><User className="h-7 w-7" /></div>
               <div>
                 <h2 className="text-xl font-black text-slate-900">{studentName}</h2>
                 <p className="text-xs font-bold text-slate-500 mt-1">تم التسليم: {new Date(submission?.submitted_at || '').toLocaleString('ar-EG')}</p>
               </div>
             </div>

             <div className="mt-8 space-y-8">
               {questions.map((q, idx) => {
                 const isHeader = q.type === 'section_header';
                 const isComparison = q.type === 'comparison';
                 const studentAns = answers[q.id];
                 const qGrade = questionGrades[q.id] || { isCorrect: null, pointsEarned: 0, feedback: '' };
                 const safeOptions = q.options && Array.isArray(q.options) ? q.options : [];

                 if (isHeader) {
                   return (
                     <div key={q.id} className="pt-6 pb-2 border-b-2 border-indigo-100">
                        <h3 className="text-2xl font-black text-indigo-900 leading-relaxed" dangerouslySetInnerHTML={renderContentWithMath(q.content || q.text)} />
                        {q.media_url && <img src={q.media_url} className="mt-4 max-h-64 rounded-xl border border-slate-200" alt="مرفق" />}
                     </div>
                   );
                 }

                 let studentAnswerText = studentAns;
                 let isUnanswered = false;

                 if (q.type === 'multiple_choice' || q.type === 'true_false' || q.type === 'checkbox') {
                    if (studentAns === undefined || studentAns === null || studentAns === '' || (Array.isArray(studentAns) && studentAns.length === 0)) {
                       isUnanswered = true;
                    } else {
                       let normalizedAns: string[] = [];
                       if (Array.isArray(studentAns)) {
                         normalizedAns = studentAns.map(String);
                       } else if (typeof studentAns === 'string') {
                         try {
                           const parsed = JSON.parse(studentAns);
                           normalizedAns = Array.isArray(parsed) ? parsed.map(String) : [String(studentAns)];
                         } catch {
                           normalizedAns = [String(studentAns)];
                         }
                       } else {
                         normalizedAns = [String(studentAns)];
                       }

                       const matchedOptions = safeOptions.filter((o: any) => {
                         const optId = String(o.id);
                         const optContent = String(o.content || o.text || o);
                         return normalizedAns.includes(optId) || normalizedAns.includes(optContent) || normalizedAns.includes(String(o));
                       });

                       if (matchedOptions.length > 0) {
                         studentAnswerText = matchedOptions.map((o: any) => o.content || o.text || o).join('، ');
                       } else {
                         studentAnswerText = normalizedAns.join('، ');
                       }
                    }
                 } else if (isComparison) {
                    isUnanswered = !studentAnswerText || studentAnswerText === '[]' || studentAnswerText === '';
                 } else {
                    isUnanswered = !studentAnswerText || studentAnswerText === '';
                 }

                 return (
                   <div key={q.id} className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-200 group transition-all">
                     <div className="p-5 sm:p-8 bg-slate-50/80 border-b border-slate-100 flex items-start gap-4">
                       <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black shadow-sm shrink-0">{idx + 1}</div>
                       <div className="flex-1 pt-1">
                          <h4 className="text-lg font-bold text-slate-800 leading-relaxed" dangerouslySetInnerHTML={renderContentWithMath(q.content || q.text)} />
                          {q.media_url && <img src={q.media_url} className="mt-4 max-h-64 rounded-xl border border-slate-200 shadow-sm" alt="صورة توضيحية" />}
                       </div>
                     </div>

                     <div className="p-5 sm:p-8 border-b border-slate-100 bg-white">
                        <div className="text-sm font-black text-slate-400 mb-3 flex items-center gap-2"><User className="w-4 h-4" /> إجابة الطالب:</div>
                        
                        {isComparison ? (
                          <div className="rounded-2xl border border-slate-300 overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                              <table className="w-full text-right border-collapse min-w-[600px]">
                                <thead>
                                  <tr className="bg-indigo-50">
                                    <th className="p-4 border-b border-l border-slate-300 font-black text-indigo-900 text-sm w-1/3">وجه المقارنة</th>
                                    <th className="p-4 border-b border-l border-slate-300 font-black text-indigo-900 text-sm text-center w-1/3">{safeOptions[0] || 'الطرف الأول'}</th>
                                    <th className="p-4 border-b border-slate-300 font-black text-indigo-900 text-sm text-center w-1/3">{safeOptions[1] || 'الطرف الثاني'}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {safeOptions.slice(2).map((aspect: string, rIdx: number) => {
                                    let parsedAns: any[] = [];
                                    try { 
                                      if (typeof studentAns === 'string') parsedAns = JSON.parse(studentAns || '[]'); 
                                      else if (Array.isArray(studentAns)) parsedAns = studentAns;
                                    } catch(e){}
                                    return (
                                      <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 border-b border-l border-slate-200 font-bold text-slate-700 bg-slate-50 align-top" dangerouslySetInnerHTML={renderContentWithMath(aspect)} />
                                        <td className="p-4 border-b border-l border-slate-200 font-bold text-indigo-900 align-top whitespace-pre-wrap">
                                          {parsedAns[rIdx]?.[0] ? <span dangerouslySetInnerHTML={renderContentWithMath(parsedAns[rIdx][0])} /> : <span className="text-slate-300 italic">فارغ</span>}
                                        </td>
                                        <td className="p-4 border-b border-slate-200 font-bold text-indigo-900 align-top whitespace-pre-wrap">
                                          {parsedAns[rIdx]?.[1] ? <span dangerouslySetInnerHTML={renderContentWithMath(parsedAns[rIdx][1])} /> : <span className="text-slate-300 italic">فارغ</span>}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <div className={`p-5 rounded-2xl border font-bold text-lg leading-relaxed ${!isUnanswered ? 'bg-indigo-50/50 border-indigo-100 text-indigo-900 shadow-inner' : 'bg-slate-50 border-dashed border-slate-300 text-slate-400 italic'}`}>
                            {isUnanswered 
                               ? 'لم يجب الطالب على هذا السؤال.' 
                               : <div dangerouslySetInnerHTML={renderContentWithMath(typeof studentAnswerText === 'object' && studentAnswerText !== null ? JSON.stringify(studentAnswerText) : String(studentAnswerText))} />
                            }
                          </div>
                        )}
                     </div>

                     <div className="p-5 sm:p-8 bg-slate-50 border-t-4 border-indigo-100">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mb-4">
                           <div className="sm:col-span-7 flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200">
                              <button onClick={() => setQuestionGrades(p => ({...p, [q.id]: {...p[q.id], isCorrect: true, pointsEarned: Number(q.points) || 0}}))} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${qGrade.isCorrect === true ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'}`}>
                                <CheckCircle2 className="w-4 h-4" /> صحيح
                              </button>
                              <button onClick={() => setQuestionGrades(p => ({...p, [q.id]: {...p[q.id], isCorrect: false, pointsEarned: 0}}))} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${qGrade.isCorrect === false ? 'bg-red-500 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-600'}`}>
                                <XCircle className="w-4 h-4" /> خاطئ
                              </button>
                           </div>
                           <div className="sm:col-span-5 flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-200">
                              <span className="text-xs font-black text-slate-500 px-3">الدرجة:</span>
                              <div className="flex items-center gap-2">
                                <input type="number" min="0" max={q.points} value={qGrade.pointsEarned === 0 && qGrade.isCorrect !== true ? '' : qGrade.pointsEarned} onChange={e => setQuestionGrades(p => ({...p, [q.id]: {...p[q.id], pointsEarned: Number(e.target.value)}}))} className="w-16 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center font-black text-indigo-700 outline-none focus:border-indigo-500" />
                                <span className="text-xs font-black text-slate-400 pl-3">/ {q.points}</span>
                              </div>
                           </div>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 focus-within:border-indigo-500 overflow-hidden">
                           <textarea rows={2} placeholder="ملاحظة مخصصة لهذه الإجابة لتوضيح الخطأ للطالب..." value={qGrade.feedback} onChange={e => setQuestionGrades(p => ({...p, [q.id]: {...p[q.id], feedback: e.target.value}}))} className="w-full bg-transparent border-none focus:ring-0 p-4 text-sm font-bold text-slate-700 resize-none outline-none" />
                        </div>
                     </div>
                   </div>
                 );
               })}
             </div>
          </div>

          {(submission?.content || submission?.file_url) && (
            <div className="glass-card p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm bg-white mt-8">
              <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                 <FileText className="h-6 w-6 text-indigo-500" /> المرفقات والنصوص الإضافية
              </h3>
              
              {submission?.content && (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-6">
                  <div className="text-slate-800 whitespace-pre-wrap font-bold text-lg leading-relaxed" dangerouslySetInnerHTML={renderContentWithMath(submission.content)} />
                </div>
              )}
              
              {submission?.file_url && (
                <div className="relative w-full h-auto min-h-[300px] bg-slate-50 rounded-[2rem] border border-slate-200 overflow-hidden flex flex-col items-center justify-center p-4">
                  {submission.file_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null || submission.file_url.includes('cloudinary.com/image') ? (
                    <img src={submission.file_url} alt="مرفق الطالب" className="max-h-[600px] w-auto object-contain rounded-xl shadow-sm" />
                  ) : (
                    <a href={submission.file_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-4 text-indigo-600 hover:text-indigo-800">
                       <FileText className="h-16 w-16" />
                       <span className="font-black underline">تحميل الملف المرفق</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Column: Final Grading Panel */}
        <div className="space-y-6">
          <div className="glass-card p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 sticky top-28 bg-white">
            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
              <Star className="h-6 w-6 text-amber-500" /> النتيجة النهائية
            </h3>
            <div className="space-y-8">
              <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 relative overflow-hidden">
                <label className="block text-sm font-black text-indigo-800 mb-3 relative z-10">المجموع (تلقائي)</label>
                <div className="relative z-10 flex items-center gap-4">
                  <input type="number" className="block w-full rounded-2xl border-2 border-indigo-200 py-4 px-4 text-indigo-700 text-4xl font-black text-center outline-none bg-white" value={grade} onChange={(e) => setGrade(e.target.value)} />
                  <div className="shrink-0 bg-indigo-600 px-4 py-4 rounded-2xl text-center shadow-md">
                    <span className="block text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">من</span>
                    <span className="block font-black text-2xl text-white">{questions.reduce((acc, q) => acc + (Number(q.points)||0), 0)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-slate-400" /> التقييم العام (يظهر للطالب)
                </label>
                <textarea rows={5} className="block w-full rounded-2xl border border-slate-200 py-4 px-5 bg-slate-50 focus:bg-white resize-none font-bold outline-none leading-relaxed" placeholder="اكتب تقييماً عاماً لأداء الطالب..." value={feedback} onChange={(e) => setFeedback(e.target.value)} />
              </div>

              <div className="pt-2">
                <button onClick={handleSaveGrade} disabled={isSaving} className="w-full flex justify-center items-center gap-3 rounded-2xl bg-slate-900 px-8 py-5 text-lg font-black text-white hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-70 shadow-lg">
                  {isSaving ? <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <CheckCircle2 className="h-6 w-6" />}
                  اعتماد وحفظ النتيجة
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
