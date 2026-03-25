'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Filter, Edit, Trash2, X, Key, BookOpen, AlertCircle, Users, GraduationCap, Briefcase, Save, Folder, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('الكل');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [addForm, setAddForm] = useState({
    full_name: '',
    national_id: '',
    email: '',
    phone: '',
    specialization: '',
    zoom_link: ''
  });
  const [editForm, setEditForm] = useState({
    full_name: '',
    national_id: '',
    email: '',
    phone: '',
    specialization: '',
    zoom_link: ''
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
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(resetPasswordForm)
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'فشل تغيير كلمة المرور');
      
      showNotification('success', `تم تغيير كلمة المرور بنجاح. كلمة المرور الجديدة: ${data.newPassword || resetPasswordForm.newPassword}`);
      setShowPasswordResetModal(false);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء تغيير كلمة المرور');
    }
  };

  const [submitting, setSubmitting] = useState(false);

  const handleAddSubmit = async () => {
    console.log('handleAddSubmit triggered');
    if (submitting) return;
    
    if (!addForm.full_name || !addForm.national_id) {
      console.log('Validation failed: missing full_name or national_id');
      showNotification('error', 'يرجى تعبئة الحقول الإلزامية (الاسم والرقم المدني)');
      return;
    }

    try {
      setSubmitting(true);
      console.log('Form data:', addForm);

      console.log('Getting session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw sessionError;
      }
      
      const token = session?.access_token;
      console.log('Token obtained:', token ? 'Yes' : 'No');

      if (!token) {
        showNotification('error', 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
        setSubmitting(false);
        return;
      }

      console.log('Sending request to /api/users/create...');
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: addForm.email || null,
          full_name: addForm.full_name,
          national_id: addForm.national_id,
          phone: addForm.phone,
          role: 'teacher',
          specialization: addForm.specialization,
          zoom_link: addForm.zoom_link,
        }),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'فشل إنشاء حساب المعلم');
      }

      showNotification('success', `تم إضافة المعلم بنجاح (كلمة المرور: ${data.password})`);
      setShowAddModal(false);
      setAddForm({ full_name: '', national_id: '', email: '', phone: '', specialization: '', zoom_link: '' });
      fetchTeachers();
    } catch (error: any) {
      console.error('Error adding teacher:', error);
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
      // Update users table
      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: editForm.full_name,
          email: editForm.email,
          phone: editForm.phone
        })
        .eq('id', editingTeacher.id);

      if (userError) throw userError;

      // Update teachers table
      const { error: teacherError } = await supabase
        .from('teachers')
        .update({
          national_id: editForm.national_id,
          specialization: editForm.specialization,
          zoom_link: editForm.zoom_link
        })
        .eq('id', editingTeacher.id);

      if (teacherError) throw teacherError;

      showNotification('success', 'تم تحديث بيانات المعلم بنجاح');
      setShowEditModal(false);
      fetchTeachers();
    } catch (error: any) {
      console.error('Error updating teacher:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء تحديث بيانات المعلم');
    } finally {
      setSubmittingEdit(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teachers')
        .select(`
          *,
          users (full_name, email, phone),
          teacher_sections (count)
        `);

      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<string | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teacherSections, setTeacherSections] = useState<any[]>([]);
  const [bulkAssignData, setBulkAssignData] = useState<{ section_ids: string[], subject_ids: string[] }>({
    section_ids: [],
    subject_ids: []
  });

  const handleAssignmentClick = async (teacher: any) => {
    setSelectedTeacher(teacher);
    setBulkAssignData({ section_ids: [], subject_ids: [] });
    const [sRes, subRes, tsRes] = await Promise.all([
      supabase.from('sections').select('id, name, classes(name)'),
      supabase.from('subjects').select('id, name'),
      supabase.from('teacher_sections').select('teacher_id, section_id, subject_id').eq('teacher_id', teacher.id)
    ]);
    if (sRes.data) setSections(sRes.data);
    if (subRes.data) setSubjects(subRes.data);
    if (tsRes.data) setTeacherSections(tsRes.data);
    setShowAssignmentModal(true);
  };

  const handleBulkAssign = async () => {
    if (bulkAssignData.section_ids.length === 0 || bulkAssignData.subject_ids.length === 0) {
      showNotification('error', 'يرجى اختيار فصل واحد ومادة واحدة على الأقل');
      return;
    }

    const newAssignments: any[] = [];
    bulkAssignData.section_ids.forEach(sid => {
      bulkAssignData.subject_ids.forEach(subid => {
        newAssignments.push({
          teacher_id: selectedTeacher.id,
          section_id: sid,
          subject_id: subid
        });
      });
    });

    const { data, error } = await supabase.from('teacher_sections').upsert(newAssignments, { ignoreDuplicates: true }).select();
    if (!error) {
      // Refresh teacher sections
      const { data: refreshed } = await supabase.from('teacher_sections').select('teacher_id, section_id, subject_id').eq('teacher_id', selectedTeacher.id);
      if (refreshed) setTeacherSections(refreshed);
      setBulkAssignData({ section_ids: [], subject_ids: [] });
      showNotification('success', 'تم تنفيذ التعيين المتعدد بنجاح');
    } else {
      showNotification('error', 'فشل التعيين المتعدد');
    }
  };

  const toggleBulkSection = (id: string) => {
    setBulkAssignData(prev => ({
      ...prev,
      section_ids: prev.section_ids.includes(id) ? prev.section_ids.filter(sid => sid !== id) : [...prev.section_ids, id]
    }));
  };

  const toggleBulkSubject = (id: string) => {
    setBulkAssignData(prev => ({
      ...prev,
      subject_ids: prev.subject_ids.includes(id) ? prev.subject_ids.filter(sid => sid !== id) : [...prev.subject_ids, id]
    }));
  };

  const toggleAssignment = async (sectionId: string, subjectId: string) => {
    const existing = teacherSections.find(ts => ts.section_id === sectionId && ts.subject_id === subjectId);
    if (existing) {
      await supabase.from('teacher_sections').delete()
        .eq('teacher_id', selectedTeacher.id)
        .eq('section_id', sectionId)
        .eq('subject_id', subjectId);
      setTeacherSections(teacherSections.filter(ts => !(ts.section_id === sectionId && ts.subject_id === subjectId)));
      showNotification('success', 'تم إزالة التعيين بنجاح');
    } else {
      const { data, error } = await supabase.from('teacher_sections').insert({
        teacher_id: selectedTeacher.id,
        section_id: sectionId,
        subject_id: subjectId
      }).select().single();
      if (data) {
        setTeacherSections([...teacherSections, data]);
        showNotification('success', 'تم إضافة التعيين بنجاح');
      }
    }
  };

  const handleDeleteClick = (id: string) => {
    setTeacherToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!teacherToDelete) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`/api/users/delete?id=${teacherToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل حذف المعلم');
      }
      
      showNotification('success', 'تم حذف المعلم بنجاح');
      setShowDeleteModal(false);
      setTeacherToDelete(null);
      fetchTeachers();
    } catch (error: any) {
      console.error('Error deleting teacher:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء حذف المعلم');
    }
  };

  const defaultSpecializations = [
    'اللغة العربية', 'الرياضيات', 'العلوم', 'اللغة الإنجليزية', 
    'التربية الإسلامية', 'الدراسات الاجتماعية', 'الحاسوب', 'التربية الفنية', 
    'التربية البدنية', 'الموسيقى'
  ];
  const specializations = Array.from(new Set([
    'الكل',
    ...defaultSpecializations,
    ...teachers.map(t => t.specialization).filter(Boolean)
  ])) as string[];

  const filteredTeachers = teachers.filter(teacher => 
    (selectedFolder ? (teacher.specialization || 'غير محدد') === selectedFolder : (activeTab === 'الكل' || teacher.specialization === activeTab)) &&
    (teacher.users?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.national_id?.includes(searchQuery))
  );

  const groupedTeachers = filteredTeachers.reduce((acc, teacher) => {
    const spec = teacher.specialization || 'غير محدد';
    if (!acc[spec]) acc[spec] = [];
    acc[spec].push(teacher);
    return acc;
  }, {} as Record<string, any[]>);

  // Get all unique specializations from all teachers (not just filtered)
  const allSpecializations = Array.from(new Set(teachers.map(t => t.specialization || 'غير محدد'))).sort();

  return (
    <div className="space-y-10 relative pb-20">
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-8 left-1/2 z-50 px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 border backdrop-blur-xl ${
              notification.type === 'success' 
                ? 'bg-emerald-500/90 text-white border-emerald-400/50' 
                : 'bg-red-500/90 text-white border-red-400/50'
            }`}
          >
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
              {notification.type === 'success' ? '✓' : '!'}
            </div>
            <div className="font-black text-sm uppercase tracking-widest">{notification.message}</div>
            <button onClick={() => setNotification(null)} className="ml-2 hover:scale-110 transition-transform">
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Briefcase className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">الموارد البشرية</span>
            </div>
            {selectedFolder && (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setSelectedFolder(null)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-all text-[10px] font-black uppercase tracking-[0.2em]"
              >
                <ChevronLeft className="h-3 w-3" />
                العودة للأقسام
              </motion.button>
            )}
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-tight">
            {selectedFolder ? `قسم ${selectedFolder}` : 'إدارة المعلمين'}
          </h1>
          <p className="text-lg font-medium text-slate-400 max-w-lg">
            {selectedFolder 
              ? `عرض جميع المعلمين المنتمين لقسم ${selectedFolder}.`
              : 'تنظيم الهيئة التدريسية، تعيين المواد، ومتابعة البيانات الشخصية للمعلمين.'}
          </p>
        </motion.div>
        
        <motion.button 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center rounded-[2rem] bg-indigo-600 px-10 py-5 text-sm font-black text-white shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all group"
        >
          <Plus className="h-6 w-6 ml-3 group-hover:rotate-90 transition-transform duration-500" />
          إضافة معلم جديد
        </motion.button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-8 rounded-[3rem]"
      >
        <div className="flex flex-col xl:flex-row gap-8 items-center justify-between">
          <div className="relative w-full xl:max-w-xl group">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-6">
              <Search className="h-6 w-6 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input
              type="text"
              className="block w-full rounded-3xl border-0 py-5 pr-14 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all shadow-inner"
              placeholder="البحث بالاسم، التخصص، أو الرقم المدني..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-4 xl:pb-0 w-full xl:w-auto no-scrollbar mask-fade-edges">
            {specializations.map((spec, idx) => (
              <motion.button
                key={spec}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + (idx * 0.05) }}
                onClick={() => setActiveTab(spec)}
                className={`px-8 py-4 rounded-2xl text-xs font-black whitespace-nowrap transition-all uppercase tracking-widest ${
                  activeTab === spec 
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 scale-105' 
                    : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50 hover:border-slate-200'
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
            const count = teachers.filter(t => (t.specialization || 'غير محدد') === spec).length;
            return (
              <motion.div
                key={spec}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ y: -5, scale: 1.02 }}
                onClick={() => setSelectedFolder(spec)}
                className="glass-card p-8 rounded-[2.5rem] cursor-pointer group hover:shadow-2xl hover:shadow-indigo-100 transition-all border-2 border-transparent hover:border-indigo-100"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="h-20 w-20 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-inner">
                    <Folder className="h-10 w-10" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{spec}</h3>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{count} معلم</p>
                  </div>
                  <div className="pt-4 w-full">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        className="h-full bg-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card overflow-hidden rounded-[3rem]">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/50">
                <tr>
                  <th scope="col" className="py-6 pr-10 pl-4 text-right text-xs font-black text-slate-400 uppercase tracking-[0.2em]">المعلم</th>
                  <th scope="col" className="px-4 py-6 text-right text-xs font-black text-slate-400 uppercase tracking-[0.2em]">الرقم المدني</th>
                  <th scope="col" className="px-4 py-6 text-right text-xs font-black text-slate-400 uppercase tracking-[0.2em]">التخصص</th>
                  <th scope="col" className="px-4 py-6 text-right text-xs font-black text-slate-400 uppercase tracking-[0.2em]">التعيينات</th>
                  <th scope="col" className="px-4 py-6 text-right text-xs font-black text-slate-400 uppercase tracking-[0.2em]">الحالة</th>
                  <th scope="col" className="relative py-6 pl-10 pr-4">
                    <span className="sr-only">إجراءات</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-32 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative h-12 w-12">
                          <div className="absolute inset-0 rounded-full border-4 border-indigo-50"></div>
                          <div className="absolute inset-0 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                        </div>
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">جاري تحميل البيانات...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-32 text-center">
                      <div className="flex flex-col items-center gap-6">
                        <div className="h-24 w-24 rounded-[2rem] bg-slate-50 flex items-center justify-center">
                          <Search className="h-10 w-10 text-slate-200" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xl font-black text-slate-900">لا يوجد نتائج</p>
                          <p className="text-sm font-medium text-slate-400">لم نجد أي معلم يطابق معايير البحث الخاصة بك</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTeachers.map((teacher, idx) => (
                    <motion.tr 
                      key={teacher.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-slate-50/80 transition-all group cursor-pointer"
                    >
                      <td className="whitespace-nowrap py-6 pr-10 pl-4">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-50 flex items-center justify-center text-indigo-600 font-black text-sm border border-indigo-100 shadow-sm group-hover:scale-110 transition-transform">
                              {teacher.users?.full_name?.charAt(0) || 'م'}
                            </div>
                            <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{teacher.users?.full_name || 'غير محدد'}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{teacher.users?.email || 'لا يوجد بريد'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-6">
                        <span className="text-sm font-bold text-slate-600 font-mono">{teacher.national_id}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-6">
                        <span className="inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200">
                          {teacher.specialization || 'غير محدد'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-6">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <BookOpen className="h-4 w-4 text-indigo-500" />
                          </div>
                          <span className="text-sm font-black text-indigo-600">
                            {teacher.teacher_sections?.length || 0} فصول
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-6">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                          نشط
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-6 pl-10 pr-4 text-left">
                        <div className="flex items-center justify-end gap-2 transition-all">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleAssignmentClick(teacher); }}
                            className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all shadow-sm hover:shadow-md bg-white border border-slate-100"
                            title="تعيين الفصول والمواد"
                          >
                            <BookOpen className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleResetPasswordClick(teacher); }}
                            className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm hover:shadow-md bg-white border border-slate-100"
                            title="إعادة تعيين كلمة المرور"
                          >
                            <Key className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleEditClick(teacher); }}
                            className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm hover:shadow-md bg-white border border-slate-100"
                            title="تعديل"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(teacher.id); }}
                            className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm hover:shadow-md bg-white border border-slate-100"
                            title="حذف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden p-6 grid gap-6">
            {loading ? (
              <div className="py-20 text-center">
                 <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                 <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">جاري التحميل...</span>
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="py-20 text-center text-sm font-bold text-slate-400 uppercase tracking-widest">
                لا يوجد نتائج
              </div>
            ) : (
              filteredTeachers.map((teacher, idx) => (
                <motion.div 
                  key={teacher.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-8 rounded-[2.5rem] bg-slate-50/50 border border-slate-100 space-y-8 relative overflow-hidden group"
                >
                  <div className="flex justify-between items-start relative z-10">
                    <div className="flex items-center gap-5">
                      <div className="relative">
                        <div className="h-16 w-16 rounded-3xl bg-white shadow-xl shadow-slate-200/50 flex items-center justify-center text-indigo-600 font-black text-xl border border-slate-100">
                          {teacher.users?.full_name?.charAt(0) || 'م'}
                        </div>
                        <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900 leading-tight">{teacher.users?.full_name || 'غير محدد'}</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{teacher.national_id}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleResetPasswordClick(teacher)}
                        className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                        title="إعادة تعيين كلمة المرور"
                      >
                        <Key className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => handleEditClick(teacher)}
                        className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(teacher.id)}
                        className="p-3 text-slate-400 hover:text-red-600 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 relative z-10">
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">التخصص</span>
                      <span className="text-sm font-bold text-slate-900">{teacher.specialization || 'غير محدد'}</span>
                    </div>
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">التعيينات</span>
                      <span className="text-sm font-black text-indigo-600">{teacher.teacher_sections?.length || 0} فصول</span>
                    </div>
                    <div className="col-span-2 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">رقم الهاتف</span>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center">
                          <Users className="h-4 w-4 text-slate-400" />
                        </div>
                        <span className="text-sm font-bold text-slate-900">{teacher.users?.phone || 'غير محدد'}</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleAssignmentClick(teacher)}
                    className="w-full py-5 rounded-[1.5rem] bg-indigo-600 text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-100"
                  >
                    <BookOpen className="h-5 w-5" />
                    تعيين الفصول والمواد
                  </button>
                  
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Edit Teacher Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowEditModal(false)}></div>
            
            <div className="relative transform overflow-hidden rounded-4xl bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
              <div className="bg-white px-8 pb-8 pt-10 sm:p-10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">تعديل بيانات المعلم</h3>
                  <button onClick={() => setShowEditModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-all">
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <form className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">الاسم الرباعي</label>
                      <input 
                        type="text" 
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                        className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">الرقم المدني</label>
                      <input 
                        type="text" 
                        value={editForm.national_id}
                        onChange={(e) => setEditForm({...editForm, national_id: e.target.value})}
                        className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">البريد الإلكتروني</label>
                      <input 
                        type="email" 
                        value={editForm.email}
                        onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                        className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">رقم الهاتف</label>
                      <input 
                        type="text" 
                        value={editForm.phone}
                        onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                        className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all" 
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">التخصص</label>
                      <select 
                        value={editForm.specialization}
                        onChange={(e) => setEditForm({...editForm, specialization: e.target.value})}
                        className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all" 
                      >
                        <option value="">اختر التخصص</option>
                        {specializations.filter(s => s !== 'الكل').map(spec => (
                          <option key={spec} value={spec}>{spec}</option>
                        ))}
                        <option value="أخرى">أخرى</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setShowEditModal(false);
                          handleResetPasswordClick(editingTeacher);
                        }}
                        className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                      >
                        <Key className="h-4 w-4" />
                        تغيير كلمة المرور لهذا المعلم
                      </button>
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">رابط زوم</label>
                      <input 
                        type="url" 
                        value={editForm.zoom_link}
                        onChange={(e) => setEditForm({...editForm, zoom_link: e.target.value})}
                        className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all" 
                      />
                    </div>
                  </div>
                </form>
              </div>
              <div className="bg-slate-50/50 px-8 py-6 sm:flex sm:flex-row-reverse sm:px-10 gap-3">
                <button
                  type="button"
                  disabled={submittingEdit}
                  className={`inline-flex w-full justify-center rounded-2xl px-8 py-3 text-sm font-bold text-white shadow-lg transition-all active:scale-95 sm:w-auto ${
                    submittingEdit 
                    ? 'bg-indigo-400 cursor-not-allowed' 
                    : 'bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700'
                  }`}
                  onClick={handleEditSubmit}
                >
                  {submittingEdit ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      جاري الحفظ...
                    </div>
                  ) : 'حفظ التعديلات'}
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-2xl bg-white px-8 py-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 sm:mt-0 sm:w-auto transition-all"
                  onClick={() => setShowEditModal(false)}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Add Teacher Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowAddModal(false)}></div>
            
            <div className="relative transform overflow-hidden rounded-4xl bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
              <div className="bg-white px-8 pb-8 pt-10 sm:p-10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">إضافة معلم جديد</h3>
                  <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-all">
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">الاسم الرباعي</label>
                      <input 
                        type="text" 
                        value={addForm.full_name}
                        onChange={(e) => setAddForm({...addForm, full_name: e.target.value})}
                        className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all" 
                        placeholder="أدخل الاسم الكامل..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">الرقم المدني</label>
                      <input 
                        type="text" 
                        value={addForm.national_id}
                        onChange={(e) => setAddForm({...addForm, national_id: e.target.value})}
                        className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all" 
                        placeholder="أدخل الرقم المدني..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">البريد الإلكتروني</label>
                      <input 
                        type="email" 
                        value={addForm.email}
                        onChange={(e) => setAddForm({...addForm, email: e.target.value})}
                        className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all" 
                        placeholder="example@school.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">رقم الهاتف</label>
                      <input 
                        type="text" 
                        value={addForm.phone}
                        onChange={(e) => setAddForm({...addForm, phone: e.target.value})}
                        className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all" 
                        placeholder="أدخل رقم الهاتف..."
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">التخصص</label>
                      <select 
                        value={addForm.specialization}
                        onChange={(e) => setAddForm({...addForm, specialization: e.target.value})}
                        className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all" 
                      >
                        <option value="">اختر التخصص</option>
                        {specializations.filter(s => s !== 'الكل').map(spec => (
                          <option key={spec} value={spec}>{spec}</option>
                        ))}
                        <option value="أخرى">أخرى</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">رابط زوم</label>
                      <input 
                        type="url" 
                        value={addForm.zoom_link}
                        onChange={(e) => setAddForm({...addForm, zoom_link: e.target.value})}
                        className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all" 
                        placeholder="https://zoom.us/j/..."
                      />
                    </div>
                  </div>
                </form>
              </div>
              <div className="bg-slate-50/50 px-8 py-6 sm:flex sm:flex-row-reverse sm:px-10 gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  className={`inline-flex w-full justify-center rounded-2xl px-8 py-3 text-sm font-bold text-white shadow-lg transition-all active:scale-95 sm:w-auto ${
                    submitting 
                    ? 'bg-indigo-400 cursor-not-allowed' 
                    : 'bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700'
                  }`}
                  onClick={handleAddSubmit}
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      جاري الحفظ...
                    </div>
                  ) : 'حفظ البيانات'}
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-2xl bg-white px-8 py-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 sm:mt-0 sm:w-auto transition-all"
                  onClick={() => setShowAddModal(false)}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowDeleteModal(false)}></div>
            
            <div className="relative transform overflow-hidden rounded-4xl bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white px-8 pb-8 pt-10 sm:p-10">
                <div className="flex flex-col items-center text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50 mb-6 transition-transform hover:scale-110">
                    <AlertCircle className="h-10 w-10 text-red-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">حذف المعلم</h3>
                  <p className="text-slate-500 leading-relaxed">
                    هل أنت متأكد من حذف هذا المعلم؟ سيتم حذف جميع البيانات المرتبطة به نهائياً. لا يمكن التراجع عن هذا الإجراء.
                  </p>
                </div>
              </div>
              <div className="bg-slate-50/50 px-8 py-6 sm:flex sm:flex-row-reverse sm:px-10 gap-3">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-2xl bg-red-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 hover:bg-red-700 transition-all active:scale-95 sm:w-auto"
                  onClick={confirmDelete}
                >
                  تأكيد الحذف
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-2xl bg-white px-8 py-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 sm:mt-0 sm:w-auto transition-all"
                  onClick={() => setShowDeleteModal(false)}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showAssignmentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowAssignmentModal(false)}></div>
            
            <div className="relative transform overflow-hidden rounded-4xl bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
              <div className="bg-white px-8 pb-8 pt-10 sm:p-10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">تعيين فصول ومواد لـ {selectedTeacher?.users?.full_name}</h3>
                  <button onClick={() => setShowAssignmentModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-all">
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                  {/* Bulk Assignment Section */}
                  <div className="bg-amber-50 rounded-4xl p-8 border-2 border-amber-200 shadow-xl shadow-amber-50 mb-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="text-xl font-black text-amber-900 tracking-tight">التعيين المتعدد الذكي</h4>
                        <p className="text-amber-700 font-medium text-xs">حدد المواد والفصول ثم اضغط تعيين للكل</p>
                      </div>
                      <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-amber-600">
                        <Plus className="h-6 w-6" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-xs font-black text-amber-800 uppercase tracking-widest">المواد الدراسية</label>
                        <div className="flex flex-wrap gap-2">
                          {subjects.map(subject => (
                            <button
                              key={subject.id}
                              onClick={() => toggleBulkSubject(subject.id)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                bulkAssignData.subject_ids.includes(subject.id)
                                ? 'bg-amber-500 text-white shadow-lg shadow-amber-200'
                                : 'bg-white text-amber-700 border border-amber-100 hover:border-amber-300'
                              }`}
                            >
                              {subject.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-xs font-black text-amber-800 uppercase tracking-widest">الفصول الدراسية</label>
                        <div className="flex flex-wrap gap-2">
                          {sections.map(section => (
                            <button
                              key={section.id}
                              onClick={() => toggleBulkSection(section.id)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                bulkAssignData.section_ids.includes(section.id)
                                ? 'bg-amber-500 text-white shadow-lg shadow-amber-200'
                                : 'bg-white text-amber-700 border border-amber-100 hover:border-amber-300'
                              }`}
                            >
                              {section.classes?.name} - {section.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleBulkAssign}
                      className="w-full py-4 bg-amber-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-amber-200 hover:bg-amber-700 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                      <Save className="h-5 w-5" />
                      تنفيذ التعيين المتعدد المختار
                    </button>
                  </div>

                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-white px-4 text-xs font-black text-slate-400 uppercase tracking-widest">أو التعيين الفردي المباشر</span>
                    </div>
                  </div>

                  {sections.map(section => (
                    <div key={section.id} className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                      <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        {section.classes?.name} - {section.name}
                      </h4>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {subjects.map(subject => {
                          const isAssigned = teacherSections.some(ts => ts.section_id === section.id && ts.subject_id === subject.id);
                          return (
                            <button 
                              key={subject.id}
                              onClick={() => toggleAssignment(section.id, subject.id)}
                              className={`p-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                isAssigned 
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' 
                                : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30'
                              }`}
                            >
                              {subject.name}
                              {isAssigned && <span className="text-xs">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-50/50 px-8 py-6 sm:flex sm:flex-row-reverse sm:px-10">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-2xl bg-indigo-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 sm:w-auto"
                  onClick={() => setShowAssignmentModal(false)}
                >
                  إغلاق
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
            
            <div className="relative transform overflow-hidden rounded-4xl bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md">
              <div className="bg-white px-8 pb-8 pt-10 sm:p-10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">إعادة تعيين كلمة المرور</h3>
                  <button onClick={() => setShowPasswordResetModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-all">
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 mr-1">كلمة المرور الجديدة</label>
                    <input 
                      type="password" 
                      value={resetPasswordForm.newPassword}
                      onChange={(e) => setResetPasswordForm({...resetPasswordForm, newPassword: e.target.value})}
                      className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all" 
                      placeholder="أدخل كلمة المرور الجديدة..."
                    />
                  </div>
                </div>
              </div>
              <div className="bg-slate-50/50 px-8 py-6 sm:flex sm:flex-row-reverse sm:px-10 gap-3">
                <button
                  type="button"
                  onClick={handleResetPasswordSubmit}
                  className="inline-flex w-full justify-center rounded-2xl bg-indigo-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 sm:w-auto"
                >
                  حفظ كلمة المرور
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordResetModal(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-2xl bg-white px-8 py-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 sm:mt-0 sm:w-auto transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
