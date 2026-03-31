import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/format'
import { SM_STATUS_CONFIG } from './sm-status-badge'
import type { WorkflowLogResponse, MaintRequestStatus } from '@/api/types'

interface SmTimelineProps {
    logs: WorkflowLogResponse[]
    isLoading?: boolean
}

const ACTION_LABELS: Record<string, string> = {
    SUBMIT:                   'Envío a aprobación',
    APPROVE:                  'Aprobación',
    REJECT:                   'Rechazo',
    CONFIRM_PROVIDER:         'Proveedor confirmado',
    SCHEDULE_TRANSPORT:       'Transporte programado',
    LINK_PURCHASE_ORDER:      'OC vinculada',
    START_EXECUTION:          'Inicio ejecución',
    CONFIRM_WORKSHOP_ARRIVAL: 'Llegada al taller',
    COMPLETE_EXECUTION:       'Ejecución completada',
    RECEPTION_APPROVED:       'Recepción conforme',
    RECEPTION_REJECTED:       'Recepción rechazada',
    UPLOAD_CERTIFICATE:       'Certificado subido',
    CONFIRM_FIELD_RETURN:     'Retorno al campo',
    CLOSE:                    'Cierre formal',
    CREATE:                   'Creación',
}

function getStatusLabel(status: string): string {
    return SM_STATUS_CONFIG[status as MaintRequestStatus]?.label ?? status
}

export function SmTimeline({ logs, isLoading }: SmTimelineProps) {
    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        )
    }

    if (!logs || logs.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Sin actividad aún.</p>
                </CardContent>
            </Card>
        )
    }

    const sorted = [...logs].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
                <ol className="relative border-l border-border ml-2 space-y-4">
                    {sorted.map((log, i) => (
                        <li key={log.id ?? i} className="ml-4">
                            <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-background bg-primary" />
                            <div className="text-xs text-muted-foreground">
                                {formatDateTime(log.timestamp)}
                                {log.actor_name && ` · ${log.actor_name}`}
                                {log.actor_role && ` (${log.actor_role})`}
                            </div>
                            <p className="text-sm font-medium mt-0.5">
                                {ACTION_LABELS[log.action] ?? log.action}
                            </p>
                            {(log.from_status || log.to_status) && (
                                <p className="text-xs text-muted-foreground">
                                    {log.from_status && getStatusLabel(log.from_status)}
                                    {log.from_status && log.to_status && ' → '}
                                    {log.to_status && getStatusLabel(log.to_status)}
                                </p>
                            )}
                            {log.comment && (
                                <p className="text-xs italic text-muted-foreground mt-0.5">"{log.comment}"</p>
                            )}
                        </li>
                    ))}
                </ol>
            </CardContent>
        </Card>
    )
}
