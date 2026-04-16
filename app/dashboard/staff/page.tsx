/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { 
  Shield, HeartPulse, Briefcase, Calculator, 
  Users, Activity, Loader2, Sparkles, Building2,
  FileText, Bell, CheckCircle
} from 'lucide-react';

// ==========================================
// 🧩 1. الوحدات المصغرة الذكية (Smart Modules)
// ==========================================

// وحدة الإدارة والمالية
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

// وحدة الرعاية والإرشاد
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

// وحدة القيادة العليا
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

// الوحدة الافتراضية (لأي فئة جديدة يضيفها المدير)
const DefaultWorkspace = ({ categoryName }: { categoryName: string }) => (
  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 shadow-inner">
    <Building2 className="w-12 h-12 mb-4 text-slate-400" />
    <h2 className="text-2xl font-black mb-2 text-slate-800">قسم: {categoryName}</h2>
    <p className="font-bold text-slate-500">مرحباً بك في مساحة العمل الخاصة بك. سيتم تفعيل الأدوات المخصصة لقسمك قريباً.</p>
  </div>
);

// ==========================================
// 🚀 2. المحرك الديناميكي للمنصة (The Engine)
// ==========================================

export default function StaffDashboardPage() {
  const { user, isChecking } = useAuth();
  const [staffData, setStaffData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWorkspace() {
      if (!user) return;
      try {
        // جلب بيانات الموظف من جدول school_staff وربطها بالاسم من جدول users
        const { data, error } = await supabase
          .from('school_staff')
          .select('*, users!school_staff_id_fkey(full_name, email)')
          .eq('id', user.id)
          .single();
          
        if (!error && data) {
          setStaffData(data);
        } else {
          console.error("Error fetching staff profile:", error);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setLoading(false);
      }
    }
    
    if (!isChecking) {
      loadWorkspace();
    }
  }, [user, isChecking]);

  if (isChecking || loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
        <p className="font-bold text-slate-500 animate-pulse">جاري تجهيز مساحة العمل...</p>
      </div>
    );
  }

  if (!staffData) {
    return (
      <div className="flex items-center justify-center h-[80vh] font-cairo">
        <div className="text-center p-10 bg-rose-50 rounded-3xl border border-rose-100 max-w-md">
          <HeartPulse className="w-16 h-16 text-rose-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-rose-700 mb-2">ملف غير مكتمل</h2>
          <p className="font-bold text-rose-600">حدث خطأ في تحميل ملفك الوظيفي. يرجى مراجعة إدارة النظام للتأكد من تسجيل بياناتك بشكل صحيح.</p>
        </div>
      </div>
    );
  }

  // 🧠 المحرك الحقيقي: توجيه الوحدات بناءً على الفئة الوظيفية
  const renderWorkspace = () => {
    const category = staffData.job_category;
    
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        
        {/* الوحدات المخصصة حسب القسم */}
        {category === 'قيادة عليا' && <LeadershipModule />}
        {category === 'رعاية وإرشاد' && <GuidanceModule />}
        {category === 'إدارة ومالية' && <FinanceModule />}

        {/* عرض الوحدة الافتراضية إذا كانت الفئة غير معروفة (جديدة) */}
        {!['قيادة عليا', 'رعاية وإرشاد', 'إدارة ومالية'].includes(category) && (
          <DefaultWorkspace categoryName={category} />
        )}

        {/* مساحة مشتركة (تظهر لجميع الموظفين بغض النظر عن قسمهم) */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-center hover:border-indigo-100 transition-colors">
           <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest mb-4 w-fit">
             <Sparkles className="w-4 h-4"/> مساحة مشتركة
           </div>
           <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2">
             <Bell className="w-5 h-5 text-amber-500" /> التعاميم والمهام الإدارية
           </h3>
           <p className="text-slate-500 font-bold mb-6 text-sm">متابعة آخر القرارات الإدارية، طلبات الإجازة، والمراسلات الداخلية.</p>
           
           <div className="space-y-3 mb-6">
             <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
               <CheckCircle className="w-5 h-5 text-emerald-500" />
               <span className="font-bold text-sm text-slate-700">تحديث سجلات الحضور والانصراف (مكتمل)</span>
             </div>
           </div>

           <button className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-black hover:bg-slate-800 transition-all shadow-lg active:scale-95">صندوق الوارد الداخلي</button>
        </div>
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-cairo pt-6" 
      dir="rtl"
    >
      {/* الترحيب والبطاقة الشخصية للموظف */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-8 sm:p-10 rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
        
        {/* خلفية تجميلية */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 z-0"></div>

        <div className="flex items-center gap-6 z-10 w-full md:w-auto">
          <div className="h-20 w-20 shrink-0 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-[1.5rem] flex items-center justify-center text-3xl font-black shadow-lg shadow-indigo-200">
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
        
        <div className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 text-center min-w-[150px] z-10 w-full md:w-auto">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" /> نطاق الصلاحيات
          </div>
          <div className="text-sm font-black text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg inline-block">
            {staffData.scope_stage}
          </div>
        </div>
      </div>

      {/* 🚀 استدعاء محرك مساحات العمل لتركيب الشاشة الخاصة به */}
      {renderWorkspace()}
      
    </motion.div>
  );
}
