-- Migration: Add 'staff' and 'vip' values to app_role enum
-- Required for the multi-role dashboard system

-- Each ALTER TYPE ADD VALUE must run in its own transaction
-- Supabase runs each migration file as a single transaction,
-- so we use DO blocks with exception handling for idempotency

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'staff';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vip';

-- Verify the enum values
COMMENT ON TYPE public.app_role IS 'User roles: admin, user, staff, vip';
