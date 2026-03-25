-- Enable RLS for all tables
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies for users
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins and management can view all users" ON public.users FOR SELECT USING (public.get_user_role() IN ('admin', 'management'));
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins and management can update all users" ON public.users FOR UPDATE USING (public.get_user_role() IN ('admin', 'management'));
CREATE POLICY "Admins and management can insert users" ON public.users FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'management'));
CREATE POLICY "Admins and management can delete users" ON public.users FOR DELETE USING (public.get_user_role() IN ('admin', 'management'));

-- Policies for classes
CREATE POLICY "Anyone can view classes" ON public.classes FOR SELECT USING (true);
CREATE POLICY "Admins and management can manage classes" ON public.classes FOR ALL USING (public.get_user_role() IN ('admin', 'management'));

-- Policies for sections
CREATE POLICY "Anyone can view sections" ON public.sections FOR SELECT USING (true);
CREATE POLICY "Admins and management can manage sections" ON public.sections FOR ALL USING (public.get_user_role() IN ('admin', 'management'));

-- Policies for subjects
CREATE POLICY "Anyone can view subjects" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Admins and management can manage subjects" ON public.subjects FOR ALL USING (public.get_user_role() IN ('admin', 'management'));

-- Policies for parents
CREATE POLICY "Parents can view their own data" ON public.parents FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins and management can view all parents" ON public.parents FOR SELECT USING (public.get_user_role() IN ('admin', 'management'));
CREATE POLICY "Parents can update their own data" ON public.parents FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins and management can manage parents" ON public.parents FOR ALL USING (public.get_user_role() IN ('admin', 'management'));

-- Policies for students
CREATE POLICY "Students can view their own data" ON public.students FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Parents can view their children's data" ON public.students FOR SELECT USING (parent_id = auth.uid());
CREATE POLICY "Teachers can view students in their sections" ON public.students FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.teacher_sections ts
        WHERE ts.teacher_id = auth.uid() AND ts.section_id = public.students.section_id
    )
    OR public.get_user_role() IN ('admin', 'management')
);
CREATE POLICY "Admins and management can view all students" ON public.students FOR SELECT USING (public.get_user_role() IN ('admin', 'management'));
CREATE POLICY "Admins and management can manage students" ON public.students FOR ALL USING (public.get_user_role() IN ('admin', 'management'));

-- Policies for teachers
CREATE POLICY "Teachers can view their own data" ON public.teachers FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Anyone can view teachers" ON public.teachers FOR SELECT USING (true);
CREATE POLICY "Teachers can update their own data" ON public.teachers FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins and management can manage teachers" ON public.teachers FOR ALL USING (public.get_user_role() IN ('admin', 'management'));

-- Policies for teacher_subjects
CREATE POLICY "Anyone can view teacher_subjects" ON public.teacher_subjects FOR SELECT USING (true);
CREATE POLICY "Admins and management can manage teacher_subjects" ON public.teacher_subjects FOR ALL USING (public.get_user_role() IN ('admin', 'management'));

-- Policies for teacher_sections
CREATE POLICY "Anyone can view teacher_sections" ON public.teacher_sections FOR SELECT USING (true);
CREATE POLICY "Admins and management can manage teacher_sections" ON public.teacher_sections FOR ALL USING (public.get_user_role() IN ('admin', 'management'));

-- Policies for attendance
CREATE POLICY "Students can view their own attendance" ON public.attendance FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Parents can view their children's attendance" ON public.attendance FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.students WHERE id = public.attendance.student_id AND parent_id = auth.uid())
);
CREATE POLICY "Teachers can view attendance for their sections" ON public.attendance FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.teacher_sections ts
        JOIN public.students s ON s.section_id = ts.section_id
        WHERE ts.teacher_id = auth.uid() AND s.id = public.attendance.student_id
    )
    OR public.get_user_role() IN ('admin', 'management')
);
CREATE POLICY "Teachers can manage attendance for their sections" ON public.attendance FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.teacher_sections ts
        JOIN public.students s ON s.section_id = ts.section_id
        WHERE ts.teacher_id = auth.uid() AND s.id = public.attendance.student_id
    )
    OR public.get_user_role() IN ('admin', 'management')
);

-- Policies for grades
CREATE POLICY "Students can view their own grades" ON public.grades FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Parents can view their children's grades" ON public.grades FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.students WHERE id = public.grades.student_id AND parent_id = auth.uid())
);
CREATE POLICY "Teachers can view and manage grades for their subjects/sections" ON public.grades FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.teacher_sections ts
        JOIN public.students s ON s.section_id = ts.section_id
        WHERE ts.teacher_id = auth.uid() AND s.id = public.grades.student_id
    )
    OR public.get_user_role() IN ('admin', 'management')
);

-- Policies for assignments
CREATE POLICY "Students can view assignments for their section" ON public.assignments FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = auth.uid() AND s.section_id = public.assignments.section_id
    )
);
CREATE POLICY "Teachers can view and manage assignments for their sections" ON public.assignments FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.teacher_sections ts
        WHERE ts.teacher_id = auth.uid() AND ts.section_id = public.assignments.section_id
    )
    OR public.get_user_role() IN ('admin', 'management')
);

-- Policies for schedules
CREATE POLICY "Anyone can view schedules" ON public.schedules FOR SELECT USING (true);
CREATE POLICY "Admins and management can manage schedules" ON public.schedules FOR ALL USING (public.get_user_role() IN ('admin', 'management'));

-- Policies for announcements
CREATE POLICY "Anyone can view announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Admins and management can manage announcements" ON public.announcements FOR ALL USING (public.get_user_role() IN ('admin', 'management'));

-- Policies for messages
CREATE POLICY "Users can view their own messages" ON public.messages FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Users can update their own messages" ON public.messages FOR UPDATE USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "Admins and management can view all messages" ON public.messages FOR SELECT USING (public.get_user_role() IN ('admin', 'management'));
CREATE POLICY "Admins and management can manage all messages" ON public.messages FOR ALL USING (public.get_user_role() IN ('admin', 'management'));
