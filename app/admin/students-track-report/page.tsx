"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "motion/react";
import { FileText, Download, Search, BookOpen, GraduationCap } from "lucide-react";

interface StudentTrack {
  id: string;
  national_id: string;
  full_name: string;
  section_name: string;
  class_name: string;
  track: "scientific" | "literary" | null;
  selection_date: string | null;
}

export default function StudentsTrackReportPage() {
  const [students, setStudents] = useState<StudentTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTrack, setFilterTrack] = useState<"all" | "scientific" | "literary" | "none">("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("students")
        .select(`
          id,
          national_id,
          next_year_track,
          track_selection_date,
          users(full_name),
          sections(name, classes(name))
        `)
        .order('track_selection_date', { ascending: false, nullsFirst: false });

      if (error) throw error;

      const formattedData: StudentTrack[] = (data || []).map((s: any) => ({
        id: s.id,
        national_id: s.national_id,
        full_name: s.users?.full_name || "غير محدد",
        section_name: s.sections?.name || "غير محدد",
        class_name: s.sections?.classes?.name || "غير محدد",
        track: s.next_year_track,
        selection_date: s.track_selection_date
      }));

      setStudents(formattedData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    window.print();
  };

  const filtered = students.filter(s => {
    const matchesSearch = s.full_name.includes(search) || s.national_id.includes(search);
    const matchesTrack = 
      filterTrack === "all" ? true :
      filterTrack === "none" ? !s.track :
      s.track === filterTrack;
    return matchesSearch && matchesTrack;
  });

  const scientificCount = students.filter(s => s.track === "scientific").length;
  const literaryCount = students.filter(s => s.track === "literary").length;
  const noneCount = students.filter(s => !s.track).length;

  return (
    <>
      <div className="space-y-8 pb-20 max-w-7xl mx-auto print:hidden">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 mb-3">
              <GraduationCap className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">تقرير المسارات</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">تقرير المسار الأكاديمي للطلبة</h1>
            <p className="text-slate-500 mt-1 font-medium">
              متابعة اختيارات الطلبة للمسار العلمي والأدبي للعام القادم
            </p>
          </div>

          <button
            onClick={generatePDF}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200"
          >
            <Download className="h-5 w-5" />
            تصدير PDF
          </button>
        </div>

        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-3xl border border-blue-100 bg-blue-50/50">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 mb-1">المسار العلمي</p>
                <p className="text-3xl font-black text-slate-900">{scientificCount}</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-6 rounded-3xl border border-emerald-100 bg-emerald-50/50">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 mb-1">المسار الأدبي</p>
                <p className="text-3xl font-black text-slate-900">{literaryCount}</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-6 rounded-3xl border border-slate-200 bg-slate-50">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-slate-200 flex items-center justify-center">
                <FileText className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 mb-1">لم يحدد بعد</p>
                <p className="text-3xl font-black text-slate-900">{noneCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* فلاتر */}
        <div className="glass-card p-6 rounded-3xl flex flex-col sm:flex-row gap-6 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="بحث باسم الطالب أو الرقم الوطني..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-4 pr-12 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-600 transition-all"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            <button
              onClick={() => setFilterTrack("all")}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${filterTrack === "all" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilterTrack("scientific")}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${filterTrack === "scientific" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}
            >
              علمي
            </button>
            <button
              onClick={() => setFilterTrack("literary")}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${filterTrack === "literary" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"}`}
            >
              أدبي
            </button>
            <button
              onClick={() => setFilterTrack("none")}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${filterTrack === "none" ? "bg-slate-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              لم يحدد
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-5 text-sm font-black text-slate-900">اسم الطالب</th>
                  <th className="px-6 py-5 text-sm font-black text-slate-900">الرقم الوطني</th>
                  <th className="px-6 py-5 text-sm font-black text-slate-900">الصف والشعبة</th>
                  <th className="px-6 py-5 text-sm font-black text-slate-900">المسار المختار</th>
                  <th className="px-6 py-5 text-sm font-black text-slate-900">تاريخ الاختيار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="inline-flex items-center justify-center gap-3 text-slate-500 font-bold">
                        <div className="h-5 w-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
                        جاري تحميل البيانات...
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-bold">
                      لا يوجد بيانات مطابقة للبحث
                    </td>
                  </tr>
                ) : (
                  filtered.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-900">{student.full_name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-500">{student.national_id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-700">{student.class_name} - {student.section_name}</span>
                      </td>
                      <td className="px-6 py-4">
                        {student.track === "scientific" ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-100">
                            علمي
                          </span>
                        ) : student.track === "literary" ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-100">
                            أدبي
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-500 border border-slate-200">
                            لم يحدد
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-500">
                          {student.selection_date ? new Date(student.selection_date).toLocaleDateString('ar-SA') : "-"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* واجهة الطباعة */}
      <div className="hidden print:block" dir="rtl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black mb-2">تقرير المسار الأكاديمي للطلبة</h1>
          <p className="text-gray-500">تاريخ التقرير: {new Date().toLocaleDateString('ar-SA')}</p>
        </div>
        
        <div className="flex gap-8 justify-center mb-8 font-bold">
          <div>علمي: {scientificCount}</div>
          <div>أدبي: {literaryCount}</div>
          <div>لم يحدد: {noneCount}</div>
        </div>

        <table className="w-full border-collapse border border-gray-300 text-right text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2">اسم الطالب</th>
              <th className="border border-gray-300 p-2">الرقم الوطني</th>
              <th className="border border-gray-300 p-2">الصف والشعبة</th>
              <th className="border border-gray-300 p-2">المسار</th>
              <th className="border border-gray-300 p-2">تاريخ الاختيار</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(student => (
              <tr key={student.id}>
                <td className="border border-gray-300 p-2">{student.full_name}</td>
                <td className="border border-gray-300 p-2">{student.national_id}</td>
                <td className="border border-gray-300 p-2">{student.class_name} - {student.section_name}</td>
                <td className="border border-gray-300 p-2">
                  {student.track === "scientific" ? "علمي" : student.track === "literary" ? "أدبي" : "لم يحدد"}
                </td>
                <td className="border border-gray-300 p-2">
                  {student.selection_date ? new Date(student.selection_date).toLocaleDateString('ar-SA') : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
