// @ts-nocheck
'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Printer, ChevronRight, BookOpen, Layers, Loader2, Sparkles, AlertCircle, School, CheckCircle2 } from 'lucide-react';

import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

const CATEGORY_MAP: Record<string, string> = {
  'scientific_term': 'المصطلح العلمي',
  'give_reason': 'علل لما يلي تعليلاً علمياً دقيقاً',
  'what_happens': 'ماذا يحدث في الحالات التالية',
  'problems': 'المسائل الحسابية',
  'graphics': 'أسئلة الرسومات البيانية',
  'compare': 'قارن بين كل مما يلي',
};

// 🚀 دالة الذكاء الاصطناعي السحرية لتنسيق المعادلات
const formatMath = (text: string) => {
  if (!text) return '';
  // 1. إصلاح علامة الدولار المعكوسة
  let formatted = text.replace(/\\\$/g, '$');
  
  // 2. إجبار المعادلات الكبيرة على أن تصبح Block (سطر منفصل) لجمالية العرض
  // إذا وجدت معادلة تبدأ بـ $ \frac أو $ \implies نجعلها $$ لتعرض بشكل كبير ومستقل
  formatted = formatted.replace(/\$ (\\frac|\\implies|\\tan|\\sin|\\cos|\\sum|\\int)(.*?)\$/g, '$$$$ $1$2 $$$$');
  
  return formatted;
};

