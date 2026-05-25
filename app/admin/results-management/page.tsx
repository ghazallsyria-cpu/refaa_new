// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, AlertTriangle, CheckCircle2, X, Loader2, Award, 
  GraduationCap, Lock, Unlock, Percent, Filter, Activity, Save, EyeOff, Eye, Users, BookOpen, Layers
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export default function ResultsManagementPage() {
  const { user, authRole, isChecking } = useAuth() as any;
  const [settings, setSettings] = useState<any>(null);
  
  const [sectionsList, setSectionsList] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');

  const [students, setStudents] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [financeFilter, setFinanceFilter] = useState<'all' | 'cleared' | 'blocked'>('all');

  const currentYear = '2025-2026';
  const currentSemester = 'الفصل الدراسي الثاني';

  const fetchInitialData = async () => {
    setLoadingInitial(true);
    try {
      // 🌟 التعديل الآمن: جلب الإعدادات دون تحديد رقم ID ثابت
      const { data: settingsData } = await supabase.from('platform_settings').select('*').limit(1).maybeSingle();
      if (settingsData) setSettings(settingsData);

      const { data: secData, error: secErr } = await supabase
        .from('sections')
        .select('id, name, classes!inner(id, name, level)');
      
      if (!secErr && secData) {
         setSectionsList(secData);
      }
    } catch (e) {
      console.error(e);
      alert('خطأ في جلب إعدادات المنصة');
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    if (!isChecking && ['admin', 'management'].includes(authRole)) {
      fetchInitialData();
    }
  }, [isChecking, authRole]);

  const fetchSectionStudents = async (sectionId: string) => {
    if (!sectionId) return;
    setLoadingStudents(true);
    try {
      const { data: stdData, error } = await supabase
        .from('students')
        .select(`
          id, 
          has_financial_dues,
          section_id,
          users!inner(full_name, national_id),
          sections!inner(name, classes!inner(name, level)),
          student_final_results(final_percentage, academic_year, semester)
        `)
        .eq('section_id', sectionId);

      if (error) throw error;

      const formatted = (stdData || []).map(s => {
        const u = Array.isArray(s.users) ? s.users[0] : s.users;
        const sec = Array.isArray(s.sections) ? s.sections[0] : s.sections;
        const cls = Array.isArray(sec?.classes) ? sec.classes[0] : sec?.classes;
        const res = Array.isArray(s.student_final_results) ? s.student_final_results : [];
        const currentResult = res.find(r => r.academic_year === currentYear && r.semester === currentSemester);

        return {
          id: s.id,
          name: u?.full_name || 'بدون اسم',
          national_id: u?.national_id || '',
          className: cls?.name || '',
          sectionName: sec?.name || '',
          level: Number(cls?.level || 0),
          hasDues: s.has_financial_dues || false,
          percentage: currentResult ? currentResult.final_percentage : '',
        };
      });

      formatted.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
      setStudents(formatted);
    } catch (e) {
      console.error(e);
      alert('خطأ في جلب بيانات طلاب الفصل');
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (selectedSectionId) {
      fetchSectionStudents(selectedSectionId);
    } else {
      setStudents([]);
    }
  }, [selectedSectionId]);

  const uniqueClasses = useMemo(() => {
     const classesMap = new Map();
     sectionsList.forEach(sec => {
        if(sec.classes) classesMap.set(sec.classes.id, sec.classes);
     });
     return Array.from(classesMap.values()).sort((a, b) => a.level - b.level);
  }, [sectionsList]);

  const availableSections = useMemo(() => {
     if(!selectedClassId) return [];
     return sectionsList.filter(sec => sec.classes?.id === selectedClassId).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [sectionsList, selectedClassId]);

  // 🌟 التعديل الآمن لتحديث الإعدادات باستخدام الـ ID الحقيقي المستخرج
  const toggleSetting = async (field: string, currentValue: boolean) => {
    if (!settings?.id) { alert('لم يتم العثور على إعدادات المنصة في قاعدة البيانات.'); return; }
    
    const confirmMsg = field === 'results_suspense_mode' 
      ? (!currentValue ? 'سيتم إخفاء جميع الواجبات والاختبارات من لوحة الطلاب ووضع شاشة "ترقبوا النتائج". تأكيد؟' : 'سيتم إلغاء وضع الترقب وإعادة المنصة لطبيعتها. تأكيد؟')
      : (!currentValue ? 'سيتم إعلان النتائج للطلاب (الذين ليس عليهم ذمم مالية). تأكيد؟' : 'سيتم إخفاء النتائج وسحبها من لوحة الطلاب. تأكيد؟');
      
    if (!confirm(confirmMsg)) return;

    try {
      const { error } = await supabase.from('platform_settings').update({ [field]: !currentValue }).eq('id', settings.id);
      if (error) throw error;
      setSettings((prev: any) => ({ ...prev, [field]: !currentValue }));
    } catch (e) {
      alert('خطأ في تحديث الإعدادات');
    }
  };

  const toggleFinance = async (studentId: string, currentStatus: boolean) => {
    setSavingId(`fin-${studentId}`);
    try {
      const { error } = await supabase.from('students').update({ has_financial_dues: !currentStatus }).eq('id', studentId);
      if (error) throw error;
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, hasDues: !currentStatus } : s));
    } catch (e) {
      alert('خطأ في تحديث الحالة المالية');
    } finally {
      setSavingId(null);
    }
  };

  const handlePercentageChange = (studentId: string, val: string) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, percentage: val } : s));
  };

  const savePercentage = async (studentId: string, val: string) => {
    setSavingId(`perc-${studentId}`);
    try {
      const numVal = parseFloat(val) || 0;
      const { error } = await supabase.from('student_final_results').upsert({
        student_id: studentId,
        academic_year: currentYear,
        semester: currentSemester,
        final_percentage: numVal
      }, { onConflict: 'student_id,academic_year,semester' });

      if (error) throw error;
    } catch (e) {
      alert('خطأ في حفظ النتيجة');
    } finally {
      setSavingId(null);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.includes(searchTerm) || s.national_id.includes(searchTerm);
      const matchesFinance = financeFilter === 'all' ? true : financeFilter === 'blocked' ? s.hasDues : !s.hasDues;
      return matchesSearch && matchesFinance;
    });
  }, [students, searchTerm, financeFilter]);

  if (isChecking || loadingInitial) return <div className="flex h-screen items-center justify-center bg-[#02040a]"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>;
  if (!['admin', 'management'].includes(authRole)) return <div className="flex h-screen items-center justify-center bg-[#02040a]"><p className="text-white font-bold">وصول مقيد للإدارة فقط.</p></div>;

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-200 font-sans p-4 sm:p-8 pb-32" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#0a0f1d]/80 backdrop-blur-xl border border-indigo-500/20 p-8 rounded-[2rem] shadow-2xl">
           <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-black mb-3 border border-indigo-500/30 shadow-inner">
                <Award className="w-4 h-4" /> مركز القيادة العليا
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white drop-shadow-md">إدارة <span className="text-indigo-400">النتائج والذمم</span></h1>
              <p className="text-slate-400 font-bold mt-2 text-sm">التحكم في إصدار النتائج النهائية وحجبها عن المتعثرين مالياً.</p>
           </div>
           
           <div className="flex flex-col gap-3 w-full md:w-auto">
              <button 
                onClick={() => toggleSetting('results_suspense_mode', settings?.results_suspense_mode)}
                className={`flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-black text-sm transition-all shadow-lg border ${settings?.results_suspense_mode ? 'bg-amber-500 text-slate-900 border-amber-400 shadow-amber-500/20 animate-pulse' : 'bg-[#0f1423] text-slate-300 border-white/10 hover:border-amber-500/50 hover:text-amber-400'}`}
              >
                {settings?.results_suspense_mode ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                {settings?.results_suspense_mode ? 'إلغاء وضع الترقب' : 'تفعيل وضع الترقب (إخفاء المحتوى)'}
              </button>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => toggleSetting('results_published_middle', settings?.results_published_middle)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-xs transition-all border ${settings?.results_published_middle ? 'bg-emerald-600 text-white border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-[#0f1423] text-slate-300 border-white/10 hover:border-emerald-500/50'}`}
                >
                  إصدار نتائج المتوسط
                </button>
                <button 
                  onClick={() => toggleSetting('results_published_high', settings?.results_published_high)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-xs transition-all border ${settings?.results_published_high ? 'bg-emerald-600 text-white border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-[#0f1423] text-slate-300 border-white/10 hover:border-emerald-500/50'}`}
                >
                  إصدار نتائج الثانوي
                </button>
              </div>
           </div>
        </div>

        {/* Filters */}
        <div className="bg-gradient-to-br from-[#0a0f1d] to-[#02040a] p-6 sm:p-8 rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none"></div>
           
           <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2"><Filter className="w-5 h-5 text-indigo-400"/> استعلام الفصول (لحماية قاعدة البيانات)</h3>
           
           <div className="flex flex-col md:flex-row gap-4 items-center relative z-10">
              <div className="w-full md:w-1/3">
                 <label className="text-xs font-bold text-slate-400 block mb-2">1. حدد المرحلة والصف</label>
                 <select 
                    value={selectedClassId} 
                    onChange={(e) => {
                       setSelectedClassId(e.target.value);
                       setSelectedSectionId(''); 
                    }} 
                    className="w-full bg-[#0f1423] border border-white/10 rounded-xl p-4 text-sm font-black text-white outline-none focus:border-indigo-500 cursor-pointer shadow-inner transition-colors"
                 >
                    <option value="">- اختر الصف -</option>
                    {uniqueClasses.map(cls => (
                       <option key={cls.id} value={cls.id}>{cls.name} (الصف {cls.level})</option>
                    ))}
                 </select>
              </div>
              
              <div className="w-full md:w-1/3">
                 <label className="text-xs font-bold text-slate-400 block mb-2">2. حدد الشعبة / الفصل</label>
                 <select 
                    value={selectedSectionId} 
                    onChange={(e) => setSelectedSectionId(e.target.value)} 
                    disabled={!selectedClassId}
                    className="w-full bg-[#0f1423] border border-white/10 rounded-xl p-4 text-sm font-black text-white outline-none focus:border-indigo-500 cursor-pointer shadow-inner transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    <option value="">- اختر الفصل -</option>
                    {availableSections.map(sec => (
                       <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))}
                 </select>
              </div>

              <div className="w-full md:w-1/3">
                 <label className="text-xs font-bold text-slate-400 block mb-2">3. تصفية داخل الفصل</label>
                 <select 
                    value={financeFilter} 
                    onChange={(e) => setFinanceFilter(e.target.value as any)} 
                    className="w-full bg-[#0f1423] border border-white/10 rounded-xl p-4 text-sm font-black text-white outline-none focus:border-indigo-500 cursor-pointer shadow-inner transition-colors"
                 >
                    <option value="all">عرض كل طلاب الفصل</option>
                    <option value="cleared">مسددون فقط</option>
                    <option value="blocked">محجوبون فقط (ذمم)</option>
                 </select>
              </div>
           </div>
        </div>

        {selectedSectionId && !loadingStudents && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             <div className="bg-white/5 border border-white/10 p-6 rounded-[1.5rem] flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0"><Users className="w-6 h-6"/></div>
                <div><p className="text-slate-400 font-bold text-xs">طلاب الفصل</p><p className="text-2xl font-black text-white">{students.length}</p></div>
             </div>
             <div className="bg-rose-500/5 border border-rose-500/20 p-6 rounded-[1.5rem] flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0"><Lock className="w-6 h-6"/></div>
                <div><p className="text-slate-400 font-bold text-xs">محجوب مالياً</p><p className="text-2xl font-black text-rose-400">{students.filter(s => s.hasDues).length}</p></div>
             </div>
             <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-[1.5rem] flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0"><Percent className="w-6 h-6"/></div>
                <div><p className="text-slate-400 font-bold text-xs">نتائج مكتملة</p><p className="text-2xl font-black text-emerald-400">{students.filter(s => s.percentage).length}</p></div>
             </div>
          </motion.div>
        )}

        {/* Table */}
        <div className="bg-[#0f1423]/80 border border-white/10 rounded-[2rem] overflow-hidden shadow-xl">
           {!selectedSectionId ? (
             <div className="py-24 flex flex-col items-center justify-center text-slate-400 bg-white/5 border border-dashed border-white/10 m-4 rounded-3xl">
                <Layers className="w-16 h-16 mb-4 opacity-50"/>
                <p className="font-black text-lg">الرجاء اختيار الصف والفصل من الأعلى</p>
                <p className="font-bold text-xs mt-2 opacity-80">نظام الجلب الذكي يمنع تحميل جميع طلاب المدرسة دفعة واحدة.</p>
             </div>
           ) : loadingStudents ? (
             <div className="py-24 flex flex-col items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" /><p className="font-bold text-slate-400 text-sm animate-pulse">جاري جلب بيانات الفصل...</p></div>
           ) : filteredStudents.length === 0 ? (
             <div className="py-24 flex flex-col items-center justify-center text-slate-400">
                <Search className="w-12 h-12 mb-4 opacity-50"/>
                <p className="font-black">لا يوجد طلاب يطابقون شروط البحث في هذا الفصل.</p>
             </div>
           ) : (
             <>
               <div className="p-4 border-b border-white/10">
                 <div className="relative max-w-md">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input type="text" placeholder="بحث سريع بالاسم داخل الفصل..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#02040a] border border-white/10 rounded-xl py-3 pr-10 pl-4 text-xs font-bold text-white focus:border-indigo-500 outline-none" />
                 </div>
               </div>
               <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-right">
                     <thead className="bg-black/40 border-b border-white/10 text-slate-300 text-xs uppercase tracking-widest font-black">
                        <tr>
                           <th className="p-5">اسم الطالب</th>
                           <th className="p-5 text-center">النسبة المئوية النهائية</th>
                           <th className="p-5 text-center">الحالة المالية (حجب النتيجة)</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5">
                        {filteredStudents.map((s, idx) => (
                           <tr key={s.id} className="hover:bg-white/5 transition-colors group">
                              <td className="p-5">
                                 <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-sm shadow-inner shrink-0 group-hover:scale-110 transition-transform">
                                       {s.name.charAt(0)}
                                    </div>
                                    <div>
                                       <p className="font-black text-white text-sm drop-shadow-sm">{s.name}</p>
                                       <p className="text-[10px] text-slate-500 mt-1 font-bold tracking-widest">{s.national_id}</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="p-5">
                                 <div className="flex items-center justify-center gap-2 max-w-[150px] mx-auto bg-[#02040a] p-1.5 rounded-xl border border-white/10 shadow-inner focus-within:border-emerald-500/50 transition-colors">
                                    <input 
                                       type="number" 
                                       step="0.01"
                                       value={s.percentage}
                                       onChange={(e) => handlePercentageChange(s.id, e.target.value)}
                                       onBlur={(e) => savePercentage(s.id, e.target.value)}
                                       placeholder="0.00"
                                       className="w-full bg-transparent text-center text-sm font-black text-emerald-400 outline-none"
                                    />
                                    <span className="text-slate-500 font-black text-xs pl-2 border-l border-white/10">%</span>
                                    {savingId === `perc-${s.id}` && <Loader2 className="w-4 h-4 animate-spin text-emerald-500 shrink-0 absolute -mr-8" />}
                                 </div>
                              </td>
                              <td className="p-5 text-center">
                                 <button 
                                    onClick={() => toggleFinance(s.id, s.hasDues)}
                                    disabled={savingId === `fin-${s.id}`}
                                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all border shadow-sm active:scale-95 ${s.hasDues ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20 shadow-rose-500/10' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 shadow-emerald-500/10'}`}
                                 >
                                    {savingId === `fin-${s.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : s.hasDues ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                    {s.hasDues ? 'محجوب (عليه رسوم)' : 'مُصرح (لا يوجد رسوم)'}
                                 </button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
             </>
           )}
        </div>

      </div>
    </div>
  );
}
