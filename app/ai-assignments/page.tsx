'use client';

import React, { useState, useEffect } from 'react';
import { UploadCloud, Loader2, FileText, CheckCircle2, AlertCircle, Sparkles, Image as ImageIcon, ChevronDown, ChevronUp, Copy, List, CheckSquare, AlignLeft, TerminalSquare, Key, Save, UserCheck, FileJson, ClipboardPaste, Type } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAssignmentsSystem } from '@/hooks/useAssignmentsSystem';
import { useAuth } from '@/context/auth-context'; 
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface ExtractedQuestion {
  content: string;
  type: 'multiple_choice' | 'true_false' | 'essay';
  points: number;
  options?: string[];
}

interface ExtractedAssignment {
  title: string;
  questions: ExtractedQuestion[];
}

interface Teacher { id: string; full_name: string; }
interface Subject { id: string; name: string; }
interface Section { id: string; name: string; }

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

  // حالات الإدخال والتوليد
  const [inputType, setInputType] = useState<'image' | 'text'>('text'); // افتراضي على النص الآن
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [rawText, setRawText] = useState(''); // النص المنسوخ
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractedAssignment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  
  const [customApiKey, setCustomApiKey] = useState('');
  const [manualJson, setManualJson] = useState('');
  const [manualJsonError, setManualJsonError] = useState<string | null>(null);

  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
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

  useEffect(() => {
    const fetchTeacherSections = async () => {
      if (!selectedTeacher || !selectedSubject) { setSections([]); setSelectedSections([]); return; }
      setSectionsLoading(true);
      try {
        const { data, error } = await supabase.from('teacher_sections').select(`section_id, sections ( id, name )`).eq('teacher_id', selectedTeacher).eq('subject_id', selectedSubject); 
        if (error) throw error;
        const extracted = data?.map((item: any) => item.sections).filter(Boolean) || [];
        const uniqueSections = Array.from(new Map(extracted.map((item: any) => [item.id, item])).values());
        setSections(uniqueSections as Section[]);
        setSelectedSections([]); 
      } catch (err) { console.error("Error:", err); } finally { setSectionsLoading(false); }
    };
    fetchTeacherSections();
  }, [selectedTeacher, selectedSubject]);

  if (currentRole !== 'admin' && currentRole !== 'management') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans" dir="rtl">
        <div className="bg-white p-10 rounded-3xl shadow-xl flex flex-col items-center max-w-md text-center border border-red-100">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 mb-3">صلاحيات غير كافية</h1>
          <p className="text-slate-500 font-bold mb-8 leading-relaxed">عذراً، هذه الصفحة مخصصة لإدارة المنصة فقط.</p>
          <button onClick={() => router.push('/')} className="w-full bg-slate-800 text-white font-bold py-4 rounded-xl hover:bg-slate-700 transition-all">العودة للرئيسية</button>
        </div>
      </div>
    );
  }

  const toggleSection = (sectionId: string) => {
    setSelectedSections(prev => prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]);
  };

  // 🚀 برومبت ذكي جداً مخصص للتعامل مع مسائل الفيزياء والرياضيات وتجزئتها
  const promptText = `أنت خبير تعليمي. قم بتحليل المحتوى المرفق (سواء كان صورة أو نصاً) واستخرج منه عنوان الواجب والأسئلة.
تعليمات هامة جداً:
1. إذا كان المحتوى عبارة عن "مسألة شاملة" بداخلها عدة طلبات فرعية (1، 2، 3..)، قم بتحويل كل طلب إلى سؤال مستقل (essay)، مع كتابة المعطيات الأساسية للمسألة في بداية كل سؤال ليكون واضحاً للطالب.
2. إذا كان هناك "إجابة نموذجية" أو "نموذج حل" مرفق في النص، قم بدمجه في نهاية نص السؤال بين قوسين هكذا:
   [الإجابة النموذجية للمعلم: ضع خطوات الحل والناتج النهائي هنا]
3. حافظ على الرموز والمعادلات الفيزيائية والرياضية كما هي باستخدام التنسيق السليم.
4. أنواع الأسئلة المسموحة فقط: multiple_choice أو true_false أو essay. (للمسائل الحسابية استخدم essay واترك options فارغة).
5. يجب أن يكون الناتج بتنسيق JSON حصرياً وصالحاً (Valid JSON) بالهيكل التالي بالضبط:
{
  "title": "عنوان الواجب",
  "questions": [
    {
      "content": "نص السؤال هنا مع المعطيات [الإجابة النموذجية للمعلم: ...]",
      "type": "essay",
      "points": 5,
      "options": []
    }
  ]
}
لا تكتب أي نص أو شروحات خارج كود الـ JSON.`;

  const copyPrompt = () => { navigator.clipboard.writeText(promptText); alert('تم نسخ أمر التوليد بنجاح!'); };

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

  const callGeminiWithSmartRetry = async (payload: any) => {
    let finalApiKey = customApiKey.trim() || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!finalApiKey) throw new Error('يرجى إدخال مفتاح API الخاص بجوجل.');
    const modelsToTry = ['gemini-1.5-flash-8b', 'gemini-1.5-flash', 'gemini-2.0-flash'];
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

  const analyzeContent = async () => {
    if (inputType === 'image' && !imageFile) return;
    if (inputType === 'text' && !rawText.trim()) return;

    setLoading(true); setError(null); setResult(null); 
    try {
      let payloadParts: any[] = [{ text: promptText }];
      
      if (inputType === 'image' && imageFile) {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(imageFile);
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
        });
        payloadParts.push({ inlineData: { mimeType: imageFile.type, data: base64Data } });
      } else if (inputType === 'text' && rawText.trim()) {
        payloadParts.push({ text: `\n\n=== النص المدخل للتحليل ===\n${rawText}` });
      }

      const payload = {
        contents: [{ role: "user", parts: payloadParts }],
        generationConfig: { responseMimeType: "application/json" }
      };

      const aiResponse = await callGeminiWithSmartRetry(payload);
      if (aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text) {
        setResult(JSON.parse(aiResponse.candidates[0].content.parts[0].text)); 
      } else throw new Error('لم يتم استرجاع بيانات صحيحة من النموذج');
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const processManualJson = () => {
    if (!manualJson.trim()) { setManualJsonError('يرجى لصق الكود أولاً.'); return; }
    setManualJsonError(null);
    try {
      let cleanedJson = manualJson.trim().replace(/```json/g, '').replace(/```/g, '');
      const parsedData = JSON.parse(cleanedJson);
      if (!parsedData.questions || !Array.isArray(parsedData.questions)) throw new Error('الكود المدخل لا يحتوي على مصفوفة أسئلة.');
      
      const normalizedQuestions: ExtractedQuestion[] = parsedData.questions.map((q: any) => ({
        content: q.content || q.question_text || q.text || q.question || 'سؤال بدون نص',
        type: q.type || 'essay', 
        points: Number(q.points) || 1,
        options: Array.isArray(q.options) ? q.options.map((opt: any) => typeof opt === 'string' ? opt : String(opt.content || opt.text || opt)) : []
      }));

      setResult({ title: parsedData.title || 'واجب بدون عنوان', questions: normalizedQuestions });
      setManualJson(''); alert('تمت المعالجة بنجاح!');
    } catch (err: any) { setManualJsonError('خطأ: ' + err.message); }
  };

  const saveToRealDatabase = async () => {
    if (!result || !selectedTeacher || !selectedSubject || selectedSections.length === 0) return;
    setIsSavingDB(true);
    try {
      const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 7);
      const formattedQuestions = result.questions.map((q, i) => ({
        id: crypto.randomUUID(), content: q.content, type: q.type, points: q.points || 1, isRequired: true, order_index: i + 1, options: q.options || []
      }));

      const response = await fetch('/api/assignments/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          payload: { title: result.title || 'واجب تفاعلي ذكي', description: 'تم التوليد آلياً وتجزئة المسائل بواسطة الذكاء الاصطناعي.', subject_id: selectedSubject, due_date: dueDate.toISOString(), status: 'draft' },
          assignmentId: null, questions: formattedQuestions, sectionIds: selectedSections, subjects: [], userId: selectedTeacher 
        }),
      });

      if (!response.ok) { const errData = await response.json(); throw new Error(errData.error || 'فشل الحفظ'); }
      alert('تم إرسال الواجب بنجاح!'); router.push('/assignments'); 
    } catch (error: any) { alert('خطأ: ' + error.message); } finally { setIsSavingDB(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-8 font-sans" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-emerald-100 text-emerald-600 rounded-[2rem] shadow-sm mb-2">
            <Sparkles className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">توليد الواجبات آلياً (للمدراء)</h1>
          <p className="text-lg text-slate-500 font-bold max-w-2xl mx-auto leading-relaxed">ارفع صورة الواجب أو الصق نصه المكتوب، وسنقوم بتحويله لواجب إلكتروني تفاعلي وإرساله لمعلميك بضغطة زر.</p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-emerald-100 flex flex-col sm:flex-row gap-4 items-center max-w-3xl mx-auto">
          <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Key className="w-6 h-6 text-amber-500" />
          </div>
          <div className="flex-1 w-full">
            <input type="password" placeholder="مفتاح التوليد التلقائي (Google Gemini API)..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold outline-none focus:border-emerald-500 text-left" dir="ltr" value={customApiKey} onChange={(e) => setCustomApiKey(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
              <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3"><Sparkles className="w-6 h-6 text-emerald-500" /> الذكاء الاصطناعي</h2>
              
              {/* تبويبات الإدخال: صورة أو نص */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
                <button onClick={() => setInputType('text')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${inputType === 'text' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Type className="w-5 h-5" /> لصق نص الواجب
                </button>
                <button onClick={() => setInputType('image')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${inputType === 'image' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  <ImageIcon className="w-5 h-5" /> رفع صورة الواجب
                </button>
              </div>

              {inputType === 'text' ? (
                <textarea 
                  value={rawText} onChange={(e) => setRawText(e.target.value)}
                  placeholder="الصق نص الواجب هنا (بما في ذلك المسائل والحلول النموذجية)..."
                  className="w-full h-64 bg-slate-50 border border-slate-200 rounded-2xl p-5 font-medium text-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 leading-relaxed resize-none"
                ></textarea>
              ) : (
                <label className="block w-full cursor-pointer relative">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  <div className={`w-full border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center gap-4 transition-all ${imagePreview ? 'border-emerald-200 bg-emerald-50/30' : 'bg-slate-50 hover:bg-slate-100'}`}>
                    {imagePreview ? <img src={imagePreview} className="max-h-60 w-auto rounded-2xl shadow-sm object-contain" /> : <><div className="p-4 bg-white rounded-full shadow-sm"><UploadCloud className="w-10 h-10 text-emerald-400" /></div><p className="font-bold text-slate-700">اضغط لرفع ورقة الواجب</p></>}
                  </div>
                </label>
              )}

              <button 
                onClick={analyzeContent} 
                disabled={loading || (inputType === 'image' ? !imageFile : !rawText.trim())}
                className="w-full mt-6 bg-emerald-600 text-white font-black text-lg py-4 rounded-2xl shadow-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95"
              >
                {loading ? <><Loader2 className="w-6 h-6 animate-spin" /> جاري التحليل والاستخراج...</> : <><Sparkles className="w-6 h-6" /> {inputType === 'text' ? 'توليد الواجب من النص' : 'توليد الواجب من الصورة'}</>}
              </button>

              {error && <div className="mt-4 p-4 bg-red-50 text-red-700 border border-red-100 rounded-2xl font-bold flex items-center gap-3 text-sm"><AlertCircle className="shrink-0" /><p>{error}</p></div>}
            </div>

            <div className="bg-slate-800 p-8 rounded-[2.5rem] shadow-xl border border-slate-700 text-white">
              <h2 className="text-xl font-black mb-4 flex items-center gap-3 text-emerald-400"><FileJson className="w-6 h-6" /> الخيار الثاني: الإدخال اليدوي للطوارئ</h2>
              <button onClick={copyPrompt} className="w-full mb-6 bg-slate-700 hover:bg-slate-600 font-bold py-3 rounded-xl flex justify-center gap-2"><Copy className="w-5 h-5 text-slate-300" /> انسخ أمر التوليد (البرومبت)</button>
              <textarea value={manualJson} onChange={(e) => setManualJson(e.target.value)} placeholder="الصق كود الـ JSON هنا..." className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 font-mono text-sm text-emerald-300 focus:outline-none focus:border-emerald-500" dir="ltr"></textarea>
              {manualJsonError && <div className="mt-3 p-3 bg-red-900/50 text-red-300 border border-red-800 rounded-xl font-bold flex gap-2 text-xs"><AlertCircle className="shrink-0" /><p>{manualJsonError}</p></div>}
              <button onClick={processManualJson} className="w-full mt-4 bg-emerald-600 text-white font-black py-3.5 rounded-xl hover:bg-emerald-500 flex justify-center gap-2"><ClipboardPaste className="w-5 h-5" /> معالجة الكود المدخل</button>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col min-h-[500px]">
            <h2 className="text-2xl font-black mb-6 flex items-center gap-3"><FileText className="w-6 h-6 text-emerald-500" /> نتيجة الواجب والتعيين</h2>
            {!result && !loading && <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50"><FileText className="w-16 h-16 text-slate-300 mb-4" /><p className="text-xl font-bold text-slate-400">ستظهر أسئلة الواجب هنا بعد المعالجة.</p></div>}
            {loading && <div className="flex-1 flex flex-col items-center justify-center py-20"><div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4" /><p className="text-lg font-bold text-emerald-600 animate-pulse">يقرأ الواجب الآن...</p></div>}
            
            {result && (
              <div className="space-y-8 flex-1 animate-in fade-in">
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 max-h-[350px] overflow-y-auto">
                  <p className="text-sm font-black text-slate-600 mb-3 flex items-center gap-2"><CheckCircle2 className="text-emerald-500" /> تم استخراج {result.questions.length} أسئلة:</p>
                  <ul className="list-disc list-inside space-y-4 font-bold text-slate-700 text-sm">
                    {result.questions.map((q, i) => (
                      <li key={i} className="border-b border-slate-200 pb-4 last:border-0 leading-loose">
                        {q.content.split('\n').map((line, idx) => (
                           <span key={idx} className={line.includes('[الإجابة النموذجية') ? 'block mt-2 p-3 bg-emerald-100 text-emerald-800 rounded-xl text-xs whitespace-pre-wrap' : 'block'}>
                             {line}
                           </span>
                        ))}
                        {q.options && q.options.length > 0 && <div className="mt-2 ml-4">{q.options.map((opt, oIdx) => <span key={oIdx} className="inline-block ml-2 mb-1 px-3 py-1.5 rounded-lg bg-slate-200 text-xs text-slate-700">{opt}</span>)}</div>}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-emerald-50/50 p-6 sm:p-8 rounded-3xl border border-emerald-100">
                  <h3 className="text-xl font-black text-emerald-900 mb-6 flex items-center gap-2"><UserCheck className="text-emerald-600" /> تعيين الواجب وإرساله</h3>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold mb-2">إرسال إلى المعلم:</label>
                      <select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)} className="w-full border p-3 rounded-xl font-bold outline-none focus:border-emerald-500">
                        <option value="">-- اختر المعلم --</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">المادة الدراسية:</label>
                      <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} disabled={!selectedTeacher || subjectsLoading} className="w-full border p-3 rounded-xl font-bold outline-none focus:border-emerald-500 disabled:bg-slate-50 cursor-pointer">
                        <option value="">{subjectsLoading ? 'جاري التحميل...' : '-- اختر المادة --'}</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-3">الفصول (متعدد):</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-xl border max-h-[200px] overflow-y-auto">
                        {!selectedSubject ? <p className="col-span-2 text-center text-sm text-slate-400 font-bold">اختر المادة لتظهر الفصول</p> : sections.map(sec => (
                          <label key={sec.id} className="flex items-center gap-3 cursor-pointer">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedSections.includes(sec.id) ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'}`}>
                              {selectedSections.includes(sec.id) && <CheckCircle2 className="w-4 h-4 text-white" />}
                            </div>
                            <input type="checkbox" className="hidden" checked={selectedSections.includes(sec.id)} onChange={() => toggleSection(sec.id)} />
                            <span className="text-sm font-bold text-slate-700">{sec.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button onClick={saveToRealDatabase} disabled={isSavingDB || !selectedTeacher || !selectedSubject || selectedSections.length === 0} className="w-full mt-6 bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {isSavingDB ? <Loader2 className="animate-spin" /> : <Save />} تأكيد وحفظ الواجب للمعلم
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
