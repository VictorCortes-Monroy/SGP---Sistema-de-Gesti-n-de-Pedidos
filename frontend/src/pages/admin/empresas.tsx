import { useState } from 'react'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { useCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany } from '@/hooks/use-organizations'
import type { CompanyResponse } from '@/api/types'

export default function EmpresasPage() {
  const { data, isLoading } = useCompanies()
  const { mutate: createCompany, isPending: creating } = useCreateCompany()
  const { mutate: updateCompany, isPending: updating } = useUpdateCompany()
  const { mutate: deleteCompany, isPending: deleting } = useDeleteCompany()

  const [createOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState<CompanyResponse | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', tax_id: '' })

  const openCreate = () => {
    setForm({ name: '', tax_id: '' })
    setCreateOpen(true)
  }

  const openEdit = (c: CompanyResponse) => {
    setForm({ name: c.name, tax_id: c.tax_id ?? '' })
    setEditItem(c)
  }

  const handleCreate = () => {
    if (!form.name) { toast.error('El nombre es obligatorio'); return }
    createCompany({ name: form.name, tax_id: form.tax_id || undefined }, {
      onSuccess: () => {
        toast.success('Empresa creada')
        setCreateOpen(false)
      },
      onError: (e: unknown) => {
        const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        toast.error(msg ?? 'Error al crear empresa')
      },
    })
  }

  const handleUpdate = () => {
    if (!editItem) return
    updateCompany({ id: editItem.id, payload: { name: form.name, tax_id: form.tax_id || undefined } }, {
      onSuccess: () => {
        toast.success('Empresa actualizada')
        setEditItem(null)
      },
      onError: () => toast.error('Error al actualizar empresa'),
    })
  }

  const handleDelete = () => {
    if (!deleteId) return
    deleteCompany(deleteId, {
      onSuccess: () => {
        toast.success('Empresa eliminada')
        setDeleteId(null)
      },
      onError: () => toast.error('Error al eliminar empresa'),
    })
  }

  const FormFields = () => (
    <div className="space-y-4 py-2">
      <div>
        <Label>Nombre *</Label>
        <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      </div>
      <div>
        <Label>RUT / Tax ID</Label>
        <Input value={form.tax_id} onChange={(e) => setForm((f) => ({ ...f, tax_id: e.target.value }))} placeholder="76.123.456-7" />
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Empresas" description="Gestión de empresas del sistema" />
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Empresa
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>RUT / Tax ID</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.tax_id ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva Empresa</DialogTitle></DialogHeader>
          <FormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(open: boolean) => { if (!open) setEditItem(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Empresa</DialogTitle></DialogHeader>
          <FormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={updating}>
              {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open: boolean) => { if (!open) setDeleteId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar empresa?</DialogTitle>
            <DialogDescription>
              Esta acción es permanente y puede afectar centros de costo asociados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
