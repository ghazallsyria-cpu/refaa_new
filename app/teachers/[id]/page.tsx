'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, GraduationCap, Crown, BookOpen, FileText, ChevronLeft, 
  Briefcase, Layers, Edit3, Save, X, Quote, Link as LinkIcon, Award, Star,
  Plus, AlertCircle // 🚀 تم إضافة الأيقونتين المفقودتين هنا!
} from 'lucide-react';
import { useProfileSystem } from '@/hooks/useProfileSystem';
import { getParentDepartment } from '@/hooks/useHierarchySystem'; 
import { useAuth } from '@/context/auth-context';

// قاموس الثيمات الفخمة
const THEMES: Record<string, { bg: string, text: string, border: string, name: string }> = {
  royal: { bg: 'from-indigo-600 to-blue-700', text: 'text-indigo-600', border: 'border-indigo-200', name: 'أزرق ملكي' },
  emerald: { bg: 'from-emerald-500 to-teal-700', text: 'text-emerald-600', border: 'border-emerald-200', name: 'أخضر زمردي' },
  gold: { bg: 'from-amber-500 to-orange-600', text: 'text-amber-600', border: 'border-amber-200', name: 'ذهبي كلاسيكي' },
  cosmic: { bg: 'from-purple-600 to-pink-700', text: 'text-purple-600', border: 'border-purple-200', name: 'أرجواني كوني' },
  slate: { bg: 'from-slate-700 to-slate-900', text: 'text-slate-700', border: 'border-slate-200', name: 'رمادي داكن' }
};

