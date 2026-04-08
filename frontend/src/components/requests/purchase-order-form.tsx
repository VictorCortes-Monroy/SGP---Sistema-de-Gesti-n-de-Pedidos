import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { getSuppliers } from '@/api/catalog'
import { useCreatePurchaseOrder, useQuotationsForRequest } from '@/hooks/use-purchase-orders'
import type { RequestDetail, PurchaseOrderItemCreate } from '@/api/types'

interface PurchaseOrderFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: RequestDetail
}

interface ItemRow extends PurchaseOrderItemCreate {
  _rowKey: string
}

export function PurchaseOrderForm({ open, onOpenChange, request }: PurchaseOrderFormProps) {
  const [supplierId, setSupplierId] = useState('')
  const [quotationId, setQuotationId] = useState('')
  const [currency, setCurrency] = useState('CLP')
  const [expectedDelivery, setExpectedDelivery] = useState('')
  const [paymentTermsDays, setPaymentTermsDays] = useState('')
  const [paymentTermsText, setPaymentTermsText] = useState('')
  const [notes, setNotes] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [items, setItems] = useState<ItemRow[]>(() =>
    request.items.map((ri) => ({
      _rowKey: ri.id,
      request_item_id: ri.id,
      description: ri.description,
      quantity_ordered: ri.quantity,
      unit_price: ri.unit_price,
    }))
  )

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => getSuppliers({ is_active: true }),
  })

  const { data: quotations = [] } = useQuotationsForRequest(request.id)

  const createPO = useCreatePurchaseOrder()

  const updateItemPrice = (rowKey: string, price: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item._rowKey === rowKey
          ? { ...item, unit_price: parseFloat(price) || 0 }
          : item
      )
    )
  }

  const totalAmount = items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity_ordered,
    0
  )

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency }).format(amount)

  const handleSubmit = () => {
    if (!supplierId) return
    setErrorMsg(null)

    createPO.mutate(
      {
        request_id: request.id,
        supplier_id: supplierId,
        quotation_id: quotationId || undefined,
        currency,
        expected_delivery_date: expectedDelivery || undefined,
        payment_terms_days: paymentTermsDays ? parseInt(paymentTermsDays) : undefined,
        payment_terms_text: paymentTermsText || undefined,
        notes: notes || undefined,
        items: items.map(({ _rowKey, ...rest }) => rest),
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          resetForm()
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.detail || err?.message || 'Error al crear la Orden de Compra'
          setErrorMsg(typeof msg === 'string' ? msg : JSON.stringify(msg))
        },
      }
    )
  }

  const resetForm = () => {
    setSupplierId('')
    setQuotationId('')
    setCurrency('CLP')
    setExpectedDelivery('')
    setPaymentTermsDays('')
    setPaymentTermsText('')
    setNotes('')
    setErrorMsg(null)
    setItems(
      request.items.map((ri) => ({
        _rowKey: ri.id,
        request_item_id: ri.id,
        description: ri.description,
        quantity_ordered: ri.quantity,
        unit_price: ri.unit_price,
      }))
    )
  }

  const receivedQuotations = quotations.filter((q) => q.status === 'RECEIVED' || q.status === 'SELECTED')

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm() }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>Crear Orden de Compra</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Solicitud: <span className="font-medium">{request.title}</span>
          </p>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* ── Sección 1: Datos generales ── */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Datos generales</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Proveedor *</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Seleccionar proveedor..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                        {s.rut && <span className="text-muted-foreground ml-1">({s.rut})</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Fecha entrega esperada</Label>
                <Input
                  type="date"
                  value={expectedDelivery}
                  onChange={(e) => setExpectedDelivery(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Moneda</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="CLP">CLP — Peso Chileno</SelectItem>
                    <SelectItem value="USD">USD — Dólar</SelectItem>
                    <SelectItem value="EUR">EUR — Euro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Plazo de pago (días)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="30"
                  value={paymentTermsDays}
                  onChange={(e) => setPaymentTermsDays(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Condición de pago</Label>
                <Input
                  placeholder="ej: 30 días factura"
                  value={paymentTermsText}
                  onChange={(e) => setPaymentTermsText(e.target.value)}
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Notas</Label>
                <Textarea
                  placeholder="Instrucciones especiales, condiciones de entrega..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* ── Sección 2: Ítems ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Ítems de la orden</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Descripción</TableHead>
                  <TableHead className="text-right w-[15%]">Cantidad</TableHead>
                  <TableHead className="text-right w-[25%]">Precio unitario</TableHead>
                  <TableHead className="text-right w-[20%]">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item._rowKey}>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        className="w-32 text-right ml-auto"
                        value={item.unit_price}
                        onChange={(e) => updateItemPrice(item._rowKey, e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.unit_price * item.quantity_ordered)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-semibold">Total</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(totalAmount)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* ── Sección 3: Cotización vinculada (opcional) ── */}
          {receivedQuotations.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Cotización vinculada (opcional)</h3>
              <Select value={quotationId} onValueChange={setQuotationId}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Sin cotización vinculada" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="">Sin cotización</SelectItem>
                  {receivedQuotations.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.supplier_name ?? 'Proveedor'} —{' '}
                      {q.total_amount != null
                        ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: q.currency }).format(q.total_amount)
                        : 'Monto no especificado'}
                      {q.quote_reference && ` (Ref: ${q.quote_reference})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); resetForm() }}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!supplierId || createPO.isPending}
          >
            {createPO.isPending ? 'Creando OC...' : 'Crear Orden de Compra'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
