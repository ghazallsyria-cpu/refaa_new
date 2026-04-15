/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  Plus, Search, Edit, Trash2, X, Key, BookOpen, AlertCircle, 
  Users, GraduationCap, Briefcase, Folder, ChevronLeft, School, Layers, Award, Crown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUsersSystem } from '@/hooks/useUsersSystem';
import { useTeacherAssignmentsSystem } from '@/hooks/useTeacherAssignmentsSystem';
import { useAuth } from '@/context/auth-context';
import GrantBadgeModal from '@/components/GrantBadgeModal';
import { DEPARTMENT_MAPPINGS, getParentDepartment } from '@/hooks/useHierarchySystem';

// خوارزمية تحديد المرحلة (متوسط - ثانوي - مشترك)
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
  const [stageFilter, setStageFilter] = useState<'all' | 'middle' | 'high' | 'both' | 'unassigned'>('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [teacherForBadge, setTeacherForBadge] = useState<{id: string, name: string} | null>(null);

  const [addForm, setAddForm] = useState({ full_name: '', national_id: '', email: '', phone: '', specialization: '', zoom_link: '' });
  
  const [editForm, setEditForm] = useState({
    full_name: '', national_id: '', email: '', phone: '', specialization: '', zoom_link: '',
    custom_titles: '', isHOD: false, hod_subject_id: '', hod_stage: 'الكل'
  });

  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [resetPasswordForm, setResetPasswordForm] = useState({ userId: '', newPassword: '' });
  const handleResetPasswordClick = (teacher: any) => { setResetPasswordForm({ userId: teacher.id, newPassword: '' }); setShowPasswordResetModal(true); };
  const handleResetPasswordSubmit = async () => { try { const result = await resetPassword(resetPasswordForm.userId, resetPasswordForm.newPassword); showNotification('success', `كلمة المرور الجديدة: ${result.newPassword}`); setShowPasswordResetModal(false); } catch (error: any) { showNotification('error', error.message); } };

  const [submitting, setSubmitting] = useState(false);
  const handleAddSubmit = async () => { if (submitting) return; if (!addForm.full_name || !addForm.national_id) { showNotification('error', 'يرجى تعبئة الحقول الإلزامية'); return; } try { setSubmitting(true); const result = await addTeacher(addForm); showNotification('success', `تم إضافة المعلم (كلمة المرور: ${result.password})`); setShowAddModal(false); setAddForm({ full_name: '', national_id: '', email: '', phone: '', specialization: '', zoom_link: '' }); } catch (error: any) { showNotification('error', error.message); } finally { setSubmitting(false); } };

  const handleEditClick = (teacher: any) => {
    setEditingTeacher(teacher);
    const isHod = teacher.department_heads && teacher.department_heads.length > 0;
    const hodData = isHod ? teacher.department_heads[0] : null;
    setEditForm({ full_name: teacher.users?.full_name || '', national_id: teacher.national_id || '', email: teacher.users?.email || '', phone: teacher.users?.phone || '', specialization: teacher.specialization || '', zoom_link: teacher.zoom_link || '', custom_titles: (teacher.custom_titles || []).join('، '), isHOD: isHod, hod_subject_id: hodData?.subject_id || '', hod_stage: hodData?.stage_name || 'الكل' });
    setShowEditModal(true);
  };

  const handleGrantBadgeClick = (teacher: any) => { setTeacherForBadge({ id: teacher.id, name: teacher.users?.full_name || 'معلم غير معروف' }); setIsBadgeModalOpen(true); };

  const [submittingEdit, setSubmittingEdit] = useState(false);
  const handleEditSubmit = async () => {
    if (submittingEdit) return;
    try {
      setSubmittingEdit(true);
      const payload = { full_name: editForm.full_name, national_id: editForm.national_id, email: editForm.email, phone: editForm.phone, specialization: editForm.specialization, zoom_link: editForm.zoom_link, custom_titles: editForm.custom_titles.split('،').map((s: string) => s.trim()).filter(Boolean) };
      const hodData = { isHead: editForm.isHOD, subject_id: editForm.hod_subject_id, stage_name: editForm.hod_stage };
      await updateTeacher(editingTeacher.id, editingTeacher.national_id, payload, hodData);
      showNotification('success', 'تم التحديث بنجاح');
      setShowEditModal(false);
    } catch (error: any) { showNotification('error', error.message); } finally { setSubmittingEdit(false); }
  };

  useEffect(() => { fetchTeachers(); fetchSections(); fetchSubjects(); }, [fetchTeachers, fetchSections, fetchSubjects]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<string | null>(null);
  const handleDeleteClick = (id: string) => { setTeacherToDelete(id); setShowDeleteModal(true); };
  const confirmDelete = async () => { if (!teacherToDelete) return; try { await deleteUser(teacherToDelete); showNotification('success', 'تم الحذف'); setShowDeleteModal(false); setTeacherToDelete(null); } catch (error: any) { showNotification('error', error.message); } };

  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [teacherSections, setTeacherSections] = useState<any[]>([]);
  const handleAssignmentClick = async (teacher: any) => { setSelectedTeacher(teacher); try { const assignments = await fetchTeacherAssignments(teacher.id); setTeacherSections(assignments); setShowAssignmentModal(true); } catch (e) {} };

  const defaultSpecializations = ['اللغة العربية', 'الرياضيات', 'العلوم', 'اللغة الإنجليزية', 'التربية الإسلامية', 'الدراسات الاجتماعية', 'الحاسوب', 'التربية الفنية', 'التربية البدنية', 'الموسيقى'];
  const allSpecializationsList = Array.from(new Set([...defaultSpecializations, ...teachers.map((t: any) => t.specialization).filter(Boolean)]));

  const filteredTeachers = useMemo(() => {
    return teachers.filter((teacher: any) => {
      const stageInfo = getTeacherStageInfo(teacher);
      const matchStage = stageFilter === 'all' || stageInfo.type === stageFilter;
      const parentDept = getParentDepartment(teacher.specialization || '');
      const matchDepartment = selectedDepartment ? parentDept === selectedDepartment : true;
      const matchSearch = teacher.users?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || teacher.national_id?.includes(searchQuery);
      return matchStage && matchDepartment && matchSearch;
    });
  }, [teachers, stageFilter, selectedDepartment, searchQuery]);

  const availableDepartments = Array.from(new Set(teachers.map((t: any) => getParentDepartment(t.specialization || '')))).sort();

  // 🚀 إخبار TypeScript أن t هو any لتخطي فحص الأنواع الصارم
  const departmentHeads = filteredTeachers.filter((t: any) => t.department_heads && t.department_heads.length > 0);
  const departmentMembers = filteredTeachers.filter((t: any) => !t.department_heads || t.department_heads.length === 0);

  const groupedMembers = departmentMembers.reduce((acc, teacher: any) => {
    const spec = teacher.specialization || 'عام';
    if (!acc[spec]) acc[spec] = [];
    acc[spec].push(teacher);
    return acc;
  }, {} as Record<string, any[]>);

  const TeacherCard = ({ teacher, isHOD = false }: any) => {
    const stageInfo = getTeacherStageInfo(teacher);
    const customTitles = teacher.custom_titles || [];
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`p-6 rounded-[2rem] bg-white border ${isHOD ? 'border-amber-200 shadow-lg shadow-amber-100/50' : 'border-slate-200 shadow-sm'} relative overflow-hidden group hover:-translate-y-1 transition-all`}>
        <div className="flex justify-between items-start relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 ${isHOD ? 'bg-gradient-to-br from-amber-100 to-amber-50 text-amber-600 border border-amber-200' : 'bg-gradient-to-br from-indigo-50 to-white text-indigo-600 border border-indigo-100'}`}>
                {teacher.users?.full_name?.charAt(0) || 'م'}
              </div>
              {isHOD && <Crown className="absolute -top-2 -right-2 h-6 w-6 text-yellow-500 drop-shadow-sm" />}
            </div>
            <div>
              <h3 className={`text-base sm:text-lg font-black leading-tight ${isHOD ? 'text-amber-900' : 'text-slate-900'}`}>{teacher.users?.full_name || 'غير محدد'}</h3>
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 mt-1 font-mono">{teacher.national_id}</p>
            </div>
          </div>
          <div className={`px-3 py-1.5 rounded-xl bg-${stageInfo.color}-50 text-${stageInfo.color}-600 border border-${stageInfo.color}-200 shadow-sm shrink-0 flex items-center gap-1.5`} title={stageInfo.label}>
            <stageInfo.icon className="h-3.5 w-3.5" /><span className="text-[10px] font-black">{stageInfo.label}</span>
          </div>
        </div>
        
        <div className="mt-4 flex flex-wrap gap-2 relative z-10">
          {isHOD && <span className="px-2.5 py-1 bg-amber-500 text-white text-[10px] font-black rounded-lg shadow-sm">رئيس قسم {teacher.department_heads[0]?.subject?.name || 'مادة'}</span>}
          {customTitles.map((title: string, i: number) => (
            <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200">{title}</span>
          ))}
        </div>

        <div className="flex gap-2 relative z-10 pt-5 mt-4 border-t border-slate-100">
          <button onClick={() => handleEditClick(teacher)} className="flex-1 py-2.5 bg-indigo-50 text-indigo-700 text-xs font-black rounded-xl border border-indigo-200 flex items-center justify-center gap-1.5 hover:bg-indigo-600 hover:text-white transition-colors"><Edit className="h-4 w-4" /> إدارة وتعديل</button>
          <button onClick={() => handleAssignmentClick(teacher)} className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-colors" title="تعيين الفصول"><BookOpen className="h-4 w-4" /></button>
          <button onClick={() => handleGrantBadgeClick(teacher)} className="p-2.5 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 hover:bg-amber-500 hover:text-white transition-colors" title="منح وسام"><Award className="h-4 w-4" /></button>
          <button onClick={() => handleDeleteClick(teacher.id)} className="p-2.5 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 hover:bg-rose-600 hover:text-white transition-colors" title="حذف النهائي"><Trash2 className="h-4 w-4" /></button>
        </div>
      </motion.div>
    );
  };

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
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">إدارة الموارد البشرية</span>
            </div>
            {selectedDepartment && (
              <motion.button initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} onClick={() => setSelectedDepartment(null)} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-all text-[10px] font-black uppercase tracking-[0.2em]">
                <ChevronLeft className="h-3 w-3" /> العودة للأقسام
              </motion.button>
            )}
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            {selectedDepartment ? `قسم ${selectedDepartment}` : 'الهيئة التدريسية والأقسام'}
          </h1>
          <p className="text-base sm:text-lg font-bold text-slate-400 max-w-lg">
            {selectedDepartment ? `إدارة رؤساء وأعضاء قسم ${selectedDepartment}.` : 'تنظيم المعلمين في أقسامهم، وتحديد المهام ورؤساء الأقسام.'}
          </p>
        </motion.div>
        
        <div className="flex gap-3">
          <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowAddModal(true)} className="inline-flex items-center justify-center rounded-[2rem] bg-indigo-600 px-8 py-4 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all group">
            <Plus className="h-5 w-5 ml-2 group-hover:rotate-90 transition-transform duration-500" /> إضافة معلم
          </motion.button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/80 backdrop-blur-xl p-4 sm:p-6 lg:p-8 rounded-[2.5rem] shadow-sm border border-slate-200 sticky top-24 z-30 space-y-6">
        <div className="flex flex-col xl:flex-row gap-6 items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide w-full xl:w-auto">
            {[ { id: 'all', label: 'جميع المراحل', icon: Users }, { id: 'middle', label: 'المتوسطة', icon: School }, { id: 'high', label: 'الثانوية', icon: GraduationCap }, { id: 'both', label: 'مشترك', icon: Layers }].map((stage) => (
              <button key={stage.id} onClick={() => setStageFilter(stage.id as any)} className={`px-5 py-3 rounded-2xl font-black text-sm shrink-0 transition-all flex items-center gap-2 border ${stageFilter === stage.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                <stage.icon className={`h-4 w-4 ${stageFilter === stage.id ? 'text-indigo-200' : 'text-slate-400'}`} /> {stage.label}
              </button>
            ))}
          </div>
          <div className="relative w-full xl:max-w-md group">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-6"><Search className="h-6 w-6 text-slate-300 group-focus-within:text-indigo-500 transition-colors" /></div>
            <input type="text" className="block w-full rounded-2xl border-0 py-4 pr-14 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-all font-bold" placeholder="البحث السريع..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>
      </motion.div>

      {!selectedDepartment ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {availableDepartments.map((dept, idx) => {
            const count = teachers.filter((t: any) => getParentDepartment(t.specialization || '') === dept).length;
            const hodsCount = teachers.filter((t: any) => getParentDepartment(t.specialization || '') === dept && t.department_heads && t.department_heads.length > 0).length;
            
            return (
              <motion.div key={dept} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} whileHover={{ y: -5, scale: 1.02 }} onClick={() => setSelectedDepartment(dept)} className="bg-white p-8 rounded-[2.5rem] cursor-pointer group hover:shadow-2xl hover:shadow-indigo-100 transition-all border-2 border-slate-100 hover:border-indigo-200 relative overflow-hidden">
                <div className="absolute -left-6 -top-6 w-24 h-24 bg-indigo-50/50 rounded-full blur-2xl group-hover:bg-indigo-100 transition-colors"></div>
                <div className="flex flex-col items-center text-center space-y-5 relative z-10">
                  <div className="relative">
                    <div className="h-20 w-20 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-inner border border-indigo-100"><Folder className="h-10 w-10" /></div>
                    {hodsCount > 0 && <div className="absolute -bottom-2 -right-2 bg-amber-100 text-amber-600 border border-amber-200 rounded-full p-1.5 shadow-sm"><Crown className="w-4 h-4"/></div>}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{dept}</h3>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{count} عضو</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-12">
          {departmentHeads.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b-2 border-amber-100 pb-4">
                <Crown className="w-8 h-8 text-amber-500" />
                <h2 className="text-2xl font-black text-slate-900">قيادة القسم</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {departmentHeads.map((hod: any) => <TeacherCard key={hod.id} teacher={hod} isHOD={true} />)}
              </div>
            </div>
          )}

          <div className="space-y-8">
            <div className="flex items-center gap-3 border-b-2 border-slate-100 pb-4">
              <Users className="w-7 h-7 text-indigo-500" />
              <h2 className="text-2xl font-black text-slate-900">أعضاء القسم</h2>
            </div>
            
            {Object.keys(groupedMembers).length === 0 ? (
              <div className="py-20 text-center text-sm font-bold text-slate-400 bg-white rounded-[2rem] border border-dashed border-slate-200">لا يوجد أعضاء في هذا القسم</div>
            ) : (
              Object.entries(groupedMembers).map(([spec, specTeachers]) => (
                <div key={spec} className="bg-slate-50/50 p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 space-y-6">
                  <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    <h3 className="font-black text-slate-800 text-sm">تخصص: {spec}</h3>
                    <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-md font-bold ml-2">{specTeachers.length}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {specTeachers.map((teacher: any) => <TeacherCard key={teacher.id} teacher={teacher} isHOD={false} />)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

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
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">إدارة ملف المعلم والمناصب</h3>
                    </div>
                  </div>
                  <button onClick={() => setShowEditModal(false)} className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-all"><X className="h-6 w-6" /></button>
                </div>
                
                <form className="space-y-8">
                  <div>
                    <h4 className="text-sm font-black text-indigo-900 mb-4 flex items-center gap-2"><Users className="w-4 h-4"/> البيانات الشخصية والوظيفية</h4>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">الاسم الرباعي</label><input type="text" value={editForm.full_name} onChange={(e) => setEditForm({...editForm, full_name: e.target.value})} className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm font-bold outline-none" /></div>
                      <div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">الرقم المدني</label><input type="text" value={editForm.national_id} onChange={(e) => setEditForm({...editForm, national_id: e.target.value})} className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm font-bold outline-none" /></div>
                      <div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">البريد</label><input type="email" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm font-bold outline-none text-left" dir="ltr" /></div>
                      <div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">الهاتف</label><input type="text" value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm font-bold outline-none" /></div>
                      <div className="sm:col-span-2 space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">التخصص المرجعي</label>
                        <select value={editForm.specialization} onChange={(e) => setEditForm({...editForm, specialization: e.target.value})} className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm font-bold outline-none appearance-none cursor-pointer">
                          <option value="">اختر التخصص</option>
                          {allSpecializationsList.map(spec => (<option key={spec} value={spec}>{spec}</option>))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                    <h4 className="text-sm font-black text-amber-700 mb-4 flex items-center gap-2"><Crown className="w-4 h-4"/> المناصب الإدارية والإشرافية</h4>
                    <div className="space-y-5 bg-amber-50/30 p-5 rounded-3xl border border-amber-100/50">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-600 pl-2">مسميات ومهام إضافية (افصل بفاصلة ،)</label>
                        <input type="text" placeholder="مثال: مشرف دور، منسق إذاعة" value={editForm.custom_titles} onChange={(e) => setEditForm({...editForm, custom_titles: e.target.value})} className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-white ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-amber-500 sm:text-sm font-bold outline-none" />
                      </div>
                      <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <input type="checkbox" id="isHOD" checked={editForm.isHOD} onChange={(e) => setEditForm({...editForm, isHOD: e.target.checked})} className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500 border-slate-300" />
                        <label htmlFor="isHOD" className="text-sm font-black text-slate-800 cursor-pointer select-none">تعيين كـ "رئيس قسم"</label>
                      </div>
                      {editForm.isHOD && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                          <div className="space-y-2">
                            <label className="text-xs font-black text-amber-800 pl-2">القسم المسؤول عنه <span className="text-red-500">*</span></label>
                            <select value={editForm.hod_subject_id} onChange={(e) => setEditForm({...editForm, hod_subject_id: e.target.value})} className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-white ring-1 ring-inset ring-amber-200 focus:ring-2 focus:ring-amber-500 sm:text-sm font-bold outline-none cursor-pointer">
                              <option value="">-- اختر القسم/المادة --</option>
                              {subjects.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-black text-amber-800 pl-2">المرحلة الموكلة</label>
                            <select value={editForm.hod_stage} onChange={(e) => setEditForm({...editForm, hod_stage: e.target.value})} className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-white ring-1 ring-inset ring-amber-200 focus:ring-2 focus:ring-amber-500 sm:text-sm font-bold outline-none cursor-pointer">
                              <option value="الكل">الكل (متوسط وثانوي)</option>
                              <option value="متوسط">متوسط فقط</option>
                              <option value="ثانوي">ثانوي فقط</option>
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
                  {submittingEdit ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'حفظ التعديلات'}
                </button>
                <button type="button" className="inline-flex w-full justify-center items-center rounded-2xl bg-white px-8 py-4 text-sm font-black text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 sm:w-auto transition-all" onClick={() => setShowEditModal(false)}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                        <select value={addForm.specialization} onChange={(e) => setAddForm({...addForm, specialization: e.target.value})} className="w-full rounded-2xl border-0 py-3.5 px-4 bg-slate-50 ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold outline-none">
                           <option value="">اختر التخصص</option>
                           {allSpecializationsList.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                   </form>
                </div>
                <div className="bg-slate-50/80 px-6 py-6 flex flex-row-reverse gap-3">
                   <button onClick={handleAddSubmit} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black">إضافة</button>
                </div>
             </div>
          </div>
        </div>
      )}
      
      {showDeleteModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60"><div className="bg-white p-8 rounded-3xl text-center"><h3 className="text-xl font-black mb-4">تأكيد الحذف</h3><div className="flex gap-4"><button onClick={confirmDelete} className="bg-rose-600 text-white px-6 py-2 rounded-xl font-black">حذف</button><button onClick={() => setShowDeleteModal(false)} className="bg-slate-100 px-6 py-2 rounded-xl font-black">تراجع</button></div></div></div>
      )}

      {teacherForBadge && (
        <GrantBadgeModal isOpen={isBadgeModalOpen} onClose={() => { setIsBadgeModalOpen(false); setTeacherForBadge(null); }} recipientId={teacherForBadge.id} recipientName={teacherForBadge.name} granterId={user?.id || 'admin'} />
      )}
    </div>
  );
}
