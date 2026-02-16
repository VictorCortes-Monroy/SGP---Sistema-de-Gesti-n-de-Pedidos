import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RequestStatusBadge } from '@/components/requests/request-status-badge'
import { useRequests } from '@/hooks/use-requests'
import { formatCurrency, formatDate } from '@/lib/format'
import { TableSkeleton } from '@/components/shared/loading-skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { FileText } from 'lucide-react'

export function RecentRequests() {
  const { data, isLoading } = useRequests({ limit: 5 })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Solicitudes Recientes</CardTitle>
        <Link to="/solicitudes" className="text-sm text-primary hover:underline">
          Ver todas
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : !data?.items?.length ? (
          <EmptyState
            icon={FileText}
            title="Sin solicitudes"
            description="No hay solicitudes registradas aun"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titulo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>
                    <Link
                      to={`/solicitudes/${req.id}`}
                      className="font-medium hover:underline"
                    >
                      {req.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <RequestStatusBadge status={req.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(req.total_amount)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(req.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
