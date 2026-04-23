/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Plus, Save, Eye, Settings, Trash2, 
  Copy, GripVertical, Image as ImageIcon, 
  Video, FileText, ChevronDown, Check,
  X, HelpCircle, AlertCircle, ArrowRight,
  MoreVertical, Type, List, CheckSquare,
  AlignLeft, Hash, Link as LinkIcon, Clock, CheckCircle, UploadCloud
} from 'lucide-react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import * as Switch from '@radix-ui/react-switch';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import ForumEditor from '@/components/ForumEditor'; 

import { Question, QuestionType, Option, createQuestion } from '@/types/question';
import { useAuth } from '@/context/auth-context';
import { useSchoolFormData } from '@/hooks/useSchoolFormData';
import ImageUpload from '@/components/ImageUpload';
import { cn } from '@/lib/utils';

type ExamData = {
  id?: string;
  title: string;
  description: string | null;
  subject_id: string;
  section_ids?: string[];
  teacher_id?: string;
  duration: number;
  max_attempts: number;
  max_score: number;
  exam_date: string;
  start_time?: string;
  end_time?: string;
  status: 'draft' | 'published' | 'archived';
  settings?: {
    shuffle_questions?: boolean;
    shuffle_options?: boolean;
    show_results_immediately?: boolean;
    allow_backtracking?: boolean;
    prevent_tab_switch?: boolean;
    prevent_copy?: boolean;
  };
};

