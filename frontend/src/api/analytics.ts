import apiClient from './client'

export interface MaintenanceAnalyticsSummary {
    period_start: string
    period_end: string
    total_requests: number
    requests_by_status: Record<string, number>
    requests_by_type: Record<string, number>
    average_cycle_time_days: number
    reception_approval_rate: number
    equipment_alerts: any[]
}

export const getMaintenanceAnalytics = async (params?: any): Promise<MaintenanceAnalyticsSummary> => {
    const { data } = await apiClient.get('/maintenance/analytics/summary', { params })
    return data
}
