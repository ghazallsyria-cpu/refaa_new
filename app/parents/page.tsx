'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Edit, Trash2, X, Key, UserPlus, Download, Filter, MapPin, Briefcase, Phone, Mail, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ParentsPage() {
  const [parents, setParents] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingParent, setEditingParent] = useState<any>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [addForm, setAddForm] = useState({
    full_name: '',
    national_id: '',
    email: '',
    phone: '',
    address: '',
    job_title: ''
  });
  const [editForm, setEditForm] = useState({
    full_name: '',
    national_id: '',
    email: '',
    phone: '',
    address: '',
    job_title: ''
  });
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleResetPasswordClick = async (parent: any) => {
    setResettingPassword(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: parent.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل إعادة تعيين كلمة المرور');
      }

      showNotification('success', `تم إعادة تعيين كلمة المرور بنجاح. كلمة المرور الجديدة هي: ${data.newPassword}`);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء إعادة تعيين كلمة المرور');
    } finally {
      setResettingPassword(false);
    }
  };

  const fetchParents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('parents')
        .select(`
          id,
          national_id,
          address,
          job_title,
          users (full_name, email, phone),
          students (id, users (full_name))
        `);

      if (error) throw error;
      setParents(data || []);
    } catch (error) {
      console.error('Error fetching parents:', error);
      showNotification('error', 'حدث خطأ أثناء جلب بيانات أولياء الأمور');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          users (full_name)
        `);
      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  }, []);

  useEffect(() => {
    fetchParents();
    fetchStudents();
  }, [fetchParents, fetchStudents]);

  const handleAddSubmit = async () => {
    try {
      if (!addForm.full_name || !addForm.national_id) {
        showNotification('error', 'يرجى تعبئة الحقول الإلزامية (الاسم والرقم المدني)');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: addForm.email || null,
          full_name: addForm.full_name,
          national_id: addForm.national_id,
          phone: addForm.phone,
          role: 'parent',
          address: addForm.address,
          job_title: addForm.job_title
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل إنشاء حساب ولي الأمر');
      }

      // Link students if any selected
      if (selectedStudents.length > 0) {
        const { error: linkError } = await supabase
          .from('students')
          .update({ parent_id: data.userId })
          .in('id', selectedStudents);
        
        if (linkError) {
          console.error('Error linking students:', linkError);
          showNotification('error', 'تم إنشاء الحساب ولكن فشل ربط بعض الطلاب');
        }
      }

      showNotification('success', `تم إضافة ولي الأمر بنجاح (كلمة المرور: ${data.password})`);
      setShowAddModal(false);
      setAddForm({ full_name: '', national_id: '', email: '', phone: '', address: '', job_title: '' });
      setSelectedStudents([]);
      fetchParents();
    } catch (error: any) {
      console.error('Error adding parent:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء إضافة ولي الأمر');
    }
  };

  const handleEditClick = (parent: any) => {
    setEditingParent(parent);
    setEditForm({
      full_name: parent.users?.full_name || '',
      national_id: parent.national_id || '',
      email: parent.users?.email || '',
      phone: parent.users?.phone || '',
      address: parent.address || '',
      job_title: parent.job_title || ''
    });
    setSelectedStudents(parent.students?.map((s: any) => s.id) || []);
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    try {
      // Update users table
      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: editForm.full_name,
          email: editForm.email,
          phone: editForm.phone
        })
        .eq('id', editingParent.id);

      if (userError) throw userError;

      // Update parents table
      const { error: parentError } = await supabase
        .from('parents')
        .update({
          national_id: editForm.national_id,
          address: editForm.address,
          job_title: editForm.job_title
        })
        .eq('id', editingParent.id);

      if (parentError) throw parentError;

      // Update student links
      // 1. Remove old links
      const { error: unlinkError } = await supabase
        .from('students')
        .update({ parent_id: null })
        .eq('parent_id', editingParent.id);
      
      if (unlinkError) throw unlinkError;

      // 2. Add new links
      if (selectedStudents.length > 0) {
        const { error: linkError } = await supabase
          .from('students')
          .update({ parent_id: editingParent.id })
          .in('id', selectedStudents);
        
        if (linkError) throw linkError;
      }

      showNotification('success', 'تم تحديث بيانات ولي الأمر بنجاح');
      setShowEditModal(false);
      setSelectedStudents([]);
      fetchParents();
    } catch (error: any) {
      console.error('Error updating parent:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء تحديث بيانات ولي الأمر');
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [parentToDelete, setParentToDelete] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setParentToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!parentToDelete) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`/api/users/delete?id=${parentToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'فشل حذف ولي الأمر');
      }

      showNotification('success', 'تم حذف ولي الأمر بنجاح');
      setShowDeleteModal(false);
      setParentToDelete(null);
      fetchParents();
    } catch (error: any) {
      console.error('Error deleting parent:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء حذف ولي الأمر');
    }
  };

  const filteredParents = parents.filter(parent => 
    parent.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.national_id?.includes(searchTerm) ||
    parent.users?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 pb-20">
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-8 left-1/2 z-50 px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20 backdrop-blur-xl ${
              notification.type === 'success' ? 'bg-emerald-600/90 text-white' : 'bg-red-600/90 text-white'
            }`}
          >
            <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              {notification.type === 'success' ? '✓' : '!'}
            </div>
            <div className="font-bold text-sm tracking-wide">{notification.message}</div>
            <button onClick={() => setNotification(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <motion.h1 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl font-black text-slate-900 tracking-tight"
          >
            إدارة أولياء الأمور
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-500 mt-2 font-medium"
          >
            قاعدة بيانات شاملة لأولياء أمور طلاب مدرسة الرفعة
          </motion.p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
          >
            <Download className="ml-2 h-5 w-5 text-slate-400" />
            تصدير البيانات
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-200 hover:shadow-indigo-300 transition-all active:scale-95"
          >
            <UserPlus className="ml-2 h-5 w-5" />
            إضافة ولي أمر جديد
          </button>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white flex flex-col lg:flex-row lg:items-center gap-6"
      >
        <div className="relative flex-1 group">
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-5">
            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full rounded-2xl border-0 py-4 pr-12 pl-5 text-slate-900 bg-slate-100/50 ring-1 ring-inset ring-slate-200/60 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all hover:bg-slate-100"
            placeholder="البحث بالاسم، الرقم المدني، أو البريد الإلكتروني..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow-sm border border-slate-200 text-xs font-bold text-slate-500">
              <Filter className="h-4 w-4" />
              تصفية
            </div>
            <select className="bg-transparent border-0 py-2 pr-2 pl-8 text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer">
              <option>جميع الحالات</option>
              <option>نشط</option>
              <option>غير نشط</option>
            </select>
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white overflow-hidden"
      >
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th scope="col" className="py-6 pr-10 pl-4 text-right text-xs font-black text-slate-400 uppercase tracking-[0.2em]">ولي الأمر</th>
                <th scope="col" className="px-4 py-6 text-right text-xs font-black text-slate-400 uppercase tracking-[0.2em]">الرقم المدني</th>
                <th scope="col" className="px-4 py-6 text-right text-xs font-black text-slate-400 uppercase tracking-[0.2em]">الأبناء المرتبطون</th>
                <th scope="col" className="px-4 py-6 text-right text-xs font-black text-slate-400 uppercase tracking-[0.2em]">معلومات التواصل</th>
                <th scope="col" className="px-4 py-6 text-right text-xs font-black text-slate-400 uppercase tracking-[0.2em]">الوظيفة</th>
                <th scope="col" className="px-4 py-6 text-right text-xs font-black text-slate-400 uppercase tracking-[0.2em]">الحالة</th>
                <th scope="col" className="relative py-6 pl-10 pr-4">
                  <span className="sr-only">إجراءات</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-32 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative h-12 w-12">
                        <div className="absolute inset-0 rounded-full border-4 border-indigo-50"></div>
                        <div className="absolute inset-0 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                      </div>
                      <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">جاري تحميل البيانات...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredParents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-32 text-center">
                    <div className="flex flex-col items-center gap-6">
                      <div className="h-24 w-24 rounded-[2rem] bg-slate-50 flex items-center justify-center">
                        <Search className="h-10 w-10 text-slate-200" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xl font-black text-slate-900">لا يوجد نتائج</p>
                        <p className="text-sm font-medium text-slate-400">لم نجد أي ولي أمر يطابق معايير البحث الخاصة بك</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredParents.map((parent, idx) => (
                  <motion.tr 
                    key={parent.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-slate-50/80 transition-all group cursor-pointer"
                  >
                    <td className="whitespace-nowrap py-6 pr-10 pl-4">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-50 flex items-center justify-center text-indigo-600 font-black text-sm border border-indigo-100 shadow-sm group-hover:scale-110 transition-transform">
                            {parent.users?.full_name?.substring(0, 1)}
                          </div>
                          <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{parent.users?.full_name}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{parent.users?.email || 'لا يوجد بريد'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-6">
                      <span className="text-sm font-bold text-slate-600 font-mono">{parent.national_id}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-6">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {parent.students && parent.students.length > 0 ? (
                          parent.students.map((student: any) => (
                            <span key={student.id} className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                              {student.users?.full_name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 italic">لا يوجد أبناء مرتبطون</span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-6">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {parent.users?.phone || '-'}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                          <MapPin className="h-3 w-3" />
                          {parent.address || 'العنوان غير مسجل'}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-6">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Briefcase className="h-3 w-3 text-slate-400" />
                        </div>
                        <span className="text-sm font-bold text-slate-600">
                          {parent.job_title || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-6">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                        نشط
                      </span>
                    </td>
                    <td className="relative whitespace-nowrap py-6 pl-10 pr-4 text-left">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleResetPasswordClick(parent); }}
                          className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm hover:shadow-md bg-white border border-slate-100"
                          title="إعادة تعيين كلمة المرور"
                          disabled={resettingPassword}
                        >
                          <Key className={`h-4 w-4 ${resettingPassword ? 'animate-spin' : ''}`} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEditClick(parent); }}
                          className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm hover:shadow-md bg-white border border-slate-100"
                          title="تعديل"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(parent.id); }}
                          className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm hover:shadow-md bg-white border border-slate-100"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden p-6 grid gap-6">
          {loading ? (
            <div className="py-20 text-center">
               <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
               <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">جاري التحميل...</span>
            </div>
          ) : filteredParents.length === 0 ? (
            <div className="py-20 text-center text-sm font-bold text-slate-400 uppercase tracking-widest">
              لا يوجد نتائج
            </div>
          ) : (
            filteredParents.map((parent, idx) => (
              <motion.div 
                key={parent.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="p-8 rounded-[2.5rem] bg-slate-50/50 border border-slate-100 space-y-8 relative overflow-hidden group"
              >
                <div className="flex justify-between items-start relative z-10">
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <div className="h-16 w-16 rounded-3xl bg-white shadow-xl shadow-slate-200/50 flex items-center justify-center text-indigo-600 font-black text-xl border border-slate-100">
                        {parent.users?.full_name?.substring(0, 1)}
                      </div>
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 leading-tight">{parent.users?.full_name}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{parent.national_id}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEditClick(parent)}
                      className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(parent.id)}
                      className="p-3 text-slate-400 hover:text-red-600 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 relative z-10">
                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">الوظيفة</span>
                    <span className="text-sm font-bold text-slate-900">{parent.job_title || '-'}</span>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">رقم الهاتف</span>
                    <span className="text-sm font-bold text-slate-900">{parent.users?.phone || '-'}</span>
                  </div>
                  <div className="col-span-2 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">الأبناء المرتبطون</span>
                    <div className="flex flex-wrap gap-2">
                      {parent.students && parent.students.length > 0 ? (
                        parent.students.map((student: any) => (
                          <span key={student.id} className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                            {student.users?.full_name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs font-bold text-slate-400 italic">لا يوجد أبناء مرتبطون</span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">العنوان</span>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-slate-400" />
                      </div>
                      <span className="text-sm font-bold text-slate-900">{parent.address || 'غير مسجل'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Add/Edit Parent Modal */}
      <AnimatePresence>
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
                onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
              />
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative transform overflow-hidden rounded-[2.5rem] bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-white"
              >
                <div className="bg-white px-8 pb-8 pt-10 sm:p-10">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                      {showAddModal ? 'إضافة ولي أمر جديد' : 'تعديل بيانات ولي الأمر'}
                    </h3>
                    <button 
                      onClick={() => { setShowAddModal(false); setShowEditModal(false); }} 
                      className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-all"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  
                  <form className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">الاسم الرباعي</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            value={showAddModal ? addForm.full_name : editForm.full_name}
                            onChange={(e) => showAddModal ? setAddForm({...addForm, full_name: e.target.value}) : setEditForm({...editForm, full_name: e.target.value})}
                            className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all font-bold" 
                            placeholder="أدخل الاسم الكامل..."
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">الرقم المدني</label>
                        <input 
                          type="text" 
                          value={showAddModal ? addForm.national_id : editForm.national_id}
                          onChange={(e) => showAddModal ? setAddForm({...addForm, national_id: e.target.value}) : setEditForm({...editForm, national_id: e.target.value})}
                          className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all font-bold" 
                          placeholder="أدخل الرقم المدني..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">البريد الإلكتروني</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                            <Mail className="h-4 w-4 text-slate-400" />
                          </div>
                          <input 
                            type="email" 
                            value={showAddModal ? addForm.email : editForm.email}
                            onChange={(e) => showAddModal ? setAddForm({...addForm, email: e.target.value}) : setEditForm({...editForm, email: e.target.value})}
                            className="block w-full rounded-2xl border-0 py-4 pr-11 pl-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all font-bold" 
                            placeholder="example@school.com"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">رقم الهاتف</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                            <Phone className="h-4 w-4 text-slate-400" />
                          </div>
                          <input 
                            type="text" 
                            value={showAddModal ? addForm.phone : editForm.phone}
                            onChange={(e) => showAddModal ? setAddForm({...addForm, phone: e.target.value}) : setEditForm({...editForm, phone: e.target.value})}
                            className="block w-full rounded-2xl border-0 py-4 pr-11 pl-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all font-bold" 
                            placeholder="أدخل رقم الهاتف..."
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">الوظيفة</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                            <Briefcase className="h-4 w-4 text-slate-400" />
                          </div>
                          <input 
                            type="text" 
                            value={showAddModal ? addForm.job_title : editForm.job_title}
                            onChange={(e) => showAddModal ? setAddForm({...addForm, job_title: e.target.value}) : setEditForm({...editForm, job_title: e.target.value})}
                            className="block w-full rounded-2xl border-0 py-4 pr-11 pl-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all font-bold" 
                            placeholder="أدخل المسمى الوظيفي..."
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">العنوان</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                            <MapPin className="h-4 w-4 text-slate-400" />
                          </div>
                          <input 
                            type="text" 
                            value={showAddModal ? addForm.address : editForm.address}
                            onChange={(e) => showAddModal ? setAddForm({...addForm, address: e.target.value}) : setEditForm({...editForm, address: e.target.value})}
                            className="block w-full rounded-2xl border-0 py-4 pr-11 pl-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all font-bold" 
                            placeholder="أدخل عنوان السكن..."
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">ربط الأبناء (الطلاب)</label>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                          {selectedStudents.length} طلاب مختارين
                        </span>
                      </div>
                      
                      <div className="relative group">
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                          <Search className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                          type="text"
                          className="block w-full rounded-2xl border-0 py-3 pr-10 pl-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all"
                          placeholder="البحث عن طالب بالاسم..."
                          value={studentSearchTerm}
                          onChange={(e) => setStudentSearchTerm(e.target.value)}
                        />
                      </div>

                      <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/30 p-2 space-y-1">
                        {students
                          .filter(s => s.users?.full_name?.toLowerCase().includes(studentSearchTerm.toLowerCase()))
                          .map(student => (
                            <label 
                              key={student.id} 
                              className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                                selectedStudents.includes(student.id) 
                                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
                              }`}
                            >
                              <span className="text-sm font-bold">{student.users?.full_name}</span>
                              <input 
                                type="checkbox"
                                className="hidden"
                                checked={selectedStudents.includes(student.id)}
                                onChange={() => {
                                  if (selectedStudents.includes(student.id)) {
                                    setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                                  } else {
                                    setSelectedStudents([...selectedStudents, student.id]);
                                  }
                                }}
                              />
                              {selectedStudents.includes(student.id) && <Check className="h-4 w-4" />}
                            </label>
                          ))}
                        {students.filter(s => s.users?.full_name?.toLowerCase().includes(studentSearchTerm.toLowerCase())).length === 0 && (
                          <div className="py-8 text-center text-xs font-bold text-slate-400 italic">
                            لا يوجد طلاب بهذا الاسم
                          </div>
                        )}
                      </div>
                    </div>
                  </form>
                </div>
                <div className="bg-slate-50/50 px-8 py-6 sm:flex sm:flex-row-reverse sm:px-10 gap-3">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 sm:w-auto"
                    onClick={showAddModal ? handleAddSubmit : handleEditSubmit}
                  >
                    {showAddModal ? 'إضافة ولي الأمر' : 'حفظ التعديلات'}
                  </button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-2xl bg-white px-8 py-4 text-sm font-black text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 sm:mt-0 sm:w-auto transition-all"
                    onClick={() => { setShowAddModal(false); setShowEditModal(false); setSelectedStudents([]); setStudentSearchTerm(''); }}
                  >
                    إلغاء
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
                onClick={() => setShowDeleteModal(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative transform overflow-hidden rounded-[2.5rem] bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-white"
              >
                <div className="bg-white px-8 pb-8 pt-10 sm:p-10">
                  <div className="flex flex-col items-center text-center">
                    <div className="mx-auto flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-3xl bg-red-50 mb-6">
                      <Trash2 className="h-10 w-10 text-red-500" aria-hidden="true" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">حذف ولي الأمر</h3>
                    <p className="text-slate-500 leading-relaxed font-medium">
                      هل أنت متأكد من حذف ولي الأمر هذا؟ سيتم حذف جميع البيانات المرتبطة به نهائياً. لا يمكن التراجع عن هذا الإجراء.
                    </p>
                  </div>
                </div>
                <div className="bg-slate-50/50 px-8 py-6 sm:flex sm:flex-row-reverse sm:px-10 gap-3">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-2xl bg-red-600 px-8 py-4 text-sm font-black text-white shadow-xl shadow-red-100 hover:bg-red-700 transition-all active:scale-95 sm:w-auto"
                    onClick={confirmDelete}
                  >
                    تأكيد الحذف
                  </button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-2xl bg-white px-8 py-4 text-sm font-black text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 sm:mt-0 sm:w-auto transition-all"
                    onClick={() => setShowDeleteModal(false)}
                  >
                    إلغاء
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
