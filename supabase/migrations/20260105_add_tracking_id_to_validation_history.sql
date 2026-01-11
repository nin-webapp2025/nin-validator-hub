-- Add tracking_id column to validation_history table
ALTER TABLE public.validation_history 
ADD COLUMN tracking_id TEXT;

-- Add index for faster lookups by tracking_id
CREATE INDEX idx_validation_history_tracking_id ON public.validation_history(tracking_id);
