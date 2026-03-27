'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { motion } from 'motion/react';
import type { Question } from '@/types/question';

interface AssignmentFormProps {
  questions: Question[];
  onSubmit: (answers: Record<string, any>) => void;
  isSubmitting?: boolean;
  initialAnswers?: Record<string, any>;
  readOnly?: boolean;
  children?: React.ReactNode;
}

export default function AssignmentForm({
  questions,
  onSubmit,
  isSubmitting,
  initialAnswers = {},
  readOnly = false,
  children
}: AssignmentFormProps) {
  const [answers, setAnswers] = useState<Record<string, any>>(initialAnswers);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialAnswers && Object.keys(initialAnswers).length > 0) {
      const timer = setTimeout(() => {
        setAnswers(prev => {
          if (JSON.stringify(prev) === JSON.stringify(initialAnswers)) return prev;
          return initialAnswers;
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialAnswers]);

  const handleAnswerChange = (questionId: string, value: any) => {
    if (readOnly) return;
    setAnswers(prev => ({ ...prev, [questionId]: value }));

    if (errors[questionId]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[questionId];
        return copy;
      });
    }
  };

  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    if (readOnly) return;

    const current = (answers[questionId] as string[]) || [];

    const updated = checked
      ? [...current, option]
      : current.filter(a => a !== option);

    handleAnswerChange(questionId, updated);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    questions.forEach(q => {
      if (q.isRequired) {
        const answer = answers[q.id];
        if (!answer || (Array.isArray(answer) && answer.length === 0)) {
          newErrors[q.id] = 'هذا السؤال مطلوب';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (validate()) onSubmit(answers);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {questions.map((question, index) => (
        <motion.div
          key={question.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`p-6 rounded-2xl border ${
            errors[question.id] ? 'border-red-400' : 'border-gray-200'
          }`}
        >
          <div className="flex justify-between mb-4">
            <h3 className="font-bold text-lg">
              {question.text}
              {question.isRequired && <span className="text-red-500">*</span>}
            </h3>
            <span className="text-xs">{question.points} نقاط</span>
          </div>

          <div className="space-y-3">
            {question.type === 'text' && (
              <input
                className="w-full border p-3 rounded-xl"
                value={answers[question.id] || ''}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                disabled={readOnly}
              />
            )}

            {question.type === 'paragraph' && (
              <textarea
                className="w-full border p-3 rounded-xl"
                rows={4}
                value={answers[question.id] || ''}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                disabled={readOnly}
              />
            )}

            {question.type === 'multiple_choice' && (
              <div className="space-y-2">
                {question.options?.map((option) => (
                  <label key={option} className="flex gap-2 items-center">
                    <input
                      type="radio"
                      name={question.id}
                      checked={answers[question.id] === option}
                      onChange={() => handleAnswerChange(question.id, option)}
                      disabled={readOnly}
                    />
                    {option}
                  </label>
                ))}
              </div>
            )}

            {question.type === 'checkbox' && (
              <div className="space-y-2">
                {question.options?.map((option) => {
                  const checked = (answers[question.id] || []).includes(option);

                  return (
                    <label key={option} className="flex gap-2 items-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          handleCheckboxChange(question.id, option, e.target.checked)
                        }
                        disabled={readOnly}
                      />
                      {option}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {errors[question.id] && (
            <div className="text-red-500 text-sm mt-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {errors[question.id]}
            </div>
          )}
        </motion.div>
      ))}

      {children}

      {!readOnly && (
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full p-4 bg-black text-white rounded-xl flex items-center justify-center gap-2"
        >
          {isSubmitting ? 'جاري الإرسال...' : <Send className="w-5 h-5" />}
        </button>
      )}
    </form>
  );
}
