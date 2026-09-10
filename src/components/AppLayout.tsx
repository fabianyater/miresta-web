import { NavLink, Outlet } from 'react-router-dom'
import {
  UtensilsCrossed,
  ClipboardList,
  Users,
  Settings,
  LogOut,
  ChefHat,
  Tag,
  Package,
  CalendarDays,
  BarChart3,
  Printer,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { ThemeToggle, ThemeToggleIcon } from '@/components/ui/ThemeToggle'
import { PaletteToggle } from '@/components/ui/PaletteToggle'
import { cn } from '@/lib/utils'
import { isAdminRole } from '@/lib/roles'
import { KitchenComposer } from '@/components/KitchenComposer'

const operationalNav = [
  { to: '/mesas', label: 'Mesas', icon: UtensilsCrossed },
  { to: '/pedidos', label: 'Pedidos', icon: ClipboardList },
  { to: '/clientes', label: 'Clientes', icon: Users },
]

const adminNav = [
  { to: '/admin', label: 'Admin', icon: Settings, end: true },
]

const desktopAdminNav = [
  { to: '/admin/usuarios', label: 'Usuarios', icon: Users },
  { to: '/admin/precios', label: 'Precios', icon: Tag },
  { to: '/admin/catalogo', label: 'Catálogo', icon: Package },
  { to: '/admin/menu', label: 'Menú del día', icon: CalendarDays },
  { to: '/admin/reportes', label: 'Reportes', icon: BarChart3 },
  { to: '/admin/impresora', label: 'Impresora', icon: Printer },
]

export default function AppLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const isAdmin = isAdminRole(user?.role)

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutral-50 dark:bg-neutral-900">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-neutral-200 md:dark:border-neutral-800 md:bg-white md:dark:bg-neutral-800 md:h-screen md:sticky md:top-0">
        <div className="flex items-center gap-2 px-5 h-16 border-b border-neutral-100 dark:border-neutral-700">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <ChefHat size={17} className="text-white" />
          </div>
          <span className="font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">Miresta</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <div className="mb-2">
            <KitchenComposer variant="sidebar" />
          </div>
          {operationalNav.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}

          {isAdmin && (
            <>
              <p className="px-3 pt-5 pb-1.5 text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                Administración
              </p>
              {desktopAdminNav.map((item) => (
                <SidebarLink key={item.to} {...item} />
              ))}
            </>
          )}
        </nav>

        <div className="p-3 border-t border-neutral-100 dark:border-neutral-700 space-y-3">
          <ThemeToggle />
          <PaletteToggle />
          <div>
            <p className="px-3 text-xs text-neutral-400 dark:text-neutral-500 truncate mb-1">
              {user?.displayName || user?.email}
            </p>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between h-14 px-4 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
            <ChefHat size={15} className="text-white" />
          </div>
          <span className="font-bold text-neutral-900 dark:text-neutral-50 tracking-tight text-sm">Miresta</span>
        </div>
        <div className="flex items-center gap-2.5">
          <KitchenComposer variant="header" />
          <PaletteToggle />
          <ThemeToggleIcon />
          <button onClick={logout} className="text-neutral-400 dark:text-neutral-500 p-2 -mr-2">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-0 min-w-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 min-h-16 bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 flex safe-area-bottom">
        {[...operationalNav, ...(isAdmin ? adminNav : [])].map((item) => (
          <BottomNavLink key={item.to} {...item} />
        ))}
      </nav>
    </div>
  )
}

function SidebarLink({ to, label, icon: Icon }: { to: string; label: string; icon?: React.ComponentType<{ size?: number }> }) {
  return (
    <NavLink
      to={to}
      end={to === '/mesas'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-400'
            : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700',
        )
      }
    >
      {Icon && <Icon size={17} />}
      {label}
    </NavLink>
  )
}

function BottomNavLink({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string
  label: string
  icon: React.ComponentType<{ size?: number }>
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end ?? to === '/mesas'}
      className={({ isActive }) =>
        cn(
          'flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium transition-colors',
          isActive ? 'text-brand-600 dark:text-brand-400' : 'text-neutral-400 dark:text-neutral-500',
        )
      }
    >
      <Icon size={20} />
      {label}
    </NavLink>
  )
}
