'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Node, mergeAttributes, Mark } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { 
  Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon, Image as ImageIcon, 
  List, ListOrdered, RemoveFormatting, Loader2, Table as TableIcon, 
  Heading1, Heading2, TerminalSquare, AlignRight, AlignCenter, AlignLeft, AlignJustify,
  Palette, Type, BarChart3, X, Calculator
} from 'lucide-react';

// مكتبة الرسوم البيانية (موجودة في package.json الخاص بك)
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// ==========================================
// 1. إضافة مخصصة لحجم الخط (Font Size)
// ==========================================
const FontSize = Mark.create({
  name: 'fontSize',
  addOptions() { return { types: ['textStyle'] }; },
  addGlobalAttributes() {
    return {
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
          renderHTML: attributes => {
            if (!attributes.fontSize) return {};
            return { style: `font-size: ${attributes.fontSize}` };
          },
        },
      },
    };
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize: () => ({ chain }) => chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

// ==========================================
// 2. إضافة مخصصة للرسم البياني (Chart Node)
// ==========================================
const ChartComponent = (props: any) => {
  const [data, setData] = useState(props.node.attrs.data || [
    { name: 'يناير', value: 400 },
    { name: 'فبراير', value: 300 },
    { name: 'مارس', value: 600 }
  ]);
  const [isEditing, setIsEditing] = useState(false);
  const [tempData, setTempData] = useState(JSON.stringify(data, null, 2));

  const saveChartData = () => {
    try {
      const parsed = JSON.parse(tempData);
      setData(parsed);
      props.updateAttributes({ data: parsed });
      setIsEditing(false);
    } catch (e) {
      alert("خطأ في تنسيق البيانات. الرجاء التأكد من كتابتها بشكل صحيح.");
    }
  };

  return (
    <NodeViewWrapper className="my-6 border border-slate-200 rounded-xl p-4 bg-slate-50 relative group">
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
        <button onClick={() => setIsEditing(!isEditing)} className="bg-white shadow text-xs font-bold px-3 py-1 rounded text-indigo-600 border border-indigo-100 hover:bg-indigo-50">تعديل البيانات</button>
        <button onClick={props.deleteNode} className="bg-white shadow text-xs font-bold px-3 py-1 rounded text-red-600 border border-red-100 hover:bg-red-50">حذف</button>
      </div>

      {isEditing ? (
        <div className="p-4 bg-white rounded-lg border border-slate-200" dir="ltr">
          <label className="block text-xs font-bold text-slate-500 mb-2 text-right">قم بتعديل البيانات (JSON format):</label>
          <textarea 
            value={tempData} 
            onChange={(e) => setTempData(e.target.value)}
            className="w-full h-40 p-3 font-mono text-sm border rounded bg-slate-50 outline-none focus:border-indigo-500"
          />
          <div className="mt-2 flex justify-end gap-2" dir="rtl">
            <button onClick={saveChartData} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded hover:bg-indigo-700">حفظ وعرض</button>
            <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-slate-200 text-slate-700 text-sm font-bold rounded hover:bg-slate-300">إلغاء</button>
          </div>
        </div>
      ) : (
        <div className="h-[300px] w-full mt-4" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
              <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </NodeViewWrapper>
  );
};

const ChartExtension = Node.create({
  name: 'chartBlock',
  group: 'block',
  atom: true,
  addAttributes() { return { data: { default: null } }; },
  parseHTML() { return [{ tag: 'div[data-type="chart"]' }]; },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'chart' })]; },
  addNodeView() { return ReactNodeViewRenderer(ChartComponent); },
});

// ==========================================
// المكون الرئيسي للمحرر
// ==========================================
interface ForumEditorProps {
  content: string;
  setContent: (content: string) => void;
  canUploadImage: boolean;
  placeholder?: string;
}

