'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { useAbsenceWarnings } from '@/hooks/useAbsenceWarnings';
import { 
  ArrowLeft, ShieldAlert, Printer, Search, Filter,
  User, GraduationCap, AlertTriangle, CheckCircle2, Loader2, Bell
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

export default function AdminAbsenceWarningsPage() {
  const { authRole, isChecking } = useAuth();
  const { warningsData, loading, fetchWarnings } = useAbsenceWarnings();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [printMode, setPrintMode] = useState<boolean>(false);

  useEffect(() => {
    if (authRole === 'admin' || authRole === 'management') {
      fetchWarnings();
    }
  }, [authRole, fetchWarnings]);

  const sectionsList = useMemo(() => {
    const list = warningsData.map(s => ({ id: s.sectionId, name: s.className }));
    return Array.from(new Map(list.map(item => [item.id, item])).values());
  }, [warningsData]);

  const filteredStudents = useMemo(() => {
    return warningsData.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSection = selectedSection === 'all' || s.sectionId === selectedSection;
      const matchesLevel = selectedLevel === 'all' || s.warningLevel === selectedLevel;
      return matchesSearch && matchesSection && matchesLevel;
    });
  }, [searchTerm, selectedSection, selectedLevel, warningsData]);

  const handlePrint = () => {
    setPrintMode(true);
    setTimeout(() => {
        window.print();
        setPrintMode(false);
    }, 500); 
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'warning_1': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'warning_2': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'warning_3': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'dismissal': return 'bg-slate-900 text-rose-400 border-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

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

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body, html { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; margin: 0; padding: 0; }
          
          .print-area { display: block !important; width: 100% !important; direction: rtl; font-family: 'Cairo', sans-serif; background: white; }
          
          /* 🚀 السحر هنا: هذا الكود يفصل كل إشعار طالب في صفحة A4 مستقلة */
          .student-letter-page {
            page-break-after: always;
            break-after: page;
            min-height: 100vh;
            padding: 40px;
            box-sizing: border-box;
          }
          .student-letter-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          .letter-header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 40px; }
          .letter-header h1 { font-size: 32px; font-weight: 900; margin: 0; }
          .letter-header h2 { font-size: 20px; font-weight: bold; margin: 10px 0 0 0; color: #333; }
          
          .letter-title { text-align: center; font-size: 26px; font-weight: 900; text-decoration: underline; margin-bottom: 40px; }
          .letter-body { font-size: 18px; line-height: 2; text-align: justify; margin-bottom: 40px; }
          .highlight-box { text-align: center; border: 2px dashed #000; padding: 20px; margin: 30px 0; font-size: 22px; font-weight: bold; background-color: #f8fafc; }
          
          .signatures { display: flex; justify-content: space-between; margin-top: 80px; text-align: center; font-weight: bold; font-size: 18px; }
          @page { size: A4; margin: 0; }
        }
      `}} />

      {/* 🖨️ منطقة الطباعة (إشعار رسمي لكل طالب في صفحة مستقلة) */}
      {printMode && (
        <div className="print-area hidden print:block">
            {filteredStudents.map((s, idx) => (
                <div key={s.id} className="student-letter-page">
                    <div className="letter-header">
                        <h1>مدرسة الرفعة النموذجية</h1>
                        <h2>إدارة شؤون الطلاب والمواظبة</h2>
                        <p style={{fontSize: '14px', marginTop: '10px'}}>التاريخ: {format(new Date(), 'yyyy/MM/dd', { locale: arSA })}</p>
                    </div>

                    <div className="letter-title">
                        {s.warningLevel === 'dismissal' ? 'إشعار نهائي بالفصل بسبب الغياب' : `إشعار رسمي: ${s.warningLabel}`}
                    </div>

                    <div className="letter-body">
                        <p><strong>المكرم ولي أمر الطالب/ة:</strong> <span style={{fontSize: '22px', borderBottom: '1px solid #000', paddingBottom: '2px'}}>{s.name}</span> المحترم،</p>
                        <p>السلام عليكم ورحمة الله وبركاته، وبعد...</p>
                        <p>
                            انطلاقاً من حرص إدارة المدرسة على مصلحة أبنائنا الطلاب، وتطبيقاً للائحة السلوك والمواظبة،
                            نفيدكم بأن ابنكم/ابنتكم المقيد في الصف (<span style={{fontWeight:'bold'}}>{s.className}</span>) 
                            قد تجاوز الحد المسموح به للغياب المتكرر.
                        </p>
                        
                        <div className="highlight-box">
                            مجموع حصص الغياب المسجلة في النظام: <span style={{fontSize: '28px', color: '#e11d48', padding: '0 10px'}}>{s.absenceCount} حصة</span>
                            <br/>
                            <span style={{fontSize: '16px', color: '#666', marginTop: '10px', display: 'block'}}>(كل 5 حصص تعادل يوم غياب كامل)</span>
                        </div>

                        {s.warningLevel === 'dismissal' ? (
                            <p style={{fontWeight: 'bold'}}>وعليه، وبناءً على تجاوز الطالب لـ 100 حصة غياب، تقرر رفع ملفه للإدارة لاتخاذ إجراءات الفصل النهائي.</p>
                        ) : (
                            <p>لذا، نأمل منكم التكرم بمراجعة إدارة شؤون الطلاب في المدرسة فور استلامكم هذا الإشعار لبحث أسباب الغياب، وتوقيع التعهد اللازم لتلافي تصعيد الإجراءات التي قد تصل إلى الفصل.</p>
                        )}
                        <p>شاكرين لكم حسن تعاونكم الدائم لما فيه مصلحة أبنائكم.</p>
                    </div>

                    <div className="signatures">
                        <div>
                            <p>توقيع ولي الأمر (للعلم والاستلام)</p>
                            <p style={{marginTop: '50px', color: '#ccc'}}>..................................................</p>
                        </div>
                        <div>
                            <p>مدير المدرسة المساعد لشؤون الطلاب</p>
                            <p style={{marginTop: '50px', color: '#ccc'}}>..................................................</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* واجهة المستخدم التفاعلية */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto px-4 py-8 font-cairo space-y-6 pb-20 no-print" dir="rtl">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Link href="/dashboard/admin" className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 transition-all">
            <ArrowLeft className="w-4 h-4" /> العودة للوحة الإدارة
          </Link>
          <div className="flex w-full sm:w-auto">
             <button onClick={handlePrint} disabled={filteredStudents.length === 0} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-rose-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-lg hover:bg-rose-700 transition-all active:scale-95 disabled:opacity-50 border border-rose-500">
                <Printer className="w-5 h-5" /> طباعة إنذارات القائمة الحالية
             </button>
          </div>
        </div>

        {/* Banner */}
        <div className="bg-gradient-to-l from-slate-900 via-rose-950 to-slate-900 rounded-[2.5rem] p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl">
            <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-500/20 rounded-full border border-rose-500/30 text-xs font-black uppercase tracking-widest mb-6 backdrop-blur-md text-rose-300">
                    <Bell className="w-4 h-4" /> نظام الإنذارات الذكي
                </div>
                <h1 className="text-3xl sm:text-5xl font-black mb-4 tracking-tight">إدارة إنذارات الغياب والمواظبة</h1>
                <p className="text-rose-100 max-w-3xl text-sm sm:text-base font-bold leading-relaxed opacity-90">
                    يعمل هذا النظام وفق اللائحة الجديدة: (25 حصة = إنذار أول) | (50 حصة = إنذار ثاني) | (75 حصة = إنذار ثالث) | (100 حصة فأكثر = إشعار فصل).
                </p>
            </div>
            <div className="absolute right-0 top-0 w-1/3 h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative group">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 transition-colors group-focus-within:text-rose-500" />
                <input 
                    type="text" 
                    placeholder="ابحث باسم الطالب..." 
                    className="w-full pr-12 pl-4 py-4 bg-white rounded-2xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all font-bold text-slate-700 shadow-sm outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="md:col-span-1 flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                <div className="p-2 bg-slate-50 rounded-xl text-slate-400"><Filter className="w-5 h-5" /></div>
                <select className="flex-1 bg-transparent border-none outline-none focus:ring-0 font-black text-slate-700 cursor-pointer text-sm" value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}>
                    <option value="all">جميع الفصول المتضررة</option>
                    {sectionsList.map(sec => <option key={sec.id} value={sec.id}>{sec.name}</option>)}
                </select>
            </div>

            <div className="md:col-span-1 flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                <div className="p-2 bg-rose-50 rounded-xl text-rose-500"><AlertTriangle className="w-5 h-5" /></div>
                <select className="flex-1 bg-transparent border-none outline-none focus:ring-0 font-black text-slate-700 cursor-pointer text-sm" value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)}>
                    <option value="all">جميع مستويات الإنذار</option>
                    <option value="warning_1">الإنذار الأول (25+)</option>
                    <option value="warning_2">الإنذار الثاني (50+)</option>
                    <option value="warning_3">الإنذار الثالث (75+)</option>
                    <option value="dismissal">إشعارات الفصل (100+)</option>
                </select>
            </div>
        </div>

        {/* Loading / Empty / Table */}
        {loading ? (
             <div className="py-24 text-center bg-white rounded-[2rem] border border-slate-200 shadow-sm">
                 <Loader2 className="w-12 h-12 text-rose-500 animate-spin mx-auto" />
             </div>
        ) : filteredStudents.length === 0 ? (
            <div className="py-24 text-center bg-white rounded-[2rem] border border-slate-200 shadow-sm">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-xl font-black text-slate-800">بيئة مدرسية مثالية!</h3>
                <p className="text-sm text-slate-500 font-bold mt-2">لا يوجد أي طلاب مطابقين لشروط هذا الإنذار.</p>
            </div>
        ) : (
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead className="bg-slate-50/80 border-b border-slate-200">
                            <tr>
                                <th className="p-5 font-black text-slate-500 text-xs uppercase tracking-widest w-16 text-center">م</th>
                                <th className="p-5 font-black text-slate-500 text-xs uppercase tracking-widest">الطالب المستهدف</th>
                                <th className="p-5 font-black text-slate-500 text-xs uppercase tracking-widest text-center">مجموع حصص الغياب</th>
                                <th className="p-5 font-black text-slate-500 text-xs uppercase tracking-widest text-center">التصنيف الإداري</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredStudents.map((student, index) => (
                                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-5 text-center font-bold text-slate-400">{index + 1}</td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 font-black">
                                                <User className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900">{student.name}</p>
                                                <p className="text-[10px] font-bold text-slate-500 mt-0.5 flex items-center gap-1"><GraduationCap className="w-3 h-3"/> {student.className}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-5 text-center">
                                        <div className="inline-flex items-baseline gap-1 text-rose-600 font-black">
                                            <span className="text-xl">{student.absenceCount}</span>
                                            <span className="text-[10px] text-rose-400">حصة</span>
                                        </div>
                                    </td>
                                    <td className="p-5 text-center">
                                        <span className={`inline-block px-4 py-2 rounded-xl text-xs font-black border shadow-sm ${getLevelColor(student.warningLevel)}`}>
                                            {student.warningLabel}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </motion.div>
    </>
  );
}
