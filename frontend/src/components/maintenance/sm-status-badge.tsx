import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { MaintRequestStatus } from '@/api/types'

export const SM_STATUS_CONFIG: Record<MaintRequestStatus, { label: string; color: string }> = {
    DRAFT:                   { label: 'Borrador',              color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
    PENDING_APPROVAL:        { label: 'Pend. Aprobación',      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
    APPROVED:                { label: 'Aprobada',              color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    QUOTED_PENDING:          { label: 'Esp. Cotización',       color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500' },
    AWAITING_PREREQUISITES:  { label: 'Espera Prerreq.',       color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
    READY_FOR_EXECUTION:     { label: 'Lista Ejecución',       color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
    IN_TRANSIT_TO_WORKSHOP:  { label: 'En Tránsito Taller',   color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400' },
    IN_MAINTENANCE:          { label: 'En Mantención',         color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' },
    PENDING_RECEPTION:       { label: 'Pend. Recepción',       color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
    PENDING_CERTIFICATE:     { label: 'Pend. Certificado',     color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
    IN_TRANSIT_TO_FIELD:     { label: 'En Tránsito Campo',     color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400' },
    COMPLETED:               { label: 'Completada',            color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    PENDING_D5:              { label: 'Pend. Firma D5',        color: 'bg-orange-200 text-orange-900 dark:bg-orange-900/40 dark:text-orange-300' },
    INVOICING_READY:         { label: 'Hab. Facturación',      color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400' },
    PENDING_PAYMENT:         { label: 'Pend. Pago',            color: 'bg-blue-200 text-blue-900 dark:bg-blue-900/40 dark:text-blue-300' },
    CLOSED:                  { label: 'Cerrada',               color: 'bg-green-200 text-green-900 dark:bg-green-900/40 dark:text-green-300' },
    REJECTED:                { label: 'Rechazada',             color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
    CANCELLED:               { label: 'Cancelada',             color: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
}

interface SmStatusBadgeProps {
    status: MaintRequestStatus
    className?: string
}

export function SmStatusBadge({ status, className }: SmStatusBadgeProps) {
    const config = SM_STATUS_CONFIG[status]
    if (!config) return <Badge variant="outline" className={className}>{status}</Badge>
    return (
        <Badge variant="secondary" className={cn(config.color, className)}>
            {config.label}
        </Badge>
    )
}
