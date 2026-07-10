import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { FacturaForm } from '@/components/facturas/factura-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Nueva factura' }

export default async function NuevaFacturaPage() {
  const supabase = await createClient()

  const [{ data: clientes }, { data: productos }, { data: empresa }] = await Promise.all([
    supabase.from('clientes').select('id, nombre, empresa, direccion, poblacion, codigo_postal, provincia, email, telefono, dni_cif').eq('activo', true).order('nombre'),
    supabase.from('productos').select('*').eq('activo', true).order('nombre'),
    supabase.from('configuracion_empresa').select('*').single(),
  ])
  const condicionesDefault = (empresa as any)?.condiciones_factura_default ?? ''

  return (
    <div className="space-y-5 fade-in max-w-4xl">
      <div className="flex items-center gap-3">
        <Link
          href="/facturas"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Nueva factura</h1>
          <p className="text-sm text-slate-500 mt-0.5">Crea una factura para el cliente</p>
        </div>
      </div>

      {/* Suspense necesario porque FacturaForm usa useSearchParams */}
      <Suspense fallback={<div className="h-96 bg-white rounded-xl border border-slate-200 animate-pulse" />}>
        <FacturaForm clientes={clientes as any ?? []} productos={productos as any ?? []} empresa={empresa as any} condicionesDefault={condicionesDefault} />
      </Suspense>
    </div>
  )
}