export default function ForumEditor({ 
  content, 
  setContent, 
  canUploadImage, 
  placeholder = "اكتب مقالك الاحترافي هنا..." 
}: ForumEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // حالات القوائم المنسدلة
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [showMathUI, setShowMathUI] = useState(false);
  
  const [linkUrl, setLinkUrl] = useState('');

  // دالة الرفع إلى Cloudinary
  const uploadImageFile = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default');
      
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST', body: formData
      });
      const data = await res.json();
      
      if (data.secure_url && editor) {
        editor.chain().focus().setImage({ src: data.secure_url }).run();
      }
    } catch (error) {
      alert('حدث خطأ أثناء رفع الصورة.');
    } finally {
      setIsUploading(false);
    }
  };

  // إعداد محرر TipTap بكامل إضافاته
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image,
      TextStyle,
      Color,
      FontSize,
      ChartExtension,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: content,
    onUpdate: ({ editor }) => { setContent(editor.getHTML()); },
    editorProps: {
      attributes: {
        class: 'w-full min-h-[300px] max-h-[700px] overflow-y-auto p-6 outline-none prose prose-slate prose-indigo max-w-none text-slate-800 leading-loose text-base font-medium',
        dir: 'auto',
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items || !canUploadImage) return false;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            event.preventDefault();
            const file = items[i].getAsFile();
            if (file) { uploadImageFile(file); return true; }
          }
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  if (!editor) {
    return <div className="border border-slate-200 rounded-[1.5rem] p-5 bg-white shadow flex items-center justify-center min-h-[300px]"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }

  // دوال الإدراج
  const addLink = () => {
    if (linkUrl) { editor.chain().focus().setLink({ href: linkUrl }).run(); setLinkUrl(''); setShowLinkInput(false); } 
    else { editor.chain().focus().unsetLink().run(); setShowLinkInput(false); }
  };

  const insertTable = () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  const insertChart = () => editor.chain().focus().insertContent('<div data-type="chart"></div>').run();

  // دالة إدراج الرياضيات بصرياً
  const insertMathSymbol = (symbol: string, wrapper = false) => {
    if (wrapper) {
      editor.chain().focus().insertContent(`&nbsp;<span style="background: #f8fafc; padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #db2777; font-weight: bold;" dir="ltr">${symbol}</span>&nbsp;`).run();
    } else {
      editor.chain().focus().insertContent(symbol).run();
    }
  };

  const ToolbarButton = ({ icon: Icon, onClick, isActive, title }: any) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`p-2 rounded-lg transition-all ${isActive ? 'bg-indigo-100 text-indigo-700 shadow-inner' : 'bg-transparent text-slate-600 hover:bg-slate-200 hover:text-indigo-600'}`}
      title={title}
    >
      <Icon className="w-4.5 h-4.5" />
    </button>
  );

  return (
    <div className="border border-slate-200 rounded-[1.5rem] overflow-hidden bg-white shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200 transition-all font-sans">
      
      {/* شريط الأدوات الرئيسي */}
      <div className="bg-slate-50/95 backdrop-blur-md border-b border-slate-200 p-2 flex flex-wrap items-center gap-1 sticky top-0 z-20" dir="rtl">
        
        {/* التنسيق الأساسي */}
        <div className="flex items-center gap-0.5 border-l border-slate-300 pl-2 ml-1">
          <ToolbarButton icon={Bold} onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="عريض" />
          <ToolbarButton icon={Italic} onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="مائل" />
          <ToolbarButton icon={UnderlineIcon} onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="تسطير" />
        </div>

        {/* المحاذاة (الجديد) */}
        <div className="flex items-center gap-0.5 border-l border-slate-300 pl-2 ml-1">
          <ToolbarButton icon={AlignRight} onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="محاذاة لليمين" />
          <ToolbarButton icon={AlignCenter} onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="محاذاة للوسط" />
          <ToolbarButton icon={AlignLeft} onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="محاذاة لليسار" />
          <ToolbarButton icon={AlignJustify} onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} title="ضبط النص" />
        </div>

        {/* الألوان والخطوط (الجديد) */}
        <div className="flex items-center gap-0.5 border-l border-slate-300 pl-2 ml-1 relative">
          {/* الألوان */}
          <button type="button" onClick={() => { setShowColorPicker(!showColorPicker); setShowFontSize(false); setShowMathUI(false); }} className={`p-2 rounded-lg ${showColorPicker ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`} title="لون النص">
            <Palette className="w-4.5 h-4.5" />
          </button>
          
          {showColorPicker && (
            <div className="absolute top-full mt-2 right-0 bg-white border border-slate-200 shadow-xl rounded-xl p-3 flex flex-wrap gap-2 z-50 w-48">
              {['#000000', '#ef4444', '#f97316', '#84cc16', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'].map(color => (
                <button key={color} onClick={() => { editor.chain().focus().setColor(color).run(); setShowColorPicker(false); }} className="w-8 h-8 rounded-full border border-slate-200 hover:scale-110 transition-transform" style={{ backgroundColor: color }} />
              ))}
              <button onClick={() => editor.chain().focus().unsetColor().run()} className="w-full mt-1 text-xs text-slate-500 hover:text-slate-800">إزالة اللون</button>
            </div>
          )}

          {/* حجم الخط */}
          <button type="button" onClick={() => { setShowFontSize(!showFontSize); setShowColorPicker(false); setShowMathUI(false); }} className={`p-2 rounded-lg ${showFontSize ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`} title="حجم الخط">
            <Type className="w-4.5 h-4.5" />
          </button>

          {showFontSize && (
            <div className="absolute top-full mt-2 right-0 bg-white border border-slate-200 shadow-xl rounded-xl p-2 flex flex-col z-50 w-32">
              <button onClick={() => { editor.chain().focus().setFontSize('12px').run(); setShowFontSize(false); }} className="px-3 py-2 text-sm text-right hover:bg-slate-100 rounded">صغير جداً</button>
              <button onClick={() => { editor.chain().focus().unsetFontSize().run(); setShowFontSize(false); }} className="px-3 py-2 text-base text-right hover:bg-slate-100 rounded">عادي (افتراضي)</button>
              <button onClick={() => { editor.chain().focus().setFontSize('20px').run(); setShowFontSize(false); }} className="px-3 py-2 text-lg font-semibold text-right hover:bg-slate-100 rounded">كبير</button>
              <button onClick={() => { editor.chain().focus().setFontSize('28px').run(); setShowFontSize(false); }} className="px-3 py-2 text-2xl font-bold text-right hover:bg-slate-100 rounded">ضخم</button>
            </div>
          )}
        </div>

        {/* القوائم */}
        <div className="flex items-center gap-0.5 border-l border-slate-300 pl-2 ml-1">
          <ToolbarButton icon={List} onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="قائمة نقطية" />
          <ToolbarButton icon={ListOrdered} onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="قائمة رقمية" />
        </div>

        {/* الإدراجات المتقدمة (الرابط، الجدول، الرسم البياني، الرياضيات) */}
        <div className="flex items-center gap-0.5 border-l border-slate-300 pl-2 ml-1 relative">
          <ToolbarButton icon={LinkIcon} onClick={() => { setShowLinkInput(!showLinkInput); setShowMathUI(false); }} isActive={editor.isActive('link') || showLinkInput} title="إضافة رابط" />
          <ToolbarButton icon={TableIcon} onClick={insertTable} title="إدراج جدول" />
          <ToolbarButton icon={BarChart3} onClick={insertChart} title="إدراج رسم بياني تفاعلي" />
          
          {/* زر الرياضيات البصرية */}
          <button type="button" onClick={() => { setShowMathUI(!showMathUI); setShowLinkInput(false); setShowColorPicker(false); setShowFontSize(false); }} className={`p-2 rounded-lg ${showMathUI ? 'bg-pink-100 text-pink-700' : 'text-slate-600 hover:bg-slate-200'}`} title="كتابة معادلات رياضية">
            <Calculator className="w-4.5 h-4.5" />
          </button>

          {/* نافذة الرابط */}
          {showLinkInput && (
             <div className="absolute top-full mt-2 right-0 bg-white border border-slate-200 shadow-xl rounded-xl p-3 flex gap-2 z-50 w-72">
                <input type="url" placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addLink()} className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" dir="ltr" />
                <button type="button" onClick={addLink} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700">إدراج</button>
             </div>
          )}

          {/* نافذة الرياضيات البصرية (الجديد) */}
          {showMathUI && (
            <div className="absolute top-full mt-2 right-0 bg-white border border-slate-200 shadow-2xl rounded-xl p-4 z-50 w-80 animate-in fade-in zoom-in">
              <div className="flex justify-between items-center mb-3 border-b pb-2">
                <span className="font-bold text-sm text-pink-600">لوحة الرموز الرياضية</span>
                <button onClick={() => setShowMathUI(false)} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4"/></button>
              </div>
              <div className="grid grid-cols-4 gap-2" dir="ltr">
                <button onClick={() => insertMathSymbol('½')} className="p-2 border rounded hover:bg-pink-50 font-mono font-bold">½</button>
                <button onClick={() => insertMathSymbol('¾')} className="p-2 border rounded hover:bg-pink-50 font-mono font-bold">¾</button>
                <button onClick={() => insertMathSymbol('√')} className="p-2 border rounded hover:bg-pink-50 font-mono font-bold">√</button>
                <button onClick={() => insertMathSymbol('∛')} className="p-2 border rounded hover:bg-pink-50 font-mono font-bold">∛</button>
                <button onClick={() => insertMathSymbol('x²')} className="p-2 border rounded hover:bg-pink-50 font-mono font-bold">x²</button>
                <button onClick={() => insertMathSymbol('x³')} className="p-2 border rounded hover:bg-pink-50 font-mono font-bold">x³</button>
                <button onClick={() => insertMathSymbol('π')} className="p-2 border rounded hover:bg-pink-50 font-mono font-bold">π</button>
                <button onClick={() => insertMathSymbol('∞')} className="p-2 border rounded hover:bg-pink-50 font-mono font-bold">∞</button>
                <button onClick={() => insertMathSymbol('∑')} className="p-2 border rounded hover:bg-pink-50 font-mono font-bold">∑</button>
                <button onClick={() => insertMathSymbol('∫')} className="p-2 border rounded hover:bg-pink-50 font-mono font-bold">∫</button>
                <button onClick={() => insertMathSymbol('≠')} className="p-2 border rounded hover:bg-pink-50 font-mono font-bold">≠</button>
                <button onClick={() => insertMathSymbol('≈')} className="p-2 border rounded hover:bg-pink-50 font-mono font-bold">≈</button>
              </div>
              <p className="mt-3 text-xs text-slate-500 text-center">اضغط على الرمز لإدراجه مباشرة في النص</p>
            </div>
          )}
        </div>

        <ToolbarButton icon={RemoveFormatting} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="إزالة التنسيق" />

        {/* رفع الصورة */}
        {canUploadImage && (
          <div className="mr-auto flex items-center">
             <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={async (e) => { const f = e.target.files?.[0]; if(f) await uploadImageFile(f); if(fileInputRef.current) fileInputRef.current.value = ''; }} />
             <button type="button" disabled={isUploading} onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-sm border border-indigo-100 hover:bg-indigo-100 transition-colors disabled:opacity-50 shadow-sm" title="يمكنك أيضاً لصق الصورة بـ Ctrl+V">
               {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
               <span className="hidden sm:inline">{isUploading ? 'جاري الرفع...' : 'إدراج صورة'}</span>
             </button>
          </div>
        )}
      </div>

      {/* أدوات الجدول */}
      {editor.isActive('table') && (
        <div className="flex flex-wrap gap-2 p-2 bg-indigo-50/70 border-b border-indigo-100 text-xs font-bold shadow-inner" dir="rtl">
          <span className="text-indigo-800 ml-2 flex items-center">أدوات الجدول:</span>
          <button onClick={() => editor.chain().focus().addColumnBefore().run()} className="text-indigo-600 hover:text-indigo-900 bg-white px-2 py-1 rounded border border-indigo-200">عمود قبل</button>
          <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="text-indigo-600 hover:text-indigo-900 bg-white px-2 py-1 rounded border border-indigo-200">عمود بعد</button>
          <button onClick={() => editor.chain().focus().deleteColumn().run()} className="text-red-500 hover:text-red-700 bg-white px-2 py-1 rounded border border-red-100">حذف عمود</button>
          <span className="text-indigo-200 flex items-center">|</span>
          <button onClick={() => editor.chain().focus().addRowBefore().run()} className="text-indigo-600 hover:text-indigo-900 bg-white px-2 py-1 rounded border border-indigo-200">صف قبل</button>
          <button onClick={() => editor.chain().focus().addRowAfter().run()} className="text-indigo-600 hover:text-indigo-900 bg-white px-2 py-1 rounded border border-indigo-200">صف بعد</button>
          <button onClick={() => editor.chain().focus().deleteRow().run()} className="text-red-500 hover:text-red-700 bg-white px-2 py-1 rounded border border-red-100">حذف صف</button>
          <span className="text-indigo-200 flex items-center">|</span>
          <button onClick={() => editor.chain().focus().mergeCells().run()} className="text-indigo-600 hover:text-indigo-900 bg-white px-2 py-1 rounded border border-indigo-200">دمج الخلايا</button>
          <button onClick={() => editor.chain().focus().deleteTable().run()} className="text-white hover:bg-red-700 bg-red-500 px-2 py-1 rounded ml-auto">حذف الجدول</button>
        </div>
      )}

      {/* منطقة المحرر */}
      <div className="relative">
        {isUploading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] flex items-center justify-center z-20 rounded-b-[1.5rem]">
             <div className="bg-white px-5 py-3 rounded-full shadow-lg border border-slate-100 flex items-center gap-3 font-bold text-sm text-indigo-600">
               <Loader2 className="w-5 h-5 animate-spin" /> جاري رفع الصورة...
             </div>
          </div>
        )}
        <EditorContent editor={editor} className="custom-tiptap-styles" />
      </div>

      {/* تنسيقات CSS القوية (Tailwind Typography Base) */}
      <style dangerouslySetInnerHTML={{__html: `
        .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: right; color: #94a3b8; pointer-events: none; height: 0; font-weight: 500; }
        .custom-tiptap-styles .ProseMirror { outline: none !important; }
        .custom-tiptap-styles .ProseMirror table { width: 100%; border-collapse: collapse; margin: 1.5em 0; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .custom-tiptap-styles .ProseMirror td, .custom-tiptap-styles .ProseMirror th { border: 1px solid #e2e8f0; padding: 0.75rem; vertical-align: top; position: relative; }
        .custom-tiptap-styles .ProseMirror th { background-color: #f8fafc; font-weight: 700; text-align: right; }
        .custom-tiptap-styles .ProseMirror .selectedCell:after { z-index: 2; position: absolute; content: ""; left: 0; right: 0; top: 0; bottom: 0; background: rgba(99, 102, 241, 0.1); pointer-events: none; }
        .custom-tiptap-styles .ProseMirror img { display: inline-block; max-width: 100%; height: auto; border-radius: 12px; margin: 15px 0; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .custom-tiptap-styles .ProseMirror img.ProseMirror-selectednode { outline: 3px solid #6366f1; }
      `}} />
    </div>
  );
}
