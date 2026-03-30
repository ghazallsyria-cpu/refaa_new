'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import { 
  ArrowRight, Users, CheckCircle2, AlertCircle, Eye, 
  Search, Trash2, Trophy, Clock, BookOpen, Edit3, Filter, 
  BarChart3, PieChart, Activity
} from 'lucide-react';

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
    if (!confirm('هل أنت متأكد من حذف نتيجة هذا الطالب؟ سيتم مسح إجاباته وسيتكمن من إعادة الاختبار.')) return;
    
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
         <p className="text-slate-500 font-bold animate-pulse">جاري تحميل لوحة الإحصائيات والنتائج...</p>
      </div>
    );
  }

  // --------------------------------------------------------
  // 🧮 هندسة البيانات (Data Architecture & Analytics)
  // --------------------------------------------------------
  const maxScore = examData?.total_marks || examData?.max_score || 1;
  const gradedAttempts = attempts.filter(a => a.status === 'graded');
  const pendingAttempts = attempts.filter(a => a.status !== 'graded');
  
  const averageScore = gradedAttempts.length > 0 
    ? Math.round(gradedAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / gradedAttempts.length) 
    : 0;

  // 📊 حساب توزيع الدرجات للرسم البياني (Score Distribution)
  const distribution = { excellent: 0, good: 0, average: 0, poor: 0 };
  gradedAttempts.forEach(a => {
    const percentage = ((a.score || 0) / maxScore) * 100;
    if (percentage >= 85) distribution.excellent++;
    else if (percentage >= 75) distribution.good++;
    else if (percentage >= 50) distribution.average++;
    else distribution.poor++;
  });
  
  const maxDistCount = Math.max(distribution.excellent, distribution.good, distribution.average, distribution.poor, 1);

  // 🍩 حسابات المخطط الدائري (Donut Chart)
  const totalSubmissions = attempts.length || 1;
  const gradedPercentage = Math.round((gradedAttempts.length / totalSubmissions) * 100);
  const circleCircumference = 2 * Math.PI * 40; // 40 is the radius
  const strokeDashoffset = circleCircumference - (gradedPercentage / 100) * circleCircumference;

  // 🔍 الفلترة
  const filteredAttempts = attempts.filter((attempt: any) => {
     const studentName = attempt?.student?.users?.full_name || 'طالب مجهول';
     const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase());
     const matchesStatus = statusFilter === 'all' 
        ? true : statusFilter === 'pending' 
        ? attempt.status !== 'graded' : attempt.status === 'graded';
     return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-8 pb-24" dir="rtl">
      
      {/* 🚀 Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{examData?.title || 'لوحة النتائج'}</h1>
          <p className="text-slate-500 font-bold mt-1 flex items-center gap-2">
            <Clock className="w-4 h-4" /> {examData?.duration || 0} دقيقة | العلامة الكاملة: {maxScore}
          </p>
        </div>
        <button onClick={() => router.push('/exams')} className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 font-bold bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-200 transition-all hover:shadow-md">
          <ArrowRight className="h-5 w-5" /> العودة للاختبارات
        </button>
      </div>

      {/* 📊 KPI Cards (شريط الإحصائيات السريع) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center">
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600"><Users className="w-6 h-6" /></div>
              <span className="text-3xl font-black text-slate-800">{attempts.length}</span>
           </div>
           <p className="text-slate-500 font-bold">إجمالي التسليمات</p>
        </div>
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center">
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-purple-50 rounded-2xl text-purple-600"><Trophy className="w-6 h-6" /></div>
              <span className="text-3xl font-black text-slate-800">{averageScore}</span>
           </div>
           <p className="text-slate-500 font-bold">متوسط العلامات</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center">
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600"><CheckCircle2 className="w-6 h-6" /></div>
              <span className="text-3xl font-black text-slate-800">{gradedAttempts.length}</span>
           </div>
           <p className="text-slate-500 font-bold">تم تصحيحه</p>
        </div>

        <div className={`p-6 rounded-3xl shadow-sm border flex flex-col justify-center transition-colors ${pendingAttempts.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
           <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${pendingAttempts.length > 0 ? 'bg-amber-200/50 text-amber-700' : 'bg-slate-50 text-slate-400'}`}><Edit3 className="w-6 h-6" /></div>
              <span className={`text-3xl font-black ${pendingAttempts.length > 0 ? 'text-amber-700' : 'text-slate-800'}`}>{pendingAttempts.length}</span>
           </div>
           <p className={`font-bold ${pendingAttempts.length > 0 ? 'text-amber-600' : 'text-slate-500'}`}>بانتظار المراجعة</p>
        </div>
      </div>

      {/* 📈 Charts Section (الرسوم البيانية المعمارية) */}
      {attempts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* المخطط الشريطي: توزيع المستويات */}
          <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
             <div className="flex items-center gap-3 mb-8">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl font-black text-slate-800">توزيع مستويات الطلاب (المصححة)</h2>
             </div>
             
             <div className="space-y-5">
                {[
                  { label: 'ممتاز (85-100%)', count: distribution.excellent, color: 'bg-emerald-500' },
                  { label: 'جيد جداً (75-84%)', count: distribution.good, color: 'bg-blue-500' },
                  { label: 'متوسط (50-74%)', count: distribution.average, color: 'bg-amber-400' },
                  { label: 'ضعيف (أقل من 50%)', count: distribution.poor, color: 'bg-red-500' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="w-32 text-sm font-bold text-slate-600 shrink-0">{item.label}</div>
                    <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden flex">
                      <div 
                        className={`h-full rounded-full ${item.color} transition-all duration-1000 ease-out`} 
                        style={{ width: `${(item.count / maxDistCount) * 100}%` }}
                      ></div>
                    </div>
                    <div className="w-8 text-left font-black text-slate-700">{item.count}</div>
                  </div>
                ))}
             </div>
          </div>

          {/* المخطط الدائري: تقدم التصحيح */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
             <div className="flex items-center gap-3 mb-6 w-full justify-start">
                <PieChart className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl font-black text-slate-800">إنجاز التصحيح</h2>
             </div>
             
             <div className="relative w-48 h-48 flex items-center justify-center">
                {/* SVG Donut Chart */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="96" cy="96" r="40" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                  <circle 
                    cx="96" cy="96" r="40" stroke="currentColor" strokeWidth="12" fill="transparent" 
                    className={`${gradedPercentage === 100 ? 'text-emerald-500' : 'text-indigo-600'} transition-all duration-1000 ease-out`}
                    strokeDasharray={circleCircumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <span className="text-3xl font-black text-slate-800">{gradedPercentage}%</span>
                </div>
             </div>
             <p className="text-slate-500 font-bold mt-4 text-center">
               تم تصحيح {gradedAttempts.length} من أصل {attempts.length} اختبار
             </p>
          </div>
        </div>
      )}

      {/* 🔍 أدوات البحث والفلترة */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 right-0 flex items-center pr-5 text-slate-400">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            className="block w-full rounded-2xl border border-slate-200 py-4 pr-14 pl-4 text-slate-900 bg-slate-50/50 focus:ring-2 focus:ring-indigo-600 focus:bg-white font-bold transition-all outline-none"
            placeholder="ابحث عن اسم الطالب..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="relative min-w-[240px] group">
          <div className="absolute inset-y-0 right-0 flex items-center pr-5 text-slate-400 pointer-events-none">
            <Filter className="h-5 w-5" />
          </div>
          <select
            className="block w-full rounded-2xl border border-slate-200 py-4 pr-14 pl-4 text-slate-900 bg-slate-50/50 focus:ring-2 focus:ring-indigo-600 focus:bg-white font-bold transition-all outline-none appearance-none cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">جميع الطلاب ({attempts.length})</option>
            <option value="pending">بانتظار التصحيح ({pendingAttempts.length})</option>
            <option value="graded">مكتمل التقييم ({gradedAttempts.length})</option>
          </select>
        </div>
      </div>

      {/* 📋 جدول الطلاب الذكي */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {filteredAttempts.length === 0 ? (
          <div className="text-center py-20">
            <Users className="h-16 w-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-500">
                {statusFilter === 'pending' ? 'عمل رائع! لا يوجد اختبارات بانتظار التصحيح 👏' : 'لا توجد نتائج مسجلة'}
            </h3>
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
                    <tr key={attempt.id} className={`transition-colors group ${isPending ? 'bg-amber-50/10 hover:bg-amber-50/40' : 'hover:bg-slate-50/80'}`}>
                      <td className="px-6 py-5">
                        <div className="font-black text-slate-900 text-base">{studentName}</div>
                        <div className="text-xs font-bold text-slate-500 mt-1">{sectionName}</div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`inline-flex items-center justify-center font-black px-4 py-1.5 rounded-xl text-base border ${isPending ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                          {isPending ? '؟' : (attempt.score || 0)} <span className="text-xs ml-1 opacity-70">/ {maxScore}</span>
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        {!isPending ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-lg text-xs border border-emerald-100">
                            <CheckCircle2 className="h-4 w-4" /> مقيّم
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 font-bold px-3 py-1 rounded-lg text-xs border border-amber-200 animate-pulse">
                            <AlertCircle className="h-4 w-4" /> يحتاج لتصحيحك
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-center text-sm font-bold text-slate-500" dir="ltr">
                        {date.toLocaleDateString('en-GB')} <span className="mx-1 text-slate-300">|</span> {date.toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'})}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-3">
                          
                          {/* 🎯 زر الإجراء الذكي */}
                          <button 
                            onClick={() => router.push(`/exams/results/${params.id}/student/${attempt.student_id}`)}
                            className={`h-11 px-5 flex items-center gap-2 rounded-xl font-bold transition-all shadow-sm ${
                                isPending 
                                ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200' 
                                : 'bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-100'
                            }`}
                          >
                            {isPending ? <Edit3 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            {isPending ? 'صحح الآن' : 'استعراض الإجابات'}
                          </button>
                          
                          <button 
                            onClick={() => handleDeleteAttempt(attempt.id)}
                            disabled={isDeleting === attempt.id}
                            title="إلغاء نتيجة الطالب (إتاحة الإعادة)"
                            className="h-11 w-11 flex items-center justify-center bg-white text-red-500 rounded-xl font-bold hover:bg-red-50 border border-red-100 transition-all shadow-sm disabled:opacity-50"
                          >
                            {isDeleting === attempt.id ? (
                              <div className="h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Trash2 className="h-5 w-5" />
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


