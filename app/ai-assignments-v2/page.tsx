// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, CheckCircle2, AlertCircle, Sparkles, 
  Copy, ClipboardPaste, ShieldCheck, Edit3, Trash2, 
  Plus, Save, X, UserCheck, ListOrdered, FileJson,
  Bold, Italic, Underline as UnderlineIcon, AlignRight, AlignCenter, AlignLeft,
  List, ImageIcon, Table as TableIcon, Calculator, FlaskConical, Loader2, CheckSquare, Gamepad2, Database, Clock, RefreshCcw, Eye, Target, Quote, BrainCircuit, BarChart3, GraduationCap, Lightbulb, Network, Info, Calendar, Settings, Filter, UploadCloud
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context'; 
import { motion, AnimatePresence } from 'framer-motion';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';

import katex from 'katex';
import 'katex/dist/katex.min.css';
import { supabase } from '@/lib/supabase';

interface Option { id: string; content: string; is_correct: boolean; }
interface Question { id: string; type: string; content_html: string; model_answer_html: string; points: number; options: Option[]; needs_image?: boolean; }

const renderHTMLWithMath = (html: string) => {
  if (!html) return '';
  let parsed = html;
  if (typeof window !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(parsed, 'text/html');
      const images = doc.querySelectorAll('img');
      images.forEach((img) => {
        if (img.src && img.src.startsWith('http')) {
          img.setAttribute('crossorigin', 'anonymous');
        }
      });
      parsed = doc.body.innerHTML;
    } catch (e) {}
  }
  const renderMath = (match: string, mathString: string, isDisplay: boolean) => {
    try {
      let cleanMath = mathString.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      cleanMath = cleanMath.replace(/\\mu_o/g, '\\mu_0').replace(/mu_o/g, '\\mu_0').replace(/\\pi\\0\.001/g, '0.001\\pi').replace(/\\ /g, ' ');
      return katex.renderToString(cleanMath, { displayMode: isDisplay, throwOnError: false, direction: 'ltr' });
    } catch (e) { return match; }
  };
  parsed = parsed.replace(/\$\$(.*?)\$\$/gs, (m, math) => renderMath(m, math, true));
  parsed = parsed.replace(/\$(.*?)\$/gs, (m, math) => renderMath(m, math, false));
  return parsed;
};

// --- أداة الرفع المباشر لـ Cloudinary ---
const uploadImageToCloudinary = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '');
  const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
};

