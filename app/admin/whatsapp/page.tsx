'use client';

import { useState, useEffect } from 'react';
import { Send, Users, Clock, AlertTriangle, CheckCircle2, Loader2, MessageSquare, Activity, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

export default function WhatsAppCampaignsPage() {
  const { user } = useAuth() as any;
  const [message, setMessage] = useState('');
  const [audienceType, setAudienceType] = useState('students');
  const [classId, setClassId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      const { data: clsData } = await supabase.from('classes').select('id, name, level').order('level');
      if (clsData) setClasses(clsData);

      const { data: campsData } = await supabase.from('whatsapp_campaigns')
        .select('id, message, audience_type, status, created_at')
        .order('created_at', { ascending: false }).limit(5);
      if (campsData) setCampaigns(campsData);
    }
    loadData();

    // استماع للتحديثات المباشرة (Real-time) لحالة الحملات
    const sub = supabase.channel('campaigns_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'whatsapp_campaigns' }, 
      (payload) => {
        setCampaigns(current => current.map(c => c.id === payload.new.id ? { ...c, status: payload.new.status } : c));
      }).subscribe();

    return () => { supabase.removeChannel(sub); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;
    setIsSubmitting(true); setFeedback(null);

    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, audienceType, classId: audienceType === 'class' ? classId : null, scheduledAt: scheduledAt || null, userId: user.id })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setFeedback({ type: 'success', text: 'تم إرسال الحملة للطابور بنجاح!' });
      setMessage(''); setScheduledAt('');
      
      // تحديث الجدول محلياً
      setCampaigns([{ id: data.campaignId, message, audience_type: audienceType, status: 'pending', created_at: new Date().toISOString() }, ...campaigns].slice(0, 5));
    } catch (error: any) {
      setFeedback({ type: 'error', text: error.message || 'فشل إرسال الحملة.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-black">في الانتظار ⏳</span>;
      case 'processing': return <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-black animate-pulse">جاري الإرسال 🔄</span>;
      case 'completed': return <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-black">مكتمل ✅</span>;
      case 'failed': return <span className="px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-black">فشل ❌</span>;
      default: return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" dir="rtl">
      
      {/* قسم الإرسال */}
      <div className="lg:col-span-7 glass-panel p-8 rounded-[2rem] border border-emerald-500/20 shadow-xl">
        <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-6">
          <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20"><MessageSquare className="w-8 h-8 text-emerald-400" /></div>
          <div>
            <h1 className="text-3xl font-black text-white">نظام الواتساب المركزي</h1>
            <p className="text-slate-400 font-bold mt-1">إرسال الإشعارات المجمعة والآمنة</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-300 uppercase flex items-center gap-2"><Users className="w-4 h-4 text-emerald-400" /> الفئة المستهدفة</label>
            <select value={audienceType} onChange={(e) => setAudienceType(e.target.value)} className="w-full glass-input p-4 text-sm font-bold appearance-none bg-[#0f1423] rounded-xl border border-white/10">
              <option value="students">جميع الطلاب</option>
              <option value="parents">جميع أولياء الأمور</option>
              <option value="teachers">جميع المعلمين</option>
              <option value="class">طلاب صف محدد</option>
            </select>
          </div>

          {audienceType === 'class' && (
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-300 uppercase">اختر الصف</label>
              <select value={classId} onChange={(e) => setClassId(e.target.value)} required className="w-full glass-input p-4 text-sm font-bold appearance-none bg-[#0f1423] rounded-xl border border-white/10">
                <option value="">-- اختر صفاً --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name} (المستوى {c.level})</option>)}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-black text-slate-300 uppercase flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-400" /> محتوى الرسالة</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={5} placeholder="اكتب رسالتك هنا..." className="w-full glass-input p-4 text-sm font-bold rounded-xl border border-white/10 resize-none" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black text-slate-300 uppercase flex items-center gap-2"><Clock className="w-4 h-4 text-emerald-400" /> جدولة الإرسال (اختياري)</label>
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} style={{ colorScheme: 'dark' }} className="w-full glass-input p-4 text-sm font-bold rounded-xl border border-white/10" />
          </div>

          {feedback && (
            <div className={`p-4 rounded-xl font-black text-sm flex items-center gap-3 ${feedback.type === 'error' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'} border`}>
              {feedback.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
              {feedback.text}
            </div>
          )}

          <button type="submit" disabled={isSubmitting || !message.trim() || (audienceType === 'class' && !classId)} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> إرسال الحملة للطابور</>}
          </button>
        </form>
      </div>

      {/* قسم متابعة الحملات (Dashboard) */}
      <div className="lg:col-span-5 space-y-6">
        <div className="glass-panel p-6 rounded-[2rem] border border-white/10">
          <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
             <Activity className="w-6 h-6 text-blue-400" />
             <h2 className="text-xl font-black text-white">رادار الحملات المباشر</h2>
          </div>
          <div className="space-y-4">
             {campaigns.length > 0 ? campaigns.map((camp) => (
                <div key={camp.id} className="bg-[#02040a]/40 p-4 rounded-2xl border border-white/5 flex flex-col gap-3 shadow-inner">
                   <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black text-slate-400 bg-white/5 px-2 py-1 rounded border border-white/10">{camp.audience_type}</span>
                      {getStatusBadge(camp.status)}
                   </div>
                   <p className="text-sm font-bold text-white line-clamp-2 leading-relaxed">{camp.message}</p>
                   <p className="text-[9px] font-bold text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(camp.created_at), 'd MMM yyyy - hh:mm a', { locale: arSA })}</p>
                </div>
             )) : (
                <div className="text-center py-10 text-slate-500 font-bold text-sm">لا توجد حملات سابقة</div>
             )}
          </div>
        </div>
      </div>

    </div>
  );
}
