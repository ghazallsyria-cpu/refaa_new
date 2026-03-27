'use client';

import { useState } from 'react';
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
  const [answers, setAnswers] =
    useState<Record<string, any>>(initialAnswers);

  const updateAnswer = (id: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [id]: value
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(answers);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {questions.map((q) => (
        <div key={q.id} className="border p-3 rounded space-y-2">
          <div>{q.content}</div>

          {q.type === 'text' && (
            <input
              disabled={readOnly}
              className="w-full border p-2"
              value={answers[q.id] || ''}
              onChange={(e) => updateAnswer(q.id, e.target.value)}
            />
          )}

          {q.type === 'number' && (
            <input
              type="number"
              disabled={readOnly}
              className="w-full border p-2"
              value={answers[q.id] || ''}
              onChange={(e) =>
                updateAnswer(q.id, Number(e.target.value))
              }
            />
          )}

          {q.type === 'mcq' && q.options && (
            <select
              disabled={readOnly}
              className="w-full border p-2"
              value={answers[q.id] || ''}
              onChange={(e) => updateAnswer(q.id, e.target.value)}
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
