'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Radio, Users, Clock, TrendingUp, Activity, 
  GraduationCap, UserCheck, MonitorPlay, 
  Search, ShieldCheck, Zap, Laptop
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
} from 'recharts';
import Image from 'next/image';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

// 🚀 بيانات محاكاة ذكية للرادار (في الإنتاج، سيتم ربطها بـ Supabase Realtime أو Last Active)
const MOCK_ONLINE_USERS = {
  peakTime: "10:30 صباحاً",
  peakCount: 412,
  topClass: "العاشر - أ",
  topTeacher: "أحمد عبدالله (رياضيات)",
  chartData: [
    { time: '08:00', users: 45 }, { time: '09:00', users: 120 },
    { time: '10:00', users: 380 }, { time: '11:00', users: 412 },
    { time: '12:00', users: 290 }, { time: '13:00', users: 150 },
    { time: '14:00', users: 80 }
  ],
  teachers: [
    { id: 1, name: 'أحمد عبدالله', subject: 'رياضيات', activeNow: true, lastSeen: 'الآن' },
    { id: 2, name: 'سارة محمد', subject: 'لغة عربية', activeNow: true, lastSeen: 'الآن' },
    { id: 3, name: 'خالد يوسف', subject: 'فيزياء', activeNow: false, lastSeen: 'منذ 5 دقائق' },
    { id: 4, name: 'نورة السالم', subject: 'كيمياء', activeNow: true, lastSeen: 'الآن' },
    { id: 5, name: 'عمر فهد', subject: 'حاسب آلي', activeNow: false, lastSeen: 'منذ 12 دقيقة' },
  ],
  students: Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    name: `طالب افتراضي ${i + 1}`,
    className: ['العاشر - أ', 'الحادي عشر - ب', 'الثاني عشر - ج'][Math.floor(Math.random() * 3)],
    activeNow: Math.random() > 0.3,
    lastSeen: Math.random() > 0.3 ? 'الآن' : `منذ ${Math.floor(Math.random() * 15) + 1} دقيقة`
  })).sort((a, b) => (a.activeNow === b.activeNow) ? 0 : a.activeNow ? -1 : 1)
};

