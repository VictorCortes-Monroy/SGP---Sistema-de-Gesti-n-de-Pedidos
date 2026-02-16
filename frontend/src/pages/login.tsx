import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useLogin } from '@/hooks/use-auth'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const loginSchema = z.object({
  email: z.string().email('Correo electronico invalido'),
  password: z.string().min(1, 'La contrasena es requerida'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const login = useLogin()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const onSubmit = (data: LoginForm) => {
    login.mutate(data)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
            SP
          </div>
          <CardTitle className="text-2xl">SGP</CardTitle>
          <CardDescription>
            Sistema de Gestion de Solicitudes de Pedido
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electronico</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@ejemplo.com"
                autoComplete="email"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contrasena</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={login.isPending}
            >
              {login.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Iniciar Sesion
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
