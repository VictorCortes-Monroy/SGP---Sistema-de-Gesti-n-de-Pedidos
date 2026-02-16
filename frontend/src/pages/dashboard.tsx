import { PageHeader } from '@/components/shared/page-header'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { RecentRequests } from '@/components/dashboard/recent-requests'
import { BudgetUsageChart } from '@/components/dashboard/budget-usage-chart'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Resumen general del sistema"
      />
      <SummaryCards />
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentRequests />
        <BudgetUsageChart />
      </div>
    </div>
  )
}
