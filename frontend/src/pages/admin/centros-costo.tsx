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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  useCostCenters, useCompanies,
  useCreateCostCenter, useUpdateCostCenter, useDeleteCostCenter,
} from '@/hooks/use-organizations'
import type { CostCenterResponse } from '@/api/types'

export default function CentrosCostoPage() {
  const { data: companies } = useCompanies()
  const [filterCompanyId, setFilterCompanyId] = useState<string | undefined>()
  const { data, isLoading } = useCostCenters(filterCompanyId)
  const { mutate: createCC, isPending: creating } = useCreateCostCenter()
  const { mutate: updateCC, isPending: updating } = useUpdateCostCenter()
  const { mutate: deleteCC, isPending: deleting } = useDeleteCostCenter()

  const [createOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState<CostCenterResponse | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', code: '', company_id: '' })

  const openCreate = () => {
    setForm({ name: '', code: '', company_id: '' })
    setCreateOpen(true)
  }

  const openEdit = (cc: CostCenterResponse) => {
    setForm({ name: cc.name, code: cc.code, company_id: cc.company_id })
    setEditItem(cc)
  }

  const handleCreate = () => {
    if (!form.name || !form.code || !form.company_id) {
      toast.error('Completa todos los campos obligatorios')
      return
    }
    createCC({ name: form.name, code: form.code, company_id: form.company_id }, {
      onSuccess: () => {
        toast.success('Centro de costo creado')
        setCreateOpen(false)
      },
      onError: (e: unknown) => {
        const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        toast.error(msg ?? 'Error al crear centro de costo')
      },
    })
  }

  const handleUpdate = () => {
    if (!editItem) return
    updateCC({ id: editItem.id, payload: { name: form.name, code: form.code } }, {
      onSuccess: () => {
        toast.success('Centro de costo actualizado')
        setEditItem(null)
      },
      onError: () => toast.error('Error al actualizar'),
    })
  }

  const handleDelete = () => {
    if (!deleteId) return
    deleteCC(deleteId, {
      onSuccess: () => {
        toast.success('Centro de costo eliminado')
        setDeleteId(null)
      },
      onError: () => toast.error('Error al eliminar'),
    })
  }

  const companyName = (id: string) =>
    companies?.items.find((c) => c.id === id)?.name ?? id

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Centros de Costo" description="Gestión de centros de costo por empresa" />
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Centro
        </Button>
      </div>

      {/* Filter by company */}
      <div className="max-w-xs">
        <Select value={filterCompanyId ?? 'all'} onValueChange={(v) => setFilterCompanyId(v === 'all' ? undefined : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por empresa..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las empresas</SelectItem>
            {companies?.items.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((cc) => (
                <TableRow key={cc.id}>
                  <TableCell className="font-mono font-medium">{cc.code}</TableCell>
                  <TableCell>{cc.name}</TableCell>
                  <TableCell>{companyName(cc.company_id)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(cc)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(cc.id)}>
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

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo Centro de Costo</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Empresa *</Label>
              <Select value={form.company_id} onValueChange={(v) => setForm((f) => ({ ...f, company_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar empresa..." /></SelectTrigger>
                <SelectContent>
                  {companies?.items.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Código *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="CC-001"
              />
            </div>
            <div>
              <Label>Nombre *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(open: boolean) => { if (!open) setEditItem(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Centro de Costo</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Código</Label>
              <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
            </div>
            <div>
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
          </div>
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
            <DialogTitle>¿Eliminar centro de costo?</DialogTitle>
            <DialogDescription>Esta acción es permanente.</DialogDescription>
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
