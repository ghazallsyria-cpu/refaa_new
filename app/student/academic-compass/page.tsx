// @ts-nocheck
'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Compass, Target, AlertTriangle, CheckCircle2, 
  Info, TrendingUp, Calculator, ArrowRight,
  ShieldAlert, Sparkles, GraduationCap, CalculatorIcon
} from 'lucide-react';
import { useAcademicCompass, SubjectAnalysis } from '@/hooks/useAcademicCompass';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

// إعدادات الحركة
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

export default function AcademicCompassPage() {
  const { user } = useAuth();
  const { calculateCompass, analysis, loading } = useAcademicCompass();
  
  // نفترض أننا جلبنا مرحلة الطالب من ملفه (عاشر، حادي عشر، ثاني عشر)
  const [academicStage, setAcademicStage] = useState('12_scientific');

  useEffect(() => {
    if (user?.id) {
      calculateCompass(user.id, academicStage);
    }
  }, [user?.id, academicStage, calculateCompass]);

  // حسابات إحصائية سريعة للملخص
  const subjectsPassed = analysis.filter(s => s.status === 'PASSED').length;
  const subjectsAtRisk = analysis.filter(s => s.status === 'DANGER' || s.status === 'IMPOSSIBLE').length;

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-[#02040a] text-slate-200 p-4 sm:p-8 pt-24 font-sans"
      dir="rtl"
    >
      {/* 🌌 الإضاءة الخلفية */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-900/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-rose-900/10 blur-[100px] rounded-full"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header - الترويسة */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Compass className="w-6 h-6 text-indigo-400 animate-pulse" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">البوصلة الأكاديمية</h1>
            </div>
            <p className="text-slate-400 font-medium">نظام التوقع الذكي وحساب فجوة النجاح لطلاب الثانوية العامة.</p>
          </motion.div>

          <motion.div variants={itemVariants} className="flex gap-3">
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
              <p className="text-[10px] font-black text-slate-500 uppercase mb-1">المرحلة الحالية</p>
              <select 
                value={academicStage}
                onChange={(e) => setAcademicStage(e.target.value)}
                className="bg-transparent text-indigo-400 font-bold outline-none cursor-pointer"
              >
                <option value="10">الصف العاشر</option>
                <option value="11_scientific">11 علمي</option>
                <option value="12_scientific">12 علمي</option>
              </select>
            </div>
          </motion.div>
        </header>

        {/* 📊 Bento Summary - ملخص الأداء التراكمي */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          
          {/* GPA Weightages */}
          <motion.div variants={itemVariants} className="md:col-span-2 bg-[#0f1423] border border-white/10 p-6 rounded-[2.5rem] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
               <TrendingUp className="w-32 h-32 text-white" />
            </div>
            <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
               <Sparkles className="w-5 h-5 text-amber-400" /> توزيع أوزان الشهادة
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-black text-indigo-400">10%</div>
                <div className="text-[10px] text-slate-500 font-bold">عاشر</div>
              </div>
              <div className="text-center border-x border-white/5">
                <div className="text-2xl font-black text-blue-400">20%</div>
                <div className="text-[10px] text-slate-500 font-bold">حادي عشر</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-emerald-400">70%</div>
                <div className="text-[10px] text-slate-500 font-bold">ثاني عشر</div>
              </div>
            </div>
          </motion.div>

          {/* Rapid Stats */}
          <motion.div variants={itemVariants} className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[2.5rem] flex flex-col justify-center items-center text-center">
            <div className="p-3 bg-emerald-500/20 rounded-2xl mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="text-3xl font-black text-white">{subjectsPassed}</div>
            <p className="text-xs font-bold text-emerald-500/80">مواد ضَمِنت نجاحها</p>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-[2.5rem] flex flex-col justify-center items-center text-center">
            <div className="p-3 bg-rose-500/20 rounded-2xl mb-3">
              <ShieldAlert className="w-6 h-6 text-rose-400" />
            </div>
            <div className="text-3xl font-black text-white">{subjectsAtRisk}</div>
            <p className="text-xs font-bold text-rose-500/80">مواد في منطقة الخطر</p>
          </motion.div>
        </div>

        {/* 🎯 The Compass Grid - شبكة المواد وتحليل النجاح */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatePresence>
            {analysis.map((subject, index) => (
              <motion.div
                key={subject.subject_name}
                variants={itemVariants}
                whileHover={{ y: -5 }}
                className={cn(
                  "bg-[#0f1423] border p-6 rounded-[2rem] transition-all relative overflow-hidden",
                  subject.status === 'DANGER' ? "border-rose-500/30 bg-rose-500/5" : "border-white/10",
                  subject.status === 'PASSED' ? "border-emerald-500/30 bg-emerald-500/5" : ""
                )}
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="text-xl font-black text-white mb-1">{subject.subject_name}</h4>
                    <span className={cn(
                      "text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider",
                      subject.status === 'PASSED' && "bg-emerald-500/20 text-emerald-400",
                      subject.status === 'SAFE' && "bg-blue-500/20 text-blue-400",
                      subject.status === 'WARNING' && "bg-amber-500/20 text-amber-400",
                      subject.status === 'DANGER' && "bg-rose-500/20 text-rose-400 animate-pulse",
                      subject.status === 'IMPOSSIBLE' && "bg-slate-700 text-slate-300"
                    )}>
                      {subject.status}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-slate-500">رصيدك الحالي</p>
                    <p className="text-lg font-black text-white">{subject.student_coursework} <span className="text-xs text-slate-500">/ {subject.coursework_max}</span></p>
                  </div>
                </div>

                {/* Progress Bar - شريط التقدم لحافة النجاح */}
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>حافة النجاح ({subject.passing_mark})</span>
                    <span>{Math.round((subject.student_coursework / subject.passing_mark) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (subject.student_coursework / subject.passing_mark) * 100)}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                      className={cn(
                        "h-full rounded-full",
                        subject.status === 'PASSED' ? "bg-emerald-500" : "bg-indigo-500"
                      )}
                    />
                  </div>
                </div>

                {/* Needed Score - ما تحتاجه في الفاينل */}
                <div className="bg-black/20 rounded-2xl p-4 flex items-center gap-4">
                  <div className={cn(
                    "p-3 rounded-xl",
                    subject.needed_for_passing <= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-indigo-500/20 text-indigo-400"
                  )}>
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">تحتاج في الاختبار النهائي</p>
                    <p className="text-lg font-black text-white">
                      {subject.needed_for_passing <= 0 ? '0 (ناجح)' : `${subject.needed_for_passing} من ${subject.exam_max}`}
                    </p>
                  </div>
                </div>

                {/* Advice Message */}
                <p className="mt-4 text-xs font-medium text-slate-500 leading-relaxed italic">
                  * {subject.message}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Footer Disclaimer */}
        <footer className="mt-12 p-8 border-t border-white/5 text-center">
           <div className="flex items-center justify-center gap-2 text-amber-500/50 mb-2">
              <Info className="w-4 h-4" />
              <p className="text-xs font-bold">هذه الحسابات تقديرية بناءً على لوائح توزيع الدرجات المعتمدة في دولة الكويت.</p>
           </div>
           <p className="text-slate-600 text-[10px]">© 2025 منصة الرفعة النموذجية - محرك التحليل التنبؤي v1.0</p>
        </footer>

      </div>
    </motion.div>
  );
}
