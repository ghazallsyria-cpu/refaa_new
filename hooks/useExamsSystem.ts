import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { deleteFromCloudinary } from '@/lib/cloudinary';

export interface Exam {
  id: string;
  title: string;
  description?: string;
  subject_id: string;
  subject_name?: string;
  teacher_id: string;
  teacher_name?: string;
  start_time?: string;
  end_time?: string;
  exam_date?: string;
  duration?: number;
  status: 'draft' | 'published' | 'archived';
  section_id?: string;
  section_name?: string;
  created_at: string;
  submission_status?: 'pending' | 'submitted' | 'graded';
  score?: number;
  submission_count?: number;
  graded_count?: number;
  avg_score?: number;
  question_count?: number;
}

export function useExamsSystem() {
  const { user, userRole } = useAuth();
  const [data, setData] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ... (الدوال الأخرى تبقى كما هي)

  const fetchStudentExamResult = useCallback(async (examId: string, studentId: string) => {
    try {
      // 1. جلب بيانات الاختبار مع المادة (تم إضافة Join هنا)
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*, subject:subjects(name)')
        .eq('id', examId)
        .single();

      if (examError) throw examError;

      // 2. جلب بيانات الطالب مع الاسم
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*, users:id(full_name)')
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;

      // 3. جلب المحاولة
      const { data: attemptData } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId)
        .eq('student_id', studentId)
        .maybeSingle();

      // 4. جلب الإجابات
      let answersData = [];
      if (attemptData) {
        const { data: answers } = await supabase
          .from('student_answers')
          .select('*, question:questions(*, options:question_options(*))')
          .eq('attempt_id', attemptData.id);
        answersData = answers || [];
      }

      return {
        exam: {
          ...examData,
          subject_name: examData.subject?.name || 'مادة عامة'
        },
        student: {
          ...studentData,
          full_name: Array.isArray(studentData.users) ? studentData.users[0]?.full_name : studentData.users?.full_name
        },
        attempt: attemptData,
        answers: answersData
      };
    } catch (err) {
      console.error('Error fetching result:', err);
      throw err;
    }
  }, []);

  // نعود بالدوال المصلحة
  return {
    data, loading, error, 
    refetch: async () => {}, // placeholder
    deleteExam: async () => {}, 
    deleteExamWithMedia: async () => {}, 
    fetchExamDetails: async () => ({exam: {}, questions: []}),
    saveExam: async () => {},
    fetchExamForStudent: async () => ({exam: {}, questions: []}),
    submitExam: async () => {},
    fetchExamResults: async () => ({exam: {}, students: [], attempts: [], questions: [], answers: []}),
    deleteAttempt: async () => {},
    fetchStudentExamResult 
  };
}

