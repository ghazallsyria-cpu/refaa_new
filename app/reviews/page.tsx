// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Layers, Search, FileText, ArrowLeftRight, 
  Sparkles, Loader2, Calendar, Printer, GraduationCap 
} from 'lucide-react';

const STAGE_MAP: Record<string, string> = {
  'all': 'كافة المراحل',
  '6': 'الصف السادس',
  '7': 'الصف السابع',
  '8': 'الصف الثامن',
  '9': 'الصف التاسع',
  '10': 'الصف العاشر',
  '11_scientific': '11 علمي',
  '11_literary': '11 أدبي',
  '12_scientific': '12 علمي',
  '12_literary': '12 أدبي',
};

export default function ReviewsLibraryPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState('all');

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('review_documents')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDocuments(data || []);
      } catch (err) {
        console.error('Error fetching documents:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  // 🔍 تصفية المذكرات حركياً بناءً على البحث والفلتر
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doc.subject_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = selectedStage === 'all' || doc.academic_stage === selectedStage;
    return matchesSearch && matchesStage;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#02040a]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
          <p className="text-amber-400 font-bold tracking-widest animate-pulse">جاري فتح مكتبة المراجعات الوزارية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6 lg:p-8 font-sans" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* 🔝 الترويسة الرئيسية للمكتبة */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/5 p-6 sm:p-8 rounded-[2rem] border border-white/10 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shrink-0 shadow-inner">
              <GraduationCap className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                خزنة المراجعات والكبسولات الوزارية <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm font-bold mt-1">تصفّح وحمّل بنوك الأسئلة المشرحة والمصفاة لجميع المراحل الدراسية.</p>
            </div>
          </div>
        </div>

        {/* ⚙️ أدوات التصفية والبحث السريع */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#0f1423]/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
          {/* شريط البحث المباشر */}
          <div className="relative md:col-span-2">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="ابحث باسم المذكرّة أو المادة الدراسية (مثال: فيزياء)..."
              className="w-full bg-[#02040a]/60 border border-white/5 rounded-xl pr-11 pl-4 py-3 text-white text-sm outline-none focus:border-amber-500 transition-colors shadow-inner placeholder:text-slate-500"
            />
          </div>

          {/* فلتر المراحل الدراسية */}
          <div className="relative">
            <select
              value={selectedStage}
              onChange={e => setSelectedStage(e.target.value)}
              className="w-full bg-[#02040a]/60 border border-white/5 rounded-xl px-4 py-3 text-white text-sm outline-none cursor-pointer focus:border-amber-500 transition-colors shadow-inner"
            >
              {Object.entries(STAGE_MAP).map(([key, val]) => (
                <option key={key} value={key} className="bg-[#0f1423] text-white">{val}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 📋 شبكة عرض بطاقات المراجعات المتوفرة */}
        <AnimatePresence mode="popLayout">
          {filteredDocuments.length > 0 ? (
            <motion.div 
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredDocuments.map((doc, idx) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => router.push(`/reviews/${doc.id}`)}
                  className="glass-panel p-6 rounded-[2rem] border border-white/5 hover:border-amber-500/30 bg-[#0f1423]/40 flex flex-col justify-between cursor-pointer group relative overflow-hidden shadow-xl"
                >
                  <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/5 blur-[40px] rounded-full pointer-events-none group-hover:bg-amber-500/10 transition-colors"></div>
                  
                  <div className="space-y-4 relative z-10">
                    {/* شارات الفهرسة والوسوم */}
                    <div className="flex justify-between items-center">
                      <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-black text-[10px] rounded-lg shadow-sm flex items-center gap-1.5">
                        <Layers className="w-3 h-3" /> {STAGE_MAP[doc.academic_stage] || doc.academic_stage}
                      </span>
                      <span className="px-3 py-1 bg-white/5 border border-white/10 text-slate-400 font-bold text-[10px] rounded-lg shadow-inner flex items-center gap-1.5">
                        <BookOpen className="w-3 h-3 text-indigo-400" /> {doc.subject_name}
                      </span>
                    </div>

                    {/* عنوان المذكرّة الوزارية */}
                    <h3 className="text-lg font-black text-white group-hover:text-amber-300 transition-colors leading-snug pt-2">
                      {doc.title}
                    </h3>
                  </div>

                  {/* بيانات وتاريخ الإنشاء + زر فتح */}
                  <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center relative z-10 text-slate-500 group-hover:text-slate-400 transition-colors">
                    <span className="text-[10px] font-bold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(doc.created_at).toLocaleDateString('ar-SA')}
                    </span>
                    <span className="text-xs font-black text-amber-400 group-hover:underline flex items-center gap-1">
                      فتح للطباعة <Printer className="w-3.5 h-3.5 text-amber-400" />
                    </span>
                  </div>

                </motion.div>
              ))}
            </motion.div>
          ) : (
            /* 📭 حالة عدم وجود مذكرات تطابق البحث */
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-16 text-center bg-[#0f1423]/20 rounded-[2rem] border border-white/5"
            >
              <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10">
                <FileText className="h-8 w-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">لا توجد مذكرات مراجعة متوفرة حالياً</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">لم يتم حقن أي كبسولة مراجعة تطابق خيارات التصفية الحالية لهذه المرحلة الدراسية بعد.</p>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
