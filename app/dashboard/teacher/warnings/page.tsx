
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, ShieldAlert, AlertTriangle, Printer, 
  Send, Search, Download, CheckCircle2, XCircle, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface AtRiskStudent {
  id: string;
  name: string;
  className: string;
  count: number;
}

export default function TeacherWarningsPage() {
  const { user, authRole } = useAuth();
  const [students, setStudents] = useState<AtRiskStudent[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<AtRiskStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // حالات الأزرار والإشعارات
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchAtRiskStudents = useCallback(async () => {
    if (!user?.id || authRole !== 'teacher') return;
    
    try {
      setLoading(true);
      // جلب سجلات الغياب للمعلم الحالي
      const { data: absences, error } = await supabase
        .from('attendance_records')
        .select('student_id, students(users(full_name)), sections(name, classes(name))')
        .eq('teacher_id', user.id)
        .eq('status', 'absent');

      if (error) throw error;

      if (absences) {
        const studentAbsences = new Map();
        absences.forEach((a: any) => {
          const sid = a.student_id;
          if (!studentAbsences.has(sid)) {
             // معالجة البيانات القادمة من الجداول المرتبطة بأمان
            const stuObj = Array.isArray(a.students) ? a.students[0] : a.students;
            const userObj = Array.isArray(stuObj?.users) ? stuObj.users[0] : stuObj?.users;
            const secObj = Array.isArray(a.sections) ? a.sections[0] : a.sections;
            const classObj = Array.isArray(secObj?.classes) ? secObj.classes[0] : secObj?.classes;
            
            studentAbsences.set(sid, {
              id: sid,
              name: userObj?.full_name || 'طالب غير معروف',
              className: `${classObj?.name || 'صف غير محدد'} - ${secObj?.name || ''}`,
              count: 0
            });
          }
          studentAbsences.get(sid).count++;
        });

        // تصفية الطلاب الذين لديهم 5 غيابات أو أكثر وترتيبهم
        const atRisk = Array.from(studentAbsences.values())
                            .filter((s: any) => s.count >= 5)
                            .sort((a: any, b: any) => b.count - a.count);
        
        setStudents(atRisk);
        setFilteredStudents(atRisk);
      }
    } catch (error) {
      console.error('Error fetching warnings:', error);
    } finally {
      setLoading(false);
    }
  }, [user, authRole]);

  useEffect(() => {
    fetchAtRiskStudents();
  }, [fetchAtRiskStudents]);

  // البحث والتصفية
  useEffect(() => {
    const results = students.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.className.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredStudents(results);
  }, [searchTerm, students]);

  // دالة إبلاغ الإدارة (تقوم بإرسال رسالة آلية للنظام)
  const handleNotifyAdmin = async () => {
    if (!user?.id || students.length === 0) return;
    setIsSending(true);

    try {
      // 🚀 هنا نستخدم جدول messages لإرسال بلاغ للإدارة (تأكد من وجود جدول messages في قاعدة بياناتك)
      // إذا كان لديك جدول مخصص للإنذارات، يمكنك تغييره هنا
      const reportContent = `تقرير آلي: يوجد ${students.length} طلاب تجاوزوا حد الغياب المسموح به (5 حصص فأكثر) في فصولي الدراسية. يرجى مراجعة لوحة تحكم الإدارة لاتخاذ الإجراءات اللازمة.`;
      
      const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: null, // نفترض أن null أو ID معين يعني (موجه للإدارة العامة)
        subject: '🔴 إنذار غياب: تقرير تجاوز نسب المواظبة',
        content: reportContent,
        is_read: false
      });

      if (error) throw error;

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (error) {
      console.error('Error sending report to admin:', error);
      alert('حدث خطأ أثناء إرسال التقرير للإدارة.');
    } finally {
      setIsSending(false);
    }
  };

  // دالة الطباعة (تستخدم الـ Print Stylesheet لإنتاج PDF باللغة العربية بدقة ممتازة)
  const handlePrintPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-rose-600 border-t-transparent"></div>
          <p className="text-slate-500 font-bold animate-pulse tracking-widest">جاري سحب تقارير المواظبة...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 🚀 CSS خاص لطباعة الجداول كملف PDF بشكل احترافي مع دعم كامل للعربية */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .no-print, nav, header, footer, button { display: none !important; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area { position: absolute; left: 0; top: 0; width: 100%; direction: rtl; padding: 20px; background: white; }
          .print-header { display: flex !important; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #000; padding: 12px; text-align: right; font-size: 14px; }
          th { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; }
          .print-footer { display: block !important; margin-top: 50px; text-align: center; }
          @page { margin: 1cm; size: A4 portrait; }
        }
      `}} />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-cairo space-y-6 pb-20"
        dir="rtl"
      >
        <div className="no-print mb-4">
          <Link href="/dashboard/teacher" className="flex items-center gap-2 text-slate-500 hover:text-rose-600 font-bold bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-slate-100 transition-all w-fit group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> العودة للوحة التحكم
          </Link>
        </div>

        {/* 🚀 Header Section */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-rose-600 via-red-600 to-rose-800 p-8 sm:p-10 text-white shadow-xl shadow-rose-200/50 no-print border border-rose-500/50">
          <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-10 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl shadow-inner border border-white/20">
                <ShieldAlert className="h-10 w-10 text-yellow-300 animate-pulse" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black mb-2 tracking-tight">إدارة الإنذارات وقوائم الحرمان</h1>
                <p className="text-rose-100 font-bold max-w-xl text-sm leading-relaxed">
                  قائمة مفصلة بأسماء الطلاب الذين تجاوزوا الحد المسموح به للغياب (5 حصص فأكثر). يمكنك تصدير القائمة أو إرسال بلاغ فوري للإدارة.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 shrink-0 mt-4 md:mt-0">
              <button 
                onClick={handlePrintPDF}
                className="flex items-center justify-center gap-2 bg-white text-rose-700 px-6 py-3.5 rounded-xl font-black hover:bg-rose-50 transition-colors shadow-lg active:scale-95 border border-rose-100"
              >
                <Download className="w-5 h-5" /> تصدير PDF
              </button>
              <button 
                onClick={handleNotifyAdmin}
                disabled={isSending || students.length === 0}
                className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-black transition-all shadow-lg border border-transparent ${
                  isSending || students.length === 0 ? 'bg-white/20 text-white/50 cursor-not-allowed' : 'bg-rose-900 text-white hover:bg-rose-950 hover:border-rose-500 active:scale-95'
                }`}
              >
                {isSending ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  <Send className="w-5 h-5" />
                )}
                إبلاغ الإدارة
              </button>
            </div>
          </div>
        </div>

        {/* 🚀 إشعار النجاح */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-center gap-3 text-emerald-700 shadow-sm no-print"
            >
              <CheckCircle2 className="w-6 h-6" />
              <span className="font-black">تم إرسال التقرير إلى الإدارة بنجاح! سيتم المتابعة من قبل شؤون الطلاب.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🚀 Main Content */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden no-print">
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <FileText className="w-6 h-6 text-rose-600" />
              سجل الطلاب المنذرين ({students.length})
            </h2>
            
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="ابحث عن طالب أو صف..."
                className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-bold text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto p-4 md:p-6 custom-scrollbar">
            {filteredStudents.length > 0 ? (
              <table className="w-full text-sm text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="p-4 text-slate-600 font-black border-b border-slate-200 rounded-tr-xl">م</th>
                    <th className="p-4 text-slate-600 font-black border-b border-slate-200">اسم الطالب</th>
                    <th className="p-4 text-slate-600 font-black border-b border-slate-200">الصف والشعبة</th>
                    <th className="p-4 text-slate-600 font-black border-b border-slate-200 text-center">إجمالي الغياب</th>
                    <th className="p-4 text-slate-600 font-black border-b border-slate-200 text-center rounded-tl-xl">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student, idx) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-500 w-12 text-center">{idx + 1}</td>
                      <td className="p-4 font-black text-slate-800">{student.name}</td>
                      <td className="p-4 font-bold text-slate-600">{student.className}</td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center justify-center w-10 h-10 bg-rose-50 text-rose-600 font-black text-lg rounded-xl border border-rose-100 shadow-sm">
                          {student.count}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black border ${
                          student.count >= 10 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                        }`}>
                          <AlertTriangle className="w-4 h-4" />
                          {student.count >= 10 ? 'حرمان من المادة' : 'إنذار نهائي'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">لا يوجد طلاب متجاوزين</h3>
                <p className="text-slate-500 font-bold">جميع الطلاب ضمن نسبة المواظبة المسموحة.</p>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 🖨️ منطقة الطباعة الخفية (تظهر فقط عند الضغط على PDF/Print عبر CSS) */}
        {/* ========================================================================= */}
        <div id="printable-area" className="hidden print:block">
          <div className="print-header">
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 5px 0' }}>مدرسة الرفعة النموذجية</h1>
              <p style={{ margin: 0, color: '#666' }}>تقرير تجاوز نسب المواظبة (غياب الحصص)</p>
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>التاريخ: {format(new Date(), 'yyyy/MM/dd', { locale: arSA })}</p>
              <p style={{ margin: 0, color: '#666' }}>طُبع بواسطة النظام الآلي</p>
            </div>
          </div>

          <h2 style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
            قائمة الطلاب المنذرين لتجاوز 5 حصص غياب فأكثر
          </h2>

          <table>
            <thead>
              <tr>
                <th style={{ width: '5%' }}>م</th>
                <th style={{ width: '40%' }}>اسم الطالب</th>
                <th style={{ width: '30%' }}>الصف والشعبة</th>
                <th style={{ width: '15%' }}>الحصص</th>
                <th style={{ width: '10%' }}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, idx) => (
                <tr key={student.id}>
                  <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                  <td>{student.name}</td>
                  <td>{student.className}</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{student.count}</td>
                  <td style={{ textAlign: 'center' }}>{student.count >= 10 ? 'حرمان' : 'إنذار'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="print-footer hidden">
            <table style={{ width: '100%', border: 'none', marginTop: '50px' }}>
              <tbody>
                <tr style={{ border: 'none' }}>
                  <td style={{ border: 'none', textAlign: 'center', width: '33%' }}>
                    <strong>توقيع المعلم</strong><br/><br/>__________________
                  </td>
                  <td style={{ border: 'none', textAlign: 'center', width: '33%' }}>
                    <strong>شؤون الطلاب</strong><br/><br/>__________________
                  </td>
                  <td style={{ border: 'none', textAlign: 'center', width: '33%' }}>
                    <strong>مدير المدرسة</strong><br/><br/>__________________
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </>
  );
}


