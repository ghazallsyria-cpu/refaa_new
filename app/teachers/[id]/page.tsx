// @ts-nocheck
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
import { cn } from '@/lib/utils';

// ==========================================
// 🎨 شرائح البيانات الهولوغرافية (Holographic Data Shards)
// تحويل القصاصات الورقية إلى كروت زجاجية مضيئة بأسلوب جيمناي
// ==========================================
const NOTE_STYLES = [
  { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-50', quote: 'text-amber-400', meta: 'text-amber-300', accent: 'bg-amber-400', avatarBg: 'bg-amber-500/20', avatarText: 'text-amber-300', shadow: 'shadow-[0_10px_30px_rgba(245,158,11,0.15)]' },
  { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-50', quote: 'text-rose-400', meta: 'text-rose-300', accent: 'bg-rose-400', avatarBg: 'bg-rose-500/20', avatarText: 'text-rose-300', shadow: 'shadow-[0_10px_30px_rgba(244,63,94,0.15)]' },
  { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-50', quote: 'text-blue-400', meta: 'text-blue-300', accent: 'bg-blue-400', avatarBg: 'bg-blue-500/20', avatarText: 'text-blue-300', shadow: 'shadow-[0_10px_30px_rgba(59,130,246,0.15)]' },
  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-50', quote: 'text-emerald-400', meta: 'text-emerald-300', accent: 'bg-emerald-400', avatarBg: 'bg-emerald-500/20', avatarText: 'text-emerald-300', shadow: 'shadow-[0_10px_30px_rgba(16,185,129,0.15)]' },
  { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-50', quote: 'text-purple-400', meta: 'text-purple-300', accent: 'bg-purple-400', avatarBg: 'bg-purple-500/20', avatarText: 'text-purple-300', shadow: 'shadow-[0_10px_30px_rgba(168,85,247,0.15)]' },
  { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-50', quote: 'text-orange-400', meta: 'text-orange-300', accent: 'bg-orange-400', avatarBg: 'bg-orange-500/20', avatarText: 'text-orange-300', shadow: 'shadow-[0_10px_30px_rgba(249,115,22,0.15)]' },
  { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-50', quote: 'text-cyan-400', meta: 'text-cyan-300', accent: 'bg-cyan-400', avatarBg: 'bg-cyan-500/20', avatarText: 'text-cyan-300', shadow: 'shadow-[0_10px_30px_rgba(6,182,212,0.15)]' },
  { bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/30', text: 'text-fuchsia-50', quote: 'text-fuchsia-400', meta: 'text-fuchsia-300', accent: 'bg-fuchsia-400', avatarBg: 'bg-fuchsia-500/20', avatarText: 'text-fuchsia-300', shadow: 'shadow-[0_10px_30px_rgba(217,70,239,0.15)]' },
];

const getRotation = (id: string) => {
  const chars = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rotations = [-2, -1, -0.5, 0.5, 1, 1.5, 2];
  return rotations[chars % rotations.length];
};

// ==========================================
// 🎭 الثيمات المخصصة (Neon Profile Themes)
// ==========================================
const THEMES: Record<string, { bg: string, text: string, border: string, name: string, glow: string }> = {
  royal:   { bg: 'from-indigo-600/40 to-blue-800/40',   text: 'text-indigo-300',  border: 'border-indigo-500/50',  name: 'أزرق ملكي', glow: 'shadow-[0_0_40px_rgba(79,70,229,0.3)]' },
  emerald: { bg: 'from-emerald-600/40 to-teal-800/40',  text: 'text-emerald-300', border: 'border-emerald-500/50', name: 'أخضر زمردي', glow: 'shadow-[0_0_40px_rgba(16,185,129,0.3)]' },
  gold:    { bg: 'from-amber-600/40 to-orange-800/40',  text: 'text-amber-300',   border: 'border-amber-500/50',   name: 'ذهبي كلاسيكي', glow: 'shadow-[0_0_40px_rgba(245,158,11,0.3)]' },
  cosmic:  { bg: 'from-purple-600/40 to-pink-800/40',   text: 'text-purple-300',  border: 'border-purple-500/50',  name: 'أرجواني كوني', glow: 'shadow-[0_0_40px_rgba(168,85,247,0.3)]' },
  slate:   { bg: 'from-slate-700/40 to-slate-900/40',   text: 'text-slate-300',   border: 'border-slate-500/50',   name: 'رمادي داكن', glow: 'shadow-[0_0_40px_rgba(100,116,139,0.3)]' },
};

export default function TeacherProfilePage() {
  const { id } = useParams();
  const teacherId = Array.isArray(id) ? id[0] : id as string;
  const router = useRouter();
  
  const { user, isChecking } = useAuth();
  const { loading, fetchTeacherProfile, updateTeacherProfileSettings } = useProfileSystem();

  const [data, setData]               = useState<any>(null);
  const [departmentName, setDepartmentName] = useState<string>('عام');
  const [isEditing, setIsEditing]     = useState(false);
  const [isSaving, setIsSaving]       = useState(false);
  const [profileSettings, setProfileSettings] = useState({
    theme: 'royal', bio: '', achievements: [''], youtube: '', linkedin: '',
  });

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

  const addAchievementField = () => setProfileSettings({ ...profileSettings, achievements: [...profileSettings.achievements, ''] });
  const updateAchievement = (i: number, v: string) => {
    const arr = [...profileSettings.achievements];
    arr[i] = v;
    setProfileSettings({ ...profileSettings, achievements: arr });
  };

  if (isChecking) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-transparent font-sans">
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
    <div className="flex h-[100dvh] justify-center items-center bg-transparent font-sans text-slate-100">
      <div className="flex flex-col items-center gap-5">
        <div className="relative flex items-center justify-center">
           <div className="h-20 w-20 animate-spin rounded-full border-4 border-emerald-500/10 border-t-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.4)]"></div>
           <Sparkles className="absolute h-8 w-8 text-emerald-400 animate-pulse" />
        </div>
        <p className="text-emerald-400 font-black animate-pulse tracking-widest">جاري تحميل الملف المهني...</p>
      </div>
    </div>
  );

  const isHOD        = data.department_heads?.length > 0;
  const customTitles = data.custom_titles || [];
  const activeTheme  = THEMES[profileSettings.theme] || THEMES['royal'];
  const canEdit      = user?.id === data.id || user?.role === 'admin' || user?.role === 'management';
  const isTeacher    = user?.id === teacherId; 

  return (
    <div className="min-h-[100dvh] bg-transparent pb-32 font-sans text-slate-200 relative overflow-x-hidden pt-6" dir="rtl">
      
      {/* 🌌 الإضاءة الخلفية المحيطية (Gemini Ambiance) */}
      <div className="fixed top-1/4 left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen z-0" />
      <div className="fixed bottom-0 right-[-10%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen z-0" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8">

        {/* 🔙 شريط التنقل العلوي */}
        <div className="flex justify-between items-center">
          <button onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-white font-black transition-colors bg-[#02040a]/40 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-inner border border-white/10 hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] active:scale-95">
            <ChevronLeft className="w-5 h-5" /> العودة
          </button>
          
          {canEdit && !isEditing && (
            <button onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-indigo-600/90 backdrop-blur-md text-white font-black px-6 py-3 rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:bg-indigo-500 transition-all active:scale-95 border border-indigo-400/50">
              <Edit3 className="w-4 h-4" /> تخصيص ملفي
            </button>
          )}
        </div>

        {/* 👑 الهيدر الشخصي (Holographic Hero Profile Section) */}
        <motion.div layout className={`relative rounded-[2.5rem] sm:rounded-[3.5rem] p-1 sm:p-1.5 shadow-2xl overflow-hidden bg-gradient-to-r ${activeTheme.bg} ${activeTheme.glow} backdrop-blur-xl border border-white/10`}>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay" />
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-white/5 rounded-full blur-[80px]" />
          
          <div className="bg-[#02040a]/80 backdrop-blur-3xl rounded-[2.2rem] sm:rounded-[3.2rem] p-8 sm:p-12 lg:p-16 relative z-10 flex flex-col md:flex-row items-center md:items-center gap-8 lg:gap-12 text-center md:text-right border border-white/5 shadow-inner">
            
            <div className="relative shrink-0">
              <div className={`h-36 w-36 sm:h-48 sm:w-48 rounded-[2.5rem] sm:rounded-[3rem] flex items-center justify-center text-6xl sm:text-7xl font-black shadow-inner border-4 bg-[#0f1423] ${activeTheme.text} ${activeTheme.border}`}>
                {data.users?.avatar_url
                  ? <img src={data.users.avatar_url} className="w-full h-full rounded-[2.2rem] sm:rounded-[2.7rem] object-cover mix-blend-luminosity" alt="avatar" />
                  : <span className="drop-shadow-md">{data.users?.full_name?.charAt(0)}</span>}
              </div>
              {isHOD && <div className="absolute -top-6 -right-6 p-2 bg-[#02040a] rounded-full border border-amber-500/30 shadow-inner"><Crown className="h-10 w-10 sm:h-12 sm:w-12 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)] animate-pulse" /></div>}
            </div>
            
            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-300 shadow-inner">
                <Sparkles className="w-3.5 h-3.5" /> الملف المهني
              </div>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-lg leading-tight">{data.users?.full_name}</h1>
              <p className="text-slate-400 font-bold font-mono tracking-widest text-sm sm:text-base drop-shadow-sm">{data.national_id}</p>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-2 sm:gap-3 pt-4">
                {isHOD && (
                  <span className="px-4 py-2 bg-amber-500/10 text-amber-300 font-black text-xs sm:text-sm rounded-xl border border-amber-500/30 flex items-center gap-1.5 shadow-inner backdrop-blur-md">
                    <Crown className="w-4 h-4" /> رئيس قسم {data.department_heads[0]?.subjects?.name || ''}
                  </span>
                )}
                <span className="px-4 py-2 bg-[#0f1423]/80 text-slate-300 font-black text-xs sm:text-sm rounded-xl border border-white/10 shadow-inner backdrop-blur-md">قسم {departmentName}</span>
                <span className={`px-4 py-2 font-black text-xs sm:text-sm rounded-xl border bg-white/5 backdrop-blur-md shadow-inner ${activeTheme.text} ${activeTheme.border}`}>{data.specialization || 'عام'}</span>
                
                {customTitles.map((t: string, i: number) => (
                  <span key={i} className="px-4 py-2 bg-white/5 text-slate-300 font-black text-xs sm:text-sm rounded-xl shadow-inner border border-white/10 backdrop-blur-md">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ⚙️ لوحة التعديل (Gemini Edit Glass Panel) */}
        <AnimatePresence>
          {isEditing && (
            <motion.div initial={{ opacity: 0, height: 0, y: -20 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -20 }}
              className="bg-[#02040a]/80 backdrop-blur-3xl rounded-[2.5rem] p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10 mb-10 relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-full h-1.5 bg-gradient-to-r ${activeTheme.bg}`} />
              <div className="flex justify-between items-center mb-8 relative z-10">
                <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3 drop-shadow-md"><Star className="text-amber-400 w-6 h-6" /> اللمسة الإبداعية للملف</h3>
                <button onClick={() => setIsEditing(false)} className="p-2 text-slate-400 hover:text-rose-400 bg-white/5 border border-white/10 rounded-xl shadow-inner transition-colors active:scale-90"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                <div className="space-y-6">
                  {/* اختيار اللون */}
                  <div className="bg-white/5 p-5 rounded-[1.5rem] border border-white/10 shadow-inner backdrop-blur-sm">
                    <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-4 block drop-shadow-sm">لون واجهة الملف</label>
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(THEMES).map(([key, theme]) => (
                        <button key={key} onClick={() => setProfileSettings({ ...profileSettings, theme: key })}
                          className={`px-4 py-2.5 rounded-xl text-xs font-black border transition-all flex items-center gap-2 ${profileSettings.theme === key ? 'border-white/20 bg-white/10 text-white shadow-md scale-105' : 'border-transparent bg-[#0f1423]/60 text-slate-400 hover:bg-white/5'}`}>
                          <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${theme.bg} shadow-inner border border-white/20`} /> {theme.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* النبذة */}
                  <div className="bg-white/5 p-5 rounded-[1.5rem] border border-white/10 shadow-inner backdrop-blur-sm">
                    <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-4 block drop-shadow-sm">النبذة والفلسفة التعليمية</label>
                    <textarea value={profileSettings.bio} onChange={e => setProfileSettings({ ...profileSettings, bio: e.target.value })}
                      placeholder="اكتب مقولة تؤمن بها أو نبذة قصيرة عن طريقتك في التدريس..." className="w-full h-36 p-5 bg-[#02040a]/60 border border-white/10 rounded-xl font-bold text-white outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30 resize-none shadow-inner placeholder:text-slate-600 custom-scrollbar transition-all" />
                  </div>
                </div>
                
                <div className="space-y-6">
                  {/* الإنجازات */}
                  <div className="bg-white/5 p-5 rounded-[1.5rem] border border-white/10 shadow-inner backdrop-blur-sm">
                    <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-4 block drop-shadow-sm">الإنجازات والشهادات</label>
                    <div className="space-y-3">
                      {profileSettings.achievements.map((ach, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className="w-12 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center shrink-0 shadow-inner"><Award className="w-5 h-5 drop-shadow-md" /></div>
                          <input type="text" value={ach} onChange={e => updateAchievement(idx, e.target.value)} placeholder="مثال: معلم مايكروسوفت الخبير 2025"
                            className="flex-1 bg-[#02040a]/60 border border-white/10 rounded-xl px-5 py-3.5 font-bold text-white outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/30 text-sm shadow-inner placeholder:text-slate-600 transition-all" />
                        </div>
                      ))}
                      <button onClick={addAchievementField} className="text-xs font-black text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1.5 pt-2 drop-shadow-sm">
                        <Plus className="w-4 h-4 bg-indigo-500/20 rounded-md p-0.5 border border-indigo-500/30 shadow-inner" /> إضافة إنجاز آخر
                      </button>
                    </div>
                  </div>
                  {/* الروابط المهنية */}
                  <div className="bg-white/5 p-5 rounded-[1.5rem] border border-white/10 shadow-inner backdrop-blur-sm">
                    <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-4 block drop-shadow-sm">روابط مهنية للتواصل</label>
                    <div className="space-y-3">
                      <div className="relative group">
                         <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none"><Youtube className="h-5 w-5 text-rose-500/50 group-focus-within:text-rose-500 transition-colors" /></div>
                         <input type="text" value={profileSettings.youtube} onChange={e => setProfileSettings({ ...profileSettings, youtube: e.target.value })}
                           placeholder="رابط قناة يوتيوب التعليمية..." className="w-full bg-[#02040a]/60 border border-white/10 rounded-xl pr-4 pl-12 py-3.5 font-bold text-white outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/30 text-sm text-left shadow-inner placeholder:text-slate-600 transition-all" dir="ltr" />
                      </div>
                      <div className="relative group">
                         <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none"><Linkedin className="h-5 w-5 text-blue-500/50 group-focus-within:text-blue-500 transition-colors" /></div>
                         <input type="text" value={profileSettings.linkedin} onChange={e => setProfileSettings({ ...profileSettings, linkedin: e.target.value })}
                           placeholder="رابط حساب LinkedIn..." className="w-full bg-[#02040a]/60 border border-white/10 rounded-xl pr-4 pl-12 py-3.5 font-bold text-white outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/30 text-sm text-left shadow-inner placeholder:text-slate-600 transition-all" dir="ltr" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* زر الحفظ */}
              <div className="mt-8 pt-6 border-t border-white/5 flex justify-end relative z-10">
                <button disabled={isSaving} onClick={handleSaveProfile}
                  className="bg-indigo-600/90 backdrop-blur-md text-white font-black px-10 py-4 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:bg-indigo-500 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 border border-indigo-400/50">
                  {isSaving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save className="w-5 h-5" /> حفظ ونشر الملف</>}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🌟 عرض تفاصيل الملف المخصصة (Glass Panels) */}
        {(profileSettings.bio || profileSettings.achievements.filter(a => a).length > 0 || profileSettings.youtube || profileSettings.linkedin) && !isEditing && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-8">
            
            {profileSettings.bio && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`lg:col-span-2 bg-gradient-to-br ${activeTheme.bg} backdrop-blur-xl p-8 sm:p-10 rounded-[2.5rem] shadow-lg text-white relative overflow-hidden border border-white/10 ${activeTheme.glow}`}>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay" />
                <Quote className="absolute -left-6 -top-6 w-40 h-40 opacity-10 rotate-180 pointer-events-none text-white mix-blend-screen" />
                <h3 className="text-[10px] sm:text-xs font-black text-white/60 uppercase tracking-widest mb-6 drop-shadow-sm flex items-center gap-2"><Sparkles className="w-4 h-4"/> النبذة والفلسفة التعليمية</h3>
                <p className="text-lg sm:text-xl lg:text-2xl font-black leading-relaxed sm:leading-loose relative z-10 whitespace-pre-wrap drop-shadow-md opacity-90">{profileSettings.bio}</p>
              </motion.div>
            )}

            <div className={`space-y-6 sm:space-y-8 ${!profileSettings.bio ? 'lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8 space-y-0' : ''}`}>
              
              {profileSettings.achievements.filter(a => a).length > 0 && (
                <div className="bg-[#02040a]/40 backdrop-blur-md p-6 sm:p-8 rounded-[2.5rem] border border-white/10 shadow-inner relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-[60px] pointer-events-none mix-blend-screen group-hover:scale-125 transition-transform duration-700"></div>
                  <h3 className="text-sm font-black text-white mb-6 flex items-center gap-2 drop-shadow-sm relative z-10"><Award className="text-amber-400 w-5 h-5 drop-shadow-md" /> لوحة الشرف والإنجازات</h3>
                  <ul className="space-y-3 relative z-10">
                    {profileSettings.achievements.filter(a => a).map((ach, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm font-bold text-slate-300 bg-white/5 p-3.5 sm:p-4 rounded-xl border border-white/10 shadow-inner backdrop-blur-sm transition-colors hover:bg-white/10 hover:border-amber-500/30">
                        <Star className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0 mt-0.5 drop-shadow-sm" /> {ach}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(profileSettings.youtube || profileSettings.linkedin) && (
                <div className="bg-[#02040a]/40 backdrop-blur-md p-6 sm:p-8 rounded-[2.5rem] border border-white/10 shadow-inner relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[60px] pointer-events-none mix-blend-screen group-hover:scale-125 transition-transform duration-700"></div>
                  <h3 className="text-sm font-black text-white mb-6 flex items-center gap-2 drop-shadow-sm relative z-10"><LinkIcon className="text-blue-400 w-5 h-5 drop-shadow-md" /> منصات التواصل المهني</h3>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 relative z-10">
                    {profileSettings.youtube && <a href={profileSettings.youtube} target="_blank" rel="noreferrer" className="flex-1 bg-rose-500/10 text-rose-300 font-black text-xs sm:text-sm py-4 rounded-xl text-center border border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all shadow-inner flex items-center justify-center gap-2 active:scale-95 backdrop-blur-sm"><Youtube className="w-5 h-5 drop-shadow-sm"/> YouTube القناة</a>}
                    {profileSettings.linkedin && <a href={profileSettings.linkedin} target="_blank" rel="noreferrer" className="flex-1 bg-blue-500/10 text-blue-300 font-black text-xs sm:text-sm py-4 rounded-xl text-center border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all shadow-inner flex items-center justify-center gap-2 active:scale-95 backdrop-blur-sm"><Linkedin className="w-5 h-5 drop-shadow-sm"/> LinkedIn حساب</a>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 📈 إحصائيات الإنتاجية الأكاديمية للمدير/المعلم */}
        <div className="bg-[#02040a]/40 backdrop-blur-md p-8 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] border border-white/10 shadow-inner relative overflow-hidden group">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none mix-blend-screen group-hover:scale-150 transition-transform duration-1000"></div>
          <h3 className="text-lg sm:text-xl font-black text-white mb-8 flex items-center justify-center sm:justify-start gap-3 drop-shadow-md relative z-10"><Briefcase className="w-6 h-6 text-indigo-400 drop-shadow-sm" /> الإنتاجية الأكاديمية</h3>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 relative z-10">
            <div className="bg-white/5 p-6 sm:p-8 rounded-[2rem] border border-white/10 text-center shadow-inner hover:border-blue-500/40 hover:bg-blue-500/10 transition-all group/stat backdrop-blur-sm">
              <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-blue-400 mx-auto mb-3 sm:mb-4 opacity-70 group-hover/stat:opacity-100 group-hover/stat:scale-110 transition-all drop-shadow-md" />
              <p className="text-4xl sm:text-5xl font-black text-white drop-shadow-lg">{data.stats.exams}</p>
              <p className="text-[10px] sm:text-xs font-black text-blue-300/80 uppercase tracking-widest mt-2 drop-shadow-sm">اختبارات</p>
            </div>
            <div className="bg-white/5 p-6 sm:p-8 rounded-[2rem] border border-white/10 text-center shadow-inner hover:border-amber-500/40 hover:bg-amber-500/10 transition-all group/stat backdrop-blur-sm">
              <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-amber-400 mx-auto mb-3 sm:mb-4 opacity-70 group-hover/stat:opacity-100 group-hover/stat:scale-110 transition-all drop-shadow-md" />
              <p className="text-4xl sm:text-5xl font-black text-white drop-shadow-lg">{data.stats.assignments}</p>
              <p className="text-[10px] sm:text-xs font-black text-amber-300/80 uppercase tracking-widest mt-2 drop-shadow-sm">واجبات</p>
            </div>
          </div>
        </div>

        {/* ❤️ حائط الذكريات الهولوغرافية (Holographic Memory Wall) */}
        <div className="mt-16 sm:mt-20 rounded-[3rem] sm:rounded-[4rem] overflow-hidden border border-white/10 shadow-inner relative bg-[#02040a]/40 backdrop-blur-xl group">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay pointer-events-none" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen group-hover:scale-125 transition-transform duration-1000" />

          <div className="text-center pt-16 sm:pt-20 pb-10 sm:pb-12 px-6 sm:px-8 relative z-10">
            <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-[2rem] mb-6 border border-rose-500/30 shadow-inner bg-rose-500/10 backdrop-blur-md">
              <Heart className="w-10 h-10 sm:w-12 sm:h-12 text-rose-400 animate-pulse drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]" fill="currentColor" />
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-3 sm:mb-4 tracking-tight drop-shadow-lg">حائط الذكريات والوداد</h2>
            <p className="text-slate-300 font-bold text-xs sm:text-sm max-w-md mx-auto leading-relaxed px-4 drop-shadow-sm opacity-90">
              مساحة لطلاب وزملاء الأستاذ لترك بصمة لا تُنسى وكلمة طيبة تبقى للأبد في هذا السجل الرقمي المضيء.
            </p>
          </div>

          {/* مربع كتابة الذكرى (لا يظهر للمعلم نفسه) */}
          {user && !isTeacher && (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-12 sm:pb-16 relative z-10">
              <div className="rounded-[2rem] p-5 sm:p-8 border border-white/10 shadow-inner bg-white/5 backdrop-blur-md">
                <textarea
                  value={newMemory}
                  onChange={e => setNewMemory(e.target.value)}
                  placeholder="اكتب رسالة شكر، موقف جميل، أو ذكرى لا تنساها مع الأستاذ..."
                  rows={4}
                  className="w-full bg-[#02040a]/60 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/30 resize-none transition-all placeholder-slate-500 shadow-inner text-sm sm:text-base custom-scrollbar"
                />
                <div className="flex justify-end mt-4 sm:mt-5">
                  <button
                    disabled={!newMemory.trim() || isSubmittingMemory}
                    onClick={handleAddMemory}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-black text-white transition-all disabled:opacity-40 shadow-[0_0_20px_rgba(244,63,94,0.4)] hover:bg-rose-500 active:scale-95 text-sm sm:text-base bg-rose-600/90 backdrop-blur-md border border-rose-400/50"
                  >
                    {isSubmittingMemory ? <Loader2 className="w-5 h-5 animate-spin"/> : <><Send className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-sm" /> تدوين الذكرى</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* عرض الذكريات (Holographic Shards) */}
          <div className="px-4 sm:px-8 pb-16 sm:pb-24 relative z-10 max-w-7xl mx-auto">
            {memories.length === 0 ? (
              <div className="text-center py-20 text-slate-500 font-bold bg-white/5 backdrop-blur-sm rounded-[2.5rem] border border-white/10 border-dashed max-w-2xl mx-auto shadow-inner">
                <Heart className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-20 drop-shadow-md" />
                <p className="text-sm sm:text-base">كونوا أول من يترك ذكرى طيبة للأستاذ 🌸</p>
              </div>
            ) : (
              <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 sm:gap-8 space-y-6 sm:space-y-8">
                <AnimatePresence>
                  {memories.map((memory, idx) => {
                    const style   = NOTE_STYLES[idx % NOTE_STYLES.length];
                    const rotation = getRotation(memory.id);

                    return (
                      <motion.div
                        key={memory.id}
                        initial={{ opacity: 0, scale: 0.8, rotate: rotation }}
                        animate={{ opacity: 1, scale: 1, rotate: rotation }}
                        exit={{ opacity: 0, scale: 0.6, rotate: rotation + 10 }}
                        whileHover={{ scale: 1.05, rotate: 0, zIndex: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                        className={`relative inline-block w-full break-inside-avoid rounded-[1.5rem] border backdrop-blur-md overflow-hidden ${style.bg} ${style.border} ${style.shadow}`}
                        style={{ transformOrigin: 'top center', cursor: 'default' }}
                      >
                        {/* خط إضاءة نيون علوي */}
                        <div className={`absolute top-0 inset-x-0 h-1.5 ${style.accent} shadow-[0_0_10px_currentColor] opacity-80`} />
                        
                        <div className="p-6 pt-8">
                          {/* زر الحذف لصاحب الملف */}
                          {isTeacher && (
                            <button
                              onClick={() => handleDeleteMemory(memory.id)}
                              disabled={deletingId === memory.id}
                              className="absolute top-4 left-4 w-8 h-8 rounded-full flex items-center justify-center transition-all bg-[#02040a]/40 border border-white/10 hover:bg-rose-500 hover:border-rose-400 shadow-inner"
                              title="حذف الذكرى"
                            >
                              {deletingId === memory.id ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 size={14} className="text-white drop-shadow-md" />}
                            </button>
                          )}
                          
                          <Quote className={`w-8 h-8 ${style.quote} mb-3 opacity-40 drop-shadow-md`} />
                          <p className={`text-sm sm:text-base leading-relaxed font-bold ${style.text} mb-6 white-space-pre-wrap drop-shadow-sm`}>{memory.content}</p>
                          
                          <div className={`flex items-center gap-3 border-t border-white/10 pt-4 mt-auto`}>
                            <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-sm font-black overflow-hidden shadow-inner border border-white/10 ${style.avatarBg} ${style.avatarText}`}>
                              {memory.author?.avatar_url ? <img src={memory.author.avatar_url} className="w-full h-full object-cover mix-blend-luminosity" alt="" /> : memory.author?.full_name?.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className={`text-xs font-black truncate drop-shadow-sm ${style.meta}`}>{memory.author?.full_name}</div>
                              <div className={`text-[9px] mt-1 font-bold opacity-80 ${style.meta}`}>
                                {memory.author?.role === 'teacher' ? 'زميل المهنة' : memory.author?.role === 'student' ? 'طالب' : 'إدارة'} {' · '} {format(new Date(memory.created_at), 'd MMM yyyy', { locale: arSA })}
                              </div>
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
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  );
}
