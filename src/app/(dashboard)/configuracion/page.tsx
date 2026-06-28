import { createClient } from '@/lib/supabase/server'
import { ConfiguracionForm } from '@/components/configuracion/configuracion-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Configuración' }

export default async function ConfiguracionPage() {
  const supabase = await createClient()

  const { data: config } = await supabase
    .from('configuracion_empresa')
    .select('*')
    .single()

  return (
    <div className="space-y-5 fade-in max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Configuración</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Datos de tu empresa que aparecen en facturas y presupuestos
        </p>
      </div>

      <ConfiguracionForm config={config as any} />
    </div>
  )
}
