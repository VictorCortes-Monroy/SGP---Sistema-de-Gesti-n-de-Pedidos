import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PageSkeleton } from '@/components/shared/loading-skeleton'
import { SmStatusBadge } from '@/components/maintenance/sm-status-badge'
import { GateStatusCard } from '@/components/maintenance/gate-status-card'
import { SmTimeline } from '@/components/maintenance/sm-timeline'
import { SmActions } from '@/components/maintenance/sm-actions'
import { DocumentList } from '@/components/maintenance/document-list'
import { formatDate, formatDateTime, formatCurrency } from '@/lib/format'
import {
    useMaintRequestDetail,
    useGateStatus,
    useMaintTimeline,
} from '@/hooks/use-maintenance'

const MAINT_TYPE_LABELS: Record<string, string> = {
    PREVENTIVE: 'Preventiva',
    CORRECTIVE: 'Correctiva',
    PREDICTIVE: 'Predictiva',
    OVERHAUL: 'Overhaul',
}

// Statuses that require gate control visibility
const GATE_STATUSES = ['AWAITING_PREREQUISITES', 'READY_FOR_EXECUTION']

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium mt-0.5">{value ?? '—'}</dd>
        </div>
    )
}

export default function MaintenanceRequestDetailPage() {
    const { id } = useParams<{ id: string }>()
    const { data: sm, isLoading } = useMaintRequestDetail(id!)
    const showGate = GATE_STATUSES.includes(sm?.status ?? '')
    const { data: gate, isLoading: gateLoading } = useGateStatus(id!, showGate)
    const { data: timeline, isLoading: timelineLoading } = useMaintTimeline(id!, !!id)

    if (isLoading) return <PageSkeleton />

    if (!sm) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">SM no encontrada</p>
                <Button asChild variant="link" className="mt-2">
                    <Link to="/mantencion/solicitudes">Volver a solicitudes</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-3">
                <Button asChild variant="ghost" size="icon" className="mt-0.5">
                    <Link to="/mantencion/solicitudes"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl font-bold font-mono">{sm.code}</h1>
                        <SmStatusBadge status={sm.status} />
                        <span className="text-sm text-muted-foreground">
                            {MAINT_TYPE_LABELS[sm.maintenance_type] ?? sm.maintenance_type}
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Creada el {formatDateTime(sm.created_at)}
                    </p>
                </div>
            </div>

            {/* Main content: 2/3 + 1/3 */}
            <div className="grid gap-6 lg:grid-cols-3">

                {/* ── Left column ── */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Description */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Descripción de trabajos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm whitespace-pre-wrap">{sm.description}</p>
                        </CardContent>
                    </Card>

                    {/* General info */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Información General</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="grid grid-cols-2 gap-4">
                                <InfoRow label="Tipo" value={MAINT_TYPE_LABELS[sm.maintenance_type]} />
                                <InfoRow label="Estado" value={<SmStatusBadge status={sm.status} />} />
                                <InfoRow label="Fecha Planificada" value={formatDate(sm.planned_date)} />
                                {sm.scheduled_start && (
                                    <InfoRow label="Inicio Programado" value={formatDateTime(sm.scheduled_start)} />
                                )}
                                {sm.completed_at && (
                                    <InfoRow label="Completada" value={formatDateTime(sm.completed_at)} />
                                )}
                                <InfoRow
                                    label="Costo Estimado"
                                    value={sm.estimated_cost != null ? formatCurrency(sm.estimated_cost, sm.currency) : null}
                                />
                                {sm.actual_cost != null && (
                                    <InfoRow label="Costo Real" value={formatCurrency(sm.actual_cost, sm.currency)} />
                                )}
                            </dl>
                        </CardContent>
                    </Card>

                    {/* SGP integration */}
                    {(sm.purchase_order_code || sm.sgp_request_id) && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Integración SGP</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <dl className="grid grid-cols-2 gap-4">
                                    {sm.purchase_order_code && (
                                        <InfoRow label="Orden de Compra" value={sm.purchase_order_code} />
                                    )}
                                    {sm.sgp_request_id && (
                                        <div>
                                            <dt className="text-xs text-muted-foreground">Solicitud SGP</dt>
                                            <dd className="mt-0.5">
                                                <Button asChild variant="link" className="h-auto p-0 text-sm">
                                                    <Link to={`/solicitudes/${sm.sgp_request_id}`}>
                                                        Ver Solicitud <ExternalLink className="ml-1 h-3 w-3" />
                                                    </Link>
                                                </Button>
                                            </dd>
                                        </div>
                                    )}
                                </dl>
                            </CardContent>
                        </Card>
                    )}

                    {/* Commercial flow info */}
                    {(sm.d2_quotation_amount || sm.d5_signed_at || sm.invoice_number || sm.payment_confirmed_at) && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Flujo Comercial</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <dl className="grid grid-cols-2 gap-4">
                                    {sm.d2_quotation_amount != null && (
                                        <InfoRow label="D2 — Cotización" value={formatCurrency(sm.d2_quotation_amount, sm.currency)} />
                                    )}
                                    {sm.d2_registered_at && (
                                        <InfoRow label="Fecha D2" value={formatDate(sm.d2_registered_at)} />
                                    )}
                                    {sm.d5_signed_at && (
                                        <InfoRow label="D5 Firmado" value={formatDateTime(sm.d5_signed_at)} />
                                    )}
                                    {sm.invoice_number && (
                                        <InfoRow label="N° Factura" value={sm.invoice_number} />
                                    )}
                                    {sm.invoice_amount != null && (
                                        <InfoRow label="Monto Factura" value={formatCurrency(sm.invoice_amount, sm.currency)} />
                                    )}
                                    {sm.payment_confirmed_at && (
                                        <InfoRow label="Pago Confirmado" value={formatDateTime(sm.payment_confirmed_at)} />
                                    )}
                                </dl>
                            </CardContent>
                        </Card>
                    )}

                    {/* Documents */}
                    <Card>
                        <CardContent className="pt-4">
                            <DocumentList requestId={sm.id} />
                        </CardContent>
                    </Card>

                    {/* Rejection info */}
                    {sm.rejection_reason && (
                        <Card className="border-red-200 dark:border-red-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-red-600">Motivo de Rechazo</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm">{sm.rejection_reason}</p>
                                {sm.remediation_deadline && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Plazo de subsanación: {formatDate(sm.remediation_deadline)}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Notes */}
                    {sm.notes && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Notas</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{sm.notes}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* ── Right column ── */}
                <div className="space-y-4">

                    {/* Actions */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Acciones</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <SmActions request={sm} />
                            {['COMPLETED', 'CLOSED', 'REJECTED', 'CANCELLED'].includes(sm.status) && (
                                <p className="text-xs text-muted-foreground text-center mt-2">
                                    Esta SM está cerrada.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Gate status */}
                    {showGate && gate && (
                        <GateStatusCard gate={gate} isLoading={gateLoading} />
                    )}

                    <Separator />

                    {/* Timeline */}
                    <SmTimeline logs={timeline ?? []} isLoading={timelineLoading} />
                </div>
            </div>
        </div>
    )
}
