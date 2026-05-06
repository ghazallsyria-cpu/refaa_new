// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Search, UserSearch, ShieldCheck, GraduationCap, 
  ArrowLeft, Loader2, User, Fingerprint, Sparkles
} from 'lucide-react';

export default function Student360Explorer() {
  const router = useRouter();
  const { authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [students, setStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!['admin', 'management', 'staff', 'teacher'].includes(currentRole)) return;

    const fetchStudents = async () => {
      try {
        const { data, error } = await supabase
          .from('students')
          .select(`
            id,
            national_id,
            users!students_id_fkey(full_name, avatar_url),
            sections(name, classes(name))
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const formatted = (data || []).map((s: any) => {
          const userInfo = Array.isArray(s.users) ? s.users[0] : s.users;
          const sectionInfo = Array.isArray(s.sections) ? s.sections[0] : s.sections;
          const classInfo = sectionInfo?.classes;
          const className = Array.isArray(classInfo) ? classInfo[0]?.name : classInfo?.name;

          return {
            id: s.id,
            national_id: s.national_id,
            full_name: userInfo?.full_name || 'طالب غير معروف',
            avatar_url: userInfo?.avatar_url,
            class_name: className || 'صف غير محدد',
            section_name: sectionInfo?.name || '',
          };
        });

        formatted.sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar'));

        setStudents(formatted);
        // 🚀 التعديل الجذري: لا نضع الطلاب هنا لتبقى الشاشة نظيفة
        setFilteredStudents([]); 
      } catch (err) {
        console.error('Error fetching students:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, [currentRole]);

  // محرك البحث اللحظي
  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    // 🚀 إذا كان مربع البحث فارغاً، نفرغ قائمة النتائج
    if (!term) {
      setFilteredStudents([]);
      return;
    }

    const filtered = students.filter(s => 
      s.full_name.toLowerCase().includes(term) || 
      (s.national_id && s.national_id.includes(term)) ||
      s.class_name.toLowerCase().includes(term)
    );
    setFilteredStudents(filtered);
  }, [searchTerm, students]);

  if (!['admin', 'management', 'staff', 'teacher'].includes(currentRole)) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-cairo pb-20 relative overflow-x-hidden" dir="rtl">
      
      <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-indigo-900 via-slate-800 to-slate-50 overflow-hidden z-0">
         <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
         <div className="absolute top-10 left-10 w-96 h-96 bg-indigo-500 rounded-full blur-[120px] opacity-30 pointer-events-none"></div>
         <div className="absolute top-20 right-10 w-72 h-72 bg-blue-500 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-12 sm:pt-20">
        
        <div className="text-center mb-10 sm:mb-16">
           <div className="w-20 h-20 mx-auto bg-white/10 border border-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-2xl mb-6">
              <UserSearch className="w-10 h-10 text-indigo-300" />
           </div>
           <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4 drop-shadow-md">
             مستكشف الطلاب <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">360°</span>
           </h1>
           <p className="text-indigo-200 font-bold text-sm sm:text-base max-w-2xl mx-auto">
             ابحث عن أي طالب بالاسم أو الرقم المدني للوصول إلى ملفه الأكاديمي، سجل الحضور، الواجبات، والملاحظات السرية بضغطة زر.
           </p>
        </div>

        <div className="max-w-3xl mx-auto mb-12 sm:mb-16 relative group">
           <div className="absolute inset-y-0 right-6 flex items-center pointer-events-none text-indigo-400 group-focus-within:text-indigo-600 transition-colors">
              <Search className="w-6 h-6 sm:w-7 sm:h-7" />
           </div>
           <input
             type="text"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             placeholder="اكتب اسم الطالب، أو الرقم المدني، أو الصف للبحث السريع..."
             className="w-full bg-white/95 backdrop-blur-xl border-4 border-white/40 rounded-full py-5 sm:py-6 pr-16 pl-6 text-base sm:text-lg font-black text-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.1)] focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400"
           />
           {searchTerm && (
             <div className="absolute top-1/2 left-4 transform -translate-y-1/2">
                <span className="bg-indigo-100 text-indigo-700 text-[10px] sm:text-xs font-black px-3 py-1.5 rounded-full border border-indigo-200 shadow-sm">
                   {filteredStudents.length} نتيجة
                </span>
             </div>
           )}
        </div>

        {isLoading ? (
          <div className="flex justify-center p-20">
            <Loader2 className="w-12 h-12 animate-spin text-indigo-600 drop-shadow-md" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            <AnimatePresence mode="wait">
              {/* 🚀 واجهة ترحيبية عندما يكون مربع البحث فارغاً */}
              {!searchTerm.trim() ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -20 }}
                  className="col-span-full flex flex-col items-center justify-center py-20"
                >
                   <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-indigo-100">
                      <Sparkles className="w-10 h-10 text-indigo-300" />
                   </div>
                   <h3 className="text-2xl font-black text-slate-700 mb-2">مستعد للبحث!</h3>
                   <p className="text-slate-500 font-bold max-w-md text-center">قم بكتابة الحروف الأولى من اسم الطالب أو رقمه المدني في الأعلى لتبدأ النتائج بالظهور فوراً.</p>
                </motion.div>
              ) : filteredStudents.length > 0 ? (
                /* عرض النتائج في حال وجودها */
                filteredStudents.map((student, idx) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: idx > 15 ? 0 : idx * 0.05 }}
                    onClick={() => router.push(`/admin/student-360/${student.id}`)}
                    className="bg-white rounded-[2rem] p-5 border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 cursor-pointer transition-all group flex flex-col justify-between"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 font-black text-2xl flex items-center justify-center shrink-0 border border-indigo-100 shadow-inner overflow-hidden group-hover:scale-105 transition-transform">
                        {student.avatar_url ? (
                          <img src={student.avatar_url} className="w-full h-full object-cover" alt="Student" />
                        ) : (
                          student.full_name.charAt(0)
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <h3 className="font-black text-slate-800 text-base sm:text-lg truncate group-hover:text-indigo-700 transition-colors">{student.full_name}</h3>
                        <p className="text-[11px] sm:text-xs font-bold text-slate-500 mt-1 flex items-center gap-1.5 truncate">
                          <GraduationCap className="w-3.5 h-3.5" /> {student.class_name} - {student.section_name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                      <span className="text-[10px] font-black text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                        <Fingerprint className="w-3 h-3" /> {student.national_id || 'بدون رقم مدني'}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                /* واجهة عدم وجود نتائج */
                <motion.div 
                  key="no-results"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="col-span-full text-center py-20 bg-white/50 backdrop-blur-md rounded-[2rem] border-2 border-dashed border-slate-300"
                >
                   <UserSearch className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                   <h3 className="text-xl font-black text-slate-600 mb-2">لا يوجد طلاب يطابقون بحثك</h3>
                   <p className="text-sm font-bold text-slate-400">تأكد من كتابة الاسم أو الرقم المدني بشكل صحيح.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}} />
    </div>
  );
}
