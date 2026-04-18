/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, Save, CheckCircle2, XCircle, Clock, AlertCircle, Users, LayoutGrid, Info, ShieldCheck, BookOpen, UserMinus, BarChart2, Bug, RefreshCw, Calculator, Layers, PieChart, ChevronDown, Loader2, BookType } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabase'; 
import { useAttendanceSystem, AttendanceStatus } from '@/hooks/useAttendanceSystem';
import { useAuth } from '@/context/auth-context';
import TeacherCheckInButton from '@/components/TeacherCheckInButton';

// 🚀 الألوان متوافقة مع الستايل الليلي الزجاجي
const ATTENDANCE_OPTIONS = [
  { status: 'present', icon: CheckCircle2, label: 'حاضر', mobileLabel: 'حاضر', activeClasses: 'bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]', inactiveClasses: 'bg-[#090b14]/50 border-white/10 text-slate-400 hover:border-emerald-400/50 hover:bg-[#131836]' },
  { status: 'absent', icon: XCircle, label: 'غائب', mobileLabel: 'غائب', activeClasses: 'bg-rose-500/20 border-rose-400 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]', inactiveClasses: 'bg-[#090b14]/50 border-white/10 text-slate-400 hover:border-rose-400/50 hover:bg-[#131836]' },
  { status: 'late', icon: Clock, label: 'متأخر', mobileLabel: 'تأخر', activeClasses: 'bg-amber-500/20 border-amber-400 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]', inactiveClasses: 'bg-[#090b14]/50 border-white/10 text-slate-400 hover:border-amber-400/50 hover:bg-[#131836]' },
  { status: 'excused', icon: AlertCircle, label: 'مستأذن', mobileLabel: 'عذر', activeClasses: 'bg-blue-500/20 border-blue-400 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]', inactiveClasses: 'bg-[#090b14]/50 border-white/10 text-slate-400 hover:border-blue-400/50 hover:bg-[#131836]' }
];

