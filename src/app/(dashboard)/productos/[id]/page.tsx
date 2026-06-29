import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, Package } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('productos').select('nombre').eq('id', id).single()
  return { title: data?.nombre ?? 'Producto' }
}

export default async function ProductoDetallePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: producto, error } = await supabase
    .from('productos')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !producto) notFound()

  const precioConIva = producto.precio_base * (1 + producto.tipo_iva / 100)

  return (
    <div className="space-y-5 fade-in max-w-2xl">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/productos" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{producto.nombre}</h1>
              {producto.referencia && (
                <p className="text-sm text-slate-500 font-mono">{producto.referencia}</p>
              )}
            </div>
          </div>
        </div>
        <Link
          href={`/productos/${id}/editar`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                     text-slate-700 bg-white border border-slate-200 rounded-lg
                     hover:bg-slate-50 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          Editar
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        {producto.descripcion && (
          <div>
            <p className="text-xs text-slate-400 mb-1">Descripción</p>
            <p className="text-sm text-slate-700">{producto.descripcion}</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs text-slate-400 mb-1">Precio sin IVA</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(producto.precio_base)}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs text-slate-400 mb-1">IVA</p>
            <p className="text-lg font-bold text-slate-900">{producto.tipo_iva}%</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-xs text-blue-400 mb-1">Precio con IVA</p>
            <p className="text-lg font-bold text-blue-700">{formatCurrency(precioConIva)}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs text-slate-400 mb-1">Unidad</p>
            <p className="text-lg font-bold text-slate-900">{producto.unidad}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
