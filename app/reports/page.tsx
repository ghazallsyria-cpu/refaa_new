'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  TrendingUp, 
  Award,
  CalendarCheck,
  Activity,
  Target,
  PieChart as PieChartIcon,
  BarChart3
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { motion } from 'framer-motion';
import { useReportsSystem } from '@/hooks/useReportsSystem';

// ==========================================
// 🎨 ألوان المخططات (Data Visualization Palette)
// ألوان متوهجة تتناسب مع الخلفية الداكنة الملكية
// ==========================================
const CHART_COLORS = {
  primary: '#4f46e5',   // Indigo
  success: '#10b981',   // Emerald
  warning: '#f59e0b',   // Amber
  danger: '#f43f5e',    // Rose
  info: '#0ea5e9',      // Sky
  purple: '#8b5cf6',    // Violet
  glass: 'rgba(255, 255, 255, 0.05)'
};

const PIE_COLORS = [CHART_COLORS.primary, CHART_COLORS.info, CHART_COLORS.purple, CHART_COLORS.success, CHART_COLORS.warning];

// ==========================================
// 📊 صفحة التقارير الذكية (Strategic Command Center)
// تم تصميمها لتكون Dashboard للإدارة العليا.
// تعتمد مبدأ (Client-Side Aggregation) لتخفيف العبء عن السيرفر.
// ==========================================
export default function ReportsPage() {
  const { fetchReportsData } = useReportsSystem();
  
  // 🗃️ الحالة الخام (Raw State)
  // نحتفظ بالبيانات القادمة من السيرفر كما هي، لكي نُجري عليها العمليات المعقدة لاحقاً.
  const [rawData, setRawData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ==========================================
  // 📡 جلب البيانات مرة واحدة فقط (Single Fetch)
  // يضمن هذا الـ useEffect عدم استدعاء הـ API مرات متعددة.
  // نستخدم isMounted لتجنب تحديث State إذا غادر المستخدم الصفحة أثناء التحميل.
  // ==========================================
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchReportsData();
        if (isMounted) setRawData(data);
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [fetchReportsData]);

  // ==========================================
  // 🧠 المعالج الذكي للبيانات (Client-Side Aggregation Engine)
  // نستخدم useMemo لكي لا يتم إعادة حساب هذه العمليات الثقيلة إلا إذا تغيرت البيانات (rawData).
  // هذا يعني أن عمليات التصفية والحساب المعقدة تحدث في متصفح المستخدم (مما يضمن أداء خارق 60fps)
  // بدلاً من إرسال طلبات مكثفة (Heavy Queries) لقاعدة البيانات!
  // ==========================================
  const analytics = useMemo(() => {
    if (!rawData) return null;

    // استخراج الكيانات الرئيسية من البيانات
    const { studentsCount = 0, teachersCount = 0, classesCount = 0, attendanceData = [], classDistribution = [], attemptsData = [] } = rawData;

    // 1️⃣ حساب مؤشرات الأداء الرئيسية (KPIs)
    let avgAttendance = 0;
    if (attendanceData.length > 0) {
      // استخراج الحاضرين فقط لحساب متوسط الحضور
      const presentCount = attendanceData.filter((a: any) => a.daily_status === 'present').length;
      avgAttendance = Math.round((presentCount / attendanceData.length) * 100);
    }
    
    // حساب نسبة المعلمين للطلاب (Student-to-Teacher Ratio) لمعرفة الكثافة التعليمية
    const stRatio = teachersCount > 0 ? Math.round(studentsCount / teachersCount) : 0;

    // 2️⃣ معالجة منحنى الحضور لأخر 7 أيام (Attendance Area Chart)
    // إنشاء مصفوفة بتواريخ آخر 7 أيام للبحث عنها في السجلات
    const last7Days = Array.from({length: 7}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    // تصنيف وتجميع بيانات الحضور لكل يوم
    const attendanceTrend = last7Days.map(date => {
      const dayData = attendanceData.filter((a: any) => a.date === date);
      const present = dayData.filter((a: any) => a.daily_status === 'present').length;
      const absent = dayData.filter((a: any) => a.daily_status === 'full_absent').length;
      const dayName = new Date(date).toLocaleDateString('ar-SA', { weekday: 'short' });
      return { name: dayName, present, absent };
    }).filter(d => d.present > 0 || d.absent > 0);

    // 3️⃣ معالجة التوزيع الديموغرافي للطلاب (Demographic Pie Chart)
    const levelCounts: Record<string, number> = {};
    classDistribution.forEach((cls: any) => {
      // جمع أعداد الطلاب داخل كل شعبة تابعة لهذا الصف
      const studentCount = cls.sections?.reduce((acc: number, sec: any) => acc + (sec.students?.length || 0), 0) || 0;
      levelCounts[`الصف ${cls.level}`] = (levelCounts[`الصف ${cls.level}`] || 0) + studentCount;
    });
    const distributionMap = Object.entries(levelCounts).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);

    // 4️⃣ معالجة الأداء الأكاديمي الشامل (Academic Radar & Bar Charts)
    const subjectGrades: Record<string, { total: number, count: number, max: number }> = {};
    let totalPlatformScore = 0;
    let totalAttempts = 0;

    // تجميع درجات جميع محاولات الاختبارات وحساب المجاميع
    attemptsData.forEach((attempt: any) => {
      const subjectName = attempt.exam?.subject?.name || 'عام';
      if (!subjectGrades[subjectName]) {
        subjectGrades[subjectName] = { total: 0, count: 0, max: 0 };
      }
      subjectGrades[subjectName].total += attempt.score || 0;
      subjectGrades[subjectName].count += 1;
      
      // التقاط أعلى درجة في المادة
      if (attempt.score > subjectGrades[subjectName].max) {
        subjectGrades[subjectName].max = attempt.score;
      }

      totalPlatformScore += attempt.score || 0;
      totalAttempts += 1;
    });

    // تحويل التجميعات إلى نسب مئوية مفهومة
    const academicPerformance = Object.entries(subjectGrades).map(([subject, stats]) => ({
      subject,
      average: Math.round(stats.total / stats.count),
      topScore: stats.max,
      fullMark: 100
    }));

    const platformAvgGrade = totalAttempts > 0 ? Math.round(totalPlatformScore / totalAttempts) : 0;

    return {
      kpis: { studentsCount, teachersCount, classesCount, avgAttendance, stRatio, platformAvgGrade },
      attendanceTrend,
      distributionMap,
      academicPerformance
    };
  }, [rawData]); // لا نعيد الحساب إلا إذا تغيرت البيانات الأصلية


  // ==========================================
  // 🧩 مكونات فرعية (Sub-components)
  // ==========================================
  
  // شاشة التحميل الفخمة (تحل مكان الصفحة بالكامل قبل جلب البيانات)
  if (loading || !analytics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-t-2 border-l-2 border-amber-500 animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Activity className="w-8 h-8 text-indigo-500 animate-pulse" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-white tracking-widest animate-pulse">جاري تحليل البيانات الاستراتيجية...</h2>
        <p className="text-slate-500 font-bold">يتم الآن معالجة السجلات محلياً لضمان أقصى سرعة وحماية الخادم</p>
      </div>
    );
  }

  // بطاقة الـ KPI: مكون وظيفي (Functional Component) مدمج لعرض المربعات العلوية
  const KpiCard = ({ title, value, subtitle, icon: Icon, color, delay }: any) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5 }}
      className="glass-panel p-6 rounded-[2rem] flex items-center gap-5 group relative overflow-hidden"
    >
      {/* توهج خلفي خفيف للأيقونة يتسع عند المرور بالماوس */}
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity`} style={{ backgroundColor: color }}></div>
      
      <div className="h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg relative z-10 border border-white/10" style={{ backgroundColor: `${color}20`, color: color }}>
        <Icon className="w-8 h-8 drop-shadow-md group-hover:scale-110 transition-transform duration-300" />
      </div>
      
      <div className="space-y-1 z-10">
        <p className="text-sm font-bold text-slate-400">{title}</p>
        <h3 className="text-3xl font-black text-white tracking-tight">{value}</h3>
        <p className="text-xs font-bold" style={{ color }}>{subtitle}</p>
      </div>
    </motion.div>
  );

  // تصميم الـ Tooltip الموحد للمخططات (Glassmorphism Tooltip)
  // يستبدل التلميح البشع الافتراضي لمكتبة Recharts ويجعله متناسباً مع الوضع المظلم
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0f1423]/95 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] text-right">
          <p className="text-white font-black mb-3 pb-2 border-b border-white/5">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-3 justify-end mb-1">
              <span className="font-bold text-slate-300">{entry.value}</span>
              <span className="text-sm font-bold" style={{ color: entry.color }}>{entry.name}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // ==========================================
  // 🎨 الواجهة المرئية (Render)
  // ==========================================
  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-24" dir="rtl">
      
      {/* 👑 الترويسة الرئيسية */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-2">
          <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-l from-white to-slate-400 tracking-tight">
            مركز القيادة التحليلي
          </h1>
          <p className="text-lg text-amber-500/90 font-bold flex items-center gap-2">
            <Activity className="w-5 h-5" /> يتم عرض البيانات الحية بناءً على خوارزميات التجميع المتقدمة
          </p>
        </motion.div>
      </div>

      {/* 📊 مؤشرات الأداء الرئيسية (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <KpiCard title="إجمالي الطلاب" value={analytics.kpis.studentsCount} subtitle="مسجلين في النظام" icon={Users} color={CHART_COLORS.primary} delay={0.1} />
        <KpiCard title="الكادر التعليمي" value={analytics.kpis.teachersCount} subtitle="نشطين حالياً" icon={GraduationCap} color={CHART_COLORS.success} delay={0.2} />
        <KpiCard title="الشعب الدراسية" value={analytics.kpis.classesCount} subtitle="موزعة على الصفوف" icon={BookOpen} color={CHART_COLORS.warning} delay={0.3} />
        <KpiCard title="معدل الحضور" value={`${analytics.kpis.avgAttendance}%`} subtitle="متوسط الحضور العام" icon={CalendarCheck} color={CHART_COLORS.info} delay={0.4} />
        <KpiCard title="معدل الكثافة" value={`1 : ${analytics.kpis.stRatio}`} subtitle="معلم لكل طالب" icon={Target} color={CHART_COLORS.danger} delay={0.5} />
        <KpiCard title="المتوسط الأكاديمي" value={`${analytics.kpis.platformAvgGrade}%`} subtitle="متوسط درجات المنصة" icon={Award} color={CHART_COLORS.purple} delay={0.6} />
      </div>

      {/* 📈 قسم المخططات البيانية المتقدمة */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 📉 منحنى الحضور الانسيابي (Area Chart) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="glass-panel p-8 rounded-[2.5rem] lg:col-span-2 flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-indigo-500/20 rounded-xl"><TrendingUp className="w-6 h-6 text-indigo-400" /></div>
            <div>
              <h3 className="text-xl font-black text-white">منحنى الانضباط المدرسي</h3>
              <p className="text-sm font-bold text-slate-400">مقارنة الحضور والغياب لآخر 7 أيام</p>
            </div>
          </div>
          
          <div className="flex-1 w-full min-h-[350px]" dir="ltr">
            {analytics.attendanceTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.attendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.danger} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={CHART_COLORS.danger} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 700 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 700 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }} />
                  <Area type="monotone" dataKey="present" name="حاضر" stroke={CHART_COLORS.success} strokeWidth={4} fillOpacity={1} fill="url(#colorPresent)" activeDot={{ r: 8, strokeWidth: 0, fill: CHART_COLORS.success }} />
                  <Area type="monotone" dataKey="absent" name="غائب" stroke={CHART_COLORS.danger} strokeWidth={4} fillOpacity={1} fill="url(#colorAbsent)" activeDot={{ r: 8, strokeWidth: 0, fill: CHART_COLORS.danger }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-500 font-bold italic">لا تتوفر بيانات كافية لهذا الأسبوع</div>
            )}
          </div>
        </motion.div>

        {/* 🍩 التوزيع الديموغرافي (Doughnut Chart) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="glass-panel p-8 rounded-[2.5rem] flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-sky-500/20 rounded-xl"><PieChartIcon className="w-6 h-6 text-sky-400" /></div>
            <div>
              <h3 className="text-xl font-black text-white">الكتلة الطلابية</h3>
              <p className="text-sm font-bold text-slate-400">توزيع الطلاب حسب الصفوف</p>
            </div>
          </div>
          
          <div className="flex-1 w-full min-h-[350px] relative" dir="ltr">
            {analytics.distributionMap.length > 0 ? (
              <>
                {/* دائرة تجميلية في المنتصف تعرض إجمالي الطلاب */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                   <span className="text-4xl font-black text-white">{analytics.kpis.studentsCount}</span>
                   <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">إجمالي</span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics.distributionMap} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value" stroke="none">
                      {analytics.distributionMap.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} className="hover:opacity-80 transition-opacity outline-none" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-500 font-bold italic">لا تتوفر بيانات للتوزيع</div>
            )}
          </div>
        </motion.div>

        {/* 🕸️ رادار الكفاءة الأكاديمية (Radar Chart) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="glass-panel p-8 rounded-[2.5rem] flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-purple-500/20 rounded-xl"><Target className="w-6 h-6 text-purple-400" /></div>
            <div>
              <h3 className="text-xl font-black text-white">رادار الكفاءة الأكاديمية</h3>
              <p className="text-sm font-bold text-slate-400">تحليل المهارات وتوازنها في المواد المختلفة</p>
            </div>
          </div>
          
          <div className="flex-1 w-full min-h-[350px]" dir="ltr">
            {analytics.academicPerformance.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <RadarChart cx="50%" cy="50%" outerRadius="70%" data={analytics.academicPerformance}>
                   <PolarGrid stroke="rgba(255,255,255,0.1)" />
                   <PolarAngleAxis dataKey="subject" tick={{ fill: '#cbd5e1', fontSize: 12, fontWeight: 700 }} />
                   <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b' }} axisLine={false} />
                   <Radar name="المتوسط" dataKey="average" stroke={CHART_COLORS.purple} strokeWidth={3} fill={CHART_COLORS.purple} fillOpacity={0.4} />
                   <Tooltip content={<CustomTooltip />} />
                 </RadarChart>
               </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-500 font-bold italic">لا توجد اختبارات كافية للرادار</div>
            )}
          </div>
        </motion.div>

        {/* 📊 أداء المواد التفصيلي (Bar Chart) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }} className="glass-panel p-8 rounded-[2.5rem] lg:col-span-2 flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-amber-500/20 rounded-xl"><BarChart3 className="w-6 h-6 text-amber-400" /></div>
            <div>
              <h3 className="text-xl font-black text-white">التحليل الاستيعابي للمواد</h3>
              <p className="text-sm font-bold text-slate-400">مقارنة بين متوسط الدرجات وأعلى درجة في المنصة</p>
            </div>
          </div>
          
          <div className="flex-1 w-full min-h-[350px]" dir="ltr">
            {analytics.academicPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.academicPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 700 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 700 }} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)', radius: 12 }} />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }} />
                  <Bar dataKey="average" name="المتوسط العام" fill={CHART_COLORS.warning} radius={[8, 8, 4, 4]} maxBarSize={40} />
                  <Bar dataKey="topScore" name="أعلى درجة مسجلة" fill={CHART_COLORS.info} radius={[8, 8, 4, 4]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-500 font-bold italic">لا تتوفر درجات لعرض التحليل</div>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
