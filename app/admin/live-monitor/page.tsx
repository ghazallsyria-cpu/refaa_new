'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Radio, Users, Clock, TrendingUp, Activity, 
  GraduationCap, UserCheck, MonitorPlay, 
  Search, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
} from 'recharts';
import { supabase } from '@/lib/supabase';

// واجهة بيانات المستخدم المتصل
interface OnlineUser {
  user_id: string;
  name: string;
  role: string;
  metadata: string; // يحمل اسم الفصل للطالب، أو المادة للمعلم
  joined_at: string;
}

export default function LiveMonitorPage() {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'teachers' | 'students'>('all');
  
  // 🚀 حالة المتواجدين الحقيقية
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [peakUsers, setPeakUsers] = useState(0);
  const [chartData, setChartData] = useState<{ time: string, users: number }[]>([]);

  useEffect(() => {
    // 🚀 الاتصال بقناة التواجد (Presence Channel)
    const room = supabase.channel('global_online_users');

    room.on('presence', { event: 'sync' }, () => {
      const newState = room.presenceState();
      const usersArray: OnlineUser[] = [];
      
      // تجميع كل المتصلين في مصفوفة واحدة
      for (const id in newState) {
        // نأخذ أول اتصال لكل مستخدم (لتجنب التكرار إذا فتح أكثر من تبويب)
        const user = newState[id][0] as OnlineUser;
        usersArray.push(user);
      }
      
      setOnlineUsers(usersArray);
      
      // تحديث رقم الذروة
      setPeakUsers(prev => Math.max(prev, usersArray.length));

      // تحديث الرسم البياني اللحظي (كلما تغير العدد نضيف نقطة للرسم البياني)
      const now = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
      setChartData(prev => {
        const newData = [...prev, { time: now, users: usersArray.length }];
        // نحتفظ بآخر 15 نقطة فقط للرسم البياني
        return newData.slice(-15);
      });
      
      setLoading(false);
    }).subscribe();

    // تأمين ظهور الشاشة في حال لم يكن أحد متصلاً
    const timeout = setTimeout(() => setLoading(false), 2000);

    return () => {
      supabase.removeChannel(room);
      clearTimeout(timeout);
    };
  }, []);

  // 🧠 ذكاء اصطناعي لتحليل البيانات الحية
  const analytics = useMemo(() => {
    const teachers = onlineUsers.filter(u => u.role === 'teacher');
    const students = onlineUsers.filter(u => u.role === 'student');

    // حساب الفصل الأكثر نشاطاً
    const classCounts: Record<string, number> = {};
    students.forEach(s => {
      if (s.metadata) classCounts[s.metadata] = (classCounts[s.metadata] || 0) + 1;
    });
    const topClass = Object.keys(classCounts).sort((a, b) => classCounts[b] - classCounts[a])[0] || 'لا يوجد بيانات';

    // حساب المعلم الأطول تواجداً (أقدم joined_at)
    const longestTeacher = teachers.sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime())[0];

    return {
      totalOnline: onlineUsers.length,
      teachersCount: teachers.length,
      studentsCount: students.length,
      topClass: topClass,
      topTeacher: longestTeacher ? longestTeacher.name : 'لا يوجد معلم نشط',
    };
  }, [onlineUsers]);

  // الفلاتر للبحث
  const filteredUsers = onlineUsers.filter(u => 
    (activeTab === 'all' || 
    (activeTab === 'teachers' && u.role === 'teacher') || 
    (activeTab === 'students' && u.role === 'student')) &&
    (u.name.includes(searchQuery) || u.metadata?.includes(searchQuery))
  );

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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-24 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 font-cairo" dir="rtl">
      
      {/* 🚀 Hero Radar Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-[#020817] p-8 sm:p-12 text-white shadow-2xl border border-emerald-900/50">
        <div className="absolute top-1/2 left-1/4 w-[800px] h-[800px] -translate-x-1/2 -translate-y-1/2 border border-emerald-500/10 rounded-full pointer-events-none">
          <div className="absolute inset-0 border border-emerald-500/20 rounded-full scale-75"></div>
          <div className="absolute top-1/2 left-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent to-emerald-500 origin-left animate-[spin_4s_linear_infinite] opacity-50"></div>
          <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-[conic-gradient(from_0deg,transparent_0%,rgba(16,185,129,0.2)_100%)] rounded-full origin-top-left -translate-x-1/2 -translate-y-1/2 animate-[spin_4s_linear_infinite]"></div>
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center lg:text-right">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>بث حي وحقيقي 100%</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-emerald-300">
              الرادار الرقمي للمنصة
            </h1>
          </div>
          
          <div className="flex gap-4">
             <div className="text-center p-6 bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-white/5">
                <p className="text-emerald-400 text-xs font-black uppercase mb-1">المتواجدون الآن</p>
                <span className="text-6xl font-black text-white">{analytics.totalOnline}</span>
             </div>
          </div>
        </div>
      </div>

      {/* 🚀 Analytics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'الذروة الحالية', value: peakUsers, sub: 'أعلى عدد متصل معاً', icon: Clock, color: 'indigo' },
          { title: 'الفصل الأكثر نشاطاً', value: analytics.topClass, sub: 'بناءً على الطلاب المتصلين', icon: TrendingUp, color: 'amber' },
          { title: 'أقدم متصل (معلم)', value: analytics.topTeacher, sub: 'المعلم الأطول تواجداً', icon: GraduationCap, color: 'blue' },
          { title: 'الطلاب المتصلين', value: analytics.studentsCount, sub: `مقابل ${analytics.teachersCount} معلم`, icon: Zap, color: 'emerald' },
        ].map((stat, i) => (
          <div key={i} className={`bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.title}</p>
                <p className="text-xl font-black text-slate-900 truncate">{stat.value}</p>
                <p className={`text-[10px] font-bold text-${stat.color}-600 mt-1`}>{stat.sub}</p>
              </div>
              <div className={`p-3 bg-${stat.color}-50 text-${stat.color}-600 rounded-xl`}><stat.icon className="h-5 w-5" /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 🚀 Real-time Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Activity className="w-5 h-5"/></div>
            <h3 className="text-lg font-black text-slate-900">مؤشر النشاط الحي</h3>
          </div>
          <div className="flex-1 min-h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                <Tooltip contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Area type="monotone" dataKey="users" name="متصل" stroke="#10b981" strokeWidth={3} fill="url(#colorUsers)" activeDot={{r: 6, fill: '#10b981'}} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 🚀 Live Feed Column */}
        <div className="bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden flex flex-col h-[500px] lg:h-auto">
          <div className="p-5 bg-white border-b border-slate-200">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 mb-4">
              <MonitorPlay className="w-4 h-4 text-indigo-600" /> البث المباشر
            </h3>
            <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
              {['all', 'teachers', 'students'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {tab === 'all' ? 'الكل' : tab === 'teachers' ? 'المعلمين' : 'الطلاب'}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="ابحث..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2 pr-9 pl-3 text-xs font-bold outline-none" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
            <AnimatePresence>
              {filteredUsers.map((u) => (
                <motion.div key={u.user_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-black text-sm ${u.role === 'teacher' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                        {u.name.charAt(0)}
                      </div>
                      <span className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 bg-emerald-500 border border-white rounded-full"></span>
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-900 leading-tight truncate max-w-[120px]">{u.name}</p>
                      <span className="text-[9px] font-bold text-slate-400">{u.metadata || u.role}</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">الآن</span>
                </motion.div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="text-center text-slate-400 text-xs font-bold py-10">لا يوجد متصلين حالياً</div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
