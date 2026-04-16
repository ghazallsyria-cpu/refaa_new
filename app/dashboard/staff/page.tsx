/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { 
  Shield, Users, Loader2, Sparkles, 
  FileText, Bell, CheckCircle, Search, 
  UserPlus, AlertTriangle, CalendarDays, GraduationCap, ClipboardList,
  Settings, Building2, Calculator, HeartPulse, Activity, UserCheck, PlusCircle
} from 'lucide-react';

export default function StaffDashboardPage() {
  const { user, isChecking } = useAuth();
  const [staffData, setStaffData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 🚀 حالات تطبيق "ربط ولي الأمر"
  const [searchStudentId, setSearchStudentId] = useState('');
  const [foundStudent, setFoundStudent] = useState<any>(null);
  const [parentCivilId, setParentCivilId] = useState('');
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
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setLoading(false);
      }
    }
    
    if (!isChecking) loadWorkspace();
  }, [user, isChecking]);

  // 🚀 دالة البحث عن الطالب
  const handleSearchStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchStudentId) return;
    
    setLinkStatus({type: 'loading', msg: 'جاري البحث عن الطالب...'});
    setFoundStudent(null);
    setParentCivilId('');

    try {
      // البحث عن الطالب وجلب بياناته الأساسية
      const { data, error } = await supabase
        .from('students')
        .select('id, national_id, parent_id, users(full_name)')
        .eq('national_id', searchStudentId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        setLinkStatus({type: 'error', msg: 'لم يتم العثور على طالب بهذا الرقم المدني.'});
        return;
      }

      setFoundStudent(data);
      setLinkStatus({type: 'idle', msg: ''});
    } catch (err: any) {
      setLinkStatus({type: 'error', msg: 'حدث خطأ أثناء البحث.'});
    }
  };

  // 🚀 دالة ربط ولي الأمر بالطالب (تم تنظيفها من user_id لتطابق قاعدة البيانات)
  const handleLinkParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundStudent || !parentCivilId) return;

    setLinkStatus({type: 'loading', msg: 'جاري تسجيل وربط ولي الأمر...'});

    try {
      // 1. هل ولي الأمر موجود مسبقاً؟
      let parentId = null;
      const { data: existingParent } = await supabase
        .from('parents')
        .select('id') // 👈 تم إزالة user_id
        .eq('national_id', parentCivilId)
        .maybeSingle();

      if (existingParent) {
        parentId = existingParent.id;
      } else {
        // 2. إذا لم يكن موجوداً، نقوم بإنشاء حساب جديد له
        const email = `${parentCivilId}@alrefaa.edu`;
        const { data: { session } } = await supabase.auth.getSession();
        
        // استخدام الـ API الذي أنشأناه لإنشاء المستخدمين لضمان تسجيله في Auth
        const response = await fetch('/api/users/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({ 
            email: email, 
            password: '123456', 
            full_name: `ولي أمر ${foundStudent.users?.full_name}`, // اسم مبدئي
            national_id: parentCivilId, 
            role: 'parent' 
          }),
        });
        
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        // إضافة بيانات ولي الأمر في جدول parents
        const { data: newParent, error: parentInsertError } = await supabase
          .from('parents')
          .insert({ id: result.user.id, national_id: parentCivilId }) // 👈 تم إزالة user_id
          .select()
          .single();
          
        if (parentInsertError) throw parentInsertError;
        parentId = newParent.id;
      }

      // 3. ربط الطالب بـ parent_id
      const { error: linkError } = await supabase
        .from('students')
        .update({ parent_id: parentId })
        .eq('id', foundStudent.id);

      if (linkError) throw linkError;

      setLinkStatus({type: 'success', msg: `تم بنجاح! تم ربط الطالب (${foundStudent.users?.full_name}) بولي الأمر.`});
      setFoundStudent(null);
      setSearchStudentId('');
      setParentCivilId('');
      
      // إخفاء رسالة النجاح بعد 4 ثواني
      setTimeout(() => setLinkStatus({type: 'idle', msg: ''}), 4000);

    } catch (err: any) {
      setLinkStatus({type: 'error', msg: err.message || 'فشلت عملية الربط.'});
    }
  };

  if (isChecking || loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
        <p className="font-bold text-slate-500 animate-pulse">جاري تجهيز مساحة العمل وبناء الصلاحيات...</p>
      </div>
    );
  }

  if (!staffData) return null;

  const hasPerm = (key: string) => staffData.permissions[key] === true;
  const hasNoPermissions = Object.values(staffData.permissions).every(val => val === false) || Object.keys(staffData.permissions).length === 0;

  const FinanceModule = () => (
    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-[2.5rem] text-white shadow-xl hover:shadow-2xl transition-all duration-300">
      <Calculator className="w-12 h-12 mb-4 opacity-80" />
      <h2 className="text-2xl font-black mb-2">البوابة المالية والإدارية</h2>
      <p className="font-bold opacity-90 mb-6">إدارة الرسوم الدراسية، الرواتب، والميزانية التشغيلية.</p>
      <div className="flex gap-3">
        <button className="bg-white text-emerald-600 px-6 py-3 rounded-xl font-black shadow-lg hover:bg-emerald-50 transition-all active:scale-95">الرسوم المستحقة</button>
        <button className="bg-emerald-700/50 text-white px-6 py-3 rounded-xl font-black hover:bg-emerald-700 transition-all border border-emerald-400/30 active:scale-95">سجلات الدفع</button>
      </div>
    </div>
  );

  const GuidanceModule = () => (
    <div className="bg-gradient-to-br from-rose-500 to-pink-600 p-8 rounded-[2.5rem] text-white shadow-xl hover:shadow-2xl transition-all duration-300">
      <HeartPulse className="w-12 h-12 mb-4 opacity-80" />
      <h2 className="text-2xl font-black mb-2">شؤون الرعاية والإرشاد</h2>
      <p className="font-bold opacity-90 mb-6">متابعة الحالات السلوكية، النفسية، والصحية للطلاب.</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm border border-white/20">
          <div className="text-3xl font-black">12</div>
          <div className="text-sm font-bold opacity-90">حالة نشطة</div>
        </div>
        <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm border border-white/20">
          <div className="text-3xl font-black">5</div>
          <div className="text-sm font-bold opacity-90">مراجعات اليوم</div>
        </div>
      </div>
      <button className="w-full mt-4 bg-white text-rose-600 py-3.5 rounded-xl font-black shadow-lg hover:bg-rose-50 transition-all active:scale-95">استعراض ملفات الطلاب</button>
    </div>
  );

  const LeadershipModule = () => (
    <div className="bg-gradient-to-br from-indigo-800 to-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl hover:shadow-2xl transition-all duration-300 col-span-full">
      <Shield className="w-12 h-12 mb-4 opacity-80 text-indigo-400" />
      <h2 className="text-3xl font-black mb-2">مركز القيادة والتحكم</h2>
      <p className="font-bold text-indigo-200 mb-6 max-w-2xl">نظرة عامة على أداء المدرسة، نسب الحضور والغياب، وتقييم الكوادر التعليمية والإدارية.</p>
      <div className="flex flex-wrap gap-3">
        <button className="bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-400 transition-all flex items-center gap-2 active:scale-95"><Activity className="w-5 h-5"/> الإحصائيات العامة</button>
        <button className="bg-white/10 text-white border border-white/20 px-8 py-4 rounded-2xl font-black hover:bg-white/20 transition-all flex items-center gap-2 active:scale-95"><Users className="w-5 h-5"/> إدارة الطاقم</button>
        <button className="bg-white/10 text-white border border-white/20 px-8 py-4 rounded-2xl font-black hover:bg-white/20 transition-all flex items-center gap-2 active:scale-95"><FileText className="w-5 h-5"/> التقارير الرسمية</button>
      </div>
    </div>
  );

  const DefaultWorkspace = ({ categoryName }: { categoryName: string }) => (
    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 shadow-inner">
      <Building2 className="w-12 h-12 mb-4 text-slate-400" />
      <h2 className="text-2xl font-black mb-2 text-slate-800">قسم: {categoryName}</h2>
      <p className="font-bold text-slate-500">مرحباً بك في مساحة العمل الخاصة بك. سيتم تفعيل الأدوات المخصصة لقسمك قريباً.</p>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-cairo pt-6" 
      dir="rtl"
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-8 sm:p-10 rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden mb-8">
        <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 z-0"></div>
        <div className="flex items-center gap-6 z-10 w-full md:w-auto">
          <div className="h-20 w-20 shrink-0 bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-[1.5rem] flex items-center justify-center text-3xl font-black shadow-lg shadow-indigo-200">
            {staffData.users?.full_name?.charAt(0)}
          </div>
          <div>
            <div className="flex items-center flex-wrap gap-3 mb-1">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{staffData.users?.full_name}</h1>
              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg border border-slate-200 uppercase tracking-wider">{staffData.job_category}</span>
            </div>
            <p className="text-indigo-600 font-black text-lg">{staffData.job_title}</p>
          </div>
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center min-w-[150px] z-10 w-full md:w-auto">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" /> نطاق الصلاحيات
          </div>
          <div className="text-sm font-black text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg inline-block border border-indigo-100">
            {staffData.scope_stage}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-black text-slate-800 px-2 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-500"/> أدوات مساحة العمل المعتمدة لك
          </h2>

          {hasNoPermissions ? (
            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-[2rem] p-10 text-center">
              <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-black text-slate-700 mb-2">لا توجد صلاحيات مفعلة</h3>
              <p className="text-slate-500 font-bold text-sm">لم يقم مدير النظام بتعيين أدوات لك حتى الآن. سيتم تحديث شاشتك تلقائياً فور تكليفك بمهام.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {staffData.job_category === 'قيادة عليا' && <div className="col-span-full"><LeadershipModule /></div>}
              {staffData.job_category === 'رعاية وإرشاد' && <div className="col-span-full"><GuidanceModule /></div>}
              {staffData.job_category === 'إدارة ومالية' && <div className="col-span-full"><FinanceModule /></div>}
              {!['قيادة عليا', 'رعاية وإرشاد', 'إدارة ومالية'].includes(staffData.job_category) && (
                <div className="col-span-full"><DefaultWorkspace categoryName={staffData.job_category} /></div>
              )}

              {/* 🛠️ أداة: استعراض ملفات الطلاب */}
              {hasPerm('view_students') && (
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Users className="w-6 h-6"/></div>
                  <h3 className="font-black text-slate-800 text-lg mb-1">سجل الطلاب الشامل</h3>
                  <p className="text-slate-500 text-xs font-bold mb-4">الاطلاع على الملفات، البيانات الأساسية، والبحث المتقدم.</p>
                  <button className="w-full py-2.5 bg-slate-50 text-sky-600 font-black text-sm rounded-xl hover:bg-sky-50 transition-colors">فتح السجل</button>
                </div>
              )}

              {hasPerm('manage_attendance') && (
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><ClipboardList className="w-6 h-6"/></div>
                  <h3 className="font-black text-slate-800 text-lg mb-1">الغياب والحضور</h3>
                  <p className="text-slate-500 text-xs font-bold mb-4">تسجيل وتبرير الغياب اليومي للطلاب واستخراج كشوف الحرمان.</p>
                  <button className="w-full py-2.5 bg-slate-50 text-rose-600 font-black text-sm rounded-xl hover:bg-rose-50 transition-colors">إدارة الكشوف</button>
                </div>
              )}

              {hasPerm('issue_warnings') && (
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><AlertTriangle className="w-6 h-6"/></div>
                  <h3 className="font-black text-slate-800 text-lg mb-1">التقارير والإنذارات</h3>
                  <p className="text-slate-500 text-xs font-bold mb-4">إصدار إنذارات السلوك والغياب وطباعة التعهدات الرسمية.</p>
                  <button className="w-full py-2.5 bg-slate-50 text-amber-600 font-black text-sm rounded-xl hover:bg-amber-50 transition-colors">إصدار تقرير جديد</button>
                </div>
              )}

              {/* 🚀 🛠️ أداة: ربط أولياء الأمور (مُحَدثة لتبحث عن الطالب أولاً) */}
              {hasPerm('link_parents') && (
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-[2rem] shadow-lg text-white md:col-span-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
                  
                  <div className="flex items-start justify-between mb-6 relative z-10">
                    <div>
                      <h3 className="font-black text-xl mb-1 flex items-center gap-2"><UserPlus className="w-5 h-5 text-indigo-300"/> مكتب استقبال أولياء الأمور</h3>
                      <p className="text-indigo-200 text-xs font-bold">ابحث عن الطالب أولاً، ثم قم بربطه برقم هوية ولي أمره.</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 relative z-10">
                    {/* خطوة 1: البحث عن الطالب */}
                    <form onSubmit={handleSearchStudent} className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-300" />
                        <input 
                          type="text" 
                          required
                          value={searchStudentId}
                          onChange={(e) => setSearchStudentId(e.target.value)}
                          placeholder="أدخل الرقم المدني للطالب..." 
                          className="w-full bg-white/10 border border-white/20 text-white placeholder:text-indigo-300 rounded-xl py-3.5 pr-10 pl-4 font-bold outline-none focus:bg-white/20 transition-all"
                          dir="ltr"
                          style={{ textAlign: 'right' }}
                        />
                      </div>
                      <button 
                        type="submit" 
                        disabled={linkStatus.type === 'loading' || !!foundStudent}
                        className="bg-indigo-500 text-white border border-indigo-400/50 font-black px-6 py-3.5 rounded-xl hover:bg-indigo-400 transition-colors active:scale-95 disabled:opacity-50 whitespace-nowrap flex justify-center items-center"
                      >
                        {linkStatus.type === 'loading' && !foundStudent ? <Loader2 className="w-5 h-5 animate-spin"/> : 'بحث عن الطالب'}
                      </button>
                    </form>

                    {/* خطوة 2: ظهور الطالب وحقل إدخال ولي الأمر */}
                    <AnimatePresence>
                      {foundStudent && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          className="bg-white/10 border border-white/20 p-5 rounded-xl backdrop-blur-sm"
                        >
                          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
                            <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-lg"><UserCheck className="w-5 h-5" /></div>
                            <div>
                              <div className="text-xs font-bold text-indigo-200 mb-0.5">الطالب المحدد</div>
                              <div className="font-black text-white">{foundStudent.users?.full_name}</div>
                            </div>
                            {foundStudent.parent_id && (
                              <span className="mr-auto text-[10px] font-black bg-amber-500/20 text-amber-200 px-2 py-1 rounded-md">
                                لديه ولي أمر مسبقاً (سيتم استبداله)
                              </span>
                            )}
                          </div>

                          <form onSubmit={handleLinkParent} className="flex flex-col sm:flex-row gap-3">
                            <input 
                              type="text" 
                              required
                              value={parentCivilId}
                              onChange={(e) => setParentCivilId(e.target.value)}
                              placeholder="الرقم المدني لولي الأمر..." 
                              className="flex-1 bg-white border border-white/50 text-slate-900 placeholder:text-slate-400 rounded-xl py-3 px-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                              dir="ltr"
                              style={{ textAlign: 'right' }}
                            />
                            <button 
                              type="submit" 
                              disabled={linkStatus.type === 'loading'}
                              className="bg-emerald-500 text-white font-black px-6 py-3 rounded-xl hover:bg-emerald-600 transition-colors active:scale-95 disabled:opacity-70 whitespace-nowrap flex justify-center items-center gap-2 shadow-lg shadow-emerald-500/20"
                            >
                              {linkStatus.type === 'loading' ? <Loader2 className="w-5 h-5 animate-spin"/> : <><PlusCircle className="w-5 h-5"/> ربط واعتـمـاد</>}
                            </button>
                          </form>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* رسائل التنبيه والنجاح */}
                    <AnimatePresence>
                      {linkStatus.msg && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }} 
                          animate={{ opacity: 1, height: 'auto' }} 
                          exit={{ opacity: 0, height: 0 }}
                          className={`overflow-hidden rounded-lg border ${
                            linkStatus.type === 'success' ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-100' : 
                            linkStatus.type === 'error' ? 'bg-rose-500/20 border-rose-400/30 text-rose-100' :
                            'bg-white/5 border-white/10 text-indigo-100'
                          }`}
                        >
                          <div className="px-4 py-2.5 text-sm font-bold">{linkStatus.msg}</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {hasPerm('manage_schedules') && (
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="w-12 h-12 bg-fuchsia-50 text-fuchsia-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><CalendarDays className="w-6 h-6"/></div>
                  <h3 className="font-black text-slate-800 text-lg mb-1">الجدول المدرسي</h3>
                  <p className="text-slate-500 text-xs font-bold mb-4">بناء وتعديل جداول الحصص الأسبوعية للمعلمين والفصول.</p>
                  <button className="w-full py-2.5 bg-slate-50 text-fuchsia-600 font-black text-sm rounded-xl hover:bg-fuchsia-50 transition-colors">إدارة الجدول</button>
                </div>
              )}

              {hasPerm('view_grades') && (
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><GraduationCap className="w-6 h-6"/></div>
                  <h3 className="font-black text-slate-800 text-lg mb-1">الدرجات والشهادات</h3>
                  <p className="text-slate-500 text-xs font-bold mb-4">متابعة تحصيل الطلاب واستخراج كشوف الدرجات والشهادات.</p>
                  <button className="w-full py-2.5 bg-slate-50 text-teal-600 font-black text-sm rounded-xl hover:bg-teal-50 transition-colors">سجل الدرجات</button>
                </div>
              )}

            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
             <div className="inline-flex items-center gap-2 bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest mb-6 w-fit border border-slate-200">
               <Sparkles className="w-4 h-4"/> مساحة مشتركة
             </div>
             
             <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2">
               <Bell className="w-5 h-5 text-amber-500" /> التعاميم الداخلية
             </h3>
             <p className="text-slate-500 font-bold mb-6 text-sm">تنبيهات الإدارة والقرارات المستعجلة.</p>
             
             <div className="space-y-3 mb-8">
               <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                 <h4 className="font-black text-amber-800 text-sm mb-1">تحديث سجلات الغياب</h4>
                 <p className="text-xs font-bold text-amber-700/70">يرجى من جميع الأخصائيين إغلاق سجلات الغياب قبل الساعة 10 صباحاً.</p>
               </div>
               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                 <h4 className="font-black text-slate-700 text-sm mb-1">اجتماع الكادر الأسبوعي</h4>
                 <p className="text-xs font-bold text-slate-500">تم تأجيل الاجتماع ليوم الخميس في مسرح المدرسة.</p>
               </div>
             </div>

             <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
               <FileText className="w-5 h-5 text-indigo-500" /> المهام السريعة
             </h3>
             <button className="w-full text-right px-4 py-3 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-bold text-sm rounded-xl transition-colors mb-2">تقديم طلب إجازة أو استئذان</button>
             <button className="w-full text-right px-4 py-3 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-bold text-sm rounded-xl transition-colors">صيانة تقنية (فتح تذكرة)</button>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
