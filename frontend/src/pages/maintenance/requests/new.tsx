import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useEquipmentList, useProviderList, useCreateMaintRequest } from '@/hooks/use-maintenance'
import type { MaintRequestCreate, MaintenanceType } from '@/api/types'

const MAINT_TYPES: { value: MaintenanceType; label: string }[] = [
    { value: 'PREVENTIVE', label: 'Preventiva' },
    { value: 'CORRECTIVE', label: 'Correctiva' },
    { value: 'PREDICTIVE', label: 'Predictiva' },
    { value: 'OVERHAUL', label: 'Overhaul' },
]

export default function NewMaintenanceRequestPage() {
    const navigate = useNavigate()
    const { data: equipmentData } = useEquipmentList({ is_active: true, limit: 100 })
    const { data: providerData } = useProviderList({ is_active: true, limit: 100 })
    const { mutate: createSM, isPending } = useCreateMaintRequest()

    const [form, setForm] = useState<Partial<MaintRequestCreate>>({
        currency: 'CLP',
    })

    const set = (field: keyof MaintRequestCreate, value: string | number) =>
        setForm((f) => ({ ...f, [field]: value }))

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.equipment_id || !form.maintenance_type || !form.description || !form.planned_date) {
            toast.error('Completa los campos obligatorios')
            return
        }
        createSM(form as MaintRequestCreate, {
            onSuccess: (sm) => {
                toast.success(`SM ${sm.code} creada como borrador`)
                navigate(`/mantencion/solicitudes/${sm.id}`)
            },
            onError: () => toast.error('Error al crear la SM'),
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Button asChild variant="ghost" size="icon">
                    <Link to="/mantencion/solicitudes"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <PageHeader title="Nueva Solicitud de Mantención" description="Crea un borrador de SM" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
                <Card>
                    <CardHeader><CardTitle className="text-base">Datos Principales</CardTitle></CardHeader>
                    <CardContent className="space-y-4">

                        {/* Equipment */}
                        <div>
                            <Label>Equipo *</Label>
                            <Select onValueChange={(v) => set('equipment_id', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar equipo..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {equipmentData?.items.map((eq) => (
                                        <SelectItem key={eq.id} value={eq.id}>
                                            {eq.code} — {eq.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Maintenance type */}
                        <div>
                            <Label>Tipo de Mantención *</Label>
                            <Select onValueChange={(v) => set('maintenance_type', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar tipo..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {MAINT_TYPES.map((t) => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Description */}
                        <div>
                            <Label>Descripción de trabajos *</Label>
                            <Textarea
                                placeholder="Detalla los trabajos a realizar..."
                                rows={4}
                                value={form.description ?? ''}
                                onChange={(e) => set('description', e.target.value)}
                                required
                            />
                        </div>

                        {/* Planned date */}
                        <div>
                            <Label>Fecha planificada *</Label>
                            <Input
                                type="date"
                                value={form.planned_date ?? ''}
                                onChange={(e) => set('planned_date', e.target.value)}
                                required
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="text-base">Información Adicional (Opcional)</CardTitle></CardHeader>
                    <CardContent className="space-y-4">

                        {/* Provider */}
                        <div>
                            <Label>Proveedor</Label>
                            <Select onValueChange={(v) => set('provider_id', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sin proveedor asignado aún..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {providerData?.items.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name} ({p.rut})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Estimated cost */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Costo Estimado</Label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={form.estimated_cost ?? ''}
                                    onChange={(e) => set('estimated_cost', Number(e.target.value))}
                                />
                            </div>
                            <div>
                                <Label>Moneda</Label>
                                <Select defaultValue="CLP" onValueChange={(v) => set('currency', v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CLP">CLP</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" asChild>
                        <Link to="/mantencion/solicitudes">Cancelar</Link>
                    </Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Crear Borrador
                    </Button>
                </div>
            </form>
        </div>
    )
}
