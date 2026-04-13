'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { FileText, Clock, Link as LinkIcon, Users, User, CheckCircle, CheckCircle2, AlertCircle, ArrowRight, Upload, Edit2, Trash2, Share2, Eye, X, Calendar, Download, FileSpreadsheet, Trophy, ImageIcon, MessageSquare, Award, MinusCircle, XCircle, Target, Play, Send, AlertTriangle, Filter } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { RawAssignmentAnswer, AssignmentWithMeta, SubmissionWithStudent } from '@/types';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import AssignmentForm from '@/components/assignment-form';
import ImageUpload from '@/components/ImageUpload';
import * as XLSX from 'xlsx';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { useAssignmentsSystem } from '@/hooks/useAssignmentsSystem';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';

export default function AssignmentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const assignmentId = resolvedParams.id;
  
  const router = useRouter();
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  
  const { fetchAssignmentDetails, submitAssignment, saveAssignment, deleteAssignment, deleteSubmission } = useAssignmentsSystem();
  
  const [assignment, setAssignment] = useState<AssignmentWithMeta | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionWithStudent[]>([]);
  const [mySubmission, setMySubmission] = useState<SubmissionWithStudent | null>(null);
  const [myAnswers, setMyAnswers] = useState<Record<string, string | string[] | null>>({});
  
  const [fullAnswersMap, setFullAnswersMap] = useState<Record<string, any>>({});
  
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [submissionToDelete, setSubmissionToDelete] = useState<string | null>(null);
  const [isDeletingSubmission, setIsDeletingSubmission] = useState(false);

  const [activeTab, setActiveTab] = useState<'submissions' | 'preview'>('submissions');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editData, setEditData] = useState<Partial<AssignmentWithMeta>>({});

  const [content, setContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const [selectedSection, setSelectedSection] = useState<string>('الكل');

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const getStudentSectionName = (studentObj: any) => {
    if (!studentObj || (!studentObj.sections && !studentObj.section)) return 'بدون فصل';
    
    const sectionData = studentObj.sections || studentObj.section;
    const sec = Array.isArray(sectionData) ? sectionData[0] : sectionData;
    if (!sec) return 'بدون فصل';

    const sectionName = sec.name || '';
    
    const classData = sec.classes || sec.class;
    const cls = Array.isArray(classData) ? classData[0] : classData;
    const className = cls?.name || '';

    if (className && sectionName) return `${className} - ${sectionName}`;
    if (sectionName) return sectionName;
    return 'بدون فصل';
  };

  const uniqueSections = Array.from(new Set(submissions.map(sub => getStudentSectionName(sub.student)))).filter(Boolean);

  const filteredSubmissions = selectedSection === 'الكل' 
     ? submissions 
     : submissions.filter(sub => getStudentSectionName(sub.student) === selectedSection);

  const exportToExcel = () => {
    const maxScore = questions.reduce((acc, q) => acc + (Number(q.points) || 0), 0) || 100;
    
    const csvData = filteredSubmissions.map(sub => {
       const name = sub.student?.user?.full_name || (sub.student as any)?.users?.full_name || 'طالب مجهول';
       const section = getStudentSectionName(sub.student); 
       const isGraded = sub.status === 'graded' || String(sub.status) === 'completed';
       const score = isGraded ? (sub.grade || 0) : 'قيد المراجعة';
       const status = isGraded ? 'مقيّم' : 'يحتاج تصحيح';
       const date = new Date(sub.submitted_at || (sub as any).created_at).toLocaleString('ar-EG');
       
       return {
         'اسم الطالب': name,
         'الفصل': section,
         'الدرجة': score,
         'العلامة الكاملة': maxScore,
         'الحالة': status,
         'تاريخ التسليم': date
       };
    });

    const worksheet = XLSX.utils.json_to_sheet(csvData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "التسليمات");
    XLSX.writeFile(workbook, `تسليمات_${assignment?.title || 'الواجب'}_${selectedSection}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showNotification('error', 'يرجى السماح بالنوافذ المنبثقة (Pop-ups) لطباعة الكشف.');
      return;
    }

    const maxScore = questions.reduce((acc, q) => acc + (Number(q.points) || 0), 0) || 100;
    const gradedSubs = filteredSubmissions.filter(s => s.status === 'graded' || String(s.status) === 'completed');
    const avgScore = gradedSubs.length > 0 ? Math.round(gradedSubs.reduce((sum, s) => sum + (Number(s.grade) || 0), 0) / gradedSubs.length) : 0;

    const tableRows = filteredSubmissions.map((sub, index) => {
       const name = sub.student?.user?.full_name || (sub.student as any)?.users?.full_name || 'طالب مجهول';
       const section = getStudentSectionName(sub.student); 
       const isGraded = sub.status === 'graded' || String(sub.status) === 'completed';
       const score = isGraded ? (sub.grade || 0) : 'قيد المراجعة';
       const date = new Date(sub.submitted_at || (sub as any).created_at).toLocaleString('ar-EG');
       
       return `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${name}</strong></td>
          <td>${section}</td>
          <td style="text-align: center; font-weight: bold; color: ${isGraded ? '#4f46e5' : '#94a3b8'}">${score} ${isGraded ? `/ ${maxScore}` : ''}</td>
          <td style="text-align: center;">${date}</td>
        </tr>`;
    }).join('');

    const html = `
      <html dir="rtl" lang="ar">
        <head>
          <title>سجل تسليمات الواجب - ${assignment?.title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
            body { font-family: 'Cairo', sans-serif; padding: 40px; color: #1e293b; background: #fff; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
            .header h1 { color: #4f46e5; margin: 0 0 10px 0; font-size: 28px; font-weight: 900; }
            .header h2 { color: #64748b; font-size: 18px; margin: 0; font-weight: 700; }
            .info-grid { display: flex; justify-content: space-between; background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 30px; font-size: 14px; border: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
            th { background-color: #4f46e5; color: white; padding: 15px; text-align: right; font-weight: bold; border: 1px solid #e2e8f0; }
            th:nth-child(4), th:nth-child(5) { text-align: center; }
            td { padding: 15px; border: 1px solid #e2e8f0; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #94a3b8; }
            
            @media print {
              body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .info-grid { border: 1px solid #000; background: #f8fafc !important; }
              table, th, td { border: 1px solid #000; }
              th { background-color: #f1f5f9 !important; color: #000 !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📄 كشف تسليمات الواجب</h1>
            <h2>${assignment?.title || 'واجب'} - ${(assignment as any)?.subject_name || 'مادة عامة'}</h2>
            ${selectedSection !== 'الكل' ? `<h3 style="color:#ef4444; font-size: 16px; margin-top:10px;">خاص بطلاب: ${selectedSection}</h3>` : ''}
          </div>
          
          <div class="info-grid">
            <div><strong>إجمالي الطلاب المٌسلمين:</strong> ${filteredSubmissions.length}</div>
            <div><strong>تم التقييم:</strong> ${gradedSubs.length}</div>
            <div><strong>العلامة الكاملة للواجب:</strong> ${maxScore}</div>
            <div><strong>متوسط درجات الطلاب:</strong> ${avgScore}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th width="5%">#</th>
                <th width="30%">اسم الطالب</th>
                <th width="25%">الفصل</th>
                <th width="20%">الدرجة</th>
                <th width="20%">تاريخ التسليم</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="footer">
            تم إصدار هذا الكشف تلقائياً من منصة الرفعة الرقمية بتاريخ ${new Date().toLocaleString('ar-EG')}
          </div>
          
          <script>
              window.onload = () => { setTimeout(() => window.print(), 800); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    
    const cacheKey = `assign_cache_${assignmentId}_${user.id}_${currentRole}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (currentRole === 'student') setStudentId(user.id);
        setAssignment(parsed.assignment);
        setEditData(parsed.assignment);
        if (parsed.questions) setQuestions(parsed.questions);

        if (currentRole === 'student' && parsed.submission) {
           setMySubmission(parsed.submission);
           setContent(parsed.submission.content || '');
           setFileUrl(parsed.submission.file_url || '');
           if (parsed.answers) {
             const answersMap: Record<string, any> = {};
             const fullMap: Record<string, any> = {};
             parsed.answers.forEach((a: any) => {
               answersMap[a.question_id] = a.selected_options || a.answer_text;
               fullMap[a.question_id] = a;
             });
             setMyAnswers(answersMap);
             setFullAnswersMap(fullMap);
           }
        } else if (['teacher', 'admin', 'management'].includes(currentRole || '')) {
           setSubmissions(parsed.allSubmissions || []);
        }
        setLoading(false); 
      } catch (e) {}
    } else {
      setLoading(true); 
    }

    try {
      if (currentRole === 'student') setStudentId(user.id);
      const details = await fetchAssignmentDetails(assignmentId);
      
      sessionStorage.setItem(cacheKey, JSON.stringify(details));

      setAssignment(details.assignment);
      setEditData(details.assignment);
      if (details.questions) setQuestions(details.questions);

      if (currentRole === 'student') {
        if (details.submission) {
          setMySubmission(details.submission as any);
          setContent((details.submission as any).content || '');
          setFileUrl((details.submission as any).file_url || '');

          if (details.answers) {
            const answersMap: Record<string, string | string[] | null> = {};
            const fullMap: Record<string, any> = {};
            
            details.answers.forEach((a: any) => {
              answersMap[a.question_id] = a.selected_options || a.answer_text;
              fullMap[a.question_id] = a;
            });
            setMyAnswers(answersMap);
            setFullAnswersMap(fullMap);
          }
        } else {
          const draftKey = `draft_assign_${assignmentId}_${user.id}`;
          const draft = localStorage.getItem(draftKey);
          if (draft) {
             try {
               const parsedDraft = JSON.parse(draft);
               if (parsedDraft.answers) setMyAnswers(parsedDraft.answers);
               if (parsedDraft.content) setContent(parsedDraft.content);
               if (parsedDraft.fileUrl) setFileUrl(parsedDraft.fileUrl);
             } catch(e) {}
          }
        }
      } else if (['teacher', 'admin', 'management'].includes(currentRole || '')) {
        setSubmissions(details.allSubmissions);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [assignmentId, user, currentRole, fetchAssignmentDetails]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (currentRole === 'student' && !mySubmission && assignmentId && user?.id) {
      const draftData = { answers: myAnswers, content, fileUrl };
      const hasData = Object.keys(myAnswers).length > 0 || content || fileUrl;
      const draftKey = `draft_assign_${assignmentId}_${user.id}`;
      
      if (hasData) {
        localStorage.setItem(draftKey, JSON.stringify(draftData));
      }
    }
  }, [myAnswers, content, fileUrl, currentRole, mySubmission, assignmentId, user?.id]);

  const handleSubmitAnswers = async (answers: Record<string, string | string[] | null>) => {
    setIsSubmitting(true);
    try {
      const answersPayload: RawAssignmentAnswer[] = Object.entries(answers).map(([qId, value]) => {
        const question = questions.find((q: any) => q.id === qId);
        const isMultiple = question?.type === 'multiple_choice' || question?.type === 'checkbox' || question?.type === 'true_false';
        
        let safeSelectedOptions = null;
        let safeAnswerText = null;

        if (isMultiple) {
           safeSelectedOptions = Array.isArray(value) ? value : (value ? [value] : []);
        } else {
           safeAnswerText = typeof value === 'object' && value !== null ? JSON.stringify(value) : (value as string || '');
        }

        return {
          question_id: qId,
          answer_text: safeAnswerText,
          selected_options: safeSelectedOptions
        };
      });

      await submitAssignment(assignmentId, answersPayload, mySubmission?.id, content, fileUrl);
      
      localStorage.removeItem(`draft_assign_${assignmentId}_${user?.id}`);
      sessionStorage.removeItem(`assign_cache_${assignmentId}_${user?.id}_${currentRole}`);

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
      const payload = { title: editData.title!, due_date: new Date(editData.due_date!).toISOString() };
      
      const { error } = await supabase
        .from('assignments')
        .update(payload)
        .eq('id', assignmentId);

      if (error) throw error;
      
      sessionStorage.removeItem(`assign_cache_${assignmentId}_${user?.id}_${currentRole}`);

      showNotification('success', 'تم تمديد/تحديث الواجب بنجاح');
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
      sessionStorage.removeItem(`assign_cache_${assignmentId}_${user?.id}_${currentRole}`);
      router.push('/assignments');
    } catch (error: any) {
      showNotification('error', 'خطأ في الحذف: ' + error.message);
    }
  };

  const handleDeleteSubmissionAction = async () => {
    if (!submissionToDelete) return;
    setIsDeletingSubmission(true);
    try {
      await deleteSubmission(submissionToDelete);
      
      sessionStorage.removeItem(`assign_cache_${assignmentId}_${user?.id}_${currentRole}`);

      showNotification('success', 'تم حذف تسليم الطالب بنجاح');
      setSubmissionToDelete(null);
      await fetchData();
    } catch (error: any) {
      showNotification('error', 'خطأ في الحذف: ' + error.message);
    } finally {
      setIsDeletingSubmission(false);
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
  
  const firstSection = (assignment as any).assignment_sections?.[0]?.sections || (assignment as any).assignment_sections?.[0]?.section;
  const classObj = firstSection?.classes || firstSection?.class;
  const className = Array.isArray(classObj) ? classObj[0]?.name : classObj?.name || '';
  const sectionName = firstSection?.name || '';
  const fullSectionName = className ? `${className} - ${sectionName}` : sectionName;

  const isGraded = mySubmission?.status === 'graded';
  
  // 🚀 مفتاح الصلاحية الذكي
  const canEdit = currentRole === 'admin' || currentRole === 'management' || (assignment as any)?.teacher_id === user?.id;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-24" dir="rtl">
      {notification && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-lg font-bold text-white flex items-center gap-2 ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {notification.message}
        </div>
      )}

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
            <p className="text-slate-500 font-medium mt-1">{(assignment as any).subject_name || (assignment as any).subject?.name} - {fullSectionName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={copyAssignmentLink} className="h-12 px-4 rounded-2xl bg-white border border-slate-100 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-sm font-bold">
            <Share2 className="h-5 w-5" /> <span className="hidden sm:inline">مشاركة</span>
          </button>
          
          {/* 🚀 إخفاء أزرار التعديل والحذف عن المعلمين الذين لا يملكون الواجب */}
          {canEdit && (
            <>
              <button onClick={() => setIsEditModalOpen(true)} className="h-12 px-6 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all flex items-center gap-2 font-black shadow-sm">
                <Edit2 className="h-5 w-5" /> <span>تعديل سريع (لتمديد الوقت)</span>
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
              <span>أ. {(assignment as any).teacher_name || (assignment as any).teacher?.user?.full_name || (assignment as any).teacher?.users?.full_name}</span>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold text-slate-900 mb-4">وصف الواجب</h3>
            {assignment.description ? (
               <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed text-lg" dangerouslySetInnerHTML={{ __html: assignment.description }} />
            ) : (
               <p className="text-slate-500 font-medium">لا يوجد وصف إضافي.</p>
            )}
          </div>

          {assignment.file_url && (
            <div className="mt-8">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                المرفقات
              </h3>
              {assignment.file_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null || assignment.file_url.includes('cloudinary.com/image') ? (
                <div className="relative w-full max-w-2xl h-auto min-h-[300px] bg-slate-50 rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm flex items-center justify-center p-2">
                  <img src={assignment.file_url} alt="مرفق الواجب" className="max-h-[500px] w-auto object-contain rounded-xl" />
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

      {currentRole === 'student' && (
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
                       {mySubmission.grade} <span className="text-lg opacity-50">/ {questions.reduce((acc: number, q: any) => acc + (Number(q.points)||0), 0) || 100}</span>
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

            {isGraded && questions.length > 0 ? (
              <div className="space-y-6">
                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2 px-2">
                   <Target className="h-6 w-6 text-indigo-500" /> المراجعة التفصيلية لأسئلة الواجب
                </h3>
                
                {questions.map((q: any, idx: number) => {
                  const studentAns = myAnswers[q.id];
                  const answerDetails = fullAnswersMap[q.id]; 
                  
                  const isHeader = String(q.type) === 'section_header';
                  const isComparison = String(q.type) === 'comparison';
                  const safeOptions = q.options && Array.isArray(q.options) ? q.options : [];
                  
                  if (isHeader) {
                     return (
                       <div key={q.id} className="pt-6 pb-2 border-b-2 border-indigo-100 mt-8">
                          <div className="prose max-w-none text-2xl font-black text-indigo-900 leading-relaxed" dangerouslySetInnerHTML={{ __html: q.content || (q as any).text || '' }} />
                          {q.media_url && <img src={q.media_url} className="mt-4 max-h-64 rounded-xl border border-slate-200" alt="مرفق" />}
                       </div>
                     );
                  }

                  let studentAnswerText = studentAns;
                  if ((q.type === 'multiple_choice' || q.type === 'true_false' || q.type === 'checkbox') && safeOptions.length > 0) {
                     const selectedOpt = safeOptions.find((o: any) => o.id === studentAns || o.content === studentAns || o === studentAns);
                     if (selectedOpt) studentAnswerText = selectedOpt.content || selectedOpt;
                     else if (Array.isArray(studentAns)) studentAnswerText = studentAns.join('، ');
                  }

                  const isUnanswered = isComparison ? !studentAnswerText || studentAnswerText === '[]' : !studentAnswerText;
                  
                  const isCorrect = answerDetails?.is_correct || Number(answerDetails?.points_earned) > 0;

                  return (
                    <div key={q.id} className={`bg-white rounded-3xl overflow-hidden shadow-sm border-2 transition-all hover:shadow-md ${isUnanswered ? 'border-slate-200' : isCorrect ? 'border-emerald-200' : 'border-rose-200'}`}>
                      <div className="p-6 sm:p-8 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                        <div className="flex gap-4 items-start">
                          <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm ${isUnanswered ? 'bg-slate-200 text-slate-600' : isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {idx + 1}
                          </div>
                          <div className="pt-2">
                             <div className="prose max-w-none font-bold text-xl text-slate-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: (q as any).text || q.content || '' }} />
                             {q.media_url && <img src={q.media_url} className="mt-4 max-h-48 rounded-xl border border-slate-200 shadow-sm" alt="توضيح" />}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white px-5 py-2.5 rounded-xl font-bold text-base border border-slate-200 shrink-0 self-start sm:self-auto">
                          <Award className="w-5 h-5 text-slate-400" />
                          <span className={isCorrect ? 'text-emerald-600' : 'text-slate-900'}>{answerDetails?.points_earned || 0}</span>
                          <span className="text-slate-300">/</span>
                          <span className="text-slate-500">{Number(q.points) || 0}</span>
                        </div>
                      </div>

                      <div className="p-6 sm:p-8">
                        {isComparison ? (
                          <div className={`rounded-2xl border overflow-hidden shadow-sm ${isUnanswered ? 'border-slate-200 bg-slate-50' : isCorrect ? 'border-emerald-200 bg-emerald-50/30' : 'border-rose-200 bg-rose-50/30'}`}>
                            <div className="overflow-x-auto">
                              <table className="w-full text-right border-collapse min-w-[600px]">
                                <thead>
                                  <tr className={isUnanswered ? 'bg-slate-100' : isCorrect ? 'bg-emerald-100/50' : 'bg-rose-100/50'}>
                                    <th className="p-4 border-b border-l border-white/50 font-black text-slate-800 text-sm w-1/3">وجه المقارنة</th>
                                    <th className="p-4 border-b border-l border-white/50 font-black text-slate-800 text-sm text-center w-1/3">{safeOptions[0] || 'الطرف الأول'}</th>
                                    <th className="p-4 border-b border-white/50 font-black text-slate-800 text-sm text-center w-1/3">{safeOptions[1] || 'الطرف الثاني'}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {safeOptions.slice(2).map((aspect: string, rIdx: number) => {
                                    let parsedAns: any[] = [];
                                    try { parsedAns = JSON.parse((studentAns as string) || '[]'); } catch(e){}
                                    return (
                                      <tr key={rIdx} className="hover:bg-white/50 transition-colors">
                                        <td className="p-4 border-b border-l border-white/50 font-bold text-slate-700 bg-white/30 align-top">
                                          <div dangerouslySetInnerHTML={{ __html: aspect }} />
                                        </td>
                                        <td className="p-4 border-b border-l border-white/50 font-bold text-slate-900 align-top whitespace-pre-wrap">{parsedAns[rIdx]?.[0] || <span className="text-slate-400 italic">فارغ</span>}</td>
                                        <td className="p-4 border-b border-white/50 font-bold text-slate-900 align-top whitespace-pre-wrap">{parsedAns[rIdx]?.[1] || <span className="text-slate-400 italic">فارغ</span>}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : q.type === 'file_upload' && !isUnanswered ? (
                          <div className="mt-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-sm">
                            {String(studentAnswerText).match(/\.(jpeg|jpg|gif|png|webp)$/i) || String(studentAnswerText).includes('cloudinary') ? (
                               <img src={String(studentAnswerText)} alt="إجابة الطالب المرفقة" className="max-h-96 w-auto object-contain rounded-xl border border-slate-200" />
                            ) : (
                               <a href={String(studentAnswerText)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-indigo-600 font-bold hover:underline">
                                  <FileText className="w-5 h-5" /> تحميل إجابة الطالب المرفقة
                               </a>
                            )}
                          </div>
                        ) : (
                          <div className={`p-5 rounded-2xl border mb-4 ${isUnanswered ? 'bg-slate-50 border-slate-200 border-dashed' : isCorrect ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
                            <div className="text-sm font-black mb-3 flex items-center gap-2">
                              {isUnanswered ? <MinusCircle className="w-5 h-5 text-slate-400" /> : isCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-500"/> : <XCircle className="w-5 h-5 text-rose-500"/>}
                              <span className={isUnanswered ? 'text-slate-500' : isCorrect ? 'text-emerald-700' : 'text-rose-700'}>إجابتك:</span>
                            </div>
                            <p className={`text-lg font-bold whitespace-pre-wrap leading-relaxed ${isUnanswered ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                                {isUnanswered ? 'لم تقم بتقديم إجابة لهذا السؤال.' : (studentAnswerText as string)}
                            </p>
                          </div>
                        )}

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
                        <img src={mySubmission.file_url} alt="إجابة الطالب المرفقة" className="max-h-full w-auto object-contain rounded-xl" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : questions.length > 0 ? (
              <AssignmentForm 
                questions={questions} 
                onSubmit={handleSubmitAnswers} 
                onChange={(newAnswers) => setMyAnswers(newAnswers)} 
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
                        <img src={fileUrl} alt="إجابة الطالب" className="max-h-full w-auto object-contain rounded-xl" />
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
                          <img src={fileUrl} alt="إجابة الطالب" className="max-h-full w-auto object-contain rounded-xl" />
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
                      className="w-full flex justify-center items-center gap-3 rounded-[2rem] bg-indigo-600 px-8 py-5 text-lg font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
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
      
      {['teacher', 'admin', 'management'].includes(currentRole || '') && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
            
            {activeTab === 'submissions' && uniqueSections.length > 0 && (
              <div className="relative w-full sm:w-64 z-20">
                 <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <select 
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 shadow-sm appearance-none cursor-pointer"
                 >
                    <option value="الكل">عرض جميع الفصول</option>
                    {uniqueSections.map(sec => (
                       <option key={sec} value={sec}>{sec}</option>
                    ))}
                 </select>
              </div>
            )}
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
                    الإجمالي: {filteredSubmissions.length}
                  </div>
                </div>
              </div>
              
              <div className="p-0">
                {filteredSubmissions.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium text-lg">لا توجد تسليمات متاحة في هذا التصنيف.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredSubmissions.map((sub) => {
                       const st = sub.student as any;
                       const isGraded = sub.status === 'graded' || String(sub.status) === 'completed';

                       return (
                         <div key={sub.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                             <div className="flex items-center gap-4">
                               <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 border border-indigo-100">
                                 <User className="h-7 w-7" />
                               </div>
                               <div>
                                 <h3 className="font-black text-slate-900 text-lg">{st?.users?.full_name || st?.user?.full_name || 'طالب غير معروف'}</h3>
                                 <p className="text-sm font-bold text-slate-500 mt-1 flex items-center gap-2">
                                   <Clock className="h-4 w-4" />
                                   <span dir="ltr">{new Date(sub.submitted_at || (sub as any).created_at).toLocaleString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit' })}</span>
                                 </p>
                                 <p className="text-[10px] font-black text-indigo-600 mt-1 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 inline-block">
                                    {getStudentSectionName(st)}
                                 </p>
                               </div>
                             </div>
                             <div className="flex items-center gap-3 justify-end border-t md:border-0 pt-4 md:pt-0 mt-2 md:mt-0 border-slate-100 w-full md:w-auto">
                               {isGraded ? (
                                 <div className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-black flex items-center gap-2">
                                   <CheckCircle2 className="w-4 h-4" /> الدرجة: {sub.grade}
                                 </div>
                               ) : (
                                 <span className="px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-black animate-pulse">
                                   بانتظار التقييم
                                 </span>
                               )}
                               
                               {/* 🚀 إخفاء زر الحذف عن المعلمين الآخرين */}
                               {canEdit && (
                                 <button
                                   onClick={() => setSubmissionToDelete(sub.id)}
                                   className="h-11 w-11 flex items-center justify-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white transition-all shadow-sm border border-rose-100 active:scale-95"
                                   title="حذف هذا التسليم لإتاحة الفرصة للطالب"
                                 >
                                   <Trash2 className="h-5 w-5" />
                                 </button>
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

      <Dialog.Root open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 animate-in fade-in duration-300" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-4xl bg-white p-8 shadow-2xl focus:outline-none animate-in zoom-in-95 duration-300" dir="rtl">
            <div className="h-16 w-16 bg-red-50 rounded-3xl flex items-center justify-center mb-6">
              <Trash2 className="h-8 w-8 text-red-500" />
            </div>
            <Dialog.Title className="text-2xl font-black text-slate-900 mb-2 tracking-tight">
              تأكيد الحذف
            </Dialog.Title>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">هل أنت متأكد من رغبتك في حذف هذا الواجب نهائياً؟ سيتم مسح إجابات الطلاب.</p>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Dialog.Close asChild>
                <button className="flex-1 rounded-2xl bg-slate-50 px-6 py-4 text-sm font-black text-slate-700 hover:bg-slate-100 transition-all active:scale-95">
                  إلغاء
                </button>
              </Dialog.Close>
              <button
                onClick={handleDeleteAssignmentAction}
                disabled={loading}
                className="flex-1 rounded-2xl bg-red-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-red-100 hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={!!submissionToDelete} onOpenChange={(open) => !open && setSubmissionToDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 animate-in fade-in duration-300" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-[2rem] bg-white p-8 shadow-2xl focus:outline-none animate-in zoom-in-95 duration-300" dir="rtl">
            <div className="h-16 w-16 bg-rose-50 rounded-3xl flex items-center justify-center mb-6 border border-rose-100">
              <AlertTriangle className="h-8 w-8 text-rose-500" />
            </div>
            <Dialog.Title className="text-2xl font-black text-slate-900 mb-2">إلغاء تسليم الطالب</Dialog.Title>
            <p className="text-slate-500 font-bold mb-8 leading-relaxed">هل أنت متأكد أنك تريد حذف هذا التسليم وإجاباته؟ سيُسمح للطالب بإعادة تسليم الواجب من جديد.</p>
            <div className="flex justify-end gap-3">
              <Dialog.Close asChild>
                <button className="flex-1 rounded-2xl bg-slate-50 px-6 py-4 text-sm font-black text-slate-700 hover:bg-slate-100 transition-all">إلغاء</button>
              </Dialog.Close>
              <button onClick={handleDeleteSubmissionAction} disabled={isDeletingSubmission} className="flex-1 rounded-2xl bg-rose-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all disabled:opacity-50">
                {isDeletingSubmission ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
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
