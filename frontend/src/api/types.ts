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
export type PurchaseType = 'INSUMOS' | 'ACTIVOS_FIJOS' | 'OTROS_SERVICIOS'

export interface RequestDocument {
  id: string
  request_id: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  uploaded_by_name: string | null
  uploaded_at: string | null
  notes: string | null
}

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
  purchase_type?: PurchaseType
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
  purchase_type: PurchaseType
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
  documents: RequestDocument[]
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

// ── Budget Report ──
export interface BudgetReportItem {
  cost_center_id: string
  cost_center_name: string
  cost_center_code: string
  total_amount: number
  reserved_amount: number
  executed_amount: number
  available_amount: number
  utilization_pct: number
}

export interface CompanyBudgetGroup {
  company_id: string
  company_name: string
  total_amount: number
  reserved_amount: number
  executed_amount: number
  available_amount: number
  budgets: BudgetReportItem[]
}

export interface BudgetReportResponse {
  year: number
  groups: CompanyBudgetGroup[]
  grand_total: number
  grand_reserved: number
  grand_executed: number
  grand_available: number
}

// ── Dashboard ──
export interface PendingActionItem {
  request_id: string
  title: string
  status: string
  total_amount: number
  requester_name: string | null
  created_at: string
}

export interface RecentRequestItem {
  id: string
  title: string
  status: string
  total_amount: number
  created_at: string
}

export interface BudgetSummaryItem {
  cost_center_name: string
  total_amount: number
  reserved_amount: number
  executed_amount: number
  available_amount: number
}

export interface DashboardSummary {
  total_requests: number
  status_distribution: Record<string, number>
  pending_actions: PendingActionItem[]
  recent_requests: RecentRequestItem[]
  budget_summary: BudgetSummaryItem[]
}

// ── Audit ──
export interface AuditLogEntry {
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
  request_title: string | null
}

export interface AuditLogFilters {
  date_from?: string
  date_to?: string
  action?: string
  actor_id?: string
  request_id?: string
  skip?: number
  limit?: number
}

// ── Maintenance Module ──
export type EquipmentStatus = 'OPERATIVE' | 'IN_TRANSIT' | 'IN_MAINTENANCE' | 'OUT_OF_SERVICE' | 'SCRAPPED'
export type EquipmentType = 'EXCAVATOR' | 'CRANE' | 'TRUCK' | 'GENERATOR' | 'COMPRESSOR' | 'PUMP' | 'FORKLIFT' | 'OTHER'

export interface MaintEquipment {
  id: string
  code: string
  name: string
  equipment_type: EquipmentType
  brand: string | null
  model: string | null
  model_year: number | null
  serial_number: string | null
  status: EquipmentStatus
  company_id: string
  cost_center_id: string | null
  current_horometer: number
  maintenance_interval_hours: number
  last_maintenance_date: string | null
  next_maintenance_due: number | null
  last_certificate_id: string | null
  notes: string | null
  is_active: boolean
}

export interface HorometerUpdate {
  reading: number
  notes?: string
}

export interface HorometerLogEntry {
  id: string
  reading: number
  previous_reading: number | null
  hours_delta: number | null
  recorded_by_name: string | null
  recorded_at: string | null
  notes: string | null
}

export interface EquipmentCreate {
  code?: string
  name: string
  equipment_type: EquipmentType
  brand?: string
  model?: string
  model_year?: number
  serial_number?: string
  company_id: string
  cost_center_id?: string
  current_horometer?: number
  maintenance_interval_hours?: number
  notes?: string
}

export interface MaintProvider {
  id: string
  rut: string
  name: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  specialties: string | null
  address: string | null
  is_active: boolean
  rating: number | null
  equipment_types: EquipmentType[]
}

export type MaintRequestStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'QUOTED_PENDING'
  | 'AWAITING_PREREQUISITES'
  | 'READY_FOR_EXECUTION'
  | 'IN_TRANSIT_TO_WORKSHOP'
  | 'IN_MAINTENANCE'
  | 'PENDING_RECEPTION'
  | 'PENDING_CERTIFICATE'
  | 'IN_TRANSIT_TO_FIELD'
  | 'COMPLETED'
  | 'PENDING_D5'
  | 'INVOICING_READY'
  | 'PENDING_PAYMENT'
  | 'CLOSED'
  | 'REJECTED'
  | 'CANCELLED'

