/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Users, GraduationCap, Crown, Shield, ChevronDown, Network, Award } from 'lucide-react';
import { useHierarchySystem, getTeachersUnderHOD } from '@/hooks/useHierarchySystem';

// 🚀 إعدادات الألوان الديناميكية (خارج المكون الرئيسي لتخفيف الضغط)
const cardColors: any = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', glow: 'group-hover:shadow-indigo-500/20' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', glow: 'group-hover:shadow-emerald-500/20' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', glow: 'group-hover:shadow-amber-500/20' },
};

// 🚀 تم نقل UserCard للخارج للحفاظ على الأداء ومنع الـ Re-render العشوائي
const UserCard = ({ user, role, icon: Icon, color, isHOD = false, isAdmin = false, subRole = '', href }: any) => {
  const isImage = user?.avatar_url && user.avatar_url.trim() !== '';
  const c = cardColors[color] || cardColors.indigo;

  return (
    <Link href={href || '#'} className="block relative z-20 group outline-none">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className={`relative bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-sm border border-slate-100 group-hover:shadow-2xl group-hover:-translate-y-3 transition-all duration-500 text-center flex flex-col items-center w-72 cursor-pointer ${c.glow} z-10`}
      >
        {isAdmin && <Crown className="absolute -top-6 text-yellow-400 h-12 w-12 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] animate-bounce z-20" />}
        {isHOD && <Award className="absolute -top-4 -right-3 text-amber-500 h-10 w-10 drop-shadow-md z-20" />}
        
        {/* هالة مضيئة خلف الصورة */}
        <div className="absolute top-8 w-24 h-24 bg-white rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
        
        <div className={`h-28 w-28 rounded-[2rem] ${c.bg} border-4 border-white flex items-center justify-center mb-5 overflow-hidden shadow-inner group-hover:scale-110 transition-transform duration-500 relative z-10 ring-1 ring-slate-100`}>
          {isImage ? (
             <img src={user.avatar_url} alt={user?.full_name || 'صورة المستخدم'} className="w-full h-full object-cover" />
          ) : (
             <span className={`text-4xl font-black ${c.text}`}>
                {user?.full_name?.charAt(0) || <Icon className="h-12 w-12" />}
             </span>
          )}
        </div>
        
        <h3 className="font-black text-xl text-slate-900 leading-tight mb-2 truncate w-full group-hover:text-indigo-600 transition-colors">
            {user?.full_name || 'مستخدم'}
        </h3>
        <p className={`text-xs font-black px-4 py-1.5 rounded-xl ${c.bg} ${c.text} mt-2 shadow-inner border border-white`}>{role}</p>
        {subRole && <p className="text-[11px] font-bold text-slate-400 mt-3 truncate w-full border-t border-slate-100 pt-3">{subRole}</p>}
      </motion.div>
    </Link>
  );
};

