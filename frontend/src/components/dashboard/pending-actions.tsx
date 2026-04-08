import { Link } from 'react-router-dom'
import { AlertCircle, ArrowRight, CheckCircle, ShoppingCart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { canSeeFinancials } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth-store'
import { STATUS_CONFIG, PO_STATUS_CONFIG } from '@/lib/constants'
import { formatCurrency } from '@/lib/format'
import type { PendingActionItem, POPendingActionItem } from '@/api/types'

interface Props {
  items: PendingActionItem[]
  ocItems?: POPendingActionItem[]
}

export function PendingActions({ items, ocItems = [] }: Props) {
  const roleName = useAuthStore((s) => s.user?.role_name)
  const showFinancials = canSeeFinancials(roleName)
  const totalPending = items.length + ocItems.length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <CardTitle className="text-base">Acciones Pendientes</CardTitle>
          {totalPending > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {totalPending}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {totalPending === 0 ? (
          <div className="flex flex-col items-center py-6 text-muted-foreground">
            <CheckCircle className="h-10 w-10 mb-2 text-green-500 opacity-60" />
            <p className="text-sm">No hay acciones pendientes</p>
            <p className="text-xs">Todo al dia</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Request pending actions */}
            {items.slice(0, 8).map((item) => {
              const statusConfig = STATUS_CONFIG[item.status]
              return (
                <Link
                  key={item.request_id}
                  to={`/solicitudes/${item.request_id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className={statusConfig?.color || ''}>
                        {statusConfig?.label || item.status}
                      </Badge>
                      {showFinancials && (
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(item.total_amount)}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground ml-2 flex-shrink-0" />
                </Link>
              )
            })}

            {/* OC pending approvals */}
            {ocItems.length > 0 && (
              <>
                {items.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 border-t" />
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <ShoppingCart className="h-3 w-3" />
                      OC Pendientes
                    </span>
                    <div className="flex-1 border-t" />
                  </div>
                )}
                {ocItems.slice(0, 5).map((oc) => {
                  const statusConfig = PO_STATUS_CONFIG[oc.status]
                  return (
                    <Link
                      key={oc.po_id}
                      to={`/solicitudes/${oc.request_id}`}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{oc.oc_number}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className={statusConfig?.color || ''}>
                            {statusConfig?.label || oc.status}
                          </Badge>
                          {showFinancials && (
                            <span className="text-xs text-muted-foreground">
                              {new Intl.NumberFormat('es-CL', {
                                style: 'currency',
                                currency: oc.currency || 'CLP',
                              }).format(oc.total_amount)}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground ml-2 flex-shrink-0" />
                    </Link>
                  )
                })}
              </>
            )}

            {items.length > 8 && (
              <Link to="/solicitudes" className="block text-center text-sm text-primary hover:underline pt-2">
                Ver todas las solicitudes ({items.length})
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
