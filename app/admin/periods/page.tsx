'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePeriodsSystem, Period } from '@/hooks/usePeriodsSystem';
import { Clock, Plus, Trash2, X, Save, AlertCircle, Edit2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase'; // تمت إضافة استيراد Supabase للتعديل المباشر

export default function PeriodsPage() {
  const { loading: hookLoading, fetchPeriods, addPeriod, deletePeriod } = usePeriodsSystem();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPeriod, setNewPeriod] = useState({ period_number: 1, start_time: '', end_time: '' });
  const [message, setMessage] = useState({ text: '', type: '' });

  // 🚀 حالات التعديل المباشر (Inline Editing)
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
    loadPeriods();
  }, [loadPeriods]);

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
    }
  };

  // 🚀 بدء عملية التعديل
  const handleStartEdit = (p: Period) => {
    setEditingId(p.id);
    setEditData({ 
      start_time: p.start_time.slice(0, 5), 
      end_time: p.end_time.slice(0, 5) 
    });
  };

  // 🚀 حفظ التعديلات الجديدة في قاعدة البيانات
  const handleSaveEdit = async (id: string) => {
    setIsSubmitting(true);
    try {
      // نستخدم Supabase مباشرة لضمان عمل التحديث على جدول class_periods
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
      loadPeriods(); // إعادة تحميل الجدول بعد التحديث
    } catch (error: any) {
      console.error('Error updating period:', error);
      setMessage({ text: 'حدث خطأ أثناء تحديث الحصة', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">إدارة توقيت الحصص</h1>
          <p className="text-slate-500">إضافة وتعديل أوقات بداية ونهاية كل حصة دراسية</p>
        </div>
        <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
          <Clock className="h-6 w-6" />
        </div>
      </div>

      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-xl flex items-center gap-3 ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'
            }`}
          >
            {message.type === 'success' ? <Save className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span className="text-sm font-bold">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* قسم إضافة حصة جديدة */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900">إضافة حصة جديدة</h2>
        </div>
        <form onSubmit={handleAddPeriod} className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">رقم الحصة</label>
              <input 
                type="number" 
                className="w-full rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-sm font-bold" 
                value={newPeriod.period_number} 
                onChange={e => setNewPeriod({...newPeriod, period_number: parseInt(e.target.value)})} 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">وقت البدء</label>
              <input 
                type="time" 
                className="w-full rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-sm font-bold" 
                value={newPeriod.start_time} 
                onChange={e => setNewPeriod({...newPeriod, start_time: e.target.value})} 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">وقت الانتهاء</label>
              <input 
                type="time" 
                className="w-full rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-sm font-bold" 
                value={newPeriod.end_time} 
                onChange={e => setNewPeriod({...newPeriod, end_time: e.target.value})} 
                required 
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-lg shadow-indigo-200"
            >
              <Plus className="h-4 w-4" />
              {isSubmitting ? 'جاري الإضافة...' : 'إضافة الحصة'}
            </button>
          </div>
        </form>
      </div>

      {/* قسم عرض وتعديل الحصص الحالية */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900">قائمة الحصص الحالية</h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-500 font-bold">جاري التحميل...</div>
          ) : periods.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-bold">لا توجد حصص مضافة بعد</div>
          ) : (
            <table className="w-full text-right">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-sm font-bold text-slate-900">رقم الحصة</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-900">وقت البدء</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-900">وقت الانتهاء</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-900 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {periods.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-black text-slate-900">الحصة {p.period_number}</td>
                    
                    {/* 🚀 حقل وقت البدء (يتحول لمدخل عند التعديل) */}
                    <td className="px-6 py-4 text-sm text-slate-600 font-bold" dir="ltr">
                      {editingId === p.id ? (
                        <input 
                          type="time" 
                          value={editData.start_time}
                          onChange={(e) => setEditData({...editData, start_time: e.target.value})}
                          className="rounded-lg border-slate-300 px-3 py-1.5 text-sm w-32 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      ) : (
                        p.start_time.slice(0, 5)
                      )}
                    </td>

                    {/* 🚀 حقل وقت الانتهاء (يتحول لمدخل عند التعديل) */}
                    <td className="px-6 py-4 text-sm text-slate-600 font-bold" dir="ltr">
                      {editingId === p.id ? (
                        <input 
                          type="time" 
                          value={editData.end_time}
                          onChange={(e) => setEditData({...editData, end_time: e.target.value})}
                          className="rounded-lg border-slate-300 px-3 py-1.5 text-sm w-32 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      ) : (
                        p.end_time.slice(0, 5)
                      )}
                    </td>

                    <td className="px-6 py-4 text-left">
                      <div className="flex items-center justify-end gap-2">
                        {editingId === p.id ? (
                          <>
                            <button 
                              onClick={() => handleSaveEdit(p.id)} 
                              disabled={isSubmitting}
                              className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                              title="حفظ التعديلات"
                            >
                              <Check className="h-5 w-5" />
                            </button>
                            <button 
                              onClick={() => setEditingId(null)} 
                              className="p-2 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                              title="إلغاء"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleStartEdit(p)} 
                              className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="تعديل التوقيت"
                            >
                              <Edit2 className="h-5 w-5" />
                            </button>
                            <button 
                              onClick={() => handleDeletePeriod(p.id)} 
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
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
  );
}
