-- MIGRATION_NOTIFICATIONS.sql
-- إضافة جدول الإشعارات

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL, -- 'attendance', 'grade', 'assignment', 'system'
  is_read BOOLEAN DEFAULT FALSE,
  related_entity_id UUID, -- ID of the related record (e.g., attendance_id, grade_id)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (
    public.get_user_role() IN ('admin', 'management', 'teacher')
  );

CREATE POLICY "Users can update their own notifications (mark as read)" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