export default function ReviewDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const documentId = resolvedParams.id;

  const [document, setDocument] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReviewData = async () => {
      try {
        const { data: docData, error: docError } = await supabase
          .from('review_documents')
          .select('*')
          .eq('id', documentId)
          .single();

        if (docError) throw docError;
        setDocument(docData);

        const { data: qData, error: qError } = await supabase
          .from('extracted_questions')
          .select('*')
          .eq('document_id', documentId)
          .order('category', { ascending: true });

        if (qError) throw qError;
        setQuestions(qData || []);

      } catch (err: any) {
        setError('تعذر العثور على المستند، أو أنك لا تملك صلاحية الوصول إليه.');
      } finally {
        setLoading(false);
      }
    };

    if (documentId) fetchReviewData();
  }, [documentId]);

  const groupedQuestions = questions.reduce((acc, curr) => {
    const cat = curr.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(curr);
    return acc;
  }, {} as Record<string, any[]>);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#02040a]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          <p className="text-indigo-400 font-black tracking-widest animate-pulse">جاري بناء الكبسولة الوزارية...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#02040a]" dir="rtl">
        <div className="bg-rose-500/10 p-8 rounded-3xl border border-rose-500/20 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <p className="text-rose-400 font-bold mb-6">{error}</p>
          <button onClick={() => router.back()} className="px-6 py-3 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-colors">العودة للخلف</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#02040a] print:bg-white text-slate-200 print:text-black font-sans selection:bg-indigo-500/30" dir="rtl">
      
      {/* 🚀 CSS سحري مزروع لمعالجة فخامة الرياضيات والطباعة */}
      <style dangerouslySetInnerHTML={{__html: `
        /* تباعد الأسطر العام لراحة العين */
        .math-content {
          line-height: 2.2 !important; 
        }
        
        /* المعادلات المضمنة في السطر (Inline) */
        .katex {
          margin: 0 0.3rem;
          font-size: 1.1em;
          direction: ltr !important;
          unicode-bidi: isolate;
        }

        /* القوانين والمعادلات المنفصلة (Blocks) */
        .katex-display {
          background: rgba(30, 41, 59, 0.4);
          padding: 1.2rem;
          border-radius: 1rem;
          border: 1px solid rgba(255,255,255,0.05);
          margin: 1.5rem 0 !important;
          direction: ltr !important;
          overflow-x: auto;
          box-shadow: inset 0 2px 10px rgba(0,0,0,0.2);
        }

        /* 🖨️ تنسيق الطباعة الأنيق (توفير الحبر) */
        @media print {
          body { background: white !important; color: black !important; }
          .glass-card { background: white !important; border: 1px solid #e2e8f0 !important; box-shadow: none !important; }
          .answer-vault { background: #f8fafc !important; border: 1px solid #cbd5e1 !important; border-right: 4px solid #475569 !important; }
          .katex-display { background: #f1f5f9 !important; border: 1px solid #cbd5e1 !important; color: black !important; box-shadow: none !important; }
          .math-content { color: black !important; }
          .print-break-avoid { break-inside: avoid; page-break-inside: avoid; }
        }
      `}} />

      <div className="print:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#0f1423]/95 backdrop-blur-2xl p-3 rounded-full border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
        <button onClick={() => router.back()} className="p-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-full transition-colors" title="العودة">
          <ChevronRight className="w-5 h-5" />
        </button>
        <button onClick={handlePrint} className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black rounded-full transition-all shadow-lg active:scale-95 border border-indigo-400/30">
          <Printer className="w-5 h-5" /> طباعة المذكرة (PDF)
        </button>
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-8 print:p-0 print:max-w-none">
        
        {/* الترويسة */}
        <div className="bg-[#0f1423] print:bg-transparent p-10 rounded-[2.5rem] print:rounded-none border border-white/5 print:border-b-4 print:border-black mb-10 print:mb-6 shadow-2xl print:shadow-none text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] pointer-events-none print:hidden"></div>
          
          <div className="relative z-10 flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-blue-500/10 print:bg-black print:text-white rounded-[1.5rem] flex items-center justify-center mb-2 border border-white/10 print:border-black shadow-inner">
              <School className="w-10 h-10 text-indigo-400 print:text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white print:text-black tracking-tight leading-tight">
              {document.title}
            </h1>
            <div className="flex flex-wrap justify-center gap-3 mt-4 print:mt-2">
              <span className="px-5 py-2 bg-white/5 print:bg-transparent print:border print:border-black rounded-xl text-sm font-black text-slate-300 print:text-black flex items-center gap-2 shadow-inner">
                <Layers className="w-4 h-4" /> {document.academic_stage.includes('12') ? 'الصف الثاني عشر' : document.academic_stage.includes('11') ? 'الصف الحادي عشر' : `الصف ${document.academic_stage}`}
              </span>
              <span className="px-5 py-2 bg-indigo-500/10 print:bg-transparent print:border print:border-black rounded-xl text-sm font-black text-indigo-300 print:text-black flex items-center gap-2 shadow-inner border border-indigo-500/20">
                <BookOpen className="w-4 h-4" /> {document.subject_name}
              </span>
            </div>
          </div>
        </div>

        {/* الأسئلة */}
        <div className="space-y-12 print:space-y-10">
          {Object.entries(groupedQuestions).map(([category, catQuestions], index) => (
            <div key={category} className="space-y-8">
              
              <div className="flex items-center gap-4 print:border-b-2 print:border-black print:pb-3">
                <div className="h-10 w-1.5 bg-indigo-500 rounded-full print:bg-black"></div>
                <h2 className="text-3xl font-black text-indigo-400 print:text-black">
                  السؤال {index + 1}: {CATEGORY_MAP[category] || category}
                </h2>
              </div>

              <div className="space-y-6">
                {catQuestions.map((q: any, i: number) => (
                  <div key={q.id} className="glass-card bg-[#151b2b] p-6 sm:p-8 rounded-[2rem] border border-white/5 shadow-xl print-break-avoid relative group transition-all hover:border-white/10">
                    
                    {/* شارات السنوات */}
                    {q.years_appeared && q.years_appeared.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-5">
                        {q.years_appeared.map((year: number) => (
                          <span key={year} className="px-3 py-1 bg-amber-500/10 print:bg-gray-100 border border-amber-500/20 print:border-gray-400 rounded-lg text-xs font-black text-amber-400 print:text-gray-800 flex items-center gap-1.5 shadow-sm">
                            <Sparkles className="w-3.5 h-3.5" /> ورد في {year}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-start gap-5 sm:gap-6">
                      <span className="flex-shrink-0 w-10 h-10 rounded-2xl bg-[#02040a] print:bg-white border border-white/10 print:border-black flex items-center justify-center text-lg font-black text-indigo-400 print:text-black shadow-inner mt-1">
                        {i + 1}
                      </span>
                      
                      <div className="flex-1 space-y-6 overflow-hidden">
                        
                        {/* نص السؤال */}
                        <div className="text-lg sm:text-xl font-bold text-slate-100 print:text-black math-content" dir="rtl">
                          <Latex>{formatMath(q.question_text)}</Latex>
                        </div>
                        
                        {/* صندوق الإجابة الفخم */}
                        <div className="answer-vault bg-gradient-to-br from-indigo-500/10 to-blue-500/5 border-r-4 border-r-indigo-500 border border-white/5 p-6 sm:p-8 rounded-2xl print:rounded-xl shadow-inner relative">
                          
                          <div className="flex items-center gap-2 mb-4 opacity-80 print:opacity-100">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 print:text-black" />
                            <span className="text-xs font-black text-emerald-400 print:text-black uppercase tracking-widest">
                              الإجابة النموذجية
                            </span>
                          </div>
                          
                          <div className="text-base sm:text-lg font-bold text-indigo-50 print:text-black math-content" dir="rtl">
                            <Latex>{formatMath(q.model_answer)}</Latex>
                          </div>
                          
                        </div>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="hidden print:block mt-16 pt-6 border-t border-gray-300 text-center text-gray-500 text-sm font-bold">
          مع تمنياتنا لكم بالنجاح والتفوق - منصة مدرسة الرفعة النموذجية
        </div>

      </div>
    </div>
  );
}
