'use client';

import React from 'react';
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
  const [answers, setAnswers] = React.useState<Record<string, any>>(initialAnswers);

  const handleChange = (id: string, value: any) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(answers);
  };

  return (
    <form onSubmit={submit}>
      {questions.map((q) => (
        <div key={q.id}>
          <p>{q.content}</p>

          {(q.type === 'text' || q.type === 'fill_in_blank') && (
            <input
              type="text"
              disabled={readOnly}
              value={answers[q.id] || ''}
              onChange={(e) => handleChange(q.id, e.target.value)}
            />
          )}

          {q.type === 'paragraph' && (
            <textarea
              disabled={readOnly}
              value={answers[q.id] || ''}
              onChange={(e) => handleChange(q.id, e.target.value)}
            />
          )}

          {q.type === 'essay' && (
            <textarea
              disabled={readOnly}
              value={answers[q.id] || ''}
              onChange={(e) => handleChange(q.id, e.target.value)}
            />
          )}

          {q.type === 'multiple_choice' && q.options.length > 0 && (
            <select
              disabled={readOnly}
              value={answers[q.id] || ''}
              onChange={(e) => handleChange(q.id, e.target.value)}
            >
              <option value="">اختر إجابة</option>
              {q.options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.content}
                </option>
              ))}
            </select>
          )}

          {q.type === 'true_false' && (
            <select
              disabled={readOnly}
              value={answers[q.id] || ''}
              onChange={(e) => handleChange(q.id, e.target.value)}
            >
              <option value="">اختر</option>
              <option value="true">صح</option>
              <option value="false">خطأ</option>
            </select>
          )}

          {q.type === 'multi_select' && q.options.length > 0 && (
            <div>
              {q.options.map((opt) => (
                <label key={opt.id}>
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={(answers[q.id] || []).includes(opt.id)}
                    onChange={(e) => {
                      const current = answers[q.id] || [];
                      const updated = e.target.checked
                        ? [...current, opt.id]
                        : current.filter((v: string) => v !== opt.id);
                      handleChange(q.id, updated);
                    }}
                  />
                  {opt.content}
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      {!readOnly && (
        <button type="submit" disabled={isSubmitting}>
          إرسال
        </button>
      )}
    </form>
  );
}