export type MaintenanceType = 'PREVENTIVE' | 'CORRECTIVE' | 'PREDICTIVE' | 'OVERHAUL'

export interface MaintRequestCreate {
  equipment_id: string
  provider_id?: string
  maintenance_type: MaintenanceType
  description: string
  estimated_cost?: number
  currency?: string
  planned_date: string
}

export interface MaintRequestResponse {
  id: string
  code: string
  equipment_id: string
  provider_id: string | null
  requested_by_id: string
  approved_by_id: string | null
  maintenance_type: MaintenanceType
  status: MaintRequestStatus
  description: string
  estimated_cost: number | null
  actual_cost: number | null
  currency: string
  planned_date: string
  scheduled_start: string | null
  completed_at: string | null
  sgp_request_id: string | null
  purchase_order_code: string | null
  provider_confirmed: boolean
  transport_scheduled: boolean
  invoice_number: string | null
  invoice_amount: number | null
  d2_quotation_amount: number | null
  d2_quotation_notes: string | null
  d2_registered_at: string | null
  d5_signed_at: string | null
  d5_signed_by_id: string | null
  payment_confirmed_at: string | null
  payment_confirmed_by_id: string | null
  rejection_reason: string | null
  remediation_deadline: string | null
  notes: string | null
  created_at: string
}

export interface ChecklistGroup {
  [key: string]: boolean
}

export interface ChecklistInput {
  scope_verification: ChecklistGroup
  equipment_condition: ChecklistGroup
  operational_tests: ChecklistGroup
  provider_documentation: ChecklistGroup
}

export interface ReceptionPayload {
  status: 'APPROVED' | 'REJECTED'
  checklist: ChecklistInput
  notes?: string
}

export interface CloseInput {
  invoice_number: string
  invoice_amount: number
}

// Gate prerequisites timeline structure
export interface GateStatusResponse {
  request_id: string
  purchase_order_linked: boolean
  provider_confirmed: boolean
  transport_scheduled: boolean
  gate_approved: boolean
  missing: string[]
}

// ── Admin ──
export interface RoleResponse {
  id: string
  name: string
  description: string | null
}

export interface UserCreate {
  email: string
  full_name: string
  password: string
  role_id: string
  is_active?: boolean
}

export interface UserUpdate {
  email?: string
  full_name?: string
  password?: string
  role_id?: string
  is_active?: boolean
}

export interface CompanyCreate {
  name: string
  tax_id?: string
}

export interface CompanyUpdate {
  name?: string
  tax_id?: string
}

export interface CostCenterCreate {
  name: string
  code: string
  company_id: string
}

export interface CostCenterUpdate {
  name?: string
  code?: string
}

export interface ApprovalMatrixCreate {
  company_id: string
  cost_center_id?: string
  min_amount: number
  max_amount?: number
  role_id: string
  step_order: number
}

export interface ApprovalMatrixResponse {
  id: string
  company_id: string
  cost_center_id: string | null
  min_amount: number
  max_amount: number | null
  role_id: string
  role_name: string | null
  step_order: number
}

// ── Maintenance Analytics ──
export interface EquipmentDueAlert {
  equipment_id: string
  equipment_name: string
  code: string
  current_horometer: number
  next_maintenance_due: number
  hours_remaining: number
}

export interface MaintenanceAnalyticsSummary {
  total_preventive: number
  total_corrective: number
  in_execution: number
  pending_reception: number
  pending_certificate: number
  average_cycle_time_days: number
  upcoming_maintenance: EquipmentDueAlert[]
}

// ── SLA Alerts ──
export type AlertType =
  | 'SLA_PENDING_APPROVAL'
  | 'SLA_PROVIDER_CONFIRM'
  | 'SLA_RECEPTION'
  | 'SLA_EQUIPMENT_DUE'

export interface MaintAlert {
  id: string
  alert_type: AlertType
  target_role: string
  message: string
  hours_overdue: number | null
  request_id: string | null
  equipment_id: string | null
  is_read: boolean
  created_at: string
  resolved_at: string | null
}

// ── Catálogo e Inventario ──
export type SupplierCategory = 'INSUMOS' | 'ACTIVOS_FIJOS' | 'SERVICIOS' | 'MIXTO'
export type UnitOfMeasure = 'UN' | 'KG' | 'LT' | 'MT' | 'HR' | 'GL' | 'M2' | 'M3' | 'TN' | 'PZ'

