'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical, CheckCircle2, Circle, Square, Type, AlignLeft, X, Heading, Columns, ListFilter, UploadCloud, TableProperties, ArrowRight, ArrowDown, Sparkles } from 'lucide-react';
import { motion, Reorder } from 'motion/react';
import ImageUpload from '@/components/ImageUpload';
import ForumEditorOriginal from '@/components/ForumEditor';
import { cn } from '@/lib/utils'; // افتراض وجود دالة cn لدمج الكلاسات

// 🪄 الحيلة السحرية لإسكات TypeScript عند استدعاء مكون لا يملك Type Definitions دقيقة
const ForumEditor = ForumEditorOriginal as any;

// ==========================================
// 📦 تعريف الخصائص (Props) המمررة للمكون
// ==========================================
interface AssignmentBuilderProps {
  questions: any[]; 
  onChange: (questions: any[]) => void; 
}

export default function AssignmentBuilder({ questions, onChange }: AssignmentBuilderProps) {
  
  // ==========================================
  // ➕ إضافة سؤال/عنصر جديد للمصفوفة
  // ==========================================
  const addQuestion = (type: string = 'text') => {
    const newQuestion: any = {
      id: crypto.randomUUID(),
      text: '', 
      type: type, 
      points: type === 'section_header' ? 0 : 5, 
      isRequired: type !== 'section_header', 
      media_url: null 
    };

    if (type === 'comparison') {
      newQuestion.options = [
        { id: crypto.randomUUID(), content: 'الطرف الأول' },
        { id: crypto.randomUUID(), content: 'الطرف الثاني' },
        { id: crypto.randomUUID(), content: 'وجه المقارنة الأول' }
      ];
    } else if (type === 'data_table') {
      newQuestion.table = {
        headers: ['العنصر', 'C', 'H'],
        rows: [
          ['الكتل بالجرام', '', ''],
          ['عدد المولات', '', '']
        ]
      };
    } else if (type === 'multiple_choice' || type === 'checkbox' || type === 'true_false') {
      newQuestion.options = [
        { id: crypto.randomUUID(), content: 'الخيار الأول' }
      ];
    }

    onChange([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<any>) => {
    onChange(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const removeQuestion = (id: string) => {
    onChange(questions.filter(q => q.id !== id));
  };

  // ==========================================
  // 🎛️ أدوات إدارة الخيارات (Options Management)
  // ==========================================
  const addOption = (questionId: string, isAspect: boolean = false) => {
    const question = questions.find(q => q.id === questionId);
    if (question) {
      const currentOptions = question.options || [];
      const newLabel = isAspect ? `وجه مقارنة جديد` : `خيار جديد`;
      updateQuestion(questionId, { 
        options: [...currentOptions, { id: crypto.randomUUID(), content: newLabel }] 
      });
    }
  };

  const updateOption = (questionId: string, index: number, value: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question && question.options) {
      const options = [...question.options];
      if (typeof options[index] === 'string') {
        options[index] = { id: crypto.randomUUID(), content: value };
      } else {
        options[index] = { ...options[index], content: value };
      }
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

  // ==========================================
  // 📊 أدوات إدارة جداول البيانات (Data Tables)
  // ==========================================
  const addTableColumn = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question && question.table) {
      const newHeaders = [...question.table.headers, `عمود ${question.table.headers.length}`];
      const newRows = question.table.rows.map((row: string[]) => [...row, '']);
      updateQuestion(questionId, { table: { headers: newHeaders, rows: newRows } });
    }
  };

  const addTableRow = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question && question.table) {
      const newRow = new Array(question.table.headers.length).fill('');
      newRow[0] = `صف ${question.table.rows.length + 1}`;
      const newRows = [...question.table.rows, newRow];
      updateQuestion(questionId, { table: { ...question.table, rows: newRows } });
    }
  };

  const updateTableHeader = (questionId: string, colIndex: number, value: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question && question.table) {
      const newHeaders = [...question.table.headers];
      newHeaders[colIndex] = value;
      updateQuestion(questionId, { table: { ...question.table, headers: newHeaders } });
    }
  };

  const updateTableCell = (questionId: string, rowIndex: number, colIndex: number, value: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question && question.table) {
      const newRows = [...question.table.rows];
      newRows[rowIndex][colIndex] = value;
      updateQuestion(questionId, { table: { ...question.table, rows: newRows } });
    }
  };

  const removeTableColumn = (questionId: string, colIndex: number) => {
    const question = questions.find(q => q.id === questionId);
    if (question && question.table && question.table.headers.length > 2) {
      const newHeaders = question.table.headers.filter((_: any, i: number) => i !== colIndex);
      const newRows = question.table.rows.map((row: string[]) => row.filter((_: any, i: number) => i !== colIndex));
      updateQuestion(questionId, { table: { headers: newHeaders, rows: newRows } });
    }
  };

  const removeTableRow = (questionId: string, rowIndex: number) => {
    const question = questions.find(q => q.id === questionId);
    if (question && question.table && question.table.rows.length > 1) {
      const newRows = question.table.rows.filter((_: any, i: number) => i !== rowIndex);
      updateQuestion(questionId, { table: { ...question.table, rows: newRows } });
    }
  };

  // ==========================================
  // 🎨 الواجهة المرئية للمصنع (Gemini UI)
  // ==========================================
  return (
    <div className="space-y-8 relative z-10" dir="rtl">
      
      {/* 👑 شريط التحكم العلوي (Floating Glass Bar) */}
      <div className="glass-panel p-4 sm:p-6 rounded-[2rem] flex flex-wrap items-center justify-between gap-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] border-indigo-500/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px] pointer-events-none mix-blend-screen transition-transform duration-1000 group-hover:scale-150"></div>
        <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3 drop-shadow-md relative z-10">
          <div className="p-2 bg-indigo-500/10 backdrop-blur-md rounded-xl border border-indigo-500/30 shadow-inner">
            <Sparkles className="h-5 w-5 text-indigo-400 drop-shadow-sm" />
          </div>
          مختبر بناء الواجبات
        </h3>
        
        {/* أزرار الإضافة السريعة */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto relative z-10">
          <button type="button" onClick={() => addQuestion('section_header')} className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 backdrop-blur-md px-4 py-2.5 text-xs sm:text-sm font-black text-amber-400 hover:bg-amber-500 hover:text-slate-900 transition-all border border-amber-500/20 shadow-inner active:scale-95">
            <Heading className="h-4 w-4" /> عنوان
          </button>
          <button type="button" onClick={() => addQuestion('data_table')} className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500/10 backdrop-blur-md px-4 py-2.5 text-xs sm:text-sm font-black text-cyan-400 hover:bg-cyan-500 hover:text-slate-900 transition-all border border-cyan-500/20 shadow-inner active:scale-95">
            <TableProperties className="h-4 w-4" /> جدول
          </button>
          <button type="button" onClick={() => addQuestion('text')} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500/80 to-blue-600/80 backdrop-blur-md px-6 py-2.5 text-xs sm:text-sm font-black text-white hover:from-indigo-500 hover:to-blue-600 transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] border border-indigo-400/50 active:scale-95">
            <Plus className="h-4 w-4" /> سؤال جديد
          </button>
        </div>
      </div>

      {/* 🗂️ منطقة عرض وترتيب الأسئلة (Holographic Cards) */}
      <Reorder.Group axis="y" values={questions} onReorder={onChange} className="space-y-6 sm:space-y-8">
        {questions.map((question, index) => {
          
          const isHeader = question.type === 'section_header';
          const isComparison = question.type === 'comparison';
          const isDataTable = question.type === 'data_table';

          return (
            <Reorder.Item
              key={question.id}
              value={question}
              className={cn(
                "p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] relative group transition-all duration-500 backdrop-blur-xl border shadow-[0_15px_40px_rgba(0,0,0,0.4)]",
                isHeader ? "bg-amber-900/10 border-amber-500/30" : isDataTable ? "bg-cyan-900/10 border-cyan-500/30" : "bg-[#0f1423]/40 border-indigo-500/30 hover:border-indigo-400/50"
              )}
            >
              {/* 🌌 لمعة الزجاج الداخلية */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none rounded-[2rem] sm:rounded-[2.5rem]"></div>
              
              {/* 🖐️ مقبض السحب (Holographic Grip) */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all cursor-grab active:cursor-grabbing bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-b-xl shadow-lg border border-t-0 border-white/20 z-20 hover:bg-white/20 flex items-center justify-center">
                <GripVertical className="h-5 w-5 text-white/70 drop-shadow-md" />
              </div>

              <div className="flex flex-col gap-6 pt-2 sm:pt-4 relative z-10">
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                  
                  {/* ==========================================
                      ✍️ منطقة محرر نص السؤال
                      ========================================== */}
                  <div className="flex-1 w-full space-y-4">
                    <label className={cn("text-[10px] sm:text-xs font-black uppercase tracking-widest block pl-1 drop-shadow-sm", isHeader ? "text-amber-400" : isDataTable ? "text-cyan-400" : "text-indigo-400")}>
                      {isHeader ? 'عنوان القسم' : `نص السؤال ${index + 1}`}
                    </label>
                    <div className="bg-black/40 backdrop-blur-md p-2 rounded-xl sm:rounded-2xl border border-white/10 shadow-inner">
                      <ForumEditor 
                        content={question.text || question.content || ''}
                        setContent={(val: any) => updateQuestion(question.id, { text: val, content: val })}
                        canUploadImage={true}
                        placeholder={isHeader ? "اكتب العنوان هنا..." : "اكتب نص السؤال أو المسألة هنا..."}
                      />
                    </div>
                  </div>

                  {/* ==========================================
                      ⚙️ إعدادات نوع السؤال
                      ========================================== */}
                  {!isHeader && (
                    <div className="w-full lg:w-64 shrink-0 space-y-4 bg-black/30 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/10 shadow-inner">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 drop-shadow-sm">نوع الإجابة</label>
                        <select
                          className="glass-input appearance-none cursor-pointer w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-indigo-300 focus:border-indigo-500/50 shadow-inner [&>option]:bg-[#0f1423]"
                          value={question.type}
                          onChange={(e) => {
                            const type = e.target.value;
                            const updates: any = { type };
                            
                            if ((type === 'multiple_choice' || type === 'checkbox' || type === 'true_false') && (!question.options || question.options.length === 0)) {
                              updates.options = [{ id: crypto.randomUUID(), content: 'خيار 1' }];
                            } else if (type === 'comparison' && (!question.options || question.options.length === 0)) {
                              updates.options = [
                                { id: crypto.randomUUID(), content: 'الطرف الأول' },
                                { id: crypto.randomUUID(), content: 'الطرف الثاني' },
                                { id: crypto.randomUUID(), content: 'وجه المقارنة 1' }
                              ];
                            } else if (type === 'data_table' && !question.table) {
                              updates.table = { headers: ['العنصر', 'العمود 1'], rows: [['الصف 1', '']] };
                            }
                            updateQuestion(question.id, updates);
                          }}
                        >
                          <option value="text">إجابة نصية قصيرة</option>
                          <option value="paragraph">إجابة نصية (فقرة)</option>
                          <option value="file_upload">إرفاق صورة / ملف</option>
                          <option value="multiple_choice">خيارات متعددة</option>
                          <option value="data_table">جدول بيانات ديناميكي</option>
                          <option value="comparison">مقارنة ثنائية</option>
                          <option value="project_submission">مشروع علمي / تقرير 🌟</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* ==========================================
                    🎛️ مساحة تحرير (الخيارات المتعددة / المقارنات)
                    ========================================== */}
                {(question.type === 'multiple_choice' || question.type === 'checkbox' || question.type === 'comparison' || question.type === 'true_false') && (
                  <div className="bg-black/30 backdrop-blur-md p-4 sm:p-5 rounded-[1.5rem] border border-white/5 shadow-inner">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 drop-shadow-sm">
                      {isComparison ? 'أطراف وأوجه المقارنة' : 'إدارة الخيارات'}
                    </label>
                    <div className="space-y-3">
                      {(question.options || []).map((opt: any, optIdx: number) => {
                        const optValue = typeof opt === 'string' ? opt : (opt.content || opt.text || '');
                        return (
                          <div key={opt.id || optIdx} className="flex items-center gap-3">
                            {isComparison && optIdx < 2 && (
                              <span className="text-[10px] font-black text-indigo-300 bg-indigo-500/20 backdrop-blur-sm px-2 py-1.5 rounded-lg border border-indigo-500/30 shrink-0 w-20 text-center shadow-inner">
                                {optIdx === 0 ? 'الطرف 1' : 'الطرف 2'}
                              </span>
                            )}
                            {isComparison && optIdx >= 2 && (
                              <span className="text-[10px] font-black text-slate-300 bg-white/5 backdrop-blur-sm px-2 py-1.5 rounded-lg border border-white/10 shrink-0 w-20 text-center shadow-inner">
                                وجه مقارنة
                              </span>
                            )}
                            
                            <input
                              type="text"
                              value={optValue}
                              onChange={(e) => updateOption(question.id, optIdx, e.target.value)}
                              className="glass-input flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-white transition-all hover:bg-white/5"
                              placeholder={isComparison ? "أدخل النص..." : "اكتب الخيار هنا..."}
                            />
                            
                            {(!isComparison || optIdx >= 2) && (
                              <button type="button" onClick={() => removeOption(question.id, optIdx)} className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-95">
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => addOption(question.id, isComparison)} 
                      className="mt-4 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 border border-white/10 shadow-inner active:scale-95"
                    >
                      <Plus className="h-4 w-4 text-indigo-400" /> {isComparison ? 'إضافة وجه مقارنة' : 'إضافة خيار جديد'}
                    </button>
                  </div>
                )}

                {/* ==========================================
                    📊 مساحة تحرير (جدول البيانات الديناميكي)
                    ========================================== */}
                {isDataTable && question.table && (
                  <div className="p-4 sm:p-6 bg-black/40 backdrop-blur-md rounded-[1.5rem] border border-cyan-500/20 shadow-inner overflow-x-auto custom-scrollbar">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] sm:text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2 drop-shadow-sm">
                        <TableProperties className="h-4 w-4" /> بناء الجدول:
                      </p>
                      <div className="flex gap-2">
                         <button type="button" onClick={() => addTableRow(question.id)} className="px-3 py-1.5 bg-cyan-500/10 text-cyan-300 rounded-lg text-xs font-bold hover:bg-cyan-500 hover:text-slate-900 transition-all flex items-center gap-1 border border-cyan-500/30 shadow-inner active:scale-95"><Plus className="h-3 w-3" /> صف</button>
                         <button type="button" onClick={() => addTableColumn(question.id)} className="px-3 py-1.5 bg-cyan-500/10 text-cyan-300 rounded-lg text-xs font-bold hover:bg-cyan-500 hover:text-slate-900 transition-all flex items-center gap-1 border border-cyan-500/30 shadow-inner active:scale-95"><Plus className="h-3 w-3" /> عمود</button>
                      </div>
                    </div>

                    <div className="min-w-max border border-white/10 rounded-xl overflow-hidden shadow-lg">
                      {/* صف العناوين */}
                      <div className="flex bg-[#02040a]/80 backdrop-blur-md border-b border-white/10">
                        {question.table.headers.map((header: string, colIdx: number) => (
                          <div key={`header-${colIdx}`} className="flex-1 min-w-[120px] border-l border-white/10 last:border-l-0 relative group p-2 transition-colors hover:bg-white/5">
                            <input
                              type="text" dir="auto"
                              value={header}
                              onChange={(e) => updateTableHeader(question.id, colIdx, e.target.value)}
                              placeholder="عنوان العمود"
                              className="w-full bg-transparent text-center text-xs font-bold text-cyan-300 focus:outline-none placeholder:text-cyan-800"
                            />
                            {colIdx > 0 && (
                              <button type="button" onClick={() => removeTableColumn(question.id, colIdx)} className="absolute top-1 left-1 p-1 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-md hover:bg-rose-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all active:scale-90 shadow-sm"><X className="h-3 w-3" /></button>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* صفوف الخلايا */}
                      {question.table.rows.map((row: string[], rowIdx: number) => (
                        <div key={`row-${rowIdx}`} className="flex border-b border-white/5 last:border-b-0 bg-[#0f1423]/40 relative group hover:bg-[#0f1423]/80 transition-colors backdrop-blur-sm">
                          {row.map((cell: string, colIdx: number) => (
                            <div key={`cell-${rowIdx}-${colIdx}`} className="flex-1 min-w-[120px] border-l border-white/5 last:border-l-0 p-2">
                              {colIdx === 0 ? (
                                <input
                                  type="text" dir="auto"
                                  value={cell}
                                  onChange={(e) => updateTableCell(question.id, rowIdx, colIdx, e.target.value)}
                                  placeholder="عنوان الصف"
                                  className="w-full bg-transparent text-center text-xs font-bold text-cyan-200 focus:outline-none focus:bg-white/5 rounded-md transition-colors py-1"
                                />
                              ) : (
                                <input
                                  type="text" dir="auto"
                                  value={cell}
                                  onChange={(e) => updateTableCell(question.id, rowIdx, colIdx, e.target.value)}
                                  placeholder="..."
                                  className="w-full bg-transparent border border-transparent rounded-lg px-2 py-1 text-center text-xs text-white focus:border-cyan-500/30 focus:bg-[#02040a]/60 outline-none transition-all placeholder:text-slate-700"
                                />
                              )}
                            </div>
                          ))}
                          {rowIdx > 0 && (
                             <button type="button" onClick={() => removeTableRow(question.id, rowIdx)} className="absolute top-1/2 -translate-y-1/2 left-2 p-1.5 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-lg hover:bg-rose-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all active:scale-90 shadow-sm"><Trash2 className="h-3 w-3" /></button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ==========================================
                    🏁 الشريط السفلي (النقاط والحذف)
                    ========================================== */}
                <div className="flex flex-col sm:flex-row items-center justify-between pt-5 sm:pt-6 border-t border-white/10 gap-4 mt-2">
                  {!isHeader ? (
                    <div className="flex items-center gap-4 bg-black/40 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 shadow-inner">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase drop-shadow-sm">النقاط:</span>
                        <input 
                          type="number" step="any" min="0" 
                          className="glass-input w-16 text-center py-1.5 px-2 font-black text-amber-400 focus:ring-amber-500/30 focus:border-amber-500/50" 
                          value={question.points} 
                          onChange={(e) => updateQuestion(question.id, { points: parseFloat(e.target.value) || 0 })} 
                        />
                      </div>
                    </div>
                  ) : <div></div>}
                  <button type="button" onClick={() => removeQuestion(question.id)} className="flex items-center gap-2 px-5 py-3 text-rose-400 hover:text-white hover:bg-rose-500 rounded-xl font-black text-xs bg-rose-500/10 border border-rose-500/20 transition-all shadow-sm active:scale-95"><Trash2 className="h-4 w-4" /> حذف المكون</button>
                </div>
              </div>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>
    </div>
  );
}
