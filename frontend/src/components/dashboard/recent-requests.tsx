import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RequestStatusBadge } from '@/components/requests/request-status-badge'
import { formatCurrency, formatDate } from '@/lib/format'
import { canSeeFinancials } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth-store'
import { EmptyState } from '@/components/shared/empty-state'
import { FileText } from 'lucide-react'
import type { RecentRequestItem, RequestStatus } from '@/api/types'

interface Props {
  items: RecentRequestItem[]
}

export function RecentRequests({ items }: Props) {
  const roleName = useAuthStore((s) => s.user?.role_name)
  const showFinancials = canSeeFinancials(roleName)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Solicitudes Recientes</CardTitle>
        <Link to="/solicitudes" className="text-sm text-primary hover:underline">
          Ver todas
        </Link>
      </CardHeader>
      <CardContent>
        {!items.length ? (
          <EmptyState
            icon={FileText}
            title="Sin solicitudes"
            description="No hay solicitudes registradas aun"
          />
        ) : (
          <div className="space-y-2">
            {items.map((req) => (
              <Link
                key={req.id}
                to={`/solicitudes/${req.id}`}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{req.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <RequestStatusBadge status={req.status as RequestStatus} />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(req.created_at)}
                    </span>
                  </div>
                </div>
                {showFinancials && (
                  <span className="text-sm font-medium ml-2 whitespace-nowrap">
                    {formatCurrency(req.total_amount)}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
