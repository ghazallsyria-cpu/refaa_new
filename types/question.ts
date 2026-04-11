export type QuestionType = 'multiple_choice' | 'true_false' | 'multi_select' | 'essay' | 'fill_in_blank' | 'matching' | 'ordering' | 'text' | 'paragraph' | 'checkbox' | 'file';

export interface Option {
  id: string;
  content: string;
  is_correct: boolean;
  order_index?: number;
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
  is_required?: boolean; // 🚀 الاسم المعتمد في قاعدة البيانات
  isRequired?: boolean;  // 🚀 أبقيناها للتوافق مع الأكواد القديمة
}

export const normalizeQuestion = (raw: Partial<Question> & { text?: string }): Question => {
  return {
    id: raw.id || crypto.randomUUID(),
    type: raw.type || 'text',
    content: raw.content || raw.text || '',
    points: raw.points || 0,
    explanation: raw.explanation,
    options: Array.isArray(raw.options) 
      ? raw.options
          .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
          .map((o) => typeof o === 'string' 
            ? { id: crypto.randomUUID(), content: o, is_correct: false } 
            : o) 
      : [],
    media_url: raw.media_url,
    media_type: raw.media_type,
    // 🚀 نوحد القيمة هنا لضمان عملها في كل مكان
    is_required: raw.is_required !== undefined ? raw.is_required : (raw.isRequired !== undefined ? raw.isRequired : true),
    isRequired: raw.is_required !== undefined ? raw.is_required : (raw.isRequired !== undefined ? raw.isRequired : true),
  };
};

export const createQuestion = (type: QuestionType): Question => {
  const base: Question = {
    id: crypto.randomUUID(),
    type,
    content: '',
    points: 1,
    options: [],
    is_required: true,
    isRequired: true,
  };

  switch (type) {
    case 'multiple_choice':
    case 'multi_select':
      base.options = [
        { id: crypto.randomUUID(), content: 'الخيار الأول', is_correct: true },
        { id: crypto.randomUUID(), content: 'الخيار الثاني', is_correct: false },
      ];
      break;
    case 'true_false':
      base.options = [
        { id: crypto.randomUUID(), content: 'صح', is_correct: true },
        { id: crypto.randomUUID(), content: 'خطأ', is_correct: false },
      ];
      break;
  }

  return base;
};
