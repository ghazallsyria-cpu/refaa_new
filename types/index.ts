// =====================================================================
// types/index.ts — مدرسة الرفعة النموذجية
// أنواع TypeScript الشاملة لكل كيانات النظام
// =====================================================================

export type UserRole = 'admin' | 'management' | 'teacher' | 'student' | 'parent' | 'all';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type QuestionType = 'multiple_choice' | 'true_false' | 'multi_select' | 'essay' | 'fill_in_blank' | 'matching' | 'ordering';
export type ExamStatus = 'draft' | 'published' | 'archived';
export type AttemptStatus = 'ongoing' | 'completed' | 'graded';
export type AssignmentStatus = 'draft' | 'published' | 'archived';
export type Gender = 'male' | 'female';

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface User extends BaseEntity {
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  must_reset_password: boolean;
}

export interface Class extends BaseEntity {
  name: string;
  level: number;
}

export interface Section extends BaseEntity {
  class_id: string;
  name: string;
  capacity: number;
  classes?: Class;
}

export interface Subject extends BaseEntity {
  name: string;
  code?: string;
}

export interface Parent extends BaseEntity {
  national_id?: string;
  address?: string;
  job_title?: string;
  users?: Pick<User, 'full_name' | 'email' | 'phone' | 'avatar_url'>;
}

export interface Student extends BaseEntity {
  national_id: string;
  parent_id?: string;
  section_id?: string;
  date_of_birth?: string;
  gender?: Gender;
  address?: string;
  enrollment_date: string;
  users?: Pick<User, 'full_name' | 'email' | 'phone' | 'avatar_url' | 'role'>;
  sections?: Section;
  parents?: Parent;
}

export interface Teacher extends BaseEntity {
  national_id: string;
  specialization?: string;
  hire_date: string;
  zoom_link?: string;
  users?: Pick<User, 'full_name' | 'email' | 'phone' | 'avatar_url'>;
}

export interface TeacherSection {
  id: string;
  teacher_id: string;
  section_id: string;
  subject_id: string;
  teachers?: Teacher;
  sections?: Section;
  subjects?: Subject;
}

export interface AttendanceSession extends BaseEntity {
  teacher_id: string;
  section_id: string;
  subject_id: string;
  period_number: number;
  date: string;
  status: 'draft' | 'submitted';
  sections?: Section;
  subjects?: Subject;
}

export interface AttendanceRecord extends BaseEntity {
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
  notes?: string;
  students?: { id: string; users?: Pick<User, 'full_name'> };
}

export interface ExamSettings {
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_result_immediately: boolean;
  allow_backtracking: boolean;
}

export interface Exam extends BaseEntity {
  teacher_id: string;
  subject_id: string;
  section_id?: string;
  title: string;
  description?: string;
  duration?: number;
  max_attempts: number;
  pass_score: number;
  total_marks: number;
  exam_date?: string;
  start_time: string;
  end_time: string;
  settings: ExamSettings;
  status: ExamStatus;
  teachers?: { users?: Pick<User, 'full_name'> };
  subjects?: Subject;
  sections?: Section;
}

export interface QuestionOption {
  id: string;
  question_id: string;
  content: string;
  is_correct: boolean;
  order_index: number;
}

export interface Question {
  id: string;
  exam_id: string;
  type: QuestionType;
  content: string;
  media_url?: string;
  media_type?: string;
  points: number;
  order_index: number;
  explanation?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  options?: QuestionOption[];
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  student_id: string;
  started_at: string;
  completed_at?: string;
  score: number;
  status: AttemptStatus;
  feedback?: string;
  exams?: Pick<Exam, 'title' | 'pass_score' | 'total_marks'>;
}

export interface StudentAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option_id?: string;
  text_answer?: string;
  is_correct?: boolean;
  points_earned: number;
  created_at: string;
}

export interface Grade extends BaseEntity {
  exam_id: string;
  student_id: string;
  score: number;
  notes?: string;
  exams?: Pick<Exam, 'title' | 'total_marks' | 'pass_score'>;
  students?: { id: string; users?: Pick<User, 'full_name'> };
}

export interface Assignment extends BaseEntity {
  title: string;
  description?: string;
  subject_id: string;
  section_id?: string;
  teacher_id: string;
  due_date: string;
  file_url?: string;
  status: AssignmentStatus;
  subjects?: Subject;
  sections?: Section;
  teachers?: { users?: Pick<User, 'full_name'> };
}

export interface AssignmentSection {
  id: string;
  assignment_id: string;
  section_id: string;
  created_at: string;
  sections?: Section;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  content?: string;
  file_url?: string;
  submitted_at: string;
  grade?: number;
  feedback?: string;
  graded_at?: string;
  graded_by?: string;
  students?: { id: string; users?: Pick<User, 'full_name'> };
  assignments?: Pick<Assignment, 'title' | 'due_date'>;
}

export interface Schedule extends BaseEntity {
  section_id: string;
  subject_id: string;
  teacher_id: string;
  day_of_week: number;
  period: number;
  start_time?: string;
  end_time?: string;
  sections?: Section;
  subjects?: Subject;
  teachers?: { users?: Pick<User, 'full_name'> };
}

export interface ClassPeriod {
  id: string;
  period_number: number;
  start_time: string;
  end_time: string;
  label?: string;
  created_at: string;
}

export interface Announcement extends BaseEntity {
  title: string;
  content: string;
  author_id?: string;
  target_role?: UserRole;
  users?: Pick<User, 'full_name' | 'avatar_url'>;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id?: string;
  section_id?: string;
  subject?: string;
  content: string;
  is_read: boolean;
  is_group: boolean;
  created_at: string;
  sender?: Pick<User, 'full_name' | 'avatar_url'>;
  receiver?: Pick<User, 'full_name' | 'avatar_url'>;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: 'attendance' | 'grade' | 'assignment' | 'exam' | 'announcement' | 'message' | 'system';
  is_read: boolean;
  related_entity_id?: string;
  created_at: string;
}

export interface PlatformSettings {
  id: string;
  is_open: boolean;
  message: string;
  open_date?: string;
  close_date?: string;
  school_name: string;
  academic_year?: string;
  created_at: string;
  updated_at: string;
}

export interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthContextType {
  user: User | null;
  userRole: UserRole | null;
  userName: string;
  mustResetPassword: boolean;
  isChecking: boolean;
  isAdminByEmail: boolean;
  platformClosed: boolean;
  closeMessage: string;
  signOut: () => Promise<void>;
}
