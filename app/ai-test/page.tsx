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

  // 1. 🚀 جلب المعلمين (بدون !inner لضمان الظهور)
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

  // 2. 🚀 جلب المواد (تم إزالة !inner لضمان ظهور مادتيك الفيزياء والعلوم)
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
          .from('teacher_subjects')
          .select(`
            subject_id,
            subjects ( id, name )
          `)
          .eq('teacher_id', selectedTeacher);

        if (error) throw error;
        
        // استخراج المواد بشكل آمن حتى لو كان الربط ضعيفاً بسبب الـ RLS
        const extracted = data?.map((item: any) => item.subjects).filter(Boolean) || [];
        const uniqueSubjects = Array.from(new Map(extracted.map((item: any) => [item.id, item])).values());
        
        setSubjects(uniqueSubjects as Subject[]);
      } catch (err) {
        console.error("Error fetching subjects:", err);
      } finally {
        setSubjectsLoading(false);
      }
    };
    fetchTeacherSubjects();
  }, [selectedTeacher]);

  // 3. 🚀 جلب فصول المعلم (تم إزالة !inner لضمان ظهور فصولك)
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
          .select(`
            section_id,
            sections ( id, name )
          `)
          .eq('teacher_id', selectedTeacher)
          .eq('subject_id', selectedSubject); 

        if (error) throw error;
        
        const extracted = data?.map((item: any) => item.sections).filter(Boolean) || [];
        const uniqueSections = Array.from(new Map(extracted.map((item: any) => [item.id, item])).values());

        setSections(uniqueSections as Section[]);
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

      const payload = {
        contents: [{
          role: "user",
          parts: [
            { text: "تحليل صورة الاختبار واستخراج JSON (content, type, points, options)" },
            { inlineData: { mimeType: imageFile.type, data: base64Data } }
          ]
        }],
        generationConfig: { responseMimeType: "application/json" }
      };

      const finalApiKey = customApiKey.trim() || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${finalApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        setResult(JSON.parse(data.candidates[0].content.parts[0].text));
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
            status: 'draft'
          }, 
          questions: result.questions.map((q, i) => ({
            ...q, id: crypto.randomUUID(), order_index: i + 1,
            options: q.options?.map((o, idx) => ({ ...o, id: crypto.randomUUID(), order_index: idx + 1 }))
          })), 
          isNew: true, 
          userId: selectedTeacher 
        }),
      });
      if (response.ok) {
        alert('تم إرسال الاختبار بنجاح!');
        router.push('/exams');
      }
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
              <label className="block w-full cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
                }} />
                <div className="w-full border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center gap-4 bg-slate-50">
                  {imagePreview ? <img src={imagePreview} className="max-h-60 rounded-xl" /> : <UploadCloud className="w-10 h-10 text-indigo-400" />}
                  <p className="font-bold">اضغط لرفع ورقة الاختبار</p>
                </div>
              </label>
              <button onClick={analyzeImage} disabled={loading || !imageFile} className="w-full mt-6 bg-indigo-600 text-white font-black py-4 rounded-2xl">
                {loading ? 'جاري المعالجة...' : 'توليد آلياً من الصورة'}
              </button>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col">
            <h2 className="text-2xl font-black mb-6 flex items-center gap-3"><UserCheck className="w-6 h-6 text-indigo-500" /> تعيين الاختبار</h2>
            
            <div className="space-y-5 flex-1">
              <select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)} className="w-full border p-3 rounded-xl font-bold">
                <option value="">-- اختر المعلم --</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>

              <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} disabled={!selectedTeacher || subjectsLoading} className="w-full border p-3 rounded-xl font-bold">
                <option value="">{subjectsLoading ? 'جاري التحميل...' : '-- اختر المادة --'}</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              <div className="border p-4 rounded-xl max-h-40 overflow-y-auto">
                <p className="text-sm font-bold mb-2">الفصول المتاحة:</p>
                {sectionsLoading ? <Loader2 className="animate-spin" /> : sections.map(sec => (
                  <label key={sec.id} className="flex items-center gap-2 mb-2 cursor-pointer">
                    <input type="checkbox" checked={selectedSections.includes(sec.id)} onChange={() => toggleSection(sec.id)} />
                    <span className="font-bold">{sec.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <button onClick={saveToRealDatabase} disabled={isSavingDB || !selectedSubject || selectedSections.length === 0} className="w-full mt-6 bg-indigo-600 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2">
              {isSavingDB ? <Loader2 className="animate-spin" /> : <Save />} تأكيد وحفظ الاختبار
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
