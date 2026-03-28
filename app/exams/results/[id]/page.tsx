'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  BarChart2, Users, CheckCircle, AlertCircle, ArrowRight, Download,
  Search, Filter, TrendingUp, FileSpreadsheet, Trash2, Eye,
  ChevronLeft, ChevronRight, XCircle, MinusCircle, GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie
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
  absent_count: number;
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
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [questionsData, setQuestionsData] = useState<any[]>([]);
  const [answersData, setAnswersData] = useState<any[]>([]);

  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'attempted' | 'not_attempted' | 'passed' | 'failed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchExamResults(params.id as string);
      
      setExam(res.exam);
      setQuestionsData(res.questions || []);
      setAnswersData(res.answers || []);

      const studentsData = res.students || [];
      const attemptsData = res.attempts || [];

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

      const mergedAttempts = [...formattedAttempts];
      const attemptedStudentIds = new Set(formattedAttempts.map((a: any) => a.student.id));

      studentsData.forEach((student: any) => {
        if (!attemptedStudentIds.has(student.id)) {
          mergedAttempts.push({
            id: `missing-${student.id}`,
            student: { id: student.id, full_name: student.full_name, email: student.email, section_name: student.section_name },
            started_at: '', completed_at: '', score: 0, status: 'not_attempted'
          } as any);
        }
      });

      setAttempts(mergedAttempts);
      const sections = Array.from(new Set(mergedAttempts.map(a => a.student.section_name))).filter(Boolean);
      setAvailableSections(sections);

    } catch (err) {
      console.error('Error fetching results:', err);
    } finally {
      setLoading(false);
    }
  }, [params.id, fetchExamResults]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDeleteAttempt = async (attemptId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المحاولة؟ لا يمكن التراجع.')) return;
    try {
      if (!attemptId.startsWith('missing-')) await deleteAttempt(attemptId);
      setAttempts(prev => prev.map(a => a.id === attemptId ? { ...a, id: `missing-${a.student.id}`, status: 'not_attempted', score: 0, completed_at: '', started_at: '' } : a));
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء محاولة حذف بيانات الطالب.');
    }
  };

  const filteredAttempts = useMemo(() => {
    return attempts.filter(a => {
      const maxScore = exam?.max_score || 100;
      const passingPercentage = exam?.passing_score || 50;
      const studentPercentage = (a.score / maxScore) * 100;
      const isPassed = studentPercentage >= passingPercentage;

      const matchesSection = selectedSection === 'all' || a.student.section_name === selectedSection;
      const matchesSearch = !searchQuery || a.student.full_name.includes(searchQuery);
      
      let matchesStatus = true;
      if (statusFilter === 'attempted') matchesStatus = a.status !== 'not_attempted';
      if (statusFilter === 'not_attempted') matchesStatus = a.status === 'not_attempted';
      if (statusFilter === 'passed') matchesStatus = a.status !== 'not_attempted' && isPassed;
      if (statusFilter === 'failed') matchesStatus = a.status !== 'not_attempted' && !isPassed;

      return matchesSection && matchesSearch && matchesStatus;
    });
  }, [attempts, selectedSection, searchQuery, statusFilter, exam]);

  useEffect(() => { setCurrentPage(1); }, [selectedSection, searchQuery, statusFilter]);

  useEffect(() => {
    if (!exam) return;

    const sectionAttempts = attempts.filter(a => selectedSection === 'all' || a.student.section_name === selectedSection);
    const completedAttempts = sectionAttempts.filter(a => a.status !== 'not_attempted');
    const absentCount = sectionAttempts.length - completedAttempts.length;

    if (completedAttempts.length > 0) {
      const scores = completedAttempts.map(a => a.score);
      const maxPossibleScore = exam.max_score || 100;
      const passingPercentage = exam.passing_score || 50;
      
      const percentageScores = scores.map(s => (s / maxPossibleScore) * 100);
      const avgPercentage = percentageScores.reduce((a, b) => a + b, 0) / percentageScores.length;
      
      setStats({
        avg_score: Math.round(avgPercentage),
        max_score: Math.max(...scores),
        min_score: Math.min(...scores),
        pass_rate: Math.round((percentageScores.filter(s => s >= passingPercentage).length / percentageScores.length) * 100),
        total_attempts: scores.length,
        absent_count: absentCount
      });

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

      const distribution = [
        { name: 'ممتاز (90-100%)', value: percentageScores.filter(s => s >= 90).length },
        { name: 'جيد جداً (80-89%)', value: percentageScores.filter(s => s >= 80 && s < 90).length },
        { name: 'جيد (70-79%)', value: percentageScores.filter(s => s >= 70 && s < 80).length },
        { name: 'مقبول (50-69%)', value: percentageScores.filter(s => s >= 50 && s < 70).length },
        { name: 'ضعيف (أقل من 50%)', value: percentageScores.filter(s => s < 50).length },
      ].filter(d => d.value > 0);
      setScoreDistribution(distribution.length > 0 ? distribution : [{ name: 'لا توجد بيانات', value: 1 }]);

    } else {
      setStats({ avg_score: 0, max_score: 0, min_score: 0, pass_rate: 0, total_attempts: 0, absent_count: absentCount });
      setQuestionAnalytics([]);
      setScoreDistribution([]);
    }
  }, [attempts, selectedSection, exam, questionsData, answersData]);

  const totalPages = Math.ceil(filteredAttempts.length / itemsPerPage);
  const paginatedAttempts = filteredAttempts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const exportToExcel = () => {
    const maxScore = exam?.max_score || 100;
    const passingPercentage = exam?.passing_score || 50;

    const headerData = [
      [`نتائج اختبار: ${exam?.title || 'غير محدد'}`],
      [`المادة الدراسية: ${exam?.subject_name || 'غير محدد'}`],
      [`الفصل المختار: ${selectedSection === 'all' ? 'جميع الفصول' : selectedSection}`],
      [`الدرجة الكلية: ${maxScore}`],
      [`نسبة النجاح المطلوبة: ${passingPercentage}%`],
      [], 
      ['م', 'اسم الطالب', 'الفصل الدراسي', 'تاريخ التقديم', 'الدرجة المكتسبة', 'النسبة المئوية', 'الحالة']
    ];

    const bodyData = filteredAttempts.map((a, index) => {
      if (a.status === 'not_attempted') return [index + 1, a.student.full_name, a.student.section_name, 'لم يتقدم', '-', '-', 'غائب'];
      const studentPercentage = (a.score / maxScore) * 100;
      const isPassed = studentPercentage >= passingPercentage;
      return [ index + 1, a.student.full_name, a.student.section_name, new Date(a.completed_at).toLocaleDateString('ar-SA'), `${a.score} من ${maxScore}`, `${Math.round(studentPercentage)}%`, isPassed ? 'ناجح' : 'راسب' ];
    });

    const finalData = [...headerData, ...bodyData];
    const ws = XLSX.utils.aoa_to_sheet(finalData);
    ws['!dir'] = 'rtl';
    ws['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 10 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'النتائج');
    XLSX.writeFile(wb, `نتائج_اختبار_${exam?.title || 'تصدير'}.xlsx`);
  };

  const exportToPDF = () => window.print();

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-t-4 border-indigo-600"></div></div>;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-8 pb-24 print:m-0 print:p-0" dir="rtl">
      
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 1cm; }
          body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; }
          .no-print, header, nav, footer, button { display: none !important; }
          .print-only { display: block !important; }
          .glass-card { box-shadow: none !important; border: 1px solid #e2e8f0 !important; background: white !important; }
        }
      `}</style>
      
      <div className="hidden print:block w-full">
        <div className="text-center mb-8 border-b-2 border-slate-200 pb-6">
          <h1 className="text-3xl font-black text-slate-900 mb-2">{exam?.title}</h1>
          <p className="text-lg text-slate-600 font-bold">{exam?.subject_name}</p>
          <p className="text-sm text-slate-500 mt-2">الفصل: {selectedSection === 'all' ? 'جميع الفصول' : selectedSection} | تاريخ التقرير: {new Date().toLocaleDateString('ar-SA')}</p>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100"><p className="text-xs text-slate-500 font-bold mb-1">المتوسط</p><p className="text-xl font-black text-indigo-600" dir="ltr">{stats?.avg_score}%</p></div>
          <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100"><p className="text-xs text-slate-500 font-bold mb-1">نسبة النجاح</p><p className="text-xl font-black text-emerald-600" dir="ltr">{stats?.pass_rate}%</p></div>
          <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100"><p className="text-xs text-slate-500 font-bold mb-1">المتقدمين</p><p className="text-xl font-black text-blue-600">{stats?.total_attempts}</p></div>
          <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100"><p className="text-xs text-slate-500 font-bold mb-1">الغائبين</p><p className="text-xl font-black text-amber-600">{stats?.absent_count}</p></div>
        </div>
        <table className="w-full text-right border-collapse">
          <thead><tr className="bg-slate-100 text-slate-700 text-sm font-black"><th className="p-3 border border-slate-200">الطالب</th><th className="p-3 border border-slate-200">الفصل</th><th className="p-3 border border-slate-200">الدرجة</th><th className="p-3 border border-slate-200">النسبة</th><th className="p-3 border border-slate-200">الحالة</th></tr></thead>
          <tbody>
            {filteredAttempts.map((attempt) => {
              const maxScore = exam?.max_score || 100;
              const studentPercentage = (attempt.score / maxScore) * 100;
              const isPassed = studentPercentage >= (exam?.passing_score || 50);
              return (
                <tr key={attempt.id} className="border-b border-slate-100">
                  <td className="p-3 text-sm font-bold text-slate-900 border border-slate-200">{attempt.student.full_name}</td>
                  <td className="p-3 text-sm text-slate-600 border border-slate-200">{attempt.student.section_name}</td>
                  <td className="p-3 text-sm font-black text-indigo-600 border border-slate-200" dir="ltr">{attempt.status === 'not_attempted' ? '-' : `${attempt.score} / ${maxScore}`}</td>
                  <td className="p-3 text-sm font-bold border border-slate-200" dir="ltr">{attempt.status === 'not_attempted' ? '-' : `${Math.round(studentPercentage)}%`}</td>
                  <td className="p-3 text-sm font-bold border border-slate-200"><span className={attempt.status === 'not_attempted' ? 'text-slate-400' : isPassed ? 'text-emerald-600' : 'text-red-600'}>{attempt.status === 'not_attempted' ? 'غائب' : isPassed ? 'ناجح' : 'راسب'}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="glass-card p-6 rounded-[40px] shadow-2xl border border-white/60 bg-white print:hidden space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <button onClick={() => router.back()} className="h-14 w-14 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all"><ArrowRight size={24} /></button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">{exam?.title}</h1>
              <p className="text-slate-500 font-bold mt-1 text-sm">{exam?.subject_name} • الدرجة الكلية: {exam?.max_score || 100}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={exportToExcel} className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-50 text-emerald-700 font-black hover:bg-emerald-100 transition-all"><FileSpreadsheet size={18} /> Excel</button>
            <button onClick={exportToPDF} className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 text-white font-black hover:bg-indigo-700 transition-all"><Download size={18} /> PDF</button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 border-t border-slate-100 pt-6">
          <div className="relative flex-1 group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input type="text" placeholder="البحث عن طالب..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pr-12 pl-4 py-4 rounded-2xl bg-slate-50 border-0 ring-1 ring-slate-100 font-bold focus:ring-2 focus:ring-indigo-600 transition-all" />
          </div>
          <div className="relative group md:w-64">
            <Filter className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} className="w-full pr-12 pl-4 py-4 rounded-2xl bg-slate-50 border-0 ring-1 ring-slate-100 font-bold focus:ring-2 focus:ring-indigo-600 transition-all appearance-none cursor-pointer">
              <option value="all">جميع الفصول</option>
              {availableSections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 print:hidden">
        {[
          { label: 'متوسط الأداء', value: `${stats?.avg_score || 0}%`, icon: BarChart2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'نسبة النجاح', value: `${stats?.pass_rate || 0}%`, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'المتقدمين', value: stats?.total_attempts || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'الغائبين', value: stats?.absent_count || 0, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-6 rounded-3xl border border-white/60 shadow-xl bg-white flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className={`h-12 w-12 rounded-2xl ${stat.bg} flex items-center justify-center`}><stat.icon className={`h-6 w-6 ${stat.color}`} /></div>
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-3xl font-black text-slate-900 mt-1" dir="ltr">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        <div className="lg:col-span-2 glass-card p-8 rounded-3xl border border-white/60 shadow-xl bg-white h-[400px] flex flex-col">
          <h3 className="text-xl font-black text-slate-900 mb-6">أداء الأسئلة (نسبة الإجابات الصحيحة)</h3>
          <div className="flex-1 w-full">
            {questionAnalytics.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={questionAnalytics} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="correct" radius={[8, 8, 0, 0]} barSize={32}>
                    {questionAnalytics.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.correct < 50 ? '#ef4444' : '#4f46e5'} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-400 font-bold">لا توجد بيانات</div>}
          </div>
        </div>

        <div className="glass-card p-8 rounded-3xl border border-white/60 shadow-xl bg-white h-[400px] flex flex-col">
          <h3 className="text-xl font-black text-slate-900 mb-6">توزيع الدرجات</h3>
          <div className="flex-1 w-full relative">
            {scoreDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={scoreDistribution} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                    {scoreDistribution.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-400 font-bold">لا توجد بيانات</div>}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-[40px] border border-white/60 shadow-2xl overflow-hidden bg-white print:hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex flex-wrap gap-3 bg-slate-50/50">
          {[
            { id: 'all', label: 'الجميع', icon: Users },
            { id: 'attempted', label: 'المتقدمين', icon: CheckCircle },
            { id: 'not_attempted', label: 'الغائبين', icon: MinusCircle },
            { id: 'passed', label: 'الناجحين', icon: GraduationCap },
            { id: 'failed', label: 'الراسبين', icon: XCircle },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-black transition-all border-2 ${
                statusFilter === f.id 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                  : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-400 hover:text-indigo-600'
              }`}
            >
              <f.icon size={16} /> {f.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-white text-slate-400 text-xs font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-8 py-5">الطالب</th>
                <th className="px-8 py-5 text-center">الدرجة</th>
                <th className="px-8 py-5 text-center">النسبة</th>
                <th className="px-8 py-5 text-center">الحالة</th>
                <th className="px-8 py-5 text-left">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedAttempts.length > 0 ? (
                paginatedAttempts.map((attempt) => {
                  const maxScore = exam?.max_score || 100;
                  const studentPercentage = (attempt.score / maxScore) * 100;
                  const isPassed = studentPercentage >= (exam?.passing_score || 50);

                  return (
                    <tr key={attempt.id} className="hover:bg-slate-50 transition-all group">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black">
                            {attempt.student.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900">{attempt.student.full_name}</p>
                            <p className="text-xs text-slate-500 font-bold">{attempt.student.section_name}</p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-8 py-4 text-center">
                        {attempt.status === 'not_attempted' ? (
                          <span className="text-slate-300 font-bold">-</span>
                        ) : (
                          <div className="inline-flex items-center justify-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100" dir="ltr">
                            <span className="text-lg font-black text-indigo-600">{attempt.score}</span>
                            <span className="text-slate-400 font-bold text-xs">/</span>
                            <span className="text-slate-500 font-black text-sm">{maxScore}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-8 py-4 text-center font-black text-slate-600" dir="ltr">
                         {attempt.status === 'not_attempted' ? '-' : `${Math.round(studentPercentage)}%`}
                      </td>

                      <td className="px-8 py-4 text-center">
                        <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                          attempt.status === 'not_attempted' ? 'bg-slate-50 text-slate-500 border-slate-100'
                          : isPassed ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
                        }`}>
                          {attempt.status === 'not_attempted' ? 'غائب' : isPassed ? 'ناجح' : 'راسب'}
                        </span>
                      </td>
                      
                      <td className="px-8 py-4 text-left">
                        <div className="flex items-center gap-2 justify-end opacity-50 group-hover:opacity-100 transition-opacity">
                          {attempt.status !== 'not_attempted' && (
                            <>
                              <button onClick={() => router.push(`/exams/results/${params.id}/student/${attempt.student.id}`)} className="h-9 w-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all" title="ورقة الاختبار"><Eye className="h-4 w-4" /></button>
                              <button onClick={() => handleDeleteAttempt(attempt.id)} className="h-9 w-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 shadow-sm transition-all" title="إلغاء المحاولة"><Trash2 className="h-4 w-4" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr><td colSpan={5} className="py-20 text-center text-slate-400 font-bold text-lg">لا توجد نتائج مطابقة لهذه الفلترة.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-500">
              إظهار {((currentPage - 1) * itemsPerPage) + 1} إلى {Math.min(currentPage * itemsPerPage, filteredAttempts.length)} من أصل {filteredAttempts.length} طالب
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm"
              >
                <ChevronRight size={18} />
              </button>
              <div className="flex items-center gap-1 px-4 font-black text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm">
                 {currentPage} / {totalPages}
              </div>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage === totalPages}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm"
              >
                <ChevronLeft size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


