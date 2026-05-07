import { z } from 'zod';

// ==========================================
// 🛡️ أدوات مساعدة (Helper Transformers)
// مشكلة شائعة في React: الحقول غير المعبأة تكون (undefined) أو ("")
// قاعدة البيانات تفضل (null). هذه الـ Helpers تقوم بالتحويل التلقائي الآمن.
// ==========================================
const nullableString = z.string().nullable().optional().transform(v => v ?? null);
const nullableNumber = z.number().nullable().optional().transform(v => v ?? null);
const nullableBoolean = z.boolean().nullable().optional().transform(v => v ?? null);

// ==========================================
// 👥 كيانات المستخدمين (User Entities)
// ==========================================

export const UserRoleSchema = z.enum(['admin', 'teacher', 'student', 'parent', 'management','staff']);

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string().min(1), // لا يمكن أن يكون الاسم فارغاً
  role: UserRoleSchema,
  phone: nullableString,
  must_reset_password: z.boolean().optional(),
  created_at: z.string().optional(), // عادة يتم توليده من قاعدة البيانات
});

// ==========================================
// 🏫 الهيكل الأكاديمي (Academic Structure)
// ==========================================

export const ClassSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1), // مثلاً: الصف الأول الثانوي
  level: z.number().int().min(1).max(12), // المرحلة من 1 إلى 12
  created_at: z.string().optional(),
});

export const SectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1), // مثلاً: الشعبة (أ)
  class_id: z.string().uuid(),
  classes: ClassSchema.partial().optional(), // كائن الصف المرتبط (لـ JOINs)
  created_at: z.string().optional(),
});

export const SubjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  created_at: z.string().optional(),
});

// ==========================================
// 📚 إدارة الأسئلة والاختبارات (Questions & Exams)
// ==========================================

// 🚀 السطر المعدل: السماح لـ API بحفظ أسئلة المقارنة والترويسة والمشاريع
export const QuestionTypeSchema = z.enum(['text', 'paragraph', 'multiple_choice', 'checkbox', 'true_false', 'comparison', 'section_header', 'multi_select', 'essay', 'fill_in_blank', 'open']);

export const ExamSettingsSchema = z.object({
  shuffle_questions: z.boolean().optional(),
  shuffle_options: z.boolean().optional(),
  show_results_immediately: z.boolean().optional(),
  allow_backtracking: z.boolean().optional(),
}).strict(); // .strict() تمنع إرسال أي حقول غير معرّفة هنا (حماية من الحقن)

export const ExamSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: nullableString,
  subject_id: z.string().uuid(),
  teacher_id: z.string().uuid(),
  duration: z.number().int().min(1), // المدة بالدقائق
  max_attempts: z.number().int().min(1).default(1),
  max_score: z.number().min(0),
  exam_date: z.string(), // ISO String
  start_time: z.string(),
  end_time: z.string(),
  status: z.enum(['draft', 'published', 'archived']),
  settings: ExamSettingsSchema.optional().nullable(),
  created_at: z.string().optional(),
});

export const ExamAttemptSchema = z.object({
  id: z.string().uuid(),
  exam_id: z.string().uuid(),
  student_id: z.string().uuid(),
  score: z.number().min(0).default(0),
  status: z.enum(['started', 'submitted', 'graded']),
  started_at: z.string(),
  completed_at: nullableString,
});

// ==========================================
// 👔 تفاصيل المستخدمين الإضافية (User Profiles)
// ==========================================

export const TeacherSectionSchema = z.object({
  teacher_id: z.string().uuid(),
  section_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  sections: SectionSchema.partial().optional(),
  subjects: SubjectSchema.partial().optional(),
});

export const TeacherSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  national_id: z.string().min(1),
  specialization: nullableString,
  zoom_link: nullableString,
  users: UserSchema.partial().optional(),
  teacher_sections: z.array(TeacherSectionSchema).optional(),
});

export const StudentSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  national_id: z.string().min(1),
  section_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable().optional(),
  next_year_track: z.enum(['scientific', 'literary']).nullable().optional(),
  track_selection_date: z.string().optional().nullable(),
  users: UserSchema.partial().optional(),
  sections: SectionSchema.partial().optional(),
  parents: z.any().optional(),
});

export const ParentSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  national_id: z.string().min(1),
  address: nullableString,
  job_title: nullableString,
  workplace: nullableString,
  users: UserSchema.partial().optional(),
  students: z.array(StudentSchema).optional(),
  student_ids: z.array(z.string().uuid()).optional(),
});

// ==========================================
// 📝 إدارة الواجبات والمشاريع (Assignments)
// ==========================================

export const AssignmentSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: nullableString,
  subject_id: z.string().uuid(),
  teacher_id: z.string().uuid(),
  due_date: z.string(),
  status: z.enum(['draft', 'published', 'archived']),
  created_at: z.string(),
  file_url: nullableString,
});

