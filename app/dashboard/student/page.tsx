'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BookOpen, Calendar, Clock, FileText, GraduationCap, ChevronLeft, 
  Award, Target, User, ChevronRight, Play, Star, Loader2, Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import AnnouncementsWidget from '../../../components/AnnouncementsWidget';
import { useDashboardSystem } from '../../../hooks/useDashboardSystem';
import { useAuth } from '../../../context/auth-context';
import { cn } from '../../../lib/utils';

export default function StudentDashboard() {
  const { user, authRole, isChecking } = useAuth() as any; 
  const [studentData, setStudentData] = useState<any>(null);
  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<any[]>([]);
  const [todaysSchedule, setTodaysSchedule] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { fetchStudentDashboardData } = useDashboardSystem();

  useEffect(() => {
    setMounted(true);
    const fetchData = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const data = await fetchStudentDashboardData();
        if (data) {
          setStudentData(data.student);
          setUpcomingExams(data.exams);
          setUpcomingAssignments(data.assignments);
          setTodaysSchedule(data.todaysSchedule);
          setPeriods(data.periods);
        }
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
    };
    if (!isChecking) fetchData();
  }, [isChecking, user, fetchStudentDashboardData]);

  if (isChecking || loading || !mounted) return <div className="flex h-[80vh] items-center justify-center font-cairo">جاري التحميل...</div>;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12 max-w-7xl mx-auto px-4 font-cairo pt-6" dir="rtl">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-indigo-600 to-purple-700 p-10 text-white shadow-2xl">
        <h1 className="text-3xl sm:text-4xl font-black mb-4">أهلاً بك يا بطل، {studentData?.users?.full_name?.split(' ')[0]} 🎓</h1>
        <p className="text-indigo-100 font-bold opacity-80">نتمنى لك يوماً دراسياً مليئاً بالإنجازات والتميز.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* العمود الأكبر: الجدول والواجبات */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* جدول اليوم المحدث بذكاء */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Clock className="text-indigo-500"/> حصص اليوم</h2>
            </div>
            <div className="p-6 space-y-4">
              {todaysSchedule.map((item, i) => (
                <div key={i} className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="h-12 w-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-lg shadow-indigo-100 shrink-0">{item.period}</div>
                    <div>
                      {/* رابط الحصة (زوم) يبقى كما هو */}
                      <a href={item.teachers?.zoom_link} target="_blank" rel="noreferrer" className="text-lg font-black text-slate-900 hover:text-indigo-600 transition-colors block leading-tight">
                        {item.subjects?.name} - الحصة الحية 🚀
                      </a>
                      {/* 🚀 إضافة رابط ملف المعلم تحت اسم الحصة */}
                      <Link href={`/teachers/${item.teachers?.id}`} className="text-xs font-bold text-slate-400 hover:text-indigo-500 flex items-center gap-1 mt-1 transition-colors group">
                        بإشراف: <span className="underline decoration-dotted group-hover:decoration-solid">أ. {item.teachers?.users?.full_name}</span>
                        <Info size={10} />
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <span className="text-[11px] font-black text-slate-400 bg-white px-3 py-1 rounded-lg border border-slate-100">8:00 - 8:45</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* الواجبات المحدثة بالصور */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6">
            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Target className="text-amber-500"/> الواجبات المطلوبة</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingAssignments.map((ass) => (
                <div key={ass.id} className="p-5 rounded-2xl border border-slate-100 bg-white hover:border-amber-200 transition-all shadow-sm">
                  <Link href={`/assignments/${ass.id}`} className="text-base font-black text-slate-900 hover:text-amber-600 block mb-3">{ass.title}</Link>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
                    {/* 🚀 صورة واسم المعلم كـ رابط للملف الشخصي */}
                    <Link href={`/teachers/${ass.teacher_id}`} className="flex items-center gap-2 group">
                      <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 group-hover:scale-110 transition-transform">
                        {ass.teacher?.users?.avatar_url ? <img src={ass.teacher.users.avatar_url} className="w-full h-full object-cover" /> : <User size={14} className="text-slate-400 mx-auto mt-1.5" />}
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 group-hover:text-indigo-600">أ. {ass.teacher?.users?.full_name?.split(' ')[0]}</span>
                    </Link>
                    <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-md">{format(new Date(ass.due_date), 'd MMM')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* العمود الجانبي (الأوسمة والنتائج) */}
        <div className="space-y-8">
           <AnnouncementsWidget authRole="student" />
           {/* ... */}
        </div>

      </div>
    </motion.div>
  );
}
