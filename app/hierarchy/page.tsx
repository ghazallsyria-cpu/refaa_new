/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, GraduationCap, Crown, Shield, ChevronDown, Network, Award, Star, Sparkles, BookOpen, ChevronRight } from 'lucide-react';
import { useHierarchySystem, getTeachersUnderHOD } from '@/hooks/useHierarchySystem';

// ─── variants ────────────────────────────────────────────────────────────────
const fadeUp = { hidden: { opacity: 0, y: 32 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 80, damping: 18 } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };
const scaleIn = { hidden: { opacity: 0, scale: 0.85 }, show: { opacity: 1, scale: 1, transition: { type: 'spring' as const, stiffness: 120, damping: 16 } } };

// ─── level palette ────────────────────────────────────────────────────────────
const PALETTES = {
  admin:     { ring: 'ring-amber-400/60',     glow: 'shadow-[0_0_30px_rgba(245,158,11,0.3)]',  badge: 'bg-amber-500/20 text-amber-400 border-amber-500/40',   icon: 'bg-amber-500/15 text-amber-400',  line: 'from-amber-400/60 to-amber-500/20' },
  supervisor:{ ring: 'ring-emerald-400/60',   glow: 'shadow-[0_0_30px_rgba(16,185,129,0.2)]', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', icon: 'bg-emerald-500/15 text-emerald-400', line: 'from-emerald-400/60 to-emerald-500/20' },
  hod:       { ring: 'ring-violet-400/60',    glow: 'shadow-[0_0_30px_rgba(139,92,246,0.2)]', badge: 'bg-violet-500/20 text-violet-400 border-violet-500/40',  icon: 'bg-violet-500/15 text-violet-400',  line: 'from-violet-400/50 to-violet-500/10' },
  teacher:   { ring: 'ring-blue-400/40',      glow: 'shadow-[0_0_30px_rgba(59,130,246,0.1)]', badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',      icon: 'bg-blue-500/10 text-blue-400',      line: '' },
};

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ url, name, size = 'lg', palette }: { url?: string; name?: string; size?: 'sm'|'md'|'lg'|'xl'; palette: typeof PALETTES['admin'] }) {
  const dims = { sm: 'h-11 w-11 text-base rounded-2xl', md: 'h-16 w-16 text-xl rounded-[1.2rem]', lg: 'h-24 w-24 text-3xl rounded-[1.8rem]', xl: 'h-32 w-32 text-4xl rounded-[2.5rem]' };
  return (
    <div className={`relative shrink-0 ${dims[size]}`}>
      <div className={`w-full h-full ${dims[size]} overflow-hidden ring-2 ${palette.ring} bg-[#0a0d1a] flex items-center justify-center font-black shadow-xl ${palette.glow} border border-white/5`}>
        {url ? <img src={url} alt={name} className="w-full h-full object-cover" /> : (
          <span className="text-white/70 drop-shadow-md">{name?.charAt(0) || '؟'}</span>
        )}
      </div>
      <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-400 border-2 border-[#070a14] shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse`} />
    </div>
  );
}

// ─── Admin Card ───────────────────────────────────────────────────────────────
function AdminCard({ admin }: { admin: any }) {
  const p = PALETTES.admin;
  return (
    <motion.div variants={scaleIn} className="relative z-20">
      <Link href="/admin/profile" className="group block relative z-10">
        <div className={`relative flex flex-col items-center gap-4 p-8 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] border border-amber-500/30 bg-gradient-to-b from-[#0f1320] to-[#02040a] shadow-2xl ${p.glow} hover:shadow-[0_0_50px_rgba(245,158,11,0.4)] transition-all duration-500 hover:-translate-y-2 w-72 sm:w-80 text-center overflow-hidden`}>
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/30 transition-colors duration-500" />
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
            <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]" />
          </div>
          <div className="mt-4 sm:mt-6 relative z-10">
            <Avatar url={admin.avatar_url} name={admin.full_name} size="xl" palette={p} />
          </div>
          <div className="relative z-10 space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-amber-400 transition-colors drop-shadow-md">{admin.full_name}</h3>
            <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black border ${p.badge} shadow-inner`}>
              <Shield className="w-3.5 h-3.5" /> مدير المدرسة
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Supervisor Card ──────────────────────────────────────────────────────────
function SupervisorCard({ sup }: { sup: any }) {
  const p = PALETTES.supervisor;
  const titles = (sup.custom_titles || []).join(' • ');
  return (
    <motion.div variants={scaleIn} className="relative z-10">
      <Link href={`/teachers/${sup.id}`} className="group block relative z-10">
        <div className={`relative flex flex-col items-center gap-3 p-6 sm:p-8 rounded-[2rem] border border-emerald-500/20 bg-gradient-to-b from-[#0b1218] to-[#02040a] shadow-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all duration-500 hover:-translate-y-2 w-64 text-center overflow-hidden`}>
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors pointer-events-none" />
          <Avatar url={sup.users?.avatar_url} name={sup.users?.full_name} size="lg" palette={p} />
          <div className="relative z-10 space-y-1.5 sm:space-y-2">
            <h3 className="text-base sm:text-lg font-black text-white group-hover:text-emerald-400 transition-colors drop-shadow-md">{sup.users?.full_name}</h3>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-black border ${p.badge} shadow-inner`}>
              <Star className="w-3 h-3" /> {titles || 'مشرف تربوي'}
            </span>
            {sup.specialization && (
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 pt-1 drop-shadow-sm">{sup.specialization}</p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── HOD + Teachers Column ────────────────────────────────────────────────────
function DeptColumn({ hod, teachers }: { hod: any; teachers: any[] }) {
  const [expanded, setExpanded] = useState(true);
  const p = PALETTES.hod;
  const tp = PALETTES.teacher;

  return (
    <motion.div variants={fadeUp} className="flex flex-col items-center w-[300px] sm:w-[340px] relative z-10">
      <div className="relative z-20 w-full">
        <Link href={`/teachers/${hod.teacher_id}`} className="group block relative z-10">
          <div className={`relative flex items-center gap-4 p-5 sm:p-6 rounded-[1.8rem] border border-violet-500/20 bg-gradient-to-br from-[#0f0d1f] to-[#02040a] shadow-xl hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-all duration-500 hover:-translate-y-1 overflow-hidden`}>
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-violet-500/15 rounded-full blur-3xl group-hover:bg-violet-500/25 transition-colors pointer-events-none" />
            <div className="absolute top-3 left-3 z-20">
              <Award className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400 drop-shadow-[0_0_10px_rgba(139,92,246,0.8)]" />
            </div>
            <Avatar url={hod.teacher?.users?.avatar_url} name={hod.teacher?.users?.full_name} size="md" palette={p} />
            <div className="relative z-10 flex-1 min-w-0 text-right">
              <p className="text-sm sm:text-base font-black text-white group-hover:text-violet-400 transition-colors truncate drop-shadow-md">{hod.teacher?.users?.full_name}</p>
              <p className={`inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black border ${p.badge} shadow-inner`}>
                <GraduationCap className="w-3 h-3" /> رئيس قسم {hod.subject?.name}
              </p>
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mt-1.5 drop-shadow-sm">{hod.stage_name}</p>
            </div>
          </div>
        </Link>
      </div>

      {teachers.length > 0 && (
        <>
          <div className="w-px h-6 sm:h-8 bg-gradient-to-b from-violet-500/50 to-violet-500/10 relative z-0" />
          <button onClick={() => setExpanded(v => !v)} className="relative z-10 flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#0f0d1f] border border-violet-500/30 text-[10px] sm:text-xs font-black text-violet-400 hover:bg-violet-500/10 hover:text-violet-300 transition-all mb-2 shadow-inner active:scale-95">
            <Users className="w-3 h-3 sm:w-4 sm:h-4" /> {teachers.length} أعضاء
            <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="overflow-hidden w-full relative z-0"
              >
                <div className="w-px h-4 sm:h-6 bg-gradient-to-b from-violet-500/30 to-transparent mx-auto" />
                <div className="relative p-3 sm:p-4 rounded-[1.5rem] border border-white/5 bg-[#02040a]/80 backdrop-blur-xl shadow-inner space-y-2 sm:space-y-3 overflow-hidden">
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_0%,_rgba(139,92,246,1),transparent_70%)] pointer-events-none" />
                  <div className="relative z-10 max-h-80 overflow-y-auto space-y-2 sm:space-y-3 custom-scrollbar pr-1">
                    {teachers.map((t: any) => (
                      <Link href={`/teachers/${t.id}`} key={t.id} className="group/item flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-[1.2rem] sm:rounded-[1.5rem] bg-[#0f1423]/80 border border-white/5 hover:border-blue-500/40 hover:bg-[#131836] transition-all duration-300 hover:-translate-x-1 shadow-inner">
                        <Avatar url={t.users?.avatar_url} name={t.users?.full_name} size="sm" palette={tp} />
                        <div className="flex-1 min-w-0 text-right">
                          <p className="text-xs sm:text-sm font-black text-white group-hover/item:text-blue-400 transition-colors truncate drop-shadow-sm">{t.users?.full_name}</p>
                          <div className="flex gap-1.5 mt-1.5 flex-wrap">
                            {t.specialization && <span className="text-[8px] sm:text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/10 truncate max-w-[100px] shadow-inner">{t.specialization}</span>}
                            <span className="text-[8px] sm:text-[9px] font-black px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-inner">{t.stage}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-slate-600 group-hover/item:text-blue-400 transition-colors shrink-0 opacity-0 group-hover/item:opacity-100" />
                      </Link>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}

// ─── Connector Line ───────────────────────────────────────────────────────────
function VLine({ from, h = 16, color = 'from-white/20 to-transparent' }: { from?: string; h?: number; color?: string }) {
  return <div className={`w-px bg-gradient-to-b ${color} mx-auto relative z-0`} style={{ height: `${h * 4}px` }} />;
}

function HBar({ width = '60%', color = 'bg-white/10' }: { width?: string; color?: string }) {
  return <div className={`h-px ${color} mx-auto relative z-0`} style={{ width }} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HierarchyPage() {
  const { loading, fetchHierarchyData } = useHierarchySystem();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchHierarchyData().then(setData);
  }, [fetchHierarchyData]);

  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent font-cairo">
        <div className="flex flex-col items-center gap-6 relative z-10">
          <div className="relative flex items-center justify-center">
            <div className="h-20 w-20 rounded-full border-4 border-amber-500/10 border-t-amber-500 animate-spin shadow-[0_0_40px_rgba(245,158,11,0.4)]" />
            <Network className="absolute w-8 h-8 text-amber-400 animate-pulse" />
          </div>
          <p className="text-amber-500 font-black tracking-widest text-sm sm:text-base animate-pulse uppercase drop-shadow-md">جاري رسم الخريطة التنظيمية...</p>
        </div>
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none z-0" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-transparent text-slate-100 pb-32 overflow-x-hidden font-cairo pt-6 sm:pt-10" dir="rtl">
      
      {/* 🚀 الخلفية الزجاجية المضيئة المريحة للعين */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] bg-amber-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] bg-violet-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] bg-blue-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 🚀 Header */}
        <motion.div initial="hidden" animate="show" variants={stagger} className="text-center mb-16 sm:mb-24 space-y-4 sm:space-y-6">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] sm:text-xs font-black text-amber-400 uppercase tracking-widest shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> الهيكل التنظيمي الرسمي
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-l from-amber-300 via-white to-slate-300 leading-tight drop-shadow-lg pb-2">
            شجرة الرفعة
          </motion.h1>
          <motion.p variants={fadeUp} className="text-slate-400 font-bold text-sm sm:text-base lg:text-lg max-w-2xl mx-auto leading-relaxed drop-shadow-sm">
            الخريطة الإدارية والأكاديمية المعتمدة للمدرسة — اضغط على أي بطاقة لاستعراض الملف المهني والتفاصيل الخاصة بكل عضو.
          </motion.p>
        </motion.div>

        {/* 🚀 The Tree */}
        <motion.div initial="hidden" animate="show" variants={stagger} className="flex flex-col items-center select-none relative z-10">
          
          {/* Level 1: Admin */}
          {data.admin && (
            <div className="flex flex-col items-center">
              <AdminCard admin={data.admin} />
              {(data.supervisors.length > 0 || data.hods.length > 0) && (
                <VLine h={12} color="from-amber-500/50 to-amber-500/10" />
              )}
            </div>
          )}

          {/* Level 2: Supervisors */}
          {data.supervisors.length > 0 && (
            <div className="flex flex-col items-center w-full">
              {data.supervisors.length > 1 && (
                <HBar width="40%" color="bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
              )}
              {data.supervisors.length > 1 && (
                <div className="flex justify-around w-[40%]">
                  <VLine h={6} color="from-amber-500/30 to-emerald-500/30" />
                  <VLine h={6} color="from-amber-500/30 to-emerald-500/30" />
                </div>
              )}
              <div className="flex flex-wrap justify-center gap-6 sm:gap-12 mt-4">
                {data.supervisors.map((sup: any) => (
                  <SupervisorCard key={sup.id} sup={sup} />
                ))}
              </div>
              {data.hods.length > 0 && (
                <div className="mt-4">
                  <VLine h={16} color="from-emerald-500/40 to-emerald-500/10" />
                </div>
              )}
            </div>
          )}

          {/* Level 3: HODs & Teachers */}
          {data.hods.length > 0 && (
            <div className="flex flex-col items-center w-full mt-4">
              {data.hods.length > 1 && (
                <HBar width="70%" color="bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
              )}
              {data.hods.length > 1 && (
                <div className="flex justify-between w-[70%] px-[10%]">
                  {data.hods.map((_: any, i: number) => (
                    <VLine key={i} h={8} color="from-emerald-500/30 to-violet-500/30" />
                  ))}
                </div>
              )}
              
              <div className="flex flex-wrap justify-center gap-8 sm:gap-16 mt-6">
                {data.hods.map((hod: any) => (
                  <DeptColumn 
                    key={hod.id} 
                    hod={hod} 
                    teachers={getTeachersUnderHOD(hod, data.teachers)} 
                  />
                ))}
              </div>
            </div>
          )}

        </motion.div>
      </div>

      {/* 🚀 Custom Scrollbar styling for departments list */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(139, 92, 246, 0.3); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(139, 92, 246, 0.6); }
      `}} />
    </div>
  );
}
