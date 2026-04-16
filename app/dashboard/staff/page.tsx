/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { useUsersSystem } from '@/hooks/useUsersSystem'; 
import { 
  Shield, Users, Loader2, Sparkles, 
  FileText, Bell, CheckCircle, Search, 
  UserPlus, AlertTriangle, CalendarDays, GraduationCap, ClipboardList,
  Settings, Building2, Calculator, HeartPulse, Activity, UserCheck, PlusCircle, X
} from 'lucide-react';

export default function StaffDashboardPage() {
  const { user, isChecking } = useAuth();
  const [staffData, setStaffData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const { students: allStudents, fetchStudents, addParent } = useUsersSystem();

  // 🚀 النظام الجديد: قائمة بالطلاب المختارين (للإخوة)
  const [searchStudentId, setSearchStudentId] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
  
  const [parentForm, setParentForm] = useState({ 
    full_name: '', 
    national_id: '', 
    phone: '', 
    email: '',
    job_title: '', 
    address: ''    
  });

  const [linkStatus, setLinkStatus] = useState<{type: 'idle'|'loading'|'success'|'error', msg: string}>({type: 'idle', msg: ''});

  useEffect(() => {
    async function loadWorkspace() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('school_staff')
          .select('*, users!school_staff_id_fkey(full_name, email)')
          .eq('id', user.id)
          .single();
          
        if (!error && data) {
          data.permissions = data.permissions || {};
          setStaffData(data);
          if (data.permissions['link_parents']) fetchStudents();
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setLoading(false);
      }
    }
    if (!isChecking) loadWorkspace();
  }, [user, isChecking, fetchStudents]);

  // 🚀 دالة البحث وإضافة الطالب لقائمة الإخوة
  const handleAddStudentToList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchStudentId) return;
    
    setLinkStatus({type: 'loading', msg: 'جاري البحث...'});
    
    const student = allStudents.find(s => s.national_id === searchStudentId);
    
    if (student) {
      // التأكد من عدم إضافة نفس الطالب مرتين
      if (selectedStudents.some(s => s.id === student.id)) {
        setLinkStatus({type: 'error', msg: 'هذا الطالب مضاف للقائمة بالفعل.'});
        return;
      }

      setSelectedStudents(prev => [...prev, student]);
      
      // استنتاج اسم الأب من أول طالب مضاف لتسهيل الكتابة
      if (selectedStudents.length === 0) {
        const parts = student.users?.full_name?.split(' ') || [];
        const defaultName = parts.length > 2 ? `${parts[1]} ${parts[2]} ${parts[3] || ''}`.trim() : '';
        setParentForm(prev => ({ ...prev, full_name: defaultName }));
      }
      
      setSearchStudentId('');
      setLinkStatus({type: 'success', msg: `تمت إضافة ${student.users?.full_name} للقائمة.`});
      setTimeout(() => setLinkStatus({type: 'idle', msg: ''}), 2000);
    } else {
      setLinkStatus({type: 'error', msg: 'لم يتم العثور على طالب بهذا الرقم المدني.'});
    }
  };

  // إزالة طالب من القائمة
  const handleRemoveStudent = (studentId: string) => {
    setSelectedStudents(prev => prev.filter(s => s.id !== studentId));
  };

  // 🚀 دالة إنشاء ولي الأمر وربطه بكل القائمة
  const handleCreateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudents.length === 0 || !parentForm.national_id) {
      setLinkStatus({type: 'error', msg: 'يرجى إضافة طالب واحد على الأقل وإدخال الرقم المدني لولي الأمر.'});
      return;
    }

    setLinkStatus({type: 'loading', msg: 'جاري تسجيل البيانات والربط الشامل...'});

    try {
      // 1. استخدام صلاحيات الآدمن (addParent) لضمان تجاوز مشكلة الـ RLS وحسابات الأشباح
      // بما أننا نرسل مصفوفة student_ids، ستقوم الأداة بإنشاء الأب (إذا كان جديداً) وربطه بكل الطلاب
      const payload = {
        ...parentForm,
        student_ids: selectedStudents.map(s => s.id) // 👈 السر هنا: نرسل كل الإخوة معاً
      };

      const result = await addParent(payload);
      
      setLinkStatus({type: 'success', msg: `تم اعتماد الملف وربط جميع الأبناء بنجاح! كلمة المرور: ${result.password || 'محتفظ بها مسبقاً'}`});
      
      setTimeout(() => {
        setSelectedStudents([]);
        setSearchStudentId('');
        setParentForm({ full_name: '', national_id: '', phone: '', email: '', job_title: '', address: '' });
        setLinkStatus({type: 'idle', msg: ''});
      }, 5000);

    } catch (err: any) {
      console.error("Error connecting parent:", err);
      // معالجة الرسالة المزعجة وتوجيه الستاف بذكاء
      if (err.message?.includes('already been registered')) {
        setLinkStatus({type: 'error', msg: 'ولي الأمر مسجل مسبقاً في النظام. يرجى توجيه ولي الأمر لاستخدام حسابه الحالي، أو مراجعة المدير لتحديث ملفه.'});
      } else {
        setLinkStatus({type: 'error', msg: err.message || 'فشلت العملية.'});
      }
    }
  };

  if (isChecking || loading) return <div className="flex h-[80vh] items-center justify-center flex-col gap-4 font-cairo"><Loader2 className="w-12 h-12 text-indigo-600 animate-spin" /><p className="font-bold text-slate-500 animate-pulse">جاري تجهيز مساحة العمل...</p></div>;
  if (!staffData) return null;

  const hasPerm = (key: string) => staffData.permissions[key] === true;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-cairo pt-6" dir="rtl">
      {/* بطاقة الموظف */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-8 sm:p-10 rounded-[3rem] shadow-xl border border-slate-100 relative overflow-hidden mb-8">
        <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 z-0"></div>
        <div className="flex items-center gap-6 z-10 w-full md:w-auto">
          <div className="h-20 w-20 shrink-0 bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-[1.5rem] flex items-center justify-center text-3xl font-black shadow-lg">
            {staffData.users?.full_name?.charAt(0)}
          </div>
          <div>
            <div className="flex items-center flex-wrap gap-3 mb-1">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{staffData.users?.full_name}</h1>
              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg">{staffData.job_category}</span>
            </div>
            <p className="text-indigo-600 font-black text-lg">{staffData.job_title}</p>
          </div>
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center min-w-[150px] z-10">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1"><Shield className="w-3 h-3" /> نطاق الصلاحيات</div>
          <div className="text-sm font-black text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">{staffData.scope_stage}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-black text-slate-800 px-2 flex items-center gap-2"><Settings className="w-5 h-5 text-indigo-500"/> أدوات مساحة العمل المعتمدة لك</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 🚀 أداة ربط أولياء الأمور (تم تحديثها لدعم الأبناء المتعددين) */}
            {hasPerm('link_parents') && (
              <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 sm:p-8 rounded-[2.5rem] shadow-xl text-white md:col-span-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="flex items-start justify-between mb-6 relative z-10">
                  <div>
                    <h3 className="font-black text-2xl mb-2 flex items-center gap-3"><UserPlus className="w-6 h-6 text-indigo-300"/> مكتب استقبال أولياء الأمور</h3>
                    <p className="text-indigo-200 text-sm font-bold opacity-90">يمكنك البحث وإضافة أكثر من طالب (إخوة) ثم ربطهم جميعاً بملف ولي أمر واحد.</p>
                  </div>
                </div>
                
                <div className="space-y-6 relative z-10">
                  
                  {/* خطوة 1: البحث وإضافة الطلاب للقائمة */}
                  <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20">
                    <form onSubmit={handleAddStudentToList} className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300" />
                        <input type="text" value={searchStudentId} onChange={(e) => setSearchStudentId(e.target.value)} placeholder="الرقم المدني للطالب..." className="w-full bg-slate-900/30 border border-indigo-400/30 text-white placeholder:text-indigo-300 rounded-xl py-3.5 pr-12 pl-4 font-bold outline-none focus:bg-slate-900/50 focus:border-indigo-400 transition-all text-lg" dir="ltr" style={{ textAlign: 'right' }} />
                      </div>
                      <button type="submit" disabled={linkStatus.type === 'loading' || !searchStudentId} className="bg-indigo-500 text-white font-black px-8 py-3.5 rounded-xl hover:bg-indigo-400 active:scale-95 disabled:opacity-50 shadow-lg shadow-indigo-500/20 whitespace-nowrap">
                        إضافة للقائمة
                      </button>
                    </form>
                  </div>

                  {/* خطوة 2: عرض قائمة الطلاب وإدخال بيانات الأب */}
                  <AnimatePresence>
                    {selectedStudents.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-white text-slate-900 p-6 sm:p-8 rounded-3xl shadow-2xl">
                        
                        {/* قائمة الإخوة المختارين */}
                        <div className="mb-6 pb-6 border-b border-slate-100">
                          <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-3">الطلاب المراد ربطهم ({selectedStudents.length})</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedStudents.map(student => (
                              <div key={student.id} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl border border-indigo-100">
                                <UserCheck className="w-4 h-4 text-indigo-500"/>
                                <span className="font-bold text-sm">{student.users?.full_name?.split(' ')[0]}</span>
                                <button onClick={() => handleRemoveStudent(student.id)} className="ml-1 text-indigo-400 hover:text-rose-500"><X className="w-4 h-4"/></button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* نموذج بيانات الأب */}
                        <form onSubmit={handleCreateParent} className="space-y-5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="space-y-1.5"><label className="text-xs font-black text-slate-500 uppercase">الاسم الكامل لولي الأمر</label><input type="text" required value={parentForm.full_name} onChange={e => setParentForm({...parentForm, full_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                            <div className="space-y-1.5"><label className="text-xs font-black text-slate-500 uppercase">الرقم المدني</label><input type="text" required value={parentForm.national_id} onChange={e => setParentForm({...parentForm, national_id: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold outline-none text-left" dir="ltr" /></div>
                            <div className="space-y-1.5"><label className="text-xs font-black text-slate-500 uppercase">رقم الهاتف</label><input type="text" value={parentForm.phone} onChange={e => setParentForm({...parentForm, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold outline-none text-left" dir="ltr" /></div>
                            <div className="space-y-1.5"><label className="text-xs font-black text-slate-500 uppercase">البريد الإلكتروني</label><input type="email" value={parentForm.email} onChange={e => setParentForm({...parentForm, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold outline-none text-left" dir="ltr" /></div>
                          </div>
                          <button type="submit" disabled={linkStatus.type === 'loading'} className="w-full bg-emerald-500 text-white font-black px-6 py-4 rounded-xl hover:bg-emerald-600 active:scale-95 disabled:opacity-70 flex justify-center items-center gap-2 shadow-lg shadow-emerald-500/20 mt-4 text-lg">
                            {linkStatus.type === 'loading' ? <Loader2 className="w-6 h-6 animate-spin"/> : <><PlusCircle className="w-6 h-6"/> تسجيل واعتماد ربط {selectedStudents.length > 1 ? 'الأبناء' : 'الابن'}</>}
                          </button>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {linkStatus.msg && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={`overflow-hidden rounded-xl border mt-4 ${linkStatus.type === 'success' ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-100' : linkStatus.type === 'error' ? 'bg-rose-500/20 border-rose-400/30 text-rose-100' : 'bg-white/5 text-indigo-100'}`}>
                        <div className="p-4 font-bold text-sm leading-relaxed">{linkStatus.msg}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* باقي الأدوات (مثال) */}
            {hasPerm('view_students') && (
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Users className="w-6 h-6"/></div>
                <h3 className="font-black text-slate-800 text-lg mb-1">سجل الطلاب الشامل</h3>
                <button className="w-full py-2.5 bg-slate-50 text-sky-600 font-black text-sm rounded-xl mt-4">فتح السجل</button>
              </div>
            )}
          </div>
        </div>

        {/* التعاميم والمساحة المشتركة */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
             <div className="inline-flex items-center gap-2 bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-black mb-6 w-fit border border-slate-200"><Sparkles className="w-4 h-4"/> مساحة مشتركة</div>
             <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2"><Bell className="w-5 h-5 text-amber-500" /> التعاميم الداخلية</h3>
             <button className="w-full text-right px-4 py-3 bg-slate-50 hover:bg-indigo-50 text-slate-700 font-bold text-sm rounded-xl transition-colors mb-2">تقديم طلب إجازة</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
