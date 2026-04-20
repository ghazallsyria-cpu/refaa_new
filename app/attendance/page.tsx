/* eslint-disable react/no-unescaped-entities */
'use client';
 
import { useState, useEffect, useCallback, useMemo } from 'react';
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
 
// 🚀 الألوان الملكية والتباين العالي الجديد للخيارات
const ATTENDANCE_OPTIONS = [
  { status: 'present', icon: CheckCircle2, label: 'حاضر', mobileLabel: 'حاضر', activeClasses: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]', inactiveClasses: 'bg-[#02040a]/60 border-white/5 text-slate-500 hover:border-white/20 hover:bg-[#0f1423]' },
  { status: 'absent', icon: XCircle, label: 'غائب', mobileLabel: 'غائب', activeClasses: 'bg-rose-500/20 border-rose-500/50 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]', inactiveClasses: 'bg-[#02040a]/60 border-white/5 text-slate-500 hover:border-white/20 hover:bg-[#0f1423]' },
  { status: 'late', icon: Clock, label: 'متأخر', mobileLabel: 'تأخر', activeClasses: 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]', inactiveClasses: 'bg-[#02040a]/60 border-white/5 text-slate-500 hover:border-white/20 hover:bg-[#0f1423]' },
  { status: 'excused', icon: AlertCircle, label: 'مستأذن', mobileLabel: 'عذر', activeClasses: 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]', inactiveClasses: 'bg-[#02040a]/60 border-white/5 text-slate-500 hover:border-white/20 hover:bg-[#0f1423]' }
];
 
export default function AttendancePage() {
  const { user, authRole, userRole, isChecking } = useAuth() as any; 
  const currentRole = authRole || userRole;
  const isAdmin = currentRole === 'admin' || currentRole === 'management';
 
  const { sections, daySchedule, loading: systemLoading, fetchDaySchedule, fetchSections, fetchStudentsAndAttendance, saveAttendance } = useAttendanceSystem();
 
  // =====================================
  // 1. حالات المعلم
  // =====================================
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
 
  const draftKey = useMemo(() => {
    if (currentRole !== 'teacher' || !user?.id || !selectedSection || !date || !period) return null;
    return `attendance_draft_${user.id}_${selectedSection}_${selectedSubject}_${date}_${period}`;
  }, [user?.id, selectedSection, selectedSubject, date, period, currentRole]);
 
  // =====================================
  // 2. حالات الإدارة 
  // =====================================
  const [snapshotDate, setSnapshotDate] = useState<string>('');
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  
  const [deptHeads, setDeptHeads] = useState<Record<string, string>>({});
  const [customDeptNames, setCustomDeptNames] = useState<Record<string, string>>({});
  const [excludedRecords, setExcludedRecords] = useState<Set<string>>(new Set());
 
  // =====================================
  // 3. حالات الطالب
  // =====================================
  const [studentStats, setStudentStats] = useState<any>({ present: 0, absent: 0, late: 0, excused: 0, fullDaysAbsent: 0 });
  const [subjectStats, setSubjectStats] = useState<any[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<any[]>([]);
  const [isStudentLoading, setIsStudentLoading] = useState(false);
  const [studentDbError, setStudentDbError] = useState<string | null>(null);
  const [activeSubjectTab, setActiveSubjectTab] = useState<string | null>(null);
 
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setDate(today);
    setSnapshotDate(today);
  }, []);
 
  // ==========================================================
  // 🚀 دوال الإدارة
  // ==========================================================
  const fetchDailySnapshot = useCallback(async () => {
    if (!user || !isAdmin || !snapshotDate) return;
    setAdminLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_attendance_stats')
        .select(`
          id, date, period, lesson_title, total_students, present_count, absent_count, late_count, excused_count,
          sections (name, classes(name)),
          subjects (name),
          users (full_name)
        `)
        .eq('date', snapshotDate)
        .order('period', { ascending: true });
 
      if (error) throw error;
      setDailyStats(data || []);
      setExcludedRecords(new Set()); 
      
      const newCustomDeptNames: Record<string, string> = {};
      data?.forEach((stat: any) => {
        const subjData: any = Array.isArray(stat.subjects) ? stat.subjects[0] : stat.subjects;
        const subjName = subjData?.name || 'مادة غير محددة';
        let dept = 'أقسام أخرى';
        if (/(علوم|فيزياء|كيمياء|أحياء|جيولوجيا)/.test(subjName)) dept = 'قسم العلوم';
        else if (/(رياضيات)/.test(subjName)) dept = 'قسم الرياضيات';
        else if (/(عربي|عربية)/.test(subjName)) dept = 'قسم اللغة العربية';
        else if (/(إنجليزي|انجليزي)/.test(subjName)) dept = 'قسم اللغة الإنجليزية';
        else if (/(إسلامية|قرآن|تجويد)/.test(subjName)) dept = 'قسم التربية الإسلامية';
        else if (/(اجتماعيات|تاريخ|جغرافيا|فلسفة|نفس)/.test(subjName)) dept = 'قسم الاجتماعيات';
        else if (/(حاسوب|معلوماتية)/.test(subjName)) dept = 'قسم الحاسوب';
        
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
    }
  }, [user, isAdmin, snapshotDate]);
 
  useEffect(() => {
    if (isAdmin) fetchDailySnapshot();
  }, [isAdmin, fetchDailySnapshot]);
 
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
      
      let dept = 'أقسام أخرى';
      if (/(علوم|فيزياء|كيمياء|أحياء|جيولوجيا)/.test(subjName)) dept = 'قسم العلوم';
      else if (/(رياضيات)/.test(subjName)) dept = 'قسم الرياضيات';
      else if (/(عربي|عربية)/.test(subjName)) dept = 'قسم اللغة العربية';
      else if (/(إنجليزي|انجليزي)/.test(subjName)) dept = 'قسم اللغة الإنجليزية';
      else if (/(إسلامية|قرآن|تجويد)/.test(subjName)) dept = 'قسم التربية الإسلامية';
      else if (/(اجتماعيات|تاريخ|جغرافيا|فلسفة|نفس)/.test(subjName)) dept = 'قسم الاجتماعيات';
      else if (/(حاسوب|معلوماتية)/.test(subjName)) dept = 'قسم الحاسوب';
      const teacherData: any = Array.isArray(stat.users) ? stat.users[0] : stat.users;
      
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
 
  // ==========================================================
  // 🚀 دوال المعلم
  // ==========================================================
  useEffect(() => {
    if (date && currentRole === 'teacher') {
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
    if (date && period && currentRole === 'teacher') {
      fetchSections(date, period).then(sectionsData => {
        if (sectionsData && sectionsData.length > 0) {
          setSelectedSection(sectionsData[0].id);
          setSelectedSubject(sectionsData[0].subject_id || '');
        } else { setSelectedSection(''); setSelectedSubject(''); setStudents([]); setLessonTitle(''); }
      });
    }
  }, [date, period, fetchSections, currentRole]);
 
  const loadStudentsAndAttendance = useCallback(async () => {
    if (selectedSection && date && currentRole === 'teacher') {
      setActiveKey(null);
      
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
    }
  }, [selectedSection, selectedSubject, date, period, fetchStudentsAndAttendance, currentRole, user?.id]);
 
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
 
  // ==========================================================
  // 🚀 دوال الطالب
  // ==========================================================
  const fetchStudentDataDirectly = useCallback(async () => {
    if (currentRole !== 'student' || !user) return;
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
 
  // 🚀 شاشات الحماية (الملكية)
  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-transparent font-cairo">
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
 
  // ==========================================================
  // 🚀 واجهة الإدارة 
  // ==========================================================
  if (isAdmin) {
    return (
      <div className="min-h-screen relative bg-transparent text-slate-100 pb-32 overflow-x-hidden font-cairo pt-6" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6 sm:space-y-8">
          
          <div className="flex justify-end">
            <Link href="/attendance/reports" className="flex items-center gap-2 text-blue-400 font-bold bg-[#0f1423] px-5 py-2.5 rounded-xl sm:rounded-2xl border border-blue-500/30 transition-all hover:bg-blue-500 hover:text-slate-950 active:scale-95 text-sm sm:text-base shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <BarChart2 className="w-5 h-5" /> تقارير الإنذارات الشاملة
            </Link>
          </div>
 
          <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-r from-[#02040a] via-[#0f1423] to-[#02040a] border border-white/10 p-6 sm:p-10 lg:p-12 text-white shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
            <div className="relative z-10 flex flex-col gap-4 text-center sm:text-right">
              <div className="inline-flex w-fit mx-auto sm:mx-0 items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-black text-blue-400 uppercase tracking-widest shadow-sm">
                <Layers className="w-4 h-4" /> مركز الإدارة الشامل
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight drop-shadow-md text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
                إحصائيات الأقسام الإدارية
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm lg:text-base font-bold max-w-2xl leading-relaxed mx-auto sm:mx-0">
                هذه الصفحة مخصصة لمدير المدرسة لرؤية اللقطات الإحصائية مجمعة حسب القسم والمرحلة. يمكنك كتابة اسم <span className="text-blue-400">رئيس القسم</span> واستبعاد من لا ينتمي للقسم قبل الطباعة.
              </p>
            </div>
            <div className="absolute -left-10 -top-10 h-48 w-48 sm:h-64 sm:w-64 rounded-full bg-blue-500/10 blur-[80px] pointer-events-none"></div>
          </div>
 
          <div className="glass-panel p-5 sm:p-6 lg:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3 text-white font-black text-base sm:text-lg drop-shadow-sm w-full md:w-auto">
              <div className="p-2 sm:p-2.5 bg-blue-500/10 rounded-lg sm:rounded-xl border border-blue-500/20"><Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" /></div> اختر يوم الإحصائية:
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <input type="date" value={snapshotDate} onChange={(e) => setSnapshotDate(e.target.value)} className="w-full sm:w-auto rounded-xl sm:rounded-2xl border border-white/10 py-3 sm:py-3.5 px-4 sm:px-6 text-white bg-[#02040a]/60 focus:ring-2 focus:ring-blue-500/50 text-sm font-bold outline-none shadow-inner" style={{ colorScheme: 'dark' }} />
              <button onClick={fetchDailySnapshot} className="w-full sm:w-auto px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400/50 shrink-0 active:scale-95">تحديث الإحصائيات</button>
            </div>
          </div>
 
          {adminLoading ? (
            <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-blue-500 animate-spin drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" /></div>
          ) : dailyStats.length === 0 ? (
            <div className="glass-panel py-16 sm:py-20 text-center rounded-[2rem] sm:rounded-[2.5rem] border border-dashed border-white/10 shadow-inner px-4">
              <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 font-bold text-sm sm:text-base">لا توجد إحصائيات معتمدة من المعلمين في هذا اليوم.</p>
            </div>
          ) : (
            Object.keys(groupedDailyStats).map(stage => {
              const stageData = groupedDailyStats[stage];
              if (Object.keys(stageData).length === 0) return null;
              
              return (
                <div key={stage} className="space-y-6 sm:space-y-8">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white border-r-4 border-blue-500 pr-3 sm:pr-4 drop-shadow-md">{stage}</h2>
                  
                  {Object.keys(stageData).map(dept => {
                    const recordsList = stageData[dept];
                    const deptKey = `${stage}-${dept}`;
                    const currentHead = deptHeads[deptKey] || '';
                    const customDeptName = customDeptNames[deptKey] || dept;
 
                    return (
                      <div key={dept} className="glass-panel rounded-[1.5rem] sm:rounded-[2.5rem] relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 left-0 w-32 h-32 sm:w-48 sm:h-48 bg-blue-500/10 rounded-full blur-[60px] pointer-events-none"></div>
                        <div className="p-5 sm:p-6 lg:p-8 border-b border-white/5 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5 sm:gap-6 bg-[#02040a]/40 relative z-10">
                          <div className="flex items-center gap-3 w-full xl:w-auto">
                            <div className="p-2 sm:p-2.5 bg-blue-500/10 rounded-lg sm:rounded-xl border border-blue-500/20 shrink-0"><Layers className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" /></div>
                            <input 
                              type="text" 
                              value={customDeptName}
                              onChange={(e) => setCustomDeptNames(prev => ({...prev, [deptKey]: e.target.value}))}
                              className="bg-transparent border-none text-lg sm:text-xl font-black text-blue-400 outline-none w-full placeholder:text-slate-600 focus:ring-0 drop-shadow-sm"
                              placeholder="اسم القسم..."
                            />
                          </div>
                          
                          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full xl:w-auto">
                            <div className="flex items-center gap-2 sm:gap-3 bg-[#0f1423] px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border border-white/5 w-full sm:w-auto shadow-inner">
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
                              className="flex items-center justify-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-black transition-all border border-blue-400/50 active:scale-95 w-full sm:w-auto shrink-0 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                            >
                              <Printer className="w-4 h-4" /> اعتماد وطباعة
                            </button>
                          </div>
                        </div>
                        
                        <div className="overflow-x-auto pb-4 custom-scrollbar relative z-10">
                          <table className="w-full text-right whitespace-nowrap min-w-[900px]">
                            <thead>
                              <tr className="bg-[#0f1423]/60 border-b border-white/5">
                                <th className="py-4 px-4 text-[10px] sm:text-xs font-black text-center text-slate-400 w-24">تضمين بالطباعة</th>
                                <th className="py-4 px-6 text-[10px] sm:text-xs font-black uppercase text-blue-400/80">اسم المدرس</th>
                                <th className="py-4 px-6 text-[10px] sm:text-xs font-black uppercase text-slate-400">عنوان الدرس</th>
                                <th className="py-4 px-6 text-[10px] sm:text-xs font-black uppercase text-slate-400 text-center">المادة</th>
                                <th className="py-4 px-4 text-[10px] sm:text-xs font-black uppercase text-slate-400 text-center">الإجمالي</th>
                                <th className="py-4 px-4 text-[10px] sm:text-xs font-black uppercase text-rose-400 text-center">الغياب</th>
                                <th className="py-4 px-4 text-[10px] sm:text-xs font-black uppercase text-emerald-400 text-center">الحضور</th>
                                <th className="py-4 px-4 text-[10px] sm:text-xs font-black uppercase text-slate-400 text-center">الحصة</th>
                                <th className="py-4 px-6 text-[10px] sm:text-xs font-black uppercase text-slate-400 text-center">الصف</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {recordsList.map((r, i) => {
                                const isExcluded = excludedRecords.has(r.id);
                                const showTeacher = i === 0 || r.teacher !== recordsList[i - 1].teacher;
                                
                                return (
                                  <tr key={i} className={`transition-colors ${isExcluded ? 'opacity-30 bg-[#02040a]' : 'hover:bg-white/[0.02]'}`}>
                                    <td className="py-3 sm:py-4 px-4 text-center">
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
                                          className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer accent-blue-500 rounded border-white/10 bg-[#02040a]"
                                       />
                                    </td>
                                    <td className={`py-3 sm:py-4 px-6 font-black text-xs sm:text-sm ${isExcluded ? 'line-through text-slate-600' : 'text-white'}`}>
                                      {showTeacher ? r.teacher : ''}
                                    </td>
                                    <td className="py-3 sm:py-4 px-6 font-bold text-slate-300 text-xs sm:text-sm truncate max-w-[200px]" title={r.lesson}>{r.lesson}</td>
                                    <td className="py-3 sm:py-4 px-6 font-bold text-slate-400 text-xs sm:text-sm text-center">{r.subject}</td>
                                    <td className="py-3 sm:py-4 px-4 font-black text-white text-sm sm:text-base text-center bg-[#02040a]/40 border-x border-white/5">{r.total}</td>
                                    <td className="py-3 sm:py-4 px-4 font-black text-rose-400 text-sm sm:text-base text-center">{r.absent}</td>
                                    <td className="py-3 sm:py-4 px-4 font-black text-emerald-400 text-sm sm:text-base text-center">{r.present}</td>
                                    <td className="py-3 sm:py-4 px-4 font-black text-slate-300 text-xs sm:text-sm text-center bg-[#02040a]/40 border-x border-white/5">{r.period}</td>
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

  // ==========================================================
  // 🚀 واجهة الطالب (Student Royal Dashboard)
  // ==========================================================
  if (currentRole === 'student') {
    if (isStudentLoading) {
      return <div className="py-20 flex justify-center items-center min-h-screen"><Loader2 className="w-12 h-12 text-emerald-500 animate-spin" /></div>;
    }

    return (
      <div className="min-h-screen relative bg-transparent text-slate-100 pb-32 overflow-x-hidden font-cairo pt-6" dir="rtl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6 sm:space-y-8">
          
          <div className="glass-panel p-6 sm:p-8 lg:p-10 rounded-[2rem] sm:rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-black text-emerald-400 uppercase tracking-widest mb-3">
                <BarChart2 className="w-4 h-4" /> تقريري الشخصي
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2 drop-shadow-md">سجل الحضور والغياب</h1>
              <p className="text-sm text-slate-400 font-bold">مرحباً بك، يمكنك هنا متابعة تفاصيل حضورك وغيابك في جميع المواد.</p>
            </div>
            {studentStats.fullDaysAbsent > 0 && (
              <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl text-rose-400 flex items-center gap-3">
                <ShieldAlert className="w-8 h-8 shrink-0" />
                <div>
                  <p className="font-black text-lg">تنبيه غياب!</p>
                  <p className="text-xs font-bold text-rose-300">لقد تجاوزت {studentStats.fullDaysAbsent} يوم غياب فعلي.</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel p-6 rounded-[2rem] flex flex-col justify-center items-center text-center border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-3" /><p className="text-3xl font-black text-white">{studentStats.present}</p><p className="text-xs font-bold text-emerald-400 mt-1">حصة حضور</p>
            </div>
            <div className="glass-panel p-6 rounded-[2rem] flex flex-col justify-center items-center text-center border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
              <XCircle className="h-8 w-8 text-rose-400 mb-3" /><p className="text-3xl font-black text-white">{studentStats.absent}</p><p className="text-xs font-bold text-rose-400 mt-1">حصة غياب</p>
            </div>
            <div className="glass-panel p-6 rounded-[2rem] flex flex-col justify-center items-center text-center border-amber-500/20">
              <Clock className="h-8 w-8 text-amber-400 mb-3" /><p className="text-3xl font-black text-white">{studentStats.late}</p><p className="text-xs font-bold text-amber-400 mt-1">حصة تأخير</p>
            </div>
            <div className="glass-panel p-6 rounded-[2rem] flex flex-col justify-center items-center text-center border-blue-500/20">
              <AlertCircle className="h-8 w-8 text-blue-400 mb-3" /><p className="text-3xl font-black text-white">{studentStats.excused}</p><p className="text-xs font-bold text-blue-400 mt-1">استئذان</p>
            </div>
          </div>

          {Object.keys(groupedAttendanceRecords).length > 0 ? (
            <div className="glass-panel rounded-[2rem] overflow-hidden">
              <div className="flex overflow-x-auto custom-scrollbar border-b border-white/5 bg-[#02040a]/40 p-2">
                {Object.keys(groupedAttendanceRecords).map(subject => (
                  <button key={subject} onClick={() => setActiveSubjectTab(subject)} className={`px-6 py-3 font-black text-sm rounded-xl transition-all whitespace-nowrap ${activeSubjectTab === subject ? 'bg-white/10 text-emerald-400 shadow-inner border border-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                    {subject}
                  </button>
                ))}
              </div>
              <div className="p-4 sm:p-6 divide-y divide-white/5">
                {activeSubjectTab && groupedAttendanceRecords[activeSubjectTab]?.map((record: any, idx: number) => (
                  <div key={idx} className="py-4 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl border ${record.status === 'absent' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : record.status === 'late' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'}`}>
                        {record.status === 'absent' ? <XCircle className="w-5 h-5" /> : record.status === 'late' ? <Clock className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-black text-white text-sm sm:text-base">{record.date}</p>
                        <p className="text-xs font-bold text-slate-400 mt-1">الحصة {record.period} • {record.teacherName}</p>
                      </div>
                    </div>
                    <div className={`px-4 py-1.5 rounded-lg text-xs font-black border ${record.status === 'absent' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : record.status === 'late' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                      {record.status === 'absent' ? 'غياب' : record.status === 'late' ? 'تأخير' : 'عذر'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass-panel py-20 text-center rounded-[2rem] border-dashed">
              <CheckCircle2 className="w-16 h-16 text-emerald-500/50 mx-auto mb-4" />
              <p className="text-emerald-400 font-bold text-xl">سجلك نظيف! لا توجد غيابات أو تأخيرات.</p>
            </div>
          )}
        </motion.div>
      </div>
    );
  }
 
  // ==========================================================
  // 🚀 واجهة المعلم (Mobile-First Royal Grid)
  // ==========================================================
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
      <div className="min-h-screen relative bg-transparent text-slate-100 pb-32 overflow-x-hidden font-cairo" dir="rtl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pt-8 px-4 sm:px-6 lg:px-8 relative z-10">
          
          <AnimatePresence>
            {message.text && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-5 sm:px-6 py-3 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] font-bold text-white text-xs sm:text-sm flex items-center gap-3 border backdrop-blur-3xl w-[90%] sm:w-auto ${message.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50' : 'bg-rose-950/90 border-rose-500/50'}`}>
                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />} {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 🚀 الهيدر الفخم للمعلم */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6 glass-panel p-6 sm:p-8 lg:p-10 rounded-[2rem] sm:rounded-[2.5rem]">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] sm:text-xs font-black text-amber-400 uppercase tracking-widest mb-3 shadow-inner">
                <LayoutGrid className="w-3.5 h-3.5" /> تسجيل الغياب اليومي
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mb-2 drop-shadow-md">لوحة رصد الحضور</h1>
              <p className="text-xs sm:text-sm text-slate-400 font-bold max-w-md">يتم حفظ لقطة إحصائية متكاملة للإدارة عند اعتماد السجل من قبلك.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0">
              <Link href="/attendance/reports" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-[#0f1423]/80 border border-white/10 px-5 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-slate-300 hover:bg-[#02040a] hover:text-amber-400 transition-all shrink-0 shadow-inner">
                <BarChart2 className="h-5 w-5 opacity-70" /> تقارير طلابي
              </Link>
              <button onClick={handleSave} disabled={saving || students.length === 0 || !lessonTitle} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 px-6 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:from-amber-400 hover:to-yellow-500 transition-all active:scale-95 disabled:opacity-50 shrink-0 border border-amber-300/50">
                {saving ? <div className="h-5 w-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div> : <Save className="h-5 w-5" />}
                {saving ? 'جاري الحفظ...' : 'اعتماد السجل'}
              </button>
            </div>
          </div>

          {/* 🚀 أدوات الرصد */}
          <div className="glass-panel p-5 sm:p-6 lg:p-8 rounded-[2rem] sm:rounded-[2.5rem]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              <div className="space-y-2 flex flex-col w-full">
                <label className="text-[10px] sm:text-xs font-black text-slate-400 pl-1 uppercase tracking-widest">التاريخ</label>
                <div className="relative w-full">
                  <Calendar className="absolute inset-y-0 right-4 h-full w-4 sm:w-5 text-slate-500 pointer-events-none" />
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl sm:rounded-2xl border border-white/5 py-3 sm:py-3.5 pr-10 sm:pr-12 pl-4 text-white bg-[#02040a]/60 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 text-xs sm:text-sm font-bold outline-none shadow-inner transition-all" style={{ colorScheme: 'dark' }} />
                </div>
              </div>
              <div className="space-y-2 flex flex-col w-full">
                <label className="text-[10px] sm:text-xs font-black text-slate-400 pl-1 uppercase tracking-widest">الحصة</label>
                <div className="relative w-full">
                  <Clock className="absolute inset-y-0 right-4 h-full w-4 sm:w-5 text-slate-500 pointer-events-none" />
                  <select value={period} onChange={(e) => setPeriod(parseInt(e.target.value))} className="w-full rounded-xl sm:rounded-2xl border border-white/5 py-3 sm:py-3.5 pr-10 sm:pr-12 pl-4 text-white bg-[#02040a]/60 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 text-xs sm:text-sm font-bold outline-none appearance-none [&>option]:bg-[#0f1423] shadow-inner transition-all">
                    {daySchedule.length > 0 ? daySchedule.map(s => <option key={s.period} value={s.period}>الحصة {s.period}</option>) : <option value={1}>لا توجد حصص</option>}
                  </select>
                </div>
              </div>
              <div className="space-y-2 flex flex-col w-full">
                <label className="text-[10px] sm:text-xs font-black text-slate-400 pl-1 uppercase tracking-widest">الفصل والمادة</label>
                <div className="relative w-full">
                  <BookOpen className="absolute inset-y-0 right-4 h-full w-4 sm:w-5 text-slate-500 pointer-events-none" />
                  <select value={`${selectedSection}|${selectedSubject}`} onChange={(e) => { const parts = e.target.value.split('|'); setSelectedSection(parts[0]); setSelectedSubject(parts[1] || ''); }} className="w-full rounded-xl sm:rounded-2xl border border-white/5 py-3 sm:py-3.5 pr-10 sm:pr-12 pl-4 text-white bg-[#02040a]/60 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 text-xs sm:text-sm font-bold outline-none appearance-none [&>option]:bg-[#0f1423] truncate shadow-inner transition-all">
                    {sections.length > 0 ? sections.map((s, idx) => <option key={`${s.id}|${s.subject_id || idx}`} value={`${s.id}|${s.subject_id || ''}`}>{(s as any).classes?.[0]?.name || (s as any).classes?.name} - {s.name}</option>) : <option>لا توجد فصول</option>}
                  </select>
                </div>
              </div>
              <div className="space-y-2 flex flex-col w-full">
                <label className="text-[10px] sm:text-xs font-black text-amber-400 flex gap-1 pl-1 uppercase tracking-widest">عنوان الدرس <span className="text-rose-500">*</span></label>
                <div className="relative w-full">
                  <BookType className="absolute inset-y-0 right-4 h-full w-4 sm:w-5 text-slate-500 pointer-events-none" />
                  <input type="text" required placeholder="مثال: قوانين نيوتن..." value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} className="w-full rounded-xl sm:rounded-2xl border border-amber-500/30 py-3 sm:py-3.5 pr-10 sm:pr-12 pl-4 text-white bg-[#0f1423]/80 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-xs sm:text-sm font-bold outline-none placeholder:text-slate-600 transition-all shadow-inner" />
                </div>
              </div>
            </div>
            
            {selectedSection && selectedSubject && (
              <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-amber-400/80 text-[10px] sm:text-xs font-black w-full sm:w-auto bg-amber-500/10 px-3 py-2 rounded-xl border border-amber-500/20 shadow-inner">
                  <Info className="w-4 h-4 shrink-0" /> <span className="leading-tight">يرجى التأكد من كتابة عنوان الدرس لاعتماده في الإدارة.</span>
                </div>
                {user?.id && <div className="w-full sm:w-auto"><TeacherCheckInButton teacherId={user.id} periodNumber={period} selectedDate={date} className="w-full sm:w-auto shadow-[0_0_15px_rgba(59,130,246,0.3)]" /></div>}
              </div>
            )}
          </div>

          {/* 🚀 إحصائيات الرصد */}
          {students.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              <div className="glass-panel p-4 sm:p-5 rounded-[1.5rem] flex flex-col justify-center items-center text-center">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white mb-2 opacity-50" /><p className="text-xl sm:text-2xl font-black text-white">{students.length}</p><p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase mt-1">الطلاب</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 sm:p-5 rounded-[1.5rem] flex flex-col justify-center items-center text-center shadow-inner">
                <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400 mb-2 drop-shadow-md" /><p className="text-xl sm:text-2xl font-black text-emerald-400 drop-shadow-sm">{presentCount}</p><p className="text-[9px] sm:text-[10px] font-bold text-emerald-500/70 uppercase mt-1">حاضر</p>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/30 p-4 sm:p-5 rounded-[1.5rem] flex flex-col justify-center items-center text-center shadow-inner">
                <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-rose-400 mb-2 drop-shadow-md" /><p className="text-xl sm:text-2xl font-black text-rose-400 drop-shadow-sm">{absentCount}</p><p className="text-[9px] sm:text-[10px] font-bold text-rose-500/70 uppercase mt-1">غائب</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 p-4 sm:p-5 rounded-[1.5rem] flex flex-col justify-center items-center text-center shadow-inner">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400 mb-2 drop-shadow-md" /><p className="text-xl sm:text-2xl font-black text-amber-400 drop-shadow-sm">{lateCount}</p><p className="text-[9px] sm:text-[10px] font-bold text-amber-500/70 uppercase mt-1">متأخر</p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 p-4 sm:p-5 rounded-[1.5rem] flex flex-col justify-center items-center text-center shadow-inner">
                <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400 mb-2 drop-shadow-md" /><p className="text-xl sm:text-2xl font-black text-blue-400 drop-shadow-sm">{excusedCount}</p><p className="text-[9px] sm:text-[10px] font-bold text-blue-500/70 uppercase mt-1">مستأذن</p>
              </div>
              <div className={`p-4 sm:p-5 rounded-[1.5rem] border flex flex-col justify-center items-center text-center shadow-inner transition-colors ${unmarkedCount > 0 ? 'bg-[#02040a]/60 border-white/5' : 'bg-emerald-500/20 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.2)]'}`}>
                {unmarkedCount > 0 ? <UserMinus className="h-5 w-5 sm:h-6 sm:w-6 text-slate-500 mb-2" /> : <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400 mb-2 drop-shadow-md" />}
                <p className={`text-xl sm:text-2xl font-black drop-shadow-sm ${unmarkedCount > 0 ? 'text-white' : 'text-emerald-400'}`}>{unmarkedCount}</p>
                <p className={`text-[9px] sm:text-[10px] font-bold uppercase mt-1 ${unmarkedCount > 0 ? 'text-slate-500' : 'text-emerald-500'}`}>{unmarkedCount > 0 ? 'متبقي' : 'اكتمل'}</p>
              </div>
            </div>
          )}

          {/* 🚀 قائمة الطلاب المتجاوبة (Mobile First Royal List) */}
          {students.length > 0 && (
            <div className="glass-panel rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden">
              <div className="p-5 sm:p-6 lg:p-8 border-b border-white/5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6 bg-[#02040a]/40">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-inner"><Users className="h-5 w-5 sm:h-6 sm:w-6" /></div>
                  <h3 className="text-lg sm:text-xl font-black text-white drop-shadow-md">قائمة الطلاب</h3>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 bg-[#0f1423]/60 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border border-white/5 w-full lg:w-auto shadow-inner">
                   <button onClick={() => markAllAs('present')} className="w-full sm:w-auto px-4 py-3 sm:py-2.5 text-xs sm:text-sm text-emerald-400 hover:bg-emerald-500/20 rounded-lg sm:rounded-xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 border border-transparent hover:border-emerald-500/30"><CheckCircle2 className="w-4 h-4 shrink-0" /> الكل حاضر</button>
                   <button onClick={() => markAllAs('absent')} className="w-full sm:w-auto px-4 py-3 sm:py-2.5 text-xs sm:text-sm text-rose-400 hover:bg-rose-500/20 rounded-lg sm:rounded-xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 border border-transparent hover:border-rose-500/30"><XCircle className="w-4 h-4 shrink-0" /> الكل غائب</button>
                </div>
              </div>
              
              <div className="bg-transparent p-2 sm:p-4">
                <div className="space-y-3 sm:space-y-0 sm:divide-y divide-white/5">
                  {students.map((student: any) => (
                    <div key={student.id} className="p-3 sm:p-4 bg-[#02040a]/40 sm:bg-transparent rounded-2xl sm:rounded-none border border-white/5 sm:border-transparent hover:bg-white/[0.02] transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
                      
                      {/* 🚀 معلومات الطالب */}
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0 lg:w-1/3 shrink-0 px-1 sm:px-0">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-[#0f1423] border border-white/10 text-slate-400 flex items-center justify-center font-black text-base sm:text-lg shrink-0 shadow-inner group-hover:text-amber-400 transition-colors">
                          {student.users?.full_name?.charAt(0)}
                        </div>
                        <span className="font-black text-white text-sm sm:text-base truncate drop-shadow-sm">{student.users?.full_name}</span>
                      </div>

                      {/* 🚀 خيارات الحضور (متجاوبة تماماً للجوال) */}
                      <div className="grid grid-cols-4 lg:flex lg:flex-1 gap-1.5 sm:gap-2 lg:justify-end">
                        {ATTENDANCE_OPTIONS.map((opt) => (
                          <label key={opt.status} className="cursor-pointer block lg:w-32">
                            <input type="radio" checked={attendance[student.id] === opt.status} onChange={() => handleStatusChange(student.id, opt.status as any)} className="sr-only" />
                            <div className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border transition-all active:scale-95 text-center h-full ${attendance[student.id] === opt.status ? opt.activeClasses : opt.inactiveClasses}`}>
                               <opt.icon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 drop-shadow-md" /> 
                               <span className="text-[10px] sm:text-xs font-black">{opt.mobileLabel}</span>
                            </div>
                          </label>
                        ))}
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

  // 🚀 في حال حاول شخص غريب (غير مصرح له) الدخول للصفحة
  return (
    <div className="flex flex-col items-center justify-center min-h-screen font-cairo bg-[#02040a]">
      <ShieldAlert className="w-16 h-16 text-rose-500 mb-4" />
      <h2 className="text-2xl font-black text-white">وصول مقيد</h2>
      <p className="text-slate-400 mt-2">عذراً، ليس لديك صلاحية لعرض هذه الصفحة.</p>
    </div>
  );
}
