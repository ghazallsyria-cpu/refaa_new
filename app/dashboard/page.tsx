// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Users, GraduationCap, BookOpen, CalendarDays, Plus, Bell, 
  School, ArrowUpRight, Activity, FileText, Target, ShieldCheck, Loader2, Crown, Wand2, ServerCog, Clock, Save
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import AnnouncementsWidget from '@/components/AnnouncementsWidget';
import { useDashboardSystem } from '@/hooks/useDashboardSystem';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase'; 
import { cn } from '@/lib/utils'; // افتراض وجود דاله لدمج الكلاسات

// =========================================
// 🎬 إعدادات الحركات السينمائية
// =========================================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
};

// =========================================
// ⚙️ 1. مكون التبديل المركزي للجداول (Glass Toggle)
// =========================================
function ScheduleSystemToggle() {
  const [activeSystem, setActiveSystem] = useState<'manual' | 'auto'>('manual');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchCurrentSystem();
  }, []);

  const fetchCurrentSystem = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('school_settings')
        .select('active_schedule_system')
        .eq('id', 1) 
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data && data.active_schedule_system) {
        setActiveSystem(data.active_schedule_system);
      }
    } catch (error) {
      console.error('Error fetching system setting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (system: 'manual' | 'auto') => {
    if (system === activeSystem || isUpdating) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('school_settings')
        .upsert({ id: 1, active_schedule_system: system }, { onConflict: 'id' });

      if (error) throw error;
      setActiveSystem(system);
    } catch (error) {
      console.error('Error updating system:', error);
      alert('حدث خطأ أثناء تبديل النظام!');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-panel p-6 rounded-3xl w-full flex items-center justify-center min-h-[160px]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="glass-panel p-6 rounded-[2rem] w-full relative overflow-hidden group hover:border-amber-500/30 transition-all duration-500 shadow-inner">
      <div className={`absolute -top-10 -right-10 w-48 h-48 rounded-full blur-[70px] pointer-events-none transition-colors duration-1000 mix-blend-screen opacity-50 ${activeSystem === 'auto' ? 'bg-indigo-600/30' : 'bg-emerald-600/30'}`} />
      
      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-amber-500/10 backdrop-blur-md rounded-2xl border border-amber-500/20 shadow-inner">
            <ServerCog className="w-6 h-6 text-amber-400 drop-shadow-sm" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white leading-tight drop-shadow-sm">محرك الجداول المركزي</h2>
            <p className="text-xs font-bold text-slate-400 mt-1">تحديد نظام الجدول النشط للمدرسة</p>
          </div>
        </div>

        <div className="relative flex items-center bg-[#02040a]/40 backdrop-blur-sm p-1.5 rounded-[1.5rem] border border-white/5 shadow-inner mb-4">
          <button onClick={() => handleToggle('manual')} disabled={isUpdating} className={`relative flex-1 py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-300 z-10 ${activeSystem === 'manual' ? 'text-emerald-50' : 'text-slate-500 hover:text-slate-300'}`}>
            {activeSystem === 'manual' && <motion.div layoutId="active-bg" className="absolute inset-0 bg-emerald-500/20 backdrop-blur-md rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] border border-emerald-400/30" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
            <span className="relative z-20"><CalendarDays className={cn("w-6 h-6", activeSystem === 'manual' ? "text-emerald-400 drop-shadow-md" : "")} /></span>
            <span className="relative z-20 text-xs font-black">الجدول اليدوي</span>
          </button>

          <button onClick={() => handleToggle('auto')} disabled={isUpdating} className={`relative flex-1 py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-300 z-10 ${activeSystem === 'auto' ? 'text-indigo-50' : 'text-slate-500 hover:text-slate-300'}`}>
            {activeSystem === 'auto' && <motion.div layoutId="active-bg" className="absolute inset-0 bg-indigo-500/20 backdrop-blur-md rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.2)] border border-indigo-400/30" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
            <span className="relative z-20"><Wand2 className={cn("w-6 h-6", activeSystem === 'auto' ? "text-indigo-400 drop-shadow-md" : "")} /></span>
            <span className="relative z-20 text-xs font-black">الجدول الذكي (AI)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================================
// ⏱️ 2. مكون إعدادات توقيت الرادار الذكي (Glass Settings)
// =========================================
function SmartGateSettings() {
  const [settings, setSettings] = useState({ morning_start_time: '07:30', late_threshold: '07:45', absence_threshold: '08:30' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('school_settings').select('morning_start_time, late_threshold, absence_threshold').eq('id', 1).single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings({
          morning_start_time: data.morning_start_time?.slice(0, 5) || '07:30',
          late_threshold: data.late_threshold?.slice(0, 5) || '07:45',
          absence_threshold: data.absence_threshold?.slice(0, 5) || '08:30'
        });
      }
    } catch (error) { 
      console.error('Error fetching gate settings:', error); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('school_settings').upsert({
        id: 1,
        morning_start_time: `${settings.morning_start_time}:00`,
        late_threshold: `${settings.late_threshold}:00`,
        absence_threshold: `${settings.absence_threshold}:00`
      }, { onConflict: 'id' });
      
      if (error) throw error;
      alert('تم تحديث توقيتات الدوام بنجاح!');
    } catch (error) {
      alert('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="glass-panel p-6 rounded-[2rem] w-full flex items-center justify-center min-h-[250px]"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>;

  return (
    <div className="glass-panel p-6 rounded-[2rem] w-full relative overflow-hidden hover:border-amber-500/30 transition-all duration-500 shadow-inner">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[40px] pointer-events-none mix-blend-screen" />
      <div className="flex items-center gap-4 mb-6 relative z-10">
        <div className="p-3 bg-amber-500/10 backdrop-blur-md rounded-2xl border border-amber-500/20 shadow-inner">
          <Clock className="w-6 h-6 text-amber-400 drop-shadow-md" />
        </div>
        <div>
          <h2 className="text-lg font-black text-white leading-tight drop-shadow-sm">توقيتات الحرم المدرسي</h2>
          <p className="text-xs font-bold text-slate-400 mt-1">ضبط الرادار الذكي للبوابة</p>
        </div>
      </div>

      <div className="space-y-3 relative z-10">
        <div className="flex items-center justify-between gap-4 bg-[#02040a]/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 shadow-inner">
          <label className="text-xs font-black text-slate-300">بداية الدوام</label>
          <input type="time" value={settings.morning_start_time} onChange={(e) => setSettings({...settings, morning_start_time: e.target.value})} className="bg-transparent text-emerald-400 font-black border-none text-sm outline-none text-left" style={{ colorScheme: 'dark' }} />
        </div>
        <div className="flex items-center justify-between gap-4 bg-[#02040a]/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 shadow-inner">
          <label className="text-xs font-black text-slate-300">حد التأخير</label>
          <input type="time" value={settings.late_threshold} onChange={(e) => setSettings({...settings, late_threshold: e.target.value})} className="bg-transparent text-amber-400 font-black border-none text-sm outline-none text-left" style={{ colorScheme: 'dark' }} />
        </div>
        <div className="flex items-center justify-between gap-4 bg-[#02040a]/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 shadow-inner">
          <label className="text-xs font-black text-slate-300">حد الغياب</label>
          <input type="time" value={settings.absence_threshold} onChange={(e) => setSettings({...settings, absence_threshold: e.target.value})} className="bg-transparent text-rose-400 font-black border-none text-sm outline-none text-left" style={{ colorScheme: 'dark' }} />
        </div>

        <button onClick={handleSave} disabled={isSaving} className="w-full mt-4 bg-amber-500/80 backdrop-blur-md hover:bg-amber-500 text-[#02040a] py-3.5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.2)] border border-amber-400/50">
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          اعتماد التوقيتات
        </button>
      </div>
    </div>
  );
}

// =========================================
// 👑 3. اللوحة الرئيسية للإدارة (Gemini Admin Dashboard)
// =========================================
export default function AdminDashboard() {
  const { authRole, isChecking } = useAuth() as any;
  const { fetchAdminDashboardStats, fetchAdminRecentActivities, fetchTrackSelectionStats } = useDashboardSystem();
  
  const [stats, setStats] = useState([
    { name: 'إجمالي الطلاب', value: '...', icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    { name: 'إجمالي المعلمين', value: '...', icon: GraduationCap, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { name: 'إجمالي الفصول', value: '...', icon: BookOpen, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
    { name: 'حضور اليوم', value: '...', icon: CalendarDays, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  ]);
  
  const [trackStats, setTrackStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const isFetchedRef = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isChecking || isFetchedRef.current || (authRole !== 'admin' && authRole !== 'management')) return;
    isFetchedRef.current = true; 

    async function fetchDashboardStats() {
      try {
        const data = await fetchAdminDashboardStats();
        setStats([
          { name: 'إجمالي الطلاب', value: data.studentsCount.toString(), icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
          { name: 'إجمالي المعلمين', value: data.teachersCount.toString(), icon: GraduationCap, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { name: 'إجمالي الفصول', value: data.sectionsCount.toString(), icon: BookOpen, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
          { name: 'حضور اليوم', value: `${data.attendanceRate}%`, icon: CalendarDays, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
        ]);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    }

    async function fetchRecentActivities() {
      try {
        const activities = await fetchAdminRecentActivities();
        setRecentActivities(activities);
      } catch (error) { console.error(error); } finally { setActivitiesLoading(false); }
    }

    async function fetchTrackData() {
      try {
        const data = await fetchTrackSelectionStats();
        setTrackStats(data);
      } catch (error) { console.error(error); }
    }

    fetchDashboardStats(); fetchRecentActivities(); fetchTrackData();
  }, [authRole, isChecking, fetchAdminDashboardStats, fetchAdminRecentActivities, fetchTrackSelectionStats]);

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '...';
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return '...';
    const diffMins = Math.floor((new Date().getTime() - date.getTime()) / 60000);
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffMins < 1440) return `منذ ${Math.floor(diffMins / 60)} ساعة`;
    return `منذ ${Math.floor(diffMins / 1440)} يوم`;
  };

  if (isChecking) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-6">
          <div className="h-20 w-20 animate-spin rounded-full border-4 border-amber-500/20 border-t-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.3)]"></div>
          <p className="text-amber-400 font-black tracking-widest animate-pulse drop-shadow-md">تأمين غرفة العمليات...</p>
        </div>
      </div>
    );
  }

  if (authRole !== 'admin' && authRole !== 'management') {
    return (
      <div className="flex min-h-[80vh] items-center justify-center p-4 bg-transparent">
        <div className="glass-panel p-10 rounded-[2.5rem] text-center max-w-md w-full border-rose-500/30 shadow-[0_0_40px_rgba(225,29,72,0.15)]">
           <ShieldCheck className="w-20 h-20 text-rose-500 mx-auto mb-6 opacity-80 drop-shadow-md" />
           <h2 className="text-2xl font-black text-white mb-2 drop-shadow-sm">وصول مقيد</h2>
           <p className="text-slate-400 font-bold">هذه اللوحة مخصصة للقيادة العليا فقط.</p>
        </div>
      </div>
    );
  }

  // =========================================
  // 🎨 واجهة المستخدم (Bento Grid Layout - Holographic Mode)
  // =========================================
  return (
    // bg-transparent ليسمح للأجرام السماوية في layout.tsx بالظهور
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-8 pb-12 max-w-[1600px] mx-auto bg-transparent pt-2 sm:pt-6 font-sans" dir="rtl">
      
      {/* 👑 1. الترويسة الترحيبية (Hero Section - Glass) */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-[2.5rem] sm:rounded-[3rem] glass-panel p-8 sm:p-12 border-amber-500/20 group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen opacity-50 group-hover:scale-110 transition-transform duration-1000" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen opacity-50" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="space-y-6 text-center lg:text-right w-full lg:w-2/3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 backdrop-blur-md border border-amber-500/20 text-xs font-black uppercase tracking-widest text-amber-400 shadow-inner">
              <Crown className="w-4 h-4 drop-shadow-sm" /> مركز القيادة العليا
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-white drop-shadow-xl">
              منظومة <span className="text-transparent bg-clip-text bg-gradient-to-l from-amber-400 to-amber-200 drop-shadow-md">الرفعة النموذجية</span>
            </h1>
            <p className="text-slate-300 text-sm sm:text-lg font-bold max-w-2xl mx-auto lg:mx-0 leading-relaxed drop-shadow-sm opacity-90">
              تحكم كامل في سير العملية التعليمية. راقب الأداء، استعرض التقارير، وأدِر موارد المدرسة بلمسة زر واحدة من خلال هذه اللوحة الذكية.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
              <Link href="/admin/teacher-assignments" className="bg-amber-500/90 backdrop-blur-md hover:bg-amber-500 text-[#02040a] px-8 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(245,158,11,0.3)] active:scale-95 border border-amber-400/50">
                <Plus className="w-5 h-5" /> إضافة تكليفات
              </Link>
              <Link href="/reports" className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 backdrop-blur-md active:scale-95 shadow-inner">
                <Activity className="w-5 h-5 text-amber-400 drop-shadow-md" /> تقارير الأداء
              </Link>
            </div>
          </div>
          
          <div className="hidden lg:flex justify-center shrink-0">
            <motion.div initial={{ scale: 0.8, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring' }} className="h-56 w-56 rounded-full bg-[#02040a]/40 backdrop-blur-2xl border border-amber-500/30 flex items-center justify-center relative shadow-[0_0_40px_rgba(245,158,11,0.2)] group-hover:border-amber-400/50 transition-colors duration-500">
              <School className="h-24 w-24 text-amber-400 drop-shadow-[0_0_20px_rgba(245,158,11,0.6)]" />
              <div className="absolute inset-[-15px] rounded-full border border-dashed border-amber-500/30 animate-[spin_30s_linear_infinite]" />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* 📊 2. الإحصائيات السريعة (Holographic Stats) */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat) => (
          <motion.div key={stat.name} whileHover={{ y: -5 }} className="glass-panel rounded-[2rem] p-6 flex flex-col justify-between group overflow-hidden relative shadow-inner">
            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full ${stat.bg.split(' ')[0]} blur-[40px] opacity-50 mix-blend-screen transition-transform duration-700 group-hover:scale-150 pointer-events-none`} />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} border ${stat.border} shadow-inner backdrop-blur-md group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className="w-6 h-6 drop-shadow-md" />
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-[10px] sm:text-xs font-bold text-slate-300 uppercase tracking-widest opacity-80">{stat.name}</p>
              <p className="text-3xl sm:text-4xl font-black text-white mt-1 tracking-tight drop-shadow-lg">{loading ? '...' : stat.value}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* 🏗️ 3. الشبكة الرئيسية (Main Layout Grid) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* 📚 العمود الأيمن الكبير (النشاطات وتحديد المسار) */}
        <div className="xl:col-span-8 space-y-6 lg:space-y-8 w-full">
          
          {/* نتائج تحديد المسار (Glass Design) */}
          {trackStats && trackStats.total > 0 && (
            <motion.div variants={itemVariants} className="glass-panel rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden border-indigo-500/20 group shadow-inner">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none mix-blend-screen opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
              
              <div className="flex items-center gap-4 mb-8 relative z-10">
                <div className="p-3 bg-indigo-500/10 backdrop-blur-md rounded-2xl border border-indigo-500/20 shadow-inner group-hover:scale-110 transition-transform duration-300">
                  <Target className="w-6 h-6 text-indigo-400 drop-shadow-md" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white drop-shadow-md">إحصائيات تحديد المسار (عاشر)</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 relative z-10">
                <div className="bg-[#02040a]/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 hover:border-blue-500/40 transition-all shadow-inner hover:bg-white/5">
                  <p className="text-sm font-black text-blue-400 mb-2 drop-shadow-sm">المسار العلمي</p>
                  <p className="text-3xl sm:text-4xl font-black text-white drop-shadow-md">{trackStats.scientific}</p>
                </div>
                <div className="bg-[#02040a]/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 hover:border-emerald-500/40 transition-all shadow-inner hover:bg-white/5">
                  <p className="text-sm font-black text-emerald-400 mb-2 drop-shadow-sm">المسار الأدبي</p>
                  <p className="text-3xl sm:text-4xl font-black text-white drop-shadow-md">{trackStats.literary}</p>
                </div>
                <div className="bg-[#02040a]/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 hover:border-amber-500/40 transition-all shadow-inner hover:bg-white/5">
                  <p className="text-sm font-black text-slate-300 mb-2 drop-shadow-sm">إجمالي الاختيارات</p>
                  <p className="text-3xl sm:text-4xl font-black text-amber-400 drop-shadow-md">{trackStats.total}</p>
                </div>
              </div>

              <div className="mt-8 relative z-10 bg-[#02040a]/40 p-4 rounded-3xl border border-white/5 shadow-inner backdrop-blur-md">
                <div className="h-4 w-full bg-[#02040a] rounded-full overflow-hidden flex border border-white/10 shadow-inner">
                  <div className="h-full bg-blue-500/80 shadow-[0_0_10px_rgba(59,130,246,0.8)] relative" style={{ width: `${(trackStats.scientific / trackStats.total) * 100}%` }}>
                    <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" />
                  </div>
                  <div className="h-full bg-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,0.8)]" style={{ width: `${(trackStats.literary / trackStats.total) * 100}%` }} />
                </div>
                <div className="mt-3 flex justify-between text-xs font-black px-2">
                  <span className="text-blue-400 drop-shadow-sm">علمي ({Math.round((trackStats.scientific / trackStats.total) * 100)}%)</span>
                  <span className="text-emerald-400 drop-shadow-sm">أدبي ({Math.round((trackStats.literary / trackStats.total) * 100)}%)</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* آخر النشاطات (Live Pulse Window) */}
          <motion.div variants={itemVariants} className="glass-panel rounded-[2.5rem] p-6 sm:p-8 flex flex-col h-[500px] shadow-inner">
            <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-inner">
                  <Activity className="w-6 h-6 text-emerald-400 drop-shadow-md" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white drop-shadow-md">نبض المنصة المباشر</h2>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-1">مراقبة حية للنشاطات الداخلية</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {activitiesLoading ? (
                <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin drop-shadow-md" /></div>
              ) : recentActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 bg-[#02040a]/30 rounded-3xl border border-dashed border-white/10 m-2 shadow-inner">
                  <Activity className="w-12 h-12 mb-4 opacity-20" />
                  <p className="font-bold text-sm">لا يوجد نشاط مسجل اليوم</p>
                </div>
              ) : (
                recentActivities.map((activity, i) => (
                  <div key={i} className="flex items-center gap-4 sm:gap-5 p-4 sm:p-5 rounded-[1.5rem] bg-[#02040a]/40 backdrop-blur-sm border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all shadow-inner group">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-black text-lg sm:text-xl shrink-0 ${activity.color} border border-current bg-white/5 shadow-sm group-hover:scale-110 transition-transform`}>
                      {activity.title[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      {activity.teacher_id ? (
                        <Link href={`/teachers/${activity.teacher_id}`} className="text-sm sm:text-base font-black text-white hover:text-amber-400 transition-colors truncate block drop-shadow-sm">
                          {activity.title}
                        </Link>
                      ) : (
                        <p className="text-sm sm:text-base font-black text-white truncate block drop-shadow-sm">{activity.title}</p>
                      )}
                      <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-1 flex items-center gap-1.5 opacity-80">
                        <Clock className="w-3 h-3" /> {mounted ? formatTime(activity.time) : '...'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* 🛠️ العمود الأيسر (الرادار الرقمي، التبديلات، والأدوات السريعة) */}
        <div className="xl:col-span-4 space-y-6 lg:space-y-8 flex flex-col w-full">
          
          {/* الرادار الرقمي للضيوف */}
          <motion.div variants={itemVariants} className="glass-panel border-amber-500/30 rounded-[2.5rem] p-6 sm:p-8 shadow-[0_0_40px_rgba(245,158,11,0.1)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-[60px] mix-blend-screen pointer-events-none group-hover:scale-150 transition-transform duration-1000 opacity-50"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-amber-500/10 backdrop-blur-md rounded-xl border border-amber-500/20 shadow-inner">
                  <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 animate-pulse drop-shadow-md" />
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white drop-shadow-md">رادار المراقبة الحية</h2>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm mb-6 font-bold leading-relaxed opacity-90">
                متابعة الحضور المباشر للشُعب ولحظة دخول الطلاب عبر البوابات الذكية.
              </p>
              <div className="flex flex-col gap-3">
                <Link href="/admin/live-monitor" className="w-full bg-amber-500/90 backdrop-blur-md hover:bg-amber-400 text-[#02040a] py-3.5 rounded-2xl font-black transition-all text-sm flex justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-95 border border-amber-300">
                  فتح لوحة الرادار المباشر
                </Link>
                <button onClick={() => { navigator.clipboard.writeText(typeof window !== 'undefined' ? `${window.location.origin}/live` : ''); alert('تم نسخ الرابط للضيوف بنجاح!'); }} className="w-full bg-white/5 hover:bg-white/10 text-white py-3.5 rounded-2xl font-black transition-all text-sm backdrop-blur-md border border-white/10 shadow-inner active:scale-95 flex items-center justify-center gap-2">
                  <Globe className="w-4 h-4 text-slate-400" /> نسخ رابط المراقبة للضيوف
                </button>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}><ScheduleSystemToggle /></motion.div>
          <motion.div variants={itemVariants}><SmartGateSettings /></motion.div>
          <motion.div variants={itemVariants}><AnnouncementsWidget authRole="admin" /></motion.div>

          {/* إجراءات سريعة */}
          <motion.div variants={itemVariants} className="glass-panel rounded-[2.5rem] p-6 sm:p-8 shadow-inner">
            <h2 className="text-lg sm:text-xl font-black text-white mb-6 flex items-center gap-3 drop-shadow-md">
               <div className="p-2 bg-white/5 rounded-xl border border-white/10 shadow-inner"><Target className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" /></div> اختصارات سريعة
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {[
                { name: 'متابعة المعلمين', icon: Activity, href: '/admin/teachers-monitor', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                { name: 'تقارير الأداء', icon: FileText, href: '/reports', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                { name: 'أعطال النظام', icon: ServerCog, href: '/report', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
                { name: 'إضافة طالب', icon: Users, href: '/students', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
              ].map((action) => (
                <Link key={action.name} href={action.href} className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-[1.5rem] bg-[#02040a]/40 backdrop-blur-md hover:bg-white/5 border border-white/5 hover:border-white/20 transition-all group shadow-inner active:scale-95">
                  <div className={`p-3 sm:p-4 rounded-2xl ${action.bg} ${action.color} border mb-3 group-hover:scale-110 transition-transform shadow-inner`}>
                    <action.icon className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-md" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-black text-slate-300 text-center drop-shadow-sm group-hover:text-white transition-colors">{action.name}</span>
                </Link>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
}
