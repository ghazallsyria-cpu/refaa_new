/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { FileText, Clock, Link as LinkIcon, Users, User, CheckCircle, CheckCircle2, AlertCircle, ArrowRight, Upload, Edit2, Trash2, Share2, Eye, X, Calendar, Download, FileSpreadsheet, Trophy, ImageIcon, MessageSquare, Award, MinusCircle, XCircle, Target, Play, Send, AlertTriangle, Filter, Loader2, Layout, ShieldAlert } from 'lucide-react';
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
import ForumEditor from '@/components/ForumEditor';
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

export default function AssignmentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const assignmentId = resolvedParams.id;
  
  const router = useRouter();
  const { user, authRole, userRole, isChecking: authLoading } = useAuth() as { user: any, authRole: string | null, userRole: string | null, isChecking: boolean };
  const currentRole = authRole || userRole;
  
  const { fetchAssignmentDetails, submitAssignment, saveAssignment, deleteAssignment, deleteSubmission, fetchAssignmentQuestions, updateFullAssignment } = useAssignmentsSystem();
  
  const { data: formData, isLoading: formLoading } = useSchoolFormData();
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
  
  // States for Full Edit Modal
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

  useEffect(() => {
    setMounted(true);
  }, []);

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
       return { 'اسم الطالب': name, 'الفصل': section, 'الدرجة': score, 'العلامة الكاملة': maxScore, 'الحالة': status, 'تاريخ التسليم': date };
    });
    const worksheet = XLSX.utils.json_to_sheet(csvData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "التسليمات");
    XLSX.writeFile(workbook, `تسليمات_${assignment?.title || 'الواجب'}_${selectedSection}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { showNotification('error', 'يرجى السماح بالنوافذ المنبثقة للطباعة.'); return; }
    const maxScore = questions.reduce((acc, q) => acc + (Number(q.points) || 0), 0) || 100;
    const gradedSubs = filteredSubmissions.filter(s => s.status === 'graded' || String(s.status) === 'completed');
    const avgScore = gradedSubs.length > 0 ? Math.round(gradedSubs.reduce((sum, s) => sum + (Number(s.grade) || 0), 0) / gradedSubs.length) : 0;
    const tableRows = filteredSubmissions.map((sub, index) => {
       const name = sub.student?.user?.full_name || (sub.student as any)?.users?.full_name || 'طالب مجهول';
       const section = getStudentSectionName(sub.student); 
       const isGraded = sub.status === 'graded' || String(sub.status) === 'completed';
       const score = isGraded ? (sub.grade || 0) : 'قيد المراجعة';
       const date = new Date(sub.submitted_at || (sub as any).created_at).toLocaleString('ar-EG');
       return `<tr><td>${index + 1}</td><td><strong>${name}</strong></td><td>${section}</td><td style="text-align: center; font-weight: bold; color: ${isGraded ? '#4f46e5' : '#94a3b8'}">${score} ${isGraded ? `/ ${maxScore}` : ''}</td><td style="text-align: center;">${date}</td></tr>`;
    }).join('');

    const html = `<html dir="rtl" lang="ar"><head><title>سجل تسليمات الواجب - ${assignment?.title}</title><style>@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');body { font-family: 'Cairo', sans-serif; padding: 40px; color: #1e293b; background: #fff; }.header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }.header h1 { color: #4f46e5; margin: 0 0 10px 0; font-size: 28px; font-weight: 900; }.header h2 { color: #64748b; font-size: 18px; margin: 0; font-weight: 700; }.info-grid { display: flex; justify-content: space-between; background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 30px; font-size: 14px; border: 1px solid #e2e8f0; }table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }th { background-color: #4f46e5; color: white; padding: 15px; text-align: right; font-weight: bold; border: 1px solid #e2e8f0; }th:nth-child(4), th:nth-child(5) { text-align: center; }td { padding: 15px; border: 1px solid #e2e8f0; }tr:nth-child(even) { background-color: #f8fafc; }.footer { text-align: center; margin-top: 50px; font-size: 12px; color: #94a3b8; }@media print {body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }.info-grid { border: 1px solid #000; background: #f8fafc !important; }table, th, td { border: 1px solid #000; }th { background-color: #f1f5f9 !important; color: #000 !important; }}</style></head><body><div class="header"><h1>📄 كشف تسليمات الواجب</h1><h2>${assignment?.title || 'واجب'} - ${(assignment as any)?.subject_name || 'مادة عامة'}</h2>${selectedSection !== 'الكل' ? `<h3 style="color:#ef4444; font-size: 16px; margin-top:10px;">خاص بطلاب: ${selectedSection}</h3>` : ''}</div><div class="info-grid"><div><strong>إجمالي الطلاب المٌسلمين:</strong> ${filteredSubmissions.length}</div><div><strong>تم التقييم:</strong> ${gradedSubs.length}</div><div><strong>العلامة الكاملة للواجب:</strong> ${maxScore}</div><div><strong>متوسط درجات الطلاب:</strong> ${avgScore}</div></div><table><thead><tr><th width="5%">#</th><th width="30%">اسم الطالب</th><th width="25%">الفصل</th><th width="20%">الدرجة</th><th width="20%">تاريخ التسليم</th></tr></thead><tbody>${tableRows}</tbody></table><div class="footer">تم إصدار هذا الكشف تلقائياً من منصة الرفعة الرقمية بتاريخ ${new Date().toLocaleString('ar-EG')}</div><script>window.onload = () => { setTimeout(() => window.print(), 800); }</script></body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    const cacheKey = `assign_cache_${assignmentId}_${user.id}_${currentRole}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    
    // 🚀 Soft Reload (تحديث صامت) لتجنب الوميض المزعج
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

  // 🚀 Auto-Save for students
  useEffect(() => {
    if (currentRole === 'student' && !mySubmission && assignmentId && user?.id) {
      const draftData = { answers: myAnswers, content, fileUrl };
      const hasData = Object.keys(myAnswers).length > 0 || content || fileUrl;
      const draftKey = `draft_assign_${assignmentId}_${user.id}`;
      if (hasData) localStorage.setItem(draftKey, JSON.stringify(draftData));
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
        return { question_id: qId, answer_text: safeAnswerText, selected_options: safeSelectedOptions };
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
      const { error } = await supabase.from('assignments').update(payload).eq('id', assignmentId);
      if (error) throw error;
      sessionStorage.removeItem(`assign_cache_${assignmentId}_${user?.id}_${currentRole}`);
      showNotification('success', 'تم التحديث بنجاح');
      setIsEditModalOpen(false);
      await fetchData();
    } catch (error: any) {
      showNotification('error', 'خطأ في التحديث: ' + error.message);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // 🚀 Full Edit Logic (التعديل الشامل للواجب بجميع تفاصيله)
  const openFullEditModal = async () => {
    if (!assignment) return;
    const dateObj = new Date(assignment.due_date);
    const formattedDate = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    
    setEditData({
      ...assignment,
      due_date: formattedDate,
      teacher_id: assignment.teacher_id,
    });
    setEditDescription(assignment.description || '');
    setEditFileUrl(assignment.file_url || '');
    
    const secIds = assignment.assignment_sections?.map((as: any) => as.section_id) || (assignment as any).section_ids || [];
    setEditSectionIds(secIds);
    
    setEditQuestions(questions);
    setIsFullEditModalOpen(true);
  };

  const handleSaveFullEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData.title || !editData.due_date) return;

    if (!editSectionIds || editSectionIds.length === 0) {
      showNotification('error', 'عذراً، يجب تحديد شعبة واحدة على الأقل');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const payload = {
        title: editData.title,
        description: editDescription,
        due_date: new Date(editData.due_date).toISOString(),
        file_url: editFileUrl,
        teacher_id: editData.teacher_id || assignment?.teacher_id,
      };

      if (updateFullAssignment) {
        await updateFullAssignment(assignmentId, payload, editQuestions, editSectionIds, subjects);
      } else {
        await saveAssignment(payload, assignmentId, editQuestions, editSectionIds, subjects);
      }

      sessionStorage.removeItem(`assign_cache_${assignmentId}_${user?.id}_${currentRole}`);
      showNotification('success', 'تم حفظ التعديلات الشاملة بنجاح');
      setIsFullEditModalOpen(false);
      await fetchData();
    } catch (error: any) {
      console.error('Error saving full edit:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء حفظ التعديلات');
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

  if (!mounted || authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-transparent font-cairo">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
             <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)]"></div>
             <ShieldAlert className="absolute h-8 w-8 text-indigo-400 animate-pulse" />
          </div>
          <p className="text-indigo-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }
  
  if (loading && !assignment) {
    return (
      <div className="flex h-screen items-center justify-center bg-transparent font-cairo text-slate-200">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-14 h-14 text-indigo-500 animate-spin drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
          <p className="text-slate-400 font-bold animate-pulse tracking-widest">جاري سحب بيانات الواجب...</p>
        </div>
      </div>
    );
  }

  if (!assignment && !loading) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center text-slate-200 font-cairo px-4">
        <div className="glass-panel p-10 rounded-[3rem] border border-white/10 text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-w-md w-full relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-[60px]"></div>
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4 opacity-80 relative z-10" />
          <h3 className="text-2xl sm:text-3xl font-black text-white mb-2 tracking-tight relative z-10">الواجب غير موجود</h3>
          <p className="text-slate-400 font-bold text-sm sm:text-base relative z-10">ربما تم حذفه أو أن الرابط غير صحيح.</p>
          <Link href="/assignments" className="mt-8 inline-block px-8 py-3.5 bg-[#0f1423]/80 hover:bg-[#0f1423] text-white rounded-2xl font-black transition-all border border-white/10 shadow-inner relative z-10 active:scale-95">
            العودة للواجبات
          </Link>
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
  const canEdit = currentRole === 'admin' || currentRole === 'management' || (assignment as any)?.teacher_id === user?.id;

  return (
    <div className="min-h-screen bg-transparent text-slate-100 font-cairo pb-24 relative overflow-x-hidden pt-6" dir="rtl">
      
      {/* 🚀 الخلفية الزجاجية المضيئة المريحة للعين */}
      <div className="fixed top-[-10%] right-[-10%] w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none z-0" />

      <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* إشعارات النظام */}
        <AnimatePresence>
          {notification && (
            <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-[100] px-6 sm:px-8 py-3.5 sm:py-4 rounded-[1.5rem] sm:rounded-3xl shadow-2xl flex items-center gap-3 sm:gap-4 transition-all backdrop-blur-3xl border w-[90%] sm:w-auto ${
              notification.type === 'success' ? 'bg-[#02040a]/90 text-emerald-400 border-emerald-500/50 shadow-[0_20px_50px_rgba(16,185,129,0.3)]' : 'bg-[#02040a]/90 text-rose-400 border-rose-500/50 shadow-[0_20px_50px_rgba(244,63,94,0.3)]'
            }`}>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                {notification.type === 'success' ? <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" /> : <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />}
              </div>
              <div className="font-black tracking-tight text-xs sm:text-sm md:text-base text-white drop-shadow-sm leading-snug">{notification.message}</div>
              <button onClick={() => setNotification(null)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors mr-auto text-white active:scale-90">
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🚀 الهيدر العلوي وأزرار التحكم */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4">
            <Link href="/assignments" className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-xl sm:rounded-2xl glass-panel text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-all shrink-0 active:scale-95 shadow-inner">
              <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-md leading-tight">{assignment?.title}</h1>
                {isOverdue ? (
                  <span className="px-2.5 sm:px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-inner shrink-0">منتهي</span>
                ) : (
                  <span className="px-2.5 sm:px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-inner shrink-0">نشط</span>
                )}
              </div>
              <p className="text-slate-400 font-bold mt-1 text-xs sm:text-sm drop-shadow-sm">{(assignment as any).subject_name || (assignment as any).subject?.name} - {fullSectionName}</p>
            </div>
          </div>

          <div className="flex flex-row flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full md:w-auto">
            <button onClick={copyAssignmentLink} className="h-10 sm:h-12 flex-1 sm:flex-none px-4 rounded-xl sm:rounded-2xl bg-[#02040a]/60 border border-white/5 text-slate-400 hover:text-indigo-400 hover:bg-[#0f1423] hover:border-indigo-500/30 transition-all flex items-center justify-center gap-2 shadow-inner font-black text-xs sm:text-sm active:scale-95">
              <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">مشاركة</span>
            </button>
            
            {canEdit && (
              <>
                <button onClick={() => setIsEditModalOpen(true)} className="h-10 sm:h-12 flex-1 sm:flex-none px-4 sm:px-5 rounded-xl sm:rounded-2xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-slate-950 border border-indigo-500/30 transition-all flex items-center justify-center gap-2 font-black shadow-inner active:scale-95 text-xs sm:text-sm whitespace-nowrap">
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span>تمديد الوقت</span>
                </button>
                <button onClick={openFullEditModal} className="h-10 sm:h-12 flex-1 sm:flex-none px-4 sm:px-5 rounded-xl sm:rounded-2xl bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/30 transition-all flex items-center justify-center gap-2 font-black shadow-inner active:scale-95 text-xs sm:text-sm whitespace-nowrap">
                  <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span>تعديل الأسئلة</span>
                </button>
                <button onClick={() => setIsDeleteModalOpen(true)} className="h-10 sm:h-12 w-10 sm:w-12 flex items-center justify-center rounded-xl sm:rounded-2xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/30 transition-all shadow-inner shrink-0 active:scale-95">
                  <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* 🚀 قسم التفاصيل والمرفقات (الزجاج الملكي) */}
        <div className="glass-panel rounded-[2rem] sm:rounded-[3rem] shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden relative border-white/10">
          <div className="absolute top-0 left-0 w-32 h-32 sm:w-48 sm:h-48 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
          <div className="p-5 sm:p-8 lg:p-10 relative z-10">
            <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black border shadow-inner ${isOverdue ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                <span dir="ltr">آخر موعد: {format(dueDateObj, 'yyyy/MM/dd HH:mm')}</span>
              </div>
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-[#02040a]/60 text-slate-300 border border-white/5 text-[10px] sm:text-xs font-black shadow-inner">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
                <span>أ. {(assignment as any).teacher_name || (assignment as any).teacher?.user?.full_name || (assignment as any).teacher?.users?.full_name}</span>
              </div>
            </div>

            <div className="mb-6 sm:mb-8">
              <h3 className="text-lg sm:text-xl font-black text-white mb-3 sm:mb-4 flex items-center gap-2 drop-shadow-sm"><BookOpen className="w-5 h-5 text-indigo-400"/> وصف الواجب</h3>
              {assignment?.description ? (
                 <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed text-sm sm:text-base font-bold bg-[#0f1423]/40 p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] shadow-inner border border-white/5" dangerouslySetInnerHTML={{ __html: assignment.description }} />
              ) : (
                 <p className="text-slate-500 font-bold bg-[#02040a]/40 p-4 rounded-xl border border-dashed border-white/5 text-center text-xs sm:text-sm shadow-inner">لا يوجد وصف إضافي.</p>
              )}
            </div>

            {assignment?.file_url && (
              <div className="mt-6 sm:mt-8">
                <h3 className="text-lg sm:text-xl font-black text-white mb-3 sm:mb-4 flex items-center gap-2 drop-shadow-sm">
                  <FileText className="h-5 w-5 text-indigo-400" />
                  المرفقات
                </h3>
                {assignment.file_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null || assignment.file_url.includes('cloudinary.com/image') ? (
                  <div className="relative w-full max-w-2xl h-auto min-h-[200px] sm:min-h-[300px] bg-[#02040a]/60 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 overflow-hidden shadow-inner flex items-center justify-center p-2">
                    <img src={assignment.file_url} alt="مرفق الواجب" className="max-h-[300px] sm:max-h-[500px] w-auto object-contain rounded-xl" />
                  </div>
                ) : (
                  <div className="p-4 sm:p-6 rounded-[1.5rem] bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
                    <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                      <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-[#02040a] flex items-center justify-center shadow-inner border border-white/5 shrink-0"><FileText className="h-5 w-5 sm:h-7 sm:w-7 text-indigo-400" /></div>
                      <div>
                        <h4 className="font-black text-white text-sm sm:text-base drop-shadow-sm">ملف مرفق</h4><p className="text-xs sm:text-sm text-slate-400 font-bold">انقر للتحميل والمشاهدة</p>
                      </div>
                    </div>
                    <a href={assignment.file_url} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto h-10 sm:h-12 px-6 sm:px-8 rounded-xl sm:rounded-2xl bg-indigo-600 text-xs sm:text-sm font-black text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 active:scale-95 border border-indigo-400/50 shrink-0">
                      <LinkIcon className="h-4 w-4" /> <span>تحميل المرفق</span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 🚀 قسم الطالب (الحل والنتائج) */}
        {currentRole === 'student' && (
          <div className="glass-panel rounded-[2rem] sm:rounded-[3rem] shadow-[0_10px_40px_rgba(0,0,0,0.5)] border-white/10 overflow-hidden relative">
            <div className="p-6 sm:p-8 border-b border-white/5 bg-[#02040a]/40 relative z-10 flex items-center gap-3">
              <div className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-inner border ${isGraded ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                {isGraded ? <Trophy className="h-5 w-5 sm:h-6 sm:w-6 drop-shadow-sm" /> : <Upload className="h-5 w-5 sm:h-6 sm:w-6 drop-shadow-sm" />}
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-white drop-shadow-md">
                {isGraded ? 'نتيجة الواجب والتغذية الراجعة' : 'تسليم الإجابة'}
              </h2>
            </div>
            
            <div className="p-5 sm:p-6 lg:p-8 relative z-10">
              
              {isGraded && (
                <div className="mb-8 sm:mb-10 p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/20 shadow-inner relative overflow-hidden backdrop-blur-md">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[60px] -mr-10 -mt-10 pointer-events-none"></div>
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6 relative z-10">
                     <div className="w-full md:w-auto">
                       <h3 className="text-lg sm:text-xl lg:text-2xl font-black text-emerald-400 flex items-center gap-2 mb-2 drop-shadow-md">
                         <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8" /> تم التقييم بنجاح!
                       </h3>
                       <p className="text-xs sm:text-sm text-slate-300 font-bold leading-relaxed max-w-lg">لقد قام معلمك بمراجعة الواجب الخاص بك. يمكنك الاطلاع على الدرجة والملاحظات التفصيلية بالأسفل.</p>
                     </div>
                     <div className="shrink-0 flex flex-col items-center bg-[#02040a]/80 px-6 sm:px-8 py-4 sm:py-5 rounded-[1rem] sm:rounded-[1.5rem] shadow-inner border border-emerald-500/30 w-full md:w-auto">
                       <span className="text-[9px] sm:text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1 drop-shadow-sm">الدرجة النهائية</span>
                       <div className="text-3xl sm:text-4xl font-black text-white drop-shadow-md">
                         {mySubmission?.grade} <span className="text-base sm:text-lg text-slate-500">/ {questions.reduce((acc: number, q: any) => acc + (Number(q.points)||0), 0) || 100}</span>
                       </div>
                     </div>
                  </div>
                  {mySubmission?.feedback && (
                    <div className="mt-5 sm:mt-6 p-4 sm:p-5 bg-[#02040a]/60 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-emerald-500/20 shadow-inner">
                      <p className="text-[10px] sm:text-xs font-black text-emerald-400 mb-2 flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> ملاحظة المعلم العامة:</p>
                      <p className="text-white leading-relaxed font-bold text-sm sm:text-base">{mySubmission.feedback}</p>
                    </div>
                  )}
                </div>
              )}

              {isGraded && questions.length > 0 ? (
                <div className="space-y-5 sm:space-y-6">
                  <h3 className="text-base sm:text-lg lg:text-xl font-black text-white mb-4 sm:mb-6 flex items-center gap-2 px-1 sm:px-2 drop-shadow-sm">
                     <Target className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-400" /> المراجعة التفصيلية لأسئلة الواجب
                  </h3>
                  
                  {questions.map((q: any, idx: number) => {
                    const studentAns = myAnswers[q.id];
                    const answerDetails = fullAnswersMap[q.id]; 
                    
                    const isHeader = String(q.type) === 'section_header';
                    const isComparison = String(q.type) === 'comparison';
                    const safeOptions = q.options && Array.isArray(q.options) ? q.options : [];
                    
                    if (isHeader) {
                       return (
                         <div key={q.id} className="pt-5 sm:pt-6 pb-2 border-b border-indigo-500/20 mt-6 sm:mt-8">
                            <div className="prose prose-invert max-w-none text-lg sm:text-xl lg:text-2xl font-black text-indigo-300 leading-relaxed drop-shadow-sm" dangerouslySetInnerHTML={{ __html: q.content || (q as any).text || '' }} />
                            {q.media_url && <img src={q.media_url} className="mt-3 sm:mt-4 max-h-48 sm:max-h-64 rounded-xl border border-white/5 shadow-inner" alt="مرفق" />}
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
                      <div key={q.id} className={`bg-[#0f1423]/40 rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden shadow-inner border transition-all hover:border-white/20 ${isUnanswered ? 'border-white/5' : isCorrect ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
                        <div className="p-4 sm:p-6 lg:p-8 bg-[#02040a]/40 border-b border-white/5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-6">
                          <div className="flex gap-3 sm:gap-4 items-start w-full min-w-0">
                            <div className={`shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-base sm:text-lg shadow-inner border ${isUnanswered ? 'bg-white/5 text-slate-500 border-white/10' : isCorrect ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                {idx + 1}
                            </div>
                            <div className="pt-1 sm:pt-1.5 min-w-0 w-full">
                               <div className="prose prose-invert max-w-none font-bold text-sm sm:text-base lg:text-lg text-white leading-relaxed overflow-hidden" dangerouslySetInnerHTML={renderContentWithMath((q as any).text || q.content || '')} />
                               {q.media_url && <img src={q.media_url} className="mt-3 sm:mt-4 max-h-40 sm:max-h-48 rounded-xl border border-white/5 shadow-inner" alt="توضيح" />}
                            </div>
                          </div>
                          <div className="flex items-center justify-center gap-1.5 bg-[#02040a] px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm border border-white/5 shrink-0 self-start sm:self-auto shadow-inner w-fit">
                            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
                            <span className={isCorrect ? 'text-emerald-400 drop-shadow-sm' : 'text-white'}>{answerDetails?.points_earned || 0}</span>
                            <span className="text-slate-600">/</span>
                            <span className="text-slate-500">{Number(q.points) || 0}</span>
                          </div>
                        </div>

                        <div className="p-4 sm:p-6 lg:p-8">
                          {isComparison ? (
                            <div className={`rounded-xl sm:rounded-2xl border overflow-hidden shadow-inner ${isUnanswered ? 'border-white/5 bg-[#02040a]/40' : isCorrect ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
                              <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-right border-collapse min-w-[500px] sm:min-w-[600px]">
                                  <thead>
                                    <tr className={isUnanswered ? 'bg-[#02040a]/80' : isCorrect ? 'bg-emerald-500/10' : 'bg-rose-500/10'}>
                                      <th className="p-3 sm:p-4 border-b border-l border-white/5 font-black text-slate-400 text-xs sm:text-sm w-1/3">وجه المقارنة</th>
                                      <th className="p-3 sm:p-4 border-b border-l border-white/5 font-black text-slate-300 text-xs sm:text-sm text-center w-1/3">{safeOptions[0] || 'الطرف الأول'}</th>
                                      <th className="p-3 sm:p-4 border-b border-white/5 font-black text-slate-300 text-xs sm:text-sm text-center w-1/3">{safeOptions[1] || 'الطرف الثاني'}</th>
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
                                        <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                                          <td className="p-3 sm:p-4 border-b border-l border-white/5 font-bold text-slate-400 text-xs sm:text-sm bg-[#02040a]/40 align-top">
                                            <div dangerouslySetInnerHTML={renderContentWithMath(aspect)} />
                                          </td>
                                          <td className="p-3 sm:p-4 border-b border-l border-white/5 font-bold text-white text-xs sm:text-sm align-top whitespace-pre-wrap">{parsedAns[rIdx]?.[0] ? <div dangerouslySetInnerHTML={renderContentWithMath(parsedAns[rIdx][0])} /> : <span className="text-slate-600 italic">فارغ</span>}</td>
                                          <td className="p-3 sm:p-4 border-b border-white/5 font-bold text-white text-xs sm:text-sm align-top whitespace-pre-wrap">{parsedAns[rIdx]?.[1] ? <div dangerouslySetInnerHTML={renderContentWithMath(parsedAns[rIdx][1])} /> : <span className="text-slate-600 italic">فارغ</span>}</td>
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
                                 <a href={String(studentAnswerText)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-indigo-400 font-bold text-xs sm:text-sm hover:underline px-3 sm:px-4 py-2">
                                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" /> تحميل إجابة الطالب المرفقة
                                 </a>
                              )}
                            </div>
                          ) : (
                            <div className={`p-4 sm:p-5 rounded-xl sm:rounded-2xl border mb-3 sm:mb-4 shadow-inner ${isUnanswered ? 'bg-[#02040a]/40 border-white/5 border-dashed text-slate-500 italic' : isCorrect ? 'bg-emerald-500/5 border-emerald-500/20 text-white' : 'bg-rose-500/5 border-rose-500/20 text-white'}`}>
                              <div className="text-[10px] sm:text-xs font-black mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                                {isUnanswered ? <MinusCircle className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" /> : isCorrect ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 drop-shadow-sm"/> : <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400 drop-shadow-sm"/>}
                                <span className={isUnanswered ? 'text-slate-500' : isCorrect ? 'text-emerald-400 drop-shadow-sm' : 'text-rose-400 drop-shadow-sm'}>إجابتك:</span>
                              </div>
                              <div className={`text-sm sm:text-base font-bold whitespace-pre-wrap leading-relaxed ${isUnanswered ? 'text-slate-600 italic' : 'text-white'}`}>
                                  {isUnanswered ? 'لم تقم بتقديم إجابة لهذا السؤال.' : <div dangerouslySetInnerHTML={renderContentWithMath(studentAnswerText as string)} />}
                              </div>
                            </div>
                          )}

                          {answerDetails?.feedback && (
                            <div className="mt-3 sm:mt-4 p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-indigo-500/5 border border-indigo-500/20 relative overflow-hidden shadow-inner">
                              <div className="absolute right-0 top-0 w-1 h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                              <div className="text-[10px] sm:text-xs font-black text-indigo-400 mb-1.5 sm:mb-2 flex items-center gap-1.5 drop-shadow-sm">
                                  <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> رسالة من المعلم:
                              </div>
                              <p className="text-sm sm:text-base font-bold text-white leading-relaxed pl-1">{answerDetails.feedback}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {(mySubmission?.content || mySubmission?.file_url) && (
                    <div className="mt-6 sm:mt-8 p-5 sm:p-6 lg:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] bg-[#02040a]/40 border border-white/5 shadow-inner">
                      <h3 className="text-base sm:text-lg lg:text-xl font-black text-white mb-4 sm:mb-6 flex items-center gap-2 drop-shadow-sm">
                         <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-400" /> المرفقات والنصوص الإضافية التي أرسلتها
                      </h3>
                      
                      {mySubmission?.content && (
                        <div className="bg-[#0f1423]/60 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-white/5 mb-4 shadow-inner">
                          <p className="text-slate-300 whitespace-pre-wrap font-bold text-sm sm:text-base leading-relaxed">{mySubmission.content}</p>
                        </div>
                      )}
                      {mySubmission?.file_url && (
                        <div className="relative w-full h-48 sm:h-64 lg:h-72 bg-[#02040a]/80 rounded-xl sm:rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center p-2 shadow-inner">
                          <img src={mySubmission.file_url} alt="إجابة الطالب المرفقة" className="max-h-full w-auto object-contain rounded-lg sm:rounded-xl" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : questions.length > 0 ? (
                <div className="dark-theme-override">
                  <AssignmentForm 
                    questions={questions} 
                    onSubmit={handleSubmitAnswers} 
                    onChange={(newAnswers) => setMyAnswers(newAnswers)} 
                    isSubmitting={isSubmitting}
                    initialAnswers={myAnswers}
                    readOnly={!!mySubmission}
                  >
                    <div className="bg-[#02040a]/40 p-5 sm:p-6 lg:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 shadow-inner mt-6 sm:mt-8">
                      <label className="block text-xs sm:text-sm font-black text-white mb-3 sm:mb-4">نص الإجابة الإضافي (اختياري)</label>
                      <textarea
                        rows={4}
                        className="block w-full rounded-xl sm:rounded-2xl border border-white/5 py-3 sm:py-4 px-4 sm:px-5 text-white bg-[#0f1423]/60 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/50 text-xs sm:text-sm transition-all resize-none font-bold disabled:opacity-60 mb-5 sm:mb-6 shadow-inner outline-none custom-scrollbar"
                        placeholder="إذا أردت إضافة ملاحظة نصية للمعلم..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        disabled={!!mySubmission}
                      />

                      <label className="block text-xs sm:text-sm font-black text-white mb-3 sm:mb-4">ملف الإجابة (ارفع صورة الحل هنا)</label>
                      {!mySubmission ? (
                        <div className="bg-[#0f1423]/40 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border border-white/5 shadow-inner">
                          <ImageUpload
                            initialImageUrl={fileUrl}
                            onUploadSuccess={(url) => setFileUrl(url || '')}
                            label="ارفع صورة إجابتك أو ملف الحل"
                          />
                        </div>
                      ) : (
                        fileUrl && (
                          <div className="relative w-full h-48 sm:h-64 mt-2 bg-[#02040a]/60 rounded-xl sm:rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center shadow-inner">
                            <img src={fileUrl} alt="إجابة الطالب" className="max-h-full w-auto object-contain rounded-lg sm:rounded-xl" />
                          </div>
                        )
                      )}
                    </div>
                  </AssignmentForm>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); handleSubmitAnswers({}); }} className="space-y-6 sm:space-y-8">
                  <div className="bg-[#02040a]/40 p-5 sm:p-6 lg:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/5 shadow-inner">
                    <div>
                      <label className="block text-xs sm:text-sm font-black text-white mb-3 sm:mb-4 drop-shadow-sm">نص الإجابة (اختياري إذا كان هناك ملف)</label>
                      <textarea
                        rows={6}
                        className="block w-full rounded-xl sm:rounded-2xl border border-white/5 py-3 sm:py-4 px-4 sm:px-5 text-white bg-[#0f1423]/60 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/50 text-xs sm:text-sm transition-all resize-none font-bold disabled:opacity-60 shadow-inner outline-none custom-scrollbar"
                        placeholder="اكتب إجابتك هنا بالتفصيل..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        disabled={!!mySubmission}
                      />
                    </div>
                    
                    <div className="mt-6 sm:mt-8">
                      <label className="block text-xs sm:text-sm font-black text-white mb-3 sm:mb-4 drop-shadow-sm">صورة الواجب (إجباري إذا لم تكتب نصاً)</label>
                      {!mySubmission ? (
                        <div className="bg-[#0f1423]/40 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border border-white/5 shadow-inner">
                          <ImageUpload
                            initialImageUrl={fileUrl}
                            onUploadSuccess={(url) => setFileUrl(url || '')}
                            label="ارفع صورة الحل الخاص بك"
                          />
                        </div>
                      ) : (
                        fileUrl && (
                          <div className="relative w-full h-48 sm:h-64 mt-2 bg-[#02040a]/60 rounded-xl sm:rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center shadow-inner">
                            <img src={fileUrl} alt="إجابة الطالب" className="max-h-full w-auto object-contain rounded-lg sm:rounded-xl" />
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {!mySubmission && (
                    <div className="pt-2 sm:pt-4">
                      <button
                        type="submit"
                        disabled={isSubmitting || (!content && !fileUrl)}
                        className="w-full flex justify-center items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 sm:px-8 py-4 sm:py-5 text-sm sm:text-lg font-black text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:from-indigo-500 hover:to-blue-500 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-400/50"
                      >
                        {isSubmitting ? (
                          <div className="h-5 w-5 sm:h-6 sm:w-6 border-[3px] border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Send className="h-5 w-5 sm:h-6 sm:w-6" />
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
        
        {/* 👨‍🏫 واجهة المعلم / الإدارة (قائمة التسليمات) */}
        {['teacher', 'admin', 'management'].includes(currentRole || '') && (
          <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-1.5 p-1.5 bg-[#02040a]/60 backdrop-blur-md rounded-xl sm:rounded-2xl w-full sm:w-fit border border-white/5 shadow-inner overflow-x-auto custom-scrollbar">
                <button 
                  onClick={() => setActiveTab('submissions')}
                  className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 flex-1 sm:flex-none whitespace-nowrap ${activeTab === 'submissions' ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] border border-indigo-400/50' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
                >
                  <Users className="h-4 w-4 shrink-0" />
                  التسليمات
                </button>
                <button 
                  onClick={() => setActiveTab('preview')}
                  className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 flex-1 sm:flex-none whitespace-nowrap ${activeTab === 'preview' ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] border border-indigo-400/50' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
                >
                  <Eye className="h-4 w-4 shrink-0" />
                  معاينة الطالب
                </button>
              </div>
              
              {activeTab === 'submissions' && uniqueSections.length > 0 && (
                <div className="relative w-full sm:w-64 z-20 group">
                   <Filter className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors pointer-events-none" />
                   <select 
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      className="w-full pl-4 pr-10 sm:pr-12 py-3 sm:py-3.5 bg-[#02040a]/60 backdrop-blur-md border border-white/5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold text-white outline-none focus:bg-[#02040a] focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 shadow-inner appearance-none cursor-pointer [&>option]:bg-[#0f1423] transition-all"
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
              <div className="glass-panel rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none -mr-10 -mt-10"></div>
                <div className="p-5 sm:p-6 lg:p-8 border-b border-white/5 bg-[#02040a]/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10 text-center sm:text-right">
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-white flex items-center justify-center sm:justify-start gap-3 drop-shadow-sm w-full md:w-auto">
                    <div className="p-2 sm:p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl sm:rounded-2xl shadow-inner border border-indigo-500/20 shrink-0">
                      <Users className="h-5 w-5 sm:h-6 sm:w-6 drop-shadow-sm" />
                    </div>
                    تسليمات الطلاب
                  </h2>
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full md:w-auto">
                    <button onClick={exportToExcel} className="flex-1 md:flex-none items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 rounded-lg sm:rounded-xl font-black border border-emerald-500/20 transition-all flex text-xs sm:text-sm active:scale-95 shadow-inner">
                      <FileSpreadsheet className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" /> Excel
                    </button>
                    <button onClick={exportToPDF} className="flex-1 md:flex-none items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg sm:rounded-xl font-black border border-rose-500/20 transition-all flex text-xs sm:text-sm active:scale-95 shadow-inner">
                      <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" /> PDF
                    </button>
                    <div className="flex-1 md:flex-none text-center px-3 sm:px-4 py-2 sm:py-2.5 bg-[#02040a]/80 rounded-lg sm:rounded-xl shadow-inner border border-white/5 text-[10px] sm:text-xs font-black text-slate-300">
                      الإجمالي: <span className="text-white mx-1">{filteredSubmissions.length}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-0 relative z-10 bg-transparent">
                  {filteredSubmissions.length === 0 ? (
                    <div className="text-center py-16 sm:py-20 bg-[#02040a]/40">
                      <div className="h-16 w-16 sm:h-20 sm:w-20 bg-white/5 rounded-2xl sm:rounded-[2rem] flex items-center justify-center mx-auto mb-4 border border-white/5 shadow-inner">
                        <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-slate-500 drop-shadow-md" />
                      </div>
                      <p className="text-slate-400 font-bold text-sm sm:text-base">لا توجد تسليمات متاحة في هذا التصنيف.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {filteredSubmissions.map((sub) => {
                         const st = sub.student as any;
                         const isGraded = sub.status === 'graded' || String(sub.status) === 'completed';

                         return (
                           <div key={sub.id} className="p-4 sm:p-5 lg:p-6 hover:bg-[#02040a]/60 transition-colors group flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-5">
                             <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 w-full md:w-auto">
                               <div className="h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 rounded-xl sm:rounded-2xl bg-[#02040a] flex items-center justify-center text-indigo-400 border border-white/5 shadow-inner shrink-0 font-black text-lg sm:text-xl drop-shadow-sm group-hover:border-indigo-500/30 transition-colors">
                                 {st?.users?.full_name?.charAt(0) || st?.user?.full_name?.charAt(0) || 'ط'}
                               </div>
                               <div className="min-w-0 pr-1">
                                 <h3 className="font-black text-white text-sm sm:text-base lg:text-lg truncate group-hover:text-indigo-400 transition-colors drop-shadow-sm leading-tight mb-1">{st?.users?.full_name || st?.user?.full_name || 'طالب غير معروف'}</h3>
                                 <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                   <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 flex items-center gap-1 sm:gap-1.5 bg-[#02040a]/80 px-2 py-0.5 sm:py-1 rounded-md border border-white/5 shadow-inner">
                                     <Clock className="h-3 w-3 shrink-0" />
                                     <span dir="ltr">{new Date(sub.submitted_at || (sub as any).created_at).toLocaleString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit' })}</span>
                                   </p>
                                   <p className="text-[9px] sm:text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 sm:py-1 rounded-md border border-indigo-500/20 shadow-inner truncate max-w-[120px] sm:max-w-xs">
                                      {getStudentSectionName(st)}
                                   </p>
                                 </div>
                               </div>
                             </div>
                             
                             <div className="flex items-center gap-2 sm:gap-3 justify-end border-t md:border-0 pt-3 md:pt-0 border-white/5 w-full md:w-auto shrink-0">
                               {isGraded ? (
                                 <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black flex items-center gap-1.5 sm:gap-2 shadow-inner">
                                   <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> الدرجة: {sub.grade}
                                 </div>
                               ) : (
                                 <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black animate-pulse shadow-inner">
                                   بانتظار التقييم
                                 </span>
                               )}
                               
                               {canEdit && (
                                 <button
                                   onClick={() => setSubmissionToDelete(sub.id)}
                                   className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-lg sm:rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all shadow-inner border border-rose-500/20 active:scale-95 shrink-0"
                                   title="حذف هذا التسليم لإتاحة الفرصة للطالب"
                                 >
                                   <Trash2 className="h-4 w-4 sm:h-4 sm:w-4" />
                                 </button>
                               )}

                               <Link 
                                 href={`/assignments/${assignmentId}/submissions/${sub.id}`}
                                 className="h-8 sm:h-10 px-3 sm:px-5 rounded-lg sm:rounded-xl bg-indigo-600 text-white text-[10px] sm:text-xs font-black hover:bg-indigo-500 transition-all flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.3)] border border-indigo-400/50 active:scale-95 flex-1 md:flex-none"
                               >
                                 تصحيح وتقييم
                               </Link>
                             </div>
                           </div>
                         );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto">
                <div className="mb-6 sm:mb-8 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs sm:text-sm font-bold flex items-start sm:items-center gap-3 backdrop-blur-md shadow-inner leading-relaxed">
                  <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 shrink-0 mt-0.5 sm:mt-0" />
                  هذه معاينة دقيقة لما يراه الطالب في شاشة الحل. لن يتم حفظ أي إجابات تقوم بإدخالها هنا.
                </div>
                {questions.length > 0 ? (
                  <div className="dark-theme-override">
                    <AssignmentForm 
                      questions={questions} 
                      onSubmit={() => showNotification('success', 'هذه معاينة فقط، لم يتم حفظ الإجابة')} 
                      readOnly={false}
                    />
                  </div>
                ) : (
                  <div className="glass-panel p-8 sm:p-12 rounded-[2rem] sm:rounded-[3rem] border border-white/10 text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none"></div>
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#02040a]/80 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center mx-auto mb-4 sm:mb-6 border border-white/5 shadow-inner relative z-10">
                      <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-slate-500 drop-shadow-md" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white mb-2 relative z-10 drop-shadow-sm">لا توجد أسئلة تفاعلية</h3>
                    <p className="text-xs sm:text-sm text-slate-400 font-bold relative z-10 max-w-sm mx-auto">هذا الواجب يعتمد على إرفاق ملف من قِبل الطالب. يمكنك إضافة أسئلة من خلال تعديل الواجب.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {/* 🚀 Delete Confirmation Modal (Royal Theme) */}
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

        {/* 🚀 Delete Submission Modal (Royal Theme) */}
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

        {/* 🚀 Edit Quick Modal (Royal Theme) */}
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

        {/* 🚀 Full Edit Modal (Royal Theme) */}
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
                        <div className="bg-[#02040a]/40 p-2 rounded-xl sm:rounded-2xl border border-white/5 shadow-inner">
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
          .dark-theme-override input, .dark-theme-override textarea, .dark-theme-override select { background-color: rgba(2, 4, 10, 0.6) !important; border-color: rgba(255, 255, 255, 0.05) !important; color: white !important; }
          .dark-theme-override .bg-white { background-color: transparent !important; }
          .dark-theme-override .bg-slate-50 { background-color: rgba(15, 20, 35, 0.6) !important; border-color: rgba(255, 255, 255, 0.05) !important; }
          .dark-theme-override .text-slate-900, .dark-theme-override .text-slate-800, .dark-theme-override .text-slate-700 { color: #f8fafc !important; }
          .dark-theme-override .text-slate-500, .dark-theme-override .text-slate-400 { color: #94a3b8 !important; }
          .dark-theme-override .border-slate-200, .dark-theme-override .border-slate-300 { border-color: rgba(255, 255, 255, 0.1) !important; }
        `}} />
      </div>
    </div>
  );
}
