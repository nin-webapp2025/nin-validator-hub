-- Add profile settings columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS validation_alerts BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.display_name IS 'User chosen display name';
COMMENT ON COLUMN public.profiles.email_notifications IS 'Enable/disable email notifications';
COMMENT ON COLUMN public.profiles.validation_alerts IS 'Enable/disable validation completion alerts';
