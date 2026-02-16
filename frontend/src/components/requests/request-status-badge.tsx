import { Badge } from '@/components/ui/badge'
import { STATUS_CONFIG } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface RequestStatusBadgeProps {
  status: string
  className?: string
}

export function RequestStatusBadge({ status, className }: RequestStatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  if (!config) {
    return <Badge variant="outline" className={className}>{status}</Badge>
  }

  return (
    <Badge variant="outline" className={cn(config.color, className)}>
      {config.label}
    </Badge>
  )
}
