import apiClient from './client'
import type {
  PurchaseOrderCreate, PurchaseOrderResponse, PurchaseOrderList,
  POReceptionInput, QuotationCreate, QuotationResponse,
  PaginatedResponse,
} from './types'

export const purchaseOrdersApi = {
  create: async (payload: PurchaseOrderCreate): Promise<PurchaseOrderResponse> => {
    const { data } = await apiClient.post('/purchase-orders/', payload)
    return data
  },

  list: async (params?: {
    request_id?: string
    status?: string
    skip?: number
    limit?: number
  }): Promise<PaginatedResponse<PurchaseOrderList>> => {
    const { data } = await apiClient.get('/purchase-orders/', { params })
    return data
  },

  get: async (id: string): Promise<PurchaseOrderResponse> => {
    const { data } = await apiClient.get(`/purchase-orders/${id}`)
    return data
  },

  update: async (id: string, payload: Partial<PurchaseOrderCreate>): Promise<PurchaseOrderResponse> => {
    const { data } = await apiClient.patch(`/purchase-orders/${id}`, payload)
    return data
  },

  send: async (id: string): Promise<PurchaseOrderResponse> => {
    const { data } = await apiClient.post(`/purchase-orders/${id}/send`)
    return data
  },

  receive: async (id: string, payload: POReceptionInput): Promise<PurchaseOrderResponse> => {
    const { data } = await apiClient.post(`/purchase-orders/${id}/receive`, payload)
    return data
  },

  cancel: async (id: string): Promise<PurchaseOrderResponse> => {
    const { data } = await apiClient.post(`/purchase-orders/${id}/cancel`)
    return data
  },

  createQuotation: async (payload: QuotationCreate): Promise<QuotationResponse> => {
    const { data } = await apiClient.post('/quotations/', payload)
    return data
  },

  listQuotations: async (requestId: string): Promise<QuotationResponse[]> => {
    const { data } = await apiClient.get('/quotations/', { params: { request_id: requestId } })
    return data
  },

  updateQuotation: async (
    id: string,
    payload: { status?: string; notes?: string; rejection_reason?: string }
  ): Promise<QuotationResponse> => {
    const { data } = await apiClient.patch(`/quotations/${id}`, payload)
    return data
  },
}
