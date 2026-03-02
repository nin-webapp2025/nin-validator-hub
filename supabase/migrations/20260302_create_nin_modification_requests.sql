-- Migration: Create nin_modification_requests table
-- Used by VIP users to request NIN data modifications
-- Reviewed by admins, assigned to staff for processing

CREATE TABLE IF NOT EXISTS public.nin_modification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nin TEXT NOT NULL,
  modification_type TEXT NOT NULL,
  current_value TEXT,
  requested_value TEXT NOT NULL,
  reason TEXT NOT NULL,
  supporting_documents JSONB DEFAULT '[]'::jsonb,
  
  -- Workflow status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'under_review', 'assigned', 'in_progress', 'completed', 'rejected')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  
  -- Review
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  rejection_reason TEXT,
  
  -- Staff processing
  staff_notes TEXT,
  completed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.nin_modification_requests ENABLE ROW LEVEL SECURITY;

-- VIP users can view their own requests
CREATE POLICY "Users can view own modification requests"
  ON public.nin_modification_requests FOR SELECT
  USING (auth.uid() = nin_modification_requests.user_id);

-- VIP users can create requests
CREATE POLICY "Users can create modification requests"
  ON public.nin_modification_requests FOR INSERT
  WITH CHECK (auth.uid() = nin_modification_requests.user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all modification requests"
  ON public.nin_modification_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Admins can update any request (approve/reject/assign)
CREATE POLICY "Admins can update modification requests"
  ON public.nin_modification_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Staff can view requests assigned to them
CREATE POLICY "Staff can view assigned requests"
  ON public.nin_modification_requests FOR SELECT
  USING (auth.uid() = nin_modification_requests.assigned_to);

-- Staff can update requests assigned to them (status, notes)
CREATE POLICY "Staff can update assigned requests"
  ON public.nin_modification_requests FOR UPDATE
  USING (auth.uid() = nin_modification_requests.assigned_to);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mod_requests_user_id ON public.nin_modification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_mod_requests_assigned_to ON public.nin_modification_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_mod_requests_status ON public.nin_modification_requests(status);
CREATE INDEX IF NOT EXISTS idx_mod_requests_created_at ON public.nin_modification_requests(created_at DESC);
