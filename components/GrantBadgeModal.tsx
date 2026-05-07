'use client';

import React, { useState, useEffect } from 'react';
// استخدام مكتبة Radix UI لبناء نوافذ منبثقة (Modals) يمكن الوصول إليها (Accessible) بسهولة
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, CheckCircle2, MessageSquare } from 'lucide-react';
import Image from 'next/image';
// استدعاء المحرك المخصص لإدارة نظام الأوسمة
import { useBadgesSystem } from '@/hooks/useBadgesSystem';

// ==========================================
// 📦 تعريف خصائص النافذة المنبثقة (Props)
// ==========================================
interface GrantBadgeModalProps {
  isOpen: boolean;           // هل النافذة مفتوحة الآن؟
  onClose: () => void;       // دالة إغلاق النافذة
  recipientId: string;       // معرّف (ID) الشخص الذي سيستلم الوسام (طالب أو معلم)
  recipientName: string;     // اسم المستلم (لعرضه في عنوان النافذة)
  granterId: string;         // معرّف (ID) الشخص الذي يمنح الوسام (المدير أو المعلم الحالي)
  onSuccess?: () => void;    // دالة اختيارية تُنفذ بعد نجاح المنح (مثل تحديث قائمة الأوسمة في صفحة الطالب)
}

export default function GrantBadgeModal({
  isOpen,
  onClose,
  recipientId,
  recipientName,
  granterId,
  onSuccess
}: GrantBadgeModalProps) {
  
  // ==========================================
  // ⚙️ استدعاء محرك الأوسمة (Engine)
  // ==========================================
  const { availableBadges, fetchAvailableBadges, grantBadge } = useBadgesSystem();
  
  // ==========================================
  // 🎛️ حالات مكون النافذة (States)
  // ==========================================
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null); // الوسام الذي نقر عليه المستخدم
  const [reason, setReason] = useState(''); // رسالة التهنئة أو سبب المنح (اختياري)
  const [isSubmitting, setIsSubmitting] = useState(false); // حالة التحميل أثناء الإرسال للسيرفر
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null); // رسائل النجاح أو الفشل المدمجة

  // ==========================================
  // ⚡ جلب الأوسمة المتاحة (Fetch Badges)
  // ==========================================
  // يشتغل هذا الـ Hook فقط عندما تفتح النافذة، وإذا كانت قائمة الأوسمة فارغة (لتجنب الجلب المتكرر)
  useEffect(() => {
    if (isOpen && availableBadges.length === 0) {
      fetchAvailableBadges();
    }
  }, [isOpen, fetchAvailableBadges, availableBadges.length]);

  // ==========================================
  // 🚀 دالة اعتماد ومنح الوسام (Grant Logic)
  // ==========================================
  const handleGrant = async () => {
    // 1. التحقق من اختيار وسام
    if (!selectedBadge) {
      setNotification({ type: 'error', message: 'يرجى اختيار وسام أولاً' });
      return;
    }

    // 2. بدء عملية الإرسال
    setIsSubmitting(true);
    setNotification(null);

    // 3. إرسال الطلب للسيرفر عبر المحرك المخصص
    const result = await grantBadge(recipientId, granterId, selectedBadge, reason);

    // 4. إنهاء حالة التحميل
    setIsSubmitting(false);

    // 5. معالجة النتيجة (نجاح أو فشل)
    if (result.success) {
      setNotification({ type: 'success', message: 'تم منح الوسام بنجاح!' });
      
      // إغلاق النافذة تلقائياً بعد ثانية ونصف لتجربة مستخدم ناعمة
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess(); // تحديث الصفحة الأم إن لزم الأمر
      }, 1500);
    } else {
      setNotification({ type: 'error', message: result.error || 'حدث خطأ أثناء منح الوسام' });
    }
  };

  return (
    // ==========================================
    // 🎨 بناء واجهة النافذة (UI Rendering)
    // ==========================================
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        {/* 🌌 الخلفية المعتمة والزجاجية (Backdrop) */}
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] data-[state=open]:animate-in data-[state=closed]:animate-out duration-300" />
        
        {/* 📦 حاوية النافذة المنبثقة */}
        <Dialog.Content 
          className="fixed left-[50%] top-[50%] z-[201] w-[95vw] max-w-3xl translate-x-[-50%] translate-y-[-50%] rounded-[3rem] bg-white shadow-2xl focus:outline-none max-h-[90vh] flex flex-col overflow-hidden" 
          dir="rtl"
        >
          {/* عنوان مخفي لقارئات الشاشة (Accessibility) */}
          <Dialog.Description className="sr-only">نافذة منح وسام للمستخدم</Dialog.Description>
          
          {/* 👑 هيدر النافذة (الرأس) */}
          <div className="px-8 pt-8 pb-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Award className="h-7 w-7" />
              </div>
              <div>
                <Dialog.Title className="text-2xl font-black text-slate-900">
                  منح وسام لـ {recipientName}
                </Dialog.Title>
                <p className="text-slate-500 font-medium text-sm mt-1">اختر الوسام المناسب تقديراً لجهوده وتميزه.</p>
              </div>
            </div>
            {/* زر الإغلاق (X) */}
            <Dialog.Close className="h-10 w-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          {/* 📜 جسم النافذة (قابل للتمرير Scrollable) */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30">
            
            {/* 🔔 منطقة الإشعارات (تظهر فقط عند حدوث خطأ أو نجاح) */}
            <AnimatePresence>
              {notification && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className={`p-4 rounded-2xl mb-6 flex items-center gap-3 font-bold border ${
                    notification.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                  }`}
                >
                  {notification.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <X className="h-5 w-5" />}
                  {notification.message}
                </motion.div>
              )}
            </AnimatePresence>

            {/* 🏅 شبكة الأوسمة المتاحة (Grid) */}
            <div className="mb-8">
              <label className="text-sm font-black text-slate-700 block mb-4">1. اختر الوسام (المتوفر: {availableBadges.length})</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {availableBadges.map((badge) => {
                  const isSelected = selectedBadge === badge.id;
                  return (
                    <motion.div
                      key={badge.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedBadge(badge.id)} // تعيين الوسام المحدد
                      // تغيير التصميم ديناميكياً إذا كان الوسام محدداً
                      className={`relative cursor-pointer rounded-3xl border-2 transition-all duration-300 p-4 flex flex-col items-center text-center gap-3 overflow-hidden ${
                        isSelected 
                          ? 'border-amber-500 bg-amber-50 shadow-lg shadow-amber-500/20' 
                          : 'border-slate-100 bg-white hover:border-amber-200 hover:shadow-md'
                      }`}
                    >
                      {/* علامة الصح التي تظهر فوق الوسام المحدد */}
                      {isSelected && (
                        <div className="absolute top-3 right-3 h-6 w-6 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-sm z-10">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      )}
                      
                      {/* صورة الوسام */}
                      <div className="relative h-20 w-20">
                        {badge.image_url ? (
                          <Image src={badge.image_url} alt={badge.name} fill unoptimized referrerPolicy="no-referrer" className="object-contain drop-shadow-md" />
                        ) : (
                          <Award className="h-full w-full text-slate-300" />
                        )}
                      </div>
                      
                      {/* بيانات الوسام (اسمه وعدد نقاطه) */}
                      <div>
                        <h4 className={`font-black ${isSelected ? 'text-amber-700' : 'text-slate-800'}`}>{badge.name}</h4>
                        <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded-lg mt-1 inline-block border border-slate-100">
                          {badge.points} نقطة
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* 📝 حقل سبب المنح (Textarea) */}
            <div>
              <label className="text-sm font-black text-slate-700 flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-slate-400" />
                2. سبب المنح (رسالة تظهر في ملفه - اختياري)
              </label>
              <textarea 
                rows={3}
                placeholder="مثال: لجهودك الاستثنائية وتميزك الملحوظ..."
                className="w-full rounded-3xl border-0 py-4 px-6 bg-white ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-amber-500 font-medium resize-none shadow-sm transition-all"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          {/* 🏁 ذيل النافذة (Footer Actions) */}
          <div className="p-6 border-t border-slate-100 bg-white flex gap-4">
            <button 
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl bg-slate-50 font-black text-slate-600 hover:bg-slate-100 transition-colors"
            >
              إلغاء التتويج
            </button>
            <button 
              onClick={handleGrant}
              disabled={isSubmitting || !selectedBadge} // تعطيل الزر إذا كان قيد الإرسال أو لم يختر وساماً
              className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 font-black text-white hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/30 disabled:opacity-50 flex justify-center items-center gap-2 transition-all active:scale-95"
            >
              {isSubmitting ? (
                <span className="animate-pulse">جاري اعتماد الوسام...</span>
              ) : (
                <>
                  <Award className="h-6 w-6"/> 
                  اعتماد ومنح الوسام
                </>
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
