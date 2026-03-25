'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Edit2, Trash2, FileText, Calendar, Clock, Link as LinkIcon, X, BookOpen, Users, User, AlertCircle, Share2, Eye, CheckCircle2, Sparkles } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';
import AssignmentBuilder, { Question } from '@/components/assignment-builder';
import { deleteFromCloudinary } from '@/lib/cloudinary';

type Assignment = {
  id: string;
  title: string;
  description: string;
  subject_id: string;
  section_id: string;
  teacher_id: string;
  due_date: string;
  created_at: string;
  file_url: string;
  submission_count?: number;
  graded_count?: number;
  subjects?: { name: string };
  sections?: { name: string; classes?: { name: string } };
  teachers?: { users?: { full_name: string } };
};

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Form Data
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState<Partial<Assignment>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentSubmissions, setStudentSubmissions] = useState<Record<string, boolean>>({});

  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      const role = userData?.role || 'student';
      setUserRole(role);

      let query = supabase
        .from('assignments')
        .select(`
          id,
          title,
          description,
          subject_id,
          section_id,
          teacher_id,
          due_date,
          created_at,
          file_url,
          subjects (name),
          sections (name, classes (name)),
          teachers (users (full_name))
        `)
        .order('due_date', { ascending: true });

      if (role === 'teacher') {
        query = query.eq('teacher_id', user.id);
      } else if (role === 'student') {
        // Get student's section_id
        const { data: studentData } = await supabase
          .from('students')
          .select('section_id')
          .eq('id', user.id)
          .single();
        
        if (studentData?.section_id) {
          query = query.eq('section_id', studentData.section_id);
        } else {
          // If student has no section, return empty
          setAssignments([]);
          return;
        }
      } else if (role === 'parent') {
        // Get parent's children's section_ids
        const { data: childrenData } = await supabase
          .from('students')
          .select('section_id')
          .eq('parent_id', user.id);
        
        const sectionIds = childrenData?.map(c => c.section_id).filter(Boolean) || [];
        if (sectionIds.length > 0) {
          query = query.in('section_id', sectionIds);
        } else {
          setAssignments([]);
          return;
        }
      }
      // admins and management see all

      const { data, error } = await query;
      if (error) throw error;

      // Fetch submission counts for each assignment
      const assignmentIds = (data || []).map(a => a.id);
      const { data: submissionsData } = await supabase
        .from('assignment_submissions')
        .select('assignment_id, status')
        .in('assignment_id', assignmentIds);

      const assignmentsWithStats = (data || []).map(a => {
        const assignmentSubmissions = (submissionsData || []).filter(s => s.assignment_id === a.id);
        return {
          ...a,
          submission_count: assignmentSubmissions.length,
          graded_count: assignmentSubmissions.filter(s => s.status === 'graded').length
        };
      });

      setAssignments((assignmentsWithStats as unknown) as Assignment[] || []);

      // Fetch student submissions if role is student
      if (role === 'student') {
        const { data: submissionsData } = await supabase
          .from('assignment_submissions')
          .select('assignment_id')
          .eq('student_id', user.id);
        
        if (submissionsData) {
          const subsMap: Record<string, boolean> = {};
          submissionsData.forEach(sub => {
            subsMap[sub.assignment_id] = true;
          });
          setStudentSubmissions(subsMap);
        }
      }

    } catch (error: any) {
      console.error('Error fetching assignments:', error);
      showNotification('error', 'حدث خطأ أثناء جلب الواجبات: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFormData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
      const isAdmin = userData?.role === 'admin' || userData?.role === 'management';

      let subjectsData: any[] = [];
      let sectionsData: any[] = [];
      let teachersData: any[] = [];

      if (isAdmin) {
        const [subjectsRes, sectionsRes, teachersRes] = await Promise.all([
          supabase.from('subjects').select('id, name').order('name'),
          supabase.from('sections').select('id, name, classes(name)').order('name'),
          supabase.from('teachers').select('id, users(full_name)')
        ]);
        subjectsData = subjectsRes.data || [];
        sectionsData = (sectionsRes.data || []).map((s: any) => ({
          ...s,
          classes: Array.isArray(s.classes) ? s.classes[0] : s.classes
        }));
        teachersData = teachersRes.data || [];
      } else {
        // Fetch teacher's assigned subjects and sections from teacher_sections
        const { data: teacherSectionsData, error: tsError } = await supabase
          .from('teacher_sections')
          .select(`
            section:sections(id, name, classes(name)),
            subject:subjects(id, name)
          `)
          .eq('teacher_id', user.id);
        
        if (tsError) throw tsError;

        // Extract unique subjects
        const uniqueSubjects = Array.from(new Set((teacherSectionsData || []).map(ts => {
          const subject = Array.isArray(ts.subject) ? ts.subject[0] : ts.subject;
          return subject?.id;
        }))).map(id => {
          const ts = teacherSectionsData?.find(item => {
            const subject = Array.isArray(item.subject) ? item.subject[0] : item.subject;
            return subject?.id === id;
          });
          return Array.isArray(ts?.subject) ? ts?.subject[0] : ts?.subject;
        }).filter(Boolean);

        // Extract unique sections
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
        }).filter(Boolean);

        subjectsData = uniqueSubjects;
        sectionsData = uniqueSections;

        // Only the current teacher
        const { data: currentTeacher } = await supabase.from('teachers').select('id, users(full_name)').eq('id', user.id).single();
        teachersData = currentTeacher ? [currentTeacher] : [];
      }

      setSubjects(subjectsData);
      setSections(sectionsData);
      setTeachers(teachersData);
    } catch (error) {
      console.error('Error fetching form data:', error);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
    fetchFormData();
  }, [fetchAssignments, fetchFormData]);

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAssignment.title || !currentAssignment.subject_id || !currentAssignment.section_id || !currentAssignment.teacher_id || !currentAssignment.due_date) {
      showNotification('error', 'يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: currentAssignment.title,
        description: currentAssignment.description || null,
        subject_id: currentAssignment.subject_id,
        section_id: currentAssignment.section_id,
        teacher_id: currentAssignment.teacher_id,
        due_date: new Date(currentAssignment.due_date).toISOString(),
        file_url: currentAssignment.file_url || null,
        total_marks: questions.reduce((sum, q) => sum + (q.points || 0), 0),
      };

      if (currentAssignment.id) {
        // Check if file_url changed to delete old one from Cloudinary
        if (currentAssignment.file_url && currentAssignment.file_url !== payload.file_url) {
          await deleteFromCloudinary(currentAssignment.file_url, 'raw');
        }

        // Update
        const { error } = await supabase
          .from('assignments')
          .update(payload)
          .eq('id', currentAssignment.id);
        if (error) throw error;

        // Update Questions
        // First delete old ones (simple approach)
        await supabase.from('assignment_questions').delete().eq('assignment_id', currentAssignment.id);
        
        if (questions.length > 0) {
          const questionsPayload = questions.map((q, index) => ({
            assignment_id: currentAssignment.id,
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

        // Send Notifications to students in the section
        try {
          const { data: students } = await supabase
            .from('students')
            .select('id')
            .eq('section_id', payload.section_id);

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

      await fetchAssignments();
      setIsModalOpen(false);
      setCurrentAssignment({});
      showNotification('success', 'تم حفظ الواجب بنجاح!');
    } catch (error: any) {
      console.error('Error saving assignment:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء حفظ الواجب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!assignmentToDelete) return;
    
    try {
      // Get the assignment to find its file_url
      const { data: assignment } = await supabase
        .from('assignments')
        .select('file_url')
        .eq('id', assignmentToDelete)
        .single();

      if (assignment?.file_url) {
        await deleteFromCloudinary(assignment.file_url, 'raw');
      }

      // Also delete student submissions files if any
      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select('file_url')
        .eq('assignment_id', assignmentToDelete);
      
      if (submissions && submissions.length > 0) {
        for (const sub of submissions) {
          if (sub.file_url) {
            await deleteFromCloudinary(sub.file_url);
          }
        }
      }

      const { error } = await supabase.from('assignments').delete().eq('id', assignmentToDelete);
      if (error) throw error;
      await fetchAssignments();
      showNotification('success', 'تم حذف الواجب بنجاح');
    } catch (error: any) {
      console.error('Error deleting assignment:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء حذف الواجب');
    } finally {
      setAssignmentToDelete(null);
    }
  };

  const openAddModal = async () => {
    // Set default due date to tomorrow at 8:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    
    // Format for datetime-local input (YYYY-MM-DDThh:mm)
    const formattedDate = new Date(tomorrow.getTime() - (tomorrow.getTimezoneOffset() * 60000))
      .toISOString()
      .slice(0, 16);

    const { data: { user } } = await supabase.auth.getUser();
    
    setCurrentAssignment({ due_date: formattedDate, teacher_id: user?.id });
    setQuestions([]);
    setIsModalOpen(true);
  };

  const openEditModal = async (assignment: Assignment) => {
    // Format date for datetime-local input
    const dateObj = new Date(assignment.due_date);
    const formattedDate = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000))
      .toISOString()
      .slice(0, 16);

    setCurrentAssignment({
      ...assignment,
      due_date: formattedDate
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

  const filteredAssignments = assignments.filter(a => 
    a.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.subjects?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.sections?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper to determine if an assignment is overdue
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
            {notification.type === 'success' ? <FileText className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
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
            placeholder="البحث بعنوان الواجب، المادة، أو الشعبة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
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
            const overdue = isOverdue(assignment.due_date);
            const dueDateObj = new Date(assignment.due_date);
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
                        {assignment.subjects?.name}
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
                            setNotification({ type: 'success', message: 'تم نسخ رابط الواجب' });
                          }}
                          className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100"
                          title="نسخ الرابط"
                        >
                          <Share2 className="h-5 w-5" />
                        </button>
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
                    )}
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-900 mb-3 line-clamp-2 group-hover:text-indigo-600 transition-colors tracking-tight leading-tight" title={assignment.title}>
                    {assignment.title}
                  </h3>
                  
                  <p className="text-slate-500 font-medium mb-6 line-clamp-3 leading-relaxed" title={assignment.description}>
                    {assignment.description || 'لا يوجد وصف'}
                  </p>
                  
                  <div className="space-y-3 mt-auto">
                    <div className="flex items-center text-sm font-bold text-slate-600 gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                      <Users className="h-5 w-5 text-indigo-500" />
                      <span>{assignment.sections?.classes?.name} - {assignment.sections?.name}</span>
                    </div>
                    <div className="flex items-center text-sm font-bold text-slate-600 gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                      <User className="h-5 w-5 text-emerald-500" />
                      <span>أ. {assignment.teachers?.users?.full_name}</span>
                    </div>
                  </div>
                </div>
                
                <div className={`px-8 py-4 border-t flex items-center justify-between ${overdue ? 'bg-red-50/50 border-red-100' : 'bg-slate-50/50 border-slate-100'}`}>
                  <div className={`flex items-center gap-2 text-sm font-black ${overdue ? 'text-red-600' : 'text-slate-700'}`}>
                    <Clock className="h-5 w-5" />
                    <span dir="ltr">
                      {dueDateObj.toLocaleDateString('ar-EG', { month: 'long', day: 'numeric' })} {dueDateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
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
                    className={`h-10 px-4 rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-2 active:scale-95 mr-auto ${
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
                onClick={confirmDelete}
                className="flex-1 rounded-2xl bg-red-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-red-100 hover:bg-red-700 hover:shadow-red-200 transition-all active:scale-95"
              >
                تأكيد الحذف
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Add/Edit Assignment Modal */}
      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 animate-in fade-in duration-300" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] rounded-4xl bg-white p-8 shadow-2xl focus:outline-none max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300" dir="rtl">
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
                    <label className="block text-sm font-black text-slate-700 mb-2 mr-1">الشعبة <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                        <Users className="h-5 w-5" />
                      </div>
                      <select 
                        required
                        className="block w-full rounded-2xl border-0 py-4 pr-12 pl-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold appearance-none"
                        value={currentAssignment.section_id || ''}
                        onChange={(e) => setCurrentAssignment({...currentAssignment, section_id: e.target.value})}
                      >
                        <option value="">اختر الشعبة</option>
                        {sections.map(s => (
                          <option key={s.id} value={s.id}>{s.classes?.name} - {s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-black text-slate-700 mb-2 mr-1">المعلم <span className="text-red-500">*</span></label>
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
                  <div>
                    <label className="block text-sm font-black text-slate-700 mb-2 mr-1">تاريخ ووقت التسليم <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                        <Calendar className="h-5 w-5" />
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

                <div className="pt-8 border-t border-slate-100">
                  <AssignmentBuilder questions={questions} onChange={setQuestions} />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
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
