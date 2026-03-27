'use client';

import { Question } from '@/types/question';

interface Props {
  questions: Question[];
  onSubmit: (answers: Record<string, any>) => void | Promise<void>;
  isSubmitting?: boolean;
  initialAnswers?: Record<string, any>;
  readOnly?: boolean;
}

export default function AssignmentForm({
  questions,
  onSubmit,
  isSubmitting = false,
  initialAnswers = {},
  readOnly = false
}: Props) {
  const handleChange = (id: string, value: any, setState: any, state: any) => {
    setState({
      ...state,
      [id]: value
    });
  };

  const [answers, setAnswers] = React.useState<Record<string, any>>(initialAnswers);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(answers);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {questions.map((q) => (
        <div key={q.id} className="border p-3 rounded">
          <div className="mb-2">{q.content}</div>

          {q.type === 'text' && (
            <input
              disabled={readOnly}
              className="w-full border p-2"
              value={answers[q.id] || ''}
              onChange={(e) =>
                handleChange(q.id, e.target.value, setAnswers, answers)
              }
            />
          )}

          {q.type === 'number' && (
            <input
              type="number"
              disabled={readOnly}
              className="w-full border p-2"
              value={answers[q.id] || ''}
              onChange={(e) =>
                handleChange(q.id, Number(e.target.value), setAnswers, answers)
              }
            />
          )}

          {q.type === 'mcq' && q.options && (
            <select
              disabled={readOnly}
              className="w-full border p-2"
              value={answers[q.id] || ''}
              onChange={(e) =>
                handleChange(q.id, e.target.value, setAnswers, answers)
              }
            >
              {q.options.map((opt, i) => (
                <option key={i} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}

      {!readOnly && (
        <button
          disabled={isSubmitting}
          className="px-4 py-2 bg-black text-white"
          type="submit"
        >
          Submit
        </button>
      )}
    </form>
  );
}
