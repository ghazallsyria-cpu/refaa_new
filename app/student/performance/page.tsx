'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { 
  FileText, 
  PenTool, 
  TrendingUp, 
  Award, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  BookOpen,
  Calendar,
  GraduationCap,
  Eye,
  Filter,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// 🚀 دالة التحقق من القفل الزمني
const checkIsLocked = (examData: any) => {
  if (!examData?.exam_date) return false;
  const now = new Date();
  const examDate = new Date(examData.exam_date);
  const endTimeParts = (examData.end_time || '23:59').split(':');
  examDate.setHours(parseInt(endTimeParts[0], 10), parseInt(endTimeParts[1], 10), 0);
  return now <= examDate;
};

export default function StudentPerformancePage() {
  const router = useRouter();
  const { user, userRole, isChecking } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [studentData, setStudentData] = useState<any>(null);
  const [examAttempts, setExamAttempts] = useState<any[]>([]);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('all'); 
  
  const [stats, setStats] = useState({
    avgExamScore: 0,
    avgAssignmentScore: 0,
    completedExams: 0,
    completedAssignments: 0
  });

  const loadPerformanceData = useCallback(async () => {
    if (!user || userRole !== 'student') return;
    
    setIsLoading(true);
    try {
      let student = null;
      const { data: s1 } = await supabase.from('students').select('*, sections(name, classes(name))').eq('user_id', user.id).maybeSingle();
      if (s1) student = s1;
      else {
        const { data: s2 } = await supabase.from('students').select('*, sections(name, classes(name))').eq('id', user.id).maybeSingle();
        if (s2) student = s2;
      }

      if (!student) {
        setIsLoading(false);
        return;
      }

      // 🚀 تم إضافة exam_date و end_time للاستعلام لمعرفة وقت الانتهاء
      const [examsRes, assignmentsRes] = await Promise.all([
        supabase.from('exam_attempts')
          .select('*, exams(id, title, max_score, total_marks, exam_date, end_time, subjects(name))')
          .eq('student_id', student.id)
          .order('completed_at', { ascending: false }),
          
        supabase.from('assignment_submissions')
          .select('*, assignments(id, title, total_marks, subjects(name))')
          .eq('student_id', student.id)
          .order('submitted_at', { ascending: false })
      ]);

      const eAttempts = examsRes.data || [];
      const aSubmissions = assignmentsRes.data || [];

      // 🚀 استبعاد الاختبارات المحجوبة (التي لم ينته وقتها) من حساب المتوسط لكي لا يخمن الطالب النتيجة!
      const gradedExams = eAttempts.filter((a: any) => a.status === 'graded' && !checkIsLocked(a.exams));
      
      let avgExam = 0;
      if (gradedExams.length > 0) {
         let totalPercent = 0;
         gradedExams.forEach((a: any) => {
            const max = a.exams?.total_marks || a.exams?.max_score || 100;
            totalPercent += ((a.score || 0) / max) * 100;
         });
         avgExam = Math.round(totalPercent / gradedExams.length);
      }

      const gradedAssignments = aSubmissions.filter((a: any) => a.status === 'graded');
      let avgAss = 0;
      if (gradedAssignments.length > 0) {
         let totalPercent = 0;
         gradedAssignments.forEach((a: any) => {
            const max = a.assignments?.total_marks || 100;
            totalPercent += ((a.grade || 0) / max) * 100;
         });
         avgAss = Math.round(totalPercent / gradedAssignments.length);
      }

      setStudentData(student);
      setExamAttempts(eAttempts);
      setAssignmentSubmissions(aSubmissions);
      setStats({
        avgExamScore: avgExam,
        avgAssignmentScore: avgAss,
        completedExams: eAttempts.length,
        completedAssignments: aSubmissions.length
      });

    } catch (e) {
      console.error('Error fetching performance data:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user, userRole]);

  useEffect(() => {
    if (!isChecking) {
      if (!user) {
        router.push('/login');
      } else if (userRole !== 'student') {
        router.push('/dashboard');
      } else {
        loadPerformanceData();
      }
    }
  }, [user, userRole, isChecking, router, loadPerformanceData]);

  const uniqueSubjects = useMemo(() => {
    const subjects = new Set<string>();
    examAttempts.forEach(a => { if (a.exams?.subjects?.name) subjects.add(a.exams.subjects.name); });
    assignmentSubmissions.forEach(a => { if (a.assignments?.subjects?.name) subjects.add(a.assignments.subjects.name); });
    return Array.from(subjects);
  }, [examAttempts, assignmentSubmissions]);

  const filteredExams = useMemo(() => {
    if (selectedSubject === 'all') return examAttempts;
    return examAttempts.filter(a => a.exams?.subjects?.name === selectedSubject);
  }, [examAttempts, selectedSubject]);

  const filteredAssignments = useMemo(() => {
    if (selectedSubject === 'all') return assignmentSubmissions;
    return assignmentSubmissions.filter(a => a.assignments?.subjects?.name === selectedSubject);
  }, [assignmentSubmissions, selectedSubject]);

  if (isLoading || isChecking) {
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
    <div className="max-w-6xl mx-auto space-y-8 pb-20 p-4 sm:p-6 lg:p-8" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-50 text-indigo-600 text-xs font-black uppercase tracking-widest mb-4">
            <TrendingUp className="h-4 w-4" />
            سجل التميز
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">سجل الأداء الأكاديمي</h1>
          <p className="text-slate-500 mt-2 font-medium text-lg">
            متابعة شاملة لدرجاتك في الاختبارات والواجبات المدرسية
          </p>
        </div>
        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100 shrink-0">
          <div className="h-14 w-14 rounded-2xl bg-indigo-100 flex items-center justify-center">
            <GraduationCap className="h-7 w-7 text-indigo-600" />
          </div>
          <div className="flex flex-col pr-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">الصف الدراسي</span>
            <span className="text-base font-black text-slate-900">
              {studentData?.sections?.classes?.name} - {studentData?.sections?.name}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col gap-4 relative overflow-hidden group hover:shadow-lg transition-all">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full blur-2xl group-hover:bg-emerald-100 transition-all"></div>
          <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 relative z-10">
            <TrendingUp className="h-7 w-7" />
          </div>
          <div className="relative z-10">
            <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest">متوسط الاختبارات</p>
            <h3 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2">{stats.avgExamScore}%</h3>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col gap-4 relative overflow-hidden group hover:shadow-lg transition-all">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-50 rounded-full blur-2xl group-hover:bg-indigo-100 transition-all"></div>
          <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 relative z-10">
            <Award className="h-7 w-7" />
          </div>
          <div className="relative z-10">
            <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest">متوسط الواجبات</p>
            <h3 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2">{stats.avgAssignmentScore}%</h3>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col gap-4 relative overflow-hidden group hover:shadow-lg transition-all">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-50 rounded-full blur-2xl group-hover:bg-amber-100 transition-all"></div>
          <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 relative z-10">
            <FileText className="h-7 w-7" />
          </div>
          <div className="relative z-10">
            <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest">اختبارات منجزة</p>
            <h3 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2">{stats.completedExams}</h3>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col gap-4 relative overflow-hidden group hover:shadow-lg transition-all">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-violet-50 rounded-full blur-2xl group-hover:bg-violet-100 transition-all"></div>
          <div className="h-14 w-14 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600 relative z-10">
            <PenTool className="h-7 w-7" />
          </div>
          <div className="relative z-10">
            <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest">واجبات مسلمة</p>
            <h3 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2">{stats.completedAssignments}</h3>
          </div>
        </motion.div>
      </div>

      {/* Smart Filter Bar */}
      {uniqueSubjects.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide py-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl text-slate-500 font-bold text-sm shrink-0">
            <Filter className="w-4 h-4" /> تصفية بالمواد:
          </div>
          <button 
            onClick={() => setSelectedSubject('all')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm shrink-0 transition-all ${
              selectedSubject === 'all' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            جميع المواد
          </button>
          {uniqueSubjects.map((subject) => (
            <button 
              key={subject}
              onClick={() => setSelectedSubject(subject)}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm shrink-0 transition-all ${
                selectedSubject === subject ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {subject}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 🎯 Exams Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">نتائج الاختبارات</h2>
            </div>
            <div className="text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
              {filteredExams.length} اختبار
            </div>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredExams.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-white p-12 rounded-[2rem] border border-dashed border-slate-300 text-center">
                  <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                     <AlertCircle className="h-10 w-10 text-slate-300" />
                  </div>
                  <p className="text-slate-500 font-bold text-lg">لا توجد نتائج اختبارات مطابقة</p>
                </motion.div>
              ) : (
                filteredExams.map((attempt, idx) => {
                  const isPending = attempt.status === 'completed' || attempt.status === 'submitted'; 
                  const maxScore = attempt.exams?.total_marks || attempt.exams?.max_score || 100;
                  
                  // 🚀 فحص القفل للاختبار الحالي
                  const isLocked = checkIsLocked(attempt.exams);

                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.05 }}
                      key={attempt.id}
                    >
                      <Link href={`/exams/results/${attempt.exams?.id}/student/${studentData?.id}`} className="block">
                        <div className={`bg-white p-6 rounded-3xl shadow-sm border-2 transition-all group hover:-translate-y-1 hover:shadow-lg cursor-pointer flex flex-col sm:flex-row gap-5 justify-between items-start sm:items-center ${
                          isLocked ? 'border-slate-100 hover:border-slate-300' : isPending ? 'border-amber-100 hover:border-amber-300' : 'border-slate-100 hover:border-emerald-200'
                        }`}>
                          <div className="flex items-start gap-4">
                            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                              isLocked ? 'bg-slate-100 text-slate-400' : isPending ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600'
                            }`}>
                              {isLocked ? <Lock className="h-6 w-6" /> : <BookOpen className="h-7 w-7" />}
                            </div>
                            <div>
                              <h4 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight mb-2">
                                {attempt.exams?.title || 'اختبار غير معروف'}
                              </h4>
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="px-2.5 py-1 rounded-lg bg-slate-50 text-xs font-black text-slate-500 border border-slate-100">
                                  {attempt.exams?.subjects?.name || 'مادة عامة'}
                                </span>
                                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {attempt.completed_at ? format(new Date(attempt.completed_at), 'dd MMMM yyyy', { locale: ar }) : 'غير محدد'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4 sm:gap-2 mt-2 sm:mt-0 border-t sm:border-0 border-slate-50 pt-4 sm:pt-0">
                            {isLocked ? (
                              <div className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl border border-slate-200 flex items-center gap-2">
                                <Lock className="w-4 h-4" />
                                <span className="font-black text-sm">النتيجة محجوبة</span>
                              </div>
                            ) : isPending ? (
                              <div className="px-4 py-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 flex items-center gap-2">
                                <Clock className="w-4 h-4 animate-pulse" />
                                <span className="font-black text-sm">قيد التصحيح</span>
                              </div>
                            ) : (
                              <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 flex items-baseline gap-1">
                                <span className="font-black text-xl">{attempt.score || 0}</span>
                                <span className="font-bold text-xs opacity-70">/ {maxScore}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-sm bg-indigo-50 px-3 py-1.5 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                              <Eye className="w-4 h-4" /> التفاصيل
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 🎯 Assignments Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <PenTool className="h-5 w-5 text-violet-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">نتائج الواجبات</h2>
            </div>
            <div className="text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
              {filteredAssignments.length} واجب
            </div>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredAssignments.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-white p-12 rounded-[2rem] border border-dashed border-slate-300 text-center">
                   <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                     <AlertCircle className="h-10 w-10 text-slate-300" />
                  </div>
                  <p className="text-slate-500 font-bold text-lg">لا توجد نتائج واجبات مطابقة</p>
                </motion.div>
              ) : (
                filteredAssignments.map((submission, idx) => {
                  const isPending = submission.status === 'submitted' || submission.status === 'completed';
                  const maxScore = submission.assignments?.total_marks || 100;

                  return (
                    <motion.div 
                      layout
                      key={submission.id}
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.05 }}
                      className={`bg-white p-6 rounded-3xl shadow-sm border-2 transition-all flex flex-col gap-4 ${
                        isPending ? 'border-amber-100' : 'border-slate-100 hover:border-violet-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${
                            isPending ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-400'
                          }`}>
                            <PenTool className="h-7 w-7" />
                          </div>
                          <div>
                            <h4 className="text-lg font-black text-slate-900 leading-tight mb-2">{submission.assignments?.title || 'واجب غير معروف'}</h4>
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-50 text-xs font-black text-slate-500 border border-slate-100">
                                {submission.assignments?.subjects?.name || 'مادة عامة'}
                              </span>
                              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                {submission.submitted_at ? format(new Date(submission.submitted_at), 'dd MMMM yyyy', { locale: ar }) : 'غير محدد'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="w-full sm:w-auto flex justify-end">
                          {isPending ? (
                            <div className="px-4 py-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 flex items-center gap-2">
                              <Clock className="w-4 h-4 animate-pulse" />
                              <span className="font-black text-sm">بانتظار التقييم</span>
                            </div>
                          ) : (
                            <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 flex items-baseline gap-1">
                              <span className="font-black text-xl">{submission.grade || 0}</span>
                              <span className="font-bold text-xs opacity-70">/ {maxScore}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {submission.feedback && (
                        <div className="mt-2 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 relative">
                          <div className="absolute right-4 top-0 -mt-2 bg-white px-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                            ملاحظات المعلم
                          </div>
                          <p className="text-sm text-slate-700 font-bold leading-relaxed pt-2">{submission.feedback}</p>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

