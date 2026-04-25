// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { FileText, Clock, Link as LinkIcon, Users, User, CheckCircle2, AlertCircle, ArrowRight, Upload, Edit2, Trash2, Share2, Eye, X, Calendar, Download, FileSpreadsheet, Trophy, ImageIcon, MessageSquare, Award, MinusCircle, XCircle, Target, Play, Send, AlertTriangle, Filter, Loader2, Layout, ShieldAlert, AlignLeft } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { RawAssignmentAnswer, AssignmentWithMeta, SubmissionWithStudent } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import AssignmentForm from '@/components/assignment-form';
import AssignmentBuilder from '@/components/assignment-builder';
import ImageUpload from '@/components/ImageUpload';
import ForumEditorOriginal from '@/components/ForumEditor';
const ForumEditor = ForumEditorOriginal as any;
import * as XLSX from 'xlsx';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { useAssignmentsSystem } from '@/hooks/useAssignmentsSystem';
import { useSchoolFormData } from '@/hooks/useSchoolFormData';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// 🚀 محرك تنسيق المعادلات وإصلاح تشوه النصوص بقوة قاهرة
const renderContentWithMath = (content: string) => {
   if (!content) return { __html: '' };
   
   // القضاء التام على جميع أشكال النزول للسطر العالقة
   let html = String(content)
     .replace(/\\\\n/g, '<br/>')
     .replace(/\\n/g, '<br/>')
     .replace(/\\r\\n/g, '<br/>')
     .replace(/\n/g, '<br/>')
     .replace(/\\\$/g, '$');
   
   html = html.replace(/\$\$?([\s\S]*?)\$\$?/g, (match, mathContent) => {
       return `<span class="math-tex text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md font-mono font-bold mx-1 inline-block max-w-full break-words whitespace-pre-wrap shadow-sm" dir="ltr" style="word-break: break-word; overflow-wrap: anywhere;">\\(${mathContent}\\)</span>`;
   });

   // تغليف جداول الذكاء الاصطناعي بحاوية سحب
   html = html.replace(/<table/g, '<div class="table-responsive-wrapper"><table class="w-full text-right border-collapse my-4 min-w-[600px] border border-slate-300 rounded-xl overflow-hidden shadow-sm"');
   html = html.replace(/<\/table>/g, '</table></div>');
   html = html.replace(/<th/g, '<th class="bg-indigo-50 p-4 border border-slate-300 font-black text-indigo-900 text-sm"');
   html = html.replace(/<td/g, '<td class="p-4 border border-slate-300 bg-white text-slate-700 font-bold"');
   
   return { __html: html };
};

