'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

const normalize = (v: any) => String(v ?? '').trim().toLowerCase();

const isAutoGradedType = (type: string) => {
  const t = (type || '').toLowerCase();
  return t.includes('choice') || t.includes('true') || t.includes('select') || t.includes('checkbox');
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/exams/student-result-v3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examId, studentId })
    });

    const json = await res.json();
    setData(json);
    setLoading(false);

    const g: any = {};
    (json.questions || []).forEach((q: any) => {
      const ans = json.answers?.find((a: any) => normalize(a.question_id) === normalize(q.id));
      g[q.id] = { points: ans?.points_earned || 0, loading: false };
    });
    setGrading(g);

  }, [examId, studentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div>loading...</div>;

  const { exam, attempt, answers, questions, isExamFinished } = data;

  const hasManual = questions.some((q: any) => !isAutoGradedType(q.type));

  const viewState =
    isTeacher
      ? (hasManual && attempt?.status !== 'graded' ? 'TEACHER_GRADING' : 'TEACHER_VIEW')
      : (!isExamFinished
        ? 'STUDENT_LOCKED'
        : (attempt?.status !== 'graded'
          ? 'STUDENT_PENDING'
          : 'STUDENT_RESULT'));

  const handleSave = async (qId: string) => {
    const points = grading[qId].points;

    setGrading((p: any) => ({ ...p, [qId]: { ...p[qId], loading: true } }));

    await fetch('/api/exams/grade-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attemptId: attempt.id, questionId: qId, pointsEarned: points })
    });

    setGrading((p: any) => ({ ...p, [qId]: { ...p[qId], loading: false } }));
  };

  if (viewState === 'STUDENT_LOCKED') return <div>النتائج مخفية</div>;
  if (viewState === 'STUDENT_PENDING') return <div>قيد التصحيح</div>;

  return (
    <div>
      <h1>{exam?.title}</h1>

      {questions.map((q: any) => {
        const ans = answers.find((a: any) => normalize(a.question_id) === normalize(q.id));

        let value;

        if (isAutoGradedType(q.type)) {
          const opt = q.options?.find((o: any) =>
            normalize(o.id) === normalize(ans?.selected_option_id)
          );
          value = opt?.content;
        } else {
          value = ans?.text_answer;
        }

        return (
          <div key={q.id}>
            <h3>{q.content}</h3>
            <p>إجابة الطالب: {value || '—'}</p>

            <p>
              الصحيحة:
              {q.options?.filter((o: any) => o.is_correct).map((o: any) => o.content).join(', ')}
            </p>

            {isTeacher && (
              <div>
                <input
                  type="number"
                  value={grading[q.id]?.points}
                  onChange={(e) =>
                    setGrading((p: any) => ({
                      ...p,
                      [q.id]: { ...p[q.id], points: Number(e.target.value) }
                    }))
                  }
                />
                <button onClick={() => handleSave(q.id)}>
                  حفظ
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
