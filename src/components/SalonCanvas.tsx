import { useEffect, useRef, useState } from 'react'
import { Users2 } from 'lucide-react'
import { toast } from '@/store/toast'
import { cn } from '@/lib/utils'
import type { TableEntityDto } from '@/types'

// Cuadrícula fija del plano — 8x5 casillas, cuadradas gracias al aspect-ratio 16:10
// del lienzo. Una mesa siempre vive en el centro de una casilla; no se puede soltar
// fuera de la cuadrícula ni encima de otra mesa.
const GRID_COLS = 8
const GRID_ROWS = 5

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function cellOf(x: number, y: number) {
  return {
    col: clamp(Math.round((x / 100) * GRID_COLS - 0.5), 0, GRID_COLS - 1),
    row: clamp(Math.round((y / 100) * GRID_ROWS - 0.5), 0, GRID_ROWS - 1),
  }
}

function cellCenter(col: number, row: number) {
  return { x: ((col + 0.5) / GRID_COLS) * 100, y: ((row + 0.5) / GRID_ROWS) * 100 }
}

/**
 * El plano de un salón: cada mesa como una ficha en el centro de una casilla de la
 * cuadrícula, para que se vea como el restaurante de verdad. En modo `editable` las
 * fichas se arrastran de casilla en casilla (nunca a un punto libre) y no se puede
 * soltar sobre otra mesa; si no, un tap abre el pedido de esa mesa.
 */
export function SalonCanvas({
  tables,
  editable = false,
  onTableClick,
  onPositionChange,
}: {
  tables: TableEntityDto[]
  editable?: boolean
  onTableClick?: (table: TableEntityDto) => void
  onPositionChange?: (id: number, positionX: number, positionY: number) => void
}) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [dragId, setDragId] = useState<number | null>(null)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  // Posición optimista tras soltar — se muestra hasta que el servidor confirma el
  // mismo valor, para que la ficha no salte de vuelta a la posición vieja mientras
  // se refresca la consulta.
  const [overrides, setOverrides] = useState<Record<number, { x: number; y: number }>>({})

  useEffect(() => {
    setOverrides((prev) => {
      let changed = false
      const next = { ...prev }
      for (const table of tables) {
        const o = next[table.id]
        if (o && Math.abs(o.x - table.positionX) < 0.01 && Math.abs(o.y - table.positionY) < 0.01) {
          delete next[table.id]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [tables])

  const positionOf = (table: TableEntityDto) => {
    if (dragId === table.id && dragPos) return dragPos
    if (overrides[table.id]) return overrides[table.id]
    return { x: table.positionX, y: table.positionY }
  }

  const pointFromEvent = (e: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return null
    return {
      x: clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100),
    }
  }

  return (
    <div
      ref={canvasRef}
      className="relative w-full aspect-[16/10] rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 overflow-hidden"
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(120,113,100,0.18) 1px, transparent 1px), ' +
          'linear-gradient(to bottom, rgba(120,113,100,0.18) 1px, transparent 1px)',
        backgroundSize: `${100 / GRID_COLS}% ${100 / GRID_ROWS}%`,
      }}
    >
      {tables.map((table) => {
        const isFree = table.status === 'OPEN'
        const pos = positionOf(table)
        const dragging = dragId === table.id
        return (
          <button
            key={table.id}
            onClick={() => !dragging && onTableClick?.(table)}
            onPointerDown={(e) => {
              if (!editable) return
              e.preventDefault()
              e.currentTarget.setPointerCapture(e.pointerId)
              setDragId(table.id)
              setDragPos({ x: table.positionX, y: table.positionY })
            }}
            onPointerMove={(e) => {
              if (dragId !== table.id) return
              const point = pointFromEvent(e)
              if (!point) return
              const { col, row } = cellOf(point.x, point.y)
              setDragPos(cellCenter(col, row))
            }}
            onPointerUp={(e) => {
              if (dragId !== table.id) return
              const point = pointFromEvent(e) ?? dragPos
              setDragId(null)
              if (!point) {
                setDragPos(null)
                return
              }
              const { col, row } = cellOf(point.x, point.y)
              const occupied = tables.some((t) => {
                if (t.id === table.id) return false
                const other = cellOf(t.positionX, t.positionY)
                return other.col === col && other.row === row
              })
              setDragPos(null)
              if (occupied) {
                toast.error('Esa casilla ya está ocupada', { description: 'Elige otra casilla libre.' })
                return
              }
              const center = cellCenter(col, row)
              setOverrides((prev) => ({ ...prev, [table.id]: center }))
              onPositionChange?.(table.id, center.x, center.y)
            }}
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, touchAction: editable ? 'none' : undefined }}
            className={cn(
              'absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-0.5',
              'w-11 h-11 sm:w-16 sm:h-16 rounded-2xl border-2 bg-white dark:bg-neutral-900 shadow-sm transition-transform',
              isFree ? 'border-status-free' : 'border-status-busy',
              editable ? 'cursor-grab active:cursor-grabbing' : 'active:scale-95',
              dragging && 'scale-110 shadow-lg z-10',
            )}
          >
            <Users2 size={14} className={cn('sm:hidden', isFree ? 'text-status-free' : 'text-status-busy')} />
            <Users2
              size={18}
              className={cn('hidden sm:block', isFree ? 'text-status-free' : 'text-status-busy')}
            />
            <span className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-50 leading-none">
              {table.number}
            </span>
          </button>
        )
      })}

      {tables.length === 0 && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
          Este salón todavía no tiene mesas.
        </p>
      )}
    </div>
  )
}
