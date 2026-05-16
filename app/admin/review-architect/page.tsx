// @ts-nocheck
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, FileCheck, AlertCircle, Sparkles, 
  Layers, BookOpen, Heading, CheckCircle2, ClipboardCopy 
} from 'lucide-react';

export default function ReviewArchitectPage() {
  const [title, setTitle] = useState('');
  const [stage, setStage] = useState('11_scientific');
  const [subject, setSubject] = useState('الفيزياء');
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleIngestData = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      // 1. الفحص والتحقق البرمجي الصارم من بنية الـ JSON المدخل
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

      // التحقق من احتواء العناصر على الحقول الإلزامية لتجنب أخطاء السيرفر
      if (parsedData.length > 0) {
        const firstItem = parsedData[0];
        if (!firstItem.category || !firstItem.question_text || !firstItem.model_answer) {
          throw new Error("العناصر تفتقد لبعض الحقول الأساسية (category, question_text, model_answer). يرجى مراجعة قالب الاستخراج.");
        }
      }

      // 2. إنشاء مستند المراجعة الرئيسي وحفظه في جدول الـ Documents
      const { data: doc, error: docErr } = await supabase
        .from('review_documents')
        .insert({ 
          title: title.trim(), 
          academic_stage: stage, 
          subject_name: subject.trim() 
        })
        .select()
        .single();

      if (docErr) throw docErr;

      // 3. تجهيز وحقن الأسئلة برمجياً وربطها بـ ID المستند المنشأ
      const questionsToInsert = parsedData.map((q: any) => ({
        document_id: doc.id,
        category: q.category,
        topic_name: q.topic_name || 'عام',
        question_text: q.question_text,
        model_answer: q.model_answer,
        years_appeared: Array.isArray(q.years_appeared) ? q.years_appeared : [],
        importance_weight: q.importance_weight || 'MEDIUM'
      }));

      // 4. عملية الحقن الجماعي الصاروخي (Bulk Insert) في استدعاء واحد للشبكة
      const { error: questionsErr } = await supabase
        .from('extracted_questions')
        .insert(questionsToInsert);

      if (questionsErr) {
        // في حال فشل حقن الأسئلة، نقوم بحذف رأس المستند تلافياً لتراكم بيانات تالفة
        await supabase.from('review_documents').delete().eq('id', doc.id);
        throw questionsErr;
      }

      setStatus({ 
        type: 'success', 
        msg: `تم بنجاح تفكيك وتحليل الاختبارات الوزارية! تم حقن ${questionsToInsert.length} سؤالاً مصفى من التكرار بنجاح وتجهيز كبسولة المراجعة التلقائية.` 
      });
      
      // تصفير الحقول بعد النجاح
      setJsonInput('');
      setTitle('');
    } catch (err: any) {
      setStatus({ 
        type: 'error', 
        msg: err.message || "حدث خطأ غير متوقع أثناء حقن البيانات في السيرفر." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6 lg:p-8 font-sans" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* لوحة تحكم المعماري */}
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
              قم بتهيئة بيانات المستند، ثم الصق كود الـ JSON المستخرج من أدوات التحليل الخارجية لتوليد مذكرات مراجعة مصفاة وخالية تماماً من التكرار.
            </p>
          </div>

          <form onSubmit={handleIngestData} className="space-y-6 relative z-10">
            
            {/* المدخلات الأساسية */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 mr-1 flex items-center gap-1">
                  <Heading className="w-3.5 h-3.5 text-indigo-400" /> عنوان مستند المراجعة
                </label>
                <input 
                  type="text" 
                  required 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="مثال: بنك أسئلة الفاينل الشامل لآخر 7 سنوات" 
                  className="w-full bg-[#02040a]/60 border border-white/10 rounded-xl p-3.5 text-white text-sm outline-none focus:border-amber-500 transition-colors shadow-inner" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 mr-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" /> المرحلة الدراسية المستهدفة
                </label>
                <select 
                  value={stage} 
                  onChange={e => setStage(e.target.value)} 
                  className="w-full bg-[#02040a]/60 border border-white/10 rounded-xl p-3.5 text-white text-sm outline-none cursor-pointer focus:border-amber-500 transition-colors shadow-inner"
                >
                  <optgroup label="المرحلة المتوسطة">
                    <option value="6">الصف السادس</option>
                    <option value="7">الصف السابع</option>
                    <option value="8">الصف الثامن</option>
                    <option value="9">الصف التاسع</option>
                  </optgroup>
                  <optgroup label="المرحلة الثانوية">
                    <option value="10">الصف العاشر</option>
                    <option value="11_scientific">الصف الحادي عشر العلمي</option>
                    <option value="11_literary">الصف الحادي عشر الأدبي</option>
                    <option value="12_scientific">الصف الثاني عشر العلمي</option>
                    <option value="12_literary">الصف الثاني عشر الأدبي</option>
                  </optgroup>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 mr-1 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> المادة الدراسية
                </label>
                <input 
                  type="text" 
                  required 
                  value={subject} 
                  onChange={e => setSubject(e.target.value)} 
                  placeholder="مثال: الفيزياء"
                  className="w-full bg-[#02040a]/60 border border-white/10 rounded-xl p-3.5 text-white text-sm outline-none focus:border-amber-500 transition-colors shadow-inner" 
                />
              </div>
            </div>

            {/* وعاء الـ JSON المستخلص */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-black text-slate-400 flex items-center gap-1">
                  <ClipboardCopy className="w-3.5 h-3.5 text-emerald-400" /> وعاء مخرجات الـ JSON المستخلصة
                </label>
                <span className="text-[10px] text-emerald-500 font-bold font-mono">نظام التصفية الذكي نشط</span>
              </div>
              <textarea 
                required 
                rows={12} 
                value={jsonInput} 
                onChange={e => setJsonInput(e.target.value)} 
                placeholder="[ &#10;  {&#10;    'category': 'scientific_term',&#10;    'question_text': '...',&#10;    'model_answer': '...',&#10;    'years_appeared': [2022, 2024]&#10;  }&#10;]" 
                className="w-full bg-[#02040a]/80 border border-white/10 rounded-2xl p-4 text-emerald-400 font-mono text-xs outline-none focus:border-emerald-500 transition-colors shadow-inner custom-scrollbar leading-relaxed" 
                dir="ltr" 
              />
            </div>

            {/* شريط تنبيهات الحالة */}
            <AnimatePresence mode="wait">
              {status && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`p-4 rounded-xl border flex items-start gap-3 text-sm font-bold shadow-inner overflow-hidden ${
                    status.type === 'success' 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}
                >
                  {status.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
                  )}
                  <p className="leading-relaxed">{status.msg}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* زر التنفيذ والحقن */}
            <button 
              type="submit" 
              disabled={loading || !jsonInput || !title} 
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black py-4 rounded-xl hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.99] shadow-lg cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent"></div>
                  <span>جاري معالجة وتدقيق وحقن حزم البيانات...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-5 h-5" />
                  <span>حقن البيانات وإصدار كبسولة المراجعة</span>
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
