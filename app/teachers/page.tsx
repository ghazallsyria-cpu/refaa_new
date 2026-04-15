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
    teachers, subjects, loading: usersLoading,
    fetchTeachers, fetchSections, fetchSubjects, addTeacher, updateTeacher, deleteUser, resetPassword
  } = useUsersSystem();

  const {
    loading: assignmentsLoading, fetchTeacherAssignments, saveAssignments: assignTeacherToSections,
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
  
  const handleResetPasswordClick = (teacher: any) => { setResetPasswordForm({ userId: teacher.id, newPassword: '' }); setShowPasswordResetModal(true); };
  const handleResetPasswordSubmit = async () => { try { const result = await resetPassword(resetPasswordForm.userId, resetPasswordForm.newPassword); showNotification('success', `كلمة المرور الجديدة: ${result.newPassword}`); setShowPasswordResetModal(false); } catch (error: any) { showNotification('error', error.message); } };

  const handleAddSubmit = async () => { try { await addTeacher(addForm); showNotification('success', 'تمت إضافة المعلم'); setShowAddModal(false); } catch (e: any) { showNotification('error', e.message); } };

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

  const handleEditSubmit = async () => {
    try {
      const payload: any = { 
        full_name: editForm.full_name, email: editForm.email, phone: editForm.phone, specialization: editForm.specialization, zoom_link: editForm.zoom_link, 
        custom_titles: editForm.custom_titles.split('،').map(s => s.trim()).filter(Boolean)
      };
      // حماية الرقم المدني: نرسله فقط إذا تم تغييره
      if (editForm.national_id !== editingTeacher.national_id) payload.national_id = editForm.national_id;

      const hodData = { isHead: editForm.isHOD, subject_id: editForm.hod_subject_id, stage_name: editForm.hod_stage };
      await updateTeacher(editingTeacher.id, editingTeacher.national_id, payload, hodData);
      showNotification('success', 'تم التحديث بنجاح');
      setShowEditModal(false);
    } catch (e: any) { showNotification('error', e.message); }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<string | null>(null);
  const handleDeleteClick = (id: string) => { setTeacherToDelete(id); setShowDeleteModal(true); };
  const confirmDelete = async () => { try { await deleteUser(teacherToDelete!); showNotification('success', 'تم الحذف'); setShowDeleteModal(false); } catch (e: any) { showNotification('error', e.message); } };

  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const handleAssignmentClick = async (teacher: any) => { setSelectedTeacher(teacher); await fetchTeacherAssignments(teacher.id); setShowAssignmentModal(true); };

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

  const TeacherCard = ({ teacher, isHOD = false }: any) => {
    const stageInfo = getTeacherStageInfo(teacher);
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-6 rounded-[2rem] bg-white border ${isHOD ? 'border-amber-200 shadow-lg shadow-amber-50' : 'border-slate-100 shadow-sm'} relative overflow-hidden group`}>
        <div className="flex justify-between items-start relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center font-black text-xl ${isHOD ? 'bg-amber-100 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>{teacher.users?.full_name?.charAt(0)}</div>
              {isHOD && <Crown className="absolute -top-2 -right-2 h-6 w-6 text-yellow-500" />}
            </div>
            <div>
              <h3 className="font-black text-slate-900 leading-tight">{teacher.users?.full_name}</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-1">{teacher.national_id}</p>
            </div>
          </div>
          <div className={`px-2 py-1 rounded-lg bg-${stageInfo.color}-50 text-${stageInfo.color}-600 text-[10px] font-black border border-${stageInfo.color}-100`}>{stageInfo.label}</div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
           {isHOD && <span className="px-2 py-1 bg-amber-500 text-white text-[9px] font-black rounded-md">رئيس قسم {teacher.department_heads[0]?.subject?.name}</span>}
           {(teacher.custom_titles || []).map((t: string, i: number) => <span key={i} className="px-2 py-1 bg-slate-100 text-slate-500 text-[9px] font-bold rounded-md">{t}</span>)}
        </div>
        <div className="flex gap-2 mt-5 pt-4 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition-opacity">
           <button onClick={() => handleEditClick(teacher)} className="flex-1 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black hover:bg-indigo-600 hover:text-white transition-all">تعديل</button>
           <button onClick={() => handleGrantBadgeClick(teacher)} className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-500 hover:text-white transition-all"><Award size={14}/></button>
           <button onClick={() => handleDeleteClick(teacher.id)} className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={14}/></button>
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
              <p className="text-xs font-bold text-slate-400 mt-2">عرض الأعضاء والرؤساء</p>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-12">
          <button onClick={() => setSelectedDepartment(null)} className="flex items-center gap-2 text-indigo-600 font-black text-sm hover:underline"><ChevronLeft size={18}/> العودة لجميع الأقسام</button>
          
          {departmentHeads.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-xl font-black text-amber-700 flex items-center gap-2 px-4"><Crown/> رئاسة القسم</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{departmentHeads.map(hod => <TeacherCard key={hod.id} teacher={hod} isHOD={true}/>)}</div>
            </div>
          )}

          <div className="space-y-6">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 px-4"><Users/> أعضاء القسم</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{departmentMembers.map(m => <TeacherCard key={m.id} teacher={m}/>)}</div>
          </div>
        </div>
      )}

      {/* نافذة التعديل */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden my-8">
            <div className="p-8 sm:p-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-6"><h3 className="text-2xl font-black text-slate-900">تعديل الملف والمناصب</h3><button onClick={() => setShowEditModal(false)}><X size={24} className="text-slate-300 hover:text-rose-500"/></button></div>
              <form className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5"><label className="text-xs font-black text-slate-400 mr-2">الاسم</label><input type="text" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none"/></div>
                  <div className="space-y-1.5"><label className="text-xs font-black text-slate-400 mr-2">الرقم المدني</label><input type="text" value={editForm.national_id} onChange={e => setEditForm({...editForm, national_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none"/></div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-black text-slate-400 mr-2">التخصص</label>
                    <select value={editForm.specialization} onChange={e => setEditForm({...editForm, specialization: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold outline-none">
                      <option value="">اختر التخصص</option>
                      {Object.keys(DEPARTMENT_MAPPINGS).map(d => <option key={d} value={d}>{d}</option>)}
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
            <div className="p-8 bg-slate-50 flex flex-row-reverse gap-3"><button onClick={handleEditSubmit} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">حفظ البيانات</button><button onClick={() => setShowEditModal(false)} className="px-6 py-4 bg-white text-slate-500 rounded-2xl font-black">إلغاء</button></div>
          </motion.div>
        </div>
      )}

      {/* المودالز الأخرى (Add/Delete/Badge) بقيت كما هي في الكود السابق */}
      {teacherForBadge && <GrantBadgeModal isOpen={isBadgeModalOpen} onClose={() => { setIsBadgeModalOpen(false); setTeacherForBadge(null); }} recipientId={teacherForBadge.id} recipientName={teacherForBadge.name} granterId={user?.id || 'admin'} />}
      {showDeleteModal && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60"><div className="bg-white p-8 rounded-3xl text-center"><h3 className="text-xl font-black mb-4">تأكيد الحذف</h3><div className="flex gap-4"><button onClick={confirmDelete} className="bg-rose-600 text-white px-8 py-2 rounded-xl font-black flex-1">حذف نهائي</button><button onClick={() => setShowDeleteModal(false)} className="bg-slate-100 text-slate-500 px-8 py-2 rounded-xl font-black flex-1">تراجع</button></div></div></div>}
    </div>
  );
}
