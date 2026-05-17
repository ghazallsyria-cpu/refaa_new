// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Compass, Plus, Edit2, Trash2, Save, X, 
  BookOpen, AlertCircle, LayoutGrid, CheckCircle2,
  ChevronRight, ArrowLeftRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function GradingRulesManager() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeStage, setActiveStage] = useState('12_scientific');
  
  // حالة الإضافة والتعديل
  const [isEditing, setIsEditing] = useState(false);
  const [currentRule, setCurrentRule] = useState({
    id: '', 
    academic_stage: '', 
    subject_name: '', 
    coursework_max: 0, 
    exam_max: 0, 
    total_max: 0, 
    passing_mark: 0
  });

  const fetchRules = async (stage: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('kuwait_grading_rules')
      .select('*')
      .eq('academic_stage', stage)
      .order('subject_name');
    
    if (!error && data) setRules(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRules(activeStage);
  }, [activeStage]);

  const handleSave = async () => {
    try {
      const payload = {
        academic_stage: activeStage,
        subject_name: currentRule.subject_name,
        coursework_max: Number(currentRule.coursework_max),
        exam_max: Number(currentRule.exam_max),
        total_max: Number(currentRule.coursework_max) + Number(currentRule.exam_max),
        passing_mark: Number(currentRule.passing_mark)
      };

      if (currentRule.id) {
        // تحديث مادة موجودة
        const { error } = await supabase
          .from('kuwait_grading_rules')
          .update(payload)
          .eq('id', currentRule.id);
        if (error) throw error;
      } else {
        // إضافة مادة جديدة
        const { error } = await supabase
          .from('kuwait_grading_rules')
          .insert([payload]);
        if (error) throw error;
      }
      
      setIsEditing(false);
      fetchRules(activeStage);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الحفظ: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه المادة؟ سيؤثر هذا فوراً على حسابات الطلاب في هذه المرحلة!')) {
      const { error } = await supabase.from('kuwait_grading_rules').delete().eq('id', id);
      if (!error) fetchRules(activeStage);
    }
  };

  const openEditor = (rule?: any) => {
    if (rule) {
      setCurrentRule(rule);
    } else {
      setCurrentRule({ 
        id: '', 
        academic_stage: activeStage, 
        subject_name: '', 
        coursework_max: 24, 
        exam_max: 56, 
        total_max: 80, 
        passing_mark: 40 
      });
    }
    setIsEditing(true);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-8 pt-24 font-sans" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* 🔝 Header للهندسة والإدارة */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16"></div>
          <div className="flex items-center gap-5 relative z-10">
            <div className="p-4 bg-indigo-600 rounded-[1.5rem] shadow-lg shadow-indigo-200">
              <LayoutGrid className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">إدارة الأوزان الأكاديمية</h1>
              <p className="text-slate-500 font-bold mt-1">التحكم في توزيع درجات الفصول وحواف النجاح للمواد.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 relative z-10 w-full md:w-auto">
             <button 
              onClick={() => openEditor()}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-2xl font-black transition-all shadow-md active:scale-95"
            >
              <Plus className="w-5 h-5" /> إضافة مادة
            </button>
          </div>
        </header>

        {/* 🎛️ Stage Selector & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
             <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4 block">اختر المرحلة للتعديل</label>
                <div className="flex flex-col gap-2">
                  {['10', '11_scientific', '11_literary', '12_scientific', '12_literary'].map((stage) => (
                    <button
                      key={stage}
                      onClick={() => setActiveStage(stage)}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl font-black text-sm transition-all",
                        activeStage === stage 
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      {stage === '10' ? 'الصف العاشر' : 
                       stage.replace('_', ' ').replace('scientific', 'علمي').replace('literary', 'أدبي')}
                      <ChevronRight className={cn("w-4 h-4", activeStage === stage ? "opacity-100" : "opacity-20")} />
                    </button>
                  ))}
                </div>
             </div>
          </div>

          {/* 📋 Table of Rules */}
          <div className="lg:col-span-3 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-20 text-center flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold">جاري تحميل البيانات...</p>
              </div>
            ) : rules.length === 0 ? (
              <div className="p-20 text-center flex flex-col items-center">
                <AlertCircle className="w-16 h-16 text-slate-200 mb-4" />
                <h3 className="text-xl font-black text-slate-400">لا توجد مواد مضافة لهذه المرحلة</h3>
                <button onClick={() => openEditor()} className="mt-4 text-indigo-600 font-bold underline">أضف أول مادة الآن</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="p-6">المادة</th>
                      <th className="p-6 text-center">الأعمال</th>
                      <th className="p-6 text-center">الفاينل</th>
                      <th className="p-6 text-center">العظمى</th>
                      <th className="p-6 text-center text-emerald-600">النجاح</th>
                      <th className="p-6 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map((rule) => (
                      <tr key={rule.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group">
                        <td className="p-6">
                          <div className="font-black text-slate-800">{rule.subject_name}</div>
                          <div className="text-[10px] text-slate-400 font-bold">ID: {rule.id.split('-')[0]}</div>
                        </td>
                        <td className="p-6 text-center font-bold text-slate-600">{rule.coursework_max}</td>
                        <td className="p-6 text-center font-bold text-slate-600">{rule.exam_max}</td>
                        <td className="p-6 text-center font-black text-indigo-600 bg-indigo-50/30">{rule.total_max}</td>
                        <td className="p-6 text-center font-black text-emerald-600 bg-emerald-50/30">{rule.passing_mark}</td>
                        <td className="p-6">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => openEditor(rule)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(rule.id)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* 🎬 Modal المادة */}
        <AnimatePresence>
          {isEditing && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsEditing(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              ></motion.div>
              
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden"
              >
                <div className="bg-indigo-600 p-8 text-white flex justify-between items-center">
                   <div>
                      <h3 className="text-2xl font-black">{currentRule.id ? 'تعديل المادة' : 'مادة جديدة'}</h3>
                      <p className="text-indigo-200 text-xs font-bold mt-1 uppercase tracking-wider">{activeStage.replace('_', ' ')}</p>
                   </div>
                   <button onClick={() => setIsEditing(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition"><X /></button>
                </div>

                <div className="p-8 space-y-6">
                   <div>
                      <label className="text-xs font-black text-slate-400 block mb-2 uppercase">اسم المادة</label>
                      <input 
                        type="text" 
                        value={currentRule.subject_name} 
                        onChange={e => setCurrentRule({...currentRule, subject_name: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-slate-800 outline-none focus:border-indigo-500 transition-all"
                        placeholder="مثال: الفيزياء، اختياري حر 2..."
                      />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                        <label className="text-[10px] font-black text-slate-400 block mb-2">أعمال السنة</label>
                        <input 
                          type="number" 
                          value={currentRule.coursework_max} 
                          onChange={e => setCurrentRule({...currentRule, coursework_max: e.target.value})}
                          className="bg-transparent w-full text-xl font-black text-indigo-600 outline-none"
                        />
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                        <label className="text-[10px] font-black text-slate-400 block mb-2">الاختبار النهائي</label>
                        <input 
                          type="number" 
                          value={currentRule.exam_max} 
                          onChange={e => setCurrentRule({...currentRule, exam_max: e.target.value})}
                          className="bg-transparent w-full text-xl font-black text-indigo-600 outline-none"
                        />
                      </div>
                   </div>

                   <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-100">
                      <div className="flex-1">
                        <label className="text-[10px] font-black text-emerald-600 block mb-1 uppercase">حافة النجاح المطلوبة</label>
                        <p className="text-[10px] text-emerald-400 font-bold">الدرجة التي يحتاجها الطالب للنجاح في المادة</p>
                      </div>
                      <input 
                        type="number" 
                        value={currentRule.passing_mark} 
                        onChange={e => setCurrentRule({...currentRule, passing_mark: e.target.value})}
                        className="w-24 bg-white border-2 border-emerald-200 rounded-xl p-3 text-center text-xl font-black text-emerald-600 outline-none"
                      />
                   </div>

                   <button 
                    onClick={handleSave}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-[1.5rem] font-black text-lg shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-95 transition-all"
                   >
                     <Save className="w-6 h-6" /> حفظ المادة في اللوائح
                   </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
