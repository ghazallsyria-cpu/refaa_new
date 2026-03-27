// ============================================================
// SINGLE SOURCE OF TRUTH — Question Domain Model
// ============================================================
// Rule: Every component, hook, and API route in this project
// MUST import Question from this file. No local redefinitions.
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
  content: string;       // always string, never undefined
  is_correct: boolean;
}

export interface Question {
  id: string;
  type: QuestionType;
  content: string;       // REQUIRED — use content, never "text"
  points: number;
  explanation?: string;
  options: Option[];     // always an array (may be empty)
  media_url?: string;
  media_type?: 'image' | 'video' | 'pdf';
  isRequired: boolean;
}

// ============================================================
// normalizeQuestion — mandatory gateway for ALL raw API data
// ============================================================
// Call this before storing any raw API/DB response in state.
// It handles legacy "text" fields and string option arrays.
// ============================================================
export const normalizeQuestion = (raw: unknown): Question => {
  const r = raw as Record<string, unknown>;
  return {
    id: (r.id as string) || crypto.randomUUID(),
    type: (r.type as QuestionType) || 'text',
    content: (r.content as string) || (r.text as string) || (r.question_text as string) || '',
    points: Number(r.points) || 0,
    explanation: r.explanation as string | undefined,
    options: normalizeOptions(r.options),
    media_url: r.media_url as string | undefined,
    media_type: r.media_type as Question['media_type'] | undefined,
    isRequired: r.isRequired != null ? Boolean(r.isRequired) : Boolean(r.is_required),
  };
};

// ============================================================
// normalizeOptions — converts any option format to Option[]
// ============================================================
function normalizeOptions(raw: unknown): Option[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((o) => {
    if (typeof o === 'string') {
      return { id: crypto.randomUUID(), content: o, is_correct: false };
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
// newQuestion — creates a properly typed blank Question
// ============================================================
export const newQuestion = (type: QuestionType = 'text'): Question => ({
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
// toAssignmentQuestion — maps Question to API save payload
// ============================================================
// Used when persisting an assignment question to the DB.
// The DB column is question_text; we map from content.
// ============================================================
export const toAssignmentQuestion = (q: Question) => ({
  id: q.id,
  question_text: q.content,
  question_type: q.type,
  // Store options as plain string array for assignment_questions table
  options:
    q.options.length > 0 ? q.options.map((o) => o.content) : null,
  points: q.points,
  is_required: q.isRequired,
});
