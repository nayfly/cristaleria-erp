import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import { EstadoFacturaBadge } from '@/components/shared/estado-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { Plus, Receipt } from 'lucide-react'
import type { Metadata } from 'next'
import type { EstadoFactura } from '@/types'

export const metadata: Metadata = { title: 'Facturas' }

interface Props {
  searchParams: Promise<{ estado?: string; pagado?: string }>
}

export default async function FacturasPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('facturas')
    .select('id, numero, fecha, estado, total, pagado, cliente:clientes(nombre, empresa)')
    .order('created_at', { ascending: false })

  if (params.estado && params.estado !== 'todos') {
    query = query.eq('estado', params.estado)
  }

  if (params.pagado === 'false') {
    query = query.eq('pagado', false).not('estado', 'eq', 'anulada')
  }

  const { data: facturas } = await query

  const filtros = [
    { value: 'todos', label: 'Todas', href: '/facturas' },
    { value: 'pendiente', label: 'Pendientes', href: '/facturas?pagado=false' },
    { value: 'emitida', label: 'Emitidas', href: '/facturas?estado=emitida' },
    { value: 'cobrada', label: 'Cobradas', href: '/facturas?estado=cobrada' },
    { value: 'anulada', label: 'Anuladas', href: '/facturas?estado=anulada' },
  ]

  const estadoActivo = params.pagado === 'false' ? 'pendiente' : (params.estado ?? 'todos')

  const totalPendiente = facturas
    ?.filter((f) => !f.pagado && f.estado !== 'anulada')
    .reduce((acc, f) => acc + f.total, 0) ?? 0

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Facturas</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {facturas?.length ?? 0} factura{facturas?.length !== 1 ? 's' : ''}
            {totalPendiente > 0 && (
              <span className="text-red-500 ml-2">
                · {formatCurrency(totalPendiente)} pendiente
              </span>
            )}
          </p>
        </div>
        <Link
          href="/facturas/nueva"
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium
                     text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva factura
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5 flex-wrap">
        {filtros.map((f) => (
          <Link
            key={f.value}
            href={f.href}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              estadoActivo === f.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {!facturas || facturas.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState
            icon={Receipt}
            title="Sin facturas"
            description="Crea una factura directamente o conviértela desde un presupuesto aceptado"
            actionLabel="Nueva factura"
            actionHref="/facturas/nueva"
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="hidden md:grid grid-cols-[130px_2fr_160px_120px_80px_1fr] gap-4 px-5 py-3
                          border-b border-slate-100 bg-slate-50">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Número</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cliente</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cobro</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Total</span>
          </div>

          <div className="divide-y divide-slate-100">
            {facturas.map((f) => {
              const cliente = f.cliente as { nombre: string; empresa?: string } | null
              return (
                <Link
                  key={f.id}
                  href={`/facturas/${f.id}`}
                  className="flex md:grid md:grid-cols-[130px_2fr_160px_120px_80px_1fr] gap-4
                             items-center px-5 py-4 hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm font-mono font-medium text-slate-900">{f.numero}</span>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-900 truncate">{cliente?.nombre ?? '—'}</p>
                    {cliente?.empresa && (
                      <p className="text-xs text-slate-400 truncate">{cliente.empresa}</p>
                    )}
                  </div>
                  <span className="hidden md:block text-sm text-slate-500">{formatDate(f.fecha)}</span>
                  <EstadoFacturaBadge estado={f.estado as EstadoFactura} />
                  <span className={`hidden md:block text-xs font-medium ${f.pagado ? 'text-green-600' : 'text-amber-600'}`}>
                    {f.pagado ? 'Cobrada' : 'Pendiente'}
                  </span>
                  <span className="text-sm font-semibold text-slate-900 text-right">
                    {formatCurrency(f.total)}
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
