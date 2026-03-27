'use client';

import { Question } from '@/types/question';

type Props = {
  questions: Question[];
  onChange: (value: Question[]) => void;
};

export default function AssignmentBuilder({ questions, onChange }: Props) {
  const addQuestion = () => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),

      // حقول مطلوبة حسب type الحقيقي في المشروع
      title: '',
      type: 'text',
      content: '',
      points: 0,
      isRequired: false,

      // إذا النظام يدعم options
      options: [],
    };

    onChange([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, data: Partial<Question>) => {
    onChange(
      questions.map((q) => (q.id === id ? { ...q, ...data } : q))
    );
  };

  const addOption = (questionId: string) => {
    const q = questions.find((x) => x.id === questionId);
    if (!q) return;

    const newOption = {
      id: crypto.randomUUID(),
      text: `خيار ${(q as any).options?.length + 1 || 1}`,
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
