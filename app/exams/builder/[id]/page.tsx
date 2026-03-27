'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Plus, Save, Eye, Settings, Trash2, Copy, GripVertical, 
  Image as ImageIcon, Video, Check, X, HelpCircle, 
  AlertCircle, ArrowRight, Type, List, CheckSquare, 
  AlignLeft, Hash, Clock, CheckCircle
} from 'lucide-react';
import { motion, Reorder, AnimatePresence } from 'motion/react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Switch from '@radix-ui/react-switch';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import { useAuth } from '@/context/auth-context';
import { useSchoolFormData } from '@/hooks/use-school-form-data';
import ImageUpload from '@/components/ImageUpload';
import { Question, QuestionType, Option, newQuestion as createNewQuestion } from '@/types/question';

// مكون فرعي للسؤال لتحسين الأداء ومنع إعادة رسم كل الأسئلة عند تعديل واحد
const QuestionCard = memo(({ 
  q, index, updateQuestion, deleteQuestion, duplicateQuestion, addOption, updateOption, deleteOption 
}: any) => {
  return (
    <Reorder.Item 
      value={q}
      className="glass-card rounded-[40px] border border-white/60 shadow-2xl group relative overflow-hidden mb-10"
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 p-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10">
        <GripVertical className="h-6 w-6 text-slate-300" />
      </div>

      <div className="p-10 space-y-10">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1 space-y-3">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">نص السؤال {index + 1}</label>
            <input 
              type="text"
              value={q.content}
              onChange={(e) => updateQuestion(q.id, { content: e.target.value })}
              className="w-full bg-slate-50/50 px-6 py-5 rounded-3xl border-0 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 text-xl font-black"
              placeholder="اكتب سؤالك هنا..."
            />
            <ImageUpload
              initialImageUrl={q.media_url}
              onUploadSuccess={(url) => updateQuestion(q.id, { media_url: url || undefined, media_type: url ? 'image' : undefined })}
            />
          </div>
          <div className="w-full md:w-64 space-y-3">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">نوع السؤال</label>
            <select 
              value={q.type}
              onChange={(e) => updateQuestion(q.id, { type: e.target.value as QuestionType })}
              className="w-full px-6 py-5 rounded-3xl bg-white border-0 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 font-black appearance-none cursor-pointer"
            >
              <option value="multiple_choice">اختيار من متعدد</option>
              <option value="true_false">صح أو خطأ</option>
              <option value="multi_select">اختيار متعدد</option>
              <option value="essay">سؤال مقالي</option>
            </select>
          </div>
        </div>

        {/* Options */}
        {(q.type !== 'essay') && (
          <div className="space-y-4">
            {q.options?.map((opt: any, optIdx: number) => (
              <div key={opt.id} className="flex items-center gap-5 p-4 rounded-3xl bg-slate-50/50 border border-slate-100 group/opt hover:bg-white hover:shadow-lg transition-all">
                <button 
                  onClick={() => updateOption(q.id, opt.id, { is_correct: !opt.is_correct })}
                  className={`h-10 w-10 rounded-2xl border-2 flex items-center justify-center transition-all ${opt.is_correct ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 bg-white'}`}
                >
                  {opt.is_correct && <Check className="h-6 w-6" />}
                </button>
                <input 
                  type="text"
                  value={opt.content}
                  onChange={(e) => updateOption(q.id, opt.id, { content: e.target.value })}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-bold"
                  placeholder={`الخيار ${optIdx + 1}`}
                />
                <button onClick={() => deleteOption(q.id, opt.id)} className="h-10 w-10 opacity-0 group-hover/opt:opacity-100 text-slate-400 hover:text-red-600"><X /></button>
              </div>
            ))}
            {q.type !== 'true_false' && (
              <button onClick={() => addOption(q.id)} className="flex items-center gap-3 px-6 py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 hover:text-indigo-600 font-black">
                <Plus className="h-5 w-5" /> إضافة خيار
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-10 border-t border-slate-100">
          <div className="flex items-center gap-4 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">النقاط:</span>
            <input 
              type="number" 
              value={q.points} 
              onChange={(e) => updateQuestion(q.id, { points: parseFloat(e.target.value) || 0 })}
              className="w-16 bg-transparent border-none text-xl font-black text-center"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => duplicateQuestion(q.id)} className="p-3 text-slate-400 hover:text-indigo-600"><Copy /></button>
            <button onClick={() => deleteQuestion(q.id)} className="p-3 text-red-400 hover:text-red-600"><Trash2 /></button>
          </div>
        </div>
      </div>
    </Reorder.Item>
  );
});

QuestionCard.displayName = 'QuestionCard';

export default function QuizBuilder() {
  const params = useParams();
  const router = useRouter();
  const { user, userRole } = useAuth();
  const { fetchExamDetails, saveExam } = useExamsSystem();
  const { data: formData } = useSchoolFormData();
  
  const [exam, setExam] = useState<any>({ title: '', status: 'draft', max_score: 100, duration: 30, exam_date: new Date().toISOString().split('T')[0] });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(params.id !== 'new');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (params.id !== 'new') {
      fetchExamDetails(params.id as string).then(res => {
        setExam(res.exam);
        setQuestions(res.questions);
        setLoading(false);
      });
    } else {
      setQuestions([createNewQuestion('multiple_choice')]);
      setLoading(false);
    }
  }, [params.id]);

  const updateQuestion = useCallback((id: string, updates: Partial<Question>) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
  }, []);

  const deleteQuestion = (id: string) => setQuestions(prev => prev.filter(q => q.id !== id));
  
  const duplicateQuestion = (id: string) => {
    const q = questions.find(x => x.id === id);
    if (q) setQuestions(prev => [...prev, { ...q, id: crypto.randomUUID(), options: q.options.map(o => ({ ...o, id: crypto.randomUUID() })) }]);
  };

  const addOption = (qId: string) => {
    setQuestions(prev => prev.map(q => q.id === qId ? { ...q, options: [...q.options, { id: crypto.randomUUID(), content: 'خيار جديد', is_correct: false }] } : q));
  };

  const updateOption = (qId: string, optId: string, updates: any) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === qId) {
        return { ...q, options: q.options.map(o => {
          if (o.id === optId) return { ...o, ...updates };
          if (updates.is_correct && q.type !== 'multi_select') return { ...o, is_correct: false };
          return o;
        })};
      }
      return q;
    }));
  };

  const deleteOption = (qId: string, optId: string) => {
    setQuestions(prev => prev.map(q => q.id === qId ? { ...q, options: q.options.filter(o => o.id !== optId) } : q));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveExam(exam, questions, params.id === 'new');
      router.push('/exams');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-12 w-12 border-t-2 border-indigo-600 rounded-full"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      <header className="sticky top-0 z-40 glass-card border-b border-white/60 px-6 py-4 shadow-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => router.back()} className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white border border-slate-100"><ArrowRight /></button>
          <h1 className="text-xl font-black truncate max-w-[300px]">{exam.title || 'اختبار جديد'}</h1>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black disabled:opacity-50">
            {saving ? 'جاري الحفظ...' : 'حفظ الاختبار'}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        <div className="glass-card rounded-[40px] border-t-[16px] border-t-indigo-600 p-10 space-y-8 shadow-2xl">
          <input 
            type="text" 
            value={exam.title} 
            onChange={(e) => setExam({ ...exam, title: e.target.value })}
            className="w-full text-5xl font-black border-none focus:ring-0 bg-transparent"
            placeholder="عنوان الاختبار"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-10 border-t border-slate-100">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase">الدرجة الكلية</label>
              <input type="number" value={exam.max_score} onChange={(e) => setExam({ ...exam, max_score: parseInt(e.target.value) })} className="w-full p-4 rounded-2xl bg-slate-50 border-0" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase">المدة (دقيقة)</label>
              <input type="number" value={exam.duration} onChange={(e) => setExam({ ...exam, duration: parseInt(e.target.value) })} className="w-full p-4 rounded-2xl bg-slate-50 border-0" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase">التاريخ</label>
              <input type="date" value={exam.exam_date} onChange={(e) => setExam({ ...exam, exam_date: e.target.value })} className="w-full p-4 rounded-2xl bg-slate-50 border-0" />
            </div>
          </div>
        </div>

        <Reorder.Group axis="y" values={questions} onReorder={setQuestions}>
          {questions.map((q, idx) => (
            <QuestionCard 
              key={q.id} 
              q={q} 
              index={idx} 
              updateQuestion={updateQuestion}
              deleteQuestion={deleteQuestion}
              duplicateQuestion={duplicateQuestion}
              addOption={addOption}
              updateOption={updateOption}
              deleteOption={deleteOption}
            />
          ))}
        </Reorder.Group>

        <button 
          onClick={() => setQuestions(prev => [...prev, createNewQuestion('multiple_choice')])}
          className="w-full py-8 rounded-[40px] border-4 border-dashed border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 transition-all font-black text-2xl"
        >
          + إضافة سؤال جديد
        </button>
      </main>
    </div>
  );
}

