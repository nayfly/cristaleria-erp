import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PresupuestoForm } from '@/components/presupuestos/presupuesto-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('presupuestos').select('numero').eq('id', id).single()
  return { title: `Editar — ${data?.numero ?? 'Presupuesto'}` }
}

export default async function EditarPresupuestoPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: presupuesto, error }, { data: clientes }] = await Promise.all([
    supabase
      .from('presupuestos')
      .select('*, items:presupuesto_items(*)')
      .eq('id', id)
      .order('orden', { referencedTable: 'presupuesto_items', ascending: true })
      .single(),
    supabase
      .from('clientes')
      .select('id, nombre, empresa')
      .eq('activo', true)
      .order('nombre'),
  ])

  if (error || !presupuesto) notFound()

  if (presupuesto.estado === 'facturado') {
    return (
      <div className="fade-in max-w-md mx-auto mt-16 text-center">
        <p className="text-slate-500 text-sm">
          No se puede editar un presupuesto que ya ha sido facturado.
        </p>
        <Link
          href={`/presupuestos/${id}`}
          className="text-blue-600 text-sm hover:underline mt-2 inline-block"
        >
          Volver al presupuesto
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5 fade-in max-w-4xl">
      <div className="flex items-center gap-3">
        <Link
          href={`/presupuestos/${id}`}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Editar presupuesto</h1>
          <p className="text-sm text-slate-500 mt-0.5 font-mono">{presupuesto.numero}</p>
        </div>
      </div>

      <Suspense fallback={<div className="h-96 bg-white rounded-xl border border-slate-200 animate-pulse" />}>
        <PresupuestoForm presupuesto={presupuesto as any} clientes={clientes as any ?? []} />
      </Suspense>
    </div>
  )
}
