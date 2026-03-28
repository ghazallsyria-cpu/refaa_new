'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, X, Key, UserPlus, Download, Filter, MapPin, Briefcase, Phone, Mail, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUsersSystem } from '@/hooks/useUsersSystem';

// تم تعريف Variants كـ any لتجاوز أخطاء TypeScript في Netlify
const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

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
  
  const [addForm, setAddForm] = useState({
    full_name: '', national_id: '', email: '', phone: '', address: '', job_title: ''
  });
  
  const [editForm, setEditForm] = useState({
    full_name: '', national_id: '', email: '', phone: '', address: '', job_title: ''
  });
  
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    fetchParents();
    fetchStudents();
  }, [fetchParents, fetchStudents]);

  const handleAddSubmit = async () => {
    try {
      if (!addForm.full_name || !addForm.national_id) {
        return showNotification('error', 'يرجى تعبئة الحقول الإلزامية (الاسم والرقم المدني)');
      }
      const result = await addParent({ ...addForm, student_ids: selectedStudents });
      showNotification('success', `تم إضافة ولي الأمر بنجاح (كلمة المرور: ${result.password})`);
      setShowAddModal(false);
      setAddForm({ full_name: '', national_id: '', email: '', phone: '', address: '', job_title: '' });
      setSelectedStudents([]);
    } catch (error: any) {
      showNotification('error', error.message || 'حدث خطأ أثناء الإضافة');
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
      await updateParent(editingParent.id, editingParent.national_id, { ...editForm, student_ids: selectedStudents });
      showNotification('success', 'تم تحديث البيانات بنجاح');
      setShowEditModal(false);
      setSelectedStudents([]);
    } catch (error: any) {
      showNotification('error', error.message || 'حدث خطأ أثناء التحديث');
    }
  };

  const handleResetPasswordClick = async (parent: any) => {
    setResettingPassword(true);
    try {
      const result = await resetPassword(parent.id);
      showNotification('success', `تم التعيين بنجاح. كلمة المرور الجديدة: ${result.newPassword}`);
    } catch (error: any) {
      showNotification('error', 'فشل إعادة تعيين كلمة المرور');
    } finally {
      setResettingPassword(false);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [parentToDelete, setParentToDelete] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!parentToDelete) return;
    try {
      await deleteUser(parentToDelete);
      showNotification('success', 'تم الحذف بنجاح');
      setShowDeleteModal(false);
    } catch (error: any) {
      showNotification('error', 'حدث خطأ أثناء الحذف');
    }
  };

  const filteredParents = (parents || []).filter((parent: any) => 
    (parent.users?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (parent.national_id || '').includes(searchTerm)
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 pb-20 px-4 md:px-8" dir="rtl">
      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20 backdrop-blur-xl ${notification.type === 'success' ? 'bg-emerald-600/90 text-white' : 'bg-red-600/90 text-white'}`}>
            <span className="font-bold">{notification.message}</span>
            <button onClick={() => setNotification(null)}><X size={18}/></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pt-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">إدارة أولياء الأمور</h1>
          <p className="text-slate-500 mt-2 font-medium">قاعدة بيانات شاملة لربط ومتابعة شؤون أولياء الأمور</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button className="h-14 px-8 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"><Download size={20} className="text-slate-400" /> تصدير</button>
          <button onClick={() => setShowAddModal(true)} className="h-14 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold shadow-xl shadow-indigo-200 hover:shadow-indigo-300 transition-all flex items-center gap-2 active:scale-95"><UserPlus size={20} /> إضافة ولي أمر</button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-50 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="ابحث بالاسم أو الرقم المدني..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-14 pr-12 pl-6 bg-slate-50 border-0 ring-1 ring-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all font-bold" />
        </div>
      </div>

      {/* Parents Table */}
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50/50">
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-8 py-6">ولي الأمر</th>
                <th className="px-8 py-6">الرقم المدني</th>
                <th className="px-8 py-6">الأبناء</th>
                <th className="px-8 py-6">التواصل</th>
                <th className="px-8 py-6 text-left">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="py-20 text-center animate-pulse font-bold text-slate-400">جاري تحميل البيانات...</td></tr>
              ) : filteredParents.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center font-bold text-slate-300">لا يوجد نتائج تطابق بحثك</td></tr>
              ) : (
                filteredParents.map((parent: any, idx: number) => (
                  <tr key={parent.id} className="hover:bg-slate-50/80 transition-all group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shadow-inner border border-indigo-100">{parent.users?.full_name?.charAt(0)}</div>
                        <div>
                          <p className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{parent.users?.full_name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{parent.users?.email || 'لا يوجد بريد'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 font-bold text-slate-600">{parent.national_id}</td>
                    <td className="px-8 py-5">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(parent.students || []).map((s: any) => (
                          <span key={s.id} className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-lg border border-indigo-100">{s.users?.full_name}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-[10px] font-bold text-slate-500">
                      <div className="flex items-center gap-2"><Phone size={12}/> {parent.users?.phone || '--'}</div>
                      <div className="flex items-center gap-2 mt-1"><MapPin size={12}/> {parent.address || '--'}</div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleResetPasswordClick(parent)} className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all shadow-sm" title="كلمة المرور"><Key size={16}/></button>
                        <button onClick={() => handleEditClick(parent)} className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"><Edit size={16}/></button>
                        <button onClick={() => { setParentToDelete(parent.id); setShowDeleteModal(true); }} className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all shadow-sm"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl border border-white overflow-hidden">
              <div className="p-8 md:p-10">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-slate-900">{showAddModal ? 'إضافة ولي أمر' : 'تعديل بيانات'}</h2>
                  <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl"><X size={24}/></button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">الاسم الرباعي</label>
                    <input type="text" value={showAddModal ? addForm.full_name : editForm.full_name} onChange={(e) => showAddModal ? setAddForm({...addForm, full_name: e.target.value}) : setEditForm({...editForm, full_name: e.target.value})} className="w-full h-12 bg-slate-50 border-0 ring-1 ring-slate-100 rounded-xl px-5 font-bold focus:ring-2 focus:ring-indigo-600 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">الرقم المدني (اسم المستخدم)</label>
                    <input type="text" value={showAddModal ? addForm.national_id : editForm.national_id} onChange={(e) => showAddModal ? setAddForm({...addForm, national_id: e.target.value}) : setEditForm({...editForm, national_id: e.target.value})} className="w-full h-12 bg-slate-50 border-0 ring-1 ring-slate-100 rounded-xl px-5 font-bold focus:ring-2 focus:ring-indigo-600 outline-none transition-all" />
                  </div>
                </div>

                <div className="mt-8 space-y-4 pt-6 border-t border-slate-50">
                  <div className="flex justify-between items-center"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ربط الأبناء</label><span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md">{selectedStudents.length} طلاب مختارين</span></div>
                  <div className="relative"><Search size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" placeholder="بحث عن طالب للربط..." value={studentSearchTerm} onChange={(e) => setStudentSearchTerm(e.target.value)} className="w-full h-10 pr-10 pl-4 bg-slate-50 border-0 ring-1 ring-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-600 transition-all outline-none" /></div>
                  <div className="max-h-32 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2 p-2 bg-slate-50 rounded-2xl">
                    {(students || []).filter((s:any) => s.users?.full_name?.toLowerCase().includes(studentSearchTerm.toLowerCase())).map((student: any) => (
                      <div key={student.id} onClick={() => setSelectedStudents(prev => prev.includes(student.id) ? prev.filter(id => id !== student.id) : [...prev, student.id])} className={`p-3 rounded-xl cursor-pointer flex items-center justify-between border transition-all ${selectedStudents.includes(student.id) ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-600 border-slate-100 hover:border-indigo-200'}`}>
                        <span className="text-xs font-bold truncate max-w-[150px]">{student.users?.full_name}</span>
                        {selectedStudents.includes(student.id) && <Check size={14}/>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-10 flex gap-3">
                  <button onClick={showAddModal ? handleAddSubmit : handleEditSubmit} className="flex-1 h-14 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">حفظ البيانات</button>
                  <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="px-8 h-14 bg-slate-50 text-slate-400 font-bold rounded-2xl hover:bg-slate-100 transition-all">إلغاء</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-[2.5rem] p-8 md:p-10 w-full max-w-md shadow-2xl border border-white text-center">
              <div className="h-20 w-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner"><Trash2 size={40} /></div>
              <h2 className="text-2xl font-black text-slate-900 mb-4">هل أنت متأكد من الحذف؟</h2>
              <p className="text-slate-500 font-medium mb-8 leading-relaxed">سيتم حذف بيانات ولي الأمر وقطع ارتباطه بالأبناء نهائياً من النظام.</p>
              <div className="flex gap-3">
                <button onClick={confirmDelete} className="flex-1 h-14 bg-red-600 text-white font-black rounded-2xl shadow-xl shadow-red-100 hover:bg-red-700 transition-all active:scale-95">تأكيد الحذف</button>
                <button onClick={() => setShowDeleteModal(false)} className="px-8 h-14 bg-slate-50 text-slate-400 font-bold rounded-2xl hover:bg-slate-100 transition-all">إلغاء</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

