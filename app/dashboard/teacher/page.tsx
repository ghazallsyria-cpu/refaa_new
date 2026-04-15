'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, BookOpen, Calendar, CheckCircle2, 
  Clock, FileText, Plus, Search, 
  TrendingUp, BarChart2, UserCheck, MessageSquare,
  Bell, ChevronLeft, MoreVertical, Edit, Trash2, AlertCircle, Camera, Play, Star, ChevronRight,
  AlertTriangle, ShieldAlert, HeartHandshake, Award, ArrowUpRight, Loader2, UserCircle // 🚀 إضافة أيقونة الملف
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import AnnouncementsWidget from '@/components/AnnouncementsWidget';
import { useDashboardSystem } from '@/hooks/useDashboardSystem';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

const SYSTEM_START_DATE = new Date('2026-03-01T00:00:00');

export default function TeacherDashboard() {
  const { user, authRole, isChecking } = useAuth() as any; 
  const [teacherData, setTeacherData] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [recentExams, setRecentExams] = useState<any[]>([]);
  const [recentAssignments, setRecentAssignments] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<any[]>([]);
  const [myBadges, setMyBadges] = useState<any[]>([]);

  const [attendanceStatus, setAttendanceStatus] = useState<any>({ isActive: false, missedPeriods: [], completed: false, totalToday: 0 });
  const [stats, setStats] = useState({ totalStudents: 0, totalExams: 0, totalAssignments: 0, avgAttendance: 0, absenceRate: 0 });
  const [assignmentStats, setAssignmentStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  
  const { fetchTeacherDashboardData } = useDashboardSystem();

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const data = await fetchTeacherDashboardData();
      if (data) {
        setTeacherData(data.teacher);
        setSections(data.sections);
        setRecentExams(data.recentExams);
        setRecentAssignments(data.recentAssignments);
        setSchedule(data.schedule);
        setPeriods(data.periods);
        setMessages(data.messages);
        setStats(prev => ({ ...prev, ...data.stats }));
        if (data.assignmentStats) setAssignmentStats(data.assignmentStats);
        
        const { data: badgesData } = await supabase.from('student_badges').select('*, badge:badges(*)').eq('student_id', user.id).order('granted_at', { ascending: false });
        if (badgesData) setMyBadges(badgesData);
      }
    } catch (error) { console.error('Fetch Error:', error); } 
    finally { setLoading(false); }
  }, [fetchTeacherDashboardData, user]);

  useEffect(() => { if (!isChecking && user) fetchData(); }, [fetchData, isChecking, user]);

  const todaysSchedule = useMemo(() => {
    const today = new Date().getDay() + 1; 
    return schedule.filter(s => s.day_of_week === today);
  }, [schedule]);

  if (isChecking || loading) return <div className="flex h-[80vh] items-center justify-center font-cairo text-slate-500 font-bold animate-pulse">جاري التحميل...</div>;

  const avatarUrl = teacherData?.users?.avatar_url;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12 max-w-7xl mx-auto px-4 font-cairo pt-6" dir="rtl">
      
      {/* 👑 Hero Section المحدث */}
      <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 p-8 sm:p-12 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-right">
            {/* الصورة الشخصية كـ رابط لملفه */}
            <Link href={`/teachers/${user.id}`} className="relative group shrink-0">
              <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-[2.5rem] overflow-hidden border-4 border-white/20 shadow-2xl bg-white/10 backdrop-blur-md flex items-center justify-center transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3">
                {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" alt="avatar" /> : <span className="text-5xl font-black">{teacherData?.users?.full_name?.charAt(0)}</span>}
              </div>
              <div className="absolute -bottom-2 -left-2 bg-indigo-500 text-white p-2 rounded-full border-4 border-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><Edit size={12}/></div>
            </Link>

            <div className="pt-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold mb-3 backdrop-blur-sm">
                <Star className="w-3.5 h-3.5 text-yellow-300" />
                <span>لوحة التحكم الرئيسية</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black mb-2 tracking-tight">مرحباً، أ. {teacherData?.users?.full_name} 👋</h1>
              
              {/* زر الدخول لملفي الشخصي */}
              <Link href={`/teachers/${user.id}`} className="inline-flex items-center gap-2 text-indigo-100 hover:text-white font-bold text-sm bg-white/10 px-4 py-2 rounded-xl border border-white/10 transition-all hover:bg-white/20 mt-2">
                <UserCircle className="w-4 h-4" /> استعراض وتنسيق ملفي الشخصي (CV)
              </Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/attendance" className="px-6 py-4 bg-white/10 backdrop-blur-md rounded-2xl font-black text-white border border-white/20 hover:bg-white/20 transition-all text-center shadow-lg">رصد الحضور</Link>
            <Link href="/exams/builder/new" className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black shadow-xl hover:bg-indigo-50 transition-all text-center">إضافة اختبار</Link>
          </div>
        </div>

        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl animate-pulse"></div>
        <div className="absolute -left-20 -bottom-20 h-96 w-96 rounded-full bg-indigo-400/30 blur-[100px]"></div>
      </div>

      {/* باقي الأجزاء (الإحصائيات، الجدول، الخ) تبقى كما هي... */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* ... */}
      </div>

    </motion.div>
  );
}
