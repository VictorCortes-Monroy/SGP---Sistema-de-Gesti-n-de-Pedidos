import { FileX } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon = FileX,
  title,
  description,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <Icon className="h-12 w-12 text-muted-foreground/50" />
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
