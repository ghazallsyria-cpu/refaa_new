'use client';

import React from 'react';
import { useNotifications, NotificationType } from '@/context/notification-context';
import { Bell, CheckCircle2, MessageSquare, BookOpen, FileText, Info, Trash2, Check, Filter } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';

const getIcon = (type: NotificationType) => {
  switch (type) {
    case 'exam': return <FileText className="h-5 w-5 text-indigo-600" />;
    case 'assignment': return <BookOpen className="h-5 w-5 text-amber-600" />;
    case 'attendance': return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
    case 'message': return <MessageSquare className="h-5 w-5 text-sky-600" />;
    case 'announcement': return <Bell className="h-5 w-5 text-rose-600" />;
    default: return <Info className="h-5 w-5 text-slate-600" />;
  }
};

const getBgColor = (type: NotificationType) => {
  switch (type) {
    case 'exam': return 'bg-indigo-50';
    case 'assignment': return 'bg-amber-50';
    case 'attendance': return 'bg-emerald-50';
    case 'message': return 'bg-sky-50';
    case 'announcement': return 'bg-rose-50';
    default: return 'bg-slate-50';
  }
};

export default function NotificationsPage() {
  const context = useNotifications();
  const notifications = context?.notifications || [];
  const markAsRead = context?.markAsRead || (async () => {});
  const markAllAsRead = context?.markAllAsRead || (async () => {});
  const deleteNotification = context?.deleteNotification || (async () => {});
  const loading = context?.loading || false;
  const [filter, setFilter] = React.useState<NotificationType | 'all'>('all');

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === filter);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">مركز الإشعارات</h1>
          <p className="text-slate-500 mt-1">تابع آخر التحديثات والأنشطة في مدرستك</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 bg-white ring-1 ring-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            <Check className="h-4 w-4" />
            تحديد الكل كمقروء
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${filter === 'all' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
          >
            الكل
          </button>
          {(['announcement', 'exam', 'assignment', 'attendance', 'message'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${filter === type ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
            >
              {type === 'announcement' ? 'إعلانات' : 
               type === 'exam' ? 'اختبارات' : 
               type === 'assignment' ? 'واجبات' : 
               type === 'attendance' ? 'حضور' : 'رسائل'}
            </button>
          ))}
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-20 text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto"></div>
              <p className="mt-4 text-slate-500 font-medium">جاري تحميل الإشعارات...</p>
            </div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification, index) => (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                key={notification.id}
                className={`p-6 flex gap-6 hover:bg-slate-50/80 transition-all relative group ${!notification.is_read ? 'bg-indigo-50/30' : ''}`}
              >
                <div className={`h-12 w-12 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-sm ${getBgColor(notification.type)}`}>
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                    <h3 className={`text-lg font-bold ${!notification.is_read ? 'text-slate-900' : 'text-slate-700'}`}>
                      {notification.title}
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">
                      {new Date(notification.created_at).toLocaleString('ar-SA', {
                        dateStyle: 'long',
                        timeStyle: 'short'
                      })}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    {notification.content}
                  </p>
                  <div className="flex items-center gap-4">
                    {notification.link && (
                      <Link
                        href={notification.link}
                        onClick={() => markAsRead(notification.id)}
                        className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                      >
                        عرض التفاصيل
                      </Link>
                    )}
                    {!notification.is_read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-xs font-bold text-indigo-600 hover:underline"
                      >
                        تحديد كمقروء
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-2 rounded-xl bg-white shadow-sm ring-1 ring-slate-200 text-rose-600 hover:bg-rose-50 transition-colors"
                    title="حذف الإشعار"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="p-20 text-center">
              <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
                <Bell className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">لا توجد إشعارات</h3>
              <p className="text-slate-500">عندما تصلك إشعارات جديدة ستظهر هنا</p>
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="mt-6 text-indigo-600 font-bold hover:underline"
                >
                  عرض جميع الإشعارات
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
