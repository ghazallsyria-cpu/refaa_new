/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  Plus, Search, Filter, Edit, Trash2, X, Key, BookOpen, AlertCircle, 
  Users, GraduationCap, Briefcase, Save, Folder, ChevronLeft, School, Layers, Zap, Award, Crown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUsersSystem } from '@/hooks/useUsersSystem';
import { useTeacherAssignmentsSystem } from '@/hooks/useTeacherAssignmentsSystem';
import { useAuth } from '@/context/auth-context';
import GrantBadgeModal from '@/components/GrantBadgeModal';

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

export default function TeachersPage() {
  const { user } = useAuth(); 
  const {
    teachers, sections, subjects, loading: usersLoading,
    fetchTeachers, fetchSections, fetchSubjects, addTeacher, updateTeacher, deleteUser, resetPassword
  } = useUsersSystem();

  const {
    loading: assignmentsLoading, fetchTeacherAssignments, saveAssignments: assignTeacherToSections, deleteAssignment: removeTeacherAssignment,
  } = useTeacherAssignmentsSystem();

  const isDataLoading = usersLoading || assignmentsLoading;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('الكل');
  const [stageFilter, setStageFilter] = useState<'all' | 'middle' | 'high' | 'both' | 'unassigned'>('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [teacherForBadge, setTeacherForBadge] = useState<{id: string, name: string} | null>(null);

  const [addForm, setAddForm] = useState({ full_name: '', national_id: '', email: '', phone: '', specialization: '', zoom_link: '' });
  
  // 🚀 تم إضافة حقول المناصب لنموذج التعديل
  const [editForm, setEditForm] = useState({
    full_name: '', national_id: '', email: '', phone: '', specialization: '', zoom_link: '',
    custom_titles: '', isHOD: false, hod_subject_id: '', hod_stage: 'الكل'
  });

  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [resetPasswordForm, setResetPasswordForm] = useState({ userId: '', newPassword: '' });

  const handleResetPasswordClick = (teacher: any) => {
    setResetPasswordForm({ userId: teacher.id, newPassword: '' });
    setShowPasswordResetModal(true);
  };

  const handleResetPasswordSubmit = async () => {
    try {
      const result = await resetPassword(resetPasswordForm.userId, resetPasswordForm.newPassword);
      showNotification('success', `تم تغيير كلمة المرور بنجاح. كلمة المرور الجديدة: ${result.newPassword}`);
      setShowPasswordResetModal(false);
    } catch (error: any) {
      showNotification('error', error.message || 'حدث خطأ أثناء تغيير كلمة المرور');
    }
  };

  const [submitting, setSubmitting] = useState(false);

  const handleAddSubmit = async () => {
    if (submitting) return;
    if (!addForm.full_name || !addForm.national_id) { showNotification('error', 'يرجى تعبئة الحقول الإلزامية'); return; }
    try {
      setSubmitting(true);
      const result = await addTeacher(addForm);
      showNotification('success', `تم إضافة المعلم بنجاح (كلمة المرور: ${result.password})`);
      setShowAddModal(false);
      setAddForm({ full_name: '', national_id: '', email: '', phone: '', specialization: '', zoom_link: '' });
    } catch (error: any) { showNotification('error', error.message || 'حدث خطأ'); } 
    finally { setSubmitting(false); }
  };

  const handleEditClick = (teacher: any) => {
    setEditingTeacher(teacher);
    const isHod = teacher.department_heads && teacher.department_heads.length > 0;
    const hodData = isHod ? teacher.department_heads[0] : null;

    setEditForm({
      full_name: teacher.users?.full_name || '',
      national_id: teacher.national_id || '',
      email: teacher.users?.email || '',
      phone: teacher.users?.phone || '',
      specialization: teacher.specialization || '',
      zoom_link: teacher.zoom_link || '',
      custom_titles: (teacher.custom_titles || []).join('، '), // تحويل المصفوفة لنص لسهولة التعديل
      isHOD: isHod,
      hod_subject_id: hodData?.subject_id || '',
      hod_stage: hodData?.stage_name || 'الكل'
    });
    setShowEditModal(true);
  };

  const handleGrantBadgeClick = (teacher: any) => {
    setTeacherForBadge({ id: teacher.id, name: teacher.users?.full_name || 'معلم غير معروف' });
    setIsBadgeModalOpen(true);
  };

  const [submittingEdit, setSubmittingEdit] = useState(false);

  const handleEditSubmit = async () => {
    if (submittingEdit) return;
    try {
      setSubmittingEdit(true);
      
      const payload = {
        full_name: editForm.full_name, national_id: editForm.national_id, email: editForm.email,
        phone: editForm.phone, specialization: editForm.specialization, zoom_link: editForm.zoom_link,
        custom_titles: editForm.custom_titles.split('،').map((s: string) => s.trim()).filter(Boolean)
      };

      const hodData = {
        isHead: editForm.isHOD,
        subject_id: editForm.hod_subject_id,
        stage_name: editForm.hod_stage
      };

      await updateTeacher(editingTeacher.id, editingTeacher.national_id, payload, hodData);
      showNotification('success', 'تم تحديث بيانات ومناصب المعلم بنجاح');
      setShowEditModal(false);
    } catch (error: any) {
      showNotification('error', error.message || 'حدث خطأ أثناء التحديث');
    } finally {
      setSubmittingEdit(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
    fetchSections();
    fetchSubjects();
  }, [fetchTeachers, fetchSections, fetchSubjects]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<string | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [teacherSections, setTeacherSections] = useState<any[]>([]);
  const [bulkAssignData, setBulkAssignData] = useState<{ section_ids: string[], subject_ids: string[] }>({ section_ids: [], subject_ids: [] });

  const handleAssignmentClick = async (teacher: any) => {
    setSelectedTeacher(teacher);
    setBulkAssignData({ section_ids: [], subject_ids: [] });
    try {
      const assignments = await fetchTeacherAssignments(teacher.id);
      setTeacherSections(assignments);
      setShowAssignmentModal(true);
    } catch (error: any) { showNotification('error', 'حدث خطأ أثناء جلب التعيينات'); }
  };

  const handleBulkAssign = async () => {
    if (bulkAssignData.section_ids.length === 0 || bulkAssignData.subject_ids.length === 0) {
      showNotification('error', 'يرجى اختيار فصل واحد ومادة واحدة على الأقل'); return;
    }
    const newAssignments: any[] = [];
    bulkAssignData.section_ids.forEach(sid => {
      bulkAssignData.subject_ids.forEach(subid => {
        newAssignments.push({ teacher_id: selectedTeacher.id, section_id: sid, subject_id: subid });
      });
    });
    try {
      await assignTeacherToSections(newAssignments);
      const refreshed = await fetchTeacherAssignments(selectedTeacher.id);
      setTeacherSections(refreshed);
      setBulkAssignData({ section_ids: [], subject_ids: [] });
      showNotification('success', 'تم التعيين بنجاح');
      fetchTeachers(); 
    } catch (error: any) { showNotification('error', 'فشل التعيين'); }
  };

  const toggleBulkSection = (id: string) => { setBulkAssignData(prev => ({ ...prev, section_ids: prev.section_ids.includes(id) ? prev.section_ids.filter(sid => sid !== id) : [...prev.section_ids, id] })); };
  const toggleBulkSubject = (id: string) => { setBulkAssignData(prev => ({ ...prev, subject_ids: prev.subject_ids.includes(id) ? prev.subject_ids.filter(sid => sid !== id) : [...prev.subject_ids, id] })); };

  const toggleAssignment = async (sectionId: string, subjectId: string) => {
    const existing = teacherSections.find(ts => ts.section_id === sectionId && ts.subject_id === subjectId);
    try {
      if (existing) {
        await removeTeacherAssignment(selectedTeacher.id, sectionId, subjectId);
        setTeacherSections(teacherSections.filter(ts => !(ts.section_id === sectionId && ts.subject_id === subjectId)));
        showNotification('success', 'تم إزالة التعيين');
      } else {
        await assignTeacherToSections([{ teacher_id: selectedTeacher.id, section_id: sectionId, subject_id: subjectId }]);
        const refreshed = await fetchTeacherAssignments(selectedTeacher.id);
        setTeacherSections(refreshed);
        showNotification('success', 'تم الإضافة');
      }
      fetchTeachers();
    } catch (error: any) { showNotification('error', 'حدث خطأ'); }
  };

  const handleDeleteClick = (id: string) => { setTeacherToDelete(id); setShowDeleteModal(true); };
  const confirmDelete = async () => {
    if (!teacherToDelete) return;
    try {
      await deleteUser(teacherToDelete);
      showNotification('success', 'تم الحذف');
      setShowDeleteModal(false);
      setTeacherToDelete(null);
    } catch (error: any) { showNotification('error', error.message || 'حدث خطأ'); }
  };

  const defaultSpecializations = ['اللغة العربية', 'الرياضيات', 'العلوم', 'اللغة الإنجليزية', 'التربية الإسلامية', 'الدراسات الاجتماعية', 'الحاسوب', 'التربية الفنية', 'التربية البدنية', 'الموسيقى'];
  const specializations = Array.from(new Set(['الكل', ...defaultSpecializations, ...teachers.map(t => t.specialization).filter(Boolean)])) as string[];

  const filteredTeachers = useMemo(() => {
    return teachers.filter(teacher => {
      const stageInfo = getTeacherStageInfo(teacher);
      const matchStage = stageFilter === 'all' || stageInfo.type === stageFilter;
      const matchFolder = selectedFolder ? (teacher.specialization || 'غير محدد') === selectedFolder : (activeTab === 'الكل' || teacher.specialization === activeTab);
      const matchSearch = teacher.users?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || teacher.national_id?.includes(searchQuery);
      return matchStage && matchFolder && matchSearch;
    });
  }, [teachers, stageFilter, selectedFolder, activeTab, searchQuery]);

  const allSpecializations = Array.from(new Set(teachers.map(t => t.specialization || 'غير محدد'))).sort();

  return (
    <div className="space-y-10 relative pb-20 font-cairo" dir="rtl">
      
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }} className={`fixed top-8 left-1/2 z-50 px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 border backdrop-blur-xl ${notification.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400/50' : 'bg-red-500/90 text-white border-red-400/50'}`}>
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">{notification.type === 'success' ? '✓' : '!'}</div>
            <div className="font-black text-sm uppercase tracking-widest">{notification.message}</div>
            <button onClick={() => setNotification(null)} className="ml-2 hover:scale-110 transition-transform"><X className="h-5 w-5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-2">
          <div className="flex items-center gap-4 mb-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm">
              <Briefcase className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">الموارد البشرية</span>
            </div>
            {selectedFolder && (
              <motion.button initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} onClick={() => setSelectedFolder(null)} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-all text-[10px] font-black uppercase tracking-[0.2em]">
                <ChevronLeft className="h-3 w-3" /> العودة للأقسام
              </motion.button>
            )}
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">{selectedFolder ? `قسم ${selectedFolder}` : 'إدارة المعلمين'}</h1>
          <p className="text-base sm:text-lg font-bold text-slate-400 max-w-lg">{selectedFolder ? `عرض جميع المعلمين المنتمين لقسم ${selectedFolder}.` : 'تنظيم الهيئة التدريسية وتحديد المناصب الإدارية ورؤساء الأقسام.'}</p>
        </motion.div>
        <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowAddModal(true)} className="inline-flex items-center justify-center rounded-[2rem] bg-indigo-600 px-8 py-4 sm:py-5 text-sm font-black text-white shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all group">
          <Plus className="h-6 w-6 ml-3 group-hover:rotate-90 transition-transform duration-500" /> إضافة معلم جديد
        </motion.button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/80 backdrop-blur-xl p-4 sm:p-6 lg:p-8 rounded-[2.5rem] shadow-sm border border-slate-200 sticky top-24 z-30 space-y-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[ { id: 'all', label: 'جميع المراحل', icon: Users }, { id: 'middle', label: 'المتوسطة', icon: School }, { id: 'high', label: 'الثانوية', icon: GraduationCap }, { id: 'both', label: 'مشترك', icon: Layers }, { id: 'unassigned', label: 'غير معين', icon: AlertCircle } ].map((stage) => (
            <button key={stage.id} onClick={() => setStageFilter(stage.id as any)} className={`px-5 py-3 rounded-2xl font-black text-sm shrink-0 transition-all flex items-center gap-2 border ${stageFilter === stage.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'}`}>
              <stage.icon className={`h-4 w-4 ${stageFilter === stage.id ? 'text-indigo-200' : 'text-slate-400'}`} /> {stage.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col xl:flex-row gap-6 items-center justify-between">
          <div className="relative w-full xl:max-w-xl group">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-6"><Search className="h-6 w-6 text-slate-300 group-focus-within:text-indigo-500 transition-colors" /></div>
            <input type="text" className="block w-full rounded-2xl border-0 py-4 pr-14 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all shadow-inner font-bold" placeholder="البحث بالاسم، التخصص، أو الرقم المدني..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 xl:pb-0 w-full xl:w-auto no-scrollbar mask-fade-edges">
            {specializations.map((spec, idx) => (
              <motion.button key={spec} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + (idx * 0.05) }} onClick={() => setActiveTab(spec)} className={`px-6 py-3 rounded-2xl text-xs font-black whitespace-nowrap transition-all uppercase tracking-widest border ${activeTab === spec ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 border-indigo-600 scale-105' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{spec}</motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {!selectedFolder ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {allSpecializations.map((spec, idx) => {
            const count = filteredTeachers.filter(t => (t.specialization || 'غير محدد') === spec).length;
            return (
              <motion.div key={spec} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} whileHover={{ y: -5, scale: 1.02 }} onClick={() => setSelectedFolder(spec)} className="bg-white p-8 rounded-[2.5rem] cursor-pointer group hover:shadow-2xl hover:shadow-indigo-100 transition-all border-2 border-slate-100 hover:border-indigo-100">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="h-20 w-20 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-inner border border-indigo-100"><Folder className="h-10 w-10" /></div>
                  <div className="space-y-1"><h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{spec}</h3><p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{count} معلم</p></div>
                  <div className="pt-4 w-full"><div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: count > 0 ? '100%' : '0%' }} className="h-full bg-indigo-500" /></div></div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 overflow-hidden rounded-[3rem] shadow-sm">
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/80">
                <tr>
                  <th scope="col" className="py-6 pr-10 pl-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">المعلم</th>
                  <th scope="col" className="px-4 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">المناصب والمسميات</th>
                  <th scope="col" className="px-4 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">المرحلة</th>
                  <th scope="col" className="px-4 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">التخصص</th>
                  <th scope="col" className="relative py-6 pl-10 pr-4"><span className="sr-only">إجراءات</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white">
                {isDataLoading ? (
                  <tr><td colSpan={5} className="py-32 text-center"><div className="flex flex-col items-center gap-4"><div className="relative h-12 w-12"><div className="absolute inset-0 rounded-full border-4 border-indigo-50"></div><div className="absolute inset-0 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div></div><span className="text-sm font-bold text-slate-400 uppercase tracking-widest">جاري تحميل البيانات...</span></div></td></tr>
                ) : filteredTeachers.length === 0 ? (
                  <tr><td colSpan={5} className="py-32 text-center"><div className="flex flex-col items-center gap-6"><div className="h-24 w-24 rounded-[2rem] bg-slate-50 flex items-center justify-center border border-slate-100"><Search className="h-10 w-10 text-slate-300" /></div><div className="space-y-1"><p className="text-xl font-black text-slate-900">لا يوجد نتائج</p><p className="text-sm font-bold text-slate-500">لم نجد أي معلم يطابق المعايير</p></div></div></td></tr>
                ) : (
                  filteredTeachers.map((teacher: any, idx) => {
                    const stageInfo = getTeacherStageInfo(teacher);
                    const isHOD = teacher.department_heads && teacher.department_heads.length > 0;
                    const customTitles = teacher.custom_titles || [];

                    return (
                    <motion.tr key={teacher.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className={`hover:bg-slate-50/80 transition-all group cursor-pointer ${isHOD ? 'bg-amber-50/30' : ''}`}>
                      <td className="whitespace-nowrap py-6 pr-10 pl-4">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-sm border shadow-sm group-hover:scale-110 transition-transform ${isHOD ? 'bg-gradient-to-br from-amber-100 to-yellow-50 text-amber-600 border-amber-200' : 'bg-gradient-to-br from-indigo-50 to-white text-indigo-600 border-indigo-100'}`}>
                              {teacher.users?.full_name?.charAt(0) || 'م'}
                            </div>
                            {isHOD && <Crown className="absolute -top-3 -right-2 h-5 w-5 text-yellow-500 drop-shadow-sm" />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{teacher.users?.full_name || 'غير محدد'}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 truncate">{teacher.national_id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-6 text-center">
                        <div className="flex flex-wrap justify-center gap-1.5 max-w-[200px]">
                          {isHOD && <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-lg border border-amber-200 shadow-sm flex items-center gap-1"><Crown size={12}/> رئيس قسم</span>}
                          {customTitles.map((title: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-lg border border-indigo-100">{title}</span>
                          ))}
                          {!isHOD && customTitles.length === 0 && <span className="text-xs text-slate-300">-</span>}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-6 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm bg-${stageInfo.color}-50 text-${stageInfo.color}-700 border-${stageInfo.color}-200`}><stageInfo.icon className="h-3.5 w-3.5" />{stageInfo.label}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-6 text-right">
                        <span className="text-xs font-black text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">{teacher.specialization || 'غير محدد'}</span>
                      </td>
                      <td className="relative whitespace-nowrap py-6 pl-10 pr-4 text-left">
                        <div className="flex items-center justify-end gap-2 transition-all opacity-0 group-hover:opacity-100">
                          <button onClick={(e) => { e.stopPropagation(); handleGrantBadgeClick(teacher); }} className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all shadow-sm bg-white border border-slate-200" title="منح وسام"><Award className="h-4 w-4" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleAssignmentClick(teacher); }} className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all shadow-sm bg-white border border-slate-200" title="تعيين الفصول والمواد"><BookOpen className="h-4 w-4" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleResetPasswordClick(teacher); }} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm bg-white border border-slate-200" title="إعادة تعيين كلمة المرور"><Key className="h-4 w-4" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleEditClick(teacher); }} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm bg-white border border-slate-200" title="تعديل"><Edit className="h-4 w-4" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(teacher.id); }} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm bg-white border border-slate-200" title="حذف"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden p-4 sm:p-6 grid gap-4 sm:gap-6 bg-slate-50/50">
            {isDataLoading ? (
              <div className="py-20 text-center"><div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><span className="text-sm font-bold text-slate-400">جاري التحميل...</span></div>
            ) : filteredTeachers.length === 0 ? (
              <div className="py-20 text-center text-sm font-bold text-slate-400">لا يوجد نتائج</div>
            ) : (
              filteredTeachers.map((teacher: any, idx) => {
                const stageInfo = getTeacherStageInfo(teacher);
                const isHOD = teacher.department_heads && teacher.department_heads.length > 0;
                
                return (
                <motion.div key={teacher.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }} className="p-6 rounded-[2rem] bg-white border border-slate-200 space-y-6 relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 ${isHOD ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>{teacher.users?.full_name?.charAt(0) || 'م'}</div>
                        {isHOD && <Crown className="absolute -top-2 -right-2 h-6 w-6 text-yellow-500 drop-shadow-sm" />}
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">{teacher.users?.full_name || 'غير محدد'}</h3>
                        <p className="text-[10px] sm:text-xs font-bold text-slate-500 mt-1 font-mono">{teacher.national_id}</p>
                      </div>
                    </div>
                    <div className={`p-2 rounded-xl bg-${stageInfo.color}-50 text-${stageInfo.color}-600 border border-${stageInfo.color}-200 shadow-sm shrink-0`} title={stageInfo.label}><stageInfo.icon className="h-5 w-5" /></div>
                  </div>
                  <div className="flex gap-2 relative z-10 pt-4 border-t border-slate-100">
                    <button onClick={() => handleEditClick(teacher)} className="flex-1 py-3 bg-indigo-50 text-indigo-700 text-xs font-black rounded-xl border border-indigo-200 flex items-center justify-center gap-1.5"><Edit className="h-4 w-4" /> إدارة وتعديل</button>
                    <button onClick={() => handleAssignmentClick(teacher)} className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200"><BookOpen className="h-4 w-4" /></button>
                  </div>
                </motion.div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 🚀 نافذة تعديل بيانات المعلم (تمت إضافة قسم المناصب الإدارية) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowEditModal(false)}></div>
            <div className="relative transform overflow-hidden rounded-[2.5rem] bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-slate-100">
              <div className="bg-white px-6 sm:px-10 pb-8 pt-8 sm:pt-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><Edit className="h-6 w-6"/></div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">تعديل بيانات ومناصب المعلم</h3>
                      <p className="text-xs font-bold text-slate-500 mt-1">تحديث البيانات الشخصية والإدارية</p>
                    </div>
                  </div>
                  <button onClick={() => setShowEditModal(false)} className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-all"><X className="h-6 w-6" /></button>
                </div>
                
                <form className="space-y-8">
                  {/* القسم الأول: البيانات الشخصية */}
                  <div>
                    <h4 className="text-sm font-black text-indigo-900 mb-4 flex items-center gap-2"><Users className="w-4 h-4"/> البيانات الشخصية والوظيفية</h4>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">الاسم الرباعي</label><input type="text" value={editForm.full_name} onChange={(e) => setEditForm({...editForm, full_name: e.target.value})} className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm font-bold outline-none" /></div>
                      <div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">الرقم المدني</label><input type="text" value={editForm.national_id} onChange={(e) => setEditForm({...editForm, national_id: e.target.value})} className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm font-bold outline-none" /></div>
                      <div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">البريد الإلكتروني</label><input type="email" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm font-bold outline-none text-left" dir="ltr" /></div>
                      <div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">رقم الهاتف</label><input type="text" value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm font-bold outline-none" /></div>
                      <div className="sm:col-span-2 space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">التخصص المرجعي</label>
                        <select value={editForm.specialization} onChange={(e) => setEditForm({...editForm, specialization: e.target.value})} className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm font-bold outline-none appearance-none cursor-pointer">
                          <option value="">اختر التخصص</option>
                          {specializations.filter(s => s !== 'الكل').map(spec => (<option key={spec} value={spec}>{spec}</option>))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 🚀 القسم الثاني: المناصب الإدارية (الجديد) */}
                  <div className="pt-6 border-t border-slate-100">
                    <h4 className="text-sm font-black text-amber-700 mb-4 flex items-center gap-2"><Crown className="w-4 h-4"/> المناصب الإدارية والإشرافية</h4>
                    <div className="space-y-5 bg-amber-50/30 p-5 rounded-3xl border border-amber-100/50">
                      
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-600 pl-2">مسميات ومهام إضافية (افصل بينها بفاصلة)</label>
                        <input type="text" placeholder="مثال: مشرف دور، منسق إذاعة، عضو كنترول" value={editForm.custom_titles} onChange={(e) => setEditForm({...editForm, custom_titles: e.target.value})} className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-white ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-amber-500 sm:text-sm font-bold outline-none" />
                      </div>

                      <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <input type="checkbox" id="isHOD" checked={editForm.isHOD} onChange={(e) => setEditForm({...editForm, isHOD: e.target.checked})} className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500 border-slate-300" />
<label htmlFor="isHOD" className="text-sm font-black text-slate-800 cursor-pointer select-none">تعيين هذا المعلم كرئيس قسم</label>                      </div>

                      {editForm.isHOD && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                          <div className="space-y-2">
                            <label className="text-xs font-black text-amber-800 pl-2">رئيس لأي مادة؟ <span className="text-red-500">*</span></label>
                            <select value={editForm.hod_subject_id} onChange={(e) => setEditForm({...editForm, hod_subject_id: e.target.value})} className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-white ring-1 ring-inset ring-amber-200 focus:ring-2 focus:ring-amber-500 sm:text-sm font-bold outline-none cursor-pointer">
                              <option value="">-- اختر المادة --</option>
                              {subjects.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-black text-amber-800 pl-2">المرحلة المسؤولة</label>
                            <select value={editForm.hod_stage} onChange={(e) => setEditForm({...editForm, hod_stage: e.target.value})} className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-white ring-1 ring-inset ring-amber-200 focus:ring-2 focus:ring-amber-500 sm:text-sm font-bold outline-none cursor-pointer">
                              <option value="الكل">جميع المراحل (الكل)</option>
                              <option value="متوسط">المرحلة المتوسطة فقط</option>
                              <option value="ثانوي">المرحلة الثانوية فقط</option>
                            </select>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </form>
              </div>

              <div className="bg-slate-50/80 px-6 sm:px-10 py-6 border-t border-slate-100 flex flex-col sm:flex-row-reverse gap-3">
                <button type="button" disabled={submittingEdit} className={`inline-flex w-full justify-center items-center rounded-2xl px-8 py-4 text-sm font-black text-white shadow-lg transition-all active:scale-95 sm:w-auto ${submittingEdit ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700'}`} onClick={handleEditSubmit}>
                  {submittingEdit ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'حفظ التعديلات والمناصب'}
                </button>
                <button type="button" className="inline-flex w-full justify-center items-center rounded-2xl bg-white px-8 py-4 text-sm font-black text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 sm:w-auto transition-all" onClick={() => setShowEditModal(false)}>إلغاء الأمر</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddModal && ( /* كود مودال الإضافة بقي كما هو لتقليل التكرار في هذه الرسالة... */ <div></div> )}
      {showDeleteModal && ( /* كود مودال الحذف... */ <div></div> )}
      {showAssignmentModal && ( /* كود تعيين الفصول... */ <div></div> )}
      {showPasswordResetModal && ( /* كود الباسورد... */ <div></div> )}

      {teacherForBadge && (
        <GrantBadgeModal isOpen={isBadgeModalOpen} onClose={() => { setIsBadgeModalOpen(false); setTeacherForBadge(null); }} recipientId={teacherForBadge.id} recipientName={teacherForBadge.name} granterId={user?.id || 'admin'} />
      )}

    </div>
  );
}
