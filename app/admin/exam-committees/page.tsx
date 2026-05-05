'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, FileText, Printer, ShieldCheck, 
  Settings, Loader2, Search, Trash2, PrinterIcon, IdCard, DoorOpen, LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useExamSeating } from '@/hooks/useExamSeating'; // المحرك الذي صنعناه

export default function ExamCommitteesControl() {
  const { isLoading: isEngineLoading, progressMsg, initializeCommittees, generateSeatingAndDistribute } = useExamSeating();
  
  const [committees, setCommittees] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [invigilators, setInvigilators] = useState<any[]>([]);
  const [allocationsStats, setAllocationsStats] = useState<any>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedCommittee, setSelectedCommittee] = useState<any>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  // إعدادات الفصل الدراسي الافتراضية (يمكن جلبها من الإعدادات لاحقاً)
  const currentYear = '2025-2026';
  const currentSemester = 'الفصل الدراسي الثاني';

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. جلب اللجان
      const { data: comms } = await supabase.from('exam_committees')
        .select('*')
        .eq('academic_year', currentYear)
        .eq('semester', currentSemester)
        .order('name');
      
      // 2. جلب المعلمين (لتعيينهم كمراقبين)
      const { data: tchrs } = await supabase.from('teachers').select('id, users(full_name)');
      
      // 3. جلب المراقبين المعينين للجان
      const { data: invigs } = await supabase.from('committee_invigilators').select('id, committee_id, teacher_id, users(full_name)');
      
      // 4. جلب إحصائيات التوزيع (عدد الطلاب في كل لجنة)
      const { data: allocs } = await supabase.from('student_seat_allocations')
        .select('committee_id')
        .eq('academic_year', currentYear)
        .eq('semester', currentSemester);

      const stats: any = {};
      if (allocs) {
        allocs.forEach((a: any) => {
          stats[a.committee_id] = (stats[a.committee_id] || 0) + 1;
        });
      }

      setCommittees(comms || []);
      setTeachers(tchrs?.map(t => ({ id: t.id, name: t.users?.full_name || 'بدون اسم' })).sort((a, b) => a.name.localeCompare(b.name)) || []);
      setInvigilators(invigs || []);
      setAllocationsStats(stats);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 🚀 تشغيل محرك تهيئة اللجان
  const handleInit = async () => {
    if (!confirm('تنبيه: سيتم مسح جميع اللجان والتوزيعات السابقة لهذا الفصل وإنشاء 22 لجنة جديدة فارغة. هل أنت متأكد؟')) return;
    const success = await initializeCommittees(currentYear, currentSemester);
    if (success) fetchData();
  };

  // 🚀 تشغيل محرك التوزيع الذكي
  const handleDistribute = async () => {
    if (!confirm('هل أنت متأكد من بدء عملية خلط وتوزيع طلاب العاشر والحادي عشر وتوليد أرقام الجلوس؟')) return;
    const result = await generateSeatingAndDistribute(currentYear, currentSemester);
    if (result.success) {
      alert(`تم بنجاح! تم توزيع ${result.totalAllocated} طالب على ${result.totalCommittees} لجنة.`);
      fetchData();
    }
  };

  // 🚀 إضافة مراقب للجنة
  const handleAddInvigilator = async () => {
    if (!selectedTeacherId || !selectedCommittee) return;
    
    // التحقق من عدم تجاوز مراقبين اثنين
    const currentInvigs = invigilators.filter(i => i.committee_id === selectedCommittee.id);
    if (currentInvigs.length >= 2) {
      alert('لا يمكن إضافة أكثر من مراقبين اثنين لكل لجنة!');
      return;
    }

    try {
      await supabase.from('committee_invigilators').insert({
        committee_id: selectedCommittee.id,
        teacher_id: selectedTeacherId
      });
      setIsAssignModalOpen(false);
      setSelectedTeacherId('');
      fetchData();
    } catch (error) {
      alert('حدث خطأ أثناء التعيين');
    }
  };

  // 🚀 إزالة مراقب
  const handleRemoveInvigilator = async (id: string) => {
    if (!confirm('إزالة هذا المراقب من اللجنة؟')) return;
    try {
      await supabase.from('committee_invigilators').delete().eq('id', id);
      fetchData();
    } catch (error) {
      alert('حدث خطأ أثناء الإزالة');
    }
  };

  const openAssignModal = (committee: any) => {
    setSelectedCommittee(committee);
    setIsAssignModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-cairo" dir="rtl">
      
      {/* 🚀 شاشة التحميل للمحرك الذكي */}
      <AnimatePresence>
        {isEngineLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center text-white">
            <Loader2 className="w-16 h-16 animate-spin text-indigo-400 mb-6" />
            <h2 className="text-2xl font-black mb-2 animate-pulse">{progressMsg}</h2>
            <p className="text-slate-300 font-bold">الرجاء عدم إغلاق هذه الصفحة حتى تكتمل العملية...</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* 🚀 رأس الصفحة ولوحة التحكم الرئيسية */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
          <div className="absolute -left-10 -top-10 text-indigo-50/50 pointer-events-none">
            <ShieldCheck className="w-64 h-64" />
          </div>
          <div className="relative z-10">
            <h1 className="text-3xl font-black text-slate-900 mb-2 flex items-center gap-3">
              <LayoutGrid className="w-8 h-8 text-indigo-600" /> غرفة كنترول الامتحانات
            </h1>
            <p className="text-slate-500 font-bold text-sm">
              إدارة اللجان، توزيع الطلاب الأبجدي، وتعيين المراقبين لعام {currentYear} ({currentSemester})
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 relative z-10 w-full md:w-auto">
            <button onClick={handleInit} className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 border border-slate-300">
              <Settings className="w-5 h-5" /> 1. تهيئة اللجان (22 لجنة)
            </button>
            <button onClick={handleDistribute} disabled={committees.length === 0} className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
              <Users className="w-5 h-5" /> 2. الخلط الذكي وتوليد أرقام الجلوس
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-20"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /></div>
        ) : committees.length === 0 ? (
          <div className="text-center p-20 bg-white rounded-3xl border border-slate-200 border-dashed">
            <h3 className="text-xl font-black text-slate-400">لا توجد لجان مهيأة بعد. اضغط على "تهيئة اللجان" للبدء.</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {committees.map((committee, idx) => {
              const studentsCount = allocationsStats[committee.id] || 0;
              const committeeInvigs = invigilators.filter(i => i.committee_id === committee.id);
              const isFull = studentsCount >= committee.capacity;

              return (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} key={committee.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col">
                  <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-xl font-black text-slate-800">{committee.name}</h3>
                      <p className="text-xs font-bold text-slate-400 mt-1">السعة القصوى: {committee.capacity}</p>
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 ${isFull ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      <Users className="w-4 h-4"/> {studentsCount} طالب
                    </div>
                  </div>

                  {/* 🚀 قسم المراقبين */}
                  <div className="flex-1 mb-4">
                    <p className="text-xs font-black text-slate-500 mb-3 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-400"/> المراقبون ({committeeInvigs.length}/2)
                    </p>
                    <div className="space-y-2">
                      {committeeInvigs.map(invig => (
                        <div key={invig.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-xs font-bold text-slate-700 truncate">{invig.users?.full_name}</span>
                          <button onClick={() => handleRemoveInvigilator(invig.id)} className="text-rose-400 hover:text-rose-600 p-1 bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      ))}
                      {committeeInvigs.length < 2 && (
                        <button onClick={() => openAssignModal(committee)} className="w-full p-2.5 rounded-xl border-2 border-dashed border-indigo-200 text-indigo-600 font-bold text-xs hover:bg-indigo-50 flex items-center justify-center gap-2 transition-colors">
                          <UserPlus className="w-4 h-4" /> إضافة مراقب
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 🚀 قسم مركز الطباعة العمراني (سيتم تفعيلها في الخطوة القادمة) */}
                  <div className="border-t border-slate-100 pt-4 flex gap-2">
                    <button onClick={() => alert('سيتم تفعيل مركز الطباعة في الخطوة القادمة!')} className="flex-1 bg-slate-800 text-white text-[10px] font-black py-2.5 rounded-xl flex items-center justify-center gap-1 hover:bg-slate-700 transition-colors shadow-sm">
                      <DoorOpen className="w-3 h-3"/> كشف الباب
                    </button>
                    <button onClick={() => alert('سيتم تفعيل مركز الطباعة في الخطوة القادمة!')} className="flex-1 bg-indigo-50 text-indigo-700 text-[10px] font-black py-2.5 rounded-xl flex items-center justify-center gap-1 hover:bg-indigo-100 transition-colors shadow-sm">
                      <FileText className="w-3 h-3"/> بطاقات الطاولة
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🚀 نافذة اختيار المراقبين */}
      <AnimatePresence>
        {isAssignModalOpen && selectedCommittee && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" onClick={() => setIsAssignModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-50 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <UserPlus className="w-6 h-6 text-indigo-600"/> تعيين مراقب لـ ({selectedCommittee.name})
                </h3>
                <button onClick={() => setIsAssignModalOpen(false)} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-full"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">اختر المعلم من القائمة</label>
                  <select value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-indigo-500">
                    <option value="">-- اختر المعلم --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <button onClick={handleAddInvigilator} disabled={!selectedTeacherId} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md">
                  تأكيد التعيين
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
