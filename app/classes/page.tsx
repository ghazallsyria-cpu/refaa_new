'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Users, BookOpen, ChevronDown, Search, User, 
  GraduationCap, Edit, Trash2, Plus, X, AlertCircle, 
  LayoutGrid, ArrowRight, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useClassesSystem } from '@/hooks/useClassesSystem';
import { useAuth } from '@/context/auth-context'; 
import { OrganizedSection, OrganizedStudent } from '@/types';

export default function ClassesPage() {
  const { authRole, isChecking } = useAuth() as any; 
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
  
  const [stageFilter, setStageFilter] = useState<'all' | 'middle' | 'high'>('all');

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: 'addClass' | 'editClass' | 'deleteClass' | 'addSection' | 'editSection' | 'deleteSection' | null;
    title: string;
    data: any;
  }>({ isOpen: false, type: null, title: '', data: null });
  const [inputValue, setInputValue] = useState('');
  const [inputLevel, setInputLevel] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = authRole === 'admin' || authRole === 'management';

  useEffect(() => {
    if (!isChecking && (authRole === 'admin' || authRole === 'management' || authRole === 'teacher')) {
      fetchClassesData();
    }
  }, [fetchClassesData, authRole, isChecking]);

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

  const filteredClasses = useMemo(() => {
    return classes.filter(cls => {
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
  }, [classes, stageFilter, searchTerm]);

  const totalStudents = useMemo(() => {
    return classes.reduce((acc, cls) => acc + cls.sections.reduce((sAcc, sec) => sAcc + sec.students.length, 0), 0);
  }, [classes]);

  if (isChecking) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#090b14] font-cairo text-slate-100">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
             <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)]"></div>
             <ShieldAlert className="absolute h-8 w-8 text-indigo-400 animate-pulse" />
          </div>
          <p className="text-indigo-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (authRole !== 'admin' && authRole !== 'management' && authRole !== 'teacher') {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#090b14] font-cairo p-4">
        <div className="glass-panel p-10 rounded-[2.5rem] text-center max-w-md w-full border border-rose-500/30 shadow-[0_0_40px_rgba(225,29,72,0.15)] bg-[#131836]/60 backdrop-blur-md">
           <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-6 opacity-80" />
           <h2 className="text-2xl font-black text-white mb-2">وصول مقيد</h2>
           <p className="text-slate-400 font-bold">هذه الصفحة مخصصة للإدارة والمعلمين فقط.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#090b14] font-cairo relative z-10">
        <div className="flex flex-col items-center gap-5">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-500/10 border-t-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.4)]"></div>
          <p className="text-slate-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري تحميل الفصول والطلاب...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 sm:space-y-8 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-cairo pt-6 relative min-h-[100dvh] bg-[#090b14]"
      dir="rtl"
    >
      <div className="fixed top-[-10%] right-[-10%] w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none z-0" />

      <div className="mb-2 relative z-10">
        <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-indigo-400 font-bold bg-[#131836]/60 backdrop-blur-xl border border-white/10 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl transition-all w-fit group text-xs sm:text-sm active:scale-95 shadow-sm hover:border-indigo-500/30">
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" /> العودة للوحة التحكم
        </Link>
      </div>

      <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-r from-[#02040a] via-[#0a0d1a] to-[#02040a] border border-white/10 p-6 sm:p-10 lg:p-12 text-white shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
        <div className="absolute inset-0 bg-blue-500/5 blur-[100px] pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
          <div className="space-y-3 sm:space-y-4 text-center lg:text-right w-full lg:w-auto">
            <div className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-[10px] sm:text-xs font-black text-blue-400 uppercase tracking-widest mb-2 shadow-[0_0_15px_rgba(59,130,246,0.2)] mx-auto lg:mx-0">
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>إدارة الهيكل الأكاديمي</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight drop-shadow-md text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
              الفصول والشعب الدراسية
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm lg:text-base font-bold max-w-2xl leading-relaxed mx-auto lg:mx-0 drop-shadow-sm">
              تصفح الهيكل التنظيمي للمدرسة، استعرض الطلاب المسجلين، {isAdmin && 'وأدر الفصول وصلاحياتها بكل سهولة.'}
              {!isAdmin && 'وتابع طلابك بفعالية.'}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 shrink-0 w-full lg:w-auto">
            <div className="rounded-[1.5rem] sm:rounded-[2rem] bg-[#0f1423]/80 p-4 sm:p-5 border border-white/5 flex flex-col items-center justify-center min-w-[120px] sm:min-w-[140px] shadow-inner flex-1 sm:flex-none">
              <p className="text-[10px] sm:text-xs text-blue-400/80 uppercase tracking-widest font-black mb-1 drop-shadow-sm">إجمالي الطلاب</p>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-black drop-shadow-md flex items-center gap-2 text-white">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
                {totalStudents}
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => openModal('addClass', 'إضافة صف جديد')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-[1.5rem] sm:rounded-[2rem] bg-gradient-to-r from-blue-600 to-indigo-600 px-6 sm:px-8 py-4 sm:py-5 text-sm sm:text-base font-black text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:from-blue-500 hover:to-indigo-500 transition-all active:scale-95 border border-blue-400/50 flex-1 sm:flex-none"
              >
                <Plus className="h-5 w-5" /> إضافة صف
              </button>
            )}
          </div>
        </div>
        <div className="absolute -left-10 -bottom-10 h-48 w-48 sm:h-64 sm:w-64 rounded-full bg-blue-500/10 blur-[80px] pointer-events-none"></div>
      </div>

      <div className="bg-[#131836]/60 backdrop-blur-xl p-4 sm:p-5 lg:p-6 rounded-[1.5rem] sm:rounded-[2.5rem] flex flex-col gap-4 relative z-20 border border-white/10 shadow-lg">
        
        <div className="flex items-center gap-2 overflow-x-auto w-full pb-2 custom-scrollbar snap-x">
          <button 
            onClick={() => setStageFilter('all')} 
            className={`snap-center px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-black text-xs sm:text-sm shrink-0 transition-all border active:scale-95 ${stageFilter === 'all' ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] border-indigo-400/50 scale-105' : 'bg-[#02040a]/60 text-slate-400 border-white/5 hover:bg-white/5 hover:text-white shadow-inner'}`}
          >
            جميع المراحل
          </button>
          <button 
            onClick={() => setStageFilter('middle')} 
            className={`snap-center px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-black text-xs sm:text-sm shrink-0 transition-all border active:scale-95 ${stageFilter === 'middle' ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] border-indigo-400/50 scale-105' : 'bg-[#02040a]/60 text-slate-400 border-white/5 hover:bg-white/5 hover:text-white shadow-inner'}`}
          >
            المرحلة المتوسطة (6 - 9)
          </button>
          <button 
            onClick={() => setStageFilter('high')} 
            className={`snap-center px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-black text-xs sm:text-sm shrink-0 transition-all border active:scale-95 ${stageFilter === 'high' ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] border-indigo-400/50 scale-105' : 'bg-[#02040a]/60 text-slate-400 border-white/5 hover:bg-white/5 hover:text-white shadow-inner'}`}
          >
            المرحلة الثانوية (10 - 12)
          </button>
        </div>

        <div className="relative w-full group">
          <div className="absolute inset-y-0 right-0 pr-4 sm:pr-5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="ابحث عن طالب بالاسم أو الرقم المدني، أو ابحث عن شعبة..."
            className="block w-full rounded-xl sm:rounded-2xl border border-white/5 py-3.5 sm:py-4 pr-10 sm:pr-14 pl-4 text-white bg-[#02040a]/60 focus:bg-[#02040a] ring-1 ring-inset ring-white/5 focus:ring-2 focus:ring-indigo-500/50 text-xs sm:text-sm font-bold transition-all shadow-inner outline-none placeholder:text-slate-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-5 sm:space-y-6 relative z-10">
        {filteredClasses.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 sm:py-20 bg-[#02040a]/40 rounded-[2rem] sm:rounded-[3rem] border border-dashed border-white/10 shadow-inner px-4"
          >
            <div className="mx-auto h-20 w-20 sm:h-24 sm:w-24 bg-[#0f1423]/50 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center mb-5 sm:mb-6 shadow-inner border border-white/5">
              <Search className="h-8 w-8 sm:h-10 sm:w-10 text-slate-500 drop-shadow-md" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight drop-shadow-sm">لا توجد نتائج</h3>
            <p className="text-slate-400 font-bold text-sm sm:text-base max-w-sm mx-auto leading-relaxed">لم يتم العثور على فصول أو طلاب مطابقين لبحثك في هذه المرحلة.</p>
          </motion.div>
        ) : (
          filteredClasses.map((cls, idx) => (
            <motion.div 
              layout
              key={cls.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`bg-[#131836]/40 backdrop-blur-md rounded-[1.5rem] sm:rounded-[2.5rem] border overflow-hidden transition-all duration-300 ${expandedClass === cls.id ? 'border-indigo-500/40 shadow-[0_0_30px_rgba(99,102,241,0.15)] bg-[#0f1423]/60' : 'border-white/5 hover:border-indigo-500/20 hover:bg-[#0f1423]/40'}`}
            >
              <div className="w-full flex flex-col md:flex-row md:items-center justify-between p-5 sm:p-6 lg:p-8 bg-[#02040a]/40 transition-colors relative group">
                <button
                  onClick={() => toggleClass(cls.id)}
                  className="flex-1 flex items-center text-right z-10 w-full"
                >
                  <div className="flex items-center gap-3 sm:gap-4 lg:gap-5 w-full min-w-0">
                    <div className={`p-3 sm:p-4 rounded-xl sm:rounded-[1.5rem] transition-colors shadow-inner border shrink-0 ${expandedClass === cls.id ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30' : 'bg-[#0f1423] text-indigo-500/70 border-white/5 group-hover:border-indigo-500/30 group-hover:bg-indigo-500/10 group-hover:text-indigo-400'}`}>
                      <BookOpen className="h-6 w-6 sm:h-7 sm:w-7" />
                    </div>
                    <div className="min-w-0 pr-1">
                      <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-white tracking-tight leading-tight mb-1.5 sm:mb-2 group-hover:text-indigo-400 transition-colors truncate drop-shadow-sm">{cls.name}</h2>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
                        <span className="text-[9px] sm:text-[10px] lg:text-xs font-black text-slate-300 bg-[#02040a]/80 px-2 sm:px-2.5 py-1 rounded-md sm:rounded-lg border border-white/5 flex items-center gap-1 sm:gap-1.5 shadow-inner shrink-0">
                          <LayoutGrid className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-500" /> {cls.sections.length} شعب
                        </span>
                        <span className="text-[9px] sm:text-[10px] lg:text-xs font-black text-indigo-400 bg-indigo-500/10 px-2 sm:px-2.5 py-1 rounded-md sm:rounded-lg border border-indigo-500/20 flex items-center gap-1 sm:gap-1.5 shadow-inner shrink-0">
                          <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {cls.sections.reduce((acc, sec) => acc + sec.students.length, 0)} طالب מסجل
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
                
                <div className="flex items-center justify-end gap-2 sm:gap-3 mt-4 md:mt-0 z-10 w-full md:w-auto border-t md:border-0 border-white/5 pt-4 md:pt-0">
                  {isAdmin && (
                    <div className="flex items-center gap-1.5 sm:gap-2 ml-2 sm:ml-4 border-l border-white/10 pl-2 sm:pl-4">
                      <button onClick={() => openModal('addSection', 'إضافة شعبة جديدة', { classId: cls.id })} className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-500/10 text-emerald-400 font-black hover:bg-emerald-500 hover:text-slate-950 rounded-lg sm:rounded-xl transition-all shadow-inner border border-emerald-500/20 active:scale-95" title="إضافة شعبة">
                        <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="text-[9px] sm:text-[10px] uppercase tracking-widest">شعبة</span>
                      </button>
                      <button onClick={() => openModal('editClass', 'تعديل الصف', cls)} className="p-1.5 sm:p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/20 rounded-lg sm:rounded-xl transition-all border border-transparent hover:border-indigo-500/30 active:scale-90" title="تعديل">
                        <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                      <button onClick={() => openModal('deleteClass', 'حذف الصف', cls)} className="p-1.5 sm:p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 rounded-lg sm:rounded-xl transition-all border border-transparent hover:border-rose-500/30 active:scale-90" title="حذف">
                        <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    </div>
                  )}
                  <button onClick={() => toggleClass(cls.id)} className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all shadow-inner border active:scale-90 ${expandedClass === cls.id ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-[#02040a]/60 text-slate-400 border-white/5 hover:bg-white/5 hover:text-white'}`}>
                    <motion.div animate={{ rotate: expandedClass === cls.id ? 180 : 0 }}>
                      <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6" />
                    </motion.div>
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {expandedClass === cls.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-[#090b14]/50 border-t border-white/5"
                  >
                    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
                      {cls.sections.length === 0 ? (
                        <div className="text-center py-10 sm:py-12 bg-[#02040a]/40 rounded-[1.5rem] sm:rounded-[2rem] border border-dashed border-white/10 shadow-inner px-4">
                          <LayoutGrid className="h-10 w-10 sm:h-12 sm:w-12 text-slate-600 mx-auto mb-3 sm:mb-4 drop-shadow-md" />
                          <p className="text-slate-400 font-bold text-xs sm:text-sm">لا توجد شعب دراسية مضافة لهذا الصف حتى الآن</p>
                        </div>
                      ) : (
                        cls.sections.map((section) => (
                          <div key={section.id} className="bg-[#0f1423]/60 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 shadow-inner overflow-hidden transition-all hover:border-blue-500/30">
                            
                            <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 border-b border-white/5 bg-[#02040a]/40 group">
                              <button
                                onClick={() => toggleSection(section.id)}
                                className="flex-1 flex items-center justify-between text-right w-full"
                              >
                                <div className="flex items-center gap-3 sm:gap-4">
                                  <div className="bg-blue-500/10 p-2.5 sm:p-3 rounded-lg sm:rounded-xl text-blue-400 border border-blue-500/20 shadow-inner group-hover:scale-110 transition-transform">
                                    <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                                  </div>
                                  <div>
                                    <h3 className="text-base sm:text-lg lg:text-xl font-black text-white drop-shadow-sm">شعبة {section.name}</h3>
                                    <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-0.5 sm:mt-1 flex items-center gap-1 sm:gap-1.5">
                                      <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {section.students.length} طالب
                                    </p>
                                  </div>
                                </div>
                                <motion.div 
                                  animate={{ rotate: expandedSection === section.id ? 180 : 0 }}
                                  className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all hidden sm:block shadow-inner border ${expandedSection === section.id ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-[#090b14]/80 text-slate-500 border-white/5 group-hover:border-white/10 group-hover:text-slate-300'}`}
                                >
                                  <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
                                </motion.div>
                              </button>
                              
                              {isAdmin && (
                                <div className="flex items-center gap-1.5 sm:gap-2 mt-3 sm:mt-0 border-t sm:border-0 border-white/5 pt-3 sm:pt-0 w-full sm:w-auto justify-end sm:mr-4 sm:border-r sm:pr-4">
                                  <button onClick={() => openModal('editSection', 'تعديل الشعبة', section)} className="p-1.5 sm:p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/20 rounded-md sm:rounded-lg transition-all border border-transparent hover:border-indigo-500/30 active:scale-90" title="تعديل">
                                    <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  </button>
                                  <button onClick={() => openModal('deleteSection', 'حذف الشعبة', section)} className="p-1.5 sm:p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 rounded-md sm:rounded-lg transition-all border border-transparent hover:border-rose-500/30 active:scale-90" title="حذف">
                                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  </button>
                                </div>
                              )}
                            </div>

                            <AnimatePresence>
                              {expandedSection === section.id && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden bg-[#02040a]/20 p-3 sm:p-4 lg:p-6"
                                >
                                  {section.students.length === 0 ? (
                                    <div className="text-center py-8 sm:py-10 bg-[#02040a]/40 rounded-[1.5rem] border border-dashed border-white/10 shadow-inner px-4">
                                      <User className="h-8 w-8 sm:h-10 sm:w-10 text-slate-600 mx-auto mb-2 sm:mb-3 drop-shadow-md" />
                                      <p className="text-slate-400 font-bold text-xs sm:text-sm">لا يوجد طلاب مسجلين في هذه الشعبة</p>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                                      {section.students.map((student, index) => (
                                        <div key={student.id} className="bg-[#0f1423]/60 p-3 sm:p-4 rounded-[1rem] sm:rounded-[1.5rem] border border-white/5 shadow-inner hover:border-indigo-500/30 hover:bg-[#0f1423] transition-all group flex items-center justify-between gap-3 sm:gap-4">
                                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-[#02040a] flex items-center justify-center text-indigo-400 font-black text-base sm:text-lg shadow-inner border border-white/5 shrink-0 group-hover:scale-105 group-hover:border-indigo-500/30 transition-all">
                                              {student.user?.full_name?.charAt(0) || 'ط'}
                                            </div>
                                            <div className="min-w-0 pr-1">
                                              <p className="font-black text-white text-xs sm:text-sm lg:text-base truncate group-hover:text-indigo-400 transition-colors drop-shadow-sm">
                                                {student.user?.full_name || 'بدون اسم'}
                                              </p>
                                              <div className="mt-1 sm:mt-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                {isAdmin ? (
                                                  <span className="inline-flex items-center bg-[#02040a]/80 px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-bold text-slate-400 font-mono border border-white/5 shadow-inner">
                                                    {student.national_id}
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex items-center bg-emerald-500/10 px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-black text-emerald-400 border border-emerald-500/20 shadow-inner">
                                                    <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 ml-1" /> مسجل
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                          <Link 
                                            href={`/students/${student.id}`} 
                                            className="shrink-0 h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-lg sm:rounded-xl bg-[#02040a] text-slate-500 hover:bg-indigo-500/20 hover:text-indigo-400 transition-all border border-white/5 hover:border-indigo-500/30 shadow-inner active:scale-95"
                                            title="عرض الملف الأكاديمي"
                                          >
                                            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 rotate-180" />
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

      <AnimatePresence>
        {modalConfig.isOpen && isAdmin && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-[#02040a]/90 backdrop-blur-md transition-opacity" 
                onClick={closeModal}
              ></motion.div>
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative transform overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-[#0f1423] text-right shadow-[0_20px_60px_rgba(0,0,0,0.8)] transition-all sm:my-8 sm:w-full sm:max-w-md border border-white/10 w-full"
                dir="rtl"
              >
                <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-8 sm:pt-10">
                  <div className="flex items-center justify-between mb-6 sm:mb-8">
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-3 drop-shadow-sm">
                      {modalConfig.type?.includes('delete') ? (
                        <div className="p-2 sm:p-2.5 bg-rose-500/10 text-rose-400 rounded-lg sm:rounded-xl border border-rose-500/20 shadow-inner"><Trash2 className="w-5 h-5 sm:w-6 sm:h-6"/></div>
                      ) : (
                        <div className="p-2 sm:p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg sm:rounded-xl border border-indigo-500/20 shadow-inner"><Edit className="w-5 h-5 sm:w-6 sm:h-6"/></div>
                      )}
                      {modalConfig.title}
                    </h3>
                    <button onClick={closeModal} className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-400 rounded-lg sm:rounded-xl hover:bg-rose-500/10 transition-all bg-[#02040a] border border-white/5 shadow-inner active:scale-90">
                      <X className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-5 sm:space-y-6">
                    {modalConfig.type?.includes('delete') ? (
                      <div className="flex flex-col items-center text-center p-5 sm:p-6 bg-rose-950/40 rounded-[1.5rem] sm:rounded-3xl border border-rose-500/30 shadow-inner">
                        <AlertCircle className="h-10 w-10 sm:h-14 sm:w-14 text-rose-400 mb-3 sm:mb-4 animate-pulse drop-shadow-md" />
                        <p className="text-slate-300 font-bold leading-relaxed text-sm sm:text-base">
                          هل أنت متأكد من رغبتك في حذف <br/>
                          <span className="font-black text-white text-base sm:text-xl block mt-1 sm:mt-2 drop-shadow-sm">&quot;{modalConfig.data?.name}&quot;</span>
                        </p>
                        <span className="text-rose-400 font-black text-[9px] sm:text-[10px] mt-3 sm:mt-4 block bg-[#02040a]/80 px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl shadow-inner border border-rose-500/20 uppercase tracking-widest">
                          تحذير: الإجراء لا رجعة فيه وقد يؤثر على السجلات.
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2 sm:space-y-3 glass-panel p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border-white/5 shadow-inner">
                          <label className="text-[10px] sm:text-xs font-black text-slate-400 block uppercase tracking-widest pl-1">
                            الاسم (مثال: {modalConfig.type?.includes('Class') ? 'الصف الأول' : 'أ'}) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="block w-full rounded-xl sm:rounded-2xl border-0 py-3.5 sm:py-4 px-4 sm:px-5 text-white bg-[#02040a]/60 ring-1 ring-inset ring-white/5 placeholder:text-slate-600 focus:ring-2 focus:ring-inset focus:ring-indigo-500/50 font-bold transition-all shadow-inner outline-none text-sm sm:text-base"
                            placeholder="أدخل الاسم هنا..."
                            autoFocus
                          />
                        </div>
                        
                        {modalConfig.type?.includes('Class') && (
                          <div className="space-y-2 sm:space-y-3 glass-panel p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border-white/5 shadow-inner mt-4 sm:mt-6">
                            <label className="text-[10px] sm:text-xs font-black text-slate-400 block uppercase tracking-widest pl-1">
                              مستوى الصف (لأغراض الترتيب)
                            </label>
                            <input
                              type="number"
                              value={inputLevel}
                              onChange={(e) => setInputLevel(parseInt(e.target.value) || 1)}
                              className="block w-full rounded-xl sm:rounded-2xl border-0 py-3.5 sm:py-4 px-4 sm:px-5 text-white bg-[#02040a]/60 ring-1 ring-inset ring-white/5 placeholder:text-slate-600 focus:ring-2 focus:ring-inset focus:ring-indigo-500/50 font-bold transition-all shadow-inner outline-none text-sm sm:text-base"
                              min="1"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-[#02040a]/60 px-6 sm:px-8 py-5 sm:py-6 border-t border-white/5 flex flex-col sm:flex-row-reverse gap-3">
                  <button
                    onClick={handleModalSubmit}
                    disabled={isSubmitting || (!modalConfig.type?.includes('delete') && !inputValue.trim())}
                    className={`inline-flex w-full justify-center items-center rounded-xl sm:rounded-2xl px-6 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-white shadow-lg transition-all active:scale-95 sm:w-auto border
                      ${modalConfig.type?.includes('delete') 
                        ? 'bg-gradient-to-r from-rose-600 to-red-600 border-rose-400/50 shadow-[0_0_15px_rgba(225,29,72,0.4)] hover:from-rose-500 hover:to-red-500' 
                        : 'bg-gradient-to-r from-indigo-600 to-blue-600 border-indigo-400/50 shadow-[0_0_15px_rgba(79,70,229,0.4)] hover:from-indigo-500 hover:to-blue-500'} 
                      disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isSubmitting ? (
                      <div className="h-4 w-4 sm:h-5 sm:w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : modalConfig.type?.includes('delete') ? 'تأكيد الحذف النهائي' : 'حفظ البيانات'}
                  </button>
                  <button
                    onClick={closeModal}
                    className="inline-flex w-full justify-center items-center rounded-xl sm:rounded-2xl bg-[#0f1423] px-6 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-slate-300 shadow-inner border border-white/5 hover:bg-white/5 hover:text-white sm:w-auto transition-all active:scale-95"
                  >
                    إلغاء الأمر
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 12px; border: 1px solid #02040a; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4f46e5; }
      `}} />
    </motion.div>
  );
}