export default function TeacherProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { loading, fetchTeacherProfile, updateTeacherProfileSettings } = useProfileSystem();
  
  const [data, setData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // حالة الإعدادات الشخصية (JSONB)
  const [profileSettings, setProfileSettings] = useState({
    theme: 'royal',
    bio: '',
    achievements: [''],
    youtube: '',
    linkedin: ''
  });

  useEffect(() => {
    if (id) {
      fetchTeacherProfile(id as string).then(res => {
        setData(res);
        if (res?.profile_settings) {
          setProfileSettings({
            theme: res.profile_settings.theme || 'royal',
            bio: res.profile_settings.bio || '',
            achievements: res.profile_settings.achievements?.length ? res.profile_settings.achievements : [''],
            youtube: res.profile_settings.youtube || '',
            linkedin: res.profile_settings.linkedin || ''
          });
        }
      });
    }
  }, [id, fetchTeacherProfile]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    // تنظيف الإنجازات الفارغة
    const cleanedSettings = {
      ...profileSettings,
      achievements: profileSettings.achievements.filter(a => a.trim() !== '')
    };
    const success = await updateTeacherProfileSettings(id as string, cleanedSettings);
    if (success) {
      const refreshed = await fetchTeacherProfile(id as string, true);
      setData(refreshed);
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  const addAchievementField = () => setProfileSettings({...profileSettings, achievements: [...profileSettings.achievements, '']});
  const updateAchievement = (index: number, value: string) => {
    const newArr = [...profileSettings.achievements];
    newArr[index] = value;
    setProfileSettings({...profileSettings, achievements: newArr});
  };

  if (loading || !data) return <div className="flex h-[80vh] justify-center items-center"><div className="animate-spin rounded-full h-14 w-14 border-4 border-indigo-600 border-t-transparent"></div></div>;

  const isHOD = data.department_heads && data.department_heads.length > 0;
  const customTitles = data.custom_titles || [];
  const sectionsTaught = data.teacher_sections || [];
  const parentDept = getParentDepartment(data.specialization);
  const activeTheme = THEMES[profileSettings.theme] || THEMES['royal'];
  
  // السماح بالتعديل إذا كان الزائر هو المعلم نفسه أو كان الزائر مدير النظام
  const canEdit = user?.id === data.id || user?.role === 'admin' || user?.role === 'management';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 font-cairo" dir="rtl">
      
      {/* شريط الأزرار العلوي */}
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-black transition-colors bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
          <ChevronLeft className="w-5 h-5" /> العودة
        </button>
        
        {canEdit && !isEditing && (
          <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-slate-900 text-white font-black px-5 py-2.5 rounded-xl shadow-lg hover:bg-slate-800 transition-all hover:-translate-y-0.5">
            <Edit3 className="w-4 h-4" /> تخصيص ملفي الشخصي
          </button>
        )}
      </div>

      {/* 👑 الهيدر الفخم (يتغير لونه حسب الثيم المختار) */}
      <motion.div layout className={`relative rounded-[3rem] p-1 shadow-2xl mb-10 overflow-hidden bg-gradient-to-r ${activeTheme.bg}`}>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        
        <div className="bg-white/95 backdrop-blur-xl rounded-[2.8rem] p-8 sm:p-12 relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8 text-center md:text-right">
          <div className="relative shrink-0">
            <div className={`h-36 w-36 rounded-[2.5rem] flex items-center justify-center text-6xl font-black shadow-inner border-4 bg-slate-50 ${activeTheme.text} ${activeTheme.border}`}>
              {data.users?.avatar_url ? <img src={data.users.avatar_url} className="w-full h-full rounded-[2.2rem] object-cover" alt="avatar"/> : data.users?.full_name?.charAt(0)}
            </div>
            {isHOD && <Crown className="absolute -top-4 -right-4 h-12 w-12 text-yellow-500 drop-shadow-lg animate-bounce" />}
          </div>

          <div className="flex-1 space-y-3 pt-2">
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">{data.users?.full_name}</h1>
            <p className="text-slate-500 font-bold font-mono tracking-widest">{data.national_id}</p>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-4">
              {isHOD && <span className="px-4 py-1.5 bg-amber-100 text-amber-700 font-black text-xs rounded-xl border border-amber-200 flex items-center gap-1"><Crown className="w-3 h-3"/> رئيس قسم {data.department_heads[0]?.subject?.name}</span>}
              <span className="px-4 py-1.5 bg-slate-100 text-slate-600 font-black text-xs rounded-xl border border-slate-200">قسم {parentDept}</span>
              <span className={`px-4 py-1.5 font-black text-xs rounded-xl border bg-white shadow-sm ${activeTheme.text} ${activeTheme.border}`}>{data.specialization || 'عام'}</span>
              {customTitles.map((t: string, i: number) => <span key={i} className="px-4 py-1.5 bg-slate-800 text-white font-black text-xs rounded-xl shadow-sm">{t}</span>)}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ✍️ نافذة التعديل الإبداعية */}
      <AnimatePresence>
        {isEditing && (
          <motion.div initial={{ opacity: 0, height: 0, y: -20 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -20 }} className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-indigo-100 mb-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Star className="text-yellow-500"/> اللمسة الإبداعية للملف</h3>
              <button onClick={() => setIsEditing(false)} className="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 rounded-full"><X className="w-5 h-5"/></button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 block">لون واجهة الملف (Theme)</label>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(THEMES).map(([key, theme]) => (
                      <button key={key} onClick={() => setProfileSettings({...profileSettings, theme: key})} className={`px-4 py-2 rounded-xl text-xs font-black border-2 transition-all ${profileSettings.theme === key ? 'border-slate-900 shadow-md scale-105' : 'border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                        <div className={`w-3 h-3 rounded-full inline-block ml-2 bg-gradient-to-r ${theme.bg}`}></div> {theme.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 block">نبذة وفلسفة تعليمية</label>
                  <textarea value={profileSettings.bio} onChange={(e) => setProfileSettings({...profileSettings, bio: e.target.value})} placeholder="اكتب مقولة تؤمن بها أو نبذة قصيرة عن أسلوبك في التدريس..." className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-500 resize-none"></textarea>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 block">الإنجازات والشهادات</label>
                  <div className="space-y-3">
                    {profileSettings.achievements.map((ach, idx) => (
                      <div key={idx} className="flex gap-2">
                        <div className="w-8 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center font-black shrink-0"><Award className="w-4 h-4"/></div>
                        <input type="text" value={ach} onChange={(e) => updateAchievement(idx, e.target.value)} placeholder="مثال: معلم مايكروسوفت الخبير 2025" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 font-bold outline-none focus:border-indigo-500 text-sm"/>
                      </div>
                    ))}
                    <button onClick={addAchievementField} className="text-xs font-black text-indigo-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3"/> إضافة إنجاز آخر</button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 block">روابط مهنية للتواصل</label>
                  <div className="space-y-3">
                    <input type="text" value={profileSettings.youtube} onChange={(e) => setProfileSettings({...profileSettings, youtube: e.target.value})} placeholder="رابط قناة يوتيوب التعليمية..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold outline-none focus:border-red-500 text-sm text-left" dir="ltr"/>
                    <input type="text" value={profileSettings.linkedin} onChange={(e) => setProfileSettings({...profileSettings, linkedin: e.target.value})} placeholder="رابط حساب LinkedIn..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold outline-none focus:border-blue-500 text-sm text-left" dir="ltr"/>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
              <button disabled={isSaving} onClick={handleSaveProfile} className="bg-slate-900 text-white font-black px-10 py-3.5 rounded-xl shadow-xl hover:bg-slate-800 transition-all flex items-center gap-2">
                {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Save className="w-5 h-5"/> حفظ ونشر الملف</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 قسم عرض المحتوى الإبداعي (إذا كان موجوداً) */}
      {(profileSettings.bio || profileSettings.achievements.filter(a => a).length > 0 || profileSettings.youtube || profileSettings.linkedin) && !isEditing && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          
          {/* النبذة والفلسفة */}
          {profileSettings.bio && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`lg:col-span-2 bg-gradient-to-br ${activeTheme.bg} p-8 rounded-[2.5rem] shadow-lg text-white relative overflow-hidden`}>
              <Quote className="absolute -left-4 -top-4 w-32 h-32 opacity-10 rotate-180 pointer-events-none" />
              <h3 className="text-sm font-black text-white/70 uppercase tracking-widest mb-4">النبذة والفلسفة التعليمية</h3>
              <p className="text-lg md:text-xl font-bold leading-loose relative z-10 whitespace-pre-wrap">{profileSettings.bio}</p>
            </motion.div>
          )}

          {/* الإنجازات والروابط */}
          <div className={`space-y-6 ${!profileSettings.bio ? 'lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8 space-y-0' : ''}`}>
            {profileSettings.achievements.filter(a => a).length > 0 && (
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2"><Award className="text-amber-500 w-5 h-5"/> لوحة الشرف والإنجازات</h3>
                <ul className="space-y-3">
                  {profileSettings.achievements.filter(a => a).map((ach, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm font-bold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <Star className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" /> {ach}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(profileSettings.youtube || profileSettings.linkedin) && (
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2"><LinkIcon className="text-blue-500 w-5 h-5"/> منصات التواصل المهني</h3>
                <div className="flex gap-3">
                  {profileSettings.youtube && <a href={profileSettings.youtube} target="_blank" rel="noreferrer" className="flex-1 bg-red-50 text-red-600 font-black text-xs py-3 rounded-xl text-center border border-red-100 hover:bg-red-600 hover:text-white transition-colors">YouTube القناة</a>}
                  {profileSettings.linkedin && <a href={profileSettings.linkedin} target="_blank" rel="noreferrer" className="flex-1 bg-blue-50 text-blue-600 font-black text-xs py-3 rounded-xl text-center border border-blue-100 hover:bg-blue-600 hover:text-white transition-colors">LinkedIn حساب</a>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 📊 القسم الأكاديمي (الإنتاجية والفصول) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2"><Briefcase className="w-5 h-5 text-indigo-500"/> الإنتاجية الأكاديمية</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 text-center">
                <FileText className="w-8 h-8 text-blue-500 mx-auto mb-2 opacity-50" />
                <p className="text-3xl font-black text-slate-800">{data.stats.exams}</p>
                <p className="text-xs font-bold text-slate-400 uppercase mt-1">اختبارات منشأة</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 text-center">
                <BookOpen className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-50" />
                <p className="text-3xl font-black text-slate-800">{data.stats.assignments}</p>
                <p className="text-xs font-bold text-slate-400 uppercase mt-1">واجبات مطروحة</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 h-full">
            <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Users className="w-6 h-6"/></div>
              الفصول الموكلة حالياً
            </h3>
            
            {sectionsTaught.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-bold">لم يتم إسناد أي فصول لهذا المعلم بعد.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sectionsTaught.map((ts: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-white transition-all shadow-sm group">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-black text-slate-800">{ts.section?.classes?.name} - {ts.section?.name}</p>
                      <p className="text-xs font-bold text-slate-500 mt-1">مادة: {ts.subjects?.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
