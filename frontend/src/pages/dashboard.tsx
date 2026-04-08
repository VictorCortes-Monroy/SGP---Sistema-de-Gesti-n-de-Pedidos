import { PageHeader } from '@/components/shared/page-header'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { RequestKanban } from '@/components/dashboard/request-kanban'
import { PendingActions } from '@/components/dashboard/pending-actions'
import { RecentRequests } from '@/components/dashboard/recent-requests'
import { BudgetUsageChart } from '@/components/dashboard/budget-usage-chart'
import { RequesterDashboard } from '@/components/dashboard/requester-dashboard'
import { useDashboardSummary } from '@/hooks/use-dashboard'
import { useAuthStore } from '@/stores/auth-store'
import { canSeeFinancials } from '@/lib/constants'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function AdminDashboard() {
  const { data, isLoading } = useDashboardSummary()
  const roleName = useAuthStore((s) => s.user?.role_name)
  const showFinancials = canSeeFinancials(roleName)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Resumen general del sistema"
      />

      <SummaryCards data={data} isLoading={isLoading} />

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-48" />
        </div>
      ) : data ? (
        <>
          {/* Kanban + Pending Actions */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Solicitudes por Estado</CardTitle>
              </CardHeader>
              <CardContent>
                <RequestKanban showFinancials={showFinancials} />
              </CardContent>
            </Card>
            <PendingActions items={data.pending_actions} ocItems={data.pending_oc_approvals} />
          </div>

          {/* Recent + Budget */}
          <div className={`grid gap-6 ${showFinancials ? 'lg:grid-cols-2' : ''}`}>
            <RecentRequests items={data.recent_requests} />
            {showFinancials && <BudgetUsageChart items={data.budget_summary} />}
          </div>
        </>
      ) : null}
    </div>
  )
}

export default function DashboardPage() {
  const roleName = useAuthStore((s) => s.user?.role_name)
  const isRequester = roleName === 'Requester'

  return isRequester ? <RequesterDashboard /> : <AdminDashboard />
}
