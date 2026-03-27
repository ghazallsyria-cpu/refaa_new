'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Teacher = {
  id: string;
  users?: {
    full_name?: string;
  }[];
};

type Section = {
  id: string;
  name: string;
};

type Subject = {
  id: string;
  name: string;
};

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  const [bulkAssignData, setBulkAssignData] = useState<{
    section_ids: string[];
    subject_ids: string[];
  }>({
    section_ids: [],
    subject_ids: [],
  });

  useEffect(() => {
    const load = async () => {
      const [teachersRes, sectionsRes, subjectsRes] = await Promise.all([
        supabase.from('teachers').select('id, users(full_name)'),
        supabase.from('sections').select('*'),
        supabase.from('subjects').select('*'),
      ]);

      setTeachers(teachersRes.data || []);
      setSections(sectionsRes.data || []);
      setSubjects(subjectsRes.data || []);
    };

    load();
  }, []);

  const assignTeacherToSections = async (assignments: any[]) => {
    await supabase.from('teacher_sections').insert(assignments);
  };

  const fetchTeacherAssignments = async (teacherId: string) => {
    const { data } = await supabase
      .from('teacher_sections')
      .select('*')
      .eq('teacher_id', teacherId);

    return data || [];
  };

  const handleBulkAssign = async () => {
    if (!selectedTeacher) return;

    if (
      bulkAssignData.section_ids.length === 0 ||
      bulkAssignData.subject_ids.length === 0
    ) {
      return;
    }

    const newAssignments: any[] = [];

    bulkAssignData.section_ids.forEach((sectionId) => {
      bulkAssignData.subject_ids.forEach((subjectId) => {
        newAssignments.push({
          teacher_id: selectedTeacher.id,
          section_id: sectionId,
          subject_id: subjectId,
        });
      });
    });

    try {
      await assignTeacherToSections(newAssignments);

      await fetchTeacherAssignments(selectedTeacher.id);

      setBulkAssignData({
        section_ids: [],
        subject_ids: [],
      });
    } catch (e) {}
  };

  return null;
}
