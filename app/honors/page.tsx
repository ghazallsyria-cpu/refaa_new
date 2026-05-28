'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { Crown, Medal, Award, Sparkles, Star } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function HonorsPage() {
  const [activeTab, setActiveTab] = useState('العاشر');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [customDesigns, setCustomDesigns] = useState<Record<string, string>>({}); // 🚀 جلب البوسترات
  
  const grades = ['العاشر', 'الحادي عشر علمي', 'الحادي عشر أدبي', 'الثاني عشر علمي', 'الثاني عشر أدبي'];
  const toArabicDigits = (num: any) => String(num).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // 1. جلب الإعدادات والبوسترات المخصصة
      const { data: settingsData } = await supabase.from('platform_settings').select('honors_custom_designs').limit(1).maybeSingle();
      if (settingsData) setCustomDesigns(settingsData.honors_custom_designs || {});

      // 2. جلب الطلاب المرصودين ذكياً
      const { data, error } = await supabase.from('top_students').select('*').eq('grade_level', activeTab).order('percentage', { ascending: false });
      if (!error) setStudents(data || []);
      
      setLoading(false);
    };
    fetchData();
  }, [activeTab]);

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  // التحقق مما إذا كان هناك بوستر مخصص لهذا الصف
  const currentCustomPoster = customDesigns[activeTab];

  return (
    <div className="min-h-[100dvh] bg-[#f8fafc] text-slate-800 font-sans overflow-x-hidden relative pb-20 pt-6 sm:pt-10" dir="rtl">
      
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[80vw] h-[80vw] bg-blue-400/10 blur-[120px] rounded-full mix-blend-multiply"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[80vw] h-[80vw] bg-indigo-400/10 blur-[120px] rounded-full mix-blend-multiply"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 mb-4 shadow-sm">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-black text-blue-600 tracking-wider">لوحة التميز والنجاح</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 mb-4 tracking-tight">لوحة الشرف</h1>
          <p className="text-slate-500 font-bold text-sm sm:text-base max-w-lg mx-auto">كوكبة من فرسان مدرسة الرفعة، سطروا أسماءهم بماء الذهب في سجلات التفوق.</p>
        </motion.div>

        <div className="w-full overflow-hidden mb-12 relative">
          <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-4 snap-x snap-mandatory px-2">
            {grades.map((grade) => (
              <button key={grade} onClick={() => setActiveTab(grade)} className={`snap-center shrink-0 px-6 py-3 rounded-2xl font-black text-sm transition-all duration-300 ${activeTab === grade ? 'bg-blue-600 text-white shadow-[0_8px_20px_-6px_rgba(37,99,235,0.5)] scale-105' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200 shadow-sm'}`}>
                {grade}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="mt-4 font-bold text-slate-400 animate-pulse">جاري تحضير منصة التتويج...</p>
          </div>
        ) : currentCustomPoster ? (
          
          /* 🖼️ عرض البوستر المخصص (كامل وبدون قص) */
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="w-full flex justify-center">
            <div className="w-full max-w-4xl bg-white/50 backdrop-blur-md p-2 rounded-[2rem] shadow-xl border border-white/60">
              <img 
                src={currentCustomPoster} 
                alt={`لوحة شرف متفوقي ${activeTab}`} 
                className="w-full h-auto rounded-[1.5rem] object-contain shadow-sm"
              />
            </div>
          </motion.div>

        ) : students.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20 bg-white/50 backdrop-blur-md rounded-[2rem] border border-slate-200 shadow-sm">
            <div className="text-6xl mb-4 opacity-50">🏆</div>
            <h2 className="text-2xl font-black text-slate-700">لم يتم إعلان نتائج {activeTab} بعد</h2>
            <p className="text-slate-400 font-bold mt-2">بانتظار اعتماد الإدارة لأسماء المتفوقين.</p>
          </motion.div>
        ) : (
          
          /* 👑 عرض منصة التتويج الذكية (في حال لم يرفع بوستر) */
          <motion.div variants={containerVariants} initial="hidden" animate="show">
            <div className="grid grid-cols-2 md:flex md:flex-row justify-center items-end gap-4 md:gap-8 mb-16 md:mb-24">
              
              {/* 🥇 المركز الأول */}
              {students[0] && (
                <motion.div variants={itemVariants} className="col-span-2 order-1 md:order-2 flex justify-center z-20">
                  <div className="relative w-full max-w-[280px] md:max-w-[320px] transform md:-translate-y-8">
                    <div className="absolute inset-0 bg-gradient-to-b from-yellow-300 to-amber-500 blur-xl opacity-30 rounded-[3rem]"></div>
                    <div className="bg-white/80 backdrop-blur-xl border border-white shadow-2xl rounded-[2.5rem] p-6 sm:p-8 flex flex-col items-center text-center relative overflow-hidden">
                      <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500"></div>
                      <div className="relative w-28 h-28 sm:w-32 sm:h-32 mb-5">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 animate-spin-slow" style={{ padding: '4px' }}>
                          <div className="w-full h-full bg-white rounded-full overflow-hidden flex items-center justify-center">
                            {students[0].image_url ? <img src={students[0].image_url} alt="" className="w-full h-full object-cover" /> : <Crown className="w-12 h-12 text-amber-400" />}
                          </div>
                        </div>
                        <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-gradient-to-br from-yellow-300 to-amber-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg"><span className="font-black text-white text-xl">١</span></div>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-800 leading-tight mb-2 whitespace-normal break-words">{students[0].student_name}</h3>
                      <p className="text-amber-500 font-bold text-sm mb-4">المركز الأول</p>
                      <div className="bg-amber-50 border border-amber-200 text-amber-700 px-6 py-2 rounded-2xl text-xl font-black shadow-inner">{toArabicDigits(students[0].percentage)}%</div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 🥈 المركز الثاني */}
              {students[1] && (
                <motion.div variants={itemVariants} className="col-span-1 order-2 md:order-1 flex justify-center">
                  <div className="relative w-full max-w-[220px] md:max-w-[260px]">
                    <div className="bg-white/70 backdrop-blur-xl border border-white shadow-xl rounded-[2rem] p-5 sm:p-6 flex flex-col items-center text-center">
                      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-slate-300 to-slate-400"></div>
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-4">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-200 to-slate-400" style={{ padding: '3px' }}>
                          <div className="w-full h-full bg-white rounded-full overflow-hidden flex items-center justify-center">
                            {students[1].image_url ? <img src={students[1].image_url} alt="" className="w-full h-full object-cover" /> : <Medal className="w-10 h-10 text-slate-400" />}
                          </div>
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-9 h-9 bg-gradient-to-br from-slate-400 to-slate-500 rounded-full flex items-center justify-center border-[3px] border-white shadow-md"><span className="font-black text-white text-base">٢</span></div>
                      </div>
                      <h3 className="text-sm sm:text-lg font-black text-slate-700 leading-tight mb-1 whitespace-normal break-words">{students[1].student_name}</h3>
                      <p className="text-slate-400 font-bold text-xs mb-3">المركز الثاني</p>
                      <div className="bg-slate-50 border border-slate-200 text-slate-600 px-4 py-1.5 rounded-xl text-base sm:text-lg font-black">{toArabicDigits(students[1].percentage)}%</div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 🥉 المركز الثالث */}
              {students[2] && (
                <motion.div variants={itemVariants} className="col-span-1 order-3 md:order-3 flex justify-center">
                  <div className="relative w-full max-w-[220px] md:max-w-[260px]">
                    <div className="bg-white/70 backdrop-blur-xl border border-white shadow-xl rounded-[2rem] p-5 sm:p-6 flex flex-col items-center text-center">
                      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-orange-300 to-orange-500"></div>
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-4">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-300 to-orange-500" style={{ padding: '3px' }}>
                          <div className="w-full h-full bg-white rounded-full overflow-hidden flex items-center justify-center">
                            {students[2].image_url ? <img src={students[2].image_url} alt="" className="w-full h-full object-cover" /> : <Award className="w-10 h-10 text-orange-400" />}
                          </div>
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center border-[3px] border-white shadow-md"><span className="font-black text-white text-base">٣</span></div>
                      </div>
                      <h3 className="text-sm sm:text-lg font-black text-slate-700 leading-tight mb-1 whitespace-normal break-words">{students[2].student_name}</h3>
                      <p className="text-orange-500/80 font-bold text-xs mb-3">المركز الثالث</p>
                      <div className="bg-orange-50 border border-orange-100 text-orange-600 px-4 py-1.5 rounded-xl text-base sm:text-lg font-black">{toArabicDigits(students[2].percentage)}%</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* 📜 باقي الطلاب */}
            <div className="max-w-3xl mx-auto space-y-3 px-2 sm:px-0">
              {students.slice(3).map((student, index) => (
                <motion.div variants={itemVariants} key={student.id} className="group flex items-center justify-between bg-white/60 backdrop-blur-md border border-white shadow-sm p-3 sm:p-4 rounded-2xl hover:bg-white hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 flex items-center justify-center bg-slate-100 text-slate-500 font-black rounded-xl border border-slate-200 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">{toArabicDigits(index + 4)}</div>
                    {student.image_url ? <img src={student.image_url} alt="" className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full object-cover border-2 border-white shadow-sm" /> : <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center border-2 border-white"><Star className="w-5 h-5 text-slate-400" /></div>}
                    <h4 className="text-sm sm:text-lg font-black text-slate-700 leading-tight">{student.student_name}</h4>
                  </div>
                  <div className="shrink-0 text-blue-600 font-black text-base sm:text-xl bg-blue-50/50 px-3 py-1 rounded-lg">{toArabicDigits(student.percentage)}%</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .animate-spin-slow { animation: spin 8s linear infinite; }
      `}} />
    </div>
  );
}
