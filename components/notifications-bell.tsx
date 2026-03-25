'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, CheckCircle2, MessageSquare, BookOpen, FileText, Info, AlertTriangle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications, NotificationType } from '@/context/notification-context';
import Link from 'next/link';

const getIcon = (type: NotificationType) => {
  switch (type) {
    case 'exam': return <FileText className="h-4 w-4 text-indigo-600" />;
    case 'assignment': return <BookOpen className="h-4 w-4 text-amber-600" />;
    case 'attendance': return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    case 'message': return <MessageSquare className="h-4 w-4 text-sky-600" />;
    case 'announcement': return <Bell className="h-4 w-4 text-rose-600" />;
    default: return <Info className="h-4 w-4 text-slate-600" />;
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

export function NotificationsBell() {
  const context = useNotifications();
  const notifications = context?.notifications || [];
  const unreadCount = context?.unreadCount || 0;
  const markAsRead = context?.markAsRead || (async () => {});
  const markAllAsRead = context?.markAllAsRead || (async () => {});
  const deleteNotification = context?.deleteNotification || (async () => {});
  const loading = context?.loading || false;
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-white shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <Bell className="h-5 w-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute left-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 z-50 overflow-hidden origin-top-left"
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900">الإشعارات</h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
                  >
                    تحديد الكل كمقروء
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mx-auto"></div>
                </div>
              ) : notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 flex gap-4 hover:bg-slate-50 transition-colors relative group ${!notification.is_read ? 'bg-indigo-50/20' : ''}`}
                  >
                    <div className={`h-10 w-10 rounded-xl flex-shrink-0 flex items-center justify-center ${getBgColor(notification.type)}`}>
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className={`text-sm font-bold truncate ${!notification.is_read ? 'text-slate-900' : 'text-slate-600'}`}>
                          {notification.title}
                        </p>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                          {new Date(notification.created_at).toLocaleDateString('ar-SA')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {notification.content}
                      </p>
                      {notification.link && (
                        <Link
                          href={notification.link}
                          onClick={() => {
                            markAsRead(notification.id);
                            setIsOpen(false);
                          }}
                          className="inline-block mt-2 text-[10px] font-bold text-indigo-600 hover:underline"
                        >
                          عرض التفاصيل
                        </Link>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-1 rounded-md bg-white shadow-sm ring-1 ring-slate-200 text-indigo-600 hover:bg-indigo-50"
                          title="تحديد كمقروء"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-1 rounded-md bg-white shadow-sm ring-1 ring-slate-200 text-rose-600 hover:bg-rose-50"
                        title="حذف"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <Bell className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-sm">لا توجد إشعارات حالياً</p>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 text-center">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
              >
                عرض كافة الإشعارات
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
