-- Centralize modification request submission and workflow transitions
-- so the frontend no longer performs direct workflow mutations.

CREATE OR REPLACE FUNCTION public._notify_modification_request_status(
  p_user_id uuid,
  p_status text,
  p_rejection_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_message text;
  v_type text := 'info';
BEGIN
  CASE p_status
    WHEN 'pending' THEN
      v_title := 'Modification request received';
      v_message := 'Your modification request has been received and is awaiting review.';
    WHEN 'under_review' THEN
      v_title := 'Modification request under review';
      v_message := 'Your modification request is currently being reviewed by an administrator.';
    WHEN 'assigned' THEN
      v_title := 'Modification request assigned';
      v_message := 'Your modification request has been assigned for processing.';
    WHEN 'in_progress' THEN
      v_title := 'Modification request in progress';
      v_message := 'Work has started on your modification request.';
    WHEN 'completed' THEN
      v_title := 'Modification request completed';
      v_message := 'Your modification request has been completed successfully.';
      v_type := 'success';
    WHEN 'rejected' THEN
      v_title := 'Modification request rejected';
      v_message := CASE
        WHEN COALESCE(trim(p_rejection_reason), '') <> '' THEN
          'Your modification request was rejected: ' || trim(p_rejection_reason)
        ELSE
          'Your modification request was rejected.'
      END;
      v_type := 'warning';
    ELSE
      RETURN;
  END CASE;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (p_user_id, v_title, v_message, v_type, '/dashboard/user/modification');
END;
$$;

REVOKE ALL ON FUNCTION public._notify_modification_request_status(uuid, text, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.submit_modification_request(
  p_nin text,
  p_modification_type text,
  p_current_value text DEFAULT NULL,
  p_requested_value text DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS public.nin_modification_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.nin_modification_requests;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF p_nin IS NULL OR p_nin !~ '^\d{11}$' THEN
    RAISE EXCEPTION 'A valid 11-digit NIN is required.';
  END IF;

  IF p_modification_type IS NULL OR p_modification_type NOT IN ('change_name', 'change_phone', 'change_address', 'change_dob') THEN
    RAISE EXCEPTION 'Invalid modification type.';
  END IF;

  IF COALESCE(trim(p_requested_value), '') = '' THEN
    RAISE EXCEPTION 'Requested value is required.';
  END IF;

  IF COALESCE(length(trim(p_reason)), 0) < 20 THEN
    RAISE EXCEPTION 'Reason must be at least 20 characters.';
  END IF;

  INSERT INTO public.nin_modification_requests (
    user_id,
    nin,
    modification_type,
    current_value,
    requested_value,
    reason,
    status,
    priority
  )
  VALUES (
    auth.uid(),
    trim(p_nin),
    p_modification_type,
    NULLIF(trim(COALESCE(p_current_value, '')), ''),
    trim(p_requested_value),
    trim(p_reason),
    'pending',
    'medium'
  )
  RETURNING * INTO v_request;

  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_process_modification_request(
  p_request_id uuid,
  p_action text,
  p_priority text DEFAULT NULL,
  p_assigned_to uuid DEFAULT NULL,
  p_admin_notes text DEFAULT NULL,
  p_rejection_reason text DEFAULT NULL
)
RETURNS public.nin_modification_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.nin_modification_requests;
  v_now timestamptz := now();
  v_priority text := COALESCE(p_priority, 'medium');
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins may update modification requests.';
  END IF;

  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'Request id is required.';
  END IF;

  IF p_action NOT IN ('review', 'assign', 'start', 'complete', 'reject') THEN
    RAISE EXCEPTION 'Invalid modification workflow action.';
  END IF;

  IF v_priority NOT IN ('low', 'medium', 'high', 'urgent') THEN
    RAISE EXCEPTION 'Invalid priority value.';
  END IF;

  SELECT * INTO v_request
  FROM public.nin_modification_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Modification request not found.';
  END IF;

  IF p_action = 'assign' AND p_assigned_to IS NULL THEN
    RAISE EXCEPTION 'Assigned staff member is required for assignment.';
  END IF;

  IF p_action = 'reject' AND COALESCE(trim(p_rejection_reason), '') = '' THEN
    RAISE EXCEPTION 'Rejection reason is required.';
  END IF;

  UPDATE public.nin_modification_requests
  SET
    priority = v_priority,
    admin_notes = NULLIF(trim(COALESCE(p_admin_notes, '')), ''),
    status = CASE
      WHEN p_action = 'review' THEN 'under_review'
      WHEN p_action = 'assign' THEN 'assigned'
      WHEN p_action = 'start' THEN 'in_progress'
      WHEN p_action = 'complete' THEN 'completed'
      WHEN p_action = 'reject' THEN 'rejected'
      ELSE status
    END,
    reviewed_at = CASE
      WHEN p_action IN ('review', 'assign', 'start', 'complete', 'reject') THEN COALESCE(reviewed_at, v_now)
      ELSE reviewed_at
    END,
    assigned_to = CASE
      WHEN p_action = 'assign' THEN p_assigned_to
      WHEN p_action = 'start' THEN NULL
      ELSE assigned_to
    END,
    assigned_at = CASE
      WHEN p_action = 'assign' THEN v_now
      WHEN p_action = 'start' THEN NULL
      ELSE assigned_at
    END,
    completed_at = CASE
      WHEN p_action = 'complete' THEN v_now
      ELSE completed_at
    END,
    rejection_reason = CASE
      WHEN p_action = 'reject' THEN trim(p_rejection_reason)
      WHEN p_action IN ('review', 'assign', 'start', 'complete') THEN NULL
      ELSE rejection_reason
    END,
    updated_at = v_now
  WHERE id = p_request_id
  RETURNING * INTO v_request;

  PERFORM public._notify_modification_request_status(v_request.user_id, v_request.status, v_request.rejection_reason);

  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_process_modification_request(
  p_request_id uuid,
  p_action text,
  p_staff_notes text DEFAULT NULL
)
RETURNS public.nin_modification_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.nin_modification_requests;
  v_now timestamptz := now();
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'staff') THEN
    RAISE EXCEPTION 'Only staff may process assigned modification requests.';
  END IF;

  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'Request id is required.';
  END IF;

  IF p_action NOT IN ('start', 'complete') THEN
    RAISE EXCEPTION 'Invalid staff workflow action.';
  END IF;

  SELECT * INTO v_request
  FROM public.nin_modification_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Modification request not found.';
  END IF;

  IF auth.role() <> 'service_role' AND v_request.assigned_to IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You may only process requests assigned to you.';
  END IF;

  UPDATE public.nin_modification_requests
  SET
    status = CASE
      WHEN p_action = 'start' THEN 'in_progress'
      WHEN p_action = 'complete' THEN 'completed'
      ELSE status
    END,
    staff_notes = NULLIF(trim(COALESCE(p_staff_notes, '')), ''),
    completed_at = CASE
      WHEN p_action = 'complete' THEN v_now
      ELSE completed_at
    END,
    updated_at = v_now
  WHERE id = p_request_id
  RETURNING * INTO v_request;

  PERFORM public._notify_modification_request_status(v_request.user_id, v_request.status, v_request.rejection_reason);

  RETURN v_request;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_modification_request(text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_process_modification_request(uuid, text, text, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.staff_process_modification_request(uuid, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.submit_modification_request(text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_process_modification_request(uuid, text, text, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_process_modification_request(uuid, text, text) TO authenticated;
