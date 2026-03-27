'use client';

import { useState, useEffect } from 'react';
import { Users, BookOpen, ChevronDown, Search, User, GraduationCap, Edit, Trash2, Plus, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useClassesSystem } from '@/hooks/useClassesSystem';
import { useAuth } from '@/context/auth-context';

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

  useEffect(() => {
    if (classes.length > 0 && !expandedClass) {
      setExpandedClass(classes[0].id);
      if (classes[0].sections.length > 0) {
        setExpandedSection(classes[0].sections[0].id);
      }
    }
  }, [classes, expandedClass]);

  const toggleClass = (classId: string) => {
    setExpandedClass(prev => (prev === classId ? null : classId));
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSection(prev => (prev === sectionId ? null : sectionId));
  };

  const handleModalSubmit = async () => {
    if (!modalConfig.type) return;

    setIsSubmitting(true);

    try {
      if (modalConfig.type === 'addClass') {
        await addClass(inputValue, inputLevel);
      }

      if (modalConfig.type === 'editClass') {
        await updateClass(modalConfig.data.id, inputValue, inputLevel);
      }

      if (modalConfig.type === 'deleteClass') {
        await deleteClass(modalConfig.data.id);
      }

      if (modalConfig.type === 'addSection') {
        await addSection(inputValue, modalConfig.data.classId);
      }

      if (modalConfig.type === 'editSection') {
        await updateSection(modalConfig.data.id, inputValue);
      }

      if (modalConfig.type === 'deleteSection') {
        await deleteSection(modalConfig.data.id);
      }

      closeModal();
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

  const filteredClasses = classes
    .map(cls => {
      if (!searchTerm) return cls;

      const filteredSections = cls.sections
        .map((sec: Section) => {
          const filteredStudents = sec.students.filter((stu: Student) =>
            stu.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            stu.national_id.includes(searchTerm)
          );

          return { ...sec, students: filteredStudents };
        })
        .filter(sec =>
          sec.students.length > 0 ||
          sec.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

      return { ...cls, sections: filteredSections };
    })
    .filter(cls =>
      cls.sections.length > 0 ||
      cls.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <motion.div className="space-y-8 pb-12">
      <div className="flex flex-col lg:flex-row lg:justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black">إدارة الفصول</h1>
          <p>
            {classes.reduce(
              (acc, cls) =>
                acc + cls.sections.reduce((s, sec) => s + sec.students.length, 0),
              0
            )} طالب
          </p>
        </div>

        <div className="flex gap-4">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث"
            className="border p-2 rounded-xl"
          />

          {isAdmin && (
            <button
              onClick={() => openModal('addClass', 'إضافة صف')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl"
            >
              إضافة
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {filteredClasses.map((cls) => (
          <div key={cls.id} className="border rounded-2xl p-4">
            <button onClick={() => toggleClass(cls.id)}>
              <h2>{cls.name}</h2>
            </button>

            {expandedClass === cls.id && (
              <div className="mt-4 space-y-4">
                {cls.sections.map((section) => (
                  <div key={section.id} className="border p-3 rounded-xl">
                    <button onClick={() => toggleSection(section.id)}>
                      {section.name}
                    </button>

                    {expandedSection === section.id && (
                      <div className="mt-2">
                        {section.students.map((stu) => (
                          <div key={stu.id}>
                            {stu.user.full_name} - {stu.national_id}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {modalConfig.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl w-96">
            <h3>{modalConfig.title}</h3>

            {modalConfig.type !== 'deleteClass' &&
              modalConfig.type !== 'deleteSection' && (
                <>
                  <input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="border p-2 w-full mt-3"
                  />
                  {modalConfig.type === 'addClass' && (
                    <input
                      type="number"
                      value={inputLevel}
                      onChange={(e) => setInputLevel(Number(e.target.value))}
                      className="border p-2 w-full mt-3"
                    />
                  )}
                </>
              )}

            <div className="flex justify-end gap-2 mt-4">
              <button onClick={closeModal}>إلغاء</button>
              <button onClick={handleModalSubmit}>
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
