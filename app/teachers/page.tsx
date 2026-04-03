'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  Plus, Search, Filter, Edit, Trash2, X, Key, BookOpen, AlertCircle, 
  Users, GraduationCap, Briefcase, Save, Folder, ChevronLeft, School, Layers, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUsersSystem } from '@/hooks/useUsersSystem';
import { useTeacherAssignmentsSystem } from '@/hooks/useTeacherAssignmentsSystem';

// 🚀 الخوارزمية الذكية لتحديد مرحلة المعلم بناءً على الفصول التي يدرسها
const getTeacherStageInfo = (teacher: any) => {
  if (!teacher.teacher_sections || teacher.teacher_sections.length === 0) {
    return { type: 'unassigned', label: 'غير معين', color: 'slate', icon: AlertCircle };
  }

  let hasMiddle = false;
  let hasHigh = false;

  teacher.teacher_sections.forEach((ts: any) => {
    const className = ts.sections?.classes?.name || '';
    if (className.includes('سادس') || className.includes('سابع') || className.includes('ثامن') || className.includes('تاسع')) {
      hasMiddle = true;
    }
    if (className.includes('عاشر') || className.includes('حادي') || className.includes('ثاني')) {
      hasHigh = true;
    }
  });

  if (hasMiddle && hasHigh) return { type: 'both', label: 'مشترك', color: 'amber', icon: Layers };
  if (hasMiddle) return { type: 'middle', label: 'متوسطي', color: 'blue', icon: School };
  if (hasHigh) return { type: 'high', label: 'ثانوي', color: 'emerald', icon: GraduationCap };
  
  return { type: 'unknown', label: 'غير محدد', color: 'slate', icon: Users };
};

