// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { FileText, Clock, Link as LinkIcon, Users, User, CheckCircle2, AlertCircle, ArrowRight, Upload, Edit2, Trash2, Share2, Eye, X, Calendar, Download, FileSpreadsheet, Trophy, ImageIcon, MessageSquare, Award, MinusCircle, XCircle, Target, Send, Filter, Loader2, Layout, ShieldAlert, AlignLeft,UploadCloud, AlertTriangle } from 'lucide-react';
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
import imageCompression from 'browser-image-compression';

// 🚀 تنظيف رابط الـ PDF
const cleanPdfUrl = (url: string) => {
  if (!url) return '';
  return url.replace(/\/fl_attachment\//g, '/').replace(/fl_attachment,/g, '');
};

// 🚀 محرك تنسيق المعادلات (مُعدل للثيم المظلم Gemini Style)
const renderContentWithMath = (content: string) => {
   if (!content) return { __html: '' };
   let html = String(content)
     .replace(/\\\\n/g, '<br/>')
     .replace(/\\n/g, '<br/>')
     .replace(/\\r\\n/g, '<br/>')
     .replace(/\n/g, '<br/>')
     .replace(/\\\$/g, '$');
   
   html = html.replace(/\$\$?([\s\S]*?)\$\$?/g, (match, mathContent) => {
       return `<span class="math-tex text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1 rounded-md font-mono font-black mx-1 inline-block max-w-full break-words whitespace-pre-wrap shadow-inner" dir="ltr" style="word-break: break-word; overflow-wrap: anywhere;">\\(${mathContent}\\)</span>`;
   });

   html = html.replace(/<table/g, '<div class="table-responsive-wrapper"><table class="w-full text-right border-collapse my-4 min-w-[600px] border border-white/10 rounded-xl overflow-hidden shadow-inner bg-[#02040a]/40 backdrop-blur-sm"');
   html = html.replace(/<\/table>/g, '</table></div>');
   html = html.replace(/<th/g, '<th class="bg-indigo-500/10 p-4 border border-white/10 font-black text-indigo-300 text-sm drop-shadow-sm"');
   html = html.replace(/<td/g, '<td class="p-4 border border-white/10 bg-transparent text-slate-300 font-bold"');
   return { __html: html };
};

// =========================================================================
// المكون الداخلي: تسليم المشاريع العلمية (Holographic Design)
// =========================================================================
interface ProjectSubmissionProps {
  initialData?: { text: string; images: string[] };
  onChange: (data: { text: string; images: string[] }) => void;
  readOnly?: boolean;
}

function ProjectSubmissionComponent({ initialData, onChange, readOnly }: ProjectSubmissionProps) {
  const [text, setText] = useState(initialData?.text || '');
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [isUploading, setIsUploading] = useState(false);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onChange({ text: e.target.value, images });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (images.length + files.length > 8) {
      alert('عذراً، الحد الأقصى المسموح به هو 8 صور للمشروع الواحد.');
      return;
    }
    setIsUploading(true);
    const uploadedUrls: string[] = [];
    try {
      for (const file of files) {
        const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1280, useWebWorker: true };
        const compressedFile = await imageCompression(file, options);
        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'default_preset');
        const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST', body: formData,
        });
        const data = await res.json();
        if (data.secure_url) uploadedUrls.push(data.secure_url);
      }
      const newImages = [...images, ...uploadedUrls];
      setImages(newImages);
      onChange({ text, images: newImages });
    } catch (error) {
      alert('حدث خطأ أثناء ضغط أو رفع الصور. تأكد من اتصالك بالإنترنت.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    if (readOnly) return;
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    onChange({ text, images: newImages });
  };

  return (
    <div className="bg-[#02040a]/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 shadow-inner mt-5 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[40px] rounded-full pointer-events-none mix-blend-screen"></div>
      <div className="space-y-6 relative z-10">
        <div>
          <label className="text-sm font-black text-indigo-300 mb-3 flex items-center gap-2 drop-shadow-sm">
            <FileText className="w-5 h-5 text-indigo-400" /> وصف المشروع (اختياري)
          </label>
          <textarea
            disabled={readOnly} rows={4} value={text} onChange={handleTextChange} placeholder="اكتب تفاصيل بحثك هنا..."
            className="w-full bg-white/5 border border-white/10 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30 rounded-2xl p-4 text-white font-bold outline-none resize-none shadow-inner transition-all disabled:opacity-50 placeholder:text-slate-500 custom-scrollbar"
          />
        </div>
        <div>
          <label className="text-sm font-black text-indigo-300 mb-3 flex items-center gap-2 drop-shadow-sm">
            <ImageIcon className="w-5 h-5 text-indigo-400" /> مرفقات المشروع المرئية (حد أقصى 8 صور)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {images.map((img, idx) => (
              <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-inner group/img bg-[#0f1423]">
                <img src={img} alt={`مرفق ${idx + 1}`} className="w-full h-full object-cover mix-blend-luminosity hover:mix-blend-normal transition-all duration-500" />
                {!readOnly && (
                  <button type="button" onClick={() => removeImage(idx)} className="absolute top-2 right-2 p-1.5 bg-rose-500/80 backdrop-blur-md text-white rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-rose-600 shadow-md border border-rose-400/50 active:scale-90">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {!readOnly && images.length < 8 && (
              <label className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all shadow-inner ${isUploading ? "border-indigo-500/50 bg-indigo-500/10" : "border-white/10 bg-white/5 hover:border-indigo-400/50 hover:bg-white/10"}`}>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                {isUploading ? <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /> : <><UploadCloud className="w-8 h-8 text-slate-400 mb-2 drop-shadow-sm" /><span className="text-xs font-bold text-slate-400 text-center px-2">إضافة صور<br/>({8 - images.length} متبقية)</span></>}
              </label>
            )}
          </div>
          <p className="text-[10px] sm:text-xs font-black text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 inline-flex items-center gap-2 w-full shadow-inner backdrop-blur-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> النظام يدعم ضغط الصور تلقائياً للحفاظ على الباقة والتخزين السحابي.
          </p>
        </div>
      </div>
    </div>
  );
}

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
  
  const [assignment, setAssignment] = useState<AssignmentWithMeta | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionWithStudent[]>([]);
  const [mySubmission, setMySubmission] = useState<SubmissionWithStudent | null>(null);
  const [myAnswers, setMyAnswers] = useState<Record<string, string | string[] | null>>({});
  const [fullAnswersMap, setFullAnswersMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

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
    if (typeof window !== 'undefined' && !document.getElementById('katex-js-main')) {
      const link = document.createElement('link');
      link.id = 'katex-css-main'; link.rel = 'stylesheet'; link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.id = 'katex-js-main'; script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js';
      script.onload = () => {
        const autoRender = document.createElement('script');
        autoRender.id = 'katex-auto-render-main'; autoRender.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js';
        document.head.appendChild(autoRender);
      };
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && (window as any).renderMathInElement) {
        (window as any).renderMathInElement(document.body, {
          delimiters: [ { left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }, { left: '\\(', right: '\\)', display: false }, { left: '\\[', right: '\\]', display: true } ],
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
      ? (assignment as any).teacher_id?.id || (assignment as any).teacher_id?.auth_id : assignment.teacher_id;
    setEditData({ ...assignment, due_date: new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().slice(0, 16), teacher_id: originalTeacherId });
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
      const payload: any = { title: editData.title, description: editDescription, due_date: new Date(editData.due_date).toISOString(), file_url: editFileUrl };
      if (updateFullAssignment) await updateFullAssignment(assignmentId, payload, editQuestions, editSectionIds, subjects);
      else await saveAssignment(payload, assignmentId, editQuestions, editSectionIds, subjects);
      sessionStorage.removeItem(`assign_cache_${assignmentId}_${user?.id}_${currentRole}`);
      showNotification('success', 'تم حفظ التعديلات بنجاح');
      setIsFullEditModalOpen(false);
      await fetchData();
    } catch (error: any) { showNotification('error', error.message || 'خطأ أثناء الحفظ'); } finally { setIsSubmittingEdit(false); }
  };

  const handleDeleteAssignmentAction = async () => {
    setIsDeletingSubmission(true); 
    try {
      showNotification('success', 'جاري فحص المرفقات ومسحها من السحابة...');
      
      const urlsToDelete: string[] = [];

      if (assignment?.file_url) {
        urlsToDelete.push(assignment.file_url);
      }

      questions.forEach((q: any) => {
        if (q.media_url) {
          urlsToDelete.push(q.media_url);
        }
      });

      submissions.forEach((sub: any) => {
        if (sub.file_url) {
          urlsToDelete.push(sub.file_url);
        }
        if (sub.content && sub.content.includes('cloudinary')) {
          try {
             const parsedAns = JSON.parse(sub.content);
             if (parsedAns.images && Array.isArray(parsedAns.images)) {
                urlsToDelete.push(...parsedAns.images);
             }
          } catch(e) {}
        }
      });

      if (urlsToDelete.length > 0) {
        const validCloudinaryUrls = urlsToDelete.filter(url => url.includes('cloudinary.com'));
        await Promise.all(validCloudinaryUrls.map(url => deleteFromCloudinary(url)));
      }

      await deleteAssignment(assignmentId);
      
      sessionStorage.removeItem(`assign_cache_${assignmentId}_${user?.id}_${currentRole}`);
      router.push('/assignments');
      
    } catch (error: any) { 
      showNotification('error', 'خطأ أثناء عملية الحذف الشامل: ' + error.message); 
    } finally {
      setIsDeletingSubmission(false);
    }
  };

  const handleDeleteSubmissionAction = async () => {
    if (!submissionToDelete) return;
    setIsDeletingSubmission(true);
    try {
      const subToDel = submissions.find(s => s.id === submissionToDelete);
      
      if (subToDel) {
        const urlsToDelete: string[] = [];
        
        if (subToDel.file_url && subToDel.file_url.includes('cloudinary.com')) {
          urlsToDelete.push(subToDel.file_url);
        }

        if (subToDel.content && subToDel.content.includes('cloudinary')) {
          try {
             const parsedAns = JSON.parse((subToDel as any).content);
             if (parsedAns.images && Array.isArray(parsedAns.images)) {
                urlsToDelete.push(...parsedAns.images.filter((url:string) => url.includes('cloudinary.com')));
             }
          } catch(e) {}
        }

        if (urlsToDelete.length > 0) {
           await Promise.all(urlsToDelete.map(url => deleteFromCloudinary(url)));
        }
      }

      await deleteSubmission(submissionToDelete);
      
      sessionStorage.removeItem(`assign_cache_${assignmentId}_${user?.id}_${currentRole}`);
      showNotification('success', 'تم إلغاء تسليم الطالب ومسح مرفقاته بنجاح');
      setSubmissionToDelete(null);
      await fetchData();
    } catch (error: any) { 
      showNotification('error', 'خطأ في الحذف: ' + error.message); 
    } finally { 
      setIsDeletingSubmission(false); 
    }
  };

  const copyAssignmentLink = () => { navigator.clipboard.writeText(window.location.href); showNotification('success', 'تم نسخ رابط الواجب'); };

  if (!mounted || authLoading) return (<div className="flex h-[100dvh] items-center justify-center bg-transparent font-sans text-slate-100"><div className="flex flex-col items-center gap-4"><Loader2 className="w-14 h-14 text-indigo-500 animate-spin drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" /><p className="text-indigo-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري التحقق من الهوية...</p></div></div>);
  if (loading && !assignment) return (<div className="flex h-[100dvh] items-center justify-center bg-transparent font-sans text-slate-100"><div className="flex flex-col items-center gap-4"><Loader2 className="w-14 h-14 text-indigo-500 animate-spin drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" /><p className="text-indigo-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري سحب بيانات الواجب...</p></div></div>);
  if (!assignment && !loading) return (<div className="min-h-[100dvh] bg-transparent flex flex-col items-center justify-center text-slate-100 font-sans px-4"><div className="glass-panel p-10 rounded-[3rem] border border-rose-500/30 text-center shadow-[0_0_50px_rgba(225,29,72,0.15)] max-w-md w-full relative overflow-hidden"><div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-[40px] rounded-full pointer-events-none mix-blend-screen"></div><AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4 drop-shadow-md relative z-10" /><h3 className="text-3xl font-black text-white mb-2 tracking-tight relative z-10">الواجب غير موجود</h3><p className="text-slate-400 font-bold relative z-10">ربما تم حذفه أو أن الرابط غير صحيح.</p><Link href="/assignments" className="mt-8 inline-flex px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black transition-all border border-white/10 shadow-inner relative z-10">العودة للواجبات</Link></div></div>);

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
    const safeOptions = q.options && Array.isArray(q.options) && q.options.length > 0 ? q.options : (q.type === 'true_false' ? [{id: 'صح', content: 'صح'}, {id: 'خطأ', content: 'خطأ'}] : []);
    return { ...q, options: safeOptions, content: String(textContent).replace(/\\n/g, '\n') };
  });

  return (
    <div className="min-h-[100dvh] bg-transparent text-slate-200 font-sans pb-24 relative overflow-x-hidden pt-6" dir="rtl">
      
      {/* 🌌 الإضاءة المحيطية الكونية (Gemini Space) */}
      <div className="fixed top-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen z-0 animate-[pulse_10s_ease-in-out_infinite]"></div>
      <div className="fixed bottom-[-10%] left-[-5%] w-[30vw] h-[30vw] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen z-0 animate-[pulse_8s_ease-in-out_infinite_alternate]"></div>

      {/* Tiptap overrides for dark theme */}
      <style dangerouslySetInnerHTML={{ __html: `
        .katex-container { direction: ltr !important; unicode-bidi: embed !important; display: inline-block; max-width: 100%; overflow-wrap: break-word; }
        .katex { direction: ltr !important; text-align: left !important; color: #818cf8 !important; }
        .katex-display { display: flex !important; justify-content: center !important; margin: 0.5rem 0 !important; width: 100% !important; overflow-x: auto; direction: ltr !important; }
        .tiptap-content table { border-collapse: collapse !important; width: 100% !important; margin: 15px 0 !important; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.3); background: rgba(2,4,10,0.4); }
        .tiptap-content td, .tiptap-content th { border: 1px solid rgba(255,255,255,0.1) !important; padding: 12px !important; text-align: center !important; vertical-align: middle !important; min-width: 2em; color: #cbd5e1; }
        .tiptap-content th { background-color: rgba(255,255,255,0.05) !important; font-weight: 900 !important; color: #fff; }
        .tiptap-content img { max-width: 100% !important; height: auto !important; border-radius: 12px !important; margin: 10px auto !important; display: block !important; box-shadow: 0 4px 10px rgba(0,0,0,0.5) !important; mix-blend-mode: luminosity; border: 1px solid rgba(255,255,255,0.1); }
        .tiptap-content p { margin-bottom: 0.5em !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.5); }
      `}} />

      <div className="space-y-8 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-8">
        
        {/* 🚀 إشعارات جيمناي (Holographic Toasts) */}
        <AnimatePresence>
          {notification && (
            <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-[100] px-8 py-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex items-center gap-4 transition-all backdrop-blur-3xl border w-[90%] sm:w-auto ${notification.type === 'success' ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-100' : 'bg-rose-950/80 border-rose-500/50 text-rose-100'}`}>
              <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${notification.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-rose-500/20 border border-rose-500/30'}`}>{notification.type === 'success' ? <CheckCircle2 className="h-6 w-6 text-emerald-400 drop-shadow-md" /> : <AlertCircle className="h-6 w-6 text-rose-400 drop-shadow-md" />}</div>
              <div className="font-black tracking-tight text-lg drop-shadow-md">{notification.message}</div>
              <button onClick={() => setNotification(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors mr-4 text-slate-400 shrink-0"><X className="h-5 w-5" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🚀 Header Hero (Glass) */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 glass-panel p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-indigo-500/20 shadow-[0_0_40px_rgba(99,102,241,0.1)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none mix-blend-screen transition-transform duration-1000 group-hover:scale-125"></div>
          
          <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
            <Link href="/assignments" className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white/5 shadow-inner border border-white/10 text-slate-400 hover:text-indigo-400 hover:bg-white/10 transition-all hover:border-indigo-500/30 shrink-0 active:scale-90"><ArrowRight className="h-6 w-6 drop-shadow-sm" /></Link>
            <div className="min-w-0 pr-1">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight drop-shadow-md truncate">{assignment?.title}</h1>
                {isOverdue ? <span className="px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-full text-[10px] font-black uppercase tracking-wider shadow-inner backdrop-blur-sm shrink-0">منتهي</span> : <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-wider shadow-inner backdrop-blur-sm shrink-0">نشط</span>}
              </div>
              <p className="text-slate-400 font-bold mt-2 text-xs sm:text-sm drop-shadow-sm">{(assignment as any)?.subject_name || (assignment as any)?.subject?.name} - {fullSectionName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto relative z-10 shrink-0">
            <button onClick={copyAssignmentLink} className="h-12 flex-1 md:flex-none px-4 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:text-indigo-300 hover:bg-white/10 hover:border-indigo-500/30 transition-all flex items-center justify-center gap-2 shadow-inner font-black text-sm active:scale-95"><Share2 className="h-4 w-4 drop-shadow-sm" /> <span className="hidden sm:inline">مشاركة</span></button>
            {canEdit && (
              <>
                <button onClick={() => setIsEditModalOpen(true)} className="h-12 flex-1 md:flex-none px-6 rounded-2xl bg-indigo-600/90 backdrop-blur-md text-white hover:bg-indigo-500 border border-indigo-400/50 transition-all flex items-center justify-center gap-2 font-black shadow-[0_0_20px_rgba(99,102,241,0.4)] active:scale-95"><Edit2 className="h-4 w-4 drop-shadow-sm" /> <span className="hidden sm:inline">تعديل سريع</span></button>
                <button onClick={() => setIsDeleteModalOpen(true)} className="h-12 w-12 flex items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition-all shadow-inner shrink-0 active:scale-90 hover:text-rose-300"><Trash2 className="h-5 w-5 drop-shadow-sm" /></button>
              </>
            )}
          </div>
        </div>

        {/* 🚀 Assignment Info Panel */}
        <div className="glass-panel rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none mix-blend-screen group-hover:bg-blue-500/10 transition-colors duration-1000"></div>
          
          <div className="p-6 sm:p-8 relative z-10">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-8">
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black border shadow-inner backdrop-blur-sm ${isOverdue ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'}`}>
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 drop-shadow-sm" /> <span dir="ltr">آخر موعد: {format(dueDateObj, 'yyyy/MM/dd HH:mm')}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl sm:rounded-2xl bg-white/5 text-slate-300 border border-white/10 text-[10px] sm:text-xs font-black shadow-inner backdrop-blur-sm">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 drop-shadow-sm" /> <span>أ. {(assignment as any)?.teacher_name || (assignment as any)?.teacher?.user?.full_name || (assignment as any)?.teacher?.users?.full_name}</span>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-lg sm:text-xl font-black text-white mb-4 drop-shadow-md">وصف الواجب</h3>
              {assignment?.description ? <div className="prose prose-slate max-w-none text-slate-300 leading-relaxed text-sm sm:text-base font-bold tiptap-content drop-shadow-sm" dangerouslySetInnerHTML={renderContentWithMath(assignment.description)} /> : <p className="text-slate-500 font-bold bg-[#02040a]/40 p-4 rounded-xl border border-dashed border-white/10 text-center shadow-inner">لا يوجد وصف إضافي.</p>}
            </div>

            {assignment?.file_url && (
              <div className="mt-8 pt-8 border-t border-white/5">
                <h3 className="text-lg sm:text-xl font-black text-white mb-4 flex items-center gap-2 drop-shadow-md"><FileText className="h-5 w-5 text-indigo-400" /> المرفقات</h3>
                {assignment.file_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null || (assignment.file_url.includes('cloudinary.com/image') && !assignment.file_url.includes('.pdf')) ? (
                  <div className="relative w-full max-w-2xl h-auto min-h-[300px] bg-[#02040a]/40 rounded-[1.5rem] sm:rounded-[2rem] border border-white/10 overflow-hidden shadow-inner flex items-center justify-center p-2"><img src={cleanPdfUrl(assignment.file_url)} alt="مرفق الواجب" className="max-h-[500px] w-auto object-contain rounded-xl mix-blend-luminosity hover:mix-blend-normal transition-all duration-500" /></div>
                ) : (
                  <div className="p-5 sm:p-6 rounded-[1.5rem] bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner backdrop-blur-sm">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-[1rem] bg-[#0f1423] flex items-center justify-center shadow-inner border border-white/5 shrink-0"><FileText className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-400 drop-shadow-sm" /></div>
                      <div className="min-w-0 pr-1"><h4 className="font-black text-white drop-shadow-md text-sm sm:text-base truncate">ملف مرفق (PDF)</h4><p className="text-[10px] sm:text-xs text-slate-400 font-bold mt-0.5">اختر العرض أو التحميل المباشر</p></div>
                    </div>
                    {/* 🚀 أزرار العارض الذكي والتحميل الآمن (Glass) */}
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0">
                        <a 
                          href={`https://docs.google.com/viewer?url=${encodeURIComponent(cleanPdfUrl(assignment.file_url))}&embedded=true`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex-1 sm:flex-none h-10 sm:h-12 px-5 sm:px-6 rounded-xl sm:rounded-2xl bg-white/5 text-indigo-300 font-black hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2 shadow-inner border border-white/10 active:scale-95 text-xs sm:text-sm"
                        >
                          <Eye className="h-4 w-4 sm:h-5 sm:w-5 drop-shadow-sm" /> عرض الملف
                        </a>
                        <a 
                          href={cleanPdfUrl(assignment.file_url)}
                          target="_blank" rel="noopener noreferrer" download
                          className="flex-1 sm:flex-none h-10 sm:h-12 px-5 sm:px-6 rounded-xl sm:rounded-2xl bg-indigo-600/90 backdrop-blur-md text-white font-black hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.4)] border border-indigo-400/50 active:scale-95 text-xs sm:text-sm"
                        >
                          <Download className="h-4 w-4 sm:h-5 sm:w-5 drop-shadow-sm" /> تحميل
                        </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 🚀 قسم الطالب والمراجعة التفصيلية (Holographic Edition) */}
        {currentRole === 'student' && (
          <div className="glass-panel rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-indigo-500 opacity-80"></div>
            
            <div className="p-6 sm:p-8 border-b border-white/5 bg-[#02040a]/60 backdrop-blur-md relative z-10">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3 drop-shadow-md">
                <div className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-inner border ${isGraded ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'}`}>
                  {isGraded ? <Trophy className="h-5 w-5 sm:h-6 sm:w-6 drop-shadow-sm" /> : <Upload className="h-5 w-5 sm:h-6 sm:w-6 drop-shadow-sm" />}
                </div>
                {isGraded ? 'نتيجة الواجب والتغذية الراجعة' : 'تسليم الإجابة'}
              </h2>
            </div>
            
            <div className="p-5 sm:p-8 relative z-10 bg-transparent">
              {isGraded && (
                <div className="mb-8 sm:mb-10 p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 shadow-inner relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full pointer-events-none mix-blend-screen group-hover:scale-150 transition-transform duration-700"></div>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 sm:gap-6 relative z-10">
                     <div className="w-full sm:w-auto">
                       <h3 className="text-lg sm:text-2xl font-black text-emerald-400 flex items-center gap-2 mb-2 drop-shadow-md"><CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 drop-shadow-sm" /> تم التقييم بنجاح!</h3>
                       <p className="text-slate-300 font-bold text-xs sm:text-sm leading-relaxed drop-shadow-sm opacity-90">لقد قام معلمك بمراجعة الواجب. يمكنك الاطلاع على ملاحظاته التفصيلية بالأسفل.</p>
                     </div>
                     <div className="shrink-0 flex flex-col items-center bg-[#0f1423]/80 backdrop-blur-sm px-6 sm:px-8 py-4 sm:py-5 rounded-xl sm:rounded-2xl shadow-inner border border-white/5 w-full sm:w-auto">
                       <span className="text-[9px] sm:text-[10px] font-black text-emerald-500/80 uppercase tracking-widest mb-1">الدرجة النهائية</span>
                       <div className="text-3xl sm:text-4xl font-black text-white drop-shadow-lg">{mySubmission?.grade} <span className="text-sm sm:text-lg text-slate-500">/ {questions.reduce((acc: number, q: any) => acc + (Number(q.points)||0), 0) || 100}</span></div>
                     </div>
                  </div>
                  
                  {mySubmission?.feedback && (
                    <div className="mt-5 sm:mt-6 p-4 sm:p-5 bg-[#02040a]/60 backdrop-blur-md rounded-xl sm:rounded-2xl border border-emerald-500/30 shadow-inner">
                      <p className="text-[10px] sm:text-xs font-black text-emerald-400 mb-2 flex items-center gap-1.5 drop-shadow-sm"><MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> ملاحظة المعلم العامة:</p>
                      <p className="text-slate-200 leading-relaxed font-bold text-sm sm:text-base drop-shadow-sm">{mySubmission.feedback}</p>
                    </div>
                  )}
                </div>
              )}

              {isGraded && questions.length > 0 ? (
                <div className="space-y-6 sm:space-y-8">
                  <h3 className="text-lg sm:text-xl font-black text-white mb-5 sm:mb-6 flex items-center gap-2 px-2 drop-shadow-md border-r-4 border-indigo-500 pr-3"><Target className="h-5 w-5 sm:h-6 w-6 text-indigo-400 drop-shadow-sm" /> المراجعة التفصيلية لأسئلة الواجب</h3>
                  
                  <div className="flex flex-col gap-6 sm:gap-8">
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
                          <div key={q.id} className="mt-6 mb-2 sm:mt-8 sm:mb-4">
                            <div className="bg-indigo-500/10 backdrop-blur-md rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 border border-indigo-500/20 shadow-inner relative overflow-hidden group">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[60px] rounded-full pointer-events-none mix-blend-screen group-hover:scale-150 transition-transform duration-700"></div>
                              <div className="flex items-center gap-3 mb-4 relative z-10">
                                <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/40 shadow-inner">
                                  <AlignLeft className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-300 drop-shadow-sm" />
                                </div>
                                <h4 className="text-xs sm:text-sm font-black text-indigo-400 uppercase tracking-widest drop-shadow-sm">سياق السؤال / اقرأ بتمعن</h4>
                              </div>
                              <div 
                                className="prose max-w-none text-lg sm:text-xl lg:text-2xl font-black text-white leading-relaxed relative z-10 tiptap-content drop-shadow-md" 
                                dangerouslySetInnerHTML={renderContentWithMath(q.content || (q as any).text || '')} 
                              />
                              {q.media_url && (
                                <div className="mt-5 sm:mt-6 rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-[#02040a]/60 p-2 text-center relative z-10">
                                  <img src={cleanPdfUrl(q.media_url)} className="w-auto max-h-64 sm:max-h-80 mx-auto rounded-lg sm:rounded-xl object-contain inline-block mix-blend-luminosity hover:mix-blend-normal transition-all duration-500" alt="مرفق تمهيدي" />
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
                        <div key={q.id} className={`glass-panel rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden shadow-lg transition-all hover:shadow-[0_0_30px_rgba(0,0,0,0.4)] ${isUnanswered ? 'border-slate-500/30 bg-[#0f1423]/40 grayscale' : isCorrect ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
                          <div className="p-5 sm:p-6 lg:p-8 bg-[#02040a]/40 border-b border-white/5 flex flex-col sm:flex-row sm:items-start justify-between gap-5 sm:gap-6 backdrop-blur-md">
                            <div className="flex gap-3 sm:gap-4 items-start w-full min-w-0">
                              <div className={`shrink-0 w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-[1rem] sm:rounded-[1.25rem] flex items-center justify-center font-black text-lg sm:text-xl lg:text-2xl shadow-inner border ${isUnanswered ? 'bg-[#02040a] text-slate-500 border-white/5' : isCorrect ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                                  {idx + 1}
                              </div>
                              <div className="pt-1 w-full min-w-0">
                                <div 
                                  className="prose max-w-none font-black text-base sm:text-lg lg:text-xl text-white leading-relaxed overflow-hidden tiptap-content drop-shadow-md" 
                                  dangerouslySetInnerHTML={renderContentWithMath((q as any).text || q.content || '')} 
                                />
                                {q.media_url && (
                                  <div className="mt-3 sm:mt-4 rounded-xl overflow-hidden border border-white/10 shadow-inner bg-[#0f1423] p-1.5 sm:p-2 inline-block">
                                    <img src={cleanPdfUrl(q.media_url)} className="max-h-40 sm:max-h-48 w-auto rounded-lg object-contain mix-blend-luminosity hover:mix-blend-normal transition-all duration-300" alt="مرفق توضيحي" />
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 bg-[#0f1423]/80 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm border border-white/5 shrink-0 self-start sm:self-auto shadow-inner backdrop-blur-sm">
                              <Award className={`w-4 h-4 sm:w-5 sm:h-5 drop-shadow-sm ${isCorrect ? 'text-emerald-400' : 'text-slate-500'}`} />
                              <span className={isCorrect ? 'text-emerald-300 text-base sm:text-lg drop-shadow-sm' : 'text-slate-400 text-base sm:text-lg'}>{answerDetails?.points_earned || 0}</span>
                              <span className="text-slate-600">/</span>
                              <span className="text-slate-500">{Number(q.points) || 0} نقطة</span>
                            </div>
                          </div>

                          <div className="p-5 sm:p-6 lg:p-8 bg-transparent">
                            {isComparison ? (
                              <div className={`rounded-[1.25rem] sm:rounded-[1.5rem] border overflow-hidden shadow-inner backdrop-blur-md ${isUnanswered ? 'border-white/5 bg-white/5' : isCorrect ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
                                <div className="table-responsive-wrapper m-0 pb-0">
                                  <table className="w-full text-right border-collapse min-w-[600px] m-0 bg-transparent shadow-none border-0">
                                    <thead>
                                      <tr className={isUnanswered ? 'bg-[#02040a]/60' : isCorrect ? 'bg-emerald-500/10' : 'bg-rose-500/10'}>
                                        <th className="p-4 sm:p-5 border-b border-l border-white/10 font-black text-slate-300 text-xs sm:text-sm w-1/3">وجه المقارنة</th>
                                        <th className="p-4 sm:p-5 border-b border-l border-white/10 font-black text-indigo-300 text-xs sm:text-sm text-center w-1/3"><div dangerouslySetInnerHTML={renderContentWithMath(safeOptions[0]?.content || safeOptions[0] || 'الطرف الأول')} /></th>
                                        <th className="p-4 sm:p-5 border-b border-white/10 font-black text-indigo-300 text-xs sm:text-sm text-center w-1/3"><div dangerouslySetInnerHTML={renderContentWithMath(safeOptions[1]?.content || safeOptions[1] || 'الطرف الثاني')} /></th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-[#0f1423]/40">
                                      {safeOptions.slice(2).map((opt: any, rIdx: number) => {
                                        const aspect = opt.content || opt || '';
                                        let parsedAns: any[] = [];
                                        try { 
                                          if (typeof studentAns === 'string') parsedAns = JSON.parse(studentAns || '[]'); 
                                          else if (Array.isArray(studentAns)) parsedAns = studentAns;
                                        } catch(e){}
                                        return (
                                          <tr key={rIdx} className="hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                                            <td className="p-4 sm:p-5 border-l border-white/10 font-bold text-slate-300 bg-transparent align-middle text-xs sm:text-sm"><div dangerouslySetInnerHTML={renderContentWithMath(aspect)} /></td>
                                            <td className="p-4 sm:p-5 border-l border-white/10 font-bold text-white align-middle whitespace-pre-wrap text-center bg-transparent text-xs sm:text-sm">{parsedAns[rIdx]?.[0] ? <div dangerouslySetInnerHTML={renderContentWithMath(parsedAns[rIdx][0])} /> : <span className="text-slate-600 font-normal">فارغ</span>}</td>
                                            <td className="p-4 sm:p-5 font-bold text-white align-middle whitespace-pre-wrap text-center bg-transparent text-xs sm:text-sm">{parsedAns[rIdx]?.[1] ? <div dangerouslySetInnerHTML={renderContentWithMath(parsedAns[rIdx][1])} /> : <span className="text-slate-600 font-normal">فارغ</span>}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : q.type === 'file_upload' && !isUnanswered ? (
                              <div className="mt-2 p-2 sm:p-3 bg-[#0f1423]/60 rounded-xl sm:rounded-2xl border border-white/5 inline-block shadow-inner backdrop-blur-sm">
                                {String(studentAnswerText).match(/\.(jpeg|jpg|gif|png|webp)$/i) || (String(studentAnswerText).includes('cloudinary') && !String(studentAnswerText).includes('.pdf')) ? (
                                   <img src={cleanPdfUrl(String(studentAnswerText))} alt="إجابة الطالب المرفقة" className="max-h-48 sm:max-h-80 w-auto object-contain rounded-lg sm:rounded-xl border border-white/10 bg-[#02040a]/40 p-1 mix-blend-luminosity hover:mix-blend-normal transition-all duration-300" />
                                ) : (
                                   <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                                     <a href={`https://docs.google.com/viewer?url=${encodeURIComponent(cleanPdfUrl(String(studentAnswerText)))}&embedded=true`} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto flex items-center justify-center gap-2 text-indigo-300 font-black hover:text-indigo-200 text-xs sm:text-sm px-4 py-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/30 shadow-inner active:scale-95 transition-all">
                                       <Eye className="w-4 h-4" /> عرض الملف
                                     </a>
                                     <a href={cleanPdfUrl(String(studentAnswerText))} target="_blank" rel="noopener noreferrer" download className="w-full sm:w-auto flex items-center justify-center gap-2 text-white font-black text-xs sm:text-sm px-4 py-2.5 bg-indigo-600/90 backdrop-blur-md rounded-xl border border-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:bg-indigo-500 active:scale-95 transition-all">
                                       <Download className="w-4 h-4" /> تحميل
                                     </a>
                                   </div>
                                )}
                              </div>
                            ) : q.type === 'project_submission' && !isUnanswered ? (
                               <ProjectSubmissionComponent 
                                  initialData={typeof studentAns === 'string' ? JSON.parse(studentAns) : studentAns as any}
                                  readOnly={true}
                                  onChange={() => {}}
                               />
                            ) : (
                              <div className={`p-4 sm:p-5 rounded-xl sm:rounded-2xl border mb-3 sm:mb-4 shadow-inner backdrop-blur-sm ${isUnanswered ? 'bg-white/5 border-white/10 border-dashed text-slate-500 italic' : isCorrect ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
                                <div className="text-[10px] sm:text-xs font-black mb-3 flex items-center gap-2 opacity-80">
                                  {isUnanswered ? <MinusCircle className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" /> : isCorrect ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 drop-shadow-sm"/> : <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400 drop-shadow-sm"/>}
                                  <span className="uppercase tracking-widest">إجابتك المسجلة:</span>
                                </div>
                                <div className={`text-sm sm:text-base lg:text-lg font-bold whitespace-pre-wrap leading-relaxed tiptap-content drop-shadow-sm ${isUnanswered ? 'italic opacity-60' : 'text-white'}`}>
                                    {isUnanswered ? 'لم يتم تقديم إجابة.' : <div dangerouslySetInnerHTML={renderContentWithMath(typeof studentAnswerText === 'object' && studentAnswerText !== null ? JSON.stringify(studentAnswerText) : String(studentAnswerText))} />}
                                </div>
                              </div>
                            )}

                            {/* التغذية الراجعة */}
                            {answerDetails?.feedback && (
                              <div className="mt-5 sm:mt-6 p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-indigo-500/10 border border-indigo-500/20 relative overflow-hidden shadow-inner backdrop-blur-md">
                                <div className="absolute right-0 top-0 w-1 sm:w-1.5 h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>
                                <div className="text-[10px] sm:text-xs font-black text-indigo-400 mb-2 flex items-center gap-1.5 uppercase tracking-widest drop-shadow-sm"><MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> تعليق المدرس على الإجابة:</div>
                                <p className="text-sm sm:text-base lg:text-lg font-bold text-white leading-relaxed pl-2 sm:pl-3 drop-shadow-sm">{answerDetails.feedback}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* المرفقات والنصوص الإضافية */}
                  {(mySubmission?.content || mySubmission?.file_url) && (
                    <div className="mt-8 sm:mt-12 p-6 sm:p-8 lg:p-10 rounded-[2rem] sm:rounded-[2.5rem] bg-[#02040a]/40 backdrop-blur-md border border-white/10 shadow-inner relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-48 h-48 bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none mix-blend-screen"></div>
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-black text-white mb-6 flex items-center gap-3 drop-shadow-md relative z-10"><FileText className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-400 drop-shadow-sm" /> مرفقات ونصوص إضافية مُرسلة</h3>
                      
                      {mySubmission?.content && (
                        <div className="bg-white/5 p-5 sm:p-6 rounded-[1.5rem] border border-white/10 mb-5 sm:mb-6 shadow-inner relative z-10 backdrop-blur-sm">
                          <p className="text-slate-200 whitespace-pre-wrap font-bold text-sm sm:text-base lg:text-lg leading-relaxed drop-shadow-sm">{mySubmission.content}</p>
                        </div>
                      )}
                      
                      {mySubmission?.file_url && (
                        <div className="relative w-full min-h-[250px] sm:min-h-[300px] bg-[#0f1423]/80 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 overflow-hidden flex items-center justify-center p-3 sm:p-4 shadow-inner relative z-10">
                          {mySubmission.file_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || (mySubmission.file_url.includes('cloudinary.com/image') && !mySubmission.file_url.includes('.pdf')) ? (
                            <img src={cleanPdfUrl(mySubmission.file_url)} alt="إجابة إضافية" className="max-h-[400px] sm:max-h-[500px] w-auto object-contain rounded-xl sm:rounded-2xl mix-blend-luminosity hover:mix-blend-normal transition-all duration-500 border border-white/5" />
                          ) : (
                             <div className="flex flex-col items-center gap-4 bg-indigo-500/10 backdrop-blur-md p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-indigo-500/20 w-full max-w-sm shadow-inner">
                                <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-indigo-400 drop-shadow-md" />
                                <p className="font-black text-white drop-shadow-sm text-sm sm:text-base">ملف إضافي</p>
                                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full mt-3 sm:mt-4">
                                  <a href={`https://docs.google.com/viewer?url=${encodeURIComponent(cleanPdfUrl(mySubmission.file_url))}&embedded=true`} target="_blank" rel="noopener noreferrer" className="w-full flex justify-center items-center gap-2 text-indigo-300 font-black text-xs sm:text-sm px-4 py-3 sm:py-3.5 bg-indigo-500/10 rounded-xl border border-indigo-500/30 shadow-inner active:scale-95 transition-all hover:bg-indigo-500/20">
                                    <Eye className="w-4 h-4" /> عرض
                                  </a>
                                  <a href={cleanPdfUrl(mySubmission.file_url)} target="_blank" rel="noopener noreferrer" download className="w-full flex justify-center items-center gap-2 text-white font-black text-xs sm:text-sm px-4 py-3 sm:py-3.5 bg-indigo-600/90 backdrop-blur-md rounded-xl border border-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:bg-indigo-500 active:scale-95 transition-all">
                                    <Download className="w-4 h-4" /> تحميل
                                  </a>
                                </div>
                             </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : questions.length > 0 ? (
                <div>
                  <AssignmentForm 
                    questions={sanitizedQuestions} 
                    onSubmit={handleSubmitAnswers} 
                    onChange={(newAnswers) => setMyAnswers(newAnswers)} 
                    isSubmitting={isSubmitting}
                    initialAnswers={myAnswers}
                    readOnly={!!mySubmission}
                  >
                    <div className="glass-panel p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border-white/10 shadow-inner mt-8">
                      <label className="block text-sm sm:text-base font-black text-white mb-4 drop-shadow-md">نص الإجابة الإضافي (اختياري)</label>
                      <div className="mb-6 sm:mb-8 rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-[#02040a]/40 backdrop-blur-md">
                        <ForumEditor 
                           content={content} 
                           setContent={(val: any) => setContent(val)} 
                           canUploadImage={false} 
                           isCompact={false} 
                           placeholder="إذا أردت إضافة ملاحظة نصية للمعلم..."
                        />
                      </div>

                      <label className="block text-sm sm:text-base font-black text-white mb-4 drop-shadow-md">ملف الإجابة (ارفع صورة الحل هنا)</label>
                      {!mySubmission ? (
                        <div className="bg-white/5 p-2 sm:p-3 rounded-2xl sm:rounded-[1.5rem] border border-white/10 shadow-inner backdrop-blur-sm">
                          <ImageUpload
                            initialImageUrl={fileUrl}
                            onUploadSuccess={(url) => setFileUrl(url || '')}
                            label="ارفع صورة إجابتك أو ملف الحل"
                          />
                        </div>
                      ) : (
                        fileUrl && (
                          <div className="relative w-full h-48 sm:h-64 mt-2 sm:mt-3 bg-[#02040a]/40 backdrop-blur-md rounded-2xl sm:rounded-[1.5rem] border border-white/10 overflow-hidden flex items-center justify-center shadow-inner p-2">
                            <img src={cleanPdfUrl(fileUrl)} alt="إجابة الطالب" className="max-h-full w-auto object-contain rounded-xl mix-blend-luminosity hover:mix-blend-normal transition-all duration-300" />
                          </div>
                        )
                      )}
                    </div>
                  </AssignmentForm>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); handleSubmitAnswers({}); }} className="space-y-6 sm:space-y-8">
                  <div className="glass-panel p-6 sm:p-8 lg:p-10 rounded-[2rem] sm:rounded-[2.5rem] border-white/10 shadow-inner">
                    <div>
                      <label className="block text-sm sm:text-base font-black text-white mb-4 drop-shadow-md">نص الإجابة (اختياري إذا كان هناك ملف)</label>
                      <div className="rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-[#02040a]/40 backdrop-blur-md">
                        <ForumEditor 
                           content={content} 
                           setContent={(val: any) => setContent(val)} 
                           canUploadImage={false} 
                           isCompact={false} 
                           placeholder="اكتب إجابتك هنا بالتفصيل..."
                        />
                      </div>
                    </div>
                    
                    <div className="mt-8 sm:mt-10">
                      <label className="block text-sm sm:text-base font-black text-white mb-4 drop-shadow-md">صورة الواجب (إجباري إذا لم تكتب نصاً)</label>
                      {!mySubmission ? (
                        <div className="bg-white/5 p-2 sm:p-3 rounded-2xl sm:rounded-[1.5rem] border border-white/10 shadow-inner backdrop-blur-sm">
                          <ImageUpload
                            initialImageUrl={fileUrl}
                            onUploadSuccess={(url) => setFileUrl(url || '')}
                            label="ارفع صورة الحل الخاص بك"
                          />
                        </div>
                      ) : (
                        fileUrl && (
                          <div className="relative w-full h-48 sm:h-64 mt-2 sm:mt-3 bg-[#02040a]/40 backdrop-blur-md rounded-2xl sm:rounded-[1.5rem] border border-white/10 overflow-hidden flex items-center justify-center shadow-inner p-2">
                            <img src={cleanPdfUrl(fileUrl)} alt="إجابة الطالب" className="max-h-full w-auto object-contain rounded-xl mix-blend-luminosity hover:mix-blend-normal transition-all duration-300" />
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
                        className="w-full flex justify-center items-center gap-2 sm:gap-3 rounded-2xl sm:rounded-[1.5rem] bg-indigo-600/90 backdrop-blur-md px-6 sm:px-8 py-4 sm:py-5 text-base sm:text-lg font-black text-white shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-400/50"
                      >
                        {isSubmitting ? (
                          <div className="h-5 w-5 sm:h-6 sm:w-6 border-[3px] border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          <Send className="h-5 w-5 sm:h-6 sm:w-6 drop-shadow-md" />
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
        
        {/* 🚀 واجهة المعلم / الإدارة للتصحيح (Holographic Admin Panel) */}
        {['teacher', 'admin', 'management'].includes(currentRole || '') && (
          <div className="space-y-6 sm:space-y-8 relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-[#02040a]/60 backdrop-blur-md rounded-xl sm:rounded-2xl w-full sm:w-fit border border-white/10 shadow-inner">
                <button 
                  onClick={() => setActiveTab('submissions')}
                  className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'submissions' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
                >
                  <Users className="h-4 w-4 drop-shadow-sm" />
                  التسليمات
                </button>
                <button 
                  onClick={() => setActiveTab('preview')}
                  className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'preview' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
                >
                  <Eye className="h-4 w-4 drop-shadow-sm" />
                  معاينة كطالب
                </button>
              </div>
              
              {activeTab === 'submissions' && uniqueSections.length > 0 && (
                <div className="relative w-full sm:w-64">
                   <Filter className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none drop-shadow-sm" />
                   <select 
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      className="w-full pl-4 pr-10 py-3 sm:py-3.5 bg-[#02040a]/60 backdrop-blur-md border border-white/10 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold text-white outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30 shadow-inner appearance-none cursor-pointer transition-all [&>option]:bg-[#0f1423]"
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
              <div className="glass-panel rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none mix-blend-screen"></div>
                
                <div className="p-5 sm:p-6 lg:p-8 border-b border-white/5 bg-[#02040a]/40 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 relative z-10">
                  <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3 drop-shadow-md">
                    <div className="p-2.5 sm:p-3 bg-indigo-500/10 text-indigo-400 rounded-xl sm:rounded-2xl shadow-inner border border-indigo-500/20">
                      <Users className="h-5 w-5 sm:h-6 sm:w-6 drop-shadow-sm" />
                    </div>
                    تسليمات الطلاب
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
                    <button onClick={exportToExcel} className="flex-1 md:flex-none items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl font-black border border-emerald-500/30 transition-all flex text-xs sm:text-sm shadow-inner active:scale-95 backdrop-blur-sm">
                      <FileSpreadsheet className="h-4 w-4 drop-shadow-sm" /> Excel
                    </button>
                    <button onClick={exportToPDF} className="flex-1 md:flex-none items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl font-black border border-rose-500/30 transition-all flex text-xs sm:text-sm shadow-inner active:scale-95 backdrop-blur-sm">
                      <Download className="h-4 w-4 drop-shadow-sm" /> PDF
                    </button>
                    <div className="w-full md:w-auto text-center px-4 sm:px-5 py-2.5 sm:py-3 bg-white/5 rounded-xl shadow-inner border border-white/10 text-xs sm:text-sm font-black text-slate-300 backdrop-blur-sm mt-2 md:mt-0">
                      الإجمالي: {filteredSubmissions.length}
                    </div>
                  </div>
                </div>
                
                <div className="p-0 relative z-10 bg-transparent">
                  {filteredSubmissions.length === 0 ? (
                    <div className="text-center py-16 sm:py-24 bg-[#02040a]/20">
                      <div className="h-16 w-16 sm:h-20 sm:w-20 bg-[#0f1423] rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5 shadow-inner">
                        <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-slate-500 drop-shadow-sm" />
                      </div>
                      <p className="text-slate-400 font-bold text-sm sm:text-lg drop-shadow-sm">لا توجد تسليمات متاحة في هذا التصنيف.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {filteredSubmissions.map((sub) => {
                         const st = sub.student as any;
                         const isGraded = sub.status === 'graded' || String(sub.status) === 'completed';

                         return (
                           <div key={sub.id} className="p-4 sm:p-5 lg:p-6 hover:bg-white/5 transition-colors group bg-transparent">
                             <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
                               
                               <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                 <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-[#0f1423] flex items-center justify-center text-indigo-400 border border-white/5 shadow-inner shrink-0 font-black text-lg sm:text-xl group-hover:border-indigo-500/30 group-hover:scale-105 transition-all">
                                   {st?.users?.full_name?.charAt(0) || st?.user?.full_name?.charAt(0) || 'ط'}
                                 </div>
                                 <div className="min-w-0 pr-1">
                                   <h3 className="font-black text-white text-sm sm:text-base lg:text-lg truncate group-hover:text-indigo-300 transition-colors drop-shadow-md">{st?.users?.full_name || st?.user?.full_name || 'طالب غير معروف'}</h3>
                                   <div className="flex flex-wrap items-center gap-2 mt-1 sm:mt-1.5">
                                      <p className="text-[10px] sm:text-xs font-bold text-slate-400 flex items-center gap-1.5 drop-shadow-sm">
                                        <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 opacity-70" />
                                        <span dir="ltr">{new Date(sub.submitted_at || (sub as any).created_at).toLocaleString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit' })}</span>
                                      </p>
                                      <span className="text-[9px] sm:text-[10px] font-black text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 truncate max-w-[120px] sm:max-w-xs shadow-inner">
                                         {getStudentSectionName(st)}
                                      </span>
                                   </div>
                                 </div>
                               </div>

                               <div className="flex items-center justify-end gap-2 sm:gap-3 border-t lg:border-0 pt-3 lg:pt-0 border-white/5 w-full lg:w-auto shrink-0 mt-2 lg:mt-0">
                                 {isGraded ? (
                                   <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black flex items-center gap-1.5 sm:gap-2 shadow-inner backdrop-blur-sm">
                                     <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 drop-shadow-sm" /> الدرجة: <span className="text-sm sm:text-base">{sub.grade}</span>
                                   </div>
                                 ) : (
                                   <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black animate-pulse shadow-inner backdrop-blur-sm">
                                     بانتظار التقييم
                                   </span>
                                 )}
                                 
                                 {canEdit && (
                                   <button
                                     onClick={() => setSubmissionToDelete(sub.id)}
                                     className="h-9 w-9 sm:h-10 sm:w-10 lg:h-11 lg:w-11 flex items-center justify-center rounded-lg sm:rounded-xl bg-white/5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all shadow-inner border border-white/10 active:scale-95 shrink-0"
                                     title="حذف هذا التسليم لإتاحة الفرصة للطالب"
                                   >
                                     <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 drop-shadow-sm" />
                                   </button>
                                 )}

                                 <Link 
                                   href={`/assignments/${assignmentId}/submissions/${sub.id}`}
                                   className="h-9 sm:h-10 lg:h-11 px-4 sm:px-5 lg:px-6 rounded-lg sm:rounded-xl bg-indigo-600/90 backdrop-blur-md text-white text-[10px] sm:text-xs lg:text-sm font-black hover:bg-indigo-500 transition-all flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)] border border-indigo-400/50 active:scale-95 flex-1 lg:flex-none"
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
              <div className="max-w-4xl mx-auto">
                <div className="mb-6 sm:mb-8 p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs sm:text-sm font-black flex items-center gap-2 sm:gap-3 shadow-inner backdrop-blur-sm">
                  <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 shrink-0 drop-shadow-md" />
                  <span className="leading-relaxed drop-shadow-sm">هذه معاينة لما يراه الطالب في صفحة التسليم. لن يتم حفظ أي إجابات تقوم بإدخالها هنا.</span>
                </div>
                {questions.length > 0 ? (
                  <div id="assignment-form-container">
                    <AssignmentForm 
                      questions={sanitizedQuestions} 
                      onSubmit={() => showNotification('success', 'هذه معاينة فقط، لم يتم حفظ الإجابة')} 
                      readOnly={false}
                    />
                  </div>
                ) : (
                  <div className="glass-panel p-10 sm:p-14 rounded-[2rem] sm:rounded-[3rem] border border-white/10 text-center shadow-inner relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none mix-blend-screen group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#0f1423] rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-5 sm:mb-6 border border-white/5 shadow-inner relative z-10 group-hover:scale-110 transition-transform duration-300">
                      <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-slate-500 drop-shadow-md" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white mb-2 relative z-10 drop-shadow-md">لا توجد أسئلة تفاعلية</h3>
                    <p className="text-slate-400 font-bold text-xs sm:text-sm relative z-10">هذا الواجب يعتمد على رفع ملف من قِبل الطالب. يمكنك إضافة أسئلة من خلال التعديل.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 🚀 النوافذ المنبثقة (Glass Modals) */}
      
      {/* نافذة الحذف الشامل */}
      <Dialog.Root open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/80 backdrop-blur-md z-40 animate-in fade-in duration-300" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[90%] sm:w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[2.5rem] glass-panel border border-rose-500/30 p-6 sm:p-8 shadow-[0_0_60px_rgba(225,29,72,0.2)] focus:outline-none animate-in zoom-in-95 duration-300" dir="rtl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-[40px] rounded-full pointer-events-none mix-blend-screen"></div>
            <div className="h-14 w-14 sm:h-16 sm:w-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-5 sm:mb-6 shadow-inner mx-auto sm:mx-0 backdrop-blur-sm relative z-10">
              <Trash2 className="h-6 w-6 sm:h-8 sm:w-8 text-rose-400 drop-shadow-md" />
            </div>
            <Dialog.Title className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight text-center sm:text-right drop-shadow-md relative z-10">
              تأكيد الحذف الشامل
            </Dialog.Title>
            <p className="text-slate-400 font-bold mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base text-center sm:text-right px-2 sm:px-0 relative z-10">هل أنت متأكد من رغبتك في حذف هذا الواجب نهائياً؟ سيتم مسح الواجب، والمرفقات، وجميع إجابات وتقييمات الطلاب المرتبطة به نهائياً ولن تتمكن من التراجع.</p>
            <div className="flex flex-col sm:flex-row justify-end gap-3 relative z-10">
              <Dialog.Close asChild>
                <button className="flex-1 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-slate-300 hover:bg-white/10 hover:text-white transition-all active:scale-95 shadow-inner backdrop-blur-sm">
                  إلغاء
                </button>
              </Dialog.Close>
              <button
                onClick={handleDeleteAssignmentAction}
                disabled={loading || isDeletingSubmission}
                className="flex-1 rounded-xl sm:rounded-2xl bg-rose-600/90 backdrop-blur-md border border-rose-400/50 px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-white hover:bg-rose-500 transition-all active:scale-95 disabled:opacity-50 shadow-[0_0_20px_rgba(225,29,72,0.4)] flex items-center justify-center gap-2"
              >
                {(loading || isDeletingSubmission) ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mx-auto"/> : 'تأكيد الحذف نهائياً'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* نافذة إلغاء تسليم طالب */}
      <Dialog.Root open={!!submissionToDelete} onOpenChange={(open) => !open && setSubmissionToDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/80 backdrop-blur-md z-40 animate-in fade-in duration-300" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[90%] sm:w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[2.5rem] glass-panel border border-amber-500/30 p-6 sm:p-8 shadow-[0_0_60px_rgba(245,158,11,0.15)] focus:outline-none animate-in zoom-in-95 duration-300" dir="rtl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[40px] rounded-full pointer-events-none mix-blend-screen"></div>
            <div className="h-14 w-14 sm:h-16 sm:w-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-5 sm:mb-6 shadow-inner mx-auto sm:mx-0 backdrop-blur-sm relative z-10">
              <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-amber-400 drop-shadow-md" />
            </div>
            <Dialog.Title className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight text-center sm:text-right drop-shadow-md relative z-10">
              إلغاء تسليم الطالب
            </Dialog.Title>
            <p className="text-slate-400 font-bold mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base text-center sm:text-right px-2 sm:px-0 relative z-10">هل أنت متأكد أنك تريد حذف هذا التسليم وإجاباته؟ سيُسمح للطالب بإعادة تسليم الواجب من جديد إذا لم ينتهِ الوقت.</p>
            <div className="flex flex-col sm:flex-row justify-end gap-3 relative z-10">
              <Dialog.Close asChild>
                <button className="flex-1 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-slate-300 hover:bg-white/10 hover:text-white transition-all active:scale-95 shadow-inner backdrop-blur-sm">
                  إلغاء
                </button>
              </Dialog.Close>
              <button 
                onClick={handleDeleteSubmissionAction} 
                disabled={isDeletingSubmission} 
                className="flex-1 rounded-xl sm:rounded-2xl bg-amber-500/90 backdrop-blur-md border border-amber-400/50 px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-[#02040a] hover:bg-amber-400 transition-all active:scale-95 disabled:opacity-50 shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2"
              >
                {isDeletingSubmission ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mx-auto"/> : 'تأكيد الإلغاء'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* نافذة التعديل السريع (الوقت) */}
      <Dialog.Root open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/80 backdrop-blur-md z-40 animate-in fade-in duration-300" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95%] sm:w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[2.5rem] glass-panel border border-indigo-500/30 p-6 sm:p-8 shadow-[0_0_60px_rgba(99,102,241,0.2)] focus:outline-none max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300 custom-scrollbar" dir="rtl">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none mix-blend-screen"></div>
            
            <div className="flex items-center justify-between mb-6 sm:mb-8 pb-5 sm:pb-6 border-b border-white/5 relative z-10">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-inner flex items-center justify-center shrink-0 backdrop-blur-sm">
                  <Clock className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-400 drop-shadow-md" />
                </div>
                <div>
                  <Dialog.Title className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md">تعديل سريع للوقت</Dialog.Title>
                  <p className="text-xs sm:text-sm text-slate-400 font-bold mt-1">تعديل عنوان الواجب وتمديد وقت التسليم فقط</p>
                </div>
              </div>
              <Dialog.Close className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-lg sm:rounded-xl bg-white/5 border border-white/10 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors shadow-inner active:scale-90 backdrop-blur-sm">
                <X className="h-4 w-4 sm:h-5 sm:w-5 drop-shadow-sm" />
              </Dialog.Close>
            </div>
            
            <form onSubmit={handleUpdateAssignment} className="space-y-6 relative z-10">
              <div className="space-y-5">
                <div className="bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-white/5 shadow-inner">
                  <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 drop-shadow-sm">عنوان الواجب <span className="text-rose-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    className="block w-full rounded-xl sm:rounded-2xl border border-white/10 py-3.5 sm:py-4 px-4 sm:px-5 text-white bg-white/5 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-xs sm:text-sm transition-all font-bold outline-none shadow-inner" 
                    value={editData.title || ''} 
                    onChange={(e) => setEditData({...editData, title: e.target.value})} 
                  />
                </div>
                <div className="bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-white/5 shadow-inner">
                  <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 drop-shadow-sm">تاريخ ووقت التسليم الجديد <span className="text-rose-500">*</span></label>
                  <input 
                    type="datetime-local" 
                    required 
                    dir="ltr" 
                    className="block w-full rounded-xl sm:rounded-2xl border border-white/10 py-3.5 sm:py-4 px-4 sm:px-5 text-white bg-white/5 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-[10px] sm:text-xs transition-all font-bold text-left outline-none shadow-inner" 
                    style={{ colorScheme: 'dark' }}
                    value={editData.due_date ? new Date(new Date(editData.due_date).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ''} 
                    onChange={(e) => setEditData({...editData, due_date: e.target.value})} 
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-5 sm:pt-6 border-t border-white/5">
                <Dialog.Close asChild>
                  <button type="button" className="w-full sm:w-auto rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 px-6 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-slate-300 hover:bg-white/10 hover:text-white transition-all active:scale-95 shadow-inner backdrop-blur-sm">
                    إلغاء
                  </button>
                </Dialog.Close>
                <button type="submit" disabled={isSubmittingEdit} className="w-full sm:w-auto rounded-xl sm:rounded-2xl bg-indigo-600/90 backdrop-blur-md border border-indigo-400/50 px-6 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-white hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50 shadow-[0_0_20px_rgba(99,102,241,0.4)] flex items-center justify-center gap-2">
                  {isSubmittingEdit ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mx-auto"/> : <><CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-sm" /> حفظ التمديد</>}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* نافذة التعديل الشامل للواجب */}
      <Dialog.Root open={isFullEditModalOpen} onOpenChange={setIsFullEditModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/80 backdrop-blur-md z-40 animate-in fade-in duration-300" />
          <Dialog.Content 
            onInteractOutside={(e) => e.preventDefault()} 
            onEscapeKeyDown={(e) => e.preventDefault()}
            className="fixed left-[50%] top-[50%] z-50 w-[95%] sm:w-full max-w-5xl translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[2.5rem] glass-panel border border-amber-500/30 p-5 sm:p-8 shadow-[0_0_60px_rgba(245,158,11,0.15)] focus:outline-none max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300 custom-scrollbar" 
            dir="rtl"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none mix-blend-screen"></div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 pb-5 sm:pb-6 border-b border-white/5 gap-4 relative z-10">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-inner flex items-center justify-center shrink-0 backdrop-blur-md">
                  <Edit2 className="h-6 w-6 sm:h-7 sm:w-7 text-amber-400 drop-shadow-md" />
                </div>
                <div>
                  <Dialog.Title className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md">
                    تعديل شامل للواجب
                  </Dialog.Title>
                  <p className="text-xs sm:text-sm text-slate-400 font-bold mt-1">يمكنك تعديل المرفقات، الوصف، والأسئلة التفاعلية</p>
                </div>
              </div>
              <Dialog.Close className="absolute sm:relative top-5 left-5 sm:top-auto sm:left-auto h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-lg sm:rounded-xl bg-white/5 border border-white/10 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors shadow-inner active:scale-90 backdrop-blur-sm">
                <X className="h-4 w-4 sm:h-5 sm:w-5 drop-shadow-sm" />
              </Dialog.Close>
            </div>
            
            <form onSubmit={handleSaveFullEdit} className="space-y-6 sm:space-y-10 relative z-10">
              <div className="space-y-6 sm:space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                  <div className="space-y-5 sm:space-y-6">
                    <div className="bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-white/5 shadow-inner">
                      <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 drop-shadow-sm">عنوان الواجب <span className="text-rose-500">*</span></label>
                      <input 
                        type="text" 
                        required
                        className="block w-full rounded-xl sm:rounded-2xl border border-white/10 py-3.5 sm:py-4 px-4 sm:px-5 text-white bg-white/5 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-xs sm:text-sm transition-all font-bold outline-none shadow-inner"
                        value={editData.title || ''}
                        onChange={(e) => setEditData({...editData, title: e.target.value})}
                      />
                    </div>
                  
                    <div className="bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-white/5 shadow-inner flex flex-col min-h-[300px]">
                      <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 drop-shadow-sm">الوصف والتعليمات</label>
                      <div className="bg-transparent rounded-xl sm:rounded-2xl border-none flex-1 flex flex-col overflow-visible">
                        <ForumEditor 
                          content={editDescription}
                          setContent={setEditDescription}
                          canUploadImage={true}
                        />
                      </div>
                    </div>

                    <div className="bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-white/5 shadow-inner">
                      <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 drop-shadow-sm">تاريخ التسليم <span className="text-rose-500">*</span></label>
                      <input 
                        type="datetime-local" 
                        required
                        className="block w-full rounded-xl sm:rounded-2xl border border-white/10 py-3.5 sm:py-4 px-3 sm:px-4 text-white bg-white/5 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-[10px] sm:text-xs transition-all font-bold text-left outline-none shadow-inner"
                        style={{ colorScheme: 'dark' }}
                        dir="ltr"
                        value={editData.due_date || ''}
                        onChange={(e) => setEditData({...editData, due_date: e.target.value})}
                      />
                    </div>

                    <div className="bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-white/5 shadow-inner">
                      <label className="flex items-center gap-2 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-4 drop-shadow-sm">
                        <Users className="w-4 h-4 text-indigo-400" />
                        الشعب المستهدفة <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 max-h-52 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                        {sections.map((s: any) => {
                          const classObj = s.classes || s.class;
                          const cName = Array.isArray(classObj) ? classObj[0]?.name : classObj?.name;
                          const isChecked = editSectionIds.includes(s.id);
                          return (
                            <label key={s.id} className={`flex items-center gap-2 sm:gap-3 cursor-pointer group p-2.5 sm:p-3 rounded-xl border transition-all shadow-inner ${isChecked ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-white/5 border-white/10 text-slate-400 hover:border-indigo-500/30 hover:bg-white/10'}`}>
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={isChecked}
                                onChange={(e) => {
                                  const newSectionIds = e.target.checked
                                    ? [...editSectionIds, s.id]
                                    : editSectionIds.filter((id: string) => id !== s.id);
                                  setEditSectionIds(newSectionIds);
                                }}
                              />
                              <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-[0.4rem] border flex items-center justify-center shrink-0 transition-colors shadow-inner ${isChecked ? 'bg-indigo-500 border-indigo-400' : 'border-white/20 bg-[#02040a]'}`}>
                                 {isChecked && <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white drop-shadow-md" />}
                              </div>
                              <span className="text-xs sm:text-sm font-bold truncate">
                                {cName ? `${cName} - ${s.name}` : s.name}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-white/5 shadow-inner">
                      <label className="flex items-center gap-2 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-3 sm:mb-4 drop-shadow-sm">
                        <ImageIcon className="w-4 h-4 text-indigo-400" />
                        المرفق الحالي / تعديل
                      </label>
                      <div className="bg-white/5 rounded-xl sm:rounded-2xl p-1.5 sm:p-2 border border-white/10 shadow-inner">
                        <ImageUpload
                          initialImageUrl={editFileUrl}
                          onUploadSuccess={(url) => setEditFileUrl(url || '')}
                          label="تغيير المرفق"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Question Builder */}
                  <div className="bg-transparent rounded-[1.5rem] sm:rounded-[2rem] p-0 border-none relative overflow-visible h-fit">
                    <div className="flex items-center gap-2 sm:gap-3 mb-5 sm:mb-6 relative z-10 bg-[#02040a]/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 shadow-inner">
                      <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg sm:rounded-xl shadow-inner shrink-0">
                         <Layout className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-400 drop-shadow-md" />
                      </div>
                      <h4 className="text-base sm:text-lg font-black text-white drop-shadow-md">بناء الأسئلة التفاعلية</h4>
                    </div>
                    <div className="relative z-10">
                      <AssignmentBuilder questions={editQuestions} onChange={setEditQuestions} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 sm:pt-8 border-t border-white/5 relative z-10">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="w-full sm:w-auto rounded-xl sm:rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 px-6 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-slate-300 hover:bg-white/10 hover:text-white transition-all active:scale-95 shadow-inner"
                  >
                    إلغاء الأمر
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="w-full sm:w-auto rounded-xl sm:rounded-2xl bg-indigo-600/90 backdrop-blur-md border border-indigo-400/50 px-6 sm:px-10 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-white hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                >
                  {isSubmittingEdit ? (
                    <><Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> جاري الحفظ...</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4 sm:h-5 sm:w-5 drop-shadow-md" /> اعتماد التعديلات الشاملة</>
                  )}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </div>
  );
}
