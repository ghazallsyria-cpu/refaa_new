/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect } from 'react';
import { UploadCloud, Loader2, FileText, CheckCircle2, AlertCircle, Sparkles, Image as ImageIcon, ChevronDown, ChevronUp, Copy, List, CheckSquare, AlignLeft, TerminalSquare, Key, Save, UserCheck, FileJson, ClipboardPaste, Type, FileUp, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAssignmentsSystem } from '@/hooks/useAssignmentsSystem';
import { useAuth } from '@/context/auth-context'; 
import { createClient } from '@supabase/supabase-js';

// 🚀 استيراد مكتبة الرياضيات لعرض المعاينة بشكل صحيح
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

interface Teacher { id: string; full_name: string; }
interface Subject { id: string; name: string; }
interface Section { id: string; name: string; }

// 🚀 الفلتر السحري: ينظف جميع أخطاء الذكاء الاصطناعي ويجهز المعادلات لـ KaTeX
const cleanMathLatex = (text: string) => {
  if (!text) return '';
  return text
    // 1. تحويل الشرطات المزدوجة المعطوبة إلى شرطة واحدة سليمة للأوامر (مثال: \\frac تصبح \frac)
    .replace(/\\\\([a-zA-Z])/g, '\\$1')
    // 2. توحيد علامات الدولار لمنع كسر الأسطر العشوائي
    .replace(/\$\$/g, '$');
};

