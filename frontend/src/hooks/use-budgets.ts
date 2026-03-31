import { useQuery } from '@tanstack/react-query'
import { budgetsApi } from '@/api/budgets'

export function useBudgets() {
  return useQuery({
    queryKey: ['budgets'],
    queryFn: () => budgetsApi.list(),
  })
}

export function useBudgetReport(year?: number, companyId?: string) {
  return useQuery({
    queryKey: ['budget-report', year, companyId],
    queryFn: () => budgetsApi.getReport(year, companyId),
  })
}
