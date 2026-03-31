import { useQuery } from '@tanstack/react-query'
import { auditApi } from '@/api/audit'
import type { AuditLogFilters } from '@/api/types'

export function useAuditLogs(filters: AuditLogFilters) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => auditApi.listLogs(filters),
  })
}
