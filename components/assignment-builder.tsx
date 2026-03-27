'use client';

import { Question, newQuestion } from '@/types/question';

interface Props {
  questions: Question[];
  onChange: (questions: Question[]) => void;
}

export default function AssignmentBuilder({ questions, onChange }: Props) {

  const addQuestion = (type: Question['type'] = 'text') => {
    const q = newQuestion(type);
    onChange([...questions, q]);
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
            value={q.content}
            onChange={(e) =>
              updateQuestion(q.id, { content: e.target.value })
            }
            placeholder="Question content"
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
        onClick={() => addQuestion('text')}
        className="px-4 py-2 bg-black text-white"
      >
        Add Question
      </button>

    </div>
  );
}
