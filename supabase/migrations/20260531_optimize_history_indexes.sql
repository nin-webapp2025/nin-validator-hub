-- Query performance review: add composite and search indexes for paginated
-- dashboard reads, admin monitoring, and history lookups.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Validation history: paginated by user/admin, filtered by status, searched by NIN.
CREATE INDEX IF NOT EXISTS idx_validation_history_user_status_created
  ON public.validation_history (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_validation_history_status_created
  ON public.validation_history (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_validation_history_nin_trgm
  ON public.validation_history USING gin (nin gin_trgm_ops);

-- Personalization history: paginated by user/admin, filtered by status, searched by tracking_id.
CREATE INDEX IF NOT EXISTS idx_personalization_history_user_status_created
  ON public.personalization_history (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_personalization_history_status_created
  ON public.personalization_history (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_personalization_history_tracking_id_trgm
  ON public.personalization_history USING gin (tracking_id gin_trgm_ops)
  WHERE tracking_id IS NOT NULL;

-- Clearance history: paginated by user/admin, filtered by status, searched by stored tracking_id/nin column.
CREATE INDEX IF NOT EXISTS idx_clearance_history_user_status_created
  ON public.clearance_history (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clearance_history_status_created
  ON public.clearance_history (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clearance_history_nin_trgm
  ON public.clearance_history USING gin (nin gin_trgm_ops);

-- BVN history: paginated by user/admin, filtered by status, searched by BVN.
CREATE INDEX IF NOT EXISTS idx_bvn_history_user_status_created
  ON public.bvn_history (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bvn_history_status_created
  ON public.bvn_history (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bvn_history_bvn_trgm
  ON public.bvn_history USING gin (bvn gin_trgm_ops);

-- Wallet transactions and operation requests.
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_status_created
  ON public.wallet_transactions (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_operation_requests_user_operation_created
  ON public.wallet_operation_requests (user_id, operation, created_at DESC);

-- Notification header reads and mark-all-read flow.
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

-- API key list and gateway monitoring.
CREATE INDEX IF NOT EXISTS idx_api_keys_user_created
  ON public.api_keys (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_gateway_logs_user_action_created
  ON public.api_gateway_logs (user_id, action, created_at DESC);

-- Operational monitoring screens.
CREATE INDEX IF NOT EXISTS idx_operational_events_component_type_created
  ON public.operational_events (component, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operational_alerts_status_severity_seen
  ON public.operational_alerts (status, severity, last_seen_at DESC);
