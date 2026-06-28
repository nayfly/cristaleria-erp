import { cn, ESTADO_FACTURA_COLORS, ESTADO_FACTURA_LABELS, ESTADO_PRESUPUESTO_COLORS, ESTADO_PRESUPUESTO_LABELS } from '@/lib/utils'
import type { EstadoFactura, EstadoPresupuesto } from '@/types'

interface EstadoPresupuestoBadgeProps {
  estado: EstadoPresupuesto
  className?: string
}

export function EstadoPresupuestoBadge({ estado, className }: EstadoPresupuestoBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium',
        ESTADO_PRESUPUESTO_COLORS[estado],
        className
      )}
    >
      {ESTADO_PRESUPUESTO_LABELS[estado]}
    </span>
  )
}

interface EstadoFacturaBadgeProps {
  estado: EstadoFactura
  className?: string
}

export function EstadoFacturaBadge({ estado, className }: EstadoFacturaBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium',
        ESTADO_FACTURA_COLORS[estado],
        className
      )}
    >
      {ESTADO_FACTURA_LABELS[estado]}
    </span>
  )
}
