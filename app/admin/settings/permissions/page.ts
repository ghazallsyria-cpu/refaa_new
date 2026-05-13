// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, Lock, ChevronDown, Save, RefreshCcw, 
  UserCircle, GraduationCap, Users, ShieldAlert, Sparkles,
  Info, CheckCircle2, AlertTriangle, Eye, EyeOff
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

// نستخدم نفس مصفوفة الروابط لضمان التطابق التام
// ملاحظة: في مشروعك الحقيقي يفضل وضع هذه المصفوفة في ملف خارجي واستيرادها هنا وفي السايد بار
const navigationGroups = [
  { title: 'شؤون أكاديمية وطلابية', items: ['الطلاب', 'الفصول', 'المواد الدراسية', 'أولياء الأمور', 'الهيكل الأكاديمي'] },
  { title: 'شؤون المعلمين (HR)', items: ['المعلمين', 'متابعة المعلمين', 'تقرير المعلمين', 'تعيينات المعلمين'] },
  { title: 'الكنترول والامتحانات', items: ['مستكشف الطلاب 360', 'الاختبارات والدرجات', 'الغلاف الرقمي', 'رادار الكنترول'] },
  { title: 'الانضباط المدرسي', items: ['الرادار الرقمي', 'رصد الغياب الآلي', 'إنذارات الغياب', 'الحضور والغياب'] },
  { title: 'العمليات والساحة', items: ['الجدول الدراسي', 'شاشة العرض المركزية', 'الواجبات', 'ساحة التدريب', 'مراقبة الساحة', 'الواجبات بالذكاء الاصطناعي'] },
  { title: 'التواصل والنظام', items: ['المنتديات', 'الرسائل', 'الإعلانات', 'إدارة الأوسمة', 'مصنع الدروع', 'المستندات'] }
];

const roles = [
  { id: 'teacher', name: 'المعلمون', icon: UserCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { id: 'student', name: 'الطلاب', icon: GraduationCap, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'parent', name: 'أولياء الأمور', icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/10' }
];

export default function PermissionsManagementPage() {
  const { authRole } = useAuth() as any;
  const [dbPermissions, setDbPermissions] = useState<Record<string, string[]>>({ teacher: [], student: [], parent: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeRole, setActiveTab] = useState('teacher');

  // جلب الصلاحيات الحالية من قاعدة البيانات
  useEffect(() => {
    async function fetchPerms() {
      try {
        const { data, error } = await supabase.from('platform_settings').select('role_permissions').single();
        if (data?.role_permissions) {
          setDbPermissions(data.role_permissions);
        }
      } catch (e) {
        console.error("Error loading perms", e);
      } finally {
        setLoading(false);
      }
    }
    fetchPerms();
  }, []);

  const togglePermission = (roleId: string, itemName: string) => {
    setDbPermissions(prev => {
      const currentRolePerms = prev[roleId] || [];
      const newPerms = currentRolePerms.includes(itemName)
        ? currentRolePerms.filter(i => i !== itemName)
        : [...currentRolePerms, itemName];
      return { ...prev, [roleId]: newPerms };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .update({ role_permissions: dbPermissions })
        .eq('id', 1); // نفترض أن الإعدادات دائماً في الصف رقم 1

      if (error) throw error;
      alert('تم تحديث الصلاحيات فورياً لجميع المستخدمين! 🚀');
    } catch (e) {
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (authRole !== 'admin') return <div className="p-10 text-center font-black text-white">غير مصرح لك بدخول منطقة العمليات السيادية.</div>;

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-200 font-sans pb-20 relative overflow-x-hidden pt-24" dir="rtl">
      
      {/* 🌌 الخلفية الهولوغرافية */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-900/20 rounded-full blur-[120px]"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-blue-900/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-xl">
           <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/40 shadow-inner">
                 <ShieldCheck className="w-9 h-9 text-indigo-400 drop-shadow-md" />
              </div>
              <div>
                 <h1 className="text-2xl sm:text-3xl font-black text-white drop-shadow-md">مهندس الصلاحيات المركزية</h1>
                 <p className="text-slate-400 text-sm font-bold mt-1">تحكم ديناميكي كامل فيما يراه كل مستخدم في النظام.</p>
              </div>
           </div>
           <button 
             onClick={handleSave} 
             disabled={saving}
             className="w-full md:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_0_20px_rgba(99,102,241,0.4)] disabled:opacity-50"
           >
             {saving ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
             حفظ وتطبيق التغييرات
           </button>
        </div>

        {/* Roles Tabs */}
        <div className="flex gap-2 mb-8 bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
           {roles.map(role => (
             <button
               key={role.id}
               onClick={() => setActiveTab(role.id)}
               className={cn(
                 "flex-1 flex items-center justify-center gap-3 py-4 rounded-xl font-black text-sm transition-all duration-300",
                 activeRole === role.id ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:bg-white/5 hover:text-white"
               )}
             >
               <role.icon className="w-5 h-5" /> {role.name}
             </button>
           ))}
        </div>

        {/* Permissions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {navigationGroups.map((group, gIdx) => (
             <motion.div 
               initial={{ opacity: 0, y: 20 }} 
               animate={{ opacity: 1, y: 0 }} 
               transition={{ delay: gIdx * 0.05 }}
               key={group.title} 
               className="bg-[#0f1423]/60 backdrop-blur-md border border-white/10 rounded-[2rem] p-6 shadow-xl"
             >
                <h3 className="text-lg font-black text-indigo-300 mb-5 flex items-center gap-3 pb-3 border-b border-white/5">
                   <Sparkles className="w-5 h-5" /> {group.title}
                </h3>
                <div className="space-y-3">
                   {group.items.map(item => {
                     const isChecked = dbPermissions[activeRole]?.includes(item);
                     return (
                       <div 
                         key={item} 
                         onClick={() => togglePermission(activeRole, item)}
                         className={cn(
                           "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-300 group",
                           isChecked 
                             ? "bg-indigo-500/10 border-indigo-500/40 text-white shadow-inner" 
                             : "bg-white/5 border-transparent text-slate-500 hover:border-white/10 hover:text-slate-300"
                         )}
                       >
                          <div className="flex items-center gap-3">
                             {isChecked ? <Eye className="w-4 h-4 text-indigo-400" /> : <EyeOff className="w-4 h-4" />}
                             <span className="font-bold text-sm">{item}</span>
                          </div>
                          <div className={cn(
                             "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                             isChecked ? "bg-indigo-500 border-indigo-400 scale-110" : "border-slate-700"
                          )}>
                             {isChecked && <CheckCircle2 className="w-4 h-4 text-white" />}
                          </div>
                       </div>
                     );
                   })}
                </div>
             </motion.div>
           ))}
        </div>

        {/* Safety Note */}
        <div className="mt-10 p-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-4">
           <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-1" />
           <div>
              <h4 className="text-amber-400 font-black text-sm">ملاحظة أمنية:</h4>
              <p className="text-slate-400 text-xs font-bold leading-relaxed mt-1">
                 رتبة (المدير العام) و (الإدارة) تملك صلاحية الوصول الافتراضي لكل شيء ولا تتأثر بهذه الإعدادات لضمان عدم قفل النظام عن طريق الخطأ. التغييرات هنا تطبق فورياً على المعلمين، الطلاب، وأولياء الأمور بمجرد ضغط زر الحفظ.
              </p>
           </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}} />
    </div>
  );
}
