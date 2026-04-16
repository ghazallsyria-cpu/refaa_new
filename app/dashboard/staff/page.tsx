/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
// 🚀 استدعاء الـ Hook الأصلي للإدارة للاستفادة من قدراته الكاملة
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

  // 🚀 جلب قدرات الإدارة الخاصة بأولياء الأمور
  const { students: allStudents, fetchStudents, addParent } = useUsersSystem();

  // حالات تطبيق "ربط ولي الأمر"
  const [searchStudentId, setSearchStudentId] = useState('');
  const [foundStudent, setFoundStudent] = useState<any>(null);
  
  // نموذج كامل لإضافة ولي الأمر بالطريقة الرسمية
  const [parentForm, setParentForm] = useState({ full_name: '', national_id: '', phone: '', email: '' });
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
          
          // إذا كان لديه صلاحية ربط أولياء الأمور، نقوم بتحميل قائمة الطلاب
          if (data.permissions['link_parents']) {
            fetchStudents();
          }
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setLoading(false);
      }
    }
    
    if (!isChecking) loadWorkspace();
  }, [user, isChecking, fetchStudents]);

  // البحث عن الطالب (محلياً من القائمة المحملة بدلاً من طلب جديد)
  const handleSearchStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchStudentId) return;
    
    setLinkStatus({type: 'loading', msg: 'جاري البحث في السجلات...'});
    
    // البحث في القائمة المحملة مسبقاً من useUsersSystem
    const student = allStudents.find(s => s.national_id === searchStudentId);
    
    setTimeout(() => {
      if (student) {
        setFoundStudent(student);
        // توليد اسم افتراضي لولي الأمر بناءً على اسم الطالب
        const studentNameParts = student.users?.full_name?.split(' ') || [];
        const defaultParentName = studentNameParts.length > 2 
          ? `${studentNameParts[1]} ${studentNameParts[2]} ${studentNameParts[3] || ''}`.trim()
          : '';
          
        setParentForm(prev => ({ ...prev, full_name: defaultParentName }));
        setLinkStatus({type: 'idle', msg: ''});
      } else {
        setFoundStudent(null);
        setLinkStatus({type: 'error', msg: 'لم يتم العثور على طالب بهذا الرقم المدني.'});
      }
    }, 500); // محاكاة تحميل بسيط للواجهة
  };

  // 🚀 دالة إضافة ولي الأمر باستخدام أداة الإدارة الأصلية
