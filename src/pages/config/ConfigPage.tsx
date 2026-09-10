import { LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { PaletteToggle } from '@/components/ui/PaletteToggle'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function ConfigPage() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight mb-5">
        Ajustes
      </h1>

      <Card className="p-4 mb-4">
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">Tema</p>
        <ThemeToggle />
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mt-4 mb-2">Color</p>
        <PaletteToggle />
      </Card>

      <Card className="p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate">
            {user?.displayName || user?.name || '—'}
          </p>
          <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
        </div>
        <Button variant="secondary" onClick={logout}>
          <LogOut size={16} />
          Cerrar sesión
        </Button>
      </Card>
    </div>
  )
}
