'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  School, 
  Clock, 
  Video, 
  User, 
  BookOpen, 
  Layout, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import Image from 'next/image';

export default function LiveMonitor() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchLiveData = useCallback(async () => {
    try {
      const response = await fetch('/api/live');
      if (!response.ok) throw new Error('Failed to fetch live data');
      const result = await response.json();
      setData(result);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      console.error('Error fetching live data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [fetchLiveData]);

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <School className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">مدرسة الرفعة النموذجية</h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">المراقب المباشر للحصص</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-bold text-slate-900">
                {new Intl.DateTimeFormat('ar-SA', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }).format(new Date())}
              </span>
              <span className="text-xs text-slate-500">آخر تحديث: {lastUpdated.toLocaleTimeString('ar-SA')}</span>
            </div>
            <button 
              onClick={() => { setLoading(true); fetchLiveData(); }}
              className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {error ? (
          <div className="glass-card p-8 text-center max-w-md mx-auto">
            <div className="bg-red-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">عذراً، حدث خطأ</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <button 
              onClick={fetchLiveData}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <>
            {/* Current Period Info */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                  <div className="h-8 w-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 text-indigo-600" />
                  </div>
                  الحصة الحالية
                </h2>
                {data?.currentPeriod && (
                  <div className="flex items-center gap-3 bg-indigo-600 text-white px-4 py-2 rounded-2xl shadow-lg shadow-indigo-100">
                    <span className="text-sm font-black">الحصة {data.currentPeriod.period_number}</span>
                    <div className="h-4 w-[1px] bg-white/30" />
                    <span className="text-sm font-bold">{data.currentPeriod.start_time.slice(0, 5)} - {data.currentPeriod.end_time.slice(0, 5)}</span>
                  </div>
                )}
              </div>

              {!data?.classes || data.classes.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <div className="bg-slate-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{data?.message || 'لا توجد حصص في الوقت الحالي'}</h3>
                  <p className="text-slate-500">سيتم تحديث البيانات تلقائياً عند بدء الحصة القادمة.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence mode="popLayout">
                    {data.classes.map((cls: any, index: number) => (
                      <motion.div
                        key={cls.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}
                        className="glass-card overflow-hidden group hover:shadow-xl hover:shadow-indigo-100/50 transition-all border-none ring-1 ring-slate-200/50"
                      >
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <Layout className="h-6 w-6" />
                              </div>
                              <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">{cls.sections?.classes?.name}</h3>
                                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{cls.sections?.name}</p>
                              </div>
                            </div>
                            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center gap-3 text-slate-600">
                              <BookOpen className="h-5 w-5 text-slate-400" />
                              <span className="text-sm font-bold">المادة: <span className="text-slate-900">{cls.subjects?.name}</span></span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600">
                              <User className="h-5 w-5 text-slate-400" />
                              <span className="text-sm font-bold">المعلم: <span className="text-slate-900">{cls.teachers?.users?.full_name}</span></span>
                            </div>
                          </div>

                          <div className="mt-8">
                            {cls.teachers?.zoom_link ? (
                              <a 
                                href={cls.teachers.zoom_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                              >
                                <Video className="h-5 w-5" />
                                دخول الحصة المباشرة
                              </a>
                            ) : (
                              <div className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-400 rounded-2xl font-bold text-sm cursor-not-allowed">
                                <Video className="h-5 w-5" />
                                رابط الزووم غير متوفر
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 text-center">
        <div className="h-[1px] bg-slate-200 w-full mb-8" />
        <p className="text-sm font-bold text-slate-400">© {new Date().getFullYear()} مدرسة الرفعة النموذجية. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
}
