/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // 🚀 1. استيراد الراوتر
import { motion } from 'framer-motion';
import { Users, GraduationCap, Crown, Shield, ChevronDown } from 'lucide-react';
import { useHierarchySystem, DEPARTMENT_MAPPINGS } from '@/hooks/useHierarchySystem';

export default function HierarchyPage() {
  const router = useRouter(); // 🚀 2. تفعيل الراوتر
  const { loading, fetchHierarchyData } = useHierarchySystem();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchHierarchyData().then(setData);
  }, [fetchHierarchyData]);

  if (loading || !data) {
    return <div className="flex h-[80vh] items-center justify-center"><div className="h-14 w-14 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div></div>;
  }

  // 🧠 فلترة ذكية للمعلمين تحت رئيس القسم (تراعي تداخل المواد)
  const getTeachersUnderHOD = (hod: any) => {
    const hodSubjectName = hod.subject?.name;
    const subSubjects = DEPARTMENT_MAPPINGS[hodSubjectName] || [hodSubjectName]; 

    return data.teachers.filter((t: any) => {
      if (t.id === hod.teacher_id) return false; 
      
      const matchSubject = subSubjects.includes(t.specialization) || t.specialization?.includes(hodSubjectName);
      const matchStage = hod.stage_name === 'الكل' || t.stage === hod.stage_name || t.stage === 'مشترك';
      
      return matchSubject && matchStage;
    });
  };

  // 🚀 3. تحويل الكارد إلى زر تفاعلي (أضفنا onClick و cursor-pointer)
  const UserCard = ({ user, role, icon: Icon, color, isHOD = false, isAdmin = false, subRole = '' }: any) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      onClick={() => {
        if (isAdmin) router.push('/admin/profile'); // إذا كان مدير يذهب لصفحته
        else if (user?.id) router.push(`/teachers/${user.id}`); // إذا كان معلم أو مشرف يذهب لصفحته
      }}
      className={`relative bg-white p-6 rounded-[2rem] shadow-sm border border-${color}-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 text-center flex flex-col items-center w-64 z-10 cursor-pointer`}
    >
      {isAdmin && <Crown className="absolute -top-5 text-yellow-400 h-10 w-10 drop-shadow-lg animate-bounce" />}
      {isHOD && <Crown className="absolute -top-3 -right-2 text-amber-500 h-7 w-7 drop-shadow-md" />}
      
      <div className={`h-24 w-24 rounded-[1.5rem] bg-gradient-to-br from-${color}-50 to-white border-2 border-${color}-200 flex items-center justify-center mb-4 overflow-hidden shadow-inner`}>
        {user?.avatar_url ? (
           <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
        ) : (
           <span className={`text-3xl font-black text-${color}-600`}>{user?.full_name?.charAt(0) || <Icon className="h-10 w-10" />}</span>
        )}
      </div>
      <h3 className={`font-black text-lg text-slate-900 leading-tight mb-1 truncate w-full`}>{user?.full_name || 'مستخدم'}</h3>
      <p className={`text-xs font-black px-4 py-1.5 rounded-xl bg-${color}-50 text-${color}-700 mt-2 shadow-sm border border-${color}-100`}>{role}</p>
      {subRole && <p className="text-[10px] font-bold text-slate-400 mt-2 truncate w-full">{subRole}</p>}
    </motion.div>
  );

  return (
    <div className="max-w-[90rem] mx-auto px-4 py-12 font-cairo overflow-x-hidden" dir="rtl">
      <div className="text-center mb-20 space-y-4">
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight bg-clip-text text-transparent bg-gradient-to-l from-indigo-600 to-emerald-600">الهيكلية التنظيمية المدرسية</h1>
        <p className="text-slate-500 font-bold text-lg">الخريطة الإدارية والأقسام التعليمية التفاعلية</p>
      </div>

      <div className="flex flex-col items-center space-y-16 relative">
        
        {/* المستوى 1: الإدارة العليا */}
        <div className="flex flex-col items-center relative z-20">
          <div className="flex flex-wrap justify-center gap-8">
            {data.admins.length > 0 ? data.admins.map((admin: any) => (
              <UserCard key={admin.id} user={admin} role="الإدارة العليا" icon={Shield} color="indigo" isAdmin={true} />
            )) : (
              <div className="px-8 py-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-800 font-black shadow-sm">لم يتم تعيين حسابات إدارية (Management) بعد</div>
            )}
          </div>
          <div className="w-1 h-16 bg-gradient-to-b from-indigo-200 to-slate-200 mt-6 rounded-full"></div>
        </div>

        {/* المستوى 2: المشرفون (المهام الخاصة) */}
        {data.supervisors.length > 0 && (
          <div className="flex flex-col items-center relative w-full z-10">
            <div className="absolute top-0 w-[80%] h-1 bg-slate-200 rounded-full"></div>
            <div className="flex flex-wrap justify-center gap-8 pt-10">
              {data.supervisors.map((sup: any) => (
                <div key={sup.id} className="relative flex flex-col items-center">
                  <div className="absolute -top-10 w-1 h-10 bg-slate-200 rounded-full"></div>
                  <UserCard user={sup.users} role={(sup.custom_titles || []).join(' + ')} subRole={`التخصص الأساسي: ${sup.specialization}`} icon={Users} color="emerald" />
                </div>
              ))}
            </div>
            <div className="w-1 h-20 bg-gradient-to-b from-slate-200 to-amber-200 mt-6 rounded-full"></div>
          </div>
        )}

        {/* المستوى 3: رؤساء الأقسام ومعلميهم (الشجرة المتداخلة) */}
        <div className="w-full relative">
           <div className="absolute top-0 w-[95%] left-[2.5%] h-1 bg-amber-200 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)]"></div>
           
           <div className="flex flex-wrap justify-center gap-x-12 gap-y-20 pt-12 items-start">
             {data.departmentHeads.map((hod: any, idx: number) => {
               const underTeachers = getTeachersUnderHOD(hod);
               return (
                 <div key={idx} className="relative flex flex-col items-center w-[320px]">
                   <div className="absolute -top-12 w-1 h-12 bg-amber-200 rounded-full"></div>
                   
                   {/* بطاقة رئيس القسم الفخمة */}
                   <div className="relative z-20">
                     <UserCard 
                        user={hod.teacher?.users} 
                        role={`رئيس قسم ${hod.subject?.name}`} 
                        subRole={`المرحلة: ${hod.stage_name}`}
                        icon={GraduationCap} 
                        color="amber" 
                        isHOD={true} 
                     />
                   </div>

                   {/* المعلمون التابعون له (مع توضيح تخصصهم الدقيق) */}
                   {underTeachers.length > 0 && (
                     <div className="flex flex-col items-center mt-6 w-full relative">
                       <ChevronDown className="text-amber-300 h-8 w-8 mb-3 animate-bounce" />
                       <div className="w-full bg-slate-50/80 backdrop-blur-md rounded-[2rem] p-5 border border-slate-200 shadow-inner space-y-3 relative before:absolute before:inset-0 before:ring-1 before:ring-inset before:ring-black/5 before:rounded-[2rem]">
                         <div className="text-center mb-4">
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100">أعضاء القسم ({underTeachers.length})</span>
                         </div>
                         {underTeachers.map((t: any) => (
                           <div 
                             key={t.id} 
                             onClick={() => router.push(`/teachers/${t.id}`)} // 🚀 4. جعل المعلمين الصغار قابلين للنقر
                             className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group cursor-pointer"
                           >
                             <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 font-black text-lg border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors shrink-0">
                               {t.users?.full_name?.charAt(0)}
                             </div>
                             <div className="flex-1 min-w-0">
                               <p className="text-sm font-black text-slate-800 truncate group-hover:text-indigo-700 transition-colors">{t.users?.full_name}</p>
                               <div className="flex gap-2 mt-1">
                                 <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md truncate">{t.specialization}</span>
                                 <span className="text-[9px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-500 rounded-md">{t.stage}</span>
                               </div>
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
