import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useCreateEquipment } from '@/hooks/use-maintenance'
import { useCompanies, useCostCenters } from '@/hooks/use-organizations'

const EQUIPMENT_TYPES = [
    { value: 'EXCAVATOR',  label: 'Excavadora' },
    { value: 'CRANE',      label: 'Grúa' },
    { value: 'TRUCK',      label: 'Camión' },
    { value: 'GENERATOR',  label: 'Generador' },
    { value: 'COMPRESSOR', label: 'Compresora' },
    { value: 'PUMP',       label: 'Bomba' },
    { value: 'FORKLIFT',   label: 'Cargador / Horquilla' },
    { value: 'OTHER',      label: 'Otro' },
]

export default function NewEquipmentPage() {
    const navigate = useNavigate()
    const { mutate: createEquipment, isPending } = useCreateEquipment()
    const { data: companiesData } = useCompanies()
    const companies = companiesData?.items ?? []

    const [form, setForm] = useState({
        name: '',
        equipment_type: '',
        brand: '',
        model: '',
        model_year: '',
        serial_number: '',
        company_id: '',
        cost_center_id: '',
        current_horometer: '0',
        maintenance_interval_hours: '500',
        notes: '',
    })

    const { data: costCentersData } = useCostCenters(form.company_id || undefined)
    const costCenters = costCentersData?.items ?? []

    const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value }))

    const setSelect = (field: string) => (value: string) =>
        setForm((prev) => ({ ...prev, [field]: value }))

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.name || !form.equipment_type || !form.company_id) {
            toast.error('Nombre, tipo y empresa son obligatorios')
            return
        }
        const payload: Record<string, unknown> = {
            name: form.name.trim(),
            equipment_type: form.equipment_type,
            company_id: form.company_id,
            current_horometer: Number(form.current_horometer) || 0,
            maintenance_interval_hours: Number(form.maintenance_interval_hours) || 500,
        }
        if (form.brand)          payload.brand          = form.brand.trim()
        if (form.model)          payload.model          = form.model.trim()
        if (form.model_year)     payload.model_year     = Number(form.model_year)
        if (form.serial_number)  payload.serial_number  = form.serial_number.trim()
        if (form.cost_center_id) payload.cost_center_id = form.cost_center_id
        if (form.notes)          payload.notes          = form.notes.trim()

        createEquipment(payload as any, {
            onSuccess: (created) => {
                toast.success(`Equipo ${created.code} registrado`)
                navigate(`/equipos/${created.id}`)
            },
            onError: (err: any) => {
                const detail = err?.response?.data?.detail
                toast.error(typeof detail === 'string' ? detail : 'Error al registrar equipo')
            },
        })
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button asChild variant="ghost" size="icon">
                    <Link to="/equipos"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Registrar Equipo</h1>
                    <p className="text-sm text-muted-foreground">Ingresa los datos del equipo o vehículo</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Identificación */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Identificación</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                            El código del equipo se genera automáticamente en formato <strong>MARCA-MODELO-AÑO-VIN</strong> (ej: <strong>CAT-336D-20-4X2A</strong>) a partir de los datos de la ficha técnica.
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="equipment_type">Tipo *</Label>
                            <Select value={form.equipment_type} onValueChange={setSelect('equipment_type')} required>
                                <SelectTrigger id="equipment_type">
                                    <SelectValue placeholder="Seleccionar tipo..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {EQUIPMENT_TYPES.map((t) => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="name">Nombre / Descripción *</Label>
                            <Input id="name" placeholder="Excavadora Caterpillar 336" value={form.name} onChange={set('name')} required />
                        </div>
                    </CardContent>
                </Card>

                {/* Ficha Técnica */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Ficha Técnica</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="brand">Marca</Label>
                            <Input id="brand" placeholder="Caterpillar" value={form.brand} onChange={set('brand')} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="model">Modelo</Label>
                            <Input id="model" placeholder="336" value={form.model} onChange={set('model')} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="model_year">Año</Label>
                            <Input id="model_year" type="number" placeholder="2022" min={1980} max={2099} value={form.model_year} onChange={set('model_year')} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="serial_number">N° Serie / VIN</Label>
                            <Input id="serial_number" placeholder="CAT336-XXXXX" value={form.serial_number} onChange={set('serial_number')} />
                        </div>
                    </CardContent>
                </Card>

                {/* Organización */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Asignación</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Empresa *</Label>
                            <Select value={form.company_id} onValueChange={(v) => { setSelect('company_id')(v); setForm((p) => ({ ...p, cost_center_id: '' })) }} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar empresa..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {companies.map((c: any) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Centro de Costo</Label>
                            <Select value={form.cost_center_id} onValueChange={setSelect('cost_center_id')} disabled={!form.company_id}>
                                <SelectTrigger>
                                    <SelectValue placeholder={form.company_id ? 'Seleccionar CC...' : 'Seleccione empresa primero'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {costCenters.map((cc: any) => (
                                        <SelectItem key={cc.id} value={cc.id}>{cc.name} ({cc.code})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Horómetro y mantenimiento */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Horómetro y Mantenimiento Preventivo</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="current_horometer">Horómetro Actual (hr)</Label>
                            <Input id="current_horometer" type="number" min={0} step={0.1} value={form.current_horometer} onChange={set('current_horometer')} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="maintenance_interval_hours">Intervalo PM (hr)</Label>
                            <Input id="maintenance_interval_hours" type="number" min={50} step={50} value={form.maintenance_interval_hours} onChange={set('maintenance_interval_hours')} />
                            <p className="text-xs text-muted-foreground">Frecuencia de mantención preventiva</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Notas */}
                <Card>
                    <CardContent className="pt-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="notes">Notas</Label>
                            <Textarea id="notes" placeholder="Observaciones adicionales..." rows={3} value={form.notes} onChange={set('notes')} />
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" asChild>
                        <Link to="/equipos">Cancelar</Link>
                    </Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Registrar Equipo
                    </Button>
                </div>
            </form>
        </div>
    )
}
