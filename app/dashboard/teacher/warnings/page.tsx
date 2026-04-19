/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Printer, Send, Search, Filter,
  User, GraduationCap, CalendarDays, ClipboardList, BookOpen, CheckCircle2, Loader2, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface StudentAbsence {
  id: string;
  name: string;
  className: string;
  sectionId: string;
  count: number;
}

export default function TeacherAbsenceEquivalencePage() {
  const { user, authRole, isChecking } = useAuth() as any; 
  
  const [students, setStudents] = useState<StudentAbsence[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [teacherName, setTeacherName] = useState('');

  // 1. جلب البيانات وحساب الحصص (Optimized Fetch)
  const fetchAbsences = useCallback(async () => {
    if (!user?.id || (authRole !== 'teacher' && authRole !== 'admin' && authRole !== 'management')) return;
    
    try {
      setLoading(true);
      
      const { data: teacherUser } = await supabase.from('users').select('full_name').eq('id', user.id).single();
      if (teacherUser) setTeacherName(teacherUser.full_name);

      // 🚀 استعلام موجه ودقيق يجلب فقط حصص الغياب الخاصة بهذا المعلم
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

        // 🚀 فلترة سريعة في المتصفح: فقط من تجاوز 5 حصص (يوم فأكثر)
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
    if (!isChecking) fetchAbsences();
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
      const { data: admins, error: adminError } = await supabase
        .from('users')
        .select('id')
        .in('role', ['admin', 'management'])
        .limit(1);

      if (adminError) throw adminError;
      const targetAdminId = admins?.[0]?.id;

      if (!targetAdminId) {
        alert("تنبيه: لم يتم العثور على حساب إداري في النظام لاستلام الرسالة.");
        setIsSending(false); return;
      }

      const totalMissedPeriods = filteredStudents.reduce((acc, s) => acc + s.count, 0);
      const highestAbsence = Math.max(...filteredStudents.map(s => s.count));

      const reportContent = `السادة في إدارة المدرسة الموقرة،\n\nنحيطكم علماً بأنه تم تسجيل تجاوزات للائحة المواظبة في حصصي الدراسية (كل 5 حصص = 1 يوم غياب).\n\n📊 ملخص الرصد:\n- الطلاب المتجاوزين: ${filteredStudents.length} طلاب.\n- إجمالي الحصص المهدرة: ${totalMissedPeriods} حصة.\n- أعلى معدل غياب مسجل: ${highestAbsence} حصص.\n\nيرجى التفضل بإصدار الإشعارات الرسمية لأولياء الأمور.\n\nمعلم المادة: أ. ${teacherName}`;
      
      const { error: msgError } = await supabase.from('messages').insert({
        sender_id: user.id, receiver_id: targetAdminId,
        subject: '🔴 إشعار إداري: تجاوز حد الغياب المسموح للطلاب',
        content: reportContent, is_read: false
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

  // 🚀 شاشات الحماية والتحميل
  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#090b14] font-cairo">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-14 h-14 text-rose-500 animate-spin drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]" />
          <p className="text-slate-400 font-bold animate-pulse tracking-widest">جاري التحقق وتأمين الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (authRole !== 'teacher' && authRole !== 'admin' && authRole !== 'management') {
    return <div className="p-10 text-center font-bold text-rose-500 min-h-[80vh] flex items-center justify-center bg-[#090b14] font-cairo">هذه الصفحة مخصصة للمعلمين وإدارة المدرسة فقط.</div>;
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-[#090b14] font-cairo">
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-rose-500/20 border-t-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.5)]"></div>
          <p className="text-slate-400 font-bold animate-pulse tracking-widest">جاري سحب وتحليل بيانات الإنذارات...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 🚀 CSS طباعة سليم ומضمون 100% (يعكس الألوان للورق الأبيض) */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print, nav, header, footer, button, input, select { display: none !important; }
          body, .print-container { background: white !important; color: black !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          * { text-shadow: none !important; box-shadow: none !important; }
          @page { size: A4 portrait; margin: 15mm; }
          .print-container { width: 100% !important; margin: 0 !important; padding: 0 !important; border: none !important; }
          .print-only-header { display: block !important; margin-bottom: 30px; text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
          table { width: 100% !important; border-collapse: collapse !important; color: black !important; }
          table th { background-color: #f1f5f9 !important; color: #000 !important; border: 1px solid #000 !important; font-weight: bold !important; padding: 10px !important; }
          table td { border: 1px solid #000 !important; padding: 8px !important; color: black !important; }
          .print-bg-override { background: transparent !important; color: black !important; border: none !important; }
          .print-only-footer { display: flex !important; justify-content: space-between; margin-top: 50px; text-align: center; font-weight: bold; color: black !important; }
        }
      `}} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen relative bg-[#090b14] text-slate-200 pb-32 overflow-x-hidden font-cairo print-container" dir="rtl">
        
        {/* 🚀 الخلفية المضيئة للوضع الزجاجي (تختفي في الطباعة) */}
        <div className="fixed top-1/4 right-[-10%] w-[500px] h-[500px] bg-rose-600/15 rounded-full blur-[140px] pointer-events-none z-0 no-print" />
        <div className="fixed bottom-0 left-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none z-0 no-print" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8 relative z-10 print:p-0 print:space-y-4">
          
          {/* أزرار التحكم العلوية */}
          <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <Link href="/dashboard/teacher" className="flex items-center gap-2 text-slate-400 hover:text-rose-400 font-bold bg-[#131836]/60 backdrop-blur-xl px-5 py-2.5 rounded-2xl border border-white/5 transition-all w-fit group text-sm sm:text-base shadow-lg">
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> العودة للوحة التحكم
            </Link>
            <div className="flex gap-3 w-full sm:w-auto">
               <button onClick={handlePrint} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white px-6 py-2.5 rounded-xl font-black shadow-sm border border-white/10 transition-all active:scale-95">
                  <Printer className="w-5 h-5 text-slate-300" /> تصدير PDF
               </button>
               <button onClick={handleNotifyAdmin} disabled={isSending || filteredStudents.length === 0} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-rose-600 text-white px-6 py-2.5 rounded-xl font-black shadow-[0_0_20px_rgba(225,29,72,0.4)] hover:bg-rose-500 transition-all active:scale-95 disabled:opacity-50 min-w-[160px]">
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />} 
                  {isSending ? 'جاري الإرسال...' : 'إرسال للإدارة'}
               </button>
            </div>
          </div>

          {/* 🚀 الهيدر الفخم (Banner) */}
          <div className="relative overflow-hidden rounded-[2.5rem] sm:rounded-[3rem] bg-gradient-to-r from-[#1a0f14] via-[#2d121a] to-[#140b0f] border border-rose-500/20 p-8 sm:p-12 text-white shadow-[0_0_40px_rgba(225,29,72,0.2)] no-print">
            <div className="relative z-10 flex flex-col items-center sm:items-start text-center sm:text-right">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-xs font-black uppercase tracking-widest mb-4 backdrop-blur-sm shadow-sm text-rose-400">
                    <ShieldAlert className="w-4 h-4" /> سجل الإنذارات والمواظبة
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4 tracking-tight leading-tight drop-shadow-md text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-red-400">
                  كشف معادلة غياب الطلاب
                </h1>
                <p className="text-rose-200/80 max-w-2xl text-sm sm:text-base font-bold leading-relaxed">
                    يعرض هذا السجل إحصائية دقيقة لعدد حصص الغياب لكل طالب وما يعادلها بالأيام الكاملة في حصصك فقط، بناءً على النظام المعتمد (5 حصص = 1 يوم غياب).
                </p>
            </div>
            <div className="absolute left-0 top-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
            <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-rose-600/20 blur-[80px] rounded-full mix-blend-overlay pointer-events-none"></div>
          </div>

          {/* 🖨️ ترويسة الطباعة (تظهر في الورق فقط) */}
          <div className="print-only-header hidden text-black">
              <h1 className="text-2xl font-black mb-2 text-black">مدرسة الرفعة النموذجية</h1>
              <h2 className="text-lg text-slate-800 mb-2 font-bold text-black">كشف معادلة غياب الطلاب المعتمد</h2>
              <div className="flex justify-between text-sm mt-4 font-bold border-t border-black pt-2 text-black">
                 <span>معلم المادة: {teacherName || '................'}</span>
                 <span>تاريخ التقرير: {format(new Date(), 'yyyy/MM/dd', { locale: arSA })}</span>
              </div>
          </div>

          {/* 🚀 أدوات الفلترة والبحث */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print bg-[#131836]/60 backdrop-blur-xl p-5 rounded-[2rem] border border-white/10 shadow-lg">
              <div className="md:col-span-2 relative group">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-rose-400 transition-colors" />
                  <input 
                      type="text" 
                      placeholder="ابحث باسم الطالب..." 
                      className="w-full pr-12 pl-4 py-3.5 bg-[#090b14]/80 rounded-2xl border border-white/10 focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 transition-all font-bold text-white shadow-inner outline-none placeholder:text-slate-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
              <div className="md:col-span-2 flex items-center gap-3 bg-[#090b14]/80 px-2 py-1.5 rounded-2xl border border-white/10 shadow-inner focus-within:border-rose-500/50 focus-within:ring-2 focus-within:ring-rose-500/20 transition-all">
                  <div className="p-2.5 bg-[#131836] rounded-xl text-rose-400 border border-white/5"><Filter className="w-5 h-5" /></div>
                  <select 
                      className="flex-1 bg-transparent border-none focus:ring-0 font-bold text-white cursor-pointer outline-none appearance-none [&>option]:bg-[#131836]"
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

          {/* 🚀 الجدول الأساسي (يظهر في الشاشة والطباعة) */}
          <div className="bg-[#131836]/60 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden print:border-none print:shadow-none print:bg-transparent print:rounded-none">
              <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                      <thead className="bg-[#090b14]/50 border-b border-white/5 print:bg-slate-100 print:border-black">
                          <tr>
                              <th className="p-5 font-black text-slate-400 text-xs uppercase tracking-widest print:text-black">الطالب</th>
                              <th className="p-5 font-black text-slate-400 text-xs uppercase tracking-widest print:text-black">الصف والشعبة</th>
                              <th className="p-5 font-black text-slate-400 text-xs uppercase tracking-widest text-center print:text-black">إجمالي الحصص</th>
                              <th className="p-5 font-black text-rose-400 text-xs uppercase tracking-widest text-center print:text-black">الأيام المعادلة (حصة/5)</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 print:divide-black">
                          {filteredStudents.map(student => (
                              <tr key={student.id} className="hover:bg-white/[0.02] transition-colors print:bg-transparent">
                                  <td className="p-5 print:p-2">
                                      <div className="flex items-center gap-4">
                                          <div className="w-12 h-12 rounded-2xl bg-[#090b14] flex items-center justify-center text-rose-400 no-print shrink-0 font-black shadow-inner border border-white/5">
                                              {student.name.charAt(0)}
                                          </div>
                                          <div>
                                              <p className="font-black text-white text-sm sm:text-base print:text-black">{student.name}</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="p-5 print:p-2">
                                      <span className="bg-[#090b14]/50 text-slate-300 font-bold text-xs px-3 py-1.5 rounded-lg border border-white/5 print-bg-override">
                                        {student.className}
                                      </span>
                                  </td>
                                  <td className="p-5 text-center font-black text-white print:p-2">
                                      <div className="inline-flex items-center justify-center bg-[#090b14]/80 border border-white/10 w-12 h-12 rounded-xl shadow-inner print-bg-override">
                                        {student.count}
                                      </div>
                                  </td>
                                  <td className="p-5 text-center print:p-2">
                                      <div className="inline-flex flex-col items-center justify-center bg-rose-500/10 text-rose-400 rounded-xl px-6 py-2 border border-rose-500/20 shadow-inner min-w-[100px] print-bg-override">
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
                  <div className="py-20 text-center bg-[#090b14]/30 no-print border-t border-white/5">
                      <div className="w-16 h-16 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-4 border border-white/10">
                          <ClipboardList className="w-8 h-8 text-slate-500" />
                      </div>
                      <h3 className="text-lg font-black text-white">لا توجد سجلات مطابقة</h3>
                      <p className="text-sm text-slate-400 font-medium mt-1">لم يتم العثور على طلاب تجاوزوا 5 حصص ضمن معايير البحث الحالية.</p>
                  </div>
              )}
          </div>

          {/* 🖨️ تذييل الطباعة (يظهر فقط في الورق) */}
          <div className="print-only-footer hidden">
              <div>
                  <p>توقيع معلم المادة</p>
                  <p className="mt-8 text-black">........................</p>
              </div>
              <div>
                  <p>اعتماد إدارة المدرسة</p>
                  <p className="mt-8 text-black">........................</p>
              </div>
          </div>

          {/* إشعار نجاح الإرسال المضيء */}
          <AnimatePresence>
            {showSuccess && (
              <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-[#131836]/95 backdrop-blur-2xl text-white px-8 py-4 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 flex items-center gap-4 border border-white/20 no-print">
                  <div className="p-2 bg-emerald-500 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.5)] border border-emerald-400">
                      <CheckCircle2 className="w-6 h-6 text-slate-900" />
                  </div>
                  <div>
                      <p className="font-black text-sm text-emerald-400">تم إرسال الإشعار للإدارة بنجاح</p>
                      <p className="text-xs text-slate-300 font-bold mt-0.5">سيصل الملخص إلى صندوق رسائل المدير فوراً.</p>
                  </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </motion.div>
    </>
  );
}
