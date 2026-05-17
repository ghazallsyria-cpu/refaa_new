// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, Unlock, Loader2, FileSpreadsheet, CheckCircle2, AlertCircle, ChevronRight, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function GradingUnlockPage() {
  const router = useRouter();
  const [lockedSheets, setLockedSheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLockedSheets = async () => {
    setLoading(true);
    try {
      // نجلب فقط السجلات المقفلة (استخدمنا limit لتجنب الضغط إذا كانت الداتا ضخمة جداً)
      const { data, error } = await supabase
        .from('manual_grades')
        .select('grade_level, section, subject_name, academic_year, semester')
        .eq('is_locked', true)
        .limit(2000);

      if (error) throw error;

      // تجميع البيانات (Grouping) لأن كل طالب له سجل مقفل، نحن نحتاج سجل واحد لكل كشف
      if (data) {
        const uniqueSheets: any[] = [];
        const seen = new Set();
        data.forEach(row => {
          const key = `${row.academic_year}-${row.semester}-${row.grade_level}-${row.section}-${row.subject_name}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueSheets.push({ ...row, ui_key: key });
          }
        });
        
        // ترتيب أبجدي حسب المادة ثم الصف
        uniqueSheets.sort((a, b) => a.subject_name.localeCompare(b.subject_name) || a.grade_level.localeCompare(b.grade_level));
        setLockedSheets(uniqueSheets);
      }
    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', msg: 'فشل جلب الكشوفات المعتمدة.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLockedSheets();
  }, []);

  const unlockSheet = async (sheet: any) => {
    if (!window.confirm(`⚠️ تأكيد أمني:\nهل أنت متأكد من فك الاعتماد لمادة ${sheet.subject_name} (الصف ${sheet.grade_level} - شعبة ${sheet.section})؟\nسيتم إرجاع الكشف للمعلم للتعديل.`)) return;

    setActionLoadingId(sheet.ui_key);
    setStatus(null);
    try {
      // فك القفل عن كل طلاب هذه الشعبة في هذه المادة
      const { error } = await supabase
        .from('manual_grades')
        .update({ is_locked: false })
        .eq('grade_level', sheet.grade_level)
        .eq('section', sheet.section)
        .eq('subject_name', sheet.subject_name)
        .eq('academic_year', sheet.academic_year)
        .eq('semester', sheet.semester);

      if (error) throw error;

      setStatus({ type: 'success', msg: `تم فك الاعتماد بنجاح لمادة ${sheet.subject_name}! ✨` });
      
      // إزالة الكشف من الواجهة مباشرة بلمسة جمالية
      setLockedSheets(prev => prev.filter(s => s.ui_key !== sheet.ui_key));
    } catch (err: any) {
      setStatus({ type: 'error', msg: 'حدث خطأ أثناء فك الاعتماد.' });
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setStatus(null), 4000);
    }
  };

  // 🚀 فلترة ذكية لتسهيل بحث المدير في الخزنة
  const filteredSheets = lockedSheets.filter(sheet => 
    sheet.subject_name.includes(searchQuery) || 
    sheet.grade_level.includes(searchQuery) || 
    sheet.section.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-[#02040a] p-4 sm:p-6 lg:p-8 font-sans" dir="rtl">
      
      {/* زر العودة العائم */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-[#0f1423]/95 backdrop-blur-xl p-4 rounded-full border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
        <button onClick={() => router.back()} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-full transition-colors flex items-center gap-2">
          <ChevronRight className="w-5 h-5" /> العودة لغرفة العمليات
        </button>
      </div>

      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        
        {/* الترويسة الإدارية */}
        <div className="glass-panel p-8 rounded-[2.5rem] border border-rose-500/20 shadow-[0_0_40px_rgba(244,63,94,0.05)] bg-[#0f1423]/80 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-[50px] rounded-full pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-rose-500/10 p-4 rounded-2xl border border-rose-500/20">
                <ShieldAlert className="w-8 h-8 text-rose-500" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white">الخزنة المركزية (فك الاعتماد)</h1>
                <p className="text-sm font-bold text-slate-400 mt-1">مستودع جميع الكشوفات المغلقة في النظام المتاحة للفك.</p>
              </div>
            </div>
            
            {/* شريط البحث */}
            <div className="relative w-full md:w-72">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="ابحث عن مادة أو صف..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/50 border border-rose-500/20 rounded-2xl py-3 pr-11 pl-4 text-sm font-bold text-white outline-none focus:border-rose-500 transition-colors"
              />
            </div>
          </div>

          <AnimatePresence>
            {status && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
                <div className={`p-4 rounded-xl font-bold text-sm flex items-center gap-2 ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                  {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                  {status.msg}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* قائمة الكشوفات المقفلة */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12">
                <Loader2 className="w-10 h-10 text-rose-500 animate-spin mb-4" />
                <p className="text-rose-400 font-bold animate-pulse">جاري فحص وفتح الخزنة المركزية...</p>
              </div>
            ) : filteredSheets.length > 0 ? (
              <AnimatePresence>
                {filteredSheets.map((sheet) => (
                  <motion.div 
                    key={sheet.ui_key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 bg-black/40 border border-white/5 rounded-2xl hover:border-rose-500/30 transition-all group"
                  >
                    <div className="space-y-2">
                      <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                        {sheet.subject_name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
                        <span className="bg-white/5 px-2.5 py-1 rounded-md">{sheet.grade_level} - شعبة {sheet.section}</span>
                        <span className="bg-white/5 px-2.5 py-1 rounded-md">{sheet.academic_year}</span>
                        <span className="bg-indigo-500/10 text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-500/20">{sheet.semester}</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => unlockSheet(sheet)}
                      disabled={actionLoadingId === sheet.ui_key}
                      className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-rose-500 hover:text-white text-rose-400 font-black rounded-xl transition-all border border-white/5 hover:border-rose-500 flex items-center justify-center gap-2 group-hover:shadow-[0_0_15px_rgba(244,63,94,0.3)] disabled:opacity-50 shrink-0"
                    >
                      {actionLoadingId === sheet.ui_key ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Unlock className="w-4 h-4" />
                      )}
                      فك الاعتماد للطوارئ
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <div className="text-center p-12 bg-white/5 border border-white/5 rounded-2xl">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-50" />
                <p className="text-slate-400 font-bold">الخزنة فارغة. لا يوجد كشوفات مطابقة للبحث أو معتمدة حالياً.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