const TiptapEditor = ({ content, onChange, placeholder }: { content: string, onChange: (html: string) => void, placeholder: string }) => {
  const [isUploading, setIsUploading] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit, Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'], defaultAlignment: 'right' }),
      Image.configure({ inline: true, allowBase64: true }), 
      Table.configure({ resizable: true }), TableRow, TableHeader, TableCell, TextStyle, Color,
    ],
    content: content,
    onUpdate: ({ editor }) => { onChange(editor.getHTML()); },
    editorProps: {
      attributes: { class: 'prose prose-slate max-w-none focus:outline-none min-h-[120px] p-4 text-slate-800 font-bold leading-loose tiptap-content', dir: 'rtl' },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        let imageItem = items.find(item => item.type.indexOf('image') === 0);
        if (imageItem) {
          const file = imageItem.getAsFile();
          if (file) {
            event.preventDefault(); 
            const doUpload = async () => {
              setIsUploading(true);
              try {
                const data = await uploadImageToCloudinary(file);
                if (data.secure_url) {
                  const node = view.state.schema.nodes.image.create({ src: data.secure_url });
                  const transaction = view.state.tr.replaceSelectionWith(node);
                  view.dispatch(transaction);
                }
              } catch (err: any) { alert("حدث خطأ أثناء رفع الصورة"); } finally { setIsUploading(false); }
            };
            doUpload();
            return true; 
          }
        }
        return false; 
      }
    }
  });

  if (!editor) return null;
  const insertMath = (symbol: string) => { editor.chain().focus().insertContent(` ${symbol} `).run(); };

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-inner flex flex-col relative">
      <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap gap-1 items-center">
        <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded-lg transition-colors ${editor.isActive('bold') ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}><Bold className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded-lg transition-colors ${editor.isActive('italic') ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}><Italic className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-1.5 rounded-lg transition-colors ${editor.isActive('underline') ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}><UnderlineIcon className="w-4 h-4"/></button>
        <div className="w-px h-5 bg-slate-300 mx-1"></div>
        <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`p-1.5 rounded-lg transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}><AlignRight className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`p-1.5 rounded-lg transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}><AlignCenter className="w-4 h-4"/></button>
        <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`p-1.5 rounded-lg transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}><AlignLeft className="w-4 h-4"/></button>
        <div className="w-px h-5 bg-slate-300 mx-1"></div>
        <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200"><TableIcon className="w-4 h-4"/></button>
      </div>
      <div className="bg-indigo-50 border-b border-indigo-100 p-2 flex flex-wrap gap-2 items-center overflow-x-auto hide-scrollbar">
        <button onClick={() => insertMath('$ $')} className="px-2 py-1 bg-white text-indigo-700 rounded text-xs font-bold font-mono border border-indigo-200 shadow-sm flex items-center gap-1"><Calculator className="w-3 h-3"/> $ $</button>
        <button onClick={() => insertMath('$\\frac{ }{ }$')} className="px-2 py-1 bg-white text-indigo-700 rounded text-xs font-bold font-mono border border-indigo-200 shadow-sm">كسر</button>
        <button onClick={() => insertMath('$^{ }$')} className="px-2 py-1 bg-white text-indigo-700 rounded text-xs font-bold font-mono border border-indigo-200 shadow-sm">أس</button>
      </div>
      <div className="flex-1 bg-white relative min-h-[120px]">
        <AnimatePresence>
          {isUploading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 rounded-b-2xl">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>
        {!editor.getText() && !editor.isActive('image') && !editor.isActive('table') && (
          <div className="absolute inset-0 pointer-events-none p-4 text-slate-400 font-bold text-sm">{placeholder}</div>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default function AssignmentBuilderV2() {
  const router = useRouter();
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [activeTab, setActiveTab] = useState<'builder' | 'import' | 'manage'>('builder');
  
  const [assignmentTitle, setAssignmentTitle] = useState('واجب جديد');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [assignmentStatus, setAssignmentStatus] = useState<'draft' | 'published'>('draft');
  const [isPracticeMode, setIsPracticeMode] = useState<boolean>(false);
  
  const [dueDate, setDueDate] = useState('');
  const [timeLimit, setTimeLimit] = useState<number>(0);
  const [latePolicy, setLatePolicy] = useState<'allow' | 'block'>('allow');
  const [maxScore, setMaxScore] = useState<number>(100);

  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  const [filterNeedsImage, setFilterNeedsImage] = useState<boolean>(false);
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);

  const [manualJson, setManualJson] = useState('');
  const [skippedLog, setSkippedLog] = useState<{question_hint: string, reason: string}[]>([]); 
  
  const [isSavingDB, setIsSavingDB] = useState(false);
  const [globalMessage, setGlobalMessage] = useState({ text: '', type: '' });

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentQ, setCurrentQ] = useState<Question | null>(null);

  const [manageAssignments, setManageAssignments] = useState<any[]>([]);
  const [teacherStats, setTeacherStats] = useState<{name: string, count: number}[]>([]); 
  const [isManageLoading, setIsManageLoading] = useState(false);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewQ, setPreviewQ] = useState<Question | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const tmrw = new Date(); tmrw.setDate(tmrw.getDate() + 1); tmrw.setHours(23, 59, 0, 0);
    setDueDate(tmrw.toISOString().slice(0, 16));
  }, []);

  useEffect(() => {
    if (currentRole !== 'admin' && currentRole !== 'management' && currentRole !== 'teacher') return;
    const fetchTeachers = async () => {
      const { data } = await supabase.from('teachers').select(`id, users ( full_name )`);
      const formattedTeachers = (data || []).map((t: any) => ({ id: t.id, full_name: t.users?.full_name || 'بدون اسم' }));
      formattedTeachers.sort((a, b) => a.full_name.localeCompare(b.full_name));
      setTeachers(formattedTeachers);
    };
    fetchTeachers();
  }, [currentRole]);

  useEffect(() => {
    const fetchSubjects = async () => {
      if (selectedTeacher) {
        const { data } = await supabase.from('teacher_sections').select(`subject_id, subjects ( id, name )`).eq('teacher_id', selectedTeacher);
        const extracted = (data || []).map((item: any) => item.subjects).filter(Boolean);
        setSubjects(Array.from(new Map(extracted.map((item: any) => [item.id, item])).values()));
      } else if (currentRole === 'admin' || currentRole === 'management') {
        const { data } = await supabase.from('subjects').select('id, name').order('name');
        setSubjects(data || []);
      }
    };
    fetchSubjects();
  }, [selectedTeacher, currentRole]);

  useEffect(() => {
    const fetchSections = async () => {
      if (!selectedSubject) { setSections([]); setSelectedSections([]); return; }
      if (selectedTeacher) {
        const { data } = await supabase.from('teacher_sections').select(`section_id, sections ( id, name, classes ( name ) )`).eq('teacher_id', selectedTeacher).eq('subject_id', selectedSubject); 
        const extracted = (data || []).map((item: any) => {
          if (!item.sections) return null;
          const className = Array.isArray(item.sections.classes) ? item.sections.classes[0]?.name : item.sections.classes?.name;
          return { id: item.sections.id, name: className ? `${className} - ${item.sections.name}` : item.sections.name };
        }).filter(Boolean);
        setSections(Array.from(new Map(extracted.map((item: any) => [item.id, item])).values()));
      } else if (currentRole === 'admin' || currentRole === 'management') {
        const { data } = await supabase.from('sections').select('id, name, classes(name)').order('name');
        setSections((data || []).map(sec => ({ id: sec.id, name: `${sec.classes?.name || ''} - ${sec.name}` })));
      }
    };
    fetchSections();
  }, [selectedTeacher, selectedSubject, currentRole]);

  useEffect(() => {
    if (activeTab === 'manage') fetchManageList();
  }, [activeTab]);

  const fetchManageList = async () => {
    setIsManageLoading(true);
    try {
      let query = supabase.from('assignments_v2').select('*').order('created_at', { ascending: false }).limit(1000);
      
      if (currentRole === 'teacher') {
        const { data: teacherProfile } = await supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle();
        if (teacherProfile) query = query.eq('teacher_id', teacherProfile.id);
        else query = query.eq('teacher_id', '00000000-0000-0000-0000-000000000000');
      }
      
      const { data: assignments, error: assignErr } = await query;
      if (assignErr) throw assignErr;

      if (!assignments || assignments.length === 0) {
        setManageAssignments([]); setTeacherStats([]); setIsManageLoading(false); return;
      }

      const assignmentIds = assignments.map(a => a.id);
      
      const [subjectsRes, teachersRes, questionsRes] = await Promise.all([
        supabase.from('subjects').select('id, name'),
        supabase.from('teachers').select('id, users(full_name)'),
        supabase.from('assignment_questions_v2').select('assignment_id').in('assignment_id', assignmentIds)
      ]);

      const subjectsList = subjectsRes.data || [];
      const teachersList = teachersRes.data || [];
      const questionsList = questionsRes.data || [];

      const mergedData = assignments.map(assign => {
        const sub = subjectsList.find(s => String(s.id) === String(assign.subject_id));
        const teacher = teachersList.find(t => String(t.id) === String(assign.teacher_id));
        const qCount = questionsList.filter(q => String(q.assignment_id) === String(assign.id)).length;
        
        let tName = 'عام (بدون معلم)';
        if (teacher?.users?.full_name) tName = teacher.users.full_name;
        else if (Array.isArray(teacher?.users) && teacher.users.length > 0) tName = teacher.users[0].full_name;
        else if (!assign.teacher_id) tName = 'توزيع ذكي (متعدد)';

        return {
          ...assign,
          subjects: { name: sub?.name || 'مادة غير محددة' },
          teachers: { users: { full_name: tName } },
          question_count: qCount 
        };
      });

      if (currentRole === 'admin' || currentRole === 'management') {
        const statsMap = new Map();
        mergedData.forEach(assign => {
          const tName = assign.teachers?.users?.full_name || 'توزيع ذكي (متعدد)';
          statsMap.set(tName, (statsMap.get(tName) || 0) + 1);
        });
        const statsArr = Array.from(statsMap, ([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count);
        setTeacherStats(statsArr);
      }

      setManageAssignments(mergedData);
    } catch (err: any) { 
      console.error(err); 
      alert("حدث خطأ أثناء جلب السجلات. الرجاء المحاولة مرة أخرى.");
    } finally { 
      setIsManageLoading(false); 
    }
  };

  const handleEditAssignment = async (assign: any) => {
    try {
      const { data: qData } = await supabase.from('assignment_questions_v2').select('*').eq('assignment_id', assign.id).order('order_index', { ascending: true });
      const { data: sData } = await supabase.from('assignment_sections_v2').select('*').eq('assignment_id', assign.id);
      
      setAssignmentTitle(assign.title);
      setSelectedTeacher(assign.teacher_id || ''); // 🚀 تحديث المعلم المختار في الـ State ليظهر في القائمة المنسدلة
      setSelectedSubject(assign.subject_id);
      setAssignmentStatus(assign.status);
      setIsPracticeMode(assign.is_practice_mode);
      setSelectedSections((sData || []).map((s:any) => s.section_id));
      
      if (assign.due_date) {
        const d = new Date(assign.due_date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        setDueDate(d.toISOString().slice(0, 16));
      }
      try {
         if (assign.description && assign.description.startsWith('{')) {
            const parsedDesc = JSON.parse(assign.description);
            setTimeLimit(parsedDesc.timeLimit || 0);
            setLatePolicy(parsedDesc.latePolicy || 'allow');
            setMaxScore(parsedDesc.maxScore || 100);
         }
      } catch(e) {}
      
      const formattedQs = (qData || []).map((q:any) => ({
        id: crypto.randomUUID(),
        type: q.question_type,
        content_html: q.content_html,
        model_answer_html: q.model_answer_html || '',
        points: q.points,
        needs_image: false, 
        options: (q.options || []).map((o: any) => ({ ...o, is_correct: o.is_correct === true || o.is_correct === 'true' }))
      }));
      
      setQuestions(formattedQs);
      setEditingAssignmentId(assign.id); 
      setActiveTab('builder');
    } catch (err) { alert('خطأ في استدعاء بيانات الدرس.'); }
  };

  const handleDeleteAssignment = async (id: string) => {
    if(!confirm('هل أنت متأكد من حذف هذا الدرس نهائياً؟')) return;
    setIsManageLoading(true);
    try {
      await supabase.from('assignment_questions_v2').delete().eq('assignment_id', id);
      await supabase.from('student_progress_v2').delete().eq('assignment_id', id);
      await supabase.from('assignment_sections_v2').delete().eq('assignment_id', id);
      await supabase.from('assignments_v2').delete().eq('id', id);
      fetchManageList();
      setGlobalMessage({ text: 'تم الحذف بنجاح!', type: 'success' });
      setTimeout(() => setGlobalMessage({ text: '', type: '' }), 4000);
    } catch (err) { alert('حدث خطأ أثناء الحذف.'); setIsManageLoading(false); }
  };

  const toggleSection = (id: string) => setSelectedSections(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleResetBuilder = (force = false) => {
    if (!force && (questions.length > 0 || assignmentTitle !== 'واجب جديد')) {
      if (!confirm('هل أنت متأكد من مسح جميع الأسئلة والبيانات للبدء بدرس جديد؟')) return;
    }
    setEditingAssignmentId(null);
    setQuestions([]);
    setSkippedLog([]);
    setAssignmentTitle('واجب جديد');
    setSelectedTeacher('');
    setSelectedSubject('');
    setSelectedSections([]);
    setIsPracticeMode(false); 
    setAssignmentStatus('draft');
    
    const tmrw = new Date(); tmrw.setDate(tmrw.getDate() + 1); tmrw.setHours(23, 59, 0, 0);
    setDueDate(tmrw.toISOString().slice(0, 16));
    setTimeLimit(0);
    setLatePolicy('allow');
    setMaxScore(100);
  };

  const copyPrompt = () => { 
    const basePromptText = String.raw`أنت خبير تعليمي متمرس ومبرمج JSON صارم جداً. سأعطيك نصاً مقتطعاً من بنك أسئلة أو اختبار.
