'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { 
  Users, AlertTriangle, Search, Filter, Download, 
  Calendar, Clock, AlertCircle, ShieldAlert, ArrowLeft, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import Link from 'next/link';
import * as XLSX from 'xlsx';

export default function TeacherAttendanceReport() {
  const { user, userRole } = useAuth();
  
  const [absences, setAbsences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchAbsences = async () => {
    setLoading(true);
    try {
      // 🚀 جلب البيانات مباشرة من العرض الذكي (VIEW) الذي بنيناه في SQL
      const { data, error } = await supabase
        .from('admin_teacher_absences')
        .select('*')
        .order('period', { ascending: true });

      if (error) throw error;
      setAbsences(data || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching teacher absences:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'management') {
      fetchAbsences();
      // تحديث تلقائي كل دقيقة ليكون التقرير فورياً
      const interval = setInterval(fetchAbsences, 60000);
      return () => clearInterval(interval);
    }
  }, [userRole]);

  // فلترة النتائج حسب البحث
  const filteredAbsences = absences.filter(record => 
    record.teacher_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.class_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.subject_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToExcel = () => {
    if (filteredAbsences.length === 0) {
      alert('لا توجد بيانات للتصدير');
      return;
    }

    const dataToExport = filteredAbsences.map(record => ({
      'المعلم': record.teacher_name,
      'الحصة المتغيب عنها': `الحصة ${record.period}`,
      'الصف والشعبة': `${record.class_name} - ${record.section_name}`,
      'المادة': record.subject_name,
      'التاريخ': format(new Date(record.check_date), 'yyyy/MM/dd'),
      'الحالة': 'غياب غير مبرر ❌'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "تقرير غياب المعلمين");
    
    const fileName = `غياب_المعلمين_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  if (userRole !== 'admin' && userRole !== 'management') {
    return (
      <div className="flex h-[80vh] items-center justify-center p-6">
        <div className="bg-rose-50 text-rose-600 p-8 rounded-3xl text-center border-2 border-rose-200 shadow-xl max-w-lg">
          <ShieldAlert className="w-16 h-16 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-black mb-2">صلاحيات غير كافية</h2>
          <p className="font-bold">هذه الصفحة مخصصة للإدارة العليا فقط لمراقبة الدوام.</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-cairo pt-8" dir="rtl"
    >
      {/* 🚀 Navigation Back */}
      <div>
        <Link href="/dashboard/admin" className="flex items-center gap-2 text-slate-500 hover:text-rose-600 font-bold bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-slate-100 transition-all w-fit group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> العودة للوحة الإدارة
        </Link>
      </div>

      {/* 🚀 Hero Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-rose-600 to-red-700 p-8 sm:p-12 text-white shadow-2xl shadow-rose-200 border-2 border-rose-400/50">
        <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/20 blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-black uppercase tracking-widest mb-4 shadow-inner">
              <ShieldAlert className="w-4 h-4 text-yellow-300" />
              <span>الرقابة الآلية الذكية</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-3">تقرير غياب المعلمين الفوري</h1>
            <p className="text-rose-100 font-bold text-lg max-w-2xl leading-relaxed">
              يقوم النظام بمقارنة جدول الحصص مع نشاط المعلمين في المنصة. إذا انتهت حصة ولم يتواجد المعلم، يظهر هنا فوراً!
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <div className="bg-black/20 backdrop-blur-sm px-6 py-4 rounded-2xl border border-white/10 text-center flex-1 sm:flex-none">
              <p className="text-[10px] text-rose-200 uppercase tracking-widest font-black mb-1">حصص لم تُغطى اليوم</p>
              <p className="text-3xl font-black text-white">{absences.length}</p>
            </div>
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <button onClick={exportToExcel} className="flex items-center justify-center gap-2 bg-white text-rose-700 px-6 py-3 rounded-xl font-black hover:bg-rose-50 transition-colors shadow-lg active:scale-95 w-full">
                <Download className="w-5 h-5" /> تصدير التقرير
              </button>
              <button onClick={fetchAbsences} className="flex items-center justify-center gap-2 bg-rose-500/50 hover:bg-rose-500/80 text-white px-6 py-3 rounded-xl font-black transition-colors border border-rose-400/50 active:scale-95 w-full">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> تحديث الآن
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 Filters Bar */}
      <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full group">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-rose-600 transition-colors" />
          <input 
            type="text" 
            className="w-full rounded-xl border-0 py-3.5 pr-12 pl-5 text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500 font-bold transition-all" 
            placeholder="البحث باسم المعلم، الصف، المادة..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-slate-500 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 shrink-0">
          <Clock className="w-4 h-4 text-slate-400" />
          آخر تحديث: {format(lastUpdated, 'hh:mm a', { locale: arSA })}
        </div>
      </div>

      {/* 🚀 The Report List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="h-12 w-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-bold text-slate-500">جاري فحص السجلات وجدول الحصص...</p>
          </div>
        ) : filteredAbsences.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-20 text-center bg-gradient-to-b from-emerald-50 to-white rounded-[2.5rem] border border-emerald-100 shadow-sm">
            <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-black text-emerald-800 mb-2">ممتاز! لا يوجد غياب</h3>
            <p className="font-bold text-emerald-600/70 max-w-md mx-auto">
              جميع المعلمين تواجدوا في حصصهم المجدولة اليوم وتم تغطية جميع الفصول بنجاح.
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredAbsences.map((record, index) => (
                <motion.div 
                  key={`${record.teacher_id}-${record.period}`}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-[2rem] p-6 border-2 border-rose-100 shadow-sm hover:shadow-xl hover:border-rose-300 transition-all group relative overflow-hidden flex flex-col"
                >
                  <div className="absolute top-0 left-0 w-24 h-24 bg-rose-50 rounded-br-full -mt-2 -ml-2 transition-transform group-hover:scale-110 z-0"></div>
                  
                  <div className="flex items-start justify-between relative z-10 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-rose-50 text-rose-600 font-black text-xl flex items-center justify-center shadow-inner border border-rose-100 shrink-0">
                        {record.teacher_name?.charAt(0) || 'م'}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-lg group-hover:text-rose-700 transition-colors line-clamp-1">{record.teacher_name}</h3>
                        <div className="inline-flex items-center gap-1.5 mt-1 bg-slate-50 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 border border-slate-100">
                          <AlertCircle className="w-3 h-3 text-rose-500" /> لم يتواجد بالمنصة
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 relative z-10 mb-6 mt-auto">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">تغيب عن</p>
                      <p className="font-black text-rose-600">الحصة {record.period}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">المادة</p>
                      <p className="font-black text-slate-700 truncate">{record.subject_name}</p>
                    </div>
                  </div>

                  <div className="relative z-10 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-bold text-slate-600 bg-slate-50/50 -mx-6 -mb-6 px-6 py-4 rounded-b-[2rem]">
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      {record.class_name} - {record.section_name}
                    </span>
                    <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-1 rounded-lg">
                      اليوم
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

    </motion.div>
  );
}
