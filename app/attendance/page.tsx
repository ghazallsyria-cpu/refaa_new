'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Save, CheckCircle2, XCircle, Clock, AlertCircle, Users, LayoutGrid, Info, ShieldCheck, BookOpen, UserMinus, BarChart2, ArrowLeft, Bug, RefreshCw, Calculator, Layers, PieChart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabase'; 
import { useAttendanceSystem, AttendanceStatus } from '@/hooks/useAttendanceSystem';
import { useAuth } from '@/context/auth-context';

export default function AttendancePage() {
  const { user, authRole } = useAuth(); 
  const { 
    sections, 
    daySchedule, 
    loading: systemLoading, 
    fetchDaySchedule, 
    fetchSections, 
    fetchStudentsAndAttendance, 
    saveAttendance
  } = useAttendanceSystem();

  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [period, setPeriod] = useState<number>(1);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [stats, setStats] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // 🚀 حالات الطالب
  const [studentStats, setStudentStats] = useState<any>({ present: 0, absent: 0, late: 0, excused: 0, fullDaysAbsent: 0 });
  const [subjectStats, setSubjectStats] = useState<any[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<any[]>([]);
  const [isStudentLoading, setIsStudentLoading] = useState(false);
  const [studentDbError, setStudentDbError] = useState<string | null>(null);

  useEffect(() => {
    setDate(new Date().toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (date && authRole === 'teacher') {
      fetchDaySchedule(date).then((schedule) => {
        if (schedule && schedule.length > 0) {
          const isCurrentPeriodScheduled = schedule.some(s => s.period === period);
          if (!isCurrentPeriodScheduled) {
            setPeriod(schedule[0].period);
          }
        }
      });
    }
  }, [date, authRole, fetchDaySchedule, period]);

  useEffect(() => {
    if (date && period && authRole !== 'student') {
      fetchSections(date, period).then(sectionsData => {
        if (sectionsData && sectionsData.length > 0) {
          setSelectedSection(sectionsData[0].id);
          if (sectionsData[0].subject_id) {
            setSelectedSubject(sectionsData[0].subject_id);
          }
        } else {
          setSelectedSection('');
          setSelectedSubject('');
          setStudents([]);
        }
      });
    }
  }, [date, period, fetchSections, authRole]);

  const loadStudentsAndAttendance = useCallback(async () => {
    if (selectedSection && date && authRole !== 'student') {
      const res = await fetchStudentsAndAttendance(selectedSection, selectedSubject, date, period);
      if (res) {
        setStudents(res.students);
        setAttendance(res.attendance);
        setStats(res.stats);
      }
    }
  }, [selectedSection, selectedSubject, date, period, fetchStudentsAndAttendance, authRole]);

  useEffect(() => {
    loadStudentsAndAttendance();
  }, [loadStudentsAndAttendance]);

  // 🚀 المحرك المستقل والمحمي لجلب إحصائيات الطالب الشاملة
  const fetchStudentDataDirectly = useCallback(async () => {
    if (authRole !== 'student' || !user) return;
    setIsStudentLoading(true);
    setStudentDbError(null);
    try {
      const { data: studentData, error: stuErr } = await supabase
        .from('students')
        .select('id, sections(name, classes(name))')
        .eq('user_id', user.id)
        .maybeSingle();

      if (stuErr) throw new Error("خطأ في جلب بيانات الطالب: " + stuErr.message);
      if (!studentData) throw new Error("تعذر إيجاد ملف الطالب المرتبط بهذا الحساب.");

      const sec: any = studentData.sections;
      const secName = Array.isArray(sec) ? sec[0]?.name : sec?.name || '';
      const classData: any = Array.isArray(sec) ? sec[0]?.classes : sec?.classes;
      const className = Array.isArray(classData) ? classData[0]?.name : classData?.name || '';
      const fullClassName = className ? `${className} - ${secName}` : 'حصة مسجلة';

      const { data: records, error: recErr } = await supabase
        .from('attendance_records')
        .select(`
          id, created_at, status, period,
          subjects (name)
        `)
        .eq('student_id', studentData.id)
        .order('created_at', { ascending: false });

      if (recErr) throw new Error("خطأ في قاعدة بيانات السجلات: " + recErr.message);

      if (records) {
        const calculatedStats = { present: 0, absent: 0, late: 0, excused: 0, fullDaysAbsent: 0 };
        const subjectsMap = new Map<string, any>();

        records.forEach((r: any) => {
           if (r.status === 'present') calculatedStats.present++;
           else if (r.status === 'absent') calculatedStats.absent++;
           else if (r.status === 'late') calculatedStats.late++;
           else if (r.status === 'excused') calculatedStats.excused++;

           // التعامل الآمن مع المادة لتفادي أخطاء TypeScript
           const subjData: any = r.subjects;
           const subjName = (Array.isArray(subjData) ? subjData[0]?.name : subjData?.name) || 'نشاط / مادة غير محددة';

           if (!subjectsMap.has(subjName)) {
             subjectsMap.set(subjName, { name: subjName, present: 0, absent: 0, late: 0, excused: 0 });
           }
           
           const sStats = subjectsMap.get(subjName);
           if (r.status === 'present') sStats.present++;
           else if (r.status === 'absent') sStats.absent++;
           else if (r.status === 'late') sStats.late++;
           else if (r.status === 'excused') sStats.excused++;
        });

        calculatedStats.fullDaysAbsent = Math.floor(calculatedStats.absent / 5);

        setStudentStats(calculatedStats);
        setSubjectStats(Array.from(subjectsMap.values()).sort((a, b) => b.absent - a.absent));
        
        // 🚀 معالجة آمنة للسجلات لتفادي خطأ 'never' في الـ type
        const enrichedRecords = records.map((r: any) => {
            const subj: any = r.subjects;
            let sName = 'مادة غير محددة';
            if (subj) {
                sName = Array.isArray(subj) ? subj[0]?.name : subj.name;
            }
            return {
                ...r,
                displayClassName: fullClassName,
                subjectName: sName
            };
        });
        setStudentAttendance(enrichedRecords);
      }
    } catch (error: any) {
      console.error("Error fetching student attendance:", error);
      setStudentDbError(error.message);
    } finally {
      setIsStudentLoading(false);
    }
  }, [authRole, user]);

  useEffect(() => {
    fetchStudentDataDirectly();
  }, [fetchStudentDataDirectly]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    if (!selectedSubject) {
      setMessage({ text: 'يرجى اختيار المادة/الفصل أولاً', type: 'error' });
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
      return;
    }

    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      await saveAttendance(selectedSection, selectedSubject, date, period, attendance, students);
      setMessage({ text: 'تم حفظ سجل الحضور والغياب بنجاح!', type: 'success' });
      loadStudentsAndAttendance(); 
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      setMessage({ text: `حدث خطأ أثناء الحفظ: ${error.message || 'خطأ غير معروف'}`, type: 'error' });
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    } finally {
      setSaving(false);
    }
  };

  const markAllAs = (status: AttendanceStatus) => {
    const newAttendance = { ...attendance };
    students.forEach(s => {
      newAttendance[s.id] = status;
    });
    setAttendance(newAttendance);
  };

  const totalStudents = students.length;
  const presentCount = Object.values(attendance).filter(v => v === 'present').length;
  const absentCount = Object.values(attendance).filter(v => v === 'absent').length;
  const lateCount = Object.values(attendance).filter(v => v === 'late').length;
  const excusedCount = Object.values(attendance).filter(v => v === 'excused').length;
  const markedCount = presentCount + absentCount + lateCount + excusedCount;
  const unmarkedCount = totalStudents - markedCount;
  const attendanceRate = totalStudents > 0 ? Math.round(((presentCount + lateCount) / totalStudents) * 100) : 0;

  // ==========================================
  // 🚀 STUDENT VIEW
  // ==========================================
  if (authRole === 'student') {
    if (studentDbError) {
      return (
        <div className="flex h-[80vh] items-center justify-center p-6" dir="rtl">
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-rose-100 text-center max-w-lg w-full">
            <div className="h-20 w-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
               <Bug className="h-10 w-10 text-rose-500 animate-bounce" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-3">عذراً، حدث خطأ في قاعدة البيانات</h2>
            <div className="bg-rose-50 p-4 rounded-xl text-right mb-6 overflow-auto max-h-32 border border-rose-100">
               <p className="text-rose-600 font-mono text-xs" dir="ltr">{studentDbError}</p>
            </div>
            <button onClick={fetchStudentDataDirectly} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-slate-800 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
               <RefreshCw className="w-5 h-5" /> إعادة المحاولة
            </button>
          </div>
        </div>
      );
    }

    if (isStudentLoading) {
      return (
        <div className="flex h-[80vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            <p className="text-slate-500 font-bold animate-pulse tracking-widest text-lg">جاري تجميع إحصائياتك الشاملة...</p>
          </div>
        </div>
      );
    }

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-24 px-4 sm:px-6 lg:px-8" dir="rtl">
        
        {/* 🚀 Hero Banner */}
        <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 p-6 sm:p-12 text-white shadow-2xl shadow-indigo-200/50">
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-right">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-3 backdrop-blur-sm shadow-sm mx-auto sm:mx-0">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                <span>السجل الأكاديمي الشامل</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black mb-2 tracking-tight drop-shadow-md">سجل الحضور والغياب</h1>
              <p className="text-indigo-100 text-xs sm:text-lg font-bold opacity-90 max-w-xl mx-auto sm:mx-0">
                متابعة دقيقة لغيابك موزعة حسب المواد والحصص، مع نظام الحساب التلقائي لأيام الغياب الفعلية.
              </p>
            </div>
            <div className="h-20 w-20 sm:h-32 sm:w-32 bg-white/10 backdrop-blur-md rounded-full border-4 border-white/20 flex items-center justify-center shadow-xl shrink-0">
              <PieChart className="h-8 w-8 sm:h-14 sm:w-14 text-white drop-shadow-md" />
            </div>
          </div>
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
        </div>

        {/* 🚀 معادلة احتساب الغياب الفعلي */}
        <div className="bg-gradient-to-br from-rose-50 to-red-50 p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border-2 border-rose-200 shadow-lg shadow-rose-100/50 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="p-3 sm:p-4 bg-rose-500 text-white rounded-2xl shadow-md shadow-rose-500/30 shrink-0">
              <Calculator className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <h3 className="text-lg sm:text-2xl font-black text-rose-900 leading-tight mb-1">المعادلة الرسمية لمعايرة الغياب</h3>
              <p className="text-[10px] sm:text-sm font-bold text-rose-600">
                حسب اللائحة: <strong>كل (5) حصص غياب منفصلة</strong> تُسجل في الإدارة كـ <strong>(1) يوم غياب كامل</strong>.
              </p>
            </div>
          </div>
          
          <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] shadow-sm border border-rose-100 flex items-center gap-6 shrink-0 w-full md:w-auto justify-center">
            <div className="text-center">
              <p className="text-3xl sm:text-4xl font-black text-rose-600">{studentStats.absent}</p>
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">إجمالي الحصص</p>
            </div>
            <div className="text-rose-300 font-black text-2xl">÷ 5 =</div>
            <div className="text-center">
              <p className="text-3xl sm:text-4xl font-black text-rose-900">{studentStats.fullDaysAbsent}</p>
              <p className="text-[9px] sm:text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-1">أيام فعلية محسوبة</p>
            </div>
          </div>
        </div>

        {/* 🚀 إحصائيات الحصص الكلية */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <div className="bg-white/90 backdrop-blur-xl p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-emerald-100 flex flex-col items-center justify-center text-center gap-2 sm:gap-3 shadow-sm hover:shadow-lg transition-all group">
            <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="h-5 w-5 sm:h-7 sm:w-7" />
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-emerald-600">{studentStats.present}</p>
              <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mt-1">حصة حضور</p>
            </div>
          </div>
          <div className="bg-white/90 backdrop-blur-xl p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-rose-100 flex flex-col items-center justify-center text-center gap-2 sm:gap-3 shadow-sm hover:shadow-lg transition-all group">
            <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
              <XCircle className="h-5 w-5 sm:h-7 sm:w-7" />
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-rose-600">{studentStats.absent}</p>
              <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mt-1">حصة غياب</p>
            </div>
          </div>
          <div className="bg-white/90 backdrop-blur-xl p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-amber-100 flex flex-col items-center justify-center text-center gap-2 sm:gap-3 shadow-sm hover:shadow-lg transition-all group">
            <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
              <Clock className="h-5 w-5 sm:h-7 sm:w-7" />
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-amber-600">{studentStats.late}</p>
              <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mt-1">حصة تأخير</p>
            </div>
          </div>
          <div className="bg-white/90 backdrop-blur-xl p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-blue-100 flex flex-col items-center justify-center text-center gap-2 sm:gap-3 shadow-sm hover:shadow-lg transition-all group">
            <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <AlertCircle className="h-5 w-5 sm:h-7 sm:w-7" />
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-blue-600">{studentStats.excused}</p>
              <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mt-1">عذر مقبول</p>
            </div>
          </div>
        </div>

        {/* 🚀 التحليل المادي للغياب */}
        {subjectStats.length > 0 && (
          <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 sm:p-8 border-b border-slate-100/50 flex items-center justify-between bg-slate-50/30">
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 sm:gap-3">
                 <div className="p-2 sm:p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Layers className="w-5 h-5 sm:w-6 sm:h-6"/></div>
                 التحليل والتوزيع حسب المادة
              </h2>
            </div>
            <div className="p-4 sm:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjectStats.map((sub, idx) => (
                  <div key={idx} className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-md hover:border-indigo-100 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-colors shadow-sm">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-sm sm:text-base">{sub.name}</h4>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">حضر: {sub.present}</span>
                          {sub.late > 0 && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">تأخر: {sub.late}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center bg-white p-2 rounded-xl border border-slate-200 min-w-[60px] shadow-sm">
                      <span className={`text-xl font-black ${sub.absent > 0 ? 'text-rose-600' : 'text-slate-300'}`}>{sub.absent}</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">غياب</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 🚀 السجل التاريخي التفصيلي */}
        <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 sm:p-8 border-b border-slate-100/50 flex items-center justify-between bg-slate-50/30">
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 sm:gap-3">
               <div className="p-2 sm:p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><LayoutGrid className="w-5 h-5 sm:w-6 sm:h-6"/></div>
               السجل الزمني التفصيلي للحصص
            </h2>
            <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
              إجمالي السجلات: {studentAttendance.length}
            </span>
          </div>
          <div className="p-4 sm:p-8">
            {studentAttendance.length === 0 ? (
              <div className="text-center py-12 sm:py-16 bg-slate-50 rounded-[1.5rem] sm:rounded-[2rem] border border-dashed border-slate-200">
                <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-slate-300 mx-auto mb-3 sm:mb-4" />
                <p className="text-slate-500 font-bold text-sm sm:text-lg">لا يوجد سجل حضور متاح لك حتى الآن.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {studentAttendance.map((record, idx) => {
                  return (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-2xl border border-slate-100 bg-white shadow-sm hover:border-indigo-100 transition-colors gap-4 group">
                    <div>
                      <span className="text-sm font-black text-slate-800 block mb-2" dir="ltr">
                        {new Date(record.created_at || new Date()).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] sm:text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> الحصة {record.period}
                        </span>
                        <span className="text-[10px] sm:text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 inline-flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> {record.subjectName || 'مادة غير محددة'}
                        </span>
                      </div>
                    </div>
                    <span className={`px-4 py-2 sm:py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 w-full sm:w-auto border ${
                      record.status === 'present' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      record.status === 'absent' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                      record.status === 'late' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      'bg-blue-50 text-blue-600 border-blue-100'
                    }`}>
                      {record.status === 'present' ? <CheckCircle2 className="w-4 h-4"/> :
                       record.status === 'absent' ? <XCircle className="w-4 h-4"/> :
                       record.status === 'late' ? <Clock className="w-4 h-4"/> :
                       <AlertCircle className="w-4 h-4"/>}
                      {record.status === 'present' ? 'حاضر' :
                       record.status === 'absent' ? 'غائب' :
                       record.status === 'late' ? 'متأخر' : 'مستأذن'}
                    </span>
                  </div>
                )})}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // ==========================================
  // 🚀 TEACHER / ADMIN VIEW 
  // ==========================================
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-24 px-4 sm:px-6 lg:px-8 overflow-x-hidden" dir="rtl">
      
      <AnimatePresence>
        {message.text && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 sm:px-6 py-3 rounded-2xl shadow-xl font-bold text-white flex items-center gap-3 border w-[90%] sm:w-auto text-sm sm:text-base ${
            message.type === 'success' ? 'bg-emerald-500 border-emerald-400' : 'bg-rose-500 border-rose-400'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6 bg-white p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] sm:text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>تسجيل الغياب - حصة بحصة</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight mb-2">لوحة رصد الحضور</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-bold">يتم تسجيل غياب الطلاب بشكل منفصل لكل حصة دراسية لضمان الدقة.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0">
          <Link 
            href="/attendance/reports"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl sm:rounded-[1.5rem] bg-amber-50 border border-amber-200 px-5 sm:px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-amber-700 shadow-sm hover:bg-amber-100 transition-all active:scale-95 shrink-0"
          >
            <BarChart2 className="h-4 w-4 sm:h-5 sm:w-5" />
            تقارير الإحصائيات
          </Link>
          
          <button 
            onClick={handleSave}
            disabled={saving || students.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl sm:rounded-[1.5rem] bg-indigo-600 px-6 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {saving ? (
              <div className="h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
            {saving ? 'جاري الحفظ...' : 'اعتماد السجل'}
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 relative z-10">
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">التاريخ</label>
            <div className="relative group">
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 pointer-events-none">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="block w-full rounded-xl sm:rounded-2xl border-0 py-3 sm:py-3.5 pr-10 sm:pr-12 pl-4 text-white bg-white/10 ring-1 ring-inset ring-white/20 focus:ring-2 focus:ring-indigo-400 text-xs sm:text-sm transition-all font-bold backdrop-blur-md outline-none color-scheme-dark"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>
          
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">الحصة الدراسية</label>
            <div className="relative group">
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 pointer-events-none">
                <Clock className="h-4 w-4 sm:h-5 w-5" />
              </div>
              <select
                value={period}
                onChange={(e) => setPeriod(parseInt(e.target.value))}
                className="block w-full rounded-xl sm:rounded-2xl border-0 py-3 sm:py-3.5 pr-10 sm:pr-12 pl-4 text-white bg-white/10 ring-1 ring-inset ring-white/20 focus:ring-2 focus:ring-indigo-400 text-xs sm:text-sm transition-all font-bold backdrop-blur-md outline-none appearance-none cursor-pointer"
              >
                {authRole === 'teacher' ? (
                  daySchedule.length > 0 ? (
                    daySchedule.map(s => (
                      <option key={s.period} value={s.period} className="text-slate-900 font-bold">
                        الحصة {s.period}
                      </option>
                    ))
                  ) : (
                    <option value={1} className="text-slate-900">لا توجد حصص مجدولة</option>
                  )
                ) : (
                  [1, 2, 3, 4, 5, 6, 7].map(p => (
                    <option key={p} value={p} className="text-slate-900 font-bold">الحصة {p}</option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2 sm:col-span-2 lg:col-span-1">
            <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">الفصل والمادة</label>
            <div className="relative group">
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 pointer-events-none">
                <BookOpen className="h-4 w-4 sm:h-5 w-5" />
              </div>
              {sections.length > 0 ? (
                <select
                  value={`${selectedSection}${selectedSubject ? `-${selectedSubject}` : ''}`}
                  onChange={(e) => {
                    const parts = e.target.value.split('-');
                    setSelectedSection(parts[0]);
                    setSelectedSubject(parts[1] || '');
                  }}
                  className="block w-full rounded-xl sm:rounded-2xl border-0 py-3 sm:py-3.5 pr-10 sm:pr-12 pl-4 text-white bg-white/10 ring-1 ring-inset ring-white/20 focus:ring-2 focus:ring-indigo-400 text-xs sm:text-sm transition-all font-bold backdrop-blur-md outline-none appearance-none cursor-pointer truncate"
                >
                  {sections.map((s, idx) => (
                    <option key={`${s.id}-${s.subject_id || idx}`} value={`${s.id}${s.subject_id ? `-${s.subject_id}` : ''}`} className="text-slate-900 font-bold">
                      {(s as any).classes?.[0]?.name || (s as any).classes?.name} - {s.name} {s.subject_name ? `(${s.subject_name})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="block w-full rounded-xl sm:rounded-2xl border-0 py-3 sm:py-3.5 pr-10 sm:pr-12 pl-4 text-rose-400 bg-rose-500/10 ring-1 ring-inset ring-rose-500/30 text-xs sm:text-sm font-bold flex items-center">
                  لا توجد فصول لهذه الحصة
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedSection && selectedSubject && (
          <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-white/10 flex items-start sm:items-center gap-2 text-emerald-400 text-xs sm:text-sm font-bold relative z-10">
            <Info className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 sm:mt-0" />
            <span className="leading-tight">أنت الآن تقوم بتسجيل الغياب <strong>للحصة {period}</strong> - إحصائيات هذه الحصة تظهر بالأسفل مباشرة.</span>
          </div>
        )}
      </div>

      {students.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-white p-3 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center group hover:shadow-md transition-all">
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-500 mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-xl sm:text-2xl font-black text-slate-900">{totalStudents}</p>
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">إجمالي الطلاب</p>
          </div>

          <div className="bg-emerald-50 p-3 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-emerald-100 shadow-sm flex flex-col justify-center items-center text-center group hover:shadow-md transition-all">
            <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500 mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-xl sm:text-2xl font-black text-emerald-700">{presentCount}</p>
            <p className="text-[9px] sm:text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mt-1">حاضر</p>
          </div>

          <div className="bg-rose-50 p-3 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-rose-100 shadow-sm flex flex-col justify-center items-center text-center group hover:shadow-md transition-all">
            <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-rose-500 mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-xl sm:text-2xl font-black text-rose-700">{absentCount}</p>
            <p className="text-[9px] sm:text-[10px] font-bold text-rose-600/70 uppercase tracking-widest mt-1">غائب</p>
          </div>

          <div className="bg-amber-50 p-3 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-amber-100 shadow-sm flex flex-col justify-center items-center text-center group hover:shadow-md transition-all">
            <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500 mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-xl sm:text-2xl font-black text-amber-700">{lateCount}</p>
            <p className="text-[9px] sm:text-[10px] font-bold text-amber-600/70 uppercase tracking-widest mt-1">متأخر</p>
          </div>

          <div className="bg-blue-50 p-3 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-blue-100 shadow-sm flex flex-col justify-center items-center text-center group hover:shadow-md transition-all">
            <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-xl sm:text-2xl font-black text-blue-700">{excusedCount}</p>
            <p className="text-[9px] sm:text-[10px] font-bold text-blue-600/70 uppercase tracking-widest mt-1">مستأذن</p>
          </div>

          <div className={`p-3 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border shadow-sm flex flex-col justify-center items-center text-center group hover:shadow-md transition-all ${unmarkedCount > 0 ? 'bg-slate-100 border-slate-200' : 'bg-emerald-500 border-emerald-600 text-white'}`}>
            {unmarkedCount > 0 ? (
              <UserMinus className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform" />
            ) : (
              <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-white mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform" />
            )}
            <p className={`text-xl sm:text-2xl font-black ${unmarkedCount > 0 ? 'text-slate-700' : 'text-white'}`}>{unmarkedCount}</p>
            <p className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-widest mt-1 ${unmarkedCount > 0 ? 'text-slate-500' : 'text-emerald-100'}`}>
              {unmarkedCount > 0 ? 'متبقي للتحضير' : 'اكتمل التحضير!'}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 shrink-0">
              <Users className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 tracking-tight">قائمة الطلاب</h3>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                 <p className="text-[10px] sm:text-xs lg:text-sm text-slate-500 font-bold">تحديد حالة الطالب لهذه الحصة فقط</p>
                 <span className="text-[9px] sm:text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">نسبة الحضور: {attendanceRate}%</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl sm:rounded-[1.5rem] shadow-sm border border-slate-200 w-full lg:w-auto overflow-x-auto scrollbar-hide shrink-0">
            <button 
              onClick={() => markAllAs('present')} 
              className="flex-1 lg:flex-none px-3 sm:px-4 py-2 sm:py-2.5 text-[10px] sm:text-xs lg:text-sm text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg sm:rounded-xl font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap border border-emerald-100 active:scale-95"
            >
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> الكل حاضر
            </button>
            <button 
              onClick={() => markAllAs('absent')} 
              className="flex-1 lg:flex-none px-3 sm:px-4 py-2 sm:py-2.5 text-[10px] sm:text-xs lg:text-sm text-rose-700 hover:bg-rose-50 rounded-lg sm:rounded-xl font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap border border-transparent hover:border-rose-100 active:scale-95"
            >
              <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> الكل غائب
            </button>
          </div>
        </div>
        
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead>
              <tr className="bg-slate-50/30">
                <th scope="col" className="py-4 sm:py-5 pr-6 sm:pr-8 pl-4 text-right text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">اسم الطالب</th>
                <th scope="col" className="px-2 py-4 sm:py-5 text-center text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">حاضر</th>
                <th scope="col" className="px-2 py-4 sm:py-5 text-center text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">غائب</th>
                <th scope="col" className="px-2 py-4 sm:py-5 text-center text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">متأخر</th>
                <th scope="col" className="px-2 py-4 sm:py-5 text-center text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">مستأذن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {systemLoading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                      <p className="text-slate-400 font-bold text-sm sm:text-base">جاري تحميل قائمة الطلاب...</p>
                    </div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-[1.5rem] sm:rounded-3xl bg-slate-50 flex items-center justify-center border border-slate-100">
                        <Users className="h-6 w-6 sm:h-8 sm:w-8 text-slate-300" />
                      </div>
                      <p className="text-slate-400 font-bold text-sm sm:text-lg">الرجاء اختيار الحصة والفصل لعرض الطلاب</p>
                    </div>
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="group hover:bg-slate-50/50 transition-all duration-300">
                    <td className="whitespace-nowrap py-3 sm:py-4 pr-6 sm:pr-8 pl-4">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-base sm:text-lg shadow-sm group-hover:scale-110 transition-transform duration-300 shrink-0">
                          {student.users?.full_name?.charAt(0) || '?'}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-black text-slate-900 tracking-tight text-xs sm:text-sm group-hover:text-indigo-600 transition-colors truncate">{student.users?.full_name || 'طالب غير معروف'}</span>
                        </div>
                      </div>
                    </td>
                    
                    {[
                      { status: 'present', color: 'emerald', icon: CheckCircle2, label: 'حاضر' },
                      { status: 'absent', color: 'rose', icon: XCircle, label: 'غائب' },
                      { status: 'late', color: 'amber', icon: Clock, label: 'متأخر' },
                      { status: 'excused', color: 'blue', icon: AlertCircle, label: 'مستأذن' }
                    ].map((opt) => (
                      <td key={opt.status} className="whitespace-nowrap px-1.5 sm:px-2 py-3 sm:py-4 text-center">
                        <label className="relative inline-flex cursor-pointer group/radio w-full justify-center">
                          <input
                            type="radio"
                            name={`status-${student.id}`}
                            checked={attendance[student.id] === opt.status}
                            onChange={() => handleStatusChange(student.id, opt.status as AttendanceStatus)}
                            className="peer sr-only"
                          />
                          <div className={`px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border-2 transition-all flex items-center justify-center gap-1.5 sm:gap-2 font-bold text-[10px] sm:text-xs shadow-sm active:scale-95
                            border-slate-200 bg-white text-slate-400 group-hover/radio:border-${opt.color}-200 group-hover/radio:bg-${opt.color}-50
                            peer-checked:border-${opt.color}-500 peer-checked:bg-${opt.color}-50 peer-checked:text-${opt.color}-700 peer-checked:shadow-${opt.color}-100 peer-checked:shadow-md
                          `}>
                            <opt.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 peer-checked:animate-in peer-checked:zoom-in-50`} />
                            <span className="hidden lg:inline">{opt.label}</span>
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

        <div className="md:hidden divide-y divide-slate-100 bg-slate-50/30">
          {systemLoading ? (
            <div className="py-16 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                <p className="text-slate-400 font-bold text-xs">جاري التحميل...</p>
              </div>
            </div>
          ) : students.length === 0 ? (
            <div className="py-16 text-center px-4">
              <p className="text-slate-400 font-bold text-xs">الرجاء اختيار الحصة والفصل أعلاه لعرض الطلاب وبدء رصد الغياب.</p>
            </div>
          ) : (
            students.map((student) => (
              <div key={student.id} className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-base shrink-0">
                    {student.users?.full_name?.charAt(0)}
                  </div>
                  <div className="font-black text-slate-900 text-sm tracking-tight truncate">{student.users?.full_name}</div>
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { status: 'present', color: 'emerald', icon: CheckCircle2, label: 'حاضر' },
                    { status: 'absent', color: 'rose', icon: XCircle, label: 'غائب' },
                    { status: 'late', color: 'amber', icon: Clock, label: 'تأخر' },
                    { status: 'excused', color: 'blue', icon: AlertCircle, label: 'عذر' }
                  ].map((opt) => (
                    <button
                      key={opt.status}
                      onClick={() => handleStatusChange(student.id, opt.status as AttendanceStatus)}
                      className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl border-2 transition-all active:scale-95 ${
                        attendance[student.id] === opt.status
                          ? `bg-${opt.color}-50 border-${opt.color}-500 text-${opt.color}-700 shadow-md shadow-${opt.color}-100`
                          : `bg-white border-slate-100 text-slate-400 hover:border-${opt.color}-200`
                      }`}
                    >
                      <opt.icon className={`w-4 h-4 ${attendance[student.id] === opt.status ? 'animate-in zoom-in-50' : ''}`} />
                      <span className="font-black text-[9px]">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
