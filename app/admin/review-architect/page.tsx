// @ts-nocheck
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, FileCheck, AlertCircle, Sparkles, 
  Layers, BookOpen, Heading, CheckCircle2, ClipboardCopy, Copy, Check, Bot
} from 'lucide-react';

// ==========================================
// 🧠 البرومبت الذهبي (محفوظ كمتغير ثابت)
// ==========================================
const GOLDEN_PROMPT = `أنت مبرمج خبير ومحلل بيانات أكاديمي متخصص في مناهج وزارة التربية الكويتية.
مهمتك هي قراءة جميع ملفات اختبارات الفاينل السابقة المرفقة، وتفكيكها، وتصفيتها من التكرار، ثم إنتاج مصفوفة JSON نقية تطابق الهيكلية المحددة أدناه تماماً.

شروط معالجة البيانات الصارمة:
1. تصنيف الأسئلة إلى فئات محددة: ("scientific_term", "give_reason", "what_happens", "problems", "graphics").
2. منع التكرار (Strict Deduplication): إذا تكرر نفس السؤال الحرفي أو نفس المفهوم العلمي في أكثر من سنة، قم بدمجهما في كائن (Object) واحد فقط، واجمع السنوات التي ورد فيها داخل مصفوفة [years_appeared].
3. استخراج الإجابة النموذجية الدقيقة من نموذج الإجابة المرفق وربطها بالسؤال.
4. في قسم المسائل (problems): إذا كانت المسألة تحتوي على أرقام تغيرت عبر السنوات لنفس الفكرة، اعتبرها أسئلة منفصلة، أما الأسئلة المقالية والنظرية والمصطلحات فتُدمج دمجاً صارماً.
5. لا تكتب أي مقدمات أو مؤخرات نصية. لا تضع الكود داخل علامات مقطعية مثل \`\`\`json. أريد مصفوفة JSON نقية تبدأ بـ [ وتنتهي بـ ] فقط.

الهيكلية المطلوبة للـ JSON:
[
  {
    "category": "scientific_term",
    "topic_name": "اسم الوحدة أو الدرس هنا",
    "question_text": "نص السؤال هنا",
    "model_answer": "الإجابة النموذجية الدقيقة هنا",
    "years_appeared": [2021, 2023, 2025],
    "importance_weight": "HIGH"
  }
]`;

