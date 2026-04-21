/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, GraduationCap, Crown, Shield, Network, ChevronDown, Award, Sparkles, Mail } from 'lucide-react';
import { useHierarchySystem } from '@/hooks/useHierarchySystem';
import { cn } from '@/lib/utils';

// 🧩 1. بطاقة المستخدم الأساسية (الإدارة)
const AdminCard = ({ user, role, icon: Icon, delay }: any) => {
  const isImage = user?.avatar_url?.trim();

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="w-full sm:w-80 relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2.5rem] blur opacity-20 group-hover:opacity-50 transition duration-500"></div>
      <div className="relative flex flex-col items-center p-8 bg-[#0a0d16] rounded-[2.5rem] border border-white/10 shadow-2xl h-full">
        <Crown className="absolute -top-5 text-yellow-500 h-10 w-10 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
        
        <div className="w-24 h-24 rounded-3xl bg-indigo-500/10 flex items-center justify-center mb-5 overflow-hidden shadow-inner border border-indigo-500/30 group-hover:scale-105 transition-transform duration-500">
          {isImage ? (
            <img src={user.avatar_url} alt={user?.full_name} className="w-full h-full object-cover" />
          ) : (
            <Icon className="h-10 w-10 text-indigo-400 drop-shadow-md" />
          )}
        </div>
        
        <h3 className="font-black text-xl text-white text-center truncate w-full drop-shadow-sm">{user?.full_name || 'مستخدم الإدارة'}</h3>
        <span className="text-xs font-black px-4 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 mt-3 border border-indigo-500/20 shadow-inner">{role}</span>
        {user?.email && <p className="text-[10px] font-bold text-slate-500 mt-3 flex items-center gap-1.5"><Mail className="w-3 h-3"/> {user.email}</p>}
      </div>
    </motion.div>
  );
};

