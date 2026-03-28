'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Users, BookOpen, Calendar, Clock, 
  FileText, Plus, BarChart2, UserCheck, 
  MessageSquare, ChevronLeft, AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { format } from 'date-fns';
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
      const data: any = await fetchTeacherDashboardData();
      
      if (data) {
        setTeacherData(data.teacher);
        setSections(data.sections || []);
        setRecentExams(data.recentExams || []);
        setRecentAssignments(data.recentAssignments || []);
        setSchedule(data.schedule || []);
        setPeriods(data.periods || []);
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
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-indigo-600 border-r-4 border-transparent"></div>
        <p className="text-slate-400 font-bold animate-pulse">جاري تحميل لوحة التحكم...</p>
      </div>
    </div>
  );

  // منطق ذكي: إذا كان اليوم عطلة (جمعة 6 أو سبت 7)، أظهر جدول الأحد (1)
  let todayDayOfWeek = new Date().getDay() + 1;
  let isWeekend = false;
  if (todayDayOfWeek > 5) {
    todayDayOfWeek = 1;
    isWeekend = true;
  }
  
  const todaysSchedule = schedule.filter(s => s.day_of_week === todayDayOfWeek);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12 max-w-7xl mx-auto px-4" dir="rtl">
      
      {/* Header */}
      <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-indigo-700 to-violet-800 p-10 text-white shadow-2xl transition-all hover:shadow-indigo-200">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h1 className="text-4xl font-black mb-4 tracking-tight">مرحباً، أ. {teacherData?.users?.full_name || 'عزيزي المعلم'} 👋</h1>
            <p className="text-indigo-100 text-xl font-medium">
              {isWeekend 
                ? `عطلة سعيدة! لديك ${todaysSchedule.length} حصص مجدولة ليوم الأحد القادم.`
                : `لديك اليوم ${todaysSchedule.length} حصص دراسية مجدولة.`}
            </p>
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
              <p className="text-[10px] font-black uppercase mb-1 opacity-70">إجمالي الطلاب</p>
              <p className="text-4xl font-black">{stats.totalStudents}</p>
            </div>
          </div>
        </div>
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/5 blur-3xl"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* Today's Classes */}
          <div className="bg-white p-8 rounded-[32px] shadow-xl border border-slate-50">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black flex items-center gap-3">
                <Clock className="text-indigo-600" /> {isWeekend ? 'جدول الأحد القادم' : 'جدول اليوم'}
              </h2>
              <Link href="/dashboard/teacher/schedule" className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full hover:bg-indigo-100 transition-colors">عرض كل الأيام</Link>
            </div>
            
            <div className="space-y-4">
              {todaysSchedule.length > 0 ? (
                todaysSchedule.map((item, i) => (
                  <div key={i} className="group p-5 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-between hover:bg-white hover:shadow-lg hover:border-indigo-100 transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-black text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">{item.period}</div>
                      <div>
                        <p className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors text-lg">{item.subjects?.name}</p>
                        <p className="text-xs font-bold text-slate-400 flex items-center gap-1 mt-1">
                          <Users size={12} /> {item.sections?.classes?.name} - {item.sections?.name}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm" dir="ltr">
                      {item.start_time?.substring(0, 5) || '--:--'}
                    </span>
                  </div>
                ))
              ) : <div className="py-12 text-center text-slate-400 font-bold bg-slate-50 rounded-3xl border border-dashed border-slate-200">لا توجد حصص مجدولة لهذا اليوم</div>}
            </div>
          </div>

          {/* Sections Grid */}
          <div className="bg-white p-8 rounded-[32px] shadow-xl border border-slate-50">
            <h2 className="text-2xl font-black mb-8 flex items-center gap-3"><BookOpen className="text-emerald-500" /> فصولي الدراسية</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sections.length > 0 ? sections.map((section) => (
                <div key={section.id} className="p-6 rounded-3xl bg-slate-50 border border-slate-100 group hover:border-emerald-200 transition-all hover:shadow-md hover:bg-white cursor-pointer">
                  <h3 className="font-black text-lg text-slate-900 mb-4 group-hover:text-emerald-600 transition-colors">{section.classes?.name} - {section.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-100">
                      إدارة الفصل
                    </span>
                    <Link href={`/classes`} className="h-8 w-8 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all"><ChevronLeft size={16} /></Link>
                  </div>
                </div>
              )) : <div className="col-span-2 py-8 text-center text-slate-400 font-bold">لا توجد فصول دراسية مسندة إليك</div>}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <AnnouncementsWidget role="teacher" />
          
          <div className="bg-white p-6 rounded-[32px] shadow-xl border border-slate-50">
            <h2 className="text-lg font-black mb-6 flex items-center gap-2"><FileText className="text-amber-500" /> المهام والواجبات</h2>
            <div className="space-y-3">
              {recentAssignments.length > 0 ? recentAssignments.map((a) => (
                <div key={a.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-amber-50 hover:border-amber-200 transition-colors cursor-pointer">
                  <p className="font-black text-sm text-slate-900 line-clamp-1 mb-1">{a.title}</p>
                  <div className="flex items-center justify-between">
                     <p className="text-[10px] text-slate-500 font-bold">{a.subjects?.name}</p>
                     <span className="text-[9px] font-black bg-white px-2 py-0.5 rounded border text-amber-600">قيد الإنجاز</span>
                  </div>
                </div>
              )) : <p className="text-center py-6 text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl">لا توجد واجبات حالياً</p>}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}


