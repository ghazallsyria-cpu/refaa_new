// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, CheckCircle2, AlertCircle, Sparkles, 
  Copy, ClipboardPaste, ShieldCheck, Edit3, Trash2, 
  Plus, Save, X, Calculator, FlaskConical, UserCheck, 
  ListOrdered, FileJson, CheckSquare, Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context'; 
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';

// استيراد مكتبة الرياضيات لعرض المعاينة
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Option { id: string; content: string; is_correct: boolean; }
interface Question {
  id: string;
  type: string;
  content_html: string;
  points: number;
  options: Option[];
}

const cleanMathLatex = (text: string) => {
  if (!text) return '';
  return text
    .replace(/\\\\([a-zA-Z])/g, '\\$1')
    .replace(/\$\$/g, '$')
    .replace(/\$\s*\((.*?)\)\s*\$/g, '( $$1$ )')
    .replace(/\$\s*\((.*?)\)\s*\(\s*(.*?)\)\s*\$/g, '( $$1$ )( $$2$ )');
};

export default function AssignmentBuilderV2() {
  const router = useRouter();
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'builder' | 'import'>('builder');
  
  // بيانات الواجب الأساسية
  const [assignmentTitle, setAssignmentTitle] = useState('واجب جديد');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [assignmentStatus, setAssignmentStatus] = useState<'draft' | 'published'>('draft');
  
  // قائمة الأسئلة
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // الإدخال اليدوي (ChatGPT)
  const [manualJson, setManualJson] = useState('');
  const [manualJsonError, setManualJsonError] = useState<string | null>(null);
  
  const [isSavingDB, setIsSavingDB] = useState(false);
  const [globalMessage, setGlobalMessage] = useState({ text: '', type: '' });

  // حالات نافذة المحرر
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // جلب البيانات الإدارية
  useEffect(() => {
    if (currentRole !== 'admin' && currentRole !== 'management') return;
    const fetchTeachers = async () => {
      const { data } = await supabase.from('teachers').select(`id, users ( full_name )`);
      const formattedTeachers = data?.map((t: any) => ({ id: t.id, full_name: t.users?.full_name || 'بدون اسم' })) || [];
      formattedTeachers.sort((a, b) => a.full_name.localeCompare(b.full_name));
      setTeachers(formattedTeachers);
      setTeachersLoading(false);
    };
    fetchTeachers();
  }, [currentRole]);

  useEffect(() => {
    const fetchTeacherSubjects = async () => {
      if (!selectedTeacher) { setSubjects([]); setSelectedSubject(''); return; }
      setSubjectsLoading(true);
      const { data } = await supabase.from('teacher_sections').select(`subject_id, subjects ( id, name )`).eq('teacher_id', selectedTeacher);
      const extracted = data?.map((item: any) => item.subjects).filter(Boolean) || [];
      setSubjects(Array.from(new Map(extracted.map((item: any) => [item.id, item])).values()));
      setSubjectsLoading(false);
    };
    fetchTeacherSubjects();
  }, [selectedTeacher]);

  useEffect(() => {
    const fetchTeacherSections = async () => {
      if (!selectedTeacher || !selectedSubject) { setSections([]); setSelectedSections([]); return; }
      setSectionsLoading(true);
      const { data } = await supabase.from('teacher_sections').select(`section_id, sections ( id, name, classes ( name ) )`).eq('teacher_id', selectedTeacher).eq('subject_id', selectedSubject); 
      const extracted = data?.map((item: any) => {
        if (!item.sections) return null;
        const className = Array.isArray(item.sections.classes) ? item.sections.classes[0]?.name : item.sections.classes?.name;
        return { id: item.sections.id, name: className ? `${className} - ${item.sections.name}` : item.sections.name };
      }).filter(Boolean) || [];
      setSections(Array.from(new Map(extracted.map((item: any) => [item.id, item])).values()));
      setSectionsLoading(false);
    };
    fetchTeacherSections();
  }, [selectedTeacher, selectedSubject]);

  const toggleSection = (id: string) => setSelectedSections(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  // البرومبت الخاص بـ ChatGPT المجاني
  const basePromptText = String.raw`أنت خبير تعليمي. استخرج الأسئلة بـ JSON:
1. الأسئلة العامة (مثل: اقرأ النص التالي) اجعل نوعها "section_header".
2. الرياضيات العربية: افصل كل حد داخل دولار وضعه خارجه الأقواس. مثال: ( $س$ - $٢$ )
3. الكيمياء العضوية: للروابط استخدم: $\begin{array}{c} CH_3 \\ | \\ C - OH \\ | \\ CH_3 \end{array}$
أخرج الناتج ككود JSON: { "title": "عنوان", "questions": [ { "type": "multiple_choice", "content": "السؤال...", "points": 1, "options": ["خيار1", "خيار2"] } ] }
أنواع الأسئلة المتاحة: multiple_choice, essay, true_false, section_header`;

  const copyPrompt = () => { 
    navigator.clipboard.writeText(basePromptText); 
    alert('تم نسخ أمر التوليد الذكي! الصقه في ChatGPT الآن.'); 
  };

  // معالجة JSON الجاهز
  const processManualJson = () => {
    if (!manualJson.trim()) { setManualJsonError('يرجى لصق الكود أولاً.'); return; }
    try {
      let safeJsonStr = manualJson.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
      const parsedData = JSON.parse(safeJsonStr);
      
      const newQuestions = parsedData.questions.map((q:any) => ({
        id: crypto.randomUUID(),
        content_html: cleanMathLatex(q.content || q.section_header || ''),
        type: q.type || 'essay',
        points: Number(q.points) || 1,
        options: Array.isArray(q.options) ? q.options.map((o:any)=> ({ id: crypto.randomUUID(), content: cleanMathLatex(String(o)), is_correct: false })) : [],
      }));

      setAssignmentTitle(parsedData.title || 'واجب مستورد');
      setQuestions(prev => [...prev, ...newQuestions]);
      setManualJson(''); 
      setManualJsonError(null);
      setActiveTab('builder');
      setGlobalMessage({ text: 'تم استيراد الأسئلة بنجاح!', type: 'success' });
      setTimeout(() => setGlobalMessage({ text: '', type: '' }), 3000);
    } catch (err: any) { 
      setManualJsonError('تأكد من أن الكود المنسوخ صالح (JSON).'); 
    }
  };

  // 🚀 دوال المحرر البصري
  const openNewQuestion = () => {
    setCurrentQ({ id: crypto.randomUUID(), type: 'multiple_choice', content_html: '', points: 1, options: [] });
    setEditingIndex(null);
    setIsEditorOpen(true);
  };

  const openEditQuestion = (index: number) => {
    setCurrentQ(JSON.parse(JSON.stringify(questions[index]))); // Clone
    setEditingIndex(index);
    setIsEditorOpen(true);
  };

  const saveQuestion = () => {
    if (!currentQ?.content_html.trim()) { alert('يرجى كتابة محتوى السؤال'); return; }
    
    let updatedQ = { ...currentQ };
    // إضافة خيارات افتراضية لصح وخطأ إذا كانت فارغة
    if (updatedQ.type === 'true_false' && updatedQ.options.length === 0) {
      updatedQ.options = [
        { id: crypto.randomUUID(), content: 'صح', is_correct: false },
        { id: crypto.randomUUID(), content: 'خطأ', is_correct: false }
      ];
    }

    if (editingIndex !== null) {
      const newArr = [...questions];
      newArr[editingIndex] = updatedQ;
      setQuestions(newArr);
    } else {
      setQuestions([...questions, updatedQ]);
    }
    setIsEditorOpen(false);
  };

  const deleteQuestion = (index: number) => {
    if(!confirm('حذف هذا السؤال؟')) return;
    const newArr = [...questions];
    newArr.splice(index, 1);
    setQuestions(newArr);
  };

  const addOption = () => {
    if(currentQ) setCurrentQ({...currentQ, options: [...currentQ.options, { id: crypto.randomUUID(), content: 'خيار جديد', is_correct: false }]});
  };

  const removeOption = (optId: string) => {
    if(currentQ) setCurrentQ({...currentQ, options: currentQ.options.filter(o => o.id !== optId)});
  };

  const toggleCorrectOption = (optId: string) => {
    if(currentQ) {
      const updatedOptions = currentQ.options.map(o => {
        if (currentQ.type === 'multiple_choice' || currentQ.type === 'true_false') {
          return { ...o, is_correct: o.id === optId };
        }
        return o.id === optId ? { ...o, is_correct: !o.is_correct } : o;
      });
      setCurrentQ({...currentQ, options: updatedOptions});
    }
  };

  const updateOptionContent = (optId: string, val: string) => {
    if(currentQ) setCurrentQ({...currentQ, options: currentQ.options.map(o => o.id === optId ? { ...o, content: val } : o)});
  };

  const insertSymbol = (symbol: string) => {
    if (!textareaRef.current || !currentQ) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = currentQ.content_html;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    setCurrentQ({ ...currentQ, content_html: before + symbol + after });
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(start + symbol.length, start + symbol.length);
    }, 0);
  };

  // 🚀 الحفظ النهائي في قاعدة البيانات (جداول V2)
  const saveAssignmentToDB = async () => {
    if (!assignmentTitle || questions.length === 0 || !selectedTeacher || !selectedSubject || selectedSections.length === 0) {
      alert('يرجى إكمال بيانات الواجب (العنوان، المعلم، المادة، الفصول) وإضافة سؤال واحد على الأقل.');
      return;
    }
    
    setIsSavingDB(true);
    try {
      const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 7);

      // 1. إدخال الواجب الأساسي
      const { data: assignData, error: assignErr } = await supabase
        .from('assignments_v2')
        .insert({
          title: assignmentTitle,
          description: 'تم الإنشاء بواسطة الصانع البصري V2',
          subject_id: selectedSubject,
          teacher_id: selectedTeacher,
          due_date: dueDate.toISOString(),
          status: assignmentStatus
        })
        .select()
        .single();
      
      if (assignErr) throw assignErr;
      const newAssignmentId = assignData.id;

      // 2. إدخال الفصول (Sections)
      const sectionsPayload = selectedSections.map(secId => ({
        assignment_id: newAssignmentId,
        section_id: secId
      }));
      const { error: secErr } = await supabase.from('assignment_sections_v2').insert(sectionsPayload);
      if (secErr) throw secErr;

      // 3. إدخال الأسئلة
      const questionsPayload = questions.map((q, index) => ({
        assignment_id: newAssignmentId,
        question_type: q.type,
        content_html: q.content_html,
        points: q.points,
        options: q.options, // Jsonb array
        order_index: index + 1
      }));
      const { error: qErr } = await supabase.from('assignment_questions_v2').insert(questionsPayload);
      if (qErr) throw qErr;

      setGlobalMessage({ text: 'تم حفظ الواجب الجديد بنجاح في قاعدة V2!', type: 'success' });
      setTimeout(() => { router.push('/assignments'); }, 2000);
    } catch (err: any) {
      alert('حدث خطأ أثناء الحفظ: ' + err.message);
    } finally {
      setIsSavingDB(false);
    }
  };

  const translateType = (t: string) => {
    const types:any = { 'multiple_choice': 'اختياري', 'true_false': 'صح/خطأ', 'essay': 'مقالي', 'section_header': 'عنوان قسم' };
    return types[t] || t;
  };

  if (currentRole !== 'admin' && currentRole !== 'management') return <div className="p-10 text-center">غير مصرح لك.</div>;

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 font-cairo text-slate-800 pb-32" dir="rtl">
      
      {/* دعم RTL للرياضيات */}
      <style dangerouslySetInnerHTML={{ __html: `
        .katex-container { direction: rtl !important; unicode-bidi: embed !important; display: inline-block; max-width: 100%; overflow-wrap: break-word; }
        .katex { direction: rtl !important; text-align: right !important; }
        .katex-display { display: flex !important; justify-content: center !important; margin: 0.5rem 0 !important; width: 100% !important; overflow-x: auto; direction: rtl !important; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}} />

      <AnimatePresence>
        {globalMessage.text && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl font-bold text-white flex items-center gap-3 ${globalMessage.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
            <CheckCircle2 className="w-5 h-5" /> {globalMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-3xl mx-auto space-y-6">
        
        <div className="text-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
          <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-3"><Sparkles className="w-8 h-8" /></div>
          <h1 className="text-2xl font-black text-slate-900">منشئ الواجبات المتقدم (V2)</h1>
          <p className="text-sm text-slate-500 font-bold mt-2">نظام مستقل بميزانية صفرية، يعتمد على البناء اليدوي البصري والاستيراد.</p>
        </div>

        {/* القوائم العلوية */}
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
          <button onClick={() => setActiveTab('builder')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${activeTab === 'builder' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
            <ListOrdered className="w-4 h-4 inline-block ml-2 mb-1" /> بناء الواجب
          </button>
          <button onClick={() => setActiveTab('import')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${activeTab === 'import' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
            <FileJson className="w-4 h-4 inline-block ml-2 mb-1" /> استيراد ذكي (ChatGPT)
          </button>
        </div>

        {/* قسم الاستيراد */}
        {activeTab === 'import' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-6 rounded-[2rem] shadow-sm border border-emerald-200 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-lg text-emerald-800">توليد مجاني عبر ChatGPT</h2>
              <button onClick={copyPrompt} className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-2 px-4 rounded-xl flex items-center gap-1 transition-colors border border-emerald-200">
                <Copy className="w-4 h-4" /> انسخ البرومبت
              </button>
            </div>
            <p className="text-sm font-bold text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
              1. انسخ البرومبت.<br/>2. اذهب إلى ChatGPT (أو أي ذكاء مجاني) وألصقه مع نص الواجب.<br/>3. انسخ كود الـ JSON الناتج وألصقه هنا.
            </p>
            <textarea 
              value={manualJson} 
              onChange={(e) => setManualJson(e.target.value)} 
              placeholder="الصق كود الـ JSON هنا..." 
              className="w-full h-40 bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-sm text-emerald-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 resize-none shadow-inner" 
              dir="ltr"
            ></textarea>
            {manualJsonError && <div className="text-rose-600 text-xs font-bold bg-rose-50 p-3 rounded-xl border border-rose-100">{manualJsonError}</div>}
            <button onClick={processManualJson} className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl hover:bg-emerald-700 flex justify-center items-center gap-2 shadow-md transition-all active:scale-95">
              <ClipboardPaste className="w-5 h-5" /> استيراد الكود وتحويله لأسئلة
            </button>
          </motion.div>
        )}

        {/* قسم البناء الأساسي */}
        {activeTab === 'builder' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            
            {/* إعدادات الواجب الأساسية */}
            <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-200 space-y-5">
              <h2 className="font-black text-indigo-900 border-b border-slate-100 pb-3 flex items-center gap-2"><FileText className="w-5 h-5" /> بيانات الواجب</h2>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">عنوان الواجب</label>
                <input type="text" value={assignmentTitle} onChange={e => setAssignmentTitle(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-800 outline-none focus:border-indigo-500" placeholder="مثال: واجب الفيزياء الأسبوع الأول" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">المعلم</label>
                  <select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none">
                    <option value="">اختر المعلم...</option>
                    {teachers.map((t:any) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">المادة</label>
                  <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} disabled={!selectedTeacher} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none disabled:opacity-50">
                    <option value="">اختر المادة...</option>
                    {subjects.map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">الفصول المخصصة</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-40 overflow-y-auto">
                  {!selectedSubject ? <span className="text-xs font-bold text-slate-400">اختر المادة أولاً</span> : sections.map((sec:any) => (
                    <label key={sec.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-colors ${selectedSections.includes(sec.id) ? 'bg-indigo-100 border-indigo-300 text-indigo-800' : 'bg-white border-slate-200 text-slate-600'}`}>
                      <input type="checkbox" className="hidden" checked={selectedSections.includes(sec.id)} onChange={() => toggleSection(sec.id)} />
                      <div className={`w-4 h-4 rounded flex items-center justify-center border ${selectedSections.includes(sec.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white'}`}>
                        {selectedSections.includes(sec.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm font-bold truncate">{sec.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* قائمة الأسئلة (البطاقات) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="font-black text-slate-800 text-lg">الأسئلة ({questions.length})</h3>
              </div>

              {questions.length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center opacity-60">
                  <ListOrdered className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="font-bold text-slate-500">لا توجد أسئلة بعد، ابدأ ببناء الواجب أو استورده.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, i) => (
                    <div key={q.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 group">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                          {i + 1}. {translateType(q.type)} ({q.points} درجة)
                        </span>
                        <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditQuestion(i)} className="p-1.5 text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => deleteQuestion(i)} className="p-1.5 text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <div className="text-slate-800 text-sm font-bold leading-loose">
                        <div className="katex-container"><Latex>{q.content_html}</Latex></div>
                      </div>
                      
                      {q.options && q.options.length > 0 && (
                        <div className="mt-4 flex flex-col gap-2">
                          {q.options.map((opt, oIdx) => (
                            <div key={opt.id} className={`p-2 rounded-xl text-sm font-bold flex items-center gap-3 border ${opt.is_correct ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${opt.is_correct ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300'}`}>
                                {opt.is_correct && <CheckCircle2 className="w-3 h-3" />}
                              </div>
                              <div className="katex-container"><Latex>{opt.content}</Latex></div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button onClick={openNewQuestion} className="w-full border-2 border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 font-black py-4 rounded-[2rem] flex justify-center items-center gap-2 transition-colors">
                <Plus className="w-5 h-5" /> إضافة سؤال جديد
              </button>
            </div>

            {/* الحفظ النهائي */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 mt-8 space-y-4">
              <label className="block text-xs font-bold text-slate-500">حالة الواجب عند الإرسال</label>
              <select value={assignmentStatus} onChange={e => setAssignmentStatus(e.target.value as 'draft'|'published')} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-black text-indigo-700 outline-none focus:border-indigo-500">
                <option value="draft">حفظ كمسودة</option>
                <option value="published">نشر للطلاب مباشرة</option>
              </select>
              <button onClick={saveAssignmentToDB} disabled={isSavingDB} className="w-full bg-slate-900 text-white font-black text-lg py-4 rounded-xl shadow-lg hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-all">
                {isSavingDB ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />} اعتماد وحفظ في النظام
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* 🚀 نافذة محرر السؤال المنبثقة */}
      <AnimatePresence>
        {isEditorOpen && currentQ && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditorOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 250 }} className="fixed bottom-0 left-0 w-full h-[90vh] bg-white rounded-t-[2rem] shadow-2xl z-50 flex flex-col overflow-hidden">
              
              <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                <button onClick={() => setIsEditorOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full shadow-sm"><X className="w-5 h-5" /></button>
                <h3 className="font-black text-slate-800 text-lg">صياغة السؤال</h3>
                <button onClick={saveQuestion} className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-md active:scale-95 transition-all">حفظ</button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6 bg-slate-50/50 pb-32">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">نوع السؤال</label>
                    <select value={currentQ.type} onChange={(e) => setCurrentQ({...currentQ, type: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-slate-700 outline-none">
                      <option value="multiple_choice">اختياري</option>
                      <option value="true_false">صح / خطأ</option>
                      <option value="essay">مقالي (تصحيح يدوي)</option>
                      <option value="section_header">عنوان مسألة (نص فقط)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">الدرجة</label>
                    <input type="number" min="0" value={currentQ.points} onChange={(e) => setCurrentQ({...currentQ, points: Number(e.target.value)})} disabled={currentQ.type === 'section_header'} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-center text-slate-700 outline-none disabled:opacity-50" />
                  </div>
                </div>

                <div className="space-y-2 bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-2 border-b border-slate-100 pb-3">
                    <label className="text-sm font-black text-indigo-900">نص السؤال</label>
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                      <button type="button" onClick={() => insertSymbol(' $  $ ')} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold font-mono">$$</button>
                      <button type="button" onClick={() => insertSymbol('$\\frac{ }{ }$')} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold font-mono">كسر</button>
                      <button type="button" onClick={() => insertSymbol('<br/>')} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold font-mono">سطر</button>
                    </div>
                  </div>
                  <textarea 
                    ref={textareaRef}
                    value={currentQ.content_html}
                    onChange={(e) => setCurrentQ({ ...currentQ, content_html: e.target.value })}
                    className="w-full h-32 bg-slate-50/50 border-0 p-2 font-bold text-slate-800 text-sm leading-loose outline-none resize-none"
                    placeholder="اكتب أو الصق نص السؤال هنا..."
                  ></textarea>
                </div>

                <div className="bg-slate-800 rounded-[2rem] p-5 text-white shadow-inner min-h-[100px]">
                  <div className="text-[10px] text-slate-400 font-bold mb-3 uppercase tracking-widest border-b border-slate-700 pb-2 flex items-center gap-2"><CheckSquare className="w-3 h-3"/> كيف يراها الطالب:</div>
                  <div className="font-bold text-sm leading-loose">
                    <div className="katex-container"><Latex>{currentQ.content_html || '...'}</Latex></div>
                  </div>
                </div>

                {currentQ.type === 'multiple_choice' && (
                  <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
                    <h4 className="font-black text-slate-800 flex items-center justify-between">
                      خيارات الإجابة
                      <button onClick={addOption} className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg flex items-center gap-1"><Plus className="w-3 h-3"/> إضافة</button>
                    </h4>
                    <div className="space-y-3">
                      {currentQ.options.map((opt, i) => (
                        <div key={opt.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${opt.is_correct ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 bg-slate-50'}`}>
                          <button onClick={() => toggleCorrectOption(opt.id)} className={`mt-2 w-6 h-6 rounded-full shrink-0 flex items-center justify-center border-2 transition-colors ${opt.is_correct ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300'}`}>
                            {opt.is_correct && <CheckCircle2 className="w-4 h-4" />}
                          </button>
                          <div className="w-full space-y-2">
                            <input type="text" value={opt.content} onChange={(e) => updateOptionContent(opt.id, e.target.value)} className="w-full bg-white border border-slate-200 p-2 rounded-lg font-bold text-sm outline-none focus:border-indigo-500" placeholder={`الخيار ${i + 1}`} dir="ltr" style={{textAlign: 'right'}} />
                            <div className="text-xs text-slate-500 font-bold bg-white p-2 rounded-md border border-slate-100 min-h-[30px]"><div className="katex-container"><Latex>{opt.content || '...'}</Latex></div></div>
                          </div>
                          <button onClick={() => removeOption(opt.id)} className="mt-2 p-1.5 text-slate-400 hover:text-rose-600 bg-white rounded-md shadow-sm border border-slate-100"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
