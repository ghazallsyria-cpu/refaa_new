// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, Unlock, Loader2, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GradingUnlockPage() {
  const [lockedSheets, setLockedSheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const fetchLockedSheets = async () => {
    setLoading(true);
    try {
      // نجلب فقط السجلات المقفلة
      const { data, error } = await supabase
        .from('manual_grades')
        .select('grade_level, section, subject_name, academic_year, semester')
        .eq('is_locked', true);

      if (error) throw error;

      // تجميع البيانات (Grouping) لأن كل طالب له سجل مقفل، نحن نحتاج سجل واحد لكل كشف
      if (data) {
        const uniqueSheets = [];
        const seen = new Set();
        data.forEach(row => {
          const key = `${row.academic_year}-${row.semester}-${row.grade_level}-${row.section}-${row.subject_name}`;
          if (!seen.has(key)) {
            seen.add(key);
            // نصنع ID وهمي للتحكم بالواجهة
            uniqueSheets.push({ ...row, ui_key: key });
          }
        });
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
    if (!window.confirm(`هل أنت متأكد من فك الاعتماد لمادة ${sheet.subject_name} (${sheet.grade_level})؟\nسيتمكن المعلم من تعديل الدرجات مجدداً.`)) return;

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
      
      // إزالة الكشف من الواجهة مباشرة
      setLockedSheets(prev => prev.filter(s => s.ui_key !== sheet.ui_key));
    } catch (err: any) {
      setStatus({ type: 'error', msg: 'حدث خطأ أثناء فك الاعتماد.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6 lg:p-8 font-sans" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* الترويسة الإدارية */}
        <div className="glass-panel p-8 rounded-[2.5rem] border border-rose-500/20 shadow-[0_0_40px_rgba(244,63,94,0.05)] bg-[#0f1423]/80 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-[50px] rounded-full pointer-events-none"></div>
          
          <div className="flex items-center gap-4 border-b border-white/5 pb-6 mb-6">
            <div className="bg-rose-500/10 p-4 rounded-2xl border border-rose-500/20">
              <ShieldAlert className="w-8 h-8 text-rose-500" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">إدارة الكشوفات المعتمدة (فك القفل)</h1>
              <p className="text-sm font-bold text-slate-400 mt-1">غرفة التحكم الخاصة بمدير المدرسة لمراجعة الكشوفات المغلقة.</p>
            </div>
          </div>

          {status && (
            <div className={`p-4 rounded-xl font-bold text-sm flex items-center gap-2 mb-6 ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
              {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              {status.msg}
            </div>
          )}

          {/* قائمة الكشوفات المقفلة */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12">
                <Loader2 className="w-10 h-10 text-rose-500 animate-spin mb-4" />
                <p className="text-rose-400 font-bold animate-pulse">جاري فحص الخزنة...</p>
              </div>
            ) : lockedSheets.length > 0 ? (
              <AnimatePresence>
                {lockedSheets.map((sheet) => (
                  <motion.div 
                    key={sheet.ui_key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
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
                        <span className="bg-indigo-500/10 text-indigo-300 px-2.5 py-1 rounded-md">{sheet.semester}</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => unlockSheet(sheet)}
                      disabled={actionLoadingId === sheet.ui_key}
                      className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-rose-500 hover:text-white text-rose-400 font-black rounded-xl transition-all border border-white/5 hover:border-rose-500 flex items-center justify-center gap-2 group-hover:shadow-[0_0_15px_rgba(244,63,94,0.3)] disabled:opacity-50"
                    >
                      {actionLoadingId === sheet.ui_key ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Unlock className="w-4 h-4" />
                      )}
                      فك الاعتماد (إتاحة التعديل)
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <div className="text-center p-12 bg-white/5 border border-white/5 rounded-2xl">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-50" />
                <p className="text-slate-400 font-bold">لا يوجد أي كشوفات معتمدة أو مقفلة حالياً.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