export default function QuizBuilder() {
  const params = useParams();
  const router = useRouter();
  const { user, userRole, isChecking } = useAuth() as any;
  const isNew = params.id === 'new';
  
  const { fetchExamDetails, saveExam } = useExamsSystem();
  
  const dataFetchedRef = useRef(false);

  const [exam, setExam] = useState<ExamData>({
    title: '',
    description: '',
    subject_id: '',
    section_ids: [],
    teacher_id: '',
    duration: 30,
    max_attempts: 1,
    max_score: 100,
    exam_date: new Date().toISOString().split('T')[0],
    start_time: '08:00',
    end_time: '23:59',
    status: 'draft',
    settings: {
      shuffle_questions: false,
      shuffle_options: false,
      show_results_immediately: true,
      allow_backtracking: true,
      prevent_tab_switch: false,
      prevent_copy: true
    }
  });

  const { data: formData, isLoading: formLoading } = useSchoolFormData();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const subjects = formData?.subjects || [];
  const sections = (formData?.sections || []).map((s: any) => ({
    id: s.id,
    name: s.classes?.name ? `${s.classes.name} - ${s.name}` : s.name
  }));
  const teachers = (formData?.teachers || []).map((t: any) => ({
    id: t.id,
    full_name: t.user?.full_name || ''
  }));

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const addQuestion = useCallback((type: QuestionType | 'file' | 'file_upload') => {
    const newQuestion: any = {
      ...createQuestion(type as QuestionType),
      id: crypto.randomUUID(),
      type: type, 
      is_required: true 
    };

    if (type === 'true_false') {
        newQuestion.options = [
            { id: crypto.randomUUID(), content: 'صح', is_correct: true },
            { id: crypto.randomUUID(), content: 'خطأ', is_correct: false }
        ];
    } else if (['multiple_choice', 'multi_select', 'checkbox', 'radio'].includes(type)) {
        newQuestion.options = [{ id: crypto.randomUUID(), content: 'خيار 1', is_correct: false }];
    }
    setQuestions(prev => [...prev, newQuestion]);
  }, []);

  useEffect(() => {
    setIsAdmin(userRole === 'admin' || userRole === 'management');
  }, [userRole]);

  const fetchInitialData = useCallback(async () => {
    if (dataFetchedRef.current || isChecking) return;
    dataFetchedRef.current = true;

    try {
      if (!isNew) {
        const { exam: examData, questions: questionsData } = await fetchExamDetails(params.id as string);
        const fetchedSettings = (examData.settings || {}) as any;
        
        setExam({
          ...examData,
          section_ids: examData.section_ids || [],
          settings: {
            shuffle_questions: fetchedSettings.shuffle_questions ?? false,
            shuffle_options: fetchedSettings.shuffle_options ?? false,
            show_results_immediately: fetchedSettings.show_results_immediately ?? true,
            allow_backtracking: fetchedSettings.allow_backtracking ?? true,
            prevent_tab_switch: fetchedSettings.prevent_tab_switch ?? false,
            prevent_copy: fetchedSettings.prevent_copy ?? true,
          }
        });

        setQuestions((questionsData || []).map((q: any) => {
           return {...q, type: q.type, content: q.content, is_required: q.is_required ?? true};
        }));
      } else {
        addQuestion('multiple_choice');
        if (user) setExam(prev => ({ ...prev, teacher_id: user.id }));
      }
    } catch (err) {
      console.error('Error fetching builder data:', err);
    } finally {
      setLoading(false);
    }
  }, [isNew, params.id, addQuestion, user, isChecking, fetchExamDetails]);

  useEffect(() => { 
    if (!isChecking) {
      fetchInitialData(); 
    }
  }, [fetchInitialData, isChecking]);

  const updateQuestion = useCallback((id: string, updates: Partial<any>) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
  }, []);

  const deleteQuestion = useCallback(async (id: string) => {
    setQuestions(prev => {
      const question = prev.find(q => q.id === id);
      if (question?.media_url) {
        deleteFromCloudinary(question.media_url).catch(console.error);
      }
      return prev.filter(q => q.id !== id);
    });
  }, []);

  const duplicateQuestion = useCallback((id: string) => {
    setQuestions(prev => {
      const question = prev.find(q => q.id === id);
      if (!question) return prev;
      
      const duplicated = {
        ...question,
        id: crypto.randomUUID(),
        options: question.options?.map((o: any) => ({ ...o, id: crypto.randomUUID() })) || []
      };
      const index = prev.findIndex(q => q.id === id);
      const newQuestions = [...prev];
      newQuestions.splice(index + 1, 0, duplicated);
      return newQuestions;
    });
  }, []);

  const addOption = useCallback((questionId: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        return { ...q, options: [...(q.options || []), { id: crypto.randomUUID(), content: '', is_correct: false }] };
      }
      return q;
    }));
  }, []);

  const updateOption = useCallback((questionId: string, optionId: string, updates: Partial<Option>) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        const newOptions = (q.options || []).map((o: any) => {
          if (o.id === optionId) {
            if (updates.is_correct && (q.type === 'multiple_choice' || q.type === 'true_false')) {
              return { ...o, ...updates };
            }
            return { ...o, ...updates };
          }
          if (updates.is_correct && (q.type === 'multiple_choice' || q.type === 'true_false')) {
            return { ...o, is_correct: false };
          }
          return o;
        });
        return { ...q, options: newOptions };
      }
      return q;
    }));
  }, []);

  const deleteOption = useCallback((questionId: string, optionId: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        return { ...q, options: (q.options || []).filter((o: any) => o.id !== optionId) };
      }
      return q;
    }));
  }, []);

  const handleSave = async () => {
    if (!exam.title || !exam.subject_id) {
      showNotification('error', 'يرجى إدخال عنوان الاختبار والمادة');
      return;
    }

    const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
    const maxScore = Number(exam.max_score) || 0;

    if (totalPoints !== maxScore) {
      showNotification('error', `مجموع درجات الأسئلة (${totalPoints}) يجب أن يساوي الدرجة الكلية للاختبار (${maxScore})`);
      return;
    }

    setSaving(true);
    try {
      let finalTeacherId = exam.teacher_id;
      if (userRole === 'teacher' && user) {
        finalTeacherId = user.id;
      } else if (!finalTeacherId && (userRole === 'admin' || userRole === 'management')) {
        if (teachers.length > 0) finalTeacherId = teachers[0].id;
        else throw new Error('يجب اختيار معلم للاختبار');
      }

      const examPayload = {
        ...exam,
        teacher_id: finalTeacherId,
        max_score: maxScore,
        total_marks: maxScore
      };

      await saveExam(examPayload, questions, isNew);
      showNotification('success', exam.status === 'published' ? 'تم نشر الاختبار بنجاح' : 'تم حفظ الاختبار بنجاح');
      router.push('/exams');
    } catch (err: any) {
      console.error('Error saving quiz:', err);
      showNotification('error', `حدث خطأ أثناء حفظ الاختبار: ${err.message || 'خطأ غير معروف'}`);
    } finally {
      setSaving(false);
    }
  };

  // 🚀 شاشة التحميل (الثيم الملكي)
  if (isChecking || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#090b14] font-cairo text-slate-100">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
             <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)]"></div>
             <FileText className="absolute h-8 w-8 text-indigo-400 animate-pulse" />
          </div>
          <p className="text-indigo-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري إعداد محرر الاختبارات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090b14] text-slate-100 font-cairo pb-32 relative overflow-x-hidden" dir="rtl">
      
      {/* 🚀 الخلفية الزجاجية المضيئة المريحة للعين */}
      <div className="fixed top-1/4 left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* إشعارات النظام العائمة */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%', scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }} 
            exit={{ opacity: 0, y: -20, x: '-50%', scale: 0.95 }}
            className={`fixed top-8 left-1/2 z-50 px-6 sm:px-8 py-3.5 sm:py-4 rounded-[1.5rem] sm:rounded-3xl shadow-2xl flex items-center gap-3 sm:gap-4 border backdrop-blur-3xl w-[90%] sm:w-auto ${
              notification.type === 'success' ? 'bg-[#02040a]/90 text-emerald-400 border-emerald-500/50 shadow-[0_20px_50px_rgba(16,185,129,0.3)]' : 'bg-[#02040a]/90 text-rose-400 border-rose-500/50 shadow-[0_20px_50px_rgba(244,63,94,0.3)]'
            }`}
          >
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
              {notification.type === 'success' ? <Check className="h-4 w-4 sm:h-5 sm:w-5" /> : <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />}
            </div>
            <div className="font-black tracking-tight text-xs sm:text-sm md:text-base text-white drop-shadow-sm leading-snug">{notification.message}</div>
            <button onClick={() => setNotification(null)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors mr-auto text-white active:scale-90"><X className="h-4 w-4 sm:h-5 sm:w-5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 الهيدر العلوي المثبت (Sticky Header - Royal Theme) */}
      <header className="sticky top-0 z-40 bg-[#02040a]/80 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
          
          <div className="flex items-center gap-3 sm:gap-5 w-full md:w-auto">
            <button onClick={() => router.back()} className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-xl sm:rounded-2xl bg-[#0f1423] border border-white/5 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-all active:scale-95 shadow-inner shrink-0">
              <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <div className="min-w-0 pr-1">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight truncate max-w-[200px] sm:max-w-[300px] drop-shadow-sm">{exam.title || 'اختبار جديد'}</h1>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">جاري الحفظ تلقائياً</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-2 sm:gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
            <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl border font-black transition-all shrink-0 ${
              questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0) === (Number(exam.max_score) || 0)
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-inner' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-inner'
            }`}>
              <div className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full shrink-0 ${questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0) === (Number(exam.max_score) || 0) ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              <span className="text-[9px] sm:text-[10px] uppercase tracking-widest opacity-80 hidden sm:inline">مجموع الدرجات:</span>
              <span className="text-sm sm:text-base lg:text-lg tracking-tight drop-shadow-sm" dir="ltr">{questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0)} / {exam.max_score || 0}</span>
            </div>

            {/* 🚀 زر الإعدادات (Settings Modal Trigger) */}
            <Dialog.Root>
              <Dialog.Trigger asChild>
                <button className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-xl sm:rounded-2xl bg-[#0f1423] border border-white/5 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-all active:scale-95 shadow-inner shrink-0"><Settings className="h-4 w-4 sm:h-5 sm:w-5" /></button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/90 backdrop-blur-md z-50 animate-in fade-in duration-300" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] sm:w-full max-w-lg bg-[#0f1423] rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 lg:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-50 animate-in zoom-in-95 duration-300 border border-white/10 max-h-[90vh] overflow-y-auto custom-scrollbar" dir="rtl">
                  <div className="flex items-center justify-between mb-6 sm:mb-8 pb-5 sm:pb-6 border-b border-white/5">
                    <div>
                      <Dialog.Title className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-sm flex items-center gap-3">
                        <div className="p-2 sm:p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg sm:rounded-xl border border-indigo-500/20 shadow-inner"><Settings className="h-5 w-5 sm:h-6 sm:w-6" /></div>
                        إعدادات الاختبار
                      </Dialog.Title>
                      <p className="text-xs sm:text-sm text-slate-400 font-bold mt-2">تخصيص تجربة الاختبار للطلاب</p>
                    </div>
                    <Dialog.Close className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center bg-[#02040a] border border-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-xl sm:rounded-2xl transition-all active:scale-90 shadow-inner"><X className="h-4 w-4 sm:h-5 sm:w-5" /></Dialog.Close>
                  </div>
                  
                  <div className="space-y-6 sm:space-y-8">
                    <div className="space-y-4 sm:space-y-6">
                      <h4 className="text-[10px] sm:text-xs font-black text-indigo-400 uppercase tracking-widest border-b border-indigo-500/20 pb-3 drop-shadow-sm">الإعدادات العامة</h4>
                      <div className="space-y-3 sm:space-y-4">
                        {[
                          { label: 'ترتيب الأسئلة عشوائياً', desc: 'تغيير ترتيب الأسئلة لكل طالب', key: 'shuffle_questions' },
                          { label: 'ترتيب الخيارات عشوائياً', desc: 'تغيير ترتيب خيارات الإجابة', key: 'shuffle_options' },
                          { label: 'إظهار النتيجة فوراً', desc: 'عرض الدرجة للطالب بعد الإرسال', key: 'show_results_immediately' },
                          { label: 'مراقبة التبويبات (منع الغش)', desc: 'سحب الورقة عند الخروج (عطّله إذا وجد ملف مرفق)', key: 'prevent_tab_switch' },
                          { label: 'منع النسخ والطباعة', desc: 'يمنع الطالب من تحديد أو نسخ النص', key: 'prevent_copy' },
                        ].map((setting) => (
                          <div key={setting.key} className="flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#02040a]/60 border border-white/5 shadow-inner">
                            <div className="pl-3">
                              <p className="text-xs sm:text-sm font-black text-white tracking-tight drop-shadow-sm">{setting.label}</p>
                              <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold mt-0.5">{setting.desc}</p>
                            </div>
                            <Switch.Root 
                              checked={!!(exam.settings as any)?.[setting.key]}
                              onCheckedChange={(val) => setExam({ ...exam, settings: { ...(exam.settings || {}), [setting.key]: val } as any })}
                              className="w-10 sm:w-12 h-6 sm:h-7 bg-[#131836] rounded-full relative data-[state=checked]:bg-emerald-500 transition-colors duration-300 outline-none cursor-pointer shadow-inner border border-white/10 data-[state=checked]:border-emerald-400 shrink-0"
                            >
                              <Switch.Thumb className="block w-4 h-4 sm:w-5 sm:h-5 bg-slate-300 rounded-full shadow-md transition-transform duration-300 translate-x-1 data-[state=checked]:translate-x-[22px] sm:data-[state=checked]:translate-x-[26px] data-[state=checked]:bg-white" />
                            </Switch.Root>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-8 sm:mt-10 pt-5 sm:pt-6 border-t border-white/5 flex justify-center">
                    <Dialog.Close asChild>
                       <button className="px-10 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-indigo-600 text-white text-xs sm:text-sm font-black shadow-[0_0_15px_rgba(99,102,241,0.4)] border border-indigo-400/50 hover:bg-indigo-500 transition-all active:scale-95 w-full sm:w-auto">تم، إغلاق النافذة</button>
                    </Dialog.Close>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>

            <button onClick={() => setExam({...exam, status: exam.status === 'published' ? 'draft' : 'published'})} className={`h-10 sm:h-12 flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-black transition-all active:scale-95 border shadow-inner text-xs sm:text-sm whitespace-nowrap shrink-0 ${exam.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
              <CheckCircle className="h-4 w-4" /> <span className="hidden sm:inline">{exam.status === 'published' ? 'منشور' : 'مسودة'}</span>
            </button>

            <button onClick={handleSave} disabled={saving} className="h-10 sm:h-12 flex items-center justify-center gap-2 sm:gap-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-5 sm:px-8 rounded-xl sm:rounded-2xl hover:from-indigo-500 hover:to-blue-500 transition-all shadow-[0_0_15px_rgba(99,102,241,0.4)] font-black disabled:opacity-50 active:scale-95 border border-indigo-400/50 text-xs sm:text-sm whitespace-nowrap shrink-0">
              {saving ? <div className="h-4 w-4 sm:h-5 sm:w-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin"></div> : <Save className="h-4 w-4 sm:h-5 sm:w-5" />}
              <span className="hidden sm:inline">{exam.status === 'published' ? 'حفظ ونشر' : 'حفظ كمسودة'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 🚀 محتوى محرر الاختبار (Builder Body) */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 sm:space-y-10 relative z-10">
        
        {/* إعدادات الاختبار الأساسية (Royal Glass Card) */}
        <div className="glass-panel rounded-[2rem] sm:rounded-[3rem] border-t-[10px] sm:border-t-[16px] border-t-indigo-600 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-6 sm:p-10 space-y-6 sm:space-y-8 relative overflow-hidden bg-[#0f1423]/80">
          <div className="absolute -right-20 -top-20 h-48 w-48 sm:h-64 sm:w-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="space-y-3 sm:space-y-4 relative z-10">
            <input 
               type="text" 
               placeholder="عنوان الاختبار" 
               value={exam.title} 
               onChange={(e) => setExam({...exam, title: e.target.value})} 
               className="w-full text-2xl sm:text-4xl lg:text-5xl font-black text-white border-none focus:ring-0 placeholder:text-slate-600 p-0 bg-transparent tracking-tighter leading-tight outline-none drop-shadow-md" 
            />
            <textarea 
               placeholder="وصف الاختبار والتعليمات (اختياري)" 
               value={exam.description || ''} 
               onChange={(e) => setExam({...exam, description: e.target.value})} 
               className="w-full text-sm sm:text-base lg:text-lg text-slate-300 border-none focus:ring-0 placeholder:text-slate-600 p-0 resize-none h-16 sm:h-24 bg-transparent font-bold leading-relaxed outline-none custom-scrollbar" 
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 pt-6 sm:pt-8 border-t border-white/5 relative z-10">
            {isAdmin && (
              <div className="space-y-2 sm:space-y-3">
                <label className="text-[10px] sm:text-xs font-black text-indigo-400 uppercase tracking-widest block drop-shadow-sm">المعلم المسئول</label>
                <select value={exam.teacher_id || ''} onChange={(e) => setExam({...exam, teacher_id: e.target.value})} className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-[#02040a]/60 border border-white/5 focus:bg-[#02040a] focus:ring-2 focus:ring-indigo-500/50 outline-none font-bold text-white transition-all appearance-none cursor-pointer shadow-inner [&>option]:bg-[#0f1423] text-xs sm:text-sm">
                  <option value="">اختر المعلم</option>
                  {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-2 sm:space-y-3">
              <label className="text-[10px] sm:text-xs font-black text-indigo-400 uppercase tracking-widest block drop-shadow-sm">الدرجة العظمى</label>
              <input type="number" value={exam.max_score} onChange={(e) => setExam({...exam, max_score: parseInt(e.target.value) || 0})} className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-[#02040a]/60 border border-white/5 focus:bg-[#02040a] focus:ring-2 focus:ring-indigo-500/50 outline-none font-bold text-white transition-all appearance-none shadow-inner text-xs sm:text-sm" />
            </div>
            <div className="space-y-2 sm:space-y-3">
              <label className="text-[10px] sm:text-xs font-black text-indigo-400 uppercase tracking-widest block drop-shadow-sm">تاريخ الاختبار</label>
              <input type="date" value={exam.exam_date} onChange={(e) => setExam({...exam, exam_date: e.target.value})} className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-[#02040a]/60 border border-white/5 focus:bg-[#02040a] focus:ring-2 focus:ring-indigo-500/50 outline-none font-bold text-white transition-all appearance-none cursor-pointer shadow-inner text-xs sm:text-sm" style={{ colorScheme: 'dark' }} />
            </div>
            <div className="space-y-2 sm:space-y-3">
              <label className="text-[10px] sm:text-xs font-black text-indigo-400 uppercase tracking-widest block drop-shadow-sm">وقت البداية</label>
              <input type="time" value={exam.start_time} onChange={(e) => setExam({...exam, start_time: e.target.value})} className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-[#02040a]/60 border border-white/5 focus:bg-[#02040a] focus:ring-2 focus:ring-indigo-500/50 outline-none font-bold text-white transition-all appearance-none cursor-pointer shadow-inner text-xs sm:text-sm" style={{ colorScheme: 'dark' }} />
            </div>
            <div className="space-y-2 sm:space-y-3">
              <label className="text-[10px] sm:text-xs font-black text-indigo-400 uppercase tracking-widest block drop-shadow-sm">وقت النهاية</label>
              <input type="time" value={exam.end_time} onChange={(e) => setExam({...exam, end_time: e.target.value})} className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-[#02040a]/60 border border-white/5 focus:bg-[#02040a] focus:ring-2 focus:ring-indigo-500/50 outline-none font-bold text-white transition-all appearance-none cursor-pointer shadow-inner text-xs sm:text-sm" style={{ colorScheme: 'dark' }} />
            </div>
            <div className="space-y-2 sm:space-y-3">
              <label className="text-[10px] sm:text-xs font-black text-indigo-400 uppercase tracking-widest block drop-shadow-sm">المادة الدراسية</label>
              <select value={exam.subject_id} onChange={(e) => setExam({...exam, subject_id: e.target.value})} className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-[#02040a]/60 border border-white/5 focus:bg-[#02040a] focus:ring-2 focus:ring-indigo-500/50 outline-none font-bold text-white transition-all appearance-none cursor-pointer shadow-inner [&>option]:bg-[#0f1423] text-xs sm:text-sm">
                <option value="">اختر المادة</option>
                {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-2 sm:space-y-3 md:col-span-3 lg:col-span-3">
              <label className="text-[10px] sm:text-xs font-black text-indigo-400 uppercase tracking-widest block drop-shadow-sm">الشعب المستهدفة <span className="text-rose-500">*</span></label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                <label className={`flex items-center gap-2 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border cursor-pointer transition-colors shadow-inner ${exam.section_ids?.length === sections.length && sections.length > 0 ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-[#02040a]/60 border-white/5 text-slate-400 hover:border-white/20'}`}>
                  <input type="checkbox" checked={exam.section_ids?.length === sections.length && sections.length > 0} onChange={(e) => setExam({...exam, section_ids: e.target.checked ? sections.map((s: any) => s.id) : []})} className="hidden" />
                  <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors ${exam.section_ids?.length === sections.length && sections.length > 0 ? 'bg-indigo-500 border-indigo-400' : 'bg-[#0f1423] border-slate-600'}`}>
                     {exam.section_ids?.length === sections.length && sections.length > 0 && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold truncate">الجميع</span>
                </label>
                {sections.map((s: any) => (
                  <label key={s.id} className={`flex items-center gap-2 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border cursor-pointer transition-colors shadow-inner ${exam.section_ids?.includes(s.id) ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-[#02040a]/60 border-white/5 text-slate-400 hover:border-white/20'}`}>
                    <input type="checkbox" checked={exam.section_ids?.includes(s.id)} onChange={(e) => setExam({...exam, section_ids: e.target.checked ? [...(exam.section_ids || []), s.id] : (exam.section_ids || []).filter(id => id !== s.id)})} className="hidden" />
                    <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors ${exam.section_ids?.includes(s.id) ? 'bg-indigo-500 border-indigo-400' : 'bg-[#0f1423] border-slate-600'}`}>
                       {exam.section_ids?.includes(s.id) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold truncate">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 🚀 مساحة بناء الأسئلة (Reorder Group) */}
        <Reorder.Group axis="y" values={questions} onReorder={setQuestions} className="space-y-6 sm:space-y-10 relative z-10">
          <AnimatePresence initial={false}>
            {questions.map((q, index) => (
              <Reorder.Item key={q.id} value={q} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] group relative overflow-hidden bg-[#0f1423]/60 hover:border-indigo-500/30 transition-all">
                
                <div className="absolute top-0 left-1/2 -translate-x-1/2 p-2 opacity-0 lg:group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-20">
                   <GripVertical className="h-5 w-5 sm:h-6 sm:w-6 text-slate-500 hover:text-indigo-400" />
                </div>
                
                <div className="p-5 sm:p-8 lg:p-10 space-y-6 sm:space-y-8 relative z-10">
                  <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
                    
                    <div className="flex-1 w-full space-y-3 sm:space-y-4">
                      <label className="text-[10px] sm:text-xs font-black text-indigo-400 uppercase tracking-widest block drop-shadow-sm flex items-center gap-2">
                         <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shadow-inner">{index + 1}</div>
                         <span>نص السؤال</span>
                      </label>
                      <div className="bg-[#02040a]/40 rounded-[1.5rem] p-2 border border-white/5 shadow-inner">
                        <ForumEditor 
                          content={q.content || ''}
                          setContent={(val) => updateQuestion(q.id, { content: val })}
                          canUploadImage={true}
                          placeholder="اكتب نص السؤال، أو المسألة بالتفصيل هنا..."
                        />
                      </div>
                      <div className="pt-2">
                        <ImageUpload 
                          initialImageUrl={q.media_url} 
                          onUploadSuccess={(url) => updateQuestion(q.id, { media_url: url || undefined, media_type: url ? 'image' : undefined })} 
                          label="إرفاق صورة إضافية للسؤال (اختياري)" 
                        />
                      </div>
                    </div>

                    <div className="w-full lg:w-64 space-y-2 sm:space-y-3 shrink-0">
                      <label className="text-[10px] sm:text-xs font-black text-indigo-400 uppercase tracking-widest block drop-shadow-sm">نوع السؤال</label>
                      <select 
                        value={q.type} 
                        onChange={(e) => {
                           const type = e.target.value as QuestionType;
                           const updates: Partial<any> = { type };
                           if (['multiple_choice', 'multi_select', 'checkbox', 'radio'].includes(type)) {
                              updates.options = (q.options && q.options.length > 0) ? q.options : [{ id: crypto.randomUUID(), content: 'خيار 1', is_correct: false }];
                           } else if (type === 'true_false') {
                              updates.options = [
                                { id: crypto.randomUUID(), content: 'صح', is_correct: true },
                                { id: crypto.randomUUID(), content: 'خطأ', is_correct: false }
                              ];
                           } else {
                              updates.options = [];
                           }
                           updateQuestion(q.id, updates);
                        }} 
                        className="w-full px-4 sm:px-6 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-[#02040a]/80 border border-white/5 focus:ring-2 focus:ring-indigo-500/50 outline-none font-black text-white transition-all appearance-none cursor-pointer shadow-inner [&>option]:bg-[#0f1423] text-xs sm:text-sm"
                      >
                        <option value="multiple_choice">اختيار من متعدد</option>
                        <option value="true_false">صح أو خطأ</option>
                        <option value="multi_select">اختيار متعدد</option>
                        <option value="essay">سؤال مقالي</option>
                        <option value="fill_in_blank">ملء الفراغ</option>
                        <option value="file">رفع صورة / ملف (مهم)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4 sm:space-y-6">
                    {(['multiple_choice', 'multi_select', 'true_false', 'checkbox', 'radio'].includes(q.type as string)) ? (
                      <div className="space-y-3 sm:space-y-4">
                        <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest block pl-2">خيارات الإجابة</label>
                        <div className="grid grid-cols-1 gap-3 sm:gap-4">
                          {q.options?.map((opt: any, optIdx: number) => (
                            <div key={opt.id} className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all shadow-inner border group/opt ${opt.is_correct ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[#02040a]/40 border-white/5 hover:border-indigo-500/30'}`}>
                              <button onClick={() => updateOption(q.id, opt.id, { is_correct: !opt.is_correct })} className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl border-2 flex items-center justify-center transition-all shrink-0 active:scale-90 ${opt.is_correct ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'border-slate-600 bg-[#0f1423] hover:border-indigo-400 text-transparent'}`}>
                                {opt.is_correct && <Check className="h-4 w-4 sm:h-5 sm:w-5" />}
                              </button>
                              <input type="text" value={opt.content} onChange={(e) => updateOption(q.id, opt.id, { content: e.target.value })} placeholder={`الخيار ${optIdx + 1}`} className={`flex-1 bg-transparent border-none focus:ring-0 text-sm sm:text-base font-bold p-0 outline-none transition-colors ${opt.is_correct ? 'text-emerald-400 placeholder:text-emerald-500/50' : 'text-white placeholder:text-slate-600'}`} />
                              {q.options.length > 2 && q.type !== 'true_false' && (
                                <button onClick={() => deleteOption(q.id, opt.id)} className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center lg:opacity-0 group-hover/opt:opacity-100 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg sm:rounded-xl transition-all active:scale-90 shrink-0 bg-[#0f1423] lg:bg-transparent"><X className="h-4 w-4 sm:h-5 sm:w-5" /></button>
                              )}
                            </div>
                          ))}
                        </div>
                        {q.type !== 'true_false' && (
                          <button onClick={() => addOption(q.id)} className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-dashed border-white/20 text-slate-400 hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all font-black text-xs sm:text-sm group w-full sm:w-auto justify-center sm:justify-start active:scale-95 shadow-inner">
                            <Plus className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" /> <span>إضافة خيار إجابة</span>
                          </button>
                        )}
                      </div>
                    ) : ['file', 'file_upload'].includes(q.type as string) ? (
                       <div className="p-6 sm:p-8 bg-indigo-500/10 rounded-[1.5rem] sm:rounded-[2rem] border border-dashed border-indigo-500/30 flex flex-col items-center justify-center text-center gap-2 sm:gap-3 shadow-inner">
                         <UploadCloud className="h-8 w-8 sm:h-10 sm:w-10 text-indigo-400 drop-shadow-md" />
                         <p className="text-white font-bold text-sm sm:text-lg">سؤال إرفاق ملف / حل مصور</p>
                         <p className="text-slate-400 text-xs sm:text-sm font-medium max-w-xs">سيظهر للطالب زر خاص لرفع صورة لحله للإجابة على هذا السؤال.</p>
                       </div>
                    ) : q.type === 'essay' ? (
                      <div className="p-6 sm:p-8 bg-[#02040a]/40 rounded-[1.5rem] sm:rounded-[2rem] border border-dashed border-white/20 text-slate-500 font-bold italic text-center text-xs sm:text-sm shadow-inner">سيقوم الطالب بكتابة إجابته المقالية هنا...</div>
                    ) : (
                      <div className="p-6 sm:p-8 bg-[#02040a]/40 rounded-[1.5rem] sm:rounded-[2rem] border border-dashed border-white/20 text-slate-500 font-bold italic text-center text-xs sm:text-sm shadow-inner">أدخل النص أعلاه مع استخدام <span className="text-indigo-400 font-black not-italic px-1 bg-[#0f1423] rounded border border-white/10">[____]</span> لمكان الفراغ الذي سيملأه الطالب...</div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between pt-6 sm:pt-8 border-t border-white/5 gap-4 sm:gap-6 relative z-10">
                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full sm:w-auto">
                      <div className="flex items-center justify-between sm:justify-start gap-4 bg-[#02040a]/80 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border border-white/5 shadow-inner w-full sm:w-auto">
                        <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest shrink-0">النقاط:</span>
                        <input type="number" value={q.points} onChange={(e) => updateQuestion(q.id, { points: parseFloat(e.target.value) })} className="w-16 sm:w-20 bg-[#0f1423] border border-white/10 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500/50 text-base sm:text-xl font-black text-emerald-400 text-center tracking-tighter outline-none shadow-inner transition-all" />
                      </div>
                      
                      <label className="flex items-center justify-center sm:justify-start gap-2 cursor-pointer group/toggle w-full sm:w-auto">
                        <div className={`w-10 h-5 sm:w-12 sm:h-6 rounded-full p-1 transition-all duration-300 shadow-inner border border-white/5 ${q.is_required !== false ? 'bg-emerald-500' : 'bg-[#0f1423]'}`}>
                          <div className={`w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full transition-all duration-300 shadow-md ${q.is_required !== false ? 'translate-x-5 rtl:-translate-x-5 sm:translate-x-6 sm:rtl:-translate-x-6' : 'translate-x-0'}`} />
                        </div>
                        <input type="checkbox" className="hidden" checked={q.is_required !== false} onChange={(e) => updateQuestion(q.id, { is_required: e.target.checked })} />
                        <span className={`text-xs sm:text-sm font-black transition-colors ${q.is_required !== false ? 'text-emerald-400' : 'text-slate-500 group-hover/toggle:text-slate-300'}`}>سؤال إجباري</span>
                      </label>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
                      <button onClick={() => duplicateQuestion(q.id)} className="h-10 sm:h-12 px-4 sm:px-6 flex-1 sm:flex-none flex items-center justify-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl bg-[#02040a]/80 border border-white/5 text-slate-400 hover:text-white hover:bg-indigo-500/20 hover:border-indigo-500/30 transition-all active:scale-95 font-black text-xs sm:text-sm shadow-inner" title="تكرار السؤال"><Copy className="h-4 w-4 sm:h-5 sm:w-5" /> <span className="sm:hidden lg:inline">تكرار</span></button>
                      <button onClick={() => deleteQuestion(q.id)} className="h-10 sm:h-12 px-4 sm:px-6 flex-1 sm:flex-none flex items-center justify-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:text-white hover:bg-rose-600 transition-all active:scale-95 font-black text-xs sm:text-sm shadow-inner" title="حذف السؤال"><Trash2 className="h-4 w-4 sm:h-5 sm:w-5" /> <span className="sm:hidden lg:inline">حذف</span></button>
                    </div>
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>

        <div className="flex justify-center pt-8 sm:pt-10 pb-20 relative z-10">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 bg-[#090b14]/50 border border-dashed border-white/20 text-slate-400 px-8 sm:px-12 py-5 sm:py-6 rounded-[2rem] sm:rounded-[3rem] hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-[#0f1423]/80 hover:shadow-[0_0_30px_rgba(99,102,241,0.2)] transition-all font-black text-sm sm:text-xl group active:scale-95 w-full sm:w-auto shadow-inner">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-[#02040a] flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner border border-white/5"><Plus className="h-6 w-6 sm:h-8 sm:w-8 group-hover:scale-110 transition-transform drop-shadow-md" /></div>
                <span>إضافة سؤال جديد للاختبار</span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="bg-[#0f1423]/95 backdrop-blur-2xl rounded-[1.5rem] sm:rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/10 p-3 sm:p-4 min-w-[260px] sm:min-w-[300px] z-50 animate-in fade-in zoom-in-95 duration-200" sideOffset={10}>
                <div className="px-3 sm:px-4 py-2 mb-2 border-b border-white/5"><p className="text-[9px] sm:text-[10px] font-black text-indigo-400/80 uppercase tracking-widest drop-shadow-sm">اختر نوع السؤال</p></div>
                {[
                  { type: 'multiple_choice', label: 'اختيار من متعدد', icon: List, desc: 'سؤال مع خيارات إجابة واحدة صحيحة' },
                  { type: 'true_false', label: 'صح أو خطأ', icon: CheckSquare, desc: 'سؤال بإجابة منطقية بسيطة' },
                  { type: 'multi_select', label: 'اختيار متعدد', icon: CheckSquare, desc: 'سؤال مع عدة إجابات صحيحة محتملة' },
                  { type: 'file', label: 'رفع صورة / ملف', icon: UploadCloud, desc: 'يطلب من الطالب تصوير حله ورفعه' },
                  { type: 'essay', label: 'سؤال مقالي', icon: AlignLeft, desc: 'سؤال يتطلب كتابة نصية من الطالب' },
                  { type: 'fill_in_blank', label: 'ملء الفراغ', icon: Type, desc: 'سؤال يتطلب إكمال جملة ناقصة' },
                ].map((item) => (
                  <DropdownMenu.Item key={item.type} onClick={() => addQuestion(item.type as QuestionType)} className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 text-slate-300 hover:bg-white/5 hover:text-white rounded-xl sm:rounded-2xl outline-none cursor-pointer transition-all group mb-1 last:mb-0">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-[#02040a] border border-white/5 flex items-center justify-center group-hover:bg-indigo-500/20 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-colors shadow-inner shrink-0"><item.icon className="h-4 w-4 sm:h-5 sm:w-5" /></div>
                    <div className="min-w-0 pr-1">
                      <p className="text-xs sm:text-sm font-black tracking-tight leading-tight mb-0.5 sm:mb-1 truncate">{item.label}</p>
                      <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 group-hover:text-slate-400 truncate">{item.desc}</p>
                    </div>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </main>

      {/* 🚀 Floating Action Bar for Mobile */}
      <div className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 md:hidden flex items-center gap-3 sm:gap-4 bg-[#0f1423]/90 backdrop-blur-xl border border-white/10 p-2.5 sm:p-3 rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 w-[90%] justify-center max-w-sm">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="h-12 w-12 sm:h-14 sm:w-14 flex items-center justify-center bg-indigo-600 text-white rounded-xl sm:rounded-2xl shadow-[0_0_15px_rgba(79,70,229,0.4)] border border-indigo-400/50 active:scale-95 transition-transform shrink-0"><Plus className="h-6 w-6 sm:h-7 sm:w-7" /></button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
              <DropdownMenu.Content className="bg-[#0f1423]/95 backdrop-blur-2xl rounded-[1.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/10 p-3 min-w-[260px] z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300 mb-2" sideOffset={10}>
                <div className="px-3 py-2 mb-1 border-b border-white/5"><p className="text-[9px] font-black text-indigo-400/80 uppercase tracking-widest drop-shadow-sm">اختر نوع السؤال</p></div>
                {[
                  { type: 'multiple_choice', label: 'اختيار من متعدد', icon: List },
                  { type: 'true_false', label: 'صح أو خطأ', icon: CheckSquare },
                  { type: 'multi_select', label: 'اختيار متعدد', icon: CheckSquare },
                  { type: 'file', label: 'رفع صورة / ملف', icon: UploadCloud },
                  { type: 'essay', label: 'سؤال مقالي', icon: AlignLeft },
                  { type: 'fill_in_blank', label: 'ملء الفراغ', icon: Type },
                ].map((item) => (
                  <DropdownMenu.Item key={item.type} onClick={() => addQuestion(item.type as QuestionType)} className="flex items-center gap-3 px-3 py-3 text-slate-300 hover:bg-white/5 hover:text-white rounded-xl outline-none cursor-pointer transition-all group mb-1 last:mb-0">
                    <div className="h-8 w-8 rounded-lg bg-[#02040a] border border-white/5 flex items-center justify-center group-hover:bg-indigo-500/20 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-colors shadow-inner shrink-0"><item.icon className="h-4 w-4" /></div>
                    <p className="text-sm font-black tracking-tight truncate">{item.label}</p>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
        <div className="h-8 sm:h-10 w-px bg-white/10 mx-0.5 sm:mx-1 shrink-0" />
        <button onClick={handleSave} disabled={saving} className="flex-1 h-12 sm:h-14 flex items-center justify-center gap-2 sm:gap-3 bg-gradient-to-r from-emerald-600 to-teal-500 border border-emerald-400/50 text-slate-950 rounded-xl sm:rounded-2xl shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95 transition-transform font-black text-sm sm:text-base disabled:opacity-50">
           {saving ? <div className="h-5 w-5 sm:h-6 sm:w-6 border-2 sm:border-4 border-slate-950 border-t-transparent rounded-full animate-spin"></div> : <Save className="h-5 w-5 sm:h-6 sm:w-6" />}
           <span>حفظ ونشر</span>
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #02040a; border-radius: 12px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 12px; border: 1px solid #02040a; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4f46e5; }
      `}} />
    </div>
  );
}
