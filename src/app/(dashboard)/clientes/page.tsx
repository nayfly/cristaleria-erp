import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ClientesTable } from '@/components/clientes/clientes-table'
import { Plus } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Clientes',
}

interface Props {
  searchParams: Promise<{ q?: string; activo?: string }>
}

export default async function ClientesPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('clientes')
    .select('*')
    .order('nombre', { ascending: true })

  // Filtro de búsqueda
  if (params.q) {
    const q = params.q.trim()
    query = query.or(
      `nombre.ilike.%${q}%,empresa.ilike.%${q}%,telefono.ilike.%${q}%,dni_cif.ilike.%${q}%,email.ilike.%${q}%`
    )
  }

  // Filtro activo/inactivo
  if (params.activo !== 'todos') {
    query = query.eq('activo', true)
  }

  const { data: clientes, error } = await query

  if (error) {
    throw new Error('Error al cargar clientes')
  }

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {clientes?.length ?? 0} cliente{clientes?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/clientes/nuevo"
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium
                     text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo cliente
        </Link>
      </div>

      <ClientesTable
        clientes={clientes ?? []}
        busquedaInicial={params.q ?? ''}
      />
    </div>
  )
}