المطلوب استخراج الناتج بصيغة JSON فقط لتطبيق تعليمي تفاعلي. 🚨 إياك أن تتخيل أسئلة أو صور غير موجودة.

قوانين التصنيف "type":
- "multiple_choice": أسئلة الاختيار من متعدد (ضع الخيارات في مصفوفة "options").
- "true_false": الصح والخطأ (قم بتوليد خياري "صح" و "خطأ" وحدد الصحيح).
- "essay": التعاليل، المقارنات، المصطلح العلمي، ماذا يحدث، أذكر السبب، الأسئلة المقالية المطولة، والمسائل الرياضية المباشرة.
- "section_header": العناوين الرئيسية والفرعية التي تسبق الأسئلة (مثل: السؤال الأول، أو: اقرأ النص التالي ثم أجب).

🎨 التعامل مع الجداول والمقارنات ("type": "essay"):
- إذا وجدت جدولاً أو سؤال مقارنة، حوله إلى نص منظم باستخدام الـ HTML (مثل <table> أو <b>) داخل "content" و "model_answer_html". لا تستخدم نصوصاً مسطحة.

🎨 قوانين أسئلة "الرسم" ("type": "essay"):
- إذا كان السؤال يطلب من الطالب صراحة "الرسم" (مثل: ارسم المنحنيات البيانية، أكمل مسار الشعاع، ارسم الدائرة)، اجعل نوعه "essay"، وأضف جملة واضحة في نهايته: "(يمكنك استخدام السبورة الذكية لرسم الإجابة وإرفاقها)".

📸 رادار الصور ("needs_image"): 
- اجعله true **فقط وحصراً** إذا كان نص السؤال يشير لصورة يجب أن يراها الطالب ليحل (مثل: من الشكل المجاور، في الرسم البياني الموضح أدناه). لا تضعه true لأسئلة الرسم العادية التي يبدأ الطالب برسمها من ورقة بيضاء.

🛑 الإبلاغ عن الأسئلة المتخطاة (إجباري):
إذا واجهت سؤالاً معقداً لم تتمكن من تحويله (بسبب رسومات لا يمكن فهمها من النص)، لا تتجاهله بصمت. بل أضف لمحة عنه في مصفوفة "skipped_questions" واذكر السبب بوضوح ليعلم المعلم.

هيكل JSON المطلوب:
{
  "title": "عنوان الدرس",
  "total_extracted_questions": 0,
  "skipped_questions": [
    { "question_hint": "السؤال الرابع فقرة ب", "reason": "السؤال عبارة عن خريطة مفاهيمية معقدة تحتاج لبرمجة خاصة." }
  ],
  "questions": [
    {
      "type": "essay", 
      "content": "قارن بين كذا وكذا. <br> <b>أو:</b> ارسم العلاقة البيانية... <br><br> <i>(يمكنك استخدام السبورة الذكية لرسم الإجابة وإرفاقها)</i>",
      "needs_image": false, 
      "model_answer_html": "<b>خطوات الحل:</b> <br> كذا وكذا.",
      "points": 1,
      "options": []
    }
  ]
}

