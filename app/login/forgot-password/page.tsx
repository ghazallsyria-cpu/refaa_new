'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { School, User, ArrowRight } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [civilId, setCivilId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // 1. Look up email
      let authEmail = '';
      
      // Check students
      const { data: studentData } = await supabase
        .from('students')
        .select('users!inner(email)')
        .eq('national_id', civilId)
        .single();
        
      if (studentData && studentData.users) {
        authEmail = (studentData.users as any).email;
      } else {
        // Check teachers
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('users!inner(email)')
          .eq('national_id', civilId)
          .single();
          
        if (teacherData && teacherData.users) {
          authEmail = (teacherData.users as any).email;
        } else {
          // Check parents
          const { data: parentData } = await supabase
            .from('parents')
            .select('users!inner(email)')
            .eq('national_id', civilId)
            .single();
            
          if (parentData && parentData.users) {
            authEmail = (parentData.users as any).email;
          }
        }
      }

      if (!authEmail) {
        throw new Error('لم يتم العثور على حساب مرتبط بهذا الرقم المدني');
      }

      // 2. Trigger reset
      const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
        redirectTo: `${window.location.origin}/login/update-password`,
      });

      if (error) throw error;
      
      setMessage('تم إرسال رابط إعادة تعيين كلمة المرور إلى البريد الإلكتروني المرتبط بحسابك.');
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء محاولة إعادة تعيين كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-1 flex-col justify-center px-6 py-12 lg:px-8 bg-slate-50" dir="rtl">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-indigo-600 shadow-lg">
            <School className="h-10 w-10 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-slate-900">
          استعادة كلمة المرور
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form className="space-y-6 bg-white p-8 rounded-xl shadow-sm ring-1 ring-slate-200" onSubmit={handleReset}>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {message && <div className="text-green-600 text-sm">{message}</div>}
          
          <div>
            <label htmlFor="civilId" className="block text-sm font-medium leading-6 text-slate-900">
              الرقم المدني
            </label>
            <div className="mt-2 relative">
              <input
                id="civilId"
                type="text"
                required
                value={civilId}
                onChange={(e) => setCivilId(e.target.value)}
                className="block w-full rounded-md border-0 py-2.5 pr-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                placeholder="أدخل الرقم المدني"
                dir="ltr"
                style={{ textAlign: 'right' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
          </button>
          
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="mt-4 flex w-full justify-center rounded-md bg-white px-3 py-2.5 text-sm font-semibold leading-6 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
          >
            العودة لتسجيل الدخول
          </button>
        </form>
      </div>
    </div>
  );
}
