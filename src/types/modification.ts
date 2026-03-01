/**
 * Types for NIN Modification Request System
 * Supports VIP → Admin → Staff workflow
 */

export type ModificationType = 
  | 'change_name' 
  | 'change_phone' 
  | 'change_address' 
  | 'change_dob';

export type RequestStatus = 
  | 'pending' 
  | 'under_review' 
  | 'assigned' 
  | 'in_progress' 
  | 'completed' 
  | 'rejected';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface NinModificationRequest {
  id: string;
  user_id: string;
  nin: string;
  modification_type: ModificationType;
  current_value?: string;
  requested_value: string;
  reason?: string;
  status: RequestStatus;
  priority: Priority;
  assigned_to?: string;
  reviewed_by?: string;
  admin_notes?: string;
  staff_notes?: string;
  rejection_reason?: string;
  supporting_documents?: string[];
  created_at: string;
  updated_at: string;
  reviewed_at?: string;
  assigned_at?: string;
  completed_at?: string;
}

export interface ModificationRequestFormData {
  nin: string;
  modification_type: ModificationType;
  current_value?: string;
  requested_value: string;
  reason?: string;
  supporting_documents?: File[];
}

export interface AdminReviewData {
  status: 'under_review' | 'assigned' | 'rejected';
  priority?: Priority;
  assigned_to?: string;
  admin_notes?: string;
  rejection_reason?: string;
}

export interface StaffUpdateData {
  status: 'in_progress' | 'completed';
  staff_notes?: string;
}
