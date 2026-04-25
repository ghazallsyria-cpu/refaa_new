/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useAdminExcuses } from '@/hooks/useAdminExcuses';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, CheckCircle2, XCircle, Clock, 
  Calendar, FileText, Image as ImageIcon, User, 
  Loader2, Search, Filter, AlertTriangle
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

export default function AdminExcusesPage() {
  const { user, isChecking, authRole, userRole } = useAuth() as any;
  const { excuses, loading, fetchExcuses, approveExcuse, rejectExcuse } = useAdminExcuses();
  
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [selectedExcuse, setSelectedExcuse] = useState<any>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    if (!isChecking) {
      fetchExcuses(activeTab);
    }
  }, [activeTab, isChecking, fetchExcuses]);

  const handleApprove = async (excuse: any) => {
    if (!confirm('هل أنت متأكد من اعتماد العذر؟ سيتم تعديل سجل غياب الطالب تلقائياً في التواريخ المحددة.')) return;
    setIsActionLoading(true);
    const result = await approveExcuse(excuse, user.id);
    if (result.success) {
      alert('تم اعتماد العذر وتعديل السجلات بنجاح!');
      fetchExcuses(activeTab);
      setSelectedExcuse(null);
    } else {
      alert('حدث خطأ: ' + result.error);
    }
    setIsActionLoading(false);
  };

  const handleReject = async (excuse: any) => {
    if (!rejectNote.trim()) {
      alert('يرجى كتابة سبب الرفض لولي الأمر/الطالب.');
      return;
    }
    setIsActionLoading(true);
    const result = await rejectExcuse(excuse.id, rejectNote, user.id);
    if (result.success) {
      alert('تم رفض العذر.');
      fetchExcuses(activeTab);
      setSelectedExcuse(null);
      setRejectNote('');
    } else {
      alert('حدث خطأ: ' + result.error);
    }
    setIsActionLoading(false);
  };

  const safeFormat = (dateStr: any, formatStr: string, fallback = '...') => {
    if (!dateStr) return fallback;
    try {
      return format(new Date(dateStr), formatStr, { locale: arSA });
    } catch (e) { return fallback; }
  };

  if (isChecking) return <div className="min-h-screen flex items-center justify-center bg-[#090b14]"><Loader2 className="w-12 h-12 animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#090b14] text-slate-200 pb-32 font-cairo" dir="rtl">
      
      {/* الخلفية المضيئة */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none z-0"></div>
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none z-0"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 relative z-10 space-y-8">
        
        {/* الترويسة */}
        <div className="bg-[#131836]/60 backdrop-blur-2xl p-8 sm:p-10 rounded-[3rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-widest mb-4">
                <ShieldAlert className="w-4 h-4" /> شؤون الطلاب والمتابعة
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-white drop-shadow-md tracking-tight">مركز مراجعة الأعذار الطبية</h1>
              <p className="text-slate-400 font-bold mt-3 text-sm sm:text-base">راجع تقارير الغياب، اعتمدها، وسيقوم النظام تلقائياً بتحويل الغياب إلى (مستأذن) في السجل الأم.</p>
            </div>
            
            {/* التبويبات (Tabs) */}
            <div className="flex bg-[#090b14]/80 p-1.5 rounded-2xl border border-white/5 w-full md:w-auto">
              <button onClick={() => setActiveTab('pending')} className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-black text-sm transition-all ${activeTab === 'pending' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>الطلبات المعلقة</button>
              <button onClick={() => setActiveTab('approved')} className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-black text-sm transition-all ${activeTab === 'approved' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>المعتمدة</button>
              <button onClick={() => setActiveTab('rejected')} className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-black text-sm transition-all ${activeTab === 'rejected' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>المرفوضة</button>
            </div>
          </div>
        </div>

        {/* قائمة الأعذار */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-12 h-12 animate-spin text-emerald-500" /></div>
        ) : excuses.length === 0 ? (
          <div className="bg-[#131836]/40 backdrop-blur-xl rounded-[3rem] p-16 text-center border border-white/5">
            <CheckCircle2 className="h-16 w-16 mx-auto text-emerald-500/50 mb-4" />
            <h3 className="text-2xl font-black text-white">لا توجد طلبات في هذا القسم</h3>
            <p className="text-slate-400 font-bold mt-2">سجل الأعذار نظيف تماماً.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {excuses.map((excuse) => {
              const studentName = Array.isArray(excuse.students?.users) ? excuse.students.users[0]?.full_name : excuse.students?.users?.full_name;
              const className = Array.isArray(excuse.students?.sections?.classes) ? excuse.students.sections.classes[0]?.name : excuse.students?.sections?.classes?.name;
              const sectionName = excuse.students?.sections?.name;
              
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

                    <div className="space-y-3 bg-[#090b14]/50 p-4 rounded-2xl border border-white/5 mb-4">
                      <div className="flex items-start gap-2 text-sm font-bold text-slate-300">
                        <Calendar className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
                        <div>
                          <span className="block text-[10px] text-slate-400">أيام الغياب المحددة:</span>
                          <span className="text-white font-black leading-tight" dir="ltr">
                            {excuse.absent_dates && excuse.absent_dates.length > 0 
                               ? `${safeFormat(excuse.absent_dates[0], 'dd MMM')} ${excuse.absent_dates.length > 1 ? `(+${excuse.absent_dates.length - 1} أيام)` : ''}`
                               : safeFormat(excuse.excuse_date, 'dd MMM')}
                          </span>
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

                  <button onClick={() => setSelectedExcuse(excuse)} className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-black rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2 text-sm">
                    <FileText className="w-4 h-4" /> فتح ومراجعة الطلب
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🚀 نافذة مراجعة العذر (Modal) */}
      <AnimatePresence>
        {selectedExcuse && (
          <Dialog.Root open={!!selectedExcuse} onOpenChange={(open) => !open && setSelectedExcuse(null)}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-[#090b14]/90 backdrop-blur-xl z-50" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#131836] border border-white/10 rounded-[2.5rem] w-[95%] max-w-4xl max-h-[90vh] overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)] z-50 flex flex-col md:flex-row" dir="rtl">
                
                {/* قسم عرض المرفق (الصورة/PDF) */}
                <div className="md:w-1/2 bg-[#090b14] p-6 flex flex-col border-b md:border-b-0 md:border-l border-white/5 relative">
                  <h3 className="font-black text-white mb-4 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-emerald-400"/> المرفق الطبي</h3>
                  <div className="flex-1 bg-[#131836]/50 rounded-3xl border border-white/5 flex items-center justify-center overflow-hidden min-h-[300px] relative">
                    {selectedExcuse.attachment_url ? (
                      <img src={selectedExcuse.attachment_url} alt="Medical Report" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-center text-slate-500"><FileText className="w-12 h-12 mx-auto mb-2 opacity-50" /><p className="font-bold text-sm">لا يوجد مرفق</p></div>
                    )}
                  </div>
                </div>

                {/* قسم تفاصيل الطلب والقرار */}
                <div className="md:w-1/2 p-8 flex flex-col bg-[#131836] overflow-y-auto custom-scrollbar">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-white">تفاصيل العذر</h2>
                    <Dialog.Close className="p-2 bg-white/5 text-slate-400 hover:text-white rounded-full transition-colors"><XCircle className="w-6 h-6" /></Dialog.Close>
                  </div>

                  <div className="space-y-6 flex-1">
                    
                    <div className="bg-indigo-500/10 p-5 rounded-2xl border border-indigo-500/20">
                      <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Calendar className="w-4 h-4"/> التواريخ المراد تبريرها:</p>
                      <div className="font-black text-white leading-relaxed text-lg mt-2" dir="ltr">
                        {selectedExcuse.absent_dates && selectedExcuse.absent_dates.length > 0 
                           ? selectedExcuse.absent_dates.join(' | ') 
                           : selectedExcuse.excuse_date || 'غير محدد'}
                      </div>
                    </div>

                    <div className="bg-[#090b14]/50 p-5 rounded-2xl border border-white/5">
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">تفاصيل إضافية من الطالب:</p>
                      <p className="font-bold text-white leading-relaxed">{selectedExcuse.reason || 'لم يتم كتابة تفاصيل إضافية.'}</p>
                    </div>

                    {selectedExcuse.status === 'pending' && (
                      <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="bg-rose-500/10 p-4 rounded-2xl border border-rose-500/20">
                          <label className="block text-xs font-black text-rose-400 uppercase tracking-widest mb-2">سبب الرفض (اختياري - يكتب في حال الرفض فقط)</label>
                          <textarea 
                            value={rejectNote} 
                            onChange={(e) => setRejectNote(e.target.value)} 
                            placeholder="اكتب سبب الرفض لولي الأمر..." 
                            className="w-full bg-[#090b14] border border-white/5 rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-rose-500/50 resize-none h-24"
                          />
                        </div>

                        <div className="flex gap-3">
                          <button disabled={isActionLoading} onClick={() => handleReject(selectedExcuse)} className="flex-1 py-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm transition-all disabled:opacity-50">رفض العذر</button>
                          <button disabled={isActionLoading} onClick={() => handleApprove(selectedExcuse)} className="flex-[2] py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-black text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 flex items-center justify-center gap-2">
                            {isActionLoading && <Loader2 className="w-4 h-4 animate-spin" />} اعتماد العذر
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedExcuse.status !== 'pending' && (
                      <div className={`p-5 rounded-2xl border flex items-center gap-3 ${selectedExcuse.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                        {selectedExcuse.status === 'approved' ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                        <div>
                          <h4 className="font-black">{selectedExcuse.status === 'approved' ? 'العذر معتمد وتم تحديث السجل' : 'العذر مرفوض'}</h4>
                          {selectedExcuse.admin_note && <p className="text-xs font-bold mt-1 text-slate-300">ملاحظة الإدارة: {selectedExcuse.admin_note}</p>}
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
