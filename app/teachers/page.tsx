/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Plus, Search, Edit, Trash2, X, Key, BookOpen, AlertCircle, 
  Users, GraduationCap, Folder, ChevronLeft, ChevronRight, School, Layers,
  Award, Crown, CheckCircle2, LayoutGrid, List, Loader2, UserMinus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUsersSystem } from '@/hooks/useUsersSystem';
import { useTeacherAssignmentsSystem } from '@/hooks/useTeacherAssignmentsSystem';
import { useAuth } from '@/context/auth-context';
import GrantBadgeModal from '@/components/GrantBadgeModal';
import { supabase } from '@/lib/supabase';

const getTeacherStageInfo = (teacher: any) => {
  if (!teacher.teacher_sections || teacher.teacher_sections.length === 0) {
    return { type: 'unassigned', label: 'غير معين', color: 'slate', icon: AlertCircle };
  }
  let hasMiddle = false;
  let hasHigh = false;
  teacher.teacher_sections.forEach((ts: any) => {
    const className = ts.sections?.classes?.name || '';
    if (className.includes('سادس') || className.includes('سابع') || className.includes('ثامن') || className.includes('تاسع')) hasMiddle = true;
    if (className.includes('عاشر') || className.includes('حادي') || className.includes('ثاني')) hasHigh = true;
  });
  if (hasMiddle && hasHigh) return { type: 'both', label: 'مشترك', color: 'amber', icon: Layers };
  if (hasMiddle) return { type: 'middle', label: 'متوسطي', color: 'blue', icon: School };
  if (hasHigh) return { type: 'high', label: 'ثانوي', color: 'emerald', icon: GraduationCap };
  return { type: 'unknown', label: 'غير محدد', color: 'slate', icon: Users };
};

