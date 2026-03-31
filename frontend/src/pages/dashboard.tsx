import { PageHeader } from '@/components/shared/page-header'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { StatusDistribution } from '@/components/dashboard/status-distribution'
import { PendingActions } from '@/components/dashboard/pending-actions'
import { RecentRequests } from '@/components/dashboard/recent-requests'
import { BudgetUsageChart } from '@/components/dashboard/budget-usage-chart'
import { useDashboardSummary } from '@/hooks/use-dashboard'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardPage() {
  const { data, isLoading } = useDashboardSummary()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Resumen general del sistema"
      />

      <SummaryCards data={data} isLoading={isLoading} />

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : data ? (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <StatusDistribution distribution={data.status_distribution} />
            <PendingActions items={data.pending_actions} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <RecentRequests items={data.recent_requests} />
            <BudgetUsageChart items={data.budget_summary} />
          </div>
        </>
      ) : null}
    </div>
  )
}