export const AssignmentSubmissionSchema = z.object({
  id: z.string().uuid(),
  assignment_id: z.string().uuid(),
  student_id: z.string().uuid(),
  content: nullableString,
  file_url: nullableString,
  status: z.enum(['submitted', 'graded']),
  grade: nullableNumber,
  feedback: nullableString,
  submitted_at: z.string(),
  graded_at: nullableString,
  graded_by: nullableString,
});

export const AssignmentQuestionSchema = z.object({
  id: z.string().uuid(),
  assignment_id: z.string().uuid(),
  question_text: z.string().min(1),
  question_type: QuestionTypeSchema,
  options: z.array(z.string()).optional().nullable(),
  points: z.number().min(0).default(1),
  is_required: z.boolean().default(true),
  order: z.number().int().min(0),
});

export const RawAssignmentAnswerSchema = z.object({
  question_id: z.string().uuid(),
  answer_text: nullableString,
  selected_options: z.array(z.string()).optional().nullable(),
}).strict();

export const FinalAssignmentAnswerSchema = RawAssignmentAnswerSchema.extend({
  id: z.string().uuid(),
  submission_id: z.string().uuid(),
  is_correct: nullableBoolean,
  points_earned: nullableNumber,
  feedback: nullableString,
}).strict();

export const AssignmentAnswerSchema = FinalAssignmentAnswerSchema;

// ==========================================
// 🔔 الإشعارات والرسائل (Communications)
// ==========================================

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1),
  content: z.string().min(1),
  type: z.string(),
  link: nullableString,
  is_read: z.boolean().default(false),
  created_at: z.string().optional(),
});

export const MessageSchema = z.object({
  id: z.string().uuid(),
  sender_id: z.string().uuid(),
  receiver_id: nullableString,
  section_id: nullableString,
  subject: z.string().optional().nullable(),
  content: z.string().min(1),
  is_read: z.boolean().default(false),
  created_at: z.string().optional(),
});

export const SaveAnnouncementRequestSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  title: z.string().min(3),
  content: z.string().min(10),
  target_role: z.enum(['all', 'student', 'teacher', 'parent', 'management', 'admin']),
  image_url: z.string().url().optional().nullable().or(z.string().length(0)),
});

// ==========================================
// ⚙️ الإعدادات والجداول (Settings & Schedules)
// ==========================================

export const PlatformSettingsSchema = z.object({
  id: z.string().uuid(),
  is_open: z.boolean().default(true), // هل المنصة مفتوحة للطلاب؟ (ميزة غلق المنصة للصيانة)
  open_date: z.string(),
  close_date: z.string(),
  message: z.string(),
  school_name: z.string(),
  academic_year: z.string(),
  semester: z.string(),
  address: z.string(),
  phone: z.string(),
  email: z.string().email(),
});

export const ScheduleSchema = z.object({
  id: z.string().uuid(),
  section_id: z.string().uuid(),
  teacher_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  day_of_week: z.number().int().min(0).max(6), // 0 للأحد (أو الإثنين حسب منطقتك)
  period: z.number().int().min(1),
  start_time: z.string(),
  end_time: z.string(),
});

// ==========================================
// ✅ الحضور والانصراف (Attendance)
// ==========================================

export const AttendanceSessionSchema = z.object({
  id: z.string().uuid(),
  teacher_id: z.string().uuid(),
  section_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  period_number: z.number().int().min(1),
  date: z.string(),
  created_at: z.string().optional(),
});

export const AttendanceRecordSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  session_id: z.string().uuid(),
  status: z.enum(['present', 'absent', 'late', 'excused']),
  notes: nullableString,
  created_at: z.string().optional(),
});

export const SaveAttendanceRequestSchema = z.object({
  selectedSection: z.string().uuid(),
  selectedSubject: z.string().uuid(),
  date: z.string(),
  period: z.number().int().min(1),
  // سجل (Dictionary) يربط معرف الطالب بحالة الحضور
  attendance: z.record(z.string().uuid(), z.enum(['present', 'absent', 'late', 'excused'])),
  students: z.array(z.object({
    id: z.string().uuid(),
    full_name: z.string().optional()
  })),
  userId: z.string().uuid(),
});

// ==========================================
// 📡 مجسمات الـ (API Request Payloads)
// ==========================================
// هذه القوالب تستخدم في مسارات (app/api/...) للتأكد من أن البيانات
// المُرسلة من واجهة المستخدم مطابقة تماماً للمطلوب قبل لمس قاعدة البيانات.

export const SaveExamRequestSchema = z.object({
  examData: ExamSchema.partial().extend({
    id: z.string().uuid().optional(),
    section_ids: z.array(z.string().uuid()).optional(),
  }),
  questions: z.array(z.object({
    id: z.string().uuid().optional(),
    type: QuestionTypeSchema,
    content: z.string(),
    points: z.number().min(0),
    explanation: z.string().optional().nullable(),
    media_url: z.string().url().optional().nullable(),
    media_type: z.enum(['image', 'video', 'audio']).optional().nullable(),
    options: z.array(z.object({
      content: z.string(),
      is_correct: z.boolean()
    })).optional()
  })),
  isNew: z.boolean(),
  userId: z.string().uuid(),
});

