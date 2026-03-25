'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { supabase } from '@/lib/supabase';
import { FileText, Clock, Link as LinkIcon, Users, User, CheckCircle, AlertCircle, ArrowRight, Upload, Edit2, Trash2, Settings, Share2, BarChart3, MoreVertical, Eye, X, Calendar, Download, FileSpreadsheet, Edit, ArrowLeft, GraduationCap, LayoutDashboard, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import AssignmentForm from '@/components/assignment-form';
import AssignmentBuilder from '@/components/assignment-builder';
import ImageUpload from '@/components/ImageUpload';
import Image from 'next/image';
import { Question } from '@/components/assignment-builder';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { deleteFromCloudinary } from '@/lib/cloudinary';

type Assignment = {
  id: string;
  title: string;
  description: string;
  due_date: string;
  file_url: string;
  subjects?: { name: string };
  sections?: { name: string; classes?: { name: string } };
  teachers?: { users?: { id: string; full_name: string } };
};

type Submission = {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string;
  file_url: string;
  status: string;
  grade: number;
  feedback: string;
  submitted_at: string;
  students?: { users?: { full_name: string } };
};

export default function AssignmentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const assignmentId = resolvedParams.id;
  
  const router = useRouter();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [myAnswers, setMyAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);

  // Management State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'submissions' | 'preview'>('submissions');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editData, setEditData] = useState<Partial<Assignment>>({});
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  // Submission Form State
  const [content, setContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const exportToExcel = () => {
    if (submissions.length === 0) return;
    
    const data = submissions.map(sub => {
      const student = sub.students as any;
      const section = student?.sections;
      const className = section?.classes?.name || '';
      const sectionName = section?.name || '';
      
      return {
        'اسم الطالب': student?.users?.full_name || 'غير معروف',
        'الصف': `${className} - ${sectionName}`,
        'تاريخ التسليم': sub.submitted_at ? format(new Date(sub.submitted_at), 'yyyy-MM-dd HH:mm') : '-',
        'الحالة': sub.status === 'graded' ? 'تم التصحيح' : 'قيد الانتظار',
        'الدرجة': sub.grade || '-'
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Submissions');
    XLSX.writeFile(wb, `submissions_${assignmentId}.xlsx`);
  };

  const exportToPDF = () => {
    if (submissions.length === 0) return;

    const doc = new jsPDF();
    doc.addFont('https://fonts.gstatic.com/s/amiri/v26/J7afpDI9z6hc06m3.ttf', 'Amiri', 'normal');
    doc.setFont('Amiri');
    
    doc.text('قائمة تسليمات الواجب', 105, 10, { align: 'center' });
    doc.text(`الواجب: ${assignment?.title}`, 105, 20, { align: 'center' });

    const tableData = submissions.map(sub => {
      const student = sub.students as any;
      const section = student?.sections;
      const className = section?.classes?.name || '';
      const sectionName = section?.name || '';

      return [
        sub.grade || '-',
        sub.status === 'graded' ? 'تم التصحيح' : 'قيد الانتظار',
        sub.submitted_at ? format(new Date(sub.submitted_at), 'yyyy-MM-dd HH:mm') : '-',
        `${className} - ${sectionName}`,
        student?.users?.full_name || 'غير معروف'
      ];
    });

    (doc as any).autoTable({
      head: [['الدرجة', 'الحالة', 'تاريخ التسليم', 'الصف', 'اسم الطالب']],
      body: tableData,
      startY: 30,
      styles: { font: 'Amiri', halign: 'right' },
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`submissions_${assignmentId}.pdf`);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);

      // Fetch user role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      const role = userData?.role || 'student';
      setUserRole(role);

      if (role === 'student') {
        const { data: studentData } = await supabase
          .from('students')
          .select('id')
          .eq('id', user.id)
          .single();
        setStudentId(studentData?.id || user.id);
      }

      // Fetch assignment details
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select(`
          id,
          title,
          description,
          due_date,
          file_url,
          subjects (name),
          sections (name, classes (name)),
          teachers (users (id, full_name))
        `)
        .eq('id', assignmentId)
        .single();

      if (assignmentError) throw assignmentError;
      setAssignment((assignmentData as unknown) as Assignment);
      setEditData(assignmentData as any);

      // Fetch questions
      const { data: qData } = await supabase
        .from('assignment_questions')
        .select('*')
        .eq('assignment_id', assignmentId)
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
      }

      // Fetch submissions based on role
      if (role === 'student') {
        // Fetch only my submission
        const { data: subData, error: subError } = await supabase
          .from('assignment_submissions')
          .select('*')
          .eq('assignment_id', assignmentId)
          .eq('student_id', user.id)
          .maybeSingle();
        
        if (!subError && subData) {
          setMySubmission(subData as Submission);
          setContent(subData.content || '');
          setFileUrl(subData.file_url || '');

          // Fetch answers
          const { data: answersData } = await supabase
            .from('assignment_answers')
            .select('*')
            .eq('submission_id', subData.id);
          
          if (answersData) {
            const answersMap: Record<string, any> = {};
            answersData.forEach(a => {
              answersMap[a.question_id] = a.selected_options || a.answer_text;
            });
            setMyAnswers(answersMap);
          }
        }
      } else if (role === 'teacher' || role === 'admin' || role === 'management') {
        // Fetch all submissions for this assignment
        const { data: subsData, error: subsError } = await supabase
          .from('assignment_submissions')
          .select(`
            *,
            students (
              users (full_name),
              sections (
                name,
                classes (name)
              )
            )
          `)
          .eq('assignment_id', assignmentId)
          .order('submitted_at', { ascending: false });
        
        if (!subsError && subsData) {
          setSubmissions(subsData as unknown as Submission[]);
        }
      }

      // Fetch form data for edit modal
      if (role === 'teacher' || role === 'admin' || role === 'management') {
        const [subjectsRes, sectionsRes, teachersRes] = await Promise.all([
          supabase.from('subjects').select('id, name').order('name'),
          supabase.from('sections').select('id, name, classes(name)').order('name'),
          supabase.from('teachers').select('id, users(full_name)')
        ]);
        setSubjects(subjectsRes.data || []);
        setSections((sectionsRes.data || []).map((s: any) => ({
          ...s,
          classes: Array.isArray(s.classes) ? s.classes[0] : s.classes
        })));
        setTeachers(teachersRes.data || []);
      }

    } catch (error: any) {
      console.error('Error fetching data:', error);
      // It's possible the table doesn't exist yet, so we catch the error gracefully
      if (error.code === '42P01') {
        console.warn('assignment_submissions table might not exist yet.');
      } else {
        showNotification('error', 'حدث خطأ أثناء جلب البيانات: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  }, [assignmentId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmitAnswers = async (answers: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      // 1. Create or Update Submission
      const submissionPayload = {
        assignment_id: assignmentId,
        student_id: studentId,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        content: content,
        file_url: fileUrl
      };

      let submissionId: string;
      if (mySubmission) {
        const { error } = await supabase
          .from('assignment_submissions')
          .update(submissionPayload)
          .eq('id', mySubmission.id);
        if (error) throw error;
        submissionId = mySubmission.id;
      } else {
        const { data: newSub, error } = await supabase
          .from('assignment_submissions')
          .insert([submissionPayload])
          .select()
          .single();
        if (error) throw error;
        submissionId = newSub.id;
      }

      // 2. Save Answers
      // Delete old answers
      await supabase.from('assignment_answers').delete().eq('submission_id', submissionId);

      const answersPayload = Object.entries(answers).map(([qId, value]) => {
        const question = questions.find(q => q.id === qId);
        const isMultiple = question?.type === 'multiple_choice' || question?.type === 'checkbox';
        return {
          submission_id: submissionId,
          question_id: qId,
          answer_text: isMultiple ? null : value,
          selected_options: isMultiple ? value : null
        };
      });

      const { error: answersError } = await supabase.from('assignment_answers').insert(answersPayload);
      if (answersError) throw answersError;

      // Notify teacher
      if (assignment?.teachers?.users?.id) {
        await supabase.from('notifications').insert([{
          user_id: assignment.teachers.users.id,
          type: 'assignment',
          title: 'تسليم واجب جديد',
          content: `قام الطالب بتسليم الواجب: ${assignment.title}`,
          link: `/assignments/${assignmentId}`,
          is_read: false
        }]);
      }

      showNotification('success', 'تم تسليم الواجب بنجاح!');
      await fetchData();
    } catch (error: any) {
      console.error('Error submitting assignment:', error);
      showNotification('error', 'حدث خطأ أثناء التسليم: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingEdit(true);
    try {
      const payload = {
        title: editData.title,
        description: editData.description || null,
        due_date: new Date(editData.due_date!).toISOString(),
      };

      const { error } = await supabase
        .from('assignments')
        .update(payload)
        .eq('id', assignmentId);

      if (error) throw error;

      // Update Questions
      const { error: deleteError } = await supabase.from('assignment_questions').delete().eq('assignment_id', assignmentId);
      if (deleteError) throw deleteError;

      if (questions.length > 0) {
        const questionsPayload = questions.map((q, index) => ({
          assignment_id: assignmentId,
          question_text: q.text,
          question_type: q.type,
          options: q.options || null,
          points: q.points,
          is_required: q.isRequired,
          order: index
        }));
        const { error: insertError } = await supabase.from('assignment_questions').insert(questionsPayload);
        if (insertError) throw insertError;
      }

      showNotification('success', 'تم تحديث الواجب بنجاح');
      setIsEditModalOpen(false);
      await fetchData();
    } catch (error: any) {
      showNotification('error', 'خطأ في التحديث: ' + error.message);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteAssignment = async () => {
    try {
      // 1. Delete assignment file from Cloudinary
      if (assignment?.file_url) {
        await deleteFromCloudinary(assignment.file_url);
      }

      // 2. Delete all submission files from Cloudinary
      if (submissions && submissions.length > 0) {
        for (const sub of submissions) {
          if (sub.file_url) {
            await deleteFromCloudinary(sub.file_url);
          }
        }
      }

      const { error } = await supabase.from('assignments').delete().eq('id', assignmentId);
      if (error) throw error;
      router.push('/assignments');
    } catch (error: any) {
      showNotification('error', 'خطأ في الحذف: ' + error.message);
    }
  };

  const copyAssignmentLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    showNotification('success', 'تم نسخ رابط الواجب');
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-32 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
        <p className="text-slate-500 font-bold animate-pulse">جاري تحميل التفاصيل...</p>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="text-center py-32">
        <h3 className="text-2xl font-black text-slate-900">الواجب غير موجود</h3>
        <Link href="/assignments" className="text-indigo-600 hover:underline mt-4 inline-block">العودة للواجبات</Link>
      </div>
    );
  }

  const dueDateObj = new Date(assignment.due_date);
  const isOverdue = dueDateObj < new Date();

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-24">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-50 px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 transition-all animate-in fade-in slide-in-from-top-4 duration-500 ${
          notification.type === 'success' ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-red-500 text-white shadow-red-100'
        }`}>
          <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center">
            {notification.type === 'success' ? <CheckCircle className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
          </div>
          <div className="font-black tracking-tight">{notification.message}</div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link href="/assignments" className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
            <ArrowRight className="h-6 w-6" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">{assignment.title}</h1>
              {new Date(assignment.due_date) < new Date() ? (
                <span className="px-3 py-1 bg-red-50 text-red-600 border border-red-100 rounded-full text-[10px] font-black uppercase tracking-wider">منتهي</span>
              ) : (
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-wider">نشط</span>
              )}
            </div>
            <p className="text-slate-500 font-medium mt-1">{assignment.subjects?.name} - {assignment.sections?.classes?.name} {assignment.sections?.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={copyAssignmentLink}
            className="h-12 px-4 rounded-2xl bg-white border border-slate-100 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-sm font-bold"
            title="نسخ الرابط"
          >
            <Share2 className="h-5 w-5" />
            <span className="hidden sm:inline">مشاركة</span>
          </button>

          {(userRole === 'teacher' || userRole === 'admin' || userRole === 'management') && (
            <>
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="h-12 px-6 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all flex items-center gap-2 font-black shadow-sm"
              >
                <Edit2 className="h-5 w-5" />
                <span>تعديل</span>
              </button>
              <button 
                onClick={() => setIsDeleteModalOpen(true)}
                className="h-12 w-12 flex items-center justify-center rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition-all shadow-sm"
                title="حذف"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Assignment Details Card */}
      <div className="glass-card rounded-4xl shadow-xl shadow-slate-200/50 border border-white/60 overflow-hidden">
        <div className="p-8">
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-black ${isOverdue ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'}`}>
              <Clock className="h-5 w-5" />
              <span>آخر موعد: {dueDateObj.toLocaleDateString('ar-EG', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-50 text-slate-600 border border-slate-100 text-sm font-bold">
              <User className="h-5 w-5 text-slate-400" />
              <span>أ. {assignment.teachers?.users?.full_name}</span>
            </div>
          </div>

          <div className="prose prose-slate max-w-none mb-8">
            <h3 className="text-xl font-bold text-slate-900 mb-4">وصف الواجب</h3>
            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{assignment.description || 'لا يوجد وصف إضافي.'}</p>
          </div>

          {assignment.file_url && (
            <div className="mt-8 p-6 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                  <FileText className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">الملف المرفق</h4>
                  <p className="text-sm text-slate-500">انقر للتحميل أو العرض</p>
                </div>
              </div>
              <a 
                href={assignment.file_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="h-12 px-6 rounded-2xl bg-indigo-600 text-sm font-black text-white shadow-sm hover:bg-indigo-700 transition-all flex items-center gap-2 active:scale-95"
              >
                <LinkIcon className="h-5 w-5" />
                <span>فتح الملف</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Student View: Submission Form */}
      {userRole === 'student' && (
        <div className="glass-card rounded-4xl shadow-xl shadow-slate-200/50 border border-white/60 overflow-hidden">
          <div className="p-8 border-b border-slate-100/50 bg-slate-50/50">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                <Upload className="h-6 w-6" />
              </div>
              تسليم الواجب
            </h2>
          </div>
          <div className="p-8">
            {mySubmission?.grade !== undefined && mySubmission?.grade !== null ? (
              <div className="mb-8 p-6 rounded-3xl bg-emerald-50 border border-emerald-100">
                <h3 className="text-lg font-bold text-emerald-800 mb-2">تم التقييم</h3>
                <p className="text-emerald-600 font-medium mb-4">لقد تم تقييم هذا الواجب من قبل المعلم.</p>
                <div className="flex items-center gap-4 mb-4">
                  <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-emerald-100 font-black text-emerald-700">
                    الدرجة: {mySubmission.grade}
                  </div>
                </div>
                {mySubmission.feedback && (
                  <div className="p-4 bg-white rounded-2xl border border-emerald-100">
                    <p className="text-sm font-bold text-emerald-800 mb-1">ملاحظات المعلم:</p>
                    <p className="text-slate-600">{mySubmission.feedback}</p>
                  </div>
                )}
              </div>
            ) : null}

            {questions.length > 0 ? (
              <AssignmentForm 
                questions={questions} 
                onSubmit={handleSubmitAnswers} 
                isSubmitting={isSubmitting}
                initialAnswers={myAnswers}
                readOnly={!!mySubmission}
              >
                <div className="glass-card p-8 rounded-4xl border border-white/60 shadow-xl shadow-slate-200/50">
                  <label className="block text-sm font-bold text-slate-700 mb-4">صورة الواجب (اختياري)</label>
                  {!mySubmission ? (
                    <ImageUpload
                      initialImageUrl={fileUrl}
                      onUploadSuccess={(url) => setFileUrl(url || '')}
                      label="اختر صورة الواجب"
                    />
                  ) : (
                    fileUrl && (
                      <div className="relative w-full h-48 mt-2">
                        <Image src={fileUrl} alt="Assignment" fill className="object-contain rounded-lg" referrerPolicy="no-referrer" />
                      </div>
                    )
                  )}
                </div>
              </AssignmentForm>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handleSubmitAnswers({}); }} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">نص الإجابة (اختياري إذا كان هناك ملف)</label>
                  <textarea
                    rows={6}
                    className="block w-full rounded-2xl border-0 py-4 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all resize-none"
                    placeholder="اكتب إجابتك هنا..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={!!mySubmission}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">صورة الواجب (اختياري)</label>
                  {!mySubmission ? (
                    <ImageUpload
                      initialImageUrl={fileUrl}
                      onUploadSuccess={(url) => setFileUrl(url || '')}
                      label="اختر صورة الواجب"
                    />
                  ) : (
                    fileUrl && (
                      <div className="relative w-full h-48 mt-2">
                        <Image src={fileUrl} alt="Assignment" fill className="object-contain rounded-lg" referrerPolicy="no-referrer" />
                      </div>
                    )
                  )}
                </div>

                {!mySubmission && (
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex justify-center items-center gap-2 rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <CheckCircle className="h-5 w-5" />
                      )}
                      تسليم الواجب
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* Teacher View: Submissions List & Preview */}
      {(userRole === 'teacher' || userRole === 'admin' || userRole === 'management') && (
        <div className="space-y-8">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
            <button 
              onClick={() => setActiveTab('submissions')}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'submissions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Users className="h-4 w-4" />
              التسليمات
            </button>
            <button 
              onClick={() => setActiveTab('preview')}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'preview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Eye className="h-4 w-4" />
              معاينة الطالب
            </button>
          </div>

          {activeTab === 'submissions' ? (
            <div className="glass-card rounded-4xl shadow-xl shadow-slate-200/50 border border-white/60 overflow-hidden">
              <div className="p-8 border-b border-slate-100/50 bg-slate-50/50 flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                  <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                    <Users className="h-6 w-6" />
                  </div>
                  تسليمات الطلاب
                </h2>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={exportToExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold border border-emerald-100 hover:bg-emerald-100 transition-all"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                  </button>
                  <button 
                    onClick={exportToPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-xl font-bold border border-red-100 hover:bg-red-100 transition-all"
                  >
                    <Download className="h-4 w-4" />
                    PDF
                  </button>
                  <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100 text-sm font-bold text-slate-600">
                    الإجمالي: {submissions.length}
                  </div>
                  <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl shadow-sm border border-emerald-100 text-sm font-bold">
                    تم التقييم: {submissions.filter(s => s.grade !== null).length}
                  </div>
                </div>
              </div>
              
              <div className="p-0">
                {submissions.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium">لم يقم أي طالب بتسليم الواجب حتى الآن.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {submissions.map((sub) => (
                      <div key={sub.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                              <User className="h-6 w-6" />
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 text-lg">{sub.students?.users?.full_name || 'طالب غير معروف'}</h3>
                              <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {new Date(sub.submitted_at).toLocaleString('ar-EG')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {sub.grade !== null && sub.grade !== undefined ? (
                              <div className="flex flex-col items-end">
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-black">
                                  الدرجة: {sub.grade}
                                </span>
                              </div>
                            ) : (
                              <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-xs font-black">
                                بانتظار التقييم
                              </span>
                            )}
                            <Link 
                              href={`/assignments/${assignmentId}/submissions/${sub.id}`}
                              className="h-10 px-6 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-black hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all flex items-center shadow-sm"
                            >
                              تقييم الإجابة
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              <div className="mb-8 p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700 text-sm font-bold flex items-center gap-3">
                <AlertCircle className="h-5 w-5" />
                هذه معاينة لما يراه الطالب. لن يتم حفظ أي إجابات تقوم بإدخالها هنا.
              </div>
              {questions.length > 0 ? (
                <AssignmentForm 
                  questions={questions} 
                  onSubmit={() => showNotification('success', 'هذه معاينة فقط، لم يتم حفظ الإجابة')} 
                  readOnly={false}
                />
              ) : (
                <div className="glass-card p-12 rounded-4xl border border-white/60 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
                    <FileText className="h-10 w-10 text-slate-300" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">لا توجد أسئلة</h3>
                  <p className="text-slate-500 font-bold">هذا الواجب لا يحتوي على أسئلة بعد. يمكنك إضافة أسئلة من خلال تعديل الواجب.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog.Root open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 animate-in fade-in duration-300" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-4xl bg-white p-8 shadow-2xl focus:outline-none animate-in zoom-in-95 duration-300" dir="rtl">
            <div className="h-16 w-16 bg-red-50 rounded-3xl flex items-center justify-center mb-6">
              <Trash2 className="h-8 w-8 text-red-500" />
            </div>
            <Dialog.Title className="text-2xl font-black text-slate-900 mb-2 tracking-tight">
              تأكيد الحذف
            </Dialog.Title>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">هل أنت متأكد من رغبتك في حذف هذا الواجب؟ لا يمكن التراجع عن هذا الإجراء وسيتم حذف جميع تسليمات الطلاب المرتبطة به.</p>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Dialog.Close asChild>
                <button className="flex-1 rounded-2xl bg-slate-50 px-6 py-4 text-sm font-black text-slate-700 hover:bg-slate-100 transition-all active:scale-95">
                  إلغاء
                </button>
              </Dialog.Close>
              <button
                onClick={handleDeleteAssignment}
                className="flex-1 rounded-2xl bg-red-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-red-100 hover:bg-red-700 hover:shadow-red-200 transition-all active:scale-95"
              >
                تأكيد الحذف
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Edit Assignment Modal */}
      <Dialog.Root open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 animate-in fade-in duration-300" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-3xl translate-x-[-50%] translate-y-[-50%] rounded-4xl bg-white p-8 shadow-2xl focus:outline-none max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300" dir="rtl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <Edit2 className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <Dialog.Title className="text-2xl font-black text-slate-900 tracking-tight">
                    تعديل الواجب
                  </Dialog.Title>
                  <p className="text-sm text-slate-500 font-bold">تعديل تفاصيل الواجب والأسئلة</p>
                </div>
              </div>
              <Dialog.Close className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-400 transition-colors">
                <X className="h-6 w-6" />
              </Dialog.Close>
            </div>
            
            <form onSubmit={handleUpdateAssignment} className="space-y-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2 mr-1">عنوان الواجب <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required
                    className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold"
                    value={editData.title || ''}
                    onChange={(e) => setEditData({...editData, title: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2 mr-1">الوصف والتفاصيل</label>
                  <textarea 
                    rows={4}
                    className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold resize-none"
                    value={editData.description || ''}
                    onChange={(e) => setEditData({...editData, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
                        value={editData.due_date ? new Date(new Date(editData.due_date).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ''}
                        onChange={(e) => setEditData({...editData, due_date: e.target.value})}
                      />
                    </div>
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
                  disabled={isSubmittingEdit}
                  className="rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-black text-white shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {isSubmittingEdit ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
