'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Save, CheckCircle2, XCircle, Clock, AlertCircle, Users } from 'lucide-react';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export default function AttendancePage() {
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchStudentsAndAttendance = useCallback(async () => {
    setLoading(true);
    setMessage({ text: '', type: '' });

    const calculateStats = (attendanceData: any[], studentsData: any[]) => {
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const stats = {
        daily: { present: 0, absent: 0, late: 0, excused: 0, total: 0, rate: 0 },
        weekly: { present: 0, absent: 0, late: 0, excused: 0, total: 0, rate: 0 },
        monthly: { present: 0, absent: 0, late: 0, excused: 0, total: 0, rate: 0 },
        students: {} as Record<string, any>
      };

      attendanceData.forEach(a => {
        const aDate = new Date(a.date);
        const status = a.status as AttendanceStatus;
        const isPresent = status === 'present' || status === 'late';

        // Daily (for selected date)
        if (a.date === date) {
          stats.daily[status]++;
          stats.daily.total++;
        }

        // Weekly
        if (aDate >= sevenDaysAgo) {
          stats.weekly[status]++;
          stats.weekly.total++;
        }

        // Monthly
        if (aDate >= thirtyDaysAgo) {
          stats.monthly[status]++;
          stats.monthly.total++;
        }

        // Student stats
        if (!stats.students[a.student_id]) {
          stats.students[a.student_id] = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
        }
        stats.students[a.student_id][status]++;
        stats.students[a.student_id].total++;
      });

      // Calculate rates
      if (stats.daily.total > 0) {
        stats.daily.rate = Math.round(((stats.daily.present + stats.daily.late) / stats.daily.total) * 100);
      }
      if (stats.weekly.total > 0) {
        stats.weekly.rate = Math.round(((stats.weekly.present + stats.weekly.late) / stats.weekly.total) * 100);
      }
      if (stats.monthly.total > 0) {
        stats.monthly.rate = Math.round(((stats.monthly.present + stats.monthly.late) / stats.monthly.total) * 100);
      }

      setStats(stats);
    };

    try {
      // Fetch students for the section
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, users(full_name)')
        .eq('section_id', selectedSection);

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // Fetch existing attendance for this date and section
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('student_id, status, date')
        .eq('section_id', selectedSection)
        .gte('date', new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);

      if (attendanceError) throw attendanceError;

      // Initialize attendance state for the selected date
      const newAttendance: Record<string, AttendanceStatus> = {};
      
      // Default all to present
      studentsData?.forEach(s => {
        newAttendance[s.id] = 'present';
      });

      // Override with saved data for the selected date
      attendanceData?.filter(a => a.date === date).forEach(a => {
        newAttendance[a.student_id] = a.status as AttendanceStatus;
      });

      setAttendance(newAttendance);
      
      calculateStats(attendanceData || [], studentsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedSection, date]);

  const [userRole, setUserRole] = useState<string | null>(null);
  const [studentStats, setStudentStats] = useState<any>(null);
  const [studentAttendance, setStudentAttendance] = useState<any[]>([]);

  const fetchSections = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // جلب دور المستخدم
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      const role = userData?.role;
      setUserRole(role);
      console.log('User Role:', role);

      if (role === 'student') {
        // Fetch student's own attendance
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select('status, date')
          .eq('student_id', user.id)
          .order('date', { ascending: false });

        if (attendanceError) throw attendanceError;
        
        setStudentAttendance(attendanceData?.filter(a => a.status === 'absent') || []);
        
        const stats = { present: 0, absent: 0, late: 0, excused: 0 };
        attendanceData?.forEach(a => {
          const status = a.status as AttendanceStatus;
          if (stats[status] !== undefined) {
            stats[status]++;
          }
        });
        setStudentStats(stats);
        return;
      }

      let sectionsData: any[] = [];
      const isTeacher = role === 'teacher' || (typeof role === 'string' && role.includes('teacher'));
      const isAdmin = role === 'admin' || (typeof role === 'string' && role.includes('admin'));

      if (isTeacher) {
        // المعلم يرى فصوله فقط
        const { data: teacherSections } = await supabase
          .from('teacher_sections')
          .select('section_id, section:sections(id, name, classes(name))')
          .eq('teacher_id', user.id);
        
        sectionsData = (teacherSections?.map(ts => ts.section) || []) as any[];
        console.log('Teacher sections:', sectionsData);
      } else if (isAdmin) {
        // المدير يرى كل الفصول
        const { data: allSections } = await supabase
          .from('sections')
          .select('id, name, classes(name)');
        sectionsData = allSections || [];
        console.log('Admin sections:', sectionsData);
      } else {
        // المستخدم ليس مديراً ولا معلماً
        sectionsData = [];
        console.log('No sections for this user role:', role);
      }
      
      setSections(sectionsData);
      if (sectionsData.length > 0) {
        setSelectedSection(sectionsData[0].id);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  }, []);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  useEffect(() => {
    if (selectedSection && date) {
      fetchStudentsAndAttendance();
    }
  }, [selectedSection, date, fetchStudentsAndAttendance]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const records = Object.entries(attendance).map(([studentId, status]) => ({
        student_id: studentId,
        section_id: selectedSection,
        date: date,
        status: status,
        recorded_by: user?.id || null
      }));

      // Upsert attendance records
      const { error } = await supabase
        .from('attendance')
        .upsert(records, { onConflict: 'student_id,date' });

      if (error) throw error;
      
      // Send Notifications for absent/late students
      try {
        const absentLateRecords = records.filter(r => r.status === 'absent' || r.status === 'late');
        
        if (absentLateRecords.length > 0) {
          const notificationPayloads: any[] = [];
          
          for (const record of absentLateRecords) {
            const student = students.find(s => s.id === record.student_id);
            if (student) {
              const statusText = record.status === 'absent' ? 'غائب' : 'متأخر';
              notificationPayloads.push({
                user_id: student.id,
                title: 'تنبيه حضور',
                content: `تم تسجيلك كـ ${statusText} بتاريخ ${record.date}`,
                type: 'attendance',
                link: '/attendance'
              });
            }
          }

          if (notificationPayloads.length > 0) {
            await supabase.from('notifications').insert(notificationPayloads);
          }
        }
      } catch (notifErr) {
        console.error('Error sending attendance notifications:', notifErr);
      }

      setMessage({ text: 'تم حفظ الغياب والحضور بنجاح', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      setMessage({ text: 'حدث خطأ أثناء الحفظ', type: 'error' });
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

  if (userRole === 'student') {
    return (
      <div className="space-y-10 max-w-6xl mx-auto pb-24 p-4 sm:p-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">سجل الحضور والغياب</h1>
          <p className="text-lg text-slate-500 font-medium">إحصائيات وسجل حضورك الشخصي</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="glass-card p-8 rounded-4xl border border-emerald-100 bg-emerald-50/30 flex flex-col items-center justify-center text-center gap-4 shadow-xl shadow-emerald-100/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
            <div className="h-16 w-16 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="relative">
              <p className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-1">حاضر</p>
              <div className="flex items-baseline justify-center gap-1">
                <p className="text-4xl font-black text-emerald-600">{studentStats?.present || 0}</p>
                <span className="text-xs font-bold text-emerald-400">/ {studentAttendance.length}</span>
              </div>
              <div className="mt-4 h-1.5 w-24 bg-emerald-100 rounded-full overflow-hidden mx-auto">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                  style={{ width: `${studentAttendance.length > 0 ? ((studentStats?.present || 0) / studentAttendance.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="glass-card p-8 rounded-4xl border border-red-100 bg-red-50/30 flex flex-col items-center justify-center text-center gap-4 shadow-xl shadow-red-100/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
            <div className="h-16 w-16 rounded-2xl bg-white flex items-center justify-center text-red-600 shadow-sm group-hover:scale-110 transition-transform">
              <XCircle className="h-8 w-8" />
            </div>
            <div className="relative">
              <p className="text-[10px] font-black text-red-600/70 uppercase tracking-widest mb-1">غائب</p>
              <p className="text-4xl font-black text-red-600">{studentStats?.absent || 0}</p>
              <span className="text-[10px] font-black text-red-400 bg-white px-2 py-0.5 rounded-lg mt-2 inline-block">
                {studentAttendance.length > 0 ? Math.round(((studentStats?.absent || 0) / studentAttendance.length) * 100) : 0}% من الإجمالي
              </span>
            </div>
          </div>

          <div className="glass-card p-8 rounded-4xl border border-amber-100 bg-amber-50/30 flex flex-col items-center justify-center text-center gap-4 shadow-xl shadow-amber-100/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
            <div className="h-16 w-16 rounded-2xl bg-white flex items-center justify-center text-amber-600 shadow-sm group-hover:scale-110 transition-transform">
              <Clock className="h-8 w-8" />
            </div>
            <div className="relative">
              <p className="text-[10px] font-black text-amber-600/70 uppercase tracking-widest mb-1">متأخر</p>
              <p className="text-4xl font-black text-amber-600">{studentStats?.late || 0}</p>
              <span className="text-[10px] font-black text-amber-400 bg-white px-2 py-0.5 rounded-lg mt-2 inline-block">
                {studentAttendance.length > 0 ? Math.round(((studentStats?.late || 0) / studentAttendance.length) * 100) : 0}% من الإجمالي
              </span>
            </div>
          </div>

          <div className="glass-card p-8 rounded-4xl border border-blue-100 bg-blue-50/30 flex flex-col items-center justify-center text-center gap-4 shadow-xl shadow-blue-100/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
            <div className="h-16 w-16 rounded-2xl bg-white flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div className="relative">
              <p className="text-[10px] font-black text-blue-600/70 uppercase tracking-widest mb-1">بعذر</p>
              <p className="text-4xl font-black text-blue-600">{studentStats?.excused || 0}</p>
              <span className="text-[10px] font-black text-blue-400 bg-white px-2 py-0.5 rounded-lg mt-2 inline-block">
                {studentAttendance.length > 0 ? Math.round(((studentStats?.excused || 0) / studentAttendance.length) * 100) : 0}% من الإجمالي
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white/60 overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">سجل الأيام السابقة</h2>
          </div>
          <div className="p-8">
            {studentAttendance.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">لا يوجد سجل حضور متاح لك حتى الآن.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {studentAttendance.map((record, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <span className="text-sm font-bold text-slate-600" dir="ltr">
                      {new Date(record.date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    <span className={`px-3 py-1 rounded-xl text-xs font-black ${
                      record.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                      record.status === 'absent' ? 'bg-red-100 text-red-700' :
                      record.status === 'late' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {record.status === 'present' ? 'حاضر' :
                       record.status === 'absent' ? 'غائب' :
                       record.status === 'late' ? 'متأخر' : 'بعذر'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">سجل الحضور والغياب</h1>
          <p className="text-lg text-slate-500 font-medium">تسجيل ومتابعة حضور الطلاب اليومي بدقة وكفاءة</p>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={saving || students.length === 0}
          className="inline-flex items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed self-start md:self-end"
        >
          <Save className="h-5 w-5" />
          {saving ? 'جاري الحفظ...' : 'حفظ سجل اليوم'}
        </button>
      </div>

      {message.text && (
        <div className={`p-6 rounded-3xl shadow-xl animate-in fade-in slide-in-from-top-4 duration-500 flex items-center gap-4 ${
          message.type === 'success' 
            ? 'bg-emerald-500 text-white shadow-emerald-100' 
            : 'bg-red-500 text-white shadow-red-100'
        }`}>
          <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center">
            {message.type === 'success' ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
          </div>
          <span className="font-bold tracking-tight">{message.text}</span>
        </div>
      )}

      <div className="glass-card p-8 rounded-4xl shadow-2xl shadow-slate-200/50 border border-white/60">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700 mr-1">الفصل / الشعبة</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="block w-full rounded-2xl border-0 py-4 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold"
            >
              {sections.map(s => (
                <option key={s.id} value={s.id}>{s.classes?.name} - {s.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700 mr-1">التاريخ</label>
            <div className="relative group">
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                <Calendar className="h-5 w-5" />
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="block w-full rounded-2xl border-0 py-4 pr-12 pl-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {stats && (
          <>
            <div className="glass-card p-8 rounded-4xl shadow-2xl shadow-slate-200/50 border border-white/60 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
              <div className="relative">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-black text-slate-900">يومي</h3>
                  <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-700 text-xs font-black">{stats.daily.rate}%</span>
                </div>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">حاضر</span>
                    <span className="text-xl font-black text-emerald-600">{stats.daily.present}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">غائب</span>
                    <span className="text-xl font-black text-red-600">{stats.daily.absent}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">متأخر</span>
                    <span className="text-xl font-black text-amber-600">{stats.daily.late}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">مستأذن</span>
                    <span className="text-xl font-black text-blue-600">{stats.daily.excused}</span>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>إجمالي السجلات</span>
                  <span className="text-slate-900">{stats.daily.total}</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-8 rounded-4xl shadow-2xl shadow-slate-200/50 border border-white/60 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
              <div className="relative">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-black text-slate-900">أسبوعي</h3>
                  <span className="px-3 py-1 rounded-xl bg-indigo-100 text-indigo-700 text-xs font-black">{stats.weekly.rate}%</span>
                </div>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">حاضر</span>
                    <span className="text-xl font-black text-emerald-600">{stats.weekly.present}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">غائب</span>
                    <span className="text-xl font-black text-red-600">{stats.weekly.absent}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">متأخر</span>
                    <span className="text-xl font-black text-amber-600">{stats.weekly.late}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">مستأذن</span>
                    <span className="text-xl font-black text-blue-600">{stats.weekly.excused}</span>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>إجمالي السجلات</span>
                  <span className="text-slate-900">{stats.weekly.total}</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-8 rounded-4xl shadow-2xl shadow-slate-200/50 border border-white/60 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
              <div className="relative">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-black text-slate-900">شهري</h3>
                  <span className="px-3 py-1 rounded-xl bg-amber-100 text-amber-700 text-xs font-black">{stats.monthly.rate}%</span>
                </div>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">حاضر</span>
                    <span className="text-xl font-black text-emerald-600">{stats.monthly.present}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">غائب</span>
                    <span className="text-xl font-black text-red-600">{stats.monthly.absent}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">متأخر</span>
                    <span className="text-xl font-black text-amber-600">{stats.monthly.late}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">مستأذن</span>
                    <span className="text-xl font-black text-blue-600">{stats.monthly.excused}</span>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>إجمالي السجلات</span>
                  <span className="text-slate-900">{stats.monthly.total}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Smart Insights */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="glass-card p-8 rounded-4xl shadow-2xl shadow-slate-200/50 border border-white/60 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-red-100 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">تنبيهات الغياب (أقل من 80%)</h3>
              </div>
              <div className="space-y-4">
                {students.filter(s => {
                  const sStats = stats.students[s.id];
                  if (!sStats || sStats.total === 0) return false;
                  const rate = ((sStats.present + sStats.late) / sStats.total) * 100;
                  return rate < 80;
                }).slice(0, 5).map(s => {
                  const sStats = stats.students[s.id];
                  const rate = Math.round(((sStats.present + sStats.late) / sStats.total) * 100);
                  return (
                    <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl bg-red-50/50 border border-red-100 group/item hover:bg-red-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white border border-red-200 flex items-center justify-center text-red-600 font-black shadow-sm group-hover/item:scale-110 transition-transform">
                          {s.users?.full_name?.[0] || '?'}
                        </div>
                        <span className="font-bold text-slate-700 tracking-tight">{s.users?.full_name}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-black text-red-600">{rate}%</span>
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">معدل الحضور</span>
                      </div>
                    </div>
                  );
                })}
                {students.filter(s => {
                  const sStats = stats.students[s.id];
                  if (!sStats || sStats.total === 0) return false;
                  const rate = ((sStats.present + sStats.late) / sStats.total) * 100;
                  return rate < 80;
                }).length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </div>
                    <p className="text-slate-400 font-bold italic">جميع الطلاب لديهم معدل حضور ممتاز</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="glass-card p-8 rounded-4xl shadow-2xl shadow-slate-200/50 border border-white/60 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-100 rounded-xl">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">الأكثر تأخراً (هذا الشهر)</h3>
              </div>
              <div className="space-y-4">
                {students.filter(s => (stats.students[s.id]?.late || 0) > 0)
                  .sort((a, b) => (stats.students[b.id]?.late || 0) - (stats.students[a.id]?.late || 0))
                  .slice(0, 5).map(s => (
                    <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl bg-amber-50/50 border border-amber-100 group/item hover:bg-amber-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white border border-amber-200 flex items-center justify-center text-amber-600 font-black shadow-sm group-hover/item:scale-110 transition-transform">
                          {s.users?.full_name?.[0] || '?'}
                        </div>
                        <span className="font-bold text-slate-700 tracking-tight">{s.users?.full_name}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-black text-amber-600">{stats.students[s.id].late} مرات</span>
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">إجمالي التأخير</span>
                      </div>
                    </div>
                  ))}
                {students.filter(s => (stats.students[s.id]?.late || 0) > 0).length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-8 h-8 text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-bold italic">لا يوجد سجلات تأخير لهذا الشهر</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card rounded-4xl shadow-2xl shadow-slate-200/50 border border-white/60 overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">قائمة الطلاب</h3>
              <p className="text-sm text-slate-500 font-bold">{students.length} طالب مسجل</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
            <button 
              onClick={() => markAllAs('present')} 
              className="px-4 py-2 text-xs text-emerald-600 hover:bg-emerald-50 rounded-xl font-black transition-all"
            >
              الكل حاضر
            </button>
            <div className="w-px h-4 bg-slate-100" />
            <button 
              onClick={() => markAllAs('absent')} 
              className="px-4 py-2 text-xs text-red-600 hover:bg-red-50 rounded-xl font-black transition-all"
            >
              الكل غائب
            </button>
          </div>
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead>
              <tr className="bg-slate-50/30">
                <th scope="col" className="py-6 pr-8 pl-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">اسم الطالب</th>
                <th scope="col" className="px-4 py-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">حاضر</th>
                <th scope="col" className="px-4 py-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">غائب</th>
                <th scope="col" className="px-4 py-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">متأخر</th>
                <th scope="col" className="px-4 py-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">مستأذن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50 bg-white/40 backdrop-blur-sm">
              {loading ? (
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
                      <div className="h-16 w-16 rounded-3xl bg-slate-50 flex items-center justify-center">
                        <Users className="h-8 w-8 text-slate-200" />
                      </div>
                      <p className="text-slate-400 font-bold text-lg">لا يوجد طلاب مسجلين في هذه الشعبة</p>
                    </div>
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="group hover:bg-white/60 transition-all duration-300">
                    <td className="whitespace-nowrap py-6 pr-8 pl-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-200/50 group-hover:scale-110 transition-transform duration-300">
                          {student.users?.full_name?.charAt(0) || '?'}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 tracking-tight text-base group-hover:text-indigo-600 transition-colors">{student.users?.full_name || 'طالب غير معروف'}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">رقم القيد: {student.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-6 text-center">
                      <label className="relative inline-flex items-center cursor-pointer group/radio">
                        <input
                          type="radio"
                          name={`status-${student.id}`}
                          checked={attendance[student.id] === 'present'}
                          onChange={() => handleStatusChange(student.id, 'present')}
                          className="peer sr-only"
                        />
                        <div className="w-10 h-10 rounded-xl border-2 border-slate-200 peer-checked:border-emerald-500 peer-checked:bg-emerald-500 transition-all flex items-center justify-center group-hover/radio:border-emerald-200 shadow-sm peer-checked:shadow-emerald-100 peer-checked:shadow-lg">
                          <CheckCircle2 className="h-6 w-6 text-white scale-0 peer-checked:scale-100 transition-all duration-300" />
                        </div>
                      </label>
                    </td>
                    <td className="whitespace-nowrap px-4 py-6 text-center">
                      <label className="relative inline-flex items-center cursor-pointer group/radio">
                        <input
                          type="radio"
                          name={`status-${student.id}`}
                          checked={attendance[student.id] === 'absent'}
                          onChange={() => handleStatusChange(student.id, 'absent')}
                          className="peer sr-only"
                        />
                        <div className="w-10 h-10 rounded-xl border-2 border-slate-200 peer-checked:border-red-500 peer-checked:bg-red-500 transition-all flex items-center justify-center group-hover/radio:border-red-200 shadow-sm peer-checked:shadow-red-100 peer-checked:shadow-lg">
                          <XCircle className="h-6 w-6 text-white scale-0 peer-checked:scale-100 transition-all duration-300" />
                        </div>
                      </label>
                    </td>
                    <td className="whitespace-nowrap px-4 py-6 text-center">
                      <label className="relative inline-flex items-center cursor-pointer group/radio">
                        <input
                          type="radio"
                          name={`status-${student.id}`}
                          checked={attendance[student.id] === 'late'}
                          onChange={() => handleStatusChange(student.id, 'late')}
                          className="peer sr-only"
                        />
                        <div className="w-10 h-10 rounded-xl border-2 border-slate-200 peer-checked:border-amber-500 peer-checked:bg-amber-500 transition-all flex items-center justify-center group-hover/radio:border-amber-200 shadow-sm peer-checked:shadow-amber-100 peer-checked:shadow-lg">
                          <Clock className="h-6 w-6 text-white scale-0 peer-checked:scale-100 transition-all duration-300" />
                        </div>
                      </label>
                    </td>
                    <td className="whitespace-nowrap px-4 py-6 text-center">
                      <label className="relative inline-flex items-center cursor-pointer group/radio">
                        <input
                          type="radio"
                          name={`status-${student.id}`}
                          checked={attendance[student.id] === 'excused'}
                          onChange={() => handleStatusChange(student.id, 'excused')}
                          className="peer sr-only"
                        />
                        <div className="w-10 h-10 rounded-xl border-2 border-slate-200 peer-checked:border-blue-500 peer-checked:bg-blue-500 transition-all flex items-center justify-center group-hover/radio:border-blue-200 shadow-sm peer-checked:shadow-blue-100 peer-checked:shadow-lg">
                          <AlertCircle className="h-6 w-6 text-white scale-0 peer-checked:scale-100 transition-all duration-300" />
                        </div>
                      </label>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="py-20 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-slate-400 font-bold">جاري تحميل قائمة الطلاب...</p>
              </div>
            </div>
          ) : students.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-slate-400 font-bold">لا يوجد طلاب مسجلين في هذه الشعبة</p>
            </div>
          ) : (
            students.map((student) => (
              <div key={student.id} className="p-6 space-y-6 bg-white hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 font-black">
                    {student.users?.full_name?.charAt(0)}
                  </div>
                  <div className="font-black text-slate-900 text-lg tracking-tight">{student.users?.full_name}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleStatusChange(student.id, 'present')}
                    className={`flex items-center justify-center gap-3 py-4 px-4 rounded-2xl border-2 transition-all font-black text-sm ${
                      attendance[student.id] === 'present'
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100'
                        : 'bg-white border-slate-100 text-slate-500 hover:border-emerald-200 hover:text-emerald-600'
                    }`}
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    حاضر
                  </button>
                  <button
                    onClick={() => handleStatusChange(student.id, 'absent')}
                    className={`flex items-center justify-center gap-3 py-4 px-4 rounded-2xl border-2 transition-all font-black text-sm ${
                      attendance[student.id] === 'absent'
                        ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-100'
                        : 'bg-white border-slate-100 text-slate-500 hover:border-red-200 hover:text-red-600'
                    }`}
                  >
                    <XCircle className="h-5 w-5" />
                    غائب
                  </button>
                  <button
                    onClick={() => handleStatusChange(student.id, 'late')}
                    className={`flex items-center justify-center gap-3 py-4 px-4 rounded-2xl border-2 transition-all font-black text-sm ${
                      attendance[student.id] === 'late'
                        ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-100'
                        : 'bg-white border-slate-100 text-slate-500 hover:border-amber-200 hover:text-amber-600'
                    }`}
                  >
                    <Clock className="h-5 w-5" />
                    متأخر
                  </button>
                  <button
                    onClick={() => handleStatusChange(student.id, 'excused')}
                    className={`flex items-center justify-center gap-3 py-4 px-4 rounded-2xl border-2 transition-all font-black text-sm ${
                      attendance[student.id] === 'excused'
                        ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-100'
                        : 'bg-white border-slate-100 text-slate-500 hover:border-blue-200 hover:text-blue-600'
                    }`}
                  >
                    <AlertCircle className="h-5 w-5" />
                    مستأذن
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
