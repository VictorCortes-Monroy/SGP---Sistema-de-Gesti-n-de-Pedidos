import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/empty-state'
import { DollarSign, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { BudgetSummaryItem } from '@/api/types'

interface Props {
  items: BudgetSummaryItem[]
}

export function BudgetUsageChart({ items }: Props) {
  if (!items.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Uso de Presupuesto</CardTitle>
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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Uso de Presupuesto</CardTitle>
        <Link to="/presupuestos" className="text-sm text-primary hover:underline">
          Ver reporte
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((budget, i) => {
          const total = budget.total_amount
          const executedPct = total > 0 ? (budget.executed_amount / total) * 100 : 0
          const reservedPct = total > 0 ? (budget.reserved_amount / total) * 100 : 0
          const usedPct = executedPct + reservedPct
          const isWarning = usedPct > 80

          return (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5">
                  {isWarning && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                  <span className={cn('font-medium', isWarning && 'text-red-600 dark:text-red-400')}>
                    {budget.cost_center_name}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatCurrency(budget.available_amount)} disponible
                </span>
              </div>

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

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex gap-3">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Ejecutado {executedPct.toFixed(0)}%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    Reservado {reservedPct.toFixed(0)}%
                  </span>
                </div>
                <span className={cn('font-medium', isWarning ? 'text-red-500' : 'text-muted-foreground')}>
                  {usedPct.toFixed(0)}% usado
                </span>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