export default function TeachersPage() {
  const {
    teachers,
    sections,
    subjects,
    loading: usersLoading,
    fetchTeachers,
    fetchSections,
    fetchSubjects,
    addTeacher,
    updateTeacher,
    deleteUser,
    resetPassword
  } = useUsersSystem();

  const {
    loading: assignmentsLoading,
    fetchTeacherAssignments,
    saveAssignments: assignTeacherToSections,
    deleteAssignment: removeTeacherAssignment,
  } = useTeacherAssignmentsSystem();

  const isDataLoading = usersLoading || assignmentsLoading;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('الكل');
  
  // 🚀 فلتر المرحلة الجديد
  const [stageFilter, setStageFilter] = useState<'all' | 'middle' | 'high' | 'both' | 'unassigned'>('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [addForm, setAddForm] = useState({
    full_name: '', national_id: '', email: '', phone: '', specialization: '', zoom_link: ''
  });
  const [editForm, setEditForm] = useState({
    full_name: '', national_id: '', email: '', phone: '', specialization: '', zoom_link: ''
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
    if (!addForm.full_name || !addForm.national_id) {
      showNotification('error', 'يرجى تعبئة الحقول الإلزامية (الاسم والرقم المدني)');
      return;
    }
    try {
      setSubmitting(true);
      const result = await addTeacher(addForm);
      showNotification('success', `تم إضافة المعلم بنجاح (كلمة المرور: ${result.password})`);
      setShowAddModal(false);
      setAddForm({ full_name: '', national_id: '', email: '', phone: '', specialization: '', zoom_link: '' });
    } catch (error: any) {
      showNotification('error', error.message || 'حدث خطأ أثناء إضافة المعلم');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (teacher: any) => {
    setEditingTeacher(teacher);
    setEditForm({
      full_name: teacher.users?.full_name || '',
      national_id: teacher.national_id || '',
      email: teacher.users?.email || '',
      phone: teacher.users?.phone || '',
      specialization: teacher.specialization || '',
      zoom_link: teacher.zoom_link || ''
    });
    setShowEditModal(true);
  };

  const [submittingEdit, setSubmittingEdit] = useState(false);

  const handleEditSubmit = async () => {
    if (submittingEdit) return;
    try {
      setSubmittingEdit(true);
      await updateTeacher(editingTeacher.id, editingTeacher.national_id, editForm);
      showNotification('success', 'تم تحديث بيانات المعلم بنجاح');
      setShowEditModal(false);
    } catch (error: any) {
      showNotification('error', error.message || 'حدث خطأ أثناء تحديث بيانات المعلم');
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
  const [bulkAssignData, setBulkAssignData] = useState<{ section_ids: string[], subject_ids: string[] }>({
    section_ids: [], subject_ids: []
  });

  const handleAssignmentClick = async (teacher: any) => {
    setSelectedTeacher(teacher);
    setBulkAssignData({ section_ids: [], subject_ids: [] });
    try {
      const assignments = await fetchTeacherAssignments(teacher.id);
      setTeacherSections(assignments);
      setShowAssignmentModal(true);
    } catch (error: any) {
      showNotification('error', 'حدث خطأ أثناء جلب تعيينات المعلم');
    }
  };

  const handleBulkAssign = async () => {
    if (bulkAssignData.section_ids.length === 0 || bulkAssignData.subject_ids.length === 0) {
      showNotification('error', 'يرجى اختيار فصل واحد ومادة واحدة على الأقل');
      return;
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
      showNotification('success', 'تم تنفيذ التعيين المتعدد بنجاح');
      fetchTeachers(); // Refresh main list to update badges
    } catch (error: any) {
      showNotification('error', 'فشل التعيين المتعدد');
    }
  };

  const toggleBulkSection = (id: string) => {
    setBulkAssignData(prev => ({
      ...prev, section_ids: prev.section_ids.includes(id) ? prev.section_ids.filter(sid => sid !== id) : [...prev.section_ids, id]
    }));
  };

  const toggleBulkSubject = (id: string) => {
    setBulkAssignData(prev => ({
      ...prev, subject_ids: prev.subject_ids.includes(id) ? prev.subject_ids.filter(sid => sid !== id) : [...prev.subject_ids, id]
    }));
  };

  const toggleAssignment = async (sectionId: string, subjectId: string) => {
    const existing = teacherSections.find(ts => ts.section_id === sectionId && ts.subject_id === subjectId);
    try {
      if (existing) {
        await removeTeacherAssignment(selectedTeacher.id, sectionId, subjectId);
        setTeacherSections(teacherSections.filter(ts => !(ts.section_id === sectionId && ts.subject_id === subjectId)));
        showNotification('success', 'تم إزالة التعيين بنجاح');
      } else {
        await assignTeacherToSections([{ teacher_id: selectedTeacher.id, section_id: sectionId, subject_id: subjectId }]);
        const refreshed = await fetchTeacherAssignments(selectedTeacher.id);
        setTeacherSections(refreshed);
        showNotification('success', 'تم إضافة التعيين بنجاح');
      }
      fetchTeachers(); // Refresh main list to update badges
    } catch (error: any) {
      showNotification('error', 'حدث خطأ أثناء تعديل التعيين');
    }
  };

  const handleDeleteClick = (id: string) => {
    setTeacherToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!teacherToDelete) return;
    try {
      await deleteUser(teacherToDelete);
      showNotification('success', 'تم حذف المعلم بنجاح');
      setShowDeleteModal(false);
      setTeacherToDelete(null);
    } catch (error: any) {
      showNotification('error', error.message || 'حدث خطأ أثناء حذف المعلم');
    }
  };

  const defaultSpecializations = [
    'اللغة العربية', 'الرياضيات', 'العلوم', 'اللغة الإنجليزية', 
    'التربية الإسلامية', 'الدراسات الاجتماعية', 'الحاسوب', 'التربية الفنية', 
    'التربية البدنية', 'الموسيقى'
  ];
  const specializations = Array.from(new Set([
    'الكل', ...defaultSpecializations, ...teachers.map(t => t.specialization).filter(Boolean)
  ])) as string[];

  // 🚀 تطبيق الفلترة المركبة (بحث + تخصص + مرحلة)
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
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-8 left-1/2 z-50 px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 border backdrop-blur-xl ${
              notification.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400/50' : 'bg-red-500/90 text-white border-red-400/50'
            }`}
          >
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
              {notification.type === 'success' ? '✓' : '!'}
            </div>
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
              <motion.button
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                onClick={() => setSelectedFolder(null)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-all text-[10px] font-black uppercase tracking-[0.2em]"
              >
                <ChevronLeft className="h-3 w-3" /> العودة للأقسام
              </motion.button>
            )}
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            {selectedFolder ? `قسم ${selectedFolder}` : 'إدارة المعلمين'}
          </h1>
          <p className="text-base sm:text-lg font-bold text-slate-400 max-w-lg">
            {selectedFolder ? `عرض جميع المعلمين المنتمين لقسم ${selectedFolder}.` : 'تنظيم الهيئة التدريسية، وتصنيفهم بذكاء حسب المرحلة.'}
          </p>
        </motion.div>
        
        <motion.button 
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center rounded-[2rem] bg-indigo-600 px-8 py-4 sm:py-5 text-sm font-black text-white shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all group"
        >
          <Plus className="h-6 w-6 ml-3 group-hover:rotate-90 transition-transform duration-500" /> إضافة معلم جديد
        </motion.button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/80 backdrop-blur-xl p-4 sm:p-6 lg:p-8 rounded-[2.5rem] shadow-sm border border-slate-200 sticky top-24 z-30 space-y-6">
        
        {/* 🚀 المرحلة Tabs (Smart Stage Filters) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'all', label: 'جميع المراحل', icon: Users },
            { id: 'middle', label: 'المتوسطة', icon: School },
            { id: 'high', label: 'الثانوية', icon: GraduationCap },
            { id: 'both', label: 'مشترك', icon: Layers },
            { id: 'unassigned', label: 'غير معين', icon: AlertCircle }
          ].map((stage) => (
            <button 
              key={stage.id}
              onClick={() => setStageFilter(stage.id as any)} 
              className={`px-5 py-3 rounded-2xl font-black text-sm shrink-0 transition-all flex items-center gap-2 border ${
                stageFilter === stage.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 border-indigo-600' 
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              <stage.icon className={`h-4 w-4 ${stageFilter === stage.id ? 'text-indigo-200' : 'text-slate-400'}`} />
              {stage.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col xl:flex-row gap-6 items-center justify-between">
          <div className="relative w-full xl:max-w-xl group">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-6">
              <Search className="h-6 w-6 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input
              type="text"
              className="block w-full rounded-2xl border-0 py-4 pr-14 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all shadow-inner font-bold"
              placeholder="البحث بالاسم، التخصص، أو الرقم المدني..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-2 xl:pb-0 w-full xl:w-auto no-scrollbar mask-fade-edges">
            {specializations.map((spec, idx) => (
              <motion.button
                key={spec}
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + (idx * 0.05) }}
                onClick={() => setActiveTab(spec)}
                className={`px-6 py-3 rounded-2xl text-xs font-black whitespace-nowrap transition-all uppercase tracking-widest border ${
                  activeTab === spec 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 border-indigo-600 scale-105' 
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {spec}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {!selectedFolder ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {allSpecializations.map((spec, idx) => {
            const count = filteredTeachers.filter(t => (t.specialization || 'غير محدد') === spec).length;
            // إخفاء المجلد إذا كان فارغاً بعد الفلترة (اختياري، يفضل إظهاره كفارغ)
            return (
              <motion.div
                key={spec}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                whileHover={{ y: -5, scale: 1.02 }}
                onClick={() => setSelectedFolder(spec)}
                className="bg-white p-8 rounded-[2.5rem] cursor-pointer group hover:shadow-2xl hover:shadow-indigo-100 transition-all border-2 border-slate-100 hover:border-indigo-100"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="h-20 w-20 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-inner border border-indigo-100">
                    <Folder className="h-10 w-10" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{spec}</h3>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{count} معلم</p>
                  </div>
                  <div className="pt-4 w-full">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: count > 0 ? '100%' : '0%' }} className="h-full bg-indigo-500" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 overflow-hidden rounded-[3rem] shadow-sm">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/80">
                <tr>
                  <th scope="col" className="py-6 pr-10 pl-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">المعلم</th>
                  <th scope="col" className="px-4 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">المرحلة</th>
                  <th scope="col" className="px-4 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">الرقم المدني</th>
                  <th scope="col" className="px-4 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">التخصص</th>
                  <th scope="col" className="px-4 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">التعيينات</th>
                  <th scope="col" className="relative py-6 pl-10 pr-4"><span className="sr-only">إجراءات</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white">
                {isDataLoading ? (
                  <tr>
                    <td colSpan={6} className="py-32 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative h-12 w-12"><div className="absolute inset-0 rounded-full border-4 border-indigo-50"></div><div className="absolute inset-0 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div></div>
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">جاري تحميل البيانات...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-32 text-center">
                      <div className="flex flex-col items-center gap-6">
                        <div className="h-24 w-24 rounded-[2rem] bg-slate-50 flex items-center justify-center border border-slate-100">
                          <Search className="h-10 w-10 text-slate-300" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xl font-black text-slate-900">لا يوجد نتائج</p>
                          <p className="text-sm font-bold text-slate-500">لم نجد أي معلم يطابق معايير البحث والمرحلة المختارة</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTeachers.map((teacher, idx) => {
                    const stageInfo = getTeacherStageInfo(teacher);

                    return (
                    <motion.tr 
                      key={teacher.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                      className="hover:bg-slate-50/80 transition-all group cursor-pointer"
                    >
                      <td className="whitespace-nowrap py-6 pr-10 pl-4">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center text-indigo-600 font-black text-sm border border-indigo-100 shadow-sm group-hover:scale-110 transition-transform">
                              {teacher.users?.full_name?.charAt(0) || 'م'}
                            </div>
                            <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{teacher.users?.full_name || 'غير محدد'}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 truncate">{teacher.users?.email || 'لا يوجد بريد'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-6 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm bg-${stageInfo.color}-50 text-${stageInfo.color}-700 border-${stageInfo.color}-200`}>
                          <stageInfo.icon className="h-3.5 w-3.5" />
                          {stageInfo.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-6">
                        <span className="text-sm font-bold text-slate-600 font-mono bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{teacher.national_id}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-6">
                        <span className="text-xs font-black text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                          {teacher.specialization || 'غير محدد'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                            <BookOpen className="h-4 w-4 text-indigo-500" />
                          </div>
                          <span className="text-sm font-black text-indigo-600">
                            {teacher.teacher_sections?.length || 0}
                          </span>
                        </div>
                      </td>
                      <td className="relative whitespace-nowrap py-6 pl-10 pr-4 text-left">
                        <div className="flex items-center justify-end gap-2 transition-all opacity-0 group-hover:opacity-100">
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

          {/* Mobile Card View */}
          <div className="md:hidden p-4 sm:p-6 grid gap-4 sm:gap-6 bg-slate-50/50">
            {isDataLoading ? (
              <div className="py-20 text-center"><div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><span className="text-sm font-bold text-slate-400">جاري التحميل...</span></div>
            ) : filteredTeachers.length === 0 ? (
              <div className="py-20 text-center text-sm font-bold text-slate-400">لا يوجد نتائج تطابق بحثك</div>
            ) : (
              filteredTeachers.map((teacher, idx) => {
                const stageInfo = getTeacherStageInfo(teacher);

                return (
                <motion.div key={teacher.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }} className="p-6 rounded-[2rem] bg-white border border-slate-200 space-y-6 relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-indigo-50 shadow-inner border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xl shrink-0">
                        {teacher.users?.full_name?.charAt(0) || 'م'}
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">{teacher.users?.full_name || 'غير محدد'}</h3>
                        <p className="text-[10px] sm:text-xs font-bold text-slate-500 mt-1 font-mono">{teacher.national_id}</p>
                      </div>
                    </div>
                    <div className={`p-2 rounded-xl bg-${stageInfo.color}-50 text-${stageInfo.color}-600 border border-${stageInfo.color}-200 shadow-sm shrink-0`} title={stageInfo.label}>
                      <stageInfo.icon className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 relative z-10">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">التخصص</span>
                      <span className="text-sm font-bold text-slate-900 truncate w-full">{teacher.specialization || 'عام'}</span>
                    </div>
                    <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">التعيينات</span>
                      <span className="text-sm font-black text-indigo-700">{teacher.teacher_sections?.length || 0} فصل</span>
                    </div>
                  </div>

                  <div className="flex gap-2 relative z-10 pt-4 border-t border-slate-100">
                    <button onClick={() => handleAssignmentClick(teacher)} className="flex-1 py-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-black hover:bg-emerald-500 hover:text-white border border-emerald-200 transition-all flex items-center justify-center gap-1.5"><BookOpen className="h-4 w-4" /> تعيين</button>
                    <button onClick={() => handleEditClick(teacher)} className="p-3 text-slate-500 hover:text-indigo-600 bg-slate-50 rounded-xl transition-all border border-slate-200"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => handleResetPasswordClick(teacher)} className="p-3 text-slate-500 hover:text-indigo-600 bg-slate-50 rounded-xl transition-all border border-slate-200"><Key className="h-4 w-4" /></button>
                    <button onClick={() => handleDeleteClick(teacher.id)} className="p-3 text-slate-500 hover:text-red-600 bg-slate-50 rounded-xl transition-all border border-slate-200"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </motion.div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 🚀 النوافذ المنبثقة (Modals) احتفظت بها كما هي لضمان عدم تعطل الوظائف السابقة */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowEditModal(false)}></div>
            <div className="relative transform overflow-hidden rounded-[2.5rem] bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-slate-100">
              <div className="bg-white px-6 sm:px-10 pb-8 pt-8 sm:pt-10">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><Edit className="h-6 w-6"/></div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">تعديل بيانات المعلم</h3>
                      <p className="text-xs font-bold text-slate-500 mt-1">تحديث البيانات الشخصية والوظيفية</p>
                    </div>
                  </div>
                  <button onClick={() => setShowEditModal(false)} className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-all"><X className="h-6 w-6" /></button>
                </div>
                <form className="space-y-6">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">الاسم الرباعي</label><input type="text" value={editForm.full_name} onChange={(e) => setEditForm({...editForm, full_name: e.target.value})} className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-all font-bold outline-none" /></div>
                    <div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">الرقم المدني</label><input type="text" value={editForm.national_id} onChange={(e) => setEditForm({...editForm, national_id: e.target.value})} className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-all font-bold outline-none" /></div>
                    <div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">البريد الإلكتروني</label><input type="email" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-all font-bold outline-none text-left" dir="ltr" /></div>
                    <div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">رقم الهاتف</label><input type="text" value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-all font-bold outline-none" /></div>
                    <div className="sm:col-span-2 space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">التخصص</label>
                      <select value={editForm.specialization} onChange={(e) => setEditForm({...editForm, specialization: e.target.value})} className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-all font-bold outline-none cursor-pointer appearance-none">
                        <option value="">اختر التخصص</option>
                        {specializations.filter(s => s !== 'الكل').map(spec => (<option key={spec} value={spec}>{spec}</option>))}
                        <option value="أخرى">أخرى</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2 space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">رابط البث (Zoom)</label><input type="url" value={editForm.zoom_link} onChange={(e) => setEditForm({...editForm, zoom_link: e.target.value})} className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-all font-bold outline-none text-left" dir="ltr" placeholder="https://zoom.us/j/..." /></div>
                  </div>
                </form>
              </div>
              <div className="bg-slate-50/80 px-6 sm:px-10 py-6 border-t border-slate-100 flex flex-col sm:flex-row-reverse gap-3">
                <button type="button" disabled={submittingEdit} className={`inline-flex w-full justify-center items-center rounded-2xl px-8 py-4 text-sm font-black text-white shadow-lg transition-all active:scale-95 sm:w-auto ${submittingEdit ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700'}`} onClick={handleEditSubmit}>
                  {submittingEdit ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'حفظ التعديلات'}
                </button>
                <button type="button" className="inline-flex w-full justify-center items-center rounded-2xl bg-white px-8 py-4 text-sm font-black text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 sm:w-auto transition-all" onClick={() => setShowEditModal(false)}>إلغاء الأمر</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowAddModal(false)}></div>
            <div className="relative transform overflow-hidden rounded-[2.5rem] bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-slate-100">
              <div className="bg-white px-6 sm:px-10 pb-8 pt-8 sm:pt-10">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center"><Plus className="h-6 w-6"/></div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">إضافة معلم جديد</h3>
                      <p className="text-xs font-bold text-slate-500 mt-1">تأكد من صحة الرقم المدني فهو يمثل كلمة المرور الافتراضية</p>
                    </div>
                  </div>
                  <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-all"><X className="h-6 w-6" /></button>
                </div>
                <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">الاسم الرباعي <span className="text-rose-500">*</span></label><input type="text" value={addForm.full_name} onChange={(e) => setAddForm({...addForm, full_name: e.target.value})} className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-all font-bold outline-none" /></div>
                    <div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">الرقم المدني <span className="text-rose-500">*</span></label><input type="text" value={addForm.national_id} onChange={(e) => setAddForm({...addForm, national_id: e.target.value})} className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-all font-bold outline-none" /></div>
                    <div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">البريد الإلكتروني</label><input type="email" value={addForm.email} onChange={(e) => setAddForm({...addForm, email: e.target.value})} className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-all font-bold outline-none text-left" dir="ltr" /></div>
                    <div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">رقم الهاتف</label><input type="text" value={addForm.phone} onChange={(e) => setAddForm({...addForm, phone: e.target.value})} className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-all font-bold outline-none" /></div>
                    <div className="sm:col-span-2 space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">التخصص</label>
                      <select value={addForm.specialization} onChange={(e) => setAddForm({...addForm, specialization: e.target.value})} className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-all font-bold outline-none cursor-pointer appearance-none">
                        <option value="">اختر التخصص</option>
                        {specializations.filter(s => s !== 'الكل').map(spec => (<option key={spec} value={spec}>{spec}</option>))}
                        <option value="أخرى">أخرى</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2 space-y-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">رابط البث (Zoom)</label><input type="url" value={addForm.zoom_link} onChange={(e) => setAddForm({...addForm, zoom_link: e.target.value})} className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-all font-bold outline-none text-left" dir="ltr" /></div>
                  </div>
                </form>
              </div>
              <div className="bg-slate-50/80 px-6 sm:px-10 py-6 border-t border-slate-100 flex flex-col sm:flex-row-reverse gap-3">
                <button type="button" disabled={submitting} className={`inline-flex w-full justify-center items-center rounded-2xl px-8 py-4 text-sm font-black text-white shadow-lg transition-all active:scale-95 sm:w-auto ${submitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700'}`} onClick={handleAddSubmit}>
                  {submitting ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'إضافة للمعلمين'}
                </button>
                <button type="button" className="inline-flex w-full justify-center items-center rounded-2xl bg-white px-8 py-4 text-sm font-black text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 sm:w-auto transition-all" onClick={() => setShowAddModal(false)}>إلغاء الأمر</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowDeleteModal(false)}></div>
            <div className="relative transform overflow-hidden rounded-[2.5rem] bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-slate-100">
              <div className="bg-white px-6 sm:px-10 pb-8 pt-10">
                <div className="flex flex-col items-center text-center">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-rose-50 border border-rose-100 mb-6 transition-transform hover:scale-110">
                    <AlertCircle className="h-12 w-12 text-rose-500 animate-pulse" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">حذف سجل المعلم النهائي</h3>
                  <p className="text-slate-500 font-bold leading-relaxed text-sm">سيتم حذف المعلم نهائياً، وهذا سيؤدي إلى حذف جميع الجداول والمواد المسندة إليه. هذا الإجراء لا رجعة فيه!</p>
                </div>
              </div>
              <div className="bg-rose-50/50 px-6 sm:px-10 py-6 border-t border-rose-100 flex flex-col sm:flex-row-reverse gap-3">
                <button type="button" className="inline-flex w-full justify-center items-center rounded-2xl bg-rose-600 px-8 py-4 text-sm font-black text-white shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95 sm:w-auto" onClick={confirmDelete}>نعم، تأكيد الحذف</button>
                <button type="button" className="inline-flex w-full justify-center items-center rounded-2xl bg-white px-8 py-4 text-sm font-black text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 sm:mt-0 sm:w-auto transition-all" onClick={() => setShowDeleteModal(false)}>تراجع</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAssignmentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowAssignmentModal(false)}></div>
            <div className="relative transform overflow-hidden rounded-[2.5rem] bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-4xl border border-slate-100">
              <div className="bg-white px-6 sm:px-10 pb-8 pt-8 sm:pt-10">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><BookOpen className="h-6 w-6"/></div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">تعيينات المعلم: {selectedTeacher?.users?.full_name}</h3>
                      <p className="text-xs font-bold text-slate-500 mt-1">تحديد الفصول والمواد التي سيدرسها هذا المعلم لإنشاء جدوله لاحقاً.</p>
                    </div>
                  </div>
                  <button onClick={() => setShowAssignmentModal(false)} className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-all"><X className="h-6 w-6" /></button>
                </div>
                
                <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-[2rem] p-6 sm:p-8 border border-amber-100 shadow-inner">
                    <div className="flex items-center justify-between mb-6">
                      <div className="space-y-1">
                        <h4 className="text-lg font-black text-amber-900 flex items-center gap-2"><Zap className="w-5 h-5"/> التعيين المتعدد السريع</h4>
                        <p className="text-amber-700 font-bold text-xs">طريقة سريعة لربط المعلم بعدة فصول ومواد بضغطة زر واحدة.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-amber-800 uppercase tracking-widest bg-amber-100 px-3 py-1 rounded-md w-fit">حدد المواد أولاً</label>
                        <div className="flex flex-wrap gap-2">
                          {subjects.map(subject => (
                            <button key={subject.id} onClick={() => toggleBulkSubject(subject.id)} className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all border ${bulkAssignData.subject_ids.includes(subject.id) ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-200' : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-100'}`}>
                              {subject.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-amber-800 uppercase tracking-widest bg-amber-100 px-3 py-1 rounded-md w-fit">ثم حدد الفصول المستهدفة</label>
                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                          {sections.map(section => (
                            <button key={section.id} onClick={() => toggleBulkSection(section.id)} className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all border ${bulkAssignData.section_ids.includes(section.id) ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-200' : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-100'}`}>
                              {section.classes?.name} - {section.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button onClick={handleBulkAssign} className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-amber-200 hover:bg-amber-600 transition-all active:scale-95 flex items-center justify-center gap-2">
                      <Save className="h-5 w-5" /> ربط واعتماد التعيينات المحددة
                    </button>
                  </div>

                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                    <div className="relative flex justify-center"><span className="bg-white px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-200 rounded-full py-1">أو التعيين الفردي المباشر للتعديل الدقيق</span></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sections.map(section => (
                      <div key={section.id} className="bg-slate-50 rounded-3xl p-5 border border-slate-200 shadow-sm transition-all hover:border-indigo-200">
                        <h4 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-sm border-b border-slate-200 pb-3">
                          <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center"><Users className="w-3 h-3"/></div>
                          {section.classes?.name} - {section.name}
                        </h4>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                          {subjects.map(subject => {
                            const isAssigned = teacherSections.some(ts => ts.section_id === section.id && ts.subject_id === subject.id);
                            return (
                              <button key={subject.id} onClick={() => toggleAssignment(section.id, subject.id)} className={`p-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border ${isAssigned ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-200' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'}`}>
                                {subject.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-slate-50/80 px-6 sm:px-10 py-6 border-t border-slate-100 flex justify-end">
                <button type="button" className="inline-flex w-full justify-center items-center rounded-2xl bg-indigo-600 px-10 py-4 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 sm:w-auto" onClick={() => setShowAssignmentModal(false)}>
                  تم وحفظ، إغلاق النافذة
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
            <div className="relative transform overflow-hidden rounded-[2.5rem] bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-slate-100">
              <div className="bg-white px-6 sm:px-10 pb-8 pt-8 sm:pt-10">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center"><Key className="h-6 w-6"/></div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">إعادة تعيين كلمة المرور</h3>
                      <p className="text-xs font-bold text-slate-500 mt-1">إجبار المعلم على تسجيل دخول جديد</p>
                    </div>
                  </div>
                  <button onClick={() => setShowPasswordResetModal(false)} className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-all"><X className="h-6 w-6" /></button>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">كلمة المرور الجديدة</label>
                    <input type="text" value={resetPasswordForm.newPassword} onChange={(e) => setResetPasswordForm({...resetPasswordForm, newPassword: e.target.value})} className="block w-full rounded-2xl border-0 py-4 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-amber-500 sm:text-sm transition-all font-black text-center tracking-[0.3em] outline-none" placeholder="أدخل كلمة المرور..." />
                  </div>
                </div>
              </div>
              <div className="bg-slate-50/80 px-6 sm:px-10 py-6 border-t border-slate-100 flex flex-col sm:flex-row-reverse gap-3">
                <button type="button" onClick={handleResetPasswordSubmit} className="inline-flex w-full justify-center items-center rounded-2xl bg-amber-500 px-8 py-4 text-sm font-black text-white shadow-lg shadow-amber-200 hover:bg-amber-600 transition-all active:scale-95 sm:w-auto">تأكيد وتغيير</button>
                <button type="button" onClick={() => setShowPasswordResetModal(false)} className="inline-flex w-full justify-center items-center rounded-2xl bg-white px-8 py-4 text-sm font-black text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 sm:w-auto transition-all">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
