'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/auth-context'; // 🚀 استيراد جدار الحماية
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, ShieldAlert, Printer, Search, Filter,
  User, GraduationCap, CalendarDays, ChevronDown, ChevronUp,
  FileText, AlertTriangle, Mail, CheckCircle2, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface SubjectBreakdown {
  teacherId: string;
  teacherName: string;
  count: number;
  days: number;
}

interface AggregatedStudent {
  id: string;
  name: string;
  className: string;
  sectionId: string;
  totalConvertedDays: number;
  details: SubjectBreakdown[];
}

export default function AdminAbsenceWarningsPage() {
  const { authRole, isChecking } = useAuth(); // 🚀 تفعيل الحماية
  
  const [students, setStudents] = useState<AggregatedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  
  // للتحكم في وضع الطباعة (مجمع أم إشعار لولي أمر)
  const [printMode, setPrintMode] = useState<'bulk' | 'letter' | null>(null);
  const [studentForLetter, setStudentForLetter] = useState<AggregatedStudent | null>(null);

  const fetchData = useCallback(async () => {
    // 🚀 تأكيد إضافي قبل الطلب
    if (authRole !== 'admin' && authRole !== 'management') return;
    
    try {
      setLoading(true);
      
      // 1. جلب أسماء المعلمين لربطها بالمواد
      const { data: teachersData } = await supabase
        .from('users')
        .select('id, full_name')
        .in('role', ['teacher', 'admin', 'management']);
        
      const teacherNamesMap = new Map();
      teachersData?.forEach(t => teacherNamesMap.set(t.id, t.full_name));

      // 2. جلب جميع سجلات الغياب لجميع الطلاب
      const { data: absences, error } = await supabase
        .from('attendance_records')
        .select('student_id, section_id, teacher_id, students(users!fk_students_users(full_name)), sections(name, classes(name))')
        .eq('status', 'absent');

      if (error) throw error;

      if (absences) {
        const studentMap = new Map();
        
        // تجميع الحصص لكل طالب حسب المعلم (المادة)
        absences.forEach((a: any) => {
          const sid = a.student_id;
          if (!studentMap.has(sid)) {
            const stuObj = Array.isArray(a.students) ? a.students[0] : a.students;
            const userObj = Array.isArray(stuObj?.users) ? stuObj.users[0] : stuObj?.users;
            const secObj = Array.isArray(a.sections) ? a.sections[0] : a.sections;
            const classObj = Array.isArray(secObj?.classes) ? secObj.classes[0] : secObj?.classes;
            
            studentMap.set(sid, {
              id: sid,
              name: userObj?.full_name || 'طالب غير معروف',
              className: `${classObj?.name || ''} - ${secObj?.name || ''}`,
              sectionId: a.section_id,
              teachersAbsences: {} as Record<string, number>
            });
          }
          const s = studentMap.get(sid);
          s.teachersAbsences[a.teacher_id] = (s.teachersAbsences[a.teacher_id] || 0) + 1;
        });

        // حساب الأيام المعادلة
        const aggregatedList: AggregatedStudent[] = [];
        
        studentMap.forEach(s => {
          let totalDays = 0;
          const subjectsBreakdown: SubjectBreakdown[] = [];
          
          for (const [tId, count] of Object.entries(s.teachersAbsences)) {
             const numericCount = count as number;
             const convertedDays = Math.floor(numericCount / 5); // المعادلة المتفق عليها: 5 حصص = 1 يوم
             
             if (convertedDays > 0) {
                totalDays += convertedDays;
                subjectsBreakdown.push({
                   teacherId: tId,
                   teacherName: teacherNamesMap.get(tId) || 'معلم غير معروف',
                   count: numericCount,
                   days: convertedDays
                });
             }
          }
          
          if (totalDays > 0) {
             aggregatedList.push({
                id: s.id,
                name: s.name,
                className: s.className,
                sectionId: s.sectionId,
                totalConvertedDays: totalDays,
                details: subjectsBreakdown.sort((a,b) => b.days - a.days)
             });
          }
        });
        
        setStudents(aggregatedList.sort((a, b) => b.totalConvertedDays - a.totalConvertedDays));
      }
    } catch (error) {
      console.error('Error fetching aggregated warnings:', error);
    } finally {
      setLoading(false);
    }
  }, [authRole]);

  useEffect(() => {
    // 🚀 لا نطلب البيانات من السيرفر إلا إذا كان المستخدم ضمن الإدارة
    if (authRole === 'admin' || authRole === 'management') {
      fetchData();
    }
  }, [authRole, fetchData]);

  const sectionsList = useMemo(() => {
    const list = students.map(s => ({ id: s.sectionId, name: s.className }));
    const unique = Array.from(new Map(list.map(item => [item.id, item])).values());
    return unique;
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSection = selectedSection === 'all' || s.sectionId === selectedSection;
      return matchesSearch && matchesSection;
    });
  }, [searchTerm, selectedSection, students]);

  const handleBulkPrint = () => {
    setPrintMode('bulk');
    setTimeout(() => {
        window.print();
        setPrintMode(null);
    }, 300); // إعطاء المتصفح وقتاً كافياً لرسم الجدول
  };

  const handleLetterPrint = (student: AggregatedStudent) => {
    setStudentForLetter(student);
    setPrintMode('letter');
    setTimeout(() => {
        window.print();
        setPrintMode(null);
    }, 300); // إعطاء المتصفح وقتاً كافياً لرسم الرسالة
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
          <p className="text-slate-500 font-bold tracking-widest animate-pulse text-lg">جاري فحص وتجميع الإنذارات...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* إخفاء الواجهة الأصلية وتأمين عدم تداخل الأكواد */
          .no-print, nav, header, footer, button, select, input { display: none !important; }
          body, html { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; height: auto !important; }
          
          .print-area { 
             display: block !important; 
             width: 100% !important; 
             direction: rtl; 
             font-family: 'Cairo', sans-serif; 
             background: white; 
             padding: 0 !important;
             margin: 0 !important;
          }
          
          /* تنسيقات الطباعة المجمعة */
          .bulk-print-wrapper table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .bulk-print-wrapper th, .bulk-print-wrapper td { border: 1px solid #000; padding: 10px; text-align: right; }
          .bulk-print-wrapper th { background-color: #f1f5f9 !important; }
          .print-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 30px; }
          
          /* تنسيقات رسالة ولي الأمر */
          .letter-print-wrapper { max-width: 100%; line-height: 1.8; font-size: 16px; }
          .letter-print-wrapper .school-logo-area { text-align: center; margin-bottom: 40px; }
          .letter-print-wrapper .letter-title { text-align: center; font-size: 24px; font-weight: bold; text-decoration: underline; margin-bottom: 40px; }
          .letter-print-wrapper .letter-body { margin-bottom: 30px; text-align: justify; font-size: 18px; }
          .letter-print-wrapper table { width: 100%; border-collapse: collapse; margin: 30px 0; }
          .letter-print-wrapper th, .letter-print-wrapper td { border: 1px solid #000; padding: 12px; text-align: center; }
          .letter-print-wrapper th { background-color: #e2e8f0 !important; }
          .letter-print-wrapper .signatures { display: flex; justify-content: space-between; margin-top: 80px; text-align: center; font-weight: bold; }
          @page { size: A4; margin: 20mm; }
        }
      `}} />

      {/* 🖨️ منطقة طباعة التقرير المجمع */}
      {printMode === 'bulk' && (
        <div className="print-area bulk-print-wrapper">
            <div className="print-header">
                <h1 style={{fontSize: '28px', marginBottom: '5px'}}>مدرسة الرفعة النموذجية</h1>
                <h2 style={{fontSize: '18px', color: '#444'}}>التقرير المجمع للمنذرين (تجاوز الحد المسموح للغياب)</h2>
                <p style={{fontSize: '14px'}}>تاريخ التقرير: {format(new Date(), 'yyyy/MM/dd', { locale: arSA })}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style={{width: '50px'}}>م</th>
                        <th>اسم الطالب</th>
                        <th>الصف والشعبة</th>
                        <th style={{textAlign: 'center'}}>إجمالي الأيام المخصومة (عبر جميع المواد)</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredStudents.map((s, i) => (
                        <tr key={s.id}>
                            <td style={{textAlign: 'center'}}>{i + 1}</td>
                            <td style={{fontWeight: 'bold'}}>{s.name}</td>
                            <td>{s.className}</td>
                            <td style={{textAlign: 'center', fontWeight: 'bold'}}>{s.totalConvertedDays} أيام</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div style={{marginTop: '50px', textAlign: 'center', fontWeight: 'bold', display: 'flex', justifyContent: 'space-around'}}>
                <div><p>شؤون الطلاب</p><br/>.........................</div>
                <div><p>مدير المدرسة</p><br/>.........................</div>
            </div>
        </div>
      )}

      {/* 🖨️ منطقة طباعة إشعار ولي الأمر الفردي */}
      {printMode === 'letter' && studentForLetter && (
        <div className="print-area letter-print-wrapper">
            <div className="school-logo-area">
                <h1 style={{fontSize: '32px', margin: 0}}>مدرسة الرفعة النموذجية</h1>
                <p style={{fontSize: '18px', margin: '5px 0 0 0'}}>إدارة شؤون الطلاب</p>
                <p style={{fontSize: '14px', margin: '5px 0 0 0'}}>التاريخ: {format(new Date(), 'yyyy/MM/dd', { locale: arSA })}</p>
            </div>

            <div className="letter-title">إشعار رسمي بتجاوز حد الغياب المسموح</div>

            <div className="letter-body">
                <p style={{fontWeight: 'bold'}}>المكرم ولي أمر الطالب/ة: <span style={{fontSize: '20px', textDecoration: 'underline'}}>{studentForLetter.name}</span> المحترم،</p>
                <p>السلام عليكم ورحمة الله وبركاته، وبعد...</p>
                <p>
                    نأمل منكم متابعة حرص الإدارة على مصلحة أبنائنا الطلاب واستمراريتهم في التحصيل العلمي. 
                    نفيدكم علماً بأن ابنكم/ابنتكم المقيد في (<span style={{fontWeight:'bold'}}>{studentForLetter.className}</span>) 
                    قد تجاوز الحد المسموح به للغياب في بعض المقررات الدراسية، وحسب لائحة السلوك والمواظبة المعتمدة 
                    (حيث يُحتسب كل 5 حصص غياب في المادة المعينة كيوم غياب كامل)، فقد بلغ مجموع أيام الغياب المستحقة للخصم: 
                    <span style={{fontSize: '22px', fontWeight: 'bold', padding: '0 10px'}}>{studentForLetter.totalConvertedDays} يوماً</span>.
                </p>
                <p>وإليكم التفصيل الدقيق لغياب الطالب حسب المقررات التي تجاوز فيها الحد:</p>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>م</th>
                        <th>المادة / المعلم المسجل للغياب</th>
                        <th>عدد الحصص المتغيب فيها</th>
                        <th>الأيام المعادلة (المخصومة)</th>
                    </tr>
                </thead>
                <tbody>
                    {studentForLetter.details.map((detail, idx) => (
                        <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td style={{textAlign: 'right', paddingRight: '15px'}}>{detail.teacherName}</td>
                            <td>{detail.count} حصص</td>
                            <td style={{fontWeight: 'bold'}}>{detail.days} أيام</td>
                        </tr>
                    ))}
                    <tr style={{backgroundColor: '#f8fafc', fontWeight: 'bold'}}>
                        <td colSpan={3} style={{textAlign: 'left', paddingLeft: '15px'}}>الإجمالي النهائي المخصوم:</td>
                        <td style={{fontSize: '18px'}}>{studentForLetter.totalConvertedDays} أيام</td>
                    </tr>
                </tbody>
            </table>

            <div className="letter-body">
                <p>نأمل منكم التكرم بمراجعة إدارة المدرسة في أقرب وقت ممكن لبحث أسباب الغياب وتلافي أي إجراءات إدارية أو أكاديمية قد تترتب على استمرار هذا الوضع.</p>
                <p>شاكرين لكم حسن تعاونكم.</p>
            </div>

            <div className="signatures">
                <div>
                    <p>توقيع ولي الأمر (للعلم)</p>
                    <p style={{marginTop: '40px', color: '#666'}}>........................................</p>
                </div>
                <div>
                    <p>يعتمد، مدير المدرسة</p>
                    <p style={{marginTop: '40px', color: '#666'}}>........................................</p>
                </div>
            </div>
        </div>
      )}

      {/* واجهة المستخدم الأصلية */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto px-4 py-8 font-cairo space-y-6 pb-20 no-print" dir="rtl">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Link href="/dashboard/admin" className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 transition-all">
            <ArrowLeft className="w-4 h-4" /> العودة للوحة الإدارة
          </Link>
          <div className="flex w-full sm:w-auto">
             <button onClick={handleBulkPrint} disabled={filteredStudents.length === 0} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-black shadow-md hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50">
                <Printer className="w-5 h-5" /> طباعة الكشف المجمع
             </button>
          </div>
        </div>

        {/* Banner */}
        <div className="bg-gradient-to-l from-slate-900 to-indigo-950 rounded-[2.5rem] p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl">
            <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full border border-white/20 text-xs font-black uppercase tracking-widest mb-6 backdrop-blur-md">
                    <ShieldAlert className="w-4 h-4 text-rose-400" /> المركز المجمع للإنذارات
                </div>
                <h1 className="text-3xl sm:text-5xl font-black mb-4 tracking-tight">إجمالي أيام الغياب المخصومة</h1>
                <p className="text-indigo-200 max-w-3xl text-base sm:text-lg font-bold leading-relaxed">
                    هذه الصفحة تستخلص آلياً غياب الطلاب من جميع المعلمين وتجمعها لتشكيل الرصيد النهائي المخصوم على الطالب.
                    <span className="block mt-2 text-rose-300">يظهر هنا فقط من أتم (5 حصص = 1 يوم غياب) في مادة واحدة على الأقل.</span>
                </p>
            </div>
            <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-r from-white/5 to-transparent skew-x-12 -translate-x-1/2"></div>
        </div>

        {/* Filters & Search */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                    type="text" 
                    placeholder="ابحث باسم الطالب..." 
                    className="w-full pr-12 pl-4 py-4 bg-white rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-0 transition-all font-bold text-slate-700 shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="md:col-span-2 flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                <div className="p-2 bg-slate-50 rounded-xl text-slate-400"><Filter className="w-5 h-5" /></div>
                <select 
                    className="flex-1 bg-transparent border-none focus:ring-0 font-black text-slate-700 cursor-pointer"
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                >
                    <option value="all">عرض جميع الفصول المتضررة</option>
                    {sectionsList.map(sec => (
                        <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))}
                </select>
            </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="p-6 font-black text-slate-500 text-sm uppercase">الطالب</th>
                            <th className="p-6 font-black text-slate-500 text-sm uppercase">الصف والشعبة</th>
                            <th className="p-6 font-black text-slate-500 text-sm uppercase text-center">إجمالي الأيام المخصومة</th>
                            <th className="p-6 font-black text-slate-500 text-sm uppercase text-center">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredStudents.map(student => (
                            <React.Fragment key={student.id}>
                                <tr className={`transition-colors group ${expandedRow === student.id ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}>
                                    <td className="p-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                                                <User className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 text-lg">{student.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 mt-1">مواد متجاوزة: {student.details.length}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-2 text-slate-600 font-bold">
                                            <GraduationCap className="w-5 h-5 opacity-50" />
                                            {student.className}
                                        </div>
                                    </td>
                                    <td className="p-6 text-center">
                                        <div className="inline-flex items-center gap-2 bg-rose-100 text-rose-800 rounded-xl px-5 py-2 border border-rose-200">
                                            <CalendarDays className="w-5 h-5" />
                                            <span className="text-xl font-black">{student.totalConvertedDays}</span>
                                            <span className="text-xs font-bold mt-1">أيام</span>
                                        </div>
                                    </td>
                                    <td className="p-6 text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <button 
                                                onClick={() => setExpandedRow(expandedRow === student.id ? null : student.id)}
                                                className={`p-3 rounded-xl border font-bold text-sm flex items-center gap-2 transition-all ${expandedRow === student.id ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                            >
                                                {expandedRow === student.id ? <><ChevronUp className="w-4 h-4"/> إخفاء التفاصيل</> : <><ChevronDown className="w-4 h-4"/> التفاصيل</>}
                                            </button>
                                            <button 
                                                onClick={() => handleLetterPrint(student)}
                                                className="p-3 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-all shadow-md flex items-center gap-2 font-bold text-sm active:scale-95"
                                                title="طباعة إنذار رسمي لولي الأمر"
                                            >
                                                <Mail className="w-4 h-4" /> طباعة الإشعار
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                {/* تفاصيل المواد (تظهر عند الضغط) */}
                                <AnimatePresence>
                                    {expandedRow === student.id && (
                                        <tr>
                                            <td colSpan={4} className="p-0 border-b border-slate-200">
                                                <motion.div 
                                                    initial={{ height: 0, opacity: 0 }} 
                                                    animate={{ height: 'auto', opacity: 1 }} 
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="bg-slate-50 overflow-hidden"
                                                >
                                                    <div className="p-6 sm:p-8">
                                                        <h4 className="text-sm font-black text-indigo-900 mb-4 flex items-center gap-2">
                                                            <FileText className="w-4 h-4" /> تفصيل الأيام المخصومة حسب المادة/المعلم:
                                                        </h4>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                                            {student.details.map((d, idx) => (
                                                                <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                                                                    <div>
                                                                        <p className="font-bold text-slate-800 text-sm mb-1">{d.teacherName}</p>
                                                                        <p className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 inline-block">{d.count} حصص غياب</p>
                                                                    </div>
                                                                    <div className="text-center bg-indigo-50 px-3 py-2 rounded-xl border border-indigo-100">
                                                                        <span className="block text-lg font-black text-indigo-700 leading-none">{d.days}</span>
                                                                        <span className="text-[8px] font-bold text-indigo-500 uppercase">أيام معادلة</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            </td>
                                        </tr>
                                    )}
                                </AnimatePresence>
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
            {filteredStudents.length === 0 && (
                <div className="py-24 text-center bg-white">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800">لا يوجد طلاب متجاوزين</h3>
                    <p className="text-sm text-slate-500 font-bold mt-2">جميع الطلاب ضمن الحد المسموح للغياب.</p>
                </div>
            )}
        </div>
      </motion.div>
    </>
  );
}
