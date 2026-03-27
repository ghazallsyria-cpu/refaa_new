'use client';

import { useState } from 'react';
import { Question } from '@/types/question';

interface Props {
  questions: Question[];
  onChange: (questions: Question[]) => void;
}

export default function AssignmentBuilder({ questions, onChange }: Props) {
  const addQuestion = () => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      type: 'mcq',
      title: '',
      content: '',
      points: 1,
      isRequired: false,
      options: []
    };

    onChange([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, data: Partial<Question>) => {
    const updated = questions.map((q) =>
      q.id === id ? { ...q, ...data } : q
    );

    onChange(updated);
  };

  const removeQuestion = (id: string) => {
    const filtered = questions.filter((q) => q.id !== id);
    onChange(filtered);
  };

  return (
    <div className="space-y-4">
      {questions.map((q) => (
        <div key={q.id} className="border p-4 rounded">
          <input
            value={q.title}
            onChange={(e) =>
              updateQuestion(q.id, { title: e.target.value })
            }
            placeholder="Question title"
            className="w-full border p-2 mb-2"
          />

          <textarea
            value={q.content}
            onChange={(e) =>
              updateQuestion(q.id, { content: e.target.value })
            }
            placeholder="Question content"
            className="w-full border p-2 mb-2"
          />

          <input
            type="number"
            value={q.points}
            onChange={(e) =>
              updateQuestion(q.id, { points: Number(e.target.value) })
            }
            className="w-full border p-2 mb-2"
          />

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={q.isRequired}
              onChange={(e) =>
                updateQuestion(q.id, { isRequired: e.target.checked })
              }
            />
            Required
          </label>

          <button
            onClick={() => removeQuestion(q.id)}
            className="text-red-500 mt-2"
          >
            Delete
          </button>
        </div>
      ))}

      <button
        onClick={addQuestion}
        className="px-4 py-2 bg-black text-white"
      >
        Add Question
      </button>
    </div>
  );
}
