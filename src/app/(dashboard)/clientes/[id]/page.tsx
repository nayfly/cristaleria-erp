import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Phone, Mail, MapPin, Building2,
  FileText, Receipt, Plus, Pencil
} from 'lucide-react'
import { formatCurrency, formatDate, iniciales } from '@/lib/utils'
import { EstadoPresupuestoBadge, EstadoFacturaBadge } from '@/components/shared/estado-badge'
import type { Metadata } from 'next'
import type { EstadoPresupuesto, EstadoFactura } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('clientes').select('nombre').eq('id', id).single()
  return { title: data?.nombre ?? 'Cliente' }
}

export default async function ClienteDetallePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: cliente, error },
    { data: presupuestos },
    { data: facturas },
  ] = await Promise.all([
    supabase.from('clientes').select('*').eq('id', id).single(),
    supabase
      .from('presupuestos')
      .select('id, numero, fecha, estado, total')
      .eq('cliente_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('facturas')
      .select('id, numero, fecha, estado, total, pagado')
      .eq('cliente_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  if (error || !cliente) notFound()

  const totalFacturado = facturas?.reduce((acc, f) => acc + f.total, 0) ?? 0
  const totalPendiente = facturas
    ?.filter((f) => !f.pagado && f.estado !== 'anulada')
    .reduce((acc, f) => acc + f.total, 0) ?? 0

  return (
    <div className="space-y-5 fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/clientes"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center
                            text-blue-700 font-bold">
              {iniciales(cliente.nombre)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{cliente.nombre}</h1>
              {cliente.empresa && (
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {cliente.empresa}
                </p>
              )}
            </div>
          </div>
        </div>
        <Link
          href={`/clientes/${id}/editar`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                     text-slate-700 bg-white border border-slate-200 rounded-lg
                     hover:bg-slate-50 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          Editar
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Info del cliente */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Información</h2>

            {cliente.telefono && (
              <a
                href={`tel:${cliente.telefono}`}
                className="flex items-center gap-2.5 text-sm text-slate-600
                           hover:text-blue-600 transition-colors"
              >
                <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                {cliente.telefono}
              </a>
            )}

            {cliente.email && (
              <a
                href={`mailto:${cliente.email}`}
                className="flex items-center gap-2.5 text-sm text-slate-600
                           hover:text-blue-600 transition-colors truncate"
              >
                <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="truncate">{cliente.email}</span>
              </a>
            )}

            {(cliente.direccion || cliente.poblacion) && (
              <div className="flex items-start gap-2.5 text-sm text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  {cliente.direccion && <p>{cliente.direccion}</p>}
                  {(cliente.codigo_postal || cliente.poblacion) && (
                    <p>
                      {[cliente.codigo_postal, cliente.poblacion, cliente.provincia]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {cliente.dni_cif && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-400">DNI / CIF</p>
                <p className="text-sm text-slate-600 font-medium">{cliente.dni_cif}</p>
              </div>
            )}

            {cliente.observaciones && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-400 mb-1">Observaciones</p>
                <p className="text-sm text-slate-600">{cliente.observaciones}</p>
              </div>
            )}
          </div>

          {/* Resumen económico */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Resumen</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total facturado</span>
                <span className="font-medium text-slate-900">{formatCurrency(totalFacturado)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Pendiente de cobro</span>
                <span className={`font-medium ${totalPendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(totalPendiente)}
                </span>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-col gap-2">
            <Link
              href={`/presupuestos/nuevo?cliente=${id}`}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium
                         text-slate-700 bg-white border border-slate-200 rounded-lg
                         hover:bg-slate-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo presupuesto
            </Link>
            <Link
              href={`/facturas/nueva?cliente=${id}`}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium
                         text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva factura
            </Link>
          </div>
        </div>

        {/* Historial */}
        <div className="lg:col-span-2 space-y-4">
          {/* Presupuestos */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-900">Presupuestos</h2>
              </div>
            </div>

            {presupuestos && presupuestos.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {presupuestos.map((p) => (
                  <Link
                    key={p.id}
                    href={`/presupuestos/${p.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{p.numero}</p>
                      <p className="text-xs text-slate-400">{formatDate(p.fecha)}</p>
                    </div>
                    <EstadoPresupuestoBadge estado={p.estado as EstadoPresupuesto} />
                    <p className="text-sm font-semibold text-slate-900 w-24 text-right">
                      {formatCurrency(p.total)}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="px-5 py-8 text-sm text-slate-400 text-center">
                Sin presupuestos
              </p>
            )}
          </div>

          {/* Facturas */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-900">Facturas</h2>
              </div>
            </div>

            {facturas && facturas.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {facturas.map((f) => (
                  <Link
                    key={f.id}
                    href={`/facturas/${f.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{f.numero}</p>
                      <p className="text-xs text-slate-400">{formatDate(f.fecha)}</p>
                    </div>
                    <EstadoFacturaBadge estado={f.estado as EstadoFactura} />
                    <p className="text-sm font-semibold text-slate-900 w-24 text-right">
                      {formatCurrency(f.total)}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="px-5 py-8 text-sm text-slate-400 text-center">
                Sin facturas
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
