/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { FileText, Clock, Link as LinkIcon, Users, User, CheckCircle2, AlertCircle, ArrowRight, Upload, Edit2, Trash2, Share2, Eye, X, Calendar, Download, FileSpreadsheet, Trophy, ImageIcon, MessageSquare, Award, MinusCircle, XCircle, Target, Play, Send, AlertTriangle, Filter, Loader2, Save } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { RawAssignmentAnswer, AssignmentWithMeta, SubmissionWithStudent } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import AssignmentForm from '@/components/assignment-form';
import AssignmentBuilder from '@/components/assignment-builder';
import ForumEditor from '@/components/ForumEditor';
import ImageUpload from '@/components/ImageUpload';
import * as XLSX from 'xlsx';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { useAssignmentsSystem } from '@/hooks/useAssignmentsSystem';
import { useSchoolFormData } from '@/hooks/useSchoolFormData';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

const getStatusColor = (s: string) => s === 'published' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : s === 'draft' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-slate-800 text-slate-400 border-slate-700';
const getStatusLabel = (s: string) => s === 'published' ? 'منشور' : s === 'draft' ? 'مسودة' : s === 'archived' ? 'مؤرشف' : s;
const renderMath = (c: string) => ({ __html: !c ? '' : c.replace(/\$\$([\s\S]*?)\$\$/g, '<span class="math-tex text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded-md font-mono font-bold mx-1 shadow-inner inline-block max-w-full break-words whitespace-pre-wrap" dir="ltr">$1</span>') });

