export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT:              { label: 'Borrador',              color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
  PENDING_TECHNICAL:  { label: 'Pendiente Tecnico',     color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  PENDING_FINANCIAL:  { label: 'Pendiente Financiero',  color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
  APPROVED:           { label: 'Aprobada',              color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  REJECTED:           { label: 'Rechazada',             color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
  PURCHASING:         { label: 'En Compra',             color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  RECEIVED_PARTIAL:   { label: 'Recepcion Parcial',     color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' },
  RECEIVED_FULL:      { label: 'Recepcion Total',       color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300' },
  COMPLETED:          { label: 'Completada',            color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300' },
  CANCELLED:          { label: 'Cancelada',             color: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
}

export const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, { label }]) => ({
  value,
  label,
}))

export const ROLE_LABELS: Record<string, string> = {
  'Admin': 'Administrador',
  'Requester': 'Solicitante',
  'Technical Approver': 'Aprobador Tecnico',
  'Financial Approver': 'Aprobador Financiero',
}