// 🚀 دالة إضافة أو ربط ولي الأمر (محدثة بذكاء للتعامل مع الأبناء المتعددين)
// 🚀 دالة إضافة أو ربط ولي الأمر (النسخة الذكية والنهائية للتعامل مع الأبناء المتعددين)
// 🚀 دالة إضافة أو ربط ولي الأمر (النسخة الفولاذية المنيعة)
const handleCreateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundStudent || !parentForm.national_id) {
      setLinkStatus({type: 'error', msg: 'يرجى إدخال الرقم المدني لولي الأمر.'});
      return;
    }

    setLinkStatus({type: 'loading', msg: 'جاري التحقق من السجلات والربط...'});

    try {
      // 1. نبحث أولاً في جدول users لنتأكد إذا كان الحساب مسجلاً مسبقاً (كشبح أو حقيقي)
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id, full_name, role')
        .eq('national_id', parentForm.national_id)
        .maybeSingle();

      let targetParentId = null;

      if (existingUser) {
        // 🌟 حالة (الشبح أو الأب الموجود مسبقاً)
        targetParentId = existingUser.id;
        
        // 🚀 الحركة السحرية: فرض إدخال البيانات في جدول parents لكي يراه المدير فوراً
        // نستخدم upsert لإنشاء الصف إذا لم يكن موجوداً (تحويل الشبح لحقيقي)
        const { error: parentError } = await supabase
          .from('parents')
          .upsert({ 
            id: targetParentId, 
            national_id: parentForm.national_id,
            job_title: parentForm.job_title || '',
            address: parentForm.address || ''
          }, { onConflict: 'id' });

        if (parentError) throw parentError;
        
        setLinkStatus({type: 'success', msg: `تم التعرف على الحساب وربط الطالب بولي الأمر (${existingUser.full_name}) بنجاح.`});

      } else {
        // 🌟 حالة ولي أمر جديد كلياً
        if (!parentForm.full_name) {
          setLinkStatus({type: 'error', msg: 'يرجى كتابة اسم ولي الأمر الكامل لإنشاء حسابه.'});
          return;
        }

        const email = parentForm.email || `${parentForm.national_id}@alrefaa.edu`;
        const { data: { session } } = await supabase.auth.getSession();
        
        // إنشاء الحساب في Auth عبر الـ API
        const response = await fetch('/api/users/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({ 
            email: email, 
            password: '123456', 
            full_name: parentForm.full_name, 
            national_id: parentForm.national_id,
            phone: parentForm.phone || '',
            role: 'parent' 
          }),
        });
        
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        targetParentId = result.user.id;

        // 🚀 زرع البيانات في جدول parents لضمان الظهور عند المدير
        const { error: parentError } = await supabase
          .from('parents')
          .insert({ 
            id: targetParentId, 
            national_id: parentForm.national_id 
          });

        if (parentError) throw parentError;

        setLinkStatus({type: 'success', msg: `تم إنشاء حساب ولي الأمر بنجاح. (كلمة المرور: ${result.password})`});
      }

      // 3. الخطوة الأخيرة والأهم: ربط الطالب بمعرف ولي الأمر (سواء كان جديداً أو قديماً)
      if (targetParentId) {
        const { error: linkError } = await supabase
          .from('students')
          .update({ parent_id: targetParentId })
          .eq('id', foundStudent.id);

        if (linkError) throw linkError;
      }

      // تفريغ النموذج بعد النجاح
      setTimeout(() => {
        setFoundStudent(null);
        setSearchStudentId('');
        setParentForm({ full_name: '', national_id: '', phone: '', email: '', job_title: '', address: '' });
        setLinkStatus({type: 'idle', msg: ''});
      }, 5000);

    } catch (err: any) {
      console.error("Critical Error:", err);
      setLinkStatus({type: 'error', msg: err.message || 'حدث خطأ في عملية الربط.'});
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

  // ... (تم إخفاء باقي الوحدات المصغرة لتوفير المساحة، ستبقى كما هي)
  const FinanceModule = () => ( <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-[2.5rem] text-white shadow-xl hover:shadow-2xl transition-all duration-300"> <Calculator className="w-12 h-12 mb-4 opacity-80" /> <h2 className="text-2xl font-black mb-2">البوابة المالية والإدارية</h2> <p className="font-bold opacity-90 mb-6">إدارة الرسوم الدراسية، الرواتب، والميزانية التشغيلية.</p> </div> );
  const GuidanceModule = () => ( <div className="bg-gradient-to-br from-rose-500 to-pink-600 p-8 rounded-[2.5rem] text-white shadow-xl hover:shadow-2xl transition-all duration-300"> <HeartPulse className="w-12 h-12 mb-4 opacity-80" /> <h2 className="text-2xl font-black mb-2">شؤون الرعاية والإرشاد</h2> <p className="font-bold opacity-90 mb-6">متابعة الحالات السلوكية، النفسية، والصحية للطلاب.</p> </div> );
  const LeadershipModule = () => ( <div className="bg-gradient-to-br from-indigo-800 to-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl hover:shadow-2xl transition-all duration-300 col-span-full"> <Shield className="w-12 h-12 mb-4 opacity-80 text-indigo-400" /> <h2 className="text-3xl font-black mb-2">مركز القيادة والتحكم</h2> <p className="font-bold text-indigo-200 mb-6 max-w-2xl">نظرة عامة على أداء المدرسة، نسب الحضور والغياب، وتقييم الكوادر التعليمية والإدارية.</p> </div> );
  const DefaultWorkspace = ({ categoryName }: { categoryName: string }) => ( <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 shadow-inner"> <Building2 className="w-12 h-12 mb-4 text-slate-400" /> <h2 className="text-2xl font-black mb-2 text-slate-800">قسم: {categoryName}</h2> <p className="font-bold text-slate-500">مرحباً بك في مساحة العمل الخاصة بك.</p> </div> );

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

              {/* باقي الأدوات... */}
              {hasPerm('view_students') && (
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Users className="w-6 h-6"/></div>
                  <h3 className="font-black text-slate-800 text-lg mb-1">سجل الطلاب الشامل</h3>
                  <button className="w-full py-2.5 bg-slate-50 text-sky-600 font-black text-sm rounded-xl mt-4">فتح السجل</button>
                </div>
              )}

              {/* 🚀 🛠️ أداة: ربط أولياء الأمور (مُحَدثة لتستخدم API الإدارة) */}
              {hasPerm('link_parents') && (
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 sm:p-8 rounded-[2.5rem] shadow-xl text-white md:col-span-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2"></div>
                  
                  <div className="flex items-start justify-between mb-6 relative z-10">
                    <div>
                      <h3 className="font-black text-2xl mb-2 flex items-center gap-3"><UserPlus className="w-6 h-6 text-indigo-300"/> مكتب استقبال أولياء الأمور</h3>
                      <p className="text-indigo-200 text-sm font-bold opacity-90">تسجيل ملف كامل لولي الأمر وربطه الفوري بملف الطالب.</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6 relative z-10">
                    {/* خطوة 1: البحث عن الطالب */}
                    <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20">
                      <form onSubmit={handleSearchStudent} className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300" />
                          <input 
                            type="text" required
                            value={searchStudentId} onChange={(e) => setSearchStudentId(e.target.value)}
                            placeholder="الرقم المدني للطالب..." 
                            className="w-full bg-slate-900/30 border border-indigo-400/30 text-white placeholder:text-indigo-300 rounded-xl py-3.5 pr-12 pl-4 font-bold outline-none focus:bg-slate-900/50 focus:border-indigo-400 transition-all text-lg"
                            dir="ltr" style={{ textAlign: 'right' }}
                          />
                        </div>
                        <button 
                          type="submit" disabled={linkStatus.type === 'loading' || !!foundStudent}
                          className="bg-indigo-500 text-white font-black px-8 py-3.5 rounded-xl hover:bg-indigo-400 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap shadow-lg shadow-indigo-500/20"
                        >
                          {linkStatus.type === 'loading' && !foundStudent ? <Loader2 className="w-5 h-5 animate-spin"/> : 'تحديد الطالب'}
                        </button>
                      </form>
                    </div>

                    {/* خطوة 2: إنشاء حساب ولي الأمر وربطه */}
                    <AnimatePresence>
                      {foundStudent && (
                        <motion.div 
                          initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          className="bg-white text-slate-900 p-6 sm:p-8 rounded-3xl shadow-2xl"
                        >
                          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><UserCheck className="w-6 h-6" /></div>
                              <div>
                                <div className="text-xs font-bold text-slate-400 mb-0.5">الطالب المستهدف</div>
                                <div className="font-black text-lg text-slate-800">{foundStudent.users?.full_name}</div>
                              </div>
                            </div>
                            <button onClick={() => {setFoundStudent(null); setLinkStatus({type:'idle',msg:''})}} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><X className="w-5 h-5"/></button>
                          </div>

                          <form onSubmit={handleCreateParent} className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                              <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">الاسم الكامل لولي الأمر</label>
                                <input type="text" required value={parentForm.full_name} onChange={e => setParentForm({...parentForm, full_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="الاسم الرباعي"/>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">الرقم المدني</label>
                                <input type="text" required value={parentForm.national_id} onChange={e => setParentForm({...parentForm, national_id: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-left" dir="ltr" placeholder="الرقم المدني"/>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">رقم الهاتف (اختياري)</label>
                                <input type="text" value={parentForm.phone} onChange={e => setParentForm({...parentForm, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-left" dir="ltr" placeholder="رقم التواصل"/>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">البريد الإلكتروني (اختياري)</label>
                                <input type="email" value={parentForm.email} onChange={e => setParentForm({...parentForm, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-left" dir="ltr" placeholder="example@domain.com"/>
                              </div>
                            </div>

                            <button 
                              type="submit" disabled={linkStatus.type === 'loading'}
                              className="w-full bg-emerald-500 text-white font-black px-6 py-4 rounded-xl hover:bg-emerald-600 transition-colors active:scale-95 disabled:opacity-70 flex justify-center items-center gap-2 shadow-lg shadow-emerald-500/20 mt-4 text-lg"
                            >
                              {linkStatus.type === 'loading' ? <Loader2 className="w-6 h-6 animate-spin"/> : <><PlusCircle className="w-6 h-6"/> تسجيل الحساب واعتماد الربط بالطالب</>}
                            </button>
                          </form>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* رسائل التنبيه والنجاح */}
                    <AnimatePresence>
                      {linkStatus.msg && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          className={`overflow-hidden rounded-xl border mt-4 ${
                            linkStatus.type === 'success' ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-100' : 
                            linkStatus.type === 'error' ? 'bg-rose-500/20 border-rose-400/30 text-rose-100' : 'bg-white/5 border-white/10 text-indigo-100'
                          }`}
                        >
                          <div className="p-4 font-bold text-sm leading-relaxed">{linkStatus.msg}</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
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
             <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2"><Bell className="w-5 h-5 text-amber-500" /> التعاميم الداخلية</h3>
             <button className="w-full text-right px-4 py-3 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-bold text-sm rounded-xl transition-colors mb-2">تقديم طلب إجازة أو استئذان</button>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
