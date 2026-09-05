import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ordersApi } from '@/api/orders'
import { printingApi } from '@/api/printing'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { BackLink } from '@/components/ui/BackLink'
import { toast } from '@/store/toast'
import { formatMoney, todayIso } from '@/lib/utils'

const MEAL_TYPE_LABELS: Record<string, string> = {
  DESAYUNO: 'Desayuno',
  ALMUERZO: 'Almuerzo',
  ESPECIAL: 'Especial',
}

const CHART_AXIS_STYLE = { fontSize: 12, fill: 'rgba(131, 121, 104, 0.9)' }
const CHART_TOOLTIP_STYLE = { background: '#211e1a', color: '#faf9f6', border: 'none', borderRadius: 8, fontSize: 12 }

export default function ReportesPage() {
  const [date, setDate] = useState(todayIso())

  const { data: totals, isLoading: loadingTotals } = useQuery({
    queryKey: ['payment-totals', date],
    queryFn: () => ordersApi.getPaymentTotals(date),
  })

  const { data: report, isLoading: loadingReport } = useQuery({
    queryKey: ['daily-report', date],
    queryFn: () => ordersApi.getDailyReport(date),
  })

  const printResumen = useMutation({
    mutationFn: () => printingApi.printResumen(date),
    onSuccess: () => toast.success('Resumen enviado a la impresora'),
    onError: () => toast.error('No se pudo imprimir', { description: 'Revisa la impresora en Admin.' }),
  })

  const grandTotal = totals?.reduce((sum, t) => sum + t.total, 0) ?? 0
  const orderCount = totals?.reduce((sum, t) => sum + t.orderCount, 0) ?? 0

  const hourlyChartData = useMemo(() => {
    const byHour = new Map((report?.hourlyCounts ?? []).map((h) => [h.hour, h.orderCount]))
    if (byHour.size === 0) return []
    const hours = [...byHour.keys()]
    const minHour = Math.min(...hours)
    const maxHour = Math.max(...hours)
    return Array.from({ length: maxHour - minHour + 1 }, (_, i) => {
      const hour = minHour + i
      return { hour: `${hour}h`, pedidos: byHour.get(hour) ?? 0 }
    })
  }, [report])

  const isLoading = loadingTotals || loadingReport

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <BackLink to="/admin" label="Volver a Admin" />
      <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight mb-5">Reportes</h1>

      <div className="flex gap-2 mb-6">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1" />
        <Button variant="secondary" onClick={() => printResumen.mutate()} loading={printResumen.isPending}>
          <Printer size={16} />
        </Button>
      </div>

      {isLoading ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-3 w-20" />
              </Card>
            ))}
          </div>
          <Skeleton className="h-16 w-full rounded-xl mb-4" />
          <Skeleton className="h-4 w-32 mb-2" />
          <div className="space-y-2 mb-4">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <Skeleton className="h-56 w-full rounded-xl" />
        </>
      ) : (
        <>
          {/* Resumen del día */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Card className="p-4">
              <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Ventas del día</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{formatMoney(report?.totalSales ?? 0)}</p>
              <p className="text-xs text-neutral-500 mt-1">{report?.totalOrders ?? 0} pedidos</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Cancelados</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{report?.cancelledOrders ?? 0}</p>
              <p className="text-xs text-neutral-500 mt-1">pedidos cancelados</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Clientes registrados</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{report?.registeredCustomersOrdered ?? 0}</p>
              <p className="text-xs text-neutral-500 mt-1">pidieron hoy</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Quedaron debiendo</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{report?.openTabsCount ?? 0}</p>
              <p className="text-xs text-neutral-500 mt-1">{formatMoney(report?.openTabsTotal ?? 0)} en cuentas abiertas</p>
            </Card>
          </div>

          <Card className="p-4 mb-4">
            <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Adiciones vendidas</p>
            <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{report?.additionsCount ?? 0}</p>
          </Card>

          {/* Desayuno / Almuerzo / Especial */}
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">Por tipo de comida</h2>
            {report && report.mealTypeCounts.length > 0 ? (
              <div className="space-y-2">
                {report.mealTypeCounts.map((m) => (
                  <Card key={m.mealType} className="p-3.5 flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                      {MEAL_TYPE_LABELS[m.mealType] ?? m.mealType}
                    </span>
                    <span className="text-sm text-neutral-600 dark:text-neutral-300">
                      {m.orderItemCount} vendidos · {formatMoney(m.total)}
                    </span>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-4">
                <p className="text-sm text-neutral-400 text-center">Sin pedidos servidos este día.</p>
              </Card>
            )}
          </div>

          {/* En sitio / Para llevar */}
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">En sitio vs. para llevar</h2>
            {report && report.fulfillmentCounts.length > 0 ? (
              <div className="space-y-2">
                {report.fulfillmentCounts.map((f) => (
                  <Card key={f.type} className="p-3.5 flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                      {f.type === 'PARA_LLEVAR' ? 'Para llevar' : 'En sitio'}
                    </span>
                    <span className="text-sm text-neutral-600 dark:text-neutral-300">
                      {f.orderItemCount} vendidos · {formatMoney(f.total)}
                    </span>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-4">
                <p className="text-sm text-neutral-400 text-center">Sin pedidos servidos este día.</p>
              </Card>
            )}
          </div>

          {/* Horas pico */}
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">Horas pico</h2>
            {report && report.hourlyCounts.length > 0 ? (
              <Card className="p-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(131, 121, 104, 0.25)" />
                    <XAxis dataKey="hour" tick={CHART_AXIS_STYLE} interval="preserveStartEnd" />
                    <YAxis tick={CHART_AXIS_STYLE} allowDecimals={false} />
                    <Tooltip formatter={(v) => `${v} pedidos`} contentStyle={CHART_TOOLTIP_STYLE} />
                    <Bar dataKey="pedidos" fill="var(--color-brand-500)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            ) : (
              <Card className="p-4">
                <p className="text-sm text-neutral-400 text-center">Sin pedidos este día.</p>
              </Card>
            )}
          </div>

          {/* Totales por método de pago (ya existente) */}
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">Cobrado por método de pago</h2>
          {totals && totals.length > 0 && (
            <Card className="p-4 mb-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={totals}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(131, 121, 104, 0.25)" />
                  <XAxis dataKey="paymentTypeName" tick={CHART_AXIS_STYLE} />
                  <YAxis tick={CHART_AXIS_STYLE} />
                  <Tooltip formatter={(v) => formatMoney(Number(v))} contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="total" fill="var(--color-brand-500)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          <div className="space-y-2">
            {totals?.map((t) => (
              <Card key={t.paymentTypeName} className="p-3.5 flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{t.paymentTypeName}</span>
                <span className="text-sm text-neutral-600 dark:text-neutral-300">
                  {t.orderCount} pedidos · {formatMoney(t.total)}
                </span>
              </Card>
            ))}
            {totals?.length === 0 && (
              <p className="text-center text-neutral-400 text-sm py-10">Sin pedidos cobrados este día.</p>
            )}
          </div>
          <p className="text-xs text-neutral-400 mt-2">
            Total cobrado ese día: {formatMoney(grandTotal)} ({orderCount} pedidos)
          </p>
        </>
      )}
    </div>
  )
}
