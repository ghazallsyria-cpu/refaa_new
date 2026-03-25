'use client';

import { useState } from 'react';

export default function SetupStudentsPage() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs((prev) => [...prev, msg]);

  const setupStudents = async () => {
    setLoading(true);
    setLogs([]);
    addLog('بدء عملية تهيئة الطلاب...');

    try {
      const response = await fetch('/api/admin/setup-students', {
        method: 'POST',
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(`استجابة غير متوقعة من الخادم (${response.status}): ${text.substring(0, 100)}...`);
      }

      if (!response.ok) {
        console.error('API Error Response:', data);
        const error = new Error(data.error || JSON.stringify(data) || 'حدث خطأ غير معروف.');
        (error as any).logs = data.logs;
        throw error;
      }

      addLog(data.message);
      data.logs.forEach((log: string) => addLog(log));
      addLog('اكتملت العملية بنجاح.');
    } catch (err: any) {
      addLog(`خطأ عام: ${err.message}`);
      if (err.logs && Array.isArray(err.logs)) {
        err.logs.forEach((log: string) => addLog(log));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8" dir="rtl">
      <h1 className="text-2xl font-bold mb-4">تهيئة حسابات الطلاب</h1>
      <button
        onClick={setupStudents}
        disabled={loading}
        className="bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'جاري المعالجة...' : 'بدء تهيئة الطلاب'}
      </button>

      <div className="mt-6 bg-slate-900 text-slate-100 p-4 rounded h-96 overflow-y-auto font-mono text-sm">
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>
    </div>
  );
}