export const SaveAssignmentRequestSchema = z.object({
  payload: AssignmentSchema.partial(),
  assignmentId: z.string().uuid().optional().nullable(),
  questions: z.array(z.object({
    id: z.string().uuid().optional(),
    content: z.string().min(1),
    type: QuestionTypeSchema,
    options: z.array(z.string()).optional().nullable(),
    points: z.number().min(0),
    isRequired: z.boolean(),
  })),
  sectionIds: z.array(z.string().uuid()),
  subjects: z.array(z.object({ id: z.string().uuid(), name: z.string() })),
});

export const SubmitAssignmentRequestSchema = z.object({
  assignmentId: z.string().uuid(),
  studentId: z.string().uuid(),
  studentName: z.string(),
  answers: z.array(RawAssignmentAnswerSchema),
  submissionId: z.string().uuid().optional().nullable(),
}).strict();

export const SaveTeacherAssignmentsRequestSchema = z.object({
  teacherId: z.string().uuid(),
  assignments: z.array(z.object({
    section_id: z.string().uuid(),
    subject_id: z.string().uuid(),
  })),
  userId: z.string().uuid(),
});

export const SendMessageRequestSchema = z.object({
  receiverId: z.string().uuid(),
  subject: z.string().min(1),
  content: z.string().min(1),
  userId: z.string().uuid(),
});

export const SaveScheduleRequestSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  section_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  teacher_id: z.string().uuid(),
  day_of_week: z.number().int().min(0).max(6),
  period_number: z.number().int().min(1).max(12),
  room_number: z.string().optional().nullable(),
});

export const SavePeriodRequestSchema = z.object({
  period_number: z.number().int().min(1).max(12),
  start_time: z.string().regex(/^\d{2}:\d{2}$/), // التحقق من صيغة الوقت HH:MM
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
});

export const SaveClassRequestSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().min(1),
  level: z.number().int().min(1).max(12),
});

export const SaveSectionRequestSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().min(1),
  classId: z.string().uuid().optional().nullable(),
});

export const SaveSubjectRequestSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().min(2),
  code: z.string().min(1), // رمز المادة (مثل PHY101)
});

export const CreateUserRequestSchema = z.object({
  email: z.string().email().optional().nullable(),
  password: z.string().min(6).optional().nullable(),
  full_name: z.string().min(3),
  national_id: z.string().min(5),
  phone: z.string().optional().nullable(),
  role: UserRoleSchema,
  specialization: z.string().optional().nullable(), // للمعلمين
  section_id: z.string().uuid().optional().nullable(), // للطلاب
  address: z.string().optional().nullable(),
  job_title: z.string().optional().nullable(), // لأولياء الأمور
  zoom_link: z.string().url().optional().nullable().or(z.string().length(0)),
});

export const SubmitExamRequestSchema = z.object({
  attemptId: z.string().uuid(),
  // إجابات الطالب قد تكون (نص، مصفوفة لنصوص، رقم، منطقي)
  answers: z.record(z.string().uuid(), z.union([z.string(), z.array(z.string()), z.number(), z.boolean()])),
});

// ==========================================
// 🧬 تحويل الزود إلى أنواع تايب سكريبت (Type Inferences)
// سحر الـ Zod الحقيقي: بدلاً من كتابة الـ Types مرتين، نستنتجها مباشرة من الـ Schemas!
// ==========================================

export type UserRole = z.infer<typeof UserRoleSchema>;
export type User = z.infer<typeof UserSchema>;
export type Teacher = z.infer<typeof TeacherSchema>;
export type Student = z.infer<typeof StudentSchema>;
export type Parent = z.infer<typeof ParentSchema>;
export type Subject = z.infer<typeof SubjectSchema>;
export type Class = z.infer<typeof ClassSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type Assignment = z.infer<typeof AssignmentSchema>;
export type AssignmentSubmission = z.infer<typeof AssignmentSubmissionSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type PlatformSettings = z.infer<typeof PlatformSettingsSchema>;
export type AttendanceRecord = z.infer<typeof AttendanceRecordSchema>;
export type AttendanceSession = z.infer<typeof AttendanceSessionSchema>;
export type Exam = z.infer<typeof ExamSchema>;
export type ExamAttempt = z.infer<typeof ExamAttemptSchema>;
export type Schedule = z.infer<typeof ScheduleSchema>;
export type AssignmentQuestion = z.infer<typeof AssignmentQuestionSchema>;
export type AssignmentAnswer = z.infer<typeof AssignmentAnswerSchema>;
export type RawAssignmentAnswer = z.infer<typeof RawAssignmentAnswerSchema>;
export type FinalAssignmentAnswer = z.infer<typeof FinalAssignmentAnswerSchema>;
export type SubmitAssignmentRequest = z.infer<typeof SubmitAssignmentRequestSchema>;
export type SaveExamRequest = z.infer<typeof SaveExamRequestSchema>;
export type SaveAssignmentRequest = z.infer<typeof SaveAssignmentRequestSchema>;
export type SaveAttendanceRequest = z.infer<typeof SaveAttendanceRequestSchema>;
