import { useState } from 'react'
import { Send, CheckCircle, XCircle, Ban, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  useSubmitRequest,
  useApproveRequest,
  useRejectRequest,
  useCancelRequest,
} from '@/hooks/use-requests'
import { useAuthStore } from '@/stores/auth-store'
import { PurchaseOrderForm } from './purchase-order-form'
import type { RequestDetail } from '@/api/types'

interface RequestActionsProps {
  request: RequestDetail
}

type DialogType = 'submit' | 'approve' | 'reject' | 'cancel' | null

export function RequestActions({ request }: RequestActionsProps) {
  const [dialog, setDialog] = useState<DialogType>(null)
  const [poFormOpen, setPoFormOpen] = useState(false)
  const user = useAuthStore((s) => s.user)

  const submit = useSubmitRequest()
  const approve = useApproveRequest()
  const reject = useRejectRequest()
  const cancel = useCancelRequest()

  const status = request.status
  const roleName = user?.role_name

  const canSubmit = status === 'DRAFT' && (roleName === 'Admin' || user?.id === request.requester_id)
  const canApprove =
    (status === 'PENDING_TECHNICAL' && (roleName === 'Technical Approver' || roleName === 'Admin')) ||
    (status === 'PENDING_FINANCIAL' && (roleName === 'Financial Approver' || roleName === 'Admin'))
  const canReject = canApprove
  const canCancel =
    ['DRAFT', 'PENDING_TECHNICAL', 'PENDING_FINANCIAL'].includes(status) &&
    (roleName === 'Admin' || user?.id === request.requester_id)
  const canPurchase = status === 'APPROVED' && (roleName === 'Admin' || roleName === 'Purchasing')

  const hasActions = canSubmit || canApprove || canReject || canCancel || canPurchase

  if (!hasActions) return null

  const handleConfirm = (comment?: string) => {
    switch (dialog) {
      case 'submit':
        submit.mutate(request.id, { onSuccess: () => setDialog(null) })
        break
      case 'approve':
        approve.mutate({ id: request.id, comment }, { onSuccess: () => setDialog(null) })
        break
      case 'reject':
        reject.mutate({ id: request.id, comment }, { onSuccess: () => setDialog(null) })
        break
      case 'cancel':
        cancel.mutate({ id: request.id, comment }, { onSuccess: () => setDialog(null) })
        break
    }
  }

  const isLoading = submit.isPending || approve.isPending || reject.isPending || cancel.isPending

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Acciones</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {canSubmit && (
            <Button onClick={() => setDialog('submit')} className="w-full">
              <Send className="mr-2 h-4 w-4" />
              Enviar a Aprobacion
            </Button>
          )}
          {canApprove && (
            <Button onClick={() => setDialog('approve')} className="w-full" variant="default">
              <CheckCircle className="mr-2 h-4 w-4" />
              Aprobar
            </Button>
          )}
          {canReject && (
            <Button onClick={() => setDialog('reject')} className="w-full" variant="destructive">
              <XCircle className="mr-2 h-4 w-4" />
              Rechazar
            </Button>
          )}
          {canPurchase && (
            <Button onClick={() => setPoFormOpen(true)} className="w-full" variant="default">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Iniciar Compra
            </Button>
          )}
          {canCancel && (
            <Button onClick={() => setDialog('cancel')} className="w-full" variant="outline">
              <Ban className="mr-2 h-4 w-4" />
              Cancelar Solicitud
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Submit dialog */}
      <ConfirmDialog
        open={dialog === 'submit'}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Enviar solicitud"
        description="La solicitud sera enviada para aprobacion tecnica. No podras editarla despues."
        confirmLabel="Enviar"
        onConfirm={handleConfirm}
        loading={isLoading}
      />

      {/* Approve dialog */}
      <ConfirmDialog
        open={dialog === 'approve'}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Aprobar solicitud"
        description="Confirma que deseas aprobar esta solicitud."
        confirmLabel="Aprobar"
        showComment
        commentLabel="Comentario (opcional)"
        onConfirm={handleConfirm}
        loading={isLoading}
      />

      {/* Reject dialog */}
      <ConfirmDialog
        open={dialog === 'reject'}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Rechazar solicitud"
        description="Indica el motivo del rechazo."
        confirmLabel="Rechazar"
        variant="destructive"
        showComment
        commentLabel="Motivo del rechazo"
        commentRequired
        onConfirm={handleConfirm}
        loading={isLoading}
      />

      {/* Cancel dialog */}
      <ConfirmDialog
        open={dialog === 'cancel'}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Cancelar solicitud"
        description="Esta accion no se puede deshacer."
        confirmLabel="Cancelar Solicitud"
        variant="destructive"
        showComment
        commentLabel="Motivo de cancelacion"
        onConfirm={handleConfirm}
        loading={isLoading}
      />

      {/* Purchase Order Form */}
      <PurchaseOrderForm
        open={poFormOpen}
        onOpenChange={setPoFormOpen}
        request={request}
      />
    </>
  )
}
