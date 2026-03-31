import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, Search, Activity, History } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useEquipmentList, useUpdateHorometer } from '@/hooks/use-maintenance'
import { MaintEquipment } from '@/api/types'
import { useAuthStore } from '@/stores/auth-store'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

const statusMap: Record<string, { label: string; color: string }> = {
    OPERATIVE: { label: 'Operativo', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    IN_TRANSIT: { label: 'En Tránsito', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    IN_MAINTENANCE: { label: 'En Mantención', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
    OUT_OF_SERVICE: { label: 'Fuera de Servicio', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
    SCRAPPED: { label: 'De Baja', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400' },
}

export function EquipmentTable() {
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState<string>('all')
    const [horometerModalOpen, setHorometerModalOpen] = useState(false)
    const [selectedEquipment, setSelectedEquipment] = useState<MaintEquipment | null>(null)

    const [reading, setReading] = useState<number | ''>('')
    const [notes, setNotes] = useState('')

    const { data, isLoading } = useEquipmentList({
        search: search || undefined,
        status: status !== 'all' ? status : undefined,
    })

    const { mutate: updateHorometer, isPending } = useUpdateHorometer()
    const user = useAuthStore((state) => state.user)
    const canManage = ['Admin', 'Maintenance Planner', 'Maintenance Chief'].includes(user?.role_name || '')

    const handleOpenModal = (equipment: MaintEquipment) => {
        setSelectedEquipment(equipment)
        setReading(equipment.current_horometer)
        setNotes('')
        setHorometerModalOpen(true)
    }

    const handleUpdateHorometer = (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedEquipment || reading === '') return

        updateHorometer(
            { id: selectedEquipment.id, payload: { reading: Number(reading), notes } },
            {
                onSuccess: () => {
                    setHorometerModalOpen(false)
                },
            }
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 items-center gap-2">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar por código o nombre..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            <SelectItem value="OPERATIVE">Operativo</SelectItem>
                            <SelectItem value="IN_TRANSIT">En Tránsito</SelectItem>
                            <SelectItem value="IN_MAINTENANCE">En Mantención</SelectItem>
                            <SelectItem value="OUT_OF_SERVICE">Fuera de Servicio</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Equipo</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Horómetro</TableHead>
                            <TableHead>Próx. Mantención</TableHead>
                            {canManage && <TableHead className="text-right">Acciones</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-[100px] rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                                    {canManage && <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>}
                                </TableRow>
                            ))
                        ) : data?.items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={canManage ? 6 : 5} className="h-24 text-center">
                                    No se encontraron equipos.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data?.items.map((item) => {
                                const isDue = item.next_maintenance_due != null && item.current_horometer >= item.next_maintenance_due
                                const isClose = item.next_maintenance_due != null && item.current_horometer >= item.next_maintenance_due * 0.9 && !isDue

                                return (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.code}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-foreground">{item.name}</span>
                                                <span className="text-xs text-muted-foreground">{item.brand} {item.model}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className={statusMap[item.status]?.color || ''}>
                                                {statusMap[item.status]?.label || item.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Activity className="h-4 w-4 text-muted-foreground" />
                                                <span>{item.current_horometer.toLocaleString()} hr</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-sm">
                                                    {item.next_maintenance_due ? `${item.next_maintenance_due.toLocaleString()} hr` : 'N/A'}
                                                </span>
                                                {isDue ? (
                                                    <span className="text-xs text-red-600 font-medium">Vencido</span>
                                                ) : isClose ? (
                                                    <span className="text-xs text-amber-600 font-medium">Próximo</span>
                                                ) : null}
                                            </div>
                                        </TableCell>
                                        {canManage && (
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="outline" size="sm" onClick={() => handleOpenModal(item)}>
                                                    <Activity className="h-4 w-4 mr-1" />
                                                    Actualizar
                                                </Button>
                                                <Button variant="ghost" size="icon" asChild>
                                                    <Link to={`/equipos/${item.id}`}>
                                                        <History className="h-4 w-4 text-muted-foreground" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Horometer Modal */}
            <Dialog open={horometerModalOpen} onOpenChange={setHorometerModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleUpdateHorometer}>
                        <DialogHeader>
                            <DialogTitle>Actualizar Horómetro</DialogTitle>
                            <DialogDescription>
                                Ingresa la lectura actual del horómetro para el equipo {selectedEquipment?.code}.
                                La lectura actual es {selectedEquipment?.current_horometer.toLocaleString()} hr.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="reading" className="text-right">
                                    Lectura (hr)
                                </Label>
                                <Input
                                    id="reading"
                                    type="number"
                                    className="col-span-3"
                                    value={reading}
                                    onChange={(e) => setReading(isNaN(e.target.valueAsNumber) ? '' : e.target.valueAsNumber)}
                                    min={selectedEquipment?.current_horometer} // Can't go backwards
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="notes" className="text-right">
                                    Notas
                                </Label>
                                <Input
                                    id="notes"
                                    className="col-span-3"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Opcional..."
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setHorometerModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isPending || reading === '' || !!(selectedEquipment && Number(reading) < selectedEquipment.current_horometer)}>
                                {isPending ? 'Guardando...' : 'Guardar Lectura'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