export default function AttendancePage() {
  const { user, authRole, userRole, isChecking } = useAuth() as any; 
  const currentRole = authRole || userRole;

  const { sections, daySchedule, loading: systemLoading, fetchDaySchedule, fetchSections, fetchStudentsAndAttendance, saveAttendance } = useAttendanceSystem();

  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [period, setPeriod] = useState<number>(1);
  const [lessonTitle, setLessonTitle] = useState<string>(''); // 🚀 حقل عنوان الدرس
  
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [stats, setStats] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [studentStats, setStudentStats] = useState<any>({ present: 0, absent: 0, late: 0, excused: 0, fullDaysAbsent: 0 });
  const [subjectStats, setSubjectStats] = useState<any[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<any[]>([]);
  const [isStudentLoading, setIsStudentLoading] = useState(false);
  const [studentDbError, setStudentDbError] = useState<string | null>(null);
  const [activeSubjectTab, setActiveSubjectTab] = useState<string | null>(null);

  useEffect(() => { setDate(new Date().toISOString().split('T')[0]); }, []);

  useEffect(() => {
    if (date && currentRole !== 'student') {
      fetchDaySchedule(date).then((schedule) => {
        if (schedule && schedule.length > 0) {
          setPeriod(prevPeriod => {
             const isCurrentPeriodScheduled = schedule.some(s => s.period === prevPeriod);
             if (!isCurrentPeriodScheduled) return schedule[0].period;
             return prevPeriod;
          });
        }
      });
    }
  }, [date, currentRole, fetchDaySchedule]);

  useEffect(() => {
    if (date && period && currentRole !== 'student') {
      fetchSections(date, period).then(sectionsData => {
        if (sectionsData && sectionsData.length > 0) {
          setSelectedSection(sectionsData[0].id);
          setSelectedSubject(sectionsData[0].subject_id || '');
        } else { setSelectedSection(''); setSelectedSubject(''); setStudents([]); setLessonTitle(''); }
      });
    }
  }, [date, period, fetchSections, currentRole]);

  const loadStudentsAndAttendance = useCallback(async () => {
    if (selectedSection && date && currentRole !== 'student') {
      const res = await fetchStudentsAndAttendance(selectedSection, selectedSubject, date, period);
      if (res) {
        const sortedStudents = [...res.students].sort((a: any, b: any) => {
          const userA = Array.isArray(a.users) ? a.users[0] : a.users;
          const userB = Array.isArray(b.users) ? b.users[0] : b.users;
          return (userA?.full_name || '').localeCompare(userB?.full_name || '', 'ar'); 
        });
        setStudents(sortedStudents);
        setAttendance(res.attendance);
        setStats(res.stats);
        setLessonTitle(res.savedLessonTitle || ''); // تحميل عنوان الدرس إن وجد مسبقاً
      }
    }
  }, [selectedSection, selectedSubject, date, period, fetchStudentsAndAttendance, currentRole]);

  useEffect(() => { loadStudentsAndAttendance(); }, [loadStudentsAndAttendance]);

  const fetchStudentDataDirectly = useCallback(async () => {
    if (currentRole !== 'student' || !user) return;
    setIsStudentLoading(true); setStudentDbError(null);
    try {
      const { data: studentData, error: stuErr } = await supabase.from('students').select('id, sections(name, classes(name))').eq('id', user.id).maybeSingle();
      if (stuErr) throw new Error("خطأ في جلب بيانات الطالب: " + stuErr.message);
      if (!studentData) throw new Error("تعذر إيجاد ملف الطالب المرتبط بهذا الحساب.");

      const sec: any = studentData.sections;
      const secObj = Array.isArray(sec) ? sec[0] : sec;
      const className = (Array.isArray(secObj?.classes) ? secObj?.classes[0] : secObj?.classes)?.name || '';
      const fullClassName = className ? `${className} - ${secObj?.name || ''}` : 'فصل الطالب';

      const { data: records, error: recErr } = await supabase.from('attendance_records').select(`id, date, period, status, subjects(name), teachers(users(full_name))`).eq('student_id', studentData.id).order('date', { ascending: false }).order('period', { ascending: false });
      if (recErr) throw new Error("خطأ في قاعدة بيانات السجلات: " + recErr.message);

      if (records) {
        const calculatedStats = { present: 0, absent: 0, late: 0, excused: 0, fullDaysAbsent: 0 };
        const subjectsMap = new Map<string, any>();
        const enrichedRecords: any[] = [];

        records.forEach((r: any) => {
          if (r.status === 'present') calculatedStats.present++; else if (r.status === 'absent') calculatedStats.absent++; else if (r.status === 'late') calculatedStats.late++; else if (r.status === 'excused') calculatedStats.excused++;
          const subjName = (Array.isArray(r.subjects) ? r.subjects[0]?.name : r.subjects?.name) || 'مادة غير محددة';
          const teacherName = (Array.isArray(r.teachers) ? r.teachers[0]?.users?.full_name : r.teachers?.users?.full_name) || 'معلم';

          if (!subjectsMap.has(subjName)) subjectsMap.set(subjName, { name: subjName, present: 0, absent: 0, late: 0, excused: 0 });
          const sStats = subjectsMap.get(subjName);
          if (r.status === 'present') sStats.present++; else if (r.status === 'absent') sStats.absent++; else if (r.status === 'late') sStats.late++; else if (r.status === 'excused') sStats.excused++;

          if (r.status !== 'present') enrichedRecords.push({ ...r, displayClassName: fullClassName, subjectName: subjName, teacherName: teacherName });
        });
        calculatedStats.fullDaysAbsent = Math.floor(calculatedStats.absent / 5);
        setStudentStats(calculatedStats); setSubjectStats(Array.from(subjectsMap.values()).sort((a, b) => b.absent - a.absent)); setStudentAttendance(enrichedRecords);
      }
    } catch (error: any) { setStudentDbError(error.message); } finally { setIsStudentLoading(false); }
  }, [currentRole, user]);

  useEffect(() => { fetchStudentDataDirectly(); }, [fetchStudentDataDirectly]);

  const groupedAttendanceRecords = useMemo(() => {
    return studentAttendance.reduce((acc, record) => {
      if (!acc[record.subjectName]) acc[record.subjectName] = [];
      acc[record.subjectName].push(record);
      return acc;
    }, {} as Record<string, any[]>);
  }, [studentAttendance]);

  useEffect(() => { if (Object.keys(groupedAttendanceRecords).length > 0 && !activeSubjectTab) setActiveSubjectTab(Object.keys(groupedAttendanceRecords)[0]); }, [groupedAttendanceRecords, activeSubjectTab]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => { setAttendance(prev => ({ ...prev, [studentId]: status })); };

  const handleSave = async () => {
    setSaving(true); setMessage({ text: '', type: '' });
    try {
      await saveAttendance(selectedSection, selectedSubject, date, period, attendance, students, lessonTitle); // 🚀 تمرير عنوان الدرس
      setMessage({ text: 'تم حفظ سجل الحضور والغياب بنجاح!', type: 'success' });
      loadStudentsAndAttendance(); 
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    } catch (error: any) {
      setMessage({ text: error.message || 'حدث خطأ مجهول', type: 'error' });
      setTimeout(() => setMessage({ text: '', type: '' }), 8000);
    } finally { setSaving(false); }
  };

  const markAllAs = (status: AttendanceStatus) => { const newAttendance = { ...attendance }; students.forEach(s => { newAttendance[s.id] = status; }); setAttendance(newAttendance); };

  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#090b14]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
          <p className="text-slate-400 font-bold animate-pulse">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  const totalStudents = students.length;
  const presentCount = Object.values(attendance).filter(v => v === 'present').length;
  const absentCount = Object.values(attendance).filter(v => v === 'absent').length;
  const lateCount = Object.values(attendance).filter(v => v === 'late').length;
  const excusedCount = Object.values(attendance).filter(v => v === 'excused').length;
  const markedCount = presentCount + absentCount + lateCount + excusedCount;
  const unmarkedCount = totalStudents - markedCount;
  const attendanceRate = totalStudents > 0 ? Math.round(((presentCount + lateCount) / totalStudents) * 100) : 0;

  // ==========================================
  // 🚀 STUDENT VIEW (Dark Glassmorphism)
  // ==========================================
  if (currentRole === 'student') {
    return (
      <div className="min-h-screen relative bg-[#090b14] text-slate-200 pb-32 overflow-x-hidden font-cairo" dir="rtl">
        <div className="fixed top-1/4 right-[-10%] w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-[140px] pointer-events-none z-0" />
        <div className="fixed bottom-0 left-[-10%] w-[600px] h-[600px] bg-emerald-500/15 rounded-full blur-[140px] pointer-events-none z-0" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 sm:space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-8">
          {/* Header */}
          <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 p-6 sm:p-12 text-white shadow-[0_0_40px_rgba(79,70,229,0.3)]">
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-right">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-3 backdrop-blur-sm">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-300" /> السجل الأكاديمي الشامل
                </div>
                <h1 className="text-3xl sm:text-5xl font-black mb-2 tracking-tight drop-shadow-md">سجل الحضور والغياب</h1>
                <p className="text-indigo-100 text-xs sm:text-lg font-bold opacity-90 max-w-xl mx-auto sm:mx-0">متابعة دقيقة لغيابك موزعة حسب المواد والحصص، مع الحساب التلقائي.</p>
              </div>
              <div className="h-20 w-20 sm:h-32 sm:w-32 bg-white/10 backdrop-blur-md rounded-full border-4 border-white/20 flex items-center justify-center shadow-xl shrink-0">
                <PieChart className="h-8 w-8 sm:h-14 sm:w-14 text-white drop-shadow-md" />
              </div>
            </div>
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
          </div>

          {/* Equation */}
          <div className="bg-[#131836]/60 backdrop-blur-2xl p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.1)] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              <div className="p-3 sm:p-4 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-2xl shadow-inner shrink-0">
                <Calculator className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <div>
                <h3 className="text-lg sm:text-2xl font-black text-white leading-tight mb-1">المعادلة الرسمية لمعايرة الغياب</h3>
                <p className="text-[10px] sm:text-sm font-bold text-rose-300">حسب اللائحة: كل <strong>(5) حصص غياب منفصلة</strong> تُسجل كـ <strong>(1) يوم غياب كامل</strong>.</p>
              </div>
            </div>
            <div className="bg-[#090b14]/80 p-4 sm:p-5 rounded-[1.5rem] border border-white/10 flex items-center gap-6 shrink-0 w-full md:w-auto justify-center shadow-inner">
              <div className="text-center"><p className="text-3xl sm:text-4xl font-black text-rose-400">{studentStats.absent}</p><p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">حصص غياب</p></div>
              <div className="text-slate-600 font-black text-2xl">÷ 5 =</div>
              <div className="text-center"><p className="text-3xl sm:text-4xl font-black text-white">{studentStats.fullDaysAbsent}</p><p className="text-[9px] sm:text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-1">أيام فعلية</p></div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <div className="bg-[#131836]/60 backdrop-blur-2xl p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-white/10 flex flex-col items-center text-center shadow-lg group">
              <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-3"><CheckCircle2 className="h-5 w-5 sm:h-7 sm:w-7" /></div>
              <p className="text-3xl sm:text-4xl font-black text-white">{studentStats.present}</p><p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mt-1">حضور</p>
            </div>
            <div className="bg-[#131836]/60 backdrop-blur-2xl p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-white/10 flex flex-col items-center text-center shadow-lg group">
              <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mb-3"><XCircle className="h-5 w-5 sm:h-7 sm:w-7" /></div>
              <p className="text-3xl sm:text-4xl font-black text-white">{studentStats.absent}</p><p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mt-1">غياب</p>
            </div>
            <div className="bg-[#131836]/60 backdrop-blur-2xl p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-white/10 flex flex-col items-center text-center shadow-lg group">
              <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-3"><Clock className="h-5 w-5 sm:h-7 sm:w-7" /></div>
              <p className="text-3xl sm:text-4xl font-black text-white">{studentStats.late}</p><p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mt-1">تأخير</p>
            </div>
            <div className="bg-[#131836]/60 backdrop-blur-2xl p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-white/10 flex flex-col items-center text-center shadow-lg group">
              <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mb-3"><AlertCircle className="h-5 w-5 sm:h-7 sm:w-7" /></div>
              <p className="text-3xl sm:text-4xl font-black text-white">{studentStats.excused}</p><p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mt-1">عذر</p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ==========================================
  // 🚀 TEACHER / ADMIN VIEW (Dark Glassmorphism)
  // ==========================================
  return (
    <div className="min-h-screen relative bg-[#090b14] text-slate-200 pb-32 overflow-x-hidden font-cairo" dir="rtl">
      
      {/* Background Blobs */}
      <div className="fixed top-1/4 right-[-10%] w-[500px] h-[500px] bg-emerald-500/15 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-0 left-[-10%] w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none z-0" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pt-8 px-4 sm:px-6 lg:px-8 relative z-10">
        
        <AnimatePresence>
          {message.text && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] font-bold text-white flex items-center gap-3 border backdrop-blur-md w-[90%] sm:w-auto ${message.type === 'success' ? 'bg-emerald-500/80 border-emerald-400' : 'bg-rose-500/80 border-rose-400'}`}>
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />} {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6 bg-[#131836]/60 backdrop-blur-2xl p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-white/10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] sm:text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">
              <LayoutGrid className="w-3.5 h-3.5" /> تسجيل الغياب اليومي
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mb-2 drop-shadow-md">لوحة رصد الحضور</h1>
            <p className="text-xs sm:text-sm text-slate-400 font-bold">يتم حفظ لقطة إحصائية متكاملة للإدارة عند الاعتماد.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <Link href="/attendance/reports" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-5 py-4 text-xs sm:text-sm font-black text-white hover:bg-white/10 transition-all active:scale-95 shrink-0">
              <BarChart2 className="h-5 w-5 text-indigo-400" /> الإحصائيات
            </Link>
            
            <button onClick={handleSave} disabled={saving || students.length === 0 || (!lessonTitle && currentRole === 'teacher')} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-4 text-xs sm:text-sm font-black text-slate-900 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 shrink-0">
              {saving ? <div className="h-5 w-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div> : <Save className="h-5 w-5" />}
              {saving ? 'جاري الحفظ...' : 'اعتماد السجل'}
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-[#131836]/60 backdrop-blur-2xl p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-white/10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            
            <div className="space-y-2">
              <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">التاريخ</label>
              <div className="relative group">
                <Calendar className="absolute inset-y-0 right-4 h-full w-5 text-slate-500 pointer-events-none" />
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-2xl border-0 py-3.5 pr-12 pl-4 text-white bg-[#090b14]/80 ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-emerald-400 text-sm font-bold outline-none" style={{ colorScheme: 'dark' }} />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">الحصة</label>
              <div className="relative group">
                <Clock className="absolute inset-y-0 right-4 h-full w-5 text-slate-500 pointer-events-none" />
                <select value={period} onChange={(e) => setPeriod(parseInt(e.target.value))} className="w-full rounded-2xl border-0 py-3.5 pr-12 pl-4 text-white bg-[#090b14]/80 ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-emerald-400 text-sm font-bold outline-none appearance-none [&>option]:bg-[#131836]">
                  {currentRole === 'teacher' ? (daySchedule.length > 0 ? daySchedule.map(s => <option key={s.period} value={s.period}>الحصة {s.period}</option>) : <option value={1}>لا توجد حصص</option>) : ([1, 2, 3, 4, 5, 6, 7].map(p => <option key={p} value={p}>الحصة {p}</option>))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">الفصل والمادة</label>
              <div className="relative group">
                <BookOpen className="absolute inset-y-0 right-4 h-full w-5 text-slate-500 pointer-events-none" />
                {sections.length > 0 ? (
                  <select value={`${selectedSection}${selectedSubject ? `-${selectedSubject}` : ''}`} onChange={(e) => { const parts = e.target.value.split('-'); setSelectedSection(parts[0]); setSelectedSubject(parts[1] || ''); }} className="w-full rounded-2xl border-0 py-3.5 pr-12 pl-4 text-white bg-[#090b14]/80 ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-emerald-400 text-sm font-bold outline-none appearance-none [&>option]:bg-[#131836]">
                    {sections.map((s, idx) => <option key={`${s.id}-${s.subject_id || idx}`} value={`${s.id}${s.subject_id ? `-${s.subject_id}` : ''}`}>{(s as any).classes?.[0]?.name || (s as any).classes?.name} - {s.name} {s.subject_name ? `(${s.subject_name})` : ''}</option>)}
                  </select>
                ) : (
                  <div className="w-full rounded-2xl border-0 py-3.5 pr-12 pl-4 text-rose-400 bg-rose-500/10 ring-1 ring-inset ring-rose-500/30 text-sm font-bold">لا توجد فصول</div>
                )}
              </div>
            </div>

            {/* 🚀 حقل عنوان الدرس الإجباري */}
            <div className="space-y-2">
              <label className="text-[10px] sm:text-xs font-black text-emerald-400 uppercase tracking-widest pl-2 flex items-center gap-1">عنوان الدرس <span className="text-rose-500">*</span></label>
              <div className="relative group">
                <BookType className="absolute inset-y-0 right-4 h-full w-5 text-slate-500 pointer-events-none" />
                <input 
                   type="text" 
                   required
                   placeholder="مثال: قوانين نيوتن..." 
                   value={lessonTitle} 
                   onChange={(e) => setLessonTitle(e.target.value)} 
                   className="w-full rounded-2xl border-0 py-3.5 pr-12 pl-4 text-white bg-[#090b14]/80 ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-emerald-400 text-sm font-bold outline-none placeholder:text-slate-600 transition-all" 
                />
              </div>
            </div>

          </div>

          {selectedSection && selectedSubject && (
            <div className="mt-6 pt-5 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-2 text-emerald-400/80 text-sm font-bold">
                <Info className="w-5 h-5 shrink-0" />
                <span>أنت تسجل الغياب لـ <strong>الحصة {period}</strong>. يرجى التأكد من كتابة عنوان الدرس لاعتماده في الإدارة.</span>
              </div>
              {currentRole === 'teacher' && user?.id && (
                 <TeacherCheckInButton teacherId={user.id} periodNumber={period} selectedDate={date} className="w-full sm:w-auto" />
              )}
            </div>
          )}
        </div>

        {/* Stats Row */}
        {students.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-[#131836]/60 backdrop-blur-md p-5 rounded-[1.5rem] border border-white/5 flex flex-col justify-center items-center text-center shadow-lg">
              <Users className="h-6 w-6 text-indigo-400 mb-2" /><p className="text-2xl font-black text-white">{totalStudents}</p><p className="text-[10px] font-bold text-slate-400 uppercase mt-1">الطلاب</p>
            </div>
            <div className="bg-[#131836]/60 backdrop-blur-md p-5 rounded-[1.5rem] border border-white/5 flex flex-col justify-center items-center text-center shadow-lg">
              <CheckCircle2 className="h-6 w-6 text-emerald-400 mb-2" /><p className="text-2xl font-black text-white">{presentCount}</p><p className="text-[10px] font-bold text-emerald-500/70 uppercase mt-1">حاضر</p>
            </div>
            <div className="bg-[#131836]/60 backdrop-blur-md p-5 rounded-[1.5rem] border border-white/5 flex flex-col justify-center items-center text-center shadow-lg">
              <XCircle className="h-6 w-6 text-rose-400 mb-2" /><p className="text-2xl font-black text-white">{absentCount}</p><p className="text-[10px] font-bold text-rose-500/70 uppercase mt-1">غائب</p>
            </div>
            <div className="bg-[#131836]/60 backdrop-blur-md p-5 rounded-[1.5rem] border border-white/5 flex flex-col justify-center items-center text-center shadow-lg">
              <Clock className="h-6 w-6 text-amber-400 mb-2" /><p className="text-2xl font-black text-white">{lateCount}</p><p className="text-[10px] font-bold text-amber-500/70 uppercase mt-1">متأخر</p>
            </div>
            <div className="bg-[#131836]/60 backdrop-blur-md p-5 rounded-[1.5rem] border border-white/5 flex flex-col justify-center items-center text-center shadow-lg">
              <AlertCircle className="h-6 w-6 text-blue-400 mb-2" /><p className="text-2xl font-black text-white">{excusedCount}</p><p className="text-[10px] font-bold text-blue-500/70 uppercase mt-1">مستأذن</p>
            </div>
            <div className={`p-5 rounded-[1.5rem] border flex flex-col justify-center items-center text-center shadow-lg ${unmarkedCount > 0 ? 'bg-[#131836]/60 border-white/5' : 'bg-emerald-500/20 border-emerald-500/30'}`}>
              {unmarkedCount > 0 ? <UserMinus className="h-6 w-6 text-slate-500 mb-2" /> : <CheckCircle2 className="h-6 w-6 text-emerald-400 mb-2" />}
              <p className={`text-2xl font-black ${unmarkedCount > 0 ? 'text-white' : 'text-emerald-400'}`}>{unmarkedCount}</p>
              <p className={`text-[10px] font-bold uppercase mt-1 ${unmarkedCount > 0 ? 'text-slate-500' : 'text-emerald-500/70'}`}>{unmarkedCount > 0 ? 'متبقي' : 'اكتمل'}</p>
            </div>
          </div>
        )}

        {/* Table Area */}
        <div className="bg-[#131836]/60 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
          <div className="p-6 sm:p-8 border-b border-white/5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-[#090b14]/30">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner"><Users className="h-6 w-6" /></div>
              <div><h3 className="text-xl sm:text-2xl font-black text-white">قائمة الطلاب</h3><p className="text-sm text-slate-400 font-bold mt-1">نسبة الحضور: <span className="text-emerald-400">{attendanceRate}%</span></p></div>
            </div>
            
            <div className="flex items-center gap-2 bg-[#090b14]/50 p-1.5 rounded-2xl border border-white/5 w-full lg:w-auto">
              <button onClick={() => markAllAs('present')} className="flex-1 lg:flex-none px-4 py-2.5 text-sm text-emerald-400 hover:bg-emerald-500/20 rounded-xl font-black transition-all flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4" /> الكل حاضر</button>
              <button onClick={() => markAllAs('absent')} className="flex-1 lg:flex-none px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/20 rounded-xl font-black transition-all flex items-center justify-center gap-2"><XCircle className="w-4 h-4" /> الكل غائب</button>
            </div>
          </div>
          
          <div className="overflow-x-auto pb-6">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-[#090b14]/50 border-b border-white/5">
                  <th className="py-5 pr-8 pl-4 text-[11px] font-black uppercase text-slate-500 tracking-widest">اسم الطالب</th>
                  <th className="py-5 text-center text-[11px] font-black uppercase text-slate-500 tracking-widest">حاضر</th>
                  <th className="py-5 text-center text-[11px] font-black uppercase text-slate-500 tracking-widest">غائب</th>
                  <th className="py-5 text-center text-[11px] font-black uppercase text-slate-500 tracking-widest">متأخر</th>
                  <th className="py-5 text-center text-[11px] font-black uppercase text-slate-500 tracking-widest">مستأذن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {systemLoading ? (
                  <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto" /></td></tr>
                ) : students.length === 0 ? (
                  <tr><td colSpan={5} className="py-20 text-center text-slate-500 font-bold">الرجاء اختيار الحصة والفصل</td></tr>
                ) : (
                  students.map((student: any) => (
                    <tr key={student.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 pr-8 pl-4">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-[#090b14] border border-white/5 flex items-center justify-center text-indigo-400 font-black text-lg">{student.users?.full_name?.charAt(0) || '?'}</div>
                          <span className="font-black text-white text-sm">{student.users?.full_name || 'طالب غير معروف'}</span>
                        </div>
                      </td>
                      {ATTENDANCE_OPTIONS.map((opt) => (
                        <td key={opt.status} className="px-2 py-4 text-center">
                          <label className="cursor-pointer inline-block w-full">
                            <input type="radio" checked={attendance[student.id] === opt.status} onChange={() => handleStatusChange(student.id, opt.status as any)} className="sr-only" />
                            <div className={`px-4 py-3 rounded-2xl border transition-all flex items-center justify-center gap-2 font-black text-xs ${attendance[student.id] === opt.status ? opt.activeClasses : opt.inactiveClasses}`}>
                              <opt.icon className="w-4 h-4" /> {opt.label}
                            </div>
                          </label>
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
