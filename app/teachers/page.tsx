/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
// ابحث عن هذا السطر في أعلى الملف وقم بتغييره ليصبح هكذا:
import { 
  Plus, Search, Edit, Trash2, X, Key, BookOpen, AlertCircle, 
  Users, GraduationCap, Folder, ChevronLeft, School, Layers, Award, Crown, ChevronRight, CheckCircle2, LayoutGrid, List,
  Loader2, UserPlus // 🚀 أضف هاتين الأيقونتين هنا
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
  const isHOD = teacher.department_heads && teacher.department_heads.length > 0;
  const departmentName = teacher.academic_departments?.name || 'غير محدد';

  return (
    <tr className="hover:bg-slate-50/80 transition-colors group border-b border-slate-50">
      <td className="whitespace-nowrap py-4 pr-8 pl-4">
        <div className="flex items-center gap-4">
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
      <td className="whitespace-nowrap px-4 py-4 text-sm font-bold text-slate-600 font-mono">{teacher.national_id}</td>
      <td className="whitespace-nowrap px-4 py-4">
        <span className="text-sm font-black text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 shadow-inner">{departmentName}</span>
      </td>
      <td className="whitespace-nowrap px-4 py-4">
        <div className="flex flex-wrap gap-1 max-w-[150px]">
          {isHOD && <span className="px-2 py-1 bg-amber-500 text-white text-[9px] font-black rounded-md shadow-sm">رئيس قسم</span>}
          <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[9px] font-bold rounded-md border border-slate-200">{teacher.specialization || 'عام'}</span>
        </div>
      </td>
      <td className="whitespace-nowrap py-4 pl-8 pr-4 text-left">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onAssign(teacher)} className="p-2 text-slate-400 hover:text-emerald-600 bg-white hover:bg-emerald-50 rounded-lg shadow-sm border border-slate-200 transition-all" title="تعيين الفصول"><BookOpen className="w-4 h-4" /></button>
          <button onClick={() => onGrantBadge(teacher)} className="p-2 text-slate-400 hover:text-amber-600 bg-white hover:bg-amber-50 rounded-lg shadow-sm border border-slate-200 transition-all" title="منح وسام"><Award className="w-4 h-4" /></button>
          <button onClick={() => onResetPassword(teacher)} className="p-2 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 rounded-lg shadow-sm border border-slate-200 transition-all" title="كلمة المرور"><Key className="w-4 h-4" /></button>
          <button onClick={() => onEdit(teacher)} className="p-2 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 rounded-lg shadow-sm border border-slate-200 transition-all" title="تعديل"><Edit className="w-4 h-4" /></button>
          <button onClick={() => onDelete(teacher.id)} className="p-2 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 rounded-lg shadow-sm border border-slate-200 transition-all" title="حذف"><Trash2 className="w-4 h-4" /></button>
        </div>
      </td>
    </tr>
  );
};

