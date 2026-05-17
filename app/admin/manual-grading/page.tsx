// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Printer, Save, FileSpreadsheet, Loader2, AlertCircle, ChevronRight, ShieldCheck, Lock, GraduationCap, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ManualGradingPage() {
  const router = useRouter();

  // 🚀 حالات القوائم المنسدلة (Dropdowns State)
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [sectionsList, setSectionsList] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  // 🚀 الفلاتر المختارة
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('الفصل الدراسي الثاني');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  // 🚀 حالة البيانات
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'warning', msg: string } | null>(null);

  const isSheetLocked = rows.length > 0 && rows.some(row => row.is_locked);

  // ==========================================
  // 1️⃣ جلب السنوات والفصول (للمرحلة الثانوية فقط وبترتيب متسلسل)
  // ==========================================
  useEffect(() => {
    const fetchInitialDropdowns = async () => {
      try {
        setOptionsLoading(true);
        
        // جلب السنوات الدراسية
        const { data: years } = await supabase.from('academic_years').select('name, is_current').order('start_date', { ascending: false });
        if (years) {
          setAcademicYears(years);
          const currentYear = years.find(y => y.is_current) || years[0];
          if (currentYear) setSelectedYear(currentYear.name);
        }
        
        // 🚀 جلب فصول المرحلة الثانوية فقط (المستوى 10 وما فوق)
        const { data: secs } = await supabase
          .from('sections')
          .select('id, name, classes!inner(id, name, level)')
          .gte('classes.level', 10);

        if (secs && secs.length > 0) {
          // ترتيب الفصول تسلسلياً (10 ثم 11 ثم 12) ثم ترتيب أسماء الشعب
          const sortedSecs = secs.sort((a, b) => {
            if (a.classes.level !== b.classes.level) return a.classes.level - b.classes.level;
            return a.name.localeCompare(b.name);
          });
          
          setSectionsList(sortedSecs);
          setSelectedSectionId(sortedSecs[0].id);
        }
      } catch (error) {
        console.error('Error fetching initial options:', error);
      } finally {
        setOptionsLoading(false);
      }
    };

    fetchInitialDropdowns();
  }, []);

  // ==========================================
  // 2️⃣ جلب المواد المربوطة بالفصل المختار ديناميكياً
  // ==========================================
  useEffect(() => {
    const fetchSubjectsForSection = async () => {
      if (!selectedSectionId) return;
      
      try {
        setLoading(true);
        
        // نبحث عن المواد المربوطة بهذا الفصل
        const { data: tsData } = await supabase.from('teacher_sections').select('subjects(id, name)').eq('section_id', selectedSectionId);
        const { data: schData } = await supabase.from('schedules').select('subjects(id, name)').eq('section_id', selectedSectionId);

        const subjectSet = new Set<string>();
        tsData?.forEach(item => { if (item.subjects?.name) subjectSet.add(item.subjects.name); });
        schData?.forEach(item => { if (item.subjects?.name) subjectSet.add(item.subjects.name); });

        if (subjectSet.size > 0) {
          const subjectsArray = Array.from(subjectSet).map(name => ({ name })).sort((a, b) => a.name.localeCompare(b.name));
          setSubjectsList(subjectsArray);
          setSelectedSubject(subjectsArray[0].name);
        } else {
          // جلب كل المواد كإجراء احتياطي إذا لم توجد جداول
          const { data: allSubs } = await supabase.from('subjects').select('name').order('name', { ascending: true });
          setSubjectsList(allSubs || []);
          if (allSubs && allSubs.length > 0) setSelectedSubject(allSubs[0].name);
        }
      } catch (err) {
        console.error('Error fetching subjects', err);
      } finally {
        setLoading(false);
      }
    };

    if (!optionsLoading) {
      fetchSubjectsForSection();
    }
  }, [selectedSectionId, optionsLoading]);

  // ==========================================
  // 3️⃣ جلب الطلاب والدرجات عند تغيير أي فلتر
  // ==========================================
  useEffect(() => {
    const fetchGradesAndStudents = async () => {
      if (!selectedSectionId || !selectedSubject || !selectedYear || !selectedSemester) return;
      
      setLoading(true);
      setStatus(null);
      
      try {
        const sectionObj = sectionsList.find(s => s.id === selectedSectionId);
        const className = sectionObj?.classes?.name || '';
        const sectionName = sectionObj?.name || '';

        // أ) جلب الطلاب الفعليين
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id, users!inner(full_name)')
          .eq('section_id', selectedSectionId)
          .in('enrollment_status', ['active']); // فقط الطلاب النشطين
          
        if (studentsError) throw studentsError;

        // ب) جلب الكشف المحفوظ
        const { data: gradesData, error: gradesError } = await supabase
          .from('manual_grades')
          .select('*')
          .eq('grade_level', className)
          .eq('section', sectionName)
          .eq('subject_name', selectedSubject)
          .eq('academic_year', selectedYear)
          .eq('semester', selectedSemester);

        if (gradesError) throw gradesError;

        // ج) ترتيب أبجدي ودمج
        const sortedStudents = (studentsData || []).sort((a, b) => a.users.full_name.localeCompare(b.users.full_name));

        const mergedRows = sortedStudents.map(student => {
          const studentName = student.users.full_name;
          const existingRecord = gradesData?.find(g => g.student_name === studentName);
          
          if (existingRecord) {
            return existingRecord;
          } else {
            return {
              student_name: studentName,
              p1_coursework: '', p1_exam: '', p2_coursework: '', p2_exam: '', is_locked: false
            };
          }
        });

        setRows(mergedRows);

        if (mergedRows.some(r => r.is_locked)) {
          setStatus({ type: 'warning', msg: 'هذا الكشف معتمد ومقفل. التعديل متاح للإدارة فقط.' });
        }

      } catch (err: any) {
        setStatus({ type: 'error', msg: 'فشل جلب الكشف والطلاب.' });
      } finally {
        setLoading(false);
      }
    };

    if (!optionsLoading && selectedSubject) {
      fetchGradesAndStudents();
    }
  }, [selectedSectionId, selectedSubject, selectedYear, selectedSemester, optionsLoading]);

  // ==========================================
  // 4️⃣ معالجة الحفظ والاعتماد النهائي
  // ==========================================
  const handleGradeChange = (index: number, field: string, value: string) => {
    if (isSheetLocked) return;
    const newRows = [...rows];
    newRows[index][field] = value;
    setRows(newRows);
  };

  const saveAndLockGrades = async () => {
    if (rows.length === 0) return alert('لا يوجد طلاب للحفظ.');
    if (!window.confirm('⚠️ تحذير: هل أنت متأكد من اعتماد الدرجات؟ لن تتمكن من التعديل بعد هذه الخطوة.')) return;
    
    setLoading(true);
    setStatus(null);
    try {
      const sectionObj = sectionsList.find(s => s.id === selectedSectionId);
      const className = sectionObj?.classes?.name || '';
      const sectionName = sectionObj?.name || '';

      const payload = rows.map(row => ({
        student_name: row.student_name,
        grade_level: className,
        section: sectionName,
        subject_name: selectedSubject,
        academic_year: selectedYear,
        semester: selectedSemester,
        p1_coursework: Number(row.p1_coursework) || 0,
        p1_exam: Number(row.p1_exam) || 0,
        p2_coursework: Number(row.p2_coursework) || 0,
        p2_exam: Number(row.p2_exam) || 0,
        is_locked: true 
      }));

      const { error } = await supabase
        .from('manual_grades')
        .upsert(payload, { onConflict: 'student_name, subject_name, academic_year, semester' });

      if (error) throw error;
      
      setStatus({ type: 'success', msg: 'تم الاعتماد والقفل بنجاح! 🔒 الكشف الآن بعهدة الإدارة.' });
      const lockedRows = rows.map(r => ({ ...r, is_locked: true }));
      setRows(lockedRows);

    } catch (err: any) {
      setStatus({ type: 'error', msg: 'فشل الاعتماد، تأكد من الاتصال.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const printClassName = sectionsList.find(s => s.id === selectedSectionId)?.classes?.name || '';
  const printSectionName = sectionsList.find(s => s.id === selectedSectionId)?.name || '';

  if (optionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#02040a]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
          <p className="text-amber-400 font-black tracking-widest animate-pulse">تهيئة محرك الرصد الثانوي...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#02040a] print:bg-white text-slate-200 print:text-black font-sans" dir="rtl">
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4 portrait; margin: 15mm 10mm; }
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          input { border: none !important; background: transparent !important; color: black !important; text-align: center; width: 100%; font-weight: bold; }
          .official-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
          .official-table th, .official-table td { border: 1px solid black !important; padding: 8px 4px; text-align: center; }
          .official-table th { background-color: #f3f4f6 !important; font-weight: 900; -webkit-print-color-adjust: exact; }
          .print-header { display: flex !important; justify-content: space-between; margin-bottom: 20px; font-weight: bold; }
        }
      `}} />

      <div className="no-print fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-[#0f1423]/95 backdrop-blur-xl p-4 rounded-full border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
        <button onClick={() => router.back()} className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-full transition-colors"><ChevronRight /></button>
        
        {!isSheetLocked && rows.length > 0 && (
          <button onClick={saveAndLockGrades} disabled={loading} className="px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-full transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />} اعتماد وقفل نهائي
          </button>
        )}

        <button onClick={handlePrint} disabled={rows.length === 0} className="px-6 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-full transition-colors flex items-center gap-2 disabled:opacity-50">
          <Printer className="w-5 h-5" /> طباعة الكشف المعتمد
        </button>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8 print:p-0 print:max-w-none">
        
        <div className="no-print glass-panel p-6 rounded-[2rem] border border-white/10 mb-8 shadow-xl bg-[#0f1423]/80">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/5 pb-4 mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500/20 p-3 rounded-2xl border border-amber-500/30">
                <GraduationCap className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">محرك الرصد اليدوي (الثانوي)</h1>
                <p className="text-xs text-slate-400 font-bold mt-1">نظام مرتبط آلياً بالتشكيلات المدرسية</p>
              </div>
            </div>
            {isSheetLocked && (
              <div className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm font-black animate-pulse">
                <ShieldCheck className="w-5 h-5" /> كشف معتمد للإدارة
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400">العام الدراسي</label>
              <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} disabled={loading} className="w-full bg-[#02040a]/60 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-amber-500 font-bold disabled:opacity-50">
                {academicYears.map(y => <option key={y.name} value={y.name}>{y.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400">الفصل الدراسي</label>
              <select value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)} disabled={loading} className="w-full bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-3 text-indigo-300 outline-none focus:border-amber-500 font-black disabled:opacity-50">
                <option value="الفصل الدراسي الأول">الفصل الدراسي الأول</option>
                <option value="الفصل الدراسي الثاني">الفصل الدراسي الثاني</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400">الصف والشعبة (ثانوي)</label>
              <select value={selectedSectionId} onChange={e => setSelectedSectionId(e.target.value)} disabled={loading} className="w-full bg-[#02040a]/60 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-amber-500 font-bold disabled:opacity-50">
                {sectionsList.map(sec => <option key={sec.id} value={sec.id}>{sec.classes?.name} - شعـبة {sec.name}</option>)}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400">المادة الدراسية</label>
              <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} disabled={loading || subjectsList.length === 0} className="w-full bg-[#02040a]/60 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-amber-500 font-bold disabled:opacity-50">
                {subjectsList.length > 0 ? (
                  subjectsList.map(sub => <option key={sub.name} value={sub.name}>{sub.name}</option>)
                ) : (
                  <option value="">لا يوجد مواد مربوطة</option>
                )}
              </select>
            </div>
          </div>
          
          {status && (
            <div className={`mt-6 p-4 rounded-xl font-bold text-sm flex items-center gap-2 ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : status.type === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
              <AlertCircle className="w-5 h-5 shrink-0" /> {status.msg}
            </div>
          )}
        </div>

        {/* 🖨️ الترويسة الرسمية للطباعة */}
        <div className="hidden print-header print:flex">
          <div className="text-right leading-relaxed">
            <p>وزارة التربية</p>
            <p>نظام سجل الطالب</p>
            <p>إدارة التعليم الخاص</p>
            <p className="mt-2">العام الدراسي : {selectedYear}</p>
            <p>الفصل : {selectedSemester}</p>
          </div>
          <div className="text-center leading-relaxed flex flex-col items-center">
            <p className="font-black text-xl mb-1">مدرسة الرفعة النموذجية (ثانوي - متوسط) للبنين</p>
            <p className="text-lg border border-black px-6 py-1 rounded-md bg-gray-100">كشف الرصد اليدوي للمجال الدراسي</p>
          </div>
          <div className="text-left leading-relaxed">
            <p>الصف : <span className="font-black">{printClassName}</span></p>
            <p>الشعبة : <span className="font-black">{printSectionName}</span></p>
            <p className="mt-2">المجال الدراسي : <span className="font-black">{selectedSubject}</span></p>
          </div>
        </div>

        {/* 📊 الجدول أو الشاشة الفارغة */}
        {rows.length > 0 ? (
          <div className="overflow-x-auto bg-[#0f1423]/40 print:bg-transparent rounded-2xl print:rounded-none border border-white/10 print:border-none p-1 print:p-0 relative">
            
            {isSheetLocked && (
              <div className="absolute inset-0 z-10 bg-black/10 print:hidden cursor-not-allowed rounded-2xl" title="الكشف مقفل"></div>
            )}

            <table className="w-full text-center official-table relative z-0">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th rowSpan={2} className="w-12 p-3 border-l border-white/10 text-amber-400 print:text-black">م</th>
                  <th rowSpan={2} className="w-64 p-3 border-l border-white/10 text-amber-400 print:text-black">اسم الطالب</th>
                  <th colSpan={3} className="p-3 border-b border-l border-white/10 text-emerald-400 print:text-black">الفترة الأولى</th>
                  <th colSpan={3} className="p-3 border-b border-l border-white/10 text-indigo-400 print:text-black">الفترة الثانية</th>
                  <th rowSpan={2} className="w-24 p-3 font-black bg-white/10 print:bg-gray-200">مجموع<br/>الفصل الدراسي</th>
                </tr>
                <tr className="bg-white/5 border-b border-white/10 text-sm">
                  <th className="p-3 border-l border-white/10 text-slate-300 print:text-black">أعمال</th>
                  <th className="p-3 border-l border-white/10 text-slate-300 print:text-black">إختبار</th>
                  <th className="p-3 border-l border-white/10 font-black text-white print:text-black bg-emerald-500/10 print:bg-transparent">مجموع</th>
                  
                  <th className="p-3 border-l border-white/10 text-slate-300 print:text-black">أعمال</th>
                  <th className="p-3 border-l border-white/10 text-slate-300 print:text-black">إختبار</th>
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
                      
                      <td className="p-1 border-l border-white/10">
                        <input type="number" min="0" value={row.p1_coursework} disabled={isSheetLocked} onChange={(e) => handleGradeChange(idx, 'p1_coursework', e.target.value)} className="w-full text-center bg-transparent outline-none p-2 text-white print:text-black focus:bg-white/10 rounded-md disabled:text-slate-400" />
                      </td>
                      <td className="p-1 border-l border-white/10">
                        <input type="number" min="0" value={row.p1_exam} disabled={isSheetLocked} onChange={(e) => handleGradeChange(idx, 'p1_exam', e.target.value)} className="w-full text-center bg-transparent outline-none p-2 text-white print:text-black focus:bg-white/10 rounded-md disabled:text-slate-400" />
                      </td>
                      <td className="p-3 border-l border-white/10 font-black text-emerald-400 print:text-black bg-emerald-500/5 print:bg-transparent">
                        {p1Sum > 0 ? p1Sum : ''}
                      </td>

                      <td className="p-1 border-l border-white/10">
                        <input type="number" min="0" value={row.p2_coursework} disabled={isSheetLocked} onChange={(e) => handleGradeChange(idx, 'p2_coursework', e.target.value)} className="w-full text-center bg-transparent outline-none p-2 text-white print:text-black focus:bg-white/10 rounded-md disabled:text-slate-400" />
                      </td>
                      <td className="p-1 border-l border-white/10">
                        <input type="number" min="0" value={row.p2_exam} disabled={isSheetLocked} onChange={(e) => handleGradeChange(idx, 'p2_exam', e.target.value)} className="w-full text-center bg-transparent outline-none p-2 text-white print:text-black focus:bg-white/10 rounded-md disabled:text-slate-400" />
                      </td>
                      <td className="p-3 border-l border-white/10 font-black text-indigo-400 print:text-black bg-indigo-500/5 print:bg-transparent">
                        {p2Sum > 0 ? p2Sum : ''}
                      </td>

                      <td className="p-3 font-black text-amber-400 print:text-black bg-white/5 print:bg-gray-100">
                        {finalSum > 0 ? finalSum : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          !loading && !optionsLoading && (
            <div className="no-print flex flex-col items-center justify-center p-16 bg-[#0f1423]/40 border border-white/5 rounded-[2rem] mt-4 shadow-inner">
              <div className="bg-amber-500/10 p-5 rounded-full mb-4 border border-amber-500/20">
                <Users className="w-12 h-12 text-amber-500 opacity-80" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">لا يوجد طلاب في هذه الشعبة</h3>
              <p className="text-slate-400 font-bold text-sm">يرجى التأكد من تسجيل الطلاب في هذا الفصل من لوحة شؤون الطلبة أولاً ليظهر كشف الرصد.</p>
            </div>
          )
        )}

      </div>
    </div>
  );
}
