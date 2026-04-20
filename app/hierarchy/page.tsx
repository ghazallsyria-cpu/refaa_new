/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, GraduationCap, Crown, Shield, Network, ChevronDown } from 'lucide-react';
import { useHierarchySystem, getTeachersUnderHOD } from '@/hooks/useHierarchySystem';

// 🎨 ألوان متناسقة وهادئة
const cardColors: any = {
  indigo: { bg: 'bg-indigo-50/50', text: 'text-indigo-700', border: 'border-indigo-100', iconBg: 'bg-indigo-100', hover: 'hover:border-indigo-300 hover:shadow-indigo-500/10' },
  emerald: { bg: 'bg-emerald-50/50', text: 'text-emerald-700', border: 'border-emerald-100', iconBg: 'bg-emerald-100', hover: 'hover:border-emerald-300 hover:shadow-emerald-500/10' },
  amber: { bg: 'bg-amber-50/50', text: 'text-amber-700', border: 'border-amber-100', iconBg: 'bg-amber-100', hover: 'hover:border-amber-300 hover:shadow-amber-500/10' },
};

// 🧩 1. بطاقة المستخدم الأساسية (الإدارة والمشرفين)
const UserCard = ({ user, role, subRole, icon: Icon, color, href, isTop = false }: any) => {
  const c = cardColors[color] || cardColors.indigo;
  const isImage = user?.avatar_url?.trim();

  return (
    <Link href={href || '#'} className="block outline-none w-full sm:w-72">
      <motion.div 
        whileHover={{ y: -4 }}
        className={`relative flex flex-col items-center p-6 bg-white rounded-3xl border ${c.border} shadow-sm ${c.hover} transition-all duration-300`}
      >
        {isTop && <Crown className="absolute -top-4 text-yellow-400 h-8 w-8 drop-shadow-sm" />}
        
        <div className={`w-20 h-20 rounded-2xl ${c.iconBg} flex items-center justify-center mb-4 overflow-hidden shadow-inner border-2 border-white ring-1 ring-slate-100`}>
          {isImage ? (
            <img src={user.avatar_url} alt={user?.full_name} className="w-full h-full object-cover" />
          ) : (
            <Icon className={`h-8 w-8 ${c.text}`} />
          )}
        </div>
        
        <h3 className="font-black text-lg text-slate-800 text-center truncate w-full">{user?.full_name || 'مستخدم'}</h3>
        <span className={`text-[11px] font-black px-3 py-1 rounded-lg ${c.bg} ${c.text} mt-2 border ${c.border}`}>{role}</span>
        {subRole && <p className="text-[11px] font-bold text-slate-400 mt-2 truncate w-full text-center">{subRole}</p>}
      </motion.div>
    </Link>
  );
};

