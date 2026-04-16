/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { 
  Shield, Users, Loader2, Sparkles, 
  FileText, Bell, CheckCircle, Search, 
  UserPlus, AlertTriangle, CalendarDays, GraduationCap, ClipboardList
} from 'lucide-react';

export default function StaffDashboardPage() {
  const { user, isChecking } = useAuth();
  const [staffData, setStaffData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // حالة لتطبيق "ربط ولي الأمر" المصغر
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
          // ضمان وجود كائن الصلاحيات حتى لو كان فارغاً
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

  // محاكاة لدالة ربط ولي الأمر بالطالب (نواة للعمل الحقيقي لاحقاً)
  const handleLinkParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentCivilId) return;
    setLinkStatus({type: 'loading', msg: 'جاري البحث في السجلات...'});
    
    setTimeout(() => {
      // هنا سنضع لاحقاً كود Supabase الفعلي للبحث عن ولي الأمر وربطه
      setLinkStatus({type: 'success', msg: `تم تفعيل حساب ولي الأمر (${parentCivilId}) بنجاح وربطه بالطلاب.`});
      setParentCivilId('');
      setTimeout(() => setLinkStatus({type: 'idle', msg: ''}), 4000);
    }, 1500);
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

  // 🧠 مساعد للتحقق من الصلاحيات
  const hasPerm = (key: string) => staffData.permissions[key] === true;

  // التحقق مما إذا كان الموظف لا يملك أي صلاحيات على الإطلاق
  const hasNoPermissions = Object.values(staffData.permissions).every(val => val === false) || Object.keys(staffData.permissions).length === 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-cairo pt-6" 
      dir="rtl"
    >
      {/* 💳 الترحيب والبطاقة الشخصية */}
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
        
        {/* 🚀 العمود الأيمن/الوسط: الأدوات المبنية على الصلاحيات */}
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
              
              {/* 🛠️ أداة: استعراض ملفات الطلاب */}
              {hasPerm('view_students') && (
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Users className="w-6 h-6"/></div>
                  <h3 className="font-black text-slate-800 text-lg mb-1">سجل الطلاب الشامل</h3>
                  <p className="text-slate-500 text-xs font-bold mb-4">الاطلاع على الملفات، البيانات الأساسية، والبحث المتقدم.</p>
                  <button className="w-full py-2.5 bg-slate-50 text-sky-600 font-black text-sm rounded-xl hover:bg-sky-50 transition-colors">فتح السجل</button>
                </div>
              )}

              {/* 🛠️ أداة: إدارة الغياب */}
              {hasPerm('manage_attendance') && (
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><ClipboardList className="w-6 h-6"/></div>
                  <h3 className="font-black text-slate-800 text-lg mb-1">الغياب والحضور</h3>
                  <p className="text-slate-500 text-xs font-bold mb-4">تسجيل وتبرير الغياب اليومي للطلاب واستخراج كشوف الحرمان.</p>
                  <button className="w-full py-2.5 bg-slate-50 text-rose-600 font-black text-sm rounded-xl hover:bg-rose-50 transition-colors">إدارة الكشوف</button>
                </div>
              )}

              {/* 🛠️ أداة: الإنذارات والتقارير */}
              {hasPerm('issue_warnings') && (
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><AlertTriangle className="w-6 h-6"/></div>
                  <h3 className="font-black text-slate-800 text-lg mb-1">التقارير والإنذارات</h3>
                  <p className="text-slate-500 text-xs font-bold mb-4">إصدار إنذارات السلوك والغياب وطباعة التعهدات الرسمية.</p>
                  <button className="w-full py-2.5 bg-slate-50 text-amber-600 font-black text-sm rounded-xl hover:bg-amber-50 transition-colors">إصدار تقرير جديد</button>
                </div>
              )}

              {/* 🛠️ أداة: ربط أولياء الأمور (التطبيق المصغر الذي طلبته) */}
              {hasPerm('link_parents') && (
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-[2rem] shadow-lg text-white md:col-span-2">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="font-black text-xl mb-1 flex items-center gap-2"><UserPlus className="w-5 h-5 text-indigo-300"/> مكتب استقبال أولياء الأمور</h3>
                      <p className="text-indigo-200 text-xs font-bold">إضافة رقم مدني لولي أمر لتمكينه من الدخول ومتابعة أبنائه.</p>
                    </div>
                  </div>
                  
                  <form onSubmit={handleLinkParent} className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-300" />
                      <input 
                        type="text" 
                        required
                        value={parentCivilId}
                        onChange={(e) => setParentCivilId(e.target.value)}
                        placeholder="أدخل الرقم المدني لولي الأمر..." 
                        className="w-full bg-white/10 border border-white/20 text-white placeholder:text-indigo-300 rounded-xl py-3.5 pr-10 pl-4 font-bold outline-none focus:bg-white/20 transition-all"
                        dir="ltr"
                        style={{ textAlign: 'right' }}
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={linkStatus.type === 'loading'}
                      className="bg-white text-indigo-700 font-black px-6 py-3.5 rounded-xl hover:bg-indigo-50 transition-colors active:scale-95 disabled:opacity-70 whitespace-nowrap flex justify-center items-center"
                    >
                      {linkStatus.type === 'loading' ? <Loader2 className="w-5 h-5 animate-spin"/> : 'بحث وربط'}
                    </button>
                  </form>

                  <AnimatePresence>
                    {linkStatus.msg && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }} 
                        exit={{ opacity: 0, height: 0 }}
                        className={`mt-4 text-sm font-bold px-4 py-2.5 rounded-lg border ${linkStatus.type === 'success' ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-100' : 'bg-white/10 border-white/20 text-indigo-100'}`}
                      >
                        {linkStatus.msg}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* 🛠️ أداة: إدارة الجداول */}
              {hasPerm('manage_schedules') && (
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="w-12 h-12 bg-fuchsia-50 text-fuchsia-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><CalendarDays className="w-6 h-6"/></div>
                  <h3 className="font-black text-slate-800 text-lg mb-1">الجدول المدرسي</h3>
                  <p className="text-slate-500 text-xs font-bold mb-4">بناء وتعديل جداول الحصص الأسبوعية للمعلمين والفصول.</p>
                  <button className="w-full py-2.5 bg-slate-50 text-fuchsia-600 font-black text-sm rounded-xl hover:bg-fuchsia-50 transition-colors">إدارة الجدول</button>
                </div>
              )}

              {/* 🛠️ أداة: السجل الأكاديمي */}
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

        {/* 🏢 العمود الأيسر: المساحة المشتركة والتعليمات (تظهر للجميع) */}
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
