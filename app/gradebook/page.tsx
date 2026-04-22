/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Users, Calculator, Download, Loader2, Trophy, Medal, Plus, Save, BarChart3, Edit3, Pencil, Printer, FileText, X, Trash2, ShieldAlert } from 'lucide-react';
import { useSchoolFormData } from '@/hooks/useSchoolFormData';
import { useGradebook } from '@/hooks/useGradebook';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import * as Dialog from '@radix-ui/react-dialog';
import Image from 'next/image'; 
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';

export default function GradebookPage() {
  const { user, authRole, userRole, isChecking } = useAuth() as any;
  const { data: formData, isLoading: formLoading } = useSchoolFormData();
  const { fetchTeacherScope, teacherSections, teacherSubjects, fetchGradebook, loading, saving, gradeData, addCustomColumn, editCustomColumn, deleteCustomColumn, saveCustomGradesBulk } = useGradebook();

  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [activeTab, setActiveTab] = useState<'custom' | 'exams' | 'assignments'>('custom');

  const [newColTitle, setNewColTitle] = useState('');
  const [newColMax, setNewColMax] = useState(10);
  const [isAddColModalOpen, setIsAddColModalOpen] = useState(false);
  const [isEditColModalOpen, setIsEditColModalOpen] = useState(false);
  const [editingColId, setEditingColId] = useState('');

  const [modifiedGrades, setModifiedGrades] = useState<Record<string, any>>({}); 

  // 🚀 جلب صلاحيات الكادر (Staff) لتمكين نظام عين الرفعة (المراقبة)
  const [staffPermissions, setStaffPermissions] = useState<any>({});
  const [permChecking, setPermChecking] = useState(userRole === 'staff');

  useEffect(() => {
    async function checkStaffPerms() {
      if (userRole === 'staff' && user?.id) {
        const { data } = await supabase.from('school_staff').select('permissions').eq('id', user.id).maybeSingle();
        if (data) setStaffPermissions(data.permissions || {});
      }
      setPermChecking(false);
    }
    if (!isChecking) checkStaffPerms();
  }, [userRole, user?.id, isChecking]);

  // 🛡️ تعريف الصلاحيات
  const isSuperAdmin = authRole === 'admin' || authRole === 'management';
  const isGlobalWatcher = userRole === 'staff' && staffPermissions['global_read_only'] === true;
  const canViewAll = isSuperAdmin || isGlobalWatcher; // الإدارة والمشرفين يرون كل شيء
  const canEdit = isSuperAdmin || authRole === 'teacher'; // الإدارة والمعلم فقط يحق لهم التعديل

  // 🚀 جلب نطاق المعلم (فصول ومواد) عند الدخول
  useEffect(() => {
    if (!isChecking && authRole === 'teacher') {
      fetchTeacherScope();
    }
  }, [isChecking, authRole, fetchTeacherScope]);

  // 🚀 الفصول والمواد (ديناميكية: الكل للمدير والمشرف، المخصص للمعلم)
  const sections = canViewAll 
      ? formData?.sections?.map((s: any) => ({ id: s.id, name: s.classes?.name ? `${s.classes.name} - ${s.name}` : s.name })) || []
      : teacherSections;
      
  const subjects = canViewAll 
      ? formData?.subjects || []
      : teacherSubjects;

  useEffect(() => {
    if (selectedSection && selectedSubject && !isChecking) {
      fetchGradebook(selectedSection, selectedSubject);
      const draftKey = `grades_draft_${selectedSection}_${selectedSubject}`;
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try { setModifiedGrades(JSON.parse(savedDraft)); } catch (e) { setModifiedGrades({}); }
      } else { setModifiedGrades({}); }
    } else { setModifiedGrades({}); }
  }, [selectedSection, selectedSubject, fetchGradebook, isChecking]);

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
    if (!canEdit) return; // 🛡️ منع إضافي للحماية
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
    if (!canEdit) return;
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

  if (isChecking || permChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-transparent font-cairo">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
             <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)]"></div>
             <ShieldAlert className="absolute h-8 w-8 text-indigo-400 animate-pulse" />
          </div>
          <p className="text-indigo-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري التحقق من الهوية والصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (authRole !== 'admin' && authRole !== 'management' && authRole !== 'teacher' && !isGlobalWatcher) {
    return (
      <div className="flex h-screen items-center justify-center bg-transparent p-4 font-cairo">
        <div className="glass-panel p-10 rounded-[2.5rem] text-center max-w-md w-full border border-rose-500/30 shadow-[0_0_40px_rgba(225,29,72,0.15)]">
           <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-6 opacity-80" />
           <h2 className="text-2xl font-black text-white mb-2">وصول مقيد</h2>
           <p className="text-slate-400 font-bold">هذه الصفحة مخصصة للإدارة والمعلمين فقط.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-transparent text-slate-100 pb-32 overflow-x-hidden print:bg-white print:text-black print:pb-0 font-cairo" dir="rtl">
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white !important; color: black !important; }
          .print-overflow-visible { overflow: visible !important; width: 100% !important; }
          table { page-break-inside: auto; width: 100% !important; color: black !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #cbd5e1 !important; color: black !important; background: transparent !important; }
          th { background-color: #f8fafc !important; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          .glass-panel { background: white !important; backdrop-filter: none !important; box-shadow: none !important; border: none !important; }
          .print-hidden { display: none !important; }
          input { border: none !important; background: transparent !important; color: black !important; }
        }
      `}} />

      {/* 🚀 الخلفية الزجاجية */}
      <div className="fixed top-1/4 right-[-10%] w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none print:hidden z-0" />
      <div className="fixed bottom-0 left-[-10%] w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none print:hidden z-0" />

      <div className="relative z-10 pt-6">
        
        <div className="hidden print:block text-center py-6 border-b-2 border-slate-900 mb-8">
          <h1 className="text-2xl font-black text-slate-900">سجل الأعمال الشامل</h1>
          <p className="text-slate-600 font-bold mt-2">الفصل: {sections.find((s:any) => s.id === selectedSection)?.name || '-'} | المادة: {subjects.find((s:any) => s.id === selectedSubject)?.name || '-'}</p>
        </div>

        <header className="px-4 sm:px-6 lg:px-8 print:hidden relative z-10 max-w-7xl mx-auto">
          <div className="flex flex-col overflow-hidden bg-gradient-to-r from-[#02040a] via-[#0f1423] to-[#02040a] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-[2rem] sm:rounded-[3rem] relative">
            <div className="absolute inset-0 bg-emerald-500/5 blur-[100px] pointer-events-none"></div>
            
            <div className="relative w-full h-32 sm:h-48 md:h-56 bg-[#02040a] overflow-hidden rounded-t-[2rem] sm:rounded-t-[3rem]">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay z-10"></div>
               <Image 
                 src="/images/gradebook_hero.png" 
                 alt="Gradebook Banner"
                 fill
                 className="object-cover opacity-60 mix-blend-screen"
                 priority
               />
               <div className="absolute inset-0 bg-gradient-to-t from-[#02040a] via-[#02040a]/40 to-transparent z-20"></div>
            </div>

            <div className="p-5 sm:p-8 lg:p-10 -mt-10 sm:-mt-16 lg:-mt-20 relative z-30 flex flex-col lg:flex-row items-center lg:items-end justify-between gap-6 sm:gap-8">
              
              <div className="text-center lg:text-right w-full lg:w-auto flex flex-col items-center lg:items-start">
                <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-[#02040a]/80 text-emerald-400 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black mb-3 border border-emerald-500/30 backdrop-blur-md shadow-inner">
                  <Calculator className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> سجل الدرجات {isGlobalWatcher ? 'للقراءة فقط' : 'الذكي'}
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-lg leading-tight">سجل التقييم الشامل</h1>
              </div>

              <div className="flex flex-col sm:flex-row w-full lg:w-auto items-center gap-3 sm:gap-4 mt-2 lg:mt-0">
                <div className="relative w-full sm:w-56 lg:w-64 bg-[#0f1423]/80 backdrop-blur-xl border border-white/10 rounded-xl sm:rounded-2xl flex items-center px-4 shadow-inner group transition-all hover:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/30">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
                  <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} className="w-full bg-transparent border-none py-3.5 sm:py-4 px-3 text-xs sm:text-sm font-bold text-white outline-none appearance-none cursor-pointer focus:ring-0 [&>option]:bg-[#0f1423] [&>option]:text-white">
                    <option value="">-- اختر الفصل --</option>
                    {sections.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                
                <div className="relative w-full sm:w-56 lg:w-64 bg-[#0f1423]/80 backdrop-blur-xl border border-white/10 rounded-xl sm:rounded-2xl flex items-center px-4 shadow-inner group transition-all hover:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/30">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
                  <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full bg-transparent border-none py-3.5 sm:py-4 px-3 text-xs sm:text-sm font-bold text-white outline-none appearance-none cursor-pointer focus:ring-0 [&>option]:bg-[#0f1423] [&>option]:text-white">
                    <option value="">-- اختر المادة --</option>
                    {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 print:p-0 print:m-0 print:max-w-none">
          {!selectedSection || !selectedSubject ? (
            <div className="glass-panel rounded-[2rem] sm:rounded-[3rem] border border-white/10 p-10 sm:p-20 flex flex-col items-center justify-center text-center shadow-2xl print:hidden mt-4 relative overflow-hidden bg-[#0f1423]/60">
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none"></div>
              <div className="h-20 w-20 sm:h-24 sm:w-24 bg-emerald-500/10 rounded-3xl flex items-center justify-center mb-6 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)] relative z-10"><Calculator className="h-10 w-10 text-emerald-400 drop-shadow-md" /></div>
              <h2 className="text-xl sm:text-3xl font-black text-white mb-3 drop-shadow-md relative z-10">الدفتر بانتظارك</h2>
              <p className="text-slate-400 font-bold text-sm sm:text-lg relative z-10">يرجى تحديد الفصل والمادة من الأعلى لعرض السجل وبدء التقييم.</p>
            </div>
          ) : formLoading || loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-5 print:hidden relative z-10">
              <Loader2 className="w-14 h-14 sm:w-16 sm:h-16 text-emerald-500 animate-spin drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
              <p className="font-black text-slate-400 animate-pulse tracking-widest text-sm sm:text-base">جاري تجميع الدرجات والسجلات...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="glass-panel rounded-[2rem] sm:rounded-[3rem] border border-white/10 p-10 sm:p-20 flex flex-col items-center justify-center text-center shadow-2xl print:hidden mt-4 relative overflow-hidden bg-[#0f1423]/60">
              <div className="absolute top-0 left-0 w-48 h-48 bg-rose-500/10 rounded-full blur-[80px] pointer-events-none"></div>
              <Users className="h-16 w-16 sm:h-20 sm:w-20 text-slate-500 mb-6 drop-shadow-md relative z-10" />
              <h2 className="text-xl sm:text-2xl font-black text-white relative z-10">لا يوجد طلاب مسجلين في هذا الفصل</h2>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 sm:space-y-10 print:space-y-0 relative z-10">
              
              {/* التبويبات الفخمة */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 bg-[#02040a]/60 backdrop-blur-xl p-1.5 sm:p-2 rounded-[1.5rem] sm:rounded-[2rem] shadow-inner border border-white/5 w-fit mx-auto print:hidden">
                 <button onClick={() => setActiveTab('custom')} className={`px-5 sm:px-8 py-2.5 sm:py-3.5 rounded-xl sm:rounded-[1.5rem] font-black text-xs sm:text-sm transition-all flex items-center gap-1.5 sm:gap-2 ${activeTab === 'custom' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-[1.02] border border-emerald-400/50' : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'}`}><Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> التقييم المستمر</button>
                 <button onClick={() => setActiveTab('exams')} className={`px-5 sm:px-8 py-2.5 sm:py-3.5 rounded-xl sm:rounded-[1.5rem] font-black text-xs sm:text-sm transition-all flex items-center gap-1.5 sm:gap-2 ${activeTab === 'exams' ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] scale-[1.02] border border-indigo-400/50' : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'}`}><Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> الاختبارات</button>
                 <button onClick={() => setActiveTab('assignments')} className={`px-5 sm:px-8 py-2.5 sm:py-3.5 rounded-xl sm:rounded-[1.5rem] font-black text-xs sm:text-sm transition-all flex items-center gap-1.5 sm:gap-2 ${activeTab === 'assignments' ? 'bg-gradient-to-r from-cyan-600 to-sky-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] scale-[1.02] border border-cyan-400/50' : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'}`}><FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> الواجبات</button>
              </div>

              {/* 1. التقييم المستمر (النشاطات المخصصة) */}
              {activeTab === 'custom' && (
                <div className="glass-panel rounded-[2rem] sm:rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden print:shadow-none print:border-none print:rounded-none bg-[#0f1423]/60 relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none"></div>
                  
                  <div className="p-6 sm:p-8 border-b border-white/5 flex flex-col md:flex-row items-center justify-between print:hidden gap-4 relative z-10 bg-[#02040a]/40">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="p-2.5 sm:p-3 bg-emerald-500/10 text-emerald-400 rounded-xl sm:rounded-2xl border border-emerald-500/20 shadow-inner shrink-0"><BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-md" /></div>
                      <span className="font-black text-white text-lg sm:text-xl lg:text-2xl drop-shadow-sm">سجل المتابعة والنشاط</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 sm:gap-3 w-full md:w-auto">
                      <button onClick={() => window.print()} className="flex-1 md:flex-none flex items-center justify-center gap-1.5 sm:gap-2 font-black text-slate-300 bg-[#02040a] border border-white/5 hover:bg-white/5 hover:text-white px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl transition-all active:scale-95 text-xs sm:text-sm shadow-inner"><Printer className="w-4 h-4 sm:w-4 sm:h-4" /> PDF</button>
                      
                      {/* 🛡️ إخفاء زر إضافة عمود للمراقب */}
                      {canEdit && (
                        <Dialog.Root open={isAddColModalOpen} onOpenChange={(open) => { setIsAddColModalOpen(open); if(!open){setNewColTitle(''); setNewColMax(10);} }}>
                          <Dialog.Trigger asChild>
                            <button className="flex-1 md:flex-none flex items-center justify-center gap-1.5 sm:gap-2 font-black text-slate-950 bg-emerald-500 hover:bg-emerald-400 border border-emerald-400/50 px-5 sm:px-8 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 text-xs sm:text-sm"><Plus className="w-4 h-4 sm:w-5 sm:h-5" /> إضافة نشاط</button>
                          </Dialog.Trigger>
                          <Dialog.Portal>
                            <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/90 backdrop-blur-md z-50 print:hidden animate-in fade-in duration-300" />
                            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0f1423] border border-emerald-500/30 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 shadow-[0_20px_60px_rgba(16,185,129,0.2)] z-50 w-[95%] sm:w-full max-w-md print:hidden animate-in zoom-in-95 duration-300" dir="rtl">
                              <div className="flex justify-between items-center mb-6 sm:mb-8">
                                 <Dialog.Title className="text-xl sm:text-2xl font-black text-white tracking-tight">نشاط تقييم جديد</Dialog.Title>
                                 <Dialog.Close className="text-slate-400 hover:text-rose-400 bg-[#02040a] p-2 sm:p-2.5 rounded-xl border border-white/5 shadow-inner transition-colors active:scale-90"><X className="w-4 h-4 sm:w-5 sm:h-5" /></Dialog.Close>
                              </div>
                              <div className="space-y-4 sm:space-y-6">
                                <div className="bg-[#02040a]/60 p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                                  <label className="block text-[10px] sm:text-xs font-black text-slate-400 mb-2 uppercase tracking-widest pl-1">اسم النشاط</label>
                                  <input type="text" placeholder="مثال: سلوك ومواظبة..." value={newColTitle} onChange={e => setNewColTitle(e.target.value)} className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-[#0f1423] border border-white/5 text-white rounded-xl sm:rounded-2xl font-bold focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all text-xs sm:text-sm shadow-inner placeholder:text-slate-600" />
                                </div>
                                <div className="bg-[#02040a]/60 p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                                  <label className="block text-[10px] sm:text-xs font-black text-slate-400 mb-2 uppercase tracking-widest pl-1">الدرجة العظمى</label>
                                  <input type="number" value={newColMax} onChange={e => setNewColMax(Number(e.target.value))} className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-[#0f1423] border border-white/5 text-white rounded-xl sm:rounded-2xl font-bold focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all text-xs sm:text-sm shadow-inner" />
                                </div>
                                <div className="pt-2 sm:pt-4">
                                  <button onClick={handleAddColumn} disabled={!newColTitle} className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-slate-950 font-black py-3.5 sm:py-4 rounded-xl sm:rounded-2xl hover:opacity-90 disabled:opacity-50 shadow-[0_0_20px_rgba(16,185,129,0.4)] border border-emerald-400/50 active:scale-95 transition-all text-xs sm:text-sm">اعتماد النشاط</button>
                                </div>
                              </div>
                            </Dialog.Content>
                          </Dialog.Portal>
                        </Dialog.Root>
                      )}

                      <Dialog.Root open={isEditColModalOpen} onOpenChange={(open) => { setIsEditColModalOpen(open); if(!open){setEditingColId(''); setNewColTitle(''); setNewColMax(10); } }}>
                        <Dialog.Portal>
                          <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/90 backdrop-blur-md z-50 print:hidden animate-in fade-in duration-300" />
                          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0f1423] border border-blue-500/30 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 shadow-[0_20px_60px_rgba(59,130,246,0.2)] z-50 w-[95%] sm:w-full max-w-md print:hidden animate-in zoom-in-95 duration-300" dir="rtl">
                            <div className="flex justify-between items-center mb-6 sm:mb-8">
                               <Dialog.Title className="text-xl sm:text-2xl font-black text-white tracking-tight">تعديل النشاط</Dialog.Title>
                               <Dialog.Close className="text-slate-400 hover:text-rose-400 bg-[#02040a] p-2 sm:p-2.5 rounded-xl border border-white/5 shadow-inner transition-colors active:scale-90"><X className="w-4 h-4 sm:w-5 sm:h-5" /></Dialog.Close>
                            </div>
                            <div className="space-y-4 sm:space-y-6">
                              <div className="bg-[#02040a]/60 p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                                <label className="block text-[10px] sm:text-xs font-black text-slate-400 mb-2 uppercase tracking-widest pl-1">تعديل الاسم</label>
                                <input type="text" value={newColTitle} onChange={e => setNewColTitle(e.target.value)} className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-[#0f1423] border border-white/5 text-white rounded-xl sm:rounded-2xl font-bold focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all text-xs sm:text-sm shadow-inner" />
                              </div>
                              <div className="bg-[#02040a]/60 p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                                <label className="block text-[10px] sm:text-xs font-black text-slate-400 mb-2 uppercase tracking-widest pl-1">تعديل الدرجة العظمى</label>
                                <input type="number" value={newColMax} onChange={e => setNewColMax(Number(e.target.value))} className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-[#0f1423] border border-white/5 text-white rounded-xl sm:rounded-2xl font-bold focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all text-xs sm:text-sm shadow-inner" />
                              </div>
                              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4">
                                 <button onClick={handleDeleteColumn} className="flex-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 font-black py-3.5 sm:py-4 rounded-xl sm:rounded-2xl hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95 shadow-inner text-xs sm:text-sm"><Trash2 className="w-4 h-4 sm:w-5 sm:h-5" /> حذف</button>
                                 <button onClick={handleEditColumn} disabled={!newColTitle} className="flex-[2] bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black py-3.5 sm:py-4 rounded-xl sm:rounded-2xl hover:opacity-90 disabled:opacity-50 shadow-[0_0_20px_rgba(59,130,246,0.4)] border border-blue-400/50 active:scale-95 transition-all text-xs sm:text-sm">حفظ التعديلات</button>
                              </div>
                            </div>
                          </Dialog.Content>
                        </Dialog.Portal>
                      </Dialog.Root>
                    </div>
                  </div>

                  {customColumns.length === 0 ? (
                    <div className="p-16 sm:p-24 lg:p-32 text-center flex flex-col items-center bg-transparent print:hidden relative z-10">
                      <div className="p-5 sm:p-6 bg-[#02040a]/80 rounded-3xl mb-4 sm:mb-6 border border-white/5 shadow-inner"><Edit3 className="w-10 h-10 sm:w-12 sm:h-12 text-slate-600 drop-shadow-md" /></div>
                      <p className="text-base sm:text-lg lg:text-xl font-black text-slate-500 drop-shadow-sm">دفتر المتابعة المستمرة فارغ حالياً.</p>
                      {canEdit && <p className="text-xs sm:text-sm font-bold text-slate-600 mt-2">قم بإضافة أنشطة مثل (مشاركة، سلوك، مشروع) للبدء بالرصد.</p>}
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto print-overflow-visible pb-10 custom-scrollbar relative z-10 bg-transparent">
                        <table className="w-full text-right border-collapse print:text-sm">
                          <thead>
                            <tr>
                              <th className="sticky right-0 z-20 bg-[#02040a]/90 backdrop-blur-md text-white font-black py-5 px-4 sm:px-6 border-b border-l border-white/5 w-48 sm:w-64 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.5)] print:bg-slate-100 print:text-black print:border-slate-300 print:shadow-none text-xs sm:text-sm">اسم الطالب</th>
                              {customColumns.map(c => (
                                <th key={c.id} className="bg-[#0f1423]/80 text-slate-300 font-black py-4 px-2 sm:px-4 border-b border-white/5 text-center min-w-[100px] sm:min-w-[130px] print:border-slate-300 group shadow-inner">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="text-[10px] sm:text-xs lg:text-sm truncate drop-shadow-sm" title={c.title}>{c.title}</div>
                                    {/* 🛡️ إخفاء أيقونة التعديل للمراقب */}
                                    {canEdit && (
                                      <button onClick={() => openEditModal(c)} className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1.5 sm:p-2 bg-[#02040a] text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 rounded-lg transition-all print:hidden border border-white/5 shadow-inner active:scale-90"><Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5" /></button>
                                    )}
                                  </div>
                                  <div className="text-[9px] sm:text-[10px] font-bold text-slate-500 mt-1 print:text-slate-600 uppercase tracking-widest">من {c.max_score}</div>
                                </th>
                              ))}
                              <th className="bg-emerald-500/10 text-emerald-400 font-black py-4 px-4 sm:px-6 border-b border-l border-emerald-500/20 text-center min-w-[100px] sm:min-w-[120px] print:border-slate-300 shadow-inner">
                                <div className="text-[10px] sm:text-xs lg:text-sm drop-shadow-sm">إجمالي النقاط</div>
                                <div className="text-[9px] sm:text-[10px] font-bold text-emerald-500/70 mt-1 print:text-slate-600 uppercase tracking-widest">من {maxCustomTotal}</div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 bg-transparent">
                            {students.map((student, idx) => {
                              const total = getCustomTotal(student.id);
                              return (
                                <tr key={student.id} className={`hover:bg-white/[0.03] transition-colors group print:border-b print:border-slate-300 ${idx % 2 === 0 ? 'bg-[#02040a]/40' : 'bg-transparent'}`}>
                                  <td className="sticky right-0 z-10 font-black text-[10px] sm:text-xs lg:text-sm py-3 px-4 sm:px-6 border-b border-l border-white/5 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.4)] bg-inherit group-hover:bg-[#131836] print:bg-transparent print:shadow-none print:border-slate-300 drop-shadow-sm">{student.name}</td>
                                  {customColumns.map(c => (
                                    <td key={c.id} className="border-b border-white/5 py-3 px-1 sm:px-2 text-center print:border-slate-300">
                                      <input 
                                        type="number" 
                                        max={c.max_score} 
                                        min="0" 
                                        readOnly={!canEdit} // 🔒 الجدار الناري المنيع
                                        value={getCustomScoreDisplay(student.id, c.id)} 
                                        onChange={(e) => canEdit && handleScoreChange(student.id, c, e.target.value)} 
                                        className={`w-14 sm:w-16 lg:w-20 mx-auto text-center font-black text-white bg-[#02040a] border border-white/5 rounded-xl py-2 sm:py-2.5 outline-none transition-all print:border-none print:bg-transparent print:text-black print:p-0 print:w-auto shadow-inner text-xs sm:text-sm
                                          ${canEdit ? 'hover:bg-[#090b14] focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20' : 'opacity-70 cursor-not-allowed'}
                                        `} 
                                      />
                                    </td>
                                  ))}
                                  <td className="border-b border-l border-emerald-500/10 py-3 px-4 sm:px-6 text-center font-black bg-emerald-500/5 text-emerald-400 print:bg-transparent print:border-slate-300 print:text-black text-sm sm:text-base drop-shadow-sm">{total}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="p-6 sm:p-8 lg:p-10 bg-[#02040a]/60 border-t border-white/5 print:hidden relative z-10">
                        <h3 className="font-black text-white mb-6 sm:mb-8 flex items-center gap-2 sm:gap-3 text-sm sm:text-lg drop-shadow-sm"><BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 drop-shadow-md"/> تحليل أداء الطلاب العام</h3>
                        <div className="h-56 sm:h-72 lg:h-80 w-full ml-[-15px] sm:ml-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff0a" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} dx={-10} />
                              <Tooltip cursor={{fill: '#ffffff05'}} contentStyle={{borderRadius: '1rem', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(2, 4, 10, 0.9)', color: '#fff', fontSize: 12, boxShadow: '0 20px 40px -10px rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)'}} itemStyle={{ color: '#10b981', fontWeight: 900 }} />
                              <Bar dataKey="متوسط_الدرجات" radius={[12, 12, 0, 0]} maxBarSize={60}>
                                {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.متوسط_الدرجات > entry.fullMark * 0.8 ? '#10b981' : entry.متوسط_الدرجات > entry.fullMark * 0.5 ? '#3b82f6' : '#8b5cf6'} />))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* 2. الاختبارات (منصة الـ Exams) */}
              {activeTab === 'exams' && (
                 <div className="glass-panel backdrop-blur-2xl rounded-[2rem] sm:rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden print:hidden bg-[#0f1423]/60 relative">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
                 <div className="p-6 sm:p-8 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10 bg-[#02040a]/40">
                   <div className="flex items-center gap-3 sm:gap-4"><div className="p-2.5 sm:p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl sm:rounded-2xl shadow-inner shrink-0"><Trophy className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-md" /></div><span className="font-black text-white text-lg sm:text-xl lg:text-2xl drop-shadow-sm">درجات الاختبارات المنشورة</span></div>
                   <button onClick={() => window.print()} className="flex items-center justify-center w-full sm:w-auto gap-1.5 sm:gap-2 font-black text-slate-300 bg-[#02040a] border border-white/5 hover:bg-white/5 hover:text-white px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl transition-all active:scale-95 text-xs sm:text-sm shadow-inner"><Printer className="w-4 h-4 sm:w-4 sm:h-4" /> PDF</button>
                 </div>
                 <div className="overflow-x-auto pb-10 custom-scrollbar relative z-10">
                   <table className="w-full text-right border-collapse min-w-[700px]">
                     <thead>
                       <tr className="bg-[#02040a]/80">
                         <th className="sticky right-0 z-20 bg-[#02040a]/90 backdrop-blur-md text-white font-black py-5 px-4 sm:px-6 border-b border-l border-white/5 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.5)] w-48 sm:w-64 text-[10px] sm:text-xs uppercase tracking-widest">اسم الطالب</th>
                         {assessments.map(a => (
                           <th key={a.id} className="bg-[#0f1423]/80 text-slate-300 font-black py-4 px-2 sm:px-4 border-b border-white/5 text-center min-w-[100px] sm:min-w-[140px] shadow-inner">
                             <div className="text-[10px] sm:text-xs lg:text-sm truncate max-w-[100px] sm:max-w-[120px] mx-auto drop-shadow-sm" title={a.title || a.name || 'اختبار'}>{a.title || a.name || 'اختبار'}</div><div className="text-[9px] sm:text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">من {a.max_score}</div>
                           </th>
                         ))}
                         <th className="bg-indigo-500/10 text-indigo-400 font-black py-4 px-4 sm:px-6 border-b border-l border-indigo-500/20 text-center min-w-[100px] sm:min-w-[120px] shadow-inner">
                           <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs lg:text-sm drop-shadow-sm"><Medal className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> الإجمالي</div><div className="text-[9px] sm:text-[10px] font-bold text-indigo-500/70 mt-1 uppercase tracking-widest">من {maxExamTotal}</div>
                         </th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5 bg-transparent">
                       {students.map((student, idx) => {
                         const studentTotal = getExamTotal(student.id);
                         const percentage = maxExamTotal > 0 ? Math.round((studentTotal / maxExamTotal) * 100) : 0;
                         return (
                           <tr key={student.id} className={`hover:bg-white/[0.03] transition-colors group ${idx % 2 === 0 ? 'bg-[#02040a]/40' : 'bg-transparent'}`}>
                             <td className="sticky right-0 z-10 font-black text-[10px] sm:text-xs lg:text-sm py-4 px-4 sm:px-6 border-b border-l border-white/5 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.4)] bg-inherit group-hover:bg-[#131836] drop-shadow-sm">{student.name}</td>
                             {assessments.map(a => { const score = getExamScore(student.id, a.id); return (<td key={a.id} className="border-b border-white/5 py-4 px-2 sm:px-4 text-center font-black text-white text-xs sm:text-sm shadow-inner">{score === '-' ? <span className="text-slate-600">-</span> : score}</td>); })}
                             <td className="border-b border-l border-indigo-500/10 py-4 px-4 sm:px-6 text-center font-black bg-indigo-500/5 text-xs sm:text-sm lg:text-base"><span className={percentage >= 90 ? 'text-emerald-400 drop-shadow-md' : percentage >= 50 ? 'text-indigo-400 drop-shadow-md' : 'text-rose-400 drop-shadow-md'}>{studentTotal}</span></td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                 </div>
               </div>
              )}

              {/* 3. الواجبات (منصة الـ Assignments) */}
              {activeTab === 'assignments' && (
                 <div className="glass-panel backdrop-blur-2xl rounded-[2rem] sm:rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden print:hidden bg-[#0f1423]/60 relative">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none"></div>
                 <div className="p-6 sm:p-8 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10 bg-[#02040a]/40">
                   <div className="flex items-center gap-3 sm:gap-4"><div className="p-2.5 sm:p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl sm:rounded-2xl shadow-inner shrink-0"><FileText className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-md" /></div><span className="font-black text-white text-lg sm:text-xl lg:text-2xl drop-shadow-sm">تسليمات الواجبات</span></div>
                   <button onClick={() => window.print()} className="flex items-center justify-center w-full sm:w-auto gap-1.5 sm:gap-2 font-black text-slate-300 bg-[#02040a] border border-white/5 hover:bg-white/5 hover:text-white px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl transition-all active:scale-95 text-xs sm:text-sm shadow-inner"><Printer className="w-4 h-4 sm:w-4 sm:h-4" /> PDF</button>
                 </div>
                 <div className="overflow-x-auto pb-10 custom-scrollbar relative z-10">
                   <table className="w-full text-right border-collapse min-w-[700px]">
                     <thead>
                       <tr className="bg-[#02040a]/80">
                         <th className="sticky right-0 z-20 bg-[#02040a]/90 backdrop-blur-md text-white font-black py-5 px-4 sm:px-6 border-b border-l border-white/5 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.5)] w-48 sm:w-64 text-[10px] sm:text-xs uppercase tracking-widest">اسم الطالب</th>
                         {assignments.map(a => (
                           <th key={a.id} className="bg-[#0f1423]/80 text-slate-300 font-black py-4 px-2 sm:px-4 border-b border-white/5 text-center min-w-[100px] sm:min-w-[140px] shadow-inner">
                             <div className="text-[10px] sm:text-xs lg:text-sm truncate max-w-[100px] sm:max-w-[120px] mx-auto drop-shadow-sm" title={a.title || a.name || 'واجب'}>{a.title || a.name || 'واجب'}</div><div className="text-[9px] sm:text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">من {getAssignmentMax(a)}</div>
                           </th>
                         ))}
                         <th className="bg-cyan-500/10 text-cyan-400 font-black py-4 px-4 sm:px-6 border-b border-l border-cyan-500/20 text-center min-w-[100px] sm:min-w-[120px] shadow-inner">
                           <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs lg:text-sm drop-shadow-sm"><Medal className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> الإجمالي</div><div className="text-[9px] sm:text-[10px] font-bold text-cyan-500/70 mt-1 uppercase tracking-widest">من {maxAssignmentTotal}</div>
                         </th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5 bg-transparent">
                       {students.map((student, idx) => {
                         const studentTotal = getAssignmentTotal(student.id);
                         const percentage = maxAssignmentTotal > 0 ? Math.round((studentTotal / maxAssignmentTotal) * 100) : 0;
                         return (
                           <tr key={student.id} className={`hover:bg-white/[0.03] transition-colors group ${idx % 2 === 0 ? 'bg-[#02040a]/40' : 'bg-transparent'}`}>
                             <td className="sticky right-0 z-10 font-black text-[10px] sm:text-xs lg:text-sm py-4 px-4 sm:px-6 border-b border-l border-white/5 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.4)] bg-inherit group-hover:bg-[#131836] drop-shadow-sm">{student.name}</td>
                             {assignments.map(a => { const score = getAssignmentScore(student.id, a.id); return (<td key={a.id} className="border-b border-white/5 py-4 px-2 sm:px-4 text-center font-black text-white text-xs sm:text-sm shadow-inner">{score === '-' ? <span className="text-slate-600">-</span> : score}</td>); })}
                             <td className="border-b border-l border-cyan-500/10 py-4 px-4 sm:px-6 text-center font-black bg-cyan-500/5 text-xs sm:text-sm lg:text-base"><span className={percentage >= 90 ? 'text-emerald-400 drop-shadow-md' : percentage >= 50 ? 'text-cyan-400 drop-shadow-md' : 'text-rose-400 drop-shadow-md'}>{studentTotal}</span></td>
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

      {/* 🚀 شريط الحفظ الطافي (يظهر فقط لمن يملك الصلاحية) */}
      {canEdit && (
        <AnimatePresence>
          {Object.keys(modifiedGrades).length > 0 && (
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 z-50 print:hidden w-[90%] sm:w-auto max-w-md sm:max-w-none">
              <div className="bg-[#0f1423]/95 backdrop-blur-3xl text-white px-5 sm:px-8 py-4 sm:py-5 rounded-[1.5rem] sm:rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col sm:flex-row items-center gap-4 sm:gap-6 border border-emerald-500/30">
                <div className="text-center sm:text-right">
                  <p className="font-black text-sm sm:text-base drop-shadow-sm">تغييرات قيد الانتظار!</p>
                  <p className="text-[10px] sm:text-xs text-emerald-400 font-bold mt-0.5">يرجى حفظ الدرجات لكي لا تفقدها من السجل.</p>
                </div>
                <button onClick={handleSaveBulk} disabled={saving} className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-[0_0_20px_rgba(16,185,129,0.4)] border border-emerald-400/50 text-xs sm:text-sm shrink-0">
                  {saving ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Save className="w-4 h-4 sm:w-5 sm:h-5" />} حفظ التغييرات الآن
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
