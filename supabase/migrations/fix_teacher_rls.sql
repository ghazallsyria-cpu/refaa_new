-- Fix RLS policies for Teachers
-- 1. Allow teachers to view students in the users table
CREATE POLICY "Teachers can view students in users table" ON public.users
FOR SELECT TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'teacher'
  AND role = 'student'
);

-- 2. Allow teachers to view the students table
CREATE POLICY "Teachers can view students table" ON public.students
FOR SELECT TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'teacher'
);

-- 3. Allow teachers to view parents (needed for messaging if they need to contact parents)
CREATE POLICY "Teachers can view parents in users table" ON public.users
FOR SELECT TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'teacher'
  AND role = 'parent'
);

-- 4. Allow teachers to view parents table
CREATE POLICY "Teachers can view parents table" ON public.parents
FOR SELECT TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'teacher'
);
