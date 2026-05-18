// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, Activity, CheckCircle2, Clock, Loader2, Power, AlertCircle, RefreshCw, X, Filter, Unlock, Star, Plus, ListChecks, Printer, ArrowRightLeft, Download, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function GradingControlPage() {
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'warning', msg: string } | null>(null);

  const [settings, setSettings] = useState({
    id: 1, 
    p1_cw_active: false, p1_ex_active: false, p2_cw_active: true, p2_ex_active: false,
    g10_active: true, g11_active: true, g12_active: true 
  });

  const [vipSubjects, setVipSubjects] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [newVipSubject, setNewVipSubject] = useState('');
  const [vipLoading, setVipLoading] = useState(false);

  const [allTeacherProgress, setAllTeacherProgress] = useState<any[]>([]);
  const [filteredProgress, setFilteredProgress] = useState<any[]>([]);
  const [radarLevelFilter, setRadarLevelFilter] = useState('all'); 
  const [stats, setStats] = useState({ total: 0, submitted: 0, pending: 0 });

  const [printMode, setPrintMode] = useState<'radar' | 'sheet'>('radar');
  const [printData, setPrintData] = useState<any>(null);

  const fetchRadarData = async () => {
    setLoading(true);
    try {
      const { data: schoolSettings } = await supabase.from('school_settings').select('*').single();
      if (schoolSettings) {
        setSettings({
          id: schoolSettings.id,
          p1_cw_active: schoolSettings.grading_p1_cw_active || false, p1_ex_active: schoolSettings.grading_p1_ex_active || false,
          p2_cw_active: schoolSettings.grading_p2_cw_active || false, p2_ex_active: schoolSettings.grading_p2_ex_active || false,
          g10_active: schoolSettings.grading_g10_active ?? true, g11_active: schoolSettings.grading_g11_active ?? true, g12_active: schoolSettings.grading_g12_active ?? true,
        });
        setVipSubjects(schoolSettings.early_grading_subjects || []);
      }

      const { data: rulesData } = await supabase.from('kuwait_grading_rules').select('subject_name');
      if (rulesData) {
        const uniqueSubjects = Array.from(new Set(rulesData.map(r => r.subject_name?.trim()))).filter(Boolean).sort();
        setAvailableSubjects(uniqueSubjects);
      }

      const { data: teacherSections } = await supabase.from('teacher_sections').select('*, subjects(name)');
      const { data: users } = await supabase.from('users').select('id, full_name').eq('role', 'teacher');
      const { data: sections } = await supabase.from('sections').select('id, name, classes(name, level)');
      const { data: lockedGrades } = await supabase.from('manual_grades').select('grade_level, section, subject_name, is_locked, is_transferred_to_ministry');

      if (teacherSections && users && sections) {
        const progressArray: any[] = [];

        teacherSections.forEach(ts => {
          const teacher = users.find(u => u.id === ts.teacher_id);
          const sectionObj = sections.find(s => s.id === ts.section_id);
          const cLevel = Number(sectionObj?.classes?.level || 0);

          if (teacher && sectionObj && cLevel >= 10) { 
            let teacherSubjectsToTrack = [];
            if (ts.subjects?.name) {
              teacherSubjectsToTrack.push(ts.subjects.name);
              // حقن مادة القرآن لمعلمي الإسلامية
              if (ts.subjects.name.includes('إسلامية') || ts.subjects.name.includes('اسلامية')) {
                teacherSubjectsToTrack.push('القرآن الكريم');
              }
            }

            // 🚀 الحل الجذري: مطابقة حرفية 100% بدون أي تعديل لاسم المادة
            teacherSubjectsToTrack.forEach(rawSub => {
              const subjectRec = lockedGrades?.find(lg => 
                lg.grade_level === sectionObj.classes.name && 
                lg.section === sectionObj.name && 
                lg.subject_name === rawSub // <--- هنا يكمن السحر، مطابقة دقيقة
              );
              
              const isSubmitted = subjectRec?.is_locked || false;
              const isTransferred = subjectRec?.is_transferred_to_ministry || false;
              
              progressArray.push({
                id: `${ts.teacher_id}-${ts.section_id}-${rawSub}`,
                teacherName: teacher.full_name, className: sectionObj.classes.name, sectionName: sectionObj.name, 
                isSubmitted, isTransferred, subjectName: rawSub
              });
            });
          }
        });

        const uniqueProgress = progressArray.filter((value, index, self) => index === self.findIndex((t) => (t.teacherName === value.teacherName && t.className === value.className && t.sectionName === value.sectionName && t.subjectName === value.subjectName)));
        uniqueProgress.sort((a, b) => a.teacherName.localeCompare(b.teacherName));
        setAllTeacherProgress(uniqueProgress);
      }
    } catch (error) { setStatus({ type: 'error', msg: 'فشل تشغيل الرادار.' }); } finally { setLoading(false); }
  };

  useEffect(() => { fetchRadarData(); }, []);

  useEffect(() => {
    let filtered = allTeacherProgress;
    if (radarLevelFilter === '10') filtered = filtered.filter(item => item.className.includes('العاشر') || item.className.includes('10'));
    else if (radarLevelFilter === '11') filtered = filtered.filter(item => item.className.includes('الحادي عشر') || item.className.includes('11'));
    else if (radarLevelFilter === '12') filtered = filtered.filter(item => item.className.includes('الثاني عشر') || item.className.includes('12'));

    const submittedCount = filtered.filter(item => item.isSubmitted).length;
    setFilteredProgress(filtered);
    setStats({ total: filtered.length, submitted: submittedCount, pending: filtered.length - submittedCount });
  }, [allTeacherProgress, radarLevelFilter]);

  const handleToggle = async (field: string, currentValue: boolean) => {
    setToggleLoading(true); setStatus(null);
    try {
      const newValue = !currentValue;
      const dbFieldMap: Record<string, string> = { 'p1_cw_active': 'grading_p1_cw_active', 'p1_ex_active': 'grading_p1_ex_active', 'p2_cw_active': 'grading_p2_cw_active', 'p2_ex_active': 'grading_p2_ex_active', 'g10_active': 'grading_g10_active', 'g11_active': 'grading_g11_active', 'g12_active': 'grading_g12_active' };
      await supabase.from('school_settings').update({ [dbFieldMap[field]]: newValue }).eq('id', settings.id);
      setSettings(prev => ({ ...prev, [field]: newValue }));
      setStatus({ type: 'success', msg: 'تم تحديث الإعدادات!' });
    } catch (error) { setStatus({ type: 'error', msg: 'فشل التحديث.' }); } finally { setToggleLoading(false); setTimeout(() => setStatus(null), 3000); }
  };

  const addVipSubject = async () => {
    if (!newVipSubject.trim()) return;
    if (vipSubjects.includes(newVipSubject.trim())) { setStatus({ type: 'warning', msg: 'موجودة بالفعل!' }); setTimeout(() => setStatus(null), 3000); return; }
    setVipLoading(true);
    try {
      const updatedList = [...vipSubjects, newVipSubject.trim()];
      await supabase.from('school_settings').update({ early_grading_subjects: updatedList }).eq('id', settings.id);
      setVipSubjects(updatedList); setNewVipSubject('');
      setStatus({ type: 'success', msg: `تمت الإضافة بنجاح!` });
    } catch (err) { setStatus({ type: 'error', msg: 'فشل الإضافة.' }); } finally { setVipLoading(false); setTimeout(() => setStatus(null), 3000); }
  };

  const removeVipSubject = async (subjectToRemove: string) => {
    setVipLoading(true);
    try {
      const updatedList = vipSubjects.filter(sub => sub !== subjectToRemove);
      await supabase.from('school_settings').update({ early_grading_subjects: updatedList }).eq('id', settings.id);
      setVipSubjects(updatedList);
      setStatus({ type: 'success', msg: `تمت الإزالة.` });
    } catch (err) { setStatus({ type: 'error', msg: 'فشل الإزالة.' }); } finally { setVipLoading(false); setTimeout(() => setStatus(null), 3000); }
  };

  const handleUnlockSheet = async (className: string, sectionName: string, subjectName: string, id: string) => {
    if (!window.confirm(`⚠️ تأكيد: هل تريد فك الاعتماد لكشف (الصف ${className} - شعبة ${sectionName} - مادة ${subjectName})؟`)) return;
    setActionLoadingId(`unlock-${id}`); setStatus(null);
    try {
      await supabase.from('manual_grades').update({ is_locked: false, is_transferred_to_ministry: false }).eq('grade_level', className).eq('section', sectionName).eq('subject_name', subjectName);
      setStatus({ type: 'success', msg: 'تم فك الاعتماد بنجاح!' });
      fetchRadarData(); 
    } catch (err: any) { setStatus({ type: 'error', msg: 'حدث خطأ.' }); } finally { setActionLoadingId(null); setTimeout(() => setStatus(null), 4000); }
  };

  const handleTransferToMinistry = async (className: string, sectionName: string, subjectName: string, currentStatus: boolean, id: string) => {
    setActionLoadingId(`transfer-${id}`); setStatus(null);
    try {
      await supabase.from('manual_grades').update({ is_transferred_to_ministry: !currentStatus }).eq('grade_level', className).eq('section', sectionName).eq('subject_name', subjectName);
      setAllTeacherProgress(prev => prev.map(p => p.id === id ? { ...p, isTransferred: !currentStatus } : p));
      setStatus({ type: 'success', msg: !currentStatus ? 'تم النقل للوزارة!' : 'تم التراجع.' });
    } catch (err: any) { setStatus({ type: 'error', msg: 'حدث خطأ.' }); } finally { setActionLoadingId(null); setTimeout(() => setStatus(null), 3000); }
  };

  const exportGradesToCSV = async (className?: string, sectionName?: string, subjectName?: string) => {
    setActionLoadingId(className ? `export-${className}-${sectionName}-${subjectName}` : 'export-all');
    try {
      let query = supabase.from('manual_grades').select('*').eq('is_locked', true);
      if (className && sectionName && subjectName) {
        query = query.eq('grade_level', className).eq('section', sectionName).eq('subject_name', subjectName);
      } else {
        const allowedClasses = Array.from(new Set(filteredProgress.map(p => p.className)));
        if (allowedClasses.length > 0) query = query.in('grade_level', allowedClasses);
        else { setStatus({ type: 'warning', msg: 'لا توجد بيانات مطابقة للفلتر.' }); return; }
      }

      const { data: gradesData, error } = await query;
      if (error) throw error;
      if (!gradesData || gradesData.length === 0) { setStatus({ type: 'warning', msg: 'لا توجد درجات معتمدة لتصديرها.' }); return; }

      const headers = ['م', 'اسم الطالب', 'الصف', 'الشعبة', 'المادة', 'أعمال ف1', 'اختبار ف1', 'أعمال ف2', 'اختبار ف2', 'مجموع العام'];
      const csvRows = [headers.join(',')];
      gradesData.sort((a,b) => a.grade_level.localeCompare(b.grade_level) || a.section.localeCompare(b.section) || a.student_name.localeCompare(b.student_name));

      gradesData.forEach((row, index) => {
        const total = (Number(row.p1_coursework)||0) + (Number(row.p1_exam)||0) + (Number(row.p2_coursework)||0) + (Number(row.p2_exam)||0);
        csvRows.push([ index + 1, `"${row.student_name}"`, `"${row.grade_level}"`, `"${row.section}"`, `"${row.subject_name}"`, row.p1_coursework ?? '-', row.p1_exam ?? '-', row.p2_coursework ?? '-', row.p2_exam ?? '-', total ].join(','));
      });

      const csvContent = "\uFEFF" + csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.setAttribute("href", url);
      const filename = className ? `درجات_${className}_شعبة${sectionName}_${subjectName}` : `كشف_الدرجات_المعتمدة_إجمالي`;
      link.setAttribute("download", `${filename}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
      setStatus({ type: 'success', msg: 'تم تصدير الإكسيل بنجاح! ✅' });
    } catch (err) { setStatus({ type: 'error', msg: 'فشل التصدير.' }); } finally { setActionLoadingId(null); setTimeout(() => setStatus(null), 3000); }
  };

  const handlePrintSheetPDF = async (item: any) => {
    setActionLoadingId(`pdf-${item.id}`);
    try {
      const { data: gradesData, error } = await supabase.from('manual_grades')
        .select('*')
        .eq('grade_level', item.className)
        .eq('section', item.sectionName)
        .eq('subject_name', item.subjectName)
        .eq('is_locked', true);
      
      if (error) throw error;
      if (!gradesData || gradesData.length === 0) {
        setStatus({ type: 'warning', msg: '⚠️ عذراً، لا توجد درجات معتمدة في هذا الكشف لطباعتها.' });
        return;
      }

      gradesData.sort((a,b) => a.student_name.localeCompare(b.student_name));
      
      setPrintData({ ...item, grades: gradesData });
      setPrintMode('sheet');
      
      setTimeout(() => {
        window.print();
        setPrintMode('radar');
      }, 500);

    } catch (err) {
      setStatus({ type: 'error', msg: 'فشل بناء الوثيقة للطباعة.' });
    } finally {
      setActionLoadingId(null); setTimeout(() => setStatus(null), 3000);
    }
  };

  const handlePrintRadar = () => {
    setPrintMode('radar');
    setTimeout(() => window.print(), 100);
  };

  if (loading) return (<div className="min-h-screen flex flex-col items-center justify-center bg-[#02040a]"><Activity className="w-16 h-16 text-amber-500 animate-pulse mb-4" /></div>);

  return (
    <div className={`min-h-screen bg-transparent p-4 sm:p-6 lg:p-8 font-sans ${printMode === 'sheet' ? 'mode-sheet' : 'mode-radar'}`} dir="rtl">
      
      <style dangerouslySetInnerHTML={{__html: ` 
        @media print { 
          @page { size: A4 portrait; margin: 15mm; } 
          body { background: white !important; color: black !important; } 
          .no-print, nav, footer, header:not(.print-header), .fixed, .sticky, [class*="fixed bottom"] { display: none !important; }
          
          .mode-sheet .print-only-radar { display: none !important; }
          .mode-radar .print-only-sheet { display: none !important; }

          .print-area { display: block !important; width: 100% !important; max-height: none !important; overflow: visible !important; border: none !important; box-shadow: none !important; background: transparent !important;}
          .print-area table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
          .print-area th, .print-area td { border: 1px solid black !important; padding: 8px; text-align: center; color: black !important; }
          .print-area th { background-color: #f3f4f6 !important; font-weight: bold; -webkit-print-color-adjust: exact; }
          .print-area .action-col { display: none !important; } 
          .print-area .badge { border: none !important; background: transparent !important; color: black !important; padding: 0 !important; }
        } 
      `}} />

      {printData && (
        <div className="hidden print-only-sheet print-area w-full" dir="rtl">
          <div className="text-center mb-8 border-b-2 border-black pb-4">
            <h1 className="text-2xl font-black mb-2">وزارة التربية - مدرسة الرفعة النموذجية (م - ث) للبنين</h1>
            <h2 className="text-xl font-bold mb-4 bg-gray-200 inline-block px-8 py-2 rounded-lg border border-black">
              كشف درجات معتمد - مادة ({printData.subjectName})
            </h2>
            <div className="flex justify-between items-center text-sm font-black mt-2">
               <span>المعلم: أ. {printData.teacherName}</span>
               <span>الصف: {printData.className}</span>
               <span>الشعبة: {printData.sectionName}</span>
            </div>
          </div>
          
          <table className="w-full text-center">
            <thead>
              <tr>
                <th rowSpan={2} className="w-12">م</th>
                <th rowSpan={2}>اسم الطالب</th>
                <th colSpan={2}>الفترة الأولى</th>
                <th colSpan={2}>الفترة الثانية</th>
                <th rowSpan={2} className="bg-gray-300 !important">مجموع العام</th>
              </tr>
              <tr>
                <th>أعمال</th><th>اختبار</th><th>أعمال</th><th>اختبار</th>
              </tr>
            </thead>
            <tbody>
              {printData.grades.map((g: any, i: number) => {
                 const total = (Number(g.p1_coursework)||0) + (Number(g.p1_exam)||0) + (Number(g.p2_coursework)||0) + (Number(g.p2_exam)||0);
                 return (
                   <tr key={i}>
                     <td className="font-bold">{i+1}</td>
                     <td className="text-right pr-4 font-bold">{g.student_name}</td>
                     <td>{g.p1_coursework !== null ? g.p1_coursework : '-'}</td>
                     <td>{g.p1_exam !== null ? g.p1_exam : '-'}</td>
                     <td>{g.p2_coursework !== null ? g.p2_coursework : '-'}</td>
                     <td>{g.p2_exam !== null ? g.p2_exam : '-'}</td>
                     <td className="font-black bg-gray-100 !important">{total}</td>
                   </tr>
                 )
              })}
            </tbody>
          </table>

          <div className="mt-20 flex justify-between px-16 font-black text-lg">
             <div className="text-center">
                <p className="mb-8">توقيع المعلم</p>
                <p>.......................................</p>
             </div>
             <div className="text-center">
                <p className="mb-8">توقيع واعتماد الإدارة</p>
                <p>.......................................</p>
             </div>
          </div>
        </div>
      )}

      <div className={`max-w-7xl mx-auto space-y-8 pb-32 print-only-radar ${printMode === 'sheet' ? 'hidden' : ''}`}>
        
        <div className="no-print glass-panel p-8 rounded-[2.5rem] border border-amber-500/20 shadow-[0_0_40px_rgba(245,158,11,0.05)] bg-[#0f1423]/80 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-40 h-40 bg-amber-500/10 blur-[60px] rounded-full pointer-events-none"></div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20"><ShieldAlert className="w-8 h-8 text-amber-500" /></div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white">غرفة عمليات الرصد المركزية</h1>
                <p className="text-sm font-bold text-slate-400 mt-1">إدارة الاعتمادات، استخراج الوثائق، ونقل البيانات.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Link href="/admin/grading-unlock" className="flex-1 md:flex-none px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold rounded-xl border border-rose-500/30 flex items-center justify-center gap-2 transition-colors">
                <Unlock className="w-4 h-4" /> الخزنة المركزية
              </Link>
              <button onClick={fetchRadarData} className="flex-1 md:flex-none px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 flex items-center justify-center gap-2 transition-colors">
                <RefreshCw className="w-4 h-4" /> تحديث
              </button>
            </div>
          </div>
          <AnimatePresence>
            {status && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-6 overflow-hidden"><div className={`p-4 rounded-xl font-bold text-sm flex items-center gap-2 ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : status.type === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>{status.msg}</div></motion.div>)}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="no-print lg:col-span-1 space-y-6">
            <div className="glass-panel p-6 rounded-[2rem] border border-purple-500/30 bg-[#0f1423]/80">
              <h2 className="text-xl font-black text-purple-400 mb-2 flex items-center gap-2"><Star className="w-5 h-5" /> القائمة البيضاء (VIP)</h2>
              <div className="space-y-4">
                <div className="flex gap-2 relative">
                  <div className="relative flex-1">
                    <ListChecks className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400 opacity-60 pointer-events-none" />
                    <select value={newVipSubject} onChange={(e) => setNewVipSubject(e.target.value)} className="w-full bg-black/50 border border-purple-500/20 rounded-xl py-3 pl-3 pr-10 text-white text-sm outline-none focus:border-purple-500 font-bold appearance-none">
                      <option value="" disabled>اختر المادة...</option>
                      {availableSubjects.map((sub, idx) => (<option key={idx} value={sub}>{sub}</option>))}
                    </select>
                  </div>
                  <button onClick={addVipSubject} disabled={vipLoading || !newVipSubject} className="p-3 bg-purple-500 hover:bg-purple-400 text-white rounded-xl transition-colors disabled:opacity-50">
                    {vipLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {vipSubjects.length > 0 ? vipSubjects.map((sub, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 text-purple-300 px-3 py-1.5 rounded-lg text-xs font-black">
                      {sub} <button onClick={() => removeVipSubject(sub)} className="text-purple-400 hover:text-rose-400 transition-colors"><X className="w-3 h-3" /></button>
                    </div>
                  )) : (<p className="text-xs text-slate-500 font-bold w-full text-center py-2">لا يوجد استثناء.</p>)}
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-[2rem] border border-white/10 bg-[#0f1423]/80">
              <h2 className="text-xl font-black text-amber-400 mb-6 flex items-center gap-2"><Power className="w-5 h-5" /> قواطع المواد الأساسية</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5"><div><p className="font-bold text-slate-200">أعمال ف1</p></div><button onClick={() => handleToggle('p1_cw_active', settings.p1_cw_active)} className={`relative w-12 h-6 rounded-full transition-colors ${settings.p1_cw_active ? 'bg-emerald-500' : 'bg-slate-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.p1_cw_active ?
