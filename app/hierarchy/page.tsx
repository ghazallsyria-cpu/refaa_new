'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, GraduationCap, Crown, Shield, School, Layers, ChevronDown } from 'lucide-react';
import { useHierarchySystem } from '@/hooks/useHierarchySystem';

export default function HierarchyPage() {
  const { loading, fetchHierarchyData } = useHierarchySystem();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchHierarchyData().then(setData);
  }, [fetchHierarchyData]);

  if (loading || !data) {
    return <div className="flex h-[80vh] items-center justify-center"><div className="h-14 w-14 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div></div>;
  }

  // 🧠 دالة لفلترة المعلمين التابعين لرئيس القسم
  const getTeachersUnderHOD = (hod: any) => {
    return data.teachers.filter((t: any) => {
      if (t.id === hod.teacher_id) return false; // استبعاد رئيس القسم نفسه
      const matchSubject = t.specialization === hod.subject?.name;
      const matchStage = hod.stage_name === 'الكل' || t.stage === hod.stage_name || t.stage === 'مشترك';
      return matchSubject && matchStage;
    });
  };

  const UserCard = ({ user, role, icon: Icon, color, isHOD = false, isAdmin = false }: any) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`relative bg-white p-6 rounded-[2rem] shadow-sm border border-${color}-100 hover:shadow-lg hover:-translate-y-1 transition-all text-center flex flex-col items-center w-64 z-10`}>
      {isAdmin && <Crown className="absolute -top-4 text-yellow-400 h-8 w-8 drop-shadow-md" />}
      <div className={`h-20 w-20 rounded-2xl bg-${color}-50 border-2 border-${color}-200 flex items-center justify-center mb-4 overflow-hidden shadow-inner`}>
        {user.avatar_url ? (
           <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
        ) : (
           <Icon className={`h-10 w-10 text-${color}-500`} />
        )}
      </div>
      <h3 className={`font-black text-lg text-slate-900 leading-tight mb-1 truncate w-full`}>{user.full_name || 'مستخدم'}</h3>
      <p className={`text-xs font-bold px-3 py-1 rounded-lg bg-${color}-50 text-${color}-700 mt-2`}>{role}</p>
    </motion.div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 font-cairo" dir="rtl">
      <div className="text-center mb-16 space-y-4">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">الهيكلية التنظيمية</h1>
        <p className="text-slate-500 font-bold">شجرة الإدارة والأقسام التعليمية لمدرسة الرفعة</p>
      </div>

      <div className="flex flex-col items-center space-y-16 relative">
        
        {/* المستوى الأول: الإدارة */}
        <div className="flex flex-col items-center relative">
          <div className="flex flex-wrap justify-center gap-6">
            {data.admins.map((admin: any) => (
              <UserCard key={admin.id} user={admin} role={admin.role === 'admin' ? 'مدير النظام' : 'الإدارة'} icon={Shield} color="indigo" isAdmin={true} />
            ))}
          </div>
          {/* خط التوصيل السفلي */}
          <div className="w-0.5 h-16 bg-slate-200 mt-6"></div>
        </div>

        {/* المستوى الثاني: المشرفون (المهام الخاصة) */}
        {data.supervisors.length > 0 && (
          <div className="flex flex-col items-center relative w-full">
            <div className="absolute top-0 w-[80%] h-0.5 bg-slate-200"></div>
            <div className="flex flex-wrap justify-center gap-6 pt-10">
              {data.supervisors.map((sup: any) => (
                <div key={sup.id} className="relative flex flex-col items-center">
                  <div className="absolute -top-10 w-0.5 h-10 bg-slate-200"></div>
                  <UserCard user={sup.users} role={(sup.custom_titles || []).join(' + ')} icon={Users} color="emerald" />
                </div>
              ))}
            </div>
            <div className="w-0.5 h-16 bg-slate-200 mt-6"></div>
          </div>
        )}

        {/* المستوى الثالث: رؤساء الأقسام ومعلميهم */}
        <div className="w-full relative">
           <div className="absolute top-0 w-[90%] left-[5%] h-0.5 bg-slate-200"></div>
           <div className="flex flex-wrap justify-center gap-x-12 gap-y-16 pt-10 items-start">
             {data.departmentHeads.map((hod: any, idx: number) => {
               const underTeachers = getTeachersUnderHOD(hod);
               return (
                 <div key={idx} className="relative flex flex-col items-center w-[300px]">
                   <div className="absolute -top-10 w-0.5 h-10 bg-slate-200"></div>
                   
                   {/* كرت رئيس القسم */}
                   <div className="relative z-20">
                     <UserCard 
                        user={hod.teacher?.users} 
                        role={`رئيس قسم ${hod.subject?.name} (${hod.stage_name})`} 
                        icon={GraduationCap} 
                        color="amber" 
                        isHOD={true} 
                     />
                   </div>

                   {/* المعلمون التابعون له */}
                   {underTeachers.length > 0 && (
                     <div className="flex flex-col items-center mt-4 w-full">
                       <ChevronDown className="text-slate-300 h-6 w-6 mb-2" />
                       <div className="w-full bg-slate-50/50 rounded-3xl p-4 border border-slate-200 space-y-3">
                         {underTeachers.map((t: any) => (
                           <div key={t.id} className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                             <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-black text-sm shrink-0">
                               {t.users?.full_name?.charAt(0)}
                             </div>
                             <div className="flex-1 min-w-0">
                               <p className="text-sm font-black text-slate-800 truncate">{t.users?.full_name}</p>
                               <p className="text-[10px] font-bold text-slate-400 mt-0.5">{t.stage}</p>
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}
                 </div>
               );
             })}
           </div>
        </div>

      </div>
    </div>
  );
}
