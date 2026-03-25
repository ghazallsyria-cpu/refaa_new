'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowRight, User, Calendar, Clock, CheckCircle, AlertCircle, Save, MessageSquare, Star } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import AssignmentForm from '@/components/assignment-form';
import { Question } from '@/components/assignment-builder';

type Assignment = {
  id: string;
  title: string;
  points?: number;
};

type Submission = {
  id: string;
  student_id: string;
  status: string;
  submitted_at: string;
  grade?: number;
  feedback?: string;
  students?: {
    users?: {
      full_name: string;
    };
  };
};

export default function GradingPage({ params }: { params: Promise<{ id: string, submissionId: string }> }) {
  const { id: assignmentId, submissionId } = use(params);
  const router = useRouter();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [grade, setGrade] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch assignment
      const { data: assignmentData } = await supabase
        .from('assignments')
        .select('id, title')
        .eq('id', assignmentId)
        .single();
      
      if (assignmentData) setAssignment(assignmentData);

      // Fetch questions
      const { data: qData } = await supabase
        .from('assignment_questions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('order');
      
      if (qData) {
        setQuestions(qData.map(q => ({
          id: q.id,
          text: q.question_text,
          type: q.question_type as any,
          options: q.options,
          points: q.points,
          isRequired: q.is_required
        })));
      }

      // Fetch submission
      const { data: subData } = await supabase
        .from('assignment_submissions')
        .select('*, students(users(full_name))')
        .eq('id', submissionId)
        .single();
      
      if (subData) {
        setSubmission(subData as any);
        setGrade(subData.grade?.toString() || '');
        setFeedback(subData.feedback || '');

        // Fetch answers
        const { data: answersData } = await supabase
          .from('assignment_answers')
          .select('*')
          .eq('submission_id', submissionId);
        
        if (answersData) {
          const answersMap: Record<string, any> = {};
          answersData.forEach(a => {
            answersMap[a.question_id] = a.selected_options || a.answer_text;
          });
          setAnswers(answersMap);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [assignmentId, submissionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveGrade = async () => {
    if (grade === '') {
      setNotification({ type: 'error', message: 'يرجى إدخال الدرجة' });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const numericGrade = parseFloat(grade);
      if (isNaN(numericGrade)) {
        setNotification({ type: 'error', message: 'يرجى إدخال درجة صحيحة' });
        return;
      }

      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          grade: numericGrade,
          feedback,
          status: 'graded',
          graded_at: new Date().toISOString(),
          graded_by: user?.id
        })
        .eq('id', submissionId);

      if (error) throw error;
      setNotification({ type: 'success', message: 'تم حفظ التقييم بنجاح' });
      
      // Clear notification after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 3000);
      
      // Refresh data to show updated state
      fetchData();
    } catch (error: any) {
      setNotification({ type: 'error', message: 'خطأ في الحفظ: ' + error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href={`/assignments/${assignmentId}`}
              className="p-2 hover:bg-slate-100 rounded-2xl transition-all text-slate-500"
            >
              <ArrowRight className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">تقييم إجابة الطالب</h1>
              <p className="text-xs font-bold text-slate-400">{assignment?.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveGrade}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-70 shadow-lg shadow-indigo-100"
            >
              {isSaving ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Save className="h-4 w-4" />
              )}
              حفظ التقييم
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Answers */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 rounded-4xl border border-white/60 shadow-xl shadow-slate-200/50">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
              <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <User className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">{submission?.students?.users?.full_name || 'طالب غير معروف'}</h2>
                <div className="flex items-center gap-4 mt-1">
                  <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                    <Calendar className="h-3 w-3" />
                    {new Date(submission?.submitted_at || '').toLocaleDateString('ar-EG')}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                    <Clock className="h-3 w-3" />
                    {new Date(submission?.submitted_at || '').toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>

            <AssignmentForm 
              questions={questions} 
              onSubmit={() => {}} 
              initialAnswers={answers}
              readOnly={true}
            />
          </div>
        </div>

        {/* Right Column: Grading Panel */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-4xl border border-white/60 shadow-xl shadow-slate-200/50 sticky top-28">
            <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              لوحة التقييم
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">الدرجة النهائية</label>
                <div className="relative">
                  <input
                    type="number"
                    className="block w-full rounded-2xl border-0 py-4 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 text-2xl font-black text-center"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="0"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    / {questions.reduce((acc, q) => acc + q.points, 0)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  ملاحظات وتغذية راجعة
                </label>
                <textarea
                  rows={6}
                  className="block w-full rounded-2xl border-0 py-4 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all resize-none font-bold"
                  placeholder="اكتب ملاحظاتك للطالب هنا..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>

              <div className="pt-4">
                <button
                  onClick={handleSaveGrade}
                  disabled={isSaving}
                  className="w-full flex justify-center items-center gap-2 rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-95 disabled:opacity-70"
                >
                  {isSaving ? (
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <CheckCircle className="h-5 w-5" />
                  )}
                  حفظ وإرسال التقييم
                </button>
              </div>
            </div>
          </div>

          {notification && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-2xl flex items-center gap-3 border ${
                notification.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'
              }`}
            >
              {notification.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              <span className="text-sm font-bold">{notification.message}</span>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
