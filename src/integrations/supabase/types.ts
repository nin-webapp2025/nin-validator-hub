export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      api_docs_access: {
        Row: {
          granted_at: string | null
          granted_by: string
          id: string
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by: string
          id?: string
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      api_gateway_logs: {
        Row: {
          action: string
          api_key_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          ip_address: string | null
          response_time_ms: number | null
          status_code: number
          user_id: string
        }
        Insert: {
          action: string
          api_key_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          response_time_ms?: number | null
          status_code?: number
          user_id: string
        }
        Update: {
          action?: string
          api_key_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          response_time_ms?: number | null
          status_code?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_gateway_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          permissions: string[]
          rate_limit: number
          total_requests: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          permissions?: string[]
          rate_limit?: number
          total_requests?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          permissions?: string[]
          rate_limit?: number
          total_requests?: number
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      background_jobs: {
        Row: {
          attempt_count: number
          completed_at: string | null
          created_at: string
          id: string
          last_error: string | null
          last_result: Json | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          payload: Json
          run_at: string
          status: string
          type: string
          unique_key: string | null
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          last_result?: Json | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          payload?: Json
          run_at?: string
          status?: string
          type: string
          unique_key?: string | null
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          last_result?: Json | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          payload?: Json
          run_at?: string
          status?: string
          type?: string
          unique_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bvn_history: {
        Row: {
          bvn: string
          created_at: string
          error_message: string | null
          id: string
          result: Json | null
          status: string
          user_id: string
          verification_type: string
        }
        Insert: {
          bvn: string
          created_at?: string
          error_message?: string | null
          id?: string
          result?: Json | null
          status: string
          user_id: string
          verification_type: string
        }
        Update: {
          bvn?: string
          created_at?: string
          error_message?: string | null
          id?: string
          result?: Json | null
          status?: string
          user_id?: string
          verification_type?: string
        }
        Relationships: []
      }
      clearance_history: {
        Row: {
          created_at: string | null
          id: string
          nin: string
          response: Json | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nin: string
          response?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nin?: string
          response?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      nin_modification_requests: {
        Row: {
          admin_notes: string | null
          assigned_at: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          current_value: string | null
          fee_amount: number | null
          id: string
          modification_type: string
          nin: string
          payment_reference: string | null
          priority: string
          reason: string
          rejection_reason: string | null
          requested_value: string
          reviewed_at: string | null
          staff_notes: string | null
          status: string
          supporting_documents: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          current_value?: string | null
          fee_amount?: number | null
          id?: string
          modification_type: string
          nin: string
          payment_reference?: string | null
          priority?: string
          reason: string
          rejection_reason?: string | null
          requested_value: string
          reviewed_at?: string | null
          staff_notes?: string | null
          status?: string
          supporting_documents?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          current_value?: string | null
          fee_amount?: number | null
          id?: string
          modification_type?: string
          nin?: string
          payment_reference?: string | null
          priority?: string
          reason?: string
          rejection_reason?: string | null
          requested_value?: string
          reviewed_at?: string | null
          staff_notes?: string | null
          status?: string
          supporting_documents?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      operational_alerts: {
        Row: {
          alert_type: string
          component: string
          created_at: string
          dedupe_key: string | null
          event_id: string | null
          first_seen_at: string
          id: string
          last_seen_at: string
          message: string
          metadata: Json
          occurrence_count: number
          severity: string
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          alert_type: string
          component: string
          created_at?: string
          dedupe_key?: string | null
          event_id?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          message: string
          metadata?: Json
          occurrence_count?: number
          severity: string
          source: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          alert_type?: string
          component?: string
          created_at?: string
          dedupe_key?: string | null
          event_id?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          message?: string
          metadata?: Json
          occurrence_count?: number
          severity?: string
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "operational_events"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_events: {
        Row: {
          action: string | null
          api_key_id: string | null
          component: string
          created_at: string
          duration_ms: number | null
          event_type: string
          id: string
          job_id: string | null
          message: string | null
          metadata: Json
          provider: string | null
          request_id: string | null
          severity: string
          source: string
          state: string | null
          status_code: number | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          api_key_id?: string | null
          component: string
          created_at?: string
          duration_ms?: number | null
          event_type: string
          id?: string
          job_id?: string | null
          message?: string | null
          metadata?: Json
          provider?: string | null
          request_id?: string | null
          severity?: string
          source: string
          state?: string | null
          status_code?: number | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          api_key_id?: string | null
          component?: string
          created_at?: string
          duration_ms?: number | null
          event_type?: string
          id?: string
          job_id?: string | null
          message?: string | null
          metadata?: Json
          provider?: string | null
          request_id?: string | null
          severity?: string
          source?: string
          state?: string | null
          status_code?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operational_events_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "background_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      personalization_history: {
        Row: {
          created_at: string
          id: string
          nin: string
          result: Json | null
          status: string
          tracking_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nin: string
          result?: Json | null
          status?: string
          tracking_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nin?: string
          result?: Json | null
          status?: string
          tracking_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          email_notifications: boolean | null
          full_name: string | null
          id: string
          onboarding_completed: boolean
          updated_at: string
          validation_alerts: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          email_notifications?: boolean | null
          full_name?: string | null
          id: string
          onboarding_completed?: boolean
          updated_at?: string
          validation_alerts?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          email_notifications?: boolean | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean
          updated_at?: string
          validation_alerts?: boolean | null
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          balance: number
          id: string
          total_used: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          total_used?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          total_used?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      validation_history: {
        Row: {
          created_at: string
          id: string
          nin: string
          result: Json | null
          status: string
          tracking_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nin: string
          result?: Json | null
          status?: string
          tracking_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nin?: string
          result?: Json | null
          status?: string
          tracking_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vtu_products: {
        Row: {
          category: string
          created_at: string
          fee_flat: number
          fee_percent: number
          id: string
          is_active: boolean
          max_amount: number | null
          min_amount: number | null
          name: string
          network: string
          provider: string
          provider_cost: number
          provider_plan_id: string
          retail_price: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          fee_flat?: number
          fee_percent?: number
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number | null
          name: string
          network: string
          provider?: string
          provider_cost: number
          provider_plan_id: string
          retail_price?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          fee_flat?: number
          fee_percent?: number
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number | null
          name?: string
          network?: string
          provider?: string
          provider_cost?: number
          provider_plan_id?: string
          retail_price?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      vtu_transactions: {
        Row: {
          category: string
          charged_amount: number
          completed_at: string | null
          created_at: string
          face_value: number
          fee_amount: number
          id: string
          network: string
          operation: string
          phone: string
          product_id: string | null
          product_name: string
          provider: string
          provider_plan_id: string
          provider_reference: string | null
          provider_response: Json | null
          request_key: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          charged_amount: number
          completed_at?: string | null
          created_at?: string
          face_value: number
          fee_amount?: number
          id?: string
          network: string
          operation: string
          phone: string
          product_id?: string | null
          product_name: string
          provider?: string
          provider_plan_id: string
          provider_reference?: string | null
          provider_response?: Json | null
          request_key: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          charged_amount?: number
          completed_at?: string | null
          created_at?: string
          face_value?: number
          fee_amount?: number
          id?: string
          network?: string
          operation?: string
          phone?: string
          product_id?: string | null
          product_name?: string
          provider?: string
          provider_plan_id?: string
          provider_reference?: string | null
          provider_response?: Json | null
          request_key?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vtu_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vtu_products"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_balances: {
        Row: {
          balance: number
          id: string
          total_deposited: number
          total_spent: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          total_deposited?: number
          total_spent?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          total_deposited?: number
          total_spent?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wallet_operation_requests: {
        Row: {
          amount: number
          balance_after_charge: number | null
          balance_after_refund: number | null
          charge_transaction_id: string | null
          created_at: string
          id: string
          operation: string
          refund_transaction_id: string | null
          request_key: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after_charge?: number | null
          balance_after_refund?: number | null
          charge_transaction_id?: string | null
          created_at?: string
          id?: string
          operation: string
          refund_transaction_id?: string | null
          request_key: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after_charge?: number | null
          balance_after_refund?: number | null
          charge_transaction_id?: string | null
          created_at?: string
          id?: string
          operation?: string
          refund_transaction_id?: string | null
          request_key?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_operation_requests_charge_transaction_id_fkey"
            columns: ["charge_transaction_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_operation_requests_refund_transaction_id_fkey"
            columns: ["refund_transaction_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          operation: string | null
          reference: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          operation?: string | null
          reference?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          operation?: string | null
          reference?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_endpoints: {
        Row: {
          active: boolean
          created_at: string | null
          description: string | null
          events: string[]
          id: string
          last_triggered_at: string | null
          secret: string
          url: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          description?: string | null
          events?: string[]
          id?: string
          last_triggered_at?: string | null
          secret: string
          url: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string | null
          description?: string | null
          events?: string[]
          id?: string
          last_triggered_at?: string | null
          secret?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _notify_modification_request_status: {
        Args: {
          p_rejection_reason?: string
          p_status: string
          p_user_id: string
        }
        Returns: undefined
      }
      admin_process_modification_request: {
        Args: {
          p_action: string
          p_admin_notes?: string
          p_assigned_to?: string
          p_priority?: string
          p_rejection_reason?: string
          p_request_id: string
        }
        Returns: {
          admin_notes: string | null
          assigned_at: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          current_value: string | null
          fee_amount: number | null
          id: string
          modification_type: string
          nin: string
          payment_reference: string | null
          priority: string
          reason: string
          rejection_reason: string | null
          requested_value: string
          reviewed_at: string | null
          staff_notes: string | null
          status: string
          supporting_documents: Json | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "nin_modification_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_user_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      authorize_vtu_reference: {
        Args: { p_reference: string; p_user_id: string }
        Returns: boolean
      }
      claim_background_jobs: {
        Args: { p_limit?: number; p_types?: string[]; p_worker: string }
        Returns: {
          attempt_count: number
          completed_at: string | null
          created_at: string
          id: string
          last_error: string | null
          last_result: Json | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          payload: Json
          run_at: string
          status: string
          type: string
          unique_key: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "background_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      complete_background_job: {
        Args: { p_job_id: string; p_result?: Json }
        Returns: undefined
      }
      count_recent_requests: {
        Args: { p_api_key_id: string; p_window_seconds?: number }
        Returns: number
      }
      enqueue_background_job: {
        Args: {
          p_max_attempts?: number
          p_payload: Json
          p_run_at?: string
          p_type: string
          p_unique_key?: string
        }
        Returns: string
      }
      ensure_wallet_balance_row: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      fail_background_job: {
        Args: {
          p_error: string
          p_force_terminal?: boolean
          p_job_id: string
          p_result?: Json
          p_retry_delay_seconds?: number
        }
        Returns: undefined
      }
      get_admin_users_with_roles: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_audit_log: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_target_id?: string
          p_target_type: string
        }
        Returns: string
      }
      list_my_vtu_transactions: {
        Args: { p_category?: string; p_limit?: number; p_offset?: number }
        Returns: {
          category: string
          charged_amount: number
          completed_at: string
          created_at: string
          face_value: number
          id: string
          network: string
          phone: string
          product_name: string
          provider: string
          provider_reference: string
          service_identifier: string
          status: string
          token: string | null
        }[]
      }
      list_vtu_products: {
        Args: { p_category?: string }
        Returns: {
          category: string
          fee_flat: number
          fee_percent: number
          id: string
          max_amount: number
          min_amount: number
          name: string
          network: string
          retail_price: number
        }[]
      }
      prepare_vtu_purchase: {
        Args: {
          p_amount?: number
          p_phone: string
          p_product_id: string
          p_request_key: string
          p_user_id: string
        }
        Returns: Json
      }
      quote_vtu_purchase: {
        Args: { p_amount?: number; p_product_id: string }
        Returns: Json
      }
      record_operational_event: {
        Args: {
          p_action?: string
          p_alert_dedupe_key?: string
          p_alert_title?: string
          p_alert_type?: string
          p_api_key_id?: string
          p_component: string
          p_create_alert?: boolean
          p_duration_ms?: number
          p_event_type: string
          p_job_id?: string
          p_message?: string
          p_metadata?: Json
          p_provider?: string
          p_request_id?: string
          p_severity?: string
          p_source: string
          p_state?: string
          p_status_code?: number
          p_user_id?: string
        }
        Returns: string
      }
      reschedule_background_job: {
        Args: { p_delay_seconds?: number; p_job_id: string; p_result?: Json }
        Returns: undefined
      }
      settle_vtu_transaction: {
        Args: {
          p_provider_reference?: string
          p_provider_response?: Json
          p_request_key: string
          p_state: string
        }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      staff_process_modification_request: {
        Args: { p_action: string; p_request_id: string; p_staff_notes?: string }
        Returns: {
          admin_notes: string | null
          assigned_at: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          current_value: string | null
          fee_amount: number | null
          id: string
          modification_type: string
          nin: string
          payment_reference: string | null
          priority: string
          reason: string
          rejection_reason: string | null
          requested_value: string
          reviewed_at: string | null
          staff_notes: string | null
          status: string
          supporting_documents: Json | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "nin_modification_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_modification_request: {
        Args: {
          p_current_value?: string
          p_modification_type: string
          p_nin: string
          p_reason?: string
          p_requested_value?: string
        }
        Returns: {
          admin_notes: string | null
          assigned_at: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          current_value: string | null
          fee_amount: number | null
          id: string
          modification_type: string
          nin: string
          payment_reference: string | null
          priority: string
          reason: string
          rejection_reason: string | null
          requested_value: string
          reviewed_at: string | null
          staff_notes: string | null
          status: string
          supporting_documents: Json | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "nin_modification_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_paid_modification_request: {
        Args: {
          p_current_value?: string
          p_modification_type: string
          p_nin: string
          p_reason?: string
          p_request_key?: string
          p_requested_value?: string
        }
        Returns: Json
      }
      update_operational_alert_status: {
        Args: { p_alert_id: string; p_status: string }
        Returns: {
          alert_type: string
          component: string
          created_at: string
          dedupe_key: string | null
          event_id: string | null
          first_seen_at: string
          id: string
          last_seen_at: string
          message: string
          metadata: Json
          occurrence_count: number
          severity: string
          source: string
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "operational_alerts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      wallet_apply_top_up: {
        Args: {
          p_amount: number
          p_description?: string
          p_reference: string
          p_user_id: string
        }
        Returns: Json
      }
      wallet_charge_operation:
        | { Args: { p_operation: string; p_user_id: string }; Returns: Json }
        | {
            Args: {
              p_operation: string
              p_request_key: string
              p_user_id: string
            }
            Returns: Json
          }
      wallet_charge_variable_operation: {
        Args: {
          p_amount: number
          p_description: string
          p_operation: string
          p_request_key: string
          p_user_id: string
        }
        Returns: Json
      }
      wallet_get_balance: { Args: { p_user_id?: string }; Returns: number }
      wallet_operation_label: { Args: { p_operation: string }; Returns: string }
      wallet_operation_price: { Args: { p_operation: string }; Returns: number }
      wallet_refund_operation:
        | {
            Args: { p_operation: string; p_reason?: string; p_user_id: string }
            Returns: Json
          }
        | {
            Args: {
              p_operation: string
              p_reason?: string
              p_request_key?: string
              p_user_id: string
            }
            Returns: Json
          }
      wallet_refund_variable_operation: {
        Args: {
          p_operation: string
          p_reason?: string
          p_request_key: string
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user" | "staff" | "vip"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "staff", "vip"],
    },
  },
} as const
