'use client';

import { useState, useMemo } from 'react';
import { 
  BookOpen, Download, Search, Filter, TrendingUp, 
  AlertTriangle, CheckCircle2, MinusCircle, Users, Award
} from 'lucide-react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';
import { useGradebook } from '@/hooks/useGradebook';

export default function GradebookPage() {
  const { loading, performanceData, sections } = useGradebook();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');

  const filteredData = useMemo(() => {
    return performanceData.filter(student => {
      const matchesSearch = student.full_name.includes(searchQuery);
      const matchesSection = selectedSection === 'all' || student.section_name === sections.find(s => s.id === selectedSection)?.name;
      return matchesSearch && matchesSection;
    });
  }, [performanceData, searchQuery, selectedSection, sections]);

  const stats = useMemo(() => {
    if (filteredData.length === 0) return { avgScore: 0, excellent: 0, warning: 0 };
    
    const totalScore = filteredData.reduce((sum, s) => sum + s.exams_average, 0);
    return {
      avgScore: Math.round(totalScore / filteredData.length),
      excellent: filteredData.filter(s => s.performance_status === 'excellent').length,
      warning: filteredData.filter(s => s.performance_status === 'warning' || s.performance_status === 'danger').length,
    };
  }, [filteredData]);

  const exportToExcel = () => {
    const headerData = [
      ['دفتر أعمال الطلاب - سجل الأداء الشامل'],
      [`تاريخ التصدير: ${new Date().toLocaleDateString('ar-SA')}`],
      [`الفصل: ${selectedSection === 'all' ? 'جميع الفصول' : sections.find(s => s.id === selectedSection)?.name}`],
      [],
      ['م', 'اسم الطالب', 'الفصل', 'الاختبارات المنجزة', 'متوسط الدرجات (%)', 'التقييم العام']
    ];

    const getStatusText = (status: string) => {
      switch(status) {
        case 'excellent': return 'ممتاز';
        case 'good': return 'جيد';
        case 'warning': return 'يحتاج متابعة';
        case 'danger': return 'ضعيف';
        default: return 'غير محدد';
      }
    };

    const bodyData = filteredData.map((s, idx) => [
      idx + 1,
      s.full_name,
      s.section_name,
      s.exams_taken,
      `${s.exams_average}%`,
      getStatusText(s.performance_status)
    ]);

    const finalData = [...headerData, ...bodyData];
    const ws = XLSX.utils.aoa_to_sheet(finalData);
    ws['!dir'] = 'rtl';
    ws['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'سجل الأداء');
    XLSX.writeFile(wb, `دفتر_الاعمال_${new Date().getTime()}.xlsx`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin h-12 w-12 border-t-4 border-indigo-600 rounded-full"></div></div>;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-8 pb-24" dir="rtl">
      
      {/* Header */}
      <div className="glass-card p-8 rounded-[40px] shadow-2xl border border-white/60 bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 bg-indigo-50 rounded-2xl flex items-center justify-center shadow-inner border border-indigo-100">
              <BookOpen className="h-8 w-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">دفتر الأعمال وسجل الأداء</h1>
              <p className="text-slate-500 font-bold mt-1">متابعة شاملة لأداء الطلاب في جميع التقييمات والاختبارات</p>
            </div>
          </div>
          <button 
            onClick={exportToExcel}
            className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-emerald-50 text-emerald-700 font-black hover:bg-emerald-100 hover:shadow-lg hover:shadow-emerald-100 transition-all border border-emerald-200"
          >
            <Download size={20} /> تصدير الدفتر (Excel)
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-3xl border border-indigo-100 shadow-xl bg-indigo-50/50 flex flex-col justify-between group hover:bg-indigo-50 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm"><TrendingUp className="h-6 w-6 text-indigo-600" /></div>
          </div>
          <div>
            <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">المتوسط العام للفصل</p>
            <p className="text-4xl font-black text-indigo-900 mt-1" dir="ltr">{stats.avgScore}%</p>
          </div>
        </div>

        <div className="glass-card p-6 rounded-3xl border border-emerald-100 shadow-xl bg-emerald-50/50 flex flex-col justify-between group hover:bg-emerald-50 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm"><Award className="h-6 w-6 text-emerald-600" /></div>
          </div>
          <div>
            <p className="text-xs font-black text-emerald-400 uppercase tracking-widest">الطلاب المتفوقين (90+)</p>
            <p className="text-4xl font-black text-emerald-900 mt-1">{stats.excellent}</p>
          </div>
        </div>

        <div className="glass-card p-6 rounded-3xl border border-red-100 shadow-xl bg-red-50/50 flex flex-col justify-between group hover:bg-red-50 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm"><AlertTriangle className="h-6 w-6 text-red-600" /></div>
          </div>
          <div>
            <p className="text-xs font-black text-red-400 uppercase tracking-widest">يحتاجون متابعة أكاديمية</p>
            <p className="text-4xl font-black text-red-900 mt-1">{stats.warning}</p>
          </div>
        </div>
      </div>

      {/* Smart Grid */}
      <div className="glass-card rounded-[40px] border border-white/60 shadow-2xl overflow-hidden bg-white flex flex-col">
        
        {/* Filters */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 bg-slate-50/50">
          <div className="relative flex-1 group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input 
              type="text" 
              placeholder="ابحث عن طالب في الدفتر..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full pr-12 pl-4 py-3.5 rounded-2xl bg-white border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none transition-all shadow-sm" 
            />
          </div>
          <div className="relative group md:w-72">
            <Filter className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <select 
              value={selectedSection} 
              onChange={(e) => setSelectedSection(e.target.value)} 
              className="w-full pr-12 pl-4 py-3.5 rounded-2xl bg-white border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none transition-all appearance-none cursor-pointer shadow-sm"
            >
              <option value="all">عرض جميع الفصول</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-white text-slate-400 text-xs font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-8 py-5">اسم الطالب</th>
                <th className="px-8 py-5 text-center">الاختبارات المنجزة</th>
                <th className="px-8 py-5 text-center">متوسط الدرجات</th>
                <th className="px-8 py-5 text-center">التقييم العام</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.length > 0 ? (
                filteredData.map((student, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: idx * 0.02 }}
                    key={student.student_id} 
                    className="hover:bg-slate-50 transition-all group"
                  >
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-black shadow-sm">
                          {student.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{student.full_name}</p>
                          <p className="text-xs text-slate-500 font-bold">{student.section_name}</p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-8 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-black text-sm">
                        {student.exams_taken}
                      </span>
                    </td>

                    <td className="px-8 py-4 text-center">
                      <div className="inline-flex items-center justify-center gap-1">
                        <span className={`text-xl font-black ${
                          student.exams_average >= 90 ? 'text-emerald-600' :
                          student.exams_average >= 75 ? 'text-indigo-600' :
                          student.exams_average >= 50 ? 'text-amber-600' : 'text-red-600'
                        }`} dir="ltr">{student.exams_average}%</span>
                      </div>
                      {/* شريط تقدم صغير (Progress Bar) */}
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full mx-auto mt-2 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            student.exams_average >= 90 ? 'bg-emerald-500' :
                            student.exams_average >= 75 ? 'bg-indigo-500' :
                            student.exams_average >= 50 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${student.exams_average}%` }}
                        />
                      </div>
                    </td>

                    <td className="px-8 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest border ${
                        student.performance_status === 'excellent' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        student.performance_status === 'good' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        student.performance_status === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {student.performance_status === 'excellent' && <CheckCircle2 size={14} />}
                        {student.performance_status === 'good' && <TrendingUp size={14} />}
                        {student.performance_status === 'warning' && <MinusCircle size={14} />}
                        {student.performance_status === 'danger' && <AlertTriangle size={14} />}
                        
                        {student.performance_status === 'excellent' ? 'ممتاز' :
                         student.performance_status === 'good' ? 'جيد' :
                         student.performance_status === 'warning' ? 'يحتاج متابعة' : 'ضعيف'}
                      </span>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-4 text-slate-400">
                      <Users size={48} className="opacity-20" />
                      <p className="font-bold text-lg">لا توجد بيانات مسجلة أو لا يوجد طلاب مطابقين للبحث.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

