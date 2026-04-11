'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Plus, Save, Eye, Settings, Trash2, Copy, GripVertical, 
  Image as ImageIcon, UploadCloud, ChevronDown, Check, X, 
  HelpCircle, AlertCircle, ArrowRight, Hash, Clock, CheckCircle, List, CheckSquare, AlignLeft, Type
} from 'lucide-react';
import { motion, Reorder, AnimatePresence } from 'motion/react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Switch from '@radix-ui/react-switch';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import ForumEditor from '@/components/ForumEditor'; 
import { Question, QuestionType, Option, createQuestion } from '@/types/question';
import { useAuth } from '@/context/auth-context';
import { useSchoolFormData } from '@/hooks/useSchoolFormData';
import ImageUpload from '@/components/ImageUpload';

type ExamData = {
  id?: string; title: string; description: string | null; subject_id: string; section_ids?: string[]; teacher_id?: string; duration: number; max_attempts: number; max_score: number; exam_date: string; start_time?: string; end_time?: string; status: 'draft' | 'published' | 'archived';
  settings?: { shuffle_questions?: boolean; shuffle_options?: boolean; show_results_immediately?: boolean; allow_backtracking?: boolean; prevent_tab_switch?: boolean; prevent_copy?: boolean; };
};

export default function QuizBuilder() {
  const params = useParams();
  const router = useRouter();
  const { user, userRole } = useAuth() as any;
  const isNew = params.id === 'new';
  const { fetchExamDetails, saveExam } = useExamsSystem();
  
  const [exam, setExam] = useState<ExamData>({
    title: '', description: '', subject_id: '', section_ids: [], teacher_id: '', duration: 30, max_attempts: 1, max_score: 100, exam_date: new Date().toISOString().split('T')[0], start_time: '08:00', end_time: '23:59', status: 'draft',
    settings: { shuffle_questions: false, shuffle_options: false, show_results_immediately: true, allow_backtracking: true, prevent_tab_switch: false, prevent_copy: true }
  });

  const { data: formData } = useSchoolFormData();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const subjects = formData?.subjects || [];
  const sections = (formData?.sections || []).map((s: any) => ({ id: s.id, name: s.classes?.name ? `${s.classes.name} - ${s.name}` : s.name }));
  const teachers = (formData?.teachers || []).map((t: any) => ({ id: t.id, full_name: t.user?.full_name || '' }));

  const addQuestion = useCallback((type: QuestionType | 'file' | 'file_upload') => {
    const newQuestion: any = { ...createQuestion(type as QuestionType), type: type };
    if (type === 'true_false') {
        newQuestion.options = [{ id: crypto.randomUUID(), content: 'صح', is_correct: true }, { id: crypto.randomUUID(), content: 'خطأ', is_correct: false }];
    }
    setQuestions(prev => [...prev, newQuestion]);
  }, []);

  const fetchInitialData = useCallback(async () => {
    try {
      if (!isNew) {
        const { exam: examData, questions: questionsData } = await fetchExamDetails(params.id as string);
        setExam({ ...examData, section_ids: examData.section_ids || [] });
        setQuestions((questionsData || []).map((q: any) => {
           let qType = q.type;
           let qContent = q.content || '';
           // تنظيف النصوص يدوياً بدون Regex
           ['[[[', '
