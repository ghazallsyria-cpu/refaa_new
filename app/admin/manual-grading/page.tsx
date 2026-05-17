// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Printer, Save, FileSpreadsheet, Loader2, AlertCircle, ChevronRight, ShieldCheck, Lock, GraduationCap, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ManualGradingPage() {
  const router = useRouter();

  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [sectionsList, setSectionsList] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('الفصل الدراسي الثاني');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'warning', msg: string } | null>(null);

  const [gradingToggles, setGradingToggles] = useState({ p1_cw: false, p1_ex: false, p2_cw: false, p2_ex: false });
  const [levelGating, setLevelGating] = useState({ g10: true, g11: true, g12: true });
  
  // الأوزان الافتراضية
  const [subjectLimits, setSubjectLimits] = useState({ cw_max: 40, ex_max: 60 });

  const isSheetLocked = rows.length > 0 && rows.some(row => row.is_locked);
  
  const currentClassLevel = sectionsList.find(s => s.id === selectedSectionId)?.classes?.level;
  const isLevelLockedByAdmin = 
    (currentClassLevel === 10 && !levelGating.g10) ||
    (currentClassLevel === 11 && !levelGating.g11) ||
    (currentClassLevel === 12 && !levelGating.g12);

  const isInputDisabled = isSheetLocked || isLevelLockedByAdmin;

  useEffect(() => {
    const initializeEngine = async () => {
      try {
        setOptionsLoading(true);
        
        const { data: settings } = await supabase.from('school_settings').select('*').maybeSingle();
        if (settings) {
          setGradingToggles({
            p1_cw: settings.grading_p1_cw_active || false, p1_ex: settings.grading_p1_ex_active || false,
            p2_cw: settings.grading_p2_cw_active || false, p2_ex: settings.grading_p2_ex_active || false,
          });
          setLevelGating({
            g10: settings.grading_g10_active ?? true,
            g11: settings.grading_g11_active ?? true,
            g12: settings.grading_g12_active ?? true,
          });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
        
        const { data: years } = await supabase.from('academic_years').select('name, is_current').order('start_date', { ascending: false });
        if (years && years.length > 0) {
          setAcademicYears(years);
          setSelectedYear(years.find(y => y.is_current)?.name || years[0].name);
        } else {
          setAcademicYears([{ name: '2025/2026', is_current: true }]);
          setSelectedYear('2025/2026');
        }

        let sectionsQuery = supabase.from('sections').select('id, name, classes!inner(id, name, level)').gte('classes.level', 10);
        if (userData?.role === 'teacher') {
          const { data: assignedSections } = await supabase.from('teacher_sections').select('section_id').eq('teacher_id', user.id);
          const assignedIds = assignedSections?.map(s => s.section_id) || [];
          if (assignedIds.length > 0) sectionsQuery = sectionsQuery.in('id', assignedIds);
          else sectionsQuery = sectionsQuery.in('id', ['00000000-0000-0000-0000-000000000000']);
        }

        const { data: secs } = await sectionsQuery;
        if (secs && secs.length > 0) {
          const sortedSecs = secs.sort((a, b) => {
            if (a.classes.level !== b.classes.level) return a.classes.level - b.classes.level;
            return a.name.localeCompare(b.name);
          });
          setSectionsList(sortedSecs); setSelectedSectionId(sortedSecs[0].id);
        } else setSectionsList([]);
      } catch (error) {
        console.error(error);
      } finally { setOptionsLoading(false); }
    };
    initializeEngine();
  }, []);

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!selectedSectionId) return;
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { data: userData } = await supabase.from('users').select('role').eq('id', user?.id).single();
        
        let subjectSet = new Set<string>();
        if (userData?.role === 'teacher') {
          const { data: tsData } = await supabase.from('teacher_sections').select('subjects(id, name)').eq('section_id', selectedSectionId).eq('teacher_id', user?.id);
          tsData?.forEach(item => { if (item.subjects?.name) subjectSet.add(item.subjects.name); });
        } else {
          const { data: tsData } = await supabase.from('teacher_sections').select('subjects(id, name)').eq('section_id', selectedSectionId);
          tsData?.forEach(item => { if (item.subjects?.name) subjectSet.add(item.subjects.name); });
        }

        if (subjectSet.size > 0) {
          const subjectsArray = Array.from(subjectSet).map(name => ({ name })).sort((a, b) => a.name.localeCompare(b.name));
          setSubjectsList(subjectsArray); setSelectedSubject(subjectsArray[0].name);
        } else { setSubjectsList([]); setSelectedSubject(''); }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    if (!optionsLoading) fetchSubjects();
  }, [selectedSectionId, optionsLoading]);

  useEffect(() => {
    const fetchGradesAndLimits = async () => {
      if (!selectedSectionId || !selectedSubject || !selectedYear || !selectedSemester) { setRows([]); return; }
      setRows([]); setLoading(true); setStatus(null);
      
      try {
        // 🚀 الحل الجذري لقراءة أوزان الدرجات عبر تجاهل المسافات والأخطاء المطبعية
        const cleanSubjectName = selectedSubject.trim();
        const { data: rulesData } = await supabase
          .from('kuwait_grading_rules')
          .select('coursework_max, exam_max')
          .ilike('subject_name', `%${cleanSubjectName}%`) // 👈 تقنية القناص للبحث المطابق جزئياً
          .limit(1)
          .maybeSingle();

        setSubjectLimits({ 
          cw_max: rulesData?.coursework_max || 40, 
          ex_max: rulesData?.exam_max || 60 
        });

        const sectionObj = sectionsList.find(s => s.id === selectedSectionId);
        const className = sectionObj?.classes?.name || '';
        const sectionName = sectionObj?.name || '';
        
        const cLevel = sectionObj?.classes?.level;
        if ((cLevel === 10 && !levelGating.g10) || (cLevel === 11 && !levelGating.g11) || (cLevel === 12 && !levelGating.g12)) {
          setStatus({ type: 'warning', msg: 'عذراً! الرصد مغلق لهذا الصف حالياً من قبل الإدارة المركزية. يمكنك عرض وطباعة الكشف فقط.' });
        }

        const { data: studentsData } = await supabase.from('students').select('id, users!inner(full_name)').eq('section_id', selectedSectionId);
        const { data: gradesData } = await supabase.from('manual_grades').select('*').eq('grade_level', className).eq('section', sectionName).eq('subject_name', selectedSubject).eq('academic_year', selectedYear).eq('semester', selectedSemester);

        const sortedStudents = (studentsData || []).sort((a, b) => a.users.full_name.localeCompare(b.users.full_name));

        const mergedRows = sortedStudents.map(student => {
          const studentName = student.users.full_name;
          const existingRecord = gradesData?.find(g => g.student_name === studentName);
          return existingRecord || { student_name: studentName, p1_coursework: '', p1_exam: '', p2_coursework: '', p2_exam: '', is_locked: false };
        });

        setRows(mergedRows);
        if (mergedRows.some(r => r.is_locked)) setStatus({ type: 'warning', msg: 'هذا الكشف معتمد ومقفل مسبقاً.' });
      } catch (err: any) { setStatus({ type: 'error', msg: 'فشل جلب البيانات.' }); } finally { setLoading(false); }
    };
    if (!optionsLoading && selectedSubject && selectedYear) fetchGradesAndLimits();
  }, [selectedSectionId, selectedSubject, selectedYear, selectedSemester, optionsLoading, levelGating]);

  const handleGradeChange = (index: number, field: string, value: string) => {
    if (isInputDisabled) return; 
    if (value !== '') {
      const numValue = Number(value);
      let maxMark = 100;
      if (field === 'p1_coursework' || field === 'p2_coursework') maxMark = subjectLimits.cw_max;
      if (field === 'p1_exam' || field === 'p2_exam') maxMark = subjectLimits.ex_max;
      if (numValue > maxMark) {
        setStatus({ type: 'error', msg: `❌ تجاوزت النهاية العظمى! الحد الأقصى المسموح لمادة (${selectedSubject}) هو: ${maxMark}` });
        setTimeout(() => setStatus(null), 4000); return; 
      }
    }
    const newRows = [...rows]; newRows[index][field] = value; setRows(newRows);
  };

  const saveAndLockGrades = async () => {
    if (rows.length === 0 || isInputDisabled) return;

    const activeFields = [];
    if (gradingToggles.p1_cw) activeFields.push({ key: 'p1_coursework' });
    if (gradingToggles.p1_ex) activeFields.push({ key: 'p1_exam' });
    if (gradingToggles.p2_cw) activeFields.push({ key: 'p2_coursework' });
    if (gradingToggles.p2_ex) activeFields.push({ key: 'p2_exam' });

    let hasEmpty = false;
    for (const row of rows) {
      for (const field of activeFields) {
        if (row[field.key] === '' || row[field.key] === null || row[field.key] === undefined) { hasEmpty = true; break; }
      }
      if (hasEmpty) break;
    }

    if (hasEmpty) {
      setStatus({ type: 'error', msg: '❌ عذراً! لا يمكنك الاعتماد ويوجد خانات فارغة. يرجى وضع (0) للمحروم أو الغائب.' });
      window.scrollTo({ top: 0, behavior: 'smooth' }); return;
    }

    if (!window.confirm('⚠️ تحذير: هل أنت متأكد من اعتماد الدرجات؟ لن تتمكن من التعديل بعد ذلك.')) return;
    
    setLoading(true); setStatus(null);
    try {
      const sectionObj = sectionsList.find(s => s.id === selectedSectionId);
      const payload = rows.map(row => ({
        student_name: row.student_name, grade_level: sectionObj?.classes?.name || '', section: sectionObj?.name || '',
        subject_name: selectedSubject, academic_year: selectedYear, semester: selectedSemester,
        p1_coursework: Number(row.p1_coursework) || 0, p1_exam: Number(row.p1_exam) || 0, p2_coursework: Number(row.p2_coursework) || 0, p2_exam: Number(row.p2_exam) || 0, is_locked: true 
      }));

      const { error } = await supabase.from('manual_grades').upsert(payload, { onConflict: 'student_name, subject_name, academic_year, semester' });
      if (error) throw error;
      setStatus({ type: 'success', msg: 'تم الاعتماد والقفل بنجاح! 🔒' });
      setRows(rows.map(r => ({ ...r, is_locked: true })));
    } catch (err: any) { setStatus({ type: 'error', msg: 'فشل الاعتماد.' }); } finally { setLoading(false); }
  };

  if (optionsLoading) return (<div className="min-h-screen flex items-center justify-center bg-[#02040a]"><Loader2 className="w-12 h-12 text-amber-500 animate-spin" /></div>);

  return (
    <div className="min-h-screen bg-[#02040a] print:bg-white text-slate-200 print:text-black font-sans" dir="rtl">
      <style dangerouslySetInnerHTML={{__html: ` @media print { @page { size: A4 portrait; margin: 15mm 10mm; } body { background: white !important; color: black !important; } .no-print { display: none !important; } input { border: none !important; background: transparent !important; color: black !important; text-align: center; width: 100%; font-weight: bold; } .official-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; } .official-table th, .official-table td { border: 1px solid black !important; padding: 8px 4px; text-align: center; } .official-table th { background-color: #f3f4f6 !important; font-weight: 900; -webkit-print-color-adjust: exact; } .print-header { display: flex !important; justify-content: space-between; margin-bottom: 20px; font-weight: bold; } } `}} />

      <div className="no-print fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-[#0f1423]/95 backdrop-blur-xl p-4 rounded-full border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
        <button onClick={() => router.back()} className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-full transition-colors"><ChevronRight /></button>
        {!isInputDisabled && rows.length > 0 && (
          <button onClick={saveAndLockGrades} disabled={loading} className="px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-full transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />} اعتماد وقفل للإدارة
          </button>
        )}
        <button onClick={() => window.print()} disabled={rows.length === 0} className="px-6 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-full transition-colors flex items-center gap-2 disabled:opacity-50">
          <Printer className="w-5 h-5" /> طباعة الكشف
        </button>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8 print:p-0 print:max-w-none">
        
        <div className="no-print glass-panel p-6 rounded-[2rem] border border-white/10 mb-8 shadow-xl bg-[#0f1423]/80">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/5 pb-4 mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500/20 p-3 rounded-2xl border border-amber-500/30"><GraduationCap className="w-8 h-8 text-amber-400" /></div>
              <div><h1 className="text-2xl font-black text-white">محرك الرصد اليدوي</h1><p className="text-xs text-slate-400 font-bold mt-1">يمنع ترك خانات فارغة - أقصى درجة محكومة بلائحة الوزارة</p></div>
            </div>
            {isSheetLocked && <div className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm font-black animate-pulse"><ShieldCheck className="w-5 h-5" /> كشف معتمد مسبقاً</div>}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="space-y-2"><label className="text-xs font-black text-slate-400">العام الدراسي</label><select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} disabled={loading} className="w-full bg-[#02040a]/60 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-amber-500 font-bold disabled:opacity-50">{academicYears.map(y => <option key={y.name} value={y.name}>{y.name}</option>)}</select></div>
            <div className="space-y-2"><label className="text-xs font-black text-slate-400">الفصل الدراسي</label><select value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)} disabled={loading} className="w-full bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-3 text-indigo-300 outline-none focus:border-amber-500 font-black disabled:opacity-50"><option value="الفصل الدراسي الأول">الفصل الدراسي الأول</option><option value="الفصل الدراسي الثاني">الفصل الدراسي الثاني</option></select></div>
            <div className="space-y-2"><label className="text-xs font-black text-slate-400">الصف والشعبة</label><select value={selectedSectionId} onChange={e => setSelectedSectionId(e.target.value)} disabled={loading || sectionsList.length===0} className="w-full bg-[#02040a]/60 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-amber-500 font-bold disabled:opacity-50">{sectionsList.length > 0 ? sectionsList.map(sec => <option key={sec.id} value={sec.id}>{sec.classes?.name} - شعـبة {sec.name}</option>) : <option>غير مكلف بأي فصل</option>}</select></div>
            <div className="space-y-2"><label className="text-xs font-black text-slate-400">المادة الدراسية</label><select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} disabled={loading || subjectsList.length === 0} className="w-full bg-[#02040a]/60 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-amber-500 font-bold disabled:opacity-50">{subjectsList.length > 0 ? subjectsList.map(sub => <option key={sub.name} value={sub.name}>{sub.name}</option>) : <option value="">لا يوجد مواد مربوطة بك</option>}</select></div>
          </div>
          {status && <div className={`mt-6 p-4 rounded-xl font-bold text-sm flex items-center gap-2 ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : status.type === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}><AlertCircle className="w-5 h-5 shrink-0" /> {status.msg}</div>}
        </div>

        <div className="hidden print-header print:flex">
          <div className="text-right leading-relaxed"><p>وزارة التربية</p><p>إدارة التعليم الخاص</p><p>العام : {selectedYear}</p></div>
          <div className="text-center leading-relaxed"><p className="font-black text-xl mb-1">مدرسة الرفعة النموذجية (ثانوي - متوسط) للبنين</p><p className="text-lg border border-black px-6 py-1 rounded-md bg-gray-100">كشف الرصد اليدوي للمجال الدراسي</p></div>
          <div className="text-left leading-relaxed"><p>الصف : <span className="font-black">{sectionsList.find(s => s.id === selectedSectionId)?.classes?.name}</span></p><p>الشعبة : <span className="font-black">{sectionsList.find(s => s.id === selectedSectionId)?.name}</span></p><p className="mt-2">المجال : <span className="font-black">{selectedSubject}</span></p></div>
        </div>

        {rows.length > 0 ? (
          <div className="overflow-x-auto bg-[#0f1423]/40 print:bg-transparent rounded-2xl print:rounded-none border border-white/10 print:border-none p-1 print:p-0 relative">
            {isInputDisabled && <div className="absolute inset-0 z-10 bg-black/10 print:hidden cursor-not-allowed rounded-2xl"></div>}
            <table className="w-full text-center official-table relative z-0">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th rowSpan={2} className="w-12 p-3 border-l border-white/10 text-amber-400 print:text-black">م</th>
                  <th rowSpan={2} className="w-64 p-3 border-l border-white/10 text-amber-400 print:text-black">اسم الطالب</th>
                  <th colSpan={3} className="p-3 border-b border-l border-white/10 text-emerald-400 print:text-black">الفترة الأولى</th>
                  <th colSpan={3} className="p-3 border-b border-l border-white/10 text-indigo-400 print:text-black">الفترة الثانية</th>
                  <th rowSpan={2} className="w-24 p-3 font-black bg-white/10 print:bg-gray-200">مجموع العام</th>
                </tr>
                <tr className="bg-white/5 border-b border-white/10 text-sm">
                  <th className="p-3 border-l border-white/10 text-slate-300 print:text-black">أعمال ({subjectLimits.cw_max})</th>
                  <th className="p-3 border-l border-white/10 text-slate-300 print:text-black">إختبار ({subjectLimits.ex_max})</th>
                  <th className="p-3 border-l border-white/10 font-black text-white print:text-black bg-emerald-500/10 print:bg-transparent">مجموع</th>
                  <th className="p-3 border-l border-white/10 text-slate-300 print:text-black">أعمال ({subjectLimits.cw_max})</th>
                  <th className="p-3 border-l border-white/10 text-slate-300 print:text-black">إختبار ({subjectLimits.ex_max})</th>
                  <th className="p-3 border-l border-white/10 font-black text-white print:text-black bg-indigo-500/10 print:bg-transparent">مجموع</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const p1Sum = (Number(row.p1_coursework) || 0) + (Number(row.p1_exam) || 0);
                  const p2Sum = (Number(row.p2_coursework) || 0) + (Number(row.p2_exam) || 0);
                  const finalSum = p1Sum + p2Sum;

                  return (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5 print:hover:bg-transparent transition-colors">
                      <td className="p-3 border-l border-white/10 font-bold">{idx + 1}</td>
                      <td className="p-3 border-l border-white/10 font-bold text-right pr-4">{row.student_name}</td>
                      
                      <td className="p-1 border-l border-white/10 relative">
                        {!gradingToggles.p1_cw && !isInputDisabled && <Lock className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 print:hidden" />}
                        <input type="number" min="0" value={row.p1_coursework} disabled={isInputDisabled || !gradingToggles.p1_cw} onChange={(e) => handleGradeChange(idx, 'p1_coursework', e.target.value)} className={`w-full text-center bg-transparent outline-none p-2 text-white print:text-black rounded-md ${!gradingToggles.p1_cw ? 'opacity-20 cursor-not-allowed print:opacity-100' : 'focus:bg-white/10'}`} />
                      </td>
                      <td className="p-1 border-l border-white/10 relative">
                        {!gradingToggles.p1_ex && !isInputDisabled && <Lock className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 print:hidden" />}
                        <input type="number" min="0" value={row.p1_exam} disabled={isInputDisabled || !gradingToggles.p1_ex} onChange={(e) => handleGradeChange(idx, 'p1_exam', e.target.value)} className={`w-full text-center bg-transparent outline-none p-2 text-white print:text-black rounded-md ${!gradingToggles.p1_ex ? 'opacity-20 cursor-not-allowed print:opacity-100' : 'focus:bg-white/10'}`} />
                      </td>
                      <td className="p-3 border-l border-white/10 font-black text-emerald-400 print:text-black bg-emerald-500/5 print:bg-transparent">{p1Sum > 0 ? p1Sum : ''}</td>

                      <td className="p-1 border-l border-white/10 relative">
                        {!gradingToggles.p2_cw && !isInputDisabled && <Lock className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 print:hidden" />}
                        <input type="number" min="0" value={row.p2_coursework} disabled={isInputDisabled || !gradingToggles.p2_cw} onChange={(e) => handleGradeChange(idx, 'p2_coursework', e.target.value)} className={`w-full text-center bg-transparent outline-none p-2 text-white print:text-black rounded-md ${!gradingToggles.p2_cw ? 'opacity-20 cursor-not-allowed print:opacity-100' : 'focus:bg-white/10'}`} />
                      </td>
                      <td className="p-1 border-l border-white/10 relative">
                        {!gradingToggles.p2_ex && !isInputDisabled && <Lock className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 print:hidden" />}
                        <input type="number" min="0" value={row.p2_exam} disabled={isInputDisabled || !gradingToggles.p2_ex} onChange={(e) => handleGradeChange(idx, 'p2_exam', e.target.value)} className={`w-full text-center bg-transparent outline-none p-2 text-white print:text-black rounded-md ${!gradingToggles.p2_ex ? 'opacity-20 cursor-not-allowed print:opacity-100' : 'focus:bg-white/10'}`} />
                      </td>
                      <td className="p-3 border-l border-white/10 font-black text-indigo-400 print:text-black bg-indigo-500/5 print:bg-transparent">{p2Sum > 0 ? p2Sum : ''}</td>

                      <td className="p-3 font-black text-amber-400 print:text-black bg-white/5 print:bg-gray-100">{finalSum > 0 ? finalSum : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          !loading && !optionsLoading && (
            <div className="no-print flex flex-col items-center justify-center p-16 bg-[#0f1423]/40 border border-white/5 rounded-[2rem] mt-4"><Users className="w-12 h-12 text-amber-500 opacity-80 mb-4" /><h3 className="text-2xl font-black text-white mb-2">لا يوجد طلاب / أو فصول مسندة إليك</h3></div>
          )
        )}
      </div>
    </div>
  );
}
