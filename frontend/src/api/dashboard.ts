import apiClient from './client'
import type { DashboardSummary } from './types'

export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    const { data } = await apiClient.get('/dashboard/summary')
    return data
  },
}
