'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical, CheckCircle2, Circle, Square, Type, AlignLeft, X, Heading, Columns, ListFilter } from 'lucide-react';
import { motion, Reorder } from 'motion/react';
import { Question, QuestionType } from '@/types/question';
import ImageUpload from '@/components/ImageUpload';

interface AssignmentBuilderProps {
  questions: any[];
  onChange: (questions: any[]) => void;
}

export default function AssignmentBuilder({ questions, onChange }: AssignmentBuilderProps) {
  const addQuestion = (type: string = 'text') => {
    const newQuestion = {
      id: crypto.randomUUID(),
      text: '',
      type: type,
      points: type === 'section_header' ? 0 : 5,
      isRequired: type !== 'section_header',
      options: type === 'comparison' ? ['العنصر الأول', 'العنصر الثاني', 'وجه المقارنة الأول'] : undefined,
      media_url: null
    };
    onChange([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<any>) => {
    onChange(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const removeQuestion = (id: string) => {
    onChange(questions.filter(q => q.id !== id));
  };

  const addOption = (questionId: string, isAspect: boolean = false) => {
    const question = questions.find(q => q.id === questionId);
    if (question) {
      const currentOptions = question.options || [];
      const newLabel = isAspect ? `وجه مقارنة جديد ${currentOptions.length - 1}` : `خيار جديد ${currentOptions.length + 1}`;
      const options = [...currentOptions, newLabel];
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
      const options = question.options.filter((_: any, i: number) => i !== index);
      updateQuestion(questionId, { options });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-200">
        <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Type className="h-5 w-5 text-indigo-600" />
          أسئلة الواجب
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => addQuestion('section_header')} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-100 transition-all border border-amber-200 shadow-sm">
            <Heading className="h-4 w-4" /> عنوان رئيسي
          </button>
          <button type="button" onClick={() => addQuestion('comparison')} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100 transition-all border border-emerald-200 shadow-sm">
            <Columns className="h-4 w-4" /> سؤال مقارنة
          </button>
          <button type="button" onClick={() => addQuestion('text')} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200">
            <Plus className="h-4 w-4" /> سؤال عادي
          </button>
        </div>
      </div>

      <Reorder.Group axis="y" values={questions} onReorder={onChange} className="space-y-6">
        {questions.map((question, index) => {
          const isHeader = question.type === 'section_header';
          const isComparison = question.type === 'comparison';

          return (
            <Reorder.Item
              key={question.id}
              value={question}
              className={`p-6 sm:p-8 rounded-[2rem] border-2 shadow-sm relative group transition-all bg-white
                ${isHeader ? 'border-amber-200 hover:border-amber-400' : 'border-slate-100 hover:border-indigo-200 hover:shadow-md'}
              `}
            >
              <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-white px-3 py-1 rounded-full shadow-sm border border-slate-200">
                <GripVertical className="h-5 w-5 text-slate-400" />
              </div>

              <div className="flex flex-col gap-6 pt-4">
                <div className="flex flex-col md:flex-row gap-4 items-start">
                  <div className="flex-1 w-full space-y-4">
                    <input
                      type="text"
                      dir="auto"
                      placeholder={isHeader ? "اكتب العنوان الرئيسي هنا (مثال: أجب عن الأسئلة التالية مع التعليل)..." : "نص السؤال..."}
                      className={`block w-full border-0 focus:ring-0 sm:text-sm transition-all font-bold placeholder:text-slate-300 outline-none
                        ${isHeader ? 'text-2xl text-amber-900 bg-amber-50 p-4 rounded-2xl' : 'rounded-2xl py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600'}
                      `}
                      value={question.text || question.content || ''}
                      onChange={(e) => updateQuestion(question.id, { text: e.target.value, content: e.target.value })}
                    />
                    
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <ImageUpload 
                        initialImageUrl={question.media_url}
                        onUploadSuccess={(url) => updateQuestion(question.id, { media_url: url })}
                        label="إرفاق صورة توضيحية لهذا السؤال (اختياري)"
                      />
                    </div>
                  </div>

                  {!isHeader && (
                    <div className="w-full md:w-56 shrink-0">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">نوع السؤال</label>
                      <select
                        className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold appearance-none cursor-pointer"
                        value={question.type}
                        onChange={(e) => {
                          const type = e.target.value;
                          const updates: any = { type };
                          if ((type === 'multiple_choice' || type === 'checkbox') && !question.options) {
                            updates.options = ['خيار 1'];
                          } else if (type === 'comparison' && (!question.options || question.options.length < 3)) {
                            updates.options = ['الطرف الأول', 'الطرف الثاني', 'وجه المقارنة 1'];
                          }
                          updateQuestion(question.id, updates);
                        }}
                      >
                        <option value="text">إجابة قصيرة</option>
                        <option value="paragraph">فقرة</option>
                        <option value="multiple_choice">خيارات متعددة</option>
                        <option value="checkbox">مربعات اختيار</option>
                        <option value="comparison">جدول مقارنة احترافي</option>
                      </select>
                    </div>
                  )}
                </div>

                {isComparison && (
                  <div className="p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <p className="text-xs font-black text-emerald-800 flex items-center gap-2">
                          <Columns className="h-4 w-4" /> أطراف المقارنة (الأعمدة الرئيسية):
                        </p>
                        <div className="flex gap-3">
                          <input
                             type="text" dir="auto" placeholder="الطرف الأول..."
                             value={(question.options && question.options[0]) || ''}
                             onChange={(e) => updateOption(question.id, 0, e.target.value)}
                             className="w-full p-3 rounded-xl border border-emerald-200 bg-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                          <input
                             type="text" dir="auto" placeholder="الطرف الثاني..."
                             value={(question.options && question.options[1]) || ''}
                             onChange={(e) => updateOption(question.id, 1, e.target.value)}
                             className="w-full p-3 rounded-xl border border-emerald-200 bg-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-xs font-black text-emerald-800 flex items-center gap-2">
                          <ListFilter className="h-4 w-4" /> أوجه المقارنة (أسطر الجدول):
                        </p>
                        <div className="space-y-2">
                          {question.options?.slice(2).map((aspect: string, idx: number) => (
                            <div key={idx + 2} className="flex gap-2">
                              <input
                                type="text" dir="auto" placeholder={`وجه المقارنة ${idx + 1}...`}
                                value={aspect}
                                onChange={(e) => updateOption(question.id, idx + 2, e.target.value)}
                                className="w-full p-3 rounded-xl border border-emerald-200 bg-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                              {(question.options.length > 3) && (
                                <button type="button" onClick={() => removeOption(question.id, idx + 2)} className="px-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors">
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button type="button" onClick={() => addOption(question.id, true)} className="w-full py-3 border-2 border-dashed border-emerald-300 text-emerald-600 rounded-xl text-xs font-black hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2">
                            <Plus className="w-4 h-4" /> إضافة وجه مقارنة جديد
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {(question.type === 'multiple_choice' || question.type === 'checkbox') && (
                  <div className="space-y-3 pr-4 border-r-2 border-indigo-100">
                    {question.options?.map((option: string, optIndex: number) => (
                      <div key={optIndex} className="flex items-center gap-3 group/option bg-slate-50 p-2 rounded-xl">
                        {question.type === 'multiple_choice' ? <Circle className="h-4 w-4 text-indigo-300" /> : <Square className="h-4 w-4 text-indigo-300" />}
                        <input
                          type="text" dir="auto"
                          className="flex-1 bg-transparent border-0 focus:ring-0 p-1 text-sm font-bold text-slate-700 transition-all outline-none"
                          value={option}
                          onChange={(e) => updateOption(question.id, optIndex, e.target.value)}
                        />
                        <button type="button" onClick={() => removeOption(question.id, optIndex)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><X className="h-4 w-4" /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addOption(question.id)} className="text-xs font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mt-2 bg-indigo-50 px-3 py-2 rounded-lg transition-colors"><Plus className="h-4 w-4" /> إضافة خيار</button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 gap-4">
                  {!isHeader ? (
                    <div className="flex items-center gap-6 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-500">النقاط:</span>
                        <input
                          type="number" min="0"
                          className="w-16 rounded-lg border border-slate-200 py-1.5 px-2 text-slate-900 focus:ring-2 focus:ring-indigo-600 text-sm font-black text-center outline-none"
                          value={question.points}
                          onChange={(e) => updateQuestion(question.id, { points: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="h-6 w-px bg-slate-200"></div>
                      <label className="flex items-center gap-2 cursor-pointer group/toggle">
                        <div className={`w-10 h-5 rounded-full p-1 transition-all duration-300 ${question.isRequired ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                          <div className={`w-3 h-3 bg-white rounded-full transition-all duration-300 ${question.isRequired ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'}`} />
                        </div>
                        <input type="checkbox" className="hidden" checked={question.isRequired} onChange={(e) => updateQuestion(question.id, { isRequired: e.target.checked })} />
                        <span className="text-xs font-black text-slate-500 group-hover/toggle:text-slate-700">سؤال إجباري</span>
                      </label>
                    </div>
                  ) : <div></div>}
                  
                  <button type="button" onClick={() => removeQuestion(question.id)} className="flex items-center gap-2 px-4 py-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all font-bold text-sm">
                    <Trash2 className="h-4 w-4" /> حذف
                  </button>
                </div>
              </div>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>

      {questions.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-slate-300 rounded-[3rem] bg-slate-50">
          <Type className="h-16 w-16 text-indigo-200 mx-auto mb-4" />
          <p className="text-slate-500 font-bold text-lg mb-6">الواجب لا يحتوي على أي أسئلة حالياً</p>
          <button type="button" onClick={() => addQuestion('text')} className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-black text-white hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-200">
            <Plus className="h-5 w-5" /> إضافة السؤال الأول
          </button>
        </div>
      )}
    </div>
  );
}
