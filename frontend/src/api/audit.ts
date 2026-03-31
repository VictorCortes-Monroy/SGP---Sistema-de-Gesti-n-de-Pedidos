import apiClient from './client'
import type { PaginatedResponse, AuditLogEntry, AuditLogFilters } from './types'

export const auditApi = {
  listLogs: async (filters: AuditLogFilters = {}): Promise<PaginatedResponse<AuditLogEntry>> => {
    const params = new URLSearchParams()
    if (filters.date_from) params.append('date_from', filters.date_from)
    if (filters.date_to) params.append('date_to', filters.date_to)
    if (filters.action) params.append('action', filters.action)
    if (filters.actor_id) params.append('actor_id', filters.actor_id)
    if (filters.request_id) params.append('request_id', filters.request_id)
    params.append('skip', String(filters.skip ?? 0))
    params.append('limit', String(filters.limit ?? 50))
    const { data } = await apiClient.get(`/audit/logs?${params}`)
    return data
  },

  exportLogs: async (format: 'excel' | 'pdf', filters: AuditLogFilters = {}): Promise<Blob> => {
    const params = new URLSearchParams({ format })
    if (filters.date_from) params.append('date_from', filters.date_from)
    if (filters.date_to) params.append('date_to', filters.date_to)
    if (filters.action) params.append('action', filters.action)
    if (filters.actor_id) params.append('actor_id', filters.actor_id)
    if (filters.request_id) params.append('request_id', filters.request_id)
    const { data } = await apiClient.get(`/audit/logs/export?${params}`, {
      responseType: 'blob',
    })
    return data
  },
}
