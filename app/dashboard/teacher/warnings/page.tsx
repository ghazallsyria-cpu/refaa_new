
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, ShieldAlert, AlertTriangle, Printer, 
  Send, Search, Download, CheckCircle2, FileText, Filter,
  User, GraduationCap, CalendarDays, ClipboardList
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
  const [teacherName, setTeacherName] = useState('');

  // 🚀 جلب البيانات الأساسية للطلاب المنذرين
  const fetchAtRiskStudents = useCallback(async () => {
    if (!user?.id || authRole !== 'teacher') return;
    
    try {
      setLoading(true);
      
      // جلب اسم المعلم الحالي
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

        // قاعدة الـ 5 حصص
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

  // 🚀 استخراج قائمة الفصول المتاحة للفلترة
  const sectionsList = useMemo(() => {
    const list = students.map(s => ({ id: s.sectionId, name: s.className }));
    const unique = Array.from(new Map(list.map(item => [item.id, item])).values());
    return unique;
  }, [students]);

  // 🚀 تصفية الطلاب بناءً على البحث والفلتر
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSection = selectedSection === 'all' || s.sectionId === selectedSection;
      return matchesSearch && matchesSection;
    });
  }, [searchTerm, selectedSection, students]);

  // 🚀 تفعيل إبلاغ الإدارة (إرسال رسالة رسمية لمدير النظام)
  const handleNotifyAdmin = async () => {
    if (!user?.id || filteredStudents.length === 0) return;
    setIsSending(true);

    try {
      // البحث عن أي مسؤول في النظام
      const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin').limit(1);
      const targetAdmin = admins?.[0]?.id;

      const reportDetails = filteredStudents.map(s => 
        `- ${s.name} (${s.className}): ${s.count} حصص غياب ≈ ${Math.floor(s.count / 5)} أيام.`
      ).join('\n');

      const reportContent = `السادة في إدارة شؤون الطلاب،\nيرجى العلم بأنني قمت برصد تجاوزات في نسب المواظبة للطلاب المذكورين أدناه في حصصي، حيث أتم كل منهم يوماً دراسياً كاملاً أو أكثر من الغياب (بناءً على قاعدة 5 حصص = 1 يوم):\n\n${reportDetails}\n\nيرجى اتخاذ اللازم.\n\nالمرسل: أ. ${teacherName}`;
      
      const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: targetAdmin, // إرسال لأول مسؤول أو كبلاغ عام
        subject: '🔴 بلاغ تجاوز نسب الغياب (رصد المعلم)',
        content: reportContent,
        is_read: false
      });

      if (error) throw error;

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (error) {
      console.error('Error reporting to admin:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      {/* 🚀 CSS الطباعة المتقدم: يحول الصفحة إلى تقرير رسمي A4 عند الطباعة */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .no-print { display: none !important; }
          #printable-report, #printable-report * { visibility: visible; }
          #printable-report { 
            position: absolute; left: 0; top: 0; width: 100%; 
            direction: rtl; padding: 40px; background: white; 
            font-family: 'Cairo', sans-serif;
          }
          .print-header { 
            text-align: center; border-bottom: 4px double #000; 
            margin-bottom: 30px; padding-bottom: 15px; 
          }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #000; padding: 12px; text-align: right; }
          th { background-color: #f5f5f5 !important; font-weight: bold; }
          .print-footer { margin-top: 80px; display: grid; grid-template-columns: 1fr 1fr; text-align: center; }
          @page { size: A4; margin: 1cm; }
        }
      `}} />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto px-4 py-8 font-cairo space-y-6 pb-20">
        
        <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Link href="/dashboard/teacher" className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 transition-all">
            <ArrowLeft className="w-4 h-4" /> العودة للوحة التحكم
          </Link>
          <div className="flex gap-2 w-full sm:w-auto">
             <button onClick={handlePrint} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-slate-700 px-6 py-3 rounded-xl font-black shadow-sm border border-slate-200 hover:bg-slate-50 transition-all active:scale-95">
                <Printer className="w-5 h-5 text-indigo-600" /> طباعة التقرير
             </button>
             <button onClick={handleNotifyAdmin} disabled={isSending || filteredStudents.length === 0} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-rose-600 text-white px-6 py-3 rounded-xl font-black shadow-lg hover:bg-rose-700 transition-all active:scale-95 disabled:opacity-50">
                <Send className="w-4 h-4" /> {isSending ? 'جاري الإبلاغ...' : 'إبلاغ الإدارة'}
             </button>
          </div>
        </div>

        {/* Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-rose-900 to-rose-950 rounded-[2.5rem] p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl no-print">
            <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full border border-white/20 text-xs font-black uppercase tracking-widest mb-6 backdrop-blur-md">
                    <ShieldAlert className="w-4 h-4 text-yellow-400" /> مصفاة المواظبة الذكية
                </div>
                <h1 className="text-3xl sm:text-5xl font-black mb-4 tracking-tight">إدارة إنذارات غياب الحصص</h1>
                <p className="text-rose-100 max-w-2xl text-base sm:text-lg font-bold leading-relaxed">
                    نظام الحصر الآلي للطلاب الذين تجاوزوا حد الـ 5 حصص غياب. 
                    <span className="block mt-2 text-yellow-300">كل 5 حصص غياب في سجلك = 1 يوم غياب كامل مسجل على الطالب.</span>
                </p>
            </div>
            <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-white/5 to-transparent skew-x-12 translate-x-1/2"></div>
        </div>

        {/* Filters & Search */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
            <div className="md:col-span-2 relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                    type="text" 
                    placeholder="ابحث باسم الطالب..." 
                    className="w-full pr-12 pl-4 py-4 bg-white rounded-2xl border-2 border-slate-100 focus:border-rose-500 focus:ring-0 transition-all font-bold text-slate-700 shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="md:col-span-2 flex items-center gap-3 bg-white p-2 rounded-2xl border-2 border-slate-100 shadow-sm">
                <div className="p-2 bg-slate-50 rounded-xl text-slate-400"><Filter className="w-5 h-5" /></div>
                <select 
                    className="flex-1 bg-transparent border-none focus:ring-0 font-black text-slate-700"
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

        {/* Data Table */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden no-print">
            <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="p-6 font-black text-slate-500 text-sm uppercase">الطالب</th>
                            <th className="p-6 font-black text-slate-500 text-sm uppercase">الفصل الدراسي</th>
                            <th className="p-6 font-black text-slate-500 text-sm uppercase text-center">إجمالي الحصص</th>
                            <th className="p-6 font-black text-slate-500 text-sm uppercase text-center">أيام الغياب المعادلة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredStudents.map(student => (
                            <tr key={student.id} className="hover:bg-rose-50/30 transition-colors group">
                                <td className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-rose-100 group-hover:text-rose-600 transition-all">
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 group-hover:text-rose-700 transition-colors">{student.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">رقم الطالب: {student.id.substring(0, 8)}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6">
                                    <div className="flex items-center gap-2 text-slate-600 font-bold">
                                        <GraduationCap className="w-4 h-4 opacity-50" />
                                        {student.className}
                                    </div>
                                </td>
                                <td className="p-6 text-center">
                                    <span className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-black border border-slate-200 group-hover:bg-white transition-all">
                                        {student.count} حصص
                                    </span>
                                </td>
                                <td className="p-6 text-center">
                                    <div className="inline-flex flex-col items-center justify-center bg-rose-600 text-white rounded-2xl px-5 py-2 shadow-lg shadow-rose-200 border border-rose-500 group-hover:scale-105 transition-transform">
                                        <span className="text-2xl font-black leading-none">{Math.floor(student.count / 5)}</span>
                                        <span className="text-[8px] font-bold uppercase tracking-tighter mt-1 opacity-80">أيام كاملة</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {filteredStudents.length === 0 && (
                <div className="py-32 text-center bg-slate-50/50">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                        <ClipboardList className="w-10 h-10 text-slate-200" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800">لا يوجد بيانات مطابقة</h3>
                    <p className="text-slate-500 font-bold mt-2">جرب تغيير الفصل أو مراجعة معايير البحث.</p>
                </div>
            )}
        </div>

        {/* 🖨️ منطقة التقرير الرسمي (تظهر في الطباعة فقط) */}
        <div id="printable-report" className="hidden">
            <div className="print-header">
                <h1 style={{fontSize: '32px', marginBottom: '10px'}}>مدرسة الرفعة النموذجية</h1>
                <h2 style={{fontSize: '20px', color: '#333'}}>كشف بأسماء الطلاب المتجاوزين لنسبة غياب الحصص</h2>
                <p style={{fontSize: '14px', marginTop: '10px'}}>تاريخ التقرير: {format(new Date(), 'EEEE d MMMM yyyy', { locale: arSA })}</p>
            </div>

            <div style={{marginBottom: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '10px'}}>
                <strong>إقرار المعلم:</strong> أشهد أنا المعلم / <strong>{teacherName}</strong>، بأن البيانات المذكورة أدناه مستخرجة من واقع سجلات الحضور الإلكترونية الخاصة بحصصي المجدولة، وأن هؤلاء الطلاب تجاوزوا (5 حصص غياب) فأكثر.
            </div>

            <table>
                <thead>
                    <tr>
                        <th style={{width: '40px'}}>م</th>
                        <th>اسم الطالب</th>
                        <th>الصف والشعبة</th>
                        <th style={{textAlign: 'center'}}>إجمالي الحصص</th>
                        <th style={{textAlign: 'center'}}>الأيام المعادلة</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredStudents.map((s, i) => (
                        <tr key={s.id}>
                            <td style={{textAlign: 'center'}}>{i + 1}</td>
                            <td style={{fontWeight: 'bold'}}>{s.name}</td>
                            <td>{s.className}</td>
                            <td style={{textAlign: 'center'}}>{s.count}</td>
                            <td style={{textAlign: 'center', fontWeight: 'bold'}}>{Math.floor(s.count / 5)} يوم غياب</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="print-footer">
                <div>
                    <strong>توقيع معلم المادة</strong>
                    <br/><br/>.........................
                </div>
                <div>
                    <strong>اعتماد مدير المدرسة</strong>
                    <br/><br/>.........................
                </div>
            </div>

            <div style={{marginTop: '60px', textAlign: 'center', fontSize: '12px', color: '#666', borderTop: '1px dashed #ccc', paddingTop: '20px'}}>
                يُعتد بهذا التقرير كوثيقة رسمية لاتخاذ الإجراءات الإدارية بحق الطلاب المتغيبين.
            </div>
        </div>

        <AnimatePresence>
          {showSuccess && (
            <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-5 rounded-[2rem] shadow-2xl z-50 flex items-center gap-4 border border-white/20">
                <div className="p-2 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="pr-1">
                    <p className="font-black text-sm">تم إرسال البلاغ للإدارة</p>
                    <p className="text-[10px] font-bold text-slate-400">سيظهر التقرير في صندوق رسائل الإدارة فوراً.</p>
                </div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </>
  );
}


