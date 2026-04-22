/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, HeartPulse, Briefcase, Plus, Search, Edit, Trash2, X, 
  Building2, UserCog, Mail, Phone, MapPin, Check, KeySquare
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// 🧠 قاموس الصلاحيات المتاحة في النظام
const PERMISSIONS_DICTIONARY = {
  surveillance: { // 🚀 الحزمة الجديدة للقيادة العليا
    label: 'المراقبة والإشراف العام',
    items: [
      { key: 'global_read_only', label: 'صلاحية الرؤية الشاملة (للقراءة فقط)' },
      { key: 'write_evaluations', label: 'كتابة تقارير زيارة المعلمين' },
      { key: 'manage_announcements', label: 'إدارة التعاميم والإعلانات' }
    ]
  },
  students: {
    label: 'شؤون الطلاب',
    items: [
      { key: 'view_students', label: 'استعراض ملفات الطلاب' },
      { key: 'edit_students', label: 'تعديل بيانات الطلاب' },
      { key: 'link_parents', label: 'ربط أولياء الأمور بالطلاب' }
    ]
  },
  behavior: {
    label: 'المتابعة والسلوك',
    items: [
      { key: 'manage_attendance', label: 'إدارة وتبرير الغياب' },
      { key: 'issue_warnings', label: 'إصدار الإنذارات والتقارير' }
    ]
  },
  academic: {
    label: 'الشؤون الأكاديمية',
    items: [
      { key: 'view_grades', label: 'الاطلاع على السجل الأكاديمي' },
      { key: 'manage_schedules', label: 'إدارة الجداول المدرسية' }
    ]
  }
};

const getCategoryStyles = (categoryName: string) => {
  const knownStyles: Record<string, any> = {
    'قيادة عليا': { icon: Shield, color: 'indigo' },
    'رعاية وإرشاد': { icon: HeartPulse, color: 'rose' },
    'إدارة ومالية': { icon: Briefcase, color: 'amber' }
  };
  return knownStyles[categoryName] || { icon: Building2, color: 'slate' };
};

