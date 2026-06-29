import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ProductoForm } from '@/components/productos/producto-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('productos').select('nombre').eq('id', id).single()
  return { title: `Editar — ${data?.nombre ?? 'Producto'}` }
}

export default async function EditarProductoPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: producto, error } = await supabase
    .from('productos')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !producto) notFound()

  return (
    <div className="space-y-5 fade-in max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href={`/productos/${id}`} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Editar producto</h1>
          <p className="text-sm text-slate-500 mt-0.5">{producto.nombre}</p>
        </div>
      </div>
      <ProductoForm producto={producto as any} />
    </div>
  )
}
