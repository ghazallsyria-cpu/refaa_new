'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import { ArrowRight, Users, CheckCircle2, AlertCircle, Eye, Search, Trash2, Trophy, Clock, BookOpen, Filter } from 'lucide-react';

export default function TeacherExamResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  
  const { fetchExamResults, deleteAttempt } = useExamsSystem();
  
  const [examData, setExamData] = useState<any>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await fetchExamResults(params.id as string);
      if (data) {
        setExamData(data.exam);
        setAttempts(data.attempts || []);
      }
    } catch (err) {
      console.error('Error fetching results:', err);
    } finally {
      setLoading(false);
    }
  }, [params.id, user, fetchExamResults]);

  useEffect(() => {
    if (user && currentRole === 'student') {
      router.replace(`/exams/results/${params.id}/student/${user.id}`);
    } else if (user) {
      loadData();
    }
  }, [user, currentRole, params.id, router, loadData]);

  const handleDeleteAttempt = async (attemptId: string) => {
    if (!confirm('هل أنت متأكد من حذف نتيجة هذا الطالب؟ سيتمكن من إعادة الاختبار.')) return;
    
    setIsDeleting(attemptId);
    try {
      await deleteAttempt(attemptId);
      await loadData(); 
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء الحذف');
    } finally {
      setIsDeleting(null);
    }
  };

  if (currentRole === 'student') {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
         <p className="text-slate-500 font-bold animate-pulse">جاري تحميل نتائج الطلاب...</p>
      </div>
    );
  }

  const filteredAttempts = attempts.filter((attempt: any) => {
     const studentName = attempt?.student?.users?.full_name || 'طالب مجهول';
     const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase());
     const matchesStatus = statusFilter === 'all' 
        ? true 
        : statusFilter === 'pending' 
          ? attempt.status !== 'graded' 
          : attempt.status === 'graded';
          
     return matchesSearch && matchesStatus;
  });

  const gradedAttempts = attempts.filter(a => a.status === 'graded');
  const pendingCount = attempts.length - gradedAttempts.length;

  const averageScore = gradedAttempts.length > 0 
    ? Math.round(gradedAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / gradedAttempts.length) 
    : 0;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-8 pb-24" dir="rtl">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.push('/exams')}
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100"
        >
          <ArrowRight className="h-5 w-5" />
          العودة للاختبارات
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -ml-10 -mt-10"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="h-6 w-6 text-indigo-600" />
              <h2 className="text-sm font-bold text-indigo-600 tracking-widest uppercase">نتائج الاختبار</h2>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-4">{examData?.title || 'جاري التحميل...'}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-slate-600">
               <span className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                 العلامة الكاملة: {examData?.total_marks || examData?.max_score || 0}
               </span>
               <span className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 flex items-center gap-1">
                 <Clock className="h-4 w-4" /> {examData?.duration || 0} دقيقة
               </span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-3xl shadow-xl shadow-indigo-200 flex flex-col justify-center text-white relative overflow-hidden">
          <div className="flex justify-between items-start mb-6 relative z-10">
             <div>
                <div className="text-indigo-100 font-bold mb-1 text-sm">متوسط العلامات</div>
                <div className="text-4xl font-black">{averageScore}</div>
             </div>
             <Trophy className="h-10 w-10 text-yellow-300 opacity-80" />
          </div>
          <div className="flex items-center justify-between border-t border-white/20 pt-4 relative z-10">
             <span className="text-indigo-100 font-bold text-sm">عدد التسليمات</span>
             <span className="bg-white/20 px-3 py-1 rounded-lg font-black text-white">{attempts.length}</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 group-focus-within:text-indigo-600">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            className="block w-full rounded-xl border-0 py-3 pr-12 pl-4 text-slate-900 bg-slate-50 focus:ring-2 focus:ring-indigo-600 sm:text-sm font-bold transition-all"
            placeholder="ابحث عن اسم الطالب..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="relative min-w-[200px] group">
          <div className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 pointer-events-none">
            <Filter className="h-5 w-5" />
          </div>
          <select
            className="block w-full rounded-xl border-0 py-3 pr-12 pl-4 text-slate-900 bg-slate-50 focus:ring-2 focus:ring-indigo-600 sm:text-sm font-bold transition-all appearance-none cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">جميع الطلاب ({attempts.length})</option>
            <option value="pending">بحاجة للتصحيح ({pendingCount})</option>
            <option value="graded">تم التقييم ({gradedAttempts.length})</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-lg shadow-slate-100 border border-slate-100 overflow-hidden">
        {filteredAttempts.length === 0 ? (
          <div className="text-center py-20">
            <Users className="h-16 w-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-500">لا توجد نتائج مسجلة أو مطابقة للبحث</h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-6 py-5 text-sm font-black text-slate-600">الطالب</th>
                  <th className="px-6 py-5 text-sm font-black text-slate-600 text-center">الدرجة</th>
                  <th className="px-6 py-5 text-sm font-black text-slate-600 text-center">الحالة</th>
                  <th className="px-6 py-5 text-sm font-black text-slate-600 text-center">تاريخ التسليم</th>
                  <th className="px-6 py-5 text-sm font-black text-slate-600 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttempts.map((attempt: any) => {
                  const studentName = attempt?.student?.users?.full_name || 'طالب مجهول';
                  const sectionName = attempt?.student?.section?.name ? `${attempt.student.section?.classes?.name || ''} - ${attempt.student.section.name}` : 'بدون فصل';
                  const date = new Date(attempt.completed_at || attempt.created_at);
                  const isPending = attempt.status !== 'graded';

                  return (
                    <tr key={attempt.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-black text-slate-900 text-base">{studentName}</div>
                        <div className="text-xs font-bold text-slate-500 mt-1">{sectionName}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center font-black px-4 py-1.5 rounded-xl text-base border ${isPending ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                          {isPending ? '؟' : (attempt.score || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {!isPending ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-lg text-xs border border-emerald-100">
                            <CheckCircle2 className="h-4 w-4" /> مقيّم
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 font-bold px-3 py-1 rounded-lg text-xs border border-amber-200 animate-pulse">
                            <AlertCircle className="h-4 w-4" /> يحتاج تصحيح
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-bold text-slate-500" dir="ltr">
                        {date.toLocaleDateString('en-GB')} {date.toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'})}
                      </td>
                      <td className="px-6 py-4">
                        {/* ✅ السر هنا: تم إزالة opacity-0 لتصبح الأزرار ظاهرة دائماً على الجوال */}
                        <div className="flex items-center justify-center gap-2 transition-opacity">
                          <button 
                            onClick={() => router.push(`/exams/results/${params.id}/student/${attempt.student_id}`)}
                            className="h-10 px-4 flex items-center gap-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                          >
                            <Eye className="h-4 w-4" /> التفاصيل
                          </button>
                          
                          <button 
                            onClick={() => handleDeleteAttempt(attempt.id)}
                            disabled={isDeleting === attempt.id}
                            title="حذف المحاولة (يتيح للطالب الإعادة)"
                            className="h-10 w-10 flex items-center justify-center bg-red-50 text-red-500 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all shadow-sm disabled:opacity-50"
                          >
                            {isDeleting === attempt.id ? (
                              <div className="h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


