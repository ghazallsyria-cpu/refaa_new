'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Save, Trash2, Copy, GripVertical, ArrowRight, Check, X, Image as ImageIcon, Clock, Target, Calendar, Layout, Settings as SettingsIcon, ShieldCheck, Shuffle, Eye, List, BookOpen, Users } from 'lucide-react';
import { Reorder } from 'motion/react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Switch from '@radix-ui/react-switch';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import { supabase } from '@/lib/supabase';
import ImageUpload from '@/components/ImageUpload';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { Question, QuestionType, newQuestion as createNewQuestion } from '@/types/question';

const QuestionCard = memo(({ q, index, updateQuestion, deleteQuestion, duplicateQuestion, addOption, updateOption, deleteOption }: any) => (
  <Reorder.Item value={q} className="glass-card rounded-[40px] border border-white/60 shadow-2xl group relative overflow-hidden mb-10 p-10 space-y-10">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 p-2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing"><GripVertical className="h-6 w-6 text-slate-300" /></div>
    <div className="flex flex-col md:flex-row gap-10">
      <div className="flex-1 space-y-6">
        <div className="space-y-3">
          <label className="text-xs font-black text-slate-400 uppercase">نص السؤال {index + 1}</label>
          <textarea value={q.content} onChange={(e) => updateQuestion(q.id, { content: e.target.value })} className="w-full bg-slate-50/50 px-6 py-5 rounded-3xl border-0 ring-1 ring-slate-100 focus:ring-2 focus:ring-indigo-600 text-xl font-black outline-none resize-none" rows={2} />
        </div>
        <ImageUpload initialImageUrl={q.media_url} onUploadSuccess={(url) => updateQuestion(q.id, { media_url: url, media_type: 'image' })} onRemove={() => { if (q.media_url) deleteFromCloudinary(q.media_url); updateQuestion(q.id, { media_url: undefined, media_type: undefined }); }} />
      </div>
      <div className="w-full md:w-64 space-y-3">
        <label className="text-xs font-black text-slate-400 uppercase">نوع السؤال</label>
        <select value={q.type} onChange={(e) => updateQuestion(q.id, { type: e.target.value as QuestionType })} className="w-full px-6 py-5 rounded-3xl bg-white border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-600 font-black appearance-none cursor-pointer">
          <option value="multiple_choice">اختيار من متعدد</option><option value="true_false">صح أو خطأ</option><option value="multi_select">اختيار متعدد</option><option value="essay">سؤال مقالي</option>
        </select>
      </div>
    </div>
    {q.type !== 'essay' && (
      <div className="space-y-4">
        {(q.options || []).map((opt: any, optIdx: number) => (
          <div key={opt.id} className="flex items-center gap-5 p-4 rounded-3xl bg-slate-50/50 border border-slate-100 group/opt hover:bg-white transition-all">
            <button type="button" onClick={() => updateOption(q.id, opt.id, { is_correct: !opt.is_correct })} className={`h-10 w-10 rounded-2xl border-2 flex items-center justify-center ${opt.is_correct ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 bg-white'}`}><Check size={20} /></button>
            <input type="text" value={opt.content} onChange={(e) => updateOption(q.id, opt.id, { content: e.target.value })} className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-bold" />
            <button type="button" onClick={() => deleteOption(q.id, opt.id)} className="h-10 w-10 opacity-0 group-hover/opt:opacity-100 text-slate-400 hover:text-red-600"><X /></button>
          </div>
        ))}
        {q.type !== 'true_false' && <button type="button" onClick={() => addOption(q.id)} className="flex items-center gap-3 px-6 py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 hover:text-indigo-600 transition-all font-black text-sm">+ إضافة خيار</button>}
      </div>
    )}
    <div className="flex items-center justify-between pt-10 border-t border-slate-100">
      <div className="flex items-center gap-4 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100"><span className="text-xs font-black text-slate-400 uppercase">النقاط:</span><input type="number" value={q.points} onChange={(e) => updateQuestion(q.id, { points: parseFloat(e.target.value) || 0 })} className="w-16 bg-transparent border-none text-xl font-black text-center focus:outline-none" /></div>
      <div className="flex gap-2"><button type="button" onClick={() => duplicateQuestion(q.id)} className="h-12 w-12 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:text-indigo-600"><Copy size={20} /></button><button type="button" onClick={() => deleteQuestion(q.id)} className="h-12 w-12 flex items-center justify-center rounded-2xl bg-red-50 text-red-400 hover:text-red-600"><Trash2 size={20} /></button></div>
    </div>
  </Reorder.Item>
));
QuestionCard.displayName = 'QuestionCard';