إليك النص (استخرج جميع الأسئلة كاملة بدقة متناهية ولا تختصر شيئاً):`;
    navigator.clipboard.writeText(basePromptText); 
    alert('تم نسخ البرومبت الصارم المطور! 🚨\nيشمل الآن دعماً للمقارنات والمقالي المطول وجداول المقارنة.'); 
  };

  const processManualJson = () => {
    if (!manualJson.trim()) { alert('يرجى لصق الكود أولاً.'); return; }
    
    try {
      let cleanStr = manualJson.trim();
      if (cleanStr.startsWith('```')) {
        cleanStr = cleanStr.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '');
      }

      const firstBrace = cleanStr.indexOf('{');
      const lastBrace = cleanStr.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace === -1) throw new Error('لم يتم العثور على هيكل JSON صالح');
      
      const parsedData = JSON.parse(cleanStr.substring(firstBrace, lastBrace + 1));
      if (!parsedData.questions) throw new Error('مصفوفة الأسئلة مفقودة');

      const newQuestions = parsedData.questions.map((q: any) => {
        let opts = [];
        if (Array.isArray(q.options)) {
          opts = q.options.map((opt: any) => {
            if (typeof opt === 'string') {
              const cleanOpt = opt.trim();
              const cleanModel = q.model_answer_html ? q.model_answer_html.replace(/<[^>]+>/g, '').trim() : '';
              return { id: crypto.randomUUID(), content: cleanOpt, is_correct: cleanModel && cleanOpt === cleanModel };
            } else {
              const isCorrectVal = opt.is_correct === true || opt.is_correct === 'true' || opt.isCorrect === true || opt.isCorrect === 'true';
              return { id: crypto.randomUUID(), content: String(opt.content || opt.text || ''), is_correct: isCorrectVal };
            }
          });
          if (q.type === 'multiple_choice' && opts.length > 0 && !opts.some(o => o.is_correct)) opts[0].is_correct = true;
        }

        return {
          id: crypto.randomUUID(),
          content_html: q.content || q.content_html || q.section_header || 'سؤال بدون نص',
          model_answer_html: q.model_answer_html || '', 
          type: q.type || 'essay',
          points: isNaN(Number(q.points)) ? 1 : Number(q.points), 
          needs_image: !!q.needs_image,
          options: opts,
        };
      });

      if (parsedData.skipped_questions && Array.isArray(parsedData.skipped_questions)) setSkippedLog(parsedData.skipped_questions);
      if (assignmentTitle === 'واجب جديد' && parsedData.title) setAssignmentTitle(parsedData.title);

      setQuestions(prev => [...prev, ...newQuestions]); 
      setManualJson(''); 
      setGlobalMessage({ text: `تم استيراد ${newQuestions.length} سؤال بنجاح!`, type: 'success' });
      
      setTimeout(() => { 
        setGlobalMessage({text:'', type:''}); 
        setActiveTab('builder'); 
        setIsImportModalOpen(false); 
      }, 2000);

    } catch (err: any) {
      alert(`عذراً، حدث خطأ في قراءة الكود: \n${err.message}\nتأكد من نسخ الكائن كاملاً من القوس { إلى القوس }`);
    }
  };

  const handleQuickImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, questionId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImageId(questionId);
    try {
      const data = await uploadImageToCloudinary(file);
      if (data.secure_url) {
        setQuestions(prev => prev.map(q => {
          if (q.id === questionId) {
            return {
              ...q,
              content_html: q.content_html + `<br><img src="${data.secure_url}" alt="صورة مرفقة" style="max-width: 100%; border-radius: 12px; margin-top: 10px; display: block;" />`,
              needs_image: false
            };
          }
          return q;
        }));
        setGlobalMessage({ text: 'تم دمج الصورة بالسؤال بنجاح!', type: 'success' });
        setTimeout(() => setGlobalMessage({text:'', type:''}), 3000);
      }
    } catch (err: any) {
      alert('فشل رفع الصورة: ' + err.message);
    } finally {
      setUploadingImageId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openNewQuestion = () => {
    setCurrentQ({ id: crypto.randomUUID(), type: 'essay', content_html: '', model_answer_html: '', points: 1, options: [], needs_image: false });
    setEditingIndex(null);
    setIsEditorOpen(true);
  };

  const openEditQuestion = (index: number) => {
    const questionToEdit = JSON.parse(JSON.stringify(questions[index]));
    setCurrentQ(questionToEdit);
    setEditingIndex(index);
    setIsEditorOpen(true);
  };

  const openPreview = (index: number) => {
    setPreviewQ(questions[index]);
    setIsPreviewOpen(true);
  };

  const saveQuestion = () => {
    if (!currentQ?.content_html.trim() || currentQ.content_html === '<p></p>') { alert('يرجى كتابة محتوى السؤال'); return; }
    let updatedQ = { ...currentQ };
    if (updatedQ.type === 'true_false' && (!updatedQ.options || updatedQ.options.length === 0)) {
      updatedQ.options = [ { id: crypto.randomUUID(), content: 'صح', is_correct: true }, { id: crypto.randomUUID(), content: 'خطأ', is_correct: false } ];
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

  const addOption = () => { if(currentQ) setCurrentQ({...currentQ, options: [...currentQ.options, { id: crypto.randomUUID(), content: 'خيار جديد', is_correct: false }]}); };
  const removeOption = (optId: string) => { if(currentQ) setCurrentQ({...currentQ, options: currentQ.options.filter(o => o.id !== optId)}); };
  const toggleCorrectOption = (optId: string) => {
    if(currentQ) {
      const updatedOptions = currentQ.options.map(o => {
        if (currentQ.type === 'multiple_choice' || currentQ.type === 'true_false') return { ...o, is_correct: o.id === optId };
        return o.id === optId ? { ...o, is_correct: !o.is_correct } : o;
      });
      setCurrentQ({...currentQ, options: updatedOptions});
    }
  };
  const updateOptionContent = (optId: string, val: string) => { if(currentQ) setCurrentQ({...currentQ, options: currentQ.options.map(o => o.id === optId ? { ...o, content: val } : o)}); };

  const saveAssignmentToDB = async () => {
    if (!assignmentTitle || questions.length === 0 || !selectedSubject || selectedSections.length === 0) {
      alert('يرجى إكمال بيانات الواجب واختيار المادة والصفوف أولاً.'); return;
    }
    setIsSavingDB(true);
    try {
      const descriptionPayload = isPracticeMode ? 'بنك تدريب تفاعلي' : JSON.stringify({ timeLimit, latePolicy, maxScore });
      const finalDueDate = isPracticeMode ? new Date(new Date().setDate(new Date().getDate() + 30)).toISOString() : new Date(dueDate).toISOString();

      let teacherId = null;
      if (currentRole === 'teacher') {
        const { data: t } = await supabase.from('teachers').select('id').eq('user_id', user.id).single();
        teacherId = t?.id;
      } else if (selectedTeacher) {
        teacherId = selectedTeacher; // 🚀 حفظ المدرس المختار في حال كان المدير هو من يضيف
      }

      let teacherSectionMap = new Map<string, string[]>();

      if ((currentRole === 'admin' || currentRole === 'management') && !selectedTeacher) {
        // 🚀 نظام التوزيع الذكي إذا لم يتم اختيار معلم محدد
        const { data: tsData } = await supabase.from('teacher_sections').select('teacher_id, section_id').eq('subject_id', selectedSubject).in('section_id', selectedSections);
        const foundSections = new Set();
        if (tsData) {
          tsData.forEach(ts => {
            if (!teacherSectionMap.has(ts.teacher_id)) teacherSectionMap.set(ts.teacher_id, []);
            teacherSectionMap.get(ts.teacher_id)!.push(ts.section_id);
            foundSections.add(ts.section_id);
          });
        }
        const missingSections = selectedSections.filter(s => !foundSections.has(s));
        if (missingSections.length > 0) teacherSectionMap.set('unassigned', missingSections);
      } else {
        // إذا كان معلماً، أو إذا قام الإداري باختيار معلم محدد صراحةً
        teacherSectionMap.set(teacherId || 'unassigned', selectedSections);
      }

      if (editingAssignmentId) {
        // 🚀 أثناء التعديل، نحدث اسم المعلم في قاعدة البيانات إذا تم تغييره
        await supabase.from('assignments_v2').update({ 
           title: assignmentTitle, 
           description: descriptionPayload, 
           subject_id: selectedSubject, 
           teacher_id: teacherId || null, 
           status: assignmentStatus, 
           is_practice_mode: isPracticeMode, 
           due_date: finalDueDate 
        }).eq('id', editingAssignmentId);

        await supabase.from('assignment_sections_v2').delete().eq('assignment_id', editingAssignmentId);
        await supabase.from('assignment_questions_v2').delete().eq('assignment_id', editingAssignmentId);

        const sectionsPayload = selectedSections.map(secId => ({ assignment_id: editingAssignmentId, section_id: secId }));
        await supabase.from('assignment_sections_v2').insert(sectionsPayload);

        const questionsPayload = questions.map((q, index) => ({ 
          assignment_id: editingAssignmentId, question_type: q.type, content_html: q.content_html, model_answer_html: q.model_answer_html, points: q.points, options: q.options, order_index: i + 1 
        }));
        await supabase.from('assignment_questions_v2').insert(questionsPayload);

      } else {
        // 🚀 أثناء الإنشاء الجديد (دعم التوزيع الذكي)
        for (const [tId, sIds] of Array.from(teacherSectionMap.entries())) {
          const dbTeacherId = tId === 'unassigned' ? null : tId;

          const { data: assignData, error: assignErr } = await supabase.from('assignments_v2').insert({ 
            title: assignmentTitle, description: descriptionPayload, subject_id: selectedSubject, teacher_id: dbTeacherId, due_date: finalDueDate, status: assignmentStatus, is_practice_mode: isPracticeMode 
          }).select().single();
          
          if (assignErr) throw assignErr;
          const finalAssignmentId = assignData.id;

          const sectionsPayload = sIds.map(secId => ({ assignment_id: finalAssignmentId, section_id: secId }));
          await supabase.from('assignment_sections_v2').insert(sectionsPayload);

          const questionsPayload = questions.map((q, index) => ({ 
            assignment_id: finalAssignmentId, question_type: q.type, content_html: q.content_html, model_answer_html: q.model_answer_html, points: q.points, options: q.options, order_index: index + 1 
          }));
          await supabase.from('assignment_questions_v2').insert(questionsPayload);
        }
      }

      setGlobalMessage({ text: editingAssignmentId ? 'تم تحديث الواجب بنجاح!' : 'تم توزيع الواجب للطلاب بنجاح!', type: 'success' });
      setTimeout(() => { setGlobalMessage({text:'', type:''}); setActiveTab('manage'); handleResetBuilder(true); }, 2000);
    } catch (err: any) { alert('حدث خطأ أثناء الحفظ. تأكد من اكتمال البيانات.'); } finally { setIsSavingDB(false); }
  };

  const translateType = (t: string) => {
    const types:any = { 'multiple_choice': 'اختياري', 'true_false': 'صح/خطأ', 'essay': 'مقالي / رسم / تفاعلي', 'section_header': 'ترويسة/نص عام' };
    return types[t] || t;
  };

  const questionsNeedingImages = questions.filter(q => q.needs_image);
  const displayedQuestions = filterNeedsImage ? questionsNeedingImages : questions;

  if (currentRole !== 'admin' && currentRole !== 'management' && currentRole !== 'teacher') return <div className="p-10 text-center">غير مصرح لك.</div>;

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 font-cairo text-slate-800 pb-32" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: `
        .katex-container { direction: ltr !important; unicode-bidi: embed !important; display: inline-block; max-width: 100%; overflow-wrap: break-word; }
        .katex { direction: ltr !important; text-align: left !important; }
        .katex-display { display: flex !important; justify-content: center !important; margin: 0.5rem 0 !important; width: 100% !important; overflow-x: auto; direction: ltr !important; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .tiptap-content table, .ProseMirror table { border-collapse: collapse !important; width: 100% !important; margin: 15px 0 !important; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); background: white; }
        .tiptap-content td, .tiptap-content th, .ProseMirror td, .ProseMirror th { border: 2px solid #cbd5e1 !important; padding: 12px !important; text-align: center !important; vertical-align: middle !important; min-width: 2em; }
        .tiptap-content th, .ProseMirror th { background-color: #f8fafc !important; font-weight: 900 !important; color: #334155; }
        .tiptap-content img, .ProseMirror img { max-width: 100% !important; height: auto !important; border-radius: 12px !important; margin: 10px auto !important; display: block !important; box-shadow: 0 4px 10px rgba(0,0,0,0.1) !important; }
        .tiptap-content p { margin-bottom: 0.5em !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.5); border-radius: 10px; }
      `}} />

      <AnimatePresence>
        {globalMessage.text && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl font-bold text-white flex items-center gap-3 ${globalMessage.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
            <CheckCircle2 className="w-5 h-5" /> {globalMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="text-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
          <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-3"><Gamepad2 className="w-8 h-8" /></div>
          <h1 className="text-2xl font-black text-slate-900">غرفة التحكم والإنشاء (V2)</h1>
          <p className="text-sm text-slate-500 font-bold mt-2">بيئة معزولة لبناء وإدارة بنوك التدريب التفاعلية والواجبات الرسمية.</p>
        </div>

        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
          <button onClick={() => setActiveTab('builder')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'builder' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
            <ListOrdered className="w-4 h-4" /> المنشئ ({questions.length})
          </button>
          <button onClick={() => setActiveTab('import')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'import' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
            <FileJson className="w-4 h-4" /> استيراد AI
          </button>
          <button onClick={() => setActiveTab('manage')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'manage' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Database className="w-4 h-4" /> السجلات
          </button>
        </div>

        {activeTab === 'manage' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="font-black text-xl text-slate-800 flex items-center gap-2">
                <Database className="w-6 h-6 text-rose-500" /> إدارة الدروس والبنوك المكتملة
              </h2>
              <button onClick={fetchManageList} className="p-2 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100 transition-colors">
                <RefreshCcw className={`w-5 h-5 ${isManageLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {(currentRole === 'admin' || currentRole === 'management') && teacherStats.length > 0 && (
              <div className="mb-6 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 shadow-inner">
                <h3 className="text-sm font-black text-indigo-800 mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4"/> إحصائيات رفع الواجبات والدروس
                </h3>
                <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                  {teacherStats.map((stat, i) => (
                    <div key={i} className="flex items-center justify-between gap-4 bg-white p-3 rounded-xl shadow-sm border border-indigo-50 min-w-[200px] shrink-0">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-indigo-400" />
                        <span className="font-bold text-slate-700 text-sm">{stat.name}</span>
                      </div>
                      <span className="bg-indigo-600 text-white text-xs font-black px-2 py-1 rounded-lg shadow-sm">{stat.count} ملف</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isManageLoading ? (
              <div className="text-center p-10 text-slate-400 font-bold animate-pulse">جاري جلب السجلات...</div>
            ) : manageAssignments.length === 0 ? (
              <div className="text-center p-10 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-500">لا توجد واجبات أو دروس محفوظة في النظام حتى الآن.</div>
            ) : (
              <div className="space-y-4">
                {manageAssignments.map((assign) => (
                  <div key={assign.id} className="border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow bg-slate-50/50 flex flex-col md:flex-row justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${assign.is_practice_mode ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'}`}>
                          {assign.is_practice_mode ? 'بنك تدريب' : 'واجب رسمي'}
                        </span>
                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${assign.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                          {assign.status === 'published' ? 'منشور' : 'مسودة'}
                        </span>
                        {assign.subjects?.name && <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-lg">{assign.subjects.name}</span>}
                      </div>
                      <h3 className="font-black text-lg text-slate-800 mb-1">{assign.title}</h3>
                      <div className="text-xs font-bold text-slate-500 flex items-center gap-4">
                        <span className="flex items-center gap-1"><UserCheck className="w-3 h-3"/> المعلم: {assign.teachers?.users?.full_name || 'غير محدد'}</span>
                        <span className="flex items-center gap-1"><ListOrdered className="w-3 h-3"/> {assign.question_count || 0} أسئلة</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 border-t md:border-t-0 md:border-r border-slate-200 pt-4 md:pt-0 md:pr-4 shrink-0">
                      <button onClick={() => handleEditAssignment(assign)} className="flex-1 md:flex-none flex items-center justify-center gap-1 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-xs hover:bg-indigo-100 transition-colors">
                        <Edit3 className="w-4 h-4" /> تعديل
                      </button>
                      <button onClick={() => handleDeleteAssignment(assign.id)} className="flex-1 md:flex-none flex items-center justify-center gap-1 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-black text-xs hover:bg-rose-100 transition-colors">
                        <Trash2 className="w-4 h-4" /> حذف جذري
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'import' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-6 rounded-[2rem] shadow-sm border border-emerald-200 space-y-4">
            
            {skippedLog.length > 0 && (
               <div className="bg-rose-50 border-2 border-rose-200 p-4 rounded-xl shadow-inner mb-4">
                  <h3 className="text-rose-800 font-black flex items-center gap-2 mb-2"><AlertCircle className="w-5 h-5"/> تقرير الذكاء الاصطناعي: أسئلة لم يتم استخراجها</h3>
                  <p className="text-xs font-bold text-rose-600 mb-3">هناك أسئلة في الملف المرفق عجز الذكاء الاصطناعي عن تحويلها بسبب التعقيد البصري. يرجى إضافتها يدوياً إذا رغبت:</p>
                  <ul className="space-y-2">
                     {skippedLog.map((log, idx) => (
                        <li key={idx} className="bg-white p-3 rounded-lg border border-rose-100 flex flex-col sm:flex-row gap-2 justify-between">
                           <span className="font-black text-slate-800 text-sm">{log.question_hint}</span>
                           <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md">{log.reason}</span>
                        </li>
                     ))}
                  </ul>
               </div>
            )}

            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex gap-3 shadow-inner">
              <Info className="w-5 h-5 shrink-0 text-amber-500" />
              <div className="text-sm font-bold">
                <p className="font-black mb-1 text-amber-900">نصيحة ذهبية لضمان دقة 100% بدون تخطي:</p>
                لا تنسخ أكثر من (صفحة إلى صفحتين) من ملف الـ PDF في كل مرة تطلب فيها من ChatGPT توليد الكود. إذا نسخت نصوصاً طويلة جداً، سيتخيل الذكاء الاصطناعي ويتجاهل بعض الجداول والأسئلة بسبب نفاد ذاكرته المؤقتة. النظام هنا سيقوم بدمج جميع الدفعات التي تستوردها داخل نفس الدرس!
              </div>
            </div>
            <div className="flex items-center justify-between mb-4 mt-4">
              <h2 className="font-black text-lg text-emerald-800">مطابقة الأسئلة والأجوبة بالـ AI</h2>
              <button onClick={copyPrompt} className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-2 px-4 rounded-xl flex items-center gap-1 transition-colors border border-emerald-200 shadow-sm active:scale-95">
                <Copy className="w-4 h-4" /> انسخ البرومبت المطور (يشمل المقالي والرسم)
              </button>
            </div>
            <textarea value={manualJson} onChange={(e) => setManualJson(e.target.value)} placeholder="الصق كود الـ JSON هنا..." className="w-full h-40 bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-sm text-emerald-700 outline-none focus:border-emerald-500 resize-none shadow-inner" dir="ltr"></textarea>
            <button onClick={processManualJson} className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl hover:bg-emerald-700 flex justify-center items-center gap-2 shadow-md transition-all active:scale-95">
              <ClipboardPaste className="w-5 h-5" /> استيراد الكود وبناء البطاقات
            </button>
          </motion.div>
        )}

        {activeTab === 'builder' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-200 space-y-5">
              
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
                <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-inner w-full sm:w-auto flex-1 max-w-md">
                  {currentRole === 'teacher' ? (
                    <div className="flex-1 py-3 rounded-xl font-black text-sm bg-slate-800 text-white shadow-md flex justify-center items-center gap-2 cursor-default">
                      <FileText className="w-4 h-4" /> وضع الواجب الرسمي (مفعل دائماً)
                    </div>
                  ) : (
                    <>
                      <button onClick={() => setIsPracticeMode(true)} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all flex justify-center items-center gap-2 ${isPracticeMode ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                        <Gamepad2 className="w-4 h-4" /> بنك تدريب وتحدي
                      </button>
                      <button onClick={() => setIsPracticeMode(false)} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all flex justify-center items-center gap-2 ${!isPracticeMode ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                        <FileText className="w-4 h-4" /> واجب رسمي
                      </button>
                    </>
                  )}
                </div>
                <button onClick={() => handleResetBuilder(false)} className="w-full sm:w-auto px-5 py-3 bg-rose-50 text-rose-600 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors border border-rose-200 shadow-sm shrink-0">
                  <RefreshCcw className="w-4 h-4" /> إفراغ المحتوى
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">عنوان الواجب / الدرس</label>
                <input type="text" value={assignmentTitle} onChange={e => setAssignmentTitle(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-800 outline-none focus:border-indigo-500" />
              </div>
              
              {/* 🚀 القائمة المنسدلة للمعلمين التي كانت مفقودة للإدارة */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(currentRole === 'admin' || currentRole === 'management') ? (
                  <select 
                    value={selectedTeacher} 
                    onChange={e => { setSelectedTeacher(e.target.value); setSelectedSubject(''); setSelectedSections([]); }} 
                    className="w-full p-3.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl font-black outline-none focus:border-indigo-500 shadow-inner"
                  >
                    <option value="">توزيع ذكي (تلقائي للمربوطين بالمادة)</option>
                    {teachers.map((t:any) => <option key={t.id} value={t.id}>المعلم: {t.full_name}</option>)}
                  </select>
                ) : (
                  <div className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-500 flex items-center gap-2">
                    <UserCheck className="w-5 h-5" /> يتم الإسناد لحسابك تلقائياً
                  </div>
                )}
                
                <select value={selectedSubject} onChange={e => { setSelectedSubject(e.target.value); setSelectedSections([]); }} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none disabled:opacity-50">
                  <option value="">اختر المادة لتظهر الصفوف المستهدفة...</option>
                  {subjects.map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 mb-3">اختر الصفوف المستهدفة:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {!selectedSubject ? <span className="text-sm font-bold text-slate-400 col-span-full text-center py-4">يرجى اختيار المادة أولاً</span> : sections.map((sec:any) => (
                    <label key={sec.id} className="flex items-center gap-3 cursor-pointer p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all shadow-sm">
                      <input type="checkbox" checked={selectedSections.includes(sec.id)} onChange={() => toggleSection(sec.id)} className="accent-indigo-600 w-5 h-5 cursor-pointer rounded" />
                      <span className="text-sm font-bold text-slate-700">{sec.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {!isPracticeMode && (
                <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 shadow-inner space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="w-5 h-5 text-amber-600" />
                    <h3 className="font-black text-amber-800">إعدادات الواجب الرسمي المتقدمة</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-amber-700 mb-2">تاريخ ووقت إغلاق التسليم (الديدلاين)</label>
                      <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-3 bg-white border border-amber-200 rounded-xl font-bold text-slate-700 outline-none focus:border-amber-500" dir="ltr" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-amber-700 mb-2">سياسة التأخير (بعد انقضاء الوقت)</label>
                      <select value={latePolicy} onChange={e => setLatePolicy(e.target.value as any)} className="w-full p-3 bg-white border border-amber-200 rounded-xl font-bold text-slate-700 outline-none focus:border-amber-500">
                        <option value="allow">السماح بالتسليم المتأخر (مع وضع علامة متأخر)</option>
                        <option value="block">إغلاق الواجب تماماً وعدم السماح بالدخول</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-amber-700 mb-2">الدرجة العظمى في كشف الدرجات</label>
                      <input type="number" min="1" value={maxScore} onChange={e => setMaxScore(Number(e.target.value))} className="w-full p-3 bg-white border border-amber-200 rounded-xl font-black text-center text-slate-700 outline-none focus:border-amber-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-amber-700 mb-2">الوقت المسموح بالدقائق (0 = مفتوح)</label>
                      <input type="number" min="0" value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))} className="w-full p-3 bg-white border border-amber-200 rounded-xl font-black text-center text-slate-700 outline-none focus:border-amber-500" placeholder="مثال: 45 دقيقة" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 🚀 رادار الصور (The Missing Image Radar) */}
            {questionsNeedingImages.length > 0 && (
              <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-2xl shadow-inner flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-amber-800">
                  <div className="bg-amber-100 p-2 rounded-xl"><ImageIcon className="w-6 h-6 text-amber-600" /></div>
                  <div>
                    <h4 className="font-black text-sm">رادار الصور النشط</h4>
                    <p className="text-xs font-bold mt-0.5">اكتشف الذكاء الاصطناعي <span className="bg-amber-200 px-1.5 rounded text-amber-900">{questionsNeedingImages.length}</span> سؤال تعتمد على صور المنهج لكي تُحل.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setFilterNeedsImage(!filterNeedsImage)} 
                  className={`px-4 py-2 rounded-xl font-black text-xs transition-colors flex items-center gap-2 border ${filterNeedsImage ? 'bg-amber-500 text-white border-amber-600 shadow-md' : 'bg-white text-amber-600 border-amber-200 hover:bg-amber-100'}`}
                >
                  <Filter className="w-4 h-4" /> {filterNeedsImage ? 'عرض كل الأسئلة' : 'تصفية: المفقود فقط'}
                </button>
              </div>
            )}

            {/* قائمة الأسئلة */}
            <div className="space-y-4">
              <AnimatePresence>
                {displayedQuestions.map((q, i) => (
                  <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} key={q.id} className={`p-5 rounded-2xl shadow-sm border group relative transition-colors ${q.needs_image ? 'bg-amber-50/30 border-amber-300' : 'bg-white border-slate-200'}`}>
                    <div className="flex justify-between items-center mb-3">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${q.needs_image ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-600'}`}>
                        {i+1}. {translateType(q.type)}
                      </span>
                      <div className="flex gap-1 opacity-100 transition-opacity">
                         <button onClick={() => openPreview(questions.indexOf(q))} className="text-blue-600 bg-blue-50 p-2 rounded-lg hover:bg-blue-100 flex items-center gap-1 text-xs font-bold px-3">
                           <Eye className="w-4 h-4" /> معاينة
                         </button>
                         <button onClick={() => openEditQuestion(questions.indexOf(q))} className="text-amber-600 bg-amber-50 p-2 rounded-lg hover:bg-amber-100"><Edit3 className="w-4 h-4" /></button>
                         <button onClick={() => deleteQuestion(questions.indexOf(q))} className="text-rose-600 bg-rose-50 p-2 rounded-lg hover:bg-rose-100"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>

                    {/* 🚀 أداة الرفع السريع للصورة المفقودة */}
                    {q.needs_image && (
                      <div className="mb-4 bg-orange-100/50 border border-orange-200 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
                        <div className="flex items-center gap-3 text-orange-800">
                          <AlertCircle className="w-5 h-5 text-orange-600 shrink-0" />
                          <div className="text-xs font-bold">هذا السؤال يتطلب صورة مرافقة ليتمكن الطالب من الحل (مثال: من الشكل المجاور).</div>
                        </div>
                        
                        <div className="relative shrink-0 w-full sm:w-auto">
                          <input 
                             type="file" 
                             accept="image/*" 
                             onChange={(e) => handleQuickImageUpload(e, q.id)}
                             className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                             disabled={uploadingImageId === q.id}
                          />
                          <button disabled={uploadingImageId === q.id} className="w-full sm:w-auto px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs rounded-lg shadow-md flex items-center justify-center gap-2 disabled:opacity-50">
                             {uploadingImageId === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                             {uploadingImageId === q.id ? 'جاري الرفع...' : 'رفع الصورة المفقودة'}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="tiptap-content prose prose-sm max-w-none font-bold text-indigo-950 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderHTMLWithMath(q.content_html) }} />
                    
                    {q.model_answer_html && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2">
                         <Target className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                         <div className="tiptap-content prose prose-sm max-w-none text-[10px] font-bold text-emerald-700" dangerouslySetInnerHTML={{ __html: renderHTMLWithMath(q.model_answer_html) }} />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {displayedQuestions.length === 0 && filterNeedsImage && (
                 <div className="text-center p-10 bg-emerald-50 border-2 border-dashed border-emerald-200 rounded-2xl text-emerald-600 font-black">
                   <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                   رائع! لا يوجد أي أسئلة تحتاج إلى صور في هذا الدرس.
                 </div>
              )}
            </div>

            {/* 🚀 أزرار إضافة الأسئلة */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button onClick={openNewQuestion} className="flex-1 border-2 border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 font-black py-4 rounded-[1.5rem] flex justify-center items-center gap-2 transition-colors">
                <Plus className="w-5 h-5" /> إضافة سؤال يدوياً
              </button>
              <button onClick={() => setIsImportModalOpen(true)} className="flex-1 border-2 border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 font-black py-4 rounded-[1.5rem] flex justify-center items-center gap-2 transition-colors">
                <FileJson className="w-5 h-5" /> دمج أسئلة إضافية عبر كود (JSON)
              </button>
            </div>

            {questions.length > 0 && (
              <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl text-white space-y-4 mt-8">
                <div className="flex items-center justify-between">
                   <p className="font-black">جاهز للنشر؟ ({questions.length}) سؤال</p>
                   <select value={assignmentStatus} onChange={e => setAssignmentStatus(e.target.value as 'draft'|'published')} className="bg-slate-800 border border-slate-700 p-2 rounded-lg text-xs font-black outline-none">
                      <option value="draft">حفظ كمسودة (مخفي)</option>
                      <option value="published">نشر للطلاب فوراً</option>
                   </select>
                </div>
                <button onClick={saveAssignmentToDB} disabled={isSavingDB} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                  {isSavingDB ? <Loader2 className="animate-spin w-5 h-5"/> : <Save className="w-5 h-5"/>}
                  {editingAssignmentId ? 'حفظ التعديلات وتحديث الدرس' : 'اعتماد وتوزيع الدرس'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* 🚀 Modal الاستيراد السريع (JSON) داخل وضع الإنشاء */}
      <AnimatePresence>
        {isImportModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={() => setIsImportModalOpen(false)} />
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }} 
               animate={{ opacity: 1, scale: 1 }} 
               exit={{ opacity: 0, scale: 0.95 }} 
               className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-2xl bg-white rounded-3xl shadow-2xl z-50 overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]" 
               dir="rtl"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50 shrink-0">
                <h3 className="font-black text-emerald-800 flex items-center gap-2">
                  <FileJson className="w-5 h-5 text-emerald-600"/> لصق كود الأسئلة الإضافية (JSON)
                </h3>
                <button onClick={() => setIsImportModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-white rounded-full transition-colors"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="p-6 overflow-auto custom-scrollbar flex-1 space-y-4">
                 <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 shadow-inner">
                    <Info className="w-5 h-5 shrink-0 text-amber-500" />
                    <p className="text-xs font-bold text-amber-800">
                      سيتم إضافة هذه الأسئلة إلى نهاية الدرس الحالي دون مسح الأسئلة الموجودة مسبقاً.
                    </p>
                 </div>
                 <textarea 
                    value={manualJson} 
                    onChange={(e) => setManualJson(e.target.value)} 
                    placeholder="الصق كود الـ JSON هنا..." 
                    className="w-full h-48 bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-sm text-emerald-700 outline-none focus:border-emerald-500 resize-none shadow-inner" 
                    dir="ltr"
                 ></textarea>
              </div>

              <div className="p-5 flex gap-3 border-t border-slate-100 shrink-0 bg-white">
                <button onClick={() => setIsImportModalOpen(false)} className="flex-1 py-3.5 bg-slate-100 text-slate-600 border border-slate-200 font-black rounded-xl hover:bg-slate-200 transition-colors active:scale-95 text-sm shadow-sm">إلغاء</button>
                <button onClick={processManualJson} className="flex-[2] py-3.5 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 text-sm">
                  <ClipboardPaste className="w-5 h-5" /> دمج الأسئلة مع الدرس الحالي
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 🚀 Modal محرر الأسئلة (Editor) */}
      <AnimatePresence>
        {isEditorOpen && currentQ && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={() => setIsEditorOpen(false)} />
            <motion.div 
               initial={{ opacity: 0, y: 100 }} 
               animate={{ opacity: 1, y: 0 }} 
               exit={{ opacity: 0, y: 100 }} 
               className="fixed bottom-0 left-0 w-full sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-4xl bg-slate-100 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl z-50 overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]" 
               dir="rtl"
            >
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-indigo-600"/> {editingIndex !== null ? 'تعديل السؤال' : 'سؤال جديد'}
                </h3>
                <button onClick={() => setIsEditorOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 bg-slate-50 rounded-full transition-colors"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="p-5 overflow-auto custom-scrollbar flex-1 space-y-6">
                 
                 <div className="flex gap-4 items-center bg-white p-4 rounded-2xl border border-slate-200">
                    <div className="flex-1">
                       <label className="block text-xs font-bold text-slate-500 mb-2">نوع السؤال</label>
                       <select value={currentQ.type} onChange={(e) => setCurrentQ({...currentQ, type: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-bold outline-none focus:border-indigo-500 text-sm">
                          <option value="essay">مقالي / رسم / استنتاج / مسألة</option>
                          <option value="multiple_choice">اختيار من متعدد</option>
                          <option value="true_false">صح أو خطأ</option>
                          <option value="section_header">ترويسة / نص عام (بدون إجابة)</option>
                       </select>
                    </div>
                    <div className="w-24">
                       <label className="block text-xs font-bold text-slate-500 mb-2">الدرجة</label>
                       <input type="number" min="0" value={currentQ.points} onChange={(e) => setCurrentQ({...currentQ, points: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-black outline-none focus:border-indigo-500 text-sm text-center" />
                    </div>
                 </div>

                 {/* 🚀 إزالة/إضافة احتياج للصورة يدوياً من المحرر */}
                 <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-black text-slate-700">هل يحتاج السؤال إلى صورة للحل؟</label>
                      <p className="text-xs text-slate-500 font-bold mt-1">تفعيل هذا الخيار سيضع السؤال في رادار الصور المفقودة.</p>
                    </div>
                    <input type="checkbox" checked={currentQ.needs_image} onChange={(e) => setCurrentQ({...currentQ, needs_image: e.target.checked})} className="w-6 h-6 accent-indigo-600" />
                 </div>

                 <div className="space-y-2">
                    <label className="block text-sm font-black text-slate-700 flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-500"/> نص السؤال</label>
                    <TiptapEditor content={currentQ.content_html} onChange={(html) => setCurrentQ({...currentQ, content_html: html})} placeholder="اكتب نص السؤال هنا... يمكن لصق صور للأسئلة." />
                 </div>

                 {currentQ.type !== 'section_header' && (
                    <div className="space-y-2">
                       <label className="block text-sm font-black text-emerald-700 flex items-center gap-2 mt-4"><Target className="w-4 h-4"/> الإجابة النموذجية (تظهر للطالب بعد الحل)</label>
                       <TiptapEditor content={currentQ.model_answer_html || ''} onChange={(html) => setCurrentQ({...currentQ, model_answer_html: html})} placeholder="اكتب الإجابة النموذجية أو خطوات الحل هنا..." />
                    </div>
                 )}

                 {currentQ.type === 'multiple_choice' && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                       <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-black text-slate-700">خيارات الإجابة</label>
                          <span className="text-xs text-rose-500 font-bold bg-rose-50 px-2 py-1 rounded-md">حدد الإجابة الصحيحة بعلامة (صح)</span>
                       </div>
                       {currentQ.options.map((opt, oIdx) => (
                          <div key={opt.id} className={`flex items-center gap-2 p-2 border rounded-xl transition-all ${opt.is_correct ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 bg-slate-50'}`}>
                             <button onClick={() => toggleCorrectOption(opt.id)} className={`p-2 rounded-lg shrink-0 ${opt.is_correct ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400 hover:bg-slate-300'}`}>
                                <CheckSquare className="w-5 h-5"/>
                             </button>
                             <input type="text" value={opt.content} onChange={(e) => updateOptionContent(opt.id, e.target.value)} className={`flex-1 bg-transparent border-none outline-none font-bold text-sm ${opt.is_correct ? 'text-emerald-900' : 'text-slate-700'}`} placeholder={`الخيار رقم ${oIdx + 1}`} />
                             <button onClick={() => removeOption(opt.id)} className="p-2 text-rose-400 hover:bg-rose-100 rounded-lg shrink-0"><Trash2 className="w-4 h-4"/></button>
                          </div>
                       ))}
                       <button onClick={addOption} className="w-full py-3 bg-slate-100 text-slate-600 font-black text-xs rounded-xl hover:bg-slate-200 flex items-center justify-center gap-1 border border-slate-200 border-dashed">
                          <Plus className="w-4 h-4"/> إضافة خيار جديد
                       </button>
                    </div>
                 )}

                 {currentQ.type === 'true_false' && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                       <label className="text-sm font-black text-slate-700 block mb-2">حدد الإجابة الصحيحة:</label>
                       <div className="flex gap-4">
                          <button onClick={() => { setCurrentQ({...currentQ, options: [{id: '1', content: 'صح', is_correct: true}, {id: '2', content: 'خطأ', is_correct: false}]}) }} className={`flex-1 py-4 rounded-xl font-black text-sm border-2 transition-all ${currentQ.options.find(o => o.content === 'صح' && o.is_correct) ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                             العبارة صحيحة
                          </button>
                          <button onClick={() => { setCurrentQ({...currentQ, options: [{id: '1', content: 'صح', is_correct: false}, {id: '2', content: 'خطأ', is_correct: true}]}) }} className={`flex-1 py-4 rounded-xl font-black text-sm border-2 transition-all ${currentQ.options.find(o => o.content === 'خطأ' && o.is_correct) ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                             العبارة خاطئة
                          </button>
                       </div>
                    </div>
                 )}
              </div>

              <div className="p-5 flex gap-3 border-t border-slate-200 shrink-0 bg-white">
                <button onClick={() => setIsEditorOpen(false)} className="flex-1 py-3.5 bg-slate-100 text-slate-600 border border-slate-200 font-black rounded-xl hover:bg-slate-200 transition-colors active:scale-95 text-sm shadow-sm">إلغاء</button>
                <button onClick={saveQuestion} className="flex-[2] py-3.5 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 text-sm">
                  <Save className="w-5 h-5" /> {editingIndex !== null ? 'تحديث وحفظ' : 'إضافة للدرس'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 🚀 Modal المعاينة (Preview) */}
      <AnimatePresence>
        {isPreviewOpen && previewQ && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={() => setIsPreviewOpen(false)} />
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }} 
               animate={{ opacity: 1, scale: 1 }} 
               exit={{ opacity: 0, scale: 0.95 }} 
               className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-2xl bg-white rounded-3xl shadow-2xl z-50 overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]" 
               dir="rtl"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                <h3 className="font-black text-slate-800 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-500"/> معاينة بطاقة السؤال
                </h3>
                <button onClick={() => setIsPreviewOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="p-6 overflow-auto custom-scrollbar flex-1">
                 <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                       <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg uppercase tracking-widest">{translateType(previewQ.type)}</span>
                       <span className="text-xs font-black text-amber-500 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">{previewQ.points} درجات</span>
                    </div>

                    <div className="tiptap-content prose prose-slate max-w-none font-bold text-slate-800 text-lg leading-relaxed mb-8" dangerouslySetInnerHTML={{ __html: renderHTMLWithMath(previewQ.content_html) }} />

                    {previewQ.type === 'multiple_choice' && (
                       <div className="space-y-3">
                          {previewQ.options.map((opt, idx) => (
                             <div key={opt.id} className={`p-4 rounded-xl border-2 font-bold text-sm transition-all ${opt.is_correct ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'}`}>
                                {idx + 1}. {opt.content}
                                {opt.is_correct && <CheckCircle2 className="inline-block mr-2 w-4 h-4 text-emerald-500"/>}
                             </div>
                          ))}
                       </div>
                    )}

                    {previewQ.type === 'true_false' && (
                       <div className="flex gap-4">
                          {previewQ.options.map(opt => (
                             <div key={opt.id} className={`flex-1 p-4 rounded-xl border-2 font-black text-center transition-all ${opt.is_correct ? (opt.content==='صح'?'border-emerald-500 bg-emerald-50 text-emerald-700':'border-rose-500 bg-rose-50 text-rose-700') : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                                {opt.content}
                             </div>
                          ))}
                       </div>
                    )}

                    {previewQ.type === 'essay' && (
                       <div className="w-full h-32 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 font-bold text-sm">
                          مساحة إجابة الطالب (نصية أو رسم حر)
                       </div>
                    )}

                    {previewQ.model_answer_html && (
                       <div className="mt-8 pt-6 border-t border-slate-200">
                          <h4 className="font-black text-emerald-700 mb-3 flex items-center gap-2"><Target className="w-5 h-5"/> الإجابة النموذجية</h4>
                          <div className="tiptap-content prose prose-sm max-w-none font-bold text-emerald-900 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100" dangerouslySetInnerHTML={{ __html: renderHTMLWithMath(previewQ.model_answer_html) }} />
                       </div>
                    )}
                 </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
