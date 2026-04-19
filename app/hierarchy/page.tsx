/* eslint-disable react/no-unescaped-entities */
'use client';
 
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, GraduationCap, Crown, Shield, ChevronDown, Network, Award, Star, Sparkles, BookOpen, ChevronRight } from 'lucide-react';
import { useHierarchySystem, getTeachersUnderHOD } from '@/hooks/useHierarchySystem';
 
// ─── variants ────────────────────────────────────────────────────────────────
const fadeUp = { hidden: { opacity: 0, y: 32 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 80, damping: 18 } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };
const scaleIn = { hidden: { opacity: 0, scale: 0.85 }, show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 120, damping: 16 } } };
 
// ─── level palette ────────────────────────────────────────────────────────────
const PALETTES = {
  admin:     { ring: 'ring-amber-400/60',     glow: 'shadow-amber-500/30',   badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',   icon: 'bg-amber-500/15 text-amber-400',  line: 'from-amber-400/60 to-amber-300/20' },
  supervisor:{ ring: 'ring-emerald-400/60',   glow: 'shadow-emerald-500/20', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: 'bg-emerald-500/15 text-emerald-400', line: 'from-emerald-400/60 to-emerald-300/20' },
  hod:       { ring: 'ring-violet-400/60',    glow: 'shadow-violet-500/20',  badge: 'bg-violet-500/20 text-violet-300 border-violet-500/40',  icon: 'bg-violet-500/15 text-violet-400',  line: 'from-violet-400/50 to-violet-300/10' },
  teacher:   { ring: 'ring-blue-400/40',      glow: 'shadow-blue-500/10',    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',       icon: 'bg-blue-500/10 text-blue-400',      line: '' },
};
 
// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ url, name, size = 'lg', palette }: { url?: string; name?: string; size?: 'sm'|'md'|'lg'|'xl'; palette: typeof PALETTES['admin'] }) {
  const dims = { sm: 'h-11 w-11 text-base rounded-2xl', md: 'h-16 w-16 text-xl rounded-[1.2rem]', lg: 'h-24 w-24 text-3xl rounded-[1.8rem]', xl: 'h-32 w-32 text-4xl rounded-[2rem]' };
  return (
    <div className={`relative shrink-0 ${dims[size]}`}>
      <div className={`w-full h-full ${dims[size]} overflow-hidden ring-2 ${palette.ring} bg-[#0a0d1a] flex items-center justify-center font-black shadow-xl ${palette.glow}`}>
        {url ? <img src={url} alt={name} className="w-full h-full object-cover" /> : (
          <span className="text-white/70">{name?.charAt(0) || '؟'}</span>
        )}
      </div>
      <div className={`absolute -bottom-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#070a14] shadow-[0_0_8px_rgba(52,211,153,0.8)]`} />
    </div>
  );
}
 
// ─── Admin Card ───────────────────────────────────────────────────────────────
function AdminCard({ admin }: { admin: any }) {
  const p = PALETTES.admin;
  return (
    <motion.div variants={scaleIn}>
      <Link href="/admin/profile" className="group block">
        <div className={`relative flex flex-col items-center gap-4 p-8 rounded-[2.5rem] border border-white/8 bg-gradient-to-b from-[#0f1320] to-[#070a14] shadow-2xl ${p.glow} hover:shadow-amber-500/40 transition-all duration-500 hover:-translate-y-2 w-72 text-center overflow-hidden`}>
          {/* glow blob */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/20 transition-colors duration-500" />
          {/* crown */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
            <Crown className="w-8 h-8 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
          </div>
          <div className="mt-4">
            <Avatar url={admin.avatar_url} name={admin.full_name} size="xl" palette={p} />
          </div>
          <div className="relative z-10 space-y-2">
            <h3 className="text-xl font-black text-white group-hover:text-amber-300 transition-colors">{admin.full_name}</h3>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${p.badge} shadow-inner`}>
              <Shield className="w-3 h-3" /> مدير المدرسة
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
    <motion.div variants={scaleIn}>
      <Link href={`/teachers/${sup.id}`} className="group block">
        <div className={`relative flex flex-col items-center gap-3 p-6 rounded-[2rem] border border-white/8 bg-gradient-to-b from-[#0b1218] to-[#070a14] shadow-xl hover:shadow-emerald-500/30 transition-all duration-500 hover:-translate-y-2 w-60 text-center overflow-hidden`}>
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors pointer-events-none" />
          <Avatar url={sup.users?.avatar_url} name={sup.users?.full_name} size="lg" palette={p} />
          <div className="relative z-10 space-y-1.5">
            <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors">{sup.users?.full_name}</h3>
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black border ${p.badge} shadow-inner`}>
              <Star className="w-2.5 h-2.5" /> {titles || 'مشرف تربوي'}
            </span>
            {sup.specialization && (
              <p className="text-[10px] font-bold text-slate-500 pt-1">{sup.specialization}</p>
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
    <motion.div variants={fadeUp} className="flex flex-col items-center w-[300px] sm:w-[320px]">
 
      {/* HOD Card */}
      <div className="relative z-10 w-full">
        <Link href={`/teachers/${hod.teacher_id}`} className="group block">
          <div className={`relative flex items-center gap-4 p-5 rounded-[1.8rem] border border-white/8 bg-gradient-to-br from-[#0f0d1f] to-[#070a14] shadow-xl hover:shadow-violet-500/30 transition-all duration-500 hover:-translate-y-1 overflow-hidden`}>
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-violet-500/15 rounded-full blur-2xl group-hover:bg-violet-500/25 transition-colors pointer-events-none" />
            {/* award badge */}
            <div className="absolute top-2 left-3 z-20">
              <Award className="w-5 h-5 text-violet-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.7)]" />
            </div>
            <Avatar url={hod.teacher?.users?.avatar_url} name={hod.teacher?.users?.full_name} size="md" palette={p} />
            <div className="relative z-10 flex-1 min-w-0">
              <p className="text-sm font-black text-white group-hover:text-violet-300 transition-colors truncate">{hod.teacher?.users?.full_name}</p>
              <p className={`inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-[9px] font-black border ${p.badge} shadow-inner`}>
                <GraduationCap className="w-2.5 h-2.5" /> رئيس قسم {hod.subject?.name}
              </p>
              <p className="text-[9px] font-bold text-slate-500 mt-1.5">{hod.stage_name}</p>
            </div>
          </div>
        </Link>
      </div>
 
      {/* connector + toggle */}
      {teachers.length > 0 && (
        <>
          <div className="w-px h-6 bg-gradient-to-b from-violet-400/50 to-violet-400/10" />
          <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0f0d1f] border border-violet-500/20 text-[9px] font-black text-violet-400 hover:bg-violet-500/10 transition-all mb-1 shadow-inner">
            <Users className="w-2.5 h-2.5" /> {teachers.length} أعضاء
            <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
          </button>
 
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="overflow-hidden w-full"
              >
                <div className="w-px h-4 bg-gradient-to-b from-violet-400/20 to-transparent mx-auto" />
                <div className="relative p-3 rounded-[1.5rem] border border-white/5 bg-[#070a14]/80 backdrop-blur-xl shadow-inner space-y-2 overflow-hidden">
                  {/* subtle mesh */}
                  <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_50%_0%,_rgba(167,139,250,1),transparent_70%)] pointer-events-none" />
                  <div className="relative z-10 max-h-80 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                    {teachers.map((t: any) => (
                      <Link href={`/teachers/${t.id}`} key={t.id} className="group/item flex items-center gap-3 p-3 rounded-[1.2rem] bg-[#0a0d1a]/80 border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all duration-300 hover:-translate-x-1">
                        <Avatar url={t.users?.avatar_url} name={t.users?.full_name} size="sm" palette={tp} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-white group-hover/item:text-blue-300 transition-colors truncate">{t.users?.full_name}</p>
                          <div className="flex gap-1.5 mt-1 flex-wrap">
                            {t.specialization && <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5 truncate max-w-[100px]">{t.specialization}</span>}
                            <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">{t.stage}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-3 h-3 text-slate-600 group-hover/item:text-blue-400 transition-colors shrink-0 opacity-0 group-hover/item:opacity-100" />
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
  return <div className={`w-px bg-gradient-to-b ${color} mx-auto`} style={{ height: `${h * 4}px` }} />;
}
 
function HBar({ width = '60%', color = 'bg-white/10' }: { width?: string; color?: string }) {
  return <div className={`h-px ${color} mx-auto`} style={{ width }} />;
}
 
// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HierarchyPage() {
  const { loading, fetchHierarchyData } = useHierarchySystem();
  const [data, setData] = useState<any>(null);
 
  useEffect(() => {
    fetchHierarchyData().then(setData);
  }, [fetchHierarchyData]);
 
  // ── loading ──
  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070a14] font-cairo">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="h-20 w-20 rounded-full border-4 border-amber-500/10 border-t-amber-500 animate-spin shadow-[0_0_30px_rgba(245,158,11,0.3)]" />
            <Network className="absolute inset-0 m-auto w-8 h-8 text-amber-400 animate-pulse" />
          </div>
          <p className="text-amber-500/80 font-black tracking-widest text-sm animate-pulse uppercase">جاري رسم الخريطة...</p>
        </div>
      </div>
    );
  }
 
  return (
    <div className="min-h-screen relative bg-transparent text-slate-100 pb-32 overflow-x-hidden font-cairo pt-6" dir="rtl">
 
      {/* ── decorative orbs ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-15%] right-[-10%] w-[45rem] h-[45rem] bg-amber-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[45rem] h-[45rem] bg-violet-600/5 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] left-[30%] w-[25rem] h-[25rem] bg-blue-600/4 rounded-full blur-[100px]" />
      </div>
 
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 
        {/* ── Hero Header ── */}
        <motion.div initial="hidden" animate="show" variants={stagger} className="text-center mb-20 sm:mb-28 space-y-5">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black uppercase tracking-widest shadow-inner">
            <Sparkles className="w-3.5 h-3.5" /> الهيكل التنظيمي الرسمي
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-l from-amber-300 via-white to-slate-300 leading-none drop-shadow-2xl">
            شجرة الرفعة
          </motion.h1>
          <motion.p variants={fadeUp} className="text-slate-400 font-bold text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            الخريطة الإدارية والأكاديمية المعتمدة — اضغط على أي بطاقة لاستعراض الملف المهني
          </motion.p>
 
          {/* quick stats */}
          <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-3 sm:gap-5 pt-4">
            {[
              { label: 'إداريون', value: data.admins.length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
              { label: 'مشرفون', value: data.supervisors.length, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
              { label: 'رؤساء أقسام', value: data.departmentHeads.length, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
              { label: 'معلمون', value: data.teachers.length, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
            ].map(s => (
              <div key={s.label} className={`flex items-center gap-2 px-4 py-2 rounded-2xl border ${s.bg} shadow-inner`}>
                <span className={`text-xl font-black ${s.color}`}>{s.value}</span>
                <span className="text-xs font-bold text-slate-400">{s.label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
 
        {/* ══════════════════════════════════════════════════════════════
            LEVEL 1 — ADMIN
        ══════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col items-center">
 
          {/* label */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex items-center gap-3 mb-6 self-center">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-500/40" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-500/60">الإدارة العليا</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-amber-500/40" />
          </motion.div>
 
          <motion.div initial="hidden" animate="show" variants={stagger} className="flex flex-wrap justify-center gap-6">
            {data.admins.length > 0
              ? data.admins.map((a: any) => <AdminCard key={a.id} admin={a} />)
              : <div className="px-8 py-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-amber-400 font-bold text-sm">لم يتم تعيين حسابات الإدارة بعد</div>
            }
          </motion.div>
 
          <VLine h={14} color={PALETTES.admin.line} />
 
          {/* ════════════════════════════════════════════════════════════
              LEVEL 2 — SUPERVISORS
          ════════════════════════════════════════════════════════════ */}
          {data.supervisors.length > 0 && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex items-center gap-3 mb-6 self-center">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-emerald-500/40" />
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500/60">المشرفون التربويون</span>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-emerald-500/40" />
              </motion.div>
 
              {/* horizontal span */}
              <HBar width="55%" color="bg-gradient-to-r from-transparent via-emerald-500/25 to-transparent" />
 
              <motion.div initial="hidden" animate="show" variants={stagger} className="flex flex-wrap justify-center gap-5 mt-0">
                {data.supervisors.map((s: any) => <SupervisorCard key={s.id} sup={s} />)}
              </motion.div>
 
              <VLine h={14} color={PALETTES.supervisor.line} />
            </>
          )}
 
          {/* ════════════════════════════════════════════════════════════
              LEVEL 3 — DEPT HEADS + TEACHERS
          ════════════════════════════════════════════════════════════ */}
          {data.departmentHeads.length > 0 && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex items-center gap-3 mb-8 self-center">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-violet-500/40" />
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-violet-500/60">رؤساء الأقسام وأعضاؤها</span>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-violet-500/40" />
              </motion.div>
 
              {/* umbrella bar */}
              <HBar width="88%" color="bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
 
              <motion.div
                initial="hidden"
                animate="show"
                variants={stagger}
                className="flex flex-wrap justify-center gap-x-6 gap-y-10 mt-8 items-start"
              >
                {data.departmentHeads.map((hod: any, idx: number) => {
                  const under = getTeachersUnderHOD(hod, data.teachers);
                  return <DeptColumn key={idx} hod={hod} teachers={under} />;
                })}
              </motion.div>
            </>
          )}
 
          {/* ════════════════════════════════════════════════════════════
              No data fallback
          ════════════════════════════════════════════════════════════ */}
          {data.departmentHeads.length === 0 && data.supervisors.length === 0 && (
            <div className="mt-16 text-center py-16 px-8 rounded-[2rem] border border-dashed border-white/10 bg-[#070a14]/60 shadow-inner max-w-md mx-auto">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 font-bold">لا توجد بيانات هيكلية كافية حتى الآن.</p>
            </div>
          )}
 
        </div>
      </div>
 
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  );
}
