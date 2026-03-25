'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { BookOpen, Plus, Search, Edit2, Trash2, Users, X, Check, User, AlertCircle } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';

type Teacher = {
  id: string;
  national_id: string;
  specialization: string;
  user: {
    full_name: string;
    email: string;
  };
};

type Subject = {
  id: string;
  name: string;
  code: string;
  teachers: Teacher[];
};

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  
  // Form state
  const [currentSubject, setCurrentSubject] = useState<Partial<Subject>>({});
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<string | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .order('name');
        
      if (subjectsError) throw subjectsError;

      // Fetch teachers with user details
      const { data: teachersData, error: teachersError } = await supabase
        .from('teachers')
        .select(`
          id,
          national_id,
          specialization,
          users (
            full_name,
            email
          )
        `);
        
      if (teachersError) throw teachersError;

      // Fetch teacher-subject mappings
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('teacher_subjects')
        .select('*');
        
      if (mappingsError) throw mappingsError;

      // Format teachers
      const formattedTeachers = teachersData.map((t: any) => ({
        id: t.id,
        national_id: t.national_id,
        specialization: t.specialization,
        user: t.users
      }));
      
      setAllTeachers(formattedTeachers);

      // Organize subjects with their teachers
      const organizedSubjects: Subject[] = subjectsData.map((sub: any) => {
        const assignedTeacherIds = mappingsData
          .filter((m: any) => m.subject_id === sub.id)
          .map((m: any) => m.teacher_id);
          
        const assignedTeachers = formattedTeachers.filter(t => assignedTeacherIds.includes(t.id));
          
        return {
          ...sub,
          teachers: assignedTeachers
        };
      });

      setSubjects(organizedSubjects);
    } catch (error: any) {
      console.error('Error fetching subjects data:', error);
      showNotification('error', 'حدث خطأ أثناء جلب البيانات: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSubject.name || !currentSubject.code) return;
    
    setIsSubmitting(true);
    try {
      if (currentSubject.id) {
        // Update
        const { error } = await supabase
          .from('subjects')
          .update({ name: currentSubject.name, code: currentSubject.code })
          .eq('id', currentSubject.id);
          
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('subjects')
          .insert([{ name: currentSubject.name, code: currentSubject.code }]);
          
        if (error) throw error;
      }
      
      await fetchData();
      setIsSubjectModalOpen(false);
      setCurrentSubject({});
      showNotification('success', 'تم حفظ المادة بنجاح!');
    } catch (error: any) {
      console.error('Error saving subject:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء حفظ المادة الدراسية. قد يكون رمز المادة مستخدماً بالفعل.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!subjectToDelete) return;
    
    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectToDelete);
        
      if (error) throw error;
      await fetchData();
      showNotification('success', 'تم حذف المادة بنجاح');
    } catch (error: any) {
      console.error('Error deleting subject:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء حذف المادة.');
    } finally {
      setSubjectToDelete(null);
    }
  };

  const openAssignModal = (subject: Subject) => {
    setSelectedSubjectId(subject.id);
    setSelectedTeacherIds(subject.teachers.map(t => t.id));
    setIsAssignModalOpen(true);
  };

  const toggleTeacherSelection = (teacherId: string) => {
    setSelectedTeacherIds(prev => 
      prev.includes(teacherId) 
        ? prev.filter(id => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const handleSaveAssignments = async () => {
    if (!selectedSubjectId) return;
    
    setIsSubmitting(true);
    try {
      // First, delete existing assignments for this subject
      const { error: deleteError } = await supabase
        .from('teacher_subjects')
        .delete()
        .eq('subject_id', selectedSubjectId);
        
      if (deleteError) throw deleteError;
      
      // Then, insert new assignments if any
      if (selectedTeacherIds.length > 0) {
        const newAssignments = selectedTeacherIds.map(teacherId => ({
          subject_id: selectedSubjectId,
          teacher_id: teacherId
        }));
        
        const { error: insertError } = await supabase
          .from('teacher_subjects')
          .insert(newAssignments);
          
        if (insertError) throw insertError;
      }
      
      await fetchData();
      setIsAssignModalOpen(false);
      showNotification('success', 'تم حفظ تعيينات المعلمين بنجاح!');
    } catch (error: any) {
      console.error('Error saving assignments:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء حفظ تعيينات المعلمين.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSubjects = subjects.filter(sub => 
    sub.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    sub.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 relative pb-20"
    >
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-6 left-1/2 z-50 px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-4 transition-all duration-300 ${
              notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            <div className="font-bold tracking-tight">{notification.message}</div>
            <button onClick={() => setNotification(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">إدارة المواد الدراسية</h1>
          <p className="text-lg text-slate-500 font-medium">إضافة المواد وتعيين المعلمين المتخصصين لتدريسها</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="relative group">
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none transition-colors group-focus-within:text-indigo-600 text-slate-400">
              <Search className="h-5 w-5" />
            </div>
            <input
              type="text"
              placeholder="ابحث عن مادة..."
              className="block w-full sm:w-72 rounded-2xl border-0 py-3.5 pr-12 pl-4 text-slate-900 bg-white shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button
            onClick={() => {
              setCurrentSubject({});
              setIsSubjectModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-95"
          >
            <Plus className="h-5 w-5" />
            إضافة مادة جديدة
          </button>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredSubjects.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="col-span-full glass-card rounded-4xl p-20 text-center border-2 border-dashed border-slate-200"
          >
            <div className="mx-auto h-24 w-24 rounded-3xl bg-slate-50 flex items-center justify-center mb-6">
              <BookOpen className="h-12 w-12 text-slate-300" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">لا توجد مواد دراسية</h3>
            <p className="text-slate-500 max-w-sm mx-auto">قم بإضافة مواد دراسية جديدة للبدء في تعيين المعلمين المتخصصين لكل مادة.</p>
          </motion.div>
        ) : (
          filteredSubjects.map((subject, idx) => (
            <motion.div 
              key={subject.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="group glass-card rounded-4xl border border-slate-200/60 overflow-hidden hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-500 flex flex-col hover:-translate-y-1"
            >
              <div className="p-8 flex-1">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-indigo-600 shadow-lg shadow-indigo-200 p-3.5 rounded-2xl text-white transform group-hover:scale-110 transition-transform duration-500">
                      <BookOpen className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-xl tracking-tight leading-tight">{subject.name}</h3>
                      <span className="inline-flex items-center rounded-xl bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 font-mono mt-2 tracking-wider">
                        {subject.code}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                    <button 
                      onClick={() => {
                        setCurrentSubject(subject);
                        setIsSubjectModalOpen(true);
                      }}
                      className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      title="تعديل المادة"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => setSubjectToDelete(subject.id)}
                      className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      title="حذف المادة"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                <div className="mt-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      المعلمون ({subject.teachers.length})
                    </h4>
                  </div>
                  
                  {subject.teachers.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {subject.teachers.map(teacher => (
                        <div key={teacher.id} className="flex items-center gap-3 text-sm text-slate-700 bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50 hover:bg-white hover:shadow-md transition-all group/teacher">
                          <div className="h-9 w-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600 font-bold border border-slate-100 group-hover/teacher:bg-indigo-600 group-hover/teacher:text-white transition-colors">
                            {teacher.user?.full_name?.charAt(0) || 'أ'}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-900 truncate">{teacher.user?.full_name || 'بدون اسم'}</span>
                            <span className="text-[10px] text-slate-400 font-medium truncate">{teacher.specialization || 'تخصص عام'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 px-4 rounded-3xl bg-slate-50/50 border-2 border-dashed border-slate-100">
                      <p className="text-sm text-slate-400 font-medium italic">
                        لم يتم تعيين معلمين بعد
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 pt-0 mt-auto">
                <button
                  onClick={() => openAssignModal(subject)}
                  className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-sm font-black text-indigo-600 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-indigo-50 hover:ring-indigo-200 transition-all active:scale-[0.98]"
                >
                  <Users className="h-5 w-5" />
                  إدارة طاقم التدريس
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Subject Modal */}
      <Dialog.Root open={isSubjectModalOpen} onOpenChange={setIsSubjectModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay asChild>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity" 
            />
          </Dialog.Overlay>
          <Dialog.Content asChild>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-45%' }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-45%' }}
              className="fixed left-[50%] top-[50%] z-50 w-full max-w-md rounded-4xl bg-white p-10 shadow-2xl focus:outline-none overflow-hidden" 
              dir="rtl"
            >
              <div className="flex items-center justify-between mb-8">
                <Dialog.Title className="text-2xl font-black text-slate-900 tracking-tight">
                  {currentSubject.id ? 'تعديل مادة دراسية' : 'إضافة مادة جديدة'}
                </Dialog.Title>
                <Dialog.Close className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-all">
                  <X className="h-6 w-6" />
                </Dialog.Close>
              </div>
              
              <form onSubmit={handleSaveSubject} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-bold text-slate-700 mr-1">
                    اسم المادة
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm transition-all"
                    placeholder="مثال: الرياضيات"
                    value={currentSubject.name || ''}
                    onChange={(e) => setCurrentSubject({...currentSubject, name: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="code" className="text-sm font-bold text-slate-700 mr-1">
                    رمز المادة
                  </label>
                  <input
                    type="text"
                    id="code"
                    required
                    className="block w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm transition-all text-left font-mono"
                    dir="ltr"
                    placeholder="MATH101"
                    value={currentSubject.code || ''}
                    onChange={(e) => setCurrentSubject({...currentSubject, code: e.target.value})}
                  />
                  <p className="text-[10px] text-slate-400 font-medium mr-1">يجب أن يكون الرمز فريداً باللغة الإنجليزية.</p>
                </div>
                
                <div className="mt-10 flex flex-col sm:flex-row-reverse gap-3 pt-4 border-t border-slate-50">
                  <button
                    type="submit"
                    disabled={isSubmitting || !currentSubject.name || !currentSubject.code}
                    className="inline-flex w-full justify-center rounded-2xl bg-indigo-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 sm:w-auto"
                  >
                    {isSubmitting ? 'جاري الحفظ...' : 'حفظ المادة'}
                  </button>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="inline-flex w-full justify-center rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-all sm:w-auto"
                    >
                      إلغاء
                    </button>
                  </Dialog.Close>
                </div>
              </form>
            </motion.div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Assign Teachers Modal */}
      <Dialog.Root open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay asChild>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity" 
            />
          </Dialog.Overlay>
          <Dialog.Content asChild>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-45%' }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-45%' }}
              className="fixed left-[50%] top-[50%] z-50 w-full max-w-xl rounded-4xl bg-white p-10 shadow-2xl focus:outline-none flex flex-col max-h-[85vh] overflow-hidden" 
              dir="rtl"
            >
              <div className="flex items-center justify-between mb-8 flex-shrink-0">
                <div>
                  <Dialog.Title className="text-2xl font-black text-slate-900 tracking-tight">
                    تعيين المعلمين
                  </Dialog.Title>
                  <Dialog.Description className="text-base text-slate-500 font-medium mt-1">
                    اختر المعلمين المتخصصين لمادة <span className="text-indigo-600 font-bold">{subjects.find(s => s.id === selectedSubjectId)?.name}</span>
                  </Dialog.Description>
                </div>
                <Dialog.Close className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-all">
                  <X className="h-6 w-6" />
                </Dialog.Close>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-3 mb-8 custom-scrollbar">
                {allTeachers.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
                    <User className="mx-auto h-12 w-12 text-slate-300 mb-2" />
                    <p className="text-slate-500 font-medium">لا يوجد معلمين مسجلين في النظام.</p>
                  </div>
                ) : (
                  allTeachers.map(teacher => {
                    const isSelected = selectedTeacherIds.includes(teacher.id);
                    return (
                      <div 
                        key={teacher.id}
                        onClick={() => toggleTeacherSelection(teacher.id)}
                        className={`flex items-center justify-between p-4 rounded-3xl border-2 cursor-pointer transition-all duration-300 ${
                          isSelected 
                            ? 'bg-indigo-50 border-indigo-600 shadow-md shadow-indigo-100' 
                            : 'bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
                            isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <User className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className={`font-bold text-lg leading-tight ${isSelected ? 'text-indigo-900' : 'text-slate-900'}`}>
                              {teacher.user?.full_name || 'بدون اسم'}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                {teacher.specialization || 'تخصص عام'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {teacher.national_id}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className={`h-7 w-7 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${
                          isSelected ? 'bg-indigo-600 border-indigo-600 scale-110 shadow-lg shadow-indigo-200' : 'border-slate-200 bg-white'
                        }`}>
                          {isSelected && <Check className="h-4 w-4 text-white stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row-reverse gap-3 flex-shrink-0 pt-6 border-t border-slate-50">
                <button
                  onClick={handleSaveAssignments}
                  disabled={isSubmitting}
                  className="inline-flex w-full justify-center rounded-2xl bg-indigo-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 sm:w-auto"
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ التعيينات'}
                </button>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-all sm:w-auto"
                  >
                    إلغاء
                  </button>
                </Dialog.Close>
              </div>
            </motion.div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Confirmation Modal */}
      <Dialog.Root open={!!subjectToDelete} onOpenChange={(open) => !open && setSubjectToDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay asChild>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity" 
            />
          </Dialog.Overlay>
          <Dialog.Content asChild>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-45%' }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-45%' }}
              className="fixed left-[50%] top-[50%] z-50 w-full max-w-md rounded-4xl bg-white p-10 shadow-2xl focus:outline-none overflow-hidden" 
              dir="rtl"
            >
              <div className="flex items-center justify-between mb-8">
                <Dialog.Title className="text-2xl font-black text-slate-900 tracking-tight">
                  تأكيد الحذف
                </Dialog.Title>
                <Dialog.Close className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-all">
                  <X className="h-6 w-6" />
                </Dialog.Close>
              </div>
              
              <div className="flex flex-col items-center text-center mb-10">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-red-50 mb-6 transition-transform hover:scale-110">
                  <AlertCircle className="h-12 w-12 text-red-600" />
                </div>
                <p className="text-slate-600 text-lg leading-relaxed font-medium">
                  هل أنت متأكد من حذف هذه المادة؟
                  <br />
                  <span className="text-red-500 font-black text-sm mt-4 block p-4 bg-red-50 rounded-2xl border border-red-100">
                    سيتم إزالة جميع ارتباطات المعلمين بها. لا يمكن التراجع عن هذا الإجراء.
                  </span>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row-reverse gap-3 pt-6 border-t border-slate-50">
                <button
                  onClick={confirmDelete}
                  className="inline-flex w-full justify-center rounded-2xl bg-red-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-200 hover:bg-red-700 transition-all active:scale-95 sm:w-auto"
                >
                  تأكيد الحذف النهائي
                </button>
                <Dialog.Close asChild>
                  <button className="inline-flex w-full justify-center rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-all sm:w-auto">
                    إلغاء
                  </button>
                </Dialog.Close>
              </div>
            </motion.div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </motion.div>
  );
}
