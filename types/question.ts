export type QuestionType = 'multiple_choice' | 'true_false' | 'multi_select' | 'essay' | 'fill_in_blank' | 'matching' | 'ordering' | 'text' | 'paragraph' | 'checkbox' | 'file';

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
  text?: string; // For backward compatibility
  isRequired?: boolean; // For backward compatibility
}

export interface AssignmentQuestion {
  id: string;
  text: string;
  type: 'multiple_choice' | 'text' | 'file' | 'checkbox' | 'paragraph';
  options?: string[];
  points: number;
  isRequired: boolean;
}

export const toAssignmentQuestion = (question: Question): AssignmentQuestion => {
  return {
    id: question.id,
    text: question.text || question.content,
    type: question.type as AssignmentQuestion['type'],
    options: question.options.map(o => o.content),
    points: question.points,
    isRequired: question.isRequired || false,
  };
};

export const fromAssignmentQuestion = (question: AssignmentQuestion): Question => {
  return {
    id: question.id,
    content: question.text,
    type: question.type as QuestionType,
    options: question.options?.map(o => ({ id: crypto.randomUUID(), content: o, is_correct: false })) || [],
    points: question.points,
    isRequired: question.isRequired,
  };
};
