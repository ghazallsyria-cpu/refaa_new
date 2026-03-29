'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Save, Eye, Settings, Trash2, 
  Copy, GripVertical, Image as ImageIcon, 
  Video, FileText, X, HelpCircle, AlertCircle, ArrowRight,
  MoreVertical, Type, List, CheckSquare,
  AlignLeft, Hash, Clock, CheckCircle, Check
} from 'lucide-react';
import { motion, Reorder, AnimatePresence } from 'motion/react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Switch from '@radix-ui/react-switch';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import { Question, QuestionType, Option, createQuestion } from '@/types/question';
import { useAuth } from '@/context/auth-context';
import { useSchoolFormData } from '@/hooks/useSchoolFormData';
import ImageUpload from '@/components/ImageUpload';
import { useParams, useRouter } from 'next/navigation';

type ExamData = {
  id?: string;
  title: string;
  description: string | null;
  subject_id: string;
  section_ids: string[];
  teacher_id?: string;
  duration: number;
  max_attempts: number;
  max_score: number;
  exam_date: string;
  start_time: string;
  end_time: string;
  status: 'draft' | 'published' | 'archived';
  settings: {
    shuffle_questions: boolean;
    shuffle_options: boolean;
    show_results_immediately: boolean;
    allow_backtracking: boolean;
  };
};

