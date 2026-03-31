import { useState } from 'react'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
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
import { useUsers, useRoles, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/use-admin'
import type { UserResponse, UserCreate, UserUpdate } from '@/api/types'

export default function UsuariosPage() {
  const { data, isLoading } = useUsers(0, 100)
  const { data: roles } = useRoles()
  const { mutate: createUser, isPending: creating } = useCreateUser()
  const { mutate: updateUser, isPending: updating } = useUpdateUser()
  const { mutate: deleteUser, isPending: deleting } = useDeleteUser()

  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserResponse | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [form, setForm] = useState<Partial<UserCreate & UserUpdate>>({})

  const set = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }))

  const openCreate = () => {
    setForm({})
    setCreateOpen(true)
  }

  const openEdit = (u: UserResponse) => {
    setForm({ email: u.email, full_name: u.full_name ?? '', role_id: u.role_id, is_active: u.is_active })
    setEditUser(u)
  }

  const handleCreate = () => {
    if (!form.email || !form.full_name || !form.password || !form.role_id) {
      toast.error('Completa todos los campos obligatorios')
      return
    }
    createUser(form as UserCreate, {
      onSuccess: () => {
        toast.success('Usuario creado')
        setCreateOpen(false)
      },
      onError: (e: unknown) => {
        const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        toast.error(msg ?? 'Error al crear usuario')
      },
    })
  }

  const handleUpdate = () => {
    if (!editUser) return
    const payload: UserUpdate = {}
    if (form.email) payload.email = form.email
    if (form.full_name !== undefined) payload.full_name = form.full_name
    if (form.password) payload.password = form.password
    if (form.role_id) payload.role_id = form.role_id
    if (form.is_active !== undefined) payload.is_active = form.is_active
    updateUser({ id: editUser.id, payload }, {
      onSuccess: () => {
        toast.success('Usuario actualizado')
        setEditUser(null)
      },
      onError: () => toast.error('Error al actualizar usuario'),
    })
  }

  const handleDelete = () => {
    if (!deleteId) return
    deleteUser(deleteId, {
      onSuccess: () => {
        toast.success('Usuario eliminado')
        setDeleteId(null)
      },
      onError: () => toast.error('Error al eliminar usuario'),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Usuarios" description="Gestión de cuentas y roles" />
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
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
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name ?? '—'}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{u.role_name ?? '—'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.is_active ? 'default' : 'secondary'}>
                      {u.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(u.id)}>
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
          <DialogHeader>
            <DialogTitle>Nuevo Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nombre completo *</Label>
              <Input value={form.full_name ?? ''} onChange={(e) => set('full_name', e.target.value)} />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div>
              <Label>Contraseña *</Label>
              <Input type="password" value={form.password ?? ''} onChange={(e) => set('password', e.target.value)} />
            </div>
            <div>
              <Label>Rol *</Label>
              <Select value={form.role_id ?? ''} onValueChange={(v) => set('role_id', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar rol..." /></SelectTrigger>
                <SelectContent>
                  {roles?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
      <Dialog open={!!editUser} onOpenChange={(open: boolean) => { if (!open) setEditUser(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nombre completo</Label>
              <Input value={form.full_name ?? ''} onChange={(e) => set('full_name', e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div>
              <Label>Nueva contraseña (dejar vacío para no cambiar)</Label>
              <Input type="password" value={form.password ?? ''} onChange={(e) => set('password', e.target.value)} />
            </div>
            <div>
              <Label>Rol</Label>
              <Select value={form.role_id ?? ''} onValueChange={(v) => set('role_id', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar rol..." /></SelectTrigger>
                <SelectContent>
                  {roles?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estado</Label>
              <Select
                value={form.is_active ? 'true' : 'false'}
                onValueChange={(v) => set('is_active', v === 'true')}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Activo</SelectItem>
                  <SelectItem value="false">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={updating}>
              {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(open: boolean) => { if (!open) setDeleteId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar usuario?</DialogTitle>
            <DialogDescription>
              Esta acción desactiva la cuenta. El usuario no podrá iniciar sesión.
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