export default function AssignmentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const assignmentId = resolvedParams.id;
  const router = useRouter();
  const { user, authRole, userRole, isChecking: authLoading } = useAuth() as any;
  const currentRole = authRole || userRole;
  
  const { fetchAssignmentDetails, submitAssignment, saveAssignment, deleteAssignment, deleteSubmission, updateFullAssignment } = useAssignmentsSystem();
  const { data: formData } = useSchoolFormData();
  const subjects = formData?.subjects || [];
  const sections = formData?.sections || [];
  const teachers = formData?.teachers || [];
  
  const [assignment, setAssignment] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionWithStudent[]>([]);
  const [mySubmission, setMySubmission] = useState<SubmissionWithStudent | null>(null);
  const [myAnswers, setMyAnswers] = useState<Record<string, any>>({});
  const [fullAnswersMap, setFullAnswersMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  
  // States for Full Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [editDescription, setEditDescription] = useState('');
  const [editFileUrl, setEditFileUrl] = useState('');
  const [editQuestions, setEditQuestions] = useState<any[]>([]);
  const [editSectionIds, setEditSectionIds] = useState<string[]>([]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<string | null>(null);
  const [isDeletingSubmission, setIsDeletingSubmission] = useState(false);
  const [activeTab, setActiveTab] = useState<'submissions' | 'preview'>('submissions');
  
  const [content, setContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{type: 'success'|'error', message: string} | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>('الكل');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  const showNotification = (t: 'success'|'error', m: string) => { setNotification({ type: t, message: m }); setTimeout(() => setNotification(null), 5000); };
  
  const getSectionName = (st: any) => {
    if (!st || (!st.sections && !st.section)) return 'بدون فصل';
    const sec = Array.isArray(st.sections || st.section) ? (st.sections || st.section)[0] : (st.sections || st.section);
    if (!sec) return 'بدون فصل';
    const cls = Array.isArray(sec.classes || sec.class) ? (sec.classes || sec.class)[0] : (sec.classes || sec.class);
    return (cls?.name && sec.name) ? `${cls.name} - ${sec.name}` : sec.name || 'بدون فصل';
  };

  const uniqueSections = Array.from(new Set(submissions.map(sub => getSectionName(sub.student)))).filter(Boolean);
  const filteredSubmissions = selectedSection === 'الكل' ? submissions : submissions.filter(sub => getSectionName(sub.student) === selectedSection);

  const exportToExcel = () => {
    const maxScore = questions.reduce((a, q) => a + (Number(q.points) || 0), 0) || 100;
    const csvData = filteredSubmissions.map(sub => ({
       'اسم الطالب': sub.student?.user?.full_name || (sub.student as any)?.users?.full_name || 'طالب مجهول',
       'الفصل': getSectionName(sub.student), 
       'الدرجة': (sub.status === 'graded' || String(sub.status) === 'completed') ? (sub.grade || 0) : 'قيد المراجعة',
       'العلامة الكاملة': maxScore,
       'الحالة': (sub.status === 'graded' || String(sub.status) === 'completed') ? 'مقيّم' : 'يحتاج تصحيح',
       'تاريخ التسليم': new Date(sub.submitted_at || (sub as any).created_at).toLocaleString('ar-EG')
    }));
    const worksheet = XLSX.utils.json_to_sheet(csvData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "التسليمات");
    XLSX.writeFile(workbook, `تسليمات_${assignment?.title}_${selectedSection}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { showNotification('error', 'يرجى السماح بالنوافذ المنبثقة.'); return; }
    const maxScore = questions.reduce((a, q) => a + (Number(q.points) || 0), 0) || 100;
    const gradedSubs = filteredSubmissions.filter(s => s.status === 'graded' || String(s.status) === 'completed');
    const avgScore = gradedSubs.length > 0 ? Math.round(gradedSubs.reduce((sum, s) => sum + (Number(s.grade) || 0), 0) / gradedSubs.length) : 0;
    const rows = filteredSubmissions.map((sub, i) => {
       const isG = sub.status === 'graded' || String(sub.status) === 'completed';
       return `<tr><td>${i+1}</td><td><strong>${sub.student?.user?.full_name || (sub.student as any)?.users?.full_name || 'طالب مجهول'}</strong></td><td>${getSectionName(sub.student)}</td><td style="text-align:center;font-weight:bold;color:${isG ? '#4f46e5' : '#94a3b8'}">${isG ? sub.grade : 'قيد المراجعة'} ${isG ? `/ ${maxScore}` : ''}</td><td style="text-align:center;">${new Date(sub.submitted_at || (sub as any).created_at).toLocaleString('ar-EG')}</td></tr>`;
    }).join('');
    const html = `<html dir="rtl"><head><title>كشف ${assignment?.title}</title><style>body{font-family:sans-serif;padding:40px}.header{text-align:center;margin-bottom:30px;border-bottom:2px solid #e2e8f0;padding-bottom:20px}.header h1{color:#4f46e5;font-size:28px}.info-grid{display:flex;justify-content:space-between;background:#f8fafc;padding:20px;border-radius:12px;margin-bottom:30px;border:1px solid #e2e8f0}table{width:100%;border-collapse:collapse}th{background:#4f46e5;color:#fff;padding:15px;text-align:right}td{padding:15px;border:1px solid #e2e8f0}@media print{body{padding:0}table,th,td{border:1px solid #000}th{background:#f1f5f9!important;color:#000!important}}</style></head><body><div class="header"><h1>📄 كشف تسليمات الواجب</h1><h2>${assignment?.title}</h2></div><div class="info-grid"><div>إجمالي المسلمين: ${filteredSubmissions.length}</div><div>تم التقييم: ${gradedSubs.length}</div><div>متوسط الدرجات: ${avgScore} / ${maxScore}</div></div><table><thead><tr><th>#</th><th>اسم الطالب</th><th>الفصل</th><th>الدرجة</th><th>التاريخ</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>setTimeout(()=>window.print(),800)</script></body></html>`;
    printWindow.document.write(html); printWindow.document.close();
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    const cacheKey = `assign_cache_${assignmentId}_${user.id}_${currentRole}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        setAssignment(parsed.assignment); 
        if (parsed.questions) setQuestions(parsed.questions);
        if (currentRole === 'student' && parsed.submission) {
           setMySubmission(parsed.submission); setContent(parsed.submission.content || ''); setFileUrl(parsed.submission.file_url || '');
           if (parsed.answers) {
             const ansMap: any = {}, fMap: any = {};
             parsed.answers.forEach((a: any) => { ansMap[a.question_id] = a.selected_options || a.answer_text; fMap[a.question_id] = a; });
             setMyAnswers(ansMap); setFullAnswersMap(fMap);
           }
        } else if (['teacher', 'admin', 'management'].includes(currentRole || '')) setSubmissions(parsed.allSubmissions || []);
        setLoading(false); 
      } catch (e) {}
    } else setLoading(true);

    try {
      const details = await fetchAssignmentDetails(assignmentId);
      sessionStorage.setItem(cacheKey, JSON.stringify(details));
      setAssignment(details.assignment); 
      if (details.questions) setQuestions(details.questions);
      if (currentRole === 'student') {
        if (details.submission) {
          setMySubmission(details.submission as any); setContent((details.submission as any).content || ''); setFileUrl((details.submission as any).file_url || '');
          if (details.answers) {
            const ansMap: any = {}, fMap: any = {};
            details.answers.forEach((a: any) => { ansMap[a.question_id] = a.selected_options || a.answer_text; fMap[a.question_id] = a; });
            setMyAnswers(ansMap); setFullAnswersMap(fMap);
          }
        } else {
          const draft = localStorage.getItem(`draft_assign_${assignmentId}_${user.id}`);
          if (draft) { try { const p = JSON.parse(draft); if (p.answers) setMyAnswers(p.answers); if (p.content) setContent(p.content); if (p.fileUrl) setFileUrl(p.fileUrl); } catch(e){} }
        }
      } else if (['teacher', 'admin', 'management'].includes(currentRole || '')) setSubmissions(details.allSubmissions);
    } catch (e) {} finally { setLoading(false); }
  }, [assignmentId, user, currentRole, fetchAssignmentDetails]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (currentRole === 'student' && !mySubmission && assignmentId && user?.id && (Object.keys(myAnswers).length > 0 || content || fileUrl)) {
      localStorage.setItem(`draft_assign_${assignmentId}_${user.id}`, JSON.stringify({ answers: myAnswers, content, fileUrl }));
    }
  }, [myAnswers, content, fileUrl, currentRole, mySubmission, assignmentId, user?.id]);

  const handleSubmitAnswers = async (ans: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const payload: RawAssignmentAnswer[] = Object.entries(ans).map(([qId, value]) => {
        const isM = ['multiple_choice','checkbox','true_false'].includes(questions.find(q => q.id === qId)?.type || '');
        return { question_id: qId, answer_text: isM ? null : (typeof value === 'object' ? JSON.stringify(value) : (value || '')), selected_options: isM ? (Array.isArray(value) ? value : (value ? [value] : [])) : null };
      });
      await submitAssignment(assignmentId, payload, mySubmission?.id, content, fileUrl);
      localStorage.removeItem(`draft_assign_${assignmentId}_${user?.id}`);
      sessionStorage.removeItem(`assign_cache_${assignmentId}_${user?.id}_${currentRole}`);
      showNotification('success', 'تم التسليم بنجاح!');
      await fetchData();
    } catch (e: any) { showNotification('error', e.message); } finally { setIsSubmitting(false); }
  };

  // 🚀 دالة فتح نافذة التعديل الشامل ونسخ البيانات الحالية إليها
  const openFullEditModal = () => {
    setEditData({ title: assignment.title, due_date: assignment.due_date, teacher_id: assignment.teacher_id, subject_id: assignment.subject_id });
    setEditDescription(assignment.description || '');
    setEditFileUrl(assignment.file_url || '');
    setEditQuestions([...questions]);
    const currentSectionIds = assignment.assignment_sections?.map((as: any) => as.section_id || as.sections?.id) || [];
    setEditSectionIds(currentSectionIds);
    setIsEditModalOpen(true);
  };

  // 🚀 دالة الحفظ الشامل (تستدعي updateFullAssignment من الهوك)
  const handleSaveFullEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingEdit(true);
    try {
      const payload: any = { 
        title: editData.title!, 
        due_date: new Date(editData.due_date!).toISOString(),
        description: editDescription,
        file_url: editFileUrl,
        subject_id: editData.subject_id
      };
      if (currentRole === 'admin' || currentRole === 'management') {
         payload.teacher_id = editData.teacher_id;
      }
      await updateFullAssignment(assignmentId, payload, editQuestions, editSectionIds, subjects);
      sessionStorage.removeItem(`assign_cache_${assignmentId}_${user?.id}_${currentRole}`);
      showNotification('success', 'تم تعديل الواجب بالكامل بنجاح');
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
    } catch (e: any) { showNotification('error', e.message); }
  };

  const handleDeleteSubmissionAction = async () => {
    if (!submissionToDelete) return; setIsDeletingSubmission(true);
    try {
      await deleteSubmission(submissionToDelete);
      sessionStorage.removeItem(`assign_cache_${assignmentId}_${user?.id}_${currentRole}`);
      showNotification('success', 'تم حذف التسليم'); setSubmissionToDelete(null); await fetchData();
    } catch (e: any) { showNotification('error', e.message); } finally { setIsDeletingSubmission(false); }
  };

  if (!mounted || loading || authLoading) return <div className="flex h-screen items-center justify-center bg-[#090b14]"><Loader2 className="w-14 h-14 text-indigo-500 animate-spin drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" /></div>;
  if (!assignment) return <div className="min-h-screen bg-[#090b14] flex flex-col items-center justify-center text-slate-200"><AlertCircle className="w-16 h-16 text-rose-500 mb-4" /><h3 className="text-3xl font-black">الواجب غير موجود</h3></div>;

  const isOverdue = new Date(assignment.due_date) < new Date();
  const fSec = (assignment as any).assignment_sections?.[0]?.sections || (assignment as any).assignment_sections?.[0]?.section;
  const fullSecName = (Array.isArray(fSec?.classes || fSec?.class) ? (fSec?.classes || fSec?.class)[0]?.name : (fSec?.classes || fSec?.class)?.name) ? `${(Array.isArray(fSec?.classes || fSec?.class) ? (fSec?.classes || fSec?.class)[0]?.name : (fSec?.classes || fSec?.class)?.name)} - ${fSec?.name || ''}` : fSec?.name || '';
  const canEdit = currentRole === 'admin' || currentRole === 'management' || (assignment as any)?.teacher_id === user?.id;

  return (
    <div className="min-h-screen bg-[#090b14] text-slate-200 font-cairo pb-24 relative overflow-x-hidden" dir="rtl">
      <div className="fixed top-1/4 left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none z-0" />

      <div className="space-y-8 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-8">
        <AnimatePresence>
          {notification && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-[100] px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 backdrop-blur-md border ${notification.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50'}`}>
              <div className="h-10 w-10 rounded-2xl bg-[#090b14]/50 flex items-center justify-center border border-white/5">{notification.type === 'success' ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}</div>
              <div className="font-black text-lg text-white">{notification.message}</div>
              <button onClick={() => setNotification(null)} className="p-1 hover:bg-white/10 rounded-lg text-white"><X className="h-5 w-5" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link href="/assignments" className="h-12 w-12 flex items-center justify-center rounded-2xl bg-[#131836]/60 backdrop-blur-md border border-white/10 text-slate-400 hover:text-white transition-all"><ArrowRight className="h-6 w-6" /></Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl sm:text-4xl font-black text-white">{assignment.title}</h1>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-inner ${new Date(assignment.due_date) < new Date() ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>{new Date(assignment.due_date) < new Date() ? 'منتهي' : 'نشط'}</span>
              </div>
              <p className="text-slate-400 font-bold mt-2">{(assignment as any).subject_name || (assignment as any).subject?.name} - {fullSecName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); showNotification('success', 'تم النسخ'); }} className="h-12 px-4 rounded-2xl bg-[#090b14]/50 border border-white/10 text-slate-300 hover:text-indigo-400 transition-all flex items-center justify-center gap-2 font-black text-sm"><Share2 className="h-4 w-4" /> <span className="hidden sm:inline">مشاركة</span></button>
            {canEdit && (
              <>
                <button onClick={openFullEditModal} className="h-12 px-6 rounded-2xl bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-slate-900 border border-indigo-500/30 transition-all flex items-center justify-center gap-2 font-black"><Edit2 className="h-4 w-4" /> <span className="hidden sm:inline">تعديل شامل</span></button>
                <button onClick={() => setIsDeleteModalOpen(true)} className="h-12 w-12 flex items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/30 transition-all shrink-0"><Trash2 className="h-5 w-5" /></button>
              </>
            )}
          </div>
        </div>

        <div className="bg-[#131836]/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="p-8 relative z-10">
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-black border shadow-inner ${isOverdue ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'}`}><Clock className="h-5 w-5" /><span dir="ltr">آخر موعد: {format(dueDateObj, 'yyyy/MM/dd HH:mm')}</span></div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#090b14]/50 text-slate-300 border border-white/5 text-sm font-black shadow-inner"><User className="h-5 w-5 text-slate-400" /><span>أ. {(assignment as any).teacher_name || (assignment as any).teacher?.user?.full_name || (assignment as any).teacher?.users?.full_name}</span></div>
            </div>
            <div className="mb-8">
              <h3 className="text-xl font-black text-white mb-4">وصف الواجب</h3>
              {assignment.description ? <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: assignment.description }} /> : <p className="text-slate-500 font-bold bg-[#090b14]/30 p-4 rounded-xl border border-dashed border-white/10 text-center">لا يوجد وصف إضافي.</p>}
            </div>
            {assignment.file_url && (
              <div className="mt-8">
                <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2"><FileText className="h-5 w-5 text-indigo-400" /> المرفقات</h3>
                {assignment.file_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null || assignment.file_url.includes('cloudinary') ? (
                  <div className="relative w-full max-w-2xl min-h-[300px] bg-[#090b14]/50 rounded-[2rem] border border-white/5 overflow-hidden flex items-center justify-center p-2"><img src={assignment.file_url} className="max-h-[500px] object-contain rounded-xl" /></div>
                ) : (
                  <div className="p-6 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-4"><div className="flex items-center gap-4"><div className="h-14 w-14 rounded-2xl bg-[#090b14] flex items-center justify-center border border-white/5"><FileText className="h-7 w-7 text-indigo-400" /></div><div><h4 className="font-black text-white">ملف مرفق</h4></div></div><a href={assignment.file_url} target="_blank" className="px-8 py-3 rounded-2xl bg-indigo-600 text-sm font-black text-white hover:bg-indigo-500 flex items-center gap-2"><LinkIcon className="h-5 w-5" /> تحميل</a></div>
                )}
              </div>
            )}
          </div>
        </div>

        {currentRole === 'student' && (
          <div className="bg-[#131836]/60 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 overflow-hidden relative">
            <div className="p-8 border-b border-white/5 bg-[#090b14]/30"><h2 className="text-2xl font-black text-white flex items-center gap-3"><div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl">{mySubmission?.status === 'graded' ? <Trophy className="h-6 w-6" /> : <Upload className="h-6 w-6" />}</div>{mySubmission?.status === 'graded' ? 'النتيجة' : 'تسليم الإجابة'}</h2></div>
            <div className="p-6 sm:p-8">
              {mySubmission?.status === 'graded' && (
                <div className="mb-10 p-8 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex justify-between items-center"><div className="text-4xl font-black text-white">{mySubmission.grade} <span className="text-lg text-slate-500">/ 100</span></div></div>
              )}
              {mySubmission?.status === 'graded' && questions.length > 0 ? (
                <div className="space-y-6">
                  {questions.map((q: any, idx: number) => {
                    const stdAns = myAnswers[q.id]; const ansDet = fullAnswersMap[q.id];
                    const isC = ansDet?.is_correct || Number(ansDet?.points_earned) > 0;
                    return (
                      <div key={q.id} className={`bg-[#090b14]/50 rounded-3xl p-6 border ${isC ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
                        <div className="font-black text-white text-lg mb-4" dangerouslySetInnerHTML={renderMath(q.content)} />
                        <div className="text-slate-400 font-bold mb-2">إجابتك: {typeof stdAns === 'object' ? JSON.stringify(stdAns) : String(stdAns || 'فارغ')}</div>
                        {ansDet?.feedback && <div className="text-indigo-400 font-bold mt-2 border-t border-white/10 pt-2">{ansDet.feedback}</div>}
                      </div>
                    );
                  })}
                </div>
              ) : questions.length > 0 ? (
                <AssignmentForm questions={questions} onSubmit={handleSubmitAnswers} onChange={setMyAnswers} isSubmitting={isSubmitting} initialAnswers={myAnswers} readOnly={!!mySubmission}>
                  <div className="mt-8"><textarea rows={4} className="w-full bg-[#090b14] border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-indigo-500" placeholder="نص اختياري..." value={content} onChange={e=>setContent(e.target.value)} disabled={!!mySubmission}/></div>
                </AssignmentForm>
              ) : (
                <form onSubmit={e => { e.preventDefault(); handleSubmitAnswers({}); }}><textarea rows={4} className="w-full bg-[#090b14] border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-indigo-500 mb-4" placeholder="إجابتك..." value={content} onChange={e=>setContent(e.target.value)} disabled={!!mySubmission}/>{!mySubmission && <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl">{isSubmitting ? 'جاري...' : 'إرسال'}</button>}</form>
              )}
            </div>
          </div>
        )}
        
        {['teacher', 'admin', 'management'].includes(currentRole || '') && (
          <div className="space-y-8">
            <div className="flex gap-2"><button onClick={()=>setActiveTab('submissions')} className={`px-6 py-3 rounded-xl font-black ${activeTab === 'submissions' ? 'bg-indigo-600 text-white' : 'text-slate-400 bg-white/5'}`}>التسليمات</button><button onClick={()=>setActiveTab('preview')} className={`px-6 py-3 rounded-xl font-black ${activeTab === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-400 bg-white/5'}`}>معاينة</button></div>
            {activeTab === 'submissions' ? (
              <div className="bg-[#131836]/60 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 p-8"><div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black text-white">التسليمات ({filteredSubmissions.length})</h2></div><div className="space-y-4">{filteredSubmissions.map(sub => (<div key={sub.id} className="bg-[#090b14]/50 p-6 rounded-2xl flex justify-between items-center"><div className="font-black text-white text-lg">{(sub.student as any)?.users?.full_name || 'طالب'}</div><Link href={`/assignments/${assignmentId}/submissions/${sub.id}`} className="bg-indigo-600 px-6 py-2 rounded-xl text-white font-black">تصحيح</Link></div>))}</div></div>
            ) : (<div className="text-center p-12 bg-white/5 rounded-3xl font-bold text-slate-400">معاينة الطالب</div>)}
          </div>
        )}
      </div>
      /* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { FileText, Clock, Link as LinkIcon, Users, User, CheckCircle2, AlertCircle, ArrowRight, Upload, Edit2, Trash2, Share2, Eye, X, Calendar, Download, FileSpreadsheet, Trophy, ImageIcon, MessageSquare, Award, MinusCircle, XCircle, Target, Play, Send, AlertTriangle, Filter, Loader2, Save } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { RawAssignmentAnswer, AssignmentWithMeta, SubmissionWithStudent } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import AssignmentForm from '@/components/assignment-form';
import AssignmentBuilder from '@/components/assignment-builder';
import ForumEditor from '@/components/ForumEditor';
import ImageUpload from '@/components/ImageUpload';
import * as XLSX from 'xlsx';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { useAssignmentsSystem } from '@/hooks/useAssignmentsSystem';
import { useSchoolFormData } from '@/hooks/useSchoolFormData';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

const getStatusColor = (s: string) => s === 'published' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : s === 'draft' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-slate-800 text-slate-400 border-slate-700';
const getStatusLabel = (s: string) => s === 'published' ? 'منشور' : s === 'draft' ? 'مسودة' : s === 'archived' ? 'مؤرشف' : s;
const renderMath = (c: string) => ({ __html: !c ? '' : c.replace(/\$\$([\s\S]*?)\$\$/g, '<span class="math-tex text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded-md font-mono font-bold mx-1 shadow-inner inline-block max-w-full break-words whitespace-pre-wrap" dir="ltr">$1</span>') });

export default function AssignmentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const assignmentId = resolvedParams.id;
  const router = useRouter();
  const { user, authRole, userRole, isChecking: authLoading } = useAuth() as any;
  const currentRole = authRole || userRole;
  
  const { fetchAssignmentDetails, submitAssignment, saveAssignment, deleteAssignment, deleteSubmission, updateFullAssignment } = useAssignmentsSystem();
  const { data: formData } = useSchoolFormData();
  const subjects = formData?.subjects || [];
  const sections = formData?.sections || [];
  const teachers = formData?.teachers || [];
  
  const [assignment, setAssignment] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionWithStudent[]>([]);
  const [mySubmission, setMySubmission] = useState<SubmissionWithStudent | null>(null);
  const [myAnswers, setMyAnswers] = useState<Record<string, any>>({});
  const [fullAnswersMap, setFullAnswersMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  
  // States for Full Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [editDescription, setEditDescription] = useState('');
  const [editFileUrl, setEditFileUrl] = useState('');
  const [editQuestions, setEditQuestions] = useState<any[]>([]);
  const [editSectionIds, setEditSectionIds] = useState<string[]>([]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<string | null>(null);
  const [isDeletingSubmission, setIsDeletingSubmission] = useState(false);
  const [activeTab, setActiveTab] = useState<'submissions' | 'preview'>('submissions');
  
  const [content, setContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{type: 'success'|'error', message: string} | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>('الكل');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  const showNotification = (t: 'success'|'error', m: string) => { setNotification({ type: t, message: m }); setTimeout(() => setNotification(null), 5000); };
  
  const getSectionName = (st: any) => {
    if (!st || (!st.sections && !st.section)) return 'بدون فصل';
    const sec = Array.isArray(st.sections || st.section) ? (st.sections || st.section)[0] : (st.sections || st.section);
    if (!sec) return 'بدون فصل';
    const cls = Array.isArray(sec.classes || sec.class) ? (sec.classes || sec.class)[0] : (sec.classes || sec.class);
    return (cls?.name && sec.name) ? `${cls.name} - ${sec.name}` : sec.name || 'بدون فصل';
  };

  const uniqueSections = Array.from(new Set(submissions.map(sub => getSectionName(sub.student)))).filter(Boolean);
  const filteredSubmissions = selectedSection === 'الكل' ? submissions : submissions.filter(sub => getSectionName(sub.student) === selectedSection);

  const exportToExcel = () => {
    const maxScore = questions.reduce((a, q) => a + (Number(q.points) || 0), 0) || 100;
    const csvData = filteredSubmissions.map(sub => ({
       'اسم الطالب': sub.student?.user?.full_name || (sub.student as any)?.users?.full_name || 'طالب مجهول',
       'الفصل': getSectionName(sub.student), 
       'الدرجة': (sub.status === 'graded' || String(sub.status) === 'completed') ? (sub.grade || 0) : 'قيد المراجعة',
       'العلامة الكاملة': maxScore,
       'الحالة': (sub.status === 'graded' || String(sub.status) === 'completed') ? 'مقيّم' : 'يحتاج تصحيح',
       'تاريخ التسليم': new Date(sub.submitted_at || (sub as any).created_at).toLocaleString('ar-EG')
    }));
    const worksheet = XLSX.utils.json_to_sheet(csvData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "التسليمات");
    XLSX.writeFile(workbook, `تسليمات_${assignment?.title}_${selectedSection}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { showNotification('error', 'يرجى السماح بالنوافذ المنبثقة.'); return; }
    const maxScore = questions.reduce((a, q) => a + (Number(q.points) || 0), 0) || 100;
    const gradedSubs = filteredSubmissions.filter(s => s.status === 'graded' || String(s.status) === 'completed');
    const avgScore = gradedSubs.length > 0 ? Math.round(gradedSubs.reduce((sum, s) => sum + (Number(s.grade) || 0), 0) / gradedSubs.length) : 0;
    const rows = filteredSubmissions.map((sub, i) => {
       const isG = sub.status === 'graded' || String(sub.status) === 'completed';
       return `<tr><td>${i+1}</td><td><strong>${sub.student?.user?.full_name || (sub.student as any)?.users?.full_name || 'طالب مجهول'}</strong></td><td>${getSectionName(sub.student)}</td><td style="text-align:center;font-weight:bold;color:${isG ? '#4f46e5' : '#94a3b8'}">${isG ? sub.grade : 'قيد المراجعة'} ${isG ? `/ ${maxScore}` : ''}</td><td style="text-align:center;">${new Date(sub.submitted_at || (sub as any).created_at).toLocaleString('ar-EG')}</td></tr>`;
    }).join('');
    const html = `<html dir="rtl"><head><title>كشف ${assignment?.title}</title><style>body{font-family:sans-serif;padding:40px}.header{text-align:center;margin-bottom:30px;border-bottom:2px solid #e2e8f0;padding-bottom:20px}.header h1{color:#4f46e5;font-size:28px}.info-grid{display:flex;justify-content:space-between;background:#f8fafc;padding:20px;border-radius:12px;margin-bottom:30px;border:1px solid #e2e8f0}table{width:100%;border-collapse:collapse}th{background:#4f46e5;color:#fff;padding:15px;text-align:right}td{padding:15px;border:1px solid #e2e8f0}@media print{body{padding:0}table,th,td{border:1px solid #000}th{background:#f1f5f9!important;color:#000!important}}</style></head><body><div class="header"><h1>📄 كشف تسليمات الواجب</h1><h2>${assignment?.title}</h2></div><div class="info-grid"><div>إجمالي المسلمين: ${filteredSubmissions.length}</div><div>تم التقييم: ${gradedSubs.length}</div><div>متوسط الدرجات: ${avgScore} / ${maxScore}</div></div><table><thead><tr><th>#</th><th>اسم الطالب</th><th>الفصل</th><th>الدرجة</th><th>التاريخ</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>setTimeout(()=>window.print(),800)</script></body></html>`;
    printWindow.document.write(html); printWindow.document.close();
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    const cacheKey = `assign_cache_${assignmentId}_${user.id}_${currentRole}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        setAssignment(parsed.assignment); 
        if (parsed.questions) setQuestions(parsed.questions);
        if (currentRole === 'student' && parsed.submission) {
           setMySubmission(parsed.submission); setContent(parsed.submission.content || ''); setFileUrl(parsed.submission.file_url || '');
           if (parsed.answers) {
             const ansMap: any = {}, fMap: any = {};
             parsed.answers.forEach((a: any) => { ansMap[a.question_id] = a.selected_options || a.answer_text; fMap[a.question_id] = a; });
             setMyAnswers(ansMap); setFullAnswersMap(fMap);
           }
        } else if (['teacher', 'admin', 'management'].includes(currentRole || '')) setSubmissions(parsed.allSubmissions || []);
        setLoading(false); 
      } catch (e) {}
    } else setLoading(true);

    try {
      const details = await fetchAssignmentDetails(assignmentId);
      sessionStorage.setItem(cacheKey, JSON.stringify(details));
      setAssignment(details.assignment); 
      if (details.questions) setQuestions(details.questions);
      if (currentRole === 'student') {
        if (details.submission) {
          setMySubmission(details.submission as any); setContent((details.submission as any).content || ''); setFileUrl((details.submission as any).file_url || '');
          if (details.answers) {
            const ansMap: any = {}, fMap: any = {};
            details.answers.forEach((a: any) => { ansMap[a.question_id] = a.selected_options || a.answer_text; fMap[a.question_id] = a; });
            setMyAnswers(ansMap); setFullAnswersMap(fMap);
          }
        } else {
          const draft = localStorage.getItem(`draft_assign_${assignmentId}_${user.id}`);
          if (draft) { try { const p = JSON.parse(draft); if (p.answers) setMyAnswers(p.answers); if (p.content) setContent(p.content); if (p.fileUrl) setFileUrl(p.fileUrl); } catch(e){} }
        }
      } else if (['teacher', 'admin', 'management'].includes(currentRole || '')) setSubmissions(details.allSubmissions);
    } catch (e) {} finally { setLoading(false); }
  }, [assignmentId, user, currentRole, fetchAssignmentDetails]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (currentRole === 'student' && !mySubmission && assignmentId && user?.id && (Object.keys(myAnswers).length > 0 || content || fileUrl)) {
      localStorage.setItem(`draft_assign_${assignmentId}_${user.id}`, JSON.stringify({ answers: myAnswers, content, fileUrl }));
    }
  }, [myAnswers, content, fileUrl, currentRole, mySubmission, assignmentId, user?.id]);

  const handleSubmitAnswers = async (ans: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const payload: RawAssignmentAnswer[] = Object.entries(ans).map(([qId, value]) => {
        const isM = ['multiple_choice','checkbox','true_false'].includes(questions.find(q => q.id === qId)?.type || '');
        return { question_id: qId, answer_text: isM ? null : (typeof value === 'object' ? JSON.stringify(value) : (value || '')), selected_options: isM ? (Array.isArray(value) ? value : (value ? [value] : [])) : null };
      });
      await submitAssignment(assignmentId, payload, mySubmission?.id, content, fileUrl);
      localStorage.removeItem(`draft_assign_${assignmentId}_${user?.id}`);
      sessionStorage.removeItem(`assign_cache_${assignmentId}_${user?.id}_${currentRole}`);
      showNotification('success', 'تم التسليم بنجاح!');
      await fetchData();
    } catch (e: any) { showNotification('error', e.message); } finally { setIsSubmitting(false); }
  };

  // 🚀 دالة فتح نافذة التعديل الشامل ونسخ البيانات الحالية إليها
  const openFullEditModal = () => {
    setEditData({ title: assignment.title, due_date: assignment.due_date, teacher_id: assignment.teacher_id, subject_id: assignment.subject_id });
    setEditDescription(assignment.description || '');
    setEditFileUrl(assignment.file_url || '');
    setEditQuestions([...questions]);
    const currentSectionIds = assignment.assignment_sections?.map((as: any) => as.section_id || as.sections?.id) || [];
    setEditSectionIds(currentSectionIds);
    setIsEditModalOpen(true);
  };

  // 🚀 دالة الحفظ الشامل (تستدعي updateFullAssignment من الهوك)
  const handleSaveFullEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingEdit(true);
    try {
      const payload: any = { 
        title: editData.title!, 
        due_date: new Date(editData.due_date!).toISOString(),
        description: editDescription,
        file_url: editFileUrl,
        subject_id: editData.subject_id
      };
      if (currentRole === 'admin' || currentRole === 'management') {
         payload.teacher_id = editData.teacher_id;
      }
      await updateFullAssignment(assignmentId, payload, editQuestions, editSectionIds, subjects);
      sessionStorage.removeItem(`assign_cache_${assignmentId}_${user?.id}_${currentRole}`);
      showNotification('success', 'تم تعديل الواجب بالكامل بنجاح');
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
    } catch (e: any) { showNotification('error', e.message); }
  };

  const handleDeleteSubmissionAction = async () => {
    if (!submissionToDelete) return; setIsDeletingSubmission(true);
    try {
      await deleteSubmission(submissionToDelete);
      sessionStorage.removeItem(`assign_cache_${assignmentId}_${user?.id}_${currentRole}`);
      showNotification('success', 'تم حذف التسليم'); setSubmissionToDelete(null); await fetchData();
    } catch (e: any) { showNotification('error', e.message); } finally { setIsDeletingSubmission(false); }
  };

  if (!mounted || loading || authLoading) return <div className="flex h-screen items-center justify-center bg-[#090b14]"><Loader2 className="w-14 h-14 text-indigo-500 animate-spin drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" /></div>;
  if (!assignment) return <div className="min-h-screen bg-[#090b14] flex flex-col items-center justify-center text-slate-200"><AlertCircle className="w-16 h-16 text-rose-500 mb-4" /><h3 className="text-3xl font-black">الواجب غير موجود</h3></div>;

  const isOverdue = new Date(assignment.due_date) < new Date();
  const fSec = (assignment as any).assignment_sections?.[0]?.sections || (assignment as any).assignment_sections?.[0]?.section;
  const fullSecName = (Array.isArray(fSec?.classes || fSec?.class) ? (fSec?.classes || fSec?.class)[0]?.name : (fSec?.classes || fSec?.class)?.name) ? `${(Array.isArray(fSec?.classes || fSec?.class) ? (fSec?.classes || fSec?.class)[0]?.name : (fSec?.classes || fSec?.class)?.name)} - ${fSec?.name || ''}` : fSec?.name || '';
  const canEdit = currentRole === 'admin' || currentRole === 'management' || (assignment as any)?.teacher_id === user?.id;

  return (
    <div className="min-h-screen bg-[#090b14] text-slate-200 font-cairo pb-24 relative overflow-x-hidden" dir="rtl">
      <div className="fixed top-1/4 left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none z-0" />

      <div className="space-y-8 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-8">
        <AnimatePresence>
          {notification && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-[100] px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 backdrop-blur-md border ${notification.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50'}`}>
              <div className="h-10 w-10 rounded-2xl bg-[#090b14]/50 flex items-center justify-center border border-white/5">{notification.type === 'success' ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}</div>
              <div className="font-black text-lg text-white">{notification.message}</div>
              <button onClick={() => setNotification(null)} className="p-1 hover:bg-white/10 rounded-lg text-white"><X className="h-5 w-5" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link href="/assignments" className="h-12 w-12 flex items-center justify-center rounded-2xl bg-[#131836]/60 backdrop-blur-md border border-white/10 text-slate-400 hover:text-white transition-all"><ArrowRight className="h-6 w-6" /></Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl sm:text-4xl font-black text-white">{assignment.title}</h1>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-inner ${new Date(assignment.due_date) < new Date() ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>{new Date(assignment.due_date) < new Date() ? 'منتهي' : 'نشط'}</span>
              </div>
              <p className="text-slate-400 font-bold mt-2">{(assignment as any).subject_name || (assignment as any).subject?.name} - {fullSecName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); showNotification('success', 'تم النسخ'); }} className="h-12 px-4 rounded-2xl bg-[#090b14]/50 border border-white/10 text-slate-300 hover:text-indigo-400 transition-all flex items-center justify-center gap-2 font-black text-sm"><Share2 className="h-4 w-4" /> <span className="hidden sm:inline">مشاركة</span></button>
            {canEdit && (
              <>
                <button onClick={openFullEditModal} className="h-12 px-6 rounded-2xl bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-slate-900 border border-indigo-500/30 transition-all flex items-center justify-center gap-2 font-black"><Edit2 className="h-4 w-4" /> <span className="hidden sm:inline">تعديل شامل</span></button>
                <button onClick={() => setIsDeleteModalOpen(true)} className="h-12 w-12 flex items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/30 transition-all shrink-0"><Trash2 className="h-5 w-5" /></button>
              </>
            )}
          </div>
        </div>

        <div className="bg-[#131836]/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="p-8 relative z-10">
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-black border shadow-inner ${isOverdue ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'}`}><Clock className="h-5 w-5" /><span dir="ltr">آخر موعد: {format(dueDateObj, 'yyyy/MM/dd HH:mm')}</span></div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#090b14]/50 text-slate-300 border border-white/5 text-sm font-black shadow-inner"><User className="h-5 w-5 text-slate-400" /><span>أ. {(assignment as any).teacher_name || (assignment as any).teacher?.user?.full_name || (assignment as any).teacher?.users?.full_name}</span></div>
            </div>
            <div className="mb-8">
              <h3 className="text-xl font-black text-white mb-4">وصف الواجب</h3>
              {assignment.description ? <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: assignment.description }} /> : <p className="text-slate-500 font-bold bg-[#090b14]/30 p-4 rounded-xl border border-dashed border-white/10 text-center">لا يوجد وصف إضافي.</p>}
            </div>
            {assignment.file_url && (
              <div className="mt-8">
                <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2"><FileText className="h-5 w-5 text-indigo-400" /> المرفقات</h3>
                {assignment.file_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null || assignment.file_url.includes('cloudinary') ? (
                  <div className="relative w-full max-w-2xl min-h-[300px] bg-[#090b14]/50 rounded-[2rem] border border-white/5 overflow-hidden flex items-center justify-center p-2"><img src={assignment.file_url} className="max-h-[500px] object-contain rounded-xl" /></div>
                ) : (
                  <div className="p-6 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-4"><div className="flex items-center gap-4"><div className="h-14 w-14 rounded-2xl bg-[#090b14] flex items-center justify-center border border-white/5"><FileText className="h-7 w-7 text-indigo-400" /></div><div><h4 className="font-black text-white">ملف مرفق</h4></div></div><a href={assignment.file_url} target="_blank" className="px-8 py-3 rounded-2xl bg-indigo-600 text-sm font-black text-white hover:bg-indigo-500 flex items-center gap-2"><LinkIcon className="h-5 w-5" /> تحميل</a></div>
                )}
              </div>
            )}
          </div>
        </div>

        {currentRole === 'student' && (
          <div className="bg-[#131836]/60 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 overflow-hidden relative">
            <div className="p-8 border-b border-white/5 bg-[#090b14]/30"><h2 className="text-2xl font-black text-white flex items-center gap-3"><div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl">{mySubmission?.status === 'graded' ? <Trophy className="h-6 w-6" /> : <Upload className="h-6 w-6" />}</div>{mySubmission?.status === 'graded' ? 'النتيجة' : 'تسليم الإجابة'}</h2></div>
            <div className="p-6 sm:p-8">
              {mySubmission?.status === 'graded' && (
                <div className="mb-10 p-8 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex justify-between items-center"><div className="text-4xl font-black text-white">{mySubmission.grade} <span className="text-lg text-slate-500">/ 100</span></div></div>
              )}
              {mySubmission?.status === 'graded' && questions.length > 0 ? (
                <div className="space-y-6">
                  {questions.map((q: any, idx: number) => {
                    const stdAns = myAnswers[q.id]; const ansDet = fullAnswersMap[q.id];
                    const isC = ansDet?.is_correct || Number(ansDet?.points_earned) > 0;
                    return (
                      <div key={q.id} className={`bg-[#090b14]/50 rounded-3xl p-6 border ${isC ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
                        <div className="font-black text-white text-lg mb-4" dangerouslySetInnerHTML={renderMath(q.content)} />
                        <div className="text-slate-400 font-bold mb-2">إجابتك: {typeof stdAns === 'object' ? JSON.stringify(stdAns) : String(stdAns || 'فارغ')}</div>
                        {ansDet?.feedback && <div className="text-indigo-400 font-bold mt-2 border-t border-white/10 pt-2">{ansDet.feedback}</div>}
                      </div>
                    );
                  })}
                </div>
              ) : questions.length > 0 ? (
                <AssignmentForm questions={questions} onSubmit={handleSubmitAnswers} onChange={setMyAnswers} isSubmitting={isSubmitting} initialAnswers={myAnswers} readOnly={!!mySubmission}>
                  <div className="mt-8"><textarea rows={4} className="w-full bg-[#090b14] border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-indigo-500" placeholder="نص اختياري..." value={content} onChange={e=>setContent(e.target.value)} disabled={!!mySubmission}/></div>
                </AssignmentForm>
              ) : (
                <form onSubmit={e => { e.preventDefault(); handleSubmitAnswers({}); }}><textarea rows={4} className="w-full bg-[#090b14] border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-indigo-500 mb-4" placeholder="إجابتك..." value={content} onChange={e=>setContent(e.target.value)} disabled={!!mySubmission}/>{!mySubmission && <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl">{isSubmitting ? 'جاري...' : 'إرسال'}</button>}</form>
              )}
            </div>
          </div>
        )}
        
        {['teacher', 'admin', 'management'].includes(currentRole || '') && (
          <div className="space-y-8">
            <div className="flex gap-2"><button onClick={()=>setActiveTab('submissions')} className={`px-6 py-3 rounded-xl font-black ${activeTab === 'submissions' ? 'bg-indigo-600 text-white' : 'text-slate-400 bg-white/5'}`}>التسليمات</button><button onClick={()=>setActiveTab('preview')} className={`px-6 py-3 rounded-xl font-black ${activeTab === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-400 bg-white/5'}`}>معاينة</button></div>
            {activeTab === 'submissions' ? (
              <div className="bg-[#131836]/60 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 p-8"><div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black text-white">التسليمات ({filteredSubmissions.length})</h2></div><div className="space-y-4">{filteredSubmissions.map(sub => (<div key={sub.id} className="bg-[#090b14]/50 p-6 rounded-2xl flex justify-between items-center"><div className="font-black text-white text-lg">{(sub.student as any)?.users?.full_name || 'طالب'}</div><Link href={`/assignments/${assignmentId}/submissions/${sub.id}`} className="bg-indigo-600 px-6 py-2 rounded-xl text-white font-black">تصحيح</Link></div>))}</div></div>
            ) : (<div className="text-center p-12 bg-white/5 rounded-3xl font-bold text-slate-400">معاينة الطالب</div>)}
          </div>
        )}
      </div>

