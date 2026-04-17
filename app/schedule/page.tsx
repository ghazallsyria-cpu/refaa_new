/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { Printer, User, Users, Info, X, Plus, Calendar, AlertCircle, Clock, Video, BookOpen, Sparkles, Bug, LayoutGrid, Save, Loader2, FileDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useSchedulesSystem } from '@/hooks/useSchedulesSystem';
import { motion, AnimatePresence } from 'framer-motion';

const DAYS = [
  { id: 1, name: 'الأحد' },
  { id: 2, name: 'الإثنين' },
  { id: 3, name: 'الثلاثاء' },
  { id: 4, name: 'الأربعاء' },
  { id: 5, name: 'الخميس' },
];

// ==========================================
// 🛠️ دوال مساعدة لتنسيق النصوص والروابط
// ==========================================
const normalizeUrl = (url?: string) => {
  if (!url) return '';
  const clean = url.trim();
  return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
};

const formatClassName = (rawName?: string) => {
  if (!rawName) return '';
  return rawName.replace('الصف ', '').trim();
};

const getEntityTitle = (entity: any, type: string) => {
  if (!entity) return '';
  if (type === 'teacher') return entity.users?.full_name || 'معلم غير محدد';
  const className = Array.isArray(entity.classes) ? entity.classes[0]?.name : entity.classes?.name;
  return `${formatClassName(className)} - ${entity.name}`;
};

