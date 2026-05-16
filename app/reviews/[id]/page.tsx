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

const formatMath = (text: string) => {
  if (!text) return '';
  let formatted = text.replace(/\\\$/g, '$');
  formatted = formatted.replace(/(?<!\$)\$([^\$]+)\$(?!\$)/g, '$\\displaystyle $1$');
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

  if (error || !document) return <div className="text-white text-center p-10">{error}</div>;

  return (
    <div className="min-h-screen bg-[#02040a] print:bg-white text-slate-200 print:text-black font-sans selection:bg-amber-500/30" dir="rtl">
      
      <style dangerouslySetInnerHTML={{__html: `
        .math-content { line-height: 2.8 !important; font-size: 1.15rem; }
        .katex { direction: ltr !important; unicode-bidi: isolate; margin: 0 0.4rem; font-size: 1.1em; }
        .katex-display { display: inline-block !important; margin: 0 0.5rem !important; padding: 0 !important; background: transparent !important; border: none !important; box-shadow: none !important; }
        @media print {
          body { background: white !important; color: black !important; }
          .glass-card { background: white !important; border: 1px solid #cbd5e1 !important; box-shadow: none !important; color: black !important; }
          .answer-vault { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; border-right: 4px solid #10b981 !important; }
          .math-content { color: black !important; }
          .print-break-avoid { break-inside: avoid; page-break-inside: avoid; }
        }
      `}} />

      <div className="print:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-[#0f1423]/90 p-4 rounded-full border border-white/10 shadow-2xl">
        <button onClick={() => router.back()} className="p-4 bg-white/5 text-white rounded-full"><ChevronRight /></button>
        <button onClick={() => window.print()} className="px-8 py-4 bg-amber-500 text-black font-black rounded-full"><Printer className="inline w-5 h-5 ml-2" /> طباعة المذكرة الاحترافية</button>
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-8 print:p-0 print:max-w-none">
        
        <div className="bg-[#0f1423] print:bg-transparent p-12 rounded-[3rem] print:rounded-none border border-white/5 print:border-b-4 print:border-black mb-12 text-center">
          <School className="w-16 h-16 text-amber-400 print:text-black mx-auto mb-4" />
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white print:text-black mb-4">{document.title}</h1>
          <p className="text-amber-400 print:text-black font-bold text-lg">{document.academic_stage} - {document.subject_name}</p>
        </div>

        <div className="space-y-16 print:space-y-10">
          {Object.entries(groupedQuestions).map(([category, catQuestions], index) => (
            <div key={category} className="space-y-8">
              <div className="flex items-center gap-5 print:border-b-2 print:border-black print:pb-4">
                <div className="h-12 w-2 bg-amber-500 rounded-full print:bg-black"></div>
                <h2 className="text-3xl font-black text-amber-400 print:text-black">{CATEGORY_MAP[category] || category}</h2>
              </div>

              <div className="space-y-8">
                {catQuestions.map((q: any, i: number) => (
                  <div key={q.id} className="glass-card bg-[#0f1423]/60 print:bg-transparent p-8 sm:p-10 rounded-[2.5rem] border border-white/5 print:border-gray-300 shadow-xl print-break-avoid">
                    
                    {q.years_appeared && q.years_appeared.length > 0 && (
                      <div className="mb-6"><span className="px-4 py-1.5 bg-indigo-500/10 print:bg-gray-100 text-indigo-300 print:text-black rounded-xl text-xs font-black border border-indigo-500/20 print:border-gray-400">ورد في: {q.years_appeared.join(', ')}</span></div>
                    )}

                    <div className="flex flex-col sm:flex-row items-start gap-6">
                      <span className="w-12 h-12 rounded-xl bg-amber-500 print:bg-black text-black print:text-white flex items-center justify-center text-xl font-black shrink-0">{i + 1}</span>
                      
                      <div className="flex-1 w-full space-y-6">
                        
                        {/* نص السؤال يدعم الأسطر المتعددة */}
                        <div className="font-bold text-slate-100 print:text-black math-content break-words" style={{ whiteSpace: 'pre-wrap' }}>
                          <Latex>{formatMath(q.question_text)}</Latex>
                        </div>
                        
                        {/* دعم الصور في السؤال */}
                        {q.image_url && (
                          <div className="my-6 p-4 bg-white/5 print:bg-white border border-white/10 print:border-gray-300 rounded-2xl flex justify-center">
                            <img src={q.image_url} alt="رسم توضيحي" className="max-h-64 object-contain rounded-xl mix-blend-luminosity print:mix-blend-normal" />
                          </div>
                        )}

                        {/* الإجابة النموذجية تدعم الأسطر المتعددة والجداول */}
                        <div className="answer-vault bg-[#02040a]/40 print:bg-gray-50 border-r-4 border-r-emerald-500 border border-white/5 p-6 rounded-2xl">
                          <div className="mb-4 text-emerald-500 print:text-black text-sm font-black flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" /> الإجابة النموذجية المعتمدة
                          </div>
                          <div className="font-bold text-slate-200 print:text-black math-content break-words" style={{ whiteSpace: 'pre-wrap' }}>
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
      </div>
    </div>
  );
}