export default function AIAssignmentsSandbox() {
  const router = useRouter();
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(false);

  const [inputType, setInputType] = useState<'text' | 'image' | 'pdf'>('text'); 
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [rawText, setRawText] = useState('');
  
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfMode, setPdfMode] = useState<'all' | 'range'>('all');
  const [pageFrom, setPageFrom] = useState<number>(1);
  const [pageTo, setPageTo] = useState<number>(1);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractedAssignment | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [customApiKey, setCustomApiKey] = useState('');
  const [manualJson, setManualJson] = useState('');
  const [manualJsonError, setManualJsonError] = useState<string | null>(null);

  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [assignmentStatus, setAssignmentStatus] = useState<'draft' | 'published'>('draft');
  const [isSavingDB, setIsSavingDB] = useState(false);

  useEffect(() => {
    if (currentRole !== 'admin' && currentRole !== 'management') return;
    const fetchTeachers = async () => {
      try {
        const { data, error } = await supabase.from('teachers').select(`id, users ( full_name )`);
        if (error) throw error;
        const formattedTeachers = data?.map((t: any) => ({
          id: t.id,
          full_name: t.users?.full_name || 'معلم بدون اسم' 
        })) || [];
        formattedTeachers.sort((a, b) => a.full_name.localeCompare(b.full_name));
        setTeachers(formattedTeachers);
      } catch (err) { console.error("Error:", err); } finally { setTeachersLoading(false); }
    };
    fetchTeachers();
  }, [currentRole]);

  useEffect(() => {
    const fetchTeacherSubjects = async () => {
      if (!selectedTeacher) { setSubjects([]); setSelectedSubject(''); return; }
      setSubjectsLoading(true);
      try {
        const { data, error } = await supabase.from('teacher_sections').select(`subject_id, subjects ( id, name )`).eq('teacher_id', selectedTeacher);
        if (error) throw error;
        const extracted = data?.map((item: any) => item.subjects).filter(Boolean) || [];
        const uniqueSubjects = Array.from(new Map(extracted.map((item: any) => [item.id, item])).values());
        setSubjects(uniqueSubjects as Subject[]);
        setSelectedSubject(''); 
      } catch (err) { console.error("Error:", err); } finally { setSubjectsLoading(false); }
    };
    fetchTeacherSubjects();
  }, [selectedTeacher]);

  // 🚀 التعديل المطلوب: جلب أسماء الفصول بشكل سليم (عاشر - 3)
  useEffect(() => {
    const fetchTeacherSections = async () => {
      if (!selectedTeacher || !selectedSubject) { setSections([]); setSelectedSections([]); return; }
      setSectionsLoading(true);
      try {
        const { data, error } = await supabase
          .from('teacher_sections')
          .select(`section_id, sections ( id, name, classes ( name ) )`)
          .eq('teacher_id', selectedTeacher)
          .eq('subject_id', selectedSubject); 

        if (error) throw error;
        
        const extracted = data?.map((item: any) => {
          if (!item.sections) return null;
          const classObj = item.sections.classes;
          const className = Array.isArray(classObj) ? classObj[0]?.name : classObj?.name;
          
          return {
            id: item.sections.id,
            name: className ? `${className} - ${item.sections.name}` : item.sections.name
          };
        }).filter(Boolean) || [];

        const uniqueSections = Array.from(new Map(extracted.map((item: any) => [item.id, item])).values());
        setSections(uniqueSections as Section[]);
        setSelectedSections([]); 
      } catch (err) { console.error("Error:", err); } finally { setSectionsLoading(false); }
    };
    fetchTeacherSections();
  }, [selectedTeacher, selectedSubject]);

  if (currentRole !== 'admin' && currentRole !== 'management') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-[#090b14] font-cairo" dir="rtl">
        <div className="bg-[#131836]/60 backdrop-blur-2xl p-10 rounded-[3rem] shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col items-center max-w-md text-center border border-rose-500/20">
          <div className="w-20 h-20 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mb-6 border border-rose-500/30">
            <AlertCircle className="w-10 h-10 animate-pulse" />
          </div>
          <h1 className="text-3xl font-black text-white mb-3">صلاحيات غير كافية</h1>
          <p className="text-slate-400 font-bold mb-8 leading-relaxed">عذراً، هذه الصفحة مخصصة لإدارة المنصة فقط.</p>
          <button onClick={() => router.push('/')} className="w-full bg-white/10 text-white font-bold py-4 rounded-2xl hover:bg-white/20 transition-all border border-white/20">العودة للرئيسية</button>
        </div>
      </div>
    );
  }

  const toggleSection = (sectionId: string) => {
    setSelectedSections(prev => prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]);
  };

  const basePromptText = String.raw`أنت خبير تعليمي ومطور برمجيات. قم بتحليل المحتوى واستخراج الأسئلة بصيغة JSON حصراً.

🛑 1. هيكلية الأسئلة (مهم جداً):
إذا كان هناك أمر عام يتبعه عدة أسئلة (مثل: "اقرأ المسألة التالية:"، أو "بناءً على الشكل:").
ضعه كعنصر مستقل في المصفوفة نوعه "section_header"، ثم الأسئلة تحته.

🛑 2. قواعد الرياضيات والفيزياء (LaTeX):
- اكتب أوامر LaTeX مع وضع شرطة مائلة إضافية للهروب البرمجي (Escaping) الخاص بـ JSON.
  ✔️ صحيح في الـ JSON: "\\frac{\\mu_0 I}{2 \\pi d}"
  ❌ خاطئ: "\frac" أو "\\\\frac"
- أي معادلة أو رقم ضعه داخل علامة دولار مفردة $ فقط (مثال: "$2 \times 10^{-6} \text{T}$"). لا تستخدم $$ نهائياً.
- ⚠️ دعم الرياضيات العربية: إذا كانت المعادلة تحتوي على متغيرات عربية (مثل س، ص)، يجب وضع الحرف العربي داخل أمر \text{} ليعمل بشكل صحيح.
  ✔️ مثال صحيح للمعادلة: "$(\text{س} + 2)^2 + (\text{ص} - 3)^2 = 9$"

🛑 3. أنواع الأسئلة (استخدم هذه المفاتيح حرفياً):
- "multiple_choice": اختيار من متعدد.
- "true_false": صح أو خطأ.
- "essay": سؤال مقالي.
- "file": يتطلب رفع صورة/ملف.

أخرج الناتج ككود JSON فقط بهذا الهيكل:
{
  "title": "عنوان الواجب",
  "questions": [
    // الأسئلة هنا. الإجابة النموذجية في نهاية الـ content داخل: [الإجابة النموذجية: الحل]
  ]
}`;

  const copyPrompt = () => { 
    let finalPrompt = basePromptText;
    if (inputType === 'pdf' && pdfMode === 'range') {
      finalPrompt = `[توجيه صارم للذكاء الاصطناعي: قم بقراءة واستخراج الأسئلة حصراً من الصفحة رقم ${pageFrom} إلى الصفحة رقم ${pageTo} من ملف الـ PDF المرفق. يمنع منعاً باتاً استخراج أي شيء خارج هذا النطاق.]\n\n` + basePromptText;
    }
    navigator.clipboard.writeText(finalPrompt); 
    alert('تم نسخ أمر التوليد المخصص بنجاح! يمكنك الآن لصقه في حسابك الخارجي.'); 
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
      setResult(null); setError(null);
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setResult(null); setError(null);
    } else {
      alert("يرجى اختيار ملف PDF صالح.");
    }
  };

  const callGeminiWithSmartRetry = async (payload: any) => {
    let finalApiKey = customApiKey.trim() || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!finalApiKey) throw new Error('يرجى إدخال مفتاح API الخاص بجوجل.');
    const modelsToTry = ['gemini-1.5-flash', 'gemini-1.5-pro']; 
    const delays = [2000, 4000, 8000]; 

    for (const model of modelsToTry) {
      let success = false, data = null;
      for (let attempt = 0; attempt < delays.length; attempt++) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${finalApiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
          });
          data = await response.json();
          if (!response.ok) {
            if (response.status === 429) throw new Error('QUOTA_EXCEEDED');
            if (response.status === 503 && attempt < delays.length - 1) { await new Promise(r => setTimeout(r, delays[attempt])); continue; }
            throw new Error(data.error?.message || 'خطأ غير معروف');
          }
          success = true; break; 
        } catch (err: any) {
          if (err.message === 'QUOTA_EXCEEDED') throw new Error('تم استنفاد الحد المجاني للطلبات.');
          if (attempt < delays.length - 1) { await new Promise(r => setTimeout(r, delays[attempt])); continue; }
          break; 
        }
      }
      if (success) return data; 
    }
    throw new Error('سيرفرات جوجل تشهد ضغطاً شديداً حالياً. استخدم الإدخال اليدوي للطوارئ بالأسفل.');
  };

  const cleanRawJson = (raw: string) => {
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```json/i, '');
      cleaned = cleaned.replace(/^```/, '');
      cleaned = cleaned.replace(/```$/, '');
    }
    return cleaned.trim();
  };

  const parseAndNormalizeQuestions = (parsedData: any): ExtractedQuestion[] => {
    const normalizedQuestions: ExtractedQuestion[] = [];
    let lastHeader = '';

    if (!parsedData.questions || !Array.isArray(parsedData.questions)) {
      throw new Error('الكود المدخل لا يحتوي على مصفوفة أسئلة صالحة.');
    }

    parsedData.questions.forEach((q: any) => {
      if (q.type === 'section_header' || (q.section_header && typeof q.section_header === 'string' && q.section_header !== lastHeader)) {
        normalizedQuestions.push({
          content: cleanMathLatex(q.content || q.section_header),
          type: 'section_header',
          points: 0,
          options: []
        });
        lastHeader = q.content || q.section_header;
        if (q.type === 'section_header') return; 
      }

      let qType = q.type || 'essay';
      if (qType === 'short_answer') qType = 'essay'; 
      if (qType === 'file_upload' || qType === 'upload' || qType === 'image') qType = 'file';
      
      let parsedOptions: string[] = [];
      if (qType === 'true_false' && (!q.options || q.options.length === 0)) {
         parsedOptions = ['صح', 'خطأ']; 
      } else if (Array.isArray(q.options)) {
        parsedOptions = q.options.map((opt: any) => {
          if (typeof opt === 'string') return cleanMathLatex(opt);
          if (opt && typeof opt === 'object') return cleanMathLatex(String(opt.content || opt.text || opt.value || ''));
          return cleanMathLatex(String(opt));
        }).filter(Boolean);
      }

      normalizedQuestions.push({
        content: cleanMathLatex(q.content || q.question_text || q.text || q.question || 'سؤال بدون نص'),
        type: qType,
        points: Number(q.points) || 1,
        options: parsedOptions
      });
    });

    return normalizedQuestions;
  };

  const analyzeContent = async () => {
    if (inputType === 'image' && !imageFile) return;
    if (inputType === 'text' && !rawText.trim()) return;
    if (inputType === 'pdf' && !pdfFile) return;

    setLoading(true); setError(null); setResult(null); 
    try {
      let finalPrompt = basePromptText;
      if (inputType === 'pdf' && pdfMode === 'range') {
        finalPrompt = `[توجيه صارم للذكاء الاصطناعي: قم بقراءة واستخراج الأسئلة حصراً من الصفحة رقم ${pageFrom} إلى الصفحة رقم ${pageTo} من ملف الـ PDF المرفق. يمنع منعاً باتاً استخراج أي شيء خارج هذا النطاق.]\n\n` + basePromptText;
      }

      let payloadParts: any[] = [{ text: finalPrompt }];
      
      const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
      });

      if (inputType === 'image' && imageFile) {
        payloadParts.push({ inlineData: { mimeType: imageFile.type, data: await fileToBase64(imageFile) } });
      } else if (inputType === 'pdf' && pdfFile) {
        payloadParts.push({ inlineData: { mimeType: 'application/pdf', data: await fileToBase64(pdfFile) } });
      } else if (inputType === 'text' && rawText.trim()) {
        payloadParts.push({ text: `\n\n=== النص المدخل للتحليل ===\n${rawText}` });
      }

      const payload = {
        contents: [{ role: "user", parts: payloadParts }],
        generationConfig: { responseMimeType: "application/json" }
      };

      const aiResponse = await callGeminiWithSmartRetry(payload);
      if (aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const safeJsonStr = cleanRawJson(aiResponse.candidates[0].content.parts[0].text);
        const parsedData = JSON.parse(safeJsonStr);
        setResult({ 
          title: parsedData.title || 'واجب تفاعلي ذكي', 
          questions: parseAndNormalizeQuestions(parsedData) 
        });
      } else throw new Error('لم يتم استرجاع بيانات صحيحة من النموذج');
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const processManualJson = () => {
    if (!manualJson.trim()) { setManualJsonError('يرجى لصق الكود أولاً.'); return; }
    setManualJsonError(null);
    try {
      const safeJsonStr = cleanRawJson(manualJson);
      const parsedData = JSON.parse(safeJsonStr);
      
      const normalizedQuestions = parseAndNormalizeQuestions(parsedData);

      setResult({ title: parsedData.title || 'واجب بدون عنوان', questions: normalizedQuestions });
      setManualJson(''); 
      alert('تمت معالجة الكود بذكاء وتصحيح الهيكلية بنجاح! 🚀');
    } catch (err: any) { 
      setManualJsonError('خطأ في قراءة الكود: تأكد من أن الـ JSON منسوخ بالكامل وأنه سليم. (' + err.message + ')'); 
    }
  };

  const saveToRealDatabase = async () => {
    if (!result || !selectedTeacher || !selectedSubject || selectedSections.length === 0) return;
    setIsSavingDB(true);
    try {
      const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 7);
      
      const formattedQuestions = result.questions.map((q, i) => {
        let finalOptions: any[] = q.options || [];
        if (q.type === 'true_false' && finalOptions.length === 0) {
           finalOptions = [{ id: crypto.randomUUID(), content: 'صح', is_correct: false }, { id: crypto.randomUUID(), content: 'خطأ', is_correct: false }];
        } else {
           finalOptions = finalOptions.map((opt: any) => ({ id: crypto.randomUUID(), content: String(opt), is_correct: false }));
        }

        return {
          id: crypto.randomUUID(), 
          content: q.content, 
          type: q.type, 
          points: q.points || 1, 
          isRequired: true, 
          order_index: i + 1, 
          options: finalOptions 
        };
      });

      const payloadData = { 
        title: result.title || 'واجب تفاعلي ذكي', 
        description: 'تم التوليد الذكي باستخدام خوارزميات الذكاء الاصطناعي.', 
        subject_id: selectedSubject, 
        teacher_id: selectedTeacher, 
        due_date: dueDate.toISOString(), 
        status: assignmentStatus 
      };

      const response = await fetch('/api/assignments/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          payload: payloadData,
          assignmentId: null, 
          questions: formattedQuestions, 
          sectionIds: selectedSections, 
          subjects: [], 
          userId: selectedTeacher 
        }),
      });

      if (!response.ok) { const errData = await response.json(); throw new Error(errData.error || 'فشل الحفظ'); }
      alert(assignmentStatus === 'published' ? 'تم إنشاء الواجب ونشره للطلاب بنجاح!' : 'تم إنشاء الواجب كـ(مسودة) وإرساله للمعلم لمراجعته!'); 
      router.push('/assignments'); 
    } catch (error: any) { alert('خطأ: ' + error.message); } finally { setIsSavingDB(false); }
  };

  const translateQuestionType = (type: string) => {
    switch (type) {
      case 'multiple_choice': return 'اختيار من متعدد';
      case 'true_false': return 'صح أو خطأ';
      case 'multi_select': return 'اختيار متعدد';
      case 'essay': return 'سؤال مقالي';
      case 'fill_in_blank': return 'إكمال الفراغ';
      case 'file': return 'رفع صورة / ملف';
      case 'section_header': return 'رأس مسألة / تعليمة عامة';
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-[#090b14] py-12 px-4 sm:px-8 font-cairo text-slate-200 relative overflow-hidden" dir="rtl">
      
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #090b14; border-radius: 12px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 12px; border: 2px solid #090b14; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
        
        .katex-container {
          direction: ltr !important;
          unicode-bidi: isolate !important;
          display: inline-block;
          max-width: 100%;
          overflow-wrap: break-word;
          word-wrap: break-word;
        }
        
        .katex { 
          direction: ltr !important; 
          text-align: left !important;
        }
        
        .katex-display { 
          display: flex !important; 
          justify-content: center !important;
          margin: 0.5rem 0 !important; 
          width: 100% !important;
          overflow-x: auto;
          overflow-y: hidden;
        }
      `}} />

      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[140px]"></div>
      </div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-[2rem] shadow-[0_0_30px_rgba(16,185,129,0.15)] mb-2 backdrop-blur-md">
            <Sparkles className="w-10 h-10" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">توليد الواجبات آلياً</h1>
          <p className="text-base sm:text-lg text-slate-400 font-bold max-w-2xl mx-auto leading-relaxed">ارفع صورة، ملف PDF، أو الصق نصاً، وسنقوم بتحويله لملف تفاعلي وإرساله لمعلميك.</p>
        </div>

        <div className="bg-[#131836]/60 backdrop-blur-2xl p-6 rounded-[2rem] shadow-xl border border-white/10 flex flex-col sm:flex-row gap-4 items-center max-w-3xl mx-auto">
          <div className="h-12 w-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-inner">
            <Key className="w-6 h-6 text-amber-400" />
          </div>
          <div className="flex-1 w-full">
            <input type="password" placeholder="مفتاح التوليد التلقائي (Google Gemini API)..." className="w-full bg-[#090b14]/50 border border-white/10 rounded-xl px-4 py-3 font-bold outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 text-left text-white placeholder:text-slate-500 transition-all shadow-inner" dir="ltr" value={customApiKey} onChange={(e) => setCustomApiKey(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          <div className="space-y-6">
            <div className="bg-[#131836]/60 backdrop-blur-2xl p-6 sm:p-8 rounded-[2.5rem] shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/10 blur-3xl rounded-full"></div>
              <h2 className="text-xl sm:text-2xl font-black text-white mb-6 flex items-center gap-3 relative z-10"><Sparkles className="w-6 h-6 text-emerald-400" /> الذكاء الاصطناعي</h2>
              
              <div className="flex flex-wrap bg-[#090b14]/50 p-1.5 rounded-2xl mb-6 gap-1 relative z-10 border border-white/5">
                <button onClick={() => setInputType('text')} className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${inputType === 'text' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  <Type className="w-4 h-4" /> نص
                </button>
                <button onClick={() => setInputType('image')} className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${inputType === 'image' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  <ImageIcon className="w-4 h-4" /> صورة
                </button>
                <button onClick={() => setInputType('pdf')} className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${inputType === 'pdf' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  <FileUp className="w-4 h-4" /> ملف PDF
                </button>
              </div>

              <div className="relative z-10">
                {inputType === 'text' && (
                  <textarea 
                    value={rawText} onChange={(e) => setRawText(e.target.value)}
                    placeholder="الصق نص الواجب هنا (بما في ذلك المسائل والحلول النموذجية)..."
                    className="w-full h-64 bg-[#090b14]/50 border border-white/10 rounded-2xl p-5 font-bold text-slate-200 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 leading-relaxed resize-none shadow-inner placeholder:text-slate-500 transition-all"
                  ></textarea>
                )}

                {inputType === 'image' && (
                  <label className="block w-full cursor-pointer group">
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    <div className={`w-full border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center gap-4 transition-all ${imagePreview ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 bg-[#090b14]/50 group-hover:border-emerald-500/30 group-hover:bg-[#090b14]/80'}`}>
                      {imagePreview ? <img src={imagePreview} className="max-h-60 w-auto rounded-xl shadow-lg object-contain border border-white/10" /> : <><div className="p-4 bg-emerald-500/20 rounded-2xl shadow-inner border border-emerald-500/30"><UploadCloud className="w-8 h-8 text-emerald-400" /></div><p className="font-bold text-slate-400 group-hover:text-emerald-400 transition-colors">اضغط لرفع ورقة الواجب</p></>}
                    </div>
                  </label>
                )}

                {inputType === 'pdf' && (
                  <div className="space-y-4 animate-in fade-in">
                    <label className="block w-full cursor-pointer group">
                      <input type="file" accept="application/pdf" className="hidden" onChange={handlePdfChange} />
                      <div className={`w-full border-2 border-dashed rounded-[2rem] p-8 flex flex-col items-center justify-center gap-4 transition-all ${pdfFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 bg-[#090b14]/50 group-hover:border-emerald-500/30 group-hover:bg-[#090b14]/80'}`}>
                        <div className={`p-4 rounded-2xl shadow-inner border ${pdfFile ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-white/5 border-white/10'}`}>
                          <FileText className={`w-8 h-8 ${pdfFile ? 'text-emerald-400' : 'text-slate-400'}`} />
                        </div>
                        <div className="text-center">
                          <p className={`font-bold transition-colors ${pdfFile ? 'text-emerald-400' : 'text-slate-400 group-hover:text-emerald-400'}`}>
                            {pdfFile ? pdfFile.name : 'اضغط لرفع ملف PDF'}
                          </p>
                          {pdfFile && <p className="text-xs text-emerald-500/70 mt-1 font-bold">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>}
                        </div>
                      </div>
                    </label>

                    {pdfFile && (
                      <div className="bg-[#090b14]/50 p-5 rounded-2xl border border-white/10 space-y-4 shadow-inner">
                        <p className="font-bold text-slate-300 text-sm">نطاق الاستخراج:</p>
                        <div className="flex gap-6">
                          <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-400 hover:text-white transition-colors">
                            <input type="radio" name="pdfMode" checked={pdfMode === 'all'} onChange={() => setPdfMode('all')} className="w-4 h-4 accent-emerald-500" />
                            كل الملف
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-400 hover:text-white transition-colors">
                            <input type="radio" name="pdfMode" checked={pdfMode === 'range'} onChange={() => setPdfMode('range')} className="w-4 h-4 accent-emerald-500" />
                            تحديد صفحات
                          </label>
                        </div>
                        
                        {pdfMode === 'range' && (
                          <div className="flex items-center gap-3 mt-3 animate-in fade-in">
                            <span className="text-sm font-bold text-slate-500">من</span>
                            <input type="number" min="1" value={pageFrom} onChange={(e) => setPageFrom(parseInt(e.target.value) || 1)} className="w-20 p-2 bg-[#131836] border border-white/10 rounded-xl text-center font-bold text-white outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20" />
                            <span className="text-sm font-bold text-slate-500">إلى</span>
                            <input type="number" min={pageFrom} value={pageTo} onChange={(e) => setPageTo(parseInt(e.target.value) || pageFrom)} className="w-20 p-2 bg-[#131836] border border-white/10 rounded-xl text-center font-bold text-white outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button 
                onClick={analyzeContent} 
                disabled={loading || (inputType === 'image' && !imageFile) || (inputType === 'text' && !rawText.trim()) || (inputType === 'pdf' && !pdfFile)}
                className="relative z-10 w-full mt-6 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-black text-base sm:text-lg py-4 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95 transition-all border border-emerald-400/50"
              >
                {loading ? <><Loader2 className="w-6 h-6 animate-spin" /> جاري التحليل والاستخراج...</> : <><Sparkles className="w-6 h-6" /> توليد الواجب آلياً</>}
              </button>

              {error && (
                <div className="relative z-10 mt-4 p-4 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-2xl font-bold flex items-center gap-3 text-sm backdrop-blur-md shadow-inner">
                  <AlertCircle className="shrink-0 w-5 h-5" /><p>{error}</p>
                </div>
              )}
            </div>

            <div className="bg-[#131836]/60 backdrop-blur-2xl p-6 sm:p-8 rounded-[2.5rem] shadow-lg border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full"></div>
              <h2 className="relative z-10 text-xl font-black mb-4 flex items-center gap-3 text-indigo-400"><FileJson className="w-6 h-6" /> الإدخال اليدوي للطوارئ</h2>
              <p className="relative z-10 text-sm text-slate-400 font-bold mb-6 leading-relaxed">انسخ الأمر (البرومبت) بالأسفل، ثم توجه لحسابك الخارجي في (ChatGPT أو غيره)، ارفع الملف والصقه هناك للحصول على الكود.</p>
              
              <button onClick={copyPrompt} className="relative z-10 w-full mb-6 bg-[#090b14]/50 hover:bg-[#090b14] border border-white/10 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-all active:scale-95 shadow-inner">
                <Copy className="w-4 h-4 text-indigo-400" /> انسخ أمر التوليد المخصص (البرومبت)
              </button>
              
              <div className="relative z-10">
                <textarea value={manualJson} onChange={(e) => setManualJson(e.target.value)} placeholder="الصق كود الـ JSON الناتج من النظام الخارجي هنا..." className="w-full h-32 bg-[#090b14]/80 border border-white/10 rounded-xl p-4 font-mono text-sm text-emerald-400 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 shadow-inner placeholder:text-slate-600 transition-all custom-scrollbar" dir="ltr"></textarea>
              </div>

              {manualJsonError && (
                <div className="relative z-10 mt-3 p-3 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-xl font-bold flex gap-2 text-xs backdrop-blur-sm shadow-inner">
                  <AlertCircle className="shrink-0 w-4 h-4" /><p>{manualJsonError}</p>
                </div>
              )}
              
              <button onClick={processManualJson} className="relative z-10 w-full mt-4 bg-indigo-600 text-white font-black py-3.5 rounded-xl hover:bg-indigo-500 flex justify-center items-center gap-2 transition-all active:scale-95 shadow-[0_0_15px_rgba(79,70,229,0.3)] border border-indigo-400/50">
                <ClipboardPaste className="w-5 h-5" /> معالجة الكود المدخل
              </button>
            </div>
          </div>

          <div className="bg-[#131836]/60 backdrop-blur-2xl p-6 sm:p-8 rounded-[2.5rem] shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 flex flex-col min-h-[500px] relative overflow-hidden">
            <h2 className="relative z-10 text-xl sm:text-2xl font-black mb-6 flex items-center gap-3 text-white"><FileText className="w-6 h-6 text-emerald-400" /> نتيجة الواجب والتعيين</h2>
            
            {!result && !loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 relative z-10">
                <div className="p-5 bg-white/5 rounded-[2rem] border border-white/5 mb-4 shadow-inner">
                  <FileText className="w-16 h-16 text-slate-500" />
                </div>
                <p className="text-lg font-bold text-slate-400">ستظهر أسئلة الواجب هنا بعد المعالجة.</p>
              </div>
            )}
            
            {loading && (
              <div className="flex-1 flex flex-col items-center justify-center py-20 relative z-10">
                <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
                <p className="text-lg font-bold text-emerald-400 animate-pulse tracking-widest">يقرأ الواجب ويحلل البيانات...</p>
              </div>
            )}
            
            {result && (
              <div className="space-y-8 flex-1 animate-in fade-in relative z-10">
                <div className="bg-[#090b14]/50 p-5 sm:p-6 rounded-3xl border border-white/10 max-h-[450px] overflow-y-auto custom-scrollbar shadow-inner">
                  <p className="text-sm font-black text-emerald-400 mb-4 flex items-center gap-2 bg-emerald-500/10 w-fit px-3 py-1.5 rounded-xl border border-emerald-500/20"><CheckCircle2 className="w-4 h-4" /> تم استخراج {result.questions.length} أسئلة:</p>
                  
                  <ul className="space-y-6 font-bold text-slate-300 text-sm">
                    {result.questions.map((q, i) => {
                      let displayContent = q.content;
                      const answerIndex = displayContent.indexOf('[الإجابة النموذجية');
                      if (answerIndex !== -1) displayContent = displayContent.substring(0, answerIndex).trim();
                      
                      return (
                        <li key={i} className="border-b border-white/5 pb-5 last:border-0 leading-loose">
                          <div className="flex gap-3 items-start">
                            <span className="text-emerald-500/50 mt-1 shrink-0 font-black">{i + 1}.</span>
                            <div className={q.type === 'section_header' ? "text-indigo-400 font-black text-base w-full" : "w-full"}>
                                <div className="katex-container"><Latex>{displayContent}</Latex></div>
                                {q.type !== 'section_header' && (
                                  <span className="block mt-2 text-[10px] text-slate-500 bg-[#090b14] px-2 py-1 rounded-md border border-white/5 shadow-inner w-fit">نوع: {translateQuestionType(q.type)}</span>
                                )}
                            </div>
                          </div>
                          {q.options && q.options.length > 0 && (
                            <div className="mt-4 ml-6 flex flex-wrap gap-2">
                              {q.options.map((opt, oIdx) => {
                                return (
                                  <span key={oIdx} className="px-4 py-2 rounded-xl bg-[#131836] border border-white/5 text-sm text-slate-200 shadow-sm flex items-center justify-center min-w-[60px] text-center">
                                     <div className="katex-container"><Latex>{String(opt)}</Latex></div>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="bg-emerald-500/10 p-6 sm:p-8 rounded-3xl border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.05)] backdrop-blur-md">
                  <h3 className="text-lg sm:text-xl font-black text-emerald-400 mb-6 flex items-center gap-2"><UserCheck className="w-5 h-5" /> تعيين الواجب وإرساله</h3>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold mb-2 text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        حالة الواجب عند الإرسال
                      </label>
                      <select value={assignmentStatus} onChange={(e) => setAssignmentStatus(e.target.value as 'draft' | 'published')} className="w-full bg-[#090b14]/80 border border-emerald-500/30 p-3.5 rounded-xl font-black text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none [&>option]:bg-[#131836] cursor-pointer shadow-inner transition-all">
                        <option value="draft">مسودة (يحتاج المعلم لمراجعته قبل النشر)</option>
                        <option value="published">منشور (يتم إرساله للطلاب فوراً)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-2 text-slate-400 uppercase tracking-widest">إرسال إلى المعلم</label>
                      <select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)} className="w-full bg-[#090b14]/80 border border-white/10 p-3.5 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-emerald-500/30 appearance-none [&>option]:bg-[#131836] cursor-pointer shadow-inner">
                        <option value="">-- اختر المعلم --</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold mb-2 text-slate-400 uppercase tracking-widest">المادة الدراسية</label>
                      <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} disabled={!selectedTeacher || subjectsLoading} className="w-full bg-[#090b14]/80 border border-white/10 p-3.5 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50 appearance-none [&>option]:bg-[#131836] cursor-pointer shadow-inner transition-all">
                        <option value="">{subjectsLoading ? 'جاري التحميل...' : '-- اختر المادة --'}</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold mb-3 text-slate-400 uppercase tracking-widest flex items-center justify-between">
                        الفصول المخصصة (يمكن اختيار المتعدد)
                      </label>
                      <div className="grid grid-cols-1 gap-3 bg-[#090b14]/50 p-4 rounded-xl border border-white/10 max-h-[200px] overflow-y-auto custom-scrollbar shadow-inner">
                        {!selectedSubject ? (
                          <p className="text-center text-sm text-slate-500 font-bold py-4">اختر المادة لتظهر الفصول المتاحة</p>
                        ) : (sectionsLoading ? (
                          <div className="flex justify-center py-4"><Loader2 className="animate-spin text-emerald-500" /></div>
                        ) : sections.length > 0 ? sections.map(sec => (
                          <label key={sec.id} className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-all ${selectedSections.includes(sec.id) ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-inner' : 'bg-[#131836] border-white/5 text-slate-300 hover:border-white/20'}`}>
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${selectedSections.includes(sec.id) ? 'bg-emerald-500 border-emerald-400' : 'border-slate-500 bg-[#090b14]'}`}>
                              {selectedSections.includes(sec.id) && <CheckCircle2 className="w-3.5 h-3.5 text-[#090b14]" />}
                            </div>
                            <input type="checkbox" className="hidden" checked={selectedSections.includes(sec.id)} onChange={() => toggleSection(sec.id)} />
                            <span className="text-sm font-black truncate">{sec.name}</span>
                          </label>
                        )) : (
                          <p className="text-center text-sm text-slate-500 font-bold py-4">لا توجد فصول مسجلة لهذا المعلم في هذه المادة</p>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <button onClick={saveToRealDatabase} disabled={isSavingDB || !selectedTeacher || !selectedSubject || selectedSections.length === 0} className="w-full mt-8 bg-gradient-to-r from-emerald-600 to-teal-500 text-[#090b14] font-black text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95 border border-emerald-400/50">
                    {isSavingDB ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />} تأكيد وحفظ الواجب
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
