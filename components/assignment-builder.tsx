'use client';

export type Option = {
  id: string;
  text: string;
};

export type Question = {
  id: string;
  title: string;
  options: Option[];
};

type Props = {
  questions: Question[];
  onChange: (value: Question[]) => void;
};

export default function AssignmentBuilder({ questions, onChange }: Props) {
  const addQuestion = () => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      title: '',
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
    const target = questions.find((q) => q.id === questionId);
    if (!target) return;

    const newOption: Option = {
      id: crypto.randomUUID(),
      text: `خيار ${target.options.length + 1}`,
    };

    onChange(
      questions.map((q) =>
        q.id === questionId
          ? { ...q, options: [...q.options, newOption] }
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
          options: q.options.map((opt) =>
            opt.id === optionId ? { ...opt, text: value } : opt
          ),
        };
      })
    );
  };

  return null;
}
