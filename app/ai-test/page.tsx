'use client';

import React, { useState, useEffect } from 'react';
import { UploadCloud, Loader2, FileText, CheckCircle2, AlertCircle, Sparkles, Image as ImageIcon, ChevronDown, ChevronUp, Copy, List, CheckSquare, AlignLeft, TerminalSquare, Key, Save, Database, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import { useSchoolFormData } from '@/hooks/useSchoolFormData';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase'; // 🚀 استيراد Supabase لجلب المعلمين الحقيقيين

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

interface Teacher {
  id: string;
  full_name: string;
}

export default function AITestSandbox() {
  const router = useRouter();
  const { user } = useAuth() as any;
  const { saveExam } = useExamsSystem();
  
  // 🚀 جلب المواد والفصول الحقيقية من المنصة
  const { data: formData, loading: formLoading } = useSchoolFormData();
  const subjects = formData?.subjects || [];
  const sections = formData?.sections || [];

  // 🚀 حالة لجلب المعلمين الحقيقيين
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(true);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractedExam | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  
  const [customApiKey, setCustomApiKey] = useState('');
  
  // 🚀 حالات الحفظ بنظام الإدارة الجديد (البيانات الحقيقية)
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [isSavingDB, setIsSavingDB] = useState(false);

  // 🚀 جلب المعلمين من قاعدة البيانات عند تحميل الصفحة
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name')
          .in('role', ['teacher', 'admin', 'management']) // جلب أي شخص يمكنه إدارة اختبار
          .order('full_name');

        if (error) throw error;
        setTeachers(data || []);
      } catch (err) {
        console.error("Error fetching teachers:", err);
      } finally {
        setTeachersLoading(false);
      }
    };

    fetchTeachers();
  }, []);

  const toggleSection = (sectionId: string) => {
    setSelectedSections(prev => 
      prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
    );
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
      throw new Error('يرجى إدخال مفتاح API الخاص بجوجل (Gemini API Key) في الحقل المخصص بالأعلى.');
    }

    const modelsToTry = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash', 'gemini-2.5-flash'];
    let lastErrorMsg = '';

    for (const model of modelsToTry) {
      let success = false;
      let data = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${finalApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          data = await response.json();
          
          if (!response.ok) {
            const errMsg = data.error?.message || 'خطأ غير معروف';
            const lowerErr = errMsg.toLowerCase();

            if (lowerErr.includes('not found') || lowerErr.includes('not supported') || lowerErr.includes('quota') || lowerErr.includes('limit')) {
              lastErrorMsg = errMsg;
              break; 
            }

            if (lowerErr.includes('high demand') || lowerErr.includes('overloaded') || response.status === 503 || response.status === 429) {
              lastErrorMsg = errMsg;
              if (attempt < 3) {
                console.warn(`ضغط عالٍ على نموذج ${model}، جاري إعادة المحاولة...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                continue; 
              } else {
                break; 
              }
            }

            throw new Error(errMsg);
          }
          
          success = true;
          break; 

        } catch (err: any) {
          const lowerErr = err.message.toLowerCase();
          if (lowerErr.includes('high demand') || lowerErr.includes('fetch error')) {
             if (attempt < 3) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                continue;
             }
          }
          lastErrorMsg = err.message;
          break; 
        }
      }

      if (success) return data; 
    }

    throw new Error(`عذراً، سيرفرات الذكاء الاصطناعي تشهد ضغطاً عالياً. (تفاصيل: ${lastErrorMsg})`);
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

      const aiResponse = await callGeminiWithSmartRetry(payload);
      
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

  // 🚀 الحفظ الفعلي في قاعدة البيانات بالاعتماد على البيانات الحقيقية
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
        teacher_id: selectedTeacher,   
        duration: 45, 
        max_attempts: 1,
        max_score: totalScore,
        exam_date: new Date().toISOString().split('T')[0],
        start_time: '08:00',
        end_time: '23:59',
        status: 'draft', // 🚀 يبقى مسودة ليقوم المعلم بمراجعته قبل نشره
        settings: {
          shuffle_questions: false,
          shuffle_options: false,
          show_results_immediately: true,
          allow_backtracking: true
        }
      };

      const formattedQuestions = result.questions.map((q) => ({
        id: crypto.randomUUID(), 
        content: q.content,
        type: q.type,
        points: q.points || 1,
        isRequired: true, 
        is_required: true,
        options: q.options?.map(opt => ({
          id: crypto.randomUUID(),
          content: opt.content,
          isCorrect: opt.is_correct,
          is_correct: opt.is_correct
        })) || []
      }));

      // إرسال الطلب الفعلي
      await saveExam(examPayload as any, formattedQuestions as any, true); 
      
      alert('تم إرسال الاختبار بنجاح إلى حساب المعلم كمسودة!');
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
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">إدارة التوليد الآلي (للمدراء)</h1>
          <p className="text-lg text-slate-500 font-bold max-w-2xl mx-auto leading-relaxed">
            بيئة إدارية خاصة تتيح للمدير تصوير أوراق العمل، توليدها كاختبار تفاعلي، وتعيينها لمعلم محدد وفصول متعددة (بيانات حقيقية).
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
          
          {/* قسم الرفع */}
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
                        <p className="text-lg font-bold text-slate-700">اضغط هنا لرفع ورقة الاختبار</p>
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
                  {loading ? <><Loader2 className="w-6 h-6 animate-spin" /> جاري المعالجة المركزية...</> : <><Sparkles className="w-6 h-6" /> توليد أسئلة الاختبار آلياً</>}
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

          {/* قسم النتائج والتوجيه */}
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 min-h-[500px] flex flex-col">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                  <FileText className="w-6 h-6 text-emerald-500" />
                  النتيجة والتوجيه
                </h2>
                {result && (
                  <div className="px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-sm border border-emerald-100">
                    تم الاستخراج!
                  </div>
                )}
              </div>

              {!result && !loading && (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-20 opacity-50">
                  <Sparkles className="w-16 h-16 text-slate-300 mb-4" />
                  <p className="text-xl font-bold text-slate-400">بانتظار تحليل ورقة الاختبار...</p>
                </div>
              )}

              {loading && (
                <div className="flex-1 flex flex-col items-center justify-center py-20">
                  <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                  <p className="text-lg font-bold text-indigo-600 animate-pulse">يتم الآن قراءة الورقة وتحليلها...</p>
                  <p className="text-sm font-medium text-slate-500 mt-2">يرجى الانتظار...</p>
                </div>
              )}

              {result && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1">
                  
                  {/* استعراض سريع للأسئلة */}
                  <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 max-h-[300px] overflow-y-auto">
                     <p className="text-xs font-black text-slate-500 mb-2">تم اكتشاف {result.questions.length} أسئلة:</p>
                     <ul className="list-disc list-inside space-y-1 text-sm font-bold text-slate-700 pr-2">
                        {result.questions.map((q, i) => (
                           <li key={i} className="truncate">{q.content}</li>
                        ))}
                     </ul>
                  </div>

                  {/* 🚀 قسم الإدارة: تعيين الاختبار للمعلم والفصول (بيانات حقيقية) */}
                  <div className="pt-4 border-t-2 border-indigo-100 mt-4">
                    <div className="bg-indigo-50/50 p-6 sm:p-8 rounded-3xl border border-indigo-100">
                      <h3 className="text-xl font-black text-indigo-900 mb-6 flex items-center gap-2">
                        <UserCheck className="w-6 h-6 text-indigo-600" /> تعيين الاختبار للمعلم والفصول
                      </h3>
                      
                      {formLoading || teachersLoading ? (
                        <div className="flex justify-center py-8">
                           <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        </div>
                      ) : (
                        <div className="space-y-5 mb-6 animate-in fade-in">
                          {/* اختيار المعلم (بيانات حقيقية) */}
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">تعيين لمعلم: <span className="text-red-500">*</span></label>
                            <select 
                              value={selectedTeacher} 
                              onChange={(e) => setSelectedTeacher(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500"
                            >
                              <option value="">-- اختر المعلم --</option>
                              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                            </select>
                          </div>

                          {/* اختيار المادة (بيانات حقيقية) */}
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">المادة الدراسية: <span className="text-red-500">*</span></label>
                            <select 
                              value={selectedSubject} 
                              onChange={(e) => setSelectedSubject(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500"
                            >
                              <option value="">-- اختر مادة --</option>
                              {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </div>

                          {/* اختيار فصول متعددة (بيانات حقيقية) */}
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-3">إرسال إلى الفصول: <span className="text-red-500">*</span></label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-slate-200 max-h-[250px] overflow-y-auto">
                              {sections.length > 0 ? sections.map((sec: any) => (
                                <label key={sec.id} className="flex items-center gap-3 cursor-pointer group">
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${selectedSections.includes(sec.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 group-hover:border-indigo-400'}`}>
                                    {selectedSections.includes(sec.id) && <CheckCircle2 className="w-4 h-4 text-white" />}
                                  </div>
                                  <input type="checkbox" className="hidden" checked={selectedSections.includes(sec.id)} onChange={() => toggleSection(sec.id)} />
                                  <span className={`text-sm font-bold ${selectedSections.includes(sec.id) ? 'text-indigo-900' : 'text-slate-600'}`}>{sec.name}</span>
                                </label>
                              )) : (
                                <p className="text-slate-400 text-sm font-bold col-span-2 text-center py-2">لا توجد فصول مضافة في النظام.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <button 
                        onClick={saveToRealDatabase} 
                        disabled={isSavingDB || !selectedTeacher || !selectedSubject || selectedSections.length === 0 || formLoading || teachersLoading}
                        className="w-full bg-indigo-600 text-white font-black text-lg py-4 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95"
                      >
                        {isSavingDB ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                        {isSavingDB ? 'جاري الإرسال...' : 'تأكيد الحفظ والإرسال للمعلم'}
                      </button>
                    </div>
                  </div>

                  {/* JSON كود للتقنيين فقط */}
                  <div className="pt-4 border-t border-slate-100">
                    <button onClick={() => setShowJson(!showJson)} className="flex items-center justify-between w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all text-sm">
                      <span className="flex items-center gap-2"><TerminalSquare className="w-4 h-4" /> عرض البيانات الخام (JSON)</span>
                      {showJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {showJson && (
                      <div className="mt-2 relative group">
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