// 🧩 2. بطاقة القسم الملكية (رئيس القسم والأعضاء)
const DepartmentCard = ({ dept, delay }: { dept: any, delay: number }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hod = dept.hod;
  const members = dept.members;
  const isHODImage = hod?.users?.avatar_url?.trim();

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="bg-[#05070e]/80 backdrop-blur-xl rounded-[2.5rem] border border-white/5 shadow-xl overflow-hidden group hover:border-white/10 transition-all relative flex flex-col h-full">
      
      {/* تأثير الإضاءة الخلفية */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[50px] pointer-events-none"></div>

      {/* رأس القسم (رئيس القسم) */}
      <div className="p-6 flex flex-col items-center relative z-10 border-b border-white/5 bg-[#0a0d16]/50 flex-grow-0">
        {hod ? (
          <Link href={`/teachers/${hod.id}`} className="flex flex-col items-center w-full group/hod outline-none">
            <div className="absolute top-4 right-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 p-1.5 rounded-lg shadow-inner"><Award className="w-4 h-4"/></div>
            
            <div className="w-20 h-20 rounded-[1.5rem] bg-[#05070e] flex items-center justify-center mb-4 overflow-hidden shadow-inner border border-white/10 group-hover/hod:border-amber-500/50 group-hover/hod:scale-105 transition-all duration-300">
              {isHODImage ? (
                <img src={hod.users.avatar_url} alt="HOD" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-amber-400">{hod.users?.full_name?.charAt(0)}</span>
              )}
            </div>
            <h3 className="font-black text-lg text-white text-center truncate w-full group-hover/hod:text-amber-400 transition-colors drop-shadow-sm">
              {hod.users?.full_name || 'رئيس قسم غير محدد'}
            </h3>
            <span className="text-[10px] font-black px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 mt-2 border border-amber-500/20 shadow-inner">
              رئيس قسم {dept.name}
            </span>
            <p className="text-[10px] text-slate-500 font-bold mt-2 tracking-widest">{hod.specialization || 'تخصص عام'}</p>
          </Link>
        ) : (
          <div className="flex flex-col items-center w-full opacity-50 py-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-3 border border-white/10"><GraduationCap className="w-6 h-6 text-slate-500"/></div>
            <h3 className="font-black text-base text-slate-400">قسم {dept.name}</h3>
            <span className="text-[9px] font-bold text-rose-400 mt-1">لا يوجد رئيس للقسم</span>
          </div>
        )}
      </div>

      {/* زر عرض الأعضاء والقائمة */}
      <div className="flex-1 flex flex-col justify-end bg-[#05070e]/40 z-10">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full py-4 px-6 flex items-center justify-between text-slate-400 hover:text-white hover:bg-white/5 transition-colors outline-none"
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="text-xs font-black">أعضاء القسم <span className="bg-white/10 px-2 py-0.5 rounded-md text-[10px] ml-1">{members.length}</span></span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180 text-amber-400' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-white/5 bg-[#020308]"
            >
              {members.length > 0 ? (
                <div className="p-3 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                  {members.map((t: any) => {
                    const isTImage = t.users?.avatar_url?.trim();
                    return (
                      <Link 
                        key={t.id} 
                        href={`/teachers/${t.id}`}
                        className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/10 transition-all group/member"
                      >
                        <div className="w-10 h-10 rounded-xl bg-[#05070e] flex items-center justify-center shrink-0 overflow-hidden text-slate-400 font-black border border-white/10 group-hover/member:border-indigo-500/30">
                          {isTImage ? (
                            <img src={t.users.avatar_url} className="w-full h-full object-cover" alt="T"/>
                          ) : (
                            t.users?.full_name?.charAt(0) || 'م'
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-200 truncate group-hover/member:text-white transition-colors">{t.users?.full_name || 'معلم'}</p>
                          <p className="text-[9px] text-slate-500 truncate mt-0.5 flex items-center gap-1.5">{t.specialization || 'عام'} <span className="w-1 h-1 rounded-full bg-slate-700"></span> <span className="text-indigo-400">{t.stage}</span></p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-[10px] font-bold text-slate-500">لا يوجد معلمين آخرين في هذا القسم.</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// 🧩 المكون الرئيسي للصفحة
export default function HierarchyPage() {
  const { loading, fetchHierarchyData } = useHierarchySystem();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    fetchHierarchyData().then(res => { if (mounted) setData(res); });
    return () => { mounted = false; };
  }, [fetchHierarchyData]);

  if (loading || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#05070e] font-cairo relative overflow-hidden">
        <div className="absolute inset-0 bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="flex flex-col items-center gap-5 relative z-10">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)]"></div>
          <p className="text-indigo-400 font-black tracking-widest text-sm animate-pulse drop-shadow-md">جاري رسم شجرة الرفعة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070e] font-cairo pb-24 overflow-x-hidden" dir="rtl">
      
      {/* ✨ خلفية الواجهة (Mesh Gradient) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[150px]"></div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* 👑 الهيدر الملكي */}
        <div className="pt-12 sm:pt-20 pb-16 text-center space-y-6">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center justify-center p-4 bg-indigo-500/10 rounded-[2rem] border border-indigo-500/20 text-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
            <Network className="w-10 h-10" />
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-lg">
            الهيكل الأكاديمي لمدرسة الرفعة
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-slate-400 font-bold text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            المنظومة التنظيمية المتكاملة لشركاء النجاح. تصفح الأقسام واضغط على أي بطاقة لعرض الملف الشخصي والمراسلة.
          </motion.p>
        </div>

        <div className="space-y-24">
          
          {/* 🛡️ قسم الإدارة */}
          <section>
            <div className="flex items-center justify-center gap-4 mb-12">
              <div className="h-px bg-gradient-to-l from-transparent to-white/20 flex-1 max-w-[150px]"></div>
              <h2 className="text-2xl font-black text-white text-center flex items-center gap-2 drop-shadow-md"><Shield className="text-indigo-400 w-6 h-6"/> القيادة والإدارة العليا</h2>
              <div className="h-px bg-gradient-to-r from-transparent to-white/20 flex-1 max-w-[150px]"></div>
            </div>
            <div className="flex flex-wrap justify-center gap-8">
              {data?.admins?.length > 0 ? data.admins.map((admin: any, idx: number) => (
                <AdminCard key={admin.id} user={admin} role="إدارة المدرسة" icon={Shield} delay={idx * 0.1} />
              )) : (
                <div className="bg-[#0a0d16] p-8 rounded-3xl border border-white/5 text-center w-full max-w-md">
                   <p className="text-slate-500 font-bold">جاري تحديث الهيكل الإداري.</p>
                </div>
              )}
            </div>
          </section>

          {/* 📚 الأقسام الأكاديمية (التحفة البصرية بـ CSS Grid) */}
          {data?.departments?.length > 0 && (
            <section>
              <div className="flex items-center justify-center gap-4 mb-12">
                <div className="h-px bg-gradient-to-l from-transparent to-white/20 flex-1 max-w-[150px]"></div>
                <h2 className="text-2xl font-black text-white text-center flex items-center gap-2 drop-shadow-md"><Sparkles className="text-amber-400 w-6 h-6"/> الأقسام الأكاديمية التخصصية</h2>
                <div className="h-px bg-gradient-to-r from-transparent to-white/20 flex-1 max-w-[150px]"></div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
                {data.departments.map((dept: any, idx: number) => (
                  <DepartmentCard key={dept.id} dept={dept} delay={idx * 0.05} />
                ))}
              </div>
            </section>
          )}

        </div>

      </div>

      {/* 🚀 التنسيقات المخصصة للسكرول بار */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  );
}
