// @ts-nocheck
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Compass, Calculator, TrendingUp, Settings, 
  ShieldCheck, GraduationCap, PencilLine,
  Star, Sparkles, Info, ArrowUpRight, History, 
  AlertTriangle, BookOpen, BarChart3, AlertCircle, CheckCircle2
} from 'lucide-react';
import { useAcademicCompass } from '@/hooks/useAcademicCompass';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

const formatStageName = (stage: string) => {
  const map: Record<string, string> = {
    '10': 'الصف العاشر',
    '11_scientific': 'الحادي عشر (علمي)',
    '11_literary': 'الحادي عشر (أدبي)',
    '12_scientific': 'الثاني عشر (علمي)',
    '12_literary': 'الثاني عشر (أدبي)',
  };
  return map[stage] || "جاري التحديد...";
};

export default function AcademicCompassPage() {
  const { user, userRole, isAdminByEmail } = useAuth();
  const { calculateCompass, analysis, loading, studentStage } = useAcademicCompass();
  
  const isManager = userRole === 'admin' || userRole === 'management' || isAdminByEmail;
  const [activeStage, setActiveStage] = useState('');
  const [simulationData, setSimulationData] = useState<Record<string, { term1: number, t2_coursework: number, t2_exam: number }>>({});
  const [prevRecords, setPrevRecords] = useState({ g10: 90, g11: 90 });

  useEffect(() => {
    if (user?.id) {
      calculateCompass(user.id).then(({ generated, targetStage }) => {
        setActiveStage(targetStage);
        const initial: Record<string, any> = {};
        generated.forEach((s: any) => {
          initial[s.subject_name] = { 
            term1: 0, 
            t2_coursework: s.real_coursework || 0, 
            t2_exam: s.predicted_exam || 0
          };
        });
        setSimulationData(initial);
      });
    }
  }, [user?.id, calculateCompass]);

  const results = useMemo(() => {
    if (analysis.length === 0) return { term1Avg: "0.00", term2Avg: "0.00", yearAvg: "0.00", final: "0.00" };
    
    const totalMaxTerm = analysis.reduce((acc, s) => acc + s.total_max, 0); 
    let totalTerm1Student = 0;
    let totalTerm2Student = 0;

    analysis.forEach(s => {
      const data = simulationData[s.subject_name] || { term1: 0, t2_coursework: 0, t2_exam: 0 };
      totalTerm1Student += Number(data.term1);
      totalTerm2Student += (Number(data.t2_coursework) + Number(data.t2_exam));
    });

    const term1Avg = totalMaxTerm > 0 ? (totalTerm1Student / totalMaxTerm) * 100 : 0;
    const term2Avg = totalMaxTerm > 0 ? (totalTerm2Student / totalMaxTerm) * 100 : 0;
    const yearAvg = (term1Avg + term2Avg) / 2; 

    let finalGPA = yearAvg;
    const currentStage = activeStage || studentStage;

    if (currentStage.startsWith('12')) {
      finalGPA = (prevRecords.g10 * 0.1) + (prevRecords.g11 * 0.2) + (yearAvg * 0.7);
    } else if (currentStage.startsWith('11')) {
      finalGPA = (prevRecords.g10 * 0.1) + (yearAvg * 0.9); 
    }

    return { 
      term1Avg: term1Avg.toFixed(2),
      term2Avg: term2Avg.toFixed(2),
      yearAvg: yearAvg.toFixed(2), 
      final: finalGPA.toFixed(2) 
    };
  }, [analysis, simulationData, prevRecords, activeStage, studentStage]);

  const currentStageCheck = activeStage || studentStage;
  const showG10 = currentStageCheck.startsWith('11') || currentStageCheck.startsWith('12');
  const showG11 = currentStageCheck.startsWith('12');

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-200 p-4 sm:p-6 lg:p-8 pt-24 font-sans" dir="rtl">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-indigo-600/10 blur-[100px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-emerald-600/10 blur-[90px] rounded-full"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10 space-y-8 sm:space-y-12">
        <header className="flex flex-col lg:flex-row justify-between gap-6 bg-white/5 p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border border-white/10 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-[1.2rem] sm:rounded-[2rem] bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30 shrink-0">
              <Compass className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">البوصلة الذكية</h1>
              <p className="text-slate-400 mt-1 text-xs sm:text-sm font-bold">توقع وتخطيط درجاتك في مدرسة الرفعة النموذجية.</p>
            </div>
          </div>

          {isManager ? (
            <div className="bg-indigo-500/10 p-4 sm:p-5 rounded-[1.2rem] sm:rounded-[2rem] border border-indigo-500/30 w-full lg:w-auto">
              <p className="text-[10px] font-black text-indigo-400 mb-2 flex items-center gap-1 uppercase tracking-widest">
                <Settings className="w-3 h-3"/> لوحة المدير (اختبار المراحل)
              </p>
              <select 
                value={activeStage || studentStage} 
                onChange={(e) => {
                  setActiveStage(e.target.value);
                  calculateCompass(user.id, e.target.value);
                }}
                className="w-full bg-black/50 text-white font-black px-4 py-3 rounded-xl sm:rounded-2xl outline-none border border-white/10 cursor-pointer focus:border-indigo-500"
              >
                <option value="10">الصف العاشر</option>
                <option value="11_scientific">11 علمي</option>
                <option value="11_literary">11 أدبي</option>
                <option value="12_scientific">12 علمي</option>
                <option value="12_literary">12 أدبي</option>
              </select>
            </div>
          ) : (
            <div className="bg-emerald-500/10 p-4 sm:p-5 rounded-[1.2rem] sm:rounded-[2rem] border border-emerald-500/20 flex flex-col justify-center w-full lg:w-auto">
              <p className="text-[10px] font-black text-emerald-400 mb-1 uppercase tracking-widest">المرحلة الأكاديمية</p>
              <div className="flex items-center gap-2 text-white font-black text-lg sm:text-xl">
                <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                {formatStageName(activeStage || studentStage)}
              </div>
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {(showG10 || showG11) && (
            <div className="bg-[#0f1423] p-5 sm:p-6 rounded-[2rem] border border-white/10 shadow-xl col-span-1 md:col-span-2 lg:col-span-1 flex flex-col justify-center">
              <h3 className="text-[10px] sm:text-xs font-black text-slate-500 mb-4 flex items-center gap-2 uppercase tracking-widest">
                <History className="w-4 h-4 text-indigo-400" /> أرصدة السنوات السابقة
              </h3>
              <div className="space-y-3">
                {showG10 && (
                  <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-400">العاشر</label>
                    <input type="number" value={prevRecords.g10} onChange={e => setPrevRecords({...prevRecords, g10: Number(e.target.value)})} className="w-16 sm:w-20 bg-transparent text-base sm:text-lg font-black text-white text-left outline-none" />
                  </div>
                )}
                {showG11 && (
                  <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-400">الحادي عشر</label>
                    <input type="number" value={prevRecords.g11} onChange={e => setPrevRecords({...prevRecords, g11: Number(e.target.value)})} className="w-16 sm:w-20 bg-transparent text-base sm:text-lg font-black text-white text-left outline-none" />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-[#0f1423] p-5 sm:p-6 rounded-[2rem] border border-white/10 shadow-xl flex flex-col items-center justify-center text-center">
            <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400/50 mb-2 sm:mb-3" />
            <p className="text-blue-200 font-black text-[9px] sm:text-[10px] mb-1 uppercase tracking-widest">نسبة الفصل الأول</p>
            <div className="text-3xl sm:text-5xl font-black text-white">{results.term1Avg}%</div>
            <p className="text-[8px] sm:text-[9px] text-slate-500 mt-2 font-bold">تُحسب من إدخالات المواد</p>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-blue-900 p-5 sm:p-6 rounded-[2rem] shadow-2xl flex flex-col items-center justify-center text-center">
            <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-200/50 mb-2 sm:mb-3" />
            <p className="text-indigo-100 font-black text-[9px] sm:text-[10px] mb-1 uppercase tracking-widest">نسبة العام المتوقعة</p>
            <div className="text-4xl sm:text-6xl font-black text-white drop-shadow-lg">{results.yearAvg}%</div>
            <p className="text-[8px] sm:text-[9px] text-indigo-200 mt-2 font-bold">متوسط الفصلين 1 و 2</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-600 to-teal-900 p-5 sm:p-6 rounded-[2rem] shadow-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-200/50 mb-2 sm:mb-3 animate-pulse" />
            <p className="text-emerald-100 font-black text-[9px] sm:text-[10px] mb-1 uppercase tracking-widest">المعدل التراكمي النهائي</p>
            <div className="text-5xl sm:text-7xl font-black text-white drop-shadow-2xl">{results.final}%</div>
            <p className="text-[8px] sm:text-[9px] font-bold text-emerald-100 opacity-80 mt-2">نسبتك المئوية التراكمية</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {analysis.map((subject, index) => {
            const data = simulationData[subject.subject_name] || { term1: 0, t2_coursework: 0, t2_exam: 0 };
            
            // 🛠️ الإصلاح السحري: تم تغيير المتغير ليكون neededForYear لتجنب الانهيار
            const yearTotalMax = subject.total_max * 2; 
            const yearPassingMark = subject.passing_mark * 2; 
            const studentCurrentTotal = Number(data.term1) + Number(data.t2_coursework);
            const neededForYear = yearPassingMark - studentCurrentTotal;

            let statusConfig = {
              color: "text-emerald-400",
              bg: "bg-emerald-500/10 border-emerald-500/20",
              text: "ضمنت النجاح بالمادة",
              icon: <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
            };

            if (neededForYear > subject.exam_max) {
               statusConfig = {
                 color: "text-rose-500",
                 bg: "bg-rose-500/10 border-rose-500/20",
                 text: `مستحيل (تحتاج ${neededForYear} والفاينل من ${subject.exam_max})`,
                 icon: <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
               };
            } else if (neededForYear > 0) {
               statusConfig = {
                 color: "text-amber-400",
                 bg: "bg-amber-500/10 border-amber-500/20",
                 text: `تحتاج لـ ${neededForYear} درجة في الفاينل لتنجح`, // 👈 تم إصلاح الخطأ المسبب للانهيار
                 icon: <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
               };
            }

            return (
              <motion.div 
                key={subject.subject_name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-[#0f1423] border border-white/10 p-5 sm:p-8 rounded-[2rem] sm:rounded-[3rem] shadow-xl flex flex-col"
              >
                <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
                  <div>
                    <h4 className="text-lg sm:text-2xl font-black text-white mb-2">{subject.subject_name}</h4>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-[8px] sm:text-[10px] font-black px-2 py-1 bg-white/5 rounded-md text-slate-400">عظمى الفصل: {subject.total_max}</span>
                    </div>
                  </div>
                  <div className="bg-black/40 p-2 sm:p-3 rounded-xl border border-white/5 text-center min-w-[70px]">
                     <p className="text-[7px] sm:text-[9px] font-bold text-slate-500">مجموع العام</p>
                     <p className="text-base sm:text-xl font-black text-white">
                      {(Number(data.term1) + Number(data.t2_coursework) + Number(data.t2_exam))}
                      <span className="text-[10px] text-slate-500"> /{yearTotalMax}</span>
                     </p>
                  </div>
                </div>

                <div className="space-y-6 flex-1">
                  <div className="bg-blue-500/10 p-4 sm:p-5 rounded-2xl border border-blue-500/20">
                    <label className="text-[10px] sm:text-xs font-black text-blue-300 block mb-2 sm:mb-3 flex items-center gap-2">
                      <BookOpen className="w-3 h-3" /> درجة الفصل الأول (من الشهادة)
                    </label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" min="0" max={subject.total_max}
                        value={data.term1 || ''} 
                        onChange={e => setSimulationData({...simulationData, [subject.subject_name]: {...data, term1: Number(e.target.value)}})}
                        className="w-full bg-black/50 border border-blue-500/30 rounded-xl p-3 sm:p-4 text-base sm:text-lg font-black text-white outline-none focus:border-blue-500 transition-colors placeholder:text-blue-900/50"
                        placeholder="أدخل درجة الشهادة..."
                      />
                      <span className="text-xs sm:text-sm font-black text-blue-500 shrink-0">/ {subject.total_max}</span>
                    </div>
                  </div>

                  <div className="space-y-5 bg-white/5 p-4 sm:p-5 rounded-2xl border border-white/5">
                    <h5 className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">محاكاة الفصل الثاني</h5>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] sm:text-xs font-black text-indigo-300 flex items-center gap-1"><PencilLine className="w-3 h-3"/> أعمال السنة</label>
                        <span className="text-sm sm:text-base font-black text-white">{data.t2_coursework} <span className="text-[9px] text-slate-500">/ {subject.coursework_max}</span></span>
                      </div>
                      <input 
                        type="range" min="0" max={subject.coursework_max} step="0.5"
                        value={data.t2_coursework}
                        onChange={e => setSimulationData({...simulationData, [subject.subject_name]: {...data, t2_coursework: Number(e.target.value)}})}
                        className="w-full h-2 bg-black/50 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] sm:text-xs font-black text-emerald-300 flex items-center gap-1"><Calculator className="w-3 h-3"/> اختبار الفاينل</label>
                        <span className="text-sm sm:text-base font-black text-white">{data.t2_exam} <span className="text-[9px] text-slate-500">/ {subject.exam_max}</span></span>
                      </div>
                      <input 
                        type="range" min="0" max={subject.exam_max} step="0.5"
                        value={data.t2_exam}
                        onChange={e => setSimulationData({...simulationData, [subject.subject_name]: {...data, t2_exam: Number(e.target.value)}})}
                        className="w-full h-2 bg-black/50 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 sm:mt-8 pt-4 sm:pt-5 border-t border-white/5">
                  <div className={cn("flex items-center gap-2 font-black text-[9px] sm:text-[11px] px-3 sm:px-4 py-3 sm:py-4 rounded-xl border", statusConfig.bg, statusConfig.color)}>
                    {statusConfig.icon} {statusConfig.text}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <footer className="mt-12 sm:mt-16 p-6 sm:p-12 border-t border-white/5 text-center">
           <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-indigo-500/60 mb-3">
              <Info className="w-4 h-4 shrink-0" />
              <p className="text-[9px] sm:text-xs font-bold leading-relaxed max-w-2xl">هذا المحاكي مصمم وفقاً لأحدث لوائح وزارة التربية الكويتية لعام 2026. الأرقام الناتجة هي للمحاكاة والتوقع الأكاديمي بناءً على مدخلاتك.</p>
           </div>
           <p className="text-slate-600 text-[8px] sm:text-[10px] font-black uppercase tracking-widest">تطوير مدرسة الرفعة النموذجية</p>
        </footer>

      </div>
    </div>
  );
}
