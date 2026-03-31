import { useState } from 'react'
import { Download } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useBudgetReport } from '@/hooks/use-budgets'
import { useCompanies } from '@/hooks/use-organizations'
import { budgetsApi } from '@/api/budgets'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'USD' }).format(amount)
}

export default function BudgetsPage() {
  const [year, setYear] = useState(currentYear)
  const [companyId, setCompanyId] = useState<string | undefined>()

  const { data: report, isLoading } = useBudgetReport(year, companyId)
  const { data: companiesData } = useCompanies()
  const companies = companiesData?.items ?? []

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      const blob = await budgetsApi.exportReport(format, year, companyId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `presupuestos_${year}.${format === 'excel' ? 'xlsx' : 'pdf'}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exportado en formato ${format.toUpperCase()}`)
    } catch {
      toast.error('Error al exportar')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Presupuestos" description="Reporte de presupuestos por empresa y centro de costo">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={companyId ?? 'all'} onValueChange={(v) => setCompanyId(v === 'all' ? undefined : v)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Todas las empresas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las empresas</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !report ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No se encontraron presupuestos para el año {year}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Grand summary cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <SummaryCard title="Total Presupuestado" value={report.grand_total} />
            <SummaryCard title="Reservado" value={report.grand_reserved} variant="warning" />
            <SummaryCard title="Ejecutado" value={report.grand_executed} variant="info" />
            <SummaryCard title="Disponible" value={report.grand_available} variant="success" />
          </div>

          {/* Company groups */}
          {report.groups.map((group) => (
            <Card key={group.company_id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{group.company_name}</CardTitle>
                  <span className="text-sm text-muted-foreground">
                    Total: {formatCurrency(group.total_amount)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Centro de Costo</th>
                        <th className="pb-2 font-medium text-right">Total</th>
                        <th className="pb-2 font-medium text-right">Reservado</th>
                        <th className="pb-2 font-medium text-right">Ejecutado</th>
                        <th className="pb-2 font-medium text-right">Disponible</th>
                        <th className="pb-2 font-medium w-[180px]">Utilizacion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.budgets.map((item) => (
                        <tr key={item.cost_center_id} className="border-b last:border-0">
                          <td className="py-3">
                            <div className="font-medium">{item.cost_center_name}</div>
                            <div className="text-xs text-muted-foreground">{item.cost_center_code}</div>
                          </td>
                          <td className="py-3 text-right">{formatCurrency(item.total_amount)}</td>
                          <td className="py-3 text-right text-amber-600 dark:text-amber-400">{formatCurrency(item.reserved_amount)}</td>
                          <td className="py-3 text-right text-blue-600 dark:text-blue-400">{formatCurrency(item.executed_amount)}</td>
                          <td className="py-3 text-right text-green-600 dark:text-green-400">{formatCurrency(item.available_amount)}</td>
                          <td className="py-3">
                            <UtilizationBar pct={item.utilization_pct} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}

          {report.groups.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No hay presupuestos registrados para este periodo
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function SummaryCard({ title, value, variant }: {
  title: string
  value: number
  variant?: 'warning' | 'info' | 'success'
}) {
  const colorClass = variant === 'warning'
    ? 'text-amber-600 dark:text-amber-400'
    : variant === 'info'
    ? 'text-blue-600 dark:text-blue-400'
    : variant === 'success'
    ? 'text-green-600 dark:text-green-400'
    : ''

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className={cn('text-2xl font-bold mt-1', colorClass)}>
          {formatCurrency(value)}
        </p>
      </CardContent>
    </Card>
  )
}

function UtilizationBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct))
  const isHigh = clamped > 80

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isHigh ? 'bg-red-500' : clamped > 50 ? 'bg-amber-500' : 'bg-green-500'
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className={cn('text-xs font-medium min-w-[40px] text-right', isHigh && 'text-red-500')}>
        {pct.toFixed(1)}%
      </span>
    </div>
  )
}
