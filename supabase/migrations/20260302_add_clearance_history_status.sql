-- Migration: Add status column to clearance_history
-- Required by Profile.tsx which queries and filters by status

ALTER TABLE public.clearance_history
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- Backfill existing rows: derive status from response JSONB
-- If response contains a success indicator, mark as success
UPDATE public.clearance_history
SET status = CASE
  WHEN response IS NOT NULL AND response != 'null'::jsonb THEN 'success'
  ELSE 'failed'
END
WHERE status = 'pending';

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_clearance_history_status ON public.clearance_history(status);
