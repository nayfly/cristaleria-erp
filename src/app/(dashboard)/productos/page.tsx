import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProductosTable } from '@/components/productos/productos-table'
import { Plus } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Productos' }

export default async function ProductosPage() {
  const supabase = await createClient()

  const { data: productos, error } = await supabase
    .from('productos')
    .select('*')
    .eq('activo', true)
    .order('nombre', { ascending: true })

  if (error) throw new Error('Error al cargar productos')

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Productos</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {productos?.length ?? 0} producto{productos?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/productos/nuevo"
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium
                     text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo producto
        </Link>
      </div>

      <ProductosTable productos={productos ?? []} />
    </div>
  )
}
