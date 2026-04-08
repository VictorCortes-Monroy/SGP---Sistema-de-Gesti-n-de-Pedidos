import { useState } from 'react'
import { Package, Truck, CheckCircle, XCircle, RotateCcw, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import {
  usePurchaseOrdersForRequest,
  usePurchaseOrder,
  useReceivePurchaseOrder,
  useSendPurchaseOrder,
  useFinanceApprovePO,
  useFinanceRejectPO,
  useResubmitPO,
} from '@/hooks/use-purchase-orders'
import { useAuthStore } from '@/stores/auth-store'
import type { PurchaseOrderResponse, PurchaseOrderItemResponse } from '@/api/types'

const PO_STATUS_LABELS: Record<string, string> = {
  DRAFT:             'Borrador',
  PENDING_FINANCE_1: 'Aprob. Finanzas 1',
  PENDING_FINANCE_2: 'Aprob. Gerencia',
  AUTHORIZED:        'Autorizada',
  SENT:              'Enviada al Proveedor',
  RECEIVED_PARTIAL:  'Recepción Parcial',
  RECEIVED_FULL:     'Recepción Completa',
  CLOSED:            'Cerrada',
  CANCELLED:         'Anulada',
}

const PO_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT:             'secondary',
  PENDING_FINANCE_1: 'secondary',
  PENDING_FINANCE_2: 'secondary',
  AUTHORIZED:        'default',
  SENT:              'default',
  RECEIVED_PARTIAL:  'secondary',
  RECEIVED_FULL:     'default',
  CLOSED:            'outline',
  CANCELLED:         'destructive',
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-CL')
}

// ── Finance Approval Panel ────────────────────────────────────────────────────

interface POApprovalPanelProps {
  po: PurchaseOrderResponse
  roleName: string | null | undefined
}