export default function App() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, userRole } = useAuth();
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
      allow_backtracking: true
    }
  });

  const { data: formData, isLoading: formLoading } = useSchoolFormData();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const subjects = formData?.subjects || [];
  const sections = (formData?.sections || []).map(s => ({
    id: s.id,
    name: s.classes?.name ? `${s.classes.name} - ${s.name}` : s.name
  }));
  const teachers = (formData?.teachers || []).map(t => ({
    id: t.id,
    full_name: t.user?.full_name || ''
  }));

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const addQuestion = useCallback((type: QuestionType) => {
    const newQuestion = createQuestion(type);
    setQuestions(prev => [...prev, newQuestion]);
  }, []);

  useEffect(() => {
    setIsAdmin(userRole === 'admin' || userRole === 'management');
  }, [userRole]);

  const fetchInitialData = useCallback(async () => {
    try {
      if (!isNew) {
        const { exam: examData, questions: questionsData } = await fetchExamDetails(params.id as string);
        
        setExam({
          ...examData,
          section_ids: examData.section_ids || [],
          settings: {
            shuffle_questions: examData.settings?.shuffle_questions ?? false,
            shuffle_options: examData.settings?.shuffle_options ?? false,
            show_results_immediately: examData.settings?.show_results_immediately ?? true,
            allow_backtracking: examData.settings?.allow_backtracking ?? true,
          }
        });

        setQuestions(questionsData || []);
      } else {
        addQuestion('multiple_choice');
        if (user) {
          setExam(prev => ({ ...prev, teacher_id: user.id }));
        }
      }
    } catch (err) {
      console.error('Error fetching builder data:', err);
    } finally {
      setLoading(false);
    }
  }, [isNew, params.id, addQuestion, user, fetchExamDetails]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const deleteQuestion = async (id: string) => {
    const question = questions.find(q => q.id === id);
    if (question?.media_url) {
      await deleteFromCloudinary(question.media_url);
    }
    setQuestions(questions.filter(q => q.id !== id));
  };

  const duplicateQuestion = (id: string) => {
    const question = questions.find(q => q.id === id);
    if (question) {
      const duplicated = {
        ...question,
        id: crypto.randomUUID(),
        options: question.options.map(o => ({ ...o, id: crypto.randomUUID() }))
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
        return {
          ...q,
          options: [...q.options, { id: crypto.randomUUID(), content: '', is_correct: false }]
        };
      }
      return q;
    }));
  };

  const updateOption = (questionId: string, optionId: string, updates: Partial<Option>) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const newOptions = q.options.map(o => {
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
        return { ...q, options: q.options.filter(o => o.id !== optionId) };
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
      if (!finalTeacherId && userRole === 'admin') {
        if (teachers.length > 0) {
          finalTeacherId = teachers[0].id;
        } else {
          throw new Error('يجب اختيار معلم للاختبار');
        }
      }

      const examPayload = {
        ...exam,
        teacher_id: userRole === 'teacher' ? user?.id : finalTeacherId,
        max_score: exam.max_score || 100,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 relative font-sans" dir="rtl">
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-6 left-1/2 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border backdrop-blur-md ${
              notification.type === 'success' ? 'bg-emerald-50/90 text-emerald-800 border-emerald-200' : 'bg-red-50/90 text-red-800 border-red-200'
            }`}
          >
            <div className="h-8 w-8 rounded-full bg-white/50 flex items-center justify-center shrink-0">
              {notification.type === 'success' ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            </div>
            <div className="font-black tracking-tight">{notification.message}</div>
            <button onClick={() => setNotification(null)} className="p-1 hover:bg-black/5 rounded-lg transition-colors shrink-0">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5 w-full sm:w-auto">
            <button 
              onClick={() => router.back()}
              className="h-12 w-12 flex items-center justify-center rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-indigo-600 hover:shadow-md transition-all active:scale-95 shrink-0"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <div className="space-y-0.5 w-full">
              <h1 className="text-xl font-black text-slate-900 tracking-tight truncate max-w-[200px] sm:max-w-[300px]">
                {exam.title || 'اختبار جديد'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border font-black transition-all shrink-0 ${
              questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0) === (Number(exam.max_score) || 0)
                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-600'
                : 'bg-amber-50/50 border-amber-100 text-amber-600'
            }`}>
              <div className={`h-2 w-2 rounded-full ${
                questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0) === (Number(exam.max_score) || 0)
                  ? 'bg-emerald-500'
                  : 'bg-amber-500 animate-pulse'
              }`} />
              <span className="text-xs uppercase tracking-widest opacity-60">مجموع الدرجات:</span>
              <span className="text-lg tracking-tight">
                {questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0)} / {exam.max_score || 0}
              </span>
            </div>

            {!isNew && (
              <button 
                onClick={() => router.push(`/exams/take/${params.id}`)}
                className="hidden md:flex items-center gap-3 px-6 py-3 text-sm font-black text-slate-600 hover:bg-slate-50 hover:shadow-sm rounded-2xl transition-all active:scale-95 border border-transparent hover:border-slate-200 shrink-0"
              >
                <Eye className="h-5 w-5" />
                <span>معاينة</span>
              </button>
            )}

            <Dialog.Root>
              <Dialog.Trigger asChild>
                <button className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:shadow-md transition-all active:scale-95 shrink-0">
                  <Settings className="h-5 w-5" />
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] sm:w-full max-w-lg bg-white rounded-3xl p-6 sm:p-10 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" dir="rtl">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <Dialog.Title className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">إعدادات الاختبار</Dialog.Title>
                      <p className="text-slate-500 font-bold text-sm mt-1">تخصيص تجربة الاختبار للطلاب</p>
                    </div>
                    <Dialog.Close className="h-10 w-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-xl transition-all active:scale-95 shrink-0">
                      <X className="h-5 w-5 text-slate-500" />
                    </Dialog.Close>
                  </div>
                  
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">الإعدادات العامة</h4>
                      <div className="space-y-3">
                        {[
                          { label: 'ترتيب الأسئلة عشوائياً', desc: 'تغيير ترتيب الأسئلة لكل طالب', key: 'shuffle_questions' },
                          { label: 'ترتيب الخيارات عشوائياً', desc: 'تغيير ترتيب خيارات الإجابة', key: 'shuffle_options' },
                          { label: 'إظهار النتيجة فوراً', desc: 'عرض الدرجة للطالب بعد الإرسال', key: 'show_results_immediately' },
                        ].map((setting) => (
                          <div key={setting.key} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <div className="pr-2">
                              <p className="text-sm font-black text-slate-800 tracking-tight">{setting.label}</p>
                              <p className="text-[10px] sm:text-xs text-slate-500 font-bold mt-0.5">{setting.desc}</p>
                            </div>
                            <Switch.Root 
                              checked={(exam.settings as any)[setting.key]}
                              onCheckedChange={(val) => setExam({
                                ...exam, 
                                settings: { ...exam.settings, [setting.key]: val }
                              })}
                              className="w-12 h-7 bg-slate-200 rounded-full relative data-[state=checked]:bg-indigo-600 transition-all outline-none cursor-pointer shadow-inner shrink-0"
                            >
                              <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 translate-x-0.5 data-[state=checked]:translate-x-[22px] rtl:data-[state=checked]:-translate-x-[22px]" />
                            </Switch.Root>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">المدة (دقيقة)</label>
                        <div className="relative">
                          <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input 
                            type="number" 
                            value={exam.duration}
                            onChange={(e) => setExam({...exam, duration: parseInt(e.target.value) || 0})}
                            className="w-full pr-10 pl-3 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-black text-slate-900 transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">عدد المحاولات</label>
                        <div className="relative">
                          <HelpCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input 
                            type="number" 
                            value={exam.max_attempts}
                            onChange={(e) => setExam({...exam, max_attempts: parseInt(e.target.value) || 1})}
                            className="w-full pr-10 pl-3 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-black text-slate-900 transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">الدرجة الكلية</label>
                        <div className="relative">
                          <Hash className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input 
                            type="number" 
                            value={exam.max_score}
                            onChange={(e) => setExam({...exam, max_score: parseInt(e.target.value) || 100})}
                            className="w-full pr-10 pl-3 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-black text-slate-900 transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>

            <button
              onClick={() => setExam({...exam, status: exam.status === 'published' ? 'draft' : 'published'})}
              className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-2xl font-black transition-all active:scale-95 border shrink-0 ${
                exam.status === 'published' 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' 
                  : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">{exam.status === 'published' ? 'منشور' : 'مسودة'}</span>
            </button>

            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 sm:gap-3 bg-indigo-600 text-white px-5 sm:px-8 py-3 rounded-2xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 font-black disabled:opacity-50 active:scale-95 shrink-0"
            >
              {saving ? (
                <div className="h-4 w-4 sm:h-5 sm:w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Save className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
              <span className="hidden sm:inline">{exam.status === 'published' ? 'حفظ ونشر' : 'حفظ كمسودة'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 sm:space-y-10">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-8 relative overflow-hidden">
          <div className="space-y-4">
            <input 
              type="text"
              placeholder="عنوان الاختبار..."
              value={exam.title}
              onChange={(e) => setExam({...exam, title: e.target.value})}
              className="w-full text-3xl sm:text-4xl font-black text-slate-900 border-none focus:ring-0 placeholder:text-slate-300 p-0 bg-transparent tracking-tighter"
            />
            <textarea 
              placeholder="وصف الاختبار والتعليمات (اختياري)..."
              value={exam.description || ''}
              onChange={(e) => setExam({...exam, description: e.target.value})}
              className="w-full text-lg sm:text-xl text-slate-500 border-none focus:ring-0 placeholder:text-slate-300 p-0 resize-none min-h-[80px] bg-transparent font-medium leading-relaxed"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-8 border-t border-slate-100">
            {isAdmin && (
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">المعلم المسؤول</label>
                <select 
                  value={exam.teacher_id || ''}
                  onChange={(e) => setExam({...exam, teacher_id: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-bold text-slate-700 transition-all cursor-pointer"
                >
                  <option value="">اختر المعلم...</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">تاريخ الاختبار</label>
              <input 
                type="date"
                value={exam.exam_date}
                onChange={(e) => setExam({...exam, exam_date: e.target.value})}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-bold text-slate-700 transition-all cursor-pointer"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">وقت البداية / النهاية</label>
              <div className="flex items-center gap-2">
                <input 
                  type="time"
                  value={exam.start_time}
                  onChange={(e) => setExam({...exam, start_time: e.target.value})}
                  className="w-full px-2 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-bold text-slate-700 transition-all cursor-pointer text-center"
                />
                <span className="text-slate-400">-</span>
                <input 
                  type="time"
                  value={exam.end_time}
                  onChange={(e) => setExam({...exam, end_time: e.target.value})}
                  className="w-full px-2 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-bold text-slate-700 transition-all cursor-pointer text-center"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">المادة الدراسية</label>
              <select 
                value={exam.subject_id}
                onChange={(e) => setExam({...exam, subject_id: e.target.value})}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-bold text-slate-700 transition-all cursor-pointer"
              >
                <option value="">اختر المادة...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-2 lg:col-span-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">الشعب المستهدفة</label>
              <div className="flex flex-wrap gap-2">
                <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all border ${exam.section_ids.length === 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  <input 
                    type="checkbox"
                    checked={exam.section_ids.length === 0}
                    onChange={(e) => e.target.checked ? setExam({...exam, section_ids: []}) : null}
                    className="hidden"
                  />
                  <span className="text-sm font-bold">الجميع</span>
                </label>
                {sections.map(s => (
                  <label key={s.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all border ${exam.section_ids.includes(s.id) ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    <input 
                      type="checkbox"
                      checked={exam.section_ids.includes(s.id)}
                      onChange={(e) => {
                        const newSections = e.target.checked 
                          ? [...exam.section_ids, s.id]
                          : exam.section_ids.filter(id => id !== s.id);
                        setExam({...exam, section_ids: newSections});
                      }}
                      className="hidden"
                    />
                    <span className="text-sm font-bold">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Reorder.Group axis="y" values={questions} onReorder={setQuestions} className="space-y-6 sm:space-y-8">
          <AnimatePresence initial={false}>
            {questions.map((q, index) => (
              <Reorder.Item 
                key={q.id} 
                value={q}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm group relative overflow-hidden"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 p-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10 bg-white/80 rounded-b-xl backdrop-blur-sm shadow-sm border border-slate-100 border-t-0">
                  <GripVertical className="h-5 w-5 text-slate-400" />
                </div>

                <div className="p-6 sm:p-8 space-y-6 sm:space-y-8">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">السؤال {index + 1}</label>
                      </div>
                      <input 
                        type="text"
                        placeholder="اكتب نص السؤال هنا..."
                        value={q.content}
                        onChange={(e) => updateQuestion(q.id, { content: e.target.value })}
                        className="w-full bg-slate-50 px-5 py-4 rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-lg sm:text-xl font-bold text-slate-900 placeholder:text-slate-300 transition-all outline-none"
                      />
                      <div className="pt-2">
                         <ImageUpload 
                           label="إرفاق صورة للسؤال" 
onUploadSuccess={(url: string | null) => {
  if (!url) return;
  updateQuestion(q.id, { media_url: url, media_type: 'image' });
}}                         />
                      </div>
                    </div>
                    <div className="w-full md:w-56 space-y-2 shrink-0">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">نوع السؤال</label>
                      <select 
                        value={q.type}
                        onChange={(e) => updateQuestion(q.id, { type: e.target.value as QuestionType })}
                        className="w-full px-4 py-4 rounded-2xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-bold text-slate-700 transition-all cursor-pointer"
                      >
                        <option value="multiple_choice">اختيار من متعدد</option>
                        <option value="true_false">صح أو خطأ</option>
                        <option value="multi_select">اختيار متعدد</option>
                        <option value="essay">سؤال مقالي</option>
                        <option value="fill_in_blank">ملء الفراغ</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {q.type === 'multiple_choice' || q.type === 'multi_select' || q.type === 'true_false' ? (
                      <div className="space-y-3">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">خيارات الإجابة</label>
                        <div className="grid grid-cols-1 gap-3">
                          {q.options.map((opt, optIdx) => (
                            <div key={opt.id} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 group/opt hover:bg-white hover:border-indigo-200 hover:shadow-sm transition-all">
                              <button 
                                onClick={() => updateOption(q.id, opt.id, { is_correct: !opt.is_correct })}
                                className={`h-8 w-8 sm:h-10 sm:w-10 rounded-xl border-2 flex items-center justify-center transition-all shrink-0 ${
                                  opt.is_correct 
                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' 
                                    : 'border-slate-300 bg-white hover:border-indigo-400'
                                }`}
                              >
                                {opt.is_correct && <Check className="h-5 w-5 sm:h-6 sm:w-6" />}
                              </button>
                              <input 
                                type="text"
                                value={opt.content}
                                onChange={(e) => updateOption(q.id, opt.id, { content: e.target.value })}
                                placeholder={`النص للخيار ${optIdx + 1}`}
                                className="flex-1 bg-transparent border-none focus:ring-0 text-base sm:text-lg font-bold text-slate-700 p-0 placeholder:text-slate-400"
                              />
                              {q.options.length > 2 && q.type !== 'true_false' && (
                                <button 
                                  onClick={() => deleteOption(q.id, opt.id)}
                                  className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center opacity-0 group-hover/opt:opacity-100 hover:bg-red-50 hover:text-red-600 rounded-xl text-slate-400 transition-all active:scale-95 shrink-0"
                                >
                                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        {q.type !== 'true_false' && (
                          <button 
                            onClick={() => addOption(q.id)}
                            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-bold text-sm group"
                          >
                            <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" />
                            <span>إضافة خيار إضافي</span>
                          </button>
                        )}
                      </div>
                    ) : q.type === 'essay' ? (
                      <div className="p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 text-slate-400 font-bold text-center">
                        <AlignLeft className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        ستظهر هنا مساحة نصية للطالب لكتابة إجابته المقالية بحرية
                      </div>
                    ) : (
                      <div className="p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 text-slate-400 font-bold text-center">
                         <Type className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        قم بكتابة الجملة في السؤال أعلاه واستخدم [____] لتحديد مكان الفراغ
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-slate-100 gap-4 sm:gap-6">
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-center sm:justify-start">
                      <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">الدرجة:</span>
                        <input 
                          type="number"
                          value={q.points}
                          onChange={(e) => updateQuestion(q.id, { points: parseFloat(e.target.value) || 0 })}
                          className="w-14 bg-white border border-slate-200 rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-lg font-black text-slate-900 py-1 text-center"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                      <button 
                        onClick={() => duplicateQuestion(q.id)}
                        className="h-10 px-4 flex items-center gap-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all active:scale-95 font-bold text-sm"
                      >
                        <Copy className="h-4 w-4" />
                        <span className="hidden sm:inline">تكرار</span>
                      </button>
                      <button 
                        onClick={() => deleteQuestion(q.id)}
                        className="h-10 px-4 flex items-center gap-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all active:scale-95 font-bold text-sm"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden sm:inline">حذف</span>
                      </button>
                    </div>
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>

        <div className="flex justify-center pt-8">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex flex-col sm:flex-row items-center gap-4 bg-white border-2 border-dashed border-indigo-200 text-indigo-600 px-8 py-6 rounded-3xl hover:border-indigo-400 hover:bg-indigo-50/50 hover:shadow-lg transition-all font-black text-lg group active:scale-95 w-full sm:w-auto justify-center">
                <div className="h-12 w-12 rounded-2xl bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                  <Plus className="h-6 w-6 group-hover:scale-110 transition-transform" />
                </div>
                <span>إضافة سؤال جديد للاختبار</span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="bg-white rounded-3xl shadow-xl border border-slate-100 p-2 min-w-[240px] z-50 animate-in fade-in slide-in-from-bottom-4 duration-200" sideOffset={8}>
                <div className="px-4 py-2 mb-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">اختر نوع السؤال</p>
                </div>
                {[
                  { type: 'multiple_choice', label: 'اختيار من متعدد', icon: List, desc: 'إجابة واحدة صحيحة' },
                  { type: 'true_false', label: 'صح أو خطأ', icon: CheckSquare, desc: 'إجابة منطقية بسيطة' },
                  { type: 'multi_select', label: 'اختيار متعدد', icon: CheckSquare, desc: 'عدة إجابات صحيحة' },
                  { type: 'essay', label: 'سؤال مقالي', icon: AlignLeft, desc: 'يتطلب كتابة نصية' },
                  { type: 'fill_in_blank', label: 'ملء الفراغ', icon: Type, desc: 'إكمال جملة ناقصة' },
                ].map((item) => (
                  <DropdownMenu.Item 
                    key={item.type}
                    onClick={() => addQuestion(item.type as QuestionType)}
                    className="flex items-center gap-3 px-3 py-3 text-slate-700 hover:bg-slate-50 rounded-2xl outline-none cursor-pointer transition-all group"
                  >
                    <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors shrink-0">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black tracking-tight">{item.label}</p>
                      <p className="text-[10px] font-bold text-slate-500">{item.desc}</p>
                    </div>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </main>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 md:hidden flex items-center gap-2 bg-white/90 backdrop-blur-md border border-slate-200 p-2 rounded-2xl shadow-xl z-40 w-[90%] max-w-sm">
        <button 
          onClick={() => addQuestion('multiple_choice')} 
          className="flex-1 h-12 flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 rounded-xl active:scale-95 transition-transform font-bold text-sm"
        >
          <Plus className="h-5 w-5" />
          <span>سؤال</span>
        </button>
        <div className="h-8 w-px bg-slate-200 shrink-0" />
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="flex-1 h-12 flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-200 active:scale-95 transition-transform font-black text-sm disabled:opacity-50"
        >
          {saving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
          <span>حفظ</span>
        </button>
      </div>
    </div>
  );
}
