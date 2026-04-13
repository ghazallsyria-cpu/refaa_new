'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDocumentsSystem, Document } from '../../hooks/useDocumentsSystem';
import { useAuth } from '../../context/auth-context'; // 🚀 استيراد جدار الحماية
import { Plus, Search, Edit2, Trash2, FileText, X, Filter, ExternalLink, Calendar, Folder, FileArchive, UploadCloud, Loader2, ArrowLeft } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'جميع التصنيفات' },
  { value: 'forms', label: 'نماذج واستمارات' },
  { value: 'policies', label: 'لوائح وسياسات' },
  { value: 'educational', label: 'مواد تعليمية' },
  { value: 'other', label: 'أخرى' },
];

export default function DocumentsPage() {
  const { authRole, isChecking } = useAuth() as any; // 🚀 تفعيل الحماية

  const { loading: systemLoading, fetchDocuments, saveDocument, deleteDocument } = useDocumentsSystem();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState<Partial<Document>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Upload State
  const [uploadType, setUploadType] = useState<'file' | 'link'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadDocuments = useCallback(async () => {
    // 🚀 لا نجلب البيانات إلا للجهات المسموح لها
    if (authRole !== 'admin' && authRole !== 'management') return;
    
    setLoading(true);
    const data = await fetchDocuments();
    setDocuments(data);
    setLoading(false);
  }, [fetchDocuments, authRole]);

  useEffect(() => {
    if (!isChecking) {
      loadDocuments();
    }
  }, [loadDocuments, isChecking]);

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDocument.title || !currentDocument.category) {
      showNotification('error', 'يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    if (uploadType === 'link' && !currentDocument.file_url) {
      showNotification('error', 'يرجى إدخال رابط الملف');
      return;
    }

    if (uploadType === 'file' && !selectedFile && !currentDocument.id) {
      showNotification('error', 'يرجى اختيار ملف للرفع');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveDocument(currentDocument, selectedFile || undefined);
      await loadDocuments();
      setIsModalOpen(false);
      setCurrentDocument({});
      setSelectedFile(null);
      showNotification('success', 'تم حفظ المستند بنجاح!');
    } catch (error: any) {
      console.error('Error saving document:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء حفظ المستند');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!documentToDelete) return;
    
    try {
      const docToDelete = documents.find(d => d.id === documentToDelete);
      await deleteDocument(documentToDelete, docToDelete?.file_url);
      await loadDocuments();
      showNotification('success', 'تم حذف المستند بنجاح');
    } catch (error) {
      console.error('Error deleting document:', error);
      showNotification('error', 'حدث خطأ أثناء حذف المستند');
    } finally {
      setDocumentToDelete(null);
    }
  };

  const openAddModal = () => {
    setCurrentDocument({ category: 'forms' });
    setUploadType('file');
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const openEditModal = (doc: Document) => {
    setCurrentDocument(doc);
    setUploadType('link'); // Default to link when editing to show current URL
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const filteredDocuments = documents.filter(doc => {
    const searchLower = searchTerm.toLowerCase();
    const titleMatch = doc.title ? doc.title.toLowerCase().includes(searchLower) : false;
    const descMatch = doc.description ? doc.description.toLowerCase().includes(searchLower) : false;
    const matchesSearch = titleMatch || descMatch;
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryLabel = (value: string) => {
    return CATEGORY_OPTIONS.find(opt => opt.value === value)?.label || 'غير محدد';
  };

  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'forms': return { bg: 'bg-blue-50', text: 'text-blue-700', icon: <FileText className="h-6 w-6 text-blue-600" /> };
      case 'policies': return { bg: 'bg-amber-50', text: 'text-amber-700', icon: <Folder className="h-6 w-6 text-amber-600" /> };
      case 'educational': return { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <FileArchive className="h-6 w-6 text-emerald-600" /> };
      default: return { bg: 'bg-slate-50', text: 'text-slate-700', icon: <FileText className="h-6 w-6 text-slate-600" /> };
    }
  };

  // 🚀 شاشة التحميل وحماية الوصول (Security Guard)
  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-14 h-14 text-indigo-600 animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse tracking-widest">جاري التحقق وتأمين الصلاحيات...</p>
        </div>
      </div>
    );
  }

  // 🚀 منع المتطفلين من رؤية صفحة المستندات الإدارية
  if (authRole !== 'admin' && authRole !== 'management') {
    return <div className="p-10 text-center font-bold text-rose-600 min-h-[80vh] flex items-center justify-center">هذه الصفحة مخصصة للإدارة المدرسية فقط.</div>;
  }

  return (
    <div className="space-y-6 relative max-w-7xl mx-auto px-4 py-8 font-cairo" dir="rtl">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-2xl font-black shadow-lg flex items-center gap-3 transition-all ${
          notification.type === 'success' ? 'bg-emerald-500 text-white border border-emerald-400' : 'bg-red-500 text-white border border-red-400'
        }`}>
          <div>{notification.message}</div>
          <button onClick={() => setNotification(null)} className="text-white/80 hover:text-white bg-white/10 p-1 rounded-lg transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog.Root open={!!documentToDelete} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-[2rem] bg-white p-8 shadow-2xl focus:outline-none" dir="rtl">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-2xl font-black text-slate-900">
                تأكيد الحذف
              </Dialog.Title>
              <Dialog.Close className="text-slate-400 hover:text-slate-500 bg-slate-50 p-2 rounded-xl">
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>
            <p className="text-slate-600 mb-8 font-bold leading-relaxed">هل أنت متأكد من رغبتك في حذف هذا المستند؟ لا يمكن التراجع عن هذا الإجراء وسيتم حذف الملف من السيرفر.</p>
            <div className="flex justify-end gap-3">
              <Dialog.Close asChild>
                <button className="rounded-2xl bg-slate-50 px-6 py-3 text-sm font-black text-slate-700 hover:bg-slate-100 transition-colors">
                  إلغاء
                </button>
              </Dialog.Close>
              <button
                onClick={confirmDelete}
                className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-red-200 hover:bg-red-700 transition-all active:scale-95"
              >
                تأكيد الحذف
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-3 bg-slate-50 text-slate-500 hover:text-indigo-600 rounded-xl shadow-sm border border-slate-200 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">المستندات والملفات</h1>
            <p className="text-slate-500 font-bold mt-1">إدارة الملفات والمستندات المدرسية ومشاركتها مع المعلمين والطلاب</p>
          </div>
        </div>
        <button 
          onClick={openAddModal}
          className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 gap-2"
        >
          <Plus className="h-5 w-5" />
          إضافة مستند جديد
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-xl p-5 sm:p-6 rounded-[2rem] shadow-sm border border-slate-200 sticky top-24 z-30">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 group">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
              <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input
              type="text"
              className="block w-full rounded-2xl border-0 py-4 pr-12 pl-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm transition-all font-bold outline-none"
              placeholder="البحث باسم المستند أو الوصف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative sm:w-72 group">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
              <Filter className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <select
              className="block w-full rounded-2xl border-0 py-4 pr-12 pl-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm transition-all font-bold outline-none appearance-none cursor-pointer"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {CATEGORY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col justify-center items-center py-32 gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-slate-500 font-bold animate-pulse">جاري تحميل المستندات...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-300 shadow-sm">
          <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <FileText className="h-10 w-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">لا توجد مستندات</h3>
          <p className="text-slate-500 font-bold">لم يتم العثور على مستندات تطابق معايير البحث الحالية.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc) => {
            const dateObj = new Date(doc.created_at);
            const styles = getCategoryStyles(doc.category);
            
            return (
              <div key={doc.id} className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col transition-all hover:shadow-lg hover:border-indigo-200 group">
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`p-4 rounded-2xl shadow-inner ${styles.bg}`}>
                      {styles.icon}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEditModal(doc)}
                        className="p-2.5 text-indigo-500 hover:text-white hover:bg-indigo-500 rounded-xl transition-all bg-indigo-50"
                        title="تعديل المستند"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => setDocumentToDelete(doc.id)}
                        className="p-2.5 text-rose-500 hover:text-white hover:bg-rose-500 rounded-xl transition-all bg-rose-50"
                        title="حذف المستند"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-black text-slate-900 mb-3 line-clamp-2 leading-tight" title={doc.title}>
                    {doc.title}
                  </h3>
                  
                  <p className="text-sm font-bold text-slate-500 mb-6 line-clamp-2 leading-relaxed" title={doc.description}>
                    {doc.description || 'لا يوجد وصف للمستند'}
                  </p>
                  
                  <div className="mt-auto space-y-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${styles.bg} ${styles.text} border border-${styles.text.split('-')[1]}-200`}>
                        {getCategoryLabel(doc.category)}
                      </span>
                    </div>
                    <div className="flex items-center text-xs font-bold text-slate-400 gap-1.5 bg-slate-50 w-fit px-3 py-1.5 rounded-lg">
                      <Calendar className="h-3.5 w-3.5" />
                      <span dir="ltr">{dateObj.toLocaleDateString('ar-EG')}</span>
                    </div>
                  </div>
                </div>
                
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 group-hover:bg-indigo-600 transition-colors">
                  <a 
                    href={doc.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 text-sm font-black text-indigo-600 group-hover:text-white transition-colors"
                  >
                    <span>فتح المستند المرفق</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Document Modal */}
      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 animate-in fade-in duration-300" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-xl translate-x-[-50%] translate-y-[-50%] rounded-[2.5rem] bg-white p-8 shadow-2xl focus:outline-none max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-300 border border-slate-100" dir="rtl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <Dialog.Title className="text-2xl font-black text-slate-900 tracking-tight">
                    {currentDocument.id ? 'تعديل المستند' : 'إضافة مستند جديد'}
                  </Dialog.Title>
                </div>
              </div>
              <Dialog.Close className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-xl transition-colors">
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>
            
            <form onSubmit={handleSaveDocument} className="space-y-6">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">عنوان المستند <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="مثال: لائحة السلوك والمواظبة" 
                  className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 sm:text-sm font-bold outline-none transition-all"
                  value={currentDocument.title || ''}
                  onChange={(e) => setCurrentDocument({...currentDocument, title: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">التصنيف <span className="text-red-500">*</span></label>
                <select 
                  required
                  className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 sm:text-sm font-bold outline-none appearance-none cursor-pointer transition-all"
                  value={currentDocument.category || ''}
                  onChange={(e) => setCurrentDocument({...currentDocument, category: e.target.value})}
                >
                  {CATEGORY_OPTIONS.filter(opt => opt.value !== 'all').map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">الوصف (اختياري)</label>
                <textarea 
                  rows={3}
                  placeholder="وصف مختصر لمحتوى المستند..." 
                  className="block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 sm:text-sm font-bold outline-none resize-none transition-all"
                  value={currentDocument.description || ''}
                  onChange={(e) => setCurrentDocument({...currentDocument, description: e.target.value})}
                />
              </div>

              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                  <label className="block text-sm font-black text-slate-900">الملف المرفق <span className="text-red-500">*</span></label>
                  <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setUploadType('file')}
                      className={`flex-1 sm:flex-none px-4 py-2 text-xs font-black rounded-lg transition-all ${uploadType === 'file' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                    >
                      رفع ملف جديد
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadType('link')}
                      className={`flex-1 sm:flex-none px-4 py-2 text-xs font-black rounded-lg transition-all ${uploadType === 'link' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                    >
                      إرفاق رابط خارجي
                    </button>
                  </div>
                </div>

                {uploadType === 'file' ? (
                  <div className="mt-4 flex flex-col justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-white px-6 py-10 hover:bg-indigo-50/50 transition-colors group">
                    <div className="text-center">
                      <div className="h-16 w-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <UploadCloud className="h-8 w-8 text-indigo-500" aria-hidden="true" />
                      </div>
                      <div className="mt-4 flex text-sm leading-6 text-slate-600 justify-center">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer rounded-md font-black text-indigo-600 hover:text-indigo-500 outline-none"
                        >
                          <span>اختر ملفاً من جهازك</span>
                          <input 
                            id="file-upload" 
                            name="file-upload" 
                            type="file" 
                            className="sr-only" 
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} 
                          />
                        </label>
                      </div>
                      <p className="text-xs font-bold text-slate-400 mt-2">
                        {selectedFile ? (
                          <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">{selectedFile.name}</span>
                        ) : currentDocument.file_url ? (
                          <span className="text-amber-600">هناك ملف مرفق مسبقاً، يمكنك اختيار ملف آخر لاستبداله</span>
                        ) : (
                          'PDF, DOCX, XLSX, أو صور بحجم أقصى 10MB'
                        )}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative mt-4">
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                      <LinkIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="url"
                      className="block w-full rounded-2xl border-0 py-4 pr-12 pl-4 text-slate-900 bg-white ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm font-bold outline-none text-left"
                      dir="ltr"
                      placeholder="https://drive.google.com/..."
                      value={currentDocument.file_url || ''}
                      onChange={(e) => setCurrentDocument({...currentDocument, file_url: e.target.value})}
                    />
                  </div>
                )}
              </div>

              <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-2xl bg-slate-50 px-8 py-4 text-sm font-black text-slate-700 hover:bg-slate-100 transition-all active:scale-95"
                  >
                    إلغاء الأمر
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-2xl bg-indigo-600 px-10 py-4 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <><div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> جاري الحفظ...</>
                  ) : (
                    'تأكيد وحفظ المستند'
                  )}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
