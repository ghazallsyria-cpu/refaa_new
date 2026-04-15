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
    teachers, subjects, sections, loading: usersLoading,
    fetchTeachers, fetchSections, fetchSubjects, addTeacher, updateTeacher, deleteUser, resetPassword
  } = useUsersSystem();

  const {
    loading: assignmentsLoading, fetchTeacherAssignments, saveAssignments: assignTeacherToSections, deleteAssignment: removeTeacherAssignment
  } = useTeacherAssignmentsSystem();

  const isDataLoading = usersLoading || assignmentsLoading;
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<'all' | 'middle' | 'high' | 'both' | 'unassigned'>('all');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [teacherForBadge, setTeacherForBadge] = useState<{id: string, name: string} | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  const [addForm, setAddForm] = useState({ full_name: '', national_id: '', email: '', phone: '', specialization: '', zoom_link: '' });
  const [editForm, setEditForm] = useState({
    full_name: '', national_id: '', email: '', phone: '', specialization: '', zoom_link: '',
    custom_titles: '', isHOD: false, hod_subject_id: '', hod_stage: 'الكل'
  });

  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
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
      // @ts-ignore
      showNotification('success', `كلمة المرور الجديدة: ${result.newPassword}`); 
      setShowPasswordResetModal(false); 
    } catch (error: any) { 
      showNotification('error', error.message); 
    } 
  };

  const [submitting, setSubmitting] = useState(false);
  
  const handleAddSubmit = async () => { 
    if (submitting) return; 
    if (!addForm.full_name || !addForm.national_id) { showNotification('error', 'يرجى تعبئة الحقول الإلزامية'); return; } 
    try { 
      setSubmitting(true); 
      const result = await addTeacher(addForm); 
      // @ts-ignore
      showNotification('success', `تم إضافة المعلم (كلمة المرور: ${result.password})`); 
      setShowAddModal(false); 
      setAddForm({ full_name: '', national_id: '', email: '', phone: '', specialization: '', zoom_link: '' }); 
    } catch (error: any) { 
      let msg = error.message;
      if (msg?.includes('national_id_key')) msg = 'الرقم المدني مسجل مسبقاً!';
      showNotification('error', msg); 
    } finally { 
      setSubmitting(false); 
    } 
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
      custom_titles: (teacher.custom_titles || []).join('، '), 
      isHOD: isHod, 
      hod_subject_id: hodData?.subject_id || '', 
      hod_stage: hodData?.stage_name || 'الكل' 
    });
    setShowEditModal(true);
  };

  // 🚀 تم إضافة هذا السطر المفقود
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const handleEditSubmit = async () => {
    try {
      setSubmittingEdit(true);
      const payload: any = { 
        full_name: editForm.full_name, email: editForm.email, phone: editForm.phone, specialization: editForm.specialization, zoom_link: editForm.zoom_link, 
        custom_titles: editForm.custom_titles.split('،').map((s: string) => s.trim()).filter(Boolean)
      };
      if (editForm.national_id !== editingTeacher.national_id) payload.national_id = editForm.national_id;

      const hodData = { isHead: editForm.isHOD, subject_id: editForm.hod_subject_id, stage_name: editForm.hod_stage };
      await updateTeacher(editingTeacher.id, editingTeacher.national_id, payload, hodData);
      showNotification('success', 'تم التحديث بنجاح');
      setShowEditModal(false);
      fetchTeachers();
    } catch (e: any) { 
      showNotification('error', e.message); 
    } finally { 
      setSubmittingEdit(false); 
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<string | null>(null);
  const handleDeleteClick = (id: string) => { setTeacherToDelete(id); setShowDeleteModal(true); };
  const confirmDelete = async () => { try { await deleteUser(teacherToDelete!); showNotification('success', 'تم الحذف'); setShowDeleteModal(false); } catch (e: any) { showNotification('error', e.message); } };

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
    } catch (e) { showNotification('error', 'حدث خطأ أثناء جلب التعيينات'); }
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
    } catch (e: any) { showNotification('error', 'فشل التعيين'); }
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
    } catch (e: any) { showNotification('error', 'حدث خطأ'); }
  };

  useEffect(() => { fetchTeachers(); fetchSections(); fetchSubjects(); }, [fetchTeachers, fetchSections, fetchSubjects]);

  const filteredTeachers = useMemo(() => {
    return (teachers as any[]).filter((teacher: any) => {
      const stageInfo = getTeacherStageInfo(teacher);
      const parentDept = getParentDepartment(teacher.specialization);
      const matchStage = stageFilter === 'all' || stageInfo.type === stageFilter;
      const matchDept = selectedDepartment ? parentDept === selectedDepartment : true;
      const matchSearch = teacher.users?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || teacher.national_id?.includes(searchQuery);
      return matchStage && matchDept && matchSearch;
    });
  }, [teachers, stageFilter, selectedDepartment, searchQuery]);

  const availableDepartments = Array.from(new Set(teachers.map((t: any) => getParentDepartment(t.specialization)))).sort();
  const departmentHeads = filteredTeachers.filter((t: any) => t.department_heads?.length > 0);
  const departmentMembers = filteredTeachers.filter((t: any) => !t.department_heads || t.department_heads.length === 0);

  const groupedMembers = departmentMembers.reduce((acc, teacher: any) => {
    const spec = teacher.specialization || 'عام';
    if (!acc[spec]) acc[spec] = [];
    acc[spec].push(teacher);
    return acc;
  }, {} as Record<string, any[]>);

  const defaultSpecializations = ['اللغة العربية', 'الرياضيات', 'العلوم', 'اللغة الإنجليزية', 'التربية الإسلامية', 'الدراسات الاجتماعية', 'الحاسوب', 'التربية الفنية', 'التربية البدنية', 'الموسيقى'];
  const allSpecializationsList = Array.from(new Set([...defaultSpecializations, ...teachers.map((t: any) => t.specialization).filter(Boolean)]));

  const TeacherCard = ({ teacher, isHOD = false }: any) => {
    const stageInfo = getTeacherStageInfo(teacher);
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-6 rounded-[2rem] bg-white border ${isHOD ? 'border-amber-200 shadow-lg shadow-amber-50' : 'border-slate-100 shadow-sm'} relative overflow-hidden group hover:-translate-y-1 transition-all`}>
        <div className="flex justify-between items-start relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center font-black text-xl ${isHOD ? 'bg-amber-100 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>{teacher.users?.full_name?.charAt(0)}</div>
              {isHOD && <Crown className="absolute -top-2 -right-2 h-6 w-6 text-yellow-500" />}
            </div>
            <div>
              <h3 className={`font-black leading-tight ${isHOD ? 'text-amber-900' : 'text-slate-900'}`}>{teacher.users?.full_name}</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-1">{teacher.national_id}</p>
            </div>
          </div>
          <div className={`px-2 py-1 rounded-lg bg-${stageInfo.color}-50 text-${stageInfo.color}-600 text-[10px] font-black border border-${stageInfo.color}-100`}>{stageInfo.label}</div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
           {isHOD && <span className="px-2 py-1 bg-amber-500 text-white text-[9px] font-black rounded-md">رئيس قسم {teacher.department_heads[0]?.subject?.name}</span>}
           {(teacher.custom_titles || []).map((t: string, i: number) => <span key={i} className="px-2 py-1 bg-slate-100 text-slate-500 text-[9px] font-bold rounded-md">{t}</span>)}
        </div>
        
        <div className="flex gap-2 mt-5 pt-4 border-t border-slate-50 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
           <button type="button" onClick={() => handleEditClick(teacher)} className="flex-1 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black hover:bg-indigo-600 hover:text-white transition-all">تعديل</button>
           <button type="button" onClick={() => handleResetPasswordClick(teacher)} className="p-2 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-600 hover:text-white transition-all" title="تغيير كلمة المرور"><Key size={14}/></button>
           <button type="button" onClick={() => handleAssignmentClick(teacher)} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all" title="تعيين الفصول"><BookOpen size={14}/></button>
           <button type="button" onClick={() => handleGrantBadgeClick(teacher)} className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-500 hover:text-white transition-all" title="منح وسام"><Award size={14}/></button>
           <button type="button" onClick={() => handleDeleteClick(teacher.id)} className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all" title="حذف"><Trash2 size={14}/></button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-8 pb-20 font-cairo" dir="rtl">
      <AnimatePresence>{notification && <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }} className={`fixed top-8 left-1/2 z-50 px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 border backdrop-blur-xl ${notification.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'}`}>{notification.message}<button onClick={() => setNotification(null)}><X size={16}/></button></motion.div>}</AnimatePresence>

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">{selectedDepartment ? `قسم ${selectedDepartment}` : 'إدارة المعلمين والأقسام'}</h1>
          <p className="text-slate-400 font-bold mt-2">{selectedDepartment ? `إدارة أعضاء قيادة القسم` : 'تنظيم الهيكلية المدرسية والمناصب الإدارية'}</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="px-8 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"><Plus size={20}/> إضافة معلم جديد</button>
      </div>

      <div className="bg-white/80 backdrop-blur-xl p-4 rounded-[2rem] shadow-sm border border-slate-100 sticky top-24 z-30 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
          {[{id:'all',label:'الكل',icon:Users},{id:'middle',label:'متوسط',icon:School},{id:'high',label:'ثانوي',icon:GraduationCap}].map(s => (
            <button key={s.id} onClick={() => setStageFilter(s.id as any)} className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${stageFilter === s.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-white'}`}>{s.label}</button>
          ))}
        </div>
        <div className="relative w-full md:max-w-xs"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={18}/><input type="text" placeholder="بحث سريع..." className="w-full pr-10 py-2.5 bg-slate-50 border-0 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}/></div>
      </div>

      {!selectedDepartment ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {availableDepartments.map(dept => (
            <motion.div key={dept} whileHover={{ y: -5 }} onClick={() => setSelectedDepartment(dept)} className="bg-white p-8 rounded-[2.5rem] cursor-pointer border-2 border-slate-50 hover:border-indigo-100 transition-all text-center group">
              <div className="h-20 w-20 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600 mx-auto mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-all"><Folder size={32}/></div>
              <h3 className="text-xl font-black text-slate-800">{dept}</h3>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-12">
          <button onClick={() => setSelectedDepartment(null)} className="flex items-center gap-2 text-indigo-600 font-black text-sm hover:underline"><ChevronLeft size={18}/> العودة لجميع الأقسام</button>
          {departmentHeads.length > 0 && (
            <div className="space-y-6"><h2 className="text-xl font-black text-amber-700 flex items-center gap-2 px-4"><Crown/> رئاسة القسم</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-6">{departmentHeads.map((hod: any) => <TeacherCard key={hod.id} teacher={hod} isHOD={true}/>)}</div></div>
          )}
          <div className="space-y-6">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 px-4"><Users/> أعضاء القسم</h2>
            {Object.entries(groupedMembers).map(([spec, specTeachers]: [string, any]) => (
              <div key={spec} className="bg-slate-50/50 p-6 rounded-[2.5rem] border border-slate-200 space-y-6">
                <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100"><div className="w-2 h-2 rounded-full bg-indigo-500"></div><h3 className="font-black text-slate-800 text-sm">تخصص: {spec}</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{(specTeachers as any[]).map((t: any) => <TeacherCard key={t.id} teacher={t}/>)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden my-8">
            <div className="p-8 sm:p-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-6"><h3 className="text-2xl font-black text-slate-900">تعديل الملف والمناصب</h3><button onClick={() => setShowEditModal(false)}><X size={24} className="text-slate-300 hover:text-rose-500"/></button></div>
              <form className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5"><label className="text-xs font-black text-slate-400 mr-2">الاسم</label><input type="text" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none"/></div>
                  <div className="space-y-1.5"><label className="text-xs font-black text-slate-400 mr-2">الرقم المدني</label><input type="text" value={editForm.national_id} onChange={e => setEditForm({...editForm, national_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none"/></div>
                  <div className="space-y-1.5"><label className="text-xs font-black text-slate-400 mr-2">رقم الهاتف</label><input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-left" dir="ltr"/></div>
                  <div className="space-y-1.5"><label className="text-xs font-black text-slate-400 mr-2">البريد الإلكتروني</label><input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-left" dir="ltr"/></div>
                  <div className="sm:col-span-2 space-y-1.5"><label className="text-xs font-black text-slate-400 mr-2">رابط زووم (Zoom Link)</label><input type="url" value={editForm.zoom_link} onChange={e => setEditForm({...editForm, zoom_link: e.target.value})} className="w-full px-4 py-3 bg-indigo-50/50 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-left" dir="ltr" placeholder="https://zoom.us/j/..."/></div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-black text-slate-400 mr-2">التخصص</label>
                    <select value={editForm.specialization} onChange={e => setEditForm({...editForm, specialization: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold outline-none">
                      <option value="">اختر التخصص</option>
                      {allSpecializationsList.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100 space-y-5">
                  <div className="space-y-1.5"><label className="text-xs font-black text-amber-700 mr-2">مسميات إضافية (مشرف، منسق...)</label><input type="text" placeholder="افصل بينها بفاصلة" value={editForm.custom_titles} onChange={e => setEditForm({...editForm, custom_titles: e.target.value})} className="w-full px-4 py-3 bg-white rounded-xl font-bold outline-none border border-amber-100 focus:ring-2 focus:ring-amber-500"/></div>
                  <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-amber-100"><input type="checkbox" id="isHOD" checked={editForm.isHOD} onChange={e => setEditForm({...editForm, isHOD: e.target.checked})} className="w-5 h-5 rounded text-amber-600"/><label htmlFor="isHOD" className="text-sm font-black text-slate-800 cursor-pointer">تعيين كرئيس قسم</label></div>
                  {editForm.isHOD && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><select value={editForm.hod_subject_id} onChange={e => setEditForm({...editForm, hod_subject_id: e.target.value})} className="w-full px-4 py-3 bg-white rounded-xl font-bold outline-none border border-amber-100"><option value="">-- اختر المادة --</option>{subjects.map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select><select value={editForm.hod_stage} onChange={e => setEditForm({...editForm, hod_stage: e.target.value})} className="w-full px-4 py-3 bg-white rounded-xl font-bold outline-none border border-amber-100"><option value="الكل">الكل</option><option value="متوسط">متوسط</option><option value="ثانوي">ثانوي</option></select></div>}
                </div>
              </form>
            </div>
            <div className="p-8 bg-slate-50 flex flex-row-reverse gap-3">
              <button disabled={submittingEdit} onClick={handleEditSubmit} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50">
                {submittingEdit ? 'جاري الحفظ...' : 'حفظ البيانات'}
              </button>
              <button onClick={() => setShowEditModal(false)} className="px-6 py-4 bg-white text-slate-500 rounded-2xl font-black border border-slate-200">إلغاء</button>
            </div>
          </motion.div>
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
                        
                        <input type="text" placeholder="رقم الهاتف" value={addForm.phone} onChange={(e) => setAddForm({...addForm, phone: e.target.value})} className="w-full rounded-2xl border-0 py-3.5 px-4 bg-slate-50 ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold outline-none text-left" dir="ltr" />
                        <input type="email" placeholder="البريد الإلكتروني" value={addForm.email} onChange={(e) => setAddForm({...addForm, email: e.target.value})} className="w-full rounded-2xl border-0 py-3.5 px-4 bg-slate-50 ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold outline-none text-left" dir="ltr" />
                        <input type="url" placeholder="رابط زووم (Zoom Link)" value={addForm.zoom_link} onChange={(e) => setAddForm({...addForm, zoom_link: e.target.value})} className="sm:col-span-2 w-full rounded-2xl border-0 py-3.5 px-4 bg-indigo-50/50 ring-1 ring-indigo-200 focus:ring-2 focus:ring-indigo-500 font-bold outline-none text-left" dir="ltr" />

                        <select value={addForm.specialization} onChange={(e) => setAddForm({...addForm, specialization: e.target.value})} className="sm:col-span-2 w-full rounded-2xl border-0 py-3.5 px-4 bg-slate-50 ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold outline-none">
                           <option value="">اختر التخصص</option>
                           {allSpecializationsList.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                   </form>
                </div>
                <div className="bg-slate-50/80 px-6 py-6 flex flex-row-reverse gap-3">
                   <button disabled={submitting} onClick={handleAddSubmit} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black disabled:opacity-50">إضافة المعلم</button>
                </div>
             </div>
          </div>
        </div>
      )}
      
      {showAssignmentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAssignmentModal(false)}></div>
            <div className="relative transform overflow-hidden rounded-[2.5rem] bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-4xl border border-slate-100">
              <div className="bg-white px-6 sm:px-10 pb-8 pt-8 sm:pt-10">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                  <h3 className="text-xl font-black text-slate-900">تعيين الفصول: {selectedTeacher?.users?.full_name}</h3>
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

      {showPasswordResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] p-8 text-center shadow-2xl">
            <h3 className="text-xl font-black mb-4">تغيير كلمة المرور</h3>
            <input type="text" placeholder="كلمة المرور الجديدة..." value={resetPasswordForm.newPassword} onChange={e => setResetPasswordForm({...resetPasswordForm, newPassword: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none mb-6 text-center" />
            <div className="flex gap-3">
              <button onClick={handleResetPasswordSubmit} className="flex-1 bg-indigo-600 text-white font-black py-3 rounded-xl hover:bg-indigo-700">حفظ</button>
              <button onClick={() => setShowPasswordResetModal(false)} className="flex-1 bg-slate-100 text-slate-700 font-black py-3 rounded-xl">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60"><div className="bg-white p-8 rounded-3xl text-center"><h3 className="text-xl font-black mb-4">تأكيد الحذف</h3><div className="flex gap-4"><button onClick={confirmDelete} className="bg-rose-600 text-white px-8 py-2 rounded-xl font-black flex-1">حذف نهائي</button><button onClick={() => setShowDeleteModal(false)} className="bg-slate-100 text-slate-500 px-8 py-2 rounded-xl font-black flex-1">تراجع</button></div></div></div>}
      
      {teacherForBadge && <GrantBadgeModal isOpen={isBadgeModalOpen} onClose={() => { setIsBadgeModalOpen(false); setTeacherForBadge(null); }} recipientId={teacherForBadge.id} recipientName={teacherForBadge.name} granterId={user?.id || 'admin'} />}
    </div>
  );
}
