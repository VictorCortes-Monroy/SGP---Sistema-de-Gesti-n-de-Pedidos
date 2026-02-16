import apiClient from './client'
import type { PaginatedResponse, BudgetResponse } from './types'

export const budgetsApi = {
  list: async (skip = 0, limit = 50): Promise<PaginatedResponse<BudgetResponse>> => {
    const { data } = await apiClient.get(`/budgets/?skip=${skip}&limit=${limit}`)
    return data
  },

  getByCC: async (costCenterId: string): Promise<BudgetResponse> => {
    const { data } = await apiClient.get(`/budgets/${costCenterId}`)
    return data
  },
}
