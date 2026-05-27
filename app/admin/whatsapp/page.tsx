'use client';

import { useState, useEffect } from 'react';
import { Send, Users, Clock, AlertTriangle, CheckCircle2, Loader2, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export default function WhatsAppCampaignsPage() {
  const { user } = useAuth() as any;
  const [message, setMessage] = useState('');
  const [audienceType, setAudienceType] = useState('students');
  const [classId, setClassId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // جلب قائمة الفصول من قاعدة البيانات لملء القائمة المنسدلة
  useEffect(() => {
    async function fetchClasses() {
      const { data } = await supabase.from('classes').select('id, name, level').order('level');
      if (data) setClasses(data);
    }
    fetchClasses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;
    
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          audienceType,
          classId: audienceType === 'class' ? classId : null,
          scheduledAt: scheduledAt || null,
          userId: user.id
        })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setFeedback({ type: 'success', text: 'تم إنشاء حملة الواتساب وإرسالها للطابور بنجاح!' });
      setMessage('');
      setScheduledAt('');
      
    } catch (error: any) {
      setFeedback({ type: 'error', text: error.message || 'فشل إرسال الحملة.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8" dir="rtl">
      <div className="glass-panel p-8 rounded-[2rem] border border-emerald-500/20 shadow-xl">
        
        <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-6">
          <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
            <MessageSquare className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">إرسال إشعارات واتساب</h1>
            <p className="text-slate-400 font-bold mt-1">نظام الإرسال المجمع والآمن عبر Evolution API</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* اختيار الجمهور */}
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-300 uppercase flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" /> الفئة المستهدفة
            </label>
            <select 
              value={audienceType} 
              onChange={(e) => setAudienceType(e.target.value)}
              className="w-full glass-input p-4 text-sm font-bold appearance-none bg-[#0f1423] rounded-xl border border-white/10 focus:border-emerald-500/50"
            >
              <option value="students">جميع الطلاب</option>
              <option value="parents">جميع أولياء الأمور</option>
              <option value="teachers">جميع المعلمين</option>
              <option value="class">طلاب صف محدد</option>
            </select>
          </div>

          {/* اختيار الصف (يظهر فقط إذا كان الجمهور هو "صف محدد") */}
          {audienceType === 'class' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
              <label className="text-sm font-black text-slate-300 uppercase">اختر الصف</label>
              <select 
                value={classId} 
                onChange={(e) => setClassId(e.target.value)}
                required
                className="w-full glass-input p-4 text-sm font-bold appearance-none bg-[#0f1423] rounded-xl border border-white/10"
              >
                <option value="">-- اختر صفاً --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} (المستوى {c.level})</option>
                ))}
              </select>
            </motion.div>
          )}

          {/* نص الرسالة */}
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-300 uppercase flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" /> محتوى الرسالة
            </label>
            <textarea 
              value={message} 
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              placeholder="اكتب رسالتك هنا..."
              className="w-full glass-input p-4 text-sm font-bold rounded-xl border border-white/10 resize-none focus:border-emerald-500/50"
            />
          </div>

          {/* الجدولة (اختياري) */}
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-300 uppercase flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" /> جدولة الإرسال (اختياري)
            </label>
            <input 
              type="datetime-local" 
              value={scheduledAt} 
              onChange={(e) => setScheduledAt(e.target.value)}
              style={{ colorScheme: 'dark' }}
              className="w-full glass-input p-4 text-sm font-bold rounded-xl border border-white/10 focus:border-emerald-500/50"
            />
            <p className="text-[10px] text-slate-500 font-bold">اتركه فارغاً للإرسال الفوري.</p>
          </div>

          {/* رسائل النجاح والخطأ */}
          {feedback && (
            <div className={`p-4 rounded-xl font-black text-sm flex items-center gap-3 ${feedback.type === 'error' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
              {feedback.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
              {feedback.text}
            </div>
          )}

          {/* زر الإرسال */}
          <button 
            type="submit" 
            disabled={isSubmitting || !message.trim() || (audienceType === 'class' && !classId)}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> إرسال / جدولة الحملة</>}
          </button>

        </form>
      </div>
    </div>
  );
}
