/**
 * @file types/exam.ts
 * @description أنواع TypeScript الصارمة المستنتجة من Schema قاعدة البيانات.
 */

import type { JSX } from 'react';

/* ────────────────────────────────────────────────────────────────────────── */
/* أنواع قاعدة البيانات الأساسية (Base DB Types)                            */
/* ────────────────────────────────────────────────────────────────────────── */

export interface ExamCommittee {
  id: string;
  name: string;
  location: string | null;
  capacity: number | null;
  academic_year: string | null;
  semester: string | null;
  created_at: string | null;
}

export interface StudentSeatAllocation {
  id: string;
  student_id: string;
  committee_id: string;
  seat_number: string;
  academic_year: string | null;
  semester: string | null;
  created_at: string | null;
}

export interface CommitteeInvigilator {
  id: string;
  committee_id: string;
  teacher_id: string;
  role: string | null;
  created_at: string | null;
  status: string | null;
  excuse_reason: string | null;
  signed_at: string | null;
  exam_date: string | null;
}

export interface ExamTimetable {
  id: string;
  subject_id: string;
  class_level: number;
  exam_date: string;
  start_time: string;
  end_time: string;
  academic_year: string | null;
  semester: string | null;
  created_at: string | null;
}

export interface ExamCommitteeHead {
  id: string;
  timetable_id: string;
  head_teacher_id: string;
  committees_range: string;
  is_delivered: boolean | null;
  delivered_at: string | null;
  received_by: string | null;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* أنواع العلاقات (Relation Types) — ما يُرجعه Supabase عند الـ JOIN         */
/* ────────────────────────────────────────────────────────────────────────── */

export interface UserMeta {
  full_name: string | null;
  avatar_url: string | null;
}

export interface SubjectMeta {
  name: string | null;
}

export interface ClassMeta {
  name: string | null;
  level: number | null;
}

export interface SectionMeta {
  name: string | null;
  classes: ClassMeta | ClassMeta[] | null;
}

export interface StudentWithRelations {
  id: string;
  next_year_track: string | null;
  users: UserMeta | UserMeta[] | null;
  sections: SectionMeta | SectionMeta[] | null;
}

export interface TeacherSubject {
  subjects: SubjectMeta | SubjectMeta[] | null;
}

export interface TeacherWithRelations {
  id: string;
  is_excluded_from_exams: boolean | null;
  is_committee_head: boolean | null;
  users: UserMeta | UserMeta[] | null;
  teacher_subjects: TeacherSubject[] | null;
}

export interface InvigilatorWithRelations extends CommitteeInvigilator {
  users: UserMeta | UserMeta[] | null;
}

export interface HeadWithRelations extends ExamCommitteeHead {
  users: UserMeta | UserMeta[] | null;
  exam_timetables: ExamTimetable | ExamTimetable[] | null;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* أنواع الـ UI / State                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

export interface FormattedTeacher {
  id: string;
  full_name: string;
  avatar_url: string | null;
  subjectsStr: string;
  is_excluded_from_exams: boolean;
  is_committee_head: boolean;
}

export interface StudentStats {
  g10: number;
  g11_sci: number;
  g11_lit: number;
  totalAllocated: number;
}

export interface SeatedStudent {
  id: string;
  fullName: string;
  seatNumber: string;
}

export interface AllocationPayload {
  student_id: string;
  committee_id: string;
  seat_number: string;
  academic_year: string;
  semester: string;
}

export interface DistributionResult {
  success: boolean;
  allocatedCount: number;
  committeesUsed: number;
  overflowDetected: boolean;
}

export interface PrintPayload {
  students: StudentAllocationRow[];
  committee: ExamCommittee;
  invigilators: InvigilatorWithRelations[];
  className?: string;
}

export type PrintType = 'door_sheet' | 'desk_cards' | 'invigilator_ids' | 'class_cards';

export type ActiveTab = 'management' | 'invigilators_radar' | 'heads_radar' | 'daily_stats';

/** صف كامل من استعلام مقاعد الطلاب (للطباعة) */
export interface StudentAllocationRow {
  seat_number: string | null;
  student_id: string | null;
  students: StudentWithRelations | StudentWithRelations[] | null;
  exam_committees?: ExamCommittee | ExamCommittee[] | null;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* أنواع المكونات (Component Props)                                          */
/* ────────────────────────────────────────────────────────────────────────── */

export interface CommitteeCardProps {
  committee: ExamCommittee;
  studentCount: number;
  invigilators: InvigilatorWithRelations[];
  activeExamDate: string;
  onView: (committee: ExamCommittee) => void;
  onEdit: (committee: ExamCommittee) => void;
  onDelete: (id: string) => void;
  onPrint: (committeeId: string, type: PrintType) => void;
  onAddInvigilator: (committee: ExamCommittee) => void;
  onRemoveInvigilator: (invigilator: InvigilatorWithRelations) => void;
  onReadExcuse: (invigilator: InvigilatorWithRelations) => void;
  isDeleting: boolean;
}

export interface ViewCommitteeDetails {
  students: StudentAllocationRow[];
  invigilators: InvigilatorWithRelations[];
  loading: boolean;
}
