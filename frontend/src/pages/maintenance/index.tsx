import { Link } from 'react-router-dom'
import { Plus, Wrench, Clock, ClipboardCheck, AlertTriangle, Activity } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useMaintAnalytics } from '@/hooks/use-maintenance'
import { useAuthStore } from '@/stores/auth-store'

function KpiCard({ title, value, icon: Icon, color }: { title: string; value: number | string; icon: React.ElementType; color: string }) {
    return (
        <Card>
            <CardContent className="flex items-center gap-4 p-6">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${color}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">{title}</p>
                    <p className="text-2xl font-bold">{value}</p>
                </div>
            </CardContent>
        </Card>
    )
}

export default function MaintenanceDashboard() {
    const { data, isLoading } = useMaintAnalytics()
    const user = useAuthStore((s) => s.user)
    const canCreate = ['Admin', 'maintenance_planner', 'maintenance_chief'].includes(user?.role_name ?? '')

    return (
        <div className="space-y-6">
            <PageHeader title="Módulo de Mantención" description="Dashboard de equipos y solicitudes de mantención">
                {canCreate && (
                    <Button asChild>
                        <Link to="/mantencion/solicitudes/nueva">
                            <Plus className="mr-1 h-4 w-4" />
                            Nueva SM
                        </Link>
                    </Button>
                )}
            </PageHeader>

            {/* KPI Cards */}
            {isLoading ? (
                <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
                    ))}
                </div>
            ) : (
                <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                    <KpiCard
                        title="Preventivas"
                        value={data?.total_preventive ?? 0}
                        icon={Wrench}
                        color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    />
                    <KpiCard
                        title="Correctivas"
                        value={data?.total_corrective ?? 0}
                        icon={AlertTriangle}
                        color="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                    />
                    <KpiCard
                        title="En Ejecución"
                        value={data?.in_execution ?? 0}
                        icon={Activity}
                        color="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                    />
                    <KpiCard
                        title="Pend. Recepción"
                        value={data?.pending_reception ?? 0}
                        icon={ClipboardCheck}
                        color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    />
                </div>
            )}

            {/* Second row */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Average cycle */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Tiempo Promedio de Ciclo
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-24" />
                        ) : (
                            <p className="text-3xl font-bold">
                                {data?.average_cycle_time_days?.toFixed(1) ?? '—'}
                                <span className="text-base font-normal text-muted-foreground ml-1">días</span>
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Pending certificate count */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Pend. Certificado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            <p className="text-3xl font-bold">{data?.pending_certificate ?? 0}</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Equipment alerts */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Equipos Próximos a Mantenimiento
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                        </div>
                    ) : !data?.upcoming_maintenance?.length ? (
                        <p className="text-sm text-muted-foreground">No hay equipos cercanos al umbral de mantenimiento.</p>
                    ) : (
                        <div className="space-y-2">
                            {data.upcoming_maintenance.map((alert) => (
                                <div key={alert.equipment_id} className="flex items-center justify-between rounded-md border p-3">
                                    <div>
                                        <span className="font-medium text-sm">{alert.code}</span>
                                        <span className="ml-2 text-sm text-muted-foreground">{alert.equipment_name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-muted-foreground">
                                            {alert.current_horometer.toLocaleString()} / {alert.next_maintenance_due.toLocaleString()} hr
                                        </span>
                                        <Badge
                                            variant="secondary"
                                            className={
                                                alert.hours_remaining <= 0
                                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                            }
                                        >
                                            {alert.hours_remaining <= 0
                                                ? 'Vencido'
                                                : `${alert.hours_remaining.toLocaleString()} hr restantes`}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick links */}
            <div className="flex gap-3">
                <Button asChild variant="outline">
                    <Link to="/mantencion/solicitudes">Ver todas las SMs</Link>
                </Button>
                <Button asChild variant="outline">
                    <Link to="/equipos">Gestión de Equipos</Link>
                </Button>
            </div>
        </div>
    )
}
