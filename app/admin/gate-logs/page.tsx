// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Loader2, Calendar, Search, Filter, 
  CheckCircle2, XCircle, Clock, LogOut, RefreshCcw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function GateLogsPage() {
  const { authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('school_gate_attendance')
        .select(`
          *,
          users!school_gate_attendance_user_id_fkey(full_name, avatar_url, national_id),
          students:users!school_gate_attendance_user_id_fkey(
             students(sections(name, classes(name)))
          ),
          scanned_by_user:users!school_gate_attendance_scanned_by_fkey(full_name)
        `)
        .eq('date', selectedDate)
        .order('scanned_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (['admin', 'management', 'staff'].includes(currentRole)) {
      fetchLogs();
    }
  }, [currentRole, selectedDate]);

  const filteredLogs = logs.filter(log => {
    const matchStatus = filterStatus === 'all' ? true : 
                        filterStatus === 'early_exit' ? log.scan_type === 'exit' : 
                        log.status === filterStatus && log.scan_type === 'entry';
    const matchSearch = searchTerm ? log.users?.full_name?.includes(searchTerm) || log.users?.national_id?.includes(searchTerm) : true;
    return matchStatus && matchSearch;
  });

  const getStatusBadge = (status: string, scanType: string) => {
    if (scanType === 'exit') return <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 w-fit"><LogOut className="w-3 h-3"/> خروج مبكر</span>;
    switch (status) {
      case 'present': return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3"/> حضور مبكر</span>;
      case 'late': return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 w-fit"><Clock className="w-3 h-3"/> متأخر</span>;
      case 'absent': return <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 w-fit"><XCircle className="w-3 h-3"/> غائب</span>;
      case 'excused': return <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 w-fit"><ShieldCheck className="w-3 h-3"/> مستأذن</span>;
      default: return <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-black w-fit">غير معروف</span>;
    }
  };

  if (!['admin', 'management', 'staff'].includes(currentRole)) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-10 font-cairo pb-20" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* الهيدر والفلاتر */}
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-100 pb-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                <ShieldCheck className="w-8 h-8 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-1">سجل الحرم المدرسي</h1>
                <p className="text-slate-500 font-bold text-sm">مراقبة حية لحركة الدخول والخروج من البوابات.</p>
              </div>
            </div>
            
            <button onClick={fetchLogs} className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl transition-all flex items-center gap-2">
              <RefreshCcw className={cn("w-5 h-5", isLoading && "animate-spin")} /> تحديث السجل
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
             <div className="relative">
                <label className="text-xs font-black text-slate-500 mb-1 block">تاريخ السجل</label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500" />
                </div>
             </div>
             <div className="relative">
                <label className="text-xs font-black text-slate-500 mb-1 block">تصفية حسب الحالة</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500">
                   <option value="all">جميع الحركات</option>
                   <option value="present">حضور في الوقت</option>
                   <option value="late">تأخير</option>
                   <option value="early_exit">خروج مبكر</option>
                   <option value="absent">غياب (عبر المكنسة)</option>
                </select>
             </div>
             <div className="relative">
                <label className="text-xs font-black text-slate-500 mb-1 block">بحث (اسم أو رقم مدني)</label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" placeholder="اكتب للبحث..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500" />
                </div>
             </div>
          </div>
        </div>

        {/* عرض البيانات */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
           <div className="overflow-x-auto">
              <table className="w-full text-right">
                 <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                       <th className="p-5 text-sm font-black text-slate-500">المستخدم</th>
                       <th className="p-5 text-sm font-black text-slate-500">الوصف / الصف</th>
                       <th className="p-5 text-sm font-black text-slate-500">الحالة</th>
                       <th className="p-5 text-sm font-black text-slate-500">الوقت</th>
                       <th className="p-5 text-sm font-black text-slate-500">ملاحظات المسح</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                       <tr><td colSpan={5} className="p-10 text-center text-slate-400 font-bold">جاري تحميل السجلات...</td></tr>
                    ) : filteredLogs.length === 0 ? (
                       <tr><td colSpan={5} className="p-10 text-center text-slate-400 font-bold">لا توجد حركات مسجلة تطابق بحثك.</td></tr>
                    ) : (
                       filteredLogs.map(log => {
                          const isStudent = log.user_role === 'student';
                          const studentInfo = Array.isArray(log.students?.students) ? log.students.students[0] : log.students?.students;
                          const title = isStudent ? `${studentInfo?.sections?.classes?.name || ''} - ${studentInfo?.sections?.name || ''}` : 'عضو هيئة تدريس/إداري';
                          
                          return (
                             <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-5">
                                   <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                                         {log.users?.avatar_url ? <img src={log.users.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-slate-400">{log.users?.full_name?.charAt(0)}</div>}
                                      </div>
                                      <div>
                                         <p className="font-black text-slate-800">{log.users?.full_name}</p>
                                         <p className="text-xs font-bold text-slate-400">{log.users?.national_id}</p>
                                      </div>
                                   </div>
                                </td>
                                <td className="p-5 text-sm font-bold text-slate-600">{title}</td>
                                <td className="p-5">{getStatusBadge(log.status, log.scan_type)}</td>
                                <td className="p-5">
                                   <p className="font-black text-slate-800">{format(new Date(log.scanned_at), 'hh:mm a')}</p>
                                   <p className="text-xs font-bold text-slate-400">بواسطة: {log.scanned_by_user?.full_name || 'النظام'}</p>
                                </td>
                                <td className="p-5 text-xs font-bold text-slate-500">
                                   {log.scan_type === 'exit' && log.escort_name ? (
                                     <span className="text-rose-600">المستلم: {log.escort_name} ({log.escort_relation})</span>
                                   ) : log.status === 'absent' ? 'تم الرصد عبر الإغلاق الآلي' : 'مسح البوابة الاعتيادي'}
                                </td>
                             </tr>
                          )
                       })
                    )}
                 </tbody>
              </table>
           </div>
        </div>

      </div>
    </div>
  );
}
