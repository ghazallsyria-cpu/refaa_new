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

  // FIXED: جلب المعلمين من users + teachers ودمجهم بدون فقدان أي سجل
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const { data: teachersData, error: teachersError } = await supabase
          .from('teachers')
          .select(`
            id,
            user_id,
            users!inner ( full_name )
          `);

        if (teachersError) throw teachersError;

        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select(`
            id,
            full_name
          `)
          .eq('role', 'teacher');

        if (usersError) throw usersError;

        const fromTeachers =
          teachersData?.map((t: any) => ({
            id: t.id,
            full_name: t.users?.full_name || 'بدون اسم'
          })) || [];

        const fromUsers =
          usersData?.map((u: any) => ({
            id: u.id,
            full_name: u.full_name
          })) || [];

        const merged = [...fromTeachers, ...fromUsers];

        const unique = Array.from(
          new Map(merged.map((t) => [t.id, t])).values()
        );

        unique.sort((a, b) => a.full_name.localeCompare(b.full_name));

        setTeachers(unique);
      } catch (err) {
        console.error('Error fetching teachers:', err);
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

        const extracted = data?.map((item: any) => item.subjects).filter(Boolean) || [];
        const uniqueSubjects = Array.from(new Map(extracted.map((item: any) => [item.id, item])).values());

        setSubjects(uniqueSubjects as Subject[]);
        setSelectedSubject('');
      } catch (err) {
        console.error('Error fetching subjects:', err);
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

        const extracted = data?.map((item: any) => item.sections).filter(Boolean) || [];
        const uniqueSections = Array.from(new Map(extracted.map((item: any) => [item.id, item])).values());

        setSections(uniqueSections as Section[]);
        setSelectedSections([]);
      } catch (err) {
        console.error('Error fetching sections:', err);
      } finally {
        setSectionsLoading(false);
      }
    };

    fetchTeacherSections();
  }, [selectedTeacher, selectedSubject]);

  const toggleSection = (sectionId: string) => {
    setSelectedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const promptText = `...`;

  const copyPrompt = () => {
    navigator.clipboard.writeText(promptText);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    setResult(null);
    setError(null);
  };

  const fileToBase64 = async (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
    });
  };

  const callGeminiWithSmartRetry = async (payload: any) => {
    return fetch('');
  };

  const analyzeImage = async () => {};

  const processManualJson = () => {};

  const saveToRealDatabase = async () => {};

  const getQuestionIcon = (type: string) => {
    switch (type) {
      case 'multiple_choice': return <List className="w-5 h-5 text-indigo-500" />;
      case 'true_false': return <CheckSquare className="w-5 h-5 text-emerald-500" />;
      default: return <AlignLeft className="w-5 h-5 text-amber-500" />;
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'multiple_choice': return 'اختيار من متعدد';
      case 'true_false': return 'صح أو خطأ';
      default: return 'سؤال مقالي';
    }
  };

  return <div />;
}