// 🧩 2. بطاقة القسم المعزولة (لتحسين الأداء وإدارة حالة الطي/الفتح)
const DepartmentCard = ({ hod, allTeachers }: { hod: any, allTeachers: any[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const underTeachers = getTeachersUnderHOD(hod, allTeachers);
  const c = cardColors.amber;
  const isImage = hod?.teacher?.users?.avatar_url?.trim();

  return (
    <div className={`bg-white rounded-3xl border ${c.border} shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md`}>
      {/* رأس القسم (بيانات رئيس القسم) */}
      <div className="p-5 flex flex-col items-center border-b border-slate-50 relative">
        <Link href={`/teachers/${hod?.teacher_id}`} className="flex flex-col items-center w-full group">
          <div className={`w-16 h-16 rounded-2xl ${c.iconBg} flex items-center justify-center mb-3 overflow-hidden shadow-inner border-2 border-white ring-1 ring-slate-100 group-hover:scale-105 transition-transform`}>
            {isImage ? (
              <img src={hod.teacher.users.avatar_url} alt="HOD" className="w-full h-full object-cover" />
            ) : (
              <GraduationCap className={`h-7 w-7 ${c.text}`} />
            )}
          </div>
          <h3 className="font-black text-base text-slate-800 text-center truncate w-full group-hover:text-amber-600 transition-colors">
            {hod?.teacher?.users?.full_name || 'رئيس قسم'}
          </h3>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${c.bg} ${c.text} mt-1.5 border ${c.border}`}>
            رئيس قسم {hod?.subject?.name || ''}
          </span>
          <p className="text-[10px] text-slate-400 font-bold mt-1">المرحلة: {hod?.stage_name || 'عام'}</p>
        </Link>
      </div>

      {/* زر عرض المعلمين */}
      {underTeachers.length > 0 ? (
        <div>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="w-full py-3 px-5 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors text-slate-600 outline-none"
          >
            <span className="text-xs font-black">أعضاء القسم ({underTeachers.length})</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180 text-amber-500' : 'text-slate-400'}`} />
          </button>

          {/* قائمة المعلمين (متحركة) */}
          <AnimatePresence>
            {isOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-slate-50/30"
              >
                <div className="p-3 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                  {underTeachers.map((t: any) => {
                    const isTImage = t?.users?.avatar_url?.trim();
                    return (
                      <Link 
                        key={t.id} 
                        href={`/teachers/${t.id}`}
                        className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-100 hover:border-amber-200 hover:shadow-sm transition-all"
                      >
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden text-slate-400 font-black">
                          {isTImage ? (
                            <img src={t.users.avatar_url} className="w-full h-full object-cover" alt="T"/>
                          ) : (
                            t.users?.full_name?.charAt(0) || 'أ'
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-800 truncate">{t.users?.full_name || 'معلم'}</p>
                          <p className="text-[9px] text-slate-500 truncate mt-0.5">{t.specialization || 'عام'} • {t.stage}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="py-3 text-center bg-slate-50/50 text-[10px] font-bold text-slate-400">
          لا يوجد معلمون مسجلون في هذا القسم
        </div>
      )}
    </div>
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">جاري تحميل الهيكلية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-cairo pb-20" dir="rtl">
      
      {/* هيدر الصفحة */}
      <div className="bg-white border-b border-slate-200 pt-16 pb-12 mb-12">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-50 rounded-2xl mb-2 text-indigo-600">
            <Network className="w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">الهيكل التنظيمي للرفعة</h1>
          <p className="text-slate-500 font-bold text-base max-w-xl mx-auto">
            نظرة شاملة على الطاقم الإداري والأكاديمي. يمكنك استعراض ملف أي موظف بالضغط على بطاقته.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 space-y-16">
        
        {/* قسم الإدارة */}
        <section>
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="h-px bg-slate-200 flex-1 max-w-[100px]"></div>
            <h2 className="text-xl font-black text-slate-800 text-center">الإدارة العليا</h2>
            <div className="h-px bg-slate-200 flex-1 max-w-[100px]"></div>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            {data?.admins?.length > 0 ? data.admins.map((admin: any) => (
              <UserCard key={admin.id} user={admin} role="مدير المدرسة" icon={Shield} color="indigo" isTop={true} href="/admin/profile" />
            )) : (
              <p className="text-slate-400 font-bold text-sm">لم يتم تعيين إدارة.</p>
            )}
          </div>
        </section>

        {/* قسم الإشراف */}
        {data?.supervisors?.length > 0 && (
          <section>
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="h-px bg-slate-200 flex-1 max-w-[100px]"></div>
              <h2 className="text-xl font-black text-slate-800 text-center">الإشراف التربوي</h2>
              <div className="h-px bg-slate-200 flex-1 max-w-[100px]"></div>
            </div>
            <div className="flex flex-wrap justify-center gap-6">
              {data.supervisors.map((sup: any) => (
                <UserCard 
                  key={sup.id} 
                  user={sup?.users} 
                  role={(sup?.custom_titles || []).join(' • ') || 'مشرف'} 
                  subRole={`تخصص: ${sup?.specialization || 'عام'}`} 
                  icon={Users} 
                  color="emerald" 
                  href={`/teachers/${sup.id}`} 
                />
              ))}
            </div>
          </section>
        )}

        {/* قسم الأقسام الأكاديمية (CSS GRID مرتب ونظيف) */}
        {data?.departmentHeads?.length > 0 && (
          <section>
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="h-px bg-slate-200 flex-1 max-w-[100px]"></div>
              <h2 className="text-xl font-black text-slate-800 text-center">الأقسام الأكاديمية</h2>
              <div className="h-px bg-slate-200 flex-1 max-w-[100px]"></div>
            </div>
            
            {/* 🚀 السر هنا: استخدام Grid بدلاً من Flex لترتيب البطاقات بشكل أنيق */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {data.departmentHeads.map((hod: any, idx: number) => (
                <DepartmentCard key={idx} hod={hod} allTeachers={data?.teachers || []} />
              ))}
            </div>
          </section>
        )}

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}
