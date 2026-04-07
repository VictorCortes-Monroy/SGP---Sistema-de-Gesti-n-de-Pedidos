import { useState } from 'react'
import { Package, Truck } from 'lucide-react'
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
import { usePurchaseOrdersForRequest, useReceivePurchaseOrder } from '@/hooks/use-purchase-orders'
import { useAuthStore } from '@/stores/auth-store'
import type { PurchaseOrderResponse, PurchaseOrderItemResponse } from '@/api/types'

const PO_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  SENT: 'Enviada',
  RECEIVED_PARTIAL: 'Recepción Parcial',
  RECEIVED_FULL: 'Recepción Completa',
  CLOSED: 'Cerrada',
  CANCELLED: 'Anulada',
}

const PO_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'secondary',
  SENT: 'default',
  RECEIVED_PARTIAL: 'secondary',
  RECEIVED_FULL: 'default',
  CLOSED: 'outline',
  CANCELLED: 'destructive',
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-CL')
}

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

interface PurchaseOrderDetailProps {
  requestId: string
}

export function PurchaseOrderDetail({ requestId }: PurchaseOrderDetailProps) {
  const [receptionOpen, setReceptionOpen] = useState(false)
  const { data, isLoading } = usePurchaseOrdersForRequest(requestId)
  const roleName = useAuthStore((s) => s.user?.role_name)

  const po = data?.items?.[0] as PurchaseOrderResponse | undefined

  if (isLoading || !po) return null

  const canReceive =
    ['DRAFT', 'SENT', 'RECEIVED_PARTIAL'].includes(po.status) &&
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

          {canReceive && (
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => setReceptionOpen(true)}
            >
              <Package className="mr-2 h-4 w-4" />
              Registrar Recepcion
            </Button>
          )}
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
