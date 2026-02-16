import apiClient from './client'
import type { PaginatedResponse, CompanyResponse, CostCenterResponse } from './types'

export const organizationsApi = {
  listCompanies: async (skip = 0, limit = 50): Promise<PaginatedResponse<CompanyResponse>> => {
    const { data } = await apiClient.get(`/organizations/companies?skip=${skip}&limit=${limit}`)
    return data
  },

  listCostCenters: async (companyId?: string, skip = 0, limit = 50): Promise<PaginatedResponse<CostCenterResponse>> => {
    const params = new URLSearchParams({ skip: String(skip), limit: String(limit) })
    if (companyId) params.append('company_id', companyId)
    const { data } = await apiClient.get(`/organizations/cost-centers?${params}`)
    return data
  },
}
