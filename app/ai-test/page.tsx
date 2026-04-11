'use client';

import React, { useState, useEffect } from 'react';
import { UploadCloud, Loader2, FileText, CheckCircle2, AlertCircle, Sparkles, Image as ImageIcon, ChevronDown, ChevronUp, Copy, List, CheckSquare, AlignLeft, TerminalSquare, Key, Save, UserCheck, FileJson, ClipboardPaste } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import { createClient } from '@supabase/supabase-js';

// 🚀 تهيئة الاتصال بقاعدة البيانات بشكل مباشر لعمليات القراءة (الفلترة)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface ExtractedQuestion {
  content: string;
  type: 'multiple_choice' | 'true_false' | 'essay' | 'file';
  points: number;
  options?: { content: string; is_correct: boolean }[];
}

interface ExtractedExam {
  title: string;
  questions: ExtractedQuestion[];
}

interface Teacher {
  id: string;
  full_name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Section {
  id: string;
  name: string;
}

export default function AITestSandbox() {
  const router = useRouter();
  const { saveExam } = useExamsSystem();
  
  // حالات البيانات الحقيقية والفلترة التراتبية
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractedExam | null>(null);
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
    const fetchTeachers = async () => {
      try {
        const { data, error } = await supabase
          .from('teachers')
          .select(`id, users ( full_name )`);

        if (error) throw error;
        
        const formattedTeachers = data?.map((t: any) => ({
          id: t.id,
          full_name: t.users?.full_name || 'معلم بدون اسم' 
        })) || [];

        formattedTeachers.sort((a, b) => a.full_name.localeCompare(b.full_name));
        setTeachers(formattedTeachers);
      } catch (err) {
        console.error("Error fetching teachers:", err);
      } finally {
        setTeachersLoading(false);
      }
    };
    fetchTeachers();
  }, []);

  useEffect(() => {
    const fetchTeacherSubjects = async () => {
      if (!selectedTeacher) {
        setSubjects([]);
        setSelectedSubject('');
        return;
      }
      
      setSubjectsLoading(true);
      try {
        const { data, error } = await supabase
          .from('teacher_sections')
          .select(`
            subject_id,
            subjects ( id, name )
          `)
          .eq('teacher_id', selectedTeacher);

        if (error) throw error;
        
        const extracted = data?.map((item: any) => item.subjects).filter(Boolean) || [];
        const uniqueSubjects = Array.from(new Map(extracted.map((item: any) => [item.id, item])).values());
        
        setSubjects(uniqueSubjects as Subject[]);
        setSelectedSubject(''); 
        
      } catch (err) {
        console.error("Error fetching subjects:", err);
      } finally {
        setSubjectsLoading(false);
      }
    };
    fetchTeacherSubjects();
  }, [selectedTeacher]);

  useEffect(() => {
    const fetchTeacherSections = async () => {
      if (!selectedTeacher || !selectedSubject) {
        setSections([]);
        setSelectedSections([]);
        return;
      }
      
      setSectionsLoading(true);
      try {
        const { data, error } = await supabase
          .from('teacher_sections')
          .select(`section_id, sections ( id, name )`)
          .eq('teacher_id', selectedTeacher)
          .eq('subject_id', selectedSubject); 

        if (error) throw error;
        
        const extracted = data?.map((item: any) => item.sections).filter(Boolean) || [];
        const uniqueSections = Array.from(new Map(extracted.map((item: any) => [item.id, item])).values());

        setSections(uniqueSections as Section[]);
        setSelectedSections([]); 
        
      } catch (err) {
        console.error("Error fetching sections:", err);
      } finally {
        setSectionsLoading(false);
      }
    };
    fetchTeacherSections();
  }, [selectedTeacher, selectedSubject]);

  const toggleSection = (sectionId: string) => {
    setSelectedSections(prev => 
      prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
    );
  };

  // 🚀 تحديث البرومبت لدعم الرياضيات وأنواع الأسئلة المرفقة
  const promptText = `أنت خبير تعليمي. قم بقراءة ورقة الاختبار المرفقة في هذه الصورة بدقة. استخرج العنوان والأسئلة.
يجب أن يكون الناتج بتنسيق JSON حصرياً وصالحاً (Valid JSON) بالهيكل التالي بالضبط:
{
  "title": "عنوان الاختبار هنا",
  "questions": [
    {
      "content": "نص السؤال هنا",
      "type": "multiple_choice",
      "points": 1,
      "options": [
        { "content": "نص الخيار الأول", "is_correct": false },
        { "content": "نص الخيار الثاني", "is_correct": true }
      ]
    }
  ]
}
ملاحظة هامة جداً للعلوم والرياضيات:
- إذا كان السؤال أو خياراته تحتوي على معادلات رياضية، فيزيائية، أرقام، أو وحدات قياس، **يجب** كتابتها بصيغة LaTeX محاطة بعلامتي $ (مثال: $x^2 + y^2 = z^2$ أو $100^\\circ \\text{C}$).
ملاحظات عامة:
- استخدم المفتاح "content" لنص السؤال (ليس question_text).
- أنواع الأسئلة المسموحة فقط: multiple_choice أو true_false أو essay أو file (لأسئلة الرسم أو المرفقات).
- للأسئلة المقالية أو التي تتطلب رسم، اترك مصفوفة options فارغة [].
- لا تكتب أي نص إضافي أو شروحات خارج كود الـ JSON.`;

  const copyPrompt = () => {
    navigator.clipboard.writeText(promptText);
    alert('تم نسخ أمر التوليد بنجاح! يمكنك الآن لصقه في ChatGPT أو Claude مع صورة الاختبار.');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
      setResult(null);
      setError(null);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const callGeminiWithSmartRetry = async (payload: any) => {
    let finalApiKey = customApiKey.trim();
    if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
       finalApiKey = finalApiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    }
    
    if (!finalApiKey) {
      throw new Error('يرجى إدخال مفتاح API الخاص بجوجل في الحقل المخصص بالأعلى، أو استخدم الإدخال اليدوي للطوارئ بالأسفل.');
    }

    const modelsToTry = ['gemini-1.5-flash-8b', 'gemini-1.5-flash', 'gemini-2.0-flash'];
    const delays = [2000, 4000, 8000]; 

    for (const model of modelsToTry) {
      let success = false;
      let data = null;

      for (let attempt = 0; attempt < delays.length; attempt++) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${finalApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          data = await response.json();
          
          if (!response.ok) {
            const errMsg = data.error?.message || 'خطأ غير معروف';
            if (response.status === 429 || errMsg.toLowerCase().includes('quota')) throw new Error('QUOTA_EXCEEDED');
            if (response.status === 503 || errMsg.toLowerCase().includes('overloaded')) {
              if (attempt < delays.length - 1) {
                await new Promise(resolve => setTimeout(resolve, delays[attempt]));
                continue; 
              } else break;
            }
            throw new Error(errMsg);
          }
          
          success = true;
          break; 
        } catch (err: any) {
          if (err.message === 'QUOTA_EXCEEDED') throw new Error('تم استنفاد الحد المجاني للطلبات. يرجى الانتظار قليلاً أو استخدام (الإدخال اليدوي للطوارئ) بالأسفل.');
          if (attempt < delays.length - 1) {
             await new Promise(resolve => setTimeout(resolve, delays[attempt]));
             continue;
          }
          break; 
        }
      }
      if (success) return data; 
    }
    throw new Error(`سيرفرات جوجل تشهد ضغطاً شديداً حالياً. يرجى استخدام قسم (الإدخال اليدوي للطوارئ) بالأسفل لضمان عدم توقف عملك.`);
  };

  const analyzeImage = async () => {
    if (!imageFile) return;
    setLoading(true);
    setError(null);
    setResult(null); 

    try {
      const base64Data = await fileToBase64(imageFile);
      const payload = {
        contents: [{
          role: "user",
          parts: [
            { text: promptText },
            { inlineData: { mimeType: imageFile.type, data: base64Data } }
          ]
        }],
        generationConfig: { responseMimeType: "application/json" }
      };

      const aiResponse = await callGeminiWithSmartRetry(payload);
      
      if (aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text) {
        setResult(JSON.parse(aiResponse.candidates[0].content.parts[0].text)); 
      } else {
        throw new Error('لم يتم استرجاع بيانات صحيحة من النموذج');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع أثناء الاتصال بالذكاء الاصطناعي.');
    } finally {
      setLoading(false);
    }
  };

  const processManualJson = () => {
    if (!manualJson.trim()) {
      setManualJsonError('يرجى لصق الكود أولاً.');
      return;
    }
    
    setManualJsonError(null);
    try {
      let cleanedJson = manualJson.trim();
      if (cleanedJson.startsWith('```json')) cleanedJson = cleanedJson.replace('```json', '');
      if (cleanedJson.startsWith('```')) cleanedJson = cleanedJson.replace('```', '');
      if (cleanedJson.endsWith('```')) cleanedJson = cleanedJson.slice(0, -3);

      const parsedData = JSON.parse(cleanedJson.trim());
      
      if (!parsedData.questions || !Array.isArray(parsedData.questions)) {
        throw new Error('الكود المدخل لا يحتوي على مصفوفة أسئلة صالحة.');
      }
      
      const normalizedQuestions: ExtractedQuestion[] = parsedData.questions.map((q: any) => {
        const content = q.content || q.question_text || q.text || q.question || 'سؤال بدون نص';
        let normalizedOptions = [];
        
        if (Array.isArray(q.options)) {
          normalizedOptions = q.options.map((opt: any) => {
            if (typeof opt === 'string') return { content: opt, is_correct: false };
            return {
              content: opt.content || opt.text || opt.option || String(opt),
              is_correct: !!(opt.is_correct || opt.isCorrect || opt.correct || false)
            };
          });
        }

        return {
          content,
          type: q.type || 'essay', 
          points: Number(q.points) || 1,
          options: normalizedOptions
        };
      });

      setResult({
        title: parsedData.title || 'اختبار بدون عنوان',
        questions: normalizedQuestions
      });
      
      setManualJson(''); 
      alert('تمت معالجة الكود بنجاح وتصحيح الأخطاء فيه! يمكنك الآن مراجعة الأسئلة وتعيينها.');
      
    } catch (err: any) {
      setManualJsonError('تعذرت المعالجة، تأكد من نسخ الكود كاملاً. (الخطأ: ' + err.message + ')');
    }
  };

  const saveToRealDatabase = async () => {
    if (!result) return;
    if (!selectedTeacher) { alert('يرجى تحديد المعلم صاحب الاختبار.'); return; }
    if (!selectedSubject) { alert('يرجى اختيار المادة الدراسية.'); return; }
    if (selectedSections.length === 0) { alert('يرجى تحديد صف واحد على الأقل لإرسال الاختبار إليه.'); return; }

    setIsSavingDB(true);
    try {
      const totalScore = result.questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);
      
      const examPayload = {
        title: result.title || 'اختبار مولد بالذكاء الاصطناعي',
        description: 'تم توليد هذا الاختبار آلياً باستخدام الذكاء الاصطناعي بواسطة إدارة المنصة.',
        subject_id: selectedSubject,
        section_ids: selectedSections, 
        exam_date: new Date().toISOString().split('T')[0],
        max_score: totalScore,
        total_points: totalScore,
        total_marks: totalScore,
        status: 'draft', 
        max_attempts: 1,
        // 🚀 تحديث الإعدادات لمنع الغش والنسخ
        settings: {
          shuffle_questions: false,
          shuffle_options: false,
          show_results_immediately: true,
          allow_backtracking: true,
          prevent_tab_switch: false, // افتراضياً مغلق لعدم إزعاج الطلاب ما لم يفعله المعلم يدوياً
          prevent_copy: true         // مفعل افتراضياً
        }
      };

      // 🚀 تجهيز الأسئلة بالصيغة الصحيحة 100% للـ API
      const formattedQuestions = result.questions.map((q, i) => ({
        id: crypto.randomUUID(), 
        content: q.content,
        type: q.type,
        points: q.points || 1,
        is_required: true,
        order_index: i + 1,
        options: q.options?.map((opt, oIdx) => ({
          id: crypto.randomUUID(),
          content: opt.content,
          is_correct: Boolean(opt.is_correct),
          order_index: oIdx + 1
        })) || []
      }));

      const response = await fetch('/api/exams/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          examData: examPayload, 
          questions: formattedQuestions, 
          isNew: true, 
          userId: selectedTeacher 
        }),
      });

      const responseData = await response.json();

      if (!response.ok) throw new Error(responseData.error || 'فشل الاتصال بالسيرفر لحفظ الاختبار');
      
      alert('تم إرسال الاختبار بنجاح إلى حساب المعلم كمسودة!');
      router.push('/exams'); 

    } catch (error: any) {
      console.error(error);
      alert('حدث خطأ أثناء الحفظ في قاعدة البيانات: ' + error.message);
    } finally {
      setIsSavingDB(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-8 font-sans" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-100 text-indigo-600 rounded-[2rem] shadow-sm mb-2">
            <Sparkles className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">إدارة التوليد الآلي (للمدراء)</h1>
          <p className="text-lg text-slate-500 font-bold max-w-2xl mx-auto leading-relaxed">
            قم بتصوير ورقة العمل، وسنقوم بتحويلها لاختبار تفاعلي وإرساله لمعلميك بضغطة زر.
          </p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-indigo-100 flex flex-col sm:flex-row gap-4 items-center max-w-3xl mx-auto">
          <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Key className="w-6 h-6 text-amber-500" />
          </div>
          <div className="flex-1 w-full">
            <input 
              type="password" 
              placeholder="مفتاح التوليد التلقائي (Google Gemini API)..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-left"
              dir="ltr"
              value={customApiKey}
              onChange={(e) => setCustomApiKey(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="space-y-6">
            
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
              <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
                <ImageIcon className="w-6 h-6 text-indigo-500" />
                الخيار الأول: التوليد التلقائي
              </h2>

              <label className="block w-full cursor-pointer relative">
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                <div className={`w-full border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center gap-4 transition-all ${imagePreview ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-indigo-400'}`}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="معاينة" className="max-h-80 w-auto rounded-2xl shadow-sm object-contain" />
                  ) : (
                    <>
                      <div className="p-4 bg-white rounded-full shadow-sm"><UploadCloud className="w-10 h-10 text-indigo-400" /></div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-slate-700">اضغط لرفع ورقة الاختبار</p>
                        <p className="text-sm font-medium text-slate-500 mt-1">يدعم JPG, PNG, WEBP</p>
                      </div>
                    </>
                  )}
                </div>
              </label>

              {imageFile && (
                <button 
                  onClick={analyzeImage} 
                  disabled={loading}
                  className="w-full mt-6 bg-indigo-600 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95"
                >
                  {loading ? <><Loader2 className="w-6 h-6 animate-spin" /> جاري المعالجة...</> : <><Sparkles className="w-6 h-6" /> توليد آلياً من الصورة</>}
                </button>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 text-red-700 border border-red-100 rounded-2xl font-bold flex items-center gap-3 text-sm leading-relaxed">
                  <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
            </div>

            <div className="bg-slate-800 p-8 rounded-[2.5rem] shadow-xl border border-slate-700 text-white">
              <h2 className="text-xl font-black mb-4 flex items-center gap-3 text-emerald-400">
                <FileJson className="w-6 h-6" />
                الخيار الثاني: الإدخال اليدوي للطوارئ
              </h2>
              <p className="text-sm text-slate-400 font-bold mb-6 leading-relaxed">
                إذا تعطل التوليد التلقائي، انسخ البرومبت أدناه، ضعه في ChatGPT مع صورة الاختبار، ثم الصق كود الـ JSON الناتج هنا.
              </p>
              
              <button 
                onClick={copyPrompt}
                className="w-full mb-6 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl border border-slate-600 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Copy className="w-5 h-5 text-slate-300" /> انسخ أمر التوليد (البرومبت) من هنا
              </button>

              <textarea 
                value={manualJson}
                onChange={(e) => setManualJson(e.target.value)}
                placeholder="الصق كود الـ JSON الذي تم توليده من النظام الخارجي هنا..."
                className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 font-mono text-sm text-emerald-300 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                dir="ltr"
              ></textarea>

              {manualJsonError && (
                <div className="mt-3 p-3 bg-red-900/50 text-red-300 border border-red-800 rounded-xl font-bold flex items-center gap-2 text-xs leading-relaxed">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{manualJsonError}</p>
                </div>
              )}

              <button 
                onClick={processManualJson}
                className="w-full mt-4 bg-emerald-600 text-white font-black py-3.5 rounded-xl hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <ClipboardPaste className="w-5 h-5" /> معالجة الكود المدخل وإكمال العملية
              </button>
            </div>

          </div>

          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 min-h-[500px] flex flex-col">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                  <FileText className="w-6 h-6 text-indigo-500" />
                  النتيجة والتعيين
                </h2>
                {result && (
                  <div className="px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-sm border border-emerald-100">
                    جاهز للإرسال!
                  </div>
                )}
              </div>

              {!result && !loading && (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-20 opacity-50">
                  <FileText className="w-16 h-16 text-slate-300 mb-4" />
                  <p className="text-xl font-bold text-slate-400">ستظهر الأسئلة وإعدادات الإرسال هنا بعد المعالجة.</p>
                </div>
              )}

              {loading && (
                <div className="flex-1 flex flex-col items-center justify-center py-20">
                  <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                  <p className="text-lg font-bold text-indigo-600 animate-pulse">الذكاء الاصطناعي يقرأ الورقة الآن...</p>
                  <p className="text-sm font-medium text-slate-500 mt-2">يقوم بفرز الأسئلة والخيارات والدرجات...</p>
                </div>
              )}

              {result && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1">
                  
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 max-h-[350px] overflow-y-auto">
                     <p className="text-sm font-black text-slate-600 mb-3 flex items-center gap-2">
                       <CheckCircle2 className="w-5 h-5 text-emerald-500" /> تم اكتشاف واستخراج {result.questions.length} أسئلة بنجاح:
                     </p>
                     <ul className="list-disc list-inside space-y-3 text-sm font-bold text-slate-700 pr-2">
                        {result.questions.map((q, i) => (
                           <li key={i} className="border-b border-slate-100 pb-3 last:border-0 leading-relaxed">
                              {q.content}
                              {q.options && q.options.length > 0 && (
                                <div className="mt-2 text-xs text-slate-500 font-medium mr-4">
                                  {q.options.map((opt, oIdx) => (
                                    <span key={oIdx} className={`inline-block ml-3 mb-1 px-2 py-1 rounded ${opt.is_correct ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>
                                      {opt.content} {opt.is_correct && '✓'}
                                    </span>
                                  ))}
                                </div>
                              )}
                           </li>
                        ))}
                     </ul>
                  </div>

                  <div className="pt-2">
                    <div className="bg-indigo-50/50 p-6 sm:p-8 rounded-3xl border border-indigo-100 shadow-inner">
                      <h3 className="text-xl font-black text-indigo-900 mb-6 flex items-center gap-2">
                        <UserCheck className="w-6 h-6 text-indigo-600" /> تعيين الاختبار وإرساله
                      </h3>
                      
                      {teachersLoading ? (
                        <div className="flex justify-center py-8">
                           <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                           <span className="mr-3 text-indigo-600 font-bold">جاري جلب المعلمين...</span>
                        </div>
                      ) : (
                        <div className="space-y-5 mb-6 animate-in fade-in">
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">إرسال إلى حساب المعلم: <span className="text-red-500">*</span></label>
                            <select 
                              value={selectedTeacher} 
                              onChange={(e) => setSelectedTeacher(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500"
                            >
                              <option value="">-- اختر المعلم --</option>
                              {teachers.map((t: any) => (
                                <option key={t.id} value={t.id}>
                                  {t.full_name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">تحديد المادة الدراسية: <span className="text-red-500">*</span></label>
                            <select 
                              value={selectedSubject} 
                              onChange={(e) => setSelectedSubject(e.target.value)}
                              disabled={!selectedTeacher || subjectsLoading}
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed"
                            >
                              <option value="">
                                {!selectedTeacher ? '-- اختر المعلم أولاً --' : (subjectsLoading ? 'جاري جلب المواد...' : '-- اختر المادة --')}
                              </option>
                              {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-3">تحديد فصول الاختبار (متعدد): <span className="text-red-500">*</span></label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-slate-200 max-h-[200px] overflow-y-auto shadow-sm">
                              {!selectedSubject ? (
                                <p className="text-slate-400 text-sm font-bold col-span-2 text-center py-2">يرجى اختيار المادة أولاً لتظهر الفصول.</p>
                              ) : sectionsLoading ? (
                                <div className="col-span-2 flex justify-center py-2"><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /></div>
                              ) : sections.length > 0 ? (
                                sections.map((sec: any) => (
                                  <label key={sec.id} className="flex items-center gap-3 cursor-pointer group p-1 hover:bg-slate-50 rounded-lg transition-colors">
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${selectedSections.includes(sec.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 group-hover:border-indigo-400'}`}>
                                      {selectedSections.includes(sec.id) && <CheckCircle2 className="w-4 h-4 text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={selectedSections.includes(sec.id)} onChange={() => toggleSection(sec.id)} />
                                    <span className={`text-sm font-bold ${selectedSections.includes(sec.id) ? 'text-indigo-900' : 'text-slate-600'}`}>{sec.name}</span>
                                  </label>
                                ))
                              ) : (
                                <p className="text-slate-400 text-sm font-bold col-span-2 text-center py-2">لا توجد فصول مرتبطة بهذا المعلم في هذه المادة.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <button 
                        onClick={saveToRealDatabase} 
                        disabled={isSavingDB || !selectedTeacher || !selectedSubject || selectedSections.length === 0}
                        className="w-full bg-indigo-600 text-white font-black text-lg py-4 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95"
                      >
                        {isSavingDB ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                        {isSavingDB ? 'جاري الحفظ في المنصة...' : 'تأكيد وحفظ الاختبار وإرساله للمعلم'}
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <button onClick={() => setShowJson(!showJson)} className="flex items-center justify-between w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-400 hover:bg-slate-100 transition-all text-xs">
                      <span className="flex items-center gap-2"><TerminalSquare className="w-4 h-4" /> (للمطورين) عرض الكود الخام JSON المستخرج</span>
                      {showJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {showJson && (
                      <div className="mt-2 relative group">
                        <button 
                          onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
                          className="absolute top-4 left-4 p-2 bg-slate-700 text-white rounded-lg opacity-0 hover:opacity-100 transition-opacity"
                          title="نسخ الكود"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <pre className="bg-slate-800 text-emerald-400 p-4 rounded-xl overflow-x-auto text-xs font-mono whitespace-pre-wrap text-left" dir="ltr">
                          {JSON.stringify(result, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
