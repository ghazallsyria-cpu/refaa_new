'use client';

import React, { useState, useEffect } from 'react';
import { UploadCloud, Loader2, FileText, CheckCircle2, AlertCircle, Sparkles, Image as ImageIcon, ChevronDown, ChevronUp, Copy, List, CheckSquare, AlignLeft, TerminalSquare, Key, Save, UserCheck, FileJson, ClipboardPaste } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface ExtractedQuestion {
  content: string;
  type: 'multiple_choice' | 'true_false' | 'essay';
  points: number;
  options?: { content: string; is_correct: boolean }[];
}

interface ExtractedExam {
  title: string;
  questions: ExtractedQuestion[];
}

interface Teacher {
  id: string;
  full_name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Section {
  id: string;
  name: string;
}

export default function AITestSandbox() {
  const router = useRouter();
  const { saveExam } = useExamsSystem();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  const [teachersLoading, setTeachersLoading] = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractedExam | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);

  const [customApiKey, setCustomApiKey] = useState('');
  const [manualJson, setManualJson] = useState('');
  const [manualJsonError, setManualJsonError] = useState<string | null>(null);

  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [isSavingDB, setIsSavingDB] = useState(false);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const { data, error } = await supabase
          .from('teachers')
          .select(`
            id,
            users!inner (
              full_name
            )
          `);

        if (error) throw error;

        const formatted = data?.map((t: any) => ({
          id: t.id,
          full_name: t.users?.full_name || 'معلم بدون اسم'
        })) || [];

        setTeachers(formatted);
      } catch (err) {
        console.error(err);
      } finally {
        setTeachersLoading(false);
      }
    };

    fetchTeachers();
  }, []);

  useEffect(() => {
    const fetchTeacherSubjects = async () => {
      if (!selectedTeacher) {
        setSubjects([]);
        setSelectedSubject('');
        return;
      }

      setSubjectsLoading(true);

      try {
        const { data, error } = await supabase
          .from('teacher_subjects')
          .select(`subjects!inner ( id, name )`)
          .eq('teacher_id', selectedTeacher);

        if (error) throw error;

        const extracted = data?.map((i: any) => i.subjects).filter(Boolean) || [];
        const unique = Array.from(new Map(extracted.map((s: any) => [s.id, s])).values());

        setSubjects(unique as Subject[]);
        setSelectedSubject('');
      } catch (err) {
        console.error(err);
      } finally {
        setSubjectsLoading(false);
      }
    };

    fetchTeacherSubjects();
  }, [selectedTeacher]);

  useEffect(() => {
    const fetchTeacherSections = async () => {
      if (!selectedTeacher || !selectedSubject) {
        setSections([]);
        setSelectedSections([]);
        return;
      }

      setSectionsLoading(true);

      try {
        const { data, error } = await supabase
          .from('teacher_sections')
          .select(`sections!inner ( id, name )`)
          .eq('teacher_id', selectedTeacher)
          .eq('subject_id', selectedSubject);

        if (error) throw error;

        const extracted = data?.map((i: any) => i.sections).filter(Boolean) || [];
        const unique = Array.from(new Map(extracted.map((s: any) => [s.id, s])).values());

        setSections(unique as Section[]);
        setSelectedSections([]);
      } catch (err) {
        console.error(err);
      } finally {
        setSectionsLoading(false);
      }
    };

    fetchTeacherSections();
  }, [selectedTeacher, selectedSubject]);

  const toggleSection = (id: string) => {
    setSelectedSections(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const saveToRealDatabase = async () => {
    if (!result) return;

    if (!selectedTeacher) return;
    if (!selectedSubject) return;
    if (selectedSections.length === 0) return;

    setIsSavingDB(true);

    try {
      const totalScore = result.questions.reduce((s, q) => s + (q.points || 1), 0);

      const examPayload = {
        title: result.title,
        description: '',
        subject_id: selectedSubject,
        section_ids: selectedSections,
        exam_date: new Date().toISOString().split('T')[0],
        max_score: totalScore,
        total_points: totalScore,
        total_marks: totalScore,
        status: 'draft',
        max_attempts: 1,
        settings: {
          shuffle_questions: false,
          shuffle_options: false
        }
      };

      const formattedQuestions = result.questions.map((q, i) => ({
        id: crypto.randomUUID(),
        content: q.content,
        type: q.type,
        points: q.points,
        order_index: i + 1,
        options: q.options?.map((o, j) => ({
          id: crypto.randomUUID(),
          content: o.content,
          is_correct: o.is_correct,
          order_index: j + 1
        })) || []
      }));

      const res = await fetch('/api/exams/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examData: examPayload,
          questions: formattedQuestions,
          isNew: true,
          userId: selectedTeacher
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.push('/exams');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingDB(false);
    }
  };

  return (
    <div />
  );
}
