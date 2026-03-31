import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { EquipmentTable } from '@/components/maintenance/equipment-table'
import { useAuthStore } from '@/stores/auth-store'

export function EquipmentPage() {
    const user = useAuthStore((state) => state.user)
    // Only Planner/Chief/Admin should manage equipment
    const canManageEquipment = ['Admin', 'Maintenance Planner', 'Maintenance Chief'].includes(
        user?.role_name || ''
    )

    return (
        <div className="space-y-6">
            <PageHeader
                title="Equipos"
                description="Gestión y monitoreo del estado de los equipos."
            >
                {canManageEquipment && (
                    <Button asChild>
                        <Link to="/equipos/nuevo">
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Equipo
                        </Link>
                    </Button>
                )}
            </PageHeader>

            <EquipmentTable />
        </div>
    )
}
