import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Building2, Star } from 'lucide-react'
import { useSuppliers, useSupplierSpendStats } from '@/hooks/use-catalog'
import { useAuthStore } from '@/stores/auth-store'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/format'

const CATEGORY_LABELS: Record<string, string> = {
  INSUMOS: 'Insumos', ACTIVOS_FIJOS: 'Activos Fijos', SERVICIOS: 'Servicios', MIXTO: 'Mixto',
}

export default function SuppliersPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role_name === 'Admin'

  const { data: suppliers = [], isLoading } = useSuppliers({
    search: search || undefined,
    category: category !== 'all' ? category : undefined,
    is_active: true,
    limit: 200,
  })
  const { data: spendStats = [] } = useSupplierSpendStats()
  const spendMap = Object.fromEntries(spendStats.map((s) => [s.supplier_id, s]))

  return (
    <div className="space-y-6">
      <PageHeader title="Proveedores" description="Gestión de proveedores comerciales">
        {isAdmin && (
          <Button asChild>
            <Link to="/proveedores/nuevo"><Plus className="mr-2 h-4 w-4" />Nuevo Proveedor</Link>
          </Button>
        )}
      </PageHeader>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar proveedor..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="INSUMOS">Insumos</SelectItem>
            <SelectItem value="ACTIVOS_FIJOS">Activos Fijos</SelectItem>
            <SelectItem value="SERVICIOS">Servicios</SelectItem>
            <SelectItem value="MIXTO">Mixto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Cargando...</p>
          ) : suppliers.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No hay proveedores registrados</p>
              {isAdmin && (
                <Button asChild variant="link" className="mt-2"><Link to="/proveedores/nuevo">Agregar el primero</Link></Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>RUT</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead className="text-right">Plazo Pago</TableHead>
                  <TableHead className="text-right">Gasto Total</TableHead>
                  <TableHead>Calificación</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((s) => {
                  const stats = spendMap[s.id]
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.rut ?? '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[s.category] ?? s.category}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.contact_name ?? '-'}</TableCell>
                      <TableCell className="text-right text-sm">{s.payment_terms_days ? `${s.payment_terms_days}d` : '-'}</TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {stats?.total_spend ? formatCurrency(stats.total_spend) : '-'}
                      </TableCell>
                      <TableCell>
                        {s.rating ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {Number(s.rating).toFixed(1)}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm"><Link to={`/proveedores/${s.id}`}>Ver</Link></Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