// ============================================================================
// 🧩 المكون الرئيسي لصفحة إدارة المعلمين والأقسام
// ============================================================================
export default function TeachersPage() {
  const { user } = useAuth(); 
  const {
    departments, subjects, sections,
    fetchDepartments, fetchSections, fetchSubjects, fetchTeachersPaginated,
    addTeacher, updateTeacher, deleteUser, resetPassword
  } = useUsersSystem() as any;

  const { fetchTeacherAssignments, saveAssignments, deleteAssignment } = useTeacherAssignmentsSystem();

  // 🚀 حالات البيانات المحسنة
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [totalTeachers, setTotalTeachers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, hods: 0, unassigned: 0 });

  // حالات التحكم والعرض
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table'); // Table is default for quick access
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const totalPages = Math.ceil(totalTeachers / itemsPerPage) || 1;

  // الإشعارات
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // حالات النوافذ (Modals)
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);

  // بيانات النماذج
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<string | null>(null);
  const [teacherForBadge, setTeacherForBadge] = useState<any>(null);
  const [resetPasswordForm, setResetPasswordForm] = useState({ userId: '', newPassword: '' });
  
  const [addForm, setAddForm] = useState({ full_name: '', national_id: '', email: '', phone: '', specialization: '', zoom_link: '', department_id: '' });
  const [editForm, setEditForm] = useState<any>({ full_name: '', national_id: '', email: '', phone: '', specialization: '', zoom_link: '', department_id: '', custom_titles: '', isHOD: false, hod_subject_id: '', hod_stage: 'الكل' });

  // بيانات نظام التعيين السريع
  const [selectedTeacherForAssign, setSelectedTeacherForAssign] = useState<any>(null);
  const [teacherSections, setTeacherSections] = useState<any[]>([]);
  const [bulkAssignData, setBulkAssignData] = useState<{ section_ids: string[], subject_ids: string[] }>({ section_ids: [], subject_ids: [] });

  // 🚀 1. جلب الإعدادات والإحصائيات الأولية
  useEffect(() => {
    let mounted = true;
    const initPage = async () => {
      // @ts-ignore (بافتراض أنك ستضيف الدالة للـ Hook)
      if (fetchDepartments) await fetchDepartments();
      await fetchSections();
      await fetchSubjects();
      
      const { data: statsData } = await supabase.from('teachers').select('id, department_heads(id), teacher_sections(section_id)');
      if (mounted && statsData) {
        setStats({
          total: statsData.length,
          hods: statsData.filter((t: any) => t.department_heads?.length > 0).length,
          unassigned: statsData.filter((t: any) => !t.teacher_sections || t.teacher_sections.length === 0).length
        });
      }
    };
    initPage();
    return () => { mounted = false; };
  }, []);

  // 🚀 2. جلب المعلمين بنظام الصفحات
  const loadTeachers = useCallback(async () => {
    setIsLoading(true);
    // @ts-ignore
    const result = await fetchTeachersPaginated(currentPage, itemsPerPage, searchQuery, selectedDepartment);
    setTeachersList(result.data);
    setTotalTeachers(result.totalCount);
    setIsLoading(false);
  }, [currentPage, itemsPerPage, searchQuery, selectedDepartment]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => { loadTeachers(); }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [loadTeachers]);

  // ================= الدوال التنفيذية (Actions) =================
  const handleAddSubmit = async () => { 
    if (!addForm.full_name || !addForm.national_id || !addForm.department_id) { showNotification('error', 'يرجى تعبئة الاسم، الرقم المدني والقسم الأكاديمي'); return; } 
    try { 
      const result = await addTeacher(addForm); 
      // تحديث القسم بعد الإضافة (بما أن الـ API القديم قد لا يدعمه، نقوم بتحديثه فوراً)
      if (addForm.department_id) {
         const { data: latestUser } = await supabase.from('users').select('id').eq('national_id', addForm.national_id).single();
         if (latestUser) await supabase.from('teachers').update({ department_id: addForm.department_id }).eq('id', latestUser.id);
      }
      showNotification('success', `تم إضافة المعلم بنجاح`); 
      setShowAddModal(false); 
      setAddForm({ full_name: '', national_id: '', email: '', phone: '', specialization: '', zoom_link: '', department_id: '' }); 
      loadTeachers();
    } catch (e: any) { showNotification('error', e.message); } 
  };

  const handleOpenEditModal = (teacher: any) => {
    setEditingTeacher(teacher);
    const isHod = teacher.department_heads && teacher.department_heads.length > 0;
    const ud = Array.isArray(teacher.users) ? teacher.users[0] : teacher.users;
    setEditForm({ 
      full_name: ud?.full_name || '', national_id: teacher.national_id || '', email: ud?.email || '', phone: ud?.phone || '', 
      specialization: teacher.specialization || '', zoom_link: teacher.zoom_link || '', 
      department_id: teacher.department_id || '', custom_titles: (teacher.custom_titles || []).join('، '), 
      isHOD: isHod, hod_subject_id: isHod ? teacher.department_heads[0].subject_id : '', hod_stage: 'الكل' 
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    try {
      const payload = { 
        full_name: editForm.full_name, email: editForm.email, phone: editForm.phone, specialization: editForm.specialization, 
        zoom_link: editForm.zoom_link, national_id: editForm.national_id.trim(), department_id: editForm.department_id,
        custom_titles: editForm.custom_titles.split('،').map((s: string) => s.trim()).filter(Boolean)
      };
      const hodData = { isHead: editForm.isHOD, subject_id: editForm.hod_subject_id, stage_name: editForm.hod_stage };
      
      await updateTeacher(editingTeacher.id, editingTeacher.national_id, payload, hodData);
      
      // التحديث اليدوي للقسم إذا لم يكن مدعوماً في الدالة الأصلية
      if (editForm.department_id) {
         await supabase.from('teachers').update({ department_id: editForm.department_id }).eq('id', editingTeacher.id);
      }

      showNotification('success', 'تم الحفظ بنجاح');
      setShowEditModal(false);
      loadTeachers();
    } catch (e: any) { showNotification('error', e.message); }
  };

  const confirmDelete = async () => {
    try { await deleteUser(teacherToDelete!); showNotification('success', 'تم الحذف'); setShowDeleteModal(false); loadTeachers(); } 
    catch (e: any) { showNotification('error', e.message); }
  };

  const handleResetPasswordSubmit = async () => { 
    try { 
      const result = await resetPassword(resetPasswordForm.userId, resetPasswordForm.newPassword); 
      showNotification('success', `تم التغيير بنجاح، كلمة المرور الجديدة: ${result.newPassword}`); 
      setShowPasswordModal(false); 
    } catch (e: any) { showNotification('error', e.message); } 
  };

  // ================= دوال نظام التعيينات السريع =================
  const handleAssignmentClick = async (teacher: any) => {
    setSelectedTeacherForAssign(teacher);
    setBulkAssignData({ section_ids: [], subject_ids: [] });
    try {
      const assignments = await fetchTeacherAssignments(teacher.id);
      setTeacherSections(assignments);
      setShowAssignmentModal(true);
    } catch (e) { showNotification('error', 'خطأ في جلب الفصول'); }
  };

  const handleBulkAssign = async () => {
    if (bulkAssignData.section_ids.length === 0 || bulkAssignData.subject_ids.length === 0) return showNotification('error', 'يرجى اختيار فصل ومادة');
    const newAssignments: any[] = [];
    bulkAssignData.section_ids.forEach(sid => bulkAssignData.subject_ids.forEach(subid => newAssignments.push({ teacher_id: selectedTeacherForAssign.id, section_id: sid, subject_id: subid })));
    try {
      await saveAssignments(newAssignments);
      setTeacherSections(await fetchTeacherAssignments(selectedTeacherForAssign.id));
      setBulkAssignData({ section_ids: [], subject_ids: [] });
      showNotification('success', 'تم التعيين بنجاح');
    } catch (e) { showNotification('error', 'فشل التعيين'); }
  };

  const toggleAssignment = async (sectionId: string, subjectId: string) => {
    const existing = teacherSections.find(ts => ts.section_id === sectionId && ts.subject_id === subjectId);
    try {
      if (existing) {
        await deleteAssignment(selectedTeacherForAssign.id, sectionId, subjectId);
        setTeacherSections(teacherSections.filter(ts => !(ts.section_id === sectionId && ts.subject_id === subjectId)));
      } else {
        await saveAssignments([{ teacher_id: selectedTeacherForAssign.id, section_id: sectionId, subject_id: subjectId }]);
        setTeacherSections(await fetchTeacherAssignments(selectedTeacherForAssign.id));
      }
    } catch (e) { showNotification('error', 'حدث خطأ'); }
  };

  // ============================================================================
  // 🎨 واجهة المستخدم (Render)
  // ============================================================================
  return (
    <div className="relative min-h-screen bg-slate-50 font-cairo selection:bg-indigo-200 pb-20" dir="rtl">
      
      {/* التنبيهات المنسدلة */}
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }} className={`fixed top-8 left-1/2 z-50 px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 border backdrop-blur-xl ${notification.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : 'bg-red-500/90 border-red-400 text-white'}`}>
            <span className="font-bold text-sm tracking-wide">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100 transition-opacity"><X size={16}/></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* الهيدر */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">إدارة المعلمين والأقسام</h1>
            <p className="text-slate-500 mt-2 font-bold">تنظيم الهيكلية المدرسية، المناصب، وتوزيع الفصول.</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="px-8 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2 active:scale-95">
            <Plus size={20}/> إضافة معلم جديد
          </button>
        </div>

        {/* الإحصائيات */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600"><Users className="h-6 w-6"/></div>
            <div><p className="text-2xl font-black text-slate-900">{stats.total}</p><p className="text-[10px] font-bold text-slate-400 uppercase">إجمالي المعلمين</p></div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600"><Crown className="h-6 w-6"/></div>
            <div><p className="text-2xl font-black text-slate-900">{stats.hods}</p><p className="text-[10px] font-bold text-slate-400 uppercase">رؤساء أقسام</p></div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600"><Folder className="h-6 w-6"/></div>
            <div><p className="text-2xl font-black text-slate-900">{departments?.length || 0}</p><p className="text-[10px] font-bold text-slate-400 uppercase">قسم مسجل</p></div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-rose-50 shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600"><AlertCircle className="h-6 w-6"/></div>
            <div><p className="text-2xl font-black text-slate-900">{stats.unassigned}</p><p className="text-[10px] font-bold text-slate-400 uppercase">لم يعين بجدول</p></div>
          </div>
        </div>

        {/* شريط التحكم (Views & Filters) */}
        <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-100 w-full lg:w-auto">
            <button onClick={() => setViewMode('table')} className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-black transition-all ${viewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><List size={16}/> القائمة</button>
            <button onClick={() => setViewMode('grid')} className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-black transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid size={16}/> الأقسام</button>
          </div>
          
          <div className="flex w-full lg:w-auto gap-2 flex-1 max-w-2xl">
            <div className="relative flex-1 group">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input type="text" className="w-full rounded-xl border-0 py-3.5 pr-12 pl-5 text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold transition-all" placeholder="بحث باسم المعلم أو الرقم المدني..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
            </div>
            <select value={selectedDepartment} onChange={(e) => { setSelectedDepartment(e.target.value); setCurrentPage(1); }} className="w-48 bg-slate-50 border-0 rounded-xl py-3.5 px-4 font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="all">جميع الأقسام</option>
              {departments?.map((d:any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>

        {/* ============================================== */}
        {/* نظام العرض (جدول القائمة أو شبكة الأقسام) */}
        {/* ============================================== */}
        
        {viewMode === 'table' ? (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
            <div className="hidden lg:block overflow-x-auto min-h-[400px]">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="py-5 pr-8 pl-4 text-right text-[11px] font-black text-slate-500 uppercase tracking-widest">المعلم</th>
                    <th className="px-4 py-5 text-right text-[11px] font-black text-slate-500 uppercase tracking-widest">الرقم المدني</th>
                    <th className="px-4 py-5 text-right text-[11px] font-black text-slate-500 uppercase tracking-widest">القسم الأكاديمي</th>
                    <th className="px-4 py-5 text-right text-[11px] font-black text-slate-500 uppercase tracking-widest">التخصص / المنصب</th>
                    <th className="py-5 pl-8 pr-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {isLoading ? (
                    <tr><td colSpan={5} className="py-32 text-center"><Loader2 className="w-10 h-10 border-indigo-600 animate-spin mx-auto mb-4" /><p className="font-bold text-slate-400">جاري التحميل...</p></td></tr>
                  ) : teachersList.length === 0 ? (
                    <tr><td colSpan={5} className="py-32 text-center"><Search className="h-10 w-10 text-slate-300 mx-auto mb-4"/><p className="font-bold text-slate-500">لا يوجد معلمين مطابفين</p></td></tr>
                  ) : (
                    teachersList.map((t) => (
                      <TeacherTableRow 
                        key={t.id} teacher={t} 
                        onAssign={() => handleAssignmentClick(t)}
                        onGrantBadge={(st:any) => { setTeacherForBadge({ id: st.id, name: (Array.isArray(st.users)?st.users[0]:st.users)?.full_name }); setIsBadgeModalOpen(true); }}
                        onResetPassword={(st:any) => { setResetPasswordForm({ userId: st.id, newPassword: '' }); setShowPasswordModal(true); }}
                        onEdit={handleOpenEditModal}
                        onDelete={(id:string) => { setTeacherToDelete(id); setShowDeleteModal(true); }}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
                <p className="text-sm font-bold text-slate-500">إظهار <span className="font-black text-slate-900">{((currentPage - 1) * itemsPerPage) + 1}</span> إلى <span className="font-black text-slate-900">{Math.min(currentPage * itemsPerPage, totalTeachers)}</span> من <span className="font-black text-slate-900">{totalTeachers}</span></p>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isLoading} className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 disabled:opacity-50"><ChevronRight className="w-5 h-5"/></button>
                  <div className="flex items-center gap-1 px-3 font-black text-sm text-indigo-600 bg-indigo-50 rounded-xl">{currentPage} / {totalPages}</div>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || isLoading} className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 disabled:opacity-50"><ChevronLeft className="w-5 h-5"/></button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* شبكة الأقسام السريعة */}
            {departments?.map((dept: any) => (
               <motion.div key={dept.id} whileHover={{ y: -5 }} onClick={() => { setViewMode('table'); setSelectedDepartment(dept.id); }} className="bg-white p-8 rounded-[2.5rem] cursor-pointer border-2 border-slate-50 hover:border-indigo-100 hover:shadow-xl transition-all text-center group shadow-sm">
                 <div className="h-20 w-20 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600 mx-auto mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-all"><Folder size={32}/></div>
                 <h3 className="text-xl font-black text-slate-800">{dept.name}</h3>
                 <p className="text-xs font-bold text-slate-400 mt-2 bg-slate-50 inline-block px-3 py-1 rounded-lg">اضغط لاستعراض المعلمين</p>
               </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================================ */}
      {/* 🚀 النوافذ المنبثقة (Modals) */}
      {/* ============================================================================ */}

      {/* 1. نافذة إضافة معلم */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
             <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
             <div className="relative transform overflow-hidden rounded-[2.5rem] bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-slate-100">
                <div className="bg-white px-6 sm:px-10 pb-8 pt-8 sm:pt-10">
                   <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                      <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3"><UserPlus className="text-indigo-600"/> إضافة معلم جديد</h3>
                      <button onClick={() => setShowAddModal(false)}><X className="h-6 w-6 text-slate-400 hover:text-rose-500 transition-colors" /></button>
                   </div>
                   <form className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                     <div><label className="text-xs font-black text-slate-500 mb-1 block">الاسم الرباعي <span className="text-rose-500">*</span></label><input type="text" value={addForm.full_name} onChange={e => setAddForm({...addForm, full_name: e.target.value})} className="w-full rounded-2xl border-0 py-3.5 px-4 bg-slate-50 focus:bg-indigo-50/50 focus:ring-2 focus:ring-indigo-500 font-bold outline-none" /></div>
                     <div><label className="text-xs font-black text-slate-500 mb-1 block">الرقم المدني <span className="text-rose-500">*</span></label><input type="text" value={addForm.national_id} onChange={e => setAddForm({...addForm, national_id: e.target.value})} className="w-full rounded-2xl border-0 py-3.5 px-4 bg-slate-50 focus:bg-indigo-50/50 focus:ring-2 focus:ring-indigo-500 font-bold outline-none" /></div>
                     <div><label className="text-xs font-black text-slate-500 mb-1 block">رقم الهاتف</label><input type="text" value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} className="w-full rounded-2xl border-0 py-3.5 px-4 bg-slate-50 focus:bg-indigo-50/50 focus:ring-2 focus:ring-indigo-500 font-bold outline-none text-left" dir="ltr" /></div>
                     <div><label className="text-xs font-black text-slate-500 mb-1 block">البريد الإلكتروني</label><input type="email" value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} className="w-full rounded-2xl border-0 py-3.5 px-4 bg-slate-50 focus:bg-indigo-50/50 focus:ring-2 focus:ring-indigo-500 font-bold outline-none text-left" dir="ltr" /></div>
                     
                     <div className="sm:col-span-2"><label className="text-xs font-black text-slate-500 mb-1 block">القسم الأكاديمي المعتمد <span className="text-rose-500">*</span></label>
                       <select value={addForm.department_id} onChange={e => setAddForm({...addForm, department_id: e.target.value})} className="w-full rounded-2xl border-0 py-3.5 px-4 bg-slate-50 focus:bg-indigo-50/50 focus:ring-2 focus:ring-indigo-500 font-bold outline-none cursor-pointer">
                          <option value="">-- يرجى اختيار القسم --</option>
                          {departments?.map((d:any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                       </select>
                     </div>
                     <div className="sm:col-span-2"><label className="text-xs font-black text-slate-500 mb-1 block">التخصص الدقيق</label><input type="text" placeholder="مثال: فيزياء كمية، نحو، الخ..." value={addForm.specialization} onChange={e => setAddForm({...addForm, specialization: e.target.value})} className="w-full rounded-2xl border-0 py-3.5 px-4 bg-slate-50 focus:bg-indigo-50/50 focus:ring-2 focus:ring-indigo-500 font-bold outline-none" /></div>
                     <div className="sm:col-span-2"><label className="text-xs font-black text-indigo-500 mb-1 block">رابط غرفة زووم (Zoom Link)</label><input type="url" value={addForm.zoom_link} onChange={e => setAddForm({...addForm, zoom_link: e.target.value})} className="w-full rounded-2xl border-0 py-3.5 px-4 bg-indigo-50/50 focus:ring-2 focus:ring-indigo-500 font-bold outline-none text-left" dir="ltr" placeholder="https://zoom.us/j/..." /></div>
                   </form>
                </div>
                <div className="bg-slate-50 px-6 py-6 flex flex-row-reverse gap-3 border-t border-slate-100">
                   <button disabled={submitting} onClick={handleAddSubmit} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50">إضافة واعتماد المعلم</button>
                   <button onClick={() => setShowAddModal(false)} className="flex-1 bg-white border border-slate-200 text-slate-600 py-4 rounded-2xl font-black hover:bg-slate-100 transition-colors">إلغاء</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* 2. نافذة التعديل */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
             <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
             <div className="relative transform overflow-hidden rounded-[2.5rem] bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-slate-100">
                <div className="bg-white px-6 sm:px-10 pb-8 pt-8 sm:pt-10 max-h-[75vh] overflow-y-auto custom-scrollbar">
                   <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                      <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3"><Edit className="text-indigo-600"/> تعديل بيانات ومناصب المعلم</h3>
                      <button onClick={() => setShowEditModal(false)}><X className="h-6 w-6 text-slate-400 hover:text-rose-500 transition-colors" /></button>
                   </div>
                   <form className="space-y-8">
                     <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                       <div><label className="text-xs font-black text-slate-500 mb-1 block">الاسم</label><input type="text" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="w-full rounded-2xl border-0 py-3 px-4 bg-slate-50 focus:bg-indigo-50 focus:ring-2 focus:ring-indigo-500 font-bold outline-none" /></div>
                       <div><label className="text-xs font-black text-slate-500 mb-1 block">الرقم المدني</label><input type="text" value={editForm.national_id} onChange={e => setEditForm({...editForm, national_id: e.target.value})} className="w-full rounded-2xl border-0 py-3 px-4 bg-slate-50 focus:bg-indigo-50 focus:ring-2 focus:ring-indigo-500 font-bold outline-none" /></div>
                       <div><label className="text-xs font-black text-slate-500 mb-1 block">رقم الهاتف</label><input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full rounded-2xl border-0 py-3 px-4 bg-slate-50 focus:bg-indigo-50 focus:ring-2 focus:ring-indigo-500 font-bold outline-none text-left" dir="ltr" /></div>
                       <div><label className="text-xs font-black text-slate-500 mb-1 block">البريد الإلكتروني</label><input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full rounded-2xl border-0 py-3 px-4 bg-slate-50 focus:bg-indigo-50 focus:ring-2 focus:ring-indigo-500 font-bold outline-none text-left" dir="ltr" /></div>
                       
                       <div className="sm:col-span-2"><label className="text-xs font-black text-slate-500 mb-1 block">القسم الأكاديمي</label>
                         <select value={editForm.department_id || ''} onChange={e => setEditForm({...editForm, department_id: e.target.value})} className="w-full rounded-2xl border-0 py-3.5 px-4 bg-slate-50 focus:ring-2 focus:ring-indigo-500 font-bold outline-none cursor-pointer">
                            <option value="">-- يرجى اختيار القسم --</option>
                            {departments?.map((d:any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                         </select>
                       </div>
                       <div className="sm:col-span-2"><label className="text-xs font-black text-slate-500 mb-1 block">التخصص</label><input type="text" value={editForm.specialization} onChange={e => setEditForm({...editForm, specialization: e.target.value})} className="w-full rounded-2xl border-0 py-3 px-4 bg-slate-50 focus:bg-indigo-50 focus:ring-2 focus:ring-indigo-500 font-bold outline-none" /></div>
                       <div className="sm:col-span-2"><label className="text-xs font-black text-indigo-500 mb-1 block">رابط زووم (Zoom Link)</label><input type="url" value={editForm.zoom_link} onChange={e => setEditForm({...editForm, zoom_link: e.target.value})} className="w-full rounded-2xl border-0 py-3 px-4 bg-indigo-50/50 focus:ring-2 focus:ring-indigo-500 font-bold outline-none text-left" dir="ltr" /></div>
                     </div>

                     {/* قسم المناصب والإدارة */}
                     <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100 space-y-5">
                        <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-amber-100 shadow-sm">
                           <input type="checkbox" id="isHOD" checked={editForm.isHOD} onChange={e => setEditForm({...editForm, isHOD: e.target.checked})} className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"/>
                           <label htmlFor="isHOD" className="text-sm font-black text-slate-800 cursor-pointer select-none">تعيين المعلم كرئيس قسم أوب إشراف</label>
                        </div>
                        {editForm.isHOD && (
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                             <div><label className="text-xs font-black text-amber-700 mb-1 block">مادة الإشراف</label><select value={editForm.hod_subject_id} onChange={e => setEditForm({...editForm, hod_subject_id: e.target.value})} className="w-full px-4 py-3 bg-white rounded-xl font-bold outline-none border border-amber-100"><option value="">-- المادة --</option>{subjects?.map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                             <div><label className="text-xs font-black text-amber-700 mb-1 block">المرحلة</label><select value={editForm.hod_stage} onChange={e => setEditForm({...editForm, hod_stage: e.target.value})} className="w-full px-4 py-3 bg-white rounded-xl font-bold outline-none border border-amber-100"><option value="الكل">الكل</option><option value="متوسط">متوسط</option><option value="ثانوي">ثانوي</option></select></div>
                           </div>
                        )}
                        <div><label className="text-xs font-black text-amber-700 mb-1 block">مسميات إضافية (أمين سر، منسق...)</label><input type="text" placeholder="افصل بينها بفاصلة" value={editForm.custom_titles} onChange={e => setEditForm({...editForm, custom_titles: e.target.value})} className="w-full px-4 py-3 bg-white rounded-xl font-bold outline-none border border-amber-100 focus:ring-2 focus:ring-amber-500"/></div>
                     </div>
                   </form>
                </div>
                <div className="bg-slate-50 px-6 py-6 flex flex-row-reverse gap-3 border-t border-slate-100">
                   <button disabled={submittingEdit} onClick={handleEditSubmit} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50">{submittingEdit ? 'جاري الحفظ...' : 'حفظ التعديلات'}</button>
                   <button onClick={() => setShowEditModal(false)} className="flex-1 bg-white border border-slate-200 text-slate-600 py-4 rounded-2xl font-black hover:bg-slate-100 transition-colors">إلغاء</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* 3. نافذة التعيين الذكي للفصول */}
      {showAssignmentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAssignmentModal(false)}></div>
            <div className="relative transform overflow-hidden rounded-[2.5rem] bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-4xl border border-slate-100">
              <div className="bg-white px-6 sm:px-10 pb-8 pt-8 sm:pt-10">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2"><BookOpen className="text-emerald-500"/> جدول الحصص: {selectedTeacherForAssign?.users?.full_name}</h3>
                  <button onClick={() => setShowAssignmentModal(false)}><X className="h-6 w-6 text-slate-400 hover:text-rose-500" /></button>
                </div>
                
                <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  {/* أداة التعيين المتعدد السريع */}
                  <div className="bg-amber-50 rounded-[2rem] p-6 border border-amber-100 shadow-sm">
                    <h4 className="text-sm font-black text-amber-900 mb-4 flex items-center gap-2"><Layers className="w-4 h-4"/> التعيين المتعدد السريع</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="text-xs font-black text-amber-800 mb-2 block">1. حدد المواد التي يدرسها</label>
                        <div className="flex flex-wrap gap-2">
                          {subjects?.map((s:any) => <button key={s.id} onClick={() => {
                            setBulkAssignData(prev => ({ ...prev, subject_ids: prev.subject_ids.includes(s.id) ? prev.subject_ids.filter(sid => sid !== s.id) : [...prev.subject_ids, s.id] }))
                          }} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${bulkAssignData.subject_ids.includes(s.id) ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-white text-amber-700 border-amber-200 hover:border-amber-400'}`}>{s.name}</button>)}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-black text-amber-800 mb-2 block">2. حدد الفصول المستهدفة</label>
                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                          {sections?.map((s:any) => <button key={s.id} onClick={() => {
                            setBulkAssignData(prev => ({ ...prev, section_ids: prev.section_ids.includes(s.id) ? prev.section_ids.filter(sid => sid !== s.id) : [...prev.section_ids, s.id] }))
                          }} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${bulkAssignData.section_ids.includes(s.id) ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-white text-amber-700 border-amber-200 hover:border-amber-400'}`}>{s.classes?.name} - {s.name}</button>)}
                        </div>
                      </div>
                    </div>
                    <button onClick={handleBulkAssign} className="w-full py-3.5 bg-amber-500 text-white rounded-xl font-black shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all active:scale-95">حفظ وتطبيق التعيين</button>
                  </div>

                  {/* التعيين الفردي المفصل */}
                  <div>
                     <h4 className="text-sm font-black text-slate-800 mb-4 block border-b border-slate-100 pb-2">أو التعديل اليدوي الدقيق للفصول</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {sections?.map((sec:any) => (
                         <div key={sec.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                           <h4 className="font-black text-slate-800 text-sm mb-3">{sec.classes?.name} - {sec.name}</h4>
                           <div className="flex flex-wrap gap-2">
                             {subjects?.map((sub:any) => {
                               const isAssigned = teacherSections.some(ts => ts.section_id === sec.id && ts.subject_id === sub.id);
                               return <button key={sub.id} onClick={() => toggleAssignment(sec.id, sub.id)} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${isAssigned ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-300 hover:text-emerald-600'}`}>{sub.name}</button>
                             })}
                           </div>
                         </div>
                       ))}
                     </div>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 px-6 py-6 border-t border-slate-100 flex justify-end">
                <button onClick={() => setShowAssignmentModal(false)} className="px-10 py-3.5 bg-slate-900 text-white rounded-xl font-black shadow-lg hover:bg-slate-800 transition-all">تم، إغلاق النافذة</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نوافذ أخرى (تغيير كلمة المرور، الحذف، الأوسمة) */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-md rounded-[2rem] p-8 text-center shadow-2xl">
            <div className="mx-auto w-16 h-16 bg-sky-50 text-sky-600 flex items-center justify-center rounded-2xl mb-4"><Key size={32} /></div>
            <h3 className="text-xl font-black mb-2 text-slate-900">تغيير كلمة المرور</h3>
            <input type="text" placeholder="اكتب كلمة المرور الجديدة..." value={resetPasswordForm.newPassword} onChange={e => setResetPasswordForm({...resetPasswordForm, newPassword: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 font-bold focus:ring-2 focus:ring-sky-500 outline-none mb-6 text-center text-lg" dir="ltr"/>
            <div className="flex gap-3">
              <button onClick={handleResetPasswordSubmit} className="flex-1 bg-sky-600 text-white font-black py-3.5 rounded-xl hover:bg-sky-700 transition-all">حفظ التغيير</button>
              <button onClick={() => setShowPasswordModal(false)} className="flex-1 bg-slate-100 text-slate-600 font-black py-3.5 rounded-xl hover:bg-slate-200 transition-all">إلغاء</button>
            </div>
          </motion.div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-[2rem] text-center max-w-sm w-full shadow-2xl border border-slate-100">
             <div className="mx-auto w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4"><Trash2 className="w-8 h-8"/></div>
             <h3 className="text-xl font-black mb-2 text-slate-900">تحذير الحذف</h3>
             <p className="text-sm font-bold text-slate-500 mb-6">سيتم حذف المعلم نهائياً ولن يتمكن من الدخول للمنصة مجدداً.</p>
             <div className="flex gap-3">
                <button onClick={confirmDelete} className="bg-rose-600 text-white py-3.5 rounded-xl font-black flex-1 hover:bg-rose-700 shadow-lg shadow-rose-200">حذف نهائي</button>
                <button onClick={() => setShowDeleteModal(false)} className="bg-slate-100 text-slate-600 py-3.5 rounded-xl font-black flex-1 border border-slate-200 hover:bg-slate-200">تراجع</button>
             </div>
          </div>
        </div>
      )}
      
      {teacherForBadge && <GrantBadgeModal isOpen={isBadgeModalOpen} onClose={() => { setIsBadgeModalOpen(false); setTeacherForBadge(null); }} recipientId={teacherForBadge.id} recipientName={teacherForBadge.name} granterId={user?.id || 'admin'} />}
    </div>
  );
}
