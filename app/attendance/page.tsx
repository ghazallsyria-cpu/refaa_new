/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';
 
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Calendar, Save, CheckCircle2, XCircle, Clock, AlertCircle, Users, 
  LayoutGrid, Info, ShieldCheck, BookOpen, UserMinus, BarChart2, 
  RefreshCw, Calculator, Layers, PieChart, Loader2, BookType, Printer, X, Edit2, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
 
import { supabase } from '@/lib/supabase'; 
import { useAttendanceSystem, AttendanceStatus } from '@/hooks/useAttendanceSystem';
import { useAuth } from '@/context/auth-context';
import TeacherCheckInButton from '@/components/TeacherCheckInButton';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { cn } from '@/lib/utils';
 
const ATTENDANCE_OPTIONS = [
  { status: 'present', icon: CheckCircle2, label: 'حاضر', mobileLabel: 'حاضر', activeClasses: 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.4)]', inactiveClasses: 'bg-white/5 border-white/10 text-slate-400 hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-300' },
  { status: 'absent', icon: XCircle, label: 'غائب', mobileLabel: 'غائب', activeClasses: 'bg-rose-500/20 border-rose-400/50 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.4)]', inactiveClasses: 'bg-white/5 border-white/10 text-slate-400 hover:border-rose-500/30 hover:bg-rose-500/5 hover:text-rose-300' },
  { status: 'late', icon: Clock, label: 'متأخر', mobileLabel: 'تأخر', activeClasses: 'bg-amber-500/20 border-amber-400/50 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.4)]', inactiveClasses: 'bg-white/5 border-white/10 text-slate-400 hover:border-amber-500/30 hover:bg-amber-500/5 hover:text-amber-300' },
  { status: 'excused', icon: AlertCircle, label: 'مستأذن', mobileLabel: 'عذر', activeClasses: 'bg-blue-500/20 border-blue-400/50 text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.4)]', inactiveClasses: 'bg-white/5 border-white/10 text-slate-400 hover:border-blue-500/30 hover:bg-blue-500/5 hover:text-blue-300' }
];
 
