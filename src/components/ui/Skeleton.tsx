import { cn } from '@/lib/utils'

/** Bloque base para armar esqueletos de carga — cada pantalla lo compone del tamaño/
 * forma que necesite (una línea de texto, una tarjeta, una fila de tabla, etc.) en
 * vez de tapar toda la pantalla con un spinner mientras solo los datos dinámicos
 * (lo que sí viene de la base de datos) están cargando. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-700', className)} />
}
