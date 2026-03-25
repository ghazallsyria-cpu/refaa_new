'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Save, Eye, Settings, Trash2, 
  Copy, GripVertical, Image as ImageIcon, 
  Video, FileText, ChevronDown, Check,
  X, HelpCircle, AlertCircle, ArrowRight,
  MoreVertical, Type, List, CheckSquare,
  AlignLeft, Hash, Link as LinkIcon, Clock, CheckCircle
} from 'lucide-react';
import { motion, Reorder, AnimatePresence } from 'motion/react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import * as Switch from '@radix-ui/react-switch';
import { deleteFromCloudinary } from '@/lib/cloudinary';

type QuestionType = 'multiple_choice' | 'true_false' | 'multi_select' | 'essay' | 'fill_in_blank' | 'matching' | 'ordering';

type Option = {
  id: string;
  content: string;
  is_correct: boolean;
};

type Question = {
  id: string;
  type: QuestionType;
  content: string;
  points: number;
  explanation?: string;
  options: Option[];
  media_url?: string;
  media_type?: 'image' | 'video' | 'pdf';
};

type ExamData = {
  id?: string;
  title: string;
  description: string;
  subject_id: string;
  section_id?: string;
  section_ids?: string[];
  teacher_id?: string;
  duration: number;
  max_attempts: number;
  max_score: number; // Added max_score
  exam_date: string;
  start_time?: string;
  end_time?: string;
  status: 'draft' | 'published';
  settings: {
    shuffle_questions: boolean;
    shuffle_options: boolean;
    show_result_immediately: boolean;
    allow_backtracking: boolean;
  };
};

import ImageUpload from '@/components/ImageUpload';

