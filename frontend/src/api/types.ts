// ── Enums ──
export type RequestStatus =
  | 'DRAFT'
  | 'PENDING_TECHNICAL'
  | 'PENDING_FINANCIAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PURCHASING'
  | 'RECEIVED_PARTIAL'
  | 'RECEIVED_FULL'
  | 'COMPLETED'
  | 'CANCELLED'

// ── Auth ──
export interface Token {
  access_token: string
  token_type: string
}

// ── Pagination ──
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  skip: number
  limit: number
}

// ── User ──
export interface UserResponse {
  id: string
  email: string
  full_name: string | null
  is_active: boolean
  role_id: string
  role_name: string | null
}

// ── Request ──
export interface RequestItem {
  id: string
  description: string
  sku: string | null
  quantity: number
  unit_price: number
  total_price: number
}

export interface RequestItemCreate {
  description: string
  sku?: string
  quantity: number
  unit_price: number
}

export interface RequestCreate {
  title: string
  description?: string
  cost_center_id: string
  items: RequestItemCreate[]
}

export interface RequestResponse {
  id: string
  title: string
  description: string | null
  cost_center_id: string
  cost_center_name: string | null
  requester_id: string
  requester_name: string | null
  status: RequestStatus
  total_amount: number
  currency: string
  current_step: number
  created_at: string
  updated_at: string | null
  items: RequestItem[]
}

export interface WorkflowLogResponse {
  id: string
  request_id: string
  actor_id: string
  actor_name: string | null
  actor_role: string | null
  action: string
  from_status: string | null
  to_status: string | null
  comment: string | null
  ip_address: string | null
  timestamp: string
}

export interface RequestDetail extends RequestResponse {
  logs: WorkflowLogResponse[]
}

export interface RequestTimeline {
  request_id: string
  title: string
  current_status: string
  current_step: number
  total_steps: number
  next_approver_role: string | null
  logs: WorkflowLogResponse[]
}

export interface WorkflowAction {
  comment?: string
}

export interface ReceptionInput {
  is_partial: boolean
  comment?: string
}

export interface RequestFilters {
  status?: string
  search?: string
  created_from?: string
  created_to?: string
  min_amount?: number
  max_amount?: number
  cost_center_id?: string
  skip?: number
  limit?: number
}

// ── Budget ──
export interface BudgetResponse {
  id: string
  cost_center_id: string
  cost_center_name: string | null
  year: number
  total_amount: number
  reserved_amount: number
  executed_amount: number
  available_amount: number
}

// ── Organization ──
export interface CompanyResponse {
  id: string
  name: string
  tax_id: string | null
}

export interface CostCenterResponse {
  id: string
  name: string
  code: string
  company_id: string
}

// ── Comment ──
export interface CommentResponse {
  id: string
  request_id: string
  user_id: string
  user_name: string | null
  text: string
  created_at: string
}
