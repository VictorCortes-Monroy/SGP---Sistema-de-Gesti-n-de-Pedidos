import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Download } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { SmRequestTable } from '@/components/maintenance/sm-request-table'
import { PaginationControls } from '@/components/shared/pagination-controls'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMaintRequests } from '@/hooks/use-maintenance'
import * as maintApi from '@/api/maintenance'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { SM_STATUS_CONFIG } from '@/components/maintenance/sm-status-badge'
import type { MaintRequestStatus } from '@/api/types'

export default function MaintenanceRequestsPage() {
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState<string>('all')
    const [skip, setSkip] = useState(0)
    const limit = 20

    const { data, isLoading } = useMaintRequests({
        search: search || undefined,
        status: status !== 'all' ? status : undefined,
        skip,
        limit,
    })

    const user = useAuthStore((s) => s.user)
    const canCreate = ['Admin', 'maintenance_planner', 'maintenance_chief'].includes(user?.role_name ?? '')

    const page = Math.floor(skip / limit) + 1

    const handleExport = async () => {
        try {
            const blob = await maintApi.exportMaintenanceRequests('excel', {
                status: status !== 'all' ? status : undefined,
                search: search || undefined,
            })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'solicitudes-mantencion.xlsx'
            a.click()
            URL.revokeObjectURL(url)
            toast.success('Exportado en Excel')
        } catch {
            toast.error('Error al exportar')
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Solicitudes de Mantención"
                description="Gestión del ciclo de vida de SMs"
            >
                <Button variant="outline" size="sm" onClick={handleExport}>
                    <Download className="mr-1 h-4 w-4" />
                    Excel
                </Button>
                {canCreate && (
                    <Button asChild>
                        <Link to="/mantencion/solicitudes/nueva">
                            <Plus className="mr-1 h-4 w-4" />
                            Nueva SM
                        </Link>
                    </Button>
                )}
            </PageHeader>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar por código o descripción..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setSkip(0) }}
                    />
                </div>
                <Select value={status} onValueChange={(v) => { setStatus(v); setSkip(0) }}>
                    <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        {(Object.entries(SM_STATUS_CONFIG) as [MaintRequestStatus, { label: string }][]).map(([key, { label }]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <SmRequestTable requests={data?.items ?? []} isLoading={isLoading} />

            {data && data.total > 0 && (
                <PaginationControls
                    page={page}
                    pageSize={limit}
                    total={data.total}
                    onPageChange={(p) => setSkip((p - 1) * limit)}
                    onPageSizeChange={() => {}}
                />
            )}
        </div>
    )
}
