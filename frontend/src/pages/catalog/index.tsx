import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Package, Filter } from 'lucide-react'
import { useCatalogItems } from '@/hooks/use-catalog'
import { useAuthStore } from '@/stores/auth-store'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/format'
import type { CatalogItem } from '@/api/types'

const CATEGORY_LABELS: Record<string, string> = {
  INSUMOS: 'Insumos',
  ACTIVOS_FIJOS: 'Activos Fijos',
  SERVICIOS: 'Servicios',
}

const CATEGORY_COLORS: Record<string, string> = {
  INSUMOS: 'bg-blue-100 text-blue-800',
  ACTIVOS_FIJOS: 'bg-purple-100 text-purple-800',
  SERVICIOS: 'bg-green-100 text-green-800',
}

export default function CatalogPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role_name === 'Admin'

  const { data: items = [], isLoading } = useCatalogItems({
    search: search || undefined,
    category: category !== 'all' ? category : undefined,
    is_active: true,
    limit: 200,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catálogo de Insumos"
        description="Productos y servicios disponibles para solicitudes de compra"
      >
        {isAdmin && (
          <Button asChild>
            <Link to="/insumos/nuevo"><Plus className="mr-2 h-4 w-4" />Nuevo Producto</Link>
          </Button>
        )}
      </PageHeader>

      {/* Filtros */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o SKU..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="INSUMOS">Insumos</SelectItem>
            <SelectItem value="ACTIVOS_FIJOS">Activos Fijos</SelectItem>
            <SelectItem value="SERVICIOS">Servicios</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Cargando catálogo...</p>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No hay productos en el catálogo</p>
              {isAdmin && (
                <Button asChild variant="link" className="mt-2">
                  <Link to="/insumos/nuevo">Agregar el primero</Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead className="text-right">Precio Ref.</TableHead>
                  <TableHead>Proveedor Preferido</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[item.category] ?? ''}`}>
                        {CATEGORY_LABELS[item.category] ?? item.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.unit_of_measure}</TableCell>
                    <TableCell className="text-right text-sm">
                      {item.reference_price ? formatCurrency(item.reference_price) : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.preferred_supplier_name ?? '-'}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/insumos/${item.id}`}>Ver</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