export default function QuizBuilder() {
  const params = useParams();
  const router = useRouter();
  const isNew = params.id === 'new';
  
  const [exam, setExam] = useState<ExamData>({
    title: '',
    description: '',
    subject_id: '',
    section_ids: [], // Changed from section_id to section_ids
    teacher_id: '',
    duration: 30,
    max_attempts: 1,
    max_score: 100, // Default to 100
    exam_date: new Date().toISOString().split('T')[0],
    start_time: '08:00',
    end_time: '23:59',
    status: 'draft',
    settings: {
      shuffle_questions: false,
      shuffle_options: false,
      show_result_immediately: true,
      allow_backtracking: true
    }
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState<{id: string, name: string}[]>([]);
  const [sections, setSections] = useState<{id: string, name: string}[]>([]);
  const [teachers, setTeachers] = useState<{id: string, full_name: string}[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('questions');
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const addQuestion = useCallback((type: QuestionType) => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      type,
      content: '',
      points: 1,
      options: type === 'multiple_choice' || type === 'multi_select' 
        ? [
            { id: crypto.randomUUID(), content: 'الخيار الأول', is_correct: true },
            { id: crypto.randomUUID(), content: 'الخيار الثاني', is_correct: false }
          ]
        : type === 'true_false'
        ? [
            { id: crypto.randomUUID(), content: 'صح', is_correct: true },
            { id: crypto.randomUUID(), content: 'خطأ', is_correct: false }
          ]
        : []
    };
    setQuestions(prev => [...prev, newQuestion]);
  }, []);

  const fetchInitialData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let userIsAdmin = false;
      if (user) {
        const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (userData?.role === 'admin' || userData?.role === 'management') {
          userIsAdmin = true;
          setIsAdmin(true);
          const { data: teachersData } = await supabase.from('users').select('id, full_name').eq('role', 'teacher');
          setTeachers(teachersData || []);
        }
      }

      let subjectsData: any[] = [];
      let sectionsData: any[] = [];

      if (!user) return;

      if (userIsAdmin) {
        const [subjectsRes, sectionsRes] = await Promise.all([
          supabase.from('subjects').select('id, name'),
          supabase.from('sections').select('id, name, classes(name)')
        ]);
        subjectsData = subjectsRes.data || [];
        sectionsData = (sectionsRes.data || []).map((s: any) => ({
          id: s.id,
          name: `${Array.isArray(s.classes) ? s.classes[0]?.name : s.classes?.name} - ${s.name}`
        }));
      } else {
        // Fetch teacher's assigned subjects and sections from teacher_sections
        const { data: teacherSectionsData, error: tsError } = await supabase
          .from('teacher_sections')
          .select(`
            section:sections(id, name, classes(name)),
            subject:subjects(id, name)
          `)
          .eq('teacher_id', user.id);
        
        if (tsError) throw tsError;

        // Extract unique subjects
        const uniqueSubjects = Array.from(new Set((teacherSectionsData || []).map(ts => {
          const subject = Array.isArray(ts.subject) ? ts.subject[0] : ts.subject;
          return subject?.id;
        }))).map(id => {
          const ts = teacherSectionsData?.find(item => {
            const subject = Array.isArray(item.subject) ? item.subject[0] : item.subject;
            return subject?.id === id;
          });
          return Array.isArray(ts?.subject) ? ts?.subject[0] : ts?.subject;
        }).filter(Boolean);

        // Extract unique sections
        const uniqueSections = Array.from(new Set((teacherSectionsData || []).map(ts => {
          const section = Array.isArray(ts.section) ? ts.section[0] : ts.section;
          return section?.id;
        }))).map(id => {
          const ts = teacherSectionsData?.find(item => {
            const section = Array.isArray(item.section) ? item.section[0] : item.section;
            return section?.id === id;
          });
          const section = Array.isArray(ts?.section) ? ts?.section[0] : ts?.section;
          if (!section) return null;
          const sectionAny = section as any;
          const className = Array.isArray(sectionAny.classes) ? sectionAny.classes[0]?.name : sectionAny.classes?.name;
          return {
            id: section.id,
            name: className ? `${className} - ${section.name}` : section.name
          };
        }).filter(Boolean);

        subjectsData = uniqueSubjects;
        sectionsData = uniqueSections;
      }
      
      setSubjects(subjectsData);
      setSections(sectionsData);

      if (!isNew) {
        const { data: examData, error: examError } = await supabase
          .from('exams')
          .select('*')
          .eq('id', params.id)
          .single();

        if (examError) throw examError;
        setExam(examData);

        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select(`
            *,
            options:question_options(*)
          `)
          .eq('exam_id', params.id)
          .order('order_index');

        if (questionsError) throw questionsError;
        setQuestions(questionsData || []);
      } else {
        // Default first question
        addQuestion('multiple_choice');
        // Set teacher_id for new exam
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setExam(prev => ({ ...prev, teacher_id: user.id }));
        }
      }
    } catch (err) {
      console.error('Error fetching builder data:', err);
    } finally {
      setLoading(false);
    }
  }, [isNew, params.id, addQuestion]);

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
            // If setting to correct and it's MCQ or T/F, uncheck others
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

    // التحقق من أن مجموع درجات الأسئلة يساوي الدرجة الكلية
    const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
    const maxScore = Number(exam.max_score) || 0;

    if (totalPoints !== maxScore) {
      showNotification('error', `مجموع درجات الأسئلة (${totalPoints}) يجب أن يساوي الدرجة الكلية للاختبار (${maxScore})`);
      return;
    }

    setSaving(true);
    try {
      // 1. Save Exam
      let examId = exam.id;
      let finalTeacherId = exam.teacher_id;

      if (!finalTeacherId) {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        const { data: teacher, error: teacherError } = await supabase.from('teachers').select('id').eq('id', userId).single();
        if (teacherError || !teacher) {
          throw new Error('لم يتم العثور على سجل المعلم. يرجى التأكد من تسجيل الدخول كمعلم أو اختيار معلم من القائمة.');
        }
        finalTeacherId = teacher.id;
      }

      const { section_ids, ...examPayload } = exam;
      
      // تعيين section_id لأول قسم تم اختياره (للتوافق مع قاعدة البيانات الحالية)
      if (section_ids && section_ids.length > 0) {
        examPayload.section_id = section_ids[0];
      } else {
        examPayload.section_id = undefined;
      }

      if (isNew) {
        console.log('Inserting exam:', { ...examPayload, max_score: exam.max_score || 100, teacher_id: finalTeacherId, status: exam.status });
        const { data: newExam, error } = await supabase
          .from('exams')
          .insert([{ 
            ...examPayload, 
            max_score: exam.max_score || 100, 
            total_marks: exam.max_score || 100, 
            teacher_id: finalTeacherId, 
            status: exam.status,
            start_time: exam.start_time,
            end_time: exam.end_time
          }])
          .select()
          .single();
        if (error) throw error;
        examId = newExam.id;
      } else {
        console.log('Updating exam:', { ...examPayload, max_score: exam.max_score || 100, teacher_id: finalTeacherId, status: exam.status });
        const { error } = await supabase
          .from('exams')
          .update({ 
            ...examPayload, 
            max_score: exam.max_score || 100, 
            total_marks: exam.max_score || 100, 
            teacher_id: finalTeacherId, 
            status: exam.status,
            start_time: exam.start_time,
            end_time: exam.end_time
          })
          .eq('id', examId);
        if (error) throw error;
      }

      // 2. Save Questions (Delete old ones and insert new ones for simplicity in this demo)
      // In production, you'd want to sync them properly
      await supabase.from('questions').delete().eq('exam_id', examId);

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const { data: newQ, error: qError } = await supabase
          .from('questions')
          .insert([{
            exam_id: examId,
            type: q.type,
            content: q.content,
            points: q.points,
            explanation: q.explanation,
            order_index: i,
            media_url: q.media_url,
            media_type: q.media_type
          }])
          .select()
          .single();

        if (qError) throw qError;

      if (q.options.length > 0) {
          const optionsPayload = q.options.map((o, idx) => ({
            question_id: newQ.id,
            content: o.content,
            is_correct: o.is_correct,
            order_index: idx
          }));
          await supabase.from('question_options').insert(optionsPayload);
        }
      }

      // 3. Send Notifications if Published
      if (exam.status === 'published') {
        try {
          let studentsQuery = supabase.from('students').select('id');
          if (exam.section_ids && exam.section_ids.length > 0) {
            studentsQuery = studentsQuery.in('section_id', exam.section_ids);
          }
          const { data: students } = await studentsQuery;

          if (students && students.length > 0) {
            const subjectName = subjects.find(s => s.id === exam.subject_id)?.name || 'المادة';
            const notificationPayloads = students.map(student => ({
              user_id: student.id,
              title: 'اختبار جديد متاح',
              content: `تم نشر اختبار جديد في مادة ${subjectName}: ${exam.title}`,
              type: 'exam',
              link: `/exams/take/${examId}`
            }));
            await supabase.from('notifications').insert(notificationPayloads);
          }
        } catch (notifErr) {
          console.error('Error sending exam notifications:', notifErr);
          // Don't fail the whole save if notifications fail
        }
      }

      router.push('/exams');
    } catch (err: any) {
      console.error('Error saving quiz:', err);
      // If err is an object, try to stringify it, otherwise use message
      const errorMessage = (err && typeof err === 'object') ? JSON.stringify(err, Object.getOwnPropertyNames(err)) : String(err);
      console.error('Full error details:', errorMessage);
      showNotification('error', `حدث خطأ أثناء حفظ الاختبار: ${err.message || errorMessage}`);
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
    <div className="min-h-screen bg-slate-50/50 pb-24 relative">
      {/* Notification Toast */}
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
            <div className="h-8 w-8 rounded-full bg-white/50 flex items-center justify-center">
              {notification.type === 'success' ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            </div>
            <div className="font-black tracking-tight">{notification.message}</div>
            <button onClick={() => setNotification(null)} className="p-1 hover:bg-black/5 rounded-lg transition-colors">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Header */}
      <header className="sticky top-0 z-40 glass-card border-b border-white/60 px-6 py-4 shadow-xl shadow-slate-200/20">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <button 
              onClick={() => router.back()}
              className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-500 hover:text-indigo-600 hover:shadow-lg transition-all active:scale-95"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <div className="hidden sm:block space-y-0.5">
              <h1 className="text-xl font-black text-slate-900 tracking-tight truncate max-w-[300px]">
                {exam.title || 'اختبار جديد'}
              </h1>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">جاري الحفظ تلقائياً</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* مؤشر مجموع الدرجات */}
            <div className={`hidden lg:flex items-center gap-3 px-5 py-3 rounded-2xl border font-black transition-all ${
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

            <button 
              onClick={() => router.push(`/exams/take/${params.id}`)}
              className="hidden md:flex items-center gap-3 px-6 py-3 text-sm font-black text-slate-600 hover:bg-white hover:shadow-lg rounded-2xl transition-all active:scale-95 border border-transparent hover:border-slate-100"
            >
              <Eye className="h-5 w-5" />
              <span>معاينة</span>
            </button>
            <Dialog.Root>
              <Dialog.Trigger asChild>
                <button className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-600 hover:text-indigo-600 hover:shadow-lg transition-all active:scale-95">
                  <Settings className="h-5 w-5" />
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-[40px] p-10 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-300 border border-white/20">
                  <div className="flex items-center justify-between mb-10">
                    <div>
                      <Dialog.Title className="text-3xl font-black text-slate-900 tracking-tight">إعدادات الاختبار</Dialog.Title>
                      <p className="text-slate-500 font-bold">تخصيص تجربة الاختبار للطلاب</p>
                    </div>
                    <Dialog.Close className="h-12 w-12 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all active:scale-95">
                      <X className="h-6 w-6 text-slate-500" />
                    </Dialog.Close>
                  </div>
                  
                  <div className="space-y-10">
                    <div className="space-y-6">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-4">الإعدادات العامة</h4>
                      <div className="space-y-4">
                        {[
                          { label: 'ترتيب الأسئلة عشوائياً', desc: 'تغيير ترتيب الأسئلة لكل طالب', key: 'shuffle_questions' },
                          { label: 'ترتيب الخيارات عشوائياً', desc: 'تغيير ترتيب خيارات الإجابة', key: 'shuffle_options' },
                          { label: 'إظهار النتيجة فوراً', desc: 'عرض الدرجة للطالب بعد الإرسال', key: 'show_result_immediately' },
                        ].map((setting) => (
                          <div key={setting.key} className="flex items-center justify-between p-4 rounded-3xl bg-slate-50/50 border border-slate-100">
                            <div>
                              <p className="text-sm font-black text-slate-800 tracking-tight">{setting.label}</p>
                              <p className="text-xs text-slate-500 font-bold">{setting.desc}</p>
                            </div>
                            <Switch.Root 
                              checked={(exam.settings as any)[setting.key]}
                              onCheckedChange={(val) => setExam({...exam, settings: {...exam.settings, [setting.key]: val}})}
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
                        <div className="relative">
                          <Clock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <input 
                            type="number" 
                            value={exam.duration}
                            onChange={(e) => setExam({...exam, duration: parseInt(e.target.value)})}
                            className="w-full pr-12 pl-4 py-4 rounded-2xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 outline-none font-black text-slate-900 transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">عدد المحاولات</label>
                        <div className="relative">
                          <HelpCircle className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <input 
                            type="number" 
                            value={exam.max_attempts}
                            onChange={(e) => setExam({...exam, max_attempts: parseInt(e.target.value)})}
                            className="w-full pr-12 pl-4 py-4 rounded-2xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 outline-none font-black text-slate-900 transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">الدرجة الكلية</label>
                        <div className="relative">
                          <Hash className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <input 
                            type="number" 
                            value={exam.max_score}
                            onChange={(e) => setExam({...exam, max_score: parseInt(e.target.value)})}
                            className="w-full pr-12 pl-4 py-4 rounded-2xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 outline-none font-black text-slate-900 transition-all"
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
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black transition-all active:scale-95 border ${
                exam.status === 'published' 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' 
                  : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <CheckCircle className="h-5 w-5" />
              <span>{exam.status === 'published' ? 'منشور' : 'مسودة'}</span>
            </button>

            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-3 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 font-black disabled:opacity-50 active:scale-95"
            >
              {saving ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Save className="h-5 w-5" />
              )}
              <span>{exam.status === 'published' ? 'حفظ ونشر الاختبار' : 'حفظ كمسودة'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        {/* Quiz Header Info */}
        <div className="glass-card rounded-[40px] border-t-[16px] border-t-indigo-600 border border-white/60 shadow-2xl shadow-slate-200/50 p-10 space-y-8 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 h-64 w-64 bg-indigo-50/30 rounded-full blur-3xl -z-10" />
          <div className="space-y-4">
            <input 
              type="text"
              placeholder="عنوان الاختبار"
              value={exam.title}
              onChange={(e) => setExam({...exam, title: e.target.value})}
              className="w-full text-5xl font-black text-slate-900 border-none focus:ring-0 placeholder:text-slate-200 p-0 bg-transparent tracking-tighter leading-tight"
            />
            <textarea 
              placeholder="وصف الاختبار (اختياري)"
              value={exam.description}
              onChange={(e) => setExam({...exam, description: e.target.value})}
              className="w-full text-xl text-slate-500 border-none focus:ring-0 placeholder:text-slate-200 p-0 resize-none h-16 bg-transparent font-bold leading-relaxed"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-10 border-t border-slate-100">
            {isAdmin && (
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">المعلم المسئول</label>
                <select 
                  value={exam.teacher_id || ''}
                  onChange={(e) => setExam({...exam, teacher_id: e.target.value})}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-700 transition-all appearance-none cursor-pointer"
                >
                  <option value="">اختر المعلم</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">الدرجة العظمى</label>
              <input 
                type="number"
                value={exam.max_score}
                onChange={(e) => setExam({...exam, max_score: parseInt(e.target.value)})}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-700 transition-all appearance-none"
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">تاريخ الاختبار</label>
              <input 
                type="date"
                value={exam.exam_date}
                onChange={(e) => setExam({...exam, exam_date: e.target.value})}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-700 transition-all appearance-none cursor-pointer"
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">وقت البداية</label>
              <input 
                type="time"
                value={exam.start_time}
                onChange={(e) => setExam({...exam, start_time: e.target.value})}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-700 transition-all appearance-none cursor-pointer"
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">وقت النهاية</label>
              <input 
                type="time"
                value={exam.end_time}
                onChange={(e) => setExam({...exam, end_time: e.target.value})}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-700 transition-all appearance-none cursor-pointer"
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">المادة الدراسية</label>
              <select 
                value={exam.subject_id}
                onChange={(e) => setExam({...exam, subject_id: e.target.value})}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-700 transition-all appearance-none cursor-pointer"
              >
                <option value="">اختر المادة</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">الشعب المستهدفة</label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={exam.section_ids?.length === 0}
                    onChange={(e) => e.target.checked ? setExam({...exam, section_ids: []}) : null}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-bold text-slate-700">الجميع</span>
                </label>
                {sections.map(s => (
                  <label key={s.id} className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={exam.section_ids?.includes(s.id)}
                      onChange={(e) => {
                        const newSections = e.target.checked 
                          ? [...(exam.section_ids || []), s.id]
                          : (exam.section_ids || []).filter(id => id !== s.id);
                        setExam({...exam, section_ids: newSections});
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-bold text-slate-700">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <Reorder.Group axis="y" values={questions} onReorder={setQuestions} className="space-y-10">
          <AnimatePresence initial={false}>
            {questions.map((q, index) => (
              <Reorder.Item 
                key={q.id} 
                value={q}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card rounded-[40px] border border-white/60 shadow-2xl shadow-slate-200/50 group relative overflow-hidden"
              >
                {/* Drag Handle */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 p-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10">
                  <GripVertical className="h-6 w-6 text-slate-300" />
                </div>

                <div className="p-10 space-y-10">
                  {/* Question Header */}
                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1 space-y-3">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">نص السؤال {index + 1}</label>
                      <input 
                        type="text"
                        placeholder="اكتب سؤالك هنا..."
                        value={q.content}
                        onChange={(e) => updateQuestion(q.id, { content: e.target.value })}
                        className="w-full bg-slate-50/50 px-6 py-5 rounded-3xl border-0 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 text-xl font-black text-slate-900 placeholder:text-slate-200 transition-all outline-none"
                      />
                      <div className="pt-2">
                        <ImageUpload
                          initialImageUrl={q.media_url}
                          onUploadSuccess={(url) => updateQuestion(q.id, { media_url: url || undefined, media_type: url ? 'image' : undefined })}
                          label="إرفاق صورة للسؤال (اختياري)"
                        />
                      </div>
                    </div>
                    <div className="w-full md:w-64 space-y-3">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">نوع السؤال</label>
                      <select 
                        value={q.type}
                        onChange={(e) => updateQuestion(q.id, { type: e.target.value as QuestionType })}
                        className="w-full px-6 py-5 rounded-3xl bg-white border-0 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none font-black text-slate-700 transition-all appearance-none cursor-pointer"
                      >
                        <option value="multiple_choice">اختيار من متعدد</option>
                        <option value="true_false">صح أو خطأ</option>
                        <option value="multi_select">اختيار متعدد</option>
                        <option value="essay">سؤال مقالي</option>
                        <option value="fill_in_blank">ملء الفراغ</option>
                      </select>
                    </div>
                  </div>

                  {/* Options Area */}
                  <div className="space-y-6">
                    {q.type === 'multiple_choice' || q.type === 'multi_select' || q.type === 'true_false' ? (
                      <div className="space-y-4">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">خيارات الإجابة</label>
                        <div className="grid grid-cols-1 gap-4">
                          {q.options.map((opt, optIdx) => (
                            <div key={opt.id} className="flex items-center gap-5 p-4 rounded-3xl bg-slate-50/50 border border-slate-100 group/opt hover:bg-white hover:shadow-lg transition-all">
                              <button 
                                onClick={() => updateOption(q.id, opt.id, { is_correct: !opt.is_correct })}
                                className={`h-10 w-10 rounded-2xl border-2 flex items-center justify-center transition-all shrink-0 ${
                                  opt.is_correct 
                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200' 
                                    : 'border-slate-200 bg-white hover:border-indigo-500'
                                }`}
                              >
                                {opt.is_correct && <Check className="h-6 w-6" />}
                              </button>
                              <input 
                                type="text"
                                value={opt.content}
                                onChange={(e) => updateOption(q.id, opt.id, { content: e.target.value })}
                                placeholder={`الخيار ${optIdx + 1}`}
                                className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-bold text-slate-700 p-0 placeholder:text-slate-300"
                              />
                              {q.options.length > 2 && q.type !== 'true_false' && (
                                <button 
                                  onClick={() => deleteOption(q.id, opt.id)}
                                  className="h-10 w-10 flex items-center justify-center opacity-0 group-hover/opt:opacity-100 hover:bg-red-50 hover:text-red-600 rounded-xl text-slate-400 transition-all active:scale-95"
                                >
                                  <X className="h-5 w-5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        {q.type !== 'true_false' && (
                          <button 
                            onClick={() => addOption(q.id)}
                            className="flex items-center gap-3 px-6 py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-black text-sm group"
                          >
                            <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" />
                            <span>إضافة خيار إجابة</span>
                          </button>
                        )}
                      </div>
                    ) : q.type === 'essay' ? (
                      <div className="p-8 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-200 text-slate-400 font-bold italic text-center">
                        سيقوم الطالب بكتابة إجابته المقالية هنا...
                      </div>
                    ) : (
                      <div className="p-8 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-200 text-slate-400 font-bold italic text-center">
                        أدخل النص مع استخدام [____] لمكان الفراغ الذي سيملأه الطالب...
                      </div>
                    )}
                  </div>

                  {/* Question Footer Actions */}
                  <div className="flex flex-col sm:flex-row items-center justify-between pt-10 border-t border-slate-100 gap-6">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-4 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 shadow-inner">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">النقاط:</span>
                        <input 
                          type="number"
                          value={q.points}
                          onChange={(e) => updateQuestion(q.id, { points: parseFloat(e.target.value) })}
                          className="w-16 bg-transparent border-none focus:ring-0 text-xl font-black text-slate-900 p-0 text-center tracking-tighter"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:shadow-lg transition-all active:scale-95">
                          <ImageIcon className="h-5 w-5" />
                        </button>
                        <button className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:shadow-lg transition-all active:scale-95">
                          <Video className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => duplicateQuestion(q.id)}
                        className="h-12 px-6 flex items-center gap-3 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-slate-900 hover:shadow-lg transition-all active:scale-95 font-black text-sm"
                        title="تكرار السؤال"
                      >
                        <Copy className="h-5 w-5" />
                        <span>تكرار</span>
                      </button>
                      <button 
                        onClick={() => deleteQuestion(q.id)}
                        className="h-12 px-6 flex items-center gap-3 rounded-2xl bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 transition-all active:scale-95 font-black text-sm"
                        title="حذف السؤال"
                      >
                        <Trash2 className="h-5 w-5" />
                        <span>حذف</span>
                      </button>
                    </div>
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>

        {/* Add Question Button */}
        <div className="flex justify-center pt-10">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-4 bg-white border-2 border-dashed border-slate-300 text-slate-500 px-12 py-6 rounded-[40px] hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 hover:shadow-2xl hover:shadow-indigo-200/50 transition-all font-black text-xl group active:scale-95">
                <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Plus className="h-8 w-8 group-hover:scale-110 transition-transform" />
                </div>
                <span>إضافة سؤال جديد للاختبار</span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="bg-white rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-slate-100 p-4 min-w-[280px] z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="px-4 py-2 mb-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">اختر نوع السؤال</p>
                </div>
                {[
                  { type: 'multiple_choice', label: 'اختيار من متعدد', icon: List, desc: 'سؤال مع خيارات إجابة واحدة صحيحة' },
                  { type: 'true_false', label: 'صح أو خطأ', icon: CheckSquare, desc: 'سؤال بإجابة منطقية بسيطة' },
                  { type: 'multi_select', label: 'اختيار متعدد', icon: CheckSquare, desc: 'سؤال مع عدة إجابات صحيحة محتملة' },
                  { type: 'essay', label: 'سؤال مقالي', icon: AlignLeft, desc: 'سؤال يتطلب كتابة نصية من الطالب' },
                  { type: 'fill_in_blank', label: 'ملء الفراغ', icon: Type, desc: 'سؤال يتطلب إكمال جملة ناقصة' },
                ].map((item) => (
                  <DropdownMenu.Item 
                    key={item.type}
                    onClick={() => addQuestion(item.type as QuestionType)}
                    className="flex items-center gap-4 px-4 py-3 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-2xl outline-none cursor-pointer transition-all group"
                  >
                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-white transition-colors">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black tracking-tight">{item.label}</p>
                      <p className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-400">{item.desc}</p>
                    </div>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </main>

      {/* Floating Bottom Bar for Mobile */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 md:hidden flex items-center gap-4 bg-white/80 backdrop-blur-xl border border-white/60 p-3 rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] z-40">
        <button onClick={() => addQuestion('multiple_choice')} className="h-14 w-14 flex items-center justify-center bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-200 active:scale-90 transition-transform">
          <Plus className="h-8 w-8" />
        </button>
        <div className="h-8 w-px bg-slate-200 mx-1" />
        <button onClick={handleSave} className="h-14 px-8 flex items-center gap-3 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-200 active:scale-90 transition-transform font-black">
          <Save className="h-6 w-6" />
          <span>حفظ</span>
        </button>
      </div>
    </div>
  );
}

// Radix Dropdown Components (Simplified import for this demo)
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
