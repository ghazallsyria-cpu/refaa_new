'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Edit2, Trash2, FileText, X, Filter, Link as LinkIcon, ExternalLink, Calendar, Folder, FileArchive, UploadCloud } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { deleteFromCloudinary } from '@/lib/cloudinary';

type Document = {
  id: string;
  title: string;
  description: string;
  file_url: string;
  category: string;
  created_at: string;
};

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'جميع التصنيفات' },
  { value: 'forms', label: 'نماذج واستمارات' },
  { value: 'policies', label: 'لوائح وسياسات' },
  { value: 'educational', label: 'مواد تعليمية' },
  { value: 'other', label: 'أخرى' },
];

export default function DocumentsPage() {
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

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
        showNotification('error', 'حدث خطأ أثناء جلب المستندات: ' + error.message);
        setDocuments([]);
      } else {
        setDocuments((data as unknown) as Document[] || []);
      }
    } catch (error: any) {
      console.error('Error:', error);
      showNotification('error', 'حدث خطأ غير متوقع: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

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
      let finalFileUrl = currentDocument.file_url;

      // Handle File Upload to Cloudinary
      if (uploadType === 'file' && selectedFile) {
        if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || !process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) {
          throw new Error('يرجى إعداد إعدادات Cloudinary في المتغيرات البيئية');
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
          { method: 'POST', body: formData }
        );

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error?.message || 'فشل رفع الملف إلى Cloudinary');
        }

        finalFileUrl = data.secure_url;
      }

      const payload = {
        title: currentDocument.title,
        description: currentDocument.description || null,
        file_url: finalFileUrl,
        category: currentDocument.category,
      };

      if (currentDocument.id) {
        // Update
        // Delete old file if it's being replaced
        if (uploadType === 'file' && selectedFile && currentDocument.file_url) {
          await deleteFromCloudinary(currentDocument.file_url, 'raw');
        }

        const { data, error } = await supabase
          .from('documents')
          .update(payload)
          .eq('id', currentDocument.id)
          .select();
          
        if (error) {
          console.error('Supabase Update Error Details:', JSON.stringify(error, null, 2));
          throw error;
        }
      } else {
        // Insert
        const { data, error } = await supabase
          .from('documents')
          .insert([payload])
          .select();
          
        if (error) {
          console.error('Supabase Insert Error Details:', JSON.stringify(error, null, 2));
          throw error;
        }
      }

      await fetchDocuments();
      setIsModalOpen(false);
      setCurrentDocument({});
      setSelectedFile(null);
      
      // إظهار رسالة نجاح للمستخدم
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
      // Get the document to find its file_url
      const docToDelete = documents.find(d => d.id === documentToDelete);
      
      const { error } = await supabase.from('documents').delete().eq('id', documentToDelete);
      if (error) throw error;

      // Delete from Cloudinary if it's a Cloudinary URL
      if (docToDelete?.file_url) {
        await deleteFromCloudinary(docToDelete.file_url, 'raw');
      }

      await fetchDocuments();
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

  return (
    <div className="space-y-6 relative">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 transition-all ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="font-medium">{notification.message}</div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog.Root open={!!documentToDelete} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl bg-white p-6 shadow-lg focus:outline-none" dir="rtl">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-semibold text-slate-900">
                تأكيد الحذف
              </Dialog.Title>
              <Dialog.Close className="text-slate-400 hover:text-slate-500">
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>
            <p className="text-slate-600 mb-6">هل أنت متأكد من رغبتك في حذف هذا المستند؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex justify-end gap-3">
              <Dialog.Close asChild>
                <button className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
                  إلغاء
                </button>
              </Dialog.Close>
              <button
                onClick={confirmDelete}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                تأكيد الحذف
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">المستندات والملفات</h1>
          <p className="text-slate-500">إدارة الملفات والمستندات المدرسية ومشاركتها</p>
        </div>
        <button 
          onClick={openAddModal}
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="mr-2 h-4 w-4 ml-2" />
          إضافة مستند جديد
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              className="block w-full rounded-md border-0 py-2 pr-10 pl-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              placeholder="البحث في المستندات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative sm:w-64">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <Filter className="h-5 w-5 text-slate-400" aria-hidden="true" />
            </div>
            <select
              className="block w-full rounded-md border-0 py-2 pr-10 pl-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
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
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl shadow-sm ring-1 ring-slate-200">
          <FileText className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-lg font-medium text-slate-900">لا توجد مستندات</h3>
          <p className="text-slate-500 mt-1">لم يتم العثور على مستندات تطابق معايير البحث.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc) => {
            const dateObj = new Date(doc.created_at);
            const styles = getCategoryStyles(doc.category);
            
            return (
              <div key={doc.id} className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden flex flex-col transition-shadow hover:shadow-md">
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl ${styles.bg}`}>
                      {styles.icon}
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => openEditModal(doc)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        title="تعديل المستند"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => setDocumentToDelete(doc.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="حذف المستند"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2" title={doc.title}>
                    {doc.title}
                  </h3>
                  
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2" title={doc.description}>
                    {doc.description || 'لا يوجد وصف للمستند'}
                  </p>
                  
                  <div className="mt-auto space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${styles.bg} ${styles.text} ring-${styles.text.split('-')[1]}-600/20`}>
                        {getCategoryLabel(doc.category)}
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-slate-500 gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span dir="ltr">{dateObj.toLocaleDateString('ar-EG')}</span>
                    </div>
                  </div>
                </div>
                
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
                  <a 
                    href={doc.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <span>فتح المستند</span>
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
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-xl bg-white p-6 shadow-lg focus:outline-none max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-semibold text-slate-900">
                {currentDocument.id ? 'تعديل المستند' : 'إضافة مستند جديد'}
              </Dialog.Title>
              <Dialog.Close className="text-slate-400 hover:text-slate-500">
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>
            
            <form onSubmit={handleSaveDocument} className="space-y-5">
              <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">عنوان المستند <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="مثال: لائحة السلوك والمواظبة" 
                  className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  value={currentDocument.title || ''}
                  onChange={(e) => setCurrentDocument({...currentDocument, title: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">التصنيف <span className="text-red-500">*</span></label>
                <select 
                  required
                  className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  value={currentDocument.category || ''}
                  onChange={(e) => setCurrentDocument({...currentDocument, category: e.target.value})}
                >
                  {CATEGORY_OPTIONS.filter(opt => opt.value !== 'all').map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">الوصف (اختياري)</label>
                <textarea 
                  rows={3}
                  placeholder="وصف مختصر لمحتوى المستند..." 
                  className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  value={currentDocument.description || ''}
                  onChange={(e) => setCurrentDocument({...currentDocument, description: e.target.value})}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium leading-6 text-slate-900">الملف <span className="text-red-500">*</span></label>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setUploadType('file')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${uploadType === 'file' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      رفع ملف
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadType('link')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${uploadType === 'link' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      رابط خارجي
                    </button>
                  </div>
                </div>

                {uploadType === 'file' ? (
                  <div className="mt-2 flex justify-center rounded-lg border border-dashed border-slate-300 px-6 py-8 hover:bg-slate-50 transition-colors">
                    <div className="text-center">
                      <UploadCloud className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
                      <div className="mt-4 flex text-sm leading-6 text-slate-600 justify-center">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer rounded-md font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
                        >
                          <span>اختر ملفاً</span>
                          <input 
                            id="file-upload" 
                            name="file-upload" 
                            type="file" 
                            className="sr-only" 
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} 
                          />
                        </label>
                        <p className="pr-1">أو اسحب وأفلت هنا</p>
                      </div>
                      <p className="text-xs leading-5 text-slate-500 mt-2">
                        {selectedFile ? (
                          <span className="font-medium text-indigo-600">{selectedFile.name}</span>
                        ) : (
                          'PDF, DOCX, XLSX, صور حتى 10MB'
                        )}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative mt-2 rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <LinkIcon className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="url"
                      className="block w-full rounded-md border-0 py-2 pl-10 pr-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 text-left"
                      dir="ltr"
                      placeholder="https://drive.google.com/..."
                      value={currentDocument.file_url || ''}
                      onChange={(e) => setCurrentDocument({...currentDocument, file_url: e.target.value})}
                    />
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ المستند'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