export default function AssignmentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const assignmentId = resolvedParams.id;
  const router = useRouter();
  const { user, authRole, userRole, isChecking: authLoading } = useAuth() as { user: any, authRole: string | null, userRole: string | null, isChecking: boolean };
  const currentRole = authRole || userRole;
  
  const { fetchAssignmentDetails, submitAssignment, saveAssignment, deleteAssignment, deleteSubmission, fetchAssignmentQuestions, updateFullAssignment } = useAssignmentsSystem();
  const { data: formData } = useSchoolFormData();
  const subjects = formData?.subjects || [];
  const sections = formData?.sections || [];
  const teachers = formData?.teachers || [];
  
  const [assignment, setAssignment] = useState<AssignmentWithMeta | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionWithStudent[]>([]);
  const [mySubmission, setMySubmission] = useState<SubmissionWithStudent | null>(null);
  const [myAnswers, setMyAnswers] = useState<Record<string, string | string[] | null>>({});
  const [fullAnswersMap, setFullAnswersMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFullEditModalOpen, setIsFullEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<string | null>(null);
  const [isDeletingSubmission, setIsDeletingSubmission] = useState(false);
  const [activeTab, setActiveTab] = useState<'submissions' | 'preview'>('submissions');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editData, setEditData] = useState<Partial<AssignmentWithMeta>>({});
  
  const [editQuestions, setEditQuestions] = useState<any[]>([]);
  const [editSectionIds, setEditSectionIds] = useState<string[]>([]);
  const [editDescription, setEditDescription] = useState('');
  const [editFileUrl, setEditFileUrl] = useState('');

  const [content, setContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>('الكل');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });    
    setTimeout(() => setNotification(null), 5000);
  };

  const getStudentSectionName = (studentObj: any) => {
    if (!studentObj || (!studentObj.sections && !studentObj.section)) return 'بدون فصل';
    const sectionData = studentObj.sections || studentObj.section;
    const sec = Array.isArray(sectionData) ? sectionData[0] : sectionData;
    if (!sec) return 'بدون فصل';
    const className = Array.isArray(sec.classes || sec.class) ? (sec.classes || sec.class)[0]?.name : (sec.classes || sec.class)?.name;
    return className && sec.name ? `${className} - ${sec.name}` : sec.name || 'بدون فصل';
  };

  const uniqueSections = Array.from(new Set(submissions.map(sub => getStudentSectionName(sub.student)))).filter(Boolean);
  const filteredSubmissions = selectedSection === 'الكل' ? submissions : submissions.filter(sub => getStudentSectionName(sub.student) === selectedSection);

  const exportToExcel = () => {
    const maxScore = questions.reduce((acc, q) => acc + (Number(q.points) || 0), 0) || 100;
    const csvData = filteredSubmissions.map(sub => {
       const isGraded = sub.status === 'graded' || String(sub.status) === 'completed';
       return { 
         'اسم الطالب': sub.student?.user?.full_name || (sub.student as any)?.users?.full_name || 'طالب مجهول', 
         'الفصل': getStudentSectionName(sub.student), 
         'الدرجة': isGraded ? (sub.grade || 0) : 'قيد المراجعة', 
         'العلامة الكاملة': maxScore, 
         'الحالة': isGraded ? 'مقيّم' : 'يحتاج تصحيح', 
         'تاريخ التسليم': new Date(sub.submitted_at || (sub as any).created_at).toLocaleString('ar-EG') 
       };
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(csvData), "التسليمات");
    XLSX.writeFile(workbook, `تسليمات_${assignment?.title || 'الواجب'}_${selectedSection}.xlsx`);
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { showNotification('error', 'يرجى السماح بالنوافذ المنبثقة للطباعة.'); return; }
    const maxScore = questions.reduce((acc, q) => acc + (Number(q.points) || 0), 0) || 100;
    const gradedSubs = filteredSubmissions.filter(s => s.status === 'graded' || String(s.status) === 'completed');
    const avgScore = gradedSubs.length > 0 ? Math.round(gradedSubs.reduce((sum, s) => sum + (Number(s.grade) || 0), 0) / gradedSubs.length) : 0;
    const tableRows = filteredSubmissions.map((sub, index) => {
       const isGraded = sub.status === 'graded' || String(sub.status) === 'completed';
       return `<tr><td>${index + 1}</td><td><strong>${sub.student?.user?.full_name || (sub.student as any)?.users?.full_name || 'طالب'}</strong></td><td>${getStudentSectionName(sub.student)}</td><td style="text-align: center; font-weight: bold; color: ${isGraded ? '#4f46e5' : '#94a3b8'}">${isGraded ? (sub.grade || 0) : 'قيد المراجعة'} ${isGraded ? `/ ${maxScore}` : ''}</td><td style="text-align: center;">${new Date(sub.submitted_at || (sub as any).created_at).toLocaleString('ar-EG')}</td></tr>`;
    }).join('');

    printWindow.document.write(`<html dir="rtl" lang="ar"><head><title>سجل تسليمات الواجب</title><style>@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');body{font-family:'Cairo',sans-serif;padding:40px;color:#1e293b;background:#fff}.header{text-align:center;margin-bottom:30px;border-bottom:2px solid #e2e8f0;padding-bottom:20px}.header h1{color:#4f46e5;margin:0 0 10px 0;font-size:28px}.info-grid{display:flex;justify-content:space-between;background:#f8fafc;padding:20px;border-radius:12px;margin-bottom:30px;border:1px solid #e2e8f0}table{width:100%;border-collapse:collapse;margin-top:20px}th{background-color:#4f46e5;color:white;padding:15px;text-align:right;border:1px solid #e2e8f0}td{padding:15px;border:1px solid #e2e8f0}tr:nth-child(even){background-color:#f8fafc}@media print{body{padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}th{background-color:#f1f5f9!important;color:#000!important}table,th,td{border:1px solid #000}}</style></head><body><div class="header"><h1>📄 كشف تسليمات الواجب</h1><h2>${assignment?.title}</h2></div><div class="info-grid"><div><strong>إجمالي المٌسلمين:</strong> ${filteredSubmissions.length}</div><div><strong>تم التقييم:</strong> ${gradedSubs.length}</div><div><strong>العلامة الكاملة:</strong> ${maxScore}</div><div><strong>متوسط الدرجات:</strong> ${avgScore}</div></div><table><thead><tr><th width="5%">#</th><th width="30%">اسم الطالب</th><th width="25%">الفصل</th><th width="20%">الدرجة</th><th width="20%">التاريخ</th></tr></thead><tbody>${tableRows}</tbody></table><script>window.onload=()=>{setTimeout(()=>window.print(),800)}</script></body></html>`);
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
        setAssignment(parsed.assignment); setEditData(parsed.assignment);
        if (parsed.questions) setQuestions(parsed.questions);

        if (currentRole === 'student' && parsed.submission) {
           setMySubmission(parsed.submission); setContent(parsed.submission.content || ''); setFileUrl(parsed.submission.file_url || '');
           if (parsed.answers) {
             const answersMap: Record<string, any> = {}; const fullMap: Record<string, any> = {};
             parsed.answers.forEach((a: any) => { answersMap[a.question_id] = a.selected_options || a.answer_text; fullMap[a.question_id] = a; });
             setMyAnswers(answersMap); setFullAnswersMap(fullMap);
           }
        } else if (['teacher', 'admin', 'management'].includes(currentRole || '')) {
           setSubmissions(parsed.allSubmissions || []);
        }
        setLoading(false); 
      } catch (e) {}
    } else setLoading(true); 

    try {
      if (currentRole === 'student') setStudentId(user.id);
      const details = await fetchAssignmentDetails(assignmentId);
      sessionStorage.setItem(cacheKey, JSON.stringify(details));
      setAssignment(details.assignment); setEditData(details.assignment);
      if (details.questions) setQuestions(details.questions);

      if (currentRole === 'student') {
        if (details.submission) {
          setMySubmission(details.submission as any); setContent((details.submission as any).content || ''); setFileUrl((details.submission as any).file_url || '');
          if (details.answers) {
            const answersMap: Record<string, string | string[] | null> = {}; const fullMap: Record<string, any> = {};
            details.answers.forEach((a: any) => { answersMap[a.question_id] = a.selected_options || a.answer_text; fullMap[a.question_id] = a; });
            setMyAnswers(answersMap); setFullAnswersMap(fullMap);
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
    } catch (error: any) { console.error('Error fetching data:', error); } finally { setLoading(false); }
  }, [assignmentId, user, currentRole, fetchAssignmentDetails]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 🚀 1. تحميل مكتبة KaTeX مرة واحدة لمنع الانهيار
  useEffect(() => {
    if (typeof window !== 'undefined' && !document.getElementById('katex-js-main')) {
      const link = document.createElement('link');
      link.id = 'katex-css-main';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.id = 'katex-js-main';
      script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js';
      script.onload = () => {
        const autoRender = document.createElement('script');
        autoRender.id = 'katex-auto-render-main';
        autoRender.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js';
        document.head.appendChild(autoRender);
      };
      document.head.appendChild(script);
    }
  }, []);

  // 🚀 2. المشغل الديناميكي المحمي
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && (window as any).renderMathInElement) {
        (window as any).renderMathInElement(document.body, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
          ],
          throwOnError: false
        });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [questions, activeTab, assignment, myAnswers]);

  useEffect(() => {
    if (currentRole === 'student' && !mySubmission && assignmentId && user?.id) {
      const draftData = { answers: myAnswers, content, fileUrl };
      if (Object.keys(myAnswers).length > 0 || content || fileUrl) localStorage.setItem(`draft_assign_${assignmentId}_${user.id}`, JSON.stringify(draftData));
    }
  }, [myAnswers, content, fileUrl, currentRole, mySubmission, assignmentId, user?.id]);

  const handleSubmitAnswers = async (answers: Record<string, string | string[] | null>) => {
    setIsSubmitting(true);
    try {
      const answersPayload: RawAssignmentAnswer[] = Object.entries(answers).map(([qId, value]) => {
        const question = questions.find((q: any) => q.id === qId);
        const isMultiple = question?.type === 'multiple_choice' || question?.type === 'checkbox' || question?.type === 'true_false';
        return { 
          question_id: qId, 
          answer_text: !isMultiple ? (typeof value === 'object' && value !== null ? JSON.stringify(value) : (value as string || '')) : null, 
          selected_options: isMultiple ? (Array.isArray(value) ? value : (value ? [value] : [])) : null 
        };
      });

      await submitAssignment(assignmentId, answersPayload, mySubmission?.id, content, fileUrl);
      localStorage.removeItem(`draft_assign_${assignmentId}_${user?.id}`);
      sessionStorage.removeItem(`assign_cache_${assignmentId}_${user?.id}_${currentRole}`);
      showNotification('success', 'تم تسليم الواجب بنجاح!');
      await fetchData();
    } catch (error: any) { showNotification('error', 'حدث خطأ: ' + error.message); } finally { setIsSubmitting(false); }
  };

  const handleUpdateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingEdit(true);
    try {
      await supabase.from('assignments').update({ title: editData.title!, due_date: new Date(editData.due_date!).toISOString() }).eq('id', assignmentId);
      sessionStorage.removeItem(`assign_cache_${assignmentId}_${user?.id}_${currentRole}`);
      showNotification('success', 'تم التحديث بنجاح');
      setIsEditModalOpen(false);
      await fetchData();
    } catch (error: any) { showNotification('error', 'خطأ: ' + error.message); } finally { setIsSubmittingEdit(false); }
  };

  const openFullEditModal = async () => {
    if (!assignment) return;
    const dateObj = new Date(assignment.due_date);
    
    const originalTeacherId = typeof assignment.teacher_id === 'object' 
      ? (assignment as any).teacher_id?.id || (assignment as any).teacher_id?.auth_id 
      : assignment.teacher_id;

    setEditData({ 
      ...assignment, 
      due_date: new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().slice(0, 16), 
      teacher_id: originalTeacherId 
    });
    setEditDescription(assignment.description || ''); setEditFileUrl(assignment.file_url || '');
    setEditSectionIds(assignment.assignment_sections?.map((as: any) => as.section_id) || (assignment as any).section_ids || []);
    setEditQuestions(questions); setIsFullEditModalOpen(true);
  };

  const handleSaveFullEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData.title || !editData.due_date) return;
    if (!editSectionIds || editSectionIds.length === 0) { showNotification('error', 'حدد شعبة واحدة على الأقل'); return; }
    setIsSubmittingEdit(true);
    try {
      const payload: any = { 
        title: editData.title, 
        description: editDescription, 
        due_date: new Date(editData.due_date).toISOString(), 
        file_url: editFileUrl
      };
      
      if (updateFullAssignment) await updateFullAssignment(assignmentId, payload, editQuestions, editSectionIds, subjects);
      else await saveAssignment(payload, assignmentId, editQuestions, editSectionIds, subjects);
      
      sessionStorage.removeItem(`assign_cache_${assignmentId}_${user?.id}_${currentRole}`);
      showNotification('success', 'تم حفظ التعديلات بنجاح');
      setIsFullEditModalOpen(false);
      await fetchData();
    } catch (error: any) { showNotification('error', error.message || 'خطأ أثناء الحفظ'); } finally { setIsSubmittingEdit(false); }
  };

  const handleDeleteAssignmentAction = async () => {
    try {
      if (assignment?.file_url) await deleteFromCloudinary(assignment.file_url);
      await deleteAssignment(assignmentId);
      sessionStorage.removeItem(`assign_cache_${assignmentId}_${user?.id}_${currentRole}`);
      router.push('/assignments');
    } catch (error: any) { showNotification('error', 'خطأ في الحذف: ' + error.message); }
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
    } catch (error: any) { showNotification('error', 'خطأ في الحذف: ' + error.message); } finally { setIsDeletingSubmission(false); }
  };

  const copyAssignmentLink = () => { navigator.clipboard.writeText(window.location.href); showNotification('success', 'تم نسخ رابط الواجب'); };

  if (!mounted || authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 font-cairo text-slate-800">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-14 h-14 text-indigo-600 animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse tracking-widest">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (loading && !assignment) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 font-cairo text-slate-800">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-14 h-14 text-indigo-600 animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse tracking-widest">جاري سحب بيانات الواجب...</p>
        </div>
      </div>
    );
  }

  if (!assignment && !loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800 font-cairo px-4">
        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 text-center shadow-lg max-w-md w-full">
          <AlertCircle className="w-16 h-16 text-rose-600 mx-auto mb-4" />
          <h3 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">الواجب غير موجود</h3>
          <p className="text-slate-500 font-bold">ربما تم حذفه أو أن الرابط غير صحيح.</p>
          <Link href="/assignments" className="mt-8 inline-block px-6 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold transition-all border border-indigo-200">العودة للواجبات</Link>
        </div>
      </div>
    );
  }

  const dueDateObj = new Date(assignment?.due_date || '');
  const isOverdue = dueDateObj < new Date();
  const firstSection = (assignment as any)?.assignment_sections?.[0]?.sections || (assignment as any)?.assignment_sections?.[0]?.section;
  const classObj = firstSection?.classes || firstSection?.class;
  const className = Array.isArray(classObj) ? classObj[0]?.name : classObj?.name || '';
  const sectionName = firstSection?.name || '';
  const fullSectionName = className ? `${className} - ${sectionName}` : sectionName;
  const isGraded = mySubmission?.status === 'graded';
  
  const assignmentTeacherId = typeof assignment?.teacher_id === 'object' ? (assignment as any).teacher_id?.id || (assignment as any).teacher_id?.auth_id : assignment?.teacher_id;
  const canEdit = currentRole === 'admin' || currentRole === 'management' || assignmentTeacherId === user?.id;

  const sanitizedQuestions = questions.map(q => {
    const textContent = q.content || q.text || q.question_text || '';
    const safeOptions = q.options && Array.isArray(q.options) && q.options.length > 0 
       ? q.options 
       : (q.type === 'true_false' ? [{id: 'صح', content: 'صح'}, {id: 'خطأ', content: 'خطأ'}] : []);
       
    return {
      ...q,
      options: safeOptions,
      content: String(textContent).replace(/\\n/g, '\n')
    };
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-cairo pb-24 relative overflow-x-hidden pt-6" dir="rtl">
      
      <div className="space-y-8 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-8">
        <AnimatePresence>
          {notification && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-[100] px-8 py-4 rounded-3xl shadow-xl flex items-center gap-4 transition-all bg-white border ${notification.type === 'success' ? 'text-emerald-700 border-emerald-200' : 'text-rose-700 border-rose-200'}`}>
              <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${notification.type === 'success' ? 'bg-emerald-50' : 'bg-rose-50'}`}>{notification.type === 'success' ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <AlertCircle className="h-6 w-6 text-rose-600" />}</div>
              <div className="font-black tracking-tight text-lg">{notification.message}</div>
              <button onClick={() => setNotification(null)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors mr-4 text-slate-400"><X className="h-5 w-5" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link href="/assignments" className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-all"><ArrowRight className="h-6 w-6" /></Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">{assignment?.title}</h1>
                {isOverdue ? <span className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">منتهي</span> : <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">نشط</span>}
              </div>
              <p className="text-slate-500 font-bold mt-2">{(assignment as any)?.subject_name || (assignment as any)?.subject?.name} - {fullSectionName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button onClick={copyAssignmentLink} className="h-12 flex-1 md:flex-none px-4 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm font-black text-sm"><Share2 className="h-4 w-4" /> <span className="hidden sm:inline">مشاركة</span></button>
            {canEdit && (
              <>
                <button onClick={() => setIsEditModalOpen(true)} className="h-12 flex-1 md:flex-none px-6 rounded-2xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-all flex items-center justify-center gap-2 font-black shadow-sm"><Edit2 className="h-4 w-4" /> <span className="hidden sm:inline">تعديل سريع</span></button>
                <button onClick={() => setIsDeleteModalOpen(true)} className="h-12 w-12 flex items-center justify-center rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-all shadow-sm shrink-0"><Trash2 className="h-5 w-5" /></button>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden relative">
          <div className="p-8 relative z-10">
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black border shadow-sm ${isOverdue ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                <Clock className="h-5 w-5" /> <span dir="ltr">آخر موعد: {format(dueDateObj, 'yyyy/MM/dd HH:mm')}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-50 text-slate-600 border border-slate-200 text-xs sm:text-sm font-black shadow-sm">
                <User className="h-5 w-5 text-slate-500" /> <span>أ. {(assignment as any)?.teacher_name || (assignment as any)?.teacher?.user?.full_name || (assignment as any)?.teacher?.users?.full_name}</span>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-black text-slate-900 mb-4">وصف الواجب</h3>
              {assignment?.description ? <div className="prose max-w-none text-slate-700 leading-relaxed text-base sm:text-lg font-medium" dangerouslySetInnerHTML={renderContentWithMath(assignment.description)} /> : <p className="text-slate-500 font-bold bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300 text-center">لا يوجد وصف إضافي.</p>}
            </div>

            {assignment?.file_url && (
              <div className="mt-8">
                <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2"><FileText className="h-5 w-5 text-indigo-600" /> المرفقات</h3>
                {assignment.file_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null || assignment.file_url.includes('cloudinary.com/image') ? (
                  <div className="relative w-full max-w-2xl h-auto min-h-[300px] bg-slate-50 rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm flex items-center justify-center p-2"><img src={assignment.file_url} alt="مرفق الواجب" className="max-h-[500px] w-auto object-contain rounded-xl" /></div>
                ) : (
                  <div className="p-6 rounded-3xl bg-indigo-50 border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-indigo-50">
                        <FileText className="h-7 w-7 text-indigo-600" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900">ملف مرفق</h4>
                        <p className="text-sm text-slate-500">انقر للتحميل</p>
                      </div>
                    </div>
                    {/* 🚀 الزر المصحح والخالي من الأخطاء */}
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        const url = assignment?.file_url || '';
                        const downloadUrl = (url.includes('cloudinary.com') && url.includes('/upload/'))
                          ? url.replace('/upload/', '/upload/fl_attachment/')
                          : url;
                        window.location.href = downloadUrl;
                      }}
                      className="w-full sm:w-auto h-12 px-8 rounded-2xl bg-indigo-600 text-sm font-black text-white shadow-md hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 active:scale-95 border border-indigo-500"
                    >
                      <LinkIcon className="h-5 w-5" /> 
                      <span>تحميل المرفق</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 🚀 قسم الطالب والمراجعة التفصيلية */}
        {currentRole === 'student' && (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden relative">
            <div className="p-8 border-b border-slate-100 bg-slate-50 relative z-10">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-3">
                <div className={`p-3 rounded-2xl shadow-sm border ${isGraded ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`}>
                  {isGraded ? <Trophy className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
                </div>
                {isGraded ? 'نتيجة الواجب والتغذية الراجعة' : 'تسليم الإجابة'}
              </h2>
            </div>
            
            <div className="p-6 sm:p-8 relative z-10 bg-transparent">
              {isGraded && (
                <div className="mb-10 p-8 rounded-3xl bg-emerald-50 border border-emerald-200 shadow-sm relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
                     <div>
                       <h3 className="text-xl sm:text-2xl font-black text-emerald-700 flex items-center gap-2 mb-2"><CheckCircle2 className="w-8 h-8" /> تم التقييم بنجاح!</h3>
                       <p className="text-slate-600 font-bold">لقد قام معلمك بمراجعة الواجب. يمكنك الاطلاع على ملاحظاته التفصيلية بالأسفل.</p>
                     </div>
                     <div className="shrink-0 flex flex-col items-center bg-white px-8 py-5 rounded-2xl shadow-sm border border-emerald-100 w-full sm:w-auto">
                       <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">الدرجة النهائية</span>
                       <div className="text-4xl font-black text-slate-900">{mySubmission?.grade} <span className="text-lg text-slate-400">/ {questions.reduce((acc: number, q: any) => acc + (Number(q.points)||0), 0) || 100}</span></div>
                     </div>
                  </div>
                  {mySubmission?.feedback && (
                    <div className="mt-6 p-5 bg-white rounded-2xl border border-emerald-100 shadow-sm">
                      <p className="text-xs font-black text-emerald-600 mb-2 flex items-center gap-1.5"><MessageSquare className="w-4 h-4"/> ملاحظة المعلم العامة:</p>
                      <p className="text-slate-800 leading-relaxed font-bold text-base sm:text-lg">{mySubmission.feedback}</p>
                    </div>
                  )}
                </div>
              )}

              {isGraded && questions.length > 0 ? (
                <div className="space-y-6">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-6 flex items-center gap-2 px-2"><Target className="h-6 w-6 text-indigo-600" /> المراجعة التفصيلية لأسئلة الواجب</h3>
                  
                  <div className="flex flex-col gap-6">
                    {questions.map((q: any, idx: number) => {
                      const studentAns = myAnswers[q.id];
                      const answerDetails = fullAnswersMap[q.id]; 
                      const isHeader = String(q.type) === 'section_header';
                      const isComparison = String(q.type) === 'comparison';
                      
                      const safeOptions = q.options && Array.isArray(q.options) && q.options.length > 0 
                          ? q.options 
                          : (q.type === 'true_false' ? [{id: 'صح', content: 'صح'}, {id: 'خطأ', content: 'خطأ'}] : []);
                      
                      if (isHeader) {
                        return (
                          <div key={q.id} className="mt-8 mb-4">
                            <div className="bg-indigo-50 rounded-3xl p-6 sm:p-8 border-l-4 border-indigo-500 shadow-sm">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-indigo-100 rounded-xl">
                                  <AlignLeft className="w-5 h-5 text-indigo-600" />
                                </div>
                                <h4 className="text-sm font-black text-indigo-800 uppercase tracking-widest">سياق السؤال / اقرأ بتمعن</h4>
                              </div>
                              <div 
                                className="prose max-w-none text-xl sm:text-2xl font-black text-slate-900 leading-relaxed" 
                                dangerouslySetInnerHTML={renderContentWithMath(q.content || (q as any).text || '')} 
                              />
                              {q.media_url && (
                                <div className="mt-6 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white p-2 text-center">
                                  <img src={q.media_url} className="w-auto max-h-80 mx-auto rounded-xl object-contain inline-block" alt="مرفق تمهيدي" />
                                </div>
                              )}
                            </div>
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
                      
                      let questionCounter = 1;

                      return (
                        <div key={q.id} className={`bg-white rounded-3xl overflow-hidden shadow-sm border transition-all hover:shadow-md ${isUnanswered ? 'border-slate-200 border-dashed' : isCorrect ? 'border-emerald-200' : 'border-rose-200'}`}>
                          <div className="p-6 sm:p-8 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                            <div className="flex gap-4 items-start w-full min-w-0">
                              <div className={`shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-[1.25rem] flex items-center justify-center font-black text-xl sm:text-2xl shadow-sm border ${isUnanswered ? 'bg-white text-slate-500 border-slate-200' : isCorrect ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
                                  {idx + 1}
                              </div>
                              <div className="pt-1 sm:pt-2 w-full min-w-0">
                                <div 
                                  className="prose max-w-none font-black text-lg sm:text-xl text-slate-800 leading-relaxed overflow-hidden" 
                                  dangerouslySetInnerHTML={renderContentWithMath((q as any).text || q.content || '')} 
                                />
                                {q.media_url && (
                                  <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white p-2 inline-block">
                                    <img src={q.media_url} className="max-h-48 w-auto rounded-lg object-contain" alt="مرفق توضيحي" />
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl font-black text-sm sm:text-base border border-slate-200 shrink-0 self-start sm:self-auto shadow-sm">
                              <Award className={`w-5 h-5 ${isCorrect ? 'text-emerald-500' : 'text-slate-400'}`} />
                              <span className={isCorrect ? 'text-emerald-600 text-lg' : 'text-slate-700 text-lg'}>{answerDetails?.points_earned || 0}</span>
                              <span className="text-slate-400">/</span>
                              <span className="text-slate-500">{Number(q.points) || 0} نقطة</span>
                            </div>
                          </div>

                          <div className="p-6 sm:p-8">
                            {isComparison ? (
                              <div className={`rounded-[1.5rem] border overflow-hidden shadow-sm ${isUnanswered ? 'border-slate-200 bg-slate-50' : isCorrect ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/50'}`}>
                                <div className="table-responsive-wrapper">
                                  <table className="w-full text-right border-collapse min-w-[600px] m-0">
                                    <thead>
                                      <tr className={isUnanswered ? 'bg-slate-100' : isCorrect ? 'bg-emerald-100/50' : 'bg-rose-100/50'}>
                                        <th className="p-5 border-b border-l border-slate-200 font-black text-slate-700 text-sm w-1/3">وجه المقارنة</th>
                                        <th className="p-5 border-b border-l border-slate-200 font-black text-indigo-800 text-sm text-center w-1/3"><div dangerouslySetInnerHTML={renderContentWithMath(safeOptions[0]?.content || safeOptions[0] || 'الطرف الأول')} /></th>
                                        <th className="p-5 border-b border-slate-200 font-black text-indigo-800 text-sm text-center w-1/3"><div dangerouslySetInnerHTML={renderContentWithMath(safeOptions[1]?.content || safeOptions[1] || 'الطرف الثاني')} /></th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {safeOptions.slice(2).map((opt: any, rIdx: number) => {
                                        const aspect = opt.content || opt || '';
                                        let parsedAns: any[] = [];
                                        try { 
                                          if (typeof studentAns === 'string') parsedAns = JSON.parse(studentAns || '[]'); 
                                          else if (Array.isArray(studentAns)) parsedAns = studentAns;
                                        } catch(e){}
                                        return (
                                          <tr key={rIdx} className="hover:bg-slate-50 transition-colors border-b border-slate-200 last:border-0">
                                            <td className="p-5 border-l border-slate-200 font-bold text-slate-800 bg-white align-middle"><div dangerouslySetInnerHTML={renderContentWithMath(aspect)} /></td>
                                            <td className="p-5 border-l border-slate-200 font-bold text-slate-900 align-middle whitespace-pre-wrap text-center bg-white">{parsedAns[rIdx]?.[0] ? <div dangerouslySetInnerHTML={renderContentWithMath(parsedAns[rIdx][0])} /> : <span className="text-slate-400 font-normal">فارغ</span>}</td>
                                            <td className="p-5 font-bold text-slate-900 align-middle whitespace-pre-wrap text-center bg-white">{parsedAns[rIdx]?.[1] ? <div dangerouslySetInnerHTML={renderContentWithMath(parsedAns[rIdx][1])} /> : <span className="text-slate-400 font-normal">فارغ</span>}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : q.type === 'file_upload' && !isUnanswered ? (
                              <div className="mt-2 p-2 sm:p-3 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200 inline-block shadow-sm">
                                {String(studentAnswerText).match(/\.(jpeg|jpg|gif|png|webp)$/i) || String(studentAnswerText).includes('cloudinary') ? (
                                   <img src={String(studentAnswerText)} alt="إجابة الطالب المرفقة" className="max-h-64 sm:max-h-96 w-auto object-contain rounded-lg sm:rounded-xl border border-slate-200 bg-white p-1" />
                                ) : (
                                   <a href={String(studentAnswerText)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-indigo-600 font-black hover:underline text-xs sm:text-sm px-3 sm:px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-100">
                                      <FileText className="w-4 h-4 sm:w-5 sm:h-5" /> تحميل إجابة الطالب المرفقة
                                   </a>
                                )}
                              </div>
                            ) : (
                              <div className={`p-4 sm:p-5 rounded-xl sm:rounded-2xl border mb-3 sm:mb-4 shadow-sm ${isUnanswered ? 'bg-slate-50 border-slate-200 border-dashed text-slate-500 italic' : isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                                <div className="text-xs sm:text-sm font-black mb-3 flex items-center gap-2">
                                  {isUnanswered ? <MinusCircle className="w-5 h-5 text-slate-400" /> : isCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-500"/> : <XCircle className="w-5 h-5 text-rose-500"/>}
                                  <span className={isUnanswered ? 'text-slate-500' : isCorrect ? 'text-emerald-700' : 'text-rose-700'}>إجابتك المسجلة:</span>
                                </div>
                                <div className={`text-base sm:text-lg font-bold whitespace-pre-wrap leading-relaxed ${isUnanswered ? 'italic' : ''}`}>
                                    {isUnanswered ? 'لم يتم تقديم إجابة.' : <div dangerouslySetInnerHTML={renderContentWithMath(typeof studentAnswerText === 'object' && studentAnswerText !== null ? JSON.stringify(studentAnswerText) : String(studentAnswerText))} />}
                                </div>
                              </div>
                            )}

                            {/* التغذية الراجعة */}
                            {answerDetails?.feedback && (
                              <div className="mt-5 p-5 rounded-2xl bg-indigo-50 border border-indigo-200 relative overflow-hidden shadow-sm">
                                <div className="absolute right-0 top-0 w-1.5 h-full bg-indigo-500"></div>
                                <div className="text-xs font-black text-indigo-600 mb-2 flex items-center gap-1.5"><MessageSquare className="w-4 h-4"/> تعليق المدرس على الإجابة:</div>
                                <p className="text-base sm:text-lg font-bold text-slate-800 leading-relaxed pl-2">{answerDetails.feedback}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* المرفقات والنصوص الإضافية */}
                  {(mySubmission?.content || mySubmission?.file_url) && (
                    <div className="mt-10 p-6 sm:p-8 rounded-[2rem] bg-slate-50 border border-slate-200 shadow-sm">
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-6 flex items-center gap-2"><FileText className="h-6 w-6 text-indigo-600" /> مرفقات ونصوص إضافية مُرسلة</h3>
                      {mySubmission?.content && (
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 mb-4 shadow-sm">
                          <p className="text-slate-700 whitespace-pre-wrap font-bold text-base sm:text-lg leading-relaxed">{mySubmission.content}</p>
                        </div>
                      )}
                      {mySubmission?.file_url && (
                        <div className="relative w-full min-h-[300px] bg-white rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center p-4 shadow-sm">
                          <img src={mySubmission.file_url} alt="إجابة إضافية" className="max-h-[500px] w-auto object-contain rounded-xl" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : questions.length > 0 ? (
                <div className="light-theme-override">
                  <AssignmentForm 
                    questions={sanitizedQuestions} 
                    onSubmit={handleSubmitAnswers} 
                    onChange={(newAnswers) => setMyAnswers(newAnswers)} 
                    isSubmitting={isSubmitting}
                    initialAnswers={myAnswers}
                    readOnly={!!mySubmission}
                  >
                    <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200 shadow-sm mt-8">
                      <label className="block text-sm sm:text-base font-black text-slate-900 mb-4">نص الإجابة الإضافي (اختياري)</label>
                      <div className="mb-6 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                        <ForumEditor 
                           content={content} 
                           setContent={(val: any) => setContent(val)} 
                           canUploadImage={false} 
                           isCompact={false} 
                           placeholder="إذا أردت إضافة ملاحظة نصية للمعلم..."
                        />
                      </div>

                      <label className="block text-sm sm:text-base font-black text-slate-900 mb-4">ملف الإجابة (ارفع صورة الحل هنا)</label>
                      {!mySubmission ? (
                        <div className="bg-slate-50 p-2 rounded-2xl border border-slate-200 shadow-sm">
                          <ImageUpload
                            initialImageUrl={fileUrl}
                            onUploadSuccess={(url) => setFileUrl(url || '')}
                            label="ارفع صورة إجابتك أو ملف الحل"
                          />
                        </div>
                      ) : (
                        fileUrl && (
                          <div className="relative w-full h-64 mt-2 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center shadow-sm">
                            <img src={fileUrl} alt="إجابة الطالب" className="max-h-full w-auto object-contain rounded-xl" />
                          </div>
                        )
                      )}
                    </div>
                  </AssignmentForm>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); handleSubmitAnswers({}); }} className="space-y-8">
                  <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                    <div>
                      <label className="block text-sm sm:text-base font-black text-slate-900 mb-4">نص الإجابة (اختياري إذا كان هناك ملف)</label>
                      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                        <ForumEditor 
                           content={content} 
                           setContent={(val: any) => setContent(val)} 
                           canUploadImage={false} 
                           isCompact={false} 
                           placeholder="اكتب إجابتك هنا بالتفصيل..."
                        />
                      </div>
                    </div>
                    
                    <div className="mt-8">
                      <label className="block text-sm sm:text-base font-black text-slate-900 mb-4">صورة الواجب (إجباري إذا لم تكتب نصاً)</label>
                      {!mySubmission ? (
                        <div className="bg-slate-50 p-2 rounded-2xl border border-slate-200 shadow-sm">
                          <ImageUpload
                            initialImageUrl={fileUrl}
                            onUploadSuccess={(url) => setFileUrl(url || '')}
                            label="ارفع صورة الحل الخاص بك"
                          />
                        </div>
                      ) : (
                        fileUrl && (
                          <div className="relative w-full h-64 mt-2 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center shadow-sm">
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
                        className="w-full flex justify-center items-center gap-3 rounded-2xl bg-indigo-600 px-8 py-5 text-lg font-black text-white shadow-md hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-500"
                      >
                        {isSubmitting ? (
                          <div className="h-6 w-6 border-[3px] border-white border-t-transparent rounded-full animate-spin"></div>
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
        
        {/* واجهة المعلم / الإدارة للتصحيح */}
        {['teacher', 'admin', 'management'].includes(currentRole || '') && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-1 p-1.5 bg-white rounded-2xl w-fit border border-slate-200 shadow-sm">
                <button 
                  onClick={() => setActiveTab('submissions')}
                  className={`px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'submissions' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                >
                  <Users className="h-4 w-4" />
                  التسليمات
                </button>
                <button 
                  onClick={() => setActiveTab('preview')}
                  className={`px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'preview' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                >
                  <Eye className="h-4 w-4" />
                  معاينة الطالب
                </button>
              </div>
              
              {activeTab === 'submissions' && uniqueSections.length > 0 && (
                <div className="relative w-full sm:w-64 z-20">
                   <Filter className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-indigo-500" />
                   <select 
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      className="w-full pl-4 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm appearance-none cursor-pointer transition-all"
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
              <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl pointer-events-none"></div>
                <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-3">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl shadow-sm border border-indigo-200">
                      <Users className="h-6 w-6" />
                    </div>
                    تسليمات الطلاب
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <button onClick={exportToExcel} className="flex-1 md:flex-none items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl font-black border border-emerald-200 transition-all flex">
                      <FileSpreadsheet className="h-4 w-4" /> Excel
                    </button>
                    <button onClick={exportToPDF} className="flex-1 md:flex-none items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl font-black border border-rose-200 transition-all flex">
                      <Download className="h-4 w-4" /> PDF
                    </button>
                    <div className="flex-1 md:flex-none text-center px-4 py-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-sm font-black text-slate-700">
                      الإجمالي: {filteredSubmissions.length}
                    </div>
                  </div>
                </div>
                
                <div className="p-0 relative z-10">
                  {filteredSubmissions.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50">
                      <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 shadow-sm">
                        <FileText className="h-10 w-10 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-bold text-lg">لا توجد تسليمات متاحة في هذا التصنيف.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {filteredSubmissions.map((sub) => {
                         const st = sub.student as any;
                         const isGraded = sub.status === 'graded' || String(sub.status) === 'completed';

                         return (
                           <div key={sub.id} className="p-6 hover:bg-slate-50 transition-colors group">
                             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                               <div className="flex items-center gap-4 min-w-0">
                                 <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-indigo-600 border border-slate-200 shadow-sm shrink-0 font-black text-xl">
                                   {st?.users?.full_name?.charAt(0) || st?.user?.full_name?.charAt(0) || 'ط'}
                                 </div>
                                 <div className="min-w-0 pr-1">
                                   <h3 className="font-black text-slate-900 text-base sm:text-lg truncate group-hover:text-indigo-600 transition-colors">{st?.users?.full_name || st?.user?.full_name || 'طالب غير معروف'}</h3>
                                   <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1 flex items-center gap-1.5">
                                     <Clock className="h-3.5 w-3.5" />
                                     <span dir="ltr">{new Date(sub.submitted_at || (sub as any).created_at).toLocaleString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit' })}</span>
                                   </p>
                                   <p className="text-[10px] font-black text-indigo-700 mt-1.5 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 inline-block truncate max-w-full">
                                      {getStudentSectionName(st)}
                                   </p>
                                 </div>
                               </div>
                               <div className="flex items-center gap-3 justify-end border-t md:border-0 pt-4 md:pt-0 mt-2 md:mt-0 border-slate-100 w-full md:w-auto shrink-0">
                                 {isGraded ? (
                                   <div className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-sm">
                                     <CheckCircle2 className="w-4 h-4" /> الدرجة: {sub.grade}
                                   </div>
                                 ) : (
                                   <span className="px-4 py-2 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl text-xs sm:text-sm font-black animate-pulse shadow-sm">
                                     بانتظار التقييم
                                   </span>
                                 )}
                                 
                                 {canEdit && (
                                   <button
                                     onClick={() => setSubmissionToDelete(sub.id)}
                                     className="h-11 w-11 flex items-center justify-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all shadow-sm border border-rose-200 active:scale-95 shrink-0"
                                     title="حذف هذا التسليم لإتاحة الفرصة للطالب"
                                   >
                                     <Trash2 className="h-5 w-5" />
                                   </button>
                                 )}

                                 <Link 
                                   href={`/assignments/${assignmentId}/submissions/${sub.id}`}
                                   className="h-11 px-4 sm:px-6 rounded-xl bg-indigo-600 text-white text-xs sm:text-sm font-black hover:bg-indigo-700 transition-all flex items-center justify-center shadow-md border border-indigo-500 active:scale-95 flex-1 md:flex-none"
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
                <div className="mb-8 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold flex items-center gap-3 shadow-sm">
                  <AlertCircle className="h-6 w-6 shrink-0" />
                  هذه معاينة لما يراه الطالب في صفحة التسليم. لن يتم حفظ أي إجابات تقوم بإدخالها هنا.
                </div>
                {questions.length > 0 ? (
                  <div id="assignment-form-container" className="light-theme-override">
                    <AssignmentForm 
                      questions={sanitizedQuestions} 
                      onSubmit={() => showNotification('success', 'هذه معاينة فقط، لم يتم حفظ الإجابة')} 
                      readOnly={false}
                    />
                  </div>
                ) : (
                  <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 text-center shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-200 shadow-sm relative z-10">
                      <FileText className="h-10 w-10 text-slate-400" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2 relative z-10">لا توجد أسئلة تفاعلية</h3>
                    <p className="text-slate-500 font-bold relative z-10">هذا الواجب يعتمد على رفع ملف من قِبل الطالب. يمكنك إضافة أسئلة من خلال التعديل.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog.Root open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 animate-in fade-in duration-300" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[90%] sm:w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[2.5rem] bg-white border border-slate-200 p-6 sm:p-8 shadow-2xl focus:outline-none animate-in zoom-in-95 duration-300" dir="rtl">
            <div className="h-14 w-14 sm:h-16 sm:w-16 bg-rose-50 border border-rose-200 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-5 sm:mb-6 shadow-sm mx-auto sm:mx-0">
              <Trash2 className="h-6 w-6 sm:h-8 sm:w-8 text-rose-600" />
            </div>
            <Dialog.Title className="text-xl sm:text-2xl font-black text-slate-900 mb-2 tracking-tight text-center sm:text-right">
              تأكيد الحذف الشامل
            </Dialog.Title>
            <p className="text-slate-500 font-bold mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base text-center sm:text-right px-2 sm:px-0">هل أنت متأكد من رغبتك في حذف هذا الواجب نهائياً؟ سيتم مسح الواجب، والمرفقات، وجميع إجابات وتقييمات الطلاب المرتبطة به نهائياً ولن تتمكن من التراجع.</p>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Dialog.Close asChild>
                <button className="flex-1 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-slate-600 hover:bg-slate-100 transition-all active:scale-95 shadow-sm">
                  إلغاء
                </button>
              </Dialog.Close>
              <button
                onClick={handleDeleteAssignmentAction}
                disabled={loading}
                className="flex-1 rounded-xl sm:rounded-2xl bg-rose-600 border border-rose-500 px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-white hover:bg-rose-700 transition-all active:scale-95 disabled:opacity-50 shadow-md"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto"/> : 'تأكيد الحذف نهائياً'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={!!submissionToDelete} onOpenChange={(open) => !open && setSubmissionToDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 animate-in fade-in duration-300" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[90%] sm:w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[2.5rem] bg-white border border-slate-200 p-6 sm:p-8 shadow-2xl focus:outline-none animate-in zoom-in-95 duration-300" dir="rtl">
            <div className="h-14 w-14 sm:h-16 sm:w-16 bg-amber-50 border border-amber-200 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-5 sm:mb-6 shadow-sm mx-auto sm:mx-0">
              <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-amber-600" />
            </div>
            <Dialog.Title className="text-xl sm:text-2xl font-black text-slate-900 mb-2 tracking-tight text-center sm:text-right">
              إلغاء تسليم الطالب
            </Dialog.Title>
            <p className="text-slate-500 font-bold mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base text-center sm:text-right px-2 sm:px-0">هل أنت متأكد أنك تريد حذف هذا التسليم وإجاباته؟ سيُسمح للطالب بإعادة تسليم الواجب من جديد إذا لم ينتهِ الوقت.</p>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Dialog.Close asChild>
                <button className="flex-1 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-slate-600 hover:bg-slate-100 transition-all active:scale-95 shadow-sm">
                  إلغاء
                </button>
              </Dialog.Close>
              <button 
                onClick={handleDeleteSubmissionAction} 
                disabled={isDeletingSubmission} 
                className="flex-1 rounded-xl sm:rounded-2xl bg-amber-500 border border-amber-500 px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-white hover:bg-amber-600 transition-all active:scale-95 disabled:opacity-50 shadow-md"
              >
                {isDeletingSubmission ? <Loader2 className="w-5 h-5 animate-spin mx-auto"/> : 'تأكيد الإلغاء'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 animate-in fade-in duration-300" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95%] sm:w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[2.5rem] bg-white border border-slate-200 p-6 sm:p-8 shadow-2xl focus:outline-none max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300 custom-scrollbar" dir="rtl">
            <div className="flex items-center justify-between mb-6 sm:mb-8 pb-5 sm:pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-indigo-50 border border-indigo-100 shadow-sm flex items-center justify-center shrink-0">
                  <Clock className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-600" />
                </div>
                <div>
                  <Dialog.Title className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">تعديل سريع للوقت</Dialog.Title>
                  <p className="text-xs sm:text-sm text-slate-500 font-bold mt-1">تعديل عنوان الواجب وتمديد وقت التسليم فقط</p>
                </div>
              </div>
              <Dialog.Close className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors shadow-sm active:scale-90">
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </Dialog.Close>
            </div>
            
            <form onSubmit={handleUpdateAssignment} className="space-y-6">
              <div className="space-y-5">
                <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-slate-200 shadow-sm">
                  <label className="block text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">عنوان الواجب <span className="text-rose-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    className="block w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3.5 sm:py-4 px-4 sm:px-5 text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs sm:text-sm transition-all font-bold outline-none" 
                    value={editData.title || ''} 
                    onChange={(e) => setEditData({...editData, title: e.target.value})} 
                  />
                </div>
                <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-slate-200 shadow-sm">
                  <label className="block text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">تاريخ ووقت التسليم الجديد <span className="text-rose-500">*</span></label>
                  <input 
                    type="datetime-local" 
                    required 
                    dir="ltr" 
                    className="block w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3.5 sm:py-4 px-4 sm:px-5 text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-[10px] sm:text-xs transition-all font-bold text-left outline-none" 
                    value={editData.due_date ? new Date(new Date(editData.due_date).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ''} 
                    onChange={(e) => setEditData({...editData, due_date: e.target.value})} 
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-5 sm:pt-6 border-t border-slate-100">
                <Dialog.Close asChild>
                  <button type="button" className="w-full sm:w-auto rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 px-6 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-slate-600 hover:bg-slate-100 transition-all active:scale-95 shadow-sm">
                    إلغاء
                  </button>
                </Dialog.Close>
                <button type="submit" disabled={isSubmittingEdit} className="w-full sm:w-auto rounded-xl sm:rounded-2xl bg-indigo-600 border border-indigo-600 px-6 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-white hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 shadow-md">
                  {isSubmittingEdit ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mx-auto"/> : 'حفظ التمديد'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={isFullEditModalOpen} onOpenChange={setIsFullEditModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 animate-in fade-in duration-300" />
          <Dialog.Content 
            onInteractOutside={(e) => e.preventDefault()} 
            onEscapeKeyDown={(e) => e.preventDefault()}
            className="fixed left-[50%] top-[50%] z-50 w-[95%] sm:w-full max-w-5xl translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[2.5rem] bg-white border border-slate-200 p-5 sm:p-8 shadow-2xl focus:outline-none max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300 custom-scrollbar" 
            dir="rtl"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 pb-5 sm:pb-6 border-b border-slate-100 gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-amber-50 border border-amber-200 shadow-sm flex items-center justify-center shrink-0">
                  <Edit2 className="h-6 w-6 sm:h-7 sm:w-7 text-amber-600" />
                </div>
                <div>
                  <Dialog.Title className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    تعديل شامل للواجب
                  </Dialog.Title>
                  <p className="text-xs sm:text-sm text-slate-500 font-bold mt-1">يمكنك تعديل المرفقات، الوصف، والأسئلة التفاعلية</p>
                </div>
              </div>
              <Dialog.Close className="absolute sm:relative top-5 left-5 sm:top-auto sm:left-auto h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors shadow-sm active:scale-90">
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </Dialog.Close>
            </div>
            
            <form onSubmit={handleSaveFullEdit} className="space-y-6 sm:space-y-10">
              <div className="space-y-6 sm:space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                  <div className="space-y-5 sm:space-y-6">
                    <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-slate-200 shadow-sm">
                      <label className="block text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">عنوان الواجب <span className="text-rose-500">*</span></label>
                      <input 
                        type="text" 
                        required
                        className="block w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3.5 sm:py-4 px-4 sm:px-5 text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs sm:text-sm transition-all font-bold outline-none"
                        value={editData.title || ''}
                        onChange={(e) => setEditData({...editData, title: e.target.value})}
                      />
                    </div>
                  
                    <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-slate-200 shadow-sm">
                      <label className="block text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">الوصف والتعليمات</label>
                      <div className="bg-white p-2 rounded-xl sm:rounded-2xl border border-slate-200 flex flex-col min-h-[300px]">
                        <ForumEditor 
                          content={editDescription}
                          setContent={setEditDescription}
                          canUploadImage={true}
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-slate-200 shadow-sm">
                      <label className="block text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">تاريخ التسليم <span className="text-rose-500">*</span></label>
                      <input 
                        type="datetime-local" 
                        required
                        className="block w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3.5 sm:py-4 px-3 sm:px-4 text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-[10px] sm:text-xs transition-all font-bold text-left outline-none"
                        dir="ltr"
                        value={editData.due_date || ''}
                        onChange={(e) => setEditData({...editData, due_date: e.target.value})}
                      />
                    </div>

                    <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-slate-200 shadow-sm">
                      <label className="flex items-center gap-2 text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mb-4">
                        <Users className="w-4 h-4 text-indigo-500" />
                        الشعب المستهدفة <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 max-h-52 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                        {sections.map((s: any) => {
                          const classObj = s.classes || s.class;
                          const cName = Array.isArray(classObj) ? classObj[0]?.name : classObj?.name;
                          return (
                            <label key={s.id} className={`flex items-center gap-2 sm:gap-3 cursor-pointer group p-2.5 sm:p-3 rounded-xl border transition-all shadow-sm ${editSectionIds.includes(s.id) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-100'}`}>
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={editSectionIds.includes(s.id)}
                                onChange={(e) => {
                                  const newSectionIds = e.target.checked
                                    ? [...editSectionIds, s.id]
                                    : editSectionIds.filter((id: string) => id !== s.id);
                                  setEditSectionIds(newSectionIds);
                                }}
                              />
                              <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-[0.4rem] border flex items-center justify-center shrink-0 transition-colors ${editSectionIds.includes(s.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                                 {editSectionIds.includes(s.id) && <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />}
                              </div>
                              <span className="text-xs sm:text-sm font-bold truncate">
                                {cName ? `${cName} - ${s.name}` : s.name}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-slate-200 shadow-sm">
                      <label className="flex items-center gap-2 text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mb-3 sm:mb-4">
                        <ImageIcon className="w-4 h-4 text-indigo-500" />
                        المرفق الحالي / تعديل
                      </label>
                      <div className="bg-white rounded-xl sm:rounded-2xl p-1.5 sm:p-2 border border-slate-200 shadow-sm">
                        <ImageUpload
                          initialImageUrl={editFileUrl}
                          onUploadSuccess={(url) => setEditFileUrl(url || '')}
                          label="تغيير المرفق"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Question Builder */}
                  <div className="bg-slate-50 rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-6 lg:p-8 border border-slate-200 shadow-sm relative overflow-hidden h-fit">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-[60px] pointer-events-none"></div>
                    <div className="flex items-center gap-2 sm:gap-3 mb-5 sm:mb-6 relative z-10">
                      <div className="p-2 bg-indigo-100 border border-indigo-200 rounded-lg sm:rounded-xl shadow-sm shrink-0">
                         <Layout className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                      </div>
                      <h4 className="text-base sm:text-lg font-black text-slate-900">بناء الأسئلة التفاعلية</h4>
                    </div>
                    <div className="relative z-10">
                      <AssignmentBuilder questions={editQuestions} onChange={setEditQuestions} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-6 sm:pt-8 border-t border-slate-200">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="w-full sm:w-auto rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 px-6 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-slate-600 hover:bg-slate-100 transition-all active:scale-95 shadow-sm"
                  >
                    إلغاء الأمر
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="w-full sm:w-auto rounded-xl sm:rounded-2xl bg-indigo-600 border border-indigo-600 px-6 sm:px-10 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-white shadow-md hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmittingEdit ? (
                    <><div className="h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> جاري الحفظ...</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> اعتماد التعديلات الشاملة</>
                  )}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar-light::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar-light::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 12px; }
        .custom-scrollbar-light::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 12px; border: 2px solid #f1f5f9; }
        .custom-scrollbar-light::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
        /* 🚀 الحل الجذري للجداول في الجوال */
        .table-responsive-wrapper {
          width: 100%;
          max-width: 100vw;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 8px;
          margin-bottom: 1rem;
          display: block;
        }
        
        .table-responsive-wrapper table {
          width: 100% !important;
          min-width: 600px !important;
          border-collapse: collapse !important;
          table-layout: auto !important;
        }

        .table-responsive-wrapper th, .table-responsive-wrapper td {
          white-space: normal !important;
          word-wrap: break-word !important;
          padding: 1rem !important;
        }
      `}} />
    </div>
  );
}
