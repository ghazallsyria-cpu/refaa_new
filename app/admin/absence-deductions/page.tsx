'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/auth-context'; // 🚀 استيراد جدار الحماية
import { 
  Calculator, ShieldAlert, FileSignature, Printer, 
  Search, Filter, Users, Clock, AlertTriangle, 
  FileText, ArrowLeft, RefreshCw, Scale, CheckCircle2, Loader2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface DeductionStudent {
  id: string;
  name: string;
  className: string;
  sectionId: string;
  absentPeriods: number;
  deductionDays: number;
}

export default function AbsenceDeductionsPage() {
  const { authRole, isChecking } = useAuth(); // 🚀 تفعيل الحماية

  const [students, setStudents] = useState<DeductionStudent[]>([]);
  const [sections, setSections] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. جلب جميع سجلات الغياب في المدرسة
      const { data: absences, error } = await supabase
        .from('attendance_records')
        .select(`
          student_id,
          sections(id, name, classes(name)),
          students(users!fk_students_users(full_name))
        `)
        .eq('status', 'absent');

      if (error) throw error;

      // 2. تجميع الحصص وتطبيق معادلة (5 حصص = 1 يوم خصم)
      const studentMap = new Map<string, DeductionStudent>();
      const sectionMap = new Map<string, {id: string, name: string}>();

      if (absences) {
        absences.forEach((record: any) => {
          const sid = record.student_id;
          
          if (!studentMap.has(sid)) {
            const stuObj = Array.isArray(record.students) ? record.students[0] : record.students;
            const userObj = Array.isArray(stuObj?.users) ? stuObj.users[0] : stuObj?.users;
            const secObj = Array.isArray(record.sections) ? record.sections[0] : record.sections;
            const classObj = Array.isArray(secObj?.classes) ? secObj.classes[0] : secObj?.classes;
            
            const fullClassName = `${classObj?.name || ''} - ${secObj?.name || ''}`;
            const secId = secObj?.id;

            if (secId && !sectionMap.has(secId)) {
                sectionMap.set(secId, { id: secId, name: fullClassName });
            }

            studentMap.set(sid, {
              id: sid,
              name: userObj?.full_name || 'طالب غير معروف',
              className: fullClassName,
              sectionId: secId,
              absentPeriods: 0,
              deductionDays: 0
            });
          }
          
          studentMap.get(sid)!.absentPeriods++;
        });
      }

      // 3. تصفية الطلاب الذين يستحقون الخصم فقط (5 حصص فأكثر)
      const eligibleForDeduction = Array.from(studentMap.values()).map(stu => ({
        ...stu,
        deductionDays: Math.floor(stu.absentPeriods / 5)
      })).filter(stu => stu.deductionDays > 0)
         .sort((a, b) => b.deductionDays - a.deductionDays);

      setStudents(eligibleForDeduction);
      setSections(Array.from(sectionMap.values()));
    } catch (err) {
      console.error('Error fetching deduction data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 🚀 لا نطلب البيانات من السيرفر إلا إذا كان المستخدم ضمن الإدارة
    if (authRole === 'admin' || authRole === 'management') {
      fetchData();
    }
  }, [authRole]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSection = selectedSection === 'all' || s.sectionId === selectedSection;
      const matchSearch = s.name.includes(search) || s.className.includes(search);
      return matchSection && matchSearch;
    });
  }, [students, selectedSection, search]);

  const totalDeductionDays = filteredStudents.reduce((acc, curr) => acc + curr.deductionDays, 0);

  const generateMinistryPDF = () => {
    window.print();
  };

  // 🚀 شاشة التحميل وحماية الوصول
  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-rose-600 animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (authRole !== 'admin' && authRole !== 'management') {
    return <div className="p-10 text-center font-bold text-rose-600 min-h-screen flex items-center justify-center bg-slate-50">هذه الصفحة مخصصة لفريق الإدارة فقط.</div>;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 border-4 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold tracking-widest animate-pulse text-lg">جاري فحص السجلات وتطبيق لوائح الخصم...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 🚀 واجهة النظام للمدير (تختفي عند الطباعة) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 sm:space-y-8 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 print:hidden pt-8 font-cairo" dir="rtl">
        
        {/* 🚀 زر العودة الموحد */}
        <div className="mb-2 no-print">
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-rose-600 font-bold bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-sm border border-slate-200 transition-all w-fit group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> العودة للوحة الإدارة
          </Link>
        </div>

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-r from-rose-800 via-red-700 to-rose-900 p-6 sm:p-12 text-white shadow-2xl shadow-rose-900/30 border-b-4 border-rose-400">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
            <div className="space-y-3 sm:space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] sm:text-xs font-bold uppercase tracking-widest backdrop-blur-sm shadow-sm">
                <Scale className="w-3.5 h-3.5 text-rose-200" />
                <span>إدارة شؤون الطلاب والمواظبة</span>
              </div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight drop-shadow-md">
                قرارات خصم الغياب
              </h1>
              <p className="text-rose-100 text-xs sm:text-base font-bold opacity-90 max-w-2xl leading-relaxed">
                هذه اللوحة مخصصة لحصر الطلاب الذين تجاوزوا الحد المسموح للغياب. النظام يقوم آلياً بتطبيق لائحة الوزارة: <strong className="bg-white/20 px-2 py-0.5 rounded text-white mx-1">كل 5 حصص = 1 يوم غياب كامل</strong>.
              </p>
            </div>
            
            <div className="flex shrink-0 w-full lg:w-auto">
              <button
                onClick={generateMinistryPDF}
                disabled={filteredStudents.length === 0}
                className="w-full flex items-center justify-center gap-2 px-6 sm:px-8 py-4 sm:py-5 rounded-[1.5rem] bg-white text-rose-700 hover:bg-rose-50 text-sm sm:text-base font-black shadow-xl shadow-white/10 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border border-rose-100"
              >
                <FileSignature className="w-5 h-5 animate-pulse" />
                استخراج كشف الوزارة PDF
              </button>
            </div>
          </div>
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
          <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none animate-pulse"></div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white/90 backdrop-blur-xl p-5 sm:p-8 rounded-[2rem] border border-rose-100 shadow-sm flex items-center gap-4 group hover:shadow-lg transition-all">
            <div className="h-14 w-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform shadow-sm">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-rose-700">{filteredStudents.length}</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">طالب يستحق الخصم</p>
            </div>
          </div>
          <div className="bg-white/90 backdrop-blur-xl p-5 sm:p-8 rounded-[2rem] border border-amber-100 shadow-sm flex items-center gap-4 group hover:shadow-lg transition-all">
            <div className="h-14 w-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform shadow-sm">
              <Calculator className="h-7 w-7" />
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-amber-700">{totalDeductionDays}</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">إجمالي أيام الخصم</p>
            </div>
          </div>
          <div className="bg-white/90 backdrop-blur-xl p-5 sm:p-8 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-lg transition-all">
            <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 group-hover:scale-110 transition-transform shadow-sm">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-slate-700">{sections.length}</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">فصل متضرر</p>
            </div>
          </div>
        </div>

        {/* Filters & Table */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 sm:p-8 border-b border-slate-100/50 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-rose-50 text-rose-600 rounded-xl shadow-inner border border-rose-100">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">قائمة المستحقين للخصم</h2>
                <p className="text-[10px] sm:text-xs font-bold text-slate-500 mt-1">القائمة مفلترة آلياً لإظهار من تجاوز 5 حصص غياب فقط.</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-center">
              <div className="relative w-full sm:w-56 shrink-0">
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full rounded-xl bg-white border border-slate-200 py-3 pr-10 pl-4 text-sm font-bold focus:ring-2 focus:ring-rose-500 outline-none shadow-sm cursor-pointer appearance-none"
                >
                  <option value="all">جميع الفصول</option>
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث عن طالب..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-xl bg-white border border-slate-200 py-3 pr-10 pl-4 text-sm font-bold focus:ring-2 focus:ring-rose-500 outline-none shadow-sm"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/30">
                <tr>
                  <th className="py-4 sm:py-5 pr-6 sm:pr-8 pl-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">الطالب والفصل</th>
                  <th className="px-4 py-4 sm:py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">إجمالي الغياب (حصص)</th>
                  <th className="px-4 py-4 sm:py-5 text-center text-[10px] font-black text-rose-600 uppercase tracking-widest bg-rose-50 border-x border-rose-100">أيام الخصم المستحقة</th>
                  <th className="px-6 py-4 sm:py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell">تصنيف الخطر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center bg-emerald-50/30">
                      <div className="flex flex-col items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center border border-emerald-200 shadow-inner">
                          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-emerald-800 font-black text-lg mb-1">الوضع سليم تماماً</p>
                          <p className="text-slate-500 font-bold text-sm">لا يوجد أي طالب تجاوز حد الغياب المسموح في المحددات الحالية.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, idx) => (
                    <motion.tr
                      key={student.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="group transition-all hover:bg-slate-50/80"
                    >
                      <td className="whitespace-nowrap py-3 sm:py-4 pr-6 sm:pr-8 pl-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 font-black text-base sm:text-lg border border-slate-200">
                            {student.name.charAt(0)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-black text-slate-900 text-sm sm:text-base truncate">{student.name}</span>
                            <span className="text-[10px] sm:text-xs text-slate-500 font-bold truncate mt-0.5">{student.className}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 sm:py-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-100 text-slate-700 font-black text-sm border border-slate-200 shadow-sm">
                          {student.absentPeriods}
                        </span>
                      </td>
                      <td className="px-4 py-3 sm:py-4 text-center bg-rose-50/50 border-x border-rose-50">
                        <span className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-rose-600 text-white font-black text-lg border border-rose-700 shadow-md shadow-rose-200 animate-pulse">
                          - {student.deductionDays} يوم
                        </span>
                      </td>
                      <td className="px-6 py-3 sm:py-4 text-center hidden sm:table-cell">
                        {student.deductionDays >= 3 ? (
                          <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-800 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-black">
                            <ShieldAlert className="w-4 h-4" /> فصل نهائي مرتقب
                          </span>
                        ) : student.deductionDays >= 2 ? (
                          <span className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-800 border border-orange-200 px-3 py-1.5 rounded-lg text-xs font-black">
                            <AlertTriangle className="w-4 h-4" /> إنذار ثاني
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg text-xs font-black">
                            <AlertTriangle className="w-4 h-4" /> إنذار أول
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* ========================================== */}
      {/* 🚀 MINISTRY OFFICIAL PDF VIEW (للطباعة فقط) */}
      {/* ========================================== */}
      <div className="hidden print:block w-full bg-white text-black p-10 font-cairo" dir="rtl">
        {/* ترويسة كلاسيكية رسمية */}
        <div className="border-b-4 border-double border-slate-900 pb-6 mb-8 flex justify-between items-start">
          <div className="text-right space-y-1">
            <h2 className="text-lg font-black">وزارة التربية </h2>
            <h3 className="text-md font-bold"> الإدارة العامة للتعليم الخاص</h3>
            <h4 className="text-sm font-bold text-slate-700">مدرسة الرفعة النموذجية(م-ث) بنين - قسم شؤون الطلاب</h4>
          </div>
          <div className="text-center">
            <div className="w-24 h-24 mx-auto border-2 border-slate-900 rounded-full flex items-center justify-center mb-2">
               <Scale className="w-12 h-12 text-slate-900" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest">وثيقة رسمية</p>
          </div>
          <div className="text-left space-y-2">
            <p className="text-sm font-bold">التاريخ: {format(new Date(), 'yyyy/MM/dd')}</p>
            <p className="text-sm font-bold">رقم الكشف: {Math.floor(Math.random() * 90000) + 10000}</p>
            <p className="text-sm font-bold">المرفقات: ( ___ )</p>
          </div>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-2xl font-black underline underline-offset-8 mb-4">كشف حصر غياب الطلاب المستحقين للخصم</h1>
          <p className="text-sm font-bold text-slate-700 leading-relaxed max-w-3xl mx-auto">
            بناءً على لائحة السلوك والمواظبة المعتمدة، نرفع لسعادتكم كشفاً بأسماء الطلاب الذين تجاوزوا الحد المسموح للغياب، حيث تم تطبيق معادلة الخصم النظامية <span className="border px-1 border-slate-900">(خمس حصص غياب منفصلة = يوم غياب كامل)</span>، وذلك لاعتماد الخصم من درجات المواظبة.
          </p>
        </div>

        <table className="w-full border-collapse border-2 border-slate-900 text-sm mb-12">
          <thead>
            <tr className="bg-slate-200">
              <th className="border-2 border-slate-900 p-3 text-center w-12 font-black">م</th>
              <th className="border-2 border-slate-900 p-3 text-right font-black w-1/3">اسم الطالب الرباعي</th>
              <th className="border-2 border-slate-900 p-3 text-center font-black">الصف / الشعبة</th>
              <th className="border-2 border-slate-900 p-3 text-center font-black">مجموع حصص الغياب</th>
              <th className="border-2 border-slate-900 p-3 text-center font-black bg-slate-300">أيام الخصم المستحقة</th>
              <th className="border-2 border-slate-900 p-3 text-center font-black w-48">ملاحظات والتوقيع</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((stu, index) => (
              <tr key={stu.id} className="nth-child(even):bg-slate-50">
                <td className="border-2 border-slate-900 p-3 text-center font-bold">{index + 1}</td>
                <td className="border-2 border-slate-900 p-3 text-right font-black">{stu.name}</td>
                <td className="border-2 border-slate-900 p-3 text-center font-bold text-slate-700">{stu.className}</td>
                <td className="border-2 border-slate-900 p-3 text-center font-bold" dir="ltr">{stu.absentPeriods} حصص</td>
                <td className="border-2 border-slate-900 p-3 text-center font-black text-lg bg-slate-100">
                  {stu.deductionDays} يوم
                </td>
                <td className="border-2 border-slate-900 p-3 text-center text-slate-300 border-dashed">
                    ....................
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* توقيعات الاعتماد الرسمية */}
        <div className="flex justify-between items-end mt-20 pt-10 border-t-2 border-slate-900 px-10">
          <div className="text-center w-1/3">
            <h4 className="font-black mb-12">إدارة المنصة / شؤون الطلاب</h4>
            <div className="w-48 border-b-2 border-slate-900 border-dashed mx-auto mb-2"></div>
            <p className="text-xs font-bold text-slate-500">الاسم والتوقيع</p>
          </div>
          
          <div className="text-center w-1/3">
            <div className="w-32 h-32 border-4 border-double border-slate-300 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50 transform -rotate-12">
               <span className="font-black text-xl text-slate-300">الختم الرسمي</span>
            </div>
          </div>

          <div className="text-center w-1/3">
            <h4 className="font-black mb-12">مدير المدرسة</h4>
            <div className="w-48 border-b-2 border-slate-900 border-dashed mx-auto mb-2"></div>
            <p className="text-xs font-bold text-slate-500">الاسم والتوقيع والختم</p>
          </div>
        </div>

        <div className="mt-8 text-center text-[10px] font-bold text-slate-400">
          * تم استخراج هذا الكشف آلياً من نظام الرفعة النموذجي للإدارة المدرسية.
        </div>
      </div>
    </>
  );
}
