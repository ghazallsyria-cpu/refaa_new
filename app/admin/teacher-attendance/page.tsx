'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { 
  Users, Search, Download, 
  Calendar, Clock, AlertCircle, ShieldAlert, ArrowLeft, RefreshCw, CheckCircle2,
  XCircle, Hourglass, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import Link from 'next/link';
import * as XLSX from 'xlsx';

export default function TeacherAttendanceReport() {
  const { userRole } = useAuth();
  
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'absent' | 'present' | 'pending' | 'all'>('all');
  
  const currentJsDay = new Date().getDay(); // الأحد = 0 في الجافاسكريبت
  const [selectedDay, setSelectedDay] = useState<number>(-1); // الافتراضي: عرض الكل
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchEverythingAndCalculate = async () => {
    setLoading(true);
    try {
      // 🚀 تقنية الـ Memory Join: جلب كل جدول بشكل منفصل تماماً لتجنب أعطال الروابط (Foreign Keys)
      const [
        { data: schedules },
        { data: periods },
        { data: subjects },
        { data: sections },
        { data: classes },
        { data: users }, // لأن معرف المعلم هو نفسه معرف المستخدم
        { data: attendance }
      ] = await Promise.all([
        supabase.from('schedule').select('*'),
        supabase.from('periods').select('*'),
        supabase.from('subjects').select('id, name'),
        supabase.from('sections').select('id, name, class_id'),
        supabase.from('classes').select('id, name'),
        supabase.from('users').select('id, full_name'),
        supabase.from('teacher_attendance_records').select('*').eq('date', format(new Date(), 'yyyy-MM-dd'))
      ]);

      console.log('Schedules found:', schedules?.length); // للتأكد من وصول البيانات

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // دمج البيانات في المتصفح بذكاء
      const processedData = (schedules || []).map((sch: any) => {
        // البحث عن التفاصيل في المصفوفات
        const subject = (subjects || []).find(s => s.id === sch.subject_id);
        const section = (sections || []).find(s => s.id === sch.section_id);
        const cls = section ? (classes || []).find(c => c.id === section.class_id) : null;
        const teacher = (users || []).find(u => u.id === sch.teacher_id);
        const periodInfo = (periods || []).find(p => p.period_number === sch.period);
        
        // التحقق من الحضور
        const hasAttended = (attendance || []).some(a => a.teacher_id === sch.teacher_id && a.period_number === sch.period);

        let status = 'pending';

        if (hasAttended) {
          status = 'present';
        } else if (periodInfo && periodInfo.end_time) {
          const [endH, endM] = periodInfo.end_time.split(':').map(Number);
          const periodEndMinutes = endH * 60 + endM;

          // إذا تجاوزنا وقت الحصة، نعتبره غائباً (لأغراض المراقبة اليومية)
          if (currentMinutes > periodEndMinutes) {
            status = 'absent';
          }
        }

        return {
          id: sch.id,
          teacher_id: sch.teacher_id,
          teacher_name: teacher?.full_name || 'معلم غير محدد',
          day_of_week: sch.day_of_week,
          period: sch.period,
          start_time: periodInfo?.start_time || sch.start_time,
          end_time: periodInfo?.end_time || sch.end_time,
          class_name: cls?.name || 'صف غير محدد',
          section_name: section?.name || 'شعبة',
          subject_name: subject?.name || 'مادة غير محددة',
          current_status: status
        };
      });

      setScheduleData(processedData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching and calculating data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'management') {
      fetchEverythingAndCalculate();
      const interval = setInterval(fetchEverythingAndCalculate, 60000);
      return () => clearInterval(interval);
    }
  }, [userRole]);

  // الفلترة
  const filteredData = scheduleData.filter(record => {
    // التطابق مع اليوم
    const isMatchingDay = selectedDay === -1 || String(record.day_of_week) === String(selectedDay);
    
    // البحث
    const matchesSearch = (record.teacher_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (record.class_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (record.subject_name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === 'all' || record.current_status === activeTab;

    return isMatchingDay && matchesSearch && matchesTab;
  }).sort((a, b) => a.period - b.period);

  const absences = filteredData.filter(r => r.current_status === 'absent');
  const presents = filteredData.filter(r => r.current_status === 'present');
  const pendings = filteredData.filter(r => r.current_status === 'pending');

  const exportToExcel = () => {
    if (filteredData.length === 0) return alert('لا توجد بيانات للتصدير');

    const dataToExport = filteredData.map(record => ({
      'المعلم': record.teacher_name,
      'اليوم': `اليوم ${record.day_of_week}`,
      'الحصة': `الحصة ${record.period}`,
      'الصف والشعبة': `${record.class_name} - ${record.section_name}`,
      'المادة': record.subject_name,
      'الحالة': record.current_status === 'absent' ? 'غياب ❌' : 
                record.current_status === 'present' ? 'حاضر ✅' : 'قيد الانتظار ⏳'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "تقرير المراقبة");
    XLSX.writeFile(workbook, `المراقبة_الآلية_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  if (userRole !== 'admin' && userRole !== 'management') return null;

  // 🚀 أزرار الأيام مع إظهار أرقامها في القاعدة لتعرف كيف تم حفظها!
  const daysOfWeek = [
    { id: -1, name: 'الكل (كامل الأسبوع)' },
    { id: 0, name: 'الأحد (0)' }, { id: 1, name: 'الإثنين (1)' }, 
    { id: 2, name: 'الثلاثاء (2)' }, { id: 3, name: 'الأربعاء (3)' }, 
    { id: 4, name: 'الخميس (4)' }, { id: 5, name: 'الجمعة (5)' }
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-cairo pt-8" dir="rtl">
      
      <div>
        <Link href="/dashboard/admin" className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-slate-100 transition-all w-fit group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> العودة للوحة الإدارة
        </Link>
      </div>

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-indigo-900 p-8 sm:p-12 text-white shadow-2xl shadow-indigo-900/20 border border-slate-700">
        <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-black uppercase tracking-widest mb-4 shadow-inner">
              <ShieldAlert className="w-4 h-4 text-emerald-400" /> المحرك البرمجي المستقل
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-3">رادار المتابعة الفوري</h1>
            <p className="text-indigo-200 font-bold text-base max-w-2xl leading-relaxed">
              هذه الشاشة تسحب البيانات الخام وتدمجها مباشرة في المتصفح لتجاوز أي مشاكل في الروابط.
            </p>
          </div>
          
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <button onClick={exportToExcel} className="flex items-center justify-center gap-2 bg-white text-indigo-900 px-6 py-3 rounded-xl font-black hover:bg-indigo-50 transition-colors shadow-lg active:scale-95 w-full">
              <Download className="w-5 h-5" /> تصدير التقرير
            </button>
            <button onClick={fetchEverythingAndCalculate} className="flex items-center justify-center gap-2 bg-indigo-500/50 hover:bg-indigo-500/80 text-white px-6 py-3 rounded-xl font-black transition-colors border border-indigo-400/50 active:scale-95 w-full">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> تحديث الآن
            </button>
          </div>
        </div>
      </div>

      {/* أزرار اختيار الأيام */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-2 justify-center">
        {daysOfWeek.map(day => (
          <button 
            key={day.id}
            onClick={() => setSelectedDay(day.id)}
            className={`px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all flex-1 sm:flex-none ${
              selectedDay === day.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {day.name} {day.id === currentJsDay && ' (اليوم)'}
          </button>
        ))}
      </div>

      {/* Tabs & Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button onClick={() => setActiveTab('all')} className={`p-4 sm:p-6 rounded-[2rem] border transition-all text-center flex flex-col items-center gap-2 ${activeTab === 'all' ? 'bg-slate-900 border-slate-800 text-white shadow-xl shadow-slate-900/20 scale-[1.02]' : 'bg-white border-slate-100 hover:border-slate-300 text-slate-600'}`}>
           <Calendar className={`w-8 h-8 ${activeTab === 'all' ? 'text-indigo-400' : 'text-slate-400'}`} />
           <span className="font-black text-2xl">{filteredData.length}</span>
           <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">إجمالي الحصص</span>
        </button>
        <button onClick={() => setActiveTab('absent')} className={`p-4 sm:p-6 rounded-[2rem] border transition-all text-center flex flex-col items-center gap-2 ${activeTab === 'absent' ? 'bg-rose-500 border-rose-600 text-white shadow-xl shadow-rose-500/30 scale-[1.02]' : 'bg-rose-50 border-rose-100 hover:border-rose-300 text-rose-700'}`}>
           <XCircle className={`w-8 h-8 ${activeTab === 'absent' ? 'text-white' : 'text-rose-500'}`} />
           <span className="font-black text-2xl">{absences.length}</span>
           <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">غياب / فائتة</span>
        </button>
        <button onClick={() => setActiveTab('present')} className={`p-4 sm:p-6 rounded-[2rem] border transition-all text-center flex flex-col items-center gap-2 ${activeTab === 'present' ? 'bg-emerald-500 border-emerald-600 text-white shadow-xl shadow-emerald-500/30 scale-[1.02]' : 'bg-emerald-50 border-emerald-100 hover:border-emerald-300 text-emerald-700'}`}>
           <CheckCircle2 className={`w-8 h-8 ${activeTab === 'present' ? 'text-white' : 'text-emerald-500'}`} />
           <span className="font-black text-2xl">{presents.length}</span>
           <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">حاضر</span>
        </button>
        <button onClick={() => setActiveTab('pending')} className={`p-4 sm:p-6 rounded-[2rem] border transition-all text-center flex flex-col items-center gap-2 ${activeTab === 'pending' ? 'bg-amber-500 border-amber-600 text-white shadow-xl shadow-amber-500/30 scale-[1.02]' : 'bg-amber-50 border-amber-100 hover:border-amber-300 text-amber-700'}`}>
           <Hourglass className={`w-8 h-8 ${activeTab === 'pending' ? 'text-white' : 'text-amber-500'}`} />
           <span className="font-black text-2xl">{pendings.length}</span>
           <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">قيد الانتظار</span>
        </button>
      </div>

      {/* The Report List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-bold text-slate-500">جاري تجميع البيانات الخام...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200 shadow-sm flex flex-col items-center">
            <div className="h-20 w-20 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-6">
              <BookOpen className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">لا توجد حصص في هذا اليوم</h3>
            <p className="font-bold text-slate-500">اضغط على "الكل (كامل الأسبوع)" في الأزرار العلوية لرؤية الجدول.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredData.map((record, index) => {
                const isAbsent = record.current_status === 'absent';
                const isPresent = record.current_status === 'present';
                
                return (
                  <motion.div 
                    key={record.id || index}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: index * 0.02 }}
                    className={`bg-white rounded-[2rem] p-6 border-2 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden flex flex-col ${
                      isAbsent ? 'border-rose-100 hover:border-rose-300' : 
                      isPresent ? 'border-emerald-100 hover:border-emerald-300' : 
                      'border-amber-100 hover:border-amber-300'
                    }`}
                  >
                    <div className={`absolute top-0 left-0 w-24 h-24 rounded-br-full -mt-2 -ml-2 transition-transform group-hover:scale-110 z-0 ${
                      isAbsent ? 'bg-rose-50' : isPresent ? 'bg-emerald-50' : 'bg-amber-50'
                    }`}></div>
                    
                    <div className="flex items-start justify-between relative z-10 mb-6">
                      <div className="flex items-center gap-4">
                        <div className={`h-14 w-14 rounded-2xl font-black text-xl flex items-center justify-center shadow-inner border shrink-0 ${
                          isAbsent ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                          isPresent ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                          'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {record.teacher_name?.charAt(0) || 'م'}
                        </div>
                        <div className="max-w-[150px] sm:max-w-[200px]">
                          <h3 className="font-black text-slate-900 text-lg truncate" title={record.teacher_name}>{record.teacher_name}</h3>
                          <div className={`inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isAbsent ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                            isPresent ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                            'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                            {isAbsent ? <><AlertCircle className="w-3 h-3" /> غياب / لم يتواجد</> : 
                             isPresent ? <><CheckCircle2 className="w-3 h-3" /> حاضر بالمنصة</> : 
                             <><Hourglass className="w-3 h-3" /> حصة قادمة / لم تبدأ</>}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 relative z-10 mb-6 mt-auto">
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">الحصة</p>
                        <p className={`font-black ${isAbsent ? 'text-rose-600' : isPresent ? 'text-emerald-600' : 'text-amber-600'}`}>الحصة {record.period}</p>
                        <p className="text-[9px] text-slate-400 mt-1 font-bold truncate" dir="ltr">{record.start_time?.substring(0,5) || '?'} - {record.end_time?.substring(0,5) || '?'}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center flex flex-col justify-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">المادة</p>
                        <p className="font-black text-slate-700 truncate text-sm" title={record.subject_name}>{record.subject_name}</p>
                      </div>
                    </div>

                    <div className="relative z-10 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-bold text-slate-600 bg-slate-50/50 -mx-6 -mb-6 px-6 py-4 rounded-b-[2rem]">
                      <span className="flex items-center gap-2 truncate">
                        <Users className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate">{record.class_name} - {record.section_name}</span>
                      </span>
                      <span className="text-[10px] font-bold bg-white border border-slate-200 px-2 py-1 rounded-md text-slate-400 shrink-0">
                        اليوم: {record.day_of_week}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

    </motion.div>
  );
}
