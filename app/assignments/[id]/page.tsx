'use client';

import { useState, useEffect, useCallback, use } from 'react';
import {
  FileText,
  Clock,
  Link as LinkIcon,
  Users,
  User,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Upload,
  Edit2,
  Trash2,
  Share2,
  Eye,
  X,
  Calendar,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import AssignmentForm from '@/components/assignment-form';
import AssignmentBuilder from '@/components/assignment-builder';
import ImageUpload from '@/components/ImageUpload';
import Image from 'next/image';
import { Question } from '@/types/question';
import { format } from 'date-fns';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { useAssignmentsSystem } from '@/hooks/useAssignmentsSystem';
import { useAuth } from '@/context/auth-context';

type Assignment = {
  id: string;
  title: string;
  description: string;
  due_date: string;
  file_url: string;
  subjects?: { name: string };
  sections?: { name: string; classes?: { name: string } };
  teachers?: { users?: { id: string; full_name: string } };
};

type Submission = {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string;
  file_url: string;
  status: string;
  grade: number;
  feedback: string;
  submitted_at: string;
  students?: { users?: { full_name: string } };
};

export default function AssignmentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const assignmentId = resolvedParams.id;

  const router = useRouter();
  const { user, userRole } = useAuth();
  const { fetchAssignmentDetails, submitAssignment, saveAssignment, deleteAssignment } =
    useAssignmentsSystem();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [myAnswers, setMyAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'submissions' | 'preview'>('submissions');

  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editData, setEditData] = useState<Partial<Assignment>>({});

  const [content, setContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const details = await fetchAssignmentDetails(assignmentId);

      setAssignment(details.assignment as any);
      setEditData(details.assignment as any);

      if (details.questions) {
        setQuestions(
          details.questions.map((q: any) => ({
            id: q.id,
            content: q.question_text || '',
            type: q.question_type,
            options: Array.isArray(q.options) ? q.options : [],
            points: q.points || 0,
            isRequired: q.is_required || false
          }))
        );
      }

      if (userRole === 'student') {
        if (details.submission) {
          setMySubmission(details.submission as any);
        }
      } else {
        setSubmissions(details.allSubmissions || []);
      }
    } catch (e: any) {
      showNotification('error', e.message);
    } finally {
      setLoading(false);
    }
  }, [assignmentId, user, userRole, fetchAssignmentDetails]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmitAnswers = async (answers: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const payload = Object.entries(answers).map(([qId, value]) => ({
        question_id: qId,
        answer_text: typeof value === 'string' ? value : null,
        selected_options: typeof value !== 'string' ? value : null
      }));

      await submitAssignment(assignmentId, payload, mySubmission?.id);
      showNotification('success', 'OK');
      await fetchData();
    } catch (e: any) {
      showNotification('error', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingEdit(true);
    try {
      await saveAssignment(
        {
          title: editData.title,
          description: editData.description,
          due_date: editData.due_date
        },
        assignmentId,
        questions as any,
        [],
        []
      );

      setIsEditModalOpen(false);
      await fetchData();
    } catch (e: any) {
      showNotification('error', e.message);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteAssignmentAction = async () => {
    try {
      if (assignment?.file_url) {
        await deleteFromCloudinary(assignment.file_url);
      }

      for (const s of submissions) {
        if (s.file_url) await deleteFromCloudinary(s.file_url);
      }

      await deleteAssignment(assignmentId);
      router.push('/assignments');
    } catch (e: any) {
      showNotification('error', e.message);
    }
  };

  const copyAssignmentLink = () => {
    navigator.clipboard.writeText(window.location.href);
    showNotification('success', 'copied');
  };

  if (loading) return <div />;

  if (!assignment) return <div />;

  return (
    <div className="space-y-8">
      {notification && (
        <div>
          {notification.message}
        </div>
      )}

      <div className="flex justify-between">
        <h1>{assignment.title}</h1>
      </div>

      <div>
        <p>{assignment.description}</p>
      </div>

      {userRole === 'student' && (
        <div>
          {questions.length > 0 ? (
            <AssignmentForm
              questions={questions}
              onSubmit={handleSubmitAnswers}
              isSubmitting={isSubmitting}
              initialAnswers={{}}
              readOnly={!!mySubmission}
            />
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmitAnswers({});
              }}
            />
          )}
        </div>
      )}

      {(userRole === 'teacher' || userRole === 'admin') && (
        <div>
          {activeTab === 'submissions' ? (
            <div>
              {submissions.map((s) => (
                <div key={s.id}>{s.students?.users?.full_name}</div>
              ))}
            </div>
          ) : (
            <AssignmentForm
              questions={questions}
              onSubmit={() => {}}
              initialAnswers={{}}
              readOnly={false}
            />
          )}
        </div>
      )}

      <Dialog.Root open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <Dialog.Content>
          <button onClick={handleDeleteAssignmentAction}>delete</button>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <Dialog.Content>
          <form onSubmit={handleUpdateAssignment}>
            <input
              value={editData.title || ''}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
            />
            <button type="submit">save</button>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
}
