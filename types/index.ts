import { z } from 'zod';
import * as validations from '../lib/validations';

export * from './question';
export * from '../lib/validations';

// Derived types that include relations or specific organization
export interface OrganizedSection extends validations.Section {
  students: validations.Student[];
}

export interface OrganizedClass extends validations.Class {
  sections: OrganizedSection[];
}

export interface OrganizedStudent {
  id: string;
  national_id: string;
  user: {
    full_name: string;
    email: string;
  };
}

// Re-export UserRole for convenience
export type { UserRole } from '../lib/validations';

// Ensure all entities have a consistent interface for the UI
// These can be used when we need to extend the base schema types with UI-specific fields
export interface AssignmentWithMeta extends validations.Assignment {
  subject_name?: string;
  teacher_name?: string;
  submission_count?: number;
  graded_count?: number;
  subjects?: validations.Subject;
  teachers?: validations.Teacher;
  assignment_sections?: {
    section_id: string;
    sections?: validations.Section;
  }[];
}

export interface SubmissionWithStudent extends validations.AssignmentSubmission {
  students?: validations.Student;
}

export interface ExamWithMeta extends validations.Exam {
  subject_name?: string;
  teacher_name?: string;
  section_name?: string;
  submission_status?: 'pending' | 'submitted' | 'graded';
  score?: number;
  submission_count?: number;
  graded_count?: number;
  avg_score?: number;
  question_count?: number;
}

export interface ExamDetails {
  exam: validations.Exam & { section_ids: string[] };
  questions: Question[];
}

export interface ExamResults {
  exam: validations.Exam;
  students: { id: string, full_name: string, email: string, section_name: string }[];
  attempts: validations.ExamAttempt[];
  questions: Question[];
  answers: any[]; // Still need to define ExamAnswer if it exists
}