export default function HierarchyPage() {
  const { loading, fetchHierarchyData } = useHierarchySystem();
  const [data, setData] = useState<any>(null);

  // 🚀 جلب البيانات بشكل آمن لمنع تسريب الذاكرة
  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      try {
        const result = await fetchHierarchyData();
        if (mounted && result) {
            setData(result);
        }
      } catch (error) {
        console.error("خطأ في جلب بيانات الهيكلية:", error);
      }
    };

    loadData();
    return () => { mounted = false; };
  }, [fetchHierarchyData]);

  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent shadow-lg shadow-indigo-200"></div>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-sm animate-pulse">جاري رسم الخريطة الإدارية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] relative overflow-x-hidden font-cairo" dir="rtl">
      
      {/* 🚀 خلفية سينمائية متحركة */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[40rem] h-[40rem] bg-indigo-400/10 rounded-full blur-[100px] animate-[pulse_8s_ease-in-out_infinite]"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[40rem] h-[40rem] bg-amber-400/10 rounded-full blur-[100px] animate-[pulse_8s_ease-in-out_infinite] delay-1000"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
      </div>

      <div className="max-w-[100rem] mx-auto px-4 py-16 sm:py-24 relative z-10">
        
        <div className="text-center mb-24 space-y-6">
          <div className="inline-flex items-center justify-center p-4 bg-white rounded-3xl shadow-sm border border-slate-100 mb-2">
            <Network className="w-10 h-10 text-indigo-600" />
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight bg-clip-text text-transparent bg-gradient-to-l from-indigo-800 to-blue-600 drop-shadow-sm">
            شجرة الرفعة التنظيمية
          </h1>
          <p className="text-slate-500 font-bold text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            الخريطة الإدارية والأكاديمية المعتمدة. اضغط على أي بطاقة لاستعراض الملف المهني.
          </p>
        </div>

        <div className="flex flex-col items-center relative">
          
          {/* المستوى 1: الإدارة العليا */}
          <div className="flex flex-col items-center relative z-30">
            <div className="flex flex-wrap justify-center gap-8">
              {data?.admins?.length > 0 ? data.admins.map((admin: any) => (
                <UserCard 
                  key={admin.id} 
                  user={admin} 
                  role="مدير المدرسة" 
                  icon={Shield} 
                  color="indigo" 
                  isAdmin={true} 
                  href={`/admin/profile`} 
                />
              )) : (
                <div className="px-10 py-5 bg-indigo-50 border border-indigo-100 rounded-3xl text-indigo-800 font-black shadow-sm">
                   لم يتم تعيين حسابات الإدارة العليا بعد
                </div>
              )}
            </div>
            {/* خط الربط النازل */}
            <div className="w-1.5 h-24 bg-gradient-to-b from-indigo-300 to-slate-200 mt-4 rounded-full shadow-inner"></div>
          </div>

          {/* المستوى 2: المشرفون التربويون */}
          {data?.supervisors?.length > 0 && (
            <div className="flex flex-col items-center relative w-full z-20">
              {/* خط الربط الأفقي */}
              <div className="absolute top-0 w-[60%] h-1.5 bg-slate-200 rounded-full shadow-inner"></div>
              
              <div className="flex flex-wrap justify-center gap-10 pt-12">
                {data.supervisors.map((sup: any) => (
                  <div key={sup.id} className="relative flex flex-col items-center group">
                    {/* خط الربط النازل لكل مشرف */}
                    <div className="absolute -top-12 w-1.5 h-12 bg-slate-200 rounded-full group-hover:bg-emerald-300 transition-colors"></div>
                    <UserCard 
                      user={sup?.users} 
                      role={(sup?.custom_titles || []).join(' + ') || 'مشرف'} 
                      subRole={`تخصص: ${sup?.specialization || 'عام'}`} 
                      icon={Users} 
                      color="emerald" 
                      href={`/teachers/${sup.id}`} 
                    />
                  </div>
                ))}
              </div>
              <div className="w-1.5 h-32 bg-gradient-to-b from-slate-200 to-amber-300 mt-4 rounded-full shadow-inner"></div>
            </div>
          )}

          {/* المستوى 3: رؤساء الأقسام ومعلميهم (الشجرة المتداخلة الذكية) */}
          {data?.departmentHeads?.length > 0 && (
            <div className="w-full relative z-10">
               {/* خط المظلة الأفقي لرؤساء الأقسام */}
               <div className="absolute top-0 w-[90%] left-[5%] h-1.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent rounded-full opacity-70"></div>
               
               <div className="flex flex-wrap justify-center gap-x-8 gap-y-28 pt-16 items-start">
                 {data.departmentHeads.map((hod: any, idx: number) => {
                   // 🚀 استخدام الخوارزمية الذكية الجديدة للفرز بشكل آمن
                   const underTeachers = getTeachersUnderHOD(hod, data?.teachers || []);
                   
                   return (
                     <div key={idx} className="relative flex flex-col items-center w-[340px] group/dept">
                       {/* خط الربط النازل لرئيس القسم */}
                       <div className="absolute -top-16 w-1.5 h-16 bg-gradient-to-b from-amber-300 to-amber-200 rounded-full group-hover/dept:shadow-[0_0_10px_rgba(251,191,36,0.8)] transition-shadow"></div>
                       
                       {/* بطاقة رئيس القسم الفخمة */}
                       <div className="relative z-20">
                         <UserCard 
                            user={hod?.teacher?.users} 
                            role={`رئيس قسم ${hod?.subject?.name || ''}`} 
                            subRole={`المرحلة: ${hod?.stage_name || ''}`}
                            icon={GraduationCap} 
                            color="amber" 
                            isHOD={true} 
                            href={`/teachers/${hod?.teacher_id}`} 
                         />
                       </div>

                       {/* المعلمون التابعون له */}
                       {underTeachers?.length > 0 && (
                         <div className="flex flex-col items-center mt-6 w-full relative z-10">
                           <ChevronDown className="text-amber-400 h-10 w-10 mb-4 animate-bounce drop-shadow-sm" />
                           
                           <div className="w-full bg-white/60 backdrop-blur-2xl rounded-[2.5rem] p-6 border border-white/80 shadow-xl shadow-slate-200/50 space-y-3 relative overflow-hidden group-hover/dept:border-amber-200/50 transition-colors duration-500">
                             <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-transparent pointer-events-none"></div>
                             
                             <div className="text-center mb-5 relative z-10">
                               <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white px-4 py-1.5 rounded-full shadow-sm border border-slate-100">
                                 أعضاء القسم ({underTeachers.length})
                               </span>
                             </div>
                             
                             <div className="space-y-3 relative z-10 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                               {underTeachers.map((t: any) => {
                                 const isTeacherImage = t?.users?.avatar_url && t.users.avatar_url.trim() !== '';
                                 return (
                                   <Link 
                                     href={`/teachers/${t.id}`} 
                                     key={t.id} 
                                     className="flex items-center gap-4 bg-white p-3.5 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-300 transition-all duration-300 group/item hover:-translate-y-1"
                                   >
                                     <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 font-black text-xl border border-slate-100 group-hover/item:bg-indigo-50 group-hover/item:text-indigo-600 transition-colors shrink-0 overflow-hidden shadow-inner">
                                       {isTeacherImage ? (
                                         <img src={t.users.avatar_url} className="w-full h-full object-cover" alt={t.users?.full_name}/>
                                       ) : (
                                         t.users?.full_name?.charAt(0) || 'أ'
                                       )}
                                     </div>
                                     <div className="flex-1 min-w-0">
                                       <p className="text-sm font-black text-slate-900 truncate group-hover/item:text-indigo-700 transition-colors">{t.users?.full_name || 'معلم'}</p>
                                       <div className="flex gap-2 mt-1.5">
                                         <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-50 text-slate-500 rounded border border-slate-100 truncate">{t.specialization || 'عام'}</span>
                                         <span className="text-[9px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded border border-indigo-100">{t.stage || 'غير محدد'}</span>
                                       </div>
                                     </div>
                                   </Link>
                                 );
                               })}
                             </div>
                           </div>
                         </div>
                       )}
                     </div>
                   );
                 })}
               </div>
            </div>
          )}

        </div>
      </div>
      
      {/* 🚀 يفضل مستقبلاً نقل هذه التنسيقات لملف global.css ولكنها تعمل جيداً هنا */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}
