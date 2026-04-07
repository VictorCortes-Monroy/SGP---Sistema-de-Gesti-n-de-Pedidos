import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useCreateCatalogItem, useSuppliers } from '@/hooks/use-catalog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

const UNITS = ['UN', 'KG', 'LT', 'MT', 'HR', 'GL', 'M2', 'M3', 'TN', 'PZ']

export default function NewCatalogItemPage() {
  const navigate = useNavigate()
  const createItem = useCreateCatalogItem()
  const { data: suppliers = [] } = useSuppliers({ is_active: true, limit: 200 })

  const [form, setForm] = useState({
    sku: '', name: '', description: '', category: 'INSUMOS',
    unit_of_measure: 'UN', reference_price: '', currency: 'CLP',
    preferred_supplier_id: '',
  })
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>([])

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const addSpec = () => setSpecs((s) => [...s, { key: '', value: '' }])
  const setSpec = (i: number, k: 'key' | 'value', v: string) =>
    setSpecs((s) => s.map((sp, idx) => (idx === i ? { ...sp, [k]: v } : sp)))
  const removeSpec = (i: number) => setSpecs((s) => s.filter((_, idx) => idx !== i))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.sku || !form.name || !form.category) {
      toast.error('SKU, nombre y categoría son obligatorios')
      return
    }
    const technical_specs = specs.filter((s) => s.key).reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {})
    await createItem.mutateAsync({
      ...form,
      reference_price: form.reference_price ? Number(form.reference_price) : undefined,
      preferred_supplier_id: (form.preferred_supplier_id && form.preferred_supplier_id !== 'none') ? form.preferred_supplier_id : undefined,
      technical_specs: Object.keys(technical_specs).length ? technical_specs : undefined,
    } as any)
    toast.success('Producto creado')
    navigate('/insumos')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link to="/insumos"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">Nuevo Producto</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Identificación</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>SKU Interno *</Label>
              <Input placeholder="ej: INS-001" value={form.sku} onChange={(e) => set('sku', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Categoría *</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INSUMOS">Insumos / Materiales</SelectItem>
                  <SelectItem value="ACTIVOS_FIJOS">Activos Fijos</SelectItem>
                  <SelectItem value="SERVICIOS">Servicios</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Nombre *</Label>
              <Input placeholder="Nombre del producto o servicio" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Descripción</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Precio y Unidad</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Unidad de Medida</Label>
              <Select value={form.unit_of_measure} onValueChange={(v) => set('unit_of_measure', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Precio Referencial</Label>
              <Input type="number" min={0} placeholder="0" value={form.reference_price} onChange={(e) => set('reference_price', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Select value={form.currency} onValueChange={(v) => set('currency', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLP">CLP</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3 space-y-1.5">
              <Label>Proveedor Preferido</Label>
              <Select value={form.preferred_supplier_id} onValueChange={(v) => set('preferred_supplier_id', v)}>
                <SelectTrigger><SelectValue placeholder="Sin proveedor preferido" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin proveedor preferido</SelectItem>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Especificaciones Técnicas</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addSpec}>+ Agregar</Button>
            </div>
          </CardHeader>
          {specs.length > 0 && (
            <CardContent className="space-y-2">
              {specs.map((sp, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder="Atributo (ej: Marca)" value={sp.key} onChange={(e) => setSpec(i, 'key', e.target.value)} />
                  <Input placeholder="Valor (ej: CAT)" value={sp.value} onChange={(e) => setSpec(i, 'value', e.target.value)} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeSpec(i)}>✕</Button>
                </div>
              ))}
            </CardContent>
          )}
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" asChild><Link to="/insumos">Cancelar</Link></Button>
          <Button type="submit" disabled={createItem.isPending}>Crear Producto</Button>
        </div>
      </form>
    </div>
  )
}
