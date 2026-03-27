'use client';

import { useState, useEffect } from 'react';
import {
  Plus, Search, Edit2, Trash2, FileText, Clock, Link as LinkIcon,
  X, BookOpen, Users, User, AlertCircle, Share2, Eye,
  CheckCircle2, Sparkles, Layout
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';
import AssignmentBuilder from '@/components/assignment-builder';
import { Question } from '@/types/question';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { useAssignmentsSystem } from '@/hooks/useAssignmentsSystem';
import { useSchoolFormData } from '@/hooks/use-school-form-data';
import { useAuth } from '@/context/auth-context';
import { format } from 'date-fns';

export default function AssignmentsPage() {
  const { user, userRole, isChecking: authLoading } = useAuth();
  const {
    data: assignments,
    loading: contentLoading,
    studentSubmissions,
    saveAssignment,
    deleteAssignment,
    fetchAssignmentQuestions
  } = useAssignmentsSystem();

  const { data: formData } = useSchoolFormData();

  const subjects = formData?.subjects || [];
  const sections = formData?.sections || [];
  const teachers = formData?.teachers || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [currentAssignment, setCurrentAssignment] = useState<any>({});
  const [questions, setQuestions] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [notification, setNotification] = useState<any>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const filteredAssignments = assignments.filter(a =>
    a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.subject_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);

    try {
      const payload = {
        title: currentAssignment.title,
        description: currentAssignment.description,
        subject_id: currentAssignment.subject_id,
        teacher_id: userRole === 'teacher' ? user.id : currentAssignment.teacher_id,
        due_date: currentAssignment.due_date,
        file_url: currentAssignment.file_url,
        status: 'published'
      };

      await saveAssignment(
        payload,
        currentAssignment.id || null,
        questions,
        currentAssignment.section_ids || [],
        subjects
      );

      showNotification('success', 'تم الحفظ');
      setIsModalOpen(false);
    } catch (err: any) {
      showNotification('error', err.message || 'خطأ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return;

    try {
      const assignment = assignments.find(a => a.id === assignmentToDelete);

      if (assignment?.file_url) {
        try {
          await deleteFromCloudinary(assignment.file_url, 'raw');
        } catch {}
      }

      await deleteAssignment(assignmentToDelete);
      setAssignmentToDelete(null);
    } catch {}
  };

  const openEditModal = async (assignment: any) => {
    setEditingAssignment(assignment);

    const dateObj = new Date(assignment.due_date);
    const formattedDate = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    setCurrentAssignment({
      ...assignment,
      due_date: formattedDate,
      section_ids: assignment.assignment_sections?.map((x: any) => x.section_id) || []
    });

    const q = await fetchAssignmentQuestions(assignment.id);
    setQuestions(q);

    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingAssignment(null);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    setCurrentAssignment({
      title: '',
      description: '',
      subject_id: subjects[0]?.id || '',
      teacher_id: userRole === 'teacher' ? user?.id || '' : teachers[0]?.id || '',
      due_date: tomorrow.toISOString().slice(0, 16),
      section_ids: [],
      file_url: ''
    });

    setQuestions([]);
    setIsModalOpen(true);
  };

  if (!mounted || authLoading) return null;

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-24">

      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-6 py-3 rounded-xl">
          {notification.message}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black">الواجبات</h1>

        {(userRole === 'teacher' || userRole === 'admin') && (
          <button onClick={openAddModal} className="bg-blue-600 text-white px-4 py-2 rounded-xl">
            إضافة
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-3 text-gray-400" />
        <input
          className="w-full border p-3 pr-10 rounded-xl"
          placeholder="بحث..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {contentLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {filteredAssignments.map((a) => (
            <div key={a.id} className="border rounded-xl p-4 space-y-2">

              <h3 className="font-bold">{a.title}</h3>

              <p className="text-sm text-gray-500">{a.subject_name}</p>

              <div className="flex gap-2">
                <Link href={`/assignments/${a.id}`}>
                  <Eye />
                </Link>

                <button onClick={() => openEditModal(a)}>
                  <Edit2 />
                </button>

                <button onClick={() => setAssignmentToDelete(a.id)}>
                  <Trash2 />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Content className="fixed inset-0 bg-white p-6 overflow-auto">

          <form onSubmit={handleSaveAssignment} className="space-y-4">

            <input
              value={currentAssignment.title || ''}
              onChange={(e) => setCurrentAssignment({ ...currentAssignment, title: e.target.value })}
              placeholder="العنوان"
              className="border p-2 w-full"
            />

            <textarea
              value={currentAssignment.description || ''}
              onChange={(e) => setCurrentAssignment({ ...currentAssignment, description: e.target.value })}
              placeholder="الوصف"
              className="border p-2 w-full"
            />

            <button disabled={isSubmitting} className="bg-green-600 text-white px-4 py-2 rounded-xl">
              حفظ
            </button>

          </form>

        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={!!assignmentToDelete} onOpenChange={() => setAssignmentToDelete(null)}>
        <Dialog.Content className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl space-y-4">

            <p>حذف؟</p>

            <button onClick={handleDeleteAssignment} className="bg-red-600 text-white px-4 py-2 rounded-xl">
              تأكيد
            </button>

          </div>
        </Dialog.Content>
      </Dialog.Root>

    </div>
  );
}
