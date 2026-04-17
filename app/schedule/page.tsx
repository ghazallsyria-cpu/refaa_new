/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { Printer, User, Users, Info, X, Plus, Calendar, AlertCircle, Clock, Video, BookOpen, Sparkles, Bug, LayoutGrid, Save, Loader2 } from 'lucide-react';
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
// 🖨️ مكوّن جدول الطباعة لكيان واحد (معلم أو فصل)
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
        pageBreakAfter: isLast ? 'avoid' : 'always',
        breakAfter: isLast ? 'avoid' : 'page',
        width: '100%',
        fontFamily: 'Cairo, sans-serif',
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
          <div
            style={{
              fontSize: '22px',
              fontWeight: 900,
              color: '#1e1b4b',
              marginBottom: '6px',
            }}
          >
            الجدول الدراسي الأكاديمي
          </div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#374151',
              background: '#f1f5f9',
              display: 'inline-block',
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            {viewType === 'teacher' ? 'المعلم:' : 'الفصل:'}{' '}
            <span style={{ color: '#4338ca' }}>{label}</span>
            {subLabel && (
              <span style={{ color: '#64748b', marginRight: '4px' }}>
                {' '}— {subLabel}
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'left' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#4338ca',
              background: '#eef2ff',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #c7d2fe',
              marginBottom: '6px',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            📅 العام الدراسي الحالي
          </div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>
            تاريخ الطباعة:{' '}
            {new Date().toLocaleDateString('ar-EG', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>
      </div>

      {/* ─── الجدول ─── */}
      <div
        style={{
          borderRadius: '12px',
          overflow: 'hidden',
          border: '2px solid #e2e8f0',
        }}
      >
        <table
          className="custom-print-table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  width: '90px',
                  background: '#4338ca',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '12px',
                  padding: '10px 6px',
                  textAlign: 'center',
                  borderLeft: '2px solid #3730a3',
                  borderBottom: '2px solid #3730a3',
                }}
              >
                اليوم / الحصة
              </th>
              {periods.map((p) => (
                <th
                  key={p.id}
                  style={{
                    background: '#eef2ff',
                    color: '#1e1b4b',
                    fontWeight: 900,
                    fontSize: '11px',
                    padding: '8px 4px',
                    textAlign: 'center',
                    borderLeft: '1px solid #c7d2fe',
                    borderBottom: '2px solid #c7d2fe',
                  }}
                >
                  <div style={{ fontWeight: 900, marginBottom: '3px' }}>
                    الحصة {p.period_number}
                  </div>
                  <div
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      color: '#4338ca',
                      background: 'white',
                      display: 'inline-block',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid #c7d2fe',
                    }}
                  >
                    {p.start_time.slice(0, 5)} - {p.end_time.slice(0, 5)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day, idx) => (
              <tr key={day.id}>
                <td
                  style={{
                    fontWeight: 900,
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#1e293b',
                    background: idx % 2 === 0 ? '#f8fafc' : 'white',
                    borderLeft: '2px solid #e2e8f0',
                    borderTop: '1px solid #e2e8f0',
                    padding: '10px 4px',
                    verticalAlign: 'middle',
                  }}
                >
                  {day.name}
                </td>
                {periods.map((p) => {
                  const slot = scheduleData.find(
                    (s) =>
                      String(s.day_of_week) === String(day.id) &&
                      String(s.period) === String(p.period_number)
                  );
                  return (
                    <td
                      key={p.id}
                      style={{
                        height: '90px',
                        borderLeft: '1px solid #e2e8f0',
                        borderTop: '1px solid #e2e8f0',
                        background: idx % 2 === 0 ? '#f8fafc' : 'white',
                        padding: '6px',
                        verticalAlign: 'middle',
                        textAlign: 'center',
                      }}
                    >
                      {slot ? (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            gap: '4px',
                            background: 'white',
                            borderRadius: '8px',
                            padding: '6px',
                            border: '1px solid #e0e7ff',
                          }}
                        >
                          {/* اسم المادة */}
                          <div
                            style={{
                              fontWeight: 900,
                              fontSize: '12px',
                              color: '#1e1b4b',
                              lineHeight: '1.3',
                              textAlign: 'center',
                            }}
                          >
                            {slot.subjects?.name}
                          </div>

                          {/* المعلم أو الفصل */}
                          <div
                            style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              color: '#4338ca',
                              background: '#eef2ff',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1px solid #c7d2fe',
                              maxWidth: '100%',
                              textAlign: 'center',
                            }}
                          >
                            {viewType === 'teacher'
                              ? `${
                                  Array.isArray(slot.sections?.classes)
                                    ? slot.sections?.classes[0]?.name
                                    : slot.sections?.classes?.name
                                } - ${slot.sections?.name}`
                              : slot.teachers?.users?.full_name}
                          </div>

                          {/* رابط زوم (تم حل مشكلة الرابط الطويل) */}
                          {slot.teachers?.zoom_link && (
                            <a
                              href={slot.teachers.zoom_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="print-zoom-link"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                fontSize: '10px',
                                fontWeight: 900,
                                color: 'white',
                                background: '#2563eb', /* أزرق زوم */
                                border: '1px solid #1d4ed8',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                textDecoration: 'none',
                                marginTop: '4px',
                                width: '100%',
                                WebkitPrintColorAdjust: 'exact',
                              }}
                            >
                              رابط البث (Zoom)
                            </a>
                          )}
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            opacity: 0.25,
                          }}
                        >
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em' }}>
                            —
                          </span>
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
      <div
        style={{
          marginTop: '14px',
          paddingTop: '10px',
          borderTop: '2px solid #1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              background: '#4338ca',
              color: 'white',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '14px',
            }}
          >
            R
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#0f172a' }}>
              مدرسة الرفعة النموذجية
            </div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b' }}>
              نظام الإدارة الأكاديمية المتكامل
            </div>
          </div>
        </div>
        <div
          style={{
            fontSize: '9px',
            fontWeight: 700,
            color: '#64748b',
            background: '#f1f5f9',
            padding: '4px 12px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
          }}
        >
          نسخة إلكترونية معتمدة
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
  const [assignments, setAssignments] = useState<any[]>([]);
  const [copiedLesson, setCopiedLesson] = useState<any | null>(null);
  const [showAllSchedules, setShowAllSchedules] = useState(true);
  const [swappingFrom, setSwappingFrom] = useState<any | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // ─── حالة الطباعة المتقدمة ───
  const [printMode, setPrintMode] = useState<'single' | 'all-teachers' | 'all-sections'>('single');
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  
  const currentDayOfWeek = new Date().getDay() + 1;
  const defaultTab = (currentDayOfWeek >= 1 && currentDayOfWeek <= 5) ? currentDayOfWeek : 1;
  const [activeDayTab, setActiveDayTab] = useState<number>(defaultTab);

  const { 
    fetchInitialScheduleData, 
    fetchUserRole, 
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
        const isSystemAdmin = currentUserRole === 'admin' || currentUserRole === 'management';
        setIsAdmin(isSystemAdmin);
      } else {
        setIsAdmin(false);
      }

      const data = await fetchInitialScheduleData();
      setTeachers(data.teachers || []);
      setSections(data.sections || []);
      setSubjects(data.subjects || []);
      setAssignments(data.assignments || []);
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

  // المنطق البرمجي لعمليات الجدول كما هو
  const handleSwap = async (targetDay: number, targetPeriod: number, targetSlot: any | null) => {
    if (!swappingFrom || !isAdmin) return;
    try {
      setLoading(true);
      const sourceDay = Number(swappingFrom.day_of_week);
      const sourcePeriod = Number(swappingFrom.period);
      const tDay = Number(targetDay);
      const tPeriod = Number(targetPeriod);
      // الفحص والتنفيذ
      await swapSchedules(String(swappingFrom.id), sourceDay, sourcePeriod, targetSlot ? String(targetSlot.id) : null, tDay, tPeriod);
      setSwappingFrom(null);
      await fetchSchedule();
      alert('تم تبديل الحصص بنجاح! ✅');
    } catch (err: any) {
      alert(`حدث خطأ أثناء التبديل: ${err.message}`);
      fetchSchedule();
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!formData.teacher_id || !formData.section_id || !formData.subject_id || !selectedSlot) {
      alert('يرجى تعبئة جميع الحقول المطلوبة (المعلم، الفصل، المادة). ⚠️');
      return;
    }
    try {
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
      alert(editingId ? 'تم التحديث بنجاح!' : 'تمت الإضافة بنجاح!');
    } catch (err: any) {
      alert(`حدث خطأ أثناء الحفظ: ${err.message}`);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الحصة نهائياً؟')) return;
    try {
      await deleteSchedule(String(id));
      await fetchSchedule();
    } catch (err: any) {
      alert(`حدث خطأ: ${err.message}`);
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

  // ─── محرك الطباعة المعالج ───
  // هذا المحرك يمنع طباعة شاشة التحميل (الصورة 4)، ويجهز كل البيانات
  const executePrint = (type: 'single' | 'all-teachers' | 'all-sections') => {
    // 1. تحديد نوع الطباعة
    setPrintMode(type);
    
    // 2. التأكد من عرض كل الجداول إذا كانت طباعة جماعية
    if (type !== 'single') {
      setShowAllSchedules(true);
    }

    // 3. إظهار شاشة التحميل لمنع المستخدم من فعل شيء
    setIsPreparingPrint(true);

    // 4. السحر: ننتظر قليلاً لكي يقوم React برسم الجداول في الخلفية
    setTimeout(() => {
      // 5. نخفي شاشة التحميل *كلياً* لكي لا تظهر في الطباعة
      setIsPreparingPrint(false);

      // 6. ننتظر جزءاً من الثانية ليتأكد المتصفح أن الـ Loader اختفى، ثم نطبع
      setTimeout(() => {
        window.print();
      }, 500); 
    }, 1500); // 1.5 ثانية كافية جداً لرسم الجداول
  };

  // ==========================================
  // 👨‍🎓 شاشة الطالب
  // ==========================================
  if (authRole === 'student') {
    const currentSectionName = sections.find(s => String(s.id) === String(selectedId))?.name || '';
    const currentClassName = sections.find(s => String(s.id) === String(selectedId))?.classes?.name || '';

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 max-w-7xl mx-auto pb-24 px-4 sm:px-6 lg:px-8" dir="rtl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 p-8 sm:p-12 text-white shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-right">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase backdrop-blur-md">
                <Sparkles className="w-4 h-4 text-blue-300" />
                <span>الفصل الدراسي الحالي</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black">الجدول الأكاديمي</h1>
              <p className="text-indigo-100 font-bold">
                مرحباً بك يا بطل! هذا هو جدول حصصك لصف <span className="underline decoration-emerald-400">{currentClassName} - شعبة {currentSectionName}</span>.
              </p>
            </div>
          </div>
        </motion.div>

        {loading || periods.length === 0 ? (
          <div className="flex h-64 items-center justify-center bg-white/50 backdrop-blur-md rounded-[3rem] shadow-sm">
            <Loader2 className="w-14 h-14 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="hidden lg:block bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-xl p-8 overflow-hidden">
            <div className="grid gap-4" style={{ gridTemplateColumns: `100px repeat(${periods.length}, minmax(0, 1fr))` }}>
              <div className="h-16 flex items-center justify-center bg-slate-900 rounded-2xl"><span className="text-xs font-black text-white">اليوم</span></div>
              {periods.map(p => (
                <div key={p.id} className="h-16 flex flex-col items-center justify-center bg-indigo-50/50 rounded-2xl">
                  <span className="text-sm font-black text-indigo-900">الحصة {p.period_number}</span>
                  <span className="text-[10px] text-indigo-500 font-bold"><Clock className="w-3 h-3 inline mr-1" /> {p.start_time.slice(0, 5)}</span>
                </div>
              ))}

              {DAYS.map((day) => (
                <React.Fragment key={day.id}>
                  <div className={`font-black text-sm flex items-center justify-center rounded-2xl border ${day.id === currentDayOfWeek ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700'}`}>{day.name}</div>
                  {periods.map((p) => {
                    const slot = scheduleData.find(s => String(s.day_of_week) === String(day.id) && String(s.period) === String(p.period_number));
                    return (
                      <div key={`${day.id}-${p.id}`} className={`p-4 rounded-2xl min-h-[140px] flex flex-col justify-between transition-all ${slot ? 'bg-white shadow-md border-indigo-200' : 'bg-slate-50 border-dashed opacity-60'}`}>
                        {slot ? (
                          <>
                            <div>
                              <h4 className="font-black text-slate-900 mb-1">{slot.subjects?.name}</h4>
                              <div className="text-xs font-bold text-slate-500"><User className="w-3.5 h-3.5 inline mr-1" />{slot.teachers?.users?.full_name}</div>
                            </div>
                            {slot.teachers?.zoom_link && (
                              <a href={slot.teachers.zoom_link} target="_blank" rel="noopener noreferrer" className="mt-3 w-full flex items-center justify-center bg-emerald-50 text-emerald-700 py-2 rounded-xl text-[11px] font-black hover:bg-emerald-500 hover:text-white transition-colors">
                                <Video className="w-3.5 h-3.5 mr-1" /> دخول البث
                              </a>
                            )}
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50"><BookOpen className="w-6 h-6 mb-1" />فراغ</div>
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
      
      {/* 🖨️ CSS السحري لحل مشاكل Tailwind في الطباعة */}
      <style jsx global>{`
        @media print {
          @page { size: landscape; margin: 10mm; }
          
          /* تنظيف خصائص Next.js التي تمنع الطباعة في الموبايل */
          html, body, main, #__next {
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            background-color: white !important;
            color: black !important;
          }
          
          /* إخفاء الواجهة العادية نهائياً */
          .web-content { display: none !important; }
          
          /* إظهار الجداول المخصصة للطباعة فقط */
          #print-area { display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
          
          /* إجبار الألوان في كل المتصفحات */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

          /* 🚀 الحل الجذري لمشكلة الروابط البشعة (الصورة 5):
             هذا السطر يمنع المتصفح من كتابة رابط الـ URL بجانب الزر! */
          a.print-zoom-link::after,
          a[href]::after {
            content: none !important;
          }

          /* حل مشكلة تقطع الكلمات العربية (الصورة 3) */
          .custom-print-table th, .custom-print-table td {
            word-break: normal !important;
            overflow-wrap: break-word !important;
            white-space: pre-wrap !important;
          }
        }
      `}</style>

      {/* ⏳ شاشة التحميل (تظهر فقط في الموقع وليس في الورق) */}
      <AnimatePresence>
        {isPreparingPrint && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md text-white print:hidden">
            <Loader2 className="w-16 h-16 animate-spin text-indigo-400 mb-4" />
            <h2 className="text-3xl font-black">جاري تجهيز الطباعة...</h2>
            <p className="text-slate-300 font-bold mt-2">يرجى الانتظار، النظام يقوم برسم الجداول بدقة.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🖥️ واجهة الويب الطبيعية */}
      <div className="web-content space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 font-bold mb-2 text-xs">
              <LayoutGrid className="w-3.5 h-3.5" /> <span>إدارة الهيكل الزمني</span>
            </div>
            <h1 className="text-3xl font-black">{authRole === 'teacher' ? 'جدولي الدراسي' : 'الجدول الشامل'}</h1>
          </div>

          {/* ─── أزرار الطباعة المتطورة ─── */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button 
              onClick={() => executePrint('single')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 transition-all active:scale-95"
            >
              <Printer className="h-4 w-4" /> طباعة الحالي
            </button>

            {isAdmin && authRole !== 'teacher' && (
              <>
                <button
                  onClick={() => executePrint('all-teachers')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-700 transition-all active:scale-95"
                >
                  <User className="h-4 w-4" /> طباعة كل المعلمين
                </button>
                <button
                  onClick={() => executePrint('all-sections')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white hover:bg-violet-700 transition-all active:scale-95"
                >
                  <Users className="h-4 w-4" /> طباعة كل الفصول
                </button>
              </>
            )}
          </div>
        </div>

        {/* فلاتر الجدول والإدارة */}
        {isAdmin && authRole !== 'teacher' && (
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col lg:flex-row gap-6 items-center">
            <div className="flex rounded-xl bg-slate-100 p-1 w-full lg:w-auto shrink-0">
              <button onClick={() => { setViewType('teacher'); if (teachers.length > 0) setSelectedId(String(teachers[0].id)); }} className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 font-black rounded-lg ${viewType === 'teacher' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><User className="w-4 h-4" /> معلمين</button>
              <button onClick={() => { setViewType('section'); if (sections.length > 0) setSelectedId(String(sections[0].id)); }} className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 font-black rounded-lg ${viewType === 'section' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><Users className="w-4 h-4" /> فصول</button>
            </div>
            <div className="flex-1 w-full relative">
              <select value={selectedId} onChange={(e) => setSelectedId(String(e.target.value))} className="w-full rounded-xl border border-slate-200 py-4 px-4 bg-slate-50 font-bold outline-none">
                <option value="">-- اختر --</option>
                {viewType === 'teacher' ? teachers.map(t => <option key={t.id} value={t.id}>{t.users?.full_name}</option>) : sections.map(s => <option key={s.id} value={s.id}>{Array.isArray(s.classes) ? s.classes[0]?.name : s.classes?.name} - {s.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 px-5 py-4 rounded-xl border border-slate-200">
              <input type="checkbox" id="showAll" checked={showAllSchedules} onChange={(e) => setShowAllSchedules(e.target.checked)} className="w-5 h-5 cursor-pointer" />
              <label htmlFor="showAll" className="font-black cursor-pointer">عرض الكل</label>
            </div>
          </div>
        )}

        {/* عرض الجدول في الويب */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto p-6 sm:p-8">
            <div className="min-w-[800px]">
              <div className="grid gap-3" style={{ gridTemplateColumns: `100px repeat(${periods.length}, minmax(0, 1fr))` }}>
                <div className="h-16 flex items-center justify-center bg-slate-900 rounded-2xl"><span className="text-white font-black">اليوم</span></div>
                {periods.map(p => (
                  <div key={p.id} className="h-16 flex flex-col items-center justify-center bg-slate-50 rounded-2xl">
                    <span className="font-black">الحصة {p.period_number}</span>
                    <span className="text-[10px] text-slate-500 font-bold">{p.start_time.slice(0, 5)}</span>
                  </div>
                ))}
                
                {DAYS.map((day) => (
                  <React.Fragment key={day.id}>
                    <div className="font-black flex items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">{day.name}</div>
                    {periods.map((p) => {
                      const slot = scheduleData.find(s => String(s.day_of_week) === String(day.id) && String(s.period) === String(p.period_number) && (viewType === 'teacher' ? String(s.teacher_id) === String(selectedId) : String(s.section_id) === String(selectedId)));
                      const others = (isAdmin && showAllSchedules) ? scheduleData.filter(s => String(s.day_of_week) === String(day.id) && String(s.period) === String(p.period_number) && (viewType === 'teacher' ? String(s.teacher_id) !== String(selectedId) : String(s.section_id) !== String(selectedId))) : [];
                      const displaySlot = slot || (swappingFrom && others.find(o => String(o.id) === String(swappingFrom.id)) ? swappingFrom : others[0]);

                      return (
                        <div key={`${day.id}-${p.id}`} className={`p-4 rounded-2xl min-h-[120px] flex flex-col justify-between ${slot ? 'bg-white shadow-md border-indigo-200' : 'bg-slate-50 opacity-70'} ${isAdmin ? 'cursor-pointer hover:border-indigo-400' : ''}`}
                          onClick={() => {
                            if (isAdmin) {
                              if (!displaySlot || others.length > 0) {
                                setFormData({ teacher_id: viewType === 'teacher' ? selectedId : '', section_id: viewType === 'section' ? selectedId : '', subject_id: '' });
                                setSelectedSlot({ day: day.id, period: p.period_number });
                                setIsModalOpen(true);
                              }
                            }
                          }}>
                          {displaySlot ? (
                            <div className="w-full">
                              <h4 className="font-black text-sm mb-1">{displaySlot.subjects?.name}</h4>
                              <div className="text-[10px] font-bold px-2 py-1 bg-slate-100 rounded">{viewType === 'teacher' ? `${Array.isArray(displaySlot.sections?.classes) ? displaySlot.sections?.classes[0]?.name : displaySlot.sections?.classes?.name} - ${displaySlot.sections?.name}` : displaySlot.teachers?.users?.full_name}</div>
                              {displaySlot.teachers?.zoom_link && (
                                <a href={displaySlot.teachers.zoom_link} target="_blank" rel="noopener noreferrer" className="mt-2 w-full flex justify-center bg-emerald-50 text-emerald-700 py-1.5 rounded-lg text-[10px] font-black">دخول البث</a>
                              )}
                              {isAdmin && slot && <button onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(String(displaySlot.id)); }} className="text-[10px] text-rose-500 font-bold mt-2">حذف الحصة</button>}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400"><Plus className="w-6 h-6" /></div>
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── نافذة الإضافة ─── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black">{editingId ? 'تعديل الحصة' : 'إضافة حصة'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-50 rounded-xl"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold mb-2">{viewType === 'teacher' ? 'اختيار الفصل' : 'اختيار المعلم'}</label>
                  {viewType === 'teacher' ? (
                    <select className="w-full p-4 border rounded-xl font-bold" value={formData.section_id} onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}>
                      <option value="">-- اختر الفصل --</option>
                      {sections.map(s => <option key={s.id} value={s.id}>{Array.isArray(s.classes) ? s.classes[0]?.name : s.classes?.name} - {s.name}</option>)}
                    </select>
                  ) : (
                    <select className="w-full p-4 border rounded-xl font-bold" value={formData.teacher_id} onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}>
                      <option value="">-- اختر المعلم --</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.users?.full_name}</option>)}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">المادة الدراسية</label>
                  <select className="w-full p-4 border rounded-xl font-bold" value={formData.subject_id} onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}>
                    <option value="">-- اختر المادة --</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-8 pt-4 border-t"><button className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black" onClick={handleAddSchedule}>اعتماد الحصة</button></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* 🖨️ منطقة الطباعة الخفية (The Print DOM)                   */}
      {/* ======================================================== */}
      {periods.length > 0 && (
        <div id="print-area" style={{ display: 'none' }} dir="rtl">

          {/* ── طباعة كل المعلمين ── */}
          {printMode === 'all-teachers' && teachers.map((teacher, tIdx) => {
            const teacherSchedule = scheduleData.filter(s => String(s.teacher_id) === String(teacher.id));
            if (teacherSchedule.length === 0) return null;
            return (
              <PrintScheduleBlock
                key={teacher.id}
                label={teacher.users?.full_name || 'معلم'}
                scheduleData={teacherSchedule}
                periods={periods}
                viewType="teacher"
                isLast={tIdx === teachers.length - 1}
              />
            );
          })}

          {/* ── طباعة كل الفصول ── */}
          {printMode === 'all-sections' && sections.map((section, sIdx) => {
            const sectionSchedule = scheduleData.filter(s => String(s.section_id) === String(section.id));
            if (sectionSchedule.length === 0) return null;
            const classData = Array.isArray(section.classes) ? section.classes[0] : section.classes;
            return (
              <PrintScheduleBlock
                key={section.id}
                label={`${classData?.name} - ${section.name}`}
                scheduleData={sectionSchedule}
                periods={periods}
                viewType="section"
                isLast={sIdx === sections.length - 1}
              />
            );
          })}

          {/* ── طباعة الجدول الحالي فقط ── */}
          {printMode === 'single' && selectedId && (
            <PrintScheduleBlock
              label={
                viewType === 'teacher'
                  ? teachers.find(t => String(t.id) === String(selectedId))?.users?.full_name || ''
                  : `${(Array.isArray(sections.find(s => String(s.id) === String(selectedId))?.classes) ? sections.find(s => String(s.id) === String(selectedId))?.classes[0] : sections.find(s => String(s.id) === String(selectedId))?.classes)?.name} - ${sections.find(s => String(s.id) === String(selectedId))?.name}`
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
