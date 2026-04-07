import { Link } from 'react-router-dom'
import { Plus, Clock, CheckCircle, FileText, ShoppingCart, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RequestKanban } from './request-kanban'
import { useRequests } from '@/hooks/use-requests'
import { useAuthStore } from '@/stores/auth-store'
import { PageHeader } from '@/components/shared/page-header'

const STATUS_SUMMARY = [
  { id: 'DRAFT', label: 'Borradores', icon: FileText, color: 'text-gray-500' },
  { id: 'PENDING_TECHNICAL', label: 'Pend. Técnica', icon: Clock, color: 'text-yellow-600' },
  { id: 'PENDING_FINANCIAL', label: 'Pend. Financiero', icon: Clock, color: 'text-orange-600' },
  { id: 'APPROVED', label: 'Aprobadas', icon: CheckCircle, color: 'text-green-600' },
  { id: 'PURCHASING', label: 'En Compra', icon: ShoppingCart, color: 'text-blue-600' },
  { id: 'RECEIVED_PARTIAL', label: 'Recep. Parcial', icon: Package, color: 'text-indigo-600' },
  { id: 'RECEIVED_FULL', label: 'Recep. Total', icon: Package, color: 'text-teal-600' },
]

export function RequesterDashboard() {
  const user = useAuthStore((s) => s.user)
  const { data: requestsData, isLoading } = useRequests({ limit: 100 })
  const requests = requestsData?.items ?? []

  const firstName = user?.full_name?.split(' ')[0] ?? 'Usuario'

  const counts = STATUS_SUMMARY.map((s) => ({
    ...s,
    count: requests.filter((r) => r.status === s.id).length,
  })).filter((s) => s.count > 0 || ['DRAFT', 'PENDING_TECHNICAL', 'APPROVED'].includes(s.id))

  return (
    <div className="space-y-6">
      {/* Header + CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title={`Hola, ${firstName}`}
          description="Aquí están tus solicitudes de pedido"
        />
        <Button asChild size="default">
          <Link to="/solicitudes/nueva">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Solicitud
          </Link>
        </Button>
      </div>

      {/* Status counters — no amounts, only quantities */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {counts.map((s) => (
          <Link key={s.id} to={`/solicitudes?status=${s.id}`}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {s.label}
                </CardTitle>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </CardHeader>
              <CardContent className="pb-4 px-4">
                <div className="text-2xl font-bold">
                  {isLoading ? '—' : s.count}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Kanban — no financial info */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Mis Solicitudes por Estado</CardTitle>
          <Link to="/solicitudes" className="text-sm text-primary hover:underline">
            Ver todas
          </Link>
        </CardHeader>
        <CardContent>
          <RequestKanban showFinancials={false} />
        </CardContent>
      </Card>
    </div>
  )
}
