// @ts-nocheck
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Compass, Calculator, TrendingUp, Settings, 
  ShieldCheck, GraduationCap, PencilLine,
  Star, Sparkles, Info, ArrowUpRight, History, AlertTriangle,
  BookOpen, BarChart3, AlertCircle
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
  return map[stage] || "جاري تحديد المرحلة...";
};

export default function AcademicCompassPage() {
  const { user, userRole, isAdminByEmail } = useAuth();
  const { calculateCompass, analysis, loading, studentStage } = useAcademicCompass();
  
  const isManager = userRole === 'admin' || userRole === 'management' || isAdminByEmail;
  
  const [activeStage, setActiveStage] = useState('');
  
  // 🚀 الهيكلة الجديدة للبيانات: الفصل الأول (نهائي) + الفصل الثاني (أعمال واختبار)
  const [simulationData, setSimulationData] = useState<Record<string, { term1: number, t2_coursework: number, t2_exam: number }>>({});
  
  // الأرصدة السابقة فقط للعاشر والحادي عشر (تم إزالة term1 لأننا نحسبه من المواد)
  const [prevRecords, setPrevRecords] = useState({ g10: 90, g11: 90 });

  useEffect(() => {
    if (user?.id) {
      calculateCompass(user.id).then(({ generated, targetStage }) => {
        setActiveStage(targetStage);
        const initial: Record<string, any> = {};
        generated.forEach((s: any) => {
          initial[s.subject_name] = { 
            term1: 0, // يبدأ بـ 0 ليقوم الطالب بإدخال درجات شهادته
            t2_coursework: s.real_coursework || 0, 
            t2_exam: s.predicted_exam || 0
          };
        });
        setSimulationData(initial);
      });
    }
  }, [user?.id, calculateCompass]);

  // المحرك الرياضي الجديد
  const results = useMemo(() => {
    if (analysis.length === 0) return { term1Avg: "0.00", term2Avg: "0.00", yearAvg: "0.00", final: "0.00" };
    
    const totalMaxTerm = analysis.reduce((acc, s) => acc + s.total_max, 0); // النهاية العظمى للفصل الواحد
    
    let totalTerm1Student = 0;
    let totalTerm2Student = 0;

    analysis.forEach(s => {
      const data = simulationData[s.subject_name] || { term1: 0, t2_coursework: 0, t2_exam: 0 };
      totalTerm1Student += Number(data.term1);
      totalTerm2Student += (Number(data.t2_coursework) + Number(data.t2_exam));
    });

    const term1Avg = totalMaxTerm > 0 ? (totalTerm1Student / totalMaxTerm) * 100 : 0;
    const term2Avg = totalMaxTerm > 0 ? (totalTerm2Student / totalMaxTerm) * 100 : 0;
    const yearAvg = (term1Avg + term2Avg) / 2; // نسبة العام هي متوسط الفصلين

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
      
      {/* 🌌 الخلفية */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-emerald-600/10 blur-[100px] rounded-full"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10 space-y-8 sm:space-y-12">
        
        {/* 🔝 Header */}
        <header className="flex flex-col lg:flex-row justify-between gap-6 bg-white/5 p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border border-white/10 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-[1.5rem] sm:rounded-[2rem] bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30 shrink-0">
              <Compass className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">بوصلة الرفعة الذكية</h1>
              <p className="text-slate-400 mt-1 text-xs sm:text-sm font-bold">المحاكي الدقيق لدرجات الفصول والتراكمي النهائي.</p>
            </div>
          </div>

          {isManager ? (
            <div className="bg-indigo-500/10 p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-indigo-500/30 w-full lg:w-auto min-w-[250px]">
              <p className="text-[10px] font-black text-indigo-400 mb-2 flex items-center gap-1 uppercase tracking-widest">
                <Settings className="w-3 h-3"/> تجربة المراحل (للمدير)
              </p>
              <select 
                value={activeStage || studentStage} 
                onChange={(e) => {
                  setActiveStage(e.target.value);
                  calculateCompass(user.id, e.target.value);
                }}
                className="w-full bg-black/40 text-white font-black px-4 py-3 rounded-xl sm:rounded-2xl outline-none border border-white/10 cursor-pointer focus:border-indigo-500"
              >
                <option value="10">الصف العاشر</option>
                <option value="11_scientific">11 علمي</option>
                <option value="11_literary">11 أدبي</option>
                <option value="12_scientific">12 علمي</option>
                <option value="12_literary">12 أدبي</option>
              </select>
            </div>
          ) : (
            <div className="bg-emerald-500/10 p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-emerald-500/20 flex flex-col justify-center w-full lg:w-auto min-w-[200px]">
              <p className="text-[10px] font-black text-emerald-400 mb-1 uppercase tracking-widest">المرحلة الأكاديمية</p>
              <div className="flex items-center gap-2 text-white font-black text-lg sm:text-xl">
                <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                {formatStageName(activeStage || studentStage)}
              </div>
            </div>
          )}
        </header>

        {/* 📊 Score Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          
          {/* الأرصدة التراكمية */}
          {(showG10 || showG11) && (
            <div className="bg-[#0f1423] p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border border-white/10 shadow-xl col-span-1 md:col-span-2 lg:col-span-1 flex flex-col justify-center">
              <h3 className="text-xs font-black text-slate-500 mb-4 flex items-center gap-2 uppercase tracking-widest">
                <History className="w-4 h-4 text-indigo-400" /> أرصدة سابقة
              </h3>
              <div className="space-y-3">
                {showG10 && (
                  <div className="bg-black/30 p-3 rounded-2xl border border-white/5 flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-400">العاشر</label>
                    <input type="number" value={prevRecords.g10} onChange={e => setPrevRecords({...prevRecords, g10: Number(e.target.value)})} className="w-20 bg-transparent text-lg font-black text-white text-left outline-none" />
                  </div>
                )}
                {showG11 && (
                  <div className="bg-black/30 p-3 rounded-2xl border border-white/5 flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-400">الحادي عشر</label>
                    <input type="number" value={prevRecords.g11} onChange={e => setPrevRecords({...prevRecords, g11: Number(e.target.value)})} className="w-20 bg-transparent text-lg font-black text-white text-left outline-none" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* معدل الفصل الأول (محسوب آلياً) */}
          <div className="bg-[#0f1423] p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border border-white/10 shadow-xl flex flex-col items-center justify-center text-center">
            <BookOpen className="w-8 h-8 text-blue-400/50 mb-3" />
            <p className="text-blue-200 font-black text-[10px] sm:text-xs mb-1 uppercase tracking-widest">نسبة الفصل الأول</p>
            <div className="text-4xl sm:text-5xl font-black text-white">{results.term1Avg}%</div>
            <p className="text-[9px] text-slate-500 mt-2 font-bold">تُحسب تلقائياً من إدخالاتك بالأسفل</p>
          </div>

          {/* نسبة العام الدراسي */}
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] shadow-2xl flex flex-col items-center justify-center text-center">
            <BarChart3 className="w-8 h-8 text-indigo-200/50 mb-3" />
            <p className="text-indigo-100 font-black text-[10px] sm:text-xs mb-1 uppercase tracking-widest">نسبة العام الدراسي المتوقعة</p>
            <div className="text-5xl sm:text-6xl font-black text-white drop-shadow-lg">{results.yearAvg}%</div>
            <p className="text-[9px] text-indigo-200 mt-2 font-bold">متوسط الفصلين (الأول + محاكاة الثاني)</p>
          </div>

          {/* المعدل التراكمي النهائي */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-900 p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] shadow-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
            <Sparkles className="w-8 h-8 text-emerald-200/50 mb-3 animate-pulse" />
            <p className="text-emerald-100 font-black text-[10px] sm:text-xs mb-1 uppercase tracking-widest">المعدل التراكمي الكلي</p>
            <div className="text-6xl sm:text-7xl font-black text-white drop-shadow-2xl">{results.final}%</div>
            <p className="text-[9px] font-bold text-emerald-100 opacity-80 mt-2">
              {currentStageCheck.startsWith('12') ? 'نسبة الشهادة الثانوية' : 'تراكمي المرحلة التقريبي'}
            </p>
          </div>
        </div>

        {/* 🎯 Simulation Grid - قائمة المواد (Mobile Responsive) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {analysis.map((subject, index) => {
            const data = simulationData[subject.subject_name] || { term1: 0, t2_coursework: 0, t2_exam: 0 };
            
            // حسابات حافة النجاح للعام الدراسي (حسب النظام الكويتي)
            const yearTotalMark = subject.total_max * 2; // مجموع الفصلين
            const requiredToPassYear = subject.passing_mark * 2; // مطلوب للنجاح في العام
            const currentTotal = Number(data.term1) + Number(data.t2_coursework); // ما يملكه الطالب الآن
            const neededInFinalExam = requiredToPassYear - currentTotal; // المطلوب جلبه في فاينل الفصل الثاني

            let statusColor = "text-emerald-400";
            let statusBg = "bg-emerald-500/10 border-emerald-500/20";
            let statusText = "ناجح ومستقر";
            let statusIcon = <ShieldCheck className="w-4 h-4" />;

            if (neededInFinalExam > subject.exam_max) {
               statusColor = "text-rose-500";
               statusBg = "bg-rose-500/10 border-rose-500/20";
               statusText = `دور ثاني حتمي (يحتاج ${neededInFinalExam})`;
               statusIcon = <AlertCircle className="w-4 h-4" />;
            } else if (neededInFinalExam > 0) {
               statusColor = "text-amber-400";
               statusBg = "bg-amber-500/10 border-amber-500/20";
               statusText = `تحتاج ${neededInFinalExam} في الفاينل للنجاح`;
               statusIcon = <AlertTriangle className="w-4 h-4" />;
            }

            return (
              <motion.div 
                key={subject.subject_name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-[#0f1423] border border-white/10 p-5 sm:p-8 rounded-[2rem] sm:rounded-[3rem] shadow-xl hover:border-indigo-500/40 transition-all flex flex-col"
              >
                {/* رأس المادة */}
                <div className="flex justify-between items-start mb-6 sm:mb-8 border-b border-white/5 pb-4 sm:pb-6">
                  <div>
                    <h4 className="text-xl sm:text-2xl font-black text-white mb-2">{subject.subject_name}</h4>
                    <span className="text-[9px] sm:text-[10px] font-black px-2 py-1 bg-white/5 rounded-md text-slate-400">النهاية العظمى للفصل: {subject.total_max}</span>
                  </div>
                  <div className="bg-black/40 p-2 sm:p-3 rounded-2xl border border-white/5 text-center min-w-[70px] sm:min-w-[80px]">
                     <p className="text-[8px] sm:text-[9px] font-bold text-slate-500">العام المتوقع</p>
                     <p className="text-lg sm:text-xl font-black text-white">
                      {((Number(data.term1) + Number(data.t2_coursework) + Number(data.t2_exam)) / 2).toFixed(1)}
                     </p>
                  </div>
                </div>

                <div className="space-y-6 sm:space-y-8 flex-1">
                  
                  {/* إدخال درجة الفصل الأول */}
                  <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10">
                    <label className="text-xs font-black text-blue-300 block mb-3">درجة شهادة الفصل الأول (النهائية)</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="number" min="0" max={subject.total_max}
                        value={data.term1 || ''} 
                        onChange={e => setSimulationData({...simulationData, [subject.subject_name]: {...data, term1: Number(e.target.value)}})}
                        className="w-full bg-black/40 border border-blue-500/20 rounded-xl p-3 text-lg font-black text-white outline-none focus:border-blue-500 transition-colors placeholder:text-blue-900"
                        placeholder="أدخل درجة الفصل الأول..."
                      />
                      <span className="text-sm font-black text-slate-500 shrink-0">/ {subject.total_max}</span>
                    </div>
                  </div>

                  {/* محاكاة الفصل الثاني */}
                  <div className="space-y-5">
                    <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Settings className="w-3 h-3"/> محاكاة الفصل الثاني</h5>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] sm:text-xs font-black text-indigo-300">أعمال السنة المتوقعة</label>
                        <span className="text-sm sm:text-base font-black text-white">{data.t2_coursework} <span className="text-[10px] text-slate-600">/ {subject.coursework_max}</span></span>
                      </div>
                      <input 
                        type="range" min="0" max={subject.coursework_max} step="0.5"
                        value={data.t2_coursework}
                        onChange={e => setSimulationData({...simulationData, [subject.subject_name]: {...data, t2_coursework: Number(e.target.value)}})}
                        className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] sm:text-xs font-black text-emerald-300">درجة الاختبار المتوقعة</label>
                        <span className="text-sm sm:text-base font-black text-white">{data.t2_exam} <span className="text-[10px] text-slate-600">/ {subject.exam_max}</span></span>
                      </div>
                      <input 
                        type="range" min="0" max={subject.exam_max} step="0.5"
                        value={data.t2_exam}
                        onChange={e => setSimulationData({...simulationData, [subject.subject_name]: {...data, t2_exam: Number(e.target.value)}})}
                        className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Status Indicator السنوي */}
                <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/5">
                  <div className={cn("flex items-center gap-2 font-black text-[10px] sm:text-xs px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-full border", statusBg, statusColor)}>
                    {statusIcon} {statusText}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <footer className="mt-12 sm:mt-16 p-8 sm:p-12 border-t border-white/5 text-center">
           <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-indigo-500/50 mb-3">
              <Info className="w-4 h-4 shrink-0" />
              <p className="text-[10px] sm:text-xs font-bold leading-relaxed">تعتمد هذه الحسابات على نظام الأوزان النسبية لوزارة التربية بدولة الكويت. لمعرفة معدل العام، يتم جمع الفصلين وقسمتهما على 2.</p>
           </div>
           <p className="text-slate-600 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">Developed by Al-Refaa Digital Systems</p>
        </footer>

      </div>
    </div>
  );
}
