// @ts-nocheck
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Plus, Search, Edit, Trash2, X, Key, BookOpen, AlertCircle, 
  Users, GraduationCap, Folder, ChevronLeft, ChevronRight, School, Layers,
  Award, Crown, CheckCircle2, LayoutGrid, List, Loader2, UserMinus, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUsersSystem } from '@/hooks/useUsersSystem';
import { useTeacherAssignmentsSystem } from '@/hooks/useTeacherAssignmentsSystem';
import { useAuth } from '@/context/auth-context';
import GrantBadgeModal from '@/components/GrantBadgeModal';
import { supabase } from '@/lib/supabase';
import * as Dialog from '@radix-ui/react-dialog'; // 🚀 أضفنا Dialog للنوافذ المتقدمة

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } } };

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
    <tr className="hover:bg-white/5 transition-colors group border-b border-white/5 bg-[#02040a]/40 backdrop-blur-md">
      <td className="whitespace-nowrap py-4 pr-8 pl-4 border-l border-white/5">
        <div className="flex items-center gap-4 text-right">
          <div className="relative shrink-0">
            <div className={`h-12 w-12 rounded-[1rem] flex items-center justify-center font-black text-lg sm:text-xl border group-hover:scale-110 transition-transform duration-300 shadow-inner ${isHOD ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'}`}>
              {userData?.avatar_url ? <img src={userData.avatar_url} className="w-full h-full object-cover rounded-[1rem]" alt="T"/> : (userData?.full_name?.charAt(0) || 'م')}
            </div>
            {isHOD && <div className="absolute -top-2 -right-2 p-1 bg-[#0f1423] rounded-full border border-amber-500/30 shadow-inner"><Crown className="h-3 w-3 sm:h-4 sm:w-4 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" /></div>}
          </div>
          <div className="min-w-0 pr-1">
            <p className="font-black text-white text-sm sm:text-base drop-shadow-md truncate transition-colors group-hover:text-indigo-100">{userData?.full_name || 'غير معروف'}</p>
            <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold truncate mt-0.5">{userData?.email || 'لا يوجد بريد'}</p>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-xs sm:text-sm font-bold text-slate-300 font-mono text-center border-l border-white/5 tracking-wider">{teacher.national_id}</td>
      <td className="whitespace-nowrap px-4 py-4 text-center border-l border-white/5">
        <span className={`text-[10px] sm:text-xs font-black px-3 py-1.5 rounded-lg border shadow-inner backdrop-blur-sm ${!deptObj ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 animate-pulse' : 'bg-white/5 text-slate-300 border-white/10'}`}>
          {departmentName}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-center border-l border-white/5">
        <div className="flex flex-wrap gap-1.5 justify-center">
          {isHOD && <span className="px-2 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] sm:text-[10px] font-black rounded-md shadow-inner">رئيس قسم</span>}
          <span className="px-2 py-1 bg-white/5 text-slate-300 text-[9px] sm:text-[10px] font-bold rounded-md border border-white/10 shadow-inner">{teacher.specialization || 'عام'}</span>
        </div>
      </td>
      <td className="whitespace-nowrap py-4 pl-8 pr-4 text-left">
        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button onClick={() => onAssign(teacher)} className="p-2 sm:p-2.5 text-slate-400 hover:text-emerald-400 bg-white/5 hover:bg-emerald-500/10 rounded-xl shadow-inner border border-white/10 hover:border-emerald-500/30 transition-all active:scale-95" title="تعيين الفصول"><BookOpen className="w-4 h-4" /></button>
          <button onClick={() => onGrantBadge(teacher)} className="p-2 sm:p-2.5 text-slate-400 hover:text-amber-400 bg-white/5 hover:bg-amber-500/10 rounded-xl shadow-inner border border-white/10 hover:border-amber-500/30 transition-all active:scale-95" title="منح وسام"><Award className="w-4 h-4" /></button>
          <button onClick={() => onResetPassword(teacher)} className="p-2 sm:p-2.5 text-slate-400 hover:text-indigo-400 bg-white/5 hover:bg-indigo-500/10 rounded-xl shadow-inner border border-white/10 hover:border-indigo-500/30 transition-all active:scale-95" title="تغيير كلمة المرور"><Key className="w-4 h-4" /></button>
          <button onClick={() => onEdit(teacher)} className="p-2 sm:p-2.5 text-slate-400 hover:text-indigo-400 bg-white/5 hover:bg-indigo-500/10 rounded-xl shadow-inner border border-white/10 hover:border-indigo-500/30 transition-all active:scale-95" title="تعديل"><Edit className="w-4 h-4" /></button>
          <button onClick={() => onDelete(teacher.id)} className="p-2 sm:p-2.5 text-slate-400 hover:text-rose-400 bg-white/5 hover:bg-rose-500/10 rounded-xl shadow-inner border border-white/10 hover:border-rose-500/30 transition-all active:scale-95" title="حذف نهائي"><Trash2 className="w-4 h-4" /></button>
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

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table'); // خليتها جدول كافتراضي أريح للإدارة
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

  const groupedMembers = departmentMembers.reduce((acc: Record<string, any[]>, teacher: any) => {
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

  // 🚀 تصميم الكارت الخاص بنمط الـ Grid (Holographic Card)
  const TeacherCard = ({ teacher, isHOD = false }: any) => {
    const stageInfo = getTeacherStageInfo(teacher);
    const userData = Array.isArray(teacher.users) ? teacher.users[0] : teacher.users;
    
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-6 rounded-[2rem] bg-[#02040a]/40 backdrop-blur-md border ${isHOD ? 'border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'border-white/10 shadow-inner'} relative overflow-hidden group hover:-translate-y-1 transition-all`}>
        {isHOD && <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[40px] rounded-full pointer-events-none mix-blend-screen"></div>}
        <div className="flex justify-between items-start relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner border group-hover:scale-110 transition-transform duration-300 ${isHOD ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'}`}>
                {userData?.avatar_url ? <img src={userData.avatar_url} className="w-full h-full rounded-2xl object-cover" alt="T"/> : userData?.full_name?.charAt(0)}
              </div>
              {isHOD && <Crown className="absolute -top-2 -right-2 h-6 w-6 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />}
            </div>
            <div>
              <h3 className={`font-black leading-tight drop-shadow-md ${isHOD ? 'text-amber-100' : 'text-white'}`}>{userData?.full_name}</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-1 font-mono tracking-wider">{teacher.national_id}</p>
            </div>
          </div>
          <div className={`px-2 py-1 rounded-lg bg-${stageInfo.color}-500/10 text-${stageInfo.color}-300 text-[10px] font-black border border-${stageInfo.color}-500/30 shadow-inner backdrop-blur-sm`}>{stageInfo.label}</div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5 relative z-10">
           {isHOD && <span className="px-2 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black rounded-md shadow-inner">رئيس قسم</span>}
           {(teacher.custom_titles || []).map((t: string, i: number) => <span key={i} className="px-2 py-1 bg-white/5 text-slate-300 border border-white/10 text-[9px] font-bold rounded-md shadow-inner">{t}</span>)}
        </div>
        <div className="flex gap-2 mt-5 pt-4 border-t border-white/5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity relative z-10">
           <button type="button" onClick={() => handleOpenEditModal(teacher)} className="flex-1 py-2 bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 rounded-xl text-[10px] font-black hover:bg-indigo-500/20 transition-all shadow-inner">تعديل ونقل</button>
           <button type="button" onClick={() => { setResetPasswordForm({ userId: teacher.id, newPassword: '' }); setShowPasswordModal(true); }} className="p-2 bg-sky-500/10 text-sky-400 border border-sky-500/30 rounded-xl hover:bg-sky-500/20 transition-all shadow-inner"><Key size={14}/></button>
           <button type="button" onClick={() => handleAssignmentClick(teacher)} className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/20 transition-all shadow-inner"><BookOpen size={14}/></button>
           <button type="button" onClick={() => { setTeacherForBadge({ id: teacher.id, name: userData?.full_name || 'معلم غير معروف' }); setIsBadgeModalOpen(true); }} className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl hover:bg-amber-500/20 transition-all shadow-inner"><Award size={14}/></button>
           <button type="button" onClick={() => { setTeacherToDelete(teacher.id); setShowDeleteModal(true); }} className="p-2 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-xl hover:bg-rose-500/20 transition-all shadow-inner"><Trash2 size={14}/></button>
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="relative min-h-[100dvh] bg-transparent font-sans text-slate-100 selection:bg-indigo-500/30 pb-20 pt-6" dir="rtl">
      
      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-[100] px-6 sm:px-8 py-3 sm:py-4 rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex items-center gap-3 sm:gap-4 transition-all backdrop-blur-3xl border w-[90%] sm:w-auto ${
            notification.type === 'success' ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-100' : 'bg-rose-950/80 border-rose-500/50 text-rose-100'
          }`}>
            <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${notification.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-rose-500/20 border border-rose-500/30'}`}>
              {notification.type === 'success' ? <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400 drop-shadow-md" /> : <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-rose-400 drop-shadow-md" />}
            </div>
            <div className="font-black tracking-tight text-sm sm:text-base leading-snug drop-shadow-md">{notification.message}</div>
            <button onClick={() => setNotification(null)} className="p-1 sm:p-1.5 hover:bg-white/10 rounded-lg transition-colors mr-2 sm:mr-4 text-slate-400 shrink-0 active:scale-90">
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8 relative z-10">
        
        {/* 🚀 Header Hero */}
        <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 glass-panel p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border-indigo-500/20 shadow-[0_0_40px_rgba(99,102,241,0.1)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none mix-blend-screen transition-transform duration-1000 group-hover:scale-110"></div>
          
          <div className="relative z-10 text-center lg:text-right w-full lg:w-auto">
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-[10px] sm:text-xs font-black text-indigo-400 uppercase tracking-widest mx-auto md:mx-0 shadow-inner backdrop-blur-md mb-3">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 drop-shadow-sm" /> 
              {selectedDepartment === 'unassigned' ? 'معلمون بلا قسم (يتطلب تعيين)' : selectedDepartment ? `قسم ${departments?.find((d:any) => d.id === selectedDepartment)?.name}` : 'إدارة المعلمين والأقسام'}
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-lg mb-2">إدارة المعلمين</h1>
            <p className="text-sm sm:text-base text-slate-300 font-bold max-w-md mx-auto lg:mx-0 opacity-90 drop-shadow-sm">تنظيم الهيكلية المدرسية، توزيع الأقسام، والمناصب لضمان سير العملية التعليمية بانتظام.</p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center lg:justify-end gap-3 relative z-10 w-full lg:w-auto mt-2 lg:mt-0">
            <button onClick={() => { fetchTeachers(); if(fetchDepartments) fetchDepartments(); }} className="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-slate-300 shadow-inner border border-white/10 hover:bg-white/10 hover:text-white transition-all active:scale-95 backdrop-blur-sm">
               <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''}/> تحديث البيانات
            </button>
            <button onClick={() => setShowAddModal(true)} className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600/90 px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:bg-indigo-500 transition-all active:scale-95 border border-indigo-400/50 backdrop-blur-md">
              <Plus size={18}/> إضافة معلم
            </button>
          </div>
        </motion.div>

        {/* 🚀 Stats Orbs */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="glass-panel p-5 sm:p-6 rounded-[1.5rem] lg:rounded-[2rem] flex flex-col justify-center items-center text-center gap-2 group relative overflow-hidden">
             <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-blue-500/20 blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none mix-blend-screen"></div>
             <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-blue-500/10 backdrop-blur-md border border-blue-500/20 flex items-center justify-center text-blue-400 relative z-10 group-hover:scale-110 transition-transform shadow-inner"><Users className="h-5 w-5 sm:h-6 sm:w-6 drop-shadow-md"/></div>
             <div className="relative z-10"><p className="text-2xl sm:text-3xl font-black text-white leading-none drop-shadow-lg">{teachers?.length || 0}</p><p className="text-[9px] sm:text-[10px] font-bold text-slate-300 uppercase mt-1 tracking-widest opacity-80">إجمالي المعلمين</p></div>
          </div>
          <div className="glass-panel p-5 sm:p-6 rounded-[1.5rem] lg:rounded-[2rem] flex flex-col justify-center items-center text-center gap-2 group relative overflow-hidden border-emerald-500/20">
             <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-emerald-500/20 blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none mix-blend-screen"></div>
             <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 flex items-center justify-center text-emerald-400 relative z-10 group-hover:scale-110 transition-transform shadow-inner"><Folder className="h-5 w-5 sm:h-6 sm:w-6 drop-shadow-md"/></div>
             <div className="relative z-10"><p className="text-2xl sm:text-3xl font-black text-white leading-none drop-shadow-lg">{departments?.length || 0}</p><p className="text-[9px] sm:text-[10px] font-bold text-slate-300 uppercase mt-1 tracking-widest opacity-80">أقسام معتمدة</p></div>
          </div>
          <div onClick={() => { setViewMode('table'); setSelectedDepartment('unassigned'); }} className="glass-panel p-5 sm:p-6 rounded-[1.5rem] lg:rounded-[2rem] flex flex-col justify-center items-center text-center gap-2 group relative overflow-hidden border-rose-500/30 hover:border-rose-400/50 cursor-pointer shadow-[0_0_20px_rgba(225,29,72,0.1)] hover:bg-[#02040a]/60 transition-all">
             <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-rose-500/20 blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none mix-blend-screen"></div>
             <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-rose-500/10 backdrop-blur-md border border-rose-500/20 flex items-center justify-center text-rose-400 relative z-10 group-hover:scale-110 transition-transform shadow-inner animate-pulse"><UserMinus className="h-5 w-5 sm:h-6 sm:w-6 drop-shadow-md"/></div>
             <div className="relative z-10"><p className="text-2xl sm:text-3xl font-black text-rose-400 leading-none drop-shadow-lg">{unassignedTeachersCount}</p><p className="text-[9px] sm:text-[10px] font-bold text-rose-300/80 uppercase mt-1 tracking-widest">بلا قسم (انقر هنا)</p></div>
          </div>
        </motion.div>

        {/* 🚀 Filters & View Mode */}
        <motion.div variants={itemVariants} className="glass-panel p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border-white/10 shadow-inner flex flex-col lg:flex-row items-center justify-between gap-4 relative z-20">
          <div className="flex bg-[#02040a]/40 p-1.5 rounded-xl border border-white/5 w-full lg:w-auto shadow-inner">
            <button onClick={() => setViewMode('table')} className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-black transition-all ${viewMode === 'table' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-inner' : 'text-slate-400 hover:text-white'}`}><List size={16}/> القائمة</button>
            <button onClick={() => setViewMode('grid')} className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-black transition-all ${viewMode === 'grid' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-inner' : 'text-slate-400 hover:text-white'}`}><LayoutGrid size={16}/> الأقسام</button>
          </div>
          <div className="flex w-full lg:w-auto gap-2 flex-1 max-w-2xl flex-col sm:flex-row">
            <div className="relative flex-1 group">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-400 group-focus-within:text-indigo-400 transition-colors drop-shadow-sm" />
              <input type="text" className="w-full rounded-xl sm:rounded-2xl border border-white/10 py-3.5 pr-10 sm:pr-12 pl-4 text-white bg-[#02040a]/40 backdrop-blur-md focus:bg-white/5 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-xs sm:text-sm font-bold transition-all shadow-inner outline-none placeholder:text-slate-500" placeholder="بحث بالاسم أو الرقم المدني..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <select value={selectedDepartment || 'all'} onChange={(e) => setSelectedDepartment(e.target.value === 'all' ? null : e.target.value)} className="w-full sm:w-48 rounded-xl sm:rounded-2xl border border-white/10 py-3.5 px-4 text-white bg-[#02040a]/40 backdrop-blur-md focus:bg-white/5 focus:ring-2 focus:ring-indigo-500/50 text-xs sm:text-sm font-bold appearance-none cursor-pointer transition-all shadow-inner outline-none [&>option]:bg-[#0f1423]">
              <option value="all">جميع الأقسام</option>
              <option value="unassigned" className="text-rose-400 font-black bg-rose-950/50">معلمون بلا قسم ⚠️</option>
              {departments?.map((d:any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </motion.div>

        {/* 🚀 Main Content */}
        <motion.div variants={itemVariants} className="glass-panel rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border-white/10 overflow-hidden">
          {viewMode === 'table' ? (
            <div className="overflow-x-auto min-h-[400px] custom-scrollbar p-1">
              <table className="min-w-full divide-y divide-white/5 border-collapse text-right whitespace-nowrap">
                <thead className="bg-white/5 backdrop-blur-md border-b border-white/10">
                  <tr className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-widest">
                    <th className="py-5 pr-8 pl-4">المعلم</th>
                    <th className="px-4 py-5 text-center">الرقم المدني</th>
                    <th className="px-4 py-5 text-center">القسم الأكاديمي</th>
                    <th className="px-4 py-5 text-center">التخصص</th>
                    <th className="py-5 pl-8 pr-4 text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-transparent">
                  {isLoading ? (
                    <tr><td colSpan={5} className="py-32 text-center"><Loader2 className="w-10 h-10 sm:w-12 sm:w-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" /><p className="font-bold text-indigo-300 tracking-widest animate-pulse mt-4">جاري تحميل البيانات...</p></td></tr>
                  ) : filteredTeachers.length === 0 ? (
                    <tr><td colSpan={5} className="py-32 text-center"><div className="bg-white/5 h-20 w-20 sm:h-24 sm:w-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-white/10"><Search className="h-10 w-10 text-slate-500 drop-shadow-sm"/></div><p className="font-black text-lg text-white drop-shadow-md">لا يوجد نتائج تطابق الفلاتر</p></td></tr>
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
            <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 bg-transparent">
              {unassignedTeachersCount > 0 && !selectedDepartment && (
                 <motion.div whileHover={{ y: -5 }} onClick={() => { setViewMode('table'); setSelectedDepartment('unassigned'); }} className="bg-rose-500/10 backdrop-blur-md p-8 rounded-[2.5rem] cursor-pointer border-2 border-rose-500/20 hover:border-rose-400/50 hover:bg-rose-500/20 text-center group transition-all shadow-[0_0_30px_rgba(225,29,72,0.1)]">
                    <div className="h-16 w-16 rounded-2xl bg-[#02040a] border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto mb-4 shadow-inner group-hover:text-rose-300 transition-colors animate-pulse"><UserMinus size={28}/></div>
                    <h3 className="text-lg font-black text-rose-300 drop-shadow-md">معلمون بلا قسم</h3>
                    <p className="text-[10px] sm:text-xs font-bold text-rose-400/80 mt-2">يتطلب توزيعهم ({unassignedTeachersCount})</p>
                 </motion.div>
              )}
              {!selectedDepartment ? (
                departments?.map((dept: any) => (
                  <motion.div key={dept.id} whileHover={{ y: -5 }} onClick={() => setSelectedDepartment(dept.id)} className="bg-[#02040a]/40 backdrop-blur-md p-8 rounded-[2.5rem] cursor-pointer border border-white/5 hover:border-indigo-500/40 hover:bg-white/5 text-center group transition-all shadow-inner">
                    <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-4 shadow-inner group-hover:scale-110 transition-transform"><Folder size={28}/></div>
                    <h3 className="text-lg font-black text-white drop-shadow-md">{dept.name}</h3>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full space-y-10 sm:space-y-12">
                  <button onClick={() => setSelectedDepartment(null)} className="flex items-center gap-2 text-indigo-400 font-black text-xs sm:text-sm hover:text-indigo-300 transition-colors bg-white/5 px-4 py-2 rounded-xl border border-white/10 shadow-inner w-fit"><ChevronLeft size={16}/> العودة لجميع الأقسام</button>
                  {departmentHeads.length > 0 && (
                    <div className="space-y-5 sm:space-y-6">
                      <h2 className="text-xl sm:text-2xl font-black text-amber-400 flex items-center gap-2 px-2 drop-shadow-md border-r-4 border-amber-500 pr-3"><Crown className="w-6 h-6"/> رئاسة القسم</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                        {departmentHeads.map((hod: any) => <TeacherCard key={hod.id} teacher={hod} isHOD={true}/>)}
                      </div>
                    </div>
                  )}
                  {departmentMembers.length > 0 ? (
                    <div className="space-y-5 sm:space-y-6">
                      <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 px-2 drop-shadow-md border-r-4 border-indigo-500 pr-3"><Users className="w-6 h-6 text-indigo-400"/> أعضاء القسم</h2>
                      {Object.entries(groupedMembers).map(([spec, specTeachers]: [string, any]) => (
                        <div key={spec} className="bg-[#02040a]/40 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/5 space-y-6 shadow-inner">
                          <div className="inline-flex items-center gap-2 bg-indigo-500/10 px-4 py-2 rounded-xl shadow-inner border border-indigo-500/20"><div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div><h3 className="font-black text-indigo-300 text-xs sm:text-sm tracking-widest">تخصص: {spec}</h3></div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">{(specTeachers as any[]).map((t: any) => <TeacherCard key={t.id} teacher={t}/>)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-20 text-center text-slate-400 font-bold bg-[#02040a]/30 rounded-[2rem] border border-dashed border-white/10 shadow-inner">لا يوجد أعضاء في هذا القسم حالياً.</div>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>

      </div>

      {/* ==========================================
          🚀 النوافذ المنبثقة (Glass Modals)
          ========================================== */}

      {/* نافذة الإضافة */}
      <AnimatePresence>
        {showAddModal && (
          <Dialog.Root open={showAddModal} onOpenChange={setShowAddModal}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/80 backdrop-blur-md z-50 animate-in fade-in duration-300" />
              <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95%] sm:w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[2.5rem] glass-panel border border-indigo-500/30 p-0 shadow-[0_0_60px_rgba(0,0,0,0.8)] focus:outline-none max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-300" dir="rtl">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none mix-blend-screen"></div>
                
                <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-[#02040a]/40 relative z-10">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-inner"><Plus className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400 drop-shadow-sm"/></div>
                    <h3 className="text-xl sm:text-2xl font-black text-white drop-shadow-md">إضافة معلم جديد</h3>
                  </div>
                  <Dialog.Close className="p-2 bg-white/5 rounded-xl border border-white/10 shadow-inner text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-all active:scale-90"><X className="w-5 h-5"/></Dialog.Close>
                </div>

                <div className="p-6 sm:p-8 space-y-5 sm:space-y-6 relative z-10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                     <div className="bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                        <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 uppercase tracking-widest ml-1">الاسم الرباعي <span className="text-rose-500">*</span></label>
                        <input type="text" value={addForm.full_name} onChange={e => setAddForm({...addForm, full_name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 sm:py-3.5 font-bold text-white focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm transition-all shadow-inner placeholder:text-slate-600" placeholder="أدخل الاسم..." />
                     </div>
                     <div className="bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                        <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 uppercase tracking-widest ml-1">الرقم المدني <span className="text-rose-500">*</span></label>
                        <input type="text" value={addForm.national_id} onChange={e => setAddForm({...addForm, national_id: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 sm:py-3.5 font-bold text-white font-mono focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm transition-all shadow-inner placeholder:text-slate-600" placeholder="أدخل الرقم..." />
                     </div>
                     <div className="bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                        <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 uppercase tracking-widest ml-1">رقم الهاتف</label>
                        <input type="text" value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 sm:py-3.5 font-bold text-white font-mono focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm transition-all shadow-inner text-left placeholder:text-slate-600" dir="ltr" placeholder="أدخل الهاتف..." />
                     </div>
                     <div className="bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                        <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 uppercase tracking-widest ml-1">البريد الإلكتروني</label>
                        <input type="email" value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 sm:py-3.5 font-bold text-white focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm text-left transition-all shadow-inner placeholder:text-slate-600" dir="ltr" placeholder="example@email.com" />
                     </div>
                     <div className="sm:col-span-2 bg-indigo-500/5 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-indigo-500/20 shadow-inner">
                        <label className="text-[10px] sm:text-xs font-black text-indigo-400 block mb-2 uppercase tracking-widest ml-1 drop-shadow-sm">رابط زووم (Zoom Link)</label>
                        <input type="url" value={addForm.zoom_link} onChange={e => setAddForm({...addForm, zoom_link: e.target.value})} className="w-full bg-white/5 border border-indigo-500/30 rounded-xl px-4 py-3 sm:py-3.5 font-bold text-white focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm text-left transition-all shadow-inner placeholder:text-indigo-900/50" dir="ltr" placeholder="https://zoom.us/j/..." />
                     </div>
                     <div className="sm:col-span-2 bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                        <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 uppercase tracking-widest ml-1">القسم الأكاديمي <span className="text-rose-500">*</span></label>
                        <select value={addForm.department_id} onChange={e => setAddForm({...addForm, department_id: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 sm:py-3.5 font-bold text-white focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm appearance-none cursor-pointer transition-all shadow-inner [&>option]:bg-[#0f1423]">
                           <option value="">-- اختر القسم الأكاديمي המעתمد --</option>
                           {departments?.map((d:any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                     </div>
                     <div className="sm:col-span-2 bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                        <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 uppercase tracking-widest ml-1">التخصص الدقيق (اختياري)</label>
                        <input type="text" value={addForm.specialization} onChange={e => setAddForm({...addForm, specialization: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 sm:py-3.5 font-bold text-white focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm transition-all shadow-inner placeholder:text-slate-600" placeholder="مثال: فيزياء عضوية..." />
                     </div>
                  </div>
                  <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-white/5">
                    <Dialog.Close asChild>
                      <button className="flex-1 bg-white/5 text-slate-300 font-black py-3.5 sm:py-4 rounded-xl border border-white/10 hover:bg-white/10 transition-all text-xs sm:text-sm active:scale-95 shadow-inner">إلغاء</button>
                    </Dialog.Close>
                    <button onClick={handleAddSubmit} disabled={submitting} className="flex-1 bg-indigo-600/90 backdrop-blur-md text-white border border-indigo-400/50 font-black py-3.5 sm:py-4 rounded-xl hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] text-xs sm:text-sm active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                       {submitting ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin"/> : <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />} إضافة المعلم
                    </button>
                  </div>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>

      {/* نافذة التعديل */}
      <AnimatePresence>
        {showEditModal && (
          <Dialog.Root open={showEditModal} onOpenChange={setShowEditModal}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/80 backdrop-blur-md z-50 animate-in fade-in duration-300" />
              <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95%] sm:w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[2.5rem] glass-panel border border-indigo-500/30 p-0 shadow-[0_0_60px_rgba(0,0,0,0.8)] focus:outline-none max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-300" dir="rtl">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none mix-blend-screen"></div>
                
                <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-[#02040a]/40 relative z-10">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-inner"><Edit className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400 drop-shadow-sm"/></div>
                    <h3 className="text-xl sm:text-2xl font-black text-white drop-shadow-md">تعديل الملف ونقل المعلم</h3>
                  </div>
                  <Dialog.Close className="p-2 bg-white/5 rounded-xl border border-white/10 shadow-inner text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-all active:scale-90"><X className="w-5 h-5"/></Dialog.Close>
                </div>

                <div className="p-6 sm:p-8 space-y-5 sm:space-y-6 relative z-10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                     <div className="bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                        <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 uppercase tracking-widest ml-1">الاسم</label>
                        <input type="text" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 sm:py-3.5 font-bold text-white focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm transition-all shadow-inner" />
                     </div>
                     <div className="bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                        <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 uppercase tracking-widest ml-1">الرقم المدني</label>
                        <input type="text" value={editForm.national_id} onChange={e => setEditForm({...editForm, national_id: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 sm:py-3.5 font-bold text-white font-mono focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm transition-all shadow-inner" />
                     </div>
                     <div className="bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                        <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 uppercase tracking-widest ml-1">رقم الهاتف</label>
                        <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 sm:py-3.5 font-bold text-white font-mono focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm transition-all shadow-inner text-left" dir="ltr" />
                     </div>
                     <div className="bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                        <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 uppercase tracking-widest ml-1">البريد الإلكتروني</label>
                        <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 sm:py-3.5 font-bold text-white focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm text-left transition-all shadow-inner" dir="ltr" />
                     </div>
                     
                     <div className="sm:col-span-2 bg-indigo-500/10 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-indigo-500/30 shadow-inner">
                        <label className="text-[10px] sm:text-xs font-black text-indigo-300 block mb-2 uppercase tracking-widest ml-1 drop-shadow-sm">القسم الأكاديمي الحالي <span className="text-rose-500">*</span></label>
                        <select value={editForm.department_id || ''} onChange={e => setEditForm({...editForm, department_id: e.target.value})} className="w-full bg-white/10 border border-indigo-500/50 rounded-xl px-4 py-3 sm:py-3.5 font-black text-white focus:ring-2 focus:ring-indigo-400 outline-none text-sm appearance-none cursor-pointer transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)] [&>option]:bg-[#0f1423]">
                           <option value="">-- يرجى اختيار قسم ليظهر المعلم في النظام --</option>
                           {departments?.map((d:any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                     </div>

                     <div className="sm:col-span-2 bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                        <label className="text-[10px] sm:text-xs font-black text-slate-400 block mb-2 uppercase tracking-widest ml-1">التخصص الدقيق</label>
                        <input type="text" value={editForm.specialization} onChange={e => setEditForm({...editForm, specialization: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 sm:py-3.5 font-bold text-white focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm transition-all shadow-inner" />
                     </div>

                     <div className="sm:col-span-2 bg-indigo-500/5 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-indigo-500/20 shadow-inner">
                        <label className="text-[10px] sm:text-xs font-black text-indigo-400 block mb-2 uppercase tracking-widest ml-1 drop-shadow-sm">رابط زووم (Zoom Link)</label>
                        <input type="url" value={editForm.zoom_link || ''} onChange={e => setEditForm({...editForm, zoom_link: e.target.value})} className="w-full bg-white/5 border border-indigo-500/30 rounded-xl px-4 py-3 sm:py-3.5 font-bold text-white focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm text-left transition-all shadow-inner placeholder:text-indigo-900/50" dir="ltr" placeholder="https://zoom.us/j/..." />
                     </div>

                     <div className="sm:col-span-2 bg-amber-500/10 backdrop-blur-md p-5 sm:p-6 rounded-2xl border border-amber-500/30 space-y-5 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                        <div className="flex items-center gap-3 bg-[#02040a]/60 p-4 rounded-xl border border-amber-500/20 shadow-inner">
                          <input type="checkbox" id="isHOD" checked={editForm.isHOD} onChange={e => setEditForm({...editForm, isHOD: e.target.checked})} className="w-5 h-5 rounded cursor-pointer accent-amber-500 bg-[#0f1423] border-amber-500/50"/>
                          <label htmlFor="isHOD" className="text-sm font-black text-amber-300 cursor-pointer select-none drop-shadow-sm flex items-center gap-2"><Crown className="w-4 h-4 text-amber-400"/> ترقية لـ رئيس قسم</label>
                        </div>
                        {editForm.isHOD && (
                          <div className="animate-in slide-in-from-top-2">
                             <select value={editForm.hod_subject_id} onChange={e => setEditForm({...editForm, hod_subject_id: e.target.value})} className="w-full bg-white/10 border border-amber-500/50 rounded-xl px-4 py-3 sm:py-3.5 font-black text-white focus:ring-2 focus:ring-amber-400 outline-none text-sm appearance-none cursor-pointer transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] [&>option]:bg-[#0f1423]">
                                <option value="">-- اختر مادة الإشراف --</option>
                                {subjects?.map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                             </select>
                          </div>
                        )}
                     </div>
                  </div>
                  <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-white/5">
                    <Dialog.Close asChild>
                      <button className="flex-1 bg-white/5 text-slate-300 font-black py-3.5 sm:py-4 rounded-xl border border-white/10 hover:bg-white/10 transition-all text-xs sm:text-sm active:scale-95 shadow-inner">إلغاء</button>
                    </Dialog.Close>
                    <button disabled={submittingEdit} onClick={handleEditSubmit} className="flex-1 bg-indigo-600/90 backdrop-blur-md text-white border border-indigo-400/50 font-black py-3.5 sm:py-4 rounded-xl hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] text-xs sm:text-sm active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                       {submittingEdit ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin"/> : <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />} حفظ التعديلات
                    </button>
                  </div>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>

      {/* نافذة التعيين السريع للفصول والمواد */}
      <AnimatePresence>
        {showAssignmentModal && (
          <Dialog.Root open={showAssignmentModal} onOpenChange={setShowAssignmentModal}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/80 backdrop-blur-md z-50 animate-in fade-in duration-300" />
              <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95%] sm:w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[2.5rem] glass-panel border border-emerald-500/30 p-0 shadow-[0_0_60px_rgba(0,0,0,0.8)] focus:outline-none max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300" dir="rtl">
                
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none mix-blend-screen"></div>

                <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-[#02040a]/40 relative z-10">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-inner"><BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 drop-shadow-sm"/></div>
                    <h3 className="text-xl sm:text-2xl font-black text-white drop-shadow-md">تعيين الفصول: {selectedTeacherForAssign?.users?.full_name}</h3>
                  </div>
                  <Dialog.Close className="p-2 bg-white/5 rounded-xl border border-white/10 shadow-inner text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-all active:scale-90"><X className="w-5 h-5"/></Dialog.Close>
                </div>
                
                <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar relative z-10 flex-1 space-y-6 sm:space-y-8">
                  <div className="bg-amber-500/10 rounded-[2rem] p-5 sm:p-6 border border-amber-500/30 shadow-inner backdrop-blur-md">
                    <h4 className="text-sm sm:text-base font-black text-amber-400 mb-4 sm:mb-5 flex items-center gap-2 drop-shadow-md"><Layers className="w-5 h-5"/> التعيين المتعدد السريع</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 mb-5 sm:mb-6">
                      <div className="bg-[#02040a]/40 p-4 rounded-2xl border border-white/5 shadow-inner">
                        <label className="text-[10px] sm:text-xs font-black text-slate-400 mb-3 block uppercase tracking-widest">حدد المواد</label>
                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                          {subjects.map((s:any) => (
                            <button key={s.id} onClick={() => toggleBulkSubject(s.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors shadow-inner ${bulkAssignData.subject_ids.includes(s.id) ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-white/5 text-slate-300 border-white/10 hover:border-amber-500/30'}`}>{s.name}</button>
                          ))}
                        </div>
                      </div>
                      <div className="bg-[#02040a]/40 p-4 rounded-2xl border border-white/5 shadow-inner">
                        <label className="text-[10px] sm:text-xs font-black text-slate-400 mb-3 block uppercase tracking-widest">حدد الفصول</label>
                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                          {sections.map((s:any) => (
                            <button key={s.id} onClick={() => toggleBulkSection(s.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors shadow-inner ${bulkAssignData.section_ids.includes(s.id) ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-white/5 text-slate-300 border-white/10 hover:border-amber-500/30'}`}>{s.classes?.name} - {s.name}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button onClick={handleBulkAssign} className="w-full py-3.5 bg-amber-500/90 backdrop-blur-md text-[#02040a] border border-amber-400/50 rounded-xl font-black shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:bg-amber-400 transition-all active:scale-95 text-sm sm:text-base">تنفيذ التعيين المتعدد</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sections.map((sec:any) => (
                      <div key={sec.id} className="bg-[#02040a]/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner hover:border-emerald-500/20 transition-colors">
                        <h4 className="font-black text-white text-sm mb-3 drop-shadow-md">{sec.classes?.name} - {sec.name}</h4>
                        <div className="flex flex-wrap gap-2">
                          {subjects.map((sub:any) => {
                            const isAssigned = teacherSections.some(ts => ts.section_id === sec.id && ts.subject_id === sub.id);
                            return (
                              <button key={sub.id} onClick={() => toggleAssignment(sec.id, sub.id)} className={`px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold border transition-colors shadow-inner ${isAssigned ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-white/5 text-slate-400 border-white/10 hover:border-emerald-500/30'}`}>{sub.name}</button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 sm:p-8 bg-[#02040a]/40 border-t border-white/5 flex justify-end relative z-10">
                  <Dialog.Close asChild>
                     <button className="w-full sm:w-auto px-10 py-3.5 bg-white/5 text-white rounded-xl font-black border border-white/10 hover:bg-white/10 transition-all active:scale-95 shadow-inner">إغلاق النافذة</button>
                  </Dialog.Close>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>

      {/* نافذة تغيير كلمة المرور */}
      <AnimatePresence>
        {showPasswordModal && (
          <Dialog.Root open={showPasswordModal} onOpenChange={setShowPasswordModal}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/80 backdrop-blur-md z-50 animate-in fade-in duration-300" />
              <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[90%] max-w-md translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[2.5rem] glass-panel border border-indigo-500/30 p-6 sm:p-8 text-center shadow-[0_0_60px_rgba(0,0,0,0.8)] focus:outline-none animate-in zoom-in-95 duration-300" dir="rtl">
                <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 blur-[40px] rounded-full pointer-events-none mix-blend-screen"></div>
                <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-4 sm:mb-6 shadow-inner relative z-10"><Key className="w-6 h-6 sm:w-8 sm:h-8 drop-shadow-md"/></div>
                <h3 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight relative z-10 drop-shadow-md">تغيير كلمة المرور</h3>
                <p className="text-xs sm:text-sm font-bold text-slate-400 mb-6 sm:mb-8 relative z-10">أدخل كلمة المرور الجديدة للمعلم في المربع أدناه.</p>
                
                <div className="bg-[#02040a]/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 shadow-inner relative z-10 mb-6 sm:mb-8">
                   <input type="text" placeholder="كلمة المرور الجديدة..." value={resetPasswordForm.newPassword} onChange={e => setResetPasswordForm({...resetPasswordForm, newPassword: e.target.value})} className="w-full bg-transparent border-none text-white font-black focus:ring-0 outline-none text-center tracking-widest text-lg sm:text-xl placeholder:text-slate-600 placeholder:text-sm placeholder:tracking-normal placeholder:font-bold" dir="ltr" />
                </div>
                
                <div className="flex flex-col-reverse sm:flex-row gap-3 relative z-10">
                  <Dialog.Close asChild>
                    <button className="flex-1 bg-white/5 text-slate-300 font-black py-3.5 sm:py-4 rounded-xl border border-white/10 hover:bg-white/10 transition-all text-xs sm:text-sm active:scale-95 shadow-inner">إلغاء</button>
                  </Dialog.Close>
                  <button onClick={handleResetPasswordSubmit} className="flex-1 bg-indigo-600/90 backdrop-blur-md text-white border border-indigo-400/50 font-black py-3.5 sm:py-4 rounded-xl hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] text-xs sm:text-sm active:scale-95">حفظ وتغيير</button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>

      {/* نافذة الحذف النهائي */}
      <AnimatePresence>
        {showDeleteModal && (
          <Dialog.Root open={showDeleteModal} onOpenChange={setShowDeleteModal}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/80 backdrop-blur-md z-50 animate-in fade-in duration-300" />
              <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[90%] max-w-md translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[2.5rem] glass-panel border border-rose-500/30 p-6 sm:p-8 text-center shadow-[0_0_60px_rgba(0,0,0,0.8)] focus:outline-none animate-in zoom-in-95 duration-300" dir="rtl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-[40px] rounded-full pointer-events-none mix-blend-screen"></div>
                <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-4 sm:mb-6 shadow-inner relative z-10"><Trash2 className="w-6 h-6 sm:w-8 sm:h-8 drop-shadow-md"/></div>
                <h3 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight relative z-10 drop-shadow-md">حذف المعلم النهائي</h3>
                <p className="text-xs sm:text-sm font-bold text-slate-400 mb-6 sm:mb-8 leading-relaxed relative z-10">هل أنت متأكد من حذف هذا المعلم؟ هذا الإجراء سيؤدي إلى فقدان ربطه بالمواد والفصول ولا يمكن التراجع عنه.</p>
                
                <div className="flex flex-col-reverse sm:flex-row gap-3 relative z-10">
                  <Dialog.Close asChild>
                    <button className="flex-1 bg-white/5 text-slate-300 font-black py-3.5 sm:py-4 rounded-xl border border-white/10 hover:bg-white/10 transition-all text-xs sm:text-sm active:scale-95 shadow-inner">تراجع وإلغاء</button>
                  </Dialog.Close>
                  <button onClick={confirmDelete} className="flex-1 bg-rose-600/90 backdrop-blur-md text-white border border-rose-400/50 font-black py-3.5 sm:py-4 rounded-xl hover:bg-rose-500 transition-all shadow-[0_0_20px_rgba(225,29,72,0.4)] text-xs sm:text-sm active:scale-95">نعم، احذف المعلم</button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>

      {/* 🚀 نافذة منح الأوسمة */}
      {teacherForBadge && (
        <GrantBadgeModal
          isOpen={isBadgeModalOpen}
          onClose={() => {
            setIsBadgeModalOpen(false);
            setTeacherForBadge(null);
          }}
          recipientId={teacherForBadge.id}
          recipientName={teacherForBadge.name}
          granterId={user?.id || 'admin'} 
        />
      )}
      
    </motion.div>
  );
}