export default function LiveMonitorPage() {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'teachers' | 'students'>('all');

  useEffect(() => {
    // محاكاة جلب البيانات الحية
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const filteredTeachers = MOCK_ONLINE_USERS.teachers.filter(t => t.name.includes(searchQuery) || t.subject.includes(searchQuery));
  const filteredStudents = MOCK_ONLINE_USERS.students.filter(s => s.name.includes(searchQuery) || s.className.includes(searchQuery));

  const totalOnlineNow = MOCK_ONLINE_USERS.teachers.filter(t => t.activeNow).length + MOCK_ONLINE_USERS.students.filter(s => s.activeNow).length;

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="relative flex flex-col items-center gap-6">
          <div className="absolute inset-0 bg-emerald-500/20 blur-[50px] rounded-full animate-pulse"></div>
          <div className="relative flex items-center justify-center w-24 h-24 rounded-full border-4 border-emerald-500/30">
            <div className="absolute w-full h-full border-t-4 border-emerald-500 rounded-full animate-spin"></div>
            <Radio className="w-10 h-10 text-emerald-500 animate-pulse" />
          </div>
          <p className="text-slate-500 font-black tracking-widest uppercase text-lg">جاري مسح الحرم الرقمي...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 sm:space-y-8 pb-24 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 font-cairo" dir="rtl">
      
      {/* 🚀 Hero Radar Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] sm:rounded-[3rem] bg-[#020817] p-8 sm:p-12 text-white shadow-2xl border border-emerald-900/50">
        
        {/* Radar Sweeping Animation Background */}
        <div className="absolute top-1/2 left-1/4 w-[800px] h-[800px] -translate-x-1/2 -translate-y-1/2 border border-emerald-500/10 rounded-full pointer-events-none">
          <div className="absolute inset-0 border border-emerald-500/20 rounded-full scale-75"></div>
          <div className="absolute inset-0 border border-emerald-500/30 rounded-full scale-50"></div>
          <div className="absolute top-1/2 left-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent to-emerald-500 origin-left animate-[spin_4s_linear_infinite] opacity-50"></div>
          <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-[conic-gradient(from_0deg,transparent_0%,rgba(16,185,129,0.2)_100%)] rounded-full origin-top-left -translate-x-1/2 -translate-y-1/2 animate-[spin_4s_linear_infinite]"></div>
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest backdrop-blur-sm shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>بث حي ومباشر</span>
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-emerald-300 drop-shadow-lg">
              الرادار الرقمي للمنصة
            </h1>
            <p className="text-slate-400 text-sm sm:text-base lg:text-lg font-bold max-w-2xl leading-relaxed">
              شاشة مراقبة حية تعرض لك المتواجدين في النظام في هذه اللحظة، مع تحليلات ذكية لأوقات الذروة والفئات الأكثر نشاطاً.
            </p>
          </div>
          
          <div className="flex items-center justify-center p-8 bg-slate-900/50 backdrop-blur-xl rounded-[2rem] border border-white/5 shadow-2xl shrink-0">
            <div className="text-center">
              <p className="text-emerald-400 text-sm font-black tracking-widest uppercase mb-2">المتواجدون الآن</p>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-6xl sm:text-7xl font-black text-white drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]">{totalOnlineNow}</span>
                <span className="text-xl text-slate-500 font-bold">مستخدم</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 Analytics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { title: 'ذروة التواجد اليوم', value: MOCK_ONLINE_USERS.peakTime, sub: `${MOCK_ONLINE_USERS.peakCount} مستخدم متزامن`, icon: Clock, color: 'indigo' },
          { title: 'الفصل الأكثر نشاطاً', value: MOCK_ONLINE_USERS.topClass, sub: 'بناءً على التواجد المباشر', icon: TrendingUp, color: 'amber' },
          { title: 'نجم المعلمين', value: MOCK_ONLINE_USERS.topTeacher, sub: 'الأطول تواجداً اليوم', icon: GraduationCap, color: 'blue' },
          { title: 'إجمالي العمليات', value: '+1,240', sub: 'تسجيل دخول وتفاعل اليوم', icon: Zap, color: 'rose' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`bg-white/90 backdrop-blur-xl p-6 rounded-[2rem] border border-${stat.color}-100 shadow-sm flex flex-col gap-4 group hover:shadow-lg hover:-translate-y-1 transition-all relative overflow-hidden`}
          >
            <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full bg-${stat.color}-50 blur-2xl group-hover:scale-150 transition-transform duration-500`}></div>
            <div className="flex justify-between items-start relative z-10">
              <div className={`p-3 bg-${stat.color}-50 rounded-2xl text-${stat.color}-600 group-hover:scale-110 transition-transform shadow-sm`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{stat.title}</p>
              <p className={`text-xl font-black text-slate-900 truncate`}>{stat.value}</p>
              <p className={`text-[10px] font-bold text-${stat.color}-600 mt-2 bg-${stat.color}-50 inline-block px-2 py-1 rounded-md`}>{stat.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* 🚀 Main Activity Chart (Takes 2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-6 sm:p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shadow-inner border border-emerald-100"><Activity className="w-5 h-5"/></div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">مؤشر النشاط الزمني</h3>
                  <p className="text-xs font-bold text-slate-500 mt-1">توزيع عدد المتواجدين على مدار ساعات اليوم.</p>
                </div>
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MOCK_ONLINE_USERS.chartData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} dx={-10} />
                  <Tooltip 
                    contentStyle={{borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                    itemStyle={{color: '#10b981', fontWeight: '900'}}
                  />
                  <Area type="monotone" dataKey="users" name="مستخدم" stroke="#10b981" strokeWidth={4} fill="url(#colorUsers)" activeDot={{r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 3}} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 🚀 Live Feed Column */}
        <div className="bg-slate-50 rounded-[2.5rem] shadow-inner border border-slate-200 overflow-hidden flex flex-col h-[500px] lg:h-auto">
          
          <div className="p-6 bg-white border-b border-slate-200">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-4">
              <MonitorPlay className="w-5 h-5 text-indigo-600" /> البث المباشر للأفراد
            </h3>
            
            <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-4">
              {['all', 'teachers', 'students'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {tab === 'all' ? 'الكل' : tab === 'teachers' ? 'المعلمين' : 'الطلاب'}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث عن اسم..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2.5 pr-10 pl-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
            <AnimatePresence>
              {/* Teacher Feed */}
              {(activeTab === 'all' || activeTab === 'teachers') && filteredTeachers.map((t, i) => (
                <motion.div 
                  key={`t-${t.id}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-sm">
                        {t.name.charAt(0)}
                      </div>
                      {t.activeNow && <span className="absolute -bottom-1 -left-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 leading-tight">{t.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 flex items-center gap-1"><GraduationCap className="w-2.5 h-2.5"/> معلم</span>
                        <span className="text-[9px] font-bold text-slate-400">{t.subject}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className={`text-[10px] font-black ${t.activeNow ? 'text-emerald-500' : 'text-slate-400'}`}>{t.lastSeen}</span>
                  </div>
                </motion.div>
              ))}

              {/* Student Feed */}
              {(activeTab === 'all' || activeTab === 'students') && filteredStudents.map((s, i) => (
                <motion.div 
                  key={`s-${s.id}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-black text-sm">
                        {s.name.charAt(0)}
                      </div>
                      {s.activeNow && <span className="absolute -bottom-1 -left-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 leading-tight">{s.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100 flex items-center gap-1"><UserCheck className="w-2.5 h-2.5"/> طالب</span>
                        <span className="text-[9px] font-bold text-slate-400">{s.className}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className={`text-[10px] font-black ${s.activeNow ? 'text-emerald-500' : 'text-slate-400'}`}>{s.lastSeen}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
