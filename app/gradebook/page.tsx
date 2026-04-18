/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Users, Calculator, Download, Loader2, Trophy, Medal, Plus, Save, BarChart3, Edit3, Pencil, Printer, FileText, X, Trash2 } from 'lucide-react';
import { useSchoolFormData } from '@/hooks/useSchoolFormData';
import { useGradebook } from '@/hooks/useGradebook';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import * as Dialog from '@radix-ui/react-dialog';
import Image from 'next/image'; 

export default function GradebookPage() {
  const { data: formData, isLoading: formLoading } = useSchoolFormData();
  const { fetchGradebook, loading, saving, gradeData, addCustomColumn, editCustomColumn, deleteCustomColumn, saveCustomGradesBulk } = useGradebook();

  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [activeTab, setActiveTab] = useState<'custom' | 'exams' | 'assignments'>('custom');

  const [newColTitle, setNewColTitle] = useState('');
  const [newColMax, setNewColMax] = useState(10);
  const [isAddColModalOpen, setIsAddColModalOpen] = useState(false);
  const [isEditColModalOpen, setIsEditColModalOpen] = useState(false);
  const [editingColId, setEditingColId] = useState('');

  const [modifiedGrades, setModifiedGrades] = useState<Record<string, any>>({}); 

  const sections = formData?.sections?.map((s: any) => ({ id: s.id, name: s.classes?.name ? `${s.classes.name} - ${s.name}` : s.name })) || [];
  const subjects = formData?.subjects || [];

  useEffect(() => {
    if (selectedSection && selectedSubject) {
      fetchGradebook(selectedSection, selectedSubject);
      const draftKey = `grades_draft_${selectedSection}_${selectedSubject}`;
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try { setModifiedGrades(JSON.parse(savedDraft)); } catch (e) { setModifiedGrades({}); }
      } else { setModifiedGrades({}); }
    } else { setModifiedGrades({}); }
  }, [selectedSection, selectedSubject, fetchGradebook]);

  useEffect(() => {
    if (selectedSection && selectedSubject) {
       const draftKey = `grades_draft_${selectedSection}_${selectedSubject}`;
       if (Object.keys(modifiedGrades).length > 0) localStorage.setItem(draftKey, JSON.stringify(modifiedGrades));
       else localStorage.removeItem(draftKey); 
    }
  }, [modifiedGrades, selectedSection, selectedSubject]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => { if (Object.keys(modifiedGrades).length > 0) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [modifiedGrades]);

  const { students, assessments, scores, customColumns, customScores, assignments, assignmentScores } = gradeData;

  const getExamScore = (studentId: string, examId: string) => {
    const record = scores.find(s => String(s.student_id) === String(studentId) && String(s.exam_id) === String(examId));
    return record ? Number(record.score) : '-';
  };
  const getExamTotal = (studentId: string) => assessments.reduce((total, a) => { const s = getExamScore(studentId, a.id); return s !== '-' ? total + s : total; }, 0);
  const maxExamTotal = assessments.reduce((sum, a) => sum + (Number(a.max_score) || 0), 0);

  const getAssignmentMax = (a: any) => Number(a.total_marks ?? a.max_score ?? a.points ?? 100);
  
  const getAssignmentScore = (studentId: string, assignmentId: string) => {
    const record = assignmentScores.find(s => String(s.student_id) === String(studentId) && String(s.assignment_id) === String(assignmentId));
    return record ? Number(record.grade ?? record.score ?? record.marks ?? 0) : '-';
  };
  const getAssignmentTotal = (studentId: string) => assignments.reduce((total, a) => { const s = getAssignmentScore(studentId, a.id); return s !== '-' ? total + s : total; }, 0);
  const maxAssignmentTotal = assignments.reduce((sum, a) => sum + getAssignmentMax(a), 0);

  const handleScoreChange = (studentId: string, column: any, val: string) => {
    const scoreVal = val === '' ? 0 : Number(val);
    const key = `${studentId}_${column.id}`;
    const existingRecord = customScores.find(s => String(s.student_id) === String(studentId) && String(s.column_id) === String(column.id));
    setModifiedGrades(prev => ({
      ...prev, [key]: { id: existingRecord?.id, student_id: studentId, column_id: column.id, title: column.title, score: scoreVal > column.max_score ? column.max_score : scoreVal, max_score: column.max_score }
    }));
  };

  const getCustomScoreDisplay = (studentId: string, columnId: string) => {
    const key = `${studentId}_${columnId}`;
    if (modifiedGrades[key] !== undefined) return modifiedGrades[key].score;
    const record = customScores.find(s => String(s.student_id) === String(studentId) && String(s.column_id) === String(columnId));
    return record ? Number(record.score) : '';
  };

  const getCustomTotal = (studentId: string) => customColumns.reduce((total, c) => { const s = getCustomScoreDisplay(studentId, c.id); return s !== '' ? total + Number(s) : total; }, 0);
  const maxCustomTotal = customColumns.reduce((sum, c) => sum + (Number(c.max_score) || 0), 0);

  const handleSaveBulk = async () => {
    const gradesArray = Object.values(modifiedGrades);
    if (gradesArray.length > 0) { 
      try {
        await saveCustomGradesBulk(selectedSection, selectedSubject, gradesArray); 
        setModifiedGrades({}); 
      } catch (err: any) { alert("تعذر حفظ الدرجات! السبب: " + (err.message || "يرجى تحديث قاعدة البيانات")); }
    }
  };

  const handleAddColumn = async () => {
    if (newColTitle && newColMax > 0 && selectedSection && selectedSubject) {
      await addCustomColumn(selectedSection, selectedSubject, newColTitle, newColMax);
      setIsAddColModalOpen(false); setNewColTitle(''); setNewColMax(10);
    }
  };

  const handleEditColumn = async () => {
    if (newColTitle && newColMax > 0 && selectedSection && selectedSubject && editingColId) {
      await editCustomColumn(selectedSection, selectedSubject, editingColId, newColTitle, newColMax);
      setIsEditColModalOpen(false); setEditingColId(''); setNewColTitle(''); setNewColMax(10);
      const updatedModified: Record<string, any> = {};
      Object.keys(modifiedGrades).forEach(key => {
        if (modifiedGrades[key].column_id === editingColId) {
          updatedModified[key] = { ...modifiedGrades[key], title: newColTitle, max_score: newColMax };
          if (updatedModified[key].score > newColMax) updatedModified[key].score = newColMax;
        } else { updatedModified[key] = modifiedGrades[key]; }
      });
      setModifiedGrades(updatedModified);
    }
  };

  const handleDeleteColumn = async () => {
    if (confirm('هل أنت متأكد من حذف هذا التقييم وكل الدرجات المرتبطة به؟')) {
      await deleteCustomColumn(selectedSection, selectedSubject, editingColId);
      setIsEditColModalOpen(false); setEditingColId('');
      const updatedModified: Record<string, any> = {};
      Object.keys(modifiedGrades).forEach(key => { if (modifiedGrades[key].column_id !== editingColId) updatedModified[key] = modifiedGrades[key]; });
      setModifiedGrades(updatedModified);
    }
  };

  const openEditModal = (col: any) => { setEditingColId(col.id); setNewColTitle(col.title); setNewColMax(col.max_score); setIsEditColModalOpen(true); };

  const chartData = customColumns.map(col => {
    let totalScore = 0; let count = 0;
    students.forEach(st => { const s = getCustomScoreDisplay(st.id, col.id); if (s !== '') { totalScore += Number(s); count++; } });
    return { name: col.title, متوسط_الدرجات: count > 0 ? Number((totalScore / count).toFixed(1)) : 0, fullMark: col.max_score };
  });

  return (
    // 🚀 تطبيق لون الخلفية الداكن المطابق للصورة (Deep Navy)
    <div className="min-h-screen relative bg-[#090b14] text-slate-200 pb-32 overflow-x-hidden print:bg-white print:text-black print:pb-0" dir="rtl">
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white !important; color: black !important; }
          .print-overflow-visible { overflow: visible !important; width: 100% !important; }
          table { page-break-inside: auto; width: 100% !important; color: black !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #cbd5e1 !important; color: black !important; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          .glass-panel { background: white !important; backdrop-filter: none !important; box-shadow: none !important; border: none !important; }
          .print-hidden { display: none !important; }
        }
      `}} />

      {/* 🚀 1. الصورة العلوية المدمجة كخلفية (Hero Image Background) */}
      <div className="absolute top-0 left-0 w-full h-[400px] md:h-[600px] z-0 print:hidden pointer-events-none">
         <Image 
            src="/images/gradebook_hero.png" // تأكد أن الصورة بنفس هذا الاسم والمسار
            alt="Hero Background"
            fill
            className="object-cover object-top opacity-70 mix-blend-screen"
            priority
         />
         {/* تدرج لوني يدمج أسفل الصورة مع لون الصفحة الداكن */}
         <div className="absolute inset-0 bg-gradient-to-b from-[#090b14]/10 via-[#090b14]/60 to-[#090b14]"></div>
      </div>

      {/* تأثيرات الإضاءة المطابقة للصورة (أخضر زمردي وبنفسجي) */}
      <div className="fixed top-1/4 right-[-10%] w-[500px] h-[500px] bg-emerald-500/15 rounded-full blur-[140px] pointer-events-none print:hidden z-0" />
      <div className="fixed bottom-0 left-[-10%] w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none print:hidden z-0" />

      {/* المحتوى الرئيسي فوق الخلفيات */}
      <div className="relative z-10">
        
        <div className="hidden print:block text-center py-6 border-b-2 border-slate-900 mb-8">
          <h1 className="text-2xl font-black text-slate-900">سجل الأعمال الشامل</h1>
          <p className="text-slate-600 font-bold mt-2">الفصل: {sections.find((s:any) => s.id === selectedSection)?.name || '-'} | المادة: {subjects.find((s:any) => s.id === selectedSubject)?.name || '-'}</p>
        </div>

        <header className="pt-10 pb-6 px-4 sm:px-8 print:hidden">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6 glass-panel bg-[#131836]/60 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-6 rounded-3xl">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-black mb-3 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <Calculator className="w-4 h-4" /> سجل الدرجات الذكي
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md">سجل التقييم الشامل</h1>
            </div>

            <div className="flex w-full md:w-auto items-center gap-4">
              <div className="flex-1 bg-[#090b14]/80 border border-white/10 rounded-2xl flex items-center px-2 hover:border-emerald-400/50 transition-all shadow-inner">
                <Users className="w-5 h-5 text-emerald-400 mx-3 shrink-0" />
                <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} className="w-full bg-transparent border-none py-4 font-bold text-white outline-none cursor-pointer focus:ring-0 [&>option]:bg-[#131836] [&>option]:text-white">
                  <option value="">-- اختر الفصل --</option>
                  {sections.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex-1 bg-[#090b14]/80 border border-white/10 rounded-2xl flex items-center px-2 hover:border-emerald-400/50 transition-all shadow-inner">
                <BookOpen className="w-5 h-5 text-emerald-400 mx-3 shrink-0" />
                <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full bg-transparent border-none py-4 font-bold text-white outline-none cursor-pointer focus:ring-0 [&>option]:bg-[#131836] [&>option]:text-white">
                  <option value="">-- اختر المادة --</option>
                  {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-8 print:p-0 print:m-0 print:max-w-none">
          {!selectedSection || !selectedSubject ? (
            <div className="glass-panel bg-[#131836]/40 backdrop-blur-xl rounded-[2rem] border border-white/5 p-20 flex flex-col items-center justify-center text-center shadow-2xl print:hidden">
              <div className="h-24 w-24 bg-emerald-500/10 rounded-3xl flex items-center justify-center mb-6 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]"><Calculator className="h-10 w-10 text-emerald-400" /></div>
              <h2 className="text-2xl font-black text-white mb-3">الدفتر بانتظارك</h2>
              <p className="text-slate-400 font-bold text-lg">يرجى تحديد الفصل والمادة من الأعلى لعرض السجل.</p>
            </div>
          ) : formLoading || loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4 print:hidden"><Loader2 className="w-12 h-12 text-emerald-500 animate-spin drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" /><p className="font-bold text-slate-300 animate-pulse">جاري تجميع الدرجات...</p></div>
          ) : students.length === 0 ? (
            <div className="glass-panel bg-[#131836]/40 backdrop-blur-xl rounded-[2rem] border border-white/5 p-20 flex flex-col items-center justify-center text-center shadow-2xl print:hidden"><Users className="h-20 w-20 text-slate-600 mb-6" /><h2 className="text-xl font-black text-slate-300">لا يوجد طلاب</h2></div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 print:space-y-0">
              
              <div className="flex flex-wrap items-center justify-center gap-3 bg-[#131836]/60 backdrop-blur-xl p-2 rounded-[2rem] shadow-lg border border-white/10 w-fit mx-auto print:hidden">
                 <button onClick={() => setActiveTab('custom')} className={`px-8 py-3.5 rounded-[1.5rem] font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'custom' ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-105' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><Edit3 className="w-4 h-4" /> التقييم المستمر</button>
                 <button onClick={() => setActiveTab('exams')} className={`px-8 py-3.5 rounded-[1.5rem] font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'exams' ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-105' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><Trophy className="w-4 h-4" /> الاختبارات</button>
                 <button onClick={() => setActiveTab('assignments')} className={`px-8 py-3.5 rounded-[1.5rem] font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'assignments' ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-105' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><FileText className="w-4 h-4" /> الواجبات</button>
              </div>

              {activeTab === 'custom' && (
                <div className="glass-panel bg-[#131836]/60 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden print:shadow-none print:border-none print:rounded-none">
                  <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between print:hidden gap-4">
                    <div className="flex items-center gap-3"><div className="p-3 bg-gradient-to-br from-emerald-400 to-teal-600 text-white rounded-2xl shadow-inner"><BarChart3 className="w-5 h-5" /></div><span className="font-black text-white text-xl">سجل المتابعة والنشاط</span></div>
                    <div className="flex gap-3">
                      <button onClick={() => window.print()} className="flex items-center gap-2 font-black text-white bg-white/5 border border-white/10 hover:bg-white/10 px-5 py-3 rounded-2xl transition-all active:scale-95"><Printer className="w-4 h-4" /> طباعة / PDF</button>
                      
                      <Dialog.Root open={isAddColModalOpen} onOpenChange={(open) => { setIsAddColModalOpen(open); if(!open){setNewColTitle(''); setNewColMax(10);} }}>
                        <Dialog.Trigger asChild><button className="flex items-center gap-2 font-black text-slate-900 bg-emerald-400 hover:bg-emerald-300 px-6 py-3 rounded-2xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95"><Plus className="w-5 h-5" /> إضافة نشاط</button></Dialog.Trigger>
                        <Dialog.Portal>
                          <Dialog.Overlay className="fixed inset-0 bg-[#090b14]/80 backdrop-blur-md z-50 print:hidden" />
                          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#131836] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl z-50 w-full max-w-sm print:hidden" dir="rtl">
                            <div className="flex justify-between items-center mb-6"><Dialog.Title className="text-2xl font-black text-white">نشاط جديد</Dialog.Title><Dialog.Close className="text-slate-400 hover:text-white bg-white/5 p-2 rounded-full"><X className="w-5 h-5" /></Dialog.Close></div>
                            <div className="space-y-5">
                              <div><label className="block text-sm font-black text-slate-300 mb-2">اسم النشاط</label><input type="text" placeholder="مثال: سلوك، مشاركة..." value={newColTitle} onChange={e => setNewColTitle(e.target.value)} className="w-full px-5 py-4 bg-[#090b14] border border-white/10 text-white rounded-2xl font-bold focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none transition-all" /></div>
                              <div><label className="block text-sm font-black text-slate-300 mb-2">الدرجة العظمى</label><input type="number" value={newColMax} onChange={e => setNewColMax(Number(e.target.value))} className="w-full px-5 py-4 bg-[#090b14] border border-white/10 text-white rounded-2xl font-bold focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none transition-all" /></div>
                              <button onClick={handleAddColumn} disabled={!newColTitle} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black py-4 rounded-2xl mt-2 hover:opacity-90 disabled:opacity-50 shadow-[0_0_20px_rgba(16,185,129,0.4)]">اعتماد النشاط</button>
                            </div>
                          </Dialog.Content>
                        </Dialog.Portal>
                      </Dialog.Root>

                      <Dialog.Root open={isEditColModalOpen} onOpenChange={(open) => { setIsEditColModalOpen(open); if(!open){setEditingColId(''); setNewColTitle(''); setNewColMax(10); } }}>
                        <Dialog.Portal>
                          <Dialog.Overlay className="fixed inset-0 bg-[#090b14]/80 backdrop-blur-md z-50 print:hidden" />
                          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#131836] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl z-50 w-full max-w-sm print:hidden" dir="rtl">
                            <div className="flex justify-between items-center mb-6"><Dialog.Title className="text-2xl font-black text-white">تعديل النشاط</Dialog.Title><Dialog.Close className="text-slate-400 hover:text-white bg-white/5 p-2 rounded-full"><X className="w-5 h-5" /></Dialog.Close></div>
                            <div className="space-y-5">
                              <div><label className="block text-sm font-black text-slate-300 mb-2">تعديل الاسم</label><input type="text" value={newColTitle} onChange={e => setNewColTitle(e.target.value)} className="w-full px-5 py-4 bg-[#090b14] border border-white/10 text-white rounded-2xl font-bold focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none" /></div>
                              <div><label className="block text-sm font-black text-slate-300 mb-2">تعديل الدرجة العظمى</label><input type="number" value={newColMax} onChange={e => setNewColMax(Number(e.target.value))} className="w-full px-5 py-4 bg-[#090b14] border border-white/10 text-white rounded-2xl font-bold focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none" /></div>
                              <div className="flex gap-3 pt-2">
                                 <button onClick={handleDeleteColumn} className="flex-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 font-black py-4 rounded-2xl hover:bg-rose-500/20 flex items-center justify-center gap-2"><Trash2 className="w-5 h-5" /> حذف</button>
                                 <button onClick={handleEditColumn} disabled={!newColTitle} className="flex-[2] bg-emerald-500 text-slate-900 font-black py-4 rounded-2xl hover:bg-emerald-400 disabled:opacity-50 shadow-[0_0_20px_rgba(16,185,129,0.3)]">حفظ التعديلات</button>
                              </div>
                            </div>
                          </Dialog.Content>
                        </Dialog.Portal>
                      </Dialog.Root>
                    </div>
                  </div>

                  {customColumns.length === 0 ? (
                    <div className="p-24 text-center flex flex-col items-center print:hidden"><div className="p-6 bg-white/5 rounded-full mb-4"><Edit3 className="w-12 h-12 text-slate-500" /></div><p className="text-xl font-black text-slate-400">الدفتر فارغ حالياً.<br/>ابدأ بإضافة أعمدة تقييم لطلابك.</p></div>
                  ) : (
                    <>
                      <div className="overflow-x-auto print-overflow-visible pb-10">
                        <table className="w-full text-right border-collapse print:text-sm">
                          <thead>
                            <tr>
                              <th className="sticky right-0 z-20 bg-[#131836] text-white font-black py-5 px-6 border-b border-l border-white/10 w-64 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.5)] print:bg-slate-100 print:text-black print:border-slate-300 print:shadow-none">اسم الطالب</th>
                              {customColumns.map(c => (
                                <th key={c.id} className="bg-white/5 text-slate-200 font-black py-4 px-4 border-b border-white/10 text-center min-w-[130px] print:border-slate-300 group">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="text-sm truncate" title={c.title}>{c.title}</div>
                                    <button onClick={() => openEditModal(c)} className="opacity-0 group-hover:opacity-100 p-1.5 bg-white/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-all print:hidden"><Pencil className="w-3.5 h-3.5" /></button>
                                  </div>
                                  <div className="text-[11px] font-bold text-slate-500 mt-1 print:text-slate-600">من {c.max_score}</div>
                                </th>
                              ))}
                              <th className="bg-emerald-500/10 text-emerald-400 font-black py-4 px-6 border-b border-emerald-500/20 text-center min-w-[120px] print:border-slate-300">
                                <div>إجمالي النقاط</div><div className="text-[11px] font-bold text-emerald-500/70 mt-1 print:text-slate-600">من {maxCustomTotal}</div>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {students.map((student, idx) => {
                              const total = getCustomTotal(student.id);
                              return (
                                <tr key={student.id} className={`hover:bg-white/5 transition-colors group print:border-b print:border-slate-300 ${idx % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent'}`}>
                                  <td className="sticky right-0 z-10 font-black text-sm py-3 px-6 border-b border-l border-white/5 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.2)] bg-inherit group-hover:bg-[#1a2044] print:bg-transparent print:shadow-none print:border-slate-300">{student.name}</td>
                                  {customColumns.map(c => (
                                    <td key={c.id} className="border-b border-white/5 py-3 px-2 text-center print:border-slate-300">
                                      <input type="number" max={c.max_score} min="0" value={getCustomScoreDisplay(student.id, c.id)} onChange={(e) => handleScoreChange(student.id, c, e.target.value)} className="w-16 mx-auto text-center font-bold text-white bg-[#090b14]/50 hover:bg-[#090b14] border border-white/10 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 rounded-xl py-2 outline-none transition-all print:border-none print:bg-transparent print:text-black print:p-0 print:w-auto" />
                                    </td>
                                  ))}
                                  <td className="border-b border-l border-emerald-500/10 py-3 px-6 text-center font-black bg-emerald-500/5 text-emerald-400 print:bg-transparent print:border-slate-300 print:text-black">{total}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="p-8 bg-[#090b14]/30 border-t border-white/5 print:hidden">
                        <h3 className="font-black text-slate-200 mb-6 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-emerald-400"/> تحليل أداء الفصل في الأنشطة</h3>
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff15" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 'bold'}} />
                              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 'bold'}} />
                              <Tooltip cursor={{fill: '#ffffff05'}} contentStyle={{borderRadius: '20px', fontWeight: 'bold', border: '1px solid #ffffff20', backgroundColor: '#131836', color: '#fff', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)'}} />
                              <Bar dataKey="متوسط_الدرجات" radius={[8, 8, 0, 0]}>
                                {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.متوسط_الدرجات > entry.fullMark * 0.8 ? '#10b981' : entry.متوسط_الدرجات > entry.fullMark * 0.5 ? '#06b6d4' : '#8b5cf6'} />))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* 2. الاختبارات */}
              {activeTab === 'exams' && (
                 <div className="glass-panel bg-[#131836]/60 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden print:hidden">
                 <div className="p-6 border-b border-white/5 flex items-center justify-between">
                   <div className="flex items-center gap-3"><div className="p-3 bg-gradient-to-br from-indigo-400 to-purple-500 text-white rounded-2xl shadow-inner"><Trophy className="w-5 h-5" /></div><span className="font-black text-white text-xl">كشف درجات الاختبارات</span></div>
                   <button onClick={() => window.print()} className="flex items-center gap-2 font-black text-white bg-white/5 border border-white/10 hover:bg-white/10 px-5 py-3 rounded-2xl transition-all active:scale-95"><Printer className="w-4 h-4" /> تصدير PDF</button>
                 </div>
                 <div className="overflow-x-auto pb-10">
                   <table className="w-full text-right border-collapse">
                     <thead>
                       <tr>
                         <th className="sticky right-0 z-20 bg-[#131836] text-white font-black py-5 px-6 border-b border-l border-white/10 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.5)] w-64">اسم الطالب</th>
                         {assessments.map(a => (
                           <th key={a.id} className="bg-white/5 text-slate-200 font-black py-4 px-4 border-b border-white/10 text-center min-w-[140px]">
                             <div className="text-sm truncate max-w-[120px] mx-auto" title={a.title || a.name || 'اختبار'}>{a.title || a.name || 'اختبار'}</div><div className="text-[11px] font-bold text-slate-500 mt-1">من {a.max_score}</div>
                           </th>
                         ))}
                         <th className="bg-indigo-500/10 text-indigo-400 font-black py-4 px-6 border-b border-l border-indigo-500/20 text-center min-w-[120px]">
                           <div className="flex items-center justify-center gap-1.5"><Medal className="w-4 h-4" /> إجمالي الدرجات</div><div className="text-[11px] font-bold text-indigo-500/70 mt-1">من {maxExamTotal}</div>
                         </th>
                       </tr>
                     </thead>
                     <tbody>
                       {students.map((student, idx) => {
                         const studentTotal = getExamTotal(student.id);
                         const percentage = maxExamTotal > 0 ? Math.round((studentTotal / maxExamTotal) * 100) : 0;
                         return (
                           <tr key={student.id} className={`hover:bg-white/5 transition-colors group ${idx % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent'}`}>
                             <td className="sticky right-0 z-10 font-black text-sm py-4 px-6 border-b border-l border-white/5 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.2)] bg-inherit group-hover:bg-[#1a2044]">{student.name}</td>
                             {assessments.map(a => { const score = getExamScore(student.id, a.id); return (<td key={a.id} className="border-b border-white/5 py-4 px-4 text-center font-bold text-slate-300">{score === '-' ? <span className="text-slate-600">-</span> : score}</td>); })}
                             <td className="border-b border-l border-indigo-500/10 py-4 px-6 text-center font-black bg-indigo-500/5"><span className={percentage >= 90 ? 'text-emerald-400' : percentage >= 50 ? 'text-indigo-400' : 'text-rose-400'}>{studentTotal}</span></td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                 </div>
               </div>
              )}

              {/* 3. الواجبات */}
              {activeTab === 'assignments' && (
                 <div className="glass-panel bg-[#131836]/60 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden print:hidden">
                 <div className="p-6 border-b border-white/5 flex items-center justify-between">
                   <div className="flex items-center gap-3"><div className="p-3 bg-gradient-to-br from-cyan-400 to-blue-500 text-white rounded-2xl shadow-inner"><FileText className="w-5 h-5" /></div><span className="font-black text-white text-xl">كشف تسليمات الواجبات</span></div>
                   <button onClick={() => window.print()} className="flex items-center gap-2 font-black text-white bg-white/5 border border-white/10 hover:bg-white/10 px-5 py-3 rounded-2xl transition-all active:scale-95"><Printer className="w-4 h-4" /> تصدير PDF</button>
                 </div>
                 <div className="overflow-x-auto pb-10">
                   <table className="w-full text-right border-collapse">
                     <thead>
                       <tr>
                         <th className="sticky right-0 z-20 bg-[#131836] text-white font-black py-5 px-6 border-b border-l border-white/10 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.5)] w-64">اسم الطالب</th>
                         {assignments.map(a => (
                           <th key={a.id} className="bg-white/5 text-slate-200 font-black py-4 px-4 border-b border-white/10 text-center min-w-[140px]">
                             <div className="text-sm truncate max-w-[120px] mx-auto" title={a.title || a.name || 'واجب'}>{a.title || a.name || 'واجب'}</div><div className="text-[11px] font-bold text-slate-500 mt-1">من {getAssignmentMax(a)}</div>
                           </th>
                         ))}
                         <th className="bg-cyan-500/10 text-cyan-400 font-black py-4 px-6 border-b border-l border-cyan-500/20 text-center min-w-[120px]">
                           <div className="flex items-center justify-center gap-1.5"><Medal className="w-4 h-4" /> إجمالي الواجبات</div><div className="text-[11px] font-bold text-cyan-500/70 mt-1">من {maxAssignmentTotal}</div>
                         </th>
                       </tr>
                     </thead>
                     <tbody>
                       {students.map((student, idx) => {
                         const studentTotal = getAssignmentTotal(student.id);
                         const percentage = maxAssignmentTotal > 0 ? Math.round((studentTotal / maxAssignmentTotal) * 100) : 0;
                         return (
                           <tr key={student.id} className={`hover:bg-white/5 transition-colors group ${idx % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent'}`}>
                             <td className="sticky right-0 z-10 font-black text-sm py-4 px-6 border-b border-l border-white/5 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.2)] bg-inherit group-hover:bg-[#1a2044]">{student.name}</td>
                             {assignments.map(a => { const score = getAssignmentScore(student.id, a.id); return (<td key={a.id} className="border-b border-white/5 py-4 px-4 text-center font-bold text-slate-300">{score === '-' ? <span className="text-slate-600">-</span> : score}</td>); })}
                             <td className="border-b border-l border-cyan-500/10 py-4 px-6 text-center font-black bg-cyan-500/5"><span className={percentage >= 90 ? 'text-emerald-400' : percentage >= 50 ? 'text-cyan-400' : 'text-rose-400'}>{studentTotal}</span></td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                 </div>
               </div>
              )}

            </motion.div>
          )}
        </main>
      </div>

      <AnimatePresence>
        {Object.keys(modifiedGrades).length > 0 && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 print:hidden">
            <div className="bg-[#131836]/90 backdrop-blur-2xl text-white px-8 py-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-6 border border-white/20">
              <div>
                <p className="font-black text-lg">تغييرات قيد الانتظار!</p>
                <p className="text-sm text-emerald-400 font-bold">يرجى حفظ الدرجات لكي لا تفقدها.</p>
              </div>
              <button onClick={handleSaveBulk} disabled={saving} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-900 font-black px-8 py-4 rounded-2xl flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} حفظ التغييرات الآن
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