// ==========================================
// 🖨️ مكوّن جدول الطباعة النقي (بدون html2canvas لتجنب خطأ oklch)
// ==========================================
function PrintScheduleBlock({
  label,
  subLabel,
  scheduleData,
  periods,
  viewType,
  isLast,
}: {
  label: string;
  subLabel?: string;
  scheduleData: any[];
  periods: any[];
  viewType: 'teacher' | 'section';
  isLast: boolean;
}) {
  return (
    <div
      style={{
        pageBreakAfter: isLast ? 'auto' : 'always',
        breakAfter: isLast ? 'auto' : 'page',
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
        width: '100%',
        fontFamily: 'Cairo, sans-serif',
        marginBottom: isLast ? '0' : '40px',
      }}
      className="print-block"
    >
      {/* ─── رأس الجدول ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          borderBottom: '4px solid #4338ca',
          paddingBottom: '12px',
          marginBottom: '16px',
        }}
      >
        <div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#1e1b4b', marginBottom: '8px' }}>
            الجدول الدراسي الأسبوعي
          </div>
          <div style={{ fontSize: '14px', fontWeight: 900, color: '#374151', background: '#f1f5f9', display: 'inline-block', padding: '6px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            {viewType === 'teacher' ? 'المعلم:' : 'الفصل:'}{' '}
            <span style={{ color: '#4338ca' }}>{label}</span>
            {subLabel && <span style={{ color: '#64748b', marginRight: '4px' }}> — {subLabel}</span>}
          </div>
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ffffff', background: '#4f46e5', padding: '6px 12px', borderRadius: '8px', marginBottom: '6px', fontSize: '12px', fontWeight: 900 }}>
            📅 العام الدراسي الحالي
          </div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>
            تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')}
          </div>
        </div>
      </div>

      {/* ─── الجدول ─── */}
      <div style={{ borderRadius: '12px', overflow: 'hidden', border: '2px solid #cbd5e1' }}>
        <table className="custom-print-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ width: '100px', background: '#3730a3', color: 'white', fontWeight: 900, fontSize: '14px', padding: '12px 6px', textAlign: 'center', borderLeft: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}>
                اليوم / الحصة
              </th>
              {periods.map((p) => (
                <th key={p.id} style={{ background: '#f8fafc', color: '#1e1b4b', fontWeight: 900, fontSize: '12px', padding: '10px 4px', textAlign: 'center', borderLeft: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}>
                  <div style={{ fontWeight: 900, marginBottom: '4px' }}>الحصة {p.period_number}</div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#4338ca', background: 'white', display: 'inline-block', padding: '2px 8px', borderRadius: '6px', border: '1px solid #c7d2fe' }}>
                    {p.start_time.slice(0, 5)} - {p.end_time.slice(0, 5)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day, idx) => (
              <tr key={day.id}>
                <td style={{ fontWeight: 900, textAlign: 'center', fontSize: '14px', color: '#0f172a', background: idx % 2 === 0 ? '#f8fafc' : 'white', borderLeft: '1px solid #cbd5e1', borderTop: '1px solid #cbd5e1', padding: '10px 4px', verticalAlign: 'middle' }}>
                  {day.name}
                </td>
                {periods.map((p) => {
                  const slot = scheduleData.find(s => String(s.day_of_week) === String(day.id) && String(s.period) === String(p.period_number));
                  return (
                    <td key={p.id} style={{ height: '95px', borderLeft: '1px solid #cbd5e1', borderTop: '1px solid #cbd5e1', background: idx % 2 === 0 ? '#f8fafc' : 'white', padding: '6px', verticalAlign: 'middle', textAlign: 'center' }}>
                      {slot ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '4px', background: 'white', borderRadius: '8px', padding: '6px', border: '1px solid #e2e8f0' }}>
                          
                          <div style={{ fontWeight: 900, fontSize: '13px', color: '#1e1b4b', lineHeight: '1.3', textAlign: 'center', wordBreak: 'break-word' }}>
                            {slot.subjects?.name}
                          </div>

                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#1e293b', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', maxWidth: '100%', wordBreak: 'break-word', textAlign: 'center', lineHeight: '1.2' }}>
                            {viewType === 'teacher'
                              ? `${formatClassName(Array.isArray(slot.sections?.classes) ? slot.sections?.classes[0]?.name : slot.sections?.classes?.name)} - ${slot.sections?.name}`
                              : slot.teachers?.users?.full_name}
                          </div>

                          {slot.teachers?.zoom_link && (
                            <a href={normalizeUrl(slot.teachers.zoom_link)} target="_blank" rel="noopener noreferrer" className="print-zoom-link"
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900, color: 'white', background: '#2563eb', padding: '4px 8px', borderRadius: '6px', textDecoration: 'none', marginTop: '2px', width: '90%', WebkitPrintColorAdjust: 'exact' }}>
                              رابط البث
                            </a>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.3 }}>
                          <span style={{ fontSize: '14px', fontWeight: 900, color: '#94a3b8' }}>—</span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── تذييل الصفحة ─── */}
      <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '3px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', background: '#312e81', color: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '18px' }}>R</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>مدرسة الرفعة النموذجية</div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b' }}>نظام الإدارة الأكاديمية المتكامل</div>
          </div>
        </div>
        <div style={{ fontSize: '11px', fontWeight: 900, color: '#3730a3', background: '#eef2ff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #c7d2fe' }}>
          وثيقة إلكترونية معتمدة
        </div>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const { user, authRole, isChecking } = useAuth();
  const [viewType, setViewType] = useState<'teacher' | 'section'>('teacher');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{day: number, period: number} | null>(null);
  const [formData, setFormData] = useState({ teacher_id: '', section_id: '', subject_id: '' });
  const [copiedLesson, setCopiedLesson] = useState<any | null>(null);
  const [showAllSchedules, setShowAllSchedules] = useState(true);
  const [swappingFrom, setSwappingFrom] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // ─── حالة الطباعة (مدمجة مع الحل العبقري) ───
  const [printMode, setPrintMode] = useState<'single' | 'all-teachers' | 'all-sections'>('single');
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  
  const currentDayOfWeek = new Date().getDay() + 1;
  const defaultTab = (currentDayOfWeek >= 1 && currentDayOfWeek <= 5) ? currentDayOfWeek : 1;
  const [activeDayTab, setActiveDayTab] = useState<number>(defaultTab);

  const { 
    fetchInitialScheduleData, 
    fetchStudentSection, 
    fetchSchedules: fetchSchedulesData, 
    addSchedule, 
    updateSchedule, 
    deleteSchedule,
    checkConflicts,
    swapSchedules
  } = useSchedulesSystem();

  const fetchFilters = useCallback(async () => {
    if (isChecking) return;
    try {
      let currentUserRole = authRole;
      if (user) {
        setIsAdmin(currentUserRole === 'admin' || currentUserRole === 'management');
      }

      const data = await fetchInitialScheduleData();
      setTeachers(data.teachers || []);
      setSections(data.sections || []);
      setSubjects(data.subjects || []);
      setPeriods(data.periods || []);

      if (currentUserRole === 'teacher' && user) {
        setSelectedId(user.id);
        setViewType('teacher');
        setShowAllSchedules(false);
      } else if (currentUserRole === 'student' && user) {
        const sectionId = await fetchStudentSection(user.id);
        if (sectionId) {
          setSelectedId(sectionId);
          setViewType('section');
          setShowAllSchedules(false);
        }
      } else if (data.teachers?.[0]) {
        setSelectedId(data.teachers[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  }, [fetchInitialScheduleData, fetchStudentSection, user, authRole, isChecking]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  const handleSwap = async (targetDay: number, targetPeriod: number, targetSlot: any | null) => {
    if (!swappingFrom || !isAdmin) return;

    try {
      setLoading(true);
      const sourceDay = Number(swappingFrom.day_of_week);
      const sourcePeriod = Number(swappingFrom.period);
      const tDay = Number(targetDay);
      const tPeriod = Number(targetPeriod);

      try {
        const conflicts = await checkConflicts(tDay, tPeriod, String(swappingFrom.teacher_id), String(swappingFrom.section_id), String(swappingFrom.id));
        const targetConflicts = conflicts.filter(c => String(c.id) !== String(targetSlot?.id) && (String(c.teacher_id) === String(swappingFrom.teacher_id) || String(c.section_id) === String(swappingFrom.section_id)));
        if (targetConflicts.length > 0) { alert('تعذر التبديل: يوجد تعارض'); setLoading(false); return; }

        if (targetSlot) {
          const sourceConflicts = await checkConflicts(sourceDay, sourcePeriod, String(targetSlot.teacher_id), String(targetSlot.section_id), String(targetSlot.id));
          const filteredSourceConflicts = sourceConflicts.filter(c => String(c.id) !== String(swappingFrom.id) && (String(c.teacher_id) === String(targetSlot.teacher_id) || String(c.section_id) === String(targetSlot.section_id)));
          if (filteredSourceConflicts.length > 0) { alert('تعذر التبديل: يوجد تعارض'); setLoading(false); return; }
        }
      } catch (e) { console.warn("تجاوز فحص التعارض", e); }

      await swapSchedules(String(swappingFrom.id), sourceDay, sourcePeriod, targetSlot ? String(targetSlot.id) : null, tDay, tPeriod);
      setSwappingFrom(null);
      await fetchSchedule();
      alert('تم التبديل بنجاح!');
    } catch (err: any) {
      alert(`حدث خطأ: ${err.message}`);
      fetchSchedule();
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!formData.teacher_id || !formData.section_id || !formData.subject_id || !selectedSlot) {
      alert('يرجى تعبئة جميع الحقول المطلوبة.');
      return;
    }
    const safeObj = (obj: any) => Array.isArray(obj) ? obj[0] : obj;

    try {
      try {
        const conflicts = await checkConflicts(Number(selectedSlot.day), Number(selectedSlot.period), String(formData.teacher_id), String(formData.section_id), editingId ? String(editingId) : undefined);
        if (conflicts && conflicts.length > 0) {
          alert(`يوجد تضارب مع حصة أخرى في نفس الوقت.`);
          return;
        }
      } catch (e) { console.warn("تجاوز المحرك", e); }

      const payload: any = {
        teacher_id: String(formData.teacher_id),
        section_id: String(formData.section_id),
        subject_id: String(formData.subject_id),
      };

      if (editingId) {
        await updateSchedule(String(editingId), payload);
      } else {
        payload.day_of_week = Number(selectedSlot.day);
        payload.period = Number(selectedSlot.period);
        await addSchedule(payload);
      }
      
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ teacher_id: '', section_id: '', subject_id: '' });
      await fetchSchedule(); 
      alert('تم الحفظ بنجاح!');
    } catch (err: any) {
      alert(`خطأ أثناء الحفظ: ${err.message}`);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الحصة؟')) return;
    try {
      await deleteSchedule(String(id));
      await fetchSchedule();
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
    }
  };

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      let filters: any = {};
      if (!(isAdmin && showAllSchedules)) {
        if (viewType === 'teacher') filters.teacherId = selectedId;
        else filters.sectionId = selectedId;
      }
      const data = await fetchSchedulesData(filters);
      setScheduleData(data || []);
    } catch (err: any) {
      setScheduleData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedId, viewType, isAdmin, showAllSchedules, fetchSchedulesData]);

  useEffect(() => {
    if (!selectedId && !showAllSchedules) return;
    fetchSchedule();
  }, [selectedId, viewType, showAllSchedules, fetchSchedule]);


  // ==========================================
  // 🖨️ محرك الطباعة المعالج جذرياً (بدون html2canvas)
  // ==========================================
  const executePrint = async (type: 'single' | 'all-teachers' | 'all-sections') => {
    try {
      setIsPreparingPrint(true);
      setPrintMode(type);
      
      if (type !== 'single') {
        setShowAllSchedules(true);
        // جلب كل البيانات صراحة لتفادي الجداول الناقصة
        const allData = await fetchSchedulesData({});
        setScheduleData(allData || []);
      }
      
      // ننتظر قليلاً لكي يتم بناء عناصر الـ DOM للطباعة
      await new Promise((r) => setTimeout(r, 800)); 
      
      // نخفي شاشة التحميل كلياً لكي لا تظهر في الورق
      setIsPreparingPrint(false);
      
      // نعطي المتصفح لحظة لتحديث الشاشة بعد اختفاء الـ Loader، ثم نستدعي نافذة الطباعة
      await new Promise((r) => setTimeout(r, 200));
      window.print();
    } catch (err: any) {
      setIsPreparingPrint(false);
      alert(err.message || 'فشل تجهيز الطباعة');
    }
  };

  // ==========================================
  // 👨‍🎓 شاشة الطالب
  // ==========================================
  if (authRole === 'student') {
    const studentSection = sections.find(s => String(s.id) === String(selectedId));
    const sectionTitle = getEntityTitle(studentSection, 'section');

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 max-w-7xl mx-auto pb-24 px-4 sm:px-6 lg:px-8" dir="rtl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 p-8 sm:p-12 text-white shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-right">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-xs font-bold uppercase backdrop-blur-md shadow-sm">
                <Sparkles className="w-4 h-4 text-blue-300" /><span>الفصل الدراسي الحالي</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black">الجدول الأكاديمي</h1>
              <p className="text-indigo-100 font-bold">مرحباً بك! هذا جدول حصصك لصف <span className="underline decoration-emerald-400">{sectionTitle}</span>.</p>
            </div>
            <div className="h-24 w-24 bg-white/10 rounded-full flex items-center justify-center shadow-2xl shrink-0">
              <Calendar className="h-12 w-12 text-white" />
            </div>
          </div>
        </motion.div>

        {loading || periods.length === 0 ? (
          <div className="flex h-64 items-center justify-center bg-white/50 backdrop-blur-md rounded-[3rem] shadow-sm">
            <Loader2 className="h-14 w-14 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-xl p-8 overflow-x-auto">
            <div className="min-w-[800px] grid gap-4" style={{ gridTemplateColumns: `100px repeat(${periods.length}, minmax(0, 1fr))` }}>
              <div className="h-16 flex items-center justify-center bg-slate-900 rounded-2xl"><span className="text-xs font-black text-white">اليوم</span></div>
              {periods.map(p => (
                <div key={p.id} className="h-16 flex flex-col items-center justify-center bg-indigo-50/50 rounded-2xl">
                  <span className="text-sm font-black text-indigo-900">الحصة {p.period_number}</span>
                  <span className="text-[10px] text-indigo-500 font-bold"><Clock className="w-3 h-3 inline mr-1" />{p.start_time.slice(0, 5)}</span>
                </div>
              ))}
              {DAYS.map((day) => (
                <React.Fragment key={day.id}>
                  <div className="font-black text-sm flex items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-200">{day.name}</div>
                  {periods.map((p) => {
                    const slot = scheduleData.find(s => String(s.day_of_week) === String(day.id) && String(s.period) === String(p.period_number));
                    return (
                      <div key={`${day.id}-${p.id}`} className={`p-4 rounded-2xl min-h-[140px] flex flex-col justify-between transition-all ${slot ? 'bg-white shadow-md border-indigo-100' : 'bg-slate-50/50 border-dashed opacity-60'}`}>
                        {slot ? (
                          <>
                            <div>
                              <h4 className="font-black text-slate-900 mb-1">{slot.subjects?.name}</h4>
                              <span className="text-xs font-bold text-slate-500 whitespace-normal break-words leading-tight block">{slot.teachers?.users?.full_name}</span>
                            </div>
                            {slot.teachers?.zoom_link && (
                              <a href={normalizeUrl(slot.teachers.zoom_link)} target="_blank" rel="noopener noreferrer" className="mt-3 w-full flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-700 py-2 rounded-xl text-[11px] font-black hover:bg-emerald-500 hover:text-white transition-colors">
                                <Video className="w-3.5 h-3.5 mr-1" /> دخول البث
                              </a>
                            )}
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2"><BookOpen className="w-6 h-6 opacity-20" /></div>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // ==========================================
  // 🚀 ADMIN / TEACHER VIEW 
  // ==========================================
  return (
    <div dir="rtl">
      
      {/* 🖨️ CSS الطباعة الشامل - يحل مشكلة الروابط والتنسيق */}
      <style jsx global>{`
        @media print {
          @page { size: landscape; margin: 10mm; }
          
          /* إخفاء الواجهة العادية نهائياً */
          .web-content { display: none !important; }
          
          /* إظهار الجداول المخصصة للطباعة فقط */
          #print-area { display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
          
          /* إجبار الألوان في المتصفح */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

          /* منع قص الكتل وتداخل الصفحات */
          .print-block {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* 🚀 السطر السحري لمنع طباعة الرابط كنص بجانب الزر */
          .print-zoom-link::after,
          a[href]::after {
            content: none !important;
            display: none !important;
          }

          /* حل مشكلة التفاف النصوص العربية */
          .custom-print-table th, .custom-print-table td {
            word-break: normal !important;
            overflow-wrap: break-word !important;
          }
        }
      `}</style>

      {/* ⏳ شاشة التحميل (تظهر فقط في الموقع وتختفي في الطباعة) */}
      <AnimatePresence>
        {isPreparingPrint && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md text-white print:hidden">
            <Loader2 className="w-16 h-16 animate-spin text-indigo-400 mb-4" />
            <h2 className="text-3xl font-black">جاري تجهيز الطباعة...</h2>
            <p className="text-slate-300 font-bold mt-2">يرجى الانتظار، النظام يقوم برسم الجداول.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="web-content space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        
        {isAdmin && authRole !== 'teacher' && (
          <div className="bg-amber-50 p-4 rounded-2xl text-sm text-amber-800 font-bold border border-amber-200 flex items-center gap-3">
            <Bug className="w-5 h-5 shrink-0" />
            <div><p>وضع الإدارة مفعل. يمكنك تعديل ونسخ وتبديل الحصص بالسحب والنقر بحرية تامة.</p></div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] sm:text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>إدارة الهيكل الزمني</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {authRole === 'teacher' ? 'جدولي الدراسي' : 'الجدول الدراسي الشامل'}
            </h1>
          </div>
          
          {/* أزرار الطباعة */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <button onClick={() => executePrint('single')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-black text-white shadow-lg hover:bg-slate-800 transition-all active:scale-95 flex-1">
              <Printer className="h-4 w-4" /> طباعة الجدول الحالي
            </button>
            {isAdmin && (
              <>
                <button onClick={() => executePrint('all-sections')} disabled={isPreparingPrint} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-50 text-indigo-700 px-5 py-3 text-sm font-black hover:bg-indigo-100 transition-all active:scale-95 border border-indigo-200 disabled:opacity-50">
                  <FileDown className="h-4 w-4" /> طباعة كل الفصول
                </button>
                <button onClick={() => executePrint('all-teachers')} disabled={isPreparingPrint} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-50 text-emerald-700 px-5 py-3 text-sm font-black hover:bg-emerald-100 transition-all active:scale-95 border border-emerald-200 disabled:opacity-50">
                  <FileDown className="h-4 w-4" /> طباعة كل المعلمين
                </button>
              </>
            )}
          </div>
        </div>

        {isAdmin && authRole !== 'teacher' && swappingFrom && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-5 rounded-2xl shadow-xl flex justify-between animate-pulse sticky top-4 z-40">
            <div><p className="font-black text-lg">وضع التبديل نشط</p></div>
            <button onClick={() => setSwappingFrom(null)} className="bg-white text-amber-600 px-6 py-2 rounded-xl font-black shadow-sm">إلغاء التبديل</button>
          </div>
        )}

        {isAdmin && authRole !== 'teacher' && copiedLesson && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between sticky top-4 z-40 gap-4 mt-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm"><Info className="h-6 w-6" /></div>
              <div>
                <p className="font-black text-lg">تم نسخ الحصة</p>
                <p className="text-sm text-emerald-50 font-medium mt-1">الحصة المنسوخة: <span className="font-black bg-white/20 px-2 py-0.5 rounded">{copiedLesson.subjects?.name}</span> ({copiedLesson.teachers?.users?.full_name})<br />انقر على أي خانة فارغة للصق.</p>
              </div>
            </div>
            <button onClick={() => setCopiedLesson(null)} className="bg-white text-emerald-600 hover:bg-emerald-50 px-6 py-3 rounded-xl text-sm font-black shadow-sm transition-colors w-full sm:w-auto">مسح الحافظة</button>
          </div>
        )}

        {isAdmin && authRole !== 'teacher' && (
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col lg:flex-row gap-6 items-center">
            <div className="flex rounded-xl shadow-sm bg-slate-100 p-1 w-full lg:w-auto shrink-0">
              <button type="button" onClick={() => { setViewType('teacher'); if (teachers.length > 0) setSelectedId(String(teachers[0].id)); }} className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-black rounded-lg transition-all ${viewType === 'teacher' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><User className="w-4 h-4" /> جدول المعلمين</button>
              <button type="button" onClick={() => { setViewType('section'); if (sections.length > 0) setSelectedId(String(sections[0].id)); }} className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-black rounded-lg transition-all ${viewType === 'section' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Users className="w-4 h-4" /> جدول الفصول</button>
            </div>
            <div className="flex-1 w-full relative">
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none"><BookOpen className="h-5 w-5 text-slate-400" /></div>
              <select value={selectedId} onChange={(e) => setSelectedId(String(e.target.value))} className="w-full rounded-xl py-4 pr-12 pl-4 bg-slate-50 border border-slate-200 font-bold outline-none">
                <option value="">-- اختر --</option>
                {viewType === 'teacher' 
                  ? teachers.map(t => <option key={t.id} value={t.id}>{t.users?.full_name}</option>) 
                  : sections.map(s => <option key={s.id} value={s.id}>{formatClassName(Array.isArray(s.classes) ? s.classes[0]?.name : s.classes?.name)} - {s.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3 shrink-0 bg-slate-50 px-5 py-4 rounded-xl border border-slate-200">
              <input type="checkbox" id="showAll" checked={showAllSchedules} onChange={(e) => setShowAllSchedules(e.target.checked)} className="w-5 h-5 rounded cursor-pointer" />
              <label htmlFor="showAll" className="text-sm font-black cursor-pointer">عرض الكل</label>
            </div>
          </div>
        )}

        {/* نافذة الإضافة/التعديل */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black">{editingId ? 'تعديل الحصة' : 'إضافة حصة'}</h2>
                  <button onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="p-2 bg-slate-50 rounded-xl"><X className="h-5 w-5" /></button>
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold mb-2">{viewType === 'teacher' ? 'اختيار الفصل' : 'اختيار المعلم'}</label>
                    {viewType === 'teacher' ? (
                      <select className="w-full p-4 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold outline-none appearance-none" value={formData.section_id} onChange={(e) => setFormData({ ...formData, section_id: e.target.value, subject_id: '' })}>
                        <option value="">-- اختر الفصل --</option>
                        {sections.map(s => <option key={s.id} value={s.id}>{formatClassName(Array.isArray(s.classes) ? s.classes[0]?.name : s.classes?.name)} - {s.name}</option>)}
                      </select>
                    ) : (
                      <select className="w-full p-4 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold outline-none appearance-none" value={formData.teacher_id} onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value, subject_id: '' })}>
                        <option value="">-- اختر المعلم --</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.users?.full_name}</option>)}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">المادة الدراسية</label>
                    <select className="w-full p-4 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold outline-none appearance-none disabled:opacity-50" value={formData.subject_id} disabled={!formData.section_id || !formData.teacher_id} onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}>
                      <option value="">-- اختر المادة --</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-8 mt-4 border-t border-slate-100">
                  <button className="w-full sm:w-auto px-6 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 font-black transition-colors" onClick={() => { setIsModalOpen(false); setEditingId(null); }}>إلغاء الأمر</button>
                  <button className="w-full sm:w-auto px-6 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-black shadow-lg shadow-indigo-200 transition-colors flex-1 flex justify-center items-center gap-2" onClick={handleAddSchedule}><Save className="w-5 h-5" /> {editingId ? 'تحديث الحصة' : 'اعتماد الحصة'}</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {!selectedId && !showAllSchedules ? (
          <div className="bg-white rounded-[2rem] p-16 text-center shadow-sm"><LayoutGrid className="h-10 w-10 mx-auto text-slate-300 mb-4" /><h3 className="text-2xl font-black">الجدول فارغ</h3></div>
        ) : periods.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-16 text-center shadow-sm"><AlertCircle className="h-10 w-10 mx-auto text-rose-500 mb-4" /><h3 className="text-2xl font-black">لا يوجد توقيتات</h3></div>
        ) : (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto p-6 sm:p-8">
              <div className="min-w-[800px] grid gap-3" style={{ gridTemplateColumns: `100px repeat(${periods.length}, minmax(0, 1fr))` }}>
                <div className="h-16 flex items-center justify-center bg-slate-900 rounded-2xl"><span className="text-white font-black">اليوم</span></div>
                {periods.map(p => (
                  <div key={p.id} className="h-16 flex flex-col items-center justify-center bg-slate-50 rounded-2xl">
                    <span className="font-black">الحصة {p.period_number}</span>
                    <span className="text-[10px] text-slate-500 font-bold">{p.start_time.slice(0, 5)}</span>
                  </div>
                ))}
                {loading ? (
                  <div className="col-span-full py-32 text-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto" /></div>
                ) : (
                  DAYS.map(day => (
                    <React.Fragment key={day.id}>
                      <div className="font-black text-sm flex items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">{day.name}</div>
                      {periods.map(p => {
                        const slot = scheduleData.find(s => String(s.day_of_week) === String(day.id) && String(s.period) === String(p.period_number) && (viewType === 'teacher' ? String(s.teacher_id) === String(selectedId) : String(s.section_id) === String(selectedId)));
                        const others = (isAdmin && showAllSchedules) ? scheduleData.filter(s => String(s.day_of_week) === String(day.id) && String(s.period) === String(p.period_number) && (viewType === 'teacher' ? String(s.teacher_id) !== String(selectedId) : String(s.section_id) !== String(selectedId))) : [];
                        const displaySlot = slot || (swappingFrom && others.find(o => String(o.id) === String(swappingFrom.id)) ? swappingFrom : others[0]);

                        return (
                          <div key={`${day.id}-${p.id}`} className={`relative p-4 rounded-2xl min-h-[120px] flex flex-col justify-between transition-all group ${slot ? 'bg-white shadow-md border border-indigo-200' : displaySlot ? 'bg-slate-50 border border-slate-200' : 'bg-slate-50/50 border border-dashed border-slate-200 hover:bg-slate-50'} ${isAdmin ? 'cursor-pointer hover:border-indigo-400' : ''}`}
                            onClick={() => {
                              if (isAdmin) {
                                if (swappingFrom) {
                                  if (String(swappingFrom.id) === String(displaySlot?.id)) setSwappingFrom(null);
                                  else handleSwap(day.id, p.period_number, displaySlot);
                                } else if (!displaySlot || others.length > 0) {
                                  setFormData({ teacher_id: viewType === 'teacher' ? selectedId : '', section_id: viewType === 'section' ? selectedId : '', subject_id: '' });
                                  setSelectedSlot({ day: day.id, period: p.period_number });
                                  setIsModalOpen(true);
                                }
                              } else if (slot?.teachers?.zoom_link) { window.open(normalizeUrl(slot.teachers.zoom_link), '_blank'); }
                            }}>
                            {displaySlot ? (
                              <div className="w-full">
                                <h4 className="font-black text-sm mb-1">{displaySlot.subjects?.name}</h4>
                                <div className="text-[10px] font-bold px-2 py-1.5 bg-slate-100 rounded-lg whitespace-normal break-words leading-tight">{getSlotSubtitle(displaySlot, viewType)}</div>
                                {displaySlot.teachers?.zoom_link && (
                                  <a href={normalizeUrl(displaySlot.teachers.zoom_link)} target="_blank" rel="noopener noreferrer" className="mt-2 w-full flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-700 py-1.5 rounded-lg text-[10px] font-black hover:bg-emerald-500 hover:text-white transition-colors" onClick={(e) => e.stopPropagation()}>
                                    <Video className="w-3.5 h-3.5" /> دخول البث
                                  </a>
                                )}
                                {isAdmin && slot && (
                                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 rounded-xl">
                                    <div className="flex gap-1.5">
                                      <button className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600" onClick={(e) => { e.stopPropagation(); setCopiedLesson(displaySlot); }}>نسخ</button>
                                      <button className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600" onClick={(e) => { e.stopPropagation(); setSwappingFrom(displaySlot); }}>نقل</button>
                                    </div>
                                    <div className="flex gap-1.5">
                                      <button className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600" onClick={(e) => { e.stopPropagation(); setEditingId(String(displaySlot.id)); setFormData({ teacher_id: displaySlot.teacher_id || '', section_id: displaySlot.section_id || '', subject_id: displaySlot.subject_id || '' }); setSelectedSlot({day: day.id, period: p.period_number}); setIsModalOpen(true); }}>تعديل</button>
                                      <button className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600" onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(String(displaySlot.id)); }}>حذف</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50"><Plus className="w-6 h-6" /></div>
                            )}
                          </motion.div>
                        );
                      })}
                    </React.Fragment>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 🖨️ منطقة الطباعة الخفية (The Print DOM) */}
      {/* ======================================================== */}
      {periods.length > 0 && (
        <div id="print-area" style={{ display: 'none' }} dir="rtl">

          {/* ── طباعة كل المعلمين (تصفية الفارغ) ── */}
          {printMode === 'all-teachers' && (() => {
            const printableTeachers = teachers.filter((teacher) => scheduleData.some((s) => String(s.teacher_id) === String(teacher.id)));
            return printableTeachers.map((teacher, tIdx) => {
              const teacherSchedule = scheduleData.filter(s => String(s.teacher_id) === String(teacher.id));
              return (
                <PrintScheduleBlock
                  key={teacher.id}
                  label={teacher.users?.full_name || 'معلم'}
                  scheduleData={teacherSchedule}
                  periods={periods}
                  viewType="teacher"
                  isLast={tIdx === printableTeachers.length - 1}
                />
              );
            });
          })()}

          {/* ── طباعة كل الفصول (تصفية الفارغ) ── */}
          {printMode === 'all-sections' && (() => {
            const printableSections = sections.filter((section) => scheduleData.some((s) => String(s.section_id) === String(section.id)));
            return printableSections.map((section, sIdx) => {
              const sectionSchedule = scheduleData.filter(s => String(s.section_id) === String(section.id));
              const classData = Array.isArray(section.classes) ? section.classes[0] : section.classes;
              return (
                <PrintScheduleBlock
                  key={section.id}
                  label={`${formatClassName(classData?.name)} - ${section.name}`}
                  scheduleData={sectionSchedule}
                  periods={periods}
                  viewType="section"
                  isLast={sIdx === printableSections.length - 1}
                />
              );
            });
          })()}

          {/* ── طباعة الجدول الحالي فقط ── */}
          {printMode === 'single' && (selectedId || showAllSchedules) && (
            <PrintScheduleBlock
              label={
                viewType === 'teacher'
                  ? teachers.find(t => String(t.id) === String(selectedId))?.users?.full_name || ''
                  : `${formatClassName((Array.isArray(sections.find(s => String(s.id) === String(selectedId))?.classes) ? sections.find(s => String(s.id) === String(selectedId))?.classes[0] : sections.find(s => String(s.id) === String(selectedId))?.classes)?.name)} - ${sections.find(s => String(s.id) === String(selectedId))?.name}`
              }
              scheduleData={scheduleData.filter(s => viewType === 'teacher' ? String(s.teacher_id) === String(selectedId) : String(s.section_id) === String(selectedId))}
              periods={periods}
              viewType={viewType}
              isLast={true}
            />
          )}
        </div>
      )}
    </div>
  );
}
