'use client';

import { Question } from '@/types/question';

type Option = {
  id: string;
  text: string;
};

type Props = {
  questions: Question[];
  onChange: (value: Question[]) => void;
};

export default function AssignmentBuilder({ questions, onChange }: Props) {
  const addQuestion = () => {
    const newQuestion = {
      id: crypto.randomUUID(),
      title: '',
      options: [],
    };

    onChange([...questions, newQuestion as Question]);
  };

  const updateQuestion = (id: string, data: Partial<Question>) => {
    onChange(
      questions.map((q) => (q.id === id ? { ...q, ...data } : q))
    );
  };

  const addOption = (questionId: string) => {
    const target = questions.find((q) => q.id === questionId);
    if (!target) return;

    const newOption = {
      id: crypto.randomUUID(),
      text: `خيار ${(target as any).options?.length + 1 || 1}`,
    };

    onChange(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: [...(q as any).options, newOption],
            }
          : q
      )
    );
  };

  const updateOption = (
    questionId: string,
    optionId: string,
    value: string
  ) => {
    onChange(
      questions.map((q) => {
        if (q.id !== questionId) return q;

        return {
          ...q,
          options: (q as any).options.map((opt: any) =>
            opt.id === optionId ? { ...opt, text: value } : opt
          ),
        };
      })
    );
  };

  return null;
}
