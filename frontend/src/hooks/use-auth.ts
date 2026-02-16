import { useMutation, useQuery } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: async (tokenData) => {
      useAuthStore.setState({ token: tokenData.access_token })
      const user = await authApi.getMe()
      setAuth(tokenData.access_token, user)
      toast.success('Sesion iniciada correctamente')
      navigate('/')
    },
    onError: () => {
      toast.error('Credenciales incorrectas')
    },
  })
}

export function useCurrentUser() {
  const token = useAuthStore((s) => s.token)
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: authApi.getMe,
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  })
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  return () => {
    logout()
    navigate('/login')
    toast.success('Sesion cerrada')
  }
}
