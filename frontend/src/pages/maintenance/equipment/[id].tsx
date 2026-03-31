import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
    ArrowLeft, Activity, Wrench, Clock, AlertTriangle, CheckCircle,
    Edit2, Save, X, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
    useEquipmentDetail,
    useUpdateEquipment,
    useUpdateHorometer,
    useHorometerHistory,
    useMaintRequests,
} from '@/hooks/use-maintenance'
import { SmStatusBadge } from '@/components/maintenance/sm-status-badge'
import { formatDate, formatDateTime } from '@/lib/format'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    OPERATIVE:      { label: 'Operativo',         color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',   icon: CheckCircle },
    IN_TRANSIT:     { label: 'En Tránsito',       color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',       icon: Activity },
    IN_MAINTENANCE: { label: 'En Mantención',     color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Wrench },
    OUT_OF_SERVICE: { label: 'Fuera de Servicio', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',           icon: AlertTriangle },
    SCRAPPED:       { label: 'De Baja',           color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',          icon: X },
}

const TYPE_LABELS: Record<string, string> = {
    EXCAVATOR: 'Excavadora', CRANE: 'Grúa', TRUCK: 'Camión',
    GENERATOR: 'Generador',  COMPRESSOR: 'Compresora', PUMP: 'Bomba',
    FORKLIFT: 'Cargador / Horquilla', OTHER: 'Otro',
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium mt-0.5">{value ?? '—'}</dd>
        </div>
    )
}

export default function EquipmentDetailPage() {
    const { id } = useParams<{ id: string }>()
    const { data: eq, isLoading } = useEquipmentDetail(id!)
    const { data: hHistory = [], isLoading: historyLoading } = useHorometerHistory(id!)
    const { data: smList } = useMaintRequests({ equipment_id: id, limit: 5 })

    const { mutate: updateEquipment, isPending: saving } = useUpdateEquipment()
    const { mutate: updateHorometer, isPending: horometerPending } = useUpdateHorometer()

    const [editing, setEditing] = useState(false)
    const [editForm, setEditForm] = useState<Record<string, string>>({})
    const [horometerOpen, setHorometerOpen] = useState(false)
    const [newReading, setNewReading] = useState<number | ''>('')
    const [horometerNotes, setHorometerNotes] = useState('')

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-4">
                        <Skeleton className="h-48" />
                        <Skeleton className="h-64" />
                    </div>
                    <Skeleton className="h-64" />
                </div>
            </div>
        )
    }

    if (!eq) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Equipo no encontrado</p>
                <Button asChild variant="link" className="mt-2">
                    <Link to="/equipos">Volver a equipos</Link>
                </Button>
            </div>
        )
    }

    const statusCfg = STATUS_CONFIG[eq.status] ?? STATUS_CONFIG.OUT_OF_SERVICE
    const StatusIcon = statusCfg.icon
    const maintenancePct = eq.next_maintenance_due && eq.current_horometer
        ? Math.min(100, (eq.current_horometer / eq.next_maintenance_due) * 100)
        : 0
    const isDue  = eq.next_maintenance_due != null && eq.current_horometer >= eq.next_maintenance_due
    const isClose = eq.next_maintenance_due != null && !isDue &&
        eq.current_horometer >= eq.next_maintenance_due * 0.9

    const startEdit = () => {
        setEditForm({
            name: eq.name,
            brand: eq.brand ?? '',
            model: eq.model ?? '',
            model_year: eq.model_year?.toString() ?? '',
            serial_number: eq.serial_number ?? '',
            maintenance_interval_hours: eq.maintenance_interval_hours.toString(),
            notes: eq.notes ?? '',
        })
        setEditing(true)
    }

    const handleSave = () => {
        const payload: Record<string, unknown> = {
            name: editForm.name,
            brand: editForm.brand || null,
            model: editForm.model || null,
            model_year: editForm.model_year ? Number(editForm.model_year) : null,
            serial_number: editForm.serial_number || null,
            maintenance_interval_hours: Number(editForm.maintenance_interval_hours) || 500,
            notes: editForm.notes || null,
        }
        updateEquipment({ id: id!, payload: payload as any }, {
            onSuccess: () => { toast.success('Equipo actualizado'); setEditing(false) },
            onError: () => toast.error('Error al guardar'),
        })
    }

    const handleHorometer = (e: React.FormEvent) => {
        e.preventDefault()
        if (newReading === '') return
        updateHorometer(
            { id: id!, payload: { reading: Number(newReading), notes: horometerNotes || undefined } },
            {
                onSuccess: () => {
                    toast.success('Horómetro actualizado')
                    setHorometerOpen(false)
                    setNewReading('')
                    setHorometerNotes('')
                },
                onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Error al actualizar'),
            }
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-3">
                <Button asChild variant="ghost" size="icon" className="mt-0.5">
                    <Link to="/equipos"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl font-bold font-mono">{eq.code}</h1>
                        <Badge variant="secondary" className={statusCfg.color}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {statusCfg.label}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{TYPE_LABELS[eq.equipment_type] ?? eq.equipment_type}</span>
                    </div>
                    <p className="text-sm font-medium mt-0.5">{eq.name}</p>
                </div>
                {!editing && (
                    <Button variant="outline" size="sm" onClick={startEdit}>
                        <Edit2 className="mr-2 h-4 w-4" /> Editar
                    </Button>
                )}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* ── Left column ── */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Ficha técnica / editable */}
                    <Card>
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm">Información General</CardTitle>
                            {editing && (
                                <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" onClick={handleSave} disabled={saving}>
                                        {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                                        Guardar
                                    </Button>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent>
                            {editing ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 space-y-1.5">
                                        <Label>Nombre</Label>
                                        <Input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Marca</Label>
                                        <Input value={editForm.brand} onChange={(e) => setEditForm((p) => ({ ...p, brand: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Modelo</Label>
                                        <Input value={editForm.model} onChange={(e) => setEditForm((p) => ({ ...p, model: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Año</Label>
                                        <Input type="number" min={1980} max={2099} value={editForm.model_year} onChange={(e) => setEditForm((p) => ({ ...p, model_year: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>N° Serie / VIN</Label>
                                        <Input value={editForm.serial_number} onChange={(e) => setEditForm((p) => ({ ...p, serial_number: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Intervalo PM (hr)</Label>
                                        <Input type="number" min={50} step={50} value={editForm.maintenance_interval_hours} onChange={(e) => setEditForm((p) => ({ ...p, maintenance_interval_hours: e.target.value }))} />
                                    </div>
                                    <div className="col-span-2 space-y-1.5">
                                        <Label>Notas</Label>
                                        <Textarea rows={3} value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} />
                                    </div>
                                </div>
                            ) : (
                                <dl className="grid grid-cols-2 gap-4">
                                    <InfoRow label="Marca"        value={eq.brand} />
                                    <InfoRow label="Modelo"       value={eq.model} />
                                    <InfoRow label="Año"          value={eq.model_year} />
                                    <InfoRow label="N° Serie"     value={eq.serial_number} />
                                    <InfoRow label="Intervalo PM" value={eq.maintenance_interval_hours ? `${eq.maintenance_interval_hours} hr` : null} />
                                    <InfoRow label="Últ. Mantención" value={eq.last_maintenance_date ? formatDate(eq.last_maintenance_date) : null} />
                                    {eq.notes && <div className="col-span-2"><InfoRow label="Notas" value={eq.notes} /></div>}
                                </dl>
                            )}
                        </CardContent>
                    </Card>

                    {/* Historial horómetro */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Historial Horómetro</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {historyLoading ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
                                </div>
                            ) : hHistory.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">Sin registros de horómetro.</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Lectura</TableHead>
                                            <TableHead>Delta</TableHead>
                                            <TableHead>Registrado por</TableHead>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Notas</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {hHistory.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="font-mono font-medium">{log.reading.toLocaleString()} hr</TableCell>
                                                <TableCell className="text-muted-foreground text-xs">
                                                    {log.hours_delta != null ? `+${log.hours_delta.toLocaleString()} hr` : '—'}
                                                </TableCell>
                                                <TableCell>{log.recorded_by_name ?? '—'}</TableCell>
                                                <TableCell className="text-xs">{log.recorded_at ? formatDateTime(log.recorded_at) : '—'}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{log.notes ?? '—'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Solicitudes recientes */}
                    <Card>
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm">Solicitudes de Mantención Recientes</CardTitle>
                            <Button asChild variant="link" size="sm" className="text-xs">
                                <Link to={`/mantencion/solicitudes?equipment_id=${id}`}>Ver todas</Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {!smList?.items?.length ? (
                                <p className="text-sm text-muted-foreground text-center py-4">Sin solicitudes registradas.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {smList.items.map((sm) => (
                                        <li key={sm.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
                                            <Wrench className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-mono font-medium">{sm.code}</span>
                                                    <SmStatusBadge status={sm.status} />
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate">{sm.description}</p>
                                            </div>
                                            <Button asChild variant="ghost" size="sm">
                                                <Link to={`/mantencion/solicitudes/${sm.id}`}>Ver</Link>
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ── Right column ── */}
                <div className="space-y-4">

                    {/* Horómetro stats */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Estado Horómetro</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-baseline justify-between">
                                <span className="text-xs text-muted-foreground">Actual</span>
                                <span className="text-2xl font-bold font-mono">
                                    {eq.current_horometer.toLocaleString()}
                                    <span className="text-sm font-normal text-muted-foreground ml-1">hr</span>
                                </span>
                            </div>
                            {eq.next_maintenance_due && (
                                <>
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-xs text-muted-foreground">Próx. PM</span>
                                        <span className={`text-sm font-medium ${isDue ? 'text-red-600' : isClose ? 'text-amber-600' : ''}`}>
                                            {eq.next_maintenance_due.toLocaleString()} hr
                                            {isDue  && <span className="ml-1 text-xs">(VENCIDO)</span>}
                                            {isClose && <span className="ml-1 text-xs">(Próximo)</span>}
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="w-full bg-muted rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full transition-all ${isDue ? 'bg-red-500' : isClose ? 'bg-amber-500' : 'bg-green-500'}`}
                                                style={{ width: `${maintenancePct}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground text-right">{maintenancePct.toFixed(0)}% del intervalo</p>
                                    </div>
                                </>
                            )}
                            <Button className="w-full" variant="outline" size="sm" onClick={() => { setNewReading(eq.current_horometer); setHorometerOpen(true) }}>
                                <Activity className="mr-2 h-4 w-4" />
                                Actualizar Lectura
                            </Button>
                        </CardContent>
                    </Card>

                    <Separator />

                    {/* Acciones */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Acciones</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button asChild className="w-full" variant="default">
                                <Link to={`/mantencion/solicitudes/nueva?equipment_id=${id}`}>
                                    <Wrench className="mr-2 h-4 w-4" />
                                    Nueva Solicitud de Mantención
                                </Link>
                            </Button>
                            <Button asChild className="w-full" variant="outline">
                                <Link to={`/mantencion/solicitudes?equipment_id=${id}`}>
                                    <Clock className="mr-2 h-4 w-4" />
                                    Ver Historial Completo
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Horometer update dialog */}
            <Dialog open={horometerOpen} onOpenChange={setHorometerOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Actualizar Horómetro — {eq.code}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleHorometer} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label>Nueva lectura (hr)</Label>
                            <Input
                                type="number"
                                min={eq.current_horometer}
                                step={0.1}
                                value={newReading}
                                onChange={(e) => setNewReading(isNaN(e.target.valueAsNumber) ? '' : e.target.valueAsNumber)}
                                required
                            />
                            <p className="text-xs text-muted-foreground">Lectura actual: {eq.current_horometer.toLocaleString()} hr</p>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Notas (opcional)</Label>
                            <Input value={horometerNotes} onChange={(e) => setHorometerNotes(e.target.value)} placeholder="Ej: Lectura en faena norte" />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setHorometerOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={horometerPending || newReading === '' || Number(newReading) < eq.current_horometer}>
                                {horometerPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Guardar
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
