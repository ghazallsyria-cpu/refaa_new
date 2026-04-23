'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical, CheckCircle2, Circle, Square, Type, AlignLeft, X, Heading, Columns, ListFilter, UploadCloud } from 'lucide-react';
import { motion, Reorder } from 'motion/react';
import ImageUpload from '@/components/ImageUpload';
import ForumEditorOriginal from '@/components/ForumEditor';

// 🪄 الحيلة السحرية لإسكات TypeScript وعدم المساس بالمكون الأصلي
const ForumEditor = ForumEditorOriginal as any;

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
      options: type === 'comparison' ? ['الطرف الأول', 'الطرف الثاني', 'وجه المقارنة الأول'] : undefined,
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
    <div className="space-y-8" dir="rtl">
      
      {/* 🚀 Header: شريط التحكم العلوي */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#131836]/60 backdrop-blur-xl p-4 sm:p-6 rounded-[2rem] border border-white/10 shadow-inner">
        <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3 drop-shadow-sm">
          <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
            <Type className="h-5 w-5 text-indigo-400" />
          </div>
          أسئلة الواجب
        </h3>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button type="button" onClick={() => addQuestion('section_header')} className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2.5 text-xs sm:text-sm font-black text-amber-400 hover:bg-amber-500 hover:text-slate-900 transition-all border border-amber-500/20 shadow-inner active:scale-95">
            <Heading className="h-4 w-4" /> عنوان رئيسي
          </button>
          <button type="button" onClick={() => addQuestion('comparison')} className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2.5 text-xs sm:text-sm font-black text-emerald-400 hover:bg-emerald-500 hover:text-slate-900 transition-all border border-emerald-500/20 shadow-inner active:scale-95">
            <Columns className="h-4 w-4" /> مقارنة
          </button>
          <button type="button" onClick={() => addQuestion('text')} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-2.5 text-xs sm:text-sm font-black text-white hover:opacity-90 transition-all shadow-[0_0_15px_rgba(99,102,241,0.4)] border border-indigo-400/50 active:scale-95">
            <Plus className="h-4 w-4" /> إضافة سؤال
          </button>
        </div>
      </div>

      <Reorder.Group axis="y" values={questions} onReorder={onChange} className="space-y-6 sm:space-y-8">
        {questions.map((question, index) => {
          const isHeader = question.type === 'section_header';
          const isComparison = question.type === 'comparison';

          return (
            <Reorder.Item
              key={question.id}
              value={question}
              className={`p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border shadow-lg relative group transition-all backdrop-blur-md
                ${isHeader ? 'bg-[#131836]/40 border-amber-500/30 hover:border-amber-400/50' : 'bg-[#02040a]/60 border-white/5 hover:border-white/10'}
              `}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-[#131836] px-4 py-1.5 rounded-b-xl shadow-md border border-t-0 border-white/10 z-20">
                <GripVertical className="h-5 w-5 text-slate-400" />
              </div>

              <div className="flex flex-col gap-6 pt-2 sm:pt-4">
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                  
                  {/* 🚀 مساحة السؤال باستخدام ForumEditor */}
                  <div className="flex-1 w-full space-y-4">
                    <label className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest block pl-1">نص السؤال {index + 1}</label>
                    <div className="bg-[#0f1423]/80 p-2 rounded-xl sm:rounded-2xl border border-white/5 shadow-inner">
                      <ForumEditor 
                        content={question.text || question.content || ''}
                        setContent={(val: any) => updateQuestion(question.id, { text: val, content: val })}
                        canUploadImage={true}
                        placeholder={isHeader ? "اكتب العنوان الرئيسي هنا..." : "اكتب نص السؤال، أو المسألة الرياضية بالتفصيل هنا..."}
                      />
                    </div>
                    
                    <div className="bg-[#090b14]/50 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-white/5 mt-4 shadow-inner">
                      <ImageUpload 
                        initialImageUrl={question.media_url}
                        onUploadSuccess={(url) => updateQuestion(question.id, { media_url: url })}
                        label="إرفاق صورة توضيحية (اختياري)"
                      />
                    </div>
                  </div>

                  {/* 🚀 إعدادات السؤال (العمود الأيسر) */}
                  {!isHeader && (
                    <div className="w-full lg:w-64 shrink-0 space-y-4 bg-[#090b14]/30 p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">نوع الإجابة المطلوبة</label>
                        <select
                          className="block w-full rounded-xl border border-white/10 py-3 px-4 text-white bg-[#0f1423] shadow-inner focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 text-xs sm:text-sm transition-all font-bold appearance-none cursor-pointer outline-none [&>option]:bg-[#0f1423]"
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
                          <option value="text">إجابة نصية قصيرة</option>
                          <option value="paragraph">إجابة نصية (فقرة)</option>
                          <option value="file_upload">إرفاق صورة / ملف (مهم)</option>
                          <option value="multiple_choice">خيارات متعددة (دائرة)</option>
                          <option value="checkbox">مربعات اختيار (صح)</option>
                          <option value="comparison">جدول مقارنة احترافي</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* 🚀 إعدادات المقارنة */}
                {isComparison && (
                  <div className="p-5 sm:p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/20 space-y-6 shadow-inner">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <p className="text-[10px] sm:text-xs font-black text-emerald-400 flex items-center gap-2 uppercase tracking-widest">
                          <Columns className="h-4 w-4" /> أطراف المقارنة (الأعمدة):
                        </p>
                        <div className="flex gap-3">
                          <input
                             type="text" dir="auto" placeholder="الطرف الأول..."
                             value={(question.options && question.options[0]) || ''}
                             onChange={(e) => updateOption(question.id, 0, e.target.value)}
                             className="w-full p-3 sm:p-3.5 rounded-xl border border-white/10 bg-[#02040a]/80 text-white font-bold text-xs sm:text-sm focus:border-emerald-500/50 outline-none shadow-inner transition-colors placeholder:text-slate-600"
                          />
                          <input
                             type="text" dir="auto" placeholder="الطرف الثاني..."
                             value={(question.options && question.options[1]) || ''}
                             onChange={(e) => updateOption(question.id, 1, e.target.value)}
                             className="w-full p-3 sm:p-3.5 rounded-xl border border-white/10 bg-[#02040a]/80 text-white font-bold text-xs sm:text-sm focus:border-emerald-500/50 outline-none shadow-inner transition-colors placeholder:text-slate-600"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-[10px] sm:text-xs font-black text-emerald-400 flex items-center gap-2 uppercase tracking-widest">
                          <ListFilter className="h-4 w-4" /> أوجه المقارنة (الأسطر):
                        </p>
                        <div className="space-y-2">
                          {question.options?.slice(2).map((aspect: string, idx: number) => (
                            <div key={idx + 2} className="flex gap-2">
                              <input
                                type="text" dir="auto" placeholder={`وجه المقارنة ${idx + 1}...`}
                                value={aspect}
                                onChange={(e) => updateOption(question.id, idx + 2, e.target.value)}
                                className="w-full p-3 sm:p-3.5 rounded-xl border border-white/10 bg-[#02040a]/80 text-white font-bold text-xs sm:text-sm focus:border-emerald-500/50 outline-none shadow-inner transition-colors placeholder:text-slate-600"
                              />
                              {(question.options.length > 3) && (
                                <button type="button" onClick={() => removeOption(question.id, idx + 2)} className="px-3 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-inner border border-rose-500/20 active:scale-95">
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button type="button" onClick={() => addOption(question.id, true)} className="w-full py-3 sm:py-3.5 border border-dashed border-emerald-500/30 text-emerald-400 bg-emerald-500/5 rounded-xl text-xs font-black hover:bg-emerald-500/10 transition-colors flex items-center justify-center gap-2">
                            <Plus className="w-4 h-4" /> إضافة وجه مقارنة
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 🚀 إعدادات رفع الملف */}
                {question.type === 'file_upload' && (
                  <div className="p-6 sm:p-8 bg-indigo-500/10 rounded-[1.5rem] border border-indigo-500/20 flex flex-col items-center justify-center text-center gap-3 shadow-inner">
                     <UploadCloud className="h-8 w-8 sm:h-10 sm:w-10 text-indigo-400 drop-shadow-md" />
                     <p className="text-white font-black text-sm sm:text-base">إجابة بمرفق</p>
                     <p className="text-indigo-300/70 text-[10px] sm:text-xs font-bold max-w-sm">سيظهر للطالب زر مخصص لرفع صورة لحله (مثل تصوير ورقة الدفتر) للإجابة على هذه المسألة.</p>
                  </div>
                )}

                {/* 🚀 إعدادات الخيارات المتعددة */}
                {(question.type === 'multiple_choice' || question.type === 'checkbox') && (
                  <div className="space-y-3 bg-[#090b14]/50 p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                    <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-3">خيارات الإجابة</p>
                    {question.options?.map((option: string, optIndex: number) => (
                      <div key={optIndex} className="flex items-center gap-3 group/option bg-[#0f1423] p-2 rounded-xl shadow-inner border border-white/10 transition-colors hover:border-indigo-500/50">
                        {question.type === 'multiple_choice' ? <Circle className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-400 ml-2" /> : <Square className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-400 ml-2" />}
                        <input
                          type="text" dir="auto" placeholder={`خيار ${optIndex + 1}`}
                          className="flex-1 bg-transparent border-0 focus:ring-0 p-1 text-xs sm:text-sm font-bold text-white transition-all outline-none placeholder:text-slate-600"
                          value={option}
                          onChange={(e) => updateOption(question.id, optIndex, e.target.value)}
                        />
                        <button type="button" onClick={() => removeOption(question.id, optIndex)} className="p-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all active:scale-90"><X className="h-4 w-4 sm:h-5 sm:w-5" /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addOption(question.id)} className="text-xs sm:text-sm font-black text-indigo-400 hover:text-indigo-300 flex items-center justify-center w-full gap-2 mt-3 bg-indigo-500/10 px-4 py-3 rounded-xl transition-all border border-indigo-500/20 shadow-inner active:scale-95">
                      <Plus className="w-4 h-4" /> إضافة خيار جديد
                    </button>
                  </div>
                )}

                {/* 🚀 شريط الأدوات السفلي للسؤال (النقاط، الإلزامية، والحذف) */}
                <div className="flex flex-col sm:flex-row items-center justify-between pt-5 sm:pt-6 border-t border-white/5 gap-4 mt-2">
                  {!isHeader ? (
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-[#090b14]/50 px-4 sm:px-5 py-3 rounded-xl sm:rounded-2xl border border-white/5 shadow-inner w-full sm:w-auto justify-center sm:justify-start">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">النقاط:</span>
                        <input
                          type="number" min="0"
                          className="w-16 sm:w-20 rounded-xl border border-white/10 py-1.5 sm:py-2 px-2 text-white bg-[#0f1423] focus:border-indigo-500/50 outline-none text-xs sm:text-sm font-black text-center shadow-inner"
                          value={question.points}
                          onChange={(e) => updateQuestion(question.id, { points: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="hidden sm:block h-6 w-px bg-white/10"></div>
                      <label className="flex items-center gap-2 cursor-pointer group/toggle">
                        <div className={`w-10 sm:w-11 h-5 sm:h-6 rounded-full p-1 transition-all duration-300 border shadow-inner flex items-center ${question.isRequired ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-[#0f1423] border-white/10'}`}>
                          <div className={`w-3 sm:w-4 h-3 sm:h-4 rounded-full transition-all duration-300 shadow-md ${question.isRequired ? 'translate-x-4 sm:translate-x-5 rtl:-translate-x-4 sm:rtl:-translate-x-5 bg-emerald-400' : 'translate-x-0 bg-slate-500'}`} />
                        </div>
                        <span className={`text-[10px] sm:text-xs font-black transition-colors ${question.isRequired ? 'text-emerald-400' : 'text-slate-500'}`}>سؤال إجباري</span>
                      </label>
                    </div>
                  ) : <div></div>}
                  
                  <button type="button" onClick={() => removeQuestion(question.id)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 sm:py-3.5 text-rose-400 hover:text-white hover:bg-rose-500 rounded-xl sm:rounded-2xl transition-all font-black text-xs sm:text-sm bg-rose-500/10 border border-rose-500/20 shadow-inner active:scale-95">
                    <Trash2 className="h-4 w-4" /> حذف المكون
                  </button>
                </div>
              </div>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>

      {/* 🚀 حالة الفراغ (Empty State) */}
      {questions.length === 0 && (
        <div className="text-center py-20 sm:py-28 border-2 border-dashed border-white/10 rounded-[3rem] bg-[#131836]/30 backdrop-blur-sm shadow-inner px-4">
          <div className="h-20 w-20 sm:h-24 sm:w-24 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-500/20 shadow-inner">
            <Type className="h-10 w-10 sm:h-12 sm:w-12 text-indigo-400 drop-shadow-md" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">لا توجد أسئلة حالياً</h3>
          <p className="text-sm sm:text-base text-slate-400 font-bold mb-8">ابدأ ببناء الواجب عن طريق إضافة الأسئلة والمقارنات.</p>
          <button type="button" onClick={() => addQuestion('text')} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-8 py-4 sm:py-4.5 text-sm sm:text-base font-black text-white hover:opacity-90 transition-all active:scale-95 shadow-[0_0_20px_rgba(99,102,241,0.3)] border border-indigo-400/50">
            <Plus className="h-5 w-5" /> إضافة السؤال الأول
          </button>
        </div>
      )}
    </div>
  );
}
