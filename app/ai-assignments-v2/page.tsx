// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, Loader2, FileText, CheckCircle2, AlertCircle, Sparkles, 
  Image as ImageIcon, Copy, ClipboardPaste, Type, FileUp, ShieldCheck, 
  Edit3, Trash2, GripVertical, Plus, Save, X, Calculator, FlaskConical, Beaker,
  FileJson
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context'; 
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';

// استيراد مكتبة الرياضيات لعرض المعاينة بشكل صحيح
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface ExtractedQuestion {
  id?: string;
  content: string;
  type: string;
  points: number;
  options?: string[] | any[]; 
}

interface ExtractedAssignment {
  title: string;
  questions: ExtractedQuestion[];
}

const cleanMathLatex = (text: string) => {
  if (!text) return '';
  return text
    .replace(/\\\\([a-zA-Z])/g, '\\$1')
    .replace(/\$\$/g, '$')
    .replace(/\$\s*\((.*?)\)\s*\$/g, '( $$1$ )')
    .replace(/\$\s*\((.*?)\)\s*\(\s*(.*?)\)\s*\$/g, '( $$1$ )( $$2$ )');
};

export default function AIAssignmentsV2Mobile() {
  const router = useRouter();
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(false);

  const [inputType, setInputType] = useState<'text' | 'image' | 'pdf'>('text'); 
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractedAssignment | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [customApiKey, setCustomApiKey] = useState('');
  
  // 🚀 حالات الإدخال اليدوي
  const [manualJson, setManualJson] = useState('');
  const [manualJsonError, setManualJsonError] = useState<string | null>(null);

  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [assignmentStatus, setAssignmentStatus] = useState<'draft' | 'published'>('draft');
  const [isSavingDB, setIsSavingDB] = useState(false);

  // حالات المحرر السريع المنبثق للموبايل
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editQuestionState, setEditQuestionState] = useState<ExtractedQuestion | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (currentRole !== 'admin' && currentRole !== 'management') return;
    const fetchTeachers = async () => {
      try {
        const { data } = await supabase.from('teachers').select(`id, users ( full_name )`);
        const formattedTeachers = data?.map((t: any) => ({
          id: t.id,
          full_name: t.users?.full_name || 'بدون اسم' 
        })) || [];
        formattedTeachers.sort((a, b) => a.full_name.localeCompare(b.full_name));
        setTeachers(formattedTeachers);
      } catch (err) { console.error(err); } finally { setTeachersLoading(false); }
    };
    fetchTeachers();
  }, [currentRole]);

  useEffect(() => {
    const fetchTeacherSubjects = async () => {
      if (!selectedTeacher) { setSubjects([]); setSelectedSubject(''); return; }
      setSubjectsLoading(true);
      try {
        const { data } = await supabase.from('teacher_sections').select(`subject_id, subjects ( id, name )`).eq('teacher_id', selectedTeacher);
        const extracted = data?.map((item: any) => item.subjects).filter(Boolean) || [];
        const uniqueSubjects = Array.from(new Map(extracted.map((item: any) => [item.id, item])).values());
        setSubjects(uniqueSubjects);
        setSelectedSubject(''); 
      } catch (err) { console.error(err); } finally { setSubjectsLoading(false); }
    };
    fetchTeacherSubjects();
  }, [selectedTeacher]);

  useEffect(() => {
    const fetchTeacherSections = async () => {
      if (!selectedTeacher || !selectedSubject) { setSections([]); setSelectedSections([]); return; }
      setSectionsLoading(true);
      try {
        const { data } = await supabase.from('teacher_sections').select(`section_id, sections ( id, name, classes ( name ) )`).eq('teacher_id', selectedTeacher).eq('subject_id', selectedSubject); 
        const extracted = data?.map((item: any) => {
          if (!item.sections) return null;
          const classObj = item.sections.classes;
          const className = Array.isArray(classObj) ? classObj[0]?.name : classObj?.name;
          return { id: item.sections.id, name: className ? `${className} - ${item.sections.name}` : item.sections.name };
        }).filter(Boolean) || [];
        const uniqueSections = Array.from(new Map(extracted.map((item: any) => [item.id, item])).values());
        setSections(uniqueSections);
        setSelectedSections([]); 
      } catch (err) { console.error(err); } finally { setSectionsLoading(false); }
    };
    fetchTeacherSections();
  }, [selectedTeacher, selectedSubject]);

  const basePromptText = String.raw`أنت خبير تعليمي. استخرج الأسئلة بـ JSON:
1. الأسئلة العامة (مثل: بناء على النص) اجعلها "section_header".
2. الرياضيات العربية: افصل كل حد داخل دولار وضعه خارجه الأقواس. ( $س$ - $٢$ )
3. الكيمياء العضوية: للروابط العلوية/السفلية استخدم: $\begin{array}{c} CH_3 \\ | \\ C - OH \\ | \\ CH_3 \end{array}$
4. الجداول: استخدم type "data_table" وأضف كائن "table" يحتوي "headers" و "rows".
أخرج الناتج ككود JSON: { "title": "عنوان", "questions": [ { "type": "...", "content": "...", "options": [] } ] }`;

  const copyPrompt = () => { 
    navigator.clipboard.writeText(basePromptText); 
    alert('تم نسخ أمر التوليد المخصص بنجاح! يمكنك الآن لصقه في حسابك الخارجي.'); 
  };

  const analyzeContent = async () => {
    if (inputType === 'image' && !imageFile) return;
    if (inputType === 'text' && !rawText.trim()) return;
    if (inputType === 'pdf' && !pdfFile) return;

    setLoading(true); setError(null); setResult(null); 
    try {
      let payloadParts: any[] = [{ text: basePromptText }];
      
      const fileToBase64 = (file: File) => new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
      });

      if (inputType === 'image' && imageFile) {
        payloadParts.push({ inlineData: { mimeType: imageFile.type, data: await fileToBase64(imageFile) } });
      } else if (inputType === 'pdf' && pdfFile) {
        payloadParts.push({ inlineData: { mimeType: 'application/pdf', data: await fileToBase64(pdfFile) } });
      } else if (inputType === 'text' && rawText.trim()) {
        payloadParts.push({ text: `\n\nالنص المدخل:\n${rawText}` });
      }

      let finalApiKey = customApiKey.trim() || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${finalApiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ contents: [{ role: "user", parts: payloadParts }], generationConfig: { responseMimeType: "application/json" } })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'خطأ غير معروف');
      
      const safeJsonStr = data.candidates[0].content.parts[0].text.replace(/^```json/i, '').replace(/```$/, '').trim();
      const parsedData = JSON.parse(safeJsonStr);
      
      const normalizedQuestions = parsedData.questions.map((q:any) => ({
        content: cleanMathLatex(q.content || q.section_header || ''),
        type: q.type || 'essay',
        points: Number(q.points) || 1,
        options: Array.isArray(q.options) ? q.options.map((o:any)=> cleanMathLatex(String(o))) : [],
        table: q.table || null
      }));

      setResult({ title: parsedData.title || 'واجب', questions: normalizedQuestions });
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  // 🚀 معالجة الإدخال اليدوي (لصق JSON الجاهز)
  const processManualJson = () => {
    if (!manualJson.trim()) { setManualJsonError('يرجى لصق الكود أولاً.'); return; }
    setManualJsonError(null);
    try {
      let safeJsonStr = manualJson.trim();
      if (safeJsonStr.startsWith('```')) {
        safeJsonStr = safeJsonStr.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
      }
      
      const parsedData = JSON.parse(safeJsonStr);
      
      const normalizedQuestions = parsedData.questions.map((q:any) => ({
        content: cleanMathLatex(q.content || q.section_header || ''),
        type: q.type || 'essay',
        points: Number(q.points) || 1,
        options: Array.isArray(q.options) ? q.options.map((o:any)=> cleanMathLatex(String(o))) : [],
        table: q.table || null
      }));

      setResult({ title: parsedData.title || 'واجب تفاعلي ذكي', questions: normalizedQuestions });
      setManualJson(''); 
    } catch (err: any) { 
      setManualJsonError('خطأ في قراءة الكود: تأكد من أن الـ JSON منسوخ بالكامل.'); 
    }
  };

  const toggleSection = (id: string) => setSelectedSections(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const saveToRealDatabase = async () => {
    if (!result || !selectedTeacher || !selectedSubject || selectedSections.length === 0) return;
    setIsSavingDB(true);
    try {
      const formattedQuestions = result.questions.map((q: any, i) => {
        let finalOptions = q.options?.map((opt:any) => ({ id: crypto.randomUUID(), content: String(opt), is_correct: false })) || [];
        if (q.type === 'data_table' && q.table) finalOptions = [{ id: crypto.randomUUID(), content: JSON.stringify(q.table), is_correct: false }];
        if (q.type === 'true_false' && finalOptions.length === 0) finalOptions = [{ id: crypto.randomUUID(), content: 'صح', is_correct: false }, { id: crypto.randomUUID(), content: 'خطأ', is_correct: false }];
        return { id: crypto.randomUUID(), content: q.content, type: q.type, points: q.points, isRequired: true, order_index: i + 1, options: finalOptions };
      });

      const response = await fetch('/api/assignments/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          payload: { title: result.title, subject_id: selectedSubject, teacher_id: selectedTeacher, status: assignmentStatus, due_date: new Date().toISOString() },
          assignmentId: null, questions: formattedQuestions, sectionIds: selectedSections, subjects: [], userId: selectedTeacher 
        }),
      });
      if (!response.ok) throw new Error('فشل الحفظ');
      alert('تم إنشاء الواجب بنجاح!'); router.push('/assignments'); 
    } catch (error: any) { alert('خطأ: ' + error.message); } finally { setIsSavingDB(false); }
  };

  // فتح وإغلاق وحفظ المحرر
  const openEditor = (index: number) => {
    setEditQuestionState(JSON.parse(JSON.stringify(result!.questions[index])));
    setEditingIndex(index);
  };
  const closeEditor = () => { setEditingIndex(null); setEditQuestionState(null); };
  const saveEditor = () => {
    if (editingIndex !== null && editQuestionState && result) {
      const newQuestions = [...result.questions];
      newQuestions[editingIndex] = editQuestionState;
      setResult({ ...result, questions: newQuestions });
    }
    closeEditor();
  };
  const handleDeleteQuestion = (index: number) => {
    if(confirm('هل أنت متأكد من حذف هذا السؤال؟')) {
      const newQuestions = [...result!.questions];
      newQuestions.splice(index, 1);
      setResult({ ...result!, questions: newQuestions });
    }
  };

  const insertSymbol = (symbol: string) => {
    if (!textareaRef.current || !editQuestionState) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = editQuestionState.content;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    setEditQuestionState({ ...editQuestionState, content: before + symbol + after });
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(start + symbol.length, start + symbol.length);
    }, 0);
  };

  if (currentRole !== 'admin' && currentRole !== 'management') return <div className="p-10 text-center">غير مصرح لك.</div>;

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 font-cairo text-slate-800" dir="rtl">
      
      <style dangerouslySetInnerHTML={{ __html: `
        .katex-container { direction: rtl !important; unicode-bidi: embed !important; display: inline-block; max-width: 100%; overflow-wrap: break-word; }
        .katex { direction: rtl !important; text-align: right !important; }
        .katex-display { display: flex !important; justify-content: center !important; margin: 0.5rem 0 !important; width: 100% !important; overflow-x: auto; direction: rtl !important; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}} />

      <div className="max-w-xl mx-auto space-y-6">
        
        {/* هيدر الصفحة */}
        <div className="text-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
          <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-3"><Sparkles className="w-8 h-8" /></div>
          <h1 className="text-2xl font-black text-slate-900">إنشاء الواجبات (V2)</h1>
          <p className="text-sm text-slate-500 font-bold mt-2">الإصدار المخصص للموبايل والتعديل السريع.</p>
        </div>

        {/* 🚀 منطقة الإدخال قبل عرض البطاقات */}
        {!result && (
          <>
            {/* 🚀 قسم الإدخال اليدوي (JSON الجاهز) الذي طلبته */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-indigo-200 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-indigo-700">
                  <FileJson className="w-6 h-6" /> <h2 className="font-black text-lg">إدخال الكود الجاهز (يدوي)</h2>
                </div>
                <button onClick={copyPrompt} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-colors">
                  <Copy className="w-3 h-3" /> نسخ البرومبت
                </button>
              </div>
              <p className="text-xs font-bold text-slate-500 mb-2 leading-relaxed">
                هل تفضل استخدام حسابك الخارجي؟ انسخ البرومبت، ولّد الكود هناك، ثم الصقه هنا لعرضه في الواجهة الذكية الجديدة فوراً.
              </p>
              <textarea 
                value={manualJson} 
                onChange={(e) => setManualJson(e.target.value)} 
                placeholder="الصق كود الـ JSON هنا..." 
                className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-sm text-indigo-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 resize-none shadow-inner" 
                dir="ltr"
              ></textarea>
              {manualJsonError && <div className="text-rose-600 text-xs font-bold bg-rose-50 p-2 rounded-lg">{manualJsonError}</div>}
              <button onClick={processManualJson} className="w-full bg-indigo-50 text-indigo-700 font-black py-3.5 rounded-xl hover:bg-indigo-100 flex justify-center items-center gap-2 border border-indigo-200 transition-all active:scale-95">
                <ClipboardPaste className="w-5 h-5" /> بناء الواجب من الكود
              </button>
            </div>

            {/* قسم التوليد بالـ API الداخلي (اختياري) */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 space-y-4 opacity-80 hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-2 mb-2 text-slate-700">
                <Sparkles className="w-5 h-5" /> <h2 className="font-black text-base">أو التوليد الداخلي المباشر</h2>
              </div>
              <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                <button onClick={() => setInputType('text')} className={`flex-1 py-2 rounded-xl font-bold text-sm ${inputType === 'text' ? 'bg-slate-800 text-white shadow' : 'text-slate-600'}`}>نص</button>
                <button onClick={() => setInputType('image')} className={`flex-1 py-2 rounded-xl font-bold text-sm ${inputType === 'image' ? 'bg-slate-800 text-white shadow' : 'text-slate-600'}`}>صورة</button>
              </div>
              
              {inputType === 'text' && (
                <textarea value={rawText} onChange={e => setRawText(e.target.value)} placeholder="الصق أسئلة الواجب هنا..." className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-slate-800 focus:border-slate-500 outline-none resize-none"></textarea>
              )}
              {inputType === 'image' && (
                <input type="file" accept="image/*" onChange={handleImageChange} className="w-full file:bg-slate-100 file:text-slate-700 file:border-0 file:py-3 file:px-4 file:rounded-xl file:font-bold text-slate-500 text-sm" />
              )}

              <button onClick={analyzeContent} disabled={loading} className="w-full bg-slate-800 text-white font-black py-3.5 rounded-xl shadow-md disabled:opacity-50 flex justify-center items-center gap-2 transition-all active:scale-95">
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'توليد ذكي الآن'}
              </button>
              {error && <div className="text-rose-600 text-sm font-bold text-center bg-rose-50 p-2 rounded-lg">{error}</div>}
            </div>
          </>
        )}

        {/* 🚀 نظام البطاقات الذكية (بعد التوليد أو لصق الـ JSON) */}
        {result && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center sticky top-2 z-10">
              <h2 className="font-black text-indigo-900 truncate">المسودة: {result.title}</h2>
              <span className="bg-indigo-100 text-indigo-700 text-xs font-black px-3 py-1 rounded-full shrink-0">{result.questions.length} سؤال</span>
            </div>

            <div className="space-y-3">
              {result.questions.map((q, index) => (
                <div key={index} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{q.type === 'section_header' ? 'عنوان/ترويسة' : 'سؤال'}</span>
                    <div className="flex gap-2">
                      <button onClick={() => openEditor(index)} className="p-1.5 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteQuestion(index)} className="p-1.5 text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  
                  {/* عرض المعاينة المصغرة */}
                  <div className="text-slate-800 text-sm font-bold leading-relaxed">
                    <div className="katex-container"><Latex>{q.content}</Latex></div>
                  </div>
                  
                  {q.options && q.options.length > 0 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto hide-scrollbar">
                      {q.options.map((opt, i) => (
                        <div key={i} className="shrink-0 bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg text-xs font-bold text-slate-600 max-w-[120px] truncate">
                          <Latex>{String(opt)}</Latex>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* إعدادات الحفظ */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mt-6 space-y-4 pb-24">
              <h3 className="font-black text-slate-800 border-b pb-2">خيارات الإرسال</h3>
              <select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-slate-700 outline-none">
                <option value="">اختر المعلم...</option>
                {teachers.map((t:any) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
              <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-slate-700 outline-none">
                <option value="">اختر المادة...</option>
                {subjects.map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button onClick={saveToRealDatabase} disabled={isSavingDB || !selectedTeacher || !selectedSubject} className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl shadow-md disabled:opacity-50 mt-4 flex justify-center items-center gap-2">
                {isSavingDB ? <Loader2 className="animate-spin w-5 h-5" /> : 'تأكيد وحفظ'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 🚀 المحرر السريع المنبثق (Bottom Sheet Modal) */}
      <AnimatePresence>
        {editingIndex !== null && editQuestionState && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeEditor} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed bottom-0 left-0 w-full h-[85vh] bg-white rounded-t-[2rem] shadow-2xl z-50 flex flex-col overflow-hidden">
              
              <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 rounded-t-[2rem]">
                <button onClick={closeEditor} className="p-2 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
                <h3 className="font-black text-slate-800">تعديل مباشر</h3>
                <button onClick={saveEditor} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-black text-sm">حفظ</button>
              </div>

              <div className="flex gap-2 overflow-x-auto hide-scrollbar p-3 bg-white border-b border-slate-100">
                <button onClick={() => insertSymbol(' $  $ ')} className="shrink-0 flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold font-mono border border-indigo-100"><Calculator className="w-3 h-3"/> $ $</button>
                <button onClick={() => insertSymbol('$\\frac{ }{ }$')} className="shrink-0 flex items-center gap-1 bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold font-mono border border-slate-200">كسر</button>
                <button onClick={() => insertSymbol('$^{ }$')} className="shrink-0 flex items-center gap-1 bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold font-mono border border-slate-200">أس</button>
                <button onClick={() => insertSymbol('$\\sqrt{ }$')} className="shrink-0 flex items-center gap-1 bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold font-mono border border-slate-200">جذر</button>
                <button onClick={() => insertSymbol('<br/>')} className="shrink-0 flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-bold font-mono border border-amber-200">سطر جديد</button>
                <button onClick={() => insertSymbol('$\\begin{array}{c} A \\\\ | \\\\ B - C \\\\ | \\\\ D \\end{array}$')} className="shrink-0 flex items-center gap-1 bg-rose-50 text-rose-700 px-3 py-1.5 rounded-lg text-xs font-bold font-mono border border-rose-200"><FlaskConical className="w-3 h-3"/> كيمياء</button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                <div className="flex-1 min-h-[150px] relative">
                  <textarea 
                    ref={textareaRef}
                    value={editQuestionState.content}
                    onChange={(e) => setEditQuestionState({ ...editQuestionState, content: e.target.value })}
                    className="w-full h-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-slate-800 text-sm leading-loose outline-none focus:border-indigo-500 focus:bg-white resize-none"
                    placeholder="اكتب السؤال هنا..."
                  ></textarea>
                </div>

                <div className="flex-1 min-h-[150px] bg-slate-800 rounded-xl p-4 text-white overflow-y-auto">
                  <div className="text-xs text-slate-400 font-bold mb-2 uppercase tracking-widest border-b border-slate-700 pb-2">المعاينة الفورية:</div>
                  <div className="font-bold text-sm leading-loose">
                    <div className="katex-container"><Latex>{editQuestionState.content}</Latex></div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
