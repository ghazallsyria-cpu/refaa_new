'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Edit, Trash2, X, Key, Download, 
  UserPlus, Users, AlertCircle, FileSpreadsheet, 
  GraduationCap, ChevronRight, ChevronLeft, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { useUsersSystem } from '@/hooks/useUsersSystem';
import { cn } from '@/lib/utils';

export default function StudentsPage() {
  const {
    students, sections, parents, loading,
    fetchStudents, fetchSections, fetchParents,
    addStudent, updateStudent, deleteUser, resetPassword
  } = useUsersSystem();

  // فلاتر البحث والتصنيف
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedTrack, setSelectedTrack] = useState('all');

  // 🚀 نظام التصفح (Pagination) للسرعة الخارقة
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // النوافذ المنبثقة
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  
  // حالات النماذج
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [resetPasswordForm, setResetPasswordForm] = useState({ userId: '', newPassword: '' });
  
  const [addForm, setAddForm] = useState({
    full_name: '', national_id: '', email: '', phone: '', section_id: '', parent_id: ''
  });
  const [editForm, setEditForm] = useState<{
    full_name: string; national_id: string; email: string; phone: string; parent_id: string; next_year_track: 'scientific' | 'literary' | '' | null;
  }>({ full_name: '', national_id: '', email: '', phone: '', parent_id: '', next_year_track: '' });

  // جلب البيانات الأولية
  useEffect(() => {
    fetchStudents();
    fetchSections();
    fetchParents();
  }, [fetchStudents, fetchSections, fetchParents]);

  // 🧠 معالجة البيانات بسرعة عالية مع الفلترة الدقيقة (Deep Extraction)
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // استخراج آمن للبيانات لتفادي مشاكل الـ Arrays من Supabase
      const userData = Array.isArray(s.users) ? s.users[0] : s.users;
      const fullName = userData?.full_name || '';
      const email = userData?.email || '';

      const matchesSection = selectedSection === 'all' || String(s.section_id) === String(selectedSection);
      
      const matchesTrack = selectedTrack === 'all' || 
        (selectedTrack === 'none' ? !s.next_year_track : s.next_year_track === selectedTrack);
      
      const matchesSearch = 
        fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.national_id || '').includes(searchTerm);
      
      return matchesSection && matchesTrack && matchesSearch;
    });
  }, [students, searchTerm, selectedSection, selectedTrack]);

  // حساب التصفح
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const currentStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // 🚀 إحصائيات سريعة للوحة (ذكية: تحسب المسارات لطلاب العاشر فقط!)
  const stats = useMemo(() => {
    // فلترة طلاب الصف العاشر فقط لحساب إحصائيات المسارات بدقة
    const tenthGradeStudents = students.filter(s => {
      const secData = Array.isArray(s.sections) ? s.sections[0] : s.sections;
      const classData = Array.isArray(secData?.classes) ? secData?.classes[0] : secData?.classes;
      return classData?.name?.includes('العاشر') || classData?.level === 10;
    });

    return {
      total: students.length,
      scientific: tenthGradeStudents.filter(s => s.next_year_track === 'scientific').length,
      literary: tenthGradeStudents.filter(s => s.next_year_track === 'literary').length,
      unassigned: students.filter(s => !s.section_id).length,
    };
  }, [students]);

  // ================= الدوال التنفيذية =================
  const handleAddSubmit = async () => {
    try {
      if (!addForm.full_name || !addForm.national_id) {
        alert('يرجى تعبئة الحقول الإلزامية (الاسم والرقم المدني)');
        return;
      }
      await addStudent(addForm);
      alert('تمت الإضافة بنجاح');
      setShowAddModal(false);
      setAddForm({ full_name: '', national_id: '', email: '', phone: '', section_id: '', parent_id: '' });
    } catch (error: any) {
      alert(error.message || 'حدث خطأ أثناء إضافة الطالب');
    }
  };

  const handleEditClick = (student: any) => {
    setEditingStudent(student);
    const userData = Array.isArray(student.users) ? student.users[0] : student.users;
    
    setEditForm({
      full_name: userData?.full_name || '',
      national_id: student.national_id || '',
      email: userData?.email || '',
      phone: userData?.phone || '',
      parent_id: student.parent_id || '',
      next_year_track: student.next_year_track || ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    try {
      if (!editingStudent) return;
      const updateData = {
        full_name: editForm.full_name,
        national_id: editForm.national_id,
        email: editForm.email,
        phone: editForm.phone,
        parent_id: editForm.parent_id || null,
        next_year_track: editForm.next_year_track === '' ? null : (editForm.next_year_track as 'scientific' | 'literary')
      };
      await updateStudent(editingStudent.id, editingStudent.national_id, updateData);
      alert('تم تحديث بيانات الطالب بنجاح');
      setShowEditModal(false);
    } catch (error: any) { alert(error.message || 'حدث خطأ أثناء التحديث'); }
  };

  const handleResetPasswordClick = (student: any) => {
    setResetPasswordForm({ userId: student.id, newPassword: '' });
    setShowPasswordResetModal(true);
  };

  const handleResetPasswordSubmit = async () => {
    try {
      const result = await resetPassword(resetPasswordForm.userId, resetPasswordForm.newPassword);
      alert(`تم تغيير كلمة المرور بنجاح.\nكلمة المرور الجديدة: ${result.newPassword}`);
      setShowPasswordResetModal(false);
    } catch (error: any) { alert(error.message || 'حدث خطأ أثناء تغيير كلمة المرور'); }
  };

  const handleDeleteClick = (id: string) => {
    setStudentToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!studentToDelete) return;
    try {
      await deleteUser(studentToDelete);
      alert('تم حذف الطالب بنجاح');
      setShowDeleteModal(false);
      setStudentToDelete(null);
      fetchStudents();
    } catch (error: any) { alert(error.message || 'حدث خطأ أثناء الحذف'); }
  };

  const exportToExcel = () => {
    const data = filteredStudents.map(student => {
      const userData = Array.isArray(student.users) ? student.users[0] : student.users;
      const secData = Array.isArray(student.sections) ? student.sections[0] : student.sections;
      const classData = Array.isArray(secData?.classes) ? secData?.classes[0] : secData?.classes;
      const parentData = Array.isArray(student.parents) ? student.parents[0] : student.parents;
      const parentUserData = Array.isArray(parentData?.users) ? parentData?.users[0] : parentData?.users;

      return {
        'الاسم الرباعي': userData?.full_name || 'غير معروف',
        'الرقم المدني': student.national_id,
        'البريد الإلكتروني': userData?.email,
        'رقم الهاتف': userData?.phone,
        'الصف': classData?.name || 'غير محدد',
        'الشعبة': secData?.name || 'غير محدد',
        'المسار': student.next_year_track === 'scientific' ? 'علمي' : student.next_year_track === 'literary' ? 'أدبي' : 'غير محدد',
        'ولي الأمر': parentUserData?.full_name || 'غير مسجل'
      };
    });
    
    if (data.length === 0) return alert('لا يوجد بيانات للتصدير');
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "الطلاب");
    XLSX.writeFile(workbook, "قائمة_الطلاب.xlsx");
  };

  return (
    <div className="relative min-h-screen bg-slate-50 font-cairo selection:bg-indigo-200" dir="rtl">
      
      {/* 🎨 خلفية زجاجية سريعة الأداء */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px] opacity-70" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-violet-500/10 blur-[120px] opacity-70" />
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto space-y-8 pb-20 px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* 🚀 الترويسة وأزرار التحكم */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">إدارة الطلاب</h1>
            <p className="text-slate-500 mt-2 font-bold">قاعدة بيانات شاملة لجميع الطلاب المسجلين في النظام.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={exportToExcel}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 transition-all active:scale-95 hover:shadow-md"
            >
              <Download className="h-5 w-5 text-slate-400" /> تصدير Excel
            </button>
            
            <button 
              onClick={() => alert('ميزة الاستيراد الجماعي للطلاب قيد التطوير وستتوفر قريباً!')}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-50 px-5 py-3 text-sm font-black text-indigo-700 shadow-sm border border-indigo-100 hover:bg-indigo-100 transition-all active:scale-95"
            >
              <FileSpreadsheet className="h-5 w-5 text-indigo-500" /> استيراد دفعة واحدة
            </button>

            <button 
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 hover:shadow-indigo-300"
            >
              <UserPlus className="h-5 w-5" /> إضافة طالب
            </button>
          </div>
        </div>

        {/* 📊 مؤشرات سريعة (ذكية) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600"><Users className="h-6 w-6"/></div>
            <div><p className="text-2xl font-black text-slate-900">{stats.total}</p><p className="text-[10px] font-bold text-slate-400 uppercase">إجمالي الطلاب</p></div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-emerald-50 shadow-sm flex items-center gap-4 relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-2 h-full bg-emerald-500"></div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600"><BookOpen className="h-6 w-6"/></div>
            <div><p className="text-2xl font-black text-slate-900">{stats.scientific}</p><p className="text-[10px] font-bold text-slate-400 uppercase">علمي (العاشر)</p></div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-purple-50 shadow-sm flex items-center gap-4 relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-2 h-full bg-purple-500"></div>
            <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600"><BookOpen className="h-6 w-6"/></div>
            <div><p className="text-2xl font-black text-slate-900">{stats.literary}</p><p className="text-[10px] font-bold text-slate-400 uppercase">أدبي (العاشر)</p></div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600"><AlertCircle className="h-6 w-6"/></div>
            <div><p className="text-2xl font-black text-slate-900">{stats.unassigned}</p><p className="text-[10px] font-bold text-slate-400 uppercase">بدون فصل</p></div>
          </div>
        </div>

        {/* 🔍 شريط البحث والفلاتر */}
        <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input
              type="text"
              className="w-full rounded-xl border-0 py-3.5 pr-12 pl-5 text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold transition-all"
              placeholder="البحث بالاسم، الرقم المدني..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); 
              }}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <select 
              value={selectedSection} 
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setCurrentPage(1); 
              }}
              className="flex-1 md:w-48 bg-slate-50 border-0 rounded-xl py-3.5 px-4 font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">جميع الفصول</option>
              {sections.map(s => {
                const classData = Array.isArray(s.classes) ? s.classes[0] : s.classes;
                return <option key={s.id} value={s.id}>{classData?.name} - {s.name}</option>;
              })}
            </select>
            <select 
              value={selectedTrack} 
              onChange={(e) => {
                setSelectedTrack(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 md:w-40 bg-slate-50 border-0 rounded-xl py-3.5 px-4 font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">جميع المسارات</option>
              <option value="scientific">علمي</option>
              <option value="literary">أدبي</option>
              <option value="none">لم يحدد</option>
            </select>
          </div>
        </div>

        {/* 📋 الجدول (يعرض بيانات الصفحة الحالية فقط لسرعة الأداء) */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="py-5 pr-8 pl-4 text-right text-[11px] font-black text-slate-500 uppercase tracking-widest">الطالب</th>
                  <th className="px-4 py-5 text-right text-[11px] font-black text-slate-500 uppercase tracking-widest">الرقم المدني</th>
                  <th className="px-4 py-5 text-right text-[11px] font-black text-slate-500 uppercase tracking-widest">الصف والشعبة</th>
                  <th className="px-4 py-5 text-right text-[11px] font-black text-slate-500 uppercase tracking-widest">المسار</th>
                  <th className="px-4 py-5 text-right text-[11px] font-black text-slate-500 uppercase tracking-widest">ولي الأمر</th>
                  <th className="py-5 pl-8 pr-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={6} className="py-32 text-center"><div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="font-bold text-slate-400">جاري التحميل...</p></td></tr>
                ) : currentStudents.length === 0 ? (
                  <tr><td colSpan={6} className="py-32 text-center"><div className="bg-slate-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4"><Search className="h-8 w-8 text-slate-300"/></div><p className="font-bold text-slate-500">لا يوجد نتائج تطابق الفلاتر</p></td></tr>
                ) : (
                  currentStudents.map((student) => {
                    // استخراج آمن للبيانات
                    const userData = Array.isArray(student.users) ? student.users[0] : student.users;
                    const secData = Array.isArray(student.sections) ? student.sections[0] : student.sections;
                    const classData = Array.isArray(secData?.classes) ? secData?.classes[0] : secData?.classes;
                    const parentData = Array.isArray(student.parents) ? student.parents[0] : student.parents;
                    const parentUserData = Array.isArray(parentData?.users) ? parentData?.users[0] : parentData?.users;

                    return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="whitespace-nowrap py-4 pr-8 pl-4">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm border border-indigo-100 group-hover:scale-110 transition-transform">
                            {userData?.full_name?.charAt(0) || 'ط'}
                          </div>
                          <div>
                            <p className="font-black text-slate-900">{userData?.full_name || 'غير معروف'}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{userData?.email || 'لا يوجد بريد'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-bold text-slate-600 font-mono">{student.national_id}</td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-900">{classData?.name || 'بدون صف'}</span>
                          <span className="text-[10px] font-bold text-indigo-500">{secData?.name || 'بدون شعبة'}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {classData?.level === 10 || classData?.name?.includes('العاشر') ? (
                          student.next_year_track ? (
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${student.next_year_track === 'scientific' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                              {student.next_year_track === 'scientific' ? 'علمي' : 'أدبي'}
                            </span>
                          ) : <span className="text-[10px] font-bold text-slate-400">لم يحدد</span>
                        ) : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-bold text-slate-600">
                        {parentUserData?.full_name || 'غير مسجل'}
                      </td>
                      <td className="whitespace-nowrap py-4 pl-8 pr-4 text-left">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleResetPasswordClick(student)} className="p-2 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 rounded-lg shadow-sm border border-slate-200 transition-all"><Key className="w-4 h-4" /></button>
                          <button onClick={() => handleEditClick(student)} className="p-2 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 rounded-lg shadow-sm border border-slate-200 transition-all"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteClick(student.id)} className="p-2 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 rounded-lg shadow-sm border border-slate-200 transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  )})}
                )}
              </tbody>
            </table>
          </div>

          {/* العرض للموبايل (Cards) */}
          <div className="lg:hidden p-4 grid gap-4 bg-slate-50/50">
             {loading ? <div className="py-10 text-center text-slate-400 font-bold">جاري التحميل...</div> : currentStudents.length === 0 ? <div className="py-10 text-center text-slate-400 font-bold">لا يوجد نتائج</div> : 
               currentStudents.map((student) => {
                 const userData = Array.isArray(student.users) ? student.users[0] : student.users;
                 const secData = Array.isArray(student.sections) ? student.sections[0] : student.sections;
                 const classData = Array.isArray(secData?.classes) ? secData?.classes[0] : secData?.classes;
                 const parentData = Array.isArray(student.parents) ? student.parents[0] : student.parents;
                 const parentUserData = Array.isArray(parentData?.users) ? parentData?.users[0] : parentData?.users;

                 return (
                 <div key={student.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-start justify-between">
                       <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-indigo-50 text-indigo-600 font-black rounded-xl flex items-center justify-center">{userData?.full_name?.charAt(0) || 'ط'}</div>
                          <div><p className="font-black text-slate-900">{userData?.full_name || 'غير معروف'}</p><p className="text-xs font-bold text-slate-500 font-mono">{student.national_id}</p></div>
                       </div>
                       <div className="flex gap-1">
                          <button onClick={() => handleResetPasswordClick(student)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-lg"><Key className="w-4 h-4" /></button>
                          <button onClick={() => handleEditClick(student)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteClick(student.id)} className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                       </div>
                    </div>
                    <div className="flex justify-between text-xs font-bold bg-slate-50 p-3 rounded-xl border border-slate-100">
                       <span className="text-slate-600">{classData?.name || ''} - {secData?.name || ''}</span>
                       <span className="text-slate-500 max-w-[120px] truncate">{parentUserData?.full_name || 'بدون ولي أمر'}</span>
                    </div>
                 </div>
               )})}
             
          </div>

          {/* 🚀 نظام التصفح (Pagination UI) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
              <p className="text-sm font-bold text-slate-500">
                إظهار <span className="font-black text-slate-900">{((currentPage - 1) * itemsPerPage) + 1}</span> إلى <span className="font-black text-slate-900">{Math.min(currentPage * itemsPerPage, filteredStudents.length)}</span> من أصل <span className="font-black text-slate-900">{filteredStudents.length}</span>
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="p-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                ><ChevronRight className="w-5 h-5"/></button>
                <div className="flex items-center gap-1 px-2 font-black text-sm text-slate-700">
                  {currentPage} / {totalPages}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="p-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                ><ChevronLeft className="w-5 h-5"/></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* النوافذ المنبثقة للنماذج (Add/Edit/Delete/Password) */}
      {/* 🚀 Add Student Modal (مع تلميح الاستيراد) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden my-8">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                 <h3 className="text-2xl font-black text-slate-900">إضافة طالب جديد</h3>
                 <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-1">
                   <AlertCircle className="w-3 h-3 text-indigo-500"/>
                   تلميح: لإضافة مجموعة طلاب، انتظر ميزة &quot;الاستيراد عبر Excel&quot; قريباً.
                 </p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-white rounded-xl shadow-sm text-slate-400 hover:text-rose-500 transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <div><label className="text-xs font-black text-slate-700 block mb-2">الاسم الرباعي <span className="text-rose-500">*</span></label><input type="text" value={addForm.full_name} onChange={e => setAddForm({...addForm, full_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                 <div><label className="text-xs font-black text-slate-700 block mb-2">الرقم المدني <span className="text-rose-500">*</span></label><input type="text" value={addForm.national_id} onChange={e => setAddForm({...addForm, national_id: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                 <div><label className="text-xs font-black text-slate-700 block mb-2">البريد الإلكتروني</label><input type="email" value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-left" dir="ltr" /></div>
                 <div><label className="text-xs font-black text-slate-700 block mb-2">رقم الهاتف</label><input type="text" value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                 <div className="sm:col-span-2"><label className="text-xs font-black text-slate-700 block mb-2">الشعبة والفصل</label><select value={addForm.section_id} onChange={e => setAddForm({...addForm, section_id: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"><option value="">بدون شعبة</option>
                 {sections.map(s => {
                   const classData = Array.isArray(s.classes) ? s.classes[0] : s.classes;
                   return <option key={s.id} value={s.id}>{classData?.name} - {s.name}</option>;
                 })}
                 </select></div>
                 <div className="sm:col-span-2"><label className="text-xs font-black text-slate-700 block mb-2">حساب ولي الأمر (اختياري)</label><select value={addForm.parent_id} onChange={e => setAddForm({...addForm, parent_id: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"><option value="">بدون ولي أمر</option>
                 {parents.map(p => {
                    const pUserData = Array.isArray(p.users) ? p.users[0] : p.users;
                    return <option key={p.id} value={p.id}>{pUserData?.full_name}</option>;
                 })}
                 </select></div>
              </div>
              <div className="flex gap-3 pt-6 border-t border-slate-100">
                <button onClick={handleAddSubmit} className="flex-1 bg-indigo-600 text-white font-black py-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">إضافة الطالب</button>
                <button onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 text-slate-700 font-black py-3 rounded-xl hover:bg-slate-200 transition-colors">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden my-8">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-2xl font-black text-slate-900">تعديل بيانات الطالب</h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 bg-white rounded-xl shadow-sm text-slate-400 hover:text-rose-500 transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <div><label className="text-xs font-black text-slate-700 block mb-2">الاسم الرباعي</label><input type="text" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                 <div><label className="text-xs font-black text-slate-700 block mb-2">الرقم المدني</label><input type="text" value={editForm.national_id} onChange={e => setEditForm({...editForm, national_id: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                 <div><label className="text-xs font-black text-slate-700 block mb-2">البريد الإلكتروني</label><input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-left" dir="ltr" /></div>
                 <div><label className="text-xs font-black text-slate-700 block mb-2">رقم الهاتف</label><input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                 <div className="sm:col-span-2"><label className="text-xs font-black text-slate-700 block mb-2">ولي الأمر</label><select value={editForm.parent_id} onChange={e => setEditForm({...editForm, parent_id: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"><option value="">بدون ولي أمر</option>
                 {parents.map(p => {
                    const pUserData = Array.isArray(p.users) ? p.users[0] : p.users;
                    return <option key={p.id} value={p.id}>{pUserData?.full_name}</option>;
                 })}
                 </select></div>
                 
                 {/* شرط ظهور التخصص: فقط للعاشر! */}
                 {(() => {
                   const secData = Array.isArray(editingStudent?.sections) ? editingStudent?.sections[0] : editingStudent?.sections;
                   const classData = Array.isArray(secData?.classes) ? secData?.classes[0] : secData?.classes;
                   if (classData?.level === 10 || classData?.name?.includes('العاشر')) {
                     return (
                       <div className="sm:col-span-2"><label className="text-xs font-black text-slate-700 block mb-2">المسار الأكاديمي (للعاشر)</label><select value={editForm.next_year_track || ''} onChange={e => setEditForm({...editForm, next_year_track: e.target.value as any})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"><option value="">لم يحدد</option><option value="scientific">علمي</option><option value="literary">أدبي</option></select></div>
                     );
                   }
                   return null;
                 })()}
              </div>
              <div className="flex gap-3 pt-6 border-t border-slate-100">
                <button onClick={handleEditSubmit} className="flex-1 bg-indigo-600 text-white font-black py-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">حفظ التعديلات</button>
                <button onClick={() => setShowEditModal(false)} className="flex-1 bg-slate-100 text-slate-700 font-black py-3 rounded-xl hover:bg-slate-200 transition-colors">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden my-8 p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4"><Key className="w-8 h-8"/></div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">تغيير كلمة المرور</h3>
            <p className="text-sm font-bold text-slate-500 mb-6">أدخل كلمة المرور الجديدة للطالب في المربع أدناه.</p>
            <input type="text" placeholder="كلمة المرور الجديدة..." value={resetPasswordForm.newPassword} onChange={e => setResetPasswordForm({...resetPasswordForm, newPassword: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none mb-6 text-center tracking-widest" />
            <div className="flex gap-3">
              <button onClick={handleResetPasswordSubmit} className="flex-1 bg-indigo-600 text-white font-black py-3 rounded-xl hover:bg-indigo-700 transition-colors">حفظ</button>
              <button onClick={() => setShowPasswordResetModal(false)} className="flex-1 bg-slate-100 text-slate-700 font-black py-3 rounded-xl hover:bg-slate-200 transition-colors">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden my-8 p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4"><Trash2 className="w-8 h-8"/></div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">حذف الطالب النهائي</h3>
            <p className="text-sm font-bold text-slate-500 mb-6 leading-relaxed">هل أنت متأكد من حذف هذا الطالب؟ هذا الإجراء سيقوم بحذف جميع درجاته وغياباته ولا يمكن التراجع عنه.</p>
            <div className="flex gap-3">
              <button onClick={confirmDelete} className="flex-1 bg-rose-600 text-white font-black py-3 rounded-xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200">نعم، احذف الطالب</button>
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 bg-slate-100 text-slate-700 font-black py-3 rounded-xl hover:bg-slate-200 transition-colors">تراجع</button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
