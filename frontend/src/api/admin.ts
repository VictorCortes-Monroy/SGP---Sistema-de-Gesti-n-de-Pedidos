import apiClient from './client'
import type {
  PaginatedResponse,
  UserResponse,
  UserCreate,
  UserUpdate,
  RoleResponse,
  ApprovalMatrixCreate,
  ApprovalMatrixResponse,
} from './types'

export const adminApi = {
  // ── Users ──
  listUsers: async (skip = 0, limit = 50): Promise<PaginatedResponse<UserResponse>> => {
    const { data } = await apiClient.get(`/users/?skip=${skip}&limit=${limit}`)
    return data
  },

  getUser: async (id: string): Promise<UserResponse> => {
    const { data } = await apiClient.get(`/users/${id}`)
    return data
  },

  createUser: async (payload: UserCreate): Promise<UserResponse> => {
    const { data } = await apiClient.post('/users/', payload)
    return data
  },

  updateUser: async (id: string, payload: UserUpdate): Promise<UserResponse> => {
    const { data } = await apiClient.put(`/users/${id}`, payload)
    return data
  },

  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`)
  },

  listRoles: async (): Promise<RoleResponse[]> => {
    const { data } = await apiClient.get('/users/roles')
    return data
  },

  // ── Approval Matrix ──
  listApprovalRules: async (companyId?: string, costCenterId?: string, skip = 0, limit = 100): Promise<PaginatedResponse<ApprovalMatrixResponse>> => {
    const params = new URLSearchParams({ skip: String(skip), limit: String(limit) })
    if (companyId) params.append('company_id', companyId)
    if (costCenterId) params.append('cost_center_id', costCenterId)
    const { data } = await apiClient.get(`/approval-matrix/?${params}`)
    return data
  },

  createApprovalRule: async (payload: ApprovalMatrixCreate): Promise<ApprovalMatrixResponse> => {
    const { data } = await apiClient.post('/approval-matrix/', payload)
    return data
  },

  deleteApprovalRule: async (id: string): Promise<void> => {
    await apiClient.delete(`/approval-matrix/${id}`)
  },
}
