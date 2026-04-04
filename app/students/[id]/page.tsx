'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { 
  User, GraduationCap, Calendar, Clock, BookOpen, 
  FileText, CheckCircle2, XCircle, AlertCircle, 
  TrendingUp, Award, ChevronRight, Activity, CalendarDays, ArrowLeft, SearchX, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import Image from 'next/image';
import GrantBadgeModal from '@/components/GrantBadgeModal';
import { cn } from '@/lib/utils';
import { useBadgesSystem } from '@/hooks/useBadgesSystem'; // 🚀 استيراد نظام الأوسمة
import * as Dialog from '@radix-ui/react-dialog'; // 🚀 استيراد نافذة الحوار للتأكيد

export default function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const studentId = resolvedParams.id;
  
  const router = useRouter();
  const { user, userRole } = useAuth();
  const { revokeBadge } = useBadgesSystem(); // 🚀 جلب دالة سحب الوسام
  
  const [student, setStudent] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [stats, setStats] = useState({ attendanceRate: 0, examsAvg: 0, assignmentsAvg: 0 });
  const [studentBadges, setStudentBadges] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'exams' | 'assignments'>('overview');
  
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [badgeToRevoke, setBadgeToRevoke] = useState<{ id: string, name: string } | null>(null); // 🚀 حالة الوسام المراد حذفه

  const fetchStudentData = useCallback(async () => {
    if (!user || !userRole) return;
    setLoading(true);
    setFetchError(null);

    try {
      const { data: studentData, error: studentErr } = await supabase
        .from('students')
        .select('*, users(full_name, avatar_url, email), sections(name, classes(name))')
        .eq('id', studentId)
        .maybeSingle();

      if (studentErr || !studentData) {
        setFetchError("تعذر العثور على بيانات الطالب أو أنك لا تملك صلاحية للوصول إليها.");
        setLoading(false);
        return;
      }
      setStudent(studentData);

      const { data: badgesData } = await supabase
        .from('student_badges')
        .select('*, badge:badges(*)')
        .eq('student_id', studentId)
        .order('granted_at', { ascending: false });

      if (badgesData) {
        setStudentBadges(badgesData);
      }

      let currentTeacherId = null;
      if (userRole === 'teacher') {
        const { data: teacherData } = await supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle();
        if (teacherData) currentTeacherId = teacherData.id;
      }

      let attendanceQuery = supabase
        .from('attendance_records')
        .select('*, subjects(name)')
        .eq('student_id', studentId)
        .order('date', { ascending: false });
      
      if (currentTeacherId) {
        attendanceQuery = attendanceQuery.eq('teacher_id', currentTeacherId);
      }
      const { data: attendanceData } = await attendanceQuery;
      setAttendance(attendanceData || []);

      const { data: examsData } = await supabase
        .from('exam_attempts')
        .select('id, score, status, completed_at, exams(id, title, max_score, total_marks, teacher_id, subjects(name))')
        .eq('student_id', studentId)
        .eq('status', 'graded')
        .order('completed_at', { ascending: false });

      let finalExams = examsData || [];
      if (currentTeacherId) {
        finalExams = finalExams.filter((e: any) => e.exams?.teacher_id === currentTeacherId);
      }
      setExams(finalExams);

      const { data: assignmentsData } = await supabase
        .from('assignment_submissions')
        .select('id, grade, status, submitted_at, feedback, assignments(id, title, total_marks, teacher_id, subjects(name), assignment_questions(points))')
        .eq('student_id', studentId)
        .eq('status', 'graded')
        .order('submitted_at', { ascending: false });

      let finalAssignments = assignmentsData || [];
      if (currentTeacherId) {
        finalAssignments = finalAssignments.filter((a: any) => a.assignments?.teacher_id === currentTeacherId);
      }
      setAssignments(finalAssignments);

      let attRate = 0;
      if (attendanceData && attendanceData.length > 0) {
        const presents = attendanceData.filter(a => a.status === 'present' || a.status === 'late').length;
        attRate = Math.round((presents / attendanceData.length) * 100);
      }

      let exAvg = 0;
      if (finalExams.length > 0) {
        let totalPct = 0;
        finalExams.forEach((e: any) => {
          const max = e.exams?.total_marks || e.exams?.max_score || 100;
          totalPct += ((e.score || 0) / max) * 100;
        });
        exAvg = Math.round(totalPct / finalExams.length);
      }

      let assAvg = 0;
      if (finalAssignments.length > 0) {
        let totalPct = 0;
        finalAssignments.forEach((a: any) => {
          const qs = a.assignments?.assignment_questions;
          const calcMax = Array.isArray(qs) ? qs.reduce((sum: number, q: any) => sum + (Number(q.points) || 0), 0) : 0;
          const max = calcMax > 0 ? calcMax : (a.assignments?.total_marks || 100);
          totalPct += ((a.grade || 0) / max) * 100;
        });
        assAvg = Math.round(totalPct / finalAssignments.length);
      }

      setStats({ attendanceRate: attRate, examsAvg: exAvg, assignmentsAvg: assAvg });

    } catch (error: any) {
      console.error('Error fetching student profile:', error);
      setFetchError(error.message || "حدث خطأ غير متوقع أثناء جلب البيانات.");
    } finally {
      setLoading(false);
    }
  }, [studentId, user, userRole]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  // 🚀 دالة تأكيد سحب الوسام
  const confirmRevokeBadge = async () => {
    if (!badgeToRevoke) return;
    try {
      const result = await revokeBadge(badgeToRevoke.id);
      if (result.success) {
        // تحديث القائمة محلياً لتجربة أسرع
        setStudentBadges(prev => prev.filter(b => b.id !== badgeToRevoke.id));
      } else {
        alert(result.error || 'حدث خطأ أثناء سحب الوسام');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setBadgeToRevoke(null); // إغلاق المودال
    }
  };

  const safeFormat = (dateStr: any, formatStr: string, fallback = '...') => {
    if (!dateStr) return fallback;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return fallback;
      return format(date, formatStr, { locale: arSA });
    } catch (e) {
      return fallback;
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-slate-500 font-bold animate-pulse tracking-widest">جاري تحميل ملف الطالب...</p>
        </div>
      </div>
    );
  }

  if (fetchError || !student) {
    return (
      <div className="flex h-screen items-center justify-center p-6" dir="rtl">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 text-center max-w-lg w-full">
          <div className="h-24 w-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
             <SearchX className="h-12 w-12 text-rose-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-3">الطالب غير موجود</h2>
          <p className="text-slate-500 font-bold mb-8 leading-relaxed">{fetchError || 'لم يتم العثور على بيانات هذا الطالب.'}</p>
          <button onClick={() => router.back()} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-slate-800 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
             <ArrowLeft className="w-5 h-5" /> العودة للوراء
          </button>
        </div>
      </div>
    );
  }

  const avatarUrl = student.users?.avatar_url;
  const fullName = student.users?.full_name || 'طالب';
  const classData = Array.isArray(student.sections?.classes) ? student.sections?.classes[0] : student.sections?.classes;
  const className = classData?.name || '';
  const sectionName = student.sections?.name || '';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8" dir="rtl">
      
      <div className="pt-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-slate-100 transition-all w-fit group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> العودة للقائمة
        </button>
      </div>

      <div className="relative overflow-hidden rounded-[2.5rem] sm:rounded-[3rem] bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 p-8 sm:p-12 text-white shadow-2xl shadow-slate-900/20">
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8 text-center md:text-right">
          
          <div className="relative group shrink-0">
            <div className="h-32 w-32 rounded-[2.5rem] overflow-hidden border-4 border-white/20 shadow-2xl bg-white/10 backdrop-blur-md flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
              {avatarUrl ? (
                <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl font-black text-white/70 drop-shadow-md">{fullName.charAt(0)}</span>
              )}
            </div>
            <div className="absolute bottom-2 left-2 w-6 h-6 bg-emerald-400 border-4 border-slate-900 rounded-full z-20 shadow-lg animate-pulse"></div>
          </div>

          <div className="pt-2 flex-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-3 backdrop-blur-sm shadow-sm">
              <User className="w-3.5 h-3.5 text-indigo-300" />
              <span>الملف الأكاديمي الشامل</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-3 tracking-tight drop-shadow-md">{fullName}</h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <span className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl text-sm font-bold backdrop-blur-md border border-white/10 shadow-inner">
                <GraduationCap className="w-4 h-4 text-indigo-300" /> {className} - شعبة {sectionName}
              </span>
              {(userRole === 'admin' || userRole === 'management') && student.national_id && (
                <span className="flex items-center gap-2 bg-rose-500/20 text-rose-100 px-4 py-2 rounded-xl text-sm font-bold backdrop-blur-md border border-rose-500/30 font-mono shadow-inner">
                  رقم مدني: {student.national_id}
                </span>
              )}
            </div>

            {(userRole === 'teacher' || userRole === 'admin' || userRole === 'management') && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsBadgeModalOpen(true)}
                className="mt-6 flex items-center justify-center sm:justify-start gap-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-6 py-3.5 rounded-2xl text-sm font-black shadow-xl shadow-amber-500/20 transition-all border border-amber-400/50 w-full sm:w-auto"
              >
                <Award className="w-5 h-5" />
                تتويج الطالب بوسام تميز
              </motion.button>
            )}
          </div>
        </div>

        {/* عرض الأوسمة مع خيار الحذف */}
        {studentBadges.length > 0 && (
          <div className="relative z-10 mt-10 pt-6 border-t border-white/10 w-full">
            <h3 className="text-sm sm:text-base font-bold text-indigo-200 mb-4 flex items-center gap-2 justify-center md:justify-start">
              <Award className="w-5 h-5 text-amber-400" /> لوحة الشرف: أوسمة التميز الحاصل عليها
            </h3>
            <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 custom-scrollbar mask-fade-edges">
              {studentBadges.map((badgeEntry, index) => (
                <div 
                  key={badgeEntry.id || index} 
                  className="flex-shrink-0 bg-white/5 backdrop-blur-md rounded-[2rem] p-5 border border-white/10 flex items-center gap-5 w-[22rem] sm:w-[24rem] hover:bg-white/10 transition-all duration-300 hover:shadow-2xl hover:shadow-white/5 group cursor-default relative overflow-hidden"
                >
                  {/* 🚀 زر الحذف المخفي يظهر عند المرور بالماوس لأصحاب الصلاحية */}
                  {(userRole === 'admin' || userRole === 'management' || userRole === 'teacher') && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setBadgeToRevoke({ id: badgeEntry.id, name: badgeEntry.badge?.name });
                      }}
                      className="absolute top-3 left-3 p-2 bg-rose-500/80 hover:bg-rose-600 text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 backdrop-blur-md"
                      title="سحب الوسام"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 group-hover:scale-110 transition-transform duration-500 flex items-center justify-center p-1">
                    <div className="absolute inset-0 bg-white/5 rounded-3xl blur-xl group-hover:bg-white/10 transition-colors"></div>
                    {badgeEntry.badge?.image_url ? (
                      <Image 
                        src={badgeEntry.badge.image_url} 
                        alt={badgeEntry.badge.name} 
                        fill 
                        unoptimized 
                        referrerPolicy="no-referrer" 
                        className="object-contain drop-shadow-2xl relative z-10" 
                      />
                    ) : (
                      <Award className="w-full h-full text-yellow-300 relative z-10 drop-shadow-lg p-2" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-right">
                    <p className="text-base sm:text-lg font-black text-white truncate">{badgeEntry.badge?.name}</p>
                    <p className="text-xs sm:text-sm font-bold text-indigo-200 line-clamp-2 mt-1 leading-tight" title={badgeEntry.reason}>
                      {badgeEntry.reason || 'تقديراً للجهود والتميز'}
                    </p>
                    <p className="text-[10px] sm:text-xs font-bold text-white/50 mt-2 bg-black/20 w-fit px-2.5 py-1 rounded-lg border border-white/5">
                      {format(new Date(badgeEntry.granted_at), 'd MMMM yyyy', { locale: arSA })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none"></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-lg hover:border-emerald-200 transition-all group">
          <div className="h-14 w-14 shrink-0 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm border border-emerald-100">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">نسبة الحضور</p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{stats.attendanceRate}%</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-lg hover:border-amber-200 transition-all group">
          <div className="h-14 w-14 shrink-0 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm border border-amber-100">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">متوسط الاختبارات</p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{stats.examsAvg}%</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-lg hover:border-indigo-200 transition-all group">
          <div className="h-14 w-14 shrink-0 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm border border-indigo-100">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">متوسط الواجبات</p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{stats.assignmentsAvg}%</p>
          </div>
        </div>
      </div>
      
      {userRole === 'teacher' && (
        <div className="flex items-center gap-3 bg-sky-50 text-sky-700 px-5 py-4 rounded-2xl text-xs sm:text-sm font-bold border border-sky-100 shadow-sm">
          <Activity className="w-6 h-6 shrink-0 animate-pulse" />
          هذه الإحصائيات والسجلات تعكس أداء الطالب في مقرراتك وحصصك الدراسية فقط للحفاظ على الخصوصية.
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100">
        {[
          { id: 'overview', label: 'نظرة عامة', icon: Activity },
          { id: 'attendance', label: 'سجل الغياب', icon: CalendarDays, count: attendance.length },
          { id: 'exams', label: 'الاختبارات', icon: FileText, count: exams.length },
          { id: 'assignments', label: 'الواجبات', icon: BookOpen, count: assignments.length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-[1.5rem] font-black text-sm transition-all whitespace-nowrap flex-1 sm:flex-none ${
              activeTab === tab.id 
                ? 'bg-slate-900 text-white shadow-lg' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && (
              <span className={`px-2 py-0.5 rounded-lg text-[10px] ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white/50 backdrop-blur-md rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
        <AnimatePresence mode="wait">
          
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-6 sm:p-8 space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shadow-sm"><Calendar className="w-5 h-5"/></div>
                    ملخص الغياب والتأخير
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center hover:shadow-md hover:border-emerald-200 transition-all">
                        <span className="text-4xl font-black text-emerald-600 block mb-2">{attendance.filter(a => a.status === 'present').length}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-lg">حضور كامل</span>
                     </div>
                     <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center hover:shadow-md hover:border-rose-200 transition-all">
                        <span className="text-4xl font-black text-rose-600 block mb-2">{attendance.filter(a => a.status === 'absent').length}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-lg">غياب</span>
                     </div>
                     <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center hover:shadow-md hover:border-amber-200 transition-all">
                        <span className="text-4xl font-black text-amber-600 block mb-2">{attendance.filter(a => a.status === 'late').length}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-lg">تأخير</span>
                     </div>
                     <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center hover:shadow-md hover:border-blue-200 transition-all">
                        <span className="text-4xl font-black text-blue-600 block mb-2">{attendance.filter(a => a.status === 'excused').length}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-lg">عذر مقبول</span>
                     </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 shadow-sm"><Award className="w-5 h-5"/></div>
                    ملخص الإنجاز الأكاديمي
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-white border border-slate-100 p-6 rounded-3xl flex items-center justify-between shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100 group-hover:scale-110 transition-transform"><FileText className="w-6 h-6"/></div>
                        <div>
                          <p className="font-black text-slate-900 text-lg">اختبارات تم تقييمها</p>
                          <p className="text-xs font-bold text-slate-500 mt-1">{exams.length} سجلات مقيمة</p>
                        </div>
                      </div>
                      <div className="text-2xl font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 shadow-inner">{stats.examsAvg}%</div>
                    </div>
                    <div className="bg-white border border-slate-100 p-6 rounded-3xl flex items-center justify-between shadow-sm hover:shadow-md hover:border-amber-200 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 border border-amber-100 group-hover:scale-110 transition-transform"><BookOpen className="w-6 h-6"/></div>
                        <div>
                          <p className="font-black text-slate-900 text-lg">واجبات تم تصحيحها</p>
                          <p className="text-xs font-bold text-slate-500 mt-1">{assignments.length} مهام منجزة</p>
                        </div>
                      </div>
                      <div className="text-2xl font-black text-amber-600 bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 shadow-inner">{stats.assignmentsAvg}%</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'attendance' && (
            <motion.div key="attendance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-6 sm:p-8">
              {attendance.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-300">
                   <CalendarDays className="w-14 h-14 text-slate-300 mx-auto mb-4" />
                   <p className="font-bold text-slate-500 text-lg">لا يوجد سجلات غياب مرصودة.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {attendance.map((record) => (
                    <div key={record.id} className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <p className="font-black text-slate-900 text-lg mb-2" dir="ltr">{format(new Date(record.date), 'dd MMM yyyy', { locale: arSA })}</p>
                          <p className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 shadow-inner">
                            <Clock className="w-3.5 h-3.5" /> الحصة {record.period}
                          </p>
                        </div>
                        <span className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm border ${
                          record.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          record.status === 'absent' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                          record.status === 'late' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          'bg-blue-50 text-blue-700 border-blue-100'
                        }`}>
                          {record.status === 'present' && <CheckCircle2 className="w-4 h-4" />}
                          {record.status === 'absent' && <XCircle className="w-4 h-4" />}
                          {record.status === 'late' && <Clock className="w-4 h-4" />}
                          {record.status === 'excused' && <AlertCircle className="w-4 h-4" />}
                          {record.status === 'present' ? 'حاضر' : record.status === 'absent' ? 'غائب' : record.status === 'late' ? 'متأخر' : 'مستأذن'}
                        </span>
                      </div>
                      <div className="pt-4 border-t border-slate-100 mt-auto">
                        <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
                           <BookOpen className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" /> {record.subjects?.name || 'مادة غير محددة'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'exams' && (
            <motion.div key="exams" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-6 sm:p-8">
              {exams.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-300">
                   <FileText className="w-14 h-14 text-slate-300 mx-auto mb-4" />
                   <p className="font-bold text-slate-500 text-lg">لا توجد اختبارات مقيمة للطالب حتى الآن.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {exams.map((attempt) => {
                    const maxScore = attempt.exams?.total_marks || attempt.exams?.max_score || 100;
                    const pct = Math.round((attempt.score / maxScore) * 100);
                    return (
                      <Link href={`/exams/results/${attempt.exams?.id}/student/${studentId}`} key={attempt.id} className="block group">
                        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all flex items-center justify-between">
                          <div className="flex items-center gap-5">
                            <div className="h-16 w-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100 group-hover:scale-110 transition-transform">
                              <FileText className="w-8 h-8" />
                            </div>
                            <div>
                              <h4 className="font-black text-slate-900 text-lg sm:text-xl mb-1.5 group-hover:text-indigo-600 transition-colors line-clamp-1">{attempt.exams?.title}</h4>
                              <p className="text-[11px] font-black text-slate-500 bg-slate-50 px-2 py-1 rounded-md inline-block mb-1 border border-slate-100 shadow-inner">{attempt.exams?.subjects?.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mt-1">{format(new Date(attempt.completed_at), 'dd MMM yyyy', { locale: arSA })}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end shrink-0 pl-2 border-l border-slate-100 pr-4">
                            <p className={`text-3xl font-black ${pct >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {attempt.score} <span className="text-sm font-bold opacity-60">/ {maxScore}</span>
                            </p>
                            <span className="flex items-center gap-1 mt-2 text-[10px] font-black text-white bg-slate-900 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                              استعراض <ChevronRight className="w-3 h-3 rotate-180" />
                            </span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'assignments' && (
            <motion.div key="assignments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-6 sm:p-8">
              {assignments.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-300">
                   <BookOpen className="w-14 h-14 text-slate-300 mx-auto mb-4" />
                   <p className="font-bold text-slate-500 text-lg">لا توجد واجبات مقيمة للطالب حتى الآن.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {assignments.map((submission) => {
                    const qs = submission.assignments?.assignment_questions;
                    const calcMax = Array.isArray(qs) ? qs.reduce((sum: number, q: any) => sum + (Number(q.points) || 0), 0) : 0;
                    const maxScore = calcMax > 0 ? calcMax : (submission.assignments?.total_marks || 100);
                    const pct = Math.round((submission.grade / maxScore) * 100);

                    return (
                      <Link href={`/assignments/${submission.assignments?.id}/submissions/${submission.id}`} key={submission.id} className="block group">
                        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm hover:shadow-lg hover:border-amber-300 transition-all flex flex-col h-full">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-5">
                              <div className="h-16 w-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 group-hover:scale-110 transition-transform">
                                <BookOpen className="w-8 h-8" />
                              </div>
                              <div>
                                <h4 className="font-black text-slate-900 text-lg sm:text-xl mb-1.5 group-hover:text-amber-600 transition-colors line-clamp-1">{submission.assignments?.title}</h4>
                                <p className="text-[11px] font-black text-slate-500 bg-slate-50 px-2 py-1 rounded-md inline-block border border-slate-100 shadow-inner">{submission.assignments?.subjects?.name}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end shrink-0 pl-2 border-l border-slate-100 pr-4">
                              <p className={`text-3xl font-black ${pct >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {submission.grade} <span className="text-sm font-bold opacity-60">/ {maxScore}</span>
                              </p>
                            </div>
                          </div>
                          
                          {submission.feedback && (
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative mt-auto shadow-inner">
                              <p className="text-sm font-bold text-slate-600 line-clamp-2"><span className="text-indigo-500 font-black">ملاحظتك:</span> {submission.feedback}</p>
                            </div>
                          )}
                          
                          <div className="mt-4 flex items-center justify-between text-left">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{format(new Date(submission.submitted_at), 'dd MMM yyyy', { locale: arSA })}</span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-white bg-slate-900 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                              عرض التصحيح <ChevronRight className="w-3 h-3 rotate-180" />
                            </span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* 🚀 استدعاء مكون نافذة منح الأوسمة */}
      {student && (
        <GrantBadgeModal
          isOpen={isBadgeModalOpen}
          onClose={() => setIsBadgeModalOpen(false)}
          recipientId={student.id}
          recipientName={student.users?.full_name || 'الطالب'}
          granterId={user?.id || ''}
          onSuccess={() => fetchStudentData()}
        />
      )}

      {/* 🚀 نافذة تأكيد سحب الوسام */}
      <Dialog.Root open={!!badgeToRevoke} onOpenChange={(open) => !open && setBadgeToRevoke(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100]" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-[101] w-[95vw] max-w-sm translate-x-[-50%] translate-y-[-50%] rounded-[3rem] bg-white p-8 text-center shadow-2xl" dir="rtl">
            <Dialog.Description className="sr-only">تأكيد سحب الوسام</Dialog.Description>
            <div className="mx-auto h-20 w-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6">
              <Trash2 className="h-10 w-10" />
            </div>
            <Dialog.Title className="text-2xl font-black text-slate-900 mb-3">سحب وإلغاء الوسام؟</Dialog.Title>
<p className="text-slate-500 mb-8 font-medium">
  هل أنت متأكد من سحب وسام{" "}
  <strong className="text-slate-800">
    &quot;{badgeToRevoke?.name}&quot;
  </strong>{" "}
  من هذا الطالب؟ سيختفي هذا الوسام من ملفه ولن يظهر بعد الآن.
</p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmRevokeBadge} className="w-full py-4 rounded-2xl bg-rose-500 text-white font-black hover:bg-rose-600 shadow-lg shadow-rose-500/20">نعم، اسحب الوسام</button>
              <Dialog.Close asChild>
                <button className="w-full py-4 rounded-2xl bg-slate-50 text-slate-600 font-black hover:bg-slate-100">تراجع وإلغاء</button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      
    </motion.div>
  );
}
