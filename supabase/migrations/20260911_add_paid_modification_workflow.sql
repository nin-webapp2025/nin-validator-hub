-- Modification requests must now be paid for (via wallet balance) before
-- they're created, and the fee is auto-refunded if an admin later rejects
-- the request. Pricing: name/phone/address = 15000, date of birth = 65000.

ALTER TABLE public.nin_modification_requests
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS fee_amount numeric(12,2);

CREATE OR REPLACE FUNCTION public.wallet_operation_price(p_operation text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_operation
    WHEN 'nin_validation' THEN 5000
    WHEN 'bvn_verification' THEN 800
    WHEN 'nin_verification' THEN 800
    WHEN 'print_nin_slip_premium' THEN 600
    WHEN 'print_nin_slip_long' THEN 400
    WHEN 'clearance' THEN 3000
    WHEN 'personalization' THEN 1500
    WHEN 'modification_change_name' THEN 15000
    WHEN 'modification_change_phone' THEN 15000
    WHEN 'modification_change_address' THEN 15000
    WHEN 'modification_change_dob' THEN 65000
    ELSE NULL
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_operation_label(p_operation text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_operation
    WHEN 'nin_validation' THEN 'NIN Validation'
    WHEN 'bvn_verification' THEN 'BVN Verification'
    WHEN 'nin_verification' THEN 'NIN Verification'
    WHEN 'print_nin_slip_premium' THEN 'Print Premium NIN Slip'
    WHEN 'print_nin_slip_long' THEN 'Print Long NIN Slip (NINS)'
    WHEN 'clearance' THEN 'Clearance'
    WHEN 'personalization' THEN 'Personalization'
    WHEN 'modification_change_name' THEN 'Change of Name Modification'
    WHEN 'modification_change_phone' THEN 'Change of Phone Number Modification'
    WHEN 'modification_change_address' THEN 'Change of Address Modification'
    WHEN 'modification_change_dob' THEN 'Change of Date of Birth Modification'
    ELSE p_operation
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_paid_modification_request(
  p_nin text,
  p_modification_type text,
  p_current_value text DEFAULT NULL,
  p_requested_value text DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_request_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operation text;
  v_charge jsonb;
  v_price numeric(12,2);
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

  IF COALESCE(trim(p_request_key), '') = '' THEN
    RAISE EXCEPTION 'Request key is required.';
  END IF;

  v_operation := 'modification_' || p_modification_type;
  v_price := public.wallet_operation_price(v_operation);

  IF v_price IS NULL THEN
    RAISE EXCEPTION 'Unable to determine the fee for this modification type.';
  END IF;

  -- Idempotent charge: a client retry after a network blip reuses the
  -- original outcome instead of charging twice.
  SELECT public.wallet_charge_operation(auth.uid(), v_operation, p_request_key) INTO v_charge;

  IF NOT (v_charge->>'success')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', COALESCE(v_charge->>'message', 'Unable to charge wallet for this modification.'),
      'balance', COALESCE((v_charge->>'balance')::numeric, 0),
      'required', v_price
    );
  END IF;

  IF (v_charge->>'already_processed')::boolean THEN
    SELECT * INTO v_request
    FROM public.nin_modification_requests
    WHERE user_id = auth.uid() AND payment_reference = p_request_key;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'request', to_jsonb(v_request),
        'balance', (v_charge->>'balance')::numeric,
        'already_processed', true
      );
    END IF;
  END IF;

  INSERT INTO public.nin_modification_requests (
    user_id,
    nin,
    modification_type,
    current_value,
    requested_value,
    reason,
    status,
    priority,
    payment_reference,
    fee_amount
  )
  VALUES (
    auth.uid(),
    trim(p_nin),
    p_modification_type,
    NULLIF(trim(COALESCE(p_current_value, '')), ''),
    trim(p_requested_value),
    trim(p_reason),
    'pending',
    'medium',
    p_request_key,
    v_price
  )
  RETURNING * INTO v_request;

  RETURN jsonb_build_object(
    'success', true,
    'request', to_jsonb(v_request),
    'balance', (v_charge->>'balance')::numeric,
    'already_processed', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_paid_modification_request(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_paid_modification_request(text, text, text, text, text, text) TO authenticated;

-- Close the old free-submission path now that payment is mandatory, so a
-- client can't call it directly to bypass the wallet charge.
REVOKE EXECUTE ON FUNCTION public.submit_modification_request(text, text, text, text, text) FROM authenticated;

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
  v_previous_status text;
  v_now timestamptz := now();
  v_priority text := COALESCE(p_priority, 'medium');
  v_refund jsonb;
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

  v_previous_status := v_request.status;

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

  -- Auto-refund the modification fee the first time a paid request is rejected.
  IF p_action = 'reject' AND v_previous_status <> 'rejected' AND v_request.payment_reference IS NOT NULL THEN
    SELECT public.wallet_refund_operation(
      v_request.user_id,
      'modification_' || v_request.modification_type,
      'Modification request rejected',
      v_request.payment_reference
    ) INTO v_refund;
  END IF;

  PERFORM public._notify_modification_request_status(v_request.user_id, v_request.status, v_request.rejection_reason);

  RETURN v_request;
END;
$$;
