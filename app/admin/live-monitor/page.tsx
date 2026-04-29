'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/auth-context'; 
import { 
  Radio, Clock, TrendingUp, Activity, 
  GraduationCap, UserCheck, MonitorPlay, 
  Search, Zap, ArrowRight, Loader2, RefreshCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

// واجهة السجل اليومي الخفيف
interface DailyLogin {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  last_seen: string;
  detail: string; 
}

export default function LiveMonitorPage() {
  const { authRole, isChecking } = useAuth(); 

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // حالات السجل اليومي
  const [dailyLogins, setDailyLogins] = useState<DailyLogin[]>([]);
  const [dailyTab, setDailyTab] = useState<'all' | 'teachers' | 'students'>('all');

  // جلب السجل اليومي (مكتوبة بشكل خفيف Bulk Fetching لمرة واحدة)
  const fetchDailyLogins = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: presenceData } = await supabase
        .from('daily_presence')
        .select('*')
        .eq('record_date', today)
        .order('last_seen', { ascending: false });

      if (presenceData && presenceData.length > 0) {
         const detailsMap = new Map<string, string>();

         // جلب تفاصيل الطلاب دفعة واحدة
         const studentIds = presenceData.filter(p => p.role === 'student').map(p => p.user_id);
         if (studentIds.length > 0) {
            const { data: stData } = await supabase.from('students').select('id, sections(name, classes(name))').in('id', studentIds);
            stData?.forEach(st => {
               if (st.sections) {
                  const className = (st.sections as any).classes?.name || (st.sections as any).class?.name || '';
                  const secName = (st.sections as any).name || '';
                  detailsMap.set(st.id, className ? `${className} - ${secName}` : secName);
               }
            });
         }

         // جلب تفاصيل المعلمين دفعة واحدة
         const teacherIds = presenceData.filter(p => p.role === 'teacher').map(p => p.user_id);
         if (teacherIds.length > 0) {
            const { data: tsData } = await supabase.from('teacher_subjects').select('teacher_id, subjects(name)').in('teacher_id', teacherIds);
            tsData?.forEach((ts: any) => {
               const subjectName = Array.isArray(ts.subjects) ? ts.subjects[0]?.name : ts.subjects?.name;
               if (subjectName && !detailsMap.has(ts.teacher_id)) {
                  detailsMap.set(ts.teacher_id, subjectName);
               }
            });
            const missing = teacherIds.filter(id => !detailsMap.has(id));
            if (missing.length > 0) {
               const { data: tData } = await supabase.from('teachers').select('id, specialization').in('id', missing);
               tData?.forEach(t => { if(t.specialization) detailsMap.set(t.id, t.specialization); });
            }
         }

         const enriched = presenceData.map(p => ({
            ...p,
            detail: detailsMap.get(p.user_id) || (p.role === 'teacher' ? 'معلم عام' : p.role === 'student' ? 'بدون فصل' : 'إدارة')
         }));
         setDailyLogins(enriched);
      } else {
         setDailyLogins([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authRole !== 'admin' && authRole !== 'management') return;
    // يتم التنفيذ مرة واحدة فقط عند فتح الصفحة (لا يوجد WebSockets ولا Interval)
    fetchDailyLogins();
  }, [fetchDailyLogins, authRole]);

  // إحصائيات مبنية على السجل اليومي فقط 
  const analytics = useMemo(() => {
    const teachers = dailyLogins.filter(u => u.role === 'teacher');
    const students = dailyLogins.filter(u => u.role === 'student');

    const classCounts: Record<string, number> = {};
    students.forEach(s => {
      if (s.detail && s.detail !== 'بدون فصل') classCounts[s.detail] = (classCounts[s.detail] || 0) + 1;
    });
    const topClass = Object.keys(classCounts).sort((a, b) => classCounts[b] - classCounts[a])[0] || 'لا يوجد بيانات';

    return {
      totalToday: dailyLogins.length,
      teachersCount: teachers.length,
      studentsCount: students.length,
      topClass: topClass,
    };
  }, [dailyLogins]);

  // فلترة حسب التبويب والبحث
  const filteredDailyLogins = dailyLogins.filter(u => 
    (dailyTab === 'all' || 
    (dailyTab === 'teachers' && u.role === 'teacher') || 
    (dailyTab === 'students' && u.role === 'student')) &&
    (u.full_name.includes(searchQuery) || u.detail?.includes(searchQuery))
  );

  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020817]">
        <div className="relative flex flex-col items-center gap-6">
          <div className="absolute inset-0 bg-emerald-500/20 blur-[50px] rounded-full animate-pulse"></div>
          <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
          <p className="text-emerald-400 font-mono text-xs uppercase tracking-widest">AUTHENTICATING...</p>
        </div>
      </div>
    );
  }

  if (authRole !== 'admin' && authRole !== 'management') {
    return <div className="p-10 text-center font-bold text-rose-600 min-h-screen flex items-center justify-center bg-slate-50">هذه الصفحة مخصصة لفريق الإدارة فقط.</div>;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020817]">
        <div className="relative flex flex-col items-center gap-6">
          <div className="absolute inset-0 bg-emerald-500/20 blur-[50px] rounded-full animate-pulse"></div>
          <Radio className="w-16 h-16 text-emerald-500 animate-ping" />
          <p className="text-emerald-400 font-mono text-xs uppercase tracking-widest">CONNECTING TO PRESENCE NETWORK...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-cairo pt-6" dir="rtl">
      
      <div className="mb-2">
        <Link href="/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 font-bold bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-sm border border-slate-200 transition-all w-fit group">
          <ArrowRight className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> العودة للوحة الإدارة
        </Link>
      </div>

      <div className="relative overflow-hidden rounded-[2.5rem] bg-[#020817] p-8 sm:p-12 text-white shadow-2xl border border-emerald-900/50">
        <div className="absolute top-1/2 left-1/4 w-[800px] h-[800px] -translate-x-1/2 -translate-y-1/2 border border-emerald-500/10 rounded-full pointer-events-none">
          <div className="absolute inset-0 border border-emerald-500/20 rounded-full scale-75"></div>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-right w-full">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest backdrop-blur-sm">
              <Clock className="w-3 h-3" /> سجل اليوم
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-emerald-300">
              سجل نشاط المنصة
            </h1>
            <p className="text-emerald-100/70 font-bold text-sm max-w-lg">يعرض هذا السجل كل من قام بتسجيل الدخول إلى المنصة خلال هذا اليوم. اضغط على تحديث لجلب أحدث البيانات دون إرهاق السيرفر.</p>
          </div>
          
          <div className="flex gap-4 shrink-0">
             <div className="text-center p-6 bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-white/5">
                <p className="text-emerald-400 text-xs font-black uppercase mb-1">دخول اليوم</p>
                <span className="text-6xl font-black text-white">{analytics.totalToday}</span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: 'الطلاب النشطين اليوم', value: analytics.studentsCount, icon: GraduationCap, color: 'emerald' },
          { title: 'المعلمين المتصلين', value: analytics.teachersCount, icon: UserCheck, color: 'indigo' },
          { title: 'الفصل الأكثر تفاعلاً', value: analytics.topClass, icon: TrendingUp, color: 'amber' },
        ].map((stat, i) => (
          <div key={i} className={`bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.title}</p>
                <p className="text-xl font-black text-slate-900 truncate">{stat.value}</p>
              </div>
              <div className={`p-3 bg-${stat.color}-50 text-${stat.color}-600 rounded-xl`}><stat.icon className="h-5 w-5" /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-6 sm:p-8 mt-6">
         <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-4">
               <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-sm"><Activity className="w-7 h-7"/></div>
               <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">سجل التواجد المفصل</h3>
                  <p className="text-sm font-bold text-slate-500 mt-1">يتم ترتيبه من الأحدث إلى الأقدم</p>
               </div>
            </div>
            <div className="flex gap-2">
                <button onClick={fetchDailyLogins} disabled={isRefreshing} className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 rounded-xl font-black text-sm transition-colors active:scale-95 disabled:opacity-50">
                    <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} /> {isRefreshing ? 'جاري التحديث...' : 'تحديث القائمة'}
                </button>
            </div>
         </div>

         <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-100 w-full md:w-auto shrink-0">
               {['all', 'teachers', 'students'].map((tab) => (
                  <button key={tab} onClick={() => setDailyTab(tab as any)} className={`flex-1 md:flex-none px-6 py-2.5 text-xs font-black rounded-lg transition-all ${dailyTab === tab ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                     {tab === 'all' ? 'الكل' : tab === 'teachers' ? 'المعلمين' : 'الطلاب'} 
                     <span className="opacity-60 mr-1">
                        ({tab === 'all' ? dailyLogins.length : dailyLogins.filter(u => u.role === (tab === 'teachers' ? 'teacher' : 'student')).length})
                     </span>
                  </button>
               ))}
            </div>
            
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="ابحث بالاسم أو الفصل..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2.5 pr-9 pl-3 text-sm font-bold outline-none focus:border-indigo-400 focus:bg-white transition-colors shadow-inner" />
            </div>
         </div>

         <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-slate-50/30">
           <table className="w-full text-right border-collapse whitespace-nowrap">
             <thead>
               <tr className="bg-slate-50 border-b border-slate-100">
                 <th className="p-4 font-black text-slate-500 text-xs uppercase tracking-widest w-1/3">المستخدم</th>
                 <th className="p-4 font-black text-slate-500 text-xs uppercase tracking-widest w-1/4">التصنيف</th>
                 <th className="p-4 font-black text-slate-500 text-xs uppercase tracking-widest w-1/4">الفصل / التخصص</th>
                 <th className="p-4 font-black text-slate-500 text-xs uppercase tracking-widest">توقيت الدخول اليوم</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {filteredDailyLogins.map(u => (
                 <tr key={u.id} className="hover:bg-white transition-colors group bg-white/50">
                   <td className="p-4">
                     <div className="flex items-center gap-3">
                       <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm ${u.role === 'teacher' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : u.role === 'student' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                         {u.full_name.charAt(0)}
                       </div>
                       <span className="font-bold text-slate-800">{u.full_name}</span>
                     </div>
                   </td>
                   <td className="p-4">
                      <span className={`px-3 py-1.5 text-[10px] font-black rounded-full border ${u.role === 'teacher' ? 'bg-blue-50 text-blue-600 border-blue-100' : u.role === 'student' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                         {u.role === 'teacher' ? 'معلم' : u.role === 'student' ? 'طالب' : 'إدارة'}
                      </span>
                   </td>
                   <td className="p-4 font-bold text-slate-600 text-sm">{u.detail}</td>
                   <td className="p-4 font-bold text-slate-500 text-sm" dir="ltr">
                      {new Date(u.last_seen).toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'})}
                   </td>
                 </tr>
               ))}
               {filteredDailyLogins.length === 0 && (
                 <tr><td colSpan={4} className="p-12 text-center text-slate-400 font-bold text-sm bg-white">لا يوجد سجلات مطابقة.</td></tr>
               )}
             </tbody>
           </table>
         </div>
      </div>

    </motion.div>
  );
}