const TeacherTableRow = ({ teacher, onGrantBadge, onResetPassword, onEdit, onDelete, onAssign, departments }: any) => {
  const userData = Array.isArray(teacher.users) ? teacher.users[0] : teacher.users;
  const isHOD = teacher.academic_departments?.head_id === teacher.id || (teacher.department_heads && teacher.department_heads.length > 0);
  const deptObj = departments?.find((d:any) => d.id === teacher.department_id);
  const departmentName = deptObj ? deptObj.name : 'بلا قسم (يتطلب تعيين)';

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
        <span className={`text-sm font-black px-3 py-1.5 rounded-lg border shadow-inner ${!deptObj ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse' : 'bg-slate-50 text-slate-700 border-slate-100'}`}>
          {departmentName}
        </span>
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
    teachers, departments, subjects, sections, loading: usersLoading,
    fetchDepartments, fetchSections, fetchSubjects, fetchTeachers,
    addTeacher, updateTeacher, deleteUser, resetPassword
  } = useUsersSystem() as any;

  const { fetchTeacherAssignments, saveAssignments, deleteAssignment, loading: assignmentsLoading } = useTeacherAssignmentsSystem();
  
  const isLoading = usersLoading || assignmentsLoading;

  const [submitting, setSubmitting] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<'all' | 'middle' | 'high' | 'both' | 'unassigned'>('all');

  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);

  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<string | null>(null);
  const [teacherForBadge, setTeacherForBadge] = useState<any>(null);
  const [resetPasswordForm, setResetPasswordForm] = useState({ userId: '', newPassword: '' });
  const [addForm, setAddForm] = useState({ full_name: '', national_id: '', email: '', phone: '', specialization: '', zoom_link: '', department_id: '' });
  const [editForm, setEditForm] = useState<any>({ full_name: '', national_id: '', email: '', phone: '', specialization: '', zoom_link: '', department_id: '', custom_titles: '', isHOD: false, hod_subject_id: '', hod_stage: 'الكل' });
  
  const [selectedTeacherForAssign, setSelectedTeacherForAssign] = useState<any>(null);
  const [teacherSections, setTeacherSections] = useState<any[]>([]);
  const [bulkAssignData, setBulkAssignData] = useState<{ section_ids: string[], subject_ids: string[] }>({ section_ids: [], subject_ids: [] });

  useEffect(() => {
    if (fetchDepartments) fetchDepartments();
    fetchTeachers();
    fetchSections();
    fetchSubjects();
  }, [fetchDepartments, fetchTeachers, fetchSections, fetchSubjects]);

  const filteredTeachers = useMemo(() => {
    return (teachers || []).filter((teacher: any) => {
      const stageInfo = getTeacherStageInfo(teacher);
      const parentDept = teacher.department_id;
      const matchStage = stageFilter === 'all' || stageInfo.type === stageFilter;
      const matchDept = selectedDepartment === 'unassigned' ? !parentDept : selectedDepartment ? parentDept === selectedDepartment : true;
      const matchSearch = teacher.users?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || teacher.national_id?.includes(searchQuery);
      return matchStage && matchDept && matchSearch;
    });
  }, [teachers, stageFilter, selectedDepartment, searchQuery]);

  const departmentHeads = filteredTeachers.filter((t: any) => t.academic_departments?.head_id === t.id || (t.department_heads && t.department_heads.length > 0));
  const departmentMembers = filteredTeachers.filter((t: any) => !(t.academic_departments?.head_id === t.id || (t.department_heads && t.department_heads.length > 0)));
  const unassignedTeachersCount = (teachers || []).filter((t: any) => !t.department_id).length;

  const groupedMembers = departmentMembers.reduce((acc, teacher: any) => {
    const spec = teacher.specialization || 'عام';
    if (!acc[spec]) acc[spec] = [];
    acc[spec].push(teacher);
    return acc;
  }, {} as Record<string, any[]>);

  const handleAddSubmit = async () => { 
    if (!addForm.full_name || !addForm.national_id || !addForm.department_id) return showNotification('error', 'يرجى تعبئة الحقول الإلزامية واختيار القسم'); 
    setSubmitting(true);
    try { 
      await addTeacher(addForm); 
      showNotification('success', 'تم الإضافة بنجاح'); 
      setShowAddModal(false); 
      setAddForm({ full_name: '', national_id: '', email: '', phone: '', specialization: '', zoom_link: '', department_id: '' }); 
      fetchTeachers();
    } catch (e: any) { showNotification('error', e.message); } 
    finally { setSubmitting(false); }
  };

  const handleOpenEditModal = (teacher: any) => {
    setEditingTeacher(teacher);
    const isHod = teacher.academic_departments?.head_id === teacher.id || (teacher.department_heads && teacher.department_heads.length > 0);
    const ud = Array.isArray(teacher.users) ? teacher.users[0] : teacher.users;
    setEditForm({ 
      full_name: ud?.full_name || '', national_id: teacher.national_id || '', email: ud?.email || '', phone: ud?.phone || '', 
      specialization: teacher.specialization || '', zoom_link: teacher.zoom_link || '', 
      department_id: teacher.department_id || '', custom_titles: (teacher.custom_titles || []).join('، '), 
      isHOD: isHod, hod_subject_id: isHod ? teacher.department_heads?.[0]?.subject_id : '', hod_stage: 'الكل' 
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    setSubmittingEdit(true);
    try {
      const payload = { full_name: editForm.full_name, email: editForm.email, phone: editForm.phone, specialization: editForm.specialization, zoom_link: editForm.zoom_link, national_id: editForm.national_id.trim(), department_id: editForm.department_id, custom_titles: editForm.custom_titles.split('،').map((s: string) => s.trim()).filter(Boolean) };
      const hodData = { isHead: editForm.isHOD, subject_id: editForm.hod_subject_id, stage_name: editForm.hod_stage };
      await updateTeacher(editingTeacher.id, editingTeacher.national_id, payload, hodData);
      showNotification('success', 'تم التحديث وتعيين القسم بنجاح');
      setShowEditModal(false);
      fetchTeachers();
    } catch (e: any) { showNotification('error', e.message); }
    finally { setSubmittingEdit(false); }
  };

  const confirmDelete = async () => {
    try { 
      await deleteUser(teacherToDelete!); 
      showNotification('success', 'تم الحذف'); 
      setShowDeleteModal(false); 
      fetchTeachers(); 
    } catch (e: any) { showNotification('error', e.message); }
  };

  const handleResetPasswordSubmit = async () => { 
    if (!resetPasswordForm.newPassword || resetPasswordForm.newPassword.length < 6) return showNotification('error', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    try { 
      const result = await resetPassword(resetPasswordForm.userId, resetPasswordForm.newPassword); 
      showNotification('success', `تم التغيير بنجاح، كلمة المرور الجديدة: ${result.newPassword || resetPasswordForm.newPassword}`); 
      setShowPasswordModal(false); 
      setResetPasswordForm({ userId: '', newPassword: '' });
    } catch (e: any) { showNotification('error', e.message); } 
  };

  const handleAssignmentClick = async (teacher: any) => {
    setSelectedTeacherForAssign(teacher);
    setBulkAssignData({ section_ids: [], subject_ids: [] });
    try {
      const assignments = await fetchTeacherAssignments(teacher.id);
      setTeacherSections(assignments);
      setShowAssignmentModal(true);
    } catch (e) { showNotification('error', 'خطأ في جلب الفصول'); }
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

  const toggleBulkSection = (id: string) => { setBulkAssignData(prev => ({ ...prev, section_ids: prev.section_ids.includes(id) ? prev.section_ids.filter(sid => sid !== id) : [...prev.section_ids, id] })); };
  const toggleBulkSubject = (id: string) => { setBulkAssignData(prev => ({ ...prev, subject_ids: prev.subject_ids.includes(id) ? prev.subject_ids.filter(sid => sid !== id) : [...prev.subject_ids, id] })); };

  const TeacherCard = ({ teacher, isHOD = false }: any) => {
    const stageInfo = getTeacherStageInfo(teacher);
    const userData = Array.isArray(teacher.users) ? teacher.users[0] : teacher.users;
    
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-6 rounded-[2rem] bg-white border ${isHOD ? 'border-amber-200 shadow-lg shadow-amber-50' : 'border-slate-100 shadow-sm'} relative overflow-hidden group hover:-translate-y-1 transition-all`}>
        <div className="flex justify-between items-start relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center font-black text-xl ${isHOD ? 'bg-amber-100 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
                {userData?.avatar_url ? <img src={userData.avatar_url} className="w-full h-full rounded-2xl object-cover" alt="T"/> : userData?.full_name?.charAt(0)}
              </div>
              {isHOD && <Crown className="absolute -top-2 -right-2 h-6 w-6 text-yellow-500" />}
            </div>
            <div>
              <h3 className={`font-black leading-tight ${isHOD ? 'text-amber-900' : 'text-slate-900'}`}>{userData?.full_name}</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-1">{teacher.national_id}</p>
            </div>
          </div>
          <div className={`px-2 py-1 rounded-lg bg-${stageInfo.color}-50 text-${stageInfo.color}-600 text-[10px] font-black border border-${stageInfo.color}-100`}>{stageInfo.label}</div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
           {isHOD && <span className="px-2 py-1 bg-amber-500 text-white text-[9px] font-black rounded-md">رئيس قسم</span>}
           {(teacher.custom_titles || []).map((t: string, i: number) => <span key={i} className="px-2 py-1 bg-slate-100 text-slate-500 text-[9px] font-bold rounded-md">{t}</span>)}
        </div>
        <div className="flex gap-2 mt-5 pt-4 border-t border-slate-50 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
           <button type="button" onClick={() => handleOpenEditModal(teacher)} className="flex-1 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black hover:bg-indigo-600 hover:text-white transition-all">تعديل ونقل</button>
           <button type="button" onClick={() => { setResetPasswordForm({ userId: teacher.id, newPassword: '' }); setShowPasswordModal(true); }} className="p-2 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-600 hover:text-white transition-all"><Key size={14}/></button>
           <button type="button" onClick={() => handleAssignmentClick(teacher)} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"><BookOpen size={14}/></button>
           <button type="button" onClick={() => { setTeacherForBadge({ id: teacher.id, name: userData?.full_name || 'معلم غير معروف' }); setIsBadgeModalOpen(true); }} className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-500 hover:text-white transition-all"><Award size={14}/></button>
           <button type="button" onClick={() => { setTeacherToDelete(teacher.id); setShowDeleteModal(true); }} className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={14}/></button>
        </div>
      </motion.div>
    );
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
            <h1 className="text-4xl font-black text-slate-900 tracking-tight text-right">
              {selectedDepartment === 'unassigned' ? 'معلمون بلا قسم (يتطلب تعيين)' : selectedDepartment ? `قسم ${departments?.find((d:any) => d.id === selectedDepartment)?.name}` : 'إدارة المعلمين والأقسام'}
            </h1>
            <p className="text-slate-500 mt-2 font-bold text-right">تنظيم الهيكلية المدرسية، توزيع الأقسام، والمناصب.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { fetchTeachers(); if(fetchDepartments) fetchDepartments(); }} className="px-5 py-4 bg-white text-indigo-600 rounded-[1.5rem] font-black shadow-sm border border-indigo-100 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
               <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''}/> تحديث
            </button>
            <button onClick={() => setShowAddModal(true)} className="px-8 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
              <Plus size={20}/> إضافة معلم
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 text-right">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600"><Users size={24}/></div>
            <div><p className="text-2xl font-black text-slate-900">{teachers?.length || 0}</p><p className="text-[10px] font-bold text-slate-400 uppercase">إجمالي المعلمين</p></div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 text-right">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600"><Folder size={24}/></div>
            <div><p className="text-2xl font-black text-slate-900">{departments?.length || 0}</p><p className="text-[10px] font-bold text-slate-400 uppercase">أقسام معتمدة</p></div>
          </div>
          <div onClick={() => { setViewMode('table'); setSelectedDepartment('unassigned'); }} className="bg-rose-50 p-6 rounded-[2rem] border border-rose-200 shadow-sm flex items-center gap-4 text-right cursor-pointer hover:bg-rose-100 transition-all group">
            <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-rose-600 shadow-sm group-hover:scale-110 transition-transform"><UserMinus size={24}/></div>
            <div><p className="text-2xl font-black text-rose-700">{unassignedTeachersCount}</p><p className="text-[10px] font-bold text-rose-500 uppercase">بلا قسم (اضغط)</p></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-100 w-full lg:w-auto">
            <button onClick={() => setViewMode('table')} className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-black transition-all ${viewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><List size={16}/> القائمة</button>
            <button onClick={() => setViewMode('grid')} className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-black transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid size={16}/> الأقسام</button>
          </div>
          <div className="flex w-full lg:w-auto gap-2 flex-1 max-w-2xl">
            <div className="relative flex-1 group">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input type="text" className="w-full rounded-xl border-0 py-3.5 pr-12 text-right bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold transition-all" placeholder="بحث بالاسم أو الرقم المدني..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <select value={selectedDepartment || 'all'} onChange={(e) => setSelectedDepartment(e.target.value === 'all' ? null : e.target.value)} className="w-48 bg-slate-50 border-0 rounded-xl py-3.5 px-4 font-bold text-slate-700 outline-none cursor-pointer">
              <option value="all">جميع الأقسام</option>
              <option value="unassigned" className="text-rose-600 font-black">معلمون بلا قسم ⚠️</option>
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
                    <th className="px-4 py-5 text-center">القسم الأكاديمي</th>
                    <th className="px-4 py-5 text-center">التخصص</th>
                    <th className="py-5 pl-8 pr-4 text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {isLoading ? (
                    <tr><td colSpan={5} className="py-32 text-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto" /></td></tr>
                  ) : filteredTeachers.length === 0 ? (
                    <tr><td colSpan={5} className="py-32 text-center text-slate-500 font-bold">لا يوجد نتائج مطابقة</td></tr>
                  ) : (
                    filteredTeachers.map((t: any) => (
                      <TeacherTableRow 
                        key={t.id} 
                        teacher={t} 
                        departments={departments}
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
          ) : (
            <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {unassignedTeachersCount > 0 && !selectedDepartment && (
                 <motion.div whileHover={{ y: -5 }} onClick={() => { setViewMode('table'); setSelectedDepartment('unassigned'); }} className="bg-rose-50 p-8 rounded-[2.5rem] cursor-pointer border-2 border-rose-200 hover:border-rose-400 hover:shadow-md text-center group transition-all">
                    <div className="h-16 w-16 rounded-2xl bg-white flex items-center justify-center text-rose-600 mx-auto mb-4 shadow-sm group-hover:bg-rose-600 group-hover:text-white transition-colors animate-pulse"><UserMinus size={28}/></div>
                    <h3 className="text-lg font-black text-rose-800">معلمون بلا قسم</h3>
                    <p className="text-xs font-bold text-rose-500 mt-2">يتطلب توزيعهم ({unassignedTeachersCount})</p>
                 </motion.div>
              )}
              {!selectedDepartment ? (
                departments?.map((dept: any) => (
                  <motion.div key={dept.id} whileHover={{ y: -5 }} onClick={() => setSelectedDepartment(dept.id)} className="bg-slate-50 p-8 rounded-[2.5rem] cursor-pointer border-2 border-slate-50 hover:border-indigo-100 hover:shadow-md text-center group transition-all">
                    <div className="h-16 w-16 rounded-2xl bg-white flex items-center justify-center text-indigo-600 mx-auto mb-4 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Folder size={28}/></div>
                    <h3 className="text-lg font-black text-slate-800">{dept.name}</h3>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full space-y-12">
                  <button onClick={() => setSelectedDepartment(null)} className="flex items-center gap-2 text-indigo-600 font-black text-sm hover:underline"><ChevronLeft size={18}/> العودة لجميع الأقسام</button>
                  {departmentHeads.length > 0 && (
                    <div className="space-y-6"><h2 className="text-xl font-black text-amber-700 flex items-center gap-2 px-4"><Crown/> رئاسة القسم</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-6">{departmentHeads.map((hod: any) => <TeacherCard key={hod.id} teacher={hod} isHOD={true}/>)}</div></div>
                  )}
                  {departmentMembers.length > 0 ? (
                    <div className="space-y-6">
                      <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 px-4"><Users/> أعضاء القسم</h2>
                      {Object.entries(groupedMembers).map(([spec, specTeachers]: [string, any]) => (
                        <div key={spec} className="bg-slate-50/50 p-6 rounded-[2.5rem] border border-slate-200 space-y-6">
                          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100"><div className="w-2 h-2 rounded-full bg-indigo-500"></div><h3 className="font-black text-slate-800 text-sm">تخصص: {spec}</h3></div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{(specTeachers as any[]).map((t: any) => <TeacherCard key={t.id} teacher={t}/>)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-20 text-center text-slate-500 font-bold">لا يوجد أعضاء في هذا القسم حالياً.</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* نافذة التعديل */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto" dir="rtl">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden my-8">
            <div className="p-8 sm:p-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-6"><h3 className="text-2xl font-black text-slate-900">تعديل الملف ونقل المعلم</h3><button onClick={() => setShowEditModal(false)}><X size={24} className="text-slate-300 hover:text-rose-500"/></button></div>
              <form className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5"><label className="text-xs font-black text-slate-400 mr-2">الاسم</label><input type="text" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none"/></div>
                  <div className="space-y-1.5"><label className="text-xs font-black text-slate-400 mr-2">الرقم المدني</label><input type="text" value={editForm.national_id} onChange={e => setEditForm({...editForm, national_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none"/></div>
                  <div className="space-y-1.5"><label className="text-xs font-black text-slate-400 mr-2">رقم الهاتف</label><input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-left" dir="ltr"/></div>
                  <div className="space-y-1.5"><label className="text-xs font-black text-slate-400 mr-2">البريد الإلكتروني</label><input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-left" dir="ltr"/></div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-black text-indigo-600 mr-2">القسم الأكاديمي الحالي <span className="text-rose-500">*</span></label>
                    <select value={editForm.department_id || ''} onChange={e => setEditForm({...editForm, department_id: e.target.value})} className="w-full px-4 py-3 bg-indigo-50/50 border border-indigo-100 rounded-xl font-black text-indigo-900 outline-none cursor-pointer">
                      <option value="">-- يرجى اختيار قسم ليظهر المعلم في النظام --</option>
                      {departments?.map((d:any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2 space-y-1.5"><label className="text-xs font-black text-slate-400 mr-2">التخصص הדقيق</label><input type="text" value={editForm.specialization} onChange={e => setEditForm({...editForm, specialization: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                </div>
                <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100 space-y-5">
                  <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-amber-100"><input type="checkbox" id="isHOD" checked={editForm.isHOD} onChange={e => setEditForm({...editForm, isHOD: e.target.checked})} className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"/><label htmlFor="isHOD" className="text-sm font-black text-slate-800 cursor-pointer select-none">ترقية لـ رئيس قسم</label></div>
                  {editForm.isHOD && <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2"><select value={editForm.hod_subject_id} onChange={e => setEditForm({...editForm, hod_subject_id: e.target.value})} className="w-full px-4 py-3 bg-white rounded-xl font-bold outline-none border border-amber-100"><option value="">-- مادة الإشراف --</option>{subjects?.map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>}
                </div>
              </form>
            </div>
            <div className="p-8 bg-slate-50 flex flex-row-reverse gap-3">
              <button disabled={submittingEdit} onClick={handleEditSubmit} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {submittingEdit && <Loader2 className="w-5 h-5 animate-spin" />} حفظ البيانات ونقل المعلم
              </button>
              <button onClick={() => setShowEditModal(false)} className="px-6 py-4 bg-white text-slate-500 rounded-2xl font-black border border-slate-200">إلغاء</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* نافذة الإضافة */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
             <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
             <div className="relative transform overflow-hidden rounded-[2.5rem] bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-slate-100">
                <div className="bg-white px-6 sm:px-10 pb-8 pt-8 sm:pt-10">
                   <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                      <h3 className="text-xl font-black text-slate-900">إضافة معلم جديد</h3>
                      <button onClick={() => setShowAddModal(false)}><X className="h-6 w-6 text-slate-400" /></button>
                   </div>
                   <form className="space-y-6">
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <input type="text" placeholder="الاسم الرباعي *" value={addForm.full_name} onChange={(e) => setAddForm({...addForm, full_name: e.target.value})} className="w-full rounded-2xl border-0 py-3.5 px-4 bg-slate-50 ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold outline-none" />
                        <input type="text" placeholder="الرقم المدني *" value={addForm.national_id} onChange={(e) => setAddForm({...addForm, national_id: e.target.value})} className="w-full rounded-2xl border-0 py-3.5 px-4 bg-slate-50 ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold outline-none" />
                        <input type="text" placeholder="رقم الهاتف" value={addForm.phone} onChange={(e) => setAddForm({...addForm, phone: e.target.value})} className="w-full rounded-2xl border-0 py-3.5 px-4 bg-slate-50 ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold outline-none text-left" dir="ltr" />
                        <input type="email" placeholder="البريد الإلكتروني" value={addForm.email} onChange={(e) => setAddForm({...addForm, email: e.target.value})} className="w-full rounded-2xl border-0 py-3.5 px-4 bg-slate-50 ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold outline-none text-left" dir="ltr" />
                        <select value={addForm.department_id} onChange={(e) => setAddForm({...addForm, department_id: e.target.value})} className="sm:col-span-2 w-full rounded-2xl border-0 py-3.5 px-4 bg-indigo-50/50 border border-indigo-100 text-indigo-900 focus:ring-2 focus:ring-indigo-500 font-black outline-none cursor-pointer shadow-inner">
                           <option value="">-- اختر القسم الأكاديمي المعتمد --</option>
                           {departments?.map((d:any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <input type="text" placeholder="التخصص الدقيق (اختياري)" value={addForm.specialization} onChange={(e) => setAddForm({...addForm, specialization: e.target.value})} className="sm:col-span-2 w-full rounded-2xl border-0 py-3.5 px-4 bg-slate-50 ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold outline-none" />
                      </div>
                   </form>
                </div>
                <div className="bg-slate-50/80 px-6 py-6 flex flex-row-reverse gap-3 border-t">
                   <button disabled={submitting} onClick={handleAddSubmit} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black disabled:opacity-50">إضافة المعلم</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* نافذة التعيين السريع */}
      {showAssignmentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAssignmentModal(false)}></div>
            <div className="relative transform overflow-hidden rounded-[2.5rem] bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-4xl border border-slate-100">
              <div className="bg-white px-6 sm:px-10 pb-8 pt-8 sm:pt-10">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                  <h3 className="text-xl font-black text-slate-900">تعيين الفصول: {selectedTeacherForAssign?.users?.full_name}</h3>
                  <button onClick={() => setShowAssignmentModal(false)}><X className="h-6 w-6 text-slate-400" /></button>
                </div>
                
                <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="bg-amber-50 rounded-[2rem] p-6 border border-amber-100">
                    <h4 className="text-sm font-black text-amber-900 mb-4">التعيين المتعدد السريع</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="text-xs font-black text-amber-800 mb-2 block">حدد المواد</label>
                        <div className="flex flex-wrap gap-2">
                          {subjects.map((s:any) => <button key={s.id} onClick={() => toggleBulkSubject(s.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${bulkAssignData.subject_ids.includes(s.id) ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-amber-700 border-amber-200'}`}>{s.name}</button>)}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-black text-amber-800 mb-2 block">حدد الفصول</label>
                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                          {sections.map((s:any) => <button key={s.id} onClick={() => toggleBulkSection(s.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${bulkAssignData.section_ids.includes(s.id) ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-amber-700 border-amber-200'}`}>{s.classes?.name} - {s.name}</button>)}
                        </div>
                      </div>
                    </div>
                    <button onClick={handleBulkAssign} className="w-full py-3 bg-amber-500 text-white rounded-xl font-black shadow-md hover:bg-amber-600 transition-all">تنفيذ التعيين المتعدد</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sections.map((sec:any) => (
                      <div key={sec.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <h4 className="font-black text-slate-800 text-sm mb-3">{sec.classes?.name} - {sec.name}</h4>
                        <div className="flex flex-wrap gap-2">
                          {subjects.map((sub:any) => {
                            const isAssigned = teacherSections.some(ts => ts.section_id === sec.id && ts.subject_id === sub.id);
                            return <button key={sub.id} onClick={() => toggleAssignment(sec.id, sub.id)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${isAssigned ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}>{sub.name}</button>
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-slate-50/80 px-6 py-6 border-t border-slate-100 flex justify-end">
                <button onClick={() => setShowAssignmentModal(false)} className="px-10 py-3 bg-indigo-600 text-white rounded-xl font-black">إغلاق النافذة</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تغيير كلمة المرور */}
      {showPasswordResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-md rounded-[2rem] p-8 text-center shadow-2xl border border-slate-100">
            <div className="mx-auto w-16 h-16 bg-sky-50 text-sky-600 flex items-center justify-center rounded-2xl mb-4">
              <Key size={32} />
            </div>
            <h3 className="text-xl font-black mb-2 text-slate-900">تغيير كلمة المرور</h3>
            <p className="text-xs text-slate-500 font-bold mb-6">اكتب كلمة المرور الجديدة في الأسفل. (يجب أن تتكون من 6 أحرف أو أرقام على الأقل).</p>
            <input type="text" placeholder="اكتب كلمة المرور الجديدة..." value={resetPasswordForm.newPassword} onChange={e => setResetPasswordForm({...resetPasswordForm, newPassword: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 font-bold focus:ring-2 focus:ring-sky-500 outline-none mb-6 text-center shadow-inner text-lg" dir="ltr"/>
            <div className="flex gap-3">
              <button onClick={handleResetPasswordSubmit} className="flex-1 bg-sky-600 text-white font-black py-3.5 rounded-xl hover:bg-sky-700 shadow-md shadow-sky-200 transition-all active:scale-95">حفظ التغيير</button>
              <button onClick={() => { setShowPasswordResetModal(false); setResetPasswordForm({ userId: '', newPassword: '' }); }} className="flex-1 bg-slate-100 text-slate-600 font-black py-3.5 rounded-xl hover:bg-slate-200 transition-all">إلغاء</button>
            </div>
          </motion.div>
        </div>
      )}

      {showDeleteModal && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60"><div className="bg-white p-8 rounded-3xl text-center"><h3 className="text-xl font-black mb-4">تأكيد الحذف</h3><div className="flex gap-4"><button onClick={confirmDelete} className="bg-rose-600 text-white px-8 py-2 rounded-xl font-black flex-1">حذف نهائي</button><button onClick={() => setShowDeleteModal(false)} className="bg-slate-100 text-slate-500 px-8 py-2 rounded-xl font-black flex-1">تراجع</button></div></div></div>}
      
      {teacherForBadge && <GrantBadgeModal isOpen={isBadgeModalOpen} onClose={() => { setIsBadgeModalOpen(false); setTeacherForBadge(null); }} recipientId={teacherForBadge.id} recipientName={teacherForBadge.name} granterId={user?.id || 'admin'} />}
    </div>
  );
}
