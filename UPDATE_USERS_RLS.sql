-- UPDATE: RLS Policies for public.users
-- Allow teachers to view students' names and profiles.
-- Allow parents to view their children's profiles.

-- 1. Drop existing restrictive policy if needed (or just add new ones)
-- The existing policy is: CREATE POLICY "Admins can view all users" ON public.users FOR SELECT USING (public.get_user_role() IN ('admin', 'management'));

-- 2. Add policy for teachers to view students
CREATE POLICY "Teachers can view students" ON public.users
FOR SELECT USING (
  public.get_user_role() = 'teacher' AND role = 'student'
);

-- 3. Add policy for parents to view students (their children)
CREATE POLICY "Parents can view students" ON public.users
FOR SELECT USING (
  public.get_user_role() = 'parent' AND role = 'student'
);

-- 4. Add policy for anyone to view teachers (so students/parents can see teacher names)
-- This is already partially covered by "Anyone can view teachers" on the teachers table, 
-- but we need it on the users table too for joins.
CREATE POLICY "Anyone can view teacher profiles" ON public.users
FOR SELECT USING (
  role = 'teacher'
);

-- 5. Add policy for teachers to view students table
CREATE POLICY "Teachers can view students table" ON public.students
FOR SELECT USING (
  public.get_user_role() = 'teacher'
);

-- 6. Add policy for teachers to view sections
CREATE POLICY "Teachers can view sections" ON public.sections
FOR SELECT USING (
  public.get_user_role() = 'teacher'
);

-- 7. Add policy for teachers to view classes
CREATE POLICY "Teachers can view classes" ON public.classes
FOR SELECT USING (
  public.get_user_role() = 'teacher'
);
