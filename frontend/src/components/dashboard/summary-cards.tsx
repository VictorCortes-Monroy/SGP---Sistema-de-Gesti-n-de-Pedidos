import { FileText, Clock, CheckCircle, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CardSkeleton } from '@/components/shared/loading-skeleton'
import { formatCurrency } from '@/lib/format'
import type { DashboardSummary } from '@/api/types'

interface Props {
  data?: DashboardSummary
  isLoading: boolean
}

export function SummaryCards({ data, isLoading }: Props) {
  if (isLoading || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    )
  }

  const pendingCount = (data.status_distribution['PENDING_TECHNICAL'] ?? 0)
    + (data.status_distribution['PENDING_FINANCIAL'] ?? 0)
  const approvedCount = data.status_distribution['APPROVED'] ?? 0
  const totalAvailable = data.budget_summary.reduce((sum, b) => sum + b.available_amount, 0)

  const cards = [
    {
      title: 'Pendientes',
      value: String(pendingCount),
      description: 'Solicitudes por aprobar',
      icon: Clock,
      color: 'text-orange-600',
    },
    {
      title: 'Aprobadas',
      value: String(approvedCount),
      description: 'Solicitudes aprobadas',
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      title: 'Total Solicitudes',
      value: String(data.total_requests),
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
