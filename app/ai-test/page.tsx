'use client';

import React, { useState, useEffect } from 'react';
import { UploadCloud, Loader2, FileText, CheckCircle2, AlertCircle, Sparkles, Image as ImageIcon, ChevronDown, ChevronUp, Copy, List, CheckSquare, AlignLeft, TerminalSquare, Key, Save, UserCheck, FileJson, ClipboardPaste } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import { createClient } from '@supabase/supabase-js';

// 🚀 تهيئة الاتصال بقاعدة البيانات
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

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
  
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [sectionsLoading, setSectionsLoading] = useState(true);

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

  // 1. 🚀 جلب جميع المعلمين
  useEffect(() => {
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
      } catch (err) {
        console.error("Error fetching teachers:", err);
      } finally {
        setTeachersLoading(false);
      }
    };
    fetchTeachers();
  }, []);

  // 2. 🚀 جلب جميع المواد بحرية (صلاحيات المدير)
  useEffect(() => {
    const fetchAllSubjects = async () => {
      try {
        const { data, error } = await supabase.from('subjects').select('id, name');
        if (error) throw error;
        setSubjects(data as Subject[] || []);
      } catch (err) {
        console.error("Error fetching subjects:", err);
      } finally {
        setSubjectsLoading(false);
      }
    };
    fetchAllSubjects();
  }, []);

  // 3. 🚀 جلب جميع الفصول بحرية (صلاحيات المدير)
  useEffect(() => {
    const fetchAllSections = async () => {
      try {
        const { data, error } = await supabase.from('sections').select('id, name');
        if (error) throw error;
        setSections(data as Section[] || []);
      } catch (err) {
        console.error("Error fetching sections:", err);
      } finally {
        setSectionsLoading(false);
      }
    };
    fetchAllSections();
  }, []);

  const toggleSection = (sectionId: string) => {
    setSelectedSections(prev => 
      prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
    );
  };

  const analyzeImage = async () => {
    if (!imageFile) return;
    setLoading(true);
    setError(null);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
      });

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
ملاحظة هامة:
- استخدم المفتاح "content" لنص السؤال (ليس question_text).
- أنواع الأسئلة المسموحة فقط: multiple_choice أو true_false أو essay.
- للأسئلة المقالية، اترك مصفوفة options فارغة [].
- لا تكتب أي نص إضافي أو شروحات خارج كود الـ JSON.`;

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

      let finalApiKey = customApiKey.trim();
      if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
         finalApiKey = finalApiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      }
      
      if (!finalApiKey) throw new Error('يرجى إدخال مفتاح API الخاص بجوجل في الحقل المخصص.');

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${finalApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        setResult(JSON.parse(data.candidates[0].content.parts[0].text));
      } else {
         throw new Error(data.error?.message || 'لم يتم استرجاع بيانات صحيحة من النموذج');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveToRealDatabase = async () => {
    if (!result || !selectedTeacher || !selectedSubject || selectedSections.length === 0) return;
    setIsSavingDB(true);
    try {
      const totalScore = result.questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);
      const response = await fetch('/api/exams/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          examData: {
            title: result.title,
            subject_id: selectedSubject,
            section_ids: selectedSections,
            max_score: totalScore,
            total_points: totalScore,
            total_marks: totalScore,
            status: 'draft',
            exam_date: new Date().toISOString().split('T')[0],
            max_attempts: 1,
            settings: {
              shuffle_questions: false,
              shuffle_options: false,
              show_results_immediately: true,
              allow_backtracking: true
            }
          }, 
          questions: result.questions.map((q, i) => ({
            ...q, id: crypto.randomUUID(), order_index: i + 1, is_required: true,
            options: q.options?.map((o, idx) => ({ ...o, id: crypto.randomUUID(), order_index: idx + 1 }))
          })), 
          isNew: true, 
          userId: selectedTeacher 
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'فشل الحفظ');
      }

      alert('تم إرسال الاختبار بنجاح!');
      router.push('/exams');
    } catch (error: any) {
      alert('خطأ: ' + error.message);
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
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-indigo-100 flex flex-col sm:flex-row gap-4 items-center max-w-3xl mx-auto">
          <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Key className="w-6 h-6 text-amber-500" />
          </div>
          <div className="flex-1 w-full">
            <input 
              type="password" 
              placeholder="مفتاح التوليد التلقائي (Google Gemini API)..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 text-left"
              dir="ltr"
              value={customApiKey}
              onChange={(e) => setCustomApiKey(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
              <label className="block w-full cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); setResult(null); }
                }} />
                <div className="w-full border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center gap-4 bg-slate-50 hover:bg-slate-100">
                  {imagePreview ? <img src={imagePreview} className="max-h-60 rounded-xl" /> : <UploadCloud className="w-10 h-10 text-indigo-400" />}
                  <p className="font-bold">اضغط لرفع ورقة الاختبار</p>
                </div>
              </label>
              
              <button onClick={analyzeImage} disabled={loading || !imageFile} className="w-full mt-6 bg-indigo-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles />} {loading ? 'جاري المعالجة...' : 'توليد آلياً من الصورة'}
              </button>

              {error && (
                <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-2xl font-bold flex gap-3 text-sm">
                  <AlertCircle className="shrink-0" /> <p>{error}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col min-h-[500px]">
            <h2 className="text-2xl font-black mb-6 flex items-center gap-3"><UserCheck className="w-6 h-6 text-indigo-500" /> تعيين الاختبار</h2>
            
            <div className="space-y-5 flex-1">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">حساب المعلم:</label>
                <select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)} className="w-full border p-3 rounded-xl font-bold outline-none focus:border-indigo-500">
                  <option value="">{teachersLoading ? 'جاري التحميل...' : '-- اختر المعلم --'}</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">المادة الدراسية:</label>
                <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} disabled={subjectsLoading} className="w-full border p-3 rounded-xl font-bold outline-none focus:border-indigo-500">
                  <option value="">{subjectsLoading ? 'جاري التحميل...' : '-- اختر المادة --'}</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">الفصول المتاحة:</label>
                <div className="border p-4 rounded-xl max-h-48 overflow-y-auto bg-slate-50">
                  {sectionsLoading ? <div className="flex justify-center"><Loader2 className="animate-spin text-indigo-500" /></div> : sections.map(sec => (
                    <label key={sec.id} className="flex items-center gap-3 mb-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedSections.includes(sec.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                        {selectedSections.includes(sec.id) && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                      <input type="checkbox" className="hidden" checked={selectedSections.includes(sec.id)} onChange={() => toggleSection(sec.id)} />
                      <span className="font-bold text-slate-700">{sec.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={saveToRealDatabase} disabled={isSavingDB || !selectedSubject || !selectedTeacher || selectedSections.length === 0 || !result} className="w-full mt-6 bg-indigo-600 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50">
              {isSavingDB ? <Loader2 className="animate-spin" /> : <Save />} تأكيد وحفظ الاختبار
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
