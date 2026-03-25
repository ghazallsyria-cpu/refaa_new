'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, BookOpen, Calendar, CheckCircle2, 
  Clock, FileText, Plus, Search, 
  TrendingUp, BarChart2, UserCheck, MessageSquare,
  Bell, ChevronLeft, MoreVertical, Edit, Trash2, AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import AnnouncementsWidget from '@/components/AnnouncementsWidget';

export default function TeacherDashboard() {
  const [teacherData, setTeacherData] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [recentExams, setRecentExams] = useState<any[]>([]);
  const [recentAssignments, setRecentAssignments] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalExams: 0,
    totalAssignments: 0,
    avgAttendance: 0,
    absenceRate: 0
  });
  const [assignmentStats, setAssignmentStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch teacher profile
      const { data: teacher } = await supabase
        .from('teachers')
        .select('*, users(*)')
        .eq('id', user.id)
        .single();
      
      setTeacherData(teacher);

      if (teacher) {
        // Fetch teacher's sections assigned to this teacher
        const { data: teacherSections } = await supabase
          .from('teacher_sections')
          .select('section_id, section:sections(*, classes(*), students(count))')
          .eq('teacher_id', user.id);
        
        const sectionsData = (teacherSections?.map(ts => ts.section) || []) as any[];
        setSections(sectionsData);

        // Fetch exams for the teacher's sections
        const sectionIds = sectionsData.map((s: any) => s.id);
        
        const [examsRes, assignmentsRes, scheduleRes, messagesRes, attendanceRes, examsCountRes, assignmentsCountRes, submissionsRes] = await Promise.all([
          supabase
            .from('exams')
            .select('*, subject:subjects(name), section:sections(name)')
            .in('section_id', sectionIds)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('assignments')
            .select('*, subjects(name), sections(name, classes(name))')
            .in('section_id', sectionIds)
            .order('due_date', { ascending: true })
            .limit(5),
          supabase
            .from('schedules')
            .select('*, subjects(name), sections(name, classes(name))')
            .eq('teacher_id', user.id)
            .order('day_of_week')
            .order('period'),
          supabase
            .from('messages')
            .select('*, sender:sender_id(full_name)')
            .eq('receiver_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('attendance')
            .select('status')
            .in('section_id', sectionIds)
            .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
          supabase
            .from('exams')
            .select('id', { count: 'exact', head: true })
            .in('section_id', sectionIds),
          supabase
            .from('assignments')
            .select('id', { count: 'exact', head: true })
            .in('section_id', sectionIds),
          supabase
            .from('assignment_submissions')
            .select('assignment_id')
            .in('assignment_id', (await supabase.from('assignments').select('id').in('section_id', sectionIds)).data?.map(a => a.id) || [])
        ]);
        
        setRecentExams(examsRes.data || []);
        setRecentAssignments(assignmentsRes.data || []);
        setSchedule(scheduleRes.data || []);
        setMessages(messagesRes.data || []);

        // Calculate assignment stats by class
        const allAssignments = await supabase
          .from('assignments')
          .select('id, title, section_id, sections(name, classes(name))')
          .in('section_id', sectionIds);
        
        if (allAssignments.data) {
          const statsByAssignment = allAssignments.data.map(assignment => {
            const submissionCount = submissionsRes.data?.filter(s => s.assignment_id === assignment.id).length || 0;
            const totalStudents = sectionsData.find(s => s.id === assignment.section_id)?.students?.[0]?.count || 0;
            return {
              id: assignment.id,
              title: assignment.title,
              className: `${(assignment.sections as any)?.classes?.name || (assignment.sections as any)?.[0]?.classes?.name || ''} - ${(assignment.sections as any)?.name || (assignment.sections as any)?.[0]?.name || ''}`,
              submissionCount,
              totalStudents,
              percentage: totalStudents > 0 ? Math.round((submissionCount / totalStudents) * 100) : 0
            };
          });
          setAssignmentStats(statsByAssignment);
        }

        // Calculate real attendance stats
        const attendanceData = attendanceRes.data || [];
        const presentCount = attendanceData.filter(a => a.status === 'present' || a.status === 'late').length;
        const absentCount = attendanceData.filter(a => a.status === 'absent').length;
        
        const avgAttendance = attendanceData.length > 0 
          ? Math.round((presentCount / attendanceData.length) * 100) 
          : 100;
          
        const absenceRate = attendanceData.length > 0
          ? Math.round((absentCount / attendanceData.length) * 100)
          : 0;

        // Calculate stats
        const totalStudents = sectionsData?.reduce((acc, s) => acc + (s.students?.[0]?.count || 0), 0) || 0;
        setStats({
          totalStudents,
          totalExams: examsCountRes.count || 0,
          totalAssignments: assignmentsCountRes.count || 0,
          avgAttendance,
          absenceRate
        });
      }
    } catch (error) {
      console.error('Error fetching teacher dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-slate-500 font-medium animate-pulse">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  const today = new Date().getDay(); // 0 is Sunday
  const todaysSchedule = schedule.filter(s => s.day_of_week === today);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-8 max-w-7xl mx-auto"
    >
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">مرحباً، أ. {teacherData?.users?.full_name} 👋</h1>
            <p className="text-indigo-100 text-lg">
              لديك اليوم {todaysSchedule.length} حصص دراسية و {recentAssignments.length} واجبات بانتظار التقييم.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link 
              href="/attendance"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-md px-5 py-3 text-sm font-bold text-white hover:bg-white/20 transition-all border border-white/20"
            >
              <UserCheck className="h-5 w-5" />
              رصد الحضور
            </Link>
            <Link 
              href="/exams/builder/new"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-600 shadow-sm hover:bg-indigo-50 transition-all"
            >
              <Plus className="h-5 w-5" />
              إنشاء اختبار
            </Link>
          </div>
        </div>
        {/* Decorative background elements */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl"></div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'إجمالي الطلاب', value: stats.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-100' },
          { label: 'الاختبارات النشطة', value: stats.totalExams, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50', ring: 'ring-indigo-100' },
          { label: 'الواجبات الحالية', value: stats.totalAssignments, icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-100' },
          { label: 'متوسط الحضور', value: `${stats.avgAttendance}%`, icon: BarChart2, color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
          { label: 'معدل الغياب', value: `${stats.absenceRate}%`, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', ring: 'ring-red-100' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl shadow-sm ring-1 ring-slate-200 flex items-center gap-5 hover:shadow-md transition-shadow"
          >
            <div className={`h-14 w-14 rounded-2xl ${stat.bg} ${stat.ring} ring-1 flex items-center justify-center ${stat.color}`}>
              <stat.icon className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - Left 2 Columns */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Today's Schedule Timeline */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm ring-1 ring-slate-200/50 overflow-hidden hover:shadow-md transition-all">
            <div className="p-6 border-b border-slate-100/50 flex items-center justify-between bg-white/50">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <div className="p-2 bg-indigo-50 rounded-xl">
                  <Clock className="h-5 w-5 text-indigo-600" />
                </div>
                جدول اليوم
              </h2>
              <span className="text-sm font-medium text-slate-500">
                {format(new Date(), 'EEEE، d MMMM', { locale: arSA })}
              </span>
            </div>
            <div className="p-6">
              {todaysSchedule.length > 0 ? (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                  {todaysSchedule.map((item, i) => (
                    <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-indigo-100 text-indigo-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        <span className="text-sm font-bold">{item.period}</span>
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow group-hover:border-indigo-200">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-slate-900">{item.subjects?.name}</h3>
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                            الحصة {item.period}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 flex items-center gap-1.5">
                          <Users className="h-4 w-4" />
                          {item.sections?.classes?.name} - {item.sections?.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
                    <Calendar className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-1">لا توجد حصص اليوم</h3>
                  <p className="text-slate-500">استمتع بيومك! ليس لديك أي حصص مجدولة لهذا اليوم.</p>
                </div>
              )}
            </div>
          </div>

          {/* My Sections Grid */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm ring-1 ring-slate-200/50 overflow-hidden hover:shadow-md transition-all">
            <div className="p-6 border-b border-slate-100/50 flex items-center justify-between bg-white/50">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <div className="p-2 bg-indigo-50 rounded-xl">
                  <BookOpen className="h-5 w-5 text-indigo-600" />
                </div>
                فصولي الدراسية
              </h2>
              <Link href="/classes" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                عرض الكل <ChevronLeft className="h-4 w-4" />
              </Link>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sections.length > 0 ? (
                sections.map((section) => (
                  <Link href={`/classes`} key={section.id} className="block group">
                    <div className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all h-full flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {section.classes?.name}
                          </h3>
                          <p className="text-sm text-slate-500 font-medium">{section.name}</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                          <Users className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                        <span className="text-slate-600 flex items-center gap-1.5">
                          <Users className="h-4 w-4 text-slate-400" />
                          {section.students?.[0]?.count || 0} طالب
                        </span>
                        <span className="text-indigo-600 font-medium group-hover:underline">
                          إدارة الفصل
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-2 p-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  لا توجد فصول مسجلة حالياً
                </div>
              )}
            </div>
          </div>

          {/* Assignment Statistics by Class */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm ring-1 ring-slate-200/50 overflow-hidden hover:shadow-md transition-all">
            <div className="p-6 border-b border-slate-100/50 flex items-center justify-between bg-white/50">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <div className="p-2 bg-amber-50 rounded-xl">
                  <BarChart2 className="h-5 w-5 text-amber-600" />
                </div>
                إحصائيات الواجبات حسب الفصل
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {assignmentStats.length > 0 ? (
                  assignmentStats.map((stat, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-sm font-black text-slate-900">{stat.title}</p>
                          <p className="text-xs font-medium text-slate-500">{stat.className}</p>
                        </div>
                        <div className="text-left">
                          <span className="text-sm font-black text-indigo-600">{stat.percentage}%</span>
                          <p className="text-[10px] font-medium text-slate-400">{stat.submissionCount} من {stat.totalStudents} طالب</p>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${stat.percentage}%` }}
                          transition={{ duration: 1, delay: i * 0.1 }}
                          className={`h-full rounded-full ${
                            stat.percentage > 80 ? 'bg-emerald-500' : 
                            stat.percentage > 50 ? 'bg-indigo-500' : 
                            'bg-amber-500'
                          }`}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    لا توجد بيانات إحصائية متاحة حالياً
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Sidebar Content - Right 1 Column */}
        <div className="space-y-8">
          
          {/* Announcements Widget */}
          <AnnouncementsWidget role="teacher" />

          {/* Recent Assignments */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm ring-1 ring-slate-200/50 overflow-hidden hover:shadow-md transition-all">
            <div className="p-6 border-b border-slate-100/50 flex items-center justify-between bg-white/50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <div className="p-2 bg-amber-50 rounded-xl">
                  <FileText className="h-5 w-5 text-amber-500" />
                </div>
                الواجبات الأخيرة
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {recentAssignments.length > 0 ? (
                recentAssignments.map((assignment) => (
                  <div key={assignment.id} className="p-5 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-slate-900 line-clamp-1">{assignment.title}</h3>
                      <span className="text-xs font-medium px-2 py-1 bg-amber-50 text-amber-700 rounded-md whitespace-nowrap ml-2">
                        {format(new Date(assignment.due_date), 'd MMM', { locale: arSA })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mb-3">
                      {assignment.subjects?.name} • {assignment.sections?.classes?.name}
                    </p>
                    <div className="flex gap-2">
                      <Link href={`/assignments/${assignment.id}`} className="flex-1 text-center py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors">
                        عرض التفاصيل
                      </Link>
                      <Link href={`/assignments/${assignment.id}`} className="flex-1 text-center py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                        التقييم
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500 text-sm">
                  لا توجد واجبات حالياً
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              <Link href="/assignments" className="block w-full text-center text-sm font-medium text-indigo-600 hover:text-indigo-700">
                عرض كل الواجبات
              </Link>
            </div>
          </div>

          {/* Recent Messages */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm ring-1 ring-slate-200/50 overflow-hidden hover:shadow-md transition-all">
            <div className="p-6 border-b border-slate-100/50 flex items-center justify-between bg-white/50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <div className="p-2 bg-emerald-50 rounded-xl">
                  <MessageSquare className="h-5 w-5 text-emerald-500" />
                </div>
                رسائل جديدة
              </h2>
              {messages.length > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {messages.length}
                </span>
              )}
            </div>
            <div className="divide-y divide-slate-100">
              {messages.length > 0 ? (
                messages.map((msg, i) => (
                  <Link href={`/messages?id=${msg.id}`} key={i} className="flex gap-4 p-5 hover:bg-slate-50 transition-colors group">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex-shrink-0 flex items-center justify-center font-bold text-emerald-700">
                      {msg.sender?.full_name?.charAt(0) || 'م'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-baseline mb-1">
                        <p className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                          {msg.sender?.full_name}
                        </p>
                        <p className="text-[10px] text-slate-400 whitespace-nowrap mr-2">
                          {format(new Date(msg.created_at), 'd MMM', { locale: arSA })}
                        </p>
                      </div>
                      <p className="text-xs text-slate-600 truncate font-medium">{msg.subject}</p>
                      <p className="text-xs text-slate-500 truncate mt-1">{msg.content}</p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500 text-sm flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                    <CheckCircle2 className="h-6 w-6 text-slate-300" />
                  </div>
                  صندوق الوارد فارغ
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              <Link href="/messages" className="block w-full text-center text-sm font-medium text-indigo-600 hover:text-indigo-700">
                فتح صندوق الرسائل
              </Link>
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
