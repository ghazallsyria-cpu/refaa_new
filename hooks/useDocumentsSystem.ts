import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { deleteFromCloudinary } from '@/lib/cloudinary';

export type Document = {
  id: string;
  title: string;
  description: string;
  file_url: string;
  category: string;
  created_at: string;
  target_role?: string; // 🚀 الإضافة الجديدة للجمهور المستهدف
};

export function useDocumentsSystem() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as unknown) as Document[] || [];
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching documents';
      console.error('Error fetching documents:', err);
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const saveDocument = useCallback(async (document: Partial<Document>, file?: File): Promise<Document> => {
    setLoading(true);
    setError(null);
    try {
      let finalFileUrl = document.file_url;

      // Handle File Upload to Cloudinary
      if (file) {
        if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || !process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) {
          throw new Error('Cloudinary configuration missing');
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
          { method: 'POST', body: formData }
        );

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error?.message || 'Failed to upload file to Cloudinary');
        }

        finalFileUrl = data.secure_url;
      }

      // Delete old file if it's being replaced and it belongs to Cloudinary
      if (document.id && file && document.file_url && document.file_url.includes('cloudinary')) {
        try {
          await deleteFromCloudinary(document.file_url, 'raw');
        } catch (e) { console.warn("Failed to delete old Cloudinary file, ignoring.", e); }
      }

      const response = await fetch('/api/documents/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...document,
          file_url: finalFileUrl
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save document');
      return data.data as Document;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error saving document';
      console.error('Error saving document:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteDocument = useCallback(async (id: string, fileUrl?: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/delete?id=${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete document from DB');

      if (fileUrl && fileUrl.includes('cloudinary')) {
        try {
          await deleteFromCloudinary(fileUrl, 'raw');
        } catch (e) { console.warn("Failed to delete Cloudinary file, but DB record was deleted.", e); }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error deleting document';
      console.error('Error deleting document:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, fetchDocuments, saveDocument, deleteDocument };
}
