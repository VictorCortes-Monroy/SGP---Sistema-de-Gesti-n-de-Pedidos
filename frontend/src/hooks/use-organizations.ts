import { useQuery } from '@tanstack/react-query'
import { organizationsApi } from '@/api/organizations'

export function useCostCenters(companyId?: string) {
  return useQuery({
    queryKey: ['cost-centers', companyId],
    queryFn: () => organizationsApi.listCostCenters(companyId),
  })
}

export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: () => organizationsApi.listCompanies(),
  })
}
