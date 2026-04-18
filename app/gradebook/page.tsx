/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Users, Calculator, Download, Loader2, Trophy, Medal, Plus, Save, BarChart3, Edit3, Pencil, Printer, FileText, X, Trash2 } from 'lucide-react';
import { useSchoolFormData } from '@/hooks/useSchoolFormData';
import { useGradebook } from '@/hooks/useGradebook';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import * as Dialog from '@radix-ui/react-dialog';

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

  // 🚀 تصحيح درجات الواجبات لتتعرف على المسمى الصحيح للدرجة
  const getAssignmentMax = (a: any) => Number(a.total_marks || a.max_score || 100);
  
  const getAssignmentScore = (studentId: string, assignmentId: string) => {
    const record = assignmentScores.find(s => String(s.student_id) === String(studentId) && String(s.assignment_id) === String(assignmentId));
    return record ? Number(record.grade || record.score || 0) : '-';
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
    // 🚀 المظهر الزجاجي الفخم: خلفية متدرجة، عناصر طافية (Blobs)، وستايل خاص بالطباعة الأفقية والملونة
    <div className="min-h-screen relative bg-slate-50/50 pb-32 overflow-hidden print:bg-white print:pb-0" dir="rtl">
      
      {/* CSS السحري للطباعة الأفقية وبالألوان */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white !important; }
          .print-overflow-visible { overflow: visible !important; width: 100% !important; }
          table { page-break-inside: auto; width: 100% !important; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          .glass-panel { background: white !important; backdrop-filter: none !important; box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
        }
      `}} />

      {/* فقاعات الخلفية (Blobs) للمظهر الساحر */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-[100px] pointer-events-none print:hidden -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-400/10 rounded-full blur-[100px] pointer-events-none print:hidden translate-y-1/3 -translate-x-1/3" />

      {/* ترويسة الطباعة */}
      <div className="hidden print:block text-center py-6 border-b-2 border-slate-900 mb-8">
         <h1 className="text-2xl font-black text-slate-900">سجل الأعمال الشامل</h1>
         <p className="text-slate-600 font-bold mt-2">الفصل: {sections.find((s:any) => s.id === selectedSection)?.name || '-'} | المادة: {subjects.find((s:any) => s.id === selectedSubject)?.name || '-'}</p>
      </div>

      {/* هيدر زجاجي (Glassmorphism) */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-2xl border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)] px-8 py-6 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50/80 text-indigo-600 rounded-xl text-sm font-black mb-3 border border-indigo-100/50">
              <Calculator className="w-4 h-4" /> دفتر أعمال المعلم
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">سجل الدرجات الاحترافي</h1>
          </div>
          <div className="flex w-full md:w-auto items-center gap-3">
            <div className="flex-1 bg-white/60 backdrop-blur-md border border-slate-200/60 rounded-2xl flex items-center px-2 hover:bg-white hover:border-indigo-300 transition-all shadow-sm">
              <Users className="w-5 h-5 text-indigo-400 mx-3 shrink-0" />
              <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} className="w-full bg-transparent border-none py-4 font-bold text-slate-700 outline-none cursor-pointer focus:ring-0">
                <option value="">-- اختر الفصل --</option>
                {sections.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex-1 bg-white/60 backdrop-blur-md border border-slate-200/60 rounded-2xl flex items-center px-2 hover:bg-white hover:border-indigo-300 transition-all shadow-sm">
              <BookOpen className="w-5 h-5 text-indigo-400 mx-3 shrink-0" />
              <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full bg-transparent border-none py-4 font-bold text-slate-700 outline-none cursor-pointer focus:ring-0">
                <option value="">-- اختر المادة --</option>
                {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-10 space-y-8 relative z-10 print:p-0 print:m-0 print:max-w-none">
        {!selectedSection || !selectedSubject ? (
          <div className="glass-panel bg-white/40 backdrop-blur-xl rounded-[32px] border border-white/60 p-20 flex flex-col items-center justify-center text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] print:hidden">
            <div className="h-24 w-24 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner"><Calculator className="h-10 w-10 text-indigo-500" /></div>
            <h2 className="text-2xl font-black text-slate-800 mb-3">الدفتر بانتظارك</h2>
            <p className="text-slate-500 font-bold text-lg">يرجى تحديد الفصل والمادة من الأعلى لعرض السجل.</p>
          </div>
        ) : formLoading || loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 print:hidden"><Loader2 className="w-12 h-12 text-indigo-600 animate-spin" /><p className="font-bold text-slate-500 animate-pulse">جاري تجميع الدرجات...</p></div>
        ) : students.length === 0 ? (
          <div className="glass-panel bg-white/40 backdrop-blur-xl rounded-[32px] border border-white/60 p-20 flex flex-col items-center justify-center text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] print:hidden"><Users className="h-20 w-20 text-slate-300 mb-6" /><h2 className="text-xl font-black text-slate-700">لا يوجد طلاب</h2></div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 print:space-y-0">
            
            {/* أزرار التبويبات العائمة الزجاجية */}
            <div className="flex flex-wrap items-center justify-center gap-2 bg-white/50 backdrop-blur-xl p-2 rounded-[2rem] shadow-sm border border-white/60 w-fit mx-auto print:hidden">
               <button onClick={() => setActiveTab('custom')} className={`px-8 py-3.5 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'custom' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-300/50 scale-105' : 'text-slate-500 hover:bg-white/60 hover:text-indigo-600'}`}><Edit3 className="w-4 h-4" /> التقييم المستمر</button>
               <button onClick={() => setActiveTab('exams')} className={`px-8 py-3.5 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'exams' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-300/50 scale-105' : 'text-slate-500 hover:bg-white/60 hover:text-indigo-600'}`}><Trophy className="w-4 h-4" /> الاختبارات</button>
               <button onClick={() => setActiveTab('assignments')} className={`px-8 py-3.5 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'assignments' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-300/50 scale-105' : 'text-slate-500 hover:bg-white/60 hover:text-indigo-600'}`}><FileText className="w-4 h-4" /> الواجبات</button>
            </div>

            {/* 1. التقييم اليدوي */}
            {activeTab === 'custom' && (
              <div className="glass-panel bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/80 overflow-hidden print:shadow-none print:border-none print:rounded-none">
                <div className="p-6 border-b border-slate-100/50 flex flex-col sm:flex-row items-center justify-between print:hidden gap-4">
                  <div className="flex items-center gap-3"><div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-inner"><BarChart3 className="w-5 h-5" /></div><span className="font-black text-slate-800 text-xl">سجل المتابعة والنشاط</span></div>
                  <div className="flex gap-3">
                    <button onClick={() => window.print()} className="flex items-center gap-2 font-black text-slate-700 bg-white/80 border border-slate-200/50 hover:bg-white hover:text-indigo-600 hover:shadow-md px-5 py-3 rounded-2xl transition-all active:scale-95"><Printer className="w-4 h-4" /> طباعة / PDF</button>
                    
                    <Dialog.Root open={isAddColModalOpen} onOpenChange={(open) => { setIsAddColModalOpen(open); if(!open){setNewColTitle(''); setNewColMax(10);} }}>
                      <Dialog.Trigger asChild><button className="flex items-center gap-2 font-black text-white bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-2xl transition-all shadow-[0_4px_20px_rgba(79,70,229,0.4)] hover:shadow-[0_6px_25px_rgba(79,70,229,0.5)] active:scale-95"><Plus className="w-5 h-5" /> إضافة نشاط</button></Dialog.Trigger>
                      <Dialog.Portal>
                        <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 print:hidden" />
                        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-2xl border border-white/50 rounded-[2.5rem] p-8 shadow-2xl z-50 w-full max-w-sm print:hidden" dir="rtl">
                          <div className="flex justify-between items-center mb-6"><Dialog.Title className="text-2xl font-black text-slate-800">نشاط جديد</Dialog.Title><Dialog.Close className="text-slate-400 hover:text-slate-700 bg-slate-100 p-2 rounded-full"><X className="w-5 h-5" /></Dialog.Close></div>
                          <div className="space-y-5">
                            <div><label className="block text-sm font-black text-slate-600 mb-2">اسم النشاط</label><input type="text" placeholder="مثال: سلوك، مشاركة..." value={newColTitle} onChange={e => setNewColTitle(e.target.value)} className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-600 outline-none transition-all focus:bg-white" /></div>
                            <div><label className="block text-sm font-black text-slate-600 mb-2">الدرجة العظمى</label><input type="number" value={newColMax} onChange={e => setNewColMax(Number(e.target.value))} className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-600 outline-none transition-all focus:bg-white" /></div>
                            <button onClick={handleAddColumn} disabled={!newColTitle} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black py-4 rounded-2xl mt-2 hover:opacity-90 disabled:opacity-50 shadow-xl shadow-indigo-200">اعتماد النشاط</button>
                          </div>
                        </Dialog.Content>
                      </Dialog.Portal>
                    </Dialog.Root>

                    <Dialog.Root open={isEditColModalOpen} onOpenChange={setIsEditColModalOpen}>
                      <Dialog.Portal>
                        <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 print:hidden" />
                        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-2xl border border-white/50 rounded-[2.5rem] p-8 shadow-2xl z-50 w-full max-w-sm print:hidden" dir="rtl">
                          <div className="flex justify-between items-center mb-6"><Dialog.Title className="text-2xl font-black text-slate-800">تعديل النشاط</Dialog.Title><Dialog.Close className="text-slate-400 hover:text-slate-700 bg-slate-100 p-2 rounded-full"><X className="w-5 h-5" /></Dialog.Close></div>
                          <div className="space-y-5">
                            <div><label className="block text-sm font-black text-slate-600 mb-2">تعديل الاسم</label><input type="text" value={newColTitle} onChange={e => setNewColTitle(e.target.value)} className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-600 outline-none focus:bg-white" /></div>
                            <div><label className="block text-sm font-black text-slate-600 mb-2">تعديل الدرجة العظمى</label><input type="number" value={newColMax} onChange={e => setNewColMax(Number(e.target.value))} className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-600 outline-none focus:bg-white" /></div>
                            <div className="flex gap-3 pt-2">
                               <button onClick={handleDeleteColumn} className="flex-1 bg-rose-50 text-rose-600 font-black py-4 rounded-2xl hover:bg-rose-100 flex items-center justify-center gap-2"><Trash2 className="w-5 h-5" /> حذف</button>
                               <button onClick={handleEditColumn} disabled={!newColTitle} className="flex-[2] bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 disabled:opacity-50 shadow-xl">حفظ التعديلات</button>
                            </div>
                          </div>
                        </Dialog.Content>
                      </Dialog.Portal>
                    </Dialog.Root>
                  </div>
                </div>

                {customColumns.length === 0 ? (
                  <div className="p-24 text-center flex flex-col items-center print:hidden"><div className="p-6 bg-slate-50 rounded-full mb-4"><Edit3 className="w-12 h-12 text-slate-300" /></div><p className="text-xl font-black text-slate-400">الدفتر فارغ حالياً.<br/>ابدأ بإضافة أعمدة تقييم لطلابك.</p></div>
                ) : (
                  <>
                    <div className="overflow-x-auto print-overflow-visible pb-10">
                      <table className="w-full text-right border-collapse print:text-sm">
                        <thead>
                          <tr>
                            <th className="sticky right-0 z-20 bg-slate-900 text-white font-black py-5 px-6 border-b border-l border-slate-800 w-64 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.1)] print:bg-slate-100 print:text-black print:border-slate-300 print:shadow-none">اسم الطالب</th>
                            {customColumns.map(c => (
                              <th key={c.id} className="bg-slate-50/50 backdrop-blur-sm text-slate-700 font-black py-4 px-4 border-b border-slate-200/50 text-center min-w-[130px] print:border-slate-300 group">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="text-sm truncate" title={c.title}>{c.title}</div>
                                  <button onClick={() => openEditModal(c)} className="opacity-0 group-hover:opacity-100 p-1.5 bg-indigo-100/50 text-indigo-600 hover:bg-indigo-200 rounded-lg transition-all print:hidden"><Pencil className="w-3.5 h-3.5" /></button>
                                </div>
                                <div className="text-[11px] font-bold text-slate-400 mt-1 print:text-slate-600">من {c.max_score}</div>
                              </th>
                            ))}
                            <th className="bg-emerald-50/80 text-emerald-900 font-black py-4 px-6 border-b border-emerald-100/50 text-center min-w-[120px] print:border-slate-300">
                              <div>إجمالي النقاط</div><div className="text-[11px] font-bold text-emerald-600 mt-1 print:text-slate-600">من {maxCustomTotal}</div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((student, idx) => {
                            const total = getCustomTotal(student.id);
                            return (
                              <tr key={student.id} className={`hover:bg-indigo-50/30 transition-colors group print:border-b print:border-slate-300 ${idx % 2 === 0 ? 'bg-white/40' : 'bg-transparent'}`}>
                                <td className="sticky right-0 z-10 font-black text-sm py-3 px-6 border-b border-l border-slate-100/50 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.03)] bg-inherit group-hover:bg-indigo-50/90 print:bg-transparent print:shadow-none print:border-slate-300">{student.name}</td>
                                {customColumns.map(c => (
                                  <td key={c.id} className="border-b border-slate-100/50 py-3 px-2 text-center print:border-slate-300">
                                    <input type="number" max={c.max_score} min="0" value={getCustomScoreDisplay(student.id, c.id)} onChange={(e) => handleScoreChange(student.id, c, e.target.value)} className="w-16 mx-auto text-center font-bold text-slate-700 bg-white/50 hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 rounded-xl py-2 outline-none transition-all print:border-none print:bg-transparent print:p-0 print:w-auto" />
                                  </td>
                                ))}
                                <td className="border-b border-l border-emerald-50/50 py-3 px-6 text-center font-black bg-emerald-50/20 text-emerald-700 print:bg-transparent print:border-slate-300">{total}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="p-8 bg-slate-50/50 border-t border-slate-100/50 print:hidden">
                      <h3 className="font-black text-slate-700 mb-6 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-500"/> تحليل أداء الفصل في الأنشطة</h3>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 'bold'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 'bold'}} />
                            <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '20px', fontWeight: 'bold', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)'}} />
                            <Bar dataKey="متوسط_الدرجات" radius={[8, 8, 0, 0]}>
                              {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.متوسط_الدرجات > entry.fullMark * 0.8 ? '#10b981' : entry.متوسط_الدرجات > entry.fullMark * 0.5 ? '#6366f1' : '#f43f5e'} />))}
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
               <div className="glass-panel bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/80 overflow-hidden print:hidden">
               <div className="p-6 border-b border-slate-100/50 flex items-center justify-between">
                 <div className="flex items-center gap-3"><div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-2xl shadow-inner"><Trophy className="w-5 h-5" /></div><span className="font-black text-slate-800 text-xl">كشف درجات الاختبارات</span></div>
                 <button onClick={() => window.print()} className="flex items-center gap-2 font-black text-slate-700 bg-white/80 border border-slate-200/50 hover:bg-white hover:text-indigo-600 hover:shadow-md px-5 py-3 rounded-2xl transition-all active:scale-95"><Printer className="w-4 h-4" /> تصدير PDF</button>
               </div>
               <div className="overflow-x-auto pb-10">
                 <table className="w-full text-right border-collapse">
                   <thead>
                     <tr>
                       <th className="sticky right-0 z-20 bg-slate-900 text-white font-black py-5 px-6 border-b border-l border-slate-800 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.1)] w-64">اسم الطالب</th>
                       {assessments.map(a => (
                         <th key={a.id} className="bg-slate-50/50 backdrop-blur-sm text-slate-700 font-black py-4 px-4 border-b border-slate-200/50 text-center min-w-[140px]">
                           <div className="text-sm truncate max-w-[120px] mx-auto" title={a.title}>{a.title}</div><div className="text-[11px] font-bold text-slate-400 mt-1">من {a.max_score}</div>
                         </th>
                       ))}
                       <th className="bg-indigo-50/80 text-indigo-900 font-black py-4 px-6 border-b border-l border-indigo-100/50 text-center min-w-[120px]">
                         <div className="flex items-center justify-center gap-1.5"><Medal className="w-4 h-4 text-indigo-600" /> إجمالي الدرجات</div><div className="text-[11px] font-bold text-indigo-500 mt-1">من {maxExamTotal}</div>
                       </th>
                     </tr>
                   </thead>
                   <tbody>
                     {students.map((student, idx) => {
                       const studentTotal = getExamTotal(student.id);
                       const percentage = maxExamTotal > 0 ? Math.round((studentTotal / maxExamTotal) * 100) : 0;
                       return (
                         <tr key={student.id} className={`hover:bg-indigo-50/30 transition-colors group ${idx % 2 === 0 ? 'bg-white/40' : 'bg-transparent'}`}>
                           <td className="sticky right-0 z-10 font-black text-sm py-4 px-6 border-b border-l border-slate-100/50 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.03)] bg-inherit group-hover:bg-indigo-50/90">{student.name}</td>
                           {assessments.map(a => { const score = getExamScore(student.id, a.id); return (<td key={a.id} className="border-b border-slate-100/50 py-4 px-4 text-center font-bold text-slate-600">{score === '-' ? <span className="text-slate-300">-</span> : score}</td>); })}
                           <td className="border-b border-l border-indigo-50/50 py-4 px-6 text-center font-black bg-indigo-50/20"><span className={percentage >= 90 ? 'text-emerald-600' : percentage >= 50 ? 'text-indigo-600' : 'text-rose-500'}>{studentTotal}</span></td>
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
               <div className="glass-panel bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/80 overflow-hidden print:hidden">
               <div className="p-6 border-b border-slate-100/50 flex items-center justify-between">
                 <div className="flex items-center gap-3"><div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 text-white rounded-2xl shadow-inner"><FileText className="w-5 h-5" /></div><span className="font-black text-slate-800 text-xl">كشف تسليمات الواجبات</span></div>
                 <button onClick={() => window.print()} className="flex items-center gap-2 font-black text-slate-700 bg-white/80 border border-slate-200/50 hover:bg-white hover:text-indigo-600 hover:shadow-md px-5 py-3 rounded-2xl transition-all active:scale-95"><Printer className="w-4 h-4" /> تصدير PDF</button>
               </div>
               <div className="overflow-x-auto pb-10">
                 <table className="w-full text-right border-collapse">
                   <thead>
                     <tr>
                       <th className="sticky right-0 z-20 bg-slate-900 text-white font-black py-5 px-6 border-b border-l border-slate-800 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.1)] w-64">اسم الطالب</th>
                       {assignments.map(a => (
                         <th key={a.id} className="bg-slate-50/50 backdrop-blur-sm text-slate-700 font-black py-4 px-4 border-b border-slate-200/50 text-center min-w-[140px]">
                           <div className="text-sm truncate max-w-[120px] mx-auto" title={a.title}>{a.title}</div><div className="text-[11px] font-bold text-slate-400 mt-1">من {getAssignmentMax(a)}</div>
                         </th>
                       ))}
                       <th className="bg-indigo-50/80 text-indigo-900 font-black py-4 px-6 border-b border-l border-indigo-100/50 text-center min-w-[120px]">
                         <div className="flex items-center justify-center gap-1.5"><Medal className="w-4 h-4 text-indigo-600" /> إجمالي الواجبات</div><div className="text-[11px] font-bold text-indigo-500 mt-1">من {maxAssignmentTotal}</div>
                       </th>
                     </tr>
                   </thead>
                   <tbody>
                     {students.map((student, idx) => {
                       const studentTotal = getAssignmentTotal(student.id);
                       const percentage = maxAssignmentTotal > 0 ? Math.round((studentTotal / maxAssignmentTotal) * 100) : 0;
                       return (
                         <tr key={student.id} className={`hover:bg-indigo-50/30 transition-colors group ${idx % 2 === 0 ? 'bg-white/40' : 'bg-transparent'}`}>
                           <td className="sticky right-0 z-10 font-black text-sm py-4 px-6 border-b border-l border-slate-100/50 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.03)] bg-inherit group-hover:bg-indigo-50/90">{student.name}</td>
                           {assignments.map(a => { const score = getAssignmentScore(student.id, a.id); return (<td key={a.id} className="border-b border-slate-100/50 py-4 px-4 text-center font-bold text-slate-600">{score === '-' ? <span className="text-slate-300">-</span> : score}</td>); })}
                           <td className="border-b border-l border-indigo-50/50 py-4 px-6 text-center font-black bg-indigo-50/20"><span className={percentage >= 90 ? 'text-emerald-600' : percentage >= 50 ? 'text-indigo-600' : 'text-rose-500'}>{studentTotal}</span></td>
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

      <AnimatePresence>
        {Object.keys(modifiedGrades).length > 0 && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 print:hidden">
            <div className="bg-slate-900/90 backdrop-blur-xl text-white px-8 py-5 rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] flex items-center gap-6 border border-white/20">
              <div>
                <p className="font-black text-lg">تغييرات قيد الانتظار!</p>
                <p className="text-sm text-slate-300 font-bold">يرجى حفظ الدرجات لكي لا تفقدها.</p>
              </div>
              <button onClick={handleSaveBulk} disabled={saving} className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black px-8 py-4 rounded-2xl flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-emerald-500/30">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} حفظ التغييرات الآن
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
