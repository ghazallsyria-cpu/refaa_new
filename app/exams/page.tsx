'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Filter, BookOpen, Users, 
  BarChart2, Clock, MoreVertical, Edit2, 
  Trash2, Eye, Play, FileText, CheckCircle,
  TrendingUp, ArrowRight, AlertCircle, Lock, Trophy, Loader2, ShieldAlert, CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

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
  const { user, authRole, isChecking } = useAuth() as any; 
  const { data: exams, loading: contentLoading, error: contentError, refetch: refresh, deleteExamWithMedia } = useExamsSystem();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const isTeacherOrAdmin = authRole === 'teacher' || authRole === 'admin' || authRole === 'management';

  // 🚀 استخدام useMemo لمنع تقطيع الشاشة أثناء البحث
  const filteredExams = useMemo(() => {
    return exams.filter((exam: any) => {
      if (!exam) return false;
      const matchesSearch = (exam.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (exam.subject_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || exam.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [exams, searchTerm, statusFilter]);

  // 🚀 الطالب يرى فقط الاختبارات المنشورة
  const displayedExams = useMemo(() => {
    return isTeacherOrAdmin 
      ? filteredExams 
      : filteredExams.filter((e: any) => e?.status === 'published');
  }, [filteredExams, isTeacherOrAdmin]);

  const handleDelete = async (examId: string) => {
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذا الاختبار؟ سيتم حذف جميع إجابات الطلاب ومرفقاته نهائياً.')) return;
    try {
      await deleteExamWithMedia(examId);
      if (refresh) refresh();
    } catch (err) {
      console.error('Error deleting exam:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]';
      case 'draft': return 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]';
      case 'archived': return 'bg-[#0f1423] text-slate-500 border-white/5 shadow-inner';
      default: return 'bg-[#0f1423] text-slate-500 border-white/5 shadow-inner';
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

  // 🚀 شاشات الحماية والتحميل (الثيم الملكي)
  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-transparent font-cairo text-slate-100">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
             <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)]"></div>
             <ShieldAlert className="absolute h-8 w-8 text-indigo-400 animate-pulse" />
          </div>
          <p className="text-indigo-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-transparent pb-24 font-cairo text-slate-100 relative overflow-x-hidden pt-6" dir="rtl">
      
      {/* 🚀 الخلفية الزجاجية المضيئة المريحة للعين */}
      <div className="fixed top-[-10%] right-[-10%] w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] bg-purple-500/10 rounded-full blur-[140px] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12 relative z-10">
        
        {/* 🚀 Header Section (Royal Obsidian Theme) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-8 glass-panel p-6 sm:p-10 lg:p-12 rounded-[2rem] sm:rounded-[3rem] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none -mr-10 -mt-10"></div>
          <div className="space-y-4 sm:space-y-5 relative z-10 text-center lg:text-right w-full lg:w-auto">
            <div className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-[10px] sm:text-xs font-black text-indigo-400 uppercase tracking-widest shadow-inner mx-auto lg:mx-0">
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>نظام التقييم والاختبارات</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-lg">الاختبارات</h1>
            <p className="text-sm sm:text-base lg:text-lg text-slate-400 font-bold max-w-2xl leading-relaxed mx-auto lg:mx-0 drop-shadow-sm">
              {isTeacherOrAdmin 
                ? 'قم بإنشاء وإدارة الاختبارات التفاعلية ومتابعة أداء الطلاب وتقييمهم بدقة.' 
                : 'استعرض الاختبارات المتاحة لك وقم بحلها وتابع نتائجك في مكان واحد.'}
            </p>
          </div>
          
          {isTeacherOrAdmin && (
            <Link href="/exams/builder/new" className="w-full lg:w-auto relative z-10">
              <motion.button 
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.95 }} 
                className="w-full inline-flex items-center justify-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 sm:px-8 py-3.5 sm:py-5 text-sm sm:text-base font-black text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:from-indigo-500 hover:to-purple-500 transition-all border border-indigo-400/50"
              >
                <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                <span>إنشاء اختبار جديد</span>
              </motion.button>
            </Link>
          )}
        </motion.div>

        {/* 🚀 Stats Overview for Teachers */}
        {isTeacherOrAdmin && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.1 }} 
              className="glass-panel p-5 sm:p-6 lg:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/5 flex flex-col sm:flex-row items-center sm:items-start gap-4 transition-all hover:border-indigo-500/30 hover:shadow-[0_10px_40px_-10px_rgba(99,102,241,0.2)] text-center sm:text-right group"
            >
              <div className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 rounded-xl sm:rounded-2xl bg-blue-500/10 flex items-center justify-center shadow-inner border border-blue-500/20 shrink-0 group-hover:scale-110 transition-transform">
                <FileText className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-blue-400 drop-shadow-md" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5 sm:mb-2">إجمالي الاختبارات</p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-none drop-shadow-sm">{exams.length}</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.2 }} 
              className="glass-panel p-5 sm:p-6 lg:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/5 flex flex-col sm:flex-row items-center sm:items-start gap-4 transition-all hover:border-emerald-500/30 hover:shadow-[0_10px_40px_-10px_rgba(16,185,129,0.2)] text-center sm:text-right group"
            >
              <div className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 rounded-xl sm:rounded-2xl bg-emerald-500/10 flex items-center justify-center shadow-inner border border-emerald-500/20 shrink-0 group-hover:scale-110 transition-transform">
                <CheckCircle className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-emerald-400 drop-shadow-md" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5 sm:mb-2">اختبارات منشورة</p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-none drop-shadow-sm">{exams.filter(e => e?.status === 'published').length}</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.3 }} 
              className="glass-panel p-5 sm:p-6 lg:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/5 flex flex-col sm:flex-row items-center sm:items-start gap-4 transition-all hover:border-amber-500/30 hover:shadow-[0_10px_40px_-10px_rgba(245,158,11,0.2)] text-center sm:text-right group"
            >
              <div className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 rounded-xl sm:rounded-2xl bg-amber-500/10 flex items-center justify-center shadow-inner border border-amber-500/20 shrink-0 group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-amber-400 drop-shadow-md" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5 sm:mb-2">المحاولات</p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-none drop-shadow-sm">{exams.reduce((acc, e) => acc + (e?.submission_count || 0), 0)}</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.4 }} 
              className="glass-panel p-5 sm:p-6 lg:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/5 flex flex-col sm:flex-row items-center sm:items-start gap-4 transition-all hover:border-indigo-500/30 hover:shadow-[0_10px_40px_-10px_rgba(99,102,241,0.2)] text-center sm:text-right group"
            >
              <div className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 rounded-xl sm:rounded-2xl bg-indigo-500/10 flex items-center justify-center shadow-inner border border-indigo-500/20 shrink-0 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-indigo-400 drop-shadow-md" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5 sm:mb-2">متوسط النجاح</p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-none drop-shadow-sm">
                  {(() => {
                    const totalAttempts = exams.reduce((acc, e) => acc + (e?.submission_count || 0), 0);
                    if (totalAttempts === 0) return '0%';
                    const totalScore = exams.reduce((acc, e) => acc + (e?.avg_score || 0) * (e?.submission_count || 0), 0);
                    return `${Math.round(totalScore / totalAttempts)}%`;
                  })()}
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {/* 🚀 Filters Section (Glass) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.5 }} 
          className="glass-panel p-4 sm:p-5 lg:p-6 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-xl border border-white/5"
        >
          <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
            <div className="relative flex-1 group">
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 sm:pr-6 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                <Search className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <input 
                type="text" 
                className="block w-full rounded-xl sm:rounded-2xl border-0 py-3.5 sm:py-4 pr-10 sm:pr-14 pl-4 text-white bg-[#02040a]/60 focus:bg-[#02040a] ring-1 ring-inset ring-white/5 placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 text-sm sm:text-base transition-all font-bold outline-none shadow-inner" 
                placeholder="البحث عن اختبار بالاسم أو المادة..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
            {isTeacherOrAdmin && (
              <div className="relative md:w-64 lg:w-80 group">
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 sm:pr-6 text-slate-500 group-focus-within:text-indigo-400 transition-colors z-10">
                  <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <select 
                  className="block w-full rounded-xl sm:rounded-2xl border-0 py-3.5 sm:py-4 pr-10 sm:pr-14 pl-4 text-white bg-[#02040a]/60 focus:bg-[#02040a] ring-1 ring-inset ring-white/5 focus:ring-2 focus:ring-indigo-500/50 text-sm sm:text-base transition-all font-bold appearance-none outline-none cursor-pointer shadow-inner [&>option]:bg-[#0f1423]" 
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

        {/* 🚀 الفصل التام بين واجهة المعلم وواجهة الطالب */}
        <div className={isTeacherOrAdmin ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8" : "flex flex-col gap-4 sm:gap-5"}>
          {contentLoading && exams.length === 0 ? (
            <div className="col-span-full flex flex-col justify-center items-center py-20 gap-4 relative z-10">
               <Loader2 className="animate-spin h-14 w-14 text-indigo-500 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
               <p className="text-slate-400 font-black animate-pulse tracking-widest text-sm">جاري تحميل الاختبارات...</p>
            </div>
          ) : displayedExams.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {displayedExams.map((exam, index) => {
                
                // ==========================================
                // 👨‍🏫 واجهة المعلم (Teacher UI - Big Cards)
                // ==========================================
                if (isTeacherOrAdmin) {
                  const pendingGradesCount = (exam.submission_count || 0) - (exam.graded_count || 0);
                  const needsTeacherGrading = pendingGradesCount > 0;

                  return (
                    <motion.div 
                      key={exam.id} 
                      layout 
                      initial={{ opacity: 0, y: 20 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, scale: 0.95 }} 
                      transition={{ delay: index * 0.05 }} 
                      className="group glass-panel rounded-[2rem] sm:rounded-[2.5rem] border border-white/5 shadow-lg hover:border-indigo-500/40 hover:shadow-[0_10px_40px_-10px_rgba(99,102,241,0.3)] transition-all overflow-hidden flex flex-col bg-[#0f1423]/40 hover:bg-[#0f1423]/80"
                    >
                      <div className="p-6 sm:p-8 flex-1 relative z-10">
                        <div className="flex items-start justify-between mb-6 sm:mb-8 gap-2">
                          <div className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest border whitespace-nowrap shadow-inner ${getStatusColor(exam.status)}`}>
                            {getStatusLabel(exam.status)}
                          </div>
                          
                          {needsTeacherGrading && (
                            <div className="flex-1 flex justify-end">
                              <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black border shadow-inner bg-amber-500/20 text-amber-400 border-amber-500/30 flex items-center gap-1 sm:gap-1.5 animate-pulse">
                                <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                <span>{pendingGradesCount} للتصحيح</span>
                              </div>
                            </div>
                          )}
                          
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                              <button className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-xl sm:rounded-2xl hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 transition-all bg-[#02040a]/60 border border-white/5 shrink-0 outline-none shadow-inner active:scale-95">
                                <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                              </button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                              <DropdownMenu.Content className="bg-[#0f1423]/95 backdrop-blur-2xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10 p-2 min-w-[200px] z-50 animate-in fade-in zoom-in-95 duration-200" sideOffset={5} align="end">
                                <DropdownMenu.Item asChild>
                                  <Link href={`/exams/builder/${exam.id}`} className="flex items-center gap-3 px-4 py-3 text-xs sm:text-sm font-black text-slate-300 hover:bg-white/5 hover:text-white rounded-xl outline-none cursor-pointer transition-colors">
                                    <Edit2 className="h-4 w-4" />
                                    <span>تعديل الاختبار</span>
                                  </Link>
                                </DropdownMenu.Item>
                                <DropdownMenu.Item asChild>
                                  <Link href={`/exams/results/${exam.id}`} className="flex items-center gap-3 px-4 py-3 text-xs sm:text-sm font-black text-slate-300 hover:bg-white/5 hover:text-white rounded-xl outline-none cursor-pointer transition-colors">
                                    <BarChart2 className="h-4 w-4" />
                                    <span>النتائج والتحليلات</span>
                                  </Link>
                                </DropdownMenu.Item>
                                <DropdownMenu.Separator className="h-px bg-white/5 my-2 mx-2" />
                                <DropdownMenu.Item 
                                  className="flex items-center gap-3 px-4 py-3 text-xs sm:text-sm font-black text-rose-400 hover:bg-rose-500/10 rounded-xl outline-none cursor-pointer transition-colors" 
                                  onClick={() => handleDelete(exam.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span>حذف الاختبار</span>
                                </DropdownMenu.Item>
                                <DropdownMenu.Item asChild>
                                  <Link href={`/exams/take/${exam.id}`} className="flex items-center gap-3 px-4 py-3 text-xs sm:text-sm font-black text-slate-300 hover:bg-white/5 hover:text-white rounded-xl outline-none cursor-pointer transition-colors">
                                    <Eye className="h-4 w-4" />
                                    <span>معاينة الاختبار</span>
                                  </Link>
                                </DropdownMenu.Item>
                              </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Root>
                        </div>
                        
                        <h3 className="text-xl sm:text-2xl font-black text-white mb-3 sm:mb-4 group-hover:text-indigo-400 transition-colors tracking-tight leading-tight line-clamp-2 drop-shadow-sm">
                          {exam.title}
                        </h3>
                        <p className="text-slate-400 font-bold line-clamp-2 mb-6 sm:mb-8 text-xs sm:text-sm leading-relaxed">
                          {exam.description || 'لا يوجد وصف لهذا الاختبار'}
                        </p>
                        
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-bold text-slate-300 bg-[#02040a]/60 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/5 shadow-inner">
                            <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shrink-0"><BookOpen className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-400" /></div>
                            <span className="truncate">{exam.subject_name}</span>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-bold text-slate-300 bg-[#02040a]/60 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/5 shadow-inner">
                            <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shrink-0"><Clock className="h-3 w-3 sm:h-4 sm:w-4 text-amber-400" /></div>
                            <span>{exam.duration ? `${exam.duration} د` : 'مفتوح'}</span>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-bold text-slate-300 bg-[#02040a]/60 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/5 shadow-inner">
                            <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0"><FileText className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" /></div>
                            <span>{exam.question_count || 0} سؤال</span>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-bold text-slate-300 bg-[#02040a]/60 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/5 shadow-inner">
                            <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0"><Users className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-400" /></div>
                            <span>{exam.submission_count || 0} محاولة</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className={`px-6 sm:px-8 py-4 sm:py-5 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors ${needsTeacherGrading ? 'bg-amber-950/30' : 'bg-[#02040a]/40 group-hover:bg-[#02040a]/80'}`}>
                        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-[#0f1423] shadow-inner border border-white/5 flex items-center justify-center shrink-0">
                            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-400" />
                          </div>
                          <div>
                            <p className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">متوسط الأداء</p>
                            <p className="text-base sm:text-lg font-black text-indigo-400 leading-none drop-shadow-sm">{exam.avg_score || 0}%</p>
                          </div>
                        </div>
                        <Link href={`/exams/results/${exam.id}`} className="w-full sm:w-auto">
                          <motion.button 
                            whileHover={{ scale: 1.02 }} 
                            whileTap={{ scale: 0.95 }}
                            className={`w-full sm:w-auto h-10 sm:h-12 px-5 sm:px-6 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black shadow-md transition-all flex items-center justify-center gap-2 ${needsTeacherGrading ? 'bg-amber-600 text-slate-950 hover:bg-amber-500 border border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'bg-indigo-600 text-white border border-indigo-400/50 hover:bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]'}`}
                          >
                            <span>{needsTeacherGrading ? 'صحح الآن' : 'النتائج'}</span>
                            <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 rotate-180" />
                          </motion.button>
                        </Link>
                      </div>
                    </motion.div>
                  );
                } 
                
                // ==========================================
                // 👨‍🎓 واجهة الطالب (Student UI - Compact Rows)
                // ==========================================
                else {
                  const statusStr = String((exam as any).submission_status || '');
                  const isStudentDone = ['submitted', 'graded', 'completed'].includes(statusStr);
                  const isLocked = checkIsLocked(exam);
                  const maxScore = (exam as any).total_marks || (exam as any).max_score || 100;
                  const studentId = user?.id || (user as any)?.user_id || '';
                  const examStatus = getExamStatus(exam);

                  return (
                    <motion.div 
                      key={exam.id} 
                      layout 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, scale: 0.95 }} 
                      transition={{ delay: index * 0.05 }}
                    >
                      {isStudentDone ? (
                        isLocked ? (
                          /* 🔒 حالة: النتيجة محجوبة (Locked) */
                          <Link href={`/exams/results/${exam.id}/student/${studentId}`} className="block group">
                            <div className="w-full glass-panel rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-6 border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6 hover:-translate-y-1 transition-all shadow-lg hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] hover:border-white/20 bg-[#0f1423]/40">
                               <div className="flex items-center gap-4 sm:gap-5 w-full md:w-auto relative z-10">
                                  <div className="bg-[#02040a]/60 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-slate-500 shrink-0 border border-white/5 shadow-inner group-hover:text-slate-400 transition-colors">
                                    <Lock className="h-6 w-6 sm:h-7 sm:w-7" />
                                  </div>
                                  <div className="text-right min-w-0 pr-1">
                                    <h3 className="text-base sm:text-lg lg:text-xl font-black text-white mb-1 drop-shadow-sm truncate">{exam.title}</h3>
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm font-bold text-slate-400">
                                      <span className="flex items-center gap-1 sm:gap-1.5 bg-[#02040a]/80 px-2 py-1 rounded-lg border border-white/5 shadow-inner"><BookOpen className="w-3.5 h-3.5"/> {exam.subject_name}</span>
                                      <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-lg border border-white/5 shadow-inner">النتيجة محجوبة حالياً</span>
                                    </div>
                                  </div>
                               </div>
                               <div className="flex items-center justify-end w-full md:w-auto border-t md:border-0 pt-4 md:pt-0 mt-2 md:mt-0 border-white/5 relative z-10">
                                   <div className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#02040a]/80 text-slate-400 border border-white/5 shadow-inner flex items-center justify-center gap-2 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-colors w-full md:w-auto">
                                      <Eye className="w-4 h-4" /> عرض التفاصيل 
                                   </div>
                               </div>
                            </div>
                          </Link>
                        ) : statusStr === 'submitted' ? (
                          /* ⏳ حالة: قيد المراجعة والتصحيح (Pending) */
                          <Link href={`/exams/results/${exam.id}/student/${studentId}`} className="block group">
                            <div className="w-full glass-panel rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-6 border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6 hover:-translate-y-1 transition-all shadow-lg hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] hover:border-amber-500/40 bg-[#0f1423]/40 relative overflow-hidden">
                               <div className="absolute top-0 right-0 w-32 h-full bg-amber-500 opacity-10 pointer-events-none transition-all duration-700 blur-3xl group-hover:scale-150"></div>
                               <div className="flex items-center gap-4 sm:gap-5 w-full md:w-auto relative z-10">
                                  <div className="bg-amber-500/10 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-amber-400 shrink-0 border border-amber-500/20 shadow-inner group-hover:scale-110 transition-transform">
                                    <Clock className="h-6 w-6 sm:h-7 sm:w-7 drop-shadow-sm" />
                                  </div>
                                  <div className="text-right min-w-0 pr-1">
                                    <h3 className="text-base sm:text-lg lg:text-xl font-black text-white mb-1 group-hover:text-amber-400 transition-colors truncate drop-shadow-sm">{exam.title}</h3>
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm font-bold text-slate-400">
                                      <span className="flex items-center gap-1 sm:gap-1.5 bg-[#02040a]/80 px-2 py-1 rounded-lg border border-white/5 shadow-inner"><BookOpen className="w-3.5 h-3.5"/> {exam.subject_name}</span>
                                      <span className="text-[9px] sm:text-[10px] font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 shadow-inner animate-pulse">قيد التصحيح</span>
                                    </div>
                                  </div>
                               </div>
                               <div className="flex items-center justify-end w-full md:w-auto border-t md:border-0 pt-4 md:pt-0 mt-2 md:mt-0 border-white/5 relative z-10">
                                   <div className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#02040a]/80 text-amber-400 border border-white/5 shadow-inner flex items-center justify-center gap-2 group-hover:bg-amber-500/10 group-hover:border-amber-500/30 transition-colors w-full md:w-auto">
                                      <Eye className="w-4 h-4" /> عرض التفاصيل 
                                   </div>
                               </div>
                            </div>
                          </Link>
                        ) : (
                          /* 🏆 حالة: مكتمل وتم التصحيح (Graded/Completed) */
                          <Link href={`/exams/results/${exam.id}/student/${studentId}`} className="block group">
                            <div className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-6 shadow-[0_10px_30px_rgba(79,70,229,0.3)] flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6 hover:-translate-y-1 transition-all overflow-hidden relative cursor-pointer border border-indigo-400/50">
                               <div className="absolute right-0 top-0 w-40 h-40 bg-white opacity-10 rounded-full blur-[60px] -mt-10 -mr-10 pointer-events-none mix-blend-overlay"></div>
                               
                               <div className="flex items-center gap-4 sm:gap-5 w-full md:w-auto relative z-10">
                                  <div className="bg-white/20 p-3 sm:p-4 rounded-xl sm:rounded-2xl backdrop-blur-sm shadow-inner group-hover:scale-110 transition-transform shrink-0 border border-white/10">
                                    <Trophy className="h-6 w-6 sm:h-8 w-8 text-white drop-shadow-md" />
                                  </div>
                                  <div className="text-right min-w-0 pr-1">
                                    <h3 className="text-base sm:text-lg lg:text-xl font-black text-white drop-shadow-sm mb-1 truncate">{exam.title}</h3>
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-indigo-100 text-xs sm:text-sm font-bold">
                                      <span className="flex items-center gap-1 sm:gap-1.5 bg-[#02040a]/30 px-2 py-1 rounded-lg border border-white/10 shadow-inner"><BookOpen className="w-3.5 h-3.5"/> {exam.subject_name}</span>
                                      <span className="flex items-center gap-1 sm:gap-1.5 bg-emerald-500/20 px-2 py-1 rounded-lg border border-emerald-500/30 shadow-inner text-white font-black text-[9px] sm:text-[10px] uppercase"><CheckCircle2 className="w-3.5 h-3.5"/> مكتمل</span>
                                    </div>
                                  </div>
                               </div>

                               <div className="flex items-center gap-4 relative z-10 w-full md:w-auto justify-end border-t md:border-0 border-white/10 pt-4 md:pt-0 mt-2 md:mt-0">
                                  <div className="flex flex-col items-end">
                                    <span className="text-[9px] sm:text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1 drop-shadow-sm">الدرجة النهائية</span>
                                    <div className="flex items-baseline gap-1 text-white bg-[#02040a]/40 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl backdrop-blur-sm border border-white/10 shadow-inner group-hover:bg-[#02040a]/60 transition-colors">
                                      <span className="text-2xl sm:text-3xl font-black drop-shadow-md">{exam.score || 0}</span>
                                      <span className="text-xs sm:text-sm font-bold opacity-80">/ {maxScore}</span>
                                    </div>
                                  </div>
                               </div>
                            </div>
                          </Link>
                        )
                      ) : (
                        /* ▶️ حالة: متاح للامتحان أو لم يبدأ (Available / Not Started / Expired) */
                        <div className="w-full glass-panel rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-6 border border-white/5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6 group hover:border-indigo-500/40 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all bg-[#0f1423]/40 relative overflow-hidden">
                           <div className={`absolute top-0 right-0 w-24 h-full opacity-10 pointer-events-none transition-all duration-700 blur-3xl ${examStatus === 'available' ? 'bg-indigo-500 group-hover:scale-150' : examStatus === 'expired' ? 'bg-rose-500' : 'bg-blue-500'}`}></div>
                           
                           <div className="flex items-center gap-4 sm:gap-5 w-full md:w-auto relative z-10">
                              <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl shrink-0 border shadow-inner transition-colors ${examStatus === 'available' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white' : examStatus === 'expired' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                <FileText className="h-6 w-6 sm:h-7 sm:w-7 drop-shadow-sm" />
                              </div>
                              <div className="text-right min-w-0 pr-1">
                                <h3 className="text-base sm:text-lg lg:text-xl font-black text-white mb-1 group-hover:text-indigo-400 transition-colors truncate drop-shadow-sm">{exam.title}</h3>
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm font-bold text-slate-400">
                                  <span className="flex items-center gap-1 sm:gap-1.5 bg-[#02040a]/80 px-2 py-1 rounded-lg border border-white/5 shadow-inner"><BookOpen className="w-3.5 h-3.5"/> {exam.subject_name}</span>
                                  <span className="flex items-center gap-1 sm:gap-1.5 bg-[#02040a]/80 px-2 py-1 rounded-lg border border-white/5 shadow-inner"><Clock className="w-3.5 h-3.5"/> {exam.duration ? `${exam.duration} دقيقة` : 'وقت مفتوح'}</span>
                                </div>
                              </div>
                           </div>
                           
                           <div className="flex flex-col md:flex-row items-center gap-3 sm:gap-4 w-full md:w-auto justify-end border-t md:border-0 border-white/5 pt-4 md:pt-0 mt-2 md:mt-0 relative z-10">
                              <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest border shadow-inner text-center w-full md:w-auto ${examStatus === 'available' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : examStatus === 'not_started' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                  {examStatus === 'available' ? 'متاح الآن' : examStatus === 'not_started' ? 'لم يبدأ بعد' : 'منتهي'}
                              </div>
                              
                              <Link href={`/exams/take/${exam.id}`} className="w-full md:w-auto">
                                <button 
                                  disabled={examStatus !== 'available'} 
                                  className={`w-full md:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 ${examStatus === 'available' ? 'bg-indigo-600 text-white hover:bg-indigo-500 border border-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'bg-[#02040a]/60 text-slate-500 cursor-not-allowed border border-white/5 shadow-inner'}`}
                                >
                                   <Play className="w-3.5 h-3.5 sm:w-4 h-4" />
                                   {examStatus === 'not_started' ? 'انتظر الموعد' : examStatus === 'expired' ? 'مغلق' : 'بدء الاختبار'}
                                </button>
                              </Link>
                           </div>
                        </div>
                      )}
                    </motion.div>
                  );
                }
              })}
            </AnimatePresence>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="col-span-full py-20 sm:py-32 text-center glass-panel rounded-[2rem] sm:rounded-[3rem] border border-dashed border-white/10 shadow-inner px-4 relative z-10"
            >
              <div className="h-20 w-20 sm:h-24 sm:w-24 bg-[#0f1423]/50 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center mx-auto mb-6 sm:mb-8 border border-white/5 shadow-inner">
                <FileText className="h-10 w-10 sm:h-12 w-12 text-slate-500 drop-shadow-md" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2 drop-shadow-sm">لا توجد اختبارات حالياً</h3>
              <p className="text-slate-400 mb-8 sm:mb-10 text-sm sm:text-lg font-bold max-w-sm mx-auto">
                {isTeacherOrAdmin 
                  ? 'ابدأ بإنشاء أول اختبار لك لتقييم مستوى طلابك.' 
                  : 'لم يتم نشر أي اختبارات لك بعد.'}
              </p>
              {isTeacherOrAdmin && (
                <Link href="/exams/builder/new">
                  <motion.button 
                    whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }} 
                    className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 sm:px-10 py-4 sm:py-5 rounded-xl sm:rounded-2xl hover:from-indigo-500 hover:to-purple-500 transition-all font-black shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/50 w-full sm:w-auto"
                  >
                    <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
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
