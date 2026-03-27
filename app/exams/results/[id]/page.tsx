'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BarChart2, Users, CheckCircle, AlertCircle, ArrowRight, Download, Search, Filter, Eye, Trash2, FileSpreadsheet } from 'lucide-react';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import Link from 'next/link';

type Attempt = {
  id: string;
  student: { id: string; full_name: string, email: string, section_name: string };
  started_at: string;
  completed_at: string;
  score: number;
  status: string;
};

type ExamStats = { avg_score: number; max_score: number; min_score: number; pass_rate: number; total_attempts: number; };

export default function ExamResults() {
  const params = useParams();
  const router = useRouter();
  const { fetchExamResults, deleteAttempt } = useExamsSystem();
  
  const [exam, setExam] = useState<any>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ExamStats | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchExamResults(params.id as string);
      setExam(res.exam);

      const studentsData = res.students || [];
      const attemptsData = res.attempts || [];

      const formattedAttempts = attemptsData.map((a: any) => ({
        ...a,
        student: {
          id: a.student_id,
          full_name: studentsData.find((s:any) => s.id === a.student_id)?.full_name || 'غير معروف',
          email: studentsData.find((s:any) => s.id === a.student_id)?.email || '',
          section_name: studentsData.find((s:any) => s.id === a.student_id)?.section_name || 'غير محدد'
        }
      }));

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
      console.error('Error in results:', err);
    } finally {
      setLoading(false);
    }
  }, [params.id, fetchExamResults]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDeleteAttempt = async (attemptId: string) => {
    if (!window.confirm('هل أنت متأكد من الحذف؟')) return;
    if (!attemptId.startsWith('missing-')) await deleteAttempt(attemptId);
    setAttempts(prev => prev.map(a => a.id === attemptId ? { ...a, id: `missing-${a.student.id}`, status: 'not_attempted', score: 0 } : a));
  };

  useEffect(() => {
    if (!exam || attempts.length === 0) return;
    let filtered = attempts;
    if (selectedSection !== 'all') filtered = attempts.filter(a => a.student.section_name === selectedSection);
    
    // إحصائيات للمتقدمين فقط
    const completedAttempts = filtered.filter(a => a.status !== 'not_attempted');
    
    if (completedAttempts.length > 0) {
      const scores = completedAttempts.map(a => a.score);
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
    } else {
      setStats({ avg_score: 0, max_score: 0, min_score: 0, pass_rate: 0, total_attempts: 0 });
    }
  }, [attempts, selectedSection, exam]);

  const filteredAttempts = attempts.filter(a => {
    return (selectedSection === 'all' || a.student.section_name === selectedSection) &&
           (!searchQuery || a.student.full_name.includes(searchQuery));
  });

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-4 border-indigo-600"></div></div>;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-10 pb-24" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="flex items-center gap-6">
          <button onClick={() => router.back()} className="h-14 w-14 flex items-center justify-center glass-card rounded-2xl text-slate-500 hover:text-indigo-600"><ArrowRight size={24} /></button>
          <div>
            <h1 className="text-4xl font-black text-slate-900">{exam?.title}</h1>
            <p className="text-slate-500 font-bold mt-2">نتائج مادة: {exam?.subject?.name || 'غير محدد'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[{ label: 'متوسط الدرجات', value: `${stats?.avg_score || 0}%`, icon: BarChart2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'نسبة النجاح', value: `${stats?.pass_rate || 0}%`, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'أعلى درجة', value: `${stats?.max_score || 0}%`, icon: BarChart2, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'إجمالي المحاولات', value: stats?.total_attempts || 0, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' }
        ].map((stat, i) => (
          <div key={i} className="glass-card p-8 rounded-3xl border border-white/60 shadow-xl flex items-center gap-6">
            <div className={`h-14 w-14 rounded-2xl ${stat.bg} flex items-center justify-center`}><stat.icon className={`h-7 w-7 ${stat.color}`} /></div>
            <div><p className="text-xs font-black text-slate-400 uppercase">{stat.label}</p><p className="text-3xl font-black text-slate-900">{stat.value}</p></div>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-[40px] border border-white/60 shadow-2xl p-8 space-y-8">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <h2 className="text-2xl font-black text-slate-900">سجل الطلاب</h2>
          <div className="flex gap-4">
            <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} className="p-4 rounded-2xl bg-slate-50 border-0 ring-1 ring-slate-100 font-bold"><option value="all">جميع الفصول</option>{availableSections.map(s => <option key={s} value={s}>{s}</option>)}</select>
            <input type="text" placeholder="بحث باسم الطالب..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="p-4 rounded-2xl bg-slate-50 border-0 ring-1 ring-slate-100 font-bold" />
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-right bg-white">
            <thead className="bg-slate-50 text-slate-500 font-black text-sm"><tr><th className="p-6">الطالب</th><th className="p-6">الفصل</th><th className="p-6">الدرجة</th><th className="p-6">الحالة</th><th className="p-6 text-left">إجراءات</th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAttempts.map(a => (
                <tr key={a.id} className="hover:bg-slate-50/50">
                  <td className="p-6 font-black text-slate-800">{a.student.full_name}</td>
                  <td className="p-6 font-bold text-slate-500">{a.student.section_name}</td>
                  <td className="p-6 font-black text-indigo-600">{a.status === 'not_attempted' ? '-' : `${a.score}%`}</td>
                  <td className="p-6"><span className={`px-4 py-2 rounded-xl text-xs font-black ${a.status === 'not_attempted' ? 'bg-slate-100 text-slate-500' : a.score >= (exam?.passing_score || 50) ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{a.status === 'not_attempted' ? 'لم يتقدم' : a.score >= (exam?.passing_score || 50) ? 'ناجح' : 'راسب'}</span></td>
                  <td className="p-6">
                    <div className="flex justify-end gap-2">
                      {a.status !== 'not_attempted' && <Link href={`/exams/results/${params.id}/student/${a.student.id}`} className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><Eye size={18} /></Link>}
                      {a.status !== 'not_attempted' && <button onClick={() => handleDeleteAttempt(a.id)} className="h-10 w-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center"><Trash2 size={18} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


