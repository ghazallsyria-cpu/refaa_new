'use client';
// @ts-nocheck
import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, FileText, Calendar, Clock, Link as LinkIcon, X, BookOpen, Users, AlertCircle, Eye, CheckCircle2, Filter, Layout, Image as ImageIcon, Play, Loader2, ShieldAlert } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion'; 
import AssignmentBuilder from '@/components/assignment-builder';
import ImageUpload from '@/components/ImageUpload';
import ForumEditorOriginal from '@/components/ForumEditor';
const ForumEditor = ForumEditorOriginal as any;
import { Question } from '@/types/question';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { useAssignmentsSystem } from '@/hooks/useAssignmentsSystem';
import { useSchoolFormData } from '@/hooks/useSchoolFormData';
import { useAuth } from '@/context/auth-context';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';

// 🚀 الألوان الملكية لحالات الواجب
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

export default function AssignmentsPage() {
  const { user, authRole, userRole, isChecking: authLoading } = useAuth() as { user: any, authRole: string | null, userRole: string | null, isChecking: boolean };
  const currentRole = authRole || userRole;
  
  const { data: assignments, loading: contentLoading, error: contentError, studentSubmissions, refetch: refresh, fetchAssignmentQuestions, saveAssignment, deleteAssignment } = useAssignmentsSystem();

  const { data: formData, isLoading: formLoading } = useSchoolFormData();
  const subjects = formData?.subjects || [];
  const sections = formData?.sections || [];
  const teachers = formData?.teachers || [];
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [currentAssignment, setCurrentAssignment] = useState<any>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const filteredAssignments = assignments.filter(a => {
    if(!a) return false;
    const matchTitle = a.title?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const matchSubject = a.subject_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return (matchTitle || matchSubject) && matchStatus;
  });

  const displayedAssignments = (currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'management') 
    ? filteredAssignments 
    : filteredAssignments.filter(e => e?.status === 'published');

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!currentAssignment.subject_id) {
      showNotification('error', 'عذراً، يجب اختيار المادة الدراسية');
      return;
    }
    if (!currentAssignment.section_ids || currentAssignment.section_ids.length === 0) {
      showNotification('error', 'عذراً، يجب تحديد شعبة واحدة على الأقل لإرسال الواجب إليها');
      return;
    }
    if ((currentRole === 'admin' || currentRole === 'management') && !currentAssignment.teacher_id) {
      showNotification('error', 'عذراً، يجب اختيار المعلم المسؤول عن الواجب');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: currentAssignment.title,
        description: currentAssignment.description,
        subject_id: currentAssignment.subject_id,
        teacher_id: currentRole === 'teacher' ? user.id : currentAssignment.teacher_id,
        due_date: currentAssignment.due_date,
        file_url: currentAssignment.file_url,
        status: currentAssignment.status || 'draft'
      };

      await saveAssignment(payload, currentAssignment.id || null, questions, currentAssignment.section_ids, subjects);

      showNotification('success', currentAssignment.id ? 'تم تحديث الواجب بنجاح' : 'تم إضافة الواجب بنجاح');
      setIsModalOpen(false);
      if (refresh) refresh();
    } catch (error: any) {
      console.error('Error saving assignment:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء حفظ الواجب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    setLoading(true);
    try {
      const assignment = assignments.find(a => a.id === assignmentToDelete);
      
      if (assignment?.file_url) {
        try { await deleteFromCloudinary(assignment.file_url); } catch (e) { console.error('Teacher file delete error:', e); }
      }

      const { data: subs } = await supabase
        .from('assignment_submissions')
        .select('file_url')
        .eq('assignment_id', assignmentToDelete);
        
      if (subs && subs.length > 0) {
        for (const sub of subs) {
          if (sub.file_url) {
            try { await deleteFromCloudinary(sub.file_url); } catch (e) { console.error('Student file delete error:', e); }
          }
        }
      }

      await deleteAssignment(assignmentToDelete);
      showNotification('success', 'تم حذف الواجب وجميع مرفقاته بنجاح');
      setAssignmentToDelete(null);
      if (refresh) refresh();
    } catch (error: any) {
      showNotification('error', error.message || 'حدث خطأ أثناء حذف الواجب');
    } finally {
      setLoading(false);
    }
  };

  const openFullEditModal = async (assignment: any) => {
    setEditingAssignment(assignment);
    const dateObj = new Date(assignment.due_date);
    const formattedDate = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    setCurrentAssignment({
      ...assignment,
      due_date: formattedDate,
      section_ids: assignment.assignment_sections?.map((as: any) => as.section_id) || assignment.section_ids || []
    });
    const qData = await fetchAssignmentQuestions(assignment.id);
    setQuestions(qData);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingAssignment(null);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    const formattedDate = new Date(tomorrow.getTime() - (tomorrow.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    setCurrentAssignment({
      title: '',
      description: '',
      subject_id: subjects[0]?.id || '',
      teacher_id: currentRole === 'teacher' ? user?.id : '', 
      due_date: formattedDate,
      section_ids: [],
      file_url: '',
      status: 'draft'
    });
    setQuestions([]);
    setIsModalOpen(true);
  };

  // 🚀 شاشات التحميل والحماية الملكية
  if (!mounted || authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-transparent font-cairo">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
             <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)]"></div>
             <ShieldAlert className="absolute h-8 w-8 text-indigo-400 animate-pulse" />
          </div>
          <p className="text-indigo-500 font-black animate-pulse tracking-widest drop-shadow-md">جاري التحقق من الهوية...</p>
        </div>
      </div>
    );
  }

  const isOverdue = (dueDateStr: string) => new Date(dueDateStr) < new Date();

  return (
    <div className="min-h-screen bg-transparent text-slate-100 font-cairo overflow-x-hidden relative pb-32 pt-6" dir="rtl">
      
      <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* إشعار النجاح / الخطأ */}
        <AnimatePresence>
          {notification && (
            <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-[100] px-6 sm:px-8 py-3 sm:py-4 rounded-2xl sm:rounded-3xl shadow-2xl flex items-center gap-3 sm:gap-4 transition-all backdrop-blur-3xl border w-[90%] sm:w-auto ${
              notification.type === 'success' ? 'bg-[#02040a]/90 text-emerald-400 border-emerald-500/50 shadow-[0_20px_50px_rgba(16,185,129,0.3)]' : 'bg-[#02040a]/90 text-rose-400 border-rose-500/50 shadow-[0_20px_50px_rgba(244,63,94,0.3)]'
            }`}>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                {notification.type === 'success' ? <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" /> : <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6" />}
              </div>
              <div className="font-black tracking-tight text-sm sm:text-base text-white drop-shadow-sm leading-snug">{notification.message}</div>
              <button onClick={() => setNotification(null)} className="p-1 sm:p-1.5 hover:bg-white/10 rounded-lg transition-colors mr-2 sm:mr-4 text-white shrink-0 active:scale-90">
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🚀 الهيدر الفخم */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 glass-panel p-6 sm:p-8 lg:p-10 rounded-[2rem] sm:rounded-[3rem] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none -mr-10 -mt-10"></div>
          <div className="relative z-10 space-y-3 sm:space-y-4 text-center md:text-right w-full md:w-auto">
            <div className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-[10px] sm:text-xs font-black text-indigo-400 uppercase tracking-widest shadow-inner mx-auto md:mx-0">
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> مركز الواجبات
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-lg">الواجبات المدرسية</h1>
            <p className="text-sm sm:text-base text-slate-400 font-bold max-w-md mx-auto md:mx-0">إدارة ومتابعة الواجبات والمهام المسندة للطلاب عبر المنصة الرقمية</p>
          </div>
          {(currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'management') && (
            <button 
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 sm:px-8 py-3.5 sm:py-4 text-sm font-black text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:from-indigo-500 hover:to-blue-500 transition-all active:scale-95 border border-indigo-400/50 relative z-10 w-full md:w-auto"
            >
              <Plus className="h-5 w-5" /> إضافة واجب جديد
            </button>
          )}
        </div>

        {/* 🚀 فلاتر البحث الزجاجية */}
        <div className="glass-panel p-4 sm:p-5 lg:p-6 rounded-[1.5rem] sm:rounded-[2rem]">
          <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
            <div className="relative flex-1 group">
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 sm:pr-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                <Search className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
              </div>
              <input
                type="text"
                className="block w-full rounded-xl sm:rounded-2xl border border-white/5 py-3.5 sm:py-4 pr-10 sm:pr-12 pl-4 text-white bg-[#02040a]/60 focus:bg-[#02040a] focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all font-bold outline-none shadow-inner placeholder:text-slate-500"
                placeholder="البحث بعنوان الواجب أو المادة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {(currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'management') && (
              <div className="relative md:w-64 group">
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 sm:pr-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <select
                  className="block w-full rounded-xl sm:rounded-2xl border border-white/5 py-3.5 sm:py-4 pr-10 sm:pr-12 pl-4 text-white bg-[#02040a]/60 focus:bg-[#02040a] focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all font-bold appearance-none outline-none shadow-inner cursor-pointer [&>option]:bg-[#0f1423]"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">جميع الواجبات</option>
                  <option value="published">المنشورة فقط</option>
                  <option value="draft">المسودات فقط</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* 🚀 المحتوى (الواجبات) مع تفادي إعادة التحميل الكلي المزعج */}
        {contentLoading && assignments.length === 0 ? (
          <div className="flex flex-col justify-center items-center py-20 sm:py-32 gap-5 relative z-10">
            <Loader2 className="animate-spin h-14 w-14 sm:h-16 sm:w-16 text-indigo-500 drop-shadow-[0_0_20px_rgba(99,102,241,0.5)]" />
            <p className="text-slate-400 font-black animate-pulse tracking-widest text-sm sm:text-base">جاري تحميل الواجبات...</p>
          </div>
        ) : displayedAssignments.length === 0 ? (
          <div className="text-center py-20 sm:py-32 glass-panel rounded-[2rem] sm:rounded-[3rem] border border-dashed border-white/10 shadow-inner px-4">
            <div className="h-20 w-20 sm:h-24 sm:w-24 bg-[#0f1423]/50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 border border-white/5 shadow-inner">
              <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-slate-500 drop-shadow-md" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2 drop-shadow-sm">لا توجد واجبات مسجلة</h3>
            <p className="text-slate-400 font-bold text-xs sm:text-sm max-w-xs mx-auto">
               {statusFilter === 'draft' ? 'لا يوجد مسودات مسجلة حالياً.' : 'قم بإضافة واجبات جديدة للطلاب للبدء.'}
            </p>
          </div>
        ) : (
          <div className={currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'management' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8" : "flex flex-col gap-5 sm:gap-6"}>
            {displayedAssignments.map((assignment, index) => {
              
              if (currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'management') {
                const pendingGradesCount = (assignment.submission_count || 0) - (assignment.graded_count || 0);
                const needsTeacherGrading = pendingGradesCount > 0;
                const overdue = isOverdue(assignment.due_date!);
                const dueDateObj = new Date(assignment.due_date!);
                
                const canEdit = currentRole === 'admin' || currentRole === 'management' || assignment.teacher_id === user?.id;

                return (
                  <div key={assignment.id} className="group glass-panel rounded-[2rem] sm:rounded-[2.5rem] border border-white/5 hover:border-indigo-500/40 hover:shadow-[0_10px_40px_-10px_rgba(99,102,241,0.3)] transition-all overflow-hidden flex flex-col bg-[#0f1423]/40 hover:bg-[#0f1423]/80">
                    <div className="p-6 sm:p-8 flex-1 relative">
                      <div className="flex items-start justify-between mb-6 sm:mb-8 gap-2 relative z-10">
                        <div className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest border whitespace-nowrap shadow-inner ${getStatusColor(assignment.status)}`}>
                          {getStatusLabel(assignment.status)}
                        </div>

                        {needsTeacherGrading && (
                          <div className="flex-1 flex justify-end">
                            <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black border shadow-inner bg-amber-500/20 text-amber-400 border-amber-500/30 flex items-center gap-1 sm:gap-1.5 animate-pulse">
                              <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              <span>{pendingGradesCount} للتقييم</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex gap-1.5 sm:gap-2 relative z-10">
                          <Link 
                             href={`/assignments/${assignment.id}`}
                             className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/20 rounded-xl transition-all shadow-inner bg-[#02040a]/60 border border-white/5 active:scale-95"
                             title="عرض التفاصيل"
                          >
                            <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                          </Link>
                          {canEdit && (
                            <button 
                              onClick={() => openFullEditModal(assignment)}
                              className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/20 rounded-xl transition-all shadow-inner bg-[#02040a]/60 border border-white/5 active:scale-95"
                              title="تعديل الواجب بالكامل"
                            >
                              <Edit2 className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                          )}
                          {canEdit && (
                            <button 
                              onClick={() => setAssignmentToDelete(assignment.id)}
                              className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all shadow-inner bg-[#02040a]/60 border border-white/5 active:scale-95"
                              title="حذف الواجب"
                            >
                              <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="text-xl sm:text-2xl font-black text-white mb-3 sm:mb-4 group-hover:text-indigo-400 transition-colors tracking-tight leading-tight line-clamp-2 drop-shadow-sm relative z-10">
                        {assignment.title}
                      </h3>
                      
                      <p className="text-slate-400 font-bold line-clamp-2 mb-6 sm:mb-8 text-xs sm:text-sm leading-relaxed relative z-10">
                        يرجى فتح الواجب لرؤية التعليمات التفصيلية للحل والتقييم...
                      </p>

                      <div className="grid grid-cols-2 gap-3 sm:gap-4 relative z-10">
                        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-bold text-slate-300 bg-[#02040a]/60 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/5 shadow-inner group-hover:border-indigo-500/20 transition-colors">
                          <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20"><BookOpen className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-400" /></div>
                          <span className="truncate">{assignment.subject_name}</span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-bold text-slate-300 bg-[#02040a]/60 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/5 shadow-inner group-hover:border-emerald-500/20 transition-colors">
                          <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20"><Users className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-400" /></div>
                          <span>{assignment.submission_count || 0} تسليم</span>
                        </div>
                      </div>
                    </div>

                    <div className={`px-6 sm:px-8 py-4 sm:py-5 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors ${overdue && assignment.status === 'published' ? 'bg-rose-950/40' : 'bg-[#02040a]/40 group-hover:bg-[#02040a]/80'}`}>
                      <div className={`flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-black ${overdue && assignment.status === 'published' ? 'text-rose-400 drop-shadow-sm' : 'text-slate-400'}`}>
                        <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span dir="ltr">{format(dueDateObj, 'yyyy/MM/dd HH:mm')}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto relative z-10">
                        {assignment.file_url && (
                          <a 
                            href={assignment.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="h-9 sm:h-11 px-3 sm:px-4 rounded-lg sm:rounded-xl bg-[#0f1423] text-[10px] sm:text-xs font-black text-indigo-400 shadow-inner border border-indigo-500/20 hover:bg-indigo-500/20 transition-all flex items-center gap-1.5 sm:gap-2 active:scale-95 flex-1 sm:flex-none justify-center"
                          >
                            <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span>المرفق</span>
                          </a>
                        )}
                        <Link 
                          href={`/assignments/${assignment.id}`}
                          className="h-9 sm:h-11 px-4 sm:px-6 rounded-lg sm:rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 text-xs sm:text-sm font-black shadow-[0_0_15px_rgba(79,70,229,0.4)] border border-indigo-400/50 transition-all flex items-center gap-1.5 sm:gap-2 active:scale-95 flex-1 sm:flex-none justify-center"
                        >
                          <span>النتائج</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              } 
              
              // 👨‍🎓 واجهة الطالب الفخمة
              else {
                const statusStr = String((studentSubmissions[assignment.id] as any)?.status || '');
                const isStudentDone = ['submitted', 'graded'].includes(statusStr);
                const overdue = isOverdue(assignment.due_date!);
                const dueDateObj = new Date(assignment.due_date!);
                
                return (
                  <div key={assignment.id} className="w-full glass-panel rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-6 border border-white/5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6 group hover:border-indigo-500/40 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all relative overflow-hidden bg-[#0f1423]/40">
                     <div className={`absolute top-0 right-0 w-24 sm:w-32 h-full opacity-10 pointer-events-none transition-all duration-700 blur-3xl ${isStudentDone ? 'bg-emerald-500 group-hover:scale-[2]' : overdue ? 'bg-rose-500 group-hover:scale-[2]' : 'bg-indigo-500 group-hover:scale-[2]'}`}></div>

                     <div className="flex items-center gap-4 sm:gap-5 w-full md:w-auto relative z-10">
                        <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl shrink-0 border transition-all shadow-inner ${
                          isStudentDone 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-slate-950' 
                            : overdue
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 group-hover:bg-rose-500 group-hover:text-white'
                              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white'
                        }`}>
                          <FileText className="h-6 w-6 sm:h-8 sm:w-8 drop-shadow-sm" />
                        </div>
                        <div className="text-right min-w-0 pr-1">
                          <h3 className="text-lg sm:text-xl font-black text-white mb-1.5 sm:mb-2 group-hover:text-indigo-400 transition-colors leading-tight line-clamp-1 drop-shadow-sm">{assignment.title}</h3>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm font-bold text-slate-400">
                            <span className="flex items-center gap-1 sm:gap-1.5 bg-[#02040a]/80 px-2 sm:px-2.5 py-1 rounded-md sm:rounded-lg border border-white/5 shadow-inner"><BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5"/> {assignment.subject_name}</span>
                            <span className={`flex items-center gap-1 sm:gap-1.5 ${overdue && !isStudentDone ? 'text-rose-400 animate-pulse drop-shadow-sm' : ''}`}>
                              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5"/> 
                              <span dir="ltr">{format(dueDateObj, 'yyyy/MM/dd HH:mm')}</span>
                            </span>
                          </div>
                        </div>
                     </div>
                     
                     <div className="flex flex-col md:flex-row items-center gap-3 sm:gap-4 w-full md:w-auto justify-end border-t md:border-0 border-white/5 pt-4 md:pt-0 mt-2 md:mt-0 relative z-10">
                        {isStudentDone ? (
                          <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest border shadow-inner w-full md:w-auto text-center ${statusStr === 'graded' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                            {statusStr === 'graded' ? 'تم التقييم' : 'قيد المراجعة'}
                          </div>
                        ) : (
                          <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest border shadow-inner w-full md:w-auto text-center ${overdue ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                            {overdue ? 'متأخر' : 'مطلوب حله'}
                          </div>
                        )}
                        
                        <Link href={`/assignments/${assignment.id}`} className="w-full md:w-auto">
                          <button className={`w-full md:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black shadow-md transition-all flex items-center justify-center gap-1.5 sm:gap-2 active:scale-95 ${
                            isStudentDone 
                              ? 'bg-[#02040a]/80 border border-white/5 text-white hover:bg-emerald-500 hover:text-slate-950 hover:border-emerald-400 shadow-inner' 
                              : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:opacity-90 shadow-[0_0_15px_rgba(59,130,246,0.4)] border border-indigo-400/50'
                          }`}>
                              {isStudentDone ? <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                              {isStudentDone ? 'عرض النتيجة' : 'فتح الواجب'}
                          </button>
                        </Link>
                     </div>
                  </div>
                );
              }
            })}
          </div>
        )}

        {/* 🚀 Delete Confirmation Modal (Royal Theme) */}
        <Dialog.Root open={!!assignmentToDelete} onOpenChange={(open) => !open && setAssignmentToDelete(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/80 backdrop-blur-md z-40 animate-in fade-in duration-300" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[90%] sm:w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[2.5rem] bg-[#0f1423] border border-rose-500/20 p-6 sm:p-8 shadow-[0_20px_60px_rgba(225,29,72,0.2)] focus:outline-none animate-in zoom-in-95 duration-300" dir="rtl">
              <div className="h-14 w-14 sm:h-16 sm:w-16 bg-rose-500/10 border border-rose-500/30 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-5 sm:mb-6 shadow-inner mx-auto sm:mx-0">
                <Trash2 className="h-6 w-6 sm:h-8 sm:w-8 text-rose-400 drop-shadow-md" />
              </div>
              <Dialog.Title className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight text-center sm:text-right drop-shadow-sm">
                تأكيد الحذف
              </Dialog.Title>
              <p className="text-slate-400 font-bold mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base text-center sm:text-right px-2 sm:px-0">هل أنت متأكد من رغبتك في حذف هذا الواجب؟ سيتم مسح صور و إجابات الطلاب المرتبطة به نهائياً ولا يمكن التراجع.</p>
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <Dialog.Close asChild>
                  <button className="flex-1 rounded-xl sm:rounded-2xl bg-[#02040a]/80 border border-white/5 px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-slate-300 hover:bg-white/5 transition-all active:scale-95 shadow-inner">
                    إلغاء
                  </button>
                </Dialog.Close>
                <button
                  onClick={handleDeleteAssignment}
                  disabled={loading}
                  className="flex-1 rounded-xl sm:rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 border border-rose-400/50 px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-white shadow-[0_0_20px_rgba(225,29,72,0.4)] hover:from-rose-500 hover:to-red-500 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto"/> : 'تأكيد الحذف'}
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* 🚀 Add/Edit Assignment Full Modal (Royal Theme) */}
        <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
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
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-inner flex items-center justify-center shrink-0">
                    <FileText className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-400 drop-shadow-md" />
                  </div>
                  <div>
                    <Dialog.Title className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-sm">
                      {currentAssignment.id ? 'تعديل الواجب' : 'إضافة واجب جديد'}
                    </Dialog.Title>
                    <p className="text-xs sm:text-sm text-slate-400 font-bold mt-1">أدخل تفاصيل الواجب، ويمكنك إرفاق صورة وبناء الأسئلة أدناه</p>
                  </div>
                </div>
                <Dialog.Close className="absolute sm:relative top-5 left-5 sm:top-auto sm:left-auto h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-lg sm:rounded-xl bg-[#02040a] border border-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors shadow-inner active:scale-90">
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </Dialog.Close>
              </div>
              
              <form onSubmit={handleSaveAssignment} className="space-y-6 sm:space-y-10">
                <div className="space-y-6 sm:space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                    {/* Left Column Form */}
                    <div className="space-y-5 sm:space-y-6">
                      <div className="glass-panel p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border-white/5 shadow-inner">
                        <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">حالة الواجب <span className="text-rose-500">*</span></label>
                        <select 
                          required
                          className="block w-full rounded-xl sm:rounded-2xl border-0 py-3.5 sm:py-4 px-4 sm:px-5 text-white bg-[#02040a]/60 focus:bg-[#02040a] ring-1 ring-inset ring-white/5 focus:ring-2 focus:ring-indigo-500/50 text-xs sm:text-sm transition-all font-bold appearance-none cursor-pointer shadow-inner [&>option]:bg-[#0f1423]"
                          value={currentAssignment.status || 'draft'}
                          onChange={(e) => setCurrentAssignment({...currentAssignment, status: e.target.value})}
                        >
                          <option value="draft">مسودة (احتفاظ مؤقت، لا يظهر للطلاب)</option>
                          <option value="published">منشور (يظهر للطلاب فوراً)</option>
                        </select>
                      </div>
                    
                      <div className="glass-panel p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border-white/5 shadow-inner">
                        <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">عنوان الواجب <span className="text-rose-500">*</span></label>
                        <input 
                          type="text" 
                          required
                          placeholder="مثال: حل مسائل الفيزياء صفحة 40" 
                          className="block w-full rounded-xl sm:rounded-2xl border-0 py-3.5 sm:py-4 px-4 sm:px-5 text-white bg-[#02040a]/60 focus:bg-[#02040a] ring-1 ring-inset ring-white/5 focus:ring-2 focus:ring-indigo-500/50 text-xs sm:text-sm transition-all font-bold shadow-inner placeholder:text-slate-600 outline-none"
                          value={currentAssignment.title || ''}
                          onChange={(e) => setCurrentAssignment({...currentAssignment, title: e.target.value})}
                        />
                      </div>
                    
                      <div className="glass-panel p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border-white/5 shadow-inner">
                        <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">الوصف والتعليمات التفصيلية</label>
                        <div className="bg-[#02040a]/40 p-2 rounded-xl sm:rounded-2xl border border-white/5 shadow-inner">
                          <ForumEditor 
                            content={currentAssignment.description || ''}
                            setContent={(content) => setCurrentAssignment({...currentAssignment, description: content})}
                            canUploadImage={true}
                            placeholder="اكتب تعليمات الواجب (مثال: قم بحل المسألة المرفقة وصور الحل...)"
                          />
                        </div>
                      </div>

                      <div className={`grid grid-cols-1 gap-4 sm:gap-6 ${currentRole === 'admin' || currentRole === 'management' ? 'sm:grid-cols-2' : 'sm:grid-cols-2'}`}>
                        <div className="glass-panel p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border-white/5 shadow-inner">
                          <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">المادة <span className="text-rose-500">*</span></label>
                          <select 
                            required
                            className="block w-full rounded-xl sm:rounded-2xl border-0 py-3.5 sm:py-4 px-4 sm:px-5 text-white bg-[#02040a]/60 focus:bg-[#02040a] ring-1 ring-inset ring-white/5 focus:ring-2 focus:ring-indigo-500/50 text-xs sm:text-sm transition-all font-bold appearance-none cursor-pointer shadow-inner [&>option]:bg-[#0f1423]"
                            value={currentAssignment.subject_id || ''}
                            onChange={(e) => setCurrentAssignment({...currentAssignment, subject_id: e.target.value})}
                          >
                            <option value="">اختر المادة...</option>
                            {subjects.map((s: any) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="glass-panel p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border-white/5 shadow-inner">
                          <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">تاريخ التسليم <span className="text-rose-500">*</span></label>
                          <input 
                            type="datetime-local" 
                            required
                            className="block w-full rounded-xl sm:rounded-2xl border-0 py-3.5 sm:py-4 px-3 sm:px-4 text-white bg-[#02040a]/60 focus:bg-[#02040a] ring-1 ring-inset ring-white/5 focus:ring-2 focus:ring-indigo-500/50 text-[10px] sm:text-xs transition-all font-bold text-left shadow-inner outline-none"
                            dir="ltr"
                            style={{ colorScheme: 'dark' }}
                            value={currentAssignment.due_date || ''}
                            onChange={(e) => setCurrentAssignment({...currentAssignment, due_date: e.target.value})}
                          />
                        </div>
                        
                        {(currentRole === 'admin' || currentRole === 'management') && (
                          <div className="glass-panel p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border-white/5 shadow-inner sm:col-span-2">
                            <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">المعلم المسؤول <span className="text-rose-500">*</span></label>
                            <select 
                              required
                              className="block w-full rounded-xl sm:rounded-2xl border-0 py-3.5 sm:py-4 px-4 sm:px-5 text-white bg-[#02040a]/60 focus:bg-[#02040a] ring-1 ring-inset ring-white/5 focus:ring-2 focus:ring-indigo-500/50 text-xs sm:text-sm transition-all font-bold appearance-none cursor-pointer shadow-inner [&>option]:bg-[#0f1423]"
                              value={currentAssignment.teacher_id || ''}
                              onChange={(e) => setCurrentAssignment({...currentAssignment, teacher_id: e.target.value})}
                            >
                              <option value="">اختر المعلم...</option>
                              {teachers.map((t: any) => (
                                <option key={t.id} value={t.id}>{t.user?.full_name || 'معلم'}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="glass-panel p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border-white/5 shadow-inner">
                        <label className="flex items-center gap-2 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                          <Users className="w-4 h-4 text-indigo-400" />
                          الشعب المستهدفة <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 max-h-52 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                          {sections.map((s: any) => {
                            const classObj = s.classes || s.class;
                            const cName = Array.isArray(classObj) ? classObj[0]?.name : classObj?.name;
                            return (
                              <label key={s.id} className={`flex items-center gap-2 sm:gap-3 cursor-pointer group p-2.5 sm:p-3 rounded-xl border transition-all shadow-inner ${currentAssignment.section_ids?.includes(s.id) ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-[#02040a]/60 border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-300'}`}>
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={currentAssignment.section_ids?.includes(s.id)}
                                  onChange={(e) => {
                                    const newSectionIds = e.target.checked
                                      ? [...(currentAssignment.section_ids || []), s.id]
                                      : (currentAssignment.section_ids || []).filter((id: string) => id !== s.id);
                                    setCurrentAssignment({...currentAssignment, section_ids: newSectionIds});
                                  }}
                                />
                                <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-[0.4rem] border flex items-center justify-center shrink-0 transition-colors shadow-inner ${currentAssignment.section_ids?.includes(s.id) ? 'bg-indigo-500 border-indigo-400' : 'border-slate-600 bg-[#02040a]'}`}>
                                   {currentAssignment.section_ids?.includes(s.id) && <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-900" />}
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
                          <ImageIcon className="w-4 h-4 text-indigo-400" />
                          إرفاق مسألة أو صورة (اختياري)
                        </label>
                        <div className="bg-[#02040a]/60 rounded-xl sm:rounded-2xl p-1.5 sm:p-2 border border-white/5 shadow-inner">
                          <ImageUpload
                            initialImageUrl={currentAssignment.file_url}
                            onUploadSuccess={(url) => setCurrentAssignment({...currentAssignment, file_url: url})}
                            label="ارفع صورة أو ملف للواجب"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Question Builder */}
                    <div className="bg-[#02040a]/40 rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-6 lg:p-8 border border-white/5 shadow-inner relative overflow-hidden h-fit">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none"></div>
                      <div className="flex items-center gap-2 sm:gap-3 mb-5 sm:mb-6 relative z-10">
                        <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg sm:rounded-xl shadow-inner shrink-0">
                           <Layout className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-400 drop-shadow-sm" />
                        </div>
                        <h4 className="text-base sm:text-lg font-black text-white drop-shadow-sm">بناء الأسئلة التفاعلية للواجب</h4>
                      </div>
                      <div className="relative z-10">
                        <AssignmentBuilder questions={questions} onChange={setQuestions} />
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
                    disabled={isSubmitting}
                    className="w-full sm:w-auto rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 border border-indigo-400/50 px-6 sm:px-10 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:from-indigo-500 hover:to-blue-500 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <><div className="h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> جاري الحفظ...</>
                    ) : (
                      <><CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> {currentAssignment.status === 'draft' ? 'حفظ كمسودة' : 'حفظ ونشر الواجب'}</>
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
        `}} />
      </div>
    </div>
  );
}
