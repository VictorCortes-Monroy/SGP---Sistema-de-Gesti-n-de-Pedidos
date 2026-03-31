import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { organizationsApi } from '@/api/organizations'
import type { CompanyCreate, CompanyUpdate, CostCenterCreate, CostCenterUpdate } from '@/api/types'

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

export function useCreateCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CompanyCreate) => organizationsApi.createCompany(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  })
}

export function useUpdateCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CompanyUpdate }) =>
      organizationsApi.updateCompany(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  })
}

export function useDeleteCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => organizationsApi.deleteCompany(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  })
}

export function useCreateCostCenter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CostCenterCreate) => organizationsApi.createCostCenter(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cost-centers'] })
    },
  })
}

export function useUpdateCostCenter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CostCenterUpdate }) =>
      organizationsApi.updateCostCenter(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cost-centers'] }),
  })
}

export function useDeleteCostCenter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => organizationsApi.deleteCostCenter(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cost-centers'] }),
  })
}
