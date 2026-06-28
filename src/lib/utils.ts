import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { EstadoFactura, EstadoPresupuesto, PresupuestoItemForm, FacturaItemForm } from '@/types'

// ============================================
// TAILWIND
// ============================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================
// FORMATEO
// ============================================

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd/MM/yyyy', { locale: es })
}

export function formatDateLong(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, "d 'de' MMMM 'de' yyyy", { locale: es })
}

export function formatNumber(n: number, decimals = 2): string {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

// ============================================
// CÁLCULOS
// ============================================

export function calcularTotalLinea(
  cantidad: number,
  precio: number,
  descuento: number
): number {
  const subtotal = cantidad * precio
  return subtotal * (1 - descuento / 100)
}

export function calcularTotales(
  items: Array<PresupuestoItemForm | FacturaItemForm>,
  descuentoGlobal: number,
  ivaPorcentaje: number
) {
  const subtotal = items.reduce((acc, item) => acc + (item.total || 0), 0)
  const baseImponible = subtotal * (1 - descuentoGlobal / 100)
  const ivaImporte = baseImponible * (ivaPorcentaje / 100)
  const total = baseImponible + ivaImporte

  return {
    subtotal: redondear(subtotal),
    base_imponible: redondear(baseImponible),
    iva_importe: redondear(ivaImporte),
    total: redondear(total),
  }
}

export function redondear(n: number): number {
  return Math.round(n * 100) / 100
}

// ============================================
// ESTADOS — etiquetas y colores
// ============================================

export const ESTADO_PRESUPUESTO_LABELS: Record<EstadoPresupuesto, string> = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  aceptado: 'Aceptado',
  rechazado: 'Rechazado',
  facturado: 'Facturado',
}

export const ESTADO_PRESUPUESTO_COLORS: Record<EstadoPresupuesto, string> = {
  borrador: 'bg-slate-100 text-slate-700',
  enviado: 'bg-blue-100 text-blue-700',
  aceptado: 'bg-green-100 text-green-700',
  rechazado: 'bg-red-100 text-red-700',
  facturado: 'bg-purple-100 text-purple-700',
}

export const ESTADO_FACTURA_LABELS: Record<EstadoFactura, string> = {
  borrador: 'Borrador',
  emitida: 'Emitida',
  enviada: 'Enviada',
  cobrada: 'Cobrada',
  anulada: 'Anulada',
}

export const ESTADO_FACTURA_COLORS: Record<EstadoFactura, string> = {
  borrador: 'bg-slate-100 text-slate-700',
  emitida: 'bg-amber-100 text-amber-700',
  enviada: 'bg-blue-100 text-blue-700',
  cobrada: 'bg-green-100 text-green-700',
  anulada: 'bg-red-100 text-red-700',
}

// ============================================
// VALIDACIONES SIMPLES
// ============================================

export function esEmailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function esDniValido(dni: string): boolean {
  const dniRegex = /^[0-9]{8}[TRWAGMYFPDXBNJZSQVHLCKE]$/i
  return dniRegex.test(dni)
}

export function esCifValido(cif: string): boolean {
  const cifRegex = /^[ABCDEFGHJKLMNPQRSUVW]\d{7}[0-9A-J]$/i
  return cifRegex.test(cif)
}

// ============================================
// HELPERS
// ============================================

export function nombreCompleto(cliente: { nombre: string; empresa?: string }): string {
  if (cliente.empresa) {
    return `${cliente.nombre} (${cliente.empresa})`
  }
  return cliente.nombre
}

export function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}

// Genera un ID temporal para items del formulario antes de guardar
export function tempId(): string {
  return `temp_${Math.random().toString(36).substr(2, 9)}`
}
