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
  options?: string[] | any[]; // 🚀 السماح لكلا النوعين لإسكات TypeScript
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

  const basePromptText = String.raw`أنت خبير تعليمي ومطور برمجيات. قم بتحليل المحتوى المرفق واستخرج منه عنوان الواجب والأسئلة بصيغة JSON حصراً.

🛑 قواعد كتابة الرياضيات والفيزياء (حرج جداً لعمل النظام):
1. استخدم صيغة LaTeX القياسية لأي معادلة، رقم، أو رمز.
2. للهروب البرمجي (Escaping) داخل الـ JSON، يجب استخدام شرطتين مائلتين فقط (\\) قبل أوامر LaTeX لتصبح صالحة ولا تكسر النظام.
   - ✔️ مثال صحيح للكسر: "\\frac{\\mu_0 I}{2 \\pi d}"
3. ⚠️ هام جداً: استخدم علامة دولار واحدة $ فقط في بداية ونهاية المعادلات (مثال: "$2 \times 10^{-6} \text{T}$"). يُمنع منعاً باتاً استخدام علامتي دولار $$ نهائياً.

🛑 أنواع الأسئلة المسموحة (استخدم هذه المفاتيح الإنجليزية حرفياً في حقل "type" ليتوافق مع قاعدة البيانات):
- "multiple_choice": سؤال اختيار من متعدد (إجابة واحدة صحيحة).
- "true_false": سؤال صح أو خطأ.
- "multi_select": سؤال اختيار متعدد (عدة إجابات صحيحة محتملة).
- "essay": سؤال مقالي يتطلب من الطالب كتابة نص أو فقرة.
- "fill_in_blank": سؤال إكمال الفراغ (استخدم [____] مكان الفراغ في نص السؤال).
- "file": إذا كان السؤال يطلب من الطالب (الرسم، التصوير، أو إرفاق حل في ورقة خارجية)، فهذا يعني أن الطالب يجب أن يرفع ملفاً لحله.

🛑 قواعد بناء الـ JSON:
1. إذا كان هناك نص رئيسي يتبعه أسئلة، ضعه كعنصر "section_header" مستقل.
2. الإجابة النموذجية: أضفها في نهاية نص السؤال حرفياً داخل أقواس بهذا الشكل: [الإجابة النموذجية: الحل].
3. إذا كان النوع "file" أو "essay" أو "fill_in_blank"، اجعل مصفوفة الخيارات (options) فارغة [].

أخرج الناتج ككود JSON فقط بهذا الهيكل:
{
  "title": "عنوان الواجب",
  "questions": [
    {
      "content": "نص السؤال هنا [الإجابة النموذجية: الحل]",
      "type": "multiple_choice",
      "points": 1,
      "options": ["$32^\\circ \\text{F}$", "$212^\\circ \\text{F}$"]
    }
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
      reader.readAs
