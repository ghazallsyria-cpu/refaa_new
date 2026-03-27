'use client';

import { useState } from 'react';
import { Question } from '@/types/question';

interface Props {
  questions: Question[];
  onChange: (questions: Question[]) => void;
}

const createEmptyQuestion = (): Question => ({
  id: crypto.randomUUID(),
  type: 'mcq',
  title: '',
  content: '',
  points: 1,
  isRequired: false,
  options: []
});

export default function AssignmentBuilder({ questions, onChange }: Props) {
  const addQuestion = () => {
    const newQuestion = createEmptyQuestion();
    onChange([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, data: Partial<Question>) => {
    onChange(
      questions.map((q) =>
        q.id === id ? { ...q, ...data } : q
      )
    );
  };

  const removeQuestion = (id: string) => {
    onChange(questions.filter((q) => q.id !== id));
  };

  return (
    <div className="space-y-4">
      {questions.map((q) => (
        <div key={q.id} className="border p-4 rounded space-y-2">
          <input
            value={q.title}
            onChange={(e) =>
              updateQuestion(q.id, { title: e.target.value })
            }
            placeholder="Title"
            className="w-full border p-2"
          />

          <textarea
            value={q.content}
            onChange={(e) =>
              updateQuestion(q.id, { content: e.target.value })
            }
            placeholder="Content"
            className="w-full border p-2"
          />

          <input
            type="number"
            value={q.points}
            onChange={(e) =>
              updateQuestion(q.id, { points: Number(e.target.value) })
            }
            className="w-full border p-2"
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
            className="text-red-600"
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
