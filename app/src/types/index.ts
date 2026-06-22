export type UserRole = 'operations_analyst' | 'account_manager' | 'admin'

export type OrderStatus =
  | 'draft'
  | 'submitted'
  | 'needs_changes'
  | 'approved_internally'
  | 'sent_to_client'
  | 'client_approved'
  | 'client_declined'

export type AuditEvent =
  | 'created' | 'submitted' | 'reviewed' | 'changes_requested'
  | 'resubmitted' | 'approved' | 'rejected' | 'sent_email' | 'sent_sms'
  | 'client_approved' | 'client_declined' | 'pricing_updated' | 'message_updated'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatar_initials: string
  is_active: boolean
  created_at: string
}

export interface Order {
  id: string
  job_name: string
  client_name: string
  client_email: string
  client_phone?: string
  property_address?: string
  subcontractor_name: string
  submitted_by_id: string
  account_manager_id?: string
  work_description: string
  scope_reason?: string
  sub_cost: number
  markup_pct: number
  client_price: number
  internal_notes?: string
  client_message?: string
  status: OrderStatus
  change_request_note?: string
  client_token: string
  client_token_expires_at?: string
  client_responded_at?: string
  date_submitted?: string
  created_at: string
  updated_at: string
  // Joined fields
  submitted_by?: User
  account_manager?: User
  photos?: OrderPhoto[]
  audit_trail?: AuditEntry[]
}

export interface OrderPhoto {
  id: string
  order_id: string
  storage_key: string
  public_url?: string
  caption?: string
  sort_order: number
  uploaded_by: string
  created_at: string
}

export interface AuditEntry {
  id: string
  order_id: string
  actor_id?: string
  actor_name: string
  event: AuditEvent
  note?: string
  metadata?: Record<string, unknown>
  created_at: string
}

// API request/response shapes
export interface CreateOrderInput {
  job_name: string
  client_name: string
  client_email: string
  client_phone?: string
  property_address?: string
  subcontractor_name: string
  account_manager_id?: string
  work_description: string
  scope_reason?: string
  sub_cost: number
  internal_notes?: string
  submit?: boolean  // true = submit immediately, false = save draft
}

export interface UpdatePricingInput {
  sub_cost?: number
  markup_pct?: number
  client_message?: string
  internal_notes?: string
}

export interface StatusTransitionInput {
  status: OrderStatus
  note?: string
}

export interface SendOrderInput {
  channel: 'email' | 'sms'
}

export interface ClientResponseInput {
  approved: boolean
  note?: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface AuthPayload {
  user: User
  token: string
}

export interface ApiResponse<T = void> {
  data?: T
  error?: string
}

export type StatusCount = Record<OrderStatus, number>

export interface OrderNote {
  id: string
  order_id: string
  author_id: string
  body: string
  created_at: string
  author?: {
    id: string
    name: string
    avatar_initials: string
  }
}

export interface OrderTemplate {
  id: string
  name: string
  job_name?: string
  work_description?: string
  scope_reason?: string
  subcontractor_name?: string
  markup_pct?: number
  created_by?: string
  created_at: string
}

export interface Subcontractor {
  id: string
  name: string
  contact_name?: string
  phone?: string
  email?: string
  specialty?: string
  active: boolean
  created_at: string
}
