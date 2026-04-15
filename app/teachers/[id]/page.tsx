'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Users, GraduationCap, Crown, BookOpen, FileText, ChevronRight, Briefcase, Layers } from 'lucide-react';
import { useProfileSystem } from '@/hooks/useProfileSystem';
import { getParentDepartment } from '@/hooks/useHierarchySystem'; // للاستفادة من قاموس المواد

export default function TeacherProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const { loading, fetchTeacherProfile } = useProfileSystem();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (id) fetchTeacherProfile(id as string).then(setData);
  }, [id, fetchTeacherProfile]);

  if (loading || !data) return <div className="flex h-[80vh] justify-center items-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div></div>;

  const isHOD = data.department_heads && data.department_heads.length > 0;
  const customTitles = data.custom_titles || [];
  const sectionsTaught = data.teacher_sections || [];
  const parentDept = getParentDepartment(data.specialization);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 font-cairo" dir="rtl">
      
      {/* زر العودة */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-black mb-8 transition-colors">
        <ChevronLeft className="w-5 h-5" /> العودة لإدارة المعلمين
      </button>

      {/* الهيدر الفخم المعتمد على دور المعلم */}
      <div className={`relative rounded-[3rem] p-1 shadow-xl mb-10 overflow-hidden ${isHOD ? 'bg-gradient-to-r from-amber-500 to-orange-600' : 'bg-gradient-to-r from-indigo-600 to-blue-600'}`}>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="bg-white/95 backdrop-blur-xl rounded-[2.8rem] p-8 sm:p-12 relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8 text-center md:text-right">
          
          <div className="relative shrink-0">
            <div className={`h-32 w-32 rounded-[2rem] flex items-center justify-center text-5xl font-black shadow-inner border-4 ${isHOD ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
              {data.users?.full_name?.charAt(0) || 'م'}
            </div>
            {isHOD && <Crown className="absolute -top-4 -right-4 h-10 w-10 text-yellow-500 drop-shadow-md animate-bounce" />}
          </div>

          <div className="flex-1 space-y-3 pt-2">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">{data.users?.full_name}</h1>
            <p className="text-slate-500 font-bold font-mono tracking-widest">{data.national_id}</p>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-3">
              {isHOD && <span className="px-4 py-1.5 bg-amber-100 text-amber-700 font-black text-xs rounded-xl border border-amber-200">رئيس قسم {data.department_heads[0]?.subject?.name}</span>}
              <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 font-black text-xs rounded-xl border border-indigo-100">تخصص: {data.specialization || 'عام'}</span>
              <span className="px-4 py-1.5 bg-slate-100 text-slate-600 font-black text-xs rounded-xl border border-slate-200">قسم {parentDept}</span>
              {customTitles.map((t: string, i: number) => <span key={i} className="px-4 py-1.5 bg-emerald-50 text-emerald-700 font-black text-xs rounded-xl border border-emerald-200">{t}</span>)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* العمود الأيمن: الإحصائيات والأرقام */}
        <div className="space-y-8">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
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
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
             <h3 className="text-lg font-black mb-2 relative z-10">معلومات التواصل</h3>
             <p className="text-indigo-200 text-sm font-bold mb-6 relative z-10">البيانات المسجلة في النظام</p>
             <div className="space-y-4 relative z-10">
               <div className="bg-white/10 p-4 rounded-2xl"><p className="text-[10px] text-indigo-300 uppercase tracking-widest mb-1">البريد الإلكتروني</p><p className="font-bold font-mono">{data.users?.email}</p></div>
               <div className="bg-white/10 p-4 rounded-2xl"><p className="text-[10px] text-indigo-300 uppercase tracking-widest mb-1">رقم الهاتف</p><p className="font-bold font-mono">{data.users?.phone || 'غير مسجل'}</p></div>
             </div>
          </motion.div>
        </div>

        {/* العمود الأيسر: الجدول والفصول المسندة */}
        <div className="lg:col-span-2 space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
            <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Users className="w-6 h-6"/></div>
              الفصول المسندة للمعلم
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
          </motion.div>
        </div>
      </div>

    </div>
  );
}
