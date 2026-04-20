/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Plus, Search, Edit, Trash2, X, Key, BookOpen, AlertCircle, 
  Users, GraduationCap, Folder, ChevronLeft, ChevronRight, // 👈 تم إضافة ChevronRight و ChevronLeft
  Award, Crown, CheckCircle2, LayoutGrid, List,
  Loader2, UserPlus, Send, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUsersSystem } from '@/hooks/useUsersSystem';
import { useTeacherAssignmentsSystem } from '@/hooks/useTeacherAssignmentsSystem';
import { useAuth } from '@/context/auth-context';
import GrantBadgeModal from '@/components/GrantBadgeModal';
import { supabase } from '@/lib/supabase';

// ============================================================================
// 🧩 مكون سطر المعلم المعزول (Table Row)
// ============================================================================
const TeacherTableRow = ({ teacher, onGrantBadge, onResetPassword, onEdit, onDelete, onAssign }: any) => {
  const userData = Array.isArray(teacher.users) ? teacher.users[0] : teacher.users;
  const isHOD = teacher.isHOD;
  const departmentName = teacher.academic_departments?.name || 'غير محدد';

  return (
    <tr className="hover:bg-slate-50/80 transition-colors group border-b border-slate-50">
      <td className="whitespace-nowrap py-4 pr-8 pl-4">
        <div className="flex items-center gap-4 text-right">
          <div className="relative">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm border group-hover:scale-110 transition-transform ${isHOD ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
              {userData?.avatar_url ? <img src={userData.avatar_url} className="w-full h-full object-cover rounded-xl" alt="T"/> : (userData?.full_name?.charAt(0) || 'م')}
            </div>
            {isHOD && <Crown className="absolute -top-2 -right-2 h-4 w-4 text-yellow-500 drop-shadow-sm" />}
          </div>
          <div>
            <p className="font-black text-slate-900">{userData?.full_name || 'غير معروف'}</p>
            <p className="text-[10px] text-slate-400 font-bold">{userData?.email || 'لا يوجد بريد'}</p>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-sm font-bold text-slate-600 font-mono text-center">{teacher.national_id}</td>
      <td className="whitespace-nowrap px-4 py-4 text-center">
        <span className="text-sm font-black text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 shadow-inner">{departmentName}</span>
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-center">
        <div className="flex flex-wrap gap-1 justify-center">
          {isHOD && <span className="px-2 py-1 bg-amber-500 text-white text-[9px] font-black rounded-md shadow-sm">رئيس قسم</span>}
          <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[9px] font-bold rounded-md border border-slate-200">{teacher.specialization || 'عام'}</span>
        </div>
      </td>
      <td className="whitespace-nowrap py-4 pl-8 pr-4 text-left">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onAssign(teacher)} className="p-2 text-slate-400 hover:text-emerald-600 bg-white hover:bg-emerald-50 rounded-lg shadow-sm border border-slate-200 transition-all"><BookOpen className="w-4 h-4" /></button>
          <button onClick={() => onGrantBadge(teacher)} className="p-2 text-slate-400 hover:text-amber-600 bg-white hover:bg-amber-50 rounded-lg shadow-sm border border-slate-200 transition-all"><Award className="w-4 h-4" /></button>
          <button onClick={() => onResetPassword(teacher)} className="p-2 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 rounded-lg shadow-sm border border-slate-200 transition-all"><Key className="w-4 h-4" /></button>
          <button onClick={() => onEdit(teacher)} className="p-2 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 rounded-lg shadow-sm border border-slate-200 transition-all"><Edit className="w-4 h-4" /></button>
          <button onClick={() => onDelete(teacher.id)} className="p-2 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 rounded-lg shadow-sm border border-slate-200 transition-all"><Trash2 className="w-4 h-4" /></button>
        </div>
      </td>
    </tr>
  );
};

