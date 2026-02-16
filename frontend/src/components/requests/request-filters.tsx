import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { STATUS_OPTIONS } from '@/lib/constants'
import type { RequestFilters } from '@/api/types'

interface RequestFiltersProps {
  filters: RequestFilters
  onChange: (filters: RequestFilters) => void
}

export function RequestFiltersBar({ filters, onChange }: RequestFiltersProps) {
  const updateFilter = (key: keyof RequestFilters, value: any) => {
    const next = { ...filters, [key]: value || undefined }
    // Reset to page 1 when filtering
    next.skip = 0
    onChange(next)
  }

  const clearFilters = () => {
    onChange({ limit: filters.limit })
  }

  const hasFilters = filters.status || filters.search || filters.min_amount || filters.max_amount

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar solicitudes..."
          value={filters.search ?? ''}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Status */}
      <Select
        value={filters.status ?? 'all'}
        onValueChange={(v) => updateFilter('status', v === 'all' ? undefined : v)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Amount range */}
      <Input
        type="number"
        placeholder="Monto min"
        className="w-[120px]"
        value={filters.min_amount ?? ''}
        onChange={(e) => updateFilter('min_amount', e.target.value ? Number(e.target.value) : undefined)}
      />
      <Input
        type="number"
        placeholder="Monto max"
        className="w-[120px]"
        value={filters.max_amount ?? ''}
        onChange={(e) => updateFilter('max_amount', e.target.value ? Number(e.target.value) : undefined)}
      />

      {/* Clear */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-1 h-4 w-4" />
          Limpiar
        </Button>
      )}
    </div>
  )
}
