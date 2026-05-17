// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, FileCheck, AlertCircle, Sparkles, 
  Layers, BookOpen, Heading, CheckCircle2, ClipboardCopy, 
  Copy, Check, Bot, Trash2, Edit3, Calendar, FolderOpen, Loader2, PlusCircle, ArrowDownToLine
} from 'lucide-react';

const GOLDEN_PROMPT = `أنت مهندس بيانات أكاديمي صارم لمناهج وزارة التربية الكويتية.
مهمتك: قراءة ملفات الاختبارات المرفقة واستخراج **100% من الأسئلة بلا استثناء**. ممنوع التلخيص، ممنوع أخذ عينات، ممنوع تخطي أي سؤال.

يجب تفكيك الاختبارات وتصفيتها من التكرار الحرفي في مصفوفة JSON نقية باتباع هذه القواعد:

1. فئات الأسئلة (اختر الأنسب): ("scientific_term", "give_reason", "what_happens", "problems", "graphics", "compare", "mcq")
2. أسئلة الاختيار من متعدد (mcq):
- في question_text: اكتب نص السؤال كاملاً، تحته سطر جديد، ثم رص الخيارات (أ، ب، ج، د) كل خيار في سطر باستخدام \\n.
- في model_answer: اكتب الخيار الصحيح فقط.
3. الصور والرسومات: إذا كان السؤال يحتاج لرؤية صورة أو رسم، يجب أن يبدأ نص السؤال حصراً بعبارة: "[يوجد رسم ⚠️]\\n"
4. الجداول: أي جدول مقارنة يحول لكود LaTeX باستخدام \\begin{array}{|c|c|}
5. الرياضيات: استخدم $$ للمسائل المستقلة، و $ للمتغيرات والأرقام بالنص. استخدم \\n للنزول لسطر جديد.
6. التكرار: ادمج السؤال المتكرر واجمع سنوات ظهوره في [years_appeared].

الهيكل الإلزامي:
[
  {
    "category": "mcq",
    "topic_name": "الكهرباء",
    "question_text": "[يوجد رسم ⚠️]\\nفي الدائرة المجاورة، قراءة الفولتميتر:\\nأ) 5V\\nب) 10V",
    "model_answer": "ب) 10V",
    "years_appeared": [2021],
    "importance_weight": "HIGH",
    "image_url": ""
  }
]
استخرج كل الأسئلة بلا استثناء، أخرج JSON فقط.`;

// 🚀 دالة استخراج الـ ID الخاص بالصورة من رابط Cloudinary
const extractPublicId = (url: string) => {
  try {
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;
    const idWithExt = parts.slice(uploadIndex + 2).join('/');
    return idWithExt.split('.')[0];
  } catch (e) {
    return null;
  }
};

