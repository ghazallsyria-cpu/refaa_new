
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, ShieldAlert, AlertTriangle, Printer, 
  Send, Search, Download, CheckCircle2, FileText, Filter,
  User, GraduationCap, CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface AtRiskStudent {
  id: string;
  name: string;
  className: string;
  sectionId: string;
  count: number;
}

export default function TeacherWarningsPage() {
  const { user, authRole } = useAuth();
  const [students, setStudents] = useState<AtRiskStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // جلب البيانات
  const fetchAtRiskStudents = useCallback(async () => {
    if (!user?.id || authRole !== 'teacher') return;
    
    try {
      setLoading(true);
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

        // قاعدة الـ 5 حصص: نظهر فقط من لديهم حصة واحدة فأكثر (أو نفلترهم بالـ 5)
        // سنظهر من لديهم 5 حصص فأكثر كما طلبت في البداية
        const atRisk = Array.from(studentMap.values())
                            .filter((s: any) => s.count >= 5)
                            .sort((a: any, b: any) => b.count - a.count);
        
        setStudents(atRisk);
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

  // قائمة الفصول المتاحة للفلترة
  const sectionsList = useMemo(() => {
    const list = students.map(s => ({ id: s.sectionId, name: s.className }));
    const unique = Array.from(new Map(list.map(item => [item.id, item])).values());
    return unique;
  }, [students]);

  // الطلاب المفلترين
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSection = selectedSection === 'all' || s.sectionId === selectedSection;
      return matchesSearch && matchesSection;
    });
  }, [searchTerm, selectedSection, students]);

  // دالة إبلاغ الإدارة بتحديث ذكي
  const handleNotifyAdmin = async () => {
    if (!user?.id || filteredStudents.length === 0) return;
    setIsSending(true);

    try {
      // 1. البحث عن ID لأحد المدراء (Admin) لإرسال الرسالة له
      const { data: adminUser } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .single();

      const reportDetails = filteredStudents.map(s => 
        `- ${s.name} (${s.className}): ${s.count} حصص غياب ≈ ${Math.floor(s.count / 5)} أيام.`
      ).join('\n');

      const reportContent = `الأخوة في الإدارة الموقرة،\nنحيطكم علماً بوجود ${filteredStudents.length} طلاب تجاوزوا حد الغياب في حصصي الدراسية، وإليكم التفاصيل:\n\n${reportDetails}\n\nيرجى اتخاذ اللازم حسب مصلحة الطالب ونظام المدرسة.`;
      
      const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: adminUser?.id || null, // إذا لم نجد أدمن محدد ترسل كبلاغ عام
        subject: '🔴 تقرير تجاوز حصص غياب (رصد آلي)',
        content: reportContent,
        is_read: false
      });

      if (error) throw error;

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (error) {
      console.error('Error reporting to admin:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handlePrintPDF = () => window.print();

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .no-print { display: none !important; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area { 
            position: absolute; left: 0; top: 0; width: 100%; 
            direction: rtl; padding: 40px; background: white; 
          }
          .print-header { 
            text-align: center; border-bottom: 3px double #000; 
            margin-bottom: 30px; padding-bottom: 10px; 
          }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #000; padding: 10px; text-align: right; }
          th { background-color: #f0f0f0 !important; font-weight: bold; }
          .footer-section { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr 1fr; text-align: center; }
          @page { size: A4; margin: 0; }
        }
      `}} />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto px-4 py-8 font-cairo space-y-6 pb-20">
        
        <div className="no-print flex justify-between items-center">
          <Link href="/dashboard/teacher" className="flex items-center gap-2 text-slate-500 hover:text-rose-600 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 transition-all">
            <ArrowLeft className="w-4 h-4" /> العودة
          </Link>
          <div className="flex gap-3">
             <button onClick={handlePrintPDF} className="flex items-center gap-2 bg-white text-slate-700 px-5 py-2.5 rounded-xl font-black shadow-sm border border-slate-200 hover:bg-slate-50 transition-all active:scale-95">
                <Printer className="w-5 h-5 text-rose-600" /> طباعة التقرير
             </button>
             <button onClick={handleNotifyAdmin} disabled={isSending || filteredStudents.length === 0} className="flex items-center gap-2 bg-rose-600 text-white px-5 py-2.5 rounded-xl font-black shadow-lg hover:bg-rose-700 transition-all active:scale-95 disabled:opacity-50">
                <Send className="w-4 h-4" /> {isSending ? 'جاري الإرسال...' : 'إرسال للإدارة'}
             </button>
          </div>
        </div>

        {/* Header Dashboard */}
        <div className="bg-gradient-to-br from-slate-900 to-rose-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl no-print">
            <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 text-xs mb-4">
                    <ShieldAlert className="w-4 h-4 text-yellow-400" />
                    <span className="font-bold">نظام رصد الموواظبة الذكي</span>
                </div>
                <h1 className="text-3xl font-black mb-2">كشف الطلاب المتجاوزين (قاعدة 5 حصص)</h1>
                <p className="text-rose-100 max-w-2xl text-sm font-bold">
                    يتم احتساب كل 5 حصص غياب كـ "يوم غياب كامل". القائمة أدناه تستعرض الطلاب الذين أتموا يوماً دراسياً واحداً أو أكثر من الغياب في حصصك.
                </p>
            </div>
            <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-rose-500/20 blur-[100px] rounded-full"></div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 no-print">
            <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                    type="text" 
                    placeholder="ابحث باسم الطالب..." 
                    className="w-full pr-10 pl-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-rose-500 font-bold"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-3">
                <Filter className="text-slate-400 w-5 h-5" />
                <select 
                    className="bg-slate-50 border-none rounded-xl py-3 px-8 font-black text-slate-700 focus:ring-2 focus:ring-rose-500"
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                >
                    <option value="all">جميع الفصول</option>
                    {sectionsList.map(sec => (
                        <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))}
                </select>
            </div>
        </div>

        {/* Table Content */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden no-print">
            <table className="w-full text-right">
                <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                        <th className="p-5 font-black text-slate-600">الطالب</th>
                        <th className="p-5 font-black text-slate-600">الفصل الدراسي</th>
                        <th className="p-5 font-black text-slate-600 text-center">إجمالي الحصص</th>
                        <th className="p-5 font-black text-slate-600 text-center">الأيام المعادلة</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {filteredStudents.map(student => (
                        <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600"><User className="w-5 h-5" /></div>
                                    <span className="font-black text-slate-800">{student.name}</span>
                                </div>
                            </td>
                            <td className="p-5 font-bold text-slate-500">{student.className}</td>
                            <td className="p-5 text-center">
                                <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg font-black border border-amber-100">
                                    {student.count} حصة
                                </span>
                            </td>
                            <td className="p-5 text-center">
                                <span className="px-4 py-2 bg-rose-600 text-white rounded-xl font-black shadow-md inline-flex items-center gap-2">
                                    <CalendarDays className="w-4 h-4" />
                                    {Math.floor(student.count / 5)} أيام غياب
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {filteredStudents.length === 0 && (
                <div className="py-20 text-center text-slate-400 font-bold">لا توجد بيانات مطابقة للبحث</div>
            )}
        </div>

        {/* 🖨️ منطقة الطباعة (التقرير الرسمي) */}
        <div id="printable-area" className="hidden print:block">
            <div className="print-header">
                <h1 style={{fontSize: '28px', marginBottom: '5px'}}>مدرسة الرفعة النموذجية</h1>
                <h2 style={{fontSize: '18px', color: '#444'}}>تقرير تجاوز نصاب غياب الحصص الرسمي</h2>
                <p>تاريخ استخراج التقرير: {format(new Date(), 'yyyy/MM/dd', { locale: arSA })}</p>
            </div>

            <div style={{marginBottom: '20px', fontWeight: 'bold'}}>
                اسم المعلم: {teacherData?.users?.full_name || '................................'}
            </div>

            <table>
                <thead>
                    <tr>
                        <th>م</th>
                        <th>اسم الطالب</th>
                        <th>الصف والشعبة</th>
                        <th style={{textAlign: 'center'}}>عدد الحصص</th>
                        <th style={{textAlign: 'center'}}>الأيام المعادلة (حصة/5)</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredStudents.map((s, i) => (
                        <tr key={s.id}>
                            <td>{i + 1}</td>
                            <td style={{fontWeight: 'bold'}}>{s.name}</td>
                            <td>{s.className}</td>
                            <td style={{textAlign: 'center'}}>{s.count}</td>
                            <td style={{textAlign: 'center', fontWeight: 'bold'}}>{Math.floor(s.count / 5)} أيام</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="footer-section">
                <div>
                    <p>توقيع المعلم</p>
                    <br />.........................
                </div>
                <div>
                    <p>ختم شؤون الطلاب</p>
                    <br />.........................
                </div>
                <div>
                    <p>يعتمد: مدير المدرسة</p>
                    <br />.........................
                </div>
            </div>
            
            <p style={{marginTop: '40px', fontSize: '12px', textAlign: 'center', color: '#666'}}>
                * ملاحظة: يتم احتساب يوم غياب كامل لكل 5 حصص غياب مسجلة في النظام.
            </p>
        </div>

        <AnimatePresence>
          {showSuccess && (
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3 font-black">
                <CheckCircle2 className="w-6 h-6" />
                تم إرسال التقرير للإدارة بنجاح
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </>
  );
}


