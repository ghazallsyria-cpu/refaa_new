'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, FileText, Calendar, Clock, Link as LinkIcon, X, BookOpen, Users, AlertCircle, Eye, CheckCircle2, Filter, Layout, Image as ImageIcon, Play } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';
import AssignmentBuilder from '@/components/assignment-builder';
import ImageUpload from '@/components/ImageUpload';
import { Question } from '@/types/question';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { useAssignmentsSystem } from '@/hooks/useAssignmentsSystem';
import { useSchoolFormData } from '@/hooks/useSchoolFormData';
import { useAuth } from '@/context/auth-context';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase'; // 🚀 إضافة الاتصال بقاعدة البيانات لجلب المرفقات

const getStatusColor = (status: string) => {
  switch (status) {
    case 'published': return 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-emerald-50';
    case 'draft': return 'bg-amber-50 text-amber-700 border-amber-100 shadow-amber-50';
    case 'archived': return 'bg-slate-50 text-slate-700 border-slate-100 shadow-slate-50';
    default: return 'bg-slate-50 text-slate-700 border-slate-100 shadow-slate-50';
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

  // 🚀 التنظيف العميق (Deep Cleanup) للصور قبل حذف الواجب
  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    setLoading(true);
    try {
      const assignment = assignments.find(a => a.id === assignmentToDelete);
      
      // 1. حذف صورة/مرفق المعلم
      if (assignment?.file_url) {
        try { await deleteFromCloudinary(assignment.file_url); } catch (e) { console.error('Teacher file delete error:', e); }
      }

      // 2. جلب جميع تسليمات الطلاب لهذا الواجب وحذف صور إجاباتهم
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

      // 3. مسح الواجب من قاعدة البيانات
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

  const openEditModal = async (assignment: any) => {
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
      teacher_id: currentRole === 'teacher' ? user?.id || '' : teachers[0]?.id || '',
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div>
      </div>
    );
  }

  const isOverdue = (dueDateStr: string) => new Date(dueDateStr) < new Date();

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-24" dir="rtl">
      {notification && (
        <div className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-[100] px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 transition-all animate-in fade-in slide-in-from-top-4 duration-500 ${
          notification.type === 'success' ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-red-500 text-white shadow-red-100'
        }`}>
          <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center">
            {notification.type === 'success' ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
          </div>
          <div className="font-black tracking-tight text-lg">{notification.message}</div>
          <button onClick={() => setNotification(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors mr-4">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">الواجبات المدرسية</h1>
          <p className="text-lg text-slate-500 font-medium">إدارة الواجبات والمهام المسندة للطلاب</p>
        </div>
        {(currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'management') && (
          <button 
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-95 self-start md:self-end"
          >
            <Plus className="h-5 w-5" />
            إضافة واجب جديد
          </button>
        )}
      </div>

      <div className="glass-card p-6 rounded-4xl shadow-lg shadow-slate-200/50 border border-white/60">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="relative flex-1 group">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
              <Search className="h-5 w-5" aria-hidden="true" />
            </div>
            <input
              type="text"
              className="block w-full rounded-2xl border-0 py-4 pr-12 pl-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold"
              placeholder="البحث بعنوان الواجب أو المادة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {(currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'management') && (
            <div className="relative md:w-64 group">
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                <Filter className="h-5 w-5" />
              </div>
              <select
                className="block w-full rounded-2xl border-0 py-4 pr-12 pl-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold appearance-none"
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

      {contentLoading ? (
        <div className="flex flex-col justify-center items-center py-32 gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-slate-500 font-bold animate-pulse">جاري تحميل الواجبات...</p>
        </div>
      ) : displayedAssignments.length === 0 ? (
        <div className="text-center py-32 glass-card rounded-4xl border border-white/60 shadow-2xl shadow-slate-200/50">
          <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="h-12 w-12 text-slate-300" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">لا توجد واجبات مسجلة</h3>
          <p className="text-slate-500 mt-2 font-medium">
             {statusFilter === 'draft' ? 'لا يوجد مسودات مسجلة حالياً.' : 'قم بإضافة واجبات جديدة للطلاب للبدء.'}
          </p>
        </div>
      ) : (
        <div className={currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'management' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10" : "flex flex-col gap-5"}>
          {displayedAssignments.map((assignment, index) => {
            
            if (currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'management') {
              const pendingGradesCount = (assignment.submission_count || 0) - (assignment.graded_count || 0);
              const needsTeacherGrading = pendingGradesCount > 0;
              const overdue = isOverdue(assignment.due_date!);
              const dueDateObj = new Date(assignment.due_date!);

              return (
                <div key={assignment.id} className="group glass-card rounded-[3rem] border border-white/60 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:-translate-y-2 transition-all overflow-hidden flex flex-col">
                  <div className="p-10 flex-1">
                    <div className="flex items-start justify-between mb-8 gap-2">
                      <div className={`px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border shadow-sm whitespace-nowrap ${getStatusColor(assignment.status)}`}>
                        {getStatusLabel(assignment.status)}
                      </div>

                      {needsTeacherGrading && (
                        <div className="flex-1 flex justify-end">
                          <div className="px-3 py-2 rounded-2xl text-[10px] font-black border shadow-sm bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1.5 animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>{pendingGradesCount} بحاجة لتصحيحك</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Link 
                           href={`/assignments/${assignment.id}`}
                           className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100"
                           title="عرض التفاصيل"
                        >
                          <Eye className="h-5 w-5" />
                        </Link>
                        <button 
                          onClick={() => openEditModal(assignment)}
                          className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100"
                          title="تعديل الواجب"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button 
                          onClick={() => setAssignmentToDelete(assignment.id)}
                          className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100"
                          title="حذف الواجب"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-3xl font-black text-slate-900 mb-4 group-hover:text-indigo-600 transition-colors tracking-tight leading-tight">
                      {assignment.title}
                    </h3>
                    <p className="text-slate-500 font-medium line-clamp-2 mb-8 text-lg leading-relaxed">
                      {assignment.description || 'لا يوجد وصف لهذا الواجب'}
                    </p>

                    <div className="grid grid-cols-2 gap-5">
                      <div className="flex items-center gap-4 text-sm font-black text-slate-600 bg-slate-50/50 p-4 rounded-3xl border border-slate-100/50">
                        <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center"><BookOpen className="h-5 w-5 text-indigo-500" /></div>
                        <span className="truncate">{assignment.subject_name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm font-black text-slate-600 bg-slate-50/50 p-4 rounded-3xl border border-slate-100/50">
                        <div className="h-10 w-10 rounded-2xl bg-emerald-50 flex items-center justify-center"><Users className="h-5 w-5 text-emerald-500" /></div>
                        <span>{assignment.submission_count || 0} تسليم</span>
                      </div>
                    </div>
                  </div>

                  <div className={`px-8 py-5 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${overdue && assignment.status === 'published' ? 'bg-red-50/50 border-red-100' : 'bg-slate-50/50 border-slate-100'}`}>
                    <div className={`flex items-center gap-2 text-sm font-black ${overdue && assignment.status === 'published' ? 'text-red-600' : 'text-slate-700'}`}>
                      <Clock className="h-5 w-5" />
                      <span dir="ltr">{format(dueDateObj, 'yyyy/MM/dd HH:mm')}</span>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {assignment.file_url && (
                        <a 
                          href={assignment.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="h-11 px-4 rounded-xl bg-white text-xs font-black text-indigo-600 shadow-sm border border-indigo-100 hover:bg-indigo-50 transition-all flex items-center gap-2 active:scale-95 flex-1 sm:flex-none justify-center"
                        >
                          <ImageIcon className="h-4 w-4" />
                          <span>المرفق</span>
                        </a>
                      )}
                      <Link 
                        href={`/assignments/${assignment.id}`}
                        className="h-11 px-6 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-black shadow-md transition-all flex items-center gap-2 active:scale-95 flex-1 sm:flex-none justify-center"
                      >
                        <span>التفاصيل والنتائج</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            } 
            
            else {
              const statusStr = String((studentSubmissions[assignment.id] as any)?.status || '');
              const isStudentDone = ['submitted', 'graded'].includes(statusStr);
              const overdue = isOverdue(assignment.due_date!);
              const dueDateObj = new Date(assignment.due_date!);
              
              return (
                <div key={assignment.id} className="w-full bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group hover:border-indigo-200 hover:shadow-md transition-all">
                   <div className="flex items-center gap-5 w-full md:w-auto">
                      <div className={`p-4 rounded-2xl shrink-0 border transition-colors ${
                        isStudentDone 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white' 
                          : overdue
                            ? 'bg-red-50 text-red-600 border-red-100 group-hover:bg-red-600 group-hover:text-white'
                            : 'bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white'
                      }`}>
                        <FileText className="h-8 w-8" />
                      </div>
                      <div className="text-right">
                        <h3 className="text-xl font-black text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">{assignment.title}</h3>
                        <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
                          <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4"/> {assignment.subject_name}</span>
                          <span className="opacity-50">•</span>
                          <span className={`flex items-center gap-1.5 ${overdue && !isStudentDone ? 'text-red-500 animate-pulse' : ''}`}>
                            <Clock className="w-4 h-4"/> 
                            <span dir="ltr">{format(dueDateObj, 'yyyy/MM/dd HH:mm')}</span>
                          </span>
                        </div>
                      </div>
                   </div>
                   
                   <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto justify-end border-t md:border-0 border-slate-100 pt-4 md:pt-0 mt-2 md:mt-0">
                      {isStudentDone ? (
                        <div className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest border ${statusStr === 'graded' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                          {statusStr === 'graded' ? 'تم التقييم' : 'قيد المراجعة'}
                        </div>
                      ) : (
                        <div className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest border ${overdue ? 'bg-red-50 text-red-700 border-red-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                          {overdue ? 'متأخر' : 'مطلوب حله'}
                        </div>
                      )}
                      
                      <Link href={`/assignments/${assignment.id}`} className="w-full md:w-auto">
                        <button className={`w-full md:w-auto px-8 py-3 rounded-xl text-sm font-black shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 ${
                          isStudentDone 
                            ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200'
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

      {/* Delete Confirmation Modal */}
      <Dialog.Root open={!!assignmentToDelete} onOpenChange={(open) => !open && setAssignmentToDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 animate-in fade-in duration-300" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-4xl bg-white p-8 shadow-2xl focus:outline-none animate-in zoom-in-95 duration-300" dir="rtl">
            <div className="h-16 w-16 bg-red-50 rounded-3xl flex items-center justify-center mb-6">
              <Trash2 className="h-8 w-8 text-red-500" />
            </div>
            <Dialog.Title className="text-2xl font-black text-slate-900 mb-2 tracking-tight">
              تأكيد الحذف
            </Dialog.Title>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">هل أنت متأكد من رغبتك في حذف هذا الواجب؟ سيتم مسح صور و إجابات الطلاب المرتبطة به نهائياً.</p>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Dialog.Close asChild>
                <button className="flex-1 rounded-2xl bg-slate-50 px-6 py-4 text-sm font-black text-slate-700 hover:bg-slate-100 transition-all active:scale-95">
                  إلغاء
                </button>
              </Dialog.Close>
              <button
                onClick={handleDeleteAssignment}
                disabled={loading}
                className="flex-1 rounded-2xl bg-red-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-red-100 hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Add/Edit Assignment Modal */}
      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 animate-in fade-in duration-300" />
          <Dialog.Content 
            onInteractOutside={(e) => e.preventDefault()} 
            onEscapeKeyDown={(e) => e.preventDefault()}
            className="fixed left-[50%] top-[50%] z-50 w-full max-w-5xl translate-x-[-50%] translate-y-[-50%] rounded-[2.5rem] bg-white p-8 shadow-2xl focus:outline-none max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300 scrollbar-hide" 
            dir="rtl"
          >
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <FileText className="h-7 w-7 text-indigo-600" />
                </div>
                <div>
                  <Dialog.Title className="text-2xl font-black text-slate-900 tracking-tight">
                    {currentAssignment.id ? 'تعديل الواجب' : 'إضافة واجب جديد'}
                  </Dialog.Title>
                  <p className="text-sm text-slate-500 font-bold mt-1">أدخل تفاصيل الواجب، ويمكنك إرفاق صورة للمسألة</p>
                </div>
              </div>
              <Dialog.Close className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-400 transition-colors">
                <X className="h-6 w-6" />
              </Dialog.Close>
            </div>
            
            <form onSubmit={handleSaveAssignment} className="space-y-10">
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-black text-slate-700 mb-2 mr-1">حالة الواجب <span className="text-red-500">*</span></label>
                      <select 
                        required
                        className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold appearance-none cursor-pointer"
                        value={currentAssignment.status || 'draft'}
                        onChange={(e) => setCurrentAssignment({...currentAssignment, status: e.target.value})}
                      >
                        <option value="draft">مسودة (لا يظهر للطلاب)</option>
                        <option value="published">منشور (يظهر للطلاب فوراً)</option>
                      </select>
                    </div>
                  
                  <div>
                    <label className="block text-sm font-black text-slate-700 mb-2 mr-1">عنوان الواجب <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      placeholder="مثال: حل مسائل الفيزياء صفحة 40" 
                      className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold"
                      value={currentAssignment.title || ''}
                      onChange={(e) => setCurrentAssignment({...currentAssignment, title: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-black text-slate-700 mb-2 mr-1">الوصف والتفاصيل</label>
                    <textarea 
                      rows={5}
                      placeholder="اكتب تعليمات الواجب (مثال: قم بحل المسألة المرفقة وصور الحل...)" 
                      className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold resize-none"
                      value={currentAssignment.description || ''}
                      onChange={(e) => setCurrentAssignment({...currentAssignment, description: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-black text-slate-700 mb-2 mr-1">المادة <span className="text-red-500">*</span></label>
                      <select 
                        required
                        className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold appearance-none cursor-pointer"
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
                      <label className="block text-sm font-black text-slate-700 mb-2 mr-1">تاريخ ووقت التسليم <span className="text-red-500">*</span></label>
                      <input 
                        type="datetime-local" 
                        required
                        className="block w-full rounded-2xl border-0 py-4 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold text-left"
                        dir="ltr"
                        value={currentAssignment.due_date || ''}
                        onChange={(e) => setCurrentAssignment({...currentAssignment, due_date: e.target.value})}
                      />
                    </div>
                  </div>

<div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                    <label className="flex items-center gap-2 text-sm font-black text-slate-900 mb-4">
                      <Users className="w-5 h-5 text-indigo-500" />
                      الشعب المستهدفة <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-52 overflow-y-auto pr-2 scrollbar-hide">
                      {sections.map((s: any) => {
                        // 🚀 تعديل الاسم ليظهر كاملاً
                        const classObj = s.classes || s.class;
                        const cName = Array.isArray(classObj) ? classObj[0]?.name : classObj?.name;
                        return (
                          <label key={s.id} className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all">
                            <input
                              type="checkbox"
                              className="h-5 w-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                              checked={currentAssignment.section_ids?.includes(s.id)}
                              onChange={(e) => {
                                const newSectionIds = e.target.checked
                                  ? [...(currentAssignment.section_ids || []), s.id]
                                  : (currentAssignment.section_ids || []).filter((id: string) => id !== s.id);
                                setCurrentAssignment({...currentAssignment, section_ids: newSectionIds});
                              }}
                            />
                            <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-900 transition-colors">
                              {cName ? `${cName} - ${s.name}` : s.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>


                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200">
                    <label className="flex items-center gap-2 text-sm font-black text-slate-900 mb-4">
                      <ImageIcon className="w-5 h-5 text-indigo-500" />
                      إرفاق مسألة أو صورة (اختياري)
                    </label>
                    <ImageUpload
                      initialImageUrl={currentAssignment.file_url}
                      onUploadSuccess={(url) => setCurrentAssignment({...currentAssignment, file_url: url})}
                      label="ارفع صورة أو ملف للواجب"
                    />
                  </div>
                </div>
                </div>

                <div className="bg-slate-50/50 rounded-[2rem] p-6 sm:p-8 border border-slate-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
                       <Layout className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h4 className="text-xl font-black text-slate-900">بناء الأسئلة التفاعلية للواجب</h4>
                  </div>
                  <AssignmentBuilder questions={questions} onChange={setQuestions} />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-8 border-t border-slate-100">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="w-full sm:w-auto rounded-2xl bg-white border border-slate-200 px-8 py-4 text-sm font-black text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95"
                  >
                    إلغاء الأمر
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto rounded-2xl bg-indigo-600 px-10 py-4 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <><div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> جاري الحفظ...</>
                  ) : (
                    <><CheckCircle2 className="w-5 h-5" /> حفظ ونشر الواجب</>
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
