'use client';

import { useState, useEffect } from 'react';
import { 
  Users, BookOpen, ChevronDown, Search, User, 
  GraduationCap, Edit, Trash2, Plus, X, AlertCircle, 
  ShieldCheck, LayoutGrid, Star, CheckCircle2, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useClassesSystem } from '@/hooks/useClassesSystem';
import { useAuth } from '@/context/auth-context';
import { OrganizedClass, OrganizedSection, OrganizedStudent } from '@/types';

export default function ClassesPage() {
  const { userRole } = useAuth();
  const { 
    classes, 
    loading, 
    fetchClassesData, 
    addClass, 
    updateClass, 
    deleteClass, 
    addSection, 
    updateSection, 
    deleteSection 
  } = useClassesSystem();

  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 🚀 فلتر المرحلة (سحر التنظيم الذكي)
  const [stageFilter, setStageFilter] = useState<'all' | 'middle' | 'high'>('all');

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: 'addClass' | 'editClass' | 'deleteClass' | 'addSection' | 'editSection' | 'deleteSection' | null;
    title: string;
    data: any;
  }>({ isOpen: false, type: null, title: '', data: null });
  const [inputValue, setInputValue] = useState('');
  const [inputLevel, setInputLevel] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = userRole === 'admin' || userRole === 'management';

  useEffect(() => {
    fetchClassesData();
  }, [fetchClassesData]);

  // 🚀 عند تغيير التبويب، نغلق الفصل المفتوح ليفتح أول فصل في المرحلة الجديدة تلقائياً
  useEffect(() => {
    setExpandedClass(null);
  }, [stageFilter]);

  useEffect(() => {
    if (classes.length > 0 && !expandedClass) {
      const filteredForFirst = classes.filter(cls => {
        if (stageFilter === 'middle') return cls.level >= 6 && cls.level <= 9;
        if (stageFilter === 'high') return cls.level >= 10 && cls.level <= 12;
        return true;
      });
      
      if (filteredForFirst.length > 0) {
        setExpandedClass(filteredForFirst[0].id);
        if (filteredForFirst[0].sections.length > 0) {
          setExpandedSection(filteredForFirst[0].sections[0].id);
        }
      }
    }
  }, [classes, expandedClass, stageFilter]);

  const toggleClass = (classId: string) => {
    if (expandedClass === classId) {
      setExpandedClass(null);
    } else {
      setExpandedClass(classId);
      const cls = classes.find(c => c.id === classId);
      if (cls && cls.sections.length > 0) {
        setExpandedSection(cls.sections[0].id);
      }
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const handleModalSubmit = async () => {
    if (!modalConfig.type) return;
    setIsSubmitting(true);
    try {
      if (modalConfig.type === 'addClass') {
        await addClass(inputValue, inputLevel);
      } else if (modalConfig.type === 'editClass') {
        await updateClass(modalConfig.data.id, inputValue, inputLevel);
      } else if (modalConfig.type === 'deleteClass') {
        await deleteClass(modalConfig.data.id);
      } else if (modalConfig.type === 'addSection') {
        await addSection(inputValue, modalConfig.data.classId);
      } else if (modalConfig.type === 'editSection') {
        await updateSection(modalConfig.data.id, inputValue);
      } else if (modalConfig.type === 'deleteSection') {
        await deleteSection(modalConfig.data.id);
      }
      closeModal();
    } catch (error: any) {
      console.error('Error in modal action:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setModalConfig({ isOpen: false, type: null, title: '', data: null });
    setInputValue('');
    setInputLevel(1);
  };

  const openModal = (type: any, title: string, data: any = null) => {
    setModalConfig({ isOpen: true, type, title, data });
    if (type === 'editClass') {
      setInputValue(data.name);
      setInputLevel(data.level);
    } else if (type === 'editSection') {
      setInputValue(data.name);
    } else {
      setInputValue('');
      setInputLevel(1);
    }
  };

  // 🚀 الفلترة الديناميكية المزدوجة (للمراحل + البحث النصي)
  const filteredClasses = classes.filter(cls => {
    if (stageFilter === 'middle') return cls.level >= 6 && cls.level <= 9;
    if (stageFilter === 'high') return cls.level >= 10 && cls.level <= 12;
    return true;
  }).map(cls => {
    if (!searchTerm) return cls;
    
    const filteredSections = cls.sections.map((sec: OrganizedSection) => {
      const filteredStudents = sec.students.filter(stu => 
        stu.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stu.national_id.includes(searchTerm)
      );
      return { ...sec, students: filteredStudents };
    }).filter(sec => sec.students.length > 0 || sec.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return { ...cls, sections: filteredSections };
  }).filter(cls => cls.sections.length > 0 || cls.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-slate-500 font-bold animate-pulse tracking-widest">جاري تحميل الفصول...</p>
        </div>
      </div>
    );
  }

  const totalStudents = classes.reduce((acc, cls) => acc + cls.sections.reduce((sAcc, sec) => sAcc + sec.students.length, 0), 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      dir="rtl"
    >
      {/* 🚀 Hero Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] sm:rounded-[3rem] bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 p-8 sm:p-12 text-white shadow-2xl shadow-indigo-200/50">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-widest backdrop-blur-sm shadow-sm">
              <LayoutGrid className="w-3.5 h-3.5 text-blue-300" />
              <span>إدارة الهيكل الأكاديمي</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight drop-shadow-md">
              الفصول والشعب الدراسية
            </h1>
            <p className="text-indigo-100 text-base sm:text-lg font-bold opacity-90 max-w-2xl">
              تصفح الهيكل التنظيمي للمدرسة، استعرض الطلاب المسجلين، {isAdmin && 'وأدر الفصول وصلاحياتها بكل سهولة.'}
              {!isAdmin && 'وتابع طلابك بفعالية.'}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
            <div className="rounded-[2rem] bg-white/10 p-5 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center min-w-[140px] shadow-lg">
              <p className="text-xs text-indigo-200 uppercase tracking-widest font-black mb-1">إجمالي الطلاب</p>
              <p className="text-4xl font-black drop-shadow-md flex items-center gap-2">
                <Users className="h-6 w-6 text-blue-300" />
                {totalStudents}
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => openModal('addClass', 'إضافة صف جديد')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-[2rem] bg-white px-8 py-5 text-base font-black text-indigo-600 shadow-xl hover:bg-indigo-50 transition-all hover:scale-105 active:scale-95 hover:shadow-indigo-500/20 h-full"
              >
                <Plus className="h-6 w-6" /> إضافة صف
              </button>
            )}
          </div>
        </div>
        <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
      </div>

      {/* 🚀 Smart Search Bar & Filters */}
      <div className="bg-white/80 backdrop-blur-xl p-4 sm:p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col gap-4 sticky top-24 z-30">
        
        {/* المرحلة Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto w-full pb-2 scrollbar-hide">
          <button 
            onClick={() => setStageFilter('all')} 
            className={`px-5 py-2.5 rounded-xl font-black text-sm shrink-0 transition-all ${stageFilter === 'all' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
          >
            جميع المراحل
          </button>
          <button 
            onClick={() => setStageFilter('middle')} 
            className={`px-5 py-2.5 rounded-xl font-black text-sm shrink-0 transition-all ${stageFilter === 'middle' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
          >
            المرحلة المتوسطة (6 - 9)
          </button>
          <button 
            onClick={() => setStageFilter('high')} 
            className={`px-5 py-2.5 rounded-xl font-black text-sm shrink-0 transition-all ${stageFilter === 'high' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
          >
            المرحلة الثانوية (10 - 12)
          </button>
        </div>

        <div className="relative w-full group">
          <div className="absolute inset-y-0 right-0 pr-5 flex items-center pointer-events-none">
            <Search className="h-6 w-6 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="ابحث عن طالب بالاسم أو الرقم المدني، أو ابحث عن شعبة..."
            className="block w-full rounded-2xl border-0 py-4 pr-14 pl-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-base font-bold transition-all shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 🚀 Classes Content */}
      <div className="space-y-6">
        {filteredClasses.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 bg-white/50 backdrop-blur-sm rounded-[3rem] border border-dashed border-slate-300 shadow-sm"
          >
            <div className="mx-auto h-24 w-24 bg-slate-100 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner border border-slate-200">
              <Search className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">لا توجد نتائج</h3>
            <p className="text-slate-500 font-bold text-lg">لم يتم العثور على فصول أو طلاب مطابقين لبحثك في هذه المرحلة.</p>
          </motion.div>
        ) : (
          filteredClasses.map((cls, idx) => (
            <motion.div 
              layout
              key={cls.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`bg-white rounded-[2.5rem] border-2 shadow-sm overflow-hidden transition-all ${expandedClass === cls.id ? 'border-indigo-200 shadow-xl shadow-indigo-100/50' : 'border-slate-100 hover:border-indigo-100 hover:shadow-md'}`}
            >
              {/* 🎯 Class Header Folder */}
              <div className="w-full flex flex-col md:flex-row md:items-center justify-between p-6 sm:p-8 bg-gradient-to-l from-slate-50 to-white transition-colors relative group">
                <button
                  onClick={() => toggleClass(cls.id)}
                  className="flex-1 flex items-center text-right z-10 w-full"
                >
                  <div className="flex items-center gap-5">
                    <div className={`p-4 sm:p-5 rounded-[1.5rem] transition-colors shadow-sm border ${expandedClass === cls.id ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-indigo-600 border-slate-200 group-hover:border-indigo-200 group-hover:bg-indigo-50'}`}>
                      <BookOpen className="h-7 w-7 sm:h-8 sm:w-8" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight mb-2 group-hover:text-indigo-700 transition-colors">{cls.name}</h2>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <span className="text-xs sm:text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5">
                          <LayoutGrid className="h-4 w-4" /> {cls.sections.length} شعب
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 flex items-center gap-1.5">
                          <Users className="h-4 w-4" /> {cls.sections.reduce((acc, sec) => acc + sec.students.length, 0)} طالب مسجل
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
                
                <div className="flex items-center justify-end gap-3 mt-4 md:mt-0 z-10 w-full md:w-auto border-t md:border-0 border-slate-100 pt-4 md:pt-0">
                  {isAdmin && (
                    <div className="flex items-center gap-2 ml-4 border-l border-slate-200 pl-4">
                      <button onClick={() => openModal('addSection', 'إضافة شعبة جديدة', { classId: cls.id })} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-500 hover:text-white rounded-xl transition-all shadow-sm border border-emerald-100 active:scale-95" title="إضافة شعبة">
                        <Plus className="h-4 w-4" /> <span className="text-xs">شعبة</span>
                      </button>
                      <button onClick={() => openModal('editClass', 'تعديل الصف', cls)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100" title="تعديل">
                        <Edit className="h-5 w-5" />
                      </button>
                      <button onClick={() => openModal('deleteClass', 'حذف الصف', cls)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100" title="حذف">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                  <button onClick={() => toggleClass(cls.id)} className={`p-3 rounded-2xl transition-all shadow-sm border ${expandedClass === cls.id ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}>
                    <motion.div animate={{ rotate: expandedClass === cls.id ? 180 : 0 }}>
                      <ChevronDown className="h-6 w-6" />
                    </motion.div>
                  </button>
                </div>
              </div>

              {/* 🎯 Sections & Students Area */}
              <AnimatePresence>
                {expandedClass === cls.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-slate-50/50"
                  >
                    <div className="p-4 sm:p-8 space-y-6">
                      {cls.sections.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-slate-300">
                          <LayoutGrid className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                          <p className="text-slate-500 font-bold text-lg">لا توجد شعب دراسية مضافة لهذا الصف حتى الآن</p>
                        </div>
                      ) : (
                        cls.sections.map((section) => (
                          <div key={section.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-indigo-200 hover:shadow-md">
                            
                            {/* Section Header */}
                            <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/50 to-white group">
                              <button
                                onClick={() => toggleSection(section.id)}
                                className="flex-1 flex items-center justify-between text-right w-full"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="bg-blue-50 p-3 rounded-xl text-blue-600 border border-blue-100 shadow-sm group-hover:scale-110 transition-transform">
                                    <Users className="h-6 w-6" />
                                  </div>
                                  <div>
                                    <h3 className="text-xl font-black text-slate-800">شعبة {section.name}</h3>
                                    <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-1.5">
                                      <GraduationCap className="w-4 h-4" /> {section.students.length} طالب
                                    </p>
                                  </div>
                                </div>
                                <motion.div 
                                  animate={{ rotate: expandedSection === section.id ? 180 : 0 }}
                                  className={`p-2 rounded-xl transition-all hidden sm:block ${expandedSection === section.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}
                                >
                                  <ChevronDown className="h-5 w-5" />
                                </motion.div>
                              </button>
                              
                              {isAdmin && (
                                <div className="flex items-center gap-2 mt-4 sm:mt-0 border-t sm:border-0 border-slate-100 pt-3 sm:pt-0 w-full sm:w-auto justify-end sm:mr-4 sm:border-r sm:pr-4">
                                  <button onClick={() => openModal('editSection', 'تعديل الشعبة', section)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="تعديل">
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => openModal('deleteSection', 'حذف الشعبة', section)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="حذف">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* 🚀 Students Grid */}
                            <AnimatePresence>
                              {expandedSection === section.id && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden bg-slate-50/30 p-4 sm:p-6"
                                >
                                  {section.students.length === 0 ? (
                                    <div className="text-center py-10 bg-white rounded-[1.5rem] border border-dashed border-slate-200">
                                      <User className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                      <p className="text-slate-400 font-bold">لا يوجد طلاب مسجلين في هذه الشعبة</p>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                      {section.students.map((student, index) => (
                                        <div key={student.id} className="bg-white p-4 rounded-[1.5rem] border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group flex items-center justify-between gap-4">
                                          <div className="flex items-center gap-3 min-w-0">
                                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-700 font-black text-lg shadow-inner border border-indigo-200 shrink-0 group-hover:scale-105 transition-transform">
                                              {student.user?.full_name?.charAt(0) || 'ط'}
                                            </div>
                                            <div className="min-w-0">
                                              <p className="font-black text-slate-900 text-sm sm:text-base truncate group-hover:text-indigo-700 transition-colors">
                                                {student.user?.full_name || 'بدون اسم'}
                                              </p>
                                              <div className="mt-1 flex items-center gap-2">
                                                {isAdmin ? (
                                                  <span className="inline-flex items-center bg-slate-100 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold text-slate-500 font-mono border border-slate-200">
                                                    {student.national_id}
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex items-center bg-emerald-50 px-2 py-0.5 rounded-md text-[10px] font-black text-emerald-600 border border-emerald-100">
                                                    <CheckCircle2 className="w-3 h-3 ml-1" /> مسجل فعال
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                          <Link 
                                            href={`/students/${student.id}`} 
                                            className="shrink-0 h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100 hover:border-indigo-200"
                                            title="عرض الملف الأكاديمي"
                                          >
                                            <ArrowRight className="w-5 h-5 rotate-180" />
                                          </Link>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>

      {/* 🚀 Modals (Secured & Styled) */}
      <AnimatePresence>
        {modalConfig.isOpen && isAdmin && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
                onClick={closeModal}
              ></motion.div>
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative transform overflow-hidden rounded-[2.5rem] bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-slate-100"
                dir="rtl"
              >
                <div className="bg-white px-8 pb-8 pt-10 sm:p-10">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                      {modalConfig.type?.includes('delete') ? (
                        <div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><Trash2 className="w-6 h-6"/></div>
                      ) : (
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Edit className="w-6 h-6"/></div>
                      )}
                      {modalConfig.title}
                    </h3>
                    <button onClick={closeModal} className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-all bg-slate-50">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    {modalConfig.type?.includes('delete') ? (
                      <div className="flex flex-col items-center text-center p-6 bg-rose-50/50 rounded-3xl border border-rose-100">
                        <AlertCircle className="h-14 w-14 text-rose-500 mb-4 animate-pulse" />
                        <p className="text-slate-700 font-bold leading-relaxed text-lg">
                          هل أنت متأكد من رغبتك في حذف <br/>
                          <span className="font-black text-rose-600 text-xl block mt-2">&quot;{modalConfig.data?.name}&quot;</span>
                        </p>
                        <span className="text-rose-500/80 font-bold text-xs mt-4 block bg-white px-3 py-2 rounded-xl shadow-sm">
                          تحذير: الإجراء لا رجعة فيه وقد يؤثر على السجلات.
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          <label className="text-sm font-black text-slate-700 block">
                            الاسم (مثال: {modalConfig.type?.includes('Class') ? 'الصف الأول' : 'أ'})
                          </label>
                          <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 font-bold transition-all shadow-inner"
                            placeholder="أدخل الاسم هنا..."
                            autoFocus
                          />
                        </div>
                        
                        {modalConfig.type?.includes('Class') && (
                          <div className="space-y-3 mt-6">
                            <label className="text-sm font-black text-slate-700 block">
                              مستوى الصف (لأغراض الترتيب)
                            </label>
                            <input
                              type="number"
                              value={inputLevel}
                              onChange={(e) => setInputLevel(parseInt(e.target.value) || 1)}
                              className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 font-bold transition-all shadow-inner"
                              min="1"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50/80 px-8 py-6 border-t border-slate-100 flex flex-col sm:flex-row-reverse gap-3">
                  <button
                    onClick={handleModalSubmit}
                    disabled={isSubmitting || (!modalConfig.type?.includes('delete') && !inputValue.trim())}
                    className={`inline-flex w-full justify-center items-center rounded-2xl px-8 py-4 text-base font-black text-white shadow-lg transition-all active:scale-95 sm:w-auto
                      ${modalConfig.type?.includes('delete') 
                        ? 'bg-rose-600 shadow-rose-200 hover:bg-rose-700' 
                        : 'bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700'} 
                      disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isSubmitting ? (
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : modalConfig.type?.includes('delete') ? 'تأكيد الحذف النهائي' : 'حفظ البيانات المكتوبة'}
                  </button>
                  <button
                    onClick={closeModal}
                    className="inline-flex w-full justify-center items-center rounded-2xl bg-white px-8 py-4 text-base font-black text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 sm:w-auto transition-all"
                  >
                    إلغاء الأمر
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
