import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: es })
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy HH:mm', { locale: es })
  } catch {
    return dateStr
  }
}
