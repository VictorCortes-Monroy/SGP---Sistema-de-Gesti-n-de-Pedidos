import { Link } from 'react-router-dom'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RequestStatusBadge } from './request-status-badge'
import { formatCurrency, formatDate } from '@/lib/format'
import { canSeeFinancials } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth-store'
import { EmptyState } from '@/components/shared/empty-state'
import { TableSkeleton } from '@/components/shared/loading-skeleton'
import { FileText } from 'lucide-react'
import type { RequestResponse } from '@/api/types'

interface RequestTableProps {
  requests: RequestResponse[]
  isLoading?: boolean
}

export function RequestTable({ requests, isLoading }: RequestTableProps) {
  const roleName = useAuthStore((s) => s.user?.role_name)
  const showFinancials = canSeeFinancials(roleName)

  if (isLoading) return <TableSkeleton rows={10} />

  if (!requests.length) {
    return (
      <EmptyState
        icon={FileText}
        title="Sin resultados"
        description="No se encontraron solicitudes con los filtros aplicados"
      />
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Titulo</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Centro de Costo</TableHead>
          {showFinancials && <TableHead className="text-right">Monto Total</TableHead>}
          <TableHead>Solicitante</TableHead>
          <TableHead>Fecha</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((req) => (
          <TableRow key={req.id}>
            <TableCell>
              <Link
                to={`/solicitudes/${req.id}`}
                className="font-medium text-primary hover:underline"
              >
                {req.title}
              </Link>
            </TableCell>
            <TableCell>
              <RequestStatusBadge status={req.status} />
            </TableCell>
            <TableCell className="text-muted-foreground">
              {req.cost_center_name ?? '-'}
            </TableCell>
            {showFinancials && (
              <TableCell className="text-right font-medium">
                {formatCurrency(req.total_amount)}
              </TableCell>
            )}
            <TableCell className="text-muted-foreground">
              {req.requester_name ?? '-'}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatDate(req.created_at)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
