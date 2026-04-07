import { Link } from 'react-router-dom'
import { useRequests } from '@/hooks/use-requests'
import { formatDate, formatCurrency } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'
import type { RequestStatus } from '@/api/types'

const COLUMNS: { id: string; label: string; statuses: RequestStatus[]; headerColor: string }[] = [
  {
    id: 'DRAFT',
    label: 'Borrador',
    statuses: ['DRAFT'],
    headerColor: 'border-b border-gray-200 dark:border-gray-700',
  },
  {
    id: 'PENDING_TECHNICAL',
    label: 'Aprob. Técnica',
    statuses: ['PENDING_TECHNICAL'],
    headerColor: 'border-b border-yellow-200 dark:border-yellow-700',
  },
  {
    id: 'PENDING_FINANCIAL',
    label: 'Aprob. Financiera',
    statuses: ['PENDING_FINANCIAL'],
    headerColor: 'border-b border-orange-200 dark:border-orange-700',
  },
  {
    id: 'APPROVED',
    label: 'Aprobado',
    statuses: ['APPROVED'],
    headerColor: 'border-b border-green-200 dark:border-green-700',
  },
  {
    id: 'PURCHASING',
    label: 'En Compra',
    statuses: ['PURCHASING'],
    headerColor: 'border-b border-blue-200 dark:border-blue-700',
  },
  {
    id: 'RECEIVED',
    label: 'Recepción',
    statuses: ['RECEIVED_PARTIAL', 'RECEIVED_FULL'],
    headerColor: 'border-b border-indigo-200 dark:border-indigo-700',
  },
  {
    id: 'COMPLETED',
    label: 'Completada',
    statuses: ['COMPLETED'],
    headerColor: 'border-b border-emerald-200 dark:border-emerald-700',
  },
]

const COLUMN_BG: Record<string, string> = {
  DRAFT: 'bg-gray-50 dark:bg-gray-900/50',
  PENDING_TECHNICAL: 'bg-yellow-50 dark:bg-yellow-950/20',
  PENDING_FINANCIAL: 'bg-orange-50 dark:bg-orange-950/20',
  APPROVED: 'bg-green-50 dark:bg-green-950/20',
  PURCHASING: 'bg-blue-50 dark:bg-blue-950/20',
  RECEIVED: 'bg-indigo-50 dark:bg-indigo-950/20',
  COMPLETED: 'bg-emerald-50 dark:bg-emerald-950/20',
}

interface Props {
  showFinancials?: boolean
}

export function RequestKanban({ showFinancials = false }: Props) {
  const { data, isLoading } = useRequests({ limit: 100 })
  const requests = data?.items ?? []

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((col) => (
          <div key={col.id} className="flex-shrink-0 w-56 space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    )
  }

  const grouped = COLUMNS.map((col) => ({
    ...col,
    items: requests.filter((r) => col.statuses.includes(r.status as RequestStatus)),
  }))

  return (
    <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1">
      {grouped.map((col) => (
        <div
          key={col.id}
          className={`flex-shrink-0 w-56 rounded-lg border ${COLUMN_BG[col.id] ?? 'bg-muted/30'}`}
        >
          {/* Column header */}
          <div className={`flex items-center justify-between px-3 py-2 ${col.headerColor}`}>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground truncate">
              {col.label}
            </span>
            <span className="ml-1 flex-shrink-0 text-xs font-bold rounded-full bg-background/80 px-1.5 py-0.5 min-w-[1.25rem] text-center">
              {col.items.length}
            </span>
          </div>

          {/* Cards */}
          <div className="p-2 space-y-2 max-h-72 overflow-y-auto">
            {col.items.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 text-center py-4">—</p>
            ) : (
              col.items.map((req) => (
                <Link
                  key={req.id}
                  to={`/solicitudes/${req.id}`}
                  className="block rounded-md bg-white dark:bg-zinc-900 border border-border/60 p-2 hover:border-primary/50 hover:shadow-sm transition-all"
                >
                  <p className="text-xs font-medium truncate leading-snug">{req.title}</p>
                  {req.cost_center_name && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {req.cost_center_name}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-muted-foreground">
                      {formatDate(req.created_at)}
                    </span>
                    {showFinancials && (
                      <span className="text-[11px] font-medium text-foreground">
                        {formatCurrency(req.total_amount)}
                      </span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
