import { CheckCircle, Circle, Clock, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRequestTimeline } from '@/hooks/use-requests'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface RequestTimelineProps {
  requestId: string
}

const ACTION_ICONS: Record<string, typeof CheckCircle> = {
  APPROVED: CheckCircle,
  REJECTED: XCircle,
  SUBMITTED: Clock,
  CANCELLED: XCircle,
}

const ACTION_COLORS: Record<string, string> = {
  APPROVED: 'text-green-600 bg-green-50 dark:bg-green-950',
  REJECTED: 'text-red-600 bg-red-50 dark:bg-red-950',
  SUBMITTED: 'text-blue-600 bg-blue-50 dark:bg-blue-950',
  CANCELLED: 'text-gray-600 bg-gray-50 dark:bg-gray-950',
}

const ACTION_LABELS: Record<string, string> = {
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  SUBMITTED: 'Enviado',
  CANCELLED: 'Cancelado',
  CREATED: 'Creado',
  RECEIVED: 'Recibido',
}

export function RequestTimeline({ requestId }: RequestTimelineProps) {
  const { data, isLoading } = useRequestTimeline(requestId)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Historial</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : !data?.logs?.length ? (
          <p className="text-sm text-muted-foreground">Sin historial</p>
        ) : (
          <div className="relative space-y-0">
            {data.logs.map((step: any, idx: number) => {
              const Icon = ACTION_ICONS[step.action] ?? Circle
              const color = ACTION_COLORS[step.action] ?? 'text-muted-foreground bg-muted'
              const isLast = idx === data.logs.length - 1

              return (
                <div key={idx} className="flex gap-3 pb-6 last:pb-0">
                  {/* Line + Icon */}
                  <div className="relative flex flex-col items-center">
                    <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {!isLast && (
                      <div className="absolute top-8 h-full w-px bg-border" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <p className="text-sm font-medium">
                      {ACTION_LABELS[step.action] ?? step.action}
                      {step.from_status && step.to_status && (
                        <span className="text-muted-foreground font-normal">
                          {' '}— {step.from_status} → {step.to_status}
                        </span>
                      )}
                    </p>
                    {step.actor_name && (
                      <p className="text-xs text-muted-foreground">
                        por {step.actor_name}
                      </p>
                    )}
                    {step.comment && (
                      <p className="mt-1 text-sm text-muted-foreground italic">
                        "{step.comment}"
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(step.timestamp)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
