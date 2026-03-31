import apiClient from './client'
import type { PaginatedResponse, CompanyResponse, CostCenterResponse, CompanyCreate, CompanyUpdate, CostCenterCreate, CostCenterUpdate } from './types'

export const organizationsApi = {
  listCompanies: async (skip = 0, limit = 50): Promise<PaginatedResponse<CompanyResponse>> => {
    const { data } = await apiClient.get(`/organizations/companies?skip=${skip}&limit=${limit}`)
    return data
  },

  createCompany: async (payload: CompanyCreate): Promise<CompanyResponse> => {
    const { data } = await apiClient.post('/organizations/companies', payload)
    return data
  },

  updateCompany: async (id: string, payload: CompanyUpdate): Promise<CompanyResponse> => {
    const { data } = await apiClient.put(`/organizations/companies/${id}`, payload)
    return data
  },

  deleteCompany: async (id: string): Promise<void> => {
    await apiClient.delete(`/organizations/companies/${id}`)
  },

  listCostCenters: async (companyId?: string, skip = 0, limit = 50): Promise<PaginatedResponse<CostCenterResponse>> => {
    const params = new URLSearchParams({ skip: String(skip), limit: String(limit) })
    if (companyId) params.append('company_id', companyId)
    const { data } = await apiClient.get(`/organizations/cost-centers?${params}`)
    return data
  },

  createCostCenter: async (payload: CostCenterCreate): Promise<CostCenterResponse> => {
    const { data } = await apiClient.post('/organizations/cost-centers', payload)
    return data
  },

  updateCostCenter: async (id: string, payload: CostCenterUpdate): Promise<CostCenterResponse> => {
    const { data } = await apiClient.put(`/organizations/cost-centers/${id}`, payload)
    return data
  },

  deleteCostCenter: async (id: string): Promise<void> => {
    await apiClient.delete(`/organizations/cost-centers/${id}`)
  },
}
