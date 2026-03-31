'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, BookOpen, Users, 
  BarChart2, Clock, MoreVertical, Edit2, 
  Trash2, Eye, Play, FileText, CheckCircle,
  TrendingUp, ArrowRight, AlertCircle, Lock, Trophy
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import { useAuth } from '@/context/auth-context';

// 🚀 دالة التحقق من القفل الزمني
const checkIsLocked = (exam: any) => {
  if (!exam?.exam_date) return false;
  try {
    const now = new Date();
    const examDate = new Date(exam.exam_date);
    const endTimeParts = (exam.end_time || '23:59').split(':');
    examDate.setHours(parseInt(endTimeParts[0], 10), parseInt(endTimeParts[1], 10), 0);
    return now <= examDate;
  } catch(e) {
    return false;
  }
};

export default function ExamsDashboard() {
  const { user, authRole, isChecking: authLoading } = useAuth();
  const { data: exams, loading: contentLoading, error: contentError, refetch: refresh, deleteExamWithMedia } = useExamsSystem();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const filteredExams = exams.filter(exam => {
    if (!exam) return false;
    const matchesSearch = (exam.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (exam.subject_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || exam.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (examId: string) => {
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذا الاختبار؟')) return;
    
    try {
      await deleteExamWithMedia(examId);
    } catch (err) {
      console.error('Error deleting exam:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-emerald-50';
      case 'draft': return 'bg-amber-50 text-amber-700 border-amber-100 shadow-amber-50';
      case 'archived': return 'bg-slate-50 text-slate-700 border-slate-100 shadow-slate-50';
      default: return 'bg-slate-50 text-slate-700 border-slate-100 shadow-slate-50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published': return 'منشور';
      case 'draft': return 'مسودة';
      case 'archived': return 'مؤرشف';
      default: return status;
    }
  };

  const isTeacherOrAdmin = authRole === 'teacher' || authRole === 'admin' || authRole === 'management';
  
  const getExamStatus = (exam: any) => {
    if (exam?.status !== 'published') return null;
    if (!exam?.exam_date) return 'available';
    
    try {
      const now = new Date();
      const examDate = new Date(exam.exam_date);
      
      const startTimeParts = (exam.start_time || '00:00').split(':');
      const endTimeParts = (exam.end_time || '23:59').split(':');
      
      const startDateTime = new Date(examDate);
      startDateTime.setHours(parseInt(startTimeParts[0] || '0'), parseInt(startTimeParts[1] || '0'), 0);
      
      const endDateTime = new Date(examDate);
      endDateTime.setHours(parseInt(endTimeParts[0] || '23'), parseInt(endTimeParts[1] || '59'), 0);
      
      if (now < startDateTime) return 'not_started';
      if (now > endDateTime) return 'expired';
      return 'available';
    } catch(e) {
      return 'available';
    }
  };

  if (!mounted || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 space-y-12">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-8"
        >
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-50 text-indigo-600 text-xs font-black uppercase tracking-widest">
              <FileText className="h-4 w-4" />
              نظام التقييم
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tight">الاختبارات</h1>
            <p className="text-xl text-slate-500 font-medium max-w-2xl">
              {isTeacherOrAdmin 
                ? 'قم بإنشاء وإدارة الاختبارات التفاعلية ومتابعة أداء الطلاب بدقة.' 
                : 'استعرض الاختبارات المتاحة لك وتابع نتائجك في مكان واحد.'}
            </p>
          </div>
          
          {isTeacherOrAdmin && (
            <Link href="/exams/builder/new">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center justify-center gap-3 rounded-3xl bg-indigo-600 px-10 py-5 text-base font-black text-white shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all self-start md:self-end"
              >
                <Plus className="h-6 w-6" />
                إنشاء اختبار جديد
              </motion.button>
            </Link>
          )}
        </motion.div>

        {/* Stats Overview for Teachers */}
        {isTeacherOrAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.0 }}
              className="glass-card p-8 rounded-[2.5rem] border border-white/60 shadow-xl flex items-center gap-6 transition-all hover:shadow-2xl hover:-translate-y-1"
            >
              <div className="h-16 w-16 rounded-3xl bg-blue-50 flex items-center justify-center shadow-xl shadow-blue-100">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-2">إجمالي الاختبارات</p>
                <p className="text-3xl font-black text-slate-900 tracking-tight leading-none">{exams.length}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-8 rounded-[2.5rem] border border-white/60 shadow-xl flex items-center gap-6 transition-all hover:shadow-2xl hover:-translate-y-1"
            >
              <div className="h-16 w-16 rounded-3xl bg-emerald-50 flex items-center justify-center shadow-xl shadow-emerald-100">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-2">اختبارات منشورة</p>
                <p className="text-3xl font-black text-slate-900 tracking-tight leading-none">{exams.filter(e => e?.status === 'published').length}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-8 rounded-[2.5rem] border border-white/60 shadow-xl flex items-center gap-6 transition-all hover:shadow-2xl hover:-translate-y-1"
            >
              <div className="h-16 w-16 rounded-3xl bg-amber-50 flex items-center justify-center shadow-xl shadow-amber-100">
                <Users className="h-8 w-8 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-2">إجمالي المحاولات</p>
                <p className="text-3xl font-black text-slate-900 tracking-tight leading-none">{exams.reduce((acc, e) => acc + (e?.submission_count || 0), 0)}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-8 rounded-[2.5rem] border border-white/60 shadow-xl flex items-center gap-6 transition-all hover:shadow-2xl hover:-translate-y-1"
            >
              <div className="h-16 w-16 rounded-3xl bg-indigo-50 flex items-center justify-center shadow-xl shadow-indigo-100">
                <TrendingUp className="h-8 w-8 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-2">متوسط النجاح</p>
                <p className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                  {(() => {
                    const totalAttempts = exams.reduce((acc, e) => acc + (e?.submission_count || 0), 0);
                    if (totalAttempts === 0) return '0%';
                    const totalScore = exams.reduce((acc, e) => {
                      return acc + (e?.avg_score || 0) * (e?.submission_count || 0);
                    }, 0);
                    return `${Math.round(totalScore / totalAttempts)}%`;
                  })()}
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {/* Filters Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white/60"
        >
          <div className="flex flex-col md:flex-row gap-8">
            <div className="relative flex-1 group">
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-6 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                <Search className="h-6 w-6" />
              </div>
              <input
                type="text"
                className="block w-full rounded-3xl border-0 py-5 pr-14 pl-6 text-slate-900 bg-slate-50/50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 sm:text-base transition-all font-bold"
                placeholder="البحث عن اختبار بالاسم أو المادة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {isTeacherOrAdmin && (
              <div className="relative md:w-80 group">
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-6 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <Filter className="h-6 w-6" />
                </div>
                <select
                  className="block w-full rounded-3xl border-0 py-5 pr-14 pl-6 text-slate-900 bg-slate-50/50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 sm:text-base transition-all font-bold appearance-none"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">جميع حالات النشر</option>
                  <option value="published">منشور</option>
                  <option value="draft">مسودة</option>
                  <option value="archived">مؤرشف</option>
                </select>
              </div>
            )}
          </div>
        </motion.div>

        {/* Exams List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {contentLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card rounded-[3rem] border border-white/60 h-[450px] animate-pulse bg-slate-50/50"></div>
            ))
          ) : filteredExams.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {filteredExams.map((exam, index) => {
                const pendingGradesCount = (exam.submission_count || 0) - (exam.graded_count || 0);
                const needsTeacherGrading = isTeacherOrAdmin && pendingGradesCount > 0;
                
                // التحويل النصي الآمن لحل مشكلة Type Error بشكل نهائي في Netlify
                const statusStr = String(exam.submission_status || '');

                return (
                  <motion.div
                    key={exam.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className="group glass-card rounded-[3rem] border border-white/60 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:-translate-y-2 transition-all overflow-hidden flex flex-col"
                  >
                    <div className="p-10 flex-1">
                      <div className="flex items-start justify-between mb-8 gap-2">
                        <div className={`px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border shadow-sm whitespace-nowrap ${getStatusColor(exam.status)}`}>
                          {getStatusLabel(exam.status)}
                        </div>

                        {needsTeacherGrading && (
                          <div className="flex-1 flex justify-end">
                            <div className="px-3 py-2 rounded-2xl text-[10px] font-black border shadow-sm bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1.5 animate-pulse">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>{pendingGradesCount} بحاجة لتصحيحك</span>
                            </div>
                          </div>
                        )}

                        {!isTeacherOrAdmin && exam.status === 'published' && (
                          <div className={`px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border shadow-sm whitespace-nowrap ${
                            getExamStatus(exam) === 'available' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            getExamStatus(exam) === 'not_started' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                            'bg-red-50 text-red-700 border-red-100'
                          }`}>
                            {getExamStatus(exam) === 'available' ? 'متاح الآن' :
                             getExamStatus(exam) === 'not_started' ? 'لم يبدأ بعد' :
                             'منتهي'}
                          </div>
                        )}
                        
                        {isTeacherOrAdmin && (
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                              <motion.button 
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="h-12 w-12 flex items-center justify-center rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-all bg-slate-50 border border-slate-100 shrink-0"
                              >
                                <MoreVertical className="h-6 w-6" />
                              </motion.button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                              <DropdownMenu.Content className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 p-3 min-w-[220px] z-50 animate-in fade-in zoom-in-95 duration-200">
                                <DropdownMenu.Item asChild>
                                  <Link href={`/exams/builder/${exam.id}`} className="flex items-center gap-4 px-5 py-4 text-sm font-black text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl outline-none cursor-pointer transition-colors">
                                    <Edit2 className="h-5 w-5" />
                                    <span>تعديل الاختبار</span>
                                  </Link>
                                </DropdownMenu.Item>
                                <DropdownMenu.Item asChild>
                                  <Link href={`/exams/results/${exam.id}`} className="flex items-center gap-4 px-5 py-4 text-sm font-black text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl outline-none cursor-pointer transition-colors">
                                    <BarChart2 className="h-5 w-5" />
                                    <span>النتائج والتحليلات</span>
                                  </Link>
                                </DropdownMenu.Item>
                                <DropdownMenu.Separator className="h-px bg-slate-100 my-3 mx-3" />
                                <DropdownMenu.Item 
                                  className="flex items-center gap-4 px-5 py-4 text-sm font-black text-red-600 hover:bg-red-50 rounded-2xl outline-none cursor-pointer transition-colors"
                                  onClick={() => handleDelete(exam.id)}
                                >
                                  <Trash2 className="h-5 w-5" />
                                  <span>حذف الاختبار</span>
                                </DropdownMenu.Item>
                                <DropdownMenu.Item asChild>
                                  <Link href={`/exams/take/${exam.id}`} className="flex items-center gap-4 px-5 py-4 text-sm font-black text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl outline-none cursor-pointer transition-colors">
                                    <Eye className="h-5 w-5" />
                                    <span>معاينة الاختبار</span>
                                  </Link>
                                </DropdownMenu.Item>
                              </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Root>
                        )}
                      </div>

                      <h3 className="text-3xl font-black text-slate-900 mb-4 group-hover:text-indigo-600 transition-colors tracking-tight leading-tight">
                        {exam.title}
                      </h3>
                      <p className="text-slate-500 font-medium line-clamp-2 mb-8 text-lg leading-relaxed">
                        {exam.description || 'لا يوجد وصف لهذا الاختبار'}
                      </p>

                      <div className="grid grid-cols-2 gap-5">
                        <div className="flex items-center gap-4 text-sm font-black text-slate-600 bg-slate-50/50 p-4 rounded-3xl border border-slate-100/50">
                          <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-indigo-500" />
                          </div>
                          <span className="truncate">{exam.subject_name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm font-black text-slate-600 bg-slate-50/50 p-4 rounded-3xl border border-slate-100/50">
                          <div className="h-10 w-10 rounded-2xl bg-amber-50 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-amber-500" />
                          </div>
                          <span>{exam.duration ? `${exam.duration} د` : 'مفتوح'}</span>
                        </div>
                        {isTeacherOrAdmin && (
                          <>
                            <div className="flex items-center gap-4 text-sm font-black text-slate-600 bg-slate-50/50 p-4 rounded-3xl border border-slate-100/50">
                              <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                                <FileText className="h-5 w-5 text-blue-500" />
                              </div>
                              <span>{exam.question_count || 0} سؤال</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm font-black text-slate-600 bg-slate-50/50 p-4 rounded-3xl border border-slate-100/50">
                              <div className="h-10 w-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                                <Users className="h-5 w-5 text-emerald-500" />
                              </div>
                              <span>{exam.submission_count || 0} محاولة</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                      {isTeacherOrAdmin ? (
                        <>
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center">
                              <TrendingUp className="h-6 w-6 text-indigo-600" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">متوسط الأداء</p>
                              <p className="text-xl font-black text-indigo-600 leading-none">{exam.avg_score || 0}%</p>
                            </div>
                          </div>
                          <Link href={`/exams/results/${exam.id}`}>
                            <motion.button 
                              whileHover={{ x: -5 }}
                              className={`h-14 px-6 rounded-2xl text-sm font-black shadow-sm transition-all flex items-center gap-3 active:scale-95 ${
                                needsTeacherGrading
                                ? 'bg-amber-500 text-white hover:bg-amber-600 border border-transparent'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-indigo-600'
                              }`}
                            >
                              <span>{needsTeacherGrading ? 'صحح الآن' : 'النتائج'}</span>
                              <ArrowRight className="h-5 w-5 rotate-180" />
                            </motion.button>
                          </Link>
                        </>
                      ) : (
                        (statusStr === 'submitted' || statusStr === 'graded' || statusStr === 'completed') ? (() => {
                          const isLocked = checkIsLocked(exam);
                          // 🚀 حماية TypeScript من الشكوى عن total_marks
                          const maxScore = (exam as any).total_marks || (exam as any).max_score || 100;
                          const studentId = user?.id || user?.user_id || '';

                          if (isLocked) {
                            return (
                              <Link href={`/exams/results/${exam.id}/student/${studentId}`} className="w-full">
                                <div className="w-full flex items-center justify-between px-5 py-4 bg-slate-100 rounded-2xl border border-slate-200 transition-all hover:bg-slate-200 hover:shadow-md cursor-pointer group">
                                  <div className="flex items-center gap-3">
                                    <div className="bg-white p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                                      <Lock className="h-5 w-5 text-slate-500" />
                                    </div>
                                    <div className="flex flex-col text-right">
                                      <span className="text-sm font-black text-slate-700">النتيجة محجوبة مؤقتاً</span>
                                      <span className="text-xs font-bold text-slate-500">حتى انتهاء وقت الاختبار</span>
                                    </div>
                                  </div>
                                  <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm group-hover:border-indigo-300">
                                    <Eye className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                  </div>
                                </div>
                              </Link>
                            );
                          }

                          if (statusStr === 'submitted') {
                            return (
                              <Link href={`/exams/results/${exam.id}/student/${studentId}`} className="w-full">
                                <div className="w-full flex items-center justify-between px-5 py-4 bg-amber-50 rounded-2xl border border-amber-100 transition-all hover:bg-amber-100 hover:shadow-md cursor-pointer group">
                                  <div className="flex items-center gap-3">
                                    <div className="bg-white p-2 rounded-xl shadow-sm border border-amber-50 group-hover:scale-110 transition-transform">
                                      <Clock className="h-5 w-5 text-amber-500" />
                                    </div>
                                    <div className="flex flex-col text-right">
                                      <span className="text-sm font-black text-amber-700">قيد المراجعة</span>
                                      <span className="text-xs font-bold text-amber-600">بانتظار تصحيح المعلم</span>
                                    </div>
                                  </div>
                                  <div className="bg-white px-3 py-1.5 rounded-lg border border-amber-100 text-amber-600 font-bold text-xs shadow-sm">
                                    التفاصيل
                                  </div>
                                </div>
                              </Link>
                            );
                          }

                          return (
                            <Link href={`/exams/results/${exam.id}/student/${studentId}`} className="w-full">
                              <div className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl shadow-lg shadow-indigo-200 transition-all hover:shadow-xl hover:-translate-y-0.5 cursor-pointer group border border-indigo-500 relative overflow-hidden">
                                <div className="absolute right-0 top-0 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl -mt-10 -mr-10"></div>
                                <div className="flex items-center gap-4 relative z-10">
                                  <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm shadow-inner group-hover:scale-110 transition-transform">
                                    <Trophy className="h-6 w-6 text-white drop-shadow-md" />
                                  </div>
                                  <div className="flex flex-col text-right">
                                    <span className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mb-0.5">النتيجة النهائية</span>
                                    <span className="text-sm font-black text-white drop-shadow-sm">{exam.subject_name || 'اختبار عام'}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 relative z-10">
                                  <div className="flex items-baseline gap-1 text-white bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20 shadow-inner group-hover:bg-white/20 transition-colors">
                                    <span className="text-2xl font-black drop-shadow-md">{exam.score || 0}</span>
                                    <span className="text-xs font-bold opacity-80">/ {maxScore}</span>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          );
                        })() : (
                          <Link href={`/exams/take/${exam.id}`} className="w-full">
                            <motion.button 
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              disabled={getExamStatus(exam) !== 'available'}
                              className={`w-full h-14 rounded-2xl text-white text-sm font-black shadow-lg transition-all flex items-center justify-center gap-3 ${
                                getExamStatus(exam) === 'available' 
                                  ? 'bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700' 
                                  : 'bg-slate-400 shadow-slate-200 cursor-not-allowed'
                              }`}
                            >
                              <Play className="h-5 w-5" />
                              <span>
                                {getExamStatus(exam) === 'not_started' ? 'لم يبدأ الاختبار بعد' :
                                 getExamStatus(exam) === 'expired' ? 'انتهى وقت الاختبار' :
                                 'بدء الاختبار'}
                              </span>
                            </motion.button>
                          </Link>
                        )
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="col-span-full py-40 text-center glass-card rounded-[3rem] border border-dashed border-slate-300 shadow-2xl shadow-slate-200/50"
            >
              <div className="h-32 w-32 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
                <FileText className="h-16 w-16 text-slate-200" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">لا توجد اختبارات حالياً</h3>
              <p className="text-slate-500 mb-10 text-lg font-medium">
                {isTeacherOrAdmin ? 'ابدأ بإنشاء أول اختبار لك لتقييم مستوى طلابك.' : 'لم يتم نشر أي اختبارات بعد.'}
              </p>
              {isTeacherOrAdmin && (
                <Link href="/exams/builder/new">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center gap-4 bg-indigo-600 text-white px-10 py-5 rounded-3xl hover:bg-indigo-700 transition-all font-black shadow-2xl shadow-indigo-100"
                  >
                    <Plus className="h-6 w-6" />
                    <span>إنشاء اختبار جديد</span>
                  </motion.button>
                </Link>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}


