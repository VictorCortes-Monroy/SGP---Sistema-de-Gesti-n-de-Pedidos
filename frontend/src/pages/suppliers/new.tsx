import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useCreateSupplier } from '@/hooks/use-catalog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

export default function NewSupplierPage() {
  const navigate = useNavigate()
  const createSupplier = useCreateSupplier()

  const [form, setForm] = useState({
    name: '', rut: '', contact_name: '', contact_email: '', contact_phone: '',
    address: '', category: 'MIXTO', payment_terms_days: '30', delivery_days: '',
    rating: '', notes: '',
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) { toast.error('El nombre es obligatorio'); return }
    await createSupplier.mutateAsync({
      ...form,
      payment_terms_days: form.payment_terms_days ? Number(form.payment_terms_days) : undefined,
      delivery_days: form.delivery_days ? Number(form.delivery_days) : undefined,
      rating: form.rating ? Number(form.rating) : undefined,
      rut: form.rut || undefined,
    } as any)
    toast.success('Proveedor creado')
    navigate('/proveedores')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon"><Link to="/proveedores"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <h1 className="text-2xl font-bold">Nuevo Proveedor</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Información General</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Nombre *</Label>
              <Input placeholder="Razón social" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>RUT</Label>
              <Input placeholder="12.345.678-9" value={form.rut} onChange={(e) => set('rut', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MIXTO">Mixto</SelectItem>
                  <SelectItem value="INSUMOS">Insumos</SelectItem>
                  <SelectItem value="ACTIVOS_FIJOS">Activos Fijos</SelectItem>
                  <SelectItem value="SERVICIOS">Servicios</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Dirección</Label>
              <Input placeholder="Dirección comercial" value={form.address} onChange={(e) => set('address', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Contacto</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Nombre de contacto</Label>
              <Input value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Condiciones Comerciales</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Plazo de Pago (días)</Label>
              <Input type="number" min={0} value={form.payment_terms_days} onChange={(e) => set('payment_terms_days', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Días de Entrega</Label>
              <Input type="number" min={0} value={form.delivery_days} onChange={(e) => set('delivery_days', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Calificación (1-5)</Label>
              <Input type="number" min={1} max={5} step={0.1} value={form.rating} onChange={(e) => set('rating', e.target.value)} />
            </div>
            <div className="col-span-3 space-y-1.5">
              <Label>Notas</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" asChild><Link to="/proveedores">Cancelar</Link></Button>
          <Button type="submit" disabled={createSupplier.isPending}>Crear Proveedor</Button>
        </div>
      </form>
    </div>
  )
}
