import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { EstadoPresupuestoBadge } from '@/components/shared/estado-badge'
import { AccionesPresupuesto } from '@/components/presupuestos/acciones-presupuesto'
import type { Metadata } from 'next'
import type { EstadoPresupuesto } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('presupuestos').select('numero').eq('id', id).single()
  return { title: data?.numero ?? 'Presupuesto' }
}

export default async function PresupuestoDetallePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: presupuesto, error } = await supabase
    .from('presupuestos')
    .select('*, cliente:clientes(*), items:presupuesto_items(*)')
    .eq('id', id)
    .order('orden', { referencedTable: 'presupuesto_items', ascending: true })
    .single()

  if (error || !presupuesto) notFound()

  const cliente = presupuesto.cliente as any
  const items = presupuesto.items as any[] ?? []

  return (
    <div className="space-y-5 fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/presupuestos"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 font-mono">{presupuesto.numero}</h1>
              <EstadoPresupuestoBadge estado={presupuesto.estado as EstadoPresupuesto} />
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{formatDate(presupuesto.fecha)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {presupuesto.estado === 'borrador' && (
            <Link
              href={`/presupuestos/${id}/editar`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                         text-slate-700 bg-white border border-slate-200 rounded-lg
                         hover:bg-slate-50 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </Link>
          )}
          <AccionesPresupuesto
            presupuesto={presupuesto as any}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Datos principales */}
        <div className="lg:col-span-2 space-y-5">
          {/* Líneas */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Cabecera */}
            <div className="hidden md:grid grid-cols-[2fr_80px_80px_100px_80px_100px] gap-3
                            px-5 py-3 bg-slate-50 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Descripción</span>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-right">Cant.</span>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Ud.</span>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-right">Precio</span>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-right">Dto.</span>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-right">Total</span>
            </div>

            <div className="divide-y divide-slate-100">
              {items.map((item: any) => (
                <div
                  key={item.id}
                  className="grid grid-cols-1 md:grid-cols-[2fr_80px_80px_100px_80px_100px]
                             gap-2 px-5 py-3.5 items-center"
                >
                  <p className="text-sm text-slate-900">{item.descripcion}</p>
                  <p className="text-sm text-slate-600 text-right">{item.cantidad}</p>
                  <p className="text-sm text-slate-400">{item.unidad}</p>
                  <p className="text-sm text-slate-600 text-right">{formatCurrency(item.precio_unitario)}</p>
                  <p className="text-sm text-slate-400 text-right">
                    {item.descuento > 0 ? `${item.descuento}%` : '—'}
                  </p>
                  <p className="text-sm font-semibold text-slate-900 text-right">
                    {formatCurrency(item.total)}
                  </p>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="border-t border-slate-200 px-5 py-4 space-y-1.5 bg-slate-50">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(presupuesto.subtotal)}</span>
              </div>
              {presupuesto.descuento > 0 && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Descuento ({presupuesto.descuento}%)</span>
                  <span className="text-red-500">
                    −{formatCurrency(presupuesto.subtotal - presupuesto.base_imponible)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm text-slate-600">
                <span>Base imponible</span>
                <span>{formatCurrency(presupuesto.base_imponible)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>IVA ({presupuesto.iva_porcentaje}%)</span>
                <span>{formatCurrency(presupuesto.iva_importe)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 text-base pt-2 border-t border-slate-200">
                <span>Total</span>
                <span>{formatCurrency(presupuesto.total)}</span>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          {(presupuesto.observaciones || presupuesto.condiciones) && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              {presupuesto.observaciones && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                    Observaciones
                  </p>
                  <p className="text-sm text-slate-600">{presupuesto.observaciones}</p>
                </div>
              )}
              {presupuesto.condiciones && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                    Condiciones
                  </p>
                  <p className="text-sm text-slate-600">{presupuesto.condiciones}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: cliente + info */}
        <div className="space-y-4">
          {/* Cliente */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Cliente
            </p>
            <Link
              href={`/clientes/${cliente?.id}`}
              className="block hover:underline"
            >
              <p className="text-sm font-semibold text-slate-900">{cliente?.nombre}</p>
              {cliente?.empresa && (
                <p className="text-sm text-slate-500">{cliente.empresa}</p>
              )}
            </Link>
            {cliente?.telefono && (
              <a
                href={`tel:${cliente.telefono}`}
                className="text-sm text-blue-600 hover:underline mt-1 block"
              >
                {cliente.telefono}
              </a>
            )}
          </div>

          {/* Fechas */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Fechas</p>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Emisión</span>
              <span className="text-slate-900">{formatDate(presupuesto.fecha)}</span>
            </div>
            {presupuesto.fecha_validez && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Válido hasta</span>
                <span className="text-slate-900">{formatDate(presupuesto.fecha_validez)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
