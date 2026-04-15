'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Quote, Edit, Save, Award, School, Mail, Phone } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useProfileSystem } from '@/hooks/useProfileSystem';

export default function AdminProfilePage() {
  const { user } = useAuth();
  const { loading, fetchAdminProfile, updateAdminVision } = useProfileSystem();
  const [data, setData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [visionText, setVisionText] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchAdminProfile(user.id).then(res => {
        setData(res);
        setVisionText(res?.schoolSettings?.message || 'أهلاً بكم في صرحنا التعليمي المتميز...');
      });
    }
  }, [user, fetchAdminProfile]);

  const handleSaveVision = async () => {
    const success = await updateAdminVision(visionText);
    if (success) setIsEditing(false);
  };

  if (loading || !data) return <div className="flex h-[80vh] justify-center items-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div></div>;

  const { admin, schoolSettings } = data;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 font-cairo" dir="rtl">
      
      {/* الغلاف والبطاقة الشخصية */}
      <div className="relative rounded-[3rem] bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 p-1 shadow-2xl overflow-hidden mb-12">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/20 rounded-full blur-[80px]"></div>
        
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.8rem] p-8 sm:p-12 relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8 text-center md:text-right">
          <div className="relative">
            <div className="h-32 w-32 sm:h-40 sm:w-40 rounded-full border-4 border-amber-400 p-1 shadow-[0_0_30px_rgba(251,191,36,0.3)]">
              <div className="h-full w-full rounded-full bg-gradient-to-br from-indigo-500 to-slate-800 flex items-center justify-center overflow-hidden">
                {admin.avatar_url ? <img src={admin.avatar_url} className="object-cover h-full w-full" alt="avatar" /> : <Shield className="h-16 w-16 text-amber-400" />}
              </div>
            </div>
            <div className="absolute -bottom-2 left-1/2 md:left-0 -translate-x-1/2 md:translate-x-0 bg-amber-500 text-slate-900 text-xs font-black px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1 border-2 border-slate-900">
              <Award className="w-3 h-3" /> مدير المدرسة
            </div>
          </div>

          <div className="flex-1 space-y-4 pt-4">
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">{admin.full_name}</h1>
            <p className="text-indigo-200 font-bold text-lg">{schoolSettings?.school_name || 'مدرسة الرفعة النموذجية'}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl text-white font-bold border border-white/10"><Mail className="w-4 h-4 text-amber-400"/> {admin.email}</div>
              {admin.phone && <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl text-white font-bold border border-white/10"><Phone className="w-4 h-4 text-amber-400"/> {admin.phone}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* قسم فلسفة ورؤية المدير */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-lg border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-orange-500"></div>
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-amber-50 rounded-2xl text-amber-600"><Quote className="w-8 h-8" /></div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">كلمة الإدارة العليا</h2>
              <p className="text-slate-500 font-bold text-sm">الرؤية والفلسفة التعليمية للمدرسة</p>
            </div>
          </div>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="p-3 bg-slate-50 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"><Edit className="w-5 h-5" /></button>
          ) : (
            <button onClick={handleSaveVision} className="px-6 py-3 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-600 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-200"><Save className="w-5 h-5" /> حفظ الرؤية</button>
          )}
        </div>

        {isEditing ? (
          <textarea value={visionText} onChange={(e) => setVisionText(e.target.value)} className="w-full h-48 p-6 bg-slate-50 border-2 border-indigo-100 rounded-3xl font-bold text-slate-700 leading-relaxed outline-none focus:border-indigo-500 transition-colors resize-none" placeholder="اكتب كلمتك الترحيبية ورؤيتك للمدرسة هنا..."></textarea>
        ) : (
          <div className="relative">
            <Quote className="absolute -right-4 -top-4 w-24 h-24 text-slate-50 opacity-50 rotate-180 pointer-events-none" />
            <p className="text-lg md:text-xl font-bold text-slate-700 leading-loose whitespace-pre-wrap relative z-10 pl-8">{visionText}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