export default function QuizBuilder() {
  const params = useParams();
  const router = useRouter();
  const { fetchExamDetails, saveExam } = useExamsSystem();
  
  const [formData, setFormData] = useState<{subjects: any[], sections: any[]}>({ subjects: [], sections: [] });
  const [formLoading, setFormLoading] = useState(true);

  const [exam, setExam] = useState<any>({ title: '', description: '', status: 'draft', max_score: 100, passing_score: 50, duration: 30, exam_date: new Date().toISOString().split('T')[0], start_time: '08:00', end_time: '23:00', subject_id: '', section_ids: [], settings: { shuffle_questions: false, shuffle_options: false, show_results: true, allow_backtrack: true, browser_lock: false } });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(params.id !== 'new');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const [subj, sec] = await Promise.all([
          supabase.from('subjects').select('id, name'),
          supabase.from('sections').select('id, name')
        ]);
        setFormData({ subjects: subj.data || [], sections: sec.data || [] });
      } catch (e) {
        console.error(e);
      } finally {
        setFormLoading(false);
      }
    };
    fetchFormData();
  }, []);

  useEffect(() => {
    if (params.id !== 'new') {
      fetchExamDetails(params.id as string).then(res => { 
        setExam((p:any) => ({...p, ...res.exam, settings: res.exam.settings || p.settings, section_ids: res.exam.section_ids || [] })); 
        setQuestions(res.questions || []); 
        setLoading(false); 
      }).catch((err) => {
        console.error(err);
        setLoading(false);
      });
    } else { setQuestions([createNewQuestion('multiple_choice')]); setLoading(false); }
  }, [params.id, fetchExamDetails]);

  const handleSave = async () => {
    if (!exam.title || !exam.subject_id || !exam.section_ids || exam.section_ids.length === 0) return alert('يرجى اختيار المادة والصفوف المستهدفة');
    setSaving(true);
    try { await saveExam(exam, questions, params.id === 'new'); router.push('/exams'); } catch (err) { alert('حدث خطأ في عملية الحفظ'); console.error(err); } finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-12 w-12 border-t-4 border-indigo-600 rounded-full"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24" dir="rtl">
      <header className="sticky top-0 z-40 glass-card border-b border-white/60 px-6 py-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-4"><button type="button" onClick={() => router.back()} className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white border border-slate-100 active:scale-95"><ArrowRight size={20} /></button><h1 className="text-xl font-black truncate max-w-[200px]">{exam.title || 'اختبار جديد'}</h1></div>
        <div className="flex items-center gap-3">
          <Dialog.Root><Dialog.Trigger asChild><button className="h-12 px-5 flex items-center gap-3 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black"><SettingsIcon size={20} /><span className="hidden md:inline">الإعدادات</span></button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]" /><Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-white rounded-[40px] p-10 z-[101]"><Dialog.Title className="text-2xl font-black mb-8">إعدادات الاختبار</Dialog.Title><div className="space-y-6">{[{ key: 'shuffle_questions', label: 'ترتيب عشوائي للأسئلة', icon: Shuffle }, { key: 'shuffle_options', label: 'ترتيب عشوائي للخيارات', icon: List }, { key: 'show_results', label: 'إظهار النتيجة فوراً', icon: Eye }, { key: 'allow_backtrack', label: 'السماح بالعودة', icon: ArrowRight }, { key: 'browser_lock', label: 'حماية الغش', icon: ShieldCheck }].map((s) => (<div key={s.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-3xl"><div className="flex items-center gap-3 font-bold"><s.icon size={18} className="text-slate-400" /><span>{s.label}</span></div><Switch.Root checked={exam.settings?.[s.key] || false} onCheckedChange={(v) => setExam({...exam, settings: {...(exam.settings||{}), [s.key]: v}})} className={`w-12 h-7 rounded-full relative ${exam.settings?.[s.key] ? 'bg-indigo-600' : 'bg-slate-200'}`}><Switch.Thumb className={`block w-5 h-5 bg-white rounded-full transition-all ${exam.settings?.[s.key] ? 'translate-x-6' : 'translate-x-1'}`} /></Switch.Root></div>))}<Dialog.Close asChild><button className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black mt-8">تم</button></Dialog.Close></div></Dialog.Content></Dialog.Portal></Dialog.Root>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-[20px] font-black disabled:opacity-50">{saving ? 'جاري الحفظ...' : 'حفظ ونشر'}</button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        <div className="glass-card rounded-[40px] border-t-[16px] border-t-indigo-600 p-10 space-y-10 shadow-2xl bg-white">
          <div className="space-y-6"><input type="text" value={exam.title} onChange={(e) => setExam({ ...exam, title: e.target.value })} className="w-full text-5xl font-black border-none focus:ring-0 bg-transparent placeholder:text-slate-200" placeholder="عنوان الاختبار" /><textarea value={exam.description} onChange={(e) => setExam({ ...exam, description: e.target.value })} className="w-full text-xl font-medium border-none focus:ring-0 bg-transparent resize-none placeholder:text-slate-200" placeholder="وصف الاختبار..." rows={2} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-10"><div className="space-y-3"><label className="text-xs font-black uppercase text-slate-400"><BookOpen size={14} className="inline mr-1"/> المادة الدراسية</label><select value={exam.subject_id} onChange={(e) => setExam({ ...exam, subject_id: e.target.value })} className="w-full p-5 rounded-3xl bg-slate-50 border-0 ring-1 ring-slate-100 font-bold"><option value="">{formLoading ? 'جاري التحميل...' : 'اختر المادة'}</option>{formData.subjects.map((s: any) => (<option key={s.id} value={s.id}>{s.name}</option>))}</select></div><div className="space-y-3"><label className="text-xs font-black uppercase text-slate-400"><Target size={14} className="inline mr-1"/> درجة النجاح (%)</label><input type="number" value={exam.passing_score} onChange={(e) => setExam({ ...exam, passing_score: parseInt(e.target.value) })} className="w-full p-5 rounded-3xl bg-slate-50 border-0 ring-1 ring-slate-100 font-bold" /></div></div>
          <div className="space-y-4 border-t pt-10"><label className="text-xs font-black uppercase text-slate-400"><Users size={14} className="inline mr-1"/> الصفوف المستهدفة</label><div className="flex flex-wrap gap-3">
              {formData.sections.length > 0 ? formData.sections.map((s: any) => {
                const active = (exam.section_ids || []).includes(s.id);
                return (<button key={s.id} type="button" onClick={() => setExam({...exam, section_ids: active ? exam.section_ids.filter((id: string) => id !== s.id) : [...(exam.section_ids || []), s.id]})} className={`px-6 py-3 rounded-2xl text-sm font-black border-2 ${active ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-500'}`}>{s.name}</button>)
              }) : <span className="text-slate-400 font-bold text-sm">{formLoading ? 'جاري تحميل الصفوف...' : 'لم يتم العثور على صفوف.'}</span>}
            </div></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-t pt-10"><div className="space-y-2"><label className="text-xs font-black text-slate-400">المدة (دقيقة)</label><input type="number" value={exam.duration} onChange={(e) => setExam({...exam, duration: parseInt(e.target.value)})} className="w-full p-4 rounded-2xl bg-slate-50 border-0 font-bold" /></div><div className="space-y-2"><label className="text-xs font-black text-slate-400">التاريخ</label><input type="date" value={exam.exam_date} onChange={(e) => setExam({...exam, exam_date: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 border-0 font-bold" /></div><div className="space-y-2"><label className="text-xs font-black text-slate-400">البدء - النهاية</label><div className="flex gap-2"><input type="time" value={exam.start_time} onChange={(e) => setExam({...exam, start_time: e.target.value})} className="w-1/2 p-4 rounded-2xl bg-slate-50 border-0 font-bold text-center" /><input type="time" value={exam.end_time} onChange={(e) => setExam({...exam, end_time: e.target.value})} className="w-1/2 p-4 rounded-2xl bg-slate-50 border-0 font-bold text-center" /></div></div></div>
        </div>
        <Reorder.Group axis="y" values={questions} onReorder={setQuestions}>{questions.map((q, idx) => (<QuestionCard key={q.id} q={q} index={idx} updateQuestion={(id: string, updates: any) => setQuestions(prev => prev.map(x => x.id === id ? { ...x, ...updates } : x))} deleteQuestion={(id: string) => setQuestions(prev => prev.filter(x => x.id !== id))} duplicateQuestion={(id: string) => { const x = questions.find(q => q.id === id); if (x) setQuestions(prev => [...prev, { ...x, id: crypto.randomUUID(), options: (x.options||[]).map(o => ({ ...o, id: crypto.randomUUID() })) }]); }} addOption={(qId: string) => setQuestions(prev => prev.map(x => x.id === qId ? { ...x, options: [...(x.options||[]), { id: crypto.randomUUID(), content: 'خيار جديد', is_correct: false }] } : x))} updateOption={(qId: string, optId: string, updates: any) => setQuestions(prev => prev.map(x => x.id === qId ? { ...x, options: (x.options||[]).map(o => o.id === optId ? { ...o, ...updates } : (updates.is_correct && x.type !== 'multi_select' ? { ...o, is_correct: false } : o)) } : x))} deleteOption={(qId: string, optId: string) => setQuestions(prev => prev.map(x => x.id === qId ? { ...x, options: (x.options||[]).filter(o => o.id !== optId) } : x))} />))}</Reorder.Group>
        <button type="button" onClick={() => setQuestions([...questions, createNewQuestion('multiple_choice')])} className="w-full py-16 rounded-[40px] border-4 border-dashed border-slate-200 text-slate-300 hover:border-indigo-400 hover:text-indigo-600 hover:bg-white font-black text-3xl">+ إضافة سؤال جديد</button>
      </main>
    </div>
  );
}


