-- This file documents the SQL schema required for the assignments feature.
-- Run this in your Supabase SQL Editor if the table does not exist.

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  content TEXT,
  file_url TEXT,
  status VARCHAR(50) DEFAULT 'submitted', -- 'submitted', 'graded'
  grade NUMERIC,
  feedback TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

-- RLS Policies
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Allow students to insert their own submissions
CREATE POLICY "Students can insert their own submissions" ON assignment_submissions
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Allow students to update their own submissions
CREATE POLICY "Students can update their own submissions" ON assignment_submissions
  FOR UPDATE USING (auth.uid() = student_id);

-- Allow students to read their own submissions
CREATE POLICY "Students can read their own submissions" ON assignment_submissions
  FOR SELECT USING (auth.uid() = student_id);

-- Allow teachers to read submissions for their assignments
CREATE POLICY "Teachers can read submissions for their assignments" ON assignment_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments
      WHERE assignments.id = assignment_submissions.assignment_id
      AND assignments.teacher_id = auth.uid()
    )
  );

-- Allow teachers to update submissions for their assignments (grading)
CREATE POLICY "Teachers can update submissions for their assignments" ON assignment_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM assignments
      WHERE assignments.id = assignment_submissions.assignment_id
      AND assignments.teacher_id = auth.uid()
    )
  );

-- Allow admins to do everything
CREATE POLICY "Admins can do everything" ON assignment_submissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.role = 'management')
    )
  );
