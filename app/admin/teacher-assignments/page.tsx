'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTeacherAssignmentsSystem } from '@/hooks/useTeacherAssignmentsSystem';
import { useAuth } from '@/context/auth-context'; // 🚀 استيراد الصلاحيات
import { Plus, Trash2, Save, ArrowRight, Users, Edit2, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function TeacherAssignmentsPage() {
  const { authRole, isChecking } = useAuth(); // 🚀 حماية الصفحة

  const { 
    loading: hookLoading, 
    error: hookError,
    teachers, 
    sections, 
    subjects, 
    assignments, 
    fetchData, 
    saveAssignments, 
    deleteAssignment, 
    updateAssignment 
  } = useTeacherAssignmentsSystem();

  const [newAssignments, setNewAssignments] = useState<{ teacher_id: string; section_id: string; subject_id: string }[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkData, setBulkData] = useState<{ teacher_id: string; subject_id: string; section_ids: string[] }>({
    teacher_id: '',
    subject_id: '',
    section_ids: []
  });

  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [editForm, setEditForm] = useState({ section_id: '', subject_id: '' });

  useEffect(() => {
    if (authRole === 'admin' || authRole === 'management') {
      fetchData();
    }
  }, [fetchData, authRole]);

  // 🚀 التحسين الهندسي السحري: تجميع التعيينات لكل معلم في الذاكرة (Hash Map) لتجنب آلاف عمليات البحث المتكررة
  const groupedAssignments = useMemo(() => {
    const map = new Map();
    assignments.forEach(a => {
      if (!map.has(a.teacher_id)) map.set(a.teacher_id, []);
      map.get(a.teacher_id).push(a);
    });
    return map;
  }, [assignments]);

  const addRow = () => {
    setBulkMode(false);
    setNewAssignments([...newAssignments, { teacher_id: '', section_id: '', subject_id: '' }]);
  };

  const toggleBulkMode = () => {
    setBulkMode(!bulkMode);
    setNewAssignments([]);
    setBulkData({ teacher_id: '', subject_id: '', section_ids: [] });
  };

  const updateRow = (index: number, field: string, value: string) => {
    const updated = [...newAssignments];
    updated[index] = { ...updated[index], [field]: value };
    setNewAssignments(updated);
  };

  const removeRow = (index: number) => {
    setNewAssignments(newAssignments.filter((_, i) => i !== index));
  };

  const handleSaveAll = async () => {
    let validAssignments: any[] = [];
    
    if (bulkMode) {
      if (!bulkData.teacher_id || !bulkData.subject_id || bulkData.section_ids.length === 0) {
        alert('يرجى اختيار المعلم والمادة وفصل واحد على الأقل');
        return;
      }
      validAssignments = bulkData.section_ids.map(sid => ({
        teacher_id: bulkData.teacher_id,
        subject_id: bulkData.subject_id,
        section_id: sid
      }));
    } else {
      validAssignments = newAssignments.filter(a => a.teacher_id && a.section_id && a.subject_id);
    }

    if (validAssignments.length === 0) return;

    try {
      await saveAssignments(validAssignments);
      setNewAssignments([]);
      setBulkMode(false);
      setBulkData({ teacher_id: '', subject_id: '', section_ids: [] });
      alert('تم حفظ التعيينات بنجاح');
    } catch (error: any) {
      alert('فشل حفظ التعيينات: ' + error.message);
    }
  };

  const toggleSectionInBulk = (sectionId: string) => {
    setBulkData(prev => {
      const exists = prev.section_ids.includes(sectionId);
      if (exists) {
        return { ...prev, section_ids: prev.section_ids.filter(id => id !== sectionId) };
      } else {
        return { ...prev, section_ids: [...prev.section_ids, sectionId] };
      }
    });
  };

  const handleDelete = async (teacher_id: string, section_id: string, subject_id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التعيين؟')) return;
    try {
      await deleteAssignment(teacher_id, section_id, subject_id);
    } catch (error) {
      console.error(error);
    }
  };

  const openEditModal = (assignment: any) => {
    setEditingAssignment(assignment);
    setEditForm({
      section_id: assignment.section_id,
      subject_id: assignment.subject_id
    });
  };

  const handleUpdate = async () => {
    if (!editingAssignment) return;

    // Check if the new assignment already exists (to avoid PK conflict)
    if (editForm.section_id !== editingAssignment.section_id || editForm.subject_id !== editingAssignment.subject_id) {
      const exists = assignments.some(a => 
        a.teacher_id === editingAssignment.teacher_id && 
        a.section_id === editForm.section_id && 
        a.subject_id === editForm.subject_id
      );
      if (exists) {
        alert('هذا التعيين موجود بالفعل لهذا المعلم');
        return;
      }
    }

    try {
      await updateAssignment(
        { 
          teacher_id: editingAssignment.teacher_id, 
          section_id: editingAssignment.section_id, 
          subject_id: editingAssignment.subject_id 
        },
        { 
          section_id: editForm.section_id, 
          subject_id: editForm.subject_id 
        }
      );
      setEditingAssignment(null);
      alert('تم تحديث التعيين بنجاح');
    } catch (error: any) {
      alert('فشل التحديث: ' + error.message);
    }
  };

  // 🚀 حماية وتأمين الصفحة ومؤشرات التحميل
  if (isChecking || hookLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse">جاري تحميل وتجهيز البيانات...</p>
        </div>
      </div>
    );
  }

  if (authRole !== 'admin' && authRole !== 'management') {
    return <div className="p-10 text-center font-bold text-rose-600 min-h-screen flex items-center justify-center bg-slate-50">هذه الصفحة مخصصة لفريق الإدارة فقط.</div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-8 space-y-10 bg-slate-50/50 min-h-screen pb-24 font-cairo" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="group flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-all bg-white px-4 py-2 rounded-xl shadow-sm ring-1 ring-slate-200 hover:ring-indigo-200">
              <ArrowRight className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> 
              العودة للوحة التحكم
            </Link>
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">إدارة تعيينات المعلمين</h1>
            <p className="text-lg text-slate-500 font-medium">تخصيص المعلمين للفصول والمواد الدراسية بدقة</p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={toggleBulkMode} 
            className={`inline-flex items-center justify-center gap-3 rounded-2xl px-8 py-4 text-sm font-black transition-all active:scale-95 ${bulkMode ? 'bg-amber-500 text-white shadow-xl shadow-amber-100' : 'bg-white text-slate-700 ring-1 ring-slate-200 shadow-sm hover:bg-slate-50'}`}
          >
            <Users className="h-5 w-5" />
            {bulkMode ? 'إلغاء التعيين المتعدد' : 'التعيين المتعدد (ذكي)'}
          </button>
          <button 
            onClick={addRow} 
            className="inline-flex items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-95"
          >
            <Plus className="h-5 w-5" />
            إضافة تعيين فردي
          </button>
        </div>
      </div>
      
      {bulkMode && (
        <div className="glass-card p-8 md:p-10 rounded-4xl shadow-2xl shadow-amber-100/50 space-y-8 border-t-8 border-amber-500 animate-in fade-in slide-in-from-top-4 duration-500 bg-white">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">نظام التعيين المتعدد الذكي</h2>
              <p className="text-slate-500 font-medium text-sm">اختر المعلم والمادة، ثم حدد كافة الفصول التي يدرسها بضغطة واحدة</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 mr-1">المعلم</label>
                <select 
                  className="w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-amber-500 sm:text-sm transition-all font-bold appearance-none cursor-pointer" 
                  value={bulkData.teacher_id} 
                  onChange={e => setBulkData({ ...bulkData, teacher_id: e.target.value })}
                >
                  <option value="">اختر المعلم</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.users?.full_name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 mr-1">المادة العلمية</label>
                <select 
                  className="w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-amber-500 sm:text-sm transition-all font-bold appearance-none cursor-pointer" 
                  value={bulkData.subject_id} 
                  onChange={e => setBulkData({ ...bulkData, subject_id: e.target.value })}
                >
                  <option value="">اختر المادة</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-black text-slate-700 mr-1 block">تحديد الفصول الدراسية ({bulkData.section_ids.length})</label>
              <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto p-4 bg-slate-50 rounded-3xl border border-slate-100 custom-scrollbar">
                {sections.map(section => {
                  const isSelected = bulkData.section_ids.includes(section.id);
                  return (
                    <button
                      key={section.id}
                      onClick={() => toggleSectionInBulk(section.id)}
                      className={`flex flex-col items-start p-4 rounded-2xl border-2 transition-all text-right ${isSelected ? 'bg-amber-50 border-amber-500 shadow-md' : 'bg-white border-transparent hover:border-slate-200 shadow-sm'}`}
                    >
                      <span className={`text-[10px] font-black uppercase tracking-tighter ${isSelected ? 'text-amber-600' : 'text-slate-400'}`}>
                        {section.classes?.name}
                      </span>
                      <span className={`text-sm font-bold ${isSelected ? 'text-amber-900' : 'text-slate-700'}`}>
                        {section.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row-reverse justify-start gap-4 pt-6 border-t border-slate-100">
            <button 
              onClick={handleSaveAll} 
              className="inline-flex items-center justify-center gap-3 rounded-2xl bg-amber-500 px-10 py-4 text-sm font-black text-white shadow-xl shadow-amber-200 hover:bg-amber-600 transition-all active:scale-95"
            >
              <Save className="h-5 w-5" />
              تأكيد وحفظ التعيينات المتعددة
            </button>
            <button 
              onClick={toggleBulkMode} 
              className="inline-flex items-center justify-center rounded-2xl bg-white px-8 py-4 text-sm font-black text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-all"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {newAssignments.length > 0 && !bulkMode && (
        <div className="glass-card p-8 md:p-10 rounded-4xl shadow-2xl shadow-indigo-100/50 space-y-8 border-t-8 border-indigo-600 animate-in fade-in slide-in-from-top-4 duration-500 bg-white">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">إضافة تعيينات فردية</h2>
              <p className="text-slate-500 font-medium text-sm">قم بتعبئة البيانات أدناه لحفظ التعيينات الجديدة في النظام</p>
            </div>
            <button 
              onClick={() => setNewAssignments([])} 
              className="p-3 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-all"
            >
              <Trash2 className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-4">
            {newAssignments.map((assignment, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:border-indigo-200 transition-all group">
                <div className="md:col-span-4 space-y-2">
                  <label className="text-sm font-black text-slate-700 mr-1">المعلم</label>
                  <select 
                    className="w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-white shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm transition-all font-bold appearance-none cursor-pointer" 
                    value={assignment.teacher_id} 
                    onChange={e => updateRow(index, 'teacher_id', e.target.value)}
                  >
                    <option value="">اختر المعلم</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.users?.full_name}</option>)}
                  </select>
                </div>
                <div className="md:col-span-3 space-y-2">
                  <label className="text-sm font-black text-slate-700 mr-1">الفصل</label>
                  <select 
                    className="w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-white shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm transition-all font-bold appearance-none cursor-pointer" 
                    value={assignment.section_id} 
                    onChange={e => updateRow(index, 'section_id', e.target.value)}
                  >
                    <option value="">اختر الفصل</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.classes?.name} - {s.name}</option>)}
                  </select>
                </div>
                <div className="md:col-span-4 space-y-2">
                  <label className="text-sm font-black text-slate-700 mr-1">المادة</label>
                  <select 
                    className="w-full rounded-2xl border-0 py-3.5 px-4 text-slate-900 bg-white shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm transition-all font-bold appearance-none cursor-pointer" 
                    value={assignment.subject_id} 
                    onChange={e => updateRow(index, 'subject_id', e.target.value)}
                  >
                    <option value="">اختر المادة</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="md:col-span-1 flex justify-center pb-1">
                  <button 
                    onClick={() => removeRow(index)} 
                    className="p-3 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all hover:scale-110 active:scale-90 border border-transparent hover:border-rose-200"
                    title="إزالة الصف"
                  >
                    <Trash2 className="h-6 w-6" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex flex-col sm:flex-row-reverse justify-start gap-4 pt-6 border-t border-slate-100">
            <button 
              onClick={handleSaveAll} 
              className="inline-flex items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-10 py-4 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
            >
              <Save className="h-5 w-5" />
              حفظ كافة التعيينات
            </button>
            <button 
              onClick={() => setNewAssignments([])} 
              className="inline-flex items-center justify-center rounded-2xl bg-white px-8 py-4 text-sm font-black text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-all"
            >
              إلغاء العملية
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {teachers.map(teacher => {
          // 🚀 استخدام الماب السريع للبحث المباشر (O(1)) بدلاً من الفلتر البطيء
          const teacherAssignments = groupedAssignments.get(teacher.id) || [];
          
          return (
            <div key={teacher.id} className="group bg-white rounded-4xl border border-slate-200/80 overflow-hidden hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-500 flex flex-col hover:-translate-y-1">
              <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center group-hover:bg-indigo-50/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-600 font-black text-lg border border-slate-100">
                    {teacher.users?.full_name?.charAt(0) || 'أ'}
                  </div>
                  <h3 className="font-black text-slate-900 tracking-tight text-lg">{teacher.users?.full_name}</h3>
                </div>
                <span className="text-xs bg-indigo-600 text-white px-4 py-2 rounded-xl font-black shadow-lg shadow-indigo-100">
                  {teacherAssignments.length} تعيينات
                </span>
              </div>
              <div className="flex-1 overflow-hidden">
                {teacherAssignments.length > 0 ? (
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-slate-50/30 text-slate-400 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">الفصل الدراسي</th>
                          <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">المادة العلمية</th>
                          <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] w-20 text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {teacherAssignments.map((a: any) => (
                          <tr key={`${a.teacher_id}-${a.section_id}-${a.subject_id}`} className="group/row hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-700">{a.section?.classes?.name} - {a.section?.name}</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-black text-xs border border-indigo-100">
                                {a.subject?.name}
                              </span>
                            </td>
                            <td className="px-6 py-4 flex items-center justify-center gap-1 border-r border-transparent group-hover/row:border-slate-100">
                              <button 
                                onClick={() => openEditModal(a)} 
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                title="تعديل التعيين"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(a.teacher_id, a.section_id, a.subject_id)} 
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                title="حذف التعيين"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <div className="mx-auto h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                      <Users className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-bold">
                      لا يوجد تعيينات مسجلة لهذا المعلم
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Assignment Modal */}
      {editingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-4xl p-8 w-full max-w-lg shadow-2xl space-y-8 border-t-8 border-indigo-600 border-x border-b border-white/20">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">تعديل التعيين</h2>
                <p className="text-slate-500 font-bold text-sm">تعديل الفصل أو المادة للمعلم: <span className="text-indigo-600">{editingAssignment.teacher?.users?.full_name}</span></p>
              </div>
              <button onClick={() => setEditingAssignment(null)} className="p-2.5 text-slate-400 hover:text-rose-600 rounded-full hover:bg-rose-50 transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 mr-1">الفصل الدراسي</label>
                <select 
                  className="w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm transition-all font-bold appearance-none cursor-pointer" 
                  value={editForm.section_id} 
                  onChange={e => setEditForm({ ...editForm, section_id: e.target.value })}
                >
                  {sections.map(s => <option key={s.id} value={s.id}>{s.classes?.name} - {s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 mr-1">المادة العلمية</label>
                <select 
                  className="w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm transition-all font-bold appearance-none cursor-pointer" 
                  value={editForm.subject_id} 
                  onChange={e => setEditForm({ ...editForm, subject_id: e.target.value })}
                >
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-slate-100">
              <button 
                onClick={handleUpdate} 
                className="flex-1 inline-flex items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
              >
                <Save className="h-5 w-5" />
                حفظ التعديلات
              </button>
              <button 
                onClick={() => setEditingAssignment(null)} 
                className="flex-1 inline-flex items-center justify-center rounded-2xl bg-white px-8 py-4 text-sm font-black text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </motion.div>
  );
}
