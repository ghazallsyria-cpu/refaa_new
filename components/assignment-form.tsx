'use client';

import { Question, Option } from '@/types/question';

interface Props {
  questions: Question[];
  onChange: (questions: Question[]) => void;
  readOnly?: boolean;
}

export default function AssignmentForm({ questions, onChange, readOnly }: Props) {

  const handleCheckboxChange = (
    questionId: string,
    optionId: string,
    checked: boolean
  ) => {
    onChange(
      questions.map((q) => {
        if (q.id !== questionId) return q;

        const answers = Array.isArray(q.answers) ? [...q.answers] : [];

        if (checked) {
          if (!answers.includes(optionId)) answers.push(optionId);
        } else {
          const filtered = answers.filter((id) => id !== optionId);
          return { ...q, answers: filtered };
        }

        return { ...q, answers };
      })
    );
  };

  return (
    <div className="space-y-4">
      {questions.map((question) => (
        <div key={question.id} className="border p-4 rounded space-y-2">

          {question.options?.map((option: Option) => {
            const checked =
              (question.answers || []).includes(option.id);

            return (
              <label key={option.id} className="flex items-center gap-2">

                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    handleCheckboxChange(
                      question.id,
                      option.id,
                      e.target.checked
                    )
                  }
                  disabled={readOnly}
                />

                <span>{option.label}</span>

              </label>
            );
          })}

        </div>
      ))}
    </div>
  );
}
