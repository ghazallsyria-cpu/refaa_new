// @ts-nocheck
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// 🚀 تم إصلاح الاستيراد هنا:
import { Compass, Zap, Target, Calculator, TrendingUp, Settings, ShieldCheck, UserCircle, GraduationCap, PencilLine } from 'lucide-react';
import { useAcademicCompass } from '@/hooks/useAcademicCompass';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

export default function AcademicCompassPage() {
  const { user, userRole, isAdminByEmail } = useAuth();
  const { calculateCompass, analysis, loading, studentStage } = useAcademicCompass();
  
  const isManager = userRole === 'admin' || userRole === 'management' || isAdminByEmail;
  
  const [activeStage, setActiveStage] = useState('');
  const [simulationData, setSimulationData] = useState<Record<string, { coursework: number, exam: number }>>({});
  const [prevYears, setPrevYears] = useState({ g10: 90, g11: 90 });

  useEffect(() => {
    if (user?.id) {
      calculateCompass(user.id).then(({ generated, targetStage }) => {
        setActiveStage(targetStage);
        const initial = {};
        generated.forEach(s => {
          initial[s.subject_name] = { coursework: s.real_coursework, exam: s.predicted_exam };
        });
        setSimulationData(initial);
      });
    }
  }, [user?.id, calculateCompass]);

  const results = useMemo(() => {
    if (analysis.length === 0) return { current: 0, final: 0 };
    const totalMax = analysis.reduce((acc, s) => acc + s.total_max, 0);
    const predictedTotal = analysis.reduce((acc, s) => {
      const data = simulationData[s.subject_name] || { coursework: 0, exam: 0 };
      return acc + data.coursework + data.exam;
    }, 0);
    const gCurrentAvg = totalMax > 0 ? (predictedTotal / totalMax) * 100 : 0;
    
    let finalGPA = gCurrentAvg;
    if (activeStage.startsWith('12')) {
      finalGPA = (prevYears.g10 * 0.1) + (prevYears.g11 * 0.2) + (gCurrentAvg * 0.7);
    } else if (activeStage.startsWith('11')) {
      finalGPA = (prevYears.g10 * 0.1) + (gCurrentAvg * 0.9);
    }

    return { current: gCurrentAvg.toFixed(2), final: finalGPA.toFixed(2) };
  }, [analysis, simulationData, prevYears, activeStage]);

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-200 p-4 sm:p-8 pt-24 font-sans" dir="rtl">
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header & Admin Controls */}
        <header className="flex flex-col lg:flex-row justify-between gap-6 mb-12 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-md">
          <div>
            <h1 className="text-4xl font-black text-white flex items-center gap-3">
              <Compass className="w-10 h-10 text-indigo-400" /> بوصلة الرفعة الذكية
            </h1>
            <p className="text-slate-400 mt-2 font-bold">المحاكي الرسمي المعتمد لتوزيع درجات وزارة التربية - الكويت.</p>
          </div>

          {isManager && (
            <div className="bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/30">
              <p className="text-[10px] font-black text-indigo-400 mb-2 flex items-center gap-1"><Settings className="w-3 h-3"/> لوحة تحكم المدير (اختبار المراحل)</p>
              <select 
                value={activeStage} 
                onChange={(e) => {
                  setActiveStage(e.target.value);
                  calculateCompass(user.id, e.target.value);
                }}
                className="bg-black/40 text-white font-black px-4 py-2 rounded-xl outline-none border border-white/10"
              >
                <option value="10">الصف العاشر</option>
                <option value="11_scientific">11 علمي</option>
                <option value="11_literary">11 أدبي</option>
                <option value="12_scientific">12 علمي</option>
                <option value="12_literary">12 أدبي</option>
              </select>
            </div>
          )}
        </header>

        {/* النتائج التراكمية */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-[#0f1423] p-8 rounded-[2.5rem] border border-white/10 shadow-xl">
            <p className="text-slate-500 font-black text-xs mb-4 uppercase tracking-widest">إدخال نسب السنوات السابقة</p>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-indigo-400 block mb-1">نسبة الصف العاشر (الحقيقية)</label>
                <input type="number" value={prevYears.g10} onChange={e => setPrevYears({...prevYears, g10: +e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 font-black text-white outline-none focus:border-indigo-500"/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-indigo-400 block mb-1">نسبة الصف الحادي عشر (الحقيقية)</label>
                <input type="number" value={prevYears.g11} onChange={e => setPrevYears({...prevYears, g11: +e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 font-black text-white outline-none focus:border-indigo-500"/>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-blue-800 p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center">
            <TrendingUp className="w-8 h-8 text-white/50 mb-2" />
            <p className="text-indigo-100 font-black text-sm mb-1 uppercase">معدل السنة الحالية</p>
            <div className="text-6xl font-black text-white">{results.current}%</div>
          </div>

          <div className="bg-gradient-to-br from-emerald-600 to-teal-800 p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><GraduationCap className="w-24 h-24" /></div>
            <p className="text-emerald-100 font-black text-sm mb-1 uppercase">المعدل التراكمي النهائي</p>
            <div className="text-7xl font-black text-white drop-shadow-lg">{results.final}%</div>
          </div>
        </div>

        {/* قائمة المواد مع المحاكاة المزدوجة */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {analysis.map((subject) => (
            <motion.div key={subject.subject_name} className="bg-[#0f1423] border border-white/10 p-8 rounded-[3rem] shadow-xl hover:border-indigo-500/50 transition-all group">
              <div className="flex justify-between items-center mb-8">
                <h4 className="text-2xl font-black text-white">{subject.subject_name}</h4>
                <div className="bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
                  <p className="text-[10px] font-black text-emerald-400">الدرجة الكلية</p>
                  <p className="text-xl font-black text-white">{subject.total_max}</p>
                </div>
              </div>

              <div className="space-y-8">
                {/* محاكي أعمال السنة */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-black text-indigo-300 flex items-center gap-1"><PencilLine className="w-3 h-3"/> أعمال السنة (المتوقعة)</span>
                    <span className="text-lg font-black text-white">{simulationData[subject.subject_name]?.coursework} / {subject.coursework_max}</span>
                  </div>
                  <input 
                    type="range" min="0" max={subject.coursework_max} 
                    value={simulationData[subject.subject_name]?.coursework || 0}
                    onChange={e => setSimulationData({...simulationData, [subject.subject_name]: {...simulationData[subject.subject_name], coursework: +e.target.value}})}
                    className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* محاكي درجة الاختبار */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-black text-emerald-300 flex items-center gap-1"><Calculator className="w-3 h-3"/> درجة الاختبار (المتوقعة)</span>
                    <span className="text-lg font-black text-white">{simulationData[subject.subject_name]?.exam} / {subject.exam_max}</span>
                  </div>
                  <input 
                    type="range" min="0" max={subject.exam_max} 
                    value={simulationData[subject.subject_name]?.exam || 0}
                    onChange={e => setSimulationData({...simulationData, [subject.subject_name]: {...simulationData[subject.subject_name], exam: +e.target.value}})}
                    className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between text-xs font-bold text-slate-500">
                <p>مجموع المادة المتوقع: <span className="text-white">{(simulationData[subject.subject_name]?.coursework || 0) + (simulationData[subject.subject_name]?.exam || 0)}</span></p>
                <p className={cn(
                  ((simulationData[subject.subject_name]?.coursework || 0) + (simulationData[subject.subject_name]?.exam || 0)) >= subject.passing_mark ? "text-emerald-400" : "text-rose-400 animate-pulse"
                )}>
                  {((simulationData[subject.subject_name]?.coursework || 0) + (simulationData[subject.subject_name]?.exam || 0)) >= subject.passing_mark ? "وضع النجاح: آمن ✅" : "وضع النجاح: خطر ⚠️"}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
