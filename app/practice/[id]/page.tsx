// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context'; 
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, XCircle, ChevronRight, Sparkles, 
  Lightbulb, ArrowRight, BrainCircuit, Trophy, RefreshCcw, Target, Quote, Flame, Clock, Download, FileText, AlertTriangle, MonitorPlay, ShieldAlert, Edit3,
  Bold, Italic, Underline as UnderlineIcon, AlignRight, AlignCenter, AlignLeft, Table as TableIcon, Calculator, ClipboardPaste, PenTool, Image as ImageIcon, Eraser, Palette, Save as SaveIcon, Loader2
} from 'lucide-react';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import ImageExtension from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';

import katex from 'katex';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';
import confetti from 'canvas-confetti'; 

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils'; // 🚀 أضفنا دالة الدمج

const renderHTMLWithMath = (html: string) => {
  if (!html) return '';
  let parsed = html;
  if (typeof window !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(parsed, 'text/html');
      const images = doc.querySelectorAll('img');
      images.forEach((img) => {
        if (img.src && img.src.startsWith('http')) img.setAttribute('crossorigin', 'anonymous');
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

const safeParseOptions = (optionsData: any) => {
  if (!optionsData) return [];
  let parsed = [];
  if (Array.isArray(optionsData)) parsed = optionsData;
  else if (typeof optionsData === 'string') {
    try { parsed = JSON.parse(optionsData); } catch (e) { return []; }
  }
  return parsed.map((opt: any) => ({ ...opt, is_correct: opt.is_correct === true || opt.is_correct === 'true' || opt.isCorrect === true || opt.isCorrect === 'true' }));
};

const TypewriterReveal = ({ htmlContent }: { htmlContent: string }) => {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    setRevealed(false);
    const timer = setTimeout(() => { setRevealed(true); }, 100);
    return () => clearTimeout(timer);
  }, [htmlContent]);

  return (
    <div className="relative">
      <motion.div
        initial={{ clipPath: "polygon(0 0, 100% 0, 100% 0, 0 0)" }}
        animate={{ clipPath: revealed ? "polygon(0 0, 100% 0, 100% 100%, 0 100%)" : "polygon(0 0, 100% 0, 100% 0, 0 0)" }}
        transition={{ duration: 3.5, ease: "easeOut" }}
        className="tiptap-content prose prose-slate max-w-none font-bold text-indigo-300 leading-relaxed text-base drop-shadow-sm"
        dangerouslySetInnerHTML={{ __html: renderHTMLWithMath(htmlContent) }}
      />
      <AnimatePresence>
        {!revealed && (
          <motion.div initial={{ opacity: 1 }} animate={{ opacity: [1, 0, 1], y: [0, 50, 100] }} exit={{ opacity: 0 }} transition={{ duration: 3.5, ease: "linear" }} className="absolute left-0 w-full h-[2px] bg-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.8)] z-10" />
        )}
      </AnimatePresence>
    </div>
  );
};

const WhiteboardModal = ({ isOpen, onClose, onSave }: { isOpen: boolean, onClose: () => void, onSave: (dataUrl: string) => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#1e293b'); 
  const [lineWidth, setLineWidth] = useState(3);
  const [isEraser, setIsEraser] = useState(false);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [isOpen]);

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX = e.clientX;
    let clientY = e.clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: any) => {
    e.preventDefault(); 
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.strokeStyle = isEraser ? '#ffffff' : color;
    ctx.lineWidth = isEraser ? 15 : lineWidth;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#02040a]/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="glass-panel border-indigo-500/30 rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)] relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none mix-blend-screen"></div>
        <div className="bg-[#0f1423]/80 backdrop-blur-xl p-4 sm:p-5 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 shrink-0 relative z-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1 bg-[#02040a]/40 p-1 sm:p-1.5 rounded-xl border border-white/5 shadow-inner">
               <button onClick={() => { setIsEraser(false); setColor('#1e293b'); }} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${!isEraser && color === '#1e293b' ? 'bg-slate-200 shadow-md' : 'hover:bg-white/10'}`}>
                 <div className="w-4 h-4 rounded-full bg-slate-800 border border-slate-900/20"></div>
               </button>
               <button onClick={() => { setIsEraser(false); setColor('#3b82f6'); }} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${!isEraser && color === '#3b82f6' ? 'bg-blue-500 shadow-md shadow-blue-500/50' : 'hover:bg-white/10'}`}>
                 <div className="w-4 h-4 rounded-full bg-blue-500 border border-blue-600"></div>
               </button>
               <button onClick={() => { setIsEraser(false); setColor('#ef4444'); }} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${!isEraser && color === '#ef4444' ? 'bg-rose-500 shadow-md shadow-rose-500/50' : 'hover:bg-white/10'}`}>
                 <div className="w-4 h-4 rounded-full bg-rose-500 border border-rose-600"></div>
               </button>
            </div>
            
            <div className="w-px h-8 bg-white/10 mx-1"></div>
            
            <button onClick={() => setIsEraser(true)} className={`px-3 sm:px-4 py-2 rounded-xl font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-inner border ${isEraser ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}>
              <Eraser className="w-4 h-4 drop-shadow-sm" /> الممحاة
            </button>
            <button onClick={clearCanvas} className="px-3 sm:px-4 py-2 rounded-xl font-black text-xs sm:text-sm flex items-center gap-1.5 bg-white/5 border border-white/10 text-slate-300 hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/30 transition-all shadow-inner">
              <RefreshCcw className="w-4 h-4 drop-shadow-sm" /> مسح الكل
            </button>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={onClose} className="px-5 py-2.5 font-black text-sm text-slate-300 hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/10 active:scale-95 shadow-inner">إلغاء</button>
            <button onClick={handleSave} className="px-6 sm:px-8 py-2.5 bg-indigo-600/90 backdrop-blur-md text-white font-black text-sm flex items-center gap-2 rounded-xl hover:bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)] active:scale-95 transition-all border border-indigo-400/50">
              <SaveIcon className="w-4 h-4 drop-shadow-sm" /> إدراج
            </button>
          </div>
        </div>
        
        <div className="flex-1 bg-white/5 p-3 sm:p-5 overflow-hidden relative cursor-crosshair z-10">
          <div className="w-full h-full bg-white rounded-2xl sm:rounded-[1.5rem] shadow-[0_0_30px_rgba(255,255,255,0.1)] overflow-hidden relative flex items-center justify-center">
            <canvas 
              ref={canvasRef}
              width={1200}
              height={800}
              className="max-w-full max-h-full touch-none"
              style={{ display: 'block', margin: 'auto' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const StudentTiptapEditor = ({ content, onChange, placeholder }: { content: string, onChange: (html: string) => void, placeholder: string }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit, Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'], defaultAlignment: 'right' }),
      ImageExtension.configure({ inline: true, allowBase64: true }),
      Table.configure({ resizable: true }), TableRow, TableHeader, TableCell, TextStyle, Color,
    ],
    content: content,
    onUpdate: ({ editor }) => { onChange(editor.getHTML()); },
    editorProps: {
      attributes: { class: 'prose prose-slate max-w-none focus:outline-none min-h-[200px] p-5 text-white font-bold leading-loose tiptap-content bg-[#02040a]/40 rounded-b-2xl shadow-inner custom-scrollbar', dir: 'rtl' },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        let imageItem = items.find(item => item.type.indexOf('image') === 0);

        if (imageItem) {
          const file = imageItem.getAsFile();
          if (file) {
            event.preventDefault(); 
            handleImageUpload(file, view);
            return true; 
          }
        }
        return false; 
      }
    }
  });

  const handleImageUpload = async (file: File, view?: any) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '');

      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      
      if (data.secure_url) {
        if (view) {
          const node = view.state.schema.nodes.image.create({ src: data.secure_url });
          const transaction = view.state.tr.replaceSelectionWith(node);
          view.dispatch(transaction);
        } else if (editor) {
          editor.chain().focus().setImage({ src: data.secure_url }).run();
        }
      }
    } catch (err: any) {
      alert("حدث خطأ أثناء رفع الصورة.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageUpload(e.target.files[0]);
    }
  };

  const handleSaveWhiteboard = async (dataUrl: string) => {
    setIsUploading(true);
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], "whiteboard-drawing.png", { type: "image/png" });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '');

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await uploadRes.json();
      
      if (data.secure_url && editor) {
        editor.chain().focus().setImage({ src: data.secure_url }).run();
      } else if (editor) {
        editor.chain().focus().setImage({ src: dataUrl }).run();
      }
    } catch (err) {
      if (editor) editor.chain().focus().setImage({ src: dataUrl }).run();
    } finally {
      setIsUploading(false);
    }
  };

  if (!editor) return null;
  const insertMath = (symbol: string) => { editor.chain().focus().insertContent(` ${symbol} `).run(); };

  return (
    <div className="glass-panel border-indigo-500/30 rounded-[1.5rem] overflow-hidden shadow-lg flex flex-col relative focus-within:border-indigo-400 focus-within:shadow-[0_0_20px_rgba(99,102,241,0.2)] transition-all group">
      <div className="bg-[#0f1423]/80 border-b border-white/10 p-2.5 sm:p-3 flex flex-wrap gap-1.5 items-center backdrop-blur-md">
        <button onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-1.5 sm:p-2 rounded-xl transition-all shadow-inner", editor.isActive('bold') ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/5 text-slate-400 border border-transparent hover:bg-white/10 hover:text-white')}><Bold className="w-3.5 h-3.5 sm:w-4 sm:h-4 drop-shadow-sm"/></button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-1.5 sm:p-2 rounded-xl transition-all shadow-inner", editor.isActive('italic') ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/5 text-slate-400 border border-transparent hover:bg-white/10 hover:text-white')}><Italic className="w-3.5 h-3.5 sm:w-4 sm:h-4 drop-shadow-sm"/></button>
        <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn("p-1.5 sm:p-2 rounded-xl transition-all shadow-inner", editor.isActive('underline') ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/5 text-slate-400 border border-transparent hover:bg-white/10 hover:text-white')}><UnderlineIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 drop-shadow-sm"/></button>
        <div className="w-px h-6 bg-white/10 mx-1 sm:mx-2"></div>
        <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={cn("p-1.5 sm:p-2 rounded-xl transition-all shadow-inner", editor.isActive({ textAlign: 'right' }) ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/5 text-slate-400 border border-transparent hover:bg-white/10 hover:text-white')}><AlignRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 drop-shadow-sm"/></button>
        <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={cn("p-1.5 sm:p-2 rounded-xl transition-all shadow-inner", editor.isActive({ textAlign: 'center' }) ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/5 text-slate-400 border border-transparent hover:bg-white/10 hover:text-white')}><AlignCenter className="w-3.5 h-3.5 sm:w-4 sm:h-4 drop-shadow-sm"/></button>
        <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={cn("p-1.5 sm:p-2 rounded-xl transition-all shadow-inner", editor.isActive({ textAlign: 'left' }) ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/5 text-slate-400 border border-transparent hover:bg-white/10 hover:text-white')}><AlignLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 drop-shadow-sm"/></button>
        <div className="w-px h-6 bg-white/10 mx-1 sm:mx-2"></div>
        <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className="p-1.5 sm:p-2 bg-white/5 border border-transparent rounded-xl text-slate-400 hover:bg-white/10 hover:border-white/20 transition-all shadow-inner"><TableIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 drop-shadow-sm"/></button>
        
        <div className="w-px h-6 bg-white/10 mx-1 sm:mx-2 hidden sm:block"></div>
        <button onClick={() => setIsWhiteboardOpen(true)} className="px-3 py-2 rounded-xl text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 font-black text-[10px] sm:text-xs flex items-center gap-1.5 transition-all shadow-inner ml-auto sm:ml-0 mr-auto">
           <PenTool className="w-3.5 h-3.5 drop-shadow-md" /> الحل بالسبورة
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        <button onClick={() => fileInputRef.current?.click()} className="px-3 py-2 rounded-xl text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 font-black text-[10px] sm:text-xs flex items-center gap-1.5 transition-all shadow-inner">
           <ImageIcon className="w-3.5 h-3.5 drop-shadow-md" /> إرفاق صورة
        </button>
      </div>

      <div className="bg-[#02040a]/80 border-b border-white/5 p-2.5 sm:p-3 flex flex-wrap gap-2 items-center overflow-x-auto custom-scrollbar">
        <button onClick={() => insertMath('$ $')} className="px-3 py-1.5 bg-white/5 text-slate-300 hover:text-white rounded-lg text-xs font-bold font-mono border border-white/10 hover:border-white/20 shadow-inner flex items-center gap-1.5 transition-colors"><Calculator className="w-3 h-3 drop-shadow-sm"/> $ $</button>
        <button onClick={() => insertMath('$\\frac{ }{ }$')} className="px-3 py-1.5 bg-white/5 text-slate-300 hover:text-white rounded-lg text-xs font-bold font-mono border border-white/10 hover:border-white/20 shadow-inner transition-colors">كسر</button>
        <button onClick={() => insertMath('$^{ }$')} className="px-3 py-1.5 bg-white/5 text-slate-300 hover:text-white rounded-lg text-xs font-bold font-mono border border-white/10 hover:border-white/20 shadow-inner transition-colors">أس</button>
      </div>

      <div className="flex-1 bg-transparent relative min-h-[200px]">
        <AnimatePresence>
          {isUploading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 bg-[#02040a]/80 backdrop-blur-md flex flex-col items-center justify-center gap-4 rounded-b-[1.5rem]">
              <Loader2 className="w-10 h-10 text-indigo-400 animate-spin drop-shadow-[0_0_15px_rgba(99,102,241,0.6)]" />
              <span className="text-xs sm:text-sm font-black text-indigo-300 drop-shadow-md">جاري الرفع السحابي وتشفير الصورة...</span>
            </motion.div>
          )}
        </AnimatePresence>
        {!editor.getText() && !editor.isActive('table') && !editor.isActive('image') && (
          <div className="absolute inset-0 pointer-events-none p-5 text-slate-500 font-bold text-xs sm:text-sm leading-relaxed">{placeholder}</div>
        )}
        <EditorContent editor={editor} />
      </div>

      <WhiteboardModal 
        isOpen={isWhiteboardOpen} 
        onClose={() => setIsWhiteboardOpen(false)} 
        onSave={handleSaveWhiteboard} 
      />
    </div>
  );
};

export default function PracticeArena() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params?.id as string;
  const isPreviewMode = searchParams?.get('preview') === 'true'; 
  const { user, userName } = useAuth() as any; 

  const [assignment, setAssignment] = useState<any>(null);
  const [allQuestions, setAllQuestions] = useState<any[]>([]); 
  const [activeQuestions, setActiveQuestions] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  
  const [editorKey, setEditorKey] = useState(0); 
  
  const [essayAnswers, setEssayAnswers] = useState<Record<string, string>>({});
  
  const [attempts, setAttempts] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const [showHint, setShowHint] = useState(false);
  
  const [score, setScore] = useState({ correct: 0, wrong: 0, totalPoints: 0 });
  const [streak, setStreak] = useState(0); 
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);
  
  const [failedQuestionIds, setFailedQuestionIds] = useState<Set<string>>(new Set());
  const [isFinished, setIsFinished] = useState(false);
  const [mode, setMode] = useState<'normal' | 'retake_errors'>('normal');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    if (!id || (!user && !isPreviewMode)) return;
    const fetchArena = async () => {
      try {
        const { data: assignData } = await supabase.from('assignments_v2').select('*').eq('id', id).single();
        const { data: qData } = await supabase.from('assignment_questions_v2').select('*').eq('assignment_id', id).order('order_index', { ascending: true });
        
        setAssignment(assignData);
        const formattedQs = (qData || []).map((q: any) => ({ ...q, type: q.question_type }));
        setAllQuestions(formattedQs);
        setActiveQuestions(formattedQs);

        if (!isPreviewMode && user) {
          const { data: progressData } = await supabase.from('student_progress_v2').select('*').eq('student_id', user.id).eq('assignment_id', id).maybeSingle();
          const localSaveKey = `arena_save_${user.id}_${id}`;
          const localData = localStorage.getItem(localSaveKey);

          if (!progressData?.is_completed && localData) {
             const parsedLocal = JSON.parse(localData);
             setCurrentIndex(parsedLocal.currentIndex || 0);
             setScore(parsedLocal.score || { correct: 0, wrong: 0, totalPoints: 0 });
             setStreak(parsedLocal.streak || 0);
             setFailedQuestionIds(new Set(parsedLocal.failedQuestionIds || []));
             if (parsedLocal.essayAnswers) setEssayAnswers(parsedLocal.essayAnswers);
          } else if (progressData) {
            if (progressData.is_completed) {
              setIsFinished(true); 
              setScore({ correct: progressData.correct_score, wrong: progressData.wrong_score, totalPoints: progressData.correct_score * 10 }); 
            } else {
              setCurrentIndex(progressData.current_index || 0); 
              setScore({ correct: progressData.correct_score || 0, wrong: progressData.wrong_score || 0, totalPoints: (progressData.correct_score || 0) * 10 });
            }
          }
        }
        
        setStartTime(Date.now()); 
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchArena();
  }, [id, user, isPreviewMode]);

  useEffect(() => {
    if (loading || isFinished || !user || isPreviewMode) return; 
    const localSaveKey = `arena_save_${user.id}_${id}`;
    const saveData = { currentIndex, score, streak, failedQuestionIds: Array.from(failedQuestionIds), essayAnswers };
    localStorage.setItem(localSaveKey, JSON.stringify(saveData));
  }, [currentIndex, score, streak, failedQuestionIds, essayAnswers, loading, isFinished, isPreviewMode]);

  const isOfficial = assignment && assignment.is_practice_mode === false && mode === 'normal';

  const saveProgressToDB = async (newIndex: number, newScore: { correct: number, wrong: number }, finished: boolean) => {
    if (!user || isPreviewMode) return; 
    try {
      await supabase.from('student_progress_v2').upsert({
        student_id: user.id, assignment_id: id, current_index: newIndex, correct_score: newScore.correct,
        wrong_score: newScore.wrong, is_completed: finished, updated_at: new Date().toISOString()
      }, { onConflict: 'student_id, assignment_id' });

      if (finished && isOfficial && Object.keys(essayAnswers).length > 0) {
        const answersToInsert = Object.entries(essayAnswers).map(([qId, text]) => ({
          student_id: user.id,
          assignment_id: id,
          question_id: qId,
          answer_text: text,
          is_graded: false
        }));
        
        await supabase.from('student_answers_v2').upsert(answersToInsert, { onConflict: 'student_id, assignment_id, question_id' }).catch(err => console.log('Error saving to v2 table:', err));
      }

      if (finished) localStorage.removeItem(`arena_save_${user.id}_${id}`);
    } catch (err) {}
  };

  const triggerConfetti = () => {
    const end = Date.now() + 3000;
    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#34d399', '#818cf8', '#fbbf24'] });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#34d399', '#818cf8', '#fbbf24'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  const handleFinish = (finalScore: any) => {
    setIsFinished(true);
    if (startTime) setTimeSpentSeconds(Math.floor((Date.now() - startTime) / 1000));
    
    if (!isOfficial && (finalScore.wrong === 0 || (finalScore.correct / (finalScore.correct + finalScore.wrong) > 0.8))) {
        triggerConfetti();
    }
    
    saveProgressToDB(currentIndex, finalScore, true);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} دقيقة و ${s} ثانية`;
  };

  const successMessages = ["أنت بطل! إجابة دقيقة 🌟", "تفكير عبقري! 🧠", "عمل رائع جداً! 🎯", "دقة متناهية، استمر! 👏"];
  const encourageMessages = ["لا بأس، الخطأ طريق التعلم! 💪", "اقتربت جداً، اقرأ الشرح بتركيز! 🎯", "أنت قادر عليها يا بطل! 🧠", "المحاولات تصنع النجاح! 🔄"];
  
  const randomSuccessMsg = successMessages[currentIndex % successMessages.length];
  const randomEncourageMsg = encourageMessages[currentIndex % encourageMessages.length];

  const currentQ = activeQuestions[currentIndex];
  const currentContextHeader = activeQuestions.slice(0, currentIndex + 1).reverse().find(q => q.type === 'section_header');
  
  const hasEssayAnswer = () => {
    if (!currentQ) return false;
    const ans = essayAnswers[currentQ.id] || '';
    if (!ans) return false;
    if (ans.includes('<table') || ans.includes('<img')) return true;
    const cleanText = ans.replace(/<[^>]*>/g, '').trim();
    return cleanText.length > 0;
  };

  const handleOptionClick = (opt: any) => {
    if (isOfficial) {
      setSelectedOptionId(opt.id);
      return;
    }

    if (isSuccess) return; 
    setSelectedOptionId(opt.id);
    
    if (opt.is_correct) {
      setIsSuccess(true);
      setShowHint(true); 
      const newStreak = streak + 1;
      setStreak(newStreak);
      const pointsEarned = (currentQ.points || 1) * (newStreak >= 3 ? 1.5 : 1) * (attempts === 0 ? 1 : 0.5); 
      setScore(s => ({ ...s, correct: s.correct + (attempts === 0 ? 1 : 0), totalPoints: s.totalPoints + pointsEarned }));
    } else {
      setAttempts(a => a + 1);
      setStreak(0); 
      setFailedQuestionIds(prev => new Set(prev).add(currentQ.id)); 
      setShake(true);
      setTimeout(() => setShake(false), 500);
      if (attempts === 0) setScore(s => ({ ...s, wrong: s.wrong + 1 }));
    }
  };

  const nextQuestion = () => {
    let currentNewScore = { ...score };

    if (isOfficial && (currentQ.type === 'multiple_choice' || currentQ.type === 'true_false')) {
      if (selectedOptionId) {
        const selectedOpt = currentQ.options.find((o:any) => o.id === selectedOptionId);
        if (selectedOpt?.is_correct) {
          currentNewScore.correct += 1;
          currentNewScore.totalPoints += (currentQ.points || 1);
        } else {
          currentNewScore.wrong += 1;
          setFailedQuestionIds(prev => new Set(prev).add(currentQ.id));
        }
      } else {
        currentNewScore.wrong += 1;
        setFailedQuestionIds(prev => new Set(prev).add(currentQ.id));
      }
      setScore(currentNewScore);
    }

    if (currentIndex < activeQuestions.length - 1) {
      let nextIdx = currentIndex + 1;
      if (activeQuestions[nextIdx].type === 'section_header' && nextIdx < activeQuestions.length - 1) nextIdx++;
      setCurrentIndex(nextIdx); setSelectedOptionId(null); setIsSuccess(false); setAttempts(0); setShowHint(false);
      if (mode === 'normal' && !isPreviewMode) saveProgressToDB(nextIdx, currentNewScore, false);
    } else {
      handleFinish(currentNewScore);
    }
  };

  const handleSelfEvaluation = (understood: boolean) => {
    const newScore = { correct: score.correct + (understood ? 1 : 0), wrong: score.wrong + (!understood ? 1 : 0), totalPoints: score.totalPoints + (understood ? (currentQ.points || 1) : 0) };
    if (understood) setStreak(s => s + 1);
    else { setStreak(0); setFailedQuestionIds(prev => new Set(prev).add(currentQ.id)); }
    setScore(newScore);
    if (currentIndex < activeQuestions.length - 1) {
      let nextIdx = currentIndex + 1;
      if (activeQuestions[nextIdx].type === 'section_header' && nextIdx < activeQuestions.length - 1) nextIdx++;
      setCurrentIndex(nextIdx); setSelectedOptionId(null); setShowHint(false); 
      if (mode === 'normal' && !isPreviewMode) saveProgressToDB(nextIdx, newScore, false);
    } else {
      handleFinish(newScore);
    }
  };

  const handleRetakeFull = async () => {
    if (user && !isPreviewMode) {
      try {
        await supabase.from('student_progress_v2').upsert({
          student_id: user.id, assignment_id: id, current_index: 0, correct_score: 0,
          wrong_score: 0, is_completed: false, updated_at: new Date().toISOString()
        }, { onConflict: 'student_id, assignment_id' });
      } catch (err) {}
    }
    setMode('normal'); setActiveQuestions(allQuestions); setCurrentIndex(0); setScore({ correct: 0, wrong: 0, totalPoints: 0 });
    setIsFinished(false); setSelectedOptionId(null); setIsSuccess(false); setAttempts(0); setShowHint(false); setStreak(0); setFailedQuestionIds(new Set()); setStartTime(Date.now());
  };

  const handleRetakeErrorsOnly = () => {
    const errorQs = allQuestions.filter(q => failedQuestionIds.has(q.id) || q.type === 'section_header');
    setMode('retake_errors'); setActiveQuestions(errorQs); setCurrentIndex(0); setScore({ correct: 0, wrong: 0, totalPoints: 0 });
    setIsFinished(false); setSelectedOptionId(null); setIsSuccess(false); setAttempts(0); setShowHint(false); setStreak(0); setStartTime(Date.now());
  };

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const element = document.getElementById('pdf-export-container');
      if (!element) throw new Error("Element not found");
      await new Promise(resolve => setTimeout(resolve, 800));
      const isMobile = window.innerWidth < 768;
      const canvas = await html2canvas(element, { 
        scale: isMobile ? 1.5 : 2, 
        useCORS: true, allowTaint: true, backgroundColor: '#0f1423', windowWidth: 900,
        onclone: (clonedDoc) => {
          const parent = clonedDoc.getElementById('main-arena-container');
          if (parent) { parent.style.overflow = 'visible'; parent.style.height = 'auto'; parent.style.minHeight = 'auto'; }
          const el = clonedDoc.getElementById('pdf-export-container');
          if (el) { el.style.position = 'relative'; el.style.top = '0'; el.style.left = '0'; }
        }
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.8); 
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) { position = heightLeft - pdfHeight; pdf.addPage(); pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight); heightLeft -= pageHeight; }
      pdf.save(`مراجعة_أخطائي_${assignment?.title || 'تدريب'}.pdf`);
    } catch (err) { console.error('Error generating PDF', err); alert('حدث خطأ أثناء إنشاء ملف الـ PDF. يرجى المحاولة باستخدام متصفح كروم أو سفاري المحدث.'); } finally { setIsGeneratingPDF(false); }
  };

  if (loading) return <div className="min-h-[100dvh] flex items-center justify-center bg-transparent"><div className="animate-pulse flex flex-col items-center gap-5"><div className="relative flex items-center justify-center"><div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)]"></div><BrainCircuit className="absolute h-8 w-8 text-indigo-400 animate-pulse" /></div><p className="text-indigo-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري تجهيز ساحة التحدي...</p></div></div>;
  if (!assignment || allQuestions.length === 0) return <div className="p-10 text-center font-sans font-bold text-slate-400 bg-[#02040a]/40 rounded-3xl m-6 border border-white/5 shadow-inner">لا يوجد تدريب متاح هنا.</div>;

  const progress = ((currentIndex + 1) / activeQuestions.length) * 100;
  const safeOptions = currentQ ? safeParseOptions(currentQ.options) : [];
  const isMCQ = (currentQ?.type === 'multiple_choice' || currentQ?.type === 'true_false') && safeOptions.length > 0;
  const failedQsForPDF = allQuestions.filter(q => failedQuestionIds.has(q.id) && q.type !== 'section_header');

  return (
    <div id="main-arena-container" className="min-h-[100dvh] h-[100dvh] bg-transparent font-sans text-slate-200 flex flex-col overflow-hidden relative" dir="rtl">
      
      {/* 🌌 الإضاءة الكونية الخلفية (Gemini Background) */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-500/10 rounded-full blur-[120px] mix-blend-screen animate-[pulse_10s_ease-in-out_infinite]"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[40vw] h-[40vw] bg-blue-500/10 rounded-full blur-[100px] mix-blend-screen animate-[pulse_8s_ease-in-out_infinite_alternate]"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-screen"></div>
      </div>

      {isPreviewMode && (
        <div className="bg-gradient-to-r from-orange-600/90 to-amber-600/90 backdrop-blur-md text-white px-4 py-2.5 flex items-center justify-center gap-3 font-black shadow-[0_0_20px_rgba(245,158,11,0.3)] z-50 shrink-0 text-sm sm:text-base border-b border-orange-400/50">
          <MonitorPlay className="w-5 h-5 animate-pulse shrink-0 drop-shadow-md" /> 
          <span className="truncate drop-shadow-sm">وضع البث الحي - معاينة فقط (لن تُحفظ الإجابات)</span>
        </div>
      )}

      {isOfficial && !isFinished && (
        <div className="bg-[#0f1423]/90 backdrop-blur-md text-white px-4 py-2.5 flex items-center justify-center gap-3 font-black shadow-inner z-50 shrink-0 text-xs sm:text-sm border-b border-white/10">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 drop-shadow-md" /> 
          <span className="truncate drop-shadow-sm text-amber-200/80">هذا التقييم رسمي. لن تظهر النتيجة إلا بعد تسليم الواجب بالكامل.</span>
        </div>
      )}

      {/* منطقة الطباعة المخفية (معدلة للثيم الداكن) */}
      <div className="absolute top-[-9999px] left-[-9999px] w-[900px] pointer-events-none bg-[#0f1423] text-slate-200 p-10 font-sans" id="pdf-export-container">
        <div className="text-center mb-10 border-b-4 border-indigo-500/30 pb-6">
          <h1 className="text-4xl font-black text-indigo-400 mb-3 drop-shadow-md">ملخص المراجعة الشاملة</h1>
          <h2 className="text-2xl font-bold text-white mb-4 drop-shadow-sm">{assignment?.title}</h2>
          <div className="flex items-center justify-center gap-6 text-sm font-black text-white bg-indigo-600/80 backdrop-blur-md inline-flex px-6 py-2 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.4)] border border-indigo-400/50">
            <span>الطالب: {userName || 'مستخدم النظام'}</span>
            <span>|</span>
            <span>التاريخ: {new Date().toLocaleDateString('ar-SA')}</span>
          </div>
        </div>
        <div className="space-y-12">
          {failedQsForPDF.map((q, idx) => (
            <div key={q.id} className="bg-[#02040a]/60 border-2 border-white/10 rounded-[2rem] p-8 shadow-inner">
              <div className="flex items-center gap-3 mb-6 border-b-2 border-white/5 pb-4">
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 w-10 h-10 flex items-center justify-center rounded-xl font-black text-lg shrink-0 shadow-inner">{idx + 1}</div>
                <h3 className="text-xl font-black text-white drop-shadow-md">نص السؤال:</h3>
              </div>
              <div className="prose prose-slate max-w-none font-bold text-slate-300 mb-8 text-lg" dangerouslySetInnerHTML={{ __html: renderHTMLWithMath(q.content_html) }} />
              <div className="bg-indigo-500/10 border-2 border-indigo-500/20 rounded-[1.5rem] p-6 shadow-inner">
                <h3 className="font-black text-indigo-300 mb-4 flex items-center gap-2 text-lg drop-shadow-sm"><BrainCircuit className="w-6 h-6" /> تحليل الإجابة النموذجية:</h3>
                {q.model_answer_html && q.model_answer_html.trim() !== '' ? (
                  <div className="prose prose-indigo max-w-none font-bold text-indigo-200 text-lg leading-loose" dangerouslySetInnerHTML={{ __html: renderHTMLWithMath(q.model_answer_html) }} />
                ) : <p className="text-slate-500 font-bold italic">لا يوجد توضيح مفصل متوفر.</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .katex-container { direction: ltr !important; unicode-bidi: embed !important; display: inline-block; max-width: 100%; overflow-wrap: break-word; }
        .katex { direction: ltr !important; text-align: left !important; color: #818cf8 !important; }
        .katex-display { display: flex !important; justify-content: center !important; margin: 0.5rem 0 !important; width: 100% !important; overflow-x: auto; direction: ltr !important; }
        .tiptap-content table { border-collapse: collapse !important; width: 100% !important; margin: 15px 0 !important; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.3); background: rgba(2,4,10,0.4); }
        .tiptap-content td, .tiptap-content th { border: 1px solid rgba(255,255,255,0.1) !important; padding: 12px !important; text-align: center !important; vertical-align: middle !important; min-width: 2em; color: #cbd5e1; }
        .tiptap-content th { background-color: rgba(255,255,255,0.05) !important; font-weight: 900 !important; color: #fff; }
        .tiptap-content img { max-width: 100% !important; height: auto !important; border-radius: 12px !important; margin: 10px auto !important; display: block !important; box-shadow: 0 4px 10px rgba(0,0,0,0.5) !important; mix-blend-mode: luminosity; border: 1px solid rgba(255,255,255,0.1); }
        .tiptap-content p { margin-bottom: 0.5em !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.5); }
      `}} />

      {/* 🚀 Navigation & Progress Bar (Glass) */}
      <div className="bg-[#02040a]/60 backdrop-blur-xl border-b border-white/5 z-20 shrink-0 shadow-inner">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button onClick={() => router.back()} className="p-2 sm:p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-all shadow-inner active:scale-90"><ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" /></button>
          
          <div className="flex-1 max-w-3xl flex items-center gap-4">
            <div className="flex-1">
                <div className="h-2.5 sm:h-3 bg-[#0f1423] rounded-full overflow-hidden shadow-inner border border-white/5">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${isFinished ? 100 : progress}%` }} className="h-full bg-gradient-to-l from-indigo-400 to-blue-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.8)] relative">
                     <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" />
                  </motion.div>
                </div>
                <div className="text-[9px] sm:text-[10px] font-black text-indigo-300 mt-2 text-center tracking-widest uppercase drop-shadow-sm flex items-center justify-center gap-1.5">
                  <Target className="w-3 h-3 opacity-70" />
                  {mode === 'retake_errors' ? 'تحدي تصحيح الأخطاء' : `${isOfficial ? 'السؤال' : 'التحدي'} ${currentIndex + 1} / ${activeQuestions.length}`}
                </div>
            </div>
            
            <AnimatePresence>
                {!isOfficial && streak >= 2 && (
                    <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0 }} className="flex items-center gap-1.5 bg-orange-500/20 px-3 sm:px-4 py-1.5 rounded-xl border border-orange-500/30 shadow-inner shrink-0 backdrop-blur-sm">
                        <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400 fill-orange-400 animate-pulse drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                        <span className="text-xs sm:text-sm font-black text-orange-300 drop-shadow-md">{streak}x</span>
                    </motion.div>
                )}
            </AnimatePresence>
          </div>
          
          {!isOfficial && (
            <div className="flex items-center gap-3 text-xs sm:text-sm font-black bg-[#0f1423]/80 px-4 sm:px-5 py-2 rounded-xl border border-white/5 shrink-0 shadow-inner backdrop-blur-sm hidden sm:flex">
              <span className="text-emerald-400 flex items-center gap-1.5 drop-shadow-sm"><CheckCircle2 className="w-4 h-4"/> {score.correct}</span>
              <span className="text-rose-400 flex items-center gap-1.5 drop-shadow-sm"><XCircle className="w-4 h-4"/> {score.wrong}</span>
            </div>
          )}
        </div>
      </div>

      {/* 🚀 Main Arena Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col md:flex-row gap-5 sm:gap-8 min-h-0 relative z-10">
        
        <AnimatePresence>
          {currentContextHeader && currentQ?.type !== 'section_header' && !isFinished && (
            <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className="md:w-[45%] lg:w-1/2 flex flex-col glass-panel rounded-[2rem] sm:rounded-[2.5rem] border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.1)] overflow-hidden h-[35vh] md:h-full shrink-0">
              <div className="bg-indigo-500/10 backdrop-blur-md px-5 sm:px-6 py-4 flex items-center gap-3 border-b border-indigo-500/20 shrink-0 shadow-inner">
                 <Quote className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400 drop-shadow-sm" />
                 <h3 className="font-black text-indigo-100 text-sm sm:text-base drop-shadow-md">اقرأ النص أو ادرس الشكل التالي:</h3>
              </div>
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar bg-[#02040a]/20">
                 <div className="tiptap-content prose prose-slate max-w-none font-bold text-slate-300 leading-loose text-sm sm:text-base lg:text-lg" dangerouslySetInnerHTML={{ __html: renderHTMLWithMath(currentContextHeader.content_html) }}></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`flex-1 flex flex-col h-full min-h-0 transition-all duration-500 ${currentContextHeader ? 'md:w-[55%] lg:w-1/2' : 'w-full max-w-4xl mx-auto'}`}>
          <AnimatePresence mode="wait">
            {!isFinished && currentQ ? (
              <motion.div key={currentQ.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1, x: shake ? [-10, 10, -10, 10, 0] : 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: "spring", bounce: 0.4 }} className={`glass-panel rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border overflow-hidden flex flex-col h-full transition-colors duration-300 ${isSuccess && !isOfficial ? 'border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.2)] bg-[#02040a]/60' : 'border-white/10 bg-[#02040a]/40'}`}>
                
                <div className={`p-5 sm:p-6 border-b flex items-center justify-between shrink-0 backdrop-blur-md transition-colors duration-300 ${isSuccess && !isOfficial ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/5 border-white/5'}`}>
                  <div className="flex items-center gap-3">
                    <Target className={`w-5 h-5 sm:w-6 sm:h-6 drop-shadow-md ${isSuccess && !isOfficial ? 'text-emerald-400' : 'text-indigo-400'}`} />
                    <h3 className={`font-black text-sm sm:text-base drop-shadow-sm ${isSuccess && !isOfficial ? 'text-emerald-300' : 'text-white'}`}>
                      {isSuccess && !isOfficial ? "إجابة صحيحة! 🌟" : (currentQ.type === 'essay' ? 'سؤال مقالي' : currentQ.type === 'section_header' ? 'معلومة للقراءة' : (isOfficial ? 'اختر الإجابة الصحيحة' : 'تحدي اختياري'))}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {isPreviewMode && (
                      <button onClick={() => alert('ميزة اقتراح التعديلات للإدارة قيد الإطلاق قريباً 🚀')} className="px-3 py-1.5 bg-amber-500/10 text-amber-300 rounded-lg border border-amber-500/20 text-[9px] sm:text-[10px] font-black flex items-center gap-1.5 hover:bg-amber-500/20 transition-colors shadow-inner backdrop-blur-sm">
                        <AlertTriangle className="w-3.5 h-3.5" /> اقتراح تعديل
                      </button>
                    )}
                    {currentQ.points > 0 && <span className="bg-white/10 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black text-indigo-300 border border-white/10 shadow-inner backdrop-blur-sm">{currentQ.points} نقاط</span>}
                  </div>
                </div>

                <div className="p-6 sm:p-8 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
                  <div className="tiptap-content prose prose-slate max-w-none font-bold text-slate-200 leading-loose text-base sm:text-lg lg:text-xl drop-shadow-sm" dangerouslySetInnerHTML={{ __html: renderHTMLWithMath(currentQ.content_html) }}></div>
                  
                  {isMCQ && (
                    <div className="mt-8 sm:mt-10 space-y-3 sm:space-y-4">
                      {safeOptions.map((opt: any) => {
                        const isSelected = selectedOptionId === opt.id; 
                        const isCorrect = opt.is_correct; 
                        
                        let btnStyle = "bg-white/5 border-white/10 text-slate-300 hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]";
                        
                        if (isOfficial) {
                          if (isSelected) btnStyle = "bg-indigo-500/20 border-indigo-400 text-indigo-100 shadow-[0_0_20px_rgba(99,102,241,0.3)] scale-[1.02]";
                        } else {
                          if (isSuccess) { 
                            if (isCorrect) btnStyle = "bg-emerald-500/20 border-emerald-400 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-[1.02]"; 
                            else btnStyle = "bg-[#0f1423]/40 border-transparent text-slate-500 opacity-40 grayscale"; 
                          } else if (attempts > 0 && isSelected && !isCorrect) {
                            btnStyle = "bg-rose-500/10 border-rose-500/40 text-rose-300 opacity-60";
                          }
                        }

                        return ( 
                          <button key={opt.id} onClick={() => handleOptionClick(opt)} disabled={!isOfficial && (isSuccess || (attempts > 0 && isSelected && !isCorrect))} className={`w-full p-4 sm:p-5 rounded-2xl border transition-all duration-300 flex items-center justify-between shadow-inner backdrop-blur-sm group/btn ${btnStyle}`}>
                            <div className="katex-container flex-1 font-bold text-sm sm:text-base leading-relaxed text-right drop-shadow-sm"><Latex>{opt.content}</Latex></div>
                            {!isOfficial && isSuccess && isCorrect && <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400 shrink-0 drop-shadow-md ml-2" />}
                            {!isOfficial && attempts > 0 && isSelected && !isCorrect && !isSuccess && <XCircle className="w-6 h-6 sm:w-7 sm:h-7 text-rose-400 shrink-0 drop-shadow-md ml-2" />}
                            {isOfficial && isSelected && <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-400 shrink-0 drop-shadow-md ml-2" />}
                          </button> 
                        );
                      })}
                    </div>
                  )}

                  {currentQ.type === 'essay' && !showHint && (
                    <div className="mt-8 sm:mt-10">
                      {isOfficial ? (
                        <div className="bg-[#02040a]/40 p-5 sm:p-6 rounded-[1.5rem] border border-indigo-500/30 shadow-inner backdrop-blur-sm space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-3 mb-2 border-b border-white/5 pb-4">
                            <label className="text-xs sm:text-sm font-black text-indigo-300 flex items-center gap-2 drop-shadow-sm">
                              <Edit3 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" /> مساحة الإجابة والتنسيق:
                            </label>
                            {currentQ.content_html?.includes('<table') && (
                              <button 
                                onClick={() => {
                                   const currentAns = essayAnswers[currentQ.id] || '';
                                   if (!currentAns.includes('<table')) {
                                      setEssayAnswers({ ...essayAnswers, [currentQ.id]: currentAns + currentQ.content_html });
                                      setEditorKey(prev => prev + 1);
                                   }
                                }}
                                className="text-[9px] sm:text-[10px] bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-500/40 font-black flex items-center gap-1.5 hover:bg-indigo-500/40 transition-colors shadow-inner active:scale-95 backdrop-blur-md"
                              >
                                <ClipboardPaste className="w-3.5 h-3.5 drop-shadow-sm" /> استيراد الجدول للحل داخله
                              </button>
                            )}
                          </div>
                          <StudentTiptapEditor 
                            key={editorKey}
                            content={essayAnswers[currentQ.id] || ''} 
                            onChange={(html) => setEssayAnswers({ ...essayAnswers, [currentQ.id]: html })} 
                            placeholder="اكتب إجابتك العلمية هنا بالتفصيل..."
                          />
                        </div>
                      ) : (
                        <div className="text-center bg-white/5 p-8 sm:p-10 rounded-[2rem] border border-white/10 border-dashed shadow-inner backdrop-blur-sm">
                          <p className="text-sm sm:text-base font-bold text-slate-400 mb-6 drop-shadow-sm">✍️ فكر جيداً وحل المسألة في ورقة خارجية...</p>
                          <button onClick={() => setShowHint(true)} className="w-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-500/20 transition-all shadow-inner active:scale-95 text-sm sm:text-base"><Lightbulb className="w-5 h-5 drop-shadow-md" /> تأكدت من حلي، اكشف لي الجواب!</button>
                        </div>
                      )}
                    </div>
                  )}

                  {!isOfficial && showHint && (() => {
                    let extractedImages = [];
                    if (typeof window !== 'undefined') {
                      try {
                        const parsedQuestionHTML = renderHTMLWithMath(currentQ.content_html);
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(parsedQuestionHTML, 'text/html');
                        extractedImages = Array.from(doc.querySelectorAll('img')).map(img => img.outerHTML);
                      } catch(e) {}
                    }
                    return (
                      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mt-8 sm:mt-10 overflow-hidden rounded-[2rem] border border-indigo-500/40 shadow-[0_0_30px_rgba(99,102,241,0.15)] bg-[#02040a]/80 backdrop-blur-xl">
                        <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600/80 to-blue-600/80 px-5 sm:px-6 py-3.5 sm:py-4 text-white border-b border-indigo-400/30"><div className="flex items-center gap-2.5 font-black text-xs sm:text-sm drop-shadow-md"><BrainCircuit className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" /><span>المساعد الذكي يكتب لك الشرح الآن...</span></div><Sparkles className="w-4 h-4 sm:w-5 sm:h-5 animate-spin-slow opacity-80" /></div>
                        <div className="p-6 sm:p-8 bg-transparent min-h-[100px]">
                          {extractedImages.length > 0 && (
                            <div className="mb-6 sm:mb-8 p-4 sm:p-5 bg-white/5 rounded-2xl border border-white/10 shadow-inner flex flex-col items-center gap-4"><p className="text-[10px] font-black text-indigo-400 w-full text-right border-b border-white/5 pb-2 uppercase tracking-widest drop-shadow-sm">صورة مرجعية من السؤال:</p>{extractedImages.map((imgHtml, idx) => ( <div key={idx} dangerouslySetInnerHTML={{ __html: imgHtml }} className="max-w-full rounded-xl overflow-hidden shadow-md mix-blend-luminosity border border-white/10" /> ))}</div>
                          )}
                          {currentQ.model_answer_html && currentQ.model_answer_html.trim() !== '' && currentQ.model_answer_html !== '<p></p>' ? ( <TypewriterReveal htmlContent={currentQ.model_answer_html} /> ) : <p className="text-sm font-bold text-slate-500 italic text-center">لا يوجد شرح تفصيلي متوفر لهذا السؤال.</p>}
                        </div>
                        <div className="px-6 py-3 bg-[#0f1423]/80 border-t border-white/5 flex justify-center"><span className="text-[9px] sm:text-[10px] font-black text-indigo-500/50 uppercase tracking-widest">Powered by Gemini AI Engine</span></div>
                      </motion.div>
                    );
                  })()}
                </div>

                <div className="p-4 sm:p-5 lg:p-6 bg-[#02040a]/60 border-t border-white/5 shrink-0 mt-auto backdrop-blur-2xl">
                  {isOfficial ? (
                    <button 
                      onClick={nextQuestion} 
                      disabled={(isMCQ && !selectedOptionId) || (currentQ.type === 'essay' && !hasEssayAnswer())} 
                      className="w-full bg-indigo-600/90 backdrop-blur-md text-white font-black py-4 sm:py-5 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-500 active:scale-95 transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/50 disabled:opacity-50 disabled:bg-[#0f1423] disabled:text-slate-500 disabled:border-white/10 disabled:shadow-none text-sm sm:text-base"
                    >
                      {currentIndex === activeQuestions.length - 1 ? 'تسليم الواجب وإنهاء التقييم 🚀' : 'اعتماد الإجابة والانتقال للسؤال التالي'} 
                      <ChevronRight className="w-5 h-5 drop-shadow-sm" />
                    </button>
                  ) : (
                  isMCQ ? (
                    <AnimatePresence mode="wait">
                      {isSuccess ? (
                        <motion.div key="success" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-3 sm:gap-4 shadow-inner backdrop-blur-md"><div className="font-black text-emerald-400 text-base sm:text-lg flex items-center gap-2 drop-shadow-md"><Sparkles className="w-5 h-5 sm:w-6 sm:h-6" /> {randomSuccessMsg}</div><button onClick={nextQuestion} className="w-full bg-emerald-600/90 backdrop-blur-md text-white font-black py-3.5 sm:py-4 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-500 active:scale-95 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] border border-emerald-400/50 text-sm sm:text-base">متابعة التحدي <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-sm" /></button></motion.div>
                      ) : attempts > 0 && !isSuccess ? (
                        <motion.div key="wrong" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3"><div className="bg-rose-500/10 text-rose-400 font-black py-3.5 sm:py-4 px-4 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 border border-rose-500/30 text-center shadow-inner backdrop-blur-sm text-sm sm:text-base"><RefreshCcw className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-md" /> {randomEncourageMsg}</div>{currentQ.model_answer_html && !showHint && ( <button onClick={() => setShowHint(true)} className="w-full bg-indigo-500/10 text-indigo-300 font-black py-3.5 sm:py-4 rounded-xl sm:rounded-2xl hover:bg-indigo-500/20 transition-colors flex items-center justify-center gap-2 border border-indigo-500/30 shadow-inner active:scale-95 text-sm sm:text-base backdrop-blur-md"><BrainCircuit className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-md" /> تحليل الإجابة (المساعد الذكي)</button> )}</motion.div>
                      ) : <div key="idle" className="w-full bg-[#0f1423] text-slate-500 font-black py-4 sm:py-5 rounded-2xl flex items-center justify-center gap-2 border border-white/5 shadow-inner text-sm sm:text-base">اختر إجابة للتقدم ⚡</div>}
                    </AnimatePresence>
                  ) : currentQ.type === 'essay' ? (
                    showHint ? (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 sm:space-y-4 bg-white/5 p-4 sm:p-5 rounded-[1.5rem] border border-white/10 shadow-inner backdrop-blur-md"><p className="text-center text-xs sm:text-sm font-black text-slate-300 drop-shadow-sm">تقييم ذاتي: هل إجابتك صحيحة؟</p><div className="flex flex-col sm:flex-row gap-3"><button onClick={() => handleSelfEvaluation(true)} className="flex-1 bg-emerald-600/90 hover:bg-emerald-500 text-white font-black py-3.5 sm:py-4 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-400/50 text-sm sm:text-base backdrop-blur-sm"><CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-sm" /> نعم، أتقنتها!</button><button onClick={() => handleSelfEvaluation(false)} className="flex-1 bg-rose-600/90 hover:bg-rose-500 text-white font-black py-3.5 sm:py-4 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_0_20px_rgba(244,63,94,0.3)] border border-rose-400/50 text-sm sm:text-base backdrop-blur-sm"><RefreshCcw className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-sm" /> لا، أخطأت 🔄</button></div></motion.div>
                    ) : <div className="text-center bg-[#0f1423] py-4 rounded-2xl border border-white/5 shadow-inner"><span className="text-xs sm:text-sm font-bold text-slate-500">انقر على "اكشف لي الجواب" في الأعلى لتقييم نفسك.</span></div>
                  ) : currentQ.type === 'section_header' ? (
                    <button onClick={nextQuestion} className="w-full bg-indigo-600/90 backdrop-blur-md text-white font-black py-4 sm:py-5 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-500 active:scale-95 transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/50 text-sm sm:text-base">تمت القراءة، متابعة <ChevronRight className="w-5 h-5 drop-shadow-sm" /></button>
                  ) : <button onClick={nextQuestion} className="w-full bg-slate-800 text-white font-black py-4 sm:py-5 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-700 active:scale-95 transition-all shadow-inner border border-white/10 text-sm sm:text-base">تخطي هذا السؤال (لا توجد خيارات) <ChevronRight className="w-5 h-5 drop-shadow-sm" /></button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel rounded-[2.5rem] sm:rounded-[3rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-indigo-500/20 p-8 sm:p-12 text-center relative overflow-hidden h-full flex flex-col justify-center">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 sm:w-80 sm:h-80 rounded-full blur-[80px] pointer-events-none mix-blend-screen ${isOfficial ? 'bg-indigo-500/20' : 'bg-amber-500/20'}`}></div>
                
                <div className={`w-28 h-28 sm:w-36 sm:h-36 rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner border relative z-10 ${isOfficial ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                  {isOfficial ? <FileText className="w-14 h-14 sm:w-16 sm:h-16 drop-shadow-md" /> : <Trophy className="w-14 h-14 sm:w-16 sm:h-16 drop-shadow-md" />}
                  <div className="absolute inset-0 rounded-[2rem] sm:rounded-[2.5rem] border-[4px] border-transparent border-t-current opacity-30 animate-spin"></div>
                </div>
                
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-3 sm:mb-4 tracking-tight drop-shadow-lg relative z-10">{isOfficial ? 'تم تسليم الواجب بنجاح! 🚀' : (mode === 'retake_errors' ? 'تم إنهاء المراجعة! 🛡️' : 'إنجاز أسطوري! 🌌')}</h2>
                <p className="text-slate-400 font-bold mb-8 sm:mb-10 text-sm sm:text-base relative z-10 max-w-md mx-auto">{isOfficial ? 'تم تشفير إجاباتك وإرسالها لمركز القيادة (المعلم) بنجاح.' : (mode === 'retake_errors' ? 'لقد واجهت نقاط ضعفك بقوة، هذا هو طريق التفوق.' : 'لقد أكملت التدريب التفاعلي ورفعت مستوى ذكائك.')}</p>
                
                {!isOfficial && (
                  <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-10 bg-[#02040a]/60 backdrop-blur-md p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-white/5 shadow-inner relative z-10 max-w-lg mx-auto w-full">
                    <div className="text-center border-l border-white/5 pr-2">
                       <div className="text-5xl sm:text-6xl font-black text-emerald-400 mb-2 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">{score.correct}</div>
                       <div className="text-[10px] sm:text-xs font-bold text-emerald-500/80 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-lg w-fit mx-auto border border-emerald-500/20">نقاط القوة</div>
                    </div>
                    <div className="text-center pl-2">
                       <div className="text-5xl sm:text-6xl font-black text-rose-400 mb-2 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]">{score.wrong}</div>
                       <div className="text-[10px] sm:text-xs font-bold text-rose-500/80 uppercase tracking-widest bg-rose-500/10 px-3 py-1 rounded-lg w-fit mx-auto border border-rose-500/20">تحتاج مراجعة</div>
                    </div>
                    <div className="col-span-2 mt-4 sm:mt-5 pt-4 sm:pt-5 border-t border-white/5 text-center flex items-center justify-center gap-2 text-indigo-400 font-black text-xs sm:text-sm bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/20 shadow-inner w-fit mx-auto">
                       <Clock className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-sm" /> استغرقت: {formatTime(timeSpentSeconds)}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:gap-4 relative z-10 max-w-md mx-auto w-full">
                  {!isPreviewMode && failedQuestionIds.size > 0 && !isOfficial && ( 
                    <button onClick={generatePDF} disabled={isGeneratingPDF} className="w-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-black py-4 sm:py-5 rounded-2xl hover:bg-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-inner backdrop-blur-sm text-sm sm:text-base">
                       {isGeneratingPDF ? <>جاري استخراج الملف السري... <Loader2 className="w-5 h-5 animate-spin" /></> : <>تحميل ملخص أخطائي (الشرح الذكي PDF) <Download className="w-5 h-5 drop-shadow-sm" /></>}
                    </button> 
                  )}
                  
                  {failedQuestionIds.size > 0 && mode === 'normal' && !isOfficial && ( 
                    <button onClick={handleRetakeErrorsOnly} className="w-full bg-indigo-600/90 backdrop-blur-md text-white font-black py-4 sm:py-5 rounded-2xl hover:bg-indigo-500 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/50 text-sm sm:text-base">
                       مراجعة وتدمير الأخطاء فقط 🎯
                    </button> 
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-2 sm:mt-4">
                    {!isOfficial && (
                      <button onClick={handleRetakeFull} className="bg-white/5 text-slate-300 border border-white/10 font-black py-3.5 sm:py-4 rounded-xl sm:rounded-2xl hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-inner backdrop-blur-sm text-xs sm:text-sm">
                         إعادة من الصفر <RefreshCcw className="w-4 h-4 drop-shadow-sm" />
                      </button>
                    )}
                    <button onClick={() => router.back()} className={`${isOfficial ? 'sm:col-span-2' : ''} bg-[#0f1423] text-white font-black py-3.5 sm:py-4 rounded-xl sm:rounded-2xl hover:bg-[#131836] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-inner border border-white/5 text-xs sm:text-sm`}>
                       الخروج من الساحة <ArrowRight className="w-4 h-4 drop-shadow-sm" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}
