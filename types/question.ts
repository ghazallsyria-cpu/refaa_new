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
