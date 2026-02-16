import apiClient from './client'
import type {
  PaginatedResponse, RequestResponse, RequestDetail,
  RequestCreate, RequestFilters, RequestTimeline,
  WorkflowAction, ReceptionInput, CommentResponse,
} from './types'

export const requestsApi = {
  list: async (filters: RequestFilters = {}): Promise<PaginatedResponse<RequestResponse>> => {
    const params = new URLSearchParams()
    if (filters.status) params.append('status', filters.status)
    if (filters.search) params.append('search', filters.search)
    if (filters.created_from) params.append('created_from', filters.created_from)
    if (filters.created_to) params.append('created_to', filters.created_to)
    if (filters.min_amount != null) params.append('min_amount', String(filters.min_amount))
    if (filters.max_amount != null) params.append('max_amount', String(filters.max_amount))
    if (filters.cost_center_id) params.append('cost_center_id', filters.cost_center_id)
    params.append('skip', String(filters.skip ?? 0))
    params.append('limit', String(filters.limit ?? 20))
    const { data } = await apiClient.get(`/requests/?${params}`)
    return data
  },

  getDetail: async (id: string): Promise<RequestDetail> => {
    const { data } = await apiClient.get(`/requests/${id}`)
    return data
  },

  getTimeline: async (id: string): Promise<RequestTimeline> => {
    const { data } = await apiClient.get(`/requests/${id}/timeline`)
    return data
  },

  create: async (payload: RequestCreate): Promise<RequestResponse> => {
    const { data } = await apiClient.post('/requests/', payload)
    return data
  },

  submit: async (id: string): Promise<RequestResponse> => {
    const { data } = await apiClient.post(`/requests/${id}/submit`)
    return data
  },

  approve: async (id: string, action: WorkflowAction): Promise<RequestResponse> => {
    const { data } = await apiClient.post(`/requests/${id}/approve`, action)
    return data
  },

  reject: async (id: string, action: WorkflowAction): Promise<RequestResponse> => {
    const { data } = await apiClient.post(`/requests/${id}/reject`, action)
    return data
  },

  cancel: async (id: string, action: WorkflowAction): Promise<RequestResponse> => {
    const { data } = await apiClient.post(`/requests/${id}/cancel`, action)
    return data
  },

  receive: async (id: string, input: ReceptionInput): Promise<RequestResponse> => {
    const { data } = await apiClient.post(`/requests/${id}/receive`, input)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/requests/${id}`)
  },

  exportFile: async (format: 'excel' | 'pdf', filters: RequestFilters = {}): Promise<Blob> => {
    const params = new URLSearchParams({ format })
    if (filters.status) params.append('status', filters.status)
    if (filters.search) params.append('search', filters.search)
    if (filters.min_amount != null) params.append('min_amount', String(filters.min_amount))
    if (filters.max_amount != null) params.append('max_amount', String(filters.max_amount))
    const { data } = await apiClient.get(`/requests/export?${params}`, {
      responseType: 'blob',
    })
    return data
  },

  getComments: async (id: string): Promise<CommentResponse[]> => {
    const { data } = await apiClient.get(`/requests/${id}/comments`)
    return data
  },

  addComment: async (id: string, text: string): Promise<CommentResponse> => {
    const { data } = await apiClient.post(`/requests/${id}/comments`, { text })
    return data
  },
}
