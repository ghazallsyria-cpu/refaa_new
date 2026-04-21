/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, FileText, ChevronLeft, 
  Briefcase, Edit3, Save, X, Quote, Link as LinkIcon, Award, Star,
  Plus, Heart, Send, Crown, Trash2, Youtube, Linkedin, Sparkles, Loader2, ShieldAlert
} from 'lucide-react';
import { useProfileSystem } from '@/hooks/useProfileSystem';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

/* ─── ألوان الملاحظات (حائط الذكريات) ─── */
const NOTE_STYLES = [
  { bg: '#fef9c3', text: '#713f12', quote: '#ca8a04', meta: '#92400e', tape: '#fde047', avatarBg: '#fde68a', avatarText: '#92400e' },
  { bg: '#fce7f3', text: '#831843', quote: '#db2777', meta: '#9d174d', pin: '#f43f5e', avatarBg: '#fbcfe8', avatarText: '#9d174d' },
  { bg: '#dbeafe', text: '#1e3a8a', quote: '#3b82f6', meta: '#1d4ed8', tape: '#93c5fd', avatarBg: '#bfdbfe', avatarText: '#1d4ed8' },
  { bg: '#dcfce7', text: '#14532d', quote: '#16a34a', meta: '#15803d', pin: '#22c55e', avatarBg: '#bbf7d0', avatarText: '#15803d' },
  { bg: '#ede9fe', text: '#4c1d95', quote: '#7c3aed', meta: '#5b21b6', tape: '#c4b5fd', avatarBg: '#ddd6fe', avatarText: '#5b21b6' },
  { bg: '#ffedd5', text: '#7c2d12', quote: '#ea580c', meta: '#9a3412', pin: '#f97316', avatarBg: '#fed7aa', avatarText: '#9a3412' },
  { bg: '#f0fdf4', text: '#14532d', quote: '#059669', meta: '#065f46', tape: '#6ee7b7', avatarBg: '#a7f3d0', avatarText: '#065f46' },
  { bg: '#fff1f2', text: '#881337', quote: '#e11d48', meta: '#9f1239', pin: '#fb7185', avatarBg: '#fecdd3', avatarText: '#9f1239' },
];

const getRotation = (id: string) => {
  const chars = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rotations = [-3, -2, -1.5, -1, 0.5, 1, 1.8, 2.5, 3];
  return rotations[chars % rotations.length];
};

/* ─── الثيمات المخصصة لملف المعلم ─── */
const THEMES: Record<string, { bg: string, text: string, border: string, name: string, glow: string }> = {
  royal:   { bg: 'from-indigo-600 to-blue-700',   text: 'text-indigo-400',  border: 'border-indigo-500/30',  name: 'أزرق ملكي', glow: 'shadow-indigo-500/20' },
  emerald: { bg: 'from-emerald-500 to-teal-700',  text: 'text-emerald-400', border: 'border-emerald-500/30', name: 'أخضر زمردي', glow: 'shadow-emerald-500/20' },
  gold:    { bg: 'from-amber-500 to-orange-600',  text: 'text-amber-400',   border: 'border-amber-500/30',   name: 'ذهبي كلاسيكي', glow: 'shadow-amber-500/20' },
  cosmic:  { bg: 'from-purple-600 to-pink-700',   text: 'text-purple-400',  border: 'border-purple-500/30',  name: 'أرجواني كوني', glow: 'shadow-purple-500/20' },
  slate:   { bg: 'from-slate-700 to-slate-900',   text: 'text-slate-300',   border: 'border-slate-500/30',   name: 'رمادي داكن', glow: 'shadow-slate-500/20' },
};

