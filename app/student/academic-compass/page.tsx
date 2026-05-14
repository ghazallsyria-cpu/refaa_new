// @ts-nocheck
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Compass, Target, AlertTriangle, CheckCircle2, 
  TrendingUp, Calculator, Sparkles, Star, 
  Zap, PencilLine, GraduationCap, ArrowUpRight
} from 'lucide-react';
import { useAcademicCompass } from '@/hooks/useAcademicCompass';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

export default function AcademicCompassPage() {
  const { user } = useAuth();
  const { calculateCompass, analysis, loading } = useAcademicCompass();
  
  const [academicStage, setAcademicStage] = useState('12_scientific');
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  
  // مدخلات المحاكاة
  const [predictions, setPredictions] = useState<Record<string, number>>({});
  const [prevYears, setPrevYears] = useState({ g10: 90, g11: 92 }); // قيم افتراضية يمكن للطالب تعديلها

  useEffect(() => {
    if (user?.id) {
      calculateCompass(user.id, academicStage).then(data => {
        // تهيئة التوقعات بدرجة النجاح كحد أدنى
        const initialPreds = {};
        data.forEach(s => { initialPreds[s.subject_name] = s.needed_for_passing > 0 ? s.needed_for_passing : 0; });
        setPredictions(initialPreds);
      });
    }
  }, [user?.id, academicStage, calculateCompass]);

  // المحرك الرياضي للمحاكاة
  const simulationResults = useMemo(() => {
    if (analysis.length === 0) return { g12: 0, final: 0 };
    
    const totalMax = analysis.reduce((acc, s) => acc + s.coursework_max + s.exam_max, 0);
    const predictedTotal = analysis.reduce((acc, s) => {
      const pred = predictions[s.subject_name] || 0;
      return acc + s.student_coursework + pred;
    }, 0);

    const g12Avg = (predictedTotal / totalMax) * 100;
    const finalComp = (prevYears.g10 * 0.1) + (prevYears.g11 * 0.2) + (g12Avg * 0.7);
    
    return { g12: g12Avg.toFixed(2), final: finalComp.toFixed(2) };
  }, [analysis, predictions, prevYears]);

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-200 p-4 sm:p-8 pt-24 font-sans" dir="rtl">
      
      {/* 🌌 تأثيرات الخلفية المتحركة */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 blur-[150px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-600/10 blur-[150px] rounded-full"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-500/20 rounded-xl shadow-inner">
                <Compass className="w-8 h-8 text-indigo-400" />
              </div>
              <h1 className="text-4xl font-black text-white">بوصلة التفوق</h1>
            </div>
            <p className="text-slate-400 font-bold">حلل وضعك الحالي.. وارسم ملامح نسبتك النهائية.</p>
          </div>

          <button 
            onClick={() => setIsSimulationMode(!isSimulationMode)}
            className={cn(
              "flex items-center gap-3 px-8 py-4 rounded-2xl font-black transition-all shadow-lg active:scale-95",
              isSimulationMode 
                ? "bg-emerald-600 text-white shadow-emerald-900/20" 
                : "bg-white/5 border border-white/10 text-indigo-400 hover:bg-white/10"
            )}
          >
            {isSimulationMode ? <Zap className="w-5 h-5 fill-current" /> : <Calculator className="w-5 h-5" />}
            {isSimulationMode ? "إيقاف المحاكاة" : "تفعيل محاكي النسب المتوقعة"}
          </button>
        </header>

        {/* 📊 Simulation Dashboard - لوحة نتائج المحاكاة */}
        <AnimatePresence>
          {isSimulationMode && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 overflow-hidden"
            >
              {/* مدخلات السنوات السابقة */}
              <div className="bg-[#0f1423] border border-indigo-500/30 p-6 rounded-[2rem] shadow-xl">
                <h3 className="text-sm font-black text-indigo-300 mb-4 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" /> أرصدة الأعوام السابقة
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">نسبة العاشر (10%)</label>
                    <input 
                      type="number" 
                      value={prevYears.g10}
                      onChange={(e) => setPrevYears({...prevYears, g10: Number(e.target.value)})}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-emerald-400 font-black outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">نسبة الحادي عشر (20%)</label>
                    <input 
                      type="number" 
                      value={prevYears.g11}
                      onChange={(e) => setPrevYears({...prevYears, g11: Number(e.target.value)})}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-emerald-400 font-black outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* النتيجة المتوقعة لـ 12 */}
              <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[2rem] shadow-2xl flex flex-col items-center justify-center relative group">
                <div className="absolute top-4 right-4 opacity-20"><Star className="w-8 h-8 text-white" /></div>
                <p className="text-indigo-100 font-black text-sm mb-2 uppercase tracking-widest">معدل الصف 12 المتوقع</p>
                <div className="text-6xl font-black text-white drop-shadow-lg">{simulationResults.g12}%</div>
                <div className="mt-4 bg-white/20 px-4 py-1 rounded-full text-[10px] font-bold text-white backdrop-blur-md">الوزن النسبي: 70%</div>
              </div>

              {/* النسبة النهائية الكبرى */}
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-8 rounded-[2rem] shadow-2xl flex flex-col items-center justify-center relative">
                <div className="absolute top-4 right-4 opacity-20 animate-bounce"><Sparkles className="w-8 h-8 text-white" /></div>
                <p className="text-emerald-100 font-black text-sm mb-2 uppercase tracking-widest">المعدل التراكمي النهائي</p>
                <div className="text-7xl font-black text-white drop-shadow-lg">{simulationResults.final}%</div>
                <p className="text-[10px] font-bold text-emerald-100 mt-2">معدل شهادة الثانوية العامة (100%)</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🎯 Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {analysis.map((subject) => (
            <motion.div
              key={subject.subject_name}
              layout
              className={cn(
                "bg-[#0f1423] border border-white/5 p-6 rounded-[2.5rem] transition-all relative",
                isSimulationMode && "border-indigo-500/40 ring-1 ring-indigo-500/20"
              )}
            >
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-xl font-black text-white">{subject.subject_name}</h4>
                <div className="bg-black/40 px-4 py-2 rounded-2xl border border-white/5">
                   <p className="text-[9px] font-bold text-slate-500">أعمال السنة</p>
                   <p className="text-lg font-black text-emerald-400">{subject.student_coursework} <span className="text-xs text-slate-600">/ {subject.coursework_max}</span></p>
                </div>
              </div>

              {isSimulationMode ? (
                /* واجهة التحكم في المحاكاة */
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <p className="text-xs font-black text-indigo-300">درجتك المتوقعة في الفاينل:</p>
                    <div className="text-3xl font-black text-white">{predictions[subject.subject_name]} <span className="text-xs text-slate-500">/ {subject.exam_max}</span></div>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max={subject.exam_max}
                    step="1"
                    value={predictions[subject.subject_name] || 0}
                    onChange={(e) => setPredictions({...predictions, [subject.subject_name]: Number(e.target.value)})}
                    className="w-full h-3 bg-indigo-900/50 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-slate-600">
                    <span>0</span>
                    <span>{subject.exam_max / 2} (نصف الدرجة)</span>
                    <span>{subject.exam_max} (درجة كاملة)</span>
                  </div>
                </div>
              ) : (
                /* واجهة العرض العادية (بوصلة الإنقاذ) */
                <>
                  <div className="bg-black/20 rounded-2xl p-5 border border-white/5 flex items-center gap-5 mb-4">
                    <div className={cn(
                      "p-4 rounded-2xl shadow-inner",
                      subject.needed_for_passing <= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                    )}>
                      <Target className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500">مطلوب للنجاح في الفاينل</p>
                      <p className="text-2xl font-black text-white">
                        {subject.needed_for_passing <= 0 ? 'ضمنت النجاح ✅' : `${subject.needed_for_passing} من ${subject.exam_max}`}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 italic leading-relaxed bg-white/5 p-3 rounded-xl">
                    💡 {subject.message}
                  </p>
                </>
              )}
            </motion.div>
          ))}
        </div>

      </div>
    </div>
  );
}
