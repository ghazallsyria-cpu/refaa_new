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

const getStatusColor = (status: string) => {
  switch (status) {
    case 'published': return 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm';
    case 'draft': return 'bg-amber-50 text-amber-600 border-amber-200 shadow-sm';
    case 'archived': return 'bg-slate-100 text-slate-500 border-slate-200 shadow-sm';
    default: return 'bg-slate-100 text-slate-500 border-slate-200 shadow-sm';
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
  
  // 🚀 فلاتر التصنيف الجديدة
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [taskStateFilter, setTaskStateFilter] = useState('all');

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

  const isOverdue = (dueDateStr: string) => new Date(dueDateStr) < new Date();

  // 🚀 محرك الفلترة والتصنيف الذكي
  const filteredAssignments = assignments.filter(a => {
    if(!a) return false;
    
    const matchTitle = a.title?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const matchSubjectSearch = a.subject_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchSubjectDropdown = subjectFilter === 'all' || a.subject_id === subjectFilter;
    
    let matchTaskState = true;
    const overdue = isOverdue(a.due_date!);
    
    if (currentRole === 'student') {
      const subStatus = String((studentSubmissions[a.id] as any)?.status || '');
      const isDone = ['submitted', 'graded'].includes(subStatus);
      
      if (taskStateFilter === 'completed') matchTaskState = isDone;
      else if (taskStateFilter === 'overdue') matchTaskState = !isDone && overdue;
      else if (taskStateFilter === 'active') matchTaskState = !isDone && !overdue;
    } else {
      if (taskStateFilter === 'overdue') matchTaskState = overdue;
      else if (taskStateFilter === 'active') matchTaskState = !overdue;
    }

    return (matchTitle || matchSubjectSearch) && matchStatus && matchSubjectDropdown && matchTaskState;
  });

  const displayedAssignments = (currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'management') 
    ? filteredAssignments 
    : filteredAssignments.filter(e => e?.status === 'published');

  // 🚀 تجميع الواجبات المفلترة حسب المادة لتكوين أقسام بصرية
  const groupedAssignments = displayedAssignments.reduce((acc, curr) => {
    const subj = curr.subject_name || 'مواد عامة';
    if (!acc[subj]) acc[subj] = [];
    acc[subj].push(curr);
    return acc;
  }, {} as Record<string, any[]>);

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!currentAssignment.subject_id) { showNotification('error', 'عذراً، يجب اختيار المادة الدراسية'); return; }
    if (!currentAssignment.section_ids || currentAssignment.section_ids.length === 0) { showNotification('error', 'عذراً، يجب تحديد شعبة واحدة على الأقل لإرسال الواجب إليها'); return; }

    const isEdit = !!currentAssignment.id;

    let finalTeacherId = currentAssignment.teacher_id;
    if (finalTeacherId && typeof finalTeacherId === 'object') { finalTeacherId = finalTeacherId.id || finalTeacherId.auth_id; }
    if (!finalTeacherId && currentAssignment.teacher && typeof currentAssignment.teacher === 'object') { finalTeacherId = currentAssignment.teacher.id; }
    if (!finalTeacherId && currentRole === 'teacher') { finalTeacherId = user.id; }

    if ((currentRole === 'admin' || currentRole === 'management') && !finalTeacherId) { showNotification('error', 'عذراً، يجب اختيار المعلم المسؤول عن الواجب'); return; }

    const payload: any = {
      title: currentAssignment.title, description: currentAssignment.description,
      subject_id: currentAssignment.subject_id, due_date: currentAssignment.due_date,
      file_url: currentAssignment.file_url, status: currentAssignment.status || 'draft',
      teacher_id: finalTeacherId 
    };

    setIsSubmitting(true);
    try {
      await saveAssignment(payload, currentAssignment.id || null, questions, currentAssignment.section_ids, subjects);
      showNotification('success', isEdit ? 'تم تحديث الواجب بنجاح' : 'تم إضافة الواجب بنجاح');
      setIsModalOpen(false);
      if (refresh) refresh();
    } catch (error: any) {
      showNotification('error', error.message || 'حدث خطأ أثناء حفظ الواجب');
    } finally { setIsSubmitting(false); }
  };

  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    setLoading(true);
    try {
      const assignment = assignments.find(a => a.id === assignmentToDelete);
      if (assignment?.file_url) { try { await deleteFromCloudinary(assignment.file_url); } catch (e) { } }

      const { data: subs } = await supabase.from('assignment_submissions').select('file_url').eq('assignment_id', assignmentToDelete);
      if (subs && subs.length > 0) {
        for (const sub of subs) { if (sub.file_url) { try { await deleteFromCloudinary(sub.file_url); } catch (e) { } } }
      }

      await deleteAssignment(assignmentToDelete);
      showNotification('success', 'تم حذف الواجب وجميع مرفقاته بنجاح');
      setAssignmentToDelete(null);
      if (refresh) refresh();
    } catch (error: any) { showNotification('error', error.message || 'حدث خطأ أثناء حذف الواجب'); } 
    finally { setLoading(false); }
  };

  const openFullEditModal = async (assignment: any) => {
    setEditingAssignment(assignment);
    const dateObj = new Date(assignment.due_date);
    const formattedDate = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    
    let pureTeacherId = assignment.teacher_id;
    if (pureTeacherId && typeof pureTeacherId === 'object') { pureTeacherId = pureTeacherId.id || pureTeacherId.auth_id; }
    if (!pureTeacherId && assignment.teacher && typeof assignment.teacher === 'object') { pureTeacherId = assignment.teacher.id; }

    setCurrentAssignment({
      ...assignment, due_date: formattedDate, teacher_id: pureTeacherId, 
      section_ids: assignment.assignment_sections?.map((as: any) => as.section_id) || assignment.section_ids || []
    });
    const qData = await fetchAssignmentQuestions(assignment.id);
    setQuestions(qData);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingAssignment(null);
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(8, 0, 0, 0);
    const formattedDate = new Date(tomorrow.getTime() - (tomorrow.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    setCurrentAssignment({
      title: '', description: '', subject_id: subjects[0]?.id || '',
      teacher_id: currentRole === 'teacher' ? user?.id : '', 
      due_date: formattedDate, section_ids: [], file_url: '', status: 'draft'
    });
    setQuestions([]);
    setIsModalOpen(true);
  };

  if (!mounted || authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 font-cairo">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
             <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600 shadow-sm"></div>
             <ShieldAlert className="absolute h-8 w-8 text-indigo-600 animate-pulse" />
          </div>
          <p className="text-indigo-600 font-black animate-pulse tracking-widest">جاري التحقق من الهوية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-cairo overflow-x-hidden relative pb-32 pt-6" dir="rtl">
      
      <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <AnimatePresence>
          {notification && (
            <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-[100] px-6 sm:px-8 py-3 sm:py-4 rounded-2xl sm:rounded-3xl shadow-xl flex items-center gap-3 sm:gap-4 transition-all bg-white border w-[90%] sm:w-auto ${
              notification.type === 'success' ? 'text-emerald-700 border-emerald-200' : 'text-rose-700 border-rose-200'
            }`}>
              <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${notification.type === 'success' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                {notification.type === 'success' ? <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" /> : <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-rose-600" />}
              </div>
              <div className="font-black tracking-tight text-sm sm:text-base leading-snug">{notification.message}</div>
              <button onClick={() => setNotification(null)} className="p-1 sm:p-1.5 hover:bg-slate-100 rounded-lg transition-colors mr-2 sm:mr-4 text-slate-400 shrink-0 active:scale-90">
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-6 sm:p-8 lg:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="relative z-10 space-y-3 sm:space-y-4 text-center md:text-right w-full md:w-auto">
            <div className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] sm:text-xs font-black text-indigo-700 uppercase tracking-widest mx-auto md:mx-0">
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> مركز الواجبات
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">الواجبات المدرسية</h1>
            <p className="text-sm sm:text-base text-slate-500 font-bold max-w-md mx-auto md:mx-0">إدارة ومتابعة الواجبات والمهام المسندة للطلاب عبر المنصة الرقمية</p>
          </div>
          {(currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'management') && (
            <button 
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl bg-indigo-600 px-6 sm:px-8 py-3.5 sm:py-4 text-sm font-black text-white shadow-md hover:bg-indigo-700 transition-all active:scale-95 border border-indigo-500 relative z-10 w-full md:w-auto"
            >
              <Plus className="h-5 w-5" /> إضافة واجب جديد
            </button>
          )}
        </div>

        {/* 🚀 فلاتر التصنيف الشاملة الجديدة */}
        <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 flex-wrap">
            {/* بحث */}
            <div className="relative flex-1 group min-w-[200px]">
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                className="block w-full rounded-xl border border-slate-200 py-3.5 pr-10 pl-4 text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-bold outline-none placeholder:text-slate-400"
                placeholder="البحث بعنوان الواجب أو المادة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* فلتر المادة */}
            <div className="relative md:w-48 group">
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                <BookOpen className="h-4 w-4" />
              </div>
              <select
                className="block w-full rounded-xl border border-slate-200 py-3.5 pr-10 pl-4 text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-bold appearance-none outline-none cursor-pointer"
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
              >
                <option value="all">جميع المواد</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* فلتر حالة الواجب (ديناميكي حسب الصلاحية) */}
            <div className="relative md:w-56 group">
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                <Filter className="h-4 w-4" />
              </div>
              {currentRole === 'student' ? (
                <select
                  className="block w-full rounded-xl border border-slate-200 py-3.5 pr-10 pl-4 text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-bold appearance-none outline-none cursor-pointer"
                  value={taskStateFilter}
                  onChange={(e) => setTaskStateFilter(e.target.value)}
                >
                  <option value="all">حالة الحل (الكل)</option>
                  <option value="active">مطلوب حله (ساري)</option>
                  <option value="completed">تم الحل / مقيّم</option>
                  <option value="overdue">متأخر (لم يتم الحل)</option>
                </select>
              ) : (
                <select
                  className="block w-full rounded-xl border border-slate-200 py-3.5 pr-10 pl-4 text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-bold appearance-none outline-none cursor-pointer"
                  value={taskStateFilter}
                  onChange={(e) => setTaskStateFilter(e.target.value)}
                >
                  <option value="all">زمن الواجب (الكل)</option>
                  <option value="active">ساري (وقت مفتوح)</option>
                  <option value="overdue">منتهي الوقت</option>
                </select>
              )}
            </div>
            
            {/* فلتر حالة النشر للمعلمين */}
            {(currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'management') && (
              <div className="relative md:w-48 group">
                <select
                  className="block w-full rounded-xl border border-slate-200 py-3.5 px-4 text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-bold appearance-none outline-none cursor-pointer"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">حالة النشر (الكل)</option>
                  <option value="published">المنشورة فقط</option>
                  <option value="draft">المسودات فقط</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* 🚀 المحتوى (الواجبات مجسدة حسب المواد) */}
        {contentLoading && assignments.length === 0 ? (
          <div className="flex flex-col justify-center items-center py-20 sm:py-32 gap-5 relative z-10">
            <Loader2 className="animate-spin h-14 w-14 sm:h-16 sm:w-16 text-indigo-600" />
            <p className="text-slate-500 font-black animate-pulse tracking-widest text-sm sm:text-base">جاري تحميل الواجبات...</p>
          </div>
        ) : Object.keys(groupedAssignments).length === 0 ? (
          <div className="text-center py-20 sm:py-32 bg-white rounded-[2rem] sm:rounded-[3rem] border border-dashed border-slate-300 px-4">
            <div className="h-20 w-20 sm:h-24 sm:w-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 border border-slate-200">
              <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-slate-400" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mb-2">لا توجد واجبات مطابقة للفرز</h3>
            <p className="text-slate-500 font-bold text-xs sm:text-sm max-w-xs mx-auto">
               لا يوجد واجبات تتطابق مع بحثك أو الفلاتر المحددة حالياً.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(groupedAssignments).map(([subjectName, subjAssigns]) => (
              <div key={subjectName} className="space-y-6">
                {/* ترويسة المادة */}
                <div className="flex items-center gap-3 border-b-2 border-indigo-100 pb-3 mb-6">
                  <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 shadow-sm">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-800">{subjectName}</h2>
                  <span className="bg-white border border-slate-200 text-slate-500 shadow-sm text-xs font-black px-3 py-1 rounded-full mr-2">{subjAssigns.length} واجبات</span>
                </div>
                
                {/* كروت الواجبات التابعة للمادة */}
                <div className={currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'management' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8" : "flex flex-col gap-5 sm:gap-6"}>
                  {subjAssigns.map((assignment) => {
                    if (currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'management') {
                      const pendingGradesCount = (assignment.submission_count || 0) - (assignment.graded_count || 0);
                      const needsTeacherGrading = pendingGradesCount > 0;
                      const overdue = isOverdue(assignment.due_date!);
                      const dueDateObj = new Date(assignment.due_date!);
                      
                      let checkTeacherId = assignment.teacher_id;
                      if (checkTeacherId && typeof checkTeacherId === 'object') checkTeacherId = (checkTeacherId as any).id || (checkTeacherId as any).auth_id;
                      const canEdit = currentRole === 'admin' || currentRole === 'management' || checkTeacherId === user?.id;

                      return (
                        <div key={assignment.id} className="group bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all overflow-hidden flex flex-col">
                          <div className="p-6 sm:p-8 flex-1 relative">
                            <div className="flex items-start justify-between mb-6 sm:mb-8 gap-2 relative z-10">
                              <div className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest border whitespace-nowrap ${getStatusColor(assignment.status)}`}>
                                {getStatusLabel(assignment.status)}
                              </div>

                              {needsTeacherGrading && (
                                <div className="flex-1 flex justify-end">
                                  <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black border bg-amber-50 text-amber-600 border-amber-200 flex items-center gap-1 sm:gap-1.5 animate-pulse">
                                    <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    <span>{pendingGradesCount} للتقييم</span>
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex gap-1.5 sm:gap-2 relative z-10">
                                <Link 
                                   href={`/assignments/${assignment.id}`}
                                   className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all bg-slate-50 border border-slate-200 active:scale-95"
                                   title="عرض التفاصيل"
                                >
                                  <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                                </Link>
                                {canEdit && (
                                  <button 
                                    onClick={() => openFullEditModal(assignment)}
                                    className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all bg-slate-50 border border-slate-200 active:scale-95"
                                    title="تعديل الواجب بالكامل"
                                  >
                                    <Edit2 className="h-4 w-4 sm:h-5 sm:w-5" />
                                  </button>
                                )}
                                {canEdit && (
                                  <button 
                                    onClick={() => setAssignmentToDelete(assignment.id)}
                                    className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all bg-slate-50 border border-slate-200 active:scale-95"
                                    title="حذف الواجب"
                                  >
                                    <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-3 sm:mb-4 group-hover:text-indigo-600 transition-colors tracking-tight leading-tight line-clamp-2">
                              {assignment.title}
                            </h3>
                            
                            <p className="text-slate-500 font-bold line-clamp-2 mb-6 sm:mb-8 text-xs sm:text-sm leading-relaxed">
                              يرجى فتح الواجب لرؤية التعليمات التفصيلية للحل والتقييم...
                            </p>

                            <div className="grid grid-cols-2 gap-3 sm:gap-4 relative z-10">
                              <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-bold text-slate-600 bg-slate-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 group-hover:border-indigo-200 transition-colors">
                                <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 border border-indigo-200"><BookOpen className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-600" /></div>
                                <span className="truncate">{assignment.subject_name}</span>
                              </div>
                              <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-bold text-slate-600 bg-slate-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 group-hover:border-emerald-200 transition-colors">
                                <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 border border-emerald-200"><Users className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600" /></div>
                                <span>{assignment.submission_count || 0} تسليم</span>
                              </div>
                            </div>
                          </div>

                          <div className={`px-6 sm:px-8 py-4 sm:py-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors ${overdue && assignment.status === 'published' ? 'bg-rose-50/50' : 'bg-slate-50 group-hover:bg-slate-100/50'}`}>
                            <div className={`flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-black ${overdue && assignment.status === 'published' ? 'text-rose-600' : 'text-slate-500'}`}>
                              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                              <span dir="ltr">{format(dueDateObj, 'yyyy/MM/dd HH:mm')}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto relative z-10">
                              {assignment.file_url && (
                                <a 
                                  href={assignment.file_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="h-9 sm:h-11 px-3 sm:px-4 rounded-lg sm:rounded-xl bg-white text-[10px] sm:text-xs font-black text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition-all flex items-center gap-1.5 sm:gap-2 active:scale-95 flex-1 sm:flex-none justify-center"
                                >
                                  <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  <span>المرفق</span>
                                </a>
                              )}
                              <Link 
                                href={`/assignments/${assignment.id}`}
                                className="h-9 sm:h-11 px-4 sm:px-6 rounded-lg sm:rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs sm:text-sm font-black border border-indigo-500 transition-all flex items-center gap-1.5 sm:gap-2 active:scale-95 flex-1 sm:flex-none justify-center"
                              >
                                <span>النتائج</span>
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    } 
                    
                    // 👨‍🎓 واجهة الطالب
                    else {
                      const statusStr = String((studentSubmissions[assignment.id] as any)?.status || '');
                      const isStudentDone = ['submitted', 'graded'].includes(statusStr);
                      const overdue = isOverdue(assignment.due_date!);
                      const dueDateObj = new Date(assignment.due_date!);
                      
                      return (
                        <div key={assignment.id} className="w-full bg-white rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6 group hover:border-indigo-300 hover:shadow-md transition-all relative overflow-hidden">

                           <div className="flex items-center gap-4 sm:gap-5 w-full md:w-auto relative z-10">
                              <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl shrink-0 border transition-all ${
                                isStudentDone 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200 group-hover:bg-emerald-100' 
                                  : overdue
                                    ? 'bg-rose-50 text-rose-600 border-rose-200 group-hover:bg-rose-100'
                                    : 'bg-indigo-50 text-indigo-600 border-indigo-200 group-hover:bg-indigo-100'
                              }`}>
                                <FileText className="h-6 w-6 sm:h-8 sm:w-8" />
                              </div>
                              <div className="text-right min-w-0 pr-1">
                                <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-1.5 sm:mb-2 group-hover:text-indigo-600 transition-colors leading-tight line-clamp-1">{assignment.title}</h3>
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm font-bold text-slate-500">
                                  <span className="flex items-center gap-1 sm:gap-1.5 bg-slate-50 px-2 sm:px-2.5 py-1 rounded-md sm:rounded-lg border border-slate-200"><BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5"/> {assignment.subject_name}</span>
                                  <span className={`flex items-center gap-1 sm:gap-1.5 ${overdue && !isStudentDone ? 'text-rose-600' : ''}`}>
                                    <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5"/> 
                                    <span dir="ltr">{format(dueDateObj, 'yyyy/MM/dd HH:mm')}</span>
                                  </span>
                                </div>
                              </div>
                           </div>
                           
                           <div className="flex flex-col md:flex-row items-center gap-3 sm:gap-4 w-full md:w-auto justify-end border-t md:border-0 border-slate-100 pt-4 md:pt-0 mt-2 md:mt-0 relative z-10">
                              {isStudentDone ? (
                                <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest border w-full md:w-auto text-center ${statusStr === 'graded' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                  {statusStr === 'graded' ? 'تم التقييم' : 'تم الحل (قيد المراجعة)'}
                                </div>
                              ) : (
                                <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest border w-full md:w-auto text-center ${overdue ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                                  {overdue ? 'متأخر' : 'مطلوب حله'}
                                </div>
                              )}
                              
                              <Link href={`/assignments/${assignment.id}`} className="w-full md:w-auto">
                                <button className={`w-full md:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 sm:gap-2 active:scale-95 ${
                                  isStudentDone 
                                    ? 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600' 
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-500'
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
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <Dialog.Root open={!!assignmentToDelete} onOpenChange={(open) => !open && setAssignmentToDelete(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 animate-in fade-in duration-300" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[90%] sm:w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[2.5rem] bg-white border border-slate-200 p-6 sm:p-8 shadow-2xl focus:outline-none animate-in zoom-in-95 duration-300" dir="rtl">
              <div className="h-14 w-14 sm:h-16 sm:w-16 bg-rose-50 border border-rose-200 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-5 sm:mb-6 mx-auto sm:mx-0">
                <Trash2 className="h-6 w-6 sm:h-8 sm:w-8 text-rose-600" />
              </div>
              <Dialog.Title className="text-xl sm:text-2xl font-black text-slate-900 mb-2 tracking-tight text-center sm:text-right">
                تأكيد الحذف
              </Dialog.Title>
              <p className="text-slate-500 font-bold mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base text-center sm:text-right px-2 sm:px-0">هل أنت متأكد من رغبتك في حذف هذا الواجب؟ سيتم مسح صور و إجابات الطلاب المرتبطة به نهائياً ولا يمكن التراجع.</p>
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <Dialog.Close asChild>
                  <button className="flex-1 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-slate-600 hover:bg-slate-100 transition-all active:scale-95">
                    إلغاء
                  </button>
                </Dialog.Close>
                <button
                  onClick={handleDeleteAssignment}
                  disabled={loading}
                  className="flex-1 rounded-xl sm:rounded-2xl bg-rose-600 border border-rose-500 px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-white hover:bg-rose-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto"/> : 'تأكيد الحذف'}
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Add/Edit Assignment Full Modal */}
        <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
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
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                    <FileText className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-600" />
                  </div>
                  <div>
                    <Dialog.Title className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      {currentAssignment.id ? 'تعديل الواجب' : 'إضافة واجب جديد'}
                    </Dialog.Title>
                    <p className="text-xs sm:text-sm text-slate-500 font-bold mt-1">أدخل تفاصيل الواجب، ويمكنك إرفاق صورة وبناء الأسئلة أدناه</p>
                  </div>
                </div>
                <Dialog.Close className="absolute sm:relative top-5 left-5 sm:top-auto sm:left-auto h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors active:scale-90">
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </Dialog.Close>
              </div>
              
              <form onSubmit={handleSaveAssignment} className="space-y-6 sm:space-y-10">
                <div className="space-y-6 sm:space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                    {/* Left Column Form */}
                    <div className="space-y-5 sm:space-y-6">
                      <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-slate-200">
                        <label className="block text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">حالة الواجب <span className="text-rose-500">*</span></label>
                        <select 
                          required
                          className="block w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3.5 sm:py-4 px-4 sm:px-5 text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs sm:text-sm transition-all font-bold appearance-none cursor-pointer outline-none"
                          value={currentAssignment.status || 'draft'}
                          onChange={(e) => setCurrentAssignment({...currentAssignment, status: e.target.value})}
                        >
                          <option value="draft">مسودة (احتفاظ مؤقت، لا يظهر للطلاب)</option>
                          <option value="published">منشور (يظهر للطلاب فوراً)</option>
                        </select>
                      </div>
                    
                      <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-slate-200">
                        <label className="block text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">عنوان الواجب <span className="text-rose-500">*</span></label>
                        <input 
                          type="text" 
                          required
                          placeholder="مثال: حل مسائل الفيزياء صفحة 40" 
                          className="block w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3.5 sm:py-4 px-4 sm:px-5 text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs sm:text-sm transition-all font-bold outline-none placeholder:text-slate-400"
                          value={currentAssignment.title || ''}
                          onChange={(e) => setCurrentAssignment({...currentAssignment, title: e.target.value})}
                        />
                      </div>
                    
                      <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-slate-200 flex flex-col min-h-[300px]">
                        <label className="block text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">الوصف والتعليمات التفصيلية</label>
                        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 flex-1 flex flex-col overflow-visible">
                          <ForumEditor
                            content={currentAssignment.description || ''}
                            setContent={(content: any) => setCurrentAssignment({...currentAssignment, description: content})}
                            canUploadImage={true}
                            placeholder="اكتب تعليمات الواجب (مثال: قم بحل المسألة المرفقة وصور الحل...)"
                          />
                        </div>
                      </div>

                      <div className={`grid grid-cols-1 gap-4 sm:gap-6 ${currentRole === 'admin' || currentRole === 'management' ? 'sm:grid-cols-2' : 'sm:grid-cols-2'}`}>
                        <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-slate-200">
                          <label className="block text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">المادة <span className="text-rose-500">*</span></label>
                          <select 
                            required
                            className="block w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3.5 sm:py-4 px-4 sm:px-5 text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs sm:text-sm transition-all font-bold appearance-none cursor-pointer outline-none"
                            value={currentAssignment.subject_id || ''}
                            onChange={(e) => setCurrentAssignment({...currentAssignment, subject_id: e.target.value})}
                          >
                            <option value="">اختر المادة...</option>
                            {subjects.map((s: any) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-slate-200">
                          <label className="block text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">تاريخ التسليم <span className="text-rose-500">*</span></label>
                          <input 
                            type="datetime-local" 
                            required
                            className="block w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3.5 sm:py-4 px-3 sm:px-4 text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-[10px] sm:text-xs transition-all font-bold text-left outline-none"
                            dir="ltr"
                            value={currentAssignment.due_date || ''}
                            onChange={(e) => setCurrentAssignment({...currentAssignment, due_date: e.target.value})}
                          />
                        </div>
                        
                        {(currentRole === 'admin' || currentRole === 'management') && (
                          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-slate-200 sm:col-span-2">
                            <label className="block text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">المعلم المسؤول <span className="text-rose-500">*</span></label>
                            <select 
                              required={!currentAssignment.id}
                              disabled={!!currentAssignment.id}
                              className={`block w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3.5 sm:py-4 px-4 sm:px-5 text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs sm:text-sm transition-all font-bold appearance-none outline-none ${!!currentAssignment.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                              value={currentAssignment.teacher_id || ''}
                              onChange={(e) => setCurrentAssignment({...currentAssignment, teacher_id: e.target.value})}
                            >
                              <option value="">اختر المعلم...</option>
                              {teachers.map((t: any) => (
                                <option key={t.id} value={t.id}>{t.user?.full_name || 'معلم'}</option>
                              ))}
                            </select>
                            {!!currentAssignment.id && (
                               <p className="text-[10px] text-amber-600 mt-2 font-bold">لا يمكن تغيير المعلم المسؤول بعد إنشاء الواجب حفاظاً على السجلات.</p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-slate-200">
                        <label className="flex items-center gap-2 text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mb-4">
                          <Users className="w-4 h-4 text-indigo-500" />
                          الشعب المستهدفة <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 max-h-52 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                          {sections.map((s: any) => {
                            const classObj = s.classes || s.class;
                            const cName = Array.isArray(classObj) ? classObj[0]?.name : classObj?.name;
                            return (
                              <label key={s.id} className={`flex items-center gap-2 sm:gap-3 cursor-pointer group p-2.5 sm:p-3 rounded-xl border transition-all ${currentAssignment.section_ids?.includes(s.id) ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-200'}`}>
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
                                <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-[0.4rem] border flex items-center justify-center shrink-0 transition-colors ${currentAssignment.section_ids?.includes(s.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                                   {currentAssignment.section_ids?.includes(s.id) && <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />}
                                </div>
                                <span className="text-xs sm:text-sm font-bold truncate">
                                  {cName ? `${cName} - ${s.name}` : s.name}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-slate-200">
                        <label className="flex items-center gap-2 text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mb-3 sm:mb-4">
                          <ImageIcon className="w-4 h-4 text-indigo-500" />
                          إرفاق مسألة أو صورة (اختياري)
                        </label>
                        <div className="bg-white rounded-xl sm:rounded-2xl p-1.5 sm:p-2 border border-slate-200">
                          <ImageUpload
                            initialImageUrl={currentAssignment.file_url}
                            onUploadSuccess={(url) => setCurrentAssignment({...currentAssignment, file_url: url})}
                            label="ارفع صورة أو ملف للواجب"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Question Builder */}
                    <div className="bg-slate-50 rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-6 lg:p-8 border border-slate-200 relative overflow-hidden h-fit">
                      <div className="flex items-center gap-2 sm:gap-3 mb-5 sm:mb-6 relative z-10">
                        <div className="p-2 bg-indigo-100 border border-indigo-200 rounded-lg sm:rounded-xl shrink-0">
                           <Layout className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                        </div>
                        <h4 className="text-base sm:text-lg font-black text-slate-900">بناء الأسئلة التفاعلية للواجب</h4>
                      </div>
                      <div className="relative z-10 dark-theme-override">
                        <AssignmentBuilder questions={questions} onChange={setQuestions} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-6 sm:pt-8 border-t border-slate-200">
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="w-full sm:w-auto rounded-xl sm:rounded-2xl bg-white border border-slate-300 px-6 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
                    >
                      إلغاء الأمر
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto rounded-xl sm:rounded-2xl bg-indigo-600 border border-indigo-600 px-6 sm:px-10 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-white hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
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
          .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 12px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 12px; border: 1px solid #f1f5f9; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
          
          /* تحويل عناصر البناء داخل المودال للثيم المضيء */
          .dark-theme-override .bg-\\[\\#090b14\\]\\/50, .dark-theme-override .bg-\\[\\#131836\\]\\/60, .dark-theme-override .bg-\\[\\#02040a\\]\\/60, .dark-theme-override .bg-\\[\\#0f1423\\]\\/80, .dark-theme-override .bg-\\[\\#061121\\]\\/80, .dark-theme-override .bg-\\[\\#131836\\]\\/40, .dark-theme-override .bg-\\[\\#090b14\\]\\/30 {
             background-color: #ffffff !important;
             border-color: #e2e8f0 !important;
          }
          .dark-theme-override .text-white { color: #0f172a !important; }
          .dark-theme-override .text-slate-400 { color: #64748b !important; }
          .dark-theme-override input, .dark-theme-override select {
             background-color: #f8fafc !important;
             border-color: #e2e8f0 !important;
             color: #0f172a !important;
          }
          .dark-theme-override .bg-\\[\\#0f1423\\] { background-color: #f8fafc !important; }
        `}} />
      </div>
    </div>
  );
}
