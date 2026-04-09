'use client';

import React, { useState } from 'react';
import { UploadCloud, Loader2, FileText, CheckCircle2, AlertCircle, Sparkles, Image as ImageIcon, ChevronDown, ChevronUp, Copy, List, CheckSquare, AlignLeft, TerminalSquare, Key, Save, Database } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import { useSchoolFormData } from '@/hooks/useSchoolFormData';
import { useAuth } from '@/context/auth-context';

interface ExtractedQuestion {
  content: string;
  type: 'multiple_choice' | 'true_false' | 'essay';
  points: number;
  options?: { content: string; is_correct: boolean }[];
}

interface ExtractedExam {
  title: string;
  questions: ExtractedQuestion[];
}

export default function AITestSandbox() {
  const router = useRouter();
  const { user } = useAuth() as any;
  const { saveExam } = useExamsSystem();
  const { data: formData } = useSchoolFormData();
  
  const subjects = formData?.subjects || [];
  const sections = formData?.sections || [];

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractedExam | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  
  const [customApiKey, setCustomApiKey] = useState('');
  
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [isSavingDB, setIsSavingDB] = useState(false);

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

  const callGeminiWithFallback = async (payload: any) => {
    let finalApiKey = customApiKey.trim();
    if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
       finalApiKey = finalApiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    }
    
    if (!finalApiKey) {
      throw new Error('يرجى إدخال مفتاح API الخاص بجوجل (Gemini API Key) في الحقل المخصص بالأعلى.');
    }

    // ترتيب النماذج لضمان تخطي أي نموذج غير متاح أو حصته صفر
    const modelsToTry = [
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-2.0-flash',
      'gemini-2.5-flash'
    ];

    let lastErrorMsg = '';

    for (const model of modelsToTry) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${finalApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          const errMsg = data.error?.message || '';
          const shouldSkip = 
            errMsg.toLowerCase().includes('not found') || 
            errMsg.toLowerCase().includes('not supported') ||
            errMsg.toLowerCase().includes('quota') ||
            errMsg.toLowerCase().includes('limit') ||
            response.status === 429;

          if (shouldSkip) {
            lastErrorMsg = errMsg;
            continue; 
          }
          throw new Error(errMsg || 'فشل الاتصال بالذكاء الاصطناعي');
        }
        return data; 
      } catch (err: any) {
        const errMsg = err.message.toLowerCase();
        if (errMsg.includes('not found') || errMsg.includes('not supported') || errMsg.includes('quota') || errMsg.includes('limit')) {
          lastErrorMsg = err.message;
          continue;
        }
        throw err;
      }
    }

    throw new Error(`تعذر الوصول إلى أي نموذج متاح. تأكد من حصة API الخاصة بك. آخر خطأ: ${lastErrorMsg}`);
  };

  const analyzeImage = async () => {
    if (!imageFile) return;
    setLoading(true);
    setError(null);

    try {
      const base64Data = await fileToBase64(imageFile);

      const payload = {
        contents: [{
          role: "user",
          parts: [
            { text: "أنت خبير تعليمي. قم بقراءة ورقة الاختبار المرفقة في هذه الصورة بدقة شديدة. استخرج عنوان الاختبار إن وجد، واستخرج جميع الأسئلة. لكل سؤال حدد نوعه (multiple_choice, true_false, essay)، واستخرج الدرجة (points) المخصصة له إن وجدت (ضع 1 كافتراضي إن لم تجد). واستخرج خيارات الإجابة إن كان السؤال اختيارياً أو صح وخطأ. أرجع النتيجة بتنسيق JSON حصرياً ومطابقاً للـ schema المطلوبة." },
            { inlineData: { mimeType: imageFile.type, data: base64Data } }
          ]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              questions: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    content: { type: "STRING" },
                    type: { type: "STRING", description: "يجب أن يكون حصراً: multiple_choice أو true_false أو essay" },
                    points: { type: "NUMBER" },
                    options: {
                      type: "ARRAY",
                      items: {
                        type: "OBJECT",
                        properties: {
                          content: { type: "STRING" },
                          is_correct: { type: "BOOLEAN" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const aiResponse = await callGeminiWithFallback(payload);
      
      if (aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const jsonText = aiResponse.candidates[0].content.parts[0].text;
        const parsedData = JSON.parse(jsonText);
        setResult(parsedData);
      } else {
        throw new Error('لم يتم استرجاع بيانات صحيحة من النموذج');
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ غير متوقع أثناء معالجة الصورة.');
    } finally {
      setLoading(false);
    }
  };

  const saveToRealDatabase = async () => {
    if (!result) return;
    if (!selectedSubject) {
      alert('يرجى اختيار المادة الدراسية أولاً.');
      return;
    }

    setIsSavingDB(true);
    try {
      const totalScore = result.questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);
      
      const examPayload = {
        title: result.title || 'اختبار مولد بالذكاء الاصطناعي',
        description: 'تم توليد هذا الاختبار آلياً باستخدام الذكاء الاصطناعي من صورة ورقة عمل.',
        subject_id: selectedSubject,
        section_ids: selectedSection ? [selectedSection] : [],
        teacher_id: user?.id,
        duration: 45, 
        max_attempts: 1,
        max_score: totalScore,
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
      };

      // إصلاح: مطابقة هيكل البيانات المطلوب من دالة saveExam
      const formattedQuestions = result.questions.map((q) => ({
        id: crypto.randomUUID(), 
        content: q.content,
        type: q.type,
        points: q.points || 1,
        isRequired: true, // الحقل المطلوب في نظامك
        is_required: true,
        options: q.options?.map(opt => ({
          id: crypto.randomUUID(),
          content: opt.content,
          isCorrect: opt.is_correct, // الحقل المطلوب في نظامك
          is_correct: opt.is_correct
        })) || []
      }));

      // إرسال الطلب الفعلي لقاعدة بيانات Supabase
      await saveExam(examPayload as any, formattedQuestions as any, true); 
      
      router.push('/exams'); 

    } catch (error: any) {
      console.error(error);
      alert('حدث خطأ أثناء الحفظ في قاعدة البيانات: ' + error.message);
    } finally {
      setIsSavingDB(false);
    }
  };

  const getQuestionIcon = (type: string) => {
    switch (type) {
      case 'multiple_choice': return <List className="w-5 h-5 text-indigo-500" />;
      case 'true_false': return <CheckSquare className="w-5 h-5 text-emerald-500" />;
      default: return <AlignLeft className="w-5 h-5 text-amber-500" />;
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'multiple_choice': return 'اختيار من متعدد';
      case 'true_false': return 'صح أو خطأ';
      case 'essay': return 'سؤال مقالي';
      default: return 'سؤال';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-8 font-sans" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-100 text-indigo-600 rounded-[2rem] shadow-sm mb-2">
            <Sparkles className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">مختبر الذكاء الاصطناعي</h1>
          <p className="text-lg text-slate-500 font-bold max-w-2xl mx-auto leading-relaxed">
            بيئة ذكية لاستخراج الأسئلة من أوراق العمل والاختبارات المصورة وتحويلها إلى شكل تفاعلي آلياً.
          </p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-indigo-100 flex flex-col sm:flex-row gap-4 items-center max-w-3xl mx-auto">
          <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Key className="w-6 h-6 text-amber-500" />
          </div>
          <div className="flex-1 w-full">
            <input 
              type="password" 
              placeholder="الصق مفتاح Google Gemini API هنا..." 
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
                صورة الاختبار
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
                        <p className="text-lg font-bold text-slate-700">اضغط هنا لرفع صورة الاختبار</p>
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
                  {loading ? <><Loader2 className="w-6 h-6 animate-spin" /> جاري التحليل السحري...</> : <><Sparkles className="w-6 h-6" /> استخراج الأسئلة بالذكاء الاصطناعي</>}
                </button>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 text-red-700 border border-red-100 rounded-2xl font-bold flex items-center gap-3 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 min-h-[500px] flex flex-col">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                  <FileText className="w-6 h-6 text-emerald-500" />
                  النتيجة المستخرجة
                </h2>
                {result && (
                  <div className="px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-sm border border-emerald-100">
                    تم بنجاح!
                  </div>
                )}
              </div>

              {!result && !loading && (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-20 opacity-50">
                  <Sparkles className="w-16 h-16 text-slate-300 mb-4" />
                  <p className="text-xl font-bold text-slate-400">ستظهر الأسئلة هنا بعد التحليل</p>
                </div>
              )}

              {loading && (
                <div className="flex-1 flex flex-col items-center justify-center py-20">
                  <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                  <p className="text-lg font-bold text-indigo-600 animate-pulse">يتم الآن قراءة الورقة وتحليلها...</p>
                  <p className="text-sm font-medium text-slate-500 mt-2">قد يستغرق الأمر بضع ثوانٍ</p>
                </div>
              )}

              {result && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1">
                  
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">عنوان الاختبار المكتشف</p>
                    <h3 className="text-2xl font-black text-indigo-900">{result.title || 'بدون عنوان'}</h3>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">الأسئلة ({result.questions?.length || 0})</p>
                    
                    {result.questions?.map((q, idx) => (
                      <div key={idx} className="p-6 rounded-3xl border border-slate-200 bg-white hover:shadow-md hover:border-indigo-200 transition-all">
                        <div className="flex gap-4">
                          <div className="shrink-0 w-10 h-10 rounded-xl bg-slate-100 text-slate-600 font-black flex items-center justify-center">{idx + 1}</div>
                          <div className="flex-1 space-y-4">
                            <h4 className="text-lg font-bold text-slate-800 leading-relaxed">{q.content}</h4>
                            
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-xs font-black border border-slate-200">
                                {getQuestionIcon(q.type)} {getQuestionTypeLabel(q.type)}
                              </span>
                              <span className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-black border border-indigo-100">
                                {q.points || 1} نقاط
                              </span>
                            </div>

                            {q.options && q.options.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-4 border-t border-slate-50">
                                {q.options.map((opt, oIdx) => (
                                  <div key={oIdx} className={`p-3 rounded-xl border text-sm font-bold flex items-center gap-3 ${opt.is_correct ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200 text-slate-600'}`}>
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${opt.is_correct ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                                      {opt.is_correct && <CheckCircle2 className="w-3 h-3 text-white" />}
                                    </div>
                                    {opt.content}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-8 border-t-2 border-indigo-100 mt-8">
                    <div className="bg-indigo-50/50 p-8 rounded-3xl border border-indigo-100">
                      <h3 className="text-xl font-black text-indigo-900 mb-6 flex items-center gap-2">
                        <Database className="w-6 h-6 text-indigo-600" /> حفظ النتيجة كاختبار حقيقي!
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">اختر المادة <span className="text-red-500">*</span></label>
                          <select 
                            value={selectedSubject} 
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500"
                          >
                            <option value="">-- اختر مادة --</option>
                            {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">الفصل (اختياري)</label>
                          <select 
                            value={selectedSection} 
                            onChange={(e) => setSelectedSection(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500"
                          >
                            <option value="">-- للجميع --</option>
                            {sections.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                      </div>
                      
                      <button 
                        onClick={saveToRealDatabase} 
                        disabled={isSavingDB || !selectedSubject}
                        className="w-full bg-indigo-600 text-white font-black text-lg py-4 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95"
                      >
                        {isSavingDB ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                        {isSavingDB ? 'جاري إنشاء الاختبار...' : 'إنشاء الاختبار في المنصة (كمسودة)'}
                      </button>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100">
                    <button onClick={() => setShowJson(!showJson)} className="flex items-center justify-between w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 hover:bg-slate-100 transition-all">
                      <span className="flex items-center gap-2"><TerminalSquare className="w-5 h-5" /> عرض كود الـ JSON الناتج</span>
                      {showJson ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                    {showJson && (
                      <div className="mt-4 relative group">
                        <button 
                          onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
                          className="absolute top-4 left-4 p-2 bg-slate-700 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          title="نسخ"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <pre className="bg-slate-800 text-emerald-400 p-6 rounded-2xl overflow-x-auto text-sm font-mono whitespace-pre-wrap text-left" dir="ltr">
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
