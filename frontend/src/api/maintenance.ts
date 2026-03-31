import apiClient from './client'
import {
    MaintEquipment,
    HorometerUpdate,
    HorometerLogEntry,
    MaintProvider,
    MaintRequestCreate,
    MaintRequestResponse,
    ReceptionPayload,
    CloseInput,
    GateStatusResponse,
    PaginatedResponse,
    WorkflowLogResponse,
    MaintenanceAnalyticsSummary,
    MaintAlert,
} from './types'

// ── Equipment ──

export const getEquipmentList = async (params?: any): Promise<PaginatedResponse<MaintEquipment>> => {
    const { data } = await apiClient.get('/maintenance/equipment/', { params })
    return data
}

export const getEquipmentDetail = async (id: string): Promise<MaintEquipment> => {
    const { data } = await apiClient.get(`/maintenance/equipment/${id}`)
    return data
}

export const createEquipment = async (payload: Partial<MaintEquipment>): Promise<MaintEquipment> => {
    const { data } = await apiClient.post('/maintenance/equipment/', payload)
    return data
}

export const updateEquipment = async (id: string, payload: Partial<MaintEquipment>): Promise<MaintEquipment> => {
    const { data } = await apiClient.put(`/maintenance/equipment/${id}`, payload)
    return data
}

export const deleteEquipment = async (id: string): Promise<void> => {
    await apiClient.delete(`/maintenance/equipment/${id}`)
}

export const updateHorometer = async (id: string, payload: HorometerUpdate): Promise<MaintEquipment> => {
    const { data } = await apiClient.put(`/maintenance/equipment/${id}/horometer`, payload)
    return data
}

export const getHorometerHistory = async (id: string): Promise<HorometerLogEntry[]> => {
    const { data } = await apiClient.get(`/maintenance/equipment/${id}/horometer-history`)
    return data
}


// ── Providers ──

export const getProviders = async (params?: any): Promise<PaginatedResponse<MaintProvider>> => {
    const { data } = await apiClient.get('/maintenance/providers/', { params })
    return data
}

export const getProviderDetail = async (id: string): Promise<MaintProvider> => {
    const { data } = await apiClient.get(`/maintenance/providers/${id}`)
    return data
}

export const createProvider = async (payload: Partial<MaintProvider>): Promise<MaintProvider> => {
    const { data } = await apiClient.post('/maintenance/providers/', payload)
    return data
}

export const updateProvider = async (id: string, payload: Partial<MaintProvider>): Promise<MaintProvider> => {
    const { data } = await apiClient.put(`/maintenance/providers/${id}`, payload)
    return data
}


// ── Requests ──

export const getMaintenanceRequests = async (params?: any): Promise<PaginatedResponse<MaintRequestResponse>> => {
    const { data } = await apiClient.get('/maintenance/requests/', { params })
    return data
}

export const getMaintRequest = async (id: string): Promise<MaintRequestResponse> => {
    const { data } = await apiClient.get(`/maintenance/requests/${id}`)
    return data
}

export const createMaintRequest = async (payload: MaintRequestCreate): Promise<MaintRequestResponse> => {
    const { data } = await apiClient.post('/maintenance/requests/', payload)
    return data
}

export const submitMaintRequest = async (id: string): Promise<MaintRequestResponse> => {
    const { data } = await apiClient.post(`/maintenance/requests/${id}/submit`)
    return data
}

export const approveMaintRequest = async (id: string, costCenterId?: string): Promise<MaintRequestResponse> => {
    // If we have an existing request mapped, it may ask for cost_center
    const params = costCenterId ? { cost_center_id: costCenterId } : {}
    const { data } = await apiClient.post(`/maintenance/requests/${id}/approve`, null, { params })
    return data
}

export const rejectMaintRequest = async (id: string, reason?: string): Promise<MaintRequestResponse> => {
    const { data } = await apiClient.post(`/maintenance/requests/${id}/reject`, { reason })
    return data
}

export const confirmProvider = async (id: string): Promise<MaintRequestResponse> => {
    const { data } = await apiClient.post(`/maintenance/requests/${id}/confirm-provider`)
    return data
}

