'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/auth-context'; // 🚀 استيراد جدار الحماية
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Printer, Send, Search, Filter,
  User, GraduationCap, CalendarDays, ClipboardList, BookOpen, CheckCircle2, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface StudentAbsence {
  id: string;
  name: string;
  className: string;
  sectionId: string;
  count: number;
}

export default function TeacherAbsenceEquivalencePage() {
  const { user, authRole, isChecking } = useAuth() as any; // 🚀 تفعيل الحماية
  
  const [students, setStudents] = useState<StudentAbsence[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [teacherName, setTeacherName] = useState('');

  // 1. جلب البيانات وحساب الحصص
  const fetchAbsences = useCallback(async () => {
    // 🚀 منع جلب البيانات لغير المعلمين (أو الإدارة للمعاينة)
    if (!user?.id || (authRole !== 'teacher' && authRole !== 'admin' && authRole !== 'management')) return;
    
    try {
      setLoading(true);
      
      const { data: teacherUser } = await supabase.from('users').select('full_name').eq('id', user.id).single();
      if (teacherUser) setTeacherName(teacherUser.full_name);

      const { data: absences, error } = await supabase
        .from('attendance_records')
        .select('student_id, section_id, students(users(full_name)), sections(name, classes(name))')
        .eq('teacher_id', user.id)
        .eq('status', 'absent');

      if (error) throw error;

      if (absences) {
        const studentMap = new Map();
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
              count: 0
            });
          }
          studentMap.get(sid).count++;
        });

        // استخراج الطلاب الذين لديهم 5 حصص فأكثر (ما يعادل يوم غياب فأكثر)
        const validRecords = Array.from(studentMap.values())
                            .filter((s: any) => s.count >= 5)
                            .sort((a: any, b: any) => b.count - a.count);
        
        setStudents(validRecords);
      }
    } catch (error) {
      console.error('Error fetching absences:', error);
    } finally {
      setLoading(false);
    }
  }, [user, authRole]);

  useEffect(() => {
    // 🚀 لا نجلب البيانات إلا بعد التأكد التام من الجلسة
    if (!isChecking) {
      fetchAbsences();
    }
  }, [fetchAbsences, isChecking]);

  // 2. قوائم الفلترة
  const sectionsList = useMemo(() => {
    const list = students.map(s => ({ id: s.sectionId, name: s.className }));
    const unique = Array.from(new Map(list.map(item => [item.id, item])).values());
    return unique;
  }, [students]);

  // 3. تطبيق البحث والفلترة
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSection = selectedSection === 'all' || s.sectionId === selectedSection;
      return matchesSearch && matchesSection;
    });
  }, [searchTerm, selectedSection, students]);

  // 4. إبلاغ الإدارة بتلخيص ذكي
  const handleNotifyAdmin = async () => {
    if (!user?.id || filteredStudents.length === 0) return;
    setIsSending(true);

    try {
      // البحث عن أي مسؤول (admin أو management)
      const { data: admins, error: adminError } = await supabase
        .from('users')
        .select('id')
        .in('role', ['admin', 'management'])
        .limit(1);

      if (adminError) throw adminError;

      const targetAdminId = admins?.[0]?.id;

      if (!targetAdminId) {
        alert("تنبيه: لم يتم العثور على حساب إداري في النظام لاستلام الرسالة. يرجى مراجعة الصلاحيات.");
        setIsSending(false);
        return;
      }

      // 🚀 إعداد إحصائيات ذكية للإدارة بدلاً من سرد الأسماء
      const totalMissedPeriods = filteredStudents.reduce((acc, s) => acc + s.count, 0);
      const highestAbsence = Math.max(...filteredStudents.map(s => s.count));

      const reportContent = `السادة في إدارة المدرسة الموقرة،\n\nنحيطكم علماً بأنه من خلال الرصد الدوري، تم تسجيل تجاوزات للائحة المواظبة في حصصي الدراسية (بواقع احتساب يوم غياب كامل لكل 5 حصص).\n\n📊 ملخص الرصد:\n- عدد الطلاب المتجاوزين للحد المسموح: ${filteredStudents.length} طلاب.\n- إجمالي الحصص المهدرة بالغياب لهؤلاء الفئة: ${totalMissedPeriods} حصة.\n- أعلى معدل غياب مسجل لطالب واحد: ${highestAbsence} حصص.\n\nيرجى التفضل بالدخول إلى (المركز المجمع للإنذارات) من لوحة الإدارة للاطلاع على كشف الأسماء التفصيلي وإصدار الإشعارات الرسمية لأولياء الأمور.\n\nللاطلاع والمتابعة،،،\nمعلم المادة: أ. ${teacherName}`;
      
      const { error: msgError } = await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: targetAdminId,
        subject: '🔴 إشعار إداري: تجاوز حد الغياب المسموح للطلاب',
        content: reportContent,
        is_read: false
      });

      if (msgError) throw msgError;

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (error: any) {
      console.error('Error reporting to admin:', error);
      alert("حدث خطأ أثناء الإرسال: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const handlePrint = () => window.print();

  // 🚀 شاشة التحميل وحماية الوصول
  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-14 h-14 text-indigo-600 animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse tracking-widest">جاري التحقق وتأمين الصلاحيات...</p>
        </div>
      </div>
    );
  }

  // 🚀 منع المتطفلين (الطلاب/أولياء الأمور) من رؤية الصفحة
  if (authRole !== 'teacher' && authRole !== 'admin' && authRole !== 'management') {
    return <div className="p-10 text-center font-bold text-rose-600 min-h-[80vh] flex items-center justify-center">هذه الصفحة مخصصة للمعلمين وإدارة المدرسة فقط.</div>;
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-slate-500 font-bold animate-pulse tracking-widest">جاري سحب بيانات الإنذارات...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 🚀 CSS طباعة سليم ومضمون 100% */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* إخفاء العناصر غير الضرورية */
          .no-print, nav, header, footer, button, input, select { display: none !important; }
          
          /* إعدادات الصفحة للطباعة */
          body { background: white !important; -webkit-print-color-adjust: exact !important; }
          @page { size: A4; margin: 15mm; }
          
          /* ضبط عرض المحتوى الأساسي */
          .print-container { width: 100% !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: none !important; }
          
          /* إظهار ترويسة الطباعة الرسمية المخفية في وضع الشاشة */
          .print-only-header { display: block !important; margin-bottom: 30px; text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
          
          /* ضبط ألوان الجدول */
          table th { background-color: #f1f5f9 !important; color: #000 !important; border: 1px solid #cbd5e1 !important; }
          table td { border: 1px solid #cbd5e1 !important; }
          
          /* إظهار تذييل الطباعة */
          .print-only-footer { display: flex !important; justify-content: space-between; margin-top: 50px; text-align: center; font-weight: bold; }
        }
      `}} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto px-4 py-8 font-cairo space-y-6 pb-20 print-container" dir="rtl">
        
        <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Link href="/dashboard/teacher" className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold bg-white px-4 py-2.5 rounded-xl shadow-sm border border-slate-100 transition-all">
            <ArrowLeft className="w-5 h-5" /> العودة للوحة التحكم
          </Link>
          <div className="flex gap-2 w-full sm:w-auto">
             <button onClick={handlePrint} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-slate-700 px-6 py-2.5 rounded-xl font-black shadow-sm border border-slate-200 hover:bg-slate-50 transition-all active:scale-95">
                <Printer className="w-5 h-5 text-indigo-600" /> تصدير PDF
             </button>
             <button onClick={handleNotifyAdmin} disabled={isSending || filteredStudents.length === 0} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black shadow-md hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 min-w-[160px]">
                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />} 
                {isSending ? 'جاري الإرسال...' : 'إرسال للإدارة'}
             </button>
          </div>
        </div>

        {/* Banner (غير مرئي في الطباعة) */}
        <div className="bg-gradient-to-l from-indigo-900 to-slate-800 rounded-[2.5rem] p-8 sm:p-12 text-white relative overflow-hidden shadow-xl no-print">
            <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full border border-white/20 text-xs font-black uppercase tracking-widest mb-6 backdrop-blur-md">
                    <BookOpen className="w-4 h-4 text-indigo-300" /> سجل المواظبة
                </div>
                <h1 className="text-3xl sm:text-4xl font-black mb-4 tracking-tight leading-tight">كشف معادلة غياب الطلاب</h1>
                <p className="text-indigo-100 max-w-2xl text-base font-medium leading-relaxed">
                    يعرض هذا السجل إحصائية دقيقة لعدد حصص الغياب لكل طالب وما يعادلها بالأيام الكاملة، بناءً على النظام المعتمد (5 حصص = 1 يوم غياب).
                </p>
            </div>
            <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/20 blur-[80px] rounded-full mix-blend-overlay pointer-events-none"></div>
        </div>

        {/* 🖨️ ترويسة تظهر فقط عند الطباعة */}
        <div className="print-only-header hidden">
            <h1 className="text-2xl font-black mb-2">مدرسة الرفعة النموذجية</h1>
            <h2 className="text-lg text-slate-800 mb-2">كشف معادلة غياب الطلاب المعتمد</h2>
            <div className="flex justify-between text-sm mt-4 font-bold">
               <span>معلم المادة: {teacherName || '................'}</span>
               <span>تاريخ التقرير: {format(new Date(), 'yyyy/MM/dd', { locale: arSA })}</span>
            </div>
        </div>

        {/* Filters & Search (غير مرئي في الطباعة) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
            <div className="md:col-span-2 relative group">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-indigo-600 transition-colors" />
                <input 
                    type="text" 
                    placeholder="ابحث باسم الطالب..." 
                    className="w-full pr-12 pl-4 py-4 bg-white rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-slate-700 shadow-sm outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="md:col-span-2 flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400"><Filter className="w-5 h-5" /></div>
                <select 
                    className="flex-1 bg-transparent border-none focus:ring-0 font-black text-slate-700 cursor-pointer outline-none appearance-none"
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                >
                    <option value="all">عرض جميع الفصول</option>
                    {sectionsList.map(sec => (
                        <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))}
                </select>
            </div>
        </div>

        {/* Data Table (الجدول الأساسي للعرض والطباعة) */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="p-5 font-black text-slate-500 text-xs uppercase tracking-widest">الطالب</th>
                            <th className="p-5 font-black text-slate-500 text-xs uppercase tracking-widest">الصف والشعبة</th>
                            <th className="p-5 font-black text-slate-500 text-xs uppercase tracking-widest text-center">إجمالي الحصص</th>
                            <th className="p-5 font-black text-slate-500 text-xs uppercase tracking-widest text-center">الأيام المعادلة (حصة/5)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredStudents.map(student => (
                            <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 no-print shrink-0 font-black shadow-sm border border-indigo-100">
                                            {student.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 text-base">{student.name}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-5 text-slate-600 font-bold">
                                    <span className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">{student.className}</span>
                                </td>
                                <td className="p-5 text-center font-black text-slate-600">
                                    <div className="inline-flex items-center justify-center bg-slate-50 border border-slate-200 w-12 h-12 rounded-xl shadow-sm">
                                      {student.count}
                                    </div>
                                </td>
                                <td className="p-5 text-center">
                                    <div className="inline-flex flex-col items-center justify-center bg-rose-50 text-rose-800 rounded-xl px-6 py-2 border border-rose-200 shadow-sm min-w-[100px]">
                                        <span className="text-2xl font-black leading-none">{Math.floor(student.count / 5)}</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-70">يوم كامل</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {filteredStudents.length === 0 && (
                <div className="py-20 text-center bg-white no-print">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <ClipboardList className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-black text-slate-800">لا توجد سجلات مطابقة</h3>
                    <p className="text-sm text-slate-500 font-medium mt-1">لم يتم العثور على طلاب تجاوزوا 5 حصص ضمن معايير البحث الحالية.</p>
                </div>
            )}
        </div>

        {/* 🖨️ تذييل يظهر فقط عند الطباعة */}
        <div className="print-only-footer hidden">
            <div>
                <p>توقيع معلم المادة</p>
                <p className="mt-6 text-slate-400">........................</p>
            </div>
            <div>
                <p>اعتماد إدارة المدرسة</p>
                <p className="mt-6 text-slate-400">........................</p>
            </div>
        </div>

        {/* إشعار نجاح الإرسال */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-3xl shadow-2xl z-50 flex items-center gap-4 border border-slate-700 no-print">
                <div className="p-2 bg-emerald-500 rounded-xl shadow-inner">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                    <p className="font-black text-sm">تم إرسال الإشعار للإدارة بنجاح</p>
                    <p className="text-xs text-slate-400 font-medium">سيصل الملخص إلى صندوق رسائل المدير فوراً.</p>
                </div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </>
  );
}
