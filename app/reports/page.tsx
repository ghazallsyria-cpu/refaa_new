'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  TrendingUp, 
  Award,
  CalendarCheck
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

// No mock data

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9'];

export default function ReportsPage() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    avgAttendance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [distributionData, setDistributionData] = useState<any[]>([]);
  const [gradesData, setGradesData] = useState<any[]>([]);

  useEffect(() => {
    fetchBasicStats();
  }, []);

  const fetchBasicStats = async () => {
    setLoading(true);
    try {
      const [
        studentsRes, 
        teachersRes, 
        classesRes, 
        attendanceRes,
        classDistributionRes
      ] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('teachers').select('id', { count: 'exact', head: true }),
        supabase.from('classes').select('id', { count: 'exact', head: true }),
        supabase.from('attendance').select('status, date').gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
        supabase.from('classes').select('level, sections(students(id))')
      ]);

      // Calculate average attendance
      let avgAttendance = 0;
      if (attendanceRes.data && attendanceRes.data.length > 0) {
        const presentCount = attendanceRes.data.filter(a => a.status === 'present').length;
        avgAttendance = Math.round((presentCount / attendanceRes.data.length) * 100);
      }

      setStats({
        totalStudents: studentsRes.count || 0,
        totalTeachers: teachersRes.count || 0,
        totalClasses: classesRes.count || 0,
        avgAttendance: avgAttendance,
      });

      // Process attendance chart data (last 7 days)
      const last7Days = Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();

      const chartData = last7Days.map(date => {
        const dayData = attendanceRes.data?.filter(a => a.date === date) || [];
        const present = dayData.filter(a => a.status === 'present').length;
        const absent = dayData.filter(a => a.status === 'absent').length;
        const dayName = new Date(date).toLocaleDateString('ar-SA', { weekday: 'short' });
        return { name: dayName, present, absent };
      }).filter(d => d.present > 0 || d.absent > 0);

      setAttendanceData(chartData);

      // Process distribution data
      if (classDistributionRes.data) {
        const levelCounts: Record<number, number> = {};
        classDistributionRes.data.forEach(cls => {
          const studentCount = cls.sections?.reduce((acc: number, sec: any) => acc + (sec.students?.length || 0), 0) || 0;
          levelCounts[cls.level] = (levelCounts[cls.level] || 0) + studentCount;
        });

        const distData = Object.entries(levelCounts).map(([level, count]) => ({
          name: `الصف ${level}`,
          value: count,
        })).filter(d => d.value > 0);
        
        setDistributionData(distData);
      }

      // Fetch grades data
      const { data: attemptsData } = await supabase
        .from('exam_attempts')
        .select('score, exam:exams(subject:subjects(name))');

      if (attemptsData && attemptsData.length > 0) {
        const subjectGrades: Record<string, { total: number, count: number }> = {};
        
        attemptsData.forEach((attempt: any) => {
          const subjectName = attempt.exam?.subject?.name || 'غير محدد';
          if (!subjectGrades[subjectName]) {
            subjectGrades[subjectName] = { total: 0, count: 0 };
          }
          subjectGrades[subjectName].total += attempt.score;
          subjectGrades[subjectName].count += 1;
        });

        const gData = Object.entries(subjectGrades).map(([subject, stats]) => ({
          subject,
          average: Math.round(stats.total / stats.count),
        }));

        setGradesData(gData);
      } else {
        setGradesData([]);
      }

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, colorClass, delay }: any) => (
    <div className={`glass-card p-8 rounded-4xl border border-slate-200/60 shadow-2xl shadow-slate-200/50 flex items-center gap-6 hover:-translate-y-1 transition-all duration-500 group animate-in fade-in slide-in-from-bottom-4 fill-mode-both`} style={{ animationDelay: `${delay}ms` }}>
      <div className={`h-16 w-16 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-500 group-hover:scale-110 ${colorClass}`}>
        <Icon className="w-8 h-8 text-white" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <h3 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
      </div>
    </div>
  );

  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-24">
      <div className="space-y-2">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">التقارير والإحصائيات</h1>
        <p className="text-lg text-slate-500 font-medium">نظرة عامة شاملة على أداء المدرسة، الحضور، والدرجات</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard 
          title="إجمالي الطلاب" 
          value={loading ? '...' : stats.totalStudents} 
          icon={Users} 
          colorClass="bg-indigo-600 shadow-indigo-100" 
          delay={100}
        />
        <StatCard 
          title="إجمالي المعلمين" 
          value={loading ? '...' : stats.totalTeachers} 
          icon={GraduationCap} 
          colorClass="bg-emerald-600 shadow-emerald-100" 
          delay={200}
        />
        <StatCard 
          title="الصفوف الدراسية" 
          value={loading ? '...' : stats.totalClasses} 
          icon={BookOpen} 
          colorClass="bg-amber-600 shadow-amber-100" 
          delay={300}
        />
        <StatCard 
          title="متوسط الحضور" 
          value={`${stats.avgAttendance}%`} 
          icon={CalendarCheck} 
          colorClass="bg-sky-600 shadow-sky-100" 
          delay={400}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* Attendance Chart */}
        <div className="glass-card p-10 rounded-4xl border border-slate-200/60 shadow-2xl shadow-slate-200/50 hover:shadow-indigo-100 transition-all duration-500">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">معدل الحضور والغياب</h3>
                <p className="text-xs text-slate-400 font-black uppercase tracking-widest">إحصائيات الأسبوع الأخير</p>
              </div>
            </div>
          </div>
          <div className="h-80 w-full" dir="ltr">
              {attendanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attendanceData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '24px', 
                        border: 'none', 
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                        padding: '16px',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(8px)'
                      }}
                      itemStyle={{ textAlign: 'right', fontWeight: 800 }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right" 
                      iconType="circle"
                      wrapperStyle={{ paddingBottom: '40px', fontSize: '12px', fontWeight: 800 }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="present" 
                      name="حضور" 
                      stroke="#10b981" 
                      strokeWidth={4} 
                      dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} 
                      activeDot={{ r: 8, strokeWidth: 0 }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="absent" 
                      name="غياب" 
                      stroke="#f43f5e" 
                      strokeWidth={4} 
                      dot={{ r: 6, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }} 
                      activeDot={{ r: 8, strokeWidth: 0 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                  <div className="h-16 w-16 rounded-3xl bg-slate-50 flex items-center justify-center">
                    <TrendingUp className="w-8 h-8 text-slate-200" />
                  </div>
                  <p className="font-bold italic">لا توجد بيانات كافية للعرض</p>
                </div>
              )}
          </div>
        </div>

        {/* Grades Chart */}
        <div className="glass-card p-10 rounded-4xl border border-slate-200/60 shadow-2xl shadow-slate-200/50 hover:shadow-amber-100 transition-all duration-500">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-sm">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">متوسط الدرجات</h3>
                <p className="text-xs text-slate-400 font-black uppercase tracking-widest">تحليل الأداء حسب المادة</p>
              </div>
            </div>
          </div>
          <div className="h-80 w-full" dir="ltr">
              {gradesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gradesData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="subject" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} 
                      domain={[0, 100]} 
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(241, 245, 249, 0.5)', radius: 12 }}
                      contentStyle={{ 
                        borderRadius: '24px', 
                        border: 'none', 
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                        padding: '16px',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(8px)'
                      }}
                    />
                    <Bar 
                      dataKey="average" 
                      name="متوسط الدرجة" 
                      fill="#4f46e5" 
                      radius={[12, 12, 4, 4]} 
                      barSize={40} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                  <div className="h-16 w-16 rounded-3xl bg-slate-50 flex items-center justify-center">
                    <Award className="w-8 h-8 text-slate-200" />
                  </div>
                  <p className="font-bold italic">لا توجد بيانات كافية للعرض</p>
                </div>
              )}
          </div>
        </div>

        {/* Distribution Chart */}
        <div className="glass-card p-10 rounded-4xl border border-slate-200/60 shadow-2xl shadow-slate-200/50 hover:shadow-sky-100 transition-all duration-500 lg:col-span-2">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600 shadow-sm">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">توزيع الطلاب</h3>
                <p className="text-xs text-slate-400 font-black uppercase tracking-widest">حسب المراحل الدراسية</p>
              </div>
            </div>
          </div>
          <div className="h-96 w-full flex flex-col md:flex-row items-center justify-center" dir="ltr">
            {distributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={100}
                    outerRadius={140}
                    paddingAngle={8}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {distributionData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                        strokeWidth={0}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '24px', 
                      border: 'none', 
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                      padding: '16px',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      backdropFilter: 'blur(8px)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                <div className="h-16 w-16 rounded-3xl bg-slate-50 flex items-center justify-center">
                  <Users className="w-8 h-8 text-slate-200" />
                </div>
                <p className="font-bold italic">لا توجد بيانات كافية للعرض</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
