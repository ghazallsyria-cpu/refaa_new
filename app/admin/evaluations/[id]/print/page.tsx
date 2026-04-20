'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Printer, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function PrintEvaluationPage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvaluation = async () => {
      try {
        const { data: evaluation, error } = await supabase
          .from('teacher_evaluations')
          .select(`
            *,
            teachers (
              users (full_name)
            ),
            evaluator:users!evaluator_id (full_name)
          `)
          .eq('id', params.id)
          .single();

        if (error) throw error;
        setData(evaluation);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchEvaluation();
    }
  }, [params.id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-indigo-600" /></div>;
  if (error || !data) return <div className="p-10 text-center font-bold text-rose-600">حدث خطأ في تحميل التقييم: {error}</div>;

  const teacherName = data.teachers?.users?.full_name || 'غير محدد';
  const evaluatorName = data.evaluator?.full_name || 'غير محدد';

  const evaluationItems = [
    { label: 'كتابة الدرس اليومي بشكل واضح ومفصل', value: data.has_clear_lesson },
    { label: 'استكمال سجل التأخر الدراسي', value: data.has_delay_record },
    { label: 'التواصل مع أولياء الأمور للطلبة الضعاف', value: data.parents_contacted },
    { label: 'متابعة الطلاب والدفاتر', value: data.student_followup },
    { label: 'الاختبارات الدورية وتحليل نتائجها', value: data.periodic_exams },
  ];

  return (
    <div className="min-h-screen bg-slate-100 font-cairo" dir="rtl">
      
      {/* 🚀 أزرار التحكم (تختفي عند الطباعة) */}
      <div className="print:hidden bg-white shadow-sm border-b border-slate-200 p-4 sticky top-0 z-50 flex items-center justify-between max-w-4xl mx-auto rounded-b-3xl">
        <Link href="/admin/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors">
          <ArrowLeft className="w-5 h-5" /> العودة للوحة التحكم
        </Link>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-black transition-all active:scale-95 shadow-md shadow-indigo-200">
          <Printer className="w-5 h-5" /> طباعة / تصدير PDF
        </button>
      </div>

      {/* 📄 الورقة الرسمية للطباعة (A4 Layout) */}
      <div className="max-w-4xl mx-auto mt-8 mb-20 bg-white shadow-2xl print:shadow-none print:m-0 print:max-w-none print:w-full overflow-hidden" style={{ minHeight: '297mm' }}>
        
        {/* تنسيقات الطباعة الخاصة */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page { size: A4 portrait; margin: 15mm; }
            body { background: white; -webkit-print-color-adjust: exact; }
          }
        `}} />

        <div className="p-10 sm:p-14 border-[3px] border-double border-slate-800 m-4 sm:m-8 rounded-xl relative h-[calc(100%-4rem)]">
          
          {/* الهيدر الرسمي للمدرسة */}
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
            <div className="text-center font-bold leading-relaxed text-sm sm:text-base text-slate-900">
              <p>دولة الكويت</p>
              <p>وزارة التربية</p>
              <p>مدرسة الرفعة النموذجية</p>
            </div>
            
            <div className="flex flex-col items-center justify-center">
              <div className="w-20 h-20 border-2 border-slate-800 rounded-full flex items-center justify-center mb-2">
                <span className="font-black text-2xl text-slate-800">الرفعة</span>
              </div>
            </div>

            <div className="text-center font-bold leading-relaxed text-sm sm:text-base text-slate-900">
              <p>العام الدراسي: 2025 / 2026</p>
              <p>الفصل الدراسي: الثاني</p>
              <p>التاريخ: {new Date(data.evaluation_date).toLocaleDateString('ar-EG')}</p>
            </div>
          </div>

          {/* عنوان النموذج */}
          <div className="text-center mb-10">
            <h1 className="inline-block text-2xl sm:text-3xl font-black bg-slate-100 border-2 border-slate-800 px-8 py-3 shadow-[4px_4px_0_0_rgba(30,41,59,1)]">
              نموذج متابعة معلم وتأخر دراسي
            </h1>
          </div>

          {/* معلومات المعلم والزيارة */}
          <div className="grid grid-cols-2 gap-y-6 gap-x-8 mb-10 text-base sm:text-lg font-bold text-slate-900">
            <div className="border-b border-slate-400 pb-2">
              <span className="text-slate-600 ml-2">اسم المعلم:</span> {teacherName}
            </div>
            <div className="border-b border-slate-400 pb-2">
              <span className="text-slate-600 ml-2">المادة:</span> {data.subject}
            </div>
            <div className="border-b border-slate-400 pb-2">
              <span className="text-slate-600 ml-2">اليوم:</span> {data.day_of_week}
            </div>
            <div className="border-b border-slate-400 pb-2">
              <span className="text-slate-600 ml-2">التاريخ:</span> {new Date(data.evaluation_date).toLocaleDateString('ar-EG')}
            </div>
            <div className="border-b border-slate-400 pb-2">
              <span className="text-slate-600 ml-2">الحصة:</span> {data.period}
            </div>
            <div className="border-b border-slate-400 pb-2">
              <span className="text-slate-600 ml-2">الصف:</span> {data.class_name}
            </div>
          </div>

          {/* جدول التقييم */}
          <table className="w-full border-collapse border-2 border-slate-800 mb-10 text-base sm:text-lg text-slate-900">
            <thead>
              <tr className="bg-slate-100">
                <th className="border-2 border-slate-800 p-3 w-16 text-center font-black">م</th>
                <th className="border-2 border-slate-800 p-3 text-right font-black">عناصر المتابعة</th>
                <th className="border-2 border-slate-800 p-3 w-24 text-center font-black">نعم</th>
                <th className="border-2 border-slate-800 p-3 w-24 text-center font-black">لا</th>
              </tr>
            </thead>
            <tbody>
              {evaluationItems.map((item, index) => (
                <tr key={index}>
                  <td className="border-2 border-slate-800 p-3 text-center font-bold">{index + 1}</td>
                  <td className="border-2 border-slate-800 p-3 font-bold">{item.label}</td>
                  <td className="border-2 border-slate-800 p-3 text-center text-xl font-black text-emerald-600">
                    {item.value ? '✔' : ''}
                  </td>
                  <td className="border-2 border-slate-800 p-3 text-center text-xl font-black text-rose-600">
                    {!item.value ? '✖' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* الملاحظات */}
          <div className="space-y-6 mb-16">
            <div className="border-2 border-slate-800 rounded-lg p-4 bg-slate-50 min-h-[120px]">
              <h3 className="font-black text-slate-900 mb-2 border-b border-slate-300 pb-2">نقاط القوة:</h3>
              <p className="whitespace-pre-wrap font-bold text-slate-700 leading-relaxed">
                {data.strengths || 'لا توجد ملاحظات مدونة.'}
              </p>
            </div>
            
            <div className="border-2 border-slate-800 rounded-lg p-4 bg-slate-50 min-h-[120px]">
              <h3 className="font-black text-slate-900 mb-2 border-b border-slate-300 pb-2">نقاط تحتاج إلى تحسين (ملاحظات):</h3>
              <p className="whitespace-pre-wrap font-bold text-slate-700 leading-relaxed">
                {data.improvements || 'لا توجد ملاحظات مدونة.'}
              </p>
            </div>
          </div>

          {/* التواقيع */}
          <div className="mt-auto grid grid-cols-3 gap-4 text-center font-bold text-slate-900">
            <div>
              <p className="mb-8">المعلم المزار</p>
              <p className="border-t border-slate-400 w-3/4 mx-auto pt-2 text-sm text-slate-500">الاسم والتوقيع</p>
            </div>
            <div>
              <p className="mb-8">رئيس القسم / الزائر</p>
              <p className="font-black mb-2 text-indigo-700">{evaluatorName}</p>
              <p className="border-t border-slate-400 w-3/4 mx-auto pt-2 text-sm text-slate-500">الاسم والتوقيع</p>
            </div>
            <div>
              <p className="mb-8">مدير المدرسة</p>
              <p className="font-black mb-2 text-indigo-700">أ. صالح المطيري</p>
              <p className="border-t border-slate-400 w-3/4 mx-auto pt-2 text-sm text-slate-500">التوقيع والاعتماد</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