export default function AttendancePage() {
  const { user, authRole, userRole, isChecking } = useAuth() as any; 
  const currentRole = authRole || userRole;
  const isAdmin = currentRole === 'admin' || currentRole === 'management';
 
  const { sections, daySchedule, loading: systemLoading, fetchDaySchedule, fetchSections, fetchStudentsAndAttendance, saveAttendance } = useAttendanceSystem();
 
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [period, setPeriod] = useState<number>(1);
  const [lessonTitle, setLessonTitle] = useState<string>('');
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
 
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const adminFetchRef = useRef(false);
  const studentFetchRef = useRef(false);
 
  const draftKey = useMemo(() => {
    if (currentRole !== 'teacher' || !user?.id || !selectedSection || !date || !period) return null;
    return `attendance_draft_${user.id}_${selectedSection}_${selectedSubject}_${date}_${period}`;
  }, [user?.id, selectedSection, selectedSubject, date, period, currentRole]);
 
  const [snapshotDate, setSnapshotDate] = useState<string>('');
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  
  const [deptHeads, setDeptHeads] = useState<Record<string, string>>({});
  const [customDeptNames, setCustomDeptNames] = useState<Record<string, string>>({});
  const [excludedRecords, setExcludedRecords] = useState<Set<string>>(new Set());
 
  const [studentStats, setStudentStats] = useState<any>({ present: 0, absent: 0, late: 0, excused: 0, fullDaysAbsent: 0 });
  const [subjectStats, setSubjectStats] = useState<any[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<any[]>([]);
  const [isStudentLoading, setIsStudentLoading] = useState(false);
  const [studentDbError, setStudentDbError] = useState<string | null>(null);
  const [activeSubjectTab, setActiveSubjectTab] = useState<string | null>(null);
 
  // 🚀 إصلاح الخطأ: إضافة حالة mounted ودالة safeFormat
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    setDate(today);
    setSnapshotDate(today);
  }, []);

  const safeFormat = useCallback((dateStr: any, formatStr: string, fallback = '...') => {
    if (!dateStr || !mounted) return fallback;
    try { return format(new Date(dateStr), formatStr, { locale: arSA }); } catch (e) { return fallback; }
  }, [mounted]);
 
  // ==========================================
  // منطق الإدارة
  // ==========================================
  const fetchDailySnapshot = useCallback(async () => {
    if (!isAdmin || !snapshotDate || adminFetchRef.current) return;
    adminFetchRef.current = true;
    setAdminLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_attendance_stats')
        .select(`
          id, date, period, lesson_title, total_students, present_count, absent_count, late_count, excused_count,
          sections (name, classes(name)),
          subjects (name),
          users!daily_attendance_stats_teacher_id_fkey (full_name, teachers(academic_departments(name)))
        `)
        .eq('date', snapshotDate)
        .order('period', { ascending: true });
 
      if (error) throw error;
      setDailyStats(data || []);
      setExcludedRecords(new Set()); 
      
      const newCustomDeptNames: Record<string, string> = {};
      data?.forEach((stat: any) => {
        const teacherData: any = Array.isArray(stat.users) ? stat.users[0] : stat.users;
        const teacherProfile: any = Array.isArray(teacherData?.teachers) ? teacherData.teachers[0] : teacherData?.teachers;
        const academicDept: any = Array.isArray(teacherProfile?.academic_departments) ? teacherProfile.academic_departments[0] : teacherProfile?.academic_departments;
        const dept = academicDept?.name || 'أقسام أخرى';

        const secObj: any = Array.isArray(stat.sections) ? stat.sections[0] : stat.sections;
        const classData: any = Array.isArray(secObj?.classes) ? secObj?.classes[0] : secObj?.classes;
        const className = classData?.name || '';
        const stage = /(سادس|سابع|ثامن|تاسع|6|7|8|9)/.test(className) ? 'المرحلة المتوسطة' : 'المرحلة الثانوية';
        
        const deptKey = `${stage}-${dept}`;
        if (!newCustomDeptNames[deptKey]) {
          newCustomDeptNames[deptKey] = dept;
        }
      });
      setCustomDeptNames(newCustomDeptNames);
    } catch (error: any) {
      console.error("Admin Fetch Error:", error);
    } finally {
      setAdminLoading(false);
      adminFetchRef.current = false;
    }
  }, [isAdmin, snapshotDate]); 
 
  useEffect(() => {
    if (isAdmin) fetchDailySnapshot();
  }, [isAdmin, snapshotDate, fetchDailySnapshot]);
 
  const groupedDailyStats = useMemo(() => {
    const groups: Record<string, Record<string, any[]>> = { 'المرحلة المتوسطة': {}, 'المرحلة الثانوية': {} };
    dailyStats.forEach((stat: any) => {
      const secObj: any = Array.isArray(stat.sections) ? stat.sections[0] : stat.sections;
      const classData: any = Array.isArray(secObj?.classes) ? secObj?.classes[0] : secObj?.classes;
      const className = classData?.name || '';
      const fullClassName = `${className} - ${secObj?.name || ''}`;
      const stage = /(سادس|سابع|ثامن|تاسع|6|7|8|9)/.test(className) ? 'المرحلة المتوسطة' : 'المرحلة الثانوية';
      const subjData: any = Array.isArray(stat.subjects) ? stat.subjects[0] : stat.subjects;
      const subjName = subjData?.name || 'مادة غير محددة';
      
      const teacherData: any = Array.isArray(stat.users) ? stat.users[0] : stat.users;
      const teacherProfile: any = Array.isArray(teacherData?.teachers) ? teacherData.teachers[0] : teacherData?.teachers;
      const academicDept: any = Array.isArray(teacherProfile?.academic_departments) ? teacherProfile.academic_departments[0] : teacherProfile?.academic_departments;
      const dept = academicDept?.name || 'أقسام أخرى';

      if (!groups[stage][dept]) groups[stage][dept] = [];
      groups[stage][dept].push({ 
        id: stat.id, 
        teacher: teacherData?.full_name || 'غير محدد', 
        lesson: stat.lesson_title || 'لم يتم التسجيل', 
        subject: subjName, 
        total: stat.total_students, 
        absent: stat.absent_count, 
        present: stat.present_count, 
        period: stat.period, 
        className: fullClassName 
      });
    });
 
    Object.keys(groups).forEach(stage => {
      Object.keys(groups[stage]).forEach(dept => {
        groups[stage][dept].sort((a, b) => {
          if (a.teacher === b.teacher) return Number(a.period) - Number(b.period);
          return a.teacher.localeCompare(b.teacher, 'ar');
        });
      });
    });
 
    return groups;
  }, [dailyStats]);
 
  const printDepartmentReport = (stage: string, department: string, records: any[], headName: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert('الرجاء السماح بالنوافذ المنبثقة');
    
    const formattedDate = new Date(snapshotDate).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' });
    const finalHeadName = headName && headName.trim() !== '' ? `أ. ${headName}` : '........................';
 
    const rows = records.map((r, i) => {
      const showTeacher = i === 0 || r.teacher !== records[i - 1].teacher;
      return `
        <tr>
          <td><strong>${showTeacher ? r.teacher : ''}</strong></td>
          <td style="text-align: right; padding-right: 10px;">${r.lesson}</td>
          <td>${r.subject}</td>
          <td style="font-weight: bold;">${r.total}</td>
          <td style="color: #e11d48; font-weight: bold;">${r.absent}</td>
          <td style="color: #059669; font-weight: bold;">${r.present}</td>
          <td>${r.period}</td>
          <td dir="ltr">${r.className}</td>
        </tr>
      `;
    }).join('');
 
    const html = `
      <html dir="rtl" lang="ar"><head><title>إحصائية ${department}</title><style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
        body { font-family: 'Cairo', sans-serif; padding: 30px; color: #000; background: #fff; }
        .header { text-align: center; margin-bottom: 20px; } .header h3 { margin: 5px 0; font-size: 18px; font-weight: 900; }
        .header h4 { margin: 10px 0; font-size: 16px; font-weight: 700; color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; text-align: center; }
        th { background-color: #f1f5f9; padding: 12px 5px; font-weight: 900; border: 1px solid #000; font-size: 13px; }
        td { padding: 8px 5px; border: 1px solid #000; }
        .signatures { margin-top: 50px; display: flex; justify-content: space-between; font-weight: 900; font-size: 16px; padding: 0 50px; }
        .signatures p { margin-top: 5px; font-weight: 700; font-size: 14px; }
      </style></head><body>
        <div class="header"><h3>مدرسة الرفعة النموذجية ( ${department} )</h3><h4>إحصائية غياب الطلبة خلال حصص ${department} ${formattedDate.replace('،', '')}</h4></div>
        <table><thead><tr><th width="15%">اسم المدرس</th><th width="25%">عنوان الدرس</th><th width="12%">المادة</th><th width="8%">الإجمالي</th><th width="8%">الغياب</th><th width="8%">الحضور</th><th width="8%">الحصة</th><th width="16%">الصف</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="signatures"><div>رئيس القسم<br/><p>${finalHeadName}</p></div><div>مدير المدرسة<br/><p>أ. صالح المطيري</p></div></div>
        <script>window.onload = () => { setTimeout(() => window.print(), 500); }</script>
      </body></html>
    `;
    printWindow.document.write(html); printWindow.document.close();
  };
 
  // ==========================================
  // منطق المعلم 
  // ==========================================
  useEffect(() => {
    if (date && currentRole === 'teacher') {
      fetchDaySchedule(date).then((schedule) => {
        if (schedule && schedule.length > 0) {
          setPeriod(prevPeriod => {
             const isCurrentPeriodScheduled = schedule.some(s => s.period === prevPeriod);
             if (!isCurrentPeriodScheduled) return schedule[0].period;
             return prevPeriod;
          });
        } else {
          setPeriod(1);
          setSelectedSection('');
          setSelectedSubject('');
          setStudents([]);
        }
      });
    }
  }, [date, currentRole, fetchDaySchedule]);
 
  useEffect(() => {
    if (date && period && currentRole === 'teacher') {
      fetchSections(date, period).then(sectionsData => {
        if (sectionsData && sectionsData.length > 0) {
          setSelectedSection(sectionsData[0].id);
          setSelectedSubject(sectionsData[0].subject_id || '');
        } else { 
          setSelectedSection(''); 
          setSelectedSubject(''); 
          setStudents([]); 
          setLessonTitle(''); 
        }
      });
    }
  }, [date, period, fetchSections, currentRole]);
 
  const loadStudentsAndAttendance = useCallback(async () => {
    if (selectedSection && date && currentRole === 'teacher') {
      setActiveKey(null);
      try {
        const res = await fetchStudentsAndAttendance(selectedSection, selectedSubject, date, period);
        if (res) {
          const sortedStudents = [...res.students].sort((a: any, b: any) => {
            const userA = Array.isArray(a.users) ? a.users[0] : a.users;
            const userB = Array.isArray(b.users) ? b.users[0] : b.users;
            return (userA?.full_name || '').localeCompare(userB?.full_name || '', 'ar'); 
          });
          setStudents(sortedStudents); 
          
          const localDraftKey = `attendance_draft_${user?.id}_${selectedSection}_${selectedSubject}_${date}_${period}`;
          const cachedStr = localStorage.getItem(localDraftKey);
          
          const hasDbData = res.attendance && Object.keys(res.attendance).length > 0;
   
          if (hasDbData) {
             setAttendance(res.attendance);
             setLessonTitle(res.savedLessonTitle || '');
          } else if (cachedStr) {
            try {
              const parsed = JSON.parse(cachedStr);
              setAttendance(parsed.attendance && Object.keys(parsed.attendance).length > 0 ? parsed.attendance : res.attendance);
              setLessonTitle(parsed.lessonTitle !== undefined && parsed.lessonTitle !== '' ? parsed.lessonTitle : (res.savedLessonTitle || ''));
            } catch(e) {
              setAttendance(res.attendance); 
              setLessonTitle(res.savedLessonTitle || '');
            }
          } else {
            setAttendance(res.attendance); 
            setLessonTitle(res.savedLessonTitle || '');
          }
          setActiveKey(localDraftKey);
        }
      } catch (err) {
        console.error("Error loading students:", err);
      }
    }
  }, [selectedSection, selectedSubject, date, period, currentRole, fetchStudentsAndAttendance, user?.id]); 
 
  useEffect(() => { loadStudentsAndAttendance(); }, [loadStudentsAndAttendance]);
 
  useEffect(() => {
    if (currentRole === 'teacher' && draftKey && activeKey === draftKey && students.length > 0) {
      if (Object.keys(attendance).length > 0 || lessonTitle) {
        const draft = { attendance, lessonTitle };
        localStorage.setItem(draftKey, JSON.stringify(draft));
      }
    }
  }, [attendance, lessonTitle, draftKey, activeKey, currentRole, students.length]);
 
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => { setAttendance(prev => ({ ...prev, [studentId]: status })); };
  const markAllAs = (status: AttendanceStatus) => { const newAttendance = { ...attendance }; students.forEach(s => { newAttendance[s.id] = status; }); setAttendance(newAttendance); };
 
  const handleSave = async () => {
    setSaving(true); setMessage({ text: '', type: '' });
    try {
      await saveAttendance(selectedSection, selectedSubject, date, period, attendance, students, lessonTitle);
      setMessage({ text: 'تم حفظ سجل الحضور والغياب بنجاح!', type: 'success' });
      
      if (draftKey) localStorage.removeItem(draftKey);
      setActiveKey(null);
      loadStudentsAndAttendance(); 
      
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    } catch (error: any) {
      setMessage({ text: error.message || 'حدث خطأ مجهول', type: 'error' });
      setTimeout(() => setMessage({ text: '', type: '' }), 8000);
    } finally { setSaving(false); }
  };
 
  // ==========================================
  // منطق الطالب
  // ==========================================
  const fetchStudentDataDirectly = useCallback(async () => {
    if (currentRole !== 'student' || !user?.id || studentFetchRef.current) return;
    studentFetchRef.current = true;
    setIsStudentLoading(true); setStudentDbError(null);
    try {
      const { data: studentData, error: stuErr } = await supabase.from('students').select('id, sections(name, classes(name))').eq('id', user.id).maybeSingle();
      if (stuErr || !studentData) throw new Error("خطأ في جلب بيانات الطالب.");
      const sec: any = studentData.sections; const secObj = Array.isArray(sec) ? sec[0] : sec;
      const className = (Array.isArray(secObj?.classes) ? secObj?.classes[0] : secObj?.classes)?.name || '';
      const fullClassName = className ? `${className} - ${secObj?.name || ''}` : 'فصل الطالب';
 
      const { data: records, error: recErr } = await supabase.from('attendance_records').select(`id, date, period, status, subjects(name), teachers(users(full_name))`).eq('student_id', studentData.id).order('date', { ascending: false });
      if (recErr) throw recErr;
 
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
          if (r.status === 'present') sStats.present++; else if (r.status === 'absent') sStats.absent++;
          if (r.status !== 'present') enrichedRecords.push({ ...r, displayClassName: fullClassName, subjectName: subjName, teacherName: teacherName });
        });
        calculatedStats.fullDaysAbsent = Math.floor(calculatedStats.absent / 5);
        setStudentStats(calculatedStats); setSubjectStats(Array.from(subjectsMap.values()).sort((a, b) => b.absent - a.absent)); setStudentAttendance(enrichedRecords);
      }
    } catch (error: any) { setStudentDbError(error.message); } finally { 
      setIsStudentLoading(false); 
      studentFetchRef.current = false;
    }
  }, [currentRole, user?.id]); 
 
  useEffect(() => { fetchStudentDataDirectly(); }, [fetchStudentDataDirectly]);
 
  const groupedAttendanceRecords = useMemo(() => {
    return studentAttendance.reduce((acc, record) => {
      if (!acc[record.subjectName]) acc[record.subjectName] = [];
      acc[record.subjectName].push(record);
      return acc;
    }, {} as Record<string, any[]>);
  }, [studentAttendance]);
 
  useEffect(() => { if (Object.keys(groupedAttendanceRecords).length > 0 && !activeSubjectTab) setActiveSubjectTab(Object.keys(groupedAttendanceRecords)[0]); }, [groupedAttendanceRecords, activeSubjectTab]);
 
  // 🛡️ شاشات التحميل والحماية
  if (isChecking) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
             <div className="h-20 w-20 animate-spin rounded-full border-4 border-amber-500/10 border-t-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.4)]"></div>
             <ShieldAlert className="absolute h-8 w-8 text-amber-400 animate-pulse" />
          </div>
          <p className="text-amber-500 font-black animate-pulse tracking-widest drop-shadow-md">جاري التحقق وتأمين الصلاحيات...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // 👑 واجهة المدير (Gemini Admin View)
  // ==========================================
  if (isAdmin) {
    return (
      <div className="min-h-[100dvh] relative bg-transparent text-slate-100 pb-32 overflow-x-hidden font-sans pt-6" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6 sm:space-y-8">
          
          <div className="flex justify-end">
            <Link href="/attendance/reports" className="flex items-center gap-2 text-indigo-400 font-bold bg-[#0f1423]/80 px-5 py-2.5 rounded-xl sm:rounded-2xl border border-indigo-500/30 transition-all hover:bg-indigo-500 hover:text-white active:scale-95 text-sm sm:text-base shadow-inner backdrop-blur-md">
              <BarChart2 className="w-5 h-5" /> تقارير الإنذارات الشاملة
            </Link>
          </div>
 
          <div className="glass-panel border-indigo-500/30 relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 lg:p-12 shadow-[0_0_50px_rgba(99,102,241,0.15)] group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none mix-blend-screen transition-transform duration-1000 group-hover:scale-110"></div>
            <div className="relative z-10 flex flex-col gap-4 text-center sm:text-right">
              <div className="inline-flex w-fit mx-auto sm:mx-0 items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-xs font-black text-indigo-300 uppercase tracking-widest shadow-inner backdrop-blur-md">
                <Layers className="w-4 h-4" /> مركز الإدارة الشامل
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight drop-shadow-md text-white">
                إحصائيات <span className="text-transparent bg-clip-text bg-gradient-to-l from-indigo-400 to-indigo-200 drop-shadow-lg">الأقسام الإدارية</span>
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm lg:text-base font-bold max-w-2xl leading-relaxed mx-auto sm:mx-0 opacity-90">
                هذه الصفحة مخصصة لمدير المدرسة لرؤية اللقطات الإحصائية مجمعة حسب القسم والمرحلة. يمكنك كتابة اسم <span className="text-indigo-400">رئيس القسم</span> واستبعاد من لا ينتمي للقسم قبل الطباعة.
              </p>
            </div>
          </div>
 
          <div className="glass-panel border-white/10 p-5 sm:p-6 lg:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-4 shadow-inner">
            <div className="flex items-center gap-3 text-white font-black text-base sm:text-lg drop-shadow-sm w-full md:w-auto">
              <div className="p-2 sm:p-2.5 bg-indigo-500/10 rounded-lg sm:rounded-xl border border-indigo-500/20 shadow-inner"><Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400 drop-shadow-sm" /></div> اختر يوم الإحصائية:
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <input type="date" value={snapshotDate} onChange={(e) => setSnapshotDate(e.target.value)} className="w-full sm:w-auto rounded-xl sm:rounded-2xl border border-white/10 py-3 sm:py-3.5 px-4 sm:px-6 text-white bg-[#02040a]/40 backdrop-blur-md focus:ring-2 focus:ring-indigo-500/50 text-sm font-bold outline-none shadow-inner" style={{ colorScheme: 'dark' }} />
              <button onClick={fetchDailySnapshot} className="w-full sm:w-auto px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-indigo-600/80 hover:bg-indigo-500 backdrop-blur-md text-white font-black transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/50 shrink-0 active:scale-95 flex items-center justify-center gap-2">
                <RefreshCw className={cn("w-4 h-4", adminLoading ? "animate-spin" : "")} /> تحديث الإحصائيات
              </button>
            </div>
          </div>
 
          {adminLoading ? (
            <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-500 animate-spin drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" /></div>
          ) : dailyStats.length === 0 ? (
            <div className="glass-panel py-16 sm:py-20 text-center rounded-[2rem] sm:rounded-[2.5rem] border border-dashed border-white/10 shadow-inner px-4 bg-[#02040a]/30 backdrop-blur-sm">
              <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 font-bold text-sm sm:text-base">لا توجد إحصائيات معتمدة من المعلمين في هذا اليوم.</p>
            </div>
          ) : (
            Object.keys(groupedDailyStats).map(stage => {
              const stageData = groupedDailyStats[stage];
              if (Object.keys(stageData).length === 0) return null;
              
              return (
                <div key={stage} className="space-y-6 sm:space-y-8">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white border-r-4 border-indigo-500 pr-3 sm:pr-4 drop-shadow-md">{stage}</h2>
                  
                  {Object.keys(stageData).map(dept => {
                    const recordsList = stageData[dept];
                    const deptKey = `${stage}-${dept}`;
                    const currentHead = deptHeads[deptKey] || '';
                    const customDeptName = customDeptNames[deptKey] || dept;
 
                    return (
                      <div key={dept} className="glass-panel rounded-[1.5rem] sm:rounded-[2.5rem] relative overflow-hidden shadow-inner group">
                        <div className="p-5 sm:p-6 lg:p-8 border-b border-white/5 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5 sm:gap-6 bg-transparent relative z-10">
                          <div className="flex items-center gap-3 w-full xl:w-auto">
                            <div className="p-2 sm:p-2.5 bg-indigo-500/10 backdrop-blur-md rounded-lg sm:rounded-xl border border-indigo-500/20 shadow-inner shrink-0"><Layers className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400 drop-shadow-sm" /></div>
                            <input 
                              type="text" 
                              value={customDeptName}
                              onChange={(e) => setCustomDeptNames(prev => ({...prev, [deptKey]: e.target.value}))}
                              className="bg-transparent border-none text-lg sm:text-xl font-black text-indigo-300 outline-none w-full placeholder:text-slate-600 focus:ring-0 drop-shadow-sm"
                              placeholder="اسم القسم..."
                            />
                          </div>
                          
                          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full xl:w-auto">
                            <div className="flex items-center gap-2 sm:gap-3 bg-[#02040a]/40 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border border-white/5 w-full sm:w-auto shadow-inner">
                               <span className="text-[10px] sm:text-xs font-black text-slate-400 shrink-0">رئيس القسم:</span>
                               <input 
                                 type="text" 
                                 placeholder="اكتب الاسم لاعتماده..." 
                                 value={currentHead}
                                 onChange={(e) => setDeptHeads(prev => ({...prev, [deptKey]: e.target.value}))}
                                 className="bg-transparent border-none text-white font-black text-xs sm:text-sm outline-none w-full sm:w-48 placeholder:text-slate-600 focus:ring-0"
                               />
                            </div>
                            <button 
                              onClick={() => {
                                const finalRecords = recordsList.filter(r => !excludedRecords.has(r.id));
                                printDepartmentReport(stage, customDeptName, finalRecords, currentHead);
                              }} 
                              className="flex items-center justify-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-indigo-600/80 backdrop-blur-md hover:bg-indigo-500 text-white text-xs sm:text-sm font-black transition-all border border-indigo-400/50 active:scale-95 w-full sm:w-auto shrink-0 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                            >
                              <Printer className="w-4 h-4" /> اعتماد وطباعة
                            </button>
                          </div>
                        </div>
                        
                        <div className="overflow-x-auto pb-4 custom-scrollbar relative z-10 p-1">
                          <table className="w-full text-right whitespace-nowrap min-w-[900px] border-collapse">
                            <thead>
                              <tr className="bg-indigo-500/10 backdrop-blur-md border-b border-white/10">
                                <th className="py-4 px-4 text-[10px] sm:text-xs font-black text-center text-slate-300 w-24">تضمين بالطباعة</th>
                                <th className="py-4 px-6 text-[10px] sm:text-xs font-black uppercase text-indigo-300">اسم المدرس</th>
                                <th className="py-4 px-6 text-[10px] sm:text-xs font-black uppercase text-slate-300">عنوان الدرس</th>
                                <th className="py-4 px-6 text-[10px] sm:text-xs font-black uppercase text-slate-300 text-center">المادة</th>
                                <th className="py-4 px-4 text-[10px] sm:text-xs font-black uppercase text-slate-300 text-center">الإجمالي</th>
                                <th className="py-4 px-4 text-[10px] sm:text-xs font-black uppercase text-rose-300 text-center">الغياب</th>
                                <th className="py-4 px-4 text-[10px] sm:text-xs font-black uppercase text-emerald-300 text-center">الحضور</th>
                                <th className="py-4 px-4 text-[10px] sm:text-xs font-black uppercase text-slate-300 text-center">الحصة</th>
                                <th className="py-4 px-6 text-[10px] sm:text-xs font-black uppercase text-slate-300 text-center">الصف</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {recordsList.map((r, i) => {
                                const isExcluded = excludedRecords.has(r.id);
                                const showTeacher = i === 0 || r.teacher !== recordsList[i - 1].teacher;
                                
                                return (
                                  <tr key={i} className={`transition-colors bg-[#02040a]/40 hover:bg-white/5 ${isExcluded ? 'opacity-30 grayscale' : ''}`}>
                                    <td className="py-3 sm:py-4 px-4 text-center border-l border-white/5">
                                       <div className="flex justify-center items-center">
                                         <input 
                                            type="checkbox" 
                                            checked={!isExcluded}
                                            onChange={() => {
                                              setExcludedRecords(prev => {
                                                const newSet = new Set(prev);
                                                if (newSet.has(r.id)) newSet.delete(r.id);
                                                else newSet.add(r.id);
                                                return newSet;
                                              });
                                            }}
                                            className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer accent-indigo-500 rounded border-white/20 bg-[#0f1423] shadow-inner"
                                         />
                                       </div>
                                    </td>
                                    <td className={`py-3 sm:py-4 px-6 font-black text-xs sm:text-sm border-l border-white/5 ${isExcluded ? 'line-through text-slate-500' : 'text-white drop-shadow-sm'}`}>
                                      {showTeacher ? r.teacher : ''}
                                    </td>
                                    <td className="py-3 sm:py-4 px-6 font-bold text-slate-300 text-xs sm:text-sm truncate max-w-[200px] border-l border-white/5" title={r.lesson}>{r.lesson}</td>
                                    <td className="py-3 sm:py-4 px-6 font-bold text-slate-400 text-xs sm:text-sm text-center border-l border-white/5">{r.subject}</td>
                                    <td className="py-3 sm:py-4 px-4 font-black text-white text-sm sm:text-base text-center bg-white/5 border-l border-white/5">{r.total}</td>
                                    <td className="py-3 sm:py-4 px-4 font-black text-rose-400 text-sm sm:text-base text-center border-l border-white/5 drop-shadow-sm">{r.absent}</td>
                                    <td className="py-3 sm:py-4 px-4 font-black text-emerald-400 text-sm sm:text-base text-center border-l border-white/5 drop-shadow-sm">{r.present}</td>
                                    <td className="py-3 sm:py-4 px-4 font-black text-slate-300 text-xs sm:text-sm text-center bg-white/5 border-l border-white/5">{r.period}</td>
                                    <td className="py-3 sm:py-4 px-6 font-black text-slate-300 text-xs sm:text-sm text-center" dir="ltr">{r.className}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }
 
  // ==========================================
  // 🧑‍🎓 واجهة الطالب (Gemini Student View)
  // ==========================================
  if (currentRole === 'student') {
    if (isStudentLoading) {
      return <div className="py-20 flex justify-center items-center min-h-[100dvh] bg-transparent"><Loader2 className="w-12 h-12 text-emerald-500 animate-spin drop-shadow-md" /></div>;
    }

    return (
      <div className="min-h-[100dvh] relative bg-transparent text-slate-100 pb-32 overflow-x-hidden font-sans pt-6" dir="rtl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6 sm:space-y-8">
          
          <div className="glass-panel p-6 sm:p-8 lg:p-10 rounded-[2rem] sm:rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_50px_rgba(16,185,129,0.1)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] pointer-events-none rounded-full mix-blend-screen transition-transform duration-1000 group-hover:scale-110"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-black text-emerald-400 uppercase tracking-widest mb-3 shadow-inner backdrop-blur-md">
                <BarChart2 className="w-4 h-4 drop-shadow-sm" /> تقريري الشخصي
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2 drop-shadow-lg">سجل الحضور والغياب</h1>
              <p className="text-sm text-slate-300 font-bold opacity-90 drop-shadow-sm">مرحباً بك، يمكنك هنا متابعة تفاصيل حضورك وغيابك في جميع المواد.</p>
            </div>
            {studentStats.fullDaysAbsent > 0 && (
              <div className="relative z-10 bg-rose-500/10 backdrop-blur-md border border-rose-500/30 p-4 rounded-2xl text-rose-400 flex items-center gap-4 shadow-inner">
                <ShieldAlert className="w-10 h-10 shrink-0 drop-shadow-md" />
                <div>
                  <p className="font-black text-lg drop-shadow-sm">تنبيه غياب!</p>
                  <p className="text-xs font-bold text-rose-300">لقد تجاوزت {studentStats.fullDaysAbsent} يوم غياب فعلي.</p>
                </div>
              </div>
            )}
          </div>

          {/* Holographic Stats Orbs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'حاضر', value: studentStats.present, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', shadow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]' },
              { label: 'غائب', value: studentStats.absent, icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', shadow: 'shadow-[0_0_20px_rgba(244,63,94,0.15)]' },
              { label: 'متأخر', value: studentStats.late, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', shadow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]' },
              { label: 'عذر', value: studentStats.excused, icon: AlertCircle, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', shadow: 'shadow-[0_0_20px_rgba(59,130,246,0.15)]' },
            ].map((stat, i) => (
              <div key={i} className={`glass-panel p-6 rounded-[2rem] flex flex-col justify-center items-center text-center ${stat.border} ${stat.shadow} relative overflow-hidden group`}>
                <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full ${stat.bg.split(' ')[0]} blur-[30px] group-hover:scale-150 transition-transform duration-700 pointer-events-none mix-blend-screen opacity-50`}></div>
                <stat.icon className={`h-8 w-8 sm:h-10 sm:w-10 ${stat.color} mb-3 relative z-10 drop-shadow-md group-hover:scale-110 transition-transform`} />
                <p className="text-3xl sm:text-4xl font-black text-white relative z-10 drop-shadow-lg">{stat.value}</p>
                <p className={`text-xs font-bold ${stat.color} mt-1 relative z-10 uppercase tracking-widest opacity-80`}>{stat.label}</p>
              </div>
            ))}
          </div>

          {Object.keys(groupedAttendanceRecords).length > 0 ? (
            <div className="glass-panel rounded-[2.5rem] overflow-hidden border-white/10 shadow-inner">
              <div className="flex overflow-x-auto custom-scrollbar border-b border-white/5 bg-[#02040a]/40 p-3">
                {Object.keys(groupedAttendanceRecords).map(subject => (
                  <button key={subject} onClick={() => setActiveSubjectTab(subject)} className={`px-6 py-3 font-black text-sm rounded-xl transition-all whitespace-nowrap active:scale-95 ${activeSubjectTab === subject ? 'bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-400/30' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
                    {subject}
                  </button>
                ))}
              </div>
              <div className="p-4 sm:p-6 divide-y divide-white/5 bg-transparent">
                {activeSubjectTab && groupedAttendanceRecords[activeSubjectTab]?.map((record: any, idx: number) => (
                  <div key={idx} className="py-4 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/5 transition-colors rounded-2xl bg-[#02040a]/20 mb-2">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl border shadow-inner ${record.status === 'absent' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : record.status === 'late' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : record.status === 'present' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'}`}>
                        {record.status === 'absent' ? <XCircle className="w-5 h-5 drop-shadow-sm" /> : record.status === 'late' ? <Clock className="w-5 h-5 drop-shadow-sm" /> : record.status === 'present' ? <CheckCircle2 className="w-5 h-5 drop-shadow-sm" /> : <AlertCircle className="w-5 h-5 drop-shadow-sm" />}
                      </div>
                      <div>
                        <p className="font-black text-white text-sm sm:text-base drop-shadow-sm" dir="ltr">{safeFormat(record.date, 'EEEE، d MMM yyyy')}</p>
                        <p className="text-xs font-bold text-slate-400 mt-1.5 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-white/30" /> الحصة {record.period} • {record.teacherName}</p>
                      </div>
                    </div>
                    <div className={`px-5 py-2 rounded-xl text-xs font-black border shadow-inner backdrop-blur-md text-center shrink-0 ${record.status === 'absent' ? 'bg-rose-500/20 text-rose-300 border-rose-400/30' : record.status === 'late' ? 'bg-amber-500/20 text-amber-300 border-amber-400/30' : record.status === 'present' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' : 'bg-blue-500/20 text-blue-300 border-blue-400/30'}`}>
                      {record.status === 'absent' ? 'غياب مسجل' : record.status === 'late' ? 'تأخير مسجل' : record.status === 'present' ? 'حاضر' : 'عذر معتمد'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass-panel py-20 text-center rounded-[2.5rem] border border-dashed border-emerald-500/20 shadow-inner bg-[#02040a]/30 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none"></div>
              <CheckCircle2 className="w-20 h-20 text-emerald-400/50 mx-auto mb-6 drop-shadow-lg group-hover:scale-110 transition-transform duration-500" />
              <p className="text-emerald-400 font-black text-2xl drop-shadow-md">سجلك نظيف ومثالي!</p>
              <p className="text-slate-400 font-bold mt-2">لا توجد غيابات أو تأخيرات مسجلة في ملفك حتى الآن.</p>
            </div>
          )}
        </motion.div>
      </div>
    );
  }
 
  // ==========================================
  // 👨‍🏫 واجهة المعلم (Gemini Teacher View)
  // ==========================================
  if (currentRole === 'teacher') {
    let presentCount = 0, absentCount = 0, lateCount = 0, excusedCount = 0;
    students.forEach(s => {
      const status = attendance[s.id];
      if (status === 'present') presentCount++;
      else if (status === 'absent') absentCount++;
      else if (status === 'late') lateCount++;
      else if (status === 'excused') excusedCount++;
    });
    
    const markedCount = presentCount + absentCount + lateCount + excusedCount;
    const unmarkedCount = students.length - markedCount;

    return (
      <div className="min-h-[100dvh] relative bg-transparent text-slate-100 pb-32 overflow-x-hidden font-sans pt-6" dir="rtl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 sm:space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <AnimatePresence>
            {message.text && (
              <motion.div initial={{ opacity: 0, y: -20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }} className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 sm:px-8 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] font-black text-white text-xs sm:text-sm flex items-center gap-3 border backdrop-blur-3xl w-[90%] sm:w-auto ${message.type === 'success' ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-100' : 'bg-rose-950/80 border-rose-500/50 text-rose-100'}`}>
                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 drop-shadow-md" /> : <AlertCircle className="w-5 h-5 text-rose-400 drop-shadow-md" />} {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 glass-panel p-6 sm:p-8 lg:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-[0_0_40px_rgba(245,158,11,0.1)] relative overflow-hidden group border-amber-500/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none mix-blend-screen transition-transform duration-1000 group-hover:scale-110"></div>
            <div className="relative z-10 text-center lg:text-right w-full lg:w-auto">
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] sm:text-xs font-black text-amber-400 uppercase tracking-widest mb-4 shadow-inner backdrop-blur-md">
                <LayoutGrid className="w-4 h-4 drop-shadow-sm" /> تسجيل الغياب اليومي
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-2 drop-shadow-lg">لوحة رصد الحضور</h1>
              <p className="text-sm text-slate-300 font-bold max-w-md mx-auto lg:mx-0 opacity-90 drop-shadow-sm">يتم حفظ لقطة إحصائية متكاملة للإدارة عند اعتماد السجل من قبلك.</p>
            </div>
            
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full lg:w-auto mt-2 lg:mt-0 shrink-0">
              <Link href="/attendance/reports" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-6 py-4 text-sm font-black text-slate-300 hover:bg-white/10 hover:text-amber-400 transition-all shadow-inner backdrop-blur-sm active:scale-95">
                <BarChart2 className="h-5 w-5" /> تقارير طلابي
              </Link>
              <button onClick={handleSave} disabled={saving || students.length === 0 || !lessonTitle} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500/90 backdrop-blur-md hover:bg-amber-400 px-8 py-4 text-sm font-black text-[#02040a] shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all active:scale-95 disabled:opacity-50 border border-amber-300/50">
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                {saving ? 'جاري الاعتماد...' : 'اعتماد السجل'}
              </button>
            </div>
          </div>

          <div className="glass-panel p-6 sm:p-8 lg:p-10 rounded-[2rem] sm:rounded-[2.5rem] shadow-inner border-white/10 relative z-20">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
              <div className="space-y-2 flex flex-col w-full">
                <label className="text-[10px] sm:text-xs font-black text-slate-400 pl-1 uppercase tracking-widest drop-shadow-sm">التاريخ</label>
                <div className="relative w-full">
                  <Calendar className="absolute inset-y-0 right-4 h-full w-5 text-amber-500/50 pointer-events-none" />
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-2xl border border-white/10 py-3.5 pr-12 pl-4 text-white bg-[#02040a]/40 backdrop-blur-md focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 text-sm font-bold outline-none shadow-inner transition-all hover:bg-white/5" style={{ colorScheme: 'dark' }} />
                </div>
              </div>
              <div className="space-y-2 flex flex-col w-full">
                <label className="text-[10px] sm:text-xs font-black text-slate-400 pl-1 uppercase tracking-widest drop-shadow-sm">الحصة</label>
                <div className="relative w-full">
                  <Clock className="absolute inset-y-0 right-4 h-full w-5 text-amber-500/50 pointer-events-none" />
                  <select value={period} onChange={(e) => setPeriod(parseInt(e.target.value))} className="w-full rounded-2xl border border-white/10 py-3.5 pr-12 pl-4 text-white bg-[#02040a]/40 backdrop-blur-md focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 text-sm font-bold outline-none appearance-none [&>option]:bg-[#0f1423] shadow-inner transition-all hover:bg-white/5 cursor-pointer">
                    {daySchedule.length > 0 ? daySchedule.map(s => <option key={s.period} value={s.period}>الحصة {s.period}</option>) : <option value={1}>لا توجد حصص</option>}
                  </select>
                </div>
              </div>
              <div className="space-y-2 flex flex-col w-full">
                <label className="text-[10px] sm:text-xs font-black text-slate-400 pl-1 uppercase tracking-widest drop-shadow-sm">الفصل والمادة</label>
                <div className="relative w-full">
                  <BookOpen className="absolute inset-y-0 right-4 h-full w-5 text-amber-500/50 pointer-events-none" />
                  <select value={`${selectedSection}|${selectedSubject}`} onChange={(e) => { const parts = e.target.value.split('|'); setSelectedSection(parts[0]); setSelectedSubject(parts[1] || ''); }} className="w-full rounded-2xl border border-white/10 py-3.5 pr-12 pl-4 text-white bg-[#02040a]/40 backdrop-blur-md focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 text-sm font-bold outline-none appearance-none [&>option]:bg-[#0f1423] truncate shadow-inner transition-all hover:bg-white/5 cursor-pointer">
                    {sections.length > 0 ? sections.map((s, idx) => <option key={`${s.id}|${s.subject_id || idx}`} value={`${s.id}|${s.subject_id || ''}`}>{(s as any).classes?.[0]?.name || (s as any).classes?.name} - {s.name}</option>) : <option>لا توجد فصول</option>}
                  </select>
                </div>
              </div>
              <div className="space-y-2 flex flex-col w-full">
                <label className="text-[10px] sm:text-xs font-black text-amber-400 flex gap-1 pl-1 uppercase tracking-widest drop-shadow-sm">عنوان الدرس <span className="text-rose-500">*</span></label>
                <div className="relative w-full">
                  <BookType className="absolute inset-y-0 right-4 h-full w-5 text-amber-500/80 pointer-events-none drop-shadow-sm" />
                  <input type="text" required placeholder="مثال: قوانين نيوتن..." value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} className="w-full rounded-2xl border border-amber-500/30 py-3.5 pr-12 pl-4 text-white bg-amber-500/5 backdrop-blur-md focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 text-sm font-bold outline-none placeholder:text-slate-500 transition-all shadow-inner" />
                </div>
              </div>
            </div>
            
            {selectedSection && selectedSubject && (
              <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                <div className="flex items-center gap-3 text-amber-300 text-xs font-black w-full sm:w-auto bg-amber-500/10 px-4 py-3 rounded-xl border border-amber-500/20 shadow-inner backdrop-blur-sm">
                  <Info className="w-5 h-5 shrink-0" /> <span className="leading-relaxed drop-shadow-sm">تأكد من كتابة عنوان الدرس لاعتماده من الإدارة وحفظه في السجل.</span>
                </div>
                {user?.id && <div className="w-full sm:w-auto shrink-0"><TeacherCheckInButton teacherId={user.id} periodNumber={period} selectedDate={date} className="w-full sm:w-auto shadow-[0_0_20px_rgba(59,130,246,0.3)]" /></div>}
              </div>
            )}
          </div>

          {students.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
              <div className="glass-panel p-5 rounded-[1.5rem] flex flex-col justify-center items-center text-center relative overflow-hidden group">
                <Users className="h-6 w-6 text-white mb-2 opacity-30 group-hover:scale-125 transition-transform" />
                <p className="text-2xl sm:text-3xl font-black text-white drop-shadow-md">{students.length}</p>
                <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">الطلاب</p>
              </div>
              <div className="bg-[#02040a]/40 backdrop-blur-md border border-emerald-500/20 p-5 rounded-[1.5rem] flex flex-col justify-center items-center text-center shadow-inner relative overflow-hidden group">
                <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CheckCircle2 className="h-6 w-6 text-emerald-400 mb-2 drop-shadow-md relative z-10 group-hover:scale-125 transition-transform" />
                <p className="text-2xl sm:text-3xl font-black text-emerald-400 drop-shadow-lg relative z-10">{presentCount}</p>
                <p className="text-[10px] sm:text-xs font-bold text-emerald-500/80 uppercase tracking-widest mt-1 relative z-10">حاضر</p>
              </div>
              <div className="bg-[#02040a]/40 backdrop-blur-md border border-rose-500/20 p-5 rounded-[1.5rem] flex flex-col justify-center items-center text-center shadow-inner relative overflow-hidden group">
                <div className="absolute inset-0 bg-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <XCircle className="h-6 w-6 text-rose-400 mb-2 drop-shadow-md relative z-10 group-hover:scale-125 transition-transform" />
                <p className="text-2xl sm:text-3xl font-black text-rose-400 drop-shadow-lg relative z-10">{absentCount}</p>
                <p className="text-[10px] sm:text-xs font-bold text-rose-500/80 uppercase tracking-widest mt-1 relative z-10">غائب</p>
              </div>
              <div className="bg-[#02040a]/40 backdrop-blur-md border border-amber-500/20 p-5 rounded-[1.5rem] flex flex-col justify-center items-center text-center shadow-inner relative overflow-hidden group">
                <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Clock className="h-6 w-6 text-amber-400 mb-2 drop-shadow-md relative z-10 group-hover:scale-125 transition-transform" />
                <p className="text-2xl sm:text-3xl font-black text-amber-400 drop-shadow-lg relative z-10">{lateCount}</p>
                <p className="text-[10px] sm:text-xs font-bold text-amber-500/80 uppercase tracking-widest mt-1 relative z-10">متأخر</p>
              </div>
              <div className="bg-[#02040a]/40 backdrop-blur-md border border-blue-500/20 p-5 rounded-[1.5rem] flex flex-col justify-center items-center text-center shadow-inner relative overflow-hidden group">
                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <AlertCircle className="h-6 w-6 text-blue-400 mb-2 drop-shadow-md relative z-10 group-hover:scale-125 transition-transform" />
                <p className="text-2xl sm:text-3xl font-black text-blue-400 drop-shadow-lg relative z-10">{excusedCount}</p>
                <p className="text-[10px] sm:text-xs font-bold text-blue-500/80 uppercase tracking-widest mt-1 relative z-10">مستأذن</p>
              </div>
              <div className={`p-5 rounded-[1.5rem] border flex flex-col justify-center items-center text-center shadow-inner transition-colors relative overflow-hidden group ${unmarkedCount > 0 ? 'bg-[#02040a]/60 border-white/10' : 'bg-emerald-500/10 backdrop-blur-md border-emerald-400/40 shadow-[0_0_30px_rgba(16,185,129,0.2)]'}`}>
                {unmarkedCount > 0 ? <UserMinus className="h-6 w-6 text-slate-500 mb-2 relative z-10 group-hover:scale-125 transition-transform" /> : <CheckCircle2 className="h-6 w-6 text-emerald-400 mb-2 drop-shadow-md relative z-10 animate-pulse group-hover:scale-125 transition-transform" />}
                <p className={`text-2xl sm:text-3xl font-black drop-shadow-md relative z-10 ${unmarkedCount > 0 ? 'text-white' : 'text-emerald-400'}`}>{unmarkedCount}</p>
                <p className={`text-[10px] sm:text-xs font-black uppercase tracking-widest mt-1 relative z-10 ${unmarkedCount > 0 ? 'text-slate-500' : 'text-emerald-300'}`}>{unmarkedCount > 0 ? 'متبقي' : 'اكتمل'}</p>
              </div>
            </div>
          )}

          {students.length > 0 && (
            <div className="glass-panel rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl border-white/5">
              <div className="p-6 sm:p-8 border-b border-white/5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 sm:gap-6 bg-[#02040a]/60 backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-[1rem] bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-inner"><Users className="h-6 w-6 drop-shadow-sm" /></div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-white drop-shadow-md">قائمة الحضور</h3>
                    <p className="text-xs sm:text-sm font-bold text-slate-400 mt-1">تحديد حالة كل طالب بدقة لتُعتمد في سجلات الإدارة.</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 bg-[#0f1423]/60 p-2 sm:p-2.5 rounded-[1.25rem] sm:rounded-[1.5rem] border border-white/10 w-full lg:w-auto shadow-inner">
                   <button onClick={() => markAllAs('present')} className="w-full sm:w-auto px-6 py-3.5 sm:py-3 text-sm text-emerald-400 hover:bg-emerald-500/20 rounded-xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 border border-transparent hover:border-emerald-500/30"><CheckCircle2 className="w-5 h-5 shrink-0 drop-shadow-sm" /> الكل حاضر</button>
                   <button onClick={() => markAllAs('absent')} className="w-full sm:w-auto px-6 py-3.5 sm:py-3 text-sm text-rose-400 hover:bg-rose-500/20 rounded-xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 border border-transparent hover:border-rose-500/30"><XCircle className="w-5 h-5 shrink-0 drop-shadow-sm" /> الكل غائب</button>
                </div>
              </div>
              
              <div className="bg-transparent p-3 sm:p-5">
                <div className="space-y-3 sm:space-y-0 sm:divide-y divide-white/5">
                  {students.map((student: any) => (
                    <div key={student.id} className="p-4 sm:p-5 bg-[#02040a]/40 sm:bg-transparent rounded-[1.5rem] sm:rounded-none border border-white/5 sm:border-transparent hover:bg-white/[0.02] transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 group">
                      
                      <div className="flex items-center gap-4 min-w-0 lg:w-1/3 shrink-0 px-2 sm:px-0">
                        <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl sm:rounded-[1rem] bg-[#0f1423] border border-white/10 text-slate-400 flex items-center justify-center font-black text-lg sm:text-xl shrink-0 shadow-inner group-hover:text-amber-400 group-hover:border-amber-500/30 transition-all duration-300">
                          {student.users?.full_name?.charAt(0)}
                        </div>
                        <span className="font-black text-white text-base sm:text-lg truncate drop-shadow-sm group-hover:text-amber-100 transition-colors">{student.users?.full_name}</span>
                      </div>

                      <div className="grid grid-cols-4 lg:flex lg:flex-1 gap-2 sm:gap-3 lg:justify-end">
                        {ATTENDANCE_OPTIONS.map((opt) => {
                          const isSelected = attendance[student.id] === opt.status;
                          return (
                            <label key={opt.status} className="cursor-pointer block lg:w-32">
                              <input type="radio" checked={isSelected} onChange={() => handleStatusChange(student.id, opt.status as any)} className="sr-only" />
                              <div className={cn(
                                "flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2.5 p-3 sm:p-3.5 rounded-2xl transition-all duration-300 active:scale-95 text-center h-full border backdrop-blur-sm",
                                isSelected ? opt.activeClasses : opt.inactiveClasses
                              )}>
                                 <opt.icon className={cn("w-5 h-5 sm:w-6 sm:h-6 shrink-0 transition-transform", isSelected ? "drop-shadow-md scale-110" : "")} /> 
                                 <span className={cn("text-[10px] sm:text-xs font-black tracking-wide", isSelected ? "drop-shadow-sm" : "")}>{opt.mobileLabel}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                      
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }
 
  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] font-sans bg-transparent p-4">
      <div className="glass-panel p-10 rounded-[2.5rem] border-rose-500/30 flex flex-col items-center text-center shadow-[0_0_50px_rgba(225,29,72,0.15)] relative overflow-hidden group">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-rose-500/10 blur-[80px] rounded-full pointer-events-none transition-transform duration-1000 group-hover:scale-125"></div>
        <ShieldAlert className="w-20 h-20 text-rose-500 mb-6 drop-shadow-md relative z-10" />
        <h2 className="text-3xl font-black text-white mb-2 drop-shadow-lg relative z-10">وصول مقيد</h2>
        <p className="text-slate-400 font-bold relative z-10 text-lg">عذراً، ليس لديك صلاحية لعرض هذه الصفحة.</p>
      </div>
    </div>
  );
}
