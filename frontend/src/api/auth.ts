import apiClient from './client'
import type { Token, UserResponse } from './types'

export const authApi = {
  login: async (email: string, password: string): Promise<Token> => {
    const formData = new URLSearchParams()
    formData.append('username', email)
    formData.append('password', password)
    const { data } = await apiClient.post<Token>('/login/access-token', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return data
  },

  getMe: async (): Promise<UserResponse> => {
    const { data } = await apiClient.get<UserResponse>('/users/me')
    return data
  },
}
