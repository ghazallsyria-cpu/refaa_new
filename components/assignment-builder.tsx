'use client';

import { useState } from 'react';

type Option = {
  id: string;
  text: string;
};

type Question = {
  id: string;
  title: string;
  options: Option[];
};

export default function AssignmentBuilder() {
  const [questions, setQuestions] = useState<Question[]>([]);

  const updateQuestion = (questionId: string, data: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, ...data } : q))
    );
  };

  const addOption = (questionId: string) => {
    const q = questions.find((x) => x.id === questionId);
    if (!q) return;

    const newOption: Option = {
      id: crypto.randomUUID(),
      text: `خيار ${(q.options?.length || 0) + 1}`,
    };

    const options: Option[] = [...q.options, newOption];

    updateQuestion(questionId, { options });
  };

  const updateOption = (
    questionId: string,
    optionId: string,
    value: string
  ) => {
    const q = questions.find((x) => x.id === questionId);
    if (!q) return;

    const options: Option[] = q.options.map((opt) =>
      opt.id === optionId ? { ...opt, text: value } : opt
    );

    updateQuestion(questionId, { options });
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      title: '',
      options: [],
    };

    setQuestions((prev) => [...prev, newQuestion]);
  };

  return null;
}
