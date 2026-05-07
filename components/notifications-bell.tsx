'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, CheckCircle2, MessageSquare, BookOpen, FileText, Info, AlertTriangle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// استدعاء السياق (Context) الذي يدير الإشعارات الحية في النظام بأكمله
import { useNotifications, NotificationType } from '@/context/notification-context';
import Link from 'next/link';

// ==========================================
// 🎨 دوال التنسيق المساعدة (Helper Functions)
// ==========================================

// تحدد الأيقونة المناسبة بناءً على نوع الإشعار القادم من قاعدة البيانات
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

// تحدد لون الخلفية للأيقونة بناءً على نوع الإشعار
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
  // ==========================================
  // 🔌 جلب البيانات والدوال من الـ Context
  // ==========================================
  const context = useNotifications();
  const notifications = context?.notifications || []; // قائمة الإشعارات
  const unreadCount = context?.unreadCount || 0; // عدد الإشعارات غير المقروءة
  const markAsRead = context?.markAsRead || (async () => {}); // دالة تغيير الحالة لمقروء
  const markAllAsRead = context?.markAllAsRead || (async () => {}); // دالة تصفير العداد
  const deleteNotification = context?.deleteNotification || (async () => {}); // دالة حذف الإشعار
  const loading = context?.loading || false; // حالة التحميل المبدئي
  
  // ==========================================
  // 🎛️ حالات مكون الجرس (States)
  // ==========================================
  const [isOpen, setIsOpen] = useState(false); // هل القائمة المنسدلة مفتوحة؟
  const dropdownRef = useRef<HTMLDivElement>(null); // مرجع للقائمة لاكتشاف النقر خارجها

  // ==========================================
  // 🖱️ إغلاق القائمة عند النقر خارجها
  // ==========================================
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // إذا حدثت نقرة، ولم تكن هذه النقرة داخل عنصر الـ dropdown، أغلق القائمة
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    // العنصر الرئيسي المحتوي للزر والقائمة المنسدلة (Relative يسمح بتموضع القائمة داخله)
    <div className="relative" ref={dropdownRef}>
      
      {/* ==========================================
          🔔 زر الجرس الرئيسي 
          ========================================== */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-white shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <Bell className="h-5 w-5 text-slate-600" />
        
        {/* الشارة الحمراء (Badge) تظهر فقط إذا كان هناك إشعارات غير مقروءة */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ==========================================
          📜 القائمة المنسدلة للإشعارات (Dropdown)
          AnimatePresence يسمح بحركة سلسلة عند الإغلاق والفتح
          ========================================== */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute left-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 z-50 overflow-hidden origin-top-left"
          >
            
            {/* 🔝 هيدر القائمة */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900">الإشعارات</h3>
              <div className="flex gap-2">
                {/* زر "تحديد الكل كمقروء" (يختفي إذا كان العداد صفر) */}
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
                  >
                    تحديد الكل كمقروء
                  </button>
                )}
                {/* زر إغلاق القائمة */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* 📋 منطقة عرض الإشعارات (قابلة للتمرير Scrollable) */}
            <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
              
              {/* ⏳ الحالة الأولى: جاري التحميل */}
              {loading ? (
                <div className="p-8 text-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mx-auto"></div>
                </div>
              ) 
              
              /* 📬 الحالة الثانية: يوجد إشعارات */
              : notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    // إذا كان الإشعار غير مقروء، يتم تظليله بلون خفيف
                    className={`p-4 flex gap-4 hover:bg-slate-50 transition-colors relative group ${!notification.is_read ? 'bg-indigo-50/20' : ''}`}
                  >
                    {/* أيقونة نوع الإشعار */}
                    <div className={`h-10 w-10 rounded-xl flex-shrink-0 flex items-center justify-center ${getBgColor(notification.type)}`}>
                      {getIcon(notification.type)}
                    </div>
                    
                    {/* محتوى الإشعار */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        {/* عنوان الإشعار */}
                        <p className={`text-sm font-bold truncate ${!notification.is_read ? 'text-slate-900' : 'text-slate-600'}`}>
                          {notification.title}
                        </p>
                        {/* تاريخ الإشعار */}
                        <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                          {new Date(notification.created_at).toLocaleDateString('ar-SA')}
                        </span>
                      </div>
                      
                      {/* نص الإشعار التفصيلي (بحد أقصى سطرين) */}
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {notification.content}
                      </p>
                      
                      {/* زر "عرض التفاصيل" يظهر فقط إذا كان للإشعار رابط توجيه */}
                      {notification.link && (
                        <Link
                          href={notification.link}
                          onClick={() => {
                            // عند النقر، نجعل الإشعار مقروءاً ونغلق القائمة
                            markAsRead(notification.id);
                            setIsOpen(false);
                          }}
                          className="inline-block mt-2 text-[10px] font-bold text-indigo-600 hover:underline"
                        >
                          عرض التفاصيل
                        </Link>
                      )}
                    </div>
                    
                    {/* ⚙️ أدوات التحكم المخفية (تظهر عند الـ Hover) */}
                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* زر "تحديد كمقروء" يظهر فقط للإشعارات غير المقروءة */}
                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-1 rounded-md bg-white shadow-sm ring-1 ring-slate-200 text-indigo-600 hover:bg-indigo-50"
                          title="تحديد كمقروء"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                        </button>
                      )}
                      {/* زر الحذف الدائم للإشعار */}
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
              ) 
              
              /* 📭 الحالة الثالثة: لا توجد إشعارات */
              : (
                <div className="p-12 text-center">
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <Bell className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-sm">لا توجد إشعارات حالياً</p>
                </div>
              )}
            </div>

            {/* 🔗 ذيل القائمة (Footer) يذهب للمستخدم لصفحة الأرشيف الكاملة */}
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
