import { FileText, Clock, CheckCircle, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CardSkeleton } from '@/components/shared/loading-skeleton'
import { useRequests } from '@/hooks/use-requests'
import { useBudgets } from '@/hooks/use-budgets'
import { formatCurrency } from '@/lib/format'
import type { RequestResponse, BudgetResponse } from '@/api/types'

export function SummaryCards() {
  const { data: requestsData, isLoading: loadingRequests } = useRequests({ limit: 1 })
  const { data: pendingTech } = useRequests({ status: 'PENDING_TECHNICAL', limit: 1 })
  const { data: pendingFin } = useRequests({ status: 'PENDING_FINANCIAL', limit: 1 })
  const { data: approved } = useRequests({ status: 'APPROVED', limit: 1 })
  const { data: budgetsData, isLoading: loadingBudgets } = useBudgets()

  if (loadingRequests || loadingBudgets) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    )
  }

  const pendingCount = (pendingTech?.total ?? 0) + (pendingFin?.total ?? 0)
  const approvedCount = approved?.total ?? 0
  const totalCount = requestsData?.total ?? 0

  const budgets = (budgetsData as any)?.items ?? budgetsData ?? []
  const totalAvailable = Array.isArray(budgets)
    ? budgets.reduce((sum: number, b: BudgetResponse) => sum + b.available_amount, 0)
    : 0

  const cards = [
    {
      title: 'Pendientes',
      value: pendingCount,
      description: 'Solicitudes por aprobar',
      icon: Clock,
      color: 'text-orange-600',
    },
    {
      title: 'Aprobadas',
      value: approvedCount,
      description: 'Solicitudes aprobadas',
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      title: 'Total Solicitudes',
      value: totalCount,
      description: 'Todas las solicitudes',
      icon: FileText,
      color: 'text-blue-600',
    },
    {
      title: 'Presupuesto Disponible',
      value: formatCurrency(totalAvailable),
      description: 'Fondos disponibles',
      icon: DollarSign,
      color: 'text-emerald-600',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
