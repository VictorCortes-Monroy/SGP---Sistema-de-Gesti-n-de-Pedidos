import { Link } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { SmStatusBadge } from './sm-status-badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatCurrency } from '@/lib/format'
import type { MaintRequestResponse } from '@/api/types'

const MAINT_TYPE_LABELS: Record<string, string> = {
    PREVENTIVE: 'Preventiva',
    CORRECTIVE: 'Correctiva',
    PREDICTIVE: 'Predictiva',
    OVERHAUL: 'Overhaul',
}

interface SmRequestTableProps {
    requests: MaintRequestResponse[]
    isLoading: boolean
}

export function SmRequestTable({ requests, isLoading }: SmRequestTableProps) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha Planificada</TableHead>
                        <TableHead>Costo Est.</TableHead>
                        <TableHead className="text-right">Ver</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                {Array.from({ length: 6 }).map((_, j) => (
                                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : requests.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                No se encontraron solicitudes de mantención.
                            </TableCell>
                        </TableRow>
                    ) : (
                        requests.map((req) => (
                            <TableRow key={req.id}>
                                <TableCell className="font-mono text-sm font-medium">{req.code}</TableCell>
                                <TableCell className="text-sm">{MAINT_TYPE_LABELS[req.maintenance_type] ?? req.maintenance_type}</TableCell>
                                <TableCell><SmStatusBadge status={req.status} /></TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {formatDate(req.planned_date)}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {req.estimated_cost != null
                                        ? formatCurrency(req.estimated_cost, req.currency)
                                        : '—'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" asChild>
                                        <Link to={`/mantencion/solicitudes/${req.id}`}>
                                            <Eye className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
