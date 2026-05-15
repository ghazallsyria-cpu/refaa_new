// @ts-nocheck
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// 🚀 تم إضافة AlertTriangle هنا لكي لا يغضب Netlify
import { 
  Compass, Zap, Target, Calculator, TrendingUp, Settings, 
  ShieldCheck, UserCircle, GraduationCap, PencilLine,
  Star, Sparkles, Info, ArrowUpRight, History, AlertTriangle
} from 'lucide-react';
import { useAcademicCompass } from '@/hooks/useAcademicCompass';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

// دالة مساعدة لتنسيق اسم المرحلة
const formatStageName = (stage: string) => {
  const map: Record<string, string> = {
    '10': 'الصف العاشر',
    '11_scientific': 'الحادي عشر (علمي)',
    '11_literary': 'الحادي عشر (أدبي)',
    '12_scientific': 'الثاني عشر (علمي)',
    '12_literary': 'الثاني عشر (أدبي)',
  };
  return map[stage] || "جاري تحديد المرحلة...";
};

export default function AcademicCompassPage() {
  const { user, userRole, isAdminByEmail } = useAuth();
  const { calculateCompass, analysis, loading, studentStage } = useAcademicCompass();
  
  // صلاحية المدير لتجربة المراحل
  const isManager = userRole === 'admin' || userRole === 'management' || isAdminByEmail;
  
  const [activeStage, setActiveStage] = useState('');
  const [simulationData, setSimulationData] = useState<Record<string, { coursework: number, exam: number }>>({});
  const [prevYears, setPrevYears] = useState({ g10: 90, g11: 90 });

  // 1. تشغيل المحرك عند الدخول
  useEffect(() => {
    if (user?.id) {
      calculateCompass(user.id).then(({ generated, targetStage }) => {
        setActiveStage(targetStage);
        // تهيئة بيانات المحاكاة بناءً على الدرجات الحقيقية
        const initial: Record<string, any> = {};
        generated.forEach((s: any) => {
          initial[s.subject_name] = { 
            coursework: s.real_coursework, 
            exam: s.predicted_exam 
          };
        });
        setSimulationData(initial);
      });
    }
  }, [user?.id, calculateCompass]);

  // 2. محرك الحسابات اللحظي (التراكمي + السنوي)
  const results = useMemo(() => {
    if (analysis.length === 0) return { current: 0, final: 0 };
    
    const totalMax = analysis.reduce((acc, s) => acc + s.total_max, 0);
    const predictedTotal = analysis.reduce((acc, s) => {
      const data = simulationData[s.subject_name] || { coursework: 0, exam: 0 };
      return acc + Number(data.coursework) + Number(data.exam);
    }, 0);

    const gCurrentAvg = totalMax > 0 ? (predictedTotal / totalMax) * 100 : 0;
    
    // تطبيق منطق الأوزان الكويتية (10% - 20% - 70%)
    let finalGPA = gCurrentAvg;
    const currentStage = activeStage || studentStage;

    if (currentStage.startsWith('12')) {
      finalGPA = (prevYears.g10 * 0.1) + (prevYears.g11 * 0.2) + (gCurrentAvg * 0.7);
    } else if (currentStage.startsWith('11')) {
      // إذا كان في 11، نحاكي النسبة بناءً على رصيد 10 والوزن الحالي
      finalGPA = (prevYears.g10 * 0.1) + (gCurrentAvg * 0.9); 
    }

    return { 
      current: gCurrentAvg.toFixed(2), 
      final: finalGPA.toFixed(2) 
    };
  }, [analysis, simulationData, prevYears, activeStage, studentStage]);

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-200 p-4 sm:p-8 pt-24 font-sans" dir="rtl">
      
      {/* 🌌 الخلفية الحيوية */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-600/10 blur-[100px] rounded-full"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* 🔝 Header Section */}
        <header className="flex flex-col lg:flex-row justify-between gap-6 mb-12 bg-white/5 p-8 rounded-[3rem] border border-white/10 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-[2rem] bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30 shadow-inner">
              <Compass className="w-10 h-10 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tight">بوصلة الرفعة الذكية</h1>
              <p className="text-slate-400 mt-1 font-bold">نظام التوقع الأكاديمي المتكامل لطلاب المرحلة الثانوية.</p>
            </div>
          </div>

          {isManager ? (
            <div className="bg-indigo-500/10 p-5 rounded-[2rem] border border-indigo-500/30 min-w-[250px]">
              <p className="text-[10px] font-black text-indigo-400 mb-2 flex items-center gap-1 uppercase tracking-widest">
                <Settings className="w-3 h-3"/> لوحة تحكم المدير
              </p>
              <select 
                value={activeStage || studentStage} 
                onChange={(e) => {
                  setActiveStage(e.target.value);
                  calculateCompass(user.id, e.target.value);
                }}
                className="w-full bg-black/40 text-white font-black px-4 py-3 rounded-2xl outline-none border border-white/10 cursor-pointer focus:border-indigo-500 transition-all"
              >
                <option value="10">الصف العاشر</option>
                <option value="11_scientific">11 علمي</option>
                <option value="11_literary">11 أدبي</option>
                <option value="12_scientific">12 علمي</option>
                <option value="12_literary">12 أدبي</option>
              </select>
            </div>
          ) : (
            <div className="bg-emerald-500/10 p-5 rounded-[2rem] border border-emerald-500/20 flex flex-col justify-center min-w-[200px]">
              <p className="text-[10px] font-black text-emerald-400 mb-1 uppercase tracking-widest">المرحلة الأكاديمية</p>
              <div className="flex items-center gap-2 text-white font-black text-xl">
                <GraduationCap className="w-6 h-6 text-emerald-400" />
                {formatStageName(activeStage || studentStage)}
              </div>
            </div>
          )}
        </header>

        {/* 📊 Score Dashboard - لوحة الحسابات المركزية */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          
          {/* مدخلات السنوات السابقة */}
          <div className="bg-[#0f1423] p-8 rounded-[3rem] border border-white/10 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform"><History className="w-32 h-32 text-white" /></div>
            <h3 className="text-sm font-black text-slate-500 mb-6 flex items-center gap-2 uppercase tracking-widest">
              <Star className="w-4 h-4 text-amber-400" /> رصيد السنوات السابقة
            </h3>
            <div className="space-y-6 relative z-10">
              <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                <label className="text-[10px] font-bold text-indigo-400 block mb-2">نسبة الصف العاشر (10%)</label>
                <input 
                  type="number" 
                  value={prevYears.g10} 
                  onChange={e => setPrevYears({...prevYears, g10: Number(e.target.value)})} 
                  className="w-full bg-transparent text-2xl font-black text-white outline-none"
                />
              </div>
              <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                <label className="text-[10px] font-bold text-indigo-400 block mb-2">نسبة الصف الحادي عشر (20%)</label>
                <input 
                  type="number" 
                  value={prevYears.g11} 
                  onChange={e => setPrevYears({...prevYears, g11: Number(e.target.value)})} 
                  className="w-full bg-transparent text-2xl font-black text-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* معدل السنة الحالية المتوقع */}
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 p-8 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center text-center group">
            <TrendingUp className="w-10 h-10 text-indigo-200/50 mb-4 group-hover:scale-125 transition-transform" />
            <p className="text-indigo-100 font-black text-sm mb-1 uppercase tracking-widest">معدل العام الحالي</p>
            <div className="text-7xl font-black text-white drop-shadow-2xl">{results.current}%</div>
            <div className="mt-4 bg-white/10 px-4 py-1 rounded-full text-[10px] font-bold text-indigo-100 backdrop-blur-md">تراكمي الفصلين</div>
          </div>

          {/* المعدل التراكمي النهائي (الوزن الكلي) */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-900 p-8 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center text-center relative overflow-hidden group">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            <Sparkles className="w-10 h-10 text-emerald-200/50 mb-4 animate-pulse" />
            <p className="text-emerald-100 font-black text-sm mb-1 uppercase tracking-widest">المعدل التراكمي النهائي</p>
            <div className="text-8xl font-black text-white drop-shadow-2xl">{results.final}%</div>
            <p className="mt-2 text-[10px] font-bold text-emerald-100 opacity-80">نسبة الشهادة الثانوية (100%)</p>
          </div>
        </div>

        {/* 🎯 Simulation Grid - شبكة محاكاة المواد */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {analysis.map((subject, index) => (
            <motion.div 
              key={subject.subject_name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-[#0f1423] border border-white/10 p-8 rounded-[3rem] shadow-xl hover:border-indigo-500/40 transition-all group"
            >
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h4 className="text-2xl font-black text-white mb-2 group-hover:text-indigo-400 transition-colors">{subject.subject_name}</h4>
                  <div className="flex gap-2">
                    <span className="text-[9px] font-black px-2 py-1 bg-white/5 rounded-md text-slate-500 uppercase">Weight: {subject.total_max}</span>
                    <span className="text-[9px] font-black px-2 py-1 bg-emerald-500/10 rounded-md text-emerald-400 uppercase">Passing: {subject.passing_mark}</span>
                  </div>
                </div>
                <div className="bg-black/40 p-3 rounded-2xl border border-white/5 text-center min-w-[80px]">
                   <p className="text-[9px] font-bold text-slate-500">المجموع</p>
                   <p className="text-xl font-black text-white">
                    {(Number(simulationData[subject.subject_name]?.coursework || 0) + Number(simulationData[subject.subject_name]?.exam || 0))}
                   </p>
                </div>
              </div>

              {/*Sliders - أشرطة التحكم */}
              <div className="space-y-10">
                {/* Coursework Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-indigo-300 flex items-center gap-2">
                      <PencilLine className="w-4 h-4" /> أعمال السنة (المتوقعة)
                    </label>
                    <span className="text-lg font-black text-white">{simulationData[subject.subject_name]?.coursework} <span className="text-xs text-slate-600">/ {subject.coursework_max}</span></span>
                  </div>
                  <input 
                    type="range" min="0" max={subject.coursework_max} step="0.5"
                    value={simulationData[subject.subject_name]?.coursework || 0}
                    onChange={e => setSimulationData({...simulationData, [subject.subject_name]: {...simulationData[subject.subject_name], coursework: Number(e.target.value)}})}
                    className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Final Exam Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-emerald-300 flex items-center gap-2">
                      <Calculator className="w-4 h-4" /> درجة الاختبار (المتوقعة)
                    </label>
                    <span className="text-lg font-black text-white">{simulationData[subject.subject_name]?.exam} <span className="text-xs text-slate-600">/ {subject.exam_max}</span></span>
                  </div>
                  <input 
                    type="range" min="0" max={subject.exam_max} step="0.5"
                    value={simulationData[subject.subject_name]?.exam || 0}
                    onChange={e => setSimulationData({...simulationData, [subject.subject_name]: {...simulationData[subject.subject_name], exam: Number(e.target.value)}})}
                    className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>

              {/* Status Indicator */}
              <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {((Number(simulationData[subject.subject_name]?.coursework || 0) + Number(simulationData[subject.subject_name]?.exam || 0)) >= subject.passing_mark) ? (
                    <div className="flex items-center gap-2 text-emerald-400 font-black text-xs bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
                      <ShieldCheck className="w-4 h-4" /> حالة النجاح: آمنة ومستقرة
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-rose-400 font-black text-xs bg-rose-500/10 px-4 py-2 rounded-full border border-rose-500/20 animate-pulse">
                      <AlertTriangle className="w-4 h-4" /> حالة النجاح: لم تتحقق بعد
                    </div>
                  )}
                </div>
                <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1 italic">
                  تحرك للتنبؤ <ArrowUpRight className="w-3 h-3" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer Disclaimer */}
        <footer className="mt-16 p-12 border-t border-white/5 text-center">
           <div className="flex items-center justify-center gap-2 text-indigo-500/50 mb-3">
              <Info className="w-4 h-4" />
              <p className="text-xs font-bold leading-relaxed">تعتمد هذه الحسابات على نظام الأوزان النسبية لوزارة التربية بدولة الكويت (10% - 20% - 70%). جميع النتائج تقديرية للمحاكاة فقط.</p>
           </div>
           <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">Developed by Al-Refaa Digital Systems v2.0</p>
        </footer>

      </div>
    </div>
  );
}
