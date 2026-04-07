import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Package, Star, Clock, ShoppingCart } from 'lucide-react'
import { useCatalogItem, useSuppliers, useLinkSupplier } from '@/hooks/use-catalog'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { toast } from 'sonner'

const CATEGORY_LABELS: Record<string, string> = {
  INSUMOS: 'Insumos', ACTIVOS_FIJOS: 'Activos Fijos', SERVICIOS: 'Servicios',
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador', APPROVED: 'Aprobada', COMPLETED: 'Completada',
  REJECTED: 'Rechazada', PURCHASING: 'En Compra',
}

export default function CatalogItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: item, isLoading } = useCatalogItem(id!)
  const { data: allSuppliers = [] } = useSuppliers({ is_active: true, limit: 200 })
  const linkSupplier = useLinkSupplier(id!)
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role_name === 'Admin'

  const [linkForm, setLinkForm] = useState({ supplier_id: '', unit_price: '', lead_time_days: '', supplier_sku: '' })
  const [showLink, setShowLink] = useState(false)

  const handleLinkSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!linkForm.supplier_id) { toast.error('Selecciona un proveedor'); return }
    await linkSupplier.mutateAsync({
      supplier_id: linkForm.supplier_id,
      unit_price: linkForm.unit_price ? Number(linkForm.unit_price) : undefined,
      lead_time_days: linkForm.lead_time_days ? Number(linkForm.lead_time_days) : undefined,
      supplier_sku: linkForm.supplier_sku || undefined,
    })
    toast.success('Proveedor vinculado')
    setShowLink(false)
    setLinkForm({ supplier_id: '', unit_price: '', lead_time_days: '', supplier_sku: '' })
  }

  if (isLoading) return <p className="text-sm text-muted-foreground p-6">Cargando...</p>
  if (!item) return <p className="text-sm text-muted-foreground p-6">Producto no encontrado</p>

  const linkedIds = new Set(item.suppliers.map((s) => s.supplier_id))
  const availableSuppliers = allSuppliers.filter((s) => !linkedIds.has(s.id))

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link to="/insumos"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{item.name}</h1>
            <Badge variant="outline">{item.sku}</Badge>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
              {CATEGORY_LABELS[item.category] ?? item.category}
            </span>
          </div>
          {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Info principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Atributos */}
          <Card>
            <CardHeader><CardTitle className="text-base">Información</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-muted-foreground">Unidad</dt><dd className="font-medium">{item.unit_of_measure}</dd></div>
                <div><dt className="text-muted-foreground">Precio Referencial</dt><dd className="font-medium">{item.reference_price ? formatCurrency(item.reference_price) : '—'}</dd></div>
                <div><dt className="text-muted-foreground">Moneda</dt><dd className="font-medium">{item.currency}</dd></div>
                <div><dt className="text-muted-foreground">Proveedor Preferido</dt><dd className="font-medium">{item.preferred_supplier_name ?? '—'}</dd></div>
              </dl>
              {item.technical_specs && Object.keys(item.technical_specs).length > 0 && (
                <>
                  <Separator className="my-4" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Especificaciones</p>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(item.technical_specs).map(([k, v]) => (
                      <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{String(v)}</dd></div>
                    ))}
                  </dl>
                </>
              )}
            </CardContent>
          </Card>

          {/* Historial de compras */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="h-4 w-4" />Historial de Compras</CardTitle></CardHeader>
            <CardContent>
              {item.purchase_history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin compras registradas</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Solicitud</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {item.purchase_history.map((h) => (
                      <TableRow key={h.request_id}>
                        <TableCell>
                          <Link to={`/solicitudes/${h.request_id}`} className="text-primary hover:underline text-sm">{h.request_title}</Link>
                        </TableCell>
                        <TableCell className="text-right">{Number(h.quantity)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(h.unit_price)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(h.total_price)}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{STATUS_LABELS[h.status] ?? h.status}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDateTime(h.purchased_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Proveedores */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Proveedores</CardTitle>
                {isAdmin && availableSuppliers.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => setShowLink(!showLink)}>
                    {showLink ? 'Cancelar' : '+ Vincular'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {showLink && (
                <form onSubmit={handleLinkSupplier} className="space-y-2 p-3 border rounded-md bg-muted/30">
                  <Label className="text-xs">Proveedor</Label>
                  <Select value={linkForm.supplier_id} onValueChange={(v) => setLinkForm((f) => ({ ...f, supplier_id: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {availableSuppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Precio</Label><Input className="h-8 text-sm" type="number" placeholder="0" value={linkForm.unit_price} onChange={(e) => setLinkForm((f) => ({ ...f, unit_price: e.target.value }))} /></div>
                    <div><Label className="text-xs">Días entrega</Label><Input className="h-8 text-sm" type="number" placeholder="0" value={linkForm.lead_time_days} onChange={(e) => setLinkForm((f) => ({ ...f, lead_time_days: e.target.value }))} /></div>
                  </div>
                  <Button type="submit" size="sm" className="w-full" disabled={linkSupplier.isPending}>Guardar</Button>
                </form>
              )}
              {item.suppliers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin proveedores vinculados</p>
              ) : (
                item.suppliers.map((sp) => (
                  <div key={sp.id} className="text-sm border rounded-md p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{sp.supplier_name}</span>
                      {sp.is_preferred && <Badge className="text-xs h-5">Preferido</Badge>}
                    </div>
                    {sp.unit_price && <p className="text-muted-foreground">{formatCurrency(sp.unit_price)} / {item.unit_of_measure}</p>}
                    {sp.lead_time_days && (
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />{sp.lead_time_days}d entrega
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
