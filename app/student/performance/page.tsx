'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  FileText, 
  PenTool, 
  TrendingUp, 
  Award, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  BookOpen,
  Calendar,
  GraduationCap
} from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

export default function StudentPerformancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<any>(null);
  const [examAttempts, setExamAttempts] = useState<any[]>([]);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    avgExamScore: 0,
    avgAssignmentScore: 0,
    completedExams: 0,
    completedAssignments: 0
  });

  const fetchPerformanceData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Check role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (userData?.role !== 'student') {
        router.push('/dashboard');
        return;
      }

      // Fetch student info
      const { data: student } = await supabase
        .from('students')
        .select(`
          id,
          sections (name, classes (name))
        `)
        .eq('id', user.id)
        .single();
      
      setStudentData(student);

      // Fetch exam attempts
      console.log('Fetching exam attempts for user:', user.id);
      const { data: attempts, error: attemptsError } = await supabase
        .from('exam_attempts')
        .select(`
          id,
          score,
          status,
          completed_at,
          exams!inner (title, total_marks, max_score, subjects!inner (name))
        `)
        .eq('student_id', user.id)
        .order('completed_at', { ascending: false });

      if (attemptsError) {
        console.error('Error fetching exam attempts:', attemptsError);
      } else {
        console.log('Fetched attempts:', attempts);
      }
      setExamAttempts(attempts || []);

      // Fetch assignment submissions
      console.log('Fetching assignment submissions for user:', user.id);
      const { data: submissions, error: submissionsError } = await supabase
        .from('assignment_submissions')
        .select(`
          id,
          grade,
          feedback,
          submitted_at,
          status,
          assignments!inner (title, total_marks, subjects!inner (name))
        `)
        .eq('student_id', user.id)
        .order('submitted_at', { ascending: false });

      if (submissionsError) {
        console.error('Error fetching assignment submissions:', submissionsError);
      } else {
        console.log('Fetched submissions:', submissions);
      }
      setAssignmentSubmissions(submissions || []);

      // Calculate stats
      const gradedExams = attempts?.filter(a => a.status === 'graded' || a.status === 'completed') || [];
      const avgExam = gradedExams.length > 0 
        ? gradedExams.reduce((acc, curr) => acc + (curr.score || 0), 0) / gradedExams.length 
        : 0;

      const gradedAssignments = submissions?.filter(s => s.status === 'graded') || [];
      const avgAssignment = gradedAssignments.length > 0
        ? gradedAssignments.reduce((acc, curr) => acc + (curr.grade || 0), 0) / gradedAssignments.length
        : 0;

      setStats({
        avgExamScore: Math.round(avgExam),
        avgAssignmentScore: Math.round(avgAssignment),
        completedExams: attempts?.length || 0,
        completedAssignments: submissions?.length || 0
      });

    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchPerformanceData();
  }, [fetchPerformanceData]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-slate-500 font-bold animate-pulse">جاري تحميل سجل الأداء...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">سجل الأداء الأكاديمي</h1>
          <p className="text-slate-500 mt-1 font-medium">
            متابعة شاملة لدرجاتك في الاختبارات والواجبات المدرسية
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="flex flex-col pr-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">الصف الدراسي</span>
            <span className="text-sm font-black text-slate-900">
              {studentData?.sections?.classes?.name} - {studentData?.sections?.name}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white flex flex-col gap-4"
        >
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">متوسط الاختبارات</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.avgExamScore}%</h3>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white flex flex-col gap-4"
        >
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">متوسط الواجبات</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.avgAssignmentScore}%</h3>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white flex flex-col gap-4"
        >
          <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">اختبارات منجزة</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.completedExams}</h3>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white flex flex-col gap-4"
        >
          <div className="h-12 w-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600">
            <PenTool className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">واجبات مسلمة</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.completedAssignments}</h3>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Exams Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <FileText className="h-4 w-4 text-amber-600" />
              </div>
              <h2 className="text-xl font-black text-slate-900">نتائج الاختبارات</h2>
            </div>
          </div>

          <div className="space-y-4">
            {examAttempts.length === 0 ? (
              <div className="bg-white p-12 rounded-[2rem] border border-dashed border-slate-200 text-center">
                <AlertCircle className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500 font-bold">لا توجد نتائج اختبارات مسجلة حالياً</p>
              </div>
            ) : (
              examAttempts.map((attempt, idx) => (
                <motion.div 
                  key={attempt.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
                        <BookOpen className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900">{attempt.exams?.title}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{attempt.exams?.subjects?.name}</span>
                          <span className="text-[10px] text-slate-300">•</span>
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {attempt.completed_at ? format(new Date(attempt.completed_at), 'dd MMMM yyyy', { locale: ar }) : 'غير محدد'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-lg font-black text-indigo-600">
                        {attempt.score !== null ? `${attempt.score} / ${attempt.exams?.total_marks || attempt.exams?.max_score || 100}` : 'قيد التصحيح'}
                      </div>
                      <div className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${
                        attempt.status === 'graded' ? 'text-emerald-500' : 'text-amber-500'
                      }`}>
                        {attempt.status === 'graded' ? 'تم التصحيح' : 'مكتمل'}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Assignments Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <PenTool className="h-4 w-4 text-violet-600" />
              </div>
              <h2 className="text-xl font-black text-slate-900">نتائج الواجبات</h2>
            </div>
          </div>

          <div className="space-y-4">
            {assignmentSubmissions.length === 0 ? (
              <div className="bg-white p-12 rounded-[2rem] border border-dashed border-slate-200 text-center">
                <AlertCircle className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500 font-bold">لا توجد نتائج واجبات مسجلة حالياً</p>
              </div>
            ) : (
              assignmentSubmissions.map((submission, idx) => (
                <motion.div 
                  key={submission.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-violet-50 group-hover:text-violet-600 transition-colors">
                        <PenTool className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900">{submission.assignments?.title}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{submission.assignments?.subjects?.name}</span>
                          <span className="text-[10px] text-slate-300">•</span>
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {submission.submitted_at ? format(new Date(submission.submitted_at), 'dd MMMM yyyy', { locale: ar }) : 'غير محدد'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-lg font-black text-indigo-600">
                        {submission.grade !== null ? `${submission.grade} / ${submission.assignments?.total_marks || 100}` : 'لم يتم التقييم'}
                      </div>
                      <div className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${
                        submission.status === 'graded' ? 'text-emerald-500' : 'text-amber-500'
                      }`}>
                        {submission.status === 'graded' ? 'تم التقييم' : 'تم التسليم'}
                      </div>
                    </div>
                  </div>
                  {submission.feedback && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ملاحظات المعلم:</p>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed">{submission.feedback}</p>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