export default function ReviewArchitectPage() {
  const router = useRouter();
  
  const [injectionMode, setInjectionMode] = useState<'new' | 'append'>('new');
  const [selectedDocId, setSelectedDocId] = useState('');

  const [title, setTitle] = useState('');
  const [stage, setStage] = useState('11_scientific');
  const [subject, setSubject] = useState('الفيزياء');
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  
  const [existingDocs, setExistingDocs] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);

  const fetchExistingDocs = async () => {
    try {
      setDocsLoading(true);
      const { data, error } = await supabase
        .from('review_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExistingDocs(data || []);
      if (data && data.length > 0) {
        setSelectedDocId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching docs:', err);
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    fetchExistingDocs();
  }, []);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(GOLDEN_PROMPT);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // 🚀 دالة الحذف الشامل الآمنة (قاعدة البيانات + Cloudinary API مع Token)
  const handleDeleteDoc = async (docId: string, docTitle: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف مذكرة "${docTitle}" بالكامل؟ سيتم مسح جميع صورها من السحابة أيضاً.`)) return;
    
    try {
      setStatus({ type: 'success', msg: 'جاري الحذف والتنظيف السحابي الشامل...' });

      // 1. جلب كل الأسئلة لمعرفة التي تحتوي على صور
      const { data: questions } = await supabase
        .from('extracted_questions')
        .select('image_url')
        .eq('document_id', docId)
        .not('image_url', 'is', null);

      // 2. جلب التوكن الخاص بالمستخدم للمصادقة مع الـ API الخاص بك
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // 3. حذف الصور من كلاودينري
      if (questions && questions.length > 0 && token) {
        for (const q of questions) {
          const publicId = extractPublicId(q.image_url);
          if (publicId) {
            await fetch('/api/cloudinary/delete', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ public_id: publicId })
            });
          }
        }
      }

      // 4. حذف رأس المذكرة (وكل أسئلتها بالتبعية)
      const { error } = await supabase.from('review_documents').delete().eq('id', docId);
      if (error) throw error;
      
      setStatus({ type: 'success', msg: 'تمت الإبادة الشاملة للمذكرة وصورها بنجاح! 🧹' });
      fetchExistingDocs();
    } catch (err) {
      setStatus({ type: 'error', msg: 'فشل الحذف.' });
    }
  };

  const handleIngestData = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      let cleanedInput = jsonInput.trim().replace(/```json/gi, '').replace(/```/g, '').trim();
      const arrayMatch = cleanedInput.match(/\[[\s\S]*\]/);
      if (!arrayMatch) throw new Error("لم يتم العثور على مصفوفة JSON صحيحة.");
      
      cleanedInput = arrayMatch[0];

      let parsedData;
      try {
        parsedData = JSON.parse(cleanedInput);
      } catch (jsonErr) {
        throw new Error("صيغة الـ JSON غير صحيحة داخلياً.");
      }

      if (!Array.isArray(parsedData) || parsedData.length === 0) {
        throw new Error("بنية البيانات غير سليمة.");
      }

      let targetDocumentId = '';

      if (injectionMode === 'new') {
        const { data: doc, error: docErr } = await supabase
          .from('review_documents')
          .insert({ title: title.trim(), academic_stage: stage, subject_name: subject.trim() })
          .select()
          .single();

        if (docErr) throw docErr;
        targetDocumentId = doc.id;
      } else {
        if (!selectedDocId) throw new Error("يرجى اختيار المذكرة التي تريد الإضافة إليها.");
        targetDocumentId = selectedDocId;
      }

      const questionsToInsert = parsedData.map((q: any) => ({
        document_id: targetDocumentId,
        category: q.category,
        topic_name: q.topic_name || 'عام',
        question_text: q.question_text,
        model_answer: q.model_answer,
        years_appeared: Array.isArray(q.years_appeared) ? q.years_appeared : [],
        importance_weight: q.importance_weight || 'MEDIUM',
        image_url: q.image_url || null
      }));

      const { error: questionsErr } = await supabase
        .from('extracted_questions')
        .insert(questionsToInsert);

      if (questionsErr) {
        if (injectionMode === 'new') {
          await supabase.from('review_documents').delete().eq('id', targetDocumentId);
        }
        throw questionsErr;
      }

      setStatus({ 
        type: 'success', 
        msg: `تم بنجاح حقن ${questionsToInsert.length} سؤالاً! جاري تحويلك للمحرر...` 
      });
      
      setTimeout(() => {
        router.push(`/admin/review-architect/${targetDocumentId}`);
      }, 2000);

    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message || "حدث خطأ غير متوقع." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6 lg:p-8 font-sans" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-12">
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative glass-panel p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl">
          <div className="mb-8 border-b border-white/5 pb-6">
            <h2 className="text-xl sm:text-3xl font-black text-white flex items-center gap-2">
              <Database className="w-6 h-6 text-amber-400" /> مهندس المراجعات (نظام الحقن الذكي)
            </h2>
          </div>

          <form onSubmit={handleIngestData} className="space-y-8 relative z-10">
            
            <div className="flex p-1.5 bg-[#02040a]/60 rounded-2xl border border-white/10 w-full md:w-max mx-auto shadow-inner">
              <button 
                type="button" 
                onClick={() => setInjectionMode('new')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all ${injectionMode === 'new' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                <PlusCircle className="w-4 h-4" /> تأسيس مذكرة جديدة
              </button>
              <button 
                type="button" 
                onClick={() => setInjectionMode('append')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all ${injectionMode === 'append' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                <ArrowDownToLine className="w-4 h-4" /> الحقن التراكمي (إضافة لسابقة)
              </button>
            </div>

            <AnimatePresence mode="wait">
              {injectionMode === 'new' ? (
                <motion.div key="new-doc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400"><Heading className="inline w-3.5 h-3.5" /> عنوان المستند الجديد</label>
                    <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: بنك أسئلة الفاينل الشامل" className="w-full bg-[#02040a]/60 border border-white/10 rounded-xl p-3.5 text-white outline-none focus:border-indigo-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400"><Layers className="inline w-3.5 h-3.5" /> المرحلة الدراسية</label>
                    <select value={stage} onChange={e => setStage(e.target.value)} className="w-full bg-[#02040a]/60 border border-white/10 rounded-xl p-3.5 text-white outline-none focus:border-indigo-500">
                      <option value="9">الصف التاسع</option><option value="10">الصف العاشر</option><option value="11_scientific">11 علمي</option><option value="12_scientific">12 علمي</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400"><BookOpen className="inline w-3.5 h-3.5" /> المادة الدراسية</label>
                    <input type="text" required value={subject} onChange={e => setSubject(e.target.value)} placeholder="مثال: الفيزياء" className="w-full bg-[#02040a]/60 border border-white/10 rounded-xl p-3.5 text-white outline-none focus:border-indigo-500" />
                  </div>
                </motion.div>
              ) : (
                <motion.div key="append-doc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-amber-500/5 border border-amber-500/20 p-5 rounded-2xl">
                  <label className="text-sm font-black text-amber-400 block mb-3"><FolderOpen className="inline w-4 h-4 mr-1" /> اختر المذكرة التي تريد الإضافة إليها:</label>
                  {existingDocs.length > 0 ? (
                    <select 
                      value={selectedDocId} 
                      onChange={e => setSelectedDocId(e.target.value)} 
                      className="w-full bg-[#02040a]/80 border border-amber-500/30 rounded-xl p-4 text-white font-bold outline-none focus:border-amber-500"
                    >
                      {existingDocs.map(doc => (
                        <option key={doc.id} value={doc.id}>{doc.title} ({doc.academic_stage} - {doc.subject_name})</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-rose-400 text-sm font-bold">لا يوجد مذكرات سابقة، يرجى إنشاء مذكرة جديدة أولاً.</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-5 relative">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-black text-indigo-300"><Bot className="inline w-4 h-4" /> البرومبت الذهبي المدرع (V4)</label>
                <button type="button" onClick={handleCopyPrompt} className="px-3 py-1.5 bg-indigo-500/20 text-indigo-200 text-[10px] font-bold rounded-lg border border-indigo-500/30 hover:bg-indigo-500/40 transition-colors">
                  {isCopied ? 'تم النسخ بنجاح! ✨' : 'نسخ البرومبت'}
                </button>
              </div>
              <div className="h-28 overflow-y-auto custom-scrollbar text-[11px] text-slate-300 font-mono bg-[#02040a]/60 p-4 rounded-xl border border-black/50 leading-relaxed whitespace-pre-wrap">{GOLDEN_PROMPT}</div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-emerald-400"><ClipboardCopy className="inline w-3.5 h-3.5" /> الصق دفعة الـ JSON هنا</label>
              <textarea required rows={6} value={jsonInput} onChange={e => setJsonInput(e.target.value)} placeholder="[ { 'category': 'problems', ... } ]" className="w-full bg-[#02040a]/80 border border-white/10 rounded-2xl p-4 text-emerald-400 font-mono text-xs outline-none focus:border-emerald-500 custom-scrollbar" dir="ltr" />
            </div>

            <AnimatePresence mode="wait">
              {status && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={`p-4 rounded-xl font-bold text-sm ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                  {status.msg}
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit" 
              disabled={loading || !jsonInput || (injectionMode === 'new' && !title) || (injectionMode === 'append' && !selectedDocId)} 
              className={`w-full text-black font-black py-4 rounded-xl hover:opacity-90 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 shadow-xl ${injectionMode === 'new' ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white' : 'bg-gradient-to-r from-amber-500 to-amber-600'}`}
            >
              {loading ? <Loader2 className={`w-5 h-5 animate-spin ${injectionMode === 'new' ? 'text-white' : 'text-black'}`} /> : <CheckCircle2 className="w-5 h-5" />}
              <span>{loading ? 'جاري الحقن والتدقيق...' : injectionMode === 'new' ? 'تأسيس وحقن المذكرة الجديدة' : 'حقن ودمج الأسئلة بالمذكرة المحددة'}</span>
            </button>
          </form>
        </motion.div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <FolderOpen className="text-indigo-400 w-5 h-5" />
            <h3 className="text-xl font-black text-white">مذكرات المراجعة الحالية (قيد الإدارة)</h3>
          </div>

          {docsLoading ? (
            <div className="p-10 text-center"><Loader2 className="w-8 h-8 animate-spin text-slate-500 mx-auto" /></div>
          ) : existingDocs.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {existingDocs.map((doc) => (
                <div key={doc.id} className="glass-panel p-5 rounded-2xl border border-white/5 bg-[#0f1423]/30 flex flex-col sm:flex-row justify-between items-center gap-4 hover:border-white/10 transition-all">
                  <div className="space-y-1 w-full sm:w-auto text-right">
                    <h4 className="text-base font-black text-white">{doc.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-slate-400 font-bold justify-start">
                      <span className="text-amber-400">{doc.subject_name}</span>
                      <span>•</span>
                      <span>المرحلة: {doc.academic_stage}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-500"><Calendar className="w-3 h-3" /> {new Date(doc.created_at).toLocaleDateString('ar-SA')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t border-white/5 sm:border-none pt-3 sm:pt-0">
                    <button 
                      onClick={() => router.push(`/admin/review-architect/${doc.id}`)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-black transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> إدارة الأسئلة والصور
                    </button>
                    <button 
                      onClick={() => handleDeleteDoc(doc.id, doc.title)}
                      className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center bg-[#0f1423]/10 rounded-2xl border border-white/5 text-sm text-slate-500 font-bold">
              لا توجد مذكرات مؤرشفة حالياً.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
