// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, FileCheck, AlertCircle, Sparkles, 
  Layers, BookOpen, Heading, CheckCircle2, ClipboardCopy, 
  Copy, Check, Bot, Trash2, Edit3, Calendar, FolderOpen, Loader2
} from 'lucide-react';

const GOLDEN_PROMPT = `أنت مبرمج خبير ومحلل بيانات أكاديمي لمناهج وزارة التربية الكويتية.
مهمتك تفكيك الاختبارات السابقة وتصفيتها من التكرار في مصفوفة JSON نقية.

شروط هامة جداً:
1. تصنيف الأسئلة إلى فئات: ("scientific_term", "give_reason", "what_happens", "problems", "graphics", "compare").
2. منع التكرار: اجمع السنوات التي ورد فيها السؤال في [years_appeared].
3. الجداول: إذا كان السؤال أو الإجابة جدول مقارنة, حوله إلى كود LaTeX باستخدام بيئة \\begin{array}{|c|c|}.
4. الصور: إذا كان السؤال يحتوي على رسم بياني أو دائرة كهربائية، اكتب في البداية: "[يوجد رسم توضيحي]".
5. الأسطر: في الأسئلة المقالية أو الخطوات، استخدم \\n للنزول لسطر جديد.
6. المعادلات: استخدم $$ للمسائل الكبيرة المستقلة، و $ للمتغيرات داخل النص.
7. لا تكتب أي نصوص خارج مصفوفة الـ JSON.

الهيكل المطلوب:
[
  {
    "category": "problems",
    "topic_name": "الكهرباء",
    "question_text": "[يوجد رسم توضيحي]\\nمن خلال الدائرة، احسب:\\n1- المقاومة المكافئة.",
    "model_answer": "الخطوة الأولى:\\n $$ R = R_1 + R_2 $$ \\nالناتج النهائي...",
    "years_appeared": [2022, 2024],
    "importance_weight": "HIGH",
    "image_url": ""
  }
]`;

export default function ReviewArchitectPage() {
  const router = useRouter();
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

  const handleDeleteDoc = async (docId: string, docTitle: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف مذكرة "${docTitle}" بالكامل؟`)) return;
    try {
      const { error } = await supabase.from('review_documents').delete().eq('id', docId);
      if (error) throw error;
      setStatus({ type: 'success', msg: 'تم حذف المذكرة بنجاح!' });
      fetchExistingDocs();
    } catch (err) {
      setStatus({ type: 'error', msg: 'فشل حذف المذكرة.' });
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

      const { data: doc, error: docErr } = await supabase
        .from('review_documents')
        .insert({ title: title.trim(), academic_stage: stage, subject_name: subject.trim() })
        .select()
        .single();

      if (docErr) throw docErr;

      const questionsToInsert = parsedData.map((q: any) => ({
        document_id: doc.id,
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
        await supabase.from('review_documents').delete().eq('id', doc.id);
        throw questionsErr;
      }

      setStatus({ 
        type: 'success', 
        msg: `تم بنجاح بناء الكبسولة وحقن الأسئلة! جاري تحويلك لصفحة مدير الصور...` 
      });
      
      setTimeout(() => {
        router.push(`/admin/review-architect/${doc.id}`);
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
              <Database className="w-6 h-6 text-amber-400" /> مهندس المراجعات والكبسولات الوزارية
            </h2>
          </div>

          <form onSubmit={handleIngestData} className="space-y-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400"><Heading className="inline w-3.5 h-3.5" /> عنوان المستند الجديد</label>
                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: بنك أسئلة الفاينل الشامل لآخر 5 سنوات" className="w-full bg-[#02040a]/60 border border-white/10 rounded-xl p-3.5 text-white outline-none focus:border-amber-500" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400"><Layers className="inline w-3.5 h-3.5" /> المرحلة الدراسية</label>
                <select value={stage} onChange={e => setStage(e.target.value)} className="w-full bg-[#02040a]/60 border border-white/10 rounded-xl p-3.5 text-white outline-none">
                  <option value="9">الصف التاسع</option><option value="10">الصف العاشر</option><option value="11_scientific">11 علمي</option><option value="12_scientific">12 علمي</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400"><BookOpen className="inline w-3.5 h-3.5" /> المادة الدراسية</label>
                <input type="text" required value={subject} onChange={e => setSubject(e.target.value)} placeholder="مثال: الفيزياء" className="w-full bg-[#02040a]/60 border border-white/10 rounded-xl p-3.5 text-white outline-none" />
              </div>
            </div>

            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-5 relative">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-black text-indigo-300"><Bot className="inline w-4 h-4" /> البرومبت الذهبي (انسخه للذكاء الاصطناعي الخارجي)</label>
                <button type="button" onClick={handleCopyPrompt} className="px-3 py-1.5 bg-indigo-500/20 text-indigo-200 text-[10px] font-bold rounded-lg border border-indigo-500/30">
                  {isCopied ? 'تم النسخ!' : 'نسخ البرومبت'}
                </button>
              </div>
              <div className="h-24 overflow-y-auto custom-scrollbar text-[10px] text-slate-400 font-mono bg-[#02040a]/50 p-3 rounded-xl border border-black/50">{GOLDEN_PROMPT}</div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-emerald-400"><ClipboardCopy className="inline w-3.5 h-3.5" /> الصق ناتج وعاء الـ JSON هنا</label>
              <textarea required rows={6} value={jsonInput} onChange={e => setJsonInput(e.target.value)} placeholder="[ { 'category': 'problems', ... } ]" className="w-full bg-[#02040a]/80 border border-white/10 rounded-2xl p-4 text-emerald-400 font-mono text-xs outline-none focus:border-emerald-500 custom-scrollbar" dir="ltr" />
            </div>

            <AnimatePresence mode="wait">
              {status && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={`p-4 rounded-xl font-bold text-sm ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                  {status.msg}
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" disabled={loading || !jsonInput || !title} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black py-4 rounded-xl hover:opacity-90 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin text-black" /> : null}
              <span>{loading ? 'جاري معالجة وتدقيق حزم البيانات...' : 'حقن البيانات وإصدار المراجعة الجديدة'}</span>
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
                      <Edit3 className="w-3.5 h-3.5" /> تعديل الأسئلة والصور
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
