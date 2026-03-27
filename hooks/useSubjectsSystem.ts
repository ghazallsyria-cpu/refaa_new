'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useSubjectsSystem() {
  const [loading, setLoading] = useState(false);

  const fetchSubjectsData = useCallback(async () => {
    setLoading(true);
    try {
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
      const formattedTeachers = (teachersData as any[]).map((t: any) => ({
        id: t.id,
        national_id: t.national_id,
        specialization: t.specialization,
        user: t.users
      }));
      
      // Organize subjects with their teachers
      const organizedSubjects = (subjectsData as any[]).map((sub: any) => {
        const assignedTeacherIds = mappingsData
          .filter((m: any) => m.subject_id === sub.id)
          .map((m: any) => m.teacher_id);
          
        const assignedTeachers = formattedTeachers.filter(t => assignedTeacherIds.includes(t.id));
          
        return {
          ...sub,
          teachers: assignedTeachers
        };
      });

      return {
        subjects: organizedSubjects,
        allTeachers: formattedTeachers
      };
    } catch (error) {
      console.error('Error fetching subjects data:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const addSubject = useCallback(async (name: string, code: string) => {
    try {
      const response = await fetch('/api/subjects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add subject');
      return data;
    } catch (error) {
      console.error('Error adding subject:', error);
      throw error;
    }
  }, []);

  const updateSubject = useCallback(async (id: string, name: string, code: string) => {
    try {
      const response = await fetch('/api/subjects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update subject');
    } catch (error) {
      console.error('Error updating subject:', error);
      throw error;
    }
  }, []);

  const deleteSubject = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/subjects/delete?id=${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete subject');
    } catch (error) {
      console.error('Error deleting subject:', error);
      throw error;
    }
  }, []);

  const saveTeacherAssignments = useCallback(async (subjectId: string, teacherIds: string[]) => {
    try {
      const response = await fetch('/api/subjects/save-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, teacherIds }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save teacher assignments');
    } catch (error) {
      console.error('Error saving teacher assignments:', error);
      throw error;
    }
  }, []);

  return {
    loading,
    fetchSubjectsData,
    addSubject,
    updateSubject,
    deleteSubject,
    saveTeacherAssignments
  };
}
