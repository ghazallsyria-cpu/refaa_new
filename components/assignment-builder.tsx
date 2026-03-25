'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical, CheckCircle2, Circle, Square, Type, AlignLeft, ChevronDown, ChevronUp, X } from 'lucide-react';
import { motion, Reorder } from 'motion/react';

export type QuestionType = 'text' | 'paragraph' | 'multiple_choice' | 'checkbox';

export type Question = {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  points: number;
  isRequired: boolean;
};

interface AssignmentBuilderProps {
  questions: Question[];
  onChange: (questions: Question[]) => void;
}

export default function AssignmentBuilder({ questions, onChange }: AssignmentBuilderProps) {
  const addQuestion = () => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      text: '',
      type: 'text',
      points: 5,
      isRequired: true,
    };
    onChange([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    onChange(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const removeQuestion = (id: string) => {
    onChange(questions.filter(q => q.id !== id));
  };

  const addOption = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question) {
      const options = [...(question.options || []), `خيار جديد ${ (question.options?.length || 0) + 1 }` ];
      updateQuestion(questionId, { options });
    }
  };

  const updateOption = (questionId: string, index: number, value: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question && question.options) {
      const options = [...question.options];
      options[index] = value;
      updateQuestion(questionId, { options });
    }
  };

  const removeOption = (questionId: string, index: number) => {
    const question = questions.find(q => q.id === questionId);
    if (question && question.options) {
      const options = question.options.filter((_, i) => i !== index);
      updateQuestion(questionId, { options });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-slate-900 tracking-tight">بناء الأسئلة</h3>
        <button
          type="button"
          onClick={addQuestion}
          className="inline-flex items-center gap-2 rounded-2xl bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-600 hover:bg-indigo-100 transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" />
          إضافة سؤال
        </button>
      </div>

      <Reorder.Group axis="y" values={questions} onReorder={onChange} className="space-y-4">
        {questions.map((question, index) => (
          <Reorder.Item
            key={question.id}
            value={question}
            className="glass-card p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative group"
          >
            <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
              <GripVertical className="h-5 w-5 text-slate-300" />
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex flex-col md:flex-row gap-4 items-start">
                <div className="flex-1 w-full">
                  <input
                    type="text"
                    placeholder="نص السؤال..."
                    className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold"
                    value={question.text}
                    onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
                  />
                </div>
                <div className="w-full md:w-48">
                  <select
                    className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold appearance-none"
                    value={question.type}
                    onChange={(e) => {
                      const type = e.target.value as QuestionType;
                      const updates: Partial<Question> = { type };
                      if ((type === 'multiple_choice' || type === 'checkbox') && !question.options) {
                        updates.options = ['خيار 1'];
                      }
                      updateQuestion(question.id, updates);
                    }}
                  >
                    <option value="text">إجابة قصيرة</option>
                    <option value="paragraph">فقرة</option>
                    <option value="multiple_choice">خيارات متعددة</option>
                    <option value="checkbox">مربعات اختيار</option>
                  </select>
                </div>
              </div>

              {/* Options for Multiple Choice and Checkbox */}
              {(question.type === 'multiple_choice' || question.type === 'checkbox') && (
                <div className="space-y-3 pr-4 border-r-2 border-slate-100">
                  {question.options?.map((option, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-3 group/option">
                      {question.type === 'multiple_choice' ? (
                        <Circle className="h-4 w-4 text-slate-300" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-300" />
                      )}
                      <input
                        type="text"
                        className="flex-1 bg-transparent border-0 border-b border-transparent focus:border-indigo-600 focus:ring-0 p-1 text-sm font-medium text-slate-700 transition-all"
                        value={option}
                        onChange={(e) => updateOption(question.id, optIndex, e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(question.id, optIndex)}
                        className="opacity-0 group-hover/option:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addOption(question.id)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mt-2"
                  >
                    <Plus className="h-3 w-3" />
                    إضافة خيار
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">النقاط:</span>
                    <input
                      type="number"
                      min="0"
                      className="w-16 rounded-xl border-0 py-1 px-2 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-100 focus:ring-2 focus:ring-indigo-600 text-xs font-bold text-center"
                      value={question.points}
                      onChange={(e) => updateQuestion(question.id, { points: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer group/toggle">
                    <div className={`w-10 h-5 rounded-full p-1 transition-all duration-300 ${question.isRequired ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                      <div className={`w-3 h-3 bg-white rounded-full transition-all duration-300 ${question.isRequired ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={question.isRequired}
                      onChange={(e) => updateQuestion(question.id, { isRequired: e.target.checked })}
                    />
                    <span className="text-xs font-bold text-slate-500 group-hover/toggle:text-slate-700 transition-colors">مطلوب</span>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => removeQuestion(question.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  title="حذف السؤال"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {questions.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-4xl">
          <Type className="h-12 w-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-bold">ابدأ بإضافة أسئلة للواجب</p>
          <button
            type="button"
            onClick={addQuestion}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white hover:bg-indigo-700 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            إضافة أول سؤال
          </button>
        </div>
      )}
    </div>
  );
}
