"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion"; // 🚀 تصحيح الاستيراد لمنع أخطاء البناء
import { FileText, Download, Search, BookOpen, GraduationCap, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context"; // 🚀 إضافة فحص الصلاحيات
import Link from "next/link";

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
  const { authRole, isChecking } = useAuth(); // 🚀 حماية الصفحة
  const [students, setStudents] = useState<StudentTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTrack, setFilterTrack] = useState<"all" | "scientific" | "literary" | "none">("all");

  useEffect(() => {
    if (authRole === 'admin' || authRole === 'management') {
      fetchData();
    }
  }, [authRole]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 🚀 استعلام سليم وممتاز، لا يسبب ضغطاً على قاعدة البيانات
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

  if (isChecking) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="w-12 h-12 text-indigo-600 animate-spin" /></div>;
  }

  // 🚀 منع الدخول غير المصرح به
  if (authRole !== 'admin' && authRole !== 'management') {
    return <div className="p-10 text-center font-bold text-rose-600">هذه الصفحة مخصصة لفريق الإدارة فقط.</div>;
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-20 max-w-7xl mx-auto px-4 pt-8 print:hidden" dir="rtl">
        
        {/* 🚀 زر العودة */}
        <div className="no-print mb-6">
          <Link href="/dashboard/admin" className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-slate-100 transition-all w-fit group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> العودة للوحة الإدارة
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 mb-3 shadow-inner">
              <GraduationCap className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">تقرير المسارات</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">تقرير المسار الأكاديمي للطلبة</h1>
            <p className="text-slate-500 mt-2 font-medium text-lg">
              متابعة اختيارات الطلبة للمسار العلمي والأدبي للعام القادم
            </p>
          </div>

          <button
            onClick={generatePDF}
            className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-[1.5rem] bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95 shrink-0"
          >
            <Download className="h-5 w-5" />
            تصدير PDF
          </button>
        </div>

        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-3xl border border-blue-100 bg-blue-50/50 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-blue-100 flex items-center justify-center border border-blue-200 shadow-inner">
                <BookOpen className="h-7 w-7 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 mb-1">المسار العلمي</p>
                <p className="text-3xl font-black text-slate-900">{scientificCount}</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-6 rounded-3xl border border-emerald-100 bg-emerald-50/50 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center border border-emerald-200 shadow-inner">
                <BookOpen className="h-7 w-7 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 mb-1">المسار الأدبي</p>
                <p className="text-3xl font-black text-slate-900">{literaryCount}</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-6 rounded-3xl border border-slate-200 bg-slate-50 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-slate-200 flex items-center justify-center border border-slate-300 shadow-inner">
                <FileText className="h-7 w-7 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 mb-1">لم يحدد بعد</p>
                <p className="text-3xl font-black text-slate-900">{noneCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* فلاتر */}
        <div className="glass-card p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-6 items-center justify-between bg-white">
          <div className="relative w-full sm:w-96">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="بحث باسم الطالب أو الرقم الوطني..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-4 pr-12 py-4 bg-slate-50 border border-slate-100 shadow-sm rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 transition-all outline-none"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 custom-scrollbar">
            <button
              onClick={() => setFilterTrack("all")}
              className={`px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${filterTrack === "all" ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"}`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilterTrack("scientific")}
              className={`px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${filterTrack === "scientific" ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"}`}
            >
              علمي
            </button>
            <button
              onClick={() => setFilterTrack("literary")}
              className={`px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${filterTrack === "literary" ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"}`}
            >
              أدبي
            </button>
            <button
              onClick={() => setFilterTrack("none")}
              className={`px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${filterTrack === "none" ? "bg-slate-700 text-white shadow-md shadow-slate-300" : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"}`}
            >
              لم يحدد
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="glass-card rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-white">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-5 text-sm font-black text-slate-500 uppercase tracking-widest">اسم الطالب</th>
                  <th className="px-6 py-5 text-sm font-black text-slate-500 uppercase tracking-widest">الرقم الوطني</th>
                  <th className="px-6 py-5 text-sm font-black text-slate-500 uppercase tracking-widest">الصف والشعبة</th>
                  <th className="px-6 py-5 text-sm font-black text-slate-500 uppercase tracking-widest">المسار المختار</th>
                  <th className="px-6 py-5 text-sm font-black text-slate-500 uppercase tracking-widest">تاريخ الاختيار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="inline-flex items-center justify-center gap-3 text-slate-500 font-bold">
                        <div className="h-6 w-6 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
                        جاري تحميل البيانات...
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-slate-500 font-bold bg-slate-50/50">
                      لا يوجد بيانات مطابقة للبحث أو الفلتر المختار
                    </td>
                  </tr>
                ) : (
                  filtered.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-slate-900">{student.full_name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-500">{student.national_id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{student.class_name} - {student.section_name}</span>
                      </td>
                      <td className="px-6 py-4">
                        {student.track === "scientific" ? (
                          <span className="inline-flex items-center px-4 py-1.5 rounded-xl text-xs font-black bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
                            علمي
                          </span>
                        ) : student.track === "literary" ? (
                          <span className="inline-flex items-center px-4 py-1.5 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                            أدبي
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-4 py-1.5 rounded-xl text-xs font-black bg-slate-100 text-slate-500 border border-slate-200 shadow-sm">
                            لم يحدد
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-500">
                          {student.selection_date ? new Date(student.selection_date).toLocaleDateString('ar-EG') : "—"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* واجهة الطباعة (تظهر فقط عند الطباعة PDF) */}
      <div className="hidden print:block font-cairo bg-white p-8" dir="rtl">
        <div className="text-center mb-10 border-b-2 border-slate-900 pb-6 relative">
          <div className="absolute top-0 right-0 text-right">
            <p className="text-[10px] font-bold text-slate-500">التاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
            <p className="text-[10px] font-bold text-slate-500 mt-1">الوقت: {new Date().toLocaleTimeString('ar-EG')}</p>
          </div>
          <h1 className="text-3xl font-black mb-2 text-slate-900 tracking-tight">مدرسة الرفعة النموذجية</h1>
          <h2 className="text-xl font-bold text-slate-700 bg-slate-50 inline-block px-6 py-2 rounded-xl border border-slate-200 mt-2">التقرير المعتمد لمسارات الطلبة (علمي / أدبي)</h2>
        </div>
        
        <div className="flex gap-8 justify-center mb-8 font-black text-sm bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="text-blue-700">علمي: {scientificCount}</div>
          <div className="text-emerald-700">أدبي: {literaryCount}</div>
          <div className="text-slate-600">لم يحدد: {noneCount}</div>
        </div>

        <table className="w-full border-collapse border border-slate-300 text-right text-sm">
          <thead>
            <tr className="bg-slate-100 text-slate-800">
              <th className="border border-slate-300 p-3 font-black">م</th>
              <th className="border border-slate-300 p-3 font-black">اسم الطالب</th>
              <th className="border border-slate-300 p-3 font-black">الرقم الوطني</th>
              <th className="border border-slate-300 p-3 font-black">الصف والشعبة</th>
              <th className="border border-slate-300 p-3 font-black">المسار</th>
              <th className="border border-slate-300 p-3 font-black">تاريخ الاختيار</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((student, i) => (
              <tr key={student.id} className="odd:bg-white even:bg-slate-50">
                <td className="border border-slate-300 p-2 text-center font-bold text-slate-500">{i + 1}</td>
                <td className="border border-slate-300 p-2 font-black text-slate-900">{student.full_name}</td>
                <td className="border border-slate-300 p-2 text-slate-700">{student.national_id}</td>
                <td className="border border-slate-300 p-2 text-slate-700">{student.class_name} - {student.section_name}</td>
                <td className="border border-slate-300 p-2 font-bold text-slate-800">
                  {student.track === "scientific" ? "علمي" : student.track === "literary" ? "أدبي" : "—"}
                </td>
                <td className="border border-slate-300 p-2 text-slate-600">
                  {student.selection_date ? new Date(student.selection_date).toLocaleDateString('ar-EG') : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="flex justify-between items-end w-full border-t-2 border-slate-100 pt-10 mt-10">
          <div className="text-center"><p className="font-bold text-slate-800 mb-10">توقيع التوجيه الأكاديمي</p><div className="border-t-2 border-slate-400 w-48 mx-auto"></div></div>
          <div className="text-center"><p className="font-bold text-slate-800 mb-10">توقيع مدير المدرسة</p><div className="border-t-2 border-slate-400 w-48 mx-auto"></div></div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </>
  );
}
