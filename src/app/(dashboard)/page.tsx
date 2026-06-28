import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import { EstadoFacturaBadge } from '@/components/shared/estado-badge'
import { Users, FileText, Receipt, TrendingUp, Plus } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // Métricas en paralelo
  const [
    { count: totalClientes },
    { count: totalPresupuestos },
    { count: totalFacturas },
    { data: facturasPendientes },
    { data: ultimasFacturas },
  ] = await Promise.all([
    supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('activo', true),
    supabase.from('presupuestos').select('*', { count: 'exact', head: true }),
    supabase.from('facturas').select('*', { count: 'exact', head: true }),
    supabase
      .from('facturas')
      .select('total')
      .eq('pagado', false)
      .not('estado', 'eq', 'anulada'),
    supabase
      .from('facturas')
      .select('id, numero, total, estado, fecha, cliente:clientes(nombre, empresa)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const importePendiente = facturasPendientes?.reduce((acc, f) => acc + f.total, 0) ?? 0

  const metricas = [
    {
      label: 'Clientes',
      valor: totalClientes ?? 0,
      icono: Users,
      href: '/clientes',
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Presupuestos',
      valor: totalPresupuestos ?? 0,
      icono: FileText,
      href: '/presupuestos',
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Facturas',
      valor: totalFacturas ?? 0,
      icono: Receipt,
      href: '/facturas',
      color: 'text-purple-600 bg-purple-50',
    },
    {
      label: 'Pendiente de cobro',
      valor: formatCurrency(importePendiente),
      icono: TrendingUp,
      href: '/facturas?estado=emitida',
      color: importePendiente > 0 ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50',
    },
  ]

  return (
    <div className="space-y-6 fade-in">
      {/* Título + acciones rápidas */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Resumen de facturación</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/clientes/nuevo"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                       text-slate-700 bg-white border border-slate-200 rounded-lg
                       hover:bg-slate-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Cliente
          </Link>
          <Link
            href="/presupuestos/nuevo"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                       text-slate-700 bg-white border border-slate-200 rounded-lg
                       hover:bg-slate-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Presupuesto
          </Link>
          <Link
            href="/facturas/nueva"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                       text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Factura
          </Link>
        </div>
      </div>

      {/* Tarjetas métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricas.map((m) => {
          const Icon = m.icono
          return (
            <Link
              key={m.label}
              href={m.href}
              className="bg-white rounded-xl border border-slate-200 p-5
                         hover:border-blue-200 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${m.color}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mb-0.5">
                {m.valor}
              </p>
              <p className="text-xs text-slate-500 font-medium">{m.label}</p>
            </Link>
          )
        })}
      </div>

      {/* Últimas facturas */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Últimas facturas</h2>
          <Link
            href="/facturas"
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Ver todas →
          </Link>
        </div>

        {ultimasFacturas && ultimasFacturas.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {ultimasFacturas.map((factura) => {
              const cliente = factura.cliente as { nombre: string; empresa?: string } | null
              return (
                <Link
                  key={factura.id}
                  href={`/facturas/${factura.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{factura.numero}</span>
                      <EstadoFacturaBadge estado={factura.estado as any} />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {cliente?.empresa ?? cliente?.nombre ?? '—'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency(factura.total)}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(factura.fecha)}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-slate-500">Aún no hay facturas</p>
            <Link
              href="/facturas/nueva"
              className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 text-sm font-medium
                         text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Crear primera factura
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
