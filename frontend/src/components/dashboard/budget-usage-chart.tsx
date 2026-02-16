import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useBudgets } from '@/hooks/use-budgets'
import { formatCurrency } from '@/lib/format'
import { CardSkeleton } from '@/components/shared/loading-skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { DollarSign } from 'lucide-react'
import type { BudgetResponse } from '@/api/types'

export function BudgetUsageChart() {
  const { data, isLoading } = useBudgets()

  if (isLoading) return <CardSkeleton />

  const budgets: BudgetResponse[] = (data as any)?.items ?? data ?? []

  if (!budgets.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Uso de Presupuesto</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={DollarSign}
            title="Sin presupuestos"
            description="No hay presupuestos configurados"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Uso de Presupuesto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {budgets.map((budget) => {
          const total = budget.total_amount
          const executedPct = total > 0 ? (budget.executed_amount / total) * 100 : 0
          const reservedPct = total > 0 ? (budget.reserved_amount / total) * 100 : 0
          const availablePct = 100 - executedPct - reservedPct

          return (
            <div key={budget.id} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{budget.year} - {budget.cost_center_name || 'Centro de costo'}</span>
                <span className="text-muted-foreground">
                  {formatCurrency(budget.available_amount)} disponible
                </span>
              </div>

              {/* Stacked bar */}
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                {executedPct > 0 && (
                  <div
                    className="bg-blue-500 transition-all"
                    style={{ width: `${executedPct}%` }}
                    title={`Ejecutado: ${formatCurrency(budget.executed_amount)}`}
                  />
                )}
                {reservedPct > 0 && (
                  <div
                    className="bg-amber-400 transition-all"
                    style={{ width: `${reservedPct}%` }}
                    title={`Reservado: ${formatCurrency(budget.reserved_amount)}`}
                  />
                )}
              </div>

              {/* Legend */}
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Ejecutado ({formatCurrency(budget.executed_amount)})
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  Reservado ({formatCurrency(budget.reserved_amount)})
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/20" />
                  Disponible ({formatCurrency(budget.available_amount)})
                </span>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
