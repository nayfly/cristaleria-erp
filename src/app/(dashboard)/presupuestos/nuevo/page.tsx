import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { PresupuestoForm } from '@/components/presupuestos/presupuesto-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Nuevo presupuesto' }

export default async function NuevoPresupuestoPage() {
  const supabase = await createClient()

  const [{ data: clientes }, { data: empresa }, { data: productos }] = await Promise.all([
    supabase.from('clientes').select('id, nombre, empresa').eq('activo', true).order('nombre'),
    supabase.from('configuracion_empresa').select('*').single(),
    supabase.from('productos').select('*').eq('activo', true).order('nombre'),
  ])
  const condicionesDefault = (empresa as any)?.condiciones_presupuesto_default ?? ''

  return (
    <div className="space-y-5 fade-in max-w-4xl">
      <div className="flex items-center gap-3">
        <Link
          href="/presupuestos"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Nuevo presupuesto</h1>
          <p className="text-sm text-slate-500 mt-0.5">Crea y envía un presupuesto al cliente</p>
        </div>
      </div>

      <Suspense fallback={<div className="h-96 bg-white rounded-xl border border-slate-200 animate-pulse" />}>
        <PresupuestoForm clientes={clientes as any ?? []} condicionesDefault={condicionesDefault} productos={productos as any ?? []} empresa={empresa as any} />
      </Suspense>
    </div>
  )
}
