-- 23. Class Periods Table (توقيت الحصص)
CREATE TABLE public.class_periods (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    period_number INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.class_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage class periods" ON public.class_periods
    FOR ALL USING (public.get_user_role() = 'admin');
CREATE POLICY "Everyone can view class periods" ON public.class_periods
    FOR SELECT USING (TRUE);
