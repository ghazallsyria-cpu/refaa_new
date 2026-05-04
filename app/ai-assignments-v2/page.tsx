
// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, CheckCircle2, AlertCircle, Sparkles, 
  Copy, ClipboardPaste, ShieldCheck, Edit3, Trash2, 
  Plus, Save, X, UserCheck, ListOrdered, FileJson,
  Bold, Italic, Underline as UnderlineIcon, AlignRight, AlignCenter, AlignLeft,
  List, ImageIcon, Table as TableIcon, Calculator, FlaskConical, Loader2, CheckSquare, Gamepad2, Database, Clock, RefreshCcw, Eye, Target, Quote, BrainCircuit, BarChart3, GraduationCap, Lightbulb, Network, Info, Calendar, Settings
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
import Latex from 'react-latex-next';

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

const TypewriterRevealFast = ({ htmlContent }: { htmlContent: string }) => {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (htmlContent) timer = setTimeout(() => { setRevealed(true); }, 150);
    return () => { clearTimeout(timer); setRevealed(false); };
  }, [htmlContent]);
  return (
    <div className="relative">
      <motion.div
        initial={{ clipPath: "polygon(0 0, 100% 0, 100% 0, 0 0)" }}
        animate={{ clipPath: revealed ? "polygon(0 0, 100% 0, 100% 100%, 0 100%)" : "polygon(0 0, 100% 0, 100% 0, 0 0)" }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="tiptap-content prose prose-slate max-w-none font-bold text-indigo-950 leading-relaxed text-sm"
        dangerouslySetInnerHTML={{ __html: renderHTMLWithMath(htmlContent) }}
      />
    </div>
  );
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
            const uploadToCloudinary = async () => {
              setIsUploading(true);
              try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '');
                const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
                const data = await res.json();
                if (data.secure_url) {
                  const node = view.state.schema.nodes.image.create({ src: data.secure_url });
                  const transaction = view.state.tr.replaceSelectionWith(node);
                  view.dispatch(transaction);
                }
              } catch (err: any) { alert("حدث خطأ أثناء رفع الصورة لـ Cloudinary"); } finally { setIsUploading(false); }
            };
            uploadToCloudinary();
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
  const [manualJson, setManualJson] = useState('');
  const [skippedLog, setSkippedLog] = useState<{question_hint: string, reason: string}[]>([]); // 🚀 مصفوفة لتخزين الأسئلة المتخطاة
  
  const [isSavingDB, setIsSavingDB] = useState(false);
  const [globalMessage, setGlobalMessage] = useState({ text: '', type: '' });

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentQ, setCurrentQ] = useState<Question | null>(null);

  const [manageAssignments, setManageAssignments] = useState<any[]>([]);
  const [teacherStats, setTeacherStats] = useState<{name: string, count: number}[]>([]); 
  const [isManageLoading, setIsManageLoading] = useState(false);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewQ, setPreviewQ] = useState<Question | null>(null);

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
      } else {
        setSubjects([]);
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
        const formatted = (data || []).map((sec: any) => ({
          id: sec.id,
          name: `${sec.classes?.name || ''} - ${sec.name}`
        }));
        setSections(formatted);
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
      let query = supabase.from('assignments_v2').select('*, assignment_questions_v2(id)').order('created_at', { ascending: false }).limit(1000);
      
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

      const { data: subjectsList } = await supabase.from('subjects').select('id, name');
      const { data: teachersList } = await supabase.from('teachers').select('id, users(full_name)');

      const mergedData = assignments.map(assign => {
        const sub = subjectsList?.find(s => s.id === assign.subject_id);
        const teacher = teachersList?.find(t => t.id === assign.teacher_id);
        return {
          ...assign,
          subjects: { name: sub?.name || 'مادة غير محددة' },
          teachers: { users: { full_name: teacher?.users?.full_name || 'توزيع ذكي (متعدد)' } },
          question_count: assign.assignment_questions_v2?.length || 0 
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
    } catch (err: any) { console.error(err); } finally { setIsManageLoading(false); }
  };

  const toggleSection = (id: string) => setSelectedSections(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

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

  const handleEditAssignment = async (assign: any) => {
    try {
      const { data: qData } = await supabase.from('assignment_questions_v2').select('*').eq('assignment_id', assign.id).order('order_index', { ascending: true });
      const { data: sData } = await supabase.from('assignment_sections_v2').select('*').eq('assignment_id', assign.id);
      
      setAssignmentTitle(assign.title);
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

  // 🚀 تطوير البرومبت ليشمل أسئلة الرسم وتوضيح أسباب التخطي
  const copyPrompt = () => { 
    const basePromptText = String.raw`أنت خبير تعليمي متمرس ومبرمج JSON صارم الدقة. سأعطيك نصاً مقتطعاً من بنك أسئلة أو اختبار.
المطلوب استخراج الناتج بصيغة JSON فقط لتطبيق تعليمي تفاعلي. 🚨 إياك أن تتخيل أسئلة أو صور غير موجودة.

قوانين التصنيف "type":
- "multiple_choice": أسئلة الاختيار من متعدد (ضع الخيارات في مصفوفة "options").
- "true_false": الصح والخطأ (قم بتوليد خياري "صح" و "خطأ" وحدد الصحيح).
- "essay": التعاليل، المقارنات، المصطلح العلمي، ماذا يحدث، والمسائل الرياضية المباشرة.
- "section_header": العناوين الرئيسية فقط (مثل: السؤال الأول).

🎨 قوانين أسئلة "الرسم" ("type": "essay"):
- إذا كان السؤال يطلب من الطالب صراحة "الرسم" (مثل: ارسم المنحنيات البيانية، أكمل مسار الشعاع، ارسم الدائرة)، اجعل نوعه "essay"، وأضف جملة واضحة في نهايته: "(يمكنك استخدام السبورة الذكية لرسم الإجابة وإرفاقها)".

📸 رادار الصور ("needs_image"): 
- اجعله true **فقط وحصراً** إذا كان نص السؤال يشير لصورة يجب أن يراها الطالب ليحل (مثل: من الشكل المجاور، في الرسم البياني الموضح أدناه). لا تضعه true لأسئلة الرسم العادية التي يبدأ الطالب برسمها من ورقة بيضاء.

🛑 الإبلاغ عن الأسئلة المتخطاة (إجباري):
إذا واجهت سؤالاً معقداً لم تتمكن من تحويله (بسبب تداخل الجداول المعقدة جداً، أو رسومات لا يمكن فهمها من النص)، **لا تتجاهله بصمت**. بل أضف لمحة عنه في مصفوفة "skipped_questions" واذكر السبب بوضوح ليعلم المعلم.

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
      "content": "ارسم العلاقة البيانية بين زاوية السقوط والانعكاس. <br><br> <i>(يمكنك استخدام السبورة الذكية لرسم الإجابة وإرفاقها)</i>",
      "needs_image": false, 
      "model_answer_html": "<b>خطوات الحل:</b> <br> نرسم خط مستقيم يمر بنقطة الأصل وميله يساوي 1.",
      "points": 1,
      "options": []
    }
  ]
}

إليك النص (استخرج جميع الأسئلة كاملة بدقة):`;
    navigator.clipboard.writeText(basePromptText); 
    alert('تم نسخ البرومبت الصارم المطور! 🚨\nلقد أضفنا ميزة التعامل مع أسئلة الرسم وإجبار الذكاء الاصطناعي على الاعتراف بالأسئلة التي عجز عنها لتتمكن من إضافتها يدوياً.'); 
  };

  const processManualJson = () => {
    if (!manualJson.trim()) { alert('يرجى لصق الكود أولاً.'); return; }
    try {
      let safeJsonStr = manualJson;
      const firstBrace = safeJsonStr.indexOf('{');
      const lastBrace = safeJsonStr.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) safeJsonStr = safeJsonStr.substring(firstBrace, lastBrace + 1);
      else throw new Error('لم يتم العثور على صيغة JSON صحيحة');

      const parsedData = JSON.parse(safeJsonStr);
      const newQuestions = (parsedData.questions || []).map((q:any) => {
        let opts = [];
        if (Array.isArray(q.options)) {
          opts = q.options.map((opt:any) => {
            if (typeof opt === 'string') {
               const cleanOpt = opt.trim();
               const cleanModel = q.model_answer_html ? q.model_answer_html.replace(/<[^>]+>/g, '').trim() : '';
               const isMatch = cleanModel && cleanOpt === cleanModel;
               return { id: crypto.randomUUID(), content: opt, is_correct: !!isMatch };
            } else {
               const isCorrectVal = opt.is_correct === true || opt.is_correct === 'true' || opt.isCorrect === true || opt.isCorrect === 'true';
               return { id: crypto.randomUUID(), content: String(opt.content || ''), is_correct: isCorrectVal };
            }
          });
          if (q.type === 'multiple_choice' && opts.length > 0 && !opts.some((o:any) => o.is_correct)) opts[0].is_correct = true;
        }
        const parsedPoints = Number(q.points);
        return {
          id: crypto.randomUUID(),
          content_html: q.content || q.section_header || '',
          model_answer_html: q.model_answer_html || '', 
          type: q.type || 'essay',
          points: isNaN(parsedPoints) ? 1 : parsedPoints, 
          needs_image: !!q.needs_image,
          options: opts,
        };
      });

      // 🚀 إعلام المعلم بالأسئلة المتخطاة
      if (parsedData.skipped_questions && parsedData.skipped_questions.length > 0) {
        setSkippedLog(parsedData.skipped_questions);
      } else {
        setSkippedLog([]);
      }

      setAssignmentTitle(prev => prev === 'واجب جديد' || prev === 'بنك تدريب جديد' ? (parsedData.title || 'بنك مستورد بذكاء') : prev);
      setQuestions(prev => [...prev, ...newQuestions]); 
      setManualJson(''); 
      setManualJsonError(null);
      setActiveTab('builder');
    } catch (err: any) { alert('الكود المنسوخ غير صالح للأسف ❌\nيرجى التأكد من نسخ الرد بالكامل من ChatGPT وعدم انقطاعه في المنتصف.'); }
  };

  const openNewQuestion = () => {
    setCurrentQ({ id: crypto.randomUUID(), type: 'essay', content_html: '', model_answer_html: '', points: 1, options: [], needs_image: false });
    setEditingIndex(null);
    setIsEditorOpen(true);
  };

  const openEditQuestion = (index: number) => {
    const questionToEdit = JSON.parse(JSON.stringify(questions[index]));
    questionToEdit.needs_image = false; 
    setCurrentQ(questionToEdit);
    setEditingIndex(index);
    setIsEditorOpen(true);
  };

  const openPreview = (index: number) => {
    setPreviewQ(questions[index]);
    setShowPreviewHint(false); 
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
      const descriptionPayload = isPracticeMode ? 'بنك تدريب تفاعلي' : JSON.stringify({
        text: "واجب رسمي", timeLimit: timeLimit, latePolicy: latePolicy, maxScore: maxScore
      });

      const finalDueDate = isPracticeMode ? new Date(new Date().setDate(new Date().getDate() + 7)).toISOString() : new Date(dueDate).toISOString();

      let teacherSectionMap = new Map<string, string[]>();

      if (currentRole === 'admin' || currentRole === 'management') {
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
        const { data: tData } = await supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle();
        if (tData?.id) teacherSectionMap.set(tData.id, selectedSections);
        else teacherSectionMap.set('unassigned', selectedSections);
      }

      if (editingAssignmentId) {
        const { error: assignErr } = await supabase.from('assignments_v2').update({ 
          title: assignmentTitle, description: descriptionPayload, subject_id: selectedSubject, status: assignmentStatus, is_practice_mode: isPracticeMode, due_date: finalDueDate
        }).eq('id', editingAssignmentId);
        
        if (assignErr) throw assignErr;

        await supabase.from('assignment_sections_v2').delete().eq('assignment_id', editingAssignmentId);
        await supabase.from('assignment_questions_v2').delete().eq('assignment_id', editingAssignmentId);

        const sectionsPayload = selectedSections.map(secId => ({ assignment_id: editingAssignmentId, section_id: secId }));
        await supabase.from('assignment_sections_v2').insert(sectionsPayload);

        const questionsPayload = questions.map((q, index) => ({ 
          assignment_id: editingAssignmentId, question_type: q.type, content_html: q.content_html, model_answer_html: q.model_answer_html, points: q.points, 
          options: (q.options || []).map(o => ({ ...o, is_correct: o.is_correct === true })), order_index: index + 1 
        }));
        await supabase.from('assignment_questions_v2').insert(questionsPayload);

      } else {
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
            assignment_id: finalAssignmentId, question_type: q.type, content_html: q.content_html, model_answer_html: q.model_answer_html, points: q.points, 
            options: (q.options || []).map(o => ({ ...o, is_correct: o.is_correct === true })), order_index: index + 1 
          }));
          await supabase.from('assignment_questions_v2').insert(questionsPayload);
        }
      }

      setGlobalMessage({ text: editingAssignmentId ? 'تم تحديث الواجب بنجاح!' : 'تم توزيع الواجب للطلاب بنجاح!', type: 'success' });
      setTimeout(() => { setActiveTab('manage'); setGlobalMessage({text:'', type:''}); handleResetBuilder(true); }, 2000);
    } catch (err: any) { alert('حدث خطأ أثناء الحفظ. تأكد من اكتمال البيانات.'); } finally { setIsSavingDB(false); }
  };

  const translateType = (t: string) => {
    const types:any = { 'multiple_choice': 'اختياري', 'true_false': 'صح/خطأ', 'essay': 'مقالي / رسم / تفاعلي', 'section_header': 'ترويسة/نص عام' };
    return types[t] || t;
  };

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
            <ListOrdered className="w-4 h-4" /> {editingAssignmentId ? 'تعديل الدرس' : 'إعداد وتوزيع واجب جديد'}
          </button>
          <button onClick={() => setActiveTab('import')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'import' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
            <FileJson className="w-4 h-4" /> استيراد ذكي (AI)
          </button>
          <button onClick={() => setActiveTab('manage')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'manage' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Database className="w-4 h-4" /> إدارة السجلات
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
                <Copy className="w-4 h-4" /> انسخ البرومبت المطور (يشمل الرسم)
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(currentRole === 'admin' || currentRole === 'management') ? (
                  <div className="w-full p-3.5 bg-indigo-50/80 text-indigo-700 border border-indigo-200 rounded-xl font-bold flex items-center gap-3 shadow-inner">
                    <Network className="w-5 h-5 shrink-0"/> 
                    <span className="text-xs leading-relaxed">
                      <strong>نظام التوزيع الذكي:</strong> حدد المادة والصفوف، وسيقوم النظام أوتوماتيكياً بتقسيم الواجب وإرساله لحسابات معلمي هذه المادة.
                    </span>
                  </div>
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

            <div className="space-y-4">
              <div className="space-y-4">
                {questions.map((q, i) => (
                  <div key={q.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                      <span className="text-sm font-black text-indigo-700">{i + 1}. {translateType(q.type)}</span>
                      <div className="flex gap-2">
                        <button onClick={() => openPreview(i)} className="text-blue-600 bg-blue-50 p-2 rounded-lg hover:bg-blue-100 flex items-center gap-1 text-xs font-bold px-3">
                          <Eye className="w-4 h-4" /> معاينة
                        </button>
                        <button onClick={() => openEditQuestion(i)} className="text-amber-600 bg-amber-50 p-2 rounded-lg hover:bg-amber-100"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => deleteQuestion(i)} className="text-rose-600 bg-rose-50 p-2 rounded-lg hover:bg-rose-100"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    
                    {q.needs_image && (
                      <div className="mb-4 bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded-xl flex items-center gap-3 shadow-inner animate-pulse">
                        <ImageIcon className="w-5 h-5 text-orange-500 shrink-0" />
                        <div>
                          <p className="text-xs font-black">الذكاء الاصطناعي يخبرك: هذا السؤال ينقصه صورة!</p>
                          <p className="text-[10px] font-bold opacity-80">اضغط على زر (تعديل) وقم بإرفاق الصورة من جهازك داخل نص السؤال، أو اتركها إذا كان السؤال يعتمد على رسم الطالب.</p>
                        </div>
                      </div>
                    )}

                    <div className="tiptap-content prose prose-slate max-w-none font-bold text-slate-800" dangerouslySetInnerHTML={{ __html: renderHTMLWithMath(q.content_html) }}></div>
                  </div>
                ))}
              </div>
              <button onClick={openNewQuestion} className="w-full border-2 border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 font-black py-4 rounded-[2rem] flex justify-center items-center gap-2 transition-colors">
                <Plus className="w-5 h-5" /> إضافة سؤال جديد
              </button>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 mt-8 space-y-4">
              <label className="block text-xs font-bold text-slate-500">حالة الواجب عند الحفظ</label>
              <select value={assignmentStatus} onChange={e => setAssignmentStatus(e.target.value as 'draft'|'published')} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-black text-indigo-700 outline-none shadow-sm">
                <option value="draft">حفظ كمسودة (مخفي)</option>
                <option value="published">نشر للطلاب</option>
              </select>

              <button onClick={saveAssignmentToDB} disabled={isSavingDB} className={`w-full text-white font-black text-lg py-4 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${editingAssignmentId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-slate-800'}`}>
                {isSavingDB ? <Loader2 className="animate-spin w-5 h-5" /> : (editingAssignmentId ? <RefreshCcw className="w-5 h-5" /> : <Save className="w-5 h-5" />)} 
                {editingAssignmentId ? 'حفظ التعديلات وتحديث الواجب' : 'توزيع الواجب للطلاب'}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
