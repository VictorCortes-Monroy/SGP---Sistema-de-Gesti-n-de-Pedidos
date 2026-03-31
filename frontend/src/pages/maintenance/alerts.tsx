import { Link } from 'react-router-dom'
import { Bell, CheckCheck, RefreshCw, ArrowLeft, Clock, Wrench, Truck, HardHat } from 'lucide-react'
import { useMaintAlerts, useMarkAlertRead, useRunSlaChecks } from '@/hooks/use-maintenance'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatDateTime } from '@/lib/format'
import type { MaintAlert, AlertType } from '@/api/types'

const ALERT_LABELS: Record<AlertType, string> = {
  SLA_PENDING_APPROVAL: 'Aprobación pendiente',
  SLA_PROVIDER_CONFIRM: 'Confirmación proveedor',
  SLA_RECEPTION: 'Recepción pendiente',
  SLA_EQUIPMENT_DUE: 'PM próximo',
}

const ALERT_COLORS: Record<AlertType, string> = {
  SLA_PENDING_APPROVAL: 'bg-red-100 text-red-800 border-red-200',
  SLA_PROVIDER_CONFIRM: 'bg-orange-100 text-orange-800 border-orange-200',
  SLA_RECEPTION: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  SLA_EQUIPMENT_DUE: 'bg-blue-100 text-blue-800 border-blue-200',
}

function AlertIcon({ type }: { type: AlertType }) {
  if (type === 'SLA_EQUIPMENT_DUE') return <Wrench className="h-4 w-4 shrink-0" />
  if (type === 'SLA_PENDING_APPROVAL') return <CheckCheck className="h-4 w-4 shrink-0" />
  if (type === 'SLA_PROVIDER_CONFIRM') return <Truck className="h-4 w-4 shrink-0" />
  return <Clock className="h-4 w-4 shrink-0" />
}

export default function MaintenanceAlertsPage() {
  const { data: alerts = [], isLoading, refetch } = useMaintAlerts(false)
  const markRead = useMarkAlertRead()
  const runChecks = useRunSlaChecks()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role_name === 'Admin'

  const unread = alerts.filter((a) => !a.is_read)
  const read = alerts.filter((a) => a.is_read)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link to="/mantencion"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Alertas SLA
          </h1>
          <p className="text-sm text-muted-foreground">
            Violaciones de tiempo en solicitudes de mantención y equipos
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              disabled={runChecks.isPending}
              onClick={() => runChecks.mutate()}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${runChecks.isPending ? 'animate-spin' : ''}`} />
              Verificar ahora
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Cargando alertas...</p>
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No hay alertas activas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {unread.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  Sin leer
                  <Badge variant="destructive">{unread.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {unread.map((alert) => (
                  <AlertRow key={alert.id} alert={alert} onRead={() => markRead.mutate(alert.id)} />
                ))}
              </CardContent>
            </Card>
          )}

          {read.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-muted-foreground">Resueltas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {read.map((alert) => (
                  <AlertRow key={alert.id} alert={alert} resolved />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function AlertRow({
  alert,
  onRead,
  resolved = false,
}: {
  alert: MaintAlert
  onRead?: () => void
  resolved?: boolean
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-md border px-3 py-3 text-sm ${
        resolved ? 'opacity-50' : ''
      }`}
    >
      <div className={`mt-0.5 rounded px-2 py-1 flex items-center gap-1 text-xs font-medium border ${ALERT_COLORS[alert.alert_type]}`}>
        <AlertIcon type={alert.alert_type} />
        <span>{ALERT_LABELS[alert.alert_type]}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="leading-snug">{alert.message}</p>
        <p className="text-xs text-muted-foreground mt-1">{formatDateTime(alert.created_at)}</p>
      </div>
      {!resolved && onRead && (
        <Button variant="ghost" size="sm" onClick={onRead} className="shrink-0">
          <CheckCheck className="h-4 w-4 mr-1" />
          Resolver
        </Button>
      )}
    </div>
  )
}
