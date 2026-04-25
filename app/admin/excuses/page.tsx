/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useAdminExcuses } from '@/hooks/useAdminExcuses';
import { supabase } from '@/lib/supabase'; // 🚀 استيراد قاعدة البيانات للاستعلام
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, CheckCircle2, XCircle, Clock, 
  Calendar, FileText, Image as ImageIcon, User, 
  Loader2, Search, Filter, AlertTriangle, CheckSquare
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

export default function AdminExcusesPage() {
  const { user, isChecking, authRole, userRole } = useAuth() as any;
  const { excuses, loading, fetchExcuses, approveExcuse, rejectExcuse } = useAdminExcuses();
  
  // 🚀 إضافة تبويب الاستعلام 'inquiry'
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'inquiry'>('pending');
  const [selectedExcuse, setSelectedExcuse] = useState<any>(null);
  const [selectedDatesToApprove, setSelectedDatesToApprove] = useState<string[]>([]);
  const [rejectNote, setRejectNote] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  // 🚀 متغيرات محرك الاستعلام الذكي
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{studentName: string, records: any[]}[] | null>(null);

  useEffect(() => {
    if (!isChecking && activeTab !== 'inquiry') {
      fetchExcuses(activeTab);
    }
  }, [activeTab, isChecking, fetchExcuses]);

  const openExcuseModal = (excuse: any) => {
    setSelectedExcuse(excuse);
    setRejectNote('');
    const dates = excuse.absent_dates && excuse.absent_dates.length > 0 
       ? excuse.absent_dates 
       : (excuse.excuse_date ? [excuse.excuse_date] : []);
    setSelectedDatesToApprove(dates);
  };

  const handleToggleDate = (date: string) => {
    setSelectedDatesToApprove(prev => 
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    );
  };

  const handleApprove = async (excuse: any) => {
    if (selectedDatesToApprove.length === 0) {
      alert('يرجى تحديد تاريخ واحد على الأقل ليتم اعتماده.'); return;
    }
    if (!confirm(`هل أنت متأكد من اعتماد العذر لـ (${selectedDatesToApprove.length}) أيام؟ سيتم تعديل سجلات الغياب لهذه الأيام فقط.`)) return;
    
    setIsActionLoading(true);
    const result = await approveExcuse(excuse, user.id, selectedDatesToApprove);
    if (result.success) {
      alert('تم اعتماد العذر وتعديل السجلات بنجاح وإرسال التأكيد للطالب!');
      fetchExcuses(activeTab);
      setSelectedExcuse(null);
    } else {
      alert('حدث خطأ: ' + result.error);
    }
    setIsActionLoading(false);
  };

  const handleReject = async (excuse: any) => {
    if (!rejectNote.trim()) { alert('يرجى كتابة سبب الرفض لولي الأمر/الطالب.'); return; }
    setIsActionLoading(true);
    const result = await rejectExcuse(excuse.id, rejectNote, user.id);
    if (result.success) {
      alert('تم رفض العذر.');
      fetchExcuses(activeTab);
      setSelectedExcuse(null);
      setRejectNote('');
    } else { alert('حدث خطأ: ' + result.error); }
    setIsActionLoading(false);
  };

  // 🚀 المحرك السحري للبحث عن سجلات أي طالب
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // 1. البحث عن الطلاب بالاسم
      const { data: matchedUsers, error: userErr } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'student')
        .ilike('full_name', `%${searchQuery}%`);

      if (userErr) throw userErr;

      if (!matchedUsers || matchedUsers.length === 0) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      const userIds = matchedUsers.map(u => u.id);
      const userMap = matchedUsers.reduce((acc: any, u) => ({...acc, [u.id]: u.full_name}), {});

      // 2. جلب سجلات الغياب، الاستئذان، والتأخير
      const { data: records, error: recErr } = await supabase
        .from('attendance_records')
        .select('id, date, period, status, student_id, subjects(name)')
        .in('student_id', userIds)
        .neq('status', 'present') // استبعاد الحضور العادي
        .order('date', { ascending: false });

      if (recErr) throw recErr;

      // 3. تجميع السجلات حسب الطالب
      const grouped: Record<string, any[]> = {};
      records?.forEach(rec => {
         const sId = rec.student_id;
         if (!grouped[sId]) grouped[sId] = [];
         grouped[sId].push(rec);
      });

      const formattedResults = Object.keys(grouped).map(sId => ({
         studentName: userMap[sId] || 'مجهول',
         records: grouped[sId]
      }));

      setSearchResults(formattedResults);

    } catch(err: any) {
      console.error(err);
      alert('حدث خطأ أثناء البحث: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const safeFormat = (dateStr: any, formatStr: string, fallback = '...') => {
    if (!dateStr) return fallback;
    try { return format(new Date(dateStr), formatStr, { locale: arSA }); } 
    catch (e) { return fallback; }
  };

  const translateStatus = (status: string) => {
    switch(status) {
      case 'absent': return { text: 'غياب بدون عذر', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
      case 'excused': return { text: 'مستأذن (بعذر)', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' };
      case 'late': return { text: 'تأخير', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
      default: return { text: status, color: 'bg-slate-500/20 text-slate-400' };
    }
  };

  if (isChecking) return <div className="min-h-screen flex items-center justify-center bg-[#090b14]"><Loader2 className="w-12 h-12 animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#090b14] text-slate-200 pb-32 font-cairo" dir="rtl">
      
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none z-0"></div>
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none z-0"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 relative z-10 space-y-8">
        
        {/* الترويسة والتبويبات */}
        <div className="bg-[#131836]/60 backdrop-blur-2xl p-8 sm:p-10 rounded-[3rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col xl:flex-row items-center justify-between gap-6">
            <div className="text-center xl:text-right w-full xl:w-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-widest mb-4">
                <ShieldAlert className="w-4 h-4" /> شؤون الطلاب والمتابعة
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white drop-shadow-md tracking-tight">إدارة الأعذار وسجلات الغياب</h1>
            </div>
            
            <div className="flex flex-wrap justify-center bg-[#090b14]/80 p-1.5 rounded-2xl border border-white/5 w-full xl:w-auto">
              <button onClick={() => setActiveTab('pending')} className={`px-4 sm:px-6 py-3 rounded-xl font-black text-xs sm:text-sm transition-all ${activeTab === 'pending' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>طلبات معلقة</button>
              <button onClick={() => setActiveTab('approved')} className={`px-4 sm:px-6 py-3 rounded-xl font-black text-xs sm:text-sm transition-all ${activeTab === 'approved' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>معتمدة</button>
              <button onClick={() => setActiveTab('rejected')} className={`px-4 sm:px-6 py-3 rounded-xl font-black text-xs sm:text-sm transition-all ${activeTab === 'rejected' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>مرفوضة</button>
              {/* 🚀 زر الاستعلام الجديد */}
              <button onClick={() => setActiveTab('inquiry')} className={`px-4 sm:px-6 py-3 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center gap-2 ${activeTab === 'inquiry' ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-400 hover:text-indigo-300'}`}><Search className="w-4 h-4"/> استعلام شامل</button>
            </div>
          </div>
        </div>

        {/* 🚀 قسم الاستعلام الشامل (Inquiry Section) */}
        {activeTab === 'inquiry' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-[#131836]/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-indigo-500/20 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30"><Search className="w-6 h-6 text-indigo-400" /></div>
                  <div>
                     <h2 className="text-2xl font-black text-white">استعلام عن سجلات طالب</h2>
                     <p className="text-sm font-bold text-slate-400 mt-1">ابحث بالاسم لعرض (الغيابات، التأخير، الاستئذان) مع التواريخ وأرقام الحصص.</p>
                  </div>
                </div>

                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                  <input 
                    type="text" 
                    placeholder="أدخل اسم الطالب (مثال: أحمد محمد)..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-[#090b14] border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 shadow-inner"
                  />
                  <button type="submit" disabled={isSearching || !searchQuery.trim()} className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2 shrink-0">
                    {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'بحث واستعلام'}
                  </button>
                </form>
             </div>

             {/* عرض النتائج */}
             {searchResults !== null && (
               <div>
                  {searchResults.length === 0 ? (
                    <div className="bg-[#131836]/40 backdrop-blur-xl rounded-[3rem] p-16 text-center border border-white/5">
                      <ShieldAlert className="h-16 w-16 mx-auto text-indigo-500/50 mb-4" />
                      <h3 className="text-xl font-black text-white">لا توجد سجلات مطابقة</h3>
                      <p className="text-slate-400 font-bold mt-2">لم نجد أي حالات غياب أو تأخير للطالب بهذا الاسم.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {searchResults.map((studentData, idx) => (
                        <div key={idx} className="bg-[#131836]/80 backdrop-blur-xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-lg">
                           <div className="bg-[#090b14]/50 p-6 flex items-center gap-4 border-b border-white/5">
                              <div className="w-14 h-14 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center font-black text-2xl border border-indigo-500/30">
                                {studentData.studentName.charAt(0)}
                              </div>
                              <div>
                                <h3 className="text-xl font-black text-white">{studentData.studentName}</h3>
                                <p className="text-xs font-bold text-slate-400 mt-1">إجمالي السجلات المكتشفة: {studentData.records.length}</p>
                              </div>
                           </div>
                           
                           <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                             {studentData.records.map((rec) => {
                               const statusInfo = translateStatus(rec.status);
                               return (
                                 <div key={rec.id} className="bg-[#090b14]/80 p-4 rounded-2xl border border-white/5 flex flex-col justify-between shadow-inner hover:border-indigo-500/30 transition-colors">
                                   <div className="flex justify-between items-start mb-4">
                                     <div className="font-black text-lg text-white" dir="ltr">{safeFormat(rec.date, 'dd MMM yyyy')}</div>
                                     <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${statusInfo.color}`}>
                                       {statusInfo.text}
                                     </span>
                                   </div>
                                   <div className="flex justify-between items-end text-sm font-bold text-slate-400">
                                     <span className="flex items-center gap-1"><Clock className="w-4 h-4"/> الحصة {rec.period}</span>
                                     <span className="truncate max-w-[120px] bg-white/5 px-2 py-1 rounded-md">{rec.subjects?.name || 'غير محدد'}</span>
                                   </div>
                                 </div>
                               );
                             })}
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
               </div>
             )}
          </div>
        ) : (
          /* 🚀 قائمة الأعذار (التبويبات الأخرى) */
          <>
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-12 h-12 animate-spin text-emerald-500" /></div>
            ) : excuses.length === 0 ? (
              <div className="bg-[#131836]/40 backdrop-blur-xl rounded-[3rem] p-16 text-center border border-white/5">
                <CheckCircle2 className="h-16 w-16 mx-auto text-emerald-500/50 mb-4" />
                <h3 className="text-2xl font-black text-white">لا توجد طلبات في هذا القسم</h3>
                <p className="text-slate-400 font-bold mt-2">سجل الأعذار نظيف تماماً.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                {excuses.map((excuse) => {
                  const studentName = Array.isArray(excuse.students?.users) ? excuse.students.users[0]?.full_name : excuse.students?.users?.full_name;
                  const className = Array.isArray(excuse.students?.sections?.classes) ? excuse.students.sections.classes[0]?.name : excuse.students?.sections?.classes?.name;
                  const sectionName = excuse.students?.sections?.name;
                  
                  const allDates = excuse.absent_dates && excuse.absent_dates.length > 0 ? excuse.absent_dates : [excuse.excuse_date];

                  return (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={excuse.id} className="bg-[#131836]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 hover:border-emerald-500/30 transition-all shadow-lg flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-[#090b14] rounded-2xl flex items-center justify-center text-xl font-black text-emerald-400 border border-white/5">
                              {studentName?.charAt(0) || 'ط'}
                            </div>
                            <div>
                              <h3 className="font-black text-white truncate max-w-[150px]">{studentName}</h3>
                              <p className="text-[10px] font-bold text-slate-400">{className?.replace('الصف', '')} - {sectionName}</p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black border ${
                            excuse.duration_type === 'full_day' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}>
                            {excuse.duration_type === 'full_day' ? 'يوم كامل' : 'غياب جزئي'}
                          </span>
                        </div>

                        <div className="space-y-3 bg-[#090b14]/50 p-4 rounded-2xl border border-white/5 mb-4 shadow-inner">
                          <div className="flex items-start gap-2 text-sm font-bold text-slate-300">
                            <Calendar className="w-4 h-4 text-emerald-400 mt-1" /> 
                            <div>
                              <span className="block text-[10px] text-slate-400">أيام الغياب المطلوبة:</span>
                              <span className="text-white font-black text-xs" dir="ltr">{allDates.length > 2 ? `${allDates[0]} (+${allDates.length-1})` : allDates.join(' ، ')}</span>
                            </div>
                          </div>
                          {excuse.duration_type === 'partial_day' && (
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                              <Clock className="w-4 h-4 text-amber-400" /> الحصص: <span className="text-white font-black" dir="ltr">{excuse.target_periods?.join(', ')}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                            <User className="w-3.5 h-3.5" /> المُقدم: {excuse.users?.full_name} ({excuse.submitter_role === 'student' ? 'الطالب' : 'ولي الأمر'})
                          </div>
                        </div>
                      </div>

                      <button onClick={() => openExcuseModal(excuse)} className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-black rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2 text-sm">
                        <FileText className="w-4 h-4" /> مراجعة واعتماد
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* 🚀 نافذة مراجعة العذر (Modal) */}
      <AnimatePresence>
        {selectedExcuse && (
          <Dialog.Root open={!!selectedExcuse} onOpenChange={(open) => !open && setSelectedExcuse(null)}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-[#090b14]/90 backdrop-blur-xl z-50" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#131836] border border-white/10 rounded-[2.5rem] w-[95%] max-w-5xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-[0_0_60px_rgba(0,0,0,0.9)] z-50 flex flex-col lg:flex-row" dir="rtl">
                
                {/* قسم عرض المرفق (الصورة/PDF) */}
                <div className="lg:w-1/2 bg-[#090b14] p-6 flex flex-col border-b lg:border-b-0 lg:border-l border-white/5 shrink-0">
                  <h3 className="font-black text-white mb-4 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-emerald-400"/> المرفق الطبي</h3>
                  <div className="flex-1 bg-[#131836]/50 rounded-3xl border border-white/5 flex items-center justify-center overflow-hidden min-h-[250px] lg:min-h-[400px] relative">
                    {selectedExcuse.attachment_url ? (
                      <img src={selectedExcuse.attachment_url} alt="Medical Report" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-center text-slate-500"><FileText className="w-12 h-12 mx-auto mb-2 opacity-50" /><p className="font-bold text-sm">لا يوجد مرفق</p></div>
                    )}
                  </div>
                </div>

                {/* قسم تفاصيل الطلب والقرار */}
                <div className="lg:w-1/2 p-6 sm:p-8 flex flex-col bg-[#131836]">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl sm:text-2xl font-black text-white">تفاصيل واعتماد العذر</h2>
                    <Dialog.Close className="p-2 bg-white/5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-colors"><XCircle className="w-6 h-6" /></Dialog.Close>
                  </div>

                  <div className="space-y-6 flex-1">
                    
                    {/* 🚀 قسم مربعات الاختيار لاعتماد التواريخ */}
                    <div className="bg-indigo-500/10 p-5 rounded-2xl border border-indigo-500/20 shadow-inner">
                      <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4"/> حدد التواريخ للموافقة عليها وتعديلها:
                      </p>
                      
                      {selectedExcuse.status === 'pending' ? (
                        <div className="flex flex-col gap-2">
                          {(selectedExcuse.absent_dates && selectedExcuse.absent_dates.length > 0 ? selectedExcuse.absent_dates : [selectedExcuse.excuse_date]).map((date: string) => (
                            <label key={date} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedDatesToApprove.includes(date) ? 'bg-[#090b14] border-indigo-500/50' : 'bg-[#090b14]/50 border-white/5 opacity-60'}`}>
                              <input 
                                type="checkbox" 
                                checked={selectedDatesToApprove.includes(date)} 
                                onChange={() => handleToggleDate(date)} 
                                className="w-5 h-5 accent-emerald-500 rounded cursor-pointer" 
                              />
                              <span className={`font-bold text-sm ${selectedDatesToApprove.includes(date) ? 'text-white' : 'text-slate-400'}`} dir="ltr">{date}</span>
                            </label>
                          ))}
                          <p className="text-[10px] text-indigo-300/70 mt-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> التواريخ غير المحددة لن يتم تعديل الغياب فيها.</p>
                        </div>
                      ) : (
                        <div className="font-black text-white leading-relaxed text-sm mt-2" dir="ltr">
                          {selectedExcuse.absent_dates && selectedExcuse.absent_dates.length > 0 
                             ? selectedExcuse.absent_dates.join(' | ') 
                             : selectedExcuse.excuse_date || 'غير محدد'}
                        </div>
                      )}
                    </div>

                    <div className="bg-[#090b14]/50 p-5 rounded-2xl border border-white/5">
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">تفاصيل إضافية من الطالب:</p>
                      <p className="font-bold text-white leading-relaxed text-sm">{selectedExcuse.reason || 'لم يتم كتابة تفاصيل إضافية.'}</p>
                    </div>

                    {selectedExcuse.status === 'pending' && (
                      <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="bg-rose-500/10 p-4 rounded-2xl border border-rose-500/20">
                          <label className="block text-xs font-black text-rose-400 uppercase tracking-widest mb-2">سبب الرفض (اختياري - يكتب في حال الرفض فقط)</label>
                          <textarea 
                            value={rejectNote} 
                            onChange={(e) => setRejectNote(e.target.value)} 
                            placeholder="اكتب سبب الرفض لولي الأمر..." 
                            className="w-full bg-[#090b14] border border-white/5 rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-rose-500/50 resize-none h-20"
                          />
                        </div>

                        <div className="flex gap-3">
                          <button disabled={isActionLoading} onClick={() => handleReject(selectedExcuse)} className="flex-1 py-3.5 sm:py-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm transition-all disabled:opacity-50">رفض العذر</button>
                          <button disabled={isActionLoading} onClick={() => handleApprove(selectedExcuse)} className="flex-[2] py-3.5 sm:py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-black text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 flex items-center justify-center gap-2">
                            {isActionLoading && <Loader2 className="w-4 h-4 animate-spin" />} اعتماد التواريخ المحددة
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedExcuse.status !== 'pending' && (
                      <div className={`p-5 rounded-2xl border flex items-start gap-3 ${selectedExcuse.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                        {selectedExcuse.status === 'approved' ? <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5" /> : <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />}
                        <div>
                          <h4 className="font-black text-lg">{selectedExcuse.status === 'approved' ? 'تم الاعتماد' : 'تم الرفض'}</h4>
                          {selectedExcuse.admin_note && (
                            <p className="text-xs font-bold mt-2 text-slate-300 leading-relaxed bg-[#090b14]/50 p-3 rounded-lg border border-white/5">
                              <span className="block text-[10px] text-slate-500 mb-1">الرسالة التلقائية المرسلة للطالب:</span>
                              {selectedExcuse.admin_note}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
}
