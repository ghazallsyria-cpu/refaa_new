-- Add total_marks to assignments and exams
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS total_marks INTEGER DEFAULT 100;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS total_marks INTEGER DEFAULT 100;

-- Update existing exams to sync max_score with total_marks
UPDATE exams SET total_marks = max_score WHERE max_score IS NOT NULL;
