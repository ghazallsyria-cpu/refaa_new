'use client';

import { Plus, Trash2, GripVertical, CheckCircle2, Circle, Square, Type, X } from 'lucide-react';
import { Reorder } from 'motion/react';
import { Question, QuestionType, Option } from '@/types/question';

interface AssignmentBuilderProps {
  questions: Question[];
  onChange: (questions: Question[]) => void;
}

export default function AssignmentBuilder({ questions, onChange }: AssignmentBuilderProps) {
  const addQuestion = () => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      content: '', // تم التعديل من text إلى content
      type: 'text',
      points: 5,
      isRequired: true,
      options: [], // مصفوفة فارغة جاهزة
    };
    
    onChange([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    onChange(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const removeQuestion = (id: string) => {
    onChange(questions.filter(q => q.id !== id));
  };

  // إصلاح: إضافة الخيار كـ Object كامل مطابق لقاعدة البيانات
  const addOption = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question) {
      const currentOptions = question.options || [];
      const newOption: Option = {
        id: crypto.randomUUID(),
        content: `خيار جديد ${currentOptions.length + 1}`,
        is_correct: false // افتراضياً غير صحيح
      };
      updateQuestion(questionId, { options: [...currentOptions, newOption] });
    }
  };

  // إصلاح: تحديث نص الخيار داخل الـ Object
  const updateOptionContent = (questionId: string, index: number, value: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question && question.options) {
      const newOptions = [...question.options];
      newOptions[index] = { ...newOptions[index], content: value };
      updateQuestion(questionId, { options: newOptions });
    }
  };

  // ميزة جديدة: تحديد الإجابة الصحيحة
  const toggleOptionCorrectness = (questionId: string, index: number, isMultiSelect: boolean) => {
    const question = questions.find(q => q.id === questionId);
    if (question && question.options) {
      const newOptions = question.options.map((opt, i) => {
        if (i === index) return { ...opt, is_correct: !opt.is_correct };
        // إذا لم يكن "مربعات اختيار"، اجعل باقي الخيارات خاطئة
        if (!isMultiSelect) return { ...opt, is_correct: false }; 
        return opt;
      });
      updateQuestion(questionId, { options: newOptions });
    }
  };

  const removeOption = (questionId: string, index: number) => {
    const question = questions.find(q => q.id === questionId);
    if (question && question.options) {
      const newOptions = question.options.filter((_, i) => i !== index);
      updateQuestion(questionId, { options: newOptions });
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
        {questions.map((question) => (
          <Reorder.Item
            key={question.id}
            value={question}
            className="glass-card p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative group bg-white"
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
                    className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold"
                    value={question.content || ''}
                    onChange={(e) => updateQuestion(question.id, { content: e.target.value })}
                  />
                </div>
                <div className="w-full md:w-48">
                  <select
                    className="block w-full rounded-2xl border-0 py-3 px-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-all font-bold appearance-none"
                    value={question.type}
                    onChange={(e) => {
                      const type = e.target.value as QuestionType;
                      const updates: Partial<Question> = { type };
                      // تهيئة الخيارات بـ Object صحيح إذا كان النوع يتطلب خيارات
                      if ((type === 'multiple_choice' || type === 'checkbox') && (!question.options || question.options.length === 0)) {
                        updates.options = [
                          { id: crypto.randomUUID(), content: 'خيار 1', is_correct: false }
                        ];
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
                    <div key={option.id || optIndex} className="flex items-center gap-3 group/option">
                      {/* زر تحديد الإجابة الصحيحة */}
                      <button 
                        type="button"
                        onClick={() => toggleOptionCorrectness(question.id, optIndex, question.type === 'checkbox')}
                        className={`transition-colors ${option.is_correct ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-400'}`}
                        title="تحديد كإجابة صحيحة"
                      >
                        {question.type === 'multiple_choice' ? (
                          option.is_correct ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />
                        ) : (
                          option.is_correct ? <CheckCircle2 className="h-5 w-5" /> : <Square className="h-5 w-5" />
                        )}
                      </button>
                      
                      <input
                        type="text"
                        className={`flex-1 bg-transparent border-0 border-b border-transparent focus:border-indigo-600 focus:ring-0 p-1 text-sm font-medium transition-all ${option.is_correct ? 'text-emerald-700' : 'text-slate-700'}`}
                        value={option.content || ''}
                        onChange={(e) => updateOptionContent(question.id, optIndex, e.target.value)}
                        placeholder={`خيار ${optIndex + 1}`}
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
                      className="w-16 rounded-xl border-0 py-1 px-2 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 text-xs font-bold text-center"
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
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
          <Type className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-bold mb-4">ابدأ بإضافة أسئلة للواجب أو الاختبار</p>
          <button
            type="button"
            onClick={addQuestion}
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white hover:bg-indigo-700 transition-all active:scale-95 shadow-sm shadow-indigo-200"
          >
            <Plus className="h-5 w-5" />
            إضافة أول سؤال
          </button>
        </div>
      )}
    </div>
  );
}

