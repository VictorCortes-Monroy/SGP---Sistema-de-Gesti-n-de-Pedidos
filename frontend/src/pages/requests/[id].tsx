import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useRequest } from '@/hooks/use-requests'
import { PageHeader } from '@/components/shared/page-header'
import { RequestStatusBadge } from '@/components/requests/request-status-badge'
import { RequestTimeline } from '@/components/requests/request-timeline'
import { RequestActions } from '@/components/requests/request-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { PageSkeleton } from '@/components/shared/loading-skeleton'
import { formatCurrency, formatDateTime } from '@/lib/format'

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: request, isLoading } = useRequest(id!)

  if (isLoading) return <PageSkeleton />

  if (!request) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Solicitud no encontrada</p>
        <Button asChild variant="link" className="mt-2">
          <Link to="/solicitudes">Volver a solicitudes</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link to="/solicitudes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{request.title}</h1>
            <RequestStatusBadge status={request.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Creada el {formatDateTime(request.created_at)}
            {request.requester_name && ` por ${request.requester_name}`}
          </p>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Info + Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {request.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Descripcion</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{request.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Info card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informacion</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Centro de Costo</dt>
                  <dd className="font-medium">{request.cost_center_name ?? '-'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Monto Total</dt>
                  <dd className="font-medium">{formatCurrency(request.total_amount)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Solicitante</dt>
                  <dd className="font-medium">{request.requester_name ?? '-'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Estado</dt>
                  <dd><RequestStatusBadge status={request.status} /></dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Items</CardTitle>
            </CardHeader>
            <CardContent>
              {request.items?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descripcion</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio Unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {request.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-muted-foreground">{item.sku ?? '-'}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.quantity * item.unit_price)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">Sin items</p>
              )}

              {request.items?.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <div className="flex justify-end">
                    <span className="text-sm font-semibold">
                      Total: {formatCurrency(request.total_amount)}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Timeline + Actions */}
        <div className="space-y-6">
          <RequestActions request={request} />
          <RequestTimeline requestId={request.id} />
        </div>
      </div>
    </div>
  )
}
