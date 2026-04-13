'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePeriodsSystem, Period } from '@/hooks/usePeriodsSystem';
import { useAuth } from '@/context/auth-context'; // 🚀 استيراد الصلاحيات
import { Clock, Plus, Trash2, X, Save, AlertCircle, Edit2, Check, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function PeriodsPage() {
  const { authRole, isChecking } = useAuth(); // 🚀 حماية وتأمين الصفحة

  const { loading: hookLoading, fetchPeriods, addPeriod, deletePeriod } = usePeriodsSystem();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPeriod, setNewPeriod] = useState({ period_number: 1, start_time: '', end_time: '' });
  const [message, setMessage] = useState({ text: '', type: '' });

  // حالات التعديل المباشر (Inline Editing)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ start_time: '', end_time: '' });

  const loadPeriods = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPeriods();
      setPeriods(data);
      setNewPeriod(prev => ({ ...prev, period_number: (data?.length || 0) + 1 }));
    } catch (error) {
      console.error('Error fetching periods:', error);
      setMessage({ text: 'حدث خطأ أثناء تحميل أوقات الحصص', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [fetchPeriods]);

  useEffect(() => {
    if (authRole === 'admin' || authRole === 'management') {
      loadPeriods();
    }
  }, [loadPeriods, authRole]);

  const handleAddPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ text: '', type: '' });

    try {
      await addPeriod(newPeriod);
      setMessage({ text: 'تمت إضافة الحصة بنجاح', type: 'success' });
      loadPeriods();
      setNewPeriod({ period_number: periods.length + 2, start_time: '', end_time: '' });
    } catch (error: any) {
      console.error('Error adding period:', error);
      setMessage({ text: 'حدث خطأ أثناء إضافة الحصة', type: 'error' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    }
  };

  const handleDeletePeriod = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الحصة؟')) return;
    
    try {
      await deletePeriod(id);
      setMessage({ text: 'تم حذف الحصة بنجاح', type: 'success' });
      loadPeriods();
    } catch (error: any) {
      console.error('Error deleting period:', error);
      setMessage({ text: 'حدث خطأ أثناء حذف الحصة', type: 'error' });
    } finally {
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    }
  };

  // بدء عملية التعديل
  const handleStartEdit = (p: Period) => {
    setEditingId(p.id);
    setEditData({ 
      start_time: p.start_time.slice(0, 5), 
      end_time: p.end_time.slice(0, 5) 
    });
  };

  // حفظ التعديلات الجديدة في قاعدة البيانات
  const handleSaveEdit = async (id: string) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('class_periods')
        .update({
          start_time: editData.start_time,
          end_time: editData.end_time,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setMessage({ text: 'تم تحديث توقيت الحصة بنجاح', type: 'success' });
      setEditingId(null);
      loadPeriods(); 
    } catch (error: any) {
      console.error('Error updating period:', error);
      setMessage({ text: 'حدث خطأ أثناء تحديث الحصة', type: 'error' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    }
  };

  // 🚀 حماية وتأمين الصفحة ومؤشرات التحميل
  if (isChecking || hookLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse">جاري تحميل بيانات الحصص...</p>
        </div>
      </div>
    );
  }

  if (authRole !== 'admin' && authRole !== 'management') {
    return <div className="p-10 text-center font-bold text-rose-600 min-h-screen flex items-center justify-center bg-slate-50">هذه الصفحة مخصصة لفريق الإدارة فقط.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 font-cairo" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8 pt-8">
        
        {/* 🚀 زر العودة الموحد */}
        <div className="mb-2">
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-slate-100 transition-all w-fit group">
            <ArrowRight className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> العودة للوحة الإدارة
          </Link>
        </div>

        <div className="flex items-center justify-between bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">إدارة توقيت الحصص</h1>
            <p className="text-slate-500 font-medium mt-2">إضافة وتعديل أوقات بداية ونهاية كل حصة دراسية لضبط النظام الآلي للغياب.</p>
          </div>
          <div className="h-16 w-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-inner">
            <Clock className="h-8 w-8" />
          </div>
        </div>

        <AnimatePresence>
          {message.text && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`p-5 rounded-2xl flex items-center gap-3 shadow-sm ${
                message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'
              }`}
            >
              {message.type === 'success' ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              <span className="text-sm font-black">{message.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* قسم إضافة حصة جديدة */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xl font-black text-slate-900">إضافة حصة جديدة</h2>
          </div>
          <form onSubmit={handleAddPeriod} className="p-6 sm:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">رقم الحصة</label>
                <input 
                  type="number" 
                  className="w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 text-sm font-bold transition-all outline-none" 
                  value={newPeriod.period_number} 
                  onChange={e => setNewPeriod({...newPeriod, period_number: parseInt(e.target.value)})} 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">وقت البدء</label>
                <input 
                  type="time" 
                  dir="ltr"
                  className="w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 text-sm font-bold transition-all outline-none text-left" 
                  value={newPeriod.start_time} 
                  onChange={e => setNewPeriod({...newPeriod, start_time: e.target.value})} 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">وقت الانتهاء</label>
                <input 
                  type="time" 
                  dir="ltr"
                  className="w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 text-sm font-bold transition-all outline-none text-left" 
                  value={newPeriod.end_time} 
                  onChange={e => setNewPeriod({...newPeriod, end_time: e.target.value})} 
                  required 
                />
              </div>
            </div>
            <div className="mt-8 flex justify-end pt-6 border-t border-slate-100">
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-xl shadow-indigo-200 active:scale-95"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                {isSubmitting ? 'جاري الإضافة...' : 'حفظ وإضافة الحصة'}
              </button>
            </div>
          </form>
        </div>

        {/* قسم عرض وتعديل الحصص الحالية */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xl font-black text-slate-900">قائمة الحصص الحالية</h2>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            {loading ? (
              <div className="p-20 text-center flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <p className="text-slate-500 font-bold">جاري تحميل الحصص...</p>
              </div>
            ) : periods.length === 0 ? (
              <div className="p-20 text-center text-slate-500 font-bold bg-slate-50/50 border border-dashed border-slate-200 m-6 rounded-3xl">لا توجد حصص مضافة بعد</div>
            ) : (
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="px-6 py-5 text-sm font-black text-slate-500 uppercase tracking-widest">رقم الحصة</th>
                    <th className="px-6 py-5 text-sm font-black text-slate-500 uppercase tracking-widest">وقت البدء</th>
                    <th className="px-6 py-5 text-sm font-black text-slate-500 uppercase tracking-widest">وقت الانتهاء</th>
                    <th className="px-6 py-5 text-sm font-black text-slate-500 uppercase tracking-widest text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {periods.map(p => (
                    <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-6 py-5 text-base font-black text-slate-900">الحصة {p.period_number}</td>
                      
                      <td className="px-6 py-5 text-sm text-slate-600 font-bold" dir="ltr">
                        {editingId === p.id ? (
                          <input 
                            type="time" 
                            value={editData.start_time}
                            onChange={(e) => setEditData({...editData, start_time: e.target.value})}
                            className="rounded-xl border-0 bg-white ring-1 ring-slate-200 px-4 py-2.5 text-sm w-36 focus:ring-2 focus:ring-indigo-600 outline-none text-center shadow-sm font-black"
                          />
                        ) : (
                          <span className="bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{p.start_time.slice(0, 5)}</span>
                        )}
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600 font-bold" dir="ltr">
                        {editingId === p.id ? (
                          <input 
                            type="time" 
                            value={editData.end_time}
                            onChange={(e) => setEditData({...editData, end_time: e.target.value})}
                            className="rounded-xl border-0 bg-white ring-1 ring-slate-200 px-4 py-2.5 text-sm w-36 focus:ring-2 focus:ring-indigo-600 outline-none text-center shadow-sm font-black"
                          />
                        ) : (
                          <span className="bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{p.end_time.slice(0, 5)}</span>
                        )}
                      </td>

                      <td className="px-6 py-5 text-left">
                        <div className="flex items-center justify-end gap-2">
                          {editingId === p.id ? (
                            <>
                              <button 
                                onClick={() => handleSaveEdit(p.id)} 
                                disabled={isSubmitting}
                                className="p-2.5 text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all shadow-md active:scale-95"
                                title="حفظ التعديلات"
                              >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="h-5 w-5" />}
                              </button>
                              <button 
                                onClick={() => setEditingId(null)} 
                                className="p-2.5 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all active:scale-95"
                                title="إلغاء"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={() => handleStartEdit(p)} 
                                className="p-2.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all opacity-100 sm:opacity-0 group-hover:opacity-100 active:scale-95"
                                title="تعديل التوقيت"
                              >
                                <Edit2 className="h-5 w-5" />
                              </button>
                              <button 
                                onClick={() => handleDeletePeriod(p.id)} 
                                className="p-2.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all opacity-100 sm:opacity-0 group-hover:opacity-100 active:scale-95"
                                title="حذف الحصة"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}
