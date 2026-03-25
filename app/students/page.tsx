'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, MoreHorizontal, Edit, Trash2, X, Key, Filter, Download, UserPlus, Users, ArrowRight, AlertCircle, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as Dialog from '@radix-ui/react-dialog';
import * as XLSX from 'xlsx';

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [addForm, setAddForm] = useState({
    full_name: '',
    national_id: '',
    email: '',
    phone: '',
    section_id: '',
    parent_id: ''
  });
  const [editForm, setEditForm] = useState({
    full_name: '',
    national_id: '',
    email: '',
    phone: '',
    parent_id: ''
  });
  const [sections, setSections] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState('all');

  useEffect(() => {
    fetchStudents();
    fetchSections();
    fetchParents();
  }, []);

  const fetchParents = async () => {
    try {
      const { data, error } = await supabase
        .from('parents')
        .select('id, users(full_name)');
      if (error) throw error;
      setParents(data || []);
    } catch (error) {
      console.error('Error fetching parents:', error);
    }
  };

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('id, name, classes(name)');
      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const handleAddSubmit = async () => {
    try {
      if (!addForm.full_name || !addForm.national_id) {
        alert('يرجى تعبئة الحقول الإلزامية (الاسم والرقم المدني)');
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
          role: 'student',
          section_id: addForm.section_id || null,
          parent_id: addForm.parent_id || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل إنشاء حساب الطالب');
      }

      alert('تمت الإضافة بنجاح');
      setShowAddModal(false);
      setAddForm({ full_name: '', national_id: '', email: '', phone: '', section_id: '', parent_id: '' });
      fetchStudents();
    } catch (error: any) {
      console.error('Error adding student:', error);
      alert(error.message || 'حدث خطأ أثناء إضافة الطالب');
    }
  };

  const handleEditClick = (student: any) => {
    setEditingStudent(student);
    setEditForm({
      full_name: student.users?.full_name || '',
      national_id: student.national_id || '',
      email: student.users?.email || '',
      phone: student.users?.phone || '',
      parent_id: student.parent_id || ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    try {
      const nationalIdChanged = editForm.national_id !== (editingStudent.national_id || '');

      // If national_id changed, update Auth email via server API (requires service role key)
      if (nationalIdChanged) {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/users/update-national-id', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            userId: editingStudent.id,
            newNationalId: editForm.national_id,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'فشل تحديث الرقم المدني في المصادقة');
        // Sync the email in editForm to the new derived email
        editForm.email = result.newEmail;
      }

      // Update users table
      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: editForm.full_name,
          email: editForm.email,
          phone: editForm.phone
        })
        .eq('id', editingStudent.id);

      if (userError) throw userError;

      // Update students table
      const { error: studentError } = await supabase
        .from('students')
        .update({
          national_id: editForm.national_id,
          parent_id: editForm.parent_id || null
        })
        .eq('id', editingStudent.id);

      if (studentError) throw studentError;

      alert('تم تحديث بيانات الطالب بنجاح');
      setShowEditModal(false);
      fetchStudents();
    } catch (error: any) {
      console.error('Error updating student:', error);
      alert(error.message || 'حدث خطأ أثناء تحديث بيانات الطالب');
    }
  };
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [resetPasswordForm, setResetPasswordForm] = useState({ userId: '', newPassword: '' });

  const handleResetPasswordClick = (student: any) => {
    setResetPasswordForm({ userId: student.id, newPassword: '' });
    setShowPasswordResetModal(true);
  };

  const handleResetPasswordSubmit = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(resetPasswordForm)
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'فشل تغيير كلمة المرور');
      
      alert(`تم تغيير كلمة المرور بنجاح. كلمة المرور الجديدة: ${data.newPassword || resetPasswordForm.newPassword}`);
      setShowPasswordResetModal(false);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      alert(error.message || 'حدث خطأ أثناء تغيير كلمة المرور');
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          national_id,
          gender,
          parent_id,
          users (full_name, email, phone),
          sections (name, classes (name)),
          parents (users (full_name))
        `);

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setStudentToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!studentToDelete) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`/api/users/delete?id=${studentToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل حذف الطالب');
      }
      
      alert('تم حذف الطالب بنجاح');
      setShowDeleteModal(false);
      setStudentToDelete(null);
      fetchStudents();
    } catch (error: any) {
      console.error('Error deleting student:', error);
      alert(error.message || 'حدث خطأ أثناء حذف الطالب');
    }
  };

  const exportToExcel = () => {
    const data = filteredStudents.map(student => ({
      'الاسم الرباعي': student.users?.full_name,
      'الرقم المدني': student.national_id,
      'البريد الإلكتروني': student.users?.email,
      'رقم الهاتف': student.users?.phone,
      'الصف': student.sections?.classes?.name,
      'الشعبة': student.sections?.name,
      'ولي الأمر': student.parents?.users?.full_name || 'غير مسجل'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "الطلاب");
    XLSX.writeFile(workbook, "قائمة_الطلاب.xlsx");
  };

  const filteredStudents = students.filter(s => 
    s.users?.full_name?.includes(searchTerm) || 
    s.national_id?.includes(searchTerm)
  );

  return (
    <div className="relative min-h-screen">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            x: [0, 100, 0],
            y: [0, 50, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
            x: [0, -100, 0],
            y: [0, -50, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-violet-500/5 blur-[120px]" 
        />
        <div className="absolute top-[20%] left-[10%] w-[30%] h-[30%] rounded-full bg-blue-500/5 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto space-y-10 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pt-8">
        <div>
          <motion.h1 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl font-black text-slate-900 tracking-tight"
          >
            إدارة الطلاب
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-500 mt-2 font-medium"
          >
            قاعدة بيانات شاملة لجميع الطلاب المسجلين في مدرسة الرفعة
          </motion.p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <motion.button 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onClick={exportToExcel}
            className="inline-flex items-center justify-center rounded-2xl bg-white/70 backdrop-blur-md px-6 py-3.5 text-sm font-bold text-slate-700 shadow-sm border border-white/20 hover:bg-white transition-all active:scale-95"
          >
            <Download className="ml-2 h-5 w-5 text-slate-400" />
            تصدير البيانات
          </motion.button>
          <motion.button 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-200/50 hover:shadow-indigo-300/50 transition-all active:scale-95"
          >
            <UserPlus className="ml-2 h-5 w-5" />
            إضافة طالب جديد
          </motion.button>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-8 rounded-[2.5rem] flex flex-col lg:flex-row lg:items-center gap-6"
      >
        <div className="relative flex-1 group">
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-5">
            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full rounded-2xl border-0 py-4 pr-12 pl-5 text-slate-900 bg-white/50 backdrop-blur-sm ring-1 ring-inset ring-slate-200/60 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all hover:bg-white/80"
            placeholder="البحث بالاسم، الرقم المدني، أو البريد الإلكتروني..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 bg-white/40 backdrop-blur-md p-2 rounded-2xl border border-white/20">
            <select 
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="bg-transparent border-0 py-2 pr-2 pl-8 text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer"
            >
              <option value="all">جميع الفصول</option>
              {sections.map(s => (
                <option key={s.id} value={s.id}>{s.classes?.name} - {s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card rounded-[2.5rem] overflow-hidden"
      >
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="bg-white/30">
              <tr>
                <th scope="col" className="py-6 pr-10 pl-4 text-right text-xs font-black text-slate-500 uppercase tracking-[0.2em]">الطالب</th>
                <th scope="col" className="px-4 py-6 text-right text-xs font-black text-slate-500 uppercase tracking-[0.2em]">الرقم المدني</th>
                <th scope="col" className="px-4 py-6 text-right text-xs font-black text-slate-500 uppercase tracking-[0.2em]">الصف والشعبة</th>
                <th scope="col" className="px-4 py-6 text-right text-xs font-black text-slate-500 uppercase tracking-[0.2em]">ولي الأمر</th>
                <th scope="col" className="px-4 py-6 text-right text-xs font-black text-slate-500 uppercase tracking-[0.2em]">الحالة</th>
                <th scope="col" className="relative py-6 pl-10 pr-4">
                  <span className="sr-only">إجراءات</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-32 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative h-12 w-12">
                        <div className="absolute inset-0 rounded-full border-4 border-indigo-50/30"></div>
                        <div className="absolute inset-0 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                      </div>
                      <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">جاري تحميل البيانات...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-32 text-center">
                    <div className="flex flex-col items-center gap-6">
                      <div className="h-24 w-24 rounded-[2rem] bg-white/50 flex items-center justify-center">
                        <Search className="h-10 w-10 text-slate-200" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xl font-black text-slate-900">لا يوجد نتائج</p>
                        <p className="text-sm font-medium text-slate-400">لم نجد أي طالب يطابق معايير البحث الخاصة بك</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => (
                  <motion.tr 
                    key={student.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-white/40 transition-all group cursor-pointer"
                  >
                    <td className="whitespace-nowrap py-6 pr-10 pl-4">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-50/50 to-white/50 backdrop-blur-sm flex items-center justify-center text-indigo-600 font-black text-sm border border-white/20 shadow-sm group-hover:scale-110 transition-transform">
                            {student.users?.full_name?.substring(0, 1)}
                          </div>
                          <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{student.users?.full_name}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{student.users?.email || 'لا يوجد بريد'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-6">
                      <span className="text-sm font-bold text-slate-600 font-mono">{student.national_id}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{student.sections?.classes?.name}</span>
                        <span className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mt-0.5">{student.sections?.name}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-6">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-lg bg-white/50 flex items-center justify-center border border-white/20">
                          <Users className="h-3 w-3 text-slate-400" />
                        </div>
                        <span className="text-sm font-bold text-slate-600">
                          {student.parents?.users?.full_name || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-6">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50/50 text-emerald-600 border border-emerald-100/50 backdrop-blur-sm">
                        نشط
                      </span>
                    </td>
                    <td className="relative whitespace-nowrap py-6 pl-10 pr-4 text-left">
                      <div className="flex items-center justify-end gap-2 transition-all">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleResetPasswordClick(student); }}
                          className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm hover:shadow-md bg-white/80 border border-white/20 backdrop-blur-sm"
                          title="إعادة تعيين كلمة المرور"
                        >
                          <Key className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEditClick(student); }}
                          className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm hover:shadow-md bg-white/80 border border-white/20 backdrop-blur-sm"
                          title="تعديل"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(student.id); }}
                          className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl transition-all shadow-sm hover:shadow-md bg-white/80 border border-white/20 backdrop-blur-sm"
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
          ) : filteredStudents.length === 0 ? (
            <div className="py-20 text-center text-sm font-bold text-slate-400 uppercase tracking-widest">
              لا يوجد نتائج
            </div>
          ) : (
            filteredStudents.map((student, idx) => (
              <motion.div 
                key={student.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="p-8 rounded-[2.5rem] bg-white/40 backdrop-blur-md border border-white/20 space-y-8 relative overflow-hidden group"
              >
                <div className="flex justify-between items-start relative z-10">
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <div className="h-16 w-16 rounded-3xl bg-white/80 backdrop-blur-sm shadow-xl shadow-slate-200/50 flex items-center justify-center text-indigo-600 font-black text-xl border border-white/20">
                        {student.users?.full_name?.substring(0, 1)}
                      </div>
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 leading-tight">{student.users?.full_name}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{student.national_id}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleResetPasswordClick(student)}
                      className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-white/20"
                      title="إعادة تعيين كلمة المرور"
                    >
                      <Key className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => handleEditClick(student)}
                      className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-white/20"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(student.id)}
                      className="p-3 text-slate-400 hover:text-red-600 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-white/20"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 relative z-10">
                  <div className="bg-white/60 backdrop-blur-sm p-5 rounded-3xl border border-white/20 shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">الصف والشعبة</span>
                    <span className="text-sm font-bold text-slate-900">{student.sections?.classes?.name}</span>
                    <span className="text-[10px] text-indigo-500 font-black block mt-1">{student.sections?.name}</span>
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm p-5 rounded-3xl border border-white/20 shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">رقم الهاتف</span>
                    <span className="text-sm font-bold text-slate-900">{student.users?.phone || '-'}</span>
                  </div>
                  <div className="col-span-2 bg-white/60 backdrop-blur-sm p-5 rounded-3xl border border-white/20 shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">ولي الأمر</span>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-white/50 flex items-center justify-center border border-white/20">
                        <Users className="h-4 w-4 text-slate-400" />
                      </div>
                      <span className="text-sm font-bold text-slate-900">{student.parents?.users?.full_name || 'غير مسجل'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>

    {/* Edit Student Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowEditModal(false)}></div>
            
            <div className="relative transform overflow-hidden rounded-4xl bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
              <div className="bg-white px-8 pb-8 pt-10 sm:p-10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">تعديل بيانات الطالب</h3>
                  <button onClick={() => setShowEditModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-all">
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <form className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">الاسم الرباعي</label>
                      <input 
                        type="text" 
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                        className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">الرقم المدني</label>
                      <input 
                        type="text" 
                        value={editForm.national_id}
                        onChange={(e) => setEditForm({...editForm, national_id: e.target.value})}
                        className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">البريد الإلكتروني</label>
                      <input 
                        type="email" 
                        value={editForm.email}
                        onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                        className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">رقم الهاتف</label>
                      <input 
                        type="text" 
                        value={editForm.phone}
                        onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                        className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all" 
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">ولي الأمر</label>
                      <select 
                        value={editForm.parent_id}
                        onChange={(e) => setEditForm({...editForm, parent_id: e.target.value})}
                        className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all"
                      >
                        <option value="">بدون ولي أمر</option>
                        {parents.map(parent => (
                          <option key={parent.id} value={parent.id}>
                            {parent.users?.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setShowEditModal(false);
                          handleResetPasswordClick(editingStudent);
                        }}
                        className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                      >
                        <Key className="h-4 w-4" />
                        تغيير كلمة المرور لهذا الطالب
                      </button>
                    </div>
                  </div>
                </form>
              </div>
              <div className="bg-slate-50/50 px-8 py-6 sm:flex sm:flex-row-reverse sm:px-10 gap-3">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-2xl bg-indigo-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 sm:w-auto"
                  onClick={handleEditSubmit}
                >
                  حفظ التعديلات
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-2xl bg-white px-8 py-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 sm:mt-0 sm:w-auto transition-all"
                  onClick={() => setShowEditModal(false)}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowDeleteModal(false)}></div>
            <div className="relative transform overflow-hidden rounded-4xl bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white px-8 pb-8 pt-10 sm:p-10">
                <div className="flex flex-col items-center text-center">
                  <div className="mx-auto flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-3xl bg-red-50 mb-6">
                    <Trash2 className="h-10 w-10 text-red-500" aria-hidden="true" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">حذف الطالب</h3>
                  <p className="text-slate-500 leading-relaxed">
                    هل أنت متأكد من حذف هذا الطالب؟ سيتم حذف جميع البيانات المرتبطة به نهائياً. لا يمكن التراجع عن هذا الإجراء.
                  </p>
                </div>
              </div>
              <div className="bg-slate-50/50 px-8 py-6 sm:flex sm:flex-row-reverse sm:px-10 gap-3">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-2xl bg-red-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-red-100 hover:bg-red-700 transition-all active:scale-95 sm:w-auto"
                  onClick={confirmDelete}
                >
                  تأكيد الحذف
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-2xl bg-white px-8 py-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 sm:mt-0 sm:w-auto transition-all"
                  onClick={() => setShowDeleteModal(false)}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showPasswordResetModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowPasswordResetModal(false)}></div>
            
            <div className="relative transform overflow-hidden rounded-4xl bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md">
              <div className="bg-white px-8 pb-8 pt-10 sm:p-10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">إعادة تعيين كلمة المرور</h3>
                  <button onClick={() => setShowPasswordResetModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-all">
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 mr-1">كلمة المرور الجديدة</label>
                    <input 
                      type="password" 
                      value={resetPasswordForm.newPassword}
                      onChange={(e) => setResetPasswordForm({...resetPasswordForm, newPassword: e.target.value})}
                      className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all" 
                      placeholder="أدخل كلمة المرور الجديدة..."
                    />
                  </div>
                </div>
              </div>
              <div className="bg-slate-50/50 px-8 py-6 sm:flex sm:flex-row-reverse sm:px-10 gap-3">
                <button
                  type="button"
                  onClick={handleResetPasswordSubmit}
                  className="inline-flex w-full justify-center rounded-2xl bg-indigo-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 sm:w-auto"
                >
                  حفظ كلمة المرور
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordResetModal(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-2xl bg-white px-8 py-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 sm:mt-0 sm:w-auto transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowAddModal(false)}></div>
            
            <div className="relative transform overflow-hidden rounded-4xl bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
              <div className="bg-white px-8 pb-8 pt-10 sm:p-10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">إضافة طالب جديد</h3>
                  <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-all">
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <form className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">الاسم الرباعي</label>
                      <input 
                        type="text" 
                        value={addForm.full_name}
                        onChange={(e) => setAddForm({...addForm, full_name: e.target.value})}
                        className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all" 
                        placeholder="أدخل الاسم الكامل..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">الرقم المدني</label>
                      <input 
                        type="text" 
                        value={addForm.national_id}
                        onChange={(e) => setAddForm({...addForm, national_id: e.target.value})}
                        className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all" 
                        placeholder="أدخل الرقم المدني..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">البريد الإلكتروني</label>
                      <input 
                        type="email" 
                        value={addForm.email}
                        onChange={(e) => setAddForm({...addForm, email: e.target.value})}
                        className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all" 
                        placeholder="example@school.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">رقم الهاتف</label>
                      <input 
                        type="text" 
                        value={addForm.phone}
                        onChange={(e) => setAddForm({...addForm, phone: e.target.value})}
                        className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all" 
                        placeholder="أدخل رقم الهاتف..."
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">الشعبة (الصف)</label>
                      <select 
                        value={addForm.section_id}
                        onChange={(e) => setAddForm({...addForm, section_id: e.target.value})}
                        className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all"
                      >
                        <option value="">اختر الشعبة</option>
                        {sections.map(section => (
                          <option key={section.id} value={section.id}>
                            {section.classes?.name} - {section.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">ولي الأمر</label>
                      <select 
                        value={addForm.parent_id}
                        onChange={(e) => setAddForm({...addForm, parent_id: e.target.value})}
                        className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all"
                      >
                        <option value="">بدون ولي أمر</option>
                        {parents.map(parent => (
                          <option key={parent.id} value={parent.id}>
                            {parent.users?.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </form>
              </div>
              <div className="bg-slate-50/50 px-8 py-6 sm:flex sm:flex-row-reverse sm:px-10 gap-3">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-2xl bg-indigo-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 sm:w-auto"
                  onClick={handleAddSubmit}
                >
                  حفظ البيانات
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-2xl bg-white px-8 py-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 sm:mt-0 sm:w-auto transition-all"
                  onClick={() => setShowAddModal(false)}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