export interface Supplier {
  id: string
  name: string
  rut: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  category: SupplierCategory
  payment_terms_days: number | null
  delivery_days: number | null
  rating: number | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SupplierDetail extends Supplier {
  products: SupplierProduct[]
  total_spend: number
  purchase_count: number
}

export interface CatalogItem {
  id: string
  sku: string
  name: string
  description: string | null
  category: PurchaseType
  unit_of_measure: UnitOfMeasure
  reference_price: number | null
  currency: string
  preferred_supplier_id: string | null
  preferred_supplier_name: string | null
  technical_specs: Record<string, string> | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CatalogItemDetail extends CatalogItem {
  suppliers: SupplierProduct[]
  purchase_history: PurchaseHistoryEntry[]
}

export interface SupplierProduct {
  id: string
  supplier_id: string
  catalog_item_id: string
  supplier_sku: string | null
  unit_price: number | null
  currency: string
  lead_time_days: number | null
  is_preferred: boolean
  last_purchase_date: string | null
  updated_at: string
  supplier_name?: string | null
  catalog_item_name?: string | null
}

export interface PurchaseHistoryEntry {
  request_id: string
  request_title: string
  quantity: number
  unit_price: number
  total_price: number
  purchased_at: string
  status: string
}

export interface TopProductEntry {
  catalog_item_id: string
  sku: string
  name: string
  category: string
  total_quantity: number
  total_spend: number
  purchase_count: number
}

export interface SupplierSpendEntry {
  supplier_id: string
  supplier_name: string
  total_spend: number
  purchase_count: number
  last_purchase_date: string | null
}

// ── Purchase Orders ──────────────────────────────────────────────────────────

export type POStatus =
  | 'DRAFT' | 'SENT' | 'RECEIVED_PARTIAL' | 'RECEIVED_FULL'
  | 'CLOSED' | 'CANCELLED'

export type QuotationStatus = 'RECEIVED' | 'SELECTED' | 'REJECTED'

export interface PurchaseOrderItemResponse {
  id: string
  purchase_order_id: string
  request_item_id: string | null
  catalog_item_id: string | null
  description: string
  supplier_sku: string | null
  quantity_ordered: number
  unit_price: number
  total_price: number
  quantity_received: number
}

export interface PurchaseOrderResponse {
  id: string
  request_id: string
  supplier_id: string
  supplier_name: string | null
  quotation_id: string | null
  oc_number: string
  status: POStatus
  total_amount: number
  currency: string
  expected_delivery_date: string | null
  payment_terms_days: number | null
  payment_terms_text: string | null
  notes: string | null
  created_by_id: string
  created_at: string
  updated_at: string
  items: PurchaseOrderItemResponse[]
}

export interface PurchaseOrderList extends Omit<PurchaseOrderResponse, 'items'> {}

export interface PurchaseOrderItemCreate {
  request_item_id?: string
  catalog_item_id?: string
  description: string
  supplier_sku?: string
  quantity_ordered: number
  unit_price: number
}

export interface PurchaseOrderCreate {
  request_id: string
  supplier_id: string
  quotation_id?: string
  currency?: string
  expected_delivery_date?: string
  payment_terms_days?: number
  payment_terms_text?: string
  notes?: string
  items: PurchaseOrderItemCreate[]
}

export interface POReceptionInput {
  items: { purchase_order_item_id: string; quantity_received: number }[]
  notes?: string
}

export interface QuotationItemResponse {
  id: string
  quotation_id: string
  description: string
  quantity: number
  unit_price: number
  total_price: number
}

export interface QuotationResponse {
  id: string
  request_id: string
  supplier_id: string
  supplier_name: string | null
  quote_reference: string | null
  status: QuotationStatus
  total_amount: number | null
  currency: string
  valid_until: string | null
  notes: string | null
  rejection_reason: string | null
  created_by_id: string
  created_at: string
  updated_at: string
  items: QuotationItemResponse[]
}

export interface QuotationCreate {
  request_id: string
  supplier_id: string
  quote_reference?: string
  total_amount?: number
  currency?: string
  valid_until?: string
  notes?: string
  items: { description: string; quantity: number; unit_price: number }[]
}
