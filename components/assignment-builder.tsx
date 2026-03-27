'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical, Circle, Square, Type, X } from 'lucide-react';
import { Reorder } from 'motion/react';
import { Question, QuestionType } from '@/types/question';

interface AssignmentBuilderProps {
  questions: Question[];
  onChange: (questions: Question[]) => void;
}

export default function AssignmentBuilder({
  questions,
  onChange,
}: AssignmentBuilderProps) {
  const addQuestion = () => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      title: '',
      type: 'text',
      points: 5,
      isRequired: true,
      options: [],
    } as any;

    onChange([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    onChange(questions.map(q => (q.id === id ? { ...q, ...updates } : q)));
  };

  const removeQuestion = (id: string) => {
    onChange(questions.filter(q => q.id !== id));
  };

  const addOption = (questionId: string) => {
    const q = questions.find(q => q.id === questionId);
    if (!q) return;

    const options = [...(q.options || []), `خيار ${(q.options?.length || 0) + 1}`];
    updateQuestion(questionId, { options });
  };

  const updateOption = (questionId: string, index: number, value: string) => {
    const q = questions.find(q => q.id === questionId);
    if (!q?.options) return;

    const options = [...q.options];
    options[index] = value;
    updateQuestion(questionId, { options });
  };

  const removeOption = (questionId: string, index: number) => {
    const q = questions.find(q => q.id === questionId);
    if (!q?.options) return;

    const options = q.options.filter((_, i) => i !== index);
    updateQuestion(questionId, { options });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black">بناء الأسئلة</h3>

        <button
          type="button"
          onClick={addQuestion}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600"
        >
          <Plus className="w-4 h-4" />
          إضافة سؤال
        </button>
      </div>

      <Reorder.Group axis="y" values={questions} onReorder={onChange}>
        {questions.map(question => (
          <Reorder.Item key={question.id} value={question}>
            <div className="p-4 border rounded-xl space-y-4">
              <div className="flex gap-3 items-center">
                <GripVertical className="w-4 h-4" />

                <input
                  value={(question as any).title || ''}
                  onChange={(e) =>
                    updateQuestion(question.id, { title: e.target.value })
                  }
                  placeholder="نص السؤال"
                  className="flex-1 border p-2 rounded"
                />

                <select
                  value={question.type}
                  onChange={(e) =>
                    updateQuestion(question.id, {
                      type: e.target.value as QuestionType,
                    })
                  }
                  className="border p-2 rounded"
                >
                  <option value="text">قصير</option>
                  <option value="paragraph">فقرة</option>
                  <option value="multiple_choice">اختيار</option>
                  <option value="checkbox">متعدد</option>
                </select>

                <button onClick={() => removeQuestion(question.id)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>

              {(question.type === 'multiple_choice' ||
                question.type === 'checkbox') && (
                <div className="space-y-2 pr-4">
                  {(question.options || []).map((opt, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      {question.type === 'multiple_choice' ? (
                        <Circle className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}

                      <input
                        value={opt}
                        onChange={(e) =>
                          updateOption(question.id, i, e.target.value)
                        }
                        className="flex-1 border p-1 rounded"
                      />

                      <button
                        onClick={() => removeOption(question.id, i)}
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => addOption(question.id)}
                    className="text-sm text-indigo-600"
                  >
                    + خيار
                  </button>
                </div>
              )}
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {questions.length === 0 && (
        <div className="text-center p-10 border border-dashed rounded-xl">
          <Type className="w-8 h-8 mx-auto text-gray-300" />
          <p>لا يوجد أسئلة</p>
        </div>
      )}
    </div>
  );
}
