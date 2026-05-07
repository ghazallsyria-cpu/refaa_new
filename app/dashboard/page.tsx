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

// =========================================
// 🎬 إعدادات الحركات السينمائية (Framer Motion Variants)
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
// ⚙️ 1. مكون التبديل المركزي للجداول (Schedule System Toggle)
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

      // 🛡️ حماية ضد خطأ 404 (PGRST116): إذا لم تكن الإعدادات موجودة بعد، لا تكسر الواجهة
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
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="glass-panel p-6 rounded-[2rem] w-full relative overflow-hidden group hover:border-amber-500/30 transition-all duration-500">
      {/* تأثير الإضاءة الخلفية الديناميكية */}
      <div className={`absolute -top-10 -right-10 w-48 h-48 rounded-full blur-[70px] pointer-events-none transition-colors duration-1000 ${activeSystem === 'auto' ? 'bg-indigo-600/20' : 'bg-emerald-600/20'}`} />
      
      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-[#02040a]/80 rounded-2xl border border-white/5 shadow-inner">
            <ServerCog className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white leading-tight">محرك الجداول المركزي</h2>
            <p className="text-xs font-bold text-slate-400 mt-1">تحديد نظام الجدول النشط للمدرسة</p>
          </div>
        </div>

        <div className="relative flex items-center bg-[#02040a]/80 p-1.5 rounded-[1.5rem] border border-white/5 shadow-inner mb-4">
          <button onClick={() => handleToggle('manual')} disabled={isUpdating} className={`relative flex-1 py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-300 z-10 ${activeSystem === 'manual' ? 'text-emerald-50' : 'text-slate-500 hover:text-slate-300'}`}>
            {activeSystem === 'manual' && <motion.div layoutId="active-bg" className="absolute inset-0 bg-emerald-600 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-400/50" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
            <span className="relative z-20"><CalendarDays className="w-6 h-6" /></span>
            <span className="relative z-20 text-xs font-black">الجدول اليدوي</span>
          </button>

          <button onClick={() => handleToggle('auto')} disabled={isUpdating} className={`relative flex-1 py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-300 z-10 ${activeSystem === 'auto' ? 'text-indigo-50' : 'text-slate-500 hover:text-slate-300'}`}>
            {activeSystem === 'auto' && <motion.div layoutId="active-bg" className="absolute inset-0 bg-indigo-600 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] border border-indigo-400/50" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
            <span className="relative z-20"><Wand2 className="w-6 h-6" /></span>
            <span className="relative z-20 text-xs font-black">الجدول الذكي (AI)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================================
// ⏱️ 2. مكون إعدادات توقيت الرادار الذكي (Smart Gate Settings)
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
      
      // 🛡️ إصلاح خطأ 404 (PGRST116): السماح بمرور الخطأ إذا كانت القاعدة جديدة لتجنب كسر الواجهة
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
    <div className="glass-panel p-6 rounded-[2rem] w-full relative overflow-hidden hover:border-amber-500/30 transition-all duration-500">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
          <Clock className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-black text-white leading-tight">توقيتات الحرم المدرسي</h2>
          <p className="text-xs font-bold text-slate-400 mt-1">ضبط الرادار الذكي للبوابة</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4 bg-[#02040a]/60 p-4 rounded-2xl border border-white/5">
          <label className="text-xs font-black text-slate-300">بداية الدوام</label>
          <input type="time" value={settings.morning_start_time} onChange={(e) => setSettings({...settings, morning_start_time: e.target.value})} className="bg-transparent text-emerald-400 font-black border-none text-sm outline-none text-left" />
        </div>
        <div className="flex items-center justify-between gap-4 bg-[#02040a]/60 p-4 rounded-2xl border border-white/5">
          <label className="text-xs font-black text-slate-300">حد التأخير</label>
          <input type="time" value={settings.late_threshold} onChange={(e) => setSettings({...settings, late_threshold: e.target.value})} className="bg-transparent text-amber-400 font-black border-none text-sm outline-none text-left" />
        </div>
        <div className="flex items-center justify-between gap-4 bg-[#02040a]/60 p-4 rounded-2xl border border-white/5">
          <label className="text-xs font-black text-slate-300">حد الغياب</label>
          <input type="time" value={settings.absence_threshold} onChange={(e) => setSettings({...settings, absence_threshold: e.target.value})} className="bg-transparent text-rose-400 font-black border-none text-sm outline-none text-left" />
        </div>

        <button onClick={handleSave} disabled={isSaving} className="w-full mt-4 bg-amber-500 hover:bg-amber-400 text-[#02040a] py-3.5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          اعتماد التوقيتات
        </button>
      </div>
    </div>
  );
}

// =========================================
// 👑 3. اللوحة الرئيسية للإدارة (Admin Dashboard Layout)
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

  // 🛡️ شاشات الحماية والتحميل
  if (isChecking) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="h-20 w-20 animate-spin rounded-full border-4 border-amber-500/20 border-t-amber-500"></div>
          <p className="text-amber-500 font-black tracking-widest animate-pulse">تأمين الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (authRole !== 'admin' && authRole !== 'management') {
    return (
      <div className="flex min-h-[80vh] items-center justify-center p-4">
        <div className="glass-panel p-10 rounded-[2.5rem] text-center max-w-md w-full border-rose-500/30">
           <ShieldCheck className="w-20 h-20 text-rose-500 mx-auto mb-6 opacity-80" />
           <h2 className="text-2xl font-black text-white mb-2">وصول مقيد</h2>
           <p className="text-slate-400 font-bold">هذه اللوحة مخصصة للقيادة العليا فقط.</p>
        </div>
      </div>
    );
  }

  // =========================================
  // 🎨 واجهة المستخدم (Bento Grid Layout)
  // =========================================
  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-8 pb-12 max-w-[1600px] mx-auto" dir="rtl">
      
      {/* 👑 1. الترويسة الترحيبية (Hero Section) */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-[2.5rem] glass-panel p-8 sm:p-12 border-white/10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="space-y-6 text-center lg:text-right w-full lg:w-2/3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-black uppercase tracking-widest text-amber-400">
              <Crown className="w-4 h-4" /> مركز القيادة العليا
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-white">
              منظومة <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">الرفعة النموذجية</span>
            </h1>
            <p className="text-slate-400 text-base sm:text-lg font-bold max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              تحكم كامل في سير العملية التعليمية. راقب الأداء، استعرض التقارير، وأدِر موارد المدرسة بلمسة زر واحدة من خلال هذه اللوحة الذكية.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
              <Link href="/admin/teacher-assignments" className="bg-amber-500 hover:bg-amber-400 text-[#02040a] px-8 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(245,158,11,0.3)] active:scale-95">
                <Plus className="w-5 h-5" /> إضافة تكليفات
              </Link>
              <Link href="/reports" className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 backdrop-blur-md active:scale-95">
                <Activity className="w-5 h-5 text-amber-400" /> تقارير الأداء
              </Link>
            </div>
          </div>
          
          <div className="hidden lg:flex justify-center shrink-0">
            <motion.div initial={{ scale: 0.8, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring' }} className="h-56 w-56 rounded-full bg-[#02040a]/80 backdrop-blur-3xl border border-amber-500/30 flex items-center justify-center relative shadow-[0_0_50px_rgba(245,158,11,0.2)]">
              <School className="h-24 w-24 text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
              <div className="absolute inset-[-15px] rounded-full border border-dashed border-amber-500/30 animate-[spin_20s_linear_infinite]" />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* 📊 2. الإحصائيات السريعة (Stats Bento Grid) */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat) => (
          <motion.div key={stat.name} whileHover={{ y: -5 }} className="glass-panel rounded-[2rem] p-6 flex flex-col justify-between group overflow-hidden relative">
            <div className={`absolute -bottom-10 -left-10 w-32 h-32 rounded-full ${stat.bg} blur-3xl opacity-0 group-hover:opacity-50 transition-opacity`} />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} ${stat.border} border shadow-inner`}>
                <stat.icon className="w-6 h-6 drop-shadow-md" />
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{stat.name}</p>
              <p className="text-4xl font-black text-white mt-2 tracking-tight">{loading ? '...' : stat.value}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* 🏗️ 3. الشبكة الرئيسية (Main Layout Grid) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* 📚 العمود الأيمن الكبير (النشاطات وتحديد المسار) */}
        <div className="xl:col-span-8 space-y-6 lg:space-y-8">
          
          {/* نتائج تحديد المسار */}
          {trackStats && trackStats.total > 0 && (
            <motion.div variants={itemVariants} className="glass-panel rounded-[2.5rem] p-8 relative overflow-hidden border-indigo-500/20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
              <div className="flex items-center gap-4 mb-8 relative z-10">
                <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                  <Target className="w-6 h-6 text-indigo-400" />
                </div>
                <h2 className="text-2xl font-black text-white">إحصائيات تحديد المسار (عاشر)</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10">
                <div className="bg-[#02040a]/60 p-6 rounded-[2rem] border border-blue-500/20 hover:border-blue-500/50 transition-colors">
                  <p className="text-sm font-black text-blue-400 mb-2">المسار العلمي</p>
                  <p className="text-4xl font-black text-white">{trackStats.scientific}</p>
                </div>
                <div className="bg-[#02040a]/60 p-6 rounded-[2rem] border border-emerald-500/20 hover:border-emerald-500/50 transition-colors">
                  <p className="text-sm font-black text-emerald-400 mb-2">المسار الأدبي</p>
                  <p className="text-4xl font-black text-white">{trackStats.literary}</p>
                </div>
                <div className="bg-[#02040a]/60 p-6 rounded-[2rem] border border-white/5">
                  <p className="text-sm font-black text-slate-400 mb-2">إجمالي الاختيارات</p>
                  <p className="text-4xl font-black text-amber-400">{trackStats.total}</p>
                </div>
              </div>

              <div className="mt-8 relative z-10">
                <div className="h-4 w-full bg-[#02040a] rounded-full overflow-hidden flex border border-white/5">
                  <div className="h-full bg-blue-500 relative" style={{ width: `${(trackStats.scientific / trackStats.total) * 100}%` }}>
                    <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" />
                  </div>
                  <div className="h-full bg-emerald-500" style={{ width: `${(trackStats.literary / trackStats.total) * 100}%` }} />
                </div>
                <div className="mt-3 flex justify-between text-xs font-black">
                  <span className="text-blue-400">علمي ({Math.round((trackStats.scientific / trackStats.total) * 100)}%)</span>
                  <span className="text-emerald-400">أدبي ({Math.round((trackStats.literary / trackStats.total) * 100)}%)</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* آخر النشاطات */}
          <motion.div variants={itemVariants} className="glass-panel rounded-[2.5rem] p-8 flex flex-col h-[500px]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-black text-white">نبض المنصة المباشر</h2>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4" style={{ scrollbarWidth: 'thin' }}>
              {activitiesLoading ? (
                <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-slate-500 animate-spin" /></div>
              ) : recentActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <Activity className="w-12 h-12 mb-4 opacity-20" />
                  <p className="font-bold">لا يوجد نشاط مسجل اليوم</p>
                </div>
              ) : (
                recentActivities.map((activity, i) => (
                  <div key={i} className="flex items-center gap-5 p-5 rounded-[2rem] bg-[#02040a]/40 border border-white/5 hover:bg-white/5 transition-colors">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 ${activity.color} border border-current bg-black/20`}>
                      {activity.title[0]}
                    </div>
                    <div className="flex-1">
                      {activity.teacher_id ? (
                        <Link href={`/teachers/${activity.teacher_id}`} className="text-base font-black text-white hover:text-amber-400 transition-colors">
                          {activity.title}
                        </Link>
                      ) : (
                        <p className="text-base font-black text-white">{activity.title}</p>
                      )}
                      <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-2">
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
        <div className="xl:col-span-4 space-y-6 lg:space-y-8 flex flex-col">
          
          {/* الرادار الرقمي للضيوف */}
          <motion.div variants={itemVariants} className="bg-gradient-to-br from-amber-500/20 to-[#02040a] rounded-[2.5rem] p-8 border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.1)] relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="w-6 h-6 text-amber-400 animate-pulse" />
                <h2 className="text-xl font-black text-amber-500">رادار الإدارة المباشر</h2>
              </div>
              <p className="text-slate-300 text-sm mb-6 font-bold leading-relaxed">
                رابط للمشرفين لمتابعة الحضور المباشر للشُعب بدون الحاجة لحساب.
              </p>
              <div className="flex flex-col gap-3">
                <button onClick={() => { navigator.clipboard.writeText(typeof window !== 'undefined' ? `${window.location.origin}/live` : ''); alert('تم نسخ الرابط بنجاح!'); }} className="w-full bg-white/10 hover:bg-white/20 text-white py-3.5 rounded-2xl font-black transition-all text-sm backdrop-blur-md border border-white/10">
                  نسخ رابط الضيوف
                </button>
                <Link href="/admin/live-monitor" className="w-full bg-amber-500 hover:bg-amber-400 text-[#02040a] py-3.5 rounded-2xl font-black transition-all text-sm flex justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                  فتح لوحة المراقبة الداخلية
                </Link>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}><ScheduleSystemToggle /></motion.div>
          <motion.div variants={itemVariants}><SmartGateSettings /></motion.div>
          <motion.div variants={itemVariants}><AnnouncementsWidget authRole="admin" /></motion.div>

          {/* إجراءات سريعة */}
          <motion.div variants={itemVariants} className="glass-panel rounded-[2.5rem] p-8">
            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3">
               <Target className="w-5 h-5 text-amber-500" /> اختصارات سريعة
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: 'متابعة المعلمين', icon: Activity, href: '/admin/teachers-monitor', color: 'text-amber-400', bg: 'bg-amber-500/10' },
                { name: 'تقارير الأداء', icon: FileText, href: '/reports', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { name: 'أعطال النظام', icon: ServerCog, href: '/report', color: 'text-rose-400', bg: 'bg-rose-500/10' },
                { name: 'إضافة طالب', icon: Users, href: '/students', color: 'text-purple-400', bg: 'bg-purple-500/10' },
              ].map((action) => (
                <Link key={action.name} href={action.href} className="flex flex-col items-center justify-center p-5 rounded-[2rem] bg-[#02040a]/60 hover:bg-white/5 border border-white/5 hover:border-amber-500/30 transition-all group">
                  <div className={`p-4 rounded-2xl ${action.bg} ${action.color} mb-3 group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-black text-slate-300 text-center">{action.name}</span>
                </Link>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
}
