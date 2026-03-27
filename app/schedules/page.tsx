'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Section = {
  id: string;
  name: string;
};

type Subject = {
  id: string;
  name: string;
};

type Teacher = {
  id: string;
  specialization: string;
  users: {
    full_name: string;
  }[];
};

type Period = {
  id: string;
  name: string;
};

type Schedule = any;

export default function SchedulesPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      const [sectionsRes, subjectsRes, teachersRes, periodsRes] = await Promise.all([
        supabase.from('sections').select('*'),
        supabase.from('subjects').select('*'),
        supabase.from('teachers').select('id, specialization, users(full_name)'),
        supabase.from('periods').select('*'),
      ]);

      setSections(sectionsRes.data || []);
      setSubjects(subjectsRes.data || []);

      // FIX: flatten users safely
      const fixedTeachers =
        (teachersRes.data || []).map((t: any) => ({
          id: t.id,
          specialization: t.specialization,
          users: Array.isArray(t.users) ? t.users : [],
        }));

      setTeachers(fixedTeachers);

      setPeriods(periodsRes.data || []);
    };

    load();
  }, []);

  useEffect(() => {
    if (!selectedSectionId) return;

    const loadSchedules = async () => {
      const { data } = await supabase
        .from('schedules')
        .select('*')
        .eq('section_id', selectedSectionId);

      setSchedules(data || []);
    };

    loadSchedules();
  }, [selectedSectionId]);

  return null;
}