export const scheduleTransport = async (id: string, payload: any): Promise<MaintRequestResponse> => {
    const { data } = await apiClient.post(`/maintenance/requests/${id}/schedule-transport`, payload)
    return data
}

export const linkPurchaseOrder = async (id: string, poCode: string): Promise<MaintRequestResponse> => {
    const { data } = await apiClient.post(`/maintenance/requests/${id}/link-purchase-order?purchase_order_code=${poCode}`)
    return data
}

export const getGateStatus = async (id: string): Promise<GateStatusResponse> => {
    const { data } = await apiClient.get(`/maintenance/requests/${id}/gate-status`)
    return data
}

export const startExecution = async (id: string): Promise<MaintRequestResponse> => {
    const { data } = await apiClient.post(`/maintenance/requests/${id}/start-execution`)
    return data
}

export const confirmWorkshopArrival = async (id: string): Promise<MaintRequestResponse> => {
    const { data } = await apiClient.post(`/maintenance/requests/${id}/confirm-workshop-arrival`)
    return data
}

export const completeExecution = async (id: string): Promise<MaintRequestResponse> => {
    const { data } = await apiClient.post(`/maintenance/requests/${id}/complete-execution`)
    return data
}

export const receptionConforme = async (id: string, payload: ReceptionPayload): Promise<MaintRequestResponse> => {
    const { data } = await apiClient.post(`/maintenance/requests/${id}/reception`, payload)
    return data
}

export const uploadCertificate = async (id: string, file: File): Promise<MaintRequestResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await apiClient.post(`/maintenance/requests/${id}/upload-certificate`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
}

export const confirmFieldReturn = async (id: string): Promise<MaintRequestResponse> => {
    const { data } = await apiClient.post(`/maintenance/requests/${id}/confirm-field-return`)
    return data
}

export const closeMaintRequest = async (id: string, payload: CloseInput): Promise<MaintRequestResponse> => {
    const { data } = await apiClient.post(`/maintenance/requests/${id}/close`, payload)
    return data
}

export const registerQuotation = async (id: string, payload: { quotation_amount: number; notes?: string }): Promise<MaintRequestResponse> => {
    const { data } = await apiClient.post(`/maintenance/requests/${id}/register-quotation`, payload)
    return data
}

export const signD5 = async (id: string, payload: { notes?: string }): Promise<MaintRequestResponse> => {
    const { data } = await apiClient.post(`/maintenance/requests/${id}/sign-d5`, payload)
    return data
}

export const registerInvoice = async (id: string, payload: { invoice_number: string; invoice_amount: number }): Promise<MaintRequestResponse> => {
    const { data } = await apiClient.post(`/maintenance/requests/${id}/register-invoice`, payload)
    return data
}

export const confirmPayment = async (id: string, payload: { notes?: string }): Promise<MaintRequestResponse> => {
    const { data } = await apiClient.post(`/maintenance/requests/${id}/confirm-payment`, payload)
    return data
}

export const getTimeline = async (id: string): Promise<WorkflowLogResponse[]> => {
    const { data } = await apiClient.get(`/maintenance/requests/${id}/timeline`)
    return data
}

export const exportMaintenanceRequests = async (format: 'excel' | 'pdf', filterParams?: any) => {
    const response = await apiClient.get('/maintenance/requests/export', {
        params: { format, ...filterParams },
        responseType: 'blob',
    })
    return response.data
}

export const getAnalyticsSummary = async (): Promise<MaintenanceAnalyticsSummary> => {
    const { data } = await apiClient.get('/maintenance/analytics/summary')
    return data
}

// ── SLA Alerts ──

export const getAlerts = async (unreadOnly = true): Promise<MaintAlert[]> => {
    const { data } = await apiClient.get('/maintenance/alerts/', { params: { unread_only: unreadOnly } })
    return data
}

export const getAlertCount = async (): Promise<{ count: number }> => {
    const { data } = await apiClient.get('/maintenance/alerts/count')
    return data
}

export const markAlertRead = async (alertId: string): Promise<void> => {
    await apiClient.patch(`/maintenance/alerts/${alertId}/read`)
}

export const runSlaChecks = async (): Promise<{ alerts_created: number }> => {
    const { data } = await apiClient.post('/maintenance/alerts/run-checks')
    return data
}
