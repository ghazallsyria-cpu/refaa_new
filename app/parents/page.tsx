'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, X, Key, UserPlus, Download, Filter, MapPin, Briefcase, Phone, Mail, Check, Users, UsersRound, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUsersSystem } from '@/hooks/useUsersSystem';

export default function ParentsPage() {
  const {
    parents,
    students,
    loading,
    fetchParents,
    fetchStudents,
    addParent,
    updateParent,
    deleteUser,
    resetPassword
  } = useUsersSystem();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingParent, setEditingParent] = useState<any>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  
  const [addForm, setAddForm] = useState({ full_name: '', national_id: '', email: '', phone: '', address: '', job_title: '' });
  const [editForm, setEditForm] = useState({ full_name: '', national_id: '', email: '', phone: '', address: '', job_title: '' });
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    fetchParents();
    fetchStudents();
  }, [fetchParents, fetchStudents]);

  // 🚀 إحصائيات رادار الإدارة
  const stats = useMemo(() => {
    const totalParents = parents.length;
    const activeParents = parents.filter(p => p.students && p.students.length > 0).length;
    const totalLinkedStudents = parents.reduce((acc, p) => acc + (p.students?.length || 0), 0);
    return { totalParents, activeParents, totalLinkedStudents };
  }, [parents]);

  const handleAddSubmit = async () => {
    try {
      if (!addForm.full_name || !addForm.national_id) {
        showNotification('error', 'يرجى تعبئة الحقول الإلزامية (الاسم والرقم المدني)');
        return;
      }
      const result = await addParent({ ...addForm, student_ids: selectedStudents });
      showNotification('success', `تم إضافة ولي الأمر بنجاح (كلمة المرور: ${result.password})`);
      setShowAddModal(false);
      setAddForm({ full_name: '', national_id: '', email: '', phone: '', address: '', job_title: '' });
      setSelectedStudents([]);
    } catch (error: any) {
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
    // 🚀 جلب IDs الطلاب المرتبطين حالياً لتعيينهم في نافذة التعديل
    setSelectedStudents(parent.students?.map((s: any) => s.id) || []);
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    try {
      await updateParent(editingParent.id, editingParent.national_id, { ...editForm, student_ids: selectedStudents });
      showNotification('success', 'تم تحديث بيانات ولي الأمر وارتباطاته بنجاح');
      setShowEditModal(false);
      setSelectedStudents([]);
    } catch (error: any) {
      showNotification('error', error.message || 'حدث خطأ أثناء تحديث البيانات');
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [parentToDelete, setParentToDelete] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => { setParentToDelete(id); setShowDeleteModal(true); };
  const confirmDelete = async () => {
    if (!parentToDelete) return;
    try {
      await deleteUser(parentToDelete);
      showNotification('success', 'تم حذف ولي الأمر بنجاح');
      setShowDeleteModal(false);
      setParentToDelete(null);
    } catch (error: any) { showNotification('error', error.message || 'حدث خطأ أثناء حذف ولي الأمر'); }
  };

  const handleResetPasswordClick = async (parent: any) => {
    setResettingPassword(true);
    try {
      const result = await resetPassword(parent.id);
      showNotification('success', `تم إعادة تعيين كلمة المرور بنجاح: ${result.newPassword}`);
    } catch (error: any) { showNotification('error', error.message || 'حدث خطأ'); }
    finally { setResettingPassword(false); }
  };

  const filteredParents = parents.filter(parent => 
    parent.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.national_id?.includes(searchTerm) ||
    parent.users?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 pb-20 font-cairo" dir="rtl">
      
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }} className={`fixed top-8 left-1/2 z-50 px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20 backdrop-blur-xl ${notification.type === 'success' ? 'bg-emerald-600/90 text-white' : 'bg-red-600/90 text-white'}`}>
            <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">{notification.type === 'success' ? '✓' : '!'}</div>
            <div className="font-bold text-sm tracking-wide">{notification.message}</div>
            <button onClick={() => setNotification(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors"><X className="h-4 w-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <motion.h1 initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="text-4xl font-black text-slate-900 tracking-tight">إدارة أولياء الأمور</motion.h1>
          <motion.p initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="text-slate-500 mt-2 font-bold">قاعدة بيانات شاملة لأولياء أمور طلاب مدرسة الرفعة</motion.p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setShowAddModal(true)} className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-3.5 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:shadow-indigo-300 transition-all active:scale-95">
            <UserPlus className="ml-2 h-5 w-5" /> إضافة ولي أمر جديد
          </button>
        </div>
      </div>

      {/* 🚀 البطاقات الإحصائية (رادار الإدارة) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><Users className="w-7 h-7"/></div>
          <div><p className="text-xs font-black text-slate-400 uppercase tracking-widest">إجمالي المسجلين</p><p className="text-3xl font-black text-slate-900 mt-1">{stats.totalParents}</p></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center"><Check className="w-7 h-7"/></div>
          <div><p className="text-xs font-black text-slate-400 uppercase tracking-widest">حسابات نشطة (بها أبناء)</p><p className="text-3xl font-black text-slate-900 mt-1">{stats.activeParents}</p></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center"><UsersRound className="w-7 h-7"/></div>
          <div><p className="text-xs font-black text-slate-400 uppercase tracking-widest">إجمالي الأبناء المرتبطين</p><p className="text-3xl font-black text-slate-900 mt-1">{stats.totalLinkedStudents}</p></div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="relative flex-1 group">
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-5"><Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" /></div>
          <input type="text" className="block w-full rounded-2xl border-0 py-4 pr-12 pl-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all font-bold" placeholder="البحث بالاسم، الرقم المدني، أو البريد..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th scope="col" className="py-6 pr-10 pl-4 text-right text-xs font-black text-slate-400 uppercase tracking-[0.2em]">ولي الأمر</th>
                <th scope="col" className="px-4 py-6 text-right text-xs font-black text-slate-400 uppercase tracking-[0.2em]">الرقم المدني</th>
                <th scope="col" className="px-4 py-6 text-right text-xs font-black text-slate-400 uppercase tracking-[0.2em]">الأبناء المرتبطون</th>
                <th scope="col" className="px-4 py-6 text-right text-xs font-black text-slate-400 uppercase tracking-[0.2em]">معلومات التواصل</th>
                <th scope="col" className="px-4 py-6 text-right text-xs font-black text-slate-400 uppercase tracking-[0.2em]">الوظيفة</th>
                <th scope="col" className="relative py-6 pl-10 pr-4"><span className="sr-only">إجراءات</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {loading ? (
                <tr><td colSpan={6} className="py-32 text-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mx-auto"></div></td></tr>
              ) : filteredParents.length === 0 ? (
                <tr><td colSpan={6} className="py-32 text-center font-bold text-slate-400">لا يوجد بيانات مطابقة للبحث</td></tr>
              ) : (
                filteredParents.map((parent, idx) => (
                  <motion.tr key={parent.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="hover:bg-slate-50/80 transition-all group cursor-pointer">
                    <td className="whitespace-nowrap py-6 pr-10 pl-4">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-50 flex items-center justify-center text-indigo-600 font-black text-sm border border-indigo-100 shadow-sm">{parent.users?.full_name?.substring(0, 1)}</div>
                          <div className={`absolute -bottom-1 -left-1 w-4 h-4 border-2 border-white rounded-full shadow-sm ${parent.students && parent.students.length > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{parent.users?.full_name}</span>
                          <span className="text-[10px] text-slate-400 font-bold mt-0.5">{parent.users?.email || 'لا يوجد بريد'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-6 font-bold text-slate-600">{parent.national_id}</td>
                    <td className="px-4 py-6">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {parent.students && parent.students.length > 0 ? (
                          parent.students.map((student: any) => (
                            <span key={student.id} className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">{student.users?.full_name?.split(' ')[0]}</span>
                          ))
                        ) : (
                          <span className="text-[10px] font-bold text-rose-400 bg-rose-50 px-2 py-1 rounded-lg flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> لا يوجد أبناء</span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-6">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600"><Phone className="h-3 w-3 text-slate-400" /> {parent.users?.phone || '-'}</div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400"><MapPin className="h-3 w-3" /> <span className="truncate max-w-[150px]">{parent.address || 'العنوان غير مسجل'}</span></div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-6">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-lg bg-slate-50 flex items-center justify-center"><Briefcase className="h-3 w-3 text-slate-400" /></div>
                        <span className="text-sm font-bold text-slate-600">{parent.job_title || '-'}</span>
                      </div>
                    </td>
                    <td className="relative whitespace-nowrap py-6 pl-10 pr-4 text-left">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                        <button onClick={(e) => { e.stopPropagation(); handleResetPasswordClick(parent); }} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100" title="كلمة المرور" disabled={resettingPassword}><Key className={`h-4 w-4 ${resettingPassword ? 'animate-spin' : ''}`} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleEditClick(parent); }} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100" title="تعديل"><Edit className="h-4 w-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(parent.id); }} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100" title="حذف"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* 🚀 النوافذ المنبثقة للإضافة والتعديل */}
      <AnimatePresence>
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => { setShowAddModal(false); setShowEditModal(false); }} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative transform overflow-hidden rounded-[2.5rem] bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                <div className="bg-white px-8 pb-8 pt-10 sm:p-10">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{showAddModal ? 'إضافة ولي أمر جديد' : 'تعديل بيانات ولي الأمر'}</h3>
                    <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-50"><X className="h-5 w-5" /></button>
                  </div>
                  <form className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">الاسم الرباعي</label>
                        <input type="text" value={showAddModal ? addForm.full_name : editForm.full_name} onChange={(e) => showAddModal ? setAddForm({...addForm, full_name: e.target.value}) : setEditForm({...editForm, full_name: e.target.value})} className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-500 font-bold outline-none" placeholder="أدخل الاسم الكامل..." />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">الرقم المدني</label>
                        <input type="text" value={showAddModal ? addForm.national_id : editForm.national_id} onChange={(e) => showAddModal ? setAddForm({...addForm, national_id: e.target.value}) : setEditForm({...editForm, national_id: e.target.value})} className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-500 font-bold outline-none" placeholder="أدخل الرقم المدني..." />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">البريد الإلكتروني</label>
                        <input type="email" value={showAddModal ? addForm.email : editForm.email} onChange={(e) => showAddModal ? setAddForm({...addForm, email: e.target.value}) : setEditForm({...editForm, email: e.target.value})} className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-500 font-bold outline-none text-left" dir="ltr" placeholder="example@domain.com" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">رقم الهاتف</label>
                        <input type="text" value={showAddModal ? addForm.phone : editForm.phone} onChange={(e) => showAddModal ? setAddForm({...addForm, phone: e.target.value}) : setEditForm({...editForm, phone: e.target.value})} className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-500 font-bold outline-none text-left" dir="ltr" placeholder="أدخل رقم الهاتف..." />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">الوظيفة</label>
                        <input type="text" value={showAddModal ? addForm.job_title : editForm.job_title} onChange={(e) => showAddModal ? setAddForm({...addForm, job_title: e.target.value}) : setEditForm({...editForm, job_title: e.target.value})} className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-500 font-bold outline-none" placeholder="أدخل المسمى الوظيفي..." />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">العنوان</label>
                        <input type="text" value={showAddModal ? addForm.address : editForm.address} onChange={(e) => showAddModal ? setAddForm({...addForm, address: e.target.value}) : setEditForm({...editForm, address: e.target.value})} className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-500 font-bold outline-none" placeholder="أدخل عنوان السكن..." />
                      </div>
                    </div>

                    {/* 🚀 قسم ربط الأبناء (الذكي) */}
                    <div className="space-y-4 pt-6 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">ربط الأبناء (الطلاب)</label>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">{selectedStudents.length} طلاب مختارين</span>
                      </div>
                      <div className="relative group">
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4"><Search className="h-4 w-4 text-slate-400" /></div>
                        <input type="text" className="block w-full rounded-2xl border-0 py-3 pr-10 pl-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-500 sm:text-sm font-bold outline-none" placeholder="البحث عن طالب بالاسم لربطه بهذا الحساب..." value={studentSearchTerm} onChange={(e) => setStudentSearchTerm(e.target.value)} />
                      </div>
                      <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/50 p-2 space-y-1 custom-scrollbar">
                        {students.filter(s => s.users?.full_name?.toLowerCase().includes(studentSearchTerm.toLowerCase())).map(student => (
                          <label key={student.id} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${selectedStudents.includes(student.id) ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'}`}>
                            <span className="text-sm font-bold">{student.users?.full_name}</span>
                            <input type="checkbox" className="hidden" checked={selectedStudents.includes(student.id)} onChange={() => { if (selectedStudents.includes(student.id)) { setSelectedStudents(selectedStudents.filter(id => id !== student.id)); } else { setSelectedStudents([...selectedStudents, student.id]); } }} />
                            {selectedStudents.includes(student.id) && <Check className="h-4 w-4" />}
                          </label>
                        ))}
                      </div>
                    </div>
                  </form>
                </div>
                <div className="bg-slate-50 px-8 py-6 sm:flex sm:flex-row-reverse gap-3">
                  <button type="button" className="inline-flex w-full justify-center rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-black text-white shadow-lg hover:bg-indigo-700 sm:w-auto" onClick={showAddModal ? handleAddSubmit : handleEditSubmit}>
                    {showAddModal ? 'إضافة ولي الأمر' : 'حفظ التعديلات وارتباط الأبناء'}
                  </button>
                  <button type="button" className="mt-3 inline-flex w-full justify-center rounded-2xl bg-white px-8 py-4 text-sm font-black text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 sm:mt-0 sm:w-auto" onClick={() => { setShowAddModal(false); setShowEditModal(false); setSelectedStudents([]); setStudentSearchTerm(''); }}>
                    إلغاء
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-8 rounded-3xl text-center shadow-2xl max-w-sm w-full">
                <div className="mx-auto h-20 w-20 bg-rose-50 text-rose-500 flex items-center justify-center rounded-full mb-4"><Trash2 className="w-10 h-10"/></div>
                <h3 className="text-2xl font-black mb-2 text-slate-900">تأكيد الحذف</h3>
                <p className="text-slate-500 font-bold mb-6 text-sm leading-relaxed">هل أنت متأكد من حذف حساب ولي الأمر هذا؟ هذا سيؤدي إلى فك ارتباط أبنائه في النظام تلقائياً.</p>
                <div className="flex gap-4">
                   <button onClick={confirmDelete} className="bg-rose-600 text-white px-6 py-3 rounded-xl font-black flex-1 shadow-lg shadow-rose-200">حذف نهائي</button>
                   <button onClick={() => setShowDeleteModal(false)} className="bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-black flex-1 border border-slate-200">تراجع</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
