import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { OrganizedClass, OrganizedSection, OrganizedStudent } from '@/types';

export function useClassesSystem() {
  const { user, authRole, userRole } = useAuth() as any;
  const [classes, setClasses] = useState<OrganizedClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClassesData = useCallback(async (): Promise<void> => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // 🚀 التحقق المزدوج من الصلاحيات
      const currentRole = authRole || userRole;
      const isTeacher = currentRole === 'teacher';

      // 1. Fetch classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .order('level');
        
      if (classesError) throw classesError;

      // 2. Fetch sections
      let sectionsQuery = supabase.from('sections').select('*').order('name');
      
      if (isTeacher) {
        // 🚀 تحديد معرف المعلم بدقة فائقة
        let teacherId = user.id; 
        const { data: tByUserId } = await supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle();
        
        if (tByUserId?.id) {
            teacherId = tByUserId.id;
        } else {
            const { data: tById } = await supabase.from('teachers').select('id').eq('id', user.id).maybeSingle();
            if (tById?.id) teacherId = tById.id;
        }

        // 🚀 البحث عن الفصول في جدول الحصص (schedules) أولاً
        const { data: teacherSchedules } = await supabase.from('schedules').select('section_id').eq('teacher_id', teacherId);
        const scheduleSectionIds = (teacherSchedules || []).map(ts => ts.section_id).filter(Boolean);

        // 🚀 البحث كإجراء احتياطي في جدول الإسناد (teacher_sections)
        const { data: teacherSectionsFallback } = await supabase.from('teacher_sections').select('section_id').eq('teacher_id', teacherId);
        const fallbackSectionIds = (teacherSectionsFallback || []).map(ts => ts.section_id).filter(Boolean);

        // 🚀 دمج الفصول وإزالة المكرر
        const allSectionIds = Array.from(new Set([...scheduleSectionIds, ...fallbackSectionIds]));

        if (allSectionIds.length > 0) {
          sectionsQuery = sectionsQuery.in('id', allSectionIds);
        } else {
          // إذا لم يكن لديه أي فصل مسند، نعيد مصفوفة فارغة
          sectionsQuery = sectionsQuery.in('id', ['none']);
        }
      }

      const { data: sectionsData, error: sectionsError } = await sectionsQuery;
        
      if (sectionsError) throw sectionsError;

      // 3. Fetch students with user details
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

      // 4. Organize data 
      const organizedData: OrganizedClass[] = (classesData || []).map((cls) => {
        const classSections: OrganizedSection[] = (sectionsData || [])
          .filter((sec) => sec.class_id === cls.id)
          .map((sec) => {
            const sectionStudents: OrganizedStudent[] = (studentsData || [])
              .filter((stu) => stu.section_id === sec.id)
              .map((stu) => {
                const userData = Array.isArray(stu.users) ? stu.users[0] : stu.users;
                return {
                  id: stu.id,
                  national_id: stu.national_id || '',
                  user: {
                    full_name: userData?.full_name || 'بدون اسم',
                    email: userData?.email || '',
                  }
                };
              })
              .sort((a, b) => a.user.full_name.localeCompare(b.user.full_name, 'ar'));

            return {
              ...sec,
              students: sectionStudents
            };
          });

        return {
          ...cls,
          sections: classSections
        };
      });

      // If teacher, only show classes that have sections assigned to them
      const finalData = isTeacher 
        ? organizedData.filter(cls => cls.sections.length > 0)
        : organizedData;

      setClasses(finalData);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch classes';
      console.error('Error fetching classes:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.id, authRole, userRole]); 

  const addClass = useCallback(async (name: string, level: number): Promise<void> => {
    const response = await fetch('/api/classes/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, level }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to add class');
    await fetchClassesData();
  }, [fetchClassesData]);

  const updateClass = useCallback(async (id: string, name: string, level: number): Promise<void> => {
    const response = await fetch('/api/classes/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, level }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update class');
    await fetchClassesData();
  }, [fetchClassesData]);

  const deleteClass = useCallback(async (id: string): Promise<void> => {
    const response = await fetch(`/api/classes/delete?id=${id}`, {
      method: 'DELETE',
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to delete class');
    await fetchClassesData();
  }, [fetchClassesData]);

  const addSection = useCallback(async (name: string, classId: string): Promise<void> => {
    const response = await fetch('/api/sections/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, classId }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to add section');
    await fetchClassesData();
  }, [fetchClassesData]);

  const updateSection = useCallback(async (id: string, name: string): Promise<void> => {
    const response = await fetch('/api/sections/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update section');
    await fetchClassesData();
  }, [fetchClassesData]);

  const deleteSection = useCallback(async (id: string): Promise<void> => {
    const response = await fetch(`/api/sections/delete?id=${id}`, {
      method: 'DELETE',
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to delete section');
    await fetchClassesData();
  }, [fetchClassesData]);

  return {
    classes,
    loading,
    error,
    fetchClassesData,
    addClass,
    updateClass,
    deleteClass,
    addSection,
    updateSection,
    deleteSection
  };
}
