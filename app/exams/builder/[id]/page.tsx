'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Plus, Save, Eye, Settings, Trash2, 
  Copy, GripVertical, Image as ImageIcon, 
  Video, FileText, ChevronDown, Check,
  X, HelpCircle, AlertCircle, ArrowRight,
  MoreVertical, Type, List, CheckSquare,
  AlignLeft, Hash, Link as LinkIcon, Clock, CheckCircle, UploadCloud
} from 'lucide-react';
import { motion, Reorder, AnimatePresence } from 'motion/react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Switch from '@radix-ui/react-switch';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import ForumEditor from '@/components/ForumEditor'; 

import { Question, QuestionType, Option, createQuestion } from '@/types/question';

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

import { useAuth } from '@/context/auth-context';
import { useSchoolFormData } from '@/hooks/useSchoolFormData';
import ImageUpload from '@/components/ImageUpload';

export default function QuizBuilder() {
  const params = useParams();
  const router = useRouter();
  const { user, userRole } = useAuth() as any;
  const isNew = params.id === 'new';
  
  const { fetchExamDetails, saveExam } = useExamsSystem();
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
      type: type, 
      is_required: true 
    };

    if (type === 'true_false') {
        newQuestion.options = [
            { id: crypto.randomUUID(), content: 'صح', is_correct: true },
            { id: crypto.randomUUID(), content: 'خطأ', is_correct: false }
        ];
    }
    setQuestions(prev => [...prev, newQuestion]);
  }, []);

  useEffect(() => {
    setIsAdmin(userRole === 'admin' || userRole === 'management');
  }, [userRole]);

  const fetchInitialData = useCallback(async () => {
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
           let qType = q.type;
           if (q.content?.includes('') || qType === 'file_upload') qType = 'file';
           return {...q, type: qType, is_required: q.is_required ?? true};
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
  }, [isNew, params.id, addQuestion, user, fetchExamDetails]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  const updateQuestion = (id: string, updates: Partial<any>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const deleteQuestion = async (id: string) => {
    const question = questions.find(q => q.id === id);
    if (question?.media_url) await deleteFromCloudinary(question.media_url);
    setQuestions(questions.filter(q => q.id !== id));
  };

  const duplicateQuestion = (id: string) => {
    const question = questions.find(q => q.id === id);
    if (question) {
      const duplicated = {
        ...question,
        id: crypto.randomUUID(),
        options: question.options?.map((o: any) => ({ ...o, id: crypto.randomUUID() })) || []
      };
      const index = questions.findIndex(q => q.id === id);
      const newQuestions = [...questions];
      newQuestions.splice(index + 1, 0, duplicated);
      setQuestions(newQuestions);
    }
  };

  const addOption = (questionId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return { ...q, options: [...(q.options || []), { id: crypto.randomUUID(), content: '', is_correct: false }] };
      }
      return q;
    }));
  };

  const updateOption = (questionId: string, optionId: string, updates: Partial<Option>) => {
    setQuestions(questions.map(q => {
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
  };

  const deleteOption = (questionId: string, optionId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return { ...q, options: (q.options || []).filter((o: any) => o.id !== optionId) };
      }
      return q;
    }));
  };

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

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 relative">
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-6 left-1/2 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border backdrop-blur-md ${
              notification.type === 'success' ? 'bg-emerald-50/90 text-emerald-800 border-emerald-200' : 'bg-red-50/90 text-red-800 border-red-200'
            }`}
          >
            <div className="h-8 w-8 rounded-full bg-white/50 flex items-center justify-center">
              {notification.type === 'success' ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            </div>
            <div className="font-black tracking-tight">{notification.message}</div>
            <button onClick={() => setNotification(null)} className="p-1 hover:bg-black/5 rounded-lg transition-colors"><X className="h-4 w-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-40 glass-card border-b border-white/60 px-6 py-4 shadow-xl shadow-slate-200/20">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <button onClick={() => router.back()} className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-500 hover:text-indigo-600 hover:shadow-lg transition-all active:scale-95">
              <ArrowRight className="h-5 w-5" />
            </button>
            <div className="hidden sm:block space-y-0.5">
              <h1 className="text-xl font-black text-slate-900 tracking-tight truncate max-w-[300px]">{exam.title || 'اختبار جديد'}</h1>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">جاري الحفظ تلقائياً</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`hidden lg:flex items-center gap-3 px-5 py-3 rounded-2xl border font-black transition-all ${
              questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0) === (Number(exam.max_score) || 0)
                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-600' : 'bg-amber-50/50 border-amber-100 text-amber-600'
            }`}>
              <div className={`h-2 w-2 rounded-full ${questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0) === (Number(exam.max_score) || 0) ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
              <span className="text-xs uppercase tracking-widest opacity-60">مجموع الدرجات:</span>
              <span className="text-lg tracking-tight">{questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0)} / {exam.max_score || 0}</span>
            </div>

            <Dialog.Root>
              <Dialog.Trigger asChild>
                <button className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-600 hover:text-indigo-600 hover:shadow-lg transition-all active:scale-95"><Settings className="h-5 w-5" /></button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-[40px] p-10 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-300 border border-white/20" dir="rtl">
                  <div className="flex items-center justify-between mb-10">
                    <div>
                      <Dialog.Title className="text-3xl font-black text-slate-900 tracking-tight">إعدادات الاختبار</Dialog.Title>
                      <p className="text-slate-500 font-bold">تخصيص تجربة الاختبار للطلاب</p>
                    </div>
                    <Dialog.Close className="h-12 w-12 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all active:scale-95"><X className="h-6 w-6 text-slate-500" /></Dialog.Close>
                  </div>
                  
                  <div className="space-y-10">
                    <div className="space-y-6">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-4">الإعدادات العامة</h4>
                      <div className="space-y-4">
                        {[
                          { label: 'ترتيب الأسئلة عشوائياً', desc: 'تغيير ترتيب الأسئلة لكل طالب', key: 'shuffle_questions' },
                          { label: 'ترتيب الخيارات عشوائياً', desc: 'تغيير ترتيب خيارات الإجابة', key: 'shuffle_options' },
                          { label: 'إظهار النتيجة فوراً', desc: 'عرض الدرجة للطالب بعد الإرسال', key: 'show_results_immediately' },
                          { label: 'مراقبة تبديل النوافذ (منع الغش)', desc: 'سحب الورقة عند الخروج (عطّله إذا كان هناك إرفاق ملف)', key: 'prevent_tab_switch' },
                          { label: 'منع النسخ والطباعة', desc: 'يمنع الطالب من تحديد النص، نسخه، أو طباعته', key: 'prevent_copy' },
                        ].map((setting) => (
                          <div key={setting.key} className="flex items-center justify-between p-4 rounded-3xl bg-slate-50/50 border border-slate-100">
                            <div>
                              <p className="text-sm font-black text-slate-800 tracking-tight">{setting.label}</p>
                              <p className="text-xs text-slate-500 font-bold">{setting.desc}</p>
                            </div>
                            <Switch.Root 
                              checked={!!(exam.settings as any)?.[setting.key]}
                              onCheckedChange={(val) => setExam({ ...exam, settings: { ...(exam.settings || {}), [setting.key]: val } as any })}
                              className="w-14 h-8 bg-slate-200 rounded-full relative data-[state=checked]:bg-indigo-600 transition-all outline-none cursor-pointer shadow-inner"
                            >
                              <Switch.Thumb className="block w-6 h-6 bg-white rounded-full shadow-xl transition-transform duration-200 translate-x-1 will-change-transform data-[state=checked]:translate-x-[26px]" />
                            </Switch.Root>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="space-y-3">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">مدة الاختبار (دقيقة)</label>
                        <div className="relative"><Clock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <input type="number" value={exam.duration} onChange={(e) => setExam({...exam, duration: parseInt(e.target.value) || 0})} className="w-full pr-12 pl-4 py-4 rounded-2xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 outline-none font-black text-slate-900 transition-all" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">عدد المحاولات</label>
                        <div className="relative"><HelpCircle className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <input type="number" value={exam.max_attempts} onChange={(e) => setExam({...exam, max_attempts: parseInt(e.target.value) || 0})} className="w-full pr-12 pl-4 py-4 rounded-2xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 outline-none font-black text-slate-900 transition-all" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">الدرجة الكلية</label>
                        <div className="relative"><Hash className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <input type="number" value={exam.max_score} onChange={(e) => setExam({...exam, max_score: parseInt(e.target.value) || 0})} className="w-full pr-12 pl-4 py-4 rounded-2xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 outline-none font-black text-slate-900 transition-all" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>

            <button onClick={() => setExam({...exam, status: exam.status === 'published' ? 'draft' : 'published'})} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black transition-all active:scale-95 border ${exam.status === 'published' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'}`}>
              <CheckCircle className="h-5 w-5" /> <span>{exam.status === 'published' ? 'منشور' : 'مسودة'}</span>
            </button>

            <button onClick={handleSave} disabled={saving} className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-3 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 font-black disabled:opacity-50 active:scale-95">
              {saving ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save className="h-5 w-5" />}
              <span>{exam.status === 'published' ? 'حفظ ونشر الاختبار' : 'حفظ كمسودة'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        <div className="glass-card rounded-[40px] border-t-[16px] border-t-indigo-600 border border-white/60 shadow-2xl shadow-slate-200/50 p-10 space-y-8 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 h-64 w-64 bg-indigo-50/30 rounded-full blur-3xl -z-10" />
          <div className="space-y-4">
            <input type="text" placeholder="عنوان الاختبار" value={exam.title} onChange={(e) => setExam({...exam, title: e.target.value})} className="w-full text-5xl font-black text-slate-900 border-none focus:ring-0 placeholder:text-slate-200 p-0 bg-transparent tracking-tighter leading-tight" />
            <textarea placeholder="وصف الاختبار (اختياري)" value={exam.description || ''} onChange={(e) => setExam({...exam, description: e.target.value})} className="w-full text-xl text-slate-500 border-none focus:ring-0 placeholder:text-slate-200 p-0 resize-none h-16 bg-transparent font-bold leading-relaxed" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-10 border-t border-slate-100">
            {isAdmin && (
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">المعلم المسئول</label>
                <select value={exam.teacher_id || ''} onChange={(e) => setExam({...exam, teacher_id: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-700 transition-all appearance-none cursor-pointer">
                  <option value="">اختر المعلم</option>
                  {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">الدرجة العظمى</label>
              <input type="number" value={exam.max_score} onChange={(e) => setExam({...exam, max_score: parseInt(e.target.value) || 0})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-700 transition-all appearance-none" />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">تاريخ الاختبار</label>
              <input type="date" value={exam.exam_date} onChange={(e) => setExam({...exam, exam_date: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-700 transition-all appearance-none cursor-pointer" />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">وقت البداية</label>
              <input type="time" value={exam.start_time} onChange={(e) => setExam({...exam, start_time: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-700 transition-all appearance-none cursor-pointer" />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">وقت النهاية</label>
              <input type="time" value={exam.end_time} onChange={(e) => setExam({...exam, end_time: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-700 transition-all appearance-none cursor-pointer" />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">المادة الدراسية</label>
              <select value={exam.subject_id} onChange={(e) => setExam({...exam, subject_id: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-700 transition-all appearance-none cursor-pointer">
                <option value="">اختر المادة</option>
                {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-3 md:col-span-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">الشعب المستهدفة</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
                  <input type="checkbox" checked={exam.section_ids?.length === sections.length && sections.length > 0} onChange={(e) => setExam({...exam, section_ids: e.target.checked ? sections.map((s: any) => s.id) : []})} className="rounded text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm font-bold text-slate-700">الجميع</span>
                </label>
                {sections.map((s: any) => (
                  <label key={s.id} className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
                    <input type="checkbox" checked={exam.section_ids?.includes(s.id)} onChange={(e) => setExam({...exam, section_ids: e.target.checked ? [...(exam.section_ids || []), s.id] : (exam.section_ids || []).filter(id => id !== s.id)})} className="rounded text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-sm font-bold text-slate-700 truncate">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Reorder.Group axis="y" values={questions} onReorder={setQuestions} className="space-y-10">
          <AnimatePresence initial={false}>
            {questions.map((q, index) => (
              <Reorder.Item key={q.id} value={q} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card rounded-[40px] border border-white/60 shadow-2xl shadow-slate-200/50 group relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 p-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"><GripVertical className="h-6 w-6 text-slate-300" /></div>
                <div className="p-10 space-y-10">
                  <div className="flex flex-col md:flex-row gap-8">
                    
                    <div className="flex-1 w-full space-y-4">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">نص السؤال {index + 1}</label>
                      <ForumEditor 
                        content={q.content || ''}
                        setContent={(val) => updateQuestion(q.id, { content: val })}
                        canUploadImage={true}
                        placeholder="اكتب نص السؤال، أو المسألة بالتفصيل هنا..."
                      />
                      <div className="pt-2"><ImageUpload initialImageUrl={q.media_url} onUploadSuccess={(url) => updateQuestion(q.id, { media_url: url || undefined, media_type: url ? 'image' : undefined })} label="إرفاق صورة إضافية للسؤال (اختياري)" /></div>
                    </div>

                    <div className="w-full md:w-64 space-y-3">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">نوع السؤال</label>
                      <select 
                        value={q.type} 
                        onChange={(e) => {
                           const type = e.target.value as QuestionType;
                           const updates: Partial<any> = { type };
                           
                           // 🚀 الحل الآمن للـ String لتجاوز TypeScript بـ Netlify:
                           let cleanContent = q.content || '';
                           if (type !== 'file' && cleanContent) {
                               cleanContent = cleanContent.split('').join('');
                               updates.content = cleanContent;
                           }

                           if ((type === 'multiple_choice' || type === 'checkbox') && (!q.options || q.options.length === 0)) {
                              updates.options = [{ id: crypto.randomUUID(), content: 'خيار 1', is_correct: false }];
                           } else if (type === 'true_false') {
                              updates.options = [
                                { id: crypto.randomUUID(), content: 'صح', is_correct: true },
                                { id: crypto.randomUUID(), content: 'خطأ', is_correct: false }
                              ];
                           } else if (['essay', 'fill_in_blank', 'file', 'file_upload'].includes(type as string)) {
                              updates.options = [];
                           }
                           updateQuestion(q.id, updates);
                        }} 
                        className="w-full px-6 py-5 rounded-3xl bg-white border-0 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none font-black text-slate-700 transition-all appearance-none cursor-pointer"
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

                  <div className="space-y-6">
                    {(q.type === 'multiple_choice' || q.type === 'multi_select' || q.type === 'true_false') ? (
                      <div className="space-y-4">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">خيارات الإجابة</label>
                        <div className="grid grid-cols-1 gap-4">
                          {q.options?.map((opt: any, optIdx: number) => (
                            <div key={opt.id} className="flex items-center gap-5 p-4 rounded-3xl bg-slate-50/50 border border-slate-100 group/opt hover:bg-white hover:shadow-lg transition-all">
                              <button onClick={() => updateOption(q.id, opt.id, { is_correct: !opt.is_correct })} className={`h-10 w-10 rounded-2xl border-2 flex items-center justify-center transition-all shrink-0 ${opt.is_correct ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200' : 'border-slate-200 bg-white hover:border-indigo-500'}`}>
                                {opt.is_correct && <Check className="h-6 w-6" />}
                              </button>
                              <input type="text" value={opt.content} onChange={(e) => updateOption(q.id, opt.id, { content: e.target.value })} placeholder={`الخيار ${optIdx + 1}`} className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-bold text-slate-700 p-0 placeholder:text-slate-300" />
                              {q.options.length > 2 && q.type !== 'true_false' && (
                                <button onClick={() => deleteOption(q.id, opt.id)} className="h-10 w-10 flex items-center justify-center opacity-0 group-hover/opt:opacity-100 hover:bg-red-50 hover:text-red-600 rounded-xl text-slate-400 transition-all active:scale-95"><X className="h-5 w-5" /></button>
                              )}
                            </div>
                          ))}
                        </div>
                        {q.type !== 'true_false' && (
                          <button onClick={() => addOption(q.id)} className="flex items-center gap-3 px-6 py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-black text-sm group">
                            <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" /> <span>إضافة خيار إجابة</span>
                          </button>
                        )}
                      </div>
                    ) : ['file', 'file_upload'].includes(q.type as string) ? (
                       <div className="p-8 bg-indigo-50/50 rounded-[32px] border-2 border-dashed border-indigo-200 flex flex-col items-center justify-center text-center gap-3">
                         <UploadCloud className="h-10 w-10 text-indigo-400" />
                         <p className="text-indigo-900 font-bold text-lg">سؤال إرفاق ملف / حل مصور</p>
                         <p className="text-indigo-500 text-sm font-medium">سيظهر للطالب زر خاص لرفع صورة لحله للإجابة على هذا السؤال.</p>
                       </div>
                    ) : q.type === 'essay' ? (
                      <div className="p-8 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-200 text-slate-400 font-bold italic text-center">سيقوم الطالب بكتابة إجابته المقالية هنا...</div>
                    ) : (
                      <div className="p-8 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-200 text-slate-400 font-bold italic text-center">أدخل النص مع استخدام [____] لمكان الفراغ الذي سيملأه الطالب...</div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between pt-10 border-t border-slate-100 gap-6">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-4 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 shadow-inner">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">النقاط:</span>
                        <input type="number" value={q.points} onChange={(e) => updateQuestion(q.id, { points: parseFloat(e.target.value) })} className="w-16 bg-transparent border-none focus:ring-0 text-xl font-black text-slate-900 p-0 text-center tracking-tighter" />
                      </div>
                      
                      <label className="flex items-center gap-2 cursor-pointer group/toggle ml-4">
                        <div className={`w-10 h-5 rounded-full p-1 transition-all duration-300 ${q.is_required !== false ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                          <div className={`w-3 h-3 bg-white rounded-full transition-all duration-300 ${q.is_required !== false ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'}`} />
                        </div>
                        <input type="checkbox" className="hidden" checked={q.is_required !== false} onChange={(e) => updateQuestion(q.id, { is_required: e.target.checked })} />
                        <span className="text-sm font-black text-slate-500 group-hover/toggle:text-slate-700">سؤال إجباري</span>
                      </label>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button onClick={() => duplicateQuestion(q.id)} className="h-12 px-6 flex items-center gap-3 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-slate-900 hover:shadow-lg transition-all active:scale-95 font-black text-sm" title="تكرار السؤال"><Copy className="h-5 w-5" /> <span>تكرار</span></button>
                      <button onClick={() => deleteQuestion(q.id)} className="h-12 px-6 flex items-center gap-3 rounded-2xl bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 transition-all active:scale-95 font-black text-sm" title="حذف السؤال"><Trash2 className="h-5 w-5" /> <span>حذف</span></button>
                    </div>
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>

        <div className="flex justify-center pt-10">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-4 bg-white border-2 border-dashed border-slate-300 text-slate-500 px-12 py-6 rounded-[40px] hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 hover:shadow-2xl hover:shadow-indigo-200/50 transition-all font-black text-xl group active:scale-95">
                <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all"><Plus className="h-8 w-8 group-hover:scale-110 transition-transform" /></div>
                <span>إضافة سؤال جديد للاختبار</span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="bg-white rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-slate-100 p-4 min-w-[280px] z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="px-4 py-2 mb-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">اختر نوع السؤال</p></div>
                {[
                  { type: 'multiple_choice', label: 'اختيار من متعدد', icon: List, desc: 'سؤال مع خيارات إجابة واحدة صحيحة' },
                  { type: 'true_false', label: 'صح أو خطأ', icon: CheckSquare, desc: 'سؤال بإجابة منطقية بسيطة' },
                  { type: 'multi_select', label: 'اختيار متعدد', icon: CheckSquare, desc: 'سؤال مع عدة إجابات صحيحة محتملة' },
                  { type: 'file', label: 'رفع صورة / ملف', icon: UploadCloud, desc: 'يطلب من الطالب تصوير حله ورفعه' },
                  { type: 'essay', label: 'سؤال مقالي', icon: AlignLeft, desc: 'سؤال يتطلب كتابة نصية من الطالب' },
                  { type: 'fill_in_blank', label: 'ملء الفراغ', icon: Type, desc: 'سؤال يتطلب إكمال جملة ناقصة' },
                ].map((item) => (
                  <DropdownMenu.Item key={item.type} onClick={() => addQuestion(item.type as QuestionType)} className="flex items-center gap-4 px-4 py-3 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-2xl outline-none cursor-pointer transition-all group">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-white transition-colors"><item.icon className="h-5 w-5" /></div>
                    <div><p className="text-sm font-black tracking-tight">{item.label}</p><p className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-400">{item.desc}</p></div>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </main>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 md:hidden flex items-center gap-4 bg-white/80 backdrop-blur-xl border border-white/60 p-3 rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] z-40">
        <button onClick={() => addQuestion('multiple_choice')} className="h-14 w-14 flex items-center justify-center bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-200 active:scale-90 transition-transform"><Plus className="h-8 w-8" /></button>
        <div className="h-8 w-px bg-slate-200 mx-1" />
        <button onClick={handleSave} className="h-14 px-8 flex items-center gap-3 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-200 active:scale-90 transition-transform font-black"><Save className="h-6 w-6" /><span>حفظ</span></button>
      </div>
    </div>
  );
}