export default function TeacherProfilePage() {
  const { id } = useParams();
  const teacherId = Array.isArray(id) ? id[0] : id as string;
  const router = useRouter();
  const { user, isChecking } = useAuth();
  const { loading, fetchTeacherProfile, updateTeacherProfileSettings } = useProfileSystem();

  const [data, setData]               = useState<any>(null);
  const [departmentName, setDepartmentName] = useState<string>('عام'); // إضافة حالة لاسم القسم
  const [isEditing, setIsEditing]     = useState(false);
  const [isSaving, setIsSaving]       = useState(false);
  const [profileSettings, setProfileSettings] = useState({
    theme: 'royal', bio: '', achievements: [''], youtube: '', linkedin: '',
  });

  /* ─── حائط الذكريات ─── */
  const [memories, setMemories]                   = useState<any[]>([]);
  const [newMemory, setNewMemory]                 = useState('');
  const [isSubmittingMemory, setIsSubmittingMemory] = useState(false);
  const [deletingId, setDeletingId]               = useState<string | null>(null);

  const fetchMemories = useCallback(async () => {
    if (!teacherId) return;
    const { data: rows, error } = await supabase
      .from('teacher_memories')
      .select('*, author:users!author_id(full_name, avatar_url, role)')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });
    if (error) { console.error('fetchMemories:', error); return; }
    if (rows) setMemories(rows);
  }, [teacherId]);

  useEffect(() => {
    if (!teacherId || isChecking) return;

    const loadAll = async () => {
      const res = await fetchTeacherProfile(teacherId);
      setData(res);

      // جلب اسم القسم الفعلي
      if (res?.department_id) {
        const { data: deptData } = await supabase.from('academic_departments').select('name').eq('id', res.department_id).single();
        if (deptData) setDepartmentName(deptData.name);
      }

      if (res?.profile_settings) {
        setProfileSettings({
          theme:        res.profile_settings.theme        || 'royal',
          bio:          res.profile_settings.bio          || '',
          achievements: res.profile_settings.achievements?.length ? res.profile_settings.achievements : [''],
          youtube:      res.profile_settings.youtube      || '',
          linkedin:     res.profile_settings.linkedin     || '',
        });
      }
      await fetchMemories();
    };

    loadAll();
  }, [teacherId, fetchTeacherProfile, fetchMemories, isChecking]);

  const handleAddMemory = async () => {
    if (!newMemory.trim() || !user || !teacherId) return;
    setIsSubmittingMemory(true);
    const { error } = await supabase
      .from('teacher_memories')
      .insert([{ teacher_id: teacherId, author_id: user.id, content: newMemory }]);
    if (!error) { setNewMemory(''); await fetchMemories(); }
    else console.error('insert memory:', error);
    setIsSubmittingMemory(false);
  };

  const handleDeleteMemory = async (memoryId: string) => {
    setDeletingId(memoryId);
    const { error } = await supabase
      .from('teacher_memories')
      .delete()
      .eq('id', memoryId);
    if (!error) setMemories(prev => prev.filter(m => m.id !== memoryId));
    else console.error('delete memory:', error);
    setDeletingId(null);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const cleaned = { ...profileSettings, achievements: profileSettings.achievements.filter(a => a.trim()) };
    const success = await updateTeacherProfileSettings(teacherId, cleaned);
    if (success) {
      const refreshed = await fetchTeacherProfile(teacherId, true);
      setData(refreshed);
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  const addAchievementField = () =>
    setProfileSettings({ ...profileSettings, achievements: [...profileSettings.achievements, ''] });

  const updateAchievement = (i: number, v: string) => {
    const arr = [...profileSettings.achievements];
    arr[i] = v;
    setProfileSettings({ ...profileSettings, achievements: arr });
  };

  // 🚀 شاشات الحماية والتحميل بالثيم الملكي
  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#090b14] font-cairo">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
             <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)]"></div>
             <ShieldAlert className="absolute h-8 w-8 text-indigo-400 animate-pulse" />
          </div>
          <p className="text-indigo-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري التحقق من الهوية...</p>
        </div>
      </div>
    );
  }

  if (loading || !data) return (
    <div className="flex h-screen justify-center items-center bg-[#090b14] font-cairo text-slate-100">
      <div className="flex flex-col items-center gap-5">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]" />
        <p className="text-indigo-400 font-black animate-pulse tracking-widest">جاري تحميل الملف الشخصي...</p>
      </div>
    </div>
  );

  const isHOD        = data.department_heads?.length > 0;
  const customTitles = data.custom_titles || [];
  const activeTheme  = THEMES[profileSettings.theme] || THEMES['royal'];
  const canEdit      = user?.id === data.id || user?.role === 'admin' || user?.role === 'management';
  const isTeacher    = user?.id === teacherId;

  return (
    <div className="min-h-screen bg-[#090b14] pb-32 font-cairo text-slate-200 relative overflow-x-hidden pt-6" dir="rtl">
      
      {/* 🚀 الخلفية الزجاجية المضيئة المريحة للعين */}
      <div className="fixed top-1/4 left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-[-10%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[140px] pointer-events-none z-0" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8">

        {/* ─── شريط الأزرار ─── */}
        <div className="flex justify-between items-center">
          <button onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-white font-black transition-colors glass-panel px-5 py-2.5 rounded-2xl shadow-inner border border-white/5 hover:border-indigo-500/30 active:scale-95">
            <ChevronLeft className="w-5 h-5" /> العودة
          </button>
          {canEdit && !isEditing && (
            <button onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-black px-6 py-3 rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:opacity-90 transition-all active:scale-95 border border-indigo-400/50">
              <Edit3 className="w-4 h-4" /> تخصيص ملفي الشخصي
            </button>
          )}
        </div>

        {/* ─── هيدر الملف (المجلة) ─── */}
        <motion.div layout className={`relative rounded-[2.5rem] sm:rounded-[3.5rem] p-1 sm:p-1.5 shadow-2xl overflow-hidden bg-gradient-to-r ${activeTheme.bg} ${activeTheme.glow}`}>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay" />
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-white/10 rounded-full blur-[100px]" />
          
          <div className="bg-[#02040a]/90 backdrop-blur-2xl rounded-[2.2rem] sm:rounded-[3.2rem] p-8 sm:p-12 lg:p-16 relative z-10 flex flex-col md:flex-row items-center md:items-center gap-8 lg:gap-12 text-center md:text-right border border-white/5">
            <div className="relative shrink-0">
              <div className={`h-36 w-36 sm:h-48 sm:w-48 rounded-[2.5rem] sm:rounded-[3rem] flex items-center justify-center text-6xl sm:text-7xl font-black shadow-[0_0_40px_rgba(0,0,0,0.8)] border-4 bg-[#0f1423] ${activeTheme.text} ${activeTheme.border}`}>
                {data.users?.avatar_url
                  ? <img src={data.users.avatar_url} className="w-full h-full rounded-[2.2rem] sm:rounded-[2.7rem] object-cover" alt="avatar" />
                  : <span className="drop-shadow-md">{data.users?.full_name?.charAt(0)}</span>}
              </div>
              {isHOD && <Crown className="absolute -top-6 -right-6 h-14 w-14 sm:h-16 sm:w-16 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)] animate-bounce" />}
            </div>
            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-300 shadow-inner">
                <Sparkles className="w-3.5 h-3.5" /> الملف المهني
              </div>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-md leading-tight">{data.users?.full_name}</h1>
              <p className="text-slate-500 font-bold font-mono tracking-widest text-sm sm:text-base">{data.national_id}</p>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-2 sm:gap-3 pt-4">
                {isHOD && (
                  <span className="px-4 py-2 bg-amber-500/10 text-amber-400 font-black text-xs sm:text-sm rounded-xl border border-amber-500/30 flex items-center gap-1.5 shadow-inner">
                    <Crown className="w-4 h-4" /> رئيس قسم {data.department_heads[0]?.subject?.name}
                  </span>
                )}
                {/* الاعتماد على اسم القسم الجديد هنا */}
                <span className="px-4 py-2 bg-[#131836] text-slate-300 font-black text-xs sm:text-sm rounded-xl border border-white/5 shadow-inner">قسم {departmentName}</span>
                <span className={`px-4 py-2 font-black text-xs sm:text-sm rounded-xl border bg-[#02040a] shadow-inner ${activeTheme.text} ${activeTheme.border}`}>{data.specialization || 'عام'}</span>
                {customTitles.map((t: string, i: number) => (
                  <span key={i} className="px-4 py-2 bg-white/10 text-white font-black text-xs sm:text-sm rounded-xl shadow-inner border border-white/5">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── نافذة التعديل (Dark Glass Panel) ─── */}
        <AnimatePresence>
          {isEditing && (
            <motion.div initial={{ opacity: 0, height: 0, y: -20 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -20 }}
              className="bg-[#0f1423]/80 backdrop-blur-2xl rounded-[2.5rem] p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 mb-10 relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-full h-1.5 bg-gradient-to-r ${activeTheme.bg}`} />
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3 drop-shadow-sm"><Star className="text-amber-400 w-6 h-6" /> اللمسة الإبداعية للملف</h3>
                <button onClick={() => setIsEditing(false)} className="p-2 text-slate-400 hover:text-rose-400 bg-[#02040a] border border-white/5 rounded-xl shadow-inner transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="glass-panel p-5 rounded-[1.5rem] border border-white/5 shadow-inner">
                    <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-4 block">لون واجهة الملف</label>
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(THEMES).map(([key, theme]) => (
                        <button key={key} onClick={() => setProfileSettings({ ...profileSettings, theme: key })}
                          className={`px-4 py-2.5 rounded-xl text-xs font-black border transition-all flex items-center gap-2 ${profileSettings.theme === key ? 'border-white/20 bg-white/10 text-white shadow-md scale-105' : 'border-transparent bg-[#02040a]/60 text-slate-500 hover:bg-[#02040a]'}`}>
                          <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${theme.bg} shadow-inner border border-white/20`} /> {theme.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="glass-panel p-5 rounded-[1.5rem] border border-white/5 shadow-inner">
                    <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-4 block">النبذة والفلسفة التعليمية</label>
                    <textarea value={profileSettings.bio} onChange={e => setProfileSettings({ ...profileSettings, bio: e.target.value })}
                      placeholder="اكتب مقولة تؤمن بها أو نبذة قصيرة عن طريقتك في التدريس..." className="w-full h-36 p-5 bg-[#02040a]/60 border border-white/5 rounded-xl font-bold text-white outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 resize-none shadow-inner placeholder:text-slate-600 custom-scrollbar" />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="glass-panel p-5 rounded-[1.5rem] border border-white/5 shadow-inner">
                    <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-4 block">الإنجازات والشهادات</label>
                    <div className="space-y-3">
                      {profileSettings.achievements.map((ach, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className="w-12 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center shrink-0 shadow-inner"><Award className="w-5 h-5 drop-shadow-md" /></div>
                          <input type="text" value={ach} onChange={e => updateAchievement(idx, e.target.value)} placeholder="مثال: معلم مايكروسوفت الخبير 2025"
                            className="flex-1 bg-[#02040a]/60 border border-white/5 rounded-xl px-5 py-3.5 font-bold text-white outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 text-sm shadow-inner placeholder:text-slate-600" />
                        </div>
                      ))}
                      <button onClick={addAchievementField} className="text-xs font-black text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1.5 pt-2">
                        <Plus className="w-4 h-4 bg-indigo-500/20 rounded-md p-0.5" /> إضافة إنجاز آخر
                      </button>
                    </div>
                  </div>
                  <div className="glass-panel p-5 rounded-[1.5rem] border border-white/5 shadow-inner">
                    <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-4 block">روابط مهنية للتواصل</label>
                    <div className="space-y-3">
                      <div className="relative group">
                         <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none"><Youtube className="h-5 w-5 text-rose-500/50 group-focus-within:text-rose-500 transition-colors" /></div>
                         <input type="text" value={profileSettings.youtube} onChange={e => setProfileSettings({ ...profileSettings, youtube: e.target.value })}
                           placeholder="رابط قناة يوتيوب التعليمية..." className="w-full bg-[#02040a]/60 border border-white/5 rounded-xl pr-4 pl-12 py-3.5 font-bold text-white outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/30 text-sm text-left shadow-inner placeholder:text-slate-600" dir="ltr" />
                      </div>
                      <div className="relative group">
                         <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none"><Linkedin className="h-5 w-5 text-blue-500/50 group-focus-within:text-blue-500 transition-colors" /></div>
                         <input type="text" value={profileSettings.linkedin} onChange={e => setProfileSettings({ ...profileSettings, linkedin: e.target.value })}
                           placeholder="رابط حساب LinkedIn..." className="w-full bg-[#02040a]/60 border border-white/5 rounded-xl pr-4 pl-12 py-3.5 font-bold text-white outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 text-sm text-left shadow-inner placeholder:text-slate-600" dir="ltr" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
                <button disabled={isSaving} onClick={handleSaveProfile}
                  className="bg-white text-slate-900 font-black px-10 py-4 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-slate-200 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50">
                  {isSaving ? <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> : <><Save className="w-5 h-5" /> حفظ ونشر الملف</>}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── المحتوى الإبداعي (المجلة) ─── */}
        {(profileSettings.bio || profileSettings.achievements.filter(a => a).length > 0 || profileSettings.youtube || profileSettings.linkedin) && !isEditing && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-8">
            {profileSettings.bio && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`lg:col-span-2 bg-gradient-to-br ${activeTheme.bg} p-8 sm:p-10 rounded-[2.5rem] shadow-lg text-white relative overflow-hidden border border-white/10 ${activeTheme.glow}`}>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay" />
                <Quote className="absolute -left-6 -top-6 w-40 h-40 opacity-10 rotate-180 pointer-events-none text-white" />
                <h3 className="text-[10px] sm:text-xs font-black text-white/50 uppercase tracking-widest mb-6 drop-shadow-sm flex items-center gap-2"><Sparkles className="w-4 h-4"/> النبذة والفلسفة التعليمية</h3>
                <p className="text-lg sm:text-xl lg:text-2xl font-black leading-relaxed sm:leading-loose relative z-10 whitespace-pre-wrap drop-shadow-md opacity-90">{profileSettings.bio}</p>
              </motion.div>
            )}
            <div className={`space-y-6 sm:space-y-8 ${!profileSettings.bio ? 'lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8 space-y-0' : ''}`}>
              {profileSettings.achievements.filter(a => a).length > 0 && (
                <div className="glass-panel p-6 sm:p-8 rounded-[2.5rem] border border-white/5 shadow-lg bg-[#0f1423]/60 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-[60px] pointer-events-none"></div>
                  <h3 className="text-sm font-black text-white mb-6 flex items-center gap-2 drop-shadow-sm relative z-10"><Award className="text-amber-400 w-5 h-5 drop-shadow-md" /> لوحة الشرف والإنجازات</h3>
                  <ul className="space-y-3 relative z-10">
                    {profileSettings.achievements.filter(a => a).map((ach, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm font-bold text-slate-300 bg-[#02040a]/60 p-3.5 sm:p-4 rounded-xl border border-white/5 shadow-inner">
                        <Star className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0 mt-0.5 drop-shadow-sm" /> {ach}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(profileSettings.youtube || profileSettings.linkedin) && (
                <div className="glass-panel p-6 sm:p-8 rounded-[2.5rem] border border-white/5 shadow-lg bg-[#0f1423]/60 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[60px] pointer-events-none"></div>
                  <h3 className="text-sm font-black text-white mb-6 flex items-center gap-2 drop-shadow-sm relative z-10"><LinkIcon className="text-blue-400 w-5 h-5 drop-shadow-md" /> منصات التواصل المهني</h3>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 relative z-10">
                    {profileSettings.youtube && <a href={profileSettings.youtube} target="_blank" rel="noreferrer" className="flex-1 bg-rose-500/10 text-rose-400 font-black text-xs sm:text-sm py-4 rounded-xl text-center border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all shadow-inner flex items-center justify-center gap-2 active:scale-95"><Youtube className="w-5 h-5"/> YouTube القناة</a>}
                    {profileSettings.linkedin && <a href={profileSettings.linkedin} target="_blank" rel="noreferrer" className="flex-1 bg-blue-500/10 text-blue-400 font-black text-xs sm:text-sm py-4 rounded-xl text-center border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all shadow-inner flex items-center justify-center gap-2 active:scale-95"><Linkedin className="w-5 h-5"/> LinkedIn حساب</a>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── الإحصائيات الأكاديمية ─── */}
        <div className="glass-panel p-8 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] border border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.3)] bg-[#02040a]/40 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
          <h3 className="text-lg sm:text-xl font-black text-white mb-8 flex items-center justify-center sm:justify-start gap-3 drop-shadow-sm relative z-10"><Briefcase className="w-6 h-6 text-indigo-400" /> الإنتاجية الأكاديمية</h3>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 relative z-10">
            <div className="bg-[#0f1423]/80 p-6 sm:p-8 rounded-[2rem] border border-white/5 text-center shadow-inner hover:border-blue-500/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] transition-all group">
              <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-blue-500 mx-auto mb-3 sm:mb-4 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all drop-shadow-md" />
              <p className="text-4xl sm:text-5xl font-black text-white drop-shadow-md">{data.stats.exams}</p>
              <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mt-2">اختبارات</p>
            </div>
            <div className="bg-[#0f1423]/80 p-6 sm:p-8 rounded-[2rem] border border-white/5 text-center shadow-inner hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(245,158,11,0.1)] transition-all group">
              <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-amber-500 mx-auto mb-3 sm:mb-4 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all drop-shadow-md" />
              <p className="text-4xl sm:text-5xl font-black text-white drop-shadow-md">{data.stats.assignments}</p>
              <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mt-2">واجبات</p>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            ❤️  حائط الذكريات والوداد
        ════════════════════════════════════════ */}
        <div className="mt-16 sm:mt-20 rounded-[3rem] sm:rounded-[4rem] overflow-hidden border border-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.5)] relative" style={{ background: '#0a0d16' }}>
          
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay pointer-events-none" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-[100px] pointer-events-none" />

          {/* الهيدر */}
          <div className="text-center pt-16 sm:pt-20 pb-10 sm:pb-12 px-6 sm:px-8 relative z-10">
            <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-[2rem] mb-6 border border-rose-500/30 shadow-inner" style={{ background: 'rgba(244,63,94,0.1)' }}>
              <Heart className="w-10 h-10 sm:w-12 sm:h-12 text-rose-400 animate-pulse drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]" fill="currentColor" />
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-3 sm:mb-4 tracking-tight drop-shadow-md">حائط الذكريات والوداد</h2>
            <p className="text-slate-400 font-bold text-xs sm:text-sm max-w-md mx-auto leading-relaxed px-4">
              مساحة لطلاب وزملاء الأستاذ لترك بصمة لا تُنسى وكلمة طيبة تبقى للأبد في هذا السجل الرقمي.
            </p>
          </div>

          {/* صندوق الكتابة */}
          {user && !isTeacher && (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-12 sm:pb-16 relative z-10">
              <div className="rounded-[2rem] p-5 sm:p-8 border border-white/10 shadow-2xl" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}>
                <textarea
                  value={newMemory}
                  onChange={e => setNewMemory(e.target.value)}
                  placeholder="اكتب رسالة شكر، موقف جميل، أو ذكرى لا تنساها مع الأستاذ..."
                  rows={4}
                  className="w-full bg-[#02040a]/60 border border-white/5 rounded-2xl p-5 text-white font-bold outline-none focus:border-rose-400/50 focus:ring-1 focus:ring-rose-500/20 resize-none transition-all placeholder-slate-600 shadow-inner text-sm sm:text-base custom-scrollbar"
                />
                <div className="flex justify-end mt-4 sm:mt-5">
                  <button
                    disabled={!newMemory.trim() || isSubmittingMemory}
                    onClick={handleAddMemory}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-black text-white transition-all disabled:opacity-40 shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:opacity-90 active:scale-95 text-sm sm:text-base"
                    style={{ background: 'linear-gradient(135deg, #f43f5e, #fb923c)' }}
                  >
                    {isSubmittingMemory ? <Loader2 className="w-5 h-5 animate-spin"/> : <><Send className="w-4 h-4 sm:w-5 sm:h-5" /> تدوين الذكرى</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── البطاقات (الورقية التي تبرز بجمال على الخلفية الداكنة) ─── */}
          <div className="px-4 sm:px-8 pb-16 sm:pb-24 relative z-10 max-w-7xl mx-auto">
            {memories.length === 0 ? (
              <div className="text-center py-20 text-slate-500 font-bold bg-[#02040a]/40 rounded-[2.5rem] border border-white/5 border-dashed max-w-2xl mx-auto shadow-inner">
                <Heart className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-20" />
                <p className="text-sm sm:text-base">كونوا أول من يترك ذكرى طيبة للأستاذ 🌸</p>
              </div>
            ) : (
              <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 sm:gap-8 space-y-6 sm:space-y-8">
                <AnimatePresence>
                  {memories.map((memory, idx) => {
                    const style   = NOTE_STYLES[idx % NOTE_STYLES.length];
                    const rotation = getRotation(memory.id);
                    const usePin  = !style.tape && style.pin;

                    return (
                      <motion.div
                        key={memory.id}
                        initial={{ opacity: 0, scale: 0.8, rotate: rotation }}
                        animate={{ opacity: 1, scale: 1, rotate: rotation }}
                        exit={{ opacity: 0, scale: 0.6, rotate: rotation + 10 }}
                        whileHover={{ scale: 1.05, rotate: 0, zIndex: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                        className="relative inline-block w-full break-inside-avoid"
                        style={{
                          background: style.bg,
                          borderRadius: '8px',
                          padding: '28px 24px 20px',
                          boxShadow: '0 20px 40px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.4) inset',
                          cursor: 'default',
                          transformOrigin: 'top center',
                        }}
                      >
                        {/* شريط لاصق أو دبوس */}
                        {style.tape && (
                          <div style={{
                            position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                            width: 50, height: 24, background: style.tape,
                            borderRadius: 3, opacity: 0.85,
                            boxShadow: '0 2px 5px rgba(0,0,0,0.4)',
                          }} />
                        )}
                        {usePin && (
                          <div style={{
                            position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                            width: 18, height: 18, borderRadius: '50%',
                            background: style.pin,
                            boxShadow: '0 4px 8px rgba(0,0,0,0.6), 0 0 0 2px rgba(255,255,255,0.3) inset',
                          }} />
                        )}

                        {/* زر الحذف (للمعلم فقط) */}
                        {isTeacher && (
                          <button
                            onClick={() => handleDeleteMemory(memory.id)}
                            disabled={deletingId === memory.id}
                            className="absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center transition-all"
                            style={{ background: 'rgba(0,0,0,0.08)', border: 'none', cursor: 'pointer' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#ef4444')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.08)')}
                            title="حذف الذكرى"
                          >
                            {deletingId === memory.id
                              ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin text-white" />
                              : <Trash2 size={14} color={deletingId === memory.id ? 'white' : 'rgba(0,0,0,0.5)'} />
                            }
                          </button>
                        )}

                        {/* علامة الاقتباس */}
                        <div style={{ fontSize: 48, lineHeight: 0.8, marginBottom: 8, color: style.quote, opacity: 0.3, fontFamily: 'Georgia, serif' }}>"</div>

                        {/* المحتوى */}
                        <p style={{ fontSize: 14, lineHeight: 1.8, fontWeight: 700, color: style.text, marginBottom: 20, whiteSpace: 'pre-wrap' }}>
                          {memory.content}
                        </p>

                        {/* الكاتب */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderTop: `1px dashed ${style.text}40`, paddingTop: 14 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                            background: style.avatarBg, color: style.avatarText,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14, fontWeight: 900, overflow: 'hidden',
                            boxShadow: `0 0 0 2px ${style.bg}, 0 0 0 3px ${style.text}20`
                          }}>
                            {memory.author?.avatar_url
                              ? <img src={memory.author.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                              : memory.author?.full_name?.charAt(0)
                            }
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 900, color: style.meta, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{memory.author?.full_name}</div>
                            <div style={{ fontSize: 10, color: style.meta, opacity: 0.8, marginTop: 2, fontWeight: 700 }}>
                              {memory.author?.role === 'teacher' ? 'زميل المهنة' : memory.author?.role === 'student' ? 'طالب' : 'إدارة'}
                              {' · '}
                              {format(new Date(memory.created_at), 'd MMM yyyy', { locale: arSA })}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  );
}
