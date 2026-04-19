'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, FileText, Calendar, Clock, Link as LinkIcon, X, BookOpen, Users, AlertCircle, Eye, CheckCircle2, Filter, Layout, Image as ImageIcon, Play, Loader2 } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion'; // 🚀 السطر الذي كان مفقوداً وتم إضافته
import AssignmentBuilder from '@/components/assignment-builder';
import ImageUpload from '@/components/ImageUpload';
import ForumEditor from '@/components/ForumEditor';
import { Question } from '@/types/question';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { useAssignmentsSystem } from '@/hooks/useAssignmentsSystem';
import { useSchoolFormData } from '@/hooks/useSchoolFormData';
import { useAuth } from '@/context/auth-context';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'published': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]';
    case 'draft': return 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]';
    case 'archived': return 'bg-slate-800 text-slate-400 border-slate-700 shadow-sm';
    default: return 'bg-slate-800 text-slate-400 border-slate-700 shadow-sm';
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

  const [notification, setNotification] = useState<{type: 'success' | 'message', message: string} | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type: type === 'success' ? 'success' : 'message', message });
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

  if (!mounted || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] bg-[#090b14]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
      </div>
    );
  }

  const isOverdue = (dueDateStr: string) => new Date(dueDateStr) < new Date();

  return (
    <div className="min-h-screen bg-[#090b14] text-slate-200 font-cairo overflow-x-hidden relative" dir="rtl">
      {/* 🚀 الخلفية الزجاجية المضيئة */}
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none z-0" />

      <div className="space-y-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
        
        {/* إشعار النجاح / الخطأ */}
        <AnimatePresence>
          {notification && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-[100] px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 transition-all backdrop-blur-md border ${
              notification.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.3)]' : 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]'
            }`}>
              <div className="h-10 w-10 rounded-2xl bg-[#090b14]/50 flex items-center justify-center border border-white/5">
                {notification.type === 'success' ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
              </div>
              <div className="font-black tracking-tight text-lg text-white">{notification.message}</div>
              <button onClick={() => setNotification(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors mr-4 text-white">
                <X className="h-5 w-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🚀 الهيدر وأدوات التحكم */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-6">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">الواجبات المدرسية</h1>
            <p className="text-base sm:text-lg text-slate-400 font-bold">إدارة الواجبات والمهام المسندة للطلاب</p>
          </div>
          {(currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'management') && (
            <button 
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-4 text-sm font-black text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:opacity-90 transition-all active:scale-95 self-start md:self-end border border-indigo-400/50"
            >
              <Plus className="h-5 w-5" />
              إضافة واجب جديد
            </button>
          )}
        </div>

        {/* 🚀 فلاتر البحث الزجاجية */}
        <div className="bg-[#131836]/60 backdrop-blur-2xl p-6 rounded-[2.5rem] shadow-xl border border-white/10">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="relative flex-1 group">
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                <Search className="h-5 w-5" aria-hidden="true" />
              </div>
              <input
                type="text"
                className="block w-full rounded-2xl border-0 py-4 pr-12 pl-4 text-white bg-[#090b14]/50 ring-1 ring-inset ring-white/10 placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 sm:text-sm transition-all font-bold outline-none shadow-inner"
                placeholder="البحث بعنوان الواجب أو المادة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {(currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'management') && (
              <div className="relative md:w-64 group">
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Filter className="h-5 w-5" />
                </div>
                <select
                  className="block w-full rounded-2xl border-0 py-4 pr-12 pl-4 text-white bg-[#090b14]/50 ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-indigo-500/50 sm:text-sm transition-all font-bold appearance-none outline-none shadow-inner cursor-pointer [&>option]:bg-[#131836]"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">جميع الواجبات</option>
                  <option value="published">منشور</option>
                  <option value="draft">مسودة</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* 🚀 المحتوى (الواجبات) */}
        {contentLoading ? (
          <div className="flex flex-col justify-center items-center py-32 gap-4">
            <Loader2 className="animate-spin h-14 w-14 text-indigo-500 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
            <p className="text-slate-400 font-bold animate-pulse tracking-widest">جاري تحميل الواجبات...</p>
          </div>
        ) : displayedAssignments.length === 0 ? (
          <div className="text-center py-32 bg-[#131836]/40 backdrop-blur-md rounded-[3rem] border border-dashed border-white/10 shadow-inner">
            <div className="h-24 w-24 bg-[#090b14]/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
              <FileText className="h-12 w-12 text-slate-500" />
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight mb-2">لا توجد واجبات مسجلة</h3>
            <p className="text-slate-400 font-medium">
               {statusFilter === 'draft' ? 'لا يوجد مسودات مسجلة حالياً.' : 'قم بإضافة واجبات جديدة للطلاب للبدء.'}
            </p>
          </div>
        ) : (
          <div className={currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'management' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "flex flex-col gap-6"}>
            {displayedAssignments.map((assignment, index) => {
              
              if (currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'management') {
                const pendingGradesCount = (assignment.submission_count || 0) - (assignment.graded_count || 0);
                const needsTeacherGrading = pendingGradesCount > 0;
                const overdue = isOverdue(assignment.due_date!);
                const dueDateObj = new Date(assignment.due_date!);
                
                const canEdit = currentRole === 'admin' || currentRole === 'management' || assignment.teacher_id === user?.id;

                return (
                  <div key={assignment.id} className="group bg-[#131836]/60 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-lg hover:border-indigo-500/50 hover:shadow-[0_10px_40px_-10px_rgba(99,102,241,0.3)] transition-all overflow-hidden flex flex-col">
                    <div className="p-8 flex-1">
                      <div className="flex items-start justify-between mb-8 gap-2">
                        <div className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border whitespace-nowrap shadow-inner ${getStatusColor(assignment.status)}`}>
                          {getStatusLabel(assignment.status)}
                        </div>

                        {needsTeacherGrading && (
                          <div className="flex-1 flex justify-end">
                            <div className="px-3 py-1.5 rounded-xl text-[10px] font-black border shadow-inner bg-amber-500/20 text-amber-400 border-amber-500/30 flex items-center gap-1.5 animate-pulse">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>{pendingGradesCount} للتقييم</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex gap-2 relative z-10">
                          <Link 
                             href={`/assignments/${assignment.id}`}
                             className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/20 rounded-xl transition-all shadow-inner bg-[#090b14]/50 border border-white/5"
                             title="عرض التفاصيل"
                          >
                            <Eye className="h-5 w-5" />
                          </Link>
                          {canEdit && (
                            <button 
                              onClick={() => openFullEditModal(assignment)}
                              className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/20 rounded-xl transition-all shadow-inner bg-[#090b14]/50 border border-white/5"
                              title="تعديل الواجب بالكامل"
                            >
                              <Edit2 className="h-5 w-5" />
                            </button>
                          )}
                          {canEdit && (
                            <button 
                              onClick={() => setAssignmentToDelete(assignment.id)}
                              className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all shadow-inner bg-[#090b14]/50 border border-white/5"
                              title="حذف الواجب"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="text-2xl font-black text-white mb-4 group-hover:text-indigo-400 transition-colors tracking-tight leading-tight line-clamp-2">
                        {assignment.title}
                      </h3>
                      
                      <p className="text-slate-400 font-medium line-clamp-2 mb-8 text-sm leading-relaxed">
                        يرجى فتح الواجب لرؤية التعليمات التفصيلية...
                      </p>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 text-xs sm:text-sm font-bold text-slate-300 bg-[#090b14]/50 p-4 rounded-2xl border border-white/5 shadow-inner">
                          <div className="h-8 w-8 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30"><BookOpen className="h-4 w-4 text-indigo-400" /></div>
                          <span className="truncate">{assignment.subject_name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs sm:text-sm font-bold text-slate-300 bg-[#090b14]/50 p-4 rounded-2xl border border-white/5 shadow-inner">
                          <div className="h-8 w-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/30"><Users className="h-4 w-4 text-emerald-400" /></div>
                          <span>{assignment.submission_count || 0} تسليم</span>
                        </div>
                      </div>
                    </div>

                    <div className={`px-8 py-5 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 ${overdue && assignment.status === 'published' ? 'bg-rose-500/10' : 'bg-[#090b14]/30'}`}>
                      <div className={`flex items-center gap-2 text-sm font-black ${overdue && assignment.status === 'published' ? 'text-rose-400' : 'text-slate-400'}`}>
                        <Clock className="h-5 w-5" />
                        <span dir="ltr">{format(dueDateObj, 'yyyy/MM/dd HH:mm')}</span>
                      </div>
                      
                      <div className="flex items-center gap-3 w-full sm:w-auto relative z-10">
                        {assignment.file_url && (
                          <a 
                            href={assignment.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="h-11 px-4 rounded-xl bg-[#131836] text-xs font-black text-indigo-400 shadow-inner border border-indigo-500/30 hover:bg-indigo-500/20 transition-all flex items-center gap-2 active:scale-95 flex-1 sm:flex-none justify-center"
                          >
                            <ImageIcon className="h-4 w-4" />
                            <span>المرفق</span>
                          </a>
                        )}
                        <Link 
                          href={`/assignments/${assignment.id}`}
                          className="h-11 px-6 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 text-sm font-black shadow-[0_0_15px_rgba(99,102,241,0.4)] border border-indigo-400/50 transition-all flex items-center gap-2 active:scale-95 flex-1 sm:flex-none justify-center"
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
                  <div key={assignment.id} className="w-full bg-[#131836]/60 backdrop-blur-xl rounded-[2rem] p-6 border border-white/10 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.2)] transition-all relative overflow-hidden">
                     {/* التأثير الزجاجي الفخم في الخلفية */}
                     <div className={`absolute top-0 right-0 w-32 h-full opacity-20 pointer-events-none transition-all duration-700 blur-3xl ${isStudentDone ? 'bg-emerald-500 group-hover:scale-150' : overdue ? 'bg-rose-500 group-hover:scale-150' : 'bg-indigo-500 group-hover:scale-150'}`}></div>

                     <div className="flex items-center gap-5 w-full md:w-auto relative z-10">
                        <div className={`p-4 rounded-2xl shrink-0 border transition-all shadow-inner ${
                          isStudentDone 
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 group-hover:bg-emerald-500 group-hover:text-[#090b14]' 
                            : overdue
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 group-hover:bg-rose-500 group-hover:text-white'
                              : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 group-hover:bg-indigo-600 group-hover:text-white'
                        }`}>
                          <FileText className="h-8 w-8" />
                        </div>
                        <div className="text-right">
                          <h3 className="text-xl font-black text-white mb-1 group-hover:text-indigo-300 transition-colors leading-tight line-clamp-1">{assignment.title}</h3>
                          <div className="flex items-center gap-3 text-sm font-bold text-slate-400">
                            <span className="flex items-center gap-1.5 bg-[#090b14]/50 px-2 py-1 rounded-md border border-white/5"><BookOpen className="w-3.5 h-3.5"/> {assignment.subject_name}</span>
                            <span className={`flex items-center gap-1.5 ${overdue && !isStudentDone ? 'text-rose-400 animate-pulse' : ''}`}>
                              <Clock className="w-3.5 h-3.5"/> 
                              <span dir="ltr">{format(dueDateObj, 'yyyy/MM/dd HH:mm')}</span>
                            </span>
                          </div>
                        </div>
                     </div>
                     
                     <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto justify-end border-t md:border-0 border-white/10 pt-4 md:pt-0 mt-2 md:mt-0 relative z-10">
                        {isStudentDone ? (
                          <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border shadow-inner ${statusStr === 'graded' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                            {statusStr === 'graded' ? 'تم التقييم' : 'قيد المراجعة'}
                          </div>
                        ) : (
                          <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border shadow-inner ${overdue ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'}`}>
                            {overdue ? 'متأخر' : 'مطلوب حله'}
                          </div>
                        )}
                        
                        <Link href={`/assignments/${assignment.id}`} className="w-full md:w-auto">
                          <button className={`w-full md:w-auto px-8 py-3.5 rounded-xl text-sm font-black shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 ${
                            isStudentDone 
                              ? 'bg-[#090b14]/80 border border-white/10 text-white hover:bg-emerald-500 hover:text-[#090b14] hover:border-emerald-400' 
                              : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90 shadow-[0_0_15px_rgba(99,102,241,0.4)] border border-indigo-400/50'
                          }`}>
                             {isStudentDone ? <Eye className="w-4 h-4" /> : <Play className="w-4 h-4" />}
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

        {/* 🚀 Delete Confirmation Modal */}
        <Dialog.Root open={!!assignmentToDelete} onOpenChange={(open) => !open && setAssignmentToDelete(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-[#090b14]/80 backdrop-blur-md z-40 animate-in fade-in duration-300" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-[2.5rem] bg-[#131836] border border-white/10 p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] focus:outline-none animate-in zoom-in-95 duration-300" dir="rtl">
              <div className="h-16 w-16 bg-rose-500/20 border border-rose-500/30 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                <Trash2 className="h-8 w-8 text-rose-400" />
              </div>
              <Dialog.Title className="text-2xl font-black text-white mb-2 tracking-tight">
                تأكيد الحذف
              </Dialog.Title>
              <p className="text-slate-400 font-bold mb-8 leading-relaxed">هل أنت متأكد من رغبتك في حذف هذا الواجب؟ سيتم مسح صور و إجابات الطلاب المرتبطة به نهائياً ولا يمكن التراجع.</p>
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <Dialog.Close asChild>
                  <button className="flex-1 rounded-2xl bg-white/5 border border-white/10 px-6 py-4 text-sm font-black text-slate-300 hover:bg-white/10 transition-all active:scale-95">
                    إلغاء
                  </button>
                </Dialog.Close>
                <button
                  onClick={handleDeleteAssignment}
                  disabled={loading}
                  className="flex-1 rounded-2xl bg-rose-600 border border-rose-500/50 px-6 py-4 text-sm font-black text-white shadow-[0_0_20px_rgba(225,29,72,0.4)] hover:bg-rose-500 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'جاري الحذف...' : 'تأكيد الحذف'}
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* 🚀 Add/Edit Assignment Full Modal (Dark Mode) */}
        <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-[#090b14]/80 backdrop-blur-md z-40 animate-in fade-in duration-300" />
            <Dialog.Content 
              onInteractOutside={(e) => e.preventDefault()} 
              onEscapeKeyDown={(e) => e.preventDefault()}
              className="fixed left-[50%] top-[50%] z-50 w-full max-w-5xl translate-x-[-50%] translate-y-[-50%] rounded-[2.5rem] bg-[#131836] border border-white/10 p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] focus:outline-none max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300 custom-scrollbar" 
              dir="rtl"
            >
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 shadow-inner flex items-center justify-center">
                    <FileText className="h-7 w-7 text-indigo-400" />
                  </div>
                  <div>
                    <Dialog.Title className="text-2xl font-black text-white tracking-tight">
                      {currentAssignment.id ? 'تعديل الواجب' : 'إضافة واجب جديد'}
                    </Dialog.Title>
                    <p className="text-sm text-slate-400 font-bold mt-1">أدخل تفاصيل الواجب، ويمكنك إرفاق صورة للمسألة وبناء الأسئلة أدناه</p>
                  </div>
                </div>
                <Dialog.Close className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors">
                  <X className="h-6 w-6" />
                </Dialog.Close>
              </div>
              
              <form onSubmit={handleSaveAssignment} className="space-y-10">
                <div className="space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column Form */}
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-black text-slate-300 mb-2 mr-1">حالة الواجب <span className="text-rose-500">*</span></label>
                        <select 
                          required
                          className="block w-full rounded-2xl border-0 py-4 px-5 text-white bg-[#090b14]/80 ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-indigo-500/50 sm:text-sm transition-all font-bold appearance-none cursor-pointer shadow-inner [&>option]:bg-[#131836]"
                          value={currentAssignment.status || 'draft'}
                          onChange={(e) => setCurrentAssignment({...currentAssignment, status: e.target.value})}
                        >
                          <option value="draft">مسودة (لا يظهر للطلاب)</option>
                          <option value="published">منشور (يظهر للطلاب فوراً)</option>
                        </select>
                      </div>
                    
                      <div>
                        <label className="block text-sm font-black text-slate-300 mb-2 mr-1">عنوان الواجب <span className="text-rose-500">*</span></label>
                        <input 
                          type="text" 
                          required
                          placeholder="مثال: حل مسائل الفيزياء صفحة 40" 
                          className="block w-full rounded-2xl border-0 py-4 px-5 text-white bg-[#090b14]/80 ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-indigo-500/50 sm:text-sm transition-all font-bold shadow-inner placeholder:text-slate-500"
                          value={currentAssignment.title || ''}
                          onChange={(e) => setCurrentAssignment({...currentAssignment, title: e.target.value})}
                        />
                      </div>
                    
                      <div>
                        <label className="block text-sm font-black text-slate-300 mb-2 mr-1">الوصف والتعليمات التفصيلية</label>
                        <div className="bg-[#090b14]/50 p-2 rounded-3xl border border-white/10 shadow-inner">
                          <ForumEditor 
                            content={currentAssignment.description || ''}
                            setContent={(content) => setCurrentAssignment({...currentAssignment, description: content})}
                            canUploadImage={true}
                            placeholder="اكتب تعليمات الواجب (مثال: قم بحل المسألة المرفقة وصور الحل...)"
                          />
                        </div>
                      </div>

                      <div className={`grid grid-cols-1 gap-6 ${currentRole === 'admin' || currentRole === 'management' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                        <div>
                          <label className="block text-sm font-black text-slate-300 mb-2 mr-1">المادة <span className="text-rose-500">*</span></label>
                          <select 
                            required
                            className="block w-full rounded-2xl border-0 py-4 px-5 text-white bg-[#090b14]/80 ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-indigo-500/50 sm:text-sm transition-all font-bold appearance-none cursor-pointer shadow-inner [&>option]:bg-[#131836]"
                            value={currentAssignment.subject_id || ''}
                            onChange={(e) => setCurrentAssignment({...currentAssignment, subject_id: e.target.value})}
                          >
                            <option value="">اختر المادة...</option>
                            {subjects.map((s: any) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-black text-slate-300 mb-2 mr-1">تاريخ ووقت التسليم <span className="text-rose-500">*</span></label>
                          <input 
                            type="datetime-local" 
                            required
                            className="block w-full rounded-2xl border-0 py-4 px-4 text-white bg-[#090b14]/80 ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-indigo-500/50 sm:text-sm transition-all font-bold text-left shadow-inner"
                            dir="ltr"
                            style={{ colorScheme: 'dark' }}
                            value={currentAssignment.due_date || ''}
                            onChange={(e) => setCurrentAssignment({...currentAssignment, due_date: e.target.value})}
                          />
                        </div>
                        
                        {(currentRole === 'admin' || currentRole === 'management') && (
                          <div>
                            <label className="block text-sm font-black text-slate-300 mb-2 mr-1">المعلم المسؤول <span className="text-rose-500">*</span></label>
                            <select 
                              required
                              className="block w-full rounded-2xl border-0 py-4 px-5 text-white bg-[#090b14]/80 ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-indigo-500/50 sm:text-sm transition-all font-bold appearance-none cursor-pointer shadow-inner [&>option]:bg-[#131836]"
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

                      <div className="bg-[#090b14]/50 p-5 rounded-3xl border border-white/5 shadow-inner">
                        <label className="flex items-center gap-2 text-sm font-black text-white mb-4">
                          <Users className="w-5 h-5 text-indigo-400" />
                          الشعب المستهدفة <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-52 overflow-y-auto pr-2 custom-scrollbar">
                          {sections.map((s: any) => {
                            const classObj = s.classes || s.class;
                            const cName = Array.isArray(classObj) ? classObj[0]?.name : classObj?.name;
                            return (
                              <label key={s.id} className={`flex items-center gap-3 cursor-pointer group p-3 rounded-xl border transition-all ${currentAssignment.section_ids?.includes(s.id) ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-[#131836] border-white/5 text-slate-300 hover:border-white/20'}`}>
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
                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${currentAssignment.section_ids?.includes(s.id) ? 'bg-indigo-500 border-indigo-400' : 'border-slate-500 bg-[#090b14]'}`}>
                                   {currentAssignment.section_ids?.includes(s.id) && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <span className="text-sm font-bold truncate">
                                  {cName ? `${cName} - ${s.name}` : s.name}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="bg-[#090b14]/50 p-5 rounded-3xl border border-white/5 shadow-inner">
                        <label className="flex items-center gap-2 text-sm font-black text-white mb-4">
                          <ImageIcon className="w-5 h-5 text-indigo-400" />
                          إرفاق مسألة أو صورة (اختياري)
                        </label>
                        <div className="bg-[#131836] rounded-2xl p-2 border border-white/5">
                          <ImageUpload
                            initialImageUrl={currentAssignment.file_url}
                            onUploadSuccess={(url) => setCurrentAssignment({...currentAssignment, file_url: url})}
                            label="ارفع صورة أو ملف للواجب"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Question Builder */}
                    <div className="bg-[#090b14]/30 rounded-[2rem] p-6 sm:p-8 border border-white/5 shadow-inner relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                      <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="p-2 bg-indigo-500/20 border border-indigo-500/30 rounded-xl shadow-inner">
                           <Layout className="h-6 w-6 text-indigo-400" />
                        </div>
                        <h4 className="text-xl font-black text-white">بناء الأسئلة التفاعلية للواجب</h4>
                      </div>
                      <div className="relative z-10">
                        <AssignmentBuilder questions={questions} onChange={setQuestions} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pt-8 border-t border-white/10">
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="w-full sm:w-auto rounded-2xl bg-white/5 border border-white/10 px-8 py-4 text-sm font-black text-slate-300 hover:bg-white/10 hover:text-white transition-all active:scale-95"
                    >
                      إلغاء الأمر
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 border border-emerald-400/50 px-10 py-4 text-sm font-black text-slate-900 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <><div className="h-5 w-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> جاري الحفظ...</>
                    ) : (
                      <><CheckCircle2 className="w-5 h-5" /> حفظ ونشر الواجب</>
                    )}
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <style dangerouslySetInnerHTML={{ __html: `
          .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: #090b14; border-radius: 12px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 12px; border: 2px solid #090b14; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
        `}} />
      </div>
    </div>
  );
}
