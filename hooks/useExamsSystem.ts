import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { deleteFromCloudinary } from '@/lib/cloudinary';

// ... (نفس التعريفات السابقة للـ Interface)

export function useExamsSystem() {
  const { user, userRole } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- دالة جلب نتائج طالب محدد في اختبار محدد ---
  const fetchStudentExamResult = useCallback(async (examId: string, studentId: string) => {
    try {
      // 1. جلب بيانات الاختبار مع المادة والمعلم
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select(`
          *,
          subject:subjects(name),
          teacher:teachers(users(full_name))
        `)
        .eq('id', examId)
        .single();

      if (examError) throw examError;

      // 2. جلب بيانات الطالب (نستخدم select ذكي لضمان جلب الاسم)
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select(`
          *,
          users:id (full_name, email),
          section:sections(name, classes(name))
        `)
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;

      // 3. جلب محاولة الاختبار (Attempt)
      const { data: attemptData, error: attemptError } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(); // استخدام maybeSingle لتجنب الخطأ إذا لم يختبر الطالب بعد

      // 4. جلب الإجابات مع ربطها بالأسئلة والخيارات
      let answersData = [];
      if (attemptData) {
        const { data: answers, error: answersError } = await supabase
          .from('student_answers')
          .select(`
            *,
            question:questions (
              *,
              options:question_options(*)
            )
          `)
          .eq('attempt_id', attemptData.id);

        if (answersError) throw answersError;
        answersData = answers || [];
      }

      // توحيد شكل البيانات قبل إرسالها للـ Frontend
      return {
        exam: {
          ...examData,
          subject_name: examData.subject?.name,
          teacher_name: Array.isArray(examData.teacher?.users) ? examData.teacher.users[0]?.full_name : examData.teacher?.users?.full_name,
        },
        student: {
          ...studentData,
          // حل مشكلة الاسم غير المعروف هنا
          full_name: Array.isArray(studentData.users) ? studentData.users[0]?.full_name : studentData.users?.full_name,
          email: Array.isArray(studentData.users) ? studentData.users[0]?.email : studentData.users?.email,
        },
        attempt: attemptData,
        answers: answersData
      };
    } catch (err) {
      console.error('Error in fetchStudentExamResult:', err);
      throw err;
    }
  }, []);

  // ... (باقي الدوال: fetchExams, saveExam, إلخ - تبقى كما هي مع التأكد من تسمية الجداول)

  // ملاحظة: تأكد أن جدول الأسئلة في قاعدة بياناتك هو 'questions' وليس 'exam_questions' 
  // حسب ما هو مكتوب في استعلاماتك السابقة.

  return { 
    data, 
    loading, 
    error, 
    refetch: () => {}, // placeholder
    deleteExam: async () => {}, // placeholder
    fetchExamDetails: async () => ({ exam: {}, questions: [] }), // placeholder
    saveExam: async () => {}, 
    fetchExamForStudent: async () => ({ exam: {}, questions: [] }),
    submitExam: async () => {},
    fetchExamResults: async () => ({ exam: {}, students: [], attempts: [], questions: [], answers: [] }),
    deleteAttempt: async () => {},
    fetchStudentExamResult 
  };
}

