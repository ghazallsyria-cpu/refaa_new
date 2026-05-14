// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ScrollText, Loader2, CheckCircle2, Search, X, Coins, ShieldCheck, Filter, PrinterIcon, Edit3, Save, Trash2, PlusCircle, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { motion, AnimatePresence } from 'framer-motion';

export default function GraduationDocsAdmin() {
  const { authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');

  // 🚀 حالات التعديل اليدوي وإضافة طلب جديد
  const [editingRequest, setEditingRequest] = useState<any>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editForm, setEditForm] = useState({ cert_ar: 0, cert_en: 0, twimc_ar: 0, twimc_en: 0, conduct_ar: 0, conduct_en: 0 });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  
  // 🚀 حالات لاختيار الطالب عند إنشاء طلب جديد
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  const currentYear = '2025-2026';

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('graduation_documents')
        .select(`
          *,
          students (
            id,
            users (full_name),
            sections (name, classes(name, level))
          )
        `)
        .eq('academic_year', currentYear)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);

      // جلب قائمة كل الطلاب (لاستخدامها عند إنشاء طلب إداري جديد)
      const { data: studentsData } = await supabase
        .from('students')
        .select(`
          id,
          users (full_name),
          sections (name, classes(name, level))
        `);
      setAllStudents(studentsData || []);

    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (['admin', 'management'].includes(currentRole)) fetchData();
  }, [currentRole]);

  // دالة مساعدة لجلب اسم الصف بدقة
  const getFullClassName = (studentData: any) => {
    if (!studentData) return 'غير محدد';
    const classLvl = studentData?.sections?.classes?.level || studentData?.sections?.[0]?.classes?.level;
    const secName = studentData?.sections?.name || studentData?.sections?.[0]?.name || '';
    return classLvl ? `الصف ${classLvl} - ${secName}` : secName || 'صف غير محدد';
  };

  // دالة الاعتماد المالي
  const markAsPaid = async (id: string, studentName: string) => {
    if (!confirm(`هل تأكدت من استلام المبلغ كاملاً من الطالب (${studentName})؟ \nسيتم تثبيت الدفع وتحويل الطلب للمندوب.`)) return;
    
    try {
      const { error } = await supabase.from('graduation_documents').update({ payment_status: 'paid' }).eq('id', id);
      if (error) throw error;
      
      alert('تم استلام المبلغ واعتماد الطلب بنجاح ✅');
      fetchData(); 
    } catch (e) {
      alert('حدث خطأ أثناء تحديث حالة الدفع.');
    }
  };

  // دالة الحذف
  const handleDeleteRequest = async (id: string) => {
    if (!confirm('هل أنت متأكد من إلغاء وحذف هذا الطلب نهائياً؟')) return;
    try {
      await supabase.from('graduation_documents').delete().eq('id', id);
      fetchData();
    } catch (e) { alert('خطأ في الحذف'); }
  };

  // 🚀 دوال التعديل والإضافة
  const openEditModal = (req: any = null) => {
    if (req) {
      setIsCreatingNew(false);
      setEditingRequest(req);
      setSelectedStudentId(req.student_id);
      setEditForm({
        cert_ar: req.cert_ar || 0, cert_en: req.cert_en || 0,
        twimc_ar: req.twimc_ar || 0, twimc_en: req.twimc_en || 0,
        conduct_ar: req.conduct_ar || 0, conduct_en: req.conduct_en || 0
      });
    } else {
      setIsCreatingNew(true);
      setEditingRequest({ id: 'new' }); // معرف وهمي لفتح النافذة
      setSelectedStudentId('');
      setStudentSearchTerm('');
      setEditForm({ cert_ar: 0, cert_en: 0, twimc_ar: 0, twimc_en: 0, conduct_ar: 0, conduct_en: 0 });
    }
  };

  const handleDocChange = (field: string, delta: number) => {
    setEditForm(prev => ({ ...prev, [field]: Math.max(0, prev[field as keyof typeof prev] + delta) }));
  };

  const currentEditTotal = Object.values(editForm).reduce((a, b) => a + b, 0);

  const saveEdit = async () => {
    if (isCreatingNew && !selectedStudentId) {
      alert('يجب اختيار الطالب أولاً قبل حفظ الطلب.');
      return;
    }
    if (currentEditTotal === 0 && isCreatingNew) { 
      alert('لا يمكن إنشاء طلب فارغ.'); 
      return; 
    }
    if (currentEditTotal === 0 && !isCreatingNew) { 
      alert('لا يمكن أن يكون الطلب فارغاً. استخدم زر الحذف إذا أردت إلغاء الطلب.'); 
      return; 
    }
    
    setIsSavingEdit(true);
    try {
      if (isCreatingNew) {
        // التحقق إذا كان الطالب لديه طلب مفتوح وغير مدفوع لنفس العام
        const { data: existing } = await supabase.from('graduation_documents')
          .select('id').eq('student_id', selectedStudentId).eq('academic_year', currentYear).eq('payment_status', 'pending').maybeSingle();
          
        if (existing) {
          alert('هذا الطالب لديه طلب سابق غير مدفوع في النظام، قم بتعديل طلبه السابق بدلاً من إنشاء واحد جديد.');
          setIsSavingEdit(false);
          return;
        }

        const { error } = await supabase.from('graduation_documents').insert({
          student_id: selectedStudentId,
          academic_year: currentYear,
          cert_ar: editForm.cert_ar, cert_en: editForm.cert_en,
          twimc_ar: editForm.twimc_ar, twimc_en: editForm.twimc_en,
          conduct_ar: editForm.conduct_ar, conduct_en: editForm.conduct_en,
          total_amount: currentEditTotal,
          payment_status: 'pending' // الإدارة ستسجل الدفع من القائمة الخارجية
        });
        if (error) throw error;
        alert('تم إنشاء الطلب الإداري بنجاح! ✅');
      } else {
        const { error } = await supabase.from('graduation_documents').update({
          cert_ar: editForm.cert_ar, cert_en: editForm.cert_en,
          twimc_ar: editForm.twimc_ar, twimc_en: editForm.twimc_en,
          conduct_ar: editForm.conduct_ar, conduct_en: editForm.conduct_en,
          total_amount: currentEditTotal 
        }).eq('id', editingRequest.id);
        if (error) throw error;
        alert('تم تحديث الطلب وإعادة حساب المبلغ بنجاح! ✅');
      }

      setEditingRequest(null);
      fetchData();
    } catch(e) { 
      console.error(e);
      alert('حدث خطأ أثناء حفظ البيانات.'); 
    } finally { 
      setIsSavingEdit(false); 
    }
  };

  // استخراج الصفوف الموجودة في الطلبات للفلترة
  const uniqueClasses = useMemo(() => {
    const classes = new Set<string>();
    requests.forEach(r => classes.add(getFullClassName(r.students)));
    return Array.from(classes).sort();
  }, [requests]);

  // فلترة الطلبات حسب البحث والصف
  const filteredRequests = requests.filter(r => {
    const nameMatch = (r.students?.users?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const classMatch = filterClass ? getFullClassName(r.students) === filterClass : true;
    return nameMatch && classMatch;
  });

  // فلترة الطلاب عند إنشاء طلب جديد
  const filteredStudentsForNewReq = allStudents.filter(s => 
    s.users?.full_name?.toLowerCase().includes(studentSearchTerm.toLowerCase())
  ).slice(0, 10); // عرض أول 10 نتائج فقط لعدم ثقل الشاشة

  // الحسابات المالية اللحظية للإدارة
  const totalExpected = requests.reduce((acc, r) => acc + r.total_amount, 0);
  const totalCollected = requests.filter(r => r.payment_status === 'paid').reduce((acc, r) => acc + r.total_amount, 0);

  // دالة طباعة كشف المندوب
  const printManifest = () => {
    window.print();
  };

  if (!['admin', 'management'].includes(currentRole)) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-10 font-cairo" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute -left-10 -top-10 text-fuchsia-50/50 pointer-events-none print:hidden">
            <ScrollText className="w-64 h-64" />
          </div>
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-100 pb-8 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 flex items-center gap-3">
                <ScrollText className="w-8 h-8 text-fuchsia-600 print:hidden" /> 
                <span>إدارة وثائق وتصديقات التخرج</span>
              </h1>
              <p className="text-slate-500 font-bold text-sm mt-1 print:hidden">طلبات خريجي الثاني عشر، تحصيل مبالغ الطوابع، واعتماد مهام المندوب.</p>
            </div>
            
            <div className="flex flex-wrap gap-4 w-full lg:w-auto">
               <div className="bg-rose-50 px-5 sm:px-6 py-3 rounded-2xl border border-rose-100 text-center flex-1 sm:flex-none">
                 <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">إجمالي مطلوب</p>
                 <p className="text-xl sm:text-2xl font-black text-rose-700">{totalExpected} د.ك</p>
               </div>
               <div className="bg-emerald-50 px-5 sm:px-6 py-3 rounded-2xl border border-emerald-100 text-center flex-1 sm:flex-none shadow-sm">
                 <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">تم تحصيله (خزنة المندوب)</p>
                 <p className="text-xl sm:text-2xl font-black text-emerald-700">{totalCollected} د.ك</p>
               </div>
               
               {/* 🚀 زر الإضافة الإدارية */}
               <button onClick={() => openEditModal()} className="w-full sm:w-auto bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-6 py-3 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-md print:hidden active:scale-95">
                 <PlusCircle className="w-5 h-5" /> إصدار طلب (نقدي)
               </button>

               <button onClick={printManifest} className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-md print:hidden active:scale-95">
                 <PrinterIcon className="w-5 h-5" /> طباعة الكشف
               </button>
            </div>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row gap-4 mb-6 print:hidden">
            <div className="relative flex-1">
               <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
               <input type="text" placeholder="ابحث باسم الطالب (لتسجيل الدفع)..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-fuchsia-500 shadow-inner" />
            </div>
            <div className="relative w-full sm:w-64 shrink-0">
               <Filter className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <select value={filterClass} onChange={e=>setFilterClass(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-3.5 font-bold text-slate-700 outline-none focus:border-fuchsia-500 shadow-inner appearance-none cursor-pointer">
                  <option value="">جميع الفصول</option>
                  {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20 print:hidden"><Loader2 className="w-10 h-10 animate-spin text-fuchsia-500" /></div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 relative z-10 shadow-sm">
              <table className="w-full text-right text-sm border-collapse">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-4 border-b border-slate-200 font-black">اسم الطالب (طالب الخدمة)</th>
                    <th className="p-4 border-b border-slate-200 font-black">الصف</th>
                    <th className="p-4 border-b border-slate-200 font-black text-center bg-blue-50/50">ثانوية (ع/E)</th>
                    <th className="p-4 border-b border-slate-200 font-black text-center bg-amber-50/50">لمن يهمه (ع/E)</th>
                    <th className="p-4 border-b border-slate-200 font-black text-center bg-purple-50/50">سلوك (ع/E)</th>
                    <th className="p-4 border-b border-slate-200 font-black text-center">المبلغ المستحق</th>
                    <th className="p-4 border-b border-slate-200 font-black text-center print:hidden">إجراءات الإدارة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-black text-slate-800">{req.students?.users?.full_name || 'طالب غير معروف'}</td>
                      <td className="p-4 font-bold text-slate-500 text-xs">{getFullClassName(req.students)}</td>
                      <td className="p-4 text-center font-black text-slate-700 bg-blue-50/30 border-x border-white">{req.cert_ar} / {req.cert_en}</td>
                      <td className="p-4 text-center font-black text-slate-700 bg-amber-50/30 border-r border-white">{req.twimc_ar} / {req.twimc_en}</td>
                      <td className="p-4 text-center font-black text-slate-700 bg-purple-50/30 border-r border-white">{req.conduct_ar} / {req.conduct_en}</td>
                      <td className="p-4 text-center">
                        <span className="font-black text-fuchsia-600 text-lg bg-fuchsia-50 px-3 py-1 rounded-lg border border-fuchsia-100">{req.total_amount} د.ك</span>
                      </td>
                      <td className="p-4 text-center print:hidden">
                         {req.payment_status === 'paid' ? (
                           <div className="flex items-center justify-center gap-2">
                             <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl font-black text-xs border border-emerald-200 shadow-inner">
                               <CheckCircle2 className="w-4 h-4"/> معتمد مالياً
                             </span>
                             {/* زر التعديل متاح حتى بعد الدفع في حال أرادوا التعديل */}
                             <button onClick={() => openEditModal(req)} className="p-2 bg-slate-50 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors border border-slate-200" title="تعديل الطلب">
                               <Edit3 className="w-4 h-4" />
                             </button>
                           </div>
                         ) : (
                           <div className="flex items-center justify-center gap-2">
                             <button onClick={() => markAsPaid(req.id, req.students?.users?.full_name)} className="bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white px-4 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2 shadow-md active:scale-95 border border-slate-700">
                               <Coins className="w-4 h-4 text-amber-400"/> استلام
                             </button>
                             <button onClick={() => openEditModal(req)} className="p-2 bg-slate-50 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors border border-slate-200" title="تعديل الطلب يدوياً">
                               <Edit3 className="w-4 h-4" />
                             </button>
                             <button onClick={() => handleDeleteRequest(req.id)} className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-xl transition-colors border border-rose-100" title="إلغاء الطلب نهائياً">
                               <Trash2 className="w-4 h-4" />
                             </button>
                           </div>
                         )}
                      </td>
                    </tr>
                  ))}
                  {filteredRequests.length === 0 && <tr><td colSpan={7} className="text-center py-12 font-bold text-slate-400 bg-slate-50/50">لا توجد طلبات مطابقة للبحث أو الفلتر الحالي.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 🚀 نافذة التعديل اليدوي / إضافة طلب إداري */}
      <AnimatePresence>
        {editingRequest && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setEditingRequest(null)}></div>
             
             <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white border border-slate-200 rounded-[2rem] w-full max-w-2xl shadow-2xl relative z-10 flex flex-col max-h-[95vh]" dir="rtl">
                 <div className="flex justify-between items-center p-6 border-b border-slate-100 shrink-0 bg-slate-50">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-fuchsia-100 rounded-xl flex items-center justify-center text-fuchsia-600 shadow-inner border border-fuchsia-200">
                          {isCreatingNew ? <PlusCircle className="w-5 h-5"/> : <Edit3 className="w-5 h-5"/>}
                       </div>
                       <div>
                         <h2 className="text-lg font-black text-slate-800 leading-tight">{isCreatingNew ? 'إصدار طلب وثائق (إداري)' : 'تعديل طلب الوثائق'}</h2>
                         {!isCreatingNew && <p className="text-[10px] font-bold text-slate-500 mt-1">الطالب: <span className="text-fuchsia-600 font-black">{editingRequest.students?.users?.full_name}</span></p>}
                       </div>
                    </div>
                    <button onClick={() => setEditingRequest(null)} className="text-slate-400 hover:text-rose-500 bg-white border border-slate-200 p-2 rounded-full transition-colors active:scale-90 shadow-sm"><X className="w-5 h-5"/></button>
                 </div>

                 <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
                    
                    {/* 🚀 مربع اختيار الطالب عند إنشاء طلب جديد */}
                    {isCreatingNew && (
                      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl shadow-inner space-y-4">
                         <label className="text-xs font-black text-indigo-800 flex items-center gap-2"><UserPlus className="w-4 h-4"/> اختر الطالب (مقدم الطلب):</label>
                         
                         {!selectedStudentId ? (
                           <>
                             <div className="relative">
                               <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                               <input 
                                 type="text" 
                                 placeholder="ابحث باسم الطالب..." 
                                 value={studentSearchTerm} 
                                 onChange={e => setStudentSearchTerm(e.target.value)} 
                                 className="w-full pl-3 pr-10 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400" 
                               />
                             </div>
                             
                             {studentSearchTerm.trim().length > 0 && (
                               <div className="mt-2 border border-indigo-100 rounded-xl overflow-hidden bg-white max-h-40 overflow-y-auto custom-scrollbar shadow-sm">
                                 {filteredStudentsForNewReq.length > 0 ? (
                                   filteredStudentsForNewReq.map(s => (
                                     <button 
                                       key={s.id} 
                                       onClick={() => setSelectedStudentId(s.id)}
                                       className="w-full text-right px-4 py-2 hover:bg-indigo-50 border-b border-indigo-50 last:border-0 transition-colors flex flex-col"
                                     >
                                       <span className="font-black text-sm text-slate-700">{s.users?.full_name}</span>
                                       <span className="text-[10px] text-indigo-500 font-bold">{getFullClassName(s)}</span>
                                     </button>
                                   ))
                                 ) : (
                                   <div className="p-3 text-center text-xs font-bold text-slate-400">لا يوجد طالب بهذا الاسم.</div>
                                 )}
                               </div>
                             )}
                           </>
                         ) : (
                           <div className="flex items-center justify-between bg-white border border-emerald-200 p-3 rounded-xl shadow-sm">
                             <div className="flex items-center gap-3">
                               <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                               <div>
                                 <p className="font-black text-sm text-slate-800">{allStudents.find(s => s.id === selectedStudentId)?.users?.full_name}</p>
                                 <p className="text-[10px] text-emerald-600 font-bold">{getFullClassName(allStudents.find(s => s.id === selectedStudentId))}</p>
                               </div>
                             </div>
                             <button onClick={() => setSelectedStudentId('')} className="text-xs text-rose-500 hover:underline font-bold">تغيير</button>
                           </div>
                         )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       {/* شهادة ثانوية */}
                       <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                          <p className="text-xs font-black text-slate-700 mb-3 border-b border-slate-200 pb-2">شهادة الثانوية العامة</p>
                          <div className="space-y-2">
                             <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-500">عربي</span>
                                <div className="flex items-center gap-2">
                                   <button onClick={() => handleDocChange('cert_ar', -1)} className="w-6 h-6 bg-slate-800 text-white rounded font-black hover:bg-slate-700 active:scale-90">-</button>
                                   <span className="w-4 text-center font-black text-sm">{editForm.cert_ar}</span>
                                   <button onClick={() => handleDocChange('cert_ar', 1)} className="w-6 h-6 bg-fuchsia-600 text-white rounded font-black hover:bg-fuchsia-500 active:scale-90">+</button>
                                </div>
                             </div>
                             <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-500">إنجليزي</span>
                                <div className="flex items-center gap-2">
                                   <button onClick={() => handleDocChange('cert_en', -1)} className="w-6 h-6 bg-slate-800 text-white rounded font-black hover:bg-slate-700 active:scale-90">-</button>
                                   <span className="w-4 text-center font-black text-sm">{editForm.cert_en}</span>
                                   <button onClick={() => handleDocChange('cert_en', 1)} className="w-6 h-6 bg-fuchsia-600 text-white rounded font-black hover:bg-fuchsia-500 active:scale-90">+</button>
                                </div>
                             </div>
                          </div>
                       </div>

                       {/* لمن يهمه الأمر */}
                       <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                          <p className="text-xs font-black text-slate-700 mb-3 border-b border-slate-200 pb-2">شهادة لمن يهمه الأمر</p>
                          <div className="space-y-2">
                             <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-500">عربي</span>
                                <div className="flex items-center gap-2">
                                   <button onClick={() => handleDocChange('twimc_ar', -1)} className="w-6 h-6 bg-slate-800 text-white rounded font-black hover:bg-slate-700 active:scale-90">-</button>
                                   <span className="w-4 text-center font-black text-sm">{editForm.twimc_ar}</span>
                                   <button onClick={() => handleDocChange('twimc_ar', 1)} className="w-6 h-6 bg-fuchsia-600 text-white rounded font-black hover:bg-fuchsia-500 active:scale-90">+</button>
                                </div>
                             </div>
                             <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-500">إنجليزي</span>
                                <div className="flex items-center gap-2">
                                   <button onClick={() => handleDocChange('twimc_en', -1)} className="w-6 h-6 bg-slate-800 text-white rounded font-black hover:bg-slate-700 active:scale-90">-</button>
                                   <span className="w-4 text-center font-black text-sm">{editForm.twimc_en}</span>
                                   <button onClick={() => handleDocChange('twimc_en', 1)} className="w-6 h-6 bg-fuchsia-600 text-white rounded font-black hover:bg-fuchsia-500 active:scale-90">+</button>
                                </div>
                             </div>
                          </div>
                       </div>

                       {/* حسن سيرة وسلوك */}
                       <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner sm:col-span-2">
                          <p className="text-xs font-black text-slate-700 mb-3 border-b border-slate-200 pb-2">شهادة حسن سيرة وسلوك</p>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-500">عربي</span>
                                <div className="flex items-center gap-2">
                                   <button onClick={() => handleDocChange('conduct_ar', -1)} className="w-6 h-6 bg-slate-800 text-white rounded font-black hover:bg-slate-700 active:scale-90">-</button>
                                   <span className="w-4 text-center font-black text-sm">{editForm.conduct_ar}</span>
                                   <button onClick={() => handleDocChange('conduct_ar', 1)} className="w-6 h-6 bg-fuchsia-600 text-white rounded font-black hover:bg-fuchsia-500 active:scale-90">+</button>
                                </div>
                             </div>
                             <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-500">إنجليزي</span>
                                <div className="flex items-center gap-2">
                                   <button onClick={() => handleDocChange('conduct_en', -1)} className="w-6 h-6 bg-slate-800 text-white rounded font-black hover:bg-slate-700 active:scale-90">-</button>
                                   <span className="w-4 text-center font-black text-sm">{editForm.conduct_en}</span>
                                   <button onClick={() => handleDocChange('conduct_en', 1)} className="w-6 h-6 bg-fuchsia-600 text-white rounded font-black hover:bg-fuchsia-500 active:scale-90">+</button>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between gap-4 rounded-b-[2rem]">
                    <div className="flex items-center gap-3">
                       <div className="p-3 bg-fuchsia-100 rounded-xl border border-fuchsia-200"><Coins className="w-5 h-5 text-fuchsia-600"/></div>
                       <div>
                         <p className="text-[10px] font-bold text-slate-500 uppercase">المبلغ الإجمالي</p>
                         <p className="text-xl font-black text-fuchsia-600">{currentEditTotal} د.ك</p>
                       </div>
                    </div>
                    <button 
                       onClick={saveEdit} 
                       disabled={isSavingEdit || (isCreatingNew && !selectedStudentId) || currentEditTotal === 0} 
                       className="py-4 px-6 sm:px-8 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:bg-slate-400"
                    >
                       {isSavingEdit ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> {isCreatingNew ? 'إصدار الطلب' : 'حفظ التعديل'}</>}
                    </button>
                 </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .max-w-7xl, .max-w-7xl * { visibility: visible; }
          .max-w-7xl { position: absolute; left: 0; top: 0; width: 100%; padding: 0; margin: 0; }
          .print\\:hidden { display: none !important; }
          .shadow-sm, .shadow-md, .shadow-inner { box-shadow: none !important; }
          .border { border-color: #000 !important; }
          td, th { border: 1px solid #ddd !important; }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}
