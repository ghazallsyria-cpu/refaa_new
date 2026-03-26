'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Edit2, Trash2, FileText, Calendar, Clock, Link as LinkIcon, X, BookOpen, Users, User, AlertCircle, Share2, Eye, CheckCircle2, Sparkles, Layout } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';
import AssignmentBuilder, { Question } from '@/components/assignment-builder';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { useAssignments } from '@/hooks/use-assignments';
import { useSchoolFormData } from '@/hooks/use-school-form-data';
import { useAuth } from '@/context/auth-context';
import { format } from 'date-fns';
import { Teacher, Subject, Section } from '@/types';

export default function AssignmentsPage() {
  const { user, userRole, isChecking: authLoading } = useAuth();
  const { data, isLoading: contentLoading, error: contentError, refetch: refresh } = useAssignments();
  const assignments = data?.data || [];

  const { data: formData, isLoading: formLoading } = useSchoolFormData();
  const subjects = formData?.subjects || [];
  const sections = formData?.sections || [];
  const teachers = formData?.teachers || [];
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [currentAssignment, setCurrentAssignment] = useState<any>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [studentSubmissions, setStudentSubmissions] = useState<Record<string, any>>({});
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

  const fetchFormData = useCallback(async () => {
    if (!user || !userRole) return;
    try {
      let subjectsData: Subject[] = [];
      let sectionsData: Section[] = [];
      let teachersData: Teacher[] = [];

      if (userRole === 'admin' || userRole === 'management') {
        const [subjectsRes, sectionsRes, teachersRes] = await Promise.all([
          supabase.from('subjects').select('*').order('name'),
          supabase.from('sections').select('*, classes(name)').order('name'),
          supabase.from('teachers').select('id, users(full_name)')
        ]);
        subjectsData = subjectsRes.data || [];
        sectionsData = (sectionsRes.data || []).map((s: any) => ({
          ...s,
          classes: Array.isArray(s.classes) ? s.classes[0] : s.classes
        }));
        teachersData = (teachersRes.data || []).map((t: any) => ({
          id: t.id,
          users: Array.isArray(t.users) ? t.users[0] : t.users
        }));
      } else if (userRole === 'teacher') {
        const { data: teacherSectionsData, error: tsError } = await supabase
          .from('teacher_sections')
          .select(`
            section:sections(id, name, classes(name)),
            subject:subjects(id, name)
          `)
          .eq('teacher_id', user.id);
        
        if (tsError) throw tsError;

        const uniqueSubjects = Array.from(new Set((teacherSectionsData || []).map(ts => {
          const subject = Array.isArray(ts.subject) ? ts.subject[0] : ts.subject;
          return subject?.id;
        }))).map(id => {
          const ts = teacherSectionsData?.find(item => {
            const subject = Array.isArray(item.subject) ? item.subject[0] : item.subject;
            return subject?.id === id;
          });
          return Array.isArray(ts?.subject) ? ts?.subject[0] : ts?.subject;
        }).filter((s): s is Subject => !!s);

        const uniqueSections = Array.from(new Set((teacherSectionsData || []).map(ts => {
          const section = Array.isArray(ts.section) ? ts.section[0] : ts.section;
          return section?.id;
        }))).map(id => {
          const ts = teacherSectionsData?.find(item => {
            const section = Array.isArray(item.section) ? item.section[0] : item.section;
            return section?.id === id;
          });
          const section = Array.isArray(ts?.section) ? ts?.section[0] : ts?.section;
          if (!section) return null;
          return {
            ...section,
            classes: Array.isArray(section.classes) ? section.classes[0] : section.classes
          };
        }).filter((s): s is Section => !!s);

        subjectsData = uniqueSubjects;
        sectionsData = uniqueSections;

        const { data: currentTeacher } = await supabase.from('teachers').select('id, users(full_name)').eq('id', user.id).single();
        teachersData = currentTeacher ? [{
          id: currentTeacher.id,
          users: Array.isArray(currentTeacher.users) ? currentTeacher.users[0] : currentTeacher.users
        }] : [];
      }

      // Data is already handled by useSchoolFormData hook
    } catch (error) {
      console.error('Error fetching form data:', error);
    }
  }, [user, userRole]);

  useEffect(() => {
    const fetchSubmissions = async () => {
      if (userRole === 'student' && user) {
        const { data } = await supabase
          .from('assignment_submissions')
          .select('assignment_id, status, grade')
          .eq('student_id', user.id);
        
        if (data) {
          const submissionMap: Record<string, any> = {};
          data.forEach(s => {
            submissionMap[s.assignment_id] = s;
          });
          setStudentSubmissions(submissionMap);
        }
      }
    };
    fetchSubmissions();
  }, [user, userRole]);

  const filteredAssignments = assignments.filter(a =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.subject_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      const payload = {
        title: currentAssignment.title,
        description: currentAssignment.description,
        subject_id: currentAssignment.subject_id,
        teacher_id: userRole === 'teacher' ? user.id : currentAssignment.teacher_id,
        due_date: currentAssignment.due_date,
        file_url: currentAssignment.file_url,
        status: 'published'
      };

      let assignmentId = currentAssignment.id;

      if (assignmentId) {
        // Update
        const { error } = await supabase
          .from('assignments')
          .update(payload)
          .eq('id', assignmentId);
        if (error) throw error;

        // Update Questions (Delete and Re-insert for simplicity or update individually)
        await supabase.from('assignment_questions').delete().eq('assignment_id', assignmentId);
        if (questions.length > 0) {
          const questionsPayload = questions.map((q, index) => ({
            assignment_id: assignmentId,
            question_text: q.text,
            question_type: q.type,
            options: q.options || null,
            points: q.points || 0,
            is_required: q.isRequired || false,
            order: index
          }));
          const { error: qError } = await supabase.from('assignment_questions').insert(questionsPayload);
          if (qError) throw qError;
        }
      } else {
        // Insert
        const { data: newAssignment, error } = await supabase
          .from('assignments')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        if (!newAssignment) throw new Error('فشل في إنشاء الواجب');
        assignmentId = newAssignment.id;

        // Save Questions
        if (questions.length > 0) {
          const questionsPayload = questions.map((q, index) => ({
            assignment_id: newAssignment.id,
            question_text: q.text,
            question_type: q.type,
            options: q.options || null,
            points: q.points || 0,
            is_required: q.isRequired || false,
            order: index
          }));
          const { error: qError } = await supabase.from('assignment_questions').insert(questionsPayload);
          if (qError) throw qError;
        }

        // Send Notifications to students in the sections
        try {
          const { data: students } = await supabase
            .from('students')
            .select('id')
            .in('section_id', currentAssignment.section_ids || []);

          if (students && students.length > 0) {
            const subjectName = subjects.find(s => s.id === payload.subject_id)?.name || 'المادة';
            const notificationPayloads = students.map(student => ({
              user_id: student.id,
              title: 'واجب جديد',
              content: `تمت إضافة واجب جديد في مادة ${subjectName}: ${payload.title}`,
              type: 'assignment',
              link: `/assignments/${newAssignment.id}`
            }));
            await supabase.from('notifications').insert(notificationPayloads);
          }
        } catch (notifErr) {
          console.error('Error sending assignment notifications:', notifErr);
        }
      }

      // Save Assignment Sections (Unified for both create and update)
      await supabase.from('assignment_sections').delete().eq('assignment_id', assignmentId);
      if (currentAssignment.section_ids && currentAssignment.section_ids.length > 0) {
        const sectionsToInsert = currentAssignment.section_ids.map((sId: string) => ({
          assignment_id: assignmentId,
          section_id: sId
        }));
        const { error: sectionsError } = await supabase.from('assignment_sections').insert(sectionsToInsert);
        if (sectionsError) throw sectionsError;
      }

      showNotification('success', currentAssignment.id ? 'تم تحديث الواجب بنجاح' : 'تم إضافة الواجب بنجاح');
      setIsModalOpen(false);
      refresh();
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
        try {
          await deleteFromCloudinary(assignment.file_url, 'raw');
        } catch (cloudinaryError) {
          console.error('Error deleting from Cloudinary:', cloudinaryError);
        }
      }

      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentToDelete);
      
      if (error) throw error;
      
      showNotification('success', 'تم حذف الواجب بنجاح');
      setAssignmentToDelete(null);
      refresh();
    } catch (error: any) {
      console.error('Error deleting assignment:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء حذف الواجب');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = async (assignment: any) => {
    setEditingAssignment(assignment);
    
    // Format date for datetime-local input
    const dateObj = new Date(assignment.due_date);
    const formattedDate = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000))
      .toISOString()
      .slice(0, 16);

    setCurrentAssignment({
      ...assignment,
      due_date: formattedDate,
      section_ids: assignment.assignment_sections?.map((as: any) => as.section_id) || []
    });

    // Fetch questions
    try {
      const { data: qData } = await supabase
        .from('assignment_questions')
        .select('*')
        .eq('assignment_id', assignment.id)
        .order('order');
      
      if (qData) {
        setQuestions(qData.map(q => ({
          id: q.id,
          text: q.question_text,
          type: q.question_type as any,
          options: q.options,
          points: q.points,
          isRequired: q.is_required
        })));
      } else {
        setQuestions([]);
      }
    } catch (err) {
      console.error('Error fetching questions:', err);
      setQuestions([]);
    }

    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingAssignment(null);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    const formattedDate = new Date(tomorrow.getTime() - (tomorrow.getTimezoneOffset() * 60000))
      .toISOString()
      .slice(0, 16);

    setCurrentAssignment({
      title: '',
      description: '',
      subject_id: subjects[0]?.id || '',
      teacher_id: userRole === 'teacher' ? user?.id || '' : teachers[0]?.id || '',
      due_date: formattedDate,
      section_ids: [],
      file_url: ''
    });
    setQuestions([]);
    setIsModalOpen(true);
  };

  if (!mounted || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isOverdue = (dueDateStr: string) => {
    return new Date(dueDateStr) < new Date();
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-24">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-50 px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 transition-all animate-in fade-in slide-in-from-top-4 duration-500 ${
          notification.type === 'success' ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-red-500 text-white shadow-red-100'
        }`}>
          <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center">
            {notification.type === 'success' ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
          </div>
          <div className="font-black tracking-tight">{notification.message}</div>
          <button onClick={() => setNotification(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">الواجبات المدرسية</h1>
          <p className="text-lg text-slate-500 font-medium">إدارة الواجبات والمهام المسندة للطلاب</p>
        </div>
        {(userRole === 'teacher' || userRole === 'admin' || userRole === 'management') && (
          <button 
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-95 self-start md:self-end"
          >
            <Plus className="h-5 w-5" />
            إضافة واجب جديد
          </button>
        )}
      </div>

      <div className="glass-card p-6 rounded-4xl shadow-2xl shadow-slate-200/50 border border-white/60">
        <div className="relative max-w-2xl group">
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
      </div>

      {contentLoading ? (
        <div className="flex flex-col justify-center items-center py-32 gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-slate-500 font-bold animate-pulse">جاري تحميل الواجبات...</p>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="text-center py-32 glass-card rounded-4xl border border-white/60 shadow-2xl shadow-slate-200/50">
          <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="h-12 w-12 text-slate-300" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">لا توجد واجبات مسجلة</h3>
          <p className="text-slate-500 mt-2 font-medium">قم بإضافة واجبات جديدة للطلاب للبدء.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredAssignments.map((assignment) => {
            const overdue = isOverdue(assignment.due_date!);
            const dueDateObj = new Date(assignment.due_date!);
            const isNew = new Date().getTime() - new Date(assignment.created_at).getTime() < 24 * 60 * 60 * 1000;
            
            return (
              <div key={assignment.id} className="group glass-card rounded-4xl shadow-xl shadow-slate-200/50 border border-white/60 overflow-hidden flex flex-col transition-all hover:shadow-2xl hover:-translate-y-2">
                <div className="p-8 flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-wrap gap-2">
                      {isNew && (
                        <span className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-50 px-4 py-1.5 text-xs font-black text-amber-700 uppercase tracking-widest border border-amber-100 shadow-sm">
                          <Sparkles className="h-3.5 w-3.5" />
                          جديد
                        </span>
                      )}
                      <span className="inline-flex items-center rounded-2xl bg-indigo-50 px-4 py-1.5 text-xs font-black text-indigo-700 uppercase tracking-widest border border-indigo-100 shadow-sm">
                        {assignment.subject_name}
                      </span>
                      {userRole === 'student' && studentSubmissions[assignment.id] && (
                        <span className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-50 px-4 py-1.5 text-xs font-black text-emerald-700 uppercase tracking-widest border border-emerald-100 shadow-sm">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          تم التسليم
                        </span>
                      )}
                      {overdue && (
                        <span className="inline-flex items-center gap-1.5 rounded-2xl bg-red-50 px-4 py-1.5 text-xs font-black text-red-700 uppercase tracking-widest border border-red-100 shadow-sm">
                          <AlertCircle className="h-3.5 w-3.5" />
                          انتهى الوقت
                        </span>
                      )}
                      {(userRole === 'teacher' || userRole === 'admin' || userRole === 'management') && assignment.submission_count !== undefined && assignment.submission_count > 0 && (
                        <span className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-1.5 text-xs font-black uppercase tracking-widest border shadow-sm ${
                          assignment.graded_count === assignment.submission_count
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {assignment.graded_count === assignment.submission_count ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Clock className="h-3.5 w-3.5" />
                          )}
                          {assignment.graded_count === assignment.submission_count ? 'مكتمل التقييم' : `تم تقييم ${assignment.graded_count}/${assignment.submission_count}`}
                        </span>
                      )}
                    </div>
                    {(userRole === 'teacher' || userRole === 'admin' || userRole === 'management') && (
                      <div className="flex gap-2">
                        <Link 
                           href={`/assignments/${assignment.id}`}
                           className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100"
                           title="عرض التفاصيل"
                        >
                          <Eye className="h-5 w-5" />
                        </Link>
                        <button 
                          onClick={() => {
                            const url = `${window.location.origin}/assignments/${assignment.id}`;
                            navigator.clipboard.writeText(url);
                            showNotification('success', 'تم نسخ رابط الواجب');
                          }}
                          className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100"
                          title="نسخ الرابط"
                        >
                          <Share2 className="h-5 w-5" />
                        </button>
                        {(userRole === 'admin' || userRole === 'management' || assignment.teacher_id === user?.id) && (
                          <>
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
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-900 mb-3 line-clamp-2 group-hover:text-indigo-600 transition-colors tracking-tight leading-tight">
                    {assignment.title}
                  </h3>
                  
                  <p className="text-slate-500 font-medium mb-6 line-clamp-3 leading-relaxed">
                    {assignment.description || 'لا يوجد وصف'}
                  </p>
                  
                  <div className="space-y-3 mt-auto">
                    <div className="flex items-center text-sm font-bold text-slate-600 gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                      <Users className="h-5 w-5 text-indigo-500" />
                      <span className="line-clamp-1">
                        {assignment.assignment_sections?.map((as: any) => `${as.sections?.classes?.name} - ${as.sections?.name}`).join(', ') || 'لا يوجد فصول'}
                      </span>
                    </div>
                    <div className="flex items-center text-sm font-bold text-slate-600 gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                      <User className="h-5 w-5 text-emerald-500" />
                      <span>أ. {assignment.teacher_name}</span>
                    </div>
                  </div>
                </div>
                
                <div className={`px-8 py-4 border-t flex items-center justify-between ${overdue ? 'bg-red-50/50 border-red-100' : 'bg-slate-50/50 border-slate-100'}`}>
                  <div className={`flex items-center gap-2 text-sm font-black ${overdue ? 'text-red-600' : 'text-slate-700'}`}>
                    <Clock className="h-5 w-5" />
                    <span dir="ltr">
                      {format(dueDateObj, 'yyyy/MM/dd HH:mm')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {assignment.file_url && (
                      <a 
                        href={assignment.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="h-10 px-4 rounded-xl bg-white text-xs font-black text-indigo-600 shadow-sm border border-indigo-100 hover:bg-indigo-50 transition-all flex items-center gap-2 active:scale-95"
                      >
                        <LinkIcon className="h-4 w-4" />
                        <span>المرفق</span>
                      </a>
                    )}
                    <Link 
                      href={`/assignments/${assignment.id}`}
                      className={`h-10 px-4 rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-2 active:scale-95 ${
                        userRole === 'student' && studentSubmissions[assignment.id]
                          ? 'bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      <span>
                        {userRole === 'student' 
                          ? (studentSubmissions[assignment.id] ? 'عرض الإجابة' : 'عرض وتسليم') 
                          : 'التفاصيل'}
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            );
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
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">هل أنت متأكد من رغبتك في حذف هذا الواجب؟ لا يمكن التراجع عن هذا الإجراء وسيتم حذفه نهائياً من النظام.</p>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Dialog.Close asChild>
                <button className="flex-1 rounded-2xl bg-slate-50 px-6 py-4 text-sm font-black text-slate-700 hover:bg-slate-100 transition-all active:scale-95">
                  إلغاء
                </button>
              </Dialog.Close>
              <button
                onClick={handleDeleteAssignment}
                disabled={loading}
                className="flex-1 rounded-2xl bg-red-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-red-100 hover:bg-red-700 hover:shadow-red-200 transition-all active:scale-95 disabled:opacity-50"
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
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] rounded-4xl bg-white p-8 shadow-2xl focus:outline-none max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300" dir="rtl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <Dialog.Title className="text-2xl font-black text-slate-900 tracking-tight">
                    {currentAssignment.id ? 'تعديل الواجب' : 'إضافة واجب جديد'}
                  </Dialog.Title>
                  <p className="text-sm text-slate-500 font-bold">أدخل تفاصيل الواجب والمهام المطلوبة</p>
                </div>
              </div>
              <Dialog.Close className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-400 transition-colors">
                <X className="h-6 w-6" />
              </Dialog.Close>
            </div>
            
            <form onSubmit={handleSaveAssignment} className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-black text-slate-700 mb-2 mr-1">عنوان الواجب <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      placeholder="مثال: حل تمارين الفصل الأول" 
                      className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold"
                      value={currentAssignment.title || ''}
                      onChange={(e) => setCurrentAssignment({...currentAssignment, title: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-black text-slate-700 mb-2 mr-1">الوصف والتفاصيل</label>
                    <textarea 
                      rows={4}
                      placeholder="اكتب تفاصيل الواجب هنا..." 
                      className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold resize-none"
                      value={currentAssignment.description || ''}
                      onChange={(e) => setCurrentAssignment({...currentAssignment, description: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-black text-slate-700 mb-2 mr-1">المادة <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <select 
                          required
                          className="block w-full rounded-2xl border-0 py-4 pr-12 pl-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold appearance-none"
                          value={currentAssignment.subject_id || ''}
                          onChange={(e) => setCurrentAssignment({...currentAssignment, subject_id: e.target.value})}
                        >
                          <option value="">اختر المادة</option>
                          {subjects.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-black text-slate-700 mb-2 mr-1">تاريخ ووقت التسليم <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                          <Clock className="h-5 w-5" />
                        </div>
                        <input 
                          type="datetime-local" 
                          required
                          className="block w-full rounded-2xl border-0 py-4 pr-12 pl-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold text-left"
                          dir="ltr"
                          value={currentAssignment.due_date || ''}
                          onChange={(e) => setCurrentAssignment({...currentAssignment, due_date: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-black text-slate-700 mb-2 mr-1">الشعب المستهدفة <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto p-4 border border-slate-100 rounded-2xl bg-slate-50/50">
                      {sections.map(s => (
                        <label key={s.id} className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            className="h-5 w-5 rounded-lg border-slate-200 text-indigo-600 focus:ring-indigo-500 transition-all"
                            checked={currentAssignment.section_ids?.includes(s.id)}
                            onChange={(e) => {
                              const newSectionIds = e.target.checked
                                ? [...(currentAssignment.section_ids || []), s.id]
                                : (currentAssignment.section_ids || []).filter((id: string) => id !== s.id);
                              setCurrentAssignment({...currentAssignment, section_ids: newSectionIds});
                            }}
                          />
                          <span className="text-sm font-bold text-slate-600 group-hover:text-indigo-600 transition-colors">{s.classes?.name} - {s.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {(userRole === 'admin' || userRole === 'management') && (
                    <div>
                      <label className="block text-sm font-black text-slate-700 mb-2 mr-1">المعلم المسؤول <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                          <User className="h-5 w-5" />
                        </div>
                        <select 
                          required
                          className="block w-full rounded-2xl border-0 py-4 pr-12 pl-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold appearance-none"
                          value={currentAssignment.teacher_id || ''}
                          onChange={(e) => setCurrentAssignment({...currentAssignment, teacher_id: e.target.value})}
                        >
                          <option value="">اختر المعلم</option>
                          {teachers.map(t => (
                            <option key={t.id} value={t.id}>{t.users?.full_name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-black text-slate-700 mb-2 mr-1">رابط الملف المرفق (اختياري)</label>
                    <div className="relative group">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                        <LinkIcon className="h-5 w-5" />
                      </div>
                      <input
                        type="url"
                        className="block w-full rounded-2xl border-0 py-4 pl-12 pr-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold text-left"
                        dir="ltr"
                        placeholder="https://..."
                        value={currentAssignment.file_url || ''}
                        onChange={(e) => setCurrentAssignment({...currentAssignment, file_url: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
                  <h4 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                    <Layout className="h-5 w-5 text-indigo-600" />
                    بناء الأسئلة التفاعلية
                  </h4>
                  <AssignmentBuilder questions={questions} onChange={setQuestions} />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 border-t border-slate-100">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-2xl bg-slate-50 px-8 py-4 text-sm font-black text-slate-700 hover:bg-slate-100 transition-all active:scale-95"
                  >
                    إلغاء
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-black text-white shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : 'حفظ الواجب'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
