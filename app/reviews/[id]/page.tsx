'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Printer, ChevronRight, BookOpen, Layers, Loader2, Sparkles, AlertCircle, School } from 'lucide-react';
import { motion } from 'framer-motion';

// 🌍 قاموس ترجمة الفئات الأكاديمية
const CATEGORY_MAP: Record<string, string> = {
  'scientific_term': 'المصطلح العلمي',
  'give_reason': 'علل لما يلي تعليلاً علمياً دقيقاً',
  'what_happens': 'ماذا يحدث في الحالات التالية',
  'problems': 'المسائل الحسابية',
  'graphics': 'أسئلة الرسومات البيانية',
  'compare': 'قارن بين كل مما يلي',
};

export default function ReviewDocumentPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [document, setDocument] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReviewData = async () => {
      try {
        // 1. جلب بيانات المستند الرئيسي
        const { data: docData, error: docError } = await supabase
          .from('review_documents')
          .select('*')
          .eq('id', params.id)
          .single();

        if (docError) throw docError;
        setDocument(docData);

        // 2. جلب الأسئلة المرتبطة به
        const { data: qData, error: qError } = await supabase
          .from('extracted_questions')
          .select('*')
          .eq('document_id', params.id)
          .order('category', { ascending: true }); // ترتيب مبدئي

        if (qError) throw qError;
        setQuestions(qData || []);

      } catch (err: any) {
        setError('تعذر العثور على المستند، أو أنك لا تملك صلاحية الوصول إليه.');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) fetchReviewData();
  }, [params.id]);

  // دالة لتجميع الأسئلة بحسب الفئة (Category)
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
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-indigo-400 font-bold tracking-widest animate-pulse">جاري تحميل الكبسولة الوزارية...</p>
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
      
      {/* 🛑 أزرار التحكم (تختفي عند الطباعة بفضل كلاس print:hidden) */}
      <div className="print:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#0f1423]/90 backdrop-blur-xl p-3 rounded-full border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
        <button onClick={() => router.back()} className="p-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-full transition-colors" title="العودة">
          <ChevronRight className="w-5 h-5" />
        </button>
        <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-full transition-all shadow-lg active:scale-95">
          <Printer className="w-5 h-5" /> طباعة المذكرة (PDF)
        </button>
      </div>

      {/* 📄 ورقة العمل الرئيسية */}
      <div className="max-w-4xl mx-auto p-4 sm:p-8 print:p-0 print:max-w-none">
        
        {/* 🏆 ترويسة المذكرة (الهيدر الرسمي للطباعة) */}
        <div className="bg-[#0f1423] print:bg-transparent p-8 rounded-[2rem] print:rounded-none border border-white/10 print:border-b-4 print:border-black mb-8 print:mb-6 shadow-xl print:shadow-none text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] pointer-events-none print:hidden"></div>
          
          <div className="relative z-10 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 bg-white/5 print:bg-black print:text-white rounded-2xl flex items-center justify-center mb-2 border border-white/10 print:border-black">
              <School className="w-8 h-8 text-indigo-400 print:text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white print:text-black tracking-tight">
              {document.title}
            </h1>
            <div className="flex flex-wrap justify-center gap-3 mt-4 print:mt-2">
              <span className="px-4 py-1.5 bg-white/5 print:bg-transparent print:border print:border-black rounded-full text-sm font-bold text-slate-300 print:text-black flex items-center gap-2">
                <Layers className="w-4 h-4" /> {document.academic_stage.includes('12') ? 'الصف الثاني عشر' : document.academic_stage.includes('11') ? 'الصف الحادي عشر' : `الصف ${document.academic_stage}`}
              </span>
              <span className="px-4 py-1.5 bg-indigo-500/10 print:bg-transparent print:border print:border-black rounded-full text-sm font-bold text-indigo-300 print:text-black flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> {document.subject_name}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 print:text-gray-600 font-bold uppercase tracking-widest mt-6">
              تم التوليد بواسطة نظام مدرسة الرفعة النموذجية © {new Date().getFullYear()}
            </p>
          </div>
        </div>

        {/* 📝 الأسئلة مقسمة حسب الفئات */}
        <div className="space-y-12 print:space-y-8">
          {Object.entries(groupedQuestions).map(([category, catQuestions], index) => (
            <div key={category} className="space-y-6">
              
              {/* عنوان الفئة (مثال: المصطلح العلمي) */}
              <div className="flex items-center gap-4 print:border-b-2 print:border-black print:pb-2">
                <div className="h-8 w-1 bg-indigo-500 rounded-full print:bg-black"></div>
                <h2 className="text-2xl font-black text-indigo-400 print:text-black">
                  {/* السؤال الأول، الثاني، الخ... */}
                  السؤال {index + 1}: {CATEGORY_MAP[category] || category}
                </h2>
              </div>

              {/* قائمة أسئلة هذه الفئة */}
              <div className="space-y-4">
                {catQuestions.map((q: any, i: number) => (
                  // break-inside-avoid تمنع انقسام السؤال بين صفحتين عند الطباعة!
                  <div key={q.id} className="bg-white/5 print:bg-transparent p-5 sm:p-6 rounded-2xl print:rounded-none border border-white/5 print:border-b print:border-gray-300 break-inside-avoid relative group">
                    
                    {/* شارات الأعوام المتكررة (السر الثوري للمنصة) */}
                    {q.years_appeared && q.years_appeared.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {q.years_appeared.map((year: number) => (
                          <span key={year} className="px-2 py-0.5 bg-amber-500/10 print:bg-gray-100 border border-amber-500/20 print:border-gray-400 rounded-md text-[10px] font-black text-amber-400 print:text-gray-800 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> ورد في {year}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-start gap-4">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#02040a] print:bg-white border border-white/10 print:border-black flex items-center justify-center text-sm font-black text-slate-400 print:text-black mt-1">
                        {i + 1}
                      </span>
                      <div className="flex-1 space-y-4">
                        {/* نص السؤال */}
                        <p className="text-base sm:text-lg font-bold text-white print:text-black leading-relaxed">
                          {q.question_text}
                        </p>
                        
                        {/* الإجابة النموذجية */}
                        <div className="bg-indigo-500/10 print:bg-gray-50 border border-indigo-500/20 print:border-gray-300 p-4 rounded-xl print:rounded-lg">
                          <span className="block text-[10px] font-black text-indigo-300 print:text-gray-600 uppercase tracking-widest mb-2">
                            الإجابة النموذجية
                          </span>
                          <p className="text-sm sm:text-base font-bold text-indigo-100 print:text-black leading-relaxed">
                            {q.model_answer}
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ذيل الطباعة المخفي الذي يظهر فقط في الـ PDF */}
        <div className="hidden print:block mt-12 pt-4 border-t border-gray-300 text-center text-gray-500 text-sm font-bold">
          مع تمنياتنا لكم بالنجاح والتفوق - منصة مدرسة الرفعة النموذجية
        </div>

      </div>
    </div>
  );
}
