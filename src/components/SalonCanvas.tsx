import { useRef, useState } from 'react'
import { Users2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TableEntityDto } from '@/types'

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

/**
 * El plano de un salón: cada mesa como una ficha ubicada en su posición (0-100,
 * porcentaje del lienzo) para que se vea como el restaurante de verdad, en vez de
 * una cuadrícula genérica. En modo `editable` las fichas se arrastran para reacomodar
 * el plano; si no, un tap abre el pedido de esa mesa.
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

  const positionOf = (table: TableEntityDto) =>
    dragId === table.id && dragPos ? dragPos : { x: table.positionX, y: table.positionY }

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
          'radial-gradient(currentColor 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        color: 'rgba(120,113,100,0.15)',
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
              if (point) setDragPos(point)
            }}
            onPointerUp={(e) => {
              if (dragId !== table.id) return
              const point = pointFromEvent(e) ?? dragPos
              setDragId(null)
              setDragPos(null)
              if (point) onPositionChange?.(table.id, point.x, point.y)
            }}
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, touchAction: editable ? 'none' : undefined }}
            className={cn(
              'absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-0.5',
              'w-16 h-16 rounded-2xl border-2 bg-white dark:bg-neutral-900 shadow-sm transition-transform',
              isFree ? 'border-status-free' : 'border-status-busy',
              editable ? 'cursor-grab active:cursor-grabbing' : 'active:scale-95',
              dragging && 'scale-110 shadow-lg z-10',
            )}
          >
            <Users2 size={16} className={isFree ? 'text-status-free' : 'text-status-busy'} />
            <span className="text-sm font-bold text-neutral-900 dark:text-neutral-50 leading-none">
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
