import { Check, X, Clock, AlertCircle, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RequestStatus } from '@/api/types'

interface Step {
  id: string
  label: string
  matchStatuses: RequestStatus[]
}

const STEPS: Step[] = [
  { id: 'DRAFT',             label: 'Borrador',       matchStatuses: ['DRAFT'] },
  { id: 'PENDING_TECHNICAL', label: 'Aprob. Técnica', matchStatuses: ['PENDING_TECHNICAL'] },
  { id: 'APPROVED',          label: 'Aprobado',       matchStatuses: ['APPROVED'] },
  { id: 'PURCHASING',        label: 'En Compra',      matchStatuses: ['PURCHASING'] },
  { id: 'RECEIVED',          label: 'Recepción',      matchStatuses: ['RECEIVED_PARTIAL', 'RECEIVED_FULL'] },
  { id: 'COMPLETED',         label: 'Completado',     matchStatuses: ['COMPLETED'] },
]

// Index in the main flow
const STATUS_STEP_INDEX: Record<RequestStatus, number> = {
  DRAFT: 0,
  PENDING_TECHNICAL: 1,
  PENDING_FINANCIAL: 1, // legacy backward compat — map to same level as technical
  APPROVED: 2,
  PURCHASING: 3,
  RECEIVED_PARTIAL: 4,
  RECEIVED_FULL: 4,
  COMPLETED: 5,
  REJECTED: -1,
  CANCELLED: -1,
}

const PENDING_ACTIONS: Partial<Record<RequestStatus, { actor: string; text: string }>> = {
  DRAFT: {
    actor: 'Solicitante',
    text: 'Enviar la solicitud para iniciar el proceso de aprobación técnica',
  },
  PENDING_TECHNICAL: {
    actor: 'Aprobador Técnico',
    text: 'Revisar los ítems y aprobar o rechazar la solicitud',
  },
  APPROVED: {
    actor: 'Compras',
    text: 'Generar la Orden de Compra con el proveedor seleccionado',
  },
  PURCHASING: {
    actor: 'Compras / Finanzas',
    text: 'La OC está en proceso de aprobación financiera o pendiente de envío al proveedor',
  },
  RECEIVED_PARTIAL: {
    actor: 'Compras',
    text: 'Recepción parcial registrada — pendiente confirmar los ítems restantes',
  },
  RECEIVED_FULL: {
    actor: 'Sistema',
    text: 'Todos los ítems recibidos — el sistema completará la solicitud automáticamente',
  },
}

interface RequestStatusPipelineProps {
  status: RequestStatus
}

export function RequestStatusPipeline({ status }: RequestStatusPipelineProps) {
  const isTerminalBad = status === 'REJECTED' || status === 'CANCELLED'
  const currentStepIndex = STATUS_STEP_INDEX[status]
  const pendingAction = PENDING_ACTIONS[status]

  return (
    <div className="space-y-3">
      {/* Stepper */}
      <div className="flex items-start">
        {STEPS.map((step, idx) => {
          const isCurrent = step.matchStatuses.includes(status)
          const isDone = !isTerminalBad && idx < currentStepIndex
          const isPending = isTerminalBad || idx > currentStepIndex
          const isLast = idx === STEPS.length - 1
          const connectorDone = !isTerminalBad && idx < currentStepIndex

          return (
            <div key={step.id} className="flex items-start flex-1 min-w-0">
              {/* Circle + label */}
              <div className="flex flex-col items-center shrink-0 w-14">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all',
                    isDone && 'bg-green-500 border-green-500 text-white',
                    isCurrent && !isTerminalBad &&
                      'bg-blue-500 border-blue-500 text-white ring-2 ring-blue-200 ring-offset-1',
                    isPending && !isTerminalBad && 'bg-white border-gray-200 text-gray-400',
                    isTerminalBad && 'bg-white border-gray-200 text-gray-300',
                  )}
                >
                  {isDone ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : isCurrent && !isTerminalBad ? (
                    <Clock className="h-3.5 w-3.5" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'mt-1.5 text-[10px] text-center leading-tight',
                    isDone && 'text-green-600 font-medium',
                    isCurrent && !isTerminalBad && 'text-blue-600 font-semibold',
                    (isPending || isTerminalBad) && 'text-gray-400',
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector */}
              {!isLast && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mt-4 mx-0.5',
                    connectorDone ? 'bg-green-400' : 'bg-gray-200',
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Terminal state banner */}
      {isTerminalBad && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium border',
            status === 'REJECTED' && 'bg-red-50 text-red-700 border-red-200',
            status === 'CANCELLED' && 'bg-gray-100 text-gray-600 border-gray-200',
          )}
        >
          <X className="h-4 w-4 shrink-0" />
          {status === 'REJECTED' ? 'Solicitud rechazada' : 'Solicitud cancelada'}
        </div>
      )}

      {/* Pending action */}
      {!isTerminalBad && status !== 'COMPLETED' && pendingAction && (
        <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
          <span>
            <span className="font-semibold">{pendingAction.actor}: </span>
            {pendingAction.text}
          </span>
        </div>
      )}

      {status === 'COMPLETED' && (
        <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700 font-medium">
          <Check className="h-3.5 w-3.5 shrink-0" />
          Solicitud completada exitosamente
        </div>
      )}
    </div>
  )
}
