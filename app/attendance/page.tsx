/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calendar, Save, CheckCircle2, XCircle, Clock, AlertCircle, Users, 
  LayoutGrid, Info, ShieldCheck, BookOpen, UserMinus, BarChart2, 
  Bug, RefreshCw, Calculator, Layers, PieChart, Loader2, BookType, Printer, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

import { supabase } from '@/lib/supabase'; 
import { useAttendanceSystem, AttendanceStatus } from '@/hooks/useAttendanceSystem';
import { useAuth } from '@/context/auth-context';
import TeacherCheckInButton from '@/components/TeacherCheckInButton';
import { format } from 'date-fns';

const ATTENDANCE_OPTIONS = [
  { status: 'present', icon: CheckCircle2, label: 'حاضر', mobileLabel: 'حاضر', activeClasses: 'bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]', inactiveClasses: 'bg-[#090b14]/50 border-white/10 text-slate-400 hover:border-emerald-400/50 hover:bg-[#131836]' },
  { status: 'absent', icon: XCircle, label: 'غائب', mobileLabel: 'غائب', activeClasses: 'bg-rose-500/20 border-rose-400 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]', inactiveClasses: 'bg-[#090b14]/50 border-white/10 text-slate-400 hover:border-rose-400/50 hover:bg-[#131836]' },
  { status: 'late', icon: Clock, label: 'متأخر', mobileLabel: 'تأخر', activeClasses: 'bg-amber-500/20 border-amber-400 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]', inactiveClasses: 'bg-[#090b14]/50 border-white/10 text-slate-400 hover:border-amber-400/50 hover:bg-[#131836]' },
  { status: 'excused', icon: AlertCircle, label: 'مستأذن', mobileLabel: 'عذر', activeClasses: 'bg-blue-500/20 border-blue-400 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]', inactiveClasses: 'bg-[#090b14]/50 border-white/10 text-slate-400 hover:border-blue-400/50 hover:bg-[#131836]' }
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

  // 🚀 مفتاح الكاش اللحظي الخاص بالمعلم بناءً على اختياراته
  const draftKey = useMemo(() => {
    if (currentRole !== 'teacher' || !user?.id || !selectedSection || !date || !period) return null;
    return `attendance_draft_${user.id}_${selectedSection}_${selectedSubject}_${date}_${period}`;
  }, [user?.id, selectedSection, selectedSubject, date, period, currentRole]);

  // =====================================
  // 2. حالات الإدارة (الميزة الجديدة للمدير)
  // =====================================
  const [snapshotDate, setSnapshotDate] = useState<string>('');
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  
  const [deptHeads, setDeptHeads] = useState<Record<string, string>>({});
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

  // تهيئة التاريخ
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setDate(today);
    setSnapshotDate(today);
  }, []);

  // ==========================================================
  // 🚀 دوال الإدارة (تعمل فقط إذا كان المستخدم مديراً)
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
      setExcludedRecords(new Set()); // إعادة ضبط المستبعدين عند جلب بيانات جديدة
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
    dailyStats.forEach(stat => {
      const classData: any = Array.isArray(stat.sections?.classes) ? stat.sections?.classes[0] : stat.sections?.classes;
      const className = classData?.name || '';
      const fullClassName = `${className} - ${stat.sections?.name || ''}`;
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
  // 🚀 دوال المعلم مع الكاش اللحظي 
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
      const res = await fetchStudentsAndAttendance(selectedSection, selectedSubject, date, period);
      if (res) {
        const sortedStudents = [...res.students].sort((a: any, b: any) => {
          const userA = Array.isArray(a.users) ? a.users[0] : a.users;
          const userB = Array.isArray(b.users) ? b.users[0] : b.users;
          return (userA?.full_name || '').localeCompare(userB?.full_name || '', 'ar'); 
        });
        setStudents(sortedStudents); 
        
        // 🚀 استرجاع الكاش اللحظي بأمان 
        const cacheKey = `attendance_draft_${user?.id}_${selectedSection}_${selectedSubject}_${date}_${period}`;
        const cachedStr = localStorage.getItem(cacheKey);
        
        if (cachedStr) {
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
      }
    }
  }, [selectedSection, selectedSubject, date, period, fetchStudentsAndAttendance, currentRole, user?.id]);

  useEffect(() => { loadStudentsAndAttendance(); }, [loadStudentsAndAttendance]);

  // 🚀 حفظ الكاش التلقائي عند أي تغيير
  useEffect(() => {
    if (currentRole === 'teacher' && draftKey && students.length > 0) {
      if (Object.keys(attendance).length > 0 || lessonTitle) {
        const draft = { attendance, lessonTitle };
        localStorage.setItem(draftKey, JSON.stringify(draft));
      }
    }
  }, [attendance, lessonTitle, draftKey, currentRole, students.length]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => { setAttendance(prev => ({ ...prev, [studentId]: status })); };
  const markAllAs = (status: AttendanceStatus) => { const newAttendance = { ...attendance }; students.forEach(s => { newAttendance[s.id] = status; }); setAttendance(newAttendance); };

  const handleSave = async () => {
    setSaving(true); setMessage({ text: '', type: '' });
    try {
      await saveAttendance(selectedSection, selectedSubject, date, period, attendance, students, lessonTitle);
      setMessage({ text: 'تم حفظ سجل الحضور والغياب بنجاح!', type: 'success' });
      
      // 🚀 تنظيف الكاش بعد الاعتماد بنجاح
      if (draftKey) localStorage.removeItem(draftKey);
      
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

  // ==========================================================
  // 🚀 واجهة الإدارة (الميزة التي طلبها المدير)
  // ==========================================================
  if (isAdmin) {
    return (
      <div className="min-h-screen relative bg-[#090b14] text-slate-200 pb-32 overflow-x-hidden font-cairo" dir="rtl">
        <div className="fixed top-1/4 right-[-10%] w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-[140px] pointer-events-none z-0" />
        <div className="fixed bottom-0 left-[-10%] w-[600px] h-[600px] bg-emerald-500/15 rounded-full blur-[140px] pointer-events-none z-0" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto pt-8 px-4 sm:px-6 lg:px-8 relative z-10 space-y-8">
          
          <div className="flex justify-end">
            <Link href="/attendance/reports" className="flex items-center gap-2 text-emerald-400 font-bold bg-emerald-500/10 px-5 py-2.5 rounded-2xl border border-emerald-500/20 transition-all hover:bg-emerald-500 hover:text-slate-900 active:scale-95 text-sm sm:text-base">
              <BarChart2 className="w-5 h-5" /> تقارير الإنذارات
            </Link>
          </div>

          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-[#131836] via-[#1a2044] to-[#0f142b] border border-white/10 p-8 sm:p-12 text-white shadow-[0_0_40px_rgba(0,0,0,0.5)]">
            <div className="relative z-10 flex flex-col gap-4">
              <div className="inline-flex w-fit items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-xs font-black text-emerald-400 uppercase tracking-widest backdrop-blur-sm shadow-sm">
                <Layers className="w-4 h-4" /> مركز الإدارة الشامل
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight drop-shadow-md">
                إحصائيات الأقسام الإدارية
              </h1>
              <p className="text-slate-400 text-sm sm:text-base font-bold max-w-2xl leading-relaxed">
                هذه الصفحة مخصصة لمدير المدرسة لرؤية اللقطات الإحصائية مجمعة حسب القسم والمرحلة. يمكنك كتابة اسم <span className="text-emerald-400">رئيس القسم</span> واستبعاد من لا ينتمي للقسم قبل الطباعة.
              </p>
            </div>
            <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
          </div>

          <div className="bg-[#131836]/60 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3 text-emerald-400 font-black text-lg">
              <Calendar className="w-6 h-6" /> اختر يوم الإحصائية لعرضه:
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <input type="date" value={snapshotDate} onChange={(e) => setSnapshotDate(e.target.value)} className="w-full sm:w-auto rounded-2xl border border-white/10 py-3.5 px-6 text-white bg-[#090b14]/80 focus:ring-2 focus:ring-emerald-400 text-sm font-bold outline-none" style={{ colorScheme: 'dark' }} />
              <button onClick={fetchDailySnapshot} className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0">تحديث الإحصائيات</button>
            </div>
          </div>

          {adminLoading ? (
            <div className="py-20 flex justify-center"><Loader2 className="w-12 h-12 text-emerald-500 animate-spin drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" /></div>
          ) : dailyStats.length === 0 ? (
            <div className="bg-[#131836]/40 backdrop-blur-xl py-20 text-center rounded-[2.5rem] border border-white/5"><BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" /><p className="text-slate-400 font-bold text-xl">لا توجد إحصائيات معتمدة من المعلمين في هذا اليوم.</p></div>
          ) : (
            Object.keys(groupedDailyStats).map(stage => {
              const stageData = groupedDailyStats[stage];
              if (Object.keys(stageData).length === 0) return null;
              
              return (
                <div key={stage} className="space-y-6">
                  <h2 className="text-2xl sm:text-3xl font-black text-white border-r-4 border-emerald-500 pr-4 drop-shadow-md">{stage}</h2>
                  
                  {Object.keys(stageData).map(dept => {
                    const recordsList = stageData[dept];
                    const deptKey = `${stage}-${dept}`;
                    const currentHead = deptHeads[deptKey] || '';

                    return (
                      <div key={dept} className="bg-[#131836]/60 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
                        <div className="p-6 sm:p-8 border-b border-white/5 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 bg-[#090b14]/30">
                          <h3 className="text-xl font-black text-emerald-400 flex items-center gap-3 shrink-0">
                            <Layers className="w-6 h-6" /> {dept}
                          </h3>
                          
                          <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                            <div className="flex items-center gap-3 bg-[#090b14]/80 px-4 py-2.5 rounded-2xl border border-white/10 w-full sm:w-auto">
                               <span className="text-xs font-black text-slate-400 shrink-0">رئيس القسم:</span>
                               <input 
                                 type="text" 
                                 placeholder="اكتب الاسم لاعتماده..." 
                                 value={currentHead}
                                 onChange={(e) => setDeptHeads(prev => ({...prev, [deptKey]: e.target.value}))}
                                 className="bg-transparent border-none text-emerald-400 font-black text-sm outline-none w-full sm:w-48 placeholder:text-slate-600 focus:ring-0"
                               />
                            </div>
                            <button 
                              onClick={() => {
                                const finalRecords = recordsList.filter(r => !excludedRecords.has(r.id));
                                printDepartmentReport(stage, dept, finalRecords, currentHead);
                              }} 
                              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black transition-all border border-white/10 active:scale-95 w-full sm:w-auto shrink-0"
                            >
                              <Printer className="w-4 h-4" /> اعتماد وطباعة
                            </button>
                          </div>
                        </div>
                        
                        <div className="overflow-x-auto pb-4 custom-scrollbar">
                          <table className="w-full text-right whitespace-nowrap min-w-[900px]">
                            <thead>
                              <tr className="bg-white/5 border-b border-white/5">
                                <th className="py-4 px-4 text-xs font-black text-center text-slate-500 w-24">تضمين بالطباعة</th>
                                <th className="py-4 px-6 text-xs font-black uppercase text-slate-400">اسم المدرس</th>
                                <th className="py-4 px-6 text-xs font-black uppercase text-slate-400">عنوان الدرس</th>
                                <th className="py-4 px-6 text-xs font-black uppercase text-slate-400 text-center">المادة</th>
                                <th className="py-4 px-4 text-xs font-black uppercase text-slate-400 text-center">الإجمالي</th>
                                <th className="py-4 px-4 text-xs font-black uppercase text-rose-400 text-center">الغياب</th>
                                <th className="py-4 px-4 text-xs font-black uppercase text-emerald-400 text-center">الحضور</th>
                                <th className="py-4 px-4 text-xs font-black uppercase text-slate-400 text-center">الحصة</th>
                                <th className="py-4 px-6 text-xs font-black uppercase text-slate-400 text-center">الصف</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {recordsList.map((r, i) => {
                                const isExcluded = excludedRecords.has(r.id);
                                const showTeacher = i === 0 || r.teacher !== recordsList[i - 1].teacher;
                                
                                return (
                                  <tr key={i} className={`transition-colors ${isExcluded ? 'opacity-30 bg-[#090b14]' : 'hover:bg-white/[0.02]'}`}>
                                    <td className="py-4 px-4 text-center">
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
                                          className="w-5 h-5 cursor-pointer accent-emerald-500 rounded"
                                       />
                                    </td>
                                    <td className={`py-4 px-6 font-black text-sm ${isExcluded ? 'line-through text-slate-600' : 'text-white'}`}>
                                      {showTeacher ? r.teacher : ''}
                                    </td>
                                    <td className="py-4 px-6 font-bold text-slate-300 text-sm truncate max-w-[200px]" title={r.lesson}>{r.lesson}</td>
                                    <td className="py-4 px-6 font-bold text-slate-400 text-sm text-center">{r.subject}</td>
                                    <td className="py-4 px-4 font-black text-white text-base text-center">{r.total}</td>
                                    <td className="py-4 px-4 font-black text-rose-400 text-base text-center">{r.absent}</td>
                                    <td className="py-4 px-4 font-black text-emerald-400 text-base text-center">{r.present}</td>
                                    <td className="py-4 px-4 font-black text-slate-300 text-sm text-center bg-white/5 border-x border-white/5">{r.period}</td>
                                    <td className="py-4 px-6 font-black text-slate-300 text-sm text-center" dir="ltr">{r.className}</td>
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
        </motion.div>
      </div>
    );
  }

  // ==========================================================
  // 🚀 واجهة الطالب 
  // ==========================================================
  if (currentRole === 'student') {
    return (
      <div className="min-h-screen relative bg-[#090b14] text-slate-200 pb-32 overflow-x-hidden font-cairo" dir="rtl">
        <div className="fixed top-1/4 right-[-10%] w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-[140px] pointer-events-none z-0" />
        <div className="fixed bottom-0 left-[-10%] w-[600px] h-[600px] bg-emerald-500/15 rounded-full blur-[140px] pointer-events-none z-0" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 sm:space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-8">
          <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 p-6 sm:p-12 text-white shadow-[0_0_40px_rgba(79,70,229,0.3)]">
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-right">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-3 backdrop-blur-sm">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-300" /> السجل الأكاديمي الشامل
                </div>
                <h1 className="text-3xl sm:text-5xl font-black mb-2 tracking-tight drop-shadow-md">سجل الحضور والغياب</h1>
                <p className="text-indigo-100 text-xs sm:text-lg font-bold opacity-90 max-w-xl mx-auto sm:mx-0">متابعة دقيقة لغيابك موزعة حسب المواد والحصص.</p>
              </div>
              <div className="h-20 w-20 sm:h-32 sm:w-32 bg-white/10 backdrop-blur-md rounded-full border-4 border-white/20 flex items-center justify-center shadow-xl shrink-0"><PieChart className="h-8 w-8 sm:h-14 sm:w-14 text-white drop-shadow-md" /></div>
            </div>
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
          </div>
          <div className="bg-[#131836]/60 backdrop-blur-2xl p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.1)] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              <div className="p-3 sm:p-4 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-2xl shadow-inner shrink-0"><Calculator className="w-6 h-6 sm:w-8 sm:h-8" /></div>
              <div><h3 className="text-lg sm:text-2xl font-black text-white leading-tight mb-1">المعادلة الرسمية لمعايرة الغياب</h3><p className="text-[10px] sm:text-sm font-bold text-rose-300">كل <strong>(5) حصص غياب متفرقة</strong> تُسجل كـ <strong>(1) يوم غياب كامل</strong>.</p></div>
            </div>
            <div className="bg-[#090b14]/80 p-4 sm:p-5 rounded-[1.5rem] border border-white/10 flex items-center gap-6 shrink-0 w-full md:w-auto justify-center shadow-inner">
              <div className="text-center"><p className="text-3xl sm:text-4xl font-black text-rose-400">{studentStats.absent}</p><p className="text-[9px] font-bold text-slate-500 uppercase mt-1">حصص غياب</p></div><div className="text-slate-600 font-black text-2xl">÷ 5 =</div><div className="text-center"><p className="text-3xl sm:text-4xl font-black text-white">{studentStats.fullDaysAbsent}</p><p className="text-[9px] font-bold text-rose-500 uppercase mt-1">أيام فعلية</p></div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ==========================================================
  // 🚀 واجهة المعلم (رصد الغياب والتحكم)
  // ==========================================================
  
  // 🚀 حل مشكلة الإحصائيات: يتم حسابها فقط من للطلاب المتواجدين حالياً في المصفوفة
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
    <div className="min-h-screen relative bg-[#090b14] text-slate-200 pb-32 overflow-x-hidden font-cairo" dir="rtl">
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

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6 bg-[#131836]/60 backdrop-blur-2xl p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-white/10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] sm:text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">
              <LayoutGrid className="w-3.5 h-3.5" /> تسجيل الغياب اليومي للمعلم
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mb-2 drop-shadow-md">لوحة رصد الحضور</h1>
            <p className="text-xs sm:text-sm text-slate-400 font-bold">يتم حفظ لقطة إحصائية متكاملة للإدارة عند اعتماد السجل من قبلك.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0">
            <Link href="/attendance/reports" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-5 py-4 text-xs sm:text-sm font-black text-white hover:bg-white/10 transition-all shrink-0">
              <BarChart2 className="h-5 w-5 text-indigo-400" /> تقارير طلابي
            </Link>
            <button onClick={handleSave} disabled={saving || students.length === 0 || !lessonTitle} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-4 text-xs sm:text-sm font-black text-slate-900 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 shrink-0">
              {saving ? <div className="h-5 w-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div> : <Save className="h-5 w-5" />}
              {saving ? 'جاري الحفظ...' : 'اعتماد السجل'}
            </button>
          </div>
        </div>

        {/* 🚀 أدوات البحث والفلترة (تم إصلاح التشوه بإضافة | للـ split) */}
        <div className="bg-[#131836]/60 backdrop-blur-2xl p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-white/10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="space-y-2 flex flex-col w-full">
               <label className="text-[10px] sm:text-xs font-bold text-slate-400 pl-2">التاريخ</label>
               <div className="relative w-full">
                  <Calendar className="absolute inset-y-0 right-4 h-full w-5 text-slate-500 pointer-events-none" />
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-2xl border-0 py-3.5 pr-12 pl-4 text-white bg-[#090b14]/80 ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-emerald-400 text-sm font-bold outline-none" style={{ colorScheme: 'dark' }} />
               </div>
            </div>
            <div className="space-y-2 flex flex-col w-full">
               <label className="text-[10px] sm:text-xs font-bold text-slate-400 pl-2">الحصة</label>
               <div className="relative w-full">
                  <Clock className="absolute inset-y-0 right-4 h-full w-5 text-slate-500 pointer-events-none" />
                  <select value={period} onChange={(e) => setPeriod(parseInt(e.target.value))} className="w-full rounded-2xl border-0 py-3.5 pr-12 pl-4 text-white bg-[#090b14]/80 ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-emerald-400 text-sm font-bold outline-none appearance-none [&>option]:bg-[#131836]">
                     {daySchedule.length > 0 ? daySchedule.map(s => <option key={s.period} value={s.period}>الحصة {s.period}</option>) : <option value={1}>لا توجد حصص</option>}
                  </select>
               </div>
            </div>
            <div className="space-y-2 flex flex-col w-full">
               <label className="text-[10px] sm:text-xs font-bold text-slate-400 pl-2">الفصل والمادة</label>
               <div className="relative w-full">
                  <BookOpen className="absolute inset-y-0 right-4 h-full w-5 text-slate-500 pointer-events-none" />
                  <select value={`${selectedSection}|${selectedSubject}`} onChange={(e) => { const parts = e.target.value.split('|'); setSelectedSection(parts[0]); setSelectedSubject(parts[1] || ''); }} className="w-full rounded-2xl border-0 py-3.5 pr-12 pl-4 text-white bg-[#090b14]/80 ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-emerald-400 text-sm font-bold outline-none appearance-none [&>option]:bg-[#131836] truncate">
                     {sections.length > 0 ? sections.map((s, idx) => <option key={`${s.id}|${s.subject_id || idx}`} value={`${s.id}|${s.subject_id || ''}`}>{(s as any).classes?.[0]?.name || (s as any).classes?.name} - {s.name}</option>) : <option>لا توجد فصول</option>}
                  </select>
               </div>
            </div>
            <div className="space-y-2 flex flex-col w-full">
               <label className="text-[10px] sm:text-xs font-black text-emerald-400 flex gap-1 pl-2">عنوان الدرس <span className="text-rose-500">*</span></label>
               <div className="relative w-full">
                  <BookType className="absolute inset-y-0 right-4 h-full w-5 text-slate-500 pointer-events-none" />
                  <input type="text" required placeholder="مثال: قوانين نيوتن..." value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} className="w-full rounded-2xl border-0 py-3.5 pr-12 pl-4 text-white bg-[#090b14]/80 ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-emerald-400 text-sm font-bold outline-none placeholder:text-slate-600 transition-all" />
               </div>
            </div>
          </div>
          {selectedSection && selectedSubject && (
            <div className="mt-6 pt-5 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
               <div className="flex items-center gap-2 text-emerald-400/80 text-xs sm:text-sm font-bold w-full sm:w-auto">
                  <Info className="w-5 h-5 shrink-0" /> <span className="leading-tight">يرجى التأكد من كتابة عنوان الدرس لاعتماده في الإدارة.</span>
               </div>
               {user?.id && <div className="w-full sm:w-auto"><TeacherCheckInButton teacherId={user.id} periodNumber={period} selectedDate={date} className="w-full sm:w-auto" /></div>}
            </div>
          )}
        </div>

        {/* 🚀 إحصائيات المعلم العلوية الزجاجية */}
        {students.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="bg-[#131836]/60 backdrop-blur-md p-4 sm:p-5 rounded-[1.5rem] border border-white/5 flex flex-col justify-center items-center text-center shadow-lg">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-400 mb-2" /><p className="text-xl sm:text-2xl font-black text-white">{students.length}</p><p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase mt-1">الطلاب</p>
            </div>
            <div className="bg-[#131836]/60 backdrop-blur-md p-4 sm:p-5 rounded-[1.5rem] border border-white/5 flex flex-col justify-center items-center text-center shadow-lg">
              <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400 mb-2" /><p className="text-xl sm:text-2xl font-black text-white">{presentCount}</p><p className="text-[9px] sm:text-[10px] font-bold text-emerald-500/70 uppercase mt-1">حاضر</p>
            </div>
            <div className="bg-[#131836]/60 backdrop-blur-md p-4 sm:p-5 rounded-[1.5rem] border border-white/5 flex flex-col justify-center items-center text-center shadow-lg">
              <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-rose-400 mb-2" /><p className="text-xl sm:text-2xl font-black text-white">{absentCount}</p><p className="text-[9px] sm:text-[10px] font-bold text-rose-500/70 uppercase mt-1">غائب</p>
            </div>
            <div className="bg-[#131836]/60 backdrop-blur-md p-4 sm:p-5 rounded-[1.5rem] border border-white/5 flex flex-col justify-center items-center text-center shadow-lg">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400 mb-2" /><p className="text-xl sm:text-2xl font-black text-white">{lateCount}</p><p className="text-[9px] sm:text-[10px] font-bold text-amber-500/70 uppercase mt-1">متأخر</p>
            </div>
            <div className="bg-[#131836]/60 backdrop-blur-md p-4 sm:p-5 rounded-[1.5rem] border border-white/5 flex flex-col justify-center items-center text-center shadow-lg">
              <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400 mb-2" /><p className="text-xl sm:text-2xl font-black text-white">{excusedCount}</p><p className="text-[9px] sm:text-[10px] font-bold text-blue-500/70 uppercase mt-1">مستأذن</p>
            </div>
            <div className={`p-4 sm:p-5 rounded-[1.5rem] border flex flex-col justify-center items-center text-center shadow-lg ${unmarkedCount > 0 ? 'bg-[#131836]/60 border-white/5' : 'bg-emerald-500/20 border-emerald-500/30'}`}>
              {unmarkedCount > 0 ? <UserMinus className="h-5 w-5 sm:h-6 sm:w-6 text-slate-500 mb-2" /> : <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400 mb-2" />}
              <p className={`text-xl sm:text-2xl font-black ${unmarkedCount > 0 ? 'text-white' : 'text-emerald-400'}`}>{unmarkedCount}</p>
              <p className={`text-[9px] sm:text-[10px] font-bold uppercase mt-1 ${unmarkedCount > 0 ? 'text-slate-500' : 'text-emerald-500/70'}`}>{unmarkedCount > 0 ? 'متبقي' : 'اكتمل'}</p>
            </div>
          </div>
        )}

        {/* 🚀 جدول أسماء الطلاب (Responsive Table) */}
        {students.length > 0 && (
          <div className="bg-[#131836]/60 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
            <div className="p-6 sm:p-8 border-b border-white/5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6 bg-[#090b14]/30">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0"><Users className="h-5 w-5 sm:h-6 sm:w-6" /></div>
                <h3 className="text-lg sm:text-xl font-black text-white">قائمة الطلاب</h3>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 bg-[#090b14]/50 p-1.5 rounded-2xl border border-white/5 w-full lg:w-auto">
                 <button onClick={() => markAllAs('present')} className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs sm:text-sm text-emerald-400 hover:bg-emerald-500/20 rounded-xl font-black flex items-center justify-center gap-2 transition-all active:scale-95"><CheckCircle2 className="w-4 h-4" /> الكل حاضر</button>
                 <button onClick={() => markAllAs('absent')} className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs sm:text-sm text-rose-400 hover:bg-rose-500/20 rounded-xl font-black flex items-center justify-center gap-2 transition-all active:scale-95"><XCircle className="w-4 h-4" /> الكل غائب</button>
              </div>
            </div>
            
            <div className="overflow-x-auto pb-6 custom-scrollbar">
              <table className="w-full text-right border-collapse min-w-[800px] sm:min-w-full">
                <tbody className="divide-y divide-white/5">
                  {students.map((student: any) => (
                    <tr key={student.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 pr-6 sm:pr-8 pl-4">
                         <div className="flex items-center gap-3 sm:gap-4">
                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-[#090b14] border border-white/5 text-indigo-400 flex items-center justify-center font-black text-base sm:text-lg shrink-0">{student.users?.full_name?.charAt(0)}</div>
                            <span className="font-black text-white text-xs sm:text-sm truncate max-w-[150px] sm:max-w-xs">{student.users?.full_name}</span>
                         </div>
                      </td>
                      {ATTENDANCE_OPTIONS.map((opt) => (
                        <td key={opt.status} className="px-1 sm:px-2 py-4 text-center">
                           <label className="cursor-pointer inline-block w-full">
                              <input type="radio" checked={attendance[student.id] === opt.status} onChange={() => handleStatusChange(student.id, opt.status as any)} className="sr-only" />
                              <div className={`px-2 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border flex items-center justify-center gap-1.5 sm:gap-2 font-black text-[10px] sm:text-xs transition-all active:scale-95 ${attendance[student.id] === opt.status ? opt.activeClasses : opt.inactiveClasses}`}>
                                 <opt.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> 
                                 <span className="hidden sm:inline">{opt.label}</span>
                                 <span className="sm:hidden">{opt.mobileLabel}</span>
                              </div>
                           </label>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        <style dangerouslySetInnerHTML={{ __html: `
          .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: #090b14; border-radius: 12px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 12px; border: 2px solid #090b14; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
        `}} />
      </motion.div>
    </div>
  );
}