export default function StaffManagementPage() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [dynamicCategories, setDynamicCategories] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // 🚀 تحديث حالة النموذج لتشمل الصلاحيات (permissions)
  const [formData, setFormData] = useState({
    id: '', full_name: '', national_id: '', email: '', phone: '',
    job_category: '', job_title: '', scope_stage: 'الكل',
    permissions: {} as Record<string, boolean>
  });

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: settingsData, error: settingsError } = await supabase.from('job_roles_settings').select('*');
      if (settingsError) throw settingsError;

      const groupedSettings: Record<string, string[]> = {};
      if (settingsData) {
        settingsData.forEach(item => {
          if (!groupedSettings[item.category_name]) groupedSettings[item.category_name] = [];
          groupedSettings[item.category_name].push(item.job_title);
        });
      }
      setDynamicCategories(groupedSettings);

      const { data: staffData, error: staffError } = await supabase
        .from('school_staff')
        .select('*, users!school_staff_id_fkey(full_name, email, phone, avatar_url, role)');
      if (staffError) throw staffError;
      setStaffList(staffData || []);

    } catch (err: any) {
      showToast('error', 'فشل جلب البيانات: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 🚀 دالة تبديل حالة الصلاحية (Toggle)
  const togglePermission = (key: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key]
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.national_id || !formData.job_category || !formData.job_title) {
      showToast('error', 'يرجى تعبئة الحقول الأساسية!'); return;
    }
    setSubmitting(true);

    try {
      if (isEditing) {
        await supabase.from('users').update({ full_name: formData.full_name, phone: formData.phone, email: formData.email }).eq('id', formData.id);
        
        // 🚀 تحديث الصلاحيات في قاعدة البيانات
        await supabase.from('school_staff').update({
          national_id: formData.national_id,
          job_category: formData.job_category,
          job_title: formData.job_title,
          scope_stage: formData.scope_stage,
          permissions: formData.permissions
        }).eq('id', formData.id);
        
        showToast('success', 'تم تحديث بيانات وصلاحيات الموظف بنجاح');
      } else {
        const safeEmail = formData.email || `${formData.national_id}@alrefaa.edu`;
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch('/api/users/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({ 
            email: safeEmail, password: '123456', full_name: formData.full_name, 
            national_id: formData.national_id, phone: formData.phone, role: 'staff' 
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        // 🚀 إدخال الموظف الجديد مع صلاحياته
        await supabase.from('school_staff').insert({
          id: result.user.id,
          national_id: formData.national_id,
          job_category: formData.job_category,
          job_title: formData.job_title,
          scope_stage: formData.scope_stage,
          permissions: formData.permissions
        });
        showToast('success', `تم إضافة الموظف بنجاح (كلمة المرور: ${result.password})`);
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      showToast('error', err.message || 'حدث خطأ غير متوقع');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الموظف نهائياً؟')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/users/create?id=${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${session?.access_token}` } });
      if (!response.ok) throw new Error('فشل الحذف');
      showToast('success', 'تم الحذف بنجاح');
      fetchData();
    } catch (err: any) { showToast('error', err.message); }
  };

  const openModal = (staff: any = null) => {
    if (staff) {
      setIsEditing(true);
      setFormData({
        id: staff.id, full_name: staff.users?.full_name || '', national_id: staff.national_id,
        email: staff.users?.email || '', phone: staff.users?.phone || '',
        job_category: staff.job_category, job_title: staff.job_title, scope_stage: staff.scope_stage,
        permissions: staff.permissions || {} // 🚀 جلب الصلاحيات السابقة
      });
    } else {
      setIsEditing(false);
      setFormData({ 
        id: '', full_name: '', national_id: '', email: '', phone: '', 
        job_category: '', job_title: '', scope_stage: 'الكل',
        permissions: {} // 🚀 صلاحيات فارغة للموظف الجديد
      });
    }
    setShowModal(true);
  };

  const filteredStaff = useMemo(() => {
    return staffList.filter(s => 
      s.users?.full_name?.includes(searchTerm) || s.job_title?.includes(searchTerm) || s.national_id?.includes(searchTerm)
    );
  }, [staffList, searchTerm]);

  const groupedStaff = useMemo(() => {
    const groups: Record<string, any[]> = {};
    Object.keys(dynamicCategories).forEach(cat => { groups[cat] = []; });
    filteredStaff.forEach(s => { 
      const cat = s.job_category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s); 
    });
    return groups;
  }, [filteredStaff, dynamicCategories]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-24 max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 font-cairo" dir="rtl">
      
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }} className={`fixed top-8 left-1/2 z-50 px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 border backdrop-blur-xl ${notification.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400' : 'bg-rose-500/90 text-white border-rose-400'}`}>
            <div className="font-black text-sm tracking-wide">{notification.message}</div>
            <button onClick={() => setNotification(null)}><X className="h-4 w-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative overflow-hidden rounded-[2.5rem] sm:rounded-[3rem] bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 p-8 sm:p-12 text-white shadow-2xl mb-8">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-white/10 rounded-full blur-[80px]"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-black uppercase tracking-widest backdrop-blur-sm">
              <Building2 className="w-4 h-4 text-indigo-300" /> إدارة الموارد البشرية
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight drop-shadow-md">الطاقم الإداري والمساند</h1>
            <p className="text-indigo-100 text-sm sm:text-base font-bold opacity-90 max-w-2xl">إدارة الكوادر، وتوزيع الصلاحيات الدقيقة لكل موظف لضمان أمان وسلاسة العمليات.</p>
          </div>
          <button onClick={() => openModal()} className="flex items-center justify-center gap-2 px-8 py-4 rounded-[1.5rem] bg-white text-indigo-600 text-sm sm:text-base font-black shadow-xl shadow-white/10 hover:bg-indigo-50 transition-all active:scale-95 shrink-0">
            <Plus className="w-5 h-5" /> توظيف كادر جديد
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-10">
        {Object.keys(dynamicCategories).map((cat) => {
          const styles = getCategoryStyles(cat);
          const Icon = styles.icon;
          return (
            <div key={cat} className={`bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-lg hover:border-${styles.color}-200 transition-all group`}>
              <div className={`h-16 w-16 bg-${styles.color}-50 text-${styles.color}-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner`}>
                <Icon className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-lg">{cat}</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">{groupedStaff[cat]?.length || 0} موظفين مسجلين</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white/80 backdrop-blur-xl p-4 rounded-[2rem] shadow-sm border border-slate-100 mb-8 sticky top-24 z-30">
        <div className="relative w-full max-w-md mx-auto lg:mx-0 lg:mr-auto">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input type="text" placeholder="البحث في سجلات الكادر..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full rounded-2xl bg-slate-50 border border-slate-200 py-3.5 pr-12 pl-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
      ) : (
        <div className="space-y-12">
          {Object.keys(groupedStaff).map((catName) => {
            const staffInCat = groupedStaff[catName];
            if (!staffInCat || staffInCat.length === 0) return null;
            const styles = getCategoryStyles(catName);
            const Icon = styles.icon;
            
            return (
              <div key={catName} className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                  <div className={`p-2.5 bg-${styles.color}-50 text-${styles.color}-600 rounded-xl border border-${styles.color}-100`}><Icon className="w-6 h-6"/></div>
                  <h2 className={`text-2xl font-black text-slate-800`}>{catName}</h2>
                  <div className="h-0.5 flex-1 bg-slate-100 rounded-full ml-4"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {staffInCat.map(member => (
                    <div key={member.id} className={`bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:border-${styles.color}-300 transition-all duration-300 group`}>
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className={`h-14 w-14 rounded-[1.5rem] bg-${styles.color}-50 text-${styles.color}-600 flex items-center justify-center text-xl font-black shadow-inner border border-${styles.color}-100 group-hover:scale-110 transition-transform`}>
                            {member.users?.avatar_url ? <img src={member.users.avatar_url} className="w-full h-full object-cover rounded-[1.2rem]" alt=""/> : member.users?.full_name?.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-black text-slate-900 text-lg leading-tight group-hover:text-indigo-600 transition-colors">{member.users?.full_name}</h3>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg bg-${styles.color}-100 text-${styles.color}-700`}>{member.job_title}</span>
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">{member.scope_stage}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2.5 mb-6 pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-3 text-xs font-bold text-slate-600"><Phone className="w-4 h-4 text-slate-400"/> <span dir="ltr">{member.users?.phone || 'غير مسجل'}</span></div>
                        <div className="flex items-center gap-3 text-xs font-bold text-slate-600"><Mail className="w-4 h-4 text-slate-400"/> <span className="truncate">{member.users?.email || 'غير مسجل'}</span></div>
                      </div>
                      
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openModal(member)} className="flex-1 py-2 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 text-xs font-black rounded-xl transition-colors flex items-center justify-center gap-1"><Edit className="w-3.5 h-3.5"/> تعديل والصلاحيات</button>
                        <button onClick={() => handleDelete(member.id)} className="flex-1 py-2 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-black rounded-xl transition-colors flex items-center justify-center gap-1"><Trash2 className="w-3.5 h-3.5"/> حذف</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal - نافذة الإضافة والتعديل */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[3rem] w-full max-w-4xl shadow-2xl overflow-hidden my-8 border border-white/20 flex flex-col max-h-[90vh]">
              
              <div className="p-6 sm:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl"><UserCog className="w-6 h-6"/></div>
                    {isEditing ? 'تعديل بيانات وصلاحيات الكادر' : 'تسجيل كادر جديد'}
                  </h2>
                  <p className="text-sm font-bold text-slate-500 mt-2">قم بإدخال البيانات وتحديد المهام بدقة.</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 bg-white text-slate-400 hover:text-rose-500 rounded-full shadow-sm hover:shadow-md transition-all"><X className="w-6 h-6"/></button>
              </div>
              
              <div className="overflow-y-auto p-6 sm:p-8 bg-slate-50/30">
                <form id="staffForm" onSubmit={handleSubmit} className="space-y-8">
                  
                  {/* القسم الأول: البيانات الأساسية */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase">الاسم الرباعي</label>
                      <input required type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="الاسم الكامل"/>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase">الرقم المدني (معرف الدخول)</label>
                      <input required type="text" value={formData.national_id} onChange={e => setFormData({...formData, national_id: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-left" dir="ltr" placeholder="الرقم المدني"/>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase">البريد الإلكتروني</label>
                      <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-left" dir="ltr" placeholder="email@domain.com"/>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase">رقم الهاتف</label>
                      <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-left" dir="ltr" placeholder="رقم الموبايل"/>
                    </div>
                  </div>

                  {/* القسم الثاني: التعيين الوظيفي */}
                  <div className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-indigo-700 uppercase">فئة الوظيفة (القسم)</label>
                        <select required value={formData.job_category} onChange={e => setFormData({...formData, job_category: e.target.value, job_title: ''})} className="w-full bg-white border border-indigo-200 rounded-2xl px-5 py-3.5 font-black text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none">
                          <option value="">اختر الفئة...</option>
                          {Object.keys(dynamicCategories).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-indigo-700 uppercase">المسمى الوظيفي</label>
                        <select required value={formData.job_title} onChange={e => setFormData({...formData, job_title: e.target.value})} disabled={!formData.job_category} className="w-full bg-white border border-indigo-200 rounded-2xl px-5 py-3.5 font-black text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50">
                          <option value="">اختر المسمى...</option>
                          {formData.job_category && dynamicCategories[formData.job_category]?.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-black text-indigo-700 uppercase flex items-center gap-2"><MapPin className="w-4 h-4"/> النطاق المرحلي</label>
                      <select value={formData.scope_stage} onChange={e => setFormData({...formData, scope_stage: e.target.value})} className="w-full bg-white border border-indigo-200 rounded-2xl px-5 py-3.5 font-black text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none">
                        <option value="الكل">صلاحيات شاملة (جميع المراحل)</option>
                        <option value="متوسط">المرحلة المتوسطة فقط</option>
                        <option value="ثانوي">المرحلة الثانوية فقط</option>
                      </select>
                    </div>
                  </div>

                  {/* 🚀 القسم الثالث: مصفوفة الصلاحيات (الجديد) */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                      <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><KeySquare className="w-5 h-5"/></div>
                      <div>
                        <h3 className="text-lg font-black text-slate-800">مصفوفة الصلاحيات والمهام</h3>
                        <p className="text-xs font-bold text-slate-400">فقط الخيارات المفعلة ستظهر في لوحة تحكم الموظف.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {Object.entries(PERMISSIONS_DICTIONARY).map(([groupKey, group]) => (
                        <div key={groupKey} className="space-y-4">
                          <h4 className="font-black text-sm text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg w-fit">{group.label}</h4>
                          <div className="space-y-3">
                            {group.items.map(item => {
                              const isActive = formData.permissions[item.key] || false;
                              return (
                                <div 
                                  key={item.key} 
                                  onClick={() => togglePermission(item.key)}
                                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}
                                >
                                  <span className={`text-sm font-bold select-none ${isActive ? 'text-emerald-800' : 'text-slate-600'}`}>{item.label}</span>
                                  <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${isActive ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-transparent'}`}>
                                    <Check className="w-3 h-3" />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </form>
              </div>

              <div className="p-6 sm:p-8 border-t border-slate-100 flex flex-col sm:flex-row-reverse gap-3 bg-white shrink-0">
                <button type="submit" form="staffForm" disabled={submitting} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base px-10 py-4 rounded-2xl shadow-xl shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50">
                  {submitting ? 'جاري الحفظ...' : (isEditing ? 'حفظ التحديثات' : 'اعتماد وتسجيل')}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-600 font-black text-base px-8 py-4 rounded-2xl border border-slate-200 transition-all">إلغاء</button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
