/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, Plus, Trash2, Edit2, CheckCircle2, AlertCircle, 
  ChevronLeft, LayoutTemplate, Briefcase, ChevronDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface JobRole {
  id: string;
  category_name: string;
  job_title: string;
}

export default function RolesSettingsPage() {
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // حالة النموذج (للإضافة والتعديل)
  const [formData, setFormData] = useState({
    id: '',
    category_name: '',
    job_title: ''
  });
  
  const [isEditing, setIsEditing] = useState(false);
  // حالة لإظهار/إخفاء نموذج الإضافة المدمج
  const [showForm, setShowForm] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // جلب البيانات من الجدول الجديد
  const fetchRoles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('job_roles_settings')
        .select('*')
        .order('category_name', { ascending: true })
        .order('job_title', { ascending: true });
        
      if (error) throw error;
      setRoles(data || []);
    } catch (err: any) {
      showToast('error', 'فشل جلب البيانات: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  // دالة الحفظ (إضافة أو تعديل)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // تنظيف المدخلات من المسافات الزائدة
    const cleanCategory = formData.category_name.trim();
    const cleanTitle = formData.job_title.trim();

    if (!cleanCategory || !cleanTitle) {
      showToast('error', 'يرجى تعبئة كلا الحقلين!');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && formData.id) {
        // تحديث
        const { error } = await supabase
          .from('job_roles_settings')
          .update({ category_name: cleanCategory, job_title: cleanTitle })
          .eq('id', formData.id);
          
        if (error) throw error;
        showToast('success', 'تم تحديث المسمى الوظيفي بنجاح');
      } else {
        // فحص التكرار قبل الإضافة
        const exists = roles.some(r => r.category_name === cleanCategory && r.job_title === cleanTitle);
        if (exists) {
          throw new Error('هذا المسمى الوظيفي موجود بالفعل في هذه الفئة!');
        }

        // إضافة جديدة
        const { error } = await supabase
          .from('job_roles_settings')
          .insert({ category_name: cleanCategory, job_title: cleanTitle });
          
        if (error) throw error;
        showToast('success', 'تمت إضافة المسمى الوظيفي بنجاح');
      }

      // إعادة تهيئة النموذج
      resetForm();
      fetchRoles();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // دالة الحذف
  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المسمى الوظيفي؟ سيؤثر ذلك على الموظفين المسجلين تحته إذا حاولت تعديل بياناتهم لاحقاً.')) return;
    
    try {
      const { error } = await supabase
        .from('job_roles_settings')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      showToast('success', 'تم الحذف بنجاح');
      fetchRoles();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // تهيئة النموذج للتعديل
  const handleEditClick = (role: JobRole) => {
    setFormData({
      id: role.id,
      category_name: role.category_name,
      job_title: role.job_title
    });
    setIsEditing(true);
    setShowForm(true);
    // التمرير السلس إلى أعلى الصفحة حيث يوجد النموذج
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setFormData({ id: '', category_name: '', job_title: '' });
    setIsEditing(false);
    setShowForm(false);
  };

  // تجميع الوظائف حسب الفئة لتسهيل العرض
  const groupedRoles = useMemo(() => {
    const groups: Record<string, JobRole[]> = {};
    roles.forEach(role => {
      if (!groups[role.category_name]) {
        groups[role.category_name] = [];
      }
      groups[role.category_name].push(role);
    });
    return groups;
  }, [roles]);

  // استخراج الفئات الفريدة لاستخدامها كاقتراحات في حقل الإدخال
  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(roles.map(r => r.category_name)));
  }, [roles]);

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 font-cairo pt-6" dir="rtl">
      
      {/* نظام الإشعارات */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }} 
            animate={{ opacity: 1, y: 0, x: '-50%' }} 
            exit={{ opacity: 0, y: -20, x: '-50%' }} 
            className={`fixed top-8 left-1/2 z-50 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border ${
              notification.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-rose-500" />}
            <span className="font-bold text-sm">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* زر العودة والترويسة */}
      <div className="mb-2">
        <Link href="/admin/staff/home" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-sm border border-slate-200 transition-all group">
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> العودة للمركز الإداري
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 shadow-inner">
            <Settings className="h-8 w-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">إعدادات الهيكل الوظيفي</h1>
            <p className="text-slate-500 mt-1 font-bold">إدارة الأقسام (الفئات) والمسميات الوظيفية للكادر الإداري.</p>
          </div>
        </div>
        
        <button 
          onClick={() => {
            if (showForm && !isEditing) {
              setShowForm(false);
            } else {
              resetForm();
              setShowForm(true);
            }
          }}
          className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black transition-all ${
            showForm && !isEditing
              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
              : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95'
          }`}
        >
          {showForm && !isEditing ? (
            <>إلغاء الإضافة</>
          ) : (
            <><Plus className="w-5 h-5" /> إضافة مسمى جديد</>
          )}
        </button>
      </div>

      {/* منطقة الإضافة والتعديل (تظهر عند الطلب) */}
      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0, scale: 0.95 }} 
            animate={{ opacity: 1, height: 'auto', scale: 1 }} 
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            className="overflow-hidden"
          >
            <div className="bg-indigo-50/50 p-8 rounded-[2.5rem] border border-indigo-100 shadow-inner">
              <div className="flex items-center gap-2 mb-6 text-indigo-800">
                <LayoutTemplate className="w-5 h-5" />
                <h2 className="text-xl font-black">{isEditing ? 'تعديل بيانات المسمى' : 'تعريف مسمى وظيفي جديد'}</h2>
              </div>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-indigo-900 uppercase">الفئة الرئيسية (القسم)</label>
                  <div className="relative">
                    <input 
                      required 
                      type="text" 
                      list="categoriesList"
                      value={formData.category_name} 
                      onChange={e => setFormData({...formData, category_name: e.target.value})} 
                      className="w-full bg-white border border-indigo-200 rounded-2xl px-5 py-4 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" 
                      placeholder="مثال: قيادة عليا، رعاية وإرشاد..."
                    />
                    <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300 pointer-events-none" />
                    
                    {/* قائمة مقترحة بالفئات الموجودة مسبقاً */}
                    <datalist id="categoriesList">
                      {uniqueCategories.map(cat => <option key={cat} value={cat} />)}
                    </datalist>
                  </div>
                  <p className="text-[10px] text-indigo-500 font-bold px-1">يمكنك اختيار فئة موجودة أو كتابة فئة جديدة كلياً.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-indigo-900 uppercase">المسمى الوظيفي الدقيق</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.job_title} 
                    onChange={e => setFormData({...formData, job_title: e.target.value})} 
                    className="w-full bg-white border border-indigo-200 rounded-2xl px-5 py-4 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" 
                    placeholder="مثال: مدير مدرسة، أخصائي نفسي..."
                  />
                </div>

                <div className="md:col-span-2 pt-4 flex gap-3">
                  <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="flex-1 md:flex-none md:w-auto bg-indigo-600 text-white font-black px-10 py-4 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'جاري الحفظ...' : (isEditing ? 'حفظ التعديلات' : 'إضافة للقائمة')}
                  </button>
                  {isEditing && (
                    <button 
                      type="button" 
                      onClick={resetForm} 
                      className="flex-1 md:flex-none md:w-auto bg-white text-slate-600 font-black px-8 py-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
                    >
                      إلغاء التعديل
                    </button>
                  )}
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* عرض الهيكل الوظيفي الحالي */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : Object.keys(groupedRoles).length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-300 shadow-sm">
          <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-2xl font-black text-slate-800 mb-2">لا توجد مسميات وظيفية</h3>
          <p className="text-slate-500 font-bold">ابدأ بإضافة الهيكل التنظيمي للمدرسة من الزر في الأعلى.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedRoles).map(([category, rolesInCategory]) => (
            <div key={category} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
              {/* ترويسة الفئة */}
              <div className="bg-slate-50/80 px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                  <div className="w-2 h-6 bg-indigo-500 rounded-full"></div>
                  {category}
                </h2>
                <span className="text-xs font-black bg-white px-3 py-1 rounded-lg border border-slate-200 text-slate-500">
                  {rolesInCategory.length} مسميات
                </span>
              </div>
              
              {/* قائمة الوظائف داخل الفئة */}
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {rolesInCategory.map(role => (
                  <div key={role.id} className="group relative bg-slate-50/50 hover:bg-indigo-50/30 border border-slate-100 hover:border-indigo-100 p-5 rounded-2xl transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm text-slate-400 group-hover:text-indigo-500 transition-colors">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{role.job_title}</span>
                      </div>
                      
                      {/* أزرار التحكم المخفية */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditClick(role)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          title="تعديل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(role.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
