'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle, Clock, BookOpen, User, Layout, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import Image from 'next/image';

export default function StudentExamResult() {
  const params = useParams();
  const router = useRouter();
  const { id: examId, studentId } = params;
  const { fetchStudentExamResult } = useExamsSystem();
  
  const [exam, setExam] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!examId || !studentId) return;
    try {
      setLoading(true);
      setError(null);
      const result = await fetchStudentExamResult(examId as string, studentId as string);
      
      if (!result || !result.exam) {
        setError("تعذر العثور على بيانات هذا الاختبار أو الطالب.");
        return;
      }

      setExam(result.exam);
      setStudent(result.student);
      setAttempt(result.attempt);
      setAnswers(result.answers || []);
    } catch (err: any) {
      console.error("Error in page:", err);
      setError("حدث خطأ أثناء محاولة جلب النتيجة.");
    } finally {
      setLoading(false);
    }
  }, [examId, studentId, fetchStudentExamResult]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin h-12 w-12 border-t-4 border-indigo-600 rounded-full"></div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <AlertCircle className="h-16 w-16 text-red-500" />
      <h2 className="text-2xl font-black text-slate-800">{error}</h2>
      <button onClick={() => router.back()} className="px-8 py-3 mt-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all">العودة للنتائج</button>
    </div>
  );

  // حساب حالة النجاح والرسوب بصرياً
  const maxScore = exam?.max_score || 100;
  const passingScore = exam?.passing_score || 50;
  const studentPercentage = attempt?.score !== undefined ? (attempt.score / maxScore) * 100 : 0;
  const isPassed = studentPercentage >= passingScore;

  // --- دالة ذكية وشاملة لاستخراج إجابة الطالب مهما كان نوعها أو اسم عمودها في قاعدة البيانات ---
  const getStudentAnswerText = (ans: any, q: any) => {
    if (!q) return 'بيانات السؤال مفقودة';

    // 1. معالجة أسئلة الاختيار المتعدد (تحويل مصفوفة الأرقام إلى نصوص)
    if (q.type === 'multi_select') {
      const textAns = ans.text_answer || ans.textAnswer || ans.text;
      try {
        const selectedIds = JSON.parse(textAns || '[]');
        if (Array.isArray(selectedIds) && selectedIds.length > 0) {
          const selectedContents = selectedIds.map(id => {
            const opt = (q.options || []).find((o: any) => o.id === id);
            return opt ? opt.content : null;
          }).filter(Boolean);
          if (selectedContents.length > 0) return selectedContents.join(' + '); // دمج الإجابات
        }
      } catch (e) {
        return textAns || 'لم يتم الإجابة';
      }
      return 'لم يتم الإجابة';
    }

    // 2. معالجة أسئلة الاختيار من متعدد أو الصح والخطأ
    const optionId = ans.selected_option_id || ans.option_id || ans.optionId;
    if (optionId) {
      const opt = (q.options || []).find((o: any) => o.id === optionId);
      return opt ? opt.content : 'خيار غير معروف';
    }

    // 3. معالجة الأسئلة المقالية
    const textAns = ans.text_answer || ans.textAnswer || ans.text;
    if (textAns) return textAns;

    return 'لم يتم الإجابة';
  };

  // --- دالة ذكية لاستخراج الإجابة الصحيحة من النظام ---
  const getCorrectAnswerText = (q: any) => {
    if (!q) return 'غير متوفر';

    if (q.type === 'multi_select') {
      const correctOpts = (q.options || []).filter((o: any) => o.is_correct).map((o: any) => o.content);
      return correctOpts.length > 0 ? correctOpts.join(' + ') : 'تتطلب تصحيحاً يدوياً';
    }

    const correctOpt = (q.options || []).find((o: any) => o.is_correct);
    if (correctOpt) return correctOpt.content;

    if (q.type === 'essay') return 'سؤال مقالي (تُقيّم يدوياً من قبل المعلم)';

    return 'غير متوفر';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-10 pb-24" dir="rtl">
      <button onClick={() => router.back()} className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white border border-slate-100 text-slate-500 font-black hover:text-indigo-600 transition-all shadow-sm active:scale-95">
        <ArrowRight className="h-5 w-5" /> العودة للنتائج
      </button>

      <div className="glass-card p-10 rounded-[40px] border-t-[16px] border-t-indigo-600 shadow-2xl relative overflow-hidden bg-white">
        <div className="absolute top-0 left-0 p-8 opacity-5 text-indigo-900 pointer-events-none"><Layout size={120} /></div>
        <h1 className="text-4xl font-black text-slate-900 mb-8 relative z-10">{exam?.title || 'اختبار بدون عنوان'}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10">
          <div className="bg-indigo-50/50 p-6 rounded-[28px] border border-indigo-100">
            <span className="text-[10px] text-indigo-400 block font-black uppercase mb-1 flex items-center gap-2"><User size={12} /> اسم الطالب</span>
            <span className="text-xl font-black text-slate-800">{student?.full_name || 'طالب غير معروف'}</span>
          </div>
          <div className="bg-slate-50 p-6 rounded-[28px] border border-slate-100">
            <span className="text-[10px] text-slate-400 block font-black uppercase mb-1 flex items-center gap-2"><BookOpen size={12} /> المادة الدراسية</span>
            <span className="text-xl font-black text-slate-800">{exam?.subject_name || 'مادة عامة'}</span>
          </div>
          <div className={`p-6 rounded-[28px] border ${attempt ? (isPassed ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100') : 'bg-slate-50 border-slate-100'}`}>
            <span className={`text-[10px] block font-black uppercase mb-1 flex items-center gap-2 ${attempt ? (isPassed ? 'text-emerald-500' : 'text-red-500') : 'text-slate-400'}`}>
              <Clock size={12} /> الدرجة المكتسبة
            </span>
            <span className={`text-xl font-black ${attempt ? (isPassed ? 'text-emerald-600' : 'text-red-600') : 'text-slate-600'}`} dir="ltr">
              {attempt?.score !== undefined ? `${attempt.score} / ${maxScore}` : 'لم يتقدم'}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3"><CheckCircle className="text-indigo-500" /> إجابات الطالب بالتفصيل</h2>
        
        {(!answers || answers.length === 0) ? (
          <div className="text-center py-20 bg-white rounded-[40px] border border-dashed border-slate-200 text-slate-400 font-bold">
            لا توجد إجابات مسجلة لهذه المحاولة. (قد يكون الطالب لم يُجب على أي سؤال)
          </div>
        ) : (
          answers.map((ans, idx) => {
            // توحيد شكل السؤال في حال كانت قاعدة البيانات ترجعه كمصفوفة بالخطأ
            const q = Array.isArray(ans.question) ? ans.question[0] : ans.question;
            const pointsEarned = ans.points_earned || ans.pointsEarned || 0;
            
            return (
              <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} key={ans.id || idx} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl relative overflow-hidden transition-all hover:shadow-indigo-50">
                <div className={`absolute top-0 right-0 w-3 h-full ${ans.is_correct ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <div className="flex justify-between items-start mb-6">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-full">سؤال {idx + 1}</span>
                  <div className={`px-4 py-2 rounded-xl text-sm font-black ${ans.is_correct ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    الدرجة: {pointsEarned} / {q?.points || 0}
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-10">
                  <div className="flex-1 space-y-6">
                    <h3 className="text-2xl font-black text-slate-800 leading-relaxed">{q?.content || 'نص السؤال غير متوفر'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* إجابة الطالب */}
                      <div className={`p-6 rounded-[28px] border ${ans.is_correct ? 'bg-emerald-50/30 border-emerald-100' : 'bg-red-50/30 border-red-100'}`}>
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-2">إجابة الطالب</p>
                        <p className="text-lg font-black leading-relaxed text-slate-800">
                          {getStudentAnswerText(ans, q)}
                        </p>
                      </div>

                      {/* الإجابة الصحيحة (تظهر فقط إذا أخطأ الطالب) */}
                      {!ans.is_correct && (
                        <div className="p-6 rounded-[28px] bg-slate-50 border border-slate-100 shadow-inner">
                          <p className="text-[10px] font-black uppercase text-slate-400 mb-2">الإجابة الصحيحة المعتمدة</p>
                          <p className="text-lg font-black text-indigo-600 leading-relaxed">
                            {getCorrectAnswerText(q)}
                          </p>
                        </div>
                      )}

                    </div>
                  </div>
                  {q?.media_url && typeof q.media_url === 'string' && q.media_url.trim() !== '' && (
                    <div className="relative w-full md:w-64 aspect-square rounded-3xl overflow-hidden border-2 border-slate-50 bg-slate-50">
                      <Image src={q.media_url} alt="Question Image" fill className="object-contain" unoptimized />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}


