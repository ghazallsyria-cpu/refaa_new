-- RLS Policies for Exams and related tables

-- Questions
CREATE POLICY "Anyone can view questions for published exams" ON public.questions 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.exams 
    WHERE exams.id = questions.exam_id AND exams.status = 'published'
  )
  OR 
  EXISTS (
    SELECT 1 FROM public.exams 
    WHERE exams.id = questions.exam_id AND exams.teacher_id = auth.uid()
  )
  OR 
  public.get_user_role() IN ('admin', 'management')
);

CREATE POLICY "Teachers can manage questions for their exams" ON public.questions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.exams 
    WHERE exams.id = questions.exam_id AND exams.teacher_id = auth.uid()
  )
  OR 
  public.get_user_role() IN ('admin', 'management')
);

-- Question Options
CREATE POLICY "Anyone can view options for published exams" ON public.question_options 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.questions
    JOIN public.exams ON exams.id = questions.exam_id
    WHERE questions.id = question_options.question_id 
    AND (exams.status = 'published' OR exams.teacher_id = auth.uid() OR public.get_user_role() IN ('admin', 'management'))
  )
);

CREATE POLICY "Teachers can manage options for their exams" ON public.question_options
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.questions
    JOIN public.exams ON exams.id = questions.exam_id
    WHERE questions.id = question_options.question_id 
    AND (exams.teacher_id = auth.uid() OR public.get_user_role() IN ('admin', 'management'))
  )
);

-- Exam Attempts
CREATE POLICY "Students can view their own attempts" ON public.exam_attempts
FOR SELECT USING (
  student_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.exams 
    WHERE exams.id = exam_attempts.exam_id AND exams.teacher_id = auth.uid()
  )
  OR 
  public.get_user_role() IN ('admin', 'management')
);

CREATE POLICY "Students can create their own attempts" ON public.exam_attempts
FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their own ongoing attempts" ON public.exam_attempts
FOR UPDATE USING (
  student_id = auth.uid() AND status = 'ongoing'
) WITH CHECK (
  student_id = auth.uid()
);

CREATE POLICY "Teachers can update attempts for their exams" ON public.exam_attempts
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.exams 
    WHERE exams.id = exam_attempts.exam_id AND exams.teacher_id = auth.uid()
  )
  OR 
  public.get_user_role() IN ('admin', 'management')
);

-- Student Answers
CREATE POLICY "Students can view their own answers" ON public.student_answers
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.exam_attempts
    WHERE exam_attempts.id = student_answers.attempt_id AND exam_attempts.student_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.exam_attempts
    JOIN public.exams ON exams.id = exam_attempts.exam_id
    WHERE exam_attempts.id = student_answers.attempt_id AND exams.teacher_id = auth.uid()
  )
  OR 
  public.get_user_role() IN ('admin', 'management')
);

CREATE POLICY "Students can insert their own answers" ON public.student_answers
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.exam_attempts
    WHERE exam_attempts.id = student_answers.attempt_id AND exam_attempts.student_id = auth.uid() AND exam_attempts.status = 'ongoing'
  )
);

CREATE POLICY "Students can update their own answers" ON public.student_answers
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.exam_attempts
    WHERE exam_attempts.id = student_answers.attempt_id AND exam_attempts.student_id = auth.uid() AND exam_attempts.status = 'ongoing'
  )
);

CREATE POLICY "Teachers can update answers for their exams" ON public.student_answers
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.exam_attempts
    JOIN public.exams ON exams.id = exam_attempts.exam_id
    WHERE exam_attempts.id = student_answers.attempt_id AND exams.teacher_id = auth.uid()
  )
  OR 
  public.get_user_role() IN ('admin', 'management')
);
