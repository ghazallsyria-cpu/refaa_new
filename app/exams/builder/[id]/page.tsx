'use client';

import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Save, Trash2, Copy, GripVertical, ArrowRight, Check, X, Image as ImageIcon, Clock, Target, Calendar, Layout, Settings as SettingsIcon, ShieldCheck, Shuffle, Eye, List, BookOpen, Users, ChevronDown } from 'lucide-react';
import { Reorder } from 'motion/react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Switch from '@radix-ui/react-switch';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import { useAuth } from '@/context/auth-context';
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
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">نص السؤال {index + 1}</label>
          <textarea value={q.content} onChange={(e) => updateQuestion(q.id, { content: e.target.value })} className="w-full bg-slate-50/50 px-6 py-5 rounded-3xl border-0 ring-1 ring-slate-100 focus:ring-2 focus:ring-indigo-600 text-xl font-black outline-none resize-none" rows={2} />
        </div>
        <ImageUpload initialImageUrl={q.media_url} onUploadSuccess={(url) => updateQuestion(q.id, { media_url: url, media_type: 'image' })} onRemove={() => { if (q.media_url) deleteFromCloudinary(q.media_url); updateQuestion(q.id, { media_url: undefined, media_type: undefined }); }} />
      </div>
      <div className="w-full md:w-64 space-y-3">
        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">نوع السؤال</label>
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
  const { user, userRole } = useAuth();
  
  const [formData, setFormData] = useState<{subjects: any[], sections: any[]}>({ subjects: [], sections: [] });
  const [formLoading, setFormLoading] = useState(true);
  const [isSectionDropdownOpen, setIsSectionDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [exam, setExam] = useState<any>({ title: '', description: '', status: 'draft', max_score: 100, passing_score: 50, duration: 30, exam_date: new Date().toISOString().split('T')[0], start_time: '08:00', end_time: '23:00', subject_id: '', section_ids: [], settings: { shuffle_questions: false, shuffle_options: false, show_results: true, allow_backtrack: true, browser_lock: false } });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(params.id !== 'new');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSectionDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchTeacherSpecificData = async () => {
      if (!user || !userRole) return;
      try {
        setFormLoading(true);
        let fetchedSubjects: any[] = [];
        let fetchedSections: any[] = [];

        if (userRole === 'admin' || userRole === 'management') {
          const [subjRes, secRes] = await Promise.all([
            supabase.from('subjects').select('id, name').order('name'),
            supabase.from('sections').select('id, name, classes(name)')
          ]);
          fetchedSubjects = subjRes.data || [];
          fetchedSections = (secRes.data || []).map((s: any) => {
             const className = Array.isArray(s.classes) ? s.classes[0]?.name : s.classes?.name;
             return { id: s.id, name: className ? `${className} - ${s.name}` : s.name };
          });
        } else {
          const { data: teacherSecs } = await supabase.from('teacher_sections').select('*').eq('teacher_id', user.id);
          const sectionIds = teacherSecs?.map(ts => ts.section_id).filter(Boolean) || [];
          let possibleSubjectIds: string[] = teacherSecs?.map(ts => ts.subject_id).filter(Boolean) || [];

          if (sectionIds.length > 0) {
            const { data: sectionsData } = await supabase.from('sections').select('*, classes(name)').in('id', sectionIds);
            if (sectionsData) {
              fetchedSections = sectionsData.map((s: any) => {
                const className = Array.isArray(s.classes) ? s.classes[0]?.name : s.classes?.name;
                if (s.subject_id) possibleSubjectIds.push(s.subject_id);
                return { id: s.id, name: className ? `${className} - ${s.name}` : s.name };
              });
            }
          }

          const { data: teacherSubjs } = await supabase.from('teacher_subjects').select('*').eq('teacher_id', user.id);
          if (teacherSubjs) {
            possibleSubjectIds = [...possibleSubjectIds, ...teacherSubjs.map(ts => ts.subject_id).filter(Boolean)];
          }

          possibleSubjectIds = Array.from(new Set(possibleSubjectIds));
          if (possibleSubjectIds.length > 0) {
            const { data: subjectsData } = await supabase.from('subjects').select('id, name').in('id', possibleSubjectIds);
            if (subjectsData) fetchedSubjects = subjectsData;
          }
        }
        setFormData({ subjects: fetchedSubjects, sections: fetchedSections });
      } catch (e) {
        console.error("Error fetching specific teacher data:", e);
      } finally {
        setFormLoading(false);
      }
    };
    fetchTeacherSpecificData();
  }, [user, userRole]);

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

  const toggleSectionSelection = (sectionId: string) => {
    setExam((prev: any) => {
      const currentIds = prev.section_ids || [];
      const newIds = currentIds.includes(sectionId)
        ? currentIds.filter((id: string) => id !== sectionId)
        : [...currentIds, sectionId];
      return { ...prev, section_ids: newIds };
    });
  };

  const handleSave = async () => {
    if (!exam.title || !exam.subject_id || !exam.section_ids || exam.section_ids.length === 0) {
      return alert('يرجى التأكد من إدخال العنوان، اختيار المادة، واختيار صف واحد على الأقل');
    }
    if (questions.length === 0) {
      return alert('يجب إضافة سؤال واحد على الأقل للاختبار');
    }

    setSaving(true);
    try {
      const calculatedMaxScore = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
      
      const cleanExamData = {
        id: exam.id, 
        title: exam.title,
        description: exam.description,
        status: 'published',
        max_score: calculatedMaxScore > 0 ? calculatedMaxScore : 100,
        passing_score: exam.passing_score,
        duration: exam.duration,
        exam_date: exam.exam_date,
        start_time: exam.start_time,
        end_time: exam.end_time,
        subject_id: exam.subject_id,
        settings: exam.settings || {},
        section_ids: exam.section_ids,
        section_id: exam.section_ids[0]
      };

      // --- تم الإصلاح هنا: إضافة order_index لكل خيار (Option) لتجنب خطأ الـ Null في قاعدة البيانات ---
      const cleanQuestions = questions.map((q, idx) => ({
        id: q.id,
        content: q.content,
        type: q.type,
        points: Number(q.points) || 0,
        media_url: q.media_url || null,
        media_type: q.media_type || null,
        order_index: idx,
        options: q.options?.map((opt, optIdx) => ({
           id: opt.id,
           content: opt.content,
           is_correct: opt.is_correct,
           order_index: optIdx // الترتيب الصريح للخيار
        }))
      }));

      await saveExam(cleanExamData, cleanQuestions, params.id === 'new'); 
      router.push('/exams'); 
    } catch (err: any) { 
      alert(`حدث خطأ أثناء الحفظ: ${err.message}`); 
      console.error(err); 
    } finally { 
      setSaving(false); 
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-12 w-12 border-t-4 border-indigo-600 rounded-full"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24" dir="rtl">
      <header className="sticky top-0 z-40 glass-card border-b border-white/60 px-6 py-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-4"><button type="button" onClick={() => router.back()} className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white border border-slate-100 active:scale-95 text-slate-500 hover:text-indigo-600 transition-all"><ArrowRight size={20} /></button><h1 className="text-xl font-black truncate max-w-[200px] md:max-w-[400px] text-slate-800">{exam.title || 'اختبار جديد'}</h1></div>
        <div className="flex items-center gap-3">
          <Dialog.Root><Dialog.Trigger asChild><button className="h-12 px-5 flex items-center gap-3 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black hover:text-indigo-600 transition-all shadow-sm active:scale-95"><SettingsIcon size={20} /><span className="hidden md:inline">الإعدادات</span></button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]" /><Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-white rounded-[40px] p-10 z-[101] shadow-2xl focus:outline-none"><Dialog.Title className="text-2xl font-black mb-8 flex items-center gap-3"><SettingsIcon className="text-indigo-600" /> إعدادات الاختبار</Dialog.Title><div className="space-y-6">{[{ key: 'shuffle_questions', label: 'ترتيب عشوائي للأسئلة', icon: Shuffle }, { key: 'shuffle_options', label: 'ترتيب عشوائي للخيارات', icon: List }, { key: 'show_results', label: 'إظهار النتيجة فوراً', icon: Eye }, { key: 'allow_backtrack', label: 'السماح بالعودة للخلف', icon: ArrowRight }, { key: 'browser_lock', label: 'حماية الغش (منع التبويب)', icon: ShieldCheck }].map((s) => (<div key={s.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-3xl border border-slate-100 transition-all hover:bg-white hover:shadow-sm"><div className="flex items-center gap-3 text-slate-700 font-bold"><s.icon size={18} className="text-slate-400" /><span>{s.label}</span></div><Switch.Root checked={exam.settings?.[s.key] || false} onCheckedChange={(v) => setExam({...exam, settings: {...(exam.settings||{}), [s.key]: v}})} className={`w-12 h-7 rounded-full relative transition-colors shadow-inner ${exam.settings?.[s.key] ? 'bg-indigo-600' : 'bg-slate-200'}`}><Switch.Thumb className={`block w-5 h-5 bg-white rounded-full transition-all shadow-md ${exam.settings?.[s.key] ? 'translate-x-6' : 'translate-x-1'}`} /></Switch.Root></div>))}<Dialog.Close asChild><button className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black mt-8 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">تم الحفظ</button></Dialog.Close></div></Dialog.Content></Dialog.Portal></Dialog.Root>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-[20px] font-black disabled:opacity-50 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95">
            {saving ? 'جاري الحفظ...' : 'حفظ ونشر'}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        <div className="glass-card rounded-[40px] border-t-[16px] border-t-indigo-600 p-10 space-y-10 shadow-2xl bg-white transition-all hover:shadow-indigo-50">
          <div className="space-y-6">
            <input type="text" value={exam.title} onChange={(e) => setExam({ ...exam, title: e.target.value })} className="w-full text-5xl font-black border-none focus:ring-0 bg-transparent placeholder:text-slate-200 tracking-tighter" placeholder="عنوان الاختبار" />
            <textarea value={exam.description} onChange={(e) => setExam({ ...exam, description: e.target.value })} className="w-full text-xl font-medium border-none focus:ring-0 bg-transparent resize-none placeholder:text-slate-200" placeholder="وصف الاختبار وتعليمات للطلاب..." rows={2} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 pt-10">
            <div className="space-y-3">
              <label className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><BookOpen size={14} className="text-slate-400"/> المادة الدراسية</label>
              <select value={exam.subject_id} onChange={(e) => setExam({ ...exam, subject_id: e.target.value })} className="w-full p-5 rounded-3xl bg-slate-50 border-0 ring-1 ring-slate-100 font-bold appearance-none cursor-pointer hover:bg-white transition-all">
                <option value="">{formLoading ? 'جاري التحميل...' : 'اختر المادة'}</option>
                {formData.subjects.length > 0 ? formData.subjects.map((s: any) => (<option key={s.id} value={s.id}>{s.name}</option>)) : <option disabled>لا توجد مواد مسندة لك</option>}
              </select>
            </div>
            
            <div className="space-y-3">
              <label className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Target size={14} className="text-slate-400"/> درجة النجاح (%)</label>
              <input type="number" value={exam.passing_score} onChange={(e) => setExam({ ...exam, passing_score: parseInt(e.target.value) || 0 })} className="w-full p-5 rounded-3xl bg-slate-50 border-0 ring-1 ring-slate-100 font-bold focus:ring-2 focus:ring-indigo-600 outline-none transition-all" />
            </div>
          </div>

          <div className="space-y-3 relative border-t border-slate-100 pt-10" ref={dropdownRef}>
            <label className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Users size={14} className="text-slate-400"/> الصفوف المستهدفة</label>
            
            <div 
              onClick={() => !formLoading && setIsSectionDropdownOpen(!isSectionDropdownOpen)}
              className={`w-full p-5 rounded-3xl bg-slate-50 border-0 ring-1 ring-slate-100 font-bold cursor-pointer hover:bg-white transition-all flex justify-between items-center ${isSectionDropdownOpen ? 'ring-indigo-600 ring-2' : ''}`}
            >
              <span className="truncate flex-1 text-slate-700">
                {formLoading 
                  ? 'جاري التحميل...' 
                  : exam.section_ids?.length > 0 
                    ? formData.sections.filter(s => exam.section_ids.includes(s.id)).map(s => s.name).join('، ')
                    : 'اختر الصفوف المستهدفة (يمكنك تحديد أكثر من صف)'}
              </span>
              <ChevronDown size={20} className={`text-slate-400 transition-transform ${isSectionDropdownOpen ? 'rotate-180 text-indigo-600' : ''}`} />
            </div>

            {isSectionDropdownOpen && (
              <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 p-2 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                {formData.sections.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {formData.sections.map((s: any) => {
                      const isSelected = (exam.section_ids || []).includes(s.id);
                      return (
                        <div 
                          key={s.id} 
                          onClick={() => toggleSectionSelection(s.id)}
                          className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all hover:bg-slate-50 ${isSelected ? 'bg-indigo-50/50' : ''}`}
                        >
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                            {isSelected && <Check size={14} className="text-white" />}
                          </div>
                          <span className={`font-bold text-base ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{s.name}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-400 font-bold text-sm">
                    لا توجد صفوف مسندة لك في النظام.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-slate-100 pt-10">
            <div className="space-y-2"><label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">المدة (دقيقة)</label><input type="number" value={exam.duration} onChange={(e) => setExam({...exam, duration: parseInt(e.target.value)})} className="w-full p-4 rounded-2xl bg-slate-50 border-0 ring-1 ring-slate-100 font-bold focus:ring-2 focus:ring-indigo-600 outline-none transition-all" /></div>
            <div className="space-y-2"><label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">تاريخ الاختبار</label><input type="date" value={exam.exam_date} onChange={(e) => setExam({...exam, exam_date: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 border-0 ring-1 ring-slate-100 font-bold focus:ring-2 focus:ring-indigo-600 outline-none transition-all" /></div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">وقت البدء - النهاية</label>
              <div className="flex gap-2">
                <input type="time" value={exam.start_time} onChange={(e) => setExam({...exam, start_time: e.target.value})} className="w-1/2 p-4 rounded-2xl bg-slate-50 border-0 ring-1 ring-slate-100 font-bold text-center focus:ring-2 focus:ring-indigo-600 outline-none transition-all" />
                <input type="time" value={exam.end_time} onChange={(e) => setExam({...exam, end_time: e.target.value})} className="w-1/2 p-4 rounded-2xl bg-slate-50 border-0 ring-1 ring-slate-100 font-bold text-center focus:ring-2 focus:ring-indigo-600 outline-none transition-all" />
              </div>
            </div>
          </div>
        </div>
        
        <Reorder.Group axis="y" values={questions} onReorder={setQuestions}>
          {questions.map((q, idx) => (
            <QuestionCard 
              key={q.id} 
              q={q} 
              index={idx} 
              updateQuestion={(id: string, updates: any) => setQuestions(prev => prev.map(x => x.id === id ? { ...x, ...updates } : x))} 
              deleteQuestion={(id: string) => setQuestions(prev => prev.filter(x => x.id !== id))} 
              duplicateQuestion={(id: string) => { const x = questions.find(q => q.id === id); if (x) setQuestions(prev => [...prev, { ...x, id: crypto.randomUUID(), options: (x.options||[]).map(o => ({ ...o, id: crypto.randomUUID() })) }]); }} 
              addOption={(qId: string) => setQuestions(prev => prev.map(x => x.id === qId ? { ...x, options: [...(x.options||[]), { id: crypto.randomUUID(), content: 'خيار جديد', is_correct: false }] } : x))} 
              updateOption={(qId: string, optId: string, updates: any) => setQuestions(prev => prev.map(x => x.id === qId ? { ...x, options: (x.options||[]).map(o => o.id === optId ? { ...o, ...updates } : (updates.is_correct && x.type !== 'multi_select' ? { ...o, is_correct: false } : o)) } : x))} 
              deleteOption={(qId: string, optId: string) => setQuestions(prev => prev.map(x => x.id === qId ? { ...x, options: (x.options||[]).filter(o => o.id !== optId) } : x))} 
            />
          ))}
        </Reorder.Group>
        
        <button type="button" onClick={() => setQuestions([...questions, createNewQuestion('multiple_choice')])} className="w-full py-16 rounded-[40px] border-4 border-dashed border-slate-200 text-slate-300 hover:border-indigo-400 hover:text-indigo-600 hover:bg-white transition-all font-black text-3xl group active:scale-95 shadow-sm">
          <span className="group-hover:scale-110 inline-block transition-transform">+ إضافة سؤال جديد</span>
        </button>
      </main>
    </div>
  );
}

