'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, BookOpen, Calendar, CheckCircle2, Clock, 
  FileText, Plus, Search, TrendingUp, BarChart2, 
  UserCheck, MessageSquare, Bell, ChevronLeft, AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { format, isValid } from 'date-fns';
import { arSA } from 'date-fns/locale';
import AnnouncementsWidget from '@/components/AnnouncementsWidget';
import { useDashboardSystem, type TeacherDashboardData } from '@/hooks/useDashboardSystem';

export default function TeacherDashboard() {
  const { fetchTeacherDashboardData } = useDashboardSystem();
  
  const [teacherData, setTeacherData] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [recentExams, setRecentExams] = useState<any[]>([]);
  const [recentAssignments, setRecentAssignments] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0, totalExams: 0, totalAssignments: 0, avgAttendance: 0, absenceRate: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // الخطوة الحاسمة لنجاح الـ Build: استخدام any لتجنب خطأ never
      const data: any = await fetchTeacherDashboardData();
      
      if (data) {
        setTeacherData(data.teacher);
        setSections(data.sections || []);
        setRecentExams(data.recentExams || []);
        setRecentAssignments(data.recentAssignments || []);
        setSchedule(data.schedule || []);
        setPeriods(data.periods || []);
        setMessages(data.messages || []);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching teacher data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchTeacherDashboardData]);

  useEffect(() => {
    if (mounted) fetchData();
  }, [fetchData, mounted]);

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-indigo-600"></div>
    </div>
  );

  const today = new Date().getDay() + 1;
  const todaysSchedule = schedule.filter(s => s.day_of_week === today);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12 max-w-7xl mx-auto px-4" dir="rtl">
      
      {/* Header */}
      <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-indigo-700 to-violet-800 p-10 text-white shadow-2xl transition-all hover:shadow-indigo-200">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h1 className="text-4xl font-black mb-4 tracking-tight">مرحباً، أ. {teacherData?.users?.full_name} 👋</h1>
            <p className="text-indigo-100 text-xl font-medium">لديك اليوم {todaysSchedule.length} حصص دراسية مجدولة.</p>
            <div className="flex gap-4 mt-8">
              <Link href="/gradebook" className="bg-white text-indigo-600 px-6 py-3 rounded-2xl font-black hover:bg-indigo-50 transition-all shadow-lg flex items-center gap-2 text-sm">
                <BarChart2 size={18} /> سجل الأداء
              </Link>
              <Link href="/exams/builder/new" className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-6 py-3 rounded-2xl font-black hover:bg-white/20 transition-all flex items-center gap-2 text-sm">
                <Plus size={18} /> اختبار جديد
              </Link>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/20 text-center min-w-[140px]">
              <p className="text-[10px] font-black uppercase mb-1">الطلاب</p>
              <p className="text-4xl font-black">{stats.totalStudents}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/20 text-center min-w-[140px]">
              <p className="text-[10px] font-black uppercase mb-1">الحضور</p>
              <p className="text-4xl font-black">{stats.avgAttendance}%</p>
            </div>
          </div>
        </div>
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/5 blur-3xl"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* Today's Classes */}
          <div className="bg-white p-8 rounded-[32px] shadow-xl border border-slate-50">
            <h2 className="text-2xl font-black mb-8 flex items-center gap-3"><Clock className="text-indigo-600" /> جدول اليوم</h2>
            <div className="space-y-4">
              {todaysSchedule.length > 0 ? (
                todaysSchedule.map((item, i) => (
                  <div key={i} className="group p-5 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-between hover:bg-white hover:shadow-lg transition-all">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-black text-indigo-600 shadow-sm">{item.period}</div>
                      <div>
                        <p className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{item.subjects?.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{item.sections?.classes?.name} - {item.sections?.name}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 bg-white px-3 py-1 rounded-lg border border-slate-100" dir="ltr">
                      {item.start_time?.substring(0, 5)}
                    </span>
                  </div>
                ))
              ) : <div className="py-12 text-center text-slate-400 font-bold bg-slate-50 rounded-3xl">لا توجد حصص مجدولة لليوم</div>}
            </div>
          </div>

          {/* Sections Grid */}
          <div className="bg-white p-8 rounded-[32px] shadow-xl border border-slate-50">
            <h2 className="text-2xl font-black mb-8 flex items-center gap-3"><BookOpen className="text-emerald-500" /> فصولي الدراسية</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sections.map((section) => (
                <div key={section.id} className="p-6 rounded-3xl bg-slate-50 border border-slate-100 group hover:border-emerald-200 transition-all">
                  <h3 className="font-black text-lg text-slate-900 mb-4">{section.classes?.name} - {section.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-2"><Users size={14} /> {section.students?.[0]?.count || 0} طالب</span>
                    <Link href={`/classes`} className="text-[10px] font-black text-emerald-600 hover:underline">إدارة الفصل</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <AnnouncementsWidget role="teacher" />
          
          <div className="bg-white p-6 rounded-[32px] shadow-xl border border-slate-50">
            <h2 className="text-lg font-black mb-6 flex items-center gap-2"><FileText className="text-amber-500" /> الواجبات الأخيرة</h2>
            <div className="space-y-3">
              {recentAssignments.map((a) => (
                <div key={a.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="font-black text-sm text-slate-900 line-clamp-1">{a.title}</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">{a.subjects?.name}</p>
                </div>
              ))}
              {recentAssignments.length === 0 && <p className="text-center py-6 text-slate-400 font-bold text-xs">لا توجد واجبات حالياً</p>}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

