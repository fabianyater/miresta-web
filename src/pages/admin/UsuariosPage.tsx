import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Pencil, Trash2 } from 'lucide-react'
import { usersApi } from '@/api/users'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { BackLink } from '@/components/ui/BackLink'
import { toast } from '@/store/toast'
import { getApiErrorMessage } from '@/lib/apiErrors'
import { useAuthStore } from '@/store/auth'
import type { Role, UserResponse } from '@/types'

const roleBadgeVariant: Record<Role, 'busy' | 'pending' | 'neutral'> = {
  OWNER: 'busy',
  ADMIN: 'pending',
  MESERO: 'neutral',
}

export default function UsuariosPage() {
  const queryClient = useQueryClient()
  const currentEmail = useAuthStore((s) => s.user?.email)
  const currentIsOwner = useAuthStore((s) => s.user?.role === 'OWNER')
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('MESERO')

  const [editing, setEditing] = useState<UserResponse | null>(null)
  const [editEmail, setEditEmail] = useState('')
  const [editName, setEditName] = useState('')
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editRole, setEditRole] = useState<Role>('MESERO')

  const [deleting, setDeleting] = useState<UserResponse | null>(null)

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getUsers,
  })

  const createUser = useMutation({
    mutationFn: () =>
      usersApi.createUser({ email, name, displayName: displayName.trim() || undefined, password, role }),
    onSuccess: () => {
      toast.success('Usuario creado')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setOpen(false)
      setEmail('')
      setName('')
      setDisplayName('')
      setPassword('')
      setRole('MESERO')
    },
    onError: (e) => toast.error('No se pudo crear el usuario', { description: getApiErrorMessage(e) }),
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => usersApi.updateUser(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: (e) => toast.error('No se pudo actualizar el usuario', { description: getApiErrorMessage(e) }),
  })

  const editUser = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error('no user selected')
      return usersApi.updateUser(editing.id, {
        email: editEmail,
        name: editName,
        // Se envía tal cual (incluso vacío): el backend lo vuelve a derivar del
        // nombre completo cuando queda en blanco.
        displayName: editDisplayName,
        password: editPassword || undefined,
        role: editing.email.toLowerCase() === currentEmail?.toLowerCase() ? undefined : editRole,
      })
    },
    onSuccess: () => {
      toast.success('Usuario actualizado')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setEditing(null)
    },
    onError: (e) => toast.error('No se pudo actualizar el usuario', { description: getApiErrorMessage(e) }),
  })

  const deleteUser = useMutation({
    mutationFn: () => {
      if (!deleting) throw new Error('no user selected')
      return usersApi.deleteUser(deleting.id)
    },
    onSuccess: () => {
      toast.success('Usuario eliminado')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDeleting(null)
    },
    onError: (e) => {
      toast.error('No se pudo eliminar el usuario', { description: getApiErrorMessage(e) })
      setDeleting(null)
    },
  })

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <BackLink to="/admin" label="Volver a Admin" />
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">Usuarios</h1>
        <Button onClick={() => setOpen(true)}>
          <UserPlus size={16} />
          Nuevo
        </Button>
      </div>

      <div className="space-y-2">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              </div>
              <Skeleton className="h-8 w-24 rounded-lg" />
            </Card>
          ))}
        {!isLoading &&
          users?.map((u) => {
            const isSelf = u.email.toLowerCase() === currentEmail?.toLowerCase()
            // Only the owner can touch another owner's account — everything else
            // (admin managing admins/meseros) stays open, enforced again server-side.
            const canManage = currentIsOwner || u.role !== 'OWNER' || isSelf
            const lockedReason = 'Solo el owner puede modificar o eliminar a otro owner'
            return (
              <Card key={u.id} className="p-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate">
                    {u.name || u.email}
                    {isSelf && <span className="text-neutral-400 font-normal"> (tú)</span>}
                  </p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate">{u.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={roleBadgeVariant[u.role]}>{u.role}</Badge>
                    <Badge variant={u.active ? 'free' : 'done'}>{u.active ? 'Activo' : 'Inactivo'}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => {
                      setEditing(u)
                      setEditEmail(u.email)
                      setEditName(u.name)
                      setEditDisplayName(u.displayName)
                      setEditPassword('')
                      setEditRole(u.role)
                    }}
                    disabled={!canManage}
                    title={canManage ? 'Editar usuario' : lockedReason}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isSelf || !canManage}
                    title={isSelf ? 'No puedes desactivar tu propia cuenta' : !canManage ? lockedReason : undefined}
                    onClick={() => toggleActive.mutate({ id: u.id, active: !u.active })}
                  >
                    {u.active ? 'Desactivar' : 'Activar'}
                  </Button>
                  <button
                    onClick={() => setDeleting(u)}
                    disabled={isSelf || !canManage}
                    title={isSelf ? 'No puedes eliminar tu propia cuenta' : !canManage ? lockedReason : 'Eliminar usuario'}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            )
          })}
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title="Nuevo usuario">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (email && password && name.trim()) createUser.mutate()
          }}
        >
          <Input
            placeholder="Nombre completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <Input
            placeholder="Nombre corto para la comanda (opcional)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <Input
            type="email"
            placeholder="Correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Contraseña inicial"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="MESERO">Mesero</option>
            {currentIsOwner && <option value="ADMIN">Admin</option>}
            {currentIsOwner && <option value="OWNER">Owner</option>}
          </Select>
          {!currentIsOwner && (
            <p className="text-xs text-neutral-400">Solo el owner puede crear usuarios admin.</p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={!email || !password || !name.trim()}
            loading={createUser.isPending}
          >
            Crear usuario
          </Button>
        </form>
      </Dialog>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title="Editar usuario">
        {editing && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (editEmail && editName.trim()) editUser.mutate()
            }}
          >
            <Input
              placeholder="Nombre completo"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
            />
            <Input
              placeholder="Nombre corto para la comanda (opcional)"
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
            />
            <Input
              type="email"
              placeholder="Correo"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Nueva contraseña (opcional)"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
            />
            <Select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as Role)}
              disabled={editing.email.toLowerCase() === currentEmail?.toLowerCase() || !currentIsOwner}
            >
              <option value="MESERO">Mesero</option>
              <option value="ADMIN">Admin</option>
              {(currentIsOwner || editing.role === 'OWNER') && <option value="OWNER">Owner</option>}
            </Select>
            {editing.email.toLowerCase() === currentEmail?.toLowerCase() ? (
              <p className="text-xs text-neutral-400">No puedes cambiar tu propio rol.</p>
            ) : (
              !currentIsOwner && <p className="text-xs text-neutral-400">Solo el owner puede cambiar roles.</p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={!editEmail || !editName.trim()}
              loading={editUser.isPending}
            >
              Guardar
            </Button>
          </form>
        )}
      </Dialog>

      <Dialog open={!!deleting} onClose={() => setDeleting(null)} title="Eliminar usuario">
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
          ¿Eliminar a <strong>{deleting?.email}</strong>? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleting(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => deleteUser.mutate()}
            loading={deleteUser.isPending}
          >
            Eliminar
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
