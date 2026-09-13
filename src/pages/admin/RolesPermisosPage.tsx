import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, Shield } from 'lucide-react'
import { permissionsApi } from '@/api/permissions'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { BackLink } from '@/components/ui/BackLink'
import { toast } from '@/store/toast'
import { getApiErrorMessage } from '@/lib/apiErrors'
import type { Permission, RolePermissionsResponse } from '@/types'

type EditableRole = 'ADMIN' | 'MESERO'
const EDITABLE_ROLES: EditableRole[] = ['ADMIN', 'MESERO']
const ROLE_LABELS: Record<EditableRole, string> = { ADMIN: 'Admin', MESERO: 'Mesero' }

export default function RolesPermisosPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: permissionsApi.getMatrix,
  })

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <BackLink to="/admin" label="Volver a Admin" />
      <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight mb-1">
        Roles y permisos
      </h1>
      <p className="text-sm text-neutral-500 mb-5">
        Owner siempre tiene acceso total. Marca qué puede hacer cada rol — los cambios aplican de inmediato.
      </p>

      {isLoading || !data ? (
        <Card className="p-4 space-y-3">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </Card>
      ) : (
        <PermissionMatrix data={data} />
      )}
    </div>
  )
}

function PermissionMatrix({ data }: { data: RolePermissionsResponse }) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<Record<EditableRole, Set<Permission>>>({
    ADMIN: new Set(data.rolePermissions.ADMIN ?? []),
    MESERO: new Set(data.rolePermissions.MESERO ?? []),
  })

  // Si otro admin guardó cambios mientras esta pantalla estaba abierta, al refrescar
  // el query se vuelve a sincronizar el borrador con lo que quedó en el servidor.
  useEffect(() => {
    setDraft({
      ADMIN: new Set(data.rolePermissions.ADMIN ?? []),
      MESERO: new Set(data.rolePermissions.MESERO ?? []),
    })
  }, [data])

  const save = useMutation({
    mutationFn: () =>
      Promise.all(
        EDITABLE_ROLES.map((role) =>
          permissionsApi.updateRolePermissions(role, Array.from(draft[role])),
        ),
      ),
    onSuccess: () => {
      toast.success('Permisos actualizados')
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] })
    },
    onError: (e) => toast.error('No se pudo guardar', { description: getApiErrorMessage(e) }),
  })

  function toggle(role: EditableRole, permission: Permission) {
    setDraft((prev) => {
      const next = new Set(prev[role])
      if (next.has(permission)) next.delete(permission)
      else next.add(permission)
      return { ...prev, [role]: next }
    })
  }

  const domains = Array.from(new Set(data.catalog.map((p) => p.domain)))

  return (
    <div className="space-y-4">
      <Card className="divide-y divide-neutral-100 dark:divide-neutral-700">
        <div className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-neutral-400 uppercase tracking-wide">
          <span className="flex-1">Acción</span>
          <span className="w-16 text-center flex items-center justify-center gap-1">
            <Shield size={12} /> Owner
          </span>
          {EDITABLE_ROLES.map((role) => (
            <span key={role} className="w-16 text-center">
              {ROLE_LABELS[role]}
            </span>
          ))}
        </div>

        {domains.map((domain) => (
          <div key={domain}>
            <p className="px-4 pt-3 pb-1 text-xs font-bold text-neutral-500 dark:text-neutral-400">{domain}</p>
            {data.catalog
              .filter((p) => p.domain === domain)
              .map((permission) => (
                <div key={permission.code} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="flex-1 text-sm text-neutral-700 dark:text-neutral-200">
                    {permission.description}
                  </span>
                  <span className="w-16 flex justify-center">
                    <input type="checkbox" checked disabled className="w-4 h-4 accent-neutral-400" />
                  </span>
                  {EDITABLE_ROLES.map((role) => (
                    <span key={role} className="w-16 flex justify-center">
                      <input
                        type="checkbox"
                        checked={draft[role].has(permission.code)}
                        onChange={() => toggle(role, permission.code)}
                        className="w-4 h-4 accent-brand-500"
                      />
                    </span>
                  ))}
                </div>
              ))}
          </div>
        ))}
      </Card>

      <Button className="w-full" onClick={() => save.mutate()} loading={save.isPending}>
        <Save size={16} />
        Guardar cambios
      </Button>
    </div>
  )
}
