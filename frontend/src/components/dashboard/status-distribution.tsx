import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { STATUS_CONFIG } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface Props {
  distribution: Record<string, number>
}

export function StatusDistribution({ distribution }: Props) {
  const navigate = useNavigate()
  const entries = Object.entries(distribution).filter(([, count]) => count > 0)
  const total = entries.reduce((sum, [, count]) => sum + count, 0)

  if (entries.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Distribucion por Estado</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {entries.map(([status, count]) => {
            const config = STATUS_CONFIG[status]
            const label = config?.label || status
            const colorClass = config?.color || 'bg-gray-100 text-gray-800'

            return (
              <button
                key={status}
                onClick={() => navigate(`/solicitudes?status=${status}`)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-80',
                  colorClass,
                )}
              >
                {label}
                <span className="inline-flex items-center justify-center rounded-full bg-black/10 dark:bg-white/10 px-1.5 text-xs min-w-[20px]">
                  {count}
                </span>
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {total} solicitudes en total
        </p>
      </CardContent>
    </Card>
  )
}
