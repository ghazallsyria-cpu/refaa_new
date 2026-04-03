'use client';

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, Terminal, CheckCircle2, 
  RefreshCw, ShieldCheck, AlertCircle, Zap, Cpu
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { systemLogger } from '@/lib/logger';

/**
 * 🛠️ مستشعر نبض النظام والسيرفر (مُحسن للموبايل)
 * المسار: app/report/page.tsx
 */
export default function SystemReportPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [dbPulse, setDbPulse] = useState(0);
  const [testing, setTesting] = useState(false);

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase.from('error_logs').select('*').order('created_at', { ascending: false }).limit(40);
    if (data) setLogs(data);
  }, []);

  const measurePulse = useCallback(async () => {
    const start = performance.now();
    await supabase.from('platform_settings').select('id').limit(1);
    setDbPulse(Math.round(performance.now() - start));
  }, []);

  useEffect(() => {
    const initializeSystem = async () => {
      await fetchLogs();
      await measurePulse();
      setLoading(false);
    };
    
    initializeSystem();

    const channel = supabase.channel('system_errors')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'error_logs' }, (payload) => {
        setLogs(prev => [payload.new, ...prev.slice(0, 39)]);
      })
      .subscribe();

    const interval = setInterval(() => {
      measurePulse();
    }, 10000);
    
    return () => { 
      supabase.removeChannel(channel); 
      clearInterval(interval); 
    };
  }, [fetchLogs, measurePulse]);

  const fireTestSensor = async () => {
    setTesting(true);
    await systemLogger.log(
      new Error("تم تفعيل مستشعر الاختبار بنجاح من قبل الإدارة."), 
      "info", 
      "MANUAL_TEST_TRIGGER"
    );
    setTimeout(() => setTesting(false), 1000);
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-[#020817] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Terminal className="w-16 h-16 text-indigo-500 animate-pulse mb-2" />
          <p className="text-slate-500 font-mono text-xs uppercase tracking-[0.3em]">Connecting to Core Sensors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020817] text-slate-300 font-mono p-4 sm:p-6 lg:p-8" dir="rtl">
      
      {/* 🚀 Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 bg-slate-900/50 p-6 rounded-3xl border border-white/5 backdrop-blur-xl gap-4">
        <div className="flex items-center gap-4">
          <Activity className="text-indigo-400 animate-pulse w-8 h-8" />
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tighter">LIVE_SYSTEM_TELEMETRY</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Status: Fully Operational | Subscribed to: error_logs</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-emerald-500 font-black text-xs bg-emerald-500/10 px-4 py-2.5 rounded-xl border border-emerald-500/20 flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
            DB_LATENCY: {dbPulse}ms
          </div>
          <button 
            onClick={fireTestSensor} 
            disabled={testing}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 disabled:opacity-50 shadow-[0_0_15px_rgba(79,70,229,0.4)]"
          >
            <Zap className="w-4 h-4" />
            {testing ? 'Firing...' : 'اختبار الرادار'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* 🚀 The Terminal (Log Stream) - Mobile Optimized */}
        <div className="lg:col-span-8 bg-black/60 border border-white/5 rounded-[2.5rem] h-[650px] flex flex-col overflow-hidden shadow-2xl relative">
          <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-50"></div>
          <div className="p-5 border-b border-white/5 bg-white/5 flex items-center justify-between">
            <span className="text-xs font-black text-indigo-400 flex items-center gap-2 uppercase tracking-widest">
              <Terminal className="w-4 h-4"/> Input_Event_Stream
            </span>
            <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400 font-bold">Buffer: {logs.length} Events</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {logs.map(log => {
                const isCritical = log.severity === 'critical';
                const isTest = log.error_type === 'MANUAL_TEST_TRIGGER';
                
                return (
                  <motion.div 
                    key={log.id} 
                    initial={{ opacity: 0, x: -20, backgroundColor: 'rgba(255,255,255,0.1)' }} 
                    animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(0,0,0,0)' }}
                    transition={{ duration: 0.5 }}
                    // 🚀 تصميم ذكي يعرض النص كاملاً في الجوال وشكل جدولي في الكمبيوتر
                    className={`flex flex-col gap-2 p-4 border border-white/5 hover:bg-white/[0.02] transition-colors rounded-2xl ${
                      isCritical ? 'bg-rose-500/[0.03] border-rose-500/20' : 
                      isTest ? 'bg-indigo-500/[0.05] border-indigo-500/20' : 'bg-white/[0.01]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] opacity-40 font-bold">[{new Date(log.created_at).toLocaleTimeString()}]</span>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isCritical ? 'text-rose-500' : isTest ? 'text-indigo-400' : 'text-amber-400'}`}>
                          {log.error_type}
                        </span>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded bg-white/5 ${isCritical ? 'text-rose-500 animate-pulse' : isTest ? 'text-indigo-400' : 'text-emerald-500'}`}>
                        {log.severity}
                      </span>
                    </div>
                    
                    <div className="text-xs text-slate-300 leading-relaxed whitespace-normal font-medium">
                      {log.message}
                    </div>

                    <div className="mt-1">
                       <span className="text-[9px] font-bold text-slate-500 uppercase bg-slate-900 px-2 py-0.5 rounded border border-white/5">
                         USER: {log.user_role}
                       </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {logs.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                <CheckCircle2 className="w-16 h-16 mb-4" />
                <p className="text-sm">System Operating Normally. No Logs.</p>
              </div>
            )}
          </div>
        </div>

        {/* 🚀 System Health Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
            <h3 className="text-xs font-black text-emerald-400 uppercase mb-6 flex items-center gap-2 tracking-[0.2em] relative z-10">
              <ShieldCheck className="w-5 h-5" /> Active_Protection
            </h3>
            <div className="space-y-4 relative z-10">
               <div className="p-5 bg-slate-950/60 rounded-2xl border border-emerald-500/10">
                 <p className="text-[10px] font-black text-emerald-500 uppercase mb-2 tracking-widest flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                   Telemetry Link Stable
                 </p>
                 <p className="text-xs text-slate-400 leading-relaxed font-bold">
                   محرك تسجيل الأخطاء (System Logger) يعمل بكفاءة. يتم الآن رصد أخطاء المستخدمين، فشل الاتصال، ومحاولات الدخول الخاطئة وإرسالها مباشرة إلى هذه الشاشة.
                 </p>
               </div>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-8">
             <h3 className="text-xs font-black text-sky-400 uppercase mb-4 flex items-center gap-2">
              <Cpu className="w-5 h-5" /> Db_Pulse_Meter
            </h3>
            <div className="space-y-6">
               <div className="flex items-baseline justify-between mb-2">
                  <span className="text-4xl font-black text-white">{dbPulse}</span>
                  <span className="text-xs text-slate-500 font-bold">ms Latency</span>
               </div>
               <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                 <motion.div 
                    animate={{ width: `${Math.min((dbPulse/200)*100, 100)}%` }} 
                    transition={{ type: "spring" }}
                    className={`h-full ${dbPulse > 100 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                 />
               </div>
               <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Measuring round-trip time between Edge Network and Supabase Core.</p>
            </div>
          </div>
        </div>

      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.4); }
      `}</style>
    </div>
  );
}
