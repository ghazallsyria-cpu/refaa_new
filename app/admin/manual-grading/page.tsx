// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Printer, Save, FileSpreadsheet, Loader2, AlertCircle, ChevronRight, Lock, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ManualGradingPage() {
  const router = useRouter();

  // 🚀 فلاتر الكشف
  const [academicYear, setAcademicYear] = useState('2025/2026');
  const [gradeLevel, setGradeLevel] = useState('الصف الثاني عشر - علمي');
  const [section, setSection] = useState('1');
  const [subject, setSubject] = useState('تربية إسلامية');

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'warning', msg: string } | null>(null);

  // 🚀 التحقق مما إذا كان الكشف مقفلاً
  const isSheetLocked = rows.length > 0 && rows.some(row => row.is_locked);

  const demoStudents = [
    "ابراهيم خميس سعيد الشمري", "باسل سعود فضل مقطوف", "خالد احمد عطيه بطى",
    "خالد فهد شبيب المطيري", "خليفه ثامر خليفه العازمي", "صالح فيصل صالح الهده",
    "طارق زياد العبدالله", "طارق نمر حسين الشيحان", "عبد الرحمن محمد عبد العزيز الفنار",
    "عبد العزيز مشعل قاسم صابط", "عبدالله صطام مرزوق العتيبي", "عمر احمد عيد الحربي"
  ];

  const fetchGrades = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const { data, error } = await supabase
        .from('manual_grades')
        .select('*')
        .eq('grade_level', gradeLevel)
        .eq('section', section)
        .eq('subject_name', subject)
        .eq('academic_year', academicYear);

      if (error) throw error;

      if (data && data.length > 0) {
        setRows(data);
        if (data.some(r => r.is_locked)) {
          setStatus({ type: 'warning', msg: 'هذا الكشف معتمد ومقفل. التعديل متاح للإدارة فقط.' });
        }
      } else {
        const initialRows = demoStudents.map(name => ({
          student_name: name,
          p1_coursework: '', p1_exam: '', p2_coursework: '', p2_exam: '', is_locked: false
        }));
        setRows(initialRows);
      }
    } catch (err: any) {
      setStatus({ type: 'error', msg: 'فشل جلب البيانات.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrades();
  }, [gradeLevel, section, subject, academicYear]);

  const handleGradeChange = (index: number, field: string, value: string) => {
    if (isSheetLocked) return; // حماية إضافية لمنع التعديل برمجياً
    const newRows = [...rows];
    newRows[index][field] = value;
    setRows(newRows);
  };

  // 🚀 حفظ واعتماد نهائي مع القفل
  const saveAndLockGrades = async () => {
    if (!window.confirm('⚠️ تحذير: هل أنت متأكد من اعتماد الدرجات؟ لن تتمكن من التعديل بعد هذه الخطوة، وسيتم رفع الكشف للإدارة.')) return;
    
    setLoading(true);
    setStatus(null);
    try {
      const payload = rows.map(row => ({
        student_name: row.student_name,
        grade_level: gradeLevel,
        section: section,
        subject_name: subject,
        academic_year: academicYear,
        p1_coursework: Number(row.p1_coursework) || 0,
        p1_exam: Number(row.p1_exam) || 0,
        p2_coursework: Number(row.p2_coursework) || 0,
        p2_exam: Number(row.p2_exam) || 0,
        is_locked: true // 🔒 تفعيل القفل هنا
      }));

      const { error } = await supabase
        .from('manual_grades')
        .upsert(payload, { onConflict: 'student_name, subject_name, academic_year' });

      if (error) throw error;
      
      setStatus({ type: 'success', msg: 'تم الاعتماد والقفل بنجاح! 🔒 الكشف الآن بعهدة الإدارة.' });
      fetchGrades(); // إعادة الجلب لتحديث حالة القفل في الواجهة
    } catch (err: any) {
      setStatus({ type: 'error', msg: 'فشل الاعتماد، تأكد من الاتصال.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

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
        
        {/* 🚀 إخفاء زر الحفظ إذا كان الكشف مقفلاً */}
        {!isSheetLocked && (
          <button onClick={saveAndLockGrades} disabled={loading} className="px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-full transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />} اعتماد وقفل نهائي
          </button>
        )}

        <button onClick={handlePrint} className="px-6 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-full transition-colors flex items-center gap-2">
          <Printer className="w-5 h-5" /> طباعة الكشف المعتمد
        </button>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8 print:p-0 print:max-w-none">
        
        <div className="no-print glass-panel p-6 rounded-[2rem] border border-white/10 mb-8 shadow-xl bg-[#0f1423]/80">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-amber-400" />
              <h1 className="text-2xl font-black text-white">محرك الرصد اليدوي</h1>
            </div>
            {/* 🚀 إشعار مرئي حالة القفل */}
            {isSheetLocked && (
              <div className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm font-black">
                <ShieldCheck className="w-5 h-5" /> كشف معتمد للإدارة
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400">العام الدراسي</label>
              <input value={academicYear} onChange={e => setAcademicYear(e.target.value)} disabled={isSheetLocked} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 outline-none focus:border-amber-500 disabled:opacity-50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400">الصف</label>
              <input value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} disabled={isSheetLocked} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 outline-none focus:border-amber-500 disabled:opacity-50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400">الشعبة</label>
              <input value={section} onChange={e => setSection(e.target.value)} disabled={isSheetLocked} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 outline-none focus:border-amber-500 disabled:opacity-50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400">المجال الدراسي</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} disabled={isSheetLocked} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 outline-none focus:border-amber-500 disabled:opacity-50" />
            </div>
          </div>
          
          {status && (
            <div className={`mt-6 p-4 rounded-xl font-bold text-sm flex items-center gap-2 ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : status.type === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
              <AlertCircle className="w-5 h-5" /> {status.msg}
            </div>
          )}
        </div>

        {/* 🖨️ الترويسة الرسمية للطباعة */}
        <div className="hidden print-header print:flex">
          <div className="text-right leading-relaxed">
            <p>وزارة التربية</p>
            <p>نظام سجل الطالب</p>
            <p>إدارة التعليم الخاص</p>
            <p className="mt-2">العام الدراسي : {academicYear}</p>
          </div>
          <div className="text-center leading-relaxed flex flex-col items-center">
            <p className="font-black text-xl mb-1">مدرسة الرفعة النموذجية (ثانوي - متوسط) للبنين</p>
            <p className="text-lg border border-black px-6 py-1 rounded-md bg-gray-100">كشف الرصد اليدوي للمجال الدراسي</p>
          </div>
          <div className="text-left leading-relaxed">
            <p>الصف : <span className="font-black">{gradeLevel}</span></p>
            <p>الشعبة : <span className="font-black">{section}</span></p>
            <p className="mt-2">المجال الدراسي : <span className="font-black">{subject}</span></p>
          </div>
        </div>

        <div className="overflow-x-auto bg-[#0f1423]/40 print:bg-transparent rounded-2xl print:rounded-none border border-white/10 print:border-none p-1 print:p-0 relative">
          
          {/* 🔒 طبقة حماية بصرية إذا كان الكشف مقفلاً */}
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
                <th rowSpan={2} className="w-24 p-3 font-black bg-white/10 print:bg-gray-200">نهاية العام<br/>مجموع</th>
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

      </div>
    </div>
  );
}
