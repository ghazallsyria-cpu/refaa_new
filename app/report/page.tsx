'use client';

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, CheckCircle2, ShieldCheck, AlertCircle, Zap, 
  Cpu, Server, Wifi, Info, ShieldAlert
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { systemLogger } from '@/lib/logger';

// ==========================================
// 🛡️ شاشة استقرار المنظومة (Executive System Health Dashboard)
// المسار: app/report/page.tsx
// الهدف: تحويل السجلات التقنية المعقدة إلى لوحة قيادة يفهمها المدير المدرسي،
// لمراقبة صحة السيرفرات والأخطاء اللحظية دون الحاجة لخبرة برمجية.
// ==========================================
export default function SystemReportPage() {
  // ==========================================
  // 🎛️ إدارة حالة النظام (System State Management)
  // ==========================================
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [dbPulse, setDbPulse] = useState(0);
  const [testing, setTesting] = useState(false);
  
  // حساب "درجة صحة النظام" بناءً على الأخطاء الحرجة في آخر 40 سجل
  const systemHealthScore = 100 - (logs.filter(l => l.severity === 'critical').length * 2);

  // ==========================================
  // 📥 جلب السجلات السابقة (Initial Logs Fetch)
  // ==========================================
  const fetchLogs = useCallback(async () => {
    const { data } = await supabase.from('error_logs').select('*').order('created_at', { ascending: false }).limit(40);
    if (data) setLogs(data);
  }, []);

  // ==========================================
  // ⚡ قياس نبض السيرفر (Latency Check)
  // يقوم بعمل استعلام خفيف جداً (1 row) لحساب زمن الذهاب والعودة (Ping)
  // ==========================================
  const measurePulse = useCallback(async () => {
    const start = performance.now();
    await supabase.from('platform_settings').select('id').limit(1);
    setDbPulse(Math.round(performance.now() - start));
  }, []);

  // ==========================================
  // 🔄 تهيئة الاتصال اللحظي (Real-time Subscription)
  // ==========================================
  useEffect(() => {
    const initializeSystem = async () => {
      await fetchLogs();
      await measurePulse();
      setLoading(false);
    };
    
    initializeSystem();

    // الاشتراك في قناة Supabase للحصول على الأخطاء فور حدوثها (Live Stream)
    const channel = supabase.channel('system_errors')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'error_logs' }, (payload) => {
        // إضافة الخطأ الجديد في البداية، مع الاحتفاظ بآخر 39 فقط لمنع إرهاق الذاكرة
        setLogs(prev => [payload.new, ...prev.slice(0, 39)]);
      })
      .subscribe();

    // تحديث نبض السيرفر كل 10 ثواني
    const interval = setInterval(() => {
      measurePulse();
    }, 10000);
    
    return () => { 
      supabase.removeChannel(channel); 
      clearInterval(interval); 
    };
  }, [fetchLogs, measurePulse]);

  // ==========================================
  // 🧪 جهاز اختبار الرادار (Manual Diagnostic Trigger)
  // ==========================================
  const fireTestSensor = async () => {
    setTesting(true);
    // إرسال خطأ وهمي آمن لاختبار هل السيرفر يستقبل البيانات
    await systemLogger.log(
      new Error("تم تفعيل فحص النظام الشامل بنجاح من قبل الإدارة العليا."), 
      "info", 
      "DIAGNOSTIC_TEST"
    );
    setTimeout(() => setTesting(false), 1500);
  };

  // ==========================================
  // 🎨 مكونات واجهة المستخدم (UI Rendering)
  // ==========================================

  // 1. شاشة التحميل (Loading State) - أصبحت أكثر احترافية وأقل "تهكيراً"
  if (loading) {
    return (
      <div className="flex h-screen bg-[#02040a] items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="h-20 w-20 rounded-full border-t-2 border-l-2 border-indigo-500 animate-spin"></div>
            <Server className="absolute inset-0 m-auto w-8 h-8 text-indigo-400 animate-pulse" />
          </div>
          <p className="text-slate-400 font-bold text-sm uppercase tracking-[0.2em] animate-pulse">جاري الاتصال بخوادم الرفعة...</p>
        </div>
      </div>
    );
  }

  // دالة مساعدة لاختيار الأيقونة واللون حسب نوع الخطأ
  const getSeverityStyle = (severity: string, type: string) => {
    if (type === 'DIAGNOSTIC_TEST') return { color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', icon: ShieldCheck, label: 'فحص دوري' };
    if (severity === 'critical') return { color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: ShieldAlert, label: 'عطل حرج' };
    if (severity === 'warning') return { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: AlertCircle, label: 'تحذير' };
    return { color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', icon: Info, label: 'معلومة' };
  };

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-100 p-4 sm:p-6 lg:p-8" dir="rtl">
      
      {/* 🚀 الترويسة العلوية (Header) - بأسلوب الإدارة العليا */}
      <div className="glass-panel p-6 rounded-[2rem] mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
        {/* توهج خلفي */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="flex items-center gap-5 relative z-10">
          <div className="p-4 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
            <Activity className="text-indigo-400 w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">مؤشرات استقرار النظام</h1>
            <p className="text-sm text-slate-400 font-bold mt-1">مراقبة حية لأداء خوادم وقواعد بيانات المنصة</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 relative z-10">
          <button 
            onClick={fireTestSensor} 
            disabled={testing}
            className="flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white px-6 py-3 rounded-2xl text-sm font-black transition-all active:scale-95 disabled:opacity-50 shadow-[0_0_20px_rgba(79,70,229,0.3)]"
          >
            {testing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Zap className="w-5 h-5" />}
            {testing ? 'جاري الفحص...' : 'تشغيل الفحص الشامل'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* 📊 القسم الأيمن: لوحة القيادة المصغرة (Health & Stats) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* بطاقة صحة النظام */}
          <div className="glass-panel p-8 rounded-[2rem] flex flex-col items-center justify-center text-center relative overflow-hidden">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">مؤشر الصحة العام</h3>
            
            <div className="relative flex items-center justify-center mb-4">
              <svg className="w-40 h-40 transform -rotate-90">
                <circle cx="80" cy="80" r="70" stroke="rgba(255,255,255,0.05)" strokeWidth="12" fill="none" />
                <motion.circle 
                  cx="80" cy="80" r="70" 
                  stroke={systemHealthScore > 90 ? '#10b981' : systemHealthScore > 70 ? '#f59e0b' : '#f43f5e'} 
                  strokeWidth="12" fill="none" 
                  strokeDasharray="440" 
                  strokeDashoffset={440 - (440 * Math.max(systemHealthScore, 0)) / 100}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-white">{Math.max(systemHealthScore, 0)}%</span>
              </div>
            </div>
            
            <p className={`text-sm font-bold px-4 py-2 rounded-xl ${systemHealthScore > 90 ? 'bg-emerald-500/10 text-emerald-400' : systemHealthScore > 70 ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {systemHealthScore > 90 ? 'النظام يعمل بكفاءة ممتازة' : systemHealthScore > 70 ? 'يوجد بعض الملاحظات التقنية' : 'تحذير: النظام يواجه صعوبات'}
            </p>
          </div>

          {/* بطاقة سرعة السيرفر */}
          <div className="glass-panel p-8 rounded-[2rem]">
             <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-400" /> سرعة استجابة الخوادم
            </h3>
            <div className="space-y-6">
               <div className="flex items-baseline justify-between mb-2">
                  <span className="text-5xl font-black text-white">{dbPulse}</span>
                  <span className="text-sm text-slate-500 font-bold">ملي/ثانية (ms)</span>
               </div>
               <div className="h-3 w-full bg-slate-800/50 rounded-full overflow-hidden border border-white/5">
                 <motion.div 
                    animate={{ width: `${Math.min((dbPulse/200)*100, 100)}%` }} 
                    transition={{ type: "spring" }}
                    className={`h-full rounded-full ${dbPulse > 150 ? 'bg-rose-500' : dbPulse > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                 />
               </div>
               <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-white/5 p-3 rounded-xl border border-white/5">
                 <Wifi className="w-4 h-4 text-emerald-400" />
                 الخوادم متصلة وتعمل بأداء {dbPulse < 100 ? 'مثالي' : 'مقبول'}.
               </div>
            </div>
          </div>
        </div>

        {/* 📜 القسم الأيسر: شريط الأحداث (Activity Stream) المترجم للمدير */}
        <div className="lg:col-span-8 glass-panel rounded-[2.5rem] h-[700px] flex flex-col overflow-hidden">
          <div className="p-6 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.6)]"></div>
              <h2 className="text-lg font-black text-white">شريط الرصد الآلي (Live Stream)</h2>
            </div>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-500/20 font-bold">
              آخر {logs.length} أحداث
            </span>
          </div>
          
          {/* حاوية السجلات */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* إخفاء شريط التمرير الافتراضي وتجميله بـ Tailwind */}
            <style dangerouslySetInnerHTML={{__html: `
              .hide-scrollbar::-webkit-scrollbar { width: 6px; }
              .hide-scrollbar::-webkit-scrollbar-track { background: transparent; }
              .hide-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
            `}} />
            
            <div className="hide-scrollbar h-full overflow-y-auto pr-2 space-y-4">
              <AnimatePresence initial={false}>
                {logs.map(log => {
                  const style = getSeverityStyle(log.severity, log.error_type);
                  const Icon = style.icon;
                  
                  return (
                    <motion.div 
                      key={log.id} 
                      initial={{ opacity: 0, scale: 0.95, y: 10 }} 
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className={`p-5 border rounded-2xl backdrop-blur-md transition-all hover:bg-white/[0.05] ${style.bg} ${style.border}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl bg-[#02040a]/50 border ${style.border} shrink-0`}>
                          <Icon className={`w-6 h-6 ${style.color}`} />
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-2">
                            <h4 className={`font-black text-sm uppercase tracking-wider ${style.color}`}>
                              {style.label} | {log.error_type.replace(/_/g, ' ')}
                            </h4>
                            <span className="text-[11px] font-bold text-slate-500 bg-[#02040a] px-3 py-1 rounded-lg border border-white/5 shadow-inner">
                              {new Date(log.created_at).toLocaleString('ar-SA', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true })}
                            </span>
                          </div>
                          
                          <p className="text-sm text-slate-300 font-medium leading-relaxed">
                            {/* ترجمة مبسطة لبعض الأخطاء التقنية الشائعة لتناسب الإدارة */}
                            {log.message.includes('fetch') ? 'حدث تأخير في الاستجابة أو انقطاع في إنترنت أحد المستخدمين.' : log.message}
                          </p>

                          <div className="flex items-center gap-2 pt-2">
                            <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-1 rounded border border-white/5">
                              المستخدم: {log.user_role === 'admin' ? 'الإدارة' : log.user_role === 'teacher' ? 'معلم' : log.user_role === 'student' ? 'طالب' : log.user_role}
                            </span>
                            {/* عرض مسار الصفحة فقط إذا كان الخطأ حرجاً */}
                            {log.severity === 'critical' && log.page_url !== 'server-side' && (
                              <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-1 rounded border border-white/5 truncate max-w-[150px]">
                                المسار: {log.page_url.split('/').pop()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {logs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4">
                  <CheckCircle2 className="w-20 h-20 text-emerald-500" />
                  <p className="text-lg font-black text-white">المنظومة مستقرة ولا يوجد أي أحداث طارئة.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
