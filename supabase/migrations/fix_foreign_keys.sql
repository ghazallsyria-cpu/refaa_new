-- Fix foreign keys to cascade deletes

-- 1. users table
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE public.users ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. parents table
ALTER TABLE public.parents DROP CONSTRAINT IF EXISTS parents_id_fkey;
ALTER TABLE public.parents ADD CONSTRAINT parents_id_fkey FOREIGN KEY (id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 3. students table
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_id_fkey;
ALTER TABLE public.students ADD CONSTRAINT students_id_fkey FOREIGN KEY (id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 4. teachers table
ALTER TABLE public.teachers DROP CONSTRAINT IF EXISTS teachers_id_fkey;
ALTER TABLE public.teachers ADD CONSTRAINT teachers_id_fkey FOREIGN KEY (id) REFERENCES public.users(id) ON DELETE CASCADE;
