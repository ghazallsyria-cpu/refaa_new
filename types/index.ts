export * from './question';

export type UserRole = 'admin' | 'teacher' | 'student' | 'parent' | 'management';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  must_reset_password?: boolean;
  created_at: string;
}

export interface Teacher {
  id: string;
  user_id: string;
  national_id: string;
  users?: Partial<User>;
}

export interface Student {
  id: string;
  user_id: string;
  national_id: string;
  section_id: string;
  users?: Partial<User>;
  sections?: Section;
}

export interface Parent {
  id: string;
  user_id: string;
  national_id: string;
  users?: Partial<User>;
  students?: Student[];
}

export interface Subject {
  id: string;
  name: string;
  created_at?: string;
}

export interface Class {
  id: string;
  name: string;
  created_at?: string;
}

export interface Section {
  id: string;
  name: string;
  class_id: string;
  classes?: Class;
  created_at?: string;
}

export interface Assignment {
  id: string;
  title: string;
  description?: string;
  subject_id: string;
  teacher_id: string;
  due_date: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  file_url?: string;
  subjects?: Subject;
  teachers?: Teacher;
  assignment_sections?: {
    section_id: string;
    sections?: Section;
  }[];
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  content?: string;
  file_url?: string;
  status: 'submitted' | 'graded';
  grade?: number;
  feedback?: string;
  submitted_at: string;
  graded_at?: string;
  graded_by?: string;
  students?: Student;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id?: string;
  section_id?: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: Partial<User>;
  receiver?: Partial<User>;
}

export interface OrganizedStudent {
  id: string;
  national_id: string;
  user: {
    full_name: string;
    email: string;
  };
}

export interface OrganizedClass extends Class {
  sections: OrganizedSection[];
}

export interface PlatformSettings {
  id: string;
  is_open: boolean;
  open_date: string;
  close_date: string;
  message: string;
  school_name: string;
  academic_year: string;
  semester: string;
  address: string;
  phone: string;
  email: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  session_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  created_at: string;
}

export interface AttendanceSession {
  id: string;
  teacher_id: string;
  section_id: string;
  subject_id: string;
  period_number: number;
  date: string;
  created_at: string;
}

export interface Exam {
  id: string;
  title: string;
  description?: string;
  subject_id: string;
  teacher_id: string;
  section_id: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  total_points: number;
  passing_points: number;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  student_id: string;
  score: number;
  status: 'started' | 'submitted' | 'graded';
  started_at: string;
  completed_at?: string;
}

export interface Schedule {
  id: string;
  section_id: string;
  teacher_id: string;
  subject_id: string;
  day_of_week: number;
  period: number;
  start_time: string;
  end_time: string;
}

export interface AssignmentQuestion {
  id: string;
  assignment_id: string;
  question_text: string;
  question_type: 'text' | 'paragraph' | 'multiple_choice' | 'checkbox';
  options?: string[];
  points: number;
  is_required: boolean;
  order: number;
}

export interface AssignmentAnswer {
  id: string;
  submission_id: string;
  question_id: string;
  answer_text?: string;
  selected_options?: string[];
  is_correct?: boolean;
  points_earned?: number;
  feedback?: string;
}
