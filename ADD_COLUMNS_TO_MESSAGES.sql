-- ADD_COLUMNS_TO_MESSAGES.sql
-- إضافة أعمدة parent_id و section_id لجدول الرسائل

DO $$
BEGIN
    -- إضافة عمود parent_id للردود على الرسائل
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'parent_id') THEN
        ALTER TABLE public.messages ADD COLUMN parent_id UUID REFERENCES public.messages(id) ON DELETE CASCADE;
    END IF;

    -- إضافة عمود section_id للرسائل الجماعية للفصول
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'section_id') THEN
        ALTER TABLE public.messages ADD COLUMN section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;
    END IF;
END $$;
