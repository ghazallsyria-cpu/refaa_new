'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Clock, Plus, Trash2, X, Save, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Period = {
  id: string;
  period_number: number;
  start_time: string;
  end_time: string;
};

export default function PeriodsPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPeriod, setNewPeriod] = useState({ period_number: 1, start_time: '', end_time: '' });
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchPeriods = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('class_periods')
      .select('*')
      .order('period_number');
    if (error) {
      console.error('Error fetching periods:', error);
      setMessage({ text: 'حدث خطأ أثناء تحميل أوقات الحصص', type: 'error' });
    } else {
      setPeriods(data || []);
      setNewPeriod(prev => ({ ...prev, period_number: (data?.length || 0) + 1 }));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  const handleAddPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ text: '', type: '' });

    try {
      const { error } = await supabase.from('class_periods').insert([newPeriod]);
      if (error) throw error;
      
      setMessage({ text: 'تمت إضافة الحصة بنجاح', type: 'success' });
      fetchPeriods();
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
      const { error } = await supabase.from('class_periods').delete().eq('id', id);
      if (error) throw error;
      
      setMessage({ text: 'تم حذف الحصة بنجاح', type: 'success' });
      fetchPeriods();
    } catch (error: any) {
      console.error('Error deleting period:', error);
      setMessage({ text: 'حدث خطأ أثناء حذف الحصة', type: 'error' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">إدارة توقيت الحصص</h1>
          <p className="text-slate-500">تحديد أوقات بداية ونهاية كل حصة دراسية</p>
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
            <span className="text-sm font-medium">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

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
                className="w-full rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-sm" 
                value={newPeriod.period_number} 
                onChange={e => setNewPeriod({...newPeriod, period_number: parseInt(e.target.value)})} 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">وقت البدء</label>
              <input 
                type="time" 
                className="w-full rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-sm" 
                value={newPeriod.start_time} 
                onChange={e => setNewPeriod({...newPeriod, start_time: e.target.value})} 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">وقت الانتهاء</label>
              <input 
                type="time" 
                className="w-full rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-sm" 
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

      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900">قائمة الحصص الحالية</h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-500">جاري التحميل...</div>
          ) : periods.length === 0 ? (
            <div className="p-12 text-center text-slate-500">لا توجد حصص مضافة بعد</div>
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
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">الحصة {p.period_number}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{p.start_time.slice(0, 5)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{p.end_time.slice(0, 5)}</td>
                    <td className="px-6 py-4 text-left">
                      <button 
                        onClick={() => handleDeletePeriod(p.id)} 
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
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
