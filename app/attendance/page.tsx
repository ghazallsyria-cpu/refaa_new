'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Save, CheckCircle2, XCircle, Clock, AlertCircle, Users, LayoutGrid, Check, Info, ShieldCheck, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAttendanceSystem, AttendanceStatus } from '@/hooks/useAttendanceSystem';
import { useAuth } from '@/context/auth-context';

export default function AttendancePage() {
  const { authRole } = useAuth();
  const { 
    sections, 
    daySchedule, 
    loading: systemLoading, 
    fetchDaySchedule, 
    fetchSections, 
    fetchStudentsAndAttendance, 
    saveAttendance,
    fetchStudentAttendance
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

  const [studentStats, setStudentStats] = useState<any>(null);
  const [studentAttendance, setStudentAttendance] = useState<any[]>([]);

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
    if (date && period) {
      if (authRole === 'student') {
        fetchStudentAttendance().then(res => {
          if (res) {
            setStudentAttendance(res.studentAttendance);
            setStudentStats(res.studentStats);
          }
        });
      } else {
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
    }
  }, [date, period, fetchSections, fetchStudentAttendance, authRole]);

  const loadStudentsAndAttendance = useCallback(async () => {
    if (selectedSection && date) {
      const res = await fetchStudentsAndAttendance(selectedSection, selectedSubject, date, period);
      if (res) {
        setStudents(res.students);
        setAttendance(res.attendance);
        setStats(res.stats);
      }
    }
  }, [selectedSection, selectedSubject, date, period, fetchStudentsAndAttendance]);

  useEffect(() => {
    loadStudentsAndAttendance();
  }, [loadStudentsAndAttendance]);

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

  // ==========================================
  // 🚀 STUDENT VIEW (لوحة الطالب السحرية)
  // ==========================================
  if (authRole === 'student') {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-7xl mx-auto pb-24 px-4 sm:px-6 lg:px-8" dir="rtl">
        
        <div className="relative overflow-hidden rounded-[2.5rem] sm:rounded-[3rem] bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 p-8 sm:p-12 text-white shadow-2xl shadow-indigo-200/50">
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-right">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-widest mb-3 backdrop-blur-sm shadow-sm mx-auto sm:mx-0">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                <span>السجل الأكاديمي</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black mb-2 tracking-tight drop-shadow-md">سجل الحضور والغياب</h1>
              <p className="text-indigo-100 text-sm sm:text-lg font-bold opacity-90 max-w-xl mx-auto sm:mx-0">
                إحصائيات وسجل حضورك الشخصي مقسمة حسب الأيام. التزامك هو سر تفوقك.
              </p>
            </div>
            <div className="h-24 w-24 sm:h-32 sm:w-32 bg-white/10 backdrop-blur-md rounded-full border-4 border-white/20 flex items-center justify-center shadow-xl shrink-0">
              <Calendar className="h-10 w-10 sm:h-14 sm:w-14 text-white drop-shadow-md" />
            </div>
          </div>
          <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white/90 backdrop-blur-xl p-6 rounded-[2rem] border border-emerald-100 flex flex-col items-center justify-center text-center gap-3 shadow-sm hover:shadow-lg transition-all group">
            <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <p className="text-4xl font-black text-emerald-600">{studentStats?.present || 0}</p>
              <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mt-1">حاضر (يوم كامل)</p>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-xl p-6 rounded-[2rem] border border-rose-100 flex flex-col items-center justify-center text-center gap-3 shadow-sm hover:shadow-lg transition-all group">
            <div className="h-14 w-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
              <XCircle className="h-7 w-7" />
            </div>
            <div>
              <p className="text-4xl font-black text-rose-600">{studentStats?.absent || 0}</p>
              <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mt-1">غائب (يوم كامل)</p>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-xl p-6 rounded-[2rem] border border-amber-100 flex flex-col items-center justify-center text-center gap-3 shadow-sm hover:shadow-lg transition-all group">
            <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
              <Clock className="h-7 w-7" />
            </div>
            <div>
              <p className="text-4xl font-black text-amber-600">{studentStats?.partial || 0}</p>
              <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mt-1">غائب جزئي</p>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-xl p-6 rounded-[2rem] border border-blue-100 flex flex-col items-center justify-center text-center gap-3 shadow-sm hover:shadow-lg transition-all group">
            <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <AlertCircle className="h-7 w-7" />
            </div>
            <div>
              <p className="text-4xl font-black text-blue-600">{studentStats?.incomplete || 0}</p>
              <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mt-1">سجل غير مكتمل</p>
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-slate-100/50 flex items-center justify-between bg-slate-50/30">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
               <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Calendar className="w-6 h-6"/></div>
               سجل الأيام السابقة
            </h2>
          </div>
          <div className="p-6 sm:p-8">
            {studentAttendance.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-bold text-lg">لا يوجد سجل حضور متاح لك حتى الآن.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {studentAttendance.map((record, idx) => (
                  <div key={idx} className="flex items-center justify-between p-5 rounded-2xl border border-slate-100 bg-white shadow-sm hover:border-indigo-100 transition-colors">
                    <span className="text-sm font-bold text-slate-700" dir="ltr">
                      {new Date(record.date).toLocaleDateString('ar-EG', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                    <span className={`px-4 py-1.5 rounded-xl text-xs font-black ${
                      record.daily_status === 'present' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      record.daily_status === 'full_absent' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                      record.daily_status === 'partial_absent' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                      'bg-blue-50 text-blue-600 border border-blue-100'
                    }`}>
                      {record.daily_status === 'present' ? 'حاضر (يوم كامل)' :
                       record.daily_status === 'full_absent' ? 'غائب كلياً' :
                       record.daily_status === 'partial_absent' ? 'غائب جزئياً' : 'غير مكتمل'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // ==========================================
  // 🚀 TEACHER / ADMIN VIEW (اللوحة الاحترافية للمعلم)
  // ==========================================
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-24 px-4 sm:px-6 lg:px-8 overflow-x-hidden" dir="rtl">
      
      {/* التنبيهات العلوية العائمة */}
      <AnimatePresence>
        {message.text && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl font-bold text-white flex items-center gap-3 border ${
            message.type === 'success' ? 'bg-emerald-500 border-emerald-400' : 'bg-rose-500 border-rose-400'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 Header & Save Button */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>تسجيل الغياب - حصة بحصة</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">لوحة رصد الحضور</h1>
          <p className="text-sm sm:text-base text-slate-500 font-bold">يتم تسجيل غياب الطلاب بشكل منفصل لكل حصة دراسية لضمان الدقة.</p>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={saving || students.length === 0}
          className="w-full md:w-auto inline-flex items-center justify-center gap-3 rounded-[1.5rem] bg-indigo-600 px-8 py-4 text-base font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {saving ? (
            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Save className="h-5 w-5" />
          )}
          {saving ? 'جاري الحفظ...' : 'اعتماد وحفظ السجل'}
        </button>
      </div>

      {/* 🚀 Mission Control Panel (لوحة التحكم المركزية الزجاجية) */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 sm:p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">التاريخ</label>
            <div className="relative group">
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 pointer-events-none">
                <Calendar className="h-5 w-5" />
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="block w-full rounded-2xl border-0 py-3.5 pr-12 pl-4 text-white bg-white/10 ring-1 ring-inset ring-white/20 focus:ring-2 focus:ring-indigo-400 sm:text-sm transition-all font-bold backdrop-blur-md outline-none color-scheme-dark"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">الحصة الدراسية</label>
            <div className="relative group">
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 pointer-events-none">
                <Clock className="h-5 w-5" />
              </div>
              <select
                value={period}
                onChange={(e) => setPeriod(parseInt(e.target.value))}
                className="block w-full rounded-2xl border-0 py-3.5 pr-12 pl-4 text-white bg-white/10 ring-1 ring-inset ring-white/20 focus:ring-2 focus:ring-indigo-400 sm:text-sm transition-all font-bold backdrop-blur-md outline-none appearance-none cursor-pointer"
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

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">الفصل والمادة</label>
            <div className="relative group">
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 pointer-events-none">
                <BookOpen className="h-5 w-5" />
              </div>
              {sections.length > 0 ? (
                <select
                  value={`${selectedSection}${selectedSubject ? `-${selectedSubject}` : ''}`}
                  onChange={(e) => {
                    const parts = e.target.value.split('-');
                    setSelectedSection(parts[0]);
                    setSelectedSubject(parts[1] || '');
                  }}
                  className="block w-full rounded-2xl border-0 py-3.5 pr-12 pl-4 text-white bg-white/10 ring-1 ring-inset ring-white/20 focus:ring-2 focus:ring-indigo-400 sm:text-sm transition-all font-bold backdrop-blur-md outline-none appearance-none cursor-pointer truncate"
                >
                  {sections.map((s, idx) => (
                    <option key={`${s.id}-${s.subject_id || idx}`} value={`${s.id}${s.subject_id ? `-${s.subject_id}` : ''}`} className="text-slate-900 font-bold">
                      {s.classes?.[0]?.name || s.classes?.name} - {s.name} {s.subject_name ? `(${s.subject_name})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="block w-full rounded-2xl border-0 py-3.5 pr-12 pl-4 text-rose-400 bg-rose-500/10 ring-1 ring-inset ring-rose-500/30 sm:text-sm font-bold flex items-center">
                  لا توجد فصول لهذه الحصة
                </div>
              )}
            </div>
          </div>
        </div>

        {/* مؤشر ذكي للتأكيد */}
        {selectedSection && selectedSubject && (
          <div className="mt-6 pt-5 border-t border-white/10 flex items-center gap-2 text-emerald-400 text-sm font-bold relative z-10">
            <Info className="w-5 h-5 shrink-0" />
            <span>أنت الآن تقوم بتسجيل الغياب <strong>للحصة {period}</strong> - احرص على حفظ البيانات قبل تغيير الحصة.</span>
          </div>
        )}
      </div>

      {/* 🚀 Quick Stats (Teacher View) */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">إجمالي الطلاب في الفصل</p>
                <p className="text-2xl font-black text-slate-900">{stats.daily.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">نسبة الحضور لهذه الحصة</p>
                <p className="text-2xl font-black text-emerald-600">{stats.daily.rate}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 Main Student List Area */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">قائمة الطلاب</h3>
              <p className="text-sm text-slate-500 font-bold mt-1">تحديد حالة الطالب لهذه الحصة فقط</p>
            </div>
          </div>
          
          {/* Quick Mark Buttons */}
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-[1.5rem] shadow-sm border border-slate-200 w-full lg:w-auto overflow-x-auto scrollbar-hide">
            <button 
              onClick={() => markAllAs('present')} 
              className="flex-1 lg:flex-none px-4 py-2.5 text-xs sm:text-sm text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap border border-emerald-100"
            >
              <CheckCircle2 className="w-4 h-4" /> الكل حاضر
            </button>
            <button 
              onClick={() => markAllAs('absent')} 
              className="flex-1 lg:flex-none px-4 py-2.5 text-xs sm:text-sm text-rose-700 hover:bg-rose-50 rounded-xl font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap border border-transparent hover:border-rose-100"
            >
              <XCircle className="w-4 h-4" /> الكل غائب
            </button>
          </div>
        </div>
        
        {/* 🚀 Desktop Table View (Modern Pills Design) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead>
              <tr className="bg-slate-50/30">
                <th scope="col" className="py-5 pr-8 pl-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">اسم الطالب</th>
                <th scope="col" className="px-2 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">حاضر</th>
                <th scope="col" className="px-2 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">غائب</th>
                <th scope="col" className="px-2 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">متأخر</th>
                <th scope="col" className="px-2 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">مستأذن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {systemLoading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-12 w-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                      <p className="text-slate-400 font-bold">جاري تحميل قائمة الطلاب...</p>
                    </div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-16 w-16 rounded-3xl bg-slate-50 flex items-center justify-center border border-slate-100">
                        <Users className="h-8 w-8 text-slate-300" />
                      </div>
                      <p className="text-slate-400 font-bold text-lg">الرجاء اختيار الحصة والفصل لعرض الطلاب</p>
                    </div>
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="group hover:bg-slate-50/50 transition-all duration-300">
                    <td className="whitespace-nowrap py-4 pr-8 pl-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-lg shadow-sm group-hover:scale-110 transition-transform duration-300 shrink-0">
                          {student.users?.full_name?.charAt(0) || '?'}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-black text-slate-900 tracking-tight text-sm group-hover:text-indigo-600 transition-colors truncate">{student.users?.full_name || 'طالب غير معروف'}</span>
                        </div>
                      </div>
                    </td>
                    
                    {/* Status Buttons (Radio Pills) */}
                    {[
                      { status: 'present', color: 'emerald', icon: CheckCircle2, label: 'حاضر' },
                      { status: 'absent', color: 'rose', icon: XCircle, label: 'غائب' },
                      { status: 'late', color: 'amber', icon: Clock, label: 'متأخر' },
                      { status: 'excused', color: 'blue', icon: AlertCircle, label: 'مستأذن' }
                    ].map((opt) => (
                      <td key={opt.status} className="whitespace-nowrap px-2 py-4 text-center">
                        <label className="relative inline-flex cursor-pointer group/radio w-full justify-center">
                          <input
                            type="radio"
                            name={`status-${student.id}`}
                            checked={attendance[student.id] === opt.status}
                            onChange={() => handleStatusChange(student.id, opt.status as AttendanceStatus)}
                            className="peer sr-only"
                          />
                          <div className={`px-4 py-2.5 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 font-bold text-xs shadow-sm
                            border-slate-200 bg-white text-slate-400 group-hover/radio:border-${opt.color}-200 group-hover/radio:bg-${opt.color}-50
                            peer-checked:border-${opt.color}-500 peer-checked:bg-${opt.color}-50 peer-checked:text-${opt.color}-700 peer-checked:shadow-${opt.color}-100 peer-checked:shadow-md
                          `}>
                            <opt.icon className={`w-4 h-4 peer-checked:animate-in peer-checked:zoom-in-50`} />
                            {opt.label}
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

        {/* 🚀 Mobile View (Smart Cards) */}
        <div className="md:hidden divide-y divide-slate-100 bg-slate-50/30">
          {systemLoading ? (
            <div className="py-20 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                <p className="text-slate-400 font-bold">جاري التحميل...</p>
              </div>
            </div>
          ) : students.length === 0 ? (
            <div className="py-20 text-center px-4">
              <p className="text-slate-400 font-bold text-sm">الرجاء اختيار الحصة والفصل أعلاه لعرض الطلاب وبدء رصد الغياب.</p>
            </div>
          ) : (
            students.map((student) => (
              <div key={student.id} className="p-5 space-y-4 bg-white hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-lg shrink-0">
                    {student.users?.full_name?.charAt(0)}
                  </div>
                  <div className="font-black text-slate-900 text-base tracking-tight truncate">{student.users?.full_name}</div>
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
                      className={`flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-2xl border-2 transition-all ${
                        attendance[student.id] === opt.status
                          ? `bg-${opt.color}-50 border-${opt.color}-500 text-${opt.color}-700 shadow-md shadow-${opt.color}-100`
                          : `bg-white border-slate-100 text-slate-400 hover:border-${opt.color}-200`
                      }`}
                    >
                      <opt.icon className={`w-5 h-5 ${attendance[student.id] === opt.status ? 'animate-in zoom-in-50' : ''}`} />
                      <span className="font-black text-[10px]">{opt.label}</span>
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
