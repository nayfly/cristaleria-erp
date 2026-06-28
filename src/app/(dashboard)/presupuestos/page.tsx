import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import { EstadoPresupuestoBadge } from '@/components/shared/estado-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { Plus, FileText } from 'lucide-react'
import type { Metadata } from 'next'
import type { EstadoPresupuesto } from '@/types'

export const metadata: Metadata = { title: 'Presupuestos' }

interface Props {
  searchParams: Promise<{ estado?: string }>
}

export default async function PresupuestosPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('presupuestos')
    .select('id, numero, fecha, estado, total, cliente:clientes(nombre, empresa)')
    .order('created_at', { ascending: false })

  if (params.estado && params.estado !== 'todos') {
    query = query.eq('estado', params.estado)
  }

  const { data: presupuestos } = await query

  const estados: Array<{ value: string; label: string }> = [
    { value: 'todos', label: 'Todos' },
    { value: 'borrador', label: 'Borrador' },
    { value: 'enviado', label: 'Enviado' },
    { value: 'aceptado', label: 'Aceptado' },
    { value: 'rechazado', label: 'Rechazado' },
    { value: 'facturado', label: 'Facturado' },
  ]

  const estadoActivo = params.estado ?? 'todos'

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Presupuestos</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {presupuestos?.length ?? 0} presupuesto{presupuestos?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/presupuestos/nuevo"
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium
                     text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo presupuesto
        </Link>
      </div>

      {/* Filtros de estado */}
      <div className="flex gap-1.5 flex-wrap">
        {estados.map((e) => (
          <Link
            key={e.value}
            href={e.value === 'todos' ? '/presupuestos' : `/presupuestos?estado=${e.value}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              estadoActivo === e.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {e.label}
          </Link>
        ))}
      </div>

      {/* Tabla */}
      {!presupuestos || presupuestos.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState
            icon={FileText}
            title="Sin presupuestos"
            description="Crea tu primer presupuesto y conviértelo en factura cuando lo acepten"
            actionLabel="Nuevo presupuesto"
            actionHref="/presupuestos/nuevo"
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="hidden md:grid grid-cols-[130px_2fr_160px_120px_1fr] gap-4 px-5 py-3
                          border-b border-slate-100 bg-slate-50">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Número</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cliente</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Total</span>
          </div>

          <div className="divide-y divide-slate-100">
            {presupuestos.map((p) => {
              const cliente = p.cliente as { nombre: string; empresa?: string } | null
              return (
                <Link
                  key={p.id}
                  href={`/presupuestos/${p.id}`}
                  className="flex md:grid md:grid-cols-[130px_2fr_160px_120px_1fr] gap-4
                             items-center px-5 py-4 hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm font-mono font-medium text-slate-900">{p.numero}</span>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-900 truncate">{cliente?.nombre ?? '—'}</p>
                    {cliente?.empresa && (
                      <p className="text-xs text-slate-400 truncate">{cliente.empresa}</p>
                    )}
                  </div>
                  <span className="hidden md:block text-sm text-slate-500">{formatDate(p.fecha)}</span>
                  <EstadoPresupuestoBadge estado={p.estado as EstadoPresupuesto} />
                  <span className="text-sm font-semibold text-slate-900 text-right">
                    {formatCurrency(p.total)}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
