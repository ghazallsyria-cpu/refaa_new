// ============================================================
// SINGLE SOURCE OF TRUTH — Question Domain Model
// ============================================================

export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'multi_select'
  | 'essay'
  | 'fill_in_blank'
  | 'matching'
  | 'ordering'
  | 'text'
  | 'paragraph'
  | 'checkbox'
  | 'file';

export interface Option {
  id: string;
  content: string;
  is_correct: boolean;
}

export interface Question {
  id: string;
  type: QuestionType;
  content: string;
  points: number;
  explanation?: string;
  options: Option[];
  media_url?: string;
  media_type?: 'image' | 'video' | 'pdf';
  isRequired: boolean;
}

// ============================================================
// normalizeQuestion
// ============================================================

export const normalizeQuestion = (raw: unknown): Question => {
  const r = raw as Record<string, unknown>;

  return {
    id: (r.id as string) || crypto.randomUUID(),
    type: (r.type as QuestionType) || 'text',
    content:
      (r.content as string) ||
      (r.text as string) ||
      (r.question_text as string) ||
      '',
    points: Number(r.points) || 0,
    explanation: r.explanation as string | undefined,
    options: normalizeOptions(r.options),
    media_url: r.media_url as string | undefined,
    media_type: r.media_type as Question['media_type'],
    isRequired: Boolean(r.isRequired ?? r.is_required),
  };
};

// ============================================================
// normalizeOptions
// ============================================================

function normalizeOptions(raw: unknown): Option[] {
  if (!Array.isArray(raw)) return [];

  return raw.map((o) => {
    if (typeof o === 'string') {
      return {
        id: crypto.randomUUID(),
        content: o,
        is_correct: false,
      };
    }

    const opt = o as Record<string, unknown>;

    return {
      id: (opt.id as string) || crypto.randomUUID(),
      content: (opt.content as string) || (opt.text as string) || '',
      is_correct: Boolean(opt.is_correct),
    };
  });
}

// ============================================================
// newQuestion
// ============================================================

export const newQuestion = (
  type: QuestionType = 'text'
): Question => ({
  id: crypto.randomUUID(),
  type,
  content: '',
  points: 1,
  options:
    type === 'multiple_choice' || type === 'multi_select'
      ? [
          { id: crypto.randomUUID(), content: 'الخيار الأول', is_correct: true },
          { id: crypto.randomUUID(), content: 'الخيار الثاني', is_correct: false },
        ]
      : type === 'true_false'
      ? [
          { id: crypto.randomUUID(), content: 'صح', is_correct: true },
          { id: crypto.randomUUID(), content: 'خطأ', is_correct: false },
        ]
      : type === 'checkbox'
      ? [{ id: crypto.randomUUID(), content: 'خيار 1', is_correct: false }]
      : [],
  isRequired: true,
});

// ============================================================
// toAssignmentQuestion
// ============================================================

export const toAssignmentQuestion = (q: Question) => ({
  id: q.id,
  question_text: q.content,
  question_type: q.type,
  options: q.options.map((o) => o.content),
  points: q.points,
  is_required: q.isRequired,
});
