'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAnnouncementsSystem, Announcement } from '@/hooks/useAnnouncementsSystem';
import { useAuth } from '@/context/auth-context';
import { Plus, Search, Edit2, Trash2, Megaphone, Bell, X, Users, Calendar, Filter, AlertCircle, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion'; // 🚀 تم تصحيح الاستيراد
import Image from 'next/image';
import { deleteFromCloudinary } from '@/lib/cloudinary';

import ImageUpload from '@/components/ImageUpload';

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'الجميع', color: 'indigo', icon: Users },
  { value: 'teacher', label: 'المعلمين', color: 'emerald', icon: Users },
  { value: 'student', label: 'الطلاب', color: 'blue', icon: Users },
  { value: 'parent', label: 'أولياء الأمور', color: 'amber', icon: Users },
];

export default function AnnouncementsPage() {
  const { authRole, isChecking } = useAuth(); // 🚀 استيراد حالة التحقق
  const { 
    announcements, 
    loading, 
    fetchAnnouncements, 
    saveAnnouncement, 
    deleteAnnouncement 
  } = useAnnouncementsSystem();

  const [searchTerm, setSearchTerm] = useState('');
  const [audienceFilter, setAudienceFilter] = useState('all_types');
  const [isMounted, setIsMounted] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Partial<Announcement>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const fetchRef = useRef(fetchAnnouncements);

  // تحديث مرجع دالة الجلب لتجنب الـ Infinite Loop
  useEffect(() => {
    fetchRef.current = fetchAnnouncements;
  }, [fetchAnnouncements]);

  useEffect(() => {
    setIsMounted(true);
    // 🚀 لا نطلب الإعلانات إلا بعد التأكد التام من هوية المستخدم لتوفير الطلبات الخاطئة
    if (!isChecking) {
       fetchRef.current(authRole);
    }
  }, [authRole, isChecking]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAnnouncement.title || !currentAnnouncement.content || !currentAnnouncement.target_role) {
      showNotification('error', 'يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    setIsSubmitting(true);
    try {
      const originalAnn = announcements.find(a => a.id === currentAnnouncement.id);
      if (originalAnn?.image_url && originalAnn.image_url !== currentAnnouncement.image_url) {
        await deleteFromCloudinary(originalAnn.image_url);
      }

      await saveAnnouncement(currentAnnouncement);
      await fetchRef.current(authRole);
      
      setIsModalOpen(false);
      setCurrentAnnouncement({});
      showNotification('success', 'تم حفظ الإعلان بنجاح وتحديث اللوحة!');
    } catch (error: any) {
      console.error('Error saving announcement:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء حفظ الإعلان');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!announcementToDelete) return;
    
    try {
      const annToDelete = announcements.find(a => a.id === announcementToDelete);
      await deleteAnnouncement(announcementToDelete, annToDelete?.image_url);
      await fetchRef.current(authRole);
      
      showNotification('success', 'تم حذف الإعلان نهائياً');
    } catch (error) {
      console.error('Error deleting announcement:', error);
      showNotification('error', 'حدث خطأ أثناء الحذف، يرجى المحاولة لاحقاً');
    } finally {
      setAnnouncementToDelete(null);
    }
  };

  const openAddModal = () => {
    setCurrentAnnouncement({ target_role: 'all' });
    setIsModalOpen(true);
  };

  const openEditModal = (announcement: Announcement) => {
    setCurrentAnnouncement(announcement);
    setIsModalOpen(true);
  };

  const filteredAnnouncements = announcements.filter(a => {
    const matchesSearch = a.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          a.content?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAudience = audienceFilter === 'all_types' || a.target_role === audienceFilter;
    return matchesSearch && matchesAudience;
  });

  const getAudienceLabel = (value: string) => {
    return AUDIENCE_OPTIONS.find(opt => opt.value === value)?.label || 'الجميع';
  };

  const getAudienceTheme = (value: string) => {
    switch (value) {
      case 'all': return { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', shadow: 'shadow-indigo-500/20' };
      case 'teacher': return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', shadow: 'shadow-emerald-500/20' };
      case 'student': return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', shadow: 'shadow-blue-500/20' };
      case 'parent': return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', shadow: 'shadow-amber-500/20' };
      default: return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100', shadow: 'shadow-slate-500/20' };
    }
  };

  // حماية ضد خطأ الترطيب (Hydration)
  if (!isMounted) return null;

  // 🚀 شاشة التحميل لمنع الوميض قبل التأكد من الهوية
  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse">جاري التحقق من الصلاحيات لجلب الإعلانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 relative overflow-hidden" dir="rtl">
      {/* خلفية جمالية (Mesh Gradient Effect) */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-br from-indigo-100/40 via-purple-50/40 to-emerald-50/40 -z-10 blur-3xl rounded-b-[100px]"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 space-y-12">
        
        {/* نظام الإشعارات العائم (Toast) */}
        <AnimatePresence>
          {notification && (
            <motion.div 
              initial={{ opacity: 0, y: -40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className={`fixed top-10 left-1/2 z-[150] -translate-x-1/2 px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-4 backdrop-blur-xl border ${
                notification.type === 'success' 
                  ? 'bg-emerald-500/95 border-emerald-400 text-white shadow-emerald-500/30' 
                  : 'bg-red-500/95 border-red-400 text-white shadow-red-500/30'
              }`}
            >
              <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                {notification.type === 'success' ? <CheckCircle2 className="h-6 w-6 text-white" /> : <AlertCircle className="h-6 w-6 text-white" />}
              </div>
              <div className="font-bold text-lg tracking-tight">{notification.message}</div>
              <button onClick={() => setNotification(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                <X className="h-5 w-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* الترويسة الرئيسية */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 bg-white/60 backdrop-blur-2xl p-10 rounded-[3rem] border border-white shadow-xl shadow-slate-200/40"
        >
          <div className="space-y-5">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 text-sm font-black tracking-widest border border-indigo-100/50 shadow-sm">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
              </span>
              مركز التواصل الرقمي
            </div>
            <h1 className="text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">الإعلانات <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">والتعاميم</span></h1>
            <p className="text-xl text-slate-500 font-medium max-w-2xl leading-relaxed">نافذتك المباشرة للتواصل مع مجتمع المدرسة بفاعلية، وضوح، وشفافية مطلقة.</p>
          </div>
          
          { (authRole === 'admin' || authRole === 'management') && (
            <motion.button 
              whileHover={{ scale: 1.03, translateY: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={openAddModal}
              className="group relative inline-flex items-center justify-center gap-3 rounded-[2rem] bg-slate-900 px-10 py-6 text-lg font-black text-white shadow-2xl shadow-slate-900/30 hover:bg-indigo-600 transition-all duration-300 self-start lg:self-end overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <Plus className="relative z-10 h-6 w-6" />
              <span className="relative z-10">إنشاء إعلان جديد</span>
            </motion.button>
          )}
        </motion.div>

        {/* فلاتر البحث المتقدمة */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-lg shadow-slate-200/30 border border-white flex flex-col md:flex-row gap-5"
        >
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 right-0 flex items-center pr-6 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
              <Search className="h-6 w-6" />
            </div>
            <input
              type="text"
              className="block w-full rounded-3xl border-0 py-5 pr-16 pl-6 text-slate-900 bg-slate-50/50 hover:bg-slate-100/50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 text-lg transition-all font-bold placeholder:text-slate-400 placeholder:font-medium"
              placeholder="ابحث عن إعلان، تعميم، أو قرار..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative md:w-80 group">
            <div className="absolute inset-y-0 right-0 flex items-center pr-6 text-slate-400 group-focus-within:text-indigo-600 transition-colors z-10 pointer-events-none">
              <Filter className="h-6 w-6" />
            </div>
            <select
              className="block w-full rounded-3xl border-0 py-5 pr-16 pl-14 text-slate-900 bg-slate-50/50 hover:bg-slate-100/50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 text-lg transition-all font-bold appearance-none cursor-pointer"
              value={audienceFilter}
              onChange={(e) => setAudienceFilter(e.target.value)}
            >
              <option value="all_types">جميع الفئات المستهدفة</option>
              {AUDIENCE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 left-0 flex items-center pl-6 text-slate-400 pointer-events-none">
              <ArrowRight className="h-5 w-5 -rotate-90" />
            </div>
          </div>
        </motion.div>

        {/* عرض المحتوى */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-32 gap-6">
            <div className="relative h-24 w-24">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
            </div>
            <p className="text-slate-500 font-bold text-xl animate-pulse">جاري جلب التعاميم...</p>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-32 bg-white/50 backdrop-blur-sm rounded-[3rem] border border-white shadow-xl shadow-slate-200/30"
          >
            <div className="h-40 w-40 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <Megaphone className="h-20 w-20 text-slate-300" />
            </div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">لا توجد نتائج مطابقة</h3>
            <p className="text-slate-500 mt-4 text-xl font-medium max-w-md mx-auto">لم نعثر على أي إعلانات تطابق بحثك الحالي، يمكنك تعديل خيارات البحث أو إضافة إعلان جديد.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredAnnouncements.map((announcement, index) => {
                const theme = getAudienceTheme(announcement.target_role || 'all');
                
                return (
                  <motion.div 
                    key={announcement.id}
                    layout
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4, delay: index * 0.05, ease: [0.23, 1, 0.32, 1] }}
                    className="group bg-white rounded-[2.5rem] shadow-lg shadow-slate-200/40 border border-slate-100 overflow-hidden flex flex-col hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-2 transition-all duration-300"
                  >
                    <div className="p-8 flex-1 flex flex-col">
                      <div className="flex justify-between items-start gap-4 mb-6">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl ${theme.bg} ${theme.text} border ${theme.border} text-sm font-bold`}>
                          <Users className="h-4 w-4" />
                          <span>{getAudienceLabel(announcement.target_role || 'all')}</span>
                        </div>
                        
                        { (authRole === 'admin' || authRole === 'management') && (
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button onClick={() => openEditModal(announcement)} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-colors bg-slate-50 border border-slate-100">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => setAnnouncementToDelete(announcement.id)} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-colors bg-slate-50 border border-slate-100">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <h3 className="text-2xl font-black text-slate-900 leading-snug mb-4 group-hover:text-indigo-600 transition-colors line-clamp-2">
                        {announcement.title}
                      </h3>
                      
                      <p className="text-slate-500 font-medium leading-relaxed mb-8 line-clamp-3 flex-1 text-lg">
                        {announcement.content}
                      </p>

                      <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-slate-400 text-sm font-bold bg-slate-50 px-4 py-2 rounded-2xl">
                          <Calendar className="h-4 w-4 text-indigo-400" />
                          <span suppressHydrationWarning>
                            {new Date(announcement.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                        </div>
                        
                        <button 
                          onClick={() => setSelectedAnnouncement(announcement)}
                          className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-colors"
                        >
                          <ArrowRight className="h-5 w-5 -rotate-45" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* --- المودال الخاص بالتفاصيل (Details Modal) --- */}
        <Dialog.Root open={!!selectedAnnouncement} onOpenChange={(open) => !open && setSelectedAnnouncement(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-300" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-[101] w-[95vw] max-w-4xl translate-x-[-50%] translate-y-[-50%] rounded-[3rem] bg-white p-2 shadow-2xl focus:outline-none max-h-[90vh] overflow-hidden flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-300" dir="rtl">
              
              <Dialog.Description className="sr-only">نافذة عرض تفاصيل الإعلان</Dialog.Description>
              
              {selectedAnnouncement && (
                <div className="flex flex-col h-full max-h-[calc(90vh-1rem)] overflow-y-auto custom-scrollbar rounded-[2.5rem] bg-white p-8 md:p-12">
                  <div className="flex items-start justify-between mb-10 gap-6">
                    <div>
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl ${getAudienceTheme(selectedAnnouncement.target_role || 'all').bg} ${getAudienceTheme(selectedAnnouncement.target_role || 'all').text} text-sm font-bold mb-6`}>
                        <Users className="h-4 w-4" />
                        <span>موجه لـ: {getAudienceLabel(selectedAnnouncement.target_role || 'all')}</span>
                      </div>
                      <Dialog.Title className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                        {selectedAnnouncement.title}
                      </Dialog.Title>
                      <div className="flex items-center gap-2 mt-6 text-slate-500 font-bold bg-slate-50 w-fit px-5 py-2.5 rounded-2xl border border-slate-100">
                        <Calendar className="h-5 w-5 text-indigo-500" />
                        <span suppressHydrationWarning>
                          نُشر في: {new Date(selectedAnnouncement.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <Dialog.Close className="h-14 w-14 shrink-0 flex items-center justify-center rounded-full bg-slate-50 hover:bg-red-50 hover:text-red-600 transition-colors text-slate-400">
                      <X className="h-6 w-6" />
                    </Dialog.Close>
                  </div>

                  {selectedAnnouncement.image_url && (
                    <div className="relative w-full aspect-video rounded-[2rem] overflow-hidden mb-10 bg-slate-50 border border-slate-100 shadow-inner group">
                      <Image 
                        src={selectedAnnouncement.image_url} 
                        alt={selectedAnnouncement.title} 
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  <div className="prose prose-xl prose-slate max-w-none text-slate-700 whitespace-pre-wrap leading-loose font-medium bg-gradient-to-b from-slate-50/50 to-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100">
                    {selectedAnnouncement.content}
                  </div>

                  <div className="flex justify-center pt-10 mt-auto">
                    <Dialog.Close asChild>
                      <button className="px-14 py-6 rounded-full bg-slate-900 text-white text-lg font-black shadow-2xl shadow-slate-900/20 hover:bg-indigo-600 hover:shadow-indigo-500/30 transition-all duration-300 hover:-translate-y-1">
                        إغلاق النافذة
                      </button>
                    </Dialog.Close>
                  </div>
                </div>
              )}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* --- المودال الخاص بالحذف (Delete Confirmation Modal) --- */}
        <Dialog.Root open={!!announcementToDelete} onOpenChange={(open) => !open && setAnnouncementToDelete(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-300" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-[101] w-[95vw] max-w-md translate-x-[-50%] translate-y-[-50%] rounded-[3rem] bg-white p-10 shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-300" dir="rtl">
              <Dialog.Description className="sr-only">تأكيد عملية حذف الإعلان</Dialog.Description>
              
              <div className="flex flex-col items-center text-center">
                <div className="h-24 w-24 rounded-full bg-red-50 border-[6px] border-red-100 flex items-center justify-center mb-6">
                  <Trash2 className="h-10 w-10 text-red-500" />
                </div>
                <Dialog.Title className="text-3xl font-black text-slate-900 tracking-tight mb-4">
                  تأكيد الحذف
                </Dialog.Title>
                <p className="text-slate-500 mb-10 font-medium text-lg leading-relaxed">
                  هل أنت متأكد من رغبتك في حذف هذا الإعلان نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.
                </p>
                <div className="flex flex-col w-full gap-4">
                  <button
                    onClick={confirmDelete}
                    className="w-full rounded-2xl bg-red-500 py-5 text-lg font-black text-white shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all hover:-translate-y-1"
                  >
                    نعم، احذف الإعلان
                  </button>
                  <Dialog.Close asChild>
                    <button className="w-full rounded-2xl bg-slate-50 py-5 text-lg font-black text-slate-600 hover:bg-slate-100 transition-all border border-slate-200">
                      إلغاء وتراجع
                    </button>
                  </Dialog.Close>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* --- المودال الخاص بالإضافة والتعديل (Add/Edit Modal) --- */}
        <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-300" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-[101] w-[95vw] max-w-3xl translate-x-[-50%] translate-y-[-50%] rounded-[3rem] bg-white p-8 md:p-12 shadow-2xl focus:outline-none max-h-[90vh] overflow-y-auto custom-scrollbar data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-300" dir="rtl">
              <Dialog.Description className="sr-only">نموذج إضافة أو تعديل الإعلان</Dialog.Description>
              
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-5">
                  <div className="h-16 w-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-sm">
                    <Edit2 className="h-7 w-7 text-indigo-600" />
                  </div>
                  <div>
                    <Dialog.Title className="text-3xl font-black text-slate-900 tracking-tight">
                      {currentAnnouncement.id ? 'تحديث الإعلان' : 'صياغة إعلان جديد'}
                    </Dialog.Title>
                    <p className="text-slate-500 font-bold mt-1 text-sm md:text-base">تأكد من وضوح الرسالة وتحديد الفئة الصحيحة.</p>
                  </div>
                </div>
                <Dialog.Close className="h-12 w-12 shrink-0 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors bg-slate-50 text-slate-400">
                  <X className="h-6 w-6" />
                </Dialog.Close>
              </div>
              
              <form onSubmit={handleSaveAnnouncement} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-sm font-black text-slate-600 px-2 flex items-center gap-2">
                      عنوان الإعلان <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="اكتب عنواناً جذاباً وواضحاً..." 
                      className="block w-full rounded-2xl border-0 py-5 px-6 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 focus:bg-white text-lg transition-all font-bold placeholder:font-medium placeholder:text-slate-400"
                      value={currentAnnouncement.title || ''}
                      onChange={(e) => setCurrentAnnouncement({...currentAnnouncement, title: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-sm font-black text-slate-600 px-2 flex items-center gap-2">
                      الفئة المستهدفة <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                      <select 
                        required
                        className="block w-full rounded-2xl border-0 py-5 px-6 pl-14 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 focus:bg-white text-lg transition-all font-bold appearance-none cursor-pointer"
                        value={currentAnnouncement.target_role || ''}
                        onChange={(e) => setCurrentAnnouncement({...currentAnnouncement, target_role: e.target.value})}
                      >
                        {AUDIENCE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 left-0 flex items-center pl-6 text-slate-400 pointer-events-none">
                        <ArrowRight className="h-5 w-5 -rotate-90" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-black text-slate-600 px-2 flex items-center gap-2">
                    تفاصيل ومحتوى الإعلان <span className="text-red-500">*</span>
                  </label>
                  <textarea 
                    required
                    rows={6}
                    placeholder="سرد التفاصيل، المواعيد، أو التعليمات..." 
                    className="block w-full rounded-2xl border-0 py-6 px-6 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 focus:bg-white text-lg transition-all font-bold resize-none leading-relaxed placeholder:font-medium placeholder:text-slate-400 custom-scrollbar"
                    value={currentAnnouncement.content || ''}
                    onChange={(e) => setCurrentAnnouncement({...currentAnnouncement, content: e.target.value})}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-black text-slate-600 px-2">إرفاق صورة توضيحية (اختياري)</label>
                  <div className="p-2 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 hover:bg-slate-100/50 transition-colors">
                    <ImageUpload 
                      initialImageUrl={currentAnnouncement.image_url ?? undefined}
                      onUploadSuccess={(url) => setCurrentAnnouncement({...currentAnnouncement, image_url: url || undefined})}
                      label="انقر هنا لاختيار صورة، أو قم بالسحب والإفلات"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 mt-10 border-t border-slate-100">
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="flex-1 rounded-2xl bg-slate-50 py-5 text-lg font-black text-slate-600 hover:bg-slate-100 transition-all border border-slate-200"
                    >
                      إلغاء الأمر
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-[2] rounded-2xl bg-indigo-600 py-5 text-lg font-black text-white shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all disabled:opacity-70 flex items-center justify-center gap-3"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-6 w-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                        جاري المعالجة...
                      </>
                    ) : (
                      <>
                        <Megaphone className="h-6 w-6" />
                        {currentAnnouncement.id ? 'حفظ التعديلات' : 'نشر الإعلان الآن'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

      </div>
    </div>
  );
}
