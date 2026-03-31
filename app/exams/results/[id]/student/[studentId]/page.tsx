'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

const normalize = (v: any) => String(v ?? '').trim().toLowerCase();

const isAutoGradedType = (type: string) => {
  const t = (type || '').toLowerCase();
  return (
    t.includes('choice') ||
    t.includes('true') ||
    t.includes('select') ||
    t.includes('checkbox')
  );
};

export default function StudentExamResult() {
  const params = useParams();
  const router = useRouter();
  const { authRole, userRole } = useAuth() as any;

  const role = authRole || userRole;
  const isTeacher = ['teacher', 'admin', 'management'].includes(role);

  const examId = params.id as string;
  const studentId = params.studentId as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState<any>({});

  // ✅ الحل: لا useCallback — لا error
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const res = await fetch('/api/exams/student-result-v3', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ examId, studentId })
        });

        const json = await res.json();
        setData(json);

        const g: any = {};
        (json.questions || []).forEach((q: any) => {
          const ans = json.answers?.find(
            (a: any) => normalize(a.question_id) === normalize(q.id)
          );

          g[q.id] = {
            points: Number(ans?.points_earned) || 0,
            loading: false
          };
        });

        setGrading(g);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [examId, studentId]);

  if (loading) return <div>loading...</div>;

  const { exam, attempt, answers = [], questions = [], isExamFinished } = data || {};

  const hasManual = questions.some((q: any) => !isAutoGradedType(q.type));

  // ✅ state machine
  const viewState =
    isTeacher
      ? (hasManual && attempt?.status !== 'graded'
          ? 'TEACHER_GRADING'
          : 'TEACHER_VIEW')
      : (!isExamFinished
          ? 'STUDENT_LOCKED'
          : (attempt?.status !== 'graded'
              ? 'STUDENT_PENDING'
              : 'STUDENT_RESULT'));

  const handleSave = async (qId: string) => {
    const points = grading[qId].points;

    setGrading((p: any) => ({
      ...p,
      [qId]: { ...p[qId], loading: true }
    }));

    try {
      await fetch('/api/exams/grade-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId: attempt.id, questionId: qId, pointsEarned: points })
      });
    } catch (e) {
      console.error(e);
    } finally {
      setGrading((p: any) => ({
        ...p,
        [qId]: { ...p[qId], loading: false }
      }));
    }
  };

  // حالات الطالب
  if (viewState === 'STUDENT_LOCKED') {
    return <div>النتائج مخفية حتى انتهاء الوقت</div>;
  }

  if (viewState === 'STUDENT_PENDING') {
    return <div>تم التسليم - قيد التصحيح</div>;
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold">{exam?.title}</h1>

      {questions.map((q: any, index: number) => {
        const ans = answers.find(
          (a: any) => normalize(a.question_id) === normalize(q.id)
        );

        let studentAnswer = '—';

        if (ans) {
          if (isAutoGradedType(q.type)) {
            const opt = q.options?.find(
              (o: any) => normalize(o.id) === normalize(ans.selected_option_id)
            );
            studentAnswer = opt?.content || '—';
          } else {
            studentAnswer = ans.text_answer || '—';
          }
        }

        const correctAnswers = q.options
          ?.filter((o: any) => o.is_correct)
          .map((o: any) => o.content)
          .join(', ');

        return (
          <div key={q.id} className="border p-4 rounded-lg space-y-3">
            <h3 className="font-bold">
              {index + 1}. {q.content}
            </h3>

            <div>
              <strong>إجابة الطالب:</strong> {studentAnswer}
            </div>

            <div>
              <strong>الإجابة الصحيحة:</strong>{' '}
              {isAutoGradedType(q.type)
                ? correctAnswers || '—'
                : 'سؤال مقالي'}
            </div>

            {/* المعلم فقط */}
            {isTeacher && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={q.points}
                  value={grading[q.id]?.points}
                  onChange={(e) =>
                    setGrading((p: any) => ({
                      ...p,
                      [q.id]: {
                        ...p[q.id],
                        points: Number(e.target.value)
                      }
                    }))
                  }
                  className="border p-2 w-20 text-center"
                />

                <button
                  onClick={() => handleSave(q.id)}
                  disabled={grading[q.id]?.loading}
                  className="bg-indigo-600 text-white px-4 py-2 rounded"
                >
                  {grading[q.id]?.loading ? '...' : 'حفظ'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
