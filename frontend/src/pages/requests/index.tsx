import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Download } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { RequestFiltersBar } from '@/components/requests/request-filters'
import { RequestTable } from '@/components/requests/request-table'
import { PaginationControls } from '@/components/shared/pagination-controls'
import { Button } from '@/components/ui/button'
import { useRequests } from '@/hooks/use-requests'
import { requestsApi } from '@/api/requests'
import { toast } from 'sonner'
import type { RequestFilters } from '@/api/types'

export default function RequestsPage() {
  const [filters, setFilters] = useState<RequestFilters>({
    skip: 0,
    limit: 20,
  })

  const { data, isLoading } = useRequests(filters)
  const page = Math.floor((filters.skip ?? 0) / (filters.limit ?? 20)) + 1

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      const blob = await requestsApi.exportFile(format, filters)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `solicitudes.${format === 'excel' ? 'xlsx' : 'pdf'}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exportado en formato ${format.toUpperCase()}`)
    } catch {
      toast.error('Error al exportar')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Solicitudes" description="Gestion de solicitudes de pedido">
        <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
          <Download className="mr-1 h-4 w-4" />
          Excel
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
          <Download className="mr-1 h-4 w-4" />
          PDF
        </Button>
        <Button asChild>
          <Link to="/solicitudes/nueva">
            <Plus className="mr-1 h-4 w-4" />
            Nueva Solicitud
          </Link>
        </Button>
      </PageHeader>

      <RequestFiltersBar filters={filters} onChange={setFilters} />

      <RequestTable
        requests={data?.items ?? []}
        isLoading={isLoading}
      />

      {data && data.total > 0 && (
        <PaginationControls
          page={page}
          pageSize={filters.limit ?? 20}
          total={data.total}
          onPageChange={(p) =>
            setFilters((f) => ({ ...f, skip: (p - 1) * (f.limit ?? 20) }))
          }
          onPageSizeChange={(size) =>
            setFilters((f) => ({ ...f, limit: size, skip: 0 }))
          }
        />
      )}
    </div>
  )
}
