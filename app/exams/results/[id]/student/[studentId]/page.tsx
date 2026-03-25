'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowRight, BookOpen, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function StudentExamResult() {
  const params = useParams();
  const router = useRouter();
  const { id: examId, studentId } = params;
  const [exam, setExam] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch Exam
      const { data: examData } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();
      setExam(examData);

      // Fetch Student
      const { data: studentData } = await supabase
        .from('students')
        .select('*, users(full_name)')
        .eq('id', studentId)
        .single();
      setStudent(studentData);

      // Fetch Attempt
      console.log('Fetching attempt for exam:', examId, 'and student:', studentId);
      const { data: attemptData, error: attemptError } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId)
        .eq('student_id', studentId)
        .single();
      
      console.log('Attempt data:', attemptData, 'Error:', attemptError);

      if (attemptData) {
        // Fetch Answers
        const { data: answersData } = await supabase
          .from('student_answers')
          .select('*, question:questions(*, options:question_options(*))')
          .eq('attempt_id', attemptData.id);
        
        setAnswers(answersData || []);
      }

    } catch (err) {
      console.error('Error fetching student exam result:', err);
    } finally {
      setLoading(false);
    }
  }, [examId, studentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <div className="flex items-center justify-center min-h-screen">جاري التحميل...</div>;

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold"
      >
        <ArrowRight className="h-5 w-5" />
        العودة للنتائج
      </button>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <h1 className="text-3xl font-black text-slate-900">{exam?.title}</h1>
        <p className="text-slate-500 font-bold mt-2">الطالب: {(student?.users as any)?.full_name}</p>
      </div>

      <div className="space-y-6">
        {answers.map((answer, index) => (
          <div key={answer.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-lg mb-4">سؤال {index + 1}: {answer.question.content}</h3>
            <p className={answer.is_correct ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>
              إجابة الطالب: {answer.text_answer || answer.selected_option_id || 'لم يتم الإجابة'}
            </p>
            {!answer.is_correct && (
              <p className="text-slate-600 mt-2">الإجابة الصحيحة: {answer.question.options.find((o: any) => o.is_correct)?.content}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
