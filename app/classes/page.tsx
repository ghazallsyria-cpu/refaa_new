'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, BookOpen, ChevronDown, ChevronUp, Search, User, GraduationCap, Edit, Trash2, Plus, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

type Student = {
  id: string;
  national_id: string;
  user: {
    full_name: string;
    email: string;
  };
};

type Section = {
  id: string;
  name: string;
  class_id: string;
  students: Student[];
};

type ClassData = {
  id: string;
  name: string;
  level: number;
  sections: Section[];
};

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

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

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (userData?.role === 'admin' || userData?.role === 'management') {
          setIsAdmin(true);
        }
      }
    };
    checkAdmin();
    fetchClassesData();
  }, []);

  const fetchClassesData = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // جلب دور المستخدم
      const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
      const isTeacher = userData?.role === 'teacher' || (typeof userData?.role === 'string' && userData?.role.includes('teacher'));

      // Fetch classes
      let classesQuery = supabase.from('classes').select('*').order('level');
      const { data: classesData, error: classesError } = await classesQuery;
        
      if (classesError) throw classesError;

      // Fetch sections
      let sectionsQuery = supabase.from('sections').select('*').order('name');
      
      // إذا كان معلماً، نجلب فصوله فقط
      if (isTeacher) {
        const { data: teacherSections } = await supabase
          .from('teacher_sections')
          .select('section_id')
          .eq('teacher_id', user.id);
        
        const sectionIds = teacherSections?.map(ts => ts.section_id) || [];
        sectionsQuery = sectionsQuery.in('id', sectionIds);
      }

      const { data: sectionsData, error: sectionsError } = await sectionsQuery;
        
      if (sectionsError) throw sectionsError;

      // Fetch students with user details
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          national_id,
          section_id,
          users (
            full_name,
            email
          )
        `);
        
      if (studentsError) throw studentsError;

      // Organize data
      const organizedClasses: ClassData[] = classesData.map((cls: any) => {
        const classSections = sectionsData
          .filter((sec: any) => sec.class_id === cls.id)
          .map((sec: any) => {
            const sectionStudents = studentsData
              .filter((stu: any) => stu.section_id === sec.id)
              .map((stu: any) => ({
                id: stu.id,
                national_id: stu.national_id,
                user: stu.users
              }));
              
            return {
              ...sec,
              students: sectionStudents
            };
          });
          
        return {
          ...cls,
          sections: classSections
        };
      }).filter((cls: any) => cls.sections.length > 0); // إخفاء الفصول التي لا تحتوي على أقسام للمعلم

      setClasses(organizedClasses);
      
      // Expand first class by default if exists
      if (organizedClasses.length > 0) {
        setExpandedClass(organizedClasses[0].id);
        if (organizedClasses[0].sections.length > 0) {
          setExpandedSection(organizedClasses[0].sections[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching classes data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleClass = (classId: string) => {
    if (expandedClass === classId) {
      setExpandedClass(null);
    } else {
      setExpandedClass(classId);
      // Automatically expand first section of this class
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
        const { error } = await supabase.from('classes').insert([{ name: inputValue, level: inputLevel }]);
        if (error) throw error;
      } else if (modalConfig.type === 'editClass') {
        const { error } = await supabase.from('classes').update({ name: inputValue, level: inputLevel }).eq('id', modalConfig.data.id);
        if (error) throw error;
      } else if (modalConfig.type === 'deleteClass') {
        const { error } = await supabase.from('classes').delete().eq('id', modalConfig.data.id);
        if (error) throw error;
      } else if (modalConfig.type === 'addSection') {
        const { error } = await supabase.from('sections').insert([{ name: inputValue, class_id: modalConfig.data.classId }]);
        if (error) throw error;
      } else if (modalConfig.type === 'editSection') {
        const { error } = await supabase.from('sections').update({ name: inputValue }).eq('id', modalConfig.data.id);
        if (error) throw error;
      } else if (modalConfig.type === 'deleteSection') {
        const { error } = await supabase.from('sections').delete().eq('id', modalConfig.data.id);
        if (error) throw error;
      }
      
      await fetchClassesData();
      closeModal();
    } catch (error: any) {
      console.error('Error in modal action:', error);
      // In a real app, show a toast notification here
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

  const filteredClasses = classes.map(cls => {
    if (!searchTerm) return cls;
    
    // Filter sections and students based on search term
    const filteredSections = cls.sections.map(sec => {
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12"
    >
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">إدارة الفصول والشعب</h1>
          <p className="text-slate-500 font-medium text-lg">
            تنظيم وعرض الطلاب حسب صفوفهم وشعبهم الدراسية 
            <span className="mx-2 text-indigo-600 bg-indigo-50/80 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold border border-indigo-100/50">
              {classes.reduce((acc, cls) => acc + cls.sections.reduce((sAcc, sec) => sAcc + sec.students.length, 0), 0)} طالب
            </span>
          </p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 glass-card p-2 rounded-3xl border-slate-200/60 shadow-xl shadow-slate-200/20"
        >
          <div className="relative group">
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="ابحث عن طالب أو رقم مدني..."
              className="block w-full sm:w-80 rounded-2xl border-0 py-3 pr-11 pl-4 text-slate-900 bg-slate-50/50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {isAdmin && (
            <button
              onClick={() => openModal('addClass', 'إضافة صف جديد')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
            >
              <Plus className="h-5 w-5" />
              إضافة صف جديد
            </button>
          )}
        </motion.div>
      </div>

      <div className="space-y-6">
        {filteredClasses.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 glass-card rounded-4xl border-slate-200/60 shadow-sm"
          >
            <div className="mx-auto h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <GraduationCap className="h-12 w-12 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">لا توجد نتائج بحث</h3>
            <p className="text-slate-500 max-w-xs mx-auto">لم يتم العثور على طلاب أو فصول تطابق معايير البحث الحالية.</p>
          </motion.div>
        ) : (
          filteredClasses.map((cls, idx) => (
            <motion.div 
              key={cls.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-card rounded-4xl border-slate-200/60 shadow-sm overflow-hidden transition-all hover:shadow-xl hover:shadow-indigo-100/30"
            >
              {/* Class Header */}
              <div className="w-full flex items-center justify-between p-6 bg-slate-50/30 hover:bg-slate-50/60 transition-colors border-b border-slate-100/60">
                <button
                  onClick={() => toggleClass(cls.id)}
                  className="flex-1 flex items-center justify-between text-right"
                >
                  <div className="flex items-center gap-5">
                    <div className="bg-white p-4 rounded-3xl text-indigo-600 shadow-sm border border-slate-100 ring-4 ring-indigo-50/50">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">{cls.name}</h2>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm font-bold text-slate-400 flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {cls.sections.length} شعب
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="text-sm font-bold text-indigo-500">
                          {cls.sections.reduce((acc, sec) => acc + sec.students.length, 0)} طالب مسجل
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <motion.div 
                      animate={{ rotate: expandedClass === cls.id ? 180 : 0 }}
                      className={`p-2 rounded-xl transition-all ${expandedClass === cls.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}
                    >
                      <ChevronDown className="h-5 w-5" />
                    </motion.div>
                  </div>
                </button>
                
                {isAdmin && (
                  <div className="flex items-center gap-2 mr-6 border-r border-slate-200/60 pr-6">
                    <button onClick={() => openModal('addSection', 'إضافة شعبة جديدة', { classId: cls.id })} className="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all" title="إضافة شعبة">
                      <Plus className="h-5 w-5" />
                    </button>
                    <button onClick={() => openModal('editClass', 'تعديل الصف', cls)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all" title="تعديل">
                      <Edit className="h-5 w-5" />
                    </button>
                    <button onClick={() => openModal('deleteClass', 'حذف الصف', cls)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all" title="حذف">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Sections List */}
              <AnimatePresence>
                {expandedClass === cls.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 space-y-6 bg-slate-50/20">
                      {cls.sections.length === 0 ? (
                        <div className="text-center py-10 bg-white/50 rounded-3xl border border-dashed border-slate-200">
                          <p className="text-slate-400 font-bold">لا توجد شعب دراسية مضافة لهذا الصف حتى الآن</p>
                        </div>
                      ) : (
                        cls.sections.map((section) => (
                          <div key={section.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all hover:border-indigo-100 hover:shadow-md">
                            {/* Section Header */}
                            <div className="w-full flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                              <button
                                onClick={() => toggleSection(section.id)}
                                className="flex-1 flex items-center justify-between text-right"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="bg-emerald-50 p-2 rounded-2xl text-emerald-600 border border-emerald-100">
                                    <Users className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-bold text-slate-800">شعبة {section.name}</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                      {section.students.length} طالب في هذه الشعبة
                                    </p>
                                  </div>
                                </div>
                                <motion.div 
                                  animate={{ rotate: expandedSection === section.id ? 180 : 0 }}
                                  className={`p-1.5 rounded-lg transition-all ${expandedSection === section.id ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </motion.div>
                              </button>
                              
                              {isAdmin && (
                                <div className="flex items-center gap-2 mr-4 border-r border-slate-100 pr-4">
                                  <button onClick={() => openModal('editSection', 'تعديل الشعبة', section)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="تعديل">
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => openModal('deleteSection', 'حذف الشعبة', section)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="حذف">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Students List */}
                            <AnimatePresence>
                              {expandedSection === section.id && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden border-t border-slate-50"
                                >
                                  {section.students.length === 0 ? (
                                    <div className="text-center py-12">
                                      <User className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                      <p className="text-slate-400 font-bold">لا يوجد طلاب مسجلين في هذه الشعبة</p>
                                    </div>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full">
                                        <thead>
                                          <tr className="bg-slate-50/50">
                                            <th scope="col" className="py-4 pl-4 pr-8 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">
                                              م
                                            </th>
                                            <th scope="col" className="py-4 px-6 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">
                                              اسم الطالب
                                            </th>
                                            <th scope="col" className="py-4 px-6 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">
                                              الرقم المدني
                                            </th>
                                            <th scope="col" className="py-4 px-8 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">
                                              الإجراءات
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                          {section.students.map((student, index) => (
                                            <tr key={student.id} className="hover:bg-slate-50/80 transition-colors group">
                                              <td className="py-4 pl-4 pr-8 whitespace-nowrap text-sm font-bold text-slate-400">
                                                {index + 1}
                                              </td>
                                              <td className="py-4 px-6 whitespace-nowrap">
                                                <div className="flex items-center">
                                                  <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 ml-4 flex-shrink-0 font-bold shadow-sm group-hover:scale-110 transition-transform">
                                                    {student.user?.full_name?.charAt(0) || '؟'}
                                                  </div>
                                                  <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                    {student.user?.full_name || 'بدون اسم'}
                                                  </div>
                                                </div>
                                              </td>
                                              <td className="py-4 px-6 whitespace-nowrap">
                                                <span className="inline-flex items-center rounded-xl bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 font-mono border border-slate-200">
                                                  {student.national_id}
                                                </span>
                                              </td>
                                              <td className="py-4 px-8 whitespace-nowrap text-sm">
                                                <Link href={`/students/${student.id}`} className="text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 px-4 py-2 rounded-xl transition-all hover:bg-indigo-100 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100">
                                                  عرض الملف
                                                </Link>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
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

      {/* Modal */}
      <AnimatePresence>
        {modalConfig.isOpen && (
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
                className="relative transform overflow-hidden rounded-4xl bg-white text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md"
              >
                <div className="bg-white px-8 pb-8 pt-10 sm:p-10">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{modalConfig.title}</h3>
                    <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-all">
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    {modalConfig.type?.includes('delete') ? (
                      <div className="flex flex-col items-center text-center">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50 mb-6 transition-transform hover:scale-110">
                          <AlertCircle className="h-10 w-10 text-red-600" />
                        </div>
                        <p className="text-slate-600 leading-relaxed">
                          هل أنت متأكد من رغبتك في حذف 
                          <span className="font-bold text-slate-900 mx-1">
                            {modalConfig.data?.name}
                          </span>؟
                          <br />
                          <span className="text-red-500 font-bold text-sm mt-3 block">
                            تحذير: هذا الإجراء لا يمكن التراجع عنه وقد يؤثر على الطلاب المرتبطين.
                          </span>
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700 mr-1">
                            الاسم (مثال: {modalConfig.type?.includes('Class') ? 'الصف الأول' : 'أ'})
                          </label>
                          <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all"
                            placeholder="أدخل الاسم..."
                            autoFocus
                          />
                        </div>
                        
                        {modalConfig.type?.includes('Class') && (
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 mr-1">
                              المستوى (رقم للترتيب)
                            </label>
                            <input
                              type="number"
                              value={inputLevel}
                              onChange={(e) => setInputLevel(parseInt(e.target.value) || 1)}
                              className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all"
                              min="1"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50/50 px-8 py-6 sm:flex sm:flex-row-reverse sm:px-10 gap-3">
                  <button
                    onClick={handleModalSubmit}
                    disabled={isSubmitting || (!modalConfig.type?.includes('delete') && !inputValue.trim())}
                    className={`inline-flex w-full justify-center rounded-2xl px-8 py-3 text-sm font-bold text-white shadow-lg transition-all active:scale-95 sm:w-auto
                      ${modalConfig.type?.includes('delete') 
                        ? 'bg-red-600 shadow-red-200 hover:bg-red-700' 
                        : 'bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700'} 
                      disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isSubmitting && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white ml-2"></div>}
                    {modalConfig.type?.includes('delete') ? 'تأكيد الحذف' : 'حفظ البيانات'}
                  </button>
                  <button
                    onClick={closeModal}
                    className="mt-3 inline-flex w-full justify-center rounded-2xl bg-white px-8 py-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 sm:mt-0 sm:w-auto transition-all"
                  >
                    إلغاء
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
