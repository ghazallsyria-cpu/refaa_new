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

// 🚀 تنظيف وتنسيق المعادلات
const formatMath = (text: string) => {
  if (!text) return '';
  let formatted = text.replace(/\\\$/g, '$');
  formatted = formatted.replace(/(?<!\$)\$([^\$]+)\$(?!\$)/g, '$\\displaystyle $1$');
  return formatted;
};

// 🚀 تنظيف النص من علامات الذكاء الاصطناعي إذا تم رفع الصورة
const cleanQuestionText = (text: string, hasImage: boolean) => {
  if (!text) return '';
  if (hasImage) {
    return text.replace(/\[يوجد رسم توضيحي\]/g, '').replace(/\[يوجد شكل\]/g, '').trim();
  }
  return text;
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
        setError('تعذر العثور على المستند.');
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#02040a]">
        <Loader2 className="w-14 h-14 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (error || !document) return <div className="text-white text-center p-10 font-bold">{error}</div>;

  return (
    <div className="min-h-screen bg-[#02040a] print:bg-white text-slate-200 print:text-black font-sans selection:bg-amber-500/30" dir="rtl">
      
      {/* ==========================================
          🎨 CSS الطباعة الاحترافي (سر التحفة الفنية)
          ========================================== */}
      <style dangerouslySetInnerHTML={{__html: `
        .math-content { line-height: 2.5 !important; font-size: 1.15rem; }
        .katex { direction: ltr !important; unicode-bidi: isolate; margin: 0 0.3rem; font-size: 1.1em; }
        .katex-display { display: inline-block !important; margin: 0 0.5rem !important; padding: 0 !important; background: transparent !important; border: none !important; box-shadow: none !important; }
        
        /* 🖨️ إعدادات الطابعة الملكية */
        @media print {
          @page {
            size: A4;
            margin: 15mm 20mm; /* هوامش مثالية للكتب */
          }
          body { 
            background: white !important; 
            color: black !important; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important;
          }
          
          /* إخفاء أي عناصر غير مرغوبة أو أشرطة تصفح قديمة */
          nav, footer, .floating-nav, .no-print { display: none !important; }
          
          .glass-card { 
            background: transparent !important; 
            border: none !important; 
            border-bottom: 2px dashed #cbd5e1 !important; /* فاصل أنيق بين الأسئلة */
            border-radius: 0 !important;
            padding: 1.5rem 0 !important;
            box-shadow: none !important; 
            color: black !important; 
          }
          /* إزالة الخط الوهمي من آخر سؤال في الفئة */
          .glass-card:last-child { border-bottom: none !important; }

          .answer-vault { 
            background: #f8fafc !important; 
            border: 1px solid #e2e8f0 !important; 
            border-right: 4px solid #10b981 !important; 
            box-shadow: none !important;
          }
          
          .math-content { color: black !important; }
          
          /* منع تقطيع الأسئلة بين الصفحات */
          .print-break-avoid { 
            break-inside: avoid; 
            page-break-inside: avoid; 
          }
          
          /* تحسين عرض الصور في الطباعة */
          .print-image-container {
            break-inside: avoid;
            page-break-inside: avoid;
            margin: 1.5rem auto !important;
            border: 1px solid #e2e8f0 !important;
            background: white !important;
          }
        }
      `}} />

      {/* زر الطباعة العائم (يختفي تلقائياً عند الطباعة) */}
      <div className="print:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-4 bg-[#0f1423]/95 backdrop-blur-xl p-4 rounded-full border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] no-print">
        <button onClick={() => router.back()} className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-full transition-colors"><ChevronRight /></button>
        <button onClick={() => window.print()} className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-full transition-colors shadow-lg active:scale-95 flex items-center gap-2">
          <Printer className="w-5 h-5" /> طباعة المذكرة الاحترافية
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-8 print:p-0 print:max-w-none">
        
        {/* ==========================================
            🏆 الترويسة المزدوجة (للشاشة وللطباعة)
            ========================================== */}
        {/* 1. ترويسة الشاشة (مظلمة وجميلة) */}
        <div className="bg-[#0f1423] p-12 rounded-[3rem] border border-white/5 mb-12 text-center shadow-2xl relative overflow-hidden print:hidden">
          <div className="absolute -top-[50%] -right-[20%] w-[150%] h-[150%] bg-gradient-to-b from-amber-500/10 to-transparent blur-[100px] pointer-events-none"></div>
          <School className="w-16 h-16 text-amber-400 mx-auto mb-6 relative z-10" />
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 relative z-10">{document.title}</h1>
          <div className="flex justify-center gap-4 relative z-10">
            <span className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl font-bold text-slate-300">{document.academic_stage}</span>
            <span className="px-6 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl font-bold text-amber-400">{document.subject_name}</span>
          </div>
        </div>

        {/* 2. ترويسة الطباعة (رسمية، بخلفية بيضاء وخط أسود) */}
        <div className="hidden print:flex flex-col mb-10 pb-6 border-b-4 border-black">
          <div className="flex justify-between items-center w-full mb-4">
            <div className="text-right">
              <h2 className="text-2xl font-black">{document.subject_name}</h2>
              <p className="text-lg font-bold text-gray-700">{document.academic_stage.includes('12') ? 'الصف الثاني عشر' : document.academic_stage.includes('11') ? 'الصف الحادي عشر' : `الصف ${document.academic_stage}`}</p>
            </div>
            <div className="text-center flex flex-col items-center">
              <School className="w-12 h-12 text-black mb-2" />
              <p className="text-sm font-black tracking-wider">مدرسة الرفعة النموذجية</p>
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-600">العام الدراسي</p>
              <p className="text-lg font-black">{new Date().getFullYear()} - {new Date().getFullYear() + 1}</p>
            </div>
          </div>
          <h1 className="text-3xl font-black text-center mt-4 bg-gray-100 py-3 rounded-lg border border-gray-300">{document.title}</h1>
        </div>

        {/* ==========================================
            📚 قلب المذكرة (الأسئلة والأجوبة)
            ========================================== */}
        <div className="space-y-12 print:space-y-8">
          {Object.entries(groupedQuestions).map(([category, catQuestions], index) => (
            <div key={category} className="space-y-8 print:space-y-2">
              
              {/* عنوان الفئة */}
              <div className="flex items-center gap-4 print:mt-8 print:mb-4">
                <div className="h-10 w-2 bg-amber-500 print:bg-black rounded-full"></div>
                <h2 className="text-3xl font-black text-amber-400 print:text-black">{CATEGORY_MAP[category] || category}</h2>
              </div>

              <div className="space-y-6 print:space-y-0">
                {catQuestions.map((q: any, i: number) => {
                  const hasImage = !!q.image_url;
                  const finalQuestionText = cleanQuestionText(q.question_text, hasImage);

                  return (
                    <div key={q.id} className="glass-card bg-[#0f1423]/60 print:bg-transparent p-8 sm:p-10 rounded-[2.5rem] border border-white/5 shadow-xl print-break-avoid">
                      
                      {/* شارات السنوات */}
                      {q.years_appeared && q.years_appeared.length > 0 && (
                        <div className="mb-6 print:mb-4">
                          <span className="px-4 py-1.5 bg-indigo-500/10 print:bg-gray-100 text-indigo-300 print:text-gray-800 rounded-xl text-xs font-black border border-indigo-500/20 print:border-gray-300">
                            ورد في: {q.years_appeared.join('، ')}
                          </span>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row items-start gap-6 print:gap-4">
                        {/* رقم السؤال */}
                        <span className="w-12 h-12 print:w-10 print:h-10 rounded-xl bg-amber-500 print:bg-black text-black print:text-white flex items-center justify-center text-xl print:text-lg font-black shrink-0">{i + 1}</span>
                        
                        <div className="flex-1 w-full space-y-6 print:space-y-4">
                          
                          {/* نص السؤال */}
                          <div className="font-bold text-slate-100 print:text-black math-content break-words" style={{ whiteSpace: 'pre-wrap' }}>
                            <Latex>{formatMath(finalQuestionText)}</Latex>
                          </div>
                          
                          {/* الصورة (إن وجدت) */}
                          {hasImage && (
                            <div className="print-image-container my-6 p-4 bg-white/5 border border-white/10 rounded-2xl flex justify-center">
                              <img src={q.image_url} alt="رسم توضيحي" className="max-h-72 print:max-h-64 object-contain rounded-xl mix-blend-luminosity print:mix-blend-normal" />
                            </div>
                          )}

                          {/* الإجابة النموذجية */}
                          <div className="answer-vault bg-[#02040a]/40 p-6 sm:p-8 rounded-2xl print:rounded-xl">
                            <div className="mb-4 text-emerald-500 print:text-gray-800 text-sm font-black flex items-center gap-2">
                              <CheckCircle2 className="w-5 h-5 print:text-black" /> الإجابة النموذجية المعتمدة
                            </div>
                            <div className="font-bold text-slate-200 print:text-black math-content break-words" style={{ whiteSpace: 'pre-wrap' }}>
                              <Latex>{formatMath(q.model_answer)}</Latex>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* تذييل الطباعة الرسمي */}
        <div className="hidden print:flex flex-col items-center justify-center mt-12 pt-6 border-t-2 border-black text-center">
          <p className="text-black text-lg font-black mb-1">تمت الطباعة من المنصة الرقمية لمدرسة الرفعة النموذجية</p>
          <p className="text-gray-600 text-sm font-bold">صُنع هذا المرجع لتفوقك، نسأل الله لك التوفيق والنجاح.</p>
        </div>

      </div>
    </div>
  );
}
