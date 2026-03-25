'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Search, Filter, BookOpen, Users, 
  BarChart2, Clock, MoreVertical, Edit2, 
  Trash2, Eye, Play, FileText, CheckCircle,
  TrendingUp, Calendar, ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { deleteFromCloudinary } from '@/lib/cloudinary';

type Exam = {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  duration: number;
  exam_date: string;
  start_time?: string;
  end_time?: string;
  subject: { name: string };
  section: { name: string } | null;
  _count?: {
    questions: number;
    attempts: number;
  };
  stats?: {
    avg_score: number;
    total_students: number;
  };
  studentAttempt?: any;
};

export default function ExamsDashboard() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userRole, setUserRole] = useState<string | null>(null);

  const fetchExams = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();
        
      const role = userData?.role || null;
      setUserRole(role);

      let query = supabase
        .from('exams')
        .select(`
          *,
          subject:subjects(name),
          section:sections(name)
        `)
        .order('created_at', { ascending: false });

      if (role === 'teacher') {
        query = query.eq('teacher_id', session.user.id);
      } else if (role === 'student') {
        const { data: studentData } = await supabase
          .from('students')
          .select('section_id')
          .eq('id', session.user.id)
          .single();
        
        if (studentData?.section_id) {
          query = query.eq('section_id', studentData.section_id).eq('status', 'published');
        } else {
          setExams([]);
          return;
        }
      } else if (role === 'parent') {
        const { data: childrenData } = await supabase
          .from('students')
          .select('section_id')
          .eq('parent_id', session.user.id);
          
        if (childrenData && childrenData.length > 0) {
          const sectionIds = childrenData.map(c => c.section_id).filter(Boolean);
          if (sectionIds.length > 0) {
            query = query.in('section_id', sectionIds).eq('status', 'published');
          } else {
            setExams([]);
            return;
          }
        } else {
          setExams([]);
          return;
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch real stats for each exam and student attempts if role is student
      const examsWithStats = await Promise.all((data || []).map(async (exam) => {
        const [questionsRes, attemptsRes] = await Promise.all([
          supabase.from('questions').select('id', { count: 'exact', head: true }).eq('exam_id', exam.id),
          supabase.from('exam_attempts').select('score', { count: 'exact' }).eq('exam_id', exam.id)
        ]);

        let studentAttempt = null;
        if (role === 'student' && session?.user?.id) {
          const { data: attemptsData } = await supabase
            .from('exam_attempts')
            .select('id, status, score')
            .eq('exam_id', exam.id)
            .eq('student_id', session.user.id);
          
          // Prioritize completed/graded attempts
          studentAttempt = attemptsData?.find(a => a.status === 'completed' || a.status === 'graded') || 
                          attemptsData?.find(a => a.status === 'ongoing') || 
                          null;
        }

        const attempts = attemptsRes.data || [];
        const avgScore = attempts.length > 0 
          ? Math.round(attempts.reduce((acc, curr) => acc + curr.score, 0) / attempts.length) 
          : 0;

        return {
          ...exam,
          _count: {
            questions: questionsRes.count || 0,
            attempts: attemptsRes.count || 0
          },
          stats: {
            avg_score: avgScore,
            total_students: attemptsRes.count || 0
          },
          studentAttempt
        };
      }));

      setExams(examsWithStats);
    } catch (err) {
      console.error('Error fetching exams:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || exam.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (examId: string) => {
    try {
      // 1. Fetch all questions for this exam to get their media_urls
      const { data: questions, error: qError } = await supabase
        .from('questions')
        .select('media_url')
        .eq('exam_id', examId);
      
      if (qError) throw qError;

      // 2. Delete all question images from Cloudinary
      if (questions && questions.length > 0) {
        for (const q of questions) {
          if (q.media_url) {
            await deleteFromCloudinary(q.media_url);
          }
        }
      }

      const { error } = await supabase.from('exams').delete().eq('id', examId);
      if (error) throw error;
      setExams(exams.filter(e => e.id !== examId));
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

  const isTeacherOrAdmin = userRole === 'teacher' || userRole === 'admin' || userRole === 'management';
  
  const getExamStatus = (exam: Exam) => {
    if (exam.status !== 'published') return null;
    
    const now = new Date();
    const examDate = new Date(exam.exam_date);
    
    const startTimeParts = (exam.start_time || '00:00').split(':');
    const endTimeParts = (exam.end_time || '23:59').split(':');
    
    const startDateTime = new Date(examDate);
    startDateTime.setHours(parseInt(startTimeParts[0]), parseInt(startTimeParts[1]), 0);
    
    const endDateTime = new Date(examDate);
    endDateTime.setHours(parseInt(endTimeParts[0]), parseInt(endTimeParts[1]), 0);
    
    if (now < startDateTime) return 'not_started';
    if (now > endDateTime) return 'expired';
    return 'available';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
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
                : 'استعرض الاختبارات المتاحة لك وتابع نتائجك.'}
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

        {/* Stats Overview */}
        {isTeacherOrAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { label: 'إجمالي الاختبارات', value: exams.length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', shadow: 'shadow-blue-100' },
              { label: 'اختبارات منشورة', value: exams.filter(e => e.status === 'published').length, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', shadow: 'shadow-emerald-100' },
              { label: 'إجمالي المحاولات', value: exams.reduce((acc, e) => acc + (e._count?.attempts || 0), 0), icon: Users, color: 'text-amber-600', bg: 'bg-amber-50', shadow: 'shadow-amber-100' },
              { 
                label: 'متوسط النجاح', 
                value: (() => {
                  const totalAttempts = exams.reduce((acc, e) => acc + (e._count?.attempts || 0), 0);
                  if (totalAttempts === 0) return '0%';
                  const totalScore = exams.reduce((acc, e) => {
                    // Assuming score is out of 100 for simplicity in average calculation
                    return acc + (e.stats?.avg_score || 0) * (e._count?.attempts || 0);
                  }, 0);
                  return `${Math.round(totalScore / totalAttempts)}%`;
                })(), 
                icon: TrendingUp, 
                color: 'text-indigo-600', 
                bg: 'bg-indigo-50', 
                shadow: 'shadow-indigo-100' 
              },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-8 rounded-[2.5rem] border border-white/60 shadow-xl flex items-center gap-6 transition-all hover:shadow-2xl hover:-translate-y-1"
              >
                <div className={`h-16 w-16 rounded-3xl ${stat.bg} flex items-center justify-center shadow-xl ${stat.shadow}`}>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-2">{stat.label}</p>
                  <p className="text-3xl font-black text-slate-900 tracking-tight leading-none">{stat.value}</p>
                </div>
              </motion.div>
            ))}
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
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card rounded-[3rem] border border-white/60 h-[450px] animate-pulse bg-slate-50/50"></div>
            ))
          ) : filteredExams.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {filteredExams.map((exam, index) => (
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
                    <div className="flex items-start justify-between mb-8">
                      <div className={`px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border shadow-sm ${getStatusColor(exam.status)}`}>
                        {getStatusLabel(exam.status)}
                      </div>
                      {!isTeacherOrAdmin && exam.status === 'published' && (
                        <div className={`px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border shadow-sm ${
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
                              className="h-12 w-12 flex items-center justify-center rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-all bg-slate-50 border border-slate-100"
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
                                <Link href={`/exams/take/${exam.id}`} className="flex items-center gap-4 px-5 py-4 text-sm font-black text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl outline-none cursor-pointer transition-colors">
                                  <Eye className="h-5 w-5" />
                                  <span>معاينة الاختبار</span>
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
                        <span className="truncate">{exam.subject?.name}</span>
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
                            <span>{exam._count?.questions} سؤال</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm font-black text-slate-600 bg-slate-50/50 p-4 rounded-3xl border border-slate-100/50">
                            <div className="h-10 w-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                              <Users className="h-5 w-5 text-emerald-500" />
                            </div>
                            <span>{exam._count?.attempts} محاولة</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    {isTeacherOrAdmin ? (
                      <>
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-indigo-600" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">متوسط الأداء</p>
                            <p className="text-xl font-black text-indigo-600 leading-none">{exam.stats?.avg_score}%</p>
                          </div>
                        </div>
                        <Link href={`/exams/results/${exam.id}`}>
                          <motion.button 
                            whileHover={{ x: -5 }}
                            className="h-14 px-8 rounded-2xl bg-white text-sm font-black text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 transition-all flex items-center gap-3 active:scale-95"
                          >
                            <span>النتائج</span>
                            <ArrowRight className="h-5 w-5 rotate-180" />
                          </motion.button>
                        </Link>
                      </>
                    ) : (
                      (exam.studentAttempt?.status === 'completed' || exam.studentAttempt?.status === 'graded') ? (
                        <div className="w-full flex items-center justify-between px-4 py-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                            <span className="text-sm font-black text-emerald-700">مكتمل</span>
                          </div>
                          <span className="text-lg font-black text-emerald-600">
                            {exam.studentAttempt.score !== null ? `${exam.studentAttempt.score}%` : 'قيد التقييم'}
                          </span>
                        </div>
                      ) : (
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
                              {getExamStatus(exam) === 'not_started' ? 'لم يبدأ بعد' :
                               getExamStatus(exam) === 'expired' ? 'انتهى الوقت' :
                               exam.studentAttempt?.status === 'ongoing' ? 'متابعة الاختبار' : 'بدء الاختبار'}
                            </span>
                          </motion.button>
                        </Link>
                      )
                    )}
                  </div>
                </motion.div>
              ))}
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
