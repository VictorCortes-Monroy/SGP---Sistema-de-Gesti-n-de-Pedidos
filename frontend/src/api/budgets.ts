import apiClient from './client'
import type { PaginatedResponse, BudgetResponse, BudgetReportResponse } from './types'

export const budgetsApi = {
  list: async (skip = 0, limit = 50): Promise<PaginatedResponse<BudgetResponse>> => {
    const { data } = await apiClient.get(`/budgets/?skip=${skip}&limit=${limit}`)
    return data
  },

  getByCC: async (costCenterId: string): Promise<BudgetResponse> => {
    const { data } = await apiClient.get(`/budgets/${costCenterId}`)
    return data
  },

  getReport: async (year?: number, companyId?: string): Promise<BudgetReportResponse> => {
    const params = new URLSearchParams()
    if (year) params.append('year', String(year))
    if (companyId) params.append('company_id', companyId)
    const { data } = await apiClient.get(`/budgets/report?${params}`)
    return data
  },

  exportReport: async (format: 'excel' | 'pdf', year?: number, companyId?: string): Promise<Blob> => {
    const params = new URLSearchParams({ format })
    if (year) params.append('year', String(year))
    if (companyId) params.append('company_id', companyId)
    const { data } = await apiClient.get(`/budgets/report/export?${params}`, {
      responseType: 'blob',
    })
    return data
  },
}
