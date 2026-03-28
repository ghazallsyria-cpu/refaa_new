'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  BarChart2, Users, Clock, CheckCircle, 
  AlertCircle, ArrowRight, Download,
  Search, Filter, TrendingUp, FileSpreadsheet,
  FileText, Trash2, Eye, Layout
} from 'lucide-react';
import { motion } from 'motion/react';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import * as XLSX from 'xlsx';

type Attempt = {
  id: string;
  student: { id: string; full_name: string, email: string, section_name: string };
  started_at: string;
  completed_at: string;
  score: number;
  status: string;
};

type ExamStats = {
  avg_score: number;
  max_score: number;
  min_score: number;
  pass_rate: number;
  total_attempts: number;
};

export default function ExamResults() {
  const params = useParams();
  const router = useRouter();
  const { fetchExamResults, deleteAttempt } = useExamsSystem();
  
  const [exam, setExam] = useState<any>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ExamStats | null>(null);
  const [questionAnalytics, setQuestionAnalytics] = useState<any[]>([]);
  const [scoreDistribution, setScoreDistribution] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [questionsData, setQuestionsData] = useState<any[]>([]);
  const [answersData, setAnswersData] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchExamResults(params.id as string);
      
      setExam(res.exam);
      setQuestionsData(res.questions || []);
      setAnswersData(res.answers || []);

      const studentsData = res.students || [];
      const attemptsData = res.attempts || [];

      // تهيئة المحاولات المسجلة
      const formattedAttempts = attemptsData.map((a: any) => {
        const studentInfo = studentsData.find((s:any) => s.id === a.student_id);
        return {
          ...a,
          student: {
            id: a.student_id,
            full_name: studentInfo?.full_name || 'طالب غير معروف',
            email: studentInfo?.email || '',
            section_name: studentInfo?.section_name || 'غير محدد'
          }
        };
      });

      // دمج الطلاب الذين لم يتقدموا للاختبار
      const mergedAttempts = [...formattedAttempts];
      const attemptedStudentIds = new Set(formattedAttempts.map((a: any) => a.student.id));

      studentsData.forEach((student: any) => {
        if (!attemptedStudentIds.has(student.id)) {
          mergedAttempts.push({
            id: `missing-${student.id}`,
            student: { 
              id: student.id, 
              full_name: student.full_name, 
              email: student.email, 
              section_name: student.section_name 
            },
            started_at: '',
            completed_at: '',
            score: 0,
            status: 'not_attempted'
          } as any);
        }
      });

      setAttempts(mergedAttempts);

      // استخراج الصفوف للفلترة
      const sections = Array.from(new Set(mergedAttempts.map(a => a.student.section_name))).filter(Boolean);
      setAvailableSections(sections);

    } catch (err) {
      console.error('Error fetching results:', err);
    } finally {
      setLoading(false);
    }
  }, [params.id, fetchExamResults]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // الحذف الآمن للمحاولة
  const handleDeleteAttempt = async (attemptId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المحاولة؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    try {
      if (!attemptId.startsWith('missing-')) {
        await deleteAttempt(attemptId);
      }
      setAttempts(prev => prev.map(a => 
        a.id === attemptId 
          ? { ...a, id: `missing-${a.student.id}`, status: 'not_attempted', score: 0, completed_at: '', started_at: '' } 
          : a
      ));
    } catch (err) {
      console.error('Error deleting attempt:', err);
      alert('حدث خطأ أثناء محاولة حذف بيانات الطالب.');
    }
  };

  // حساب الإحصائيات عند تغيير الفلتر
  useEffect(() => {
    if (!exam) return;

    let filteredAttempts = attempts;
    if (selectedSection !== 'all') {
      filteredAttempts = attempts.filter(a => a.student.section_name === selectedSection);
    }
    if (searchQuery) {
      filteredAttempts = filteredAttempts.filter(a => a.student.full_name.includes(searchQuery));
    }

    const completedAttempts = filteredAttempts.filter(a => a.status !== 'not_attempted');

    if (completedAttempts.length > 0) {
      const scores = completedAttempts.map(a => a.score);
      const maxPossibleScore = exam.max_score || 100;
      const passingScore = exam.passing_score || (maxPossibleScore / 2);
      
      // نحسب النسبة المئوية للمتوسط والإحصائيات العامة فقط
      const percentageScores = scores.map(s => (s / maxPossibleScore) * 100);
      const avgPercentage = percentageScores.reduce((a, b) => a + b, 0) / percentageScores.length;
      
      setStats({
        avg_score: Math.round(avgPercentage), // كنسبة مئوية
        max_score: Math.max(...scores), // كدرجة خام
        min_score: Math.min(...scores), // كدرجة خام
        pass_rate: Math.round((scores.filter(s => s >= passingScore).length / scores.length) * 100),
        total_attempts: scores.length
      });

      // تحليل أسئلة الاختبار
      if (questionsData.length > 0 && answersData.length > 0) {
        const validAttemptIds = new Set(completedAttempts.map(a => a.id));
        const filteredAnswers = answersData.filter(a => validAttemptIds.has(a.attempt_id));

        const analytics = questionsData.map((q, idx) => {
          const qAnswers = filteredAnswers.filter(a => a.question_id === q.id);
          const correctCount = qAnswers.filter(a => a.is_correct).length;
          const accuracy = qAnswers.length > 0 ? Math.round((correctCount / qAnswers.length) * 100) : 0;
          return { name: `سؤال ${idx + 1}`, correct: accuracy, type: q.type, id: q.id };
        });
        setQuestionAnalytics(analytics);
      }

      // توزيع الدرجات للرسم البياني
      const distribution = [
        { name: 'ممتاز (90-100%)', value: percentageScores.filter(s => s >= 90).length },
        { name: 'جيد جداً (80-89%)', value: percentageScores.filter(s => s >= 80 && s < 90).length },
        { name: 'جيد (70-79%)', value: percentageScores.filter(s => s >= 70 && s < 80).length },
        { name: 'مقبول (50-69%)', value: percentageScores.filter(s => s >= 50 && s < 70).length },
        { name: 'ضعيف (أقل من 50%)', value: percentageScores.filter(s => s < 50).length },
      ].filter(d => d.value > 0);
      
      setScoreDistribution(distribution.length > 0 ? distribution : [{ name: 'لا توجد بيانات', value: 1 }]);

    } else {
      setStats({ avg_score: 0, max_score: 0, min_score: 0, pass_rate: 0, total_attempts: 0 });
      setQuestionAnalytics([]);
      setScoreDistribution([]);
    }
  }, [attempts, selectedSection, searchQuery, exam, questionsData, answersData]);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const filteredAttempts = attempts.filter(a => {
    const matchesSection = selectedSection === 'all' || a.student.section_name === selectedSection;
    const matchesSearch = !searchQuery || a.student.full_name.includes(searchQuery);
    return matchesSection && matchesSearch;
  });

  // دالة التصدير إلى إكسل المحدثة (بالدرجة الصحيحة)
  const exportToExcel = () => {
    const data = filteredAttempts.map(a => ({
      'الطالب': a.student.full_name,
      'الفصل': a.student.section_name,
      'تاريخ التقديم': a.completed_at ? new Date(a.completed_at).toLocaleDateString('ar-SA') : 'لم يتقدم',
      'الدرجة': a.status === 'not_attempted' ? '-' : `${a.score} من ${exam?.max_score || 100}`,
      'الحالة': a.status === 'not_attempted' ? 'لم يتقدم' : a.score >= (exam?.passing_score || 50) ? 'ناجح' : 'راسب'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    if (!ws['!cols']) ws['!cols'] = [];
    ws['!dir'] = 'rtl';
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'النتائج');
    XLSX.writeFile(wb, `${exam?.title || 'نتائج_الاختبار'}.xlsx`);
  };

  // دالة تصدير PDF
  const exportToPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-10 pb-24 print:m-0 print:p-0" dir="rtl">
      
      {/* إعدادات طباعة الـ PDF */}
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 1cm; }
          body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; }
          .no-print, header, nav, footer, button { display: none !important; }
          .print-only { display: block !important; }
          .glass-card { box-shadow: none !important; border: 1px solid #e2e8f0 !important; background: white !important; }
        }
      `}</style>
      
      {/* القسم المخفي الذي يظهر فقط عند تصدير الـ PDF */}
      <div className="hidden print:block w-full">
        <div className="text-center mb-8 border-b-2 border-slate-200 pb-6">
          <h1 className="text-3xl font-black text-slate-900 mb-2">{exam?.title}</h1>
          <p className="text-lg text-slate-600 font-bold">{exam?.subject_name}</p>
          <p className="text-sm text-slate-500 mt-2">تاريخ التقرير: {new Date().toLocaleDateString('ar-SA')}</p>
        </div>
        
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
            <p className="text-xs text-slate-500 font-bold mb-1">المتوسط</p>
            <p className="text-xl font-black text-indigo-600" dir="ltr">{stats?.avg_score}%</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
            <p className="text-xs text-slate-500 font-bold mb-1">نسبة النجاح</p>
            <p className="text-xl font-black text-emerald-600" dir="ltr">{stats?.pass_rate}%</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
            <p className="text-xs text-slate-500 font-bold mb-1">أعلى درجة</p>
            <p className="text-xl font-black text-blue-600" dir="ltr">{stats?.max_score} / {exam?.max_score || 100}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
            <p className="text-xs text-slate-500 font-bold mb-1">المحاولات</p>
            <p className="text-xl font-black text-amber-600">{stats?.total_attempts}</p>
          </div>
        </div>

        <h2 className="text-xl font-black text-slate-900 mb-4 mt-8">نتائج الطلاب التفصيلية</h2>
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 text-sm font-black">
              <th className="p-3 border border-slate-200">الطالب</th>
              <th className="p-3 border border-slate-200">الفصل</th>
              <th className="p-3 border border-slate-200">الدرجة</th>
              <th className="p-3 border border-slate-200">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {filteredAttempts.map((attempt) => (
              <tr key={attempt.id} className="border-b border-slate-100">
                <td className="p-3 text-sm font-bold text-slate-900 border border-slate-200">{attempt.student.full_name}</td>
                <td className="p-3 text-sm text-slate-600 border border-slate-200">{attempt.student.section_name}</td>
                <td className="p-3 text-sm font-black text-indigo-600 border border-slate-200" dir="ltr">
                  {attempt.status === 'not_attempted' ? '-' : `${attempt.score} / ${exam?.max_score || 100}`}
                </td>
                <td className="p-3 text-sm font-bold border border-slate-200">
                  <span className={attempt.status === 'not_attempted' ? 'text-slate-400' : attempt.score >= (exam?.passing_score || 50) ? 'text-emerald-600' : 'text-red-600'}>
                    {attempt.status === 'not_attempted' ? 'لم يتقدم' : attempt.score >= (exam?.passing_score || 50) ? 'ناجح' : 'راسب'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* الهيدر للواجهة الأساسية */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 print:hidden">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.back()}
            className="h-14 w-14 flex items-center justify-center glass-card rounded-2xl text-slate-500 hover:text-indigo-600 hover:shadow-xl transition-all active:scale-95 border border-white/60"
          >
            <ArrowRight className="h-6 w-6" />
          </button>
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">{exam?.title}</h1>
            <div className="flex items-center gap-3 text-slate-500 font-bold">
              <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-600 text-xs uppercase tracking-widest border border-indigo-100">
                {exam?.subject_name || 'مادة عامة'}
              </span>
              <span className="text-slate-300">•</span>
              <p className="text-lg">نتائج وتحليلات الاختبار</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3 self-start md:self-end">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-3 px-6 py-4 rounded-2xl glass-card border border-white/60 bg-white hover:bg-slate-50 text-slate-600 font-black transition-all shadow-xl shadow-slate-200/50 active:scale-95"
          >
            <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
            <span>تصدير Excel</span>
          </button>
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 font-black transition-all shadow-xl shadow-indigo-200 active:scale-95"
          >
            <Download className="h-5 w-5" />
            <span>تقرير PDF</span>
          </button>
        </div>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 print:hidden">
        {[
          { label: 'متوسط الأداء', value: `${stats?.avg_score || 0}%`, icon: BarChart2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'نسبة النجاح', value: `${stats?.pass_rate || 0}%`, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'أعلى درجة', value: `${stats?.max_score || 0} / ${exam?.max_score || 100}`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'إجمالي المتقدمين', value: `${stats?.total_attempts || 0} طالب`, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-8 rounded-4xl border border-white/60 shadow-2xl shadow-slate-200/50 relative overflow-hidden group bg-white"
          >
            <div className="absolute -right-4 -top-4 h-24 w-24 bg-slate-50 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 -z-10" />
            <div className="flex items-start justify-between mb-6">
              <div className={`h-14 w-14 rounded-2xl ${stat.bg} flex items-center justify-center shadow-inner`}>
                <stat.icon className={`h-7 w-7 ${stat.color}`} />
              </div>
            </div>
            <p className="text-sm font-black text-slate-500 mb-1 uppercase tracking-widest">{stat.label}</p>
            <p className="text-3xl font-black text-slate-900 tracking-tighter" dir="ltr">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 print:hidden">
        {/* المخطط البياني للأسئلة */}
        <div className="lg:col-span-2 glass-card p-8 rounded-4xl border border-white/60 shadow-2xl shadow-slate-200/50 space-y-8 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">أداء الأسئلة</h3>
              <p className="text-slate-500 font-bold">تحليل دقة الإجابات لكل سؤال</p>
            </div>
          </div>
          <div className="h-[350px] w-full">
            {questionAnalytics.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={questionAnalytics} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} dy={15} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)' }} />
                  <Bar dataKey="correct" radius={[12, 12, 0, 0]} barSize={48}>
                    {questionAnalytics.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.correct < 50 ? '#ef4444' : '#4f46e5'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold">لا توجد بيانات كافية للرسم البياني</div>
            )}
          </div>
        </div>

        {/* الرسم البياني الدائري لتوزيع الدرجات */}
        <div className="glass-card p-8 rounded-4xl border border-white/60 shadow-2xl shadow-slate-200/50 space-y-8 bg-white">
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">توزيع الدرجات</h3>
            <p className="text-slate-500 font-bold">مستويات الطلاب في الاختبار</p>
          </div>
          <div className="h-[280px] w-full relative">
            {scoreDistribution.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={scoreDistribution} innerRadius={75} outerRadius={100} paddingAngle={8} dataKey="value">
                      {scoreDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-4xl font-black text-slate-900 tracking-tighter" dir="ltr">{stats?.pass_rate}%</span>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">نسبة النجاح</span>
                </div>
              </>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold">لا توجد بيانات</div>
            )}
          </div>
        </div>
      </div>

      {/* جدول النتائج التفصيلي */}
      <div className="space-y-8 print:hidden">
        {Object.entries(
          filteredAttempts.reduce((acc, attempt) => {
            const section = attempt.student.section_name;
            if (!acc[section]) acc[section] = [];
            acc[section].push(attempt);
            return acc;
          }, {} as Record<string, typeof filteredAttempts>)
        ).map(([sectionName, sectionAttempts], index) => (
          <div key={sectionName} className="glass-card rounded-4xl border border-white/60 shadow-2xl shadow-slate-200/50 overflow-hidden bg-white">
            <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">نتائج المجموعة: {sectionName}</h3>
              </div>
              {index === 0 && (
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  <div className="relative group max-w-xs w-full">
                    <Filter className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    <select
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      className="w-full pr-12 pl-4 py-4 rounded-2xl border-0 bg-slate-50 ring-1 ring-inset ring-slate-100 text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none transition-all appearance-none"
                    >
                      <option value="all">جميع الفصول</option>
                      {availableSections.map(section => (
                        <option key={section} value={section}>{section}</option>
                      ))}
                    </select>
                  </div>
                  <div className="relative group max-w-xs w-full">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="البحث عن طالب..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pr-12 pl-4 py-4 rounded-2xl border-0 bg-slate-50 ring-1 ring-inset ring-slate-100 text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-xs font-black uppercase tracking-widest">
                    <th className="px-8 py-6">الطالب</th>
                    <th className="px-8 py-6 text-center">الدرجة المكتسبة</th>
                    <th className="px-8 py-6 text-center">الحالة</th>
                    <th className="px-8 py-6 text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sectionAttempts.map((attempt) => (
                    <tr key={attempt.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-lg">
                            {attempt.student.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-base font-black text-slate-900">{attempt.student.full_name}</p>
                            <p className="text-xs text-slate-500 font-bold">{attempt.student.section_name}</p>
                          </div>
                        </div>
                      </td>
                      
                      {/* عرض الدرجة بالشكل الجديد 7/10 بدلاً من النسبة */}
                      <td className="px-8 py-6 text-center">
                        {attempt.status === 'not_attempted' ? (
                          <span className="text-slate-400 font-bold">-</span>
                        ) : (
                          <div className="inline-flex items-center justify-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                            <span className="text-xl font-black text-indigo-600">{attempt.score}</span>
                            <span className="text-slate-400 font-bold">/</span>
                            <span className="text-slate-500 font-black">{exam?.max_score || 100}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-8 py-6 text-center">
                        <span className={`inline-flex px-4 py-1.5 rounded-xl text-xs font-black uppercase border ${
                          attempt.status === 'not_attempted'
                            ? 'bg-slate-50 text-slate-500 border-slate-100'
                            : attempt.score >= (exam?.passing_score || 50) 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : 'bg-red-50 text-red-700 border-red-100'
                        }`}>
                          {attempt.status === 'not_attempted' ? 'لم يتقدم' : attempt.score >= (exam?.passing_score || 50) ? 'ناجح' : 'راسب'}
                        </span>
                      </td>
                      
                      <td className="px-8 py-6 text-left">
                        <div className="flex items-center gap-2 justify-end">
                          {attempt.status !== 'not_attempted' && (
                            <>
                              <button 
                                onClick={() => router.push(`/exams/results/${params.id}/student/${attempt.student.id}`)}
                                className="h-10 w-10 flex items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-indigo-600 transition-all"
                                title="عرض ورقة الاختبار"
                              >
                                <Eye className="h-5 w-5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteAttempt(attempt.id)}
                                className="h-10 w-10 flex items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-red-600 transition-all"
                                title="إعادة تعيين وحذف المحاولة"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {filteredAttempts.length === 0 && (
          <div className="glass-card rounded-4xl border border-white/60 shadow-2xl p-12 text-center bg-white">
            <p className="text-slate-500 font-bold">لا توجد نتائج مطابقة</p>
          </div>
        )}
      </div>
    </div>
  );
}


