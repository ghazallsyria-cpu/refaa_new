'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSubjectsSystem } from '@/hooks/useSubjectsSystem';
import { BookOpen, Plus, Search, Edit2, Trash2, Users, X, Check, User, AlertCircle, Crown, ShieldAlert } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';

type Teacher = {
  id: string;
  national_id: string;
  specialization: string;
  department_heads?: any[]; // لمعرفة ما إذا كان رئيساً للقسم
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
  const { 
    loading: hookLoading, 
    fetchSubjectsData, 
    addSubject, 
    updateSubject, 
    deleteSubject, 
    saveTeacherAssignments 
  } = useSubjectsSystem();

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
      const data = await fetchSubjectsData();
      setSubjects(data.subjects as Subject[]);
      setAllTeachers(data.allTeachers as Teacher[]);
    } catch (error: any) {
      console.error('Error fetching subjects data:', error);
      showNotification('error', 'حدث خطأ أثناء جلب البيانات: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [fetchSubjectsData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSubject.name || !currentSubject.code) return;
    
    setIsSubmitting(true);
    try {
      if (currentSubject.id) {
        await updateSubject(currentSubject.id, currentSubject.name, currentSubject.code);
      } else {
        await addSubject(currentSubject.name, currentSubject.code);
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
      await deleteSubject(subjectToDelete);
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
      await saveTeacherAssignments(selectedSubjectId, selectedTeacherIds);
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
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-indigo-600 border-t-transparent shadow-lg shadow-indigo-200"></div>
          <p className="text-slate-500 font-bold animate-pulse tracking-widest uppercase">جاري تحميل الهيكلية...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 relative pb-20 font-cairo" dir="rtl">
      
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-8 left-1/2 z-50 px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 border backdrop-blur-xl ${
              notification.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400' : 'bg-rose-500/90 text-white border-rose-400'
            }`}
          >
            <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              {notification.type === 'success' ? <Check className="w-4 h-4"/> : <ShieldAlert className="w-4 h-4"/>}
            </div>
            <div className="font-black text-sm tracking-wide">{notification.message}</div>
            <button onClick={() => setNotification(null)} className="p-1 hover:bg-white/20 rounded-xl transition-colors ml-2">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] sm:rounded-[3rem] bg-gradient-to-r from-slate-900 via-indigo-900 to-violet-900 p-8 sm:p-12 text-white shadow-2xl shadow-slate-900/20">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-[80px]"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-widest backdrop-blur-sm shadow-sm">
              <BookOpen className="w-3.5 h-3.5 text-indigo-300" /> المركز الأكاديمي
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight drop-shadow-md">إدارة المواد الدراسية</h1>
            <p className="text-indigo-100 text-sm sm:text-base font-bold opacity-90 max-w-2xl leading-relaxed">
              إضافة وتصنيف المواد العلمية، وتعيين الطواقم التدريسية ورؤساء الأقسام لكل مادة بدقة ومرونة.
            </p>
          </div>
          
          <div className="flex shrink-0">
            <button
              onClick={() => { setCurrentSubject({}); setIsSubjectModalOpen(true); }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-[1.5rem] bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm sm:text-base font-black shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all active:scale-95 border border-indigo-400/50"
            >
              <Plus className="w-5 h-5" /> إضافة مادة جديدة
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl p-4 sm:p-5 rounded-[2rem] shadow-sm border border-slate-200 sticky top-24 z-30 flex flex-col md:flex-row gap-4 items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><BookOpen className="w-5 h-5"/></div>
            <div>
               <h3 className="font-black text-slate-900 text-lg">المواد المسجلة ({subjects.length})</h3>
            </div>
         </div>
         <div className="relative w-full md:w-80">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
               type="text"
               placeholder="البحث باسم أو رمز المادة..."
               className="w-full rounded-[1.5rem] bg-slate-50 border border-slate-200 py-3.5 pr-12 pl-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {filteredSubjects.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="col-span-full bg-slate-50 rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-200">
            <div className="mx-auto h-24 w-24 rounded-[2rem] bg-white flex items-center justify-center mb-6 shadow-sm border border-slate-100">
              <BookOpen className="h-12 w-12 text-slate-300" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">لا توجد مواد مطابقة</h3>
            <p className="text-slate-500 font-bold max-w-sm mx-auto">قم بإضافة مواد دراسية جديدة أو تأكد من كلمات البحث.</p>
          </motion.div>
        ) : (
          filteredSubjects.map((subject, idx) => (
            <motion.div 
              key={subject.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="group bg-white rounded-[2.5rem] border border-slate-200/80 overflow-hidden hover:shadow-2xl hover:shadow-indigo-100/50 hover:border-indigo-200 transition-all duration-500 flex flex-col"
            >
              <div className="p-8 flex-1 bg-gradient-to-b from-slate-50/50 to-white">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-indigo-600 shadow-lg shadow-indigo-200 p-3.5 rounded-2xl text-white transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shrink-0">
                      <BookOpen className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-xl tracking-tight leading-tight line-clamp-1" title={subject.name}>{subject.name}</h3>
                      <span className="inline-flex items-center rounded-xl bg-white border border-slate-200 px-3 py-1 text-[10px] font-black text-slate-500 font-mono mt-2 tracking-widest shadow-sm" dir="ltr">
                        {subject.code}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0 shrink-0">
                    <button onClick={() => { setCurrentSubject(subject); setIsSubjectModalOpen(true); }} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100 bg-white" title="تعديل المادة">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => setSubjectToDelete(subject.id)} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100 bg-white" title="حذف المادة">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="mt-8 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Users className="h-4 w-4 text-indigo-400" /> طاقم التدريس ({subject.teachers.length})
                    </h4>
                  </div>
                  
                  {subject.teachers.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                      {subject.teachers.map(teacher => {
                        const isHOD = teacher.department_heads && teacher.department_heads.some(dh => dh.subject_id === subject.id);
                        return (
                          <div key={teacher.id} className={`flex items-center gap-3 text-sm text-slate-700 bg-white p-3 rounded-2xl border transition-all group/teacher ${isHOD ? 'border-amber-200 shadow-sm shadow-amber-50' : 'border-slate-100 hover:border-indigo-100 hover:shadow-sm'}`}>
                            <div className={`h-10 w-10 rounded-[1rem] flex items-center justify-center font-black border shrink-0 transition-colors ${isHOD ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-100 group-hover/teacher:bg-indigo-50 group-hover/teacher:text-indigo-600'}`}>
                              {isHOD ? <Crown className="w-5 h-5 drop-shadow-sm" /> : (teacher.user?.full_name?.charAt(0) || 'أ')}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className={`font-black truncate ${isHOD ? 'text-amber-900' : 'text-slate-900'}`}>{teacher.user?.full_name || 'بدون اسم'}</span>
                              <span className="text-[10px] text-slate-400 font-bold truncate mt-0.5">{isHOD ? 'رئيس القسم' : teacher.specialization}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 px-4 rounded-3xl bg-slate-50 border border-dashed border-slate-200">
                      <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-bold">لم يتم تعيين طاقم لهذه المادة بعد</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 pt-0 bg-white mt-auto border-t border-slate-50">
                <button onClick={() => openAssignModal(subject)} className="w-full flex items-center justify-center gap-3 rounded-[1.5rem] bg-slate-50 px-4 py-4 text-sm font-black text-indigo-600 shadow-sm border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 hover:shadow-md transition-all active:scale-[0.98]">
                  <Users className="h-5 w-5" /> إدارة وتعيين المعلمين
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity" />
          </Dialog.Overlay>
          <Dialog.Content asChild>
            <motion.div initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-45%' }} animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }} exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-45%' }} className="fixed left-[50%] top-[50%] z-50 w-full max-w-md rounded-[2.5rem] bg-white p-10 shadow-2xl focus:outline-none overflow-hidden border border-slate-100" dir="rtl">
              <div className="flex items-center justify-between mb-8">
                <Dialog.Title className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><BookOpen className="w-5 h-5"/></div>
                  {currentSubject.id ? 'تعديل المادة' : 'إضافة مادة'}
                </Dialog.Title>
                <Dialog.Close className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200">
                  <X className="h-5 w-5" />
                </Dialog.Close>
              </div>
              
              <form onSubmit={handleSaveSubject} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">اسم المادة</label>
                  <input type="text" id="name" required className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm transition-all font-bold outline-none" placeholder="مثال: الرياضيات" value={currentSubject.name || ''} onChange={(e) => setCurrentSubject({...currentSubject, name: e.target.value})} />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="code" className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">الرمز التعريفي</label>
                  <input type="text" id="code" required className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm transition-all font-bold outline-none text-left font-mono" dir="ltr" placeholder="MATH101" value={currentSubject.code || ''} onChange={(e) => setCurrentSubject({...currentSubject, code: e.target.value.toUpperCase()})} />
                  <p className="text-[10px] text-amber-600 font-bold bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 flex items-center gap-1.5"><AlertCircle className="w-3 h-3"/> يفضل كتابته بالإنجليزية ليكون مرجعاً برمجياً.</p>
                </div>
                
                <div className="mt-10 flex flex-col sm:flex-row-reverse gap-3 pt-6 border-t border-slate-100">
                  <button type="submit" disabled={isSubmitting || !currentSubject.name || !currentSubject.code} className="inline-flex w-full justify-center rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 sm:w-auto">
                    {isSubmitting ? 'جاري الحفظ...' : 'اعتماد وحفظ'}
                  </button>
                  <Dialog.Close asChild>
                    <button type="button" className="inline-flex w-full justify-center rounded-2xl bg-white px-8 py-4 text-sm font-black text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-all sm:w-auto">إلغاء</button>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity" />
          </Dialog.Overlay>
          <Dialog.Content asChild>
            <motion.div initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-45%' }} animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }} exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-45%' }} className="fixed left-[50%] top-[50%] z-50 w-full max-w-xl rounded-[3rem] bg-white p-10 shadow-2xl focus:outline-none flex flex-col max-h-[85vh] overflow-hidden border border-slate-100" dir="rtl">
              <div className="flex items-center justify-between mb-8 flex-shrink-0">
                <div className="space-y-1">
                  <Dialog.Title className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl"><Users className="w-6 h-6"/></div>
                    تعيين المعلمين
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-slate-500 font-bold mt-2">
                    اربط المعلمين المتخصصين بمادة <span className="text-indigo-600 font-black bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{subjects.find(s => s.id === selectedSubjectId)?.name}</span>
                  </Dialog.Description>
                </div>
                <Dialog.Close className="p-3 text-slate-400 hover:text-slate-600 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200">
                  <X className="h-6 w-6" />
                </Dialog.Close>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-3 mb-8 custom-scrollbar">
                {allTeachers.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                    <User className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <p className="text-slate-500 font-bold text-sm">لا يوجد معلمين مسجلين في النظام.</p>
                  </div>
                ) : (
                  allTeachers.map(teacher => {
                    const isSelected = selectedTeacherIds.includes(teacher.id);
                    const isHODForThis = teacher.department_heads?.some(dh => dh.subject_id === selectedSubjectId);
                    return (
                      <div 
                        key={teacher.id}
                        onClick={() => toggleTeacherSelection(teacher.id)}
                        className={`flex items-center justify-between p-4 rounded-[2rem] border-2 cursor-pointer transition-all duration-300 ${
                          isSelected ? 'bg-indigo-50/50 border-indigo-500 shadow-md shadow-indigo-100/50' : 'bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`h-14 w-14 rounded-[1.5rem] flex items-center justify-center flex-shrink-0 transition-colors duration-300 border ${
                            isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200' : 'bg-slate-50 text-slate-400 border-slate-200'
                          }`}>
                            {isHODForThis ? <Crown className="h-6 w-6" /> : <User className="h-6 w-6" />}
                          </div>
                          <div>
                            <h4 className={`font-black text-base leading-tight flex items-center gap-2 ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                              {teacher.user?.full_name || 'بدون اسم'}
                              {isHODForThis && <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200 shadow-sm">رئيس قسم</span>}
                            </h4>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border ${isSelected ? 'bg-white text-indigo-600 border-indigo-100 shadow-sm' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                {teacher.specialization || 'تخصص عام'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold font-mono bg-slate-50 px-2 rounded-lg border border-slate-100">
                                {teacher.national_id}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className={`h-7 w-7 rounded-xl border-2 flex items-center justify-center transition-all duration-300 shrink-0 ${
                          isSelected ? 'bg-indigo-600 border-indigo-600 scale-110 shadow-md shadow-indigo-200' : 'border-slate-200 bg-white'
                        }`}>
                          {isSelected && <Check className="h-4 w-4 text-white stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row-reverse gap-3 flex-shrink-0 pt-6 border-t border-slate-100">
                <button
                  onClick={handleSaveAssignments}
                  disabled={isSubmitting}
                  className="inline-flex w-full justify-center rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 sm:w-auto"
                >
                  {isSubmitting ? 'جاري الاعتماد...' : 'اعتماد التعيينات'}
                </button>
                <Dialog.Close asChild>
                  <button type="button" className="inline-flex w-full justify-center rounded-2xl bg-white px-8 py-4 text-sm font-black text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-all sm:w-auto">
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity" />
          </Dialog.Overlay>
          <Dialog.Content asChild>
            <motion.div initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-45%' }} animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }} exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-45%' }} className="fixed left-[50%] top-[50%] z-50 w-full max-w-md rounded-[2.5rem] bg-white p-10 shadow-2xl focus:outline-none overflow-hidden" dir="rtl">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-rose-50 border-4 border-rose-100 mb-6 transition-transform hover:scale-110">
                  <Trash2 className="h-10 w-10 text-rose-500" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-3">تأكيد الحذف</h3>
                <p className="text-slate-500 text-sm font-bold leading-relaxed">
                  هل أنت متأكد من حذف هذه المادة بشكل نهائي؟
                  <span className="text-rose-500 bg-rose-50 border border-rose-100 rounded-xl p-3 mt-4 block">
                    سيتم إزالة جميع المعلمين المرتبطين بها، ولا يمكن التراجع عن هذا الإجراء!
                  </span>
                </p>
              </div>
              <div className="flex flex-col sm:flex-row-reverse gap-3 pt-6 border-t border-slate-100">
                <button onClick={confirmDelete} className="inline-flex w-full justify-center rounded-2xl bg-rose-600 px-8 py-3.5 text-sm font-black text-white shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95 sm:w-auto">
                  نعم، حذف نهائي
                </button>
                <Dialog.Close asChild>
                  <button className="inline-flex w-full justify-center rounded-2xl bg-white px-8 py-3.5 text-sm font-black text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-all sm:w-auto">
                    تراجع
                  </button>
                </Dialog.Close>
              </div>
            </motion.div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </motion.div>
  );
}
