/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-img-element */
// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, FileText, Printer, Plus, Calendar, 
  BookOpen, Users, Loader2, Activity, Trash2, Edit, Download, Files
} from 'lucide-react';
import Link from 'next/link';

export default function EvaluationsArchivePage() {
  const { authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [printDateFilter, setPrintDateFilter] = useState('');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingDetailed, setIsExportingDetailed] = useState(false);

  // 🚀 حالة التحديد للطباعة المتعددة
  const [selectedEvals, setSelectedEvals] = useState<string[]>([]);

  useEffect(() => {
    const fetchEvaluations = async () => {
      try {
        const { data, error } = await supabase
          .from('teacher_evaluations')
          .select(`
            id,
            evaluation_date,
            day_of_week,
            subject,
            period,
            class_name,
            plan_prep, sci_mastery, presentation, tech_use, class_mgt, 
            ind_diff, interaction, notebooks, delay_record, parents_comm,
            strengths, improvements,
            teachers ( users (full_name) ),
            evaluator:users!evaluator_id (full_name)
          `)
          .order('evaluation_date', { ascending: false });

        if (error) throw error;
        setEvaluations(data || []);
      } catch (err) {
        console.error("Error fetching evaluations:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluations();
  }, []);

  const calculateScore = (evalObj: any) => {
    let score = 0;
    if (evalObj.plan_prep) score++;
    if (evalObj.sci_mastery) score++;
    if (evalObj.presentation) score++;
    if (evalObj.tech_use) score++;
    if (evalObj.class_mgt) score++;
    if (evalObj.ind_diff) score++;
    if (evalObj.interaction) score++;
    if (evalObj.notebooks) score++;
    if (evalObj.delay_record) score++;
    if (evalObj.parents_comm) score++;
    return score;
  };

  // فلترة البحث
  const filteredEvaluations = evaluations.filter(ev => {
    const teacherName = ev.teachers?.users?.full_name || '';
    const matchSearch = teacherName.includes(searchTerm) || ev.subject.includes(searchTerm);
    const matchDate = printDateFilter ? ev.evaluation_date === printDateFilter : true;
    return matchSearch && matchDate;
  });

  // 🚀 دوال تحديد التقييمات
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedEvals(filteredEvaluations.map(ev => ev.id));
    } else {
      setSelectedEvals([]);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedEvals(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // 🚀 دالة الحذف الإداري
  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التقييم نهائياً؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    try {
      const { error } = await supabase.from('teacher_evaluations').delete().eq('id', id);
      if (error) throw error;
      setEvaluations(prev => prev.filter(ev => ev.id !== id));
      setSelectedEvals(prev => prev.filter(i => i !== id));
      alert('تم حذف التقييم بنجاح.');
    } catch (err: any) {
      alert('حدث خطأ أثناء الحذف: ' + err.message);
    }
  };

  // 🚀 تصدير (الجدول المختصر)
  const exportToPDF = async () => {
    if (filteredEvaluations.length === 0) {
      alert('لا توجد تقييمات مطابقة للطباعة.');
      return;
    }
    setIsExportingPDF(true);

    try {
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default || html2canvasModule;
      const { jsPDF } = await import('jspdf');

      let tableRows = filteredEvaluations.map((ev, index) => `
        <tr>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${index + 1}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold;">${ev.teachers?.users?.full_name || 'مجهول'}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${ev.subject}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${ev.class_name}</td>
          <td dir="ltr" style="border: 1px solid #000; padding: 8px; text-align: center;">${ev.evaluation_date}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; color: ${calculateScore(ev) >= 8 ? '#059669' : '#e11d48'};">${calculateScore(ev)} / 10</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${ev.evaluator?.full_name || 'الإدارة'}</td>
        </tr>
      `).join('');

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed'; iframe.style.top = '-10000px'; iframe.style.width = '1000px'; iframe.style.height = '1200px';
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      doc!.open();
      doc!.write(`
        <!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
        <style>body { font-family: Arial, sans-serif; padding: 40px; color: #000; background-color: #fff; margin: 0; } .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; } table { width: 100%; border-collapse: collapse; margin-top: 20px; } th, td { border: 1px solid #000; padding: 12px; text-align: center; } th { background-color: #f1f5f9; font-weight: bold; }</style>
        </head><body><div id="pdf-target"><div class="header"><h2>مدرسة الرفعة النموذجية</h2><h3>السجل العام لتقييمات المعلمين</h3><p style="color: #555; font-size: 14px;">${printDateFilter ? `التقييمات المخصصة لتاريخ: <span dir="ltr">${printDateFilter}</span>` : 'جميع التقييمات المؤرشفة في النظام'}</p><p style="color: #777; font-size: 12px;">إجمالي السجلات: ${filteredEvaluations.length}</p></div><table><thead><tr><th width="5%">#</th><th width="25%">المعلم</th><th width="15%">المادة</th><th width="10%">الصف</th><th width="15%">التاريخ</th><th width="10%">النتيجة</th><th width="20%">المُقيّم</th></tr></thead><tbody>${tableRows}</tbody></table><div style="margin-top: 40px; font-size: 12px; text-align: center; border-top: 1px solid #000; padding-top: 10px;">تم الاستخراج آلياً من النظام الإلكتروني لإدارة التقييمات.</div></div></body></html>
      `);
      doc!.close();

      await new Promise(resolve => setTimeout(resolve, 500));
      const targetElement = doc!.getElementById('pdf-target');
      
      const canvas = await html2canvas(targetElement!, { scale: 2, useCORS: true, backgroundColor: '#ffffff', window: iframe.contentWindow as any });
      const imgData = canvas.toDataURL('image/jpeg', 0.98); 
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`سجل_التقييمات_${printDateFilter || 'الشامل'}.pdf`);
      document.body.removeChild(iframe);

    } catch (err) { alert('حدث خطأ أثناء تصدير التقرير.'); } finally { setIsExportingPDF(false); }
  };

  // 🚀 تصدير (النماذج التفصيلية كاملة) في ملف واحد
  const exportDetailedReportsToPDF = async () => {
    const dataToPrint = selectedEvals.length > 0 
      ? filteredEvaluations.filter(ev => selectedEvals.includes(ev.id))
      : filteredEvaluations;

    if (dataToPrint.length === 0) {
      alert('لا توجد بيانات للطباعة.'); return;
    }
    if (dataToPrint.length > 15 && !confirm(`أنت على وشك طباعة ${dataToPrint.length} نماذج تقييم في ملف واحد، قد تستغرق العملية وقتاً، هل تريد الاستمرار؟`)) return;

    setIsExportingDetailed(true);

    try {
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default || html2canvasModule;
      const { jsPDF } = await import('jspdf');

      const { data: settings } = await supabase.from('platform_settings').select('logo_url').maybeSingle();
      const logoUrl = settings?.logo_url || '';

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed'; iframe.style.top = '-10000px'; iframe.style.width = '800px'; iframe.style.height = '1200px';
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      doc!.open();

      let htmlContent = '<div id="batch-print-container" style="background: white;">';
      
      dataToPrint.forEach((ev, idx) => {
        const itemsHTML = [
          { label: 'التخطيط الجيد للدرس واعتماد التحضير', value: ev.plan_prep },
          { label: 'التمكن من المادة العلمية', value: ev.sci_mastery },
          { label: 'عرض المادة العلمية بأسلوب مشوق ومناسب', value: ev.presentation },
          { label: 'استخدام الوسائل والتقنيات التربوية', value: ev.tech_use },
          { label: 'إدارة الفصل واستثمار وقت الحصة', value: ev.class_mgt },
          { label: 'مراعاة الفروق الفردية بين المتعلمين', value: ev.ind_diff },
          { label: 'التفاعل والتواصل الإيجابي مع المتعلمين', value: ev.interaction },
          { label: 'المتابعة المستمرة لكراسات وتطبيقات المتعلمين', value: ev.notebooks },
          { label: 'تفعيل سجل التأخر الدراسي والخطط العلاجية', value: ev.delay_record },
          { label: 'التواصل مع أولياء أمور المتعلمين ضعاف التحصيل', value: ev.parents_comm }
        ].map((item, i) => `
          <tr>
            <td style="border: 2px solid #1e293b; padding: 8px; text-align: center; font-weight: bold;">${i + 1}</td>
            <td style="border: 2px solid #1e293b; padding: 8px; font-weight: bold;">${item.label}</td>
            <td style="border: 2px solid #1e293b; padding: 6px; text-align: center; font-weight: bold; color: #059669; font-size: 18px;">${item.value ? '✔' : ''}</td>
            <td style="border: 2px solid #1e293b; padding: 6px; text-align: center; font-weight: bold; color: #e11d48; font-size: 18px;">${!item.value ? '✖' : ''}</td>
          </tr>
        `).join('');

        htmlContent += `
          <div id="report-page-${idx}" style="min-height: 1122px; padding: 40px; box-sizing: border-box; background: white;">
            <div style="border: 3px double #1e293b; padding: 30px; border-radius: 12px; height: 100%; box-sizing: border-box;">
              <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px;">
                  <div style="text-align: right; font-weight: bold; font-size: 14px; line-height: 1.6;">
                      <p style="margin:2px 0;">دولة الكويت</p>
                      <p style="margin:2px 0;">وزارة التربية</p>
                      <p style="margin:2px 0;">مدرسة الرفعة النموذجية</p>
                  </div>
                  <div style="text-align: center;">
                      ${logoUrl ? `<img src="${logoUrl}" style="max-height: 70px;" />` : `<div style="width: 50px; height: 50px; border: 2px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px;">شعار</div>`}
                  </div>
                  <div style="text-align: left; font-weight: bold; font-size: 14px; line-height: 1.6;">
                      <p style="margin:2px 0;">العام الدراسي: 2025 / 2026</p>
                      <p style="margin:2px 0;">الفصل الدراسي: الثاني</p>
                      <p style="margin:2px 0;">التاريخ: ${new Date(ev.evaluation_date).toLocaleDateString('ar-EG')}</p>
                  </div>
              </div>
              <div style="text-align: center; margin-bottom: 20px;">
                   <h1 style="display: inline-block; background: #1e293b; color: white; padding: 8px 30px; border-radius: 6px; box-shadow: 4px 4px 0 #94a3b8; font-size: 20px; margin: 0;">نموذج متابعة معلم وتأخر دراسي</h1>
              </div>
              <table style="width: 100%; margin-bottom: 20px; font-weight: bold; font-size: 14px;">
                  <tr>
                      <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;">المعلم: ${ev.teachers?.users?.full_name || ''}</td>
                      <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;">المادة: ${ev.subject || ''}</td>
                      <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;">اليوم: ${ev.day_of_week || ''}</td>
                  </tr>
                  <tr>
                      <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;">الصف: ${ev.class_name || ''}</td>
                      <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;" colspan="2">الحصة: ${ev.period || ''}</td>
                  </tr>
              </table>
              <table style="width: 100%; border-collapse: collapse; border: 2px solid #1e293b; margin-bottom: 20px; font-size: 14px;">
                  <thead>
                      <tr style="background: #f1f5f9;">
                          <th style="border: 2px solid #1e293b; padding: 8px; width: 5%;">م</th>
                          <th style="border: 2px solid #1e293b; padding: 8px; text-align: right;">عناصر المتابعة</th>
                          <th style="border: 2px solid #1e293b; padding: 8px; width: 10%;">نعم</th>
                          <th style="border: 2px solid #1e293b; padding: 8px; width: 10%;">لا</th>
                      </tr>
                  </thead>
                  <tbody>${itemsHTML}</tbody>
              </table>
              <div style="border: 2px solid #1e293b; border-radius: 8px; padding: 12px; margin-bottom: 15px;">
                  <h3 style="margin: 0 0 5px 0; font-size: 14px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px;">نقاط القوة:</h3>
                  <p style="white-space: pre-wrap; font-size: 13px; margin:0;">${ev.strengths || 'لا توجد ملاحظات مدونة.'}</p>
              </div>
              <div style="border: 2px solid #1e293b; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
                  <h3 style="margin: 0 0 5px 0; font-size: 14px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px;">نقاط تحتاج إلى تحسين (ملاحظات):</h3>
                  <p style="white-space: pre-wrap; font-size: 13px; margin:0;">${ev.improvements || 'لا توجد ملاحظات مدونة.'}</p>
              </div>
              <table style="width: 100%; text-align: center; font-weight: bold; margin-top: 30px; font-size: 14px;">
                  <tr>
                      <td>المعلم المزار<br/><br/><br/><span style="border-top: 1px solid #94a3b8; padding-top: 5px; font-size: 11px; color: #64748b;">الاسم والتوقيع</span></td>
                      <td>رئيس القسم / الزائر<br/><br/><span style="color: #4338ca; font-size: 16px;">${ev.evaluator?.full_name || ''}</span><br/><br/><span style="border-top: 1px solid #94a3b8; padding-top: 5px; font-size: 11px; color: #64748b;">الاسم والتوقيع</span></td>
                      <td>مدير المدرسة<br/><br/><span style="color: #4338ca; font-size: 16px;">أ. صالح المطيري</span><br/><br/><span style="border-top: 1px solid #94a3b8; padding-top: 5px; font-size: 11px; color: #64748b;">التوقيع والاعتماد</span></td>
                  </tr>
              </table>
            </div>
          </div>
        `;
      });

      htmlContent += '</div>';

      doc!.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><style>body{margin:0;font-family:Arial,sans-serif;}</style></head><body>${htmlContent}</body></html>`);
      doc!.close();

      await new Promise(r => setTimeout(r, 1000));

      const pdf = new jsPDF('p', 'mm', 'a4');
      
      for (let i = 0; i < dataToPrint.length; i++) {
        const el = doc!.getElementById(`report-page-${i}`);
        const canvas = await html2canvas(el!, { scale: 2, useCORS: true, backgroundColor: '#ffffff', window: iframe.contentWindow as any });
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      pdf.save(`النماذج_التفصيلية_${printDateFilter || 'الشامل'}.pdf`);
      document.body.removeChild(iframe);

    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تصدير النماذج.');
    } finally {
      setIsExportingDetailed(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-32 font-cairo pt-8" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 🚀 الهيدر */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-200 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black uppercase mb-3">
              <Activity className="w-4 h-4" /> الأرشيف الإداري
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">سجل تقييمات المعلمين</h1>
            <p className="text-slate-500 font-bold mt-1 text-sm sm:text-base">جميع الزيارات الميدانية وتقييمات الأداء مؤرشفة هنا.</p>
          </div>
          
          <Link href="/admin/evaluations/new" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-2xl font-black transition-all active:scale-95 shadow-lg shadow-indigo-200 w-full md:w-auto justify-center shrink-0">
            <Plus className="w-5 h-5" /> إضافة تقييم جديد
          </Link>
        </div>

        {/* 🚀 أدوات الفلترة والطباعة المتقدمة للإدارة */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex-1 flex items-center gap-3">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input 
              type="text" 
              placeholder="ابحث باسم المعلم أو المادة..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-none outline-none font-bold text-slate-700 placeholder:text-slate-400"
            />
          </div>

          {(currentRole === 'admin' || currentRole === 'management') && (
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 w-full sm:w-auto">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input 
                  type="date"
                  value={printDateFilter}
                  onChange={(e) => setPrintDateFilter(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 w-full"
                />
                {printDateFilter && (
                  <button onClick={() => setPrintDateFilter('')} className="text-xs text-rose-500 hover:text-rose-700 font-bold bg-rose-50 px-2 py-1 rounded-md">مسح</button>
                )}
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button 
                  onClick={exportToPDF}
                  disabled={isExportingPDF || isExportingDetailed}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm transition-all shadow-sm active:scale-95 disabled:opacity-50 bg-slate-800 text-white hover:bg-slate-900"
                  title="طباعة جدول مختصر للتقييمات"
                >
                  {isExportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  السجل
                </button>
                
                <button 
                  onClick={exportDetailedReportsToPDF}
                  disabled={isExportingPDF || isExportingDetailed}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm transition-all shadow-sm active:scale-95 disabled:opacity-50 bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200"
                  title="طباعة النماذج التفصيلية كاملة"
                >
                  {isExportingDetailed ? <Loader2 className="w-4 h-4 animate-spin" /> : <Files className="w-4 h-4" />}
                  {selectedEvals.length > 0 ? `النماذج (${selectedEvals.length})` : 'النماذج'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 🚀 جدول الأرشيف */}
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-12 h-12 text-indigo-500 animate-spin" /></div>
        ) : filteredEvaluations.length === 0 ? (
          <div className="bg-white py-20 text-center rounded-[2rem] border border-dashed border-slate-300">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-bold text-lg">لا توجد تقييمات مطابقة.</p>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-right whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {(currentRole === 'admin' || currentRole === 'management') && (
                      <th className="py-4 px-4 text-center w-12">
                        <input 
                          type="checkbox" 
                          checked={selectedEvals.length === filteredEvaluations.length && filteredEvaluations.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="py-4 px-6 text-xs font-black uppercase text-slate-500">المعلم / المادة</th>
                    <th className="py-4 px-6 text-xs font-black uppercase text-slate-500">التاريخ</th>
                    <th className="py-4 px-6 text-xs font-black uppercase text-slate-500">الصف</th>
                    <th className="py-4 px-6 text-xs font-black uppercase text-slate-500 text-center">النتيجة (من 10)</th>
                    <th className="py-4 px-6 text-xs font-black uppercase text-slate-500 text-center">بواسطة</th>
                    <th className="py-4 px-6 text-xs font-black uppercase text-slate-500 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEvaluations.map((ev) => {
                    const score = calculateScore(ev);
                    const isSelected = selectedEvals.includes(ev.id);
                    return (
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={ev.id} className={`transition-colors group ${isSelected ? 'bg-indigo-50/30' : 'hover:bg-slate-50/50'}`}>
                        {(currentRole === 'admin' || currentRole === 'management') && (
                          <td className="py-4 px-4 text-center">
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => handleSelect(ev.id)}
                              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                              {(ev.teachers?.users?.full_name || '؟').charAt(0)}
                            </div>
                            <div>
                              <p className="font-black text-slate-800 text-sm">{ev.teachers?.users?.full_name || 'معلم محذوف'}</p>
                              <p className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-0.5"><BookOpen className="w-3 h-3" /> {ev.subject}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                            <Calendar className="w-4 h-4 text-slate-400" /> <span dir="ltr">{ev.evaluation_date}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-sm font-bold text-slate-600">
                          {ev.class_name}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="inline-flex items-center justify-center w-14 h-8 rounded-lg font-black text-sm border bg-white shadow-sm">
                            <span className={score >= 8 ? 'text-emerald-600' : score >= 5 ? 'text-amber-600' : 'text-rose-600'}>{score}</span>
                            <span className="text-slate-400 mx-0.5">/</span>10
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center text-xs font-bold text-slate-500">
                          {ev.evaluator?.full_name || 'الإدارة'}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Link href={`/admin/evaluations/${ev.id}/print`} className="inline-flex items-center justify-center p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm active:scale-95" title="طباعة فردية">
                              <Printer className="w-4 h-4" />
                            </Link>
                            
                            {(currentRole === 'admin' || currentRole === 'management') && (
                              <>
                                <Link href={`/admin/evaluations/${ev.id}/edit`} className="inline-flex items-center justify-center p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 transition-all shadow-sm active:scale-95" title="تعديل">
                                  <Edit className="w-4 h-4" />
                                </Link>
                                <button onClick={() => handleDelete(ev.id)} className="inline-flex items-center justify-center p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-sm active:scale-95" title="حذف">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
