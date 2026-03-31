import { useState } from 'react'
import { Plus, Trash2, Loader2, Info } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useApprovalRules, useCreateApprovalRule, useDeleteApprovalRule } from '@/hooks/use-admin'
import { useCompanies, useCostCenters } from '@/hooks/use-organizations'
import { useRoles } from '@/hooks/use-admin'
import type { ApprovalMatrixCreate } from '@/api/types'
import { formatCurrency } from '@/lib/format'

export default function MatrizAprobacionPage() {
  const { data: companies } = useCompanies()
  const { data: roles } = useRoles()

  const [filterCompanyId, setFilterCompanyId] = useState<string | undefined>()
  const [filterCCId, setFilterCCId] = useState<string | undefined>()
  const { data: costCenters } = useCostCenters(filterCompanyId)

  const { data, isLoading } = useApprovalRules(filterCompanyId, filterCCId)
  const { mutate: createRule, isPending: creating } = useCreateApprovalRule()
  const { mutate: deleteRule, isPending: deleting } = useDeleteApprovalRule()

  const [createOpen, setCreateOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [form, setForm] = useState<Partial<ApprovalMatrixCreate>>({ step_order: 1 })
  const [formCCCompanyId, setFormCCCompanyId] = useState<string | undefined>()
  const { data: formCostCenters } = useCostCenters(formCCCompanyId)

  const openCreate = () => {
    setForm({ step_order: 1 })
    setFormCCCompanyId(undefined)
    setCreateOpen(true)
  }

  const handleCreate = () => {
    if (!form.company_id || !form.role_id || form.min_amount === undefined || !form.step_order) {
      toast.error('Completa los campos obligatorios')
      return
    }
    createRule(form as ApprovalMatrixCreate, {
      onSuccess: () => {
        toast.success('Regla creada')
        setCreateOpen(false)
      },
      onError: (e: unknown) => {
        const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        toast.error(msg ?? 'Error al crear regla')
      },
    })
  }

  const handleDelete = () => {
    if (!deleteId) return
    deleteRule(deleteId, {
      onSuccess: () => {
        toast.success('Regla eliminada')
        setDeleteId(null)
      },
      onError: () => toast.error('Error al eliminar regla'),
    })
  }

  const companyName = (id: string) => companies?.items.find((c) => c.id === id)?.name ?? '—'
  const ccName = (id: string | null) => {
    if (!id) return 'Todos'
    // Search across all cost centers in response items
    return data?.items.find((r) => r.cost_center_id === id) ? id : id
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Matriz de Aprobación" description="Reglas de enrutamiento para solicitudes" />
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Regla
        </Button>
      </div>

      {/* Info banner */}
      <div className="flex gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          Cada regla define quién aprueba una solicitud según la empresa, centro de costo y monto.
          El <strong>Paso</strong> indica el orden de aprobación (1 = técnico, 2 = financiero).
        </span>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="w-56">
          <Select value={filterCompanyId ?? 'all'} onValueChange={(v) => { setFilterCompanyId(v === 'all' ? undefined : v); setFilterCCId(undefined) }}>
            <SelectTrigger><SelectValue placeholder="Empresa..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las empresas</SelectItem>
              {companies?.items.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {filterCompanyId && (
          <div className="w-56">
            <Select value={filterCCId ?? 'all'} onValueChange={(v) => setFilterCCId(v === 'all' ? undefined : v)}>
              <SelectTrigger><SelectValue placeholder="Centro de costo..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los centros</SelectItem>
                {costCenters?.items.map((cc) => (
                  <SelectItem key={cc.id} value={cc.id}>{cc.code} — {cc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paso</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>C. Costo</TableHead>
                <TableHead>Monto Mín.</TableHead>
                <TableHead>Monto Máx.</TableHead>
                <TableHead>Rol Aprobador</TableHead>
                <TableHead className="w-14"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Badge variant="outline">Paso {r.step_order}</Badge>
                  </TableCell>
                  <TableCell>{companyName(r.company_id)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{ccName(r.cost_center_id)}</TableCell>
                  <TableCell>{formatCurrency(r.min_amount)}</TableCell>
                  <TableCell>{r.max_amount != null ? formatCurrency(r.max_amount) : '∞'}</TableCell>
                  <TableCell>
                    <Badge>{r.role_name ?? r.role_id}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No hay reglas configuradas para este filtro
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nueva Regla de Aprobación</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Empresa *</Label>
              <Select
                value={form.company_id ?? ''}
                onValueChange={(v) => {
                  setForm((f) => ({ ...f, company_id: v, cost_center_id: undefined }))
                  setFormCCCompanyId(v)
                }}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar empresa..." /></SelectTrigger>
                <SelectContent>
                  {companies?.items.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Centro de Costo (opcional)</Label>
              <Select
                value={form.cost_center_id ?? 'none'}
                onValueChange={(v) => setForm((f) => ({ ...f, cost_center_id: v === 'none' ? undefined : v }))}
                disabled={!formCCCompanyId}
              >
                <SelectTrigger><SelectValue placeholder="Aplica a todos..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aplica a todos</SelectItem>
                  {formCostCenters?.items.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>{cc.code} — {cc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Monto Mínimo *</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.min_amount ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, min_amount: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Monto Máximo</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Sin límite"
                  value={form.max_amount ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, max_amount: e.target.value ? Number(e.target.value) : undefined }))}
                />
              </div>
            </div>
            <div>
              <Label>Rol Aprobador *</Label>
              <Select value={form.role_id ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, role_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar rol..." /></SelectTrigger>
                <SelectContent>
                  {roles?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Paso / Orden *</Label>
              <Input
                type="number"
                min={1}
                value={form.step_order ?? 1}
                onChange={(e) => setForm((f) => ({ ...f, step_order: Number(e.target.value) }))}
              />
              <p className="text-xs text-muted-foreground mt-1">1 = primera aprobación, 2 = segunda, etc.</p>
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

      <Dialog open={!!deleteId} onOpenChange={(open: boolean) => { if (!open) setDeleteId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar regla?</DialogTitle>
            <DialogDescription>
              Las solicitudes existentes que usaban esta regla no se ven afectadas, pero las nuevas dejarán de enrutarse por ella.
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
