'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Square, Type, AlignLeft, AlertCircle, Send } from 'lucide-react';
import { motion } from 'motion/react';
import { Question, QuestionType } from './assignment-builder';

interface AssignmentFormProps {
  questions: Question[];
  onSubmit: (answers: Record<string, any>) => void;
  isSubmitting?: boolean;
  initialAnswers?: Record<string, any>;
  readOnly?: boolean;
  children?: React.ReactNode;
}

export default function AssignmentForm({ questions, onSubmit, isSubmitting, initialAnswers = {}, readOnly = false, children }: AssignmentFormProps) {
  const [answers, setAnswers] = useState<Record<string, any>>(initialAnswers);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync answers when initialAnswers changes (e.g. after async fetch)
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
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    if (readOnly) return;
    const currentAnswers = (answers[questionId] as string[]) || [];
    let newAnswers: string[];
    if (checked) {
      newAnswers = [...currentAnswers, option];
    } else {
      newAnswers = currentAnswers.filter(a => a !== option);
    }
    handleAnswerChange(questionId, newAnswers);
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
    if (validate()) {
      onSubmit(answers);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {questions.map((question, index) => (
        <motion.div
          key={question.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`glass-card p-8 rounded-4xl border ${errors[question.id] ? 'border-red-200 ring-1 ring-red-100' : 'border-white/60'} shadow-xl shadow-slate-200/50 transition-all`}
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                  {question.text}
                  {question.isRequired && <span className="text-red-500 mr-1">*</span>}
                </h3>
              </div>
              <div className="px-3 py-1 bg-slate-50 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-100">
                {question.points} نقاط
              </div>
            </div>

            <div className="space-y-4">
              {question.type === 'text' && (
                <input
                  type="text"
                  placeholder="إجابتك..."
                  className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold disabled:opacity-50"
                  value={answers[question.id] || ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  disabled={readOnly}
                />
              )}

              {question.type === 'paragraph' && (
                <textarea
                  rows={4}
                  placeholder="إجابتك..."
                  className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold resize-none disabled:opacity-50"
                  value={answers[question.id] || ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  disabled={readOnly}
                />
              )}

              {question.type === 'multiple_choice' && (
                <div className="space-y-3">
                  {question.options?.map((option, optIndex) => (
                    <label
                      key={optIndex}
                      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer group ${
                        answers[question.id] === option 
                          ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-100' 
                          : 'bg-white border-slate-100 hover:bg-slate-50'
                      } ${readOnly ? 'cursor-default' : ''}`}
                    >
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        answers[question.id] === option 
                          ? 'border-indigo-600 bg-indigo-600' 
                          : 'border-slate-300 group-hover:border-indigo-400'
                      }`}>
                        {answers[question.id] === option && <div className="h-2 w-2 bg-white rounded-full" />}
                      </div>
                      <input
                        type="radio"
                        className="hidden"
                        name={question.id}
                        value={option}
                        checked={answers[question.id] === option}
                        onChange={() => handleAnswerChange(question.id, option)}
                        disabled={readOnly}
                      />
                      <span className={`text-sm font-bold transition-colors ${
                        answers[question.id] === option ? 'text-indigo-900' : 'text-slate-600'
                      }`}>
                        {option}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {question.type === 'checkbox' && (
                <div className="space-y-3">
                  {question.options?.map((option, optIndex) => {
                    const isChecked = (answers[question.id] as string[] || []).includes(option);
                    return (
                      <label
                        key={optIndex}
                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer group ${
                          isChecked 
                            ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-100' 
                            : 'bg-white border-slate-100 hover:bg-slate-50'
                        } ${readOnly ? 'cursor-default' : ''}`}
                      >
                        <div className={`h-5 w-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                          isChecked 
                            ? 'border-indigo-600 bg-indigo-600' 
                            : 'border-slate-300 group-hover:border-indigo-400'
                        }`}>
                          {isChecked && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          value={option}
                          checked={isChecked}
                          onChange={(e) => handleCheckboxChange(question.id, option, e.target.checked)}
                          disabled={readOnly}
                        />
                        <span className={`text-sm font-bold transition-colors ${
                          isChecked ? 'text-indigo-900' : 'text-slate-600'
                        }`}>
                          {option}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {errors[question.id] && (
              <div className="flex items-center gap-2 text-red-500 text-xs font-bold animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-4 w-4" />
                <span>{errors[question.id]}</span>
              </div>
            )}
          </div>
        </motion.div>
      ))}

      {children}

      {!readOnly && (
        <div className="pt-8">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center items-center gap-3 rounded-3xl bg-indigo-600 px-8 py-5 text-lg font-black text-white shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="h-6 w-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Send className="h-6 w-6" />
            )}
            {isSubmitting ? 'جاري الإرسال...' : 'إرسال الإجابات'}
          </button>
        </div>
      )}
    </form>
  );
}
