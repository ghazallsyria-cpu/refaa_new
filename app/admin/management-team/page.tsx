'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { 
  ShieldCheck, UserPlus, Mail, Lock, Briefcase, 
  Users, Trash2, Edit, CheckCircle2, Loader2, ArrowRight, Bug,
  X // ✅ تم إضافة حرف X هنا ليتم التعرف على الأيقونة
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface Manager {
  id: string;
  full_name: string;
  email: string;
  role: string;
  job_title: string;
}

export default function ManagementTeamPage() {
  const { authRole } = useAuth() as any; // 🚀 أضفنا as any لتجنب أخطاء النوع في Build
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🚀 شاشة التشخيص (Debug State)
  const [debugLog, setDebugLog] = useState<string>('جاري الاتصال بقاعدة البيانات...');
  const [debugStatus, setDebugStatus] = useState<'loading' | 'error' | 'empty' | 'success'>('loading');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    jobTitle: 'مشرف عام'
  });

  const jobTitles = [
    'مشرف عام',
    'أخصائي اجتماعي',
    'أخصائي نفسي',
    'محاسب مالي',
    'وكيل شؤون طلاب',
    'مدير نظام (IT)'
  ];

  const fetchManagers = async () => {
    setLoading(true);
    setDebugStatus('loading');
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .in('role', ['admin', 'management']);

      if (error) {
        setDebugStatus('error');
        setDebugLog(`[Supabase Error]:\n${JSON.stringify(error, null, 2)}`);
        throw error;
      }

      if (!data || data.length === 0) {
        setDebugStatus('empty');
        setDebugLog(`[Empty Data]: نجح الاتصال لكن الجدول فارغ.`);
      } else {
        setDebugStatus('success');
        setDebugLog(`[Success]: تم جلب ${data.length} سجل.`);
        
        const formattedData = data.map(u => ({
          ...u,
          job_title: u.role === 'admin' ? 'المدير العام (المالك)' : 'عضو فريق الإدارة'
        }));
        setManagers(formattedData as Manager[]);
      }
    } catch (err: any) {
      console.error(err);
      setDebugStatus('error');
      setDebugLog(`[Catch Error]:\n${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/create-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await res.json();
      
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'حدث خطأ أثناء الإنشاء');
      }

      setShowSuccess(true);
      setIsModalOpen(false);
      setFormData({ fullName: '', email: '', password: '', jobTitle: 'مشرف عام' });
      fetchManagers();
      
      setTimeout(() => setShowSuccess(false), 4000);

    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authRole !== 'admin') {
    return <div className="p-10 text-center font-bold text-rose-600">هذه الصفحة مخصصة للمدير العام فقط.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24" dir="rtl">
      
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2.5 rounded-2xl bg-slate-50 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-slate-200">
              <ArrowRight className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-indigo-600" /> فريق الإدارة والصلاحيات
              </h1>
            </div>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-2xl font-black shadow-lg hover:bg-indigo-600 transition-all active:scale-95 text-sm">
            <UserPlus className="w-4 h-4" /> تعيين إداري جديد
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* شاشة التشخيص */}
        <div className={`mb-8 p-6 rounded-[2rem] border-2 shadow-sm ${
          debugStatus === 'loading' ? 'bg-slate-900 border-slate-700' :
          debugStatus === 'error' ? 'bg-rose-950 border-rose-700' :
          debugStatus === 'empty' ? 'bg-amber-950 border-amber-700' :
          'bg-emerald-950 border-emerald-700'
        }`}>
          <div className="flex items-center gap-3 mb-4 text-white">
            <Bug className="w-6 h-6" />
            <h3 className="font-black text-lg">شاشة التشخيص السحابية</h3>
          </div>
          <pre className="bg-black/50 p-4 rounded-xl text-white/90 font-mono text-sm whitespace-pre-wrap overflow-x-auto" dir="ltr">
            {debugLog}
          </pre>
        </div>

        {loading ? (
           <div className="flex justify-center py-10"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>
        ) : (
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse min-w-[600px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-5 font-black text-slate-500 text-sm">عضو الإدارة</th>
                    <th className="p-5 font-black text-slate-500 text-sm">البريد الإلكتروني</th>
                    <th className="p-5 font-black text-slate-500 text-sm">المسمى الوظيفي</th>
                    <th className="p-5 font-black text-slate-500 text-sm text-center">الصلاحية التقنية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {managers.map(manager => (
                    <tr key={manager.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${manager.role === 'admin' ? 'bg-rose-500' : 'bg-indigo-500'}`}>
                             <Users className="w-5 h-5" />
                          </div>
                          <span className="font-black text-slate-900 whitespace-nowrap">{manager.full_name}</span>
                        </div>
                      </td>
                      <td className="p-5 text-slate-600 font-bold whitespace-nowrap" dir="ltr">{manager.email}</td>
                      <td className="p-5">
                        <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-xs font-bold border border-slate-200 whitespace-nowrap">
                          {manager.job_title}
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <span className={`px-3 py-1 rounded-lg text-xs font-black border whitespace-nowrap ${manager.role === 'admin' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                          {manager.role === 'admin' ? 'Admin (المالك)' : 'Management (إدارة)'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
              
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><UserPlus className="w-5 h-5 text-indigo-600"/> تعيين إداري</h2>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5"/></button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-2">الاسم الكامل</label>
                  <input type="text" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-2">البريد الإلكتروني</label>
                  <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} dir="ltr" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-2">كلمة المرور</label>
                  <input type="password" required minLength={6} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} dir="ltr" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="submit" disabled={isSubmitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'إنشاء الحساب'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccess && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-xl z-50 flex items-center gap-3">
             <CheckCircle2 className="w-5 h-5" /> <span className="font-bold text-sm">تمت الإضافة بنجاح!</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
