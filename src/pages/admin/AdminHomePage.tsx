import { Link } from 'react-router-dom'
import { Users, Tag, Package, CalendarDays, BarChart3, Printer } from 'lucide-react'
import { Card } from '@/components/ui/Card'

const sections = [
  { to: '/admin/usuarios', label: 'Usuarios', description: 'Cuentas y roles', icon: Users },
  { to: '/admin/precios', label: 'Precios', description: 'Motor de precios', icon: Tag },
  { to: '/admin/catalogo', label: 'Catálogo', description: 'Categorías y productos', icon: Package },
  { to: '/admin/menu', label: 'Menú del día', description: 'Configurar el menú', icon: CalendarDays },
  { to: '/admin/reportes', label: 'Reportes', description: 'Caja del día', icon: BarChart3 },
  { to: '/admin/impresora', label: 'Impresora', description: 'Configuración de red', icon: Printer },
]

export default function AdminHomePage() {
  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight mb-5">Administración</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {sections.map(({ to, label, description, icon: Icon }) => (
          <Link key={to} to={to}>
            <Card className="p-4 h-full flex flex-col gap-2 hover:border-brand-300 dark:hover:border-brand-500/50 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-500/15 flex items-center justify-center">
                <Icon size={18} className="text-brand-600 dark:text-brand-400" />
              </div>
              <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{label}</span>
              <span className="text-xs text-neutral-500">{description}</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