export default function TeachersPage() {
  const { user } = useAuth(); 
  const {
    departments, subjects, sections,
    fetchDepartments, fetchSections, fetchSubjects, fetchTeachersPaginated,
    addTeacher, updateTeacher, deleteUser, resetPassword
  } = useUsersSystem() as any;

  const { fetchTeacherAssignments, saveAssignments, deleteAssignment } = useTeacherAssignmentsSystem();

  // 🚀 حالات البيانات
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [totalTeachers, setTotalTeachers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, hods: 0, unassigned: 0 });

  // 🚀 حالات العمليات
  const [submitting, setSubmitting] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // حالات العرض والتحكم
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const totalPages = Math.ceil(totalTeachers / itemsPerPage) || 1;

  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // المودالز
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);

  // البيانات المؤقتة للنماذج
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<string | null>(null);
  const [teacherForBadge, setTeacherForBadge] = useState<any>(null);
  const [resetPasswordForm, setResetPasswordForm] = useState({ userId: '', newPassword: '' });
  const [addForm, setAddForm] = useState({ full_name: '', national_id: '', email: '', phone: '', specialization: '', zoom_link: '', department_id: '' });
  const [editForm, setEditForm] = useState<any>({ full_name: '', national_id: '', email: '', phone: '', specialization: '', zoom_link: '', department_id: '', custom_titles: '', isHOD: false, hod_subject_id: '', hod_stage: 'الكل' });
  
  const [selectedTeacherForAssign, setSelectedTeacherForAssign] = useState<any>(null);
  const [teacherSections, setTeacherSections] = useState<any[]>([]);
  const [bulkAssignData, setBulkAssignData] = useState<{ section_ids: string[], subject_ids: string[] }>({ section_ids: [], subject_ids: [] });

  // جلب البيانات الأولية
  useEffect(() => {
    const initPage = async () => {
      if (fetchDepartments) await fetchDepartments();
      await fetchSections();
      await fetchSubjects();
      const { data } = await supabase.from('teachers').select('id, department_heads(id), teacher_sections(section_id)');
      if (data) setStats({ total: data.length, hods: data.filter((t: any) => t.department_heads?.length > 0).length, unassigned: data.filter((t: any) => !t.teacher_sections || t.teacher_sections.length === 0).length });
    };
    initPage();
  }, []);

  // جلب المعلمين بنظام الصفحات
  const loadTeachers = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchTeachersPaginated(currentPage, itemsPerPage, searchQuery, selectedDepartment);
    setTeachersList(result.data);
    setTotalTeachers(result.totalCount);
    setIsLoading(false);
  }, [currentPage, itemsPerPage, searchQuery, selectedDepartment]);

  useEffect(() => {
    const timer = setTimeout(() => loadTeachers(), 300);
    return () => clearTimeout(timer);
  }, [loadTeachers]);

  // الدوال التنفيذية
  const handleAddSubmit = async () => { 
    if (!addForm.full_name || !addForm.national_id || !addForm.department_id) return showNotification('error', 'يرجى تعبئة الحقول المطلوبة'); 
    setSubmitting(true);
    try { 
      await addTeacher(addForm); 
      if (addForm.department_id) {
         const { data } = await supabase.from('users').select('id').eq('national_id', addForm.national_id).single();
         if (data) await supabase.from('teachers').update({ department_id: addForm.department_id }).eq('id', data.id);
      }
      showNotification('success', 'تمت إضافة المعلم بنجاح'); 
      setShowAddModal(false); 
      setAddForm({ full_name: '', national_id: '', email: '', phone: '', specialization: '', zoom_link: '', department_id: '' }); 
      loadTeachers();
    } catch (e: any) { showNotification('error', e.message); } 
    finally { setSubmitting(false); }
  };

  const handleOpenEditModal = (teacher: any) => {
    setEditingTeacher(teacher);
    const isHod = teacher.isHOD;
    const ud = Array.isArray(teacher.users) ? teacher.users[0] : teacher.users;
    setEditForm({ 
      full_name: ud?.full_name || '', national_id: teacher.national_id || '', email: ud?.email || '', phone: ud?.phone || '', 
      specialization: teacher.specialization || '', zoom_link: teacher.zoom_link || '', 
      department_id: teacher.department_id || '', custom_titles: (teacher.custom_titles || []).join('، '), 
      isHOD: isHod, hod_subject_id: isHod ? teacher.department_heads[0]?.subject_id : '', hod_stage: 'الكل' 
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    setSubmittingEdit(true);
    try {
      const payload = { full_name: editForm.full_name, email: editForm.email, phone: editForm.phone, specialization: editForm.specialization, zoom_link: editForm.zoom_link, national_id: editForm.national_id.trim(), department_id: editForm.department_id, custom_titles: editForm.custom_titles.split('،').map((s: string) => s.trim()).filter(Boolean) };
      const hodData = { isHead: editForm.isHOD, subject_id: editForm.hod_subject_id, stage_name: editForm.hod_stage };
      await updateTeacher(editingTeacher.id, editingTeacher.national_id, payload, hodData);
      if (editForm.department_id) await supabase.from('teachers').update({ department_id: editForm.department_id }).eq('id', editingTeacher.id);
      showNotification('success', 'تم تحديث البيانات');
      setShowEditModal(false);
      loadTeachers();
    } catch (e: any) { showNotification('error', e.message); }
    finally { setSubmittingEdit(false); }
  };

  const handleAssignmentClick = async (teacher: any) => {
    setSelectedTeacherForAssign(teacher);
    setBulkAssignData({ section_ids: [], subject_ids: [] });
    try {
      const assignments = await fetchTeacherAssignments(teacher.id);
      setTeacherSections(assignments);
      setShowAssignmentModal(true);
    } catch (e) { showNotification('error', 'خطأ في جلب البيانات'); }
  };

  const toggleAssignment = async (sectionId: string, subjectId: string) => {
    const existing = teacherSections.find(ts => ts.section_id === sectionId && ts.subject_id === subjectId);
    try {
      if (existing) {
        await deleteAssignment(selectedTeacherForAssign.id, sectionId, subjectId);
        setTeacherSections(prev => prev.filter(ts => !(ts.section_id === sectionId && ts.subject_id === subjectId)));
      } else {
        await saveAssignments([{ teacher_id: selectedTeacherForAssign.id, section_id: sectionId, subject_id: subjectId }]);
        setTeacherSections(await fetchTeacherAssignments(selectedTeacherForAssign.id));
      }
    } catch (e) { showNotification('error', 'فشل التحديث'); }
  };

  const handleBulkAssign = async () => {
    if (bulkAssignData.section_ids.length === 0 || bulkAssignData.subject_ids.length === 0) return showNotification('error', 'اختر فصلاً ومادة');
    try {
      const news: any[] = [];
      bulkAssignData.section_ids.forEach(sid => bulkAssignData.subject_ids.forEach(subid => news.push({ teacher_id: selectedTeacherForAssign.id, section_id: sid, subject_id: subid })));
      await saveAssignments(news);
      setTeacherSections(await fetchTeacherAssignments(selectedTeacherForAssign.id));
      setBulkAssignData({ section_ids: [], subject_ids: [] });
      showNotification('success', 'تم التعيين الجماعي بنجاح');
    } catch (e) { showNotification('error', 'فشل التعيين'); }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 font-cairo pb-20" dir="rtl">
      
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }} className={`fixed top-8 left-1/2 z-50 px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 border backdrop-blur-xl ${notification.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
            <span className="font-bold text-sm">{notification.message}</span>
            <button onClick={() => setNotification(null)}><X size={16}/></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight text-right">إدارة المعلمين</h1>
            <p className="text-slate-500 mt-2 font-bold text-right">تنظيم الهيكلية المدرسية، المناصب، وتوزيع الفصول.</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="px-8 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
            <Plus size={20}/> إضافة معلم جديد
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 text-right">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600"><Users size={24}/></div>
            <div><p className="text-2xl font-black text-slate-900">{stats.total}</p><p className="text-[10px] font-bold text-slate-400 uppercase">إجمالي المعلمين</p></div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 text-right">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600"><Crown size={24}/></div>
            <div><p className="text-2xl font-black text-slate-900">{stats.hods}</p><p className="text-[10px] font-bold text-slate-400 uppercase">رؤساء أقسام</p></div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 text-right">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600"><Folder size={24}/></div>
            <div><p className="text-2xl font-black text-slate-900">{departments?.length || 0}</p><p className="text-[10px] font-bold text-slate-400 uppercase">أقسام</p></div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 text-right">
            <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600"><AlertCircle size={24}/></div>
            <div><p className="text-2xl font-black text-slate-900">{stats.unassigned}</p><p className="text-[10px] font-bold text-slate-400 uppercase">غير معينين</p></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-100 w-full lg:w-auto">
            <button onClick={() => setViewMode('table')} className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-black transition-all ${viewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}><List size={16}/> القائمة</button>
            <button onClick={() => setViewMode('grid')} className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-black transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}><LayoutGrid size={16}/> الأقسام</button>
          </div>
          <div className="flex w-full lg:w-auto gap-2 flex-1 max-w-2xl">
            <div className="relative flex-1 group">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input type="text" className="w-full rounded-xl border-0 py-3.5 pr-12 text-right bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="بحث..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className="w-48 bg-slate-50 border-0 rounded-xl py-3.5 px-4 font-bold text-slate-700 outline-none">
              <option value="all">جميع الأقسام</option>
              {departments?.map((d:any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
          {viewMode === 'table' ? (
            <div className="overflow-x-auto min-h-[400px]">
              <table className="min-w-full divide-y divide-slate-100 text-right">
                <thead className="bg-slate-50/50">
                  <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <th className="py-5 pr-8 pl-4">المعلم</th>
                    <th className="px-4 py-5 text-center">الرقم المدني</th>
                    <th className="px-4 py-5 text-center">القسم</th>
                    <th className="px-4 py-5 text-center">التخصص</th>
                    <th className="py-5 pl-8 pr-4 text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {isLoading ? (
                    <tr><td colSpan={5} className="py-32 text-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto" /></td></tr>
                  ) : teachersList.map((t) => (
                    <TeacherTableRow key={t.id} teacher={t} onAssign={() => handleAssignmentClick(t)} onGrantBadge={(st:any) => { setTeacherForBadge({ id: st.id, name: (Array.isArray(st.users)?st.users[0]:st.users)?.full_name }); setIsBadgeModalOpen(true); }} onResetPassword={(st:any) => { setResetPasswordForm({ userId: st.id, newPassword: '' }); setShowPasswordModal(true); }} onEdit={handleOpenEditModal} onDelete={(id:string) => { setTeacherToDelete(id); setShowDeleteModal(true); }} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {departments?.map((dept: any) => (
                <div key={dept.id} onClick={() => { setViewMode('table'); setSelectedDepartment(dept.id); }} className="bg-slate-50 p-8 rounded-[2.5rem] cursor-pointer border border-slate-100 hover:border-indigo-200 text-center group">
                  <div className="h-16 w-16 rounded-2xl bg-white flex items-center justify-center text-indigo-600 mx-auto mb-4 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all"><Folder size={28}/></div>
                  <h3 className="text-lg font-black text-slate-800">{dept.name}</h3>
                </div>
              ))}
            </div>
          )}
          {totalPages > 1 && viewMode === 'table' && (
            <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
              <p className="text-sm font-bold text-slate-500">إظهار {teachersList.length} من {totalTeachers}</p>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isLoading} className="p-2 rounded-xl bg-slate-50"><ChevronRight size={20}/></button>
                <div className="flex items-center px-4 font-black text-sm text-indigo-600 bg-indigo-50 rounded-xl">{currentPage} / {totalPages}</div>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || isLoading} className="p-2 rounded-xl bg-slate-50"><ChevronLeft size={20}/></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* نافذة الإضافة */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto" dir="rtl">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden my-8">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-2xl font-black text-slate-900">إضافة معلم جديد</h3>
              <button onClick={() => setShowAddModal(false)}><X size={24}/></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <input type="text" placeholder="الاسم الرباعي *" value={addForm.full_name} onChange={e => setAddForm({...addForm, full_name: e.target.value})} className="w-full rounded-2xl border-0 py-3 px-4 bg-slate-50 font-bold" />
                <input type="text" placeholder="الرقم المدني *" value={addForm.national_id} onChange={e => setAddForm({...addForm, national_id: e.target.value})} className="w-full rounded-2xl border-0 py-3 px-4 bg-slate-50 font-bold" />
                <input type="text" placeholder="رقم الهاتف" value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} className="w-full rounded-2xl border-0 py-3 px-4 bg-slate-50 font-bold" />
                <input type="email" placeholder="البريد الإلكتروني" value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} className="w-full rounded-2xl border-0 py-3 px-4 bg-slate-50 font-bold" />
                <select value={addForm.department_id} onChange={e => setAddForm({...addForm, department_id: e.target.value})} className="sm:col-span-2 w-full rounded-2xl border-0 py-3 px-4 bg-slate-50 font-bold">
                  <option value="">-- اختر القسم الأكاديمي --</option>
                  {departments?.map((d:any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <input type="text" placeholder="التخصص" value={addForm.specialization} onChange={e => setAddForm({...addForm, specialization: e.target.value})} className="sm:col-span-2 w-full rounded-2xl border-0 py-3 px-4 bg-slate-50 font-bold" />
              </div>
              <div className="bg-slate-50 px-6 py-6 flex flex-row-reverse gap-3 border-t">
                <button disabled={submitting} onClick={handleAddSubmit} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black disabled:opacity-50">{submitting ? 'جاري الإضافة...' : 'إضافة المعلم'}</button>
                <button onClick={() => setShowAddModal(false)} className="flex-1 bg-white border py-4 rounded-2xl font-black">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة التعديل */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto" dir="rtl">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden my-8">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-2xl font-black text-slate-900">تعديل الملف</h3>
              <button onClick={() => setShowEditModal(false)}><X size={24}/></button>
            </div>
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <input type="text" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="w-full rounded-2xl border-0 py-3 px-4 bg-slate-50 font-bold" />
                <input type="text" value={editForm.national_id} onChange={e => setEditForm({...editForm, national_id: e.target.value})} className="w-full rounded-2xl border-0 py-3 px-4 bg-slate-50 font-bold" />
                <select value={editForm.department_id} onChange={e => setEditForm({...editForm, department_id: e.target.value})} className="sm:col-span-2 w-full rounded-2xl border-0 py-3 px-4 bg-slate-50 font-bold">
                  {departments?.map((d:any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <div className="sm:col-span-2 bg-amber-50 p-6 rounded-3xl border border-amber-100 space-y-4">
                  <div className="flex items-center gap-3"><input type="checkbox" id="isHOD" checked={editForm.isHOD} onChange={e => setEditForm({...editForm, isHOD: e.target.checked})}/><label htmlFor="isHOD" className="font-black text-sm">رئيس قسم</label></div>
                  {editForm.isHOD && <div className="grid grid-cols-2 gap-3"><select value={editForm.hod_subject_id} onChange={e => setEditForm({...editForm, hod_subject_id: e.target.value})} className="w-full rounded-xl border-0 py-3 px-4 bg-white font-bold"><option value="">-- المادة --</option>{subjects?.map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>}
                </div>
              </div>
              <div className="bg-slate-50 px-6 py-6 flex flex-row-reverse gap-3 border-t">
                <button disabled={submittingEdit} onClick={handleEditSubmit} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black disabled:opacity-50">حفظ التعديلات</button>
                <button onClick={() => setShowEditModal(false)} className="flex-1 bg-white border py-4 rounded-2xl font-black">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة التعيين */}
      {showAssignmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60" dir="rtl">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black">جدول حصص: {selectedTeacherForAssign?.users?.full_name}</h3>
              <button onClick={() => setShowAssignmentModal(false)}><X size={24}/></button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto space-y-8 text-right">
              <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100">
                <h4 className="font-black text-sm mb-4">التعيين السريع</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-wrap gap-2 justify-end">{subjects?.map((s:any) => <button key={s.id} onClick={() => setBulkAssignData(prev => ({ ...prev, subject_ids: prev.subject_ids.includes(s.id) ? prev.subject_ids.filter(id => id !== s.id) : [...prev.subject_ids, s.id] }))} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${bulkAssignData.subject_ids.includes(s.id) ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-amber-700 hover:border-amber-400'}`}>{s.name}</button>)}</div>
                  <div className="flex flex-wrap gap-2 justify-end">{sections?.map((s:any) => <button key={s.id} onClick={() => setBulkAssignData(prev => ({ ...prev, section_ids: prev.section_ids.includes(s.id) ? prev.section_ids.filter(id => id !== s.id) : [...prev.section_ids, s.id] }))} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${bulkAssignData.section_ids.includes(s.id) ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-amber-700 hover:border-amber-400'}`}>{s.classes?.name} - {s.name}</button>)}</div>
                </div>
                <button onClick={handleBulkAssign} className="w-full mt-6 py-3 bg-amber-500 text-white rounded-xl font-black shadow-lg hover:bg-amber-600 transition-all">حفظ التعيين</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {sections?.map((sec:any) => (
                  <div key={sec.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h4 className="font-black text-xs mb-2 text-slate-700">{sec.classes?.name} - {sec.name}</h4>
                    <div className="flex flex-wrap gap-1 justify-end">{subjects?.map((sub:any) => <button key={sub.id} onClick={() => toggleAssignment(sec.id, sub.id)} className={`px-2 py-1 rounded text-[9px] font-bold border transition-all ${teacherSections.some(ts => ts.section_id === sec.id && ts.subject_id === sub.id) ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-300'}`}>{sub.name}</button>)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-50 p-6 flex justify-end border-t"><button onClick={() => setShowAssignmentModal(false)} className="px-10 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 transition-all">إغلاق</button></div>
          </div>
        </div>
      )}

      {/* مودال الأوسمة وكلمة المرور والحذف */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white w-full max-w-md rounded-[2rem] p-8 text-center shadow-2xl border border-slate-100">
            <div className="mx-auto w-16 h-16 bg-sky-50 text-sky-600 flex items-center justify-center rounded-2xl mb-4"><Key size={32}/></div>
            <h3 className="text-xl font-black mb-6">تغيير كلمة المرور</h3>
            <input type="text" placeholder="كلمة المرور الجديدة..." value={resetPasswordForm.newPassword} onChange={e => setResetPasswordForm({...resetPasswordForm, newPassword: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-5 py-4 font-bold text-center text-lg mb-6 outline-none focus:ring-2 focus:ring-indigo-500" dir="ltr"/>
            <div className="flex gap-3"><button onClick={handleResetPasswordSubmit} className="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-black hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">حفظ</button><button onClick={() => setShowPasswordModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-3.5 rounded-xl font-black hover:bg-slate-200 transition-all">إلغاء</button></div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white p-8 rounded-[2rem] text-center max-w-sm w-full shadow-2xl border border-slate-100">
            <div className="mx-auto w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4"><Trash2 size={32}/></div>
            <h3 className="text-xl font-black mb-4">حذف نهائي؟</h3>
            <p className="text-slate-500 font-bold text-sm mb-6">هذا الإجراء سيقوم بحذف المعلم وجميع سجلاته نهائياً من النظام.</p>
            <div className="flex gap-3"><button onClick={confirmDelete} className="bg-rose-600 text-white py-3.5 rounded-xl font-black flex-1 hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all">نعم، حذف</button><button onClick={() => setShowDeleteModal(false)} className="bg-slate-100 py-3.5 rounded-xl font-black flex-1 border border-slate-200 hover:bg-slate-200">تراجع</button></div>
          </div>
        </div>
      )}

      {teacherForBadge && <GrantBadgeModal isOpen={isBadgeModalOpen} onClose={() => { setIsBadgeModalOpen(false); setTeacherForBadge(null); }} recipientId={teacherForBadge.id} recipientName={teacherForBadge.name} granterId={user?.id || 'admin'} />}
    </div>
  );
}