export default function ReviewArchitectPage() {
  const [title, setTitle] = useState('');
  const [stage, setStage] = useState('11_scientific');
  const [subject, setSubject] = useState('الفيزياء');
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // دالة نسخ البرومبت
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
      const cleanedInput = jsonInput.trim();
      let parsedData;
      
      try {
        parsedData = JSON.parse(cleanedInput);
      } catch (jsonErr) {
        throw new Error("صيغة الـ JSON غير صحيحة. يرجى التأكد من عدم وجود فواصل زائدة أو نصوص خارج الأقواس المصفوفية [ ].");
      }

      if (!Array.isArray(parsedData)) {
        throw new Error("بنية البيانات غير سليمة، يجب أن يكون الـ JSON عبارة عن مصفوفة أسئلة تبدأ بـ [ وتنتهي بـ ].");
      }

      if (parsedData.length > 0) {
        const firstItem = parsedData[0];
        if (!firstItem.category || !firstItem.question_text || !firstItem.model_answer) {
          throw new Error("العناصر تفتقد لبعض الحقول الأساسية (category, question_text, model_answer). يرجى مراجعة قالب الاستخراج.");
        }
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
        importance_weight: q.importance_weight || 'MEDIUM'
      }));

      const { error: questionsErr } = await supabase
        .from('extracted_questions')
        .insert(questionsToInsert);

      if (questionsErr) {
        await supabase.from('review_documents').delete().eq('id', doc.id);
        throw questionsErr;
      }

      setStatus({ type: 'success', msg: `تم تفكيك وتحليل الاختبارات! تم حقن ${questionsToInsert.length} سؤالاً مصفى من التكرار بنجاح.` });
      setJsonInput('');
      setTitle('');
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message || "حدث خطأ غير متوقع أثناء حقن البيانات في السيرفر." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6 lg:p-8 font-sans" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="relative glass-panel p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl"
        >
          <div className="absolute top-0 left-0 w-48 h-48 bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none mix-blend-screen"></div>
          
          <div className="mb-8 border-b border-white/5 pb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 shadow-inner">
                <Database className="w-6 h-6 text-amber-400" />
              </div>
              <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                مهندس المراجعات والكبسولات الوزارية <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
              </h2>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm font-medium">
              الخطوة 1: انسخ البرومبت للذكاء الاصطناعي. الخطوة 2: الصق الـ JSON الناتج هنا.
            </p>
          </div>

          <form onSubmit={handleIngestData} className="space-y-6 relative z-10">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 mr-1 flex items-center gap-1">
                  <Heading className="w-3.5 h-3.5 text-indigo-400" /> عنوان مستند المراجعة
                </label>
                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: بنك أسئلة الفاينل" className="w-full bg-[#02040a]/60 border border-white/10 rounded-xl p-3.5 text-white text-sm outline-none focus:border-amber-500 transition-colors shadow-inner" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 mr-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" /> المرحلة الدراسية
                </label>
                <select value={stage} onChange={e => setStage(e.target.value)} className="w-full bg-[#02040a]/60 border border-white/10 rounded-xl p-3.5 text-white text-sm outline-none cursor-pointer focus:border-amber-500 transition-colors shadow-inner">
                  <option value="9">الصف التاسع</option>
                  <option value="10">الصف العاشر</option>
                  <option value="11_scientific">11 علمي</option>
                  <option value="12_scientific">12 علمي</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 mr-1 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> المادة الدراسية
                </label>
                <input type="text" required value={subject} onChange={e => setSubject(e.target.value)} placeholder="مثال: الفيزياء" className="w-full bg-[#02040a]/60 border border-white/10 rounded-xl p-3.5 text-white text-sm outline-none focus:border-amber-500 transition-colors shadow-inner" />
              </div>
            </div>

            {/* 🚀 قسم البرومبت الجديد المضاف */}
            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-5 space-y-3 relative overflow-hidden">
              <div className="flex justify-between items-center mb-2 relative z-10">
                <label className="text-xs font-black text-indigo-300 flex items-center gap-2">
                  <Bot className="w-4 h-4" /> (الخطوة 1) البرومبت البرمجي للذكاء الاصطناعي الخارجي
                </label>
                <button 
                  type="button" 
                  onClick={handleCopyPrompt} 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-200 text-[10px] font-bold rounded-lg transition-colors border border-indigo-500/30"
                >
                  {isCopied ? <><Check className="w-3 h-3 text-emerald-400" /> تم النسخ!</> : <><Copy className="w-3 h-3" /> نسخ البرومبت</>}
                </button>
              </div>
              <div className="h-24 overflow-y-auto custom-scrollbar text-[10px] text-slate-400 font-mono leading-relaxed bg-[#02040a]/50 p-3 rounded-xl border border-black/50 shadow-inner relative z-10">
                {GOLDEN_PROMPT}
              </div>
            </div>

            {/* وعاء الـ JSON المستخلص */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-black text-emerald-400 flex items-center gap-1">
                  <ClipboardCopy className="w-3.5 h-3.5" /> (الخطوة 2) الصق وعاء الـ JSON المستخلص هنا
                </label>
              </div>
              <textarea 
                required 
                rows={8} 
                value={jsonInput} 
                onChange={e => setJsonInput(e.target.value)} 
                placeholder="[ { 'category': 'scientific_term', ... } ]" 
                className="w-full bg-[#02040a]/80 border border-white/10 rounded-2xl p-4 text-emerald-400 font-mono text-xs outline-none focus:border-emerald-500 transition-colors shadow-inner custom-scrollbar leading-relaxed" 
                dir="ltr" 
              />
            </div>

            <AnimatePresence mode="wait">
              {status && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className={`p-4 rounded-xl border flex items-start gap-3 text-sm font-bold shadow-inner overflow-hidden ${status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}
                >
                  {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />}
                  <p className="leading-relaxed">{status.msg}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" disabled={loading || !jsonInput || !title} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black py-4 rounded-xl hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.99] shadow-lg cursor-pointer">
              {loading ? <><div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent"></div><span>جاري المعالجة...</span></> : <><FileCheck className="w-5 h-5" /><span>حقن البيانات وإصدار المراجعة</span></>}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
