'use client';
import { useState } from 'react';
import { useGradebook } from '@/hooks/useGradebook';
import { BookOpen, Download, Search } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function GradebookPage() {
  const { loading, data, sections } = useGradebook();
  const [search, setSearch] = useState('');

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "نتائج الطلاب");
    XLSX.writeFile(wb, "سجل_الاداء.xlsx");
  };

  if (loading) return <div className="p-10 text-center">جاري تحميل سجل الأداء...</div>;

  return (
    <div className="p-8 space-y-8" dir="rtl">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm">
        <h1 className="text-2xl font-black flex items-center gap-3"><BookOpen className="text-indigo-600" /> سجل أداء الطلاب (دفتر الأعمال)</h1>
        <button onClick={exportExcel} className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2"><Download size={18} /> تصدير Excel</button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-100">
        <table className="w-full text-right">
          <thead className="bg-slate-50 text-slate-500 text-xs font-black uppercase">
            <tr>
              <th className="p-5">اسم الطالب</th>
              <th className="p-5">الفصل</th>
              <th className="p-5">المعدل العام</th>
              <th className="p-5">التقييم</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.filter(s => s.name.includes(search)).map((student) => (
              <tr key={student.id} className="hover:bg-slate-50 transition-all">
                <td className="p-5 font-bold">{student.name}</td>
                <td className="p-5 text-slate-500">{student.section}</td>
                <td className="p-5 text-indigo-600 font-black">{student.average}%</td>
                <td className="p-5">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${student.average >= 50 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{student.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

