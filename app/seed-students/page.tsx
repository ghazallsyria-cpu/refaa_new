'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Download } from 'lucide-react';

export default function SeedStudentsPage() {
  const [sql, setSql] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSql = async () => {
      try {
        const res = await fetch('/api/seed-students');
        const data = await res.json();
        if (data.sql) {
          setSql(data.sql);
        }
      } catch (error) {
        console.error('Failed to fetch SQL:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSql();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([sql], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'seed_students.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">استيراد بيانات الطلاب</h1>
        <p className="text-slate-500">قم بنسخ الكود التالي وتشغيله في Supabase SQL Editor لإضافة جميع الطلاب (430 طالب) وتوزيعهم على الفصول.</p>
        <p className="text-sm text-amber-600 mt-2">ملاحظة: اسم المستخدم سيكون الرقم المدني، وكلمة المرور الافتراضية هي 12345.</p>
      </div>

      <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden flex flex-col h-[70vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-medium text-slate-700">SQL Script</h3>
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              disabled={loading || !sql}
              className="inline-flex items-center gap-2 rounded-md bg-white border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              تحميل الملف
            </button>
            <button
              onClick={handleCopy}
              disabled={loading || !sql}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-100 disabled:opacity-50"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'تم النسخ!' : 'نسخ الكود'}
            </button>
          </div>
        </div>
        <div className="flex-1 p-4 bg-slate-950 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              جاري تحميل الكود...
            </div>
          ) : (
            <pre className="text-sm text-emerald-400 font-mono whitespace-pre-wrap" dir="ltr">
              {sql}
            </pre>
          )}
        </div>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
        <h4 className="text-blue-800 font-semibold mb-2">تعليمات الاستخدام:</h4>
        <ol className="list-decimal list-inside text-blue-700 space-y-1 text-sm">
          <li>انسخ الكود أعلاه بالضغط على زر &quot;نسخ الكود&quot; أو قم بتحميل الملف.</li>
          <li>اذهب إلى لوحة تحكم Supabase الخاصة بك.</li>
          <li>اختر <strong>SQL Editor</strong> من القائمة الجانبية.</li>
          <li>قم بإنشاء استعلام جديد (New Query) والصق الكود فيه.</li>
          <li>اضغط على <strong>Run</strong> لتنفيذ الكود.</li>
          <li>بعد الانتهاء، ستجد أن جميع الطلاب قد تمت إضافتهم بنجاح.</li>
        </ol>
      </div>
    </div>
  );
}
