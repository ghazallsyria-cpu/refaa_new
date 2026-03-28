import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export function useClassesSystem() {
  const { user, userRole } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClassesData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const isTeacher = userRole === 'teacher';
      const isAdminOrManagement = ['admin', 'management'].includes(userRole || '');

      // Fetch classes
      let classesQuery = supabase.from('classes').select('*').order('level');
      const { data: classesData, error: classesError } = await classesQuery;
        
      if (classesError) throw classesError;

      // Fetch sections
      let sectionsQuery = supabase.from('sections').select('*').order('name');
      
      if (isTeacher) {
        const { data: teacherSections } = await supabase
          .from('teacher_sections')
          .select('section_id')
          .eq('teacher_id', user.id);
        
        const sectionIds = teacherSections?.map(ts => ts.section_id) || [];
        if (sectionIds.length > 0) {
          sectionsQuery = sectionsQuery.in('id', sectionIds);
        } else {
          // If teacher has no sections, return empty sections
          sectionsQuery = sectionsQuery.in('id', ['none']);
        }
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
      const organizedData = classesData.map((cls: any) => {
        const classSections = sectionsData
          .filter((sec: any) => sec.class_id === cls.id)
          .map((sec: any) => {
            const sectionStudents = studentsData
              .filter((stu: any) => stu.section_id === sec.id)
              .map((stu: any) => ({
                id: stu.id,
                national_id: stu.national_id,
                user: {
                  full_name: Array.isArray(stu.users) ? stu.users[0]?.full_name : stu.users?.full_name,
                  email: Array.isArray(stu.users) ? stu.users[0]?.email : stu.users?.email,
                }
              }))
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
    } catch (err: any) {
      console.error('Error fetching classes:', err);
      setError(err.message || 'Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  }, [user, userRole]);

  const addClass = useCallback(async (name: string, level: number) => {
    const response = await fetch('/api/classes/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, level }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to add class');
    await fetchClassesData();
  }, [fetchClassesData]);

  const updateClass = useCallback(async (id: string, name: string, level: number) => {
    const response = await fetch('/api/classes/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, level }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to update class');
    await fetchClassesData();
  }, [fetchClassesData]);

  const deleteClass = useCallback(async (id: string) => {
    const response = await fetch(`/api/classes/delete?id=${id}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to delete class');
    await fetchClassesData();
  }, [fetchClassesData]);

  const addSection = useCallback(async (name: string, classId: string) => {
    const response = await fetch('/api/sections/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, classId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to add section');
    await fetchClassesData();
  }, [fetchClassesData]);

  const updateSection = useCallback(async (id: string, name: string) => {
    const response = await fetch('/api/sections/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to update section');
    await fetchClassesData();
  }, [fetchClassesData]);

  const deleteSection = useCallback(async (id: string) => {
    const response = await fetch(`/api/sections/delete?id=${id}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to delete section');
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