function POApprovalPanel({ po, roleName }: POApprovalPanelProps) {
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)

  const financeApprove = useFinanceApprovePO()
  const financeReject = useFinanceRejectPO()
  const resubmit = useResubmitPO()

  const isAdmin = roleName === 'Admin'
  const isFinance1 = roleName === 'Financial Approver'
  const isFinance2 = roleName === 'Finance 2'
  const isPurchasing = roleName === 'Purchasing'

  const canApprove =
    (po.status === 'PENDING_FINANCE_1' && (isFinance1 || isAdmin)) ||
    (po.status === 'PENDING_FINANCE_2' && (isFinance2 || isAdmin))

  const canReject = canApprove

  const canResubmit = po.status === 'DRAFT' && (isPurchasing || isAdmin)

  const isPendingFinance =
    po.status === 'PENDING_FINANCE_1' || po.status === 'PENDING_FINANCE_2'

  // For Purchasing: show informational message while waiting for finance approval
  if (!canApprove && !canResubmit) {
    if (isPurchasing && isPendingFinance) {
      return (
        <div className="border rounded-lg p-4 space-y-1 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
            <Clock className="h-4 w-4 shrink-0" />
            {po.status === 'PENDING_FINANCE_1'
              ? 'Esperando aprobación de Finanzas 1'
              : 'Esperando aprobación de Gerencia General'}
          </div>
          <p className="text-xs text-amber-700 pl-6">
            La OC no puede enviarse al proveedor hasta que sea autorizada financieramente.
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Clock className="h-4 w-4 text-amber-500" />
        {po.status === 'PENDING_FINANCE_1' && 'Pendiente aprobación Finanzas 1'}
        {po.status === 'PENDING_FINANCE_2' && 'Pendiente aprobación Gerencia General'}
        {po.status === 'DRAFT' && 'OC en Borrador — lista para reenviar a aprobación'}
      </div>

      <div className="flex flex-wrap gap-2">
        {canApprove && (
          <Button size="sm" onClick={() => setApproveOpen(true)}>
            <CheckCircle className="mr-1 h-4 w-4" />
            Aprobar OC
          </Button>
        )}
        {canReject && (
          <Button size="sm" variant="destructive" onClick={() => setRejectOpen(true)}>
            <XCircle className="mr-1 h-4 w-4" />
            Rechazar OC
          </Button>
        )}
        {canResubmit && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => resubmit.mutate(po.id)}
            disabled={resubmit.isPending}
          >
            <RotateCcw className="mr-1 h-4 w-4" />
            {resubmit.isPending ? 'Reenviando...' : 'Reenviar a Aprobación'}
          </Button>
        )}
      </div>

      {/* Approval log */}
      {po.approval_logs && po.approval_logs.length > 0 && (
        <div className="space-y-1 pt-1 border-t text-xs text-muted-foreground">
          {po.approval_logs.map((log) => (
            <div key={log.id} className="flex items-start gap-1">
              {log.action === 'APPROVE'
                ? <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                : <XCircle className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
              }
              <span>
                <span className="font-medium">{log.actor_name ?? 'Usuario'}</span>
                {' — '}{log.action === 'APPROVE' ? 'Aprobó' : 'Rechazó'}
                {' (F'}{log.finance_level}{')'}{' '}
                {log.comment && `· "${log.comment}"`}
                {' · '}{new Date(log.timestamp).toLocaleDateString('es-CL', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Aprobar Orden de Compra"
        description={`¿Confirmas la aprobación de ${po.oc_number}?`}
        confirmLabel="Aprobar"
        showComment
        commentLabel="Comentario (opcional)"
        loading={financeApprove.isPending}
        onConfirm={(comment) =>
          financeApprove.mutate(
            { id: po.id, payload: { comment: comment || undefined } },
            { onSuccess: () => setApproveOpen(false) }
          )
        }
      />

      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Rechazar Orden de Compra"
        description={`La OC ${po.oc_number} volverá a Borrador para que Compras la corrija.`}
        confirmLabel="Rechazar"
        variant="destructive"
        showComment
        commentLabel="Motivo de rechazo"
        commentRequired
        loading={financeReject.isPending}
        onConfirm={(comment) =>
          financeReject.mutate(
            { id: po.id, payload: { comment: comment || undefined } },
            { onSuccess: () => setRejectOpen(false) }
          )
        }
      />
    </div>
  )
}

// ── Reception Dialog ──────────────────────────────────────────────────────────

interface ReceptionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  po: PurchaseOrderResponse
}

function ReceptionDialog({ open, onOpenChange, po }: ReceptionDialogProps) {
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      po.items.map((item) => [
        item.id,
        String(item.quantity_ordered - item.quantity_received),
      ])
    )
  )
  const [notes, setNotes] = useState('')
  const receivePO = useReceivePurchaseOrder()

  const handleSubmit = () => {
    const receptionItems = po.items
      .map((item) => ({
        purchase_order_item_id: item.id,
        quantity_received: parseFloat(quantities[item.id] ?? '0') || 0,
      }))
      .filter((i) => i.quantity_received > 0)

    if (receptionItems.length === 0) return

    receivePO.mutate(
      { id: po.id, payload: { items: receptionItems, notes: notes || undefined } },
      { onSuccess: () => { onOpenChange(false); setNotes('') } }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-white">
        <DialogHeader>
          <DialogTitle>Registrar Recepcion — {po.oc_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripcion</TableHead>
                <TableHead className="text-right">Pedido</TableHead>
                <TableHead className="text-right">Recibido prev.</TableHead>
                <TableHead className="text-right w-28">A recibir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.items.map((item: PurchaseOrderItemResponse) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                  <TableCell className="text-right">{item.quantity_received}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min={0}
                      max={item.quantity_ordered - item.quantity_received}
                      step={1}
                      className="w-24 text-right ml-auto"
                      value={quantities[item.id] ?? ''}
                      onChange={(e) =>
                        setQuantities((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="space-y-1.5">
            <Label>Notas de recepcion</Label>
            <Textarea
              placeholder="Observaciones, condicion de los materiales..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={receivePO.isPending}>
            {receivePO.isPending ? 'Guardando...' : 'Confirmar Recepcion'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

interface PurchaseOrderDetailProps {
  requestId: string
}

export function PurchaseOrderDetail({ requestId }: PurchaseOrderDetailProps) {
  const [receptionOpen, setReceptionOpen] = useState(false)
  // Step 1: get PO id from list
  const { data: listData, isLoading: listLoading } = usePurchaseOrdersForRequest(requestId)
  const poId = listData?.items?.[0]?.id
  // Step 2: fetch full PO detail (includes items and approval_logs)
  const { data: po, isLoading: detailLoading } = usePurchaseOrder(poId ?? '')
  const roleName = useAuthStore((s) => s.user?.role_name)
  const sendPO = useSendPurchaseOrder()

  if (listLoading || detailLoading || !po) return null

  const canSend =
    po.status === 'AUTHORIZED' &&
    (roleName === 'Admin' || roleName === 'Purchasing')

  const canReceive =
    ['SENT', 'RECEIVED_PARTIAL'].includes(po.status) &&
    (roleName === 'Admin' || roleName === 'Purchasing')

  const currency = po.currency || 'CLP'
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency }).format(amount)

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Orden de Compra
            </CardTitle>
            <Badge variant={PO_STATUS_VARIANT[po.status] ?? 'outline'}>
              {PO_STATUS_LABELS[po.status] ?? po.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Header info */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <div className="text-muted-foreground">Numero OC</div>
            <div className="font-semibold">{po.oc_number}</div>

            <div className="text-muted-foreground">Proveedor</div>
            <div>{po.supplier_name ?? '—'}</div>

            <div className="text-muted-foreground">Entrega esperada</div>
            <div>{formatDate(po.expected_delivery_date)}</div>

            <div className="text-muted-foreground">Plazo pago</div>
            <div>
              {po.payment_terms_days != null ? `${po.payment_terms_days} dias` : '—'}
              {po.payment_terms_text && ` (${po.payment_terms_text})`}
            </div>

            <div className="text-muted-foreground">Total OC</div>
            <div className="font-semibold">{formatCurrency(po.total_amount)}</div>
          </div>

          {/* Finance approval panel */}
          <POApprovalPanel po={po} roleName={roleName} />

          {/* Items table */}
          {po.items && po.items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Pedido</TableHead>
                  <TableHead className="text-right">Recibido</TableHead>
                  <TableHead className="text-right">Precio unit.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {po.items.map((item: PurchaseOrderItemResponse) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                    <TableCell className="text-right">
                      <span className={item.quantity_received < item.quantity_ordered ? 'text-amber-600' : 'text-green-600'}>
                        {item.quantity_received}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex gap-2">
            {canSend && (
              <Button
                className="flex-1"
                onClick={() => sendPO.mutate(po.id)}
                disabled={sendPO.isPending}
              >
                <Truck className="mr-2 h-4 w-4" />
                {sendPO.isPending ? 'Enviando...' : 'Enviar OC al Proveedor'}
              </Button>
            )}
            {canReceive && (
              <Button
                className="flex-1"
                variant="secondary"
                onClick={() => setReceptionOpen(true)}
              >
                <Package className="mr-2 h-4 w-4" />
                Registrar Recepcion
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {po && (
        <ReceptionDialog
          open={receptionOpen}
          onOpenChange={setReceptionOpen}
          po={po}
        />
      )}
    </>
  )
}
