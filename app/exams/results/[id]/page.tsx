'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  BarChart2, Users, Clock, CheckCircle, 
  XCircle, AlertCircle, ArrowRight, Download,
  Search, Filter, MoreHorizontal, ChevronRight,
  TrendingUp, TrendingDown, HelpCircle, FileSpreadsheet,
  FileText
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type Attempt = {
  id: string;
  student: { full_name: string, email: string, section_name: string };
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
  const [allStudents, setAllStudents] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: examData } = await supabase
        .from('exams')
        .select('*, subject:subjects(name)')
        .eq('id', params.id)
        .single();
      setExam(examData);

      // Fetch all students in the assigned sections
      let currentAllStudents: any[] = [];
      if (examData?.section_ids && examData.section_ids.length > 0) {
        const { data: studentsData } = await supabase
          .from('students')
          .select(`
            id,
            users(full_name, email),
            section:sections(name, classes(name))
          `)
          .in('section_id', examData.section_ids);
        
        currentAllStudents = (studentsData || []).map(s => {
          const sectionData = s.section as any;
          const className = Array.isArray(sectionData?.classes) ? sectionData?.classes[0]?.name : sectionData?.classes?.name;
          const sectionName = sectionData?.name ? `${className ? className + ' - ' : ''}${sectionData.name}` : 'غير محدد';
          
          return {
            id: s.id,
            full_name: (s.users as any)?.full_name || 'طالب غير معروف',
            email: (s.users as any)?.email || '',
            section_name: sectionName
          };
        });
        setAllStudents(currentAllStudents);
      }

      const { data: attemptsData } = await supabase
        .from('exam_attempts')
        .select(`
          *,
          student:students(
            id, 
            users(full_name),
            section:sections(name, classes(name))
          )
        `)
        .eq('exam_id', params.id)
        .order('completed_at', { ascending: false });

      const formattedAttempts = (attemptsData || []).map(a => {
        const studentData = a.student as any;
        const sectionData = studentData?.section;
        const className = Array.isArray(sectionData?.classes) ? sectionData?.classes[0]?.name : sectionData?.classes?.name;
        const sectionName = sectionData?.name ? `${className ? className + ' - ' : ''}${sectionData.name}` : 'غير محدد';

        return {
          ...a,
          student: {
            id: studentData?.id,
            full_name: studentData?.users?.full_name || 'طالب غير معروف',
            section_name: sectionName
          }
        };
      });

      // Merge with all students to include those who didn't attempt
      const mergedAttempts = [...formattedAttempts];
      const attemptedStudentIds = new Set(formattedAttempts.map(a => a.student.id));

      currentAllStudents.forEach(student => {
        if (!attemptedStudentIds.has(student.id)) {
          mergedAttempts.push({
            id: `missing-${student.id}`,
            student: {
              id: student.id,
              full_name: student.full_name,
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

      // Extract unique sections for the filter
      const sections = Array.from(new Set(mergedAttempts.map(a => a.student.section_name))).filter(Boolean);
      setAvailableSections(sections);

      // Fetch Questions and Answers for real analytics
      const { data: qData } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', params.id)
        .order('order_index');
      
      setQuestionsData(qData || []);

      const { data: aData } = await supabase
        .from('student_answers')
        .select('*')
        .in('attempt_id', formattedAttempts.map(a => a.id));
        
      setAnswersData(aData || []);

    } catch (err) {
      console.error('Error fetching results:', err);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate stats whenever attempts or selected section changes
  useEffect(() => {
    if (!exam) return;

    let filteredAttempts = attempts;
    if (selectedSection !== 'all') {
      filteredAttempts = attempts.filter(a => a.student.section_name === selectedSection);
    }

    if (searchQuery) {
      filteredAttempts = filteredAttempts.filter(a => 
        a.student.full_name.includes(searchQuery)
      );
    }

    if (filteredAttempts.length > 0) {
      const scores = filteredAttempts.map(a => a.score);
      const maxPossibleScore = exam.max_score || 100;
      const percentageScores = scores.map(s => (s / maxPossibleScore) * 100);
      
      const avg = percentageScores.reduce((a, b) => a + b, 0) / percentageScores.length;
      setStats({
        avg_score: Math.round(avg),
        max_score: Math.round(Math.max(...percentageScores)),
        min_score: Math.round(Math.min(...percentageScores)),
        pass_rate: Math.round((percentageScores.filter(s => s >= 50).length / percentageScores.length) * 100),
        total_attempts: scores.length
      });

      // Calculate Question Analytics
      if (questionsData.length > 0 && answersData.length > 0) {
        // Filter answers to only include those from the filtered attempts
        const validAttemptIds = new Set(filteredAttempts.map(a => a.id));
        const filteredAnswers = answersData.filter(a => validAttemptIds.has(a.attempt_id));

        const analytics = questionsData.map((q, idx) => {
          const qAnswers = filteredAnswers.filter(a => a.question_id === q.id);
          const correctCount = qAnswers.filter(a => a.is_correct).length;
          const accuracy = qAnswers.length > 0 ? Math.round((correctCount / qAnswers.length) * 100) : 0;
          return {
            name: `سؤال ${idx + 1}`,
            correct: accuracy,
            type: q.type,
            id: q.id
          };
        });
        setQuestionAnalytics(analytics);
      }

      // Calculate Score Distribution for Pie Chart
      const distribution = [
        { name: 'ممتاز', value: percentageScores.filter(s => s >= 90).length },
        { name: 'جيد جداً', value: percentageScores.filter(s => s >= 80 && s < 90).length },
        { name: 'جيد', value: percentageScores.filter(s => s >= 70 && s < 80).length },
        { name: 'مقبول', value: percentageScores.filter(s => s >= 50 && s < 70).length },
        { name: 'ضعيف', value: percentageScores.filter(s => s < 50).length },
      ].filter(d => d.value > 0);
      
      setScoreDistribution(distribution.length > 0 ? distribution : [{ name: 'لا توجد بيانات', value: 1 }]);

    } else {
      setStats({
        avg_score: 0,
        max_score: 0,
        min_score: 0,
        pass_rate: 0,
        total_attempts: 0
      });
      setQuestionAnalytics([]);
      setScoreDistribution([]);
    }
  }, [attempts, selectedSection, searchQuery, exam, questionsData, answersData]);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const filteredAttempts = attempts.filter(a => {
    const matchesSection = selectedSection === 'all' || a.student.section_name === selectedSection;
    const matchesSearch = !searchQuery || 
      a.student.full_name.includes(searchQuery);
    return matchesSection && matchesSearch;
  });

  const exportToExcel = () => {
    const data = filteredAttempts.map(a => ({
      'الطالب': a.student.full_name,
      'الفصل': a.student.section_name,
      'تاريخ التقديم': new Date(a.completed_at).toLocaleDateString('ar-SA'),
      'الدرجة (%)': a.score,
      'الحالة': a.score >= (exam?.passing_score || 50) ? 'ناجح' : 'راسب'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    
    // Add RTL support to the worksheet
    if (!ws['!cols']) ws['!cols'] = [];
    ws['!dir'] = 'rtl';

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'النتائج');
    XLSX.writeFile(wb, `${exam?.title || 'نتائج_الاختبار'}.xlsx`);
  };

  const exportToPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-10 pb-24 print:m-0 print:p-0">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 1cm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .glass-card {
            box-shadow: none !important;
            border: 1px solid #e2e8f0 !important;
            background: white !important;
          }
        }
      `}</style>
      
      {/* Hidden Printable Area for PDF Export */}
      <div className="hidden print:block w-full" dir="rtl">
        <div className="text-center mb-8 border-b-2 border-slate-200 pb-6">
          <h1 className="text-3xl font-black text-slate-900 mb-2">{exam?.title}</h1>
          <p className="text-lg text-slate-600 font-bold">{exam?.subject?.name}</p>
          <p className="text-sm text-slate-500 mt-2">تاريخ التقرير: {new Date().toLocaleDateString('ar-SA')}</p>
        </div>
        
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
            <p className="text-xs text-slate-500 font-bold mb-1">متوسط الدرجات</p>
            <p className="text-xl font-black text-indigo-600">{stats?.avg_score}%</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
            <p className="text-xs text-slate-500 font-bold mb-1">نسبة النجاح</p>
            <p className="text-xl font-black text-emerald-600">{stats?.pass_rate}%</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
            <p className="text-xs text-slate-500 font-bold mb-1">أعلى درجة</p>
            <p className="text-xl font-black text-blue-600">{stats?.max_score}%</p>
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
              <th className="p-3 border border-slate-200">تاريخ التقديم</th>
              <th className="p-3 border border-slate-200">الدرجة</th>
              <th className="p-3 border border-slate-200">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {filteredAttempts.map((attempt) => (
              <tr key={attempt.id} className="border-b border-slate-100">
                <td className="p-3 text-sm font-bold text-slate-900 border border-slate-200">{attempt.student.full_name}</td>
                <td className="p-3 text-sm text-slate-600 border border-slate-200">{attempt.student.section_name}</td>
                <td className="p-3 text-sm text-slate-600 border border-slate-200">
                  {attempt.completed_at ? new Date(attempt.completed_at).toLocaleDateString('ar-SA') : 'لم يتقدم'}
                </td>
                <td className="p-3 text-sm font-black text-indigo-600 border border-slate-200" dir="ltr">{attempt.score}%</td>
                <td className="p-3 text-sm font-bold border border-slate-200">
                  <span className={attempt.status === 'not_attempted' ? 'text-slate-400' : attempt.score >= 50 ? 'text-emerald-600' : 'text-red-600'}>
                    {attempt.status === 'not_attempted' ? 'لم يتقدم' : attempt.score >= 50 ? 'ناجح' : 'راسب'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Header */}
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
                {exam?.subject?.name}
              </span>
              <span className="text-slate-300">•</span>
              <p className="text-lg">نتائج وتحليلات الاختبار</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3 self-start md:self-end">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-3 px-6 py-4 rounded-2xl glass-card border border-white/60 hover:bg-white/80 text-slate-600 font-black transition-all shadow-xl shadow-slate-200/50 active:scale-95"
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 print:hidden">
        {[
          { label: 'متوسط الدرجات', value: `${stats?.avg_score}%`, icon: BarChart2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'نسبة النجاح', value: `${stats?.pass_rate}%`, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'أعلى درجة', value: `${stats?.max_score}%`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'إجمالي المحاولات', value: stats?.total_attempts, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-8 rounded-4xl border border-white/60 shadow-2xl shadow-slate-200/50 relative overflow-hidden group"
          >
            <div className="absolute -right-4 -top-4 h-24 w-24 bg-slate-50 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 -z-10" />
            <div className="flex items-start justify-between mb-6">
              <div className={`h-14 w-14 rounded-2xl ${stat.bg} flex items-center justify-center shadow-inner`}>
                <stat.icon className={`h-7 w-7 ${stat.color}`} />
              </div>
            </div>
            <p className="text-sm font-black text-slate-500 mb-1 uppercase tracking-widest">{stat.label}</p>
            <p className="text-4xl font-black text-slate-900 tracking-tighter">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 print:hidden">
        {/* Main Chart */}
        <div className="lg:col-span-2 glass-card p-8 rounded-4xl border border-white/60 shadow-2xl shadow-slate-200/50 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">أداء الأسئلة</h3>
              <p className="text-slate-500 font-bold">تحليل دقة الإجابات لكل سؤال</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest">
                <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200" />
                <span>نسبة الإجابات الصحيحة</span>
              </div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={questionAnalytics} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc', radius: 12 }}
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px' }}
                />
                <Bar dataKey="correct" radius={[12, 12, 0, 0]} barSize={48}>
                  {questionAnalytics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.correct < 50 ? '#ef4444' : '#4f46e5'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {questionAnalytics.length > 0 && questionAnalytics.some(q => q.correct < 50) && (
            <div className="bg-red-50/50 p-6 rounded-3xl border border-red-100 flex items-start gap-4 animate-pulse">
              <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-lg font-black text-red-900 tracking-tight">
                  تنبيه: {questionAnalytics.sort((a, b) => a.correct - b.correct)[0].name} يحتاج مراجعة
                </p>
                <p className="text-sm text-red-700 font-bold leading-relaxed">
                  نسبة الإجابة الصحيحة منخفضة جداً ({questionAnalytics.sort((a, b) => a.correct - b.correct)[0].correct}%). قد يكون السؤال غير واضح أو صعب جداً أو يحتاج لإعادة صياغة.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Score Distribution */}
        <div className="glass-card p-8 rounded-4xl border border-white/60 shadow-2xl shadow-slate-200/50 space-y-8">
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">توزيع الدرجات</h3>
            <p className="text-slate-500 font-bold">نظرة عامة على مستويات الطلاب</p>
          </div>
          <div className="h-[280px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={scoreDistribution}
                  innerRadius={75}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {scoreDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-black text-slate-900 tracking-tighter">{stats?.pass_rate}%</span>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">نسبة النجاح</span>
            </div>
          </div>
          <div className="space-y-4">
            {scoreDistribution.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full shadow-sm`} style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-sm font-bold text-slate-600">{item.name}</span>
                </div>
                <span className="text-sm font-black text-slate-900">
                  {Math.round((item.value / (stats?.total_attempts || 1)) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Student Results Tables */}
      <div className="space-y-8 print:hidden">
        {Object.entries(
          filteredAttempts.reduce((acc, attempt) => {
            const section = attempt.student.section_name;
            if (!acc[section]) acc[section] = [];
            acc[section].push(attempt);
            return acc;
          }, {} as Record<string, typeof filteredAttempts>)
        ).map(([sectionName, sectionAttempts], index) => (
          <div key={sectionName} className="glass-card rounded-4xl border border-white/60 shadow-2xl shadow-slate-200/50 overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">نتائج الطلاب - {sectionName}</h3>
                <p className="text-slate-500 font-bold">قائمة كاملة بمحاولات الطلاب ودرجاتهم في هذا الفصل</p>
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
                    <th className="px-8 py-6">الفصل</th>
                    <th className="px-8 py-6">تاريخ التقديم</th>
                    <th className="px-8 py-6">الوقت المستغرق</th>
                    <th className="px-8 py-6">الدرجة</th>
                    <th className="px-8 py-6">الحالة</th>
                    <th className="px-8 py-6 text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sectionAttempts.map((attempt) => (
                    <tr key={attempt.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-lg shadow-inner">
                            {attempt.student.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-base font-black text-slate-900 tracking-tight">{attempt.student.full_name}</p>
                            <p className="text-xs text-slate-500 font-bold">{attempt.student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-sm font-bold text-slate-600">
                        <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold">
                          {attempt.student.section_name}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-sm font-bold text-slate-600">
                        {attempt.completed_at 
                          ? new Date(attempt.completed_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
                          : 'لم يتم التقديم'}
                      </td>
                      <td className="px-8 py-6 text-sm font-bold text-slate-600">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span>
                            {attempt.completed_at && attempt.started_at
                              ? `${Math.round((new Date(attempt.completed_at).getTime() - new Date(attempt.started_at).getTime()) / 60000)} دقيقة`
                              : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-2 w-24 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${attempt.status === 'not_attempted' ? 'bg-slate-300' : attempt.score >= 50 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]'}`}
                              style={{ width: `${attempt.score}%` }}
                            />
                          </div>
                          <span className={`text-base font-black tracking-tighter ${attempt.status === 'not_attempted' ? 'text-slate-400' : attempt.score >= 50 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {attempt.score}%
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`inline-flex px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border ${
                          attempt.status === 'not_attempted'
                            ? 'bg-slate-50 text-slate-500 border-slate-100'
                            : attempt.score >= 50 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : 'bg-red-50 text-red-700 border-red-100'
                        }`}>
                          {attempt.status === 'not_attempted' ? 'لم يتقدم' : attempt.score >= 50 ? 'ناجح' : 'راسب'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-left">
                        <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:shadow-md transition-all active:scale-95">
                          <ChevronRight className="h-5 w-5 rotate-180" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {filteredAttempts.length === 0 && (
          <div className="glass-card rounded-4xl border border-white/60 shadow-2xl shadow-slate-200/50 overflow-hidden p-12 text-center">
            <p className="text-slate-500 font-bold">لا توجد نتائج مطابقة للبحث</p>
          </div>
        )}
      </div>
    </div>
  );
}
