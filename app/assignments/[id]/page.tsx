'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { FileText, Clock, Link as LinkIcon, Users, User, CheckCircle, CheckCircle2, AlertCircle, ArrowRight, Upload, Edit2, Trash2, Share2, Eye, X, Calendar, Download, FileSpreadsheet, Trophy, ImageIcon, MessageSquare, Award, MinusCircle, XCircle, Target, Play, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import AssignmentForm from '@/components/assignment-form';
import AssignmentBuilder from '@/components/assignment-builder';
import ImageUpload from '@/components/ImageUpload';
import Image from 'next/image';
import { Question } from '@/types/question';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { useAssignmentsSystem } from '@/hooks/useAssignmentsSystem';
import { useAuth } from '@/context/auth-context';
import { RawAssignmentAnswer, AssignmentWithMeta, SubmissionWithStudent } from '@/types';

export default function AssignmentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const assignmentId = resolvedParams.id;
  
  const router = useRouter();
  const { user, authRole } = useAuth();
  const { fetchAssignmentDetails, submitAssignment, saveAssignment, deleteAssignment } = useAssignmentsSystem();
  
  const [assignment, setAssignment] = useState<AssignmentWithMeta | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionWithStudent[]>([]);
  const [mySubmission, setMySubmission] = useState<SubmissionWithStudent | null>(null);
  const [myAnswers, setMyAnswers] = useState<Record<string, string | string[] | null>>({});
  
  // 🚀 إضافة حالة لحفظ الإجابات الكاملة لكي نعرض التغذية الراجعة
  const [fullAnswersMap, setFullAnswersMap] = useState<Record<string, any>>({});
  
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);

  // Management State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'submissions' | 'preview'>('submissions');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editData, setEditData] = useState<Partial<AssignmentWithMeta>>({});

  // Submission Form State
  const [content, setContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const exportToExcel = () => { /* ... (Same as before) ... */ };
  const exportToPDF = () => { /* ... (Same as before) ... */ };

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (authRole === 'student') setStudentId(user.id);
      const details = await fetchAssignmentDetails(assignmentId);
      setAssignment(details.assignment);
      setEditData(details.assignment);
      if (details.questions) setQuestions(details.questions);

      if (authRole === 'student') {
        if (details.submission) {
          setMySubmission(details.submission as any);
          setContent((details.submission as any).content || '');
          setFileUrl((details.submission as any).file_url || '');

          if (details.answers) {
            const answersMap: Record<string, string | string[] | null> = {};
            const fullMap: Record<string, any> = {}; // لحفظ تفاصيل الدرجة والملاحظة
            
            details.answers.forEach((a) => {
              answersMap[a.question_id] = a.selected_options || a.answer_text;
              fullMap[a.question_id] = a;
            });
            setMyAnswers(answersMap);
            setFullAnswersMap(fullMap);
          }
        }
      } else if (['teacher', 'admin', 'management'].includes(authRole || '')) {
        setSubmissions(details.allSubmissions);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [assignmentId, user, authRole, fetchAssignmentDetails]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmitAnswers = async (answers: Record<string, string | string[] | null>) => {
    setIsSubmitting(true);
    try {
      const answersPayload: RawAssignmentAnswer[] = Object.entries(answers).map(([qId, value]) => {
        const question = questions.find(q => q.id === qId);
        const isMultiple = question?.type === 'multiple_choice' || question?.type === 'checkbox';
        return {
          question_id: qId,
          answer_text: isMultiple ? null : (value as string),
          selected_options: isMultiple ? (value as string[]) : null
        };
      });

      await submitAssignment(assignmentId, answersPayload, mySubmission?.id, content, fileUrl);
      showNotification('success', 'تم تسليم الواجب بنجاح!');
      await fetchData();
    } catch (error: any) {
      showNotification('error', 'حدث خطأ أثناء التسليم: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingEdit(true);
    try {
      const payload = { title: editData.title!, description: editData.description || null, due_date: new Date(editData.due_date!).toISOString() };
      const existingSectionIds = (assignment as any)?.assignment_sections?.map((s: any) => s.section_id) || [];
      await saveAssignment(payload, assignmentId, questions as any, existingSectionIds, []);
      showNotification('success', 'تم تحديث الواجب بنجاح');
      setIsEditModalOpen(false);
      await fetchData();
    } catch (error: any) {
      showNotification('error', 'خطأ في التحديث: ' + error.message);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteAssignmentAction = async () => {
    try {
      if (assignment?.file_url) await deleteFromCloudinary(assignment.file_url);
      await deleteAssignment(assignmentId);
      router.push('/assignments');
    } catch (error: any) {
      showNotification('error', 'خطأ في الحذف: ' + error.message);
    }
  };

  const copyAssignmentLink = () => {
    navigator.clipboard.writeText(window.location.href);
    showNotification('success', 'تم نسخ رابط الواجب');
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div></div>;
  }

  if (!assignment) {
    return <div className="text-center py-32"><h3 className="text-2xl font-black">الواجب غير موجود</h3></div>;
  }

  const dueDateObj = new Date(assignment.due_date);
  const isOverdue = dueDateObj < new Date();
  const firstSection = (assignment as any).assignment_sections?.[0]?.section;
  const className = firstSection?.class?.name || '';
  const sectionName = firstSection?.name || '';
  const isImageUrl = (url: string) => url?.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null || url?.includes('cloudinary.com/image');

  const isGraded = mySubmission?.status === 'graded';

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-24" dir="rtl">
      {/* ... [Header and Notification code remains exactly the same] ... */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-6">
        <div className="flex items-center gap-4">
          <Link href="/assignments" className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
            <ArrowRight className="h-6 w-6" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">{assignment.title}</h1>
              {new Date(assignment.due_date) < new Date() ? (
                <span className="px-3 py-1 bg-red-50 text-red-600 border border-red-100 rounded-full text-[10px] font-black uppercase tracking-wider">منتهي</span>
              ) : (
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-wider">نشط</span>
              )}
            </div>
            <p className="text-slate-500 font-medium mt-1">{(assignment as any).subject?.name} - {className} {sectionName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={copyAssignmentLink} className="h-12 px-4 rounded-2xl bg-white border border-slate-100 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-sm font-bold">
            <Share2 className="h-5 w-5" /> <span className="hidden sm:inline">مشاركة</span>
          </button>
          {['teacher', 'admin', 'management'].includes(authRole || '') && (
            <>
              <button onClick={() => setIsEditModalOpen(true)} className="h-12 px-6 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all flex items-center gap-2 font-black shadow-sm">
                <Edit2 className="h-5 w-5" /> <span>تعديل سريع</span>
              </button>
              <button onClick={() => setIsDeleteModalOpen(true)} className="h-12 w-12 flex items-center justify-center rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition-all shadow-sm">
                <Trash2 className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="glass-card rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white/60 overflow-hidden">
        <div className="p-8">
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-black ${isOverdue ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'}`}>
              <Clock className="h-5 w-5" />
              <span dir="ltr">آخر موعد: {format(dueDateObj, 'yyyy/MM/dd HH:mm')}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-50 text-slate-600 border border-slate-100 text-sm font-bold">
              <User className="h-5 w-5 text-slate-400" />
              <span>أ. {(assignment as any).teacher?.user?.full_name}</span>
            </div>
          </div>

          <div className="prose prose-slate max-w-none mb-8">
            <h3 className="text-xl font-bold text-slate-900 mb-4">وصف الواجب</h3>
            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap text-lg">{assignment.description || 'لا يوجد وصف إضافي.'}</p>
          </div>

          {assignment.file_url && (
            <div className="mt-8">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                المرفقات
              </h3>
              {isImageUrl(assignment.file_url) ? (
                <div className="relative w-full max-w-2xl h-auto min-h-[300px] bg-slate-50 rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm flex items-center justify-center p-2">
                  <Image src={assignment.file_url} alt="مرفق الواجب" width={800} height={600} className="object-contain rounded-2xl" referrerPolicy="no-referrer" unoptimized />
                </div>
              ) : (
                <div className="p-6 rounded-3xl bg-indigo-50/50 border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center shadow-sm"><FileText className="h-7 w-7 text-indigo-600" /></div>
                    <div>
                      <h4 className="font-bold text-slate-900">ملف مرفق</h4><p className="text-sm text-slate-500">انقر للتحميل</p>
                    </div>
                  </div>
                  <a href={assignment.file_url} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto h-12 px-8 rounded-2xl bg-indigo-600 text-sm font-black text-white shadow-md hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 active:scale-95">
                    <LinkIcon className="h-5 w-5" /> <span>تحميل المرفق</span>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {authRole === 'student' && (
        <div className="glass-card rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white/60 overflow-hidden">
          <div className="p-8 border-b border-slate-100/50 bg-slate-50/50">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                {isGraded ? <Trophy className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
              </div>
              {isGraded ? 'نتيجة الواجب والتغذية الراجعة' : 'تسليم الإجابة'}
            </h2>
          </div>
          <div className="p-8">
            
            {/* 🚀 عرض الدرجة والملاحظة العامة إذا كان مقيماً */}
            {isGraded && (
              <div className="mb-10 p-8 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
                   <div>
                     <h3 className="text-2xl font-black text-emerald-800 flex items-center gap-2 mb-2">
                       <CheckCircle2 className="w-8 h-8" /> تم التقييم بنجاح!
                     </h3>
                     <p className="text-emerald-600 font-bold">لقد قام معلمك بمراجعة الواجب. يمكنك الاطلاع على ملاحظاته التفصيلية بالأسفل.</p>
                   </div>
                   <div className="shrink-0 flex flex-col items-center bg-white px-8 py-5 rounded-2xl shadow-sm border border-emerald-100">
                     <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">الدرجة النهائية</span>
                     <div className="text-4xl font-black text-emerald-600">
                       {mySubmission.grade} <span className="text-lg opacity-50">/ {questions.reduce((acc, q) => acc + (Number(q.points)||0), 0) || 100}</span>
                     </div>
                   </div>
                </div>
                {mySubmission.feedback && (
                  <div className="mt-6 p-5 bg-white/60 backdrop-blur-sm rounded-2xl border border-emerald-200/50">
                    <p className="text-xs font-black text-emerald-700 mb-2 flex items-center gap-1.5"><MessageSquare className="w-4 h-4"/> ملاحظة المعلم العامة:</p>
                    <p className="text-slate-800 leading-relaxed font-bold text-lg">{mySubmission.feedback}</p>
                  </div>
                )}
              </div>
            )}

            {/* 🚀 السحر: عرض تفاصيل كل سؤال بملاحظته إذا كان مقيماً، وإلا يظهر الـ Form العادي للحل */}
            {isGraded && questions.length > 0 ? (
              <div className="space-y-6">
                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2 px-2">
                   <Target className="h-6 w-6 text-indigo-500" /> المراجعة التفصيلية لأسئلة الواجب
                </h3>
                
                {questions.map((q, idx) => {
                  const studentAns = myAnswers[q.id];
                  const answerDetails = fullAnswersMap[q.id]; // جلب تفاصيل التقييم للسؤال
                  
                  let studentAnswerText = studentAns;
                  if ((q.type === 'multiple_choice' || q.type === 'true_false' || q.type === 'checkbox') && q.options) {
                     const selectedOpt = (q.options as any[]).find(o => o.id === studentAns || o.content === studentAns);
                     if (selectedOpt) studentAnswerText = selectedOpt.content;
                     else if (Array.isArray(studentAns)) studentAnswerText = studentAns.join('، ');
                  }

                  const isUnanswered = !studentAnswerText;
                  const isCorrect = answerDetails?.is_correct;

                  return (
                    <div key={q.id} className={`bg-white rounded-3xl overflow-hidden shadow-sm border-2 transition-all hover:shadow-md ${isUnanswered ? 'border-slate-200' : isCorrect ? 'border-emerald-200' : 'border-rose-200'}`}>
                      {/* رأس السؤال */}
                      <div className="p-6 sm:p-8 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                        <div className="flex gap-4 items-start">
                          <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm ${isUnanswered ? 'bg-slate-200 text-slate-600' : isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {idx + 1}
                          </div>
                          <div className="pt-2">
                             <h3 className="font-bold text-xl text-slate-800 leading-relaxed">{(q as any).text || q.content}</h3>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white px-5 py-2.5 rounded-xl font-bold text-base border border-slate-200 shrink-0 shadow-sm">
                          <Award className="w-5 h-5 text-slate-400" />
                          <span className={isCorrect ? 'text-emerald-600' : 'text-slate-900'}>{answerDetails?.points_earned || 0}</span>
                          <span className="text-slate-300">/</span>
                          <span className="text-slate-500">{Number(q.points) || 0}</span>
                        </div>
                      </div>

                      {/* إجابة الطالب وملاحظة المعلم */}
                      <div className="p-6 sm:p-8">
                        <div className={`p-5 rounded-2xl border mb-4 ${isUnanswered ? 'bg-slate-50 border-slate-200 border-dashed' : isCorrect ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
                          <div className="text-sm font-black mb-3 flex items-center gap-2">
                            {isUnanswered ? <MinusCircle className="w-5 h-5 text-slate-400" /> : isCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-500"/> : <XCircle className="w-5 h-5 text-rose-500"/>}
                            <span className={isUnanswered ? 'text-slate-500' : isCorrect ? 'text-emerald-700' : 'text-rose-700'}>إجابتك:</span>
                          </div>
                          <p className={`text-lg font-bold whitespace-pre-wrap leading-relaxed ${isUnanswered ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                              {isUnanswered ? 'لم تقم بتقديم إجابة لهذا السؤال.' : studentAnswerText}
                          </p>
                        </div>

                        {/* ظهور ملاحظة المعلم المتألقة إذا وجدت */}
                        {answerDetails?.feedback && (
                          <div className="mt-4 p-5 rounded-2xl bg-indigo-50/80 border border-indigo-200/50 relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-1 h-full bg-indigo-500"></div>
                            <div className="text-xs font-black text-indigo-600 mb-2 flex items-center gap-1.5">
                                <MessageSquare className="w-4 h-4"/> رسالة من المعلم:
                            </div>
                            <p className="text-lg font-bold text-slate-800 leading-relaxed">{answerDetails.feedback}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* 🚀 إظهار الملف المرفق من الطالب في التقييم */}
                {(mySubmission?.content || mySubmission?.file_url) && (
                  <div className="mt-8 p-8 rounded-3xl bg-slate-50 border border-slate-200 shadow-sm">
                    <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                       <FileText className="h-6 w-6 text-indigo-500" /> المرفقات والنصوص الإضافية التي أرسلتها
                    </h3>
                    
                    {mySubmission?.content && (
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 mb-4">
                        <p className="text-slate-700 whitespace-pre-wrap font-bold text-lg leading-relaxed">{mySubmission.content}</p>
                      </div>
                    )}
                    {mySubmission?.file_url && (
                      <div className="relative w-full h-72 bg-white rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center p-2">
                        <Image src={mySubmission.file_url} alt="إجابة الطالب المرفقة" fill className="object-contain" referrerPolicy="no-referrer" unoptimized />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : questions.length > 0 ? (
              /* إذا لم يتم التقييم بعد، يظهر الفورم للحل أو العرض كـ ReadOnly */
              <AssignmentForm 
                questions={questions} 
                onSubmit={handleSubmitAnswers} 
                isSubmitting={isSubmitting}
                initialAnswers={myAnswers}
                readOnly={!!mySubmission}
              >
                <div className="glass-card p-8 rounded-4xl border border-white/60 shadow-xl shadow-slate-200/50 mt-8">
                  <label className="block text-base font-black text-slate-800 mb-4">نص الإجابة (اختياري)</label>
                  <textarea
                    rows={4}
                    className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all resize-none font-bold disabled:opacity-60 mb-6"
                    placeholder="إذا أردت إضافة ملاحظة نصية للمعلم..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={!!mySubmission}
                  />

                  <label className="block text-base font-black text-slate-800 mb-4">ملف الإجابة (ارفع صورة الحل هنا)</label>
                  {!mySubmission ? (
                    <ImageUpload
                      initialImageUrl={fileUrl}
                      onUploadSuccess={(url) => setFileUrl(url || '')}
                      label="ارفع صورة إجابتك أو ملف الحل"
                    />
                  ) : (
                    fileUrl && (
                      <div className="relative w-full h-64 mt-2 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center">
                        <Image src={fileUrl} alt="إجابة الطالب" fill className="object-contain" referrerPolicy="no-referrer" unoptimized />
                      </div>
                    )
                  )}
                </div>
              </AssignmentForm>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handleSubmitAnswers({}); }} className="space-y-8">
                <div className="glass-card p-8 rounded-4xl border border-white/60 shadow-xl shadow-slate-200/50">
                  <div>
                    <label className="block text-base font-black text-slate-800 mb-4">نص الإجابة (اختياري إذا كان هناك ملف)</label>
                    <textarea
                      rows={6}
                      className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all resize-none font-bold disabled:opacity-60"
                      placeholder="اكتب إجابتك هنا بالتفصيل..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      disabled={!!mySubmission}
                    />
                  </div>
                  
                  <div className="mt-8">
                    <label className="block text-base font-black text-slate-800 mb-4">صورة الواجب (ارفع حلك هنا إجباري إذا لم تكتب نصاً)</label>
                    {!mySubmission ? (
                      <ImageUpload
                        initialImageUrl={fileUrl}
                        onUploadSuccess={(url) => setFileUrl(url || '')}
                        label="ارفع صورة الحل الخاص بك"
                      />
                    ) : (
                      fileUrl && (
                        <div className="relative w-full h-64 mt-2 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center">
                          <Image src={fileUrl} alt="إجابة الطالب" fill className="object-contain" referrerPolicy="no-referrer" unoptimized />
                        </div>
                      )
                    )}
                  </div>
                </div>

                {!mySubmission && (
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting || (!content && !fileUrl)}
                      className="w-full flex justify-center items-center gap-3 rounded-2xl bg-indigo-600 px-8 py-5 text-lg font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <div className="h-6 w-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Send className="h-6 w-6" />
                      )}
                      إرسال وتأكيد التسليم
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}
      
      {/* ... [Teacher Tabs section remains the same] ... */}
      {(authRole === 'teacher' || authRole === 'admin' || authRole === 'management') && (
        <div className="space-y-8">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
            <button 
              onClick={() => setActiveTab('submissions')}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'submissions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Users className="h-4 w-4" />
              التسليمات
            </button>
            <button 
              onClick={() => setActiveTab('preview')}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'preview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Eye className="h-4 w-4" />
              معاينة الطالب
            </button>
          </div>

          {activeTab === 'submissions' ? (
            <div className="glass-card rounded-4xl shadow-xl shadow-slate-200/50 border border-white/60 overflow-hidden">
              <div className="p-8 border-b border-slate-100/50 bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                  <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                    <Users className="h-6 w-6" />
                  </div>
                  تسليمات الطلاب
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold border border-emerald-100 hover:bg-emerald-100 transition-all">
                    <FileSpreadsheet className="h-4 w-4" /> Excel
                  </button>
                  <button onClick={exportToPDF} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-xl font-bold border border-red-100 hover:bg-red-100 transition-all">
                    <Download className="h-4 w-4" /> PDF
                  </button>
                  <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100 text-sm font-bold text-slate-600">
                    الإجمالي: {submissions.length}
                  </div>
                </div>
              </div>
              
              <div className="p-0">
                {submissions.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium text-lg">لم يقم أي طالب بتسليم الواجب حتى الآن.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {submissions.map((sub) => {
                       const st = sub.student as any;
                       return (
                         <div key={sub.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                             <div className="flex items-center gap-4">
                               <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 border border-indigo-100">
                                 <User className="h-7 w-7" />
                               </div>
                               <div>
                                 <h3 className="font-black text-slate-900 text-lg">{st?.users?.full_name || 'طالب غير معروف'}</h3>
                                 <p className="text-sm font-bold text-slate-500 mt-1 flex items-center gap-2">
                                   <Clock className="h-4 w-4" />
                                   <span dir="ltr">{new Date(sub.submitted_at).toLocaleString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit' })}</span>
                                 </p>
                               </div>
                             </div>
                             <div className="flex items-center gap-3 justify-end border-t md:border-0 pt-4 md:pt-0 mt-2 md:mt-0 border-slate-100 w-full md:w-auto">
                               {sub.grade !== null && sub.grade !== undefined ? (
                                 <div className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-black flex items-center gap-2">
                                   <CheckCircle2 className="w-4 h-4" /> الدرجة: {sub.grade}
                                 </div>
                               ) : (
                                 <span className="px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-black animate-pulse">
                                   بانتظار التقييم
                                 </span>
                               )}
                               <Link 
                                 href={`/assignments/${assignmentId}/submissions/${sub.id}`}
                                 className="h-11 px-6 rounded-xl bg-slate-900 text-white text-sm font-black hover:bg-indigo-600 transition-all flex items-center shadow-md active:scale-95"
                               >
                                 تصحيح وتقييم
                               </Link>
                             </div>
                           </div>
                         </div>
                       );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              <div className="mb-8 p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700 text-sm font-bold flex items-center gap-3">
                <AlertCircle className="h-6 w-6 shrink-0" />
                هذه معاينة لما يراه الطالب في صفحة التسليم. لن يتم حفظ أي إجابات تقوم بإدخالها هنا.
              </div>
              {questions.length > 0 ? (
                <AssignmentForm 
                  questions={questions} 
                  onSubmit={() => showNotification('success', 'هذه معاينة فقط، لم يتم حفظ الإجابة')} 
                  readOnly={false}
                />
              ) : (
                <div className="glass-card p-12 rounded-4xl border border-white/60 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
                    <FileText className="h-10 w-10 text-slate-300" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">لا توجد أسئلة تفاعلية</h3>
                  <p className="text-slate-500 font-bold">هذا الواجب يعتمد على رفع ملف من قِبل الطالب. يمكنك إضافة أسئلة من خلال التعديل.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal & Edit Modal (Same as before) */}
      <Dialog.Root open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 animate-in fade-in duration-300" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-[2rem] bg-white p-8 shadow-2xl focus:outline-none animate-in zoom-in-95 duration-300" dir="rtl">
            <div className="h-16 w-16 bg-red-50 rounded-3xl flex items-center justify-center mb-6">
              <Trash2 className="h-8 w-8 text-red-500" />
            </div>
            <Dialog.Title className="text-2xl font-black text-slate-900 mb-2">تأكيد الحذف</Dialog.Title>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">هل أنت متأكد من رغبتك في حذف هذا الواجب نهائياً؟ سيتم مسح إجابات الطلاب.</p>
            <div className="flex justify-end gap-3">
              <Dialog.Close asChild>
                <button className="flex-1 rounded-2xl bg-slate-50 px-6 py-4 text-sm font-black text-slate-700 hover:bg-slate-100">إلغاء</button>
              </Dialog.Close>
              <button onClick={handleDeleteAssignmentAction} className="flex-1 rounded-2xl bg-red-600 px-6 py-4 text-sm font-black text-white shadow-xl hover:bg-red-700">تأكيد الحذف</button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 animate-in fade-in duration-300" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] rounded-[2rem] bg-white p-8 shadow-2xl focus:outline-none max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300 scrollbar-hide" dir="rtl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <Edit2 className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <Dialog.Title className="text-2xl font-black text-slate-900 tracking-tight">تعديل سريع للواجب</Dialog.Title>
                </div>
              </div>
              <Dialog.Close className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-400 transition-colors">
                <X className="h-6 w-6" />
              </Dialog.Close>
            </div>
            
            <form onSubmit={handleUpdateAssignment} className="space-y-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">عنوان الواجب <span className="text-red-500">*</span></label>
                  <input type="text" required className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 sm:text-sm font-bold" value={editData.title || ''} onChange={(e) => setEditData({...editData, title: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">الوصف والتفاصيل</label>
                  <textarea rows={4} className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 sm:text-sm font-bold resize-none" value={editData.description || ''} onChange={(e) => setEditData({...editData, description: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">تاريخ ووقت التسليم <span className="text-red-500">*</span></label>
                  <input type="datetime-local" required dir="ltr" className="block w-full rounded-2xl border-0 py-4 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 sm:text-sm font-bold text-left" value={editData.due_date ? new Date(new Date(editData.due_date).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ''} onChange={(e) => setEditData({...editData, due_date: e.target.value})} />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
                <Dialog.Close asChild><button type="button" className="rounded-2xl bg-slate-50 px-8 py-4 text-sm font-black text-slate-700 hover:bg-slate-100 transition-all active:scale-95">إلغاء</button></Dialog.Close>
                <button type="submit" disabled={isSubmittingEdit} className="rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-black text-white shadow-xl hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50">{isSubmittingEdit ? 'جاري الحفظ...' : 'حفظ التعديلات'}</button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
