'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Plus, Save, Eye, Settings, Trash2,
  Copy, GripVertical, Image as ImageIcon,
  Video, Check, X, AlertCircle, ArrowRight,
  Type, List, CheckSquare,
  AlignLeft, Hash, Clock
} from 'lucide-react';
import { motion, Reorder, AnimatePresence } from 'motion/react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Switch from '@radix-ui/react-switch';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

import { deleteFromCloudinary } from '@/lib/cloudinary';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import { useAuth } from '@/context/auth-context';
import { useSchoolFormData } from '@/hooks/use-school-form-data';
import ImageUpload from '@/components/ImageUpload';

import { Question, QuestionType, Option } from '@/types/question';

type ExamData = {
  id?: string;
  title: string;
  description: string;
  subject_id: string;
  section_ids?: string[];
  teacher_id?: string;
  duration: number;
  max_attempts: number;
  max_score: number;
  exam_date: string;
  start_time?: string;
  end_time?: string;
  status: 'draft' | 'published';
  settings: {
    shuffle_questions: boolean;
    shuffle_options: boolean;
    show_result_immediately: boolean;
    allow_backtracking: boolean;
  };
};

type Student = {
  user: { full_name: string };
  national_id: string;
};

type Section = {
  id: string;
  name: string;
  students: Student[];
};

type ClassData = {
  id: string;
  name: string;
  sections: Section[];
};

export default function QuizBuilder() {
  const params = useParams();
  const router = useRouter();
  const { user, userRole } = useAuth();
  const { fetchExamDetails, saveExam } = useExamsSystem();

  const isNew = params.id === 'new';

  const [exam, setExam] = useState<ExamData>({
    title: '',
    description: '',
    subject_id: '',
    section_ids: [],
    teacher_id: '',
    duration: 30,
    max_attempts: 1,
    max_score: 100,
    exam_date: new Date().toISOString().split('T')[0],
    start_time: '08:00',
    end_time: '23:59',
    status: 'draft',
    settings: {
      shuffle_questions: false,
      shuffle_options: false,
      show_result_immediately: true,
      allow_backtracking: true
    }
  });

  const { data: formData } = useSchoolFormData();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] =
    useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const subjects = formData?.subjects || [];
  const sections = (formData?.sections || []).map(s => ({
    id: s.id,
    name: s.classes?.name ? `${s.classes.name} - ${s.name}` : s.name
  }));

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const addQuestion = useCallback((type: QuestionType) => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      type,
      content: '',
      points: 1,
      isRequired: false,
      options:
        type === 'multiple_choice' || type === 'multi_select'
          ? [
              { id: crypto.randomUUID(), content: '', is_correct: false },
              { id: crypto.randomUUID(), content: '', is_correct: false }
            ]
          : type === 'true_false'
          ? [
              { id: crypto.randomUUID(), content: 'صح', is_correct: true },
              { id: crypto.randomUUID(), content: 'خطأ', is_correct: false }
            ]
          : []
    };

    setQuestions(prev => [...prev, newQuestion]);
  }, []);

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(prev => prev.map(q => (q.id === id ? { ...q, ...updates } : q)));
  };

  const updateOption = (qid: string, oid: string, updates: Partial<Option>) => {
    setQuestions(prev =>
      prev.map(q => {
        if (q.id !== qid) return q;

        const options = q.options.map(o => {
          if (o.id === oid) return { ...o, ...updates };
          return updates.is_correct ? { ...o, is_correct: false } : o;
        });

        return { ...q, options };
      })
    );
  };

  const deleteQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleSave = async () => {
    if (!exam.title || !exam.subject_id) return;

    const total = questions.reduce((s, q) => s + Number(q.points || 0), 0);
    if (total !== Number(exam.max_score)) {
      showNotification('error', 'مجموع الدرجات غير مطابق');
      return;
    }

    setSaving(true);

    try {
      await saveExam(exam, questions, isNew);
      router.push('/exams');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!isNew) {
        const res = await fetchExamDetails(params.id as string);
        setExam(res.exam);
        setQuestions(res.questions || []);
      } else {
        addQuestion('multiple_choice');
      }
      setLoading(false);
    };

    load();
  }, [isNew, params.id]);

  if (loading) return <div className="p-10">Loading...</div>;

  return (
    <div className="p-6 space-y-10">
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-white shadow p-4 rounded">
          {notification.message}
        </div>
      )}

      <input
        value={exam.title}
        onChange={e => setExam({ ...exam, title: e.target.value })}
        placeholder="Title"
        className="text-2xl font-bold w-full"
      />

      <input
        type="number"
        value={exam.max_score}
        onChange={e => setExam({ ...exam, max_score: Number(e.target.value) })}
      />

      <div className="space-y-6">
        {questions.map(q => (
          <div key={q.id} className="border p-4 rounded">
            <input
              value={q.content}
              onChange={e => updateQuestion(q.id, { content: e.target.value })}
            />

            {q.options.map(o => (
              <div key={o.id} className="flex gap-2">
                <input
                  value={o.content}
                  onChange={e =>
                    updateOption(q.id, o.id, { content: e.target.value })
                  }
                />
                <button
                  onClick={() =>
                    updateOption(q.id, o.id, { is_correct: !o.is_correct })
                  }
                >
                  ✓
                </button>
              </div>
            ))}

            <button onClick={() => deleteQuestion(q.id)}>Delete</button>
          </div>
        ))}
      </div>

      <button onClick={() => addQuestion('multiple_choice')}>
        Add Question
      </button>

      <button onClick={handleSave} disabled={saving}>
        Save
      </button>
    </div>
  );
}
