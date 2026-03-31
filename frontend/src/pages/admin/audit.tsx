import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Search, RotateCcw } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { PaginationControls } from '@/components/shared/pagination-controls'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuditLogs } from '@/hooks/use-audit'
import { auditApi } from '@/api/audit'
import { STATUS_CONFIG } from '@/lib/constants'
import { toast } from 'sonner'
import type { AuditLogFilters } from '@/api/types'

const ACTION_OPTIONS = [
  { value: 'CREATED', label: 'Creada' },
  { value: 'SUBMITTED', label: 'Enviada' },
  { value: 'APPROVED', label: 'Aprobada' },
  { value: 'REJECTED', label: 'Rechazada' },
  { value: 'CANCELLED', label: 'Cancelada' },
  { value: 'RESUBMITTED', label: 'Reenviada' },
  { value: 'MARKED_PURCHASING', label: 'En Compra' },
  { value: 'RECEIVED_PARTIAL', label: 'Recepcion Parcial' },
  { value: 'RECEIVED_FULL', label: 'Recepcion Total' },
  { value: 'COMPLETED', label: 'Completada' },
]

const ACTION_COLORS: Record<string, string> = {
  CREATED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  CANCELLED: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  RESUBMITTED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  MARKED_PURCHASING: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  RECEIVED_PARTIAL: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  RECEIVED_FULL: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
  COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AuditPage() {
  const [filters, setFilters] = useState<AuditLogFilters>({ skip: 0, limit: 20 })

  const { data, isLoading } = useAuditLogs(filters)
  const page = Math.floor((filters.skip ?? 0) / (filters.limit ?? 20)) + 1

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      const blob = await auditApi.exportLogs(format, filters)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `auditoria.${format === 'excel' ? 'xlsx' : 'pdf'}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exportado en formato ${format.toUpperCase()}`)
    } catch {
      toast.error('Error al exportar')
    }
  }

  const clearFilters = () => {
    setFilters({ skip: 0, limit: 20 })
  }

  const hasFilters = filters.date_from || filters.date_to || filters.action

  return (
    <div className="space-y-6">
      <PageHeader title="Auditoria" description="Registro de todas las acciones del sistema">
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
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Desde</label>
              <Input
                type="date"
                className="w-[160px]"
                value={filters.date_from ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value || undefined, skip: 0 }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Hasta</label>
              <Input
                type="date"
                className="w-[160px]"
                value={filters.date_to ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value || undefined, skip: 0 }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Accion</label>
              <Select
                value={filters.action ?? 'all'}
                onValueChange={(v) => setFilters((f) => ({ ...f, action: v === 'all' ? undefined : v, skip: 0 }))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {ACTION_OPTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <RotateCcw className="mr-1 h-3 w-3" />
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Search className="mx-auto h-10 w-10 mb-3 opacity-50" />
            <p>No se encontraron registros de auditoria</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fecha/Hora</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actor</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rol</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Accion</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Solicitud</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Transicion</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Comentario</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((log) => {
                      const actionLabel = ACTION_OPTIONS.find((a) => a.value === log.action)?.label || log.action
                      const fromLabel = log.from_status ? (STATUS_CONFIG[log.from_status]?.label || log.from_status) : '-'
                      const toLabel = log.to_status ? (STATUS_CONFIG[log.to_status]?.label || log.to_status) : '-'

                      return (
                        <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                          <td className="px-4 py-3">{log.actor_name || '-'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{log.actor_role || '-'}</td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary" className={ACTION_COLORS[log.action] || ''}>
                              {actionLabel}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              to={`/solicitudes/${log.request_id}`}
                              className="text-primary hover:underline"
                            >
                              {log.request_title || log.request_id.slice(0, 8)}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {fromLabel} → {toLabel}
                          </td>
                          <td className="px-4 py-3 max-w-[200px] truncate" title={log.comment || ''}>
                            {log.comment || '-'}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{log.ip_address || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <PaginationControls
            page={page}
            pageSize={filters.limit ?? 20}
            total={data.total}
            onPageChange={(p) => setFilters((f) => ({ ...f, skip: (p - 1) * (f.limit ?? 20) }))}
            onPageSizeChange={(size) => setFilters((f) => ({ ...f, limit: size, skip: 0 }))}
          />
        </>
      )}
    </div>
  )
}
