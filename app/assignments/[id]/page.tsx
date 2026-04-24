// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { FileText, Clock, Link as LinkIcon, Users, User, CheckCircle2, AlertCircle, ArrowRight, Upload, Edit2, Trash2, Share2, Eye, X, Calendar, Download, FileSpreadsheet, Trophy, ImageIcon, MessageSquare, Award, MinusCircle, XCircle, Target, Play, Send, AlertTriangle, Filter, Loader2, Layout, ShieldAlert } from 'lucide-react';
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

const getStatusColor = (status: string) => {
  switch (status) {
    case 'published': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]';
    case 'draft': return 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]';
    case 'archived': return 'bg-[#0f1423] text-slate-500 border-white/5 shadow-inner';
    default: return 'bg-[#0f1423] text-slate-500 border-white/5 shadow-inner';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'published': return 'منشور';
    case 'draft': return 'مسودة';
    case 'archived': return 'مؤرشف';
    default: return status;
  }
};

// 🚀 محرك تنسيق المعادلات وإصلاح تشوه النصوص بقوة (Dark Theme)
const renderContentWithMath = (content: string) => {
   if (!content) return { __html: '' };
   
   let html = String(content)
     .replace(/\\n/g, '<br/>')
     .replace(/\\r\\n/g, '<br/>')
     .replace(/\n/g, '<br/>')
     .replace(/\\\$/g, '$');
   
   html = html.replace(/\$\$?([\s\S]*?)\$\$?/g, (match, mathContent) => {
       return `<span class="math-tex text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded-md font-mono font-bold mx-1 shadow-inner inline-block max-w-full break-words whitespace-pre-wrap" dir="ltr" style="word-break: break-word; overflow-wrap: anywhere;">\\(${mathContent}\\)</span>`;
   });

   html = html.replace(/<table/g, '<table class="w-full text-right border-collapse my-4 min-w-[500px] border border-white/10"');
   html = html.replace(/<th/g, '<th class="bg-indigo-500/10 p-3 border border-white/10 font-black text-indigo-200 text-sm"');
   html = html.replace(/<td/g, '<td class="p-3 border border-white/5 bg-[#02040a]/40 text-slate-300 font-bold hover:bg-[#02040a]/80 transition-colors"');
   
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

  // 🚀 حقن KaTeX في المنظومة كاملة لتعمل بشكل ذاتي
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const renderMath = () => {
        if ((window as any).renderMathInElement) {
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
      };

      if (!document.getElementById('katex-css-main')) {
        const link = document.createElement('link');
        link.id = 'katex-css-main';
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css';
        document.head.appendChild(link);
      }

      if (!document.getElementById('katex-js-main')) {
        const script = document.createElement('script');
        script.id = 'katex-js-main';
        script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js';
        script.onload = () => {
          const autoRender = document.createElement('script');
          autoRender.id = 'katex-auto-render-main';
          autoRender.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js';
          autoRender.onload = () => setTimeout(renderMath, 100);
          document.head.appendChild(autoRender);
        };
        document.head.appendChild(script);
      } else {
        setTimeout(renderMath, 500);
      }
    }
  }, [questions, activeTab, assignment]);

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

  // 🚀 منع خطأ Foreign Key نهائياً بإزالة الـ teacher_id من التحديث
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
      <div className="flex h-screen items-center justify-center bg-[#090b14] font-cairo text-slate-200">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-14 h-14 text-indigo-500 animate-spin drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
          <p className="text-slate-400 font-bold animate-pulse tracking-widest">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (loading && !assignment) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#090b14] font-cairo text-slate-200">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-14 h-14 text-indigo-500 animate-spin drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
          <p className="text-slate-400 font-bold animate-pulse tracking-widest">جاري سحب بيانات الواجب...</p>
        </div>
      </div>
    );
  }

  if (!assignment && !loading) {
    return (
      <div className="min-h-screen bg-[#090b14] flex flex-col items-center justify-center text-slate-200 font-cairo px-4">
        <div className="bg-[#131836]/60 backdrop-blur-md p-10 rounded-[3rem] border border-white/10 text-center shadow-2xl max-w-md w-full">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4 opacity-80" />
          <h3 className="text-3xl font-black text-white mb-2 tracking-tight">الواجب غير موجود</h3>
          <p className="text-slate-400 font-bold">ربما تم حذفه أو أن الرابط غير صحيح.</p>
          <Link href="/assignments" className="mt-8 inline-block px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all border border-white/20">العودة للواجبات</Link>
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
    
    // 🚀 معالجة خيارات صح/خطأ للظهور دائماً
    const safeOptions = q.options && Array.isArray(q.options) && q.options.length > 0 
       ? q.options 
       : (q.type === 'true_false' ? [{id: 'صح', content: 'صح'}, {id: 'خطأ', content: 'خطأ'}] : []);

    return {
      ...q,
      options: safeOptions,
      content: textContent
    };
  });

  return (
    <div className="min-h-screen bg-[#090b14] text-slate-200 font-cairo pb-24 relative overflow-x-hidden pt-6" dir="rtl">
      
      <div className="fixed top-1/4 left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none z-0" />

      <div className="space-y-8 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-8">
        <AnimatePresence>
          {notification && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-[100] px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 transition-all backdrop-blur-md border ${notification.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-rose-500/20 text-rose-400 border-rose-500/50'}`}>
              <div className="h-10 w-10 rounded-2xl bg-[#090b14]/50 flex items-center justify-center border border-white/5">{notification.type === 'success' ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}</div>
              <div className="font-black tracking-tight text-lg text-white">{notification.message}</div>
              <button onClick={() => setNotification(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors mr-4 text-white"><X className="h-5 w-5" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link href="/assignments" className="h-12 w-12 flex items-center justify-center rounded-2xl bg-[#131836]/60 backdrop-blur-md shadow-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"><ArrowRight className="h-6 w-6" /></Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md leading-tight">{assignment?.title}</h1>
                {isOverdue ? <span className="px-3 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full text-[10px] font-black uppercase tracking-wider shadow-inner">منتهي</span> : <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-wider shadow-inner">نشط</span>}
              </div>
              <p className="text-slate-400 font-bold mt-2">{(assignment as any)?.subject_name || (assignment as any)?.subject?.name} - {fullSectionName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button onClick={copyAssignmentLink} className="h-12 flex-1 md:flex-none px-4 rounded-2xl bg-[#090b14]/50 border border-white/10 text-slate-300 hover:text-indigo-400 hover:bg-[#131836] transition-all flex items-center justify-center gap-2 shadow-inner font-black text-sm"><Share2 className="h-4 w-4" /> <span className="hidden sm:inline">مشاركة</span></button>
            {canEdit && (
              <>
                <button onClick={() => setIsEditModalOpen(true)} className="h-12 flex-1 md:flex-none px-6 rounded-2xl bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-slate-900 border border-indigo-500/30 transition-all flex items-center justify-center gap-2 font-black shadow-inner"><Edit2 className="h-4 w-4" /> <span className="hidden sm:inline">تعديل سريع</span></button>
                <button onClick={() => setIsDeleteModalOpen(true)} className="h-12 w-12 flex items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/30 transition-all shadow-inner shrink-0"><Trash2 className="h-5 w-5" /></button>
              </>
            )}
          </div>
        </div>

        <div className="bg-[#131836]/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="p-8 relative z-10">
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black border shadow-inner ${isOverdue ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'}`}>
                <Clock className="h-5 w-5" /> <span dir="ltr">آخر موعد: {format(dueDateObj, 'yyyy/MM/dd HH:mm')}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#090b14]/50 text-slate-300 border border-white/5 text-xs sm:text-sm font-black shadow-inner">
                <User className="h-5 w-5 text-slate-400" /> <span>أ. {(assignment as any)?.teacher_name || (assignment as any)?.teacher?.user?.full_name || (assignment as any)?.teacher?.users?.full_name}</span>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-black text-white mb-4">وصف الواجب</h3>
              {assignment?.description ? <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed text-base sm:text-lg font-medium" dangerouslySetInnerHTML={renderContentWithMath(assignment.description)} /> : <p className="text-slate-500 font-bold bg-[#090b14]/30 p-4 rounded-xl border border-dashed border-white/10 text-center">لا يوجد وصف إضافي.</p>}
            </div>

            {assignment?.file_url && (
              <div className="mt-8">
                <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2"><FileText className="h-5 w-5 text-indigo-400" /> المرفقات</h3>
                {assignment.file_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null || assignment.file_url.includes('cloudinary.com/image') ? (
                  <div className="relative w-full max-w-2xl h-auto min-h-[300px] bg-[#090b14]/50 rounded-[2rem] border border-white/5 overflow-hidden shadow-inner flex items-center justify-center p-2"><img src={assignment.file_url} alt="مرفق الواجب" className="max-h-[500px] w-auto object-contain rounded-xl" /></div>
                ) : (
                  <div className="p-6 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
                    <div className="flex items-center gap-4"><div className="h-14 w-14 rounded-2xl bg-[#090b14] flex items-center justify-center shadow-inner border border-white/5"><FileText className="h-7 w-7 text-indigo-400" /></div><div><h4 className="font-black text-white">ملف مرفق</h4><p className="text-sm text-slate-400">انقر للتحميل</p></div></div>
                    <a href={assignment.file_url} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto h-12 px-8 rounded-2xl bg-indigo-600 text-sm font-black text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 active:scale-95 border border-indigo-400/50"><LinkIcon className="h-5 w-5" /> <span>تحميل المرفق</span></a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 🚀 قسم الطالب والمراجعة التفصيلية */}
        {currentRole === 'student' && (
          <div className="bg-[#131836]/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 overflow-hidden relative">
            <div className="p-8 border-b border-white/5 bg-[#090b14]/30 relative z-10">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <div className={`p-3 rounded-2xl shadow-inner border ${isGraded ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'}`}>
                  {isGraded ? <Trophy className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
                </div>
                {isGraded ? 'نتيجة الواجب والتغذية الراجعة' : 'تسليم الإجابة'}
              </h2>
            </div>
            
            <div className="p-6 sm:p-8 relative z-10 bg-transparent">
              {isGraded && (
                <div className="mb-10 p-8 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 shadow-inner relative overflow-hidden backdrop-blur-sm">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
                     <div>
                       <h3 className="text-xl sm:text-2xl font-black text-emerald-400 flex items-center gap-2 mb-2"><CheckCircle2 className="w-8 h-8" /> تم التقييم بنجاح!</h3>
                       <p className="text-slate-300 font-bold">لقد قام معلمك بمراجعة الواجب. يمكنك الاطلاع على ملاحظاته التفصيلية بالأسفل.</p>
                     </div>
                     <div className="shrink-0 flex flex-col items-center bg-[#090b14]/80 px-8 py-5 rounded-2xl shadow-inner border border-emerald-500/30 w-full sm:w-auto">
                       <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">الدرجة النهائية</span>
                       <div className="text-4xl font-black text-white">{mySubmission?.grade} <span className="text-lg text-slate-500">/ {questions.reduce((acc: number, q: any) => acc + (Number(q.points)||0), 0) || 100}</span></div>
                     </div>
                  </div>
                  {mySubmission?.feedback && (
                    <div className="mt-6 p-5 bg-[#090b14]/50 backdrop-blur-sm rounded-2xl border border-emerald-500/20">
                      <p className="text-xs font-black text-emerald-400 mb-2 flex items-center gap-1.5"><MessageSquare className="w-4 h-4"/> ملاحظة المعلم العامة:</p>
                      <p className="text-white leading-relaxed font-bold text-base sm:text-lg">{mySubmission.feedback}</p>
                    </div>
                  )}
                </div>
              )}

              {isGraded && questions.length > 0 ? (
                <div className="space-y-6">
                  <h3 className="text-lg sm:text-xl font-black text-white mb-6 flex items-center gap-2 px-2"><Target className="h-6 w-6 text-indigo-400" /> المراجعة التفصيلية لأسئلة الواجب</h3>
                  
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
                            <div className="bg-indigo-500/10 backdrop-blur-md rounded-3xl p-6 sm:p-8 border-l-4 border-indigo-500 shadow-inner">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-indigo-500/20 rounded-xl">
                                  <AlignLeft className="w-5 h-5 text-indigo-400" />
                                </div>
                                <h4 className="text-sm font-black text-indigo-300 uppercase tracking-widest">سياق السؤال / اقرأ بتمعن</h4>
                              </div>
                              <div 
                                className="prose prose-invert max-w-none text-xl sm:text-2xl font-black text-white leading-relaxed" 
                                dangerouslySetInnerHTML={renderContentWithMath(q.content || (q as any).text || '')} 
                              />
                              {q.media_url && (
                                <div className="mt-6 rounded-2xl overflow-hidden border border-white/10 shadow-sm bg-[#02040a]/40 p-2 text-center">
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

                      return (
                        <div key={q.id} className={`bg-[#090b14]/60 rounded-3xl overflow-hidden shadow-sm border transition-all hover:border-white/20 ${isUnanswered ? 'border-white/5 border-dashed' : isCorrect ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
                          <div className="p-6 sm:p-8 bg-[#131836]/40 border-b border-white/5 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                            <div className="flex gap-4 items-start w-full min-w-0">
                              <div className={`shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-[1.25rem] flex items-center justify-center font-black text-xl sm:text-2xl shadow-inner border ${isUnanswered ? 'bg-white/5 text-slate-400 border-white/10' : isCorrect ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.2)]'}`}>
                                  {idx + 1}
                              </div>
                              <div className="pt-1 sm:pt-2 w-full min-w-0">
                                <div 
                                  className="prose prose-invert max-w-none font-black text-lg sm:text-xl text-slate-200 leading-relaxed overflow-hidden" 
                                  dangerouslySetInnerHTML={renderContentWithMath((q as any).text || q.content || '')} 
                                />
                                {q.media_url && (
                                  <div className="mt-4 rounded-xl overflow-hidden border border-white/10 shadow-sm bg-[#02040a]/40 p-2 inline-block">
                                    <img src={q.media_url} className="max-h-48 w-auto rounded-lg object-contain" alt="مرفق توضيحي" />
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 bg-[#02040a] px-4 py-2.5 rounded-2xl font-black text-sm sm:text-base border border-white/5 shrink-0 self-start sm:self-auto shadow-inner">
                              <Award className={`w-5 h-5 ${isCorrect ? 'text-emerald-400' : 'text-slate-500'}`} />
                              <span className={isCorrect ? 'text-emerald-400 text-lg' : 'text-white text-lg'}>{answerDetails?.points_earned || 0}</span>
                              <span className="text-slate-600">/</span>
                              <span className="text-slate-400">{Number(q.points) || 0} نقطة</span>
                            </div>
                          </div>

                          <div className="p-6 sm:p-8">
                            {isComparison ? (
                              <div className={`rounded-[1.5rem] border overflow-hidden shadow-inner ${isUnanswered ? 'border-white/5 bg-[#131836]/30' : isCorrect ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
                                <div className="table-responsive-wrapper">
                                  <table className="w-full text-right border-collapse min-w-[600px] m-0">
                                    <thead>
                                      <tr className={isUnanswered ? 'bg-[#02040a]/80' : isCorrect ? 'bg-emerald-500/10' : 'bg-rose-500/10'}>
                                        <th className="p-5 border-b border-l border-white/10 font-black text-slate-300 text-sm w-1/3">وجه المقارنة</th>
                                        <th className="p-5 border-b border-l border-white/10 font-black text-indigo-300 text-sm text-center w-1/3">{safeOptions[0]?.content || safeOptions[0] || 'الطرف الأول'}</th>
                                        <th className="p-5 border-b border-white/10 font-black text-indigo-300 text-sm text-center w-1/3">{safeOptions[1]?.content || safeOptions[1] || 'الطرف الثاني'}</th>
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
                                          <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors border-b border-white/5 last:border-0">
                                            <td className="p-5 border-l border-white/10 font-bold text-slate-300 bg-[#090b14]/50 align-middle"><div dangerouslySetInnerHTML={renderContentWithMath(aspect)} /></td>
                                            <td className="p-5 border-l border-white/10 font-bold text-white align-middle whitespace-pre-wrap text-center">{parsedAns[rIdx]?.[0] ? <div dangerouslySetInnerHTML={renderContentWithMath(parsedAns[rIdx][0])} /> : <span className="text-slate-600 font-normal">فارغ</span>}</td>
                                            <td className="p-5 font-bold text-white align-middle whitespace-pre-wrap text-center">{parsedAns[rIdx]?.[1] ? <div dangerouslySetInnerHTML={renderContentWithMath(parsedAns[rIdx][1])} /> : <span className="text-slate-600 font-normal">فارغ</span>}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : q.type === 'file_upload' && !isUnanswered ? (
                              <div className="mt-2 p-2 sm:p-3 bg-[#02040a]/60 rounded-xl sm:rounded-2xl border border-white/5 inline-block shadow-inner">
                                {String(studentAnswerText).match(/\.(jpeg|jpg|gif|png|webp)$/i) || String(studentAnswerText).includes('cloudinary') ? (
                                   <img src={String(studentAnswerText)} alt="إجابة الطالب المرفقة" className="max-h-64 sm:max-h-96 w-auto object-contain rounded-lg sm:rounded-xl border border-white/5" />
                                ) : (
                                   <a href={String(studentAnswerText)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-indigo-400 font-black hover:underline text-xs sm:text-sm px-3 sm:px-4 py-2 bg-indigo-500/10 rounded-xl">
                                      <FileText className="w-4 h-4 sm:w-5 sm:h-5" /> تحميل إجابة الطالب المرفقة
                                   </a>
                                )}
                              </div>
                            ) : (
                              <div className={`p-4 sm:p-5 rounded-xl sm:rounded-2xl border mb-3 sm:mb-4 shadow-inner ${isUnanswered ? 'bg-[#02040a]/40 border-white/5 border-dashed text-slate-500 italic' : isCorrect ? 'bg-emerald-500/10 border-emerald-500/20 text-white' : 'bg-rose-500/10 border-rose-500/20 text-white'}`}>
                                <div className="text-xs sm:text-sm font-black mb-3 flex items-center gap-2">
                                  {isUnanswered ? <MinusCircle className="w-5 h-5 text-slate-500" /> : isCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-400"/> : <XCircle className="w-5 h-5 text-rose-400"/>}
                                  <span className={isUnanswered ? 'text-slate-400' : isCorrect ? 'text-emerald-400' : 'text-rose-400'}>إجابتك المسجلة:</span>
                                </div>
                                <div className={`text-base sm:text-lg font-bold whitespace-pre-wrap leading-relaxed ${isUnanswered ? 'italic' : ''}`}>
                                    {isUnanswered ? 'لم يتم تقديم إجابة.' : <div dangerouslySetInnerHTML={renderContentWithMath(typeof studentAnswerText === 'object' && studentAnswerText !== null ? JSON.stringify(studentAnswerText) : String(studentAnswerText))} />}
                                </div>
                              </div>
                            )}

                            {/* التغذية الراجعة */}
                            {answerDetails?.feedback && (
                              <div className="mt-5 p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 relative overflow-hidden shadow-inner">
                                <div className="absolute right-0 top-0 w-1.5 h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)]"></div>
                                <div className="text-xs font-black text-indigo-400 mb-2 flex items-center gap-1.5"><MessageSquare className="w-4 h-4"/> تعليق المدرس على الإجابة:</div>
                                <p className="text-base sm:text-lg font-bold text-white leading-relaxed pl-2">{answerDetails.feedback}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* المرفقات والنصوص الإضافية */}
                  {(mySubmission?.content || mySubmission?.file_url) && (
                    <div className="mt-10 p-6 sm:p-8 rounded-[2rem] bg-[#090b14]/50 border border-white/10 shadow-inner">
                      <h3 className="text-lg sm:text-xl font-black text-white mb-6 flex items-center gap-2"><FileText className="h-6 w-6 text-indigo-400" /> مرفقات ونصوص إضافية مُرسلة</h3>
                      {mySubmission?.content && (
                        <div className="bg-[#131836] p-5 rounded-2xl border border-white/5 mb-4 shadow-inner">
                          <p className="text-slate-300 whitespace-pre-wrap font-bold text-base sm:text-lg leading-relaxed">{mySubmission.content}</p>
                        </div>
                      )}
                      {mySubmission?.file_url && (
                        <div className="relative w-full min-h-[300px] bg-[#02040a] rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center p-4 shadow-inner">
                          <img src={mySubmission.file_url} alt="إجابة إضافية" className="max-h-[500px] w-auto object-contain rounded-xl" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : questions.length > 0 ? (
                <div className="dark-theme-override">
                  <AssignmentForm 
                    questions={sanitizedQuestions} 
                    onSubmit={handleSubmitAnswers} 
                    onChange={(newAnswers) => setMyAnswers(newAnswers)} 
                    isSubmitting={isSubmitting}
                    initialAnswers={myAnswers}
                    readOnly={!!mySubmission}
                  >
                    <div className="bg-[#131836]/60 p-6 sm:p-8 rounded-[2rem] border border-white/10 shadow-lg mt-8">
                      <label className="block text-sm sm:text-base font-black text-white mb-4">نص الإجابة الإضافي (اختياري)</label>
                      <div className="mb-6 rounded-2xl overflow-hidden border border-white/10 shadow-inner">
                        <ForumEditor 
                           content={content} 
                           setContent={(val: any) => setContent(val)} 
                           canUploadImage={false} 
                           isCompact={false} 
                           placeholder="إذا أردت إضافة ملاحظة نصية للمعلم..."
                        />
                      </div>

                      <label className="block text-sm sm:text-base font-black text-white mb-4">ملف الإجابة (ارفع صورة الحل هنا)</label>
                      {!mySubmission ? (
                        <div className="bg-[#090b14]/50 p-2 rounded-2xl border border-white/5 shadow-inner">
                          <ImageUpload
                            initialImageUrl={fileUrl}
                            onUploadSuccess={(url) => setFileUrl(url || '')}
                            label="ارفع صورة إجابتك أو ملف الحل"
                          />
                        </div>
                      ) : (
                        fileUrl && (
                          <div className="relative w-full h-64 mt-2 bg-[#090b14]/50 rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center shadow-inner">
                            <img src={fileUrl} alt="إجابة الطالب" className="max-h-full w-auto object-contain rounded-xl" />
                          </div>
                        )
                      )}
                    </div>
                  </AssignmentForm>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); handleSubmitAnswers({}); }} className="space-y-8">
                  <div className="bg-[#131836]/60 p-6 sm:p-8 rounded-[2.5rem] border border-white/10 shadow-lg">
                    <div>
                      <label className="block text-sm sm:text-base font-black text-white mb-4">نص الإجابة (اختياري إذا كان هناك ملف)</label>
                      <div className="rounded-2xl overflow-hidden border border-white/10 shadow-inner">
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
                      <label className="block text-sm sm:text-base font-black text-white mb-4">صورة الواجب (إجباري إذا لم تكتب نصاً)</label>
                      {!mySubmission ? (
                        <div className="bg-[#090b14]/50 p-2 rounded-2xl border border-white/5 shadow-inner">
                          <ImageUpload
                            initialImageUrl={fileUrl}
                            onUploadSuccess={(url) => setFileUrl(url || '')}
                            label="ارفع صورة الحل الخاص بك"
                          />
                        </div>
                      ) : (
                        fileUrl && (
                          <div className="relative w-full h-64 mt-2 bg-[#090b14]/50 rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center shadow-inner">
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
                        className="w-full flex justify-center items-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-5 text-lg font-black text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-400/50"
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
              <div className="flex items-center gap-1 p-1.5 bg-[#131836]/80 backdrop-blur-md rounded-2xl w-fit border border-white/10 shadow-inner">
                <button 
                  onClick={() => setActiveTab('submissions')}
                  className={`px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'submissions' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  <Users className="h-4 w-4" />
                  التسليمات
                </button>
                <button 
                  onClick={() => setActiveTab('preview')}
                  className={`px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'preview' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  <Eye className="h-4 w-4" />
                  معاينة الطالب
                </button>
              </div>
              
              {activeTab === 'submissions' && uniqueSections.length > 0 && (
                <div className="relative w-full sm:w-64 z-20">
                   <Filter className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-indigo-400" />
                   <select 
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      className="w-full pl-4 pr-12 py-3.5 bg-[#090b14]/80 backdrop-blur-md border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 shadow-inner appearance-none cursor-pointer [&>option]:bg-[#131836] transition-all"
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
              <div className="bg-[#131836]/60 backdrop-blur-2xl rounded-[2.5rem] shadow-xl border border-white/10 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="p-6 sm:p-8 border-b border-white/5 bg-[#090b14]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
                  <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                    <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl shadow-inner border border-indigo-500/30">
                      <Users className="h-6 w-6" />
                    </div>
                    تسليمات الطلاب
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <button onClick={exportToExcel} className="flex-1 md:flex-none items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-900 rounded-xl font-black border border-emerald-500/30 transition-all flex">
                      <FileSpreadsheet className="h-4 w-4" /> Excel
                    </button>
                    <button onClick={exportToPDF} className="flex-1 md:flex-none items-center justify-center gap-2 px-4 py-2.5 bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl font-black border border-rose-500/30 transition-all flex">
                      <Download className="h-4 w-4" /> PDF
                    </button>
                    <div className="flex-1 md:flex-none text-center px-4 py-2.5 bg-[#090b14]/80 rounded-xl shadow-inner border border-white/10 text-sm font-black text-white">
                      الإجمالي: {filteredSubmissions.length}
                    </div>
                  </div>
                </div>
                
                <div className="p-0 relative z-10">
                  {filteredSubmissions.length === 0 ? (
                    <div className="text-center py-20 bg-[#090b14]/20">
                      <div className="h-20 w-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-inner">
                        <FileText className="h-10 w-10 text-slate-500" />
                      </div>
                      <p className="text-slate-400 font-bold text-lg">لا توجد تسليمات متاحة في هذا التصنيف.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {filteredSubmissions.map((sub) => {
                         const st = sub.student as any;
                         const isGraded = sub.status === 'graded' || String(sub.status) === 'completed';

                         return (
                           <div key={sub.id} className="p-6 hover:bg-white/[0.02] transition-colors group">
                             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                               <div className="flex items-center gap-4 min-w-0">
                                 <div className="h-14 w-14 rounded-2xl bg-[#090b14] flex items-center justify-center text-indigo-400 border border-white/10 shadow-inner shrink-0 font-black text-xl">
                                   {st?.users?.full_name?.charAt(0) || st?.user?.full_name?.charAt(0) || 'ط'}
                                 </div>
                                 <div className="min-w-0 pr-1">
                                   <h3 className="font-black text-white text-base sm:text-lg truncate group-hover:text-indigo-400 transition-colors">{st?.users?.full_name || st?.user?.full_name || 'طالب غير معروف'}</h3>
                                   <p className="text-xs sm:text-sm font-bold text-slate-400 mt-1 flex items-center gap-1.5">
                                     <Clock className="h-3.5 w-3.5" />
                                     <span dir="ltr">{new Date(sub.submitted_at || (sub as any).created_at).toLocaleString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit' })}</span>
                                   </p>
                                   <p className="text-[10px] font-black text-indigo-400 mt-1.5 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 inline-block truncate max-w-full">
                                      {getStudentSectionName(st)}
                                   </p>
                                 </div>
                               </div>
                               <div className="flex items-center gap-3 justify-end border-t md:border-0 pt-4 md:pt-0 mt-2 md:mt-0 border-white/5 w-full md:w-auto shrink-0">
                                 {isGraded ? (
                                   <div className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-inner">
                                     <CheckCircle2 className="w-4 h-4" /> الدرجة: {sub.grade}
                                   </div>
                                 ) : (
                                   <span className="px-4 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl text-xs sm:text-sm font-black animate-pulse shadow-inner">
                                     بانتظار التقييم
                                   </span>
                                 )}
                                 
                                 {canEdit && (
                                   <button
                                     onClick={() => setSubmissionToDelete(sub.id)}
                                     className="h-11 w-11 flex items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all shadow-inner border border-rose-500/20 active:scale-95 shrink-0"
                                     title="حذف هذا التسليم لإتاحة الفرصة للطالب"
                                   >
                                     <Trash2 className="h-5 w-5" />
                                   </button>
                                 )}

                                 <Link 
                                   href={`/assignments/${assignmentId}/submissions/${sub.id}`}
                                   className="h-11 px-4 sm:px-6 rounded-xl bg-indigo-600 text-white text-xs sm:text-sm font-black hover:bg-indigo-500 transition-all flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)] border border-indigo-400/50 active:scale-95 flex-1 md:flex-none"
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
                <div className="mb-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-bold flex items-center gap-3 backdrop-blur-md shadow-inner">
                  <AlertCircle className="h-6 w-6 shrink-0" />
                  هذه معاينة لما يراه الطالب في صفحة التسليم. لن يتم حفظ أي إجابات تقوم بإدخالها هنا.
                </div>
                {questions.length > 0 ? (
                  <div className="dark-theme-override">
                    <AssignmentForm 
                      questions={sanitizedQuestions} 
                      onSubmit={() => showNotification('success', 'هذه معاينة فقط، لم يتم حفظ الإجابة')} 
                      readOnly={false}
                    />
                  </div>
                ) : (
                  <div className="bg-[#131836]/60 backdrop-blur-2xl p-12 rounded-[2.5rem] border border-white/10 text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="w-20 h-20 bg-[#090b14]/80 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-inner relative z-10">
                      <FileText className="h-10 w-10 text-slate-500" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2 relative z-10">لا توجد أسئلة تفاعلية</h3>
                    <p className="text-slate-400 font-bold relative z-10">هذا الواجب يعتمد على رفع ملف من قِبل الطالب. يمكنك إضافة أسئلة من خلال التعديل.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog.Root open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/80 backdrop-blur-md z-40 animate-in fade-in duration-300" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[90%] sm:w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[2.5rem] bg-[#0f1423] border border-rose-500/20 p-6 sm:p-8 shadow-[0_20px_60px_rgba(225,29,72,0.2)] focus:outline-none animate-in zoom-in-95 duration-300" dir="rtl">
            <div className="h-14 w-14 sm:h-16 sm:w-16 bg-rose-500/10 border border-rose-500/30 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-5 sm:mb-6 shadow-inner mx-auto sm:mx-0">
              <Trash2 className="h-6 w-6 sm:h-8 sm:w-8 text-rose-400 drop-shadow-md" />
            </div>
            <Dialog.Title className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight text-center sm:text-right drop-shadow-sm">
              تأكيد الحذف الشامل
            </Dialog.Title>
            <p className="text-slate-400 font-bold mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base text-center sm:text-right px-2 sm:px-0">هل أنت متأكد من رغبتك في حذف هذا الواجب نهائياً؟ سيتم مسح الواجب، والمرفقات، وجميع إجابات وتقييمات الطلاب المرتبطة به نهائياً ولن تتمكن من التراجع.</p>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Dialog.Close asChild>
                <button className="flex-1 rounded-xl sm:rounded-2xl bg-[#02040a]/80 border border-white/5 px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-slate-300 hover:bg-white/5 transition-all active:scale-95 shadow-inner">
                  إلغاء
                </button>
              </Dialog.Close>
              <button
                onClick={handleDeleteAssignmentAction}
                disabled={loading}
                className="flex-1 rounded-xl sm:rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 border border-rose-400/50 px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-white shadow-[0_0_20px_rgba(225,29,72,0.4)] hover:from-rose-500 hover:to-red-500 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto"/> : 'تأكيد الحذف نهائياً'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Submission Modal */}
      <Dialog.Root open={!!submissionToDelete} onOpenChange={(open) => !open && setSubmissionToDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/80 backdrop-blur-md z-40 animate-in fade-in duration-300" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[90%] sm:w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[2.5rem] bg-[#0f1423] border border-white/10 p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] focus:outline-none animate-in zoom-in-95 duration-300" dir="rtl">
            <div className="h-14 w-14 sm:h-16 sm:w-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-5 sm:mb-6 shadow-inner mx-auto sm:mx-0">
              <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-amber-400 drop-shadow-md" />
            </div>
            <Dialog.Title className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight text-center sm:text-right drop-shadow-sm">
              إلغاء تسليم الطالب
            </Dialog.Title>
            <p className="text-slate-400 font-bold mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base text-center sm:text-right px-2 sm:px-0">هل أنت متأكد أنك تريد حذف هذا التسليم وإجاباته؟ سيُسمح للطالب بإعادة تسليم الواجب من جديد إذا لم ينتهِ الوقت.</p>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Dialog.Close asChild>
                <button className="flex-1 rounded-xl sm:rounded-2xl bg-[#02040a]/80 border border-white/5 px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-slate-300 hover:bg-white/5 transition-all active:scale-95 shadow-inner">
                  إلغاء
                </button>
              </Dialog.Close>
              <button 
                onClick={handleDeleteSubmissionAction} 
                disabled={isDeletingSubmission} 
                className="flex-1 rounded-xl sm:rounded-2xl bg-amber-600 border border-amber-500/50 px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:bg-amber-500 transition-all active:scale-95 disabled:opacity-50"
              >
                {isDeletingSubmission ? <Loader2 className="w-5 h-5 animate-spin mx-auto"/> : 'تأكيد الإلغاء'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Edit Quick Modal */}
      <Dialog.Root open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/90 backdrop-blur-md z-40 animate-in fade-in duration-300" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95%] sm:w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[2.5rem] bg-[#0f1423] border border-white/10 p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] focus:outline-none max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300 custom-scrollbar" dir="rtl">
            <div className="flex items-center justify-between mb-6 sm:mb-8 pb-5 sm:pb-6 border-b border-white/5">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-inner flex items-center justify-center shrink-0">
                  <Clock className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-400 drop-shadow-md" />
                </div>
                <div>
                  <Dialog.Title className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-sm">تعديل سريع للوقت</Dialog.Title>
                  <p className="text-xs sm:text-sm text-slate-400 font-bold mt-1">تعديل عنوان الواجب وتمديد وقت التسليم فقط</p>
                </div>
              </div>
              <Dialog.Close className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-lg sm:rounded-xl bg-[#02040a] border border-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors shadow-inner active:scale-90">
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </Dialog.Close>
            </div>
            
            <form onSubmit={handleUpdateAssignment} className="space-y-6">
              <div className="space-y-5">
                <div className="glass-panel p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border-white/5 shadow-inner">
                  <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">عنوان الواجب <span className="text-rose-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    className="block w-full rounded-xl sm:rounded-2xl border-0 py-3.5 sm:py-4 px-4 sm:px-5 text-white bg-[#02040a]/60 focus:bg-[#02040a] ring-1 ring-inset ring-white/5 focus:ring-2 focus:ring-indigo-500/50 text-xs sm:text-sm transition-all font-bold shadow-inner outline-none" 
                    value={editData.title || ''} 
                    onChange={(e) => setEditData({...editData, title: e.target.value})} 
                  />
                </div>
                <div className="glass-panel p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border-white/5 shadow-inner">
                  <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">تاريخ ووقت التسليم الجديد <span className="text-rose-500">*</span></label>
                  <input 
                    type="datetime-local" 
                    required 
                    dir="ltr" 
                    style={{ colorScheme: 'dark' }} 
                    className="block w-full rounded-xl sm:rounded-2xl border-0 py-3.5 sm:py-4 px-4 sm:px-5 text-white bg-[#02040a]/60 focus:bg-[#02040a] ring-1 ring-inset ring-white/5 focus:ring-2 focus:ring-indigo-500/50 text-[10px] sm:text-xs transition-all font-bold text-left shadow-inner outline-none" 
                    value={editData.due_date ? new Date(new Date(editData.due_date).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ''} 
                    onChange={(e) => setEditData({...editData, due_date: e.target.value})} 
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-5 sm:pt-6 border-t border-white/5">
                <Dialog.Close asChild>
                  <button type="button" className="w-full sm:w-auto rounded-xl sm:rounded-2xl bg-[#02040a]/80 border border-white/5 px-6 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-slate-400 hover:bg-white/5 hover:text-white transition-all active:scale-95 shadow-inner">
                    إلغاء
                  </button>
                </Dialog.Close>
                <button type="submit" disabled={isSubmittingEdit} className="w-full sm:w-auto rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 border border-indigo-400/50 px-6 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:opacity-90 transition-all active:scale-95 disabled:opacity-50">
                  {isSubmittingEdit ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mx-auto"/> : 'حفظ التمديد'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Full Edit Modal */}
      <Dialog.Root open={isFullEditModalOpen} onOpenChange={setIsFullEditModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/90 backdrop-blur-md z-40 animate-in fade-in duration-300" />
          <Dialog.Content 
            onInteractOutside={(e) => e.preventDefault()} 
            onEscapeKeyDown={(e) => e.preventDefault()}
            className="fixed left-[50%] top-[50%] z-50 w-[95%] sm:w-full max-w-5xl translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[2.5rem] bg-[#0f1423] border border-white/10 p-5 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] focus:outline-none max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300 custom-scrollbar" 
            dir="rtl"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 pb-5 sm:pb-6 border-b border-white/5 gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-inner flex items-center justify-center shrink-0">
                  <Edit2 className="h-6 w-6 sm:h-7 sm:w-7 text-amber-400 drop-shadow-md" />
                </div>
                <div>
                  <Dialog.Title className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-sm">
                    تعديل شامل للواجب
                  </Dialog.Title>
                  <p className="text-xs sm:text-sm text-slate-400 font-bold mt-1">يمكنك تعديل المرفقات، الوصف، والأسئلة التفاعلية</p>
                </div>
              </div>
              <Dialog.Close className="absolute sm:relative top-5 left-5 sm:top-auto sm:left-auto h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-lg sm:rounded-xl bg-[#02040a] border border-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors shadow-inner active:scale-90">
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </Dialog.Close>
            </div>
            
            <form onSubmit={handleSaveFullEdit} className="space-y-6 sm:space-y-10">
              <div className="space-y-6 sm:space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                  {/* Left Column Form */}
                  <div className="space-y-5 sm:space-y-6">
                    <div className="glass-panel p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border-white/5 shadow-inner">
                      <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">عنوان الواجب <span className="text-rose-500">*</span></label>
                      <input 
                        type="text" 
                        required
                        className="block w-full rounded-xl sm:rounded-2xl border-0 py-3.5 sm:py-4 px-4 sm:px-5 text-white bg-[#02040a]/60 focus:bg-[#02040a] ring-1 ring-inset ring-white/5 focus:ring-2 focus:ring-amber-500/50 text-xs sm:text-sm transition-all font-bold shadow-inner outline-none"
                        value={editData.title || ''}
                        onChange={(e) => setEditData({...editData, title: e.target.value})}
                      />
                    </div>
                  
                    <div className="glass-panel p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border-white/5 shadow-inner">
                      <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">الوصف والتعليمات</label>
                      <div className="bg-[#02040a]/40 p-2 rounded-xl sm:rounded-2xl border border-white/5 shadow-inner flex flex-col min-h-[300px]">
                        <ForumEditor 
                          content={editDescription}
                          setContent={setEditDescription}
                          canUploadImage={true}
                        />
                      </div>
                    </div>

                    <div className="glass-panel p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border-white/5 shadow-inner">
                      <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">تاريخ التسليم <span className="text-rose-500">*</span></label>
                      <input 
                        type="datetime-local" 
                        required
                        className="block w-full rounded-xl sm:rounded-2xl border-0 py-3.5 sm:py-4 px-3 sm:px-4 text-white bg-[#02040a]/60 focus:bg-[#02040a] ring-1 ring-inset ring-white/5 focus:ring-2 focus:ring-amber-500/50 text-[10px] sm:text-xs transition-all font-bold text-left shadow-inner outline-none"
                        dir="ltr"
                        style={{ colorScheme: 'dark' }}
                        value={editData.due_date || ''}
                        onChange={(e) => setEditData({...editData, due_date: e.target.value})}
                      />
                    </div>

                    <div className="glass-panel p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border-white/5 shadow-inner">
                      <label className="flex items-center gap-2 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                        <Users className="w-4 h-4 text-amber-400" />
                        الشعب المستهدفة <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 max-h-52 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                        {sections.map((s: any) => {
                          const classObj = s.classes || s.class;
                          const cName = Array.isArray(classObj) ? classObj[0]?.name : classObj?.name;
                          return (
                            <label key={s.id} className={`flex items-center gap-2 sm:gap-3 cursor-pointer group p-2.5 sm:p-3 rounded-xl border transition-all shadow-inner ${editSectionIds.includes(s.id) ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-[#02040a]/60 border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-300'}`}>
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
                              <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-[0.4rem] border flex items-center justify-center shrink-0 transition-colors shadow-inner ${editSectionIds.includes(s.id) ? 'bg-amber-500 border-amber-400' : 'border-slate-600 bg-[#02040a]'}`}>
                                 {editSectionIds.includes(s.id) && <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-900" />}
                              </div>
                              <span className="text-xs sm:text-sm font-bold truncate">
                                {cName ? `${cName} - ${s.name}` : s.name}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="glass-panel p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border-white/5 shadow-inner">
                      <label className="flex items-center gap-2 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-3 sm:mb-4">
                        <ImageIcon className="w-4 h-4 text-amber-400" />
                        المرفق الحالي / تعديل
                      </label>
                      <div className="bg-[#02040a]/60 rounded-xl sm:rounded-2xl p-1.5 sm:p-2 border border-white/5 shadow-inner">
                        <ImageUpload
                          initialImageUrl={editFileUrl}
                          onUploadSuccess={(url) => setEditFileUrl(url || '')}
                          label="تغيير المرفق"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Question Builder */}
                  <div className="bg-[#02040a]/40 rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-6 lg:p-8 border border-white/5 shadow-inner relative overflow-hidden h-fit">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-[60px] pointer-events-none"></div>
                    <div className="flex items-center gap-2 sm:gap-3 mb-5 sm:mb-6 relative z-10">
                      <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg sm:rounded-xl shadow-inner shrink-0">
                         <Layout className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 drop-shadow-sm" />
                      </div>
                      <h4 className="text-base sm:text-lg font-black text-white drop-shadow-sm">بناء الأسئلة التفاعلية</h4>
                    </div>
                    <div className="relative z-10">
                      <AssignmentBuilder questions={editQuestions} onChange={setEditQuestions} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-6 sm:pt-8 border-t border-white/5">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="w-full sm:w-auto rounded-xl sm:rounded-2xl bg-[#02040a]/80 border border-white/5 px-6 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-slate-400 hover:bg-white/5 hover:text-white transition-all active:scale-95 shadow-inner"
                  >
                    إلغاء الأمر
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="w-full sm:w-auto rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 border border-amber-400/50 px-6 sm:px-10 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmittingEdit ? (
                    <><div className="h-4 w-4 sm:h-5 sm:w-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> جاري الحفظ...</>
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
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #02040a; border-radius: 12px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 12px; border: 1px solid #02040a; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4f46e5; }
        
        /* 🚀 التغليف الذكي للجدول (Table Wrapper) */
        .table-responsive-wrapper {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 5px;
        }
        
        .dark-theme-override table {
          min-width: max-content !important;
          border-collapse: collapse !important;
        }

        .dark-theme-override th, .dark-theme-override td {
          padding: 1rem !important;
          text-align: center !important;
          vertical-align: middle !important;
          border: 1px solid rgba(255,255,255,0.05) !important;
          white-space: normal !important;
          word-wrap: break-word !important;
        }
        
        .dark-theme-override th {
          background-color: rgba(99, 102, 241, 0.15) !important;
          color: #a5b4fc !important; 
          font-weight: 900 !important;
        }
        .dark-theme-override td {
          background-color: rgba(15, 20, 35, 0.4) !important;
        }
        
        /* تحسين شكل حقول الإدخال داخل الجداول في الموبايل */
        .dark-theme-override td input, .dark-theme-override td textarea {
          width: 100% !important;
          min-width: 120px !important;
          background-color: rgba(2, 4, 10, 0.8) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: #34d399 !important; 
          font-weight: 900 !important;
          text-align: center !important;
          padding: 0.75rem !important;
          border-radius: 0.75rem !important;
          transition: all 0.2s ease-in-out !important;
        }
        .dark-theme-override td input:focus, .dark-theme-override td textarea:focus {
          border-color: rgba(52, 211, 153, 0.5) !important;
          outline: none !important;
          box-shadow: 0 0 15px rgba(52, 211, 153, 0.2) !important;
        }

        .dark-theme-override input:not(td input), .dark-theme-override textarea:not(td textarea), .dark-theme-override select { background-color: rgba(2, 4, 10, 0.6) !important; border-color: rgba(255, 255, 255, 0.05) !important; color: white !important; }
        .dark-theme-override .bg-white { background-color: transparent !important; }
        .dark-theme-override .bg-slate-50 { background-color: rgba(15, 20, 35, 0.6) !important; border-color: rgba(255, 255, 255, 0.05) !important; }
        .dark-theme-override .text-slate-900, .dark-theme-override .text-slate-800, .dark-theme-override .text-slate-700 { color: #f8fafc !important; }
        .dark-theme-override .text-slate-500, .dark-theme-override .text-slate-400 { color: #94a3b8 !important; }
        .dark-theme-override .border-slate-200, .dark-theme-override .border-slate-300 { border-color: rgba(255, 255, 255, 0.1) !important; }
      `}} />
    </div>
  );
}
