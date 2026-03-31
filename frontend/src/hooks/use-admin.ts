import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import type { UserCreate, UserUpdate, ApprovalMatrixCreate } from '@/api/types'

// ── Users ──

export function useUsers(skip = 0, limit = 50) {
  return useQuery({
    queryKey: ['users', skip, limit],
    queryFn: () => adminApi.listUsers(skip, limit),
  })
}

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => adminApi.listRoles(),
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UserCreate) => adminApi.createUser(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UserUpdate }) =>
      adminApi.updateUser(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

// ── Approval Matrix ──

export function useApprovalRules(companyId?: string, costCenterId?: string) {
  return useQuery({
    queryKey: ['approval-rules', companyId, costCenterId],
    queryFn: () => adminApi.listApprovalRules(companyId, costCenterId),
  })
}

export function useCreateApprovalRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ApprovalMatrixCreate) => adminApi.createApprovalRule(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approval-rules'] }),
  })
}

export function useDeleteApprovalRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteApprovalRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approval-rules'] }),
  })
}
