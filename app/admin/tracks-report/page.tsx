'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  GraduationCap, 
  School, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileText,
  UserCheck,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

// مساعد لتنسيق الفئات
const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

const stats = [
  { label: 'إجمالي الطلاب', value: '1,250', icon: Users, change: '+12%', trending: 'up', color: 'bg-blue-500' },
  { label: 'المعلمون النشطون', value: '84', icon: GraduationCap, change: '+3%', trending: 'up', color: 'bg-emerald-500' },
  { label: 'الفصول الدراسية', value: '42', icon: School, change: '0%', trending: 'neutral', color: 'bg-violet-500' },
  { label: 'متوسط الحضور اليومي', value: '94%', icon: UserCheck, change: '-2%', trending: 'down', color: 'bg-amber-500' },
];

const recentActivities = [
  { id: 1, user: 'أحمد علي', action: 'أضاف تقييم جديد للفصل العاشر', time: 'منذ 5 دقائق', type: 'update' },
  { id: 2, user: 'سارة محمود', action: 'قامت بتحديث سجل الحضور', time: 'منذ 12 دقيقة', type: 'check' },
  { id: 3, user: 'النظام', action: 'تم تصدير تقرير الأداء الشهري', time: 'منذ ساعة', type: 'report' },
  { id: 4, user: 'خالد عمر', action: 'طلب إجازة طارئة', time: 'منذ ساعتين', type: 'alert' },
];

export default function AdminDashboard() {
  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">لوحة تحكم الإدارة</h1>
          <p className="text-slate-500 mt-1 text-sm">مرحباً بك مجدداً، إليك نظرة عامة على أداء المدرسة اليوم.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
            تحميل التقارير
          </button>
          <button className="px-4 py-2 bg-indigo-600 rounded-xl text-sm font-bold text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
            إضافة مستخدم جديد
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-3 rounded-xl text-white", stat.color)}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg",
                stat.trending === 'up' ? "text-emerald-600 bg-emerald-50" : 
                stat.trending === 'down' ? "text-rose-600 bg-rose-50" : "text-slate-500 bg-slate-50"
              )}>
                {stat.trending === 'up' ? <ArrowUpRight className="h-3 w-3" /> : 
                 stat.trending === 'down' ? <ArrowDownRight className="h-3 w-3" /> : null}
                {stat.change}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Attendance Chart Mockup / Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-black text-slate-900">متابعة الحضور الأسبوعية</h3>
            <select className="text-xs font-bold border-slate-200 rounded-lg bg-slate-50 px-2 py-1 outline-none">
              <option>آخر 7 أيام</option>
              <option>آخر 30 يوم</option>
            </select>
          </div>
          <div className="p-6 h-[300px] flex items-end justify-between gap-2">
            {[65, 80, 45, 90, 70, 85, 95].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div 
                  className="w-full bg-indigo-100 group-hover:bg-indigo-500 transition-all rounded-t-lg relative"
                  style={{ height: `${height}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    {height}%
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-400">يوم {i+1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-black text-slate-900 mb-6">آخر النشاطات</h3>
          <div className="space-y-6">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex gap-4 relative">
                <div className="shrink-0 z-10">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm",
                    activity.type === 'update' ? "bg-blue-100 text-blue-600" :
                    activity.type === 'check' ? "bg-emerald-100 text-emerald-600" :
                    activity.type === 'report' ? "bg-violet-100 text-violet-600" : "bg-rose-100 text-rose-600"
                  )}>
                    {activity.type === 'update' ? <PenTool className="h-4 w-4" /> :
                     activity.type === 'check' ? <CheckCircle2 className="h-4 w-4" /> :
                     activity.type === 'report' ? <FileText className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-bold text-slate-900">{activity.user}</p>
                  <p className="text-xs text-slate-500">{activity.action}</p>
                  <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {activity.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-3 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all">
            عرض كل السجلات
          </button>
        </div>
      </div>

      {/* Teachers Summary Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
          <h3 className="font-black text-slate-900">حالة المعلمين الحالية</h3>
          <button className="text-indigo-600 text-sm font-bold hover:underline">عرض الكل</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">المعلم</th>
                <th className="px-6 py-4">المادة</th>
                <th className="px-6 py-4">الحالة</th>
                <th className="px-6 py-4">آخر تسجيل دخول</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[
                { name: 'د. عبدالله خالد', subject: 'الفيزياء', status: 'نشط', lastSeen: 'الآن' },
                { name: 'أ. مريم سعيد', subject: 'اللغة العربية', status: 'في حصة', lastSeen: 'منذ 10 د' },
                { name: 'أ. عمر يوسف', subject: 'الرياضيات', status: 'غائب', lastSeen: 'أمس' },
              ].map((teacher, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-200" />
                    <span className="text-sm font-bold text-slate-700">{teacher.name}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{teacher.subject}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold",
                      teacher.status === 'نشط' ? "bg-emerald-50 text-emerald-600" :
                      teacher.status === 'في حصة' ? "bg-blue-50 text-blue-600" : "bg-rose-50 text-rose-600"
                    )}>
                      {teacher.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">{teacher.lastSeen}</td>
                  <td className="px-6 py-4 text-left">
                    <button className="text-slate-400 hover:text-slate-600"><MoreVertical className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
