import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Star, Package, ShoppingCart, Mail, Phone, MapPin, Clock } from 'lucide-react'
import { useSupplier } from '@/hooks/use-catalog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/format'

const CATEGORY_LABELS: Record<string, string> = {
  INSUMOS: 'Insumos', ACTIVOS_FIJOS: 'Activos Fijos', SERVICIOS: 'Servicios', MIXTO: 'Mixto',
}

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: supplier, isLoading } = useSupplier(id!)

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Cargando...</p>
  if (!supplier) return <p className="p-6 text-sm text-muted-foreground">Proveedor no encontrado</p>

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="icon"><Link to="/proveedores"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{supplier.name}</h1>
            {supplier.rut && <span className="text-sm text-muted-foreground">{supplier.rut}</span>}
            <Badge variant="outline">{CATEGORY_LABELS[supplier.category] ?? supplier.category}</Badge>
            {!supplier.is_active && <Badge variant="destructive">Inactivo</Badge>}
          </div>
          {supplier.rating && (
            <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              {Number(supplier.rating).toFixed(1)} / 5.0
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{formatCurrency(supplier.total_spend ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Gasto total histórico</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{supplier.purchase_count ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Órdenes de compra</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{supplier.products.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Productos en catálogo</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Productos */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" />Productos</CardTitle></CardHeader>
            <CardContent>
              {supplier.products.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin productos vinculados</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>SKU Proveedor</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Entrega</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplier.products.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Link to={`/insumos/${p.catalog_item_id}`} className="text-primary hover:underline text-sm font-medium">
                            {p.catalog_item_name}
                          </Link>
                          {p.is_preferred && <Badge className="ml-2 text-xs h-4">Preferido</Badge>}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{p.supplier_sku ?? '-'}</TableCell>
                        <TableCell className="text-right text-sm">{p.unit_price ? formatCurrency(p.unit_price) : '-'}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">{p.lead_time_days ? `${p.lead_time_days}d` : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info de contacto */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Contacto</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {supplier.contact_name && <p className="font-medium">{supplier.contact_name}</p>}
              {supplier.contact_email && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />{supplier.contact_email}
                </p>
              )}
              {supplier.contact_phone && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />{supplier.contact_phone}
                </p>
              )}
              {supplier.address && (
                <p className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />{supplier.address}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Condiciones</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plazo de pago</span>
                <span className="font-medium">{supplier.payment_terms_days ? `${supplier.payment_terms_days} días` : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entrega promedio</span>
                <span className="font-medium">{supplier.delivery_days ? `${supplier.delivery_days} días` : '-'}</span>
              </div>
              {supplier.notes && (
                <>
                  <Separator />
                  <p className="text-muted-foreground">{supplier.notes}</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
