'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/context/auth-context'; 
import { useQuery } from '@tanstack/react-query';
import { 
  Clock, TrendingUp, Activity, 
  GraduationCap, UserCheck, Search, ArrowRight, Loader2, RefreshCcw, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [dailyTab, setDailyTab] = useState<'all' | 'teachers' | 'students'>('all');

  // 🚀 جلب البيانات باستخدام React Query لحماية السيرفر (Caching + Stale-While-Revalidate)
  const { 
    data: dailyLogins = [], 
    isLoading, 
    isFetching, 
    refetch 
  } = useQuery({
    queryKey: ['daily-presence'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data: presenceData } = await supabase
        .from('daily_presence')
        .select('*')
        .eq('record_date', today)
        .order('last_seen', { ascending: false });

      if (!presenceData || presenceData.length === 0) return [];

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
          if (subjectName && !detailsMap.has(ts.teacher_id)) detailsMap.set(ts.teacher_id, subjectName);
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

      return enriched as DailyLogin[];
    },
    // تحديث البيانات كل 5 دقائق في الخلفية إذا كانت الصفحة مفتوحة، لمنع الضغط
    staleTime: 5 * 60 * 1000, 
    enabled: authRole === 'admin' || authRole === 'management',
  });

  // إحصائيات سريعة
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

  // الفلترة
  const filteredDailyLogins = dailyLogins.filter(u => 
    (dailyTab === 'all' || 
    (dailyTab === 'teachers' && u.role === 'teacher') || 
    (dailyTab === 'students' && u.role === 'student')) &&
    (u.full_name.includes(searchQuery) || u.detail?.includes(searchQuery))
  );

  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (authRole !== 'admin' && authRole !== 'management') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-10 rounded-[2.5rem] text-center max-w-md w-full border border-rose-200 shadow-xl">
           <ShieldCheck className="w-16 h-16 text-rose-500 mx-auto mb-6 opacity-80" />
           <h2 className="text-2xl font-black text-slate-800 mb-2">وصول مقيد</h2>
           <p className="text-slate-500 font-bold">هذه الصفحة مخصصة للإدارة المدرسية فقط.</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-cairo pt-8" dir="rtl">
      
      {/* هيدر الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-3 bg-slate-50 text-slate-500 hover:text-indigo-600 rounded-xl shadow-sm border border-slate-200 transition-all">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              سجل نشاط المنصة <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs rounded-full border border-indigo-100 uppercase tracking-widest">مباشر</span>
            </h1>
            <p className="text-slate-500 font-bold mt-1">يعرض جميع الدخولات الموثقة لليوم بشكل خفيف وآمن.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center px-6 border-l border-slate-200">
             <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">إجمالي الدخول</p>
             <p className="text-3xl font-black text-indigo-600">{analytics.totalToday}</p>
          </div>
          <button onClick={() => refetch()} disabled={isFetching} className="p-4 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 rounded-2xl transition-all shadow-sm border border-slate-200 active:scale-95 disabled:opacity-50">
             <RefreshCcw className={`w-5 h-5 ${isFetching ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { title: 'الطلاب النشطين اليوم', value: analytics.studentsCount, icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { title: 'المعلمين المتصلين', value: analytics.teachersCount, icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { title: 'الفصل الأكثر تفاعلاً', value: analytics.topClass, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all hover:border-indigo-100">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{stat.title}</p>
              <p className="text-2xl font-black text-slate-800 truncate">{stat.value}</p>
            </div>
            <div className={`p-4 ${stat.bg} ${stat.color} ${stat.border} rounded-2xl border shadow-inner group-hover:scale-110 transition-transform`}>
              <stat.icon className="h-6 w-6" />
            </div>
          </div>
        ))}
      </div>

      {/* جدول البيانات */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-6 sm:p-8">
         <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
            <div className="flex items-center gap-3">
               <div className="p-3 bg-slate-50 text-slate-600 rounded-xl border border-slate-200"><Activity className="w-5 h-5"/></div>
               <h3 className="text-xl font-black text-slate-800">السجل المفصل</h3>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-200 shrink-0">
                 {['all', 'teachers', 'students'].map((tab) => (
                    <button key={tab} onClick={() => setDailyTab(tab as any)} className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${dailyTab === tab ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                       {tab === 'all' ? 'الكل' : tab === 'teachers' ? 'المعلمين' : 'الطلاب'}
                    </button>
                 ))}
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="بحث بالاسم أو الفصل..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2.5 pr-9 pl-4 text-xs font-bold outline-none focus:border-indigo-400 focus:bg-white transition-colors" />
              </div>
            </div>
         </div>

         {isLoading ? (
           <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>
         ) : (
           <div className="overflow-x-auto rounded-2xl border border-slate-100">
             <table className="w-full text-right border-collapse whitespace-nowrap">
               <thead>
                 <tr className="bg-slate-50 border-b border-slate-100">
                   <th className="p-4 font-black text-slate-400 text-[10px] uppercase tracking-widest w-1/3">المستخدم</th>
                   <th className="p-4 font-black text-slate-400 text-[10px] uppercase tracking-widest w-1/4">التصنيف</th>
                   <th className="p-4 font-black text-slate-400 text-[10px] uppercase tracking-widest w-1/4">الفصل / التخصص</th>
                   <th className="p-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">توقيت الدخول</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {filteredDailyLogins.map(u => (
                   <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                     <td className="p-4">
                       <div className="flex items-center gap-3">
                         <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-black text-xs shadow-inner border ${u.role === 'teacher' ? 'bg-blue-50 text-blue-600 border-blue-100' : u.role === 'student' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                           {u.full_name.charAt(0)}
                         </div>
                         <span className="font-bold text-sm text-slate-800">{u.full_name}</span>
                       </div>
                     </td>
                     <td className="p-4">
                        <span className={`px-3 py-1 text-[9px] font-black rounded-full border ${u.role === 'teacher' ? 'bg-blue-50 text-blue-600 border-blue-100' : u.role === 'student' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                           {u.role === 'teacher' ? 'معلم' : u.role === 'student' ? 'طالب' : 'إدارة'}
                        </span>
                     </td>
                     <td className="p-4 font-bold text-slate-500 text-xs">{u.detail}</td>
                     <td className="p-4 font-black text-slate-600 text-xs" dir="ltr">
                        {new Date(u.last_seen).toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'})}
                     </td>
                   </tr>
                 ))}
                 {filteredDailyLogins.length === 0 && (
                   <tr><td colSpan={4} className="p-10 text-center text-slate-400 font-bold text-sm">لا يوجد سجلات مطابقة.</td></tr>
                 )}
               </tbody>
             </table>
           </div>
         )}
      </div>

    </motion.div>
  );
}
