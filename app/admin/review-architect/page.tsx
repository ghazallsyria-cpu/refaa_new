// @ts-nocheck
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation'; // 🚀 استيراد الموجّه الجديد
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, FileCheck, AlertCircle, Sparkles, 
  Layers, BookOpen, Heading, CheckCircle2, ClipboardCopy, Copy, Check, Bot
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
  const router = useRouter(); // 🚀 تفعيل سحري للموجّه
  const [title, setTitle] = useState('');
  const [stage, setStage] = useState('11_scientific');
  const [subject, setSubject] = useState('الفيزياء');
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(GOLDEN_PROMPT);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
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

      // أ) إنشاء رأس المستند الفردي
      const { data: doc, error: docErr } = await supabase
        .from('review_documents')
        .insert({ title: title.trim(), academic_stage: stage, subject_name: subject.trim() })
        .select()
        .single();

      if (docErr) throw docErr;

      // ب) إعداد حزمة الأسئلة
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

      // ج) الحقن الجماعي في الخادم
      const { error: questionsErr } = await supabase
        .from('extracted_questions')
        .insert(questionsToInsert);

      if (questionsErr) {
        await supabase.from('review_documents').delete().eq('id', doc.id);
        throw questionsErr;
      }

      // 🎉 د) النجاح وإعلام المستخدم بالتوجيه الحركي القادم
      setStatus({ 
        type: 'success', 
        msg: `تم بنجاح بناء الكبسولة وحقن ${questionsToInsert.length} سؤالاً وزارياً! جاري تحويلك الآن تلقائياً لصفحة مدير الصور لرفع الرسومات البيانية عبر Cloudinary... ☁️` 
      });
      
      // 🚀 هـ) توجيه تلقائي ذكي لصفحة إدارة الصور بعد ثانيتين ونصف ليرى المعلم الإشعار أولاً
      setTimeout(() => {
        router.push(`/admin/review-architect/${doc.id}`);
      }, 2500);

    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message || "حدث خطأ غير متوقع." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6 lg:p-8 font-sans" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative glass-panel p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl">
          <div className="mb-8 border-b border-white/5 pb-6">
            <h2 className="text-xl sm:text-3xl font-black text-white flex items-center gap-2">
              <Database className="w-6 h-6 text-amber-400" /> مهندس المراجعات والكبسولات الوزارية
            </h2>
          </div>

          <form onSubmit={handleIngestData} className="space-y-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400"><Heading className="inline w-3.5 h-3.5" /> عنوان المستند</label>
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
              <textarea required rows={8} value={jsonInput} onChange={e => setJsonInput(e.target.value)} placeholder="[ { 'category': 'problems', ... } ]" className="w-full bg-[#02040a]/80 border border-white/10 rounded-2xl p-4 text-emerald-400 font-mono text-xs outline-none focus:border-emerald-500 custom-scrollbar" dir="ltr" />
            </div>

            <AnimatePresence mode="wait">
              {status && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={`p-4 rounded-xl font-bold text-sm ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                  {status.msg}
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" disabled={loading || !jsonInput || !title} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black py-4 rounded-xl hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.99]">
              {loading ? 'جاري معالجة وتدقيق حزم البيانات...' : 'حقن البيانات وإصدار المراجعة'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
